const PRISM_SCHUNK_DATABASE = {

    manufacturer: "SCHUNK GmbH & Co. KG",
    brand: "SCHUNK",
    country: "Germany",
    catalog_source: "SCHUNK Full Catalog 2022-2024",

    // VERO-S ZERO-POINT CLAMPING SYSTEM
    // Industry-leading quick-change system

    veroS: {
        description: "Quick-change zero-point clamping system",
        repeatability_um: 5,

        modules: [
            {
                id: "SCHUNK_VERO_NSE_T3_138",
                model: "VERO-S NSE-T3 138",
                type: "turbo_module",
                size_mm: 138,
                clamping_force_kN: 40,
                holding_force_kN: 90,
                repeatability_um: 5,
                actuation: "pneumatic",
                stiffness: { kx: 450, ky: 450, kz: 900, units: "N/μm" }
            },
            {
                id: "SCHUNK_VERO_NSE3_138",
                model: "VERO-S NSE3 138",
                type: "standard_module",
                size_mm: 138,
                clamping_force_kN: 15,
                holding_force_kN: 35,
                repeatability_um: 5,
                actuation: "pneumatic",
                stiffness: { kx: 400, ky: 400, kz: 800, units: "N/μm" }
            },
            {
                id: "SCHUNK_VERO_NSL3_150",
                model: "VERO-S NSL3 150",
                type: "lightweight_module",
                size_mm: 150,
                clamping_force_kN: 25,
                holding_force_kN: 55,
                repeatability_um: 5,
                actuation: "pneumatic",
                stiffness: { kx: 350, ky: 350, kz: 700, units: "N/μm" }
            },
            {
                id: "SCHUNK_VERO_WDM5",
                model: "VERO-S WDM-5",
                type: "double_module",
                size_mm: 99,
                clamping_force_kN: 20,
                holding_force_kN: 40,
                repeatability_um: 5,
                actuation: "pneumatic",
                stiffness: { kx: 380, ky: 380, kz: 760, units: "N/μm" }
            }
        ],

        pins: [
            { model: "VERO-S SPB 99", type: "standard", size_mm: 99 },
            { model: "VERO-S SPB 138", type: "standard", size_mm: 138 },
            { model: "VERO-S SPF 99", type: "flat", size_mm: 99 },
            { model: "VERO-S SPF 138", type: "flat", size_mm: 138 },
            { model: "VERO-S SPK 99", type: "ball", size_mm: 99 },
            { model: "VERO-S SPK 138", type: "ball", size_mm: 138 }
        ],

        plates: [
            { model: "VERO-S WDB-5 400x400", size_mm: [400, 400], modules: 4 },
            { model: "VERO-S WDB-5 500x500", size_mm: [500, 500], modules: 4 },
            { model: "VERO-S WDB-5 600x600", size_mm: [600, 600], modules: 6 }
        ]
    },
    // TANDEM POWER CLAMPING VISES
    // High-force hydraulic/pneumatic vises

    tandemVises: [
        {
            id: "SCHUNK_TANDEM_KSF3_100",
            model: "TANDEM KSF3 100",
            series: "TANDEM",
            type: "fixed_jaw_hydraulic",
            jaw_width_mm: 100,
            stroke_mm: 33,
            clamping_force_kN: 35,
            actuation: "hydraulic",
            repeatability_um: 10,
            veroS_compatible: true,
            stiffness: { kx: 180, ky: 220, kz: 350, units: "N/μm" }
        },
        {
            id: "SCHUNK_TANDEM_KSF3_125",
            model: "TANDEM KSF3 125",
            series: "TANDEM",
            type: "fixed_jaw_hydraulic",
            jaw_width_mm: 125,
            stroke_mm: 45,
            clamping_force_kN: 45,
            actuation: "hydraulic",
            repeatability_um: 10,
            veroS_compatible: true,
            stiffness: { kx: 200, ky: 250, kz: 400, units: "N/μm" }
        },
        {
            id: "SCHUNK_TANDEM_KSF3_160",
            model: "TANDEM KSF3 160",
            series: "TANDEM",
            type: "fixed_jaw_hydraulic",
            jaw_width_mm: 160,
            stroke_mm: 55,
            clamping_force_kN: 55,
            actuation: "hydraulic",
            repeatability_um: 10,
            veroS_compatible: true,
            stiffness: { kx: 220, ky: 280, kz: 450, units: "N/μm" }
        },
        {
            id: "SCHUNK_TANDEM_KSP3_100",
            model: "TANDEM KSP3 100",
            series: "TANDEM",
            type: "self_centering_pneumatic",
            jaw_width_mm: 100,
            stroke_per_jaw_mm: 16,
            clamping_force_kN: 25,
            actuation: "pneumatic",
            repeatability_um: 15,
            veroS_compatible: true,
            stiffness: { kx: 160, ky: 200, kz: 320, units: "N/μm" }
        },
        {
            id: "SCHUNK_TANDEM_KSP3_125",
            model: "TANDEM KSP3 125",
            series: "TANDEM",
            type: "self_centering_pneumatic",
            jaw_width_mm: 125,
            stroke_per_jaw_mm: 20,
            clamping_force_kN: 35,
            actuation: "pneumatic",
            repeatability_um: 15,
            veroS_compatible: true,
            stiffness: { kx: 180, ky: 220, kz: 360, units: "N/μm" }
        },
        {
            id: "SCHUNK_TANDEM_KSP3_160",
            model: "TANDEM KSP3 160",
            series: "TANDEM",
            type: "self_centering_pneumatic",
            jaw_width_mm: 160,
            stroke_per_jaw_mm: 28,
            clamping_force_kN: 45,
            actuation: "pneumatic",
            repeatability_um: 15,
            veroS_compatible: true,
            stiffness: { kx: 200, ky: 250, kz: 400, units: "N/μm" }
        },
        {
            id: "SCHUNK_TANDEM_KSH3_100",
            model: "TANDEM KSH3 100",
            series: "TANDEM",
            type: "low_profile_hydraulic",
            jaw_width_mm: 100,
            stroke_mm: 33,
            clamping_force_kN: 40,
            height_mm: 70,
            actuation: "hydraulic",
            veroS_compatible: true,
            stiffness: { kx: 170, ky: 210, kz: 340, units: "N/μm" }
        },
        {
            id: "SCHUNK_TANDEM_KSH3_160",
            model: "TANDEM KSH3 160",
            series: "TANDEM",
            type: "low_profile_hydraulic",
            jaw_width_mm: 160,
            stroke_mm: 60,
            clamping_force_kN: 65,
            height_mm: 85,
            actuation: "hydraulic",
            veroS_compatible: true,
            stiffness: { kx: 210, ky: 270, kz: 430, units: "N/μm" }
        },
        {
            id: "SCHUNK_TANDEM_KRE3_125",
            model: "TANDEM KRE3 125",
            series: "TANDEM",
            type: "manual_screw",
            jaw_width_mm: 125,
            stroke_mm: 50,
            clamping_force_kN: 30,
            actuation: "manual",
            repeatability_um: 10,
            veroS_compatible: true,
            stiffness: { kx: 170, ky: 210, kz: 340, units: "N/μm" }
        }
    ],

    // KONTEC CENTRIC CLAMPING VISES
    // 5-axis optimized with pull-down effect

    kontecVises: [
        {
            id: "SCHUNK_KONTEC_KSC_D_100",
            model: "KONTEC KSC-D 100",
            series: "KONTEC",
            type: "double_acting_centric",
            jaw_width_mm: 100,
            stroke_per_jaw_mm: 15,
            clamping_force_kN: 25,
            actuation: "manual",
            features: ["centric", "pull_down", "5_axis"],
            stiffness: { kx: 140, ky: 180, kz: 280, units: "N/μm" }
        },
        {
            id: "SCHUNK_KONTEC_KSC_D_125",
            model: "KONTEC KSC-D 125",
            series: "KONTEC",
            type: "double_acting_centric",
            jaw_width_mm: 125,
            stroke_per_jaw_mm: 20,
            clamping_force_kN: 32,
            actuation: "manual",
            features: ["centric", "pull_down", "5_axis"],
            stiffness: { kx: 150, ky: 200, kz: 300, units: "N/μm" }
        },
        {
            id: "SCHUNK_KONTEC_KSC_F_100",
            model: "KONTEC KSC-F 100",
            series: "KONTEC",
            type: "fixed_jaw",
            jaw_width_mm: 100,
            stroke_mm: 30,
            clamping_force_kN: 28,
            actuation: "manual",
            features: ["pull_down", "5_axis"],
            stiffness: { kx: 145, ky: 185, kz: 290, units: "N/μm" }
        },
        {
            id: "SCHUNK_KONTEC_KSG_125",
            model: "KONTEC KSG 125",
            series: "KONTEC",
            type: "standard",
            jaw_width_mm: 125,
            stroke_mm: 73,
            clamping_force_kN: 40,
            actuation: "manual",
            repeatability_um: 10,
            stiffness: { kx: 150, ky: 200, kz: 300, units: "N/μm" }
        },
        {
            id: "SCHUNK_KONTEC_KSG_160",
            model: "KONTEC KSG 160",
            series: "KONTEC",
            type: "standard",
            jaw_width_mm: 160,
            stroke_mm: 106,
            clamping_force_kN: 50,
            actuation: "manual",
            repeatability_um: 10,
            stiffness: { kx: 170, ky: 220, kz: 340, units: "N/μm" }
        },
        {
            id: "SCHUNK_KONTEC_KSM2_125",
            model: "KONTEC KSM2 125",
            series: "KONTEC",
            type: "modular",
            jaw_width_mm: 125,
            stroke_mm: 54,
            clamping_force_kN: 32,
            actuation: "manual",
            features: ["modular_jaws", "quick_change"],
            stiffness: { kx: 145, ky: 190, kz: 290, units: "N/μm" }
        }
    ],

    // ROTA POWER CHUCKS
    // High-precision CNC lathe chucks

    powerChucks: [
        {
            id: "SCHUNK_ROTA_NCE_94",
            model: "ROTA NCE 94",
            series: "ROTA",
            type: "power_chuck",
            diameter_mm: 94,
            through_hole_mm: 18,
            clamping_force_kN: 32,
            max_rpm: 8000,
            jaws: 3,
            actuation: "hydraulic",
            stiffness: { radial: 150, axial: 350, units: "N/μm" }
        },
        {
            id: "SCHUNK_ROTA_NCE_130",
            model: "ROTA NCE 130",
            series: "ROTA",
            type: "power_chuck",
            diameter_mm: 130,
            through_hole_mm: 27,
            clamping_force_kN: 52,
            max_rpm: 6000,
            jaws: 3,
            actuation: "hydraulic",
            stiffness: { radial: 180, axial: 400, units: "N/μm" }
        },
        {
            id: "SCHUNK_ROTA_NCE_165",
            model: "ROTA NCE 165",
            series: "ROTA",
            type: "power_chuck",
            diameter_mm: 165,
            through_hole_mm: 36,
            clamping_force_kN: 75,
            max_rpm: 5000,
            jaws: 3,
            actuation: "hydraulic",
            stiffness: { radial: 200, axial: 450, units: "N/μm" }
        },
        {
            id: "SCHUNK_ROTA_NCE_210",
            model: "ROTA NCE 210",
            series: "ROTA",
            type: "power_chuck",
            diameter_mm: 210,
            through_hole_mm: 52,
            clamping_force_kN: 105,
            max_rpm: 4500,
            jaws: 3,
            actuation: "hydraulic",
            stiffness: { radial: 220, axial: 500, units: "N/μm" }
        },
        {
            id: "SCHUNK_ROTA_NCE_260",
            model: "ROTA NCE 260",
            series: "ROTA",
            type: "power_chuck",
            diameter_mm: 260,
            through_hole_mm: 66,
            clamping_force_kN: 145,
            max_rpm: 4000,
            jaws: 3,
            actuation: "hydraulic",
            stiffness: { radial: 260, axial: 580, units: "N/μm" }
        },
        {
            id: "SCHUNK_ROTA_NCE_315",
            model: "ROTA NCE 315",
            series: "ROTA",
            type: "power_chuck",
            diameter_mm: 315,
            through_hole_mm: 76,
            clamping_force_kN: 175,
            max_rpm: 3500,
            jaws: 3,
            actuation: "hydraulic",
            stiffness: { radial: 300, axial: 650, units: "N/μm" }
        },
        {
            id: "SCHUNK_ROTA_NCF_400",
            model: "ROTA NCF 400",
            series: "ROTA",
            type: "power_chuck",
            diameter_mm: 400,
            through_hole_mm: 106,
            clamping_force_kN: 250,
            max_rpm: 2500,
            jaws: 3,
            actuation: "hydraulic",
            stiffness: { radial: 360, axial: 750, units: "N/μm" }
        },
        {
            id: "SCHUNK_ROTA_NCF_500",
            model: "ROTA NCF 500",
            series: "ROTA",
            type: "power_chuck",
            diameter_mm: 500,
            through_hole_mm: 130,
            clamping_force_kN: 320,
            max_rpm: 2000,
            jaws: 3,
            actuation: "hydraulic",
            stiffness: { radial: 400, axial: 850, units: "N/μm" }
        },
        {
            id: "SCHUNK_ROTA_NCF_630",
            model: "ROTA NCF 630",
            series: "ROTA",
            type: "power_chuck",
            diameter_mm: 630,
            through_hole_mm: 160,
            clamping_force_kN: 420,
            max_rpm: 1600,
            jaws: 3,
            actuation: "hydraulic",
            stiffness: { radial: 480, axial: 1000, units: "N/μm" }
        },
        {
            id: "SCHUNK_ROTA_NCO_210",
            model: "ROTA NCO 210",
            series: "ROTA",
            type: "collet_chuck",
            diameter_mm: 210,
            collet_range_mm: [3, 42],
            clamping_force_kN: 80,
            max_rpm: 6000,
            actuation: "hydraulic",
            stiffness: { radial: 250, axial: 550, units: "N/μm" }
        },
        {
            id: "SCHUNK_ROTA_NCO_260",
            model: "ROTA NCO 260",
            series: "ROTA",
            type: "collet_chuck",
            diameter_mm: 260,
            collet_range_mm: [5, 65],
            clamping_force_kN: 110,
            max_rpm: 5000,
            actuation: "hydraulic",
            stiffness: { radial: 280, axial: 600, units: "N/μm" }
        },
        {
            id: "SCHUNK_ROTA_NCML_178",
            model: "ROTA NCML 178",
            series: "ROTA",
            type: "manual_chuck",
            diameter_mm: 178,
            through_hole_mm: 32,
            clamping_force_kN: 55,
            max_rpm: 5500,
            jaws: 3,
            actuation: "manual",
            stiffness: { radial: 190, axial: 420, units: "N/μm" }
        }
    ],

    // MAGNOS MAGNETIC CHUCKS
    // Electro-permanent for 5-axis and grinding

    magneticChucks: [
        {
            id: "SCHUNK_MAGNOS_MFRS_104x50",
            model: "MAGNOS MFRS 104x50",
            series: "MAGNOS",
            type: "rectangular",
            dimensions_mm: [104, 50],
            holding_force_N_cm2: 150,
            pole_pitch_mm: 10,
            applications: ["5_axis", "milling", "finishing"]
        },
        {
            id: "SCHUNK_MAGNOS_MFRS_204x104",
            model: "MAGNOS MFRS 204x104",
            series: "MAGNOS",
            type: "rectangular",
            dimensions_mm: [204, 104],
            holding_force_N_cm2: 150,
            pole_pitch_mm: 10,
            applications: ["5_axis", "milling"]
        },
        {
            id: "SCHUNK_MAGNOS_MFRS_304x204",
            model: "MAGNOS MFRS 304x204",
            series: "MAGNOS",
            type: "rectangular",
            dimensions_mm: [304, 204],
            holding_force_N_cm2: 150,
            pole_pitch_mm: 10,
            applications: ["production", "milling"]
        },
        {
            id: "SCHUNK_MAGNOS_MSC_125",
            model: "MAGNOS MSC 125",
            series: "MAGNOS",
            type: "round",
            diameter_mm: 125,
            holding_force_N_cm2: 180,
            applications: ["5_axis", "turning"]
        },
        {
            id: "SCHUNK_MAGNOS_MSC_200",
            model: "MAGNOS MSC 200",
            series: "MAGNOS",
            type: "round",
            diameter_mm: 200,
            holding_force_N_cm2: 180,
            applications: ["5_axis", "turning"]
        }
    ],

    // LOOKUP METHODS

    getById: function(id) {
        // Search all categories
        const allItems = [
            ...this.veroS.modules,
            ...this.tandemVises,
            ...this.kontecVises,
            ...this.powerChucks,
            ...this.magneticChucks
        ];
        return allItems.find(item => item.id === id || item.model === id);
    },
    getVises: function() {
        return [...this.tandemVises, ...this.kontecVises];
    },
    getChucks: function() {
        return this.powerChucks;
    },
    getZeroPoint: function() {
        return this.veroS.modules;
    },
    getByMinClampingForce: function(min_kN) {
        const allItems = [...this.tandemVises, ...this.kontecVises, ...this.powerChucks];
        return allItems.filter(item => item.clamping_force_kN >= min_kN);
    },
    getByJawWidth: function(width_mm) {
        const vises = [...this.tandemVises, ...this.kontecVises];
        return vises.filter(v => v.jaw_width_mm === width_mm);
    },
    getByChuckDiameter: function(min_mm, max_mm) {
        return this.powerChucks.filter(c =>
            c.diameter_mm >= min_mm && c.diameter_mm <= (max_mm || 9999)
        );
    },
    getFor5Axis: function() {
        return this.kontecVises.filter(v =>
            v.features && v.features.includes("5_axis")
        );
    },
    getForAutomation: function() {
        return [...this.veroS.modules, ...this.tandemVises.filter(v => v.veroS_compatible)];
    }
}