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
        series_name: "Low Profile Clamping",

        edgeClamps: [
            {
                id: "JERG_LP_EDGE_SM",
                model: "Small Edge Clamp",
                clamping_force_lbs: 500,
                height_in: 0.5
            },
            {
                id: "JERG_LP_EDGE_MED",
                model: "Medium Edge Clamp",
                clamping_force_lbs: 1000,
                height_in: 0.75
            },
            {
                id: "JERG_LP_EDGE_LG",
                model: "Large Edge Clamp",
                clamping_force_lbs: 2000,
                height_in: 1.0
            }
        ],

        toeClamps: [
            {
                id: "JERG_LP_TOE_SM",
                model: "Small Toe Clamp",
                clamping_force_lbs: 800
            },
            {
                id: "JERG_LP_TOE_MED",
                model: "Medium Toe Clamp",
                clamping_force_lbs: 1500
            },
            {
                id: "JERG_LP_TOE_LG",
                model: "Large Toe Clamp",
                clamping_force_lbs: 3000
            }
        ]
    },
    // KWIK-LOK® PINS
    // Quick-release locating pins

    kwikLokPins: {
        series_name: "Kwik-Lok® Pins",
        description: "Quick-release locating pins",

        standardPins: [
            { id: "JERG_KL_PIN_250", diameter_in: 0.250, diameter_mm: 6.35 },
            { id: "JERG_KL_PIN_312", diameter_in: 0.312, diameter_mm: 7.92 },
            { id: "JERG_KL_PIN_375", diameter_in: 0.375, diameter_mm: 9.53 },
            { id: "JERG_KL_PIN_500", diameter_in: 0.500, diameter_mm: 12.7 },
            { id: "JERG_KL_PIN_625", diameter_in: 0.625, diameter_mm: 15.88 },
            { id: "JERG_KL_PIN_750", diameter_in: 0.750, diameter_mm: 19.05 },
            { id: "JERG_KL_PIN_1000", diameter_in: 1.000, diameter_mm: 25.4 }
        ]
    },
    // LIFTING SOLUTIONS
    // Hoist rings and swivel hoists

    liftingSolutions: {
        series_name: "Lifting Solutions",

        hoistRings: [
            {
                id: "JERG_LIFT_CENTER_1000",
                model: "Center Pull Hoist Ring",
                capacity_lbs: 1000,
                thread_sizes: ["1/4-20", "5/16-18", "3/8-16"]
            },
            {
                id: "JERG_LIFT_CENTER_2500",
                model: "Center Pull Hoist Ring",
                capacity_lbs: 2500,
                thread_sizes: ["1/2-13", "5/8-11"]
            },
            {
                id: "JERG_LIFT_CENTER_5000",
                model: "Center Pull Hoist Ring",
                capacity_lbs: 5000,
                thread_sizes: ["3/4-10", "7/8-9"]
            },
            {
                id: "JERG_LIFT_SIDE_2500",
                model: "Side Pull Hoist Ring",
                capacity_lbs: 2500,
                swivel: true
            },
            {
                id: "JERG_LIFT_SIDE_5000",
                model: "Side Pull Hoist Ring",
                capacity_lbs: 5000,
                swivel: true
            }
        ]
    },
    // LOOKUP METHODS

    getById: function(id) {
        const allItems = [
            ...this.ballLock.shanks,
            ...this.ballLock.receiverBushings,
            ...this.ballLock.fixturePlates,
            ...this.zeroPointSystem.modules,
            ...this.fixturePro.vises,
            ...this.powerClamping.swingCylinders,
            ...this.toggleClamps.holdDown,
            ...this.lowProfileClamping.edgeClamps
        ];
        return allItems.find(item => item.id === id);
    },
    getBallLockBySize: function(diameter_in) {
        return {
            shank: this.ballLock.shanks.find(s => s.diameter_in === diameter_in),
            bushing: this.ballLock.receiverBushings.find(b => b.for_shank_in === diameter_in)
        };
    },
    getZeroPointModules: function() {
        return this.zeroPointSystem.modules;
    },
    getToggleClampsByForce: function(min_lbs) {
        return [
            ...this.toggleClamps.holdDown,
            ...this.toggleClamps.horizontal,
            ...this.toggleClamps.pushPull
        ].filter(tc => tc.holding_force_lbs >= min_lbs);
    },
    getTotalProducts: function() {
        let count = 0;
        count += this.ballLock.shanks.length;
        count += this.ballLock.receiverBushings.length;
        count += this.ballLock.fixturePlates.length;
        count += this.ballLock.subplates.length;
        count += this.ballLock.toolingColumns.length;
        count += this.zeroPointSystem.modules.length;
        count += this.zeroPointSystem.pullStuds.length;
        count += this.zeroPointSystem.clampingPlates.length;
        count += this.fixturePro.vises.length;
        count += this.powerClamping.swingCylinders.length;
        count += this.powerClamping.workSupports.length;
        count += this.powerClamping.linkClamps.length;
        count += this.toggleClamps.holdDown.length;
        count += this.toggleClamps.horizontal.length;
        count += this.toggleClamps.pushPull.length;
        count += this.lowProfileClamping.edgeClamps.length;
        count += this.lowProfileClamping.toeClamps.length;
        count += this.kwikLokPins.standardPins.length;
        count += this.liftingSolutions.hoistRings.length;
        return count;
    }
};
// Summary
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Jergens Database loaded:');
console.log('  - Ball Lock® shanks: ' + PRISM_JERGENS_DATABASE.ballLock.shanks.length);
console.log('  - ZPS modules: ' + PRISM_JERGENS_DATABASE.zeroPointSystem.modules.length);
console.log('  - Fixture-Pro® vises: ' + PRISM_JERGENS_DATABASE.fixturePro.vises.length);
console.log('  - Power clamping: ' + (PRISM_JERGENS_DATABASE.powerClamping.swingCylinders.length + PRISM_JERGENS_DATABASE.powerClamping.linkClamps.length));
console.log('  - Toggle clamps: ' + (PRISM_JERGENS_DATABASE.toggleClamps.holdDown.length + PRISM_JERGENS_DATABASE.toggleClamps.horizontal.length));
console.log('  - Total products: ' + PRISM_JERGENS_DATABASE.getTotalProducts());

// Link Jergens database to fixture system
if (typeof PRISM_FIXTURE_DATABASE !== 'undefined') {
    PRISM_FIXTURE_DATABASE.manufacturers.jergens = PRISM_JERGENS_DATABASE;
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Jergens database linked to fixture system');
}
// Register with master controller
if (typeof PRISM_MASTER !== 'undefined') {
    PRISM_MASTER.databases.jergens = PRISM_JERGENS_DATABASE;
    PRISM_MASTER.databases.jergens_ball_lock = PRISM_JERGENS_DATABASE.ballLock;
    PRISM_MASTER.databases.jergens_zps = PRISM_JERGENS_DATABASE.zeroPointSystem;
}
// LANG TECHNIK WORKHOLDING DATABASE INTEGRATION
// Added: January 14, 2026
// Quick-Point®, Makro-Grip®, 5-Axis Vices, Automation

// LANG TECHNIK WORKHOLDING DATABASE
// Extracted from Lang Technik Catalogue 2021
// Quick-Point®, Makro-Grip®, 5-Axis Vices, Automation
// Generated: January 14, 2026

