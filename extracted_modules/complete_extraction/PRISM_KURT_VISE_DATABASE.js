const PRISM_KURT_VISE_DATABASE = {

    manufacturer: "Kurt Manufacturing",
    brand: "Kurt",
    country: "USA",
    catalog_source: "Kurt_US_Catalog_2022",
    total_models: 25,

    // COMPLETE VISE LIBRARY

    vises: [
        {
            id: "KURT_D40",
            manufacturer: "Kurt",
            model: "D40",
            series: "AngLock",
            type: "anglock",
            jaw_width_in: 4.0,
            jaw_opening_in: 4.375,
            jaw_depth_in: 1.5,
            overall_length_in: 11.5,
            overall_width_in: 4.0,
            overall_height_in: 3.0,
            weight_lbs: 35,
            clamping_force_lbs: 4000,
            repeatability_in: 0.0002,
            base_type: "standard",
            stiffness: { kx: 100, ky: 130, kz: 220, units: "N/μm" }
        },
        {
            id: "KURT_D675",
            manufacturer: "Kurt",
            model: "D675",
            series: "AngLock",
            type: "anglock",
            jaw_width_in: 6.0,
            jaw_opening_in: 6.625,
            jaw_depth_in: 1.75,
            overall_length_in: 16.5,
            overall_width_in: 6.0,
            overall_height_in: 3.5,
            weight_lbs: 72,
            clamping_force_lbs: 6000,
            repeatability_in: 0.0002,
            base_type: "standard",
            stiffness: { kx: 150, ky: 200, kz: 300, units: "N/μm" }
        },
        {
            id: "KURT_D688",
            manufacturer: "Kurt",
            model: "D688",
            series: "AngLock",
            type: "anglock",
            jaw_width_in: 6.0,
            jaw_opening_in: 8.0,
            jaw_depth_in: 2.0,
            overall_length_in: 18.0,
            overall_width_in: 6.0,
            overall_height_in: 4.0,
            weight_lbs: 85,
            clamping_force_lbs: 6500,
            repeatability_in: 0.0002,
            base_type: "88_series",
            stiffness: { kx: 165, ky: 220, kz: 330, units: "N/μm" }
        },
        {
            id: "KURT_D810",
            manufacturer: "Kurt",
            model: "D810",
            series: "AngLock",
            type: "anglock",
            jaw_width_in: 8.0,
            jaw_opening_in: 10.0,
            jaw_depth_in: 2.25,
            overall_length_in: 22.0,
            overall_width_in: 8.0,
            overall_height_in: 4.5,
            weight_lbs: 145,
            clamping_force_lbs: 8000,
            repeatability_in: 0.0002,
            base_type: "standard",
            stiffness: { kx: 200, ky: 260, kz: 400, units: "N/μm" }
        },
        {
            id: "KURT_DX4",
            manufacturer: "Kurt",
            model: "DX4",
            series: "CrossOver",
            type: "crossover",
            jaw_width_in: 4.0,
            jaw_opening_in: 4.0,
            jaw_depth_in: 1.375,
            overall_length_in: 11.0,
            overall_width_in: 5.0,
            overall_height_in: 2.875,
            weight_lbs: 38,
            clamping_force_lbs: 5500,
            repeatability_in: 0.0002,
            base_type: "crossover",
            stiffness: { kx: 110, ky: 145, kz: 240, units: "N/μm" }
        },
        {
            id: "KURT_DX6",
            manufacturer: "Kurt",
            model: "DX6",
            series: "CrossOver",
            type: "crossover",
            jaw_width_in: 6.0,
            jaw_opening_in: 6.0,
            jaw_depth_in: 1.625,
            overall_length_in: 15.5,
            overall_width_in: 7.0,
            overall_height_in: 3.25,
            weight_lbs: 78,
            clamping_force_lbs: 7500,
            repeatability_in: 0.0002,
            base_type: "crossover",
            stiffness: { kx: 165, ky: 215, kz: 330, units: "N/μm" }
        },
        {
            id: "KURT_DX6H",
            manufacturer: "Kurt",
            model: "DX6H",
            series: "CrossOver",
            type: "crossover",
            jaw_width_in: 6.0,
            jaw_opening_in: 9.0,
            jaw_depth_in: 2.0,
            overall_length_in: 18.0,
            overall_width_in: 7.0,
            overall_height_in: 3.5,
            weight_lbs: 92,
            clamping_force_lbs: 8500,
            repeatability_in: 0.0002,
            base_type: "crossover_high",
            stiffness: { kx: 100, ky: 130, kz: 200, units: "N/μm" }
        },
        {
            id: "KURT_3600V",
            manufacturer: "Kurt",
            model: "3600V",
            series: "MaxLock",
            type: "maxlock",
            jaw_width_in: 6.0,
            jaw_opening_in: 6.5,
            jaw_depth_in: 1.75,
            overall_length_in: 14.75,
            overall_width_in: 6.0,
            overall_height_in: 3.375,
            weight_lbs: 55,
            clamping_force_lbs: 7000,
            repeatability_in: 0.0002,
            base_type: "52mm_zeropoint",
            stiffness: { kx: 145, ky: 190, kz: 290, units: "N/μm" }
        },
        {
            id: "KURT_3600H",
            manufacturer: "Kurt",
            model: "3600H",
            series: "MaxLock",
            type: "maxlock",
            jaw_width_in: 6.0,
            jaw_opening_in: 6.5,
            jaw_depth_in: 1.75,
            overall_length_in: 14.75,
            overall_width_in: 6.0,
            overall_height_in: 3.375,
            weight_lbs: 55,
            clamping_force_lbs: 7000,
            repeatability_in: 0.0002,
            base_type: "52mm_zeropoint",
            stiffness: { kx: 100, ky: 130, kz: 200, units: "N/μm" }
        },
        {
            id: "KURT_3610V",
            manufacturer: "Kurt",
            model: "3610V",
            series: "MaxLock",
            type: "maxlock",
            jaw_width_in: 6.0,
            jaw_opening_in: 9.0,
            jaw_depth_in: 2.0,
            overall_length_in: 17.5,
            overall_width_in: 6.0,
            overall_height_in: 3.625,
            weight_lbs: 68,
            clamping_force_lbs: 8000,
            repeatability_in: 0.0002,
            base_type: "52mm_zeropoint",
            stiffness: { kx: 100, ky: 130, kz: 200, units: "N/μm" }
        },
        {
            id: "KURT_3620V",
            manufacturer: "Kurt",
            model: "3620V",
            series: "MaxLock",
            type: "maxlock",
            jaw_width_in: 6.0,
            jaw_opening_in: 10.0,
            jaw_depth_in: 2.25,
            overall_length_in: 19.0,
            overall_width_in: 6.0,
            overall_height_in: 3.75,
            weight_lbs: 75,
            clamping_force_lbs: 8500,
            repeatability_in: 0.0002,
            base_type: "52mm_zeropoint",
            stiffness: { kx: 100, ky: 130, kz: 200, units: "N/μm" }
        },
        {
            id: "KURT_3630V",
            manufacturer: "Kurt",
            model: "3630V",
            series: "MaxLock",
            type: "maxlock",
            jaw_width_in: 6.0,
            jaw_opening_in: 13.0,
            jaw_depth_in: 2.5,
            overall_length_in: 22.0,
            overall_width_in: 6.0,
            overall_height_in: 4.0,
            weight_lbs: 88,
            clamping_force_lbs: 9000,
            repeatability_in: 0.0002,
            base_type: "52mm_zeropoint",
            stiffness: { kx: 100, ky: 130, kz: 200, units: "N/μm" }
        },
        {
            id: "KURT_3800V",
            manufacturer: "Kurt",
            model: "3800V",
            series: "MaxLock",
            type: "maxlock",
            jaw_width_in: 8.0,
            jaw_opening_in: 8.0,
            jaw_depth_in: 2.0,
            overall_length_in: 18.0,
            overall_width_in: 8.0,
            overall_height_in: 4.0,
            weight_lbs: 95,
            clamping_force_lbs: 9500,
            repeatability_in: 0.0002,
            base_type: "52mm_zeropoint",
            stiffness: { kx: 185, ky: 245, kz: 375, units: "N/μm" }
        },
        {
            id: "KURT_3810V",
            manufacturer: "Kurt",
            model: "3810V",
            series: "MaxLock",
            type: "maxlock",
            jaw_width_in: 8.0,
            jaw_opening_in: 10.0,
            jaw_depth_in: 2.25,
            overall_length_in: 20.5,
            overall_width_in: 8.0,
            overall_height_in: 4.25,
            weight_lbs: 110,
            clamping_force_lbs: 10500,
            repeatability_in: 0.0002,
            base_type: "52mm_zeropoint",
            stiffness: { kx: 100, ky: 130, kz: 200, units: "N/μm" }
        },
        {
            id: "KURT_PF420",
            manufacturer: "Kurt",
            model: "PF420",
            series: "Precision Force (PF)",
            type: "precision_force",
            jaw_width_in: 4.0,
            jaw_opening_in: 3.5,
            jaw_depth_in: 1.25,
            overall_length_in: 10.5,
            overall_width_in: 5.0,
            overall_height_in: 2.75,
            weight_lbs: 32,
            clamping_force_lbs: 5000,
            repeatability_in: 0.0002,
            base_type: "52mm_zeropoint",
            stiffness: { kx: 95, ky: 125, kz: 210, units: "N/μm" }
        },
        {
            id: "KURT_PF440",
            manufacturer: "Kurt",
            model: "PF440",
            series: "Precision Force (PF)",
            type: "precision_force",
            jaw_width_in: 4.0,
            jaw_opening_in: 4.0,
            jaw_depth_in: 1.5,
            overall_length_in: 11.5,
            overall_width_in: 5.0,
            overall_height_in: 3.0,
            weight_lbs: 38,
            clamping_force_lbs: 7000,
            repeatability_in: 0.0002,
            base_type: "52mm_zeropoint",
            stiffness: { kx: 105, ky: 140, kz: 230, units: "N/μm" }
        },
        {
            id: "KURT_PF460",
            manufacturer: "Kurt",
            model: "PF460",
            series: "Precision Force (PF)",
            type: "precision_force",
            jaw_width_in: 6.0,
            jaw_opening_in: 6.0,
            jaw_depth_in: 1.75,
            overall_length_in: 15.0,
            overall_width_in: 7.0,
            overall_height_in: 3.5,
            weight_lbs: 62,
            clamping_force_lbs: 9000,
            repeatability_in: 0.0002,
            base_type: "52mm_zeropoint",
            stiffness: { kx: 155, ky: 205, kz: 310, units: "N/μm" }
        },
        {
            id: "KURT_HD690",
            manufacturer: "Kurt",
            model: "HD690",
            series: "HD (Heavy Duty)",
            type: "heavy_duty",
            jaw_width_in: 6.0,
            jaw_opening_in: 9.0,
            jaw_depth_in: 2.25,
            overall_length_in: 18.5,
            overall_width_in: 7.5,
            overall_height_in: 4.5,
            weight_lbs: 125,
            clamping_force_lbs: 10000,
            repeatability_in: 0.0003,
            base_type: "heavy_duty",
            stiffness: { kx: 200, ky: 260, kz: 400, units: "N/μm" }
        },
        {
            id: "KURT_HD691",
            manufacturer: "Kurt",
            model: "HD691",
            series: "HD (Heavy Duty)",
            type: "heavy_duty",
            jaw_width_in: 6.0,
            jaw_opening_in: 10.0,
            jaw_depth_in: 2.5,
            overall_length_in: 20.0,
            overall_width_in: 7.5,
            overall_height_in: 4.75,
            weight_lbs: 140,
            clamping_force_lbs: 11000,
            repeatability_in: 0.0003,
            base_type: "heavy_duty",
            stiffness: { kx: 220, ky: 285, kz: 440, units: "N/μm" }
        },
        {
            id: "KURT_SCD430",
            manufacturer: "Kurt",
            model: "SCD430",
            series: "Self-Centering",
            type: "self_centering",
            jaw_width_in: 4.0,
            jaw_opening_in: 3.0,
            jaw_depth_in: 1.25,
            overall_length_in: 10.0,
            overall_width_in: 4.5,
            overall_height_in: 2.75,
            weight_lbs: 28,
            clamping_force_lbs: 3500,
            repeatability_in: 0.0005,
            base_type: "self_centering",
            stiffness: { kx: 100, ky: 130, kz: 200, units: "N/μm" }
        },
        {
            id: "KURT_SCD640",
            manufacturer: "Kurt",
            model: "SCD640",
            series: "Self-Centering",
            type: "self_centering",
            jaw_width_in: 6.0,
            jaw_opening_in: 4.0,
            jaw_depth_in: 1.5,
            overall_length_in: 14.0,
            overall_width_in: 6.5,
            overall_height_in: 3.25,
            weight_lbs: 52,
            clamping_force_lbs: 5000,
            repeatability_in: 0.0005,
            base_type: "self_centering",
            stiffness: { kx: 100, ky: 130, kz: 200, units: "N/μm" }
        },
        {
            id: "KURT_3400V",
            manufacturer: "Kurt",
            model: "3400V",
            series: "Double Station",
            type: "double_station",
            jaw_width_in: 4.0,
            jaw_opening_in: 0,
            jaw_depth_in: 0,
            overall_length_in: 13.5,
            overall_width_in: 6.0,
            overall_height_in: 3.0,
            weight_lbs: 45,
            clamping_force_lbs: 4500,
            repeatability_in: 0.0005,
            base_type: "52mm_zeropoint",
            stiffness: { kx: 100, ky: 130, kz: 200, units: "N/μm" }
        },
        {
            id: "KURT_3410V",
            manufacturer: "Kurt",
            model: "3410V",
            series: "Double Station",
            type: "double_station",
            jaw_width_in: 4.0,
            jaw_opening_in: 0,
            jaw_depth_in: 0,
            overall_length_in: 15.5,
            overall_width_in: 6.0,
            overall_height_in: 3.25,
            weight_lbs: 52,
            clamping_force_lbs: 5000,
            repeatability_in: 0.0005,
            base_type: "52mm_zeropoint",
            stiffness: { kx: 100, ky: 130, kz: 200, units: "N/μm" }
        },
        {
            id: "KURT_LP-420",
            manufacturer: "Kurt",
            model: "LP-420",
            series: "5-Axis / Low Profile",
            type: "five_axis",
            jaw_width_in: 4.0,
            jaw_opening_in: 2.0,
            jaw_depth_in: 0.75,
            overall_length_in: 8.0,
            overall_width_in: 4.0,
            overall_height_in: 1.75,
            weight_lbs: 12,
            clamping_force_lbs: 2500,
            repeatability_in: 0.0005,
            base_type: "low_profile",
            stiffness: { kx: 100, ky: 130, kz: 200, units: "N/μm" }
        },
        {
            id: "KURT_LP-620",
            manufacturer: "Kurt",
            model: "LP-620",
            series: "5-Axis / Low Profile",
            type: "five_axis",
            jaw_width_in: 6.0,
            jaw_opening_in: 2.0,
            jaw_depth_in: 0.875,
            overall_length_in: 10.0,
            overall_width_in: 6.0,
            overall_height_in: 2.0,
            weight_lbs: 18,
            clamping_force_lbs: 3000,
            repeatability_in: 0.0005,
            base_type: "low_profile",
            stiffness: { kx: 100, ky: 130, kz: 200, units: "N/μm" }
        }
    ],

    // JAW OPTIONS

    jaw_options: {
        standard_serrated: { friction: 0.25, material: "hardened_steel" },
        machinable_soft_aluminum: { friction: 0.15, material: "6061_aluminum" },
        machinable_soft_steel: { friction: 0.15, material: "1018_steel" },
        carbide_gripper: { friction: 0.30, material: "carbide_insert" },
        diamond_gripper: { friction: 0.35, material: "diamond_coated" },
        smooth_ground: { friction: 0.12, material: "hardened_steel" }
    },
    // LOOKUP METHODS

    getByModel: function(model) {
        return this.vises.find(v => v.model === model || v.id === model);
    },
    getBySeries: function(series) {
        return this.vises.filter(v => v.series.toLowerCase().includes(series.toLowerCase()));
    },
    getByJawWidth: function(width_in) {
        return this.vises.filter(v => v.jaw_width_in === width_in);
    },
    getByMinClampingForce: function(min_force_lbs) {
        return this.vises.filter(v => v.clamping_force_lbs >= min_force_lbs);
    },
    getByMinOpening: function(min_opening_in) {
        return this.vises.filter(v => v.jaw_opening_in >= min_opening_in);
    },
    getFor5Axis: function() {
        return this.vises.filter(v =>
            v.type === 'five_axis' ||
            v.series.toLowerCase().includes('low profile') ||
            v.overall_height_in <= 2.5
        );
    },
    getForAutomation: function() {
        return this.vises.filter(v =>
            v.base_type.includes('52mm') ||
            v.series.includes('Precision Force') ||
            v.type === 'precision_force'
        );
    },
    recommendVise: function(options) {
        let candidates = [...this.vises];

        if (options.min_jaw_width) {
            candidates = candidates.filter(v => v.jaw_width_in >= options.min_jaw_width);
        }
        if (options.max_jaw_width) {
            candidates = candidates.filter(v => v.jaw_width_in <= options.max_jaw_width);
        }
        if (options.min_opening) {
            candidates = candidates.filter(v => v.jaw_opening_in >= options.min_opening);
        }
        if (options.min_force) {
            candidates = candidates.filter(v => v.clamping_force_lbs >= options.min_force);
        }
        if (options.max_height) {
            candidates = candidates.filter(v => v.overall_height_in <= options.max_height);
        }
        if (options.for_5axis) {
            candidates = candidates.filter(v => v.overall_height_in <= 3.0);
        }
        if (options.for_automation) {
            candidates = candidates.filter(v => v.base_type.includes('52mm'));
        }
        // Sort by clamping force (highest first)
        candidates.sort((a, b) => b.clamping_force_lbs - a.clamping_force_lbs);

        return candidates;
    }
}