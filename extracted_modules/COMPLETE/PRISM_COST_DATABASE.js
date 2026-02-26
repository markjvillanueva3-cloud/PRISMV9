const PRISM_COST_DATABASE = {
    version: '1.0.0',
    lastUpdated: '2025-01-01',

    // SECTION 1: MACHINE COST FACTORS
    // Based on Total Cost of Ownership (TCO) principles
    machineCosts: {
        // Hourly machine rates by category (fully burdened)
        // Formula: (Depreciation + Interest + Maintenance + Utilities + Floor Space) / Annual Operating Hours
        hourlyRates: {
            // VMC - Vertical Machining Centers
            vmc: {
                entry: { // Entry-level (Haas Mini Mill, Tormach, etc.)
                    purchasePrice: { min: 35000, max: 75000, typical: 55000 },
                    depreciationYears: 10,
                    annualMaintenance: 0.03, // 3% of purchase price
                    annualUtilities: 2400, // kWh cost
                    floorSpaceSqFt: 80,
                    floorSpaceCostPerSqFt: 15, // per month
                    annualOperatingHours: 2000,
                    hourlyRate: { min: 25, max: 45, typical: 35 },
                    setupMultiplier: 1.5 // Setup time costs 1.5x run time
                },
                tier2: { // Mid-range (Haas VF-2, DMG Mori M1, Mazak VCN)
                    purchasePrice: { min: 75000, max: 200000, typical: 125000 },
                    depreciationYears: 10,
                    annualMaintenance: 0.025,
                    annualUtilities: 4800,
                    floorSpaceSqFt: 150,
                    floorSpaceCostPerSqFt: 15,
                    annualOperatingHours: 4000,
                    hourlyRate: { min: 45, max: 85, typical: 65 },
                    setupMultiplier: 1.5
                },
                production: { // Production-grade (Haas VF-4SS, Mazak Variaxis, DMG Mori NHX)
                    purchasePrice: { min: 200000, max: 500000, typical: 350000 },
                    depreciationYears: 12,
                    annualMaintenance: 0.02,
                    annualUtilities: 7200,
                    floorSpaceSqFt: 250,
                    floorSpaceCostPerSqFt: 15,
                    annualOperatingHours: 5000,
                    hourlyRate: { min: 75, max: 125, typical: 95 },
                    setupMultiplier: 1.25
                },
                highPerformance: { // High-speed/5-axis (Makino, Kern, GF Mikron)
                    purchasePrice: { min: 400000, max: 1500000, typical: 750000 },
                    depreciationYears: 15,
                    annualMaintenance: 0.02,
                    annualUtilities: 12000,
                    floorSpaceSqFt: 400,
                    floorSpaceCostPerSqFt: 18,
                    annualOperatingHours: 5500,
                    hourlyRate: { min: 125, max: 250, typical: 175 },
                    setupMultiplier: 1.25
                }
            },
            // HMC - Horizontal Machining Centers
            hmc: {
                tier2: {
                    purchasePrice: { min: 250000, max: 600000, typical: 400000 },
                    depreciationYears: 12,
                    annualMaintenance: 0.02,
                    annualUtilities: 9600,
                    floorSpaceSqFt: 350,
                    floorSpaceCostPerSqFt: 15,
                    annualOperatingHours: 5500,
                    hourlyRate: { min: 85, max: 150, typical: 115 },
                    setupMultiplier: 1.25
                },
                production: {
                    purchasePrice: { min: 500000, max: 1200000, typical: 800000 },
                    depreciationYears: 15,
                    annualMaintenance: 0.018,
                    annualUtilities: 14400,
                    floorSpaceSqFt: 500,
                    floorSpaceCostPerSqFt: 15,
                    annualOperatingHours: 6000,
                    hourlyRate: { min: 135, max: 225, typical: 175 },
                    setupMultiplier: 1.15
                }
            },
            // CNC Lathes
            lathe: {
                entry: { // 2-axis basic
                    purchasePrice: { min: 30000, max: 60000, typical: 45000 },
                    depreciationYears: 10,
                    annualMaintenance: 0.025,
                    annualUtilities: 2000,
                    floorSpaceSqFt: 60,
                    floorSpaceCostPerSqFt: 15,
                    annualOperatingHours: 2000,
                    hourlyRate: { min: 25, max: 40, typical: 32 },
                    setupMultiplier: 1.5
                },
                tier2: { // Turning center with live tooling
                    purchasePrice: { min: 80000, max: 200000, typical: 140000 },
                    depreciationYears: 10,
                    annualMaintenance: 0.025,
                    annualUtilities: 4200,
                    floorSpaceSqFt: 120,
                    floorSpaceCostPerSqFt: 15,
                    annualOperatingHours: 4000,
                    hourlyRate: { min: 45, max: 80, typical: 60 },
                    setupMultiplier: 1.35
                },
                multiAxis: { // Y-axis, sub-spindle, B-axis
                    purchasePrice: { min: 200000, max: 600000, typical: 380000 },
                    depreciationYears: 12,
                    annualMaintenance: 0.02,
                    annualUtilities: 7200,
                    floorSpaceSqFt: 180,
                    floorSpaceCostPerSqFt: 15,
                    annualOperatingHours: 5000,
                    hourlyRate: { min: 75, max: 135, typical: 100 },
                    setupMultiplier: 1.25
                },
                swiss: { // Swiss-type automatic
                    purchasePrice: { min: 150000, max: 450000, typical: 280000 },
                    depreciationYears: 12,
                    annualMaintenance: 0.025,
                    annualUtilities: 4800,
                    floorSpaceSqFt: 80,
                    floorSpaceCostPerSqFt: 15,
                    annualOperatingHours: 5500,
                    hourlyRate: { min: 65, max: 120, typical: 85 },
                    setupMultiplier: 1.75 // Higher setup complexity
                }
            },
            // EDM Machines
            edm: {
                sinker: {
                    entry: {
                        purchasePrice: { min: 50000, max: 120000, typical: 80000 },
                        depreciationYears: 12,
                        annualMaintenance: 0.02,
                        annualUtilities: 3600,
                        floorSpaceSqFt: 80,
                        floorSpaceCostPerSqFt: 15,
                        annualOperatingHours: 3000,
                        hourlyRate: { min: 35, max: 60, typical: 45 },
                        setupMultiplier: 2.0 // Electrode setup intensive
                    },
                    tier2: {
                        purchasePrice: { min: 120000, max: 300000, typical: 200000 },
                        depreciationYears: 12,
                        annualMaintenance: 0.02,
                        annualUtilities: 6000,
                        floorSpaceSqFt: 120,
                        floorSpaceCostPerSqFt: 15,
                        annualOperatingHours: 4500,
                        hourlyRate: { min: 55, max: 95, typical: 72 },
                        setupMultiplier: 1.75
                    }
                },
                wire: {
                    entry: {
                        purchasePrice: { min: 80000, max: 150000, typical: 110000 },
                        depreciationYears: 10,
                        annualMaintenance: 0.025,
                        annualUtilities: 3000,
                        floorSpaceSqFt: 80,
                        floorSpaceCostPerSqFt: 15,
                        annualOperatingHours: 4000,
                        hourlyRate: { min: 35, max: 55, typical: 45 },
                        setupMultiplier: 1.5
                    },
                    tier2: {
                        purchasePrice: { min: 150000, max: 350000, typical: 240000 },
                        depreciationYears: 12,
                        annualMaintenance: 0.02,
                        annualUtilities: 4800,
                        floorSpaceSqFt: 100,
                        floorSpaceCostPerSqFt: 15,
                        annualOperatingHours: 5000,
                        hourlyRate: { min: 50, max: 85, typical: 65 },
                        setupMultiplier: 1.35
                    },
                    highPrecision: {
                        purchasePrice: { min: 300000, max: 700000, typical: 480000 },
                        depreciationYears: 15,
                        annualMaintenance: 0.018,
                        annualUtilities: 7200,
                        floorSpaceSqFt: 150,
                        floorSpaceCostPerSqFt: 18,
                        annualOperatingHours: 5500,
                        hourlyRate: { min: 85, max: 145, typical: 110 },
                        setupMultiplier: 1.25
                    }
                }
            },
            // Laser Cutting
            laser: {
                co2: {
                    entry: { // 2-4kW
                        purchasePrice: { min: 150000, max: 350000, typical: 250000 },
                        depreciationYears: 10,
                        annualMaintenance: 0.04, // Higher for CO2 (gas, mirrors, etc.)
                        annualUtilities: 18000,
                        floorSpaceSqFt: 400,
                        floorSpaceCostPerSqFt: 12,
                        annualOperatingHours: 4000,
                        hourlyRate: { min: 65, max: 110, typical: 85 },
                        setupMultiplier: 1.25
                    },
                    tier2: { // 4-6kW
                        purchasePrice: { min: 350000, max: 600000, typical: 450000 },
                        depreciationYears: 10,
                        annualMaintenance: 0.035,
                        annualUtilities: 24000,
                        floorSpaceSqFt: 600,
                        floorSpaceCostPerSqFt: 12,
                        annualOperatingHours: 5000,
                        hourlyRate: { min: 95, max: 150, typical: 120 },
                        setupMultiplier: 1.2
                    }
                },
                fiber: {
                    entry: { // 1-3kW
                        purchasePrice: { min: 100000, max: 250000, typical: 175000 },
                        depreciationYears: 12,
                        annualMaintenance: 0.02, // Lower maintenance than CO2
                        annualUtilities: 8000,
                        floorSpaceSqFt: 350,
                        floorSpaceCostPerSqFt: 12,
                        annualOperatingHours: 4500,
                        hourlyRate: { min: 45, max: 80, typical: 60 },
                        setupMultiplier: 1.2
                    },
                    tier2: { // 4-8kW
                        purchasePrice: { min: 250000, max: 500000, typical: 375000 },
                        depreciationYears: 12,
                        annualMaintenance: 0.02,
                        annualUtilities: 14000,
                        floorSpaceSqFt: 500,
                        floorSpaceCostPerSqFt: 12,
                        annualOperatingHours: 5500,
                        hourlyRate: { min: 70, max: 120, typical: 90 },
                        setupMultiplier: 1.15
                    },
                    highPower: { // 10-20kW+
                        purchasePrice: { min: 500000, max: 1200000, typical: 800000 },
                        depreciationYears: 12,
                        annualMaintenance: 0.025,
                        annualUtilities: 28000,
                        floorSpaceSqFt: 800,
                        floorSpaceCostPerSqFt: 12,
                        annualOperatingHours: 6000,
                        hourlyRate: { min: 120, max: 200, typical: 155 },
                        setupMultiplier: 1.1
                    }
                }
            },
            // Waterjet
            waterjet: {
                entry: { // Small format, single head
                    purchasePrice: { min: 60000, max: 150000, typical: 100000 },
                    depreciationYears: 10,
                    annualMaintenance: 0.05, // High maintenance (seals, nozzles)
                    annualUtilities: 6000,
                    floorSpaceSqFt: 200,
                    floorSpaceCostPerSqFt: 12,
                    annualOperatingHours: 3000,
                    hourlyRate: { min: 45, max: 75, typical: 58 },
                    setupMultiplier: 1.3
                },
                tier2: { // Mid-size, intensifier pump
                    purchasePrice: { min: 150000, max: 350000, typical: 240000 },
                    depreciationYears: 10,
                    annualMaintenance: 0.04,
                    annualUtilities: 12000,
                    floorSpaceSqFt: 400,
                    floorSpaceCostPerSqFt: 12,
                    annualOperatingHours: 4500,
                    hourlyRate: { min: 65, max: 110, typical: 85 },
                    setupMultiplier: 1.2
                },
                production: { // Large format, multi-head
                    purchasePrice: { min: 350000, max: 800000, typical: 550000 },
                    depreciationYears: 12,
                    annualMaintenance: 0.035,
                    annualUtilities: 24000,
                    floorSpaceSqFt: 800,
                    floorSpaceCostPerSqFt: 12,
                    annualOperatingHours: 5500,
                    hourlyRate: { min: 95, max: 160, typical: 125 },
                    setupMultiplier: 1.15
                }
            }
        },
        // Overall Equipment Effectiveness (OEE) factors
        oeeFactors: {
            availability: { // % of scheduled time machine is available
                worldClass: 0.90,
                typical: 0.80,
                poor: 0.65,
                factors: ['breakdowns', 'setup', 'adjustments', 'toolChanges']
            },
            performance: { // % of theoretical max speed
                worldClass: 0.95,
                typical: 0.85,
                poor: 0.70,
                factors: ['reducedSpeed', 'minorStops', 'idling']
            },
            quality: { // % of good parts
                worldClass: 0.99,
                typical: 0.95,
                poor: 0.85,
                factors: ['defects', 'rework', 'scrap', 'startupRejects',
            { id: 'harvey_843_0015_0023_2fl', name: '0.015" 2FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-015', type: 'endmill_square', diameter: 0.015, flutes: 2, loc: 0.023, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 1666667, process: 'milling', geometry: { volume: 4, surfaceArea: 46, units: "mm3/mm2" } },
            { id: 'harvey_843_002_003_2fl', name: '0.020" 2FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-020', type: 'endmill_square', diameter: 0.02, flutes: 2, loc: 0.03, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 1250000, process: 'milling', geometry: { volume: 8, surfaceArea: 61, units: "mm3/mm2" } },
            { id: 'harvey_843_0031_0047_2fl', name: '1/32" 2FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-031', type: 'endmill_square', diameter: 0.031, flutes: 2, loc: 0.047, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 806452, process: 'milling', geometry: { volume: 18, surfaceArea: 95, units: "mm3/mm2" } },
            { id: 'harvey_843_0047_007_2fl', name: '3/64" 2FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-047', type: 'endmill_square', diameter: 0.047, flutes: 2, loc: 0.07, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 531915, process: 'milling', geometry: { volume: 42, surfaceArea: 145, units: "mm3/mm2" } },
            { id: 'harvey_843_0062_0093_4fl', name: '1/16" 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-062', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.093, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 403226, process: 'milling', geometry: { volume: 73, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'harvey_843_0078_0117_4fl', name: '5/64" 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-078', type: 'endmill_square', diameter: 0.078, flutes: 4, loc: 0.117, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 320513, process: 'milling', geometry: { volume: 115, surfaceArea: 243, units: "mm3/mm2" } },
            { id: 'harvey_843_0093_014_4fl', name: '3/32" 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-093', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.14, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 268817, process: 'milling', geometry: { volume: 162, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'harvey_843_0109_0164_4fl', name: '7/64" 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-109', type: 'endmill_square', diameter: 0.109, flutes: 4, loc: 0.164, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 229358, process: 'milling', geometry: { volume: 222, surfaceArea: 343, units: "mm3/mm2" } },
            { id: 'harvey_843_0125_025_4fl', name: '1/8" Stub 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.25, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 200000, process: 'milling', geometry: { volume: 287, surfaceArea: 396, units: "mm3/mm2" } },
            { id: 'harvey_843_0125_05_4fl', name: '1/8" Std 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 200000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'harvey_843_0125_075_4fl', name: '1/8" Long 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.75, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 200000, process: 'milling', geometry: { volume: 458, surfaceArea: 649, units: "mm3/mm2" } },
            { id: 'harvey_843_0156_0312_4fl', name: '5/32" 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-156', type: 'endmill_square', diameter: 0.156, flutes: 4, loc: 0.312, oal: 2, coating: 'AlTiN', material: 'carbide', shank: 0.156, maxRpm: 160256, process: 'milling', geometry: { volume: 597, surfaceArea: 657, units: "mm3/mm2" } },
            { id: 'harvey_843_0187_0375_4fl', name: '3/16" Stub 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.375, oal: 2, coating: 'AlTiN', material: 'carbide', shank: 0.187, maxRpm: 133690, process: 'milling', geometry: { volume: 849, surfaceArea: 793, units: "mm3/mm2" } },
            { id: 'harvey_843_0187_0562_4fl', name: '3/16" Std 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.187, maxRpm: 133690, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'harvey_843_0187_0937_4fl', name: '3/16" Long 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.937, oal: 3, coating: 'AlTiN', material: 'carbide', shank: 0.187, maxRpm: 133690, process: 'milling', geometry: { volume: 1224, surfaceArea: 1172, units: "mm3/mm2" } },
            { id: 'harvey_843_0218_0437_4fl', name: '7/32" 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-218', type: 'endmill_square', diameter: 0.218, flutes: 4, loc: 0.437, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.218, maxRpm: 114679, process: 'milling', geometry: { volume: 1449, surfaceArea: 1153, units: "mm3/mm2" } },
            { id: 'harvey_843_025_0375_4fl', name: '1/4" Stub 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.375, oal: 2, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 100000, process: 'milling', geometry: { volume: 1518, surfaceArea: 1077, units: "mm3/mm2" } },
            { id: 'harvey_843_025_075_4fl', name: '1/4" Std 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 100000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'harvey_843_025_125_4fl', name: '1/4" Long 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 1.25, oal: 3, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 100000, process: 'milling', geometry: { volume: 2112, surfaceArea: 1583, units: "mm3/mm2" } },
            { id: 'harvey_843_025_15_4fl', name: '1/4" XL 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 1.5, oal: 4, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 100000, process: 'milling', geometry: { volume: 2856, surfaceArea: 2090, units: "mm3/mm2" } },
            { id: 'harvey_843_0312_05_4fl', name: '5/16" Stub 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.5, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.312, maxRpm: 80128, process: 'milling', geometry: { volume: 2944, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'harvey_843_0312_0937_4fl', name: '5/16" Std 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.312, maxRpm: 80128, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'harvey_843_0312_15_4fl', name: '5/16" Long 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 1.5, oal: 3.5, coating: 'AlTiN', material: 'carbide', shank: 0.312, maxRpm: 80128, process: 'milling', geometry: { volume: 3821, surfaceArea: 2312, units: "mm3/mm2" } },
            { id: 'harvey_843_0375_05_4fl', name: '3/8" Stub 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 0.5, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.375, maxRpm: 66667, process: 'milling', geometry: { volume: 4253, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'harvey_843_0375_1_4fl', name: '3/8" Std 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.375, maxRpm: 66667, process: 'milling', geometry: { volume: 3982, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'harvey_843_0375_175_4fl', name: '3/8" Long 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.75, oal: 4, coating: 'AlTiN', material: 'carbide', shank: 0.375, maxRpm: 66667, process: 'milling', geometry: { volume: 6289, surfaceArea: 3183, units: "mm3/mm2" } },
            { id: 'harvey_843_0437_1125_4fl', name: '7/16" 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-437', type: 'endmill_square', diameter: 0.437, flutes: 4, loc: 1.125, oal: 3, coating: 'AlTiN', material: 'carbide', shank: 0.437, maxRpm: 57208, process: 'milling', geometry: { volume: 6544, surfaceArea: 2851, units: "mm3/mm2" } },
            { id: 'harvey_843_05_0625_4fl', name: '1/2" Stub 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 0.625, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 7441, surfaceArea: 2787, units: "mm3/mm2" } },
            { id: 'harvey_843_05_125_4fl', name: '1/2" Std 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'harvey_843_05_2_4fl', name: '1/2" Long 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 2, oal: 4, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 10940, surfaceArea: 4307, units: "mm3/mm2" } },
            { id: 'harvey_843_05_3_4fl', name: '1/2" XL 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 3, oal: 5, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 13192, surfaceArea: 5320, units: "mm3/mm2" } },
            { id: 'harvey_843_0562_1375_4fl', name: '9/16" 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-562', type: 'endmill_square', diameter: 0.562, flutes: 4, loc: 1.375, oal: 3.5, coating: 'AlTiN', material: 'carbide', shank: 0.562, maxRpm: 44484, process: 'milling', geometry: { volume: 12551, surfaceArea: 4307, units: "mm3/mm2" } },
            { id: 'harvey_843_0625_075_4fl', name: '5/8" Stub 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 0.75, oal: 3, coating: 'AlTiN', material: 'carbide', shank: 0.625, maxRpm: 40000, process: 'milling', geometry: { volume: 13951, surfaceArea: 4196, units: "mm3/mm2" } },
            { id: 'harvey_843_0625_15_4fl', name: '5/8" Std 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.5, oal: 3.5, coating: 'AlTiN', material: 'carbide', shank: 0.625, maxRpm: 40000, process: 'milling', geometry: { volume: 15334, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'harvey_843_0625_25_4fl', name: '5/8" Long 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 2.5, oal: 5, coating: 'AlTiN', material: 'carbide', shank: 0.625, maxRpm: 40000, process: 'milling', geometry: { volume: 21367, surfaceArea: 6730, units: "mm3/mm2" } },
            { id: 'harvey_843_075_1_4fl', name: '3/4" Stub 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1, oal: 3.5, coating: 'AlTiN', material: 'carbide', shank: 0.75, maxRpm: 33333, process: 'milling', geometry: { volume: 23167, surfaceArea: 5890, units: "mm3/mm2" } },
            { id: 'harvey_843_075_15_4fl', name: '3/4" Std 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'AlTiN', material: 'carbide', shank: 0.75, maxRpm: 33333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'harvey_843_075_3_4fl', name: '3/4" Long 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 3, oal: 5.5, coating: 'AlTiN', material: 'carbide', shank: 0.75, maxRpm: 33333, process: 'milling', geometry: { volume: 33302, surfaceArea: 8931, units: "mm3/mm2" } },
            { id: 'harvey_843_0875_175_4fl', name: '7/8" 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-875', type: 'endmill_square', diameter: 0.875, flutes: 4, loc: 1.75, oal: 4, coating: 'AlTiN', material: 'carbide', shank: 0.875, maxRpm: 28571, process: 'milling', geometry: { volume: 34242, surfaceArea: 7870, units: "mm3/mm2" } },
            { id: 'harvey_843_1_125_4fl', name: '1" Stub 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 1.25, oal: 4, coating: 'AlTiN', material: 'carbide', shank: 1, maxRpm: 25000, process: 'milling', geometry: { volume: 46655, surfaceArea: 9121, units: "mm3/mm2" } },
            { id: 'harvey_843_1_2_4fl', name: '1" Std 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'AlTiN', material: 'carbide', shank: 1, maxRpm: 25000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'harvey_843_1_3_4fl', name: '1" Long 4FL Square EM', manufacturer: 'Harvey Tool', series: '843', partNumber: '843-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 3, oal: 6, coating: 'AlTiN', material: 'carbide', shank: 1, maxRpm: 25000, process: 'milling', geometry: { volume: 65639, surfaceArea: 13174, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_0015_2fl', name: '0.015" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-015', type: 'endmill_ball', diameter: 0.015, flutes: 2, loc: 0.023, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 2000000, process: 'milling', geometry: { volume: 4, surfaceArea: 46, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_0031_2fl', name: '1/32" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-031', type: 'endmill_ball', diameter: 0.031, flutes: 2, loc: 0.047, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 967742, process: 'milling', geometry: { volume: 18, surfaceArea: 95, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_0047_2fl', name: '3/64" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-047', type: 'endmill_ball', diameter: 0.047, flutes: 2, loc: 0.07, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 638298, process: 'milling', geometry: { volume: 42, surfaceArea: 145, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_0062_2fl', name: '1/16" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-062', type: 'endmill_ball', diameter: 0.062, flutes: 2, loc: 0.093, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 483871, process: 'milling', geometry: { volume: 73, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_0093_2fl', name: '3/32" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-093', type: 'endmill_ball', diameter: 0.093, flutes: 2, loc: 0.187, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 322581, process: 'milling', geometry: { volume: 161, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_0125_2fl', name: '1/8" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-125', type: 'endmill_ball', diameter: 0.125, flutes: 2, loc: 0.25, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 240000, process: 'milling', geometry: { volume: 287, surfaceArea: 396, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_0187_2fl', name: '3/16" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-187', type: 'endmill_ball', diameter: 0.187, flutes: 2, loc: 0.375, oal: 2, coating: 'AlTiN', material: 'carbide', shank: 0.187, maxRpm: 160428, process: 'milling', geometry: { volume: 849, surfaceArea: 793, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_025_2fl', name: '1/4" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-250', type: 'endmill_ball', diameter: 0.25, flutes: 2, loc: 0.5, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 120000, process: 'milling', geometry: { volume: 1890, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_0312_2fl', name: '5/16" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-312', type: 'endmill_ball', diameter: 0.312, flutes: 2, loc: 0.625, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.312, maxRpm: 96154, process: 'milling', geometry: { volume: 2897, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_0375_2fl', name: '3/8" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-375', type: 'endmill_ball', diameter: 0.375, flutes: 2, loc: 0.75, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.375, maxRpm: 80000, process: 'milling', geometry: { volume: 4118, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_05_2fl', name: '1/2" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-500', type: 'endmill_ball', diameter: 0.5, flutes: 2, loc: 1, oal: 3, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 60000, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_0625_2fl', name: '5/8" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-625', type: 'endmill_ball', diameter: 0.625, flutes: 2, loc: 1.25, oal: 3.5, coating: 'AlTiN', material: 'carbide', shank: 0.625, maxRpm: 48000, process: 'milling', geometry: { volume: 15711, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_075_2fl', name: '3/4" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-750', type: 'endmill_ball', diameter: 0.75, flutes: 2, loc: 1.5, oal: 4, coating: 'AlTiN', material: 'carbide', shank: 0.75, maxRpm: 40000, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'harvey_844_ball_1_2fl', name: '1" 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '844', partNumber: '844-1000', type: 'endmill_ball', diameter: 1, flutes: 2, loc: 2, oal: 4.5, coating: 'AlTiN', material: 'carbide', shank: 1, maxRpm: 30000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'harvey_cr_0125_0005_4fl', name: '1/8" × 0.005R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-125-CR5', type: 'endmill_corner_radius', diameter: 0.125, flutes: 4, loc: 0.25, oal: 1.5, cornerRadius: 0.005, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 200000, process: 'milling', geometry: { volume: 287, surfaceArea: 396, units: "mm3/mm2" } },
            { id: 'harvey_cr_0125_001_4fl', name: '1/8" × 0.010R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-125-CR10', type: 'endmill_corner_radius', diameter: 0.125, flutes: 4, loc: 0.25, oal: 1.5, cornerRadius: 0.01, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 200000, process: 'milling', geometry: { volume: 287, surfaceArea: 396, units: "mm3/mm2" } },
            { id: 'harvey_cr_0187_001_4fl', name: '3/16" × 0.010R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-187-CR10', type: 'endmill_corner_radius', diameter: 0.187, flutes: 4, loc: 0.375, oal: 2, cornerRadius: 0.01, coating: 'AlTiN', material: 'carbide', shank: 0.187, maxRpm: 133690, process: 'milling', geometry: { volume: 849, surfaceArea: 793, units: "mm3/mm2" } },
            { id: 'harvey_cr_0187_0015_4fl', name: '3/16" × 0.015R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-187-CR15', type: 'endmill_corner_radius', diameter: 0.187, flutes: 4, loc: 0.375, oal: 2, cornerRadius: 0.015, coating: 'AlTiN', material: 'carbide', shank: 0.187, maxRpm: 133690, process: 'milling', geometry: { volume: 849, surfaceArea: 793, units: "mm3/mm2" } },
            { id: 'harvey_cr_025_001_4fl', name: '1/4" × 0.010R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-250-CR10', type: 'endmill_corner_radius', diameter: 0.25, flutes: 4, loc: 0.5, oal: 2.5, cornerRadius: 0.01, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 100000, process: 'milling', geometry: { volume: 1890, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'harvey_cr_025_0015_4fl', name: '1/4" × 0.015R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-250-CR15', type: 'endmill_corner_radius', diameter: 0.25, flutes: 4, loc: 0.5, oal: 2.5, cornerRadius: 0.015, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 100000, process: 'milling', geometry: { volume: 1890, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'harvey_cr_025_0031_4fl', name: '1/4" × 0.031R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-250-CR31', type: 'endmill_corner_radius', diameter: 0.25, flutes: 4, loc: 0.5, oal: 2.5, cornerRadius: 0.031, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 100000, process: 'milling', geometry: { volume: 1890, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'harvey_cr_0312_0015_4fl', name: '5/16" × 0.015R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-312-CR15', type: 'endmill_corner_radius', diameter: 0.312, flutes: 4, loc: 0.625, oal: 2.5, cornerRadius: 0.015, coating: 'AlTiN', material: 'carbide', shank: 0.312, maxRpm: 80128, process: 'milling', geometry: { volume: 2897, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'harvey_cr_0312_0031_4fl', name: '5/16" × 0.031R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-312-CR31', type: 'endmill_corner_radius', diameter: 0.312, flutes: 4, loc: 0.625, oal: 2.5, cornerRadius: 0.031, coating: 'AlTiN', material: 'carbide', shank: 0.312, maxRpm: 80128, process: 'milling', geometry: { volume: 2897, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'harvey_cr_0375_0015_4fl', name: '3/8" × 0.015R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-375-CR15', type: 'endmill_corner_radius', diameter: 0.375, flutes: 4, loc: 0.75, oal: 2.5, cornerRadius: 0.015, coating: 'AlTiN', material: 'carbide', shank: 0.375, maxRpm: 66667, process: 'milling', geometry: { volume: 4118, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'harvey_cr_0375_0031_4fl', name: '3/8" × 0.031R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-375-CR31', type: 'endmill_corner_radius', diameter: 0.375, flutes: 4, loc: 0.75, oal: 2.5, cornerRadius: 0.031, coating: 'AlTiN', material: 'carbide', shank: 0.375, maxRpm: 66667, process: 'milling', geometry: { volume: 4118, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'harvey_cr_0375_0062_4fl', name: '3/8" × 0.062R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-375-CR62', type: 'endmill_corner_radius', diameter: 0.375, flutes: 4, loc: 0.75, oal: 2.5, cornerRadius: 0.062, coating: 'AlTiN', material: 'carbide', shank: 0.375, maxRpm: 66667, process: 'milling', geometry: { volume: 4118, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'harvey_cr_05_0015_4fl', name: '1/2" × 0.015R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-500-CR15', type: 'endmill_corner_radius', diameter: 0.5, flutes: 4, loc: 1, oal: 3, cornerRadius: 0.015, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'harvey_cr_05_0031_4fl', name: '1/2" × 0.031R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-500-CR31', type: 'endmill_corner_radius', diameter: 0.5, flutes: 4, loc: 1, oal: 3, cornerRadius: 0.031, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'harvey_cr_05_0062_4fl', name: '1/2" × 0.062R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-500-CR62', type: 'endmill_corner_radius', diameter: 0.5, flutes: 4, loc: 1, oal: 3, cornerRadius: 0.062, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'harvey_cr_05_0125_4fl', name: '1/2" × 0.125R 4FL Corner Radius', manufacturer: 'Harvey Tool', series: '836', partNumber: '836-500-CR125', type: 'endmill_corner_radius', diameter: 0.5, flutes: 4, loc: 1, oal: 3, cornerRadius: 0.125, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'helical_h35al_0125_3fl', name: '2/16" 3FL Aluminum', manufacturer: 'Helical Solutions', series: 'H35AL', partNumber: 'H35AL-S-30125', type: 'endmill_square', diameter: 0.125, flutes: 3, loc: 0.375, oal: 2, coating: 'ZrN', material: 'carbide', shank: 0.125, maxRpm: 320000, process: 'milling', geometry: { volume: 380, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'helical_h35al_0187_3fl', name: '3/16" 3FL Aluminum', manufacturer: 'Helical Solutions', series: 'H35AL', partNumber: 'H35AL-S-30187', type: 'endmill_square', diameter: 0.187, flutes: 3, loc: 0.562, oal: 2.5, coating: 'ZrN', material: 'carbide', shank: 0.187, maxRpm: 213904, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'helical_h35al_025_3fl', name: '1/4" 3FL Aluminum', manufacturer: 'Helical Solutions', series: 'H35AL', partNumber: 'H35AL-S-30250', type: 'endmill_square', diameter: 0.25, flutes: 3, loc: 0.75, oal: 2.5, coating: 'ZrN', material: 'carbide', shank: 0.25, maxRpm: 160000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'helical_h35al_0312_3fl', name: '1/4" 3FL Aluminum', manufacturer: 'Helical Solutions', series: 'H35AL', partNumber: 'H35AL-S-30312', type: 'endmill_square', diameter: 0.312, flutes: 3, loc: 0.937, oal: 2.5, coating: 'ZrN', material: 'carbide', shank: 0.312, maxRpm: 128205, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'helical_h35al_0375_3fl', name: '2/4" 3FL Aluminum', manufacturer: 'Helical Solutions', series: 'H35AL', partNumber: 'H35AL-S-30375', type: 'endmill_square', diameter: 0.375, flutes: 3, loc: 1.125, oal: 2.5, coating: 'ZrN', material: 'carbide', shank: 0.375, maxRpm: 106667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'helical_h35al_05_3fl', name: '4/8" 3FL Aluminum', manufacturer: 'Helical Solutions', series: 'H35AL', partNumber: 'H35AL-S-30500', type: 'endmill_square', diameter: 0.5, flutes: 3, loc: 1.25, oal: 3, coating: 'ZrN', material: 'carbide', shank: 0.5, maxRpm: 80000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'helical_h35al_0625_3fl', name: '5/8" 3FL Aluminum', manufacturer: 'Helical Solutions', series: 'H35AL', partNumber: 'H35AL-S-30625', type: 'endmill_square', diameter: 0.625, flutes: 3, loc: 1.562, oal: 3.5, coating: 'ZrN', material: 'carbide', shank: 0.625, maxRpm: 64000, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'helical_h35al_075_3fl', name: '6/8" 3FL Aluminum', manufacturer: 'Helical Solutions', series: 'H35AL', partNumber: 'H35AL-S-30750', type: 'endmill_square', diameter: 0.75, flutes: 3, loc: 1.5, oal: 4, coating: 'ZrN', material: 'carbide', shank: 0.75, maxRpm: 53333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'helical_h35al_1_3fl', name: '1" 3FL Aluminum', manufacturer: 'Helical Solutions', series: 'H35AL', partNumber: 'H35AL-S-301000', type: 'endmill_square', diameter: 1, flutes: 3, loc: 2, oal: 4.5, coating: 'ZrN', material: 'carbide', shank: 1, maxRpm: 40000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'helical_h40s_0062_0187_4fl', name: '0.062" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40062-19', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 403226, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'helical_h40s_0093_0281_4fl', name: '0.093" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40093-28', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 268817, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'helical_h40s_0125_0375_4fl', name: '0.125" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40125-38', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.375, oal: 2, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 200000, process: 'milling', geometry: { volume: 380, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'helical_h40s_0156_0468_4fl', name: '0.156" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40156-47', type: 'endmill_square', diameter: 0.156, flutes: 4, loc: 0.468, oal: 2, coating: 'AlTiN', material: 'carbide', shank: 0.156, maxRpm: 160256, process: 'milling', geometry: { volume: 582, surfaceArea: 657, units: "mm3/mm2" } },
            { id: 'helical_h40s_0187_0562_4fl', name: '0.187" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40187-56', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.187, maxRpm: 133690, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'helical_h40s_025_0625_4fl', name: '0.25" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40250-63', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.625, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 100000, process: 'milling', geometry: { volume: 1860, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'helical_h40s_025_075_4fl', name: '0.25" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40250-75', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 100000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'helical_h40s_025_1_4fl', name: '0.25" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40250-100', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 1, oal: 3, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 100000, process: 'milling', geometry: { volume: 2172, surfaceArea: 1583, units: "mm3/mm2" } },
            { id: 'helical_h40s_0312_0781_4fl', name: '0.312" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40312-78', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.781, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.312, maxRpm: 80128, process: 'milling', geometry: { volume: 2839, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'helical_h40s_0312_125_4fl', name: '0.312" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40312-125', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 1.25, oal: 3.5, coating: 'AlTiN', material: 'carbide', shank: 0.312, maxRpm: 80128, process: 'milling', geometry: { volume: 3915, surfaceArea: 2312, units: "mm3/mm2" } },
            { id: 'helical_h40s_0375_0875_4fl', name: '0.375" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40375-88', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 0.875, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.375, maxRpm: 66667, process: 'milling', geometry: { volume: 4050, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'helical_h40s_0375_15_4fl', name: '0.375" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40375-150', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.5, oal: 4, coating: 'AlTiN', material: 'carbide', shank: 0.375, maxRpm: 66667, process: 'milling', geometry: { volume: 6425, surfaceArea: 3183, units: "mm3/mm2" } },
            { id: 'helical_h40s_05_1_4fl', name: '0.5" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40500-100', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1, oal: 3, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'helical_h40s_05_15_4fl', name: '0.5" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40500-150', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.5, oal: 3.5, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 9814, surfaceArea: 3800, units: "mm3/mm2" } },
            { id: 'helical_h40s_05_2_4fl', name: '0.5" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40500-200', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 2, oal: 4.5, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 12549, surfaceArea: 4814, units: "mm3/mm2" } },
            { id: 'helical_h40s_0625_125_4fl', name: '0.625" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40625-125', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.25, oal: 3.5, coating: 'AlTiN', material: 'carbide', shank: 0.625, maxRpm: 40000, process: 'milling', geometry: { volume: 15711, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'helical_h40s_0625_2_4fl', name: '0.625" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40625-200', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 2, oal: 4.5, coating: 'AlTiN', material: 'carbide', shank: 0.625, maxRpm: 40000, process: 'milling', geometry: { volume: 19607, surfaceArea: 6096, units: "mm3/mm2" } },
            { id: 'helical_h40s_075_15_4fl', name: '0.75" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40750-150', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'AlTiN', material: 'carbide', shank: 0.75, maxRpm: 33333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'helical_h40s_075_225_4fl', name: '0.75" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-40750-225', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 2.25, oal: 5, coating: 'AlTiN', material: 'carbide', shank: 0.75, maxRpm: 33333, process: 'milling', geometry: { volume: 31311, surfaceArea: 8171, units: "mm3/mm2" } },
            { id: 'helical_h40s_1_2_4fl', name: '1" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-401000-200', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'AlTiN', material: 'carbide', shank: 1, maxRpm: 25000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'helical_h40s_1_3_4fl', name: '1" 4FL Steel', manufacturer: 'Helical Solutions', series: 'H40S', partNumber: 'H40S-S-401000-300', type: 'endmill_square', diameter: 1, flutes: 4, loc: 3, oal: 6, coating: 'AlTiN', material: 'carbide', shank: 1, maxRpm: 25000, process: 'milling', geometry: { volume: 65639, surfaceArea: 13174, units: "mm3/mm2" } },
            { id: 'helical_h45hv_0062_0187_4fl', name: '0.062" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-062', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'nACo', material: 'carbide', shank: 0.125, maxRpm: 322581, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'helical_h45hv_0093_0281_4fl', name: '0.093" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-093', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'nACo', material: 'carbide', shank: 0.125, maxRpm: 215054, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'helical_h45hv_0125_0375_4fl', name: '0.125" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.375, oal: 2, coating: 'nACo', material: 'carbide', shank: 0.125, maxRpm: 160000, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 380, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'helical_h45hv_0156_0468_4fl', name: '0.156" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-156', type: 'endmill_square', diameter: 0.156, flutes: 4, loc: 0.468, oal: 2, coating: 'nACo', material: 'carbide', shank: 0.156, maxRpm: 128205, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 582, surfaceArea: 657, units: "mm3/mm2" } },
            { id: 'helical_h45hv_0187_0562_4fl', name: '0.187" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'nACo', material: 'carbide', shank: 0.187, maxRpm: 106952, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'helical_h45hv_025_0625_4fl', name: '0.25" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.625, oal: 2.5, coating: 'nACo', material: 'carbide', shank: 0.25, maxRpm: 80000, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 1860, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'helical_h45hv_025_075_4fl', name: '0.25" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'nACo', material: 'carbide', shank: 0.25, maxRpm: 80000, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'helical_h45hv_025_1_4fl', name: '0.25" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 1, oal: 3, coating: 'nACo', material: 'carbide', shank: 0.25, maxRpm: 80000, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 2172, surfaceArea: 1583, units: "mm3/mm2" } },
            { id: 'helical_h45hv_0312_0781_4fl', name: '0.312" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.781, oal: 2.5, coating: 'nACo', material: 'carbide', shank: 0.312, maxRpm: 64103, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 2839, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'helical_h45hv_0312_125_4fl', name: '0.312" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 1.25, oal: 3.5, coating: 'nACo', material: 'carbide', shank: 0.312, maxRpm: 64103, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 3915, surfaceArea: 2312, units: "mm3/mm2" } },
            { id: 'helical_h45hv_0375_0875_4fl', name: '0.375" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 0.875, oal: 2.5, coating: 'nACo', material: 'carbide', shank: 0.375, maxRpm: 53333, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 4050, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'helical_h45hv_0375_15_4fl', name: '0.375" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.5, oal: 4, coating: 'nACo', material: 'carbide', shank: 0.375, maxRpm: 53333, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 6425, surfaceArea: 3183, units: "mm3/mm2" } },
            { id: 'helical_h45hv_05_1_4fl', name: '0.5" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1, oal: 3, coating: 'nACo', material: 'carbide', shank: 0.5, maxRpm: 40000, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'helical_h45hv_05_15_4fl', name: '0.5" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.5, oal: 3.5, coating: 'nACo', material: 'carbide', shank: 0.5, maxRpm: 40000, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 9814, surfaceArea: 3800, units: "mm3/mm2" } },
            { id: 'helical_h45hv_05_2_4fl', name: '0.5" 4FL Hardened Steel', manufacturer: 'Helical Solutions', series: 'H45HV', partNumber: 'H45HV-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 2, oal: 4.5, coating: 'nACo', material: 'carbide', shank: 0.5, maxRpm: 40000, hardnessRange: '45-65 HRC', process: 'milling', geometry: { volume: 12549, surfaceArea: 4814, units: "mm3/mm2" } },
            { id: 'ken_harvite_0125_4fl', name: '1/8" 4FL HARVI I TE', manufacturer: 'Kennametal', series: 'HARVI I TE', partNumber: 'E013A4W', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.375, oal: 2, coating: 'KC633M', material: 'carbide', shank: 0.125, maxRpm: 224000, process: 'milling', geometry: { volume: 380, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'ken_harvite_0156_4fl', name: '5/32" 4FL HARVI I TE', manufacturer: 'Kennametal', series: 'HARVI I TE', partNumber: 'E016A4W', type: 'endmill_square', diameter: 0.156, flutes: 4, loc: 0.468, oal: 2, coating: 'KC633M', material: 'carbide', shank: 0.156, maxRpm: 179487, process: 'milling', geometry: { volume: 582, surfaceArea: 657, units: "mm3/mm2" } },
            { id: 'ken_harvite_0187_4fl', name: '3/16" 4FL HARVI I TE', manufacturer: 'Kennametal', series: 'HARVI I TE', partNumber: 'E019A4W', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'KC633M', material: 'carbide', shank: 0.187, maxRpm: 149733, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'ken_harvite_025_4fl', name: '1/4" 4FL HARVI I TE', manufacturer: 'Kennametal', series: 'HARVI I TE', partNumber: 'E025A4W', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'KC633M', material: 'carbide', shank: 0.25, maxRpm: 112000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'ken_harvite_0312_4fl', name: '5/16" 4FL HARVI I TE', manufacturer: 'Kennametal', series: 'HARVI I TE', partNumber: 'E031A4W', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'KC633M', material: 'carbide', shank: 0.312, maxRpm: 89744, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'ken_harvite_0375_4fl', name: '3/8" 4FL HARVI I TE', manufacturer: 'Kennametal', series: 'HARVI I TE', partNumber: 'E038A4W', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'KC633M', material: 'carbide', shank: 0.375, maxRpm: 74667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'ken_harvite_05_4fl', name: '1/2" 4FL HARVI I TE', manufacturer: 'Kennametal', series: 'HARVI I TE', partNumber: 'E050A4W', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'KC633M', material: 'carbide', shank: 0.5, maxRpm: 56000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'ken_harvite_0625_4fl', name: '5/8" 4FL HARVI I TE', manufacturer: 'Kennametal', series: 'HARVI I TE', partNumber: 'E063A4W', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'KC633M', material: 'carbide', shank: 0.625, maxRpm: 44800, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'ken_harvite_075_4fl', name: '3/4" 4FL HARVI I TE', manufacturer: 'Kennametal', series: 'HARVI I TE', partNumber: 'E075A4W', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'KC633M', material: 'carbide', shank: 0.75, maxRpm: 37333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'ken_harvite_1_4fl', name: '1" 4FL HARVI I TE', manufacturer: 'Kennametal', series: 'HARVI I TE', partNumber: 'E100A4W', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'KC633M', material: 'carbide', shank: 1, maxRpm: 28000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'ken_harvii_0125_4fl', name: '1/8" 4FL HARVI II', manufacturer: 'Kennametal', series: 'HARVI II', partNumber: 'E2013A4', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.375, oal: 2, coating: 'KC643M', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 240000, process: 'milling', geometry: { volume: 380, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'ken_harvii_0156_4fl', name: '5/32" 4FL HARVI II', manufacturer: 'Kennametal', series: 'HARVI II', partNumber: 'E2016A4', type: 'endmill_square', diameter: 0.156, flutes: 4, loc: 0.468, oal: 2, coating: 'KC643M', material: 'carbide', shank: 0.156, variableHelix: true, maxRpm: 192308, process: 'milling', geometry: { volume: 582, surfaceArea: 657, units: "mm3/mm2" } },
            { id: 'ken_harvii_0187_4fl', name: '3/16" 4FL HARVI II', manufacturer: 'Kennametal', series: 'HARVI II', partNumber: 'E2019A4', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'KC643M', material: 'carbide', shank: 0.187, variableHelix: true, maxRpm: 160428, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'ken_harvii_025_4fl', name: '1/4" 4FL HARVI II', manufacturer: 'Kennametal', series: 'HARVI II', partNumber: 'E2025A4', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'KC643M', material: 'carbide', shank: 0.25, variableHelix: true, maxRpm: 120000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'ken_harvii_0312_4fl', name: '5/16" 4FL HARVI II', manufacturer: 'Kennametal', series: 'HARVI II', partNumber: 'E2031A4', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'KC643M', material: 'carbide', shank: 0.312, variableHelix: true, maxRpm: 96154, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'ken_harvii_0375_4fl', name: '3/8" 4FL HARVI II', manufacturer: 'Kennametal', series: 'HARVI II', partNumber: 'E2038A4', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'KC643M', material: 'carbide', shank: 0.375, variableHelix: true, maxRpm: 80000, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'ken_harvii_05_4fl', name: '1/2" 4FL HARVI II', manufacturer: 'Kennametal', series: 'HARVI II', partNumber: 'E2050A4', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'KC643M', material: 'carbide', shank: 0.5, variableHelix: true, maxRpm: 60000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'ken_harvii_0625_4fl', name: '5/8" 4FL HARVI II', manufacturer: 'Kennametal', series: 'HARVI II', partNumber: 'E2063A4', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'KC643M', material: 'carbide', shank: 0.625, variableHelix: true, maxRpm: 48000, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'ken_harvii_075_4fl', name: '3/4" 4FL HARVI II', manufacturer: 'Kennametal', series: 'HARVI II', partNumber: 'E2075A4', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'KC643M', material: 'carbide', shank: 0.75, variableHelix: true, maxRpm: 40000, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'ken_harvii_1_4fl', name: '1" 4FL HARVI II', manufacturer: 'Kennametal', series: 'HARVI II', partNumber: 'E2100A4', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'KC643M', material: 'carbide', shank: 1, variableHelix: true, maxRpm: 30000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'ken_harviii_0125_5fl', name: '1/8" 5FL HARVI III', manufacturer: 'Kennametal', series: 'HARVI III', partNumber: 'E3013A5', type: 'endmill_square', diameter: 0.125, flutes: 5, loc: 0.375, oal: 2, coating: 'KCPM40', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 176000, targetMaterial: 'Titanium/Stainless', process: 'milling', geometry: { volume: 380, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'ken_harviii_0156_5fl', name: '5/32" 5FL HARVI III', manufacturer: 'Kennametal', series: 'HARVI III', partNumber: 'E3016A5', type: 'endmill_square', diameter: 0.156, flutes: 5, loc: 0.468, oal: 2, coating: 'KCPM40', material: 'carbide', shank: 0.156, variableHelix: true, maxRpm: 141026, targetMaterial: 'Titanium/Stainless', process: 'milling', geometry: { volume: 582, surfaceArea: 657, units: "mm3/mm2" } },
            { id: 'ken_harviii_0187_5fl', name: '3/16" 5FL HARVI III', manufacturer: 'Kennametal', series: 'HARVI III', partNumber: 'E3019A5', type: 'endmill_square', diameter: 0.187, flutes: 5, loc: 0.562, oal: 2.5, coating: 'KCPM40', material: 'carbide', shank: 0.187, variableHelix: true, maxRpm: 117647, targetMaterial: 'Titanium/Stainless', process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'ken_harviii_025_5fl', name: '1/4" 5FL HARVI III', manufacturer: 'Kennametal', series: 'HARVI III', partNumber: 'E3025A5', type: 'endmill_square', diameter: 0.25, flutes: 5, loc: 0.75, oal: 2.5, coating: 'KCPM40', material: 'carbide', shank: 0.25, variableHelix: true, maxRpm: 88000, targetMaterial: 'Titanium/Stainless', process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'ken_harviii_0312_5fl', name: '5/16" 5FL HARVI III', manufacturer: 'Kennametal', series: 'HARVI III', partNumber: 'E3031A5', type: 'endmill_square', diameter: 0.312, flutes: 5, loc: 0.937, oal: 2.5, coating: 'KCPM40', material: 'carbide', shank: 0.312, variableHelix: true, maxRpm: 70513, targetMaterial: 'Titanium/Stainless', process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'ken_harviii_0375_5fl', name: '3/8" 5FL HARVI III', manufacturer: 'Kennametal', series: 'HARVI III', partNumber: 'E3038A5', type: 'endmill_square', diameter: 0.375, flutes: 5, loc: 1.125, oal: 2.5, coating: 'KCPM40', material: 'carbide', shank: 0.375, variableHelix: true, maxRpm: 58667, targetMaterial: 'Titanium/Stainless', process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'ken_harviii_05_5fl', name: '1/2" 5FL HARVI III', manufacturer: 'Kennametal', series: 'HARVI III', partNumber: 'E3050A5', type: 'endmill_square', diameter: 0.5, flutes: 5, loc: 1.25, oal: 3, coating: 'KCPM40', material: 'carbide', shank: 0.5, variableHelix: true, maxRpm: 44000, targetMaterial: 'Titanium/Stainless', process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'ken_harviii_0625_5fl', name: '5/8" 5FL HARVI III', manufacturer: 'Kennametal', series: 'HARVI III', partNumber: 'E3063A5', type: 'endmill_square', diameter: 0.625, flutes: 5, loc: 1.562, oal: 3.5, coating: 'KCPM40', material: 'carbide', shank: 0.625, variableHelix: true, maxRpm: 35200, targetMaterial: 'Titanium/Stainless', process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'ken_harviii_075_5fl', name: '3/4" 5FL HARVI III', manufacturer: 'Kennametal', series: 'HARVI III', partNumber: 'E3075A5', type: 'endmill_square', diameter: 0.75, flutes: 5, loc: 1.5, oal: 4, coating: 'KCPM40', material: 'carbide', shank: 0.75, variableHelix: true, maxRpm: 29333, targetMaterial: 'Titanium/Stainless', process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'ken_harviii_1_5fl', name: '1" 5FL HARVI III', manufacturer: 'Kennametal', series: 'HARVI III', partNumber: 'E3100A5', type: 'endmill_square', diameter: 1, flutes: 5, loc: 2, oal: 4.5, coating: 'KCPM40', material: 'carbide', shank: 1, variableHelix: true, maxRpm: 22000, targetMaterial: 'Titanium/Stainless', process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'osg_asft_0062_4fl', name: '0.062" 4FL A-SFT', manufacturer: 'OSG', series: 'A-SFT', partNumber: 'A-SFT-62', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'WXL', material: 'carbide', shank: 0.125, maxRpm: 451613, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'osg_asft_0093_4fl', name: '0.093" 4FL A-SFT', manufacturer: 'OSG', series: 'A-SFT', partNumber: 'A-SFT-93', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'WXL', material: 'carbide', shank: 0.125, maxRpm: 301075, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'osg_asft_0125_4fl', name: '0.125" 4FL A-SFT', manufacturer: 'OSG', series: 'A-SFT', partNumber: 'A-SFT-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'WXL', material: 'carbide', shank: 0.125, maxRpm: 224000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'osg_asft_0187_4fl', name: '0.187" 4FL A-SFT', manufacturer: 'OSG', series: 'A-SFT', partNumber: 'A-SFT-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'WXL', material: 'carbide', shank: 0.187, maxRpm: 149733, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'osg_asft_025_4fl', name: '0.25" 4FL A-SFT', manufacturer: 'OSG', series: 'A-SFT', partNumber: 'A-SFT-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'WXL', material: 'carbide', shank: 0.25, maxRpm: 112000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'osg_asft_0312_4fl', name: '0.312" 4FL A-SFT', manufacturer: 'OSG', series: 'A-SFT', partNumber: 'A-SFT-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'WXL', material: 'carbide', shank: 0.312, maxRpm: 89744, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'osg_asft_0375_4fl', name: '0.375" 4FL A-SFT', manufacturer: 'OSG', series: 'A-SFT', partNumber: 'A-SFT-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'WXL', material: 'carbide', shank: 0.375, maxRpm: 74667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'osg_asft_05_4fl', name: '0.5" 4FL A-SFT', manufacturer: 'OSG', series: 'A-SFT', partNumber: 'A-SFT-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'WXL', material: 'carbide', shank: 0.5, maxRpm: 56000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'osg_asft_0625_4fl', name: '0.625" 4FL A-SFT', manufacturer: 'OSG', series: 'A-SFT', partNumber: 'A-SFT-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'WXL', material: 'carbide', shank: 0.625, maxRpm: 44800, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'osg_asft_075_4fl', name: '0.75" 4FL A-SFT', manufacturer: 'OSG', series: 'A-SFT', partNumber: 'A-SFT-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'WXL', material: 'carbide', shank: 0.75, maxRpm: 37333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'osg_asft_1_4fl', name: '1" 4FL A-SFT', manufacturer: 'OSG', series: 'A-SFT', partNumber: 'A-SFT-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'WXL', material: 'carbide', shank: 1, maxRpm: 28000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'osg_aero_0062_3fl', name: '0.062" 3FL AERO Aluminum', manufacturer: 'OSG', series: 'AERO', partNumber: 'AERO-62', type: 'endmill_square', diameter: 0.062, flutes: 3, loc: 0.187, oal: 1.5, coating: 'DLC', material: 'carbide', shank: 0.125, polished: true, maxRpm: 725806, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'osg_aero_0093_3fl', name: '0.093" 3FL AERO Aluminum', manufacturer: 'OSG', series: 'AERO', partNumber: 'AERO-93', type: 'endmill_square', diameter: 0.093, flutes: 3, loc: 0.281, oal: 1.5, coating: 'DLC', material: 'carbide', shank: 0.125, polished: true, maxRpm: 483871, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'osg_aero_0125_3fl', name: '0.125" 3FL AERO Aluminum', manufacturer: 'OSG', series: 'AERO', partNumber: 'AERO-125', type: 'endmill_square', diameter: 0.125, flutes: 3, loc: 0.5, oal: 2, coating: 'DLC', material: 'carbide', shank: 0.125, polished: true, maxRpm: 360000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'osg_aero_0187_3fl', name: '0.187" 3FL AERO Aluminum', manufacturer: 'OSG', series: 'AERO', partNumber: 'AERO-187', type: 'endmill_square', diameter: 0.187, flutes: 3, loc: 0.562, oal: 2.5, coating: 'DLC', material: 'carbide', shank: 0.187, polished: true, maxRpm: 240642, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'osg_aero_025_3fl', name: '0.25" 3FL AERO Aluminum', manufacturer: 'OSG', series: 'AERO', partNumber: 'AERO-250', type: 'endmill_square', diameter: 0.25, flutes: 3, loc: 0.75, oal: 2.5, coating: 'DLC', material: 'carbide', shank: 0.25, polished: true, maxRpm: 180000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'osg_aero_0312_3fl', name: '0.312" 3FL AERO Aluminum', manufacturer: 'OSG', series: 'AERO', partNumber: 'AERO-312', type: 'endmill_square', diameter: 0.312, flutes: 3, loc: 0.937, oal: 2.5, coating: 'DLC', material: 'carbide', shank: 0.312, polished: true, maxRpm: 144231, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'osg_aero_0375_3fl', name: '0.375" 3FL AERO Aluminum', manufacturer: 'OSG', series: 'AERO', partNumber: 'AERO-375', type: 'endmill_square', diameter: 0.375, flutes: 3, loc: 1.125, oal: 2.5, coating: 'DLC', material: 'carbide', shank: 0.375, polished: true, maxRpm: 120000, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'osg_aero_05_3fl', name: '0.5" 3FL AERO Aluminum', manufacturer: 'OSG', series: 'AERO', partNumber: 'AERO-500', type: 'endmill_square', diameter: 0.5, flutes: 3, loc: 1.25, oal: 3, coating: 'DLC', material: 'carbide', shank: 0.5, polished: true, maxRpm: 90000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'osg_aero_0625_3fl', name: '0.625" 3FL AERO Aluminum', manufacturer: 'OSG', series: 'AERO', partNumber: 'AERO-625', type: 'endmill_square', diameter: 0.625, flutes: 3, loc: 1.562, oal: 3.5, coating: 'DLC', material: 'carbide', shank: 0.625, polished: true, maxRpm: 72000, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'osg_aero_075_3fl', name: '0.75" 3FL AERO Aluminum', manufacturer: 'OSG', series: 'AERO', partNumber: 'AERO-750', type: 'endmill_square', diameter: 0.75, flutes: 3, loc: 1.5, oal: 4, coating: 'DLC', material: 'carbide', shank: 0.75, polished: true, maxRpm: 60000, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'osg_aero_1_3fl', name: '1" 3FL AERO Aluminum', manufacturer: 'OSG', series: 'AERO', partNumber: 'AERO-1000', type: 'endmill_square', diameter: 1, flutes: 3, loc: 2, oal: 4.5, coating: 'DLC', material: 'carbide', shank: 1, polished: true, maxRpm: 45000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'osg_hypro_vgm_0062_4fl', name: '0.062" 4FL HY-PRO VGM', manufacturer: 'OSG', series: 'HY-PRO CARB VGM', partNumber: 'VGM-62', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'WXS', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 516129, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'osg_hypro_vgm_0093_4fl', name: '0.093" 4FL HY-PRO VGM', manufacturer: 'OSG', series: 'HY-PRO CARB VGM', partNumber: 'VGM-93', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'WXS', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 344086, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'osg_hypro_vgm_0125_4fl', name: '0.125" 4FL HY-PRO VGM', manufacturer: 'OSG', series: 'HY-PRO CARB VGM', partNumber: 'VGM-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'WXS', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 256000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'osg_hypro_vgm_0187_4fl', name: '0.187" 4FL HY-PRO VGM', manufacturer: 'OSG', series: 'HY-PRO CARB VGM', partNumber: 'VGM-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'WXS', material: 'carbide', shank: 0.187, variableHelix: true, maxRpm: 171123, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'osg_hypro_vgm_025_4fl', name: '0.25" 4FL HY-PRO VGM', manufacturer: 'OSG', series: 'HY-PRO CARB VGM', partNumber: 'VGM-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'WXS', material: 'carbide', shank: 0.25, variableHelix: true, maxRpm: 128000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'osg_hypro_vgm_0312_4fl', name: '0.312" 4FL HY-PRO VGM', manufacturer: 'OSG', series: 'HY-PRO CARB VGM', partNumber: 'VGM-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'WXS', material: 'carbide', shank: 0.312, variableHelix: true, maxRpm: 102564, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'osg_hypro_vgm_0375_4fl', name: '0.375" 4FL HY-PRO VGM', manufacturer: 'OSG', series: 'HY-PRO CARB VGM', partNumber: 'VGM-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'WXS', material: 'carbide', shank: 0.375, variableHelix: true, maxRpm: 85333, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'osg_hypro_vgm_05_4fl', name: '0.5" 4FL HY-PRO VGM', manufacturer: 'OSG', series: 'HY-PRO CARB VGM', partNumber: 'VGM-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'WXS', material: 'carbide', shank: 0.5, variableHelix: true, maxRpm: 64000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'osg_hypro_vgm_0625_4fl', name: '0.625" 4FL HY-PRO VGM', manufacturer: 'OSG', series: 'HY-PRO CARB VGM', partNumber: 'VGM-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'WXS', material: 'carbide', shank: 0.625, variableHelix: true, maxRpm: 51200, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'osg_hypro_vgm_075_4fl', name: '0.75" 4FL HY-PRO VGM', manufacturer: 'OSG', series: 'HY-PRO CARB VGM', partNumber: 'VGM-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'WXS', material: 'carbide', shank: 0.75, variableHelix: true, maxRpm: 42667, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'osg_hypro_vgm_1_4fl', name: '1" 4FL HY-PRO VGM', manufacturer: 'OSG', series: 'HY-PRO CARB VGM', partNumber: 'VGM-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'WXS', material: 'carbide', shank: 1, variableHelix: true, maxRpm: 32000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'yg1_x5070_0062_4fl', name: '0.062" 4FL X5070', manufacturer: 'YG-1', series: 'X5070', partNumber: 'X5070-62', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 419355, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'yg1_x5070_0093_4fl', name: '0.093" 4FL X5070', manufacturer: 'YG-1', series: 'X5070', partNumber: 'X5070-93', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 279570, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'yg1_x5070_0125_4fl', name: '0.125" 4FL X5070', manufacturer: 'YG-1', series: 'X5070', partNumber: 'X5070-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 208000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'yg1_x5070_0187_4fl', name: '0.187" 4FL X5070', manufacturer: 'YG-1', series: 'X5070', partNumber: 'X5070-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.187, maxRpm: 139037, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'yg1_x5070_025_4fl', name: '0.25" 4FL X5070', manufacturer: 'YG-1', series: 'X5070', partNumber: 'X5070-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.25, maxRpm: 104000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'yg1_x5070_0312_4fl', name: '0.312" 4FL X5070', manufacturer: 'YG-1', series: 'X5070', partNumber: 'X5070-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.312, maxRpm: 83333, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'yg1_x5070_0375_4fl', name: '0.375" 4FL X5070', manufacturer: 'YG-1', series: 'X5070', partNumber: 'X5070-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 69333, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'yg1_x5070_05_4fl', name: '0.5" 4FL X5070', manufacturer: 'YG-1', series: 'X5070', partNumber: 'X5070-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 52000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'yg1_x5070_0625_4fl', name: '0.625" 4FL X5070', manufacturer: 'YG-1', series: 'X5070', partNumber: 'X5070-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'TiAlN', material: 'carbide', shank: 0.625, maxRpm: 41600, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'yg1_x5070_075_4fl', name: '0.75" 4FL X5070', manufacturer: 'YG-1', series: 'X5070', partNumber: 'X5070-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 34667, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'yg1_x5070_1_4fl', name: '1" 4FL X5070', manufacturer: 'YG-1', series: 'X5070', partNumber: 'X5070-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 26000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'yg1_v7plus_0062_4fl', name: '0.062" 4FL V7 Plus', manufacturer: 'YG-1', series: 'V7 Plus', partNumber: 'V7P-62', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'Ti-Namite X', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 483871, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'yg1_v7plus_0093_4fl', name: '0.093" 4FL V7 Plus', manufacturer: 'YG-1', series: 'V7 Plus', partNumber: 'V7P-93', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'Ti-Namite X', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 322581, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'yg1_v7plus_0125_4fl', name: '0.125" 4FL V7 Plus', manufacturer: 'YG-1', series: 'V7 Plus', partNumber: 'V7P-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'Ti-Namite X', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 240000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'yg1_v7plus_0187_4fl', name: '0.187" 4FL V7 Plus', manufacturer: 'YG-1', series: 'V7 Plus', partNumber: 'V7P-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'Ti-Namite X', material: 'carbide', shank: 0.187, variableHelix: true, maxRpm: 160428, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'yg1_v7plus_025_4fl', name: '0.25" 4FL V7 Plus', manufacturer: 'YG-1', series: 'V7 Plus', partNumber: 'V7P-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'Ti-Namite X', material: 'carbide', shank: 0.25, variableHelix: true, maxRpm: 120000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'yg1_v7plus_0312_4fl', name: '0.312" 4FL V7 Plus', manufacturer: 'YG-1', series: 'V7 Plus', partNumber: 'V7P-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'Ti-Namite X', material: 'carbide', shank: 0.312, variableHelix: true, maxRpm: 96154, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'yg1_v7plus_0375_4fl', name: '0.375" 4FL V7 Plus', manufacturer: 'YG-1', series: 'V7 Plus', partNumber: 'V7P-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'Ti-Namite X', material: 'carbide', shank: 0.375, variableHelix: true, maxRpm: 80000, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'yg1_v7plus_05_4fl', name: '0.5" 4FL V7 Plus', manufacturer: 'YG-1', series: 'V7 Plus', partNumber: 'V7P-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'Ti-Namite X', material: 'carbide', shank: 0.5, variableHelix: true, maxRpm: 60000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'yg1_v7plus_0625_4fl', name: '0.625" 4FL V7 Plus', manufacturer: 'YG-1', series: 'V7 Plus', partNumber: 'V7P-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'Ti-Namite X', material: 'carbide', shank: 0.625, variableHelix: true, maxRpm: 48000, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'yg1_v7plus_075_4fl', name: '0.75" 4FL V7 Plus', manufacturer: 'YG-1', series: 'V7 Plus', partNumber: 'V7P-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'Ti-Namite X', material: 'carbide', shank: 0.75, variableHelix: true, maxRpm: 40000, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'yg1_v7plus_1_4fl', name: '1" 4FL V7 Plus', manufacturer: 'YG-1', series: 'V7 Plus', partNumber: 'V7P-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'Ti-Namite X', material: 'carbide', shank: 1, variableHelix: true, maxRpm: 30000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'imco_prfplus_0062_4fl', name: '0.062" 4FL Pow-R-Feed Plus', manufacturer: 'IMCO Carbide', series: 'Pow-R-Feed Plus', partNumber: 'PRFP-62', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'M Plus', material: 'carbide', shank: 0.125, maxRpm: 451613, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'imco_prfplus_0093_4fl', name: '0.093" 4FL Pow-R-Feed Plus', manufacturer: 'IMCO Carbide', series: 'Pow-R-Feed Plus', partNumber: 'PRFP-93', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'M Plus', material: 'carbide', shank: 0.125, maxRpm: 301075, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'imco_prfplus_0125_4fl', name: '0.125" 4FL Pow-R-Feed Plus', manufacturer: 'IMCO Carbide', series: 'Pow-R-Feed Plus', partNumber: 'PRFP-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'M Plus', material: 'carbide', shank: 0.125, maxRpm: 224000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'imco_prfplus_0187_4fl', name: '0.187" 4FL Pow-R-Feed Plus', manufacturer: 'IMCO Carbide', series: 'Pow-R-Feed Plus', partNumber: 'PRFP-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'M Plus', material: 'carbide', shank: 0.187, maxRpm: 149733, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'imco_prfplus_025_4fl', name: '0.25" 4FL Pow-R-Feed Plus', manufacturer: 'IMCO Carbide', series: 'Pow-R-Feed Plus', partNumber: 'PRFP-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'M Plus', material: 'carbide', shank: 0.25, maxRpm: 112000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'imco_prfplus_0312_4fl', name: '0.312" 4FL Pow-R-Feed Plus', manufacturer: 'IMCO Carbide', series: 'Pow-R-Feed Plus', partNumber: 'PRFP-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'M Plus', material: 'carbide', shank: 0.312, maxRpm: 89744, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'imco_prfplus_0375_4fl', name: '0.375" 4FL Pow-R-Feed Plus', manufacturer: 'IMCO Carbide', series: 'Pow-R-Feed Plus', partNumber: 'PRFP-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'M Plus', material: 'carbide', shank: 0.375, maxRpm: 74667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'imco_prfplus_05_4fl', name: '0.5" 4FL Pow-R-Feed Plus', manufacturer: 'IMCO Carbide', series: 'Pow-R-Feed Plus', partNumber: 'PRFP-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'M Plus', material: 'carbide', shank: 0.5, maxRpm: 56000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'imco_prfplus_0625_4fl', name: '0.625" 4FL Pow-R-Feed Plus', manufacturer: 'IMCO Carbide', series: 'Pow-R-Feed Plus', partNumber: 'PRFP-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'M Plus', material: 'carbide', shank: 0.625, maxRpm: 44800, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'imco_prfplus_075_4fl', name: '0.75" 4FL Pow-R-Feed Plus', manufacturer: 'IMCO Carbide', series: 'Pow-R-Feed Plus', partNumber: 'PRFP-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'M Plus', material: 'carbide', shank: 0.75, maxRpm: 37333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'imco_prfplus_1_4fl', name: '1" 4FL Pow-R-Feed Plus', manufacturer: 'IMCO Carbide', series: 'Pow-R-Feed Plus', partNumber: 'PRFP-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'M Plus', material: 'carbide', shank: 1, maxRpm: 28000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'sgs_zcarb_hta_0062_4fl', name: '0.062" 4FL Z-Carb HTA', manufacturer: 'SGS Tool', series: 'Z-Carb HTA', partNumber: 'ZHT-62', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'Ti-NAMITE-A', material: 'carbide', shank: 0.125, maxRpm: 483871, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'sgs_zcarb_hta_0093_4fl', name: '0.093" 4FL Z-Carb HTA', manufacturer: 'SGS Tool', series: 'Z-Carb HTA', partNumber: 'ZHT-93', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'Ti-NAMITE-A', material: 'carbide', shank: 0.125, maxRpm: 322581, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'sgs_zcarb_hta_0125_4fl', name: '0.125" 4FL Z-Carb HTA', manufacturer: 'SGS Tool', series: 'Z-Carb HTA', partNumber: 'ZHT-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'Ti-NAMITE-A', material: 'carbide', shank: 0.125, maxRpm: 240000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'sgs_zcarb_hta_0187_4fl', name: '0.187" 4FL Z-Carb HTA', manufacturer: 'SGS Tool', series: 'Z-Carb HTA', partNumber: 'ZHT-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'Ti-NAMITE-A', material: 'carbide', shank: 0.187, maxRpm: 160428, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'sgs_zcarb_hta_025_4fl', name: '0.25" 4FL Z-Carb HTA', manufacturer: 'SGS Tool', series: 'Z-Carb HTA', partNumber: 'ZHT-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'Ti-NAMITE-A', material: 'carbide', shank: 0.25, maxRpm: 120000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'sgs_zcarb_hta_0312_4fl', name: '0.312" 4FL Z-Carb HTA', manufacturer: 'SGS Tool', series: 'Z-Carb HTA', partNumber: 'ZHT-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'Ti-NAMITE-A', material: 'carbide', shank: 0.312, maxRpm: 96154, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'sgs_zcarb_hta_0375_4fl', name: '0.375" 4FL Z-Carb HTA', manufacturer: 'SGS Tool', series: 'Z-Carb HTA', partNumber: 'ZHT-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'Ti-NAMITE-A', material: 'carbide', shank: 0.375, maxRpm: 80000, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'sgs_zcarb_hta_05_4fl', name: '0.5" 4FL Z-Carb HTA', manufacturer: 'SGS Tool', series: 'Z-Carb HTA', partNumber: 'ZHT-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'Ti-NAMITE-A', material: 'carbide', shank: 0.5, maxRpm: 60000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'sgs_zcarb_hta_0625_4fl', name: '0.625" 4FL Z-Carb HTA', manufacturer: 'SGS Tool', series: 'Z-Carb HTA', partNumber: 'ZHT-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'Ti-NAMITE-A', material: 'carbide', shank: 0.625, maxRpm: 48000, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'sgs_zcarb_hta_075_4fl', name: '0.75" 4FL Z-Carb HTA', manufacturer: 'SGS Tool', series: 'Z-Carb HTA', partNumber: 'ZHT-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'Ti-NAMITE-A', material: 'carbide', shank: 0.75, maxRpm: 40000, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'sgs_zcarb_hta_1_4fl', name: '1" 4FL Z-Carb HTA', manufacturer: 'SGS Tool', series: 'Z-Carb HTA', partNumber: 'ZHT-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'Ti-NAMITE-A', material: 'carbide', shank: 1, maxRpm: 30000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'sgs_scarb_0062_4fl', name: '0.062" 4FL S-Carb Stainless', manufacturer: 'SGS Tool', series: 'S-Carb', partNumber: 'SC-62', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'Ti-NAMITE-M', material: 'carbide', shank: 0.125, targetMaterial: 'Stainless Steel', maxRpm: 387097, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'sgs_scarb_0093_4fl', name: '0.093" 4FL S-Carb Stainless', manufacturer: 'SGS Tool', series: 'S-Carb', partNumber: 'SC-93', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'Ti-NAMITE-M', material: 'carbide', shank: 0.125, targetMaterial: 'Stainless Steel', maxRpm: 258065, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'sgs_scarb_0125_4fl', name: '0.125" 4FL S-Carb Stainless', manufacturer: 'SGS Tool', series: 'S-Carb', partNumber: 'SC-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'Ti-NAMITE-M', material: 'carbide', shank: 0.125, targetMaterial: 'Stainless Steel', maxRpm: 192000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'sgs_scarb_0187_4fl', name: '0.187" 4FL S-Carb Stainless', manufacturer: 'SGS Tool', series: 'S-Carb', partNumber: 'SC-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'Ti-NAMITE-M', material: 'carbide', shank: 0.187, targetMaterial: 'Stainless Steel', maxRpm: 128342, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'sgs_scarb_025_4fl', name: '0.25" 4FL S-Carb Stainless', manufacturer: 'SGS Tool', series: 'S-Carb', partNumber: 'SC-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'Ti-NAMITE-M', material: 'carbide', shank: 0.25, targetMaterial: 'Stainless Steel', maxRpm: 96000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'sgs_scarb_0312_4fl', name: '0.312" 4FL S-Carb Stainless', manufacturer: 'SGS Tool', series: 'S-Carb', partNumber: 'SC-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'Ti-NAMITE-M', material: 'carbide', shank: 0.312, targetMaterial: 'Stainless Steel', maxRpm: 76923, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'sgs_scarb_0375_4fl', name: '0.375" 4FL S-Carb Stainless', manufacturer: 'SGS Tool', series: 'S-Carb', partNumber: 'SC-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'Ti-NAMITE-M', material: 'carbide', shank: 0.375, targetMaterial: 'Stainless Steel', maxRpm: 64000, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'sgs_scarb_05_4fl', name: '0.5" 4FL S-Carb Stainless', manufacturer: 'SGS Tool', series: 'S-Carb', partNumber: 'SC-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'Ti-NAMITE-M', material: 'carbide', shank: 0.5, targetMaterial: 'Stainless Steel', maxRpm: 48000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'sgs_scarb_0625_4fl', name: '0.625" 4FL S-Carb Stainless', manufacturer: 'SGS Tool', series: 'S-Carb', partNumber: 'SC-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'Ti-NAMITE-M', material: 'carbide', shank: 0.625, targetMaterial: 'Stainless Steel', maxRpm: 38400, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'sgs_scarb_075_4fl', name: '0.75" 4FL S-Carb Stainless', manufacturer: 'SGS Tool', series: 'S-Carb', partNumber: 'SC-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'Ti-NAMITE-M', material: 'carbide', shank: 0.75, targetMaterial: 'Stainless Steel', maxRpm: 32000, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'sgs_scarb_1_4fl', name: '1" 4FL S-Carb Stainless', manufacturer: 'SGS Tool', series: 'S-Carb', partNumber: 'SC-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'Ti-NAMITE-M', material: 'carbide', shank: 1, targetMaterial: 'Stainless Steel', maxRpm: 24000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'widia_varimill_0062_4fl', name: '0.062" 4FL VariMill', manufacturer: 'WIDIA', series: 'VariMill', partNumber: 'VM-62', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'WS15PE', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 451613, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'widia_varimill_0093_4fl', name: '0.093" 4FL VariMill', manufacturer: 'WIDIA', series: 'VariMill', partNumber: 'VM-93', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'WS15PE', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 301075, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'widia_varimill_0125_4fl', name: '0.125" 4FL VariMill', manufacturer: 'WIDIA', series: 'VariMill', partNumber: 'VM-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'WS15PE', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 224000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'widia_varimill_0187_4fl', name: '0.187" 4FL VariMill', manufacturer: 'WIDIA', series: 'VariMill', partNumber: 'VM-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'WS15PE', material: 'carbide', shank: 0.187, variableHelix: true, maxRpm: 149733, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'widia_varimill_025_4fl', name: '0.25" 4FL VariMill', manufacturer: 'WIDIA', series: 'VariMill', partNumber: 'VM-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'WS15PE', material: 'carbide', shank: 0.25, variableHelix: true, maxRpm: 112000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'widia_varimill_0312_4fl', name: '0.312" 4FL VariMill', manufacturer: 'WIDIA', series: 'VariMill', partNumber: 'VM-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'WS15PE', material: 'carbide', shank: 0.312, variableHelix: true, maxRpm: 89744, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'widia_varimill_0375_4fl', name: '0.375" 4FL VariMill', manufacturer: 'WIDIA', series: 'VariMill', partNumber: 'VM-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'WS15PE', material: 'carbide', shank: 0.375, variableHelix: true, maxRpm: 74667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'widia_varimill_05_4fl', name: '0.5" 4FL VariMill', manufacturer: 'WIDIA', series: 'VariMill', partNumber: 'VM-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'WS15PE', material: 'carbide', shank: 0.5, variableHelix: true, maxRpm: 56000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'widia_varimill_0625_4fl', name: '0.625" 4FL VariMill', manufacturer: 'WIDIA', series: 'VariMill', partNumber: 'VM-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'WS15PE', material: 'carbide', shank: 0.625, variableHelix: true, maxRpm: 44800, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'widia_varimill_075_4fl', name: '0.75" 4FL VariMill', manufacturer: 'WIDIA', series: 'VariMill', partNumber: 'VM-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'WS15PE', material: 'carbide', shank: 0.75, variableHelix: true, maxRpm: 37333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'widia_varimill_1_4fl', name: '1" 4FL VariMill', manufacturer: 'WIDIA', series: 'VariMill', partNumber: 'VM-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'WS15PE', material: 'carbide', shank: 1, variableHelix: true, maxRpm: 28000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'widia_varimill2_0062_4fl', name: '0.062" 4FL VariMill II ER', manufacturer: 'WIDIA', series: 'VariMill II ER', partNumber: 'VM2ER-62', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'WU25PR', material: 'carbide', shank: 0.125, variableHelix: true, eccentric: true, maxRpm: 516129, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'widia_varimill2_0093_4fl', name: '0.093" 4FL VariMill II ER', manufacturer: 'WIDIA', series: 'VariMill II ER', partNumber: 'VM2ER-93', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'WU25PR', material: 'carbide', shank: 0.125, variableHelix: true, eccentric: true, maxRpm: 344086, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'widia_varimill2_0125_4fl', name: '0.125" 4FL VariMill II ER', manufacturer: 'WIDIA', series: 'VariMill II ER', partNumber: 'VM2ER-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'WU25PR', material: 'carbide', shank: 0.125, variableHelix: true, eccentric: true, maxRpm: 256000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'widia_varimill2_0187_4fl', name: '0.187" 4FL VariMill II ER', manufacturer: 'WIDIA', series: 'VariMill II ER', partNumber: 'VM2ER-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'WU25PR', material: 'carbide', shank: 0.187, variableHelix: true, eccentric: true, maxRpm: 171123, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'widia_varimill2_025_4fl', name: '0.25" 4FL VariMill II ER', manufacturer: 'WIDIA', series: 'VariMill II ER', partNumber: 'VM2ER-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'WU25PR', material: 'carbide', shank: 0.25, variableHelix: true, eccentric: true, maxRpm: 128000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'widia_varimill2_0312_4fl', name: '0.312" 4FL VariMill II ER', manufacturer: 'WIDIA', series: 'VariMill II ER', partNumber: 'VM2ER-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'WU25PR', material: 'carbide', shank: 0.312, variableHelix: true, eccentric: true, maxRpm: 102564, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'widia_varimill2_0375_4fl', name: '0.375" 4FL VariMill II ER', manufacturer: 'WIDIA', series: 'VariMill II ER', partNumber: 'VM2ER-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'WU25PR', material: 'carbide', shank: 0.375, variableHelix: true, eccentric: true, maxRpm: 85333, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'widia_varimill2_05_4fl', name: '0.5" 4FL VariMill II ER', manufacturer: 'WIDIA', series: 'VariMill II ER', partNumber: 'VM2ER-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'WU25PR', material: 'carbide', shank: 0.5, variableHelix: true, eccentric: true, maxRpm: 64000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'widia_varimill2_0625_4fl', name: '0.625" 4FL VariMill II ER', manufacturer: 'WIDIA', series: 'VariMill II ER', partNumber: 'VM2ER-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'WU25PR', material: 'carbide', shank: 0.625, variableHelix: true, eccentric: true, maxRpm: 51200, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'widia_varimill2_075_4fl', name: '0.75" 4FL VariMill II ER', manufacturer: 'WIDIA', series: 'VariMill II ER', partNumber: 'VM2ER-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'WU25PR', material: 'carbide', shank: 0.75, variableHelix: true, eccentric: true, maxRpm: 42667, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'widia_varimill2_1_4fl', name: '1" 4FL VariMill II ER', manufacturer: 'WIDIA', series: 'VariMill II ER', partNumber: 'VM2ER-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'WU25PR', material: 'carbide', shank: 1, variableHelix: true, eccentric: true, maxRpm: 32000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'ingersoll_goldtwist_0062_4fl', name: '0.062" 4FL GoldTwist', manufacturer: 'Ingersoll', series: 'GoldTwist', partNumber: 'GT-62', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'Gold TiN', material: 'carbide', shank: 0.125, maxRpm: 419355, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'ingersoll_goldtwist_0093_4fl', name: '0.093" 4FL GoldTwist', manufacturer: 'Ingersoll', series: 'GoldTwist', partNumber: 'GT-93', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'Gold TiN', material: 'carbide', shank: 0.125, maxRpm: 279570, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'ingersoll_goldtwist_0125_4fl', name: '0.125" 4FL GoldTwist', manufacturer: 'Ingersoll', series: 'GoldTwist', partNumber: 'GT-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'Gold TiN', material: 'carbide', shank: 0.125, maxRpm: 208000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'ingersoll_goldtwist_0187_4fl', name: '0.187" 4FL GoldTwist', manufacturer: 'Ingersoll', series: 'GoldTwist', partNumber: 'GT-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'Gold TiN', material: 'carbide', shank: 0.187, maxRpm: 139037, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'ingersoll_goldtwist_025_4fl', name: '0.25" 4FL GoldTwist', manufacturer: 'Ingersoll', series: 'GoldTwist', partNumber: 'GT-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'Gold TiN', material: 'carbide', shank: 0.25, maxRpm: 104000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'ingersoll_goldtwist_0312_4fl', name: '0.312" 4FL GoldTwist', manufacturer: 'Ingersoll', series: 'GoldTwist', partNumber: 'GT-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'Gold TiN', material: 'carbide', shank: 0.312, maxRpm: 83333, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'ingersoll_goldtwist_0375_4fl', name: '0.375" 4FL GoldTwist', manufacturer: 'Ingersoll', series: 'GoldTwist', partNumber: 'GT-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'Gold TiN', material: 'carbide', shank: 0.375, maxRpm: 69333, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'ingersoll_goldtwist_05_4fl', name: '0.5" 4FL GoldTwist', manufacturer: 'Ingersoll', series: 'GoldTwist', partNumber: 'GT-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'Gold TiN', material: 'carbide', shank: 0.5, maxRpm: 52000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'ingersoll_goldtwist_0625_4fl', name: '0.625" 4FL GoldTwist', manufacturer: 'Ingersoll', series: 'GoldTwist', partNumber: 'GT-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'Gold TiN', material: 'carbide', shank: 0.625, maxRpm: 41600, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'ingersoll_goldtwist_075_4fl', name: '0.75" 4FL GoldTwist', manufacturer: 'Ingersoll', series: 'GoldTwist', partNumber: 'GT-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'Gold TiN', material: 'carbide', shank: 0.75, maxRpm: 34667, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'ingersoll_goldtwist_1_4fl', name: '1" 4FL GoldTwist', manufacturer: 'Ingersoll', series: 'GoldTwist', partNumber: 'GT-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'Gold TiN', material: 'carbide', shank: 1, maxRpm: 26000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'ingersoll_hipos_0062_5fl', name: '0.062" 5FL Hi-Pos', manufacturer: 'Ingersoll', series: 'Hi-Pos', partNumber: 'HP-62', type: 'endmill_square', diameter: 0.062, flutes: 5, loc: 0.187, oal: 1.5, coating: 'IN2005', material: 'carbide', shank: 0.125, maxRpm: 483871, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'ingersoll_hipos_0093_5fl', name: '0.093" 5FL Hi-Pos', manufacturer: 'Ingersoll', series: 'Hi-Pos', partNumber: 'HP-93', type: 'endmill_square', diameter: 0.093, flutes: 5, loc: 0.281, oal: 1.5, coating: 'IN2005', material: 'carbide', shank: 0.125, maxRpm: 322581, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'ingersoll_hipos_0125_5fl', name: '0.125" 5FL Hi-Pos', manufacturer: 'Ingersoll', series: 'Hi-Pos', partNumber: 'HP-125', type: 'endmill_square', diameter: 0.125, flutes: 5, loc: 0.5, oal: 2, coating: 'IN2005', material: 'carbide', shank: 0.125, maxRpm: 240000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'ingersoll_hipos_0187_5fl', name: '0.187" 5FL Hi-Pos', manufacturer: 'Ingersoll', series: 'Hi-Pos', partNumber: 'HP-187', type: 'endmill_square', diameter: 0.187, flutes: 5, loc: 0.562, oal: 2.5, coating: 'IN2005', material: 'carbide', shank: 0.187, maxRpm: 160428, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'ingersoll_hipos_025_5fl', name: '0.25" 5FL Hi-Pos', manufacturer: 'Ingersoll', series: 'Hi-Pos', partNumber: 'HP-250', type: 'endmill_square', diameter: 0.25, flutes: 5, loc: 0.75, oal: 2.5, coating: 'IN2005', material: 'carbide', shank: 0.25, maxRpm: 120000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'ingersoll_hipos_0312_5fl', name: '0.312" 5FL Hi-Pos', manufacturer: 'Ingersoll', series: 'Hi-Pos', partNumber: 'HP-312', type: 'endmill_square', diameter: 0.312, flutes: 5, loc: 0.937, oal: 2.5, coating: 'IN2005', material: 'carbide', shank: 0.312, maxRpm: 96154, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'ingersoll_hipos_0375_5fl', name: '0.375" 5FL Hi-Pos', manufacturer: 'Ingersoll', series: 'Hi-Pos', partNumber: 'HP-375', type: 'endmill_square', diameter: 0.375, flutes: 5, loc: 1.125, oal: 2.5, coating: 'IN2005', material: 'carbide', shank: 0.375, maxRpm: 80000, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'ingersoll_hipos_05_5fl', name: '0.5" 5FL Hi-Pos', manufacturer: 'Ingersoll', series: 'Hi-Pos', partNumber: 'HP-500', type: 'endmill_square', diameter: 0.5, flutes: 5, loc: 1.25, oal: 3, coating: 'IN2005', material: 'carbide', shank: 0.5, maxRpm: 60000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'ingersoll_hipos_0625_5fl', name: '0.625" 5FL Hi-Pos', manufacturer: 'Ingersoll', series: 'Hi-Pos', partNumber: 'HP-625', type: 'endmill_square', diameter: 0.625, flutes: 5, loc: 1.562, oal: 3.5, coating: 'IN2005', material: 'carbide', shank: 0.625, maxRpm: 48000, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'ingersoll_hipos_075_5fl', name: '0.75" 5FL Hi-Pos', manufacturer: 'Ingersoll', series: 'Hi-Pos', partNumber: 'HP-750', type: 'endmill_square', diameter: 0.75, flutes: 5, loc: 1.5, oal: 4, coating: 'IN2005', material: 'carbide', shank: 0.75, maxRpm: 40000, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'ingersoll_hipos_1_5fl', name: '1" 5FL Hi-Pos', manufacturer: 'Ingersoll', series: 'Hi-Pos', partNumber: 'HP-1000', type: 'endmill_square', diameter: 1, flutes: 5, loc: 2, oal: 4.5, coating: 'IN2005', material: 'carbide', shank: 1, maxRpm: 30000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'iscar_ece4l_0062_4fl', name: '0.062" 4FL EC-E4L', manufacturer: 'ISCAR', series: 'EC-E4L', partNumber: 'EC0062L-4L', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'IC900', material: 'carbide', shank: 0.125, maxRpm: 419355, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'iscar_ece4l_0093_4fl', name: '0.093" 4FL EC-E4L', manufacturer: 'ISCAR', series: 'EC-E4L', partNumber: 'EC0093L-4L', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'IC900', material: 'carbide', shank: 0.125, maxRpm: 279570, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'iscar_ece4l_0125_4fl', name: '0.125" 4FL EC-E4L', manufacturer: 'ISCAR', series: 'EC-E4L', partNumber: 'EC0125L-4L', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'IC900', material: 'carbide', shank: 0.125, maxRpm: 208000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'iscar_ece4l_0187_4fl', name: '0.187" 4FL EC-E4L', manufacturer: 'ISCAR', series: 'EC-E4L', partNumber: 'EC0187L-4L', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'IC900', material: 'carbide', shank: 0.187, maxRpm: 139037, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'iscar_ece4l_025_4fl', name: '0.25" 4FL EC-E4L', manufacturer: 'ISCAR', series: 'EC-E4L', partNumber: 'EC0250L-4L', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'IC900', material: 'carbide', shank: 0.25, maxRpm: 104000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'iscar_ece4l_0312_4fl', name: '0.312" 4FL EC-E4L', manufacturer: 'ISCAR', series: 'EC-E4L', partNumber: 'EC0312L-4L', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'IC900', material: 'carbide', shank: 0.312, maxRpm: 83333, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'iscar_ece4l_0375_4fl', name: '0.375" 4FL EC-E4L', manufacturer: 'ISCAR', series: 'EC-E4L', partNumber: 'EC0375L-4L', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'IC900', material: 'carbide', shank: 0.375, maxRpm: 69333, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'iscar_ece4l_05_4fl', name: '0.5" 4FL EC-E4L', manufacturer: 'ISCAR', series: 'EC-E4L', partNumber: 'EC0500L-4L', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'IC900', material: 'carbide', shank: 0.5, maxRpm: 52000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'iscar_ece4l_0625_4fl', name: '0.625" 4FL EC-E4L', manufacturer: 'ISCAR', series: 'EC-E4L', partNumber: 'EC0625L-4L', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'IC900', material: 'carbide', shank: 0.625, maxRpm: 41600, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'iscar_ece4l_075_4fl', name: '0.75" 4FL EC-E4L', manufacturer: 'ISCAR', series: 'EC-E4L', partNumber: 'EC0750L-4L', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'IC900', material: 'carbide', shank: 0.75, maxRpm: 34667, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'iscar_ece4l_1_4fl', name: '1" 4FL EC-E4L', manufacturer: 'ISCAR', series: 'EC-E4L', partNumber: 'EC1000L-4L', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'IC900', material: 'carbide', shank: 1, maxRpm: 26000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'iscar_finishred_0187_4fl', name: '0.187" 4FL FINISHRED', manufacturer: 'ISCAR', series: 'FINISHRED', partNumber: 'FR0187-4', type: 'endmill_roughing', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'IC900', material: 'carbide', shank: 0.187, chipbreaker: 'Fine', maxRpm: 117647, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'iscar_finishred_025_4fl', name: '0.25" 4FL FINISHRED', manufacturer: 'ISCAR', series: 'FINISHRED', partNumber: 'FR0250-4', type: 'endmill_roughing', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'IC900', material: 'carbide', shank: 0.25, chipbreaker: 'Fine', maxRpm: 88000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'iscar_finishred_0312_4fl', name: '0.312" 4FL FINISHRED', manufacturer: 'ISCAR', series: 'FINISHRED', partNumber: 'FR0312-4', type: 'endmill_roughing', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'IC900', material: 'carbide', shank: 0.312, chipbreaker: 'Fine', maxRpm: 70513, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'iscar_finishred_0375_4fl', name: '0.375" 4FL FINISHRED', manufacturer: 'ISCAR', series: 'FINISHRED', partNumber: 'FR0375-4', type: 'endmill_roughing', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'IC900', material: 'carbide', shank: 0.375, chipbreaker: 'Fine', maxRpm: 58667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'iscar_finishred_05_4fl', name: '0.5" 4FL FINISHRED', manufacturer: 'ISCAR', series: 'FINISHRED', partNumber: 'FR0500-4', type: 'endmill_roughing', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'IC900', material: 'carbide', shank: 0.5, chipbreaker: 'Fine', maxRpm: 44000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'iscar_finishred_0625_4fl', name: '0.625" 4FL FINISHRED', manufacturer: 'ISCAR', series: 'FINISHRED', partNumber: 'FR0625-4', type: 'endmill_roughing', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'IC900', material: 'carbide', shank: 0.625, chipbreaker: 'Fine', maxRpm: 35200, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'iscar_finishred_075_4fl', name: '0.75" 4FL FINISHRED', manufacturer: 'ISCAR', series: 'FINISHRED', partNumber: 'FR0750-4', type: 'endmill_roughing', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'IC900', material: 'carbide', shank: 0.75, chipbreaker: 'Fine', maxRpm: 29333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'iscar_finishred_1_4fl', name: '1" 4FL FINISHRED', manufacturer: 'ISCAR', series: 'FINISHRED', partNumber: 'FR1000-4', type: 'endmill_roughing', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'IC900', material: 'carbide', shank: 1, chipbreaker: 'Fine', maxRpm: 22000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'iscar_chatterfree_0062_4fl', name: '0.062" 4FL CHATTERFREE', manufacturer: 'ISCAR', series: 'CHATTERFREE', partNumber: 'CF0062-4', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'IC903', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 451613, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'iscar_chatterfree_0093_4fl', name: '0.093" 4FL CHATTERFREE', manufacturer: 'ISCAR', series: 'CHATTERFREE', partNumber: 'CF0093-4', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'IC903', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 301075, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'iscar_chatterfree_0125_4fl', name: '0.125" 4FL CHATTERFREE', manufacturer: 'ISCAR', series: 'CHATTERFREE', partNumber: 'CF0125-4', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'IC903', material: 'carbide', shank: 0.125, variableHelix: true, maxRpm: 224000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'iscar_chatterfree_0187_4fl', name: '0.187" 4FL CHATTERFREE', manufacturer: 'ISCAR', series: 'CHATTERFREE', partNumber: 'CF0187-4', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'IC903', material: 'carbide', shank: 0.187, variableHelix: true, maxRpm: 149733, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'iscar_chatterfree_025_4fl', name: '0.25" 4FL CHATTERFREE', manufacturer: 'ISCAR', series: 'CHATTERFREE', partNumber: 'CF0250-4', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'IC903', material: 'carbide', shank: 0.25, variableHelix: true, maxRpm: 112000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'iscar_chatterfree_0312_4fl', name: '0.312" 4FL CHATTERFREE', manufacturer: 'ISCAR', series: 'CHATTERFREE', partNumber: 'CF0312-4', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'IC903', material: 'carbide', shank: 0.312, variableHelix: true, maxRpm: 89744, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'iscar_chatterfree_0375_4fl', name: '0.375" 4FL CHATTERFREE', manufacturer: 'ISCAR', series: 'CHATTERFREE', partNumber: 'CF0375-4', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'IC903', material: 'carbide', shank: 0.375, variableHelix: true, maxRpm: 74667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'iscar_chatterfree_05_4fl', name: '0.5" 4FL CHATTERFREE', manufacturer: 'ISCAR', series: 'CHATTERFREE', partNumber: 'CF0500-4', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'IC903', material: 'carbide', shank: 0.5, variableHelix: true, maxRpm: 56000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'iscar_chatterfree_0625_4fl', name: '0.625" 4FL CHATTERFREE', manufacturer: 'ISCAR', series: 'CHATTERFREE', partNumber: 'CF0625-4', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'IC903', material: 'carbide', shank: 0.625, variableHelix: true, maxRpm: 44800, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'iscar_chatterfree_075_4fl', name: '0.75" 4FL CHATTERFREE', manufacturer: 'ISCAR', series: 'CHATTERFREE', partNumber: 'CF0750-4', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'IC903', material: 'carbide', shank: 0.75, variableHelix: true, maxRpm: 37333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'iscar_chatterfree_1_4fl', name: '1" 4FL CHATTERFREE', manufacturer: 'ISCAR', series: 'CHATTERFREE', partNumber: 'CF1000-4', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'IC903', material: 'carbide', shank: 1, variableHelix: true, maxRpm: 28000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'sandvik_plura_0062_4fl', name: '0.062" 4FL CoroMill Plura', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura', partNumber: '2P160-0006-NA', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'GC1630', material: 'carbide', shank: 0.125, maxRpm: 483871, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'sandvik_plura_0093_4fl', name: '0.093" 4FL CoroMill Plura', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura', partNumber: '2P160-0009-NA', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'GC1630', material: 'carbide', shank: 0.125, maxRpm: 322581, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'sandvik_plura_0125_4fl', name: '0.125" 4FL CoroMill Plura', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura', partNumber: '2P160-0013-NA', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'GC1630', material: 'carbide', shank: 0.125, maxRpm: 240000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'sandvik_plura_0187_4fl', name: '0.187" 4FL CoroMill Plura', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura', partNumber: '2P160-0019-NA', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'GC1630', material: 'carbide', shank: 0.187, maxRpm: 160428, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'sandvik_plura_025_4fl', name: '0.25" 4FL CoroMill Plura', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura', partNumber: '2P160-0025-NA', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'GC1630', material: 'carbide', shank: 0.25, maxRpm: 120000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'sandvik_plura_0312_4fl', name: '0.312" 4FL CoroMill Plura', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura', partNumber: '2P160-0031-NA', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'GC1630', material: 'carbide', shank: 0.312, maxRpm: 96154, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'sandvik_plura_0375_4fl', name: '0.375" 4FL CoroMill Plura', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura', partNumber: '2P160-0038-NA', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'GC1630', material: 'carbide', shank: 0.375, maxRpm: 80000, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'sandvik_plura_05_4fl', name: '0.5" 4FL CoroMill Plura', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura', partNumber: '2P160-0050-NA', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'GC1630', material: 'carbide', shank: 0.5, maxRpm: 60000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'sandvik_plura_0625_4fl', name: '0.625" 4FL CoroMill Plura', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura', partNumber: '2P160-0063-NA', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'GC1630', material: 'carbide', shank: 0.625, maxRpm: 48000, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'sandvik_plura_075_4fl', name: '0.75" 4FL CoroMill Plura', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura', partNumber: '2P160-0075-NA', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'GC1630', material: 'carbide', shank: 0.75, maxRpm: 40000, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'sandvik_plura_1_4fl', name: '1" 4FL CoroMill Plura', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura', partNumber: '2P160-0100-NA', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'GC1630', material: 'carbide', shank: 1, maxRpm: 30000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hd_0187_5fl', name: '0.187" 5FL CoroMill Plura HD', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HD', partNumber: '2P370-0019-NA', type: 'endmill_square', diameter: 0.187, flutes: 5, loc: 0.562, oal: 2.5, coating: 'GC1640', material: 'carbide', shank: 0.187, heavyDuty: true, maxRpm: 139037, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hd_025_5fl', name: '0.25" 5FL CoroMill Plura HD', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HD', partNumber: '2P370-0025-NA', type: 'endmill_square', diameter: 0.25, flutes: 5, loc: 0.75, oal: 2.5, coating: 'GC1640', material: 'carbide', shank: 0.25, heavyDuty: true, maxRpm: 104000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hd_0312_5fl', name: '0.312" 5FL CoroMill Plura HD', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HD', partNumber: '2P370-0031-NA', type: 'endmill_square', diameter: 0.312, flutes: 5, loc: 0.937, oal: 2.5, coating: 'GC1640', material: 'carbide', shank: 0.312, heavyDuty: true, maxRpm: 83333, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hd_0375_5fl', name: '0.375" 5FL CoroMill Plura HD', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HD', partNumber: '2P370-0038-NA', type: 'endmill_square', diameter: 0.375, flutes: 5, loc: 1.125, oal: 2.5, coating: 'GC1640', material: 'carbide', shank: 0.375, heavyDuty: true, maxRpm: 69333, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hd_05_5fl', name: '0.5" 5FL CoroMill Plura HD', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HD', partNumber: '2P370-0050-NA', type: 'endmill_square', diameter: 0.5, flutes: 5, loc: 1.25, oal: 3, coating: 'GC1640', material: 'carbide', shank: 0.5, heavyDuty: true, maxRpm: 52000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hd_0625_5fl', name: '0.625" 5FL CoroMill Plura HD', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HD', partNumber: '2P370-0063-NA', type: 'endmill_square', diameter: 0.625, flutes: 5, loc: 1.562, oal: 3.5, coating: 'GC1640', material: 'carbide', shank: 0.625, heavyDuty: true, maxRpm: 41600, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hd_075_5fl', name: '0.75" 5FL CoroMill Plura HD', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HD', partNumber: '2P370-0075-NA', type: 'endmill_square', diameter: 0.75, flutes: 5, loc: 1.5, oal: 4, coating: 'GC1640', material: 'carbide', shank: 0.75, heavyDuty: true, maxRpm: 34667, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hd_1_5fl', name: '1" 5FL CoroMill Plura HD', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HD', partNumber: '2P370-0100-NA', type: 'endmill_square', diameter: 1, flutes: 5, loc: 2, oal: 4.5, coating: 'GC1640', material: 'carbide', shank: 1, heavyDuty: true, maxRpm: 26000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hfs_0125_4fl', name: '0.125" 4FL CoroMill Plura HFS', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HFS', partNumber: '2F340-0013-NA', type: 'endmill_highfeed', diameter: 0.125, flutes: 4, loc: 0.300, oal: 2, coating: 'GC1620', material: 'carbide', shank: 0.125, highFeed: true, maxRpm: 280000, process: 'milling', geometry: { volume: 384, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hfs_0187_4fl', name: '0.187" 4FL CoroMill Plura HFS', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HFS', partNumber: '2F340-0019-NA', type: 'endmill_highfeed', diameter: 0.187, flutes: 4, loc: 0.337, oal: 2.5, coating: 'GC1620', material: 'carbide', shank: 0.187, highFeed: true, maxRpm: 187166, process: 'milling', geometry: { volume: 1080, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hfs_025_4fl', name: '0.25" 4FL CoroMill Plura HFS', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HFS', partNumber: '2F340-0025-NA', type: 'endmill_highfeed', diameter: 0.25, flutes: 4, loc: 0.450, oal: 2.5, coating: 'GC1620', material: 'carbide', shank: 0.25, highFeed: true, maxRpm: 140000, process: 'milling', geometry: { volume: 1902, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hfs_0312_4fl', name: '0.312" 4FL CoroMill Plura HFS', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HFS', partNumber: '2F340-0031-NA', type: 'endmill_highfeed', diameter: 0.312, flutes: 4, loc: 0.562, oal: 2.5, coating: 'GC1620', material: 'carbide', shank: 0.312, highFeed: true, maxRpm: 112179, process: 'milling', geometry: { volume: 2921, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hfs_0375_4fl', name: '0.375" 4FL CoroMill Plura HFS', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HFS', partNumber: '2F340-0038-NA', type: 'endmill_highfeed', diameter: 0.375, flutes: 4, loc: 0.675, oal: 2.5, coating: 'GC1620', material: 'carbide', shank: 0.375, highFeed: true, maxRpm: 93333, process: 'milling', geometry: { volume: 4158, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hfs_05_4fl', name: '0.5" 4FL CoroMill Plura HFS', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HFS', partNumber: '2F340-0050-NA', type: 'endmill_highfeed', diameter: 0.5, flutes: 4, loc: 0.750, oal: 3, coating: 'GC1620', material: 'carbide', shank: 0.5, highFeed: true, maxRpm: 70000, process: 'milling', geometry: { volume: 8929, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hfs_0625_4fl', name: '0.625" 4FL CoroMill Plura HFS', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HFS', partNumber: '2F340-0063-NA', type: 'endmill_highfeed', diameter: 0.625, flutes: 4, loc: 0.937, oal: 3.5, coating: 'GC1620', material: 'carbide', shank: 0.625, highFeed: true, maxRpm: 56000, process: 'milling', geometry: { volume: 16183, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hfs_075_4fl', name: '0.75" 4FL CoroMill Plura HFS', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HFS', partNumber: '2F340-0075-NA', type: 'endmill_highfeed', diameter: 0.75, flutes: 4, loc: 0.900, oal: 4, coating: 'GC1620', material: 'carbide', shank: 0.75, highFeed: true, maxRpm: 46667, process: 'milling', geometry: { volume: 27004, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'sandvik_plura_hfs_1_4fl', name: '1" 4FL CoroMill Plura HFS', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura HFS', partNumber: '2F340-0100-NA', type: 'endmill_highfeed', diameter: 1, flutes: 4, loc: 1.200, oal: 4.5, coating: 'GC1620', material: 'carbide', shank: 1, highFeed: true, maxRpm: 35000, process: 'milling', geometry: { volume: 53283, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'mitsu_vq_0062_4fl', name: '0.062" 4FL VQ End Mill', manufacturer: 'Mitsubishi Materials', series: 'VQ', partNumber: 'VQ4MVB0062', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'Miracle', material: 'carbide', shank: 0.125, maxRpm: 451613, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'mitsu_vq_0093_4fl', name: '0.093" 4FL VQ End Mill', manufacturer: 'Mitsubishi Materials', series: 'VQ', partNumber: 'VQ4MVB0093', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'Miracle', material: 'carbide', shank: 0.125, maxRpm: 301075, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'mitsu_vq_0125_4fl', name: '0.125" 4FL VQ End Mill', manufacturer: 'Mitsubishi Materials', series: 'VQ', partNumber: 'VQ4MVB0125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'Miracle', material: 'carbide', shank: 0.125, maxRpm: 224000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'mitsu_vq_0187_4fl', name: '0.187" 4FL VQ End Mill', manufacturer: 'Mitsubishi Materials', series: 'VQ', partNumber: 'VQ4MVB0187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'Miracle', material: 'carbide', shank: 0.187, maxRpm: 149733, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'mitsu_vq_025_4fl', name: '0.25" 4FL VQ End Mill', manufacturer: 'Mitsubishi Materials', series: 'VQ', partNumber: 'VQ4MVB0250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'Miracle', material: 'carbide', shank: 0.25, maxRpm: 112000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'mitsu_vq_0312_4fl', name: '0.312" 4FL VQ End Mill', manufacturer: 'Mitsubishi Materials', series: 'VQ', partNumber: 'VQ4MVB0312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'Miracle', material: 'carbide', shank: 0.312, maxRpm: 89744, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'mitsu_vq_0375_4fl', name: '0.375" 4FL VQ End Mill', manufacturer: 'Mitsubishi Materials', series: 'VQ', partNumber: 'VQ4MVB0375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'Miracle', material: 'carbide', shank: 0.375, maxRpm: 74667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'mitsu_vq_05_4fl', name: '0.5" 4FL VQ End Mill', manufacturer: 'Mitsubishi Materials', series: 'VQ', partNumber: 'VQ4MVB0500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'Miracle', material: 'carbide', shank: 0.5, maxRpm: 56000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'mitsu_vq_0625_4fl', name: '0.625" 4FL VQ End Mill', manufacturer: 'Mitsubishi Materials', series: 'VQ', partNumber: 'VQ4MVB0625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'Miracle', material: 'carbide', shank: 0.625, maxRpm: 44800, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'mitsu_vq_075_4fl', name: '0.75" 4FL VQ End Mill', manufacturer: 'Mitsubishi Materials', series: 'VQ', partNumber: 'VQ4MVB0750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'Miracle', material: 'carbide', shank: 0.75, maxRpm: 37333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'mitsu_vq_1_4fl', name: '1" 4FL VQ End Mill', manufacturer: 'Mitsubishi Materials', series: 'VQ', partNumber: 'VQ4MVB1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'Miracle', material: 'carbide', shank: 1, maxRpm: 28000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'seco_js500_0062_4fl', name: '0.062" 4FL Jabro JS500', manufacturer: 'Seco Tools', series: 'Jabro-Solid2 JS500', partNumber: 'JS5000062Z4', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'SIRA', material: 'carbide', shank: 0.125, maxRpm: 483871, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'seco_js500_0093_4fl', name: '0.093" 4FL Jabro JS500', manufacturer: 'Seco Tools', series: 'Jabro-Solid2 JS500', partNumber: 'JS5000093Z4', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'SIRA', material: 'carbide', shank: 0.125, maxRpm: 322581, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'seco_js500_0125_4fl', name: '0.125" 4FL Jabro JS500', manufacturer: 'Seco Tools', series: 'Jabro-Solid2 JS500', partNumber: 'JS5000125Z4', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'SIRA', material: 'carbide', shank: 0.125, maxRpm: 240000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'seco_js500_0187_4fl', name: '0.187" 4FL Jabro JS500', manufacturer: 'Seco Tools', series: 'Jabro-Solid2 JS500', partNumber: 'JS5000187Z4', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'SIRA', material: 'carbide', shank: 0.187, maxRpm: 160428, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'seco_js500_025_4fl', name: '0.25" 4FL Jabro JS500', manufacturer: 'Seco Tools', series: 'Jabro-Solid2 JS500', partNumber: 'JS5000250Z4', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'SIRA', material: 'carbide', shank: 0.25, maxRpm: 120000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'seco_js500_0312_4fl', name: '0.312" 4FL Jabro JS500', manufacturer: 'Seco Tools', series: 'Jabro-Solid2 JS500', partNumber: 'JS5000312Z4', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'SIRA', material: 'carbide', shank: 0.312, maxRpm: 96154, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'seco_js500_0375_4fl', name: '0.375" 4FL Jabro JS500', manufacturer: 'Seco Tools', series: 'Jabro-Solid2 JS500', partNumber: 'JS5000375Z4', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'SIRA', material: 'carbide', shank: 0.375, maxRpm: 80000, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'seco_js500_05_4fl', name: '0.5" 4FL Jabro JS500', manufacturer: 'Seco Tools', series: 'Jabro-Solid2 JS500', partNumber: 'JS5000500Z4', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'SIRA', material: 'carbide', shank: 0.5, maxRpm: 60000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'seco_js500_0625_4fl', name: '0.625" 4FL Jabro JS500', manufacturer: 'Seco Tools', series: 'Jabro-Solid2 JS500', partNumber: 'JS5000625Z4', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'SIRA', material: 'carbide', shank: 0.625, maxRpm: 48000, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'seco_js500_075_4fl', name: '0.75" 4FL Jabro JS500', manufacturer: 'Seco Tools', series: 'Jabro-Solid2 JS500', partNumber: 'JS5000750Z4', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'SIRA', material: 'carbide', shank: 0.75, maxRpm: 40000, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'seco_js500_1_4fl', name: '1" 4FL Jabro JS500', manufacturer: 'Seco Tools', series: 'Jabro-Solid2 JS500', partNumber: 'JS5001000Z4', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'SIRA', material: 'carbide', shank: 1, maxRpm: 30000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'walter_proto_0062_4fl', name: '0.062" 4FL Protostar', manufacturer: 'Walter', series: 'Prototyp Protostar', partNumber: 'H3007006', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'TiCN', material: 'carbide', shank: 0.125, maxRpm: 451613, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'walter_proto_0093_4fl', name: '0.093" 4FL Protostar', manufacturer: 'Walter', series: 'Prototyp Protostar', partNumber: 'H3007009', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'TiCN', material: 'carbide', shank: 0.125, maxRpm: 301075, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'walter_proto_0125_4fl', name: '0.125" 4FL Protostar', manufacturer: 'Walter', series: 'Prototyp Protostar', partNumber: 'H3007013', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'TiCN', material: 'carbide', shank: 0.125, maxRpm: 224000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'walter_proto_0187_4fl', name: '0.187" 4FL Protostar', manufacturer: 'Walter', series: 'Prototyp Protostar', partNumber: 'H3007019', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'TiCN', material: 'carbide', shank: 0.187, maxRpm: 149733, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'walter_proto_025_4fl', name: '0.25" 4FL Protostar', manufacturer: 'Walter', series: 'Prototyp Protostar', partNumber: 'H3007025', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'TiCN', material: 'carbide', shank: 0.25, maxRpm: 112000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'walter_proto_0312_4fl', name: '0.312" 4FL Protostar', manufacturer: 'Walter', series: 'Prototyp Protostar', partNumber: 'H3007031', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'TiCN', material: 'carbide', shank: 0.312, maxRpm: 89744, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'walter_proto_0375_4fl', name: '0.375" 4FL Protostar', manufacturer: 'Walter', series: 'Prototyp Protostar', partNumber: 'H3007038', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'TiCN', material: 'carbide', shank: 0.375, maxRpm: 74667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'walter_proto_05_4fl', name: '0.5" 4FL Protostar', manufacturer: 'Walter', series: 'Prototyp Protostar', partNumber: 'H3007050', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'TiCN', material: 'carbide', shank: 0.5, maxRpm: 56000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'walter_proto_0625_4fl', name: '0.625" 4FL Protostar', manufacturer: 'Walter', series: 'Prototyp Protostar', partNumber: 'H3007063', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'TiCN', material: 'carbide', shank: 0.625, maxRpm: 44800, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'walter_proto_075_4fl', name: '0.75" 4FL Protostar', manufacturer: 'Walter', series: 'Prototyp Protostar', partNumber: 'H3007075', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'TiCN', material: 'carbide', shank: 0.75, maxRpm: 37333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'walter_proto_1_4fl', name: '1" 4FL Protostar', manufacturer: 'Walter', series: 'Prototyp Protostar', partNumber: 'H3007100', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'TiCN', material: 'carbide', shank: 1, maxRpm: 28000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'kyocera_sgs_0062_4fl', name: '0.062" 4FL SGS', manufacturer: 'Kyocera SGS', series: 'SGS', partNumber: 'SGS0062-4', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 419355, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'kyocera_sgs_0093_4fl', name: '0.093" 4FL SGS', manufacturer: 'Kyocera SGS', series: 'SGS', partNumber: 'SGS0093-4', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 279570, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'kyocera_sgs_0125_4fl', name: '0.125" 4FL SGS', manufacturer: 'Kyocera SGS', series: 'SGS', partNumber: 'SGS0125-4', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 208000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'kyocera_sgs_0187_4fl', name: '0.187" 4FL SGS', manufacturer: 'Kyocera SGS', series: 'SGS', partNumber: 'SGS0187-4', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.187, maxRpm: 139037, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'kyocera_sgs_025_4fl', name: '0.25" 4FL SGS', manufacturer: 'Kyocera SGS', series: 'SGS', partNumber: 'SGS0250-4', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.25, maxRpm: 104000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'kyocera_sgs_0312_4fl', name: '0.312" 4FL SGS', manufacturer: 'Kyocera SGS', series: 'SGS', partNumber: 'SGS0312-4', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.312, maxRpm: 83333, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'kyocera_sgs_0375_4fl', name: '0.375" 4FL SGS', manufacturer: 'Kyocera SGS', series: 'SGS', partNumber: 'SGS0375-4', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 69333, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'kyocera_sgs_05_4fl', name: '0.5" 4FL SGS', manufacturer: 'Kyocera SGS', series: 'SGS', partNumber: 'SGS0500-4', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 52000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'kyocera_sgs_0625_4fl', name: '0.625" 4FL SGS', manufacturer: 'Kyocera SGS', series: 'SGS', partNumber: 'SGS0625-4', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'TiAlN', material: 'carbide', shank: 0.625, maxRpm: 41600, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'kyocera_sgs_075_4fl', name: '0.75" 4FL SGS', manufacturer: 'Kyocera SGS', series: 'SGS', partNumber: 'SGS0750-4', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 34667, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'kyocera_sgs_1_4fl', name: '1" 4FL SGS', manufacturer: 'Kyocera SGS', series: 'SGS', partNumber: 'SGS1000-4', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 26000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'emuge_topcut_0062_4fl', name: '0.062" 4FL TopCut', manufacturer: 'Emuge', series: 'TopCut', partNumber: 'TC0062-4', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'TiN-X', material: 'carbide', shank: 0.125, maxRpm: 451613, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'emuge_topcut_0093_4fl', name: '0.093" 4FL TopCut', manufacturer: 'Emuge', series: 'TopCut', partNumber: 'TC0093-4', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'TiN-X', material: 'carbide', shank: 0.125, maxRpm: 301075, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'emuge_topcut_0125_4fl', name: '0.125" 4FL TopCut', manufacturer: 'Emuge', series: 'TopCut', partNumber: 'TC0125-4', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'TiN-X', material: 'carbide', shank: 0.125, maxRpm: 224000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'emuge_topcut_0187_4fl', name: '0.187" 4FL TopCut', manufacturer: 'Emuge', series: 'TopCut', partNumber: 'TC0187-4', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'TiN-X', material: 'carbide', shank: 0.187, maxRpm: 149733, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'emuge_topcut_025_4fl', name: '0.25" 4FL TopCut', manufacturer: 'Emuge', series: 'TopCut', partNumber: 'TC0250-4', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'TiN-X', material: 'carbide', shank: 0.25, maxRpm: 112000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'emuge_topcut_0312_4fl', name: '0.312" 4FL TopCut', manufacturer: 'Emuge', series: 'TopCut', partNumber: 'TC0312-4', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'TiN-X', material: 'carbide', shank: 0.312, maxRpm: 89744, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'emuge_topcut_0375_4fl', name: '0.375" 4FL TopCut', manufacturer: 'Emuge', series: 'TopCut', partNumber: 'TC0375-4', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'TiN-X', material: 'carbide', shank: 0.375, maxRpm: 74667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'emuge_topcut_05_4fl', name: '0.5" 4FL TopCut', manufacturer: 'Emuge', series: 'TopCut', partNumber: 'TC0500-4', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'TiN-X', material: 'carbide', shank: 0.5, maxRpm: 56000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'emuge_topcut_0625_4fl', name: '0.625" 4FL TopCut', manufacturer: 'Emuge', series: 'TopCut', partNumber: 'TC0625-4', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'TiN-X', material: 'carbide', shank: 0.625, maxRpm: 44800, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'emuge_topcut_075_4fl', name: '0.75" 4FL TopCut', manufacturer: 'Emuge', series: 'TopCut', partNumber: 'TC0750-4', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'TiN-X', material: 'carbide', shank: 0.75, maxRpm: 37333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'emuge_topcut_1_4fl', name: '1" 4FL TopCut', manufacturer: 'Emuge', series: 'TopCut', partNumber: 'TC1000-4', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'TiN-X', material: 'carbide', shank: 1, maxRpm: 28000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'fraisa_carbimill_0062_4fl', name: '0.062" 4FL CarbiMill', manufacturer: 'Fraisa', series: 'CarbiMill', partNumber: 'CM0062-4', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'PVD-AlTiN', material: 'carbide', shank: 0.125, maxRpm: 483871, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'fraisa_carbimill_0093_4fl', name: '0.093" 4FL CarbiMill', manufacturer: 'Fraisa', series: 'CarbiMill', partNumber: 'CM0093-4', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'PVD-AlTiN', material: 'carbide', shank: 0.125, maxRpm: 322581, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'fraisa_carbimill_0125_4fl', name: '0.125" 4FL CarbiMill', manufacturer: 'Fraisa', series: 'CarbiMill', partNumber: 'CM0125-4', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'PVD-AlTiN', material: 'carbide', shank: 0.125, maxRpm: 240000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'fraisa_carbimill_0187_4fl', name: '0.187" 4FL CarbiMill', manufacturer: 'Fraisa', series: 'CarbiMill', partNumber: 'CM0187-4', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'PVD-AlTiN', material: 'carbide', shank: 0.187, maxRpm: 160428, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'fraisa_carbimill_025_4fl', name: '0.25" 4FL CarbiMill', manufacturer: 'Fraisa', series: 'CarbiMill', partNumber: 'CM0250-4', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'PVD-AlTiN', material: 'carbide', shank: 0.25, maxRpm: 120000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'fraisa_carbimill_0312_4fl', name: '0.312" 4FL CarbiMill', manufacturer: 'Fraisa', series: 'CarbiMill', partNumber: 'CM0312-4', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'PVD-AlTiN', material: 'carbide', shank: 0.312, maxRpm: 96154, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'fraisa_carbimill_0375_4fl', name: '0.375" 4FL CarbiMill', manufacturer: 'Fraisa', series: 'CarbiMill', partNumber: 'CM0375-4', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'PVD-AlTiN', material: 'carbide', shank: 0.375, maxRpm: 80000, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'fraisa_carbimill_05_4fl', name: '0.5" 4FL CarbiMill', manufacturer: 'Fraisa', series: 'CarbiMill', partNumber: 'CM0500-4', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'PVD-AlTiN', material: 'carbide', shank: 0.5, maxRpm: 60000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'fraisa_carbimill_0625_4fl', name: '0.625" 4FL CarbiMill', manufacturer: 'Fraisa', series: 'CarbiMill', partNumber: 'CM0625-4', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'PVD-AlTiN', material: 'carbide', shank: 0.625, maxRpm: 48000, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'fraisa_carbimill_075_4fl', name: '0.75" 4FL CarbiMill', manufacturer: 'Fraisa', series: 'CarbiMill', partNumber: 'CM0750-4', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'PVD-AlTiN', material: 'carbide', shank: 0.75, maxRpm: 40000, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'fraisa_carbimill_1_4fl', name: '1" 4FL CarbiMill', manufacturer: 'Fraisa', series: 'CarbiMill', partNumber: 'CM1000-4', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'PVD-AlTiN', material: 'carbide', shank: 1, maxRpm: 30000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'guhring_rf100_0062_4fl', name: '0.062" 4FL RF100', manufacturer: 'Guhring', series: 'RF100', partNumber: 'RF100-62', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'FireX', material: 'carbide', shank: 0.125, maxRpm: 516129, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'guhring_rf100_0093_4fl', name: '0.093" 4FL RF100', manufacturer: 'Guhring', series: 'RF100', partNumber: 'RF100-93', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'FireX', material: 'carbide', shank: 0.125, maxRpm: 344086, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'guhring_rf100_0125_4fl', name: '0.125" 4FL RF100', manufacturer: 'Guhring', series: 'RF100', partNumber: 'RF100-125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'FireX', material: 'carbide', shank: 0.125, maxRpm: 256000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'guhring_rf100_0187_4fl', name: '0.187" 4FL RF100', manufacturer: 'Guhring', series: 'RF100', partNumber: 'RF100-187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'FireX', material: 'carbide', shank: 0.187, maxRpm: 171123, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'guhring_rf100_025_4fl', name: '0.25" 4FL RF100', manufacturer: 'Guhring', series: 'RF100', partNumber: 'RF100-250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'FireX', material: 'carbide', shank: 0.25, maxRpm: 128000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'guhring_rf100_0312_4fl', name: '0.312" 4FL RF100', manufacturer: 'Guhring', series: 'RF100', partNumber: 'RF100-312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'FireX', material: 'carbide', shank: 0.312, maxRpm: 102564, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'guhring_rf100_0375_4fl', name: '0.375" 4FL RF100', manufacturer: 'Guhring', series: 'RF100', partNumber: 'RF100-375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'FireX', material: 'carbide', shank: 0.375, maxRpm: 85333, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'guhring_rf100_05_4fl', name: '0.5" 4FL RF100', manufacturer: 'Guhring', series: 'RF100', partNumber: 'RF100-500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'FireX', material: 'carbide', shank: 0.5, maxRpm: 64000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'guhring_rf100_0625_4fl', name: '0.625" 4FL RF100', manufacturer: 'Guhring', series: 'RF100', partNumber: 'RF100-625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'FireX', material: 'carbide', shank: 0.625, maxRpm: 51200, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'guhring_rf100_075_4fl', name: '0.75" 4FL RF100', manufacturer: 'Guhring', series: 'RF100', partNumber: 'RF100-750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'FireX', material: 'carbide', shank: 0.75, maxRpm: 42667, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'guhring_rf100_1_4fl', name: '1" 4FL RF100', manufacturer: 'Guhring', series: 'RF100', partNumber: 'RF100-1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'FireX', material: 'carbide', shank: 1, maxRpm: 32000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'nachi_sg_0062_4fl', name: '0.062" 4FL SG Series', manufacturer: 'Nachi', series: 'SG', partNumber: 'SG0062-4', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'SG', material: 'carbide', shank: 0.125, maxRpm: 451613, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'nachi_sg_0093_4fl', name: '0.093" 4FL SG Series', manufacturer: 'Nachi', series: 'SG', partNumber: 'SG0093-4', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'SG', material: 'carbide', shank: 0.125, maxRpm: 301075, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'nachi_sg_0125_4fl', name: '0.125" 4FL SG Series', manufacturer: 'Nachi', series: 'SG', partNumber: 'SG0125-4', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'SG', material: 'carbide', shank: 0.125, maxRpm: 224000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'nachi_sg_0187_4fl', name: '0.187" 4FL SG Series', manufacturer: 'Nachi', series: 'SG', partNumber: 'SG0187-4', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'SG', material: 'carbide', shank: 0.187, maxRpm: 149733, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'nachi_sg_025_4fl', name: '0.25" 4FL SG Series', manufacturer: 'Nachi', series: 'SG', partNumber: 'SG0250-4', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'SG', material: 'carbide', shank: 0.25, maxRpm: 112000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'nachi_sg_0312_4fl', name: '0.312" 4FL SG Series', manufacturer: 'Nachi', series: 'SG', partNumber: 'SG0312-4', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'SG', material: 'carbide', shank: 0.312, maxRpm: 89744, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'nachi_sg_0375_4fl', name: '0.375" 4FL SG Series', manufacturer: 'Nachi', series: 'SG', partNumber: 'SG0375-4', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'SG', material: 'carbide', shank: 0.375, maxRpm: 74667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'nachi_sg_05_4fl', name: '0.5" 4FL SG Series', manufacturer: 'Nachi', series: 'SG', partNumber: 'SG0500-4', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'SG', material: 'carbide', shank: 0.5, maxRpm: 56000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'nachi_sg_0625_4fl', name: '0.625" 4FL SG Series', manufacturer: 'Nachi', series: 'SG', partNumber: 'SG0625-4', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'SG', material: 'carbide', shank: 0.625, maxRpm: 44800, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'nachi_sg_075_4fl', name: '0.75" 4FL SG Series', manufacturer: 'Nachi', series: 'SG', partNumber: 'SG0750-4', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'SG', material: 'carbide', shank: 0.75, maxRpm: 37333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'nachi_sg_1_4fl', name: '1" 4FL SG Series', manufacturer: 'Nachi', series: 'SG', partNumber: 'SG1000-4', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'SG', material: 'carbide', shank: 1, maxRpm: 28000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'maford_sc_0062_4fl', name: '0.062" 4FL TuffCut XT', manufacturer: 'M.A. Ford', series: 'TuffCut XT', partNumber: 'XT0062-4', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.187, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 419355, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'maford_sc_0093_4fl', name: '0.093" 4FL TuffCut XT', manufacturer: 'M.A. Ford', series: 'TuffCut XT', partNumber: 'XT0093-4', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.281, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 279570, process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'maford_sc_0125_4fl', name: '0.125" 4FL TuffCut XT', manufacturer: 'M.A. Ford', series: 'TuffCut XT', partNumber: 'XT0125-4', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 208000, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'maford_sc_0187_4fl', name: '0.187" 4FL TuffCut XT', manufacturer: 'M.A. Ford', series: 'TuffCut XT', partNumber: 'XT0187-4', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.187, maxRpm: 139037, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'maford_sc_025_4fl', name: '0.25" 4FL TuffCut XT', manufacturer: 'M.A. Ford', series: 'TuffCut XT', partNumber: 'XT0250-4', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.25, maxRpm: 104000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'maford_sc_0312_4fl', name: '0.312" 4FL TuffCut XT', manufacturer: 'M.A. Ford', series: 'TuffCut XT', partNumber: 'XT0312-4', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.312, maxRpm: 83333, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'maford_sc_0375_4fl', name: '0.375" 4FL TuffCut XT', manufacturer: 'M.A. Ford', series: 'TuffCut XT', partNumber: 'XT0375-4', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 69333, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'maford_sc_05_4fl', name: '0.5" 4FL TuffCut XT', manufacturer: 'M.A. Ford', series: 'TuffCut XT', partNumber: 'XT0500-4', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 52000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'maford_sc_0625_4fl', name: '0.625" 4FL TuffCut XT', manufacturer: 'M.A. Ford', series: 'TuffCut XT', partNumber: 'XT0625-4', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'TiAlN', material: 'carbide', shank: 0.625, maxRpm: 41600, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'maford_sc_075_4fl', name: '0.75" 4FL TuffCut XT', manufacturer: 'M.A. Ford', series: 'TuffCut XT', partNumber: 'XT0750-4', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 34667, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'maford_sc_1_4fl', name: '1" 4FL TuffCut XT', manufacturer: 'M.A. Ford', series: 'TuffCut XT', partNumber: 'XT1000-4', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 26000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'gorilla_monster_0187_4fl', name: '0.187" 4FL Monster Mill', manufacturer: 'Gorilla Mill', series: 'Monster Mill', partNumber: 'MM0187-4', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'nACo', material: 'carbide', shank: 0.187, variableHelix: true, maxRpm: 149733, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'gorilla_monster_025_4fl', name: '0.25" 4FL Monster Mill', manufacturer: 'Gorilla Mill', series: 'Monster Mill', partNumber: 'MM0250-4', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'nACo', material: 'carbide', shank: 0.25, variableHelix: true, maxRpm: 112000, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'gorilla_monster_0312_4fl', name: '0.312" 4FL Monster Mill', manufacturer: 'Gorilla Mill', series: 'Monster Mill', partNumber: 'MM0312-4', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.937, oal: 2.5, coating: 'nACo', material: 'carbide', shank: 0.312, variableHelix: true, maxRpm: 89744, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'gorilla_monster_0375_4fl', name: '0.375" 4FL Monster Mill', manufacturer: 'Gorilla Mill', series: 'Monster Mill', partNumber: 'MM0375-4', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.125, oal: 2.5, coating: 'nACo', material: 'carbide', shank: 0.375, variableHelix: true, maxRpm: 74667, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'gorilla_monster_05_4fl', name: '0.5" 4FL Monster Mill', manufacturer: 'Gorilla Mill', series: 'Monster Mill', partNumber: 'MM0500-4', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.25, oal: 3, coating: 'nACo', material: 'carbide', shank: 0.5, variableHelix: true, maxRpm: 56000, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'gorilla_monster_0625_4fl', name: '0.625" 4FL Monster Mill', manufacturer: 'Gorilla Mill', series: 'Monster Mill', partNumber: 'MM0625-4', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.562, oal: 3.5, coating: 'nACo', material: 'carbide', shank: 0.625, variableHelix: true, maxRpm: 44800, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'gorilla_monster_075_4fl', name: '0.75" 4FL Monster Mill', manufacturer: 'Gorilla Mill', series: 'Monster Mill', partNumber: 'MM0750-4', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'nACo', material: 'carbide', shank: 0.75, variableHelix: true, maxRpm: 37333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'gorilla_monster_1_4fl', name: '1" 4FL Monster Mill', manufacturer: 'Gorilla Mill', series: 'Monster Mill', partNumber: 'MM1000-4', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'nACo', material: 'carbide', shank: 1, variableHelix: true, maxRpm: 28000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'destiny_v2_0062_2fl', name: '0.062" 2FL Viper Aluminum', manufacturer: 'Destiny Tool', series: 'Viper', partNumber: 'V2-62', type: 'endmill_square', diameter: 0.062, flutes: 2, loc: 0.187, oal: 1.5, coating: 'Uncoated', material: 'carbide', shank: 0.125, polished: true, maxRpm: 806452, targetMaterial: 'Aluminum', process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'destiny_v2_0093_2fl', name: '0.093" 2FL Viper Aluminum', manufacturer: 'Destiny Tool', series: 'Viper', partNumber: 'V2-93', type: 'endmill_square', diameter: 0.093, flutes: 2, loc: 0.281, oal: 1.5, coating: 'Uncoated', material: 'carbide', shank: 0.125, polished: true, maxRpm: 537634, targetMaterial: 'Aluminum', process: 'milling', geometry: { volume: 158, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'destiny_v2_0125_2fl', name: '0.125" 2FL Viper Aluminum', manufacturer: 'Destiny Tool', series: 'Viper', partNumber: 'V2-125', type: 'endmill_square', diameter: 0.125, flutes: 2, loc: 0.5, oal: 2, coating: 'Uncoated', material: 'carbide', shank: 0.125, polished: true, maxRpm: 400000, targetMaterial: 'Aluminum', process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'destiny_v2_0187_2fl', name: '0.187" 2FL Viper Aluminum', manufacturer: 'Destiny Tool', series: 'Viper', partNumber: 'V2-187', type: 'endmill_square', diameter: 0.187, flutes: 2, loc: 0.562, oal: 2.5, coating: 'Uncoated', material: 'carbide', shank: 0.187, polished: true, maxRpm: 267380, targetMaterial: 'Aluminum', process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'destiny_v2_025_2fl', name: '0.25" 2FL Viper Aluminum', manufacturer: 'Destiny Tool', series: 'Viper', partNumber: 'V2-250', type: 'endmill_square', diameter: 0.25, flutes: 2, loc: 0.75, oal: 2.5, coating: 'Uncoated', material: 'carbide', shank: 0.25, polished: true, maxRpm: 200000, targetMaterial: 'Aluminum', process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'destiny_v2_0312_2fl', name: '0.312" 2FL Viper Aluminum', manufacturer: 'Destiny Tool', series: 'Viper', partNumber: 'V2-312', type: 'endmill_square', diameter: 0.312, flutes: 2, loc: 0.937, oal: 2.5, coating: 'Uncoated', material: 'carbide', shank: 0.312, polished: true, maxRpm: 160256, targetMaterial: 'Aluminum', process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'destiny_v2_0375_2fl', name: '0.375" 2FL Viper Aluminum', manufacturer: 'Destiny Tool', series: 'Viper', partNumber: 'V2-375', type: 'endmill_square', diameter: 0.375, flutes: 2, loc: 1.125, oal: 2.5, coating: 'Uncoated', material: 'carbide', shank: 0.375, polished: true, maxRpm: 133333, targetMaterial: 'Aluminum', process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'destiny_v2_05_2fl', name: '0.5" 2FL Viper Aluminum', manufacturer: 'Destiny Tool', series: 'Viper', partNumber: 'V2-500', type: 'endmill_square', diameter: 0.5, flutes: 2, loc: 1.25, oal: 3, coating: 'Uncoated', material: 'carbide', shank: 0.5, polished: true, maxRpm: 100000, targetMaterial: 'Aluminum', process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'destiny_v2_0625_2fl', name: '0.625" 2FL Viper Aluminum', manufacturer: 'Destiny Tool', series: 'Viper', partNumber: 'V2-625', type: 'endmill_square', diameter: 0.625, flutes: 2, loc: 1.562, oal: 3.5, coating: 'Uncoated', material: 'carbide', shank: 0.625, polished: true, maxRpm: 80000, targetMaterial: 'Aluminum', process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'destiny_v2_075_2fl', name: '0.75" 2FL Viper Aluminum', manufacturer: 'Destiny Tool', series: 'Viper', partNumber: 'V2-750', type: 'endmill_square', diameter: 0.75, flutes: 2, loc: 1.5, oal: 4, coating: 'Uncoated', material: 'carbide', shank: 0.75, polished: true, maxRpm: 66667, targetMaterial: 'Aluminum', process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'destiny_v2_1_2fl', name: '1" 2FL Viper Aluminum', manufacturer: 'Destiny Tool', series: 'Viper', partNumber: 'V2-1000', type: 'endmill_square', diameter: 1, flutes: 2, loc: 2, oal: 4.5, coating: 'Uncoated', material: 'carbide', shank: 1, polished: true, maxRpm: 50000, targetMaterial: 'Aluminum', process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'datron_hs_0031_2fl', name: '31 thou 2FL High Speed', manufacturer: 'Datron', series: 'High Speed', partNumber: 'HS031', type: 'endmill_square', diameter: 0.031, flutes: 2, loc: 0.093, oal: 1.5, coating: 'DLC', material: 'carbide', shank: 0.125, maxRpm: 1935484, highSpeed: true, process: 'milling', geometry: { volume: 18, surfaceArea: 95, units: "mm3/mm2" } },
            { id: 'datron_hs_0062_2fl', name: '62 thou 2FL High Speed', manufacturer: 'Datron', series: 'High Speed', partNumber: 'HS062', type: 'endmill_square', diameter: 0.062, flutes: 2, loc: 0.187, oal: 1.5, coating: 'DLC', material: 'carbide', shank: 0.125, maxRpm: 967742, highSpeed: true, process: 'milling', geometry: { volume: 71, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'datron_hs_0125_2fl', name: '0.125" 2FL High Speed', manufacturer: 'Datron', series: 'High Speed', partNumber: 'HS125', type: 'endmill_square', diameter: 0.125, flutes: 2, loc: 0.375, oal: 2, coating: 'DLC', material: 'carbide', shank: 0.125, maxRpm: 480000, highSpeed: true, process: 'milling', geometry: { volume: 380, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'datron_hs_0187_2fl', name: '0.187" 2FL High Speed', manufacturer: 'Datron', series: 'High Speed', partNumber: 'HS187', type: 'endmill_square', diameter: 0.187, flutes: 2, loc: 0.562, oal: 2.5, coating: 'DLC', material: 'carbide', shank: 0.187, maxRpm: 320856, highSpeed: true, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'datron_hs_025_2fl', name: '0.25" 2FL High Speed', manufacturer: 'Datron', series: 'High Speed', partNumber: 'HS250', type: 'endmill_square', diameter: 0.25, flutes: 2, loc: 0.75, oal: 2.5, coating: 'DLC', material: 'carbide', shank: 0.25, maxRpm: 240000, highSpeed: true, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_001_2fl', name: '0.010" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A010', type: 'endmill_ball', diameter: 0.01, flutes: 2, loc: 0.015, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 3000000, quickShip: true, process: 'milling', geometry: { volume: 2, surfaceArea: 31, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0015_2fl', name: '0.015" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A015', type: 'endmill_ball', diameter: 0.015, flutes: 2, loc: 0.023, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 2000000, quickShip: true, process: 'milling', geometry: { volume: 4, surfaceArea: 46, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_002_2fl', name: '0.020" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A020', type: 'endmill_ball', diameter: 0.02, flutes: 2, loc: 0.03, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 1500000, quickShip: true, process: 'milling', geometry: { volume: 8, surfaceArea: 61, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0031_2fl', name: '1/32" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A031', type: 'endmill_ball', diameter: 0.031, flutes: 2, loc: 0.047, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 967742, quickShip: true, process: 'milling', geometry: { volume: 18, surfaceArea: 95, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0047_2fl', name: '3/64" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A047', type: 'endmill_ball', diameter: 0.047, flutes: 2, loc: 0.07, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 638298, quickShip: true, process: 'milling', geometry: { volume: 42, surfaceArea: 145, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0062_2fl', name: '1/16" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A062', type: 'endmill_ball', diameter: 0.062, flutes: 2, loc: 0.093, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 483871, quickShip: true, process: 'milling', geometry: { volume: 73, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0078_2fl', name: '5/64" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A078', type: 'endmill_ball', diameter: 0.078, flutes: 2, loc: 0.117, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 384615, quickShip: true, process: 'milling', geometry: { volume: 115, surfaceArea: 243, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0093_2fl', name: '3/32" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A093', type: 'endmill_ball', diameter: 0.093, flutes: 2, loc: 0.14, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 322581, quickShip: true, process: 'milling', geometry: { volume: 162, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0125_2fl', name: '1/8" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A125', type: 'endmill_ball', diameter: 0.125, flutes: 2, loc: 0.25, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 240000, quickShip: true, process: 'milling', geometry: { volume: 287, surfaceArea: 396, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0156_2fl', name: '5/32" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A156', type: 'endmill_ball', diameter: 0.156, flutes: 2, loc: 0.312, oal: 2, coating: 'TiAlN', material: 'carbide', shank: 0.156, maxRpm: 192308, quickShip: true, process: 'milling', geometry: { volume: 597, surfaceArea: 657, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0187_2fl', name: '3/16" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A187', type: 'endmill_ball', diameter: 0.187, flutes: 2, loc: 0.375, oal: 2, coating: 'TiAlN', material: 'carbide', shank: 0.187, maxRpm: 160428, quickShip: true, process: 'milling', geometry: { volume: 849, surfaceArea: 793, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0218_2fl', name: '7/32" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A218', type: 'endmill_ball', diameter: 0.218, flutes: 2, loc: 0.437, oal: 2, coating: 'TiAlN', material: 'carbide', shank: 0.218, maxRpm: 137615, quickShip: true, process: 'milling', geometry: { volume: 1143, surfaceArea: 932, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_025_2fl', name: '1/4" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A250', type: 'endmill_ball', diameter: 0.25, flutes: 2, loc: 0.5, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.25, maxRpm: 120000, quickShip: true, process: 'milling', geometry: { volume: 1890, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0312_2fl', name: '5/16" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A312', type: 'endmill_ball', diameter: 0.312, flutes: 2, loc: 0.625, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.312, maxRpm: 96154, quickShip: true, process: 'milling', geometry: { volume: 2897, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0375_2fl', name: '3/8" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A375', type: 'endmill_ball', diameter: 0.375, flutes: 2, loc: 0.75, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 80000, quickShip: true, process: 'milling', geometry: { volume: 4118, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0437_2fl', name: '7/16" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A437', type: 'endmill_ball', diameter: 0.437, flutes: 2, loc: 0.875, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.437, maxRpm: 68650, quickShip: true, process: 'milling', geometry: { volume: 6728, surfaceArea: 2851, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_05_2fl', name: '1/2" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A500', type: 'endmill_ball', diameter: 0.5, flutes: 2, loc: 1, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 60000, quickShip: true, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0562_2fl', name: '9/16" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A562', type: 'endmill_ball', diameter: 0.562, flutes: 2, loc: 1.125, oal: 3.5, coating: 'TiAlN', material: 'carbide', shank: 0.562, maxRpm: 53381, quickShip: true, process: 'milling', geometry: { volume: 12856, surfaceArea: 4307, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0625_2fl', name: '5/8" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A625', type: 'endmill_ball', diameter: 0.625, flutes: 2, loc: 1.25, oal: 3.5, coating: 'TiAlN', material: 'carbide', shank: 0.625, maxRpm: 48000, quickShip: true, process: 'milling', geometry: { volume: 15711, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_075_2fl', name: '3/4" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A750', type: 'endmill_ball', diameter: 0.75, flutes: 2, loc: 1.5, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 40000, quickShip: true, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_0875_2fl', name: '7/8" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A875', type: 'endmill_ball', diameter: 0.875, flutes: 2, loc: 1.75, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.875, maxRpm: 34286, quickShip: true, process: 'milling', geometry: { volume: 34242, surfaceArea: 7870, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_1_2fl', name: '1" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A1000', type: 'endmill_ball', diameter: 1, flutes: 2, loc: 2, oal: 4.5, coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 30000, quickShip: true, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'mcmaster_ball_125_2fl', name: '1-1/4" 2FL Ball Nose', manufacturer: 'McMaster-Carr', series: '8900A', partNumber: '8900A1250', type: 'endmill_ball', diameter: 1.25, flutes: 2, loc: 2.5, oal: 5, coating: 'TiAlN', material: 'carbide', shank: 1.25, maxRpm: 24000, quickShip: true, process: 'milling', geometry: { volume: 85467, surfaceArea: 14251, units: "mm3/mm2" } },
            { id: 'harvey_ball_lr_0062_2fl', name: '1/16" LR 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '845 Long Reach', partNumber: '845-062-LR', type: 'endmill_ball', diameter: 0.062, flutes: 2, loc: 0.187, oal: 2.5, reach: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, longReach: true, maxRpm: 403226, process: 'milling', geometry: { volume: 121, surfaceArea: 318, units: "mm3/mm2" } },
            { id: 'harvey_ball_lr_0093_2fl', name: '3/32" LR 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '845 Long Reach', partNumber: '845-093-LR', type: 'endmill_ball', diameter: 0.093, flutes: 2, loc: 0.281, oal: 2.5, reach: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.125, longReach: true, maxRpm: 268817, process: 'milling', geometry: { volume: 269, surfaceArea: 480, units: "mm3/mm2" } },
            { id: 'harvey_ball_lr_0125_2fl', name: '1/8" LR 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '845 Long Reach', partNumber: '845-125-LR', type: 'endmill_ball', diameter: 0.125, flutes: 2, loc: 0.375, oal: 3, reach: 2, coating: 'AlTiN', material: 'carbide', shank: 0.125, longReach: true, maxRpm: 200000, process: 'milling', geometry: { volume: 581, surfaceArea: 776, units: "mm3/mm2" } },
            { id: 'harvey_ball_lr_0187_2fl', name: '3/16" LR 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '845 Long Reach', partNumber: '845-187-LR', type: 'endmill_ball', diameter: 0.187, flutes: 2, loc: 0.562, oal: 3.5, reach: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.187, longReach: true, maxRpm: 133690, process: 'milling', geometry: { volume: 1499, surfaceArea: 1362, units: "mm3/mm2" } },
            { id: 'harvey_ball_lr_025_2fl', name: '1/4" LR 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '845 Long Reach', partNumber: '845-250-LR', type: 'endmill_ball', diameter: 0.25, flutes: 2, loc: 0.75, oal: 4, reach: 3, coating: 'AlTiN', material: 'carbide', shank: 0.25, longReach: true, maxRpm: 100000, process: 'milling', geometry: { volume: 3037, surfaceArea: 2090, units: "mm3/mm2" } },
            { id: 'harvey_ball_lr_0375_2fl', name: '3/8" LR 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '845 Long Reach', partNumber: '845-375-LR', type: 'endmill_ball', diameter: 0.375, flutes: 2, loc: 1.125, oal: 5, reach: 4, coating: 'AlTiN', material: 'carbide', shank: 0.375, longReach: true, maxRpm: 66667, process: 'milling', geometry: { volume: 8439, surfaceArea: 3943, units: "mm3/mm2" } },
            { id: 'harvey_ball_lr_05_2fl', name: '1/2" LR 2FL Ball Nose', manufacturer: 'Harvey Tool', series: '845 Long Reach', partNumber: '845-500-LR', type: 'endmill_ball', diameter: 0.5, flutes: 2, loc: 1.5, oal: 6, reach: 5, coating: 'AlTiN', material: 'carbide', shank: 0.5, longReach: true, maxRpm: 50000, process: 'milling', geometry: { volume: 17858, surfaceArea: 6334, units: "mm3/mm2" } },
            { id: 'helical_ball_4fl_025_4fl', name: '1/4" 4FL Ball Nose High Feed', manufacturer: 'Helical Solutions', series: 'H45B', partNumber: 'H45B-250', type: 'endmill_ball', diameter: 0.25, flutes: 4, loc: 0.5, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 112000, process: 'milling', geometry: { volume: 1890, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'helical_ball_4fl_0375_4fl', name: '3/8" 4FL Ball Nose High Feed', manufacturer: 'Helical Solutions', series: 'H45B', partNumber: 'H45B-375', type: 'endmill_ball', diameter: 0.375, flutes: 4, loc: 0.75, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.375, maxRpm: 74667, process: 'milling', geometry: { volume: 4118, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'helical_ball_4fl_05_4fl', name: '1/2" 4FL Ball Nose High Feed', manufacturer: 'Helical Solutions', series: 'H45B', partNumber: 'H45B-500', type: 'endmill_ball', diameter: 0.5, flutes: 4, loc: 1, oal: 3, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 56000, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'helical_ball_4fl_0625_4fl', name: '5/8" 4FL Ball Nose High Feed', manufacturer: 'Helical Solutions', series: 'H45B', partNumber: 'H45B-625', type: 'endmill_ball', diameter: 0.625, flutes: 4, loc: 1.25, oal: 3.5, coating: 'AlTiN', material: 'carbide', shank: 0.625, maxRpm: 44800, process: 'milling', geometry: { volume: 15711, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'helical_ball_4fl_075_4fl', name: '3/4" 4FL Ball Nose High Feed', manufacturer: 'Helical Solutions', series: 'H45B', partNumber: 'H45B-750', type: 'endmill_ball', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'AlTiN', material: 'carbide', shank: 0.75, maxRpm: 37333, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'helical_ball_4fl_1_4fl', name: '1" 4FL Ball Nose High Feed', manufacturer: 'Helical Solutions', series: 'H45B', partNumber: 'H45B-1000', type: 'endmill_ball', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'AlTiN', material: 'carbide', shank: 1, maxRpm: 28000, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'harvey_taperball_0031_1.5deg', name: '1/32" × 1.5° Tapered Ball', manufacturer: 'Harvey Tool', series: '847', partNumber: '847-031-T1.5', type: 'endmill_ball_tapered', diameter: 0.031, tipDiameter: 0.015, taperAngle: 1.5, flutes: 2, loc: 0.25, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.031, maxRpm: 806452, process: 'milling', geometry: { volume: 17, surfaceArea: 89, units: "mm3/mm2" } },
            { id: 'harvey_taperball_0062_1.5deg', name: '1/16" × 1.5° Tapered Ball', manufacturer: 'Harvey Tool', series: '847', partNumber: '847-062-T1.5', type: 'endmill_ball_tapered', diameter: 0.062, tipDiameter: 0.031, taperAngle: 1.5, flutes: 2, loc: 0.375, oal: 1.5, coating: 'AlTiN', material: 'carbide', shank: 0.062, maxRpm: 403226, process: 'milling', geometry: { volume: 61, surfaceArea: 172, units: "mm3/mm2" } },
            { id: 'harvey_taperball_0125_2deg', name: '1/8" × 2° Tapered Ball', manufacturer: 'Harvey Tool', series: '847', partNumber: '847-125-T2', type: 'endmill_ball_tapered', diameter: 0.125, tipDiameter: 0.062, taperAngle: 2, flutes: 2, loc: 0.5, oal: 2, coating: 'AlTiN', material: 'carbide', shank: 0.125, maxRpm: 200000, process: 'milling', geometry: { volume: 331, surfaceArea: 461, units: "mm3/mm2" } },
            { id: 'harvey_taperball_025_3deg', name: '1/4" × 3° Tapered Ball', manufacturer: 'Harvey Tool', series: '847', partNumber: '847-250-T3', type: 'endmill_ball_tapered', diameter: 0.25, tipDiameter: 0.125, taperAngle: 3, flutes: 2, loc: 0.75, oal: 2.5, coating: 'AlTiN', material: 'carbide', shank: 0.25, maxRpm: 100000, process: 'milling', geometry: { volume: 1594, surfaceArea: 1137, units: "mm3/mm2" } },
            { id: 'harvey_taperball_0375_3deg', name: '3/8" × 3° Tapered Ball', manufacturer: 'Harvey Tool', series: '847', partNumber: '847-375-T3', type: 'endmill_ball_tapered', diameter: 0.375, tipDiameter: 0.187, taperAngle: 3, flutes: 2, loc: 1, oal: 3, coating: 'AlTiN', material: 'carbide', shank: 0.375, maxRpm: 66667, process: 'milling', geometry: { volume: 4144, surfaceArea: 2006, units: "mm3/mm2" } },
            { id: 'harvey_taperball_05_5deg', name: '1/2" × 5° Tapered Ball', manufacturer: 'Harvey Tool', series: '847', partNumber: '847-500-T5', type: 'endmill_ball_tapered', diameter: 0.5, tipDiameter: 0.25, taperAngle: 5, flutes: 2, loc: 1.25, oal: 3.5, coating: 'AlTiN', material: 'carbide', shank: 0.5, maxRpm: 50000, process: 'milling', geometry: { volume: 8739, surfaceArea: 3194, units: "mm3/mm2" } },
            { id: 'emuge_barrel_025_r2', name: '1/4" R2.0 Barrel Cutter', manufacturer: 'Emuge', series: 'Circle Segment', partNumber: 'CS-250-R20', type: 'endmill_barrel', diameter: 0.25, ballRadius: 2, flutes: 4, loc: 0.375, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.25, maxRpm: 88000, process: 'milling', geometry: { volume: 1921, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'emuge_barrel_0375_r3', name: '3/8" R3.0 Barrel Cutter', manufacturer: 'Emuge', series: 'Circle Segment', partNumber: 'CS-375-R30', type: 'endmill_barrel', diameter: 0.375, ballRadius: 3, flutes: 4, loc: 0.5, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 58667, process: 'milling', geometry: { volume: 4253, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'emuge_barrel_05_r4', name: '1/2" R4.0 Barrel Cutter', manufacturer: 'Emuge', series: 'Circle Segment', partNumber: 'CS-500-R40', type: 'endmill_barrel', diameter: 0.5, ballRadius: 4, flutes: 4, loc: 0.625, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 44000, process: 'milling', geometry: { volume: 9049, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'emuge_barrel_05_r6', name: '1/2" R6.0 Barrel Cutter', manufacturer: 'Emuge', series: 'Circle Segment', partNumber: 'CS-500-R60', type: 'endmill_barrel', diameter: 0.5, ballRadius: 6, flutes: 4, loc: 0.75, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 44000, process: 'milling', geometry: { volume: 8929, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'emuge_barrel_0625_r5', name: '5/8" R5.0 Barrel Cutter', manufacturer: 'Emuge', series: 'Circle Segment', partNumber: 'CS-625-R50', type: 'endmill_barrel', diameter: 0.625, ballRadius: 5, flutes: 4, loc: 0.75, oal: 3.5, coating: 'TiAlN', material: 'carbide', shank: 0.625, maxRpm: 35200, process: 'milling', geometry: { volume: 16465, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'emuge_barrel_075_r6', name: '3/4" R6.0 Barrel Cutter', manufacturer: 'Emuge', series: 'Circle Segment', partNumber: 'CS-750-R60', type: 'endmill_barrel', diameter: 0.75, ballRadius: 6, flutes: 4, loc: 0.875, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 29333, process: 'milling', geometry: { volume: 27058, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'emuge_barrel_075_r10', name: '3/4" R10.0 Barrel Cutter', manufacturer: 'Emuge', series: 'Circle Segment', partNumber: 'CS-750-R100', type: 'endmill_barrel', diameter: 0.75, ballRadius: 10, flutes: 4, loc: 1, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 29333, process: 'milling', geometry: { volume: 26786, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'emuge_barrel_1_r8', name: '1" R8.0 Barrel Cutter', manufacturer: 'Emuge', series: 'Circle Segment', partNumber: 'CS-1000-R80', type: 'endmill_barrel', diameter: 1, ballRadius: 8, flutes: 4, loc: 1, oal: 4.5, coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 22000, process: 'milling', geometry: { volume: 54056, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'emuge_barrel_1_r15', name: '1" R15.0 Barrel Cutter', manufacturer: 'Emuge', series: 'Circle Segment', partNumber: 'CS-1000-R150', type: 'endmill_barrel', diameter: 1, ballRadius: 15, flutes: 4, loc: 1.25, oal: 4.5, coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 22000, process: 'milling', geometry: { volume: 53090, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'sandvik_barrel_05_r4', name: '1/2" R4.0 CoroMill Plura Barrel', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura Barrel', partNumber: '2B340-0050-R40', type: 'endmill_barrel', diameter: 0.5, ballRadius: 4, flutes: 4, loc: 0.625, oal: 3, coating: 'GC1640', material: 'carbide', shank: 0.5, maxRpm: 48000, process: 'milling', geometry: { volume: 9049, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'sandvik_barrel_05_r6', name: '1/2" R6.0 CoroMill Plura Barrel', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura Barrel', partNumber: '2B340-0050-R60', type: 'endmill_barrel', diameter: 0.5, ballRadius: 6, flutes: 4, loc: 0.75, oal: 3, coating: 'GC1640', material: 'carbide', shank: 0.5, maxRpm: 48000, process: 'milling', geometry: { volume: 8929, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'sandvik_barrel_0625_r5', name: '5/8" R5.0 CoroMill Plura Barrel', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura Barrel', partNumber: '2B340-0063-R50', type: 'endmill_barrel', diameter: 0.625, ballRadius: 5, flutes: 4, loc: 0.75, oal: 3.5, coating: 'GC1640', material: 'carbide', shank: 0.625, maxRpm: 38400, process: 'milling', geometry: { volume: 16465, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'sandvik_barrel_075_r6', name: '3/4" R6.0 CoroMill Plura Barrel', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura Barrel', partNumber: '2B340-0075-R60', type: 'endmill_barrel', diameter: 0.75, ballRadius: 6, flutes: 4, loc: 0.875, oal: 4, coating: 'GC1640', material: 'carbide', shank: 0.75, maxRpm: 32000, process: 'milling', geometry: { volume: 27058, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'sandvik_barrel_075_r10', name: '3/4" R10.0 CoroMill Plura Barrel', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura Barrel', partNumber: '2B340-0075-R100', type: 'endmill_barrel', diameter: 0.75, ballRadius: 10, flutes: 4, loc: 1, oal: 4, coating: 'GC1640', material: 'carbide', shank: 0.75, maxRpm: 32000, process: 'milling', geometry: { volume: 26786, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'sandvik_barrel_1_r8', name: '1" R8.0 CoroMill Plura Barrel', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura Barrel', partNumber: '2B340-0100-R80', type: 'endmill_barrel', diameter: 1, ballRadius: 8, flutes: 4, loc: 1, oal: 4.5, coating: 'GC1640', material: 'carbide', shank: 1, maxRpm: 24000, process: 'milling', geometry: { volume: 54056, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'sandvik_barrel_1_r15', name: '1" R15.0 CoroMill Plura Barrel', manufacturer: 'Sandvik Coromant', series: 'CoroMill Plura Barrel', partNumber: '2B340-0100-R150', type: 'endmill_barrel', diameter: 1, ballRadius: 15, flutes: 4, loc: 1.25, oal: 4.5, coating: 'GC1640', material: 'carbide', shank: 1, maxRpm: 24000, process: 'milling', geometry: { volume: 53090, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'iscar_lens_025_r0.5_1', name: '1/4" Lens Form Cutter', manufacturer: 'ISCAR', series: 'Multi-Master Lens', partNumber: 'MM-ELF-250-0.5R1R', type: 'endmill_lens', diameter: 0.25, radius1: 0.5, radius2: 1, flutes: 4, loc: 0.375, oal: 2.5, coating: 'IC900', material: 'carbide', shank: 0.25, maxRpm: 80000, process: 'milling', geometry: { volume: 1921, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'iscar_lens_0375_r0.75_1.5', name: '3/8" Lens Form Cutter', manufacturer: 'ISCAR', series: 'Multi-Master Lens', partNumber: 'MM-ELF-375-0.75R1.5R', type: 'endmill_lens', diameter: 0.375, radius1: 0.75, radius2: 1.5, flutes: 4, loc: 0.5, oal: 2.5, coating: 'IC900', material: 'carbide', shank: 0.375, maxRpm: 53333, process: 'milling', geometry: { volume: 4253, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'iscar_lens_05_r1_2', name: '1/2" Lens Form Cutter', manufacturer: 'ISCAR', series: 'Multi-Master Lens', partNumber: 'MM-ELF-500-1R2R', type: 'endmill_lens', diameter: 0.5, radius1: 1, radius2: 2, flutes: 4, loc: 0.625, oal: 3, coating: 'IC900', material: 'carbide', shank: 0.5, maxRpm: 40000, process: 'milling', geometry: { volume: 9049, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'iscar_lens_075_r1.5_3', name: '3/4" Lens Form Cutter', manufacturer: 'ISCAR', series: 'Multi-Master Lens', partNumber: 'MM-ELF-750-1.5R3R', type: 'endmill_lens', diameter: 0.75, radius1: 1.5, radius2: 3, flutes: 4, loc: 0.875, oal: 4, coating: 'IC900', material: 'carbide', shank: 0.75, maxRpm: 26667, process: 'milling', geometry: { volume: 27058, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'iscar_lens_1_r2_4', name: '1" Lens Form Cutter', manufacturer: 'ISCAR', series: 'Multi-Master Lens', partNumber: 'MM-ELF-1000-2R4R', type: 'endmill_lens', diameter: 1, radius1: 2, radius2: 4, flutes: 4, loc: 1, oal: 4.5, coating: 'IC900', material: 'carbide', shank: 1, maxRpm: 20000, process: 'milling', geometry: { volume: 54056, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_14', name: '1/4" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A038', type: 'endmill_tslot', cutterDiameter: 0.375, slotWidth: 0.156, boltSize: '1/4"', flutes: 4, shank: 0.25, oal: 2.25, coating: 'Uncoated', material: 'hss_m2', maxRpm: 8000, quickShip: true, process: 'milling', geometry: { volume: 1882, surfaceArea: 1322, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_516', name: '5/16" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A050', type: 'endmill_tslot', cutterDiameter: 0.5, slotWidth: 0.187, boltSize: '5/16"', flutes: 4, shank: 0.312, oal: 2.5, coating: 'Uncoated', material: 'hss_m2', maxRpm: 6000, quickShip: true, process: 'milling', geometry: { volume: 3319, surfaceArea: 1906, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_38', name: '3/8" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A063', type: 'endmill_tslot', cutterDiameter: 0.625, slotWidth: 0.218, boltSize: '3/8"', flutes: 4, shank: 0.375, oal: 2.75, coating: 'Uncoated', material: 'hss_m2', maxRpm: 4800, quickShip: true, process: 'milling', geometry: { volume: 5350, surfaceArea: 2596, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_716', name: '7/16" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A075', type: 'endmill_tslot', cutterDiameter: 0.75, slotWidth: 0.281, boltSize: '7/16"', flutes: 4, shank: 0.437, oal: 3, coating: 'Uncoated', material: 'hss_m2', maxRpm: 4000, quickShip: true, process: 'milling', geometry: { volume: 8107, surfaceArea: 3405, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_12', name: '1/2" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A088', type: 'endmill_tslot', cutterDiameter: 0.875, slotWidth: 0.312, boltSize: '1/2"', flutes: 4, shank: 0.5, oal: 3.25, coating: 'Uncoated', material: 'hss_m2', maxRpm: 3429, quickShip: true, process: 'milling', geometry: { volume: 11605, surfaceArea: 4307, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_916', name: '9/16" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A100', type: 'endmill_tslot', cutterDiameter: 1, slotWidth: 0.375, boltSize: '9/16"', flutes: 6, shank: 0.562, oal: 3.5, coating: 'Uncoated', material: 'hss_m2', maxRpm: 3000, quickShip: true, process: 'milling', geometry: { volume: 16082, surfaceArea: 5333, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_58', name: '5/8" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A113', type: 'endmill_tslot', cutterDiameter: 1.125, slotWidth: 0.437, boltSize: '5/8"', flutes: 6, shank: 0.625, oal: 3.75, coating: 'Uncoated', material: 'hss_m2', maxRpm: 2667, quickShip: true, process: 'milling', geometry: { volume: 21639, surfaceArea: 6476, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_34', name: '3/4" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A138', type: 'endmill_tslot', cutterDiameter: 1.375, slotWidth: 0.531, boltSize: '3/4"', flutes: 6, shank: 0.75, oal: 4, coating: 'Uncoated', material: 'hss_m2', maxRpm: 2182, quickShip: true, process: 'milling', geometry: { volume: 34159, surfaceArea: 8669, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_78', name: '7/8" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A163', type: 'endmill_tslot', cutterDiameter: 1.625, slotWidth: 0.625, boltSize: '7/8"', flutes: 6, shank: 0.875, oal: 4.25, coating: 'Uncoated', material: 'hss_m2', maxRpm: 1846, quickShip: true, process: 'milling', geometry: { volume: 50589, surfaceArea: 11163, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_1', name: '1" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A188', type: 'endmill_tslot', cutterDiameter: 1.875, slotWidth: 0.75, boltSize: '1"', flutes: 8, shank: 1, oal: 4.5, coating: 'Uncoated', material: 'hss_m2', maxRpm: 1600, quickShip: true, process: 'milling', geometry: { volume: 72019, surfaceArea: 14014, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_118', name: '1-1/8" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A213', type: 'endmill_tslot', cutterDiameter: 2.125, slotWidth: 0.875, boltSize: '1-1/8"', flutes: 8, shank: 1, oal: 4.75, coating: 'Uncoated', material: 'hss_m2', maxRpm: 1412, quickShip: true, process: 'milling', geometry: { volume: 85470, surfaceArea: 16199, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_hss_114', name: '1-1/4" T-Slot HSS', manufacturer: 'McMaster-Carr', series: '2734A', partNumber: '2734A250', type: 'endmill_tslot', cutterDiameter: 2.5, slotWidth: 1, boltSize: '1-1/4"', flutes: 8, shank: 1, oal: 5, coating: 'Uncoated', material: 'hss_m2', maxRpm: 1200, quickShip: true, process: 'milling', geometry: { volume: 107789, surfaceArea: 19508, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_carb_14', name: '1/4" T-Slot Carbide', manufacturer: 'McMaster-Carr', series: '8933A', partNumber: '8933A038', type: 'endmill_tslot', cutterDiameter: 0.375, slotWidth: 0.156, boltSize: '1/4"', flutes: 4, shank: 0.25, oal: 2.25, coating: 'TiN', material: 'carbide', maxRpm: 21333, quickShip: true, process: 'milling', geometry: { volume: 1882, surfaceArea: 1322, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_carb_516', name: '5/16" T-Slot Carbide', manufacturer: 'McMaster-Carr', series: '8933A', partNumber: '8933A050', type: 'endmill_tslot', cutterDiameter: 0.5, slotWidth: 0.187, boltSize: '5/16"', flutes: 4, shank: 0.312, oal: 2.5, coating: 'TiN', material: 'carbide', maxRpm: 16000, quickShip: true, process: 'milling', geometry: { volume: 3319, surfaceArea: 1906, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_carb_38', name: '3/8" T-Slot Carbide', manufacturer: 'McMaster-Carr', series: '8933A', partNumber: '8933A063', type: 'endmill_tslot', cutterDiameter: 0.625, slotWidth: 0.218, boltSize: '3/8"', flutes: 4, shank: 0.375, oal: 2.75, coating: 'TiN', material: 'carbide', maxRpm: 12800, quickShip: true, process: 'milling', geometry: { volume: 5350, surfaceArea: 2596, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_carb_716', name: '7/16" T-Slot Carbide', manufacturer: 'McMaster-Carr', series: '8933A', partNumber: '8933A075', type: 'endmill_tslot', cutterDiameter: 0.75, slotWidth: 0.281, boltSize: '7/16"', flutes: 4, shank: 0.437, oal: 3, coating: 'TiN', material: 'carbide', maxRpm: 10667, quickShip: true, process: 'milling', geometry: { volume: 8107, surfaceArea: 3405, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_carb_12', name: '1/2" T-Slot Carbide', manufacturer: 'McMaster-Carr', series: '8933A', partNumber: '8933A088', type: 'endmill_tslot', cutterDiameter: 0.875, slotWidth: 0.312, boltSize: '1/2"', flutes: 4, shank: 0.5, oal: 3.25, coating: 'TiN', material: 'carbide', maxRpm: 9143, quickShip: true, process: 'milling', geometry: { volume: 11605, surfaceArea: 4307, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_carb_916', name: '9/16" T-Slot Carbide', manufacturer: 'McMaster-Carr', series: '8933A', partNumber: '8933A100', type: 'endmill_tslot', cutterDiameter: 1, slotWidth: 0.375, boltSize: '9/16"', flutes: 6, shank: 0.562, oal: 3.5, coating: 'TiN', material: 'carbide', maxRpm: 8000, quickShip: true, process: 'milling', geometry: { volume: 16082, surfaceArea: 5333, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_carb_58', name: '5/8" T-Slot Carbide', manufacturer: 'McMaster-Carr', series: '8933A', partNumber: '8933A113', type: 'endmill_tslot', cutterDiameter: 1.125, slotWidth: 0.437, boltSize: '5/8"', flutes: 6, shank: 0.625, oal: 3.75, coating: 'TiN', material: 'carbide', maxRpm: 7111, quickShip: true, process: 'milling', geometry: { volume: 21639, surfaceArea: 6476, units: "mm3/mm2" } },
            { id: 'mcmaster_tslot_carb_34', name: '3/4" T-Slot Carbide', manufacturer: 'McMaster-Carr', series: '8933A', partNumber: '8933A138', type: 'endmill_tslot', cutterDiameter: 1.375, slotWidth: 0.531, boltSize: '3/4"', flutes: 6, shank: 0.75, oal: 4, coating: 'TiN', material: 'carbide', maxRpm: 5818, quickShip: true, process: 'milling', geometry: { volume: 34159, surfaceArea: 8669, units: "mm3/mm2" } },
            { id: 'harvey_tslot_14', name: '1/4" T-Slot Carbide', manufacturer: 'Harvey Tool', series: '975', partNumber: '975-375', type: 'endmill_tslot', cutterDiameter: 0.375, slotWidth: 0.156, boltSize: '1/4"', flutes: 4, shank: 0.25, oal: 2.25, coating: 'AlTiN', material: 'carbide', maxRpm: 26667, process: 'milling', geometry: { volume: 1882, surfaceArea: 1322, units: "mm3/mm2" } },
            { id: 'harvey_tslot_516', name: '5/16" T-Slot Carbide', manufacturer: 'Harvey Tool', series: '975', partNumber: '975-500', type: 'endmill_tslot', cutterDiameter: 0.5, slotWidth: 0.187, boltSize: '5/16"', flutes: 4, shank: 0.312, oal: 2.5, coating: 'AlTiN', material: 'carbide', maxRpm: 20000, process: 'milling', geometry: { volume: 3319, surfaceArea: 1906, units: "mm3/mm2" } },
            { id: 'harvey_tslot_38', name: '3/8" T-Slot Carbide', manufacturer: 'Harvey Tool', series: '975', partNumber: '975-625', type: 'endmill_tslot', cutterDiameter: 0.625, slotWidth: 0.218, boltSize: '3/8"', flutes: 4, shank: 0.375, oal: 2.75, coating: 'AlTiN', material: 'carbide', maxRpm: 16000, process: 'milling', geometry: { volume: 5350, surfaceArea: 2596, units: "mm3/mm2" } },
            { id: 'harvey_tslot_716', name: '7/16" T-Slot Carbide', manufacturer: 'Harvey Tool', series: '975', partNumber: '975-750', type: 'endmill_tslot', cutterDiameter: 0.75, slotWidth: 0.281, boltSize: '7/16"', flutes: 4, shank: 0.437, oal: 3, coating: 'AlTiN', material: 'carbide', maxRpm: 13333, process: 'milling', geometry: { volume: 8107, surfaceArea: 3405, units: "mm3/mm2" } },
            { id: 'harvey_tslot_12', name: '1/2" T-Slot Carbide', manufacturer: 'Harvey Tool', series: '975', partNumber: '975-875', type: 'endmill_tslot', cutterDiameter: 0.875, slotWidth: 0.312, boltSize: '1/2"', flutes: 4, shank: 0.5, oal: 3.25, coating: 'AlTiN', material: 'carbide', maxRpm: 11429, process: 'milling', geometry: { volume: 11605, surfaceArea: 4307, units: "mm3/mm2" } },
            { id: 'harvey_tslot_916', name: '9/16" T-Slot Carbide', manufacturer: 'Harvey Tool', series: '975', partNumber: '975-1000', type: 'endmill_tslot', cutterDiameter: 1, slotWidth: 0.375, boltSize: '9/16"', flutes: 6, shank: 0.562, oal: 3.5, coating: 'AlTiN', material: 'carbide', maxRpm: 10000, process: 'milling', geometry: { volume: 16082, surfaceArea: 5333, units: "mm3/mm2" } },
            { id: 'harvey_taper_0015_0.5deg', name: '0.015" × 1/2° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-015-T5', type: 'endmill_taper', tipDiameter: 0.015, taperAngle: 0.5, flutes: 2, loc: 0.5, oal: 2, shank: 0.125, coating: 'AlTiN', material: 'carbide', maxRpm: 240000, process: 'milling', geometry: { volume: 303, surfaceArea: 400, units: "mm3/mm2" } },
            { id: 'harvey_taper_0031_0.5deg', name: '1/32" × 1/2° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-031-T5', type: 'endmill_taper', tipDiameter: 0.031, taperAngle: 0.5, flutes: 2, loc: 0.75, oal: 2.5, shank: 0.187, coating: 'AlTiN', material: 'carbide', maxRpm: 160428, process: 'milling', geometry: { volume: 797, surfaceArea: 720, units: "mm3/mm2" } },
            { id: 'harvey_taper_0062_0.5deg', name: '1/16" × 1/2° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-062-T5', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 0.5, flutes: 2, loc: 1, oal: 3, shank: 0.25, coating: 'AlTiN', material: 'carbide', maxRpm: 120000, process: 'milling', geometry: { volume: 1654, surfaceArea: 1157, units: "mm3/mm2" } },
            { id: 'harvey_taper_0015_1deg', name: '0.015" × 1° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-015-T10', type: 'endmill_taper', tipDiameter: 0.015, taperAngle: 1, flutes: 2, loc: 0.5, oal: 2, shank: 0.125, coating: 'AlTiN', material: 'carbide', maxRpm: 240000, process: 'milling', geometry: { volume: 304, surfaceArea: 404, units: "mm3/mm2" } },
            { id: 'harvey_taper_0031_1deg', name: '1/32" × 1° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-031-T10', type: 'endmill_taper', tipDiameter: 0.031, taperAngle: 1, flutes: 2, loc: 0.75, oal: 2.5, shank: 0.187, coating: 'AlTiN', material: 'carbide', maxRpm: 160428, process: 'milling', geometry: { volume: 801, surfaceArea: 730, units: "mm3/mm2" } },
            { id: 'harvey_taper_0062_1deg', name: '1/16" × 1° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-062-T10', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 1, flutes: 2, loc: 1, oal: 3, shank: 0.25, coating: 'AlTiN', material: 'carbide', maxRpm: 120000, process: 'milling', geometry: { volume: 1667, surfaceArea: 1174, units: "mm3/mm2" } },
            { id: 'harvey_taper_0125_1deg', name: '1/8" × 1° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-125-T10', type: 'endmill_taper', tipDiameter: 0.125, taperAngle: 1, flutes: 4, loc: 1.25, oal: 3.5, shank: 0.375, coating: 'AlTiN', material: 'carbide', maxRpm: 80000, process: 'milling', geometry: { volume: 4317, surfaceArea: 2082, units: "mm3/mm2" } },
            { id: 'harvey_taper_0015_1.5deg', name: '0.015" × 1.5° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-015-T15', type: 'endmill_taper', tipDiameter: 0.015, taperAngle: 1.5, flutes: 2, loc: 0.5, oal: 2, shank: 0.125, coating: 'AlTiN', material: 'carbide', maxRpm: 240000, process: 'milling', geometry: { volume: 305, surfaceArea: 409, units: "mm3/mm2" } },
            { id: 'harvey_taper_0031_1.5deg', name: '1/32" × 1.5° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-031-T15', type: 'endmill_taper', tipDiameter: 0.031, taperAngle: 1.5, flutes: 2, loc: 0.75, oal: 2.5, shank: 0.187, coating: 'AlTiN', material: 'carbide', maxRpm: 160428, process: 'milling', geometry: { volume: 806, surfaceArea: 740, units: "mm3/mm2" } },
            { id: 'harvey_taper_0062_1.5deg', name: '1/16" × 1.5° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-062-T15', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 1.5, flutes: 2, loc: 1, oal: 3, shank: 0.25, coating: 'AlTiN', material: 'carbide', maxRpm: 120000, process: 'milling', geometry: { volume: 1681, surfaceArea: 1192, units: "mm3/mm2" } },
            { id: 'harvey_taper_0125_1.5deg', name: '1/8" × 1.5° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-125-T15', type: 'endmill_taper', tipDiameter: 0.125, taperAngle: 1.5, flutes: 4, loc: 1.25, oal: 3.5, shank: 0.375, coating: 'AlTiN', material: 'carbide', maxRpm: 80000, process: 'milling', geometry: { volume: 4356, surfaceArea: 2110, units: "mm3/mm2" } },
            { id: 'harvey_taper_0015_2deg', name: '0.015" × 2° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-015-T20', type: 'endmill_taper', tipDiameter: 0.015, taperAngle: 2, flutes: 2, loc: 0.5, oal: 2, shank: 0.125, coating: 'AlTiN', material: 'carbide', maxRpm: 240000, process: 'milling', geometry: { volume: 307, surfaceArea: 413, units: "mm3/mm2" } },
            { id: 'harvey_taper_0031_2deg', name: '1/32" × 2° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-031-T20', type: 'endmill_taper', tipDiameter: 0.031, taperAngle: 2, flutes: 2, loc: 0.75, oal: 2.5, shank: 0.187, coating: 'AlTiN', material: 'carbide', maxRpm: 160428, process: 'milling', geometry: { volume: 811, surfaceArea: 750, units: "mm3/mm2" } },
            { id: 'harvey_taper_0062_2deg', name: '1/16" × 2° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-062-T20', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 2, flutes: 2, loc: 1, oal: 3, shank: 0.25, coating: 'AlTiN', material: 'carbide', maxRpm: 120000, process: 'milling', geometry: { volume: 1697, surfaceArea: 1210, units: "mm3/mm2" } },
            { id: 'harvey_taper_0125_2deg', name: '1/8" × 2° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-125-T20', type: 'endmill_taper', tipDiameter: 0.125, taperAngle: 2, flutes: 4, loc: 1.25, oal: 3.5, shank: 0.375, coating: 'AlTiN', material: 'carbide', maxRpm: 80000, process: 'milling', geometry: { volume: 4400, surfaceArea: 2138, units: "mm3/mm2" } },
            { id: 'harvey_taper_0031_3deg', name: '1/32" × 3° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-031-T30', type: 'endmill_taper', tipDiameter: 0.031, taperAngle: 3, flutes: 2, loc: 0.75, oal: 2.5, shank: 0.187, coating: 'AlTiN', material: 'carbide', maxRpm: 160428, process: 'milling', geometry: { volume: 824, surfaceArea: 770, units: "mm3/mm2" } },
            { id: 'harvey_taper_0062_3deg', name: '1/16" × 3° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-062-T30', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 3, flutes: 4, loc: 1, oal: 3, shank: 0.25, coating: 'AlTiN', material: 'carbide', maxRpm: 120000, process: 'milling', geometry: { volume: 1735, surfaceArea: 1246, units: "mm3/mm2" } },
            { id: 'harvey_taper_0125_3deg', name: '1/8" × 3° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-125-T30', type: 'endmill_taper', tipDiameter: 0.125, taperAngle: 3, flutes: 4, loc: 1.25, oal: 3.5, shank: 0.375, coating: 'AlTiN', material: 'carbide', maxRpm: 80000, process: 'milling', geometry: { volume: 4497, surfaceArea: 2193, units: "mm3/mm2" } },
            { id: 'harvey_taper_0187_3deg', name: '3/16" × 3° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-187-T30', type: 'endmill_taper', tipDiameter: 0.187, taperAngle: 3, flutes: 4, loc: 1.5, oal: 4, shank: 0.5, coating: 'AlTiN', material: 'carbide', maxRpm: 60000, process: 'milling', geometry: { volume: 9025, surfaceArea: 3342, units: "mm3/mm2" } },
            { id: 'harvey_taper_0062_5deg', name: '1/16" × 5° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-062-T50', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 5, flutes: 4, loc: 1, oal: 3, shank: 0.25, coating: 'AlTiN', material: 'carbide', maxRpm: 120000, process: 'milling', geometry: { volume: 1833, surfaceArea: 1318, units: "mm3/mm2" } },
            { id: 'harvey_taper_0125_5deg', name: '1/8" × 5° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-125-T50', type: 'endmill_taper', tipDiameter: 0.125, taperAngle: 5, flutes: 4, loc: 1.25, oal: 3.5, shank: 0.375, coating: 'AlTiN', material: 'carbide', maxRpm: 80000, process: 'milling', geometry: { volume: 4736, surfaceArea: 2306, units: "mm3/mm2" } },
            { id: 'harvey_taper_0187_5deg', name: '3/16" × 5° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-187-T50', type: 'endmill_taper', tipDiameter: 0.187, taperAngle: 5, flutes: 4, loc: 1.5, oal: 4, shank: 0.5, coating: 'AlTiN', material: 'carbide', maxRpm: 60000, process: 'milling', geometry: { volume: 9490, surfaceArea: 3505, units: "mm3/mm2" } },
            { id: 'harvey_taper_025_5deg', name: '1/4" × 5° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-250-T50', type: 'endmill_taper', tipDiameter: 0.25, taperAngle: 5, flutes: 4, loc: 1.75, oal: 4.5, shank: 0.625, coating: 'AlTiN', material: 'carbide', maxRpm: 48000, process: 'milling', geometry: { volume: 16511, surfaceArea: 4919, units: "mm3/mm2" } },
            { id: 'harvey_taper_0062_7deg', name: '1/16" × 7° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-062-T70', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 7, flutes: 4, loc: 1, oal: 3, shank: 0.25, coating: 'AlTiN', material: 'carbide', maxRpm: 120000, process: 'milling', geometry: { volume: 1962, surfaceArea: 1391, units: "mm3/mm2" } },
            { id: 'harvey_taper_0125_7deg', name: '1/8" × 7° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-125-T70', type: 'endmill_taper', tipDiameter: 0.125, taperAngle: 7, flutes: 4, loc: 1.25, oal: 3.5, shank: 0.375, coating: 'AlTiN', material: 'carbide', maxRpm: 80000, process: 'milling', geometry: { volume: 5034, surfaceArea: 2421, units: "mm3/mm2" } },
            { id: 'harvey_taper_0187_7deg', name: '3/16" × 7° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-187-T70', type: 'endmill_taper', tipDiameter: 0.187, taperAngle: 7, flutes: 4, loc: 1.5, oal: 4, shank: 0.5, coating: 'AlTiN', material: 'carbide', maxRpm: 60000, process: 'milling', geometry: { volume: 10059, surfaceArea: 3670, units: "mm3/mm2" } },
            { id: 'harvey_taper_0062_10deg', name: '1/16" × 10° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-062-T100', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 10, flutes: 4, loc: 0.75, oal: 3, shank: 0.25, coating: 'AlTiN', material: 'carbide', maxRpm: 120000, process: 'milling', geometry: { volume: 2104, surfaceArea: 1440, units: "mm3/mm2" } },
            { id: 'harvey_taper_0125_10deg', name: '1/8" × 10° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-125-T100', type: 'endmill_taper', tipDiameter: 0.125, taperAngle: 10, flutes: 4, loc: 1, oal: 3.5, shank: 0.375, coating: 'AlTiN', material: 'carbide', maxRpm: 80000, process: 'milling', geometry: { volume: 5436, surfaceArea: 2520, units: "mm3/mm2" } },
            { id: 'harvey_taper_0187_10deg', name: '3/16" × 10° Taper EM', manufacturer: 'Harvey Tool', series: '850', partNumber: '850-187-T100', type: 'endmill_taper', tipDiameter: 0.187, taperAngle: 10, flutes: 4, loc: 1.25, oal: 4, shank: 0.5, coating: 'AlTiN', material: 'carbide', maxRpm: 60000, process: 'milling', geometry: { volume: 10900, surfaceArea: 3835, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0015_0.5deg', name: '0.015" × 1/2° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A0155', type: 'endmill_taper', tipDiameter: 0.015, taperAngle: 0.5, flutes: 2, loc: 0.5, oal: 2, shank: 0.125, coating: 'TiN', material: 'carbide', maxRpm: 200000, quickShip: true, process: 'milling', geometry: { volume: 303, surfaceArea: 400, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0031_0.5deg', name: '1/32" × 1/2° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A0315', type: 'endmill_taper', tipDiameter: 0.031, taperAngle: 0.5, flutes: 2, loc: 0.75, oal: 2.5, shank: 0.187, coating: 'TiN', material: 'carbide', maxRpm: 133690, quickShip: true, process: 'milling', geometry: { volume: 797, surfaceArea: 720, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0062_0.5deg', name: '1/16" × 1/2° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A0625', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 0.5, flutes: 2, loc: 1, oal: 3, shank: 0.25, coating: 'TiN', material: 'carbide', maxRpm: 100000, quickShip: true, process: 'milling', geometry: { volume: 1654, surfaceArea: 1157, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0015_1deg', name: '0.015" × 1° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A01510', type: 'endmill_taper', tipDiameter: 0.015, taperAngle: 1, flutes: 2, loc: 0.5, oal: 2, shank: 0.125, coating: 'TiN', material: 'carbide', maxRpm: 200000, quickShip: true, process: 'milling', geometry: { volume: 304, surfaceArea: 404, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0031_1deg', name: '1/32" × 1° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A03110', type: 'endmill_taper', tipDiameter: 0.031, taperAngle: 1, flutes: 2, loc: 0.75, oal: 2.5, shank: 0.187, coating: 'TiN', material: 'carbide', maxRpm: 133690, quickShip: true, process: 'milling', geometry: { volume: 801, surfaceArea: 730, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0062_1deg', name: '1/16" × 1° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A06210', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 1, flutes: 2, loc: 1, oal: 3, shank: 0.25, coating: 'TiN', material: 'carbide', maxRpm: 100000, quickShip: true, process: 'milling', geometry: { volume: 1667, surfaceArea: 1174, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0125_1deg', name: '1/8" × 1° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A12510', type: 'endmill_taper', tipDiameter: 0.125, taperAngle: 1, flutes: 4, loc: 1.25, oal: 3.5, shank: 0.375, coating: 'TiN', material: 'carbide', maxRpm: 66667, quickShip: true, process: 'milling', geometry: { volume: 4317, surfaceArea: 2082, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0015_1.5deg', name: '0.015" × 1.5° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A01515', type: 'endmill_taper', tipDiameter: 0.015, taperAngle: 1.5, flutes: 2, loc: 0.5, oal: 2, shank: 0.125, coating: 'TiN', material: 'carbide', maxRpm: 200000, quickShip: true, process: 'milling', geometry: { volume: 305, surfaceArea: 409, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0031_1.5deg', name: '1/32" × 1.5° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A03115', type: 'endmill_taper', tipDiameter: 0.031, taperAngle: 1.5, flutes: 2, loc: 0.75, oal: 2.5, shank: 0.187, coating: 'TiN', material: 'carbide', maxRpm: 133690, quickShip: true, process: 'milling', geometry: { volume: 806, surfaceArea: 740, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0062_1.5deg', name: '1/16" × 1.5° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A06215', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 1.5, flutes: 2, loc: 1, oal: 3, shank: 0.25, coating: 'TiN', material: 'carbide', maxRpm: 100000, quickShip: true, process: 'milling', geometry: { volume: 1681, surfaceArea: 1192, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0125_1.5deg', name: '1/8" × 1.5° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A12515', type: 'endmill_taper', tipDiameter: 0.125, taperAngle: 1.5, flutes: 4, loc: 1.25, oal: 3.5, shank: 0.375, coating: 'TiN', material: 'carbide', maxRpm: 66667, quickShip: true, process: 'milling', geometry: { volume: 4356, surfaceArea: 2110, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0015_2deg', name: '0.015" × 2° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A01520', type: 'endmill_taper', tipDiameter: 0.015, taperAngle: 2, flutes: 2, loc: 0.5, oal: 2, shank: 0.125, coating: 'TiN', material: 'carbide', maxRpm: 200000, quickShip: true, process: 'milling', geometry: { volume: 307, surfaceArea: 413, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0031_2deg', name: '1/32" × 2° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A03120', type: 'endmill_taper', tipDiameter: 0.031, taperAngle: 2, flutes: 2, loc: 0.75, oal: 2.5, shank: 0.187, coating: 'TiN', material: 'carbide', maxRpm: 133690, quickShip: true, process: 'milling', geometry: { volume: 811, surfaceArea: 750, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0062_2deg', name: '1/16" × 2° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A06220', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 2, flutes: 2, loc: 1, oal: 3, shank: 0.25, coating: 'TiN', material: 'carbide', maxRpm: 100000, quickShip: true, process: 'milling', geometry: { volume: 1697, surfaceArea: 1210, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0125_2deg', name: '1/8" × 2° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A12520', type: 'endmill_taper', tipDiameter: 0.125, taperAngle: 2, flutes: 4, loc: 1.25, oal: 3.5, shank: 0.375, coating: 'TiN', material: 'carbide', maxRpm: 66667, quickShip: true, process: 'milling', geometry: { volume: 4400, surfaceArea: 2138, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0031_3deg', name: '1/32" × 3° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A03130', type: 'endmill_taper', tipDiameter: 0.031, taperAngle: 3, flutes: 2, loc: 0.75, oal: 2.5, shank: 0.187, coating: 'TiN', material: 'carbide', maxRpm: 133690, quickShip: true, process: 'milling', geometry: { volume: 824, surfaceArea: 770, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0062_3deg', name: '1/16" × 3° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A06230', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 3, flutes: 4, loc: 1, oal: 3, shank: 0.25, coating: 'TiN', material: 'carbide', maxRpm: 100000, quickShip: true, process: 'milling', geometry: { volume: 1735, surfaceArea: 1246, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0125_3deg', name: '1/8" × 3° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A12530', type: 'endmill_taper', tipDiameter: 0.125, taperAngle: 3, flutes: 4, loc: 1.25, oal: 3.5, shank: 0.375, coating: 'TiN', material: 'carbide', maxRpm: 66667, quickShip: true, process: 'milling', geometry: { volume: 4497, surfaceArea: 2193, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0187_3deg', name: '3/16" × 3° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A18730', type: 'endmill_taper', tipDiameter: 0.187, taperAngle: 3, flutes: 4, loc: 1.5, oal: 4, shank: 0.5, coating: 'TiN', material: 'carbide', maxRpm: 50000, quickShip: true, process: 'milling', geometry: { volume: 9025, surfaceArea: 3342, units: "mm3/mm2" } },
            { id: 'mcmaster_taper_0062_5deg', name: '1/16" × 5° Taper EM', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A06250', type: 'endmill_taper', tipDiameter: 0.062, taperAngle: 5, flutes: 4, loc: 1, oal: 3, shank: 0.25, coating: 'TiN', material: 'carbide', maxRpm: 100000, quickShip: true, process: 'milling', geometry: { volume: 1833, surfaceArea: 1318, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0031_0062_2fl', name: '1/32" 2FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A031006', type: 'endmill_square', diameter: 0.031, flutes: 2, loc: 0.062, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 806452, quickShip: true, process: 'milling', geometry: { volume: 18, surfaceArea: 95, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0047_0093_2fl', name: '3/64" 2FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A047009', type: 'endmill_square', diameter: 0.047, flutes: 2, loc: 0.093, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 531915, quickShip: true, process: 'milling', geometry: { volume: 42, surfaceArea: 145, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0062_0125_4fl', name: '1/16" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A062013', type: 'endmill_square', diameter: 0.062, flutes: 4, loc: 0.125, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 403226, quickShip: true, process: 'milling', geometry: { volume: 72, surfaceArea: 192, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0078_0156_4fl', name: '5/64" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A078016', type: 'endmill_square', diameter: 0.078, flutes: 4, loc: 0.156, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 320513, quickShip: true, process: 'milling', geometry: { volume: 114, surfaceArea: 243, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0093_0187_4fl', name: '3/32" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A093019', type: 'endmill_square', diameter: 0.093, flutes: 4, loc: 0.187, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 268817, quickShip: true, process: 'milling', geometry: { volume: 161, surfaceArea: 292, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0109_0218_4fl', name: '7/64" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A109022', type: 'endmill_square', diameter: 0.109, flutes: 4, loc: 0.218, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 229358, quickShip: true, process: 'milling', geometry: { volume: 219, surfaceArea: 343, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0125_025_4fl', name: '1/8" Stub 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A125025', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.25, oal: 1.5, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 200000, quickShip: true, process: 'milling', geometry: { volume: 287, surfaceArea: 396, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0125_05_4fl', name: '1/8" Std 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A125050', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.5, oal: 2, coating: 'TiAlN', material: 'carbide', shank: 0.125, maxRpm: 200000, quickShip: true, process: 'milling', geometry: { volume: 372, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0156_0312_4fl', name: '5/32" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A156031', type: 'endmill_square', diameter: 0.156, flutes: 4, loc: 0.312, oal: 2, coating: 'TiAlN', material: 'carbide', shank: 0.156, maxRpm: 160256, quickShip: true, process: 'milling', geometry: { volume: 597, surfaceArea: 657, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0187_0375_4fl', name: '3/16" Stub 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A187038', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.375, oal: 2, coating: 'TiAlN', material: 'carbide', shank: 0.187, maxRpm: 133690, quickShip: true, process: 'milling', geometry: { volume: 849, surfaceArea: 793, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0187_0562_4fl', name: '3/16" Std 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A187056', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.562, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.187, maxRpm: 133690, quickShip: true, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0218_0437_4fl', name: '7/32" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A218044', type: 'endmill_square', diameter: 0.218, flutes: 4, loc: 0.437, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.218, maxRpm: 114679, quickShip: true, process: 'milling', geometry: { volume: 1449, surfaceArea: 1153, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_025_0375_4fl', name: '1/4" Stub 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A250038', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.375, oal: 2, coating: 'TiAlN', material: 'carbide', shank: 0.25, maxRpm: 100000, quickShip: true, process: 'milling', geometry: { volume: 1518, surfaceArea: 1077, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_025_075_4fl', name: '1/4" Std 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A250075', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.75, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.25, maxRpm: 100000, quickShip: true, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_025_1_4fl', name: '1/4" Long 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A250100', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 1, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.25, maxRpm: 100000, quickShip: true, process: 'milling', geometry: { volume: 2172, surfaceArea: 1583, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0281_0562_4fl', name: '9/32" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A281056', type: 'endmill_square', diameter: 0.281, flutes: 4, loc: 0.562, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.281, maxRpm: 88968, quickShip: true, process: 'milling', geometry: { volume: 2369, surfaceArea: 1504, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0312_05_4fl', name: '5/16" Stub 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A312050', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.5, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.312, maxRpm: 80128, quickShip: true, process: 'milling', geometry: { volume: 2944, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0312_0812_4fl', name: '5/16" Std 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A312081', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.812, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.312, maxRpm: 80128, quickShip: true, process: 'milling', geometry: { volume: 2827, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0343_0687_4fl', name: '11/32" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A343069', type: 'endmill_square', diameter: 0.343, flutes: 4, loc: 0.687, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.343, maxRpm: 72886, quickShip: true, process: 'milling', geometry: { volume: 3473, surfaceArea: 1857, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0375_05_4fl', name: '3/8" Stub 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A375050', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 0.5, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 66667, quickShip: true, process: 'milling', geometry: { volume: 4253, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0375_0875_4fl', name: '3/8" Std 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A375088', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 0.875, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 66667, quickShip: true, process: 'milling', geometry: { volume: 4050, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0375_15_4fl', name: '3/8" Long 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A375150', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 1.5, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 66667, quickShip: true, process: 'milling', geometry: { volume: 6425, surfaceArea: 3183, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0406_0812_4fl', name: '13/32" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A406081', type: 'endmill_square', diameter: 0.406, flutes: 4, loc: 0.812, oal: 2.75, coating: 'TiAlN', material: 'carbide', shank: 0.406, maxRpm: 61576, quickShip: true, process: 'milling', geometry: { volume: 5317, surfaceArea: 2430, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0437_0875_4fl', name: '7/16" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A437088', type: 'endmill_square', diameter: 0.437, flutes: 4, loc: 0.875, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.437, maxRpm: 57208, quickShip: true, process: 'milling', geometry: { volume: 6728, surfaceArea: 2851, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0468_0937_4fl', name: '15/32" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A468094', type: 'endmill_square', diameter: 0.468, flutes: 4, loc: 0.937, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.468, maxRpm: 53419, quickShip: true, process: 'milling', geometry: { volume: 7664, surfaceArea: 3068, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_05_0625_4fl', name: '1/2" Stub 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A500063', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 0.625, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 50000, quickShip: true, process: 'milling', geometry: { volume: 7441, surfaceArea: 2787, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_05_1_4fl', name: '1/2" Std 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A500100', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 50000, quickShip: true, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_05_1625_4fl', name: '1/2" Long 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A500163', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1.625, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 50000, quickShip: true, process: 'milling', geometry: { volume: 11302, surfaceArea: 4307, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_05_2_4fl', name: '1/2" XL 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A500200', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 2, oal: 4.5, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 50000, quickShip: true, process: 'milling', geometry: { volume: 12549, surfaceArea: 4814, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0562_1125_4fl', name: '9/16" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A562113', type: 'endmill_square', diameter: 0.562, flutes: 4, loc: 1.125, oal: 3.5, coating: 'TiAlN', material: 'carbide', shank: 0.562, maxRpm: 44484, quickShip: true, process: 'milling', geometry: { volume: 12856, surfaceArea: 4307, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0625_075_4fl', name: '5/8" Stub 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A625075', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 0.75, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.625, maxRpm: 40000, quickShip: true, process: 'milling', geometry: { volume: 13951, surfaceArea: 4196, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0625_125_4fl', name: '5/8" Std 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A625125', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.25, oal: 3.5, coating: 'TiAlN', material: 'carbide', shank: 0.625, maxRpm: 40000, quickShip: true, process: 'milling', geometry: { volume: 15711, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0625_2_4fl', name: '5/8" Long 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A625200', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 2, oal: 4.5, coating: 'TiAlN', material: 'carbide', shank: 0.625, maxRpm: 40000, quickShip: true, process: 'milling', geometry: { volume: 19607, surfaceArea: 6096, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0687_1375_4fl', name: '11/16" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A687138', type: 'endmill_square', diameter: 0.687, flutes: 4, loc: 1.375, oal: 3.75, coating: 'TiAlN', material: 'carbide', shank: 0.687, maxRpm: 36390, quickShip: true, process: 'milling', geometry: { volume: 20273, surfaceArea: 5700, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_075_1_4fl', name: '3/4" Stub 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A750100', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1, oal: 3.5, coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 33333, quickShip: true, process: 'milling', geometry: { volume: 23167, surfaceArea: 5890, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_075_15_4fl', name: '3/4" Std 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A750150', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 33333, quickShip: true, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_075_225_4fl', name: '3/4" Long 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A750225', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 2.25, oal: 5, coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 33333, quickShip: true, process: 'milling', geometry: { volume: 31311, surfaceArea: 8171, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0812_1625_4fl', name: '13/16" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A812163', type: 'endmill_square', diameter: 0.812, flutes: 4, loc: 1.625, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.812, maxRpm: 30788, quickShip: true, process: 'milling', geometry: { volume: 29807, surfaceArea: 7251, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0875_175_4fl', name: '7/8" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A875175', type: 'endmill_square', diameter: 0.875, flutes: 4, loc: 1.75, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.875, maxRpm: 28571, quickShip: true, process: 'milling', geometry: { volume: 34242, surfaceArea: 7870, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_0937_1875_4fl', name: '15/16" 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A937188', type: 'endmill_square', diameter: 0.937, flutes: 4, loc: 1.875, oal: 4.25, coating: 'TiAlN', material: 'carbide', shank: 0.937, maxRpm: 26681, quickShip: true, process: 'milling', geometry: { volume: 41668, surfaceArea: 8961, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_1_125_4fl', name: '1" Stub 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A1000125', type: 'endmill_square', diameter: 1, flutes: 4, loc: 1.25, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 25000, quickShip: true, process: 'milling', geometry: { volume: 46655, surfaceArea: 9121, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_1_2_4fl', name: '1" Std 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A1000200', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 25000, quickShip: true, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_carb_1_3_4fl', name: '1" Long 4FL Carbide', manufacturer: 'McMaster-Carr', series: '8878A', partNumber: '8878A1000300', type: 'endmill_square', diameter: 1, flutes: 4, loc: 3, oal: 6, coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 25000, quickShip: true, process: 'milling', geometry: { volume: 65639, surfaceArea: 13174, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_0125_4fl', name: '1/8" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.375, oal: 2.25, coating: 'Uncoated', material: 'hss_m2', shank: 0.125, maxRpm: 64000, quickShip: true, process: 'milling', geometry: { volume: 430, surfaceArea: 586, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_0187_4fl', name: '3/16" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.5, oal: 2.5, coating: 'Uncoated', material: 'hss_m2', shank: 0.187, maxRpm: 42781, quickShip: true, process: 'milling', geometry: { volume: 1058, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_025_4fl', name: '1/4" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.625, oal: 2.5, coating: 'Uncoated', material: 'hss_m2', shank: 0.25, maxRpm: 32000, quickShip: true, process: 'milling', geometry: { volume: 1860, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_0312_4fl', name: '5/16" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.75, oal: 2.5, coating: 'Uncoated', material: 'hss_m2', shank: 0.312, maxRpm: 25641, quickShip: true, process: 'milling', geometry: { volume: 2850, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_0375_4fl', name: '3/8" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 0.875, oal: 2.75, coating: 'Uncoated', material: 'hss_m2', shank: 0.375, maxRpm: 21333, quickShip: true, process: 'milling', geometry: { volume: 4502, surfaceArea: 2233, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_0437_4fl', name: '7/16" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A437', type: 'endmill_square', diameter: 0.437, flutes: 4, loc: 1, oal: 3, coating: 'Uncoated', material: 'hss_m2', shank: 0.437, maxRpm: 18307, quickShip: true, process: 'milling', geometry: { volume: 6636, surfaceArea: 2851, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_05_4fl', name: '1/2" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1, oal: 3.25, coating: 'Uncoated', material: 'hss_m2', shank: 0.5, maxRpm: 16000, quickShip: true, process: 'milling', geometry: { volume: 9492, surfaceArea: 3547, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_0562_4fl', name: '9/16" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A562', type: 'endmill_square', diameter: 0.562, flutes: 4, loc: 1.125, oal: 3.5, coating: 'Uncoated', material: 'hss_m2', shank: 0.562, maxRpm: 14235, quickShip: true, process: 'milling', geometry: { volume: 12856, surfaceArea: 4307, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_0625_4fl', name: '5/8" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.25, oal: 3.5, coating: 'Uncoated', material: 'hss_m2', shank: 0.625, maxRpm: 12800, quickShip: true, process: 'milling', geometry: { volume: 15711, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_075_4fl', name: '3/4" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'Uncoated', material: 'hss_m2', shank: 0.75, maxRpm: 10667, quickShip: true, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_0875_4fl', name: '7/8" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A875', type: 'endmill_square', diameter: 0.875, flutes: 4, loc: 1.625, oal: 4, coating: 'Uncoated', material: 'hss_m2', shank: 0.875, maxRpm: 9143, quickShip: true, process: 'milling', geometry: { volume: 34612, surfaceArea: 7870, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_hss_1_4fl', name: '1" 4FL HSS', manufacturer: 'McMaster-Carr', series: '2736A', partNumber: '2736A1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'Uncoated', material: 'hss_m2', shank: 1, maxRpm: 8000, quickShip: true, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_0125_4fl', name: '1/8" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A125', type: 'endmill_square', diameter: 0.125, flutes: 4, loc: 0.375, oal: 2.25, coating: 'TiN', material: 'cobalt_m42', shank: 0.125, maxRpm: 96000, quickShip: true, process: 'milling', geometry: { volume: 430, surfaceArea: 586, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_0187_4fl', name: '3/16" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A187', type: 'endmill_square', diameter: 0.187, flutes: 4, loc: 0.5, oal: 2.5, coating: 'TiN', material: 'cobalt_m42', shank: 0.187, maxRpm: 64171, quickShip: true, process: 'milling', geometry: { volume: 1058, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_025_4fl', name: '1/4" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A250', type: 'endmill_square', diameter: 0.25, flutes: 4, loc: 0.625, oal: 2.5, coating: 'TiN', material: 'cobalt_m42', shank: 0.25, maxRpm: 48000, quickShip: true, process: 'milling', geometry: { volume: 1860, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_0312_4fl', name: '5/16" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A312', type: 'endmill_square', diameter: 0.312, flutes: 4, loc: 0.75, oal: 2.5, coating: 'TiN', material: 'cobalt_m42', shank: 0.312, maxRpm: 38462, quickShip: true, process: 'milling', geometry: { volume: 2850, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_0375_4fl', name: '3/8" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A375', type: 'endmill_square', diameter: 0.375, flutes: 4, loc: 0.875, oal: 2.75, coating: 'TiN', material: 'cobalt_m42', shank: 0.375, maxRpm: 32000, quickShip: true, process: 'milling', geometry: { volume: 4502, surfaceArea: 2233, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_0437_4fl', name: '7/16" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A437', type: 'endmill_square', diameter: 0.437, flutes: 4, loc: 1, oal: 3, coating: 'TiN', material: 'cobalt_m42', shank: 0.437, maxRpm: 27460, quickShip: true, process: 'milling', geometry: { volume: 6636, surfaceArea: 2851, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_05_4fl', name: '1/2" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A500', type: 'endmill_square', diameter: 0.5, flutes: 4, loc: 1, oal: 3.25, coating: 'TiN', material: 'cobalt_m42', shank: 0.5, maxRpm: 24000, quickShip: true, process: 'milling', geometry: { volume: 9492, surfaceArea: 3547, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_0562_4fl', name: '9/16" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A562', type: 'endmill_square', diameter: 0.562, flutes: 4, loc: 1.125, oal: 3.5, coating: 'TiN', material: 'cobalt_m42', shank: 0.562, maxRpm: 21352, quickShip: true, process: 'milling', geometry: { volume: 12856, surfaceArea: 4307, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_0625_4fl', name: '5/8" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A625', type: 'endmill_square', diameter: 0.625, flutes: 4, loc: 1.25, oal: 3.5, coating: 'TiN', material: 'cobalt_m42', shank: 0.625, maxRpm: 19200, quickShip: true, process: 'milling', geometry: { volume: 15711, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_075_4fl', name: '3/4" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A750', type: 'endmill_square', diameter: 0.75, flutes: 4, loc: 1.5, oal: 4, coating: 'TiN', material: 'cobalt_m42', shank: 0.75, maxRpm: 16000, quickShip: true, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_0875_4fl', name: '7/8" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A875', type: 'endmill_square', diameter: 0.875, flutes: 4, loc: 1.625, oal: 4, coating: 'TiN', material: 'cobalt_m42', shank: 0.875, maxRpm: 13714, quickShip: true, process: 'milling', geometry: { volume: 34612, surfaceArea: 7870, units: "mm3/mm2" } },
            { id: 'mcmaster_sq_cobalt_1_4fl', name: '1" 4FL Cobalt', manufacturer: 'McMaster-Carr', series: '8977A', partNumber: '8977A1000', type: 'endmill_square', diameter: 1, flutes: 4, loc: 2, oal: 4.5, coating: 'TiN', material: 'cobalt_m42', shank: 1, maxRpm: 12000, quickShip: true, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'mcmaster_2fl_alum_0125_2fl', name: '1/8" 2FL Aluminum', manufacturer: 'McMaster-Carr', series: '8878T', partNumber: '8878T125', type: 'endmill_square', diameter: 0.125, flutes: 2, loc: 0.375, oal: 2, coating: 'ZrN', material: 'carbide', shank: 0.125, polished: true, maxRpm: 320000, targetMaterial: 'Aluminum', quickShip: true, process: 'milling', geometry: { volume: 380, surfaceArea: 523, units: "mm3/mm2" } },
            { id: 'mcmaster_2fl_alum_0187_2fl', name: '3/16" 2FL Aluminum', manufacturer: 'McMaster-Carr', series: '8878T', partNumber: '8878T187', type: 'endmill_square', diameter: 0.187, flutes: 2, loc: 0.562, oal: 2.5, coating: 'ZrN', material: 'carbide', shank: 0.187, polished: true, maxRpm: 213904, targetMaterial: 'Aluminum', quickShip: true, process: 'milling', geometry: { volume: 1049, surfaceArea: 983, units: "mm3/mm2" } },
            { id: 'mcmaster_2fl_alum_025_2fl', name: '1/4" 2FL Aluminum', manufacturer: 'McMaster-Carr', series: '8878T', partNumber: '8878T250', type: 'endmill_square', diameter: 0.25, flutes: 2, loc: 0.75, oal: 2.5, coating: 'ZrN', material: 'carbide', shank: 0.25, polished: true, maxRpm: 160000, targetMaterial: 'Aluminum', quickShip: true, process: 'milling', geometry: { volume: 1830, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'mcmaster_2fl_alum_0312_2fl', name: '5/16" 2FL Aluminum', manufacturer: 'McMaster-Carr', series: '8878T', partNumber: '8878T312', type: 'endmill_square', diameter: 0.312, flutes: 2, loc: 0.937, oal: 2.5, coating: 'ZrN', material: 'carbide', shank: 0.312, polished: true, maxRpm: 128205, targetMaterial: 'Aluminum', quickShip: true, process: 'milling', geometry: { volume: 2780, surfaceArea: 1680, units: "mm3/mm2" } },
            { id: 'mcmaster_2fl_alum_0375_2fl', name: '3/8" 2FL Aluminum', manufacturer: 'McMaster-Carr', series: '8878T', partNumber: '8878T375', type: 'endmill_square', diameter: 0.375, flutes: 2, loc: 1.125, oal: 2.5, coating: 'ZrN', material: 'carbide', shank: 0.375, polished: true, maxRpm: 106667, targetMaterial: 'Aluminum', quickShip: true, process: 'milling', geometry: { volume: 3914, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'mcmaster_2fl_alum_05_2fl', name: '1/2" 2FL Aluminum', manufacturer: 'McMaster-Carr', series: '8878T', partNumber: '8878T500', type: 'endmill_square', diameter: 0.5, flutes: 2, loc: 1.25, oal: 3, coating: 'ZrN', material: 'carbide', shank: 0.5, polished: true, maxRpm: 80000, targetMaterial: 'Aluminum', quickShip: true, process: 'milling', geometry: { volume: 8446, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'mcmaster_2fl_alum_0625_2fl', name: '5/8" 2FL Aluminum', manufacturer: 'McMaster-Carr', series: '8878T', partNumber: '8878T625', type: 'endmill_square', diameter: 0.625, flutes: 2, loc: 1.562, oal: 3.5, coating: 'ZrN', material: 'carbide', shank: 0.625, polished: true, maxRpm: 64000, targetMaterial: 'Aluminum', quickShip: true, process: 'milling', geometry: { volume: 15240, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'mcmaster_2fl_alum_075_2fl', name: '3/4" 2FL Aluminum', manufacturer: 'McMaster-Carr', series: '8878T', partNumber: '8878T750', type: 'endmill_square', diameter: 0.75, flutes: 2, loc: 1.5, oal: 4, coating: 'ZrN', material: 'carbide', shank: 0.75, polished: true, maxRpm: 53333, targetMaterial: 'Aluminum', quickShip: true, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'mcmaster_2fl_alum_1_2fl', name: '1" 2FL Aluminum', manufacturer: 'McMaster-Carr', series: '8878T', partNumber: '8878T1000', type: 'endmill_square', diameter: 1, flutes: 2, loc: 2, oal: 4.5, coating: 'ZrN', material: 'carbide', shank: 1, polished: true, maxRpm: 40000, targetMaterial: 'Aluminum', quickShip: true, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_025_0015_4fl', name: '1/4" × 0.015R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A250-15', type: 'endmill_corner_radius', diameter: 0.25, cornerRadius: 0.015, flutes: 4, loc: 0.5, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.25, maxRpm: 100000, quickShip: true, process: 'milling', geometry: { volume: 1890, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_025_0031_4fl', name: '1/4" × 0.031R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A250-31', type: 'endmill_corner_radius', diameter: 0.25, cornerRadius: 0.031, flutes: 4, loc: 0.5, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.25, maxRpm: 100000, quickShip: true, process: 'milling', geometry: { volume: 1890, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_0375_0015_4fl', name: '3/8" × 0.015R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A375-15', type: 'endmill_corner_radius', diameter: 0.375, cornerRadius: 0.015, flutes: 4, loc: 0.75, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 66667, quickShip: true, process: 'milling', geometry: { volume: 4118, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_0375_0031_4fl', name: '3/8" × 0.031R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A375-31', type: 'endmill_corner_radius', diameter: 0.375, cornerRadius: 0.031, flutes: 4, loc: 0.75, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 66667, quickShip: true, process: 'milling', geometry: { volume: 4118, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_0375_0062_4fl', name: '3/8" × 0.062R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A375-62', type: 'endmill_corner_radius', diameter: 0.375, cornerRadius: 0.062, flutes: 4, loc: 0.75, oal: 2.5, coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 66667, quickShip: true, process: 'milling', geometry: { volume: 4118, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_05_0015_4fl', name: '1/2" × 0.015R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A500-15', type: 'endmill_corner_radius', diameter: 0.5, cornerRadius: 0.015, flutes: 4, loc: 1, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 50000, quickShip: true, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_05_0031_4fl', name: '1/2" × 0.031R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A500-31', type: 'endmill_corner_radius', diameter: 0.5, cornerRadius: 0.031, flutes: 4, loc: 1, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 50000, quickShip: true, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_05_0062_4fl', name: '1/2" × 0.062R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A500-62', type: 'endmill_corner_radius', diameter: 0.5, cornerRadius: 0.062, flutes: 4, loc: 1, oal: 3, coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 50000, quickShip: true, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_0625_0031_4fl', name: '5/8" × 0.031R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A625-31', type: 'endmill_corner_radius', diameter: 0.625, cornerRadius: 0.031, flutes: 4, loc: 1.25, oal: 3.5, coating: 'TiAlN', material: 'carbide', shank: 0.625, maxRpm: 40000, quickShip: true, process: 'milling', geometry: { volume: 15711, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_0625_0062_4fl', name: '5/8" × 0.062R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A625-62', type: 'endmill_corner_radius', diameter: 0.625, cornerRadius: 0.062, flutes: 4, loc: 1.25, oal: 3.5, coating: 'TiAlN', material: 'carbide', shank: 0.625, maxRpm: 40000, quickShip: true, process: 'milling', geometry: { volume: 15711, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_075_0031_4fl', name: '3/4" × 0.031R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A750-31', type: 'endmill_corner_radius', diameter: 0.75, cornerRadius: 0.031, flutes: 4, loc: 1.5, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 33333, quickShip: true, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_075_0062_4fl', name: '3/4" × 0.062R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A750-62', type: 'endmill_corner_radius', diameter: 0.75, cornerRadius: 0.062, flutes: 4, loc: 1.5, oal: 4, coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 33333, quickShip: true, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_1_0031_4fl', name: '1" × 0.031R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A1000-31', type: 'endmill_corner_radius', diameter: 1, cornerRadius: 0.031, flutes: 4, loc: 2, oal: 4.5, coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 25000, quickShip: true, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'mcmaster_cr_1_0062_4fl', name: '1" × 0.062R 4FL Corner Radius', manufacturer: 'McMaster-Carr', series: '8880A', partNumber: '8880A1000-62', type: 'endmill_corner_radius', diameter: 1, cornerRadius: 0.062, flutes: 4, loc: 2, oal: 4.5, coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 25000, quickShip: true, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'mcmaster_rough_0375_4fl', name: '3/8" 4FL Roughing', manufacturer: 'McMaster-Carr', series: '8884A', partNumber: '8884A375', type: 'endmill_roughing', diameter: 0.375, flutes: 4, loc: 0.875, oal: 2.5, chipbreaker: 'Coarse', coating: 'TiAlN', material: 'carbide', shank: 0.375, maxRpm: 48000, quickShip: true, process: 'milling', geometry: { volume: 4050, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'mcmaster_rough_05_4fl', name: '1/2" 4FL Roughing', manufacturer: 'McMaster-Carr', series: '8884A', partNumber: '8884A500', type: 'endmill_roughing', diameter: 0.5, flutes: 4, loc: 1, oal: 3, chipbreaker: 'Coarse', coating: 'TiAlN', material: 'carbide', shank: 0.5, maxRpm: 36000, quickShip: true, process: 'milling', geometry: { volume: 8687, surfaceArea: 3294, units: "mm3/mm2" } },
            { id: 'mcmaster_rough_0625_4fl', name: '5/8" 4FL Roughing', manufacturer: 'McMaster-Carr', series: '8884A', partNumber: '8884A625', type: 'endmill_roughing', diameter: 0.625, flutes: 4, loc: 1.25, oal: 3.5, chipbreaker: 'Coarse', coating: 'TiAlN', material: 'carbide', shank: 0.625, maxRpm: 28800, quickShip: true, process: 'milling', geometry: { volume: 15711, surfaceArea: 4830, units: "mm3/mm2" } },
            { id: 'mcmaster_rough_075_5fl', name: '3/4" 5FL Roughing', manufacturer: 'McMaster-Carr', series: '8884A', partNumber: '8884A750', type: 'endmill_roughing', diameter: 0.75, flutes: 5, loc: 1.5, oal: 4, chipbreaker: 'Coarse', coating: 'TiAlN', material: 'carbide', shank: 0.75, maxRpm: 24000, quickShip: true, process: 'milling', geometry: { volume: 25701, surfaceArea: 6651, units: "mm3/mm2" } },
            { id: 'mcmaster_rough_1_5fl', name: '1" 5FL Roughing', manufacturer: 'McMaster-Carr', series: '8884A', partNumber: '8884A1000', type: 'endmill_roughing', diameter: 1, flutes: 5, loc: 2, oal: 4.5, chipbreaker: 'Coarse', coating: 'TiAlN', material: 'carbide', shank: 1, maxRpm: 18000, quickShip: true, process: 'milling', geometry: { volume: 50194, surfaceArea: 10134, units: "mm3/mm2" } },
            { id: 'mcmaster_rough_125_5fl', name: '1-1/4" 5FL Roughing', manufacturer: 'McMaster-Carr', series: '8884A', partNumber: '8884A1250', type: 'endmill_roughing', diameter: 1.25, flutes: 5, loc: 2, oal: 4.75, chipbreaker: 'Coarse', coating: 'TiAlN', material: 'carbide', shank: 1.25, maxRpm: 14400, quickShip: true, process: 'milling', geometry: { volume: 83456, surfaceArea: 13618, units: "mm3/mm2" } },
            { id: 'mcmaster_rough_15_6fl', name: '1-1/2" 6FL Roughing', manufacturer: 'McMaster-Carr', series: '8884A', partNumber: '8884A1500', type: 'endmill_roughing', diameter: 1.5, flutes: 6, loc: 2, oal: 5, chipbreaker: 'Coarse', coating: 'TiAlN', material: 'carbide', shank: 1.5, maxRpm: 12000, quickShip: true, process: 'milling', geometry: { volume: 127417, surfaceArea: 17481, units: "mm3/mm2" } },
            { id: 'mcmaster_dovetail_0375_45deg', name: '3/8" × 45° Dovetail', manufacturer: 'McMaster-Carr', series: '8882A', partNumber: '8882A37545', type: 'endmill_dovetail', cutterDiameter: 0.375, dovetailAngle: 45, flutes: 4, loc: 0.187, oal: 2.25, shank: 0.25, coating: 'TiN', material: 'carbide', maxRpm: 26667, quickShip: true, process: 'milling', geometry: { volume: 1896, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'mcmaster_dovetail_05_45deg', name: '1/2" × 45° Dovetail', manufacturer: 'McMaster-Carr', series: '8882A', partNumber: '8882A50045', type: 'endmill_dovetail', cutterDiameter: 0.5, dovetailAngle: 45, flutes: 4, loc: 0.25, oal: 2.5, shank: 0.312, coating: 'TiN', material: 'carbide', maxRpm: 20000, quickShip: true, process: 'milling', geometry: { volume: 3382, surfaceArea: 1930, units: "mm3/mm2" } },
            { id: 'mcmaster_dovetail_0625_45deg', name: '5/8" × 45° Dovetail', manufacturer: 'McMaster-Carr', series: '8882A', partNumber: '8882A62545', type: 'endmill_dovetail', cutterDiameter: 0.625, dovetailAngle: 45, flutes: 4, loc: 0.312, oal: 2.75, shank: 0.375, coating: 'TiN', material: 'carbide', maxRpm: 16000, quickShip: true, process: 'milling', geometry: { volume: 5511, surfaceArea: 2644, units: "mm3/mm2" } },
            { id: 'mcmaster_dovetail_075_45deg', name: '3/4" × 45° Dovetail', manufacturer: 'McMaster-Carr', series: '8882A', partNumber: '8882A75045', type: 'endmill_dovetail', cutterDiameter: 0.75, dovetailAngle: 45, flutes: 4, loc: 0.375, oal: 3, shank: 0.437, coating: 'TiN', material: 'carbide', maxRpm: 13333, quickShip: true, process: 'milling', geometry: { volume: 8352, surfaceArea: 3465, units: "mm3/mm2" } },
            { id: 'mcmaster_dovetail_1_45deg', name: '1" × 45° Dovetail', manufacturer: 'McMaster-Carr', series: '8882A', partNumber: '8882A100045', type: 'endmill_dovetail', cutterDiameter: 1, dovetailAngle: 45, flutes: 6, loc: 0.5, oal: 3.5, shank: 0.5, coating: 'TiN', material: 'carbide', maxRpm: 10000, quickShip: true, process: 'milling', geometry: { volume: 14157, surfaceArea: 5067, units: "mm3/mm2" } },
            { id: 'mcmaster_dovetail_0375_60deg', name: '3/8" × 60° Dovetail', manufacturer: 'McMaster-Carr', series: '8882A', partNumber: '8882A37560', type: 'endmill_dovetail', cutterDiameter: 0.375, dovetailAngle: 60, flutes: 4, loc: 0.187, oal: 2.25, shank: 0.25, coating: 'TiN', material: 'carbide', maxRpm: 26667, quickShip: true, process: 'milling', geometry: { volume: 1896, surfaceArea: 1330, units: "mm3/mm2" } },
            { id: 'mcmaster_dovetail_05_60deg', name: '1/2" × 60° Dovetail', manufacturer: 'McMaster-Carr', series: '8882A', partNumber: '8882A50060', type: 'endmill_dovetail', cutterDiameter: 0.5, dovetailAngle: 60, flutes: 4, loc: 0.25, oal: 2.5, shank: 0.312, coating: 'TiN', material: 'carbide', maxRpm: 20000, quickShip: true, process: 'milling', geometry: { volume: 3382, surfaceArea: 1930, units: "mm3/mm2" } },
            { id: 'mcmaster_dovetail_0625_60deg', name: '5/8" × 60° Dovetail', manufacturer: 'McMaster-Carr', series: '8882A', partNumber: '8882A62560', type: 'endmill_dovetail', cutterDiameter: 0.625, dovetailAngle: 60, flutes: 4, loc: 0.312, oal: 2.75, shank: 0.375, coating: 'TiN', material: 'carbide', maxRpm: 16000, quickShip: true, process: 'milling', geometry: { volume: 5511, surfaceArea: 2644, units: "mm3/mm2" } },
            { id: 'mcmaster_dovetail_075_60deg', name: '3/4" × 60° Dovetail', manufacturer: 'McMaster-Carr', series: '8882A', partNumber: '8882A75060', type: 'endmill_dovetail', cutterDiameter: 0.75, dovetailAngle: 60, flutes: 4, loc: 0.375, oal: 3, shank: 0.437, coating: 'TiN', material: 'carbide', maxRpm: 13333, quickShip: true, process: 'milling', geometry: { volume: 8352, surfaceArea: 3465, units: "mm3/mm2" } },
            { id: 'mcmaster_dovetail_1_60deg', name: '1" × 60° Dovetail', manufacturer: 'McMaster-Carr', series: '8882A', partNumber: '8882A100060', type: 'endmill_dovetail', cutterDiameter: 1, dovetailAngle: 60, flutes: 6, loc: 0.5, oal: 3.5, shank: 0.5, coating: 'TiN', material: 'carbide', maxRpm: 10000, quickShip: true, process: 'milling', geometry: { volume: 14157, surfaceArea: 5067, units: "mm3/mm2" } },
            { id: 'mcmaster_woodruff_202', name: '#202 Woodruff Keyseat', manufacturer: 'McMaster-Carr', series: '2780A', partNumber: '2780A202', type: 'endmill_woodruff', cutterDiameter: 0.25, keyWidth: 0.062, keyNumber: '#202', flutes: 2, shank: 0.312, oal: 2, coating: 'Uncoated', material: 'hss_m2', maxRpm: 12000, quickShip: true, process: 'milling', geometry: { volume: 2463, surfaceArea: 1320, units: "mm3/mm2" } },
            { id: 'mcmaster_woodruff_203', name: '#203 Woodruff Keyseat', manufacturer: 'McMaster-Carr', series: '2780A', partNumber: '2780A203', type: 'endmill_woodruff', cutterDiameter: 0.312, keyWidth: 0.078, keyNumber: '#203', flutes: 2, shank: 0.375, oal: 2.25, coating: 'Uncoated', material: 'hss_m2', maxRpm: 9615, quickShip: true, process: 'milling', geometry: { volume: 3999, surfaceArea: 1799, units: "mm3/mm2" } },
            { id: 'mcmaster_woodruff_204', name: '#204 Woodruff Keyseat', manufacturer: 'McMaster-Carr', series: '2780A', partNumber: '2780A204', type: 'endmill_woodruff', cutterDiameter: 0.375, keyWidth: 0.093, keyNumber: '#204', flutes: 2, shank: 0.437, oal: 2.5, coating: 'Uncoated', material: 'hss_m2', maxRpm: 8000, quickShip: true, process: 'milling', geometry: { volume: 6034, surfaceArea: 2345, units: "mm3/mm2" } },
            { id: 'mcmaster_woodruff_405', name: '#405 Woodruff Keyseat', manufacturer: 'McMaster-Carr', series: '2780A', partNumber: '2780A405', type: 'endmill_woodruff', cutterDiameter: 0.5, keyWidth: 0.125, keyNumber: '#405', flutes: 2, shank: 0.5, oal: 2.75, coating: 'Uncoated', material: 'hss_m2', maxRpm: 6000, quickShip: true, process: 'milling', geometry: { volume: 8728, surfaceArea: 3040, units: "mm3/mm2" } },
            { id: 'mcmaster_woodruff_406', name: '#406 Woodruff Keyseat', manufacturer: 'McMaster-Carr', series: '2780A', partNumber: '2780A406', type: 'endmill_woodruff', cutterDiameter: 0.625, keyWidth: 0.156, keyNumber: '#406', flutes: 2, shank: 0.5, oal: 3, coating: 'Uncoated', material: 'hss_m2', maxRpm: 4800, quickShip: true, process: 'milling', geometry: { volume: 9700, surfaceArea: 3476, units: "mm3/mm2" } },
            { id: 'mcmaster_woodruff_607', name: '#607 Woodruff Keyseat', manufacturer: 'McMaster-Carr', series: '2780A', partNumber: '2780A607', type: 'endmill_woodruff', cutterDiameter: 0.75, keyWidth: 0.187, keyNumber: '#607', flutes: 2, shank: 0.562, oal: 3.25, coating: 'Uncoated', material: 'hss_m2', maxRpm: 4000, quickShip: true, process: 'milling', geometry: { volume: 13399, surfaceArea: 4343, units: "mm3/mm2" } },
            { id: 'mcmaster_woodruff_808', name: '#808 Woodruff Keyseat', manufacturer: 'McMaster-Carr', series: '2780A', partNumber: '2780A808', type: 'endmill_woodruff', cutterDiameter: 0.875, keyWidth: 0.25, keyNumber: '#808', flutes: 2, shank: 0.562, oal: 3.5, coating: 'Uncoated', material: 'hss_m2', maxRpm: 3429, quickShip: true, process: 'milling', geometry: { volume: 14936, surfaceArea: 4921, units: "mm3/mm2" } },
            { id: 'mcmaster_woodruff_1009', name: '#1009 Woodruff Keyseat', manufacturer: 'McMaster-Carr', series: '2780A', partNumber: '2780A1009', type: 'endmill_woodruff', cutterDiameter: 1, keyWidth: 0.312, keyNumber: '#1009', flutes: 2, shank: 0.625, oal: 3.75, coating: 'Uncoated', material: 'hss_m2', maxRpm: 3000, quickShip: true, process: 'milling', geometry: { volume: 20095, surfaceArea: 6001, units: "mm3/mm2" } },
            { id: 'mcmaster_keyseat_025_0062}', name: '1/4" × 1/16" Keyseat Cutter', manufacturer: 'McMaster-Carr', series: '2782A', partNumber: '2782A250062', type: 'endmill_keyseat', cutterDiameter: 0.25, keyWidth: 0.062, flutes: 2, shank: 0.25, oal: 2, coating: 'TiN', material: 'hss_m2', maxRpm: 20000, quickShip: true, process: 'milling', geometry: { volume: 1594, surfaceArea: 1077, units: "mm3/mm2" } },
            { id: 'mcmaster_keyseat_0312_0093}', name: '5/16" × 3/32" Keyseat Cutter', manufacturer: 'McMaster-Carr', series: '2782A', partNumber: '2782A312093', type: 'endmill_keyseat', cutterDiameter: 0.312, keyWidth: 0.093, flutes: 2, shank: 0.312, oal: 2.25, coating: 'TiN', material: 'hss_m2', maxRpm: 16026, quickShip: true, process: 'milling', geometry: { volume: 2784, surfaceArea: 1521, units: "mm3/mm2" } },
            { id: 'mcmaster_keyseat_0375_0093}', name: '3/8" × 3/32" Keyseat Cutter', manufacturer: 'McMaster-Carr', series: '2782A', partNumber: '2782A375093', type: 'endmill_keyseat', cutterDiameter: 0.375, keyWidth: 0.093, flutes: 2, shank: 0.375, oal: 2.5, coating: 'TiN', material: 'hss_m2', maxRpm: 13333, quickShip: true, process: 'milling', geometry: { volume: 4474, surfaceArea: 2043, units: "mm3/mm2" } },
            { id: 'mcmaster_keyseat_05_0125}', name: '1/2" × 1/8" Keyseat Cutter', manufacturer: 'McMaster-Carr', series: '2782A', partNumber: '2782A500125', type: 'endmill_keyseat', cutterDiameter: 0.5, keyWidth: 0.125, flutes: 2, shank: 0.5, oal: 2.75, coating: 'TiN', material: 'hss_m2', maxRpm: 10000, quickShip: true, process: 'milling', geometry: { volume: 8728, surfaceArea: 3040, units: "mm3/mm2" } },
            { id: 'mcmaster_keyseat_0625_0156}', name: '5/8" × 5/32" Keyseat Cutter', manufacturer: 'McMaster-Carr', series: '2782A', partNumber: '2782A625156', type: 'endmill_keyseat', cutterDiameter: 0.625, keyWidth: 0.156, flutes: 2, shank: 0.625, oal: 3, coating: 'TiN', material: 'hss_m2', maxRpm: 8000, quickShip: true, process: 'milling', geometry: { volume: 14847, surfaceArea: 4196, units: "mm3/mm2" } },
            { id: 'mcmaster_keyseat_075_0187}', name: '3/4" × 3/16" Keyseat Cutter', manufacturer: 'McMaster-Carr', series: '2782A', partNumber: '2782A750187', type: 'endmill_keyseat', cutterDiameter: 0.75, keyWidth: 0.187, flutes: 2, shank: 0.75, oal: 3.25, coating: 'TiN', material: 'hss_m2', maxRpm: 6667, quickShip: true, process: 'milling', geometry: { volume: 23123, surfaceArea: 5510, units: "mm3/mm2" } },
            { id: 'mcmaster_keyseat_1_025}', name: '1" × 1/4" Keyseat Cutter', manufacturer: 'McMaster-Carr', series: '2782A', partNumber: '2782A1000250', type: 'endmill_keyseat', cutterDiameter: 1, keyWidth: 0.25, flutes: 4, shank: 1, oal: 3.75, coating: 'TiN', material: 'hss_m2', maxRpm: 5000, quickShip: true, process: 'milling', geometry: { volume: 47299, surfaceArea: 8614, units: "mm3/mm2" } }]
            },
            // OEE = Availability × Performance × Quality
            calculateOEE: function(avail, perf, qual) {
                return avail * perf * qual;
            }
        },
        // Spindle utilization targets
        spindleUtilization: {
            unattended: { target: 0.85, typical: 0.70, description: 'Lights-out/automated operation' },
            attended: { target: 0.65, typical: 0.50, description: 'Single operator, single machine' },
            jobShop: { target: 0.45, typical: 0.35, description: 'High mix, low volume' },
            prototype: { target: 0.25, typical: 0.20, description: 'Engineering/development' }
        }
    },
    // SECTION 2: LABOR COST FACTORS
    // Activity-Based Costing (ABC) approach
    laborCosts: {
        // Fully burdened labor rates by role (includes benefits, taxes, overhead)
        // Formula: Base Wage × Burden Rate (typically 1.3-1.5)
        hourlyRates: {
            operator: {
                entry: { // < 2 years experience
                    baseWage: { min: 16, max: 22, typical: 18 },
                    burdenRate: 1.35,
                    fullyBurdened: { min: 22, max: 30, typical: 24 },
                    efficiency: 0.75 // Productivity vs experienced
                },
                journeyman: { // 2-7 years
                    baseWage: { min: 22, max: 32, typical: 26 },
                    burdenRate: 1.35,
                    fullyBurdened: { min: 30, max: 43, typical: 35 },
                    efficiency: 0.90
                },
                senior: { // 7-15 years
                    baseWage: { min: 28, max: 42, typical: 35 },
                    burdenRate: 1.35,
                    fullyBurdened: { min: 38, max: 57, typical: 47 },
                    efficiency: 1.0
                },
                master: { // 15+ years, multi-process
                    baseWage: { min: 38, max: 55, typical: 45 },
                    burdenRate: 1.35,
                    fullyBurdened: { min: 51, max: 74, typical: 61 },
                    efficiency: 1.1 // Can exceed baseline due to expertise
                }
            },
            programmer: {
                camProgrammer: {
                    baseWage: { min: 28, max: 45, typical: 35 },
                    burdenRate: 1.40,
                    fullyBurdened: { min: 39, max: 63, typical: 49 }
                },
                seniorProgrammer: {
                    baseWage: { min: 40, max: 65, typical: 52 },
                    burdenRate: 1.40,
                    fullyBurdened: { min: 56, max: 91, typical: 73 }
                },
                applications: { // Complex 5-axis, multi-axis turning
                    baseWage: { min: 55, max: 85, typical: 68 },
                    burdenRate: 1.40,
                    fullyBurdened: { min: 77, max: 119, typical: 95 }
                }
            },
            setup: {
                basic: { // Simple setups, single spindle
                    baseWage: { min: 20, max: 28, typical: 24 },
                    burdenRate: 1.35,
                    fullyBurdened: { min: 27, max: 38, typical: 32 }
                },
                complex: { // Multi-axis, fixtures, probing
                    baseWage: { min: 28, max: 40, typical: 34 },
                    burdenRate: 1.35,
                    fullyBurdened: { min: 38, max: 54, typical: 46 }
                }
            },
            inspection: {
                firstArticle: {
                    baseWage: { min: 24, max: 38, typical: 30 },
                    burdenRate: 1.40,
                    fullyBurdened: { min: 34, max: 53, typical: 42 }
                },
                cmm: { // CMM operator
                    baseWage: { min: 28, max: 45, typical: 36 },
                    burdenRate: 1.40,
                    fullyBurdened: { min: 39, max: 63, typical: 50 }
                }
            },
            engineering: {
                manufacturing: {
                    baseWage: { min: 35, max: 55, typical: 45 },
                    burdenRate: 1.45,
                    fullyBurdened: { min: 51, max: 80, typical: 65 }
                },
                quality: {
                    baseWage: { min: 38, max: 60, typical: 48 },
                    burdenRate: 1.45,
                    fullyBurdened: { min: 55, max: 87, typical: 70 }
                }
            }
        },
        // Learning curve effects (Wright's Law)
        // Time for Nth unit = Time for 1st unit × N^(log(learning rate)/log(2))
        learningCurve: {
            rates: {
                simple: 0.95, // 95% - simple repetitive operations
                moderate: 0.90, // 90% - typical machining operations
                complex: 0.85, // 85% - complex setups/operations
                veryComplex: 0.80 // 80% - highly complex, many variables
            },
            // Calculate time for Nth unit
            calculateNthUnit: function(firstUnitTime, n, learningRate) {
                const exponent = Math.log(learningRate) / Math.log(2);
                return firstUnitTime * Math.pow(n, exponent);
            },
            // Calculate cumulative time for N units
            calculateCumulativeTime: function(firstUnitTime, n, learningRate) {
                let total = 0;
                for (let i = 1; i <= n; i++) {
                    total += this.calculateNthUnit(firstUnitTime, i, learningRate);
                }
                return total;
            },
            // Calculate average time per unit for N units
            calculateAverageTime: function(firstUnitTime, n, learningRate) {
                return this.calculateCumulativeTime(firstUnitTime, n, learningRate) / n;
            }
        },
        // Non-productive time factors
        nonProductiveTime: {
            personalFatigue: 0.10, // 10% allowance (OSHA guidelines)
            toolChange: 0.03, // Average tool change overhead
            inspection: 0.05, // In-process measurement
            materialHandling: 0.05, // Load/unload, move parts
            documentation: 0.02, // Paperwork, scanning, data entry
            meetings: 0.02, // Shift handoff, safety meetings
            totalAllowance: 0.27 // Sum of above
        }
    },
    // SECTION 3: MATERIAL COST FACTORS
    materialCosts: {
        // Base material costs per pound/kg by category
        // These are baseline - actual prices vary by supplier, quantity, form
        basePrices: {
            aluminum: {
                '1100': { perLb: 2.50, perKg: 5.50, form: 'sheet/plate', machinability: 'excellent' },
                '2024': { perLb: 4.50, perKg: 9.90, form: 'bar/plate', machinability: 'good' },
                '5052': { perLb: 3.20, perKg: 7.00, form: 'sheet/plate', machinability: 'good' },
                '6061': { perLb: 2.80, perKg: 6.15, form: 'all', machinability: 'excellent' },
                '6063': { perLb: 3.00, perKg: 6.60, form: 'extrusion', machinability: 'excellent' },
                '7075': { perLb: 5.50, perKg: 12.10, form: 'bar/plate', machinability: 'good' },
                '7050': { perLb: 7.00, perKg: 15.40, form: 'plate', machinability: 'good' },
                'micMelt': { perLb: 12.00, perKg: 26.40, form: 'bar', machinability: 'excellent', note: 'Stress-relieved' }
            },
            steel: {
                '1018': { perLb: 0.85, perKg: 1.87, form: 'all', machinability: 'good' },
                '1045': { perLb: 1.10, perKg: 2.42, form: 'bar', machinability: 'good' },
                '12L14': { perLb: 1.25, perKg: 2.75, form: 'bar', machinability: 'excellent' },
                '4130': { perLb: 1.80, perKg: 3.96, form: 'bar/tube', machinability: 'fair' },
                '4140': { perLb: 1.60, perKg: 3.52, form: 'bar', machinability: 'fair' },
                '4340': { perLb: 2.50, perKg: 5.50, form: 'bar', machinability: 'fair' },
                '8620': { perLb: 1.70, perKg: 3.74, form: 'bar', machinability: 'fair' },
                'A2Tool': { perLb: 4.50, perKg: 9.90, form: 'bar/plate', machinability: 'fair' },
                'D2Tool': { perLb: 5.50, perKg: 12.10, form: 'bar/plate', machinability: 'poor' },
                'O1Tool': { perLb: 4.00, perKg: 8.80, form: 'bar/plate', machinability: 'fair' },
                'S7Tool': { perLb: 8.00, perKg: 17.60, form: 'bar', machinability: 'fair' },
                'H13Tool': { perLb: 6.00, perKg: 13.20, form: 'bar/plate', machinability: 'fair' }
            },
            stainless: {
                '303': { perLb: 2.80, perKg: 6.16, form: 'bar', machinability: 'good' },
                '304': { perLb: 3.20, perKg: 7.04, form: 'all', machinability: 'fair' },
                '316': { perLb: 4.00, perKg: 8.80, form: 'all', machinability: 'fair' },
                '316L': { perLb: 4.50, perKg: 9.90, form: 'all', machinability: 'fair' },
                '17-4PH': { perLb: 6.50, perKg: 14.30, form: 'bar', machinability: 'fair' },
                '15-5PH': { perLb: 7.00, perKg: 15.40, form: 'bar', machinability: 'fair' },
                '410': { perLb: 2.50, perKg: 5.50, form: 'bar/plate', machinability: 'fair' },
                '420': { perLb: 3.00, perKg: 6.60, form: 'bar', machinability: 'fair' },
                '440C': { perLb: 5.00, perKg: 11.00, form: 'bar', machinability: 'poor' }
            },
            titanium: {
                'Grade2CP': { perLb: 18.00, perKg: 39.60, form: 'all', machinability: 'poor' },
                'Grade5Ti64': { perLb: 25.00, perKg: 55.00, form: 'all', machinability: 'poor' },
                'Grade23ELI': { perLb: 35.00, perKg: 77.00, form: 'bar/plate', machinability: 'poor' }
            },
            superalloy: {
                'Inconel625': { perLb: 35.00, perKg: 77.00, form: 'bar/plate', machinability: 'veryPoor' },
                'Inconel718': { perLb: 40.00, perKg: 88.00, form: 'bar/plate', machinability: 'veryPoor' },
                'Hastelloy': { perLb: 45.00, perKg: 99.00, form: 'bar/plate', machinability: 'veryPoor' },
                'WaspaloyW': { perLb: 55.00, perKg: 121.00, form: 'bar', machinability: 'veryPoor' }
            },
            copper: {
                'C110ETP': { perLb: 5.50, perKg: 12.10, form: 'bar/sheet', machinability: 'fair' },
                'C145Tellurium': { perLb: 7.00, perKg: 15.40, form: 'bar', machinability: 'excellent' },
                'C172BerylliumCu': { perLb: 18.00, perKg: 39.60, form: 'bar/plate', machinability: 'fair' },
                'C360Brass': { perLb: 4.50, perKg: 9.90, form: 'all', machinability: 'excellent' },
                'C932Bronze': { perLb: 8.00, perKg: 17.60, form: 'bar/tube', machinability: 'good' }
            },
            plastic: {
                'Delrin': { perLb: 4.00, perKg: 8.80, form: 'bar/sheet', machinability: 'excellent' },
                'UHMWPE': { perLb: 3.50, perKg: 7.70, form: 'sheet/bar', machinability: 'excellent' },
                'Nylon6': { perLb: 4.50, perKg: 9.90, form: 'bar/sheet', machinability: 'good' },
                'PEEK': { perLb: 85.00, perKg: 187.00, form: 'bar/sheet', machinability: 'good' },
                'Ultem': { perLb: 75.00, perKg: 165.00, form: 'bar/sheet', machinability: 'good' },
                'PTFE': { perLb: 12.00, perKg: 26.40, form: 'bar/sheet', machinability: 'good' },
                'Polycarbonate': { perLb: 5.50, perKg: 12.10, form: 'sheet', machinability: 'good' },
                'Acrylic': { perLb: 3.50, perKg: 7.70, form: 'sheet', machinability: 'good' },
                'G10FR4': { perLb: 8.00, perKg: 17.60, form: 'sheet', machinability: 'fair' }
            }
        },
        // Material form premiums (multiplier over base price)
        formPremiums: {
            roundBar: 1.0, // Baseline
            hexBar: 1.05,
            squareBar: 1.08,
            flatBar: 1.10,
            plate: 1.15,
            sheet: 1.12,
            tube: 1.25,
            pipe: 1.20,
            extrusion: 0.95, // Often cheaper for aluminum
            forging: 1.80,
            casting: 1.40
        },
        // Size premiums (larger = more premium typically)
        sizePremiums: {
            under1inch: 1.15, // Small stock harder to source
            '1to3inch': 1.0, // Baseline
            '3to6inch': 1.05,
            '6to12inch': 1.15,
            over12inch: 1.30 // Large stock premium
        },
        // Quantity breaks (discount multipliers)
        quantityBreaks: {
            prototype: { qty: '1-5', multiplier: 1.25 }, // Premium for small qty
            lowVolume: { qty: '6-25', multiplier: 1.10 },
            medium: { qty: '26-100', multiplier: 1.0 }, // Baseline
            production: { qty: '101-500', multiplier: 0.92 },
            highVolume: { qty: '501-1000', multiplier: 0.85 },
            massProduction: { qty: '1000+', multiplier: 0.75 }
        },
        // Certification premiums
        certificationPremiums: {
            domestic: 1.0, // Baseline US/domestic mill
            certifiedMTR: 1.05, // Mill test report
            aerospaceCert: 1.35, // AMS specs, full traceability
            medicalCert: 1.30, // ISO 13485 traceable
            nuclearCert: 1.50, // NQA-1 certified
            dfars: 1.15 // Defense Federal Acquisition Regulation Supplement
        },
        // Buy-to-fly ratio (how much material bought vs in finished part)
        buyToFlyRatios: {
            prismatic: { // Squared/rectangular parts from plate
                aerospace: { typical: 15, best: 8, worst: 25 }, // 15:1 typical
                general: { typical: 8, best: 4, worst: 15 }
            },
            turned: { // Round parts from bar
                aerospace: { typical: 4, best: 2, worst: 8 },
                general: { typical: 3, best: 1.5, worst: 6 }
            },
            forgedNearNet: { // Forgings close to final shape
                aerospace: { typical: 3, best: 1.5, worst: 5 },
                general: { typical: 2.5, best: 1.3, worst: 4 }
            },
            castNearNet: { // Castings
                typical: 1.8, best: 1.2, worst: 3
            }
        },
        // Scrap/chip value recovery
        scrapValue: {
            aluminum: { perLb: 0.35, recovery: 0.90 }, // 90% recoverable
            steel: { perLb: 0.08, recovery: 0.85 },
            stainless: { perLb: 0.40, recovery: 0.85 },
            titanium: { perLb: 3.50, recovery: 0.80 },
            copper: { perLb: 2.50, recovery: 0.90 },
            brass: { perLb: 1.80, recovery: 0.90 },
            plastic: { perLb: 0, recovery: 0 }, // Generally not recoverable
            superalloy: { perLb: 8.00, recovery: 0.75 }
        }
    },
    // SECTION 4: TOOLING COST FACTORS
    toolingCosts: {
        // Cutting tool costs by category
        cuttingTools: {
            endMills: {
                hss: {
                    sizes: {
                        'under0.25': { cost: { min: 8, max: 20, typical: 12 }, toolLife: 45 },
                        '0.25to0.5': { cost: { min: 12, max: 30, typical: 18 }, toolLife: 60 },
                        '0.5to1.0': { cost: { min: 18, max: 45, typical: 28 }, toolLife: 75 },
                        'over1.0': { cost: { min: 25, max: 65, typical: 40 }, toolLife: 90 }
                    },
                    regroundable: true,
                    regrindCost: 0.25, // 25% of new cost
                    regrindCycles: 3
                },
                carbide: {
                    sizes: {
                        'under0.125': { cost: { min: 25, max: 80, typical: 45 }, toolLife: 90 },
                        '0.125to0.25': { cost: { min: 35, max: 100, typical: 60 }, toolLife: 120 },
                        '0.25to0.5': { cost: { min: 45, max: 150, typical: 85 }, toolLife: 150 },
                        '0.5to0.75': { cost: { min: 65, max: 200, typical: 120 }, toolLife: 180 },
                        '0.75to1.0': { cost: { min: 85, max: 280, typical: 165 }, toolLife: 200 },
                        'over1.0': { cost: { min: 120, max: 400, typical: 240 }, toolLife: 240 }
                    },
                    regroundable: true,
                    regrindCost: 0.35,
                    regrindCycles: 2
                },
                coatedCarbide: {
                    coatingPremium: {
                        TiN: 1.10,
                        TiCN: 1.15,
                        TiAlN: 1.20,
                        AlTiN: 1.25,
                        nACo: 1.35,
                        AlCrN: 1.30,
                        diamond: 3.00,
                        DLC: 1.50
                    },
                    toolLifeMultiplier: {
                        TiN: 1.5,
                        TiCN: 1.8,
                        TiAlN: 2.2,
                        AlTiN: 2.5,
                        nACo: 3.0,
                        AlCrN: 2.4,
                        diamond: 10.0, // For non-ferrous
                        DLC: 4.0
                    }
                },
                highPerformance: { // Helical, OSG A-Brand, Kennametal, etc.
                    premiumMultiplier: 1.8,
                    toolLifeMultiplier: 2.5,
                    mrRateMultiplier: 2.0 // Material removal rate
                }
            },
            drills: {
                hss: {
                    jobber: {
                        fractional: { cost: { min: 3, max: 15, typical: 6 }, toolLife: 100 },
                        letter: { cost: { min: 4, max: 18, typical: 8 }, toolLife: 100 },
                        number: { cost: { min: 3, max: 12, typical: 5 }, toolLife: 100 }
                    },
                    screw: { costMultiplier: 0.8, toolLifeMultiplier: 0.9 },
                    taper: { costMultiplier: 1.5, toolLifeMultiplier: 1.1 }
                },
                carbide: {
                    tier2: {
                        'under0.125': { cost: { min: 25, max: 60, typical: 40 }, toolLife: 300 },
                        '0.125to0.25': { cost: { min: 30, max: 80, typical: 50 }, toolLife: 400 },
                        '0.25to0.5': { cost: { min: 45, max: 120, typical: 75 }, toolLife: 500 },
                        '0.5to1.0': { cost: { min: 80, max: 200, typical: 130 }, toolLife: 600 },
                        'over1.0': { cost: { min: 150, max: 400, typical: 250 }, toolLife: 700 }
                    },
                    throughCoolant: { costMultiplier: 1.4, toolLifeMultiplier: 2.0, speedMultiplier: 1.5 }
                },
                indexable: {
                    body: {
                        'under1.0': { cost: { min: 150, max: 350, typical: 240 } },
                        '1.0to2.0': { cost: { min: 250, max: 500, typical: 360 } },
                        'over2.0': { cost: { min: 400, max: 800, typical: 550 } }
                    },
                    insertCostPerEdge: { min: 4, max: 12, typical: 7 },
                    edgesPerInsert: 2
                }
            },
            inserts: {
                turning: {
                    cnmg: { // 80° diamond, negative rake
                        grades: {
                            general: { cost: 6, edges: 4, toolLife: 15 }, // minutes per edge
                            finishing: { cost: 8, edges: 4, toolLife: 20 },
                            hardMaterial: { cost: 12, edges: 4, toolLife: 10 }
                        }
                    },
                    wnmg: { // 80° trigon
                        grades: {
                            general: { cost: 7, edges: 6, toolLife: 12 }
                        }
                    },
                    dnmg: { // 55° diamond
                        grades: {
                            general: { cost: 5, edges: 4, toolLife: 15 },
                            profiling: { cost: 7, edges: 4, toolLife: 12 }
                        }
                    },
                    vnmg: { // 35° diamond
                        grades: {
                            profiling: { cost: 6, edges: 4, toolLife: 10 }
                        }
                    }
                },
                milling: {
                    apkt: { // 90° shoulder
                        general: { cost: 8, edges: 2, toolLife: 20 }
                    },
                    rpmt: { // Round
                        general: { cost: 10, edges: 1, toolLife: 25 }
                    },
                    snmt: { // Square
                        general: { cost: 7, edges: 4, toolLife: 18 }
                    },
                    tnmg: { // Triangle
                        general: { cost: 6, edges: 3, toolLife: 15 }
                    },
                    xpmt: { // High-feed
                        general: { cost: 12, edges: 4, toolLife: 30 }
                    }
                }
            },
            taps: {
                hss: {
                    spiral: {
                        'under0.25': { cost: { min: 8, max: 20, typical: 12 }, toolLife: 200 },
                        '0.25to0.5': { cost: { min: 15, max: 35, typical: 22 }, toolLife: 300 },
                        '0.5to1.0': { cost: { min: 25, max: 60, typical: 38 }, toolLife: 400 }
                    },
                    formTap: { costMultiplier: 1.5, toolLifeMultiplier: 3.0 }
                },
                carbide: {
                    threadMill: {
                        'singlePoint': { cost: { min: 80, max: 200, typical: 130 }, toolLife: 1000 },
                        'multiForm': { cost: { min: 150, max: 400, typical: 260 }, toolLife: 2000 }
                    }
                }
            }
        },
        // Tool holder costs
        toolHolders: {
            cat40: {
                erCollet: { cost: 120, life: 10000 }, // hours
                hydraulic: { cost: 450, life: 15000 },
                shrinkFit: { cost: 280, life: 12000 },
                shellMill: { cost: 180, life: 20000 },
                endMillHolder: { cost: 95, life: 10000 },
                drillChuck: { cost: 150, life: 8000 }
            },
            cat50: {
                erCollet: { cost: 180, life: 10000 },
                hydraulic: { cost: 650, life: 15000 },
                shrinkFit: { cost: 380, life: 12000 },
                shellMill: { cost: 280, life: 20000 }
            },
            bt40: {
                erCollet: { cost: 110, life: 10000 },
                hydraulic: { cost: 420, life: 15000 }
            },
            hsk63: {
                erCollet: { cost: 250, life: 12000 },
                hydraulic: { cost: 750, life: 18000 },
                shrinkFit: { cost: 450, life: 15000 }
            }
        },
        // Cost per cutting edge calculation
        calculateCostPerEdge: function(tool) {
            // Returns cost per edge based on tool cost, edges, and tool life
            const totalCost = tool.cost + (tool.regrindable ? tool.regrindCost * tool.regrindCycles : 0);
            const totalEdges = tool.edges * (1 + (tool.regrindable ? tool.regrindCycles : 0));
            return totalCost / totalEdges;
        },
        // Cost per minute of cutting
        calculateCostPerMinute: function(costPerEdge, toolLifeMinutes) {
            return costPerEdge / toolLifeMinutes;
        }
    },
    // SECTION 5: OVERHEAD AND INDIRECT COSTS
    overheadCosts: {
        // Facility costs (annual)
        facility: {
            rentPerSqFt: { min: 8, max: 25, typical: 14 }, // annual
            utilities: {
                electric: { perSqFt: 2.50 }, // annual
                gas: { perSqFt: 0.80 },
                water: { perSqFt: 0.30 },
                compressed_air: { perSqFt: 0.40 }
            },
            insurance: { percentOfAssets: 0.015 }, // 1.5% of asset value
            propertyTax: { percentOfValue: 0.02 }, // Varies by location
            maintenance: { percentOfRent: 0.10 } // Building maintenance
        },
        // Administrative overhead
        administrative: {
            management: { percentOfLabor: 0.15 },
            sales: { percentOfRevenue: 0.05 },
            accounting: { percentOfRevenue: 0.02 },
            hr: { percentOfLabor: 0.03 },
            it: { percentOfRevenue: 0.02 },
            legal: { percentOfRevenue: 0.01 }
        },
        // Quality costs
        quality: {
            inspection: { percentOfMachineTime: 0.08 },
            calibration: { annualPerMachine: 2500 },
            certification: { annual: { iso9001: 8000, as9100: 15000, iatf16949: 20000, iso13485: 12000, nadcap: 25000 } },
            gageRR: { annualPerGage: 150 },
            rejectRate: { typical: 0.02, aerospace: 0.005, medical: 0.003 }
        },
        // Consumables
        consumables: {
            coolant: {
                waterSoluble: { perGallon: 25, concentration: 0.07, changeIntervalWeeks: 12 },
                syntheticFluid: { perGallon: 35, concentration: 0.05, changeIntervalWeeks: 16 },
                straightOil: { perGallon: 18, changeIntervalWeeks: 26 }
            },
            cutting_fluids: {
                mistCoolant: { perDay: 2 },
                mqlOil: { perDay: 5 },
                cryogenic: { perHour: 15 }
            },
            filtration: { monthlyPerMachine: 150 },
            way_oil: { monthlyPerMachine: 45 },
            cleaners: { monthlyPerMachine: 30 },
            rags_towels: { monthlyPerMachine: 20 },
            ppe: { monthlyPerPerson: 50 }
        },
        // EDM-specific consumables
        edmConsumables: {
            wire: { // per pound
                brass: { cost: 8, usagePerHour: 0.3 },
                coated: { cost: 12, usagePerHour: 0.25 },
                moldMax: { cost: 25, usagePerHour: 0.2 }
            },
            electrode: {
                graphite: { perCuIn: 2.5 },
                copper: { perCuIn: 8 },
                copperTungsten: { perCuIn: 35 }
            },
            dielectric: {
                deionizedWater: { perGallon: 0.5, changeIntervalDays: 90 },
                oil: { perGallon: 12, changeIntervalDays: 180 }
            },
            filters: { monthlyPerMachine: 200 }
        },
        // Laser/waterjet consumables
        laserConsumables: {
            assistGas: {
                nitrogen: { perCuFt: 0.25, usagePerHourLight: 100, usagePerHourHeavy: 300 },
                oxygen: { perCuFt: 0.15, usagePerHourLight: 50, usagePerHourHeavy: 150 },
                compressedAir: { perHour: 2 }
            },
            lens: { cost: 350, lifeHours: 2000 },
            nozzle: { cost: 45, lifeHours: 500 },
            protectiveWindow: { cost: 150, lifeHours: 1000 }
        },
        waterjetConsumables: {
            abrasive: {
                garnet80: { perLb: 0.28, usagePerHour: 1.2 }, // lbs per hp-hour
                garnet120: { perLb: 0.35, usagePerHour: 0.9 }
            },
            orifice: {
                sapphire: { cost: 25, lifeHours: 40 },
                ruby: { cost: 45, lifeHours: 80 },
                diamond: { cost: 450, lifeHours: 800 }
            },
            mixingTube: { cost: 180, lifeHours: 100 },
            seals: { monthlyPerPump: 250 },
            water: { perGallon: 0.005, gallonsPerHour: 40 }
        }
    },
    // SECTION 6: SETUP TIME FACTORS
    setupFactors: {
        // Base setup times by operation type (minutes)
        baseSetupTimes: {
            vmc: {
                firstSetup: { // First part ever on machine
                    simple: 45, // Single vise, few tools
                    moderate: 90, // Multiple fixtures, 6-12 tools
                    complex: 180, // Special fixtures, many tools, probing
                    veryComplex: 360 // 5-axis, complex workholding
                },
                repeatSetup: { // Part run before
                    simple: 20,
                    moderate: 45,
                    complex: 90,
                    veryComplex: 150
                }
            },
            hmc: {
                firstSetup: {
                    simple: 60,
                    moderate: 120,
                    complex: 240,
                    veryComplex: 480
                },
                repeatSetup: {
                    simple: 25,
                    moderate: 50,
                    complex: 100,
                    veryComplex: 180
                }
            },
            lathe: {
                firstSetup: {
                    simple: 30, // 3-jaw chuck, few tools
                    moderate: 60, // Collet, tailstock, live tools
                    complex: 120, // Sub-spindle, Y-axis, bar feed
                    veryComplex: 240 // Swiss-type, gang tooling
                },
                repeatSetup: {
                    simple: 15,
                    moderate: 30,
                    complex: 60,
                    veryComplex: 120
                }
            },
            wireEdm: {
                firstSetup: {
                    simple: 20,
                    moderate: 45,
                    complex: 90
                },
                repeatSetup: {
                    simple: 10,
                    moderate: 20,
                    complex: 45
                }
            },
            sinkerEdm: {
                firstSetup: {
                    simple: 60, // One electrode
                    moderate: 120, // Multiple electrodes
                    complex: 240 // Complex electrode array
                },
                repeatSetup: {
                    simple: 30,
                    moderate: 60,
                    complex: 120
                }
            },
            laser: {
                firstSetup: {
                    simple: 15,
                    moderate: 30,
                    complex: 60
                },
                repeatSetup: {
                    simple: 5,
                    moderate: 15,
                    complex: 30
                }
            },
            waterjet: {
                firstSetup: {
                    simple: 20,
                    moderate: 40,
                    complex: 90
                },
                repeatSetup: {
                    simple: 10,
                    moderate: 20,
                    complex: 45
                }
            }
        },
        // Setup time adders (minutes)
        setupAdders: {
            toolMeasurement: { perTool: 2 },
            fixtureAlignment: { perFixture: 15 },
            probing: { partProbing: 10, toolProbing: 5 },
            programVerify: { perProgram: 15 },
            firstArticle: { perFeature: 3 },
            materialChange: { similar: 10, different: 25 },
            workOffset: { perOffset: 5 },
            clampChange: { perClamp: 8 }
        },
        // Batch size efficiency (setup amortization)
        batchEfficiency: {
            // Setup cost per part = Setup Time × Setup Rate / Batch Size
            breakEvenQty: function(setupTime, setupRate, perPieceCost, targetMargin) {
                // Returns quantity where setup becomes < X% of part cost
                return Math.ceil(setupTime * setupRate / (perPieceCost * targetMargin));
            }
        }
    },
    // SECTION 7: SECONDARY OPERATIONS
    secondaryOperations: {
        // Heat treatment costs
        heatTreat: {
            stressRelieve: { perLb: 0.35, minCharge: 75, leadTimeDays: 3 },
            normalize: { perLb: 0.45, minCharge: 100, leadTimeDays: 3 },
            anneal: { perLb: 0.40, minCharge: 85, leadTimeDays: 3 },
            hardenTemper: { perLb: 0.65, minCharge: 125, leadTimeDays: 5 },
            case_harden: { perLb: 1.20, minCharge: 200, leadTimeDays: 7 },
            nitride: { perLb: 2.50, minCharge: 350, leadTimeDays: 10 },
            cryogenic: { perLb: 1.80, minCharge: 250, leadTimeDays: 5 },
            solutionAge: { perLb: 0.85, minCharge: 150, leadTimeDays: 5 }
        },
        // Surface finishing
        finishing: {
            deburr: {
                tumble: { perPart: { min: 0.50, max: 3.00 }, cycleHours: 4 },
                vibratory: { perPart: { min: 0.75, max: 5.00 }, cycleHours: 2 },
                thermal: { perPart: { min: 3.00, max: 15.00 } },
                manual: { perHour: 35 }
            },
            polish: {
                manual: { perHour: 45 },
                electropolish: { perSqIn: 0.15, minCharge: 100 },
                buffing: { perHour: 35 }
            },
            grinding: {
                surface: { perHour: 85 },
                cylindrical: { perHour: 95 },
                centerless: { perPart: { min: 1.50, max: 8.00 } },
                jig: { perHour: 125 }
            },
            lapping: { perHour: 150 },
            honing: { perHour: 110 }
        },
        // Plating and coating
        plating: {
            zinc: { perSqFt: 2.50, minCharge: 50, leadTimeDays: 3 },
            nickel: { perSqFt: 4.00, minCharge: 75, leadTimeDays: 5 },
            hardChrome: { perSqFt: 12.00, minCharge: 150, leadTimeDays: 7 },
            electrolessNickel: { perSqFt: 8.00, minCharge: 125, leadTimeDays: 5 },
            cadmium: { perSqFt: 6.00, minCharge: 100, leadTimeDays: 5 },
            anodize: {
                typeII: { perSqFt: 3.00, minCharge: 50, leadTimeDays: 3 },
                typeIII: { perSqFt: 6.00, minCharge: 100, leadTimeDays: 5 },
                chromic: { perSqFt: 8.00, minCharge: 125, leadTimeDays: 5 }
            },
            passivate: { perPart: 2.00, minCharge: 50, leadTimeDays: 2 },
            blackOxide: { perLb: 0.80, minCharge: 40, leadTimeDays: 2 }
        },
        // Specialty coatings
        coatings: {
            pvd: { perPart: { min: 15, max: 80 }, leadTimeDays: 7 },
            dlc: { perPart: { min: 25, max: 120 }, leadTimeDays: 10 },
            ptfe: { perSqFt: 8.00, minCharge: 100, leadTimeDays: 5 },
            cerakote: { perSqFt: 12.00, minCharge: 75, leadTimeDays: 5 },
            thermalSpray: { perSqIn: 2.00, minCharge: 200, leadTimeDays: 7 }
        },
        // Assembly operations
        assembly: {
            pressfit: { perOperation: 2.00 },
            threadInsert: { perInsert: 3.50 },
            pinning: { perPin: 1.50 },
            bonding: { perJoint: 5.00 },
            staking: { perStake: 2.00 }
        },
        // Marking and identification
        marking: {
            engraving: { perCharacter: 0.25, setupCharge: 15 },
            laserMark: { perMark: 0.50, setupCharge: 10 },
            vibro_etch: { perMark: 0.35, setupCharge: 8 },
            inkStamp: { perMark: 0.10, setupCharge: 5 },
            labelPrint: { perLabel: 0.15 }
        },
        // Inspection
        inspection: {
            dimensional: {
                caliper: { perDim: 0.25 },
                micrometer: { perDim: 0.35 },
                indicator: { perDim: 0.50 },
                cmm: { perHour: 95, perDim: 2.00 },
                optical: { perHour: 85 }
            },
            surfaceFinish: { perReading: 1.50 },
            hardness: { perReading: 2.00 },
            ndt: {
                dyePenetrant: { perPart: { min: 8, max: 25 } },
                magneticParticle: { perPart: { min: 12, max: 35 } },
                ultrasonic: { perPart: { min: 20, max: 60 } },
                xray: { perPart: { min: 50, max: 200 } }
            },
            documentation: {
                coc: { perPart: 0.50 },
                firstArticle: { perPart: { min: 50, max: 250 } },
                ppap: { perPart: { min: 200, max: 1500 } }
            }
        },
        // Packaging
        packaging: {
            bulk: { perPart: 0.05 },
            individual: { perPart: 0.25 },
            cleanroom: { perPart: 1.00 },
            vci: { perPart: 0.50 },
            foam: { perPart: 0.75 },
            custom: { perPart: { min: 2, max: 15 } }
        }
    },
    // SECTION 8: FINANCIAL ANALYSIS FRAMEWORKS
    financialAnalysis: {
        // Pricing strategies
        pricing: {
            costPlus: {
                description: 'Cost + fixed margin percentage',
                formula: 'Price = Total Cost × (1 + Margin)',
                typicalMargins: {
                    commodity: { min: 0.10, max: 0.20 },
                    tier2: { min: 0.20, max: 0.35 },
                    precision: { min: 0.30, max: 0.50 },
                    aerospace: { min: 0.35, max: 0.60 },
                    medical: { min: 0.40, max: 0.70 },
                    prototype: { min: 0.50, max: 1.00 }
                }
            },
            valueBasedPricing: {
                description: 'Price based on value to customer, not just cost',
                factors: ['urgency', 'complexity', 'relationship', 'alternatives', 'volume']
            },
            marketBasedPricing: {
                description: 'Price based on competitive market rates',
                adjustments: ['quality', 'service', 'lead_time', 'certification']
            }
        },
        // Break-even analysis
        breakEven: {
            // Fixed costs that don't vary with volume
            fixedCosts: ['depreciation', 'rent', 'insurance', 'salaries', 'certifications'],
            // Variable costs that change with volume
            variableCosts: ['material', 'consumables', 'directLabor', 'tooling', 'utilities'],
            // Break-even quantity = Fixed Costs / (Price - Variable Cost per Unit)
            calculate: function(fixedCosts, pricePerUnit, variableCostPerUnit) {
                return Math.ceil(fixedCosts / (pricePerUnit - variableCostPerUnit));
            }
        },
        // Contribution margin
        contributionMargin: {
            // CM = Price - Variable Costs
            // CM Ratio = CM / Price
            calculate: function(price, variableCost) {
                return {
                    margin: price - variableCost,
                    ratio: (price - variableCost) / price
                };
            },
            targets: {
                minimum: 0.25, // 25% CM ratio minimum
                target: 0.40,
                excellent: 0.55
            }
        },
        // Time value of money
        timeValueMoney: {
            // For long lead-time jobs and payment terms
            discountRate: 0.08, // Annual cost of capital
            presentValue: function(futureValue, periods, rate) {
                return futureValue / Math.pow(1 + rate, periods);
            },
            // Payment terms adjustments
            paymentTerms: {
                net30: { adjustment: 1.0 },
                net45: { adjustment: 1.01 },
                net60: { adjustment: 1.02 },
                net90: { adjustment: 1.04 },
                cod: { discount: 0.02 }, // 2% discount for cash
                prepay50: { discount: 0.03 }
            }
        },
        // Opportunity cost
        opportunityCost: {
            description: 'Value of next best alternative foregone',
            factors: {
                machineTime: 'Could this machine be running higher-margin work?',
                engineering: 'Is this the best use of programming time?',
                capital: 'Could this investment earn more elsewhere?'
            },
            // Machine hour opportunity cost
            calculateMachineOpportunity: function(hourlyRate, utilizationTarget, actualUtilization) {
                return hourlyRate * (utilizationTarget - actualUtilization);
            }
        },
        // Risk adjustments
        riskFactors: {
            newCustomer: 1.10, // 10% premium for unknown customer
            newProcess: 1.15, // 15% premium for unproven process
            tightTolerance: 1.20, // Premium for precision work
            exoticMaterial: 1.25, // Premium for difficult materials
            rushOrder: {
                '1week': 1.25,
                '3days': 1.50,
                '1day': 2.00,
                'sameDay': 2.50
            },
            obsolescence: 0.03 // Annual risk of tooling/process becoming obsolete
        },
        // Economies of scale
        economiesOfScale: {
            // Cost reduction factors as volume increases
            volumeDiscounts: {
                '1-10': 1.0,
                '11-50': 0.92,
                '51-100': 0.85,
                '101-500': 0.78,
                '501-1000': 0.72,
                '1001-5000': 0.65,
                '5001+': 0.58
            },
            // Setup amortization naturally provides scale economy
            // Material quantity discounts (see materialCosts.quantityBreaks)
            // Tooling amortization over larger batches
        }
    }