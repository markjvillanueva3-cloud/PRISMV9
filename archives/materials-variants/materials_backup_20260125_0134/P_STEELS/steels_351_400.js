/**
 * PRISM MATERIALS DATABASE - FINAL P_STEELS BATCH
 * File: steels_351_400.js - P-CS-351 to P-CS-400 (50 materials)
 * COMPLETES P_STEELS CATEGORY AT 400/400 (100%)
 * 
 * Coverage includes:
 * - Bearing steel conditions (52100: Annealed to 64 HRC)
 * - Case hardening (8620, 9310: Core vs Case properties)
 * - Induction/Flame hardened surface conditions
 * - Nitrided surfaces (65-70 HRC)
 * - Hot rolled vs cold rolled vs forged
 * - EN/JIS international standards
 * - PH stainless aging conditions (17-4 PH: A, H1150, H1025, H925, H900)
 * - Maraging conditions (250/300: Solution vs Aged)
 * - PM tool steels (CPM-M4, CPM-10V)
 * - Spring and blade steels
 *
 * Generated: 2026-01-24 19:24:14
 */
const STEELS_351_400 = {
  metadata: {file: "steels_351_400.js", category: "P_STEELS", materialCount: 50,
             status: "CATEGORY COMPLETE", total_p_steels: 400},
  materials: {
    "P-CS-351": {
          "id": "P-CS-351",
          "name": "52100 Bearing Steel Annealed",
          "designation": {
                "aisi_sae": "52100",
                "uns": "G52986",
                "din": "1.3505",
                "en": "100Cr6",
                "jis": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Bearing Condition",
          "condition": "Spheroidize Annealed 187 HB",
          "composition": {
                "carbon": {
                      "min": 0.98,
                      "max": 1.1,
                      "typical": 1.02
                },
                "chromium": {
                      "min": 1.3,
                      "max": 1.6,
                      "typical": 1.45
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 46.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 187,
                      "rockwell_c": null
                },
                "tensile_strength": {
                      "typical": 650
                },
                "yield_strength": {
                      "typical": 430
                },
                "elongation": {
                      "typical": 20
                }
          },
          "kienzle": {
                "kc1_1": 1880,
                "mc": 0.24
          },
          "johnson_cook": {
                "A": 480,
                "B": 700,
                "n": 0.46,
                "C": 0.028,
                "m": 0.92
          },
          "taylor": {
                "C": 150,
                "n": 0.21
          },
          "machinability": {
                "aisi_rating": 55
          },
          "notes": "Spheroidize annealed - best machinability for bearing rings"
    },

    "P-CS-352": {
          "id": "P-CS-352",
          "name": "52100 Bearing Steel 58 HRC",
          "designation": {
                "aisi_sae": "52100",
                "uns": "G52986",
                "din": "1.3505",
                "en": "100Cr6",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Bearing Condition",
          "condition": "Through Hardened 58 HRC",
          "composition": {
                "carbon": {
                      "min": 0.98,
                      "max": 1.1,
                      "typical": 1.02
                },
                "chromium": {
                      "min": 1.3,
                      "max": 1.6,
                      "typical": 1.45
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 46.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 600,
                      "rockwell_c": 58
                },
                "tensile_strength": {
                      "typical": 2070
                },
                "yield_strength": {
                      "typical": 1930
                },
                "elongation": {
                      "typical": 1
                }
          },
          "kienzle": {
                "kc1_1": 4050,
                "mc": 0.18
          },
          "johnson_cook": {
                "A": 1760,
                "B": 990,
                "n": 0.2,
                "C": 0.005,
                "m": 1.18
          },
          "taylor": {
                "C": 45,
                "n": 0.08
          },
          "machinability": {
                "aisi_rating": 10
          },
          "notes": "Minimum bearing hardness - smaller bearings"
    },

    "P-CS-353": {
          "id": "P-CS-353",
          "name": "52100 Bearing Steel 62 HRC",
          "designation": {
                "aisi_sae": "52100",
                "uns": "G52986",
                "din": "1.3505",
                "en": "100Cr6",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Bearing Condition",
          "condition": "Through Hardened 62 HRC",
          "composition": {
                "carbon": {
                      "min": 0.98,
                      "max": 1.1,
                      "typical": 1.02
                },
                "chromium": {
                      "min": 1.3,
                      "max": 1.6,
                      "typical": 1.45
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 46.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 650,
                      "rockwell_c": 62
                },
                "tensile_strength": {
                      "typical": 2280
                },
                "yield_strength": {
                      "typical": 2150
                },
                "elongation": {
                      "typical": 0
                }
          },
          "kienzle": {
                "kc1_1": 4500,
                "mc": 0.17
          },
          "johnson_cook": {
                "A": 1950,
                "B": 1050,
                "n": 0.18,
                "C": 0.004,
                "m": 1.22
          },
          "taylor": {
                "C": 35,
                "n": 0.06
          },
          "machinability": {
                "aisi_rating": 6
          },
          "notes": "Standard bearing hardness - rolling element bearings"
    },

    "P-CS-354": {
          "id": "P-CS-354",
          "name": "52100 Bearing Steel 64 HRC Max",
          "designation": {
                "aisi_sae": "52100",
                "uns": "G52986",
                "din": "1.3505",
                "en": "100Cr6",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Bearing Condition",
          "condition": "Through Hardened 64 HRC (Maximum)",
          "composition": {
                "carbon": {
                      "min": 0.98,
                      "max": 1.1,
                      "typical": 1.02
                },
                "chromium": {
                      "min": 1.3,
                      "max": 1.6,
                      "typical": 1.45
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 46.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 700,
                      "rockwell_c": 64
                },
                "tensile_strength": {
                      "typical": 2420
                },
                "yield_strength": {
                      "typical": 2300
                },
                "elongation": {
                      "typical": 0
                }
          },
          "kienzle": {
                "kc1_1": 4850,
                "mc": 0.17
          },
          "johnson_cook": {
                "A": 2080,
                "B": 1100,
                "n": 0.16,
                "C": 0.003,
                "m": 1.26
          },
          "taylor": {
                "C": 28,
                "n": 0.05
          },
          "machinability": {
                "aisi_rating": 4
          },
          "notes": "Maximum hardness - precision grinding only"
    },

    "P-CS-355": {
          "id": "P-CS-355",
          "name": "8620 Case Hardening Annealed",
          "designation": {
                "aisi_sae": "8620",
                "uns": "G86200",
                "din": "1.6523",
                "en": "21NiCrMo2",
                "jis": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Case Hardening",
          "condition": "Annealed 149 HB",
          "composition": {
                "carbon": {
                      "min": 0.18,
                      "max": 0.23,
                      "typical": 0.2
                },
                "chromium": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0.4,
                      "max": 0.7,
                      "typical": 0.55
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7852,
                "thermal_conductivity": 46.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 149,
                      "rockwell_c": null
                },
                "tensile_strength": {
                      "typical": 515
                },
                "yield_strength": {
                      "typical": 360
                },
                "elongation": {
                      "typical": 24
                }
          },
          "kienzle": {
                "kc1_1": 1620,
                "mc": 0.25
          },
          "johnson_cook": {
                "A": 380,
                "B": 620,
                "n": 0.52,
                "C": 0.038,
                "m": 0.88
          },
          "taylor": {
                "C": 175,
                "n": 0.24
          },
          "machinability": {
                "aisi_rating": 65
          },
          "notes": "Fully annealed - machining before carburizing"
    },

    "P-CS-356": {
          "id": "P-CS-356",
          "name": "8620 Carburized Case 58 HRC",
          "designation": {
                "aisi_sae": "8620",
                "uns": "G86200",
                "din": "1.6523",
                "en": "21NiCrMo2",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Case Hardening",
          "condition": "Carburized 58 HRC Case / 35 HRC Core",
          "composition": {
                "carbon": {
                      "min": 0.18,
                      "max": 0.23,
                      "typical": 0.2
                },
                "chromium": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0.4,
                      "max": 0.7,
                      "typical": 0.55
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7852,
                "thermal_conductivity": 46.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 600,
                      "rockwell_c": 58
                },
                "tensile_strength": {
                      "typical": 2070
                },
                "yield_strength": {
                      "typical": 1850
                },
                "elongation": {
                      "typical": 4
                }
          },
          "kienzle": {
                "kc1_1": 4000,
                "mc": 0.18
          },
          "johnson_cook": {
                "A": 1700,
                "B": 970,
                "n": 0.22,
                "C": 0.006,
                "m": 1.16
          },
          "taylor": {
                "C": 50,
                "n": 0.09
          },
          "machinability": {
                "aisi_rating": 12
          },
          "notes": "Standard carburized - automotive gears"
    },

    "P-CS-357": {
          "id": "P-CS-357",
          "name": "8620 Carburized Case 62 HRC",
          "designation": {
                "aisi_sae": "8620",
                "uns": "G86200",
                "din": "1.6523",
                "en": "21NiCrMo2",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Case Hardening",
          "condition": "Carburized 62 HRC Case / 38 HRC Core",
          "composition": {
                "carbon": {
                      "min": 0.18,
                      "max": 0.23,
                      "typical": 0.2
                },
                "chromium": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0.4,
                      "max": 0.7,
                      "typical": 0.55
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7852,
                "thermal_conductivity": 46.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 650,
                      "rockwell_c": 62
                },
                "tensile_strength": {
                      "typical": 2280
                },
                "yield_strength": {
                      "typical": 2050
                },
                "elongation": {
                      "typical": 3
                }
          },
          "kienzle": {
                "kc1_1": 4500,
                "mc": 0.17
          },
          "johnson_cook": {
                "A": 1920,
                "B": 1040,
                "n": 0.18,
                "C": 0.004,
                "m": 1.22
          },
          "taylor": {
                "C": 40,
                "n": 0.07
          },
          "machinability": {
                "aisi_rating": 8
          },
          "notes": "High hardness carburized - heavy duty gears"
    },

    "P-CS-358": {
          "id": "P-CS-358",
          "name": "9310 Aircraft Gear Annealed",
          "designation": {
                "aisi_sae": "9310",
                "uns": "G93106",
                "din": "1.6657",
                "en": "14NiCrMo13-4",
                "jis": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Aircraft Gear",
          "condition": "Annealed 248 HB Max",
          "composition": {
                "carbon": {
                      "min": 0.08,
                      "max": 0.13,
                      "typical": 0.11
                },
                "chromium": {
                      "min": 1.0,
                      "max": 1.4,
                      "typical": 1.2
                },
                "molybdenum": {
                      "min": 0.08,
                      "max": 0.15,
                      "typical": 0.12
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 3.0,
                      "max": 3.5,
                      "typical": 3.25
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7866,
                "thermal_conductivity": 38.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 248,
                      "rockwell_c": null
                },
                "tensile_strength": {
                      "typical": 860
                },
                "yield_strength": {
                      "typical": 650
                },
                "elongation": {
                      "typical": 16
                }
          },
          "kienzle": {
                "kc1_1": 2150,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 680,
                "B": 820,
                "n": 0.4,
                "C": 0.018,
                "m": 1.0
          },
          "taylor": {
                "C": 130,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 45
          },
          "notes": "Annealed - roughing before carburizing"
    },

    "P-CS-359": {
          "id": "P-CS-359",
          "name": "9310 Carburized 60 HRC Case",
          "designation": {
                "aisi_sae": "9310",
                "uns": "G93106",
                "din": "1.6657",
                "en": "14NiCrMo13-4",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Aircraft Gear",
          "condition": "Carburized 60 HRC Case / 35 HRC Core",
          "composition": {
                "carbon": {
                      "min": 0.08,
                      "max": 0.13,
                      "typical": 0.11
                },
                "chromium": {
                      "min": 1.0,
                      "max": 1.4,
                      "typical": 1.2
                },
                "molybdenum": {
                      "min": 0.08,
                      "max": 0.15,
                      "typical": 0.12
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 3.0,
                      "max": 3.5,
                      "typical": 3.25
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7866,
                "thermal_conductivity": 38.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 600,
                      "rockwell_c": 60
                },
                "tensile_strength": {
                      "typical": 2000
                },
                "yield_strength": {
                      "typical": 1800
                },
                "elongation": {
                      "typical": 4
                }
          },
          "kienzle": {
                "kc1_1": 4200,
                "mc": 0.18
          },
          "johnson_cook": {
                "A": 1750,
                "B": 980,
                "n": 0.21,
                "C": 0.005,
                "m": 1.18
          },
          "taylor": {
                "C": 45,
                "n": 0.08
          },
          "machinability": {
                "aisi_rating": 10
          },
          "notes": "Carburized - helicopter transmission gears"
    },

    "P-CS-360": {
          "id": "P-CS-360",
          "name": "4140 Induction Hardened 55 HRC Surface",
          "designation": {
                "aisi_sae": "4140",
                "uns": "G41400",
                "din": "1.7225",
                "en": "42CrMo4",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Induction Hardened",
          "condition": "Induction Hardened 55 HRC Surface / 28 HRC Core",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.41
                },
                "chromium": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 0.95
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 42.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 550,
                      "rockwell_c": 55
                },
                "tensile_strength": {
                      "typical": 1900
                },
                "yield_strength": {
                      "typical": 1700
                },
                "elongation": {
                      "typical": 5
                }
          },
          "kienzle": {
                "kc1_1": 3700,
                "mc": 0.19
          },
          "johnson_cook": {
                "A": 1580,
                "B": 970,
                "n": 0.23,
                "C": 0.007,
                "m": 1.14
          },
          "taylor": {
                "C": 55,
                "n": 0.1
          },
          "machinability": {
                "aisi_rating": 14
          },
          "notes": "Induction hardened - shafts, spindles"
    },

    "P-CS-361": {
          "id": "P-CS-361",
          "name": "4140 Flame Hardened 52 HRC Surface",
          "designation": {
                "aisi_sae": "4140",
                "uns": "G41400",
                "din": "1.7225",
                "en": "42CrMo4",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Flame Hardened",
          "condition": "Flame Hardened 52 HRC Surface / 26 HRC Core",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.41
                },
                "chromium": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 0.95
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 42.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 510,
                      "rockwell_c": 52
                },
                "tensile_strength": {
                      "typical": 1720
                },
                "yield_strength": {
                      "typical": 1520
                },
                "elongation": {
                      "typical": 6
                }
          },
          "kienzle": {
                "kc1_1": 3450,
                "mc": 0.19
          },
          "johnson_cook": {
                "A": 1450,
                "B": 960,
                "n": 0.25,
                "C": 0.008,
                "m": 1.12
          },
          "taylor": {
                "C": 68,
                "n": 0.11
          },
          "machinability": {
                "aisi_rating": 18
          },
          "notes": "Flame hardened - large gears, machine ways"
    },

    "P-CS-362": {
          "id": "P-CS-362",
          "name": "4140 Nitrided 65+ HRC Surface",
          "designation": {
                "aisi_sae": "4140N",
                "uns": "G41400",
                "din": "1.8519",
                "en": "31CrMoV9",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Nitrided",
          "condition": "Nitrided 65 HRC Surface / 30 HRC Core",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.41
                },
                "chromium": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 0.95
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 42.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 725,
                      "rockwell_c": 65
                },
                "tensile_strength": {
                      "typical": 2520
                },
                "yield_strength": {
                      "typical": 2300
                },
                "elongation": {
                      "typical": 3
                }
          },
          "kienzle": {
                "kc1_1": 5100,
                "mc": 0.16
          },
          "johnson_cook": {
                "A": 2200,
                "B": 1150,
                "n": 0.14,
                "C": 0.003,
                "m": 1.3
          },
          "taylor": {
                "C": 22,
                "n": 0.04
          },
          "machinability": {
                "aisi_rating": 3
          },
          "notes": "Nitrided surface - GRINDING ONLY on case"
    },

    "P-CS-363": {
          "id": "P-CS-363",
          "name": "Nitralloy 135M Nitriding Steel",
          "designation": {
                "aisi_sae": "Nitralloy135M",
                "uns": "K24065",
                "din": "1.8519",
                "en": "31CrMoV9",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Nitriding Steel",
          "condition": "Core 30 HRC + Nitrided 70 HRC Surface",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.45,
                      "typical": 0.42
                },
                "chromium": {
                      "min": 1.4,
                      "max": 1.8,
                      "typical": 1.6
                },
                "molybdenum": {
                      "min": 0.3,
                      "max": 0.5,
                      "typical": 0.4
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.2,
                      "typical": 0.1
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7735,
                "thermal_conductivity": 32.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 800,
                      "rockwell_c": 70
                },
                "tensile_strength": {
                      "typical": 2800
                },
                "yield_strength": {
                      "typical": 2600
                },
                "elongation": {
                      "typical": 1
                }
          },
          "kienzle": {
                "kc1_1": 5800,
                "mc": 0.15
          },
          "johnson_cook": {
                "A": 2500,
                "B": 1200,
                "n": 0.12,
                "C": 0.002,
                "m": 1.35
          },
          "taylor": {
                "C": 18,
                "n": 0.03
          },
          "machinability": {
                "aisi_rating": 2
          },
          "notes": "Aluminum nitriding grade - 70 HRC achievable, grinding only"
    },

    "P-CS-364": {
          "id": "P-CS-364",
          "name": "AISI 1020 Hot Rolled",
          "designation": {
                "aisi_sae": "1020",
                "uns": "G10200",
                "din": "1.0402",
                "en": "C22",
                "jis": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Rolling Condition",
          "condition": "Hot Rolled As-Rolled",
          "composition": {
                "carbon": {
                      "min": 0.18,
                      "max": 0.23,
                      "typical": 0.2
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 51.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 111,
                      "rockwell_c": null
                },
                "tensile_strength": {
                      "typical": 380
                },
                "yield_strength": {
                      "typical": 205
                },
                "elongation": {
                      "typical": 28
                }
          },
          "kienzle": {
                "kc1_1": 1420,
                "mc": 0.26
          },
          "johnson_cook": {
                "A": 280,
                "B": 520,
                "n": 0.58,
                "C": 0.052,
                "m": 0.8
          },
          "taylor": {
                "C": 195,
                "n": 0.26
          },
          "machinability": {
                "aisi_rating": 72
          },
          "notes": "Hot rolled - scale, decarb surface"
    },

    "P-CS-365": {
          "id": "P-CS-365",
          "name": "AISI 1020 Cold Rolled",
          "designation": {
                "aisi_sae": "1020",
                "uns": "G10200",
                "din": "1.0402",
                "en": "C22",
                "jis": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Rolling Condition",
          "condition": "Cold Rolled",
          "composition": {
                "carbon": {
                      "min": 0.18,
                      "max": 0.23,
                      "typical": 0.2
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 51.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 131,
                      "rockwell_c": null
                },
                "tensile_strength": {
                      "typical": 450
                },
                "yield_strength": {
                      "typical": 380
                },
                "elongation": {
                      "typical": 18
                }
          },
          "kienzle": {
                "kc1_1": 1550,
                "mc": 0.25
          },
          "johnson_cook": {
                "A": 340,
                "B": 580,
                "n": 0.52,
                "C": 0.042,
                "m": 0.84
          },
          "taylor": {
                "C": 182,
                "n": 0.25
          },
          "machinability": {
                "aisi_rating": 68
          },
          "notes": "Cold rolled - clean surface, tighter tolerances"
    },

    "P-CS-366": {
          "id": "P-CS-366",
          "name": "ASTM A36 Hot Rolled Structural",
          "designation": {
                "aisi_sae": "A36",
                "uns": "K02600",
                "din": "1.0038",
                "en": "S235JR",
                "jis": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Structural Condition",
          "condition": "Hot Rolled",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.26,
                      "typical": 0.18
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 52.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 119,
                      "rockwell_c": null
                },
                "tensile_strength": {
                      "typical": 400
                },
                "yield_strength": {
                      "typical": 250
                },
                "elongation": {
                      "typical": 23
                }
          },
          "kienzle": {
                "kc1_1": 1480,
                "mc": 0.26
          },
          "johnson_cook": {
                "A": 300,
                "B": 540,
                "n": 0.56,
                "C": 0.048,
                "m": 0.82
          },
          "taylor": {
                "C": 190,
                "n": 0.26
          },
          "machinability": {
                "aisi_rating": 70
          },
          "notes": "Most common structural steel - bridges, buildings"
    },

    "P-CS-367": {
          "id": "P-CS-367",
          "name": "ASTM A36 Normalized",
          "designation": {
                "aisi_sae": "A36",
                "uns": "K02600",
                "din": "1.0038",
                "en": "S235JR+N",
                "jis": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Structural Condition",
          "condition": "Normalized (+N)",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.26,
                      "typical": 0.18
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 52.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 137,
                      "rockwell_c": null
                },
                "tensile_strength": {
                      "typical": 475
                },
                "yield_strength": {
                      "typical": 310
                },
                "elongation": {
                      "typical": 21
                }
          },
          "kienzle": {
                "kc1_1": 1580,
                "mc": 0.25
          },
          "johnson_cook": {
                "A": 360,
                "B": 600,
                "n": 0.52,
                "C": 0.04,
                "m": 0.86
          },
          "taylor": {
                "C": 175,
                "n": 0.24
          },
          "machinability": {
                "aisi_rating": 65
          },
          "notes": "Normalized - finer grain, improved impact"
    },

    "P-CS-368": {
          "id": "P-CS-368",
          "name": "C45 +N (Normalized)",
          "designation": {
                "aisi_sae": "",
                "uns": "",
                "din": "1.0503",
                "en": "C45+N",
                "jis": ""
          },
          "iso_group": "P",
          "material_class": "Steel - En Condition",
          "condition": "Normalized (+N) per EN 10083",
          "composition": {
                "carbon": {
                      "min": 0.42,
                      "max": 0.5,
                      "typical": 0.45
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 50.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 190,
                      "rockwell_c": null
                },
                "tensile_strength": {
                      "typical": 620
                },
                "yield_strength": {
                      "typical": 340
                },
                "elongation": {
                      "typical": 14
                }
          },
          "kienzle": {
                "kc1_1": 1880,
                "mc": 0.24
          },
          "johnson_cook": {
                "A": 450,
                "B": 700,
                "n": 0.46,
                "C": 0.028,
                "m": 0.92
          },
          "taylor": {
                "C": 150,
                "n": 0.21
          },
          "machinability": {
                "aisi_rating": 55
          },
          "notes": "European 1045 equivalent - normalized condition"
    },

    "P-CS-369": {
          "id": "P-CS-369",
          "name": "C45 +QT (Quenched & Tempered)",
          "designation": {
                "aisi_sae": "",
                "uns": "",
                "din": "1.0503",
                "en": "C45+QT",
                "jis": ""
          },
          "iso_group": "P",
          "material_class": "Steel - En Condition",
          "condition": "Q&T (+QT) per EN 10083",
          "composition": {
                "carbon": {
                      "min": 0.42,
                      "max": 0.5,
                      "typical": 0.45
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 50.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 241,
                      "rockwell_c": 24
                },
                "tensile_strength": {
                      "typical": 800
                },
                "yield_strength": {
                      "typical": 580
                },
                "elongation": {
                      "typical": 11
                }
          },
          "kienzle": {
                "kc1_1": 2100,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 620,
                "B": 800,
                "n": 0.4,
                "C": 0.02,
                "m": 0.98
          },
          "taylor": {
                "C": 135,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 48
          },
          "notes": "European 1045 - quenched & tempered"
    },

    "P-CS-370": {
          "id": "P-CS-370",
          "name": "C45E +QT (Q&T High Spec)",
          "designation": {
                "aisi_sae": "",
                "uns": "",
                "din": "1.1191",
                "en": "C45E+QT",
                "jis": ""
          },
          "iso_group": "P",
          "material_class": "Steel - En Condition",
          "condition": "Q&T (+QT) per EN 10083-1",
          "composition": {
                "carbon": {
                      "min": 0.42,
                      "max": 0.5,
                      "typical": 0.46
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 50.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 255,
                      "rockwell_c": 26
                },
                "tensile_strength": {
                      "typical": 850
                },
                "yield_strength": {
                      "typical": 620
                },
                "elongation": {
                      "typical": 10
                }
          },
          "kienzle": {
                "kc1_1": 2180,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 670,
                "B": 830,
                "n": 0.38,
                "C": 0.018,
                "m": 1.0
          },
          "taylor": {
                "C": 130,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 45
          },
          "notes": "High specification C45 - tighter composition control"
    },

    "P-CS-371": {
          "id": "P-CS-371",
          "name": "JIS S45C Annealed",
          "designation": {
                "aisi_sae": "",
                "uns": "",
                "din": "",
                "en": "",
                "jis": "S45C"
          },
          "iso_group": "P",
          "material_class": "Steel - Jis Standard",
          "condition": "Annealed (JIS)",
          "composition": {
                "carbon": {
                      "min": 0.42,
                      "max": 0.48,
                      "typical": 0.45
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 50.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 167,
                      "rockwell_c": null
                },
                "tensile_strength": {
                      "typical": 570
                },
                "yield_strength": {
                      "typical": 345
                },
                "elongation": {
                      "typical": 20
                }
          },
          "kienzle": {
                "kc1_1": 1780,
                "mc": 0.24
          },
          "johnson_cook": {
                "A": 420,
                "B": 680,
                "n": 0.48,
                "C": 0.03,
                "m": 0.9
          },
          "taylor": {
                "C": 160,
                "n": 0.22
          },
          "machinability": {
                "aisi_rating": 58
          },
          "notes": "Japanese 1045 equivalent - annealed"
    },

    "P-CS-372": {
          "id": "P-CS-372",
          "name": "JIS S45C Q&T 25 HRC",
          "designation": {
                "aisi_sae": "",
                "uns": "",
                "din": "",
                "en": "",
                "jis": "S45C"
          },
          "iso_group": "P",
          "material_class": "Steel - Jis Standard",
          "condition": "Q&T 25 HRC (JIS)",
          "composition": {
                "carbon": {
                      "min": 0.42,
                      "max": 0.48,
                      "typical": 0.45
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 50.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 250,
                      "rockwell_c": 25
                },
                "tensile_strength": {
                      "typical": 830
                },
                "yield_strength": {
                      "typical": 620
                },
                "elongation": {
                      "typical": 12
                }
          },
          "kienzle": {
                "kc1_1": 2120,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 650,
                "B": 810,
                "n": 0.38,
                "C": 0.018,
                "m": 1.0
          },
          "taylor": {
                "C": 135,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 48
          },
          "notes": "Japanese 1045 - Q&T condition"
    },

    "P-CS-373": {
          "id": "P-CS-373",
          "name": "JIS SCM440 Annealed",
          "designation": {
                "aisi_sae": "",
                "uns": "",
                "din": "",
                "en": "",
                "jis": "SCM440"
          },
          "iso_group": "P",
          "material_class": "Steel - Jis Standard",
          "condition": "Annealed (JIS)",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.41
                },
                "chromium": {
                      "min": 0.9,
                      "max": 1.2,
                      "typical": 1.05
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.3,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 42.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 195,
                      "rockwell_c": null
                },
                "tensile_strength": {
                      "typical": 655
                },
                "yield_strength": {
                      "typical": 415
                },
                "elongation": {
                      "typical": 18
                }
          },
          "kienzle": {
                "kc1_1": 1900,
                "mc": 0.24
          },
          "johnson_cook": {
                "A": 480,
                "B": 720,
                "n": 0.44,
                "C": 0.026,
                "m": 0.94
          },
          "taylor": {
                "C": 150,
                "n": 0.21
          },
          "machinability": {
                "aisi_rating": 55
          },
          "notes": "Japanese 4140 equivalent - annealed"
    },

    "P-CS-374": {
          "id": "P-CS-374",
          "name": "JIS SCM440 Q&T 30 HRC",
          "designation": {
                "aisi_sae": "",
                "uns": "",
                "din": "",
                "en": "",
                "jis": "SCM440"
          },
          "iso_group": "P",
          "material_class": "Steel - Jis Standard",
          "condition": "Q&T 30 HRC (JIS)",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.41
                },
                "chromium": {
                      "min": 0.9,
                      "max": 1.2,
                      "typical": 1.05
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.3,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 42.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 285,
                      "rockwell_c": 30
                },
                "tensile_strength": {
                      "typical": 980
                },
                "yield_strength": {
                      "typical": 860
                },
                "elongation": {
                      "typical": 13
                }
          },
          "kienzle": {
                "kc1_1": 2280,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 800,
                "B": 860,
                "n": 0.34,
                "C": 0.015,
                "m": 1.04
          },
          "taylor": {
                "C": 130,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 45
          },
          "notes": "Japanese 4140 - Q&T condition"
    },

    "P-CS-375": {
          "id": "P-CS-375",
          "name": "4140 Forged + Normalized",
          "designation": {
                "aisi_sae": "4140",
                "uns": "G41400",
                "din": "1.7225",
                "en": "42CrMo4",
                "jis": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Forged Condition",
          "condition": "Forged + Normalized",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.41
                },
                "chromium": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 0.95
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 42.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 210,
                      "rockwell_c": null
                },
                "tensile_strength": {
                      "typical": 710
                },
                "yield_strength": {
                      "typical": 470
                },
                "elongation": {
                      "typical": 18
                }
          },
          "kienzle": {
                "kc1_1": 2000,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 560,
                "B": 760,
                "n": 0.42,
                "C": 0.024,
                "m": 0.96
          },
          "taylor": {
                "C": 145,
                "n": 0.2
          },
          "machinability": {
                "aisi_rating": 52
          },
          "notes": "Forged - oriented grain, better fatigue"
    },

    "P-CS-376": {
          "id": "P-CS-376",
          "name": "4140 Forged + Q&T 32 HRC",
          "designation": {
                "aisi_sae": "4140",
                "uns": "G41400",
                "din": "1.7225",
                "en": "42CrMo4",
                "jis": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Forged Condition",
          "condition": "Forged + Q&T 32 HRC",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.41
                },
                "chromium": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 0.95
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.25,
                      "typical": 0.2
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 42.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 302,
                      "rockwell_c": 32
                },
                "tensile_strength": {
                      "typical": 1030
                },
                "yield_strength": {
                      "typical": 895
                },
                "elongation": {
                      "typical": 14
                }
          },
          "kienzle": {
                "kc1_1": 2380,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 850,
                "B": 860,
                "n": 0.34,
                "C": 0.014,
                "m": 1.05
          },
          "taylor": {
                "C": 125,
                "n": 0.17
          },
          "machinability": {
                "aisi_rating": 42
          },
          "notes": "Forged + Q&T - crankshafts, heavy machinery"
    },

    "P-CS-377": {
          "id": "P-CS-377",
          "name": "4340 Double Tempered 45 HRC",
          "designation": {
                "aisi_sae": "4340",
                "uns": "G43400",
                "din": "1.6582",
                "en": "34CrNiMo6",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Specialty Condition",
          "condition": "Double Tempered 45 HRC",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.41
                },
                "chromium": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.85
                },
                "molybdenum": {
                      "min": 0.2,
                      "max": 0.3,
                      "typical": 0.25
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 1.65,
                      "max": 2.0,
                      "typical": 1.85
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7859,
                "thermal_conductivity": 38.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 430,
                      "rockwell_c": 45
                },
                "tensile_strength": {
                      "typical": 1480
                },
                "yield_strength": {
                      "typical": 1380
                },
                "elongation": {
                      "typical": 10
                }
          },
          "kienzle": {
                "kc1_1": 2920,
                "mc": 0.2
          },
          "johnson_cook": {
                "A": 1200,
                "B": 900,
                "n": 0.28,
                "C": 0.01,
                "m": 1.1
          },
          "taylor": {
                "C": 92,
                "n": 0.14
          },
          "machinability": {
                "aisi_rating": 28
          },
          "notes": "Double temper - improved toughness at hardness"
    },

    "P-CS-378": {
          "id": "P-CS-378",
          "name": "4340 Sub-Zero Treated 50 HRC",
          "designation": {
                "aisi_sae": "4340",
                "uns": "G43400",
                "din": "1.6582",
                "en": "34CrNiMo6",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Specialty Condition",
          "condition": "Q&T + Sub-Zero (-120F) 50 HRC",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.43,
                      "typical": 0.41
                },
                "chromium": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.85
                },
                "molybdenum": {
                      "min": 0.2,
                      "max": 0.3,
                      "typical": 0.25
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 1.65,
                      "max": 2.0,
                      "typical": 1.85
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7859,
                "thermal_conductivity": 38.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 480,
                      "rockwell_c": 50
                },
                "tensile_strength": {
                      "typical": 1650
                },
                "yield_strength": {
                      "typical": 1560
                },
                "elongation": {
                      "typical": 8
                }
          },
          "kienzle": {
                "kc1_1": 3280,
                "mc": 0.19
          },
          "johnson_cook": {
                "A": 1400,
                "B": 940,
                "n": 0.25,
                "C": 0.008,
                "m": 1.12
          },
          "taylor": {
                "C": 78,
                "n": 0.13
          },
          "machinability": {
                "aisi_rating": 22
          },
          "notes": "Cryogenic treatment - retained austenite conversion"
    },

    "P-CS-379": {
          "id": "P-CS-379",
          "name": "H13 Premium ESR 48 HRC",
          "designation": {
                "aisi_sae": "H13",
                "uns": "T20813",
                "din": "1.2344ESR",
                "en": "X40CrMoV5-1ESR",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Premium Quality",
          "condition": "ESR + Hardened 48 HRC",
          "composition": {
                "carbon": {
                      "min": 0.37,
                      "max": 0.43,
                      "typical": 0.4
                },
                "chromium": {
                      "min": 5.0,
                      "max": 5.5,
                      "typical": 5.25
                },
                "molybdenum": {
                      "min": 1.25,
                      "max": 1.55,
                      "typical": 1.4
                },
                "vanadium": {
                      "min": 0.9,
                      "max": 1.1,
                      "typical": 1.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 24.5
          },
          "mechanical": {
                "hardness": {
                      "brinell": 460,
                      "rockwell_c": 48
                },
                "tensile_strength": {
                      "typical": 1550
                },
                "yield_strength": {
                      "typical": 1420
                },
                "elongation": {
                      "typical": 7
                }
          },
          "kienzle": {
                "kc1_1": 3200,
                "mc": 0.2
          },
          "johnson_cook": {
                "A": 1320,
                "B": 950,
                "n": 0.25,
                "C": 0.008,
                "m": 1.12
          },
          "taylor": {
                "C": 78,
                "n": 0.13
          },
          "machinability": {
                "aisi_rating": 22
          },
          "notes": "ESR remelted - superior die life, cleanliness"
    },

    "P-CS-380": {
          "id": "P-CS-380",
          "name": "H13 Vacuum Degassed 50 HRC",
          "designation": {
                "aisi_sae": "H13",
                "uns": "T20813",
                "din": "1.2344VAR",
                "en": "",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Premium Quality",
          "condition": "VAR + Hardened 50 HRC",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.42,
                      "typical": 0.4
                },
                "chromium": {
                      "min": 5.1,
                      "max": 5.4,
                      "typical": 5.25
                },
                "molybdenum": {
                      "min": 1.3,
                      "max": 1.5,
                      "typical": 1.4
                },
                "vanadium": {
                      "min": 0.95,
                      "max": 1.05,
                      "typical": 1.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 24.5
          },
          "mechanical": {
                "hardness": {
                      "brinell": 480,
                      "rockwell_c": 50
                },
                "tensile_strength": {
                      "typical": 1620
                },
                "yield_strength": {
                      "typical": 1500
                },
                "elongation": {
                      "typical": 6
                }
          },
          "kienzle": {
                "kc1_1": 3320,
                "mc": 0.19
          },
          "johnson_cook": {
                "A": 1380,
                "B": 960,
                "n": 0.24,
                "C": 0.008,
                "m": 1.13
          },
          "taylor": {
                "C": 72,
                "n": 0.12
          },
          "machinability": {
                "aisi_rating": 20
          },
          "notes": "Vacuum arc remelted - ultra premium dies"
    },

    "P-CS-381": {
          "id": "P-CS-381",
          "name": "17-4 PH Solution Annealed (A)",
          "designation": {
                "aisi_sae": "17-4PH",
                "uns": "S17400",
                "din": "1.4542",
                "en": "X5CrNiCuNb16-4",
                "jis": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Ph Condition",
          "condition": "Condition A (Solution Annealed)",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.07,
                      "typical": 0.04
                },
                "chromium": {
                      "min": 15.5,
                      "max": 17.5,
                      "typical": 16.5
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 3.0,
                      "max": 5.0,
                      "typical": 4.0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7870,
                "thermal_conductivity": 18.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 300,
                      "rockwell_c": 32
                },
                "tensile_strength": {
                      "typical": 1035
                },
                "yield_strength": {
                      "typical": 790
                },
                "elongation": {
                      "typical": 10
                }
          },
          "kienzle": {
                "kc1_1": 2350,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 800,
                "B": 860,
                "n": 0.36,
                "C": 0.016,
                "m": 1.02
          },
          "taylor": {
                "C": 125,
                "n": 0.17
          },
          "machinability": {
                "aisi_rating": 42
          },
          "notes": "Solution annealed - best machinability PH state"
    },

    "P-CS-382": {
          "id": "P-CS-382",
          "name": "17-4 PH H1150 (26 HRC)",
          "designation": {
                "aisi_sae": "17-4PH",
                "uns": "S17400",
                "din": "1.4542",
                "en": "X5CrNiCuNb16-4",
                "jis": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Ph Condition",
          "condition": "Condition H1150 (Overaged)",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.07,
                      "typical": 0.04
                },
                "chromium": {
                      "min": 15.5,
                      "max": 17.5,
                      "typical": 16.5
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 3.0,
                      "max": 5.0,
                      "typical": 4.0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7870,
                "thermal_conductivity": 18.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 260,
                      "rockwell_c": 26
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
                "kc1_1": 2200,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 720,
                "B": 840,
                "n": 0.38,
                "C": 0.018,
                "m": 1.0
          },
          "taylor": {
                "C": 135,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 48
          },
          "notes": "Overaged - max ductility, corrosion"
    },

    "P-CS-383": {
          "id": "P-CS-383",
          "name": "17-4 PH H1025 (35 HRC)",
          "designation": {
                "aisi_sae": "17-4PH",
                "uns": "S17400",
                "din": "1.4542",
                "en": "X5CrNiCuNb16-4",
                "jis": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Ph Condition",
          "condition": "Condition H1025",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.07,
                      "typical": 0.04
                },
                "chromium": {
                      "min": 15.5,
                      "max": 17.5,
                      "typical": 16.5
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 3.0,
                      "max": 5.0,
                      "typical": 4.0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7870,
                "thermal_conductivity": 18.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 330,
                      "rockwell_c": 35
                },
                "tensile_strength": {
                      "typical": 1100
                },
                "yield_strength": {
                      "typical": 1000
                },
                "elongation": {
                      "typical": 12
                }
          },
          "kienzle": {
                "kc1_1": 2550,
                "mc": 0.21
          },
          "johnson_cook": {
                "A": 920,
                "B": 880,
                "n": 0.32,
                "C": 0.012,
                "m": 1.06
          },
          "taylor": {
                "C": 115,
                "n": 0.16
          },
          "machinability": {
                "aisi_rating": 38
          },
          "notes": "Intermediate aging - balanced properties"
    },

    "P-CS-384": {
          "id": "P-CS-384",
          "name": "17-4 PH H925 (42 HRC)",
          "designation": {
                "aisi_sae": "17-4PH",
                "uns": "S17400",
                "din": "1.4542",
                "en": "X5CrNiCuNb16-4",
                "jis": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Ph Condition",
          "condition": "Condition H925",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.07,
                      "typical": 0.04
                },
                "chromium": {
                      "min": 15.5,
                      "max": 17.5,
                      "typical": 16.5
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 3.0,
                      "max": 5.0,
                      "typical": 4.0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7870,
                "thermal_conductivity": 18.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 400,
                      "rockwell_c": 42
                },
                "tensile_strength": {
                      "typical": 1310
                },
                "yield_strength": {
                      "typical": 1210
                },
                "elongation": {
                      "typical": 10
                }
          },
          "kienzle": {
                "kc1_1": 2800,
                "mc": 0.2
          },
          "johnson_cook": {
                "A": 1080,
                "B": 910,
                "n": 0.29,
                "C": 0.01,
                "m": 1.09
          },
          "taylor": {
                "C": 95,
                "n": 0.15
          },
          "machinability": {
                "aisi_rating": 30
          },
          "notes": "Higher strength aging condition"
    },

    "P-CS-385": {
          "id": "P-CS-385",
          "name": "Maraging 250 Solution Annealed",
          "designation": {
                "aisi_sae": "Maraging250",
                "uns": "K92890",
                "din": "1.6359",
                "en": "X2NiCoMo18-9-5",
                "jis": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Maraging Condition",
          "condition": "Solution Annealed 30 HRC",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 4.6,
                      "max": 5.2,
                      "typical": 5.0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 17.0,
                      "max": 19.0,
                      "typical": 18.5
                },
                "cobalt": {
                      "min": 7.0,
                      "max": 9.0,
                      "typical": 8.5
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0.3,
                      "max": 0.6,
                      "typical": 0.45
                }
          },
          "physical": {
                "density": 8027,
                "thermal_conductivity": 22.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 285,
                      "rockwell_c": 30
                },
                "tensile_strength": {
                      "typical": 1000
                },
                "yield_strength": {
                      "typical": 760
                },
                "elongation": {
                      "typical": 16
                }
          },
          "kienzle": {
                "kc1_1": 2300,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 780,
                "B": 850,
                "n": 0.38,
                "C": 0.016,
                "m": 1.02
          },
          "taylor": {
                "C": 130,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 45
          },
          "notes": "Solution annealed - soft, machinable"
    },

    "P-CS-386": {
          "id": "P-CS-386",
          "name": "Maraging 250 Aged 50 HRC",
          "designation": {
                "aisi_sae": "Maraging250",
                "uns": "K92890",
                "din": "1.6359",
                "en": "X2NiCoMo18-9-5",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Maraging Condition",
          "condition": "Aged 900F 50 HRC",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 4.6,
                      "max": 5.2,
                      "typical": 5.0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 17.0,
                      "max": 19.0,
                      "typical": 18.5
                },
                "cobalt": {
                      "min": 7.0,
                      "max": 9.0,
                      "typical": 8.5
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0.3,
                      "max": 0.6,
                      "typical": 0.45
                }
          },
          "physical": {
                "density": 8027,
                "thermal_conductivity": 22.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 480,
                      "rockwell_c": 50
                },
                "tensile_strength": {
                      "typical": 1725
                },
                "yield_strength": {
                      "typical": 1690
                },
                "elongation": {
                      "typical": 8
                }
          },
          "kienzle": {
                "kc1_1": 3300,
                "mc": 0.19
          },
          "johnson_cook": {
                "A": 1400,
                "B": 940,
                "n": 0.26,
                "C": 0.008,
                "m": 1.12
          },
          "taylor": {
                "C": 78,
                "n": 0.13
          },
          "machinability": {
                "aisi_rating": 22
          },
          "notes": "Aged - die applications, aerospace"
    },

    "P-CS-387": {
          "id": "P-CS-387",
          "name": "Maraging 300 Solution Annealed",
          "designation": {
                "aisi_sae": "Maraging300",
                "uns": "K93120",
                "din": "1.6358",
                "en": "X2NiCoMo18-12-4",
                "jis": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Maraging Condition",
          "condition": "Solution Annealed 32 HRC",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 4.8,
                      "max": 5.2,
                      "typical": 5.0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 18.0,
                      "max": 19.0,
                      "typical": 18.5
                },
                "cobalt": {
                      "min": 8.5,
                      "max": 9.5,
                      "typical": 9.0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0.5,
                      "max": 0.8,
                      "typical": 0.65
                }
          },
          "physical": {
                "density": 8032,
                "thermal_conductivity": 20.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 302,
                      "rockwell_c": 32
                },
                "tensile_strength": {
                      "typical": 1035
                },
                "yield_strength": {
                      "typical": 790
                },
                "elongation": {
                      "typical": 14
                }
          },
          "kienzle": {
                "kc1_1": 2380,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 820,
                "B": 860,
                "n": 0.36,
                "C": 0.015,
                "m": 1.04
          },
          "taylor": {
                "C": 125,
                "n": 0.17
          },
          "machinability": {
                "aisi_rating": 42
          },
          "notes": "Solution annealed 300 grade"
    },

    "P-CS-388": {
          "id": "P-CS-388",
          "name": "Maraging 300 Aged 54 HRC",
          "designation": {
                "aisi_sae": "Maraging300",
                "uns": "K93120",
                "din": "1.6358",
                "en": "X2NiCoMo18-12-4",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Maraging Condition",
          "condition": "Aged 900F 54 HRC",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.03,
                      "typical": 0.01
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 4.8,
                      "max": 5.2,
                      "typical": 5.0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 18.0,
                      "max": 19.0,
                      "typical": 18.5
                },
                "cobalt": {
                      "min": 8.5,
                      "max": 9.5,
                      "typical": 9.0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0.5,
                      "max": 0.8,
                      "typical": 0.65
                }
          },
          "physical": {
                "density": 8032,
                "thermal_conductivity": 20.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 540,
                      "rockwell_c": 54
                },
                "tensile_strength": {
                      "typical": 2000
                },
                "yield_strength": {
                      "typical": 1965
                },
                "elongation": {
                      "typical": 6
                }
          },
          "kienzle": {
                "kc1_1": 3700,
                "mc": 0.19
          },
          "johnson_cook": {
                "A": 1600,
                "B": 970,
                "n": 0.23,
                "C": 0.007,
                "m": 1.14
          },
          "taylor": {
                "C": 62,
                "n": 0.11
          },
          "machinability": {
                "aisi_rating": 16
          },
          "notes": "Aged 300 - 2000 MPa tensile"
    },

    "P-CS-389": {
          "id": "P-CS-389",
          "name": "W1 Water Hardening Annealed",
          "designation": {
                "aisi_sae": "W1",
                "uns": "T72301",
                "din": "1.1545",
                "en": "C105W1",
                "jis": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Water Hardening",
          "condition": "Annealed 192 HB Max",
          "composition": {
                "carbon": {
                      "min": 0.95,
                      "max": 1.1,
                      "typical": 1.05
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.2,
                      "typical": 0.1
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 42.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 192,
                      "rockwell_c": null
                },
                "tensile_strength": {
                      "typical": 670
                },
                "yield_strength": {
                      "typical": 450
                },
                "elongation": {
                      "typical": 20
                }
          },
          "kienzle": {
                "kc1_1": 1900,
                "mc": 0.24
          },
          "johnson_cook": {
                "A": 500,
                "B": 720,
                "n": 0.45,
                "C": 0.026,
                "m": 0.94
          },
          "taylor": {
                "C": 150,
                "n": 0.21
          },
          "machinability": {
                "aisi_rating": 55
          },
          "notes": "Annealed - low cost tools"
    },

    "P-CS-390": {
          "id": "P-CS-390",
          "name": "W1 Water Hardening 64 HRC",
          "designation": {
                "aisi_sae": "W1",
                "uns": "T72301",
                "din": "1.1545",
                "en": "C105W1",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Water Hardening",
          "condition": "Hardened 64 HRC (Shallow)",
          "composition": {
                "carbon": {
                      "min": 0.95,
                      "max": 1.1,
                      "typical": 1.05
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 42.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 700,
                      "rockwell_c": 64
                },
                "tensile_strength": {
                      "typical": 2420
                },
                "yield_strength": {
                      "typical": 2300
                },
                "elongation": {
                      "typical": 0
                }
          },
          "kienzle": {
                "kc1_1": 4800,
                "mc": 0.17
          },
          "johnson_cook": {
                "A": 2050,
                "B": 1100,
                "n": 0.16,
                "C": 0.003,
                "m": 1.26
          },
          "taylor": {
                "C": 28,
                "n": 0.05
          },
          "machinability": {
                "aisi_rating": 4
          },
          "notes": "Water quench - shallow hardening, hand tools"
    },

    "P-CS-391": {
          "id": "P-CS-391",
          "name": "T1 Tungsten HSS Annealed",
          "designation": {
                "aisi_sae": "T1",
                "uns": "T12001",
                "din": "1.3355",
                "en": "HS18-0-1",
                "jis": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Hss Condition",
          "condition": "Annealed 248 HB Max",
          "composition": {
                "carbon": {
                      "min": 0.65,
                      "max": 0.8,
                      "typical": 0.75
                },
                "chromium": {
                      "min": 3.75,
                      "max": 4.5,
                      "typical": 4.15
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 1.0,
                      "max": 1.35,
                      "typical": 1.15
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 17.5,
                      "max": 19.0,
                      "typical": 18.0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 8750,
                "thermal_conductivity": 20.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 248,
                      "rockwell_c": null
                },
                "tensile_strength": {
                      "typical": 860
                },
                "yield_strength": {
                      "typical": 620
                },
                "elongation": {
                      "typical": 8
                }
          },
          "kienzle": {
                "kc1_1": 2250,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 680,
                "B": 840,
                "n": 0.38,
                "C": 0.016,
                "m": 1.02
          },
          "taylor": {
                "C": 115,
                "n": 0.16
          },
          "machinability": {
                "aisi_rating": 38
          },
          "notes": "Tungsten HSS annealed - lathe tools"
    },

    "P-CS-392": {
          "id": "P-CS-392",
          "name": "T1 Tungsten HSS 65 HRC",
          "designation": {
                "aisi_sae": "T1",
                "uns": "T12001",
                "din": "1.3355",
                "en": "HS18-0-1",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Hss Condition",
          "condition": "Hardened 65 HRC",
          "composition": {
                "carbon": {
                      "min": 0.65,
                      "max": 0.8,
                      "typical": 0.75
                },
                "chromium": {
                      "min": 3.75,
                      "max": 4.5,
                      "typical": 4.15
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 1.0,
                      "max": 1.35,
                      "typical": 1.15
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 17.5,
                      "max": 19.0,
                      "typical": 18.0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 8750,
                "thermal_conductivity": 20.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 725,
                      "rockwell_c": 65
                },
                "tensile_strength": {
                      "typical": 2520
                },
                "yield_strength": {
                      "typical": 2400
                },
                "elongation": {
                      "typical": 0
                }
          },
          "kienzle": {
                "kc1_1": 5100,
                "mc": 0.16
          },
          "johnson_cook": {
                "A": 2200,
                "B": 1150,
                "n": 0.14,
                "C": 0.003,
                "m": 1.3
          },
          "taylor": {
                "C": 22,
                "n": 0.04
          },
          "machinability": {
                "aisi_rating": 3
          },
          "notes": "Classic HSS - cutting tools"
    },

    "P-CS-393": {
          "id": "P-CS-393",
          "name": "CPM M4 PM HSS Annealed",
          "designation": {
                "aisi_sae": "CPM-M4",
                "uns": "",
                "din": "",
                "en": "",
                "jis": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Pm Hss",
          "condition": "Annealed 269 HB Max",
          "composition": {
                "carbon": {
                      "min": 1.38,
                      "max": 1.48,
                      "typical": 1.42
                },
                "chromium": {
                      "min": 4.0,
                      "max": 4.5,
                      "typical": 4.25
                },
                "molybdenum": {
                      "min": 5.0,
                      "max": 5.5,
                      "typical": 5.25
                },
                "vanadium": {
                      "min": 3.9,
                      "max": 4.1,
                      "typical": 4.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 5.5,
                      "max": 6.0,
                      "typical": 5.75
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 8137,
                "thermal_conductivity": 22.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 269,
                      "rockwell_c": null
                },
                "tensile_strength": {
                      "typical": 930
                },
                "yield_strength": {
                      "typical": 690
                },
                "elongation": {
                      "typical": 6
                }
          },
          "kienzle": {
                "kc1_1": 2350,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 720,
                "B": 860,
                "n": 0.36,
                "C": 0.014,
                "m": 1.04
          },
          "taylor": {
                "C": 108,
                "n": 0.16
          },
          "machinability": {
                "aisi_rating": 35
          },
          "notes": "PM HSS annealed - exceptional wear resistance"
    },

    "P-CS-394": {
          "id": "P-CS-394",
          "name": "CPM M4 PM HSS 64 HRC",
          "designation": {
                "aisi_sae": "CPM-M4",
                "uns": "",
                "din": "",
                "en": "",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Pm Hss",
          "condition": "Hardened 64 HRC",
          "composition": {
                "carbon": {
                      "min": 1.38,
                      "max": 1.48,
                      "typical": 1.42
                },
                "chromium": {
                      "min": 4.0,
                      "max": 4.5,
                      "typical": 4.25
                },
                "molybdenum": {
                      "min": 5.0,
                      "max": 5.5,
                      "typical": 5.25
                },
                "vanadium": {
                      "min": 3.9,
                      "max": 4.1,
                      "typical": 4.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 5.5,
                      "max": 6.0,
                      "typical": 5.75
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 8137,
                "thermal_conductivity": 22.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 700,
                      "rockwell_c": 64
                },
                "tensile_strength": {
                      "typical": 2420
                },
                "yield_strength": {
                      "typical": 2300
                },
                "elongation": {
                      "typical": 0
                }
          },
          "kienzle": {
                "kc1_1": 4800,
                "mc": 0.17
          },
          "johnson_cook": {
                "A": 2050,
                "B": 1100,
                "n": 0.16,
                "C": 0.003,
                "m": 1.26
          },
          "taylor": {
                "C": 28,
                "n": 0.05
          },
          "machinability": {
                "aisi_rating": 4
          },
          "notes": "PM HSS - super high speed cutters"
    },

    "P-CS-395": {
          "id": "P-CS-395",
          "name": "CPM 10V Wear Resistant Annealed",
          "designation": {
                "aisi_sae": "CPM-10V",
                "uns": "",
                "din": "",
                "en": "",
                "jis": ""
          },
          "iso_group": "P",
          "material_class": "Steel - Pm Tool",
          "condition": "Annealed 277 HB Max",
          "composition": {
                "carbon": {
                      "min": 2.4,
                      "max": 2.5,
                      "typical": 2.45
                },
                "chromium": {
                      "min": 5.0,
                      "max": 5.5,
                      "typical": 5.25
                },
                "molybdenum": {
                      "min": 1.25,
                      "max": 1.35,
                      "typical": 1.3
                },
                "vanadium": {
                      "min": 9.5,
                      "max": 10.0,
                      "typical": 9.75
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 20.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 277,
                      "rockwell_c": null
                },
                "tensile_strength": {
                      "typical": 965
                },
                "yield_strength": {
                      "typical": 725
                },
                "elongation": {
                      "typical": 4
                }
          },
          "kienzle": {
                "kc1_1": 2450,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 780,
                "B": 880,
                "n": 0.34,
                "C": 0.012,
                "m": 1.06
          },
          "taylor": {
                "C": 95,
                "n": 0.15
          },
          "machinability": {
                "aisi_rating": 30
          },
          "notes": "Extreme wear resistant - slitter knives"
    },

    "P-CS-396": {
          "id": "P-CS-396",
          "name": "CPM 10V Wear Resistant 60 HRC",
          "designation": {
                "aisi_sae": "CPM-10V",
                "uns": "",
                "din": "",
                "en": "",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Pm Tool",
          "condition": "Hardened 60 HRC",
          "composition": {
                "carbon": {
                      "min": 2.4,
                      "max": 2.5,
                      "typical": 2.45
                },
                "chromium": {
                      "min": 5.0,
                      "max": 5.5,
                      "typical": 5.25
                },
                "molybdenum": {
                      "min": 1.25,
                      "max": 1.35,
                      "typical": 1.3
                },
                "vanadium": {
                      "min": 9.5,
                      "max": 10.0,
                      "typical": 9.75
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 20.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 600,
                      "rockwell_c": 60
                },
                "tensile_strength": {
                      "typical": 2000
                },
                "yield_strength": {
                      "typical": 1850
                },
                "elongation": {
                      "typical": 1
                }
          },
          "kienzle": {
                "kc1_1": 4200,
                "mc": 0.18
          },
          "johnson_cook": {
                "A": 1750,
                "B": 990,
                "n": 0.21,
                "C": 0.005,
                "m": 1.18
          },
          "taylor": {
                "C": 40,
                "n": 0.07
          },
          "machinability": {
                "aisi_rating": 8
          },
          "notes": "10% vanadium carbide - ultimate wear"
    },

    "P-CS-397": {
          "id": "P-CS-397",
          "name": "AISI 1080 Spring Tempered",
          "designation": {
                "aisi_sae": "1080",
                "uns": "G10800",
                "din": "1.1248",
                "en": "C75S",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Spring Tempered",
          "condition": "Spring Tempered 45 HRC",
          "composition": {
                "carbon": {
                      "min": 0.75,
                      "max": 0.88,
                      "typical": 0.8
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 48.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 430,
                      "rockwell_c": 45
                },
                "tensile_strength": {
                      "typical": 1480
                },
                "yield_strength": {
                      "typical": 1310
                },
                "elongation": {
                      "typical": 8
                }
          },
          "kienzle": {
                "kc1_1": 2900,
                "mc": 0.2
          },
          "johnson_cook": {
                "A": 1180,
                "B": 910,
                "n": 0.28,
                "C": 0.01,
                "m": 1.1
          },
          "taylor": {
                "C": 92,
                "n": 0.14
          },
          "machinability": {
                "aisi_rating": 28
          },
          "notes": "Spring stock - knives, scrapers"
    },

    "P-CS-398": {
          "id": "P-CS-398",
          "name": "AISI 1095 Blade Hardened 60 HRC",
          "designation": {
                "aisi_sae": "1095",
                "uns": "G10950",
                "din": "1.1274",
                "en": "C100S",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Blade Steel",
          "condition": "Hardened & Tempered 60 HRC",
          "composition": {
                "carbon": {
                      "min": 0.9,
                      "max": 1.03,
                      "typical": 0.97
                },
                "chromium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 48.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 600,
                      "rockwell_c": 60
                },
                "tensile_strength": {
                      "typical": 2000
                },
                "yield_strength": {
                      "typical": 1850
                },
                "elongation": {
                      "typical": 2
                }
          },
          "kienzle": {
                "kc1_1": 4150,
                "mc": 0.18
          },
          "johnson_cook": {
                "A": 1720,
                "B": 980,
                "n": 0.21,
                "C": 0.006,
                "m": 1.17
          },
          "taylor": {
                "C": 45,
                "n": 0.08
          },
          "machinability": {
                "aisi_rating": 10
          },
          "notes": "Classic blade steel - knives, swords"
    },

    "P-CS-399": {
          "id": "P-CS-399",
          "name": "5160 Leaf Spring Q&T 45 HRC",
          "designation": {
                "aisi_sae": "5160",
                "uns": "G51600",
                "din": "1.7176",
                "en": "55Cr3",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Spring Condition",
          "condition": "Q&T 45 HRC",
          "composition": {
                "carbon": {
                      "min": 0.56,
                      "max": 0.64,
                      "typical": 0.6
                },
                "chromium": {
                      "min": 0.7,
                      "max": 0.9,
                      "typical": 0.85
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 44.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 430,
                      "rockwell_c": 45
                },
                "tensile_strength": {
                      "typical": 1480
                },
                "yield_strength": {
                      "typical": 1350
                },
                "elongation": {
                      "typical": 9
                }
          },
          "kienzle": {
                "kc1_1": 2920,
                "mc": 0.2
          },
          "johnson_cook": {
                "A": 1200,
                "B": 910,
                "n": 0.28,
                "C": 0.01,
                "m": 1.1
          },
          "taylor": {
                "C": 92,
                "n": 0.14
          },
          "machinability": {
                "aisi_rating": 28
          },
          "notes": "Leaf spring - automotive suspension"
    },

    "P-CS-400": {
          "id": "P-CS-400",
          "name": "6150 Valve Spring Q&T 48 HRC",
          "designation": {
                "aisi_sae": "6150",
                "uns": "G61500",
                "din": "1.8159",
                "en": "51CrV4",
                "jis": ""
          },
          "iso_group": "H",
          "material_class": "Steel - Spring Condition",
          "condition": "Q&T 48 HRC",
          "composition": {
                "carbon": {
                      "min": 0.48,
                      "max": 0.55,
                      "typical": 0.52
                },
                "chromium": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 0.95
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0.13,
                      "max": 0.23,
                      "typical": 0.18
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "cobalt": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "titanium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7850,
                "thermal_conductivity": 42.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 460,
                      "rockwell_c": 48
                },
                "tensile_strength": {
                      "typical": 1550
                },
                "yield_strength": {
                      "typical": 1420
                },
                "elongation": {
                      "typical": 7
                }
          },
          "kienzle": {
                "kc1_1": 3100,
                "mc": 0.2
          },
          "johnson_cook": {
                "A": 1280,
                "B": 940,
                "n": 0.26,
                "C": 0.009,
                "m": 1.11
          },
          "taylor": {
                "C": 82,
                "n": 0.13
          },
          "machinability": {
                "aisi_rating": 24
          },
          "notes": "P_STEELS CATEGORY COMPLETE - 400/400 materials"
    }
  }
};
if (typeof module !== "undefined") module.exports = STEELS_351_400;
