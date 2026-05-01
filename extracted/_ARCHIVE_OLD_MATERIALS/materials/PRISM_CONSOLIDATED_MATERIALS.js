/**
 * PRISM_CONSOLIDATED_MATERIALS
 * Extracted: Session 1.A.1 - January 22, 2026
 * Source: PRISM v8.89.002 (Lines 570758-571110)
 * Lines: 353
 * 
 * Part of PRISM Materials Database Category
 */

// Single-source material definitions - no duplicates
// All other sections reference this database

const PRISM_CONSOLIDATED_MATERIALS = {
    // Note: This consolidates duplicated material definitions
    // Other sections now reference this database instead of defining inline

    baseMetals: {
        aluminum: {
            density: 0.098,
            machinability: 0.9,
            cuttingSpeed: { min: 400, max: 2000, units: 'sfm' },
            iso_category: 'N1'
        },
        steel: {
            density: 0.284,
            machinability: 0.7,
            cuttingSpeed: { min: 200, max: 600, units: 'sfm' },
            iso_category: 'P2'
        },
        stainless: {
            density: 0.289,
            machinability: 0.5,
            cuttingSpeed: { min: 150, max: 400, units: 'sfm' },
            iso_category: 'M1',
            workHardening: 'high'
        },
        titanium: {
            density: 0.163,
            machinability: 0.3,
            cuttingSpeed: { min: 100, max: 300, units: 'sfm' },
            iso_category: 'S2',
            chipType: 'segmented'
        }
    },
    // Reference function to get material properties
    getMaterial: function(materialName) {
        const normalized = materialName.toLowerCase().replace(/[^a-z0-9]/g, '_');

        // Check base metals
        if (this.baseMetals[normalized]) {
            return this.baseMetals[normalized];
        }
        // Check exotic materials
        if (typeof EXOTIC_MATERIALS_DATABASE !== 'undefined') {
            // Search through exotic database
            // ... implementation
        }
        // Check enhanced heat treat
        if (typeof ENHANCED_MATERIALS_WITH_HEAT_TREAT !== 'undefined') {
            // Search through heat treat database
            // ... implementation
        }
        return null;
    }
};

// --- ENHANCED MATERIALS WITH HEAT TREAT STATES ---
// Tool steels and alloy steels in annealed, normalized, hardened conditions
// PRISM ENHANCED MATERIALS DATABASE - HEAT TREAT STATES v1.0
// Materials in various heat treatment conditions and hardness ratings
// Focuses on tool steels with comprehensive annealed/hardened states