const PRISM_LANG_DATABASE = {

    manufacturer: "LANG Technik GmbH",
    brand: "LANG Technik",
    country: "Germany",
    location: "Holzmaden",
    founded: 1984,
    catalog_source: "Lang Technik Catalogue 2021",
    motto: "simple. gripping. future.",

    // QUICK-POINT® ZERO-POINT CLAMPING SYSTEM
    // Mechanical zero-point system with <0.005mm repeatability

    quickPoint: {
        series_name: "Quick-Point®",
        description: "Mechanical zero-point clamping system",
        repeatability_mm: 0.005,
        height_mm: 27,  // One of the lowest on the market
        holding_force_kg: 6000,
        actuation_torque_Nm: 30,

        gridSizes: {
            "52": {
                spacing_mm: 52,
                description: "Compact grid for smaller vises",
                stud_size: "M8"
            },
            "96": {
                spacing_mm: 96,
                description: "Standard grid for larger applications",
                stud_size: "M12"
            }
        },
        singlePlates: [
            {
                id: "LANG_QP52_104x104",
                item_no: "45600",
                model: "Quick-Point® 52 Single Plate",
                grid: 52,
                dimensions_mm: [104, 104, 27],
                weight_kg: 2.0
            },
            {
                id: "LANG_QP52_156x104",
                item_no: "45601",
                model: "Quick-Point® 52 Single Plate",
                grid: 52,
                dimensions_mm: [156, 104, 27],
                weight_kg: 3.0
            },
            {
                id: "LANG_QP96_192x192",
                item_no: "45700",
                model: "Quick-Point® 96 Single Plate",
                grid: 96,
                dimensions_mm: [192, 192, 27],
                weight_kg: 6.5
            },
            {
                id: "LANG_QP96_288x192",
                item_no: "45701",
                model: "Quick-Point® 96 Single Plate",
                grid: 96,
                dimensions_mm: [288, 192, 27],
                weight_kg: 9.5
            }
        ],

        multiPlates: [
            {
                id: "LANG_QP52_MULTI_2x2",
                model: "Quick-Point® 52 Multi Plate 2x2",
                grid: 52,
                clamping_positions: 4
            },
            {
                id: "LANG_QP52_MULTI_3x2",
                model: "Quick-Point® 52 Multi Plate 3x2",
                grid: 52,
                clamping_positions: 6
            },
            {
                id: "LANG_QP96_MULTI_2x2",
                model: "Quick-Point® 96 Multi Plate 2x2",
                grid: 96,
                clamping_positions: 4
            },
            {
                id: "LANG_QP96_MULTI_3x2",
                model: "Quick-Point® 96 Multi Plate 3x2",
                grid: 96,
                clamping_positions: 6
            }
        ],

        adaptorPlates: [
            {
                id: "LANG_QP_ADAPTOR_96to52",
                model: "Quick-Point® Adaptor 96→52",
                from_grid: 96,
                to_grid: 52,
                description: "Adapts QP96 base to QP52 vises"
            }
        ],

        risers: [
            {
                id: "LANG_QP_RISER_50",
                model: "Quick-Point® Riser 50mm",
                height_mm: 50
            },
            {
                id: "LANG_QP_RISER_100",
                model: "Quick-Point® Riser 100mm",
                height_mm: 100
            },
            {
                id: "LANG_QP_RISER_150",
                model: "Quick-Point® Riser 150mm",
                height_mm: 150
            }
        ],

        clampingTowers: [
            {
                id: "LANG_QP_TOWER_VMC",
                model: "Quick-Point® Clamping Tower VMC",
                description: "For vertical machining centres",
                faces: 4
            },
            {
                id: "LANG_QP_TOWER_HMC",
                model: "Quick-Point® Clamping Tower HMC",
                description: "For horizontal machining centres",
                faces: 4
            }
        ],

        clampingStuds: [
            {
                id: "LANG_QP52_STUD_STD",
                model: "Quick-Point® 52 Clamping Stud Standard",
                grid: 52,
                type: "standard"
            },
            {
                id: "LANG_QP52_STUD_SHORT",
                model: "Quick-Point® 52 Clamping Stud Short",
                grid: 52,
                type: "short"
            },
            {
                id: "LANG_QP96_STUD_STD",
                model: "Quick-Point® 96 Clamping Stud Standard",
                grid: 96,
                type: "standard"
            },
            {
                id: "LANG_QP96_STUD_SHORT",
                model: "Quick-Point® 96 Clamping Stud Short",
                grid: 96,
                type: "short"
            }
        ],

        quickLock: {
            id: "LANG_QP_QUICKLOCK",
            model: "Quick-Lock Device",
            description: "Fast actuation without torque wrench",
            actuation: "lever"
        }
    },
    // MAKRO-GRIP® STAMPING TECHNOLOGY
    // Unique stamping system for raw material clamping

    makroGripStamping: {
        series_name: "Makro-Grip® Stamping",
        description: "Unique stamping technology for secure raw material clamping",
        features: [
            "Stamps into raw material for form-fit clamping",
            "Enables 5-sided machining in one setup",
            "Minimal clamping depth (3mm typical)",
            "Eliminates need for soft jaws"
        ],

        stampingUnits: [
            {
                id: "LANG_MG_STAMP_77",
                model: "Makro-Grip® Stamping Unit 77",
                width_mm: 77,
                stamping_force_kN: 100,
                features: ["replaceable_stamps", "quick_point_compatible"]
            },
            {
                id: "LANG_MG_STAMP_125",
                model: "Makro-Grip® Stamping Unit 125",
                width_mm: 125,
                stamping_force_kN: 150,
                features: ["replaceable_stamps", "quick_point_compatible"]
            },
            {
                id: "LANG_MG_STAMP_PRESS",
                model: "Makro-Grip® Stamping Press",
                description: "Standalone hydraulic stamping press",
                force_kN: 200
            }
        ]
    },
    // MAKRO-GRIP® 5-AXIS VICES
    // Premium 5-axis workholding vises

    makroGrip5Axis: {
        series_name: "Makro-Grip® 5-Axis",
        description: "5-axis vices with stamping technology",
        repeatability_mm: 0.01,

        vises: [
            {
                id: "LANG_MG5_46",
                model: "Makro-Grip® 5-Axis Vice 46",
                jaw_width_mm: 46,
                max_opening_mm: 96,
                clamping_force_kN: 25,
                weight_kg: 3.5,
                quick_point: 52,
                features: ["5_axis", "stamping", "pull_down"]
            },
            {
                id: "LANG_MG5_77",
                model: "Makro-Grip® 5-Axis Vice 77",
                jaw_width_mm: 77,
                max_opening_mm: 165,
                clamping_force_kN: 35,
                weight_kg: 7.5,
                quick_point: 52,
                features: ["5_axis", "stamping", "pull_down"]
            },
            {
                id: "LANG_MG5_125",
                model: "Makro-Grip® 5-Axis Vice 125",
                jaw_width_mm: 125,
                max_opening_mm: 260,
                clamping_force_kN: 50,
                weight_kg: 15,
                quick_point: 96,
                features: ["5_axis", "stamping", "pull_down"]
            },
            {
                id: "LANG_MG5_160",
                model: "Makro-Grip® 5-Axis Vice 160",
                jaw_width_mm: 160,
                max_opening_mm: 350,
                clamping_force_kN: 60,
                weight_kg: 25,
                quick_point: 96,
                features: ["5_axis", "stamping", "pull_down"]
            }
        ],

        accessories: {
            contourJaws: [
                {
                    id: "LANG_MG5_JAW_CONTOUR_46",
                    model: "Contour Jaws 46",
                    for_vice: 46,
                    attachment: "magnetic"
                },
                {
                    id: "LANG_MG5_JAW_CONTOUR_77",
                    model: "Contour Jaws 77",
                    for_vice: 77,
                    attachment: "magnetic"
                },
                {
                    id: "LANG_MG5_JAW_CONTOUR_125",
                    model: "Contour Jaws 125",
                    for_vice: 125,
                    attachment: "magnetic"
                }
            ],

            softJaws: [
                {
                    id: "LANG_MG5_JAW_SOFT_46",
                    model: "Soft Jaws 46",
                    for_vice: 46,
                    material: "aluminum"
                },
                {
                    id: "LANG_MG5_JAW_SOFT_77",
                    model: "Soft Jaws 77",
                    for_vice: 77,
                    material: "aluminum"
                }
            ]
        }
    },
    // MAKRO-GRIP® ULTRA
    // Large part clamping system

    makroGripUltra: {
        series_name: "Makro-Grip® Ultra",
        description: "Modular system for large part clamping up to 810mm+",
        features: [
            "Modular expandable design",
            "Parts up to 810mm and beyond",
            "Flat material clamping",
            "Mould making applications"
        ],

        baseModules: [
            {
                id: "LANG_MGU_BASE_200",
                model: "Makro-Grip® Ultra Base 200",
                width_mm: 200,
                clamping_force_kN: 80
            },
            {
                id: "LANG_MGU_BASE_300",
                model: "Makro-Grip® Ultra Base 300",
                width_mm: 300,
                clamping_force_kN: 100
            }
        ],

        extensionModules: [
            {
                id: "LANG_MGU_EXT_200",
                model: "Makro-Grip® Ultra Extension 200",
                adds_length_mm: 200
            },
            {
                id: "LANG_MGU_EXT_300",
                model: "Makro-Grip® Ultra Extension 300",
                adds_length_mm: 300
            }
        ]
    },
    // CONVENTIONAL WORKHOLDING
    // Standard vises and collet chucks

    conventionalWorkholding: {

        vises: [
            {
                id: "LANG_CONV_VISE_100",
                model: "Conventional Vice 100",
                jaw_width_mm: 100,
                max_opening_mm: 125,
                clamping_force_kN: 25
            },
            {
                id: "LANG_CONV_VISE_125",
                model: "Conventional Vice 125",
                jaw_width_mm: 125,
                max_opening_mm: 160,
                clamping_force_kN: 35
            },
            {
                id: "LANG_CONV_VISE_160",
                model: "Conventional Vice 160",
                jaw_width_mm: 160,
                max_opening_mm: 200,
                clamping_force_kN: 45
            }
        ],

        preciPoint: [
            {
                id: "LANG_PRECIPOINT_ER32",
                model: "Preci-Point ER32",
                collet_type: "ER32",
                clamping_range_mm: [3, 20],
                quick_point: 52,
                description: "Collet chuck for round parts"
            },
            {
                id: "LANG_PRECIPOINT_ER50",
                model: "Preci-Point ER50",
                collet_type: "ER50",
                clamping_range_mm: [8, 34],
                quick_point: 52,
                description: "Collet chuck for round parts"
            }
        ],

        vastoClamp: {
            id: "LANG_VASTO_6JAW",
            model: "Vasto-Clamp 6-Jaw Chuck",
            jaws: 6,
            description: "Flexible 6-jaw chuck for round parts",
            features: ["self_centering", "high_grip"]
        },
        makro4Grip: {
            id: "LANG_MAKRO4GRIP",
            model: "Makro-4Grip",
            description: "Stamping technology for cylindrical parts",
            features: ["pre_stamping", "form_fit", "round_parts"]
        }
    },
    // AUTOMATION SYSTEMS
    // RoboTrex and HAUBEX

    automation: {

        roboTrex: {
            id: "LANG_ROBOTREX",
            series_name: "RoboTrex",
            description: "Robot-based automation system for CNC machines",
            features: [
                "Robot loading/unloading",
                "Compatible with all LANG vises",
                "Pallet storage system",
                "Lights-out manufacturing"
            ],
            models: [
                {
                    id: "LANG_ROBOTREX_52",
                    model: "RoboTrex 52",
                    for_quick_point: 52,
                    pallet_capacity: 20
                },
                {
                    id: "LANG_ROBOTREX_96",
                    model: "RoboTrex 96",
                    for_quick_point: 96,
                    pallet_capacity: 16
                }
            ]
        },
        haubex: {
            id: "LANG_HAUBEX",
            series_name: "HAUBEX",
            description: "Tool magazine automation - uses existing tool changer",
            features: [
                "No robot required",
                "Uses machine tool magazine",
                "Workholding hood carrier system",
                "Vice stored like a tool",
                "Mechanical actuation"
            ],
            compatibility: ["vertical_machining_centres"],
            patented: true
        }
    },
    // ACCESSORIES

    accessories: {
        cleanTec: {
            id: "LANG_CLEANTEC",
            model: "Clean-Tec Chip Fan",
            description: "Chip removal system for automated manufacturing"
        },
        centringStuds: [
            { id: "LANG_CENTRE_52", model: "Centring Stud 52", grid: 52 },
            { id: "LANG_CENTRE_96", model: "Centring Stud 96", grid: 96 }
        ]
    },
    // LOOKUP METHODS

    getById: function(id) {
        const allItems = [
            ...this.quickPoint.singlePlates,
            ...this.quickPoint.multiPlates,
            ...this.quickPoint.risers,
            ...this.makroGripStamping.stampingUnits,
            ...this.makroGrip5Axis.vises,
            ...this.makroGripUltra.baseModules,
            ...this.conventionalWorkholding.vises,
            ...this.conventionalWorkholding.preciPoint
        ];
        return allItems.find(item => item.id === id);
    },
    getQuickPointByGrid: function(grid_mm) {
        return {
            singlePlates: this.quickPoint.singlePlates.filter(p => p.grid === grid_mm),
            multiPlates: this.quickPoint.multiPlates.filter(p => p.grid === grid_mm),
            studs: this.quickPoint.clampingStuds.filter(s => s.grid === grid_mm)
        };
    },
    get5AxisVises: function() {
        return this.makroGrip5Axis.vises;
    },
    getViseByJawWidth: function(width_mm) {
        const allVises = [
            ...this.makroGrip5Axis.vises,
            ...this.conventionalWorkholding.vises
        ];
        return allVises.find(v => v.jaw_width_mm === width_mm);
    },
    getTotalProducts: function() {
        let count = 0;
        count += this.quickPoint.singlePlates.length;
        count += this.quickPoint.multiPlates.length;
        count += this.quickPoint.adaptorPlates.length;
        count += this.quickPoint.risers.length;
        count += this.quickPoint.clampingTowers.length;
        count += this.quickPoint.clampingStuds.length;
        count += this.makroGripStamping.stampingUnits.length;
        count += this.makroGrip5Axis.vises.length;
        count += this.makroGrip5Axis.accessories.contourJaws.length;
        count += this.makroGrip5Axis.accessories.softJaws.length;
        count += this.makroGripUltra.baseModules.length;
        count += this.makroGripUltra.extensionModules.length;
        count += this.conventionalWorkholding.vises.length;
        count += this.conventionalWorkholding.preciPoint.length;
        count += 2; // vastoClamp + makro4Grip
        count += 3; // automation (roboTrex models + haubex)
        return count;
    }
};
// Summary
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Lang Technik Database loaded:');
console.log('  - Quick-Point® plates: ' + (PRISM_LANG_DATABASE.quickPoint.singlePlates.length + PRISM_LANG_DATABASE.quickPoint.multiPlates.length));
console.log('  - Makro-Grip® stamping: ' + PRISM_LANG_DATABASE.makroGripStamping.stampingUnits.length);
console.log('  - Makro-Grip® 5-Axis vises: ' + PRISM_LANG_DATABASE.makroGrip5Axis.vises.length);
console.log('  - Makro-Grip® Ultra modules: ' + (PRISM_LANG_DATABASE.makroGripUltra.baseModules.length + PRISM_LANG_DATABASE.makroGripUltra.extensionModules.length));
console.log('  - Automation systems: RoboTrex, HAUBEX');
console.log('  - Total products: ' + PRISM_LANG_DATABASE.getTotalProducts());

