const PRISM_SCHUNK_TOOLHOLDER_DATABASE = {

    manufacturer: "SCHUNK GmbH & Co. KG",
    brand: "SCHUNK",
    country: "Germany",
    catalog_source: "SCHUNK Full Catalog 2022-2024 (Pages 629-932)",

    // TENDO - HYDRAULIC EXPANSION TOOLHOLDERS
    // Premium hydraulic clamping technology

    tendo: {
        technology: "hydraulic_expansion",
        description: "Hydraulic expansion toolholders for precision machining",
        runout_um: 3,  // <3µm at 2.5xD

        series: [
            {
                id: "SCHUNK_TENDO_SILVER",
                series: "TENDO Silver",
                type: "hydraulic_expansion",
                description: "Budget-friendly entry into hydraulic expansion technology",
                din_standard: "DIN 69882-7",
                clamping_range_mm: [6, 32],
                runout_um: 3,
                balancing_grade: "G2.5",
                balancing_rpm: 25000,
                applications: ["drilling", "reaming", "milling", "threading", "HSC"],
                interfaces: ["HSK-A40", "HSK-A50", "HSK-A63", "HSK-A100", "HSK-E32", "HSK-E40", "HSK-E50", "BT30", "BT40", "BT50", "CAT40", "CAT50", "SK40", "SK50"],
                torque_nm: {
                    "d6": 6,
                    "d8": 14,
                    "d10": 22,
                    "d12": 42,
                    "d14": 55,
                    "d16": 75,
                    "d18": 100,
                    "d20": 140,
                    "d25": 230,
                    "d32": 500
                },
                features: ["direct_clamping", "sleeve_compatible", "vibration_damping"]
            },
            {
                id: "SCHUNK_TENDO_E_COMPACT",
                series: "TENDO E compact",
                type: "hydraulic_expansion",
                description: "High torque for maximum volume machining",
                clamping_range_mm: [6, 32],
                runout_um: 3,
                balancing_grade: "G2.5",
                balancing_rpm: 25000,
                applications: ["HPC", "volume_cutting", "drilling", "reaming", "milling", "threading"],
                interfaces: ["HSK-A40", "HSK-A50", "HSK-A63", "HSK-A80", "HSK-A100", "HSK-E40", "HSK-E50", "HSK-F63", "BT30", "BT40", "BT50", "CAT40", "CAT50", "SK40", "SK50"],
                torque_nm: {
                    "d6": 8,
                    "d8": 18,
                    "d10": 35,
                    "d12": 60,
                    "d14": 90,
                    "d16": 120,
                    "d18": 160,
                    "d20": 220,
                    "d25": 380,
                    "d32": 800
                },
                features: ["high_torque", "high_radial_rigidity", "dual_contact_option"]
            },
            {
                id: "SCHUNK_TENDO_SLIM_4AX",
                series: "TENDO Slim 4ax",
                type: "hydraulic_expansion",
                description: "Heat-shrinking contour for axial and radial fine machining",
                din_standard: "DIN 69882-8",
                clamping_range_mm: [3, 20],
                runout_um: 3,
                balancing_grade: "G2.5",
                balancing_rpm: 25000,
                applications: ["fine_machining", "drilling", "reaming", "milling", "chamfering", "tapping", "MQL"],
                interfaces: ["HSK-A40", "HSK-A50", "HSK-A63", "HSK-E25", "HSK-E32", "HSK-E40", "HSK-E50", "BT30", "BT40", "CAT40", "SK40"],
                features: ["slim_design", "plug_and_work", "cool_flow_option", "fine_balanced"]
            },
            {
                id: "SCHUNK_TENDO_PLATINUM",
                series: "TENDO Platinum",
                type: "hydraulic_expansion",
                description: "Premium hydraulic expansion for highest demands",
                din_standard: "DIN 69882-7",
                clamping_range_mm: [6, 32],
                runout_um: 3,
                balancing_grade: "G2.5",
                balancing_rpm: 25000,
                applications: ["precision_machining", "HSC", "HPC"],
                interfaces: ["HSK-A40", "HSK-A50", "HSK-A63", "HSK-A100", "BT30", "BT40", "BT50", "CAT40", "CAT50", "SK40", "SK50"],
                features: ["premium_quality", "highest_precision"]
            },
            {
                id: "SCHUNK_TENDO_ZERO",
                series: "TENDO Zero",
                type: "hydraulic_expansion",
                description: "Zero-adjustment hydraulic holder for quick setup",
                clamping_range_mm: [6, 25],
                runout_um: 3,
                balancing_grade: "G2.5",
                balancing_rpm: 25000,
                applications: ["quick_change", "production"],
                interfaces: ["HSK-A40", "HSK-A50", "HSK-A63", "BT30", "BT40", "CAT40"],
                features: ["zero_adjustment", "quick_setup"]
            },
            {
                id: "SCHUNK_TENDO_ES",
                series: "TENDO ES",
                type: "hydraulic_expansion",
                description: "Extended sleeve design for deep cavities",
                clamping_range_mm: [6, 20],
                runout_um: 3,
                balancing_grade: "G2.5",
                balancing_rpm: 25000,
                applications: ["deep_cavity", "mold_making", "fine_machining"],
                interfaces: ["HSK-A40", "HSK-A50", "HSK-A63", "BT30", "BT40", "CAT40"],
                features: ["extended_reach", "deep_cavity_machining"]
            },
            {
                id: "SCHUNK_iTENDO2",
                series: "iTENDO²",
                type: "smart_hydraulic_expansion",
                description: "Intelligent toolholder with integrated sensors",
                clamping_range_mm: [6, 20],
                runout_um: 3,
                balancing_grade: "G2.5",
                balancing_rpm: 25000,
                applications: ["industry_4.0", "process_monitoring", "adaptive_machining"],
                interfaces: ["HSK-A63"],
                features: ["integrated_sensors", "vibration_monitoring", "wireless_data", "smart_manufacturing"]
            }
        ]
    },
    // TRIBOS - POLYGONAL CLAMPING TOOLHOLDERS
    // Unique honeycomb structure for precision and damping

    tribos: {
        technology: "polygonal_clamping",
        description: "Polygonal toolholders with unique honeycomb structure",
        runout_um: 3,  // <0.003mm

        series: [
            {
                id: "SCHUNK_TRIBOS_R",
                series: "TRIBOS-R",
                type: "polygonal",
                description: "Large diameter, robust for volume cutting",
                clamping_range_mm: [6, 32],
                runout_um: 3,
                max_rpm: 40000,
                applications: ["volume_cutting", "drilling", "reaming", "milling", "threading", "countersinking"],
                interfaces: ["HSK-A40", "HSK-A50", "HSK-A63", "HSK-A80", "HSK-A100", "BT30", "BT40", "BT50", "CAT40", "CAT50", "SK40", "SK50"],
                features: ["high_radial_rigidity", "vibration_damping", "copper_insert", "svl_compatible"]
            },
            {
                id: "SCHUNK_TRIBOS_S",
                series: "TRIBOS-S",
                type: "polygonal",
                description: "Slim design for hard-to-reach areas",
                clamping_range_mm: [3, 12],
                runout_um: 3,
                max_rpm: 85000,
                applications: ["HSC", "fine_machining", "hard_to_reach", "mold_making"],
                interfaces: ["HSK-A40", "HSK-A50", "HSK-A63", "HSK-E25", "HSK-E32", "HSK-E40", "HSK-E50", "BT30", "BT40", "CAT40"],
                features: ["slim_design", "minimal_interference", "HSC_capable", "rotationally_symmetric"]
            },
            {
                id: "SCHUNK_TRIBOS_RM",
                series: "TRIBOS-RM",
                type: "polygonal",
                description: "Compact design for micro-cutting HSC",
                clamping_range_mm: [1, 10],
                runout_um: 3,
                max_rpm: 85000,
                applications: ["micro_cutting", "HSC", "precision_drilling", "reaming", "milling"],
                interfaces: ["HSK-A40", "HSK-A50", "HSK-A63", "HSK-E25", "HSK-E32", "HSK-E40", "BT30", "BT40", "CAT40"],
                features: ["compact_design", "anchor_structure", "high_rigidity", "HSC_capable"]
            },
            {
                id: "SCHUNK_TRIBOS_MINI",
                series: "TRIBOS-Mini",
                type: "polygonal",
                description: "Micro-cutting from Ø0.3mm shanks",
                clamping_range_mm: [0.3, 6],
                runout_um: 3,
                max_rpm: 100000,
                applications: ["micro_machining", "medical", "electronics", "watchmaking", "precision_die", "electrodes"],
                interfaces: ["HSK-E25", "HSK-E32", "HSK-E40", "HSK-A40", "HSK-A50", "BT30"],
                features: ["micro_clamping", "smallest_diameters", "HSC_capable", "no_special_tools_needed"]
            }
        ]
    },
    // CELSIO - SHRINK FIT TOOLHOLDERS
    // Heat shrink technology for maximum rigidity

    celsio: {
        technology: "shrink_fit",
        description: "Heat shrink toolholders for maximum rigidity",
        runout_um: 3,

        series: [
            {
                id: "SCHUNK_CELSIO",
                series: "CELSIO",
                type: "shrink_fit",
                description: "Standard shrink fit toolholders",
                clamping_range_mm: [3, 32],
                runout_um: 3,
                balancing_grade: "G2.5",
                balancing_rpm: 25000,
                applications: ["HSC", "HPC", "high_rigidity", "finishing"],
                interfaces: ["HSK-A40", "HSK-A50", "HSK-A63", "HSK-A80", "HSK-A100", "HSK-E25", "HSK-E32", "HSK-E40", "HSK-E50", "BT30", "BT40", "BT50", "CAT40", "CAT50", "SK40", "SK50"],
                features: ["maximum_rigidity", "symmetric_design", "HSC_HSM_capable"]
            }
        ]
    },
    // SINO-R - MILL ARBORS AND SIDE LOCK HOLDERS

    sinoR: {
        technology: "mechanical_clamping",
        description: "Mill arbors and side lock holders",

        series: [
            {
                id: "SCHUNK_SINO_R",
                series: "SINO-R",
                type: "mill_arbor",
                description: "Shell mill arbors with integrated dampening",
                applications: ["face_milling", "shell_mills", "indexable_tools"],
                interfaces: ["HSK-A40", "HSK-A50", "HSK-A63", "HSK-A80", "HSK-A100", "BT40", "BT50", "CAT40", "CAT50", "SK40", "SK50"],
                arbor_sizes_mm: [16, 22, 27, 32, 40],
                features: ["vibration_damping", "high_precision"]
            }
        ]
    },
    // INTERFACE SPECIFICATIONS

    interfaces: {
        "HSK-A40": { type: "HSK", size: 40, variant: "A", max_rpm: 40000, taper_ratio: "1:10" },
        "HSK-A50": { type: "HSK", size: 50, variant: "A", max_rpm: 30000, taper_ratio: "1:10" },
        "HSK-A63": { type: "HSK", size: 63, variant: "A", max_rpm: 24000, taper_ratio: "1:10" },
        "HSK-A80": { type: "HSK", size: 80, variant: "A", max_rpm: 18000, taper_ratio: "1:10" },
        "HSK-A100": { type: "HSK", size: 100, variant: "A", max_rpm: 15000, taper_ratio: "1:10" },
        "HSK-E25": { type: "HSK", size: 25, variant: "E", max_rpm: 60000, taper_ratio: "1:10" },
        "HSK-E32": { type: "HSK", size: 32, variant: "E", max_rpm: 50000, taper_ratio: "1:10" },
        "HSK-E40": { type: "HSK", size: 40, variant: "E", max_rpm: 42000, taper_ratio: "1:10" },
        "HSK-E50": { type: "HSK", size: 50, variant: "E", max_rpm: 32000, taper_ratio: "1:10" },
        "HSK-F63": { type: "HSK", size: 63, variant: "F", max_rpm: 24000, taper_ratio: "1:10" },
        "BT30": { type: "BT", size: 30, taper: "7:24", max_rpm: 20000 },
        "BT40": { type: "BT", size: 40, taper: "7:24", max_rpm: 15000 },
        "BT50": { type: "BT", size: 50, taper: "7:24", max_rpm: 10000 },
        "CAT40": { type: "CAT", size: 40, taper: "7:24", max_rpm: 15000 },
        "CAT50": { type: "CAT", size: 50, taper: "7:24", max_rpm: 10000 },
        "SK40": { type: "SK", size: 40, din: "DIN 69871", max_rpm: 12000 },
        "SK50": { type: "SK", size: 50, din: "DIN 69871", max_rpm: 8000 }
    },
    // EXTENSIONS AND ACCESSORIES

    extensions: {
        "TENDO_SVL": {
            type: "extension",
            description: "Hydraulic expansion extensions",
            lengths_mm: [50, 80, 120, 160, 200],
            runout_um: 3
        },
        "TRIBOS_SVL": {
            type: "extension",
            description: "Polygonal clamping extensions",
            lengths_mm: [50, 80, 120, 160],
            runout_um: 3
        },
        "GZB_S": {
            type: "intermediate_sleeve",
            description: "Intermediate sleeves for diameter adaptation",
            clamping_types: ["slotted", "coolant_proof"]
        }
    },
    // LOOKUP METHODS

    getAllToolholders: function() {
        return [
            ...this.tendo.series,
            ...this.tribos.series,
            ...this.celsio.series,
            ...this.sinoR.series
        ];
    },
    getById: function(id) {
        return this.getAllToolholders().find(t => t.id === id);
    },
    getBySeries: function(seriesName) {
        return this.getAllToolholders().find(t =>
            t.series.toLowerCase().includes(seriesName.toLowerCase())
        );
    },
    getByInterface: function(interfaceType) {
        return this.getAllToolholders().filter(t =>
            t.interfaces && t.interfaces.includes(interfaceType)
        );
    },
    getByClampingDiameter: function(diameter_mm) {
        return this.getAllToolholders().filter(t =>
            t.clamping_range_mm &&
            diameter_mm >= t.clamping_range_mm[0] &&
            diameter_mm <= t.clamping_range_mm[1]
        );
    },
    getByApplication: function(application) {
        return this.getAllToolholders().filter(t =>
            t.applications && t.applications.includes(application)
        );
    },
    getForHSC: function() {
        return this.getAllToolholders().filter(t =>
            (t.max_rpm && t.max_rpm >= 40000) ||
            (t.applications && t.applications.includes("HSC"))
        );
    },
    getForMicroMachining: function() {
        return this.getAllToolholders().filter(t =>
            t.clamping_range_mm && t.clamping_range_mm[0] <= 3
        );
    },
    recommendToolholder: function(params) {
        const {
            diameter_mm,
            application,
            interface_type,
            max_rpm,
            high_torque
        } = params;

        let candidates = this.getAllToolholders();

        if (diameter_mm) {
            candidates = candidates.filter(t =>
                t.clamping_range_mm &&
                diameter_mm >= t.clamping_range_mm[0] &&
                diameter_mm <= t.clamping_range_mm[1]
            );
        }
        if (application) {
            candidates = candidates.filter(t =>
                t.applications && t.applications.includes(application)
            );
        }
        if (interface_type) {
            candidates = candidates.filter(t =>
                t.interfaces && t.interfaces.includes(interface_type)
            );
        }
        if (max_rpm) {
            candidates = candidates.filter(t =>
                !t.max_rpm || t.max_rpm >= max_rpm
            );
        }
        if (high_torque) {
            // Prefer TENDO E compact for high torque
            candidates.sort((a, b) => {
                if (a.series.includes("E compact")) return -1;
                if (b.series.includes("E compact")) return 1;
                return 0;
            });
        }
        return candidates;
    }
}