const ENHANCED_MATERIALS_WITH_HEAT_TREAT = {
    ToolSteels: {
        name: "Tool Steels - All Heat Treat States",
        description: "Comprehensive tool steel database with annealed and hardened conditions",

        A2_ToolSteel: {
            designation: "A2 Air-Hardening Tool Steel (UNS T30102)",
            composition: {
                carbon: 1.0,
                chromium: 5.0,
                molybdenum: 1.0,
                vanadium: 0.2,
                manganese: 0.7,
                silicon: 0.3
            },
            annealed: {
                condition: "Annealed",
                hardness: { rockwell: "HRB 95-100", brinell: "217-241" },
                tensileStrength: 95000,
                yieldStrength: 50000,
                elongation: 18,
                machinability: "excellent",
                machining: {
                    cuttingSpeed: { roughing: 90, finishing: 120, units: "sfm" },
                    feedRate: { roughing: 0.012, finishing: 0.005, units: "ipr" },
                    depthOfCut: { roughing: 0.150, finishing: 0.030 },
                    tooling: ["HSS", "carbide_uncoated", "carbide_TiN"],
                    coolant: "flood_or_mist"
                }
            },
            hardened_HRC_57_62: {
                condition: "Hardened & Tempered to HRC 57-62",
                hardness: { rockwell: "HRC 57-62", brinell: "595-705" },
                tensileStrength: 280000,
                yieldStrength: 220000,
                elongation: 3,
                machinability: "very_difficult",
                machining: {
                    cuttingSpeed: { roughing: 25, finishing: 40, units: "sfm" },
                    feedRate: { roughing: 0.003, finishing: 0.001, units: "ipr" },
                    depthOfCut: { roughing: 0.020, finishing: 0.005 },
                    tooling: ["CBN", "ceramic", "carbide_grade_H"],
                    coolant: "high_pressure_flood",
                    specialNotes: "Consider grinding for finish operations"
                }
            },
            stress_relieved: {
                condition: "Stress Relieved",
                hardness: { rockwell: "HRC 45-50", brinell: "421-481" },
                machinability: "difficult",
                machining: {
                    cuttingSpeed: { roughing: 50, finishing: 75, units: "sfm" },
                    feedRate: { roughing: 0.006, finishing: 0.003, units: "ipr" },
                    tooling: ["carbide_coated", "CBN"],
                    coolant: "flood_required"
                }
            },
            applications: ["blanking dies", "punches", "forming dies", "shear blades"]
        },
        D2_ToolSteel: {
            designation: "D2 High-Carbon, High-Chromium Tool Steel (UNS T30402)",
            composition: {
                carbon: 1.55,
                chromium: 12.0,
                molybdenum: 0.8,
                vanadium: 0.9,
                manganese: 0.4,
                silicon: 0.3
            },
            annealed: {
                condition: "Annealed",
                hardness: { rockwell: "HRB 100-103", brinell: "235-255" },
                tensileStrength: 105000,
                yieldStrength: 55000,
                elongation: 15,
                machinability: "good",
                machining: {
                    cuttingSpeed: { roughing: 75, finishing: 100, units: "sfm" },
                    feedRate: { roughing: 0.010, finishing: 0.004, units: "ipr" },
                    depthOfCut: { roughing: 0.140, finishing: 0.025 },
                    tooling: ["HSS", "carbide_M_grade", "carbide_TiN_coated"],
                    coolant: "flood_recommended"
                }
            },
            hardened_HRC_54_61: {
                condition: "Hardened & Tempered to HRC 54-61",
                hardness: { rockwell: "HRC 54-61", brinell: "560-682" },
                tensileStrength: 310000,
                yieldStrength: 240000,
                elongation: 2,
                machinability: "extremely_difficult",
                machining: {
                    cuttingSpeed: { roughing: 20, finishing: 35, units: "sfm" },
                    feedRate: { roughing: 0.002, finishing: 0.001, units: "ipr" },
                    depthOfCut: { roughing: 0.015, finishing: 0.003 },
                    tooling: ["CBN", "ceramic_Al2O3", "carbide_K_grade"],
                    coolant: "ultra_high_pressure",
                    specialNotes: "Grinding or EDM preferred for hardened state"
                }
            },
            applications: ["stamping dies", "cold-forming dies", "thread-rolling dies", "slitter knives"]
        },
        O1_ToolSteel: {
            designation: "O1 Oil-Hardening Tool Steel (UNS T31501)",
            composition: {
                carbon: 0.95,
                manganese: 1.2,
                chromium: 0.5,
                tungsten: 0.5,
                vanadium: 0.3,
                silicon: 0.3
            },
            annealed: {
                condition: "Annealed",
                hardness: { rockwell: "HRB 90-95", brinell: "179-207" },
                tensileStrength: 90000,
                yieldStrength: 48000,
                elongation: 20,
                machinability: "excellent",
                machining: {
                    cuttingSpeed: { roughing: 100, finishing: 130, units: "sfm" },
                    feedRate: { roughing: 0.015, finishing: 0.006, units: "ipr" },
                    depthOfCut: { roughing: 0.180, finishing: 0.035 },
                    tooling: ["HSS", "carbide", "coated_carbide"],
                    coolant: "flood_or_dry"
                }
            },
            hardened_HRC_57_62: {
                condition: "Hardened & Tempered to HRC 57-62",
                hardness: { rockwell: "HRC 57-62", brinell: "595-705" },
                tensileStrength: 275000,
                yieldStrength: 210000,
                elongation: 4,
                machinability: "very_difficult",
                machining: {
                    cuttingSpeed: { roughing: 30, finishing: 50, units: "sfm" },
                    feedRate: { roughing: 0.004, finishing: 0.002, units: "ipr" },
                    depthOfCut: { roughing: 0.025, finishing: 0.006 },
                    tooling: ["CBN", "ceramic", "carbide_coated"],
                    coolant: "high_pressure"
                }
            },
            applications: ["gauges", "cutting tools", "forming tools", "jigs and fixtures"]
        },
        S7_ShockResisting: {
            designation: "S7 Shock-Resisting Tool Steel (UNS T41907)",
            composition: {
                carbon: 0.50,
                chromium: 3.25,
                molybdenum: 1.40,
                manganese: 0.7,
                silicon: 0.9
            },
            annealed: {
                condition: "Annealed",
                hardness: { rockwell: "HRB 92-97", brinell: "197-229" },
                tensileStrength: 95000,
                yieldStrength: 52000,
                elongation: 22,
                machinability: "excellent",
                machining: {
                    cuttingSpeed: { roughing: 95, finishing: 125, units: "sfm" },
                    feedRate: { roughing: 0.013, finishing: 0.005, units: "ipr" },
                    depthOfCut: { roughing: 0.160, finishing: 0.032 },
                    tooling: ["HSS", "carbide", "TiN_coated"],
                    coolant: "flood"
                }
            },
            hardened_HRC_54_58: {
                condition: "Hardened & Tempered to HRC 54-58",
                hardness: { rockwell: "HRC 54-58", brinell: "560-627" },
                tensileStrength: 290000,
                yieldStrength: 225000,
                elongation: 6,
                toughness: "excellent",
                machinability: "very_difficult",
                machining: {
                    cuttingSpeed: { roughing: 35, finishing: 55, units: "sfm" },
                    feedRate: { roughing: 0.005, finishing: 0.002, units: "ipr" },
                    depthOfCut: { roughing: 0.030, finishing: 0.008 },
                    tooling: ["CBN", "carbide_coated", "ceramic"],
                    coolant: "high_pressure_flood"
                }
            },
            applications: ["cold-heading dies", "shear blades", "punches", "chisels", "jackhammer bits"]
        },
        H13_HotWork: {
            designation: "H13 Hot-Work Tool Steel (UNS T20813)",
            composition: {
                carbon: 0.40,
                chromium: 5.0,
                molybdenum: 1.5,
                vanadium: 1.0,
                silicon: 1.0,
                manganese: 0.4
            },
            annealed: {
                condition: "Annealed",
                hardness: { rockwell: "HRB 95-99", brinell: "207-235" },
                tensileStrength: 100000,
                yieldStrength: 54000,
                elongation: 18,
                machinability: "good",
                machining: {
                    cuttingSpeed: { roughing: 85, finishing: 110, units: "sfm" },
                    feedRate: { roughing: 0.011, finishing: 0.004, units: "ipr" },
                    depthOfCut: { roughing: 0.145, finishing: 0.028 },
                    tooling: ["carbide_M_grade", "coated_carbide", "cermet"],
                    coolant: "flood"
                }
            },
            hardened_HRC_44_50: {
                condition: "Hardened & Tempered to HRC 44-50",
                hardness: { rockwell: "HRC 44-50", brinell: "415-481" },
                tensileStrength: 230000,
                yieldStrength: 190000,
                elongation: 10,
                hotHardness: "excellent",
                machinability: "difficult",
                machining: {
                    cuttingSpeed: { roughing: 45, finishing: 65, units: "sfm" },
                    feedRate: { roughing: 0.006, finishing: 0.003, units: "ipr" },
                    depthOfCut: { roughing: 0.060, finishing: 0.015 },
                    tooling: ["carbide_K_grade", "CBN", "coated_carbide"],
                    coolant: "heavy_flood"
                }
            },
            hardened_HRC_50_54: {
                condition: "Hardened & Tempered to HRC 50-54",
                hardness: { rockwell: "HRC 50-54", brinell: "481-560" },
                tensileStrength: 270000,
                yieldStrength: 220000,
                elongation: 8,
                machinability: "very_difficult",
                machining: {
                    cuttingSpeed: { roughing: 35, finishing: 50, units: "sfm" },
                    feedRate: { roughing: 0.004, finishing: 0.002, units: "ipr" },
                    depthOfCut: { roughing: 0.040, finishing: 0.010 },
                    tooling: ["CBN", "ceramic", "carbide_K_grade"],
                    coolant: "high_pressure"
                }
            },
            applications: ["die-casting dies", "forging dies", "extrusion dies", "hot-shear blades"]
        },
        M2_HighSpeed: {
            designation: "M2 High-Speed Tool Steel (UNS T11302)",
            composition: {
                carbon: 0.85,
                tungsten: 6.0,
                molybdenum: 5.0,
                chromium: 4.0,
                vanadium: 2.0
            },
            annealed: {
                condition: "Annealed",
                hardness: { rockwell: "HRB 95-103", brinell: "217-255" },
                tensileStrength: 110000,
                yieldStrength: 60000,
                elongation: 12,
                machinability: "fair",
                machining: {
                    cuttingSpeed: { roughing: 70, finishing: 95, units: "sfm" },
                    feedRate: { roughing: 0.009, finishing: 0.004, units: "ipr" },
                    depthOfCut: { roughing: 0.120, finishing: 0.024 },
                    tooling: ["carbide_M_grade", "coated_carbide", "cermet"],
                    coolant: "flood_required"
                }
            },
            hardened_HRC_63_65: {
                condition: "Hardened & Tempered to HRC 63-65",
                hardness: { rockwell: "HRC 63-65", brinell: "739-787" },
                tensileStrength: 340000,
                yieldStrength: 270000,
                elongation: 1,
                wearResistance: "excellent",
                machinability: "extremely_difficult",
                machining: {
                    cuttingSpeed: { roughing: 15, finishing: 25, units: "sfm" },
                    feedRate: { roughing: 0.001, finishing: 0.0005, units: "ipr" },
                    depthOfCut: { roughing: 0.008, finishing: 0.002 },
                    tooling: ["CBN_high_content", "ceramic_whisker", "diamond"],
                    coolant: "ultra_high_pressure",
                    specialNotes: "Grinding or EDM strongly recommended"
                }
            },
            applications: ["cutting tools", "drills", "taps", "reamers", "milling cutters", "broaches"]
        }
    },
    AlloySteel_HeatTreat: {
        name: "Alloy Steels - Heat Treated Conditions",
        description: "Common alloy steels in normalized, annealed, and hardened states",
        
        AISI_4140: {
            designation: "4140 Chromium-Molybdenum Steel",
            composition: { carbon: 0.40, chromium: 1.0, molybdenum: 0.25, manganese: 0.85 },
            annealed: {
                hardness: { rockwell: "HRB 92", brinell: "197" },
                tensileStrength: 95000,
                machinability: "good"
            },
            normalized: {
                hardness: { rockwell: "HRB 97", brinell: "217" },
                tensileStrength: 110000,
                machinability: "good"
            },
            hardened_HRC_28_32: {
                hardness: { rockwell: "HRC 28-32", brinell: "269-302" },
                tensileStrength: 145000,
                machinability: "moderate"
            }
        },
        AISI_4340: {
            designation: "4340 Nickel-Chromium-Molybdenum Steel",
            composition: { carbon: 0.40, nickel: 1.85, chromium: 0.80, molybdenum: 0.25 },
            annealed: {
                hardness: { rockwell: "HRB 95", brinell: "217" },
                tensileStrength: 108000,
                machinability: "good"
            },
            hardened_HRC_40_45: {
                hardness: { rockwell: "HRC 40-45", brinell: "375-421" },
                tensileStrength: 200000,
                machinability: "difficult"
            }
        }
    },
    Stainless_HeatTreat: {
        name: "Stainless Steels - Condition Variations",
        AISI_304: {
            annealed: { hardness: "HRB 92", machinability: "fair" },
            cold_worked_1_4_hard: { hardness: "HRC 25", machinability: "poor" },
            cold_worked_1_2_hard: { hardness: "HRC 32", machinability: "very_poor" }
        }
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PRISM_CONSOLIDATED_MATERIALS, ENHANCED_MATERIALS_WITH_HEAT_TREAT };
}