// Link Lang database to fixture system
if (typeof PRISM_FIXTURE_DATABASE !== 'undefined') {
    PRISM_FIXTURE_DATABASE.manufacturers.lang = PRISM_LANG_DATABASE;
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Lang Technik database linked to fixture system');
}
// Register with master controller
if (typeof PRISM_MASTER !== 'undefined') {
    PRISM_MASTER.databases.lang = PRISM_LANG_DATABASE;
    PRISM_MASTER.databases.lang_quick_point = PRISM_LANG_DATABASE.quickPoint;
    PRISM_MASTER.databases.lang_makro_grip = PRISM_LANG_DATABASE.makroGrip5Axis;
}
console.log('╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║           PRISM v8.61.026 - COMPREHENSIVE FIXTURE DATABASE                   ║');
console.log('╠════════════════════════════════════════════════════════════════════════════╣');
console.log('║  FIXTURE DATABASES:                                                        ║');
console.log('║  ✅ Kurt (USA): 25 vises (AngLock, MaxLock, PF, HD)                       ║');
console.log('║  ✅ SCHUNK (Germany): 36 fixtures + 19 toolholding lines                  ║');
console.log('║  ✅ Jergens (USA): 70+ products (Ball Lock, ZPS, Fixture-Pro)             ║');
console.log('║  ✅ Lang Technik (Germany): 45+ products (Quick-Point, Makro-Grip)        ║');
console.log('║  ✅ Fixture Selection Engine: Intelligent workholding recommendations     ║');
console.log('║  ✅ Stiffness Database: Critical values for chatter prediction            ║');
console.log('║  ✅ Clamping Force Calculator: Safety factors and friction coefficients   ║');
console.log('║  ✅ Deflection Calculations: Workpiece deformation prediction             ║');
console.log('╠════════════════════════════════════════════════════════════════════════════╣');
console.log('║  KURT VISE SERIES:                                                         ║');
console.log('║  • AngLock (D40, D675, D688, D810) - Industry standard                    ║');
console.log('║  • CrossOver (DX4, DX6, DX6H) - Double-lock design                        ║');
console.log('║  • MaxLock (3600V, 3610V, 3620V, 3800V) - Maximum capacity                ║');
console.log('║  • Precision Force (PF420, PF440, PF460) - High clamp force               ║');
console.log('║  • HD Series (HD690, HD691) - Heavy duty industrial                       ║');
console.log('║  • Self-Centering (SCD430, SCD640) - Double-acting                        ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝');
console.log('');

// PRISM v8.61.026 - WORKHOLDING GEOMETRY INTEGRATION
// Full 3D Volumetric Data for CAD Generation, Simulation & Collision Avoidance
// Integrated: January 14, 2026

// PRISM WORKHOLDING GEOMETRY & KINEMATICS DATABASE
// Full 3D Volumetric Data for CAD Generation, Simulation & Collision Avoidance
// Generated: January 14, 2026

