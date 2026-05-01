const PRISM_AI_MATERIAL_MODIFIERS = {

    version: '1.0.0',

    // MATERIAL FAMILY DEFINITIONS WITH FULL PARAMETERS
    materialFamilies: {

        // ALUMINUM ALLOYS
        aluminum: {
            family: 'aluminum',
            subFamilies: {
                '1xxx_pure': { speedMult: 1.4, feedMult: 1.3, docMult: 1.5, wocMult: 1.2 },
                '2xxx_copper': { speedMult: 1.1, feedMult: 1.1, docMult: 1.2, wocMult: 1.1 },
                '3xxx_manganese': { speedMult: 1.3, feedMult: 1.2, docMult: 1.4, wocMult: 1.2 },
                '5xxx_magnesium': { speedMult: 1.2, feedMult: 1.15, docMult: 1.3, wocMult: 1.15 },
                '6xxx_mg_si': { speedMult: 1.25, feedMult: 1.2, docMult: 1.35, wocMult: 1.2 },
                '7xxx_zinc': { speedMult: 1.0, feedMult: 1.0, docMult: 1.1, wocMult: 1.05 },
                'cast': { speedMult: 1.1, feedMult: 1.1, docMult: 1.2, wocMult: 1.1 }
            },
            defaultModifiers: {
                speedMultiplier: 1.3,
                feedMultiplier: 1.2,
                docMultiplier: 1.5,
                wocMultiplier: 1.2,
                rampAngleMult: 1.5,
                helixDiameterMult: 1.0,
                coolantRequirement: 'flood_preferred',
                chipBreaking: 'continuous_ok',
                surfaceFinishFactor: 0.8
            },
            specificMaterials: {
                '6061-T6': { speedMult: 1.3, feedMult: 1.2, docMult: 1.5, notes: 'Excellent machinability' },
                '6061-T651': { speedMult: 1.3, feedMult: 1.2, docMult: 1.5 },
                '7075-T6': { speedMult: 1.0, feedMult: 1.0, docMult: 1.2, notes: 'Higher strength, moderate machinability' },
                '7075-T651': { speedMult: 1.0, feedMult: 1.0, docMult: 1.2 },
                '2024-T3': { speedMult: 1.05, feedMult: 1.05, docMult: 1.15 },
                '2024-T4': { speedMult: 1.05, feedMult: 1.05, docMult: 1.15 },
                '5052-H32': { speedMult: 1.2, feedMult: 1.15, docMult: 1.3 },
                '5083-H116': { speedMult: 1.15, feedMult: 1.1, docMult: 1.25 },
                'MIC-6': { speedMult: 1.25, feedMult: 1.2, docMult: 1.4, notes: 'Cast plate, stable' },
                'A356': { speedMult: 1.1, feedMult: 1.1, docMult: 1.2, notes: 'Cast aluminum' },
                'A380': { speedMult: 1.0, feedMult: 1.0, docMult: 1.1, notes: 'Die cast' }
            }
        },
        // CARBON STEELS
        steel_carbon: {
            family: 'steel',
            subFamilies: {
                'low_carbon': { speedMult: 1.0, feedMult: 1.0, docMult: 1.0, wocMult: 1.0 },
                'medium_carbon': { speedMult: 0.9, feedMult: 0.95, docMult: 0.9, wocMult: 0.95 },
                'high_carbon': { speedMult: 0.8, feedMult: 0.85, docMult: 0.8, wocMult: 0.85 }
            },
            defaultModifiers: {
                speedMultiplier: 1.0,
                feedMultiplier: 1.0,
                docMultiplier: 1.0,
                wocMultiplier: 1.0,
                rampAngleMult: 1.0,
                coolantRequirement: 'flood_required',
                chipBreaking: 'chip_breaker_recommended',
                surfaceFinishFactor: 1.0
            },
            specificMaterials: {
                '1008': { speedMult: 1.1, feedMult: 1.05, docMult: 1.1, notes: 'Very soft, gummy' },
                '1010': { speedMult: 1.1, feedMult: 1.05, docMult: 1.1 },
                '1018': { speedMult: 1.0, feedMult: 1.0, docMult: 1.0, notes: 'Common, good machinability' },
                '1020': { speedMult: 1.0, feedMult: 1.0, docMult: 1.0 },
                '1045': { speedMult: 0.85, feedMult: 0.9, docMult: 0.85, notes: 'Medium carbon' },
                '1050': { speedMult: 0.8, feedMult: 0.85, docMult: 0.8 },
                '1095': { speedMult: 0.7, feedMult: 0.75, docMult: 0.7, notes: 'High carbon, hard' },
                '12L14': { speedMult: 1.3, feedMult: 1.2, docMult: 1.2, notes: 'Free machining, leaded' },
                '1117': { speedMult: 1.15, feedMult: 1.1, docMult: 1.1, notes: 'Free machining, resulfurized' },
                '1144': { speedMult: 1.1, feedMult: 1.05, docMult: 1.0, notes: 'Stress-proof' }
            }
        },
        // ALLOY STEELS
        steel_alloy: {
            family: 'steel',
            subFamilies: {
                'chromium': { speedMult: 0.85, feedMult: 0.9, docMult: 0.85, wocMult: 0.9 },
                'chromoly': { speedMult: 0.8, feedMult: 0.85, docMult: 0.8, wocMult: 0.85 },
                'nickel': { speedMult: 0.75, feedMult: 0.8, docMult: 0.75, wocMult: 0.8 }
            },
            defaultModifiers: {
                speedMultiplier: 0.85,
                feedMultiplier: 0.9,
                docMultiplier: 0.85,
                wocMultiplier: 0.9,
                rampAngleMult: 0.8,
                coolantRequirement: 'flood_required',
                chipBreaking: 'chip_breaker_required',
                surfaceFinishFactor: 1.1
            },
            specificMaterials: {
                '4130': { speedMult: 0.85, feedMult: 0.9, docMult: 0.85, notes: 'Chromoly, weldable' },
                '4140': { speedMult: 0.8, feedMult: 0.85, docMult: 0.8, notes: 'Common alloy steel' },
                '4140_prehardened': { speedMult: 0.6, feedMult: 0.7, docMult: 0.6, notes: '28-32 HRC' },
                '4340': { speedMult: 0.75, feedMult: 0.8, docMult: 0.75, notes: 'High strength' },
                '8620': { speedMult: 0.85, feedMult: 0.9, docMult: 0.85, notes: 'Case hardening' },
                '9310': { speedMult: 0.8, feedMult: 0.85, docMult: 0.8, notes: 'Aircraft quality' },
                '52100': { speedMult: 0.7, feedMult: 0.75, docMult: 0.7, notes: 'Bearing steel' }
            }
        },
        // STAINLESS STEELS
        stainless: {
            family: 'stainless',
            subFamilies: {
                'austenitic_300': { speedMult: 0.6, feedMult: 0.7, docMult: 0.7, wocMult: 0.75 },
                'ferritic_400': { speedMult: 0.75, feedMult: 0.8, docMult: 0.8, wocMult: 0.85 },
                'martensitic': { speedMult: 0.65, feedMult: 0.75, docMult: 0.7, wocMult: 0.8 },
                'duplex': { speedMult: 0.5, feedMult: 0.6, docMult: 0.6, wocMult: 0.65 },
                'precipitation_hardening': { speedMult: 0.45, feedMult: 0.55, docMult: 0.55, wocMult: 0.6 }
            },
            defaultModifiers: {
                speedMultiplier: 0.55,
                feedMultiplier: 0.65,
                docMultiplier: 0.65,
                wocMultiplier: 0.7,
                rampAngleMult: 0.6,
                coolantRequirement: 'flood_critical',
                chipBreaking: 'high_pressure_coolant',
                surfaceFinishFactor: 1.3,
                workHardeningWarning: true
            },
            specificMaterials: {
                '303': { speedMult: 0.75, feedMult: 0.8, docMult: 0.8, notes: 'Free machining stainless' },
                '304': { speedMult: 0.55, feedMult: 0.65, docMult: 0.65, notes: 'Work hardens, common' },
                '304L': { speedMult: 0.55, feedMult: 0.65, docMult: 0.65 },
                '316': { speedMult: 0.5, feedMult: 0.6, docMult: 0.6, notes: 'Marine grade' },
                '316L': { speedMult: 0.5, feedMult: 0.6, docMult: 0.6 },
                '410': { speedMult: 0.7, feedMult: 0.75, docMult: 0.75, notes: 'Martensitic' },
                '416': { speedMult: 0.8, feedMult: 0.85, docMult: 0.8, notes: 'Free machining martensitic' },
                '420': { speedMult: 0.65, feedMult: 0.7, docMult: 0.7 },
                '430': { speedMult: 0.7, feedMult: 0.75, docMult: 0.75, notes: 'Ferritic' },
                '440C': { speedMult: 0.5, feedMult: 0.6, docMult: 0.55, notes: 'High hardness' },
                '17-4_PH': { speedMult: 0.45, feedMult: 0.55, docMult: 0.55, notes: 'Precipitation hardening' },
                '15-5_PH': { speedMult: 0.45, feedMult: 0.55, docMult: 0.55 },
                '2205_duplex': { speedMult: 0.45, feedMult: 0.55, docMult: 0.5, notes: 'Duplex stainless' }
            }
        },
        // TOOL STEELS
        tool_steel: {
            family: 'tool_steel',
            subFamilies: {
                'A_series': { speedMult: 0.5, feedMult: 0.6, docMult: 0.5, wocMult: 0.55 },
                'D_series': { speedMult: 0.45, feedMult: 0.55, docMult: 0.45, wocMult: 0.5 },
                'H_series': { speedMult: 0.5, feedMult: 0.6, docMult: 0.5, wocMult: 0.55 },
                'M_series': { speedMult: 0.4, feedMult: 0.5, docMult: 0.4, wocMult: 0.45 },
                'O_series': { speedMult: 0.55, feedMult: 0.65, docMult: 0.55, wocMult: 0.6 },
                'S_series': { speedMult: 0.5, feedMult: 0.6, docMult: 0.5, wocMult: 0.55 },
                'W_series': { speedMult: 0.6, feedMult: 0.65, docMult: 0.6, wocMult: 0.65 }
            },
            defaultModifiers: {
                speedMultiplier: 0.5,
                feedMultiplier: 0.6,
                docMultiplier: 0.5,
                wocMultiplier: 0.55,
                rampAngleMult: 0.5,
                coolantRequirement: 'flood_critical',
                surfaceFinishFactor: 1.4
            },
            specificMaterials: {
                'A2': { speedMult: 0.5, feedMult: 0.6, docMult: 0.5, notes: 'Air hardening' },
                'D2': { speedMult: 0.4, feedMult: 0.5, docMult: 0.4, notes: 'High chromium cold work' },
                'H13': { speedMult: 0.5, feedMult: 0.6, docMult: 0.5, notes: 'Hot work, common for dies' },
                'M2': { speedMult: 0.4, feedMult: 0.5, docMult: 0.4, notes: 'High speed steel' },
                'O1': { speedMult: 0.55, feedMult: 0.65, docMult: 0.55, notes: 'Oil hardening' },
                'P20': { speedMult: 0.6, feedMult: 0.7, docMult: 0.6, notes: 'Mold steel, pre-hardened' },
                'S7': { speedMult: 0.5, feedMult: 0.6, docMult: 0.5, notes: 'Shock resisting' }
            }
        },
        // TITANIUM ALLOYS
        titanium: {
            family: 'titanium',
            subFamilies: {
                'commercially_pure': { speedMult: 0.5, feedMult: 0.6, docMult: 0.6, wocMult: 0.65 },
                'alpha': { speedMult: 0.45, feedMult: 0.55, docMult: 0.55, wocMult: 0.6 },
                'alpha_beta': { speedMult: 0.4, feedMult: 0.5, docMult: 0.5, wocMult: 0.55 },
                'beta': { speedMult: 0.35, feedMult: 0.45, docMult: 0.45, wocMult: 0.5 }
            },
            defaultModifiers: {
                speedMultiplier: 0.4,
                feedMultiplier: 0.5,
                docMultiplier: 0.5,
                wocMultiplier: 0.55,
                rampAngleMult: 0.4,
                coolantRequirement: 'high_pressure_critical',
                chipBreaking: 'high_pressure_through_tool',
                surfaceFinishFactor: 1.5,
                heatGenerationWarning: true
            },
            specificMaterials: {
                'Ti_Grade_2': { speedMult: 0.55, feedMult: 0.6, docMult: 0.6, notes: 'CP titanium' },
                'Ti_Grade_5': { speedMult: 0.4, feedMult: 0.5, docMult: 0.5, notes: 'Ti-6Al-4V, most common' },
                'Ti-6Al-4V': { speedMult: 0.4, feedMult: 0.5, docMult: 0.5 },
                'Ti-6Al-4V_ELI': { speedMult: 0.4, feedMult: 0.5, docMult: 0.5, notes: 'Medical grade' },
                'Ti-6Al-2Sn-4Zr-2Mo': { speedMult: 0.35, feedMult: 0.45, docMult: 0.45 },
                'Ti-5Al-5V-5Mo-3Cr': { speedMult: 0.35, feedMult: 0.45, docMult: 0.45, notes: 'Ti-5553, beta' },
                'Ti-10V-2Fe-3Al': { speedMult: 0.32, feedMult: 0.42, docMult: 0.42, notes: 'High strength beta' }
            }
        },
        // NICKEL SUPERALLOYS
        nickel_superalloy: {
            family: 'superalloy',
            subFamilies: {
                'inconel': { speedMult: 0.25, feedMult: 0.4, docMult: 0.4, wocMult: 0.45 },
                'hastelloy': { speedMult: 0.22, feedMult: 0.35, docMult: 0.35, wocMult: 0.4 },
                'waspaloy': { speedMult: 0.2, feedMult: 0.35, docMult: 0.35, wocMult: 0.4 },
                'monel': { speedMult: 0.4, feedMult: 0.5, docMult: 0.5, wocMult: 0.55 },
                'nimonic': { speedMult: 0.2, feedMult: 0.35, docMult: 0.35, wocMult: 0.4 }
            },
            defaultModifiers: {
                speedMultiplier: 0.25,
                feedMultiplier: 0.4,
                docMultiplier: 0.4,
                wocMultiplier: 0.45,
                rampAngleMult: 0.35,
                coolantRequirement: 'high_pressure_critical',
                chipBreaking: 'ceramic_preferred',
                surfaceFinishFactor: 1.6,
                workHardeningWarning: true,
                heatGenerationWarning: true
            },
            specificMaterials: {
                'Inconel_600': { speedMult: 0.3, feedMult: 0.45, docMult: 0.45 },
                'Inconel_625': { speedMult: 0.25, feedMult: 0.4, docMult: 0.4 },
                'Inconel_718': { speedMult: 0.22, feedMult: 0.38, docMult: 0.38, notes: 'Most common superalloy' },
                'Inconel_X750': { speedMult: 0.22, feedMult: 0.38, docMult: 0.38 },
                'Hastelloy_C276': { speedMult: 0.2, feedMult: 0.35, docMult: 0.35 },
                'Hastelloy_X': { speedMult: 0.22, feedMult: 0.38, docMult: 0.38 },
                'Waspaloy': { speedMult: 0.18, feedMult: 0.32, docMult: 0.32 },
                'Monel_400': { speedMult: 0.45, feedMult: 0.55, docMult: 0.55 },
                'Monel_K500': { speedMult: 0.35, feedMult: 0.45, docMult: 0.45 },
                'Rene_41': { speedMult: 0.18, feedMult: 0.32, docMult: 0.32 },
                'Udimet_500': { speedMult: 0.18, feedMult: 0.32, docMult: 0.32 }
            }
        },
        // CAST IRON
        cast_iron: {
            family: 'cast_iron',
            subFamilies: {
                'gray': { speedMult: 0.9, feedMult: 0.95, docMult: 1.0, wocMult: 1.0 },
                'ductile': { speedMult: 0.85, feedMult: 0.9, docMult: 0.95, wocMult: 0.95 },
                'malleable': { speedMult: 0.85, feedMult: 0.9, docMult: 0.95, wocMult: 0.95 },
                'compacted_graphite': { speedMult: 0.7, feedMult: 0.8, docMult: 0.8, wocMult: 0.85 },
                'white': { speedMult: 0.4, feedMult: 0.5, docMult: 0.5, wocMult: 0.55 }
            },
            defaultModifiers: {
                speedMultiplier: 0.85,
                feedMultiplier: 0.9,
                docMultiplier: 0.95,
                wocMultiplier: 0.95,
                rampAngleMult: 0.9,
                coolantRequirement: 'dry_preferred',
                chipBreaking: 'brittle_chips',
                surfaceFinishFactor: 1.2,
                dustWarning: true
            },
            specificMaterials: {
                'Class_20': { speedMult: 0.95, feedMult: 1.0, docMult: 1.0, notes: 'Soft gray' },
                'Class_30': { speedMult: 0.9, feedMult: 0.95, docMult: 0.95 },
                'Class_40': { speedMult: 0.85, feedMult: 0.9, docMult: 0.9 },
                'Class_50': { speedMult: 0.8, feedMult: 0.85, docMult: 0.85 },
                '65-45-12': { speedMult: 0.85, feedMult: 0.9, docMult: 0.95, notes: 'Ductile iron' },
                '80-55-06': { speedMult: 0.8, feedMult: 0.85, docMult: 0.9 },
                '100-70-03': { speedMult: 0.7, feedMult: 0.75, docMult: 0.8, notes: 'High strength ductile' },
                'CGI': { speedMult: 0.7, feedMult: 0.8, docMult: 0.8, notes: 'Compacted graphite' }
            }
        },
        // COPPER ALLOYS
        copper: {
            family: 'copper',
            subFamilies: {
                'pure_copper': { speedMult: 0.9, feedMult: 0.9, docMult: 1.0, wocMult: 1.0 },
                'brass': { speedMult: 1.3, feedMult: 1.2, docMult: 1.2, wocMult: 1.15 },
                'bronze': { speedMult: 1.1, feedMult: 1.1, docMult: 1.1, wocMult: 1.1 },
                'beryllium_copper': { speedMult: 0.6, feedMult: 0.7, docMult: 0.7, wocMult: 0.75 }
            },
            defaultModifiers: {
                speedMultiplier: 1.1,
                feedMultiplier: 1.1,
                docMultiplier: 1.1,
                wocMultiplier: 1.1,
                rampAngleMult: 1.2,
                coolantRequirement: 'flood_preferred',
                surfaceFinishFactor: 0.9
            },
            specificMaterials: {
                'C101': { speedMult: 0.85, feedMult: 0.85, docMult: 0.95, notes: 'Pure copper, gummy' },
                'C110': { speedMult: 0.85, feedMult: 0.85, docMult: 0.95 },
                'C260': { speedMult: 1.2, feedMult: 1.15, docMult: 1.15, notes: 'Cartridge brass' },
                'C360': { speedMult: 1.4, feedMult: 1.3, docMult: 1.25, notes: 'Free-cutting brass' },
                'C464': { speedMult: 1.1, feedMult: 1.1, docMult: 1.1, notes: 'Naval brass' },
                'C510': { speedMult: 1.0, feedMult: 1.0, docMult: 1.0, notes: 'Phosphor bronze' },
                'C630': { speedMult: 0.9, feedMult: 0.95, docMult: 0.95, notes: 'Aluminum bronze' },
                'C932': { speedMult: 1.1, feedMult: 1.1, docMult: 1.1, notes: 'High-leaded tin bronze' },
                'C17200': { speedMult: 0.55, feedMult: 0.65, docMult: 0.65, notes: 'Beryllium copper' }
            }
        },
        // PLASTICS
        plastics: {
            family: 'plastic',
            subFamilies: {
                'acetal': { speedMult: 1.4, feedMult: 1.3, docMult: 1.5, wocMult: 1.3 },
                'nylon': { speedMult: 1.3, feedMult: 1.25, docMult: 1.4, wocMult: 1.25 },
                'peek': { speedMult: 1.1, feedMult: 1.1, docMult: 1.2, wocMult: 1.1 },
                'ptfe': { speedMult: 1.5, feedMult: 1.4, docMult: 1.6, wocMult: 1.4 },
                'ultem': { speedMult: 1.0, feedMult: 1.0, docMult: 1.1, wocMult: 1.0 },
                'acrylic': { speedMult: 1.2, feedMult: 1.15, docMult: 1.3, wocMult: 1.2 },
                'polycarbonate': { speedMult: 1.15, feedMult: 1.1, docMult: 1.25, wocMult: 1.15 }
            },
            defaultModifiers: {
                speedMultiplier: 1.2,
                feedMultiplier: 1.15,
                docMultiplier: 1.3,
                wocMultiplier: 1.2,
                rampAngleMult: 1.5,
                coolantRequirement: 'air_blast',
                chipBreaking: 'stringy_chips',
                surfaceFinishFactor: 0.7,
                heatWarning: true
            },
            specificMaterials: {
                'Delrin': { speedMult: 1.4, feedMult: 1.3, docMult: 1.5, notes: 'Excellent machinability' },
                'Delrin_AF': { speedMult: 1.3, feedMult: 1.25, docMult: 1.4, notes: 'PTFE filled' },
                'Nylon_6': { speedMult: 1.3, feedMult: 1.25, docMult: 1.4 },
                'Nylon_66': { speedMult: 1.3, feedMult: 1.25, docMult: 1.4 },
                'PEEK': { speedMult: 1.0, feedMult: 1.0, docMult: 1.1, notes: 'High performance' },
                'PEEK_GF30': { speedMult: 0.9, feedMult: 0.95, docMult: 1.0, notes: 'Glass filled' },
                'PTFE': { speedMult: 1.5, feedMult: 1.4, docMult: 1.6, notes: 'Very soft, stringy' },
                'Ultem': { speedMult: 1.0, feedMult: 1.0, docMult: 1.1 },
                'UHMW': { speedMult: 1.4, feedMult: 1.3, docMult: 1.5 },
                'Acrylic': { speedMult: 1.2, feedMult: 1.15, docMult: 1.3 },
                'Polycarbonate': { speedMult: 1.15, feedMult: 1.1, docMult: 1.25 },
                'ABS': { speedMult: 1.2, feedMult: 1.15, docMult: 1.3 },
                'PVC': { speedMult: 1.1, feedMult: 1.1, docMult: 1.2 },
                'HDPE': { speedMult: 1.3, feedMult: 1.25, docMult: 1.4 }
            }
        },
        // COMPOSITES
        composites: {
            family: 'composite',
            subFamilies: {
                'carbon_fiber': { speedMult: 0.6, feedMult: 0.5, docMult: 0.5, wocMult: 0.5 },
                'glass_fiber': { speedMult: 0.7, feedMult: 0.6, docMult: 0.6, wocMult: 0.6 },
                'aramid': { speedMult: 0.5, feedMult: 0.4, docMult: 0.4, wocMult: 0.4 },
                'g10': { speedMult: 0.65, feedMult: 0.55, docMult: 0.55, wocMult: 0.55 }
            },
            defaultModifiers: {
                speedMultiplier: 0.6,
                feedMultiplier: 0.5,
                docMultiplier: 0.5,
                wocMultiplier: 0.5,
                rampAngleMult: 0.5,
                coolantRequirement: 'dust_extraction',
                chipBreaking: 'dust_abrasive',
                surfaceFinishFactor: 1.3,
                healthWarning: true,
                toolWearWarning: 'severe'
            },
            specificMaterials: {
                'CFRP': { speedMult: 0.55, feedMult: 0.45, docMult: 0.45, notes: 'Carbon fiber, diamond tools' },
                'GFRP': { speedMult: 0.7, feedMult: 0.6, docMult: 0.6 },
                'G10_FR4': { speedMult: 0.65, feedMult: 0.55, docMult: 0.55, notes: 'Circuit board material' },
                'Kevlar': { speedMult: 0.45, feedMult: 0.35, docMult: 0.35, notes: 'Specialized cutters needed' }
            }
        },
        // REFRACTORY METALS
        refractory: {
            family: 'refractory',
            defaultModifiers: {
                speedMultiplier: 0.3,
                feedMultiplier: 0.4,
                docMultiplier: 0.4,
                wocMultiplier: 0.45,
                coolantRequirement: 'flood_critical',
                surfaceFinishFactor: 1.5
            },
            specificMaterials: {
                'Tungsten': { speedMult: 0.2, feedMult: 0.3, docMult: 0.3, notes: 'Very hard, abrasive' },
                'Molybdenum': { speedMult: 0.35, feedMult: 0.45, docMult: 0.45 },
                'Tantalum': { speedMult: 0.4, feedMult: 0.5, docMult: 0.5, notes: 'Gummy' },
                'Niobium': { speedMult: 0.4, feedMult: 0.5, docMult: 0.5 }
            }
        },
        // HARDENED MATERIALS
        hardened: {
            family: 'hardened',
            defaultModifiers: {
                speedMultiplier: 0.3,
                feedMultiplier: 0.4,
                docMultiplier: 0.3,
                wocMultiplier: 0.35,
                rampAngleMult: 0.3,
                coolantRequirement: 'air_blast_only',
                surfaceFinishFactor: 1.8,
                toolTypeRecommendation: 'CBN_ceramic'
            },
            specificMaterials: {
                'Hardened_48-52_HRC': { speedMult: 0.35, feedMult: 0.45, docMult: 0.35 },
                'Hardened_52-58_HRC': { speedMult: 0.28, feedMult: 0.38, docMult: 0.28 },
                'Hardened_58-62_HRC': { speedMult: 0.22, feedMult: 0.32, docMult: 0.22 },
                'Hardened_62-65_HRC': { speedMult: 0.18, feedMult: 0.28, docMult: 0.18 }
            }
        }
    },
    // Get modifiers for specific material
    getModifiersForMaterial: function(materialId) {
        // First try to find specific material
        for (const [familyName, family] of Object.entries(this.materialFamilies)) {
            if (family.specificMaterials && family.specificMaterials[materialId]) {
                return {
                    ...family.defaultModifiers,
                    ...family.specificMaterials[materialId],
                    family: familyName
                };
            }
        }
        // Try to match by family
        const familyMatch = this._matchFamily(materialId);
        if (familyMatch) {
            return {
                ...this.materialFamilies[familyMatch].defaultModifiers,
                family: familyMatch
            };
        }
        // Default modifiers
        return {
            speedMultiplier: 1.0,
            feedMultiplier: 1.0,
            docMultiplier: 1.0,
            wocMultiplier: 1.0,
            family: 'unknown'
        };
    },
    _matchFamily: function(materialId) {
        const id = materialId.toLowerCase();
        if (id.includes('aluminum') || id.includes('al') || id.match(/^[0-9]{4}$/)) return 'aluminum';
        if (id.includes('steel') || id.includes('1018') || id.includes('4140')) return 'steel_carbon';
        if (id.includes('stainless') || id.includes('ss') || id.includes('304') || id.includes('316')) return 'stainless';
        if (id.includes('titanium') || id.includes('ti-')) return 'titanium';
        if (id.includes('inconel') || id.includes('hastelloy')) return 'nickel_superalloy';
        if (id.includes('cast') && id.includes('iron')) return 'cast_iron';
        if (id.includes('brass') || id.includes('bronze') || id.includes('copper')) return 'copper';
        if (id.includes('plastic') || id.includes('nylon') || id.includes('peek') || id.includes('delrin')) return 'plastics';
        if (id.includes('composite') || id.includes('carbon') || id.includes('cfrp')) return 'composites';
        return null;
    },
    // Get all material families and count
    getMaterialCount: function() {
        let count = 0;
        for (const family of Object.values(this.materialFamilies)) {
            if (family.specificMaterials) {
                count += Object.keys(family.specificMaterials).length;
            }
        }
        return count;
    },
    getAllMaterials: function() {
        const all = [];
        for (const [familyName, family] of Object.entries(this.materialFamilies)) {
            if (family.specificMaterials) {
                for (const [materialId, modifiers] of Object.entries(family.specificMaterials)) {
                    all.push({
                        id: materialId,
                        family: familyName,
                        ...family.defaultModifiers,
                        ...modifiers
                    });
                }
            }
        }
        return all;
    }
}