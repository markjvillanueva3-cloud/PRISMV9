/**
 * PRISM MATERIALS DATABASE - Stainless Steel Conditions
 * File: stainless_conditions_generated.js
 * 
 * COMPREHENSIVE COVERAGE:
 * - Austenitic (304, 316, etc.): Annealed + Cold Worked (1/4 to Full Hard)
 * - Martensitic (410, 420, 440): Annealed + Hardened (35-60 HRC)
 * - PH Stainless (17-4, 15-5, etc.): Complete H-series conditions
 * 
 * Generated: 2026-01-24 22:12:02
 */

const STAINLESS_CONDITIONS = {
  metadata: {
    file: "stainless_conditions_generated.js",
    category: "M_STAINLESS",
    materialCount: 91,
    idRange: { start: "M-SS-201", end: "M-SS-291" },
    coverage: {
      austenitic: 30,
      martensitic: 29,
      ph_stainless: 32
    }
  },

  materials: {
    "M-SS-201": {
      "id": "M-SS-201",
      "name": "304 Annealed",
      "designation": {
            "aisi": "304",
            "uns": "S30400",
            "din": "1.4301",
            "en": "X5CrNi18-10"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "Annealed",
      "composition": {
            "C": 0.08,
            "Cr": 18.5,
            "Ni": 9.0,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.2,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 149,
                  "rockwell_b": 77
            },
            "tensile_strength": {
                  "typical": 515
            },
            "yield_strength": {
                  "typical": 205
            },
            "elongation": {
                  "typical": 40
            }
      },
      "kienzle": {
            "kc1_1": 2500,
            "mc": 0.21
      },
      "taylor": {
            "C": 200,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 310,
            "B": 1000,
            "n": 0.65,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 105,
                              "opt": 150,
                              "max": 195
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-202": {
      "id": "M-SS-202",
      "name": "304 1/4 Hard",
      "designation": {
            "aisi": "304",
            "uns": "S30400",
            "din": "1.4301",
            "en": "X5CrNi18-10"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "1/4 Hard",
      "composition": {
            "C": 0.08,
            "Cr": 18.5,
            "Ni": 9.0,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.2,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 178,
                  "rockwell_b": 92
            },
            "tensile_strength": {
                  "typical": 772
            },
            "yield_strength": {
                  "typical": 768
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 3000,
            "mc": 0.21
      },
      "taylor": {
            "C": 150,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 310,
            "B": 1000,
            "n": 0.65,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 84,
                              "opt": 120,
                              "max": 156
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-203": {
      "id": "M-SS-203",
      "name": "304 1/2 Hard",
      "designation": {
            "aisi": "304",
            "uns": "S30400",
            "din": "1.4301",
            "en": "X5CrNi18-10"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "1/2 Hard",
      "composition": {
            "C": 0.08,
            "Cr": 18.5,
            "Ni": 9.0,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.2,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 208,
                  "rockwell_b": 100
            },
            "tensile_strength": {
                  "typical": 875
            },
            "yield_strength": {
                  "typical": 1000
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 3375,
            "mc": 0.21
      },
      "taylor": {
            "C": 120,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 310,
            "B": 1000,
            "n": 0.65,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 67,
                              "opt": 97,
                              "max": 126
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-204": {
      "id": "M-SS-204",
      "name": "304 3/4 Hard",
      "designation": {
            "aisi": "304",
            "uns": "S30400",
            "din": "1.4301",
            "en": "X5CrNi18-10"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "3/4 Hard",
      "composition": {
            "C": 0.08,
            "Cr": 18.5,
            "Ni": 9.0,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.2,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 230,
                  "rockwell_b": 100
            },
            "tensile_strength": {
                  "typical": 978
            },
            "yield_strength": {
                  "typical": 1127
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 3625,
            "mc": 0.21
      },
      "taylor": {
            "C": 100,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 310,
            "B": 1000,
            "n": 0.65,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 57,
                              "opt": 82,
                              "max": 106
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-205": {
      "id": "M-SS-205",
      "name": "304 Full Hard",
      "designation": {
            "aisi": "304",
            "uns": "S30400",
            "din": "1.4301",
            "en": "X5CrNi18-10"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "Full Hard",
      "composition": {
            "C": 0.08,
            "Cr": 18.5,
            "Ni": 9.0,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.2,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 253,
                  "rockwell_b": 100
            },
            "tensile_strength": {
                  "typical": 1055
            },
            "yield_strength": {
                  "typical": 1250
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 3875,
            "mc": 0.21
      },
      "taylor": {
            "C": 80,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 310,
            "B": 1000,
            "n": 0.65,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 46,
                              "opt": 67,
                              "max": 87
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-206": {
      "id": "M-SS-206",
      "name": "304L Annealed",
      "designation": {
            "aisi": "304L",
            "uns": "S30403",
            "din": "1.4307",
            "en": "X2CrNi18-9"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "Annealed",
      "composition": {
            "C": 0.03,
            "Cr": 18.5,
            "Ni": 9.0,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.2,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 143,
                  "rockwell_b": 74
            },
            "tensile_strength": {
                  "typical": 485
            },
            "yield_strength": {
                  "typical": 170
            },
            "elongation": {
                  "typical": 40
            }
      },
      "kienzle": {
            "kc1_1": 2450,
            "mc": 0.21
      },
      "taylor": {
            "C": 205,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 290,
            "B": 980,
            "n": 0.65,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 108,
                              "opt": 155,
                              "max": 201
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-207": {
      "id": "M-SS-207",
      "name": "304L 1/4 Hard",
      "designation": {
            "aisi": "304L",
            "uns": "S30403",
            "din": "1.4307",
            "en": "X2CrNi18-9"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "1/4 Hard",
      "composition": {
            "C": 0.03,
            "Cr": 18.5,
            "Ni": 9.0,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.2,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 171,
                  "rockwell_b": 88
            },
            "tensile_strength": {
                  "typical": 727
            },
            "yield_strength": {
                  "typical": 637
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 2940,
            "mc": 0.21
      },
      "taylor": {
            "C": 153,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 290,
            "B": 980,
            "n": 0.65,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 86,
                              "opt": 124,
                              "max": 161
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-208": {
      "id": "M-SS-208",
      "name": "304L 1/2 Hard",
      "designation": {
            "aisi": "304L",
            "uns": "S30403",
            "din": "1.4307",
            "en": "X2CrNi18-9"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "1/2 Hard",
      "composition": {
            "C": 0.03,
            "Cr": 18.5,
            "Ni": 9.0,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.2,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 200,
                  "rockwell_b": 100
            },
            "tensile_strength": {
                  "typical": 824
            },
            "yield_strength": {
                  "typical": 829
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 3307,
            "mc": 0.21
      },
      "taylor": {
            "C": 123,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 290,
            "B": 980,
            "n": 0.65,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 70,
                              "opt": 100,
                              "max": 130
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-209": {
      "id": "M-SS-209",
      "name": "304L 3/4 Hard",
      "designation": {
            "aisi": "304L",
            "uns": "S30403",
            "din": "1.4307",
            "en": "X2CrNi18-9"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "3/4 Hard",
      "composition": {
            "C": 0.03,
            "Cr": 18.5,
            "Ni": 9.0,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.2,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 221,
                  "rockwell_b": 100
            },
            "tensile_strength": {
                  "typical": 921
            },
            "yield_strength": {
                  "typical": 935
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 3552,
            "mc": 0.21
      },
      "taylor": {
            "C": 102,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 290,
            "B": 980,
            "n": 0.65,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 59,
                              "opt": 85,
                              "max": 110
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-210": {
      "id": "M-SS-210",
      "name": "304L Full Hard",
      "designation": {
            "aisi": "304L",
            "uns": "S30403",
            "din": "1.4307",
            "en": "X2CrNi18-9"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "Full Hard",
      "composition": {
            "C": 0.03,
            "Cr": 18.5,
            "Ni": 9.0,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.2,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 243,
                  "rockwell_b": 100
            },
            "tensile_strength": {
                  "typical": 994
            },
            "yield_strength": {
                  "typical": 1037
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 3797,
            "mc": 0.21
      },
      "taylor": {
            "C": 82,
            "n": 0.2
      },
      "johnson_cook": {
            "A": 290,
            "B": 980,
            "n": 0.65,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 48,
                              "opt": 69,
                              "max": 89
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-211": {
      "id": "M-SS-211",
      "name": "316 Annealed",
      "designation": {
            "aisi": "316",
            "uns": "S31600",
            "din": "1.4401",
            "en": "X5CrNiMo17-12-2"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "Annealed",
      "composition": {
            "C": 0.08,
            "Cr": 17.0,
            "Ni": 12.0,
            "Mo": 2.5,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.3,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 149,
                  "rockwell_b": 77
            },
            "tensile_strength": {
                  "typical": 515
            },
            "yield_strength": {
                  "typical": 205
            },
            "elongation": {
                  "typical": 40
            }
      },
      "kienzle": {
            "kc1_1": 2600,
            "mc": 0.21
      },
      "taylor": {
            "C": 190,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 305,
            "B": 1050,
            "n": 0.65,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 98,
                              "opt": 140,
                              "max": 182
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-212": {
      "id": "M-SS-212",
      "name": "316 1/4 Hard",
      "designation": {
            "aisi": "316",
            "uns": "S31600",
            "din": "1.4401",
            "en": "X5CrNiMo17-12-2"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "1/4 Hard",
      "composition": {
            "C": 0.08,
            "Cr": 17.0,
            "Ni": 12.0,
            "Mo": 2.5,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.3,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 178,
                  "rockwell_b": 92
            },
            "tensile_strength": {
                  "typical": 772
            },
            "yield_strength": {
                  "typical": 768
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 3120,
            "mc": 0.21
      },
      "taylor": {
            "C": 142,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 305,
            "B": 1050,
            "n": 0.65,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 78,
                              "opt": 112,
                              "max": 145
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-213": {
      "id": "M-SS-213",
      "name": "316 1/2 Hard",
      "designation": {
            "aisi": "316",
            "uns": "S31600",
            "din": "1.4401",
            "en": "X5CrNiMo17-12-2"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "1/2 Hard",
      "composition": {
            "C": 0.08,
            "Cr": 17.0,
            "Ni": 12.0,
            "Mo": 2.5,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.3,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 208,
                  "rockwell_b": 100
            },
            "tensile_strength": {
                  "typical": 875
            },
            "yield_strength": {
                  "typical": 1000
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 3510,
            "mc": 0.21
      },
      "taylor": {
            "C": 114,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 305,
            "B": 1050,
            "n": 0.65,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 63,
                              "opt": 91,
                              "max": 118
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-214": {
      "id": "M-SS-214",
      "name": "316 3/4 Hard",
      "designation": {
            "aisi": "316",
            "uns": "S31600",
            "din": "1.4401",
            "en": "X5CrNiMo17-12-2"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "3/4 Hard",
      "composition": {
            "C": 0.08,
            "Cr": 17.0,
            "Ni": 12.0,
            "Mo": 2.5,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.3,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 230,
                  "rockwell_b": 100
            },
            "tensile_strength": {
                  "typical": 978
            },
            "yield_strength": {
                  "typical": 1127
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 3770,
            "mc": 0.21
      },
      "taylor": {
            "C": 95,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 305,
            "B": 1050,
            "n": 0.65,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 53,
                              "opt": 77,
                              "max": 100
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-215": {
      "id": "M-SS-215",
      "name": "316 Full Hard",
      "designation": {
            "aisi": "316",
            "uns": "S31600",
            "din": "1.4401",
            "en": "X5CrNiMo17-12-2"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "Full Hard",
      "composition": {
            "C": 0.08,
            "Cr": 17.0,
            "Ni": 12.0,
            "Mo": 2.5,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.3,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 253,
                  "rockwell_b": 100
            },
            "tensile_strength": {
                  "typical": 1055
            },
            "yield_strength": {
                  "typical": 1250
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 4030,
            "mc": 0.21
      },
      "taylor": {
            "C": 76,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 305,
            "B": 1050,
            "n": 0.65,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 44,
                              "opt": 63,
                              "max": 81
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-216": {
      "id": "M-SS-216",
      "name": "316L Annealed",
      "designation": {
            "aisi": "316L",
            "uns": "S31603",
            "din": "1.4404",
            "en": "X2CrNiMo17-12-2"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "Annealed",
      "composition": {
            "C": 0.03,
            "Cr": 17.0,
            "Ni": 12.0,
            "Mo": 2.5,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.3,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 143,
                  "rockwell_b": 74
            },
            "tensile_strength": {
                  "typical": 485
            },
            "yield_strength": {
                  "typical": 170
            },
            "elongation": {
                  "typical": 40
            }
      },
      "kienzle": {
            "kc1_1": 2550,
            "mc": 0.21
      },
      "taylor": {
            "C": 195,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 285,
            "B": 1030,
            "n": 0.65,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 101,
                              "opt": 145,
                              "max": 188
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-217": {
      "id": "M-SS-217",
      "name": "316L 1/4 Hard",
      "designation": {
            "aisi": "316L",
            "uns": "S31603",
            "din": "1.4404",
            "en": "X2CrNiMo17-12-2"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "1/4 Hard",
      "composition": {
            "C": 0.03,
            "Cr": 17.0,
            "Ni": 12.0,
            "Mo": 2.5,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.3,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 171,
                  "rockwell_b": 88
            },
            "tensile_strength": {
                  "typical": 727
            },
            "yield_strength": {
                  "typical": 637
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 3060,
            "mc": 0.21
      },
      "taylor": {
            "C": 146,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 285,
            "B": 1030,
            "n": 0.65,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 81,
                              "opt": 116,
                              "max": 150
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-218": {
      "id": "M-SS-218",
      "name": "316L 1/2 Hard",
      "designation": {
            "aisi": "316L",
            "uns": "S31603",
            "din": "1.4404",
            "en": "X2CrNiMo17-12-2"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "1/2 Hard",
      "composition": {
            "C": 0.03,
            "Cr": 17.0,
            "Ni": 12.0,
            "Mo": 2.5,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.3,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 200,
                  "rockwell_b": 100
            },
            "tensile_strength": {
                  "typical": 824
            },
            "yield_strength": {
                  "typical": 829
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 3442,
            "mc": 0.21
      },
      "taylor": {
            "C": 117,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 285,
            "B": 1030,
            "n": 0.65,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 65,
                              "opt": 94,
                              "max": 122
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-219": {
      "id": "M-SS-219",
      "name": "316L 3/4 Hard",
      "designation": {
            "aisi": "316L",
            "uns": "S31603",
            "din": "1.4404",
            "en": "X2CrNiMo17-12-2"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "3/4 Hard",
      "composition": {
            "C": 0.03,
            "Cr": 17.0,
            "Ni": 12.0,
            "Mo": 2.5,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.3,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 221,
                  "rockwell_b": 100
            },
            "tensile_strength": {
                  "typical": 921
            },
            "yield_strength": {
                  "typical": 935
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 3697,
            "mc": 0.21
      },
      "taylor": {
            "C": 97,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 285,
            "B": 1030,
            "n": 0.65,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 55,
                              "opt": 79,
                              "max": 102
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-220": {
      "id": "M-SS-220",
      "name": "316L Full Hard",
      "designation": {
            "aisi": "316L",
            "uns": "S31603",
            "din": "1.4404",
            "en": "X2CrNiMo17-12-2"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "Full Hard",
      "composition": {
            "C": 0.03,
            "Cr": 17.0,
            "Ni": 12.0,
            "Mo": 2.5,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.3,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 243,
                  "rockwell_b": 100
            },
            "tensile_strength": {
                  "typical": 994
            },
            "yield_strength": {
                  "typical": 1037
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 3952,
            "mc": 0.21
      },
      "taylor": {
            "C": 78,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 285,
            "B": 1030,
            "n": 0.65,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 45,
                              "opt": 65,
                              "max": 84
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-221": {
      "id": "M-SS-221",
      "name": "321 Annealed",
      "designation": {
            "aisi": "321",
            "uns": "S32100",
            "din": "1.4541",
            "en": "X6CrNiTi18-10"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "Annealed",
      "composition": {
            "C": 0.08,
            "Cr": 18.0,
            "Ni": 10.5,
            "Ti": 0.4,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.1,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 149,
                  "rockwell_b": 77
            },
            "tensile_strength": {
                  "typical": 515
            },
            "yield_strength": {
                  "typical": 205
            },
            "elongation": {
                  "typical": 40
            }
      },
      "kienzle": {
            "kc1_1": 2550,
            "mc": 0.21
      },
      "taylor": {
            "C": 195,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 310,
            "B": 1020,
            "n": 0.64,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 101,
                              "opt": 145,
                              "max": 188
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-222": {
      "id": "M-SS-222",
      "name": "321 1/4 Hard",
      "designation": {
            "aisi": "321",
            "uns": "S32100",
            "din": "1.4541",
            "en": "X6CrNiTi18-10"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "1/4 Hard",
      "composition": {
            "C": 0.08,
            "Cr": 18.0,
            "Ni": 10.5,
            "Ti": 0.4,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.1,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 178,
                  "rockwell_b": 92
            },
            "tensile_strength": {
                  "typical": 772
            },
            "yield_strength": {
                  "typical": 768
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 3060,
            "mc": 0.21
      },
      "taylor": {
            "C": 146,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 310,
            "B": 1020,
            "n": 0.64,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 81,
                              "opt": 116,
                              "max": 150
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-223": {
      "id": "M-SS-223",
      "name": "321 1/2 Hard",
      "designation": {
            "aisi": "321",
            "uns": "S32100",
            "din": "1.4541",
            "en": "X6CrNiTi18-10"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "1/2 Hard",
      "composition": {
            "C": 0.08,
            "Cr": 18.0,
            "Ni": 10.5,
            "Ti": 0.4,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.1,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 208,
                  "rockwell_b": 100
            },
            "tensile_strength": {
                  "typical": 875
            },
            "yield_strength": {
                  "typical": 1000
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 3442,
            "mc": 0.21
      },
      "taylor": {
            "C": 117,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 310,
            "B": 1020,
            "n": 0.64,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 65,
                              "opt": 94,
                              "max": 122
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-224": {
      "id": "M-SS-224",
      "name": "321 3/4 Hard",
      "designation": {
            "aisi": "321",
            "uns": "S32100",
            "din": "1.4541",
            "en": "X6CrNiTi18-10"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "3/4 Hard",
      "composition": {
            "C": 0.08,
            "Cr": 18.0,
            "Ni": 10.5,
            "Ti": 0.4,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.1,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 230,
                  "rockwell_b": 100
            },
            "tensile_strength": {
                  "typical": 978
            },
            "yield_strength": {
                  "typical": 1127
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 3697,
            "mc": 0.21
      },
      "taylor": {
            "C": 97,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 310,
            "B": 1020,
            "n": 0.64,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 55,
                              "opt": 79,
                              "max": 102
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-225": {
      "id": "M-SS-225",
      "name": "321 Full Hard",
      "designation": {
            "aisi": "321",
            "uns": "S32100",
            "din": "1.4541",
            "en": "X6CrNiTi18-10"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "Full Hard",
      "composition": {
            "C": 0.08,
            "Cr": 18.0,
            "Ni": 10.5,
            "Ti": 0.4,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.1,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 253,
                  "rockwell_b": 100
            },
            "tensile_strength": {
                  "typical": 1055
            },
            "yield_strength": {
                  "typical": 1250
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 3952,
            "mc": 0.21
      },
      "taylor": {
            "C": 78,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 310,
            "B": 1020,
            "n": 0.64,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 45,
                              "opt": 65,
                              "max": 84
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-226": {
      "id": "M-SS-226",
      "name": "347 Annealed",
      "designation": {
            "aisi": "347",
            "uns": "S34700",
            "din": "1.4550",
            "en": "X6CrNiNb18-10"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "Annealed",
      "composition": {
            "C": 0.08,
            "Cr": 18.0,
            "Ni": 11.0,
            "Nb": 0.8,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.1,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 149,
                  "rockwell_b": 77
            },
            "tensile_strength": {
                  "typical": 515
            },
            "yield_strength": {
                  "typical": 205
            },
            "elongation": {
                  "typical": 40
            }
      },
      "kienzle": {
            "kc1_1": 2580,
            "mc": 0.21
      },
      "taylor": {
            "C": 190,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 315,
            "B": 1040,
            "n": 0.64,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 98,
                              "opt": 140,
                              "max": 182
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-227": {
      "id": "M-SS-227",
      "name": "347 1/4 Hard",
      "designation": {
            "aisi": "347",
            "uns": "S34700",
            "din": "1.4550",
            "en": "X6CrNiNb18-10"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "1/4 Hard",
      "composition": {
            "C": 0.08,
            "Cr": 18.0,
            "Ni": 11.0,
            "Nb": 0.8,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.1,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 178,
                  "rockwell_b": 92
            },
            "tensile_strength": {
                  "typical": 772
            },
            "yield_strength": {
                  "typical": 768
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 3096,
            "mc": 0.21
      },
      "taylor": {
            "C": 142,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 315,
            "B": 1040,
            "n": 0.64,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 78,
                              "opt": 112,
                              "max": 145
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-228": {
      "id": "M-SS-228",
      "name": "347 1/2 Hard",
      "designation": {
            "aisi": "347",
            "uns": "S34700",
            "din": "1.4550",
            "en": "X6CrNiNb18-10"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "1/2 Hard",
      "composition": {
            "C": 0.08,
            "Cr": 18.0,
            "Ni": 11.0,
            "Nb": 0.8,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.1,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 208,
                  "rockwell_b": 100
            },
            "tensile_strength": {
                  "typical": 875
            },
            "yield_strength": {
                  "typical": 1000
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 3483,
            "mc": 0.21
      },
      "taylor": {
            "C": 114,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 315,
            "B": 1040,
            "n": 0.64,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 63,
                              "opt": 91,
                              "max": 118
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-229": {
      "id": "M-SS-229",
      "name": "347 3/4 Hard",
      "designation": {
            "aisi": "347",
            "uns": "S34700",
            "din": "1.4550",
            "en": "X6CrNiNb18-10"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "3/4 Hard",
      "composition": {
            "C": 0.08,
            "Cr": 18.0,
            "Ni": 11.0,
            "Nb": 0.8,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.1,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 230,
                  "rockwell_b": 100
            },
            "tensile_strength": {
                  "typical": 978
            },
            "yield_strength": {
                  "typical": 1127
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 3741,
            "mc": 0.21
      },
      "taylor": {
            "C": 95,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 315,
            "B": 1040,
            "n": 0.64,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 53,
                              "opt": 77,
                              "max": 100
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-230": {
      "id": "M-SS-230",
      "name": "347 Full Hard",
      "designation": {
            "aisi": "347",
            "uns": "S34700",
            "din": "1.4550",
            "en": "X6CrNiNb18-10"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Austenitic",
      "condition": "Full Hard",
      "composition": {
            "C": 0.08,
            "Cr": 18.0,
            "Ni": 11.0,
            "Nb": 0.8,
            "Mn": 2.0
      },
      "physical": {
            "density": 8000,
            "thermal_conductivity": 16.1,
            "elastic_modulus": 193000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 253,
                  "rockwell_b": 100
            },
            "tensile_strength": {
                  "typical": 1055
            },
            "yield_strength": {
                  "typical": 1250
            },
            "elongation": {
                  "typical": 5
            }
      },
      "kienzle": {
            "kc1_1": 3999,
            "mc": 0.21
      },
      "taylor": {
            "C": 76,
            "n": 0.19
      },
      "johnson_cook": {
            "A": 315,
            "B": 1040,
            "n": 0.64,
            "C": 0.07,
            "m": 1.0
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 44,
                              "opt": 63,
                              "max": 81
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "M10-M20",
            "coating": [
                  "TiAlN",
                  "AlCrN",
                  "TiCN"
            ],
            "geometry": "Sharp positive rake",
            "coolant": "High pressure flood required",
            "notes": "Work hardening - maintain constant feed, avoid dwelling"
      },
      "applications": [
            "chemical_processing",
            "food_equipment",
            "medical",
            "aerospace"
      ]
},
    "M-SS-231": {
      "id": "M-SS-231",
      "name": "410 Annealed",
      "designation": {
            "aisi": "410",
            "uns": "S41000",
            "din": "1.4006",
            "en": "X12Cr13"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Annealed",
      "composition": {
            "C": 0.15,
            "Cr": 12.5,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 155,
                  "rockwell_b": 80
            },
            "tensile_strength": {
                  "typical": 534
            },
            "yield_strength": {
                  "typical": 347
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 2400,
            "mc": 0.23
      },
      "taylor": {
            "C": 170,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 350,
            "B": 850,
            "n": 0.45,
            "C": 0.04,
            "m": 0.95
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 62,
                              "opt": 90,
                              "max": 121
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P20-P30",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive rake",
            "coolant": "Flood recommended"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-232": {
      "id": "M-SS-232",
      "name": "410 Hardened 35 HRC",
      "designation": {
            "aisi": "410",
            "uns": "S41000",
            "din": "1.4006",
            "en": "X12Cr13"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Hardened 35 HRC",
      "composition": {
            "C": 0.15,
            "Cr": 12.5,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.9,
            "elastic_modulus": 200000,
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
                  "typical": 864
            },
            "elongation": {
                  "typical": 23
            }
      },
      "kienzle": {
            "kc1_1": 3472,
            "mc": 0.23
      },
      "taylor": {
            "C": 78,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 350,
            "B": 850,
            "n": 0.45,
            "C": 0.04,
            "m": 0.95
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 30,
                              "opt": 44,
                              "max": 59
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P20",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-233": {
      "id": "M-SS-233",
      "name": "410 Hardened 40 HRC",
      "designation": {
            "aisi": "410",
            "uns": "S41000",
            "din": "1.4006",
            "en": "X12Cr13"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Hardened 40 HRC",
      "composition": {
            "C": 0.15,
            "Cr": 12.5,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.9,
            "elastic_modulus": 200000,
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
                  "typical": 973
            },
            "elongation": {
                  "typical": 20
            }
      },
      "kienzle": {
            "kc1_1": 3788,
            "mc": 0.23
      },
      "taylor": {
            "C": 68,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 350,
            "B": 850,
            "n": 0.45,
            "C": 0.04,
            "m": 0.95
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 26,
                              "opt": 38,
                              "max": 51
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P20",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-234": {
      "id": "M-SS-234",
      "name": "410 Hardened 43 HRC",
      "designation": {
            "aisi": "410",
            "uns": "S41000",
            "din": "1.4006",
            "en": "X12Cr13"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Hardened 43 HRC",
      "composition": {
            "C": 0.15,
            "Cr": 12.5,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 358,
                  "rockwell_c": 43
            },
            "tensile_strength": {
                  "typical": 1235
            },
            "yield_strength": {
                  "typical": 1049
            },
            "elongation": {
                  "typical": 19
            }
      },
      "kienzle": {
            "kc1_1": 4014,
            "mc": 0.23
      },
      "taylor": {
            "C": 62,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 350,
            "B": 850,
            "n": 0.45,
            "C": 0.04,
            "m": 0.95
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 24,
                              "opt": 35,
                              "max": 47
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "K10 Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, honed edge",
            "coolant": "Dry preferred"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-235": {
      "id": "M-SS-235",
      "name": "416 Annealed",
      "designation": {
            "aisi": "416",
            "uns": "S41600",
            "din": "1.4005",
            "en": "X12CrS13"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Annealed",
      "composition": {
            "C": 0.15,
            "Cr": 13.0,
            "S": 0.15,
            "Mn": 1.25
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 155,
                  "rockwell_b": 80
            },
            "tensile_strength": {
                  "typical": 534
            },
            "yield_strength": {
                  "typical": 347
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 2200,
            "mc": 0.24
      },
      "taylor": {
            "C": 200,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 340,
            "B": 820,
            "n": 0.45,
            "C": 0.045,
            "m": 0.96
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 77,
                              "opt": 110,
                              "max": 148
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P20-P30",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive rake",
            "coolant": "Flood recommended"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-236": {
      "id": "M-SS-236",
      "name": "416 Hardened 35 HRC",
      "designation": {
            "aisi": "416",
            "uns": "S41600",
            "din": "1.4005",
            "en": "X12CrS13"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Hardened 35 HRC",
      "composition": {
            "C": 0.15,
            "Cr": 13.0,
            "S": 0.15,
            "Mn": 1.25
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.9,
            "elastic_modulus": 200000,
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
                  "typical": 864
            },
            "elongation": {
                  "typical": 23
            }
      },
      "kienzle": {
            "kc1_1": 3183,
            "mc": 0.24
      },
      "taylor": {
            "C": 92,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 340,
            "B": 820,
            "n": 0.45,
            "C": 0.045,
            "m": 0.96
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 37,
                              "opt": 54,
                              "max": 72
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P20",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-237": {
      "id": "M-SS-237",
      "name": "416 Hardened 38 HRC",
      "designation": {
            "aisi": "416",
            "uns": "S41600",
            "din": "1.4005",
            "en": "X12CrS13"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Hardened 38 HRC",
      "composition": {
            "C": 0.15,
            "Cr": 13.0,
            "S": 0.15,
            "Mn": 1.25
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.9,
            "elastic_modulus": 200000,
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
                  "typical": 926
            },
            "elongation": {
                  "typical": 21
            }
      },
      "kienzle": {
            "kc1_1": 3346,
            "mc": 0.24
      },
      "taylor": {
            "C": 85,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 340,
            "B": 820,
            "n": 0.45,
            "C": 0.045,
            "m": 0.96
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 35,
                              "opt": 50,
                              "max": 67
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P20",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-238": {
      "id": "M-SS-238",
      "name": "416 Hardened 40 HRC",
      "designation": {
            "aisi": "416",
            "uns": "S41600",
            "din": "1.4005",
            "en": "X12CrS13"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Hardened 40 HRC",
      "composition": {
            "C": 0.15,
            "Cr": 13.0,
            "S": 0.15,
            "Mn": 1.25
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.9,
            "elastic_modulus": 200000,
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
                  "typical": 973
            },
            "elongation": {
                  "typical": 20
            }
      },
      "kienzle": {
            "kc1_1": 3472,
            "mc": 0.24
      },
      "taylor": {
            "C": 80,
            "n": 0.18
      },
      "johnson_cook": {
            "A": 340,
            "B": 820,
            "n": 0.45,
            "C": 0.045,
            "m": 0.96
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 32,
                              "opt": 47,
                              "max": 63
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P20",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-239": {
      "id": "M-SS-239",
      "name": "420 Annealed",
      "designation": {
            "aisi": "420",
            "uns": "S42000",
            "din": "1.4021",
            "en": "X20Cr13"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Annealed",
      "composition": {
            "C": 0.35,
            "Cr": 13.0,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.9,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 195,
                  "rockwell_b": 100
            },
            "tensile_strength": {
                  "typical": 672
            },
            "yield_strength": {
                  "typical": 436
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 2600,
            "mc": 0.22
      },
      "taylor": {
            "C": 150,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 420,
            "B": 920,
            "n": 0.4,
            "C": 0.035,
            "m": 0.92
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 49,
                              "opt": 70,
                              "max": 94
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P20-P30",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive rake",
            "coolant": "Flood recommended"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-240": {
      "id": "M-SS-240",
      "name": "420 Hardened 40 HRC",
      "designation": {
            "aisi": "420",
            "uns": "S42000",
            "din": "1.4021",
            "en": "X20Cr13"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Hardened 40 HRC",
      "composition": {
            "C": 0.35,
            "Cr": 13.0,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.9,
            "elastic_modulus": 200000,
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
                  "typical": 973
            },
            "elongation": {
                  "typical": 20
            }
      },
      "kienzle": {
            "kc1_1": 3481,
            "mc": 0.22
      },
      "taylor": {
            "C": 79,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 420,
            "B": 920,
            "n": 0.4,
            "C": 0.035,
            "m": 0.92
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 26,
                              "opt": 38,
                              "max": 51
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P20",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-241": {
      "id": "M-SS-241",
      "name": "420 Hardened 45 HRC",
      "designation": {
            "aisi": "420",
            "uns": "S42000",
            "din": "1.4021",
            "en": "X20Cr13"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Hardened 45 HRC",
      "composition": {
            "C": 0.35,
            "Cr": 13.0,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.9,
            "elastic_modulus": 200000,
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
                  "typical": 1105
            },
            "elongation": {
                  "typical": 18
            }
      },
      "kienzle": {
            "kc1_1": 3804,
            "mc": 0.22
      },
      "taylor": {
            "C": 68,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 420,
            "B": 920,
            "n": 0.4,
            "C": 0.035,
            "m": 0.92
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 23,
                              "opt": 33,
                              "max": 44
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "K10 Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, honed edge",
            "coolant": "Dry preferred"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-242": {
      "id": "M-SS-242",
      "name": "420 Hardened 50 HRC",
      "designation": {
            "aisi": "420",
            "uns": "S42000",
            "din": "1.4021",
            "en": "X20Cr13"
      },
      "iso_group": "H",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Hardened 50 HRC",
      "composition": {
            "C": 0.35,
            "Cr": 13.0,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.9,
            "elastic_modulus": 200000,
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
                  "typical": 1269
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 4218,
            "mc": 0.21
      },
      "taylor": {
            "C": 57,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 420,
            "B": 920,
            "n": 0.4,
            "C": 0.035,
            "m": 0.92
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 20,
                              "opt": 29,
                              "max": 39
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
            "geometry": "Negative rake, T-land edge prep",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-243": {
      "id": "M-SS-243",
      "name": "420 Hardened 52 HRC",
      "designation": {
            "aisi": "420",
            "uns": "S42000",
            "din": "1.4021",
            "en": "X20Cr13"
      },
      "iso_group": "H",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Hardened 52 HRC",
      "composition": {
            "C": 0.35,
            "Cr": 13.0,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.9,
            "elastic_modulus": 200000,
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
                  "typical": 1343
            },
            "elongation": {
                  "typical": 14
            }
      },
      "kienzle": {
            "kc1_1": 4406,
            "mc": 0.21
      },
      "taylor": {
            "C": 53,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 420,
            "B": 920,
            "n": 0.4,
            "C": 0.035,
            "m": 0.92
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 18,
                              "opt": 27,
                              "max": 36
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
            "geometry": "Negative rake, T-land edge prep",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-244": {
      "id": "M-SS-244",
      "name": "440A Annealed",
      "designation": {
            "aisi": "440A",
            "uns": "S44002",
            "din": "1.4109",
            "en": "X70CrMo15"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Annealed",
      "composition": {
            "C": 0.7,
            "Cr": 17.0,
            "Mo": 0.75,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.2,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 230,
                  "rockwell_b": 100
            },
            "tensile_strength": {
                  "typical": 793
            },
            "yield_strength": {
                  "typical": 515
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 2800,
            "mc": 0.22
      },
      "taylor": {
            "C": 130,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 500,
            "B": 980,
            "n": 0.35,
            "C": 0.03,
            "m": 0.9
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 38,
                              "opt": 55,
                              "max": 74
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P20-P30",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive rake",
            "coolant": "Flood recommended"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-245": {
      "id": "M-SS-245",
      "name": "440A Hardened 45 HRC",
      "designation": {
            "aisi": "440A",
            "uns": "S44002",
            "din": "1.4109",
            "en": "X70CrMo15"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Hardened 45 HRC",
      "composition": {
            "C": 0.7,
            "Cr": 17.0,
            "Mo": 0.75,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.2,
            "elastic_modulus": 200000,
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
                  "typical": 1105
            },
            "elongation": {
                  "typical": 18
            }
      },
      "kienzle": {
            "kc1_1": 3655,
            "mc": 0.22
      },
      "taylor": {
            "C": 71,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 500,
            "B": 980,
            "n": 0.35,
            "C": 0.03,
            "m": 0.9
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 21,
                              "opt": 31,
                              "max": 41
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "K10 Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, honed edge",
            "coolant": "Dry preferred"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-246": {
      "id": "M-SS-246",
      "name": "440A Hardened 50 HRC",
      "designation": {
            "aisi": "440A",
            "uns": "S44002",
            "din": "1.4109",
            "en": "X70CrMo15"
      },
      "iso_group": "H",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Hardened 50 HRC",
      "composition": {
            "C": 0.7,
            "Cr": 17.0,
            "Mo": 0.75,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.2,
            "elastic_modulus": 200000,
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
                  "typical": 1269
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 4020,
            "mc": 0.21
      },
      "taylor": {
            "C": 60,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 500,
            "B": 980,
            "n": 0.35,
            "C": 0.03,
            "m": 0.9
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 18,
                              "opt": 27,
                              "max": 36
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
            "geometry": "Negative rake, T-land edge prep",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-247": {
      "id": "M-SS-247",
      "name": "440A Hardened 54 HRC",
      "designation": {
            "aisi": "440A",
            "uns": "S44002",
            "din": "1.4109",
            "en": "X70CrMo15"
      },
      "iso_group": "H",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Hardened 54 HRC",
      "composition": {
            "C": 0.7,
            "Cr": 17.0,
            "Mo": 0.75,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.2,
            "elastic_modulus": 200000,
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
                  "typical": 1422
            },
            "elongation": {
                  "typical": 13
            }
      },
      "kienzle": {
            "kc1_1": 4368,
            "mc": 0.21
      },
      "taylor": {
            "C": 53,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 500,
            "B": 980,
            "n": 0.35,
            "C": 0.03,
            "m": 0.9
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 16,
                              "opt": 24,
                              "max": 32
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
            "geometry": "Negative rake, T-land edge prep",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-248": {
      "id": "M-SS-248",
      "name": "440A Hardened 56 HRC",
      "designation": {
            "aisi": "440A",
            "uns": "S44002",
            "din": "1.4109",
            "en": "X70CrMo15"
      },
      "iso_group": "H",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Hardened 56 HRC",
      "composition": {
            "C": 0.7,
            "Cr": 17.0,
            "Mo": 0.75,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.2,
            "elastic_modulus": 200000,
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
                  "typical": 1509
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 4572,
            "mc": 0.21
      },
      "taylor": {
            "C": 49,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 500,
            "B": 980,
            "n": 0.35,
            "C": 0.03,
            "m": 0.9
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 15,
                              "opt": 22,
                              "max": 29
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
            "geometry": "Negative rake, T-land edge prep",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-249": {
      "id": "M-SS-249",
      "name": "440B Annealed",
      "designation": {
            "aisi": "440B",
            "uns": "S44003",
            "din": "1.4112",
            "en": "X90CrMoV18"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Annealed",
      "composition": {
            "C": 0.85,
            "Cr": 17.0,
            "Mo": 0.75,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.2,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 240,
                  "rockwell_b": 100
            },
            "tensile_strength": {
                  "typical": 828
            },
            "yield_strength": {
                  "typical": 538
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 2900,
            "mc": 0.21
      },
      "taylor": {
            "C": 120,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 530,
            "B": 1000,
            "n": 0.33,
            "C": 0.028,
            "m": 0.88
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 35,
                              "opt": 50,
                              "max": 67
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P20-P30",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive rake",
            "coolant": "Flood recommended"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-250": {
      "id": "M-SS-250",
      "name": "440B Hardened 48 HRC",
      "designation": {
            "aisi": "440B",
            "uns": "S44003",
            "din": "1.4112",
            "en": "X90CrMoV18"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Hardened 48 HRC",
      "composition": {
            "C": 0.85,
            "Cr": 17.0,
            "Mo": 0.75,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.2,
            "elastic_modulus": 200000,
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
                  "typical": 1199
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 3885,
            "mc": 0.2
      },
      "taylor": {
            "C": 63,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 530,
            "B": 1000,
            "n": 0.33,
            "C": 0.028,
            "m": 0.88
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 18,
                              "opt": 27,
                              "max": 36
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "K10 Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, honed edge",
            "coolant": "Dry preferred"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-251": {
      "id": "M-SS-251",
      "name": "440B Hardened 52 HRC",
      "designation": {
            "aisi": "440B",
            "uns": "S44003",
            "din": "1.4112",
            "en": "X90CrMoV18"
      },
      "iso_group": "H",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Hardened 52 HRC",
      "composition": {
            "C": 0.85,
            "Cr": 17.0,
            "Mo": 0.75,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.2,
            "elastic_modulus": 200000,
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
                  "typical": 1343
            },
            "elongation": {
                  "typical": 14
            }
      },
      "kienzle": {
            "kc1_1": 4204,
            "mc": 0.2
      },
      "taylor": {
            "C": 55,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 530,
            "B": 1000,
            "n": 0.33,
            "C": 0.028,
            "m": 0.88
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 16,
                              "opt": 24,
                              "max": 32
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
            "geometry": "Negative rake, T-land edge prep",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-252": {
      "id": "M-SS-252",
      "name": "440B Hardened 55 HRC",
      "designation": {
            "aisi": "440B",
            "uns": "S44003",
            "din": "1.4112",
            "en": "X90CrMoV18"
      },
      "iso_group": "H",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Hardened 55 HRC",
      "composition": {
            "C": 0.85,
            "Cr": 17.0,
            "Mo": 0.75,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.2,
            "elastic_modulus": 200000,
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
                  "typical": 1466
            },
            "elongation": {
                  "typical": 13
            }
      },
      "kienzle": {
            "kc1_1": 4483,
            "mc": 0.2
      },
      "taylor": {
            "C": 49,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 530,
            "B": 1000,
            "n": 0.33,
            "C": 0.028,
            "m": 0.88
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 15,
                              "opt": 22,
                              "max": 29
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
            "geometry": "Negative rake, T-land edge prep",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-253": {
      "id": "M-SS-253",
      "name": "440B Hardened 58 HRC",
      "designation": {
            "aisi": "440B",
            "uns": "S44003",
            "din": "1.4112",
            "en": "X90CrMoV18"
      },
      "iso_group": "H",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Hardened 58 HRC",
      "composition": {
            "C": 0.85,
            "Cr": 17.0,
            "Mo": 0.75,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.2,
            "elastic_modulus": 200000,
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
                  "typical": 1603
            },
            "elongation": {
                  "typical": 11
            }
      },
      "kienzle": {
            "kc1_1": 4801,
            "mc": 0.2
      },
      "taylor": {
            "C": 44,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 530,
            "B": 1000,
            "n": 0.33,
            "C": 0.028,
            "m": 0.88
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 14,
                              "opt": 20,
                              "max": 27
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
            "geometry": "Negative rake, T-land edge prep",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-254": {
      "id": "M-SS-254",
      "name": "440C Annealed",
      "designation": {
            "aisi": "440C",
            "uns": "S44004",
            "din": "1.4125",
            "en": "X105CrMo17"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Annealed",
      "composition": {
            "C": 1.1,
            "Cr": 17.0,
            "Mo": 0.75,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.2,
            "elastic_modulus": 200000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 250,
                  "rockwell_b": 100
            },
            "tensile_strength": {
                  "typical": 862
            },
            "yield_strength": {
                  "typical": 560
            },
            "elongation": {
                  "typical": 25
            }
      },
      "kienzle": {
            "kc1_1": 3000,
            "mc": 0.21
      },
      "taylor": {
            "C": 110,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 560,
            "B": 1050,
            "n": 0.3,
            "C": 0.025,
            "m": 0.85
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 31,
                              "opt": 45,
                              "max": 60
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P20-P30",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive rake",
            "coolant": "Flood recommended"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-255": {
      "id": "M-SS-255",
      "name": "440C Hardened 50 HRC",
      "designation": {
            "aisi": "440C",
            "uns": "S44004",
            "din": "1.4125",
            "en": "X105CrMo17"
      },
      "iso_group": "H",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Hardened 50 HRC",
      "composition": {
            "C": 1.1,
            "Cr": 17.0,
            "Mo": 0.75,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.2,
            "elastic_modulus": 200000,
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
                  "typical": 1269
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 4064,
            "mc": 0.2
      },
      "taylor": {
            "C": 56,
            "n": 0.13
      },
      "johnson_cook": {
            "A": 560,
            "B": 1050,
            "n": 0.3,
            "C": 0.025,
            "m": 0.85
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 16,
                              "opt": 24,
                              "max": 32
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
            "geometry": "Negative rake, T-land edge prep",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-256": {
      "id": "M-SS-256",
      "name": "440C Hardened 54 HRC",
      "designation": {
            "aisi": "440C",
            "uns": "S44004",
            "din": "1.4125",
            "en": "X105CrMo17"
      },
      "iso_group": "H",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Hardened 54 HRC",
      "composition": {
            "C": 1.1,
            "Cr": 17.0,
            "Mo": 0.75,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.2,
            "elastic_modulus": 200000,
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
                  "typical": 1422
            },
            "elongation": {
                  "typical": 13
            }
      },
      "kienzle": {
            "kc1_1": 4401,
            "mc": 0.2
      },
      "taylor": {
            "C": 49,
            "n": 0.13
      },
      "johnson_cook": {
            "A": 560,
            "B": 1050,
            "n": 0.3,
            "C": 0.025,
            "m": 0.85
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 14,
                              "opt": 21,
                              "max": 28
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
            "geometry": "Negative rake, T-land edge prep",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-257": {
      "id": "M-SS-257",
      "name": "440C Hardened 56 HRC",
      "designation": {
            "aisi": "440C",
            "uns": "S44004",
            "din": "1.4125",
            "en": "X105CrMo17"
      },
      "iso_group": "H",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Hardened 56 HRC",
      "composition": {
            "C": 1.1,
            "Cr": 17.0,
            "Mo": 0.75,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.2,
            "elastic_modulus": 200000,
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
                  "typical": 1509
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 4599,
            "mc": 0.2
      },
      "taylor": {
            "C": 46,
            "n": 0.13
      },
      "johnson_cook": {
            "A": 560,
            "B": 1050,
            "n": 0.3,
            "C": 0.025,
            "m": 0.85
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 14,
                              "opt": 20,
                              "max": 27
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
            "geometry": "Negative rake, T-land edge prep",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-258": {
      "id": "M-SS-258",
      "name": "440C Hardened 58 HRC",
      "designation": {
            "aisi": "440C",
            "uns": "S44004",
            "din": "1.4125",
            "en": "X105CrMo17"
      },
      "iso_group": "H",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Hardened 58 HRC",
      "composition": {
            "C": 1.1,
            "Cr": 17.0,
            "Mo": 0.75,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.2,
            "elastic_modulus": 200000,
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
                  "typical": 1603
            },
            "elongation": {
                  "typical": 11
            }
      },
      "kienzle": {
            "kc1_1": 4812,
            "mc": 0.2
      },
      "taylor": {
            "C": 42,
            "n": 0.13
      },
      "johnson_cook": {
            "A": 560,
            "B": 1050,
            "n": 0.3,
            "C": 0.025,
            "m": 0.85
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 13,
                              "opt": 19,
                              "max": 25
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
            "geometry": "Negative rake, T-land edge prep",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-259": {
      "id": "M-SS-259",
      "name": "440C Hardened 60 HRC",
      "designation": {
            "aisi": "440C",
            "uns": "S44004",
            "din": "1.4125",
            "en": "X105CrMo17"
      },
      "iso_group": "H",
      "material_class": "Stainless Steel - Martensitic",
      "condition": "Hardened 60 HRC",
      "composition": {
            "C": 1.1,
            "Cr": 17.0,
            "Mo": 0.75,
            "Mn": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 24.2,
            "elastic_modulus": 200000,
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
                  "typical": 1705
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 5049,
            "mc": 0.2
      },
      "taylor": {
            "C": 39,
            "n": 0.13
      },
      "johnson_cook": {
            "A": 560,
            "B": 1050,
            "n": 0.3,
            "C": 0.025,
            "m": 0.85
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 11,
                              "opt": 17,
                              "max": 22
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
            "geometry": "Negative rake, T-land edge prep",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "cutlery",
            "bearings",
            "valve_components",
            "surgical_instruments"
      ]
},
    "M-SS-260": {
      "id": "M-SS-260",
      "name": "17-4 PH Condition A",
      "designation": {
            "aisi": "17-4PH",
            "uns": "S17400",
            "din": "1.4542",
            "en": "X5CrNiCuNb16-4"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "Condition A",
      "composition": {
            "C": 0.07,
            "Cr": 16.0,
            "Ni": 4.0,
            "Cu": 4.0,
            "Nb": 0.3
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 18.4,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 277
            },
            "tensile_strength": {
                  "typical": 1070
            },
            "yield_strength": {
                  "typical": 795
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 2700,
            "mc": 0.22
      },
      "taylor": {
            "C": 160,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 450,
            "B": 950,
            "n": 0.4,
            "C": 0.04,
            "m": 0.93
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 56,
                              "opt": 80,
                              "max": 108
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P20-P30",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive rake",
            "coolant": "Flood recommended"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-261": {
      "id": "M-SS-261",
      "name": "17-4 PH H900",
      "designation": {
            "aisi": "17-4PH",
            "uns": "S17400",
            "din": "1.4542",
            "en": "X5CrNiCuNb16-4"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H900",
      "composition": {
            "C": 0.07,
            "Cr": 16.0,
            "Ni": 4.0,
            "Cu": 4.0,
            "Nb": 0.3
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 18.4,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 367,
                  "rockwell_c": 44
            },
            "tensile_strength": {
                  "typical": 1310
            },
            "yield_strength": {
                  "typical": 1170
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 3091,
            "mc": 0.22
      },
      "taylor": {
            "C": 114,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 450,
            "B": 950,
            "n": 0.4,
            "C": 0.04,
            "m": 0.93
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 40,
                              "opt": 58,
                              "max": 78
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "K10 Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, honed edge",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-262": {
      "id": "M-SS-262",
      "name": "17-4 PH H925",
      "designation": {
            "aisi": "17-4PH",
            "uns": "S17400",
            "din": "1.4542",
            "en": "X5CrNiCuNb16-4"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H925",
      "composition": {
            "C": 0.07,
            "Cr": 16.0,
            "Ni": 4.0,
            "Cu": 4.0,
            "Nb": 0.3
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 18.4,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 349,
                  "rockwell_c": 42
            },
            "tensile_strength": {
                  "typical": 1170
            },
            "yield_strength": {
                  "typical": 1070
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 3006,
            "mc": 0.22
      },
      "taylor": {
            "C": 121,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 450,
            "B": 950,
            "n": 0.4,
            "C": 0.04,
            "m": 0.93
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 43,
                              "opt": 62,
                              "max": 83
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "K10 Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, honed edge",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-263": {
      "id": "M-SS-263",
      "name": "17-4 PH H1025",
      "designation": {
            "aisi": "17-4PH",
            "uns": "S17400",
            "din": "1.4542",
            "en": "X5CrNiCuNb16-4"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H1025",
      "composition": {
            "C": 0.07,
            "Cr": 16.0,
            "Ni": 4.0,
            "Cu": 4.0,
            "Nb": 0.3
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 18.4,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 316,
                  "rockwell_c": 38
            },
            "tensile_strength": {
                  "typical": 1070
            },
            "yield_strength": {
                  "typical": 1000
            },
            "elongation": {
                  "typical": 14
            }
      },
      "kienzle": {
            "kc1_1": 2856,
            "mc": 0.22
      },
      "taylor": {
            "C": 136,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 450,
            "B": 950,
            "n": 0.4,
            "C": 0.04,
            "m": 0.93
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 48,
                              "opt": 69,
                              "max": 93
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P20",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-264": {
      "id": "M-SS-264",
      "name": "17-4 PH H1075",
      "designation": {
            "aisi": "17-4PH",
            "uns": "S17400",
            "din": "1.4542",
            "en": "X5CrNiCuNb16-4"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H1075",
      "composition": {
            "C": 0.07,
            "Cr": 16.0,
            "Ni": 4.0,
            "Cu": 4.0,
            "Nb": 0.3
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 18.4,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 302,
                  "rockwell_c": 36
            },
            "tensile_strength": {
                  "typical": 1000
            },
            "yield_strength": {
                  "typical": 860
            },
            "elongation": {
                  "typical": 14
            }
      },
      "kienzle": {
            "kc1_1": 2795,
            "mc": 0.22
      },
      "taylor": {
            "C": 144,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 450,
            "B": 950,
            "n": 0.4,
            "C": 0.04,
            "m": 0.93
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 50,
                              "opt": 72,
                              "max": 97
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P20",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-265": {
      "id": "M-SS-265",
      "name": "17-4 PH H1100",
      "designation": {
            "aisi": "17-4PH",
            "uns": "S17400",
            "din": "1.4542",
            "en": "X5CrNiCuNb16-4"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H1100",
      "composition": {
            "C": 0.07,
            "Cr": 16.0,
            "Ni": 4.0,
            "Cu": 4.0,
            "Nb": 0.3
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 18.4,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 289,
                  "rockwell_c": 34
            },
            "tensile_strength": {
                  "typical": 965
            },
            "yield_strength": {
                  "typical": 795
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 2742,
            "mc": 0.22
      },
      "taylor": {
            "C": 152,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 450,
            "B": 950,
            "n": 0.4,
            "C": 0.04,
            "m": 0.93
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 53,
                              "opt": 76,
                              "max": 102
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P20",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-266": {
      "id": "M-SS-266",
      "name": "17-4 PH H1150",
      "designation": {
            "aisi": "17-4PH",
            "uns": "S17400",
            "din": "1.4542",
            "en": "X5CrNiCuNb16-4"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H1150",
      "composition": {
            "C": 0.07,
            "Cr": 16.0,
            "Ni": 4.0,
            "Cu": 4.0,
            "Nb": 0.3
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 18.4,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 271,
                  "rockwell_c": 31
            },
            "tensile_strength": {
                  "typical": 930
            },
            "yield_strength": {
                  "typical": 725
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 2700,
            "mc": 0.22
      },
      "taylor": {
            "C": 160,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 450,
            "B": 950,
            "n": 0.4,
            "C": 0.04,
            "m": 0.93
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 56,
                              "opt": 80,
                              "max": 108
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P20",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-267": {
      "id": "M-SS-267",
      "name": "15-5 PH Condition A",
      "designation": {
            "aisi": "15-5PH",
            "uns": "S15500",
            "din": "1.4540",
            "en": "X5CrNiCu15-5"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "Condition A",
      "composition": {
            "C": 0.07,
            "Cr": 15.0,
            "Ni": 5.0,
            "Cu": 3.5,
            "Nb": 0.3
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 18.4,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 277
            },
            "tensile_strength": {
                  "typical": 1070
            },
            "yield_strength": {
                  "typical": 795
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 2750,
            "mc": 0.22
      },
      "taylor": {
            "C": 155,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 460,
            "B": 970,
            "n": 0.4,
            "C": 0.038,
            "m": 0.92
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 52,
                              "opt": 75,
                              "max": 101
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P20-P30",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive rake",
            "coolant": "Flood recommended"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-268": {
      "id": "M-SS-268",
      "name": "15-5 PH H900",
      "designation": {
            "aisi": "15-5PH",
            "uns": "S15500",
            "din": "1.4540",
            "en": "X5CrNiCu15-5"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H900",
      "composition": {
            "C": 0.07,
            "Cr": 15.0,
            "Ni": 5.0,
            "Cu": 3.5,
            "Nb": 0.3
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 18.4,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 367,
                  "rockwell_c": 44
            },
            "tensile_strength": {
                  "typical": 1310
            },
            "yield_strength": {
                  "typical": 1170
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 3149,
            "mc": 0.22
      },
      "taylor": {
            "C": 110,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 460,
            "B": 970,
            "n": 0.4,
            "C": 0.038,
            "m": 0.92
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 38,
                              "opt": 55,
                              "max": 74
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "K10 Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, honed edge",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-269": {
      "id": "M-SS-269",
      "name": "15-5 PH H925",
      "designation": {
            "aisi": "15-5PH",
            "uns": "S15500",
            "din": "1.4540",
            "en": "X5CrNiCu15-5"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H925",
      "composition": {
            "C": 0.07,
            "Cr": 15.0,
            "Ni": 5.0,
            "Cu": 3.5,
            "Nb": 0.3
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 18.4,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 349,
                  "rockwell_c": 42
            },
            "tensile_strength": {
                  "typical": 1240
            },
            "yield_strength": {
                  "typical": 1105
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 3062,
            "mc": 0.22
      },
      "taylor": {
            "C": 117,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 460,
            "B": 970,
            "n": 0.4,
            "C": 0.038,
            "m": 0.92
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 40,
                              "opt": 58,
                              "max": 78
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "K10 Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, honed edge",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-270": {
      "id": "M-SS-270",
      "name": "15-5 PH H1025",
      "designation": {
            "aisi": "15-5PH",
            "uns": "S15500",
            "din": "1.4540",
            "en": "X5CrNiCu15-5"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H1025",
      "composition": {
            "C": 0.07,
            "Cr": 15.0,
            "Ni": 5.0,
            "Cu": 3.5,
            "Nb": 0.3
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 18.4,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 316,
                  "rockwell_c": 38
            },
            "tensile_strength": {
                  "typical": 1070
            },
            "yield_strength": {
                  "typical": 1000
            },
            "elongation": {
                  "typical": 14
            }
      },
      "kienzle": {
            "kc1_1": 2909,
            "mc": 0.22
      },
      "taylor": {
            "C": 132,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 460,
            "B": 970,
            "n": 0.4,
            "C": 0.038,
            "m": 0.92
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 44,
                              "opt": 64,
                              "max": 86
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P20",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-271": {
      "id": "M-SS-271",
      "name": "15-5 PH H1075",
      "designation": {
            "aisi": "15-5PH",
            "uns": "S15500",
            "din": "1.4540",
            "en": "X5CrNiCu15-5"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H1075",
      "composition": {
            "C": 0.07,
            "Cr": 15.0,
            "Ni": 5.0,
            "Cu": 3.5,
            "Nb": 0.3
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 18.4,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 302,
                  "rockwell_c": 36
            },
            "tensile_strength": {
                  "typical": 1000
            },
            "yield_strength": {
                  "typical": 860
            },
            "elongation": {
                  "typical": 14
            }
      },
      "kienzle": {
            "kc1_1": 2847,
            "mc": 0.22
      },
      "taylor": {
            "C": 139,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 460,
            "B": 970,
            "n": 0.4,
            "C": 0.038,
            "m": 0.92
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 47,
                              "opt": 68,
                              "max": 91
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P20",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-272": {
      "id": "M-SS-272",
      "name": "15-5 PH H1100",
      "designation": {
            "aisi": "15-5PH",
            "uns": "S15500",
            "din": "1.4540",
            "en": "X5CrNiCu15-5"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H1100",
      "composition": {
            "C": 0.07,
            "Cr": 15.0,
            "Ni": 5.0,
            "Cu": 3.5,
            "Nb": 0.3
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 18.4,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 289,
                  "rockwell_c": 34
            },
            "tensile_strength": {
                  "typical": 965
            },
            "yield_strength": {
                  "typical": 795
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 2793,
            "mc": 0.22
      },
      "taylor": {
            "C": 147,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 460,
            "B": 970,
            "n": 0.4,
            "C": 0.038,
            "m": 0.92
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 49,
                              "opt": 71,
                              "max": 95
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P20",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-273": {
      "id": "M-SS-273",
      "name": "15-5 PH H1150",
      "designation": {
            "aisi": "15-5PH",
            "uns": "S15500",
            "din": "1.4540",
            "en": "X5CrNiCu15-5"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H1150",
      "composition": {
            "C": 0.07,
            "Cr": 15.0,
            "Ni": 5.0,
            "Cu": 3.5,
            "Nb": 0.3
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 18.4,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 271,
                  "rockwell_c": 31
            },
            "tensile_strength": {
                  "typical": 860
            },
            "yield_strength": {
                  "typical": 620
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 2750,
            "mc": 0.22
      },
      "taylor": {
            "C": 155,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 460,
            "B": 970,
            "n": 0.4,
            "C": 0.038,
            "m": 0.92
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 52,
                              "opt": 75,
                              "max": 101
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P20",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-274": {
      "id": "M-SS-274",
      "name": "17-7 PH Condition A",
      "designation": {
            "aisi": "17-7PH",
            "uns": "S17700",
            "din": "1.4568",
            "en": "X7CrNiAl17-7"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "Condition A",
      "composition": {
            "C": 0.09,
            "Cr": 17.0,
            "Ni": 7.0,
            "Al": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 16.4,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 229
            },
            "tensile_strength": {
                  "typical": 860
            },
            "yield_strength": {
                  "typical": 275
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 2650,
            "mc": 0.22
      },
      "taylor": {
            "C": 165,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 430,
            "B": 920,
            "n": 0.42,
            "C": 0.042,
            "m": 0.94
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 59,
                              "opt": 85,
                              "max": 114
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P20-P30",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive rake",
            "coolant": "Flood recommended"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-275": {
      "id": "M-SS-275",
      "name": "17-7 PH TH1050",
      "designation": {
            "aisi": "17-7PH",
            "uns": "S17700",
            "din": "1.4568",
            "en": "X7CrNiAl17-7"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "TH1050",
      "composition": {
            "C": 0.09,
            "Cr": 17.0,
            "Ni": 7.0,
            "Al": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 16.4,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 332,
                  "rockwell_c": 40
            },
            "tensile_strength": {
                  "typical": 1170
            },
            "yield_strength": {
                  "typical": 1030
            },
            "elongation": {
                  "typical": 13
            }
      },
      "kienzle": {
            "kc1_1": 3200,
            "mc": 0.22
      },
      "taylor": {
            "C": 105,
            "n": 0.17
      },
      "johnson_cook": {
            "A": 430,
            "B": 920,
            "n": 0.42,
            "C": 0.042,
            "m": 0.94
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 39,
                              "opt": 56,
                              "max": 75
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P20",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-276": {
      "id": "M-SS-276",
      "name": "17-7 PH RH950",
      "designation": {
            "aisi": "17-7PH",
            "uns": "S17700",
            "din": "1.4568",
            "en": "X7CrNiAl17-7"
      },
      "iso_group": "H",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "RH950",
      "composition": {
            "C": 0.09,
            "Cr": 17.0,
            "Ni": 7.0,
            "Al": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 16.4,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 387,
                  "rockwell_c": 46
            },
            "tensile_strength": {
                  "typical": 1450
            },
            "yield_strength": {
                  "typical": 1310
            },
            "elongation": {
                  "typical": 11
            }
      },
      "kienzle": {
            "kc1_1": 3530,
            "mc": 0.22
      },
      "taylor": {
            "C": 87,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 430,
            "B": 920,
            "n": 0.42,
            "C": 0.042,
            "m": 0.94
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 32,
                              "opt": 47,
                              "max": 63
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "K10 Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, honed edge",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-277": {
      "id": "M-SS-277",
      "name": "17-7 PH CH900",
      "designation": {
            "aisi": "17-7PH",
            "uns": "S17700",
            "din": "1.4568",
            "en": "X7CrNiAl17-7"
      },
      "iso_group": "H",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "CH900",
      "composition": {
            "C": 0.09,
            "Cr": 17.0,
            "Ni": 7.0,
            "Al": 1.0
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 16.4,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 409,
                  "rockwell_c": 48
            },
            "tensile_strength": {
                  "typical": 1650
            },
            "yield_strength": {
                  "typical": 1520
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 3666,
            "mc": 0.21
      },
      "taylor": {
            "C": 82,
            "n": 0.16
      },
      "johnson_cook": {
            "A": 430,
            "B": 920,
            "n": 0.42,
            "C": 0.042,
            "m": 0.94
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 30,
                              "opt": 44,
                              "max": 59
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "K10 Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, honed edge",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-278": {
      "id": "M-SS-278",
      "name": "PH 13-8 Mo Condition A",
      "designation": {
            "aisi": "PH13-8Mo",
            "uns": "S13800",
            "din": "1.4534",
            "en": "X3CrNiMoAl13-8-2"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "Condition A",
      "composition": {
            "C": 0.05,
            "Cr": 12.75,
            "Ni": 8.0,
            "Mo": 2.25,
            "Al": 1.1
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 13.0,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 302
            },
            "tensile_strength": {
                  "typical": 1000
            },
            "yield_strength": {
                  "typical": 585
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 2850,
            "mc": 0.21
      },
      "taylor": {
            "C": 145,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 500,
            "B": 1000,
            "n": 0.38,
            "C": 0.035,
            "m": 0.9
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 49,
                              "opt": 70,
                              "max": 94
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P20-P30",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive rake",
            "coolant": "Flood recommended"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-279": {
      "id": "M-SS-279",
      "name": "PH 13-8 Mo H950",
      "designation": {
            "aisi": "PH13-8Mo",
            "uns": "S13800",
            "din": "1.4534",
            "en": "X3CrNiMoAl13-8-2"
      },
      "iso_group": "H",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H950",
      "composition": {
            "C": 0.05,
            "Cr": 12.75,
            "Ni": 8.0,
            "Mo": 2.25,
            "Al": 1.1
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 13.0,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 409,
                  "rockwell_c": 48
            },
            "tensile_strength": {
                  "typical": 1520
            },
            "yield_strength": {
                  "typical": 1410
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 3305,
            "mc": 0.2
      },
      "taylor": {
            "C": 100,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 500,
            "B": 1000,
            "n": 0.38,
            "C": 0.035,
            "m": 0.9
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 35,
                              "opt": 50,
                              "max": 67
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "K10 Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, honed edge",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-280": {
      "id": "M-SS-280",
      "name": "PH 13-8 Mo H1000",
      "designation": {
            "aisi": "PH13-8Mo",
            "uns": "S13800",
            "din": "1.4534",
            "en": "X3CrNiMoAl13-8-2"
      },
      "iso_group": "H",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H1000",
      "composition": {
            "C": 0.05,
            "Cr": 12.75,
            "Ni": 8.0,
            "Mo": 2.25,
            "Al": 1.1
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 13.0,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 387,
                  "rockwell_c": 46
            },
            "tensile_strength": {
                  "typical": 1410
            },
            "yield_strength": {
                  "typical": 1275
            },
            "elongation": {
                  "typical": 11
            }
      },
      "kienzle": {
            "kc1_1": 3203,
            "mc": 0.21
      },
      "taylor": {
            "C": 107,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 500,
            "B": 1000,
            "n": 0.38,
            "C": 0.035,
            "m": 0.9
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 37,
                              "opt": 53,
                              "max": 71
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "K10 Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, honed edge",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-281": {
      "id": "M-SS-281",
      "name": "PH 13-8 Mo H1025",
      "designation": {
            "aisi": "PH13-8Mo",
            "uns": "S13800",
            "din": "1.4534",
            "en": "X3CrNiMoAl13-8-2"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H1025",
      "composition": {
            "C": 0.05,
            "Cr": 12.75,
            "Ni": 8.0,
            "Mo": 2.25,
            "Al": 1.1
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 13.0,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 367,
                  "rockwell_c": 44
            },
            "tensile_strength": {
                  "typical": 1310
            },
            "yield_strength": {
                  "typical": 1170
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 3113,
            "mc": 0.21
      },
      "taylor": {
            "C": 114,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 500,
            "B": 1000,
            "n": 0.38,
            "C": 0.035,
            "m": 0.9
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 39,
                              "opt": 56,
                              "max": 75
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "K10 Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, honed edge",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-282": {
      "id": "M-SS-282",
      "name": "PH 13-8 Mo H1050",
      "designation": {
            "aisi": "PH13-8Mo",
            "uns": "S13800",
            "din": "1.4534",
            "en": "X3CrNiMoAl13-8-2"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H1050",
      "composition": {
            "C": 0.05,
            "Cr": 12.75,
            "Ni": 8.0,
            "Mo": 2.25,
            "Al": 1.1
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 13.0,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 349,
                  "rockwell_c": 42
            },
            "tensile_strength": {
                  "typical": 1240
            },
            "yield_strength": {
                  "typical": 1105
            },
            "elongation": {
                  "typical": 12
            }
      },
      "kienzle": {
            "kc1_1": 3034,
            "mc": 0.21
      },
      "taylor": {
            "C": 121,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 500,
            "B": 1000,
            "n": 0.38,
            "C": 0.035,
            "m": 0.9
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 41,
                              "opt": 59,
                              "max": 79
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "K10 Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, honed edge",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-283": {
      "id": "M-SS-283",
      "name": "PH 13-8 Mo H1100",
      "designation": {
            "aisi": "PH13-8Mo",
            "uns": "S13800",
            "din": "1.4534",
            "en": "X3CrNiMoAl13-8-2"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H1100",
      "composition": {
            "C": 0.05,
            "Cr": 12.75,
            "Ni": 8.0,
            "Mo": 2.25,
            "Al": 1.1
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 13.0,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 316,
                  "rockwell_c": 38
            },
            "tensile_strength": {
                  "typical": 1105
            },
            "yield_strength": {
                  "typical": 965
            },
            "elongation": {
                  "typical": 14
            }
      },
      "kienzle": {
            "kc1_1": 2898,
            "mc": 0.21
      },
      "taylor": {
            "C": 137,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 500,
            "B": 1000,
            "n": 0.38,
            "C": 0.035,
            "m": 0.9
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 46,
                              "opt": 66,
                              "max": 89
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P20",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-284": {
      "id": "M-SS-284",
      "name": "PH 13-8 Mo H1150",
      "designation": {
            "aisi": "PH13-8Mo",
            "uns": "S13800",
            "din": "1.4534",
            "en": "X3CrNiMoAl13-8-2"
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H1150",
      "composition": {
            "C": 0.05,
            "Cr": 12.75,
            "Ni": 8.0,
            "Mo": 2.25,
            "Al": 1.1
      },
      "physical": {
            "density": 7800,
            "thermal_conductivity": 13.0,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 289,
                  "rockwell_c": 34
            },
            "tensile_strength": {
                  "typical": 965
            },
            "yield_strength": {
                  "typical": 795
            },
            "elongation": {
                  "typical": 15
            }
      },
      "kienzle": {
            "kc1_1": 2850,
            "mc": 0.21
      },
      "taylor": {
            "C": 145,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 500,
            "B": 1000,
            "n": 0.38,
            "C": 0.035,
            "m": 0.9
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 49,
                              "opt": 70,
                              "max": 94
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P20",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-285": {
      "id": "M-SS-285",
      "name": "Custom 465 Condition A",
      "designation": {
            "aisi": "Custom465",
            "uns": "S46500",
            "din": "",
            "en": ""
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "Condition A",
      "composition": {
            "C": 0.02,
            "Cr": 11.5,
            "Ni": 11.0,
            "Mo": 1.0,
            "Ti": 1.6
      },
      "physical": {
            "density": 7830,
            "thermal_conductivity": 14.7,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 321
            },
            "tensile_strength": {
                  "typical": 895
            },
            "yield_strength": {
                  "typical": 550
            },
            "elongation": {
                  "typical": 16
            }
      },
      "kienzle": {
            "kc1_1": 2950,
            "mc": 0.21
      },
      "taylor": {
            "C": 140,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 520,
            "B": 1030,
            "n": 0.36,
            "C": 0.032,
            "m": 0.88
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 45,
                              "opt": 65,
                              "max": 87
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P20-P30",
            "coating": [
                  "TiAlN",
                  "TiCN"
            ],
            "geometry": "Positive rake",
            "coolant": "Flood recommended"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-286": {
      "id": "M-SS-286",
      "name": "Custom 465 H900",
      "designation": {
            "aisi": "Custom465",
            "uns": "S46500",
            "din": "",
            "en": ""
      },
      "iso_group": "H",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H900",
      "composition": {
            "C": 0.02,
            "Cr": 11.5,
            "Ni": 11.0,
            "Mo": 1.0,
            "Ti": 1.6
      },
      "physical": {
            "density": 7830,
            "thermal_conductivity": 14.7,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 445,
                  "rockwell_c": 51
            },
            "tensile_strength": {
                  "typical": 1760
            },
            "yield_strength": {
                  "typical": 1655
            },
            "elongation": {
                  "typical": 9
            }
      },
      "kienzle": {
            "kc1_1": 3468,
            "mc": 0.2
      },
      "taylor": {
            "C": 94,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 520,
            "B": 1030,
            "n": 0.36,
            "C": 0.032,
            "m": 0.88
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 31,
                              "opt": 45,
                              "max": 60
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
            "geometry": "Negative rake, T-land edge prep",
            "coolant": "Dry cutting required"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-287": {
      "id": "M-SS-287",
      "name": "Custom 465 H950",
      "designation": {
            "aisi": "Custom465",
            "uns": "S46500",
            "din": "",
            "en": ""
      },
      "iso_group": "H",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H950",
      "composition": {
            "C": 0.02,
            "Cr": 11.5,
            "Ni": 11.0,
            "Mo": 1.0,
            "Ti": 1.6
      },
      "physical": {
            "density": 7830,
            "thermal_conductivity": 14.7,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 421,
                  "rockwell_c": 49
            },
            "tensile_strength": {
                  "typical": 1655
            },
            "yield_strength": {
                  "typical": 1550
            },
            "elongation": {
                  "typical": 10
            }
      },
      "kienzle": {
            "kc1_1": 3358,
            "mc": 0.2
      },
      "taylor": {
            "C": 101,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 520,
            "B": 1030,
            "n": 0.36,
            "C": 0.032,
            "m": 0.88
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 33,
                              "opt": 48,
                              "max": 64
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "K10 Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, honed edge",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-288": {
      "id": "M-SS-288",
      "name": "Custom 465 H1000",
      "designation": {
            "aisi": "Custom465",
            "uns": "S46500",
            "din": "",
            "en": ""
      },
      "iso_group": "H",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H1000",
      "composition": {
            "C": 0.02,
            "Cr": 11.5,
            "Ni": 11.0,
            "Mo": 1.0,
            "Ti": 1.6
      },
      "physical": {
            "density": 7830,
            "thermal_conductivity": 14.7,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 397,
                  "rockwell_c": 47
            },
            "tensile_strength": {
                  "typical": 1520
            },
            "yield_strength": {
                  "typical": 1410
            },
            "elongation": {
                  "typical": 11
            }
      },
      "kienzle": {
            "kc1_1": 3252,
            "mc": 0.2
      },
      "taylor": {
            "C": 108,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 520,
            "B": 1030,
            "n": 0.36,
            "C": 0.032,
            "m": 0.88
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 35,
                              "opt": 51,
                              "max": 68
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "K10 Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, honed edge",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-289": {
      "id": "M-SS-289",
      "name": "Custom 465 H1025",
      "designation": {
            "aisi": "Custom465",
            "uns": "S46500",
            "din": "",
            "en": ""
      },
      "iso_group": "H",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H1025",
      "composition": {
            "C": 0.02,
            "Cr": 11.5,
            "Ni": 11.0,
            "Mo": 1.0,
            "Ti": 1.6
      },
      "physical": {
            "density": 7830,
            "thermal_conductivity": 14.7,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 377,
                  "rockwell_c": 45
            },
            "tensile_strength": {
                  "typical": 1410
            },
            "yield_strength": {
                  "typical": 1310
            },
            "elongation": {
                  "typical": 11
            }
      },
      "kienzle": {
            "kc1_1": 3166,
            "mc": 0.21
      },
      "taylor": {
            "C": 115,
            "n": 0.14
      },
      "johnson_cook": {
            "A": 520,
            "B": 1030,
            "n": 0.36,
            "C": 0.032,
            "m": 0.88
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 37,
                              "opt": 54,
                              "max": 72
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Ceramic or CBN",
            "insert_grade": "K10 Ceramic or CBN Grade 2",
            "coating": [
                  "None"
            ],
            "geometry": "Negative rake, honed edge",
            "coolant": "Dry preferred"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-290": {
      "id": "M-SS-290",
      "name": "Custom 465 H1100",
      "designation": {
            "aisi": "Custom465",
            "uns": "S46500",
            "din": "",
            "en": ""
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H1100",
      "composition": {
            "C": 0.02,
            "Cr": 11.5,
            "Ni": 11.0,
            "Mo": 1.0,
            "Ti": 1.6
      },
      "physical": {
            "density": 7830,
            "thermal_conductivity": 14.7,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 332,
                  "rockwell_c": 40
            },
            "tensile_strength": {
                  "typical": 1170
            },
            "yield_strength": {
                  "typical": 1070
            },
            "elongation": {
                  "typical": 13
            }
      },
      "kienzle": {
            "kc1_1": 2986,
            "mc": 0.21
      },
      "taylor": {
            "C": 134,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 520,
            "B": 1030,
            "n": 0.36,
            "C": 0.032,
            "m": 0.88
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 43,
                              "opt": 62,
                              "max": 83
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P20",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
},
    "M-SS-291": {
      "id": "M-SS-291",
      "name": "Custom 465 H1150",
      "designation": {
            "aisi": "Custom465",
            "uns": "S46500",
            "din": "",
            "en": ""
      },
      "iso_group": "M",
      "material_class": "Stainless Steel - Precipitation Hardening",
      "condition": "H1150",
      "composition": {
            "C": 0.02,
            "Cr": 11.5,
            "Ni": 11.0,
            "Mo": 1.0,
            "Ti": 1.6
      },
      "physical": {
            "density": 7830,
            "thermal_conductivity": 14.7,
            "elastic_modulus": 197000,
            "poissons_ratio": 0.29
      },
      "mechanical": {
            "hardness": {
                  "brinell": 302,
                  "rockwell_c": 36
            },
            "tensile_strength": {
                  "typical": 1000
            },
            "yield_strength": {
                  "typical": 860
            },
            "elongation": {
                  "typical": 14
            }
      },
      "kienzle": {
            "kc1_1": 2950,
            "mc": 0.21
      },
      "taylor": {
            "C": 140,
            "n": 0.15
      },
      "johnson_cook": {
            "A": 520,
            "B": 1030,
            "n": 0.36,
            "C": 0.032,
            "m": 0.88
      },
      "recommended_cutting": {
            "turning": {
                  "carbide": {
                        "speed": {
                              "min": 45,
                              "opt": 65,
                              "max": 87
                        }
                  }
            }
      },
      "tooling": {
            "primary": "Coated Carbide",
            "insert_grade": "P10-P20",
            "coating": [
                  "TiAlN",
                  "AlCrN"
            ],
            "geometry": "Neutral rake",
            "coolant": "Flood or MQL"
      },
      "applications": [
            "aerospace",
            "medical_devices",
            "nuclear",
            "high_strength_fasteners"
      ]
}
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = STAINLESS_CONDITIONS;
}
