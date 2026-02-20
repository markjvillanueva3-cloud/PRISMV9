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
                factors: ['defects', 'rework', 'scrap', 'startupRejects']
            }
        }
    }
}