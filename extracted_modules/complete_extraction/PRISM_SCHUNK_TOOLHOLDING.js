const PRISM_SCHUNK_TOOLHOLDING = {

    manufacturer: "SCHUNK GmbH & Co. KG",
    brand: "SCHUNK",
    country: "Germany",
    catalog_source: "SCHUNK Full Catalog 2022-2024",

    // TENDO - HYDRAULIC EXPANSION TOOLHOLDERS
    // Premium hydraulic clamping technology

    tendo: {
        series_name: "TENDO",
        technology: "hydraulic_expansion",
        description: "Hydraulic expansion toolholders with <0.003mm runout",
        features: [
            "Hydraulic oil-based expansion clamping",
            "Excellent vibration damping",
            "High torque transmission",
            "Tool-free clamping with hex key",
            "Suitable for all rotating applications"
        ],
        runout_um: 3,
        damping: "excellent",

        product_lines: {

            // TENDO E compact - Standard line
            "TENDO_E": {
                name: "TENDO E compact",
                description: "Standard hydraulic expansion holder",
                runout_um: 3,
                balancing_grade: "G2.5_25000",
                coolant: "internal_optional",
                interfaces: ["HSK-A63", "HSK-A100", "BT40", "BT50", "CAT40", "CAT50", "SK40", "SK50"],
                clamping_diameters_mm: [6, 8, 10, 12, 14, 16, 18, 20, 25, 32],
                projection_lengths_mm: [65, 90, 120, 160],
                torque_Nm: { 6: 12, 10: 35, 16: 90, 20: 140, 32: 350 }
            },
            // TENDO EC - Extended cooling
            "TENDO_EC": {
                name: "TENDO EC",
                description: "Hydraulic holder with enhanced cooling",
                runout_um: 3,
                balancing_grade: "G2.5_25000",
                coolant: "internal_standard",
                coolant_pressure_bar: 80,
                interfaces: ["HSK-A63", "HSK-A100", "BT40", "BT50", "CAT40", "CAT50"],
                clamping_diameters_mm: [6, 8, 10, 12, 14, 16, 20, 25],
                projection_lengths_mm: [80, 100, 130, 160]
            },
            // TENDO LSS - Long slim shank
            "TENDO_LSS": {
                name: "TENDO LSS",
                description: "Long slim shank for deep cavity machining",
                runout_um: 6,
                balancing_grade: "G2.5_25000",
                coolant: "internal_optional",
                interfaces: ["HSK-A63", "HSK-A100", "BT40", "BT50"],
                clamping_diameters_mm: [6, 8, 10, 12, 16, 20],
                projection_lengths_mm: [120, 160, 200, 250, 300],
                features: ["deep_cavity", "mold_making"]
            },
            // TENDO RLA - Reinforced for heavy machining
            "TENDO_RLA": {
                name: "TENDO RLA",
                description: "Reinforced holder for heavy duty machining",
                runout_um: 3,
                balancing_grade: "G2.5_20000",
                coolant: "internal_standard",
                interfaces: ["HSK-A100", "BT50", "CAT50", "SK50"],
                clamping_diameters_mm: [16, 20, 25, 32, 40],
                projection_lengths_mm: [80, 100, 130, 160, 200],
                torque_Nm: { 20: 200, 25: 300, 32: 500, 40: 700 },
                features: ["heavy_duty", "high_torque"]
            },
            // TENDO SDF - Slim design flange
            "TENDO_SDF": {
                name: "TENDO SDF",
                description: "Slim design for tight spaces",
                runout_um: 3,
                balancing_grade: "G2.5_25000",
                coolant: "internal_optional",
                interfaces: ["HSK-A63", "BT40", "CAT40"],
                clamping_diameters_mm: [6, 8, 10, 12, 16],
                projection_lengths_mm: [65, 80, 100, 120],
                features: ["compact", "5_axis"]
            },
            // TENDO Zero - High-precision variant
            "TENDO_ZERO": {
                name: "TENDO Zero",
                description: "Ultra-precision hydraulic holder",
                runout_um: 2,
                balancing_grade: "G2.5_30000",
                coolant: "internal_standard",
                interfaces: ["HSK-A63", "HSK-E50", "HSK-E40"],
                clamping_diameters_mm: [3, 4, 6, 8, 10, 12],
                features: ["ultra_precision", "finishing", "small_tools"]
            },
            // iTENDO - Intelligent holder with sensors
            "iTENDO": {
                name: "iTENDO²",
                description: "Smart hydraulic holder with integrated sensors",
                runout_um: 3,
                balancing_grade: "G2.5_25000",
                coolant: "internal_standard",
                interfaces: ["HSK-A63", "SK50"],
                clamping_diameters_mm: [6, 8, 10, 12, 16, 20],
                sensors: ["acceleration", "temperature"],
                features: ["process_monitoring", "industry_4.0", "predictive_maintenance"]
            }
        }
    },
    // TRIBOS - POLYGONAL CLAMPING TOOLHOLDERS
    // High-speed capable with excellent rigidity

    tribos: {
        series_name: "TRIBOS",
        technology: "polygonal_clamping",
        description: "Polygonal clamping for high-speed and micro-machining",
        features: [
            "Polygonal deformation clamping",
            "Highest rigidity of any holder type",
            "Best for high-speed machining",
            "Ideal for micro tools",
            "Requires clamping device"
        ],
        runout_um: 3,
        rigidity: "highest",

        product_lines: {

            // TRIBOS-Mini - Micro tool holders
            "TRIBOS_MINI": {
                name: "TRIBOS-Mini",
                description: "For micro tools from 0.3mm diameter",
                runout_um: 3,
                balancing_grade: "G2.5_60000",
                interfaces: ["HSK-E25", "HSK-E32", "HSK-E40", "HSK-A63"],
                clamping_diameters_mm: [0.3, 0.5, 1, 1.5, 2, 3, 4, 5, 6],
                max_rpm: 80000,
                features: ["micro_machining", "dental", "medical", "electronics"]
            },
            // TRIBOS-S - Standard polygonal
            "TRIBOS_S": {
                name: "TRIBOS-S",
                description: "Standard polygonal holder",
                runout_um: 3,
                balancing_grade: "G2.5_40000",
                interfaces: ["HSK-A63", "HSK-A100", "BT40", "BT50", "CAT40", "SK40"],
                clamping_diameters_mm: [3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20],
                max_rpm: 50000,
                coolant: "internal_optional"
            },
            // TRIBOS-R - Reinforced
            "TRIBOS_R": {
                name: "TRIBOS-R",
                description: "Reinforced for higher torque",
                runout_um: 3,
                balancing_grade: "G2.5_30000",
                interfaces: ["HSK-A100", "BT50", "CAT50", "SK50"],
                clamping_diameters_mm: [12, 14, 16, 18, 20, 25, 32],
                max_rpm: 30000,
                features: ["high_torque", "heavy_machining"]
            },
            // TRIBOS-RM - ER collet compatible
            "TRIBOS_RM": {
                name: "TRIBOS-RM",
                description: "ER collet style with polygonal clamping",
                runout_um: 3,
                balancing_grade: "G2.5_35000",
                interfaces: ["HSK-A63", "HSK-A100", "BT40", "BT50"],
                collet_types: ["ER16", "ER25", "ER32", "ER40"],
                max_rpm: 40000
            },
            // TRIBOS SVL - Long slim version
            "TRIBOS_SVL": {
                name: "TRIBOS SVL",
                description: "Slim long version for deep machining",
                runout_um: 5,
                balancing_grade: "G2.5_25000",
                interfaces: ["HSK-A63", "HSK-A100", "BT40", "BT50"],
                clamping_diameters_mm: [6, 8, 10, 12, 16],
                projection_lengths_mm: [120, 150, 180, 220, 260, 300],
                features: ["deep_cavity", "mold_making"]
            }
        }
    },
    // CELSIO - SHRINK FIT TOOLHOLDERS
    // Maximum rigidity and precision

    celsio: {
        series_name: "CELSIO",
        technology: "shrink_fit",
        description: "Shrink fit holders for maximum rigidity",
        features: [
            "Thermal expansion/contraction clamping",
            "Highest concentricity possible",
            "Maximum rigidity",
            "Best for finishing",
            "Requires heating/cooling device"
        ],
        runout_um: 3,
        rigidity: "maximum",

        product_lines: {

            // Standard CELSIO
            "CELSIO": {
                name: "CELSIO",
                description: "Standard shrink fit holder",
                runout_um: 3,
                balancing_grade: "G2.5_25000",
                interfaces: ["HSK-A63", "HSK-A100", "HSK-E50", "BT40", "BT50", "CAT40", "CAT50", "SK40", "SK50"],
                clamping_diameters_mm: [3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 25, 32],
                projection_lengths_mm: [60, 80, 100, 120, 160, 200],
                coolant: "internal_optional"
            },
            // CELSIO SVL - Slim long version
            "CELSIO_SVL": {
                name: "CELSIO SVL",
                description: "Slim long shrink fit for deep machining",
                runout_um: 5,
                balancing_grade: "G2.5_25000",
                interfaces: ["HSK-A63", "HSK-A100", "BT40", "BT50"],
                clamping_diameters_mm: [6, 8, 10, 12, 16, 20],
                projection_lengths_mm: [120, 160, 200, 250, 300],
                features: ["deep_cavity", "mold_making"]
            },
            // CELSIO Slim - Reduced interference contour
            "CELSIO_SLIM": {
                name: "CELSIO Slim",
                description: "Slim design for 5-axis machining",
                runout_um: 3,
                balancing_grade: "G2.5_30000",
                interfaces: ["HSK-A63", "HSK-E50", "BT40"],
                clamping_diameters_mm: [6, 8, 10, 12, 16],
                features: ["5_axis", "reduced_interference"]
            }
        }
    },
    // ER COLLET CHUCKS
    // Versatile standard collet holders

    erColletChucks: {
        series_name: "ER Collet Chucks",
        technology: "collet_clamping",
        description: "Standard ER collet chucks with high precision",

        product_lines: {

            // ER Precision
            "ER_P": {
                name: "ER P (Precision)",
                description: "High-precision ER collet chuck",
                runout_um: 3,
                balancing_grade: "G2.5_25000",
                interfaces: ["HSK-A63", "HSK-A100", "BT40", "BT50", "CAT40", "CAT50", "SK40", "SK50"],
                collet_types: ["ER8", "ER11", "ER16", "ER20", "ER25", "ER32", "ER40", "ER50"],
                clamping_ranges: {
                    "ER8": [0.5, 5],
                    "ER11": [0.5, 7],
                    "ER16": [1, 10],
                    "ER20": [1, 13],
                    "ER25": [2, 16],
                    "ER32": [2, 20],
                    "ER40": [3, 26],
                    "ER50": [6, 34]
                }
            },
            // ER Mini - Compact
            "ER_MINI": {
                name: "ER Mini",
                description: "Compact ER chuck for tight spaces",
                runout_um: 8,
                balancing_grade: "G2.5_25000",
                interfaces: ["HSK-A63", "HSK-E50", "BT40"],
                collet_types: ["ER8", "ER11", "ER16", "ER20"],
                features: ["compact", "5_axis"]
            }
        }
    },
    // SINO / WELDON / WHISTLE NOTCH HOLDERS
    // Side-lock and face mill arbors

    sidelock: {
        series_name: "Side Lock Holders",

        product_lines: {

            // WELDON holders
            "WELDON": {
                name: "WELDON / Whistle Notch",
                description: "Side lock holder for Weldon shank tools",
                runout_um: 10,
                interfaces: ["HSK-A63", "HSK-A100", "BT40", "BT50", "CAT40", "CAT50", "SK40", "SK50"],
                clamping_diameters_mm: [6, 8, 10, 12, 14, 16, 18, 20, 25, 32, 40],
                features: ["high_torque", "positive_drive"]
            },
            // Face mill arbors (SINO)
            "SINO": {
                name: "SINO Face Mill Arbor",
                description: "Arbor for shell/face mills",
                interfaces: ["HSK-A63", "HSK-A100", "BT40", "BT50", "CAT40", "CAT50"],
                arbor_sizes_mm: [16, 22, 27, 32, 40],
                features: ["face_mills", "shell_mills"]
            }
        }
    },
    // INTERFACE SPECIFICATIONS

    interfaces: {
        "HSK-A63": { type: "HSK", size: 63, form: "A", max_rpm: 30000, torque_Nm: 200, standard: "DIN ISO 12164-1" },
        "HSK-A100": { type: "HSK", size: 100, form: "A", max_rpm: 18000, torque_Nm: 600, standard: "DIN ISO 12164-1" },
        "HSK-E50": { type: "HSK", size: 50, form: "E", max_rpm: 42000, torque_Nm: 100, standard: "DIN ISO 12164-1" },
        "HSK-E40": { type: "HSK", size: 40, form: "E", max_rpm: 50000, torque_Nm: 60, standard: "DIN ISO 12164-1" },
        "HSK-E32": { type: "HSK", size: 32, form: "E", max_rpm: 60000, torque_Nm: 35, standard: "DIN ISO 12164-1" },
        "HSK-E25": { type: "HSK", size: 25, form: "E", max_rpm: 80000, torque_Nm: 20, standard: "DIN ISO 12164-1" },
        "BT40": { type: "BT", size: 40, max_rpm: 12000, torque_Nm: 100, standard: "JIS B 6339" },
        "BT50": { type: "BT", size: 50, max_rpm: 8000, torque_Nm: 400, standard: "JIS B 6339" },
        "CAT40": { type: "CAT", size: 40, max_rpm: 12000, torque_Nm: 100, standard: "ANSI B5.50" },
        "CAT50": { type: "CAT", size: 50, max_rpm: 8000, torque_Nm: 400, standard: "ANSI B5.50" },
        "SK40": { type: "SK", size: 40, max_rpm: 10000, torque_Nm: 100, standard: "DIN 69871" },
        "SK50": { type: "SK", size: 50, max_rpm: 6000, torque_Nm: 400, standard: "DIN 69871" },
        "CAPTO_C6": { type: "CAPTO", size: "C6", torque_Nm: 560, standard: "ISO 26623-1" },
        "CAPTO_C8": { type: "CAPTO", size: "C8", torque_Nm: 1400, standard: "ISO 26623-1" }
    },
    // LOOKUP METHODS

    getByTechnology: function(tech) {
        switch(tech.toLowerCase()) {
            case 'hydraulic': return this.tendo;
            case 'polygonal': return this.tribos;
            case 'shrink': case 'shrink_fit': return this.celsio;
            case 'collet': case 'er': return this.erColletChucks;
            case 'sidelock': case 'weldon': return this.sidelock;
            default: return null;
        }
    },
    getByInterface: function(interfaceType) {
        const results = [];

        // Search TENDO
        Object.values(this.tendo.product_lines).forEach(line => {
            if (line.interfaces && line.interfaces.includes(interfaceType)) {
                results.push({ series: 'TENDO', product: line.name, technology: 'hydraulic_expansion' });
            }
        });

        // Search TRIBOS
        Object.values(this.tribos.product_lines).forEach(line => {
            if (line.interfaces && line.interfaces.includes(interfaceType)) {
                results.push({ series: 'TRIBOS', product: line.name, technology: 'polygonal' });
            }
        });

        // Search CELSIO
        Object.values(this.celsio.product_lines).forEach(line => {
            if (line.interfaces && line.interfaces.includes(interfaceType)) {
                results.push({ series: 'CELSIO', product: line.name, technology: 'shrink_fit' });
            }
        });

        // Search ER
        Object.values(this.erColletChucks.product_lines).forEach(line => {
            if (line.interfaces && line.interfaces.includes(interfaceType)) {
                results.push({ series: 'ER', product: line.name, technology: 'collet' });
            }
        });

        return results;
    },
    getByClampingDiameter: function(diameter_mm) {
        const results = [];

        // Search all product lines
        [this.tendo, this.tribos, this.celsio].forEach(series => {
            Object.values(series.product_lines).forEach(line => {
                if (line.clamping_diameters_mm && line.clamping_diameters_mm.includes(diameter_mm)) {
                    results.push({
                        series: series.series_name,
                        product: line.name,
                        runout_um: line.runout_um
                    });
                }
            });
        });

        return results;
    },
    recommendHolder: function(options) {
        const {
            tool_diameter_mm,
            interface_type,
            application,  // 'roughing', 'finishing', 'hsm', 'micro', 'deep_cavity'
            max_rpm
        } = options;

        const recommendations = [];

        // Micro machining (< 3mm)
        if (tool_diameter_mm < 3 || application === 'micro') {
            recommendations.push({
                series: 'TRIBOS',
                product: 'TRIBOS-Mini',
                reason: 'Best for micro tools, highest rigidity'
            });
        }
        // High-speed machining
        if (application === 'hsm' || max_rpm > 20000) {
            recommendations.push({
                series: 'TRIBOS',
                product: 'TRIBOS-S',
                reason: 'Highest rigidity for high-speed machining'
            });
            recommendations.push({
                series: 'CELSIO',
                product: 'CELSIO',
                reason: 'Maximum concentricity for HSM'
            });
        }
        // Finishing
        if (application === 'finishing') {
            recommendations.push({
                series: 'TENDO',
                product: 'TENDO Zero',
                reason: 'Excellent damping, best surface finish'
            });
            recommendations.push({
                series: 'CELSIO',
                product: 'CELSIO',
                reason: 'Maximum rigidity for finishing'
            });
        }
        // Deep cavity / mold making
        if (application === 'deep_cavity') {
            recommendations.push({
                series: 'TENDO',
                product: 'TENDO LSS',
                reason: 'Long slim design with vibration damping'
            });
            recommendations.push({
                series: 'TRIBOS',
                product: 'TRIBOS SVL',
                reason: 'Long slim with maximum rigidity'
            });
        }
        // Heavy roughing
        if (application === 'roughing') {
            recommendations.push({
                series: 'TENDO',
                product: 'TENDO RLA',
                reason: 'High torque capacity with vibration damping'
            });
        }
        // Default general purpose
        if (recommendations.length === 0) {
            recommendations.push({
                series: 'TENDO',
                product: 'TENDO E compact',
                reason: 'Best all-round choice - damping + precision'
            });
        }
        return recommendations;
    },
    // Count total products
    getTotalProducts: function() {
        let count = 0;
        count += Object.keys(this.tendo.product_lines).length;
        count += Object.keys(this.tribos.product_lines).length;
        count += Object.keys(this.celsio.product_lines).length;
        count += Object.keys(this.erColletChucks.product_lines).length;
        count += Object.keys(this.sidelock.product_lines).length;
        return count;
    }
}