const PRISM_AI_100_DATA_COLLECTOR = {

    version: '1.0.0',
    collectedData: null,

    // Collect from ALL databases
    collectAll: function() {
        console.log('[AI 100%] Collecting from ALL 56 databases...');
        const collected = {
            materials: [],
            tools: [],
            machines: [],
            processes: [],
            costs: [],
            quality: [],
            toolpaths: [],
            metadata: { timestamp: Date.now(), version: this.version }
        };
        let successCount = 0;
        let failCount = 0;

        for (const [dbName, config] of Object.entries(PRISM_AI_100_DATABASE_REGISTRY.databases)) {
            try {
                const db = window[dbName];
                if (db) {
                    const data = this._extractFromDatabase(db, dbName, config);
                    const category = this._getCategory(config.type);
                    if (collected[category]) {
                        collected[category].push(...data);
                    }
                    successCount++;
                }
            } catch (e) {
                failCount++;
            }
        }
        console.log(`[AI 100%] Collected from ${successCount}/${successCount + failCount} databases`);
        this.collectedData = collected;
        return collected;
    },
    _extractFromDatabase: function(db, dbName, config) {
        const samples = [];

        // Try different data access patterns
        const dataArrays = [
            db.materials, db.data, db.entries, db.items, db.records,
            db.tools, db.machines, db.processes, db.strategies, db.operations,
            db.holders, db.fixtures, db.posts, db.costs, db.controllers
        ].filter(arr => Array.isArray(arr));

        for (const arr of dataArrays) {
            for (const item of arr.slice(0, 100)) { // Limit per source
                samples.push({
                    source: dbName,
                    type: config.type,
                    features: this._extractFeatures(item, config),
                    targets: config.trainingTargets,
                    raw: item
                });
            }
        }
        // If no arrays found, try object iteration
        if (samples.length === 0 && typeof db === 'object') {
            for (const [key, value] of Object.entries(db)) {
                if (typeof value === 'object' && value !== null && !Array.isArray(value) && !key.startsWith('_')) {
                    samples.push({
                        source: dbName,
                        type: config.type,
                        id: key,
                        features: this._extractFeatures(value, config),
                        targets: config.trainingTargets,
                        raw: value
                    });
                }
            }
        }
        return samples;
    },
    _extractFeatures: function(item, config) {
        if (!item || typeof item !== 'object') return {};

        const features = {};
        const numericProps = [
            'hardness', 'hardness_bhn', 'HB', 'tensile_strength', 'UTS', 'strength',
            'thermal_conductivity', 'k', 'machinability_rating', 'machinability',
            'density', 'specific_heat', 'Cp', 'elastic_modulus', 'E', 'youngs_modulus',
            'diameter', 'd', 'length', 'L', 'flutes', 'z', 'helix', 'helix_angle',
            'speed', 'Vc', 'feed', 'f', 'doc', 'ap', 'woc', 'ae',
            'max_rpm', 'maxRPM', 'max_power', 'power', 'torque', 'accuracy',
            'Ra', 'Rz', 'Rt', 'roughness', 'tolerance',
            'cost', 'rate', 'price', 'time', 'cycle_time', 'setup_time',
            'n', 'C', 'taylor_n', 'taylor_C'
        ];

        for (const prop of numericProps) {
            if (item[prop] !== undefined && typeof item[prop] === 'number') {
                features[prop] = item[prop];
            }
        }
        // Extract nested properties
        if (item.cutting_params) {
            if (item.cutting_params.roughing) {
                features.roughing_speed = item.cutting_params.roughing.speed?.nominal || item.cutting_params.roughing.speed;
                features.roughing_feed = item.cutting_params.roughing.feed?.nominal || item.cutting_params.roughing.feed;
            }
        }
        if (item.taylor_coefficients) {
            features.taylor_n = item.taylor_coefficients.n;
            features.taylor_C = item.taylor_coefficients.C;
        }
        if (item.johnson_cook || item.JC) {
            const jc = item.johnson_cook || item.JC;
            features.jc_A = jc.A;
            features.jc_B = jc.B;
            features.jc_n = jc.n;
            features.jc_C = jc.C;
            features.jc_m = jc.m;
        }
        return features;
    },
    _getCategory: function(type) {
        const categoryMap = {
            'materials': 'materials',
            'toollife': 'materials',
            'tooling': 'tools',
            'toolholding': 'tools',
            'cutting': 'tools',
            'machines': 'machines',
            'gcode': 'machines',
            'mcode': 'machines',
            'process': 'processes',
            'operations': 'processes',
            'threading': 'processes',
            'safety': 'processes',
            'automation': 'processes',
            'toolpath': 'toolpaths',
            'costing': 'costs',
            'jobs': 'costs',
            'reporting': 'costs',
            'capabilities': 'costs',
            'quality': 'quality',
            'workholding': 'tools',
            'fixtures': 'tools',
            'setup': 'processes',
            'post': 'machines',
            'cadcam': 'processes',
            'parts': 'processes',
            'ml': 'processes',
            'inventory': 'costs'
        };
        return categoryMap[type] || 'processes';
    },
    // Generate neural network training samples
    generateTrainingSamples: function() {
        if (!this.collectedData) this.collectAll();

        const samples = {
            speedFeed: [],
            toolLife: [],
            surfaceFinish: [],
            cuttingForce: [],
            cycleTime: [],
            cost: [],
            chatter: []
        };
        // Generate speed/feed samples from materials
        for (const mat of this.collectedData.materials) {
            if (mat.features.hardness && mat.features.roughing_speed) {
                samples.speedFeed.push({
                    input: [
                        (mat.features.hardness || 200) / 500,
                        (mat.features.tensile_strength || mat.features.UTS || 500) / 2000,
                        (mat.features.thermal_conductivity || mat.features.k || 50) / 400,
                        (mat.features.machinability || mat.features.machinability_rating || 50) / 100
                    ],
                    output: [
                        (mat.features.roughing_speed || 100) / 400,
                        (mat.features.roughing_feed || 0.1) / 0.5
                    ],
                    meta: { source: mat.source, type: 'material' }
                });
            }
            // Tool life samples
            if (mat.features.taylor_n && mat.features.taylor_C) {
                for (let speedMult = 0.5; speedMult <= 1.5; speedMult += 0.25) {
                    const baseSpeed = mat.features.roughing_speed || 100;
                    const speed = baseSpeed * speedMult;
                    const toolLife = Math.pow(mat.features.taylor_C / speed, 1 / mat.features.taylor_n);

                    samples.toolLife.push({
                        input: [
                            speed / 400,
                            (mat.features.hardness || 200) / 500,
                            mat.features.taylor_n,
                            mat.features.taylor_C / 700
                        ],
                        output: [Math.min(toolLife / 120, 1)],
                        meta: { source: mat.source, speed, toolLife }
                    });
                }
            }
        }
        // Generate cutting force samples from Johnson-Cook data
        for (const mat of this.collectedData.materials) {
            if (mat.features.jc_A && mat.features.jc_B) {
                for (let i = 0; i < 20; i++) {
                    const strain = 0.1 + Math.random() * 0.9;
                    const strainRate = 1000 + Math.random() * 9000;
                    const temp = 300 + Math.random() * 700;

                    // Johnson-Cook flow stress
                    const { jc_A, jc_B, jc_n, jc_C, jc_m } = mat.features;
                    const T_melt = 1500;
                    const T_room = 300;
                    const T_star = (temp - T_room) / (T_melt - T_room);

                    const sigma = (jc_A + jc_B * Math.pow(strain, jc_n)) *
                                 (1 + jc_C * Math.log(strainRate / 1)) *
                                 (1 - Math.pow(T_star, jc_m));

                    samples.cuttingForce.push({
                        input: [strain, strainRate / 10000, temp / 1000, jc_A / 1000, jc_B / 1000],
                        output: [sigma / 2000],
                        meta: { source: mat.source, strain, strainRate, temp, sigma }
                    });
                }
            }
        }
        // Generate surface finish samples
        for (let i = 0; i < 500; i++) {
            const feed = 0.05 + Math.random() * 0.35;
            const noseRadius = 0.2 + Math.random() * 1.6;
            const speed = 50 + Math.random() * 350;
            const toolWear = Math.random() * 0.3;

            const Ra_theo = (feed * feed) / (32 * noseRadius) * 1000;
            const K_speed = speed < 50 ? 1.3 : speed > 200 ? 0.85 : 1.15 - 0.0015 * speed;
            const K_wear = 1 + toolWear * 2;
            const Ra = Ra_theo * K_speed * K_wear;

            samples.surfaceFinish.push({
                input: [feed / 0.5, noseRadius / 2, speed / 400, toolWear],
                output: [Math.min(Ra / 10, 1)],
                meta: { feed, noseRadius, speed, toolWear, Ra }
            });
        }
        // Generate chatter/stability samples
        for (let i = 0; i < 300; i++) {
            const spindle = 2000 + Math.random() * 18000;
            const doc = 0.5 + Math.random() * 5;
            const Kc = 1000 + Math.random() * 3000;
            const damping = 0.01 + Math.random() * 0.05;
            const naturalFreq = 500 + Math.random() * 2000;

            const doc_limit = (2 * damping * 2 * Math.PI * naturalFreq * 1e6) / (Kc * 4);
            const stable = doc < doc_limit ? 1 : 0;

            samples.chatter.push({
                input: [spindle / 20000, doc / 6, Kc / 4000, damping / 0.06, naturalFreq / 2500],
                output: [stable, Math.min(doc_limit / 10, 1)],
                meta: { spindle, doc, Kc, damping, naturalFreq, doc_limit, stable }
            });
        }
        return samples;
    },
    // Get statistics
    getStatistics: function() {
        if (!this.collectedData) this.collectAll();

        const stats = {
            totalSamples: 0,
            byCategory: {}
        };
        for (const [category, samples] of Object.entries(this.collectedData)) {
            if (Array.isArray(samples)) {
                stats.byCategory[category] = samples.length;
                stats.totalSamples += samples.length;
            }
        }
        return stats;
    }
}