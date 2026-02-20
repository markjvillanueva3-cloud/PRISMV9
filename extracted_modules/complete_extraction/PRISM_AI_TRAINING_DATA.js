const PRISM_AI_TRAINING_DATA = {

    /**
     * Generate training data from PRISM Materials Database
     */
    generateMaterialTrainingData: function() {
        const trainingData = [];

        // Try to access PRISM_MATERIALS_MASTER
        const materials = this._getMaterials();

        for (const mat of materials) {
            // Create training samples for each material
            const sample = {
                // Input features
                input: [
                    mat.hardness_bhn / 500,           // Normalized hardness
                    mat.tensile_strength / 2000,     // Normalized tensile
                    mat.thermal_conductivity / 400,  // Normalized conductivity
                    mat.machinability_rating / 100,  // Already 0-100 scale
                    this._encodeMaterialFamily(mat.family),
                    mat.density / 10000              // Normalized density
                ],

                // Output targets
                output: {
                    recommended_speed: mat.cutting_params?.roughing?.speed?.nominal || 100,
                    recommended_feed: mat.cutting_params?.roughing?.feed?.nominal || 0.1,
                    taylor_n: mat.taylor_coefficients?.n || 0.25,
                    taylor_C: mat.taylor_coefficients?.C || 200,
                    surface_finish_factor: mat.surface_finish_factor || 1.0
                },
                // Metadata
                meta: {
                    id: mat.id,
                    name: mat.name,
                    family: mat.family
                }
            };
            trainingData.push(sample);
        }
        return trainingData;
    },
    _getMaterials: function() {
        // Try to get from global PRISM database
        if (typeof PRISM_MATERIALS_MASTER !== 'undefined' && PRISM_MATERIALS_MASTER.materials) {
            return PRISM_MATERIALS_MASTER.materials;
        }
        // Fallback to representative dataset
        return this._getRepresentativeMaterials();
    },
    _getRepresentativeMaterials: function() {
        // Representative materials for training
        return [
            // Aluminum
            { id: 'M0001', name: 'Aluminum 6061-T6', family: 'aluminum', hardness_bhn: 95, tensile_strength: 310, thermal_conductivity: 167, machinability_rating: 90, density: 2700, cutting_params: { roughing: { speed: { nominal: 300 }, feed: { nominal: 0.15 }}}, taylor_coefficients: { n: 0.35, C: 800 }},
            { id: 'M0002', name: 'Aluminum 7075-T6', family: 'aluminum', hardness_bhn: 150, tensile_strength: 572, thermal_conductivity: 130, machinability_rating: 70, density: 2810, cutting_params: { roughing: { speed: { nominal: 250 }, feed: { nominal: 0.12 }}}, taylor_coefficients: { n: 0.32, C: 700 }},
            { id: 'M0003', name: 'Aluminum 2024-T4', family: 'aluminum', hardness_bhn: 120, tensile_strength: 469, thermal_conductivity: 121, machinability_rating: 75, density: 2780, cutting_params: { roughing: { speed: { nominal: 275 }, feed: { nominal: 0.13 }}}, taylor_coefficients: { n: 0.33, C: 750 }},

            // Steel
            { id: 'M0010', name: 'Steel 1018', family: 'steel', hardness_bhn: 126, tensile_strength: 440, thermal_conductivity: 51, machinability_rating: 70, density: 7870, cutting_params: { roughing: { speed: { nominal: 120 }, feed: { nominal: 0.2 }}}, taylor_coefficients: { n: 0.25, C: 200 }},
            { id: 'M0011', name: 'Steel 1045', family: 'steel', hardness_bhn: 179, tensile_strength: 585, thermal_conductivity: 49, machinability_rating: 55, density: 7850, cutting_params: { roughing: { speed: { nominal: 100 }, feed: { nominal: 0.18 }}}, taylor_coefficients: { n: 0.22, C: 175 }},
            { id: 'M0012', name: 'Steel 4140', family: 'steel', hardness_bhn: 197, tensile_strength: 655, thermal_conductivity: 42, machinability_rating: 50, density: 7850, cutting_params: { roughing: { speed: { nominal: 90 }, feed: { nominal: 0.15 }}}, taylor_coefficients: { n: 0.20, C: 150 }},
            { id: 'M0013', name: 'Steel 4340', family: 'steel', hardness_bhn: 217, tensile_strength: 745, thermal_conductivity: 38, machinability_rating: 45, density: 7850, cutting_params: { roughing: { speed: { nominal: 80 }, feed: { nominal: 0.12 }}}, taylor_coefficients: { n: 0.18, C: 130 }},

            // Stainless Steel
            { id: 'M0020', name: 'Stainless 304', family: 'stainless', hardness_bhn: 201, tensile_strength: 515, thermal_conductivity: 16, machinability_rating: 40, density: 8000, cutting_params: { roughing: { speed: { nominal: 60 }, feed: { nominal: 0.1 }}}, taylor_coefficients: { n: 0.20, C: 150 }},
            { id: 'M0021', name: 'Stainless 316', family: 'stainless', hardness_bhn: 217, tensile_strength: 580, thermal_conductivity: 16, machinability_rating: 35, density: 8000, cutting_params: { roughing: { speed: { nominal: 55 }, feed: { nominal: 0.08 }}}, taylor_coefficients: { n: 0.18, C: 130 }},
            { id: 'M0022', name: 'Stainless 17-4 PH', family: 'stainless', hardness_bhn: 352, tensile_strength: 1100, thermal_conductivity: 18, machinability_rating: 30, density: 7800, cutting_params: { roughing: { speed: { nominal: 45 }, feed: { nominal: 0.08 }}}, taylor_coefficients: { n: 0.15, C: 100 }},

            // Titanium
            { id: 'M0030', name: 'Titanium Grade 2', family: 'titanium', hardness_bhn: 200, tensile_strength: 345, thermal_conductivity: 17, machinability_rating: 35, density: 4510, cutting_params: { roughing: { speed: { nominal: 50 }, feed: { nominal: 0.1 }}}, taylor_coefficients: { n: 0.15, C: 80 }},
            { id: 'M0031', name: 'Ti-6Al-4V', family: 'titanium', hardness_bhn: 334, tensile_strength: 895, thermal_conductivity: 7, machinability_rating: 22, density: 4430, cutting_params: { roughing: { speed: { nominal: 40 }, feed: { nominal: 0.08 }}}, taylor_coefficients: { n: 0.12, C: 60 }},

            // Nickel Alloys
            { id: 'M0040', name: 'Inconel 718', family: 'nickel', hardness_bhn: 363, tensile_strength: 1240, thermal_conductivity: 11, machinability_rating: 15, density: 8190, cutting_params: { roughing: { speed: { nominal: 25 }, feed: { nominal: 0.05 }}}, taylor_coefficients: { n: 0.12, C: 40 }},
            { id: 'M0041', name: 'Hastelloy X', family: 'nickel', hardness_bhn: 241, tensile_strength: 785, thermal_conductivity: 9, machinability_rating: 18, density: 8220, cutting_params: { roughing: { speed: { nominal: 20 }, feed: { nominal: 0.05 }}}, taylor_coefficients: { n: 0.10, C: 35 }},

            // Cast Iron
            { id: 'M0050', name: 'Gray Cast Iron', family: 'cast_iron', hardness_bhn: 200, tensile_strength: 250, thermal_conductivity: 46, machinability_rating: 65, density: 7200, cutting_params: { roughing: { speed: { nominal: 100 }, feed: { nominal: 0.25 }}}, taylor_coefficients: { n: 0.28, C: 180 }},
            { id: 'M0051', name: 'Ductile Iron', family: 'cast_iron', hardness_bhn: 170, tensile_strength: 415, thermal_conductivity: 36, machinability_rating: 60, density: 7100, cutting_params: { roughing: { speed: { nominal: 90 }, feed: { nominal: 0.2 }}}, taylor_coefficients: { n: 0.25, C: 170 }},

            // Copper Alloys
            { id: 'M0060', name: 'Brass 360', family: 'copper', hardness_bhn: 78, tensile_strength: 385, thermal_conductivity: 115, machinability_rating: 100, density: 8500, cutting_params: { roughing: { speed: { nominal: 250 }, feed: { nominal: 0.2 }}}, taylor_coefficients: { n: 0.40, C: 500 }},
            { id: 'M0061', name: 'Bronze C932', family: 'copper', hardness_bhn: 65, tensile_strength: 240, thermal_conductivity: 59, machinability_rating: 80, density: 8800, cutting_params: { roughing: { speed: { nominal: 200 }, feed: { nominal: 0.18 }}}, taylor_coefficients: { n: 0.38, C: 450 }},

            // Plastics
            { id: 'M0070', name: 'Delrin (POM)', family: 'plastic', hardness_bhn: 120, tensile_strength: 70, thermal_conductivity: 0.31, machinability_rating: 95, density: 1410, cutting_params: { roughing: { speed: { nominal: 300 }, feed: { nominal: 0.3 }}}, taylor_coefficients: { n: 0.50, C: 1000 }},
            { id: 'M0071', name: 'PEEK', family: 'plastic', hardness_bhn: 126, tensile_strength: 100, thermal_conductivity: 0.25, machinability_rating: 85, density: 1320, cutting_params: { roughing: { speed: { nominal: 250 }, feed: { nominal: 0.25 }}}, taylor_coefficients: { n: 0.45, C: 900 }},
            { id: 'M0072', name: 'Nylon 6/6', family: 'plastic', hardness_bhn: 121, tensile_strength: 85, thermal_conductivity: 0.25, machinability_rating: 90, density: 1140, cutting_params: { roughing: { speed: { nominal: 280 }, feed: { nominal: 0.28 }}}, taylor_coefficients: { n: 0.48, C: 950 }}
        ];
    },
    _encodeMaterialFamily: function(family) {
        const families = {
            'aluminum': 0.1,
            'steel': 0.3,
            'stainless': 0.4,
            'titanium': 0.6,
            'nickel': 0.7,
            'cast_iron': 0.5,
            'copper': 0.2,
            'plastic': 0.05
        };
        for (const [key, val] of Object.entries(families)) {
            if (family?.toLowerCase().includes(key)) return val;
        }
        return 0.5; // Default
    },
    /**
     * Generate training data for tool wear prediction
     */
    generateToolWearTrainingData: function() {
        const trainingData = [];
        const materials = this._getMaterials();

        for (const mat of materials) {
            // Generate samples at different cutting conditions
            const speeds = [0.5, 0.75, 1.0, 1.25, 1.5].map(
                m => (mat.cutting_params?.roughing?.speed?.nominal || 100) * m
            );

            for (const speed of speeds) {
                // Calculate theoretical tool life
                const taylorN = mat.taylor_coefficients?.n || 0.25;
                const taylorC = mat.taylor_coefficients?.C || 200;
                const toolLife = Math.pow(taylorC / speed, 1 / taylorN);

                // Create sample
                trainingData.push({
                    input: [
                        speed / 500,                          // Normalized speed
                        (mat.cutting_params?.roughing?.feed?.nominal || 0.1) / 0.5,  // Normalized feed
                        mat.hardness_bhn / 500,               // Normalized hardness
                        mat.thermal_conductivity / 400,       // Normalized conductivity
                        this._encodeMaterialFamily(mat.family),
                        0.5                                   // Mid-range DOC
                    ],
                    output: [
                        Math.min(1, toolLife / 120),          // Normalized tool life (max 120 min)
                        toolLife > 30 ? 0 : toolLife > 15 ? 0.33 : toolLife > 5 ? 0.66 : 1  // Wear severity
                    ],
                    meta: {
                        material: mat.name,
                        speed,
                        toolLife
                    }
                });
            }
        }
        return trainingData;
    },
    /**
     * Generate training data for surface finish prediction
     */
    generateSurfaceFinishTrainingData: function() {
        const trainingData = [];

        // Generate samples across parameter ranges
        const feeds = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3];
        const noseRadii = [0.2, 0.4, 0.8, 1.2, 1.6];
        const speeds = [50, 100, 150, 200, 250, 300];

        for (const f of feeds) {
            for (const r of noseRadii) {
                for (const Vc of speeds) {
                    // Theoretical Ra
                    const Ra_theo = (f * f) / (32 * r) * 1000;

                    // Speed correction
                    let K_speed = 1.0;
                    if (Vc < 50) K_speed = 1.3;
                    else if (Vc > 200) K_speed = 0.85;
                    else K_speed = 1.15 - 0.0015 * Vc;

                    const Ra_actual = Ra_theo * K_speed;

                    trainingData.push({
                        input: [
                            f / 0.5,          // Normalized feed
                            r / 2.0,          // Normalized nose radius
                            Vc / 400,         // Normalized speed
                            0.5,              // Material factor (average)
                            0.5               // Tool condition (average)
                        ],
                        output: [
                            Math.min(1, Ra_actual / 10)  // Normalized Ra (max 10 µm)
                        ],
                        meta: {
                            feed: f,
                            noseRadius: r,
                            speed: Vc,
                            Ra: Ra_actual
                        }
                    });
                }
            }
        }
        return trainingData;
    }
}