(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Loading Workholding Geometry & Kinematics Database...');

/*
╔═══════════════════════════════════════════════════════════════════════════════╗
║                WORKHOLDING GEOMETRY DATABASE - PURPOSE                        ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  1. CAD GENERATION: Full parametric dimensions for automatic model creation  ║
║  2. SIMULATION: Kinematic ranges for jaw movement, clamping simulation       ║
║  3. COLLISION AVOIDANCE: Bounding volumes, interference zones, clearances    ║
║  4. SETUP VERIFICATION: Mounting interfaces, spindle compatibility           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
*/

const PRISM_WORKHOLDING_GEOMETRY = {
    version: '1.0.0',
    generatedDate: '2026-01-14',

    // BISON POWER CHUCKS - FULL GEOMETRIC DATA

    bison: {

        // 2405-K: 3-JAW POWER CHUCK (Kitagawa B-200 Compatible)
        '2405-K': {
            description: '3-Jaw Power Chuck with Through-Hole',
            jaws: 3,
            compatibility: 'Kitagawa B-200',
            serration: '1.5x60°',  // 3x60° for sizes 400+

            // Dimensional key:
            // A = Outer diameter
            // B = Body height (front face to back)
            // C = Body height (to mounting face)
            // D = Mounting diameter (H6 fit to spindle)
            // E = Mounting step height
            // F = Bolt circle diameter
            // G = Mounting bolts (qty x thread)
            // H = Jaw slot depth
            // J = Master jaw height
            // K = Distance from face to jaw serration
            // L = Drawbar thread (max)
            // M = Max drawbar stroke
            // O = Pilot diameter
            // d = Through-hole diameter

            sizes: {
                '135': {
                    partNumber: '7-781-0500',
                    type: '2405-135-34K',

                    // OUTER ENVELOPE (for collision detection)
                    envelope: {
                        outerDiameter: 135,      // A - max OD
                        bodyHeight: 60,          // B - total height
                        maxJawExtension: 20,     // beyond OD when open
                        boundingCylinder: { d: 175, h: 75 }  // safe zone
                    },
                    // MOUNTING INTERFACE (for setup verification)
                    mounting: {
                        spindleDiameter: 110,    // D H6 - fits spindle
                        stepHeight: 4,           // E
                        boltCircle: 82.6,        // F
                        bolts: { qty: 3, thread: 'M10', depth: 14.5 },  // G, H
                        spindleNose: ['A2-4', 'A2-5'],  // compatible noses
                        adapterPlate: '8213-Type-I'
                    },
                    // THROUGH-HOLE (for bar stock clearance)
                    throughHole: {
                        diameter: 34,            // d
                        drawbarThread: 'M40x1.5', // L
                        maxDrawbarStroke: 10,    // M
                        pilotDiameter: 20        // O
                    },
                    // JAW KINEMATICS (for clamping simulation)
                    jawKinematics: {
                        jawStroke: 2.7,          // mm per jaw (total travel)
                        jawSlotDepth: 14.5,      // H
                        masterJawHeight: 12,     // J
                        serrationDistance: 45,   // K - from face

                        // Clamping ranges (OD and ID)
                        clampingRangeOD: { min: 10, max: 95 },   // with std jaws
                        clampingRangeID: { min: 45, max: 90 },   // with ID jaws

                        // Jaw positions for simulation
                        jawPositions: {
                            fullyOpen: { radius: 67.5, angle: [0, 120, 240] },
                            fullyClosed: { radius: 5, angle: [0, 120, 240] },
                            nominal: { radius: 30, angle: [0, 120, 240] }
                        }
                    },
                    // PERFORMANCE
                    performance: {
                        maxPullingForce: 17.5,   // kN
                        maxClampingForce: 36,    // kN
                        maxSpeed: 7000,          // rpm
                        weight: 6.0              // kg
                    },
                    // COLLISION ZONES (critical clearances)
                    collisionZones: {
                        frontFace: { z: 0 },
                        jawTips: { z: -12, rMax: 67.5 },  // when fully open
                        backFace: { z: 60 },
                        mountingFace: { z: 59.5 }
                    }
                },
                '160': {
                    partNumber: '7-781-0600',
                    type: '2405-160-45K',

                    envelope: {
                        outerDiameter: 169,
                        bodyHeight: 81,
                        maxJawExtension: 25,
                        boundingCylinder: { d: 220, h: 100 }
                    },
                    mounting: {
                        spindleDiameter: 140,
                        stepHeight: 6,
                        boltCircle: 104.8,
                        bolts: { qty: 6, thread: 'M10', depth: 13.5 },
                        spindleNose: ['A2-5', 'A2-6'],
                        adapterPlate: '8213-Type-I'
                    },
                    throughHole: {
                        diameter: 45,
                        drawbarThread: 'M55x2.0',
                        maxDrawbarStroke: 16,
                        pilotDiameter: 19
                    },
                    jawKinematics: {
                        jawStroke: 3.5,
                        jawSlotDepth: 13.5,
                        masterJawHeight: 20,
                        serrationDistance: 60,
                        clampingRangeOD: { min: 12, max: 130 },
                        clampingRangeID: { min: 60, max: 125 },
                        jawPositions: {
                            fullyOpen: { radius: 84.5, angle: [0, 120, 240] },
                            fullyClosed: { radius: 6, angle: [0, 120, 240] },
                            nominal: { radius: 40, angle: [0, 120, 240] }
                        }
                    },
                    performance: {
                        maxPullingForce: 22,
                        maxClampingForce: 57,
                        maxSpeed: 6000,
                        weight: 12.0
                    },
                    collisionZones: {
                        frontFace: { z: 0 },
                        jawTips: { z: -20, rMax: 84.5 },
                        backFace: { z: 81 },
                        mountingFace: { z: 79 }
                    }
                },
                '200': {
                    partNumber: '7-781-0800',
                    type: '2405-200-52K',

                    envelope: {
                        outerDiameter: 210,
                        bodyHeight: 95,
                        maxJawExtension: 30,
                        boundingCylinder: { d: 270, h: 115 }
                    },
                    mounting: {
                        spindleDiameter: 170,
                        stepHeight: 6,
                        boltCircle: 133.4,
                        bolts: { qty: 6, thread: 'M12', depth: 16.5 },
                        spindleNose: ['A2-6', 'A2-8'],
                        adapterPlate: '8213-Type-II'
                    },
                    throughHole: {
                        diameter: 52,
                        drawbarThread: 'M60x2.0',
                        maxDrawbarStroke: 22.5,
                        pilotDiameter: 20.5
                    },
                    jawKinematics: {
                        jawStroke: 5.0,
                        jawSlotDepth: 16.5,
                        masterJawHeight: 20,
                        serrationDistance: 66,
                        clampingRangeOD: { min: 15, max: 165 },
                        clampingRangeID: { min: 75, max: 160 },
                        jawPositions: {
                            fullyOpen: { radius: 105, angle: [0, 120, 240] },
                            fullyClosed: { radius: 7.5, angle: [0, 120, 240] },
                            nominal: { radius: 50, angle: [0, 120, 240] }
                        }
                    },
                    performance: {
                        maxPullingForce: 34,
                        maxClampingForce: 86,
                        maxSpeed: 5000,
                        weight: 23.0
                    },
                    collisionZones: {
                        frontFace: { z: 0 },
                        jawTips: { z: -20, rMax: 105 },
                        backFace: { z: 95 },
                        mountingFace: { z: 93 }
                    }
                },
                '250': {
                    partNumber: '7-781-1000',
                    type: '2405-250-75K',

                    envelope: {
                        outerDiameter: 254,
                        bodyHeight: 106,
                        maxJawExtension: 35,
                        boundingCylinder: { d: 325, h: 130 }
                    },
                    mounting: {
                        spindleDiameter: 220,
                        stepHeight: 6,
                        boltCircle: 171.4,
                        bolts: { qty: 6, thread: 'M16', depth: 18 },
                        spindleNose: ['A2-8', 'A2-11'],
                        adapterPlate: '8213-Type-II'
                    },
                    throughHole: {
                        diameter: 75,
                        drawbarThread: 'M85x2.0',
                        maxDrawbarStroke: 27,
                        pilotDiameter: 25
                    },
                    jawKinematics: {
                        jawStroke: 6.0,
                        jawSlotDepth: 18,
                        masterJawHeight: 25,
                        serrationDistance: 94,
                        clampingRangeOD: { min: 20, max: 200 },
                        clampingRangeID: { min: 100, max: 195 },
                        jawPositions: {
                            fullyOpen: { radius: 127, angle: [0, 120, 240] },
                            fullyClosed: { radius: 10, angle: [0, 120, 240] },
                            nominal: { radius: 60, angle: [0, 120, 240] }
                        }
                    },
                    performance: {
                        maxPullingForce: 43,
                        maxClampingForce: 111,
                        maxSpeed: 4200,
                        weight: 38.0
                    },
                    collisionZones: {
                        frontFace: { z: 0 },
                        jawTips: { z: -25, rMax: 127 },
                        backFace: { z: 106 },
                        mountingFace: { z: 104 }
                    }
                },
                '315': {
                    partNumber: '7-781-1200',
                    type: '2405-315-91K',

                    envelope: {
                        outerDiameter: 315,
                        bodyHeight: 108,
                        maxJawExtension: 40,
                        boundingCylinder: { d: 395, h: 135 }
                    },
                    mounting: {
                        spindleDiameter: 220,
                        stepHeight: 6,
                        boltCircle: 171.4,
                        bolts: { qty: 6, thread: 'M16', depth: 27 },
                        spindleNose: ['A2-8', 'A2-11'],
                        adapterPlate: '8213-Type-III'
                    },
                    throughHole: {
                        diameter: 91,
                        drawbarThread: 'M100x2.0',
                        maxDrawbarStroke: 27,
                        pilotDiameter: 28
                    },
                    jawKinematics: {
                        jawStroke: 6.0,
                        jawSlotDepth: 27,
                        masterJawHeight: 25,
                        serrationDistance: 108,
                        clampingRangeOD: { min: 25, max: 250 },
                        clampingRangeID: { min: 120, max: 245 },
                        jawPositions: {
                            fullyOpen: { radius: 157.5, angle: [0, 120, 240] },
                            fullyClosed: { radius: 12.5, angle: [0, 120, 240] },
                            nominal: { radius: 75, angle: [0, 120, 240] }
                        }
                    },
                    performance: {
                        maxPullingForce: 56,
                        maxClampingForce: 144,
                        maxSpeed: 3300,
                        weight: 60.0
                    },
                    collisionZones: {
                        frontFace: { z: 0 },
                        jawTips: { z: -25, rMax: 157.5 },
                        backFace: { z: 108 },
                        mountingFace: { z: 106.5 }
                    }
                },
                '400': {
                    partNumber: '7-781-1600',
                    type: '2405-400-120K',

                    envelope: {
                        outerDiameter: 400,
                        bodyHeight: 130,
                        maxJawExtension: 50,
                        boundingCylinder: { d: 500, h: 165 }
                    },
                    mounting: {
                        spindleDiameter: 300,
                        stepHeight: 6,
                        boltCircle: 235.0,
                        bolts: { qty: 6, thread: 'M20', depth: 28 },
                        spindleNose: ['A2-11', 'A2-15'],
                        adapterPlate: '8213-Type-III'
                    },
                    throughHole: {
                        diameter: 120,
                        drawbarThread: 'M130x2.5',
                        maxDrawbarStroke: 34,
                        pilotDiameter: 39
                    },
                    jawKinematics: {
                        jawStroke: 7.85,
                        jawSlotDepth: 28,
                        masterJawHeight: 60,
                        serrationDistance: 140,
                        serration: '3x60°',  // Larger sizes use 3x60°
                        clampingRangeOD: { min: 35, max: 320 },
                        clampingRangeID: { min: 160, max: 315 },
                        jawPositions: {
                            fullyOpen: { radius: 200, angle: [0, 120, 240] },
                            fullyClosed: { radius: 17.5, angle: [0, 120, 240] },
                            nominal: { radius: 100, angle: [0, 120, 240] }
                        }
                    },
                    performance: {
                        maxPullingForce: 71,
                        maxClampingForce: 180,
                        maxSpeed: 2500,
                        weight: 117.0
                    },
                    collisionZones: {
                        frontFace: { z: 0 },
                        jawTips: { z: -60, rMax: 200 },
                        backFace: { z: 130 },
                        mountingFace: { z: 126.5 }
                    }
                },
                '500': {
                    partNumber: '7-781-2000',
                    type: '2405-500-160K',

                    envelope: {
                        outerDiameter: 500,
                        bodyHeight: 127,
                        maxJawExtension: 60,
                        boundingCylinder: { d: 620, h: 165 }
                    },
                    mounting: {
                        spindleDiameter: 380,
                        stepHeight: 6,
                        boltCircle: 330.2,
                        bolts: { qty: 6, thread: 'M24', depth: 35 },
                        spindleNose: ['A2-11', 'A2-15'],
                        adapterPlate: '8213-Type-IV'
                    },
                    throughHole: {
                        diameter: 160,
                        drawbarThread: 'M170x3.0',
                        maxDrawbarStroke: 34.5,
                        pilotDiameter: 43
                    },
                    jawKinematics: {
                        jawStroke: 8.0,
                        jawSlotDepth: 35,
                        masterJawHeight: 60,
                        serrationDistance: 182,
                        serration: '3x60°',
                        clampingRangeOD: { min: 50, max: 400 },
                        clampingRangeID: { min: 200, max: 395 },
                        jawPositions: {
                            fullyOpen: { radius: 250, angle: [0, 120, 240] },
                            fullyClosed: { radius: 25, angle: [0, 120, 240] },
                            nominal: { radius: 125, angle: [0, 120, 240] }
                        }
                    },
                    performance: {
                        maxPullingForce: 90,
                        maxClampingForce: 200,
                        maxSpeed: 1600,
                        weight: 166.0
                    },
                    collisionZones: {
                        frontFace: { z: 0 },
                        jawTips: { z: -60, rMax: 250 },
                        backFace: { z: 127 },
                        mountingFace: { z: 127 }
                    }
                },
                '630': {
                    partNumber: '7-781-2500',
                    type: '2405-630-200K',

                    envelope: {
                        outerDiameter: 630,
                        bodyHeight: 160,
                        maxJawExtension: 70,
                        boundingCylinder: { d: 770, h: 200 }
                    },
                    mounting: {
                        spindleDiameter: 520,
                        stepHeight: 8,
                        boltCircle: 463.6,
                        bolts: { qty: 6, thread: 'M24', depth: 34 },
                        spindleNose: ['A2-15', 'A2-20'],
                        adapterPlate: '8213-Type-IV'
                    },
                    throughHole: {
                        diameter: 200,
                        drawbarThread: 'M200x3.0',
                        maxDrawbarStroke: 44,
                        pilotDiameter: 46
                    },
                    jawKinematics: {
                        jawStroke: 10.0,
                        jawSlotDepth: 34,
                        masterJawHeight: 60,
                        serrationDistance: 230,
                        serration: '3x60°',
                        clampingRangeOD: { min: 70, max: 500 },
                        clampingRangeID: { min: 250, max: 495 },
                        jawPositions: {
                            fullyOpen: { radius: 315, angle: [0, 120, 240] },
                            fullyClosed: { radius: 35, angle: [0, 120, 240] },
                            nominal: { radius: 160, angle: [0, 120, 240] }
                        }
                    },
                    performance: {
                        maxPullingForce: 100,
                        maxClampingForce: 200,
                        maxSpeed: 1200,
                        weight: 320.0
                    },
                    collisionZones: {
                        frontFace: { z: 0 },
                        jawTips: { z: -60, rMax: 315 },
                        backFace: { z: 160 },
                        mountingFace: { z: 158 }
                    }
                },
                '800': {
                    partNumber: '7-781-3200',
                    type: '2405-800-255K',

                    envelope: {
                        outerDiameter: 800,
                        bodyHeight: 160,
                        maxJawExtension: 80,
                        boundingCylinder: { d: 960, h: 210 }
                    },
                    mounting: {
                        spindleDiameter: 520,
                        stepHeight: 8,
                        boltCircle: 463.6,
                        bolts: { qty: 6, thread: 'M24', depth: 34 },
                        spindleNose: ['A2-15', 'A2-20'],
                        adapterPlate: '8213-Type-IV'
                    },
                    throughHole: {
                        diameter: 255,
                        drawbarThread: 'M250x3.0',
                        maxDrawbarStroke: 44,
                        pilotDiameter: 46
                    },
                    jawKinematics: {
                        jawStroke: 10.0,
                        jawSlotDepth: 34,
                        masterJawHeight: 60,
                        serrationDistance: 284,
                        serration: '3x60°',
                        clampingRangeOD: { min: 100, max: 640 },
                        clampingRangeID: { min: 320, max: 635 },
                        jawPositions: {
                            fullyOpen: { radius: 400, angle: [0, 120, 240] },
                            fullyClosed: { radius: 50, angle: [0, 120, 240] },
                            nominal: { radius: 200, angle: [0, 120, 240] }
                        }
                    },
                    performance: {
                        maxPullingForce: 100,
                        maxClampingForce: 200,
                        maxSpeed: 800,
                        weight: 535.0
                    },
                    collisionZones: {
                        frontFace: { z: 0 },
                        jawTips: { z: -60, rMax: 400 },
                        backFace: { z: 160 },
                        mountingFace: { z: 158 }
                    }
                }
            }
        },
        // 2500: PNEUMATIC POWER CHUCK (OD Clamping)
        '2500': {
            description: 'Pneumatic Chuck with Integrated Cylinder - OD Clamping',
            jaws: 3,
            actuation: 'pneumatic',

            sizes: {
                '400': {
                    partNumber: '7-785-1600',
                    type: '2500-400-140',

                    envelope: {
                        D1: 467,  // Overall diameter
                        D2: 400,  // Chuck body OD
                        D3: 374,  // Jaw slot OD
                        D4: 310,  // Inner body
                        D6: 450,  // Cylinder OD
                        bodyHeight: 246.2,  // L1
                        boundingCylinder: { d: 520, h: 280 }
                    },
                    throughHole: {
                        diameter: 140,  // D5
                        D8: 205  // Inner bore
                    },
                    jawKinematics: {
                        totalStroke: 19,
                        clampingStroke: 7,
                        rapidStroke: 12,
                        clampingRangeOD: { min: 50, max: 340 }
                    },
                    pneumatics: {
                        pressureRange: [0.2, 0.8],  // MPa
                        clampingForceAt06MPa: 130  // kN
                    },
                    performance: {
                        maxSpeed: 1300,
                        weight: 220.0
                    }
                },
                '500': {
                    partNumber: '7-785-2000',
                    type: '2500-500-230',

                    envelope: {
                        D1: 570,
                        D2: 500,
                        D3: 474,
                        D4: 415,
                        D6: 570,
                        bodyHeight: 282.2,
                        boundingCylinder: { d: 620, h: 320 }
                    },
                    throughHole: {
                        diameter: 230,
                        D8: 308
                    },
                    jawKinematics: {
                        totalStroke: 25.4,
                        clampingStroke: 8.6,
                        rapidStroke: 16.8,
                        clampingRangeOD: { min: 70, max: 430 }
                    },
                    pneumatics: {
                        pressureRange: [0.2, 0.8],
                        clampingForceAt06MPa: 180
                    },
                    performance: {
                        maxSpeed: 1000,
                        weight: 340.0
                    }
                },
                '630': {
                    partNumber: '7-785-2500',
                    type: '2500-630-325',

                    envelope: {
                        D1: 685,
                        D2: 630,
                        D3: 580,
                        D4: 510,
                        D6: 685,
                        bodyHeight: 307.5,
                        boundingCylinder: { d: 740, h: 350 }
                    },
                    throughHole: {
                        diameter: 325,
                        D8: 400
                    },
                    jawKinematics: {
                        totalStroke: 25.7,
                        clampingStroke: 8.6,
                        rapidStroke: 16.8,
                        clampingRangeOD: { min: 100, max: 540 }
                    },
                    pneumatics: {
                        pressureRange: [0.3, 1.0],
                        clampingForceAt06MPa: 200
                    },
                    performance: {
                        maxSpeed: 900,
                        weight: 630.0
                    }
                },
                '800': {
                    partNumber: '7-785-3200',
                    type: '2500-800-375',

                    envelope: {
                        D1: 850,
                        D2: 800,
                        D3: 745,
                        D4: 700,
                        D6: 850,
                        bodyHeight: 354,
                        boundingCylinder: { d: 920, h: 400 }
                    },
                    throughHole: {
                        diameter: 375,
                        D8: 450
                    },
                    jawKinematics: {
                        totalStroke: 25.7,
                        clampingStroke: 8.6,
                        rapidStroke: 16.8,
                        clampingRangeOD: { min: 140, max: 680 }
                    },
                    pneumatics: {
                        pressureRange: [0.3, 1.0],
                        clampingForceAt06MPa: 200
                    },
                    performance: {
                        maxSpeed: 750,
                        weight: 970.0
                    }
                },
                '1000': {
                    partNumber: '7-785-4000',
                    type: '2500-1000-560',

                    envelope: {
                        D1: 925,
                        D2: 1000,
                        D3: 815,
                        D4: 700,
                        D6: 1000,
                        bodyHeight: 332,
                        boundingCylinder: { d: 1100, h: 380 }
                    },
                    throughHole: {
                        diameter: 560,
                        D8: 635
                    },
                    jawKinematics: {
                        totalStroke: 25.7,
                        clampingStroke: 8.6,
                        rapidStroke: 16.8,
                        clampingRangeOD: { min: 200, max: 850 }
                    },
                    pneumatics: {
                        pressureRange: [0.3, 1.0],
                        clampingForceAt06MPa: 170
                    },
                    performance: {
                        maxSpeed: 450,
                        weight: 960.0
                    }
                }
            }
        },
        // 1305-SDC: HYDRAULIC CYLINDER
        '1305-SDC': {
            description: 'Hydraulic Cylinder with Stroke Control',
            type: 'actuator',

            sizes: {
                '102': {
                    partNumber: '1305-102-46-SDC',

                    envelope: {
                        outerDiameter: 130,
                        throughHole: 46,
                        bodyLength: 180,  // approximate
                        boundingCylinder: { d: 150, h: 200 }
                    },
                    hydraulics: {
                        pistonAreaPush: 110,   // cm²
                        pistonAreaPull: 103.5, // cm²
                        maxPressure: 4.5,      // MPa
                        maxPushForce: 49.5,    // kN
                        maxPullForce: 46,      // kN
                        stroke: 25             // mm
                    },
                    performance: {
                        maxSpeed: 7100,
                        weight: 15.0
                    }
                },
                '130': {
                    partNumber: '1305-130-52-SDC',

                    envelope: {
                        outerDiameter: 150,
                        throughHole: 52,
                        bodyLength: 190,
                        boundingCylinder: { d: 170, h: 210 }
                    },
                    hydraulics: {
                        pistonAreaPush: 145.5,
                        pistonAreaPull: 138.2,
                        maxPressure: 4.5,
                        maxPushForce: 64,
                        maxPullForce: 61,
                        stroke: 25
                    },
                    performance: {
                        maxSpeed: 6300,
                        weight: 17.0
                    }
                },
                '150': {
                    partNumber: '1305-150-67-SDC',

                    envelope: {
                        outerDiameter: 165,
                        throughHole: 67,
                        bodyLength: 210,
                        boundingCylinder: { d: 190, h: 240 }
                    },
                    hydraulics: {
                        pistonAreaPush: 169,
                        pistonAreaPull: 157,
                        maxPressure: 4.5,
                        maxPushForce: 75,
                        maxPullForce: 70,
                        stroke: 30
                    },
                    performance: {
                        maxSpeed: 6000,
                        weight: 23.0
                    }
                },
                '225': {
                    partNumber: '1305-225-95-SDC',

                    envelope: {
                        outerDiameter: 205,
                        throughHole: 95,
                        bodyLength: 250,
                        boundingCylinder: { d: 240, h: 280 }
                    },
                    hydraulics: {
                        pistonAreaPush: 243,
                        pistonAreaPull: 226,
                        maxPressure: 4.5,
                        maxPushForce: 108,
                        maxPullForce: 100,
                        stroke: 35
                    },
                    performance: {
                        maxSpeed: 4500,
                        weight: 35.0
                    }
                }
            }
        }
    },
    // 5TH AXIS - QUICK-CHANGE SYSTEM GEOMETRY

    fifthAxis: {

        // RockLock Receivers (Machine-mounted bases)
        rockLockReceivers: {
            'RL52-BASE': {
                description: 'RockLock 52mm Receiver Base',

                geometry: {
                    pullStudSpacing: 52,
                    pullStudPattern: 'square',
                    mountingHoles: { qty: 4, pattern: 'square', spacing: 52 },
                    height: 25,
                    topFaceFlat: true
                },
                kinematics: {
                    clampTravel: 6,  // mm
                    clampForce: 22,  // kN
                    repeatability: 0.008  // mm
                }
            },
            'RL96-BASE': {
                description: 'RockLock 96mm Receiver Base',

                geometry: {
                    pullStudSpacing: 96,
                    pullStudPattern: 'square',
                    mountingHoles: { qty: 4, pattern: 'square', spacing: 96 },
                    height: 35,
                    topFaceFlat: true
                },
                kinematics: {
                    clampTravel: 8,  // mm
                    clampForce: 35,  // kN
                    repeatability: 0.008  // mm
                }
            }
        },
        // Self-Centering Vises
        vises: {
            'V75100X': {
                description: 'Self-Centering Vise 60mm',
                system: 'RockLock 52',

                geometry: {
                    jawWidth: 60,
                    baseLength: 150,
                    baseWidth: 100,
                    height: 65,
                    boundingBox: { x: 150, y: 100, z: 65 }
                },
                kinematics: {
                    maxOpening: 100,
                    jawTravel: 50,  // per side (self-centering)
                    clampingForce: 15  // kN
                },
                collisionZones: {
                    jawsOpen: { x: 150, y: 160, z: 80 },
                    jawsClosed: { x: 150, y: 100, z: 65 }
                }
            },
            'V75150X': {
                description: 'Self-Centering Vise 80mm',
                system: 'RockLock 52',

                geometry: {
                    jawWidth: 80,
                    baseLength: 180,
                    baseWidth: 120,
                    height: 70,
                    boundingBox: { x: 180, y: 120, z: 70 }
                },
                kinematics: {
                    maxOpening: 150,
                    jawTravel: 75,
                    clampingForce: 19
                },
                collisionZones: {
                    jawsOpen: { x: 180, y: 200, z: 90 },
                    jawsClosed: { x: 180, y: 120, z: 70 }
                }
            },
            'V96200X': {
                description: 'Self-Centering Vise 125mm',
                system: 'RockLock 96',

                geometry: {
                    jawWidth: 125,
                    baseLength: 250,
                    baseWidth: 160,
                    height: 85,
                    boundingBox: { x: 250, y: 160, z: 85 }
                },
                kinematics: {
                    maxOpening: 200,
                    jawTravel: 100,
                    clampingForce: 31
                },
                collisionZones: {
                    jawsOpen: { x: 250, y: 280, z: 110 },
                    jawsClosed: { x: 250, y: 160, z: 85 }
                }
            }
        },
        // Tombstones
        tombstones: {
            'T4S-52': {
                description: '4-Sided Tombstone',
                system: 'RockLock 52',

                geometry: {
                    sides: 4,
                    width: 200,
                    depth: 200,
                    height: 300,
                    positionsPerSide: 4,
                    positionSpacing: { x: 100, z: 125 },
                    boundingBox: { x: 200, y: 200, z: 350 }
                },
                mounting: {
                    basePlateSize: { x: 250, y: 250 },
                    basePlateThickness: 25
                }
            },
            'T4S-96': {
                description: '4-Sided Tombstone Heavy',
                system: 'RockLock 96',

                geometry: {
                    sides: 4,
                    width: 300,
                    depth: 300,
                    height: 400,
                    positionsPerSide: 2,
                    positionSpacing: { x: 150, z: 175 },
                    boundingBox: { x: 300, y: 300, z: 450 }
                },
                mounting: {
                    basePlateSize: { x: 350, y: 350 },
                    basePlateThickness: 35
                }
            }
        },
        // Risers
        risers: {
            'R60-52': {
                description: 'Riser 60mm for 52mm System',
                system: 'RockLock 52',

                geometry: {
                    height: 60,
                    footprint: { x: 100, y: 100 },
                    topInterface: 'RockLock 52',
                    bottomInterface: 'RockLock 52'
                }
            },
            'R100-52': {
                description: 'Riser 100mm for 52mm System',
                system: 'RockLock 52',

                geometry: {
                    height: 100,
                    footprint: { x: 100, y: 100 },
                    topInterface: 'RockLock 52',
                    bottomInterface: 'RockLock 52'
                }
            }
        }
    },
    // MATE/MITEE-BITE - DYNOGRIP/DYNOLOCK GEOMETRY

    mate: {

        dynoGripVises: {
            'DG52-60': {
                description: 'DynoGrip 52 Series - 60mm Jaw',
                system: '52mm four-post',

                geometry: {
                    jawWidth: 60,
                    baseLength: 130,
                    baseWidth: 90,
                    height: 55,
                    boundingBox: { x: 130, y: 90, z: 55 }
                },
                kinematics: {
                    maxOpening: 95,
                    jawTravel: 47.5,  // per side
                    torque: 60,  // Nm
                    clampingForce: 19  // kN
                },
                mounting: {
                    pullStudSpacing: 52,
                    pullStudThread: 'M16'
                },
                performance: {
                    accuracy: 0.015,  // mm
                    repeatability: 0.010,  // mm
                    weight: 2.1  // kg
                }
            },
            'DG52-80': {
                description: 'DynoGrip 52 Series - 80mm Jaw',
                system: '52mm four-post',

                geometry: {
                    jawWidth: 80,
                    baseLength: 145,
                    baseWidth: 100,
                    height: 58,
                    boundingBox: { x: 145, y: 100, z: 58 }
                },
                kinematics: {
                    maxOpening: 95,
                    jawTravel: 47.5,
                    torque: 60,
                    clampingForce: 19
                },
                mounting: {
                    pullStudSpacing: 52,
                    pullStudThread: 'M16'
                },
                performance: {
                    accuracy: 0.015,
                    repeatability: 0.010,
                    weight: 2.4
                }
            },
            'DG96-125': {
                description: 'DynoGrip 96 Series - 125mm Jaw',
                system: '96mm four-post',

                geometry: {
                    jawWidth: 125,
                    baseLength: 200,
                    baseWidth: 140,
                    height: 75,
                    boundingBox: { x: 200, y: 140, z: 75 }
                },
                kinematics: {
                    maxOpening: 155,
                    jawTravel: 77.5,
                    torque: 130,
                    clampingForce: 31
                },
                mounting: {
                    pullStudSpacing: 96,
                    pullStudThread: 'M20'
                },
                performance: {
                    accuracy: 0.015,
                    repeatability: 0.010,
                    weight: 6.2
                }
            }
        },
        dynoLockBases: {
            'DL52-R100': {
                description: 'DynoLock 52 Round Base 100mm',
                system: '52mm four-post',

                geometry: {
                    shape: 'round',
                    diameter: 100,
                    height: 25,
                    boundingCylinder: { d: 100, h: 25 }
                },
                mounting: {
                    pullStudSpacing: 52,
                    pullStudThread: 'M16',
                    holdingForce: 22  // kN
                },
                performance: {
                    accuracy: 0.013,
                    repeatability: 0.005
                }
            },
            'DL96-R150': {
                description: 'DynoLock 96 Round Base 150mm',
                system: '96mm four-post',

                geometry: {
                    shape: 'round',
                    diameter: 150,
                    height: 35,
                    boundingCylinder: { d: 150, h: 35 }
                },
                mounting: {
                    pullStudSpacing: 96,
                    pullStudThread: 'M20',
                    holdingForce: 26  // kN
                },
                performance: {
                    accuracy: 0.013,
                    repeatability: 0.005
                }
            }
        }
    },
    // UTILITY FUNCTIONS FOR CAD GENERATION & COLLISION

    utilities: {

        /**
         * Get bounding cylinder for collision detection
         * @param {string} manufacturer - e.g., 'bison'
         * @param {string} productLine - e.g., '2405-K'
         * @param {string} size - e.g., '200'
         * @returns {Object} - { diameter, height } in mm
         */
        getBoundingCylinder: function(manufacturer, productLine, size) {
            const product = this.getProduct(manufacturer, productLine, size);
            if (product?.envelope?.boundingCylinder) {
                return product.envelope.boundingCylinder;
            }
            return null;
        },
        /**
         * Get jaw positions at a given opening
         * @param {string} manufacturer
         * @param {string} productLine
         * @param {string} size
         * @param {number} opening - workpiece diameter being clamped
         * @returns {Array} - Array of jaw positions [{radius, angle}, ...]
         */
        getJawPositions: function(manufacturer, productLine, size, opening) {
            const product = this.getProduct(manufacturer, productLine, size);
            if (product?.jawKinematics?.jawPositions) {
                const jk = product.jawKinematics;
                const clampRadius = opening / 2;
                const numJaws = product.jaws || 3;
                const angleStep = 360 / numJaws;

                return Array.from({ length: numJaws }, (_, i) => ({
                    radius: clampRadius,
                    angle: i * angleStep,
                    z: jk.jawPositions.nominal?.z || 0
                }));
            }
            return null;
        },
        /**
         * Check if workpiece fits in chuck
         * @param {string} manufacturer
         * @param {string} productLine
         * @param {string} size
         * @param {number} workpieceDiameter
         * @param {string} clampType - 'OD' or 'ID'
         * @returns {boolean}
         */
        checkClampingFit: function(manufacturer, productLine, size, workpieceDiameter, clampType = 'OD') {
            const product = this.getProduct(manufacturer, productLine, size);
            if (product?.jawKinematics) {
                const range = clampType === 'OD'
                    ? product.jawKinematics.clampingRangeOD
                    : product.jawKinematics.clampingRangeID;

                if (range) {
                    return workpieceDiameter >= range.min && workpieceDiameter <= range.max;
                }
            }
            return false;
        },
        /**
         * Get mounting interface for spindle compatibility check
         */
        getMountingInterface: function(manufacturer, productLine, size) {
            const product = this.getProduct(manufacturer, productLine, size);
            return product?.mounting || null;
        },
        /**
         * Helper to get product by path
         */
        getProduct: function(manufacturer, productLine, size) {
            try {
                return PRISM_WORKHOLDING_GEOMETRY[manufacturer][productLine].sizes[size];
            } catch (e) {
                return null;
            }
        },
        /**
         * Generate simplified CAD profile (2D outline)
         * Returns array of points for chuck body profile
         */
        generateChuckProfile: function(manufacturer, productLine, size) {
            const product = this.getProduct(manufacturer, productLine, size);
            if (!product) return null;

            const env = product.envelope;
            const mount = product.mounting;
            const th = product.throughHole;

            // Generate 2D profile points (R, Z coordinates)
            // This is a simplified profile - real CAD would need full detail
            const profile = [
                // Through-hole
                { r: th.diameter / 2, z: 0 },
                { r: th.diameter / 2, z: env.bodyHeight },

                // Back face step to mounting
                { r: mount.spindleDiameter / 2, z: env.bodyHeight },
                { r: mount.spindleDiameter / 2, z: env.bodyHeight - mount.stepHeight },

                // Outer body
                { r: env.outerDiameter / 2, z: env.bodyHeight - mount.stepHeight },
                { r: env.outerDiameter / 2, z: 0 },

                // Close profile
                { r: th.diameter / 2, z: 0 }
            ];

            return {
                profile,
                revolveAxis: 'Z',
                jawSlots: product.jaws || 3,
                jawSlotAngle: 360 / (product.jaws || 3)
            };
        }
    }
};
// EXPORT

if (typeof window !== 'undefined') {
    window.PRISM_WORKHOLDING_GEOMETRY = PRISM_WORKHOLDING_GEOMETRY;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PRISM_WORKHOLDING_GEOMETRY;
}
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] ✅ Workholding Geometry & Kinematics Database loaded');
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Bison: 2405-K (9 sizes), 2500 (5 sizes), 1305-SDC (4 sizes)');
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] 5th Axis: Receivers, Vises, Tombstones, Risers');
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Mate: DynoGrip Vises, DynoLock Bases');
(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Utilities: getBoundingCylinder, getJawPositions, checkClampingFit, generateChuckProfile');

// PRISM WORKHOLDING GEOMETRY DATABASE - EXTENDED EDITION
// Full 3D Volumetric Data for CAD Generation, Simulation & Collision Avoidance
// Part 2: Kitagawa, Royal, Kurt, SCHUNK, Jergens, Lang, Mitee-Bite
// Generated: January 14, 2026

(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM] Loading Extended Workholding Geometry Database...');

const PRISM_WORKHOLDING_GEOMETRY_EXTENDED = {
    version: '1.0.0',
    generatedDate: '2026-01-14',

    // KITAGAWA POWER CHUCKS - FULL GEOMETRIC DATA
    // Extracted from 140-page catalog

    kitagawa: {

        // B-Series Power Chucks (Large/Heavy Duty)
        'B-Series': {
            description: 'Heavy Duty Power Chucks',
            jaws: 3,
            serration: { small: '1.5x60°', large: '3x60°' },

            sizes: {
                'B-15': {
                    // Extracted from catalog page 15
                    envelope: {
                        outerDiameter: 381,      // A - 15" chuck
                        bodyHeight: 133,         // B
                        jawOD: 300,              // C
                        boundingCylinder: { d: 420, h: 165 }
                    },
                    mounting: {
                        boltCircle: 235,         // F
                        pilotDiameter: 117.5,    // E
                        bolts: { qty: 6, thread: 'M20', depth: 30 },
                        spindleNose: ['A2-8', 'A2-11']
                    },
                    throughHole: {
                        diameter: 76.7,
                        drawbarThread: 'M130x2'
                    },
                    jawKinematics: {
                        jawSlotDepth: 43,        // G
                        masterJawHeight: 82,     // H
                        jawStroke: 11,           // stroke
                        grippingDiameter: { min: 62, max: 260 },
                        jawPositions: {
                            fullyOpen: { radius: 190, angle: [0, 120, 240] },
                            fullyClosed: { radius: 31, angle: [0, 120, 240] }
                        }
                    },
                    performance: {
                        maxSpeed: 2500,          // rpm
                        maxClampingForce: 120,   // kN
                        weight: 71,              // kg (from 2.273 * 31.2)
                        pullForce: 180           // kN
                    },
                    accessories: {
                        hydraulicCylinder: 'F2511H',
                        softJaw: 'SJ15C1',
                        hardJaw: 'HB15A1'
                    }
                },
                'B-18': {
                    envelope: {
                        outerDiameter: 450,      // 18" chuck
                        bodyHeight: 133,
                        jawOD: 380,
                        boundingCylinder: { d: 500, h: 170 }
                    },
                    mounting: {
                        boltCircle: 235,
                        pilotDiameter: 117.5,
                        bolts: { qty: 6, thread: 'M20', depth: 30 },
                        spindleNose: ['A2-11']
                    },
                    throughHole: {
                        diameter: 78.25,
                        drawbarThread: 'M130x2'
                    },
                    jawKinematics: {
                        jawSlotDepth: 43,
                        masterJawHeight: 82,
                        jawStroke: 11,
                        grippingDiameter: { min: 62, max: 320 }
                    },
                    performance: {
                        maxSpeed: 2000,
                        maxClampingForce: 164,
                        weight: 139,
                        pullForce: 180
                    }
                },
                'B-21': {
                    envelope: {
                        outerDiameter: 530,      // 21" chuck
                        bodyHeight: 140,
                        jawOD: 380,
                        boundingCylinder: { d: 580, h: 180 }
                    },
                    mounting: {
                        boltCircle: 330.2,
                        pilotDiameter: 140,
                        bolts: { qty: 6, thread: 'M22', depth: 31 },
                        spindleNose: ['A2-15']
                    },
                    throughHole: {
                        diameter: 87.5,
                        drawbarThread: 'M155x3'
                    },
                    jawKinematics: {
                        jawSlotDepth: 60,
                        masterJawHeight: 98.5,
                        jawStroke: 11,
                        grippingDiameter: { min: 65, max: 380 }
                    },
                    performance: {
                        maxSpeed: 1700,
                        maxClampingForce: 235,
                        weight: 280,
                        pullForce: 234
                    }
                },
                'B-24': {
                    envelope: {
                        outerDiameter: 610,      // 24" chuck
                        bodyHeight: 149,
                        jawOD: 380,
                        boundingCylinder: { d: 670, h: 190 }
                    },
                    mounting: {
                        boltCircle: 330.2,
                        pilotDiameter: 165,
                        bolts: { qty: 6, thread: 'M22', depth: 32 },
                        spindleNose: ['A2-15']
                    },
                    throughHole: {
                        diameter: 117.5,
                        drawbarThread: 'M175x3'
                    },
                    jawKinematics: {
                        jawSlotDepth: 60,
                        masterJawHeight: 108,
                        jawStroke: 20,
                        grippingDiameter: { min: 65, max: 450 }
                    },
                    performance: {
                        maxSpeed: 1400,
                        maxClampingForce: 293,
                        weight: 518,
                        pullForce: 234
                    }
                }
            }
        },
        // B-Series with A-Mount (Direct Spindle Mount)
        'B-A-Series': {
            description: 'Power Chucks with A-Mount',

            sizes: {
                'B-15A08': {
                    basedOn: 'B-15',
                    mountType: 'A2-8',

                    envelope: {
                        outerDiameter: 381,
                        bodyHeight: 160,
                        boundingCylinder: { d: 420, h: 190 }
                    },
                    mounting: {
                        spindleNose: 'A2-8',
                        spindleDiameter: 139.719,
                        flangeHeight: 33,
                        boltCircle: 235,
                        pilotDiameter: 117.5
                    },
                    performance: {
                        maxSpeed: 2500,
                        maxClampingForce: 134,
                        weight: 77
                    }
                },
                'B-15A11': {
                    basedOn: 'B-15',
                    mountType: 'A2-11',

                    envelope: {
                        outerDiameter: 381,
                        bodyHeight: 149,
                        boundingCylinder: { d: 420, h: 180 }
                    },
                    mounting: {
                        spindleNose: 'A2-11',
                        spindleDiameter: 196.869,
                        flangeHeight: 22,
                        boltCircle: 260
                    },
                    performance: {
                        maxSpeed: 2500,
                        maxClampingForce: 127,
                        weight: 74
                    }
                },
                'B-18A11': {
                    basedOn: 'B-18',
                    mountType: 'A2-11',

                    envelope: {
                        outerDiameter: 450,
                        bodyHeight: 149,
                        boundingCylinder: { d: 500, h: 180 }
                    },
                    mounting: {
                        spindleNose: 'A2-11',
                        spindleDiameter: 196.869,
                        flangeHeight: 22,
                        boltCircle: 320
                    },
                    performance: {
                        maxSpeed: 2000,
                        maxClampingForce: 178,
                        weight: 149
                    }
                },
                'B-21A15': {
                    basedOn: 'B-21',
                    mountType: 'A2-15',

                    envelope: {
                        outerDiameter: 530,
                        bodyHeight: 161,
                        boundingCylinder: { d: 580, h: 195 }
                    },
                    mounting: {
                        spindleNose: 'A2-15',
                        spindleDiameter: 285.775,
                        flangeHeight: 27,
                        boltCircle: 330.2
                    },
                    performance: {
                        maxSpeed: 1700,
                        maxClampingForce: 246,
                        weight: 289
                    }
                },
                'B-24A15': {
                    basedOn: 'B-24',
                    mountType: 'A2-15',

                    envelope: {
                        outerDiameter: 610,
                        bodyHeight: 170,
                        boundingCylinder: { d: 670, h: 205 }
                    },
                    mounting: {
                        spindleNose: 'A2-15',
                        spindleDiameter: 285.775,
                        flangeHeight: 27,
                        boltCircle: 330.2
                    },
                    performance: {
                        maxSpeed: 1400,
                        maxClampingForce: 304,
                        weight: 526
                    }
                }
            }
        },
        // Standard B-200 Series (Compact)
        'B-200': {
            description: 'Standard Power Chuck Series',
            jaws: 3,

            sizes: {
                'B206': {
                    envelope: {
                        outerDiameter: 169,
                        bodyHeight: 85,
                        boundingCylinder: { d: 200, h: 105 }
                    },
                    mounting: {
                        spindleDiameter: 140,
                        boltCircle: 104.8,
                        bolts: { qty: 3, thread: 'M10' }
                    },
                    throughHole: { diameter: 34 },
                    jawKinematics: {
                        jawStroke: 3.5,
                        grippingDiameter: { min: 10, max: 130 }
                    },
                    performance: {
                        maxSpeed: 6000,
                        maxClampingForce: 57
                    }
                },
                'B208': {
                    envelope: {
                        outerDiameter: 210,
                        bodyHeight: 95,
                        boundingCylinder: { d: 250, h: 115 }
                    },
                    mounting: {
                        spindleDiameter: 170,
                        boltCircle: 133.4,
                        bolts: { qty: 3, thread: 'M12' }
                    },
                    throughHole: { diameter: 52 },
                    jawKinematics: {
                        jawStroke: 5.0,
                        grippingDiameter: { min: 15, max: 165 }
                    },
                    performance: {
                        maxSpeed: 5000,
                        maxClampingForce: 86
                    }
                },
                'B210': {
                    envelope: {
                        outerDiameter: 254,
                        bodyHeight: 106,
                        boundingCylinder: { d: 300, h: 130 }
                    },
                    mounting: {
                        spindleDiameter: 220,
                        boltCircle: 171.4,
                        bolts: { qty: 3, thread: 'M16' }
                    },
                    throughHole: { diameter: 75 },
                    jawKinematics: {
                        jawStroke: 6.0,
                        grippingDiameter: { min: 20, max: 200 }
                    },
                    performance: {
                        maxSpeed: 4200,
                        maxClampingForce: 111
                    }
                },
                'B212': {
                    envelope: {
                        outerDiameter: 315,
                        bodyHeight: 110,
                        boundingCylinder: { d: 365, h: 140 }
                    },
                    mounting: {
                        spindleDiameter: 220,
                        boltCircle: 171.4,
                        bolts: { qty: 6, thread: 'M16' }
                    },
                    throughHole: { diameter: 91 },
                    jawKinematics: {
                        jawStroke: 6.0,
                        grippingDiameter: { min: 25, max: 250 }
                    },
                    performance: {
                        maxSpeed: 3300,
                        maxClampingForce: 144
                    }
                }
            }
        }
    },
    // ROYAL PRODUCTS - LIVE CENTERS, COLLETS, CHUCKS
    // Extracted from 196-page catalog

    royal: {

        // Live Centers
        liveCenters: {

            // Standard Precision Live Centers
            'Standard': {
                description: 'Standard Precision Live Centers',

                sizes: {
                    'MT2-STD': {
                        partNumber: '10102',
                        taper: 'MT2',

                        geometry: {
                            bodyDiameter: 1.75,    // inches (B)
                            bodyLength: 1.47,      // inches (E)
                            pointLength: 1.01,     // inches (F)
                            pointDiameter: 0.88,   // inches (G)
                            overallLength: 4.23,
                            boundingCylinder: { d: 50, h: 120 }  // mm
                        },
                        performance: {
                            maxSpeed: 6000,        // rpm
                            thrustLoad: 725,       // lbs
                            radialLoad: 2360,      // lbs
                            runout: 0.0002         // inches TIR
                        }
                    },
                    'MT3-STD': {
                        partNumber: '10103',
                        taper: 'MT3',

                        geometry: {
                            bodyDiameter: 2.33,
                            bodyLength: 1.75,
                            pointLength: 1.22,
                            pointDiameter: 1.00,
                            overallLength: 5.30,
                            boundingCylinder: { d: 65, h: 150 }
                        },
                        performance: {
                            maxSpeed: 5000,
                            thrustLoad: 970,
                            radialLoad: 3900,
                            runout: 0.0002
                        }
                    },
                    'MT4-STD': {
                        partNumber: '10104',
                        taper: 'MT4',

                        geometry: {
                            bodyDiameter: 2.68,
                            bodyLength: 1.98,
                            pointLength: 1.48,
                            pointDiameter: 1.25,
                            overallLength: 6.14,
                            boundingCylinder: { d: 75, h: 175 }
                        },
                        performance: {
                            maxSpeed: 4500,
                            thrustLoad: 1720,
                            radialLoad: 4050,
                            runout: 0.0002
                        }
                    },
                    'MT5-STD': {
                        partNumber: '10105',
                        taper: 'MT5',

                        geometry: {
                            bodyDiameter: 3.45,
                            bodyLength: 2.81,
                            pointLength: 1.84,
                            pointDiameter: 1.50,
                            overallLength: 8.10,
                            boundingCylinder: { d: 95, h: 230 }
                        },
                        performance: {
                            maxSpeed: 3500,
                            thrustLoad: 3260,
                            radialLoad: 5700,
                            runout: 0.0002
                        }
                    },
                    'MT6-STD': {
                        partNumber: '10106',
                        taper: 'MT6',

                        geometry: {
                            bodyDiameter: 4.00,
                            bodyLength: 3.15,
                            pointLength: 2.31,
                            pointDiameter: 2.00,
                            overallLength: 9.46,
                            boundingCylinder: { d: 110, h: 270 }
                        },
                        performance: {
                            maxSpeed: 3500,
                            thrustLoad: 4080,
                            radialLoad: 6000,
                            runout: 0.0002
                        }
                    }
                }
            },
            // Heavy Duty Live Centers
            'HeavyDuty': {
                description: 'Heavy Duty Live Centers for Large Work',

                sizes: {
                    'MT2-HD': {
                        partNumber: '10478',
                        taper: 'MT2',

                        geometry: {
                            bodyDiameter: 1.70,
                            bodyLength: 2.12,
                            pointLength: 1.75,
                            pointDiameter: 0.88,
                            boundingCylinder: { d: 55, h: 130 }
                        },
                        performance: {
                            maxSpeed: 6000,
                            thrustLoad: 465,
                            radialLoad: 1270
                        }
                    },
                    'MT5-HD': {
                        partNumber: '10445',
                        taper: 'MT5',
                        type: 'Heavy Duty',

                        geometry: {
                            bodyDiameter: 3.82,
                            bodyLength: 3.89,
                            pointLength: 2.31,
                            pointDiameter: 2.00,
                            boundingCylinder: { d: 105, h: 240 }
                        },
                        performance: {
                            maxSpeed: 3000,
                            thrustLoad: 5240,
                            radialLoad: 5300
                        }
                    },
                    'MT6-HD': {
                        partNumber: '10446',
                        taper: 'MT6',
                        type: 'Heavy Duty',

                        geometry: {
                            bodyDiameter: 3.82,
                            bodyLength: 3.89,
                            pointLength: 2.31,
                            pointDiameter: 2.00,
                            boundingCylinder: { d: 105, h: 240 }
                        },
                        performance: {
                            maxSpeed: 3000,
                            thrustLoad: 5240,
                            radialLoad: 5300
                        }
                    }
                }
            },
            // High Speed Live Centers
            'HighSpeed': {
                description: 'High Speed Live Centers up to 12,000 RPM',

                sizes: {
                    'MT3-HS': {
                        partNumber: '10683',
                        taper: 'MT3',

                        geometry: {
                            bodyDiameter: 1.70,
                            bodyLength: 2.12,
                            pointLength: 1.75,
                            pointDiameter: 0.88,
                            pipeDiameter: { min: 0.38, max: 0.63 },
                            boundingCylinder: { d: 55, h: 130 }
                        },
                        performance: {
                            maxSpeed: 12000,
                            thrustLoad: 180,
                            radialLoad: 650
                        }
                    },
                    'MT4-HS': {
                        partNumber: '10684',
                        taper: 'MT4',

                        geometry: {
                            bodyDiameter: 2.45,
                            bodyLength: 2.78,
                            pointLength: 2.35,
                            pointDiameter: 1.25,
                            pipeDiameter: { min: 0.50, max: 0.81 },
                            boundingCylinder: { d: 75, h: 175 }
                        },
                        performance: {
                            maxSpeed: 12000,
                            thrustLoad: 525,
                            radialLoad: 1380
                        }
                    },
                    'MT5-HS': {
                        partNumber: '10685',
                        taper: 'MT5',

                        geometry: {
                            bodyDiameter: 2.45,
                            bodyLength: 2.78,
                            pointLength: 2.35,
                            pointDiameter: 1.25,
                            pipeDiameter: { min: 0.50, max: 0.81 },
                            boundingCylinder: { d: 75, h: 175 }
                        },
                        performance: {
                            maxSpeed: 12000,
                            thrustLoad: 525,
                            radialLoad: 1380
                        }
                    }
                }
            },
            // Interchangeable Point Live Centers
            'InterchangeablePoint': {
                description: 'Live Centers with Quick-Change Points',

                sizes: {
                    'MT2-IP': {
                        partNumber: '10212',
                        taper: 'MT2',

                        geometry: {
                            bodyDiameter: 1.75,
                            bodyLength: 1.47,
                            pointLength: 1.35,
                            pointDiameter: 0.88,
                            pipeDiameter: { min: 0.38, max: 0.63 },
                            boundingCylinder: { d: 50, h: 120 }
                        },
                        performance: {
                            maxSpeed: 6000,
                            thrustLoad: 375,
                            radialLoad: 2360
                        },
                        interchangeablePoints: ['Standard', 'Extended', 'Bull Nose', 'Carbide']
                    },
                    'MT3-IP': {
                        partNumber: '10213',
                        taper: 'MT3',

                        geometry: {
                            bodyDiameter: 2.33,
                            bodyLength: 1.75,
                            pointLength: 1.86,
                            pointDiameter: 1.00,
                            pipeDiameter: { min: 0.38, max: 0.63 },
                            boundingCylinder: { d: 65, h: 150 }
                        },
                        performance: {
                            maxSpeed: 5000,
                            thrustLoad: 740,
                            radialLoad: 3900
                        }
                    },
                    'MT4-IP': {
                        partNumber: '10214',
                        taper: 'MT4',

                        geometry: {
                            bodyDiameter: 2.68,
                            bodyLength: 1.98,
                            pointLength: 2.18,
                            pointDiameter: 1.25,
                            pipeDiameter: { min: 0.50, max: 0.81 },
                            boundingCylinder: { d: 75, h: 175 }
                        },
                        performance: {
                            maxSpeed: 4500,
                            thrustLoad: 1120,
                            radialLoad: 4050
                        }
                    },
                    'MT5-IP': {
                        partNumber: '10215',
                        taper: 'MT5',

                        geometry: {
                            bodyDiameter: 3.45,
                            bodyLength: 2.81,
                            pointLength: 2.58,
                            pointDiameter: 1.50,
                            pipeDiameter: { min: 0.50, max: 0.81 },
                            boundingCylinder: { d: 95, h: 230 }
                        },
                        performance: {
                            maxSpeed: 3500,
                            thrustLoad: 1930,
                            radialLoad: 5700
                        }
                    }
                }
            }
        },
        // CNC Collet Chucks
        colletChucks: {

            'MTC-Series': {
                description: 'Master Tool CNC Collet Chucks',

                sizes: {
                    'MTC-200': {
                        // From page 11
                        envelope: {
                            outerDiameter: 200,    // A
                            bodyHeight: 110,       // B
                            jawOD: 170,            // C
                            boltCircle: 133.4,     // D
                            boundingCylinder: { d: 220, h: 130 }
                        },
                        mounting: {
                            boltThread: 'M12',     // E
                            pilotDiameter: 53      // F
                        },
                        collet: {
                            optimalGrip: 20,       // G optimal
                            minGrip: 15            // G minimum
                        }
                    },
                    'MTC-250': {
                        envelope: {
                            outerDiameter: 250,
                            bodyHeight: 125,
                            jawOD: 220,
                            boltCircle: 171.4,
                            boundingCylinder: { d: 275, h: 150 }
                        },
                        mounting: {
                            boltThread: 'M16',
                            pilotDiameter: 66
                        },
                        collet: {
                            optimalGrip: 24,
                            minGrip: 18
                        }
                    },
                    'MTC-320': {
                        envelope: {
                            outerDiameter: 320,
                            bodyHeight: 150,
                            jawOD: 280,
                            boltCircle: 235,
                            boundingCylinder: { d: 350, h: 175 }
                        },
                        mounting: {
                            boltThread: 'M20',
                            pilotDiameter: 81
                        },
                        collet: {
                            optimalGrip: 28,
                            minGrip: 21
                        }
                    }
                }
            }
        },
        // ER Collet Dimensions (for CAD generation)
        erCollets: {
            'ER8': {
                outerDiameter: 8,
                length: 11,
                capacityRange: [0.5, 5],
                taperAngle: 8
            },
            'ER11': {
                outerDiameter: 11,
                length: 14,
                capacityRange: [0.5, 7],
                taperAngle: 8
            },
            'ER16': {
                outerDiameter: 17,
                length: 20,
                capacityRange: [1, 10],
                taperAngle: 8
            },
            'ER20': {
                outerDiameter: 21,
                length: 24,
                capacityRange: [1, 13],
                taperAngle: 8
            },
            'ER25': {
                outerDiameter: 26,
                length: 29,
                capacityRange: [1, 16],
                taperAngle: 8
            },
            'ER32': {
                outerDiameter: 33,
                length: 35,
                capacityRange: [2, 20],
                taperAngle: 8
            },
            'ER40': {
                outerDiameter: 41,
                length: 41,
                capacityRange: [3, 26],
                taperAngle: 8
            },
            'ER50': {
                outerDiameter: 52,
                length: 50,
                capacityRange: [6, 34],
                taperAngle: 8
            }
        },
        // 5C Collet Dimensions
        '5CCollets': {
            geometry: {
                outerDiameter: 1.0625,    // inches (27mm)
                length: 3.0,              // inches
                taperAngle: 10,           // degrees (half angle)
                noseThread: 'Internal'
            },
            capacityRange: [0.0625, 1.0625],  // inches
            runout: 0.0005  // inches TIR
        }
    },
    // BISON MANUAL CHUCKS - GEOMETRY

    bisonManual: {

        // Type 9167: Adjustable Adapter Back Plates
        '9167': {
            description: '3-Jaw Scroll Chuck with Morse Taper Mount',

            sizes: {
                '4-MT3': {
                    partNumber: '7-861-9400',
                    type: '9167-4"-3',

                    geometry: {
                        chuckDiameter: 100,        // 3.94" = 100mm
                        taper: 'MT3',
                        D1: 45,                    // 1.77" = 45mm
                        D2: 83,                    // 3.27" = 83mm
                        D3: 96.5,                  // 3.8" = 96.5mm
                        L1: 165,                   // 6.50" = 165mm
                        L2: 84,                    // 3.31" = 84mm
                        L3: 79,                    // 3.11" = 79mm
                        L4: 12,                    // 0.47" = 12mm
                        boundingCylinder: { d: 120, h: 180 }
                    },
                    mounting: {
                        bolts: { qty: 3, thread: 'M8' }
                    },
                    performance: {
                        weight: 3.4  // kg (7.50 lbs)
                    }
                },
                '4-MT4': {
                    partNumber: '7-861-9404',
                    type: '9167-4"-4',

                    geometry: {
                        chuckDiameter: 100,
                        taper: 'MT4',
                        D1: 45,
                        D2: 83,
                        D3: 96.5,
                        L1: 188,                   // 7.40"
                        L2: 86,
                        L3: 79,
                        L4: 12,
                        boundingCylinder: { d: 120, h: 205 }
                    },
                    mounting: {
                        bolts: { qty: 3, thread: 'M8' }
                    },
                    performance: {
                        weight: 3.7
                    }
                },
                '5-MT4': {
                    partNumber: '7-861-9500',
                    type: '9167-5"-4',

                    geometry: {
                        chuckDiameter: 125,        // 4.92"
                        taper: 'MT4',
                        D1: 55,                    // 2.17"
                        D2: 108,                   // 4.25"
                        D3: 122,                   // 4.8"
                        L1: 199,                   // 7.85"
                        L2: 97,                    // 3.82"
                        L3: 90,                    // 3.56"
                        L4: 14,                    // 0.55"
                        boundingCylinder: { d: 145, h: 220 }
                    },
                    mounting: {
                        bolts: { qty: 3, thread: 'M8' }
                    },
                    performance: {
                        weight: 6.3  // 13.89 lbs
                    }
                },
                '5-MT5': {
                    partNumber: '7-861-9505',
                    type: '9167-5"-5',

                    geometry: {
                        chuckDiameter: 125,
                        taper: 'MT5',
                        D1: 55,
                        D2: 108,
                        D3: 122,
                        L1: 227,                   // 8.92"
                        L2: 97,
                        L3: 90,
                        L4: 14,
                        boundingCylinder: { d: 145, h: 250 }
                    },
                    mounting: {
                        bolts: { qty: 3, thread: 'M8' }
                    },
                    performance: {
                        weight: 7.0  // 15.43 lbs
                    }
                },
                '6-MT5': {
                    partNumber: '7-861-9600',
                    type: '9167-6"-5',

                    geometry: {
                        chuckDiameter: 160,        // 6.30"
                        taper: 'MT5',
                        D1: 86,                    // 3.39"
                        D2: 140,                   // 5.51"
                        D3: 160,                   // 6.3"
                        L1: 230,                   // 9.06"
                        L2: 101,                   // 3.96"
                        L3: 94,                    // 3.70"
                        L4: 16,                    // 0.63"
                        boundingCylinder: { d: 180, h: 255 }
                    },
                    mounting: {
                        bolts: { qty: 3, thread: 'M10' }
                    },
                    performance: {
                        weight: 11.2  // 24.69 lbs
                    }
                }
            }
        }
    },
    // KURT VISES - STANDARD GEOMETRY

    kurt: {

        // AngLock Series
        'AngLock': {
            description: 'Precision AngLock Vises with Anti-Lift Design',

            sizes: {
                'D40': {
                    model: 'D40',

                    geometry: {
                        jawWidth: 102,             // 4"
                        maxOpening: 102,           // 4"
                        baseLength: 267,           // 10.5"
                        baseWidth: 127,            // 5"
                        height: 76,                // 3"
                        boundingBox: { x: 267, y: 127, z: 102 }
                    }