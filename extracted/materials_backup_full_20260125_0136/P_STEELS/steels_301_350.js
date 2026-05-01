/**
 * PRISM MATERIALS DATABASE - Heat Treatment Condition Variants
 * File: steels_301_350.js - P-CS-301 to P-CS-350 (50 materials)
 * FOCUS: Complete condition matrices for critical machining grades
 * - 4340: 8 conditions (Annealed through 54 HRC)
 * - D2, H13, A2, O1, S7, M2: Annealed + Multiple hardened states
 * - P20, 420 Mold Steels: Multiple prehardened + hardened
 * - DIN/EN equivalents with European condition designations
 * - Cold worked/strain hardened variants
 * Generated: 2026-01-24 19:20:18
 */
const STEELS_301_350 = {
  metadata: {file: "steels_301_350.js", category: "P_STEELS", materialCount: 50, 
             focus: "Heat treatment condition variants - critical for accurate cutting parameter selection"},
  materials: {
    "P-CS-301": {
          "id": "P-CS-301",
          "name": "AISI 4340 Annealed (Soft)",
          "designation": {
                "aisi_sae": "4340",
                "uns": "G43400",
                "din": "1.6582",
                "en": "34CrNiMo6"
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy Condition",
          "condition": "Annealed 197 HB",
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7833,
                "melting_point": {
                      "solidus": 1467
                },
                "thermal_conductivity": 38.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 197,
                      "rockwell_c": null,
                      "vickers": 206
                },
                "tensile_strength": {
                      "typical": 655
                },
                "yield_strength": {
                      "typical": 415
                },
                "elongation": {
                      "typical": 22
                }
          },
          "kienzle": {
                "kc1_1": 1850,
                "mc": 0.24
          },
          "johnson_cook": {
                "A": 520,
                "B": 680,
                "C": 0.028,
                "n": 0.45,
                "m": 0.92
          },
          "taylor": {
                "C": 155,
                "n": 0.22
          },
          "machinability": {
                "aisi_rating": 57,
                "relative_to_1212": 0.57
          },
          "notes": "Best machinability - rough machining before heat treat"
    },

    "P-CS-302": {
          "id": "P-CS-302",
          "name": "AISI 4340 Normalized",
          "designation": {
                "aisi_sae": "4340",
                "uns": "G43400",
                "din": "1.6582",
                "en": "34CrNiMo6"
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy Condition",
          "condition": "Normalized 229 HB",
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7833,
                "melting_point": {
                      "solidus": 1467
                },
                "thermal_conductivity": 38.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 229,
                      "rockwell_c": 20,
                      "vickers": 240
                },
                "tensile_strength": {
                      "typical": 793
                },
                "yield_strength": {
                      "typical": 470
                },
                "elongation": {
                      "typical": 18
                }
          },
          "kienzle": {
                "kc1_1": 2020,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 620,
                "B": 740,
                "C": 0.022,
                "n": 0.4,
                "m": 0.96
          },
          "taylor": {
                "C": 145,
                "n": 0.2
          },
          "machinability": {
                "aisi_rating": 52,
                "relative_to_1212": 0.52
          },
          "notes": "Uniform grain structure - intermediate machining"
    },

    "P-CS-303": {
          "id": "P-CS-303",
          "name": "AISI 4340 Q&T 22 HRC",
          "designation": {
                "aisi_sae": "4340",
                "uns": "G43400",
                "din": "1.6582",
                "en": "34CrNiMo6"
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy Condition",
          "condition": "Q&T 22 HRC (235 HB)",
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7833,
                "melting_point": {
                      "solidus": 1467
                },
                "thermal_conductivity": 38.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 235,
                      "rockwell_c": 22,
                      "vickers": 246
                },
                "tensile_strength": {
                      "typical": 830
                },
                "yield_strength": {
                      "typical": 690
                },
                "elongation": {
                      "typical": 17
                }
          },
          "kienzle": {
                "kc1_1": 2100,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 680,
                "B": 780,
                "C": 0.02,
                "n": 0.38,
                "m": 0.98
          },
          "taylor": {
                "C": 140,
                "n": 0.19
          },
          "machinability": {
                "aisi_rating": 50,
                "relative_to_1212": 0.5
          },
          "notes": "Soft Q&T - good balance machining/strength"
    },

    "P-CS-304": {
          "id": "P-CS-304",
          "name": "AISI 4340 Q&T 32 HRC",
          "designation": {
                "aisi_sae": "4340",
                "uns": "G43400",
                "din": "1.6582",
                "en": "34CrNiMo6"
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy Condition",
          "condition": "Q&T 32 HRC (302 HB)",
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7833,
                "melting_point": {
                      "solidus": 1467
                },
                "thermal_conductivity": 38.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 302,
                      "rockwell_c": 32,
                      "vickers": 317
                },
                "tensile_strength": {
                      "typical": 1030
                },
                "yield_strength": {
                      "typical": 860
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
                "B": 850,
                "C": 0.014,
                "n": 0.32,
                "m": 1.05
          },
          "taylor": {
                "C": 125,
                "n": 0.17
          },
          "machinability": {
                "aisi_rating": 42,
                "relative_to_1212": 0.42
          },
          "notes": "Medium hardness - standard structural"
    },

    "P-CS-305": {
          "id": "P-CS-305",
          "name": "AISI 4340 Q&T 38 HRC",
          "designation": {
                "aisi_sae": "4340",
                "uns": "G43400",
                "din": "1.6582",
                "en": "34CrNiMo6"
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy Condition",
          "condition": "Q&T 38 HRC (352 HB)",
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7833,
                "melting_point": {
                      "solidus": 1467
                },
                "thermal_conductivity": 38.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 352,
                      "rockwell_c": 38,
                      "vickers": 369
                },
                "tensile_strength": {
                      "typical": 1200
                },
                "yield_strength": {
                      "typical": 1100
                },
                "elongation": {
                      "typical": 12
                }
          },
          "kienzle": {
                "kc1_1": 2650,
                "mc": 0.21
          },
          "johnson_cook": {
                "A": 1000,
                "B": 900,
                "C": 0.011,
                "n": 0.28,
                "m": 1.08
          },
          "taylor": {
                "C": 108,
                "n": 0.16
          },
          "machinability": {
                "aisi_rating": 35,
                "relative_to_1212": 0.35
          },
          "notes": "Hard turning viable - carbide tooling"
    },

    "P-CS-306": {
          "id": "P-CS-306",
          "name": "AISI 4340 Q&T 50 HRC",
          "designation": {
                "aisi_sae": "4340",
                "uns": "G43400",
                "din": "1.6582",
                "en": "34CrNiMo6"
          },
          "iso_group": "H",
          "material_class": "Steel - Alloy Condition",
          "condition": "Q&T 50 HRC (480 HB)",
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7833,
                "melting_point": {
                      "solidus": 1467
                },
                "thermal_conductivity": 38.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 480,
                      "rockwell_c": 50,
                      "vickers": 504
                },
                "tensile_strength": {
                      "typical": 1620
                },
                "yield_strength": {
                      "typical": 1520
                },
                "elongation": {
                      "typical": 8
                }
          },
          "kienzle": {
                "kc1_1": 3200,
                "mc": 0.2
          },
          "johnson_cook": {
                "A": 1350,
                "B": 950,
                "C": 0.008,
                "n": 0.24,
                "m": 1.12
          },
          "taylor": {
                "C": 78,
                "n": 0.13
          },
          "machinability": {
                "aisi_rating": 22,
                "relative_to_1212": 0.22
          },
          "notes": "CBN/ceramic required - hard turning limit"
    },

    "P-CS-307": {
          "id": "P-CS-307",
          "name": "AISI 4340 Q&T 54 HRC (Maximum)",
          "designation": {
                "aisi_sae": "4340",
                "uns": "G43400",
                "din": "1.6582",
                "en": "34CrNiMo6"
          },
          "iso_group": "H",
          "material_class": "Steel - Alloy Condition",
          "condition": "Q&T 54 HRC (540 HB)",
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7833,
                "melting_point": {
                      "solidus": 1467
                },
                "thermal_conductivity": 38.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 540,
                      "rockwell_c": 54,
                      "vickers": 567
                },
                "tensile_strength": {
                      "typical": 1860
                },
                "yield_strength": {
                      "typical": 1720
                },
                "elongation": {
                      "typical": 5
                }
          },
          "kienzle": {
                "kc1_1": 3650,
                "mc": 0.19
          },
          "johnson_cook": {
                "A": 1580,
                "B": 980,
                "C": 0.006,
                "n": 0.22,
                "m": 1.15
          },
          "taylor": {
                "C": 58,
                "n": 0.1
          },
          "machinability": {
                "aisi_rating": 15,
                "relative_to_1212": 0.15
          },
          "notes": "Near maximum hardness - CBN grinding recommended"
    },

    "P-CS-308": {
          "id": "P-CS-308",
          "name": "AISI 4340 Stress Relieved",
          "designation": {
                "aisi_sae": "4340",
                "uns": "G43400",
                "din": "1.6582",
                "en": "34CrNiMo6"
          },
          "iso_group": "P",
          "material_class": "Steel - Alloy Condition",
          "condition": "Stress Relieved 28 HRC",
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7833,
                "melting_point": {
                      "solidus": 1467
                },
                "thermal_conductivity": 38.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 277,
                      "rockwell_c": 28,
                      "vickers": 290
                },
                "tensile_strength": {
                      "typical": 965
                },
                "yield_strength": {
                      "typical": 830
                },
                "elongation": {
                      "typical": 15
                }
          },
          "kienzle": {
                "kc1_1": 2250,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 780,
                "B": 820,
                "C": 0.015,
                "n": 0.34,
                "m": 1.04
          },
          "taylor": {
                "C": 130,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 45,
                "relative_to_1212": 0.45
          },
          "notes": "Reduced residual stress - precision components"
    },

    "P-CS-309": {
          "id": "P-CS-309",
          "name": "D2 Tool Steel Annealed",
          "designation": {
                "aisi_sae": "D2",
                "uns": "T30402",
                "din": "1.2379",
                "en": "X155CrVMo12-1"
          },
          "iso_group": "P",
          "material_class": "Steel - Tool Condition",
          "condition": "Annealed 217 HB Max",
          "composition": {
                "carbon": {
                      "min": 1.4,
                      "max": 1.6,
                      "typical": 1.55
                },
                "chromium": {
                      "min": 11.0,
                      "max": 13.0,
                      "typical": 12.0
                },
                "molybdenum": {
                      "min": 0.7,
                      "max": 1.1,
                      "typical": 0.85
                },
                "vanadium": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 1.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7743,
                "melting_point": {
                      "solidus": 1376
                },
                "thermal_conductivity": 20.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 217,
                      "rockwell_c": null,
                      "vickers": 227
                },
                "tensile_strength": {
                      "typical": 760
                },
                "yield_strength": {
                      "typical": 520
                },
                "elongation": {
                      "typical": 12
                }
          },
          "kienzle": {
                "kc1_1": 2100,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 580,
                "B": 780,
                "C": 0.02,
                "n": 0.42,
                "m": 0.98
          },
          "taylor": {
                "C": 130,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 45,
                "relative_to_1212": 0.45
          },
          "notes": "Soft annealed - machining before hardening"
    },

    "P-CS-310": {
          "id": "P-CS-310",
          "name": "D2 Tool Steel 54 HRC",
          "designation": {
                "aisi_sae": "D2",
                "uns": "T30402",
                "din": "1.2379",
                "en": "X155CrVMo12-1"
          },
          "iso_group": "H",
          "material_class": "Steel - Tool Condition",
          "condition": "Hardened 54 HRC",
          "composition": {
                "carbon": {
                      "min": 1.4,
                      "max": 1.6,
                      "typical": 1.55
                },
                "chromium": {
                      "min": 11.0,
                      "max": 13.0,
                      "typical": 12.0
                },
                "molybdenum": {
                      "min": 0.7,
                      "max": 1.1,
                      "typical": 0.85
                },
                "vanadium": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 1.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7743,
                "melting_point": {
                      "solidus": 1376
                },
                "thermal_conductivity": 20.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 540,
                      "rockwell_c": 54,
                      "vickers": 567
                },
                "tensile_strength": {
                      "typical": 1860
                },
                "yield_strength": {
                      "typical": 1720
                },
                "elongation": {
                      "typical": 2
                }
          },
          "kienzle": {
                "kc1_1": 3700,
                "mc": 0.19
          },
          "johnson_cook": {
                "A": 1600,
                "B": 980,
                "C": 0.006,
                "n": 0.22,
                "m": 1.16
          },
          "taylor": {
                "C": 55,
                "n": 0.1
          },
          "machinability": {
                "aisi_rating": 14,
                "relative_to_1212": 0.14
          },
          "notes": "Low hardness end - some hard milling possible"
    },

    "P-CS-311": {
          "id": "P-CS-311",
          "name": "D2 Tool Steel 58 HRC",
          "designation": {
                "aisi_sae": "D2",
                "uns": "T30402",
                "din": "1.2379",
                "en": "X155CrVMo12-1"
          },
          "iso_group": "H",
          "material_class": "Steel - Tool Condition",
          "condition": "Hardened 58 HRC",
          "composition": {
                "carbon": {
                      "min": 1.4,
                      "max": 1.6,
                      "typical": 1.55
                },
                "chromium": {
                      "min": 11.0,
                      "max": 13.0,
                      "typical": 12.0
                },
                "molybdenum": {
                      "min": 0.7,
                      "max": 1.1,
                      "typical": 0.85
                },
                "vanadium": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 1.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7743,
                "melting_point": {
                      "solidus": 1376
                },
                "thermal_conductivity": 20.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 600,
                      "rockwell_c": 58,
                      "vickers": 630
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
                "kc1_1": 4100,
                "mc": 0.18
          },
          "johnson_cook": {
                "A": 1780,
                "B": 1000,
                "C": 0.005,
                "n": 0.2,
                "m": 1.18
          },
          "taylor": {
                "C": 45,
                "n": 0.08
          },
          "machinability": {
                "aisi_rating": 10,
                "relative_to_1212": 0.1
          },
          "notes": "Working hardness - wire EDM or grinding"
    },

    "P-CS-312": {
          "id": "P-CS-312",
          "name": "D2 Tool Steel 62 HRC (Max)",
          "designation": {
                "aisi_sae": "D2",
                "uns": "T30402",
                "din": "1.2379",
                "en": "X155CrVMo12-1"
          },
          "iso_group": "H",
          "material_class": "Steel - Tool Condition",
          "condition": "Hardened 62 HRC (Maximum)",
          "composition": {
                "carbon": {
                      "min": 1.4,
                      "max": 1.6,
                      "typical": 1.55
                },
                "chromium": {
                      "min": 11.0,
                      "max": 13.0,
                      "typical": 12.0
                },
                "molybdenum": {
                      "min": 0.7,
                      "max": 1.1,
                      "typical": 0.85
                },
                "vanadium": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 1.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7743,
                "melting_point": {
                      "solidus": 1376
                },
                "thermal_conductivity": 20.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 650,
                      "rockwell_c": 62,
                      "vickers": 682
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
                "C": 0.004,
                "n": 0.18,
                "m": 1.22
          },
          "taylor": {
                "C": 35,
                "n": 0.06
          },
          "machinability": {
                "aisi_rating": 6,
                "relative_to_1212": 0.06
          },
          "notes": "Maximum hardness - grinding/EDM only"
    },

    "P-CS-313": {
          "id": "P-CS-313",
          "name": "H13 Hot Work Annealed",
          "designation": {
                "aisi_sae": "H13",
                "uns": "T20813",
                "din": "1.2344",
                "en": "X40CrMoV5-1"
          },
          "iso_group": "P",
          "material_class": "Steel - Tool Condition",
          "condition": "Annealed 192 HB Max",
          "composition": {
                "carbon": {
                      "min": 0.32,
                      "max": 0.45,
                      "typical": 0.4
                },
                "chromium": {
                      "min": 4.75,
                      "max": 5.5,
                      "typical": 5.25
                },
                "molybdenum": {
                      "min": 1.1,
                      "max": 1.75,
                      "typical": 1.4
                },
                "vanadium": {
                      "min": 0.8,
                      "max": 1.2,
                      "typical": 1.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7811,
                "melting_point": {
                      "solidus": 1468
                },
                "thermal_conductivity": 24.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 192,
                      "rockwell_c": null,
                      "vickers": 201
                },
                "tensile_strength": {
                      "typical": 670
                },
                "yield_strength": {
                      "typical": 450
                },
                "elongation": {
                      "typical": 16
                }
          },
          "kienzle": {
                "kc1_1": 1950,
                "mc": 0.24
          },
          "johnson_cook": {
                "A": 500,
                "B": 720,
                "C": 0.025,
                "n": 0.45,
                "m": 0.94
          },
          "taylor": {
                "C": 145,
                "n": 0.2
          },
          "machinability": {
                "aisi_rating": 52,
                "relative_to_1212": 0.52
          },
          "notes": "Fully annealed - pre-hardened machining"
    },

    "P-CS-314": {
          "id": "P-CS-314",
          "name": "H13 Hot Work Prehardened 38 HRC",
          "designation": {
                "aisi_sae": "H13",
                "uns": "T20813",
                "din": "1.2344",
                "en": "X40CrMoV5-1"
          },
          "iso_group": "P",
          "material_class": "Steel - Tool Condition",
          "condition": "Prehardened 38 HRC",
          "composition": {
                "carbon": {
                      "min": 0.32,
                      "max": 0.45,
                      "typical": 0.4
                },
                "chromium": {
                      "min": 4.75,
                      "max": 5.5,
                      "typical": 5.25
                },
                "molybdenum": {
                      "min": 1.1,
                      "max": 1.75,
                      "typical": 1.4
                },
                "vanadium": {
                      "min": 0.8,
                      "max": 1.2,
                      "typical": 1.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7811,
                "melting_point": {
                      "solidus": 1468
                },
                "thermal_conductivity": 24.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 352,
                      "rockwell_c": 38,
                      "vickers": 369
                },
                "tensile_strength": {
                      "typical": 1200
                },
                "yield_strength": {
                      "typical": 1050
                },
                "elongation": {
                      "typical": 10
                }
          },
          "kienzle": {
                "kc1_1": 2650,
                "mc": 0.21
          },
          "johnson_cook": {
                "A": 980,
                "B": 880,
                "C": 0.012,
                "n": 0.3,
                "m": 1.06
          },
          "taylor": {
                "C": 108,
                "n": 0.16
          },
          "machinability": {
                "aisi_rating": 35,
                "relative_to_1212": 0.35
          },
          "notes": "Prehardened stock - machining before final heat treat"
    },

    "P-CS-315": {
          "id": "P-CS-315",
          "name": "H13 Hot Work 44 HRC",
          "designation": {
                "aisi_sae": "H13",
                "uns": "T20813",
                "din": "1.2344",
                "en": "X40CrMoV5-1"
          },
          "iso_group": "P",
          "material_class": "Steel - Tool Condition",
          "condition": "Hardened 44 HRC",
          "composition": {
                "carbon": {
                      "min": 0.32,
                      "max": 0.45,
                      "typical": 0.4
                },
                "chromium": {
                      "min": 4.75,
                      "max": 5.5,
                      "typical": 5.25
                },
                "molybdenum": {
                      "min": 1.1,
                      "max": 1.75,
                      "typical": 1.4
                },
                "vanadium": {
                      "min": 0.8,
                      "max": 1.2,
                      "typical": 1.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7811,
                "melting_point": {
                      "solidus": 1468
                },
                "thermal_conductivity": 24.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 420,
                      "rockwell_c": 44,
                      "vickers": 441
                },
                "tensile_strength": {
                      "typical": 1410
                },
                "yield_strength": {
                      "typical": 1280
                },
                "elongation": {
                      "typical": 8
                }
          },
          "kienzle": {
                "kc1_1": 2950,
                "mc": 0.2
          },
          "johnson_cook": {
                "A": 1150,
                "B": 920,
                "C": 0.01,
                "n": 0.27,
                "m": 1.1
          },
          "taylor": {
                "C": 92,
                "n": 0.14
          },
          "machinability": {
                "aisi_rating": 28,
                "relative_to_1212": 0.28
          },
          "notes": "Standard die casting die hardness"
    },

    "P-CS-316": {
          "id": "P-CS-316",
          "name": "H13 Hot Work 48 HRC",
          "designation": {
                "aisi_sae": "H13",
                "uns": "T20813",
                "din": "1.2344",
                "en": "X40CrMoV5-1"
          },
          "iso_group": "H",
          "material_class": "Steel - Tool Condition",
          "condition": "Hardened 48 HRC",
          "composition": {
                "carbon": {
                      "min": 0.32,
                      "max": 0.45,
                      "typical": 0.4
                },
                "chromium": {
                      "min": 4.75,
                      "max": 5.5,
                      "typical": 5.25
                },
                "molybdenum": {
                      "min": 1.1,
                      "max": 1.75,
                      "typical": 1.4
                },
                "vanadium": {
                      "min": 0.8,
                      "max": 1.2,
                      "typical": 1.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7811,
                "melting_point": {
                      "solidus": 1468
                },
                "thermal_conductivity": 24.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 460,
                      "rockwell_c": 48,
                      "vickers": 483
                },
                "tensile_strength": {
                      "typical": 1550
                },
                "yield_strength": {
                      "typical": 1420
                },
                "elongation": {
                      "typical": 6
                }
          },
          "kienzle": {
                "kc1_1": 3150,
                "mc": 0.2
          },
          "johnson_cook": {
                "A": 1300,
                "B": 950,
                "C": 0.008,
                "n": 0.25,
                "m": 1.12
          },
          "taylor": {
                "C": 78,
                "n": 0.13
          },
          "machinability": {
                "aisi_rating": 22,
                "relative_to_1212": 0.22
          },
          "notes": "Higher hardness - forging dies"
    },

    "P-CS-317": {
          "id": "P-CS-317",
          "name": "H13 Hot Work 52 HRC (Max)",
          "designation": {
                "aisi_sae": "H13",
                "uns": "T20813",
                "din": "1.2344",
                "en": "X40CrMoV5-1"
          },
          "iso_group": "H",
          "material_class": "Steel - Tool Condition",
          "condition": "Hardened 52 HRC (Maximum)",
          "composition": {
                "carbon": {
                      "min": 0.32,
                      "max": 0.45,
                      "typical": 0.4
                },
                "chromium": {
                      "min": 4.75,
                      "max": 5.5,
                      "typical": 5.25
                },
                "molybdenum": {
                      "min": 1.1,
                      "max": 1.75,
                      "typical": 1.4
                },
                "vanadium": {
                      "min": 0.8,
                      "max": 1.2,
                      "typical": 1.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7811,
                "melting_point": {
                      "solidus": 1468
                },
                "thermal_conductivity": 24.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 510,
                      "rockwell_c": 52,
                      "vickers": 535
                },
                "tensile_strength": {
                      "typical": 1720
                },
                "yield_strength": {
                      "typical": 1600
                },
                "elongation": {
                      "typical": 4
                }
          },
          "kienzle": {
                "kc1_1": 3400,
                "mc": 0.19
          },
          "johnson_cook": {
                "A": 1450,
                "B": 970,
                "C": 0.007,
                "n": 0.23,
                "m": 1.14
          },
          "taylor": {
                "C": 68,
                "n": 0.11
          },
          "machinability": {
                "aisi_rating": 18,
                "relative_to_1212": 0.18
          },
          "notes": "Maximum working hardness - CBN/ceramic"
    },

    "P-CS-318": {
          "id": "P-CS-318",
          "name": "H13 Hot Work Nitrided Surface",
          "designation": {
                "aisi_sae": "H13",
                "uns": "T20813",
                "din": "1.2344",
                "en": "X40CrMoV5-1"
          },
          "iso_group": "H",
          "material_class": "Steel - Tool Condition",
          "condition": "48 HRC Core + Nitrided 65 HRC Surface",
          "composition": {
                "carbon": {
                      "min": 0.32,
                      "max": 0.45,
                      "typical": 0.4
                },
                "chromium": {
                      "min": 4.75,
                      "max": 5.5,
                      "typical": 5.25
                },
                "molybdenum": {
                      "min": 1.1,
                      "max": 1.75,
                      "typical": 1.4
                },
                "vanadium": {
                      "min": 0.8,
                      "max": 1.2,
                      "typical": 1.0
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7811,
                "melting_point": {
                      "solidus": 1468
                },
                "thermal_conductivity": 24.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 460,
                      "rockwell_c": 65,
                      "vickers": 483
                },
                "tensile_strength": {
                      "typical": 1550
                },
                "yield_strength": {
                      "typical": 1420
                },
                "elongation": {
                      "typical": 6
                }
          },
          "kienzle": {
                "kc1_1": 4800,
                "mc": 0.16
          },
          "johnson_cook": {
                "A": 2100,
                "B": 1100,
                "C": 0.003,
                "n": 0.15,
                "m": 1.28
          },
          "taylor": {
                "C": 28,
                "n": 0.05
          },
          "machinability": {
                "aisi_rating": 5,
                "relative_to_1212": 0.05
          },
          "notes": "Nitrided surface - grinding only on case"
    },

    "P-CS-319": {
          "id": "P-CS-319",
          "name": "A2 Air Hardening Annealed",
          "designation": {
                "aisi_sae": "A2",
                "uns": "T30102",
                "din": "1.2363",
                "en": "X100CrMoV5"
          },
          "iso_group": "P",
          "material_class": "Steel - Tool Condition",
          "condition": "Annealed 212 HB Max",
          "composition": {
                "carbon": {
                      "min": 0.95,
                      "max": 1.05,
                      "typical": 1.0
                },
                "chromium": {
                      "min": 4.75,
                      "max": 5.5,
                      "typical": 5.25
                },
                "molybdenum": {
                      "min": 0.9,
                      "max": 1.4,
                      "typical": 1.1
                },
                "vanadium": {
                      "min": 0.15,
                      "max": 0.5,
                      "typical": 0.25
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7793,
                "melting_point": {
                      "solidus": 1420
                },
                "thermal_conductivity": 24.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 212,
                      "rockwell_c": null,
                      "vickers": 222
                },
                "tensile_strength": {
                      "typical": 740
                },
                "yield_strength": {
                      "typical": 510
                },
                "elongation": {
                      "typical": 14
                }
          },
          "kienzle": {
                "kc1_1": 2050,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 560,
                "B": 760,
                "C": 0.022,
                "n": 0.43,
                "m": 0.96
          },
          "taylor": {
                "C": 135,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 48,
                "relative_to_1212": 0.48
          },
          "notes": "Annealed - good machinability for die blanks"
    },

    "P-CS-320": {
          "id": "P-CS-320",
          "name": "A2 Air Hardening 57-59 HRC",
          "designation": {
                "aisi_sae": "A2",
                "uns": "T30102",
                "din": "1.2363",
                "en": "X100CrMoV5"
          },
          "iso_group": "H",
          "material_class": "Steel - Tool Condition",
          "condition": "Hardened 58 HRC",
          "composition": {
                "carbon": {
                      "min": 0.95,
                      "max": 1.05,
                      "typical": 1.0
                },
                "chromium": {
                      "min": 4.75,
                      "max": 5.5,
                      "typical": 5.25
                },
                "molybdenum": {
                      "min": 0.9,
                      "max": 1.4,
                      "typical": 1.1
                },
                "vanadium": {
                      "min": 0.15,
                      "max": 0.5,
                      "typical": 0.25
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7793,
                "melting_point": {
                      "solidus": 1420
                },
                "thermal_conductivity": 24.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 600,
                      "rockwell_c": 58,
                      "vickers": 630
                },
                "tensile_strength": {
                      "typical": 2070
                },
                "yield_strength": {
                      "typical": 1930
                },
                "elongation": {
                      "typical": 2
                }
          },
          "kienzle": {
                "kc1_1": 4050,
                "mc": 0.18
          },
          "johnson_cook": {
                "A": 1760,
                "B": 990,
                "C": 0.005,
                "n": 0.2,
                "m": 1.18
          },
          "taylor": {
                "C": 45,
                "n": 0.08
          },
          "machinability": {
                "aisi_rating": 10,
                "relative_to_1212": 0.1
          },
          "notes": "Standard die hardness - blanking/forming dies"
    },

    "P-CS-321": {
          "id": "P-CS-321",
          "name": "A2 Air Hardening 62-64 HRC",
          "designation": {
                "aisi_sae": "A2",
                "uns": "T30102",
                "din": "1.2363",
                "en": "X100CrMoV5"
          },
          "iso_group": "H",
          "material_class": "Steel - Tool Condition",
          "condition": "Hardened 63 HRC (Maximum)",
          "composition": {
                "carbon": {
                      "min": 0.95,
                      "max": 1.05,
                      "typical": 1.0
                },
                "chromium": {
                      "min": 4.75,
                      "max": 5.5,
                      "typical": 5.25
                },
                "molybdenum": {
                      "min": 0.9,
                      "max": 1.4,
                      "typical": 1.1
                },
                "vanadium": {
                      "min": 0.15,
                      "max": 0.5,
                      "typical": 0.25
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7793,
                "melting_point": {
                      "solidus": 1420
                },
                "thermal_conductivity": 24.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 675,
                      "rockwell_c": 63,
                      "vickers": 708
                },
                "tensile_strength": {
                      "typical": 2350
                },
                "yield_strength": {
                      "typical": 2220
                },
                "elongation": {
                      "typical": 0
                }
          },
          "kienzle": {
                "kc1_1": 4650,
                "mc": 0.17
          },
          "johnson_cook": {
                "A": 2000,
                "B": 1080,
                "C": 0.004,
                "n": 0.17,
                "m": 1.24
          },
          "taylor": {
                "C": 32,
                "n": 0.06
          },
          "machinability": {
                "aisi_rating": 5,
                "relative_to_1212": 0.05
          },
          "notes": "Maximum hardness - grinding/EDM only"
    },

    "P-CS-322": {
          "id": "P-CS-322",
          "name": "O1 Oil Hardening Annealed",
          "designation": {
                "aisi_sae": "O1",
                "uns": "T31501",
                "din": "1.2510",
                "en": "100MnCrW4"
          },
          "iso_group": "P",
          "material_class": "Steel - Tool Condition",
          "condition": "Annealed 201 HB Max",
          "composition": {
                "carbon": {
                      "min": 0.85,
                      "max": 1.0,
                      "typical": 0.95
                },
                "chromium": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
                },
                "molybdenum": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.3,
                      "typical": 0.2
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
                }
          },
          "physical": {
                "density": 7844,
                "melting_point": {
                      "solidus": 1424
                },
                "thermal_conductivity": 30.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 201,
                      "rockwell_c": null,
                      "vickers": 211
                },
                "tensile_strength": {
                      "typical": 700
                },
                "yield_strength": {
                      "typical": 480
                },
                "elongation": {
                      "typical": 18
                }
          },
          "kienzle": {
                "kc1_1": 1950,
                "mc": 0.24
          },
          "johnson_cook": {
                "A": 520,
                "B": 720,
                "C": 0.026,
                "n": 0.45,
                "m": 0.94
          },
          "taylor": {
                "C": 145,
                "n": 0.2
          },
          "machinability": {
                "aisi_rating": 52,
                "relative_to_1212": 0.52
          },
          "notes": "Annealed - excellent machinability"
    },

    "P-CS-323": {
          "id": "P-CS-323",
          "name": "O1 Oil Hardening 58 HRC",
          "designation": {
                "aisi_sae": "O1",
                "uns": "T31501",
                "din": "1.2510",
                "en": "100MnCrW4"
          },
          "iso_group": "H",
          "material_class": "Steel - Tool Condition",
          "condition": "Hardened 58 HRC",
          "composition": {
                "carbon": {
                      "min": 0.85,
                      "max": 1.0,
                      "typical": 0.95
                },
                "chromium": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
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
                "tungsten": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
                }
          },
          "physical": {
                "density": 7844,
                "melting_point": {
                      "solidus": 1424
                },
                "thermal_conductivity": 30.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 600,
                      "rockwell_c": 58,
                      "vickers": 630
                },
                "tensile_strength": {
                      "typical": 2070
                },
                "yield_strength": {
                      "typical": 1930
                },
                "elongation": {
                      "typical": 2
                }
          },
          "kienzle": {
                "kc1_1": 4000,
                "mc": 0.18
          },
          "johnson_cook": {
                "A": 1740,
                "B": 980,
                "C": 0.006,
                "n": 0.2,
                "m": 1.17
          },
          "taylor": {
                "C": 45,
                "n": 0.08
          },
          "machinability": {
                "aisi_rating": 10,
                "relative_to_1212": 0.1
          },
          "notes": "Standard gauge/jig hardness"
    },

    "P-CS-324": {
          "id": "P-CS-324",
          "name": "O1 Oil Hardening 64 HRC Max",
          "designation": {
                "aisi_sae": "O1",
                "uns": "T31501",
                "din": "1.2510",
                "en": "100MnCrW4"
          },
          "iso_group": "H",
          "material_class": "Steel - Tool Condition",
          "condition": "Hardened 64 HRC (Maximum)",
          "composition": {
                "carbon": {
                      "min": 0.85,
                      "max": 1.0,
                      "typical": 0.95
                },
                "chromium": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
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
                "tungsten": {
                      "min": 0.4,
                      "max": 0.6,
                      "typical": 0.5
                }
          },
          "physical": {
                "density": 7844,
                "melting_point": {
                      "solidus": 1424
                },
                "thermal_conductivity": 30.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 700,
                      "rockwell_c": 64,
                      "vickers": 735
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
                "C": 0.003,
                "n": 0.16,
                "m": 1.26
          },
          "taylor": {
                "C": 28,
                "n": 0.05
          },
          "machinability": {
                "aisi_rating": 4,
                "relative_to_1212": 0.04
          },
          "notes": "Maximum hardness - cutting tools, knives"
    },

    "P-CS-325": {
          "id": "P-CS-325",
          "name": "S7 Shock Resisting Annealed",
          "designation": {
                "aisi_sae": "S7",
                "uns": "T41907",
                "din": "1.2355",
                "en": "45CrMoV6-7"
          },
          "iso_group": "P",
          "material_class": "Steel - Tool Condition",
          "condition": "Annealed 187 HB Max",
          "composition": {
                "carbon": {
                      "min": 0.45,
                      "max": 0.55,
                      "typical": 0.5
                },
                "chromium": {
                      "min": 3.0,
                      "max": 3.5,
                      "typical": 3.25
                },
                "molybdenum": {
                      "min": 1.3,
                      "max": 1.6,
                      "typical": 1.45
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.35,
                      "typical": 0.25
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7818,
                "melting_point": {
                      "solidus": 1460
                },
                "thermal_conductivity": 28.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 187,
                      "rockwell_c": null,
                      "vickers": 196
                },
                "tensile_strength": {
                      "typical": 650
                },
                "yield_strength": {
                      "typical": 430
                },
                "elongation": {
                      "typical": 18
                }
          },
          "kienzle": {
                "kc1_1": 1880,
                "mc": 0.24
          },
          "johnson_cook": {
                "A": 480,
                "B": 700,
                "C": 0.028,
                "n": 0.46,
                "m": 0.92
          },
          "taylor": {
                "C": 150,
                "n": 0.21
          },
          "machinability": {
                "aisi_rating": 55,
                "relative_to_1212": 0.55
          },
          "notes": "Annealed - impact tools, chisels"
    },

    "P-CS-326": {
          "id": "P-CS-326",
          "name": "S7 Shock Resisting 52 HRC",
          "designation": {
                "aisi_sae": "S7",
                "uns": "T41907",
                "din": "1.2355",
                "en": "45CrMoV6-7"
          },
          "iso_group": "H",
          "material_class": "Steel - Tool Condition",
          "condition": "Hardened 52 HRC",
          "composition": {
                "carbon": {
                      "min": 0.45,
                      "max": 0.55,
                      "typical": 0.5
                },
                "chromium": {
                      "min": 3.0,
                      "max": 3.5,
                      "typical": 3.25
                },
                "molybdenum": {
                      "min": 1.3,
                      "max": 1.6,
                      "typical": 1.45
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.35,
                      "typical": 0.25
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7818,
                "melting_point": {
                      "solidus": 1460
                },
                "thermal_conductivity": 28.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 510,
                      "rockwell_c": 52,
                      "vickers": 535
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
                "kc1_1": 3350,
                "mc": 0.19
          },
          "johnson_cook": {
                "A": 1420,
                "B": 950,
                "C": 0.008,
                "n": 0.24,
                "m": 1.12
          },
          "taylor": {
                "C": 68,
                "n": 0.11
          },
          "machinability": {
                "aisi_rating": 18,
                "relative_to_1212": 0.18
          },
          "notes": "Standard punches, chisels"
    },

    "P-CS-327": {
          "id": "P-CS-327",
          "name": "S7 Shock Resisting 58 HRC",
          "designation": {
                "aisi_sae": "S7",
                "uns": "T41907",
                "din": "1.2355",
                "en": "45CrMoV6-7"
          },
          "iso_group": "H",
          "material_class": "Steel - Tool Condition",
          "condition": "Hardened 58 HRC (Maximum)",
          "composition": {
                "carbon": {
                      "min": 0.45,
                      "max": 0.55,
                      "typical": 0.5
                },
                "chromium": {
                      "min": 3.0,
                      "max": 3.5,
                      "typical": 3.25
                },
                "molybdenum": {
                      "min": 1.3,
                      "max": 1.6,
                      "typical": 1.45
                },
                "vanadium": {
                      "min": 0,
                      "max": 0.35,
                      "typical": 0.25
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7818,
                "melting_point": {
                      "solidus": 1460
                },
                "thermal_conductivity": 28.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 600,
                      "rockwell_c": 58,
                      "vickers": 630
                },
                "tensile_strength": {
                      "typical": 2070
                },
                "yield_strength": {
                      "typical": 1900
                },
                "elongation": {
                      "typical": 3
                }
          },
          "kienzle": {
                "kc1_1": 4000,
                "mc": 0.18
          },
          "johnson_cook": {
                "A": 1700,
                "B": 990,
                "C": 0.006,
                "n": 0.21,
                "m": 1.16
          },
          "taylor": {
                "C": 50,
                "n": 0.09
          },
          "machinability": {
                "aisi_rating": 12,
                "relative_to_1212": 0.12
          },
          "notes": "Maximum - high impact + wear"
    },

    "P-CS-328": {
          "id": "P-CS-328",
          "name": "M2 HSS Annealed",
          "designation": {
                "aisi_sae": "M2",
                "uns": "T11302",
                "din": "1.3343",
                "en": "HS6-5-2"
          },
          "iso_group": "P",
          "material_class": "Steel - Hss Condition",
          "condition": "Annealed 235 HB Max",
          "composition": {
                "carbon": {
                      "min": 0.78,
                      "max": 0.88,
                      "typical": 0.85
                },
                "chromium": {
                      "min": 3.75,
                      "max": 4.5,
                      "typical": 4.15
                },
                "molybdenum": {
                      "min": 4.5,
                      "max": 5.5,
                      "typical": 5.0
                },
                "vanadium": {
                      "min": 1.75,
                      "max": 2.2,
                      "typical": 1.9
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 5.5,
                      "max": 6.75,
                      "typical": 6.35
                }
          },
          "physical": {
                "density": 8121,
                "melting_point": {
                      "solidus": 1432
                },
                "thermal_conductivity": 25.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 235,
                      "rockwell_c": null,
                      "vickers": 246
                },
                "tensile_strength": {
                      "typical": 820
                },
                "yield_strength": {
                      "typical": 580
                },
                "elongation": {
                      "typical": 10
                }
          },
          "kienzle": {
                "kc1_1": 2200,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 640,
                "B": 820,
                "C": 0.018,
                "n": 0.4,
                "m": 1.0
          },
          "taylor": {
                "C": 125,
                "n": 0.17
          },
          "machinability": {
                "aisi_rating": 42,
                "relative_to_1212": 0.42
          },
          "notes": "Annealed for machining tool blanks"
    },

    "P-CS-329": {
          "id": "P-CS-329",
          "name": "M2 HSS 62 HRC",
          "designation": {
                "aisi_sae": "M2",
                "uns": "T11302",
                "din": "1.3343",
                "en": "HS6-5-2"
          },
          "iso_group": "H",
          "material_class": "Steel - Hss Condition",
          "condition": "Hardened 62 HRC",
          "composition": {
                "carbon": {
                      "min": 0.78,
                      "max": 0.88,
                      "typical": 0.85
                },
                "chromium": {
                      "min": 3.75,
                      "max": 4.5,
                      "typical": 4.15
                },
                "molybdenum": {
                      "min": 4.5,
                      "max": 5.5,
                      "typical": 5.0
                },
                "vanadium": {
                      "min": 1.75,
                      "max": 2.2,
                      "typical": 1.9
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 5.5,
                      "max": 6.75,
                      "typical": 6.35
                }
          },
          "physical": {
                "density": 8121,
                "melting_point": {
                      "solidus": 1432
                },
                "thermal_conductivity": 25.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 650,
                      "rockwell_c": 62,
                      "vickers": 682
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
                "kc1_1": 4450,
                "mc": 0.17
          },
          "johnson_cook": {
                "A": 1920,
                "B": 1040,
                "C": 0.004,
                "n": 0.18,
                "m": 1.22
          },
          "taylor": {
                "C": 35,
                "n": 0.06
          },
          "machinability": {
                "aisi_rating": 6,
                "relative_to_1212": 0.06
          },
          "notes": "Standard cutting tool hardness"
    },

    "P-CS-330": {
          "id": "P-CS-330",
          "name": "M2 HSS 65 HRC Max",
          "designation": {
                "aisi_sae": "M2",
                "uns": "T11302",
                "din": "1.3343",
                "en": "HS6-5-2"
          },
          "iso_group": "H",
          "material_class": "Steel - Hss Condition",
          "condition": "Hardened 65 HRC (Maximum)",
          "composition": {
                "carbon": {
                      "min": 0.78,
                      "max": 0.88,
                      "typical": 0.85
                },
                "chromium": {
                      "min": 3.75,
                      "max": 4.5,
                      "typical": 4.15
                },
                "molybdenum": {
                      "min": 4.5,
                      "max": 5.5,
                      "typical": 5.0
                },
                "vanadium": {
                      "min": 1.75,
                      "max": 2.2,
                      "typical": 1.9
                },
                "nickel": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "tungsten": {
                      "min": 5.5,
                      "max": 6.75,
                      "typical": 6.35
                }
          },
          "physical": {
                "density": 8121,
                "melting_point": {
                      "solidus": 1432
                },
                "thermal_conductivity": 25.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 725,
                      "rockwell_c": 65,
                      "vickers": 761
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
                "kc1_1": 5000,
                "mc": 0.16
          },
          "johnson_cook": {
                "A": 2150,
                "B": 1120,
                "C": 0.003,
                "n": 0.15,
                "m": 1.28
          },
          "taylor": {
                "C": 25,
                "n": 0.04
          },
          "machinability": {
                "aisi_rating": 3,
                "relative_to_1212": 0.03
          },
          "notes": "Maximum red hardness - high speed cutting"
    },

    "P-CS-331": {
          "id": "P-CS-331",
          "name": "P20 Mold Steel Annealed",
          "designation": {
                "aisi_sae": "P20",
                "uns": "T51620",
                "din": "1.2311",
                "en": "40CrMnMo7"
          },
          "iso_group": "P",
          "material_class": "Steel - Mold Condition",
          "condition": "Annealed 150 HB",
          "composition": {
                "carbon": {
                      "min": 0.28,
                      "max": 0.4,
                      "typical": 0.35
                },
                "chromium": {
                      "min": 1.4,
                      "max": 2.0,
                      "typical": 1.7
                },
                "molybdenum": {
                      "min": 0.3,
                      "max": 0.55,
                      "typical": 0.45
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7831,
                "melting_point": {
                      "solidus": 1472
                },
                "thermal_conductivity": 34.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 150,
                      "rockwell_c": null,
                      "vickers": 157
                },
                "tensile_strength": {
                      "typical": 520
                },
                "yield_strength": {
                      "typical": 340
                },
                "elongation": {
                      "typical": 22
                }
          },
          "kienzle": {
                "kc1_1": 1650,
                "mc": 0.25
          },
          "johnson_cook": {
                "A": 380,
                "B": 620,
                "C": 0.035,
                "n": 0.5,
                "m": 0.88
          },
          "taylor": {
                "C": 175,
                "n": 0.24
          },
          "machinability": {
                "aisi_rating": 65,
                "relative_to_1212": 0.65
          },
          "notes": "Annealed - rarely used, prehardened preferred"
    },

    "P-CS-332": {
          "id": "P-CS-332",
          "name": "P20 Mold Steel Prehardened 28-32 HRC",
          "designation": {
                "aisi_sae": "P20",
                "uns": "T51620",
                "din": "1.2311",
                "en": "40CrMnMo7"
          },
          "iso_group": "P",
          "material_class": "Steel - Mold Condition",
          "condition": "Prehardened 30 HRC",
          "composition": {
                "carbon": {
                      "min": 0.28,
                      "max": 0.4,
                      "typical": 0.35
                },
                "chromium": {
                      "min": 1.4,
                      "max": 2.0,
                      "typical": 1.7
                },
                "molybdenum": {
                      "min": 0.3,
                      "max": 0.55,
                      "typical": 0.45
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7831,
                "melting_point": {
                      "solidus": 1472
                },
                "thermal_conductivity": 34.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 285,
                      "rockwell_c": 30,
                      "vickers": 299
                },
                "tensile_strength": {
                      "typical": 965
                },
                "yield_strength": {
                      "typical": 830
                },
                "elongation": {
                      "typical": 15
                }
          },
          "kienzle": {
                "kc1_1": 2280,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 780,
                "B": 840,
                "C": 0.015,
                "n": 0.35,
                "m": 1.04
          },
          "taylor": {
                "C": 130,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 45,
                "relative_to_1212": 0.45
          },
          "notes": "Standard injection mold hardness - MOST COMMON"
    },

    "P-CS-333": {
          "id": "P-CS-333",
          "name": "P20 Mold Steel Q&T 36 HRC",
          "designation": {
                "aisi_sae": "P20",
                "uns": "T51620",
                "din": "1.2311",
                "en": "40CrMnMo7"
          },
          "iso_group": "P",
          "material_class": "Steel - Mold Condition",
          "condition": "Q&T 36 HRC",
          "composition": {
                "carbon": {
                      "min": 0.28,
                      "max": 0.4,
                      "typical": 0.35
                },
                "chromium": {
                      "min": 1.4,
                      "max": 2.0,
                      "typical": 1.7
                },
                "molybdenum": {
                      "min": 0.3,
                      "max": 0.55,
                      "typical": 0.45
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7831,
                "melting_point": {
                      "solidus": 1472
                },
                "thermal_conductivity": 34.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 337,
                      "rockwell_c": 36,
                      "vickers": 353
                },
                "tensile_strength": {
                      "typical": 1140
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
                "C": 0.012,
                "n": 0.31,
                "m": 1.07
          },
          "taylor": {
                "C": 115,
                "n": 0.16
          },
          "machinability": {
                "aisi_rating": 38,
                "relative_to_1212": 0.38
          },
          "notes": "Higher hardness for abrasive plastics"
    },

    "P-CS-334": {
          "id": "P-CS-334",
          "name": "P20 Modified High Hard 40 HRC",
          "designation": {
                "aisi_sae": "P20HH",
                "uns": "T51620",
                "din": "1.2738",
                "en": "40CrMnNiMo8-6-4"
          },
          "iso_group": "P",
          "material_class": "Steel - Mold Condition",
          "condition": "Prehardened 40 HRC",
          "composition": {
                "carbon": {
                      "min": 0.35,
                      "max": 0.45,
                      "typical": 0.4
                },
                "chromium": {
                      "min": 1.8,
                      "max": 2.2,
                      "typical": 2.0
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.35,
                      "typical": 0.25
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 0.8,
                      "max": 1.2,
                      "typical": 1.0
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7828,
                "melting_point": {
                      "solidus": 1468
                },
                "thermal_conductivity": 32.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 375,
                      "rockwell_c": 40,
                      "vickers": 393
                },
                "tensile_strength": {
                      "typical": 1280
                },
                "yield_strength": {
                      "typical": 1140
                },
                "elongation": {
                      "typical": 10
                }
          },
          "kienzle": {
                "kc1_1": 2750,
                "mc": 0.21
          },
          "johnson_cook": {
                "A": 1050,
                "B": 910,
                "C": 0.01,
                "n": 0.29,
                "m": 1.09
          },
          "taylor": {
                "C": 100,
                "n": 0.15
          },
          "machinability": {
                "aisi_rating": 32,
                "relative_to_1212": 0.32
          },
          "notes": "Modified P20 with Ni - large molds through hardening"
    },

    "P-CS-335": {
          "id": "P-CS-335",
          "name": "420 Stainless Mold Annealed",
          "designation": {
                "aisi_sae": "420",
                "uns": "S42000",
                "din": "1.2083",
                "en": "X42Cr13"
          },
          "iso_group": "P",
          "material_class": "Steel - Stainless Mold Condition",
          "condition": "Annealed 195 HB Max",
          "composition": {
                "carbon": {
                      "min": 0.36,
                      "max": 0.5,
                      "typical": 0.42
                },
                "chromium": {
                      "min": 12.0,
                      "max": 14.0,
                      "typical": 13.0
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7772,
                "melting_point": {
                      "solidus": 1466
                },
                "thermal_conductivity": 24.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 195,
                      "rockwell_c": null,
                      "vickers": 204
                },
                "tensile_strength": {
                      "typical": 680
                },
                "yield_strength": {
                      "typical": 470
                },
                "elongation": {
                      "typical": 20
                }
          },
          "kienzle": {
                "kc1_1": 1920,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 520,
                "B": 740,
                "C": 0.024,
                "n": 0.44,
                "m": 0.95
          },
          "taylor": {
                "C": 140,
                "n": 0.19
          },
          "machinability": {
                "aisi_rating": 50,
                "relative_to_1212": 0.5
          },
          "notes": "Annealed for machining"
    },

    "P-CS-336": {
          "id": "P-CS-336",
          "name": "420 Stainless Mold Prehardened 30 HRC",
          "designation": {
                "aisi_sae": "420",
                "uns": "S42000",
                "din": "1.2083",
                "en": "X42Cr13"
          },
          "iso_group": "P",
          "material_class": "Steel - Stainless Mold Condition",
          "condition": "Prehardened 30 HRC",
          "composition": {
                "carbon": {
                      "min": 0.36,
                      "max": 0.5,
                      "typical": 0.42
                },
                "chromium": {
                      "min": 12.0,
                      "max": 14.0,
                      "typical": 13.0
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7772,
                "melting_point": {
                      "solidus": 1466
                },
                "thermal_conductivity": 24.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 285,
                      "rockwell_c": 30,
                      "vickers": 299
                },
                "tensile_strength": {
                      "typical": 980
                },
                "yield_strength": {
                      "typical": 850
                },
                "elongation": {
                      "typical": 14
                }
          },
          "kienzle": {
                "kc1_1": 2300,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 800,
                "B": 850,
                "C": 0.016,
                "n": 0.36,
                "m": 1.02
          },
          "taylor": {
                "C": 125,
                "n": 0.17
          },
          "machinability": {
                "aisi_rating": 42,
                "relative_to_1212": 0.42
          },
          "notes": "Standard prehardened stainless mold"
    },

    "P-CS-337": {
          "id": "P-CS-337",
          "name": "420 Stainless Mold 50 HRC",
          "designation": {
                "aisi_sae": "420",
                "uns": "S42000",
                "din": "1.2083",
                "en": "X42Cr13"
          },
          "iso_group": "H",
          "material_class": "Steel - Stainless Mold Condition",
          "condition": "Hardened 50 HRC",
          "composition": {
                "carbon": {
                      "min": 0.36,
                      "max": 0.5,
                      "typical": 0.42
                },
                "chromium": {
                      "min": 12.0,
                      "max": 14.0,
                      "typical": 13.0
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7772,
                "melting_point": {
                      "solidus": 1466
                },
                "thermal_conductivity": 24.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 480,
                      "rockwell_c": 50,
                      "vickers": 504
                },
                "tensile_strength": {
                      "typical": 1620
                },
                "yield_strength": {
                      "typical": 1500
                },
                "elongation": {
                      "typical": 5
                }
          },
          "kienzle": {
                "kc1_1": 3250,
                "mc": 0.19
          },
          "johnson_cook": {
                "A": 1380,
                "B": 940,
                "C": 0.008,
                "n": 0.25,
                "m": 1.12
          },
          "taylor": {
                "C": 72,
                "n": 0.12
          },
          "machinability": {
                "aisi_rating": 20,
                "relative_to_1212": 0.2
          },
          "notes": "High polish molds - optical parts"
    },

    "P-CS-338": {
          "id": "P-CS-338",
          "name": "420 ESR Stainless Premium 52 HRC",
          "designation": {
                "aisi_sae": "420ESR",
                "uns": "S42000",
                "din": "1.2083ESR",
                "en": "X42Cr13ESR"
          },
          "iso_group": "H",
          "material_class": "Steel - Stainless Mold Condition",
          "condition": "ESR + Hardened 52 HRC",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.48,
                      "typical": 0.42
                },
                "chromium": {
                      "min": 12.5,
                      "max": 14.5,
                      "typical": 13.5
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7769,
                "melting_point": {
                      "solidus": 1466
                },
                "thermal_conductivity": 24.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 510,
                      "rockwell_c": 52,
                      "vickers": 535
                },
                "tensile_strength": {
                      "typical": 1720
                },
                "yield_strength": {
                      "typical": 1600
                },
                "elongation": {
                      "typical": 4
                }
          },
          "kienzle": {
                "kc1_1": 3400,
                "mc": 0.19
          },
          "johnson_cook": {
                "A": 1450,
                "B": 960,
                "C": 0.007,
                "n": 0.23,
                "m": 1.14
          },
          "taylor": {
                "C": 68,
                "n": 0.11
          },
          "machinability": {
                "aisi_rating": 18,
                "relative_to_1212": 0.18
          },
          "notes": "ESR quality - superior polish, lens molds"
    },

    "P-CS-339": {
          "id": "P-CS-339",
          "name": "DIN 1.7225 42CrMo4 Normalized",
          "designation": {
                "aisi_sae": "",
                "uns": "",
                "din": "1.7225",
                "en": "42CrMo4"
          },
          "iso_group": "P",
          "material_class": "Steel - Din Equivalent",
          "condition": "Normalized (+N)",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.45,
                      "typical": 0.42
                },
                "chromium": {
                      "min": 0.9,
                      "max": 1.2,
                      "typical": 1.1
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.3,
                      "typical": 0.22
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7831,
                "melting_point": {
                      "solidus": 1466
                },
                "thermal_conductivity": 42.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 210,
                      "rockwell_c": null,
                      "vickers": 220
                },
                "tensile_strength": {
                      "typical": 710
                },
                "yield_strength": {
                      "typical": 470
                },
                "elongation": {
                      "typical": 16
                }
          },
          "kienzle": {
                "kc1_1": 2000,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 560,
                "B": 760,
                "C": 0.024,
                "n": 0.42,
                "m": 0.96
          },
          "taylor": {
                "C": 145,
                "n": 0.2
          },
          "machinability": {
                "aisi_rating": 52,
                "relative_to_1212": 0.52
          },
          "notes": "European 4140 equivalent - normalized condition"
    },

    "P-CS-340": {
          "id": "P-CS-340",
          "name": "DIN 1.7225 42CrMo4 Q&T +QT",
          "designation": {
                "aisi_sae": "",
                "uns": "",
                "din": "1.7225",
                "en": "42CrMo4"
          },
          "iso_group": "P",
          "material_class": "Steel - Din Equivalent",
          "condition": "Quenched & Tempered (+QT) 30 HRC",
          "composition": {
                "carbon": {
                      "min": 0.38,
                      "max": 0.45,
                      "typical": 0.42
                },
                "chromium": {
                      "min": 0.9,
                      "max": 1.2,
                      "typical": 1.1
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.3,
                      "typical": 0.22
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7831,
                "melting_point": {
                      "solidus": 1466
                },
                "thermal_conductivity": 42.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 285,
                      "rockwell_c": 30,
                      "vickers": 299
                },
                "tensile_strength": {
                      "typical": 1000
                },
                "yield_strength": {
                      "typical": 900
                },
                "elongation": {
                      "typical": 11
                }
          },
          "kienzle": {
                "kc1_1": 2300,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 820,
                "B": 860,
                "C": 0.014,
                "n": 0.34,
                "m": 1.04
          },
          "taylor": {
                "C": 130,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 45,
                "relative_to_1212": 0.45
          },
          "notes": "European 4140 Q&T condition"
    },

    "P-CS-341": {
          "id": "P-CS-341",
          "name": "DIN 1.6582 34CrNiMo6 +N",
          "designation": {
                "aisi_sae": "",
                "uns": "",
                "din": "1.6582",
                "en": "34CrNiMo6"
          },
          "iso_group": "P",
          "material_class": "Steel - Din Equivalent",
          "condition": "Normalized (+N)",
          "composition": {
                "carbon": {
                      "min": 0.3,
                      "max": 0.38,
                      "typical": 0.34
                },
                "chromium": {
                      "min": 1.3,
                      "max": 1.7,
                      "typical": 1.5
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.3,
                      "typical": 0.22
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 1.3,
                      "max": 1.7,
                      "typical": 1.5
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7832,
                "melting_point": {
                      "solidus": 1472
                },
                "thermal_conductivity": 38.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 220,
                      "rockwell_c": null,
                      "vickers": 231
                },
                "tensile_strength": {
                      "typical": 760
                },
                "yield_strength": {
                      "typical": 530
                },
                "elongation": {
                      "typical": 14
                }
          },
          "kienzle": {
                "kc1_1": 2080,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 600,
                "B": 780,
                "C": 0.022,
                "n": 0.4,
                "m": 0.98
          },
          "taylor": {
                "C": 140,
                "n": 0.19
          },
          "machinability": {
                "aisi_rating": 50,
                "relative_to_1212": 0.5
          },
          "notes": "European 4340 equivalent - normalized"
    },

    "P-CS-342": {
          "id": "P-CS-342",
          "name": "DIN 1.6582 34CrNiMo6 +QT",
          "designation": {
                "aisi_sae": "",
                "uns": "",
                "din": "1.6582",
                "en": "34CrNiMo6"
          },
          "iso_group": "P",
          "material_class": "Steel - Din Equivalent",
          "condition": "Quenched & Tempered (+QT) 32 HRC",
          "composition": {
                "carbon": {
                      "min": 0.3,
                      "max": 0.38,
                      "typical": 0.34
                },
                "chromium": {
                      "min": 1.3,
                      "max": 1.7,
                      "typical": 1.5
                },
                "molybdenum": {
                      "min": 0.15,
                      "max": 0.3,
                      "typical": 0.22
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 1.3,
                      "max": 1.7,
                      "typical": 1.5
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7832,
                "melting_point": {
                      "solidus": 1472
                },
                "thermal_conductivity": 38.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 302,
                      "rockwell_c": 32,
                      "vickers": 317
                },
                "tensile_strength": {
                      "typical": 1050
                },
                "yield_strength": {
                      "typical": 900
                },
                "elongation": {
                      "typical": 11
                }
          },
          "kienzle": {
                "kc1_1": 2400,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 870,
                "B": 870,
                "C": 0.014,
                "n": 0.33,
                "m": 1.05
          },
          "taylor": {
                "C": 125,
                "n": 0.17
          },
          "machinability": {
                "aisi_rating": 42,
                "relative_to_1212": 0.42
          },
          "notes": "European 4340 Q&T condition"
    },

    "P-CS-343": {
          "id": "P-CS-343",
          "name": "DIN 1.7131 16MnCr5 Case Hardening",
          "designation": {
                "aisi_sae": "",
                "uns": "",
                "din": "1.7131",
                "en": "16MnCr5"
          },
          "iso_group": "H",
          "material_class": "Steel - Din Equivalent",
          "condition": "Case Hardened 60 HRC surface",
          "composition": {
                "carbon": {
                      "min": 0.14,
                      "max": 0.19,
                      "typical": 0.17
                },
                "chromium": {
                      "min": 0.8,
                      "max": 1.1,
                      "typical": 1.0
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7839,
                "melting_point": {
                      "solidus": 1486
                },
                "thermal_conductivity": 46.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 600,
                      "rockwell_c": 60,
                      "vickers": 630
                },
                "tensile_strength": {
                      "typical": 2000
                },
                "yield_strength": {
                      "typical": 1800
                },
                "elongation": {
                      "typical": 3
                }
          },
          "kienzle": {
                "kc1_1": 4200,
                "mc": 0.18
          },
          "johnson_cook": {
                "A": 1700,
                "B": 980,
                "C": 0.006,
                "n": 0.22,
                "m": 1.16
          },
          "taylor": {
                "C": 50,
                "n": 0.09
          },
          "machinability": {
                "aisi_rating": 12,
                "relative_to_1212": 0.12
          },
          "notes": "European 5115 equivalent - carburized gears"
    },

    "P-CS-344": {
          "id": "P-CS-344",
          "name": "DIN 1.7147 20MnCr5 Case Hardening",
          "designation": {
                "aisi_sae": "",
                "uns": "",
                "din": "1.7147",
                "en": "20MnCr5"
          },
          "iso_group": "H",
          "material_class": "Steel - Din Equivalent",
          "condition": "Case Hardened 60 HRC surface",
          "composition": {
                "carbon": {
                      "min": 0.17,
                      "max": 0.22,
                      "typical": 0.2
                },
                "chromium": {
                      "min": 1.0,
                      "max": 1.3,
                      "typical": 1.15
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7838,
                "melting_point": {
                      "solidus": 1484
                },
                "thermal_conductivity": 44.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 600,
                      "rockwell_c": 60,
                      "vickers": 630
                },
                "tensile_strength": {
                      "typical": 2000
                },
                "yield_strength": {
                      "typical": 1850
                },
                "elongation": {
                      "typical": 3
                }
          },
          "kienzle": {
                "kc1_1": 4250,
                "mc": 0.18
          },
          "johnson_cook": {
                "A": 1720,
                "B": 985,
                "C": 0.006,
                "n": 0.21,
                "m": 1.17
          },
          "taylor": {
                "C": 48,
                "n": 0.09
          },
          "machinability": {
                "aisi_rating": 12,
                "relative_to_1212": 0.12
          },
          "notes": "European 5120 equivalent - heavy duty gears"
    },

    "P-CS-345": {
          "id": "P-CS-345",
          "name": "DIN 1.6587 18CrNiMo7-6 Carburizing",
          "designation": {
                "aisi_sae": "",
                "uns": "",
                "din": "1.6587",
                "en": "18CrNiMo7-6"
          },
          "iso_group": "H",
          "material_class": "Steel - Din Equivalent",
          "condition": "Carburized 61 HRC surface",
          "composition": {
                "carbon": {
                      "min": 0.15,
                      "max": 0.21,
                      "typical": 0.18
                },
                "chromium": {
                      "min": 1.5,
                      "max": 1.8,
                      "typical": 1.7
                },
                "molybdenum": {
                      "min": 0.25,
                      "max": 0.35,
                      "typical": 0.3
                },
                "vanadium": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                },
                "nickel": {
                      "min": 1.4,
                      "max": 1.7,
                      "typical": 1.55
                },
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7836,
                "melting_point": {
                      "solidus": 1485
                },
                "thermal_conductivity": 36.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 615,
                      "rockwell_c": 61,
                      "vickers": 645
                },
                "tensile_strength": {
                      "typical": 2070
                },
                "yield_strength": {
                      "typical": 1950
                },
                "elongation": {
                      "typical": 3
                }
          },
          "kienzle": {
                "kc1_1": 4350,
                "mc": 0.18
          },
          "johnson_cook": {
                "A": 1780,
                "B": 995,
                "C": 0.006,
                "n": 0.2,
                "m": 1.18
          },
          "taylor": {
                "C": 46,
                "n": 0.08
          },
          "machinability": {
                "aisi_rating": 11,
                "relative_to_1212": 0.11
          },
          "notes": "European premium gear steel - wind turbines"
    },

    "P-CS-346": {
          "id": "P-CS-346",
          "name": "AISI 1045 Cold Drawn",
          "designation": {
                "aisi_sae": "1045",
                "uns": "G10450",
                "din": "1.1191",
                "en": "C45"
          },
          "iso_group": "P",
          "material_class": "Steel - Cold Worked",
          "condition": "Cold Drawn +5-10% area reduction",
          "composition": {
                "carbon": {
                      "min": 0.43,
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7836,
                "melting_point": {
                      "solidus": 1463
                },
                "thermal_conductivity": 49.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 225,
                      "rockwell_c": 20,
                      "vickers": 236
                },
                "tensile_strength": {
                      "typical": 765
                },
                "yield_strength": {
                      "typical": 610
                },
                "elongation": {
                      "typical": 12
                }
          },
          "kienzle": {
                "kc1_1": 2100,
                "mc": 0.23
          },
          "johnson_cook": {
                "A": 660,
                "B": 790,
                "C": 0.018,
                "n": 0.38,
                "m": 1.0
          },
          "taylor": {
                "C": 140,
                "n": 0.19
          },
          "machinability": {
                "aisi_rating": 50,
                "relative_to_1212": 0.5
          },
          "notes": "Cold drawn bar - improved straightness + yield"
    },

    "P-CS-347": {
          "id": "P-CS-347",
          "name": "12L14 Cold Drawn Free Cutting",
          "designation": {
                "aisi_sae": "12L14",
                "uns": "G12144",
                "din": "1.0718",
                "en": "11SMnPb30"
          },
          "iso_group": "P",
          "material_class": "Steel - Cold Worked",
          "condition": "Cold Drawn",
          "composition": {
                "carbon": {
                      "min": 0,
                      "max": 0.15,
                      "typical": 0.1
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7847,
                "melting_point": {
                      "solidus": 1492
                },
                "thermal_conductivity": 51.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 165,
                      "rockwell_c": null,
                      "vickers": 173
                },
                "tensile_strength": {
                      "typical": 540
                },
                "yield_strength": {
                      "typical": 415
                },
                "elongation": {
                      "typical": 18
                }
          },
          "kienzle": {
                "kc1_1": 1500,
                "mc": 0.26
          },
          "johnson_cook": {
                "A": 380,
                "B": 580,
                "C": 0.05,
                "n": 0.55,
                "m": 0.82
          },
          "taylor": {
                "C": 250,
                "n": 0.32
          },
          "machinability": {
                "aisi_rating": 100,
                "relative_to_1212": 1.0
          },
          "notes": "100% machinability reference - screw machine stock"
    },

    "P-CS-348": {
          "id": "P-CS-348",
          "name": "AISI 1018 Cold Rolled Sheet",
          "designation": {
                "aisi_sae": "1018",
                "uns": "G10180",
                "din": "1.0453",
                "en": "DC04"
          },
          "iso_group": "P",
          "material_class": "Steel - Cold Worked",
          "condition": "Cold Rolled",
          "composition": {
                "carbon": {
                      "min": 0.15,
                      "max": 0.2,
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7844,
                "melting_point": {
                      "solidus": 1485
                },
                "thermal_conductivity": 51.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 140,
                      "rockwell_c": null,
                      "vickers": 147
                },
                "tensile_strength": {
                      "typical": 440
                },
                "yield_strength": {
                      "typical": 370
                },
                "elongation": {
                      "typical": 15
                }
          },
          "kienzle": {
                "kc1_1": 1580,
                "mc": 0.25
          },
          "johnson_cook": {
                "A": 360,
                "B": 600,
                "C": 0.04,
                "n": 0.52,
                "m": 0.86
          },
          "taylor": {
                "C": 175,
                "n": 0.24
          },
          "machinability": {
                "aisi_rating": 65,
                "relative_to_1212": 0.65
          },
          "notes": "Cold rolled sheet/strip - forming applications"
    },

    "P-CS-349": {
          "id": "P-CS-349",
          "name": "AISI 4140 Cold Drawn Pre-turned",
          "designation": {
                "aisi_sae": "4140",
                "uns": "G41400",
                "din": "1.7225",
                "en": "42CrMo4"
          },
          "iso_group": "P",
          "material_class": "Steel - Cold Worked",
          "condition": "Cold Drawn + Stress Relieved",
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7832,
                "melting_point": {
                      "solidus": 1467
                },
                "thermal_conductivity": 42.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 260,
                      "rockwell_c": 26,
                      "vickers": 273
                },
                "tensile_strength": {
                      "typical": 900
                },
                "yield_strength": {
                      "typical": 790
                },
                "elongation": {
                      "typical": 14
                }
          },
          "kienzle": {
                "kc1_1": 2200,
                "mc": 0.22
          },
          "johnson_cook": {
                "A": 740,
                "B": 840,
                "C": 0.016,
                "n": 0.36,
                "m": 1.02
          },
          "taylor": {
                "C": 135,
                "n": 0.18
          },
          "machinability": {
                "aisi_rating": 48,
                "relative_to_1212": 0.48
          },
          "notes": "Precision ground bar stock - ready to machine"
    },

    "P-CS-350": {
          "id": "P-CS-350",
          "name": "AISI 8620 Cold Drawn Case Hardening",
          "designation": {
                "aisi_sae": "8620",
                "uns": "G86200",
                "din": "1.6523",
                "en": "21NiCrMo2"
          },
          "iso_group": "P",
          "material_class": "Steel - Cold Worked",
          "condition": "Cold Drawn 185 HB",
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
                "tungsten": {
                      "min": 0,
                      "max": 0,
                      "typical": 0
                }
          },
          "physical": {
                "density": 7841,
                "melting_point": {
                      "solidus": 1484
                },
                "thermal_conductivity": 46.0
          },
          "mechanical": {
                "hardness": {
                      "brinell": 185,
                      "rockwell_c": null,
                      "vickers": 194
                },
                "tensile_strength": {
                      "typical": 630
                },
                "yield_strength": {
                      "typical": 520
                },
                "elongation": {
                      "typical": 16
                }
          },
          "kienzle": {
                "kc1_1": 1850,
                "mc": 0.24
          },
          "johnson_cook": {
                "A": 500,
                "B": 720,
                "C": 0.026,
                "n": 0.44,
                "m": 0.94
          },
          "taylor": {
                "C": 150,
                "n": 0.21
          },
          "machinability": {
                "aisi_rating": 55,
                "relative_to_1212": 0.55
          },
          "notes": "Cold drawn case hardening grade - gears before carburizing"
    }
  }
};
if (typeof module !== "undefined") 
// ============================================================================
// ENHANCED SECTIONS - Auto-generated 2026-01-25 01:34
// Category: P_STEELS | Materials: 50 | Sections added: 5
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

module.exports = STEELS_301_350;
