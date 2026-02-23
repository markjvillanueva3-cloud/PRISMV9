/**
 * PRISM MATERIALS DATABASE - Carbon & Alloy Steel Conditions
 * File: carbon_alloy_steel_conditions.js
 * 
 * COMPREHENSIVE COVERAGE:
 * - Low Carbon (1008-1025): Hot Rolled, Cold Drawn, Annealed
 * - Medium Carbon (1030-1055): + Q&T at 22-55 HRC
 * - High Carbon (1060-1095): + Q&T at 35-64 HRC
 * - Chromoly (4130-4150): Annealed + Q&T at 22-55 HRC
 * - High-Strength (4340, 300M): Annealed + Q&T at 28-56 HRC
 * - Carburizing (8620, 9310): Annealed + Case Hardened 58-62 HRC
 * - Bearing/Spring (52100, 5160): Annealed + Hardened 42-64 HRC
 * 
 * Generated: 2026-01-24 22:21:40
 */

const CARBON_ALLOY_STEEL_CONDITIONS = {
  metadata: {
    file: "carbon_alloy_steel_conditions.js",
    category: "P_STEELS",
    materialCount: 262,
    coverage: {
      low_carbon: 21,
      medium_carbon: 73,
      high_carbon: 56,
      chromoly: 47,
      high_strength: 29,
      carburizing: 16,
      bearing_spring: 20
    }
  },

  materials: {
    "P-CS-501": {
      "id": "P-CS-501",
      "name": "AISI 1008 Hot Rolled",
      "designation": {
            "aisi": "1008",
            "uns": "G10080",
            "din": "1.0330",
            "en": "DC01"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Low Carbon",
      "condition": "Hot Rolled",
      "composition": {
            "C": 0.08,
            "Mn": 0.35
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 51.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 99
            },
            "tensile_strength": {
                  "typical": 357
            },
            "yield_strength": {
                  "typical": 180
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 1479,
            "mc": 0.26
      },
      "taylor": {
            "C": 350,
            "n": 0.25
      },
      "johnson_cook": {
            "A": 180,
            "B": 500,
            "n": 0.4,
            "C": 0.06,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 150,
                              "opt": 200,
                              "max": 250
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "general_fabrication",
            "welding",
            "forming",
            "fasteners"
      ]
},
    "P-CS-502": {
      "id": "P-CS-502",
      "name": "AISI 1008 Cold Drawn",
      "designation": {
            "aisi": "1008",
            "uns": "G10080",
            "din": "1.0330",
            "en": "DC01"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Low Carbon",
      "condition": "Cold Drawn",
      "composition": {
            "C": 0.08,
            "Mn": 0.35
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 51.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 114
            },
            "tensile_strength": {
                  "typical": 408
            },
            "yield_strength": {
                  "typical": 266
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 1667,
            "mc": 0.26
      },
      "taylor": {
            "C": 315,
            "n": 0.25
      },
      "johnson_cook": {
            "A": 180,
            "B": 500,
            "n": 0.4,
            "C": 0.06,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 135,
                              "opt": 180,
                              "max": 225
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "general_fabrication",
            "welding",
            "forming",
            "fasteners"
      ]
},
    "P-CS-503": {
      "id": "P-CS-503",
      "name": "AISI 1008 Annealed",
      "designation": {
            "aisi": "1008",
            "uns": "G10080",
            "din": "1.0330",
            "en": "DC01"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Low Carbon",
      "condition": "Annealed",
      "composition": {
            "C": 0.08,
            "Mn": 0.35
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 51.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 95
            },
            "tensile_strength": {
                  "typical": 340
            },
            "yield_strength": {
                  "typical": 190
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 1450,
            "mc": 0.26
      },
      "taylor": {
            "C": 350,
            "n": 0.25
      },
      "johnson_cook": {
            "A": 180,
            "B": 500,
            "n": 0.4,
            "C": 0.06,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 150,
                              "opt": 200,
                              "max": 250
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "general_fabrication",
            "welding",
            "forming",
            "fasteners"
      ]
},
    "P-CS-504": {
      "id": "P-CS-504",
      "name": "AISI 1010 Hot Rolled",
      "designation": {
            "aisi": "1010",
            "uns": "G10100",
            "din": "1.0301",
            "en": "C10E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Low Carbon",
      "condition": "Hot Rolled",
      "composition": {
            "C": 0.1,
            "Mn": 0.4
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 51.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 110
            },
            "tensile_strength": {
                  "typical": 383
            },
            "yield_strength": {
                  "typical": 194
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 1530,
            "mc": 0.26
      },
      "taylor": {
            "C": 340,
            "n": 0.25
      },
      "johnson_cook": {
            "A": 190,
            "B": 520,
            "n": 0.4,
            "C": 0.06,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 146,
                              "opt": 195,
                              "max": 243
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "general_fabrication",
            "welding",
            "forming",
            "fasteners"
      ]
},
    "P-CS-505": {
      "id": "P-CS-505",
      "name": "AISI 1010 Cold Drawn",
      "designation": {
            "aisi": "1010",
            "uns": "G10100",
            "din": "1.0301",
            "en": "C10E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Low Carbon",
      "condition": "Cold Drawn",
      "composition": {
            "C": 0.1,
            "Mn": 0.4
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 51.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 126
            },
            "tensile_strength": {
                  "typical": 438
            },
            "yield_strength": {
                  "typical": 287
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 1724,
            "mc": 0.26
      },
      "taylor": {
            "C": 306,
            "n": 0.25
      },
      "johnson_cook": {
            "A": 190,
            "B": 520,
            "n": 0.4,
            "C": 0.06,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 131,
                              "opt": 175,
                              "max": 219
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "general_fabrication",
            "welding",
            "forming",
            "fasteners"
      ]
},
    "P-CS-506": {
      "id": "P-CS-506",
      "name": "AISI 1010 Annealed",
      "designation": {
            "aisi": "1010",
            "uns": "G10100",
            "din": "1.0301",
            "en": "C10E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Low Carbon",
      "condition": "Annealed",
      "composition": {
            "C": 0.1,
            "Mn": 0.4
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 51.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 105
            },
            "tensile_strength": {
                  "typical": 365
            },
            "yield_strength": {
                  "typical": 205
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 1500,
            "mc": 0.26
      },
      "taylor": {
            "C": 340,
            "n": 0.25
      },
      "johnson_cook": {
            "A": 190,
            "B": 520,
            "n": 0.4,
            "C": 0.06,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 146,
                              "opt": 195,
                              "max": 243
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "general_fabrication",
            "welding",
            "forming",
            "fasteners"
      ]
},
    "P-CS-507": {
      "id": "P-CS-507",
      "name": "AISI 1015 Hot Rolled",
      "designation": {
            "aisi": "1015",
            "uns": "G10150",
            "din": "1.0401",
            "en": "C15E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Low Carbon",
      "condition": "Hot Rolled",
      "composition": {
            "C": 0.15,
            "Mn": 0.45
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 51.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 116
            },
            "tensile_strength": {
                  "typical": 404
            },
            "yield_strength": {
                  "typical": 218
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 1581,
            "mc": 0.25
      },
      "taylor": {
            "C": 330,
            "n": 0.24
      },
      "johnson_cook": {
            "A": 210,
            "B": 550,
            "n": 0.38,
            "C": 0.055,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 142,
                              "opt": 190,
                              "max": 237
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "general_fabrication",
            "welding",
            "forming",
            "fasteners"
      ]
},
    "P-CS-508": {
      "id": "P-CS-508",
      "name": "AISI 1015 Cold Drawn",
      "designation": {
            "aisi": "1015",
            "uns": "G10150",
            "din": "1.0401",
            "en": "C15E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Low Carbon",
      "condition": "Cold Drawn",
      "composition": {
            "C": 0.15,
            "Mn": 0.45
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 51.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 133
            },
            "tensile_strength": {
                  "typical": 462
            },
            "yield_strength": {
                  "typical": 322
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 1782,
            "mc": 0.25
      },
      "taylor": {
            "C": 297,
            "n": 0.24
      },
      "johnson_cook": {
            "A": 210,
            "B": 550,
            "n": 0.38,
            "C": 0.055,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 128,
                              "opt": 171,
                              "max": 213
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "general_fabrication",
            "welding",
            "forming",
            "fasteners"
      ]
},
    "P-CS-509": {
      "id": "P-CS-509",
      "name": "AISI 1015 Annealed",
      "designation": {
            "aisi": "1015",
            "uns": "G10150",
            "din": "1.0401",
            "en": "C15E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Low Carbon",
      "condition": "Annealed",
      "composition": {
            "C": 0.15,
            "Mn": 0.45
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 51.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 111
            },
            "tensile_strength": {
                  "typical": 385
            },
            "yield_strength": {
                  "typical": 230
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 1550,
            "mc": 0.25
      },
      "taylor": {
            "C": 330,
            "n": 0.24
      },
      "johnson_cook": {
            "A": 210,
            "B": 550,
            "n": 0.38,
            "C": 0.055,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 142,
                              "opt": 190,
                              "max": 237
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "general_fabrication",
            "welding",
            "forming",
            "fasteners"
      ]
},
    "P-CS-510": {
      "id": "P-CS-510",
      "name": "AISI 1018 Hot Rolled",
      "designation": {
            "aisi": "1018",
            "uns": "G10180",
            "din": "1.0453",
            "en": "C18E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Low Carbon",
      "condition": "Hot Rolled",
      "composition": {
            "C": 0.18,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 51.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 132
            },
            "tensile_strength": {
                  "typical": 462
            },
            "yield_strength": {
                  "typical": 247
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 1632,
            "mc": 0.25
      },
      "taylor": {
            "C": 320,
            "n": 0.24
      },
      "johnson_cook": {
            "A": 235,
            "B": 580,
            "n": 0.36,
            "C": 0.05,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 135,
                              "opt": 180,
                              "max": 225
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "general_fabrication",
            "welding",
            "forming",
            "fasteners"
      ]
},
    "P-CS-511": {
      "id": "P-CS-511",
      "name": "AISI 1018 Cold Drawn",
      "designation": {
            "aisi": "1018",
            "uns": "G10180",
            "din": "1.0453",
            "en": "C18E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Low Carbon",
      "condition": "Cold Drawn",
      "composition": {
            "C": 0.18,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 51.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 151
            },
            "tensile_strength": {
                  "typical": 528
            },
            "yield_strength": {
                  "typical": 364
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 1839,
            "mc": 0.25
      },
      "taylor": {
            "C": 288,
            "n": 0.24
      },
      "johnson_cook": {
            "A": 235,
            "B": 580,
            "n": 0.36,
            "C": 0.05,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 121,
                              "opt": 162,
                              "max": 202
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "general_fabrication",
            "welding",
            "forming",
            "fasteners"
      ]
},
    "P-CS-512": {
      "id": "P-CS-512",
      "name": "AISI 1018 Annealed",
      "designation": {
            "aisi": "1018",
            "uns": "G10180",
            "din": "1.0453",
            "en": "C18E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Low Carbon",
      "condition": "Annealed",
      "composition": {
            "C": 0.18,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 51.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 126
            },
            "tensile_strength": {
                  "typical": 440
            },
            "yield_strength": {
                  "typical": 260
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 1600,
            "mc": 0.25
      },
      "taylor": {
            "C": 320,
            "n": 0.24
      },
      "johnson_cook": {
            "A": 235,
            "B": 580,
            "n": 0.36,
            "C": 0.05,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 135,
                              "opt": 180,
                              "max": 225
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "general_fabrication",
            "welding",
            "forming",
            "fasteners"
      ]
},
    "P-CS-513": {
      "id": "P-CS-513",
      "name": "AISI 1020 Hot Rolled",
      "designation": {
            "aisi": "1020",
            "uns": "G10200",
            "din": "1.0402",
            "en": "C22E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Low Carbon",
      "condition": "Hot Rolled",
      "composition": {
            "C": 0.2,
            "Mn": 0.45
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 51.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 127
            },
            "tensile_strength": {
                  "typical": 441
            },
            "yield_strength": {
                  "typical": 237
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 1652,
            "mc": 0.25
      },
      "taylor": {
            "C": 310,
            "n": 0.24
      },
      "johnson_cook": {
            "A": 245,
            "B": 600,
            "n": 0.35,
            "C": 0.05,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 131,
                              "opt": 175,
                              "max": 218
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "general_fabrication",
            "welding",
            "forming",
            "fasteners"
      ]
},
    "P-CS-514": {
      "id": "P-CS-514",
      "name": "AISI 1020 Cold Drawn",
      "designation": {
            "aisi": "1020",
            "uns": "G10200",
            "din": "1.0402",
            "en": "C22E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Low Carbon",
      "condition": "Cold Drawn",
      "composition": {
            "C": 0.2,
            "Mn": 0.45
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 51.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 145
            },
            "tensile_strength": {
                  "typical": 504
            },
            "yield_strength": {
                  "typical": 350
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 1862,
            "mc": 0.25
      },
      "taylor": {
            "C": 279,
            "n": 0.24
      },
      "johnson_cook": {
            "A": 245,
            "B": 600,
            "n": 0.35,
            "C": 0.05,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 118,
                              "opt": 157,
                              "max": 196
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "general_fabrication",
            "welding",
            "forming",
            "fasteners"
      ]
},
    "P-CS-515": {
      "id": "P-CS-515",
      "name": "AISI 1020 Annealed",
      "designation": {
            "aisi": "1020",
            "uns": "G10200",
            "din": "1.0402",
            "en": "C22E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Low Carbon",
      "condition": "Annealed",
      "composition": {
            "C": 0.2,
            "Mn": 0.45
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 51.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 121
            },
            "tensile_strength": {
                  "typical": 420
            },
            "yield_strength": {
                  "typical": 250
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 1620,
            "mc": 0.25
      },
      "taylor": {
            "C": 310,
            "n": 0.24
      },
      "johnson_cook": {
            "A": 245,
            "B": 600,
            "n": 0.35,
            "C": 0.05,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 131,
                              "opt": 175,
                              "max": 218
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "general_fabrication",
            "welding",
            "forming",
            "fasteners"
      ]
},
    "P-CS-516": {
      "id": "P-CS-516",
      "name": "AISI 1022 Hot Rolled",
      "designation": {
            "aisi": "1022",
            "uns": "G10220",
            "din": "",
            "en": ""
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Low Carbon",
      "condition": "Hot Rolled",
      "composition": {
            "C": 0.22,
            "Mn": 0.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 51.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 143
            },
            "tensile_strength": {
                  "typical": 498
            },
            "yield_strength": {
                  "typical": 261
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 1713,
            "mc": 0.25
      },
      "taylor": {
            "C": 300,
            "n": 0.23
      },
      "johnson_cook": {
            "A": 260,
            "B": 620,
            "n": 0.34,
            "C": 0.05,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 127,
                              "opt": 170,
                              "max": 212
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "general_fabrication",
            "welding",
            "forming",
            "fasteners"
      ]
},
    "P-CS-517": {
      "id": "P-CS-517",
      "name": "AISI 1022 Cold Drawn",
      "designation": {
            "aisi": "1022",
            "uns": "G10220",
            "din": "",
            "en": ""
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Low Carbon",
      "condition": "Cold Drawn",
      "composition": {
            "C": 0.22,
            "Mn": 0.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 51.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 164
            },
            "tensile_strength": {
                  "typical": 570
            },
            "yield_strength": {
                  "typical": 385
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 1931,
            "mc": 0.25
      },
      "taylor": {
            "C": 270,
            "n": 0.23
      },
      "johnson_cook": {
            "A": 260,
            "B": 620,
            "n": 0.34,
            "C": 0.05,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 114,
                              "opt": 153,
                              "max": 191
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "general_fabrication",
            "welding",
            "forming",
            "fasteners"
      ]
},
    "P-CS-518": {
      "id": "P-CS-518",
      "name": "AISI 1022 Annealed",
      "designation": {
            "aisi": "1022",
            "uns": "G10220",
            "din": "",
            "en": ""
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Low Carbon",
      "condition": "Annealed",
      "composition": {
            "C": 0.22,
            "Mn": 0.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 51.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 137
            },
            "tensile_strength": {
                  "typical": 475
            },
            "yield_strength": {
                  "typical": 275
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 1680,
            "mc": 0.25
      },
      "taylor": {
            "C": 300,
            "n": 0.23
      },
      "johnson_cook": {
            "A": 260,
            "B": 620,
            "n": 0.34,
            "C": 0.05,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 127,
                              "opt": 170,
                              "max": 212
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "general_fabrication",
            "welding",
            "forming",
            "fasteners"
      ]
},
    "P-CS-519": {
      "id": "P-CS-519",
      "name": "AISI 1025 Hot Rolled",
      "designation": {
            "aisi": "1025",
            "uns": "G10250",
            "din": "1.0406",
            "en": "C25E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Low Carbon",
      "condition": "Hot Rolled",
      "composition": {
            "C": 0.25,
            "Mn": 0.5
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 51.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 137
            },
            "tensile_strength": {
                  "typical": 477
            },
            "yield_strength": {
                  "typical": 256
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 1734,
            "mc": 0.25
      },
      "taylor": {
            "C": 290,
            "n": 0.23
      },
      "johnson_cook": {
            "A": 275,
            "B": 640,
            "n": 0.33,
            "C": 0.048,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 123,
                              "opt": 165,
                              "max": 206
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "general_fabrication",
            "welding",
            "forming",
            "fasteners"
      ]
},
    "P-CS-520": {
      "id": "P-CS-520",
      "name": "AISI 1025 Cold Drawn",
      "designation": {
            "aisi": "1025",
            "uns": "G10250",
            "din": "1.0406",
            "en": "C25E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Low Carbon",
      "condition": "Cold Drawn",
      "composition": {
            "C": 0.25,
            "Mn": 0.5
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 51.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 157
            },
            "tensile_strength": {
                  "typical": 546
            },
            "yield_strength": {
                  "typical": 378
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 1954,
            "mc": 0.25
      },
      "taylor": {
            "C": 261,
            "n": 0.23
      },
      "johnson_cook": {
            "A": 275,
            "B": 640,
            "n": 0.33,
            "C": 0.048,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 111,
                              "opt": 148,
                              "max": 185
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "general_fabrication",
            "welding",
            "forming",
            "fasteners"
      ]
},
    "P-CS-521": {
      "id": "P-CS-521",
      "name": "AISI 1025 Annealed",
      "designation": {
            "aisi": "1025",
            "uns": "G10250",
            "din": "1.0406",
            "en": "C25E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Low Carbon",
      "condition": "Annealed",
      "composition": {
            "C": 0.25,
            "Mn": 0.5
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 51.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 131
            },
            "tensile_strength": {
                  "typical": 455
            },
            "yield_strength": {
                  "typical": 270
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 1700,
            "mc": 0.25
      },
      "taylor": {
            "C": 290,
            "n": 0.23
      },
      "johnson_cook": {
            "A": 275,
            "B": 640,
            "n": 0.33,
            "C": 0.048,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 123,
                              "opt": 165,
                              "max": 206
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "general_fabrication",
            "welding",
            "forming",
            "fasteners"
      ]
},
    "P-CS-522": {
      "id": "P-CS-522",
      "name": "AISI 1030 Hot Rolled",
      "designation": {
            "aisi": "1030",
            "uns": "G10300",
            "din": "1.0528",
            "en": "C30E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Hot Rolled",
      "composition": {
            "C": 0.3,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 143
            },
            "tensile_strength": {
                  "typical": 504
            },
            "yield_strength": {
                  "typical": 275
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 1785,
            "mc": 0.24
      },
      "taylor": {
            "C": 280,
            "n": 0.22
      },
      "johnson_cook": {
            "A": 295,
            "B": 680,
            "n": 0.32,
            "C": 0.045,
            "m": 0.98
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 116,
                              "opt": 155,
                              "max": 193
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-523": {
      "id": "P-CS-523",
      "name": "AISI 1030 Cold Drawn",
      "designation": {
            "aisi": "1030",
            "uns": "G10300",
            "din": "1.0528",
            "en": "C30E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Cold Drawn",
      "composition": {
            "C": 0.3,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 164
            },
            "tensile_strength": {
                  "typical": 576
            },
            "yield_strength": {
                  "typical": 406
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 2012,
            "mc": 0.24
      },
      "taylor": {
            "C": 252,
            "n": 0.22
      },
      "johnson_cook": {
            "A": 295,
            "B": 680,
            "n": 0.32,
            "C": 0.045,
            "m": 0.98
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 104,
                              "opt": 139,
                              "max": 174
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-524": {
      "id": "P-CS-524",
      "name": "AISI 1030 Annealed",
      "designation": {
            "aisi": "1030",
            "uns": "G10300",
            "din": "1.0528",
            "en": "C30E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Annealed",
      "composition": {
            "C": 0.3,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 137
            },
            "tensile_strength": {
                  "typical": 480
            },
            "yield_strength": {
                  "typical": 290
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 1750,
            "mc": 0.24
      },
      "taylor": {
            "C": 280,
            "n": 0.22
      },
      "johnson_cook": {
            "A": 295,
            "B": 680,
            "n": 0.32,
            "C": 0.045,
            "m": 0.98
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 116,
                              "opt": 155,
                              "max": 193
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-525": {
      "id": "P-CS-525",
      "name": "AISI 1030 Normalized",
      "designation": {
            "aisi": "1030",
            "uns": "G10300",
            "din": "1.0528",
            "en": "C30E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Normalized",
      "composition": {
            "C": 0.3,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 147
            },
            "tensile_strength": {
                  "typical": 518
            },
            "yield_strength": {
                  "typical": 304
            },
            "elongation": {
                  "typical": 22
            }
      },
      "kienzle": {
            "kc1_1": 1837,
            "mc": 0.24
      },
      "taylor": {
            "C": 266,
            "n": 0.22
      },
      "johnson_cook": {
            "A": 295,
            "B": 680,
            "n": 0.32,
            "C": 0.045,
            "m": 0.98
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 110,
                              "opt": 147,
                              "max": 184
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-526": {
      "id": "P-CS-526",
      "name": "AISI 1030 Q&T 22 HRC",
      "designation": {
            "aisi": "1030",
            "uns": "G10300",
            "din": "1.0528",
            "en": "C30E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 22 HRC",
      "composition": {
            "C": 0.3,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 234,
                  "rockwell_c": 22
            },
            "tensile_strength": {
                  "typical": 807
            },
            "yield_strength": {
                  "typical": 726
            },
            "elongation": {
                  "typical": 18
            }
      },
      "kienzle": {
            "kc1_1": 2288,
            "mc": 0.24
      },
      "taylor": {
            "C": 151,
            "n": 0.22
      },
      "johnson_cook": {
            "A": 295,
            "B": 680,
            "n": 0.32,
            "C": 0.045,
            "m": 0.98
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 66,
                              "opt": 88,
                              "max": 110
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-527": {
      "id": "P-CS-527",
      "name": "AISI 1030 Q&T 25 HRC",
      "designation": {
            "aisi": "1030",
            "uns": "G10300",
            "din": "1.0528",
            "en": "C30E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 25 HRC",
      "composition": {
            "C": 0.3,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 243,
                  "rockwell_c": 25
            },
            "tensile_strength": {
                  "typical": 838
            },
            "yield_strength": {
                  "typical": 754
            },
            "elongation": {
                  "typical": 17
            }
      },
      "kienzle": {
            "kc1_1": 2343,
            "mc": 0.24
      },
      "taylor": {
            "C": 144,
            "n": 0.22
      },
      "johnson_cook": {
            "A": 295,
            "B": 680,
            "n": 0.32,
            "C": 0.045,
            "m": 0.98
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 63,
                              "opt": 84,
                              "max": 105
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-528": {
      "id": "P-CS-528",
      "name": "AISI 1030 Q&T 28 HRC",
      "designation": {
            "aisi": "1030",
            "uns": "G10300",
            "din": "1.0528",
            "en": "C30E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 28 HRC",
      "composition": {
            "C": 0.3,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 255,
                  "rockwell_c": 28
            },
            "tensile_strength": {
                  "typical": 879
            },
            "yield_strength": {
                  "typical": 791
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 2418,
            "mc": 0.24
      },
      "taylor": {
            "C": 137,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 295,
            "B": 680,
            "n": 0.32,
            "C": 0.045,
            "m": 0.98
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 60,
                              "opt": 80,
                              "max": 100
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-529": {
      "id": "P-CS-529",
      "name": "AISI 1030 Q&T 30 HRC",
      "designation": {
            "aisi": "1030",
            "uns": "G10300",
            "din": "1.0528",
            "en": "C30E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 30 HRC",
      "composition": {
            "C": 0.3,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 266,
                  "rockwell_c": 30
            },
            "tensile_strength": {
                  "typical": 917
            },
            "yield_strength": {
                  "typical": 825
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 2487,
            "mc": 0.23
      },
      "taylor": {
            "C": 130,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 295,
            "B": 680,
            "n": 0.32,
            "C": 0.045,
            "m": 0.98
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 57,
                              "opt": 77,
                              "max": 96
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-530": {
      "id": "P-CS-530",
      "name": "AISI 1030 Q&T 32 HRC",
      "designation": {
            "aisi": "1030",
            "uns": "G10300",
            "din": "1.0528",
            "en": "C30E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 32 HRC",
      "composition": {
            "C": 0.3,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 277,
                  "rockwell_c": 32
            },
            "tensile_strength": {
                  "typical": 955
            },
            "yield_strength": {
                  "typical": 859
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 2556,
            "mc": 0.23
      },
      "taylor": {
            "C": 124,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 295,
            "B": 680,
            "n": 0.32,
            "C": 0.045,
            "m": 0.98
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 55,
                              "opt": 74,
                              "max": 92
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-531": {
      "id": "P-CS-531",
      "name": "AISI 1035 Hot Rolled",
      "designation": {
            "aisi": "1035",
            "uns": "G10350",
            "din": "1.0501",
            "en": "C35E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Hot Rolled",
      "composition": {
            "C": 0.35,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 156
            },
            "tensile_strength": {
                  "typical": 546
            },
            "yield_strength": {
                  "typical": 299
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 1836,
            "mc": 0.24
      },
      "taylor": {
            "C": 265,
            "n": 0.22
      },
      "johnson_cook": {
            "A": 320,
            "B": 720,
            "n": 0.3,
            "C": 0.042,
            "m": 0.97
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 108,
                              "opt": 145,
                              "max": 181
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-532": {
      "id": "P-CS-532",
      "name": "AISI 1035 Cold Drawn",
      "designation": {
            "aisi": "1035",
            "uns": "G10350",
            "din": "1.0501",
            "en": "C35E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Cold Drawn",
      "composition": {
            "C": 0.35,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 178
            },
            "tensile_strength": {
                  "typical": 624
            },
            "yield_strength": {
                  "typical": 441
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 2070,
            "mc": 0.24
      },
      "taylor": {
            "C": 238,
            "n": 0.22
      },
      "johnson_cook": {
            "A": 320,
            "B": 720,
            "n": 0.3,
            "C": 0.042,
            "m": 0.97
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 97,
                              "opt": 130,
                              "max": 163
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-533": {
      "id": "P-CS-533",
      "name": "AISI 1035 Annealed",
      "designation": {
            "aisi": "1035",
            "uns": "G10350",
            "din": "1.0501",
            "en": "C35E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Annealed",
      "composition": {
            "C": 0.35,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 149
            },
            "tensile_strength": {
                  "typical": 520
            },
            "yield_strength": {
                  "typical": 315
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 1800,
            "mc": 0.24
      },
      "taylor": {
            "C": 265,
            "n": 0.22
      },
      "johnson_cook": {
            "A": 320,
            "B": 720,
            "n": 0.3,
            "C": 0.042,
            "m": 0.97
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 108,
                              "opt": 145,
                              "max": 181
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-534": {
      "id": "P-CS-534",
      "name": "AISI 1035 Normalized",
      "designation": {
            "aisi": "1035",
            "uns": "G10350",
            "din": "1.0501",
            "en": "C35E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Normalized",
      "composition": {
            "C": 0.35,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 160
            },
            "tensile_strength": {
                  "typical": 561
            },
            "yield_strength": {
                  "typical": 330
            },
            "elongation": {
                  "typical": 22
            }
      },
      "kienzle": {
            "kc1_1": 1890,
            "mc": 0.24
      },
      "taylor": {
            "C": 251,
            "n": 0.22
      },
      "johnson_cook": {
            "A": 320,
            "B": 720,
            "n": 0.3,
            "C": 0.042,
            "m": 0.97
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 103,
                              "opt": 137,
                              "max": 172
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-535": {
      "id": "P-CS-535",
      "name": "AISI 1035 Q&T 22 HRC",
      "designation": {
            "aisi": "1035",
            "uns": "G10350",
            "din": "1.0501",
            "en": "C35E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 22 HRC",
      "composition": {
            "C": 0.35,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 234,
                  "rockwell_c": 22
            },
            "tensile_strength": {
                  "typical": 807
            },
            "yield_strength": {
                  "typical": 726
            },
            "elongation": {
                  "typical": 18
            }
      },
      "kienzle": {
            "kc1_1": 2236,
            "mc": 0.24
      },
      "taylor": {
            "C": 157,
            "n": 0.22
      },
      "johnson_cook": {
            "A": 320,
            "B": 720,
            "n": 0.3,
            "C": 0.042,
            "m": 0.97
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 67,
                              "opt": 90,
                              "max": 112
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-536": {
      "id": "P-CS-536",
      "name": "AISI 1035 Q&T 25 HRC",
      "designation": {
            "aisi": "1035",
            "uns": "G10350",
            "din": "1.0501",
            "en": "C35E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 25 HRC",
      "composition": {
            "C": 0.35,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 243,
                  "rockwell_c": 25
            },
            "tensile_strength": {
                  "typical": 838
            },
            "yield_strength": {
                  "typical": 754
            },
            "elongation": {
                  "typical": 17
            }
      },
      "kienzle": {
            "kc1_1": 2288,
            "mc": 0.24
      },
      "taylor": {
            "C": 150,
            "n": 0.22
      },
      "johnson_cook": {
            "A": 320,
            "B": 720,
            "n": 0.3,
            "C": 0.042,
            "m": 0.97
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 64,
                              "opt": 86,
                              "max": 107
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-537": {
      "id": "P-CS-537",
      "name": "AISI 1035 Q&T 28 HRC",
      "designation": {
            "aisi": "1035",
            "uns": "G10350",
            "din": "1.0501",
            "en": "C35E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 28 HRC",
      "composition": {
            "C": 0.35,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 255,
                  "rockwell_c": 28
            },
            "tensile_strength": {
                  "typical": 879
            },
            "yield_strength": {
                  "typical": 791
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 2356,
            "mc": 0.24
      },
      "taylor": {
            "C": 142,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 320,
            "B": 720,
            "n": 0.3,
            "C": 0.042,
            "m": 0.97
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 61,
                              "opt": 82,
                              "max": 102
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-538": {
      "id": "P-CS-538",
      "name": "AISI 1035 Q&T 30 HRC",
      "designation": {
            "aisi": "1035",
            "uns": "G10350",
            "din": "1.0501",
            "en": "C35E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 30 HRC",
      "composition": {
            "C": 0.35,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 266,
                  "rockwell_c": 30
            },
            "tensile_strength": {
                  "typical": 917
            },
            "yield_strength": {
                  "typical": 825
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 2420,
            "mc": 0.23
      },
      "taylor": {
            "C": 136,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 320,
            "B": 720,
            "n": 0.3,
            "C": 0.042,
            "m": 0.97
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 58,
                              "opt": 78,
                              "max": 97
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-539": {
      "id": "P-CS-539",
      "name": "AISI 1035 Q&T 32 HRC",
      "designation": {
            "aisi": "1035",
            "uns": "G10350",
            "din": "1.0501",
            "en": "C35E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 32 HRC",
      "composition": {
            "C": 0.35,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 277,
                  "rockwell_c": 32
            },
            "tensile_strength": {
                  "typical": 955
            },
            "yield_strength": {
                  "typical": 859
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 2485,
            "mc": 0.23
      },
      "taylor": {
            "C": 129,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 320,
            "B": 720,
            "n": 0.3,
            "C": 0.042,
            "m": 0.97
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 56,
                              "opt": 75,
                              "max": 93
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-540": {
      "id": "P-CS-540",
      "name": "AISI 1035 Q&T 35 HRC",
      "designation": {
            "aisi": "1035",
            "uns": "G10350",
            "din": "1.0501",
            "en": "C35E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 35 HRC",
      "composition": {
            "C": 0.35,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 295,
                  "rockwell_c": 35
            },
            "tensile_strength": {
                  "typical": 1017
            },
            "yield_strength": {
                  "typical": 915
            },
            "elongation": {
                  "typical": 14
            }
      },
      "kienzle": {
            "kc1_1": 2592,
            "mc": 0.23
      },
      "taylor": {
            "C": 120,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 320,
            "B": 720,
            "n": 0.3,
            "C": 0.042,
            "m": 0.97
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 52,
                              "opt": 70,
                              "max": 87
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-541": {
      "id": "P-CS-541",
      "name": "AISI 1035 Q&T 38 HRC",
      "designation": {
            "aisi": "1035",
            "uns": "G10350",
            "din": "1.0501",
            "en": "C35E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 38 HRC",
      "composition": {
            "C": 0.35,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 316,
                  "rockwell_c": 38
            },
            "tensile_strength": {
                  "typical": 1090
            },
            "yield_strength": {
                  "typical": 981
            },
            "elongation": {
                  "typical": 13
            }
      },
      "kienzle": {
            "kc1_1": 2718,
            "mc": 0.23
      },
      "taylor": {
            "C": 111,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 320,
            "B": 720,
            "n": 0.3,
            "C": 0.042,
            "m": 0.97
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 48,
                              "opt": 65,
                              "max": 81
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-542": {
      "id": "P-CS-542",
      "name": "AISI 1040 Hot Rolled",
      "designation": {
            "aisi": "1040",
            "uns": "G10400",
            "din": "1.0511",
            "en": "C40E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Hot Rolled",
      "composition": {
            "C": 0.4,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 178
            },
            "tensile_strength": {
                  "typical": 619
            },
            "yield_strength": {
                  "typical": 342
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 1887,
            "mc": 0.24
      },
      "taylor": {
            "C": 250,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 350,
            "B": 760,
            "n": 0.28,
            "C": 0.04,
            "m": 0.96
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 101,
                              "opt": 135,
                              "max": 168
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-543": {
      "id": "P-CS-543",
      "name": "AISI 1040 Cold Drawn",
      "designation": {
            "aisi": "1040",
            "uns": "G10400",
            "din": "1.0511",
            "en": "C40E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Cold Drawn",
      "composition": {
            "C": 0.4,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 204
            },
            "tensile_strength": {
                  "typical": 708
            },
            "yield_strength": {
                  "typical": 503
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 2127,
            "mc": 0.24
      },
      "taylor": {
            "C": 225,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 350,
            "B": 760,
            "n": 0.28,
            "C": 0.04,
            "m": 0.96
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 91,
                              "opt": 121,
                              "max": 151
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-544": {
      "id": "P-CS-544",
      "name": "AISI 1040 Annealed",
      "designation": {
            "aisi": "1040",
            "uns": "G10400",
            "din": "1.0511",
            "en": "C40E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Annealed",
      "composition": {
            "C": 0.4,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 170
            },
            "tensile_strength": {
                  "typical": 590
            },
            "yield_strength": {
                  "typical": 360
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 1850,
            "mc": 0.24
      },
      "taylor": {
            "C": 250,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 350,
            "B": 760,
            "n": 0.28,
            "C": 0.04,
            "m": 0.96
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 101,
                              "opt": 135,
                              "max": 168
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-545": {
      "id": "P-CS-545",
      "name": "AISI 1040 Normalized",
      "designation": {
            "aisi": "1040",
            "uns": "G10400",
            "din": "1.0511",
            "en": "C40E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Normalized",
      "composition": {
            "C": 0.4,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 183
            },
            "tensile_strength": {
                  "typical": 637
            },
            "yield_strength": {
                  "typical": 378
            },
            "elongation": {
                  "typical": 22
            }
      },
      "kienzle": {
            "kc1_1": 1942,
            "mc": 0.24
      },
      "taylor": {
            "C": 237,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 350,
            "B": 760,
            "n": 0.28,
            "C": 0.04,
            "m": 0.96
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 96,
                              "opt": 128,
                              "max": 160
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-546": {
      "id": "P-CS-546",
      "name": "AISI 1040 Q&T 22 HRC",
      "designation": {
            "aisi": "1040",
            "uns": "G10400",
            "din": "1.0511",
            "en": "C40E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 22 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 234,
                  "rockwell_c": 22
            },
            "tensile_strength": {
                  "typical": 807
            },
            "yield_strength": {
                  "typical": 726
            },
            "elongation": {
                  "typical": 18
            }
      },
      "kienzle": {
            "kc1_1": 2134,
            "mc": 0.24
      },
      "taylor": {
            "C": 173,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 350,
            "B": 760,
            "n": 0.28,
            "C": 0.04,
            "m": 0.96
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 72,
                              "opt": 96,
                              "max": 120
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-547": {
      "id": "P-CS-547",
      "name": "AISI 1040 Q&T 25 HRC",
      "designation": {
            "aisi": "1040",
            "uns": "G10400",
            "din": "1.0511",
            "en": "C40E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 25 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 243,
                  "rockwell_c": 25
            },
            "tensile_strength": {
                  "typical": 838
            },
            "yield_strength": {
                  "typical": 754
            },
            "elongation": {
                  "typical": 17
            }
      },
      "kienzle": {
            "kc1_1": 2178,
            "mc": 0.24
      },
      "taylor": {
            "C": 165,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 350,
            "B": 760,
            "n": 0.28,
            "C": 0.04,
            "m": 0.96
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 69,
                              "opt": 92,
                              "max": 115
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-548": {
      "id": "P-CS-548",
      "name": "AISI 1040 Q&T 28 HRC",
      "designation": {
            "aisi": "1040",
            "uns": "G10400",
            "din": "1.0511",
            "en": "C40E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 28 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 255,
                  "rockwell_c": 28
            },
            "tensile_strength": {
                  "typical": 879
            },
            "yield_strength": {
                  "typical": 791
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 2238,
            "mc": 0.24
      },
      "taylor": {
            "C": 156,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 350,
            "B": 760,
            "n": 0.28,
            "C": 0.04,
            "m": 0.96
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 66,
                              "opt": 88,
                              "max": 110
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-549": {
      "id": "P-CS-549",
      "name": "AISI 1040 Q&T 30 HRC",
      "designation": {
            "aisi": "1040",
            "uns": "G10400",
            "din": "1.0511",
            "en": "C40E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 30 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 266,
                  "rockwell_c": 30
            },
            "tensile_strength": {
                  "typical": 917
            },
            "yield_strength": {
                  "typical": 825
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 2294,
            "mc": 0.23
      },
      "taylor": {
            "C": 149,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 350,
            "B": 760,
            "n": 0.28,
            "C": 0.04,
            "m": 0.96
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 63,
                              "opt": 84,
                              "max": 105
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-550": {
      "id": "P-CS-550",
      "name": "AISI 1040 Q&T 32 HRC",
      "designation": {
            "aisi": "1040",
            "uns": "G10400",
            "din": "1.0511",
            "en": "C40E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 32 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 277,
                  "rockwell_c": 32
            },
            "tensile_strength": {
                  "typical": 955
            },
            "yield_strength": {
                  "typical": 859
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 2350,
            "mc": 0.23
      },
      "taylor": {
            "C": 142,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 350,
            "B": 760,
            "n": 0.28,
            "C": 0.04,
            "m": 0.96
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 60,
                              "opt": 80,
                              "max": 100
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-551": {
      "id": "P-CS-551",
      "name": "AISI 1040 Q&T 35 HRC",
      "designation": {
            "aisi": "1040",
            "uns": "G10400",
            "din": "1.0511",
            "en": "C40E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 35 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 295,
                  "rockwell_c": 35
            },
            "tensile_strength": {
                  "typical": 1017
            },
            "yield_strength": {
                  "typical": 915
            },
            "elongation": {
                  "typical": 14
            }
      },
      "kienzle": {
            "kc1_1": 2443,
            "mc": 0.23
      },
      "taylor": {
            "C": 132,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 350,
            "B": 760,
            "n": 0.28,
            "C": 0.04,
            "m": 0.96
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 56,
                              "opt": 75,
                              "max": 93
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-552": {
      "id": "P-CS-552",
      "name": "AISI 1040 Q&T 38 HRC",
      "designation": {
            "aisi": "1040",
            "uns": "G10400",
            "din": "1.0511",
            "en": "C40E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 38 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 316,
                  "rockwell_c": 38
            },
            "tensile_strength": {
                  "typical": 1090
            },
            "yield_strength": {
                  "typical": 981
            },
            "elongation": {
                  "typical": 13
            }
      },
      "kienzle": {
            "kc1_1": 2554,
            "mc": 0.23
      },
      "taylor": {
            "C": 122,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 350,
            "B": 760,
            "n": 0.28,
            "C": 0.04,
            "m": 0.96
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 52,
                              "opt": 70,
                              "max": 87
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-553": {
      "id": "P-CS-553",
      "name": "AISI 1040 Q&T 40 HRC",
      "designation": {
            "aisi": "1040",
            "uns": "G10400",
            "din": "1.0511",
            "en": "C40E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 40 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 332,
                  "rockwell_c": 40
            },
            "tensile_strength": {
                  "typical": 1145
            },
            "yield_strength": {
                  "typical": 1030
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 2639,
            "mc": 0.23
      },
      "taylor": {
            "C": 115,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 350,
            "B": 760,
            "n": 0.28,
            "C": 0.04,
            "m": 0.96
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 49,
                              "opt": 66,
                              "max": 82
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-554": {
      "id": "P-CS-554",
      "name": "AISI 1045 Hot Rolled",
      "designation": {
            "aisi": "1045",
            "uns": "G10450",
            "din": "1.0503",
            "en": "C45E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Hot Rolled",
      "composition": {
            "C": 0.45,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 187
            },
            "tensile_strength": {
                  "typical": 656
            },
            "yield_strength": {
                  "typical": 365
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 1938,
            "mc": 0.23
      },
      "taylor": {
            "C": 235,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 380,
            "B": 800,
            "n": 0.26,
            "C": 0.038,
            "m": 0.95
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 93,
                              "opt": 125,
                              "max": 156
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-555": {
      "id": "P-CS-555",
      "name": "AISI 1045 Cold Drawn",
      "designation": {
            "aisi": "1045",
            "uns": "G10450",
            "din": "1.0503",
            "en": "C45E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Cold Drawn",
      "composition": {
            "C": 0.45,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 214
            },
            "tensile_strength": {
                  "typical": 750
            },
            "yield_strength": {
                  "typical": 539
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 2185,
            "mc": 0.23
      },
      "taylor": {
            "C": 211,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 380,
            "B": 800,
            "n": 0.26,
            "C": 0.038,
            "m": 0.95
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 84,
                              "opt": 112,
                              "max": 140
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-556": {
      "id": "P-CS-556",
      "name": "AISI 1045 Annealed",
      "designation": {
            "aisi": "1045",
            "uns": "G10450",
            "din": "1.0503",
            "en": "C45E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Annealed",
      "composition": {
            "C": 0.45,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 179
            },
            "tensile_strength": {
                  "typical": 625
            },
            "yield_strength": {
                  "typical": 385
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 1900,
            "mc": 0.23
      },
      "taylor": {
            "C": 235,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 380,
            "B": 800,
            "n": 0.26,
            "C": 0.038,
            "m": 0.95
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 93,
                              "opt": 125,
                              "max": 156
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-557": {
      "id": "P-CS-557",
      "name": "AISI 1045 Normalized",
      "designation": {
            "aisi": "1045",
            "uns": "G10450",
            "din": "1.0503",
            "en": "C45E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Normalized",
      "composition": {
            "C": 0.45,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 193
            },
            "tensile_strength": {
                  "typical": 675
            },
            "yield_strength": {
                  "typical": 404
            },
            "elongation": {
                  "typical": 22
            }
      },
      "kienzle": {
            "kc1_1": 1995,
            "mc": 0.23
      },
      "taylor": {
            "C": 223,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 380,
            "B": 800,
            "n": 0.26,
            "C": 0.038,
            "m": 0.95
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 89,
                              "opt": 118,
                              "max": 148
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-558": {
      "id": "P-CS-558",
      "name": "AISI 1045 Q&T 22 HRC",
      "designation": {
            "aisi": "1045",
            "uns": "G10450",
            "din": "1.0503",
            "en": "C45E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 22 HRC",
      "composition": {
            "C": 0.45,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 234,
                  "rockwell_c": 22
            },
            "tensile_strength": {
                  "typical": 807
            },
            "yield_strength": {
                  "typical": 726
            },
            "elongation": {
                  "typical": 18
            }
      },
      "kienzle": {
            "kc1_1": 2133,
            "mc": 0.23
      },
      "taylor": {
            "C": 172,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 380,
            "B": 800,
            "n": 0.26,
            "C": 0.038,
            "m": 0.95
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 70,
                              "opt": 94,
                              "max": 117
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-559": {
      "id": "P-CS-559",
      "name": "AISI 1045 Q&T 25 HRC",
      "designation": {
            "aisi": "1045",
            "uns": "G10450",
            "din": "1.0503",
            "en": "C45E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 25 HRC",
      "composition": {
            "C": 0.45,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 243,
                  "rockwell_c": 25
            },
            "tensile_strength": {
                  "typical": 838
            },
            "yield_strength": {
                  "typical": 754
            },
            "elongation": {
                  "typical": 17
            }
      },
      "kienzle": {
            "kc1_1": 2175,
            "mc": 0.23
      },
      "taylor": {
            "C": 165,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 380,
            "B": 800,
            "n": 0.26,
            "C": 0.038,
            "m": 0.95
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 67,
                              "opt": 90,
                              "max": 112
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-560": {
      "id": "P-CS-560",
      "name": "AISI 1045 Q&T 28 HRC",
      "designation": {
            "aisi": "1045",
            "uns": "G10450",
            "din": "1.0503",
            "en": "C45E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 28 HRC",
      "composition": {
            "C": 0.45,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 255,
                  "rockwell_c": 28
            },
            "tensile_strength": {
                  "typical": 879
            },
            "yield_strength": {
                  "typical": 791
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 2233,
            "mc": 0.23
      },
      "taylor": {
            "C": 156,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 380,
            "B": 800,
            "n": 0.26,
            "C": 0.038,
            "m": 0.95
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 64,
                              "opt": 86,
                              "max": 107
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-561": {
      "id": "P-CS-561",
      "name": "AISI 1045 Q&T 30 HRC",
      "designation": {
            "aisi": "1045",
            "uns": "G10450",
            "din": "1.0503",
            "en": "C45E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 30 HRC",
      "composition": {
            "C": 0.45,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 266,
                  "rockwell_c": 30
            },
            "tensile_strength": {
                  "typical": 917
            },
            "yield_strength": {
                  "typical": 825
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 2286,
            "mc": 0.22
      },
      "taylor": {
            "C": 149,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 380,
            "B": 800,
            "n": 0.26,
            "C": 0.038,
            "m": 0.95
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 61,
                              "opt": 82,
                              "max": 102
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-562": {
      "id": "P-CS-562",
      "name": "AISI 1045 Q&T 32 HRC",
      "designation": {
            "aisi": "1045",
            "uns": "G10450",
            "din": "1.0503",
            "en": "C45E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 32 HRC",
      "composition": {
            "C": 0.45,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 277,
                  "rockwell_c": 32
            },
            "tensile_strength": {
                  "typical": 955
            },
            "yield_strength": {
                  "typical": 859
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 2340,
            "mc": 0.22
      },
      "taylor": {
            "C": 142,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 380,
            "B": 800,
            "n": 0.26,
            "C": 0.038,
            "m": 0.95
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 59,
                              "opt": 79,
                              "max": 98
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-563": {
      "id": "P-CS-563",
      "name": "AISI 1045 Q&T 35 HRC",
      "designation": {
            "aisi": "1045",
            "uns": "G10450",
            "din": "1.0503",
            "en": "C45E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 35 HRC",
      "composition": {
            "C": 0.45,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 295,
                  "rockwell_c": 35
            },
            "tensile_strength": {
                  "typical": 1017
            },
            "yield_strength": {
                  "typical": 915
            },
            "elongation": {
                  "typical": 14
            }
      },
      "kienzle": {
            "kc1_1": 2430,
            "mc": 0.22
      },
      "taylor": {
            "C": 132,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 380,
            "B": 800,
            "n": 0.26,
            "C": 0.038,
            "m": 0.95
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 54,
                              "opt": 73,
                              "max": 91
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-564": {
      "id": "P-CS-564",
      "name": "AISI 1045 Q&T 38 HRC",
      "designation": {
            "aisi": "1045",
            "uns": "G10450",
            "din": "1.0503",
            "en": "C45E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 38 HRC",
      "composition": {
            "C": 0.45,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 316,
                  "rockwell_c": 38
            },
            "tensile_strength": {
                  "typical": 1090
            },
            "yield_strength": {
                  "typical": 981
            },
            "elongation": {
                  "typical": 13
            }
      },
      "kienzle": {
            "kc1_1": 2537,
            "mc": 0.22
      },
      "taylor": {
            "C": 122,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 380,
            "B": 800,
            "n": 0.26,
            "C": 0.038,
            "m": 0.95
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 51,
                              "opt": 68,
                              "max": 85
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-565": {
      "id": "P-CS-565",
      "name": "AISI 1045 Q&T 40 HRC",
      "designation": {
            "aisi": "1045",
            "uns": "G10450",
            "din": "1.0503",
            "en": "C45E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 40 HRC",
      "composition": {
            "C": 0.45,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 332,
                  "rockwell_c": 40
            },
            "tensile_strength": {
                  "typical": 1145
            },
            "yield_strength": {
                  "typical": 1030
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 2619,
            "mc": 0.22
      },
      "taylor": {
            "C": 115,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 380,
            "B": 800,
            "n": 0.26,
            "C": 0.038,
            "m": 0.95
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 48,
                              "opt": 65,
                              "max": 81
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-566": {
      "id": "P-CS-566",
      "name": "AISI 1045 Q&T 45 HRC",
      "designation": {
            "aisi": "1045",
            "uns": "G10450",
            "din": "1.0503",
            "en": "C45E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 45 HRC",
      "composition": {
            "C": 0.45,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 377,
                  "rockwell_c": 45
            },
            "tensile_strength": {
                  "typical": 1300
            },
            "yield_strength": {
                  "typical": 1170
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 2855,
            "mc": 0.21
      },
      "taylor": {
            "C": 99,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 380,
            "B": 800,
            "n": 0.26,
            "C": 0.038,
            "m": 0.95
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 42,
                              "opt": 57,
                              "max": 71
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-567": {
      "id": "P-CS-567",
      "name": "AISI 1050 Hot Rolled",
      "designation": {
            "aisi": "1050",
            "uns": "G10500",
            "din": "1.0540",
            "en": "C50E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Hot Rolled",
      "composition": {
            "C": 0.5,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 196
            },
            "tensile_strength": {
                  "typical": 687
            },
            "yield_strength": {
                  "typical": 380
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 1989,
            "mc": 0.23
      },
      "taylor": {
            "C": 220,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.25,
            "C": 0.036,
            "m": 0.94
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 86,
                              "opt": 115,
                              "max": 143
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-568": {
      "id": "P-CS-568",
      "name": "AISI 1050 Cold Drawn",
      "designation": {
            "aisi": "1050",
            "uns": "G10500",
            "din": "1.0540",
            "en": "C50E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Cold Drawn",
      "composition": {
            "C": 0.5,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 224
            },
            "tensile_strength": {
                  "typical": 786
            },
            "yield_strength": {
                  "typical": 560
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 2242,
            "mc": 0.23
      },
      "taylor": {
            "C": 198,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.25,
            "C": 0.036,
            "m": 0.94
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 77,
                              "opt": 103,
                              "max": 129
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-569": {
      "id": "P-CS-569",
      "name": "AISI 1050 Annealed",
      "designation": {
            "aisi": "1050",
            "uns": "G10500",
            "din": "1.0540",
            "en": "C50E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Annealed",
      "composition": {
            "C": 0.5,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 187
            },
            "tensile_strength": {
                  "typical": 655
            },
            "yield_strength": {
                  "typical": 400
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 1950,
            "mc": 0.23
      },
      "taylor": {
            "C": 220,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.25,
            "C": 0.036,
            "m": 0.94
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 86,
                              "opt": 115,
                              "max": 143
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-570": {
      "id": "P-CS-570",
      "name": "AISI 1050 Normalized",
      "designation": {
            "aisi": "1050",
            "uns": "G10500",
            "din": "1.0540",
            "en": "C50E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Normalized",
      "composition": {
            "C": 0.5,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 201
            },
            "tensile_strength": {
                  "typical": 707
            },
            "yield_strength": {
                  "typical": 420
            },
            "elongation": {
                  "typical": 22
            }
      },
      "kienzle": {
            "kc1_1": 2047,
            "mc": 0.23
      },
      "taylor": {
            "C": 209,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.25,
            "C": 0.036,
            "m": 0.94
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 81,
                              "opt": 109,
                              "max": 136
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-571": {
      "id": "P-CS-571",
      "name": "AISI 1050 Q&T 22 HRC",
      "designation": {
            "aisi": "1050",
            "uns": "G10500",
            "din": "1.0540",
            "en": "C50E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 22 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 234,
                  "rockwell_c": 22
            },
            "tensile_strength": {
                  "typical": 807
            },
            "yield_strength": {
                  "typical": 726
            },
            "elongation": {
                  "typical": 18
            }
      },
      "kienzle": {
            "kc1_1": 2142,
            "mc": 0.23
      },
      "taylor": {
            "C": 169,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.25,
            "C": 0.036,
            "m": 0.94
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 67,
                              "opt": 90,
                              "max": 112
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-572": {
      "id": "P-CS-572",
      "name": "AISI 1050 Q&T 25 HRC",
      "designation": {
            "aisi": "1050",
            "uns": "G10500",
            "din": "1.0540",
            "en": "C50E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 25 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 243,
                  "rockwell_c": 25
            },
            "tensile_strength": {
                  "typical": 838
            },
            "yield_strength": {
                  "typical": 754
            },
            "elongation": {
                  "typical": 17
            }
      },
      "kienzle": {
            "kc1_1": 2182,
            "mc": 0.23
      },
      "taylor": {
            "C": 162,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.25,
            "C": 0.036,
            "m": 0.94
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 65,
                              "opt": 87,
                              "max": 108
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-573": {
      "id": "P-CS-573",
      "name": "AISI 1050 Q&T 28 HRC",
      "designation": {
            "aisi": "1050",
            "uns": "G10500",
            "din": "1.0540",
            "en": "C50E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 28 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 255,
                  "rockwell_c": 28
            },
            "tensile_strength": {
                  "typical": 879
            },
            "yield_strength": {
                  "typical": 791
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 2238,
            "mc": 0.23
      },
      "taylor": {
            "C": 153,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.25,
            "C": 0.036,
            "m": 0.94
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 62,
                              "opt": 83,
                              "max": 103
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-574": {
      "id": "P-CS-574",
      "name": "AISI 1050 Q&T 30 HRC",
      "designation": {
            "aisi": "1050",
            "uns": "G10500",
            "din": "1.0540",
            "en": "C50E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 30 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 266,
                  "rockwell_c": 30
            },
            "tensile_strength": {
                  "typical": 917
            },
            "yield_strength": {
                  "typical": 825
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 2290,
            "mc": 0.22
      },
      "taylor": {
            "C": 146,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.25,
            "C": 0.036,
            "m": 0.94
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 59,
                              "opt": 79,
                              "max": 98
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-575": {
      "id": "P-CS-575",
      "name": "AISI 1050 Q&T 32 HRC",
      "designation": {
            "aisi": "1050",
            "uns": "G10500",
            "din": "1.0540",
            "en": "C50E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 32 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 277,
                  "rockwell_c": 32
            },
            "tensile_strength": {
                  "typical": 955
            },
            "yield_strength": {
                  "typical": 859
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 2342,
            "mc": 0.22
      },
      "taylor": {
            "C": 140,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.25,
            "C": 0.036,
            "m": 0.94
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 57,
                              "opt": 76,
                              "max": 95
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-576": {
      "id": "P-CS-576",
      "name": "AISI 1050 Q&T 35 HRC",
      "designation": {
            "aisi": "1050",
            "uns": "G10500",
            "din": "1.0540",
            "en": "C50E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 35 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 295,
                  "rockwell_c": 35
            },
            "tensile_strength": {
                  "typical": 1017
            },
            "yield_strength": {
                  "typical": 915
            },
            "elongation": {
                  "typical": 14
            }
      },
      "kienzle": {
            "kc1_1": 2429,
            "mc": 0.22
      },
      "taylor": {
            "C": 130,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.25,
            "C": 0.036,
            "m": 0.94
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 53,
                              "opt": 71,
                              "max": 88
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-577": {
      "id": "P-CS-577",
      "name": "AISI 1050 Q&T 38 HRC",
      "designation": {
            "aisi": "1050",
            "uns": "G10500",
            "din": "1.0540",
            "en": "C50E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 38 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 316,
                  "rockwell_c": 38
            },
            "tensile_strength": {
                  "typical": 1090
            },
            "yield_strength": {
                  "typical": 981
            },
            "elongation": {
                  "typical": 13
            }
      },
      "kienzle": {
            "kc1_1": 2533,
            "mc": 0.22
      },
      "taylor": {
            "C": 120,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.25,
            "C": 0.036,
            "m": 0.94
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 49,
                              "opt": 66,
                              "max": 82
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-578": {
      "id": "P-CS-578",
      "name": "AISI 1050 Q&T 40 HRC",
      "designation": {
            "aisi": "1050",
            "uns": "G10500",
            "din": "1.0540",
            "en": "C50E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 40 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 332,
                  "rockwell_c": 40
            },
            "tensile_strength": {
                  "typical": 1145
            },
            "yield_strength": {
                  "typical": 1030
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 2613,
            "mc": 0.22
      },
      "taylor": {
            "C": 113,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.25,
            "C": 0.036,
            "m": 0.94
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 46,
                              "opt": 62,
                              "max": 77
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-579": {
      "id": "P-CS-579",
      "name": "AISI 1050 Q&T 45 HRC",
      "designation": {
            "aisi": "1050",
            "uns": "G10500",
            "din": "1.0540",
            "en": "C50E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 45 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 377,
                  "rockwell_c": 45
            },
            "tensile_strength": {
                  "typical": 1300
            },
            "yield_strength": {
                  "typical": 1170
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 2842,
            "mc": 0.21
      },
      "taylor": {
            "C": 98,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.25,
            "C": 0.036,
            "m": 0.94
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 41,
                              "opt": 55,
                              "max": 68
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-580": {
      "id": "P-CS-580",
      "name": "AISI 1050 Q&T 50 HRC",
      "designation": {
            "aisi": "1050",
            "uns": "G10500",
            "din": "1.0540",
            "en": "C50E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 50 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 433,
                  "rockwell_c": 50
            },
            "tensile_strength": {
                  "typical": 1493
            },
            "yield_strength": {
                  "typical": 1343
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 3136,
            "mc": 0.21
      },
      "taylor": {
            "C": 83,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.25,
            "C": 0.036,
            "m": 0.94
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 35,
                              "opt": 47,
                              "max": 58
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-581": {
      "id": "P-CS-581",
      "name": "AISI 1055 Hot Rolled",
      "designation": {
            "aisi": "1055",
            "uns": "G10550",
            "din": "1.0535",
            "en": "C55E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Hot Rolled",
      "composition": {
            "C": 0.55,
            "Mn": 0.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 201
            },
            "tensile_strength": {
                  "typical": 708
            },
            "yield_strength": {
                  "typical": 394
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 2040,
            "mc": 0.23
      },
      "taylor": {
            "C": 210,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.24,
            "C": 0.035,
            "m": 0.93
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 82,
                              "opt": 110,
                              "max": 137
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-582": {
      "id": "P-CS-582",
      "name": "AISI 1055 Cold Drawn",
      "designation": {
            "aisi": "1055",
            "uns": "G10550",
            "din": "1.0535",
            "en": "C55E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Cold Drawn",
      "composition": {
            "C": 0.55,
            "Mn": 0.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 230
            },
            "tensile_strength": {
                  "typical": 810
            },
            "yield_strength": {
                  "typical": 581
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 2300,
            "mc": 0.23
      },
      "taylor": {
            "C": 189,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.24,
            "C": 0.035,
            "m": 0.93
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 74,
                              "opt": 99,
                              "max": 123
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-583": {
      "id": "P-CS-583",
      "name": "AISI 1055 Annealed",
      "designation": {
            "aisi": "1055",
            "uns": "G10550",
            "din": "1.0535",
            "en": "C55E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Annealed",
      "composition": {
            "C": 0.55,
            "Mn": 0.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 192
            },
            "tensile_strength": {
                  "typical": 675
            },
            "yield_strength": {
                  "typical": 415
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 2000,
            "mc": 0.23
      },
      "taylor": {
            "C": 210,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.24,
            "C": 0.035,
            "m": 0.93
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 82,
                              "opt": 110,
                              "max": 137
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-584": {
      "id": "P-CS-584",
      "name": "AISI 1055 Normalized",
      "designation": {
            "aisi": "1055",
            "uns": "G10550",
            "din": "1.0535",
            "en": "C55E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Normalized",
      "composition": {
            "C": 0.55,
            "Mn": 0.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 207
            },
            "tensile_strength": {
                  "typical": 729
            },
            "yield_strength": {
                  "typical": 435
            },
            "elongation": {
                  "typical": 22
            }
      },
      "kienzle": {
            "kc1_1": 2100,
            "mc": 0.23
      },
      "taylor": {
            "C": 199,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.24,
            "C": 0.035,
            "m": 0.93
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 78,
                              "opt": 104,
                              "max": 130
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts"
      ]
},
    "P-CS-585": {
      "id": "P-CS-585",
      "name": "AISI 1055 Q&T 25 HRC",
      "designation": {
            "aisi": "1055",
            "uns": "G10550",
            "din": "1.0535",
            "en": "C55E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 25 HRC",
      "composition": {
            "C": 0.55,
            "Mn": 0.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 243,
                  "rockwell_c": 25
            },
            "tensile_strength": {
                  "typical": 838
            },
            "yield_strength": {
                  "typical": 754
            },
            "elongation": {
                  "typical": 17
            }
      },
      "kienzle": {
            "kc1_1": 2209,
            "mc": 0.23
      },
      "taylor": {
            "C": 160,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.24,
            "C": 0.035,
            "m": 0.93
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 63,
                              "opt": 85,
                              "max": 106
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-586": {
      "id": "P-CS-586",
      "name": "AISI 1055 Q&T 28 HRC",
      "designation": {
            "aisi": "1055",
            "uns": "G10550",
            "din": "1.0535",
            "en": "C55E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 28 HRC",
      "composition": {
            "C": 0.55,
            "Mn": 0.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 255,
                  "rockwell_c": 28
            },
            "tensile_strength": {
                  "typical": 879
            },
            "yield_strength": {
                  "typical": 791
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 2264,
            "mc": 0.23
      },
      "taylor": {
            "C": 151,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.24,
            "C": 0.035,
            "m": 0.93
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 60,
                              "opt": 81,
                              "max": 101
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-587": {
      "id": "P-CS-587",
      "name": "AISI 1055 Q&T 30 HRC",
      "designation": {
            "aisi": "1055",
            "uns": "G10550",
            "din": "1.0535",
            "en": "C55E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 30 HRC",
      "composition": {
            "C": 0.55,
            "Mn": 0.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 266,
                  "rockwell_c": 30
            },
            "tensile_strength": {
                  "typical": 917
            },
            "yield_strength": {
                  "typical": 825
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 2315,
            "mc": 0.22
      },
      "taylor": {
            "C": 144,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.24,
            "C": 0.035,
            "m": 0.93
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 58,
                              "opt": 78,
                              "max": 97
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-588": {
      "id": "P-CS-588",
      "name": "AISI 1055 Q&T 32 HRC",
      "designation": {
            "aisi": "1055",
            "uns": "G10550",
            "din": "1.0535",
            "en": "C55E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 32 HRC",
      "composition": {
            "C": 0.55,
            "Mn": 0.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 277,
                  "rockwell_c": 32
            },
            "tensile_strength": {
                  "typical": 955
            },
            "yield_strength": {
                  "typical": 859
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 2367,
            "mc": 0.22
      },
      "taylor": {
            "C": 137,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.24,
            "C": 0.035,
            "m": 0.93
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 55,
                              "opt": 74,
                              "max": 92
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-589": {
      "id": "P-CS-589",
      "name": "AISI 1055 Q&T 35 HRC",
      "designation": {
            "aisi": "1055",
            "uns": "G10550",
            "din": "1.0535",
            "en": "C55E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 35 HRC",
      "composition": {
            "C": 0.55,
            "Mn": 0.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 295,
                  "rockwell_c": 35
            },
            "tensile_strength": {
                  "typical": 1017
            },
            "yield_strength": {
                  "typical": 915
            },
            "elongation": {
                  "typical": 14
            }
      },
      "kienzle": {
            "kc1_1": 2453,
            "mc": 0.22
      },
      "taylor": {
            "C": 128,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.24,
            "C": 0.035,
            "m": 0.93
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 52,
                              "opt": 70,
                              "max": 87
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-590": {
      "id": "P-CS-590",
      "name": "AISI 1055 Q&T 38 HRC",
      "designation": {
            "aisi": "1055",
            "uns": "G10550",
            "din": "1.0535",
            "en": "C55E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 38 HRC",
      "composition": {
            "C": 0.55,
            "Mn": 0.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 316,
                  "rockwell_c": 38
            },
            "tensile_strength": {
                  "typical": 1090
            },
            "yield_strength": {
                  "typical": 981
            },
            "elongation": {
                  "typical": 13
            }
      },
      "kienzle": {
            "kc1_1": 2556,
            "mc": 0.22
      },
      "taylor": {
            "C": 118,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.24,
            "C": 0.035,
            "m": 0.93
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 48,
                              "opt": 65,
                              "max": 81
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-591": {
      "id": "P-CS-591",
      "name": "AISI 1055 Q&T 40 HRC",
      "designation": {
            "aisi": "1055",
            "uns": "G10550",
            "din": "1.0535",
            "en": "C55E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 40 HRC",
      "composition": {
            "C": 0.55,
            "Mn": 0.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 332,
                  "rockwell_c": 40
            },
            "tensile_strength": {
                  "typical": 1145
            },
            "yield_strength": {
                  "typical": 1030
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 2635,
            "mc": 0.22
      },
      "taylor": {
            "C": 111,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.24,
            "C": 0.035,
            "m": 0.93
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 45,
                              "opt": 61,
                              "max": 76
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-592": {
      "id": "P-CS-592",
      "name": "AISI 1055 Q&T 45 HRC",
      "designation": {
            "aisi": "1055",
            "uns": "G10550",
            "din": "1.0535",
            "en": "C55E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 45 HRC",
      "composition": {
            "C": 0.55,
            "Mn": 0.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 377,
                  "rockwell_c": 45
            },
            "tensile_strength": {
                  "typical": 1300
            },
            "yield_strength": {
                  "typical": 1170
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 2863,
            "mc": 0.21
      },
      "taylor": {
            "C": 96,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.24,
            "C": 0.035,
            "m": 0.93
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 40,
                              "opt": 54,
                              "max": 67
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-593": {
      "id": "P-CS-593",
      "name": "AISI 1055 Q&T 50 HRC",
      "designation": {
            "aisi": "1055",
            "uns": "G10550",
            "din": "1.0535",
            "en": "C55E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 50 HRC",
      "composition": {
            "C": 0.55,
            "Mn": 0.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 433,
                  "rockwell_c": 50
            },
            "tensile_strength": {
                  "typical": 1493
            },
            "yield_strength": {
                  "typical": 1343
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 3155,
            "mc": 0.21
      },
      "taylor": {
            "C": 82,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.24,
            "C": 0.035,
            "m": 0.93
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 34,
                              "opt": 46,
                              "max": 57
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-594": {
      "id": "P-CS-594",
      "name": "AISI 1055 Q&T 55 HRC",
      "designation": {
            "aisi": "1055",
            "uns": "G10550",
            "din": "1.0535",
            "en": "C55E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - Medium Carbon",
      "condition": "Q&T 55 HRC",
      "composition": {
            "C": 0.55,
            "Mn": 0.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 50.7,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 500,
                  "rockwell_c": 55
            },
            "tensile_strength": {
                  "typical": 1725
            },
            "yield_strength": {
                  "typical": 1552
            },
            "elongation": {
                  "typical": 7
            }
      },
      "kienzle": {
            "kc1_1": 3513,
            "mc": 0.21
      },
      "taylor": {
            "C": 69,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.24,
            "C": 0.035,
            "m": 0.93
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 30,
                              "opt": 40,
                              "max": 50
                        }
                  }
            }
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "shafts",
            "gears",
            "axles",
            "machine_parts",
            "high_strength_components"
      ]
},
    "P-CS-595": {
      "id": "P-CS-595",
      "name": "AISI 1060 Annealed",
      "designation": {
            "aisi": "1060",
            "uns": "G10600",
            "din": "1.0601",
            "en": "C60E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Annealed",
      "composition": {
            "C": 0.6,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 201
            },
            "tensile_strength": {
                  "typical": 700
            },
            "yield_strength": {
                  "typical": 430
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 2050,
            "mc": 0.23
      },
      "taylor": {
            "C": 200,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 440,
            "B": 900,
            "n": 0.23,
            "C": 0.034,
            "m": 0.92
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts"
      ]
},
    "P-CS-596": {
      "id": "P-CS-596",
      "name": "AISI 1060 Spheroidize Annealed",
      "designation": {
            "aisi": "1060",
            "uns": "G10600",
            "din": "1.0601",
            "en": "C60E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Spheroidize Annealed",
      "composition": {
            "C": 0.6,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 180
            },
            "tensile_strength": {
                  "typical": 595
            },
            "yield_strength": {
                  "typical": 344
            },
            "elongation": {
                  "typical": 35
            }
      },
      "kienzle": {
            "kc1_1": 1845,
            "mc": 0.23
      },
      "taylor": {
            "C": 220,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 440,
            "B": 900,
            "n": 0.23,
            "C": 0.034,
            "m": 0.92
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P20-P30",
            "coating": [
                  "TiCN",
                  "TiAlN"
            ],
            "geometry": "Positive rake",
            "coolant": "Flood recommended"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts"
      ]
},
    "P-CS-597": {
      "id": "P-CS-597",
      "name": "AISI 1060 Q&T 35 HRC",
      "designation": {
            "aisi": "1060",
            "uns": "G10600",
            "din": "1.0601",
            "en": "C60E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 35 HRC",
      "composition": {
            "C": 0.6,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 295,
                  "rockwell_c": 35
            },
            "tensile_strength": {
                  "typical": 1017
            },
            "yield_strength": {
                  "typical": 894
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 2449,
            "mc": 0.22
      },
      "taylor": {
            "C": 128,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 440,
            "B": 900,
            "n": 0.23,
            "C": 0.034,
            "m": 0.92
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-598": {
      "id": "P-CS-598",
      "name": "AISI 1060 Q&T 40 HRC",
      "designation": {
            "aisi": "1060",
            "uns": "G10600",
            "din": "1.0601",
            "en": "C60E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 40 HRC",
      "composition": {
            "C": 0.6,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 332,
                  "rockwell_c": 40
            },
            "tensile_strength": {
                  "typical": 1145
            },
            "yield_strength": {
                  "typical": 1007
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 2626,
            "mc": 0.22
      },
      "taylor": {
            "C": 112,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 440,
            "B": 900,
            "n": 0.23,
            "C": 0.034,
            "m": 0.92
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-599": {
      "id": "P-CS-599",
      "name": "AISI 1060 Q&T 45 HRC",
      "designation": {
            "aisi": "1060",
            "uns": "G10600",
            "din": "1.0601",
            "en": "C60E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 45 HRC",
      "composition": {
            "C": 0.6,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 377,
                  "rockwell_c": 45
            },
            "tensile_strength": {
                  "typical": 1300
            },
            "yield_strength": {
                  "typical": 1144
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 2847,
            "mc": 0.21
      },
      "taylor": {
            "C": 97,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 440,
            "B": 900,
            "n": 0.23,
            "C": 0.034,
            "m": 0.92
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-600": {
      "id": "P-CS-600",
      "name": "AISI 1060 Q&T 50 HRC",
      "designation": {
            "aisi": "1060",
            "uns": "G10600",
            "din": "1.0601",
            "en": "C60E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 50 HRC",
      "composition": {
            "C": 0.6,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 433,
                  "rockwell_c": 50
            },
            "tensile_strength": {
                  "typical": 1493
            },
            "yield_strength": {
                  "typical": 1313
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 3130,
            "mc": 0.21
      },
      "taylor": {
            "C": 82,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 440,
            "B": 900,
            "n": 0.23,
            "C": 0.034,
            "m": 0.92
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-601": {
      "id": "P-CS-601",
      "name": "AISI 1060 Q&T 55 HRC",
      "designation": {
            "aisi": "1060",
            "uns": "G10600",
            "din": "1.0601",
            "en": "C60E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 55 HRC",
      "composition": {
            "C": 0.6,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 500,
                  "rockwell_c": 55
            },
            "tensile_strength": {
                  "typical": 1725
            },
            "yield_strength": {
                  "typical": 1518
            },
            "elongation": {
                  "typical": 7
            }
      },
      "kienzle": {
            "kc1_1": 3477,
            "mc": 0.21
      },
      "taylor": {
            "C": 70,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 440,
            "B": 900,
            "n": 0.23,
            "C": 0.034,
            "m": 0.92
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-602": {
      "id": "P-CS-602",
      "name": "AISI 1060 Q&T 58 HRC",
      "designation": {
            "aisi": "1060",
            "uns": "G10600",
            "din": "1.0601",
            "en": "C60E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 58 HRC",
      "composition": {
            "C": 0.6,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 547,
                  "rockwell_c": 58
            },
            "tensile_strength": {
                  "typical": 1887
            },
            "yield_strength": {
                  "typical": 1660
            },
            "elongation": {
                  "typical": 6
            }
      },
      "kienzle": {
            "kc1_1": 3726,
            "mc": 0.21
      },
      "taylor": {
            "C": 63,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 440,
            "B": 900,
            "n": 0.23,
            "C": 0.034,
            "m": 0.92
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-603": {
      "id": "P-CS-603",
      "name": "AISI 1070 Annealed",
      "designation": {
            "aisi": "1070",
            "uns": "G10700",
            "din": "1.0615",
            "en": "C70E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Annealed",
      "composition": {
            "C": 0.7,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 201
            },
            "tensile_strength": {
                  "typical": 700
            },
            "yield_strength": {
                  "typical": 430
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 2100,
            "mc": 0.22
      },
      "taylor": {
            "C": 185,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 460,
            "B": 930,
            "n": 0.22,
            "C": 0.032,
            "m": 0.91
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts"
      ]
},
    "P-CS-604": {
      "id": "P-CS-604",
      "name": "AISI 1070 Spheroidize Annealed",
      "designation": {
            "aisi": "1070",
            "uns": "G10700",
            "din": "1.0615",
            "en": "C70E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Spheroidize Annealed",
      "composition": {
            "C": 0.7,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 180
            },
            "tensile_strength": {
                  "typical": 595
            },
            "yield_strength": {
                  "typical": 344
            },
            "elongation": {
                  "typical": 35
            }
      },
      "kienzle": {
            "kc1_1": 1890,
            "mc": 0.22
      },
      "taylor": {
            "C": 203,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 460,
            "B": 930,
            "n": 0.22,
            "C": 0.032,
            "m": 0.91
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P20-P30",
            "coating": [
                  "TiCN",
                  "TiAlN"
            ],
            "geometry": "Positive rake",
            "coolant": "Flood recommended"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts"
      ]
},
    "P-CS-605": {
      "id": "P-CS-605",
      "name": "AISI 1070 Q&T 40 HRC",
      "designation": {
            "aisi": "1070",
            "uns": "G10700",
            "din": "1.0615",
            "en": "C70E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 40 HRC",
      "composition": {
            "C": 0.7,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 332,
                  "rockwell_c": 40
            },
            "tensile_strength": {
                  "typical": 1145
            },
            "yield_strength": {
                  "typical": 1007
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 2690,
            "mc": 0.21
      },
      "taylor": {
            "C": 103,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 460,
            "B": 930,
            "n": 0.22,
            "C": 0.032,
            "m": 0.91
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-606": {
      "id": "P-CS-606",
      "name": "AISI 1070 Q&T 45 HRC",
      "designation": {
            "aisi": "1070",
            "uns": "G10700",
            "din": "1.0615",
            "en": "C70E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 45 HRC",
      "composition": {
            "C": 0.7,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 377,
                  "rockwell_c": 45
            },
            "tensile_strength": {
                  "typical": 1300
            },
            "yield_strength": {
                  "typical": 1144
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 2916,
            "mc": 0.2
      },
      "taylor": {
            "C": 89,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 460,
            "B": 930,
            "n": 0.22,
            "C": 0.032,
            "m": 0.91
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-607": {
      "id": "P-CS-607",
      "name": "AISI 1070 Q&T 50 HRC",
      "designation": {
            "aisi": "1070",
            "uns": "G10700",
            "din": "1.0615",
            "en": "C70E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 50 HRC",
      "composition": {
            "C": 0.7,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 433,
                  "rockwell_c": 50
            },
            "tensile_strength": {
                  "typical": 1493
            },
            "yield_strength": {
                  "typical": 1313
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 3206,
            "mc": 0.2
      },
      "taylor": {
            "C": 76,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 460,
            "B": 930,
            "n": 0.22,
            "C": 0.032,
            "m": 0.91
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-608": {
      "id": "P-CS-608",
      "name": "AISI 1070 Q&T 55 HRC",
      "designation": {
            "aisi": "1070",
            "uns": "G10700",
            "din": "1.0615",
            "en": "C70E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 55 HRC",
      "composition": {
            "C": 0.7,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 500,
                  "rockwell_c": 55
            },
            "tensile_strength": {
                  "typical": 1725
            },
            "yield_strength": {
                  "typical": 1518
            },
            "elongation": {
                  "typical": 7
            }
      },
      "kienzle": {
            "kc1_1": 3562,
            "mc": 0.2
      },
      "taylor": {
            "C": 64,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 460,
            "B": 930,
            "n": 0.22,
            "C": 0.032,
            "m": 0.91
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-609": {
      "id": "P-CS-609",
      "name": "AISI 1070 Q&T 58 HRC",
      "designation": {
            "aisi": "1070",
            "uns": "G10700",
            "din": "1.0615",
            "en": "C70E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 58 HRC",
      "composition": {
            "C": 0.7,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 547,
                  "rockwell_c": 58
            },
            "tensile_strength": {
                  "typical": 1887
            },
            "yield_strength": {
                  "typical": 1660
            },
            "elongation": {
                  "typical": 6
            }
      },
      "kienzle": {
            "kc1_1": 3817,
            "mc": 0.2
      },
      "taylor": {
            "C": 58,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 460,
            "B": 930,
            "n": 0.22,
            "C": 0.032,
            "m": 0.91
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-610": {
      "id": "P-CS-610",
      "name": "AISI 1070 Q&T 60 HRC",
      "designation": {
            "aisi": "1070",
            "uns": "G10700",
            "din": "1.0615",
            "en": "C70E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 60 HRC",
      "composition": {
            "C": 0.7,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 582,
                  "rockwell_c": 60
            },
            "tensile_strength": {
                  "typical": 2007
            },
            "yield_strength": {
                  "typical": 1766
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 4009,
            "mc": 0.19
      },
      "taylor": {
            "C": 54,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 460,
            "B": 930,
            "n": 0.22,
            "C": 0.032,
            "m": 0.91
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-611": {
      "id": "P-CS-611",
      "name": "AISI 1074 Annealed",
      "designation": {
            "aisi": "1074",
            "uns": "G10740",
            "din": "",
            "en": ""
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Annealed",
      "composition": {
            "C": 0.74,
            "Mn": 0.55
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 207
            },
            "tensile_strength": {
                  "typical": 720
            },
            "yield_strength": {
                  "typical": 440
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 2150,
            "mc": 0.22
      },
      "taylor": {
            "C": 175,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 475,
            "B": 950,
            "n": 0.21,
            "C": 0.031,
            "m": 0.9
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts"
      ]
},
    "P-CS-612": {
      "id": "P-CS-612",
      "name": "AISI 1074 Spheroidize Annealed",
      "designation": {
            "aisi": "1074",
            "uns": "G10740",
            "din": "",
            "en": ""
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Spheroidize Annealed",
      "composition": {
            "C": 0.74,
            "Mn": 0.55
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 186
            },
            "tensile_strength": {
                  "typical": 612
            },
            "yield_strength": {
                  "typical": 352
            },
            "elongation": {
                  "typical": 35
            }
      },
      "kienzle": {
            "kc1_1": 1935,
            "mc": 0.22
      },
      "taylor": {
            "C": 192,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 475,
            "B": 950,
            "n": 0.21,
            "C": 0.031,
            "m": 0.9
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P20-P30",
            "coating": [
                  "TiCN",
                  "TiAlN"
            ],
            "geometry": "Positive rake",
            "coolant": "Flood recommended"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts"
      ]
},
    "P-CS-613": {
      "id": "P-CS-613",
      "name": "AISI 1074 Q&T 42 HRC",
      "designation": {
            "aisi": "1074",
            "uns": "G10740",
            "din": "",
            "en": ""
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 42 HRC",
      "composition": {
            "C": 0.74,
            "Mn": 0.55
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 349,
                  "rockwell_c": 42
            },
            "tensile_strength": {
                  "typical": 1204
            },
            "yield_strength": {
                  "typical": 1059
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 2789,
            "mc": 0.21
      },
      "taylor": {
            "C": 95,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 475,
            "B": 950,
            "n": 0.21,
            "C": 0.031,
            "m": 0.9
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-614": {
      "id": "P-CS-614",
      "name": "AISI 1074 Q&T 45 HRC",
      "designation": {
            "aisi": "1074",
            "uns": "G10740",
            "din": "",
            "en": ""
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 45 HRC",
      "composition": {
            "C": 0.74,
            "Mn": 0.55
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 377,
                  "rockwell_c": 45
            },
            "tensile_strength": {
                  "typical": 1300
            },
            "yield_strength": {
                  "typical": 1144
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 2929,
            "mc": 0.2
      },
      "taylor": {
            "C": 87,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 475,
            "B": 950,
            "n": 0.21,
            "C": 0.031,
            "m": 0.9
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-615": {
      "id": "P-CS-615",
      "name": "AISI 1074 Q&T 50 HRC",
      "designation": {
            "aisi": "1074",
            "uns": "G10740",
            "din": "",
            "en": ""
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 50 HRC",
      "composition": {
            "C": 0.74,
            "Mn": 0.55
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 433,
                  "rockwell_c": 50
            },
            "tensile_strength": {
                  "typical": 1493
            },
            "yield_strength": {
                  "typical": 1313
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 3215,
            "mc": 0.2
      },
      "taylor": {
            "C": 74,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 475,
            "B": 950,
            "n": 0.21,
            "C": 0.031,
            "m": 0.9
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-616": {
      "id": "P-CS-616",
      "name": "AISI 1074 Q&T 55 HRC",
      "designation": {
            "aisi": "1074",
            "uns": "G10740",
            "din": "",
            "en": ""
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 55 HRC",
      "composition": {
            "C": 0.74,
            "Mn": 0.55
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 500,
                  "rockwell_c": 55
            },
            "tensile_strength": {
                  "typical": 1725
            },
            "yield_strength": {
                  "typical": 1518
            },
            "elongation": {
                  "typical": 7
            }
      },
      "kienzle": {
            "kc1_1": 3567,
            "mc": 0.2
      },
      "taylor": {
            "C": 63,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 475,
            "B": 950,
            "n": 0.21,
            "C": 0.031,
            "m": 0.9
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-617": {
      "id": "P-CS-617",
      "name": "AISI 1074 Q&T 58 HRC",
      "designation": {
            "aisi": "1074",
            "uns": "G10740",
            "din": "",
            "en": ""
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 58 HRC",
      "composition": {
            "C": 0.74,
            "Mn": 0.55
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 547,
                  "rockwell_c": 58
            },
            "tensile_strength": {
                  "typical": 1887
            },
            "yield_strength": {
                  "typical": 1660
            },
            "elongation": {
                  "typical": 6
            }
      },
      "kienzle": {
            "kc1_1": 3819,
            "mc": 0.2
      },
      "taylor": {
            "C": 57,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 475,
            "B": 950,
            "n": 0.21,
            "C": 0.031,
            "m": 0.9
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-618": {
      "id": "P-CS-618",
      "name": "AISI 1074 Q&T 60 HRC",
      "designation": {
            "aisi": "1074",
            "uns": "G10740",
            "din": "",
            "en": ""
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 60 HRC",
      "composition": {
            "C": 0.74,
            "Mn": 0.55
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 582,
                  "rockwell_c": 60
            },
            "tensile_strength": {
                  "typical": 2007
            },
            "yield_strength": {
                  "typical": 1766
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 4010,
            "mc": 0.19
      },
      "taylor": {
            "C": 53,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 475,
            "B": 950,
            "n": 0.21,
            "C": 0.031,
            "m": 0.9
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-619": {
      "id": "P-CS-619",
      "name": "AISI 1080 Annealed",
      "designation": {
            "aisi": "1080",
            "uns": "G10800",
            "din": "1.1248",
            "en": "C80E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Annealed",
      "composition": {
            "C": 0.8,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 207
            },
            "tensile_strength": {
                  "typical": 720
            },
            "yield_strength": {
                  "typical": 440
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 2200,
            "mc": 0.22
      },
      "taylor": {
            "C": 165,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 490,
            "B": 970,
            "n": 0.2,
            "C": 0.03,
            "m": 0.89
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts"
      ]
},
    "P-CS-620": {
      "id": "P-CS-620",
      "name": "AISI 1080 Spheroidize Annealed",
      "designation": {
            "aisi": "1080",
            "uns": "G10800",
            "din": "1.1248",
            "en": "C80E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Spheroidize Annealed",
      "composition": {
            "C": 0.8,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 186
            },
            "tensile_strength": {
                  "typical": 612
            },
            "yield_strength": {
                  "typical": 352
            },
            "elongation": {
                  "typical": 35
            }
      },
      "kienzle": {
            "kc1_1": 1980,
            "mc": 0.22
      },
      "taylor": {
            "C": 181,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 490,
            "B": 970,
            "n": 0.2,
            "C": 0.03,
            "m": 0.89
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P20-P30",
            "coating": [
                  "TiCN",
                  "TiAlN"
            ],
            "geometry": "Positive rake",
            "coolant": "Flood recommended"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts"
      ]
},
    "P-CS-621": {
      "id": "P-CS-621",
      "name": "AISI 1080 Q&T 45 HRC",
      "designation": {
            "aisi": "1080",
            "uns": "G10800",
            "din": "1.1248",
            "en": "C80E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 45 HRC",
      "composition": {
            "C": 0.8,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 377,
                  "rockwell_c": 45
            },
            "tensile_strength": {
                  "typical": 1300
            },
            "yield_strength": {
                  "typical": 1144
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 2997,
            "mc": 0.2
      },
      "taylor": {
            "C": 82,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 490,
            "B": 970,
            "n": 0.2,
            "C": 0.03,
            "m": 0.89
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-622": {
      "id": "P-CS-622",
      "name": "AISI 1080 Q&T 50 HRC",
      "designation": {
            "aisi": "1080",
            "uns": "G10800",
            "din": "1.1248",
            "en": "C80E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 50 HRC",
      "composition": {
            "C": 0.8,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 433,
                  "rockwell_c": 50
            },
            "tensile_strength": {
                  "typical": 1493
            },
            "yield_strength": {
                  "typical": 1313
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 3290,
            "mc": 0.2
      },
      "taylor": {
            "C": 70,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 490,
            "B": 970,
            "n": 0.2,
            "C": 0.03,
            "m": 0.89
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-623": {
      "id": "P-CS-623",
      "name": "AISI 1080 Q&T 55 HRC",
      "designation": {
            "aisi": "1080",
            "uns": "G10800",
            "din": "1.1248",
            "en": "C80E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 55 HRC",
      "composition": {
            "C": 0.8,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 500,
                  "rockwell_c": 55
            },
            "tensile_strength": {
                  "typical": 1725
            },
            "yield_strength": {
                  "typical": 1518
            },
            "elongation": {
                  "typical": 7
            }
      },
      "kienzle": {
            "kc1_1": 3650,
            "mc": 0.2
      },
      "taylor": {
            "C": 59,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 490,
            "B": 970,
            "n": 0.2,
            "C": 0.03,
            "m": 0.89
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-624": {
      "id": "P-CS-624",
      "name": "AISI 1080 Q&T 58 HRC",
      "designation": {
            "aisi": "1080",
            "uns": "G10800",
            "din": "1.1248",
            "en": "C80E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 58 HRC",
      "composition": {
            "C": 0.8,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 547,
                  "rockwell_c": 58
            },
            "tensile_strength": {
                  "typical": 1887
            },
            "yield_strength": {
                  "typical": 1660
            },
            "elongation": {
                  "typical": 6
            }
      },
      "kienzle": {
            "kc1_1": 3908,
            "mc": 0.2
      },
      "taylor": {
            "C": 53,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 490,
            "B": 970,
            "n": 0.2,
            "C": 0.03,
            "m": 0.89
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-625": {
      "id": "P-CS-625",
      "name": "AISI 1080 Q&T 60 HRC",
      "designation": {
            "aisi": "1080",
            "uns": "G10800",
            "din": "1.1248",
            "en": "C80E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 60 HRC",
      "composition": {
            "C": 0.8,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 582,
                  "rockwell_c": 60
            },
            "tensile_strength": {
                  "typical": 2007
            },
            "yield_strength": {
                  "typical": 1766
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 4103,
            "mc": 0.19
      },
      "taylor": {
            "C": 50,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 490,
            "B": 970,
            "n": 0.2,
            "C": 0.03,
            "m": 0.89
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-626": {
      "id": "P-CS-626",
      "name": "AISI 1080 Q&T 62 HRC",
      "designation": {
            "aisi": "1080",
            "uns": "G10800",
            "din": "1.1248",
            "en": "C80E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 62 HRC",
      "composition": {
            "C": 0.8,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 619,
                  "rockwell_c": 62
            },
            "tensile_strength": {
                  "typical": 2135
            },
            "yield_strength": {
                  "typical": 1878
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 4310,
            "mc": 0.19
      },
      "taylor": {
            "C": 46,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 490,
            "B": 970,
            "n": 0.2,
            "C": 0.03,
            "m": 0.89
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-627": {
      "id": "P-CS-627",
      "name": "AISI 1084 Annealed",
      "designation": {
            "aisi": "1084",
            "uns": "G10840",
            "din": "",
            "en": ""
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Annealed",
      "composition": {
            "C": 0.84,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 212
            },
            "tensile_strength": {
                  "typical": 740
            },
            "yield_strength": {
                  "typical": 450
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 2250,
            "mc": 0.22
      },
      "taylor": {
            "C": 155,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 500,
            "B": 985,
            "n": 0.19,
            "C": 0.029,
            "m": 0.88
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts"
      ]
},
    "P-CS-628": {
      "id": "P-CS-628",
      "name": "AISI 1084 Spheroidize Annealed",
      "designation": {
            "aisi": "1084",
            "uns": "G10840",
            "din": "",
            "en": ""
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Spheroidize Annealed",
      "composition": {
            "C": 0.84,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 190
            },
            "tensile_strength": {
                  "typical": 629
            },
            "yield_strength": {
                  "typical": 360
            },
            "elongation": {
                  "typical": 35
            }
      },
      "kienzle": {
            "kc1_1": 2025,
            "mc": 0.22
      },
      "taylor": {
            "C": 170,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 500,
            "B": 985,
            "n": 0.19,
            "C": 0.029,
            "m": 0.88
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P20-P30",
            "coating": [
                  "TiCN",
                  "TiAlN"
            ],
            "geometry": "Positive rake",
            "coolant": "Flood recommended"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts"
      ]
},
    "P-CS-629": {
      "id": "P-CS-629",
      "name": "AISI 1084 Q&T 45 HRC",
      "designation": {
            "aisi": "1084",
            "uns": "G10840",
            "din": "",
            "en": ""
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 45 HRC",
      "composition": {
            "C": 0.84,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 377,
                  "rockwell_c": 45
            },
            "tensile_strength": {
                  "typical": 1300
            },
            "yield_strength": {
                  "typical": 1144
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 3018,
            "mc": 0.2
      },
      "taylor": {
            "C": 79,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 500,
            "B": 985,
            "n": 0.19,
            "C": 0.029,
            "m": 0.88
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-630": {
      "id": "P-CS-630",
      "name": "AISI 1084 Q&T 50 HRC",
      "designation": {
            "aisi": "1084",
            "uns": "G10840",
            "din": "",
            "en": ""
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 50 HRC",
      "composition": {
            "C": 0.84,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 433,
                  "rockwell_c": 50
            },
            "tensile_strength": {
                  "typical": 1493
            },
            "yield_strength": {
                  "typical": 1313
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 3309,
            "mc": 0.2
      },
      "taylor": {
            "C": 68,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 500,
            "B": 985,
            "n": 0.19,
            "C": 0.029,
            "m": 0.88
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-631": {
      "id": "P-CS-631",
      "name": "AISI 1084 Q&T 55 HRC",
      "designation": {
            "aisi": "1084",
            "uns": "G10840",
            "din": "",
            "en": ""
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 55 HRC",
      "composition": {
            "C": 0.84,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 500,
                  "rockwell_c": 55
            },
            "tensile_strength": {
                  "typical": 1725
            },
            "yield_strength": {
                  "typical": 1518
            },
            "elongation": {
                  "typical": 7
            }
      },
      "kienzle": {
            "kc1_1": 3668,
            "mc": 0.2
      },
      "taylor": {
            "C": 57,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 500,
            "B": 985,
            "n": 0.19,
            "C": 0.029,
            "m": 0.88
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-632": {
      "id": "P-CS-632",
      "name": "AISI 1084 Q&T 58 HRC",
      "designation": {
            "aisi": "1084",
            "uns": "G10840",
            "din": "",
            "en": ""
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 58 HRC",
      "composition": {
            "C": 0.84,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 547,
                  "rockwell_c": 58
            },
            "tensile_strength": {
                  "typical": 1887
            },
            "yield_strength": {
                  "typical": 1660
            },
            "elongation": {
                  "typical": 6
            }
      },
      "kienzle": {
            "kc1_1": 3924,
            "mc": 0.2
      },
      "taylor": {
            "C": 52,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 500,
            "B": 985,
            "n": 0.19,
            "C": 0.029,
            "m": 0.88
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-633": {
      "id": "P-CS-633",
      "name": "AISI 1084 Q&T 60 HRC",
      "designation": {
            "aisi": "1084",
            "uns": "G10840",
            "din": "",
            "en": ""
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 60 HRC",
      "composition": {
            "C": 0.84,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 582,
                  "rockwell_c": 60
            },
            "tensile_strength": {
                  "typical": 2007
            },
            "yield_strength": {
                  "typical": 1766
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 4118,
            "mc": 0.19
      },
      "taylor": {
            "C": 48,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 500,
            "B": 985,
            "n": 0.19,
            "C": 0.029,
            "m": 0.88
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-634": {
      "id": "P-CS-634",
      "name": "AISI 1084 Q&T 62 HRC",
      "designation": {
            "aisi": "1084",
            "uns": "G10840",
            "din": "",
            "en": ""
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 62 HRC",
      "composition": {
            "C": 0.84,
            "Mn": 0.75
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 619,
                  "rockwell_c": 62
            },
            "tensile_strength": {
                  "typical": 2135
            },
            "yield_strength": {
                  "typical": 1878
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 4324,
            "mc": 0.19
      },
      "taylor": {
            "C": 45,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 500,
            "B": 985,
            "n": 0.19,
            "C": 0.029,
            "m": 0.88
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-635": {
      "id": "P-CS-635",
      "name": "AISI 1090 Annealed",
      "designation": {
            "aisi": "1090",
            "uns": "G10900",
            "din": "1.1273",
            "en": "C90E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Annealed",
      "composition": {
            "C": 0.9,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 217
            },
            "tensile_strength": {
                  "typical": 760
            },
            "yield_strength": {
                  "typical": 460
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 2300,
            "mc": 0.21
      },
      "taylor": {
            "C": 145,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 515,
            "B": 1000,
            "n": 0.18,
            "C": 0.028,
            "m": 0.87
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts"
      ]
},
    "P-CS-636": {
      "id": "P-CS-636",
      "name": "AISI 1090 Spheroidize Annealed",
      "designation": {
            "aisi": "1090",
            "uns": "G10900",
            "din": "1.1273",
            "en": "C90E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Spheroidize Annealed",
      "composition": {
            "C": 0.9,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 195
            },
            "tensile_strength": {
                  "typical": 646
            },
            "yield_strength": {
                  "typical": 368
            },
            "elongation": {
                  "typical": 35
            }
      },
      "kienzle": {
            "kc1_1": 2070,
            "mc": 0.21
      },
      "taylor": {
            "C": 159,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 515,
            "B": 1000,
            "n": 0.18,
            "C": 0.028,
            "m": 0.87
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P20-P30",
            "coating": [
                  "TiCN",
                  "TiAlN"
            ],
            "geometry": "Positive rake",
            "coolant": "Flood recommended"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts"
      ]
},
    "P-CS-637": {
      "id": "P-CS-637",
      "name": "AISI 1090 Q&T 48 HRC",
      "designation": {
            "aisi": "1090",
            "uns": "G10900",
            "din": "1.1273",
            "en": "C90E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 48 HRC",
      "composition": {
            "C": 0.9,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 409,
                  "rockwell_c": 48
            },
            "tensile_strength": {
                  "typical": 1411
            },
            "yield_strength": {
                  "typical": 1241
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 3204,
            "mc": 0.19
      },
      "taylor": {
            "C": 69,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 515,
            "B": 1000,
            "n": 0.18,
            "C": 0.028,
            "m": 0.87
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-638": {
      "id": "P-CS-638",
      "name": "AISI 1090 Q&T 52 HRC",
      "designation": {
            "aisi": "1090",
            "uns": "G10900",
            "din": "1.1273",
            "en": "C90E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 52 HRC",
      "composition": {
            "C": 0.9,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 458,
                  "rockwell_c": 52
            },
            "tensile_strength": {
                  "typical": 1580
            },
            "yield_strength": {
                  "typical": 1390
            },
            "elongation": {
                  "typical": 7
            }
      },
      "kienzle": {
            "kc1_1": 3461,
            "mc": 0.19
      },
      "taylor": {
            "C": 61,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 515,
            "B": 1000,
            "n": 0.18,
            "C": 0.028,
            "m": 0.87
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-639": {
      "id": "P-CS-639",
      "name": "AISI 1090 Q&T 55 HRC",
      "designation": {
            "aisi": "1090",
            "uns": "G10900",
            "din": "1.1273",
            "en": "C90E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 55 HRC",
      "composition": {
            "C": 0.9,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 500,
                  "rockwell_c": 55
            },
            "tensile_strength": {
                  "typical": 1725
            },
            "yield_strength": {
                  "typical": 1518
            },
            "elongation": {
                  "typical": 7
            }
      },
      "kienzle": {
            "kc1_1": 3686,
            "mc": 0.19
      },
      "taylor": {
            "C": 55,
            "n": 0.13
      },
      "johnson_cook": {
            "A": 515,
            "B": 1000,
            "n": 0.18,
            "C": 0.028,
            "m": 0.87
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-640": {
      "id": "P-CS-640",
      "name": "AISI 1090 Q&T 58 HRC",
      "designation": {
            "aisi": "1090",
            "uns": "G10900",
            "din": "1.1273",
            "en": "C90E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 58 HRC",
      "composition": {
            "C": 0.9,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 547,
                  "rockwell_c": 58
            },
            "tensile_strength": {
                  "typical": 1887
            },
            "yield_strength": {
                  "typical": 1660
            },
            "elongation": {
                  "typical": 6
            }
      },
      "kienzle": {
            "kc1_1": 3941,
            "mc": 0.19
      },
      "taylor": {
            "C": 50,
            "n": 0.13
      },
      "johnson_cook": {
            "A": 515,
            "B": 1000,
            "n": 0.18,
            "C": 0.028,
            "m": 0.87
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-641": {
      "id": "P-CS-641",
      "name": "AISI 1090 Q&T 60 HRC",
      "designation": {
            "aisi": "1090",
            "uns": "G10900",
            "din": "1.1273",
            "en": "C90E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 60 HRC",
      "composition": {
            "C": 0.9,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 582,
                  "rockwell_c": 60
            },
            "tensile_strength": {
                  "typical": 2007
            },
            "yield_strength": {
                  "typical": 1766
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 4133,
            "mc": 0.19
      },
      "taylor": {
            "C": 46,
            "n": 0.13
      },
      "johnson_cook": {
            "A": 515,
            "B": 1000,
            "n": 0.18,
            "C": 0.028,
            "m": 0.87
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-642": {
      "id": "P-CS-642",
      "name": "AISI 1090 Q&T 62 HRC",
      "designation": {
            "aisi": "1090",
            "uns": "G10900",
            "din": "1.1273",
            "en": "C90E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 62 HRC",
      "composition": {
            "C": 0.9,
            "Mn": 0.7
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 619,
                  "rockwell_c": 62
            },
            "tensile_strength": {
                  "typical": 2135
            },
            "yield_strength": {
                  "typical": 1878
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 4339,
            "mc": 0.18
      },
      "taylor": {
            "C": 43,
            "n": 0.13
      },
      "johnson_cook": {
            "A": 515,
            "B": 1000,
            "n": 0.18,
            "C": 0.028,
            "m": 0.87
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-643": {
      "id": "P-CS-643",
      "name": "AISI 1095 Annealed",
      "designation": {
            "aisi": "1095",
            "uns": "G10950",
            "din": "1.1274",
            "en": "C100E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Annealed",
      "composition": {
            "C": 0.95,
            "Mn": 0.4
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 217
            },
            "tensile_strength": {
                  "typical": 760
            },
            "yield_strength": {
                  "typical": 460
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 2350,
            "mc": 0.21
      },
      "taylor": {
            "C": 140,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 530,
            "B": 1020,
            "n": 0.17,
            "C": 0.027,
            "m": 0.86
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts"
      ]
},
    "P-CS-644": {
      "id": "P-CS-644",
      "name": "AISI 1095 Spheroidize Annealed",
      "designation": {
            "aisi": "1095",
            "uns": "G10950",
            "din": "1.1274",
            "en": "C100E"
      },
      "iso_group": "P",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Spheroidize Annealed",
      "composition": {
            "C": 0.95,
            "Mn": 0.4
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 195
            },
            "tensile_strength": {
                  "typical": 646
            },
            "yield_strength": {
                  "typical": 368
            },
            "elongation": {
                  "typical": 35
            }
      },
      "kienzle": {
            "kc1_1": 2115,
            "mc": 0.21
      },
      "taylor": {
            "C": 154,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 530,
            "B": 1020,
            "n": 0.17,
            "C": 0.027,
            "m": 0.86
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P20-P30",
            "coating": [
                  "TiCN",
                  "TiAlN"
            ],
            "geometry": "Positive rake",
            "coolant": "Flood recommended"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts"
      ]
},
    "P-CS-645": {
      "id": "P-CS-645",
      "name": "AISI 1095 Q&T 50 HRC",
      "designation": {
            "aisi": "1095",
            "uns": "G10950",
            "din": "1.1274",
            "en": "C100E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 50 HRC",
      "composition": {
            "C": 0.95,
            "Mn": 0.4
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 433,
                  "rockwell_c": 50
            },
            "tensile_strength": {
                  "typical": 1493
            },
            "yield_strength": {
                  "typical": 1313
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 3402,
            "mc": 0.19
      },
      "taylor": {
            "C": 63,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 530,
            "B": 1020,
            "n": 0.17,
            "C": 0.027,
            "m": 0.86
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-646": {
      "id": "P-CS-646",
      "name": "AISI 1095 Q&T 55 HRC",
      "designation": {
            "aisi": "1095",
            "uns": "G10950",
            "din": "1.1274",
            "en": "C100E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 55 HRC",
      "composition": {
            "C": 0.95,
            "Mn": 0.4
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 500,
                  "rockwell_c": 55
            },
            "tensile_strength": {
                  "typical": 1725
            },
            "yield_strength": {
                  "typical": 1518
            },
            "elongation": {
                  "typical": 7
            }
      },
      "kienzle": {
            "kc1_1": 3766,
            "mc": 0.19
      },
      "taylor": {
            "C": 53,
            "n": 0.13
      },
      "johnson_cook": {
            "A": 530,
            "B": 1020,
            "n": 0.17,
            "C": 0.027,
            "m": 0.86
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-647": {
      "id": "P-CS-647",
      "name": "AISI 1095 Q&T 58 HRC",
      "designation": {
            "aisi": "1095",
            "uns": "G10950",
            "din": "1.1274",
            "en": "C100E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 58 HRC",
      "composition": {
            "C": 0.95,
            "Mn": 0.4
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 547,
                  "rockwell_c": 58
            },
            "tensile_strength": {
                  "typical": 1887
            },
            "yield_strength": {
                  "typical": 1660
            },
            "elongation": {
                  "typical": 6
            }
      },
      "kienzle": {
            "kc1_1": 4027,
            "mc": 0.19
      },
      "taylor": {
            "C": 48,
            "n": 0.13
      },
      "johnson_cook": {
            "A": 530,
            "B": 1020,
            "n": 0.17,
            "C": 0.027,
            "m": 0.86
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-648": {
      "id": "P-CS-648",
      "name": "AISI 1095 Q&T 60 HRC",
      "designation": {
            "aisi": "1095",
            "uns": "G10950",
            "din": "1.1274",
            "en": "C100E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 60 HRC",
      "composition": {
            "C": 0.95,
            "Mn": 0.4
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 582,
                  "rockwell_c": 60
            },
            "tensile_strength": {
                  "typical": 2007
            },
            "yield_strength": {
                  "typical": 1766
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 4223,
            "mc": 0.19
      },
      "taylor": {
            "C": 45,
            "n": 0.13
      },
      "johnson_cook": {
            "A": 530,
            "B": 1020,
            "n": 0.17,
            "C": 0.027,
            "m": 0.86
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-649": {
      "id": "P-CS-649",
      "name": "AISI 1095 Q&T 62 HRC",
      "designation": {
            "aisi": "1095",
            "uns": "G10950",
            "din": "1.1274",
            "en": "C100E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 62 HRC",
      "composition": {
            "C": 0.95,
            "Mn": 0.4
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 619,
                  "rockwell_c": 62
            },
            "tensile_strength": {
                  "typical": 2135
            },
            "yield_strength": {
                  "typical": 1878
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 4433,
            "mc": 0.18
      },
      "taylor": {
            "C": 41,
            "n": 0.13
      },
      "johnson_cook": {
            "A": 530,
            "B": 1020,
            "n": 0.17,
            "C": 0.027,
            "m": 0.86
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-CS-650": {
      "id": "P-CS-650",
      "name": "AISI 1095 Q&T 64 HRC",
      "designation": {
            "aisi": "1095",
            "uns": "G10950",
            "din": "1.1274",
            "en": "C100E"
      },
      "iso_group": "H",
      "material_class": "Carbon Steel - High Carbon",
      "condition": "Q&T 64 HRC",
      "composition": {
            "C": 0.95,
            "Mn": 0.4
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 48.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 659,
                  "rockwell_c": 64
            },
            "tensile_strength": {
                  "typical": 2273
            },
            "yield_strength": {
                  "typical": 2000
            },
            "elongation": {
                  "typical": 4
            }
      },
      "kienzle": {
            "kc1_1": 4662,
            "mc": 0.18
      },
      "taylor": {
            "C": 39,
            "n": 0.13
      },
      "johnson_cook": {
            "A": 530,
            "B": 1020,
            "n": 0.17,
            "C": 0.027,
            "m": 0.86
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "springs",
            "blades",
            "tools",
            "wear_parts",
            "high_hardness_components"
      ]
},
    "P-AS-701": {
      "id": "P-AS-701",
      "name": "AISI 4130 Annealed",
      "designation": {
            "aisi": "4130",
            "uns": "G41300",
            "din": "1.7218",
            "en": "25CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Annealed",
      "composition": {
            "C": 0.3,
            "Mn": 0.5,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 156
            },
            "tensile_strength": {
                  "typical": 560
            },
            "yield_strength": {
                  "typical": 360
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 1850,
            "mc": 0.24
      },
      "taylor": {
            "C": 240,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 340,
            "B": 750,
            "n": 0.3,
            "C": 0.04,
            "m": 0.95
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-702": {
      "id": "P-AS-702",
      "name": "AISI 4130 Normalized",
      "designation": {
            "aisi": "4130",
            "uns": "G41300",
            "din": "1.7218",
            "en": "25CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Normalized",
      "composition": {
            "C": 0.3,
            "Mn": 0.5,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 168
            },
            "tensile_strength": {
                  "typical": 604
            },
            "yield_strength": {
                  "typical": 378
            },
            "elongation": {
                  "typical": 22
            }
      },
      "kienzle": {
            "kc1_1": 1942,
            "mc": 0.24
      },
      "taylor": {
            "C": 228,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 340,
            "B": 750,
            "n": 0.3,
            "C": 0.04,
            "m": 0.95
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-703": {
      "id": "P-AS-703",
      "name": "AISI 4130 Q&T 22 HRC",
      "designation": {
            "aisi": "4130",
            "uns": "G41300",
            "din": "1.7218",
            "en": "25CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 22 HRC",
      "composition": {
            "C": 0.3,
            "Mn": 0.5,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 234,
                  "rockwell_c": 22
            },
            "tensile_strength": {
                  "typical": 807
            },
            "yield_strength": {
                  "typical": 742
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 2238,
            "mc": 0.24
      },
      "taylor": {
            "C": 150,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 340,
            "B": 750,
            "n": 0.3,
            "C": 0.04,
            "m": 0.95
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-704": {
      "id": "P-AS-704",
      "name": "AISI 4130 Q&T 25 HRC",
      "designation": {
            "aisi": "4130",
            "uns": "G41300",
            "din": "1.7218",
            "en": "25CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 25 HRC",
      "composition": {
            "C": 0.3,
            "Mn": 0.5,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 243,
                  "rockwell_c": 25
            },
            "tensile_strength": {
                  "typical": 838
            },
            "yield_strength": {
                  "typical": 770
            },
            "elongation": {
                  "typical": 14
            }
      },
      "kienzle": {
            "kc1_1": 2287,
            "mc": 0.24
      },
      "taylor": {
            "C": 144,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 340,
            "B": 750,
            "n": 0.3,
            "C": 0.04,
            "m": 0.95
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-705": {
      "id": "P-AS-705",
      "name": "AISI 4130 Q&T 28 HRC",
      "designation": {
            "aisi": "4130",
            "uns": "G41300",
            "din": "1.7218",
            "en": "25CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 28 HRC",
      "composition": {
            "C": 0.3,
            "Mn": 0.5,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 255,
                  "rockwell_c": 28
            },
            "tensile_strength": {
                  "typical": 879
            },
            "yield_strength": {
                  "typical": 808
            },
            "elongation": {
                  "typical": 13
            }
      },
      "kienzle": {
            "kc1_1": 2354,
            "mc": 0.24
      },
      "taylor": {
            "C": 136,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 340,
            "B": 750,
            "n": 0.3,
            "C": 0.04,
            "m": 0.95
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-706": {
      "id": "P-AS-706",
      "name": "AISI 4130 Q&T 30 HRC",
      "designation": {
            "aisi": "4130",
            "uns": "G41300",
            "din": "1.7218",
            "en": "25CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 30 HRC",
      "composition": {
            "C": 0.3,
            "Mn": 0.5,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 266,
                  "rockwell_c": 30
            },
            "tensile_strength": {
                  "typical": 917
            },
            "yield_strength": {
                  "typical": 843
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 2416,
            "mc": 0.23
      },
      "taylor": {
            "C": 129,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 340,
            "B": 750,
            "n": 0.3,
            "C": 0.04,
            "m": 0.95
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-707": {
      "id": "P-AS-707",
      "name": "AISI 4130 Q&T 32 HRC",
      "designation": {
            "aisi": "4130",
            "uns": "G41300",
            "din": "1.7218",
            "en": "25CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 32 HRC",
      "composition": {
            "C": 0.3,
            "Mn": 0.5,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 277,
                  "rockwell_c": 32
            },
            "tensile_strength": {
                  "typical": 955
            },
            "yield_strength": {
                  "typical": 878
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 2479,
            "mc": 0.23
      },
      "taylor": {
            "C": 124,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 340,
            "B": 750,
            "n": 0.3,
            "C": 0.04,
            "m": 0.95
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-708": {
      "id": "P-AS-708",
      "name": "AISI 4130 Q&T 35 HRC",
      "designation": {
            "aisi": "4130",
            "uns": "G41300",
            "din": "1.7218",
            "en": "25CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 35 HRC",
      "composition": {
            "C": 0.3,
            "Mn": 0.5,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 295,
                  "rockwell_c": 35
            },
            "tensile_strength": {
                  "typical": 1017
            },
            "yield_strength": {
                  "typical": 935
            },
            "elongation": {
                  "typical": 11
            }
      },
      "kienzle": {
            "kc1_1": 2583,
            "mc": 0.23
      },
      "taylor": {
            "C": 115,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 340,
            "B": 750,
            "n": 0.3,
            "C": 0.04,
            "m": 0.95
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-709": {
      "id": "P-AS-709",
      "name": "AISI 4130 Q&T 38 HRC",
      "designation": {
            "aisi": "4130",
            "uns": "G41300",
            "din": "1.7218",
            "en": "25CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 38 HRC",
      "composition": {
            "C": 0.3,
            "Mn": 0.5,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 316,
                  "rockwell_c": 38
            },
            "tensile_strength": {
                  "typical": 1090
            },
            "yield_strength": {
                  "typical": 1002
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 2706,
            "mc": 0.23
      },
      "taylor": {
            "C": 106,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 340,
            "B": 750,
            "n": 0.3,
            "C": 0.04,
            "m": 0.95
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-710": {
      "id": "P-AS-710",
      "name": "AISI 4130 Q&T 40 HRC",
      "designation": {
            "aisi": "4130",
            "uns": "G41300",
            "din": "1.7218",
            "en": "25CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 40 HRC",
      "composition": {
            "C": 0.3,
            "Mn": 0.5,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 332,
                  "rockwell_c": 40
            },
            "tensile_strength": {
                  "typical": 1145
            },
            "yield_strength": {
                  "typical": 1053
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 2800,
            "mc": 0.23
      },
      "taylor": {
            "C": 100,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 340,
            "B": 750,
            "n": 0.3,
            "C": 0.04,
            "m": 0.95
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-711": {
      "id": "P-AS-711",
      "name": "AISI 4130 Q&T 42 HRC",
      "designation": {
            "aisi": "4130",
            "uns": "G41300",
            "din": "1.7218",
            "en": "25CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 42 HRC",
      "composition": {
            "C": 0.3,
            "Mn": 0.5,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 349,
                  "rockwell_c": 42
            },
            "tensile_strength": {
                  "typical": 1204
            },
            "yield_strength": {
                  "typical": 1107
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 2902,
            "mc": 0.23
      },
      "taylor": {
            "C": 95,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 340,
            "B": 750,
            "n": 0.3,
            "C": 0.04,
            "m": 0.95
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-712": {
      "id": "P-AS-712",
      "name": "AISI 4140 Annealed",
      "designation": {
            "aisi": "4140",
            "uns": "G41400",
            "din": "1.7225",
            "en": "42CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Annealed",
      "composition": {
            "C": 0.4,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 197
            },
            "tensile_strength": {
                  "typical": 690
            },
            "yield_strength": {
                  "typical": 460
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 1950,
            "mc": 0.23
      },
      "taylor": {
            "C": 220,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.26,
            "C": 0.036,
            "m": 0.93
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-713": {
      "id": "P-AS-713",
      "name": "AISI 4140 Normalized",
      "designation": {
            "aisi": "4140",
            "uns": "G41400",
            "din": "1.7225",
            "en": "42CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Normalized",
      "composition": {
            "C": 0.4,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 212
            },
            "tensile_strength": {
                  "typical": 745
            },
            "yield_strength": {
                  "typical": 483
            },
            "elongation": {
                  "typical": 22
            }
      },
      "kienzle": {
            "kc1_1": 2047,
            "mc": 0.23
      },
      "taylor": {
            "C": 209,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.26,
            "C": 0.036,
            "m": 0.93
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-714": {
      "id": "P-AS-714",
      "name": "AISI 4140 Q&T 22 HRC",
      "designation": {
            "aisi": "4140",
            "uns": "G41400",
            "din": "1.7225",
            "en": "42CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 22 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 234,
                  "rockwell_c": 22
            },
            "tensile_strength": {
                  "typical": 807
            },
            "yield_strength": {
                  "typical": 742
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 2089,
            "mc": 0.23
      },
      "taylor": {
            "C": 180,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.26,
            "C": 0.036,
            "m": 0.93
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-715": {
      "id": "P-AS-715",
      "name": "AISI 4140 Q&T 25 HRC",
      "designation": {
            "aisi": "4140",
            "uns": "G41400",
            "din": "1.7225",
            "en": "42CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 25 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 243,
                  "rockwell_c": 25
            },
            "tensile_strength": {
                  "typical": 838
            },
            "yield_strength": {
                  "typical": 770
            },
            "elongation": {
                  "typical": 14
            }
      },
      "kienzle": {
            "kc1_1": 2127,
            "mc": 0.23
      },
      "taylor": {
            "C": 172,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.26,
            "C": 0.036,
            "m": 0.93
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-716": {
      "id": "P-AS-716",
      "name": "AISI 4140 Q&T 28 HRC",
      "designation": {
            "aisi": "4140",
            "uns": "G41400",
            "din": "1.7225",
            "en": "42CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 28 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 255,
                  "rockwell_c": 28
            },
            "tensile_strength": {
                  "typical": 879
            },
            "yield_strength": {
                  "typical": 808
            },
            "elongation": {
                  "typical": 13
            }
      },
      "kienzle": {
            "kc1_1": 2178,
            "mc": 0.23
      },
      "taylor": {
            "C": 163,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.26,
            "C": 0.036,
            "m": 0.93
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-717": {
      "id": "P-AS-717",
      "name": "AISI 4140 Q&T 30 HRC",
      "designation": {
            "aisi": "4140",
            "uns": "G41400",
            "din": "1.7225",
            "en": "42CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 30 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 266,
                  "rockwell_c": 30
            },
            "tensile_strength": {
                  "typical": 917
            },
            "yield_strength": {
                  "typical": 843
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 2226,
            "mc": 0.22
      },
      "taylor": {
            "C": 155,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.26,
            "C": 0.036,
            "m": 0.93
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-718": {
      "id": "P-AS-718",
      "name": "AISI 4140 Q&T 32 HRC",
      "designation": {
            "aisi": "4140",
            "uns": "G41400",
            "din": "1.7225",
            "en": "42CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 32 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 277,
                  "rockwell_c": 32
            },
            "tensile_strength": {
                  "typical": 955
            },
            "yield_strength": {
                  "typical": 878
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 2275,
            "mc": 0.22
      },
      "taylor": {
            "C": 148,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.26,
            "C": 0.036,
            "m": 0.93
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-719": {
      "id": "P-AS-719",
      "name": "AISI 4140 Q&T 35 HRC",
      "designation": {
            "aisi": "4140",
            "uns": "G41400",
            "din": "1.7225",
            "en": "42CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 35 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 295,
                  "rockwell_c": 35
            },
            "tensile_strength": {
                  "typical": 1017
            },
            "yield_strength": {
                  "typical": 935
            },
            "elongation": {
                  "typical": 11
            }
      },
      "kienzle": {
            "kc1_1": 2357,
            "mc": 0.22
      },
      "taylor": {
            "C": 138,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.26,
            "C": 0.036,
            "m": 0.93
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-720": {
      "id": "P-AS-720",
      "name": "AISI 4140 Q&T 38 HRC",
      "designation": {
            "aisi": "4140",
            "uns": "G41400",
            "din": "1.7225",
            "en": "42CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 38 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 316,
                  "rockwell_c": 38
            },
            "tensile_strength": {
                  "typical": 1090
            },
            "yield_strength": {
                  "typical": 1002
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 2454,
            "mc": 0.22
      },
      "taylor": {
            "C": 127,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.26,
            "C": 0.036,
            "m": 0.93
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-721": {
      "id": "P-AS-721",
      "name": "AISI 4140 Q&T 40 HRC",
      "designation": {
            "aisi": "4140",
            "uns": "G41400",
            "din": "1.7225",
            "en": "42CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 40 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 332,
                  "rockwell_c": 40
            },
            "tensile_strength": {
                  "typical": 1145
            },
            "yield_strength": {
                  "typical": 1053
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 2529,
            "mc": 0.22
      },
      "taylor": {
            "C": 120,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.26,
            "C": 0.036,
            "m": 0.93
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-722": {
      "id": "P-AS-722",
      "name": "AISI 4140 Q&T 45 HRC",
      "designation": {
            "aisi": "4140",
            "uns": "G41400",
            "din": "1.7225",
            "en": "42CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 45 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 377,
                  "rockwell_c": 45
            },
            "tensile_strength": {
                  "typical": 1300
            },
            "yield_strength": {
                  "typical": 1196
            },
            "elongation": {
                  "typical": 7
            }
      },
      "kienzle": {
            "kc1_1": 2744,
            "mc": 0.21
      },
      "taylor": {
            "C": 104,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.26,
            "C": 0.036,
            "m": 0.93
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-723": {
      "id": "P-AS-723",
      "name": "AISI 4140 Q&T 50 HRC",
      "designation": {
            "aisi": "4140",
            "uns": "G41400",
            "din": "1.7225",
            "en": "42CrMo4"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 50 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 433,
                  "rockwell_c": 50
            },
            "tensile_strength": {
                  "typical": 1493
            },
            "yield_strength": {
                  "typical": 1373
            },
            "elongation": {
                  "typical": 6
            }
      },
      "kienzle": {
            "kc1_1": 3020,
            "mc": 0.21
      },
      "taylor": {
            "C": 88,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 400,
            "B": 840,
            "n": 0.26,
            "C": 0.036,
            "m": 0.93
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-724": {
      "id": "P-AS-724",
      "name": "AISI 4145 Annealed",
      "designation": {
            "aisi": "4145",
            "uns": "G41450",
            "din": "1.7228",
            "en": "45CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Annealed",
      "composition": {
            "C": 0.45,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 207
            },
            "tensile_strength": {
                  "typical": 725
            },
            "yield_strength": {
                  "typical": 485
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 2000,
            "mc": 0.23
      },
      "taylor": {
            "C": 210,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.25,
            "C": 0.034,
            "m": 0.92
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-725": {
      "id": "P-AS-725",
      "name": "AISI 4145 Normalized",
      "designation": {
            "aisi": "4145",
            "uns": "G41450",
            "din": "1.7228",
            "en": "45CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Normalized",
      "composition": {
            "C": 0.45,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 223
            },
            "tensile_strength": {
                  "typical": 783
            },
            "yield_strength": {
                  "typical": 509
            },
            "elongation": {
                  "typical": 22
            }
      },
      "kienzle": {
            "kc1_1": 2100,
            "mc": 0.23
      },
      "taylor": {
            "C": 199,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.25,
            "C": 0.034,
            "m": 0.92
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-726": {
      "id": "P-AS-726",
      "name": "AISI 4145 Q&T 25 HRC",
      "designation": {
            "aisi": "4145",
            "uns": "G41450",
            "din": "1.7228",
            "en": "45CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 25 HRC",
      "composition": {
            "C": 0.45,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 243,
                  "rockwell_c": 25
            },
            "tensile_strength": {
                  "typical": 838
            },
            "yield_strength": {
                  "typical": 770
            },
            "elongation": {
                  "typical": 14
            }
      },
      "kienzle": {
            "kc1_1": 2131,
            "mc": 0.23
      },
      "taylor": {
            "C": 174,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.25,
            "C": 0.034,
            "m": 0.92
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-727": {
      "id": "P-AS-727",
      "name": "AISI 4145 Q&T 28 HRC",
      "designation": {
            "aisi": "4145",
            "uns": "G41450",
            "din": "1.7228",
            "en": "45CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 28 HRC",
      "composition": {
            "C": 0.45,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 255,
                  "rockwell_c": 28
            },
            "tensile_strength": {
                  "typical": 879
            },
            "yield_strength": {
                  "typical": 808
            },
            "elongation": {
                  "typical": 13
            }
      },
      "kienzle": {
            "kc1_1": 2180,
            "mc": 0.23
      },
      "taylor": {
            "C": 165,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.25,
            "C": 0.034,
            "m": 0.92
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-728": {
      "id": "P-AS-728",
      "name": "AISI 4145 Q&T 30 HRC",
      "designation": {
            "aisi": "4145",
            "uns": "G41450",
            "din": "1.7228",
            "en": "45CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 30 HRC",
      "composition": {
            "C": 0.45,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 266,
                  "rockwell_c": 30
            },
            "tensile_strength": {
                  "typical": 917
            },
            "yield_strength": {
                  "typical": 843
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 2226,
            "mc": 0.22
      },
      "taylor": {
            "C": 157,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.25,
            "C": 0.034,
            "m": 0.92
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-729": {
      "id": "P-AS-729",
      "name": "AISI 4145 Q&T 32 HRC",
      "designation": {
            "aisi": "4145",
            "uns": "G41450",
            "din": "1.7228",
            "en": "45CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 32 HRC",
      "composition": {
            "C": 0.45,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 277,
                  "rockwell_c": 32
            },
            "tensile_strength": {
                  "typical": 955
            },
            "yield_strength": {
                  "typical": 878
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 2273,
            "mc": 0.22
      },
      "taylor": {
            "C": 150,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.25,
            "C": 0.034,
            "m": 0.92
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-730": {
      "id": "P-AS-730",
      "name": "AISI 4145 Q&T 35 HRC",
      "designation": {
            "aisi": "4145",
            "uns": "G41450",
            "din": "1.7228",
            "en": "45CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 35 HRC",
      "composition": {
            "C": 0.45,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 295,
                  "rockwell_c": 35
            },
            "tensile_strength": {
                  "typical": 1017
            },
            "yield_strength": {
                  "typical": 935
            },
            "elongation": {
                  "typical": 11
            }
      },
      "kienzle": {
            "kc1_1": 2351,
            "mc": 0.22
      },
      "taylor": {
            "C": 139,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.25,
            "C": 0.034,
            "m": 0.92
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-731": {
      "id": "P-AS-731",
      "name": "AISI 4145 Q&T 38 HRC",
      "designation": {
            "aisi": "4145",
            "uns": "G41450",
            "din": "1.7228",
            "en": "45CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 38 HRC",
      "composition": {
            "C": 0.45,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 316,
                  "rockwell_c": 38
            },
            "tensile_strength": {
                  "typical": 1090
            },
            "yield_strength": {
                  "typical": 1002
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 2444,
            "mc": 0.22
      },
      "taylor": {
            "C": 129,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.25,
            "C": 0.034,
            "m": 0.92
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-732": {
      "id": "P-AS-732",
      "name": "AISI 4145 Q&T 40 HRC",
      "designation": {
            "aisi": "4145",
            "uns": "G41450",
            "din": "1.7228",
            "en": "45CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 40 HRC",
      "composition": {
            "C": 0.45,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 332,
                  "rockwell_c": 40
            },
            "tensile_strength": {
                  "typical": 1145
            },
            "yield_strength": {
                  "typical": 1053
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 2516,
            "mc": 0.22
      },
      "taylor": {
            "C": 121,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.25,
            "C": 0.034,
            "m": 0.92
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-733": {
      "id": "P-AS-733",
      "name": "AISI 4145 Q&T 45 HRC",
      "designation": {
            "aisi": "4145",
            "uns": "G41450",
            "din": "1.7228",
            "en": "45CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 45 HRC",
      "composition": {
            "C": 0.45,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 377,
                  "rockwell_c": 45
            },
            "tensile_strength": {
                  "typical": 1300
            },
            "yield_strength": {
                  "typical": 1196
            },
            "elongation": {
                  "typical": 7
            }
      },
      "kienzle": {
            "kc1_1": 2724,
            "mc": 0.21
      },
      "taylor": {
            "C": 105,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.25,
            "C": 0.034,
            "m": 0.92
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-734": {
      "id": "P-AS-734",
      "name": "AISI 4145 Q&T 50 HRC",
      "designation": {
            "aisi": "4145",
            "uns": "G41450",
            "din": "1.7228",
            "en": "45CrMo4"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 50 HRC",
      "composition": {
            "C": 0.45,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 433,
                  "rockwell_c": 50
            },
            "tensile_strength": {
                  "typical": 1493
            },
            "yield_strength": {
                  "typical": 1373
            },
            "elongation": {
                  "typical": 6
            }
      },
      "kienzle": {
            "kc1_1": 2991,
            "mc": 0.21
      },
      "taylor": {
            "C": 89,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.25,
            "C": 0.034,
            "m": 0.92
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-735": {
      "id": "P-AS-735",
      "name": "AISI 4145 Q&T 52 HRC",
      "designation": {
            "aisi": "4145",
            "uns": "G41450",
            "din": "1.7228",
            "en": "45CrMo4"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 52 HRC",
      "composition": {
            "C": 0.45,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 458,
                  "rockwell_c": 52
            },
            "tensile_strength": {
                  "typical": 1580
            },
            "yield_strength": {
                  "typical": 1453
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 3112,
            "mc": 0.21
      },
      "taylor": {
            "C": 84,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 420,
            "B": 870,
            "n": 0.25,
            "C": 0.034,
            "m": 0.92
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-736": {
      "id": "P-AS-736",
      "name": "AISI 4150 Annealed",
      "designation": {
            "aisi": "4150",
            "uns": "G41500",
            "din": "1.7220",
            "en": "50CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Annealed",
      "composition": {
            "C": 0.5,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 217
            },
            "tensile_strength": {
                  "typical": 760
            },
            "yield_strength": {
                  "typical": 510
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 2050,
            "mc": 0.22
      },
      "taylor": {
            "C": 195,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 445,
            "B": 900,
            "n": 0.24,
            "C": 0.032,
            "m": 0.91
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-737": {
      "id": "P-AS-737",
      "name": "AISI 4150 Normalized",
      "designation": {
            "aisi": "4150",
            "uns": "G41500",
            "din": "1.7220",
            "en": "50CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Normalized",
      "composition": {
            "C": 0.5,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 234
            },
            "tensile_strength": {
                  "typical": 820
            },
            "yield_strength": {
                  "typical": 535
            },
            "elongation": {
                  "typical": 22
            }
      },
      "kienzle": {
            "kc1_1": 2152,
            "mc": 0.22
      },
      "taylor": {
            "C": 185,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 445,
            "B": 900,
            "n": 0.24,
            "C": 0.032,
            "m": 0.91
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-738": {
      "id": "P-AS-738",
      "name": "AISI 4150 Q&T 28 HRC",
      "designation": {
            "aisi": "4150",
            "uns": "G41500",
            "din": "1.7220",
            "en": "50CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 28 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 255,
                  "rockwell_c": 28
            },
            "tensile_strength": {
                  "typical": 879
            },
            "yield_strength": {
                  "typical": 808
            },
            "elongation": {
                  "typical": 13
            }
      },
      "kienzle": {
            "kc1_1": 2185,
            "mc": 0.22
      },
      "taylor": {
            "C": 161,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 445,
            "B": 900,
            "n": 0.24,
            "C": 0.032,
            "m": 0.91
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-739": {
      "id": "P-AS-739",
      "name": "AISI 4150 Q&T 30 HRC",
      "designation": {
            "aisi": "4150",
            "uns": "G41500",
            "din": "1.7220",
            "en": "50CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 30 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 266,
                  "rockwell_c": 30
            },
            "tensile_strength": {
                  "typical": 917
            },
            "yield_strength": {
                  "typical": 843
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 2229,
            "mc": 0.21
      },
      "taylor": {
            "C": 154,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 445,
            "B": 900,
            "n": 0.24,
            "C": 0.032,
            "m": 0.91
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-740": {
      "id": "P-AS-740",
      "name": "AISI 4150 Q&T 32 HRC",
      "designation": {
            "aisi": "4150",
            "uns": "G41500",
            "din": "1.7220",
            "en": "50CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 32 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 277,
                  "rockwell_c": 32
            },
            "tensile_strength": {
                  "typical": 955
            },
            "yield_strength": {
                  "typical": 878
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 2274,
            "mc": 0.21
      },
      "taylor": {
            "C": 147,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 445,
            "B": 900,
            "n": 0.24,
            "C": 0.032,
            "m": 0.91
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-741": {
      "id": "P-AS-741",
      "name": "AISI 4150 Q&T 35 HRC",
      "designation": {
            "aisi": "4150",
            "uns": "G41500",
            "din": "1.7220",
            "en": "50CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 35 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 295,
                  "rockwell_c": 35
            },
            "tensile_strength": {
                  "typical": 1017
            },
            "yield_strength": {
                  "typical": 935
            },
            "elongation": {
                  "typical": 11
            }
      },
      "kienzle": {
            "kc1_1": 2349,
            "mc": 0.21
      },
      "taylor": {
            "C": 136,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 445,
            "B": 900,
            "n": 0.24,
            "C": 0.032,
            "m": 0.91
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-742": {
      "id": "P-AS-742",
      "name": "AISI 4150 Q&T 38 HRC",
      "designation": {
            "aisi": "4150",
            "uns": "G41500",
            "din": "1.7220",
            "en": "50CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 38 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 316,
                  "rockwell_c": 38
            },
            "tensile_strength": {
                  "typical": 1090
            },
            "yield_strength": {
                  "typical": 1002
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 2439,
            "mc": 0.21
      },
      "taylor": {
            "C": 126,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 445,
            "B": 900,
            "n": 0.24,
            "C": 0.032,
            "m": 0.91
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-743": {
      "id": "P-AS-743",
      "name": "AISI 4150 Q&T 40 HRC",
      "designation": {
            "aisi": "4150",
            "uns": "G41500",
            "din": "1.7220",
            "en": "50CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 40 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 332,
                  "rockwell_c": 40
            },
            "tensile_strength": {
                  "typical": 1145
            },
            "yield_strength": {
                  "typical": 1053
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 2508,
            "mc": 0.21
      },
      "taylor": {
            "C": 119,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 445,
            "B": 900,
            "n": 0.24,
            "C": 0.032,
            "m": 0.91
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-744": {
      "id": "P-AS-744",
      "name": "AISI 4150 Q&T 45 HRC",
      "designation": {
            "aisi": "4150",
            "uns": "G41500",
            "din": "1.7220",
            "en": "50CrMo4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 45 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 377,
                  "rockwell_c": 45
            },
            "tensile_strength": {
                  "typical": 1300
            },
            "yield_strength": {
                  "typical": 1196
            },
            "elongation": {
                  "typical": 7
            }
      },
      "kienzle": {
            "kc1_1": 2709,
            "mc": 0.2
      },
      "taylor": {
            "C": 103,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 445,
            "B": 900,
            "n": 0.24,
            "C": 0.032,
            "m": 0.91
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-745": {
      "id": "P-AS-745",
      "name": "AISI 4150 Q&T 50 HRC",
      "designation": {
            "aisi": "4150",
            "uns": "G41500",
            "din": "1.7220",
            "en": "50CrMo4"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 50 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 433,
                  "rockwell_c": 50
            },
            "tensile_strength": {
                  "typical": 1493
            },
            "yield_strength": {
                  "typical": 1373
            },
            "elongation": {
                  "typical": 6
            }
      },
      "kienzle": {
            "kc1_1": 2967,
            "mc": 0.2
      },
      "taylor": {
            "C": 88,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 445,
            "B": 900,
            "n": 0.24,
            "C": 0.032,
            "m": 0.91
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-746": {
      "id": "P-AS-746",
      "name": "AISI 4150 Q&T 52 HRC",
      "designation": {
            "aisi": "4150",
            "uns": "G41500",
            "din": "1.7220",
            "en": "50CrMo4"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 52 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 458,
                  "rockwell_c": 52
            },
            "tensile_strength": {
                  "typical": 1580
            },
            "yield_strength": {
                  "typical": 1453
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 3085,
            "mc": 0.2
      },
      "taylor": {
            "C": 82,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 445,
            "B": 900,
            "n": 0.24,
            "C": 0.032,
            "m": 0.91
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-747": {
      "id": "P-AS-747",
      "name": "AISI 4150 Q&T 55 HRC",
      "designation": {
            "aisi": "4150",
            "uns": "G41500",
            "din": "1.7220",
            "en": "50CrMo4"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Chromoly",
      "condition": "Q&T 55 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.85,
            "Cr": 1.0,
            "Mo": 0.2
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 500,
                  "rockwell_c": 55
            },
            "tensile_strength": {
                  "typical": 1725
            },
            "yield_strength": {
                  "typical": 1587
            },
            "elongation": {
                  "typical": 4
            }
      },
      "kienzle": {
            "kc1_1": 3285,
            "mc": 0.2
      },
      "taylor": {
            "C": 74,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 445,
            "B": 900,
            "n": 0.24,
            "C": 0.032,
            "m": 0.91
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "aerospace",
            "automotive",
            "structural",
            "hydraulic"
      ]
},
    "P-AS-748": {
      "id": "P-AS-748",
      "name": "AISI 4340 Annealed",
      "designation": {
            "aisi": "4340",
            "uns": "G43400",
            "din": "1.6582",
            "en": "34CrNiMo6"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Annealed",
      "composition": {
            "C": 0.4,
            "Mn": 0.7,
            "Cr": 0.8,
            "Mo": 0.25,
            "Ni": 1.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 217
            },
            "tensile_strength": {
                  "typical": 760
            },
            "yield_strength": {
                  "typical": 510
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 2000,
            "mc": 0.23
      },
      "taylor": {
            "C": 200,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 430,
            "B": 880,
            "n": 0.26,
            "C": 0.035,
            "m": 0.92
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-749": {
      "id": "P-AS-749",
      "name": "AISI 4340 Normalized",
      "designation": {
            "aisi": "4340",
            "uns": "G43400",
            "din": "1.6582",
            "en": "34CrNiMo6"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Normalized",
      "composition": {
            "C": 0.4,
            "Mn": 0.7,
            "Cr": 0.8,
            "Mo": 0.25,
            "Ni": 1.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 234
            },
            "tensile_strength": {
                  "typical": 820
            },
            "yield_strength": {
                  "typical": 535
            },
            "elongation": {
                  "typical": 22
            }
      },
      "kienzle": {
            "kc1_1": 2100,
            "mc": 0.23
      },
      "taylor": {
            "C": 190,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 430,
            "B": 880,
            "n": 0.26,
            "C": 0.035,
            "m": 0.92
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-750": {
      "id": "P-AS-750",
      "name": "AISI 4340 Q&T 28 HRC",
      "designation": {
            "aisi": "4340",
            "uns": "G43400",
            "din": "1.6582",
            "en": "34CrNiMo6"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Q&T 28 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.7,
            "Cr": 0.8,
            "Mo": 0.25,
            "Ni": 1.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 255,
                  "rockwell_c": 28
            },
            "tensile_strength": {
                  "typical": 879
            },
            "yield_strength": {
                  "typical": 808
            },
            "elongation": {
                  "typical": 13
            }
      },
      "kienzle": {
            "kc1_1": 2132,
            "mc": 0.23
      },
      "taylor": {
            "C": 166,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 430,
            "B": 880,
            "n": 0.26,
            "C": 0.035,
            "m": 0.92
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-751": {
      "id": "P-AS-751",
      "name": "AISI 4340 Q&T 30 HRC",
      "designation": {
            "aisi": "4340",
            "uns": "G43400",
            "din": "1.6582",
            "en": "34CrNiMo6"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Q&T 30 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.7,
            "Cr": 0.8,
            "Mo": 0.25,
            "Ni": 1.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 266,
                  "rockwell_c": 30
            },
            "tensile_strength": {
                  "typical": 917
            },
            "yield_strength": {
                  "typical": 843
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 2175,
            "mc": 0.22
      },
      "taylor": {
            "C": 158,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 430,
            "B": 880,
            "n": 0.26,
            "C": 0.035,
            "m": 0.92
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-752": {
      "id": "P-AS-752",
      "name": "AISI 4340 Q&T 32 HRC",
      "designation": {
            "aisi": "4340",
            "uns": "G43400",
            "din": "1.6582",
            "en": "34CrNiMo6"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Q&T 32 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.7,
            "Cr": 0.8,
            "Mo": 0.25,
            "Ni": 1.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 277,
                  "rockwell_c": 32
            },
            "tensile_strength": {
                  "typical": 955
            },
            "yield_strength": {
                  "typical": 878
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 2218,
            "mc": 0.22
      },
      "taylor": {
            "C": 151,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 430,
            "B": 880,
            "n": 0.26,
            "C": 0.035,
            "m": 0.92
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P25",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive to neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-753": {
      "id": "P-AS-753",
      "name": "AISI 4340 Q&T 35 HRC",
      "designation": {
            "aisi": "4340",
            "uns": "G43400",
            "din": "1.6582",
            "en": "34CrNiMo6"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Q&T 35 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.7,
            "Cr": 0.8,
            "Mo": 0.25,
            "Ni": 1.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 295,
                  "rockwell_c": 35
            },
            "tensile_strength": {
                  "typical": 1017
            },
            "yield_strength": {
                  "typical": 935
            },
            "elongation": {
                  "typical": 11
            }
      },
      "kienzle": {
            "kc1_1": 2292,
            "mc": 0.22
      },
      "taylor": {
            "C": 140,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 430,
            "B": 880,
            "n": 0.26,
            "C": 0.035,
            "m": 0.92
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-754": {
      "id": "P-AS-754",
      "name": "AISI 4340 Q&T 38 HRC",
      "designation": {
            "aisi": "4340",
            "uns": "G43400",
            "din": "1.6582",
            "en": "34CrNiMo6"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Q&T 38 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.7,
            "Cr": 0.8,
            "Mo": 0.25,
            "Ni": 1.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 316,
                  "rockwell_c": 38
            },
            "tensile_strength": {
                  "typical": 1090
            },
            "yield_strength": {
                  "typical": 1002
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 2379,
            "mc": 0.22
      },
      "taylor": {
            "C": 129,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 430,
            "B": 880,
            "n": 0.26,
            "C": 0.035,
            "m": 0.92
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-755": {
      "id": "P-AS-755",
      "name": "AISI 4340 Q&T 40 HRC",
      "designation": {
            "aisi": "4340",
            "uns": "G43400",
            "din": "1.6582",
            "en": "34CrNiMo6"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Q&T 40 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.7,
            "Cr": 0.8,
            "Mo": 0.25,
            "Ni": 1.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 332,
                  "rockwell_c": 40
            },
            "tensile_strength": {
                  "typical": 1145
            },
            "yield_strength": {
                  "typical": 1053
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 2447,
            "mc": 0.22
      },
      "taylor": {
            "C": 122,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 430,
            "B": 880,
            "n": 0.26,
            "C": 0.035,
            "m": 0.92
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-756": {
      "id": "P-AS-756",
      "name": "AISI 4340 Q&T 45 HRC",
      "designation": {
            "aisi": "4340",
            "uns": "G43400",
            "din": "1.6582",
            "en": "34CrNiMo6"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Q&T 45 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.7,
            "Cr": 0.8,
            "Mo": 0.25,
            "Ni": 1.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 377,
                  "rockwell_c": 45
            },
            "tensile_strength": {
                  "typical": 1300
            },
            "yield_strength": {
                  "typical": 1196
            },
            "elongation": {
                  "typical": 7
            }
      },
      "kienzle": {
            "kc1_1": 2643,
            "mc": 0.21
      },
      "taylor": {
            "C": 105,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 430,
            "B": 880,
            "n": 0.26,
            "C": 0.035,
            "m": 0.92
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-757": {
      "id": "P-AS-757",
      "name": "AISI 4340 Q&T 50 HRC",
      "designation": {
            "aisi": "4340",
            "uns": "G43400",
            "din": "1.6582",
            "en": "34CrNiMo6"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Q&T 50 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.7,
            "Cr": 0.8,
            "Mo": 0.25,
            "Ni": 1.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 433,
                  "rockwell_c": 50
            },
            "tensile_strength": {
                  "typical": 1493
            },
            "yield_strength": {
                  "typical": 1373
            },
            "elongation": {
                  "typical": 6
            }
      },
      "kienzle": {
            "kc1_1": 2895,
            "mc": 0.21
      },
      "taylor": {
            "C": 90,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 430,
            "B": 880,
            "n": 0.26,
            "C": 0.035,
            "m": 0.92
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-758": {
      "id": "P-AS-758",
      "name": "AISI 4340 Q&T 52 HRC",
      "designation": {
            "aisi": "4340",
            "uns": "G43400",
            "din": "1.6582",
            "en": "34CrNiMo6"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Q&T 52 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.7,
            "Cr": 0.8,
            "Mo": 0.25,
            "Ni": 1.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 458,
                  "rockwell_c": 52
            },
            "tensile_strength": {
                  "typical": 1580
            },
            "yield_strength": {
                  "typical": 1453
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 3010,
            "mc": 0.21
      },
      "taylor": {
            "C": 84,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 430,
            "B": 880,
            "n": 0.26,
            "C": 0.035,
            "m": 0.92
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-759": {
      "id": "P-AS-759",
      "name": "AISI 4340 Q&T 54 HRC",
      "designation": {
            "aisi": "4340",
            "uns": "G43400",
            "din": "1.6582",
            "en": "34CrNiMo6"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Q&T 54 HRC",
      "composition": {
            "C": 0.4,
            "Mn": 0.7,
            "Cr": 0.8,
            "Mo": 0.25,
            "Ni": 1.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 485,
                  "rockwell_c": 54
            },
            "tensile_strength": {
                  "typical": 1673
            },
            "yield_strength": {
                  "typical": 1539
            },
            "elongation": {
                  "typical": 4
            }
      },
      "kienzle": {
            "kc1_1": 3135,
            "mc": 0.21
      },
      "taylor": {
            "C": 79,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 430,
            "B": 880,
            "n": 0.26,
            "C": 0.035,
            "m": 0.92
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-760": {
      "id": "P-AS-760",
      "name": "300M Annealed",
      "designation": {
            "aisi": "300M",
            "uns": "K44220",
            "din": "",
            "en": ""
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Annealed",
      "composition": {
            "C": 0.42,
            "Mn": 0.75,
            "Cr": 0.8,
            "Mo": 0.4,
            "Ni": 1.8,
            "V": 0.08,
            "Si": 1.6
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 277
            },
            "tensile_strength": {
                  "typical": 965
            },
            "yield_strength": {
                  "typical": 690
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 2250,
            "mc": 0.22
      },
      "taylor": {
            "C": 160,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 520,
            "B": 980,
            "n": 0.22,
            "C": 0.028,
            "m": 0.88
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-761": {
      "id": "P-AS-761",
      "name": "300M Normalized",
      "designation": {
            "aisi": "300M",
            "uns": "K44220",
            "din": "",
            "en": ""
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Normalized",
      "composition": {
            "C": 0.42,
            "Mn": 0.75,
            "Cr": 0.8,
            "Mo": 0.4,
            "Ni": 1.8,
            "V": 0.08,
            "Si": 1.6
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 299
            },
            "tensile_strength": {
                  "typical": 1042
            },
            "yield_strength": {
                  "typical": 724
            },
            "elongation": {
                  "typical": 22
            }
      },
      "kienzle": {
            "kc1_1": 2362,
            "mc": 0.22
      },
      "taylor": {
            "C": 152,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 520,
            "B": 980,
            "n": 0.22,
            "C": 0.028,
            "m": 0.88
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-762": {
      "id": "P-AS-762",
      "name": "300M Q&T 45 HRC",
      "designation": {
            "aisi": "300M",
            "uns": "K44220",
            "din": "",
            "en": ""
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Q&T 45 HRC",
      "composition": {
            "C": 0.42,
            "Mn": 0.75,
            "Cr": 0.8,
            "Mo": 0.4,
            "Ni": 1.8,
            "V": 0.08,
            "Si": 1.6
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 377,
                  "rockwell_c": 45
            },
            "tensile_strength": {
                  "typical": 1300
            },
            "yield_strength": {
                  "typical": 1196
            },
            "elongation": {
                  "typical": 7
            }
      },
      "kienzle": {
            "kc1_1": 2580,
            "mc": 0.2
      },
      "taylor": {
            "C": 112,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 520,
            "B": 980,
            "n": 0.22,
            "C": 0.028,
            "m": 0.88
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-763": {
      "id": "P-AS-763",
      "name": "300M Q&T 48 HRC",
      "designation": {
            "aisi": "300M",
            "uns": "K44220",
            "din": "",
            "en": ""
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Q&T 48 HRC",
      "composition": {
            "C": 0.42,
            "Mn": 0.75,
            "Cr": 0.8,
            "Mo": 0.4,
            "Ni": 1.8,
            "V": 0.08,
            "Si": 1.6
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 409,
                  "rockwell_c": 48
            },
            "tensile_strength": {
                  "typical": 1411
            },
            "yield_strength": {
                  "typical": 1298
            },
            "elongation": {
                  "typical": 6
            }
      },
      "kienzle": {
            "kc1_1": 2698,
            "mc": 0.2
      },
      "taylor": {
            "C": 102,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 520,
            "B": 980,
            "n": 0.22,
            "C": 0.028,
            "m": 0.88
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-764": {
      "id": "P-AS-764",
      "name": "300M Q&T 50 HRC",
      "designation": {
            "aisi": "300M",
            "uns": "K44220",
            "din": "",
            "en": ""
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Q&T 50 HRC",
      "composition": {
            "C": 0.42,
            "Mn": 0.75,
            "Cr": 0.8,
            "Mo": 0.4,
            "Ni": 1.8,
            "V": 0.08,
            "Si": 1.6
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 433,
                  "rockwell_c": 50
            },
            "tensile_strength": {
                  "typical": 1493
            },
            "yield_strength": {
                  "typical": 1373
            },
            "elongation": {
                  "typical": 6
            }
      },
      "kienzle": {
            "kc1_1": 2788,
            "mc": 0.2
      },
      "taylor": {
            "C": 95,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 520,
            "B": 980,
            "n": 0.22,
            "C": 0.028,
            "m": 0.88
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-765": {
      "id": "P-AS-765",
      "name": "300M Q&T 52 HRC",
      "designation": {
            "aisi": "300M",
            "uns": "K44220",
            "din": "",
            "en": ""
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Q&T 52 HRC",
      "composition": {
            "C": 0.42,
            "Mn": 0.75,
            "Cr": 0.8,
            "Mo": 0.4,
            "Ni": 1.8,
            "V": 0.08,
            "Si": 1.6
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 458,
                  "rockwell_c": 52
            },
            "tensile_strength": {
                  "typical": 1580
            },
            "yield_strength": {
                  "typical": 1453
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 2884,
            "mc": 0.2
      },
      "taylor": {
            "C": 89,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 520,
            "B": 980,
            "n": 0.22,
            "C": 0.028,
            "m": 0.88
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-766": {
      "id": "P-AS-766",
      "name": "300M Q&T 54 HRC",
      "designation": {
            "aisi": "300M",
            "uns": "K44220",
            "din": "",
            "en": ""
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Q&T 54 HRC",
      "composition": {
            "C": 0.42,
            "Mn": 0.75,
            "Cr": 0.8,
            "Mo": 0.4,
            "Ni": 1.8,
            "V": 0.08,
            "Si": 1.6
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 485,
                  "rockwell_c": 54
            },
            "tensile_strength": {
                  "typical": 1673
            },
            "yield_strength": {
                  "typical": 1539
            },
            "elongation": {
                  "typical": 4
            }
      },
      "kienzle": {
            "kc1_1": 2988,
            "mc": 0.2
      },
      "taylor": {
            "C": 84,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 520,
            "B": 980,
            "n": 0.22,
            "C": 0.028,
            "m": 0.88
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-767": {
      "id": "P-AS-767",
      "name": "300M Q&T 56 HRC",
      "designation": {
            "aisi": "300M",
            "uns": "K44220",
            "din": "",
            "en": ""
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Q&T 56 HRC",
      "composition": {
            "C": 0.42,
            "Mn": 0.75,
            "Cr": 0.8,
            "Mo": 0.4,
            "Ni": 1.8,
            "V": 0.08,
            "Si": 1.6
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 515,
                  "rockwell_c": 56
            },
            "tensile_strength": {
                  "typical": 1776
            },
            "yield_strength": {
                  "typical": 1633
            },
            "elongation": {
                  "typical": 4
            }
      },
      "kienzle": {
            "kc1_1": 3106,
            "mc": 0.2
      },
      "taylor": {
            "C": 78,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 520,
            "B": 980,
            "n": 0.22,
            "C": 0.028,
            "m": 0.88
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-768": {
      "id": "P-AS-768",
      "name": "4330V (Hy-Tuf) Annealed",
      "designation": {
            "aisi": "4330V",
            "uns": "K23080",
            "din": "",
            "en": ""
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Annealed",
      "composition": {
            "C": 0.3,
            "Mn": 0.9,
            "Cr": 0.9,
            "Mo": 0.45,
            "Ni": 1.8,
            "V": 0.08
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 241
            },
            "tensile_strength": {
                  "typical": 840
            },
            "yield_strength": {
                  "typical": 585
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 2100,
            "mc": 0.23
      },
      "taylor": {
            "C": 180,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 470,
            "B": 920,
            "n": 0.24,
            "C": 0.032,
            "m": 0.9
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-769": {
      "id": "P-AS-769",
      "name": "4330V (Hy-Tuf) Normalized",
      "designation": {
            "aisi": "4330V",
            "uns": "K23080",
            "din": "",
            "en": ""
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Normalized",
      "composition": {
            "C": 0.3,
            "Mn": 0.9,
            "Cr": 0.9,
            "Mo": 0.45,
            "Ni": 1.8,
            "V": 0.08
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 260
            },
            "tensile_strength": {
                  "typical": 907
            },
            "yield_strength": {
                  "typical": 614
            },
            "elongation": {
                  "typical": 22
            }
      },
      "kienzle": {
            "kc1_1": 2205,
            "mc": 0.23
      },
      "taylor": {
            "C": 171,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 470,
            "B": 920,
            "n": 0.24,
            "C": 0.032,
            "m": 0.9
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-770": {
      "id": "P-AS-770",
      "name": "4330V (Hy-Tuf) Q&T 35 HRC",
      "designation": {
            "aisi": "4330V",
            "uns": "K23080",
            "din": "",
            "en": ""
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Q&T 35 HRC",
      "composition": {
            "C": 0.3,
            "Mn": 0.9,
            "Cr": 0.9,
            "Mo": 0.45,
            "Ni": 1.8,
            "V": 0.08
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 295,
                  "rockwell_c": 35
            },
            "tensile_strength": {
                  "typical": 1017
            },
            "yield_strength": {
                  "typical": 935
            },
            "elongation": {
                  "typical": 11
            }
      },
      "kienzle": {
            "kc1_1": 2282,
            "mc": 0.22
      },
      "taylor": {
            "C": 142,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 470,
            "B": 920,
            "n": 0.24,
            "C": 0.032,
            "m": 0.9
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-771": {
      "id": "P-AS-771",
      "name": "4330V (Hy-Tuf) Q&T 38 HRC",
      "designation": {
            "aisi": "4330V",
            "uns": "K23080",
            "din": "",
            "en": ""
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Q&T 38 HRC",
      "composition": {
            "C": 0.3,
            "Mn": 0.9,
            "Cr": 0.9,
            "Mo": 0.45,
            "Ni": 1.8,
            "V": 0.08
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 316,
                  "rockwell_c": 38
            },
            "tensile_strength": {
                  "typical": 1090
            },
            "yield_strength": {
                  "typical": 1002
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 2361,
            "mc": 0.22
      },
      "taylor": {
            "C": 131,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 470,
            "B": 920,
            "n": 0.24,
            "C": 0.032,
            "m": 0.9
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-772": {
      "id": "P-AS-772",
      "name": "4330V (Hy-Tuf) Q&T 40 HRC",
      "designation": {
            "aisi": "4330V",
            "uns": "K23080",
            "din": "",
            "en": ""
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Q&T 40 HRC",
      "composition": {
            "C": 0.3,
            "Mn": 0.9,
            "Cr": 0.9,
            "Mo": 0.45,
            "Ni": 1.8,
            "V": 0.08
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 332,
                  "rockwell_c": 40
            },
            "tensile_strength": {
                  "typical": 1145
            },
            "yield_strength": {
                  "typical": 1053
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 2423,
            "mc": 0.22
      },
      "taylor": {
            "C": 124,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 470,
            "B": 920,
            "n": 0.24,
            "C": 0.032,
            "m": 0.9
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-773": {
      "id": "P-AS-773",
      "name": "4330V (Hy-Tuf) Q&T 42 HRC",
      "designation": {
            "aisi": "4330V",
            "uns": "K23080",
            "din": "",
            "en": ""
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Q&T 42 HRC",
      "composition": {
            "C": 0.3,
            "Mn": 0.9,
            "Cr": 0.9,
            "Mo": 0.45,
            "Ni": 1.8,
            "V": 0.08
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 349,
                  "rockwell_c": 42
            },
            "tensile_strength": {
                  "typical": 1204
            },
            "yield_strength": {
                  "typical": 1107
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 2490,
            "mc": 0.22
      },
      "taylor": {
            "C": 117,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 470,
            "B": 920,
            "n": 0.24,
            "C": 0.032,
            "m": 0.9
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-774": {
      "id": "P-AS-774",
      "name": "4330V (Hy-Tuf) Q&T 45 HRC",
      "designation": {
            "aisi": "4330V",
            "uns": "K23080",
            "din": "",
            "en": ""
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Q&T 45 HRC",
      "composition": {
            "C": 0.3,
            "Mn": 0.9,
            "Cr": 0.9,
            "Mo": 0.45,
            "Ni": 1.8,
            "V": 0.08
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 377,
                  "rockwell_c": 45
            },
            "tensile_strength": {
                  "typical": 1300
            },
            "yield_strength": {
                  "typical": 1196
            },
            "elongation": {
                  "typical": 7
            }
      },
      "kienzle": {
            "kc1_1": 2603,
            "mc": 0.21
      },
      "taylor": {
            "C": 107,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 470,
            "B": 920,
            "n": 0.24,
            "C": 0.032,
            "m": 0.9
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-775": {
      "id": "P-AS-775",
      "name": "4330V (Hy-Tuf) Q&T 48 HRC",
      "designation": {
            "aisi": "4330V",
            "uns": "K23080",
            "din": "",
            "en": ""
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Q&T 48 HRC",
      "composition": {
            "C": 0.3,
            "Mn": 0.9,
            "Cr": 0.9,
            "Mo": 0.45,
            "Ni": 1.8,
            "V": 0.08
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 409,
                  "rockwell_c": 48
            },
            "tensile_strength": {
                  "typical": 1411
            },
            "yield_strength": {
                  "typical": 1298
            },
            "elongation": {
                  "typical": 6
            }
      },
      "kienzle": {
            "kc1_1": 2735,
            "mc": 0.21
      },
      "taylor": {
            "C": 97,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 470,
            "B": 920,
            "n": 0.24,
            "C": 0.032,
            "m": 0.9
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-776": {
      "id": "P-AS-776",
      "name": "4330V (Hy-Tuf) Q&T 50 HRC",
      "designation": {
            "aisi": "4330V",
            "uns": "K23080",
            "din": "",
            "en": ""
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - High Strength",
      "condition": "Q&T 50 HRC",
      "composition": {
            "C": 0.3,
            "Mn": 0.9,
            "Cr": 0.9,
            "Mo": 0.45,
            "Ni": 1.8,
            "V": 0.08
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 42.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 433,
                  "rockwell_c": 50
            },
            "tensile_strength": {
                  "typical": 1493
            },
            "yield_strength": {
                  "typical": 1373
            },
            "elongation": {
                  "typical": 6
            }
      },
      "kienzle": {
            "kc1_1": 2835,
            "mc": 0.21
      },
      "taylor": {
            "C": 91,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 470,
            "B": 920,
            "n": 0.24,
            "C": 0.032,
            "m": 0.9
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "defense",
            "landing_gear",
            "critical_components"
      ]
},
    "P-AS-777": {
      "id": "P-AS-777",
      "name": "AISI 4320 Annealed",
      "designation": {
            "aisi": "4320",
            "uns": "G43200",
            "din": "1.6587",
            "en": "18CrNiMo7-6"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Carburizing Grade",
      "condition": "Annealed",
      "composition": {
            "C": 0.2,
            "Mn": 0.55,
            "Cr": 0.5,
            "Mo": 0.25,
            "Ni": 1.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 44.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 163
            },
            "tensile_strength": {
                  "typical": 570
            },
            "yield_strength": {
                  "typical": 370
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 1750,
            "mc": 0.24
      },
      "taylor": {
            "C": 260,
            "n": 0.22
      },
      "johnson_cook": {
            "A": 330,
            "B": 720,
            "n": 0.32,
            "C": 0.042,
            "m": 0.95
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "gears",
            "shafts",
            "pinions",
            "case_hardened_parts"
      ],
      "notes": "Machine in annealed condition before carburizing"
},
    "P-AS-778": {
      "id": "P-AS-778",
      "name": "AISI 4320 Carburized 58 HRC Case",
      "designation": {
            "aisi": "4320",
            "uns": "G43200",
            "din": "1.6587",
            "en": "18CrNiMo7-6"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Carburizing Grade",
      "condition": "Carburized 58 HRC Case",
      "composition": {
            "C": 0.2,
            "Mn": 0.55,
            "Cr": 0.5,
            "Mo": 0.25,
            "Ni": 1.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 44.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 547,
                  "rockwell_c": 58,
                  "case_depth_mm": 0.8,
                  "core_hrc": 35
            },
            "tensile_strength": {
                  "typical": 1887
            },
            "yield_strength": {
                  "typical": 1603
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 3771,
            "mc": 0.21
      },
      "taylor": {
            "C": 64,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 330,
            "B": 720,
            "n": 0.32,
            "C": 0.042,
            "m": 0.95
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "gears",
            "shafts",
            "pinions",
            "bearings"
      ],
      "notes": "Hard grinding typically required. Case 58 HRC, Core ~35 HRC"
},
    "P-AS-779": {
      "id": "P-AS-779",
      "name": "AISI 4320 Carburized 60 HRC Case",
      "designation": {
            "aisi": "4320",
            "uns": "G43200",
            "din": "1.6587",
            "en": "18CrNiMo7-6"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Carburizing Grade",
      "condition": "Carburized 60 HRC Case",
      "composition": {
            "C": 0.2,
            "Mn": 0.55,
            "Cr": 0.5,
            "Mo": 0.25,
            "Ni": 1.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 44.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 582,
                  "rockwell_c": 60,
                  "case_depth_mm": 0.8,
                  "core_hrc": 35
            },
            "tensile_strength": {
                  "typical": 2007
            },
            "yield_strength": {
                  "typical": 1705
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 3850,
            "mc": 0.21
      },
      "taylor": {
            "C": 60,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 330,
            "B": 720,
            "n": 0.32,
            "C": 0.042,
            "m": 0.95
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "gears",
            "shafts",
            "pinions",
            "bearings"
      ],
      "notes": "Hard grinding typically required. Case 60 HRC, Core ~35 HRC"
},
    "P-AS-780": {
      "id": "P-AS-780",
      "name": "AISI 4320 Carburized 62 HRC Case",
      "designation": {
            "aisi": "4320",
            "uns": "G43200",
            "din": "1.6587",
            "en": "18CrNiMo7-6"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Carburizing Grade",
      "condition": "Carburized 62 HRC Case",
      "composition": {
            "C": 0.2,
            "Mn": 0.55,
            "Cr": 0.5,
            "Mo": 0.25,
            "Ni": 1.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 44.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 619,
                  "rockwell_c": 62,
                  "case_depth_mm": 0.8,
                  "core_hrc": 35
            },
            "tensile_strength": {
                  "typical": 2135
            },
            "yield_strength": {
                  "typical": 1814
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 3850,
            "mc": 0.21
      },
      "taylor": {
            "C": 56,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 330,
            "B": 720,
            "n": 0.32,
            "C": 0.042,
            "m": 0.95
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "gears",
            "shafts",
            "pinions",
            "bearings"
      ],
      "notes": "Hard grinding typically required. Case 62 HRC, Core ~35 HRC"
},
    "P-AS-781": {
      "id": "P-AS-781",
      "name": "AISI 8620 Annealed",
      "designation": {
            "aisi": "8620",
            "uns": "G86200",
            "din": "1.6523",
            "en": "21NiCrMo2"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Carburizing Grade",
      "condition": "Annealed",
      "composition": {
            "C": 0.2,
            "Mn": 0.8,
            "Cr": 0.5,
            "Mo": 0.2,
            "Ni": 0.55
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 44.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 149
            },
            "tensile_strength": {
                  "typical": 530
            },
            "yield_strength": {
                  "typical": 340
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 1700,
            "mc": 0.24
      },
      "taylor": {
            "C": 270,
            "n": 0.23
      },
      "johnson_cook": {
            "A": 310,
            "B": 690,
            "n": 0.34,
            "C": 0.045,
            "m": 0.96
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "gears",
            "shafts",
            "pinions",
            "case_hardened_parts"
      ],
      "notes": "Machine in annealed condition before carburizing"
},
    "P-AS-782": {
      "id": "P-AS-782",
      "name": "AISI 8620 Carburized 58 HRC Case",
      "designation": {
            "aisi": "8620",
            "uns": "G86200",
            "din": "1.6523",
            "en": "21NiCrMo2"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Carburizing Grade",
      "condition": "Carburized 58 HRC Case",
      "composition": {
            "C": 0.2,
            "Mn": 0.8,
            "Cr": 0.5,
            "Mo": 0.2,
            "Ni": 0.55
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 44.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 547,
                  "rockwell_c": 58,
                  "case_depth_mm": 0.8,
                  "core_hrc": 35
            },
            "tensile_strength": {
                  "typical": 1887
            },
            "yield_strength": {
                  "typical": 1603
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 3740,
            "mc": 0.21
      },
      "taylor": {
            "C": 60,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 310,
            "B": 690,
            "n": 0.34,
            "C": 0.045,
            "m": 0.96
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "gears",
            "shafts",
            "pinions",
            "bearings"
      ],
      "notes": "Hard grinding typically required. Case 58 HRC, Core ~35 HRC"
},
    "P-AS-783": {
      "id": "P-AS-783",
      "name": "AISI 8620 Carburized 60 HRC Case",
      "designation": {
            "aisi": "8620",
            "uns": "G86200",
            "din": "1.6523",
            "en": "21NiCrMo2"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Carburizing Grade",
      "condition": "Carburized 60 HRC Case",
      "composition": {
            "C": 0.2,
            "Mn": 0.8,
            "Cr": 0.5,
            "Mo": 0.2,
            "Ni": 0.55
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 44.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 582,
                  "rockwell_c": 60,
                  "case_depth_mm": 0.8,
                  "core_hrc": 35
            },
            "tensile_strength": {
                  "typical": 2007
            },
            "yield_strength": {
                  "typical": 1705
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 3740,
            "mc": 0.21
      },
      "taylor": {
            "C": 56,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 310,
            "B": 690,
            "n": 0.34,
            "C": 0.045,
            "m": 0.96
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "gears",
            "shafts",
            "pinions",
            "bearings"
      ],
      "notes": "Hard grinding typically required. Case 60 HRC, Core ~35 HRC"
},
    "P-AS-784": {
      "id": "P-AS-784",
      "name": "AISI 8620 Carburized 62 HRC Case",
      "designation": {
            "aisi": "8620",
            "uns": "G86200",
            "din": "1.6523",
            "en": "21NiCrMo2"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Carburizing Grade",
      "condition": "Carburized 62 HRC Case",
      "composition": {
            "C": 0.2,
            "Mn": 0.8,
            "Cr": 0.5,
            "Mo": 0.2,
            "Ni": 0.55
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 44.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 619,
                  "rockwell_c": 62,
                  "case_depth_mm": 0.8,
                  "core_hrc": 35
            },
            "tensile_strength": {
                  "typical": 2135
            },
            "yield_strength": {
                  "typical": 1814
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 3740,
            "mc": 0.21
      },
      "taylor": {
            "C": 52,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 310,
            "B": 690,
            "n": 0.34,
            "C": 0.045,
            "m": 0.96
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "gears",
            "shafts",
            "pinions",
            "bearings"
      ],
      "notes": "Hard grinding typically required. Case 62 HRC, Core ~35 HRC"
},
    "P-AS-785": {
      "id": "P-AS-785",
      "name": "AISI 8622 Annealed",
      "designation": {
            "aisi": "8622",
            "uns": "G86220",
            "din": "1.6541",
            "en": "23MnNiCrMo5-2"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Carburizing Grade",
      "condition": "Annealed",
      "composition": {
            "C": 0.22,
            "Mn": 0.85,
            "Cr": 0.5,
            "Mo": 0.2,
            "Ni": 0.55
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 44.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 156
            },
            "tensile_strength": {
                  "typical": 550
            },
            "yield_strength": {
                  "typical": 355
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 1720,
            "mc": 0.24
      },
      "taylor": {
            "C": 265,
            "n": 0.22
      },
      "johnson_cook": {
            "A": 320,
            "B": 705,
            "n": 0.33,
            "C": 0.044,
            "m": 0.96
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "gears",
            "shafts",
            "pinions",
            "case_hardened_parts"
      ],
      "notes": "Machine in annealed condition before carburizing"
},
    "P-AS-786": {
      "id": "P-AS-786",
      "name": "AISI 8622 Carburized 58 HRC Case",
      "designation": {
            "aisi": "8622",
            "uns": "G86220",
            "din": "1.6541",
            "en": "23MnNiCrMo5-2"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Carburizing Grade",
      "condition": "Carburized 58 HRC Case",
      "composition": {
            "C": 0.22,
            "Mn": 0.85,
            "Cr": 0.5,
            "Mo": 0.2,
            "Ni": 0.55
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 44.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 547,
                  "rockwell_c": 58,
                  "case_depth_mm": 0.8,
                  "core_hrc": 35
            },
            "tensile_strength": {
                  "typical": 1887
            },
            "yield_strength": {
                  "typical": 1603
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 3784,
            "mc": 0.21
      },
      "taylor": {
            "C": 62,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 320,
            "B": 705,
            "n": 0.33,
            "C": 0.044,
            "m": 0.96
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "gears",
            "shafts",
            "pinions",
            "bearings"
      ],
      "notes": "Hard grinding typically required. Case 58 HRC, Core ~35 HRC"
},
    "P-AS-787": {
      "id": "P-AS-787",
      "name": "AISI 8622 Carburized 60 HRC Case",
      "designation": {
            "aisi": "8622",
            "uns": "G86220",
            "din": "1.6541",
            "en": "23MnNiCrMo5-2"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Carburizing Grade",
      "condition": "Carburized 60 HRC Case",
      "composition": {
            "C": 0.22,
            "Mn": 0.85,
            "Cr": 0.5,
            "Mo": 0.2,
            "Ni": 0.55
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 44.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 582,
                  "rockwell_c": 60,
                  "case_depth_mm": 0.8,
                  "core_hrc": 35
            },
            "tensile_strength": {
                  "typical": 2007
            },
            "yield_strength": {
                  "typical": 1705
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 3784,
            "mc": 0.21
      },
      "taylor": {
            "C": 58,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 320,
            "B": 705,
            "n": 0.33,
            "C": 0.044,
            "m": 0.96
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "gears",
            "shafts",
            "pinions",
            "bearings"
      ],
      "notes": "Hard grinding typically required. Case 60 HRC, Core ~35 HRC"
},
    "P-AS-788": {
      "id": "P-AS-788",
      "name": "AISI 8622 Carburized 62 HRC Case",
      "designation": {
            "aisi": "8622",
            "uns": "G86220",
            "din": "1.6541",
            "en": "23MnNiCrMo5-2"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Carburizing Grade",
      "condition": "Carburized 62 HRC Case",
      "composition": {
            "C": 0.22,
            "Mn": 0.85,
            "Cr": 0.5,
            "Mo": 0.2,
            "Ni": 0.55
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 44.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 619,
                  "rockwell_c": 62,
                  "case_depth_mm": 0.8,
                  "core_hrc": 35
            },
            "tensile_strength": {
                  "typical": 2135
            },
            "yield_strength": {
                  "typical": 1814
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 3784,
            "mc": 0.21
      },
      "taylor": {
            "C": 54,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 320,
            "B": 705,
            "n": 0.33,
            "C": 0.044,
            "m": 0.96
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "gears",
            "shafts",
            "pinions",
            "bearings"
      ],
      "notes": "Hard grinding typically required. Case 62 HRC, Core ~35 HRC"
},
    "P-AS-789": {
      "id": "P-AS-789",
      "name": "AISI 9310 Annealed",
      "designation": {
            "aisi": "9310",
            "uns": "G93106",
            "din": "1.6657",
            "en": "14NiCrMo13-4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Carburizing Grade",
      "condition": "Annealed",
      "composition": {
            "C": 0.1,
            "Mn": 0.55,
            "Cr": 1.2,
            "Mo": 0.1,
            "Ni": 3.25
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 44.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 170
            },
            "tensile_strength": {
                  "typical": 600
            },
            "yield_strength": {
                  "typical": 400
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 1800,
            "mc": 0.24
      },
      "taylor": {
            "C": 250,
            "n": 0.21
      },
      "johnson_cook": {
            "A": 350,
            "B": 750,
            "n": 0.3,
            "C": 0.04,
            "m": 0.94
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "gears",
            "shafts",
            "pinions",
            "case_hardened_parts"
      ],
      "notes": "Machine in annealed condition before carburizing"
},
    "P-AS-790": {
      "id": "P-AS-790",
      "name": "AISI 9310 Carburized 58 HRC Case",
      "designation": {
            "aisi": "9310",
            "uns": "G93106",
            "din": "1.6657",
            "en": "14NiCrMo13-4"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Carburizing Grade",
      "condition": "Carburized 58 HRC Case",
      "composition": {
            "C": 0.1,
            "Mn": 0.55,
            "Cr": 1.2,
            "Mo": 0.1,
            "Ni": 3.25
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 44.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 547,
                  "rockwell_c": 58,
                  "case_depth_mm": 0.8,
                  "core_hrc": 35
            },
            "tensile_strength": {
                  "typical": 1887
            },
            "yield_strength": {
                  "typical": 1603
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 3745,
            "mc": 0.21
      },
      "taylor": {
            "C": 65,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 350,
            "B": 750,
            "n": 0.3,
            "C": 0.04,
            "m": 0.94
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "gears",
            "shafts",
            "pinions",
            "bearings"
      ],
      "notes": "Hard grinding typically required. Case 58 HRC, Core ~35 HRC"
},
    "P-AS-791": {
      "id": "P-AS-791",
      "name": "AISI 9310 Carburized 60 HRC Case",
      "designation": {
            "aisi": "9310",
            "uns": "G93106",
            "din": "1.6657",
            "en": "14NiCrMo13-4"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Carburizing Grade",
      "condition": "Carburized 60 HRC Case",
      "composition": {
            "C": 0.1,
            "Mn": 0.55,
            "Cr": 1.2,
            "Mo": 0.1,
            "Ni": 3.25
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 44.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 582,
                  "rockwell_c": 60,
                  "case_depth_mm": 0.8,
                  "core_hrc": 35
            },
            "tensile_strength": {
                  "typical": 2007
            },
            "yield_strength": {
                  "typical": 1705
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 3944,
            "mc": 0.21
      },
      "taylor": {
            "C": 60,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 350,
            "B": 750,
            "n": 0.3,
            "C": 0.04,
            "m": 0.94
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "gears",
            "shafts",
            "pinions",
            "bearings"
      ],
      "notes": "Hard grinding typically required. Case 60 HRC, Core ~35 HRC"
},
    "P-AS-792": {
      "id": "P-AS-792",
      "name": "AISI 9310 Carburized 62 HRC Case",
      "designation": {
            "aisi": "9310",
            "uns": "G93106",
            "din": "1.6657",
            "en": "14NiCrMo13-4"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Carburizing Grade",
      "condition": "Carburized 62 HRC Case",
      "composition": {
            "C": 0.1,
            "Mn": 0.55,
            "Cr": 1.2,
            "Mo": 0.1,
            "Ni": 3.25
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 44.0,
            "elastic_modulus": 205000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 619,
                  "rockwell_c": 62,
                  "case_depth_mm": 0.8,
                  "core_hrc": 35
            },
            "tensile_strength": {
                  "typical": 2135
            },
            "yield_strength": {
                  "typical": 1814
            },
            "elongation": {
                  "typical": 8
            }
      },
      "kienzle": {
            "kc1_1": 3960,
            "mc": 0.21
      },
      "taylor": {
            "C": 56,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 350,
            "B": 750,
            "n": 0.3,
            "C": 0.04,
            "m": 0.94
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "gears",
            "shafts",
            "pinions",
            "bearings"
      ],
      "notes": "Hard grinding typically required. Case 62 HRC, Core ~35 HRC"
},
    "P-AS-793": {
      "id": "P-AS-793",
      "name": "AISI 52100 Spheroidize Annealed",
      "designation": {
            "aisi": "52100",
            "uns": "G52986",
            "din": "1.3505",
            "en": "100Cr6"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Bearing/Spring",
      "condition": "Spheroidize Annealed",
      "composition": {
            "C": 1.0,
            "Mn": 0.35,
            "Cr": 1.45
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 46.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 186
            },
            "tensile_strength": {
                  "typical": 612
            },
            "yield_strength": {
                  "typical": 352
            },
            "elongation": {
                  "typical": 35
            }
      },
      "kienzle": {
            "kc1_1": 2070,
            "mc": 0.22
      },
      "taylor": {
            "C": 165,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 500,
            "B": 980,
            "n": 0.2,
            "C": 0.028,
            "m": 0.88
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P20-P30",
            "coating": [
                  "TiCN",
                  "TiAlN"
            ],
            "geometry": "Positive rake",
            "coolant": "Flood recommended"
      },
      "applications": [
            "bearings",
            "springs",
            "races",
            "rollers"
      ]
},
    "P-AS-794": {
      "id": "P-AS-794",
      "name": "AISI 52100 Hardened 58 HRC",
      "designation": {
            "aisi": "52100",
            "uns": "G52986",
            "din": "1.3505",
            "en": "100Cr6"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Bearing/Spring",
      "condition": "Hardened 58 HRC",
      "composition": {
            "C": 1.0,
            "Mn": 0.35,
            "Cr": 1.45
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 46.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 547,
                  "rockwell_c": 58
            },
            "tensile_strength": {
                  "typical": 1887
            },
            "yield_strength": {
                  "typical": 1698
            },
            "elongation": {
                  "typical": 4
            }
      },
      "kienzle": {
            "kc1_1": 4086,
            "mc": 0.2
      },
      "taylor": {
            "C": 49,
            "n": 0.13
      },
      "johnson_cook": {
            "A": 500,
            "B": 980,
            "n": 0.2,
            "C": 0.028,
            "m": 0.88
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "bearings",
            "springs",
            "races",
            "rollers"
      ]
},
    "P-AS-795": {
      "id": "P-AS-795",
      "name": "AISI 52100 Hardened 60 HRC",
      "designation": {
            "aisi": "52100",
            "uns": "G52986",
            "din": "1.3505",
            "en": "100Cr6"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Bearing/Spring",
      "condition": "Hardened 60 HRC",
      "composition": {
            "C": 1.0,
            "Mn": 0.35,
            "Cr": 1.45
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 46.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 582,
                  "rockwell_c": 60
            },
            "tensile_strength": {
                  "typical": 2007
            },
            "yield_strength": {
                  "typical": 1806
            },
            "elongation": {
                  "typical": 3
            }
      },
      "kienzle": {
            "kc1_1": 4289,
            "mc": 0.19
      },
      "taylor": {
            "C": 45,
            "n": 0.13
      },
      "johnson_cook": {
            "A": 500,
            "B": 980,
            "n": 0.2,
            "C": 0.028,
            "m": 0.88
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "bearings",
            "springs",
            "races",
            "rollers"
      ]
},
    "P-AS-796": {
      "id": "P-AS-796",
      "name": "AISI 52100 Hardened 62 HRC",
      "designation": {
            "aisi": "52100",
            "uns": "G52986",
            "din": "1.3505",
            "en": "100Cr6"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Bearing/Spring",
      "condition": "Hardened 62 HRC",
      "composition": {
            "C": 1.0,
            "Mn": 0.35,
            "Cr": 1.45
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 46.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 619,
                  "rockwell_c": 62
            },
            "tensile_strength": {
                  "typical": 2135
            },
            "yield_strength": {
                  "typical": 1921
            },
            "elongation": {
                  "typical": 3
            }
      },
      "kienzle": {
            "kc1_1": 4506,
            "mc": 0.19
      },
      "taylor": {
            "C": 42,
            "n": 0.13
      },
      "johnson_cook": {
            "A": 500,
            "B": 980,
            "n": 0.2,
            "C": 0.028,
            "m": 0.88
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "bearings",
            "springs",
            "races",
            "rollers"
      ]
},
    "P-AS-797": {
      "id": "P-AS-797",
      "name": "AISI 52100 Hardened 64 HRC",
      "designation": {
            "aisi": "52100",
            "uns": "G52986",
            "din": "1.3505",
            "en": "100Cr6"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Bearing/Spring",
      "condition": "Hardened 64 HRC",
      "composition": {
            "C": 1.0,
            "Mn": 0.35,
            "Cr": 1.45
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 46.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 659,
                  "rockwell_c": 64
            },
            "tensile_strength": {
                  "typical": 2273
            },
            "yield_strength": {
                  "typical": 2045
            },
            "elongation": {
                  "typical": 3
            }
      },
      "kienzle": {
            "kc1_1": 4743,
            "mc": 0.19
      },
      "taylor": {
            "C": 39,
            "n": 0.13
      },
      "johnson_cook": {
            "A": 500,
            "B": 980,
            "n": 0.2,
            "C": 0.028,
            "m": 0.88
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "bearings",
            "springs",
            "races",
            "rollers"
      ]
},
    "P-AS-798": {
      "id": "P-AS-798",
      "name": "AISI 5160 Annealed",
      "designation": {
            "aisi": "5160",
            "uns": "G51600",
            "din": "1.7176",
            "en": "55Cr3"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Bearing/Spring",
      "condition": "Annealed",
      "composition": {
            "C": 0.6,
            "Mn": 0.85,
            "Cr": 0.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 46.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 197
            },
            "tensile_strength": {
                  "typical": 690
            },
            "yield_strength": {
                  "typical": 415
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 2100,
            "mc": 0.23
      },
      "taylor": {
            "C": 180,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 440,
            "B": 890,
            "n": 0.24,
            "C": 0.033,
            "m": 0.91
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "bearings",
            "springs",
            "races",
            "rollers"
      ]
},
    "P-AS-799": {
      "id": "P-AS-799",
      "name": "AISI 5160 Hardened 42 HRC",
      "designation": {
            "aisi": "5160",
            "uns": "G51600",
            "din": "1.7176",
            "en": "55Cr3"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Bearing/Spring",
      "condition": "Hardened 42 HRC",
      "composition": {
            "C": 0.6,
            "Mn": 0.85,
            "Cr": 0.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 46.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 349,
                  "rockwell_c": 42
            },
            "tensile_strength": {
                  "typical": 1204
            },
            "yield_strength": {
                  "typical": 1083
            },
            "elongation": {
                  "typical": 7
            }
      },
      "kienzle": {
            "kc1_1": 2810,
            "mc": 0.22
      },
      "taylor": {
            "C": 93,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 440,
            "B": 890,
            "n": 0.24,
            "C": 0.033,
            "m": 0.91
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "bearings",
            "springs",
            "races",
            "rollers"
      ]
},
    "P-AS-800": {
      "id": "P-AS-800",
      "name": "AISI 5160 Hardened 45 HRC",
      "designation": {
            "aisi": "5160",
            "uns": "G51600",
            "din": "1.7176",
            "en": "55Cr3"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Bearing/Spring",
      "condition": "Hardened 45 HRC",
      "composition": {
            "C": 0.6,
            "Mn": 0.85,
            "Cr": 0.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 46.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 377,
                  "rockwell_c": 45
            },
            "tensile_strength": {
                  "typical": 1300
            },
            "yield_strength": {
                  "typical": 1170
            },
            "elongation": {
                  "typical": 6
            }
      },
      "kienzle": {
            "kc1_1": 2955,
            "mc": 0.21
      },
      "taylor": {
            "C": 85,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 440,
            "B": 890,
            "n": 0.24,
            "C": 0.033,
            "m": 0.91
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "bearings",
            "springs",
            "races",
            "rollers"
      ]
},
    "P-AS-801": {
      "id": "P-AS-801",
      "name": "AISI 5160 Hardened 48 HRC",
      "designation": {
            "aisi": "5160",
            "uns": "G51600",
            "din": "1.7176",
            "en": "55Cr3"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Bearing/Spring",
      "condition": "Hardened 48 HRC",
      "composition": {
            "C": 0.6,
            "Mn": 0.85,
            "Cr": 0.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 46.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 409,
                  "rockwell_c": 48
            },
            "tensile_strength": {
                  "typical": 1411
            },
            "yield_strength": {
                  "typical": 1269
            },
            "elongation": {
                  "typical": 6
            }
      },
      "kienzle": {
            "kc1_1": 3124,
            "mc": 0.21
      },
      "taylor": {
            "C": 77,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 440,
            "B": 890,
            "n": 0.24,
            "C": 0.033,
            "m": 0.91
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "bearings",
            "springs",
            "races",
            "rollers"
      ]
},
    "P-AS-802": {
      "id": "P-AS-802",
      "name": "AISI 5160 Hardened 50 HRC",
      "designation": {
            "aisi": "5160",
            "uns": "G51600",
            "din": "1.7176",
            "en": "55Cr3"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Bearing/Spring",
      "condition": "Hardened 50 HRC",
      "composition": {
            "C": 0.6,
            "Mn": 0.85,
            "Cr": 0.8
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 46.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 433,
                  "rockwell_c": 50
            },
            "tensile_strength": {
                  "typical": 1493
            },
            "yield_strength": {
                  "typical": 1343
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 3252,
            "mc": 0.21
      },
      "taylor": {
            "C": 72,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 440,
            "B": 890,
            "n": 0.24,
            "C": 0.033,
            "m": 0.91
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "bearings",
            "springs",
            "races",
            "rollers"
      ]
},
    "P-AS-803": {
      "id": "P-AS-803",
      "name": "AISI 6150 Annealed",
      "designation": {
            "aisi": "6150",
            "uns": "G61500",
            "din": "1.8159",
            "en": "50CrV4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Bearing/Spring",
      "condition": "Annealed",
      "composition": {
            "C": 0.5,
            "Mn": 0.8,
            "Cr": 0.95,
            "V": 0.15
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 46.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 197
            },
            "tensile_strength": {
                  "typical": 690
            },
            "yield_strength": {
                  "typical": 415
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 2100,
            "mc": 0.23
      },
      "taylor": {
            "C": 180,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 445,
            "B": 895,
            "n": 0.23,
            "C": 0.032,
            "m": 0.9
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "bearings",
            "springs",
            "races",
            "rollers"
      ]
},
    "P-AS-804": {
      "id": "P-AS-804",
      "name": "AISI 6150 Hardened 42 HRC",
      "designation": {
            "aisi": "6150",
            "uns": "G61500",
            "din": "1.8159",
            "en": "50CrV4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Bearing/Spring",
      "condition": "Hardened 42 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.8,
            "Cr": 0.95,
            "V": 0.15
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 46.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 349,
                  "rockwell_c": 42
            },
            "tensile_strength": {
                  "typical": 1204
            },
            "yield_strength": {
                  "typical": 1083
            },
            "elongation": {
                  "typical": 7
            }
      },
      "kienzle": {
            "kc1_1": 2810,
            "mc": 0.22
      },
      "taylor": {
            "C": 93,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 445,
            "B": 895,
            "n": 0.23,
            "C": 0.032,
            "m": 0.9
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P05-P15 or K10",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake, honed edge",
            "coolant": "MQL or dry"
      },
      "applications": [
            "bearings",
            "springs",
            "races",
            "rollers"
      ]
},
    "P-AS-805": {
      "id": "P-AS-805",
      "name": "AISI 6150 Hardened 45 HRC",
      "designation": {
            "aisi": "6150",
            "uns": "G61500",
            "din": "1.8159",
            "en": "50CrV4"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Bearing/Spring",
      "condition": "Hardened 45 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.8,
            "Cr": 0.95,
            "V": 0.15
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 46.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 377,
                  "rockwell_c": 45
            },
            "tensile_strength": {
                  "typical": 1300
            },
            "yield_strength": {
                  "typical": 1170
            },
            "elongation": {
                  "typical": 6
            }
      },
      "kienzle": {
            "kc1_1": 2955,
            "mc": 0.21
      },
      "taylor": {
            "C": 85,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 445,
            "B": 895,
            "n": 0.23,
            "C": 0.032,
            "m": 0.9
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "bearings",
            "springs",
            "races",
            "rollers"
      ]
},
    "P-AS-806": {
      "id": "P-AS-806",
      "name": "AISI 6150 Hardened 48 HRC",
      "designation": {
            "aisi": "6150",
            "uns": "G61500",
            "din": "1.8159",
            "en": "50CrV4"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Bearing/Spring",
      "condition": "Hardened 48 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.8,
            "Cr": 0.95,
            "V": 0.15
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 46.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 409,
                  "rockwell_c": 48
            },
            "tensile_strength": {
                  "typical": 1411
            },
            "yield_strength": {
                  "typical": 1269
            },
            "elongation": {
                  "typical": 6
            }
      },
      "kienzle": {
            "kc1_1": 3124,
            "mc": 0.21
      },
      "taylor": {
            "C": 77,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 445,
            "B": 895,
            "n": 0.23,
            "C": 0.032,
            "m": 0.9
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "bearings",
            "springs",
            "races",
            "rollers"
      ]
},
    "P-AS-807": {
      "id": "P-AS-807",
      "name": "AISI 6150 Hardened 50 HRC",
      "designation": {
            "aisi": "6150",
            "uns": "G61500",
            "din": "1.8159",
            "en": "50CrV4"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Bearing/Spring",
      "condition": "Hardened 50 HRC",
      "composition": {
            "C": 0.5,
            "Mn": 0.8,
            "Cr": 0.95,
            "V": 0.15
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 46.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 433,
                  "rockwell_c": 50
            },
            "tensile_strength": {
                  "typical": 1493
            },
            "yield_strength": {
                  "typical": 1343
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 3252,
            "mc": 0.21
      },
      "taylor": {
            "C": 72,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 445,
            "B": 895,
            "n": 0.23,
            "C": 0.032,
            "m": 0.9
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "bearings",
            "springs",
            "races",
            "rollers"
      ]
},
    "P-AS-808": {
      "id": "P-AS-808",
      "name": "AISI 9260 Annealed",
      "designation": {
            "aisi": "9260",
            "uns": "G92600",
            "din": "1.0904",
            "en": "61SiCr7"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Bearing/Spring",
      "condition": "Annealed",
      "composition": {
            "C": 0.6,
            "Mn": 0.85,
            "Si": 2.0
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 46.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 201
            },
            "tensile_strength": {
                  "typical": 700
            },
            "yield_strength": {
                  "typical": 420
            },
            "elongation": {
                  "typical": 30
            }
      },
      "kienzle": {
            "kc1_1": 2150,
            "mc": 0.22
      },
      "taylor": {
            "C": 170,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 455,
            "B": 910,
            "n": 0.22,
            "C": 0.031,
            "m": 0.89
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P15-P30",
            "coating": [
                  "TiCN",
                  "TiAlN",
                  "Al2O3 MT-CVD"
            ],
            "geometry": "Positive rake 6-12\u00b0",
            "coolant": "Flood recommended"
      },
      "applications": [
            "bearings",
            "springs",
            "races",
            "rollers"
      ]
},
    "P-AS-809": {
      "id": "P-AS-809",
      "name": "AISI 9260 Hardened 45 HRC",
      "designation": {
            "aisi": "9260",
            "uns": "G92600",
            "din": "1.0904",
            "en": "61SiCr7"
      },
      "iso_group": "P",
      "material_class": "Alloy Steel - Bearing/Spring",
      "condition": "Hardened 45 HRC",
      "composition": {
            "C": 0.6,
            "Mn": 0.85,
            "Si": 2.0
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 46.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 377,
                  "rockwell_c": 45
            },
            "tensile_strength": {
                  "typical": 1300
            },
            "yield_strength": {
                  "typical": 1170
            },
            "elongation": {
                  "typical": 6
            }
      },
      "kienzle": {
            "kc1_1": 2985,
            "mc": 0.2
      },
      "taylor": {
            "C": 82,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 455,
            "B": 910,
            "n": 0.22,
            "C": 0.031,
            "m": 0.89
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "bearings",
            "springs",
            "races",
            "rollers"
      ]
},
    "P-AS-810": {
      "id": "P-AS-810",
      "name": "AISI 9260 Hardened 48 HRC",
      "designation": {
            "aisi": "9260",
            "uns": "G92600",
            "din": "1.0904",
            "en": "61SiCr7"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Bearing/Spring",
      "condition": "Hardened 48 HRC",
      "composition": {
            "C": 0.6,
            "Mn": 0.85,
            "Si": 2.0
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 46.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 409,
                  "rockwell_c": 48
            },
            "tensile_strength": {
                  "typical": 1411
            },
            "yield_strength": {
                  "typical": 1269
            },
            "elongation": {
                  "typical": 6
            }
      },
      "kienzle": {
            "kc1_1": 3154,
            "mc": 0.2
      },
      "taylor": {
            "C": 75,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 455,
            "B": 910,
            "n": 0.22,
            "C": 0.031,
            "m": 0.89
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "bearings",
            "springs",
            "races",
            "rollers"
      ]
},
    "P-AS-811": {
      "id": "P-AS-811",
      "name": "AISI 9260 Hardened 50 HRC",
      "designation": {
            "aisi": "9260",
            "uns": "G92600",
            "din": "1.0904",
            "en": "61SiCr7"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Bearing/Spring",
      "condition": "Hardened 50 HRC",
      "composition": {
            "C": 0.6,
            "Mn": 0.85,
            "Si": 2.0
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 46.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 433,
                  "rockwell_c": 50
            },
            "tensile_strength": {
                  "typical": 1493
            },
            "yield_strength": {
                  "typical": 1343
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 3282,
            "mc": 0.2
      },
      "taylor": {
            "C": 70,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 455,
            "B": 910,
            "n": 0.22,
            "C": 0.031,
            "m": 0.89
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "Mixed Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake 5-7\u00b0, T-land",
            "coolant": "Dry preferred"
      },
      "applications": [
            "bearings",
            "springs",
            "races",
            "rollers"
      ]
},
    "P-AS-812": {
      "id": "P-AS-812",
      "name": "AISI 9260 Hardened 52 HRC",
      "designation": {
            "aisi": "9260",
            "uns": "G92600",
            "din": "1.0904",
            "en": "61SiCr7"
      },
      "iso_group": "H",
      "material_class": "Alloy Steel - Bearing/Spring",
      "condition": "Hardened 52 HRC",
      "composition": {
            "C": 0.6,
            "Mn": 0.85,
            "Si": 2.0
      },
      "physical": {
            "density": 7850,
            "thermal_conductivity": 46.0,
            "elastic_modulus": 210000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 458,
                  "rockwell_c": 52
            },
            "tensile_strength": {
                  "typical": 1580
            },
            "yield_strength": {
                  "typical": 1422
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 3417,
            "mc": 0.2
      },
      "taylor": {
            "C": 65,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 455,
            "B": 910,
            "n": 0.22,
            "C": 0.031,
            "m": 0.89
      },
      "tooling": {
            "primary": "CBN",
            "insert_grade": "CBN Grade 1",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, heavy T-land",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "bearings",
            "springs",
            "races",
            "rollers"
      ]
}
  }
};

if (typeof module !== 'undefined' && 
// ============================================================================
// ENHANCED SECTIONS - Auto-generated 2026-01-25 01:34
// Category: P_STEELS | Materials: 262 | Sections added: 5
// ADD THESE TO EACH MATERIAL:
// ============================================================================
/*
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed", "Estimated"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
*/

module.exports) {
  
// ============================================================================
// ENHANCED SECTIONS - Auto-generated 2026-01-25 01:34
// Category: P_STEELS | Materials: 262 | Sections added: 5
// ADD THESE TO EACH MATERIAL:
// ============================================================================
/*
      chipFormation: {
        chipType: { primary: "CONTINUOUS", secondary: "varies with parameters" },
        shearAngle: { value: 26, unit: "degrees", range: { min: 21, max: 32 } },
        chipCompressionRatio: { value: 2.0, range: { min: 1.5, max: 3.5 } },
        segmentationFrequency: { value: 20, unit: "kHz" },
        builtUpEdge: { tendency: "LOW", speedRange: { min: 10, max: 40, unit: "m/min" } },
        breakability: { rating: "FAIR", chipBreakerRequired: false },
        colorAtSpeed: { slow: "silver", optimal: "straw", high: "blue" }
      },
      friction: {
        toolChipInterface: { dry: 0.45, withCoolant: 0.28, withMQL: 0.33 },
        toolWorkpieceInterface: { dry: 0.38, withCoolant: 0.24 },
        contactLength: { stickingZone: { ratio: 0.35 }, slidingZone: { ratio: 0.65 } },
        seizureTemperature: { value: 900, unit: "C" },
        adhesionTendency: { rating: "MODERATE" },
        abrasiveness: { rating: "LOW" },
        diffusionWearTendency: { rating: "MODERATE" }
      },
      thermalMachining: {
        cuttingTemperature: { model: "empirical", coefficients: { a: 280, b: 0.28, c: 0.12 }, maxRecommended: { value: 950, unit: "C" } },
        heatPartition: { chip: 0.78, tool: 0.16, workpiece: 0.05, coolant: 0.01 },
        coolantEffectiveness: { flood: 0.30, mist: 0.10, mql: 0.22, cryogenic: 0.35 },
        thermalDamageThreshold: { whiteLayer: 1030, overTempering: 770, burning: 1150 }
      },
      surfaceIntegrity: {
        residualStress: { surface: -150, subsurface: 90, unit: "MPa", depth: 50 },
        workHardening: { depthAffected: 65, hardnessIncrease: 18, strainHardeningExponent: 0.23 },
        surfaceRoughness: { roughing: { Ra: 4.5 }, finishing: { Ra: 0.8 }, unit: "um" },
        metallurgicalDamage: { whiteLayerRisk: "LOW", microcrackRisk: "LOW" },
        burr: { tendency: "MODERATE", type: "rollover" }
      },
      statisticalData: {
        dataPoints: 95,
        confidenceLevel: 0.88,
        standardDeviation: { speed: 3.2, force: 165, toolLife: 11 },
        sources: ["ASM Handbook Vol 16", "Machining Data Handbook 3rd Ed", "Estimated"],
        lastValidated: "2026-Q1",
        reliability: "ESTIMATED"
      }
*/

module.exports = CARBON_ALLOY_STEEL_CONDITIONS;
}
