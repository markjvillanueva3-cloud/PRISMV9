const PRISM_CROSS_REFERENCE = {

    // ISO MATERIAL CLASSIFICATION SYSTEM
    iso_material_groups: {
        P: {
            name: "Steel",
            color: "Blue",
            description: "All types of steel excluding stainless steel",
            materials: [
                "Low carbon steel (C < 0.25%)",
                "Medium carbon steel (C 0.25-0.55%)",
                "High carbon steel (C > 0.55%)",
                "Low alloy steel (alloying elements < 5%)",
                "High alloy steel (alloying elements > 5%)",
                "Steel castings",
                "Ferritic/Martensitic stainless steel (hardened)",
                "Tool steels"
            ],
            subgroups: {
                "P01-P10": "Light finishing, high speeds, small chip sections",
                "P10-P20": "Finishing to light roughing",
                "P20-P30": "Light roughing to roughing",
                "P30-P40": "Roughing, unfavorable conditions",
                "P40-P50": "Heavy roughing, interrupted cuts"
            },
            characteristics: ["Long chips", "Relatively easy to machine", "Medium abrasive wear"]
        },
        M: {
            name: "Stainless Steel",
            color: "Yellow",
            description: "All types of stainless steel",
            materials: [
                "Ferritic stainless steel",
                "Martensitic stainless steel",
                "Austenitic stainless steel",
                "Duplex stainless steel",
                "Precipitation hardening stainless steel"
            ],
            subgroups: {
                "M01-M10": "Finishing, stable conditions",
                "M10-M20": "Light roughing to medium",
                "M20-M30": "Roughing",
                "M30-M40": "Heavy roughing, interrupted cuts"
            },
            characteristics: ["Work hardening", "Long chips", "High cutting forces", "Built-up edge tendency", "High heat generation"]
        },
        K: {
            name: "Cast Iron",
            color: "Red",
            description: "All types of cast iron",
            materials: [
                "Gray cast iron",
                "Nodular (ductile) cast iron",
                "Malleable cast iron",
                "Compacted graphite iron (CGI)",
                "Austempered ductile iron (ADI)"
            ],
            subgroups: {
                "K01-K10": "Finishing, high speeds",
                "K10-K20": "Medium machining",
                "K20-K30": "Roughing",
                "K30-K40": "Heavy roughing, sand inclusions"
            },
            characteristics: ["Short chips", "Abrasive", "Generally easy to machine", "High cutting speeds possible"]
        },
        N: {
            name: "Non-Ferrous Metals",
            color: "Green",
            description: "Aluminum, copper, brass, and other non-ferrous metals",
            materials: [
                "Aluminum alloys (wrought)",
                "Aluminum alloys (cast)",
                "Aluminum-silicon alloys (high Si)",
                "Copper alloys",
                "Brass",
                "Bronze",
                "Magnesium alloys",
                "Zinc alloys"
            ],
            subgroups: {
                "N01-N10": "Finishing, high speeds, excellent surface",
                "N10-N20": "General machining",
                "N20-N30": "Roughing, high silicon content"
            },
            characteristics: ["Long chips", "Low cutting forces", "High cutting speeds", "Built-up edge with some alloys", "Gummy behavior"]
        },
        S: {
            name: "Heat Resistant Super Alloys (HRSA)",
            color: "Brown/Orange",
            description: "Heat resistant alloys based on iron, nickel, cobalt, and titanium",
            materials: [
                "Nickel-based alloys (Inconel, Hastelloy, Waspaloy)",
                "Cobalt-based alloys (Stellite)",
                "Iron-based alloys",
                "Titanium alloys (commercially pure)",
                "Titanium alloys (alpha, alpha-beta, beta)"
            ],
            subgroups: {
                "S01-S10": "Light finishing, stable conditions",
                "S10-S20": "Finishing to light roughing",
                "S20-S30": "Roughing",
                "S30-S40": "Heavy roughing"
            },
            characteristics: ["Work hardening", "Low thermal conductivity", "High cutting temperatures", "Rapid tool wear", "Notch wear", "Difficult chip control"]
        },
        H: {
            name: "Hardened Steel",
            color: "Gray",
            description: "Hardened and tempered steel and chilled cast iron",
            materials: [
                "Hardened steel (45-55 HRC)",
                "Hardened steel (55-60 HRC)",
                "Hardened steel (60-68 HRC)",
                "Chilled cast iron",
                "Case hardened steel"
            ],
            subgroups: {
                "H01-H10": "Light finishing, continuous cut",
                "H10-H20": "Finishing, light interrupted",
                "H20-H30": "Heavier cuts, interrupted"
            },
            characteristics: ["High hardness", "Abrasive", "High cutting temperatures", "Requires CBN, ceramic, or special carbide grades"]
        }
    },
    // ANSI TO ISO GRADE CONVERSION
    ansi_iso_conversion: {
        description: "ANSI C-system to ISO P/M/K conversion",
        cast_iron: {
            "C1": { iso: "K30-K40", application: "Roughing, interrupted cuts, maximum toughness" },
            "C2": { iso: "K20-K30", application: "General purpose, moderate wear resistance" },
            "C3": { iso: "K10-K20", application: "Finishing to semi-finishing" },
            "C4": { iso: "K01-K10", application: "Precision finishing, maximum wear resistance" }
        },
        steel: {
            "C5": { iso: "P30-P50", application: "Roughing, interrupted cuts, maximum toughness" },
            "C6": { iso: "P20-P30", application: "General purpose, moderate conditions" },
            "C7": { iso: "P10-P20", application: "Finishing to semi-finishing" },
            "C8": { iso: "P01-P10", application: "Precision finishing, high speeds" }
        },
        notes: [
            "C1-C4 grades contain straight tungsten carbide (WC-Co)",
            "C5-C8 grades contain titanium carbide additives (TiC, TaC) for crater wear resistance",
            "Modern micro-grain carbides often use C2-type substrate with coatings for steel"
        ]
    },
    // CARBIDE GRADE EQUIVALENCY BY MANUFACTURER - TURNING (STEEL P)
    grade_equivalency_turning_steel: {
        description: "Equivalent carbide grades for turning steel (ISO P)",

        general_purpose_cvd: {
            application: "P15-P25, General steel turning, medium speeds",
            sandvik: ["GC4325", "GC4315"],
            kennametal: ["KC9225", "KC9240"],
            iscar: ["IC8250", "IC807"],
            mitsubishi: ["MC6025", "UE6020"],
            walter: ["WPP20S", "WAM20"],
            seco: ["TP2500", "TP1500"],
            kyocera: ["CA5525", "CA6525"],
            tungaloy: ["T9125", "T9115"],
            korloy: ["NC3225", "NC3220"],
            taegutec: ["TT8125", "TT8115"],
            sumitomo: ["AC830P", "AC820P"],
            dormer_pramet: ["T8330", "T8315"]
        },
        finishing_pvd: {
            application: "P10-P15, Finishing steel, higher speeds",
            sandvik: ["GC1125", "GC1515"],
            kennametal: ["KC5010", "KC5025"],
            iscar: ["IC9015", "IC9025"],
            mitsubishi: ["VP15TF", "VP10MF"],
            walter: ["WPP10S", "WSP45S"],
            seco: ["TP1030", "TP0500"],
            kyocera: ["PR1225", "PR1025"],
            tungaloy: ["AH725", "AH120"],
            korloy: ["PC9030", "PC9010"],
            taegutec: ["TT9080", "TT9030"]
        },
        roughing_tough: {
            application: "P30-P40, Roughing, interrupted cuts",
            sandvik: ["GC4335", "GC4345"],
            kennametal: ["KC9325", "KC9340"],
            iscar: ["IC8350", "IC380"],
            mitsubishi: ["MC6035", "UC5115"],
            walter: ["WPP30S", "WAM30"],
            seco: ["TP3500", "TP4500"],
            kyocera: ["CA5535", "CA6535"],
            tungaloy: ["T9135", "T9145"]
        }
    },
    // CARBIDE GRADE EQUIVALENCY - TURNING (STAINLESS M)
    grade_equivalency_turning_stainless: {
        description: "Equivalent carbide grades for turning stainless steel (ISO M)",

        general_purpose: {
            application: "M15-M25, General stainless turning",
            sandvik: ["GC2025", "GC2015"],
            kennametal: ["KC730", "KC725M"],
            iscar: ["IC1008", "IC907"],
            mitsubishi: ["VP15TF", "MC7015"],
            walter: ["WMP20S", "WMP25S"],
            seco: ["TM2000", "TM4000"],
            kyocera: ["PR1225", "PR1535"],
            tungaloy: ["AH725", "AH3135"],
            korloy: ["NC9000 Series"],
            sumitomo: ["AC6030M", "AC6040M"]
        },
        finishing: {
            application: "M05-M15, Finishing stainless",
            sandvik: ["GC1115", "GC1105"],
            kennametal: ["KC5010"],
            iscar: ["IC908", "IC1008"],
            mitsubishi: ["VP05RT", "VP10RT"],
            walter: ["WSM10S"],
            seco: ["TM1000"],
            kyocera: ["PR1005"]
        }
    },
    // CARBIDE GRADE EQUIVALENCY - MILLING
    grade_equivalency_milling: {
        description: "Equivalent carbide grades for milling operations",

        steel_general: {
            application: "Milling steel, general purpose",
            sandvik: ["GC1030", "GC4240"],
            kennametal: ["KCPM40", "KC725M"],
            iscar: ["IC330", "IC830"],
            mitsubishi: ["VP15TF", "F7030"],
            walter: ["WKP35S", "WSP45S"],
            seco: ["MP1500", "MP2500"],
            kyocera: ["PR1225", "PR1535"],
            tungaloy: ["AH140", "AH3135"]
        },
        aluminum: {
            application: "Milling aluminum and non-ferrous",
            sandvik: ["H13A", "GC1010"],
            kennametal: ["KC520M"],
            iscar: ["IC28", "IC20"],
            mitsubishi: ["HTI10"],
            walter: ["WK10"],
            seco: ["MK1500", "MK2000"],
            kyocera: ["KW10"],
            tungaloy: ["KS10F"]
        },
        cast_iron: {
            application: "Milling cast iron",
            sandvik: ["GC3220", "GC3040"],
            kennametal: ["KC915M", "KC935M"],
            iscar: ["IC4100", "IC928"],
            mitsubishi: ["MC5020", "HTI20"],
            walter: ["WKK20S"],
            seco: ["MK3000"],
            kyocera: ["CA5515"],
            tungaloy: ["T3130"]
        }
    },
    // CUTTING DATA RECOMMENDATIONS - TURNING
    cutting_data_turning: {
        units: {
            Vc: "m/min (surface speed)",
            fn: "mm/rev (feed per revolution)",
            ap: "mm (depth of cut)"
        },
        steel_low_carbon: {
            material: "Low carbon steel (C < 0.25%), 120-180 HB",
            carbide_coated: {
                finishing: { Vc: "250-400", fn: "0.05-0.15", ap: "0.3-1.5" },
                medium: { Vc: "180-300", fn: "0.15-0.35", ap: "1.5-4.0" },
                roughing: { Vc: "120-220", fn: "0.30-0.60", ap: "4.0-10.0" }
            },
            cermet: {
                finishing: { Vc: "300-500", fn: "0.05-0.20", ap: "0.2-1.0" }
            }
        },
        steel_medium_carbon: {
            material: "Medium carbon steel (C 0.25-0.55%), 180-250 HB",
            carbide_coated: {
                finishing: { Vc: "200-350", fn: "0.05-0.15", ap: "0.3-1.5" },
                medium: { Vc: "150-250", fn: "0.15-0.35", ap: "1.5-4.0" },
                roughing: { Vc: "100-180", fn: "0.30-0.60", ap: "4.0-10.0" }
            }
        },
        steel_alloy: {
            material: "Alloy steel, 200-300 HB",
            carbide_coated: {
                finishing: { Vc: "150-280", fn: "0.05-0.15", ap: "0.3-1.5" },
                medium: { Vc: "120-200", fn: "0.15-0.30", ap: "1.5-4.0" },
                roughing: { Vc: "80-150", fn: "0.25-0.50", ap: "4.0-8.0" }
            }
        },
        stainless_austenitic: {
            material: "Austenitic stainless steel (304, 316), 150-200 HB",
            carbide_coated: {
                finishing: { Vc: "150-250", fn: "0.05-0.15", ap: "0.3-1.5" },
                medium: { Vc: "100-180", fn: "0.15-0.30", ap: "1.5-3.5" },
                roughing: { Vc: "70-130", fn: "0.25-0.45", ap: "3.5-8.0" }
            },
            notes: "Use positive geometry, sharp edges. Avoid dwelling. Maintain constant feed."
        },
        stainless_duplex: {
            material: "Duplex stainless steel, 250-300 HB",
            carbide_coated: {
                finishing: { Vc: "100-180", fn: "0.05-0.15", ap: "0.3-1.5" },
                medium: { Vc: "70-130", fn: "0.15-0.30", ap: "1.5-3.0" },
                roughing: { Vc: "50-100", fn: "0.25-0.40", ap: "3.0-6.0" }
            }
        },
        cast_iron_gray: {
            material: "Gray cast iron, 180-250 HB",
            carbide_coated: {
                finishing: { Vc: "200-350", fn: "0.05-0.20", ap: "0.3-1.5" },
                medium: { Vc: "150-280", fn: "0.15-0.35", ap: "1.5-4.0" },
                roughing: { Vc: "100-200", fn: "0.30-0.60", ap: "4.0-10.0" }
            },
            ceramic: {
                finishing: { Vc: "400-800", fn: "0.08-0.20", ap: "0.3-2.0" }
            }
        },
        cast_iron_nodular: {
            material: "Nodular (ductile) cast iron, 180-280 HB",
            carbide_coated: {
                finishing: { Vc: "150-280", fn: "0.05-0.20", ap: "0.3-1.5" },
                medium: { Vc: "120-220", fn: "0.15-0.35", ap: "1.5-4.0" },
                roughing: { Vc: "80-160", fn: "0.30-0.55", ap: "4.0-8.0" }
            }
        },
        aluminum_wrought: {
            material: "Aluminum alloys (wrought), 50-120 HB",
            carbide_uncoated: {
                finishing: { Vc: "500-2000", fn: "0.05-0.20", ap: "0.3-1.5" },
                medium: { Vc: "400-1500", fn: "0.15-0.40", ap: "1.5-5.0" },
                roughing: { Vc: "300-1000", fn: "0.30-0.80", ap: "5.0-15.0" }
            },
            PCD: {
                finishing: { Vc: "1000-3000", fn: "0.05-0.20", ap: "0.2-1.0" }
            },
            notes: "Use polished rake face, sharp edges. High spindle speeds recommended."
        },
        aluminum_cast_high_si: {
            material: "Aluminum-silicon alloys (>10% Si)",
            PCD: {
                finishing: { Vc: "400-1000", fn: "0.05-0.15", ap: "0.2-1.0" },
                medium: { Vc: "300-700", fn: "0.10-0.25", ap: "1.0-3.0" }
            },
            notes: "PCD or diamond coated strongly recommended due to abrasive silicon."
        },
        titanium_alloys: {
            material: "Titanium alloys (Ti-6Al-4V), 300-380 HB",
            carbide_uncoated: {
                finishing: { Vc: "50-80", fn: "0.05-0.15", ap: "0.3-1.0" },
                medium: { Vc: "35-60", fn: "0.10-0.25", ap: "1.0-3.0" },
                roughing: { Vc: "25-50", fn: "0.20-0.40", ap: "3.0-6.0" }
            },
            notes: "Use sharp edges, positive geometry. High pressure coolant strongly recommended. Avoid built-up edge."
        },
        inconel: {
            material: "Inconel 718, 250-400 HB",
            carbide_coated: {
                finishing: { Vc: "30-60", fn: "0.05-0.15", ap: "0.25-0.75" },
                medium: { Vc: "20-45", fn: "0.10-0.25", ap: "0.75-2.0" },
                roughing: { Vc: "15-35", fn: "0.20-0.35", ap: "2.0-4.0" }
            },
            ceramic: {
                finishing: { Vc: "200-400", fn: "0.05-0.15", ap: "0.15-0.50" }
            },
            notes: "Very low thermal conductivity. Use high pressure coolant. Watch for notch wear."
        },
        hardened_steel: {
            material: "Hardened steel, 55-62 HRC",
            CBN: {
                finishing: { Vc: "100-200", fn: "0.05-0.15", ap: "0.05-0.30" },
                light_turning: { Vc: "80-150", fn: "0.08-0.20", ap: "0.20-0.50" }
            },
            ceramic: {
                finishing: { Vc: "80-180", fn: "0.05-0.15", ap: "0.10-0.40" }
            },
            notes: "Rigid setup essential. Use negative geometry. May require dry machining."
        }
    },
    // CUTTING DATA RECOMMENDATIONS - MILLING
    cutting_data_milling: {
        units: {
            Vc: "m/min (surface speed)",
            fz: "mm/tooth (feed per tooth)",
            ae: "mm (radial depth of cut)",
            ap: "mm (axial depth of cut)"
        },
        calculation_formulas: {
            spindle_rpm: "n = (Vc × 1000) / (π × Dc)",
            table_feed: "Vf = fz × z × n",
            metal_removal_rate: "Q = ae × ap × Vf / 1000 (cm³/min)"
        },
        steel_low_carbon: {
            material: "Low carbon steel, 120-180 HB",
            face_milling_carbide: {
                Vc: "180-300",
                fz: "0.15-0.30",
                ae: "0.5-0.8 × Dc",
                ap: "1.0-4.0"
            },
            shoulder_milling_carbide: {
                Vc: "150-250",
                fz: "0.10-0.20",
                ae: "0.1-0.3 × Dc",
                ap: "1.0 × Dc"
            },
            solid_carbide_endmill: {
                slotting: { Vc: "80-150", fz: "0.03-0.08", ae: "1.0 × Dc", ap: "0.5-1.0 × Dc" },
                profiling: { Vc: "120-200", fz: "0.05-0.12", ae: "0.1-0.3 × Dc", ap: "1.0-2.0 × Dc" }
            }
        },
        stainless_austenitic: {
            material: "Austenitic stainless steel, 150-200 HB",
            face_milling_carbide: {
                Vc: "120-200",
                fz: "0.12-0.25",
                ae: "0.5-0.8 × Dc",
                ap: "0.8-3.0"
            },
            shoulder_milling_carbide: {
                Vc: "100-180",
                fz: "0.08-0.18",
                ae: "0.1-0.25 × Dc",
                ap: "0.8 × Dc"
            },
            solid_carbide_endmill: {
                slotting: { Vc: "60-100", fz: "0.025-0.06", ae: "1.0 × Dc", ap: "0.3-0.8 × Dc" },
                profiling: { Vc: "80-150", fz: "0.04-0.10", ae: "0.1-0.25 × Dc", ap: "0.8-1.5 × Dc" }
            },
            notes: "Use climb milling. Maintain constant chip load. Avoid dwelling."
        },
        cast_iron_gray: {
            material: "Gray cast iron, 180-250 HB",
            face_milling_carbide: {
                Vc: "200-350",
                fz: "0.15-0.35",
                ae: "0.5-0.8 × Dc",
                ap: "1.0-5.0"
            },
            shoulder_milling_carbide: {
                Vc: "180-300",
                fz: "0.12-0.25",
                ae: "0.1-0.3 × Dc",
                ap: "1.0 × Dc"
            }
        },
        aluminum_wrought: {
            material: "Aluminum alloys, 50-120 HB",
            face_milling_carbide: {
                Vc: "500-2500",
                fz: "0.10-0.30",
                ae: "0.5-0.8 × Dc",
                ap: "2.0-8.0"
            },
            solid_carbide_endmill: {
                slotting: { Vc: "300-600", fz: "0.05-0.15", ae: "1.0 × Dc", ap: "0.5-1.5 × Dc" },
                profiling: { Vc: "400-1000", fz: "0.08-0.20", ae: "0.2-0.5 × Dc", ap: "1.0-3.0 × Dc" },
                HEM: { Vc: "500-1500", fz: "0.15-0.35", ae: "0.08-0.15 × Dc", ap: "2.0-4.0 × Dc" }
            },
            notes: "Use 2-3 flute end mills. Polished flutes for chip evacuation. High spindle speeds."
        },
        titanium_alloys: {
            material: "Titanium alloys (Ti-6Al-4V)",
            face_milling_carbide: {
                Vc: "40-70",
                fz: "0.08-0.18",
                ae: "0.3-0.6 × Dc",
                ap: "0.5-2.5"
            },
            solid_carbide_endmill: {
                slotting: { Vc: "30-50", fz: "0.03-0.06", ae: "1.0 × Dc", ap: "0.2-0.5 × Dc" },
                profiling: { Vc: "40-70", fz: "0.04-0.10", ae: "0.1-0.2 × Dc", ap: "0.5-1.5 × Dc" }
            },
            notes: "Flood coolant essential. Climb milling. Sharp tools. Variable helix recommended."
        },
        hardened_steel: {
            material: "Hardened steel, 45-62 HRC",
            solid_carbide_endmill: {
                light_milling: { Vc: "80-150", fz: "0.02-0.06", ae: "0.05-0.15 × Dc", ap: "0.5-2.0 × Dc" },
                finishing: { Vc: "100-200", fz: "0.015-0.04", ae: "0.02-0.08 × Dc", ap: "0.3-1.5 × Dc" }
            },
            notes: "Use 4+ flute end mills. AlTiN or nACo coating. Rigid toolholding essential."
        }
    },
    // CUTTING DATA RECOMMENDATIONS - DRILLING
    cutting_data_drilling: {
        units: {
            Vc: "m/min (surface speed)",
            fn: "mm/rev (feed per revolution)"
        },
        steel_low_carbon: {
            material: "Low carbon steel, 120-180 HB",
            solid_carbide: {
                "3xD": { Vc: "100-150", fn: "0.15-0.30" },
                "5xD": { Vc: "80-130", fn: "0.12-0.25" },
                "8xD": { Vc: "60-100", fn: "0.10-0.20" }
            },
            indexable: {
                "2xD-3xD": { Vc: "150-250", fn: "0.05-0.12 per edge" },
                "4xD-5xD": { Vc: "120-200", fn: "0.04-0.10 per edge" }
            },
            HSS_cobalt: {
                "standard": { Vc: "25-40", fn: "0.15-0.35" }
            }
        },
        stainless_austenitic: {
            material: "Austenitic stainless steel",
            solid_carbide: {
                "3xD": { Vc: "60-100", fn: "0.10-0.22" },
                "5xD": { Vc: "50-85", fn: "0.08-0.18" }
            },
            notes: "Use through-coolant. Reduce feed at drill exit. Pecking may be required."
        },
        cast_iron_gray: {
            material: "Gray cast iron",
            solid_carbide: {
                "3xD": { Vc: "100-180", fn: "0.20-0.40" },
                "5xD": { Vc: "80-150", fn: "0.15-0.35" }
            }
        },
        aluminum: {
            material: "Aluminum alloys",
            solid_carbide: {
                "3xD": { Vc: "150-300", fn: "0.15-0.35" },
                "5xD": { Vc: "120-250", fn: "0.12-0.30" }
            },
            notes: "Use polished flute drills. Through-coolant helps chip evacuation."
        },
        titanium: {
            material: "Titanium alloys",
            solid_carbide: {
                "3xD": { Vc: "30-50", fn: "0.06-0.15" },
                "5xD": { Vc: "25-45", fn: "0.05-0.12" }
            },
            notes: "High pressure through-coolant essential. Reduce speed at breakthrough."
        }
    },
    // TOOLHOLDER INTERFACE SPECIFICATIONS
    toolholder_interfaces: {
        "CAT": {
            standard: "ANSI/ASME B5.50 (V-flange)",
            description: "Most common in North America",
            sizes: {
                "CAT 30": { taper: "7:24", flange_dia: "44.45mm (1.75\")", drawbar: "3/8-16 UNC" },
                "CAT 40": { taper: "7:24", flange_dia: "63.55mm (2.5\")", drawbar: "5/8-11 UNC" },
                "CAT 50": { taper: "7:24", flange_dia: "101.6mm (4.0\")", drawbar: "1-8 UNC" }
            },
            max_rpm: {
                "CAT 40": "12,000-15,000 rpm (dual contact higher)",
                "CAT 50": "8,000-10,000 rpm (dual contact higher)"
            },
            dual_contact: "BIG PLUS, Sandvik Coromant, Lyndex-Nikken"
        },
        "BT": {
            standard: "JIS B 6339 / MAS 403",
            description: "Common in Asia and Europe",
            sizes: {
                "BT 30": { taper: "7:24", flange_dia: "46mm", drawbar: "M12" },
                "BT 40": { taper: "7:24", flange_dia: "63mm", drawbar: "M16" },
                "BT 50": { taper: "7:24", flange_dia: "100mm", drawbar: "M24" }
            },
            max_rpm: {
                "BT 40": "12,000-15,000 rpm (dual contact higher)",
                "BT 50": "8,000-10,000 rpm (dual contact higher)"
            },
            dual_contact: "BIG PLUS (original developer)"
        },
        "HSK": {
            standard: "DIN 69893 / ISO 12164",
            description: "Hollow shank taper, face and taper contact",
            types: {
                "HSK-A": "Standard, symmetric drive keys, coolant through center",
                "HSK-B": "No drive keys, tighter tolerance, small tools",
                "HSK-C": "Manual clamping, for turning operations",
                "HSK-D": "No drive keys, extra long nose",
                "HSK-E": "Reduced flange, smaller/lighter, high speed",
                "HSK-F": "Like HSK-A, but with flange slot for orientation",
                "HSK-T": "For lathes with live tooling"
            },
            sizes: {
                "HSK 25": { D1: "25mm", max_rpm: "60,000" },
                "HSK 32": { D1: "32mm", max_rpm: "50,000" },
                "HSK 40": { D1: "40mm", max_rpm: "40,000" },
                "HSK 50": { D1: "50mm", max_rpm: "30,000" },
                "HSK 63": { D1: "63mm", max_rpm: "24,000" },
                "HSK 80": { D1: "80mm", max_rpm: "18,000" },
                "HSK 100": { D1: "100mm", max_rpm: "15,000" },
                "HSK 125": { D1: "125mm", max_rpm: "12,000" }
            },
            advantages: ["Higher accuracy", "Better repeatability", "Higher speeds", "Faster tool change", "Better rigidity"]
        },
        "Capto": {
            standard: "ISO 26623",
            developer: "Sandvik Coromant",
            description: "Polygon taper coupling, self-centering",
            sizes: {
                "C3": { coupling_dia: "32mm" },
                "C4": { coupling_dia: "40mm" },
                "C5": { coupling_dia: "50mm" },
                "C6": { coupling_dia: "63mm" },
                "C8": { coupling_dia: "80mm" },
                "C10": { coupling_dia: "100mm" }
            },
            advantages: ["Modular system", "High bending stiffness", "Quick change", "Rotating and stationary use"],
            licensees: ["Kennametal (KM)", "Many others"]
        },
        "KM": {
            standard: "ISO 26622",
            developer: "Kennametal",
            description: "Three-ball kinematic coupling",
            sizes: ["KM32", "KM40", "KM50", "KM63", "KM80"],
            advantages: ["High repeatability", "High clamping force", "Quick change", "Modular"]
        },
        "VDI": {
            standard: "DIN 69880",
            description: "For CNC lathes and turning centers",
            sizes: {
                "VDI 16": { shank_dia: "16mm" },
                "VDI 20": { shank_dia: "20mm" },
                "VDI 25": { shank_dia: "25mm" },
                "VDI 30": { shank_dia: "30mm" },
                "VDI 40": { shank_dia: "40mm" },
                "VDI 50": { shank_dia: "50mm" },
                "VDI 60": { shank_dia: "60mm" }
            }
        },
        "BMT": {
            description: "Base mount tooling for live tools",
            types: ["BMT 45", "BMT 55", "BMT 65", "BMT 75"],
            manufacturers: ["Mazak primary user"]
        },
        "PSC": {
            description: "Polygon shank connection (Capto compatible)",
            usage: "Quick change turning tool holders"
        }
    },
    // INSERT GEOMETRY STANDARDS (ISO)
    insert_geometry_iso: {
        shape_codes: {
            "C": { shape: "Diamond 80°", included_angle: 80 },
            "D": { shape: "Diamond 55°", included_angle: 55 },
            "E": { shape: "Diamond 75°", included_angle: 75 },
            "H": { shape: "Hexagon", included_angle: 120 },
            "K": { shape: "Parallelogram 55°", included_angle: 55 },
            "L": { shape: "Rectangle", included_angle: 90 },
            "M": { shape: "Diamond 86°", included_angle: 86 },
            "O": { shape: "Octagon", included_angle: 135 },
            "P": { shape: "Pentagon", included_angle: 108 },
            "R": { shape: "Round", included_angle: 360 },
            "S": { shape: "Square", included_angle: 90 },
            "T": { shape: "Triangle", included_angle: 60 },
            "V": { shape: "Diamond 35°", included_angle: 35 },
            "W": { shape: "Trigon 80°", included_angle: 80 }
        },
        clearance_angles: {
            "A": 3,
            "B": 5,
            "C": 7,
            "D": 15,
            "E": 20,
            "F": 25,
            "G": 30,
            "N": 0,
            "O": "Other",
            "P": 11
        },
        tolerance_classes: {
            "A": { IC: "±0.025mm", thickness: "±0.025mm" },
            "C": { IC: "±0.025mm", thickness: "±0.025mm" },
            "E": { IC: "±0.025mm", thickness: "±0.025mm" },
            "F": { IC: "±0.013mm", thickness: "±0.025mm" },
            "G": { IC: "±0.025mm", thickness: "±0.13mm" },
            "H": { IC: "±0.013mm", thickness: "±0.013mm" },
            "J": { IC: "±0.05-0.15mm", thickness: "±0.025mm" },
            "K": { IC: "±0.05-0.15mm", thickness: "±0.13mm" },
            "L": { IC: "±0.05-0.15mm", thickness: "±0.025mm" },
            "M": { IC: "±0.05-0.15mm", thickness: "±0.08-0.18mm" },
            "N": { IC: "±0.05-0.15mm", thickness: "±0.025mm" },
            "U": { IC: "±0.08-0.25mm", thickness: "±0.13mm" }
        },
        insert_type: {
            "A": "With hole, no chipbreaker",
            "B": "With hole, no chipbreaker",
            "C": "With hole, no chipbreaker",
            "F": "Solid, no hole",
            "G": "With hole and chipbreaker on one face",
            "H": "With hole and chipbreaker on both faces",
            "J": "With hole and chipbreaker on both faces",
            "M": "With hole and chipbreaker on both faces",
            "N": "Without hole",
            "Q": "With hole and chipbreaker on both faces",
            "R": "Without hole",
            "T": "With hole and chipbreaker on one face",
            "U": "With hole and chipbreaker on both faces",
            "W": "With hole"
        },
        common_IC_sizes: {
            "06": 6.35,
            "08": 8.0,
            "09": 9.525,
            "12": 12.7,
            "15": 15.875,
            "16": 16.0,
            "19": 19.05,
            "20": 20.0,
            "25": 25.4
        },
        thickness_codes: {
            "01": 1.59,
            "02": 2.38,
            "03": 3.18,
            "04": 4.76,
            "05": 5.56,
            "06": 6.35,
            "07": 7.94,
            "T3": 3.97
        },
        nose_radius_codes: {
            "00": "Sharp",
            "01": 0.1,
            "02": 0.2,
            "04": 0.4,
            "08": 0.8,
            "12": 1.2,
            "16": 1.6,
            "20": 2.0,
            "24": 2.4,
            "28": 2.8,
            "32": 3.2
        },
        example_designations: {
            "CNMG 120408": {
                C: "Diamond 80°",
                N: "0° clearance",
                M: "±0.05-0.15mm IC tolerance",
                G: "With hole and chipbreaker one face",
                "12": "IC = 12.7mm (1/2\")",
                "04": "Thickness = 4.76mm (3/16\")",
                "08": "Nose radius = 0.8mm (1/32\")"
            },
            "TNMG 160408": {
                T: "Triangle 60°",
                N: "0° clearance",
                M: "±0.05-0.15mm IC tolerance",
                G: "With hole and chipbreaker one face",
                "16": "IC = 9.525mm (3/8\") - note: for triangle, edge length code",
                "04": "Thickness = 4.76mm (3/16\")",
                "08": "Nose radius = 0.8mm (1/32\")"
            }
        }
    }
}