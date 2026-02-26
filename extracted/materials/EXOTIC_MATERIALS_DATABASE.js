// EXOTIC_MATERIALS_DATABASE - Lines 568721-569280 (560 lines) - Superalloys/titanium\n\nconst EXOTIC_MATERIALS_DATABASE = {
    InconelAlloys: {
        name: "Inconel Nickel-Chromium Superalloys",
        description: "High-temperature, corrosion-resistant superalloys",

        Inconel_600: {
            designation: "Inconel 600 (UNS N06600)",
            composition: {
                nickel: 72.0,
                chromium: 15.5,
                iron: 8.0,
                manganese: 1.0,
                silicon: 0.5,
                carbon: 0.15
            },
            properties: {
                density: 0.304, // lb/in³
                hardness: { rockwell: "B85-95", brinell: "140-185" },
                tensileStrength: 85000, // psi
                yieldStrength: 35000, // psi
                elongation: 40, // %
                thermalConductivity: 104, // BTU/(hr·ft·°F) at 200°F
                meltingPoint: 2470, // °F
                specificHeat: 0.106 // BTU/(lb·°F)
            },
            machining: {
                category: "difficult",
                workHardeningRate: "high",
                chipControl: "stringy_chips",
                recommendedTooling: ["carbide", "CBN", "ceramic"],
                cuttingSpeed: {
                    roughing: { sfm: 40-60, units: "sfm" },
                    finishing: { sfm: 60-80, units: "sfm" }
                },
                feedRate: {
                    roughing: { ipt: 0.004-0.008, units: "ipt" },
                    finishing: { ipt: 0.002-0.004, units: "ipt" }
                },
                coolant: "high_pressure_required",
                depthOfCut: {
                    roughing: 0.080-0.150,
                    finishing: 0.010-0.030
                }
            },
            applications: ["furnace components", "heat exchangers", "chemical processing"]
        },
        Inconel_625: {
            designation: "Inconel 625 (UNS N06625)",
            composition: {
                nickel: 58.0,
                chromium: 21.5,
                molybdenum: 9.0,
                niobium: 3.6,
                iron: 5.0,
                carbon: 0.10
            },
            properties: {
                density: 0.305,
                hardness: { rockwell: "95-105 HRB", brinell: "170-220" },
                tensileStrength: 135000,
                yieldStrength: 75000,
                elongation: 42,
                thermalConductivity: 69,
                meltingPoint: 2350,
                specificHeat: 0.098
            },
            machining: {
                category: "very_difficult",
                workHardeningRate: "very_high",
                chipControl: "difficult_stringy",
                recommendedTooling: ["carbide_KCU25", "CBN", "ceramic_SiAlON"],
                cuttingSpeed: {
                    roughing: { sfm: 30-50 },
                    finishing: { sfm: 50-70 }
                },
                feedRate: {
                    roughing: { ipt: 0.003-0.006 },
                    finishing: { ipt: 0.002-0.003 }
                },
                coolant: "high_pressure_flood",
                depthOfCut: {
                    roughing: 0.060-0.120,
                    finishing: 0.010-0.025
                },
                specialConsiderations: [
                    "Use sharp tools - dull tools cause rapid work hardening",
                    "Maintain constant feed to prevent rubbing",
                    "High pressure coolant (1000+ PSI) recommended"
                ]
            },
            applications: ["aerospace engines", "marine applications", "chemical plants"]
        },
        Inconel_718: {
            designation: "Inconel 718 (UNS N07718)",
            composition: {
                nickel: 52.5,
                chromium: 19.0,
                iron: 18.5,
                niobium: 5.1,
                molybdenum: 3.0,
                titanium: 0.9,
                aluminum: 0.5
            },
            properties: {
                density: 0.296,
                hardness: { rockwell: "30-35 HRC", brinell: "280-360" },
                tensileStrength: 185000,
                yieldStrength: 150000,
                elongation: 25,
                thermalConductivity: 73,
                meltingPoint: 2300,
                specificHeat: 0.104
            },
            machining: {
                category: "extremely_difficult",
                workHardeningRate: "extreme",
                chipControl: "very_difficult",
                recommendedTooling: ["carbide_KC730M", "CBN_7020", "ceramic_whisker"],
                cuttingSpeed: {
                    roughing: { sfm: 20-40 },
                    finishing: { sfm: 40-60 }
                },
                feedRate: {
                    roughing: { ipt: 0.002-0.005 },
                    finishing: { ipt: 0.001-0.003 }
                },
                coolant: "high_pressure_through_tool",
                depthOfCut: {
                    roughing: 0.040-0.100,
                    finishing: 0.008-0.020
                },
                specialConsiderations: [
                    "CRITICAL: Use rigid setup - deflection causes issues",
                    "Fresh sharp tools only - do not run dull",
                    "Consider trochoidal milling for heavy cuts",
                    "Tool life: 5-15 minutes at recommended parameters"
                ]
            },
            applications: ["jet engines", "rocket motors", "nuclear reactors", "pressure vessels"]
        },
        Inconel_X750: {
            designation: "Inconel X-750 (UNS N07750)",
            composition: {
                nickel: 73.0,
                chromium: 15.5,
                iron: 7.0,
                titanium: 2.5,
                aluminum: 0.7,
                niobium: 1.0
            },
            properties: {
                density: 0.298,
                hardness: { rockwell: "35-42 HRC", brinell: "320-400" },
                tensileStrength: 175000,
                yieldStrength: 115000,
                elongation: 20,
                thermalConductivity: 85,
                meltingPoint: 2540,
                specificHeat: 0.104
            },
            machining: {
                category: "extremely_difficult",
                workHardeningRate: "extreme",
                chipControl: "difficult",
                recommendedTooling: ["carbide_grade_K", "CBN", "ceramic"],
                cuttingSpeed: {
                    roughing: { sfm: 25-45 },
                    finishing: { sfm: 45-65 }
                },
                feedRate: {
                    roughing: { ipt: 0.003-0.006 },
                    finishing: { ipt: 0.002-0.004 }
                },
                coolant: "high_pressure_emulsion",
                depthOfCut: {
                    roughing: 0.050-0.110,
                    finishing: 0.010-0.025
                }
            },
            applications: ["gas turbines", "rocket engines", "nuclear applications"]
        }
    },
    HasteloyAlloys: {
        name: "Hastelloy Nickel-Based Superalloys",
        description: "Exceptional corrosion resistance in harsh environments",

        Hastelloy_C276: {
            designation: "Hastelloy C-276 (UNS N10276)",
            composition: {
                nickel: 57.0,
                molybdenum: 16.0,
                chromium: 15.5,
                iron: 5.0,
                tungsten: 3.5,
                cobalt: 2.5
            },
            properties: {
                density: 0.321,
                hardness: { rockwell: "90-100 HRB", brinell: "190-230" },
                tensileStrength: 115000,
                yieldStrength: 52000,
                elongation: 40,
                thermalConductivity: 67,
                meltingPoint: 2420,
                specificHeat: 0.095
            },
            machining: {
                category: "very_difficult",
                workHardeningRate: "very_high",
                chipControl: "gummy_stringy",
                recommendedTooling: ["carbide_M20", "carbide_K20", "CBN"],
                cuttingSpeed: {
                    roughing: { sfm: 35-55 },
                    finishing: { sfm: 55-75 }
                },
                feedRate: {
                    roughing: { ipt: 0.004-0.007 },
                    finishing: { ipt: 0.002-0.004 }
                },
                coolant: "heavy_duty_flood",
                depthOfCut: {
                    roughing: 0.070-0.130,
                    finishing: 0.012-0.030
                },
                specialConsiderations: [
                    "Extremely gummy - use positive rake tools",
                    "Avoid dwelling - continuous feed essential",
                    "Sharp tools critical for surface finish"
                ]
            },
            applications: ["chemical processing", "pollution control", "pulp/paper"]
        },
        Hastelloy_X: {
            designation: "Hastelloy X (UNS N06002)",
            composition: {
                nickel: 47.0,
                chromium: 22.0,
                iron: 18.0,
                molybdenum: 9.0,
                cobalt: 1.5,
                tungsten: 0.6
            },
            properties: {
                density: 0.297,
                hardness: { rockwell: "90-105 HRB", brinell: "170-220" },
                tensileStrength: 115000,
                yieldStrength: 51000,
                elongation: 43,
                thermalConductivity: 71,
                meltingPoint: 2350,
                specificHeat: 0.105
            },
            machining: {
                category: "very_difficult",
                workHardeningRate: "high",
                chipControl: "stringy",
                recommendedTooling: ["carbide", "CBN", "ceramic"],
                cuttingSpeed: {
                    roughing: { sfm: 40-60 },
                    finishing: { sfm: 60-80 }
                },
                feedRate: {
                    roughing: { ipt: 0.005-0.008 },
                    finishing: { ipt: 0.003-0.005 }
                },
                coolant: "flood_high_volume",
                depthOfCut: {
                    roughing: 0.080-0.140,
                    finishing: 0.015-0.035
                }
            },
            applications: ["gas turbines", "industrial furnaces", "petrochemical"]
        }
    },
    WaspaloyAlloy: {
        name: "Waspaloy",
        description: "Age-hardenable nickel-based superalloy for high temps",

        Waspaloy: {
            designation: "Waspaloy (UNS N07001)",
            composition: {
                nickel: 58.0,
                chromium: 19.5,
                cobalt: 13.5,
                molybdenum: 4.3,
                titanium: 3.0,
                aluminum: 1.4,
                iron: 2.0
            },
            properties: {
                density: 0.297,
                hardness: { rockwell: "35-45 HRC", brinell: "320-420" },
                tensileStrength: 200000,
                yieldStrength: 145000,
                elongation: 20,
                thermalConductivity: 75,
                meltingPoint: 2460,
                specificHeat: 0.102
            },
            machining: {
                category: "extremely_difficult",
                workHardeningRate: "extreme",
                chipControl: "very_difficult",
                recommendedTooling: ["carbide_KC730M", "CBN_high_content", "ceramic_SiAlON"],
                cuttingSpeed: {
                    roughing: { sfm: 20-35 },
                    finishing: { sfm: 35-55 }
                },
                feedRate: {
                    roughing: { ipt: 0.002-0.004 },
                    finishing: { ipt: 0.001-0.003 }
                },
                coolant: "ultra_high_pressure_through_spindle",
                depthOfCut: {
                    roughing: 0.030-0.080,
                    finishing: 0.005-0.015
                },
                specialConsiderations: [
                    "One of the most difficult materials to machine",
                    "Extreme work hardening - never rub",
                    "Use positive geometry, very sharp tools",
                    "Tool life extremely short - budget accordingly",
                    "Consider wire EDM or grinding for complex features"
                ]
            },
            applications: ["jet engine components", "gas turbine blades", "afterburner parts"]
        }
    },
    ReneAlloys: {
        name: "René Alloys",
        description: "High-strength nickel superalloys for extreme environments",

        Rene_41: {
            designation: "René 41 (UNS N07041)",
            composition: {
                nickel: 55.0,
                chromium: 19.0,
                cobalt: 11.0,
                molybdenum: 10.0,
                titanium: 3.1,
                aluminum: 1.5,
                iron: 5.0
            },
            properties: {
                density: 0.298,
                hardness: { rockwell: "38-43 HRC", brinell: "350-415" },
                tensileStrength: 195000,
                yieldStrength: 140000,
                elongation: 15,
                thermalConductivity: 70,
                meltingPoint: 2450,
                specificHeat: 0.103
            },
            machining: {
                category: "extremely_difficult",
                workHardeningRate: "extreme",
                chipControl: "very_difficult",
                recommendedTooling: ["carbide_K_grade", "CBN", "ceramic_whisker_reinforced"],
                cuttingSpeed: {
                    roughing: { sfm: 18-30 },
                    finishing: { sfm: 30-50 }
                },
                feedRate: {
                    roughing: { ipt: 0.002-0.004 },
                    finishing: { ipt: 0.001-0.002 }
                },
                coolant: "high_pressure_flood_1500_PSI",
                depthOfCut: {
                    roughing: 0.025-0.070,
                    finishing: 0.005-0.012
                }
            },
            applications: ["turbine blades", "jet engine discs", "rocket components"]
        },
        Rene_80: {
            designation: "René 80 (UNS N07080)",
            composition: {
                nickel: 60.0,
                chromium: 14.0,
                cobalt: 9.5,
                tungsten: 4.0,
                molybdenum: 4.0,
                titanium: 5.0,
                aluminum: 3.0
            },
            properties: {
                density: 0.304,
                hardness: { rockwell: "40-46 HRC", brinell: "375-430" },
                tensileStrength: 210000,
                yieldStrength: 155000,
                elongation: 12,
                thermalConductivity: 68,
                meltingPoint: 2420,
                specificHeat: 0.101
            },
            machining: {
                category: "extremely_difficult",
                workHardeningRate: "extreme",
                chipControl: "extremely_difficult",
                recommendedTooling: ["CBN_high_content", "ceramic_SiAlON", "PCD_for_non_ferrous"],
                cuttingSpeed: {
                    roughing: { sfm: 15-25 },
                    finishing: { sfm: 25-40 }
                },
                feedRate: {
                    roughing: { ipt: 0.001-0.003 },
                    finishing: { ipt: 0.001-0.002 }
                },
                coolant: "ultra_high_pressure",
                depthOfCut: {
                    roughing: 0.020-0.060,
                    finishing: 0.003-0.010
                },
                specialConsiderations: [
                    "Among the most difficult alloys to machine",
                    "Extremely expensive material - minimize scrap",
                    "Consider alternative processes: EDM, ECM, laser",
                    "Tool costs will be very high"
                ]
            },
            applications: ["advanced turbine blades", "aerospace engines"]
        }
    },
    PrecipitationHardeningSS: {
        name: "Precipitation Hardening Stainless Steels",
        description: "High-strength, corrosion-resistant stainless steels",

        SS_17_4_PH: {
            designation: "17-4 PH Stainless (UNS S17400)",
            composition: {
                chromium: 16.0,
                nickel: 4.0,
                copper: 4.0,
                niobium: 0.3,
                iron: "balance"
            },
            properties: {
                density: 0.280,
                hardness: { rockwell: "31-38 HRC", brinell: "285-375" },
                tensileStrength: 145000,
                yieldStrength: 125000,
                elongation: 12,
                thermalConductivity: 110,
                meltingPoint: 2600,
                specificHeat: 0.11
            },
            machining: {
                category: "difficult",
                workHardeningRate: "moderate",
                chipControl: "good",
                recommendedTooling: ["carbide_M_grade", "coated_carbide", "CBN"],
                cuttingSpeed: {
                    roughing: { sfm: 60-90 },
                    finishing: { sfm: 90-120 }
                },
                feedRate: {
                    roughing: { ipt: 0.006-0.010 },
                    finishing: { ipt: 0.003-0.006 }
                },
                coolant: "flood_or_mist",
                depthOfCut: {
                    roughing: 0.100-0.200,
                    finishing: 0.020-0.050
                }
            },
            applications: ["aerospace", "chemical processing", "food processing", "valve components"]
        },
        SS_15_5_PH: {
            designation: "15-5 PH Stainless (UNS S15500)",
            composition: {
                chromium: 15.0,
                nickel: 4.5,
                copper: 3.5,
                niobium: 0.3,
                iron: "balance"
            },
            properties: {
                density: 0.279,
                hardness: { rockwell: "35-42 HRC", brinell: "320-400" },
                tensileStrength: 170000,
                yieldStrength: 145000,
                elongation: 10,
                thermalConductivity: 108,
                meltingPoint: 2590,
                specificHeat: 0.108
            },
            machining: {
                category: "difficult",
                workHardeningRate: "moderate_high",
                chipControl: "good",
                recommendedTooling: ["carbide_coated", "CBN", "cermet"],
                cuttingSpeed: {
                    roughing: { sfm: 55-85 },
                    finishing: { sfm: 85-110 }
                },
                feedRate: {
                    roughing: { ipt: 0.005-0.009 },
                    finishing: { ipt: 0.003-0.005 }
                },
                coolant: "heavy_flood",
                depthOfCut: {
                    roughing: 0.090-0.180,
                    finishing: 0.018-0.045
                }
            },
            applications: ["aerospace components", "oil field equipment", "marine hardware"]
        }
    },
    NitronicSS: {
        name: "Nitronic Stainless Steels",
        description: "High-strength, wear-resistant, galling-resistant SS",

        Nitronic_60: {
            designation: "Nitronic 60 (UNS S21800)",
            composition: {
                chromium: 17.0,
                nickel: 8.5,
                manganese: 8.0,
                silicon: 4.0,
                nitrogen: 0.15,
                iron: "balance"
            },
            properties: {
                density: 0.280,
                hardness: { rockwell: "25-30 HRC", brinell: "240-290" },
                tensileStrength: 115000,
                yieldStrength: 65000,
                elongation: 35,
                thermalConductivity: 92,
                meltingPoint: 2550,
                specificHeat: 0.112
            },
            machining: {
                category: "difficult",
                workHardeningRate: "high",
                chipControl: "stringy",
                recommendedTooling: ["carbide_TiN_coated", "carbide_TiAlN", "CBN"],
                cuttingSpeed: {
                    roughing: { sfm: 45-70 },
                    finishing: { sfm: 70-95 }
                },
                feedRate: {
                    roughing: { ipt: 0.005-0.008 },
                    finishing: { ipt: 0.003-0.005 }
                },
                coolant: "flood_required",
                depthOfCut: {
                    roughing: 0.080-0.160,
                    finishing: 0.015-0.040
                },
                specialConsiderations: [
                    "Very galling-resistant - don't let tools rub",
                    "Use positive rake angles",
                    "Sharp tools essential for good finish"
                ]
            },
            applications: ["valve seats", "pump shafts", "wear plates", "marine fasteners"]
        }
    }
};
