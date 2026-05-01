const PRISM_SUBSCRIPTION_SYSTEM = {
    VERSION: "2.0.0",
    UPDATED: "2025-01-01",

    // TIER DEFINITIONS
    tiers: {
        // TIER 1: ESSENTIALS - Entry Level
        // $29/month or $290/year (17% savings)
        tier1: {
            id: "essentials",
            name: "Tier 1",
            tagline: "Entry Level Calculations",
            monthlyPrice: 29,
            yearlyPrice: 290,
            yearlySavings: "17%",
            color: "#6b7280", // Gray
            icon: "📐",

            // Module access
            modules: {
                included: 1, // Only 1 module included
                available: ['mill', 'lathe', 'sinker_edm', 'wire_edm', 'laser', 'waterjet'],
                addOnPrice: 19 // Per additional module/month
            },
            // Feature access
            features: {
                // Machine Selection
                machineSelection: "generic", // Generic only
                machineDatabase: false,
                customMachineSpecs: false,
                machineCribLimit: 3,

                // Tooling
                toolingSelection: "generic", // Generic only
                brandTooling: false,
                toolCribLimit: 15,

                // Tool Holders
                holderSelection: "generic",
                brandHolders: false,

                // Work Holding / Fixturing
                fixtureSelection: "generic",
                customFixtures: false,

                // Speeds & Feeds
                speedsFeedsMode: "balanced_only", // Only balanced, no aggressive/conservative
                sfmCustomization: false,
                chiploadAdjustment: false,

                // Surface Finish
                surfaceFinishSelection: false,
                roughnessCalculation: false,

                // Materials
                materialDatabase: "limited", // ~50 common materials
                customMaterials: false,

                // Calculations
                calculationsPerDay: 25,
                multiOperationSupport: false,

                // Output & Export
                exportFormats: ['txt'],
                setupSheetExport: false,

                // Advanced Features
                cadRecognition: false,
                printRecognition: false,
                aiEnhancedSettings: false,
                workflowSuggestions: false,
                quotingModule: false,
                costAnalysis: false,

                // Support
                supportLevel: "community",
                responseTime: "48-72 hours"
            },
            limitations: {
                noMachineDatabase: "Generic machine parameters only",
                noToolBrands: "Generic tooling specifications",
                balancedOnly: "Speeds & feeds locked to balanced mode",
                noSurfaceFinish: "Surface finish selection not available",
                limitedMaterials: "50 common materials included",
                limitedExport: "Basic text export only"
            },
            upgradePrompts: {
                machineSelect: "⬆️ Upgrade to Standard for access to 300+ specific machines with exact specifications",
                toolSelect: "⬆️ Upgrade to Standard for brand-specific tooling from Kennametal, Sandvik, Iscar & more",
                speedsFeed: "⬆️ Upgrade to Standard to unlock Aggressive and Conservative speed/feed modes",
                surfaceFinish: "⬆️ Upgrade to Standard to select target surface finish",
                export: "⬆️ Upgrade to Standard for PDF and Excel export capabilities"
            }
        },
        // TIER 2: STANDARD - Professional
        // $79/month or $790/year (17% savings)
        tier2: {
            id: "standard",
            name: "Standard",
            tagline: "Professional-Grade Calculations",
            monthlyPrice: 79,
            yearlyPrice: 790,
            yearlySavings: "17%",
            color: "#3b82f6", // Blue
            icon: "🔧",
            badge: "MOST POPULAR",

            // Module access
            modules: {
                included: 2, // 2 modules included
                available: ['mill', 'lathe', 'sinker_edm', 'wire_edm', 'laser', 'waterjet'],
                addOnPrice: 24 // Per additional module/month
            },
            // Feature access
            features: {
                // Machine Selection
                machineSelection: "database", // Full machine database
                machineDatabase: true,
                customMachineSpecs: true,
                machineCribLimit: 15,

                // Tooling
                toolingSelection: "database", // Brand-specific tooling
                brandTooling: true,
                toolCribLimit: 100,

                // Tool Holders - STILL GENERIC
                holderSelection: "generic",
                brandHolders: false,

                // Work Holding / Fixturing - STILL GENERIC
                fixtureSelection: "generic",
                customFixtures: false,

                // Speeds & Feeds - CAPPED AT BALANCED
                speedsFeedsMode: "balanced_only", // Still balanced only
                sfmCustomization: false,
                chiploadAdjustment: false,

                // Surface Finish - NOT AVAILABLE
                surfaceFinishSelection: false,
                roughnessCalculation: false,

                // Materials
                materialDatabase: "standard", // ~200 materials
                customMaterials: true,
                heatTreatStates: true,

                // Calculations
                calculationsPerDay: 100,
                multiOperationSupport: true,

                // Output & Export
                exportFormats: ['txt', 'pdf', 'xlsx'],
                setupSheetExport: true,

                // Advanced Features
                cadRecognition: false,
                printRecognition: false,
                aiEnhancedSettings: false,
                workflowSuggestions: false,
                quotingModule: false,
                costAnalysis: "basic", // View only, no customization

                // Support
                supportLevel: "email",
                responseTime: "24-48 hours"
            },
            limitations: {
                genericHolders: "Tool holders are generic specifications",
                genericFixturing: "Work holding uses generic parameters",
                balancedOnly: "Speeds & feeds locked to balanced mode",
                noSurfaceFinish: "Surface finish selection not available",
                noAiFeatures: "AI-enhanced features not included",
                noCadRecognition: "CAD/Print recognition not available"
            },
            upgradePrompts: {
                holderSelect: "⬆️ Upgrade to Professional for brand-specific holders (Rego-Fix, Haimer, Schunk)",
                fixtureSelect: "⬆️ Upgrade to Professional for advanced work holding options",
                speedsFeed: "⬆️ Upgrade to Professional for full speed/feed range (Conservative to Aggressive)",
                surfaceFinish: "⬆️ Upgrade to Professional for surface finish optimization",
                aiFeatures: "⬆️ Upgrade to Professional for AI-enhanced settings",
                quoting: "⬆️ Upgrade to Professional for full quoting module access"
            }
        },
        // TIER 3: PROFESSIONAL - Advanced
        // $149/month or $1,490/year (17% savings)
        tier3: {
            id: "professional",
            name: "Professional",
            tagline: "Complete Solution",
            monthlyPrice: 149,
            yearlyPrice: 1490,
            yearlySavings: "17%",
            color: "#a855f7", // Purple
            icon: "⚡",
            badge: "BEST VALUE",

            // Module access
            modules: {
                included: 4, // 4 modules included
                available: ['mill', 'lathe', 'sinker_edm', 'wire_edm', 'laser', 'waterjet'],
                addOnPrice: 29 // Per additional module/month
            },
            // Feature access
            features: {
                // Machine Selection - FULL ACCESS
                machineSelection: "full",
                machineDatabase: true,
                customMachineSpecs: true,
                machineCribLimit: 50,

                // Tooling - FULL ACCESS
                toolingSelection: "full",
                brandTooling: true,
                toolCribLimit: 500,

                // Tool Holders - FULL ACCESS
                holderSelection: "full",
                brandHolders: true,

                // Work Holding / Fixturing - FULL ACCESS
                fixtureSelection: "full",
                customFixtures: true,

                // Speeds & Feeds - FULL RANGE
                speedsFeedsMode: "full", // Conservative, Balanced, Aggressive, MRR Max
                sfmCustomization: true,
                chiploadAdjustment: true,

                // Surface Finish - FULL ACCESS
                surfaceFinishSelection: true,
                roughnessCalculation: true,

                // Materials
                materialDatabase: "full", // 500+ materials
                customMaterials: true,
                heatTreatStates: true,
                exoticMaterials: true,

                // Calculations
                calculationsPerDay: "unlimited",
                multiOperationSupport: true,

                // Output & Export
                exportFormats: ['txt', 'pdf', 'xlsx', 'csv', 'json'],
                setupSheetExport: true,

                // Advanced Features
                cadRecognition: false, // NOT INCLUDED
                printRecognition: false, // NOT INCLUDED
                aiEnhancedSettings: false, // NOT INCLUDED
                workflowSuggestions: true,
                quotingModule: true, // Full access
                costAnalysis: "full",

                // Support
                supportLevel: "priority_email",
                responseTime: "12-24 hours"
            },
            limitations: {
                noCadRecognition: "CAD file recognition requires Enterprise",
                noPrintRecognition: "Print/PDF recognition requires Enterprise",
                noAiEnhanced: "AI-enhanced optimization requires Enterprise"
            },
            upgradePrompts: {
                cadRecognition: "⬆️ Upgrade to Enterprise for automatic CAD file analysis",
                printRecognition: "⬆️ Upgrade to Enterprise for print/drawing recognition",
                aiEnhanced: "⬆️ Upgrade to Enterprise for AI-powered parameter optimization"
            }
        },
        // TIER 4: ENTERPRISE - Everything Unlocked
        // $299/month or $2,990/year (17% savings)
        tier4: {
            id: "enterprise",
            name: "Enterprise",
            tagline: "Ultimate Manufacturing Intelligence",
            monthlyPrice: 299,
            yearlyPrice: 2990,
            yearlySavings: "17%",
            color: "#f59e0b", // Gold
            icon: "👑",
            badge: "FULL ACCESS",

            // Module access
            modules: {
                included: "all", // All 6 modules included
                available: ['mill', 'lathe', 'sinker_edm', 'wire_edm', 'laser', 'waterjet'],
                addOnPrice: 0 // No add-ons needed
            },
            // Feature access - EVERYTHING UNLOCKED
            features: {
                // Machine Selection
                machineSelection: "full",
                machineDatabase: true,
                customMachineSpecs: true,
                machineCribLimit: "unlimited",

                // Tooling
                toolingSelection: "full",
                brandTooling: true,
                toolCribLimit: "unlimited",

                // Tool Holders
                holderSelection: "full",
                brandHolders: true,

                // Work Holding / Fixturing
                fixtureSelection: "full",
                customFixtures: true,

                // Speeds & Feeds
                speedsFeedsMode: "full",
                sfmCustomization: true,
                chiploadAdjustment: true,

                // Surface Finish
                surfaceFinishSelection: true,
                roughnessCalculation: true,

                // Materials
                materialDatabase: "full",
                customMaterials: true,
                heatTreatStates: true,
                exoticMaterials: true,

                // Calculations
                calculationsPerDay: "unlimited",
                multiOperationSupport: true,

                // Output & Export
                exportFormats: ['txt', 'pdf', 'xlsx', 'csv', 'json', 'xml'],
                setupSheetExport: true,

                // Advanced Features - ALL UNLOCKED
                cadRecognition: true,
                printRecognition: true,
                aiEnhancedSettings: true,
                workflowSuggestions: true,
                quotingModule: true,
                costAnalysis: "full",

                // Enterprise Exclusive
                apiAccess: true,
                multiUser: true,
                teamManagement: true,
                customBranding: true,
                ssoIntegration: true,
                auditLogging: true,

                // Support
                supportLevel: "dedicated",
                responseTime: "4-8 hours",
                phoneSupport: true,
                accountManager: true
            },
            limitations: {}, // No limitations
            upgradePrompts: {} // No upgrade prompts needed
        }
    },
    // MODULE DEFINITIONS
    modules: {
        mill: {
            id: "mill",
            name: "Milling",
            description: "VMC, HMC, 3-axis, 4-axis, 5-axis milling",
            icon: "🔧",
            includes: ["face_milling", "pocket_milling", "contouring", "drilling", "tapping", "boring", "slotting"]
        },
        lathe: {
            id: "lathe",
            name: "Turning",
            description: "CNC lathes, turning centers, Swiss-type",
            icon: "🔄",
            includes: ["od_turning", "id_turning", "facing", "grooving", "threading", "parting", "boring"]
        },
        sinker_edm: {
            id: "sinker_edm",
            name: "Sinker EDM",
            description: "Die sinker EDM, ram EDM",
            icon: "⚡",
            includes: ["cavity_sinking", "electrode_design", "orbiting", "flushing_calc"]
        },
        wire_edm: {
            id: "wire_edm",
            name: "Wire EDM",
            description: "Wire electrical discharge machining",
            icon: "〰️",
            includes: ["straight_cutting", "taper_cutting", "skim_cuts", "wire_selection"]
        },
        laser: {
            id: "laser",
            name: "Laser Cutting",
            description: "Fiber laser, CO2 laser cutting",
            icon: "🔦",
            includes: ["cutting_speed", "pierce_time", "gas_selecti