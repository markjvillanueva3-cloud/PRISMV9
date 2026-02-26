const PRISM_JERGENS_DATABASE = {

    manufacturer: "Jergens, Inc.",
    brand: "Jergens",
    country: "USA",
    location: "Cleveland, Ohio",
    founded: 1942,
    catalog_source: "Jergens Master Product Catalog",
    iso_certified: "ISO 9001:2008",

    // BALL LOCK® MOUNTING SYSTEM
    // Industry's most popular quick-change fixturing system

    ballLock: {
        series_name: "Ball Lock®",
        description: "Quick-change fixturing system for fast setups",
        repeatability_in: 0.0005,
        repeatability_mm: 0.013,

        shanks: [
            {
                id: "JERG_BL_SHANK_375",
                part_number: "49001",
                description: "Ball Lock Shank 3/8\"",
                diameter_in: 0.375,
                diameter_mm: 9.525,
                pull_force_lbs: 2500,
                material: "alloy_steel",
                finish: "black_oxide"
            },
            {
                id: "JERG_BL_SHANK_500",
                part_number: "49002",
                description: "Ball Lock Shank 1/2\"",
                diameter_in: 0.500,
                diameter_mm: 12.7,
                pull_force_lbs: 4000,
                material: "alloy_steel",
                finish: "black_oxide"
            },
            {
                id: "JERG_BL_SHANK_625",
                part_number: "49003",
                description: "Ball Lock Shank 5/8\"",
                diameter_in: 0.625,
                diameter_mm: 15.875,
                pull_force_lbs: 6000,
                material: "alloy_steel",
                finish: "black_oxide"
            },
            {
                id: "JERG_BL_SHANK_750",
                part_number: "49004",
                description: "Ball Lock Shank 3/4\"",
                diameter_in: 0.750,
                diameter_mm: 19.05,
                pull_force_lbs: 8000,
                material: "alloy_steel",
                finish: "black_oxide"
            },
            {
                id: "JERG_BL_SHANK_1000",
                part_number: "49005",
                description: "Ball Lock Shank 1\"",
                diameter_in: 1.000,
                diameter_mm: 25.4,
                pull_force_lbs: 12000,
                material: "alloy_steel",
                finish: "black_oxide"
            },
            {
                id: "JERG_BL_SHANK_1250",
                part_number: "49006",
                description: "Ball Lock Shank 1-1/4\"",
                diameter_in: 1.250,
                diameter_mm: 31.75,
                pull_force_lbs: 18000,
                material: "alloy_steel",
                finish: "black_oxide"
            }
        ],

        receiverBushings: [
            {
                id: "JERG_BL_BUSHING_375",
                part_number: "49101",
                description: "Receiver Bushing 3/8\"",
                for_shank_in: 0.375,
                material: "hardened_steel"
            },
            {
                id: "JERG_BL_BUSHING_500",
                part_number: "49102",
                description: "Receiver Bushing 1/2\"",
                for_shank_in: 0.500,
                material: "hardened_steel"
            },
            {
                id: "JERG_BL_BUSHING_625",
                part_number: "49103",
                description: "Receiver Bushing 5/8\"",
                for_shank_in: 0.625,
                material: "hardened_steel"
            },
            {
                id: "JERG_BL_BUSHING_750",
                part_number: "49104",
                description: "Receiver Bushing 3/4\"",
                for_shank_in: 0.750,
                material: "hardened_steel"
            },
            {
                id: "JERG_BL_BUSHING_1000",
                part_number: "49105",
                description: "Receiver Bushing 1\"",
                for_shank_in: 1.000,
                material: "hardened_steel"
            },
            {
                id: "JERG_BL_BUSHING_1250",
                part_number: "49106",
                description: "Receiver Bushing 1-1/4\"",
                for_shank_in: 1.250,
                material: "hardened_steel"
            }
        ],

        fixturePlates: [
            {
                id: "JERG_BL_PLATE_6x6",
                description: "Fixture Plate 6\" x 6\"",
                size_in: [6, 6],
                thickness_in: 0.75,
                hole_pattern: "2x2",
                material: "aluminum"
            },
            {
                id: "JERG_BL_PLATE_8x8",
                description: "Fixture Plate 8\" x 8\"",
                size_in: [8, 8],
                thickness_in: 0.75,
                hole_pattern: "2x2",
                material: "aluminum"
            },
            {
                id: "JERG_BL_PLATE_12x12",
                description: "Fixture Plate 12\" x 12\"",
                size_in: [12, 12],
                thickness_in: 1.0,
                hole_pattern: "3x3",
                material: "aluminum"
            },
            {
                id: "JERG_BL_PLATE_18x18",
                description: "Fixture Plate 18\" x 18\"",
                size_in: [18, 18],
                thickness_in: 1.0,
                hole_pattern: "4x4",
                material: "aluminum"
            },
            {
                id: "JERG_BL_PLATE_24x24",
                description: "Fixture Plate 24\" x 24\"",
                size_in: [24, 24],
                thickness_in: 1.5,
                hole_pattern: "5x5",
                material: "aluminum"
            }
        ],

        subplates: [
            {
                id: "JERG_BL_SUBPLATE_12x12",
                description: "Subplate 12\" x 12\"",
                size_in: [12, 12],
                thickness_in: 1.5,
                material: "steel"
            },
            {
                id: "JERG_BL_SUBPLATE_18x18",
                description: "Subplate 18\" x 18\"",
                size_in: [18, 18],
                thickness_in: 1.5,
                material: "steel"
            },
            {
                id: "JERG_BL_SUBPLATE_24x24",
                description: "Subplate 24\" x 24\"",
                size_in: [24, 24],
                thickness_in: 2.0,
                material: "steel"
            }
        ],

        toolingColumns: [
            {
                id: "JERG_BL_COLUMN_4SIDE_12",
                description: "4-Sided Tooling Column 12\"",
                height_in: 12,
                faces: 4,
                material: "aluminum"
            },
            {
                id: "JERG_BL_COLUMN_4SIDE_18",
                description: "4-Sided Tooling Column 18\"",
                height_in: 18,
                faces: 4,
                material: "aluminum"
            },
            {
                id: "JERG_BL_COLUMN_TCOL",
                description: "T-Column",
                faces: 2,
                material: "aluminum"
            }
        ]
    },
    // ZERO POINT SYSTEM (ZPS)
    // Pneumatic zero-point clamping

    zeroPointSystem: {
        series_name: "ZPS Zero Point System",
        description: "Pneumatic zero-point clamping system",
        repeatability_mm: 0.005,

        modules: [
            {
                id: "JERG_ZPS_SINGLE",
                model: "ZPS Single Module",
                type: "single",
                clamping_force_kN: 20,
                holding_force_kN: 45,
                actuation: "pneumatic",
                repeatability_mm: 0.005
            },
            {
                id: "JERG_ZPS_K2",
                model: "K2 ZPS",
                type: "compact",
                clamping_force_kN: 15,
                holding_force_kN: 35,
                actuation: "pneumatic",
                repeatability_mm: 0.005,
                features: ["compact", "low_profile"]
            },
            {
                id: "JERG_ZPS_MANUAL",
                model: "Manual ZPS",
                type: "manual",
                clamping_force_kN: 18,
                holding_force_kN: 40,
                actuation: "manual"
            },
            {
                id: "JERG_ZPS_FLANGE",
                model: "Flange Type ZPS",
                type: "flange_mount",
                clamping_force_kN: 25,
                holding_force_kN: 55,
                actuation: "pneumatic"
            },
            {
                id: "JERG_ZPS_RAISED",
                model: "Raised Clamping Module",
                type: "raised",
                clamping_force_kN: 20,
                holding_force_kN: 45,
                actuation: "pneumatic",
                features: ["elevated", "chip_clearance"]
            }
        ],

        pullStuds: [
            { id: "JERG_ZPS_STUD_STD", model: "Standard Pull Stud", type: "standard" },
            { id: "JERG_ZPS_STUD_SHORT", model: "Short Pull Stud", type: "short" },
            { id: "JERG_ZPS_STUD_LONG", model: "Long Pull Stud", type: "long" }
        ],

        clampingPlates: [
            {
                id: "JERG_ZPS_PLATE_2MOD",
                description: "2-Module Clamping Plate",
                modules: 2
            },
            {
                id: "JERG_ZPS_PLATE_4MOD",
                description: "4-Module Clamping Plate",
                modules: 4
            },
            {
                id: "JERG_ZPS_PLATE_6MOD",
                description: "6-Module Clamping Plate",
                modules: 6
            }
        ]
    },
    // FIXTURE-PRO® 5-AXIS WORKHOLDING
    // Multi-axis quick-change system

    fixturePro: {
        series_name: "Fixture-Pro®",
        description: "5-Axis quick-change workholding system",

        vises: [
            {
                id: "JERG_FP_VISE_4",
                model: "Fixture-Pro 4\" Vise",
                jaw_width_in: 4,
                jaw_width_mm: 101.6,
                max_opening_in: 4.5,
                clamping_force_lbs: 4000,
                features: ["5_axis", "dovetail", "quick_change"]
            },
            {
                id: "JERG_FP_VISE_6",
                model: "Fixture-Pro 6\" Vise",
                jaw_width_in: 6,
                jaw_width_mm: 152.4,
                max_opening_in: 6,
                clamping_force_lbs: 6000,
                features: ["5_axis", "dovetail", "quick_change"]
            }
        ],

        dovetailFixtures: [
            {
                id: "JERG_FP_DOVETAIL_60",
                model: "60° Dovetail Fixture",
                angle_deg: 60,
                sizes_in: [2, 3, 4, 6]
            }
        ],

        clampingBlocks: [
            {
                id: "JERG_FP_BLOCK_SINGLE",
                model: "Single Clamping Block",
                type: "single"
            },
            {
                id: "JERG_FP_BLOCK_DOUBLE",
                model: "Double Clamping Block",
                type: "double"
            }
        ]
    },
    // POWER CLAMPING
    // Hydraulic and pneumatic cylinders

    powerClamping: {
        series_name: "Power Clamping",

        swingCylinders: [
            {
                id: "JERG_PC_SWING_LIGHT",
                model: "Light Duty Swing Cylinder",
                force_lbs: 1500,
                swing_angle_deg: 90,
                actuation: "hydraulic"
            },
            {
                id: "JERG_PC_SWING_MED",
                model: "Medium Duty Swing Cylinder",
                force_lbs: 2600,
                swing_angle_deg: 90,
                actuation: "hydraulic"
            },
            {
                id: "JERG_PC_SWING_HEAVY",
                model: "Heavy Duty Swing Cylinder",
                force_lbs: 5000,
                swing_angle_deg: 90,
                actuation: "hydraulic"
            },
            {
                id: "JERG_PC_SWING_XHEAVY",
                model: "Extra Heavy Swing Cylinder",
                force_lbs: 8500,
                swing_angle_deg: 90,
                actuation: "hydraulic"
            }
        ],

        workSupports: [
            {
                id: "JERG_PC_SUPPORT_ADJ",
                model: "Adjustable Work Support",
                force_lbs: 1000,
                actuation: "hydraulic"
            },
            {
                id: "JERG_PC_SUPPORT_SELF",
                model: "Self-Advancing Work Support",
                force_lbs: 500,
                actuation: "spring"
            }
        ],

        linkClamps: [
            {
                id: "JERG_PC_LINK_LIGHT",
                model: "Light Duty Link Clamp",
                force_lbs: 1200,
                actuation: "hydraulic"
            },
            {
                id: "JERG_PC_LINK_MED",
                model: "Medium Duty Link Clamp",
                force_lbs: 2500,
                actuation: "hydraulic"
            },
            {
                id: "JERG_PC_LINK_HEAVY",
                model: "Heavy Duty Link Clamp",
                force_lbs: 5000,
                actuation: "hydraulic"
            }
        ]
    },
    // TOGGLE CLAMPS
    // Manual hold-down and push-pull clamps

    toggleClamps: {
        series_name: "Toggle Clamps",

        holdDown: [
            {
                id: "JERG_TC_HD_100",
                model: "Hold Down Toggle 100 lbs",
                holding_force_lbs: 100,
                type: "vertical"
            },
            {
                id: "JERG_TC_HD_200",
                model: "Hold Down Toggle 200 lbs",
                holding_force_lbs: 200,
                type: "vertical"
            },
            {
                id: "JERG_TC_HD_500",
                model: "Hold Down Toggle 500 lbs",
                holding_force_lbs: 500,
                type: "vertical"
            },
            {
                id: "JERG_TC_HD_1000",
                model: "Hold Down Toggle 1000 lbs",
                holding_force_lbs: 1000,
                type: "vertical"
            }
        ],

        horizontal: [
            {
                id: "JERG_TC_HOR_200",
                model: "Horizontal Toggle 200 lbs",
                holding_force_lbs: 200,
                type: "horizontal"
            },
            {
                id: "JERG_TC_HOR_500",
                model: "Horizontal Toggle 500 lbs",
                holding_force_lbs: 500,
                type: "horizontal"
            }
        ],

        pushPull: [
            {
                id: "JERG_TC_PP_300",
                model: "Push-Pull Toggle 300 lbs",
                holding_force_lbs: 300,
                type: "push_pull"
            },
            {
                id: "JERG_TC_PP_800",
                model: "Push-Pull Toggle 800 lbs",
                holding_force_lbs: 800,
                type: "push_pull"
            }
        ]
    },
    // LOW PROFILE CLAMPING
    // Edge clamps and toe clamps

    lowProfileClamping: {
        series_name: "Low Profile Clam