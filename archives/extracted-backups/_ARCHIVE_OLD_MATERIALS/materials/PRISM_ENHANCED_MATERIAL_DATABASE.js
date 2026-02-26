/**
 * PRISM_ENHANCED_MATERIAL_DATABASE
 * Extracted: Session 1.A.1 - January 22, 2026
 * Source: PRISM v8.89.002 (Line info in extraction-index)
 * Lines: 252
 * 
 * Part of PRISM Materials Database Category
 */


const PRISM_ENHANCED_MATERIAL_DATABASE = {
    version: "2.0",

    // Superalloys
    superalloys: {
        inconel: {
            718: {
                name: "Inconel 718",
                uns: "N07718",
                density: 8.19,
                hardness: { annealed: "36 HRC", aged: "44 HRC" },
                tensileStrength: { annealed: 1035, aged: 1380, unit: "MPa" },
                machinability: 12, // % of B1112 steel
                thermalConductivity: 11.4,
                applications: ["Turbine blades", "Aerospace fasteners", "Nuclear"],
                machiningNotes: [
                    "Very low thermal conductivity - heat builds at cut zone",
                    "Work hardens rapidly - never dwell or rub",
                    "Use sharp positive rake tools",
                    "Ceramic inserts for roughing at high speed",
                    "Carbide for finishing at low speed"
                ],
                cuttingData: {
                    roughing: { speed: 20, feed: 0.15, doc: 2.0 },
                    finishing: { speed: 30, feed: 0.08, doc: 0.5 }
                }
            },
            625: {
                name: "Inconel 625",
                uns: "N06625",
                density: 8.44,
                hardness: "35 HRC",
                tensileStrength: 930,
                machinability: 15,
                applications: ["Chemical processing", "Marine", "Pollution control"]
            },
            600: {
                name: "Inconel 600",
                uns: "N06600",
                density: 8.47,
                hardness: "30 HRC",
                tensileStrength: 655,
                machinability: 20,
                applications: ["Heat treatment fixtures", "Furnace components"]
            }
        },
        hastelloy: {
            C276: {
                name: "Hastelloy C-276",
                uns: "N10276",
                density: 8.89,
                hardness: "90 HRB",
                tensileStrength: 790,
                machinability: 20,
                thermalConductivity: 10.2,
                corrosionResistance: "Excellent in oxidizing and reducing environments",
                applications: ["Chemical processing", "Pollution control", "Pulp and paper"],
                cuttingData: {
                    roughing: { speed: 15, feed: 0.12, doc: 1.5 },
                    finishing: { speed: 25, feed: 0.06, doc: 0.3 }
                }
            },
            X: {
                name: "Hastelloy X",
                uns: "N06002",
                density: 8.22,
                hardness: "88 HRB",
                tensileStrength: 785,
                machinability: 25,
                applications: ["Gas turbine components", "Petrochemical"]
            }
        },
        waspaloy: {
            standard: {
                name: "Waspaloy",
                uns: "N07001",
                density: 8.19,
                hardness: "40 HRC aged",
                tensileStrength: 1275,
                machinability: 10,
                applications: ["Turbine discs", "Aerospace structural"],
                cuttingData: {
                    roughing: { speed: 18, feed: 0.1, doc: 1.5 },
                    finishing: { speed: 25, feed: 0.05, doc: 0.3 }
                }
            }
        },
        rene: {
            41: {
                name: "René 41",
                density: 8.25,
                hardness: "39 HRC",
                tensileStrength: 1310,
                machinability: 8,
                maxServiceTemp: 980,
                applications: ["Afterburner parts", "Turbine wheels"]
            }
        }
    },
    // Titanium alloys
    titanium: {
        ti6al4v: {
            name: "Ti-6Al-4V (Grade 5)",
            uns: "R56400",
            density: 4.43,
            hardness: "36 HRC",
            tensileStrength: 1100,
            machinability: 22,
            thermalConductivity: 6.7,
            applications: ["Aerospace structural", "Medical implants", "Marine"],
            machiningNotes: [
                "Very low thermal conductivity",
                "Strong spring-back effect",
                "Galling tendency",
                "Use sharp tools, positive rake",
                "Flood coolant essential"
            ],
            conditions: {
                annealed: { hardness: "30 HRC", tensile: 900 },
                sta: { hardness: "36 HRC", tensile: 1100 } // Solution treated and aged
            },
            cuttingData: {
                roughing: { speed: 45, feed: 0.15, doc: 3.0 },
                finishing: { speed: 60, feed: 0.08, doc: 0.5 }
            }
        },
        ti6al2sn: {
            name: "Ti-6Al-2Sn-4Zr-2Mo",
            density: 4.54,
            hardness: "38 HRC",
            tensileStrength: 1035,
            machinability: 18,
            maxServiceTemp: 540,
            applications: ["High-temp aerospace", "Compressor blades"]
        },
        cpTi: {
            name: "CP Titanium (Grade 2)",
            density: 4.51,
            hardness: "20 HRC",
            tensileStrength: 345,
            machinability: 40,
            applications: ["Chemical processing", "Marine hardware", "Medical"]
        }
    },
    // Tool steels
    toolSteels: {
        d2: {
            name: "D2 Tool Steel",
            density: 7.7,
            hardness: { annealed: "25 HRC", hardened: "62 HRC" },
            machinability: { annealed: 50, hardened: 5 },
            applications: ["Dies", "Punches", "Slitters"],
            heatTreatment: {
                austenitize: 1010,
                quench: "Air",
                temper: [200, 540]
            }
        },
        h13: {
            name: "H13 Hot Work Steel",
            density: 7.8,
            hardness: { annealed: "20 HRC", hardened: "52 HRC" },
            machinability: { annealed: 65, hardened: 15 },
            applications: ["Die casting dies", "Forging dies", "Extrusion tooling"],
            heatTreatment: {
                austenitize: 1020,
                quench: "Air/Oil",
                temper: [540, 620]
            }
        },
        s7: {
            name: "S7 Shock-Resistant Steel",
            density: 7.83,
            hardness: { annealed: "22 HRC", hardened: "58 HRC" },
            machinability: { annealed: 75, hardened: 20 },
            applications: ["Chisels", "Punches", "Shear blades"]
        },
        a2: {
            name: "A2 Air-Hardening Steel",
            density: 7.86,
            hardness: { annealed: "22 HRC", hardened: "62 HRC" },
            machinability: { annealed: 65, hardened: 8 },
            applications: ["Blanking dies", "Forming dies", "Gauges"]
        },
        m2: {
            name: "M2 High-Speed Steel",
            density: 8.16,
            hardness: "65 HRC hardened",
            machinability: 50,
            applications: ["Cutting tools", "Drills", "Taps"]
        }
    },
    // Copper alloys
    copperAlloys: {
        berylliumCopper: {
            name: "Beryllium Copper (C17200)",
            density: 8.26,
            hardness: { annealed: "60 HRB", hardened: "42 HRC" },
            machinability: 30,
            applications: ["Springs", "Electrical contacts", "Non-sparking tools"],
            safetyNotes: ["Beryllium dust is toxic - use proper ventilation and PPE"]
        },
        naval_brass: {
            name: "Naval Brass (C46400)",
            density: 8.41,
            hardness: "65 HRB",
            machinability: 70,
            applications: ["Marine hardware", "Valve stems"]
        },
        phosphor_bronze: {
            name: "Phosphor Bronze (C51000)",
            density: 8.89,
            hardness: "80 HRB",
            machinability: 20,
            applications: ["Bearings", "Springs", "Electrical contacts"]
        }
    },
    // Get material by name
    getMaterial: function(category, name) {
        const cat = this[category];
        if (!cat) return null;

        // Search in category
        for (const [key, value] of Object.entries(cat)) {
            if (typeof value === 'object') {
                if (value.name && value.name.toLowerCase().includes(name.toLowerCase())) {
                    return value;
                }
                // Search subcategories
                for (const [subKey, subValue] of Object.entries(value)) {
                    if (subValue.name && subValue.name.toLowerCase().includes(name.toLowerCase())) {
                        return subValue;
                    }
                }
            }
        }
        return null;
    },
    // Get cutting data for material
    getCuttingData: function(material, operation) {
        if (material.cuttingData && material.cuttingData[operation]) {
            return material.cuttingData[operation];
        }
        // Default based on machinability
        const machinability = material.machinability || 50;
        return {
            speed: machinability * 3, // Very rough approximation
            feed: machinability > 50 ? 0.15 : 0.08,
            doc: machinability > 50 ? 3.0 : 1.0
        };
    }
};
