/**
 * PRISM_UNIFIED_SCIENTIFIC_MATERIALS_DATABASE
 * Created: Session 1.A.1-CONSOLIDATION - January 22, 2026
 * 
 * UNIFIED database with ALL scientific/mathematical data for supremely accurate:
 * - Speeds and feeds calculations
 * - Cutting force predictions (Kienzle, Merchant)
 * - Tool life predictions (Taylor)
 * - Thermal analysis (Johnson-Cook)
 * - Surface finish predictions
 * - Chatter/vibration analysis
 * 
 * REQUIRED FOR EVERY MATERIAL:
 * - Physical: density, elastic modulus, Poisson's ratio, hardness
 * - Thermal: conductivity, specific heat, expansion coefficient, melting point
 * - Cutting: Kc1.1, mc, Taylor n, base cutting speeds
 * - Johnson-Cook: A, B, C, n, m (for strain-rate dependent calculations)
 * - Machinability: index, chip type, work hardening tendency
 * - Heat treatment states: multiple conditions with adjusted properties
 */

const PRISM_UNIFIED_SCIENTIFIC_MATERIALS = {
    version: '1.0.0',
    created: '2026-01-22',
    sources: [
        'MIT 2.008 - Fundamentals of Manufacturing',
        'MIT 3.22 - Mechanical Behavior of Materials', 
        'MIT 3.016 - Mathematics for Materials Science',
        'VDI 3323 - Machining Data Standard',
        'Machining Data Handbook (Metcut)',
        'ASM Metals Handbook',
        'Sandvik Coromant Technical Guide',
        'NIST Materials Database'
    ],

    // ═══════════════════════════════════════════════════════════════════════════════
    // CONSTANTS FOR CALCULATIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    constants: {
        eps_dot_ref: 1.0,           // Reference strain rate (1/s) for Johnson-Cook
        T_room: 293,                // Room temperature (K)
        
        // Taylor defaults by ISO group
        taylor_n: {
            P: 0.125,   // Steel
            M: 0.15,    // Stainless
            K: 0.25,    // Cast Iron
            N: 0.40,    // Non-ferrous
            S: 0.15,    // Superalloys (avg of Ti and Ni)
            H: 0.10     // Hardened
        },
        
        // Wear criteria (mm)
        VB_max: { roughing: 0.6, finishing: 0.3, precision: 0.15 }
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // ISO GROUP P - STEELS
    // ═══════════════════════════════════════════════════════════════════════════════
    GROUP_P_STEEL: {
        name: 'Steel (ISO P)',
        color: 'Blue',
        defaultTaylorN: 0.125,
        
        materials: {
            // ─────────────────────────────────────────────────────────────────────
            // LOW CARBON STEELS
            // ─────────────────────────────────────────────────────────────────────
            '1018': {
                name: 'AISI 1018 Low Carbon Steel',
                UNS: 'G10180',
                composition: { C: 0.18, Mn: 0.75, P: 0.04, S: 0.05 },
                
                // PHYSICAL PROPERTIES
                physical: {
                    density: 7870,              // kg/m³
                    elasticModulus: 205000,     // MPa
                    poissonsRatio: 0.29,
                    hardnessBHN: 126
                },
                
                // THERMAL PROPERTIES  
                thermal: {
                    conductivity: 51.9,         // W/(m·K)
                    specificHeat: 486,          // J/(kg·K)
                    expansionCoeff: 11.7e-6,    // 1/K
                    meltingPoint: 1808          // K
                },
                
                // MECHANICAL PROPERTIES
                mechanical: {
                    tensileStrength: 440,       // MPa
                    yieldStrength: 370,         // MPa
                    elongation: 15              // %
                },
                
                // CUTTING PARAMETERS (Kienzle)
                cutting: {
                    Kc11: 1800,                 // N/mm² at h=1mm
                    mc: 0.25,                   // Kienzle exponent
                    taylorN: 0.125,             // Taylor exponent
                    taylorC: 250,               // Taylor constant (typical for carbide)
                    
                    // Recommended speeds (SFM)
                    speeds: {
                        HSS: { min: 70, max: 100, optimal: 85 },
                        carbideUncoated: { min: 250, max: 400, optimal: 325 },
                        carbideCoated: { min: 400, max: 600, optimal: 500 },
                        ceramic: { min: 600, max: 1000, optimal: 800 }
                    },
                    
                    // Feed recommendations (IPR for 0.5" dia)
                    feeds: {
                        roughing: { min: 0.008, max: 0.015, optimal: 0.012 },
                        finishing: { min: 0.003, max: 0.006, optimal: 0.004 }
                    }
                },
                
                // JOHNSON-COOK PARAMETERS (strain-rate sensitivity)
                johnsonCook: {
                    A: 350,     // Yield stress (MPa)
                    B: 530,     // Hardening modulus (MPa)
                    n: 0.26,    // Hardening exponent
                    C: 0.014,   // Strain rate sensitivity
                    m: 0.9      // Thermal softening exponent
                },
                
                // MACHINABILITY
                machinability: {
                    index: 70,                  // 100 = 1212 free-machining steel
                    chipType: 'continuous',
                    workHardening: 'low',
                    bueTendency: 'moderate',    // Built-up edge tendency
                    coolantRequired: false,
                    notes: 'Good machinability, forms continuous chips'
                },
                
                // HEAT TREATMENT STATES
                heatTreatStates: {
                    asRolled: {
                        hardnessBHN: 126,
                        tensileStrength: 440,
                        yieldStrength: 370,
                        machinabilityIndex: 70,
                        Kc11: 1800
                    },
                    coldDrawn: {
                        hardnessBHN: 143,
                        tensileStrength: 490,
                        yieldStrength: 415,
                        machinabilityIndex: 65,
                        Kc11: 1900
                    },
                    annealed: {
                        hardnessBHN: 111,
                        tensileStrength: 385,
                        yieldStrength: 295,
                        machinabilityIndex: 78,
                        Kc11: 1700
                    }
                }
            },

            '1045': {
                name: 'AISI 1045 Medium Carbon Steel',
                UNS: 'G10450',
                composition: { C: 0.45, Mn: 0.75, P: 0.04, S: 0.05 },
                
                physical: {
                    density: 7850,
                    elasticModulus: 206000,
                    poissonsRatio: 0.29,
                    hardnessBHN: 179
                },
                
                thermal: {
                    conductivity: 49.8,
                    specificHeat: 486,
                    expansionCoeff: 11.2e-6,
                    meltingPoint: 1793
                },
                
                mechanical: {
                    tensileStrength: 585,
                    yieldStrength: 450,
                    elongation: 12
                },
                
                cutting: {
                    Kc11: 2000,
                    mc: 0.25,
                    taylorN: 0.125,
                    taylorC: 220,
                    speeds: {
                        HSS: { min: 60, max: 90, optimal: 75 },
                        carbideUncoated: { min: 200, max: 350, optimal: 275 },
                        carbideCoated: { min: 350, max: 550, optimal: 450 },
                        ceramic: { min: 500, max: 900, optimal: 700 }
                    },
                    feeds: {
                        roughing: { min: 0.008, max: 0.012, optimal: 0.010 },
                        finishing: { min: 0.002, max: 0.005, optimal: 0.003 }
                    }
                },
                
                johnsonCook: {
                    A: 553, B: 601, n: 0.234, C: 0.0134, m: 1.0
                },
                
                machinability: {
                    index: 57,
                    chipType: 'continuous',
                    workHardening: 'low',
                    bueTendency: 'low',
                    coolantRequired: true,
                    notes: 'Good finish capability, common shaft material'
                },
                
                heatTreatStates: {
                    annealed: {
                        hardnessBHN: 163,
                        tensileStrength: 565,
                        yieldStrength: 310,
                        machinabilityIndex: 64,
                        Kc11: 1900
                    },
                    normalized: {
                        hardnessBHN: 179,
                        tensileStrength: 585,
                        yieldStrength: 450,
                        machinabilityIndex: 57,
                        Kc11: 2000
                    },
                    quenchTempered_HRC28: {
                        hardnessBHN: 269,
                        tensileStrength: 830,
                        yieldStrength: 690,
                        machinabilityIndex: 38,
                        Kc11: 2400
                    },
                    quenchTempered_HRC40: {
                        hardnessBHN: 375,
                        tensileStrength: 1150,
                        yieldStrength: 1000,
                        machinabilityIndex: 22,
                        Kc11: 3200
                    }
                }
            },

            '4140': {
                name: 'AISI 4140 Chromium-Molybdenum Steel',
                UNS: 'G41400',
                composition: { C: 0.40, Mn: 0.85, Cr: 1.0, Mo: 0.25, P: 0.035, S: 0.04 },
                
                physical: {
                    density: 7850,
                    elasticModulus: 210000,
                    poissonsRatio: 0.29,
                    hardnessBHN: 197
                },
                
                thermal: {
                    conductivity: 42.6,
                    specificHeat: 473,
                    expansionCoeff: 12.3e-6,
                    meltingPoint: 1793
                },
                
                mechanical: {
                    tensileStrength: 655,
                    yieldStrength: 415,
                    elongation: 25.7
                },
                
                cutting: {
                    Kc11: 2200,
                    mc: 0.25,
                    taylorN: 0.125,
                    taylorC: 200,
                    speeds: {
                        HSS: { min: 50, max: 80, optimal: 65 },
                        carbideUncoated: { min: 180, max: 300, optimal: 240 },
                        carbideCoated: { min: 300, max: 500, optimal: 400 },
                        ceramic: { min: 450, max: 800, optimal: 600 }
                    },
                    feeds: {
                        roughing: { min: 0.006, max: 0.012, optimal: 0.009 },
                        finishing: { min: 0.002, max: 0.004, optimal: 0.003 }
                    }
                },
                
                johnsonCook: {
                    A: 598, B: 768, n: 0.29, C: 0.014, m: 0.99
                },
                
                machinability: {
                    index: 66,
                    chipType: 'continuous',
                    workHardening: 'moderate',
                    bueTendency: 'low',
                    coolantRequired: true,
                    notes: 'Excellent all-around alloy steel. Heat treat response excellent.'
                },
                
                heatTreatStates: {
                    annealed: {
                        hardnessBHN: 197,
                        tensileStrength: 655,
                        yieldStrength: 415,
                        machinabilityIndex: 66,
                        Kc11: 2200
                    },
                    normalized: {
                        hardnessBHN: 217,
                        tensileStrength: 725,
                        yieldStrength: 485,
                        machinabilityIndex: 60,
                        Kc11: 2350
                    },
                    quenchTempered_HRC28: {
                        hardnessBHN: 269,
                        tensileStrength: 910,
                        yieldStrength: 765,
                        machinabilityIndex: 45,
                        Kc11: 2650
                    },
                    quenchTempered_HRC35: {
                        hardnessBHN: 321,
                        tensileStrength: 1075,
                        yieldStrength: 945,
                        machinabilityIndex: 32,
                        Kc11: 3000
                    },
                    quenchTempered_HRC42: {
                        hardnessBHN: 388,
                        tensileStrength: 1275,
                        yieldStrength: 1170,
                        machinabilityIndex: 20,
                        Kc11: 3500
                    },
                    quenchTempered_HRC50: {
                        hardnessBHN: 481,
                        tensileStrength: 1550,
                        yieldStrength: 1450,
                        machinabilityIndex: 12,
                        Kc11: 4200,
                        notes: 'Requires CBN or ceramic tooling'
                    }
                }
            },

            '4340': {
                name: 'AISI 4340 Nickel-Chromium-Molybdenum Steel',
                UNS: 'G43400',
                composition: { C: 0.40, Mn: 0.70, Ni: 1.85, Cr: 0.80, Mo: 0.25 },
                
                physical: {
                    density: 7850,
                    elasticModulus: 205000,
                    poissonsRatio: 0.29,
                    hardnessBHN: 217
                },
                
                thermal: {
                    conductivity: 44.5,
                    specificHeat: 475,
                    expansionCoeff: 12.3e-6,
                    meltingPoint: 1793
                },
                
                mechanical: {
                    tensileStrength: 745,
                    yieldStrength: 470,
                    elongation: 22
                },
                
                cutting: {
                    Kc11: 2400,
                    mc: 0.25,
                    taylorN: 0.12,
                    taylorC: 180,
                    speeds: {
                        HSS: { min: 40, max: 70, optimal: 55 },
                        carbideUncoated: { min: 150, max: 280, optimal: 215 },
                        carbideCoated: { min: 280, max: 450, optimal: 365 },
                        ceramic: { min: 400, max: 700, optimal: 550 }
                    },
                    feeds: {
                        roughing: { min: 0.005, max: 0.010, optimal: 0.008 },
                        finishing: { min: 0.002, max: 0.004, optimal: 0.003 }
                    }
                },
                
                johnsonCook: {
                    A: 792, B: 510, n: 0.26, C: 0.014, m: 1.03
                },
                
                machinability: {
                    index: 57,
                    chipType: 'continuous',
                    workHardening: 'moderate',
                    bueTendency: 'low',
                    coolantRequired: true,
                    notes: 'High-strength alloy. Aircraft quality. Deep hardening.'
                },
                
                heatTreatStates: {
                    annealed: {
                        hardnessBHN: 217,
                        tensileStrength: 745,
                        yieldStrength: 470,
                        machinabilityIndex: 57,
                        Kc11: 2400
                    },
                    normalized: {
                        hardnessBHN: 229,
                        tensileStrength: 793,
                        yieldStrength: 515,
                        machinabilityIndex: 52,
                        Kc11: 2500
                    },
                    quenchTempered_HRC35: {
                        hardnessBHN: 321,
                        tensileStrength: 1090,
                        yieldStrength: 985,
                        machinabilityIndex: 30,
                        Kc11: 3100
                    },
                    quenchTempered_HRC45: {
                        hardnessBHN: 415,
                        tensileStrength: 1400,
                        yieldStrength: 1275,
                        machinabilityIndex: 18,
                        Kc11: 3800
                    },
                    quenchTempered_HRC54: {
                        hardnessBHN: 535,
                        tensileStrength: 1820,
                        yieldStrength: 1680,
                        machinabilityIndex: 8,
                        Kc11: 4800,
                        notes: 'Requires CBN tooling, consider grinding'
                    }
                }
            },

            // ─────────────────────────────────────────────────────────────────────
            // TOOL STEELS
            // ─────────────────────────────────────────────────────────────────────
            'A2': {
                name: 'AISI A2 Air-Hardening Tool Steel',
                UNS: 'T30102',
                composition: { C: 1.0, Mn: 0.70, Cr: 5.0, Mo: 1.0, V: 0.2 },
                
                physical: {
                    density: 7860,
                    elasticModulus: 203000,
                    poissonsRatio: 0.28,
                    hardnessBHN: 223
                },
                
                thermal: {
                    conductivity: 30.0,
                    specificHeat: 460,
                    expansionCoeff: 10.8e-6,
                    meltingPoint: 1700
                },
                
                mechanical: {
                    tensileStrength: 760,
                    yieldStrength: 415,
                    elongation: 18
                },
                
                cutting: {
                    Kc11: 2800,
                    mc: 0.22,
                    taylorN: 0.10,
                    taylorC: 120,
                    speeds: {
                        HSS: { min: 25, max: 45, optimal: 35 },
                        carbideUncoated: { min: 80, max: 150, optimal: 115 },
                        carbideCoated: { min: 150, max: 280, optimal: 215 },
                        ceramic: { min: 250, max: 450, optimal: 350 }
                    },
                    feeds: {
                        roughing: { min: 0.004, max: 0.010, optimal: 0.007 },
                        finishing: { min: 0.001, max: 0.003, optimal: 0.002 }
                    }
                },
                
                johnsonCook: {
                    A: 1100, B: 800, n: 0.22, C: 0.008, m: 1.1
                },
                
                machinability: {
                    index: 65,
                    chipType: 'segmented',
                    workHardening: 'moderate',
                    bueTendency: 'low',
                    coolantRequired: true,
                    notes: 'Machine in annealed condition. Air hardening - distortion low.'
                },
                
                heatTreatStates: {
                    annealed: {
                        hardnessBHN: 223,
                        hardnessHRC: null,
                        tensileStrength: 760,
                        yieldStrength: 415,
                        machinabilityIndex: 65,
                        Kc11: 2800,
                        notes: 'Best condition for machining'
                    },
                    hardened_HRC57: {
                        hardnessBHN: 595,
                        hardnessHRC: 57,
                        tensileStrength: 2100,
                        yieldStrength: 1800,
                        machinabilityIndex: 8,
                        Kc11: 5500,
                        speeds: {
                            CBN: { min: 150, max: 300, optimal: 225 },
                            ceramic: { min: 80, max: 180, optimal: 130 }
                        },
                        notes: 'Hard machining only - CBN or ceramic required'
                    },
                    hardened_HRC60: {
                        hardnessBHN: 641,
                        hardnessHRC: 60,
                        tensileStrength: 2300,
                        yieldStrength: 2000,
                        machinabilityIndex: 5,
                        Kc11: 6200,
                        speeds: {
                            CBN: { min: 120, max: 250, optimal: 185 },
                            ceramic: { min: 60, max: 150, optimal: 105 }
                        },
                        notes: 'Grinding often preferred. Very low feeds essential.'
                    },
                    hardened_HRC62: {
                        hardnessBHN: 680,
                        hardnessHRC: 62,
                        tensileStrength: 2500,
                        yieldStrength: 2200,
                        machinabilityIndex: 3,
                        Kc11: 6800,
                        notes: 'Grinding recommended. CBN only for light finishing.'
                    }
                }
            },

            'D2': {
                name: 'AISI D2 High-Carbon High-Chromium Tool Steel',
                UNS: 'T30402',
                composition: { C: 1.55, Mn: 0.40, Cr: 12.0, Mo: 0.8, V: 0.9 },
                
                physical: {
                    density: 7700,
                    elasticModulus: 210000,
                    poissonsRatio: 0.28,
                    hardnessBHN: 241
                },
                
                thermal: {
                    conductivity: 20.0,
                    specificHeat: 460,
                    expansionCoeff: 10.3e-6,
                    meltingPoint: 1695
                },
                
                mechanical: {
                    tensileStrength: 820,
                    yieldStrength: 450,
                    elongation: 15
                },
                
                cutting: {
                    Kc11: 3000,
                    mc: 0.22,
                    taylorN: 0.08,
                    taylorC: 100,
                    speeds: {
                        HSS: { min: 20, max: 35, optimal: 27 },
                        carbideUncoated: { min: 60, max: 120, optimal: 90 },
                        carbideCoated: { min: 120, max: 220, optimal: 170 },
                        ceramic: { min: 200, max: 380, optimal: 290 }
                    },
                    feeds: {
                        roughing: { min: 0.003, max: 0.008, optimal: 0.005 },
                        finishing: { min: 0.001, max: 0.002, optimal: 0.0015 }
                    }
                },
                
                johnsonCook: {
                    A: 1200, B: 850, n: 0.20, C: 0.007, m: 1.15
                },
                
                machinability: {
                    index: 30,
                    chipType: 'segmented',
                    workHardening: 'high',
                    bueTendency: 'very low',
                    coolantRequired: true,
                    notes: 'Difficult to machine. Abrasive due to high chromium carbides.'
                },
                
                heatTreatStates: {
                    annealed: {
                        hardnessBHN: 241,
                        hardnessHRC: null,
                        tensileStrength: 820,
                        yieldStrength: 450,
                        machinabilityIndex: 30,
                        Kc11: 3000,
                        notes: 'Still difficult - high carbide content'
                    },
                    hardened_HRC58: {
                        hardnessBHN: 603,
                        hardnessHRC: 58,
                        tensileStrength: 2200,
                        yieldStrength: 1900,
                        machinabilityIndex: 4,
                        Kc11: 6500,
                        notes: 'EDM or grinding preferred'
                    },
                    hardened_HRC60: {
                        hardnessBHN: 641,
                        hardnessHRC: 60,
                        tensileStrength: 2400,
                        yieldStrength: 2100,
                        machinabilityIndex: 3,
                        Kc11: 7200,
                        notes: 'EDM or grinding required'
                    },
                    hardened_HRC62: {
                        hardnessBHN: 680,
                        hardnessHRC: 62,
                        tensileStrength: 2600,
                        yieldStrength: 2300,
                        machinabilityIndex: 2,
                        Kc11: 8000,
                        notes: 'Wire EDM or precision grinding only'
                    }
                }
            },

            'H13': {
                name: 'AISI H13 Hot-Work Tool Steel',
                UNS: 'T20813',
                composition: { C: 0.40, Mn: 0.40, Si: 1.0, Cr: 5.0, Mo: 1.5, V: 1.0 },
                
                physical: {
                    density: 7800,
                    elasticModulus: 210000,
                    poissonsRatio: 0.28,
                    hardnessBHN: 217
                },
                
                thermal: {
                    conductivity: 28.6,
                    specificHeat: 460,
                    expansionCoeff: 11.5e-6,
                    meltingPoint: 1700
                },
                
                mechanical: {
                    tensileStrength: 730,
                    yieldStrength: 400,
                    elongation: 18
                },
                
                cutting: {
                    Kc11: 2600,
                    mc: 0.23,
                    taylorN: 0.10,
                    taylorC: 130,
                    speeds: {
                        HSS: { min: 30, max: 50, optimal: 40 },
                        carbideUncoated: { min: 100, max: 180, optimal: 140 },
                        carbideCoated: { min: 180, max: 320, optimal: 250 },
                        ceramic: { min: 280, max: 500, optimal: 390 }
                    },
                    feeds: {
                        roughing: { min: 0.004, max: 0.010, optimal: 0.007 },
                        finishing: { min: 0.001, max: 0.003, optimal: 0.002 }
                    }
                },
                
                johnsonCook: {
                    A: 950, B: 750, n: 0.24, C: 0.010, m: 1.05
                },
                
                machinability: {
                    index: 45,
                    chipType: 'continuous',
                    workHardening: 'moderate',
                    bueTendency: 'low',
                    coolantRequired: true,
                    notes: 'Hot work steel. Good hot hardness. Common die steel.'
                },
                
                heatTreatStates: {
                    annealed: {
                        hardnessBHN: 217,
                        hardnessHRC: null,
                        tensileStrength: 730,
                        yieldStrength: 400,
                        machinabilityIndex: 45,
                        Kc11: 2600
                    },
                    hardened_HRC44: {
                        hardnessBHN: 415,
                        hardnessHRC: 44,
                        tensileStrength: 1450,
                        yieldStrength: 1200,
                        machinabilityIndex: 22,
                        Kc11: 3600
                    },
                    hardened_HRC48: {
                        hardnessBHN: 460,
                        hardnessHRC: 48,
                        tensileStrength: 1650,
                        yieldStrength: 1400,
                        machinabilityIndex: 15,
                        Kc11: 4200
                    },
                    hardened_HRC52: {
                        hardnessBHN: 509,
                        hardnessHRC: 52,
                        tensileStrength: 1900,
                        yieldStrength: 1650,
                        machinabilityIndex: 10,
                        Kc11: 4800,
                        notes: 'CBN recommended for finishing'
                    }
                }
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // ISO GROUP M - STAINLESS STEELS  
    // ═══════════════════════════════════════════════════════════════════════════════
    GROUP_M_STAINLESS: {
        name: 'Stainless Steel (ISO M)',
        color: 'Yellow',
        defaultTaylorN: 0.15,
        
        materials: {
            '304': {
                name: 'AISI 304 Austenitic Stainless Steel',
                UNS: 'S30400',
                composition: { C: 0.08, Mn: 2.0, Cr: 18.0, Ni: 8.0 },
                
                physical: {
                    density: 8000,
                    elasticModulus: 193000,
                    poissonsRatio: 0.27,
                    hardnessBHN: 201
                },
                
                thermal: {
                    conductivity: 16.2,
                    specificHeat: 500,
                    expansionCoeff: 17.2e-6,
                    meltingPoint: 1723
                },
                
                mechanical: {
                    tensileStrength: 580,
                    yieldStrength: 290,
                    elongation: 40
                },
                
                cutting: {
                    Kc11: 2800,
                    mc: 0.22,
                    taylorN: 0.15,
                    taylorC: 150,
                    speeds: {
                        HSS: { min: 40, max: 70, optimal: 55 },
                        carbideUncoated: { min: 120, max: 200, optimal: 160 },
                        carbideCoated: { min: 200, max: 350, optimal: 275 },
                        ceramic: { min: 350, max: 600, optimal: 475 }
                    },
                    feeds: {
                        roughing: { min: 0.006, max: 0.012, optimal: 0.009 },
                        finishing: { min: 0.002, max: 0.004, optimal: 0.003 }
                    }
                },
                
                johnsonCook: {
                    A: 310, B: 1000, n: 0.65, C: 0.07, m: 1.0
                },
                
                machinability: {
                    index: 45,
                    chipType: 'continuous_stringy',
                    workHardening: 'severe',
                    bueTendency: 'high',
                    coolantRequired: true,
                    notes: 'Severe work hardening. Never dwell. Use sharp tools. High feed to get under work-hardened layer.'
                },
                
                heatTreatStates: {
                    annealed: {
                        hardnessBHN: 201,
                        tensileStrength: 580,
                        yieldStrength: 290,
                        machinabilityIndex: 45,
                        Kc11: 2800
                    },
                    coldWorked_1_4_hard: {
                        hardnessBHN: 260,
                        tensileStrength: 760,
                        yieldStrength: 515,
                        machinabilityIndex: 30,
                        Kc11: 3300
                    },
                    coldWorked_1_2_hard: {
                        hardnessBHN: 302,
                        tensileStrength: 930,
                        yieldStrength: 760,
                        machinabilityIndex: 20,
                        Kc11: 3800
                    },
                    coldWorked_full_hard: {
                        hardnessBHN: 363,
                        tensileStrength: 1280,
                        yieldStrength: 965,
                        machinabilityIndex: 12,
                        Kc11: 4500
                    }
                }
            },

            '316L': {
                name: 'AISI 316L Low-Carbon Austenitic Stainless Steel',
                UNS: 'S31603',
                composition: { C: 0.03, Mn: 2.0, Cr: 17.0, Ni: 12.0, Mo: 2.5 },
                
                physical: {
                    density: 8000,
                    elasticModulus: 193000,
                    poissonsRatio: 0.27,
                    hardnessBHN: 200
                },
                
                thermal: {
                    conductivity: 14.6,
                    specificHeat: 500,
                    expansionCoeff: 15.9e-6,
                    meltingPoint: 1673
                },
                
                mechanical: {
                    tensileStrength: 560,
                    yieldStrength: 240,
                    elongation: 45
                },
                
                cutting: {
                    Kc11: 2900,
                    mc: 0.22,
                    taylorN: 0.14,
                    taylorC: 140,
                    speeds: {
                        HSS: { min: 35, max: 60, optimal: 48 },
                        carbideUncoated: { min: 100, max: 180, optimal: 140 },
                        carbideCoated: { min: 180, max: 320, optimal: 250 },
                        ceramic: { min: 320, max: 550, optimal: 435 }
                    },
                    feeds: {
                        roughing: { min: 0.005, max: 0.010, optimal: 0.008 },
                        finishing: { min: 0.002, max: 0.004, optimal: 0.003 }
                    }
                },
                
                johnsonCook: {
                    A: 290, B: 1100, n: 0.63, C: 0.011, m: 0.98
                },
                
                machinability: {
                    index: 45,
                    chipType: 'continuous_stringy',
                    workHardening: 'severe',
                    bueTendency: 'high',
                    coolantRequired: true,
                    notes: 'Medical/marine grade. Lower thermal conductivity than 304. Similar machining challenges.'
                },
                
                heatTreatStates: {
                    annealed: {
                        hardnessBHN: 200,
                        tensileStrength: 560,
                        yieldStrength: 240,
                        machinabilityIndex: 45,
                        Kc11: 2900
                    }
                }
            },

            '17-4PH': {
                name: '17-4 PH Precipitation Hardening Stainless Steel',
                UNS: 'S17400',
                composition: { C: 0.07, Mn: 1.0, Cr: 17.0, Ni: 4.0, Cu: 4.0, Nb: 0.3 },
                
                physical: {
                    density: 7800,
                    elasticModulus: 196000,
                    poissonsRatio: 0.28,
                    hardnessBHN: 363
                },
                
                thermal: {
                    conductivity: 18.0,
                    specificHeat: 460,
                    expansionCoeff: 10.8e-6,
                    meltingPoint: 1713
                },
                
                mechanical: {
                    tensileStrength: 1310,
                    yieldStrength: 1170,
                    elongation: 10
                },
                
                cutting: {
                    Kc11: 3200,
                    mc: 0.22,
                    taylorN: 0.12,
                    taylorC: 120,
                    speeds: {
                        HSS: { min: 25, max: 45, optimal: 35 },
                        carbideUncoated: { min: 80, max: 150, optimal: 115 },
                        carbideCoated: { min: 150, max: 280, optimal: 215 },
                        ceramic: { min: 280, max: 500, optimal: 390 }
                    },
                    feeds: {
                        roughing: { min: 0.004, max: 0.008, optimal: 0.006 },
                        finishing: { min: 0.001, max: 0.003, optimal: 0.002 }
                    }
                },
                
                johnsonCook: {
                    A: 650, B: 850, n: 0.38, C: 0.018, m: 1.08
                },
                
                machinability: {
                    index: 40,
                    chipType: 'segmented',
                    workHardening: 'moderate',
                    bueTendency: 'moderate',
                    coolantRequired: true,
                    notes: 'PH stainless. Machine in solution-treated condition when possible.'
                },
                
                heatTreatStates: {
                    solutionTreated: {
                        hardnessBHN: 302,
                        hardnessHRC: 31,
                        tensileStrength: 1070,
                        yieldStrength: 795,
                        machinabilityIndex: 48,
                        Kc11: 2900,
                        notes: 'Best condition for machining'
                    },
                    H900: {
                        hardnessBHN: 415,
                        hardnessHRC: 44,
                        tensileStrength: 1380,
                        yieldStrength: 1240,
                        machinabilityIndex: 35,
                        Kc11: 3500
                    },
                    H1025: {
                        hardnessBHN: 363,
                        hardnessHRC: 38,
                        tensileStrength: 1170,
                        yieldStrength: 1070,
                        machinabilityIndex: 42,
                        Kc11: 3200
                    },
                    H1150: {
                        hardnessBHN: 311,
                        hardnessHRC: 32,
                        tensileStrength: 965,
                        yieldStrength: 860,
                        machinabilityIndex: 50,
                        Kc11: 2950
                    }
                }
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // ISO GROUP N - NON-FERROUS (Aluminum, Copper, etc.)
    // ═══════════════════════════════════════════════════════════════════════════════
    GROUP_N_NONFERROUS: {
        name: 'Non-Ferrous (ISO N)',
        color: 'Green',
        defaultTaylorN: 0.40,
        
        materials: {
            '6061-T6': {
                name: 'AA 6061-T6 Aluminum Alloy',
                UNS: 'A96061',
                composition: { Al: 97.2, Mg: 1.0, Si: 0.6, Cu: 0.28, Cr: 0.2 },
                
                physical: {
                    density: 2700,
                    elasticModulus: 68900,
                    poissonsRatio: 0.33,
                    hardnessBHN: 95
                },
                
                thermal: {
                    conductivity: 167,
                    specificHeat: 896,
                    expansionCoeff: 23.6e-6,
                    meltingPoint: 855
                },
                
                mechanical: {
                    tensileStrength: 310,
                    yieldStrength: 275,
                    elongation: 12
                },
                
                cutting: {
                    Kc11: 700,
                    mc: 0.25,
                    taylorN: 0.40,
                    taylorC: 800,
                    speeds: {
                        HSS: { min: 300, max: 600, optimal: 450 },
                        carbideUncoated: { min: 800, max: 1500, optimal: 1150 },
                        carbideCoated: { min: 1000, max: 2000, optimal: 1500 },
                        PCD: { min: 2000, max: 5000, optimal: 3500 }
                    },
                    feeds: {
                        roughing: { min: 0.010, max: 0.025, optimal: 0.018 },
                        finishing: { min: 0.004, max: 0.008, optimal: 0.006 }
                    }
                },
                
                johnsonCook: {
                    A: 324, B: 114, n: 0.42, C: 0.002, m: 1.34
                },
                
                machinability: {
                    index: 85,
                    chipType: 'continuous',
                    workHardening: 'none',
                    bueTendency: 'moderate',
                    coolantRequired: false,
                    notes: 'Excellent machinability. High speeds possible. Watch for BUE at low speeds.'
                },
                
                heatTreatStates: {
                    T6: {
                        hardnessBHN: 95,
                        tensileStrength: 310,
                        yieldStrength: 275,
                        machinabilityIndex: 85,
                        Kc11: 700
                    },
                    T651: {
                        hardnessBHN: 95,
                        tensileStrength: 310,
                        yieldStrength: 275,
                        machinabilityIndex: 85,
                        Kc11: 700,
                        notes: 'Stress relieved by stretching'
                    },
                    O_annealed: {
                        hardnessBHN: 30,
                        tensileStrength: 125,
                        yieldStrength: 55,
                        machinabilityIndex: 110,
                        Kc11: 500,
                        notes: 'Very soft - gummy, BUE prone'
                    }
                }
            },

            '7075-T6': {
                name: 'AA 7075-T6 Aluminum Alloy (Aerospace)',
                UNS: 'A97075',
                composition: { Al: 89.5, Zn: 5.6, Mg: 2.5, Cu: 1.6, Cr: 0.23 },
                
                physical: {
                    density: 2810,
                    elasticModulus: 71700,
                    poissonsRatio: 0.33,
                    hardnessBHN: 150
                },
                
                thermal: {
                    conductivity: 130,
                    specificHeat: 960,
                    expansionCoeff: 23.4e-6,
                    meltingPoint: 750
                },
                
                mechanical: {
                    tensileStrength: 572,
                    yieldStrength: 503,
                    elongation: 11
                },
                
                cutting: {
                    Kc11: 800,
                    mc: 0.25,
                    taylorN: 0.38,
                    taylorC: 750,
                    speeds: {
                        HSS: { min: 250, max: 500, optimal: 375 },
                        carbideUncoated: { min: 700, max: 1400, optimal: 1050 },
                        carbideCoated: { min: 900, max: 1800, optimal: 1350 },
                        PCD: { min: 1800, max: 4500, optimal: 3150 }
                    },
                    feeds: {
                        roughing: { min: 0.008, max: 0.020, optimal: 0.014 },
                        finishing: { min: 0.003, max: 0.006, optimal: 0.0045 }
                    }
                },
                
                johnsonCook: {
                    A: 520, B: 477, n: 0.52, C: 0.001, m: 1.61
                },
                
                machinability: {
                    index: 50,
                    chipType: 'continuous',
                    workHardening: 'slight',
                    bueTendency: 'low',
                    coolantRequired: false,
                    notes: 'High-strength aerospace aluminum. Lower machinability than 6061. Excellent finish capability.'
                },
                
                heatTreatStates: {
                    T6: {
                        hardnessBHN: 150,
                        tensileStrength: 572,
                        yieldStrength: 503,
                        machinabilityIndex: 50,
                        Kc11: 800
                    },
                    T651: {
                        hardnessBHN: 150,
                        tensileStrength: 572,
                        yieldStrength: 503,
                        machinabilityIndex: 50,
                        Kc11: 800,
                        notes: 'Stress relieved - preferred for machining'
                    },
                    O_annealed: {
                        hardnessBHN: 60,
                        tensileStrength: 228,
                        yieldStrength: 103,
                        machinabilityIndex: 75,
                        Kc11: 600,
                        notes: 'Soft - may be gummy'
                    }
                }
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // ISO GROUP S - SUPERALLOYS (Titanium, Nickel, Cobalt)
    // ═══════════════════════════════════════════════════════════════════════════════
    GROUP_S_SUPERALLOYS: {
        name: 'Superalloys (ISO S)',
        color: 'Orange',
        defaultTaylorN: 0.15,
        
        materials: {
            'Ti-6Al-4V': {
                name: 'Ti-6Al-4V (Grade 5) Titanium Alloy',
                UNS: 'R56400',
                composition: { Ti: 90, Al: 6, V: 4 },
                
                physical: {
                    density: 4430,
                    elasticModulus: 113800,
                    poissonsRatio: 0.34,
                    hardnessBHN: 334
                },
                
                thermal: {
                    conductivity: 6.7,
                    specificHeat: 526,
                    expansionCoeff: 8.6e-6,
                    meltingPoint: 1878
                },
                
                mechanical: {
                    tensileStrength: 950,
                    yieldStrength: 880,
                    elongation: 14
                },
                
                cutting: {
                    Kc11: 1600,
                    mc: 0.23,
                    taylorN: 0.20,
                    taylorC: 80,
                    speeds: {
                        HSS: { min: 20, max: 40, optimal: 30 },
                        carbideUncoated: { min: 100, max: 180, optimal: 140 },
                        carbideCoated: { min: 150, max: 280, optimal: 215 },
                        ceramic: { min: 250, max: 450, optimal: 350 }
                    },
                    feeds: {
                        roughing: { min: 0.004, max: 0.010, optimal: 0.007 },
                        finishing: { min: 0.002, max: 0.004, optimal: 0.003 }
                    }
                },
                
                johnsonCook: {
                    A: 862, B: 331, n: 0.34, C: 0.012, m: 0.8
                },
                
                machinability: {
                    index: 28,
                    chipType: 'segmented',
                    workHardening: 'high',
                    bueTendency: 'high',
                    coolantRequired: true,
                    notes: 'Very low thermal conductivity - heat stays in cut zone. Use sharp tools, flood coolant, moderate speeds, high feeds.'
                },
                
                heatTreatStates: {
                    annealed: {
                        hardnessBHN: 302,
                        tensileStrength: 895,
                        yieldStrength: 830,
                        machinabilityIndex: 30,
                        Kc11: 1500
                    },
                    STA: {
                        hardnessBHN: 370,
                        tensileStrength: 1100,
                        yieldStrength: 1000,
                        machinabilityIndex: 22,
                        Kc11: 1800,
                        notes: 'Solution Treated and Aged'
                    }
                }
            },

            'Inconel 718': {
                name: 'Inconel 718 Nickel Superalloy',
                UNS: 'N07718',
                composition: { Ni: 52.5, Cr: 19, Fe: 18.5, Nb: 5.1, Mo: 3.05, Ti: 0.9, Al: 0.5 },
                
                physical: {
                    density: 8190,
                    elasticModulus: 200000,
                    poissonsRatio: 0.29,
                    hardnessBHN: 363
                },
                
                thermal: {
                    conductivity: 11.4,
                    specificHeat: 435,
                    expansionCoeff: 13.0e-6,
                    meltingPoint: 1623
                },
                
                mechanical: {
                    tensileStrength: 1240,
                    yieldStrength: 1035,
                    elongation: 12
                },
                
                cutting: {
                    Kc11: 3000,
                    mc: 0.21,
                    taylorN: 0.10,
                    taylorC: 50,
                    speeds: {
                        HSS: { min: 8, max: 18, optimal: 13 },
                        carbideUncoated: { min: 40, max: 80, optimal: 60 },
                        carbideCoated: { min: 80, max: 150, optimal: 115 },
                        ceramic: { min: 500, max: 1000, optimal: 750 }
                    },
                    feeds: {
                        roughing: { min: 0.003, max: 0.008, optimal: 0.005 },
                        finishing: { min: 0.001, max: 0.003, optimal: 0.002 }
                    }
                },
                
                johnsonCook: {
                    A: 1241, B: 622, n: 0.6522, C: 0.0134, m: 1.3
                },
                
                machinability: {
                    index: 15,
                    chipType: 'segmented',
                    workHardening: 'severe',
                    bueTendency: 'moderate',
                    coolantRequired: true,
                    notes: 'Extremely difficult. Very high cutting forces and heat. Short tool life. High-pressure coolant essential. Ceramic at high speeds OR carbide at very low speeds.'
                },
                
                heatTreatStates: {
                    solutionAnnealed: {
                        hardnessBHN: 290,
                        tensileStrength: 965,
                        yieldStrength: 550,
                        machinabilityIndex: 22,
                        Kc11: 2600,
                        notes: 'Best condition for machining'
                    },
                    aged: {
                        hardnessBHN: 363,
                        tensileStrength: 1240,
                        yieldStrength: 1035,
                        machinabilityIndex: 15,
                        Kc11: 3000,
                        notes: 'Very difficult'
                    }
                }
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * Get material by ID from any group
     */
    getMaterial(materialId) {
        for (const groupKey of ['GROUP_P_STEEL', 'GROUP_M_STAINLESS', 'GROUP_N_NONFERROUS', 'GROUP_S_SUPERALLOYS']) {
            const group = this[groupKey];
            if (group.materials[materialId]) {
                return { 
                    ...group.materials[materialId], 
                    isoGroup: groupKey.replace('GROUP_', '').split('_')[0],
                    groupName: group.name
                };
            }
        }
        return null;
    },

    /**
     * Get material in specific heat treat state
     */
    getMaterialInState(materialId, state) {
        const material = this.getMaterial(materialId);
        if (!material) return null;
        
        if (material.heatTreatStates && material.heatTreatStates[state]) {
            return {
                ...material,
                currentState: state,
                ...material.heatTreatStates[state],
                // Override base properties with heat-treated values
                physical: {
                    ...material.physical,
                    hardnessBHN: material.heatTreatStates[state].hardnessBHN || material.physical.hardnessBHN
                },
                mechanical: {
                    ...material.mechanical,
                    tensileStrength: material.heatTreatStates[state].tensileStrength || material.mechanical.tensileStrength,
                    yieldStrength: material.heatTreatStates[state].yieldStrength || material.mechanical.yieldStrength
                },
                cutting: {
                    ...material.cutting,
                    Kc11: material.heatTreatStates[state].Kc11 || material.cutting.Kc11
                },
                machinability: {
                    ...material.machinability,
                    index: material.heatTreatStates[state].machinabilityIndex || material.machinability.index
                }
            };
        }
        return material;
    },

    /**
     * Calculate specific cutting force (Kc) at given chip thickness
     * Kienzle formula: Kc = Kc1.1 × h^(-mc)
     */
    calculateKc(materialId, chipThickness, state = null) {
        const material = state ? this.getMaterialInState(materialId, state) : this.getMaterial(materialId);
        if (!material || !material.cutting) return null;
        
        const { Kc11, mc } = material.cutting;
        const Kc = Kc11 * Math.pow(chipThickness, -mc);
        
        return {
            Kc: Math.round(Kc),
            Kc11,
            mc,
            chipThickness,
            unit: 'N/mm²'
        };
    },

    /**
     * Calculate Johnson-Cook flow stress
     * σ = [A + B×ε^n] × [1 + C×ln(ε̇/ε̇₀)] × [1 - T*^m]
     */
    calculateFlowStress(materialId, strain, strainRate, temperature) {
        const material = this.getMaterial(materialId);
        if (!material || !material.johnsonCook) return null;
        
        const { A, B, n, C, m } = material.johnsonCook;
        const T_room = this.constants.T_room;
        const T_melt = material.thermal.meltingPoint;
        const eps_dot_0 = this.constants.eps_dot_ref;
        
        const term1 = A + B * Math.pow(Math.max(strain, 0.001), n);
        const term2 = 1 + C * Math.log(Math.max(strainRate / eps_dot_0, 1));
        const T_star = Math.max(0, Math.min(1, (temperature - T_room) / (T_melt - T_room)));
        const term3 = 1 - Math.pow(T_star, m);
        
        return {
            flowStress: Math.round(term1 * term2 * term3),
            components: { yieldTerm: term1, strainRateTerm: term2, thermalTerm: term3 },
            unit: 'MPa'
        };
    },

    /**
     * Calculate Taylor tool life
     * V × T^n = C  →  T = (C/V)^(1/n)
     */
    calculateToolLife(materialId, cuttingSpeed, state = null) {
        const material = state ? this.getMaterialInState(materialId, state) : this.getMaterial(materialId);
        if (!material || !material.cutting) return null;
        
        const { taylorN, taylorC } = material.cutting;
        if (!taylorN || !taylorC) return null;
        
        const toolLife = Math.pow(taylorC / cuttingSpeed, 1 / taylorN);
        
        return {
            toolLife: Math.round(toolLife * 10) / 10,
            taylorN,
            taylorC,
            cuttingSpeed,
            unit: 'minutes'
        };
    },

    /**
     * Get all available materials
     */
    getAllMaterials() {
        const materials = [];
        for (const groupKey of ['GROUP_P_STEEL', 'GROUP_M_STAINLESS', 'GROUP_N_NONFERROUS', 'GROUP_S_SUPERALLOYS']) {
            const group = this[groupKey];
            for (const [id, material] of Object.entries(group.materials)) {
                materials.push({
                    id,
                    name: material.name,
                    isoGroup: groupKey.replace('GROUP_', '').split('_')[0],
                    groupName: group.name,
                    states: material.heatTreatStates ? Object.keys(material.heatTreatStates) : []
                });
            }
        }
        return materials;
    },

    /**
     * Search materials by name or property
     */
    search(query) {
        const results = [];
        const q = query.toLowerCase();
        
        for (const material of this.getAllMaterials()) {
            if (material.id.toLowerCase().includes(q) || 
                material.name.toLowerCase().includes(q)) {
                results.push(material);
            }
        }
        return results;
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PRISM_UNIFIED_SCIENTIFIC_MATERIALS;
}
if (typeof window !== 'undefined') {
    window.PRISM_UNIFIED_SCIENTIFIC_MATERIALS = PRISM_UNIFIED_SCIENTIFIC_MATERIALS;
}
