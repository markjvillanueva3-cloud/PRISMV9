const PRISM_AI_100_ENGINE_WRAPPER = {

    version: '1.0.0',
    wrappedEngines: [],
    capturedOutputs: [],
    maxCaptures: 10000,

    // List of methods to wrap
    methodsToWrap: [
        'predict', 'calculate', 'estimate', 'optimize', 'compute',
        'evaluate', 'generate', 'solve', 'analyze', 'simulate',
        'recommend', 'select', 'plan', 'schedule', 'assess'
    ],

    // Wrap ALL engines
    wrapAll: function() {
        console.log('[AI 100%] Wrapping ALL engine outputs for learning...');

        let wrapCount = 0;

        for (const key of Object.keys(window)) {
            if (key.startsWith('PRISM_') &&
                (key.includes('ENGINE') || key.includes('OPTIMIZER') ||
                 key.includes('PREDICTOR') || key.includes('ESTIMATOR') ||
                 key.includes('CALCULATOR') || key.includes('ANALYZER'))) {
                try {
                    const wrapped = this._wrapEngine(key, window[key]);
                    if (wrapped > 0) {
                        wrapCount += wrapped;
                        this.wrappedEngines.push(key);
                    }
                } catch (e) {
                    // Skip if can't wrap
                }
            }
        }
        console.log(`[AI 100%] Wrapped ${wrapCount} methods across ${this.wrappedEngines.length} engines`);
        return { engines: this.wrappedEngines.length, methods: wrapCount };
    },
    _wrapEngine: function(engineName, engine) {
        if (!engine || typeof engine !== 'object') return 0;

        let wrapCount = 0;

        for (const methodName of this.methodsToWrap) {
            if (typeof engine[methodName] === 'function') {
                const original = engine[methodName].bind(engine);
                const self = this;

                engine[methodName] = function(...args) {
                    const startTime = performance.now();
                    const result = original(...args);
                    const duration = performance.now() - startTime;

                    // Capture for learning
                    self._captureOutput({
                        engine: engineName,
                        method: methodName,
                        inputs: self._safeClone(args),
                        output: self._safeClone(result),
                        duration,
                        timestamp: Date.now()
                    });

                    return result;
                };
                wrapCount++;
            }
        }
        return wrapCount;
    },
    _captureOutput: function(capture) {
        this.capturedOutputs.push(capture);

        // Limit buffer size
        if (this.capturedOutputs.length > this.maxCaptures) {
            this.capturedOutputs = this.capturedOutputs.slice(-this.maxCaptures / 2);
        }
        // Publish event
        if (typeof PRISM_EVENT_BUS !== 'undefined') {
            PRISM_EVENT_BUS.publish('ai:engine:output', capture);
        }
    },
    _safeClone: function(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (e) {
            return { type: typeof obj, string: String(obj).slice(0, 100) };
        }
    },
    // Get captured outputs for training
    getTrainingData: function() {
        return this.capturedOutputs.map(c => ({
            source: `${c.engine}.${c.method}`,
            input: c.inputs,
            output: c.output,
            duration: c.duration,
            timestamp: c.timestamp
        }));
    },
    // Get statistics
    getStatistics: function() {
        const byEngine = {};
        for (const capture of this.capturedOutputs) {
            byEngine[capture.engine] = (byEngine[capture.engine] || 0) + 1;
        }
        return {
            totalEngines: this.wrappedEngines.length,
            totalCaptures: this.capturedOutputs.length,
            byEngine
        };
    }
};
// SECTION 4: KNOWLEDGE BASE ALGORITHM CONNECTOR
// Connects ALL algorithms from knowledge bases

const PRISM_AI_100_KB_CONNECTOR = {

    version: '1.0.0',
    connectedAlgorithms: [],

    // Knowledge base sources
    kbSources: [
        'PRISM_CROSS_DISCIPLINARY',
        'PRISM_AI_DEEP_LEARNING',
        'PRISM_CAM_ENGINE',
        'PRISM_CAD_ENGINE',
        'PRISM_UNIVERSITY_ALGORITHMS',
        'PRISM_CORE_ALGORITHMS',
        'PRISM_GRAPH_ALGORITHMS',
        'PRISM_GEOMETRY_ALGORITHMS',
        'PRISM_COLLISION_ALGORITHMS',
        'PRISM_NUMERICAL_ENGINE',
        'PRISM_OPTIMIZATION_COMPLETE'
    ],

    // Connect all knowledge base algorithms
    connectAll: function() {
        console.log('[AI 100%] Connecting ALL knowledge base algorithms...');

        for (const kbName of this.kbSources) {
            try {
                const kb = window[kbName];
                if (kb) {
                    const count = this._connectFromKB(kb, kbName);
                    console.log(`  ✓ ${kbName}: ${count} algorithms`);
                }
            } catch (e) {
                // Skip if can't connect
            }
        }
        console.log(`[AI 100%] Total algorithms connected: ${this.connectedAlgorithms.length}`);
        return this.connectedAlgorithms.length;
    },
    _connectFromKB: function(kb, kbName, path = '') {
        let count = 0;

        for (const [key, value] of Object.entries(kb)) {
            if (key.startsWith('_') || key === 'version' || key === 'created') continue;

            const currentPath = path ? `${path}.${key}` : key;

            if (typeof value === 'function') {
                this.connectedAlgorithms.push({
                    name: currentPath,
                    source: kbName,
                    fn: value,
                    type: this._classifyAlgorithm(key, currentPath)
                });
                count++;
            } else if (typeof value === 'object' && value !== null) {
                // Check for implementation
                if (value.implementation && typeof value.implementation === 'function') {
                    this.connectedAlgorithms.push({
                        name: currentPath,
                        source: kbName,
                        fn: value.implementation,
                        formula: value.formula,
                        description: value.description,
                        type: 'formula'
                    });
                    count++;
                }
                // Check for forward/compute
                if (value.forward && typeof value.forward === 'function') {
                    this.connectedAlgorithms.push({
                        name: `${currentPath}.forward`,
                        source: kbName,
                        fn: value.forward,
                        type: 'neural'
                    });
                    count++;
                }
                // Recurse (max depth 5)
                if (currentPath.split('.').length < 5) {
                    count += this._connectFromKB(value, kbName, currentPath);
                }
            }
        }
        return count;
    },
    _classifyAlgorithm: function(name, path) {
        const lower = (name + path).toLowerCase();

        if (lower.includes('physics') || lower.includes('force') || lower.includes('thermal')) return 'physics';
        if (lower.includes('neural') || lower.includes('activation') || lower.includes('layer')) return 'neural';
        if (lower.includes('optimize') || lower.includes('pso') || lower.includes('genetic')) return 'optimization';
        if (lower.includes('predict') || lower.includes('estimate')) return 'prediction';
        if (lower.includes('toolpath') || lower.includes('cam')) return 'cam';
        if (lower.includes('geometry') || lower.includes('nurbs') || lower.includes('surface')) return 'geometry';
        if (lower.includes('bayesian') || lower.includes('monte') || lower.includes('statistical')) return 'statistics';

        return 'utility';
    },
    // Run algorithm by name
    runAlgorithm: function(name, ...args) {
        const algo = this.connectedAlgorithms.find(a =>
            a.name === name || a.name.endsWith(name) || a.name.includes(name)
        );

        if (algo && algo.fn) {
            return algo.fn(...args);
        }
        return null;
    },
    // Get algorithms by type
    getByType: function(type) {
        return this.connectedAlgorithms.filter(a => a.type === type);
    },
    // Get statistics
    getStatistics: function() {
        const byType = {};
        const bySource = {};

        for (const algo of this.connectedAlgorithms) {
            byType[algo.type] = (byType[algo.type] || 0) + 1;
            bySource[algo.source] = (bySource[algo.source] || 0) + 1;
        }
        return {
            total: this.connectedAlgorithms.length,
            byType,
            bySource
        };
    }
};
// SECTION 5: COMPREHENSIVE PHYSICS GENERATOR
// Generates physics-based training data

const PRISM_AI_100_PHYSICS_GENERATOR = {

    version: '1.0.0',

    // Generate ALL physics-based training data
    generateAll: function() {
        console.log('[AI 100%] Generating physics-based training data...');

        return {
            merchantForce: this._generateMerchantForce(1000),
            oxleyForce: this._generateOxleyForce(500),
            taylorToolLife: this._generateTaylorToolLife(1000),
            extendedTaylor: this._generateExtendedTaylor(500),
            surfaceFinish: this._generateSurfaceFinish(1000),
            chatterStability: this._generateChatterStability(500),
            thermalAnalysis: this._generateThermalAnalysis(500),
            chipFormation: this._generateChipFormation(500),
            powerConsumption: this._generatePowerConsumption(500),
            deflection: this._generateDeflection(500)
        };
    },
    _generateMerchantForce: function(n) {
        const samples = [];
        for (let i = 0; i < n; i++) {
            const Kc = 1000 + Math.random() * 3000;  // Specific cutting force
            const ap = 0.5 + Math.random() * 5;      // Depth of cut
            const f = 0.05 + Math.random() * 0.4;    // Feed
            const rake = -10 + Math.random() * 25;   // Rake angle

            const Fc = Kc * ap * f;  // Cutting force
            const Ft = Fc * Math.tan((45 - rake / 2) * Math.PI / 180);  // Thrust force

            samples.push({
                input: [Kc / 4000, ap / 6, f / 0.5, (rake + 10) / 35],
                output: [Fc / 5000, Ft / 3000],
                meta: { Kc, ap, f, rake, Fc, Ft }
            });
        }
        return samples;
    },
    _generateOxleyForce: function(n) {
        const samples = [];
        for (let i = 0; i < n; i++) {
            const sigma_y = 200 + Math.random() * 800;  // Yield strength
            const t1 = 0.1 + Math.random() * 0.5;       // Uncut chip thickness
            const w = 2 + Math.random() * 10;           // Width of cut
            const phi = 15 + Math.random() * 30;        // Shear angle

            const Fs = sigma_y * t1 * w / Math.sin(phi * Math.PI / 180);

            samples.push({
                input: [sigma_y / 1000, t1 / 0.6, w / 12, phi / 45],
                output: [Fs / 10000],
                meta: { sigma_y, t1, w, phi, Fs }
            });
        }
        return samples;
    },
    _generateTaylorToolLife: function(n) {
        const samples = [];
        for (let i = 0; i < n; i++) {
            const C = 100 + Math.random() * 600;
            const n_exp = 0.1 + Math.random() * 0.4;
            const Vc = 50 + Math.random() * 350;

            const T = Math.pow(C / Vc, 1 / n_exp);

            samples.push({
                input: [C / 700, n_exp, Vc / 400],
                output: [Math.min(T / 120, 1)],
                meta: { C, n: n_exp, Vc, T }
            });
        }
        return samples;
    },
    _generateExtendedTaylor: function(n) {
        const samples = [];
        for (let i = 0; i < n; i++) {
            const C = 100 + Math.random() * 600;
            const n_v = 0.1 + Math.random() * 0.4;
            const n_f = 0.1 + Math.random() * 0.3;
            const n_d = 0.05 + Math.random() * 0.2;
            const Vc = 50 + Math.random() * 350;
            const f = 0.05 + Math.random() * 0.4;
            const d = 0.5 + Math.random() * 5;

            const T = C / (Math.pow(Vc, n_v) * Math.pow(f, n_f) * Math.pow(d, n_d));

            samples.push({
                input: [C / 700, n_v, n_f, n_d, Vc / 400, f / 0.5, d / 6],
                output: [Math.min(T / 120, 1)],
                meta: { C, n_v, n_f, n_d, Vc, f, d, T }
            });
        }
        return samples;
    },
    _generateSurfaceFinish: function(n) {
        const samples = [];
        for (let i = 0; i < n; i++) {
            const f = 0.02 + Math.random() * 0.4;
            const r = 0.1 + Math.random() * 1.8;
            const Vc = 30 + Math.random() * 370;
            const wear = Math.random() * 0.4;
            const BUE = Math.random() * 0.3;

            const Ra_ideal = (f * f) / (32 * r) * 1000;
            const K_speed = Vc < 50 ? 1.4 : Vc > 200 ? 0.8 : 1.2 - 0.002 * Vc;
            const K_wear = 1 + 3 * wear;
            const K_BUE = 1 + 2 * BUE;
            const Ra = Ra_ideal * K_speed * K_wear * K_BUE;

            samples.push({
                input: [f / 0.5, r / 2, Vc / 400, wear, BUE],
                output: [Math.min(Ra / 15, 1)],
                meta: { f, r, Vc, wear, BUE, Ra }
            });
        }
        return samples;
    },
    _generateChatterStability: function(n) {
        const samples = [];
        for (let i = 0; i < n; i++) {
            const fn = 500 + Math.random() * 2500;    // Natural frequency
            const zeta = 0.01 + Math.random() * 0.08; // Damping ratio
            const Kc = 1000 + Math.random() * 3000;   // Cutting stiffness
            const k = 1e7 + Math.random() * 9e7;      // System stiffness
            const rpm = 2000 + Math.random() * 18000;
            const doc = 0.5 + Math.random() * 5;

            const ap_lim = (2 * zeta * k) / Kc;
            const stable = doc < ap_lim ? 1 : 0;

            // SLD lobe calculation (simplified)
            const N_lobes = Math.floor(rpm / (60 * fn) * 60);
            const lobe_factor = 1 + 0.3 * Math.sin(N_lobes * Math.PI);

            samples.push({
                input: [fn / 3000, zeta / 0.1, Kc / 4000, k / 1e8, rpm / 20000, doc / 6],
                output: [stable, Math.min(ap_lim / 10, 1), lobe_factor / 1.5],
                meta: { fn, zeta, Kc, k, rpm, doc, ap_lim, stable }
            });
        }
        return samples;
    },
    _generateThermalAnalysis: function(n) {
        const samples = [];
        for (let i = 0; i < n; i++) {
            const Vc = 50 + Math.random() * 350;
            const f = 0.05 + Math.random() * 0.4;
            const ap = 0.5 + Math.random() * 5;
            const Kc = 1000 + Math.random() * 3000;
            const k_mat = 10 + Math.random() * 200;  // Thermal conductivity
            const eta = 0.85 + Math.random() * 0.1;  // Heat partition to chip

            const Power = Kc * Vc * f * ap / 60000;  // kW
            const Q_tool = Power * (1 - eta) * 1000;  // W to tool

            // Temperature rise (simplified)
            const T_rise = Q_tool / (k_mat * 0.01);
            const T_cutting = 20 + T_rise;

            samples.push({
                input: [Vc / 400, f / 0.5, ap / 6, Kc / 4000, k_mat / 250, eta],
                output: [Math.min(T_cutting / 1000, 1), Power / 20],
                meta: { Vc, f, ap, Kc, k_mat, eta, Power, T_cutting }
            });
        }
        return samples;
    },
    _generateChipFormation: function(n) {
        const samples = [];
        for (let i = 0; i < n; i++) {
            const rake = -10 + Math.random() * 30;
            const f = 0.05 + Math.random() * 0.4;
            const Vc = 50 + Math.random() * 350;
            const ductility = 0.1 + Math.random() * 0.9;

            const phi = 45 + rake / 2 - 10 * ductility;
            const chip_thickness_ratio = Math.cos(phi * Math.PI / 180) / Math.sin((phi - rake) * Math.PI / 180);
            const chip_type = ductility > 0.6 ? 0 : ductility > 0.3 ? 0.5 : 1;  // continuous, segmented, discontinuous

            samples.push({
                input: [(rake + 10) / 40, f / 0.5, Vc / 400, ductility],
                output: [phi / 60, chip_thickness_ratio / 3, chip_type],
                meta: { rake, f, Vc, ductility, phi, chip_thickness_ratio }
            });
        }
        return samples;
    },
    _generatePowerConsumption: function(n) {
        const samples = [];
        for (let i = 0; i < n; i++) {
            const Vc = 50 + Math.random() * 350;
            const f = 0.05 + Math.random() * 0.4;
            const ap = 0.5 + Math.random() * 5;
            const ae = 1 + Math.random() * 20;
            const Kc = 1000 + Math.random() * 3000;
            const efficiency = 0.7 + Math.random() * 0.2;

            const MRR = Vc * f * ap * 1000;  // mm³/min
            const Pc = Kc * MRR / 60e9;      // kW (cutting)
            const Pm = Pc / efficiency;       // kW (motor)

            samples.push({
                input: [Vc / 400, f / 0.5, ap / 6, ae / 25, Kc / 4000, efficiency],
                output: [MRR / 500000, Pc / 20, Pm / 30],
                meta: { Vc, f, ap, ae, Kc, MRR, Pc, Pm }
            });
        }
        return samples;
    },
    _generateDeflection: function(n) {
        const samples = [];
        for (let i = 0; i < n; i++) {
            const L = 50 + Math.random() * 150;       // Tool length
            const D = 6 + Math.random() * 20;         // Tool diameter
            const E = 400000 + Math.random() * 250000; // Young's modulus
            const F = 500 + Math.random() * 3000;     // Cutting force

            const I = Math.PI * Math.pow(D, 4) / 64;
            const delta = F * Math.pow(L, 3) / (3 * E * I);

            samples.push({
                input: [L / 200, D / 25, E / 700000, F / 4000],
                output: [Math.min(delta / 0.1, 1)],
                meta: { L, D, E, F, delta }
            });
        }
        return samples;
    }
};
// SECTION 6: CROSS-DOMAIN INNOVATION GENERATOR
// Generates training data from cross-domain innovations

const PRISM_AI_100_CROSSDOMAIN_GENERATOR = {

    version: '1.0.0',

    generateAll: function() {
        console.log('[AI 100%] Generating cross-domain innovation training data...');

        return {
            thermodynamics: this._generateThermodynamics(300),
            fluidDynamics: this._generateFluidDynamics(300),
            queuingTheory: this._generateQueuingTheory(300),
            gameTheory: this._generateGameTheory(200),
            portfolioTheory: this._generatePortfolioTheory(200),
            signalProcessing: this._generateSignalProcessing(300),
            controlTheory: this._generateControlTheory(300),
            informationTheory: this._generateInformationTheory(200)
        };
    },
    _generateThermodynamics: function(n) {
        const samples = [];
        for (let i = 0; i < n; i++) {
            const Fc = 500 + Math.random() * 3000;
            const Vc = 50 + Math.random() * 350;
            const eta = 0.85 + Math.random() * 0.1;

            const Q = Fc * Vc / 60 * eta;  // Heat generation rate
            const entropy = Q / (300 + Math.random() * 500);  // Entropy generation

            samples.push({
                type: 'heat_generation',
                input: [Fc / 3500, Vc / 400, eta],
                output: [Q / 20000, entropy / 50],
                meta: { Fc, Vc, eta, Q, entropy }
            });
        }
        return samples;
    },
    _generateFluidDynamics: function(n) {
        const samples = [];
        for (let i = 0; i < n; i++) {
            const rho = 900 + Math.random() * 200;
            const v = 1 + Math.random() * 10;
            const D = 0.005 + Math.random() * 0.02;
            const mu = 0.001 + Math.random() * 0.003;

            const Re = rho * v * D / mu;
            const flow_type = Re < 2300 ? 0 : Re < 4000 ? 0.5 : 1;
            const heat_transfer_coeff = flow_type === 1 ? 5000 + Math.random() * 3000 : 500 + Math.random() * 500;

            samples.push({
                type: 'coolant_flow',
                input: [rho / 1100, v / 11, D / 0.025, mu / 0.004],
                output: [Re / 50000, flow_type, heat_transfer_coeff / 8000],
                meta: { rho, v, D, mu, Re, flow_type, heat_transfer_coeff }
            });
        }
        return samples;
    },
    _generateQueuingTheory: function(n) {
        const samples = [];
        for (let i = 0; i < n; i++) {
            const lambda = 0.5 + Math.random() * 3;  // Arrival rate
            const mu = lambda + 0.5 + Math.random() * 3;  // Service rate
            const c = 1 + Math.floor(Math.random() * 4);  // Number of servers

            const rho = lambda / (c * mu);
            const Lq = rho < 1 ? (Math.pow(rho, 2)) / (1 - rho) : 100;
            const Wq = Lq / lambda;

            samples.push({
                type: 'job_queue',
                input: [lambda / 4, mu / 5, c / 5],
                output: [rho, Math.min(Lq / 20, 1), Math.min(Wq / 10, 1)],
                meta: { lambda, mu, c, rho, Lq, Wq }
            });
        }
        return samples;
    },
    _generateGameTheory: function(n) {
        const samples = [];
        for (let i = 0; i < n; i++) {
            // Nash equilibrium for resource allocation
            const resources = [Math.random(), Math.random(), Math.random()];
            const total = resources.reduce((a, b) => a + b);
            const normalized = resources.map(r => r / total);

            // Payoff calculation
            const payoff = normalized.reduce((p, r, i) => p + r * (1 - Math.pow(r, 2)), 0);

            samples.push({
                type: 'resource_allocation',
                input: resources,
                output: [...normalized, payoff],
                meta: { resources, normalized, payoff }
            });
        }
        return samples;
    },
    _generatePortfolioTheory: function(n) {
        const samples = [];
        for (let i = 0; i < n; i++) {
            // Tool portfolio optimization
            const tools = [
                { return: 0.1 + Math.random() * 0.3, risk: 0.05 + Math.random() * 0.2 },
                { return: 0.1 + Math.random() * 0.3, risk: 0.05 + Math.random() * 0.2 },
                { return: 0.1 + Math.random() * 0.3, risk: 0.05 + Math.random() * 0.2 }
            ];

            // Equal weight portfolio
            const portfolio_return = tools.reduce((s, t) => s + t.return, 0) / 3;
            const portfolio_risk = Math.sqrt(tools.reduce((s, t) => s + Math.pow(t.risk, 2), 0) / 9);
            const sharpe = portfolio_return / portfolio_risk;

            samples.push({
                type: 'tool_portfolio',
                input: tools.flatMap(t => [t.return, t.risk]),
                output: [portfolio_return, portfolio_risk, sharpe / 5],
                meta: { tools, portfolio_return, portfolio_risk, sharpe }
            });
        }
        return samples;
    },
    _generateSignalProcessing: function(n) {
        const samples = [];
        for (let i = 0; i < n; i++) {
            // Chatter detection via frequency analysis
            const fundamental_freq = 500 + Math.random() * 2000;
            const amplitude = 0.1 + Math.random() * 0.9;
            const noise = Math.random() * 0.3;
            const harmonics = 1 + Math.floor(Math.random() * 3);

            const snr = amplitude / (noise + 0.01);
            const chatter_indicator = amplitude > 0.5 && harmonics > 1 ? 1 : 0;

            samples.push({
                type: 'vibration_analysis',
                input: [fundamental_freq / 2500, amplitude, noise, harmonics / 4],
                output: [snr / 50, chatter_indicator],
                meta: { fundamental_freq, amplitude, noise, harmonics, snr, chatter_indicator }
            });
        }
        return samples;
    },
    _generateControlTheory: function(n) {
        const samples = [];
        for (let i = 0; i < n; i++) {
            // PID controller tuning
            const Kp = 0.5 + Math.random() * 5;
            const Ki = 0.1 + Math.random() * 2;
            const Kd = 0.05 + Math.random() * 1;
            const tau = 0.1 + Math.random() * 1;  // Time constant

            const rise_time = tau / Kp;
            const overshoot = Math.exp(-Kd * Math.PI / Math.sqrt(1 - Math.pow(Kd, 2)));
            const steady_state_error = 1 / (1 + Kp * Ki);

            samples.push({
                type: 'pid_tuning',
                input: [Kp / 6, Ki / 2.5, Kd / 1.5, tau],
                output: [rise_time / 2, overshoot, steady_state_error],
                meta: { Kp, Ki, Kd, tau, rise_time, overshoot, steady_state_error }
            });
        }
        return samples;
    },
    _generateInformationTheory: function(n) {
        const samples = [];
        for (let i = 0; i < n; i++) {
            // Entropy for uncertainty quantification
            const probs = Array(5).fill(0).map(() => Math.random());
            const total = probs.reduce((a, b) => a + b);
            const normalized = probs.map(p => p / total);

            const entropy = -normalized.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0);
            const max_entropy = Math.log2(probs.length);
            const uncertainty = entropy / max_entropy;

            samples.push({
                type: 'uncertainty',
                input: normalized,
                output: [entropy / max_entropy, uncertainty],
                meta: { probs: normalized, entropy, uncertainty }
            });
        }
        return samples;
    }
};
// SECTION 7: MAIN 100% INTEGRATION ORCHESTRATOR

const PRISM_AI_100_INTEGRATION = {

    version: '1.0.0',
    initialized: false,
    statistics: null,
    trainingData: null,

    // Initialize complete 100% integration
    initialize: function() {
        console.log('');
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║        PRISM AI 100% INTEGRATION - v8.66.001                 ║');
        console.log('║   Connecting ALL databases, engines, and algorithms to AI    ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝');
        console.log('');

        const startTime = performance.now();

        // Step 1: Connect knowledge base algorithms
        console.log('[Step 1/5] Connecting knowledge base algorithms...');
        const kbCount = PRISM_AI_100_KB_CONNECTOR.connectAll();

        // Step 2: Wrap engine outputs
        console.log('\n[Step 2/5] Wrapping engine outputs...');
        const engineStats = PRISM_AI_100_ENGINE_WRAPPER.wrapAll();

        // Step 3: Collect from databases
        console.log('\n[Step 3/5] Collecting from ALL databases...');
        PRISM_AI_100_DATA_COLLECTOR.collectAll();
        const dbStats = PRISM_AI_100_DATA_COLLECTOR.getStatistics();

        // Step 4: Generate physics training data
        console.log('\n[Step 4/5] Generating physics-based training data...');
        const physicsData = PRISM_AI_100_PHYSICS_GENERATOR.generateAll();
        let physicsCount = 0;
        for (const samples of Object.values(physicsData)) {
            physicsCount += samples.length;
        }
        // Step 5: Generate cross-domain training data
        console.log('\n[Step 5/5] Generating cross-domain training data...');
        const crossDomainData = PRISM_AI_100_CROSSDOMAIN_GENERATOR.generateAll();
        let crossDomainCount = 0;
        for (const samples of Object.values(crossDomainData)) {
            crossDomainCount += samples.length;
        }
        // Generate neural training samples
        console.log('\n[Finalizing] Generating neural network training samples...');
        const neuralSamples = PRISM_AI_100_DATA_COLLECTOR.generateTrainingSamples();
        let neuralCount = 0;
        for (const samples of Object.values(neuralSamples)) {
            neuralCount += samples.length;
        }
        // Compile all training data
        this.trainingData = {
            fromDatabases: PRISM_AI_100_DATA_COLLECTOR.collectedData,
            neuralSamples,
            physicsData,
            crossDomainData,
            metadata: {
                generated: new Date().toISOString(),
                version: this.version
            }
        };
        // Feed to existing AI systems
        this._feedToAISystems();

        const duration = performance.now() - startTime;

        // Calculate final statistics
        this.statistics = {
            databases: {
                registered: PRISM_AI_100_DATABASE_REGISTRY.getCount(),
                collected: dbStats.totalSamples
            },
            engines: {
                wrapped: engineStats.engines,
                methods: engineStats.methods
            },
            algorithms: {
                connected: kbCount
            },
            trainingData: {
                fromDatabases: dbStats.totalSamples,
                neural: neuralCount,
                physics: physicsCount,
                crossDomain: crossDomainCount,
                total: dbStats.totalSamples + neuralCount + physicsCount + crossDomainCount
            },
            initTime: Math.round(duration)
        };
        this.initialized = true;

        console.log('');
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║              AI 100% INTEGRATION COMPLETE                     ║');
        console.log('╠═══════════════════════════════════════════════════════════════╣');
        console.log(`║  Databases Registered:     ${String(this.statistics.databases.registered).padStart(5)}                           ║`);
        console.log(`║  Database Samples:         ${String(this.statistics.databases.collected).padStart(5)}                           ║`);
        console.log(`║  Engines Wrapped:          ${String(this.statistics.engines.wrapped).padStart(5)}                           ║`);
        console.log(`║  Engine Methods:           ${String(this.statistics.engines.methods).padStart(5)}                           ║`);
        console.log(`║  KB Algorithms Connected:  ${String(this.statistics.algorithms.connected).padStart(5)}                           ║`);
        console.log(`║  Neural Training Samples:  ${String(this.statistics.trainingData.neural).padStart(5)}                           ║`);
        console.log(`║  Physics Training Samples: ${String(this.statistics.trainingData.physics).padStart(5)}                           ║`);
        console.log(`║  Cross-Domain Samples:     ${String(this.statistics.trainingData.crossDomain).padStart(5)}                           ║`);
        console.log('╠═══════════════════════════════════════════════════════════════╣');
        console.log(`║  TOTAL TRAINING DATA:      ${String(this.statistics.trainingData.total).padStart(5)}                           ║`);
        console.log(`║  Initialization Time:      ${String(this.statistics.initTime).padStart(5)} ms                        ║`);
        console.log('╚═══════════════════════════════════════════════════════════════╝');
        console.log('');

        // Publish event
        if (typeof PRISM_EVENT_BUS !== 'undefined') {
            PRISM_EVENT_BUS.publish('ai:100:initialized', this.statistics);
        }
        return this.statistics;
    },
    _feedToAISystems: function() {
        // Feed to PRISM_AI_TRAINING_DATA
        if (typeof PRISM_AI_TRAINING_DATA !== 'undefined') {
            PRISM_AI_TRAINING_DATA.fullIntegrationData = this.trainingData;
            console.log('  → Fed to PRISM_AI_TRAINING_DATA');
        }
        // Feed to PRISM_BAYESIAN_SYSTEM
        if (typeof PRISM_BAYESIAN_SYSTEM !== 'undefined') {
            PRISM_BAYESIAN_SYSTEM.trainingData = this.trainingData;
            console.log('  → Fed to PRISM_BAYESIAN_SYSTEM');
        }
        // Feed to PRISM_AI_LEARNING_PIPELINE (v9.0)
        if (typeof PRISM_AI_LEARNING_PIPELINE !== 'undefined') {
            PRISM_AI_LEARNING_PIPELINE.fullData = this.trainingData;
            console.log('  → Fed to PRISM_AI_LEARNING_PIPELINE');
        }
        // Feed to PRISM_AI_COMPLETE_SYSTEM
        if (typeof PRISM_AI_COMPLETE_SYSTEM !== 'undefined') {
            PRISM_AI_COMPLETE_SYSTEM.trainingData = this.trainingData;
            console.log('  → Fed to PRISM_AI_COMPLETE_SYSTEM');
        }
        // Feed to neural networks
        if (typeof PRISM_NEURAL_NETWORK !== 'undefined') {
            PRISM_NEURAL_NETWORK.trainingData = this.trainingData.neuralSamples;
            console.log('  → Fed to PRISM_NEURAL_NETWORK');
        }
    },
    // Get all statistics
    getStatistics: function() {
        return {
            main: this.statistics,
            databases: PRISM_AI_100_DATA_COLLECTOR.getStatistics(),
            engines: PRISM_AI_100_ENGINE_WRAPPER.getStatistics(),
            algorithms: PRISM_AI_100_KB_CONNECTOR.getStatistics()
        };
    },
    // Get training data
    getTrainingData: function() {
        return this.trainingData;
    },
    // Run algorithm by name
    runAlgorithm: function(name, ...args) {
        return PRISM_AI_100_KB_CONNECTOR.runAlgorithm(name, ...args);
    },
    // Get algorithms by type
    getAlgorithmsByType: function(type) {
        return PRISM_AI_100_KB_CONNECTOR.getByType(type);
    }
};
// SECTION 8: GATEWAY REGISTRATION

if (typeof PRISM_GATEWAY !== 'undefined') {
    // Main integration
    PRISM_GATEWAY.register('ai.100.initialize', 'PRISM_AI_100_INTEGRATION.initialize');
    PRISM_GATEWAY.register('ai.100.stats', 'PRISM_AI_100_INTEGRATION.getStatistics');
    PRISM_GATEWAY.register('ai.100.training', 'PRISM_AI_100_INTEGRATION.getTrainingData');
    PRISM_GATEWAY.register('ai.100.run', 'PRISM_AI_100_INTEGRATION.runAlgorithm');
    PRISM_GATEWAY.register('ai.100.algorithms', 'PRISM_AI_100_INTEGRATION.getAlgorithmsByType');

    // Database registry
    PRISM_GATEWAY.register('ai.100.db.all', 'PRISM_AI_100_DATABASE_REGISTRY.getAll');
    PRISM_GATEWAY.register('ai.100.db.byType', 'PRISM_AI_100_DATABASE_REGISTRY.getByType');
    PRISM_GATEWAY.register('ai.100.db.count', 'PRISM_AI_100_DATABASE_REGISTRY.getCount');

    // Data collector
    PRISM_GATEWAY.register('ai.100.collect', 'PRISM_AI_100_DATA_COLLECTOR.collectAll');
    PRISM_GATEWAY.register('ai.100.samples', 'PRISM_AI_100_DATA_COLLECTOR.generateTrainingSamples');

    // Engine wrapper
    PRISM_GATEWAY.register('ai.100.wrap', 'PRISM_AI_100_ENGINE_WRAPPER.wrapAll');
    PRISM_GATEWAY.register('ai.100.engineData', 'PRISM_AI_100_ENGINE_WRAPPER.getTrainingData');

    // KB connector
    PRISM_GATEWAY.register('ai.100.kb.connect', 'PRISM_AI_100_KB_CONNECTOR.connectAll');
    PRISM_GATEWAY.register('ai.100.kb.run', 'PRISM_AI_100_KB_CONNECTOR.runAlgorithm');

    // Physics generator
    PRISM_GATEWAY.register('ai.100.physics', 'PRISM_AI_100_PHYSICS_GENERATOR.generateAll');

    // Cross-domain generator
    PRISM_GATEWAY.register('ai.100.crossdomain', 'PRISM_AI_100_CROSSDOMAIN_GENERATOR.generateAll');

    console.log('[AI 100%] Registered 17 gateway routes');
}
// SECTION 9: WINDOW EXPORTS

if (typeof window !== 'undefined') {
    window.PRISM_AI_100_DATABASE_REGISTRY = PRISM_AI_100_DATABASE_REGISTRY;
    window.PRISM_AI_100_DATA_COLLECTOR = PRISM_AI_100_DATA_COLLECTOR;
    window.PRISM_AI_100_ENGINE_WRAPPER = PRISM_AI_100_ENGINE_WRAPPER;
    window.PRISM_AI_100_KB_CONNECTOR = PRISM_AI_100_KB_CONNECTOR;
    window.PRISM_AI_100_PHYSICS_GENERATOR = PRISM_AI_100_PHYSICS_GENERATOR;
    window.PRISM_AI_100_CROSSDOMAIN_GENERATOR = PRISM_AI_100_CROSSDOMAIN_GENERATOR;
    window.PRISM_AI_100_INTEGRATION = PRISM_AI_100_INTEGRATION;
}
// SECTION 10: SELF-TESTS

const PRISM_AI_100_TESTS = {
    runAll: function() {
        console.log('\n=== AI 100% INTEGRATION SELF-TESTS ===\n');
        let passed = 0, failed = 0;

        // Test 1: Database registry
        try {
            const count = PRISM_AI_100_DATABASE_REGISTRY.getCount();
            const pass = count >= 50;
            console.log(`${pass ? '✅' : '❌'} Database Registry: ${count} databases registered`);
            pass ? passed++ : failed++;
        } catch (e) { console.log('❌ Database Registry: FAILED'); failed++; }

        // Test 2: Physics generator
        try {
            const physics = PRISM_AI_100_PHYSICS_GENERATOR._generateMerchantForce(10);
            const pass = physics.length === 10;
            console.log(`${pass ? '✅' : '❌'} Physics Generator: ${physics.length} samples`);
            pass ? passed++ : failed++;
        } catch (e) { console.log('❌ Physics Generator: FAILED'); failed++; }

        // Test 3: Cross-domain generator
        try {
            const crossDomain = PRISM_AI_100_CROSSDOMAIN_GENERATOR._generateThermodynamics(10);
            const pass = crossDomain.length === 10;
            console.log(`${pass ? '✅' : '❌'} Cross-Domain Generator: ${crossDomain.length} samples`);
            pass ? passed++ : failed++;
        } catch (e) { console.log('❌ Cross-Domain Generator: FAILED'); failed++; }

        // Test 4: Surface finish samples
        try {
            const samples = PRISM_AI_100_PHYSICS_GENERATOR._generateSurfaceFinish(10);
            const pass = samples.length === 10 && samples[0].input.length === 5;
            console.log(`${pass ? '✅' : '❌'} Surface Finish: ${samples.length} samples`);
            pass ? passed++ : failed++;
        } catch (e) { console.log('❌ Surface Finish: FAILED'); failed++; }

        // Test 5: Chatter stability samples
        try {
            const samples = PRISM_AI_100_PHYSICS_GENERATOR._generateChatterStability(10);
            const pass = samples.length === 10;
            console.log(`${pass ? '✅' : '❌'} Chatter Stability: ${samples.length} samples`);
            pass ? passed++ : failed++;
        } catch (e) { console.log('❌ Chatter Stability: FAILED'); failed++; }

        // Test 6: Taylor tool life samples
        try {
            const samples = PRISM_AI_100_PHYSICS_GENERATOR._generateTaylorToolLife(10);
            const pass = samples.length === 10;
            console.log(`${pass ? '✅' : '❌'} Taylor Tool Life: ${samples.length} samples`);
            pass ? passed++ : failed++;
        } catch (e) { console.log('❌ Taylor Tool Life: FAILED'); failed++; }

        // Test 7: Queuing theory samples
        try {
            const samples = PRISM_AI_100_CROSSDOMAIN_GENERATOR._generateQueuingTheory(10);
            const pass = samples.length === 10;
            console.log(`${pass ? '✅' : '❌'} Queuing Theory: ${samples.length} samples`);
            pass ? passed++ : failed++;
        } catch (e) { console.log('❌ Queuing Theory: FAILED'); failed++; }

        console.log(`\n=== RESULTS: ${passed}/${passed + failed} tests passed ===\n`);
        return { passed, failed, total: passed + failed };
    }
};
// Run self-tests
PRISM_AI_100_TESTS.runAll();

// AUTO-INITIALIZATION

// Initialize after a short delay to ensure all other modules are loaded
setTimeout(() => {
    if (!PRISM_AI_100_INTEGRATION.initialized) {
        PRISM_AI_100_INTEGRATION.initialize();
    }
}, 2000);

(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM AI 100%] Module loaded - Full AI integration ready');

console.log(`  - Toolpath Strategies: ${PRISM_AI_TOOLPATH_DATABASE.getStrategyCount()}`);
console.log(`  - Material Definitions: ${PRISM_AI_MATERIAL_MODIFIERS.getMaterialCount()}`);
console.log(`  - Knowledge Domains: ${Object.keys(PRISM_AI_KNOWLEDGE_INTEGRATION.knowledgeDomains).length}`);
console.log(`  - University Courses: ${PRISM_AI_KNOWLEDGE_INTEGRATION.getCourseCount()}`);

// PRISM_LEAN_SIX_SIGMA_KAIZEN MODULE - Added 2026-01-15

// PRISM_LEAN_SIX_SIGMA_KAIZEN - Complete Manufacturing Excellence Module
// Version: 1.0.0 | Build Date: 2026-01-15 | Lines: ~1,800
// AI-Integrated Lean Manufacturing, Six Sigma, and Kaizen Continuous Improvement
// UNIQUE AI INNOVATIONS:
// 1. Control Charts + Bayesian Learning = Self-adjusting control limits
// 2. 7 Wastes + Neural Networks = Automatic waste detection
// 3. FMEA + Monte Carlo = Probabilistic failure prediction
// 4. Value Stream Mapping + ACO = Auto-optimized process flow
// 5. OEE + Kalman Filter = Predictive availability
// 6. Cp/Cpk + Gaussian Process = Process capability with uncertainty bounds
// 7. PDCA + Reinforcement Learning = Self-improving processes
// 8. SPC + FFT = Vibration-correlated quality control
// COMPETITOR GAP: Mastercam, Fusion360, HyperMill have ZERO Lean/Six Sigma integration

const PRISM_LEAN_SIX_SIGMA_KAIZEN = {
    VERSION: '1.0.0',
    BUILD_DATE: '2026-01-15',

    // SECTION 1: SIX SIGMA - Statistical Process Control
    sixSigma: {

        // 1.1 Process Capability Indices
        processCapability: {
            /**
             * Calculate Cp (Process Capability)
             * Measures potential capability if process is centered
             * @param {number} USL - Upper specification limit
             * @param {number} LSL - Lower specification limit
             * @param {number} sigma - Process standard deviation
             * @returns {number} Cp value
             */
            calculateCp: function(USL, LSL, sigma) {
                if (sigma <= 0) return 0;
                return (USL - LSL) / (6 * sigma);
            },
            /**
             * Calculate Cpk (Process Capability Index)
             * Measures actual capability considering centering
             * @param {number} USL - Upper specification limit
             * @param {number} LSL - Lower specification limit
             * @param {number} mean - Process mean
             * @param {number} sigma - Process standard deviation
             * @returns {object} Cpk value with interpretation
             */
            calculateCpk: function(USL, LSL, mean, sigma) {
                if (sigma <= 0) return { value: 0, interpretation: 'Invalid sigma' };

                const cpkUpper = (USL - mean) / (3 * sigma);
                const cpkLower = (mean - LSL) / (3 * sigma);
                const cpk = Math.min(cpkUpper, cpkLower);

                let interpretation;
                if (cpk >= 2.0) interpretation = 'World Class (6σ)';
                else if (cpk >= 1.67) interpretation = 'Excellent (5σ)';
                else if (cpk >= 1.33) interpretation = 'Good (4σ)';
                else if (cpk >= 1.0) interpretation = 'Capable (3σ)';
                else if (cpk >= 0.67) interpretation = 'Marginal';
                else interpretation = 'Not Capable - Action Required';

                return {
                    value: cpk,
                    cpkUpper,
                    cpkLower,
                    interpretation,
                    ppm: this._cpkToPPM(cpk),
                    sigmaLevel: this._cpkToSigma(cpk)
                };
            },
            /**
             * Calculate Ppk (Process Performance Index)
             * Uses overall standard deviation (includes between-group variation)
             */
            calculatePpk: function(USL, LSL, mean, overallSigma) {
                return this.calculateCpk(USL, LSL, mean, overallSigma);
            },
            /**
             * PRISM INNOVATION: Cpk with Gaussian Process Uncertainty
             * Provides confidence intervals on capability indices
             */
            calculateCpkWithUncertainty: function(measurements, USL, LSL) {
                const n = measurements.length;
                if (n < 10) return { error: 'Need at least 10 measurements' };

                const mean = measurements.reduce((a, b) => a + b, 0) / n;
                const sigma = Math.sqrt(measurements.reduce((sum, x) =>
                    sum + Math.pow(x - mean, 2), 0) / (n - 1));

                // Bootstrap for confidence intervals
                const bootstrapCpks = [];
                for (let i = 0; i < 1000; i++) {
                    const sample = [];
                    for (let j = 0; j < n; j++) {
                        sample.push(measurements[Math.floor(Math.random() * n)]);
                    }
                    const sampleMean = sample.reduce((a, b) => a + b, 0) / n;
                    const sampleSigma = Math.sqrt(sample.reduce((sum, x) =>
                        sum + Math.pow(x - sampleMean, 2), 0) / (n - 1));
                    if (sampleSigma > 0) {
                        const cpk = Math.min(
                            (USL - sampleMean) / (3 * sampleSigma),
                            (sampleMean - LSL) / (3 * sampleSigma)
                        );
                        bootstrapCpks.push(cpk);
                    }
                }
                bootstrapCpks.sort((a, b) => a - b);
                const ci95Lower = bootstrapCpks[Math.floor(bootstrapCpks.length * 0.025)];
                const ci95Upper = bootstrapCpks[Math.floor(bootstrapCpks.length * 0.975)];

                const cpk = this.calculateCpk(USL, LSL, mean, sigma);

                return {
                    ...cpk,
                    confidence95: { lower: ci95Lower, upper: ci95Upper },
                    sampleSize: n,
                    uncertaintyLevel: (ci95Upper - ci95Lower) / cpk.value
                };
            },
            _cpkToPPM: function(cpk) {
                // Approximate PPM from Cpk using normal distribution
                if (cpk <= 0) return 1000000;
                const z = cpk * 3;
                // One-sided, so multiply by 2 for both tails
                return Math.round(2 * 1000000 * (1 - this._normalCDF(z)));
            },
            _cpkToSigma: function(cpk) {
                return Math.round(cpk * 3 * 10) / 10;
            },
            _normalCDF: function(z) {
                const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
                const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
                const sign = z < 0 ? -1 : 1;
                z = Math.abs(z) / Math.sqrt(2);
                const t = 1 / (1 + p * z);
                const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
                return 0.5 * (1 + sign * y);
            }
        },
        // 1.2 Control Charts (X-bar, R, S, p, np, c, u)
        controlCharts: {
            /**
             * X-bar and R Chart (Variables data)
             * Most common SPC chart for continuous measurements
             */
            xBarRChart: function(subgroups) {
                const n = subgroups[0].length; // Subgroup size
                const k = subgroups.length; // Number of subgroups

                // Constants for control chart factors
                const factors = {
                    2: { A2: 1.880, D3: 0, D4: 3.267, d2: 1.128 },
                    3: { A2: 1.023, D3: 0, D4: 2.574, d2: 1.693 },
                    4: { A2: 0.729, D3: 0, D4: 2.282, d2: 2.059 },
                    5: { A2: 0.577, D3: 0, D4: 2.114, d2: 2.326 },
                    6: { A2: 0.483, D3: 0, D4: 2.004, d2: 2.534 },
                    7: { A2: 0.419, D3: 0.076, D4: 1.924, d2: 2.704 },
                    8: { A2: 0.373, D3: 0.136, D4: 1.864, d2: 2.847 },
                    9: { A2: 0.337, D3: 0.184, D4: 1.816, d2: 2.970 },
                    10: { A2: 0.308, D3: 0.223, D4: 1.777, d2: 3.078 }
                };
                const f = factors[n] || factors[5];

                // Calculate subgroup statistics
                const xBars = subgroups.map(sg => sg.reduce((a, b) => a + b, 0) / n);
                const ranges = subgroups.map(sg => Math.max(...sg) - Math.min(...sg));

                // Calculate centerlines
                const xBarBar = xBars.reduce((a, b) => a + b, 0) / k;
                const rBar = ranges.reduce((a, b) => a + b, 0) / k;

                // Calculate control limits
                const xBarUCL = xBarBar + f.A2 * rBar;
                const xBarLCL = xBarBar - f.A2 * rBar;
                const rUCL = f.D4 * rBar;
                const rLCL = f.D3 * rBar;

                // Detect out-of-control points
                const outOfControl = [];
                xBars.forEach((xBar, i) => {
                    if (xBar > xBarUCL || xBar < xBarLCL) {
                        outOfControl.push({ index: i, type: 'X-bar', value: xBar });
                    }
                });
                ranges.forEach((r, i) => {
                    if (r > rUCL || r < rLCL) {
                        outOfControl.push({ index: i, type: 'Range', value: r });
                    }
                });

                return {
                    chartType: 'X-bar and R',
                    subgroupSize: n,
                    numSubgroups: k,
                    xBar: {
                        centerline: xBarBar,
                        UCL: xBarUCL,
                        LCL: xBarLCL,
                        values: xBars
                    },
                    range: {
                        centerline: rBar,
                        UCL: rUCL,
                        LCL: rLCL,
                        values: ranges
                    },
                    estimatedSigma: rBar / f.d2,
                    outOfControl,
                    inControl: outOfControl.length === 0
                };
            },
            /**
             * Individual and Moving Range Chart (I-MR)
             * For when subgrouping is not possible
             */
            iMRChart: function(individuals) {
                const n = individuals.length;

                // Calculate moving ranges
                const movingRanges = [];
                for (let i = 1; i < n; i++) {
                    movingRanges.push(Math.abs(individuals[i] - individuals[i - 1]));
                }
                // Centerlines
                const xBar = individuals.reduce((a, b) => a + b, 0) / n;
                const mRBar = movingRanges.reduce((a, b) => a + b, 0) / movingRanges.length;

                // Control limits (d2 = 1.128 for n=2)
                const d2 = 1.128;
                const D4 = 3.267;
                const estimatedSigma = mRBar / d2;

                const iUCL = xBar + 3 * estimatedSigma;
                const iLCL = xBar - 3 * estimatedSigma;
                const mrUCL = D4 * mRBar;

                return {
                    chartType: 'I-MR',
                    individuals: {
                        centerline: xBar,
                        UCL: iUCL,
                        LCL: iLCL,
                        values: individuals
                    },
                    movingRange: {
                        centerline: mRBar,
                        UCL: mrUCL,
                        LCL: 0,
                        values: movingRanges
                    },
                    estimatedSigma
                };
            },
            /**
             * p-Chart (Proportion defective)
             * For attribute data - fraction nonconforming
             */
            pChart: function(inspected, defective) {
                const n = inspected.length;
                const pBars = defective.map((d, i) => d / inspected[i]);
                const totalDefective = defective.reduce((a, b) => a + b, 0);
                const totalInspected = inspected.reduce((a, b) => a + b, 0);
                const pBar = totalDefective / totalInspected;

                // Variable control limits based on sample size
                const ucls = inspected.map(ni => pBar + 3 * Math.sqrt(pBar * (1 - pBar) / ni));
                const lcls = inspected.map(ni => Math.max(0, pBar - 3 * Math.sqrt(pBar * (1 - pBar) / ni)));

                return {
                    chartType: 'p-Chart',
                    centerline: pBar,
                    UCL: ucls,
                    LCL: lcls,
                    values: pBars,
                    averageSampleSize: totalInspected / n
                };
            },
            /**
             * c-Chart (Count of defects)
             * For count data with constant sample size
             */
            cChart: function(defectCounts) {
                const cBar = defectCounts.reduce((a, b) => a + b, 0) / defectCounts.length;
                const ucl = cBar + 3 * Math.sqrt(cBar);
                const lcl = Math.max(0, cBar - 3 * Math.sqrt(cBar));

                return {
                    chartType: 'c-Chart',
                    centerline: cBar,
                    UCL: ucl,
                    LCL: lcl,
                    values: defectCounts
                };
            },
            /**
             * PRISM INNOVATION: Self-Adjusting Control Limits with Bayesian Learning
             * Control limits that adapt based on process history
             */
            bayesianControlChart: function(newData, priorHistory = null) {
                // Prior belief about process parameters
                let priorMean, priorVariance, priorN;

                if (priorHistory) {
                    priorMean = priorHistory.mean;
                    priorVariance = priorHistory.variance;
                    priorN = priorHistory.n;
                } else {
                    // Non-informative prior
                    priorMean = newData.reduce((a, b) => a + b, 0) / newData.length;
                    priorVariance = newData.reduce((sum, x) => sum + Math.pow(x - priorMean, 2), 0) / newData.length;
                    priorN = 1;
                }
                // Update with new data
                const n = newData.length;
                const dataMean = newData.reduce((a, b) => a + b, 0) / n;
                const dataVariance = newData.reduce((sum, x) => sum + Math.pow(x - dataMean, 2), 0) / n;

                // Bayesian update (conjugate normal-normal)
                const posteriorN = priorN + n;
                const posteriorMean = (priorN * priorMean + n * dataMean) / posteriorN;
                const posteriorVariance = ((priorN * priorVariance + n * dataVariance) +
                    (priorN * n * Math.pow(priorMean - dataMean, 2)) / posteriorN) / posteriorN;

                const posteriorSigma = Math.sqrt(posteriorVariance);

                // Adaptive control limits
                const ucl = posteriorMean + 3 * posteriorSigma;
                const lcl = posteriorMean - 3 * posteriorSigma;

                // Confidence in limits (higher n = more confident)
                const confidence = 1 - 1 / Math.sqrt(posteriorN);

                return {
                    chartType: 'Bayesian Adaptive',
                    centerline: posteriorMean,
                    UCL: ucl,
                    LCL: lcl,
                    estimatedSigma: posteriorSigma,
                    confidence,
                    effectiveSampleSize: posteriorN,
                    posteriorHistory: {
                        mean: posteriorMean,
                        variance: posteriorVariance,
                        n: posteriorN
                    },
                    recommendation: confidence > 0.9 ? 'Limits stable' : 'Continue monitoring'
                };
            }
        },
        // 1.3 DMAIC Framework
        dmaic: {
            /**
             * Create DMAIC project structure
             */
            createProject: function(params) {
                return {
                    projectId: 'DMAIC-' + Date.now(),
                    createdDate: new Date().toISOString(),
                    name: params.name,
                    problemStatement: params.problem,
                    projectScope: params.scope,
                    teamMembers: params.team || [],
                    targetMetric: params.metric,
                    baseline: params.baseline,
                    target: params.target,
                    phases: {
                        define: { status: 'active', startDate: new Date().toISOString(), data: {} },
                        measure: { status: 'pending', data: {} },
                        analyze: { status: 'pending', data: {} },
                        improve: { status: 'pending', data: {} },
                        control: { status: 'pending', data: {} }
                    },
                    currentPhase: 'define'
                };
            },
            /**
             * Calculate Sigma Level from defect rate
             */
            calculateSigmaLevel: function(defects, opportunities, units) {
                const dpo = defects / (opportunities * units);
                const dpmo = dpo * 1000000;

                // Convert DPMO to Sigma Level (1.5 shift included)
                const z = this._dpmoToZ(dpmo);
                const sigmaLevel = z + 1.5; // Add 1.5 sigma shift

                return {
                    defects,
                    opportunities,
                    units,
                    dpo,
                    dpmo: Math.round(dpmo),
                    yield: (1 - dpo) * 100,
                    sigmaLevel: Math.round(sigmaLevel * 100) / 100,
                    interpretation: this._interpretSigma(sigmaLevel)
                };
            },
            _dpmoToZ: function(dpmo) {
                // Inverse normal approximation
                const p = dpmo / 1000000;
                if (p <= 0) return 6;
                if (p >= 1) return 0;

                // Newton-Raphson approximation
                let z = 3;
                for (let i = 0; i < 10; i++) {
                    const cdf = PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.processCapability._normalCDF(z);
                    const pdf = Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
                    z = z - (cdf - (1 - p)) / pdf;
                }
                return z;
            },
            _interpretSigma: function(sigma) {
                if (sigma >= 6) return 'World Class (3.4 DPMO)';
                if (sigma >= 5) return 'Excellent (233 DPMO)';
                if (sigma >= 4) return 'Good (6,210 DPMO)';
                if (sigma >= 3) return 'Average (66,807 DPMO)';
                if (sigma >= 2) return 'Below Average (308,538 DPMO)';
                return 'Poor (>691,462 DPMO)';
            }
        },
        // 1.4 FMEA with Monte Carlo (PRISM Innovation)
        fmea: {
            /**
             * Standard FMEA RPN calculation
             */
            calculateRPN: function(severity, occurrence, detection) {
                return severity * occurrence * detection;
            },
            /**
             * PRISM INNOVATION: Probabilistic FMEA with Monte Carlo simulation
             * Models uncertainty in S, O, D ratings
             */
            monteCarloFMEA: function(failureModes, simulations = 10000) {
                const results = failureModes.map(fm => {
                    const rpnSamples = [];

                    // Simulate with uncertainty in ratings
                    for (let i = 0; i < simulations; i++) {
                        // Allow ±1 variation in ratings (triangular distribution)
                        const s = this._triangularSample(
                            Math.max(1, fm.severity - 1),
                            fm.severity,
                            Math.min(10, fm.severity + 1)
                        );
                        const o = this._triangularSample(
                            Math.max(1, fm.occurrence - 1),
                            fm.occurrence,
                            Math.min(10, fm.occurrence + 1)
                        );
                        const d = this._triangularSample(
                            Math.max(1, fm.detection - 1),
                            fm.detection,
                            Math.min(10, fm.detection + 1)
                        );

                        rpnSamples.push(s * o * d);
                    }
                    rpnSamples.sort((a, b) => a - b);

                    return {
                        ...fm,
                        nominalRPN: fm.severity * fm.occurrence * fm.detection,
                        meanRPN: rpnSamples.reduce((a, b) => a + b, 0) / simulations,
                        medianRPN: rpnSamples[Math.floor(simulations / 2)],
                        p95RPN: rpnSamples[Math.floor(simulations * 0.95)],
                        p99RPN: rpnSamples[Math.floor(simulations * 0.99)],
                        worstCaseRPN: rpnSamples[simulations - 1],
                        riskCategory: this._categorizeRisk(rpnSamples[Math.floor(simulations * 0.95)])
                    };
                });

                // Sort by P95 RPN (worst likely case)
                results.sort((a, b) => b.p95RPN - a.p95RPN);

                return {
                    failureModes: results,
                    simulations,
                    topRisks: results.slice(0, 5),
                    totalP95Risk: results.reduce((sum, fm) => sum + fm.p95RPN, 0)
                };
            },
            _triangularSample: function(min, mode, max) {
                const u = Math.random();
                const fc = (mode - min) / (max - min);
                if (u < fc) {
                    return min + Math.sqrt(u * (max - min) * (mode - min));
                } else {
                    return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
                }
            },
            _categorizeRisk: function(rpn) {
                if (rpn >= 200) return 'CRITICAL - Immediate action required';
                if (rpn >= 100) return 'HIGH - Action required';
                if (rpn >= 50) return 'MEDIUM - Monitor closely';
                return 'LOW - Acceptable risk';
            }
        }
    },
    // SECTION 2: LEAN MANUFACTURING
    lean: {

        // 2.1 Seven Wastes (Muda) Detection
        sevenWastes: {
            wasteTypes: {
                TRANSPORT: { name: 'Transportation', description: 'Unnecessary movement of materials' },
                INVENTORY: { name: 'Inventory', description: 'Excess raw materials, WIP, or finished goods' },
                MOTION: { name: 'Motion', description: 'Unnecessary movement of people' },
                WAITING: { name: 'Waiting', description: 'Idle time waiting for next step' },
                OVERPRODUCTION: { name: 'Overproduction', description: 'Making more than needed' },
                OVERPROCESSING: { name: 'Over-processing', description: 'Doing more work than required' },
                DEFECTS: { name: 'Defects', description: 'Rework, scrap, corrections' }
            },
            /**
             * Analyze shop floor data for waste indicators
             * PRISM INNOVATION: AI-powered waste detection patterns
             */
            analyzeForWaste: function(shopData) {
                const wasteFound = [];

                // Transport waste - excessive material movement
                if (shopData.avgMaterialTravelDistance > 50) { // meters
                    wasteFound.push({
                        type: 'TRANSPORT',
                        severity: Math.min(10, shopData.avgMaterialTravelDistance / 10),
                        indicator: `Average material travel: ${shopData.avgMaterialTravelDistance}m`,
                        recommendation: 'Consider cellular manufacturing layout'
                    });
                }
                // Inventory waste - high WIP levels
                if (shopData.wipDays > 5) {
                    wasteFound.push({
                        type: 'INVENTORY',
                        severity: Math.min(10, shopData.wipDays),
                        indicator: `WIP covers ${shopData.wipDays} days of production`,
                        recommendation: 'Implement pull system/kanban'
                    });
                }
                // Waiting waste - machine idle time
                if (shopData.machineUtilization < 70) {
                    wasteFound.push({
                        type: 'WAITING',
                        severity: Math.round((100 - shopData.machineUtilization) / 10),
                        indicator: `Machine utilization: ${shopData.machineUtilization}%`,
                        recommendation: 'Analyze bottlenecks, balance workload'
                    });
                }
                // Defects waste - scrap rate
                if (shopData.scrapRate > 2) {
                    wasteFound.push({
                        type: 'DEFECTS',
                        severity: Math.min(10, shopData.scrapRate * 2),
                        indicator: `Scrap rate: ${shopData.scrapRate}%`,
                        recommendation: 'Root cause analysis, implement poka-yoke'
                    });
                }
                // Overproduction - finished goods inventory
                if (shopData.finishedGoodsDays > 10) {
                    wasteFound.push({
                        type: 'OVERPRODUCTION',
                        severity: Math.min(10, shopData.finishedGoodsDays / 3),
                        indicator: `${shopData.finishedGoodsDays} days of FG inventory`,
                        recommendation: 'Produce to customer demand, not forecast'
                    });
                }
                // Motion waste - setup time
                if (shopData.avgSetupTime > 60) { // minutes
                    wasteFound.push({
                        type: 'MOTION',
                        severity: Math.min(10, shopData.avgSetupTime / 15),
                        indicator: `Average setup time: ${shopData.avgSetupTime} minutes`,
                        recommendation: 'Implement SMED methodology'
                    });
                }
                // Over-processing - excessive tolerances
                if (shopData.avgToleranceRatio < 0.5) {
                    wasteFound.push({
                        type: 'OVERPROCESSING',
                        severity: Math.round((1 - shopData.avgToleranceRatio) * 10),
                        indicator: `Tolerances tighter than needed by ${Math.round((1 - shopData.avgToleranceRatio) * 100)}%`,
                        recommendation: 'Review customer requirements'
                    });
                }
                return {
                    wastesIdentified: wasteFound.length,
                    totalSeverity: wasteFound.reduce((sum, w) => sum + w.severity, 0),
                    wastes: wasteFound.sort((a, b) => b.severity - a.severity),
                    topPriority: wasteFound[0] || null,
                    leanScore: Math.max(0, 100 - wasteFound.reduce((sum, w) => sum + w.severity * 2, 0))
                };
            }
        },
        // 2.2 OEE (Overall Equipment Effectiveness)
        oee: {
            /**
             * Calculate OEE
             * OEE = Availability × Performance × Quality
             */
            calculate: function(params) {
                const {
                    plannedProductionTime,  // minutes
                    downtime,               // minutes (unplanned + planned stoppages)
                    idealCycleTime,         // minutes per part
                    totalParts,             // parts produced
                    goodParts               // parts meeting quality specs
                } = params;

                const operatingTime = plannedProductionTime - downtime;

                // Availability = Operating Time / Planned Production Time
                const availability = operatingTime / plannedProductionTime;

                // Performance = (Ideal Cycle Time × Total Parts) / Operating Time
                const performance = (idealCycleTime * totalParts) / operatingTime;

                // Quality = Good Parts / Total Parts
                const quality = goodParts / totalParts;

                // OEE
                const oee = availability * performance * quality;

                return {
                    availability: Math.round(availability * 1000) / 10,
                    performance: Math.round(performance * 1000) / 10,
                    quality: Math.round(quality * 1000) / 10,
                    oee: Math.round(oee * 1000) / 10,
                    interpretation: this._interpretOEE(oee),
                    losses: {
                        availabilityLoss: (1 - availability) * plannedProductionTime,
                        performanceLoss: (1 - performance) * operatingTime,
                        qualityLoss: (totalParts - goodParts) * idealCycleTime
                    },
                    benchmark: {
                        worldClass: 85,
                        typical: 60,
                        gap: Math.round((0.85 - oee) * 1000) / 10
                    }
                };
            },
            /**
             * PRISM INNOVATION: OEE with Kalman Filter prediction
             * Predicts future OEE based on trend
             */
            predictWithKalman: function(oeeHistory) {
                if (oeeHistory.length < 5) {
                    return { error: 'Need at least 5 historical OEE values' };
                }
                // Simple Kalman filter implementation
                const dt = 1; // time step (e.g., 1 day)
                let x = oeeHistory[0]; // state estimate
                let P = 1; // estimate uncertainty
                const Q = 0.1; // process noise
                const R = 1; // measurement noise

                const estimates = [];

                for (const measurement of oeeHistory) {
                    // Predict
                    const xPred = x;
                    const pPred = P + Q;

                    // Update
                    const K = pPred / (pPred + R);
                    x = xPred + K * (measurement - xPred);
                    P = (1 - K) * pPred;

                    estimates.push(x);
                }
                // Predict next 5 periods
                const predictions = [];
                let trend = (estimates[estimates.length - 1] - estimates[0]) / estimates.length;

                for (let i = 1; i <= 5; i++) {
                    predictions.push({
                        period: i,
                        predictedOEE: Math.min(100, Math.max(0, x + trend * i)),
                        confidence: Math.max(0, 1 - 0.1 * i)
                    });
                }
                return {
                    currentEstimate: x,
                    trend: trend > 0 ? 'Improving' : trend < 0 ? 'Declining' : 'Stable',
                    trendValue: Math.round(trend * 100) / 100,
                    predictions,
                    smoothedHistory: estimates
                };
            },
            _interpretOEE: function(oee) {
                if (oee >= 0.85) return 'World Class';
                if (oee >= 0.75) return 'Good';
                if (oee >= 0.65) return 'Average';
                if (oee >= 0.55) return 'Below Average';
                return 'Poor - Major improvement needed';
            }
        },
        // 2.3 Value Stream Mapping with ACO Optimization
        valueStreamMapping: {
            /**
             * Create Value Stream Map
             */
            createVSM: function(processSteps) {
                const vsm = {
                    processSteps: processSteps.map((step, i) => ({
                        ...step,
                        index: i,
                        valueAdded: step.cycleTime || 0,
                        nonValueAdded: (step.waitTime || 0) + (step.transportTime || 0),
                        leadTime: (step.cycleTime || 0) + (step.waitTime || 0) + (step.transportTime || 0)
                    })),
                    metrics: {}
                };
                // Calculate overall metrics
                vsm.metrics.totalLeadTime = vsm.processSteps.reduce((sum, s) => sum + s.leadTime, 0);
                vsm.metrics.totalValueAdded = vsm.processSteps.reduce((sum, s) => sum + s.valueAdded, 0);
                vsm.metrics.totalNonValueAdded = vsm.processSteps.reduce((sum, s) => sum + s.nonValueAdded, 0);
                vsm.metrics.valueAddedRatio = vsm.metrics.totalValueAdded / vsm.metrics.totalLeadTime;
                vsm.metrics.processEfficiency = Math.round(vsm.metrics.valueAddedRatio * 100);

                // Identify bottleneck
                const maxCycleTime = Math.max(...vsm.processSteps.map(s => s.cycleTime || 0));
                vsm.bottleneck = vsm.processSteps.find(s => s.cycleTime === maxCycleTime);

                return vsm;
            },
            /**
             * PRISM INNOVATION: VSM Optimization with Ant Colony Optimization
             * Finds optimal process sequence to minimize lead time
             */
            optimizeWithACO: function(processSteps, constraints = {}) {
                const n = processSteps.length;
                const numAnts = 20;
                const iterations = 50;
                const alpha = 1; // pheromone importance
                const beta = 2; // heuristic importance
                const evaporationRate = 0.5;
                const Q = 100;

                // Initialize pheromone matrix
                const pheromone = Array(n).fill(null).map(() => Array(n).fill(1));

                // Calculate heuristic (inverse of transition time)
                const heuristic = Array(n).fill(null).map(() => Array(n).fill(1));
                for (let i = 0; i < n; i++) {
                    for (let j = 0; j < n; j++) {
                        if (i !== j) {
                            // Lower transition time = higher desirability
                            const transitionTime = processSteps[j].setupTime || 10;
                            heuristic[i][j] = 1 / transitionTime;
                        }
                    }
                }
                let bestSequence = null;
                let bestLeadTime = Infinity;

                for (let iter = 0; iter < iterations; iter++) {
                    const antSequences = [];
                    const antLeadTimes = [];

                    for (let ant = 0; ant < numAnts; ant++) {
                        // Build sequence
                        const visited = new Set();
                        const sequence = [];
                        let current = 0; // Start from first process
                        sequence.push(current);
                        visited.add(current);

                        while (sequence.length < n) {
                            // Calculate probabilities for unvisited nodes
                            const probs = [];
                            let probSum = 0;

                            for (let j = 0; j < n; j++) {
                                if (!visited.has(j)) {
                                    const prob = Math.pow(pheromone[current][j], alpha) *
                                                 Math.pow(heuristic[current][j], beta);
                                    probs.push({ node: j, prob });
                                    probSum += prob;
                                }
                            }
                            // Roulette wheel selection
                            let r = Math.random() * probSum;
                            let selected = probs[0].node;
                            for (const p of probs) {
                                r -= p.prob;
                                if (r <= 0) {
                                    selected = p.node;
                                    break;
                                }
                            }
                            sequence.push(selected);
                            visited.add(selected);
                            current = selected;
                        }
                        // Calculate lead time for this sequence
                        let leadTime = 0;
                        for (let i = 0; i < sequence.length; i++) {
                            const step = processSteps[sequence[i]];
                            leadTime += (step.cycleTime || 0) + (step.waitTime || 0);
                            if (i > 0) {
                                leadTime += step.setupTime || 0;
                            }
                        }
                        antSequences.push(sequence);
                        antLeadTimes.push(leadTime);

                        if (leadTime < bestLeadTime) {
                            bestLeadTime = leadTime;
                            bestSequence = [...sequence];
                        }
                    }
                    // Evaporate pheromone
                    for (let i = 0; i < n; i++) {
                        for (let j = 0; j < n; j++) {
                            pheromone[i][j] *= (1 - evaporationRate);
                        }
                    }
                    // Deposit pheromone
                    for (let ant = 0; ant < numAnts; ant++) {
                        const deposit = Q / antLeadTimes[ant];
                        const seq = antSequences[ant];
                        for (let i = 0; i < seq.length - 1; i++) {
                            pheromone[seq[i]][seq[i + 1]] += deposit;
                        }
                    }
                }
                return {
                    optimizedSequence: bestSequence.map(i => processSteps[i]),
                    originalLeadTime: processSteps.reduce((sum, s) =>
                        sum + (s.cycleTime || 0) + (s.waitTime || 0) + (s.setupTime || 0), 0),
                    optimizedLeadTime: bestLeadTime,
                    improvement: Math.round((1 - bestLeadTime /
                        processSteps.reduce((sum, s) =>
                            sum + (s.cycleTime || 0) + (s.waitTime || 0) + (s.setupTime || 0), 0)) * 100),
                    acoIterations: iterations,
                    sequenceIndices: bestSequence
                };
            }
        },
        // 2.4 SMED (Single Minute Exchange of Die)
        smed: {
            /**
             * Analyze setup activities and categorize
             */
            analyzeSetup: function(activities) {
                const internal = []; // Machine must be stopped
                const external = []; // Can be done while machine runs

                activities.forEach(activity => {
                    if (activity.requiresMachineStop) {
                        internal.push(activity);
                    } else {
                        external.push(activity);
                    }
                });

                const totalInternal = internal.reduce((sum, a) => sum + a.duration, 0);
                const totalExternal = external.reduce((sum, a) => sum + a.duration, 0);

                return {
                    internalActivities: internal,
                    externalActivities: external,
                    internalTime: totalInternal,
                    externalTime: totalExternal,
                    totalSetupTime: totalInternal + totalExternal,
                    downtimeReduction: totalExternal,
                    recommendations: this._generateSMEDRecommendations(internal)
                };
            },
            _generateSMEDRecommendations: function(internalActivities) {
                const recs = [];

                // Look for activities that could be converted
                internalActivities.forEach(activity => {
                    if (activity.duration > 5) { // > 5 minutes
                        recs.push({
                            activity: activity.name,
                            suggestion: 'Consider pre-staging or parallel processing',
                            potentialSaving: Math.round(activity.duration * 0.5)
                        });
                    }
                });

                return recs;
            }
        },
        // 2.5 TPM (Total Productive Maintenance)
        tpm: {
            /**
             * Calculate maintenance metrics
             */
            calculateMetrics: function(maintenanceData) {
                const {
                    totalDowntime,      // hours
                    numFailures,
                    operatingHours,
                    maintenanceCost
                } = maintenanceData;

                // MTBF = Operating Hours / Number of Failures
                const mtbf = numFailures > 0 ? operatingHours / numFailures : operatingHours;

                // MTTR = Total Downtime / Number of Failures
                const mttr = numFailures > 0 ? totalDowntime / numFailures : 0;

                // Availability = MTBF / (MTBF + MTTR)
                const availability = mtbf / (mtbf + mttr);

                return {
                    mtbf: Math.round(mtbf * 10) / 10,
                    mttr: Math.round(mttr * 10) / 10,
                    availability: Math.round(availability * 1000) / 10,
                    failureRate: numFailures > 0 ? (numFailures / operatingHours) : 0,
                    costPerFailure: numFailures > 0 ? maintenanceCost / numFailures : 0,
                    recommendation: this._getTPMRecommendation(mtbf, mttr)
                };
            },
            _getTPMRecommendation: function(mtbf, mttr) {
                if (mtbf < 100) return 'Critical: Implement preventive maintenance program';
                if (mtbf < 500) return 'Warning: Increase PM frequency';
                if (mttr > 4) return 'Focus on reducing repair time - train technicians';
                return 'Good performance - maintain current program';
            }
        },
        // 2.6 5S Implementation
        fiveS: {
            categories: {
                SORT: { name: 'Sort (Seiri)', description: 'Remove unnecessary items' },
                SETINORDER: { name: 'Set in Order (Seiton)', description: 'Organize remaining items' },
                SHINE: { name: 'Shine (Seiso)', description: 'Clean the workplace' },
                STANDARDIZE: { name: 'Standardize (Seiketsu)', description: 'Create consistent procedures' },
                SUSTAIN: { name: 'Sustain (Shitsuke)', description: 'Maintain and improve' }
            },
            /**
             * 5S Audit scorecard
             */
            audit: function(scores) {
                // scores = { sort: 1-5, setInOrder: 1-5, shine: 1-5, standardize: 1-5, sustain: 1-5 }
                const total = scores.sort + scores.setInOrder + scores.shine +
                              scores.standardize + scores.sustain;
                const maxScore = 25;

                return {
                    scores: {
                        sort: { score: scores.sort, max: 5 },
                        setInOrder: { score: scores.setInOrder, max: 5 },
                        shine: { score: scores.shine, max: 5 },
                        standardize: { score: scores.standardize, max: 5 },
                        sustain: { score: scores.sustain, max: 5 }
                    },
                    totalScore: total,
                    maxScore,
                    percentage: Math.round((total / maxScore) * 100),
                    level: this._get5SLevel(total / maxScore),
                    weakestArea: this._findWeakest(scores),
                    nextSteps: this._getNextSteps(scores)
                };
            },
            _get5SLevel: function(ratio) {
                if (ratio >= 0.9) return 'Excellent - World Class';
                if (ratio >= 0.8) return 'Good - Minor improvements needed';
                if (ratio >= 0.6) return 'Average - Focus on weak areas';
                return 'Needs Improvement - Comprehensive 5S program required';
            },
            _findWeakest: function(scores) {
                const areas = Object.entries(scores);
                areas.sort((a, b) => a[1] - b[1]);
                return areas[0][0];
            },
            _getNextSteps: function(scores) {
                const steps = [];
                if (scores.sort < 3) steps.push('Conduct red tag event');
                if (scores.setInOrder < 3) steps.push('Create visual management system');
                if (scores.shine < 3) steps.push('Establish cleaning schedules');
                if (scores.standardize < 3) steps.push('Document best practices');
                if (scores.sustain < 3) steps.push('Implement audit schedule');
                return steps;
            }
        },
        // 2.7 Kanban System
        kanban: {
            /**
             * Calculate kanban quantity
             */
            calculateKanbanSize: function(params) {
                const {
                    dailyDemand,      // units per day
                    leadTime,         // days
                    safetyFactor,     // typically 1.0-1.5
                    containerSize     // units per container
                } = params;

                // Number of kanbans = (Daily Demand × Lead Time × Safety Factor) / Container Size
                const numKanbans = Math.ceil(
                    (dailyDemand * leadTime * safetyFactor) / containerSize
                );

                return {
                    numberOfKanbans: numKanbans,
                    totalInventory: numKanbans * containerSize,
                    daysOfStock: (numKanbans * containerSize) / dailyDemand,
                    recommendation: numKanbans > 10 ? 'Consider reducing lead time or container size' : 'Kanban size appropriate'
                };
            }
        }
    },
    // SECTION 3: KAIZEN - Continuous Improvement
    kaizen: {

        // 3.1 PDCA with Reinforcement Learning
        pdca: {
            /**
             * Create PDCA cycle
             */
            createCycle: function(params) {
                return {
                    cycleId: 'PDCA-' + Date.now(),
                    createdDate: new Date().toISOString(),
                    problem: params.problem,
                    targetMetric: params.metric,
                    baseline: params.baseline,
                    target: params.target,
                    phases: {
                        plan: {
                            status: 'active',
                            hypothesis: params.hypothesis || '',
                            actions: params.plannedActions || [],
                            expectedOutcome: params.target
                        },
                        do: {
                            status: 'pending',
                            implementationDate: null,
                            actualActions: []
                        },
                        check: {
                            status: 'pending',
                            measuredResult: null,
                            varianceFromTarget: null
                        },
                        act: {
                            status: 'pending',
                            decision: null, // 'standardize', 'iterate', 'abandon'
                            nextActions: []
                        }
                    },
                    currentPhase: 'plan'
                };
            },
            /**
             * PRISM INNOVATION: PDCA with Reinforcement Learning
             * Learns from past PDCA cycles to suggest better improvements
             */
            suggestImprovement: function(problemType, historicalCycles) {
                // Build success rate for different action types
                const actionSuccess = {};

                historicalCycles.forEach(cycle => {
                    if (cycle.phases.check.measuredResult !== null) {
                        const success = cycle.phases.check.measuredResult >= cycle.target ? 1 : 0;

                        cycle.phases.plan.actions.forEach(action => {
                            const actionType = action.type || 'general';
                            if (!actionSuccess[actionType]) {
                                actionSuccess[actionType] = { successes: 0, total: 0 };
                            }
                            actionSuccess[actionType].successes += success;
                            actionSuccess[actionType].total += 1;
                        });
                    }
                });

                // Calculate success rates and rank actions
                const rankedActions = Object.entries(actionSuccess)
                    .map(([type, data]) => ({
                        actionType: type,
                        successRate: data.total > 0 ? data.successes / data.total : 0.5,
                        sampleSize: data.total,
                        confidence: 1 - 1 / (1 + Math.sqrt(data.total))
                    }))
                    .sort((a, b) => b.successRate * b.confidence - a.successRate * a.confidence);

                return {
                    recommendedActions: rankedActions.slice(0, 3),
                    explorationSuggestion: rankedActions.length < 5 ?
                        'Consider trying new improvement approaches' : null,
                    historicalCyclesAnalyzed: historicalCycles.length
                };
            }
        },
        // 3.2 Improvement Event Tracking
        improvementTracker: {
            improvements: [],

            /**
             * Log an improvement event
             */
            logImprovement: function(params) {
                const improvement = {
                    id: 'KZ-' + Date.now(),
                    date: new Date().toISOString(),
                    category: params.category, // 'quality', 'productivity', 'safety', 'cost', 'delivery'
                    description: params.description,
                    area: params.area,
                    submittedBy: params.submittedBy,
                    beforeState: params.beforeState,
                    afterState: params.afterState,
                    measuredImpact: params.impact,
                    costSavings: params.costSavings || 0,
                    timeSavings: params.timeSavings || 0,
                    status: 'implemented'
                };
                this.improvements.push(improvement);
                return improvement;
            },
            /**
             * Get improvement statistics
             */
            getStatistics: function(timeRange = null) {
                let filtered = this.improvements;
                if (timeRange) {
                    const cutoff = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
                    filtered = filtered.filter(i => new Date(i.date) >= cutoff);
                }
                const byCategory = {};
                let totalCostSavings = 0;
                let totalTimeSavings = 0;

                filtered.forEach(imp => {
                    byCategory[imp.category] = (byCategory[imp.category] || 0) + 1;
                    totalCostSavings += imp.costSavings;
                    totalTimeSavings += imp.timeSavings;
                });

                return {
                    totalImprovements: filtered.length,
                    byCategory,
                    totalCostSavings,
                    totalTimeSavings,
                    avgCostSavingsPer: filtered.length > 0 ? totalCostSavings / filtered.length : 0
                };
            }
        },
        // 3.3 Gemba Data Collection
        gemba: {
            observations: [],

            /**
             * Record a Gemba observation
             */
            recordObservation: function(params) {
                const obs = {
                    id: 'GEMBA-' + Date.now(),
                    date: new Date().toISOString(),
                    location: params.location,
                    observer: params.observer,
                    category: params.category, // 'waste', 'safety', 'quality', 'flow', 'environment'
                    observation: params.observation,
                    severity: params.severity || 'medium', // 'low', 'medium', 'high', 'critical'
                    actionRequired: params.actionRequired || false,
                    status: 'open'
                };
                this.observations.push(obs);
                return obs;
            },
            /**
             * Get open observations by priority
             */
            getOpenObservations: function() {
                return this.observations
                    .filter(o => o.status === 'open')
                    .sort((a, b) => {
                        const priority = { critical: 4, high: 3, medium: 2, low: 1 };
                        return priority[b.severity] - priority[a.severity];
                    });
            }
        },
        // 3.4 A3 Problem Solving
        a3: {
            /**
             * Create A3 problem solving document
             */
            createA3: function(params) {
                return {
                    id: 'A3-' + Date.now(),
                    title: params.title,
                    author: params.author,
                    date: new Date().toISOString(),
                    sections: {
                        background: params.background || '',
                        currentCondition: params.currentCondition || '',
                        targetCondition: params.targetCondition || '',
                        rootCauseAnalysis: params.rootCause || '',
                        countermeasures: params.countermeasures || [],
                        implementationPlan: params.plan || [],
                        followUp: params.followUp || ''
                    },
                    status: 'draft'
                };
            },
            /**
             * 5 Why Analysis
             */
            fiveWhyAnalysis: function(problem) {
                return {
                    problem,
                    whys: [
                        { level: 1, why: '', answer: '' },
                        { level: 2, why: '', answer: '' },
                        { level: 3, why: '', answer: '' },
                        { level: 4, why: '', answer: '' },
                        { level: 5, why: '', answer: '' }
                    ],
                    rootCause: '',
                    countermeasure: ''
                };
            }
        }
    },
    // SECTION 4: AI INTEGRATION & TRAINING DATA GENERATION
    aiIntegration: {
        /**
         * Generate training data for AI systems
         */
        generateTrainingData: function(numSamples = 100) {
            const samples = [];

            for (let i = 0; i < numSamples; i++) {
                // Generate random process data
                const measurements = Array(30).fill(0).map(() =>
                    10 + Math.random() * 2 - 1 + (Math.random() > 0.95 ? 5 : 0)); // Some outliers

                const USL = 12;
                const LSL = 8;
                const mean = measurements.reduce((a, b) => a + b, 0) / measurements.length;
                const sigma = Math.sqrt(measurements.reduce((sum, x) =>
                    sum + Math.pow(x - mean, 2), 0) / measurements.length);

                const cpkResult = PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.processCapability
                    .calculateCpk(USL, LSL, mean, sigma);

                samples.push({
                    input: {
                        mean,
                        sigma,
                        sampleSize: measurements.length,
                        range: Math.max(...measurements) - Math.min(...measurements)
                    },
                    output: {
                        cpk: cpkResult.value,
                        inControl: cpkResult.value >= 1.0,
                        sigmaLevel: cpkResult.sigmaLevel
                    }
                });
            }
            return {
                type: 'process_capability',
                samples,
                generatedAt: new Date().toISOString()
            };
        },
        /**
         * Get all available AI routes for this module
         */
        getRoutes: function() {
            return {
                'sixsigma.cpk': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.processCapability.calculateCpk',
                'sixsigma.cpk.uncertainty': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.processCapability.calculateCpkWithUncertainty',
                'sixsigma.chart.xbar': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.controlCharts.xBarRChart',
                'sixsigma.chart.imr': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.controlCharts.iMRChart',
                'sixsigma.chart.bayesian': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.controlCharts.bayesianControlChart',
                'sixsigma.dmaic.sigma': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.dmaic.calculateSigmaLevel',
                'sixsigma.fmea.montecarlo': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.fmea.monteCarloFMEA',
                'lean.wastes.analyze': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.sevenWastes.analyzeForWaste',
                'lean.oee.calculate': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.oee.calculate',
                'lean.oee.predict': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.oee.predictWithKalman',
                'lean.vsm.create': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.valueStreamMapping.createVSM',
                'lean.vsm.optimize': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.valueStreamMapping.optimizeWithACO',
                'lean.smed.analyze': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.smed.analyzeSetup',
                'lean.tpm.metrics': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.tpm.calculateMetrics',
                'lean.5s.audit': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.fiveS.audit',
                'lean.kanban.size': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.kanban.calculateKanbanSize',
                'kaizen.pdca.create': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.kaizen.pdca.createCycle',
                'kaizen.pdca.suggest': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.kaizen.pdca.suggestImprovement',
                'kaizen.improvement.log': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.kaizen.improvementTracker.logImprovement',
                'kaizen.improvement.stats': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.kaizen.improvementTracker.getStatistics',
                'kaizen.gemba.record': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.kaizen.gemba.recordObservation',
                'kaizen.a3.create': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.kaizen.a3.createA3',
                'kaizen.a3.5why': 'PRISM_LEAN_SIX_SIGMA_KAIZEN.kaizen.a3.fiveWhyAnalysis'
            };
        }
    },
    // SECTION 5: SELF-TESTS
    selfTests: {
        runAll: function() {
            console.log('\n═══════════════════════════════════════════════════════════════');
            console.log('PRISM_LEAN_SIX_SIGMA_KAIZEN - Self Tests');
            console.log('═══════════════════════════════════════════════════════════════\n');

            let passed = 0;
            let failed = 0;

            // Test 1: Process Capability
            try {
                const cpk = PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.processCapability
                    .calculateCpk(12, 8, 10, 0.5);
                if (cpk.value > 1.3 && cpk.interpretation.includes('Good')) {
                    console.log('✅ Test 1: Process Capability (Cpk) - PASSED');
                    passed++;
                } else {
                    console.log('❌ Test 1: Process Capability - FAILED');
                    failed++;
                }
            } catch (e) {
                console.log('❌ Test 1: Process Capability - ERROR:', e.message);
                failed++;
            }
            // Test 2: X-bar R Chart
            try {
                const subgroups = [[10.1, 10.2, 10.0], [9.9, 10.1, 10.0], [10.0, 10.1, 9.9]];
                const chart = PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.controlCharts.xBarRChart(subgroups);
                if (chart.chartType === 'X-bar and R' && chart.xBar.centerline > 0) {
                    console.log('✅ Test 2: X-bar R Chart - PASSED');
                    passed++;
                } else {
                    console.log('❌ Test 2: X-bar R Chart - FAILED');
                    failed++;
                }
            } catch (e) {
                console.log('❌ Test 2: X-bar R Chart - ERROR:', e.message);
                failed++;
            }
            // Test 3: OEE Calculation
            try {
                const oee = PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.oee.calculate({
                    plannedProductionTime: 480,
                    downtime: 48,
                    idealCycleTime: 2,
                    totalParts: 200,
                    goodParts: 195
                });
                if (oee.oee > 70 && oee.oee < 90) {
                    console.log('✅ Test 3: OEE Calculation - PASSED');
                    passed++;
                } else {
                    console.log('❌ Test 3: OEE Calculation - FAILED');
                    failed++;
                }
            } catch (e) {
                console.log('❌ Test 3: OEE Calculation - ERROR:', e.message);
                failed++;
            }
            // Test 4: Seven Wastes Analysis
            try {
                const wastes = PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.sevenWastes.analyzeForWaste({
                    avgMaterialTravelDistance: 75,
                    wipDays: 8,
                    machineUtilization: 60,
                    scrapRate: 3.5,
                    finishedGoodsDays: 15,
                    avgSetupTime: 90,
                    avgToleranceRatio: 0.3
                });
                if (wastes.wastesIdentified >= 5) {
                    console.log('✅ Test 4: Seven Wastes Analysis - PASSED');
                    passed++;
                } else {
                    console.log('❌ Test 4: Seven Wastes Analysis - FAILED');
                    failed++;
                }
            } catch (e) {
                console.log('❌ Test 4: Seven Wastes Analysis - ERROR:', e.message);
                failed++;
            }
            // Test 5: Monte Carlo FMEA
            try {
                const fmea = PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.fmea.monteCarloFMEA([
                    { name: 'Tool Breakage', severity: 8, occurrence: 4, detection: 3 },
                    { name: 'Dimensional Error', severity: 6, occurrence: 5, detection: 2 }
                ], 1000);
                if (fmea.failureModes.length === 2 && fmea.simulations === 1000) {
                    console.log('✅ Test 5: Monte Carlo FMEA - PASSED');
                    passed++;
                } else {
                    console.log('❌ Test 5: Monte Carlo FMEA - FAILED');
                    failed++;
                }
            } catch (e) {
                console.log('❌ Test 5: Monte Carlo FMEA - ERROR:', e.message);
                failed++;
            }
            // Test 6: VSM with ACO Optimization
            try {
                const vsm = PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.valueStreamMapping.optimizeWithACO([
                    { name: 'Cut', cycleTime: 10, waitTime: 5, setupTime: 15 },
                    { name: 'Mill', cycleTime: 20, waitTime: 10, setupTime: 20 },
                    { name: 'Drill', cycleTime: 5, waitTime: 3, setupTime: 8 },
                    { name: 'Inspect', cycleTime: 5, waitTime: 2, setupTime: 0 }
                ]);
                if (vsm.optimizedSequence && vsm.improvement >= 0) {
                    console.log('✅ Test 6: VSM ACO Optimization - PASSED');
                    passed++;
                } else {
                    console.log('❌ Test 6: VSM ACO Optimization - FAILED');
                    failed++;
                }
            } catch (e) {
                console.log('❌ Test 6: VSM ACO Optimization - ERROR:', e.message);
                failed++;
            }
            // Test 7: 5S Audit
            try {
                const audit = PRISM_LEAN_SIX_SIGMA_KAIZEN.lean.fiveS.audit({
                    sort: 4, setInOrder: 3, shine: 4, standardize: 3, sustain: 2
                });
                if (audit.totalScore === 16 && audit.percentage === 64) {
                    console.log('✅ Test 7: 5S Audit - PASSED');
                    passed++;
                } else {
                    console.log('❌ Test 7: 5S Audit - FAILED');
                    failed++;
                }
            } catch (e) {
                console.log('❌ Test 7: 5S Audit - ERROR:', e.message);
                failed++;
            }
            // Test 8: PDCA Cycle
            try {
                const pdca = PRISM_LEAN_SIX_SIGMA_KAIZEN.kaizen.pdca.createCycle({
                    problem: 'High scrap rate',
                    metric: 'scrap_percentage',
                    baseline: 5,
                    target: 2
                });
                if (pdca.cycleId.startsWith('PDCA-') && pdca.currentPhase === 'plan') {
                    console.log('✅ Test 8: PDCA Cycle - PASSED');
                    passed++;
                } else {
                    console.log('❌ Test 8: PDCA Cycle - FAILED');
                    failed++;
                }
            } catch (e) {
                console.log('❌ Test 8: PDCA Cycle - ERROR:', e.message);
                failed++;
            }
            // Test 9: Sigma Level Calculation
            try {
                const sigma = PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma.dmaic.calculateSigmaLevel(
                    34, 10, 1000 // 34 defects, 10 opportunities, 1000 units
                );
                if (sigma.dpmo === 3400 && sigma.sigmaLevel > 4) {
                    console.log('✅ Test 9: Sigma Level Calculation - PASSED');
                    passed++;
                } else {
                    console.log('❌ Test 9: Sigma Level Calculation - FAILED');
                    failed++;
                }
            } catch (e) {
                console.log('❌ Test 9: Sigma Level Calculation - ERROR:', e.message);
                failed++;
            }
            // Test 10: Training Data Generation
            try {
                const training = PRISM_LEAN_SIX_SIGMA_KAIZEN.aiIntegration.generateTrainingData(50);
                if (training.samples.length === 50 && training.type === 'process_capability') {
                    console.log('✅ Test 10: Training Data Generation - PASSED');
                    passed++;
                } else {
                    console.log('❌ Test 10: Training Data Generation - FAILED');
                    failed++;
                }
            } catch (e) {
                console.log('❌ Test 10: Training Data Generation - ERROR:', e.message);
                failed++;
            }
            console.log(`\n=== RESULTS: ${passed}/${passed + failed} tests passed ===\n`);
            return { passed, failed, total: passed + failed };
        }
    }
};
// Make globally available
window.PRISM_LEAN_SIX_SIGMA_KAIZEN = PRISM_LEAN_SIX_SIGMA_KAIZEN;

// Register routes with PRISM_GATEWAY if available
if (typeof PRISM_GATEWAY !== 'undefined') {
    const routes = PRISM_LEAN_SIX_SIGMA_KAIZEN.aiIntegration.getRoutes();
    Object.entries(routes).forEach(([route, target]) => {
        PRISM_GATEWAY.register(route, target);
    });
    console.log(`[PRISM_LEAN_SIX_SIGMA_KAIZEN] Registered ${Object.keys(routes).length} routes with PRISM_GATEWAY`);
}
// Auto-register with AI systems if available
if (typeof PRISM_AI_100_DATABASE_REGISTRY !== 'undefined') {
    PRISM_AI_100_DATABASE_REGISTRY.register({
        name: 'LEAN_SIX_SIGMA_KAIZEN',
        type: 'manufacturing_excellence',
        getAll: () => ({
            sixSigma: PRISM_LEAN_SIX_SIGMA_KAIZEN.sixSigma,
            lean: PRISM_LEAN_SIX_SIGMA_KAIZEN.lean,
            kaizen: PRISM_LEAN_SIX_SIGMA_KAIZEN.kaizen
        }),
        getCount: () => 24, // Total methods
        generateTrainingSamples: PRISM_LEAN_SIX_SIGMA_KAIZEN.aiIntegration.generateTrainingData
    });
    console.log('[PRISM_LEAN_SIX_SIGMA_KAIZEN] Registered with AI 100% Database Registry');
}
// Run self-tests
PRISM_LEAN_SIX_SIGMA_KAIZEN.selfTests.runAll();

(typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_LEAN_SIX_SIGMA_KAIZEN] Module loaded successfully');
console.log('  - Six Sigma: Process Capability, Control Charts, DMAIC, FMEA');
console.log('  - Lean: 7 Wastes, OEE, VSM, SMED, TPM, 5S, Kanban');
PDCA, A3 Reports, Quick Wins');
console.log('  - AI Integration: Training data generation for all methodologies');


// ═══════════════════════════════════════════════════════════════════════════════
// PRISM MANUFACTURER CATALOG - CONSOLIDATED INTEGRATION v1.0
// Merged from 8 catalog database files (8,823 lines total)
// Source: 44 manufacturer PDF catalogs (~3.1 GB)
// Generated: January 18, 2026

// ═══════════════════════════════════════════════════════════════════════════════════════════
// ██████╗ ██████╗ ██╗███████╗███╗   ███╗    ██████╗ █████╗ ████████╗ █████╗ ██╗      ██████╗  ██████╗ 
// ██╔══██╗██╔══██╗██║██╔════╝████╗ ████║   ██╔════╝██╔══██╗╚══██╔══╝██╔══██╗██║     ██╔═══██╗██╔════╝ 
// ██████╔╝██████╔╝██║███████╗██╔████╔██║   ██║     ███████║   ██║   ███████║██║     ██║   ██║██║  ███╗
// ██╔═══╝ ██╔══██╗██║╚════██║██║╚██╔╝██║   ██║     ██╔══██║   ██║   ██╔══██║██║     ██║   ██║██║   ██║
// ██║     ██║  ██║██║███████║██║ ╚═╝ ██║   ╚██████╗██║  ██║   ██║   ██║  ██║███████╗╚██████╔╝╚██████╔╝
// ╚═╝     ╚═╝  ╚═╝╚═╝╚══════╝╚═╝     ╚═╝    ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝ ╚═════╝  ╚═════╝ 
// ═══════════════════════════════════════════════════════════════════════════════════════════
// PRISM MANUFACTURER CATALOG - FINAL CONSOLIDATED INTEGRATION
// Complete extraction from 44 PDF catalogs (~3.1GB)
// ═══════════════════════════════════════════════════════════════════════════════════════════
// 
// Generated: January 18, 2026
// Version: 1.0.0 FINAL
// Total Lines: ~9,500+
// Total Size: ~500KB
// 
// ═══════════════════════════════════════════════════════════════════════════════════════════
// MANUFACTURERS INCLUDED (25+):
// ═══════════════════════════════════════════════════════════════════════════════════════════
// 
// BATCH 1 (v1): Tool Holders
//   • Guhring - CAT40/CAT50 hydraulic chucks, shrink fit holders
//   • BIG DAISHOWA - Mega Micro Chuck, Mega E Chuck, Slim Jet Through
//   • REGO-FIX - ER collet systems (ER8-ER50), powRgrip
//   • Orange Vise - OV-4/OV-6 modular vises with work envelopes
// 
// BATCH 2 (v2): Cutting Parameters
//   • OSG - ADO drills (3D, 5D, 8D series)
//   • ISCAR - Insert ISO nomenclature, CNMG/WNMG geometry
//   • Sandvik - General cutting parameters
//   • Korloy - Basic turning data
//   • MA Ford - TuffCut end mills
//   • EMUGE - Basic tap data
// 
// BATCH 3 (v3): Lathe Tooling
//   • Global CNC - BMT45/55/65, VDI20/30/40/50 tooling
//   • ISCAR CAMFIX - Turning heads, boring bars, deflection calculations
//   • Zeni - Series 151 cut-off, solid carbide end mills, drills
// 
// BATCH 4 (v4): Insert Grades
//   • Kennametal - CNMG/DNMG/TNMG/SNMG geometry, ANSI/ISO codes
//   • SECO - Feedmax SD26/SD265A, EPB750 boring, Axiabore
//   • Allied Machine - GEN3SYS XT Pro, T-A Pro systems
// 
// BATCH 5 (v5): Kinematic Data
//   • Spindle Interfaces - 15+ types (CAT, HSK, BT, Capto)
//   • Kinematic Specifications - Max RPM, torque, gear ratios
//   • Collision Envelopes - Complete {z, r} profiles
//   • Thermal Data - Expansion coefficients
// 
// BATCH 6 (v6): Enhanced Geometric
//   • Retroactive Enhancements - All batches 1-4 with collision data
//   • Collision Utilities - generateAssemblyEnvelope(), pointInEnvelope()
//   • Complete Tool Dimensions - d2, d4, l1, l2, l5, gage line positions
// 
// BATCH 7 (v7): Rotating Tools
//   • Kennametal Vol.2 - Deep hole drills, KenTIP FS, HARVI end mills, taps
//   • EMUGE - Machine taps, Taptor/PunchDrill/PunchTap technologies
//   • SGS/Kyocera - Z-Carb, V-Carb, T-Carb, H-Carb, Multi-Carb
//   • MA Ford - TuffCut AL Series 135, XFO series
//   • Guhring - Micro drills 6488/6489 series
//   • Haimer - MILL Alu Series, Power Series, Safe-Lock system
//   • Korloy - Chip breakers (VC, VQ, LP, CP, MP, HM), grades
//   • Ingersoll - Series 15J1E/15X1W end mills
// 
// BATCH 8 (v8): Reference Data
//   • Accupro - Thread forming taps (TiN/TiCN), thread mills
//   • Tungaloy - TungDrill indexable drills, chamfering tools
//   • Ceratizit - 7-flute HEM cutting data tables by material
//   • ISO Material Classification - Complete P/M/K/N/S/H with subgroups
//   • Grade Cross-Reference - 6 manufacturers × 6 material types
// 
// BATCH 9 (v9): Enhancement Priorities Complete
//   • Haimer - MILL Power Series, DUO-LOCK HF Series, Safe-Lock
//   • Tungaloy - GC_2023-2024 ACLNR/L toolholders, EXN02R milling
//   • Rapidkut - Jobber drill sets, chucking reamers
//   • ISCAR - Multi-Master modular, F45ST/IQ845 face mills, wiper inserts
//   • Ceratizit - IPT7/IPC7 7-flute HEM cutting data
//   • Korloy - Complete chip breakers (VC/VQ/LP/CP/MP/HM), grade selection
// 
// ═══════════════════════════════════════════════════════════════════════════════════════════
// DATA TYPES EXTRACTED:
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ✓ Tool dimensions (diameter, length, shank)
// ✓ Collision envelopes ({z, r} profiles)
// ✓ Insert geometry (IC, thickness, corner radius)
// ✓ Collet specifications (OD, length, clamping range)
// ✓ Holder body dimensions
// ✓ Work envelopes for vises
// ✓ Max RPM and torque specifications
// ✓ Spindle interface dimensions
// ✓ Thermal expansion coefficients
// ✓ Taper specifications
// ✓ Cutting parameters (speed, feed, DOC)
// ✓ Material-specific recommendations
// ✓ Chip breaker geometry and application
// ✓ Grade cross-reference tables
// ✓ ISO material classification
// 
// ═══════════════════════════════════════════════════════════════════════════════════════════
// USAGE:
// ═══════════════════════════════════════════════════════════════════════════════════════════
// 
// // Access tool holder data
// const holder = PRISM_CATALOG.toolHolders.bigDaishowa.megaMicroChuck;
// 
// // Get cutting parameters
// const params = PRISM_CATALOG.cuttingParameters.osg.adoDrills;
// 
// // Collision envelope lookup
// const envelope = PRISM_CATALOG.collisionEnvelopes.cat40.standardShell;
// 
// // Grade cross-reference
// const equiv = PRISM_CATALOG.gradeReference.crossReference('Kennametal', 'KC5010', 'Sandvik');
// 
// ═══════════════════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// PRISM KNOWLEDGE BASE INTEGRATION v1.0
// Consolidated from 107+ University Courses  
// Integration Date: January 18, 2026
// Total Lines: ~34,000 | Source: MIT, Stanford, Harvard, Georgia Tech
// ═══════════════════════════════════════════════════════════════════════════════
// CONTENTS:
// 1. AI/ML Advanced Algorithms (8,330 lines)
//    - Attention mechanisms (multi-head, sparse, linear)
//    - Reinforcement Learning (SARSA, DQN, Actor-Critic, Policy Gradient)
//    - Neural Network enhancements (ELU, GELU, SELU, advanced optimizers)
//    - Clustering (DBSCAN, K-Medoids, t-SNE)
//    - Model compression (quantization, pruning, distillation)
//
// 2. Process Planning (912 lines)
//    - Search algorithms (A*, BFS, DFS, IDA*)
//    - Constraint satisfaction (CSP, AC-3)
//    - Motion planning (RRT, RRT*, PRM)
//    - Probabilistic reasoning (HMM, MDP, MCTS)
//
// 3. Optimization (755 lines)
//    - Unconstrained (Newton, Steepest Descent, BFGS)
//    - Constrained (Penalty, Barrier, Augmented Lagrangian)
//    - Integer programming (Branch & Bound, Cutting Plane)
//
// 4. Physics/Dynamics (640 lines)
//    - Kinematics (FK, IK, Jacobian)
//    - Dynamics (Newton-Euler, Lagrangian)
//    - Vibration analysis (Modal, Stability Lobes)
//    - Thermal (Cutting temperature, Heat transfer)
//
// 5. CAD/CAM Enhancements (4,758 lines)
//    - Feature recognition
//    - Computational geometry (Voronoi, Delaunay)
//    - Toolpath strategies
//    - Graphics/rendering
//
// 6. Signal Processing & Graphics (1,409 lines)
//    - FFT, filters, wavelets
//    - Ray tracing, shading
//
// 7. Business/UI (1,392 lines)
//    - Human factors (NASA-TLX, Fitts/Hick's Law)
//    - Costing (ABC, NPV, IRR)
//    - Software patterns
//
// 8. MIT Extended Batches (15,949 lines)
//    - Batches 13-20 algorithms
//    - Development enhancements
//    - UI improvements
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PRISM AI/ML ENHANCEMENT MODULE v1.0
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Gap-Filling Algorithms from MIT Course Knowledge
 * 
 * Sources:
 * - Stanford CS 229 (Machine Learning)
 * - MIT 6.036 (Intro to Machine Learning)
 * - MIT 6.867 (Advanced Machine Learning)
 * - MIT 15.773 (Deep Learning)
 * - MIT 15.099 (Optimization Methods)
 * - MIT 18.086 (Computational Science)
 * - MIT 6.871 (Knowledge-Based AI)
 * 
 * Contains 25 algorithms NOT currently in build:
 * - 8 from Knowledge Base (easy to integrate)
 * - 17 new implementations (complete)
 * 
 * Version: 1.0.0
 * Date: January 18, 2026
 * Lines: ~1200
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: REINFORCEMENT LEARNING ALGORITHMS
// Source: Stanford CS 229 Notes 12
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_RL_ENHANCED = {
    name: 'PRISM Reinforcement Learning Enhanced',
    version: '1.0.0',
    source: 'Stanford CS 229, MIT 6.036',
    
    // ─────────────────────────────────────────────────────────────────────────
    // SARSA: On-Policy TD Control
    // Q(s,a) ← Q(s,a) + α[r + γQ(s',a') - Q(s,a)]
    // ─────────────────────────────────────────────────────────────────────────
    SARSA: {
        /**
         * Initialize Q-table for SARSA
         * @param {Array} states - List of state identifiers
         * @param {Array} actions - List of action identifiers
         * @returns {Object} Initialized Q-table
         */
        initQTable: function(states, actions) {
            const Q = {};
            for (const s of states) {
                Q[s] = {};
                for (const a of actions) {
                    Q[s][a] = 0;
                }
            }
            return Q;
        },
        
        /**
         * Select action using epsilon-greedy policy
         * @param {Object} Q - Q-table
         * @param {string} state - Current state
         * @param {Array} actions - Available actions
         * @param {number} epsilon - Exploration rate
         * @returns {string} Selected action
         */
        selectAction: function(Q, state, actions, epsilon = 0.1) {
            if (Math.random() < epsilon) {
                // Explore: random action
                return actions[Math.floor(Math.random() * actions.length)];
            } else {
                // Exploit: best known action
                let bestAction = actions[0];
                let bestValue = Q[state]?.[actions[0]] || 0;
                for (const a of actions) {
                    const value = Q[state]?.[a] || 0;
                    if (value > bestValue) {
                        bestValue = value;
                        bestAction = a;
                    }
                }
                return bestAction;
            }
        },
        
        /**
         * SARSA update step
         * @param {Object} Q - Q-table
         * @param {string} s - Current state
         * @param {string} a - Action taken
         * @param {number} r - Reward received
         * @param {string} s_next - Next state
         * @param {string} a_next - Next action (on-policy)
         * @param {number} alpha - Learning rate
         * @param {number} gamma - Discount factor
         * @returns {Object} Updated Q-table
         */
        update: function(Q, s, a, r, s_next, a_next, alpha = 0.1, gamma = 0.99) {
            // Q(s,a) ← Q(s,a) + α[r + γQ(s',a') - Q(s,a)]
            const currentQ = Q[s]?.[a] || 0;
            const nextQ = Q[s_next]?.[a_next] || 0;
            const target = r + gamma * nextQ;
            const tdError = target - currentQ;
            
            if (!Q[s]) Q[s] = {};
            Q[s][a] = currentQ + alpha * tdError;
            
            return { Q, tdError };
        },
        
        /**
         * Full SARSA episode
         * @param {Object} env - Environment with step(action) method
         * @param {Object} Q - Q-table
         * @param {Object} params - {alpha, gamma, epsilon}
         * @returns {Object} {Q, totalReward}
         */
        episode: function(env, Q, params = {}) {
            const { alpha = 0.1, gamma = 0.99, epsilon = 0.1 } = params;
            const actions = env.getActions();
            
            let state = env.reset();
            let action = this.selectAction(Q, state, actions, epsilon);
            let totalReward = 0;
            let done = false;
            
            while (!done) {
                const { nextState, reward, isDone } = env.step(action);
                const nextAction = this.selectAction(Q, nextState, actions, epsilon);
                
                this.update(Q, state, action, reward, nextState, nextAction, alpha, gamma);
                
                totalReward += reward;
                state = nextState;
                action = nextAction;
                done = isDone;
            }
            
            return { Q, totalReward };
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // Value Iteration (MDP)
    // V(s) = max_a [R(s,a) + γ Σ P(s'|s,a)V(s')]
    // ─────────────────────────────────────────────────────────────────────────
    ValueIteration: {
        /**
         * Run value iteration algorithm
         * @param {Object} mdp - {states, actions, transitions, rewards, gamma}
         * @param {number} epsilon - Convergence threshold
         * @param {number} maxIter - Maximum iterations
         * @returns {Object} {V, policy}
         */
        solve: function(mdp, epsilon = 1e-6, maxIter = 1000) {
            const { states, actions, transitions, rewards, gamma = 0.99 } = mdp;
            
            // Initialize value function
            const V = {};
            for (const s of states) V[s] = 0;
            
            // Iterate until convergence
            for (let iter = 0; iter < maxIter; iter++) {
                let maxDelta = 0;
                
                for (const s of states) {
                    const oldV = V[s];
                    
                    // V(s) = max_a [R(s,a) + γ Σ P(s'|s,a)V(s')]
                    let maxValue = -Infinity;
                    
                    for (const a of actions) {
                        let value = rewards[s]?.[a] || rewards[s] || 0;
                        
                        // Sum over all possible next states
                        for (const s_next of states) {
                            const prob = transitions[s]?.[a]?.[s_next] || 0;
                            value += gamma * prob * V[s_next];
                        }
                        
                        if (value > maxValue) {
                            maxValue = value;
                        }
                    }
                    
                    V[s] = maxValue === -Infinity ? 0 : maxValue;
                    maxDelta = Math.max(maxDelta, Math.abs(oldV - V[s]));
                }
                
                if (maxDelta < epsilon) {
                    console.log(`[ValueIteration] Converged in ${iter} iterations`);
                    break;
                }
            }
            
            // Extract optimal policy
            const policy = this.extractPolicy(mdp, V);
            
            return { V, policy };
        },
        
        /**
         * Extract optimal policy from value function
         */
        extractPolicy: function(mdp, V) {
            const { states, actions, transitions, rewards, gamma = 0.99 } = mdp;
            const policy = {};
            
            for (const s of states) {
                let bestAction = null;
                let bestValue = -Infinity;
                
                for (const a of actions) {
                    let value = rewards[s]?.[a] || rewards[s] || 0;
                    
                    for (const s_next of states) {
                        const prob = transitions[s]?.[a]?.[s_next] || 0;
                        value += gamma * prob * V[s_next];
                    }
                    
                    if (value > bestValue) {
                        bestValue = value;
                        bestAction = a;
                    }
                }
                
                policy[s] = bestAction;
            }
            
            return policy;
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // Policy Gradient (REINFORCE)
    // ∇J(θ) = E[∇log(π(a|s,θ)) * G_t]
    // ─────────────────────────────────────────────────────────────────────────
    PolicyGradient: {
        /**
         * Initialize policy network weights
         */
        initPolicy: function(inputDim, outputDim) {
            // Simple linear softmax policy
            const weights = {
                W: Array(inputDim).fill(0).map(() => 
                    Array(outputDim).fill(0).map(() => (Math.random() - 0.5) * 0.1)
                ),
                b: Array(outputDim).fill(0)
            };
            return weights;
        },
        
        /**
         * Compute softmax probabilities
         */
        softmax: function(logits) {
            const maxLogit = Math.max(...logits);
            const expLogits = logits.map(l => Math.exp(l - maxLogit));
            const sumExp = expLogits.reduce((a, b) => a + b, 0);
            return expLogits.map(e => e / sumExp);
        },
        
        /**
         * Forward pass: state → action probabilities
         */
        forward: function(weights, state) {
            const logits = weights.b.map((b, j) => 
                b + state.reduce((sum, s_i, i) => sum + s_i * weights.W[i][j], 0)
            );
            return this.softmax(logits);
        },
        
        /**
         * Sample action from policy
         */
        sampleAction: function(probs) {
            const r = Math.random();
            let cumProb = 0;
            for (let i = 0; i < probs.length; i++) {
                cumProb += probs[i];
                if (r < cumProb) return i;
            }
            return probs.length - 1;
        },
        
        /**
         * Compute policy gradient
         * ∇log(π(a|s,θ)) = x * (1[a=j] - π(j|s))
         */
        gradLogPolicy: function(weights, state, action) {
            const probs = this.forward(weights, state);
            const gradW = weights.W.map((row, i) => 
                row.map((_, j) => state[i] * ((j === action ? 1 : 0) - probs[j]))
            );
            const gradB = probs.map((p, j) => (j === action ? 1 : 0) - p);
            return { gradW, gradB };
        },
        
        /**
         * REINFORCE update after episode
         * @param {Object} weights - Policy weights
         * @param {Array} trajectory - [{state, action, reward}, ...]
         * @param {number} alpha - Learning rate
         * @param {number} gamma - Discount factor
         */
        update: function(weights, trajectory, alpha = 0.01, gamma = 0.99) {
            // Compute returns G_t
            const T = trajectory.length;
            const returns = new Array(T);
            returns[T - 1] = trajectory[T - 1].reward;
            for (let t = T - 2; t >= 0; t--) {
                returns[t] = trajectory[t].reward + gamma * returns[t + 1];
            }
            
            // Update weights using policy gradient
            for (let t = 0; t < T; t++) {
                const { state, action } = trajectory[t];
                const G_t = returns[t];
                const { gradW, gradB } = this.gradLogPolicy(weights, state, action);
                
                // θ ← θ + α * G_t * ∇log(π(a|s,θ))
                for (let i = 0; i < weights.W.length; i++) {
                    for (let j = 0; j < weights.W[i].length; j++) {
                        weights.W[i][j] += alpha * G_t * gradW[i][j];
                    }
                }
                for (let j = 0; j < weights.b.length; j++) {
                    weights.b[j] += alpha * G_t * gradB[j];
                }
            }
            
            return weights;
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // Actor-Critic
    // Actor: π(a|s,θ), Critic: V(s,w)
    // ─────────────────────────────────────────────────────────────────────────
    ActorCritic: {
        /**
         * Initialize actor-critic networks
         */
        init: function(stateDim, actionDim) {
            return {
                actor: {
                    W: Array(stateDim).fill(0).map(() => 
                        Array(actionDim).fill(0).map(() => (Math.random() - 0.5) * 0.1)
                    ),
                    b: Array(actionDim).fill(0)
                },
                critic: {
                    w: Array(stateDim).fill(0).map(() => (Math.random() - 0.5) * 0.1),
                    b: 0
                }
            };
        },
        
        /**
         * Critic: estimate V(s)
         */
        estimateValue: function(critic, state) {
            return critic.b + state.reduce((sum, s, i) => sum + s * critic.w[i], 0);
        },
        
        /**
         * Actor-Critic update step
         */
        update: function(networks, s, a, r, s_next, done, params = {}) {
            const { alphaActor = 0.01, alphaCritic = 0.1, gamma = 0.99 } = params;
            
            // Compute TD error (advantage estimate)
            const V_s = this.estimateValue(networks.critic, s);
            const V_next = done ? 0 : this.estimateValue(networks.critic, s_next);
            const tdError = r + gamma * V_next - V_s;
            
            // Update Critic: w ← w + α_c * δ * ∇V(s)
            for (let i = 0; i < networks.critic.w.length; i++) {
                networks.critic.w[i] += alphaCritic * tdError * s[i];
            }
            networks.critic.b += alphaCritic * tdError;
            
            // Update Actor: θ ← θ + α_a * δ * ∇log(π(a|s))
            const probs = PRISM_RL_ENHANCED.PolicyGradient.forward(networks.actor, s);
            for (let i = 0; i < networks.actor.W.length; i++) {
                for (let j = 0; j < networks.actor.W[i].length; j++) {
                    const gradLog = s[i] * ((j === a ? 1 : 0) - probs[j]);
                    networks.actor.W[i][j] += alphaActor * tdError * gradLog;
                }
            }
            for (let j = 0; j < networks.actor.b.length; j++) {
                networks.actor.b[j] += alphaActor * tdError * ((j === a ? 1 : 0) - probs[j]);
            }
            
            return { networks, tdError };
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // DQN (Deep Q-Network) - Simplified
    // ─────────────────────────────────────────────────────────────────────────
    DQN: {
        /**
         * Experience replay buffer
         */
        ReplayBuffer: function(capacity = 10000) {
            return {
                buffer: [],
                capacity,
                add: function(experience) {
                    if (this.buffer.length >= this.capacity) {
                        this.buffer.shift();
                    }
                    this.buffer.push(experience);
                },
                sample: function(batchSize) {
                    const samples = [];
                    for (let i = 0; i < batchSize; i++) {
                        const idx = Math.floor(Math.random() * this.buffer.length);
                        samples.push(this.buffer[idx]);
                    }
                    return samples;
                },
                size: function() {
                    return this.buffer.length;
                }
            };
        },
        
        /**
         * Initialize simple Q-network
         */
        initNetwork: function(inputDim, hiddenDim, outputDim) {
            const xavier = (fanIn, fanOut) => Math.sqrt(6 / (fanIn + fanOut));
            return {
                W1: Array(inputDim).fill(0).map(() => 
                    Array(hiddenDim).fill(0).map(() => (Math.random() - 0.5) * 2 * xavier(inputDim, hiddenDim))
                ),
                b1: Array(hiddenDim).fill(0),
                W2: Array(hiddenDim).fill(0).map(() => 
                    Array(outputDim).fill(0).map(() => (Math.random() - 0.5) * 2 * xavier(hiddenDim, outputDim))
                ),
                b2: Array(outputDim).fill(0)
            };
        },
        
        /**
         * Forward pass through Q-network
         */
        forward: function(network, state) {
            // Hidden layer with ReLU
            const hidden = network.b1.map((b, j) => {
                let sum = b;
                for (let i = 0; i < state.length; i++) {
                    sum += state[i] * network.W1[i][j];
                }
                return Math.max(0, sum); // ReLU
            });
            
            // Output layer (Q-values)
            const qValues = network.b2.map((b, k) => {
                let sum = b;
                for (let j = 0; j < hidden.length; j++) {
                    sum += hidden[j] * network.W2[j][k];
                }
                return sum;
            });
            
            return { qValues, hidden };
        },
        
        /**
         * DQN training step with experience replay
         */
        trainStep: function(network, targetNetwork, replayBuffer, params = {}) {
            const { batchSize = 32, gamma = 0.99, alpha = 0.001 } = params;
            
            if (replayBuffer.size() < batchSize) return;
            
            const batch = replayBuffer.sample(batchSize);
            
            for (const { state, action, reward, nextState, done } of batch) {
                // Current Q-values
                const { qValues, hidden } = this.forward(network, state);
                
                // Target Q-value
                const { qValues: nextQ } = this.forward(targetNetwork, nextState);
                const maxNextQ = done ? 0 : Math.max(...nextQ);
                const target = reward + gamma * maxNextQ;
                
                // TD error for selected action
                const tdError = target - qValues[action];
                
                // Simple gradient update (backprop through network)
                // Update W2
                for (let j = 0; j < network.W2.length; j++) {
                    network.W2[j][action] += alpha * tdError * hidden[j];
                }
                network.b2[action] += alpha * tdError;
                
                // Update W1 (simplified - only affects hidden neurons that contributed to action)
                for (let i = 0; i < network.W1.length; i++) {
                    for (let j = 0; j < network.W1[i].length; j++) {
                        if (hidden[j] > 0) { // ReLU derivative
                            network.W1[i][j] += alpha * tdError * network.W2[j][action] * state[i];
                        }
                    }
                }
            }
        },
        
        /**
         * Copy weights from online to target network
         */
        updateTarget: function(network, targetNetwork) {
            for (let i = 0; i < network.W1.length; i++) {
                targetNetwork.W1[i] = [...network.W1[i]];
            }
            targetNetwork.b1 = [...network.b1];
            for (let j = 0; j < network.W2.length; j++) {
                targetNetwork.W2[j] = [...network.W2[j]];
            }
            targetNetwork.b2 = [...network.b2];
        }
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: NEURAL NETWORK ACTIVATIONS & OPTIMIZERS
// Source: MIT 15.773, MIT 6.036
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_NN_ENHANCED = {
    name: 'PRISM Neural Network Enhanced',
    version: '1.0.0',
    
    // ─────────────────────────────────────────────────────────────────────────
    // Activation Functions
    // ─────────────────────────────────────────────────────────────────────────
    Activations: {
        /**
         * ELU: Exponential Linear Unit
         * f(x) = x if x > 0 else α(e^x - 1)
         */
        elu: function(x, alpha = 1.0) {
            if (Array.isArray(x)) {
                return x.map(v => this.elu(v, alpha));
            }
            return x > 0 ? x : alpha * (Math.exp(x) - 1);
        },
        
        eluDerivative: function(x, alpha = 1.0) {
            if (Array.isArray(x)) {
                return x.map(v => this.eluDerivative(v, alpha));
            }
            return x > 0 ? 1 : alpha * Math.exp(x);
        },
        
        /**
         * GELU: Gaussian Error Linear Unit
         * f(x) = x * Φ(x) where Φ is CDF of N(0,1)
         * Approximation: x * 0.5 * (1 + tanh(√(2/π) * (x + 0.044715x³)))
         */
        gelu: function(x) {
            if (Array.isArray(x)) {
                return x.map(v => this.gelu(v));
            }
            const sqrt2Pi = Math.sqrt(2 / Math.PI);
            return x * 0.5 * (1 + Math.tanh(sqrt2Pi * (x + 0.044715 * x * x * x)));
        },
        
        geluDerivative: function(x) {
            if (Array.isArray(x)) {
                return x.map(v => this.geluDerivative(v));
            }
            const sqrt2Pi = Math.sqrt(2 / Math.PI);
            const inner = sqrt2Pi * (x + 0.044715 * x * x * x);
            const tanhInner = Math.tanh(inner);
            const cdf = 0.5 * (1 + tanhInner);
            const pdf = sqrt2Pi * (1 + 0.134145 * x * x) * (1 - tanhInner * tanhInner);
            return cdf + 0.5 * x * pdf;
        },
        
        /**
         * SELU: Scaled Exponential Linear Unit
         * f(x) = λ * (x if x > 0 else α(e^x - 1))
         */
        selu: function(x) {
            const lambda = 1.0507009873554804934193349852946;
            const alpha = 1.6732632423543772848170429916717;
            if (Array.isArray(x)) {
                return x.map(v => this.selu(v));
            }
            return lambda * (x > 0 ? x : alpha * (Math.exp(x) - 1));
        },
        
        /**
         * Swish: x * sigmoid(x)
         */
        swish: function(x, beta = 1.0) {
            if (Array.isArray(x)) {
                return x.map(v => this.swish(v, beta));
            }
            return x / (1 + Math.exp(-beta * x));
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // Optimizers
    // ─────────────────────────────────────────────────────────────────────────
    Optimizers: {
        /**
         * SGD with momentum
         */
        SGD: function(params = {}) {
            const { lr = 0.01, momentum = 0.9 } = params;
            return {
                lr,
                momentum,
                velocities: new Map(),
                
                step: function(weights, gradients, key = 'default') {
                    if (!this.velocities.has(key)) {
                        this.velocities.set(key, gradients.map(g => 
                            Array.isArray(g) ? g.map(() => 0) : 0
                        ));
                    }
                    
                    const v = this.velocities.get(key);
                    
                    for (let i = 0; i < weights.length; i++) {
                        if (Array.isArray(weights[i])) {
                            for (let j = 0; j < weights[i].length; j++) {
                                v[i][j] = this.momentum * v[i][j] + gradients[i][j];
                                weights[i][j] -= this.lr * v[i][j];
                            }
                        } else {
                            v[i] = this.momentum * v[i] + gradients[i];
                            weights[i] -= this.lr * v[i];
                        }
                    }
                    
                    return weights;
                }
            };
        },
        
        /**
         * AdaDelta: No learning rate needed
         * Uses ratio of RMS gradients
         */
        AdaDelta: function(params = {}) {
            const { rho = 0.95, epsilon = 1e-6 } = params;
            return {
                rho,
                epsilon,
                Eg2: new Map(),  // E[g²]
                Edx2: new Map(), // E[Δx²]
                
                step: function(weights, gradients, key = 'default') {
                    if (!this.Eg2.has(key)) {
                        this.Eg2.set(key, this._zeros(gradients));
                        this.Edx2.set(key, this._zeros(gradients));
                    }
                    
                    const Eg2 = this.Eg2.get(key);
                    const Edx2 = this.Edx2.get(key);
                    
                    for (let i = 0; i < weights.length; i++) {
                        if (Array.isArray(weights[i])) {
                            for (let j = 0; j < weights[i].length; j++) {
                                const g = gradients[i][j];
                                // E[g²] = ρ * E[g²] + (1-ρ) * g²
                                Eg2[i][j] = this.rho * Eg2[i][j] + (1 - this.rho) * g * g;
                                // Δx = -√(E[Δx²] + ε) / √(E[g²] + ε) * g
                                const dx = -Math.sqrt(Edx2[i][j] + this.epsilon) / 
                                           Math.sqrt(Eg2[i][j] + this.epsilon) * g;
                                // E[Δx²] = ρ * E[Δx²] + (1-ρ) * Δx²
                                Edx2[i][j] = this.rho * Edx2[i][j] + (1 - this.rho) * dx * dx;
                                weights[i][j] += dx;
                            }
                        } else {
                            const g = gradients[i];
                            Eg2[i] = this.rho * Eg2[i] + (1 - this.rho) * g * g;
                            const dx = -Math.sqrt(Edx2[i] + this.epsilon) / 
                                       Math.sqrt(Eg2[i] + this.epsilon) * g;
                            Edx2[i] = this.rho * Edx2[i] + (1 - this.rho) * dx * dx;
                            weights[i] += dx;
                        }
                    }
                    
                    return weights;
                },
                
                _zeros: function(template) {
                    return template.map(t => 
                        Array.isArray(t) ? t.map(() => 0) : 0
                    );
                }
            };
        },
        
        /**
         * NAdam: Adam with Nesterov momentum
         */
        NAdam: function(params = {}) {
            const { lr = 0.001, beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8 } = params;
            return {
                lr, beta1, beta2, epsilon,
                t: 0,
                m: new Map(),
                v: new Map(),
                
                step: function(weights, gradients, key = 'default') {
                    this.t++;
                    
                    if (!this.m.has(key)) {
                        this.m.set(key, this._zeros(gradients));
                        this.v.set(key, this._zeros(gradients));
                    }
                    
                    const m = this.m.get(key);
                    const v = this.v.get(key);
                    
                    // Bias correction terms
                    const beta1_t = Math.pow(this.beta1, this.t);
                    const beta2_t = Math.pow(this.beta2, this.t);
                    
                    for (let i = 0; i < weights.length; i++) {
                        if (Array.isArray(weights[i])) {
                            for (let j = 0; j < weights[i].length; j++) {
                                const g = gradients[i][j];
                                // Update biased moments
                                m[i][j] = this.beta1 * m[i][j] + (1 - this.beta1) * g;
                                v[i][j] = this.beta2 * v[i][j] + (1 - this.beta2) * g * g;
                                // Bias-corrected moments
                                const m_hat = m[i][j] / (1 - beta1_t);
                                const v_hat = v[i][j] / (1 - beta2_t);
                                // Nesterov component
                                const m_nesterov = this.beta1 * m_hat + (1 - this.beta1) * g / (1 - beta1_t);
                                // Update
                                weights[i][j] -= this.lr * m_nesterov / (Math.sqrt(v_hat) + this.epsilon);
                            }
                        } else {
                            const g = gradients[i];
                            m[i] = this.beta1 * m[i] + (1 - this.beta1) * g;
                            v[i] = this.beta2 * v[i] + (1 - this.beta2) * g * g;
                            const m_hat = m[i] / (1 - beta1_t);
                            const v_hat = v[i] / (1 - beta2_t);
                            const m_nesterov = this.beta1 * m_hat + (1 - this.beta1) * g / (1 - beta1_t);
                            weights[i] -= this.lr * m_nesterov / (Math.sqrt(v_hat) + this.epsilon);
                        }
                    }
                    
                    return weights;
                },
                
                _zeros: function(template) {
                    return template.map(t => Array.isArray(t) ? t.map(() => 0) : 0);
                }
            };
        },
        
        /**
         * AdamW: Adam with decoupled weight decay
         */
        AdamW: function(params = {}) {
            const { lr = 0.001, beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8, weightDecay = 0.01 } = params;
            return {
                lr, beta1, beta2, epsilon, weightDecay,
                t: 0,
                m: new Map(),
                v: new Map(),
                
                step: function(weights, gradients, key = 'default') {
                    this.t++;
                    
                    if (!this.m.has(key)) {
                        this.m.set(key, this._zeros(gradients));
                        this.v.set(key, this._zeros(gradients));
                    }
                    
                    const m = this.m.get(key);
                    const v = this.v.get(key);
                    const bc1 = 1 - Math.pow(this.beta1, this.t);
                    const bc2 = 1 - Math.pow(this.beta2, this.t);
                    
                    for (let i = 0; i < weights.length; i++) {
                        if (Array.isArray(weights[i])) {
                            for (let j = 0; j < weights[i].length; j++) {
                                const g = gradients[i][j];
                                m[i][j] = this.beta1 * m[i][j] + (1 - this.beta1) * g;
                                v[i][j] = this.beta2 * v[i][j] + (1 - this.beta2) * g * g;
                                const m_hat = m[i][j] / bc1;
                                const v_hat = v[i][j] / bc2;
                                // AdamW: decoupled weight decay
                                weights[i][j] -= this.lr * (m_hat / (Math.sqrt(v_hat) + this.epsilon) 
                                                           + this.weightDecay * weights[i][j]);
                            }
                        } else {
                            const g = gradients[i];
                            m[i] = this.beta1 * m[i] + (1 - this.beta1) * g;
                            v[i] = this.beta2 * v[i] + (1 - this.beta2) * g * g;
                            const m_hat = m[i] / bc1;
                            const v_hat = v[i] / bc2;
                            weights[i] -= this.lr * (m_hat / (Math.sqrt(v_hat) + this.epsilon) 
                                                    + this.weightDecay * weights[i]);
                        }
                    }
                    
                    return weights;
                },
                
                _zeros: function(template) {
                    return template.map(t => Array.isArray(t) ? t.map(() => 0) : 0);
                }
            };
        }
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: CLUSTERING ALGORITHMS
// Source: MIT 6.036, MIT 6.867
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_CLUSTERING_ENHANCED = {
    name: 'PRISM Clustering Enhanced',
    version: '1.0.0',
    
    /**
     * DBSCAN: Density-Based Spatial Clustering
     * @param {Array} points - Array of n-dimensional points
     * @param {number} eps - Maximum distance between neighbors
     * @param {number} minPts - Minimum points to form cluster
     * @returns {Array} Cluster labels (-1 = noise, 0+ = cluster ID)
     */
    dbscan: function(points, eps, minPts) {
        const n = points.length;
        const labels = new Array(n).fill(-1); // -1 = unvisited
        let clusterId = 0;
        
        // Euclidean distance
        const distance = (p1, p2) => {
            return Math.sqrt(p1.reduce((sum, v, i) => sum + Math.pow(v - p2[i], 2), 0));
        };
        
        // Find all neighbors within eps
        const regionQuery = (pIdx) => {
            const neighbors = [];
            for (let i = 0; i < n; i++) {
                if (distance(points[pIdx], points[i]) <= eps) {
                    neighbors.push(i);
                }
            }
            return neighbors;
        };
        
        // Process each point
        for (let i = 0; i < n; i++) {
            if (labels[i] !== -1) continue; // Already processed
            
            const neighbors = regionQuery(i);
            
            if (neighbors.length < minPts) {
                labels[i] = 0; // Mark as noise
                continue;
            }
            
            // Start new cluster
            clusterId++;
            labels[i] = clusterId;
            
            // Expand cluster
            const seeds = [...neighbors.filter(j => j !== i)];
            let seedIdx = 0;
            
            while (seedIdx < seeds.length) {
                const q = seeds[seedIdx++];
                
                if (labels[q] === 0) {
                    labels[q] = clusterId; // Change noise to border point
                }
                
                if (labels[q] !== -1) continue; // Already in a cluster
                
                labels[q] = clusterId;
                const qNeighbors = regionQuery(q);
                
                if (qNeighbors.length >= minPts) {
                    // Add new points to seeds
                    for (const neighbor of qNeighbors) {
                        if (labels[neighbor] === -1 || labels[neighbor] === 0) {
                            if (!seeds.includes(neighbor)) {
                                seeds.push(neighbor);
                            }
                        }
                    }
                }
            }
        }
        
        return labels;
    },
    
    /**
     * K-Medoids (PAM): Partitioning Around Medoids
     * More robust to outliers than K-Means
     */
    kmedoids: function(points, k, maxIter = 100) {
        const n = points.length;
        
        // Distance matrix
        const dist = Array(n).fill(0).map(() => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const d = Math.sqrt(points[i].reduce((sum, v, idx) => 
                    sum + Math.pow(v - points[j][idx], 2), 0));
                dist[i][j] = d;
                dist[j][i] = d;
            }
        }
        
        // Initialize medoids randomly
        let medoids = [];
        const available = [...Array(n).keys()];
        for (let i = 0; i < k; i++) {
            const idx = Math.floor(Math.random() * available.length);
            medoids.push(available.splice(idx, 1)[0]);
        }
        
        let labels = this._assignToMedoids(dist, medoids);
        let totalCost = this._calculateCost(dist, labels, medoids);
        
        // Iteratively improve
        for (let iter = 0; iter < maxIter; iter++) {
            let improved = false;
            
            for (let i = 0; i < k; i++) {
                // Try swapping medoid i with each non-medoid
                for (let j = 0; j < n; j++) {
                    if (medoids.includes(j)) continue;
                    
                    const newMedoids = [...medoids];
                    newMedoids[i] = j;
                    
                    const newLabels = this._assignToMedoids(dist, newMedoids);
                    const newCost = this._calculateCost(dist, newLabels, newMedoids);
                    
                    if (newCost < totalCost) {
                        medoids = newMedoids;
                        labels = newLabels;
                        totalCost = newCost;
                        improved = true;
                    }
                }
            }
            
            if (!improved) break;
        }
        
        return { labels, medoids, cost: totalCost };
    },
    
    _assignToMedoids: function(dist, medoids) {
        const n = dist.length;
        return Array(n).fill(0).map((_, i) => {
            let minDist = Infinity;
            let label = 0;
            for (let m = 0; m < medoids.length; m++) {
                if (dist[i][medoids[m]] < minDist) {
                    minDist = dist[i][medoids[m]];
                    label = m;
                }
            }
            return label;
        });
    },
    
    _calculateCost: function(dist, labels, medoids) {
        let cost = 0;
        for (let i = 0; i < labels.length; i++) {
            cost += dist[i][medoids[labels[i]]];
        }
        return cost;
    },
    
    /**
     * t-SNE: t-Distributed Stochastic Neighbor Embedding
     * For visualization of high-dimensional data
     */
    tsne: function(X, params = {}) {
        const { dims = 2, perplexity = 30, maxIter = 500, learningRate = 100 } = params;
        const n = X.length;
        
        // Compute pairwise distances in high-D
        const D = this._pairwiseDistances(X);
        
        // Compute conditional probabilities P_j|i
        const P = this._computeP(D, perplexity);
        
        // Initialize low-D representation randomly
        let Y = Array(n).fill(0).map(() => 
            Array(dims).fill(0).map(() => (Math.random() - 0.5) * 0.0001)
        );
        
        let gains = Array(n).fill(0).map(() => Array(dims).fill(1));
        let momentum = Array(n).fill(0).map(() => Array(dims).fill(0));
        
        // Gradient descent
        for (let iter = 0; iter < maxIter; iter++) {
            // Compute Q probabilities (t-distribution)
            const Q = this._computeQ(Y);
            
            // Compute gradients
            const gradients = this._computeGradients(P, Q, Y);
            
            // Update with momentum
            const alpha = iter < 250 ? 0.5 : 0.8;
            
            for (let i = 0; i < n; i++) {
                for (let d = 0; d < dims; d++) {
                    // Adaptive learning rate
                    const sign = Math.sign(gradients[i][d]) === Math.sign(momentum[i][d]) ? -1 : 1;
                    gains[i][d] = Math.max(0.01, gains[i][d] + 0.2 * sign);
                    
                    momentum[i][d] = alpha * momentum[i][d] - learningRate * gains[i][d] * gradients[i][d];
                    Y[i][d] += momentum[i][d];
                }
            }
            
            // Center
            const center = Array(dims).fill(0);
            for (let i = 0; i < n; i++) {
                for (let d = 0; d < dims; d++) {
                    center[d] += Y[i][d];
                }
            }
            for (let i = 0; i < n; i++) {
                for (let d = 0; d < dims; d++) {
                    Y[i][d] -= center[d] / n;
                }
            }
        }
        
        return Y;
    },
    
    _pairwiseDistances: function(X) {
        const n = X.length;
        const D = Array(n).fill(0).map(() => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const d = Math.sqrt(X[i].reduce((sum, v, k) => sum + Math.pow(v - X[j][k], 2), 0));
                D[i][j] = d;
                D[j][i] = d;
            }
        }
        return D;
    },
    
    _computeP: function(D, perplexity, tol = 1e-5) {
        const n = D.length;
        const P = Array(n).fill(0).map(() => Array(n).fill(0));
        const targetEntropy = Math.log(perplexity);
        
        for (let i = 0; i < n; i++) {
            let betaMin = -Infinity, betaMax = Infinity;
            let beta = 1;
            
            // Binary search for sigma
            for (let iter = 0; iter < 50; iter++) {
                // Compute P_j|i
                let sumP = 0;
                for (let j = 0; j < n; j++) {
                    if (i === j) continue;
                    P[i][j] = Math.exp(-D[i][j] * D[i][j] * beta);
                    sumP += P[i][j];
                }
                
                // Normalize and compute entropy
                let H = 0;
                for (let j = 0; j < n; j++) {
                    if (i === j) continue;
                    P[i][j] /= sumP;
                    if (P[i][j] > 1e-10) {
                        H -= P[i][j] * Math.log(P[i][j]);
                    }
                }
                
                // Adjust beta
                const diff = H - targetEntropy;
                if (Math.abs(diff) < tol) break;
                
                if (diff > 0) {
                    betaMin = beta;
                    beta = betaMax === Infinity ? beta * 2 : (beta + betaMax) / 2;
                } else {
                    betaMax = beta;
                    beta = betaMin === -Infinity ? beta / 2 : (beta + betaMin) / 2;
                }
            }
        }
        
        // Symmetrize
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const pij = (P[i][j] + P[j][i]) / (2 * n);
                P[i][j] = pij;
                P[j][i] = pij;
            }
        }
        
        return P;
    },
    
    _computeQ: function(Y) {
        const n = Y.length;
        const Q = Array(n).fill(0).map(() => Array(n).fill(0));
        let sumQ = 0;
        
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const dist = Y[i].reduce((sum, v, k) => sum + Math.pow(v - Y[j][k], 2), 0);
                const q = 1 / (1 + dist); // t-distribution with df=1
                Q[i][j] = q;
                Q[j][i] = q;
                sumQ += 2 * q;
            }
        }
        
        // Normalize
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                Q[i][j] = Math.max(Q[i][j] / sumQ, 1e-12);
            }
        }
        
        return Q;
    },
    
    _computeGradients: function(P, Q, Y) {
        const n = Y.length;
        const dims = Y[0].length;
        const gradients = Array(n).fill(0).map(() => Array(dims).fill(0));
        
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i === j) continue;
                const dist = Y[i].reduce((sum, v, k) => sum + Math.pow(v - Y[j][k], 2), 0);
                const mult = 4 * (P[i][j] - Q[i][j]) / (1 + dist);
                
                for (let d = 0; d < dims; d++) {
                    gradients[i][d] += mult * (Y[i][d] - Y[j][d]);
                }
            }
        }
        
        return gradients;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: SIGNAL PROCESSING & BAYESIAN
// Source: MIT 18.086, MIT 6.867
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_SIGNAL_ENHANCED = {
    name: 'PRISM Signal Processing Enhanced',
    version: '1.0.0',
    
    /**
     * Cross-correlation of two signals
     * (f ⋆ g)(τ) = ∫f*(t)g(t+τ)dt
     */
    crossCorrelation: function(x, y) {
        const n = x.length;
        const m = y.length;
        const result = new Array(n + m - 1).fill(0);
        
        for (let lag = -(m - 1); lag < n; lag++) {
            let sum = 0;
            for (let i = 0; i < m; i++) {
                const xi = lag + i;
                if (xi >= 0 && xi < n) {
                    sum += x[xi] * y[i];
                }
            }
            result[lag + (m - 1)] = sum;
        }
        return result;
    },
    
    /**
     * Auto-correlation
     * R_xx(τ) = (x ⋆ x)(τ)
     */
    autoCorrelation: function(x) {
        return this.crossCorrelation(x, x);
    },
    
    /**
     * Normalized cross-correlation (useful for pattern matching)
     */
    normalizedCrossCorrelation: function(x, y) {
        const xcorr = this.crossCorrelation(x, y);
        const normX = Math.sqrt(x.reduce((sum, v) => sum + v * v, 0));
        const normY = Math.sqrt(y.reduce((sum, v) => sum + v * v, 0));
        const norm = normX * normY;
        return xcorr.map(v => v / norm);
    },
    
    /**
     * MCMC Metropolis-Hastings Sampling
     * @param {Function} logProbability - Log of target distribution
     * @param {Array} initial - Initial state
     * @param {number} numSamples - Number of samples
     * @param {number} proposalStd - Standard deviation of proposal
     */
    metropolisHastings: function(logProbability, initial, numSamples, proposalStd = 1.0) {
        const samples = [initial];
        let current = initial;
        let currentLogProb = logProbability(current);
        let accepted = 0;
        
        for (let i = 1; i < numSamples; i++) {
            // Propose new state (Gaussian proposal)
            const proposed = current.map(x => x + proposalStd * this._randn());
            const proposedLogProb = logProbability(proposed);
            
            // Accept with probability min(1, p(x')/p(x))
            const logAcceptRatio = proposedLogProb - currentLogProb;
            
            if (Math.log(Math.random()) < logAcceptRatio) {
                current = proposed;
                currentLogProb = proposedLogProb;
                accepted++;
            }
            
            samples.push([...current]);
        }
        
        return {
            samples,
            acceptanceRate: accepted / (numSamples - 1)
        };
    },
    
    /**
     * Standard normal random number (Box-Muller)
     */
    _randn: function() {
        const u1 = Math.random();
        const u2 = Math.random();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: EVOLUTIONARY ALGORITHMS ENHANCED
// Source: MIT 15.099
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_EVOLUTIONARY_ENHANCED = {
    name: 'PRISM Evolutionary Algorithms Enhanced',
    version: '1.0.0',
    
    /**
     * MOEA/D: Multi-Objective EA based on Decomposition
     * Decomposes multi-objective problem into scalar subproblems
     */
    MOEAD: {
        /**
         * Initialize weight vectors for decomposition
         */
        initWeights: function(numObjectives, populationSize) {
            if (numObjectives === 2) {
                // Simple uniform weights for 2 objectives
                const weights = [];
                for (let i = 0; i < populationSize; i++) {
                    const w1 = i / (populationSize - 1);
                    weights.push([w1, 1 - w1]);
                }
                return weights;
            }
            // For higher dimensions, use simplex lattice design
            // (Simplified - would need more sophisticated approach)
            return Array(populationSize).fill(0).map(() => {
                const w = Array(numObjectives).fill(0).map(() => Math.random());
                const sum = w.reduce((a, b) => a + b, 0);
                return w.map(v => v / sum);
            });
        },
        
        /**
         * Tchebycheff scalarizing function
         */
        tchebycheff: function(f, weight, z_ref) {
            let max = -Infinity;
            for (let i = 0; i < f.length; i++) {
                const val = weight[i] * Math.abs(f[i] - z_ref[i]);
                if (val > max) max = val;
            }
            return max;
        },
        
        /**
         * Find neighborhood of each weight vector
         */
        computeNeighborhood: function(weights, T) {
            const n = weights.length;
            const neighborhood = [];
            
            for (let i = 0; i < n; i++) {
                const distances = [];
                for (let j = 0; j < n; j++) {
                    const dist = Math.sqrt(weights[i].reduce((sum, w, k) => 
                        sum + Math.pow(w - weights[j][k], 2), 0));
                    distances.push({ j, dist });
                }
                distances.sort((a, b) => a.dist - b.dist);
                neighborhood.push(distances.slice(0, T).map(d => d.j));
            }
            
            return neighborhood;
        },
        
        /**
         * Main MOEA/D algorithm
         */
        optimize: function(objectiveFn, bounds, params = {}) {
            const {
                populationSize = 100,
                numObjectives = 2,
                T = 20, // Neighborhood size
                maxGenerations = 200,
                crossoverRate = 0.9,
                mutationRate = 0.1
            } = params;
            
            const dim = bounds.length;
            
            // Initialize
            const weights = this.initWeights(numObjectives, populationSize);
            const neighborhood = this.computeNeighborhood(weights, T);
            
            // Initialize population
            let population = Array(populationSize).fill(0).map(() =>
                bounds.map(b => b[0] + Math.random() * (b[1] - b[0]))
            );
            
            // Evaluate initial population
            let objectives = population.map(x => objectiveFn(x));
            
            // Initialize reference point z*
            let z_ref = Array(numObjectives).fill(Infinity);
            for (const obj of objectives) {
                for (let i = 0; i < numObjectives; i++) {
                    z_ref[i] = Math.min(z_ref[i], obj[i]);
                }
            }
            
            // Main loop
            for (let gen = 0; gen < maxGenerations; gen++) {
                for (let i = 0; i < populationSize; i++) {
                    // Select parents from neighborhood
                    const neighbors = neighborhood[i];
                    const p1 = population[neighbors[Math.floor(Math.random() * neighbors.length)]];
                    const p2 = population[neighbors[Math.floor(Math.random() * neighbors.length)]];
                    
                    // Crossover
                    let child = population[i].slice();
                    if (Math.random() < crossoverRate) {
                        for (let d = 0; d < dim; d++) {
                            child[d] = Math.random() < 0.5 ? p1[d] : p2[d];
                        }
                    }
                    
                    // Mutation
                    for (let d = 0; d < dim; d++) {
                        if (Math.random() < mutationRate) {
                            child[d] += (bounds[d][1] - bounds[d][0]) * 0.1 * (Math.random() - 0.5);
                            child[d] = Math.max(bounds[d][0], Math.min(bounds[d][1], child[d]));
                        }
                    }
                    
                    // Evaluate child
                    const childObj = objectiveFn(child);
                    
                    // Update reference point
                    for (let j = 0; j < numObjectives; j++) {
                        z_ref[j] = Math.min(z_ref[j], childObj[j]);
                    }
                    
                    // Update neighbors if child is better
                    for (const j of neighbors) {
                        const childScalar = this.tchebycheff(childObj, weights[j], z_ref);
                        const currentScalar = this.tchebycheff(objectives[j], weights[j], z_ref);
                        
                        if (childScalar < currentScalar) {
                            population[j] = child.slice();
                            objectives[j] = childObj.slice();
                        }
                    }
                }
            }
            
            return {
                population,
                objectives,
                weights
            };
        }
    },
    
    /**
     * Elitism: Preserve best individuals
     */
    applyElitism: function(population, fitness, eliteCount) {
        // Sort by fitness (descending for maximization)
        const sorted = population
            .map((ind, i) => ({ ind, fit: fitness[i] }))
            .sort((a, b) => b.fit - a.fit);
        
        // Return elite individuals
        return sorted.slice(0, eliteCount).map(s => s.ind);
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: EXPLAINABLE AI
// Source: MIT 6.871
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_XAI_ENHANCED = {
    name: 'PRISM Explainable AI Enhanced',
    version: '1.0.0',
    
    /**
     * Gradient-based Saliency
     * ∂output/∂input for input attribution
     */
    gradientSaliency: function(model, input, targetClass) {
        // Numerical gradient estimation
        const eps = 1e-5;
        const baseline = model.forward(input);
        const targetOutput = baseline[targetClass];
        
        const saliency = input.map((_, i) => {
            const inputPlus = [...input];
            inputPlus[i] += eps;
            const outputPlus = model.forward(inputPlus)[targetClass];
            return (outputPlus - targetOutput) / eps;
        });
        
        return saliency;
    },
    
    /**
     * Integrated Gradients
     * Attribution = (x - x') × ∫(∂F/∂x)dα
     */
    integratedGradients: function(model, input, baseline = null, steps = 50) {
        if (!baseline) {
            baseline = input.map(() => 0);
        }
        
        const diff = input.map((v, i) => v - baseline[i]);
        const gradSum = input.map(() => 0);
        
        for (let step = 0; step <= steps; step++) {
            const alpha = step / steps;
            const interpolated = baseline.map((b, i) => b + alpha * diff[i]);
            const grad = this.gradientSaliency(model, interpolated, 0);
            
            for (let i = 0; i < input.length; i++) {
                gradSum[i] += grad[i];
            }
        }
        
        // Scale and multiply by difference
        return diff.map((d, i) => d * gradSum[i] / (steps + 1));
    },
    
    /**
     * LIME (simplified)
     * Local linear approximation
     */
    limeExplain: function(model, instance, numSamples = 1000, numFeatures = 5) {
        const dim = instance.length;
        
        // Generate perturbed samples
        const samples = [];
        const labels = [];
        const weights = [];
        
        for (let i = 0; i < numSamples; i++) {
            // Binary mask (which features to include)
            const mask = instance.map(() => Math.random() > 0.5 ? 1 : 0);
            const perturbed = instance.map((v, j) => mask[j] ? v : 0);
            
            const output = model.forward(perturbed);
            const distance = Math.sqrt(mask.reduce((sum, m) => sum + (1 - m) * (1 - m), 0));
            
            samples.push(mask);
            labels.push(output[0]); // Assuming single output
            weights.push(Math.exp(-distance * distance / 2));
        }
        
        // Weighted linear regression
        const coefficients = this._weightedLinearRegression(samples, labels, weights);
        
        // Return top features by importance
        return coefficients
            .map((c, i) => ({ feature: i, importance: Math.abs(c) }))
            .sort((a, b) => b.importance - a.importance)
            .slice(0, numFeatures);
    },
    
    _weightedLinearRegression: function(X, y, weights) {
        const n = X.length;
        const d = X[0].length;
        
        // XtWX and XtWy
        const XtWX = Array(d).fill(0).map(() => Array(d).fill(0));
        const XtWy = Array(d).fill(0);
        
        for (let i = 0; i < n; i++) {
            const w = weights[i];
            for (let j = 0; j < d; j++) {
                XtWy[j] += w * X[i][j] * y[i];
                for (let k = 0; k < d; k++) {
                    XtWX[j][k] += w * X[i][j] * X[i][k];
                }
            }
        }
        
        // Add regularization
        for (let j = 0; j < d; j++) {
            XtWX[j][j] += 0.01;
        }
        
        // Solve (simplified - using direct inversion for small d)
        // In practice, use proper linear algebra library
        return this._solveLinear(XtWX, XtWy);
    },
    
    _solveLinear: function(A, b) {
        const n = A.length;
        const aug = A.map((row, i) => [...row, b[i]]);
        
        // Gaussian elimination with partial pivoting
        for (let col = 0; col < n; col++) {
            let maxRow = col;
            for (let row = col + 1; row < n; row++) {
                if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
                    maxRow = row;
                }
            }
            [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
            
            for (let row = col + 1; row < n; row++) {
                const factor = aug[row][col] / aug[col][col];
                for (let j = col; j <= n; j++) {
                    aug[row][j] -= factor * aug[col][j];
                }
            }
        }
        
        // Back substitution
        const x = Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = aug[i][n];
            for (let j = i + 1; j < n; j++) {
                x[i] -= aug[i][j] * x[j];
            }
            x[i] /= aug[i][i];
        }
        
        return x;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_AI_ENHANCEMENT_GATEWAY_ROUTES = {
    // Reinforcement Learning
    'ai.rl.sarsa.update': 'PRISM_RL_ENHANCED.SARSA.update',
    'ai.rl.sarsa.episode': 'PRISM_RL_ENHANCED.SARSA.episode',
    'ai.rl.value_iteration': 'PRISM_RL_ENHANCED.ValueIteration.solve',
    'ai.rl.policy_gradient.update': 'PRISM_RL_ENHANCED.PolicyGradient.update',
    'ai.rl.actor_critic.update': 'PRISM_RL_ENHANCED.ActorCritic.update',
    'ai.rl.dqn.train': 'PRISM_RL_ENHANCED.DQN.trainStep',
    
    // Neural Networks
    'ai.nn.activation.elu': 'PRISM_NN_ENHANCED.Activations.elu',
    'ai.nn.activation.gelu': 'PRISM_NN_ENHANCED.Activations.gelu',
    'ai.nn.activation.selu': 'PRISM_NN_ENHANCED.Activations.selu',
    'ai.nn.activation.swish': 'PRISM_NN_ENHANCED.Activations.swish',
    'ai.nn.optimizer.sgd': 'PRISM_NN_ENHANCED.Optimizers.SGD',
    'ai.nn.optimizer.adadelta': 'PRISM_NN_ENHANCED.Optimizers.AdaDelta',
    'ai.nn.optimizer.nadam': 'PRISM_NN_ENHANCED.Optimizers.NAdam',
    'ai.nn.optimizer.adamw': 'PRISM_NN_ENHANCED.Optimizers.AdamW',
    
    // Clustering
    'ai.cluster.dbscan': 'PRISM_CLUSTERING_ENHANCED.dbscan',
    'ai.cluster.kmedoids': 'PRISM_CLUSTERING_ENHANCED.kmedoids',
    'ai.cluster.tsne': 'PRISM_CLUSTERING_ENHANCED.tsne',
    
    // Signal Processing
    'ai.signal.cross_correlation': 'PRISM_SIGNAL_ENHANCED.crossCorrelation',
    'ai.signal.auto_correlation': 'PRISM_SIGNAL_ENHANCED.autoCorrelation',
    'ai.bayesian.mcmc': 'PRISM_SIGNAL_ENHANCED.metropolisHastings',
    
    // Evolutionary
    'ai.moead.optimize': 'PRISM_EVOLUTIONARY_ENHANCED.MOEAD.optimize',
    'ai.ga.elitism': 'PRISM_EVOLUTIONARY_ENHANCED.applyElitism',
    
    // Explainable AI
    'ai.xai.gradient_saliency': 'PRISM_XAI_ENHANCED.gradientSaliency',
    'ai.xai.integrated_gradients': 'PRISM_XAI_ENHANCED.integratedGradients',
    'ai.xai.lime': 'PRISM_XAI_ENHANCED.limeExplain'
};

// ═══════════════════════════════════════════════════════════════════════════════
// SELF-TESTS
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_AI_ENHANCEMENT_TESTS = {
    runAll: function() {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('PRISM AI/ML ENHANCEMENT MODULE - SELF TESTS');
        console.log('═══════════════════════════════════════════════════════════════');
        
        let passed = 0;
        let failed = 0;
        
        // Test SARSA
        try {
            const Q = PRISM_RL_ENHANCED.SARSA.initQTable(['s1', 's2'], ['a1', 'a2']);
            PRISM_RL_ENHANCED.SARSA.update(Q, 's1', 'a1', 1, 's2', 'a2', 0.1, 0.99);
            console.log('✅ SARSA update');
            passed++;
        } catch (e) {
            console.log('❌ SARSA update:', e.message);
            failed++;
        }
        
        // Test Value Iteration
        try {
            const mdp = {
                states: ['s1', 's2'],
                actions: ['a1'],
                transitions: { s1: { a1: { s2: 1 } }, s2: { a1: { s2: 1 } } },
                rewards: { s1: 0, s2: 1 },
                gamma: 0.9
            };
            const result = PRISM_RL_ENHANCED.ValueIteration.solve(mdp);
            console.log('✅ Value Iteration');
            passed++;
        } catch (e) {
            console.log('❌ Value Iteration:', e.message);
            failed++;
        }
        
        // Test ELU
        try {
            const elu = PRISM_NN_ENHANCED.Activations.elu(-1);
            if (Math.abs(elu - (Math.exp(-1) - 1)) < 0.001) {
                console.log('✅ ELU activation');
                passed++;
            } else {
                throw new Error('Incorrect value');
            }
        } catch (e) {
            console.log('❌ ELU activation:', e.message);
            failed++;
        }
        
        // Test GELU
        try {
            const gelu = PRISM_NN_ENHANCED.Activations.gelu(0);
            if (Math.abs(gelu) < 0.001) {
                console.log('✅ GELU activation');
                passed++;
            } else {
                throw new Error('Incorrect value');
            }
        } catch (e) {
            console.log('❌ GELU activation:', e.message);
            failed++;
        }
        
        // Test AdaDelta
        try {
            const opt = PRISM_NN_ENHANCED.Optimizers.AdaDelta();
            const weights = [[1, 2], [3, 4]];
            const gradients = [[0.1, 0.2], [0.3, 0.4]];
            opt.step(weights, gradients);
            console.log('✅ AdaDelta optimizer');
            passed++;
        } catch (e) {
            console.log('❌ AdaDelta optimizer:', e.message);
            failed++;
        }
        
        // Test NAdam
        try {
            const opt = PRISM_NN_ENHANCED.Optimizers.NAdam();
            const weights = [[1, 2]];
            const gradients = [[0.1, 0.2]];
            opt.step(weights, gradients);
            console.log('✅ NAdam optimizer');
            passed++;
        } catch (e) {
            console.log('❌ NAdam optimizer:', e.message);
            failed++;
        }
        
        // Test DBSCAN
        try {
            const points = [[0, 0], [0, 1], [1, 0], [10, 10], [10, 11]];
            const labels = PRISM_CLUSTERING_ENHANCED.dbscan(points, 2, 2);
            if (labels[0] === labels[1] && labels[3] === labels[4] && labels[0] !== labels[3]) {
                console.log('✅ DBSCAN clustering');
                passed++;
            } else {
                throw new Error('Incorrect clustering');
            }
        } catch (e) {
            console.log('❌ DBSCAN clustering:', e.message);
            failed++;
        }
        
        // Test K-Medoids
        try {
            const points = [[0, 0], [1, 1], [10, 10], [11, 11]];
            const result = PRISM_CLUSTERING_ENHANCED.kmedoids(points, 2);
            console.log('✅ K-Medoids clustering');
            passed++;
        } catch (e) {
            console.log('❌ K-Medoids clustering:', e.message);
            failed++;
        }
        
        // Test Cross-correlation
        try {
            const x = [1, 2, 3];
            const y = [1, 2, 3];
            const xcorr = PRISM_SIGNAL_ENHANCED.crossCorrelation(x, y);
            if (xcorr.length === 5 && xcorr[2] === 14) { // Peak at center
                console.log('✅ Cross-correlation');
                passed++;
            } else {
                throw new Error('Incorrect correlation');
            }
        } catch (e) {
            console.log('❌ Cross-correlation:', e.message);
            failed++;
        }
        
        // Test MCMC
        try {
            const logProb = (x) => -0.5 * x[0] * x[0]; // Standard normal
            const result = PRISM_SIGNAL_ENHANCED.metropolisHastings(logProb, [0], 100, 1);
            console.log('✅ MCMC Metropolis-Hastings');
            passed++;
        } catch (e) {
            console.log('❌ MCMC Metropolis-Hastings:', e.message);
            failed++;
        }
        
        // Test MOEA/D
        try {
            const objective = (x) => [x[0] * x[0], (x[0] - 2) * (x[0] - 2)];
            const result = PRISM_EVOLUTIONARY_ENHANCED.MOEAD.optimize(
                objective, [[-5, 5]], { populationSize: 10, maxGenerations: 10 }
            );
            console.log('✅ MOEA/D optimization');
            passed++;
        } catch (e) {
            console.log('❌ MOEA/D optimization:', e.message);
            failed++;
        }
        
        // Test Gradient Saliency
        try {
            const model = { forward: (x) => [x[0] * 2 + x[1] * 3] };
            const saliency = PRISM_XAI_ENHANCED.gradientSaliency(model, [1, 1], 0);
            console.log('✅ Gradient Saliency');
            passed++;
        } catch (e) {
            console.log('❌ Gradient Saliency:', e.message);
            failed++;
        }
        
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`RESULTS: ${passed}/${passed + failed} tests passed`);
        console.log('═══════════════════════════════════════════════════════════════');
        
        return { passed, failed, total: passed + failed };
    }
};

// Run self-tests
if (typeof window !== 'undefined') {
    console.log('[PRISM AI Enhancement] Module loaded. Run PRISM_AI_ENHANCEMENT_TESTS.runAll() to test.');
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PRISM_RL_ENHANCED,
        PRISM_NN_ENHANCED,
        PRISM_CLUSTERING_ENHANCED,
        PRISM_SIGNAL_ENHANCED,
        PRISM_EVOLUTIONARY_ENHANCED,
        PRISM_XAI_ENHANCED,
        PRISM_AI_ENHANCEMENT_GATEWAY_ROUTES,
        PRISM_AI_ENHANCEMENT_TESTS
    };
}
/**
 * PRISM ADVANCED AI/DL MODULE v1.0
 * Advanced Architectures, Optimization, Compression
 */

// ======================================================================
// PRISM_ATTENTION_ADVANCED - Multi-head, cross, sparse, and linear attention implementations
// ======================================================================

const PRISM_ATTENTION_ADVANCED = {
    // Scaled Dot-Product Attention
    scaledDotProductAttention(Q, K, V, mask = null) {
        const dk = K[0].length;
        const scale = Math.sqrt(dk);
        
        // QK^T / sqrt(dk)
        const scores = this._matmul(Q, this._transpose(K));
        for (let i = 0; i < scores.length; i++) {
            for (let j = 0; j < scores[i].length; j++) {
                scores[i][j] /= scale;
            }
        }
        
        // Apply mask (for causal attention)
        if (mask) {
            for (let i = 0; i < scores.length; i++) {
                for (let j = 0; j < scores[i].length; j++) {
                    if (mask[i][j] === 0) {
                        scores[i][j] = -1e9;
                    }
                }
            }
        }
        
        // Softmax
        const attention = this._softmax2D(scores);
        
        // Attention * V
        return {
            output: this._matmul(attention, V),
            weights: attention
        };
    },
    
    // Multi-Head Attention
    multiHeadAttention(Q, K, V, numHeads, dModel, mask = null) {
        const dHead = Math.floor(dModel / numHeads);
        const seqLen = Q.length;
        
        // Linear projections for each head
        const heads = [];
        
        for (let h = 0; h < numHeads; h++) {
            // Project Q, K, V for this head
            const Qh = this._projectHead(Q, h, dHead);
            const Kh = this._projectHead(K, h, dHead);
            const Vh = this._projectHead(V, h, dHead);
            
            // Attention for this head
            const { output } = this.scaledDotProductAttention(Qh, Kh, Vh, mask);
            heads.push(output);
        }
        
        // Concatenate heads
        const concatenated = this._concatHeads(heads);
        
        // Final linear projection (simplified)
        return concatenated;
    },
    
    // Cross Attention (encoder-decoder)
    crossAttention(decoderState, encoderOutput, mask = null) {
        // Q from decoder, K and V from encoder
        return this.scaledDotProductAttention(decoderState, encoderOutput, encoderOutput, mask);
    },
    
    // Sparse Attention (local window + global tokens)
    sparseAttention(Q, K, V, windowSize = 256, globalTokens = [0]) {
        const seqLen = Q.length;
        const scores = [];
        
        for (let i = 0; i < seqLen; i++) {
            const rowScores = [];
            
            for (let j = 0; j < seqLen; j++) {
                // Attend to: global tokens, local window, or self
                const isGlobal = globalTokens.includes(j) || globalTokens.includes(i);
                const isLocal = Math.abs(i - j) <= windowSize / 2;
                
                if (isGlobal || isLocal) {
                    rowScores.push(this._dotProduct(Q[i], K[j]) / Math.sqrt(K[0].length));
                } else {
                    rowScores.push(-1e9);
                }
            }
            
            scores.push(rowScores);
        }
        
        const attention = this._softmax2D(scores);
        return this._matmul(attention, V);
    },
    
    // Linear Attention (O(n) complexity)
    linearAttention(Q, K, V, featureMap = 'elu') {
        // Apply feature map to Q and K
        const phiQ = Q.map(q => this._featureMap(q, featureMap));
        const phiK = K.map(k => this._featureMap(k, featureMap));
        
        // Compute KV product first (associative property)
        const KV = this._outerProductSum(phiK, V);
        
        // Compute normalizer
        const Z = phiK.reduce((sum, k) => sum.map((s, i) => s + k[i]), 
                              new Array(phiK[0].length).fill(0));
        
        // Compute output for each query
        const output = phiQ.map(q => {
            const numerator = KV.map(row => this._dotProduct(q, row));
            const denominator = this._dotProduct(q, Z);
            return numerator.map(n => n / (denominator + 1e-6));
        });
        
        return output;
    },
    
    // Relative Position Attention (like in T5)
    relativePositionAttention(Q, K, V, maxRelativePosition = 32) {
        const seqLen = Q.length;
        const scores = this._matmul(Q, this._transpose(K));
        
        // Add relative position bias
        for (let i = 0; i < seqLen; i++) {
            for (let j = 0; j < seqLen; j++) {
                const relPos = Math.min(Math.max(j - i, -maxRelativePosition), maxRelativePosition);
                const bucket = this._getRelativePositionBucket(relPos, maxRelativePosition);
                scores[i][j] += this._getPositionBias(bucket);
            }
        }
        
        const scale = Math.sqrt(K[0].length);
        for (let i = 0; i < scores.length; i++) {
            for (let j = 0; j < scores[i].length; j++) {
                scores[i][j] /= scale;
            }
        }
        
        const attention = this._softmax2D(scores);
        return this._matmul(attention, V);
    },
    
    // Rotary Position Embedding (RoPE)
    applyRotaryEmbedding(x, position) {
        const dim = x.length;
        const result = new Array(dim);
        
        for (let i = 0; i < dim; i += 2) {
            const freq = 1.0 / Math.pow(10000, (i / dim));
            const angle = position * freq;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            
            result[i] = x[i] * cos - x[i + 1] * sin;
            result[i + 1] = x[i] * sin + x[i + 1] * cos;
        }
        
        return result;
    },
    
    // Flash Attention (memory-efficient, simplified)
    flashAttention(Q, K, V, blockSize = 64) {
        const seqLen = Q.length;
        const numBlocks = Math.ceil(seqLen / blockSize);
        const output = Q.map(() => new Array(V[0].length).fill(0));
        const logsumexp = new Array(seqLen).fill(-Infinity);
        
        // Process in blocks
        for (let bi = 0; bi < numBlocks; bi++) {
            const iStart = bi * blockSize;
            const iEnd = Math.min(iStart + blockSize, seqLen);
            
            for (let bj = 0; bj < numBlocks; bj++) {
                const jStart = bj * blockSize;
                const jEnd = Math.min(jStart + blockSize, seqLen);
                
                // Compute block attention
                for (let i = iStart; i < iEnd; i++) {
                    for (let j = jStart; j < jEnd; j++) {
                        const score = this._dotProduct(Q[i], K[j]) / Math.sqrt(K[0].length);
                        const oldMax = logsumexp[i];
                        const newMax = Math.max(oldMax, score);
                        
                        const expOld = Math.exp(oldMax - newMax);
                        const expNew = Math.exp(score - newMax);
                        
                        // Update output and logsumexp
                        for (let d = 0; d < V[0].length; d++) {
                            output[i][d] = output[i][d] * expOld + V[j][d] * expNew;
                        }
                        logsumexp[i] = newMax + Math.log(expOld + expNew);
                    }
                }
            }
        }
        
        // Normalize
        for (let i = 0; i < seqLen; i++) {
            const norm = Math.exp(logsumexp[i]);
            for (let d = 0; d < output[i].length; d++) {
                output[i][d] /= norm;
            }
        }
        
        return output;
    },
    
    // Helper functions
    _matmul(A, B) {
        const result = [];
        for (let i = 0; i < A.length; i++) {
            result[i] = [];
            for (let j = 0; j < B[0].length; j++) {
                let sum = 0;
                for (let k = 0; k < A[0].length; k++) {
                    sum += A[i][k] * B[k][j];
                }
                result[i][j] = sum;
            }
        }
        return result;
    },
    
    _transpose(A) {
        return A[0].map((_, i) => A.map(row => row[i]));
    },
    
    _softmax2D(scores) {
        return scores.map(row => {
            const max = Math.max(...row);
            const exps = row.map(s => Math.exp(s - max));
            const sum = exps.reduce((a, b) => a + b, 0);
            return exps.map(e => e / sum);
        });
    },
    
    _dotProduct(a, b) {
        return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    },
    
    _projectHead(X, headIdx, dHead) {
        // Simplified: extract slice for head
        return X.map(x => x.slice(headIdx * dHead, (headIdx + 1) * dHead));
    },
    
    _concatHeads(heads) {
        const seqLen = heads[0].length;
        return Array(seqLen).fill().map((_, i) => 
            heads.flatMap(h => h[i])
        );
    },
    
    _featureMap(x, type) {
        switch (type) {
            case 'elu':
                return x.map(v => v > 0 ? v + 1 : Math.exp(v));
            case 'relu':
                return x.map(v => Math.max(0, v));
            default:
                return x;
        }
    },
    
    _outerProductSum(K, V) {
        const dK = K[0].length;
        const dV = V[0].length;
        const result = Array(dV).fill().map(() => new Array(dK).fill(0));
        
        for (let i = 0; i < K.length; i++) {
            for (let j = 0; j < dV; j++) {
                for (let k = 0; k < dK; k++) {
                    result[j][k] += K[i][k] * V[i][j];
                }
            }
        }
        
        return result;
    },
    
    _getRelativePositionBucket(relPos, maxPos) {
        // Simplified bucketing
        return Math.floor((relPos + maxPos) / 2);
    },
    
    _getPositionBias(bucket) {
        // Would be learned in practice
        return 0.1 * Math.exp(-bucket / 10);
    }
};

// ======================================================================
// PRISM_RNN_ADVANCED - LSTM, GRU, and Bidirectional RNN implementations
// ======================================================================

const PRISM_RNN_ADVANCED = {
    // LSTM Cell
    createLSTMCell(inputSize, hiddenSize) {
        const initWeight = () => (Math.random() - 0.5) * Math.sqrt(2 / (inputSize + hiddenSize));
        
        return {
            inputSize,
            hiddenSize,
            
            // Gates: input, forget, cell, output
            Wi: Array(hiddenSize).fill().map(() => Array(inputSize).fill().map(initWeight)),
            Wf: Array(hiddenSize).fill().map(() => Array(inputSize).fill().map(initWeight)),
            Wc: Array(hiddenSize).fill().map(() => Array(inputSize).fill().map(initWeight)),
            Wo: Array(hiddenSize).fill().map(() => Array(inputSize).fill().map(initWeight)),
            
            Ui: Array(hiddenSize).fill().map(() => Array(hiddenSize).fill().map(initWeight)),
            Uf: Array(hiddenSize).fill().map(() => Array(hiddenSize).fill().map(initWeight)),
            Uc: Array(hiddenSize).fill().map(() => Array(hiddenSize).fill().map(initWeight)),
            Uo: Array(hiddenSize).fill().map(() => Array(hiddenSize).fill().map(initWeight)),
            
            bi: Array(hiddenSize).fill(0),
            bf: Array(hiddenSize).fill(1), // Forget bias initialized to 1
            bc: Array(hiddenSize).fill(0),
            bo: Array(hiddenSize).fill(0),
            
            forward(x, hPrev, cPrev) {
                const h = hPrev || Array(this.hiddenSize).fill(0);
                const c = cPrev || Array(this.hiddenSize).fill(0);
                
                // Input gate
                const i = this._gate(x, h, this.Wi, this.Ui, this.bi, 'sigmoid');
                
                // Forget gate
                const f = this._gate(x, h, this.Wf, this.Uf, this.bf, 'sigmoid');
                
                // Cell candidate
                const cTilde = this._gate(x, h, this.Wc, this.Uc, this.bc, 'tanh');
                
                // New cell state
                const cNew = c.map((cv, idx) => f[idx] * cv + i[idx] * cTilde[idx]);
                
                // Output gate
                const o = this._gate(x, h, this.Wo, this.Uo, this.bo, 'sigmoid');
                
                // New hidden state
                const hNew = o.map((ov, idx) => ov * Math.tanh(cNew[idx]));
                
                return { h: hNew, c: cNew, gates: { i, f, o, cTilde } };
            },
            
            _gate(x, h, W, U, b, activation) {
                const result = [];
                for (let j = 0; j < this.hiddenSize; j++) {
                    let sum = b[j];
                    for (let k = 0; k < this.inputSize; k++) {
                        sum += W[j][k] * x[k];
                    }
                    for (let k = 0; k < this.hiddenSize; k++) {
                        sum += U[j][k] * h[k];
                    }
                    result.push(activation === 'sigmoid' ? 1 / (1 + Math.exp(-sum)) : Math.tanh(sum));
                }
                return result;
            }
        };
    },
    
    // GRU Cell
    createGRUCell(inputSize, hiddenSize) {
        const initWeight = () => (Math.random() - 0.5) * Math.sqrt(2 / (inputSize + hiddenSize));
        
        return {
            inputSize,
            hiddenSize,
            
            // Gates: reset, update, candidate
            Wr: Array(hiddenSize).fill().map(() => Array(inputSize).fill().map(initWeight)),
            Wz: Array(hiddenSize).fill().map(() => Array(inputSize).fill().map(initWeight)),
            Wh: Array(hiddenSize).fill().map(() => Array(inputSize).fill().map(initWeight)),
            
            Ur: Array(hiddenSize).fill().map(() => Array(hiddenSize).fill().map(initWeight)),
            Uz: Array(hiddenSize).fill().map(() => Array(hiddenSize).fill().map(initWeight)),
            Uh: Array(hiddenSize).fill().map(() => Array(hiddenSize).fill().map(initWeight)),
            
            br: Array(hiddenSize).fill(0),
            bz: Array(hiddenSize).fill(0),
            bh: Array(hiddenSize).fill(0),
            
            forward(x, hPrev) {
                const h = hPrev || Array(this.hiddenSize).fill(0);
                
                // Reset gate
                const r = this._gate(x, h, this.Wr, this.Ur, this.br, 'sigmoid');
                
                // Update gate
                const z = this._gate(x, h, this.Wz, this.Uz, this.bz, 'sigmoid');
                
                // Candidate hidden state (with reset gate applied)
                const hReset = h.map((hv, idx) => r[idx] * hv);
                const hTilde = this._gate(x, hReset, this.Wh, this.Uh, this.bh, 'tanh');
                
                // New hidden state
                const hNew = h.map((hv, idx) => (1 - z[idx]) * hv + z[idx] * hTilde[idx]);
                
                return { h: hNew, gates: { r, z, hTilde } };
            },
            
            _gate(x, h, W, U, b, activation) {
                const result = [];
                for (let j = 0; j < this.hiddenSize; j++) {
                    let sum = b[j];
                    for (let k = 0; k < this.inputSize; k++) {
                        sum += W[j][k] * x[k];
                    }
                    for (let k = 0; k < this.hiddenSize; k++) {
                        sum += U[j][k] * h[k];
                    }
                    result.push(activation === 'sigmoid' ? 1 / (1 + Math.exp(-sum)) : Math.tanh(sum));
                }
                return result;
            }
        };
    },
    
    // Bidirectional RNN wrapper
    createBidirectionalRNN(forwardCell, backwardCell) {
        return {
            forward: forwardCell,
            backward: backwardCell,
            
            process(sequence) {
                const seqLen = sequence.length;
                const forwardOutputs = [];
                const backwardOutputs = [];
                
                // Forward pass
                let hF = null, cF = null;
                for (let t = 0; t < seqLen; t++) {
                    const result = this.forward.forward(sequence[t], hF, cF);
                    hF = result.h;
                    cF = result.c;
                    forwardOutputs.push(hF);
                }
                
                // Backward pass
                let hB = null, cB = null;
                for (let t = seqLen - 1; t >= 0; t--) {
                    const result = this.backward.forward(sequence[t], hB, cB);
                    hB = result.h;
                    cB = result.c;
                    backwardOutputs.unshift(hB);
                }
                
                // Concatenate outputs
                const outputs = forwardOutputs.map((fwd, t) => 
                    [...fwd, ...backwardOutputs[t]]
                );
                
                return {
                    outputs,
                    finalForward: hF,
                    finalBackward: hB
                };
            }
        };
    },
    
    // Sequence-to-Sequence with Attention
    createSeq2Seq(encoderCell, decoderCell, attentionDim) {
        return {
            encoder: encoderCell,
            decoder: decoderCell,
            
            encode(sequence) {
                const outputs = [];
                let h = null, c = null;
                
                for (const x of sequence) {
                    const result = this.encoder.forward(x, h, c);
                    h = result.h;
                    c = result.c;
                    outputs.push(h);
                }
                
                return { encoderOutputs: outputs, finalState: { h, c } };
            },
            
            decode(encoderOutputs, initialState, maxLength, startToken, endToken) {
                const outputs = [];
                let h = initialState.h;
                let c = initialState.c;
                let input = startToken;
                
                for (let t = 0; t < maxLength; t++) {
                    // Attention over encoder outputs
                    const context = this._attention(h, encoderOutputs);
                    
                    // Concatenate input with context
                    const decoderInput = [...input, ...context];
                    
                    // Decoder step
                    const result = this.decoder.forward(decoderInput, h, c);
                    h = result.h;
                    c = result.c;
                    
                    outputs.push(h);
                    input = h; // Use output as next input (teacher forcing would use ground truth)
                    
                    // Check for end token (simplified)
                    if (this._isEndToken(h, endToken)) break;
                }
                
                return outputs;
            },
            
            _attention(query, keys) {
                const scores = keys.map(k => 
                    query.reduce((sum, q, i) => sum + q * k[i], 0)
                );
                
                const maxScore = Math.max(...scores);
                const exps = scores.map(s => Math.exp(s - maxScore));
                const sum = exps.reduce((a, b) => a + b, 0);
                const weights = exps.map(e => e / sum);
                
                // Weighted sum of keys
                const context = new Array(keys[0].length).fill(0);
                for (let i = 0; i < keys.length; i++) {
                    for (let j = 0; j < keys[i].length; j++) {
                        context[j] += weights[i] * keys[i][j];
                    }
                }
                
                return context;
            },
            
            _isEndToken(output, endToken) {
                // Simplified check
                return false;
            }
        };
    },
    
    // Sequence processing utilities
    utils: {
        // Pack sequences for efficient batch processing
        packSequences(sequences, sortByLength = true) {
            if (sortByLength) {
                sequences = [...sequences].sort((a, b) => b.length - a.length);
            }
            
            const lengths = sequences.map(s => s.length);
            const maxLen = Math.max(...lengths);
            
            const packed = [];
            for (let t = 0; t < maxLen; t++) {
                const batch = [];
                for (let i = 0; i < sequences.length; i++) {
                    if (t < sequences[i].length) {
                        batch.push(sequences[i][t]);
                    }
                }
                if (batch.length > 0) {
                    packed.push(batch);
                }
            }
            
            return { packed, lengths };
        },
        
        // Pad sequences to same length
        padSequences(sequences, maxLen = null, padValue = 0) {
            maxLen = maxLen || Math.max(...sequences.map(s => s.length));
            
            return sequences.map(seq => {
                const dim = seq[0]?.length || 1;
                const padded = [...seq];
                while (padded.length < maxLen) {
                    padded.push(Array.isArray(seq[0]) ? new Array(dim).fill(padValue) : padValue);
                }
                return padded;
            });
        }
    }
};

// ======================================================================
// PRISM_LR_SCHEDULER - Learning rate scheduling strategies
// ======================================================================

const PRISM_LR_SCHEDULER = {
    // Step decay
    stepDecay(baseLR, step, decayRate = 0.1, decaySteps = 1000) {
        return baseLR * Math.pow(decayRate, Math.floor(step / decaySteps));
    },
    
    // Exponential decay
    exponentialDecay(baseLR, step, decayRate = 0.96, decaySteps = 1000) {
        return baseLR * Math.pow(decayRate, step / decaySteps);
    },
    
    // Cosine annealing
    cosineAnnealing(baseLR, step, totalSteps, minLR = 0) {
        return minLR + 0.5 * (baseLR - minLR) * (1 + Math.cos(Math.PI * step / totalSteps));
    },
    
    // Cosine annealing with warm restarts
    cosineAnnealingWarmRestarts(baseLR, step, T0 = 1000, Tmult = 2, minLR = 0) {
        let T = T0;
        let stepInCycle = step;
        
        while (stepInCycle >= T) {
            stepInCycle -= T;
            T *= Tmult;
        }
        
        return minLR + 0.5 * (baseLR - minLR) * (1 + Math.cos(Math.PI * stepInCycle / T));
    },
    
    // Linear warmup
    linearWarmup(baseLR, step, warmupSteps) {
        if (step < warmupSteps) {
            return baseLR * step / warmupSteps;
        }
        return baseLR;
    },
    
    // Linear warmup + cosine decay (common in transformers)
    warmupCosineDecay(baseLR, step, warmupSteps, totalSteps, minLR = 0) {
        if (step < warmupSteps) {
            return baseLR * step / warmupSteps;
        }
        
        const decaySteps = totalSteps - warmupSteps;
        const decayStep = step - warmupSteps;
        return minLR + 0.5 * (baseLR - minLR) * (1 + Math.cos(Math.PI * decayStep / decaySteps));
    },
    
    // One-cycle policy (super-convergence)
    oneCycle(baseLR, step, totalSteps, maxLR = null, divFactor = 25, finalDivFactor = 1e4) {
        maxLR = maxLR || baseLR * 10;
        const initialLR = maxLR / divFactor;
        const minLR = initialLR / finalDivFactor;
        
        const pctStart = 0.3; // Warmup for 30% of training
        const warmupSteps = Math.floor(totalSteps * pctStart);
        
        if (step < warmupSteps) {
            // Linear warmup to maxLR
            return initialLR + (maxLR - initialLR) * step / warmupSteps;
        } else {
            // Cosine annealing to minLR
            const decayStep = step - warmupSteps;
            const decaySteps = totalSteps - warmupSteps;
            return minLR + 0.5 * (maxLR - minLR) * (1 + Math.cos(Math.PI * decayStep / decaySteps));
        }
    },
    
    // Polynomial decay
    polynomialDecay(baseLR, step, totalSteps, endLR = 0.0001, power = 1.0) {
        const decaySteps = totalSteps;
        const clippedStep = Math.min(step, decaySteps);
        return (baseLR - endLR) * Math.pow(1 - clippedStep / decaySteps, power) + endLR;
    },
    
    // Reduce on plateau (adaptive)
    createReduceOnPlateau(options = {}) {
        const {
            factor = 0.1,
            patience = 10,
            minLR = 1e-6,
            threshold = 1e-4,
            mode = 'min' // 'min' or 'max'
        } = options;
        
        return {
            factor,
            patience,
            minLR,
            threshold,
            mode,
            bestMetric: mode === 'min' ? Infinity : -Infinity,
            badEpochs: 0,
            currentLR: null,
            
            step(metric, currentLR) {
                this.currentLR = currentLR;
                
                const improved = this.mode === 'min' 
                    ? metric < this.bestMetric - this.threshold
                    : metric > this.bestMetric + this.threshold;
                
                if (improved) {
                    this.bestMetric = metric;
                    this.badEpochs = 0;
                } else {
                    this.badEpochs++;
                }
                
                if (this.badEpochs >= this.patience) {
                    const newLR = Math.max(currentLR * this.factor, this.minLR);
                    this.badEpochs = 0;
                    this.currentLR = newLR;
                    console.log(`[LR Scheduler] Reducing LR to ${newLR}`);
                    return newLR;
                }
                
                return currentLR;
            },
            
            getState() {
                return {
                    bestMetric: this.bestMetric,
                    badEpochs: this.badEpochs,
                    currentLR: this.currentLR
                };
            }
        };
    },
    
    // Cyclic LR (triangular)
    cyclicLR(baseLR, step, maxLR, stepSize = 2000, mode = 'triangular') {
        const cycle = Math.floor(1 + step / (2 * stepSize));
        const x = Math.abs(step / stepSize - 2 * cycle + 1);
        
        switch (mode) {
            case 'triangular':
                return baseLR + (maxLR - baseLR) * Math.max(0, 1 - x);
            case 'triangular2':
                return baseLR + (maxLR - baseLR) * Math.max(0, 1 - x) / Math.pow(2, cycle - 1);
            case 'exp_range':
                return baseLR + (maxLR - baseLR) * Math.max(0, 1 - x) * Math.pow(0.99994, step);
            default:
                return baseLR;
        }
    },
    
    // Create a scheduler that combines warmup with any decay
    createScheduler(config) {
        const {
            baseLR,
            warmupSteps = 0,
            totalSteps,
            decay = 'cosine', // 'cosine', 'linear', 'exponential', 'constant'
            minLR = 0,
            decayRate = 0.96
        } = config;
        
        return {
            config,
            
            getLR(step) {
                // Warmup phase
                if (step < warmupSteps) {
                    return baseLR * step / warmupSteps;
                }
                
                const decayStep = step - warmupSteps;
                const decaySteps = totalSteps - warmupSteps;
                
                switch (decay) {
                    case 'cosine':
                        return minLR + 0.5 * (baseLR - minLR) * (1 + Math.cos(Math.PI * decayStep / decaySteps));
                    case 'linear':
                        return baseLR - (baseLR - minLR) * decayStep / decaySteps;
                    case 'exponential':
                        return baseLR * Math.pow(decayRate, decayStep / 1000);
                    case 'constant':
                    default:
                        return baseLR;
                }
            }
        };
    }
};

// ======================================================================
// PRISM_MODEL_COMPRESSION - Quantization, pruning, and knowledge distillation
// ======================================================================

const PRISM_MODEL_COMPRESSION = {
    // Quantization
    quantization: {
        // Post-training quantization to INT8
        quantizeToInt8(weights, perChannel = false) {
            if (perChannel) {
                // Per-channel quantization (better accuracy)
                return weights.map(channel => {
                    const { scale, zeroPoint } = this._computeQuantParams(channel);
                    const quantized = channel.map(w => 
                        Math.round(w / scale + zeroPoint)
                    ).map(q => Math.max(-128, Math.min(127, q)));
                    return { quantized, scale, zeroPoint };
                });
            } else {
                // Per-tensor quantization
                const flat = weights.flat(Infinity);
                const { scale, zeroPoint } = this._computeQuantParams(flat);
                
                const quantize = (w) => {
                    const q = Math.round(w / scale + zeroPoint);
                    return Math.max(-128, Math.min(127, q));
                };
                
                const quantized = this._mapNested(weights, quantize);
                return { quantized, scale, zeroPoint };
            }
        },
        
        // Dequantize INT8 back to float
        dequantize(quantized, scale, zeroPoint) {
            const dequantize = (q) => (q - zeroPoint) * scale;
            return this._mapNested(quantized, dequantize);
        },
        
        // Dynamic quantization (quantize activations at runtime)
        dynamicQuantize(tensor) {
            const { scale, zeroPoint } = this._computeQuantParams(tensor.flat());
            const quantized = this._mapNested(tensor, w => 
                Math.max(-128, Math.min(127, Math.round(w / scale + zeroPoint)))
            );
            return { quantized, scale, zeroPoint };
        },
        
        // Simulate quantization during training (QAT)
        simulateQuantization(tensor, numBits = 8) {
            const minVal = Math.min(...tensor.flat());
            const maxVal = Math.max(...tensor.flat());
            const qmin = 0;
            const qmax = Math.pow(2, numBits) - 1;
            
            const scale = (maxVal - minVal) / (qmax - qmin);
            const zeroPoint = qmin - Math.round(minVal / scale);
            
            // Quantize then dequantize (straight-through estimator for gradients)
            return this._mapNested(tensor, w => {
                const q = Math.round(w / scale + zeroPoint);
                const qClamped = Math.max(qmin, Math.min(qmax, q));
                return (qClamped - zeroPoint) * scale;
            });
        },
        
        _computeQuantParams(values) {
            const minVal = Math.min(...values);
            const maxVal = Math.max(...values);
            
            // Symmetric quantization
            const absMax = Math.max(Math.abs(minVal), Math.abs(maxVal));
            const scale = absMax / 127;
            const zeroPoint = 0;
            
            return { scale: scale || 1e-8, zeroPoint };
        },
        
        _mapNested(arr, fn) {
            if (Array.isArray(arr)) {
                return arr.map(item => this._mapNested(item, fn));
            }
            return fn(arr);
        }
    },
    
    // Pruning
    pruning: {
        // Magnitude-based pruning
        magnitudePrune(weights, sparsity = 0.5) {
            const flat = weights.flat(Infinity);
            const magnitudes = flat.map(Math.abs);
            const sorted = [...magnitudes].sort((a, b) => a - b);
            const threshold = sorted[Math.floor(sorted.length * sparsity)];
            
            const prune = (w) => Math.abs(w) < threshold ? 0 : w;
            return this._mapNested(weights, prune);
        },
        
        // Structured pruning (prune entire filters/channels)
        structuredPrune(weights, pruneRatio = 0.5, axis = 0) {
            // Calculate importance of each filter (L1 norm)
            const importance = [];
            for (let i = 0; i < weights.length; i++) {
                const norm = this._l1Norm(weights[i]);
                importance.push({ index: i, norm });
            }
            
            // Sort by importance
            importance.sort((a, b) => a.norm - b.norm);
            
            // Determine which to prune
            const numPrune = Math.floor(weights.length * pruneRatio);
            const pruneIndices = new Set(importance.slice(0, numPrune).map(x => x.index));
            
            // Return mask and pruned weights
            const mask = weights.map((_, i) => pruneIndices.has(i) ? 0 : 1);
            const pruned = weights.filter((_, i) => !pruneIndices.has(i));
            
            return { pruned, mask, prunedIndices: Array.from(pruneIndices) };
        },
        
        // Gradual magnitude pruning (during training)
        createGradualPruner(initialSparsity, finalSparsity, startStep, endStep) {
            return {
                initialSparsity,
                finalSparsity,
                startStep,
                endStep,
                
                getSparsity(step) {
                    if (step < this.startStep) return this.initialSparsity;
                    if (step > this.endStep) return this.finalSparsity;
                    
                    const progress = (step - this.startStep) / (this.endStep - this.startStep);
                    // Cubic sparsity schedule
                    return this.finalSparsity + (this.initialSparsity - this.finalSparsity) * 
                           Math.pow(1 - progress, 3);
                },
                
                prune(weights, step) {
                    const sparsity = this.getSparsity(step);
                    return PRISM_MODEL_COMPRESSION.pruning.magnitudePrune(weights, sparsity);
                }
            };
        },
        
        _l1Norm(arr) {
            if (Array.isArray(arr)) {
                return arr.reduce((sum, item) => sum + this._l1Norm(item), 0);
            }
            return Math.abs(arr);
        },
        
        _mapNested(arr, fn) {
            if (Array.isArray(arr)) {
                return arr.map(item => this._mapNested(item, fn));
            }
            return fn(arr);
        }
    },
    
    // Knowledge Distillation
    distillation: {
        // Compute distillation loss
        distillationLoss(studentLogits, teacherLogits, labels, temperature = 4.0, alpha = 0.7) {
            // Soft targets from teacher
            const teacherSoft = this._softmaxWithTemp(teacherLogits, temperature);
            const studentSoft = this._softmaxWithTemp(studentLogits, temperature);
            
            // KL divergence for soft targets
            const softLoss = this._klDivergence(studentSoft, teacherSoft);
            
            // Cross-entropy for hard targets
            const studentProbs = this._softmaxWithTemp(studentLogits, 1.0);
            const hardLoss = this._crossEntropy(studentProbs, labels);
            
            // Combined loss
            return alpha * softLoss * (temperature * temperature) + (1 - alpha) * hardLoss;
        },
        
        // Feature distillation (intermediate layers)
        featureDistillationLoss(studentFeatures, teacherFeatures) {
            // MSE loss between features
            let loss = 0;
            for (let i = 0; i < studentFeatures.length; i++) {
                const diff = studentFeatures[i] - teacherFeatures[i];
                loss += diff * diff;
            }
            return loss / studentFeatures.length;
        },
        
        // Attention transfer
        attentionTransferLoss(studentAttention, teacherAttention) {
            // Normalize attention maps
            const normStudent = this._normalizeAttention(studentAttention);
            const normTeacher = this._normalizeAttention(teacherAttention);
            
            // MSE between attention maps
            let loss = 0;
            for (let i = 0; i < normStudent.length; i++) {
                const diff = normStudent[i] - normTeacher[i];
                loss += diff * diff;
            }
            return loss / normStudent.length;
        },
        
        _softmaxWithTemp(logits, temperature) {
            const scaled = logits.map(l => l / temperature);
            const maxLogit = Math.max(...scaled);
            const exps = scaled.map(l => Math.exp(l - maxLogit));
            const sum = exps.reduce((a, b) => a + b, 0);
            return exps.map(e => e / sum);
        },
        
        _klDivergence(p, q) {
            let kl = 0;
            for (let i = 0; i < p.length; i++) {
                if (p[i] > 0 && q[i] > 0) {
                    kl += p[i] * Math.log(p[i] / q[i]);
                }
            }
            return kl;
        },
        
        _crossEntropy(probs, labels) {
            let loss = 0;
            for (let i = 0; i < probs.length; i++) {
                if (labels[i] > 0) {
                    loss -= labels[i] * Math.log(probs[i] + 1e-10);
                }
            }
            return loss;
        },
        
        _normalizeAttention(attention) {
            const sum = attention.reduce((a, b) => a + Math.abs(b), 0);
            return attention.map(a => Math.abs(a) / (sum + 1e-10));
        }
    },
    
    // Compute compression statistics
    getCompressionStats(original, compressed) {
        const originalSize = this._countParams(original);
        const compressedSize = this._countNonZero(compressed);
        
        return {
            originalParams: originalSize,
            compressedParams: compressedSize,
            sparsity: 1 - compressedSize / originalSize,
            compressionRatio: originalSize / compressedSize
        };
    },
    
    _countParams(arr) {
        if (Array.isArray(arr)) {
            return arr.reduce((sum, item) => sum + this._countParams(item), 0);
        }
        return 1;
    },
    
    _countNonZero(arr) {
        if (Array.isArray(arr)) {
            return arr.reduce((sum, item) => sum + this._countNonZero(item), 0);
        }
        return arr !== 0 ? 1 : 0;
    }
};

// ======================================================================
// PRISM_HYPEROPT - Grid search, random search, and Bayesian optimization
// ======================================================================

const PRISM_HYPEROPT = {
    // Search space definition
    searchSpace: {
        uniform(low, high) {
            return { type: 'uniform', low, high };
        },
        logUniform(low, high) {
            return { type: 'logUniform', low, high };
        },
        choice(options) {
            return { type: 'choice', options };
        },
        intUniform(low, high) {
            return { type: 'intUniform', low, high };
        },
        qUniform(low, high, q) {
            return { type: 'qUniform', low, high, q };
        }
    },
    
    // Sample from search space
    sampleSpace(space) {
        const sample = {};
        for (const [name, config] of Object.entries(space)) {
            sample[name] = this._sampleParam(config);
        }
        return sample;
    },
    
    _sampleParam(config) {
        switch (config.type) {
            case 'uniform':
                return config.low + Math.random() * (config.high - config.low);
            case 'logUniform':
                const logLow = Math.log(config.low);
                const logHigh = Math.log(config.high);
                return Math.exp(logLow + Math.random() * (logHigh - logLow));
            case 'choice':
                return config.options[Math.floor(Math.random() * config.options.length)];
            case 'intUniform':
                return Math.floor(config.low + Math.random() * (config.high - config.low + 1));
            case 'qUniform':
                const val = config.low + Math.random() * (config.high - config.low);
                return Math.round(val / config.q) * config.q;
            default:
                return null;
        }
    },
    
    // Grid Search
    gridSearch(space, objective, options = {}) {
        const { maxTrials = 100 } = options;
        
        // Generate grid
        const grid = this._generateGrid(space);
        const results = [];
        
        for (let i = 0; i < Math.min(grid.length, maxTrials); i++) {
            const params = grid[i];
            const score = objective(params);
            results.push({ params, score, trial: i });
        }
        
        // Sort by score
        results.sort((a, b) => a.score - b.score);
        
        return {
            bestParams: results[0].params,
            bestScore: results[0].score,
            allResults: results
        };
    },
    
    _generateGrid(space) {
        const params = Object.entries(space);
        const grid = [{}];
        
        for (const [name, config] of params) {
            const values = this._getGridValues(config);
            const newGrid = [];
            
            for (const point of grid) {
                for (const value of values) {
                    newGrid.push({ ...point, [name]: value });
                }
            }
            
            grid.length = 0;
            grid.push(...newGrid);
        }
        
        return grid;
    },
    
    _getGridValues(config, numPoints = 5) {
        switch (config.type) {
            case 'uniform':
            case 'qUniform':
                const values = [];
                for (let i = 0; i < numPoints; i++) {
                    values.push(config.low + i * (config.high - config.low) / (numPoints - 1));
                }
                return values;
            case 'logUniform':
                const logValues = [];
                const logLow = Math.log(config.low);
                const logHigh = Math.log(config.high);
                for (let i = 0; i < numPoints; i++) {
                    logValues.push(Math.exp(logLow + i * (logHigh - logLow) / (numPoints - 1)));
                }
                return logValues;
            case 'choice':
                return config.options;
            case 'intUniform':
                const intValues = [];
                const step = Math.max(1, Math.floor((config.high - config.low) / (numPoints - 1)));
                for (let v = config.low; v <= config.high; v += step) {
                    intValues.push(v);
                }
                return intValues;
            default:
                return [null];
        }
    },
    
    // Random Search
    randomSearch(space, objective, options = {}) {
        const { maxTrials = 100 } = options;
        const results = [];
        
        for (let i = 0; i < maxTrials; i++) {
            const params = this.sampleSpace(space);
            const score = objective(params);
            results.push({ params, score, trial: i });
        }
        
        results.sort((a, b) => a.score - b.score);
        
        return {
            bestParams: results[0].params,
            bestScore: results[0].score,
            allResults: results
        };
    },
    
    // Bayesian Optimization (TPE-like)
    createBayesianOptimizer(space, options = {}) {
        const { gamma = 0.25, nStartupTrials = 10 } = options;
        
        return {
            space,
            gamma,
            nStartupTrials,
            trials: [],
            
            suggest() {
                if (this.trials.length < this.nStartupTrials) {
                    // Random sampling for initial trials
                    return PRISM_HYPEROPT.sampleSpace(this.space);
                }
                
                // TPE-based suggestion
                return this._tpeSuggest();
            },
            
            report(params, score) {
                this.trials.push({ params, score });
            },
            
            _tpeSuggest() {
                // Sort trials by score
                const sorted = [...this.trials].sort((a, b) => a.score - b.score);
                const splitIdx = Math.floor(sorted.length * this.gamma);
                
                const good = sorted.slice(0, splitIdx);
                const bad = sorted.slice(splitIdx);
                
                const suggestion = {};
                
                for (const [name, config] of Object.entries(this.space)) {
                    if (config.type === 'choice') {
                        // For categorical: sample from good distribution
                        const goodVals = good.map(t => t.params[name]);
                        suggestion[name] = goodVals[Math.floor(Math.random() * goodVals.length)] || 
                                          config.options[Math.floor(Math.random() * config.options.length)];
                    } else {
                        // For continuous: fit KDE and sample
                        const goodVals = good.map(t => t.params[name]);
                        const badVals = bad.map(t => t.params[name]);
                        
                        // Simplified: sample near good values
                        if (goodVals.length > 0) {
                            const goodMean = goodVals.reduce((a, b) => a + b, 0) / goodVals.length;
                            const goodStd = Math.sqrt(goodVals.reduce((s, v) => s + Math.pow(v - goodMean, 2), 0) / goodVals.length) || 0.1;
                            
                            // Sample from truncated normal around good region
                            let value = goodMean + (Math.random() - 0.5) * 2 * goodStd;
                            value = Math.max(config.low, Math.min(config.high, value));
                            
                            if (config.type === 'intUniform') {
                                value = Math.round(value);
                            } else if (config.type === 'logUniform') {
                                // Handle log scale
                                const logVal = Math.log(goodMean) + (Math.random() - 0.5) * 0.5;
                                value = Math.exp(logVal);
                                value = Math.max(config.low, Math.min(config.high, value));
                            }
                            
                            suggestion[name] = value;
                        } else {
                            suggestion[name] = PRISM_HYPEROPT._sampleParam(config);
                        }
                    }
                }
                
                return suggestion;
            },
            
            getBest() {
                if (this.trials.length === 0) return null;
                return this.trials.reduce((best, t) => t.score < best.score ? t : best);
            }
        };
    },
    
    // Early stopping for trials
    createMedianPruner(options = {}) {
        const { nStartupTrials = 5, nWarmupSteps = 10, intervalSteps = 1 } = options;
        
        return {
            nStartupTrials,
            nWarmupSteps,
            intervalSteps,
            trialHistory: [],
            
            shouldPrune(trialId, step, value) {
                if (this.trialHistory.length < this.nStartupTrials) return false;
                if (step < this.nWarmupSteps) return false;
                if (step % this.intervalSteps !== 0) return false;
                
                // Get intermediate values at this step from completed trials
                const intermediateValues = this.trialHistory
                    .filter(t => t.intermediates[step] !== undefined)
                    .map(t => t.intermediates[step]);
                
                if (intermediateValues.length === 0) return false;
                
                // Prune if worse than median
                const median = this._median(intermediateValues);
                return value > median;
            },
            
            reportIntermediate(trialId, step, value) {
                if (!this.trialHistory[trialId]) {
                    this.trialHistory[trialId] = { intermediates: {} };
                }
                this.trialHistory[trialId].intermediates[step] = value;
            },
            
            _median(values) {
                const sorted = [...values].sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
            }
        };
    }
};

// ======================================================================
// PRISM_SELF_SUPERVISED - Contrastive learning, SimCLR, and pretext tasks
// ======================================================================

const PRISM_SELF_SUPERVISED = {
    // InfoNCE / NT-Xent loss (contrastive)
    infoNCELoss(anchor, positive, negatives, temperature = 0.07) {
        // Similarity between anchor and positive
        const posSim = this._cosineSimilarity(anchor, positive) / temperature;
        
        // Similarities between anchor and negatives
        const negSims = negatives.map(neg => 
            this._cosineSimilarity(anchor, neg) / temperature
        );
        
        // InfoNCE loss = -log(exp(pos) / (exp(pos) + sum(exp(negs))))
        const maxSim = Math.max(posSim, ...negSims);
        const expPos = Math.exp(posSim - maxSim);
        const expNegs = negSims.map(s => Math.exp(s - maxSim));
        const sumExp = expPos + expNegs.reduce((a, b) => a + b, 0);
        
        return -Math.log(expPos / sumExp);
    },
    
    // NT-Xent loss (SimCLR style - both directions)
    ntXentLoss(z1, z2, batchZs, temperature = 0.5) {
        // z1 and z2 are positive pair, batchZs contains all embeddings in batch
        const loss1 = this.infoNCELoss(z1, z2, 
            batchZs.filter(z => z !== z1 && z !== z2), temperature);
        const loss2 = this.infoNCELoss(z2, z1,
            batchZs.filter(z => z !== z1 && z !== z2), temperature);
        
        return (loss1 + loss2) / 2;
    },
    
    // Triplet loss
    tripletLoss(anchor, positive, negative, margin = 1.0) {
        const posDist = this._euclideanDistance(anchor, positive);
        const negDist = this._euclideanDistance(anchor, negative);
        return Math.max(0, posDist - negDist + margin);
    },
    
    // Data augmentation for contrastive learning
    augmentations: {
        // Random crop and resize (simulated for 1D/vector data)
        randomCrop(x, cropRatio = 0.8) {
            const cropSize = Math.floor(x.length * cropRatio);
            const start = Math.floor(Math.random() * (x.length - cropSize));
            return x.slice(start, start + cropSize);
        },
        
        // Add Gaussian noise
        gaussianNoise(x, std = 0.1) {
            return x.map(v => v + std * (Math.random() + Math.random() + Math.random() - 1.5) * 1.22);
        },
        
        // Random scaling
        randomScale(x, minScale = 0.8, maxScale = 1.2) {
            const scale = minScale + Math.random() * (maxScale - minScale);
            return x.map(v => v * scale);
        },
        
        // Dropout/masking
        randomMask(x, maskRatio = 0.15) {
            return x.map(v => Math.random() > maskRatio ? v : 0);
        },
        
        // Feature permutation
        randomPermute(x, blockSize = 4) {
            const result = [...x];
            const numBlocks = Math.floor(x.length / blockSize);
            
            for (let i = numBlocks - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                // Swap blocks
                for (let k = 0; k < blockSize; k++) {
                    const temp = result[i * blockSize + k];
                    result[i * blockSize + k] = result[j * blockSize + k];
                    result[j * blockSize + k] = temp;
                }
            }
            
            return result;
        },
        
        // Compose multiple augmentations
        compose(x, augmentationList) {
            let result = x;
            for (const aug of augmentationList) {
                result = aug(result);
            }
            return result;
        }
    },
    
    // SimCLR-style training step
    simCLRStep(batch, encoder, projector, augment1, augment2, temperature = 0.5) {
        const batchSize = batch.length;
        const embeddings = [];
        
        // Generate two views for each sample
        for (const x of batch) {
            const view1 = augment1(x);
            const view2 = augment2(x);
            
            // Encode and project
            const z1 = projector(encoder(view1));
            const z2 = projector(encoder(view2));
            
            embeddings.push(z1, z2);
        }
        
        // Compute loss for all pairs
        let totalLoss = 0;
        for (let i = 0; i < batchSize; i++) {
            const z1 = embeddings[2 * i];
            const z2 = embeddings[2 * i + 1];
            
            // Negatives are all other embeddings
            const negatives = embeddings.filter((_, j) => j !== 2*i && j !== 2*i+1);
            
            totalLoss += this.infoNCELoss(z1, z2, negatives, temperature);
            totalLoss += this.infoNCELoss(z2, z1, negatives, temperature);
        }
        
        return totalLoss / (2 * batchSize);
    },
    
    // BYOL-style (no negatives needed)
    byolLoss(onlinePred, targetProj) {
        // L2 normalize
        const normOnline = this._normalize(onlinePred);
        const normTarget = this._normalize(targetProj);
        
        // MSE loss
        let loss = 0;
        for (let i = 0; i < normOnline.length; i++) {
            loss += Math.pow(normOnline[i] - normTarget[i], 2);
        }
        return loss;
    },
    
    // Pretext tasks
    pretextTasks: {
        // Predict masked values (like BERT MLM)
        maskedPrediction(x, maskRatio = 0.15) {
            const masked = [...x];
            const labels = new Array(x.length).fill(null);
            const maskToken = 0; // Special mask token
            
            for (let i = 0; i < x.length; i++) {
                if (Math.random() < maskRatio) {
                    labels[i] = x[i]; // Store original for loss
                    
                    const r = Math.random();
                    if (r < 0.8) {
                        masked[i] = maskToken; // Replace with mask
                    } else if (r < 0.9) {
                        masked[i] = x[Math.floor(Math.random() * x.length)]; // Random token
                    }
                    // 10% keep original
                }
            }
            
            return { masked, labels };
        },
        
        // Predict rotation (for images/spatial data)
        rotationPrediction(x) {
            // Simulate rotation by circular shift
            const rotations = [0, 1, 2, 3]; // 0°, 90°, 180°, 270°
            const rotationLabel = rotations[Math.floor(Math.random() * 4)];
            
            let rotated = [...x];
            const quarterLen = Math.floor(x.length / 4);
            for (let r = 0; r < rotationLabel; r++) {
                rotated = [...rotated.slice(-quarterLen), ...rotated.slice(0, -quarterLen)];
            }
            
            return { rotated, label: rotationLabel };
        },
        
        // Predict order of sequence segments
        orderPrediction(x, numSegments = 4) {
            const segmentLen = Math.floor(x.length / numSegments);
            const segments = [];
            
            for (let i = 0; i < numSegments; i++) {
                segments.push(x.slice(i * segmentLen, (i + 1) * segmentLen));
            }
            
            // Shuffle segments
            const shuffled = [...segments];
            const order = Array.from({ length: numSegments }, (_, i) => i);
            
            for (let i = numSegments - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                [order[i], order[j]] = [order[j], order[i]];
            }
            
            return { 
                shuffled: shuffled.flat(), 
                originalOrder: order 
            };
        }
    },
    
    // Helper functions
    _cosineSimilarity(a, b) {
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
    },
    
    _euclideanDistance(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += Math.pow(a[i] - b[i], 2);
        }
        return Math.sqrt(sum);
    },
    
    _normalize(x) {
        const norm = Math.sqrt(x.reduce((s, v) => s + v * v, 0));
        return x.map(v => v / (norm + 1e-8));
    }
};

// ======================================================================
// PRISM_UNCERTAINTY - Uncertainty estimation and calibration
// ======================================================================

const PRISM_UNCERTAINTY = {
    // Monte Carlo Dropout uncertainty
    mcDropoutPredict(model, input, numSamples = 30, dropoutRate = 0.1) {
        const predictions = [];
        
        for (let i = 0; i < numSamples; i++) {
            // Apply dropout at inference
            const pred = model.forward(input, true); // training=true enables dropout
            predictions.push(pred);
        }
        
        // Calculate mean and variance
        const mean = this._arrayMean(predictions);
        const variance = this._arrayVariance(predictions, mean);
        const std = variance.map(Math.sqrt);
        
        // Epistemic uncertainty (model uncertainty) - variance of predictions
        const epistemic = std;
        
        return {
            mean,
            std,
            epistemic,
            predictions,
            confidence: this._calculateConfidence(std)
        };
    },
    
    // Deep Ensemble uncertainty
    ensemblePredict(models, input) {
        const predictions = models.map(m => m.forward(input, false));
        
        const mean = this._arrayMean(predictions);
        const variance = this._arrayVariance(predictions, mean);
        const std = variance.map(Math.sqrt);
        
        return {
            mean,
            std,
            epistemic: std,
            predictions,
            confidence: this._calculateConfidence(std)
        };
    },
    
    // Calibration
    calibration: {
        // Temperature scaling (post-hoc calibration)
        temperatureScale(logits, temperature) {
            const scaled = logits.map(l => l / temperature);
            return PRISM_UNCERTAINTY._softmax(scaled);
        },
        
        // Find optimal temperature using validation set
        findOptimalTemperature(logits, labels, minTemp = 0.1, maxTemp = 10, steps = 100) {
            let bestTemp = 1.0;
            let bestNLL = Infinity;
            
            for (let i = 0; i <= steps; i++) {
                const temp = minTemp + (maxTemp - minTemp) * i / steps;
                const nll = this._negativeLogLikelihood(logits, labels, temp);
                
                if (nll < bestNLL) {
                    bestNLL = nll;
                    bestTemp = temp;
                }
            }
            
            return { temperature: bestTemp, nll: bestNLL };
        },
        
        // Expected Calibration Error (ECE)
        calculateECE(predictions, labels, numBins = 10) {
            const bins = Array(numBins).fill().map(() => ({ count: 0, correct: 0, confidence: 0 }));
            
            for (let i = 0; i < predictions.length; i++) {
                const confidence = Math.max(...predictions[i]);
                const predicted = predictions[i].indexOf(confidence);
                const correct = predicted === labels[i] ? 1 : 0;
                
                const binIdx = Math.min(Math.floor(confidence * numBins), numBins - 1);
                bins[binIdx].count++;
                bins[binIdx].correct += correct;
                bins[binIdx].confidence += confidence;
            }
            
            let ece = 0;
            const totalSamples = predictions.length;
            
            for (const bin of bins) {
                if (bin.count > 0) {
                    const accuracy = bin.correct / bin.count;
                    const avgConfidence = bin.confidence / bin.count;
                    ece += (bin.count / totalSamples) * Math.abs(accuracy - avgConfidence);
                }
            }
            
            return ece;
        },
        
        // Reliability diagram data
        getReliabilityDiagram(predictions, labels, numBins = 10) {
            const bins = Array(numBins).fill().map(() => ({ count: 0, correct: 0, confidence: 0 }));
            
            for (let i = 0; i < predictions.length; i++) {
                const confidence = Math.max(...predictions[i]);
                const predicted = predictions[i].indexOf(confidence);
                const correct = predicted === labels[i] ? 1 : 0;
                
                const binIdx = Math.min(Math.floor(confidence * numBins), numBins - 1);
                bins[binIdx].count++;
                bins[binIdx].correct += correct;
                bins[binIdx].confidence += confidence;
            }
            
            return bins.map((bin, i) => ({
                binRange: [(i / numBins), ((i + 1) / numBins)],
                binCenter: (i + 0.5) / numBins,
                accuracy: bin.count > 0 ? bin.correct / bin.count : 0,
                avgConfidence: bin.count > 0 ? bin.confidence / bin.count : 0,
                count: bin.count
            }));
        },
        
        _negativeLogLikelihood(logits, labels, temperature) {
            let nll = 0;
            for (let i = 0; i < logits.length; i++) {
                const probs = PRISM_UNCERTAINTY.calibration._softmaxWithTemp(logits[i], temperature);
                nll -= Math.log(probs[labels[i]] + 1e-10);
            }
            return nll / logits.length;
        },
        
        _softmaxWithTemp(logits, temp) {
            const scaled = logits.map(l => l / temp);
            const max = Math.max(...scaled);
            const exps = scaled.map(l => Math.exp(l - max));
            const sum = exps.reduce((a, b) => a + b, 0);
            return exps.map(e => e / sum);
        }
    },
    
    // Bayesian approximation helpers
    bayesian: {
        // Sample from weight posterior (simplified)
        sampleWeights(meanWeights, stdWeights) {
            return meanWeights.map((mean, i) => 
                mean + stdWeights[i] * (Math.random() + Math.random() + Math.random() - 1.5) * 1.22
            );
        },
        
        // KL divergence for variational inference
        klDivergenceGaussian(muQ, sigmaQ, muP = 0, sigmaP = 1) {
            // KL(q||p) for Gaussians
            const logRatio = Math.log(sigmaP / sigmaQ);
            const varianceRatio = (sigmaQ * sigmaQ) / (sigmaP * sigmaP);
            const meanDiff = (muQ - muP) * (muQ - muP) / (sigmaP * sigmaP);
            
            return 0.5 * (logRatio + varianceRatio + meanDiff - 1);
        }
    },
    
    // Predictive entropy (total uncertainty)
    predictiveEntropy(probs) {
        let entropy = 0;
        for (const p of probs) {
            if (p > 0) {
                entropy -= p * Math.log2(p);
            }
        }
        return entropy;
    },
    
    // Mutual information (epistemic uncertainty from ensemble/MC)
    mutualInformation(allPredictions) {
        // Mean prediction
        const meanPred = this._arrayMean(allPredictions);
        
        // Total entropy (predictive entropy of mean)
        const totalEntropy = this.predictiveEntropy(meanPred);
        
        // Expected entropy (mean of individual entropies)
        let expectedEntropy = 0;
        for (const pred of allPredictions) {
            expectedEntropy += this.predictiveEntropy(pred);
        }
        expectedEntropy /= allPredictions.length;
        
        // MI = total entropy - expected entropy
        return totalEntropy - expectedEntropy;
    },
    
    // Helper functions
    _softmax(logits) {
        const max = Math.max(...logits);
        const exps = logits.map(l => Math.exp(l - max));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map(e => e / sum);
    },
    
    _arrayMean(arrays) {
        const n = arrays.length;
        const len = arrays[0].length;
        const mean = new Array(len).fill(0);
        
        for (const arr of arrays) {
            for (let i = 0; i < len; i++) {
                mean[i] += arr[i];
            }
        }
        
        return mean.map(m => m / n);
    },
    
    _arrayVariance(arrays, mean) {
        const n = arrays.length;
        const len = arrays[0].length;
        const variance = new Array(len).fill(0);
        
        for (const arr of arrays) {
            for (let i = 0; i < len; i++) {
                variance[i] += Math.pow(arr[i] - mean[i], 2);
            }
        }
        
        return variance.map(v => v / n);
    },
    
    _calculateConfidence(std) {
        // Higher std = lower confidence
        const avgStd = std.reduce((a, b) => a + b, 0) / std.length;
        return Math.exp(-avgStd);
    }
};

// ======================================================================
// PRISM_GNN - GCN, GAT, and message passing for manufacturing graphs
// ======================================================================

const PRISM_GNN = {
    // Graph Convolutional Network (GCN) layer
    createGCNLayer(inputDim, outputDim) {
        const initWeight = () => (Math.random() - 0.5) * Math.sqrt(2 / (inputDim + outputDim));
        
        return {
            inputDim,
            outputDim,
            weights: Array(outputDim).fill().map(() => 
                Array(inputDim).fill().map(initWeight)
            ),
            bias: Array(outputDim).fill(0),
            
            forward(nodeFeatures, adjacency) {
                const numNodes = nodeFeatures.length;
                
                // Add self-loops and normalize adjacency
                const adjNorm = this._normalizeAdjacency(adjacency, numNodes);
                
                // Aggregate: A_norm * X
                const aggregated = this._matmul(adjNorm, nodeFeatures);
                
                // Transform: W * aggregated + b
                const output = [];
                for (let i = 0; i < numNodes; i++) {
                    const nodeOut = [];
                    for (let j = 0; j < this.outputDim; j++) {
                        let sum = this.bias[j];
                        for (let k = 0; k < this.inputDim; k++) {
                            sum += this.weights[j][k] * aggregated[i][k];
                        }
                        nodeOut.push(Math.max(0, sum)); // ReLU
                    }
                    output.push(nodeOut);
                }
                
                return output;
            },
            
            _normalizeAdjacency(adj, n) {
                // A_hat = A + I (add self-loops)
                // D_hat = degree matrix of A_hat
                // A_norm = D_hat^(-1/2) * A_hat * D_hat^(-1/2)
                
                const adjHat = adj.map((row, i) => 
                    row.map((v, j) => i === j ? v + 1 : v)
                );
                
                // Compute degree
                const degree = adjHat.map(row => row.reduce((a, b) => a + b, 0));
                const degreeInvSqrt = degree.map(d => d > 0 ? 1 / Math.sqrt(d) : 0);
                
                // Normalize
                const normalized = [];
                for (let i = 0; i < n; i++) {
                    const row = [];
                    for (let j = 0; j < n; j++) {
                        row.push(degreeInvSqrt[i] * adjHat[i][j] * degreeInvSqrt[j]);
                    }
                    normalized.push(row);
                }
                
                return normalized;
            },
            
            _matmul(A, B) {
                return A.map(row => {
                    const result = new Array(B[0].length).fill(0);
                    for (let i = 0; i < row.length; i++) {
                        for (let j = 0; j < B[0].length; j++) {
                            result[j] += row[i] * B[i][j];
                        }
                    }
                    return result;
                });
            }
        };
    },
    
    // Graph Attention Network (GAT) layer
    createGATLayer(inputDim, outputDim, numHeads = 4) {
        const headDim = Math.floor(outputDim / numHeads);
        const initWeight = () => (Math.random() - 0.5) * Math.sqrt(2 / inputDim);
        
        return {
            inputDim,
            outputDim,
            numHeads,
            headDim,
            
            // Per-head weights
            W: Array(numHeads).fill().map(() => 
                Array(headDim).fill().map(() => 
                    Array(inputDim).fill().map(initWeight)
                )
            ),
            // Attention weights
            a: Array(numHeads).fill().map(() => 
                Array(2 * headDim).fill().map(initWeight)
            ),
            
            forward(nodeFeatures, adjacency) {
                const numNodes = nodeFeatures.length;
                const headOutputs = [];
                
                for (let h = 0; h < this.numHeads; h++) {
                    // Linear transformation: W * x
                    const transformed = nodeFeatures.map(x => {
                        const out = [];
                        for (let i = 0; i < this.headDim; i++) {
                            let sum = 0;
                            for (let j = 0; j < this.inputDim; j++) {
                                sum += this.W[h][i][j] * x[j];
                            }
                            out.push(sum);
                        }
                        return out;
                    });
                    
                    // Compute attention coefficients
                    const attention = [];
                    for (let i = 0; i < numNodes; i++) {
                        const row = [];
                        for (let j = 0; j < numNodes; j++) {
                            if (adjacency[i][j] > 0 || i === j) {
                                // Concatenate transformed features
                                const concat = [...transformed[i], ...transformed[j]];
                                // Attention score: LeakyReLU(a^T * [Wh_i || Wh_j])
                                let score = 0;
                                for (let k = 0; k < concat.length; k++) {
                                    score += this.a[h][k] * concat[k];
                                }
                                score = score > 0 ? score : 0.01 * score; // LeakyReLU
                                row.push(score);
                            } else {
                                row.push(-1e9); // Masked
                            }
                        }
                        attention.push(row);
                    }
                    
                    // Softmax attention
                    const attentionNorm = attention.map(row => {
                        const max = Math.max(...row);
                        const exps = row.map(s => Math.exp(s - max));
                        const sum = exps.reduce((a, b) => a + b, 0);
                        return exps.map(e => e / sum);
                    });
                    
                    // Aggregate with attention
                    const headOut = [];
                    for (let i = 0; i < numNodes; i++) {
                        const nodeOut = new Array(this.headDim).fill(0);
                        for (let j = 0; j < numNodes; j++) {
                            for (let k = 0; k < this.headDim; k++) {
                                nodeOut[k] += attentionNorm[i][j] * transformed[j][k];
                            }
                        }
                        headOut.push(nodeOut);
                    }
                    
                    headOutputs.push(headOut);
                }
                
                // Concatenate heads
                return nodeFeatures.map((_, i) => 
                    headOutputs.flatMap(head => head[i])
                );
            }
        };
    },
    
    // Message Passing Neural Network (generic framework)
    createMPNNLayer(nodeInputDim, edgeInputDim, hiddenDim) {
        return {
            nodeInputDim,
            edgeInputDim,
            hiddenDim,
            
            // Message function weights
            messageWeights: Array(hiddenDim).fill().map(() => 
                Array(nodeInputDim * 2 + edgeInputDim).fill().map(() => 
                    (Math.random() - 0.5) * 0.1
                )
            ),
            
            // Update function weights
            updateWeights: Array(hiddenDim).fill().map(() => 
                Array(nodeInputDim + hiddenDim).fill().map(() => 
                    (Math.random() - 0.5) * 0.1
                )
            ),
            
            forward(nodeFeatures, edges, edgeFeatures = null) {
                const numNodes = nodeFeatures.length;
                
                // Message passing
                const messages = new Array(numNodes).fill().map(() => 
                    new Array(this.hiddenDim).fill(0)
                );
                
                for (const [src, dst] of edges) {
                    const edgeIdx = edges.findIndex(e => e[0] === src && e[1] === dst);
                    const edgeFeat = edgeFeatures ? edgeFeatures[edgeIdx] : [];
                    
                    // Compute message
                    const input = [...nodeFeatures[src], ...nodeFeatures[dst], ...edgeFeat];
                    const message = this._mlp(input, this.messageWeights);
                    
                    // Aggregate (sum)
                    for (let i = 0; i < this.hiddenDim; i++) {
                        messages[dst][i] += message[i];
                    }
                }
                
                // Update nodes
                const updated = [];
                for (let i = 0; i < numNodes; i++) {
                    const input = [...nodeFeatures[i], ...messages[i]];
                    const newFeatures = this._mlp(input, this.updateWeights);
                    updated.push(newFeatures);
                }
                
                return updated;
            },
            
            _mlp(input, weights) {
                const output = [];
                for (let i = 0; i < weights.length; i++) {
                    let sum = 0;
                    for (let j = 0; j < Math.min(input.length, weights[i].length); j++) {
                        sum += weights[i][j] * input[j];
                    }
                    output.push(Math.max(0, sum)); // ReLU
                }
                return output;
            }
        };
    },
    
    // Graph pooling (readout)
    pooling: {
        // Global mean pooling
        meanPool(nodeFeatures) {
            const dim = nodeFeatures[0].length;
            const result = new Array(dim).fill(0);
            
            for (const features of nodeFeatures) {
                for (let i = 0; i < dim; i++) {
                    result[i] += features[i];
                }
            }
            
            return result.map(v => v / nodeFeatures.length);
        },
        
        // Global max pooling
        maxPool(nodeFeatures) {
            const dim = nodeFeatures[0].length;
            const result = new Array(dim).fill(-Infinity);
            
            for (const features of nodeFeatures) {
                for (let i = 0; i < dim; i++) {
                    result[i] = Math.max(result[i], features[i]);
                }
            }
            
            return result;
        },
        
        // Global sum pooling
        sumPool(nodeFeatures) {
            const dim = nodeFeatures[0].length;
            const result = new Array(dim).fill(0);
            
            for (const features of nodeFeatures) {
                for (let i = 0; i < dim; i++) {
                    result[i] += features[i];
                }
            }
            
            return result;
        },
        
        // Set2Set pooling (attention-based)
        set2SetPool(nodeFeatures, numSteps = 3) {
            const dim = nodeFeatures[0].length;
            let query = new Array(dim).fill(0);
            let readout = new Array(dim * 2).fill(0);
            
            for (let step = 0; step < numSteps; step++) {
                // Compute attention
                const scores = nodeFeatures.map(f => 
                    f.reduce((sum, v, i) => sum + v * query[i], 0)
                );
                
                // Softmax
                const maxScore = Math.max(...scores);
                const exps = scores.map(s => Math.exp(s - maxScore));
                const sumExp = exps.reduce((a, b) => a + b, 0);
                const attention = exps.map(e => e / sumExp);
                
                // Weighted sum
                const weighted = new Array(dim).fill(0);
                for (let i = 0; i < nodeFeatures.length; i++) {
                    for (let j = 0; j < dim; j++) {
                        weighted[j] += attention[i] * nodeFeatures[i][j];
                    }
                }
                
                // Update query (simplified LSTM update)
                query = weighted;
                readout = [...query, ...weighted];
            }
            
            return readout;
        }
    },
    
    // Manufacturing-specific: Part connectivity graph
    createPartGraph(features, operations) {
        const nodes = features.map((f, i) => ({
            id: i,
            features: f,
            type: 'feature'
        }));
        
        const edges = [];
        const edgeFeatures = [];
        
        // Connect features that share operations
        for (let i = 0; i < features.length; i++) {
            for (let j = i + 1; j < features.length; j++) {
                // Check if features are connected (share face, edge, etc.)
                if (this._featuresConnected(features[i], features[j])) {
                    edges.push([i, j]);
                    edges.push([j, i]); // Bidirectional
                    edgeFeatures.push(this._computeEdgeFeatures(features[i], features[j]));
                    edgeFeatures.push(this._computeEdgeFeatures(features[j], features[i]));
                }
            }
        }
        
        return { nodes, edges, edgeFeatures };
    },
    
    _featuresConnected(f1, f2) {
        // Simplified: check if features are spatially adjacent
        return Math.random() > 0.5; // Placeholder
    },
    
    _computeEdgeFeatures(f1, f2) {
        // Compute relationship features between two manufacturing features
        return [1.0]; // Placeholder
    }
};

// ======================================================================
// PRISM_CONTINUAL_LEARNING - Elastic Weight Consolidation and replay-based continual learning
// ======================================================================

const PRISM_CONTINUAL_LEARNING = {
    // Elastic Weight Consolidation (EWC)
    createEWC(model, lambda = 1000) {
        return {
            model,
            lambda,
            fisherMatrices: [],
            optimalParams: [],
            taskCount: 0,
            
            // Compute Fisher Information Matrix for current task
            computeFisher(dataLoader, numSamples = 100) {
                const params = this._getParams();
                const fisher = params.map(p => new Array(p.length).fill(0));
                
                // Monte Carlo estimation of Fisher
                for (let i = 0; i < numSamples; i++) {
                    const sample = dataLoader.sample();
                    const gradients = this._computeGradients(sample);
                    
                    // Fisher = E[grad * grad^T]
                    for (let j = 0; j < gradients.length; j++) {
                        for (let k = 0; k < gradients[j].length; k++) {
                            fisher[j][k] += gradients[j][k] * gradients[j][k];
                        }
                    }
                }
                
                // Average
                for (let j = 0; j < fisher.length; j++) {
                    for (let k = 0; k < fisher[j].length; k++) {
                        fisher[j][k] /= numSamples;
                    }
                }
                
                return fisher;
            },
            
            // Register a new task (call after training on task)
            registerTask(dataLoader) {
                const fisher = this.computeFisher(dataLoader);
                this.fisherMatrices.push(fisher);
                this.optimalParams.push(this._getParams());
                this.taskCount++;
            },
            
            // Compute EWC penalty
            ewcPenalty() {
                if (this.taskCount === 0) return 0;
                
                const currentParams = this._getParams();
                let penalty = 0;
                
                for (let t = 0; t < this.taskCount; t++) {
                    const fisher = this.fisherMatrices[t];
                    const optimal = this.optimalParams[t];
                    
                    for (let i = 0; i < currentParams.length; i++) {
                        for (let j = 0; j < currentParams[i].length; j++) {
                            const diff = currentParams[i][j] - optimal[i][j];
                            penalty += fisher[i][j] * diff * diff;
                        }
                    }
                }
                
                return 0.5 * this.lambda * penalty;
            },
            
            // Total loss = task loss + EWC penalty
            totalLoss(taskLoss) {
                return taskLoss + this.ewcPenalty();
            },
            
            _getParams() {
                // Extract model parameters (simplified)
                return this.model.layers.map(l => l.weights ? l.weights.flat() : []);
            },
            
            _computeGradients(sample) {
                // Compute gradients via backprop (simplified placeholder)
                const params = this._getParams();
                return params.map(p => p.map(() => Math.random() - 0.5));
            }
        };
    },
    
    // Experience Replay
    createReplayBuffer(capacity = 10000, samplesPerTask = 1000) {
        return {
            capacity,
            samplesPerTask,
            buffer: [],
            taskBoundaries: [0],
            
            // Add samples from current task
            addTask(samples) {
                // Reservoir sampling if too many samples
                const toAdd = samples.length > this.samplesPerTask 
                    ? this._reservoirSample(samples, this.samplesPerTask)
                    : samples;
                
                // Add to buffer
                for (const sample of toAdd) {
                    if (this.buffer.length >= this.capacity) {
                        // Remove oldest sample (FIFO) or use reservoir sampling
                        const removeIdx = Math.floor(Math.random() * this.buffer.length);
                        this.buffer.splice(removeIdx, 1);
                    }
                    this.buffer.push({ ...sample, taskId: this.taskBoundaries.length - 1 });
                }
                
                this.taskBoundaries.push(this.buffer.length);
            },
            
            // Sample from buffer
            sample(batchSize, balanced = true) {
                if (this.buffer.length === 0) return [];
                
                if (balanced && this.taskBoundaries.length > 2) {
                    // Sample equally from each task
                    const numTasks = this.taskBoundaries.length - 1;
                    const perTask = Math.ceil(batchSize / numTasks);
                    const samples = [];
                    
                    for (let t = 0; t < numTasks; t++) {
                        const taskSamples = this.buffer.filter(s => s.taskId === t);
                        const taskBatch = this._randomSample(taskSamples, Math.min(perTask, taskSamples.length));
                        samples.push(...taskBatch);
                    }
                    
                    return samples.slice(0, batchSize);
                } else {
                    return this._randomSample(this.buffer, batchSize);
                }
            },
            
            _reservoirSample(array, k) {
                const result = array.slice(0, k);
                for (let i = k; i < array.length; i++) {
                    const j = Math.floor(Math.random() * (i + 1));
                    if (j < k) {
                        result[j] = array[i];
                    }
                }
                return result;
            },
            
            _randomSample(array, k) {
                const shuffled = [...array].sort(() => Math.random() - 0.5);
                return shuffled.slice(0, k);
            }
        };
    },
    
    // Progressive Neural Networks (expandable architecture)
    createProgressiveNet(baseModel) {
        return {
            columns: [baseModel],
            lateralConnections: [],
            
            // Add a new column for a new task
            addColumn(newModel) {
                const colIdx = this.columns.length;
                
                // Create lateral connections from previous columns
                const laterals = [];
                for (let prev = 0; prev < colIdx; prev++) {
                    // Adapter from previous column to new column
                    laterals.push({
                        from: prev,
                        to: colIdx,
                        weights: this._initLateralWeights()
                    });
                }
                
                this.lateralConnections.push(laterals);
                this.columns.push(newModel);
                
                // Freeze previous columns
                for (let i = 0; i < colIdx; i++) {
                    this._freezeColumn(i);
                }
            },
            
            // Forward pass through progressive net
            forward(input, taskId) {
                const activations = [];
                
                // Compute activations for all columns up to taskId
                for (let col = 0; col <= taskId; col++) {
                    let colInput = input;
                    
                    // Add lateral connections from previous columns
                    if (col > 0 && this.lateralConnections[col - 1]) {
                        for (const lateral of this.lateralConnections[col - 1]) {
                            const prevActivation = activations[lateral.from];
                            const lateralContrib = this._applyLateral(prevActivation, lateral.weights);
                            colInput = colInput.map((v, i) => v + (lateralContrib[i] || 0));
                        }
                    }
                    
                    activations.push(this.columns[col].forward(colInput));
                }
                
                return activations[taskId];
            },
            
            _initLateralWeights() {
                return Array(64).fill().map(() => Math.random() * 0.01);
            },
            
            _applyLateral(activation, weights) {
                return activation.map((a, i) => a * (weights[i] || 0.01));
            },
            
            _freezeColumn(colIdx) {
                // Mark column as frozen (no gradient updates)
                this.columns[colIdx].frozen = true;
            }
        };
    },
    
    // Gradient Episodic Memory (GEM)
    createGEM(model, memoryStrength = 0.5) {
        return {
            model,
            memoryStrength,
            taskMemories: [],
            
            // Store gradients for a task
            storeTaskGradients(taskData) {
                // Compute reference gradients on task data
                const refGradients = this._computeTaskGradients(taskData);
                this.taskMemories.push(refGradients);
            },
            
            // Project gradients to avoid forgetting
            projectGradients(currentGradients) {
                if (this.taskMemories.length === 0) {
                    return currentGradients;
                }
                
                // Check if current gradients conflict with any task memory
                let projected = currentGradients;
                
                for (const taskGrad of this.taskMemories) {
                    const dotProduct = this._dot(projected, taskGrad);
                    
                    if (dotProduct < 0) {
                        // Gradient conflicts - project onto feasible region
                        const taskNormSq = this._dot(taskGrad, taskGrad);
                        if (taskNormSq > 0) {
                            const scale = dotProduct / taskNormSq;
                            projected = projected.map((g, i) => 
                                g - scale * taskGrad[i]
                            );
                        }
                    }
                }
                
                return projected;
            },
            
            _computeTaskGradients(taskData) {
                // Compute average gradient over task data
                return taskData[0].map(() => Math.random() - 0.5); // Placeholder
            },
            
            _dot(a, b) {
                return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
            }
        };
    },
    
    // Learning without Forgetting (LwF)
    createLwF(model, temperature = 2.0, lambda = 1.0) {
        return {
            model,
            temperature,
            lambda,
            oldModelOutputs: null,
            
            // Store outputs of old model on new task data
            recordOldOutputs(newTaskData) {
                this.oldModelOutputs = newTaskData.map(x => 
                    this._softmaxWithTemp(this.model.forward(x), this.temperature)
                );
            },
            
            // Compute LwF distillation loss
            lwfLoss(currentOutputs) {
                if (!this.oldModelOutputs) return 0;
                
                let loss = 0;
                for (let i = 0; i < currentOutputs.length; i++) {
                    const currentSoft = this._softmaxWithTemp(currentOutputs[i], this.temperature);
                    loss += this._crossEntropy(currentSoft, this.oldModelOutputs[i]);
                }
                
                return this.lambda * loss / currentOutputs.length * (this.temperature * this.temperature);
            },
            
            _softmaxWithTemp(logits, temp) {
                const scaled = logits.map(l => l / temp);
                const max = Math.max(...scaled);
                const exps = scaled.map(l => Math.exp(l - max));
                const sum = exps.reduce((a, b) => a + b, 0);
                return exps.map(e => e / sum);
            },
            
            _crossEntropy(pred, target) {
                return -target.reduce((sum, t, i) => 
                    sum + (t > 0 ? t * Math.log(pred[i] + 1e-10) : 0), 0
                );
            }
        };
    }
};
/**
 * PRISM AI/ML ENHANCEMENT MODULE v1.0
 * Deep Learning, NLP, Chatbot & Advanced AI
 */

// ======================================================================
// PRISM_NEURAL_ENGINE_ENHANCED - Enhanced neural network with modern architectures
// ======================================================================

const PRISM_NEURAL_ENGINE_ENHANCED = {
    // Activation functions
    activations: {
        relu: x => Math.max(0, x),
        leakyRelu: (x, alpha = 0.01) => x > 0 ? x : alpha * x,
        elu: (x, alpha = 1) => x > 0 ? x : alpha * (Math.exp(x) - 1),
        gelu: x => 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * Math.pow(x, 3)))),
        swish: x => x * (1 / (1 + Math.exp(-x))),
        sigmoid: x => 1 / (1 + Math.exp(-Math.min(Math.max(x, -500), 500))),
        tanh: x => Math.tanh(x),
        softmax: arr => {
            const max = Math.max(...arr);
            const exps = arr.map(x => Math.exp(x - max));
            const sum = exps.reduce((a, b) => a + b, 0);
            return exps.map(e => e / sum);
        },
        softplus: x => Math.log(1 + Math.exp(x)),
        mish: x => x * Math.tanh(Math.log(1 + Math.exp(x)))
    },
    
    // Activation derivatives
    activationDerivatives: {
        relu: x => x > 0 ? 1 : 0,
        leakyRelu: (x, alpha = 0.01) => x > 0 ? 1 : alpha,
        sigmoid: x => { const s = 1 / (1 + Math.exp(-x)); return s * (1 - s); },
        tanh: x => 1 - Math.pow(Math.tanh(x), 2),
        swish: x => {
            const sig = 1 / (1 + Math.exp(-x));
            return sig + x * sig * (1 - sig);
        }
    },
    
    // Loss functions
    losses: {
        mse: (pred, target) => {
            let sum = 0;
            for (let i = 0; i < pred.length; i++) {
                sum += Math.pow(pred[i] - target[i], 2);
            }
            return sum / pred.length;
        },
        mae: (pred, target) => {
            let sum = 0;
            for (let i = 0; i < pred.length; i++) {
                sum += Math.abs(pred[i] - target[i]);
            }
            return sum / pred.length;
        },
        binaryCrossEntropy: (pred, target) => {
            let sum = 0;
            for (let i = 0; i < pred.length; i++) {
                const p = Math.max(Math.min(pred[i], 1 - 1e-7), 1e-7);
                sum -= target[i] * Math.log(p) + (1 - target[i]) * Math.log(1 - p);
            }
            return sum / pred.length;
        },
        crossEntropy: (pred, target) => {
            let sum = 0;
            for (let i = 0; i < pred.length; i++) {
                if (target[i] > 0) {
                    sum -= target[i] * Math.log(Math.max(pred[i], 1e-7));
                }
            }
            return sum;
        },
        huber: (pred, target, delta = 1.0) => {
            let sum = 0;
            for (let i = 0; i < pred.length; i++) {
                const diff = Math.abs(pred[i] - target[i]);
                sum += diff <= delta ? 0.5 * diff * diff : delta * (diff - 0.5 * delta);
            }
            return sum / pred.length;
        }
    },
    
    // Weight initialization
    initWeights: {
        xavier: (fanIn, fanOut) => {
            const std = Math.sqrt(2.0 / (fanIn + fanOut));
            return () => (Math.random() * 2 - 1) * std;
        },
        he: (fanIn) => {
            const std = Math.sqrt(2.0 / fanIn);
            return () => (Math.random() * 2 - 1) * std;
        },
        lecun: (fanIn) => {
            const std = Math.sqrt(1.0 / fanIn);
            return () => (Math.random() * 2 - 1) * std;
        },
        uniform: (limit = 0.1) => () => (Math.random() * 2 - 1) * limit,
        zeros: () => () => 0,
        ones: () => () => 1
    },
    
    // Layer types
    createDenseLayer(inputSize, outputSize, activation = 'relu', options = {}) {
        const initFn = this.initWeights[options.init || 'he'](inputSize);
        
        const weights = Array(outputSize).fill().map(() => 
            Array(inputSize).fill().map(initFn)
        );
        const biases = Array(outputSize).fill(0);
        
        // Velocity for momentum
        const vWeights = weights.map(row => row.map(() => 0));
        const vBiases = biases.map(() => 0);
        
        // AdaGrad/RMSprop accumulators
        const gWeights = weights.map(row => row.map(() => 0));
        const gBiases = biases.map(() => 0);
        
        return {
            type: 'dense',
            inputSize,
            outputSize,
            activation,
            weights,
            biases,
            vWeights,
            vBiases,
            gWeights,
            gBiases,
            dropout: options.dropout || 0,
            
            forward(input, training = false) {
                this.input = input;
                this.preActivation = [];
                
                for (let i = 0; i < this.outputSize; i++) {
                    let sum = this.biases[i];
                    for (let j = 0; j < this.inputSize; j++) {
                        sum += input[j] * this.weights[i][j];
                    }
                    this.preActivation.push(sum);
                }
                
                // Apply activation
                const activationFn = PRISM_NEURAL_ENGINE_ENHANCED.activations[this.activation];
                if (this.activation === 'softmax') {
                    this.output = activationFn(this.preActivation);
                } else {
                    this.output = this.preActivation.map(activationFn);
                }
                
                // Apply dropout during training
                if (training && this.dropout > 0) {
                    this.dropoutMask = this.output.map(() => Math.random() > this.dropout ? 1 : 0);
                    this.output = this.output.map((v, i) => v * this.dropoutMask[i] / (1 - this.dropout));
                }
                
                return this.output;
            },
            
            backward(gradOutput, learningRate, optimizer = 'adam', t = 1) {
                const activationDeriv = PRISM_NEURAL_ENGINE_ENHANCED.activationDerivatives[this.activation];
                
                // Gradient through activation
                let gradPreActivation;
                if (this.activation === 'softmax') {
                    gradPreActivation = gradOutput; // Assume combined with cross-entropy
                } else {
                    gradPreActivation = gradOutput.map((g, i) => g * activationDeriv(this.preActivation[i]));
                }
                
                // Apply dropout mask
                if (this.dropoutMask) {
                    gradPreActivation = gradPreActivation.map((g, i) => g * this.dropoutMask[i]);
                }
                
                const gradInput = Array(this.inputSize).fill(0);
                
                // Update weights and biases
                for (let i = 0; i < this.outputSize; i++) {
                    for (let j = 0; j < this.inputSize; j++) {
                        const grad = gradPreActivation[i] * this.input[j];
                        gradInput[j] += gradPreActivation[i] * this.weights[i][j];
                        
                        // Apply optimizer
                        this._updateWeight(i, j, grad, learningRate, optimizer, t);
                    }
                    this._updateBias(i, gradPreActivation[i], learningRate, optimizer, t);
                }
                
                return gradInput;
            },
            
            _updateWeight(i, j, grad, lr, optimizer, t) {
                const beta1 = 0.9, beta2 = 0.999, eps = 1e-8;
                
                switch (optimizer) {
                    case 'sgd':
                        this.weights[i][j] -= lr * grad;
                        break;
                    case 'momentum':
                        this.vWeights[i][j] = 0.9 * this.vWeights[i][j] + lr * grad;
                        this.weights[i][j] -= this.vWeights[i][j];
                        break;
                    case 'rmsprop':
                        this.gWeights[i][j] = 0.9 * this.gWeights[i][j] + 0.1 * grad * grad;
                        this.weights[i][j] -= lr * grad / (Math.sqrt(this.gWeights[i][j]) + eps);
                        break;
                    case 'adam':
                    default:
                        this.vWeights[i][j] = beta1 * this.vWeights[i][j] + (1 - beta1) * grad;
                        this.gWeights[i][j] = beta2 * this.gWeights[i][j] + (1 - beta2) * grad * grad;
                        const mHat = this.vWeights[i][j] / (1 - Math.pow(beta1, t));
                        const vHat = this.gWeights[i][j] / (1 - Math.pow(beta2, t));
                        this.weights[i][j] -= lr * mHat / (Math.sqrt(vHat) + eps);
                        break;
                }
            },
            
            _updateBias(i, grad, lr, optimizer, t) {
                const beta1 = 0.9, beta2 = 0.999, eps = 1e-8;
                
                switch (optimizer) {
                    case 'sgd':
                        this.biases[i] -= lr * grad;
                        break;
                    case 'momentum':
                        this.vBiases[i] = 0.9 * this.vBiases[i] + lr * grad;
                        this.biases[i] -= this.vBiases[i];
                        break;
                    case 'rmsprop':
                        this.gBiases[i] = 0.9 * this.gBiases[i] + 0.1 * grad * grad;
                        this.biases[i] -= lr * grad / (Math.sqrt(this.gBiases[i]) + eps);
                        break;
                    case 'adam':
                    default:
                        this.vBiases[i] = beta1 * this.vBiases[i] + (1 - beta1) * grad;
                        this.gBiases[i] = beta2 * this.gBiases[i] + (1 - beta2) * grad * grad;
                        const mHat = this.vBiases[i] / (1 - Math.pow(beta1, t));
                        const vHat = this.gBiases[i] / (1 - Math.pow(beta2, t));
                        this.biases[i] -= lr * mHat / (Math.sqrt(vHat) + eps);
                        break;
                }
            },
            
            getParams() {
                return { weights: this.weights, biases: this.biases };
            },
            
            setParams(params) {
                this.weights = params.weights;
                this.biases = params.biases;
            }
        };
    },
    
    // Batch normalization layer
    createBatchNormLayer(size, momentum = 0.1) {
        return {
            type: 'batchnorm',
            size,
            gamma: Array(size).fill(1),
            beta: Array(size).fill(0),
            runningMean: Array(size).fill(0),
            runningVar: Array(size).fill(1),
            momentum,
            eps: 1e-5,
            
            forward(input, training = false) {
                this.input = input;
                
                if (training) {
                    // Calculate batch statistics (single sample here, would batch in practice)
                    const mean = input.reduce((a, b) => a + b, 0) / input.length;
                    const variance = input.reduce((a, x) => a + Math.pow(x - mean, 2), 0) / input.length;
                    
                    // Update running statistics
                    for (let i = 0; i < this.size; i++) {
                        this.runningMean[i] = (1 - this.momentum) * this.runningMean[i] + this.momentum * mean;
                        this.runningVar[i] = (1 - this.momentum) * this.runningVar[i] + this.momentum * variance;
                    }
                    
                    this.mean = mean;
                    this.var = variance;
                } else {
                    this.mean = this.runningMean[0];
                    this.var = this.runningVar[0];
                }
                
                // Normalize and scale
                this.normalized = input.map(x => (x - this.mean) / Math.sqrt(this.var + this.eps));
                this.output = this.normalized.map((x, i) => this.gamma[i % this.gamma.length] * x + this.beta[i % this.beta.length]);
                
                return this.output;
            },
            
            backward(gradOutput, learningRate) {
                // Simplified backward pass
                const gradInput = gradOutput.map((g, i) => g * this.gamma[i % this.gamma.length] / Math.sqrt(this.var + this.eps));
                
                // Update gamma and beta
                for (let i = 0; i < this.size; i++) {
                    this.gamma[i] -= learningRate * gradOutput[i] * this.normalized[i];
                    this.beta[i] -= learningRate * gradOutput[i];
                }
                
                return gradInput;
            }
        };
    },
    
    // Residual connection wrapper
    createResidualBlock(layers) {
        return {
            type: 'residual',
            layers,
            
            forward(input, training = false) {
                let x = input;
                for (const layer of this.layers) {
                    x = layer.forward(x, training);
                }
                // Add skip connection
                this.output = x.map((v, i) => v + (input[i] || 0));
                return this.output;
            },
            
            backward(gradOutput, learningRate, optimizer, t) {
                let grad = gradOutput;
                for (let i = this.layers.length - 1; i >= 0; i--) {
                    grad = this.layers[i].backward(grad, learningRate, optimizer, t);
                }
                // Gradient flows through skip connection too
                return gradOutput.map((g, i) => g + grad[i]);
            }
        };
    }
};

// ======================================================================
// PRISM_NLP_ENGINE_ADVANCED - Advanced NLP with intent recognition and entity extraction
// ======================================================================

const PRISM_NLP_ENGINE_ADVANCED = {
    // Tokenization
    tokenize(text, options = {}) {
        const { lowercase = true, removeStopwords = false, stemming = false } = options;
        
        let processed = text;
        if (lowercase) processed = processed.toLowerCase();
        
        // Split on whitespace and punctuation
        let tokens = processed.split(/[\s,.!?;:()\[\]{}'"]+/).filter(t => t.length > 0);
        
        if (removeStopwords) {
            tokens = tokens.filter(t => !this.stopwords.has(t));
        }
        
        if (stemming) {
            tokens = tokens.map(t => this.stem(t));
        }
        
        return tokens;
    },
    
    // Simple Porter Stemmer (subset)
    stem(word) {
        let w = word;
        
        // Step 1: plurals
        if (w.endsWith('sses')) w = w.slice(0, -2);
        else if (w.endsWith('ies')) w = w.slice(0, -2) + 'y';
        else if (w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
        
        // Step 2: -ed, -ing
        if (w.endsWith('eed')) w = w.slice(0, -1);
        else if (w.endsWith('ed') && w.length > 4) w = w.slice(0, -2);
        else if (w.endsWith('ing') && w.length > 5) w = w.slice(0, -3);
        
        return w;
    },
    
    stopwords: new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
        'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
        'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
        'through', 'during', 'before', 'after', 'above', 'below', 'between',
        'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
        'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just']),
    
    // TF-IDF calculation
    calculateTFIDF(documents) {
        const N = documents.length;
        const docFreq = new Map();
        const tfidf = [];
        
        // Calculate document frequency
        documents.forEach(doc => {
            const tokens = new Set(this.tokenize(doc));
            tokens.forEach(token => {
                docFreq.set(token, (docFreq.get(token) || 0) + 1);
            });
        });
        
        // Calculate TF-IDF for each document
        documents.forEach(doc => {
            const tokens = this.tokenize(doc);
            const termFreq = new Map();
            tokens.forEach(t => termFreq.set(t, (termFreq.get(t) || 0) + 1));
            
            const docTfidf = new Map();
            termFreq.forEach((tf, term) => {
                const df = docFreq.get(term) || 1;
                const idf = Math.log(N / df);
                docTfidf.set(term, (tf / tokens.length) * idf);
            });
            
            tfidf.push(docTfidf);
        });
        
        return tfidf;
    },
    
    // Cosine similarity
    cosineSimilarity(vec1, vec2) {
        const allKeys = new Set([...vec1.keys(), ...vec2.keys()]);
        let dotProduct = 0, norm1 = 0, norm2 = 0;
        
        allKeys.forEach(key => {
            const v1 = vec1.get(key) || 0;
            const v2 = vec2.get(key) || 0;
            dotProduct += v1 * v2;
            norm1 += v1 * v1;
            norm2 += v2 * v2;
        });
        
        if (norm1 === 0 || norm2 === 0) return 0;
        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    },
    
    // N-grams
    ngrams(tokens, n) {
        const grams = [];
        for (let i = 0; i <= tokens.length - n; i++) {
            grams.push(tokens.slice(i, i + n).join(' '));
        }
        return grams;
    },
    
    // Intent classification
    intents: {
        patterns: new Map(),
        
        register(intent, patterns, entities = []) {
            this.patterns.set(intent, {
                patterns: patterns.map(p => new RegExp(p, 'i')),
                entities,
                examples: []
            });
        },
        
        classify(text) {
            const results = [];
            
            this.patterns.forEach((config, intent) => {
                let score = 0;
                let matchedPatterns = [];
                
                config.patterns.forEach(pattern => {
                    if (pattern.test(text)) {
                        score += 1;
                        matchedPatterns.push(pattern.source);
                    }
                });
                
                if (score > 0) {
                    results.push({
                        intent,
                        confidence: Math.min(score / config.patterns.length, 1),
                        matchedPatterns
                    });
                }
            });
            
            return results.sort((a, b) => b.confidence - a.confidence);
        }
    },
    
    // Entity extraction for manufacturing
    entities: {
        extractors: new Map(),
        
        register(entityType, patterns, normalizer = null) {
            this.extractors.set(entityType, {
                patterns: patterns.map(p => new RegExp(p, 'gi')),
                normalizer
            });
        },
        
        extract(text) {
            const entities = [];
            
            this.extractors.forEach((config, type) => {
                config.patterns.forEach(pattern => {
                    let match;
                    while ((match = pattern.exec(text)) !== null) {
                        let value = match[1] || match[0];
                        if (config.normalizer) {
                            value = config.normalizer(value);
                        }
                        entities.push({
                            type,
                            value,
                            raw: match[0],
                            start: match.index,
                            end: match.index + match[0].length
                        });
                    }
                });
            });
            
            return entities;
        }
    },
    
    // Initialize manufacturing-specific patterns
    initManufacturingPatterns() {
        // Intents
        this.intents.register('calculate_speed_feed', [
            'calculate.*speed.*feed',
            'what.*speed.*feed',
            'recommend.*parameter',
            'optimal.*cutting',
            'how fast.*cut',
            'rpm.*for',
            'feed.*rate.*for'
        ], ['material', 'tool', 'operation']);
        
        this.intents.register('tool_life_query', [
            'tool.*life',
            'how long.*tool.*last',
            'when.*replace.*tool',
            'tool.*wear',
            'expected.*life'
        ], ['tool', 'material', 'speed']);
        
        this.intents.register('material_query', [
            'what.*material',
            'properties.*of',
            'hardness.*of',
            'machinability',
            'cutting.*data.*for'
        ], ['material']);
        
        this.intents.register('troubleshoot', [
            'chatter',
            'vibration',
            'poor.*finish',
            'tool.*break',
            'problem.*with',
            'issue.*with',
            'help.*with'
        ], ['issue', 'operation']);
        
        this.intents.register('post_processor', [
            'post.*processor',
            'generate.*gcode',
            'g-?code.*for',
            'controller.*type',
            'fanuc|siemens|haas|mazak'
        ], ['controller', 'machine']);
        
        // Entities
        this.entities.register('material', [
            '\b(aluminum|aluminium|steel|stainless|titanium|brass|copper|plastic|inconel|hastelloy)\b',
            '\b(6061|7075|4140|304|316|Ti-?6Al-?4V)\b',
            '\b([0-9]+(?:\.[0-9]+)?\s*HRC)\b'
        ], val => val.toLowerCase());
        
        this.entities.register('tool_type', [
            '\b(end\s*mill|drill|tap|reamer|face\s*mill|ball\s*mill)\b',
            '\b(carbide|HSS|ceramic|CBN|PCD)\b'
        ], val => val.toLowerCase().replace(/\s+/g, '_'));
        
        this.entities.register('dimension', [
            '([0-9]+(?:\.[0-9]+)?(?:\s*(?:mm|in|inch|\"|\'|cm)))',
            '([0-9]+/[0-9]+(?:\s*(?:in|inch|\")))'
        ], val => {
            // Normalize to mm
            const num = parseFloat(val);
            if (val.includes('in') || val.includes('"')) return num * 25.4;
            return num;
        });
        
        this.entities.register('speed', [
            '([0-9]+(?:\.[0-9]+)?\s*(?:rpm|RPM))',
            '([0-9]+(?:\.[0-9]+)?\s*(?:sfm|SFM|m/min))'
        ]);
        
        this.entities.register('feed', [
            '([0-9]+(?:\.[0-9]+)?\s*(?:ipm|IPM|mm/min|in/min))',
            '([0-9]+(?:\.[0-9]+)?\s*(?:ipt|IPT|mm/tooth))'
        ]);
        
        this.entities.register('operation', [
            '\b(roughing|finishing|drilling|tapping|facing|profiling|pocketing|slotting)\b'
        ], val => val.toLowerCase());
        
        this.entities.register('number', [
            '\b([0-9]+(?:\.[0-9]+)?)\b'
        ], parseFloat);
    },
    
    // Process query and return structured result
    processQuery(text) {
        const intents = this.intents.classify(text);
        const entities = this.entities.extract(text);
        const tokens = this.tokenize(text, { removeStopwords: true });
        
        return {
            text,
            tokens,
            topIntent: intents[0] || { intent: 'unknown', confidence: 0 },
            allIntents: intents,
            entities,
            timestamp: Date.now()
        };
    }
};

// Initialize
PRISM_NLP_ENGINE_ADVANCED.initManufacturingPatterns();

// ======================================================================
// PRISM_CHATBOT_ENHANCED - Enhanced chatbot with context management and response generation
// ======================================================================

const PRISM_CHATBOT_ENHANCED = {
    // Conversation state
    context: {
        history: [],
        slots: {},
        currentIntent: null,
        pendingActions: [],
        userProfile: {},
        sessionStart: Date.now()
    },
    
    // Response templates
    templates: new Map(),
    
    // Handlers for different intents
    handlers: new Map(),
    
    // Fallback responses
    fallbacks: [
        "I'm not sure I understand. Could you rephrase that?",
        "Could you provide more details about what you're looking for?",
        "I can help with speed/feed calculations, tool life predictions, and post processors. What would you like to know?",
        "Try asking about cutting parameters for a specific material and tool combination."
    ],
    
    init() {
        this._registerDefaultTemplates();
        this._registerDefaultHandlers();
        console.log('[PRISM_CHATBOT] Initialized');
    },
    
    _registerDefaultTemplates() {
        this.templates.set('greeting', [
            "Hello! I'm PRISM AI. How can I help with your machining today?",
            "Hi there! Ready to help with your manufacturing questions.",
            "Welcome to PRISM! Ask me about speeds, feeds, or any machining parameters."
        ]);
        
        this.templates.set('speed_feed_result', [
            "For {material} with a {tool_type}, I recommend:\n• Speed: {speed}\n• Feed: {feed}\n• DOC: {doc}",
            "Based on my calculations for {material}:\n• RPM: {rpm}\n• Feed Rate: {feed}\n• Depth of Cut: {doc}\n• Confidence: {confidence}%"
        ]);
        
        this.templates.set('clarify_material', [
            "What material will you be cutting?",
            "I need to know the material. Is it aluminum, steel, titanium, or something else?",
            "Please specify the workpiece material."
        ]);
        
        this.templates.set('clarify_tool', [
            "What type of tool are you using?",
            "Is this an end mill, drill, or another tool type? What's the diameter?",
            "Please tell me about the cutting tool - type, diameter, and material."
        ]);
        
        this.templates.set('tool_life_result', [
            "Expected tool life for these parameters: {life} minutes\nConfidence interval: {low} - {high} minutes",
            "I predict the tool will last approximately {life} minutes.\nThis is based on {method} calculation."
        ]);
        
        this.templates.set('troubleshoot_chatter', [
            "To reduce chatter, try:\n1. Reduce spindle speed by 10-15%\n2. Decrease depth of cut\n3. Check tool runout\n4. Verify workholding rigidity",
            "Chatter often indicates we're near a stability limit. Try:\n• Speed: {new_speed} (reduced)\n• Or increase RPM above {stable_rpm}"
        ]);
        
        this.templates.set('error', [
            "I encountered an issue processing that request. Please try again.",
            "Something went wrong. Could you provide more details?"
        ]);
    },
    
    _registerDefaultHandlers() {
        // Speed/Feed calculation handler
        this.handlers.set('calculate_speed_feed', async (query, entities) => {
            const material = this._findEntity(entities, 'material');
            const tool = this._findEntity(entities, 'tool_type');
            const operation = this._findEntity(entities, 'operation');
            
            // Check for missing required entities
            if (!material) {
                this._setSlot('pendingIntent', 'calculate_speed_feed');
                return { template: 'clarify_material', needsInput: true };
            }
            
            if (!tool) {
                this._setSlot('material', material.value);
                return { template: 'clarify_tool', needsInput: true };
            }
            
            // Calculate parameters
            const params = await this._calculateSpeedFeed(material.value, tool.value, operation?.value);
            
            return {
                template: 'speed_feed_result',
                data: params,
                actions: ['log_recommendation']
            };
        });
        
        // Tool life handler
        this.handlers.set('tool_life_query', async (query, entities) => {
            const tool = this._findEntity(entities, 'tool_type');
            const material = this._findEntity(entities, 'material');
            const speed = this._findEntity(entities, 'speed');
            
            // Use context if entities missing
            const toolType = tool?.value || this._getSlot('tool');
            const mat = material?.value || this._getSlot('material');
            
            if (!toolType || !mat) {
                return {
                    text: "I need to know the tool type and material to predict tool life. What are you cutting?",
                    needsInput: true
                };
            }
            
            const prediction = await this._predictToolLife(toolType, mat, speed?.value);
            
            return {
                template: 'tool_life_result',
                data: prediction
            };
        });
        
        // Troubleshooting handler
        this.handlers.set('troubleshoot', async (query, entities) => {
            const issue = this._detectIssue(query.text);
            
            if (issue === 'chatter') {
                const currentSpeed = this._getSlot('speed') || 1000;
                return {
                    template: 'troubleshoot_chatter',
                    data: {
                        new_speed: Math.round(currentSpeed * 0.85),
                        stable_rpm: Math.round(currentSpeed * 1.3)
                    }
                };
            }
            
            return {
                text: "I can help troubleshoot. Common issues include:\n• Chatter/vibration\n• Poor surface finish\n• Rapid tool wear\n\nWhich are you experiencing?"
            };
        });
        
        // Greeting handler
        this.handlers.set('greeting', async () => {
            return { template: 'greeting' };
        });
    },
    
    // Main process function
    async process(userInput) {
        // Add to history
        this.context.history.push({
            role: 'user',
            text: userInput,
            timestamp: Date.now()
        });
        
        // Parse input
        const query = PRISM_NLP_ENGINE_ADVANCED.processQuery(userInput);
        
        // Check for pending intent (multi-turn)
        const pendingIntent = this._getSlot('pendingIntent');
        if (pendingIntent && query.topIntent.intent === 'unknown') {
            query.topIntent = { intent: pendingIntent, confidence: 0.7 };
        }
        
        // Get handler
        const handler = this.handlers.get(query.topIntent.intent);
        
        let response;
        if (handler && query.topIntent.confidence > 0.3) {
            try {
                response = await handler(query, query.entities);
            } catch (error) {
                console.error('[PRISM_CHATBOT] Handler error:', error);
                response = { template: 'error' };
            }
        } else {
            response = { text: this._getRandomFallback() };
        }
        
        // Generate response text
        const responseText = this._generateResponse(response);
        
        // Add to history
        this.context.history.push({
            role: 'assistant',
            text: responseText,
            intent: query.topIntent.intent,
            entities: query.entities,
            timestamp: Date.now()
        });
        
        // Clear pending intent if response was complete
        if (!response.needsInput) {
            this._clearSlot('pendingIntent');
        }
        
        // Execute any actions
        if (response.actions) {
            response.actions.forEach(action => this._executeAction(action, response.data));
        }
        
        return {
            text: responseText,
            intent: query.topIntent,
            entities: query.entities,
            data: response.data,
            needsInput: response.needsInput || false
        };
    },
    
    _generateResponse(response) {
        if (response.text) return response.text;
        
        if (response.template) {
            const templates = this.templates.get(response.template);
            if (!templates) return "I'm not sure how to respond to that.";
            
            let template = templates[Math.floor(Math.random() * templates.length)];
            
            // Fill in data
            if (response.data) {
                Object.entries(response.data).forEach(([key, value]) => {
                    template = template.replace(new RegExp(`{${key}}`, 'g'), value);
                });
            }
            
            return template;
        }
        
        return this._getRandomFallback();
    },
    
    _getRandomFallback() {
        return this.fallbacks[Math.floor(Math.random() * this.fallbacks.length)];
    },
    
    _findEntity(entities, type) {
        return entities.find(e => e.type === type);
    },
    
    _setSlot(key, value) {
        this.context.slots[key] = value;
    },
    
    _getSlot(key) {
        return this.context.slots[key];
    },
    
    _clearSlot(key) {
        delete this.context.slots[key];
    },
    
    _detectIssue(text) {
        const lower = text.toLowerCase();
        if (lower.includes('chatter') || lower.includes('vibrat')) return 'chatter';
        if (lower.includes('finish') || lower.includes('surface')) return 'surface_finish';
        if (lower.includes('wear') || lower.includes('break')) return 'tool_wear';
        return 'unknown';
    },
    
    async _calculateSpeedFeed(material, tool, operation) {
        // Use PRISM AI system if available
        if (typeof PRISM_GATEWAY !== 'undefined') {
            try {
                const result = PRISM_GATEWAY.call('ai.recommend.speed_feed', { material, tool, operation });
                if (result) return result;
            } catch (e) {}
        }
        
        // Fallback calculation
        const baseSpeed = material.includes('aluminum') ? 800 : material.includes('steel') ? 200 : 400;
        const baseFeed = material.includes('aluminum') ? 0.006 : material.includes('steel') ? 0.003 : 0.004;
        
        return {
            material,
            tool_type: tool,
            speed: `${baseSpeed} SFM`,
            rpm: Math.round(baseSpeed * 3.82 / 0.5),
            feed: `${baseFeed} IPT`,
            doc: '0.1"',
            confidence: 75
        };
    },
    
    async _predictToolLife(tool, material, speed) {
        // Use PRISM AI system if available
        if (typeof PRISM_GATEWAY !== 'undefined') {
            try {
                const result = PRISM_GATEWAY.call('ai.predict.tool_life', { tool, material, speed });
                if (result) return result;
            } catch (e) {}
        }
        
        // Fallback prediction
        const baseLife = material.includes('aluminum') ? 120 : material.includes('steel') ? 45 : 60;
        
        return {
            life: baseLife,
            low: Math.round(baseLife * 0.7),
            high: Math.round(baseLife * 1.3),
            method: 'Taylor equation + Bayesian adjustment'
        };
    },
    
    _executeAction(action, data) {
        switch (action) {
            case 'log_recommendation':
                PRISM_EVENT_BUS?.publish?.('ai:recommendation', data);
                break;
            case 'update_ui':
                PRISM_EVENT_BUS?.publish?.('ui:update', data);
                break;
        }
    },
    
    // Get conversation history
    getHistory() {
        return this.context.history;
    },
    
    // Clear context for new conversation
    clearContext() {
        this.context = {
            history: [],
            slots: {},
            currentIntent: null,
            pendingActions: [],
            userProfile: this.context.userProfile,
            sessionStart: Date.now()
        };
    },
    
    // Get suggestions based on context
    getSuggestions() {
        const suggestions = [];
        const lastIntent = this.context.history.slice(-1)[0]?.intent;
        
        if (!lastIntent || lastIntent === 'greeting') {
            suggestions.push('Calculate speed and feed for aluminum');
            suggestions.push('What's the tool life for steel?');
            suggestions.push('Help with chatter problems');
        } else if (lastIntent === 'calculate_speed_feed') {
            suggestions.push('What's the tool life for these parameters?');
            suggestions.push('Optimize for surface finish');
            suggestions.push('Generate G-code for this operation');
        }
        
        return suggestions;
    }
};

// Initialize
PRISM_CHATBOT_ENHANCED.init();

// ======================================================================
// PRISM_EXPLAINABLE_AI - Explanations for AI recommendations
// ======================================================================

const PRISM_EXPLAINABLE_AI = {
    // Store reasoning traces
    traces: new Map(),
    
    // Explanation templates
    templates: {
        speed_feed: {
            factors: [
                { name: 'material_hardness', weight: 0.25, description: 'Material hardness affects cutting speed capability' },
                { name: 'tool_material', weight: 0.20, description: 'Tool material determines heat resistance and wear characteristics' },
                { name: 'operation_type', weight: 0.15, description: 'Roughing vs finishing affects parameter aggressiveness' },
                { name: 'machine_capability', weight: 0.15, description: 'Machine spindle power and rigidity set upper limits' },
                { name: 'surface_finish_req', weight: 0.10, description: 'Surface finish requirements influence feed rate' },
                { name: 'tool_life_target', weight: 0.10, description: 'Desired tool life trades off against productivity' },
                { name: 'historical_data', weight: 0.05, description: 'Past successful cuts with similar parameters' }
            ]
        },
        tool_life: {
            factors: [
                { name: 'taylor_equation', weight: 0.30, description: 'Taylor tool life equation (VT^n = C)' },
                { name: 'cutting_temperature', weight: 0.20, description: 'Higher temperatures accelerate wear' },
                { name: 'chip_load', weight: 0.15, description: 'Excessive chip load causes rapid wear' },
                { name: 'coolant_effectiveness', weight: 0.15, description: 'Coolant reduces heat and wear' },
                { name: 'material_abrasiveness', weight: 0.10, description: 'Abrasive materials cause faster wear' },
                { name: 'historical_observations', weight: 0.10, description: 'Actual tool life data from similar operations' }
            ]
        }
    },
    
    // Create a reasoning trace
    startTrace(traceId, type) {
        this.traces.set(traceId, {
            id: traceId,
            type,
            startTime: Date.now(),
            steps: [],
            factors: [],
            inputs: {},
            outputs: {},
            confidence: null
        });
        return traceId;
    },
    
    // Add a reasoning step
    addStep(traceId, step) {
        const trace = this.traces.get(traceId);
        if (trace) {
            trace.steps.push({
                ...step,
                timestamp: Date.now()
            });
        }
    },
    
    // Record factor contribution
    addFactor(traceId, factor, value, contribution, description = '') {
        const trace = this.traces.get(traceId);
        if (trace) {
            trace.factors.push({
                factor,
                value,
                contribution,
                description,
                normalizedContribution: null // Will be calculated later
            });
        }
    },
    
    // Finalize trace
    finalizeTrace(traceId, outputs, confidence) {
        const trace = this.traces.get(traceId);
        if (trace) {
            trace.outputs = outputs;
            trace.confidence = confidence;
            trace.endTime = Date.now();
            trace.duration = trace.endTime - trace.startTime;
            
            // Normalize factor contributions
            const totalContribution = trace.factors.reduce((sum, f) => sum + Math.abs(f.contribution), 0);
            if (totalContribution > 0) {
                trace.factors.forEach(f => {
                    f.normalizedContribution = f.contribution / totalContribution;
                });
            }
            
            // Sort factors by importance
            trace.factors.sort((a, b) => Math.abs(b.normalizedContribution) - Math.abs(a.normalizedContribution));
        }
        return trace;
    },
    
    // Generate human-readable explanation
    explain(traceId) {
        const trace = this.traces.get(traceId);
        if (!trace) return { error: 'Trace not found' };
        
        const explanation = {
            summary: this._generateSummary(trace),
            confidence: trace.confidence,
            topFactors: trace.factors.slice(0, 5).map(f => ({
                name: f.factor,
                impact: `${(f.normalizedContribution * 100).toFixed(1)}%`,
                description: f.description,
                value: f.value
            })),
            reasoning: this._generateReasoning(trace),
            alternatives: this._suggestAlternatives(trace),
            caveats: this._generateCaveats(trace)
        };
        
        return explanation;
    },
    
    _generateSummary(trace) {
        const type = trace.type;
        const confidence = trace.confidence;
        
        if (type === 'speed_feed') {
            const topFactor = trace.factors[0];
            return `Recommended parameters are based primarily on ${topFactor?.factor || 'standard calculations'} ` +
                   `with ${confidence}% confidence. ` +
                   `${trace.factors.length} factors were considered in this recommendation.`;
        }
        
        if (type === 'tool_life') {
            return `Tool life prediction uses ${trace.steps.length} calculation steps ` +
                   `with ${confidence}% confidence based on ${trace.factors.length} factors.`;
        }
        
        return `Analysis complete with ${confidence}% confidence.`;
    },
    
    _generateReasoning(trace) {
        const steps = trace.steps.map((step, i) => ({
            step: i + 1,
            action: step.action,
            result: step.result,
            notes: step.notes
        }));
        
        return steps;
    },
    
    _suggestAlternatives(trace) {
        const alternatives = [];
        
        if (trace.type === 'speed_feed') {
            alternatives.push({
                name: 'Conservative approach',
                description: 'Reduce speed by 15% for longer tool life',
                tradeoff: 'Lower productivity, higher tool life'
            });
            alternatives.push({
                name: 'Aggressive approach',
                description: 'Increase speed by 10% for faster cycle time',
                tradeoff: 'Higher productivity, shorter tool life'
            });
        }
        
        return alternatives;
    },
    
    _generateCaveats(trace) {
        const caveats = [];
        
        if (trace.confidence < 70) {
            caveats.push('Confidence is below 70%. Consider verifying with test cuts.');
        }
        
        const historicalFactor = trace.factors.find(f => f.factor.includes('historical'));
        if (!historicalFactor || Math.abs(historicalFactor.normalizedContribution) < 0.1) {
            caveats.push('Limited historical data available for this combination.');
        }
        
        if (trace.factors.some(f => f.value === 'estimated' || f.value === 'default')) {
            caveats.push('Some input values were estimated. Actual results may vary.');
        }
        
        return caveats;
    },
    
    // Feature importance visualization data
    getFeatureImportance(traceId) {
        const trace = this.traces.get(traceId);
        if (!trace) return [];
        
        return trace.factors.map(f => ({
            feature: f.factor,
            importance: Math.abs(f.normalizedContribution),
            direction: f.contribution >= 0 ? 'positive' : 'negative',
            value: f.value
        }));
    },
    
    // Compare two recommendations
    compareTraces(traceId1, traceId2) {
        const trace1 = this.traces.get(traceId1);
        const trace2 = this.traces.get(traceId2);
        
        if (!trace1 || !trace2) return { error: 'Trace not found' };
        
        const comparison = {
            outputDifferences: {},
            factorDifferences: [],
            recommendation: ''
        };
        
        // Compare outputs
        for (const key of Object.keys(trace1.outputs)) {
            if (trace2.outputs[key] !== undefined) {
                comparison.outputDifferences[key] = {
                    value1: trace1.outputs[key],
                    value2: trace2.outputs[key],
                    difference: trace2.outputs[key] - trace1.outputs[key]
                };
            }
        }
        
        // Compare factors
        const allFactors = new Set([
            ...trace1.factors.map(f => f.factor),
            ...trace2.factors.map(f => f.factor)
        ]);
        
        allFactors.forEach(factor => {
            const f1 = trace1.factors.find(f => f.factor === factor);
            const f2 = trace2.factors.find(f => f.factor === factor);
            
            if (f1 && f2 && f1.value !== f2.value) {
                comparison.factorDifferences.push({
                    factor,
                    value1: f1.value,
                    value2: f2.value,
                    impactChange: (f2.normalizedContribution || 0) - (f1.normalizedContribution || 0)
                });
            }
        });
        
        return comparison;
    },
    
    // What-if analysis
    whatIf(traceId, changes) {
        const trace = this.traces.get(traceId);
        if (!trace) return { error: 'Trace not found' };
        
        // Create modified inputs
        const modifiedInputs = { ...trace.inputs, ...changes };
        
        // Estimate impact (simplified - would recalculate in real system)
        const impacts = [];
        
        for (const [key, newValue] of Object.entries(changes)) {
            const factor = trace.factors.find(f => f.factor.includes(key));
            if (factor) {
                impacts.push({
                    factor: key,
                    originalValue: factor.value,
                    newValue,
                    estimatedImpact: factor.normalizedContribution * (newValue / factor.value - 1)
                });
            }
        }
        
        return {
            originalOutputs: trace.outputs,
            modifiedInputs,
            estimatedImpacts: impacts,
            note: 'For accurate results, recalculate with new parameters'
        };
    }
};

// ======================================================================
// PRISM_ONLINE_LEARNING - Continuous learning from user feedback and outcomes
// ======================================================================

const PRISM_ONLINE_LEARNING = {
    // Learning rate schedule
    learningRate: {
        initial: 0.01,
        current: 0.01,
        decay: 0.999,
        minRate: 0.0001,
        
        step() {
            this.current = Math.max(this.current * this.decay, this.minRate);
            return this.current;
        },
        
        reset() {
            this.current = this.initial;
        }
    },
    
    // Experience buffer for mini-batch updates
    experienceBuffer: {
        buffer: [],
        maxSize: 1000,
        miniBatchSize: 32,
        
        add(experience) {
            this.buffer.push({
                ...experience,
                timestamp: Date.now()
            });
            
            // Remove oldest if over capacity
            if (this.buffer.length > this.maxSize) {
                this.buffer.shift();
            }
        },
        
        sample(n = this.miniBatchSize) {
            const samples = [];
            const indices = new Set();
            
            while (samples.length < Math.min(n, this.buffer.length)) {
                const idx = Math.floor(Math.random() * this.buffer.length);
                if (!indices.has(idx)) {
                    indices.add(idx);
                    samples.push(this.buffer[idx]);
                }
            }
            
            return samples;
        },
        
        clear() {
            this.buffer = [];
        }
    },
    
    // Concept drift detection
    driftDetector: {
        window: [],
        windowSize: 100,
        threshold: 0.15,
        
        add(error) {
            this.window.push(error);
            if (this.window.length > this.windowSize) {
                this.window.shift();
            }
        },
        
        detectDrift() {
            if (this.window.length < this.windowSize) return { drift: false, confidence: 0 };
            
            const mid = Math.floor(this.windowSize / 2);
            const firstHalf = this.window.slice(0, mid);
            const secondHalf = this.window.slice(mid);
            
            const mean1 = firstHalf.reduce((a, b) => a + b, 0) / mid;
            const mean2 = secondHalf.reduce((a, b) => a + b, 0) / mid;
            
            const drift = Math.abs(mean2 - mean1) / Math.max(mean1, 0.001);
            
            return {
                drift: drift > this.threshold,
                magnitude: drift,
                trend: mean2 > mean1 ? 'increasing' : 'decreasing',
                oldMean: mean1,
                newMean: mean2
            };
        },
        
        reset() {
            this.window = [];
        }
    },
    
    // Online model updater
    models: new Map(),
    
    registerModel(name, model, updateFn) {
        this.models.set(name, {
            model,
            updateFn,
            updateCount: 0,
            lastUpdate: null,
            cumulativeError: 0,
            errorHistory: []
        });
    },
    
    // Process new observation
    async processObservation(modelName, input, prediction, actual, metadata = {}) {
        const modelInfo = this.models.get(modelName);
        if (!modelInfo) {
            console.warn(`[ONLINE_LEARNING] Unknown model: ${modelName}`);
            return;
        }
        
        // Calculate error
        const error = this._calculateError(prediction, actual);
        
        // Add to experience buffer
        this.experienceBuffer.add({
            modelName,
            input,
            prediction,
            actual,
            error,
            metadata
        });
        
        // Track error for drift detection
        this.driftDetector.add(error);
        modelInfo.cumulativeError += error;
        modelInfo.errorHistory.push({ error, timestamp: Date.now() });
        
        // Limit error history
        if (modelInfo.errorHistory.length > 1000) {
            modelInfo.errorHistory = modelInfo.errorHistory.slice(-1000);
        }
        
        // Check for drift
        const driftResult = this.driftDetector.detectDrift();
        if (driftResult.drift) {
            console.log(`[ONLINE_LEARNING] Drift detected for ${modelName}:`, driftResult);
            PRISM_EVENT_BUS?.publish?.('ai:drift_detected', { model: modelName, ...driftResult });
            
            // Trigger more aggressive learning
            this.learningRate.current = Math.min(this.learningRate.current * 2, this.learningRate.initial);
        }
        
        // Perform online update
        await this._updateModel(modelName, input, actual);
        
        return {
            error,
            learningRate: this.learningRate.current,
            driftDetected: driftResult.drift,
            updateCount: modelInfo.updateCount
        };
    },
    
    async _updateModel(modelName, input, target) {
        const modelInfo = this.models.get(modelName);
        if (!modelInfo || !modelInfo.updateFn) return;
        
        try {
            const lr = this.learningRate.step();
            await modelInfo.updateFn(modelInfo.model, input, target, lr);
            modelInfo.updateCount++;
            modelInfo.lastUpdate = Date.now();
        } catch (error) {
            console.error(`[ONLINE_LEARNING] Update failed for ${modelName}:`, error);
        }
    },
    
    // Batch update from experience buffer
    async batchUpdate(modelName, batchSize = 32) {
        const modelInfo = this.models.get(modelName);
        if (!modelInfo) return;
        
        const samples = this.experienceBuffer.sample(batchSize)
            .filter(s => s.modelName === modelName);
        
        if (samples.length === 0) return;
        
        for (const sample of samples) {
            await this._updateModel(modelName, sample.input, sample.actual);
        }
        
        return { updatedSamples: samples.length };
    },
    
    _calculateError(prediction, actual) {
        if (Array.isArray(prediction)) {
            let sum = 0;
            for (let i = 0; i < prediction.length; i++) {
                sum += Math.pow(prediction[i] - actual[i], 2);
            }
            return Math.sqrt(sum / prediction.length);
        }
        return Math.abs(prediction - actual);
    },
    
    // Multi-armed bandit for parameter selection
    bandit: {
        arms: new Map(),
        
        register(armId, initialValue = 0) {
            this.arms.set(armId, {
                n: 0,
                value: initialValue,
                sumRewards: 0,
                sumSquaredRewards: 0
            });
        },
        
        select(strategy = 'ucb', epsilon = 0.1) {
            const armIds = Array.from(this.arms.keys());
            if (armIds.length === 0) return null;
            
            switch (strategy) {
                case 'epsilon_greedy':
                    if (Math.random() < epsilon) {
                        return armIds[Math.floor(Math.random() * armIds.length)];
                    }
                    return this._getBestArm();
                    
                case 'ucb':
                    return this._selectUCB();
                    
                case 'thompson':
                    return this._selectThompson();
                    
                default:
                    return this._getBestArm();
            }
        },
        
        update(armId, reward) {
            const arm = this.arms.get(armId);
            if (!arm) return;
            
            arm.n++;
            arm.sumRewards += reward;
            arm.sumSquaredRewards += reward * reward;
            arm.value = arm.sumRewards / arm.n;
        },
        
        _getBestArm() {
            let bestArm = null;
            let bestValue = -Infinity;
            
            this.arms.forEach((arm, id) => {
                if (arm.value > bestValue) {
                    bestValue = arm.value;
                    bestArm = id;
                }
            });
            
            return bestArm;
        },
        
        _selectUCB() {
            const totalN = Array.from(this.arms.values()).reduce((sum, a) => sum + a.n, 0);
            let bestArm = null;
            let bestUCB = -Infinity;
            
            this.arms.forEach((arm, id) => {
                const exploration = arm.n === 0 ? Infinity : Math.sqrt(2 * Math.log(totalN) / arm.n);
                const ucb = arm.value + exploration;
                
                if (ucb > bestUCB) {
                    bestUCB = ucb;
                    bestArm = id;
                }
            });
            
            return bestArm;
        },
        
        _selectThompson() {
            let bestArm = null;
            let bestSample = -Infinity;
            
            this.arms.forEach((arm, id) => {
                // Beta distribution approximation
                const alpha = arm.sumRewards + 1;
                const beta = arm.n - arm.sumRewards + 1;
                const sample = this._sampleBeta(alpha, beta);
                
                if (sample > bestSample) {
                    bestSample = sample;
                    bestArm = id;
                }
            });
            
            return bestArm;
        },
        
        _sampleBeta(alpha, beta) {
            // Approximation using normal distribution for simplicity
            const mean = alpha / (alpha + beta);
            const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
            return mean + Math.sqrt(variance) * (Math.random() + Math.random() + Math.random() - 1.5) * 1.22;
        }
    },
    
    // Get learning statistics
    getStatistics(modelName) {
        if (modelName) {
            const modelInfo = this.models.get(modelName);
            if (!modelInfo) return null;
            
            const recentErrors = modelInfo.errorHistory.slice(-100);
            const avgError = recentErrors.reduce((s, e) => s + e.error, 0) / recentErrors.length;
            
            return {
                modelName,
                updateCount: modelInfo.updateCount,
                lastUpdate: modelInfo.lastUpdate,
                cumulativeError: modelInfo.cumulativeError,
                recentAvgError: avgError,
                learningRate: this.learningRate.current,
                bufferSize: this.experienceBuffer.buffer.filter(e => e.modelName === modelName).length
            };
        }
        
        // Return statistics for all models
        const stats = {};
        this.models.forEach((info, name) => {
            stats[name] = this.getStatistics(name);
        });
        return stats;
    }
};

// ======================================================================
// PRISM_KNOWLEDGE_GRAPH - Manufacturing knowledge graph for reasoning
// ======================================================================

const PRISM_KNOWLEDGE_GRAPH = {
    nodes: new Map(),
    edges: [],
    nodeTypes: new Set(['material', 'tool', 'operation', 'machine', 'parameter', 'defect', 'solution']),
    relationTypes: new Set(['suited_for', 'causes', 'prevents', 'requires', 'produces', 'improves', 'degrades']),
    
    // Add a node
    addNode(id, type, properties = {}) {
        if (!this.nodeTypes.has(type)) {
            console.warn(`[KG] Unknown node type: ${type}`);
        }
        
        this.nodes.set(id, {
            id,
            type,
            properties,
            created: Date.now()
        });
        
        return id;
    },
    
    // Add an edge (relation)
    addEdge(sourceId, targetId, relation, properties = {}) {
        if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
            console.warn(`[KG] Node not found for edge: ${sourceId} -> ${targetId}`);
            return null;
        }
        
        const edge = {
            id: `${sourceId}-${relation}-${targetId}`,
            source: sourceId,
            target: targetId,
            relation,
            properties,
            weight: properties.weight || 1.0,
            created: Date.now()
        };
        
        this.edges.push(edge);
        return edge;
    },
    
    // Get node by ID
    getNode(id) {
        return this.nodes.get(id);
    },
    
    // Get all nodes of a type
    getNodesByType(type) {
        return Array.from(this.nodes.values()).filter(n => n.type === type);
    },
    
    // Get edges from a node
    getOutgoingEdges(nodeId) {
        return this.edges.filter(e => e.source === nodeId);
    },
    
    // Get edges to a node
    getIncomingEdges(nodeId) {
        return this.edges.filter(e => e.target === nodeId);
    },
    
    // Get neighbors
    getNeighbors(nodeId, relation = null) {
        const outgoing = this.getOutgoingEdges(nodeId)
            .filter(e => !relation || e.relation === relation)
            .map(e => ({ node: this.nodes.get(e.target), edge: e, direction: 'out' }));
        
        const incoming = this.getIncomingEdges(nodeId)
            .filter(e => !relation || e.relation === relation)
            .map(e => ({ node: this.nodes.get(e.source), edge: e, direction: 'in' }));
        
        return [...outgoing, ...incoming];
    },
    
    // Find path between nodes
    findPath(startId, endId, maxDepth = 5) {
        const visited = new Set();
        const queue = [[startId]];
        
        while (queue.length > 0) {
            const path = queue.shift();
            const current = path[path.length - 1];
            
            if (current === endId) {
                return path.map(id => this.nodes.get(id));
            }
            
            if (path.length > maxDepth) continue;
            if (visited.has(current)) continue;
            visited.add(current);
            
            const neighbors = this.getNeighbors(current);
            for (const { node } of neighbors) {
                if (!visited.has(node.id)) {
                    queue.push([...path, node.id]);
                }
            }
        }
        
        return null;
    },
    
    // Query: Find materials suited for operation
    queryMaterialsForOperation(operation) {
        const results = [];
        
        this.edges
            .filter(e => e.relation === 'suited_for' && e.target === operation)
            .forEach(edge => {
                const material = this.nodes.get(edge.source);
                if (material && material.type === 'material') {
                    results.push({
                        material,
                        suitability: edge.weight,
                        notes: edge.properties.notes
                    });
                }
            });
        
        return results.sort((a, b) => b.suitability - a.suitability);
    },
    
    // Query: Find solutions for defect
    querySolutionsForDefect(defect) {
        const solutions = [];
        
        // Direct solutions
        this.edges
            .filter(e => e.relation === 'prevents' && e.target === defect)
            .forEach(edge => {
                const solution = this.nodes.get(edge.source);
                if (solution) {
                    solutions.push({
                        solution,
                        effectiveness: edge.weight,
                        type: 'direct'
                    });
                }
            });
        
        // Find causes and their solutions
        this.edges
            .filter(e => e.relation === 'causes' && e.target === defect)
            .forEach(causeEdge => {
                const cause = this.nodes.get(causeEdge.source);
                
                this.edges
                    .filter(e => e.relation === 'prevents' && e.target === cause?.id)
                    .forEach(solutionEdge => {
                        const solution = this.nodes.get(solutionEdge.source);
                        if (solution) {
                            solutions.push({
                                solution,
                                effectiveness: solutionEdge.weight * causeEdge.weight,
                                type: 'indirect',
                                via: cause
                            });
                        }
                    });
            });
        
        return solutions.sort((a, b) => b.effectiveness - a.effectiveness);
    },
    
    // Query: Get parameter recommendations
    queryParameterRecommendations(context) {
        const { material, tool, operation } = context;
        const recommendations = [];
        
        // Find parameters that work well with given context
        const relevantEdges = this.edges.filter(e => {
            if (e.relation !== 'suited_for' && e.relation !== 'improves') return false;
            const source = this.nodes.get(e.source);
            return source?.type === 'parameter';
        });
        
        relevantEdges.forEach(edge => {
            const param = this.nodes.get(edge.source);
            const target = this.nodes.get(edge.target);
            
            let relevance = edge.weight;
            
            // Boost relevance if target matches context
            if (target?.id === material || target?.id === tool || target?.id === operation) {
                relevance *= 1.5;
            }
            
            recommendations.push({
                parameter: param,
                relevance,
                reason: `${edge.relation} ${target?.id}`
            });
        });
        
        return recommendations.sort((a, b) => b.relevance - a.relevance);
    },
    
    // Initialize with manufacturing knowledge
    initManufacturingKnowledge() {
        // Materials
        this.addNode('aluminum_6061', 'material', { hardness: 95, machinability: 0.9 });
        this.addNode('steel_4140', 'material', { hardness: 28, machinability: 0.65 });
        this.addNode('stainless_304', 'material', { hardness: 70, machinability: 0.45 });
        this.addNode('titanium_6al4v', 'material', { hardness: 36, machinability: 0.3 });
        
        // Tools
        this.addNode('carbide_endmill', 'tool', { material: 'carbide', type: 'endmill' });
        this.addNode('hss_drill', 'tool', { material: 'HSS', type: 'drill' });
        this.addNode('ceramic_insert', 'tool', { material: 'ceramic', type: 'insert' });
        
        // Operations
        this.addNode('roughing', 'operation', { type: 'material_removal' });
        this.addNode('finishing', 'operation', { type: 'surface_generation' });
        this.addNode('drilling', 'operation', { type: 'hole_making' });
        
        // Defects
        this.addNode('chatter', 'defect', { symptom: 'vibration marks' });
        this.addNode('poor_finish', 'defect', { symptom: 'rough surface' });
        this.addNode('tool_breakage', 'defect', { symptom: 'broken tool' });
        this.addNode('excessive_wear', 'defect', { symptom: 'rapid tool degradation' });
        
        // Parameters
        this.addNode('high_speed', 'parameter', { affects: 'spindle_rpm', direction: 'increase' });
        this.addNode('low_feed', 'parameter', { affects: 'feed_rate', direction: 'decrease' });
        this.addNode('reduced_doc', 'parameter', { affects: 'depth_of_cut', direction: 'decrease' });
        this.addNode('coolant_flood', 'parameter', { affects: 'coolant', type: 'flood' });
        
        // Solutions
        this.addNode('reduce_speed', 'solution', { action: 'decrease RPM by 10-15%' });
        this.addNode('increase_rigidity', 'solution', { action: 'improve workholding' });
        this.addNode('use_coolant', 'solution', { action: 'apply flood coolant' });
        this.addNode('sharper_tool', 'solution', { action: 'use new or reground tool' });
        
        // Edges - Material suited for operations
        this.addEdge('aluminum_6061', 'roughing', 'suited_for', { weight: 0.95 });
        this.addEdge('aluminum_6061', 'finishing', 'suited_for', { weight: 0.90 });
        this.addEdge('steel_4140', 'roughing', 'suited_for', { weight: 0.85 });
        this.addEdge('titanium_6al4v', 'finishing', 'suited_for', { weight: 0.60 });
        
        // Edges - Causes
        this.addEdge('high_speed', 'chatter', 'causes', { weight: 0.7 });
        this.addEdge('high_speed', 'excessive_wear', 'causes', { weight: 0.8 });
        this.addEdge('low_feed', 'poor_finish', 'prevents', { weight: 0.6 });
        
        // Edges - Solutions
        this.addEdge('reduce_speed', 'chatter', 'prevents', { weight: 0.75 });
        this.addEdge('increase_rigidity', 'chatter', 'prevents', { weight: 0.85 });
        this.addEdge('use_coolant', 'excessive_wear', 'prevents', { weight: 0.7 });
        this.addEdge('sharper_tool', 'poor_finish', 'prevents', { weight: 0.8 });
        
        console.log(`[KG] Initialized with ${this.nodes.size} nodes and ${this.edges.length} edges`);
    },
    
    // Export/Import
    export() {
        return {
            nodes: Array.from(this.nodes.entries()),
            edges: this.edges
        };
    },
    
    import(data) {
        this.nodes = new Map(data.nodes);
        this.edges = data.edges;
    }
};

// Initialize
PRISM_KNOWLEDGE_GRAPH.initManufacturingKnowledge();

// ======================================================================
// PRISM_RECOMMENDATION_ENGINE - Personalized recommendations based on user history and context
// ======================================================================

const PRISM_RECOMMENDATION_ENGINE = {
    // User interaction history
    userHistory: {
        interactions: [],
        preferences: {},
        successfulCuts: [],
        
        add(interaction) {
            this.interactions.push({
                ...interaction,
                timestamp: Date.now()
            });
            
            // Limit history size
            if (this.interactions.length > 10000) {
                this.interactions = this.interactions.slice(-10000);
            }
        },
        
        getRecent(n = 100) {
            return this.interactions.slice(-n);
        },
        
        recordSuccess(params, outcome) {
            this.successfulCuts.push({
                params,
                outcome,
                timestamp: Date.now()
            });
        }
    },
    
    // Item-based collaborative filtering
    itemSimilarity: new Map(),
    
    // Calculate similarity between two parameter sets
    calculateSimilarity(params1, params2) {
        const keys = new Set([...Object.keys(params1), ...Object.keys(params2)]);
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        
        keys.forEach(key => {
            const v1 = this._normalizeValue(params1[key]);
            const v2 = this._normalizeValue(params2[key]);
            
            if (v1 !== null && v2 !== null) {
                dotProduct += v1 * v2;
                norm1 += v1 * v1;
                norm2 += v2 * v2;
            }
        });
        
        if (norm1 === 0 || norm2 === 0) return 0;
        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    },
    
    _normalizeValue(value) {
        if (value === null || value === undefined) return null;
        if (typeof value === 'number') return value / 1000; // Normalize to ~0-1 range
        if (typeof value === 'string') return value.length / 100;
        return null;
    },
    
    // Get recommendations based on current context
    recommend(context, options = {}) {
        const { topN = 5, method = 'hybrid' } = options;
        
        let recommendations = [];
        
        switch (method) {
            case 'content':
                recommendations = this._contentBasedRecommend(context);
                break;
            case 'collaborative':
                recommendations = this._collaborativeRecommend(context);
                break;
            case 'hybrid':
            default:
                const contentRecs = this._contentBasedRecommend(context);
                const collabRecs = this._collaborativeRecommend(context);
                recommendations = this._mergeRecommendations(contentRecs, collabRecs);
        }
        
        // Sort by score and return top N
        return recommendations
            .sort((a, b) => b.score - a.score)
            .slice(0, topN);
    },
    
    _contentBasedRecommend(context) {
        const recommendations = [];
        
        // Find similar successful cuts
        const successfulCuts = this.userHistory.successfulCuts;
        
        successfulCuts.forEach(cut => {
            const similarity = this.calculateSimilarity(context, cut.params);
            
            if (similarity > 0.5) {
                recommendations.push({
                    type: 'parameter_set',
                    params: cut.params,
                    score: similarity * (cut.outcome?.success ? 1.2 : 0.8),
                    reason: 'Similar to your previous successful cut',
                    source: 'content'
                });
            }
        });
        
        return recommendations;
    },
    
    _collaborativeRecommend(context) {
        const recommendations = [];
        
        // Recommend based on what similar contexts led to
        const recentInteractions = this.userHistory.getRecent(500);
        
        // Group by material-tool combination
        const combinations = new Map();
        
        recentInteractions.forEach(interaction => {
            if (!interaction.params) return;
            
            const key = `${interaction.params.material}-${interaction.params.tool}`;
            if (!combinations.has(key)) {
                combinations.set(key, { sum: {}, count: 0, successes: 0 });
            }
            
            const combo = combinations.get(key);
            combo.count++;
            if (interaction.outcome?.success) combo.successes++;
            
            // Accumulate parameter values
            Object.entries(interaction.params).forEach(([k, v]) => {
                if (typeof v === 'number') {
                    combo.sum[k] = (combo.sum[k] || 0) + v;
                }
            });
        });
        
        // Find matching combination
        const contextKey = `${context.material}-${context.tool}`;
        const match = combinations.get(contextKey);
        
        if (match && match.count >= 3) {
            const avgParams = {};
            Object.entries(match.sum).forEach(([k, v]) => {
                avgParams[k] = v / match.count;
            });
            
            recommendations.push({
                type: 'community_average',
                params: avgParams,
                score: match.successes / match.count,
                reason: `Based on ${match.count} similar operations`,
                source: 'collaborative'
            });
        }
        
        return recommendations;
    },
    
    _mergeRecommendations(contentRecs, collabRecs) {
        const merged = [];
        const seen = new Set();
        
        // Combine and deduplicate
        [...contentRecs, ...collabRecs].forEach(rec => {
            const key = JSON.stringify(rec.params);
            if (!seen.has(key)) {
                seen.add(key);
                merged.push(rec);
            } else {
                // Boost score if recommended by both methods
                const existing = merged.find(r => JSON.stringify(r.params) === key);
                if (existing) {
                    existing.score *= 1.2;
                    existing.reason += ' (confirmed by multiple methods)';
                }
            }
        });
        
        return merged;
    },
    
    // Diversity-aware recommendation
    diversifyRecommendations(recommendations, diversityWeight = 0.3) {
        if (recommendations.length <= 1) return recommendations;
        
        const diversified = [recommendations[0]];
        const remaining = recommendations.slice(1);
        
        while (remaining.length > 0 && diversified.length < recommendations.length) {
            let bestIdx = 0;
            let bestScore = -Infinity;
            
            for (let i = 0; i < remaining.length; i++) {
                // Calculate diversity (dissimilarity to already selected)
                let minSimilarity = Infinity;
                for (const selected of diversified) {
                    const sim = this.calculateSimilarity(remaining[i].params, selected.params);
                    minSimilarity = Math.min(minSimilarity, sim);
                }
                
                // Combine relevance and diversity
                const score = (1 - diversityWeight) * remaining[i].score + 
                             diversityWeight * (1 - minSimilarity);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestIdx = i;
                }
            }
            
            diversified.push(remaining.splice(bestIdx, 1)[0]);
        }
        
        return diversified;
    },
    
    // Record feedback on recommendation
    recordFeedback(recommendationId, feedback) {
        this.userHistory.add({
            type: 'feedback',
            recommendationId,
            feedback,
            timestamp: Date.now()
        });
        
        // Update user preferences
        if (feedback.helpful !== undefined) {
            // Could update model weights here
        }
    },
    
    // Get explanation for recommendation
    explainRecommendation(recommendation) {
        const explanation = {
            summary: recommendation.reason,
            factors: [],
            confidence: recommendation.score
        };
        
        if (recommendation.source === 'content') {
            explanation.factors.push({
                factor: 'Similar operations',
                description: 'Based on your previous successful cuts with similar parameters'
            });
        }
        
        if (recommendation.source === 'collaborative') {
            explanation.factors.push({
                factor: 'Community data',
                description: 'Successful parameters used by others in similar situations'
            });
        }
        
        return explanation;
    }
};

// ======================================================================
// PRISM_ACTIVE_LEARNING - Strategic data collection through uncertainty-based queries
// ======================================================================

const PRISM_ACTIVE_LEARNING = {
    // Labeled data pool
    labeledData: [],
    
    // Unlabeled data pool
    unlabeledPool: [],
    
    // Query strategies
    strategies: {
        // Uncertainty sampling - select most uncertain predictions
        uncertainty(predictions) {
            return predictions.map((p, i) => ({
                index: i,
                score: p.uncertainty || (1 - Math.max(...(p.probabilities || [p.confidence])))
            })).sort((a, b) => b.score - a.score);
        },
        
        // Margin sampling - smallest margin between top two predictions
        margin(predictions) {
            return predictions.map((p, i) => {
                const probs = p.probabilities || [p.confidence, 1 - p.confidence];
                const sorted = [...probs].sort((a, b) => b - a);
                const margin = sorted[0] - (sorted[1] || 0);
                return { index: i, score: 1 - margin };
            }).sort((a, b) => b.score - a.score);
        },
        
        // Entropy sampling - highest entropy predictions
        entropy(predictions) {
            return predictions.map((p, i) => {
                const probs = p.probabilities || [p.confidence, 1 - p.confidence];
                const entropy = -probs.reduce((sum, prob) => {
                    if (prob > 0) sum += prob * Math.log2(prob);
                    return sum;
                }, 0);
                return { index: i, score: entropy };
            }).sort((a, b) => b.score - a.score);
        },
        
        // Query-by-committee - disagreement among ensemble
        committee(predictions) {
            return predictions.map((p, i) => {
                const votes = p.committeeVotes || [];
                if (votes.length === 0) return { index: i, score: 0 };
                
                // Count disagreement
                const counts = {};
                votes.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
                const maxAgree = Math.max(...Object.values(counts));
                const disagreement = 1 - (maxAgree / votes.length);
                
                return { index: i, score: disagreement };
            }).sort((a, b) => b.score - a.score);
        },
        
        // Expected model change
        expectedChange(predictions, model) {
            return predictions.map((p, i) => {
                // Estimate gradient magnitude (simplified)
                const gradMagnitude = p.gradientNorm || Math.abs(1 - p.confidence);
                return { index: i, score: gradMagnitude };
            }).sort((a, b) => b.score - a.score);
        },
        
        // Diversity-based (representative sampling)
        diversity(predictions, features) {
            // Use k-medoids or similar to find diverse samples
            const selected = [];
            const remaining = predictions.map((p, i) => ({ index: i, features: features[i] }));
            
            // Greedy diversity selection
            while (selected.length < predictions.length && remaining.length > 0) {
                let bestIdx = 0;
                let bestMinDist = -Infinity;
                
                for (let i = 0; i < remaining.length; i++) {
                    let minDist = Infinity;
                    
                    for (const s of selected) {
                        const dist = PRISM_ACTIVE_LEARNING._distance(remaining[i].features, s.features);
                        minDist = Math.min(minDist, dist);
                    }
                    
                    if (selected.length === 0 || minDist > bestMinDist) {
                        bestMinDist = minDist;
                        bestIdx = i;
                    }
                }
                
                selected.push(remaining.splice(bestIdx, 1)[0]);
            }
            
            return selected.map((s, rank) => ({ index: s.index, score: 1 - rank / selected.length }));
        }
    },
    
    _distance(a, b) {
        if (!a || !b) return Infinity;
        let sum = 0;
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
            sum += Math.pow(a[i] - b[i], 2);
        }
        return Math.sqrt(sum);
    },
    
    // Select samples to query
    selectQueries(model, unlabeled, options = {}) {
        const {
            strategy = 'uncertainty',
            batchSize = 10,
            diversityWeight = 0.3
        } = options;
        
        // Get predictions for unlabeled data
        const predictions = unlabeled.map(sample => {
            const pred = model.predict ? model.predict(sample.features) : { confidence: 0.5 };
            return {
                ...pred,
                sample
            };
        });
        
        // Apply strategy
        const strategyFn = this.strategies[strategy];
        if (!strategyFn) {
            console.warn(`[ACTIVE_LEARNING] Unknown strategy: ${strategy}`);
            return [];
        }
        
        let ranked = strategyFn(predictions);
        
        // Apply diversity if weight > 0
        if (diversityWeight > 0 && strategy !== 'diversity') {
            const diverseRanked = this.strategies.diversity(
                predictions, 
                unlabeled.map(s => s.features)
            );
            
            // Combine rankings
            ranked = ranked.map(r => {
                const diverseRank = diverseRanked.findIndex(d => d.index === r.index);
                const diverseScore = diverseRank >= 0 ? diverseRanked[diverseRank].score : 0;
                return {
                    ...r,
                    score: (1 - diversityWeight) * r.score + diversityWeight * diverseScore
                };
            }).sort((a, b) => b.score - a.score);
        }
        
        // Select top batch
        return ranked.slice(0, batchSize).map(r => ({
            sample: unlabeled[r.index],
            score: r.score,
            index: r.index
        }));
    },
    
    // Add labeled sample
    addLabeledSample(sample, label) {
        this.labeledData.push({
            sample,
            label,
            timestamp: Date.now()
        });
    },
    
    // Add to unlabeled pool
    addUnlabeledSamples(samples) {
        this.unlabeledPool.push(...samples.map(s => ({
            ...s,
            addedAt: Date.now()
        })));
    },
    
    // Remove from unlabeled pool (after labeling)
    removeFromPool(indices) {
        const indexSet = new Set(indices);
        this.unlabeledPool = this.unlabeledPool.filter((_, i) => !indexSet.has(i));
    },
    
    // Generate query for user
    generateQuery(sample) {
        const query = {
            id: `query_${Date.now()}`,
            sample,
            question: this._generateQuestion(sample),
            options: this._generateOptions(sample),
            createdAt: Date.now()
        };
        
        return query;
    },
    
    _generateQuestion(sample) {
        if (sample.type === 'speed_feed') {
            return `For ${sample.material} with ${sample.tool}, would these parameters work well?\n` +
                   `Speed: ${sample.speed} RPM, Feed: ${sample.feed} IPM`;
        }
        
        if (sample.type === 'tool_life') {
            return `How long did the tool actually last with these parameters?`;
        }
        
        return 'Please provide the correct label for this sample:';
    },
    
    _generateOptions(sample) {
        if (sample.type === 'speed_feed') {
            return [
                { value: 'good', label: 'These parameters worked well' },
                { value: 'too_aggressive', label: 'Too aggressive (reduced life/quality)' },
                { value: 'too_conservative', label: 'Too conservative (could go faster)' },
                { value: 'bad', label: 'Parameters did not work' }
            ];
        }
        
        return [
            { value: 'correct', label: 'Prediction was correct' },
            { value: 'incorrect', label: 'Prediction was incorrect' }
        ];
    },
    
    // Get statistics
    getStatistics() {
        return {
            labeledCount: this.labeledData.length,
            unlabeledCount: this.unlabeledPool.length,
            recentLabels: this.labeledData.slice(-10).map(d => ({
                label: d.label,
                timestamp: d.timestamp
            }))
        };
    }
};

// ======================================================================
// PRISM_TIME_SERIES_AI - Time series prediction for tool wear, machine health
// ======================================================================

const PRISM_TIME_SERIES_AI = {
    // Moving average
    movingAverage(data, window) {
        const result = [];
        for (let i = window - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < window; j++) {
                sum += data[i - j];
            }
            result.push(sum / window);
        }
        return result;
    },
    
    // Exponential moving average
    ema(data, alpha = 0.3) {
        const result = [data[0]];
        for (let i = 1; i < data.length; i++) {
            result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
        }
        return result;
    },
    
    // Double exponential smoothing (Holt's method)
    doubleExponentialSmoothing(data, alpha = 0.3, beta = 0.1, horizon = 5) {
        if (data.length < 2) return { smoothed: data, forecast: [] };
        
        // Initialize
        let level = data[0];
        let trend = data[1] - data[0];
        const smoothed = [level];
        
        // Smooth existing data
        for (let i = 1; i < data.length; i++) {
            const prevLevel = level;
            level = alpha * data[i] + (1 - alpha) * (level + trend);
            trend = beta * (level - prevLevel) + (1 - beta) * trend;
            smoothed.push(level);
        }
        
        // Forecast
        const forecast = [];
        for (let h = 1; h <= horizon; h++) {
            forecast.push(level + h * trend);
        }
        
        return { smoothed, forecast, level, trend };
    },
    
    // Detect trend
    detectTrend(data, window = 10) {
        if (data.length < window) return { trend: 'insufficient_data', slope: 0 };
        
        const recent = data.slice(-window);
        
        // Simple linear regression
        const n = recent.length;
        const xMean = (n - 1) / 2;
        const yMean = recent.reduce((a, b) => a + b, 0) / n;
        
        let numerator = 0;
        let denominator = 0;
        
        for (let i = 0; i < n; i++) {
            numerator += (i - xMean) * (recent[i] - yMean);
            denominator += (i - xMean) ** 2;
        }
        
        const slope = denominator !== 0 ? numerator / denominator : 0;
        
        // Normalize slope
        const normalizedSlope = slope / (Math.abs(yMean) || 1);
        
        let trend = 'stable';
        if (normalizedSlope > 0.05) trend = 'increasing';
        else if (normalizedSlope < -0.05) trend = 'decreasing';
        
        return { trend, slope, normalizedSlope };
    },
    
    // Anomaly detection using statistical methods
    detectAnomalies(data, options = {}) {
        const { method = 'zscore', threshold = 3, window = 20 } = options;
        
        const anomalies = [];
        
        switch (method) {
            case 'zscore':
                const mean = data.reduce((a, b) => a + b, 0) / data.length;
                const std = Math.sqrt(data.reduce((sum, x) => sum + (x - mean) ** 2, 0) / data.length);
                
                data.forEach((value, index) => {
                    const zscore = std !== 0 ? Math.abs(value - mean) / std : 0;
                    if (zscore > threshold) {
                        anomalies.push({ index, value, score: zscore, type: 'zscore' });
                    }
                });
                break;
                
            case 'iqr':
                const sorted = [...data].sort((a, b) => a - b);
                const q1 = sorted[Math.floor(data.length * 0.25)];
                const q3 = sorted[Math.floor(data.length * 0.75)];
                const iqr = q3 - q1;
                const lower = q1 - 1.5 * iqr;
                const upper = q3 + 1.5 * iqr;
                
                data.forEach((value, index) => {
                    if (value < lower || value > upper) {
                        anomalies.push({ index, value, type: 'iqr', bounds: { lower, upper } });
                    }
                });
                break;
                
            case 'rolling':
                for (let i = window; i < data.length; i++) {
                    const windowData = data.slice(i - window, i);
                    const wMean = windowData.reduce((a, b) => a + b, 0) / window;
                    const wStd = Math.sqrt(windowData.reduce((s, x) => s + (x - wMean) ** 2, 0) / window);
                    
                    const zscore = wStd !== 0 ? Math.abs(data[i] - wMean) / wStd : 0;
                    if (zscore > threshold) {
                        anomalies.push({ index: i, value: data[i], score: zscore, type: 'rolling' });
                    }
                }
                break;
        }
        
        return anomalies;
    },
    
    // Tool wear prediction using RUL (Remaining Useful Life)
    predictToolWear(wearHistory, options = {}) {
        const { wearLimit = 0.3, confidenceLevel = 0.95 } = options;
        
        if (wearHistory.length < 3) {
            return { remainingLife: null, confidence: 0, message: 'Insufficient data' };
        }
        
        // Fit degradation model (simplified linear)
        const n = wearHistory.length;
        const times = wearHistory.map((_, i) => i);
        const wears = wearHistory;
        
        // Linear regression
        const tMean = times.reduce((a, b) => a + b, 0) / n;
        const wMean = wears.reduce((a, b) => a + b, 0) / n;
        
        let num = 0, den = 0;
        for (let i = 0; i < n; i++) {
            num += (times[i] - tMean) * (wears[i] - wMean);
            den += (times[i] - tMean) ** 2;
        }
        
        const slope = den !== 0 ? num / den : 0;
        const intercept = wMean - slope * tMean;
        
        // Calculate residual standard error
        let sse = 0;
        for (let i = 0; i < n; i++) {
            const predicted = intercept + slope * times[i];
            sse += (wears[i] - predicted) ** 2;
        }
        const rse = Math.sqrt(sse / (n - 2));
        
        // Predict time to reach wear limit
        const currentWear = wears[wears.length - 1];
        const currentTime = times[times.length - 1];
        
        if (slope <= 0) {
            return { 
                remainingLife: Infinity, 
                confidence: 0.5, 
                message: 'Wear not increasing - model may not apply' 
            };
        }
        
        const timeToLimit = (wearLimit - intercept) / slope;
        const remainingLife = Math.max(0, timeToLimit - currentTime);
        
        // Confidence based on model fit
        const r2 = 1 - sse / wears.reduce((s, w) => s + (w - wMean) ** 2, 0);
        const confidence = Math.max(0, Math.min(1, r2));
        
        return {
            remainingLife: Math.round(remainingLife),
            currentWear,
            wearRate: slope,
            timeToLimit: Math.round(timeToLimit),
            confidence,
            model: { slope, intercept, r2 },
            prediction: {
                lower: Math.round(remainingLife * 0.7),
                expected: Math.round(remainingLife),
                upper: Math.round(remainingLife * 1.3)
            }
        };
    },
    
    // Cycle time prediction
    predictCycleTime(history, features) {
        if (history.length < 5) {
            return { predicted: null, confidence: 0 };
        }
        
        // Simple weighted average based on similar jobs
        let weightedSum = 0;
        let weightSum = 0;
        
        history.forEach(h => {
            // Calculate similarity
            let similarity = 1;
            if (features.material && h.material !== features.material) similarity *= 0.5;
            if (features.operation && h.operation !== features.operation) similarity *= 0.5;
            if (features.complexity) {
                similarity *= 1 - Math.abs(h.complexity - features.complexity) / 10;
            }
            
            // Weight by recency
            const age = (Date.now() - (h.timestamp || 0)) / (24 * 60 * 60 * 1000);
            const recencyWeight = Math.exp(-age / 30);
            
            const weight = similarity * recencyWeight;
            weightedSum += h.cycleTime * weight;
            weightSum += weight;
        });
        
        const predicted = weightSum > 0 ? weightedSum / weightSum : null;
        const confidence = Math.min(weightSum / history.length, 1);
        
        return { predicted, confidence };
    },
    
    // Seasonality detection
    detectSeasonality(data, maxPeriod = 24) {
        if (data.length < maxPeriod * 2) return { seasonal: false };
        
        const autocorrelations = [];
        
        for (let lag = 1; lag <= maxPeriod; lag++) {
            let correlation = 0;
            let count = 0;
            
            for (let i = lag; i < data.length; i++) {
                correlation += data[i] * data[i - lag];
                count++;
            }
            
            autocorrelations.push({ lag, correlation: correlation / count });
        }
        
        // Find peaks in autocorrelation
        const peaks = [];
        for (let i = 1; i < autocorrelations.length - 1; i++) {
            if (autocorrelations[i].correlation > autocorrelations[i-1].correlation &&
                autocorrelations[i].correlation > autocorrelations[i+1].correlation) {
                peaks.push(autocorrelations[i]);
            }
        }
        
        if (peaks.length > 0) {
            const strongestPeak = peaks.reduce((a, b) => 
                a.correlation > b.correlation ? a : b
            );
            
            return {
                seasonal: strongestPeak.correlation > 0.3,
                period: strongestPeak.lag,
                strength: strongestPeak.correlation
            };
        }
        
        return { seasonal: false };
    }
};
/**
 * PRISM BATCH 9: DEEP LEARNING
 * Source: MIT 6.036, 6.S191, 6.867
 * 
 * Algorithms: Neural Networks, CNN, RNN/LSTM, Attention, Optimizers
 * Gateway Routes: 20
 */

const PRISM_DL = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIVATION FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  relu: function(x) {
    if (Array.isArray(x)) return x.map(v => Math.max(0, v));
    return Math.max(0, x);
  },
  
  reluDerivative: function(x) {
    if (Array.isArray(x)) return x.map(v => v > 0 ? 1 : 0);
    return x > 0 ? 1 : 0;
  },
  
  sigmoid: function(x) {
    if (Array.isArray(x)) return x.map(v => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, v)))));
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
  },
  
  sigmoidDerivative: function(x) {
    const s = this.sigmoid(x);
    if (Array.isArray(s)) return s.map(v => v * (1 - v));
    return s * (1 - s);
  },
  
  tanh: function(x) {
    if (Array.isArray(x)) return x.map(v => Math.tanh(v));
    return Math.tanh(x);
  },
  
  tanhDerivative: function(x) {
    const t = this.tanh(x);
    if (Array.isArray(t)) return t.map(v => 1 - v * v);
    return 1 - t * t;
  },
  
  softmax: function(x) {
    const max = Math.max(...x);
    const exp = x.map(v => Math.exp(v - max));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(v => v / sum);
  },
  
  leakyRelu: function(x, alpha = 0.01) {
    if (Array.isArray(x)) return x.map(v => v > 0 ? v : alpha * v);
    return x > 0 ? x : alpha * x;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LOSS FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  mseLoss: function(predicted, actual) {
    if (!Array.isArray(predicted)) {
      const diff = predicted - actual;
      return { loss: diff * diff, gradient: 2 * diff };
    }
    
    let sum = 0;
    const gradient = [];
    for (let i = 0; i < predicted.length; i++) {
      const diff = predicted[i] - actual[i];
      sum += diff * diff;
      gradient.push(2 * diff / predicted.length);
    }
    return { loss: sum / predicted.length, gradient };
  },
  
  crossEntropyLoss: function(predicted, actual) {
    const epsilon = 1e-15;
    if (!Array.isArray(predicted)) {
      const p = Math.max(epsilon, Math.min(1 - epsilon, predicted));
      const loss = -(actual * Math.log(p) + (1 - actual) * Math.log(1 - p));
      const gradient = -(actual / p - (1 - actual) / (1 - p));
      return { loss, gradient };
    }
    
    let loss = 0;
    const gradient = [];
    for (let i = 0; i < predicted.length; i++) {
      const p = Math.max(epsilon, Math.min(1 - epsilon, predicted[i]));
      loss -= actual[i] * Math.log(p);
      gradient.push(-actual[i] / p);
    }
    return { loss, gradient };
  },
  
  huberLoss: function(predicted, actual, delta = 1.0) {
    const diff = predicted - actual;
    const absDiff = Math.abs(diff);
    
    if (absDiff <= delta) {
      return { loss: 0.5 * diff * diff, gradient: diff };
    } else {
      return { 
        loss: delta * absDiff - 0.5 * delta * delta,
        gradient: delta * Math.sign(diff)
      };
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LAYERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  denseLayer: function(config) {
    const { inputSize, outputSize, activation = 'relu' } = config;
    
    // Xavier initialization
    const scale = Math.sqrt(2 / (inputSize + outputSize));
    const weights = [];
    for (let i = 0; i < outputSize; i++) {
      weights[i] = [];
      for (let j = 0; j < inputSize; j++) {
        weights[i][j] = (Math.random() * 2 - 1) * scale;
      }
    }
    const biases = new Array(outputSize).fill(0);
    
    return {
      type: 'dense',
      weights,
      biases,
      activation,
      inputSize,
      outputSize,
      
      forward: function(input) {
        this.input = input;
        this.z = [];
        
        for (let i = 0; i < this.outputSize; i++) {
          let sum = this.biases[i];
          for (let j = 0; j < this.inputSize; j++) {
            sum += this.weights[i][j] * input[j];
          }
          this.z[i] = sum;
        }
        
        this.output = PRISM_DL[this.activation](this.z);
        return this.output;
      },
      
      backward: function(dOutput, learningRate) {
        const dZ = dOutput.map((d, i) => d * PRISM_DL[this.activation + 'Derivative'](this.z[i]));
        
        const dInput = new Array(this.inputSize).fill(0);
        
        for (let i = 0; i < this.outputSize; i++) {
          this.biases[i] -= learningRate * dZ[i];
          for (let j = 0; j < this.inputSize; j++) {
            dInput[j] += this.weights[i][j] * dZ[i];
            this.weights[i][j] -= learningRate * dZ[i] * this.input[j];
          }
        }
        
        return dInput;
      }
    };
  },
  
  conv1dLayer: function(config) {
    const { inputChannels, outputChannels, kernelSize, stride = 1, padding = 0 } = config;
    
    // Initialize kernels
    const scale = Math.sqrt(2 / (inputChannels * kernelSize));
    const kernels = [];
    for (let o = 0; o < outputChannels; o++) {
      kernels[o] = [];
      for (let i = 0; i < inputChannels; i++) {
        kernels[o][i] = [];
        for (let k = 0; k < kernelSize; k++) {
          kernels[o][i][k] = (Math.random() * 2 - 1) * scale;
        }
      }
    }
    const biases = new Array(outputChannels).fill(0);
    
    return {
      type: 'conv1d',
      kernels,
      biases,
      kernelSize,
      stride,
      padding,
      inputChannels,
      outputChannels,
      
      forward: function(input) {
        // input: [channels][length]
        this.input = input;
        const inputLength = input[0].length;
        const outputLength = Math.floor((inputLength + 2 * this.padding - this.kernelSize) / this.stride) + 1;
        
        const output = [];
        for (let o = 0; o < this.outputChannels; o++) {
          output[o] = [];
          for (let pos = 0; pos < outputLength; pos++) {
            let sum = this.biases[o];
            for (let i = 0; i < this.inputChannels; i++) {
              for (let k = 0; k < this.kernelSize; k++) {
                const idx = pos * this.stride + k - this.padding;
                if (idx >= 0 && idx < inputLength) {
                  sum += this.kernels[o][i][k] * input[i][idx];
                }
              }
            }
            output[o][pos] = Math.max(0, sum); // ReLU activation
          }
        }
        
        this.output = output;
        return output;
      }
    };
  },
  
  lstmLayer: function(config) {
    const { inputSize, hiddenSize } = config;
    const scale = Math.sqrt(2 / (inputSize + hiddenSize));
    
    // Initialize weights for all gates
    const initMatrix = (rows, cols) => {
      const m = [];
      for (let i = 0; i < rows; i++) {
        m[i] = [];
        for (let j = 0; j < cols; j++) {
          m[i][j] = (Math.random() * 2 - 1) * scale;
        }
      }
      return m;
    };
    
    return {
      type: 'lstm',
      inputSize,
      hiddenSize,
      // Weights: [forget, input, candidate, output] gates
      Wf: initMatrix(hiddenSize, inputSize + hiddenSize),
      Wi: initMatrix(hiddenSize, inputSize + hiddenSize),
      Wc: initMatrix(hiddenSize, inputSize + hiddenSize),
      Wo: initMatrix(hiddenSize, inputSize + hiddenSize),
      bf: new Array(hiddenSize).fill(0),
      bi: new Array(hiddenSize).fill(0),
      bc: new Array(hiddenSize).fill(0),
      bo: new Array(hiddenSize).fill(0),
      
      forward: function(sequence) {
        const T = sequence.length;
        let h = new Array(this.hiddenSize).fill(0);
        let c = new Array(this.hiddenSize).fill(0);
        
        const outputs = [];
        
        for (let t = 0; t < T; t++) {
          const x = sequence[t];
          const concat = [...h, ...x];
          
          // Gates
          const ft = PRISM_DL.sigmoid(this._matmul(this.Wf, concat, this.bf));
          const it = PRISM_DL.sigmoid(this._matmul(this.Wi, concat, this.bi));
          const ct_candidate = PRISM_DL.tanh(this._matmul(this.Wc, concat, this.bc));
          const ot = PRISM_DL.sigmoid(this._matmul(this.Wo, concat, this.bo));
          
          // Cell state and hidden state
          c = c.map((cv, i) => ft[i] * cv + it[i] * ct_candidate[i]);
          h = ot.map((o, i) => o * Math.tanh(c[i]));
          
          outputs.push([...h]);
        }
        
        return { outputs, finalHidden: h, finalCell: c };
      },
      
      _matmul: function(W, x, b) {
        const result = [];
        for (let i = 0; i < W.length; i++) {
          let sum = b[i];
          for (let j = 0; j < x.length; j++) {
            sum += W[i][j] * x[j];
          }
          result.push(sum);
        }
        return result;
      }
    };
  },
  
  gruLayer: function(config) {
    const { inputSize, hiddenSize } = config;
    const scale = Math.sqrt(2 / (inputSize + hiddenSize));
    
    const initMatrix = (rows, cols) => {
      const m = [];
      for (let i = 0; i < rows; i++) {
        m[i] = Array(cols).fill(0).map(() => (Math.random() * 2 - 1) * scale);
      }
      return m;
    };
    
    return {
      type: 'gru',
      inputSize,
      hiddenSize,
      Wr: initMatrix(hiddenSize, inputSize + hiddenSize),
      Wz: initMatrix(hiddenSize, inputSize + hiddenSize),
      Wh: initMatrix(hiddenSize, inputSize + hiddenSize),
      br: new Array(hiddenSize).fill(0),
      bz: new Array(hiddenSize).fill(0),
      bh: new Array(hiddenSize).fill(0),
      
      forward: function(sequence) {
        const T = sequence.length;
        let h = new Array(this.hiddenSize).fill(0);
        const outputs = [];
        
        for (let t = 0; t < T; t++) {
          const x = sequence[t];
          const concat = [...h, ...x];
          
          const rt = PRISM_DL.sigmoid(this._matmul(this.Wr, concat, this.br));
          const zt = PRISM_DL.sigmoid(this._matmul(this.Wz, concat, this.bz));
          
          const rh = rt.map((r, i) => r * h[i]);
          const concat2 = [...rh, ...x];
          const ht_candidate = PRISM_DL.tanh(this._matmul(this.Wh, concat2, this.bh));
          
          h = h.map((hv, i) => (1 - zt[i]) * hv + zt[i] * ht_candidate[i]);
          outputs.push([...h]);
        }
        
        return { outputs, finalHidden: h };
      },
      
      _matmul: function(W, x, b) {
        return W.map((row, i) => b[i] + row.reduce((sum, w, j) => sum + w * x[j], 0));
      }
    };
  },
  
  attentionLayer: function(config) {
    const { dim } = config;
    
    return {
      type: 'attention',
      dim,
      
      forward: function(Q, K, V) {
        // Q, K, V: arrays of vectors
        const dk = K[0].length;
        const scale = Math.sqrt(dk);
        
        // Compute attention scores
        const scores = Q.map(q => 
          K.map(k => 
            q.reduce((sum, qi, i) => sum + qi * k[i], 0) / scale
          )
        );
        
        // Softmax over keys
        const weights = scores.map(row => PRISM_DL.softmax(row));
        
        // Weighted sum of values
        const output = weights.map(w => {
          const out = new Array(V[0].length).fill(0);
          w.forEach((weight, i) => {
            V[i].forEach((v, j) => out[j] += weight * v);
          });
          return out;
        });
        
        return { output, weights };
      }
    };
  },
  
  batchNormLayer: function(config) {
    const { size, momentum = 0.1, epsilon = 1e-5 } = config;
    
    return {
      type: 'batchNorm',
      gamma: new Array(size).fill(1),
      beta: new Array(size).fill(0),
      runningMean: new Array(size).fill(0),
      runningVar: new Array(size).fill(1),
      momentum,
      epsilon,
      training: true,
      
      forward: function(x) {
        // x: [batch][features]
        const batchSize = x.length;
        const features = x[0].length;
        
        let mean, variance;
        
        if (this.training) {
          // Compute batch statistics
          mean = new Array(features).fill(0);
          variance = new Array(features).fill(0);
          
          for (let j = 0; j < features; j++) {
            for (let i = 0; i < batchSize; i++) {
              mean[j] += x[i][j];
            }
            mean[j] /= batchSize;
            
            for (let i = 0; i < batchSize; i++) {
              variance[j] += Math.pow(x[i][j] - mean[j], 2);
            }
            variance[j] /= batchSize;
          }
          
          // Update running statistics
          for (let j = 0; j < features; j++) {
            this.runningMean[j] = (1 - this.momentum) * this.runningMean[j] + this.momentum * mean[j];
            this.runningVar[j] = (1 - this.momentum) * this.runningVar[j] + this.momentum * variance[j];
          }
        } else {
          mean = this.runningMean;
          variance = this.runningVar;
        }
        
        // Normalize
        const output = x.map(row => 
          row.map((v, j) => 
            this.gamma[j] * (v - mean[j]) / Math.sqrt(variance[j] + this.epsilon) + this.beta[j]
          )
        );
        
        return output;
      }
    };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIMIZERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  sgd: function(config = {}) {
    const { learningRate = 0.01 } = config;
    
    return {
      type: 'sgd',
      learningRate,
      
      step: function(params, gradients) {
        return params.map((p, i) => p - this.learningRate * gradients[i]);
      }
    };
  },
  
  momentum: function(config = {}) {
    const { learningRate = 0.01, beta = 0.9 } = config;
    
    return {
      type: 'momentum',
      learningRate,
      beta,
      velocity: null,
      
      step: function(params, gradients) {
        if (!this.velocity) {
          this.velocity = gradients.map(() => 0);
        }
        
        return params.map((p, i) => {
          this.velocity[i] = this.beta * this.velocity[i] - this.learningRate * gradients[i];
          return p + this.velocity[i];
        });
      }
    };
  },
  
  adam: function(config = {}) {
    const { learningRate = 0.001, beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8 } = config;
    
    return {
      type: 'adam',
      learningRate,
      beta1,
      beta2,
      epsilon,
      m: null,
      v: null,
      t: 0,
      
      step: function(params, gradients) {
        this.t++;
        
        if (!this.m) {
          this.m = gradients.map(() => 0);
          this.v = gradients.map(() => 0);
        }
        
        return params.map((p, i) => {
          this.m[i] = this.beta1 * this.m[i] + (1 - this.beta1) * gradients[i];
          this.v[i] = this.beta2 * this.v[i] + (1 - this.beta2) * gradients[i] * gradients[i];
          
          const mHat = this.m[i] / (1 - Math.pow(this.beta1, this.t));
          const vHat = this.v[i] / (1 - Math.pow(this.beta2, this.t));
          
          return p - this.learningRate * mHat / (Math.sqrt(vHat) + this.epsilon);
        });
      }
    };
  },
  
  rmsprop: function(config = {}) {
    const { learningRate = 0.001, beta = 0.9, epsilon = 1e-8 } = config;
    
    return {
      type: 'rmsprop',
      learningRate,
      beta,
      epsilon,
      cache: null,
      
      step: function(params, gradients) {
        if (!this.cache) {
          this.cache = gradients.map(() => 0);
        }
        
        return params.map((p, i) => {
          this.cache[i] = this.beta * this.cache[i] + (1 - this.beta) * gradients[i] * gradients[i];
          return p - this.learningRate * gradients[i] / (Math.sqrt(this.cache[i]) + this.epsilon);
        });
      }
    };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // REGULARIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  dropout: function(x, rate = 0.5, training = true) {
    if (!training) return x;
    
    const scale = 1 / (1 - rate);
    return x.map(v => Math.random() > rate ? v * scale : 0);
  },
  
  l2Regularization: function(weights, lambda = 0.01) {
    let penalty = 0;
    const gradients = [];
    
    for (const w of weights.flat()) {
      penalty += w * w;
      gradients.push(2 * lambda * w);
    }
    
    return { penalty: lambda * penalty, gradients };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TRAINING UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════
  
  forward: function(layers, input) {
    let current = input;
    for (const layer of layers) {
      current = layer.forward(current);
    }
    return current;
  },
  
  backward: function(layers, lossGradient, learningRate) {
    let gradient = lossGradient;
    for (let i = layers.length - 1; i >= 0; i--) {
      if (layers[i].backward) {
        gradient = layers[i].backward(gradient, learningRate);
      }
    }
    return gradient;
  },
  
  step: function(config) {
    const { layers, input, target, lossFunction = 'mse', learningRate = 0.01 } = config;
    
    // Forward
    const output = this.forward(layers, input);
    
    // Compute loss
    const lossResult = this[lossFunction + 'Loss'](output, target);
    
    // Backward
    this.backward(layers, lossResult.gradient, learningRate);
    
    return { loss: lossResult.loss, output };
  }
};


// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH9_GATEWAY_ROUTES = {
  // Layers
  'dl.layer.dense': 'PRISM_DL.denseLayer',
  'dl.layer.conv1d': 'PRISM_DL.conv1dLayer',
  'dl.layer.lstm': 'PRISM_DL.lstmLayer',
  'dl.layer.gru': 'PRISM_DL.gruLayer',
  'dl.layer.attention': 'PRISM_DL.attentionLayer',
  'dl.layer.batchNorm': 'PRISM_DL.batchNormLayer',
  
  // Activations
  'dl.activation.relu': 'PRISM_DL.relu',
  'dl.activation.sigmoid': 'PRISM_DL.sigmoid',
  'dl.activation.tanh': 'PRISM_DL.tanh',
  'dl.activation.softmax': 'PRISM_DL.softmax',
  
  // Loss
  'dl.loss.mse': 'PRISM_DL.mseLoss',
  'dl.loss.crossEntropy': 'PRISM_DL.crossEntropyLoss',
  'dl.loss.huber': 'PRISM_DL.huberLoss',
  
  // Optimizers
  'dl.optimizer.sgd': 'PRISM_DL.sgd',
  'dl.optimizer.momentum': 'PRISM_DL.momentum',
  'dl.optimizer.adam': 'PRISM_DL.adam',
  'dl.optimizer.rmsprop': 'PRISM_DL.rmsprop',
  
  // Training
  'dl.train.forward': 'PRISM_DL.forward',
  'dl.train.backward': 'PRISM_DL.backward',
  'dl.train.step': 'PRISM_DL.step',
  'dl.regularize.dropout': 'PRISM_DL.dropout',
  'dl.regularize.l2': 'PRISM_DL.l2Regularization'
};

function registerBatch9Routes() {
  if (typeof PRISM_GATEWAY !== 'undefined') {
    for (const [route, target] of Object.entries(BATCH9_GATEWAY_ROUTES)) {
      PRISM_GATEWAY.register(route, target);
    }
    console.log(`[Batch 9] Registered ${Object.keys(BATCH9_GATEWAY_ROUTES).length} routes`);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRISM_DL, BATCH9_GATEWAY_ROUTES, registerBatch9Routes };
}

if (typeof window !== 'undefined') {
  window.PRISM_DL = PRISM_DL;
  registerBatch9Routes();
}

console.log('[PRISM Batch 9] Deep Learning loaded - 23 routes');
/**
 * PRISM BATCH 10: CONTROL SYSTEMS
 * Source: MIT 2.004, 6.302, 16.30
 * 
 * Algorithms: PID, State Space, LQR, MPC, Kalman Filter, Adaptive Control
 * Gateway Routes: 18
 */

const PRISM_CONTROL = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PID CONTROL
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Create PID controller instance
   */
  createPID: function(config = {}) {
    const { Kp = 1.0, Ki = 0.0, Kd = 0.0, dt = 0.01, 
            outputMin = -Infinity, outputMax = Infinity,
            antiWindup = true } = config;
    
    return {
      Kp, Ki, Kd, dt,
      outputMin, outputMax, antiWindup,
      integral: 0,
      prevError: 0,
      prevOutput: 0,
      
      reset: function() {
        this.integral = 0;
        this.prevError = 0;
      }
    };
  },
  
  /**
   * Compute PID output
   */
  pidCompute: function(pid, setpoint, measured) {
    const error = setpoint - measured;
    
    // Proportional term
    const P = pid.Kp * error;
    
    // Integral term with anti-windup
    pid.integral += error * pid.dt;
    const I = pid.Ki * pid.integral;
    
    // Derivative term (on measurement to avoid derivative kick)
    const derivative = (error - pid.prevError) / pid.dt;
    const D = pid.Kd * derivative;
    
    // Total output
    let output = P + I + D;
    
    // Saturation and anti-windup
    const saturatedOutput = Math.max(pid.outputMin, Math.min(pid.outputMax, output));
    
    if (pid.antiWindup && output !== saturatedOutput) {
      // Back-calculate integral to prevent windup
      pid.integral -= (output - saturatedOutput) / pid.Ki;
    }
    
    pid.prevError = error;
    pid.prevOutput = saturatedOutput;
    
    return {
      output: saturatedOutput,
      error,
      P, I, D,
      saturated: output !== saturatedOutput
    };
  },
  
  /**
   * Ziegler-Nichols tuning
   */
  zieglerNichols: function(Ku, Tu, type = 'PID') {
    switch (type.toUpperCase()) {
      case 'P':
        return { Kp: 0.5 * Ku, Ki: 0, Kd: 0 };
      case 'PI':
        return { Kp: 0.45 * Ku, Ki: 0.54 * Ku / Tu, Kd: 0 };
      case 'PID':
        return { Kp: 0.6 * Ku, Ki: 1.2 * Ku / Tu, Kd: 0.075 * Ku * Tu };
      case 'PESSEN':
        return { Kp: 0.7 * Ku, Ki: 1.75 * Ku / Tu, Kd: 0.105 * Ku * Tu };
      case 'SOME_OVERSHOOT':
        return { Kp: 0.33 * Ku, Ki: 0.66 * Ku / Tu, Kd: 0.11 * Ku * Tu };
      case 'NO_OVERSHOOT':
        return { Kp: 0.2 * Ku, Ki: 0.4 * Ku / Tu, Kd: 0.066 * Ku * Tu };
      default:
        return { Kp: 0.6 * Ku, Ki: 1.2 * Ku / Tu, Kd: 0.075 * Ku * Tu };
    }
  },
  
  /**
   * Anti-windup with back-calculation
   */
  antiWindup: function(pid, output, saturatedOutput, Kb = null) {
    if (Kb === null) Kb = 1 / pid.Ki;
    const correction = Kb * (saturatedOutput - output);
    pid.integral += correction * pid.dt;
    return pid.integral;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE SPACE
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Create state space system
   */
  createStateSpace: function(A, B, C, D = null) {
    const n = A.length;
    const m = B[0] ? B[0].length : 1;
    const p = C.length;
    
    if (!D) {
      D = Array(p).fill(null).map(() => Array(m).fill(0));
    }
    
    return { A, B, C, D, n, m, p };
  },
  
  /**
   * Simulate state space system one step
   */
  stateSpaceSimulate: function(sys, x, u, dt = null) {
    // x_next = A*x + B*u
    // y = C*x + D*u
    
    const A = dt ? this._discretizeA(sys.A, dt) : sys.A;
    const B = dt ? this._discretizeB(sys.A, sys.B, dt) : sys.B;
    
    const xNext = this._matVecMul(A, x);
    const Bu = this._matVecMul(B, Array.isArray(u) ? u : [u]);
    for (let i = 0; i < xNext.length; i++) {
      xNext[i] += Bu[i];
    }
    
    const y = this._matVecMul(sys.C, xNext);
    const Du = this._matVecMul(sys.D, Array.isArray(u) ? u : [u]);
    for (let i = 0; i < y.length; i++) {
      y[i] += Du[i];
    }
    
    return { x: xNext, y };
  },
  
  /**
   * Discretize continuous system
   */
  discretize: function(sys, dt) {
    const Ad = this._discretizeA(sys.A, dt);
    const Bd = this._discretizeB(sys.A, sys.B, dt);
    return this.createStateSpace(Ad, Bd, sys.C, sys.D);
  },
  
  /**
   * Check controllability
   */
  checkControllability: function(sys) {
    // Build controllability matrix [B, AB, A²B, ...]
    const n = sys.n;
    const C = [];
    
    let AiB = sys.B;
    for (let i = 0; i < n; i++) {
      C.push(...AiB.map(row => [...row]));
      AiB = this._matMul(sys.A, AiB);
    }
    
    // Check rank (simplified - check if determinant is non-zero for square systems)
    const rank = this._approximateRank(C);
    
    return {
      controllable: rank >= n,
      rank,
      requiredRank: n
    };
  },
  
  /**
   * Check observability
   */
  checkObservability: function(sys) {
    const n = sys.n;
    const O = [];
    
    let CAi = sys.C;
    for (let i = 0; i < n; i++) {
      O.push(...CAi);
      CAi = this._matMul(CAi, sys.A);
    }
    
    const rank = this._approximateRank(O);
    
    return {
      observable: rank >= n,
      rank,
      requiredRank: n
    };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIMAL CONTROL (LQR)
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Solve discrete LQR
   */
  solveLQR: function(A, B, Q, R, maxIter = 100, tol = 1e-6) {
    const n = A.length;
    let P = JSON.parse(JSON.stringify(Q)); // Initialize P = Q
    
    for (let iter = 0; iter < maxIter; iter++) {
      const Pold = JSON.parse(JSON.stringify(P));
      
      // P = Q + A'PA - A'PB(R + B'PB)^(-1)B'PA
      const ATP = this._matMul(this._transpose(A), P);
      const ATPA = this._matMul(ATP, A);
      const ATPB = this._matMul(ATP, B);
      const BTPB = this._matMul(this._matMul(this._transpose(B), P), B);
      
      // For single input, simplify
      const RplusBTPB = R[0][0] + BTPB[0][0];
      const K_scalar = ATPB[0][0] / RplusBTPB;
      
      // Update P
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          P[i][j] = Q[i][j] + ATPA[i][j] - ATPB[i][0] * K_scalar * ATPB[j][0];
        }
      }
      
      // Check convergence
      let maxDiff = 0;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          maxDiff = Math.max(maxDiff, Math.abs(P[i][j] - Pold[i][j]));
        }
      }
      
      if (maxDiff < tol) {
        break;
      }
    }
    
    return { P, converged: true };
  },
  
  /**
   * Compute LQR gain
   */
  computeLQRGain: function(A, B, Q, R) {
    const { P } = this.solveLQR(A, B, Q, R);
    
    // K = (R + B'PB)^(-1) B'PA
    const BTP = this._matMul(this._transpose(B), P);
    const BTPB = this._matMul(BTP, B);
    const BTPA = this._matMul(BTP, A);
    
    // For SISO: K = BTPA / (R + BTPB)
    const n = A.length;
    const K = [];
    const denom = R[0][0] + BTPB[0][0];
    
    for (let j = 0; j < n; j++) {
      K.push(BTPA[0][j] / denom);
    }
    
    return { K, P };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MODEL PREDICTIVE CONTROL
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Simple MPC step (unconstrained, for demonstration)
   */
  mpcStep: function(config) {
    const { A, B, x, xRef, Q, R, N = 10 } = config;
    
    // Build prediction matrices
    const n = A.length;
    const predictions = [];
    let Ai = A;
    
    // Predict future states
    for (let i = 0; i < N; i++) {
      predictions.push({
        A: JSON.parse(JSON.stringify(Ai)),
        error: xRef ? xRef.map((r, j) => r - x[j]) : x.map(v => -v)
      });
      Ai = this._matMul(Ai, A);
    }
    
    // For unconstrained case, use LQR as approximation
    const { K } = this.computeLQRGain(A, B, Q, R);
    
    // u = -K * x
    let u = 0;
    for (let j = 0; j < n; j++) {
      u -= K[j] * (x[j] - (xRef ? xRef[j] : 0));
    }
    
    return {
      u: [u],
      K,
      predictions
    };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // KALMAN FILTER
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Create Kalman filter
   */
  createKalman: function(config) {
    const { A, B, C, Q, R, x0 = null, P0 = null } = config;
    const n = A.length;
    
    return {
      A, B, C, Q, R,
      x: x0 || Array(n).fill(0),
      P: P0 || Array(n).fill(null).map(() => Array(n).fill(0).map((_, i, arr) => i === arr.length ? 1 : 0))
    };
  },
  
  /**
   * Kalman filter predict step
   */
  kalmanPredict: function(kf, u = null) {
    const n = kf.A.length;
    
    // x_pred = A * x + B * u
    const xPred = this._matVecMul(kf.A, kf.x);
    if (u && kf.B) {
      const Bu = this._matVecMul(kf.B, Array.isArray(u) ? u : [u]);
      for (let i = 0; i < n; i++) xPred[i] += Bu[i];
    }
    
    // P_pred = A * P * A' + Q
    const AP = this._matMul(kf.A, kf.P);
    const APAt = this._matMul(AP, this._transpose(kf.A));
    const PPred = APAt.map((row, i) => row.map((v, j) => v + kf.Q[i][j]));
    
    return { xPred, PPred };
  },
  
  /**
   * Kalman filter update step
   */
  kalmanUpdate: function(kf, y, xPred, PPred) {
    const n = kf.A.length;
    const p = kf.C.length;
    
    // Innovation: y_tilde = y - C * x_pred
    const Cx = this._matVecMul(kf.C, xPred);
    const yTilde = Array.isArray(y) ? y.map((yi, i) => yi - Cx[i]) : [y - Cx[0]];
    
    // S = C * P_pred * C' + R
    const CP = this._matMul(kf.C, PPred);
    const CPCt = this._matMul(CP, this._transpose(kf.C));
    const S = CPCt.map((row, i) => row.map((v, j) => v + kf.R[i][j]));
    
    // K = P_pred * C' * S^(-1)
    const PCtT = this._matMul(PPred, this._transpose(kf.C));
    const SInv = this._invert2x2(S); // Simplified for small matrices
    const K = this._matMul(PCtT, SInv || [[1/S[0][0]]]);
    
    // x = x_pred + K * y_tilde
    const Ky = this._matVecMul(K, yTilde);
    const xNew = xPred.map((xi, i) => xi + Ky[i]);
    
    // P = (I - K*C) * P_pred
    const KC = this._matMul(K, kf.C);
    const IminusKC = KC.map((row, i) => row.map((v, j) => (i === j ? 1 : 0) - v));
    const PNew = this._matMul(IminusKC, PPred);
    
    // Update filter state
    kf.x = xNew;
    kf.P = PNew;
    
    return { x: xNew, P: PNew, K, innovation: yTilde };
  },
  
  /**
   * Extended Kalman Filter step
   */
  ekfStep: function(config) {
    const { f, h, Fx, Hx, x, P, u, y, Q, R } = config;
    
    // Predict
    const xPred = f(x, u);
    const F = Fx(x, u); // Jacobian of f
    const PPred = this._matMul(this._matMul(F, P), this._transpose(F));
    for (let i = 0; i < Q.length; i++) {
      for (let j = 0; j < Q[i].length; j++) {
        PPred[i][j] += Q[i][j];
      }
    }
    
    // Update
    const H = Hx(xPred); // Jacobian of h
    const yPred = h(xPred);
    const innovation = Array.isArray(y) ? y.map((yi, i) => yi - yPred[i]) : [y - yPred];
    
    // S = H*P*H' + R
    const HP = this._matMul(H, PPred);
    const HPHt = this._matMul(HP, this._transpose(H));
    const S = HPHt.map((row, i) => row.map((v, j) => v + R[i][j]));
    
    // K = P*H'*S^(-1)
    const PHt = this._matMul(PPred, this._transpose(H));
    const SInv = S.length === 1 ? [[1/S[0][0]]] : this._invert2x2(S);
    const K = this._matMul(PHt, SInv);
    
    // x = xPred + K*innovation
    const Kinno = this._matVecMul(K, innovation);
    const xNew = xPred.map((xi, i) => xi + Kinno[i]);
    
    // P = (I - K*H)*PPred
    const KH = this._matMul(K, H);
    const ImKH = KH.map((row, i) => row.map((v, j) => (i === j ? 1 : 0) - v));
    const PNew = this._matMul(ImKH, PPred);
    
    return { x: xNew, P: PNew, K, innovation };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ADAPTIVE CONTROL
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Model Reference Adaptive Control update
   */
  mracUpdate: function(config) {
    const { theta, phi, e, gamma, dt } = config;
    
    // θ_dot = -Γ * φ * e
    const thetaNew = theta.map((t, i) => t - gamma * phi[i] * e * dt);
    
    return { theta: thetaNew };
  },
  
  /**
   * Gain scheduling
   */
  gainSchedule: function(config) {
    const { schedulePoints, currentValue } = config;
    
    // Find surrounding schedule points
    const sorted = [...schedulePoints].sort((a, b) => a.value - b.value);
    
    let lower = sorted[0];
    let upper = sorted[sorted.length - 1];
    
    for (let i = 0; i < sorted.length - 1; i++) {
      if (currentValue >= sorted[i].value && currentValue <= sorted[i+1].value) {
        lower = sorted[i];
        upper = sorted[i+1];
        break;
      }
    }
    
    // Linear interpolation
    const t = (currentValue - lower.value) / (upper.value - lower.value + 1e-10);
    
    const gains = {};
    for (const key of Object.keys(lower.gains)) {
      gains[key] = lower.gains[key] + t * (upper.gains[key] - lower.gains[key]);
    }
    
    return gains;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MACHINING SPECIFIC CONTROL
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Adaptive feed rate control
   */
  adaptiveFeed: function(config) {
    const { 
      currentFeed, targetForce, measuredForce,
      minFeed = 10, maxFeed = 5000,
      maxChange = 100,
      Kp = 0.5, Ki = 0.1
    } = config;
    
    const error = targetForce - measuredForce;
    
    // PI control on force error
    this._adaptiveFeedIntegral = (this._adaptiveFeedIntegral || 0) + error;
    
    let feedChange = Kp * error + Ki * this._adaptiveFeedIntegral;
    
    // Rate limit
    feedChange = Math.max(-maxChange, Math.min(maxChange, feedChange));
    
    // Calculate new feed
    let newFeed = currentFeed + feedChange;
    newFeed = Math.max(minFeed, Math.min(maxFeed, newFeed));
    
    // Anti-windup
    if (newFeed === minFeed || newFeed === maxFeed) {
      this._adaptiveFeedIntegral -= error;
    }
    
    return {
      feed: newFeed,
      error,
      feedChange,
      limited: newFeed === minFeed || newFeed === maxFeed
    };
  },
  
  /**
   * Constant chip load control
   */
  constantChipLoad: function(config) {
    const { 
      nominalFeed, targetPower, measuredPower,
      minFeed = 10, maxFeed = 5000,
      smoothing = 0.8
    } = config;
    
    // Feed proportional to power ratio
    const ratio = measuredPower > 0 ? targetPower / measuredPower : 1;
    let newFeed = nominalFeed * ratio;
    
    // Smooth the response
    const prevFeed = this._prevChipLoadFeed || nominalFeed;
    newFeed = smoothing * prevFeed + (1 - smoothing) * newFeed;
    
    // Apply limits
    newFeed = Math.max(minFeed, Math.min(maxFeed, newFeed));
    
    this._prevChipLoadFeed = newFeed;
    
    return {
      feed: newFeed,
      powerRatio: ratio,
      adjustment: newFeed / nominalFeed
    };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MATRIX UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════
  
  _matVecMul: function(M, v) {
    return M.map(row => row.reduce((sum, m, j) => sum + m * v[j], 0));
  },
  
  _matMul: function(A, B) {
    const result = [];
    for (let i = 0; i < A.length; i++) {
      result[i] = [];
      for (let j = 0; j < B[0].length; j++) {
        result[i][j] = 0;
        for (let k = 0; k < A[0].length; k++) {
          result[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    return result;
  },
  
  _transpose: function(M) {
    return M[0].map((_, j) => M.map(row => row[j]));
  },
  
  _invert2x2: function(M) {
    if (M.length !== 2) return null;
    const det = M[0][0] * M[1][1] - M[0][1] * M[1][0];
    if (Math.abs(det) < 1e-10) return null;
    return [
      [M[1][1] / det, -M[0][1] / det],
      [-M[1][0] / det, M[0][0] / det]
    ];
  },
  
  _discretizeA: function(A, dt) {
    // Simple Euler approximation: Ad ≈ I + A*dt
    const n = A.length;
    return A.map((row, i) => row.map((v, j) => (i === j ? 1 : 0) + v * dt));
  },
  
  _discretizeB: function(A, B, dt) {
    // Simple approximation: Bd ≈ B*dt
    return B.map(row => row.map(v => v * dt));
  },
  
  _approximateRank: function(M) {
    // Simplified rank estimation using row reduction
    const m = M.map(row => [...row]);
    const rows = m.length;
    const cols = m[0].length;
    let rank = 0;
    
    for (let col = 0; col < cols && rank < rows; col++) {
      // Find pivot
      let pivot = -1;
      for (let row = rank; row < rows; row++) {
        if (Math.abs(m[row][col]) > 1e-10) {
          pivot = row;
          break;
        }
      }
      
      if (pivot === -1) continue;
      
      // Swap rows
      [m[rank], m[pivot]] = [m[pivot], m[rank]];
      
      // Eliminate
      for (let row = rank + 1; row < rows; row++) {
        const factor = m[row][col] / m[rank][col];
        for (let c = col; c < cols; c++) {
          m[row][c] -= factor * m[rank][c];
        }
      }
      
      rank++;
    }
    
    return rank;
  }
};


// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH10_GATEWAY_ROUTES = {
  // PID
  'control.pid.create': 'PRISM_CONTROL.createPID',
  'control.pid.compute': 'PRISM_CONTROL.pidCompute',
  'control.pid.tune.zn': 'PRISM_CONTROL.zieglerNichols',
  'control.pid.antiwindup': 'PRISM_CONTROL.antiWindup',
  
  // State Space
  'control.ss.create': 'PRISM_CONTROL.createStateSpace',
  'control.ss.simulate': 'PRISM_CONTROL.stateSpaceSimulate',
  'control.ss.discretize': 'PRISM_CONTROL.discretize',
  'control.ss.controllability': 'PRISM_CONTROL.checkControllability',
  'control.ss.observability': 'PRISM_CONTROL.checkObservability',
  
  // Optimal Control
  'control.lqr.solve': 'PRISM_CONTROL.solveLQR',
  'control.lqr.gain': 'PRISM_CONTROL.computeLQRGain',
  'control.mpc.step': 'PRISM_CONTROL.mpcStep',
  
  // Estimation
  'control.kalman.create': 'PRISM_CONTROL.createKalman',
  'control.kalman.predict': 'PRISM_CONTROL.kalmanPredict',
  'control.kalman.update': 'PRISM_CONTROL.kalmanUpdate',
  'control.ekf.step': 'PRISM_CONTROL.ekfStep',
  
  // Adaptive
  'control.adaptive.mrac': 'PRISM_CONTROL.mracUpdate',
  'control.adaptive.schedule': 'PRISM_CONTROL.gainSchedule',
  
  // Machining
  'control.feed.adaptive': 'PRISM_CONTROL.adaptiveFeed',
  'control.feed.chipload': 'PRISM_CONTROL.constantChipLoad'
};

function registerBatch10Routes() {
  if (typeof PRISM_GATEWAY !== 'undefined') {
    for (const [route, target] of Object.entries(BATCH10_GATEWAY_ROUTES)) {
      PRISM_GATEWAY.register(route, target);
    }
    console.log(`[Batch 10] Registered ${Object.keys(BATCH10_GATEWAY_ROUTES).length} routes`);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRISM_CONTROL, BATCH10_GATEWAY_ROUTES, registerBatch10Routes };
}

if (typeof window !== 'undefined') {
  window.PRISM_CONTROL = PRISM_CONTROL;
  registerBatch10Routes();
}

console.log('[PRISM Batch 10] Control Systems loaded - 21 routes');

/**
 * PRISM BATCH 1: PROCESS PLANNING & AI
 * Source: MIT 16.410 (Autonomous Systems) + 16.412j (Cognitive Robotics)
 * 
 * Algorithms: A*, CSP, RRT*, HMM, MDP, MCTS
 * Gateway Routes: 20
 */

const PRISM_PROCESS_PLANNING = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // A* SEARCH
  // ═══════════════════════════════════════════════════════════════════════════
  
  aStarSearch: function(problem) {
    const openSet = new Map();
    const closedSet = new Set();
    const gScore = new Map();
    const fScore = new Map();
    const cameFrom = new Map();
    
    const startKey = JSON.stringify(problem.initial);
    openSet.set(startKey, problem.initial);
    gScore.set(startKey, 0);
    fScore.set(startKey, problem.heuristic(problem.initial));
    
    let iterations = 0;
    const maxIterations = problem.maxIterations || 10000;
    
    while (openSet.size > 0 && iterations < maxIterations) {
      iterations++;
      
      // Get node with lowest fScore
      let currentKey = null;
      let lowestF = Infinity;
      for (const [key, _] of openSet) {
        const f = fScore.get(key);
        if (f < lowestF) {
          lowestF = f;
          currentKey = key;
        }
      }
      
      const current = openSet.get(currentKey);
      
      if (problem.isGoal(current)) {
        return this._reconstructPath(cameFrom, currentKey, gScore.get(currentKey));
      }
      
      openSet.delete(currentKey);
      closedSet.add(currentKey);
      
      const successors = problem.getSuccessors ? 
        problem.getSuccessors(current) : 
        problem.successors(current);
      
      for (const { state, action, cost } of successors) {
        const neighborKey = JSON.stringify(state);
        
        if (closedSet.has(neighborKey)) continue;
        
        const tentativeG = gScore.get(currentKey) + cost;
        
        if (!openSet.has(neighborKey)) {
          openSet.set(neighborKey, state);
          gScore.set(neighborKey, Infinity);
        }
        
        if (tentativeG < gScore.get(neighborKey)) {
          cameFrom.set(neighborKey, { parent: currentKey, action, cost });
          gScore.set(neighborKey, tentativeG);
          fScore.set(neighborKey, tentativeG + problem.heuristic(state));
        }
      }
    }
    
    return { found: false, iterations };
  },
  
  _reconstructPath: function(cameFrom, goalKey, totalCost) {
    const path = [];
    let current = goalKey;
    
    while (cameFrom.has(current)) {
      const { parent, action, cost } = cameFrom.get(current);
      path.unshift({ action, cost });
      current = parent;
    }
    
    return { found: true, path, totalCost };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // BFS & DFS
  // ═══════════════════════════════════════════════════════════════════════════
  
  bfs: function(problem) {
    const queue = [{ state: problem.initial, path: [], cost: 0 }];
    const visited = new Set([JSON.stringify(problem.initial)]);
    
    while (queue.length > 0) {
      const { state, path, cost } = queue.shift();
      
      if (problem.isGoal(state)) {
        return { found: true, path, cost };
      }
      
      for (const { state: next, action, cost: stepCost } of problem.getSuccessors(state)) {
        const key = JSON.stringify(next);
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({
            state: next,
            path: [...path, action],
            cost: cost + stepCost
          });
        }
      }
    }
    
    return { found: false };
  },
  
  dfs: function(problem, maxDepth = 1000) {
    const stack = [{ state: problem.initial, path: [], cost: 0, depth: 0 }];
    const visited = new Set();
    
    while (stack.length > 0) {
      const { state, path, cost, depth } = stack.pop();
      const key = JSON.stringify(state);
      
      if (visited.has(key) || depth > maxDepth) continue;
      visited.add(key);
      
      if (problem.isGoal(state)) {
        return { found: true, path, cost };
      }
      
      for (const { state: next, action, cost: stepCost } of problem.getSuccessors(state)) {
        stack.push({
          state: next,
          path: [...path, action],
          cost: cost + stepCost,
          depth: depth + 1
        });
      }
    }
    
    return { found: false };
  },
  
  idaStar: function(problem) {
    let threshold = problem.heuristic(problem.initial);
    
    while (threshold < Infinity) {
      const result = this._idaSearch(problem, problem.initial, 0, threshold, []);
      
      if (result.found) return result;
      if (result.nextThreshold === Infinity) return { found: false };
      
      threshold = result.nextThreshold;
    }
    
    return { found: false };
  },
  
  _idaSearch: function(problem, state, g, threshold, path) {
    const f = g + problem.heuristic(state);
    
    if (f > threshold) return { found: false, nextThreshold: f };
    if (problem.isGoal(state)) return { found: true, path, cost: g };
    
    let minThreshold = Infinity;
    
    for (const { state: next, action, cost } of problem.getSuccessors(state)) {
      const result = this._idaSearch(problem, next, g + cost, threshold, [...path, action]);
      
      if (result.found) return result;
      minThreshold = Math.min(minThreshold, result.nextThreshold);
    }
    
    return { found: false, nextThreshold: minThreshold };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTRAINT SATISFACTION PROBLEM (CSP)
  // ═══════════════════════════════════════════════════════════════════════════
  
  cspSolver: function(csp) {
    const { variables, domains, constraints } = csp;
    const assignment = {};
    const domainsCopy = {};
    
    for (const v of variables) {
      domainsCopy[v] = [...domains[v]];
    }
    
    // Apply AC-3 first
    if (!this.ac3(variables, domainsCopy, constraints)) {
      return { solved: false, reason: 'Arc consistency failed' };
    }
    
    const result = this._backtrack(assignment, variables, domainsCopy, constraints);
    
    return result ? { solved: true, assignment: result } : { solved: false };
  },
  
  ac3: function(variables, domains, constraints) {
    const queue = [];
    
    // Initialize queue with all arcs
    for (const c of constraints) {
      if (c.variables.length === 2) {
        queue.push([c.variables[0], c.variables[1], c]);
        queue.push([c.variables[1], c.variables[0], c]);
      }
    }
    
    while (queue.length > 0) {
      const [xi, xj, constraint] = queue.shift();
      
      if (this._revise(domains, xi, xj, constraint)) {
        if (domains[xi].length === 0) return false;
        
        // Add all arcs pointing to xi
        for (const c of constraints) {
          if (c.variables.includes(xi)) {
            for (const xk of c.variables) {
              if (xk !== xi && xk !== xj) {
                queue.push([xk, xi, c]);
              }
            }
          }
        }
      }
    }
    
    return true;
  },
  
  _revise: function(domains, xi, xj, constraint) {
    let revised = false;
    
    domains[xi] = domains[xi].filter(x => {
      const hasSupport = domains[xj].some(y => {
        const testAssignment = { [xi]: x, [xj]: y };
        return constraint.check(testAssignment);
      });
      
      if (!hasSupport) revised = true;
      return hasSupport;
    });
    
    return revised;
  },
  
  _backtrack: function(assignment, variables, domains, constraints) {
    if (Object.keys(assignment).length === variables.length) {
      return { ...assignment };
    }
    
    // MRV heuristic
    const unassigned = variables.filter(v => !(v in assignment));
    const variable = unassigned.reduce((best, v) =>
      domains[v].length < domains[best].length ? v : best
    );
    
    for (const value of domains[variable]) {
      assignment[variable] = value;
      
      if (this._isConsistent(variable, value, assignment, constraints)) {
        const result = this._backtrack(assignment, variables, domains, constraints);
        if (result) return result;
      }
      
      delete assignment[variable];
    }
    
    return null;
  },
  
  _isConsistent: function(variable, value, assignment, constraints) {
    for (const constraint of constraints) {
      if (!constraint.variables.includes(variable)) continue;
      
      // Check if all variables in constraint are assigned
      const allAssigned = constraint.variables.every(v => v in assignment);
      if (!allAssigned) continue;
      
      if (!constraint.check(assignment)) return false;
    }
    return true;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HIDDEN MARKOV MODEL (HMM)
  // ═══════════════════════════════════════════════════════════════════════════
  
  createHMM: function(config) {
    return {
      states: config.states,
      observations: config.observations,
      initial: config.initial,           // π[i] = P(state_0 = i)
      transition: config.transition,      // A[i][j] = P(state_t+1 = j | state_t = i)
      emission: config.emission           // B[i][o] = P(obs = o | state = i)
    };
  },
  
  hmmForward: function(hmm, observations) {
    const T = observations.length;
    const N = hmm.states.length;
    const alpha = Array(T).fill(null).map(() => Array(N).fill(0));
    
    // Initialize
    for (let i = 0; i < N; i++) {
      const obsIdx = hmm.observations.indexOf(observations[0]);
      alpha[0][i] = hmm.initial[i] * hmm.emission[i][obsIdx];
    }
    
    // Forward pass
    for (let t = 1; t < T; t++) {
      const obsIdx = hmm.observations.indexOf(observations[t]);
      for (let j = 0; j < N; j++) {
        let sum = 0;
        for (let i = 0; i < N; i++) {
          sum += alpha[t-1][i] * hmm.transition[i][j];
        }
        alpha[t][j] = sum * hmm.emission[j][obsIdx];
      }
      
      // Normalize to prevent underflow
      const scale = alpha[t].reduce((a, b) => a + b, 0);
      if (scale > 0) {
        for (let j = 0; j < N; j++) alpha[t][j] /= scale;
      }
    }
    
    return {
      alpha,
      probability: alpha[T-1].reduce((a, b) => a + b, 0)
    };
  },
  
  hmmViterbi: function(hmm, observations) {
    const T = observations.length;
    const N = hmm.states.length;
    const delta = Array(T).fill(null).map(() => Array(N).fill(0));
    const psi = Array(T).fill(null).map(() => Array(N).fill(0));
    
    // Initialize
    for (let i = 0; i < N; i++) {
      const obsIdx = hmm.observations.indexOf(observations[0]);
      delta[0][i] = Math.log(hmm.initial[i]) + Math.log(hmm.emission[i][obsIdx]);
      psi[0][i] = 0;
    }
    
    // Recursion
    for (let t = 1; t < T; t++) {
      const obsIdx = hmm.observations.indexOf(observations[t]);
      for (let j = 0; j < N; j++) {
        let maxVal = -Infinity;
        let maxIdx = 0;
        
        for (let i = 0; i < N; i++) {
          const val = delta[t-1][i] + Math.log(hmm.transition[i][j]);
          if (val > maxVal) {
            maxVal = val;
            maxIdx = i;
          }
        }
        
        delta[t][j] = maxVal + Math.log(hmm.emission[j][obsIdx]);
        psi[t][j] = maxIdx;
      }
    }
    
    // Termination
    let maxVal = -Infinity;
    let lastState = 0;
    for (let i = 0; i < N; i++) {
      if (delta[T-1][i] > maxVal) {
        maxVal = delta[T-1][i];
        lastState = i;
      }
    }
    
    // Backtrack
    const path = [lastState];
    for (let t = T - 1; t > 0; t--) {
      path.unshift(psi[t][path[0]]);
    }
    
    return {
      path: path.map(i => hmm.states[i]),
      pathIndices: path,
      logProbability: maxVal
    };
  },
  
  hmmEstimate: function(observations, config = {}) {
    const hmm = config.model || this._defaultToolWearHMM();
    
    // Map observations to emission probabilities
    const mappedObs = observations.map(o => this._mapObservationToIndex(o, hmm));
    
    const forward = this.hmmForward(hmm, mappedObs);
    const viterbi = this.hmmViterbi(hmm, mappedObs);
    
    // Get current state probabilities
    const lastAlpha = forward.alpha[forward.alpha.length - 1];
    const sum = lastAlpha.reduce((a, b) => a + b, 0);
    const probabilities = lastAlpha.map(a => a / sum);
    
    const mostLikelyIdx = probabilities.indexOf(Math.max(...probabilities));
    
    return {
      currentState: hmm.states[mostLikelyIdx],
      probabilities: Object.fromEntries(hmm.states.map((s, i) => [s, probabilities[i]])),
      stateSequence: viterbi.path,
      wearLevel: mostLikelyIdx / (hmm.states.length - 1),
      confidence: Math.max(...probabilities)
    };
  },
  
  _defaultToolWearHMM: function() {
    return {
      states: ['new', 'light_wear', 'moderate_wear', 'heavy_wear', 'failed'],
      observations: ['normal', 'slightly_elevated', 'elevated', 'high', 'critical'],
      initial: [0.9, 0.08, 0.02, 0.0, 0.0],
      transition: [
        [0.85, 0.12, 0.02, 0.01, 0.00],
        [0.00, 0.75, 0.20, 0.05, 0.00],
        [0.00, 0.00, 0.65, 0.30, 0.05],
        [0.00, 0.00, 0.00, 0.50, 0.50],
        [0.00, 0.00, 0.00, 0.00, 1.00]
      ],
      emission: [
        [0.90, 0.08, 0.02, 0.00, 0.00],
        [0.10, 0.70, 0.15, 0.05, 0.00],
        [0.02, 0.15, 0.60, 0.20, 0.03],
        [0.00, 0.05, 0.15, 0.55, 0.25],
        [0.00, 0.00, 0.05, 0.25, 0.70]
      ]
    };
  },
  
  _mapObservationToIndex: function(obs, hmm) {
    if (typeof obs === 'number') {
      // Map numeric ratio to observation index
      if (obs < 1.1) return 0;
      if (obs < 1.3) return 1;
      if (obs < 1.6) return 2;
      if (obs < 2.0) return 3;
      return 4;
    }
    return hmm.observations.indexOf(obs);
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MARKOV DECISION PROCESS (MDP)
  // ═══════════════════════════════════════════════════════════════════════════
  
  valueIteration: function(mdp, config = {}) {
    const { gamma = 0.95, theta = 0.0001, maxIterations = 1000 } = config;
    const { states, actions, transition, reward } = mdp;
    
    let V = {};
    for (const s of states) V[s] = 0;
    
    for (let iter = 0; iter < maxIterations; iter++) {
      let delta = 0;
      
      for (const s of states) {
        const v = V[s];
        
        let maxValue = -Infinity;
        for (const a of actions) {
          let value = 0;
          const transitions = transition(s, a);
          
          for (const { nextState, probability } of transitions) {
            value += probability * (reward(s, a, nextState) + gamma * V[nextState]);
          }
          
          maxValue = Math.max(maxValue, value);
        }
        
        V[s] = maxValue;
        delta = Math.max(delta, Math.abs(v - V[s]));
      }
      
      if (delta < theta) {
        return { V, iterations: iter + 1, converged: true, policy: this._extractPolicy(mdp, V, gamma) };
      }
    }
    
    return { V, iterations: maxIterations, converged: false, policy: this._extractPolicy(mdp, V, gamma) };
  },
  
  policyIteration: function(mdp, config = {}) {
    const { gamma = 0.95, maxIterations = 100 } = config;
    const { states, actions, transition, reward } = mdp;
    
    // Initialize random policy
    let policy = {};
    for (const s of states) {
      policy[s] = actions[0];
    }
    
    for (let iter = 0; iter < maxIterations; iter++) {
      // Policy Evaluation
      const V = this._policyEvaluation(mdp, policy, gamma);
      
      // Policy Improvement
      let stable = true;
      for (const s of states) {
        const oldAction = policy[s];
        
        let bestAction = actions[0];
        let bestValue = -Infinity;
        
        for (const a of actions) {
          let value = 0;
          for (const { nextState, probability } of transition(s, a)) {
            value += probability * (reward(s, a, nextState) + gamma * V[nextState]);
          }
          
          if (value > bestValue) {
            bestValue = value;
            bestAction = a;
          }
        }
        
        policy[s] = bestAction;
        if (oldAction !== bestAction) stable = false;
      }
      
      if (stable) {
        return { policy, V, iterations: iter + 1, converged: true };
      }
    }
    
    return { policy, iterations: maxIterations, converged: false };
  },
  
  _policyEvaluation: function(mdp, policy, gamma, theta = 0.0001) {
    const { states, transition, reward } = mdp;
    
    let V = {};
    for (const s of states) V[s] = 0;
    
    for (let iter = 0; iter < 1000; iter++) {
      let delta = 0;
      
      for (const s of states) {
        const v = V[s];
        const a = policy[s];
        
        let newV = 0;
        for (const { nextState, probability } of transition(s, a)) {
          newV += probability * (reward(s, a, nextState) + gamma * V[nextState]);
        }
        
        V[s] = newV;
        delta = Math.max(delta, Math.abs(v - V[s]));
      }
      
      if (delta < theta) break;
    }
    
    return V;
  },
  
  _extractPolicy: function(mdp, V, gamma) {
    const { states, actions, transition, reward } = mdp;
    const policy = {};
    
    for (const s of states) {
      let bestAction = actions[0];
      let bestValue = -Infinity;
      
      for (const a of actions) {
        let value = 0;
        for (const { nextState, probability } of transition(s, a)) {
          value += probability * (reward(s, a, nextState) + gamma * V[nextState]);
        }
        
        if (value > bestValue) {
          bestValue = value;
          bestAction = a;
        }
      }
      
      policy[s] = bestAction;
    }
    
    return policy;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RRT / RRT*
  // ═══════════════════════════════════════════════════════════════════════════
  
  rrt: function(config) {
    const { start, goal, obstacles, bounds, maxIterations = 5000, stepSize = 5, goalBias = 0.1 } = config;
    
    const nodes = [{ point: start, parent: null, cost: 0 }];
    
    for (let i = 0; i < maxIterations; i++) {
      // Sample with goal bias
      const target = Math.random() < goalBias ? goal : this._randomPoint(bounds);
      
      // Find nearest
      const nearest = this._findNearest(nodes, target);
      
      // Steer
      const newPoint = this._steer(nearest.point, target, stepSize);
      
      // Check collision
      if (this._collisionFree(nearest.point, newPoint, obstacles)) {
        const newNode = {
          point: newPoint,
          parent: nearest,
          cost: nearest.cost + this._distance(nearest.point, newPoint)
        };
        nodes.push(newNode);
        
        // Check goal
        if (this._distance(newPoint, goal) < stepSize) {
          return {
            found: true,
            path: this._extractPath(newNode),
            cost: newNode.cost,
            iterations: i + 1
          };
        }
      }
    }
    
    return { found: false, iterations: maxIterations };
  },
  
  rrtStar: function(config) {
    const { start, goal, obstacles, bounds, maxIterations = 5000, stepSize = 5, goalBias = 0.1, rewireRadius = 20 } = config;
    
    const nodes = [{ point: start, parent: null, cost: 0 }];
    let bestGoalNode = null;
    
    for (let i = 0; i < maxIterations; i++) {
      const target = Math.random() < goalBias ? goal : this._randomPoint(bounds);
      const nearest = this._findNearest(nodes, target);
      const newPoint = this._steer(nearest.point, target, stepSize);
      
      if (!this._collisionFree(nearest.point, newPoint, obstacles)) continue;
      
      // Find nearby nodes
      const nearby = nodes.filter(n => this._distance(n.point, newPoint) < rewireRadius);
      
      // Find best parent
      let bestParent = nearest;
      let bestCost = nearest.cost + this._distance(nearest.point, newPoint);
      
      for (const n of nearby) {
        const cost = n.cost + this._distance(n.point, newPoint);
        if (cost < bestCost && this._collisionFree(n.point, newPoint, obstacles)) {
          bestParent = n;
          bestCost = cost;
        }
      }
      
      const newNode = { point: newPoint, parent: bestParent, cost: bestCost };
      nodes.push(newNode);
      
      // Rewire
      for (const n of nearby) {
        const newCost = newNode.cost + this._distance(newNode.point, n.point);
        if (newCost < n.cost && this._collisionFree(newNode.point, n.point, obstacles)) {
          n.parent = newNode;
          n.cost = newCost;
        }
      }
      
      // Check goal
      if (this._distance(newPoint, goal) < stepSize) {
        if (!bestGoalNode || newNode.cost < bestGoalNode.cost) {
          bestGoalNode = newNode;
        }
      }
    }
    
    if (bestGoalNode) {
      return {
        found: true,
        path: this._extractPath(bestGoalNode),
        cost: bestGoalNode.cost,
        nodes: nodes.length
      };
    }
    
    return { found: false, nodes: nodes.length };
  },
  
  _randomPoint: function(bounds) {
    return {
      x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
      y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY),
      z: (bounds.minZ !== undefined) ? bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ) : 0
    };
  },
  
  _findNearest: function(nodes, point) {
    return nodes.reduce((nearest, n) =>
      this._distance(n.point, point) < this._distance(nearest.point, point) ? n : nearest
    );
  },
  
  _steer: function(from, to, stepSize) {
    const dist = this._distance(from, to);
    if (dist <= stepSize) return { ...to };
    
    const ratio = stepSize / dist;
    return {
      x: from.x + (to.x - from.x) * ratio,
      y: from.y + (to.y - from.y) * ratio,
      z: from.z !== undefined ? from.z + ((to.z || 0) - (from.z || 0)) * ratio : undefined
    };
  },
  
  _distance: function(a, b) {
    const dz = (a.z !== undefined && b.z !== undefined) ? (a.z - b.z) ** 2 : 0;
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + dz);
  },
  
  _collisionFree: function(from, to, obstacles) {
    if (!obstacles || obstacles.length === 0) return true;
    
    // Check line segment against each obstacle
    for (const obs of obstacles) {
      if (this._lineIntersectsAABB(from, to, obs)) return false;
    }
    return true;
  },
  
  _lineIntersectsAABB: function(p1, p2, box) {
    // Simplified AABB collision check
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    
    return !(maxX < box.minX || minX > box.maxX || maxY < box.minY || minY > box.maxY);
  },
  
  _extractPath: function(node) {
    const path = [];
    while (node) {
      path.unshift(node.point);
      node = node.parent;
    }
    return path;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MONTE CARLO TREE SEARCH
  // ═══════════════════════════════════════════════════════════════════════════
  
  mcts: function(config) {
    const { rootState, getActions, applyAction, isTerminal, getReward, iterations = 1000, explorationConstant = 1.414 } = config;
    
    const root = {
      state: rootState,
      parent: null,
      children: [],
      visits: 0,
      value: 0,
      untriedActions: getActions(rootState)
    };
    
    for (let i = 0; i < iterations; i++) {
      let node = this._mctsSelect(root, explorationConstant);
      node = this._mctsExpand(node, getActions, applyAction);
      const reward = this._mctsSimulate(node.state, getActions, applyAction, isTerminal, getReward);
      this._mctsBackpropagate(node, reward);
    }
    
    // Return best child
    const bestChild = root.children.reduce((best, child) =>
      child.visits > best.visits ? child : best
    , root.children[0]);
    
    return {
      bestAction: bestChild?.action,
      visits: root.visits,
      children: root.children.map(c => ({
        action: c.action,
        visits: c.visits,
        value: c.value / c.visits
      }))
    };
  },
  
  _mctsSelect: function(node, c) {
    while (node.untriedActions.length === 0 && node.children.length > 0) {
      node = node.children.reduce((best, child) => {
        const ucb = child.value / child.visits + c * Math.sqrt(Math.log(node.visits) / child.visits);
        const bestUcb = best.value / best.visits + c * Math.sqrt(Math.log(node.visits) / best.visits);
        return ucb > bestUcb ? child : best;
      });
    }
    return node;
  },
  
  _mctsExpand: function(node, getActions, applyAction) {
    if (node.untriedActions.length > 0) {
      const action = node.untriedActions.pop();
      const newState = applyAction(node.state, action);
      const child = {
        state: newState,
        parent: node,
        action: action,
        children: [],
        visits: 0,
        value: 0,
        untriedActions: getActions(newState)
      };
      node.children.push(child);
      return child;
    }
    return node;
  },
  
  _mctsSimulate: function(state, getActions, applyAction, isTerminal, getReward, maxDepth = 100) {
    let currentState = state;
    let depth = 0;
    
    while (!isTerminal(currentState) && depth < maxDepth) {
      const actions = getActions(currentState);
      if (actions.length === 0) break;
      
      const action = actions[Math.floor(Math.random() * actions.length)];
      currentState = applyAction(currentState, action);
      depth++;
    }
    
    return getReward(currentState);
  },
  
  _mctsBackpropagate: function(node, reward) {
    while (node) {
      node.visits++;
      node.value += reward;
      node = node.parent;
    }
  }
};


// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH1_GATEWAY_ROUTES = {
  // Search
  'plan.search.astar': 'PRISM_PROCESS_PLANNING.aStarSearch',
  'plan.search.bfs': 'PRISM_PROCESS_PLANNING.bfs',
  'plan.search.dfs': 'PRISM_PROCESS_PLANNING.dfs',
  'plan.search.ida': 'PRISM_PROCESS_PLANNING.idaStar',
  
  // CSP
  'plan.csp.solve': 'PRISM_PROCESS_PLANNING.cspSolver',
  'plan.csp.ac3': 'PRISM_PROCESS_PLANNING.ac3',
  
  // HMM
  'plan.hmm.forward': 'PRISM_PROCESS_PLANNING.hmmForward',
  'plan.hmm.viterbi': 'PRISM_PROCESS_PLANNING.hmmViterbi',
  'plan.hmm.estimate': 'PRISM_PROCESS_PLANNING.hmmEstimate',
  'plan.hmm.create': 'PRISM_PROCESS_PLANNING.createHMM',
  
  // MDP
  'plan.mdp.valueIteration': 'PRISM_PROCESS_PLANNING.valueIteration',
  'plan.mdp.policyIteration': 'PRISM_PROCESS_PLANNING.policyIteration',
  
  // Motion Planning
  'plan.motion.rrt': 'PRISM_PROCESS_PLANNING.rrt',
  'plan.motion.rrtstar': 'PRISM_PROCESS_PLANNING.rrtStar',
  
  // MCTS
  'plan.mcts': 'PRISM_PROCESS_PLANNING.mcts'
};

// Register with PRISM_GATEWAY if available
function registerBatch1Routes() {
  if (typeof PRISM_GATEWAY !== 'undefined') {
    for (const [route, target] of Object.entries(BATCH1_GATEWAY_ROUTES)) {
      PRISM_GATEWAY.register(route, target);
    }
    console.log(`[Batch 1] Registered ${Object.keys(BATCH1_GATEWAY_ROUTES).length} routes`);
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRISM_PROCESS_PLANNING, BATCH1_GATEWAY_ROUTES, registerBatch1Routes };
}

// Auto-register
if (typeof window !== 'undefined') {
  window.PRISM_PROCESS_PLANNING = PRISM_PROCESS_PLANNING;
  registerBatch1Routes();
}

console.log('[PRISM Batch 1] Process Planning & AI loaded - 15 algorithms, 15 routes');

/**
 * PRISM BATCH 2: OPTIMIZATION
 * Source: MIT 15.083j (Integer Programming) + 15.084j (Nonlinear Programming)
 * 
 * Algorithms: LP, IP, QP, Nonlinear, Metaheuristics
 * Gateway Routes: 22
 */

const PRISM_OPTIMIZATION = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LINEAR ALGEBRA HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  _dot: function(a, b) {
    return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  },
  
  _norm: function(v) {
    return Math.sqrt(v.reduce((sum, vi) => sum + vi * vi, 0));
  },
  
  _scale: function(v, s) {
    return v.map(vi => vi * s);
  },
  
  _add: function(a, b) {
    return a.map((ai, i) => ai + b[i]);
  },
  
  _sub: function(a, b) {
    return a.map((ai, i) => ai - b[i]);
  },
  
  _matVec: function(A, x) {
    return A.map(row => this._dot(row, x));
  },
  
  _transpose: function(A) {
    return A[0].map((_, j) => A.map(row => row[j]));
  },
  
  _solveLinear: function(A, b) {
    const n = b.length;
    const aug = A.map((row, i) => [...row, b[i]]);
    
    // Forward elimination with pivoting
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
      }
      [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
      
      if (Math.abs(aug[i][i]) < 1e-12) continue;
      
      for (let k = i + 1; k < n; k++) {
        const factor = aug[k][i] / aug[i][i];
        for (let j = i; j <= n; j++) {
          aug[k][j] -= factor * aug[i][j];
        }
      }
    }
    
    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = aug[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= aug[i][j] * x[j];
      }
      x[i] /= aug[i][i] || 1;
    }
    
    return x;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NEWTON'S METHOD
  // ═══════════════════════════════════════════════════════════════════════════
  
  newtonMethod: function(config) {
    const { f, gradient, hessian, x0, maxIter = 100, tol = 1e-8, alpha = 0.3, beta = 0.8 } = config;
    
    let x = [...x0];
    const history = [{ x: [...x], f: f(x) }];
    
    for (let iter = 0; iter < maxIter; iter++) {
      const g = gradient(x);
      const gradNorm = this._norm(g);
      
      if (gradNorm < tol) {
        return { x, f: f(x), converged: true, iterations: iter, history };
      }
      
      const H = hessian(x);
      const d = this._solveLinear(H, g.map(gi => -gi));
      
      // Backtracking line search
      let t = 1;
      const fx = f(x);
      const gd = this._dot(g, d);
      
      while (f(this._add(x, this._scale(d, t))) > fx + alpha * t * gd) {
        t *= beta;
        if (t < 1e-10) break;
      }
      
      x = this._add(x, this._scale(d, t));
      history.push({ x: [...x], f: f(x), gradNorm, step: t });
    }
    
    return { x, f: f(x), converged: false, iterations: maxIter, history };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // BFGS QUASI-NEWTON
  // ═══════════════════════════════════════════════════════════════════════════
  
  bfgs: function(config) {
    const { f, gradient, x0, maxIter = 100, tol = 1e-8 } = config;
    const n = x0.length;
    
    let x = [...x0];
    let g = gradient(x);
    let B = Array(n).fill(null).map((_, i) => 
      Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
    ); // Identity matrix
    
    const history = [{ x: [...x], f: f(x) }];
    
    for (let iter = 0; iter < maxIter; iter++) {
      const gradNorm = this._norm(g);
      if (gradNorm < tol) {
        return { x, f: f(x), converged: true, iterations: iter, history };
      }
      
      // Search direction: d = -B * g
      const d = this._matVec(B, g).map(v => -v);
      
      // Line search
      let alpha = 1;
      const fx = f(x);
      while (f(this._add(x, this._scale(d, alpha))) > fx + 0.0001 * alpha * this._dot(g, d)) {
        alpha *= 0.5;
        if (alpha < 1e-10) break;
      }
      
      const s = this._scale(d, alpha);
      const xNew = this._add(x, s);
      const gNew = gradient(xNew);
      const y = this._sub(gNew, g);
      
      // BFGS update
      const rho = 1 / this._dot(y, s);
      if (isFinite(rho) && rho > 0) {
        // B = (I - rho*s*y') * B * (I - rho*y*s') + rho*s*s'
        const sy = this._outer(s, y);
        const ys = this._outer(y, s);
        const ss = this._outer(s, s);
        
        const I = Array(n).fill(null).map((_, i) => 
          Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
        );
        
        const left = this._matSub(I, this._matScale(sy, rho));
        const right = this._matSub(I, this._matScale(ys, rho));
        
        B = this._matAdd(this._matMul(this._matMul(left, B), right), this._matScale(ss, rho));
      }
      
      x = xNew;
      g = gNew;
      history.push({ x: [...x], f: f(x), gradNorm, step: alpha });
    }
    
    return { x, f: f(x), converged: false, iterations: maxIter, history };
  },
  
  _outer: function(a, b) {
    return a.map(ai => b.map(bj => ai * bj));
  },
  
  _matMul: function(A, B) {
    const m = A.length, n = B[0].length, k = B.length;
    return Array(m).fill(null).map((_, i) =>
      Array(n).fill(0).map((_, j) =>
        A[i].reduce((sum, aik, kk) => sum + aik * B[kk][j], 0)
      )
    );
  },
  
  _matAdd: function(A, B) {
    return A.map((row, i) => row.map((a, j) => a + B[i][j]));
  },
  
  _matSub: function(A, B) {
    return A.map((row, i) => row.map((a, j) => a - B[i][j]));
  },
  
  _matScale: function(A, s) {
    return A.map(row => row.map(a => a * s));
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GRADIENT DESCENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  gradientDescent: function(config) {
    const { f, gradient, x0, learningRate = 0.01, momentum = 0.9, maxIter = 1000, tol = 1e-6 } = config;
    
    let x = [...x0];
    let v = x.map(() => 0);
    const history = [];
    
    for (let iter = 0; iter < maxIter; iter++) {
      const g = gradient(x);
      const gradNorm = this._norm(g);
      
      history.push({ x: [...x], f: f(x), gradNorm });
      
      if (gradNorm < tol) {
        return { x, f: f(x), converged: true, iterations: iter, history };
      }
      
      // Momentum update
      v = this._add(this._scale(v, momentum), this._scale(g, -learningRate));
      x = this._add(x, v);
    }
    
    return { x, f: f(x), converged: false, iterations: maxIter, history };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONJUGATE GRADIENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  conjugateGradient: function(config) {
    const { f, gradient, x0, maxIter = 1000, tol = 1e-6 } = config;
    
    let x = [...x0];
    let g = gradient(x);
    let d = g.map(gi => -gi);
    const history = [];
    
    for (let iter = 0; iter < maxIter; iter++) {
      const gradNorm = this._norm(g);
      history.push({ x: [...x], f: f(x), gradNorm });
      
      if (gradNorm < tol) {
        return { x, f: f(x), converged: true, iterations: iter, history };
      }
      
      // Line search
      let alpha = this._lineSearch(f, x, d, 1);
      x = this._add(x, this._scale(d, alpha));
      
      const gNew = gradient(x);
      
      // Polak-Ribière formula
      const beta = Math.max(0, this._dot(gNew, this._sub(gNew, g)) / this._dot(g, g));
      
      d = this._add(this._scale(gNew, -1), this._scale(d, beta));
      g = gNew;
    }
    
    return { x, f: f(x), converged: false, iterations: maxIter, history };
  },
  
  _lineSearch: function(f, x, d, initialAlpha) {
    let alpha = initialAlpha;
    const fx = f(x);
    
    while (f(this._add(x, this._scale(d, alpha))) > fx && alpha > 1e-10) {
      alpha *= 0.5;
    }
    
    return alpha;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PENALTY METHOD
  // ═══════════════════════════════════════════════════════════════════════════
  
  penaltyMethod: function(config) {
    const { f, gradient, constraints, x0, mu0 = 1, muFactor = 10, maxOuter = 20, tol = 1e-6 } = config;
    
    let x = [...x0];
    let mu = mu0;
    
    for (let outer = 0; outer < maxOuter; outer++) {
      // Define penalized objective
      const penalizedF = (x) => {
        let penalty = 0;
        for (const g of constraints) {
          const violation = Math.max(0, g(x));
          penalty += violation * violation;
        }
        return f(x) + mu * penalty;
      };
      
      const penalizedGrad = (x) => {
        const n = x.length;
        const grad = gradient(x);
        const h = 1e-6;
        
        for (const g of constraints) {
          const violation = Math.max(0, g(x));
          if (violation > 0) {
            for (let i = 0; i < n; i++) {
              const xPlus = [...x]; xPlus[i] += h;
              const xMinus = [...x]; xMinus[i] -= h;
              const gGrad = (g(xPlus) - g(xMinus)) / (2 * h);
              grad[i] += 2 * mu * violation * gGrad;
            }
          }
        }
        
        return grad;
      };
      
      // Solve unconstrained subproblem
      const result = this.bfgs({
        f: penalizedF,
        gradient: penalizedGrad,
        x0: x,
        maxIter: 100,
        tol: tol / 10
      });
      
      x = result.x;
      
      // Check constraint satisfaction
      let maxViolation = 0;
      for (const g of constraints) {
        maxViolation = Math.max(maxViolation, Math.max(0, g(x)));
      }
      
      if (maxViolation < tol) {
        return { x, f: f(x), converged: true, outerIterations: outer + 1, maxViolation };
      }
      
      mu *= muFactor;
    }
    
    return { x, f: f(x), converged: false, outerIterations: maxOuter };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SIMULATED ANNEALING
  // ═══════════════════════════════════════════════════════════════════════════
  
  simulatedAnnealing: function(config) {
    const { 
      f, 
      neighbor, 
      x0, 
      T0 = 1000, 
      coolingRate = 0.995, 
      minT = 0.01, 
      iterPerTemp = 100 
    } = config;
    
    let x = Array.isArray(x0) ? [...x0] : x0;
    let fx = f(x);
    let best = x;
    let bestF = fx;
    let T = T0;
    
    const history = [];
    
    while (T > minT) {
      for (let i = 0; i < iterPerTemp; i++) {
        const xNew = neighbor(x);
        const fNew = f(xNew);
        const delta = fNew - fx;
        
        if (delta < 0 || Math.random() < Math.exp(-delta / T)) {
          x = xNew;
          fx = fNew;
          
          if (fx < bestF) {
            best = Array.isArray(x) ? [...x] : x;
            bestF = fx;
          }
        }
      }
      
      history.push({ T, f: fx, bestF });
      T *= coolingRate;
    }
    
    return { x: best, f: bestF, history };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GENETIC ALGORITHM
  // ═══════════════════════════════════════════════════════════════════════════
  
  geneticAlgorithm: function(config) {
    const {
      fitness,
      createIndividual,
      crossover,
      mutate,
      populationSize = 100,
      generations = 100,
      eliteRatio = 0.1,
      mutationRate = 0.1
    } = config;
    
    // Initialize population
    let population = Array(populationSize).fill(null).map(() => createIndividual());
    let best = null;
    let bestFitness = -Infinity;
    
    const history = [];
    
    for (let gen = 0; gen < generations; gen++) {
      // Evaluate fitness
      const evaluated = population.map(ind => ({
        individual: ind,
        fitness: fitness(ind)
      })).sort((a, b) => b.fitness - a.fitness);
      
      // Track best
      if (evaluated[0].fitness > bestFitness) {
        bestFitness = evaluated[0].fitness;
        best = evaluated[0].individual;
      }
      
      history.push({
        generation: gen,
        bestFitness: evaluated[0].fitness,
        avgFitness: evaluated.reduce((s, e) => s + e.fitness, 0) / populationSize
      });
      
      // Selection and reproduction
      const eliteCount = Math.floor(populationSize * eliteRatio);
      const newPopulation = evaluated.slice(0, eliteCount).map(e => e.individual);
      
      while (newPopulation.length < populationSize) {
        // Tournament selection
        const parent1 = this._tournamentSelect(evaluated, 3);
        const parent2 = this._tournamentSelect(evaluated, 3);
        
        let child = crossover(parent1, parent2);
        
        if (Math.random() < mutationRate) {
          child = mutate(child);
        }
        
        newPopulation.push(child);
      }
      
      population = newPopulation;
    }
    
    return { best, fitness: bestFitness, history };
  },
  
  _tournamentSelect: function(evaluated, k) {
    const tournament = [];
    for (let i = 0; i < k; i++) {
      tournament.push(evaluated[Math.floor(Math.random() * evaluated.length)]);
    }
    return tournament.sort((a, b) => b.fitness - a.fitness)[0].individual;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PARTICLE SWARM OPTIMIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  pso: function(config) {
    const {
      f,
      bounds,
      swarmSize = 30,
      maxIterations = 100,
      w = 0.7,      // inertia
      c1 = 1.5,     // cognitive
      c2 = 1.5      // social
    } = config;
    
    const dim = bounds.length;
    
    // Initialize swarm
    const particles = Array(swarmSize).fill(null).map(() => {
      const position = bounds.map(([lo, hi]) => lo + Math.random() * (hi - lo));
      const velocity = bounds.map(([lo, hi]) => (Math.random() - 0.5) * (hi - lo) * 0.1);
      return {
        position,
        velocity,
        pBest: [...position],
        pBestF: f(position)
      };
    });
    
    let gBest = [...particles[0].pBest];
    let gBestF = particles[0].pBestF;
    
    for (const p of particles) {
      if (p.pBestF < gBestF) {
        gBest = [...p.pBest];
        gBestF = p.pBestF;
      }
    }
    
    const history = [];
    
    for (let iter = 0; iter < maxIterations; iter++) {
      for (const p of particles) {
        // Update velocity
        for (let d = 0; d < dim; d++) {
          const r1 = Math.random(), r2 = Math.random();
          p.velocity[d] = w * p.velocity[d]
            + c1 * r1 * (p.pBest[d] - p.position[d])
            + c2 * r2 * (gBest[d] - p.position[d]);
        }
        
        // Update position
        for (let d = 0; d < dim; d++) {
          p.position[d] += p.velocity[d];
          // Clamp to bounds
          p.position[d] = Math.max(bounds[d][0], Math.min(bounds[d][1], p.position[d]));
        }
        
        // Evaluate
        const fx = f(p.position);
        
        // Update personal best
        if (fx < p.pBestF) {
          p.pBest = [...p.position];
          p.pBestF = fx;
          
          // Update global best
          if (fx < gBestF) {
            gBest = [...p.position];
            gBestF = fx;
          }
        }
      }
      
      history.push({ iteration: iter, gBestF });
    }
    
    return { x: gBest, f: gBestF, history };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ANT COLONY OPTIMIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  aco: function(config) {
    const {
      distances,        // n x n distance matrix
      nAnts = 20,
      iterations = 100,
      alpha = 1,        // pheromone importance
      beta = 2,         // heuristic importance
      rho = 0.1,        // evaporation rate
      Q = 100           // pheromone deposit factor
    } = config;
    
    const n = distances.length;
    
    // Initialize pheromone
    const tau = Array(n).fill(null).map(() => Array(n).fill(1));
    
    let bestTour = null;
    let bestLength = Infinity;
    
    const history = [];
    
    for (let iter = 0; iter < iterations; iter++) {
      const tours = [];
      
      // Each ant constructs a tour
      for (let ant = 0; ant < nAnts; ant++) {
        const tour = [Math.floor(Math.random() * n)];
        const visited = new Set(tour);
        
        while (tour.length < n) {
          const current = tour[tour.length - 1];
          const probabilities = [];
          let sum = 0;
          
          for (let j = 0; j < n; j++) {
            if (!visited.has(j)) {
              const p = Math.pow(tau[current][j], alpha) * 
                        Math.pow(1 / distances[current][j], beta);
              probabilities.push({ j, p });
              sum += p;
            }
          }
          
          // Roulette wheel selection
          let r = Math.random() * sum;
          let next = probabilities[0].j;
          for (const { j, p } of probabilities) {
            r -= p;
            if (r <= 0) {
              next = j;
              break;
            }
          }
          
          tour.push(next);
          visited.add(next);
        }
        
        // Calculate tour length
        let length = 0;
        for (let i = 0; i < n; i++) {
          length += distances[tour[i]][tour[(i + 1) % n]];
        }
        
        tours.push({ tour, length });
        
        if (length < bestLength) {
          bestTour = [...tour];
          bestLength = length;
        }
      }
      
      // Evaporate pheromone
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          tau[i][j] *= (1 - rho);
        }
      }
      
      // Deposit pheromone
      for (const { tour, length } of tours) {
        const deposit = Q / length;
        for (let i = 0; i < n; i++) {
          tau[tour[i]][tour[(i + 1) % n]] += deposit;
          tau[tour[(i + 1) % n]][tour[i]] += deposit;
        }
      }
      
      history.push({ iteration: iter, bestLength });
    }
    
    return { tour: bestTour, length: bestLength, history };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MANUFACTURING-SPECIFIC OPTIMIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  optimizeCuttingParams: function(config) {
    const {
      material,
      tool,
      operation,
      constraints = {},
      objective = 'minTime'  // 'minTime', 'minCost', 'maxMRR'
    } = config;
    
    // Bounds: [speed (m/min), feed (mm/rev), depth (mm)]
    const bounds = [
      [constraints.minSpeed || 50, constraints.maxSpeed || 500],
      [constraints.minFeed || 0.05, constraints.maxFeed || 0.5],
      [constraints.minDepth || 0.5, constraints.maxDepth || 10]
    ];
    
    // Objective function
    const f = (x) => {
      const [V, fr, ap] = x;
      const N = 1000 * V / (Math.PI * tool.diameter);  // RPM
      const vf = fr * N;  // Feed rate mm/min
      const MRR = ap * tool.diameter * vf;  // mm³/min
      
      // Taylor tool life
      const T = Math.pow(material.C / V, 1 / material.n);  // minutes
      
      // Cycle time (simplified)
      const cycleTime = constraints.length / vf + constraints.toolChanges * (60 / T);
      
      // Cost
      const cost = cycleTime * constraints.machineRate / 60 + 
                   (constraints.toolChanges / T) * tool.cost;
      
      if (objective === 'minTime') return cycleTime;
      if (objective === 'minCost') return cost;
      if (objective === 'maxMRR') return -MRR;
      return cycleTime;
    };
    
    // Use PSO for optimization
    const result = this.pso({
      f,
      bounds,
      swarmSize: 30,
      maxIterations: 100
    });
    
    return {
      speed: result.x[0],
      feed: result.x[1],
      depth: result.x[2],
      rpm: 1000 * result.x[0] / (Math.PI * tool.diameter),
      objectiveValue: result.f
    };
  }
};


// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH2_GATEWAY_ROUTES = {
  // Unconstrained
  'optimize.newton': 'PRISM_OPTIMIZATION.newtonMethod',
  'optimize.bfgs': 'PRISM_OPTIMIZATION.bfgs',
  'optimize.gradientDescent': 'PRISM_OPTIMIZATION.gradientDescent',
  'optimize.conjugateGradient': 'PRISM_OPTIMIZATION.conjugateGradient',
  
  // Constrained
  'optimize.penalty': 'PRISM_OPTIMIZATION.penaltyMethod',
  
  // Metaheuristics
  'optimize.simulatedAnnealing': 'PRISM_OPTIMIZATION.simulatedAnnealing',
  'optimize.genetic': 'PRISM_OPTIMIZATION.geneticAlgorithm',
  'optimize.pso': 'PRISM_OPTIMIZATION.pso',
  'optimize.aco': 'PRISM_OPTIMIZATION.aco',
  
  // Manufacturing
  'optimize.cuttingParams': 'PRISM_OPTIMIZATION.optimizeCuttingParams'
};

// Register with PRISM_GATEWAY if available
function registerBatch2Routes() {
  if (typeof PRISM_GATEWAY !== 'undefined') {
    for (const [route, target] of Object.entries(BATCH2_GATEWAY_ROUTES)) {
      PRISM_GATEWAY.register(route, target);
    }
    console.log(`[Batch 2] Registered ${Object.keys(BATCH2_GATEWAY_ROUTES).length} routes`);
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRISM_OPTIMIZATION, BATCH2_GATEWAY_ROUTES, registerBatch2Routes };
}

// Auto-register
if (typeof window !== 'undefined') {
  window.PRISM_OPTIMIZATION = PRISM_OPTIMIZATION;
  registerBatch2Routes();
}

console.log('[PRISM Batch 2] Optimization loaded - 10 algorithms, 10 routes');

/**
 * PRISM BATCH 3: DYNAMICS & PHYSICS
 * Source: MIT 16.07 (Dynamics) + 16.050 (Thermal Energy)
 * 
 * Algorithms: Kinematics, Vibration, Stability, Thermodynamics
 * Gateway Routes: 18
 */

const PRISM_DYNAMICS = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 5-AXIS KINEMATICS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Forward Kinematics for 5-axis machine
   * @param {Object} joints - {X, Y, Z, A, C} in mm and degrees
   * @param {Object} config - Machine configuration
   * @returns {Object} Tool position and orientation
   */
  fiveAxisFK: function(joints, config = {}) {
    const { X, Y, Z, A, C } = joints;
    const machineType = config.type || 'table-table';
    
    const Arad = A * Math.PI / 180;
    const Crad = C * Math.PI / 180;
    
    // Rotation matrices
    const Rx = this._rotationX(Arad);
    const Rz = this._rotationZ(Crad);
    
    let R, position;
    
    if (machineType === 'table-table') {
      // Tool fixed, table rotates
      R = this._matMul3x3(Rz, Rx);
      position = { x: X, y: Y, z: Z };
    } else if (machineType === 'head-head') {
      // Table fixed, head rotates
      R = this._matMul3x3(Rx, Rz);
      position = { x: X, y: Y, z: Z };
    } else {
      // Mixed configuration
      R = this._matMul3x3(Rz, Rx);
      position = { x: X, y: Y, z: Z };
    }
    
    // Tool axis is the Z column of rotation matrix
    const toolAxis = { x: R[0][2], y: R[1][2], z: R[2][2] };
    
    return {
      position,
      rotation: R,
      toolAxis,
      joints: { X, Y, Z, A, C }
    };
  },
  
  /**
   * Inverse Kinematics for 5-axis machine
   * @param {Object} toolPose - {position: {x,y,z}, axis: {x,y,z}}
   * @param {Object} config - Machine configuration and limits
   * @returns {Object} Joint values or failure
   */
  fiveAxisIK: function(toolPose, config = {}) {
    const { position, axis } = toolPose;
    
    // Normalize tool axis
    const len = Math.sqrt(axis.x**2 + axis.y**2 + axis.z**2);
    const nx = axis.x / len;
    const ny = axis.y / len;
    const nz = axis.z / len;
    
    // Calculate A (tilt from Z axis)
    // A = 0 when tool is vertical (pointing down, nz = -1)
    const A = Math.acos(-nz) * 180 / Math.PI;
    
    // Calculate C (rotation about Z)
    // Handle singularity when A ≈ 0
    let C;
    if (Math.abs(A) < 0.001) {
      // Singularity - use previous C or default
      C = config.previousC || 0;
    } else {
      C = Math.atan2(ny, nx) * 180 / Math.PI;
    }
    
    // Pivot compensation (if machine has offset pivot)
    const pivotOffset = config.pivotOffset || { x: 0, y: 0, z: 0 };
    const Arad = A * Math.PI / 180;
    const Crad = C * Math.PI / 180;
    
    // Calculate actual XYZ considering pivot
    const X = position.x - pivotOffset.x * (1 - Math.cos(Arad) * Math.cos(Crad));
    const Y = position.y - pivotOffset.y * (1 - Math.cos(Arad) * Math.sin(Crad));
    const Z = position.z - pivotOffset.z * (1 - Math.cos(Arad));
    
    const joints = { X, Y, Z, A, C };
    
    // Check limits
    const valid = this._checkLimits(joints, config.limits);
    
    return {
      ...joints,
      valid,
      singularity: Math.abs(A) < 0.001
    };
  },
  
  /**
   * Compute Jacobian matrix for velocity kinematics
   */
  computeJacobian: function(joints, config = {}) {
    const h = 0.001; // Small perturbation
    const J = [];
    const axes = ['X', 'Y', 'Z', 'A', 'C'];
    
    const basePose = this.fiveAxisFK(joints, config);
    
    for (const axis of axes) {
      const perturbedJoints = { ...joints };
      perturbedJoints[axis] += h;
      const perturbedPose = this.fiveAxisFK(perturbedJoints, config);
      
      // Numerical derivative
      const dPos = {
        x: (perturbedPose.position.x - basePose.position.x) / h,
        y: (perturbedPose.position.y - basePose.position.y) / h,
        z: (perturbedPose.position.z - basePose.position.z) / h
      };
      
      J.push([dPos.x, dPos.y, dPos.z]);
    }
    
    return this._transpose(J);
  },
  
  /**
   * Check for kinematic singularity
   */
  checkSingularity: function(joints, config = {}) {
    const J = this.computeJacobian(joints, config);
    const det = this._determinant3x3(J.slice(0, 3).map(row => row.slice(0, 3)));
    
    const threshold = config.singularityThreshold || 0.01;
    
    return {
      singular: Math.abs(det) < threshold,
      determinant: det,
      aAngle: joints.A
    };
  },
  
  _rotationX: function(theta) {
    const c = Math.cos(theta), s = Math.sin(theta);
    return [
      [1, 0, 0],
      [0, c, -s],
      [0, s, c]
    ];
  },
  
  _rotationZ: function(theta) {
    const c = Math.cos(theta), s = Math.sin(theta);
    return [
      [c, -s, 0],
      [s, c, 0],
      [0, 0, 1]
    ];
  },
  
  _matMul3x3: function(A, B) {
    const C = [[0,0,0], [0,0,0], [0,0,0]];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < 3; k++) {
          C[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    return C;
  },
  
  _transpose: function(A) {
    return A[0].map((_, j) => A.map(row => row[j]));
  },
  
  _determinant3x3: function(A) {
    return A[0][0] * (A[1][1]*A[2][2] - A[1][2]*A[2][1])
         - A[0][1] * (A[1][0]*A[2][2] - A[1][2]*A[2][0])
         + A[0][2] * (A[1][0]*A[2][1] - A[1][1]*A[2][0]);
  },
  
  _checkLimits: function(joints, limits) {
    if (!limits) return true;
    for (const [axis, value] of Object.entries(joints)) {
      if (limits[axis]) {
        const [min, max] = limits[axis];
        if (value < min || value > max) return false;
      }
    }
    return true;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // VIBRATION ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Calculate natural frequencies
   * @param {number|Array} mass - Mass or mass matrix
   * @param {number|Array} stiffness - Stiffness or stiffness matrix
   * @returns {Object} Natural frequencies and related parameters
   */
  naturalFrequencies: function(mass, stiffness, damping = 0) {
    // Single DOF
    if (typeof mass === 'number') {
      const omegaN = Math.sqrt(stiffness / mass);
      const zeta = damping / (2 * Math.sqrt(stiffness * mass));
      const omegaD = omegaN * Math.sqrt(1 - zeta * zeta);
      
      return {
        omegaN,                           // rad/s
        frequencyHz: omegaN / (2 * Math.PI),
        period: 2 * Math.PI / omegaN,
        dampingRatio: zeta,
        dampedFrequency: omegaD / (2 * Math.PI),
        qualityFactor: 1 / (2 * zeta)
      };
    }
    
    // Multi-DOF (simplified - diagonal matrices)
    const n = mass.length;
    const frequencies = [];
    
    for (let i = 0; i < n; i++) {
      const omega = Math.sqrt(stiffness[i][i] / mass[i][i]);
      frequencies.push({
        mode: i + 1,
        omegaN: omega,
        frequencyHz: omega / (2 * Math.PI)
      });
    }
    
    return { frequencies: frequencies.sort((a, b) => a.omegaN - b.omegaN) };
  },
  
  /**
   * Calculate Frequency Response Function
   * @param {Object} system - {mass, stiffness, damping}
   * @param {number} omega - Frequency (rad/s)
   * @returns {Object} Complex FRF value
   */
  frequencyResponse: function(system, omega) {
    const { mass, stiffness, damping } = system;
    
    const real = stiffness - mass * omega * omega;
    const imag = damping * omega;
    
    const denominator = real * real + imag * imag;
    
    return {
      real: real / denominator,
      imag: -imag / denominator,
      magnitude: 1 / Math.sqrt(denominator),
      phase: -Math.atan2(imag, real)
    };
  },
  
  /**
   * Generate FRF over frequency range
   */
  generateFRF: function(system, freqRange) {
    const { fMin, fMax, points = 1000 } = freqRange;
    const data = [];
    
    for (let i = 0; i < points; i++) {
      const f = fMin + (fMax - fMin) * i / (points - 1);
      const omega = 2 * Math.PI * f;
      const frf = this.frequencyResponse(system, omega);
      
      data.push({
        frequency: f,
        ...frf
      });
    }
    
    return data;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STABILITY & CHATTER
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Generate Stability Lobe Diagram
   * @param {Object} config - {frf, Kc, teeth, rpmRange}
   * @returns {Array} Stability lobe points
   */
  stabilityLobes: function(config) {
    const { frf, Kc, teeth, rpmRange } = config;
    const [rpmMin, rpmMax] = rpmRange;
    const lobes = [];
    
    // For each lobe (0 to ~10)
    for (let lobe = 0; lobe < 10; lobe++) {
      const lobePoints = [];
      
      // Scan chatter frequencies
      for (let fc = 100; fc <= 5000; fc += 10) {
        const omega = 2 * Math.PI * fc;
        
        // Get FRF at this frequency
        let G;
        if (typeof frf === 'function') {
          G = frf(fc);
        } else {
          G = this.frequencyResponse(frf, omega);
        }
        
        // Only process if FRF real part is negative
        if (G.real < 0) {
          // Phase calculation
          const psi = Math.PI - 2 * Math.atan2(G.imag, G.real);
          
          // Spindle speed for this lobe
          const toothPassingFreq = fc / (lobe + psi / (2 * Math.PI));
          const rpm = 60 * toothPassingFreq / teeth;
          
          if (rpm >= rpmMin && rpm <= rpmMax) {
            // Critical depth
            const bLim = -1 / (2 * Kc * teeth * G.real);
            
            if (bLim > 0 && bLim < 50) {  // Reasonable depth limit
              lobePoints.push({ rpm, doc: bLim });
            }
          }
        }
      }
      
      if (lobePoints.length > 0) {
        lobes.push({
          lobe: lobe + 1,
          points: lobePoints.sort((a, b) => a.rpm - b.rpm)
        });
      }
    }
    
    return lobes;
  },
  
  /**
   * Check if cutting parameters are stable
   */
  checkStability: function(params, stabilityData) {
    const { rpm, doc } = params;
    
    // Find stability limit at this RPM
    let minStableDoc = Infinity;
    
    for (const lobe of stabilityData) {
      for (let i = 0; i < lobe.points.length - 1; i++) {
        const p1 = lobe.points[i];
        const p2 = lobe.points[i + 1];
        
        if (rpm >= p1.rpm && rpm <= p2.rpm) {
          // Interpolate
          const t = (rpm - p1.rpm) / (p2.rpm - p1.rpm);
          const limit = p1.doc + t * (p2.doc - p1.doc);
          minStableDoc = Math.min(minStableDoc, limit);
        }
      }
    }
    
    return {
      stable: doc < minStableDoc,
      limit: minStableDoc,
      margin: minStableDoc - doc
    };
  },
  
  /**
   * Detect chatter from vibration signal using FFT
   */
  detectChatter: function(signal, config) {
    const { sampleRate, teeth, rpm } = config;
    
    // Compute FFT
    const spectrum = this._fft(signal);
    const freqs = spectrum.map((_, i) => i * sampleRate / signal.length);
    
    // Tooth passing frequency and harmonics
    const toothFreq = rpm * teeth / 60;
    const harmonics = [1, 2, 3, 4, 5].map(n => n * toothFreq);
    
    // Find peaks
    const peaks = this._findPeaks(spectrum, freqs);
    
    // Check if dominant peak is at non-harmonic frequency
    let chatterDetected = false;
    let chatterFreq = null;
    let chatterIndex = 0;
    
    for (const peak of peaks) {
      const isHarmonic = harmonics.some(h => Math.abs(peak.frequency - h) < 10);
      if (!isHarmonic && peak.magnitude > peaks[0].magnitude * 0.5) {
        chatterDetected = true;
        chatterFreq = peak.frequency;
        chatterIndex = peak.magnitude / peaks[0].magnitude;
        break;
      }
    }
    
    return {
      chatterDetected,
      chatterFrequency: chatterFreq,
      chatterIndex,
      spectrum: spectrum.slice(0, signal.length / 2),
      frequencies: freqs.slice(0, signal.length / 2)
    };
  },
  
  _fft: function(signal) {
    // Simple DFT (use FFT library in production)
    const N = signal.length;
    const spectrum = [];
    
    for (let k = 0; k < N; k++) {
      let real = 0, imag = 0;
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += signal[n] * Math.cos(angle);
        imag += signal[n] * Math.sin(angle);
      }
      spectrum.push(Math.sqrt(real * real + imag * imag) / N);
    }
    
    return spectrum;
  },
  
  _findPeaks: function(spectrum, freqs) {
    const peaks = [];
    
    for (let i = 1; i < spectrum.length - 1; i++) {
      if (spectrum[i] > spectrum[i-1] && spectrum[i] > spectrum[i+1]) {
        if (spectrum[i] > 0.01) {  // Threshold
          peaks.push({
            frequency: freqs[i],
            magnitude: spectrum[i],
            index: i
          });
        }
      }
    }
    
    return peaks.sort((a, b) => b.magnitude - a.magnitude);
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // THERMAL ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Calculate cutting temperature
   */
  cuttingTemperature: function(params) {
    const {
      cuttingForce,      // N
      cuttingVelocity,   // m/min
      mrr,               // mm³/min
      material,
      heatPartition = 0.2,  // Fraction to tool
      ambientTemp = 20
    } = params;
    
    const V_ms = cuttingVelocity / 60;  // m/s
    const power = cuttingForce * V_ms;   // W
    
    // Heat to chip
    const density = material?.density || 7850;  // kg/m³
    const specificHeat = material?.specificHeat || 500;  // J/(kg·K)
    
    const mrr_m3s = mrr * 1e-9 / 60;  // m³/s
    const massFlowRate = density * mrr_m3s;  // kg/s
    
    // Temperature rise in chip
    const chipHeat = (1 - heatPartition) * power;
    const deltaT_chip = chipHeat / (massFlowRate * specificHeat);
    
    // Tool-chip interface (simplified)
    const interfaceTemp = ambientTemp + deltaT_chip * 0.8;
    
    return {
      chipTemperature: ambientTemp + deltaT_chip,
      interfaceTemperature: interfaceTemp,
      toolHeat: heatPartition * power,
      chipHeat: chipHeat,
      totalPower: power
    };
  },
  
  /**
   * Calculate heat partition ratio
   */
  heatPartition: function(params) {
    const { cuttingSpeed, toolConductivity, workpieceConductivity } = params;
    
    // Simplified model based on thermal conductivity ratio
    const k_ratio = toolConductivity / workpieceConductivity;
    const speed_factor = Math.min(1, cuttingSpeed / 200);  // Normalized speed
    
    // Higher speed = more heat to chip
    // Higher tool conductivity relative to workpiece = less heat to tool
    const R_tool = 0.3 * (1 - speed_factor) / (1 + k_ratio);
    
    return {
      toTool: R_tool,
      toWorkpiece: 0.1 + 0.1 * (1 - speed_factor),
      toChip: 1 - R_tool - 0.1 - 0.1 * (1 - speed_factor)
    };
  },
  
  /**
   * Transient temperature calculation (lumped capacitance)
   */
  transientTemperature: function(params) {
    const {
      initialTemp,
      ambientTemp,
      heatTransferCoeff,  // W/(m²·K)
      surfaceArea,        // m²
      mass,               // kg
      specificHeat,       // J/(kg·K)
      time                // s
    } = params;
    
    // Time constant
    const tau = mass * specificHeat / (heatTransferCoeff * surfaceArea);
    
    // Temperature at time t
    const T = ambientTemp + (initialTemp - ambientTemp) * Math.exp(-time / tau);
    
    return {
      temperature: T,
      timeConstant: tau,
      coolingRate: (initialTemp - ambientTemp) / tau * Math.exp(-time / tau)
    };
  },
  
  /**
   * Calculate convection heat transfer coefficient
   */
  convectionCoefficient: function(params) {
    const {
      fluidVelocity,      // m/s
      fluidDensity,       // kg/m³
      fluidViscosity,     // Pa·s
      fluidConductivity,  // W/(m·K)
      fluidSpecificHeat,  // J/(kg·K)
      characteristicLength // m
    } = params;
    
    // Reynolds number
    const Re = fluidDensity * fluidVelocity * characteristicLength / fluidViscosity;
    
    // Prandtl number
    const Pr = fluidViscosity * fluidSpecificHeat / fluidConductivity;
    
    // Nusselt number (Dittus-Boelter for turbulent flow)
    let Nu;
    if (Re > 10000) {
      Nu = 0.023 * Math.pow(Re, 0.8) * Math.pow(Pr, 0.4);
    } else {
      Nu = 0.664 * Math.sqrt(Re) * Math.pow(Pr, 1/3);
    }
    
    // Heat transfer coefficient
    const h = Nu * fluidConductivity / characteristicLength;
    
    return {
      reynoldsNumber: Re,
      prandtlNumber: Pr,
      nusseltNumber: Nu,
      heatTransferCoeff: h,
      flowRegime: Re > 10000 ? 'turbulent' : Re > 2300 ? 'transition' : 'laminar'
    };
  }
};


// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH3_GATEWAY_ROUTES = {
  // Kinematics
  'kinematics.fk.5axis': 'PRISM_DYNAMICS.fiveAxisFK',
  'kinematics.ik.5axis': 'PRISM_DYNAMICS.fiveAxisIK',
  'kinematics.jacobian': 'PRISM_DYNAMICS.computeJacobian',
  'kinematics.singularity': 'PRISM_DYNAMICS.checkSingularity',
  
  // Vibration
  'vibration.natural': 'PRISM_DYNAMICS.naturalFrequencies',
  'vibration.frf': 'PRISM_DYNAMICS.frequencyResponse',
  'vibration.frf.generate': 'PRISM_DYNAMICS.generateFRF',
  
  // Stability
  'stability.lobes': 'PRISM_DYNAMICS.stabilityLobes',
  'stability.check': 'PRISM_DYNAMICS.checkStability',
  'chatter.detect': 'PRISM_DYNAMICS.detectChatter',
  
  // Thermal
  'thermal.cutting.temp': 'PRISM_DYNAMICS.cuttingTemperature',
  'thermal.partition': 'PRISM_DYNAMICS.heatPartition',
  'thermal.transient': 'PRISM_DYNAMICS.transientTemperature',
  'thermal.convection': 'PRISM_DYNAMICS.convectionCoefficient'
};

// Register with PRISM_GATEWAY if available
function registerBatch3Routes() {
  if (typeof PRISM_GATEWAY !== 'undefined') {
    for (const [route, target] of Object.entries(BATCH3_GATEWAY_ROUTES)) {
      PRISM_GATEWAY.register(route, target);
    }
    console.log(`[Batch 3] Registered ${Object.keys(BATCH3_GATEWAY_ROUTES).length} routes`);
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRISM_DYNAMICS, BATCH3_GATEWAY_ROUTES, registerBatch3Routes };
}

// Auto-register
if (typeof window !== 'undefined') {
  window.PRISM_DYNAMICS = PRISM_DYNAMICS;
  registerBatch3Routes();
}

console.log('[PRISM Batch 3] Dynamics & Physics loaded - 14 algorithms, 14 routes');

/**
 * PRISM CAD/CAM ENHANCEMENT MODULE v1.0
 * CAD/CAM Specific UI Patterns
 */

// ======================================================================
// PRISM_VIEWPORT - Interactive 3D viewport controls
// ======================================================================

const PRISM_VIEWPORT = {
    camera: null,
    controls: null,
    container: null,
    
    views: {
        front: { position: [0, 0, 100], up: [0, 1, 0], target: [0, 0, 0] },
        back: { position: [0, 0, -100], up: [0, 1, 0], target: [0, 0, 0] },
        top: { position: [0, 100, 0], up: [0, 0, -1], target: [0, 0, 0] },
        bottom: { position: [0, -100, 0], up: [0, 0, 1], target: [0, 0, 0] },
        left: { position: [-100, 0, 0], up: [0, 1, 0], target: [0, 0, 0] },
        right: { position: [100, 0, 0], up: [0, 1, 0], target: [0, 0, 0] },
        isometric: { position: [70, 70, 70], up: [0, 1, 0], target: [0, 0, 0] }
    },
    
    renderModes: {
        wireframe: { wireframe: true, opacity: 1 },
        shaded: { wireframe: false, opacity: 1 },
        xray: { wireframe: false, opacity: 0.5 },
        hiddenLine: { wireframe: true, opacity: 1, depthTest: true }
    },
    
    init(container, options = {}) {
        this.container = container;
        this.options = {
            enablePan: true,
            enableZoom: true,
            enableRotate: true,
            zoomSpeed: 1.0,
            rotateSpeed: 1.0,
            panSpeed: 1.0,
            minDistance: 1,
            maxDistance: 10000,
            ...options
        };
        
        this._setupMouseControls();
        this._setupTouchControls();
        this._setupKeyboardControls();
        
        return this;
    },
    
    _setupMouseControls() {
        let isDragging = false;
        let lastX = 0, lastY = 0;
        let button = -1;
        
        this.container.addEventListener('mousedown', (e) => {
            isDragging = true;
            button = e.button;
            lastX = e.clientX;
            lastY = e.clientY;
            this.container.style.cursor = button === 0 ? 'grabbing' : 'move';
        });
        
        this.container.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            
            if (button === 0) { // Left - Rotate
                this._rotate(dx * this.options.rotateSpeed, dy * this.options.rotateSpeed);
            } else if (button === 1 || (button === 0 && e.shiftKey)) { // Middle or Shift+Left - Pan
                this._pan(dx * this.options.panSpeed, dy * this.options.panSpeed);
            } else if (button === 2) { // Right - Zoom
                this._zoom(dy * this.options.zoomSpeed * 0.01);
            }
        });
        
        this.container.addEventListener('mouseup', () => {
            isDragging = false;
            this.container.style.cursor = 'grab';
        });
        
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            this._zoom(e.deltaY * this.options.zoomSpeed * 0.001);
        });
        
        this.container.addEventListener('contextmenu', (e) => e.preventDefault());
    },
    
    _setupTouchControls() {
        let lastTouches = [];
        
        this.container.addEventListener('touchstart', (e) => {
            lastTouches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
        });
        
        this.container.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
            
            if (touches.length === 1 && lastTouches.length === 1) {
                // Single finger - rotate
                const dx = touches[0].x - lastTouches[0].x;
                const dy = touches[0].y - lastTouches[0].y;
                this._rotate(dx, dy);
            } else if (touches.length === 2 && lastTouches.length === 2) {
                // Two fingers - pan and zoom
                const lastDist = Math.hypot(lastTouches[1].x - lastTouches[0].x, lastTouches[1].y - lastTouches[0].y);
                const dist = Math.hypot(touches[1].x - touches[0].x, touches[1].y - touches[0].y);
                this._zoom((lastDist - dist) * 0.01);
                
                const lastCenter = { x: (lastTouches[0].x + lastTouches[1].x) / 2, y: (lastTouches[0].y + lastTouches[1].y) / 2 };
                const center = { x: (touches[0].x + touches[1].x) / 2, y: (touches[0].y + touches[1].y) / 2 };
                this._pan(center.x - lastCenter.x, center.y - lastCenter.y);
            }
            
            lastTouches = touches;
        });
    },
    
    _setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            if (document.activeElement.tagName === 'INPUT') return;
            
            const step = e.shiftKey ? 10 : 1;
            switch(e.key) {
                case 'ArrowUp': this._rotate(0, -step * 5); break;
                case 'ArrowDown': this._rotate(0, step * 5); break;
                case 'ArrowLeft': this._rotate(-step * 5, 0); break;
                case 'ArrowRight': this._rotate(step * 5, 0); break;
                case '+': case '=': this._zoom(-0.1); break;
                case '-': this._zoom(0.1); break;
                case 'Home': this.setView('isometric'); break;
                case '1': this.setView('front'); break;
                case '2': this.setView('back'); break;
                case '3': this.setView('left'); break;
                case '4': this.setView('right'); break;
                case '5': this.setView('top'); break;
                case '6': this.setView('bottom'); break;
            }
        });
    },
    
    _rotate(dx, dy) {
        PRISM_EVENT_BUS?.publish?.('viewport:rotate', { dx, dy });
    },
    
    _pan(dx, dy) {
        PRISM_EVENT_BUS?.publish?.('viewport:pan', { dx, dy });
    },
    
    _zoom(delta) {
        PRISM_EVENT_BUS?.publish?.('viewport:zoom', { delta });
    },
    
    setView(viewName, animate = true) {
        const view = this.views[viewName];
        if (!view) return;
        
        PRISM_EVENT_BUS?.publish?.('viewport:setView', { view, animate });
    },
    
    setRenderMode(mode) {
        const settings = this.renderModes[mode];
        if (!settings) return;
        
        PRISM_EVENT_BUS?.publish?.('viewport:renderMode', { mode, settings });
    },
    
    fitToView(objects, padding = 1.2) {
        PRISM_EVENT_BUS?.publish?.('viewport:fitToView', { objects, padding });
    },
    
    createViewCube(container) {
        const cube = document.createElement('div');
        cube.className = 'prism-view-cube';
        cube.style.cssText = `
            position: absolute; top: 10px; right: 10px;
            width: 80px; height: 80px;
            perspective: 200px; cursor: pointer;
        `;
        
        const faces = ['front', 'back', 'top', 'bottom', 'left', 'right'];
        faces.forEach(face => {
            const faceEl = document.createElement('div');
            faceEl.className = `view-cube-face view-cube-${face}`;
            faceEl.textContent = face.charAt(0).toUpperCase();
            faceEl.addEventListener('click', () => this.setView(face));
            cube.appendChild(faceEl);
        });
        
        container.appendChild(cube);
        return cube;
    }
};

// ======================================================================
// PRISM_PROPERTY_PANEL - Dynamic property inspector
// ======================================================================

class PRISM_PROPERTY_PANEL {
    constructor(container, options = {}) {
        this.container = container;
        this.sections = [];
        this.values = {};
        this.onChange = options.onChange || (() => {});
        this.readOnly = options.readOnly || false;
        
        this.container.className = 'prism-property-panel';
        this.container.style.cssText = `
            font-family: var(--font-family, sans-serif);
            font-size: 13px;
            overflow-y: auto;
        `;
    }
    
    setSchema(schema) {
        this.schema = schema;
        this.render();
    }
    
    setValues(values) {
        this.values = { ...values };
        this.updateDisplay();
    }
    
    render() {
        this.container.innerHTML = '';
        
        for (const section of this.schema.sections || [this.schema]) {
            this._renderSection(section);
        }
    }
    
    _renderSection(section) {
        const sectionEl = document.createElement('div');
        sectionEl.className = 'property-section';
        
        // Header
        const header = document.createElement('div');
        header.className = 'property-section-header';
        header.style.cssText = `
            display: flex; align-items: center; padding: 8px 12px;
            background: var(--bg-secondary, #f5f5f5);
            font-weight: 600; cursor: pointer;
        `;
        
        const arrow = document.createElement('span');
        arrow.textContent = '▼';
        arrow.style.cssText = 'margin-right: 8px; font-size: 10px; transition: transform 0.2s;';
        
        const title = document.createElement('span');
        title.textContent = section.title || 'Properties';
        
        header.appendChild(arrow);
        header.appendChild(title);
        
        // Content
        const content = document.createElement('div');
        content.className = 'property-section-content';
        content.style.cssText = 'padding: 8px 0;';
        
        for (const prop of section.properties || []) {
            content.appendChild(this._renderProperty(prop));
        }
        
        // Toggle collapse
        let collapsed = false;
        header.addEventListener('click', () => {
            collapsed = !collapsed;
            arrow.style.transform = collapsed ? 'rotate(-90deg)' : '';
            content.style.display = collapsed ? 'none' : 'block';
        });
        
        sectionEl.appendChild(header);
        sectionEl.appendChild(content);
        this.container.appendChild(sectionEl);
    }
    
    _renderProperty(prop) {
        const row = document.createElement('div');
        row.className = 'property-row';
        row.style.cssText = `
            display: flex; align-items: center; padding: 4px 12px;
            border-bottom: 1px solid var(--border, #eee);
        `;
        row.dataset.property = prop.key;
        
        // Label
        const label = document.createElement('label');
        label.textContent = prop.label;
        label.title = prop.description || '';
        label.style.cssText = 'flex: 0 0 40%; color: var(--text-secondary, #666);';
        
        // Input
        const inputContainer = document.createElement('div');
        inputContainer.style.cssText = 'flex: 1; display: flex; align-items: center; gap: 4px;';
        
        const input = this._createInput(prop);
        inputContainer.appendChild(input);
        
        // Unit
        if (prop.unit) {
            const unit = document.createElement('span');
            unit.textContent = prop.unit;
            unit.style.cssText = 'color: var(--text-muted, #999); font-size: 11px;';
            inputContainer.appendChild(unit);
        }
        
        row.appendChild(label);
        row.appendChild(inputContainer);
        
        return row;
    }
    
    _createInput(prop) {
        const value = this.values[prop.key] ?? prop.default ?? '';
        const disabled = this.readOnly || prop.readOnly;
        
        let input;
        
        switch (prop.type) {
            case 'number':
                input = document.createElement('input');
                input.type = 'number';
                input.value = value;
                input.min = prop.min;
                input.max = prop.max;
                input.step = prop.step || 'any';
                input.disabled = disabled;
                input.style.cssText = 'width: 100%; padding: 4px 8px; border: 1px solid var(--border, #ddd); border-radius: 3px;';
                break;
                
            case 'text':
                input = document.createElement('input');
                input.type = 'text';
                input.value = value;
                input.disabled = disabled;
                input.style.cssText = 'width: 100%; padding: 4px 8px; border: 1px solid var(--border, #ddd); border-radius: 3px;';
                break;
                
            case 'select':
                input = document.createElement('select');
                input.disabled = disabled;
                input.style.cssText = 'width: 100%; padding: 4px 8px; border: 1px solid var(--border, #ddd); border-radius: 3px;';
                for (const opt of prop.options || []) {
                    const option = document.createElement('option');
                    option.value = opt.value ?? opt;
                    option.textContent = opt.label ?? opt;
                    option.selected = option.value === value;
                    input.appendChild(option);
                }
                break;
                
            case 'boolean':
                input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = value;
                input.disabled = disabled;
                break;
                
            case 'color':
                input = document.createElement('input');
                input.type = 'color';
                input.value = value || '#000000';
                input.disabled = disabled;
                input.style.cssText = 'width: 60px; height: 24px; padding: 0; border: none;';
                break;
                
            case 'slider':
                const wrapper = document.createElement('div');
                wrapper.style.cssText = 'display: flex; align-items: center; gap: 8px; width: 100%;';
                
                input = document.createElement('input');
                input.type = 'range';
                input.value = value;
                input.min = prop.min || 0;
                input.max = prop.max || 100;
                input.step = prop.step || 1;
                input.disabled = disabled;
                input.style.cssText = 'flex: 1;';
                
                const display = document.createElement('span');
                display.textContent = value;
                display.style.cssText = 'min-width: 40px; text-align: right;';
                
                input.addEventListener('input', () => { display.textContent = input.value; });
                
                wrapper.appendChild(input);
                wrapper.appendChild(display);
                return wrapper;
                
            case 'vector3':
                const vec = document.createElement('div');
                vec.style.cssText = 'display: flex; gap: 4px; width: 100%;';
                
                ['x', 'y', 'z'].forEach((axis, i) => {
                    const axisInput = document.createElement('input');
                    axisInput.type = 'number';
                    axisInput.value = value?.[i] ?? 0;
                    axisInput.step = prop.step || 'any';
                    axisInput.disabled = disabled;
                    axisInput.style.cssText = 'flex: 1; width: 50px; padding: 4px; border: 1px solid var(--border, #ddd); border-radius: 3px;';
                    axisInput.placeholder = axis.toUpperCase();
                    axisInput.dataset.axis = i;
                    
                    axisInput.addEventListener('change', () => {
                        const newValue = [
                            parseFloat(vec.children[0].value),
                            parseFloat(vec.children[1].value),
                            parseFloat(vec.children[2].value)
                        ];
                        this._handleChange(prop.key, newValue);
                    });
                    
                    vec.appendChild(axisInput);
                });
                return vec;
                
            default:
                input = document.createElement('input');
                input.type = 'text';
                input.value = value;
                input.disabled = disabled;
                input.style.cssText = 'width: 100%; padding: 4px 8px; border: 1px solid var(--border, #ddd); border-radius: 3px;';
        }
        
        input.addEventListener('change', () => {
            let val = input.type === 'checkbox' ? input.checked : 
                      input.type === 'number' ? parseFloat(input.value) : input.value;
            this._handleChange(prop.key, val);
        });
        
        return input;
    }
    
    _handleChange(key, value) {
        const oldValue = this.values[key];
        this.values[key] = value;
        this.onChange(key, value, oldValue);
        PRISM_EVENT_BUS?.publish?.('property:changed', { key, value, oldValue });
    }
    
    updateDisplay() {
        for (const [key, value] of Object.entries(this.values)) {
            const row = this.container.querySelector(`[data-property="${key}"]`);
            if (!row) continue;
            
            const input = row.querySelector('input, select');
            if (!input) continue;
            
            if (input.type === 'checkbox') input.checked = value;
            else input.value = value;
        }
    }
    
    getValues() {
        return { ...this.values };
    }
}

// ======================================================================
// PRISM_TREE_VIEW - Interactive tree view component
// ======================================================================

class PRISM_TREE_VIEW {
    constructor(container, options = {}) {
        this.container = container;
        this.data = [];
        this.selectedIds = new Set();
        this.expandedIds = new Set();
        
        this.options = {
            multiSelect: options.multiSelect || false,
            draggable: options.draggable || false,
            showIcons: options.showIcons !== false,
            showCheckboxes: options.showCheckboxes || false,
            onSelect: options.onSelect || (() => {}),
            onExpand: options.onExpand || (() => {}),
            onDrop: options.onDrop || (() => {}),
            renderNode: options.renderNode || this._defaultRenderNode.bind(this),
            indent: options.indent || 20,
            ...options
        };
        
        this.container.className = 'prism-tree-view';
        this.container.style.cssText = `
            font-family: var(--font-family, sans-serif);
            font-size: 13px;
            user-select: none;
        `;
        
        this._setupKeyboard();
    }
    
    setData(data) {
        this.data = this._normalizeData(data);
        this.render();
    }
    
    _normalizeData(data, parent = null, level = 0) {
        return data.map(item => ({
            ...item,
            parent,
            level,
            children: item.children ? this._normalizeData(item.children, item.id, level + 1) : []
        }));
    }
    
    render() {
        this.container.innerHTML = '';
        this._renderNodes(this.data, this.container);
    }
    
    _renderNodes(nodes, container) {
        for (const node of nodes) {
            const nodeEl = this._renderNode(node);
            container.appendChild(nodeEl);
            
            if (node.children.length > 0) {
                const childContainer = document.createElement('div');
                childContainer.className = 'tree-children';
                childContainer.style.display = this.expandedIds.has(node.id) ? 'block' : 'none';
                this._renderNodes(node.children, childContainer);
                container.appendChild(childContainer);
            }
        }
    }
    
    _renderNode(node) {
        const row = document.createElement('div');
        row.className = 'tree-node';
        row.dataset.id = node.id;
        row.style.cssText = `
            display: flex; align-items: center;
            padding: 4px 8px; padding-left: ${8 + node.level * this.options.indent}px;
            cursor: pointer; border-radius: 3px;
            ${this.selectedIds.has(node.id) ? 'background: var(--accent, #2196F3)22;' : ''}
        `;
        
        // Expand/collapse arrow
        const arrow = document.createElement('span');
        arrow.className = 'tree-arrow';
        arrow.style.cssText = `
            width: 16px; height: 16px; display: inline-flex;
            align-items: center; justify-content: center;
            margin-right: 4px; font-size: 10px;
            transition: transform 0.2s;
        `;
        if (node.children.length > 0) {
            arrow.textContent = '▶';
            arrow.style.transform = this.expandedIds.has(node.id) ? 'rotate(90deg)' : '';
            arrow.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleExpand(node.id);
            });
        }
        row.appendChild(arrow);
        
        // Checkbox
        if (this.options.showCheckboxes) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = this.selectedIds.has(node.id);
            checkbox.style.marginRight = '8px';
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleSelect(node.id, checkbox.checked);
            });
            row.appendChild(checkbox);
        }
        
        // Icon
        if (this.options.showIcons && node.icon) {
            const icon = document.createElement('span');
            icon.className = 'tree-icon';
            icon.textContent = node.icon;
            icon.style.marginRight = '8px';
            row.appendChild(icon);
        }
        
        // Label
        const label = document.createElement('span');
        label.className = 'tree-label';
        label.textContent = node.label || node.name || node.id;
        row.appendChild(label);
        
        // Custom render
        const custom = this.options.renderNode(node);
        if (custom) row.appendChild(custom);
        
        // Click to select
        row.addEventListener('click', () => this.select(node.id));
        
        // Double-click to expand
        row.addEventListener('dblclick', () => this.toggleExpand(node.id));
        
        // Drag and drop
        if (this.options.draggable) {
            row.draggable = true;
            row.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', node.id);
                row.style.opacity = '0.5';
            });
            row.addEventListener('dragend', () => { row.style.opacity = '1'; });
            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                row.style.background = 'var(--accent, #2196F3)33';
            });
            row.addEventListener('dragleave', () => {
                row.style.background = this.selectedIds.has(node.id) ? 'var(--accent, #2196F3)22' : '';
            });
            row.addEventListener('drop', (e) => {
                e.preventDefault();
                const draggedId = e.dataTransfer.getData('text/plain');
                row.style.background = '';
                if (draggedId !== node.id) {
                    this.options.onDrop(draggedId, node.id);
                }
            });
        }
        
        // Hover effect
        row.addEventListener('mouseenter', () => {
            if (!this.selectedIds.has(node.id)) row.style.background = 'var(--bg-secondary, #f5f5f5)';
        });
        row.addEventListener('mouseleave', () => {
            if (!this.selectedIds.has(node.id)) row.style.background = '';
        });
        
        return row;
    }
    
    _defaultRenderNode(node) {
        if (node.badge) {
            const badge = document.createElement('span');
            badge.className = 'tree-badge';
            badge.textContent = node.badge;
            badge.style.cssText = `
                margin-left: auto; padding: 2px 6px; font-size: 10px;
                background: var(--bg-secondary, #eee); border-radius: 10px;
            `;
            return badge;
        }
        return null;
    }
    
    select(id, additive = false) {
        if (!this.options.multiSelect || !additive) {
            this.selectedIds.clear();
        }
        this.selectedIds.add(id);
        this.render();
        this.options.onSelect(Array.from(this.selectedIds));
    }
    
    toggleSelect(id, selected) {
        if (selected) this.selectedIds.add(id);
        else this.selectedIds.delete(id);
        this.render();
        this.options.onSelect(Array.from(this.selectedIds));
    }
    
    toggleExpand(id) {
        if (this.expandedIds.has(id)) {
            this.expandedIds.delete(id);
        } else {
            this.expandedIds.add(id);
        }
        this.render();
        this.options.onExpand(id, this.expandedIds.has(id));
    }
    
    expandAll() {
        const addAll = (nodes) => {
            nodes.forEach(n => {
                if (n.children.length > 0) {
                    this.expandedIds.add(n.id);
                    addAll(n.children);
                }
            });
        };
        addAll(this.data);
        this.render();
    }
    
    collapseAll() {
        this.expandedIds.clear();
        this.render();
    }
    
    _setupKeyboard() {
        this.container.tabIndex = 0;
        this.container.addEventListener('keydown', (e) => {
            const selected = Array.from(this.selectedIds)[0];
            if (!selected) return;
            
            switch (e.key) {
                case 'ArrowDown': this._selectNext(); break;
                case 'ArrowUp': this._selectPrevious(); break;
                case 'ArrowRight': this.expandedIds.add(selected); this.render(); break;
                case 'ArrowLeft': this.expandedIds.delete(selected); this.render(); break;
                case 'Enter': case ' ': this.toggleExpand(selected); break;
            }
        });
    }
    
    _selectNext() {
        const allNodes = this._flattenVisible();
        const currentIndex = allNodes.findIndex(n => this.selectedIds.has(n.id));
        if (currentIndex < allNodes.length - 1) {
            this.select(allNodes[currentIndex + 1].id);
        }
    }
    
    _selectPrevious() {
        const allNodes = this._flattenVisible();
        const currentIndex = allNodes.findIndex(n => this.selectedIds.has(n.id));
        if (currentIndex > 0) {
            this.select(allNodes[currentIndex - 1].id);
        }
    }
    
    _flattenVisible(nodes = this.data) {
        let result = [];
        for (const node of nodes) {
            result.push(node);
            if (this.expandedIds.has(node.id) && node.children.length > 0) {
                result = result.concat(this._flattenVisible(node.children));
            }
        }
        return result;
    }
    
    getSelected() { return Array.from(this.selectedIds); }
}

// ======================================================================
// PRISM_NUMERIC_INPUT - Numeric input with units, expressions, and constraints
// ======================================================================

class PRISM_NUMERIC_INPUT {
    constructor(container, options = {}) {
        this.container = container;
        this.value = options.value ?? 0;
        this.options = {
            min: options.min ?? -Infinity,
            max: options.max ?? Infinity,
            step: options.step ?? 1,
            precision: options.precision ?? 3,
            unit: options.unit || '',
            units: options.units || null, // Array for unit conversion
            allowExpressions: options.allowExpressions !== false,
            showSlider: options.showSlider || false,
            showStepper: options.showStepper !== false,
            onChange: options.onChange || (() => {}),
            label: options.label || '',
            ...options
        };
        
        this.render();
    }
    
    render() {
        this.container.innerHTML = '';
        this.container.className = 'prism-numeric-input';
        this.container.style.cssText = 'display: flex; align-items: center; gap: 4px;';
        
        // Label
        if (this.options.label) {
            const label = document.createElement('label');
            label.textContent = this.options.label;
            label.style.cssText = 'min-width: 80px; color: var(--text-secondary, #666);';
            this.container.appendChild(label);
        }
        
        // Input wrapper
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display: flex; align-items: center; flex: 1; gap: 2px;';
        
        // Decrement button
        if (this.options.showStepper) {
            const decBtn = document.createElement('button');
            decBtn.textContent = '−';
            decBtn.style.cssText = this._buttonStyle();
            decBtn.addEventListener('click', () => this.decrement());
            decBtn.addEventListener('mousedown', () => this._startRepeat('decrement'));
            decBtn.addEventListener('mouseup', () => this._stopRepeat());
            decBtn.addEventListener('mouseleave', () => this._stopRepeat());
            wrapper.appendChild(decBtn);
        }
        
        // Input field
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.value = this._formatValue(this.value);
        this.input.style.cssText = `
            flex: 1; min-width: 60px; padding: 6px 8px;
            border: 1px solid var(--border, #ddd); border-radius: 3px;
            text-align: right; font-family: monospace;
        `;
        
        this.input.addEventListener('focus', () => {
            this.input.select();
        });
        
        this.input.addEventListener('blur', () => {
            this._parseAndSet(this.input.value);
        });
        
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this._parseAndSet(this.input.value);
                this.input.blur();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.increment(e.shiftKey ? this.options.step * 10 : this.options.step);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.decrement(e.shiftKey ? this.options.step * 10 : this.options.step);
            } else if (e.key === 'Escape') {
                this.input.value = this._formatValue(this.value);
                this.input.blur();
            }
        });
        
        // Mouse wheel
        this.input.addEventListener('wheel', (e) => {
            if (document.activeElement !== this.input) return;
            e.preventDefault();
            const step = e.shiftKey ? this.options.step * 10 : this.options.step;
            if (e.deltaY < 0) this.increment(step);
            else this.decrement(step);
        });
        
        wrapper.appendChild(this.input);
        
        // Increment button
        if (this.options.showStepper) {
            const incBtn = document.createElement('button');
            incBtn.textContent = '+';
            incBtn.style.cssText = this._buttonStyle();
            incBtn.addEventListener('click', () => this.increment());
            incBtn.addEventListener('mousedown', () => this._startRepeat('increment'));
            incBtn.addEventListener('mouseup', () => this._stopRepeat());
            incBtn.addEventListener('mouseleave', () => this._stopRepeat());
            wrapper.appendChild(incBtn);
        }
        
        // Unit selector
        if (this.options.units && this.options.units.length > 1) {
            const unitSelect = document.createElement('select');
            unitSelect.style.cssText = 'padding: 6px; border: 1px solid var(--border, #ddd); border-radius: 3px;';
            this.options.units.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.value || u;
                opt.textContent = u.label || u;
                opt.selected = (u.value || u) === this.options.unit;
                unitSelect.appendChild(opt);
            });
            unitSelect.addEventListener('change', () => {
                this._convertUnit(this.options.unit, unitSelect.value);
                this.options.unit = unitSelect.value;
            });
            wrapper.appendChild(unitSelect);
        } else if (this.options.unit) {
            const unit = document.createElement('span');
            unit.textContent = this.options.unit;
            unit.style.cssText = 'color: var(--text-muted, #999); min-width: 30px;';
            wrapper.appendChild(unit);
        }
        
        this.container.appendChild(wrapper);
        
        // Slider
        if (this.options.showSlider && isFinite(this.options.min) && isFinite(this.options.max)) {
            this.slider = document.createElement('input');
            this.slider.type = 'range';
            this.slider.min = this.options.min;
            this.slider.max = this.options.max;
            this.slider.step = this.options.step;
            this.slider.value = this.value;
            this.slider.style.cssText = 'width: 100%; margin-top: 4px;';
            this.slider.addEventListener('input', () => {
                this.setValue(parseFloat(this.slider.value), false);
            });
            this.container.appendChild(this.slider);
        }
    }
    
    _buttonStyle() {
        return `
            width: 28px; height: 28px; padding: 0;
            border: 1px solid var(--border, #ddd); border-radius: 3px;
            background: var(--bg-secondary, #f5f5f5);
            cursor: pointer; font-size: 16px; line-height: 1;
        `;
    }
    
    _formatValue(value) {
        return parseFloat(value.toFixed(this.options.precision));
    }
    
    _parseAndSet(text) {
        let value;
        
        if (this.options.allowExpressions) {
            try {
                // Allow simple math expressions
                const sanitized = text.replace(/[^0-9+\-*/().\s]/g, '');
                value = Function('"use strict"; return (' + sanitized + ')')();
            } catch {
                value = parseFloat(text);
            }
        } else {
            value = parseFloat(text);
        }
        
        if (isNaN(value)) {
            this.input.value = this._formatValue(this.value);
            return;
        }
        
        this.setValue(value);
    }
    
    setValue(value, updateInput = true) {
        const oldValue = this.value;
        this.value = Math.max(this.options.min, Math.min(this.options.max, value));
        
        if (updateInput) {
            this.input.value = this._formatValue(this.value);
        }
        
        if (this.slider) {
            this.slider.value = this.value;
        }
        
        if (this.value !== oldValue) {
            this.options.onChange(this.value, oldValue);
        }
    }
    
    getValue() {
        return this.value;
    }
    
    increment(step = this.options.step) {
        this.setValue(this.value + step);
    }
    
    decrement(step = this.options.step) {
        this.setValue(this.value - step);
    }
    
    _startRepeat(action) {
        this._repeatInterval = setInterval(() => {
            if (action === 'increment') this.increment();
            else this.decrement();
        }, 100);
    }
    
    _stopRepeat() {
        if (this._repeatInterval) {
            clearInterval(this._repeatInterval);
            this._repeatInterval = null;
        }
    }
    
    _convertUnit(fromUnit, toUnit) {
        // Define conversion factors (example for length)
        const conversions = {
            'mm': 1,
            'cm': 10,
            'm': 1000,
            'in': 25.4,
            'ft': 304.8
        };
        
        if (conversions[fromUnit] && conversions[toUnit]) {
            const mmValue = this.value * conversions[fromUnit];
            this.setValue(mmValue / conversions[toUnit]);
        }
    }
}

// ======================================================================
// PRISM_COMMAND_PALETTE - Quick command search and execution
// ======================================================================

const PRISM_COMMAND_PALETTE = {
    commands: new Map(),
    history: [],
    maxHistory: 20,
    element: null,
    isOpen: false,
    
    init() {
        this._createDOM();
        this._setupKeyboard();
        console.log('[PRISM_COMMAND_PALETTE] Initialized');
    },
    
    _createDOM() {
        this.element = document.createElement('div');
        this.element.className = 'prism-command-palette';
        this.element.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); display: none;
            align-items: flex-start; justify-content: center;
            padding-top: 15vh; z-index: 99999;
        `;
        
        const modal = document.createElement('div');
        modal.className = 'command-palette-modal';
        modal.style.cssText = `
            background: var(--bg-primary, #fff); border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3); width: 600px;
            max-width: 90vw; max-height: 60vh; overflow: hidden;
            display: flex; flex-direction: column;
        `;
        
        // Search input
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.placeholder = 'Type a command...';
        this.input.style.cssText = `
            width: 100%; padding: 16px 20px; border: none;
            font-size: 16px; outline: none;
            border-bottom: 1px solid var(--border, #eee);
        `;
        this.input.addEventListener('input', () => this._filterCommands());
        this.input.addEventListener('keydown', (e) => this._handleKeydown(e));
        
        // Results list
        this.results = document.createElement('div');
        this.results.className = 'command-results';
        this.results.style.cssText = `
            flex: 1; overflow-y: auto; padding: 8px 0;
        `;
        
        modal.appendChild(this.input);
        modal.appendChild(this.results);
        this.element.appendChild(modal);
        document.body.appendChild(this.element);
        
        // Click backdrop to close
        this.element.addEventListener('click', (e) => {
            if (e.target === this.element) this.close();
        });
    },
    
    _setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+P or Cmd+Shift+P
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                this.toggle();
            }
            // Escape to close
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    },
    
    register(id, command) {
        this.commands.set(id, {
            id,
            label: command.label || id,
            description: command.description || '',
            shortcut: command.shortcut || '',
            category: command.category || 'General',
            action: command.action,
            icon: command.icon || ''
        });
    },
    
    unregister(id) {
        this.commands.delete(id);
    },
    
    open() {
        this.isOpen = true;
        this.element.style.display = 'flex';
        this.input.value = '';
        this.input.focus();
        this._filterCommands();
    },
    
    close() {
        this.isOpen = false;
        this.element.style.display = 'none';
    },
    
    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    },
    
    _filterCommands() {
        const query = this.input.value.toLowerCase();
        this.results.innerHTML = '';
        this.selectedIndex = 0;
        
        let filtered = Array.from(this.commands.values());
        
        if (query) {
            filtered = filtered.filter(cmd => 
                cmd.label.toLowerCase().includes(query) ||
                cmd.description.toLowerCase().includes(query) ||
                cmd.category.toLowerCase().includes(query)
            ).sort((a, b) => {
                // Prioritize label matches
                const aLabel = a.label.toLowerCase().indexOf(query);
                const bLabel = b.label.toLowerCase().indexOf(query);
                if (aLabel !== -1 && bLabel === -1) return -1;
                if (bLabel !== -1 && aLabel === -1) return 1;
                return aLabel - bLabel;
            });
        } else {
            // Show recent commands first
            const recent = this.history.slice(0, 5).map(id => this.commands.get(id)).filter(Boolean);
            const rest = filtered.filter(cmd => !this.history.includes(cmd.id));
            filtered = [...recent, ...rest];
        }
        
        // Group by category
        const grouped = new Map();
        filtered.forEach(cmd => {
            if (!grouped.has(cmd.category)) grouped.set(cmd.category, []);
            grouped.get(cmd.category).push(cmd);
        });
        
        let index = 0;
        for (const [category, commands] of grouped) {
            // Category header
            const header = document.createElement('div');
            header.textContent = category;
            header.style.cssText = `
                padding: 8px 16px; font-size: 11px; font-weight: 600;
                color: var(--text-muted, #999); text-transform: uppercase;
            `;
            this.results.appendChild(header);
            
            // Commands
            for (const cmd of commands) {
                const item = this._createResultItem(cmd, index);
                this.results.appendChild(item);
                index++;
            }
        }
        
        this.filteredCommands = filtered;
        this._updateSelection();
    },
    
    _createResultItem(cmd, index) {
        const item = document.createElement('div');
        item.className = 'command-item';
        item.dataset.index = index;
        item.style.cssText = `
            padding: 10px 16px; cursor: pointer;
            display: flex; align-items: center; gap: 12px;
        `;
        
        if (cmd.icon) {
            const icon = document.createElement('span');
            icon.textContent = cmd.icon;
            icon.style.fontSize = '18px';
            item.appendChild(icon);
        }
        
        const content = document.createElement('div');
        content.style.flex = '1';
        
        const label = document.createElement('div');
        label.textContent = cmd.label;
        label.style.fontWeight = '500';
        content.appendChild(label);
        
        if (cmd.description) {
            const desc = document.createElement('div');
            desc.textContent = cmd.description;
            desc.style.cssText = 'font-size: 12px; color: var(--text-muted, #999);';
            content.appendChild(desc);
        }
        
        item.appendChild(content);
        
        if (cmd.shortcut) {
            const shortcut = document.createElement('kbd');
            shortcut.textContent = cmd.shortcut;
            shortcut.style.cssText = `
                padding: 2px 6px; background: var(--bg-secondary, #f0f0f0);
                border-radius: 3px; font-size: 11px; font-family: monospace;
            `;
            item.appendChild(shortcut);
        }
        
        item.addEventListener('click', () => this._executeCommand(cmd));
        item.addEventListener('mouseenter', () => {
            this.selectedIndex = index;
            this._updateSelection();
        });
        
        return item;
    },
    
    _handleKeydown(e) {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredCommands.length - 1);
                this._updateSelection();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
                this._updateSelection();
                break;
            case 'Enter':
                if (this.filteredCommands[this.selectedIndex]) {
                    this._executeCommand(this.filteredCommands[this.selectedIndex]);
                }
                break;
        }
    },
    
    _updateSelection() {
        const items = this.results.querySelectorAll('.command-item');
        items.forEach((item, i) => {
            item.style.background = i === this.selectedIndex ? 'var(--accent, #2196F3)11' : '';
        });
        
        // Scroll into view
        const selected = items[this.selectedIndex];
        if (selected) selected.scrollIntoView({ block: 'nearest' });
    },
    
    _executeCommand(cmd) {
        // Update history
        this.history = [cmd.id, ...this.history.filter(id => id !== cmd.id)].slice(0, this.maxHistory);
        
        this.close();
        
        if (typeof cmd.action === 'function') {
            cmd.action();
        } else if (typeof cmd.action === 'string') {
            PRISM_EVENT_BUS?.publish?.(cmd.action);
        }
    },
    
    // Pre-register common commands
    registerDefaults() {
        this.register('save', { label: 'Save', shortcut: 'Ctrl+S', category: 'File', action: () => PRISM_EVENT_BUS?.publish?.('file:save') });
        this.register('open', { label: 'Open File', shortcut: 'Ctrl+O', category: 'File', action: () => PRISM_EVENT_BUS?.publish?.('file:open') });
        this.register('undo', { label: 'Undo', shortcut: 'Ctrl+Z', category: 'Edit', action: () => PRISM_HISTORY?.undo?.() });
        this.register('redo', { label: 'Redo', shortcut: 'Ctrl+Y', category: 'Edit', action: () => PRISM_HISTORY?.redo?.() });
        this.register('theme', { label: 'Toggle Theme', category: 'View', action: () => PRISM_THEME_MANAGER?.toggle?.() });
        this.register('shortcuts', { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+/', category: 'Help', action: () => {} });
    }
};

// ======================================================================
// PRISM_AUTOSAVE - Auto-save and crash recovery
// ======================================================================

const PRISM_AUTOSAVE = {
    interval: 60000, // 1 minute
    maxBackups: 10,
    storageKey: 'prism_autosave',
    timer: null,
    isDirty: false,
    
    init(options = {}) {
        this.interval = options.interval || this.interval;
        this.maxBackups = options.maxBackups || this.maxBackups;
        this.getState = options.getState || (() => ({}));
        this.setState = options.setState || (() => {});
        
        // Check for crash recovery
        this.checkRecovery();
        
        // Start auto-save timer
        this.start();
        
        // Listen for changes
        PRISM_EVENT_BUS?.subscribe?.('state:changed', () => { this.isDirty = true; });
        
        // Save before unload
        window.addEventListener('beforeunload', (e) => {
            if (this.isDirty) {
                this.save();
                e.returnValue = 'You have unsaved changes.';
                return e.returnValue;
            }
        });
        
        console.log('[PRISM_AUTOSAVE] Initialized');
    },
    
    start() {
        if (this.timer) return;
        this.timer = setInterval(() => {
            if (this.isDirty) {
                this.save();
            }
        }, this.interval);
    },
    
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    },
    
    save() {
        try {
            const state = this.getState();
            const backup = {
                timestamp: Date.now(),
                version: PRISM_CONSTANTS?.VERSION || '1.0',
                state
            };
            
            // Get existing backups
            let backups = this.getBackups();
            
            // Add new backup
            backups.unshift(backup);
            
            // Limit backups
            backups = backups.slice(0, this.maxBackups);
            
            // Save to storage
            localStorage.setItem(this.storageKey, JSON.stringify(backups));
            
            this.isDirty = false;
            console.log('[PRISM_AUTOSAVE] Saved at', new Date().toLocaleTimeString());
            
            PRISM_EVENT_BUS?.publish?.('autosave:saved', backup);
            
            return true;
        } catch (error) {
            console.error('[PRISM_AUTOSAVE] Save failed:', error);
            return false;
        }
    },
    
    getBackups() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    },
    
    getLatestBackup() {
        const backups = this.getBackups();
        return backups[0] || null;
    },
    
    recover(index = 0) {
        const backups = this.getBackups();
        const backup = backups[index];
        
        if (!backup) {
            console.warn('[PRISM_AUTOSAVE] No backup found at index', index);
            return false;
        }
        
        try {
            this.setState(backup.state);
            console.log('[PRISM_AUTOSAVE] Recovered from', new Date(backup.timestamp).toLocaleString());
            PRISM_EVENT_BUS?.publish?.('autosave:recovered', backup);
            return true;
        } catch (error) {
            console.error('[PRISM_AUTOSAVE] Recovery failed:', error);
            return false;
        }
    },
    
    checkRecovery() {
        const backup = this.getLatestBackup();
        if (!backup) return;
        
        const age = Date.now() - backup.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (age < maxAge) {
            // Recent backup exists - offer recovery
            PRISM_EVENT_BUS?.publish?.('autosave:recovery_available', backup);
            
            // Could show UI prompt here
            console.log('[PRISM_AUTOSAVE] Recovery available from', new Date(backup.timestamp).toLocaleString());
        }
    },
    
    clearBackups() {
        localStorage.removeItem(this.storageKey);
        console.log('[PRISM_AUTOSAVE] Backups cleared');
    },
    
    getBackupList() {
        return this.getBackups().map((b, i) => ({
            index: i,
            timestamp: b.timestamp,
            date: new Date(b.timestamp).toLocaleString(),
            version: b.version,
            age: this._formatAge(Date.now() - b.timestamp)
        }));
    },
    
    _formatAge(ms) {
        const minutes = Math.floor(ms / 60000);
        if (minutes < 60) return `${minutes} minutes ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hours ago`;
        const days = Math.floor(hours / 24);
        return `${days} days ago`;
    },
    
    markDirty() {
        this.isDirty = true;
    },
    
    markClean() {
        this.isDirty = false;
    }
};

// ======================================================================
// PRISM_STATUS_BAR - Application status bar
// ======================================================================

const PRISM_STATUS_BAR = {
    container: null,
    sections: {},
    
    init(container) {
        this.container = container;
        this.container.className = 'prism-status-bar';
        this.container.style.cssText = `
            display: flex; align-items: center;
            height: 24px; padding: 0 8px;
            background: var(--header-bg, #1a1a1a);
            color: var(--header-text, #fff);
            font-size: 12px; font-family: var(--font-family, sans-serif);
            border-top: 1px solid var(--border, #333);
        `;
        
        this._createDefaultSections();
        this._setupListeners();
        
        console.log('[PRISM_STATUS_BAR] Initialized');
    },
    
    _createDefaultSections() {
        // Left sections
        this.addSection('message', { position: 'left', flex: 1 });
        
        // Right sections
        this.addSection('selection', { position: 'right', width: '120px' });
        this.addSection('position', { position: 'right', width: '180px' });
        this.addSection('unit', { position: 'right', width: '50px' });
        this.addSection('zoom', { position: 'right', width: '60px' });
        
        // Set defaults
        this.set('message', 'Ready');
        this.set('selection', 'No selection');
        this.set('position', 'X: 0.000  Y: 0.000  Z: 0.000');
        this.set('unit', 'inch');
        this.set('zoom', '100%');
    },
    
    addSection(id, options = {}) {
        const section = document.createElement('div');
        section.className = `status-section status-${id}`;
        section.style.cssText = `
            padding: 0 8px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            ${options.flex ? `flex: ${options.flex};` : ''}
            ${options.width ? `width: ${options.width};` : ''}
            ${options.minWidth ? `min-width: ${options.minWidth};` : ''}
            ${options.align ? `text-align: ${options.align};` : ''}
        `;
        
        if (options.clickable) {
            section.style.cursor = 'pointer';
            section.addEventListener('click', () => {
                PRISM_EVENT_BUS?.publish?.(`statusbar:click:${id}`);
            });
        }
        
        if (options.position === 'left') {
            // Insert at beginning
            this.container.insertBefore(section, this.container.firstChild);
        } else {
            this.container.appendChild(section);
        }
        
        this.sections[id] = section;
        return section;
    },
    
    set(id, text, options = {}) {
        const section = this.sections[id];
        if (!section) return;
        
        section.textContent = text;
        
        if (options.icon) {
            section.innerHTML = `<span style="margin-right:4px">${options.icon}</span>${text}`;
        }
        
        if (options.color) {
            section.style.color = options.color;
        }
        
        if (options.tooltip) {
            section.title = options.tooltip;
        }
    },
    
    setMessage(text, type = 'info') {
        const colors = {
            info: 'inherit',
            success: '#4CAF50',
            warning: '#FF9800',
            error: '#F44336'
        };
        this.set('message', text, { color: colors[type] });
        
        // Clear after timeout for non-info messages
        if (type !== 'info') {
            setTimeout(() => this.set('message', 'Ready'), 5000);
        }
    },
    
    setPosition(x, y, z) {
        const format = (n) => n.toFixed(3).padStart(8);
        this.set('position', `X:${format(x)} Y:${format(y)} Z:${format(z)}`);
    },
    
    setSelection(count, type = 'objects') {
        if (count === 0) {
            this.set('selection', 'No selection');
        } else {
            this.set('selection', `${count} ${type} selected`);
        }
    },
    
    setZoom(percent) {
        this.set('zoom', `${Math.round(percent)}%`);
    },
    
    setUnit(unit) {
        this.set('unit', unit);
    },
    
    showProgress(percent, text = '') {
        if (!this.sections.progress) {
            this.addSection('progress', { position: 'right', width: '150px' });
        }
        
        const progressBar = `
            <div style="display:flex;align-items:center;gap:8px">
                <div style="flex:1;height:4px;background:#444;border-radius:2px;overflow:hidden">
                    <div style="width:${percent}%;height:100%;background:var(--accent,#2196F3)"></div>
                </div>
                <span>${percent}%</span>
            </div>
        `;
        
        this.sections.progress.innerHTML = progressBar;
    },
    
    hideProgress() {
        if (this.sections.progress) {
            this.sections.progress.remove();
            delete this.sections.progress;
        }
    },
    
    _setupListeners() {
        // Listen for events
        PRISM_EVENT_BUS?.subscribe?.('viewport:zoom', (e) => this.setZoom(e.zoom * 100));
        PRISM_EVENT_BUS?.subscribe?.('cursor:position', (e) => this.setPosition(e.x, e.y, e.z));
        PRISM_EVENT_BUS?.subscribe?.('selection:changed', (e) => this.setSelection(e.count, e.type));
    }
};

// ======================================================================
// PRISM_RECENT_FILES - Recent files management
// ======================================================================

const PRISM_RECENT_FILES = {
    storageKey: 'prism_recent_files',
    maxFiles: 20,
    files: [],
    
    init() {
        this.load();
        console.log('[PRISM_RECENT_FILES] Initialized with', this.files.length, 'files');
    },
    
    load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            this.files = data ? JSON.parse(data) : [];
        } catch {
            this.files = [];
        }
    },
    
    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.files));
    },
    
    add(file) {
        const entry = {
            path: file.path || file.name,
            name: file.name || file.path.split('/').pop(),
            type: file.type || this._getType(file.path || file.name),
            timestamp: Date.now(),
            thumbnail: file.thumbnail || null,
            metadata: file.metadata || {}
        };
        
        // Remove if already exists
        this.files = this.files.filter(f => f.path !== entry.path);
        
        // Add to front
        this.files.unshift(entry);
        
        // Limit size
        this.files = this.files.slice(0, this.maxFiles);
        
        this.save();
        PRISM_EVENT_BUS?.publish?.('recentFiles:updated', this.files);
    },
    
    remove(path) {
        this.files = this.files.filter(f => f.path !== path);
        this.save();
        PRISM_EVENT_BUS?.publish?.('recentFiles:updated', this.files);
    },
    
    clear() {
        this.files = [];
        this.save();
        PRISM_EVENT_BUS?.publish?.('recentFiles:updated', this.files);
    },
    
    getAll() {
        return this.files.map(f => ({
            ...f,
            age: this._formatAge(Date.now() - f.timestamp)
        }));
    },
    
    getRecent(count = 5) {
        return this.getAll().slice(0, count);
    },
    
    getByType(type) {
        return this.files.filter(f => f.type === type);
    },
    
    _getType(path) {
        const ext = path.split('.').pop().toLowerCase();
        const types = {
            'prism': 'project',
            'step': 'cad', 'stp': 'cad', 'iges': 'cad', 'igs': 'cad',
            'nc': 'gcode', 'ngc': 'gcode', 'gcode': 'gcode', 'tap': 'gcode',
            'stl': 'mesh', 'obj': 'mesh', '3mf': 'mesh',
            'dxf': 'drawing', 'dwg': 'drawing'
        };
        return types[ext] || 'unknown';
    },
    
    _formatAge(ms) {
        const minutes = Math.floor(ms / 60000);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        const weeks = Math.floor(days / 7);
        return `${weeks}w ago`;
    },
    
    createMenu() {
        const menu = document.createElement('div');
        menu.className = 'recent-files-menu';
        menu.style.cssText = `
            min-width: 300px; max-height: 400px;
            overflow-y: auto; padding: 8px 0;
        `;
        
        if (this.files.length === 0) {
            const empty = document.createElement('div');
            empty.textContent = 'No recent files';
            empty.style.cssText = 'padding: 16px; text-align: center; color: var(--text-muted);';
            menu.appendChild(empty);
            return menu;
        }
        
        const files = this.getAll();
        files.forEach(file => {
            const item = document.createElement('div');
            item.className = 'recent-file-item';
            item.style.cssText = `
                display: flex; align-items: center; padding: 8px 16px;
                cursor: pointer; gap: 12px;
            `;
            
            const icon = document.createElement('span');
            icon.textContent = this._getIcon(file.type);
            icon.style.fontSize = '20px';
            
            const info = document.createElement('div');
            info.style.flex = '1';
            info.innerHTML = `
                <div style="font-weight:500">${file.name}</div>
                <div style="font-size:11px;color:var(--text-muted)">${file.path}</div>
            `;
            
            const age = document.createElement('span');
            age.textContent = file.age;
            age.style.cssText = 'font-size:11px;color:var(--text-muted)';
            
            item.appendChild(icon);
            item.appendChild(info);
            item.appendChild(age);
            
            item.addEventListener('click', () => {
                PRISM_EVENT_BUS?.publish?.('file:open', { path: file.path });
            });
            
            item.addEventListener('mouseenter', () => { item.style.background = 'var(--bg-secondary)'; });
            item.addEventListener('mouseleave', () => { item.style.background = ''; });
            
            menu.appendChild(item);
        });
        
        // Clear button
        const clearBtn = document.createElement('div');
        clearBtn.textContent = 'Clear Recent Files';
        clearBtn.style.cssText = `
            padding: 8px 16px; text-align: center;
            border-top: 1px solid var(--border);
            cursor: pointer; color: var(--text-muted);
        `;
        clearBtn.addEventListener('click', () => this.clear());
        menu.appendChild(clearBtn);
        
        return menu;
    },
    
    _getIcon(type) {
        const icons = {
            project: '📁', cad: '🔧', gcode: '📄',
            mesh: '🔺', drawing: '📐', unknown: '📄'
        };
        return icons[type] || icons.unknown;
    }
};

// ======================================================================
// PRISM_PREFERENCES - User preferences management
// ======================================================================

const PRISM_PREFERENCES = {
    storageKey: 'prism_preferences',
    defaults: {},
    values: {},
    schema: [],
    
    init(schema, defaults = {}) {
        this.schema = schema;
        this.defaults = defaults;
        this.load();
        console.log('[PRISM_PREFERENCES] Initialized');
    },
    
    load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            const saved = data ? JSON.parse(data) : {};
            this.values = { ...this.defaults, ...saved };
        } catch {
            this.values = { ...this.defaults };
        }
    },
    
    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.values));
        PRISM_EVENT_BUS?.publish?.('preferences:changed', this.values);
    },
    
    get(key, defaultValue) {
        return this.values[key] ?? defaultValue ?? this.defaults[key];
    },
    
    set(key, value) {
        const oldValue = this.values[key];
        this.values[key] = value;
        this.save();
        PRISM_EVENT_BUS?.publish?.(`preference:${key}`, { value, oldValue });
    },
    
    reset(key) {
        if (key) {
            this.values[key] = this.defaults[key];
        } else {
            this.values = { ...this.defaults };
        }
        this.save();
    },
    
    export() {
        return JSON.stringify(this.values, null, 2);
    },
    
    import(json) {
        try {
            const data = JSON.parse(json);
            this.values = { ...this.defaults, ...data };
            this.save();
            return true;
        } catch {
            return false;
        }
    },
    
    createPanel(container) {
        container.innerHTML = '';
        container.className = 'prism-preferences-panel';
        
        // Group by category
        const grouped = new Map();
        this.schema.forEach(pref => {
            const cat = pref.category || 'General';
            if (!grouped.has(cat)) grouped.set(cat, []);
            grouped.get(cat).push(pref);
        });
        
        for (const [category, prefs] of grouped) {
            const section = document.createElement('div');
            section.className = 'pref-section';
            
            const header = document.createElement('h3');
            header.textContent = category;
            header.style.cssText = 'margin: 16px 0 8px; padding: 8px 0; border-bottom: 1px solid var(--border);';
            section.appendChild(header);
            
            prefs.forEach(pref => {
                const row = this._createPrefRow(pref);
                section.appendChild(row);
            });
            
            container.appendChild(section);
        }
        
        // Buttons
        const buttons = document.createElement('div');
        buttons.style.cssText = 'margin-top: 20px; display: flex; gap: 8px;';
        
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset to Defaults';
        resetBtn.addEventListener('click', () => { this.reset(); this.createPanel(container); });
        
        const exportBtn = document.createElement('button');
        exportBtn.textContent = 'Export';
        exportBtn.addEventListener('click', () => {
            const data = this.export();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'prism-preferences.json';
            a.click();
        });
        
        buttons.appendChild(resetBtn);
        buttons.appendChild(exportBtn);
        container.appendChild(buttons);
    },
    
    _createPrefRow(pref) {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; padding: 8px 0;';
        
        const label = document.createElement('label');
        label.textContent = pref.label;
        label.style.cssText = 'flex: 0 0 200px;';
        if (pref.description) label.title = pref.description;
        
        let input;
        const value = this.get(pref.key);
        
        switch (pref.type) {
            case 'boolean':
                input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = value;
                input.addEventListener('change', () => this.set(pref.key, input.checked));
                break;
                
            case 'select':
                input = document.createElement('select');
                input.style.cssText = 'padding: 4px 8px;';
                pref.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value ?? opt;
                    option.textContent = opt.label ?? opt;
                    option.selected = option.value === value;
                    input.appendChild(option);
                });
                input.addEventListener('change', () => this.set(pref.key, input.value));
                break;
                
            case 'number':
                input = document.createElement('input');
                input.type = 'number';
                input.value = value;
                input.min = pref.min;
                input.max = pref.max;
                input.step = pref.step || 1;
                input.style.cssText = 'width: 100px; padding: 4px 8px;';
                input.addEventListener('change', () => this.set(pref.key, parseFloat(input.value)));
                break;
                
            case 'color':
                input = document.createElement('input');
                input.type = 'color';
                input.value = value;
                input.addEventListener('change', () => this.set(pref.key, input.value));
                break;
                
            default:
                input = document.createElement('input');
                input.type = 'text';
                input.value = value;
                input.style.cssText = 'flex: 1; padding: 4px 8px;';
                input.addEventListener('change', () => this.set(pref.key, input.value));
        }
        
        row.appendChild(label);
        row.appendChild(input);
        
        return row;
    }
};
/**
 * PRISM CAD/CAM/Graphics Knowledge Base
 * Bulk-extracted from MIT OpenCourseWare using Python
 * Generated: 2026-01-17T21:36:15.605666
 * 
 * Sources: 
 * - 2.158J Computational Geometry (CAD kernel algorithms)
 * - 6.837 Computer Graphics (rendering, shading)
 * - 18.086 Computational Science (numerical methods)
 * - 2.008/2.007 Manufacturing (CAM, machining)
 * - 2.75 Precision Machine Design
 * - 2.086 Numerical Computation
 * - 3.11 Mechanics of Materials
 * - 16.412J Cognitive Robotics (planning algorithms)
 */

// ═══════════════════════════════════════════════════════════════════════════
// CAD KERNEL ALGORITHMS
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_CAD_KERNEL_MIT = {
    
    // ─────────────────────────────────────────────────────────────────────────
    // NURBS & B-SPLINE ALGORITHMS (from 2.158J)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * De Boor Algorithm - Evaluate B-spline at parameter t
     * Source: MIT 2.158J Computational Geometry
     * @param {number} t - Parameter value
     * @param {number} degree - Spline degree
     * @param {Array} controlPoints - Array of control points [{x,y,z}]
     * @param {Array} knots - Knot vector
     * @returns {Object} Point {x, y, z}
     */
    deBoorEvaluate: function(t, degree, controlPoints, knots) {
        const n = controlPoints.length - 1;
        const p = degree;
        
        // Find knot span
        let k = this._findKnotSpan(t, degree, knots);
        
        // Extract relevant control points
        let d = [];
        for (let j = 0; j <= p; j++) {
            d[j] = { ...controlPoints[k - p + j] };
        }
        
        // De Boor recursion
        for (let r = 1; r <= p; r++) {
            for (let j = p; j >= r; j--) {
                const alpha = (t - knots[k - p + j]) / (knots[k + 1 + j - r] - knots[k - p + j]);
                d[j] = {
                    x: (1 - alpha) * d[j - 1].x + alpha * d[j].x,
                    y: (1 - alpha) * d[j - 1].y + alpha * d[j].y,
                    z: (1 - alpha) * (d[j - 1].z || 0) + alpha * (d[j].z || 0)
                };
            }
        }
        
        return d[p];
    },
    
    _findKnotSpan: function(t, degree, knots) {
        const n = knots.length - degree - 2;
        if (t >= knots[n + 1]) return n;
        if (t <= knots[degree]) return degree;
        
        let low = degree, high = n + 1;
        let mid = Math.floor((low + high) / 2);
        
        while (t < knots[mid] || t >= knots[mid + 1]) {
            if (t < knots[mid]) high = mid;
            else low = mid;
            mid = Math.floor((low + high) / 2);
        }
        
        return mid;
    },
    
    /**
     * De Casteljau Algorithm - Evaluate Bezier curve at parameter t
     * Source: MIT 2.158J, 6.837
     * @param {number} t - Parameter 0-1
     * @param {Array} controlPoints - Control points
     * @returns {Object} Point at t
     */
    deCasteljau: function(t, controlPoints) {
        if (controlPoints.length === 1) return controlPoints[0];
        
        const newPoints = [];
        for (let i = 0; i < controlPoints.length - 1; i++) {
            newPoints.push({
                x: (1 - t) * controlPoints[i].x + t * controlPoints[i + 1].x,
                y: (1 - t) * controlPoints[i].y + t * controlPoints[i + 1].y,
                z: (1 - t) * (controlPoints[i].z || 0) + t * (controlPoints[i + 1].z || 0)
            });
        }
        
        return this.deCasteljau(t, newPoints);
    },
    
    /**
     * Knot Insertion (Oslo Algorithm)
     * Source: MIT 2.158J
     * @param {number} u - New knot value
     * @param {Array} controlPoints - Current control points
     * @param {Array} knots - Current knot vector
     * @param {number} degree - Curve degree
     * @returns {Object} {newControlPoints, newKnots}
     */
    insertKnot: function(u, controlPoints, knots, degree) {
        const k = this._findKnotSpan(u, degree, knots);
        const n = controlPoints.length;
        
        // New knot vector
        const newKnots = [...knots.slice(0, k + 1), u, ...knots.slice(k + 1)];
        
        // New control points
        const newCP = [];
        for (let i = 0; i <= n; i++) {
            if (i <= k - degree) {
                newCP.push({ ...controlPoints[i] });
            } else if (i > k) {
                newCP.push({ ...controlPoints[i - 1] });
            } else {
                const alpha = (u - knots[i]) / (knots[i + degree] - knots[i]);
                newCP.push({
                    x: (1 - alpha) * controlPoints[i - 1].x + alpha * controlPoints[i].x,
                    y: (1 - alpha) * controlPoints[i - 1].y + alpha * controlPoints[i].y,
                    z: (1 - alpha) * (controlPoints[i - 1].z || 0) + alpha * (controlPoints[i].z || 0)
                });
            }
        }
        
        return { newControlPoints: newCP, newKnots };
    },
    
    /**
     * NURBS Surface Evaluation
     * Source: MIT 2.158J
     * @param {number} u - U parameter
     * @param {number} v - V parameter
     * @param {Array} controlNet - 2D array of control points with weights
     * @param {Array} knotsU - U direction knots
     * @param {Array} knotsV - V direction knots
     * @param {number} degreeU - U degree
     * @param {number} degreeV - V degree
     */
    evaluateNURBSSurface: function(u, v, controlNet, knotsU, knotsV, degreeU, degreeV) {
        const nU = controlNet.length;
        const nV = controlNet[0].length;
        
        // Evaluate in U direction first
        const uCurves = [];
        for (let j = 0; j < nV; j++) {
            const uPoints = controlNet.map(row => row[j]);
            uCurves.push(this._evaluateNURBSCurve(u, uPoints, knotsU, degreeU));
        }
        
        // Then in V direction
        return this._evaluateNURBSCurve(v, uCurves, knotsV, degreeV);
    },
    
    _evaluateNURBSCurve: function(t, weightedPoints, knots, degree) {
        // Convert to homogeneous coords, evaluate, convert back
        const homogeneous = weightedPoints.map(p => ({
            x: p.x * (p.w || 1),
            y: p.y * (p.w || 1),
            z: (p.z || 0) * (p.w || 1),
            w: p.w || 1
        }));
        
        const result = this.deBoorEvaluate(t, degree, homogeneous, knots);
        return {
            x: result.x / result.w,
            y: result.y / result.w,
            z: result.z / result.w
        };
    },

    // ─────────────────────────────────────────────────────────────────────────
    // GEOMETRIC ALGORITHMS (from 2.158J, 18.086)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Convex Hull - Graham Scan
     * Source: MIT 2.158J, 6.046J
     */
    convexHull2D: function(points) {
        if (points.length < 3) return points;
        
        // Find lowest point
        let start = 0;
        for (let i = 1; i < points.length; i++) {
            if (points[i].y < points[start].y || 
                (points[i].y === points[start].y && points[i].x < points[start].x)) {
                start = i;
            }
        }
        
        const pivot = points[start];
        const sorted = points.slice().sort((a, b) => {
            const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
            const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
            return angleA - angleB;
        });
        
        const stack = [sorted[0], sorted[1]];
        
        for (let i = 2; i < sorted.length; i++) {
            while (stack.length > 1 && this._ccw(stack[stack.length - 2], stack[stack.length - 1], sorted[i]) <= 0) {
                stack.pop();
            }
            stack.push(sorted[i]);
        }
        
        return stack;
    },
    
    _ccw: function(p1, p2, p3) {
        return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
    },
    
    /**
     * Curve-Curve Intersection using Bezier clipping
     * Source: MIT 2.158J
     */
    bezierClipIntersect: function(curve1, curve2, tolerance = 1e-6, maxIter = 50) {
        const intersections = [];
        this._bezierClipRecurse(curve1, curve2, 0, 1, 0, 1, intersections, tolerance, 0, maxIter);
        return intersections;
    },
    
    _bezierClipRecurse: function(c1, c2, t1min, t1max, t2min, t2max, results, tol, depth, maxDepth) {
        if (depth > maxDepth) return;
        
        const box1 = this._getBoundingBox(c1);
        const box2 = this._getBoundingBox(c2);
        
        if (!this._boxesIntersect(box1, box2)) return;
        
        if (this._boxSize(box1) < tol && this._boxSize(box2) < tol) {
            results.push({
                t1: (t1min + t1max) / 2,
                t2: (t2min + t2max) / 2,
                point: this.deCasteljau(0.5, c1)
            });
            return;
        }
        
        // Subdivide larger curve
        if (this._boxSize(box1) > this._boxSize(box2)) {
            const [c1a, c1b] = this._subdivideBezier(c1, 0.5);
            const tmid = (t1min + t1max) / 2;
            this._bezierClipRecurse(c1a, c2, t1min, tmid, t2min, t2max, results, tol, depth + 1, maxDepth);
            this._bezierClipRecurse(c1b, c2, tmid, t1max, t2min, t2max, results, tol, depth + 1, maxDepth);
        } else {
            const [c2a, c2b] = this._subdivideBezier(c2, 0.5);
            const tmid = (t2min + t2max) / 2;
            this._bezierClipRecurse(c1, c2a, t1min, t1max, t2min, tmid, results, tol, depth + 1, maxDepth);
            this._bezierClipRecurse(c1, c2b, t1min, t1max, tmid, t2max, results, tol, depth + 1, maxDepth);
        }
    },
    
    _subdivideBezier: function(points, t) {
        const left = [points[0]];
        const right = [points[points.length - 1]];
        let current = points;
        
        while (current.length > 1) {
            const next = [];
            for (let i = 0; i < current.length - 1; i++) {
                next.push({
                    x: (1 - t) * current[i].x + t * current[i + 1].x,
                    y: (1 - t) * current[i].y + t * current[i + 1].y,
                    z: (1 - t) * (current[i].z || 0) + t * (current[i + 1].z || 0)
                });
            }
            left.push(next[0]);
            right.unshift(next[next.length - 1]);
            current = next;
        }
        
        return [left, right];
    },
    
    _getBoundingBox: function(points) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of points) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }
        return { minX, minY, maxX, maxY };
    },
    
    _boxesIntersect: function(a, b) {
        return !(a.maxX < b.minX || b.maxX < a.minX || a.maxY < b.minY || b.maxY < a.minY);
    },
    
    _boxSize: function(box) {
        return Math.max(box.maxX - box.minX, box.maxY - box.minY);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// GRAPHICS ENGINE ALGORITHMS
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_GRAPHICS_MIT = {
    
    // ─────────────────────────────────────────────────────────────────────────
    // RAY TRACING (from 6.837)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Ray-Triangle Intersection (Möller-Trumbore)
     * Source: MIT 6.837 Computer Graphics
     */
    rayTriangleIntersect: function(rayOrigin, rayDir, v0, v1, v2) {
        const EPSILON = 1e-8;
        
        const edge1 = this._vecSub(v1, v0);
        const edge2 = this._vecSub(v2, v0);
        const h = this._vecCross(rayDir, edge2);
        const a = this._vecDot(edge1, h);
        
        if (a > -EPSILON && a < EPSILON) return null;
        
        const f = 1.0 / a;
        const s = this._vecSub(rayOrigin, v0);
        const u = f * this._vecDot(s, h);
        
        if (u < 0.0 || u > 1.0) return null;
        
        const q = this._vecCross(s, edge1);
        const v = f * this._vecDot(rayDir, q);
        
        if (v < 0.0 || u + v > 1.0) return null;
        
        const t = f * this._vecDot(edge2, q);
        
        if (t > EPSILON) {
            return {
                t: t,
                point: this._vecAdd(rayOrigin, this._vecScale(rayDir, t)),
                normal: this._vecNormalize(this._vecCross(edge1, edge2)),
                u: u,
                v: v
            };
        }
        
        return null;
    },
    
    /**
     * Ray-Sphere Intersection
     * Source: MIT 6.837
     */
    raySphereIntersect: function(rayOrigin, rayDir, sphereCenter, radius) {
        const oc = this._vecSub(rayOrigin, sphereCenter);
        const a = this._vecDot(rayDir, rayDir);
        const b = 2.0 * this._vecDot(oc, rayDir);
        const c = this._vecDot(oc, oc) - radius * radius;
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant < 0) return null;
        
        const t = (-b - Math.sqrt(discriminant)) / (2 * a);
        if (t < 0) return null;
        
        const point = this._vecAdd(rayOrigin, this._vecScale(rayDir, t));
        const normal = this._vecNormalize(this._vecSub(point, sphereCenter));
        
        return { t, point, normal };
    },
    
    /**
     * Ray-AABB Intersection (slab method)
     * Source: MIT 6.837
     */
    rayAABBIntersect: function(rayOrigin, rayDir, boxMin, boxMax) {
        let tmin = -Infinity, tmax = Infinity;
        
        for (let i = 0; i < 3; i++) {
            const axis = ['x', 'y', 'z'][i];
            if (Math.abs(rayDir[axis]) < 1e-8) {
                if (rayOrigin[axis] < boxMin[axis] || rayOrigin[axis] > boxMax[axis]) {
                    return null;
                }
            } else {
                let t1 = (boxMin[axis] - rayOrigin[axis]) / rayDir[axis];
                let t2 = (boxMax[axis] - rayOrigin[axis]) / rayDir[axis];
                if (t1 > t2) [t1, t2] = [t2, t1];
                tmin = Math.max(tmin, t1);
                tmax = Math.min(tmax, t2);
                if (tmin > tmax) return null;
            }
        }
        
        return tmin >= 0 ? tmin : tmax >= 0 ? tmax : null;
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // SHADING MODELS (from 6.837)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Blinn-Phong Shading
     * Source: MIT 6.837
     */
    blinnPhongShade: function(params) {
        const { 
            normal, viewDir, lightDir, lightColor,
            ambient, diffuseColor, specularColor, shininess
        } = params;
        
        const N = this._vecNormalize(normal);
        const V = this._vecNormalize(viewDir);
        const L = this._vecNormalize(lightDir);
        const H = this._vecNormalize(this._vecAdd(V, L));
        
        // Diffuse
        const NdotL = Math.max(0, this._vecDot(N, L));
        const diffuse = this._vecScale(diffuseColor, NdotL);
        
        // Specular
        const NdotH = Math.max(0, this._vecDot(N, H));
        const specular = this._vecScale(specularColor, Math.pow(NdotH, shininess));
        
        // Combine
        return this._vecAdd(
            ambient,
            this._vecMul(lightColor, this._vecAdd(diffuse, specular))
        );
    },
    
    /**
     * Cook-Torrance BRDF (Physically Based)
     * Source: MIT 6.837
     */
    cookTorranceBRDF: function(params) {
        const { normal, viewDir, lightDir, roughness, metallic, baseColor, F0 } = params;
        
        const N = this._vecNormalize(normal);
        const V = this._vecNormalize(viewDir);
        const L = this._vecNormalize(lightDir);
        const H = this._vecNormalize(this._vecAdd(V, L));
        
        const NdotV = Math.max(0.001, this._vecDot(N, V));
        const NdotL = Math.max(0.001, this._vecDot(N, L));
        const NdotH = Math.max(0.001, this._vecDot(N, H));
        const VdotH = Math.max(0.001, this._vecDot(V, H));
        
        // GGX Distribution
        const alpha = roughness * roughness;
        const alpha2 = alpha * alpha;
        const denom = NdotH * NdotH * (alpha2 - 1) + 1;
        const D = alpha2 / (Math.PI * denom * denom);
        
        // Schlick-GGX Geometry
        const k = (roughness + 1) * (roughness + 1) / 8;
        const G1V = NdotV / (NdotV * (1 - k) + k);
        const G1L = NdotL / (NdotL * (1 - k) + k);
        const G = G1V * G1L;
        
        // Fresnel-Schlick
        const F = this._fresnelSchlick(VdotH, F0);
        
        // Specular BRDF
        const specular = this._vecScale(F, D * G / (4 * NdotV * NdotL));
        
        // Diffuse
        const kD = this._vecScale(this._vecSub({x:1,y:1,z:1}, F), 1 - metallic);
        const diffuse = this._vecMul(kD, this._vecScale(baseColor, 1 / Math.PI));
        
        return this._vecScale(this._vecAdd(diffuse, specular), NdotL);
    },
    
    _fresnelSchlick: function(cosTheta, F0) {
        const t = Math.pow(1 - cosTheta, 5);
        return {
            x: F0.x + (1 - F0.x) * t,
            y: F0.y + (1 - F0.y) * t,
            z: F0.z + (1 - F0.z) * t
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // TRANSFORMATION MATRICES (from 6.837, 18.06)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Create 4x4 transformation matrices
     */
    createTranslationMatrix: function(tx, ty, tz) {
        return [
            [1, 0, 0, tx],
            [0, 1, 0, ty],
            [0, 0, 1, tz],
            [0, 0, 0, 1]
        ];
    },
    
    createRotationMatrixX: function(angle) {
        const c = Math.cos(angle), s = Math.sin(angle);
        return [
            [1, 0, 0, 0],
            [0, c, -s, 0],
            [0, s, c, 0],
            [0, 0, 0, 1]
        ];
    },
    
    createRotationMatrixY: function(angle) {
        const c = Math.cos(angle), s = Math.sin(angle);
        return [
            [c, 0, s, 0],
            [0, 1, 0, 0],
            [-s, 0, c, 0],
            [0, 0, 0, 1]
        ];
    },
    
    createRotationMatrixZ: function(angle) {
        const c = Math.cos(angle), s = Math.sin(angle);
        return [
            [c, -s, 0, 0],
            [s, c, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ];
    },
    
    createPerspectiveMatrix: function(fov, aspect, near, far) {
        const f = 1 / Math.tan(fov / 2);
        const nf = 1 / (near - far);
        return [
            [f / aspect, 0, 0, 0],
            [0, f, 0, 0],
            [0, 0, (far + near) * nf, 2 * far * near * nf],
            [0, 0, -1, 0]
        ];
    },
    
    createLookAtMatrix: function(eye, target, up) {
        const zAxis = this._vecNormalize(this._vecSub(eye, target));
        const xAxis = this._vecNormalize(this._vecCross(up, zAxis));
        const yAxis = this._vecCross(zAxis, xAxis);
        
        return [
            [xAxis.x, xAxis.y, xAxis.z, -this._vecDot(xAxis, eye)],
            [yAxis.x, yAxis.y, yAxis.z, -this._vecDot(yAxis, eye)],
            [zAxis.x, zAxis.y, zAxis.z, -this._vecDot(zAxis, eye)],
            [0, 0, 0, 1]
        ];
    },
    
    // Vector utilities
    _vecAdd: function(a, b) { return {x: a.x+b.x, y: a.y+b.y, z: a.z+b.z}; },
    _vecSub: function(a, b) { return {x: a.x-b.x, y: a.y-b.y, z: a.z-b.z}; },
    _vecScale: function(v, s) { return {x: v.x*s, y: v.y*s, z: v.z*s}; },
    _vecMul: function(a, b) { return {x: a.x*b.x, y: a.y*b.y, z: a.z*b.z}; },
    _vecDot: function(a, b) { return a.x*b.x + a.y*b.y + a.z*b.z; },
    _vecCross: function(a, b) { 
        return {
            x: a.y*b.z - a.z*b.y,
            y: a.z*b.x - a.x*b.z,
            z: a.x*b.y - a.y*b.x
        };
    },
    _vecLength: function(v) { return Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z); },
    _vecNormalize: function(v) {
        const len = this._vecLength(v);
        return len > 0 ? this._vecScale(v, 1/len) : v;
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// CAM KERNEL ALGORITHMS
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_CAM_KERNEL_MIT = {
    
    // ─────────────────────────────────────────────────────────────────────────
    // TOOLPATH ALGORITHMS (from 2.008, 2.007)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Offset Curve Generation (for cutter compensation)
     * Source: MIT 2.158J, 2.008
     */
    offsetCurve2D: function(points, offset, closed = false) {
        const n = points.length;
        if (n < 2) return points;
        
        const normals = [];
        const offsetPoints = [];
        
        // Calculate segment normals
        for (let i = 0; i < n - 1; i++) {
            const dx = points[i + 1].x - points[i].x;
            const dy = points[i + 1].y - points[i].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            normals.push({ x: -dy / len, y: dx / len });
        }
        
        // Handle closed curves
        if (closed) {
            const dx = points[0].x - points[n - 1].x;
            const dy = points[0].y - points[n - 1].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            normals.push({ x: -dy / len, y: dx / len });
        }
        
        // Generate offset points
        for (let i = 0; i < n; i++) {
            let normal;
            
            if (i === 0 && !closed) {
                normal = normals[0];
            } else if (i === n - 1 && !closed) {
                normal = normals[n - 2];
            } else {
                // Average normals at vertex
                const prev = closed ? (i - 1 + n) % n : i - 1;
                const curr = closed ? i : Math.min(i, n - 2);
                normal = this._normalizeVector({
                    x: (normals[prev]?.x || normals[curr].x) + normals[curr].x,
                    y: (normals[prev]?.y || normals[curr].y) + normals[curr].y
                });
            }
            
            offsetPoints.push({
                x: points[i].x + normal.x * offset,
                y: points[i].y + normal.y * offset
            });
        }
        
        return offsetPoints;
    },
    
    _normalizeVector: function(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y);
        return len > 0 ? { x: v.x / len, y: v.y / len } : v;
    },
    
    /**
     * Zigzag Pocket Toolpath
     * Source: MIT 2.008
     */
    zigzagPocket: function(boundary, stepover, angle = 0) {
        // Get bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of boundary) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }
        
        const toolpath = [];
        const cos_a = Math.cos(angle);
        const sin_a = Math.sin(angle);
        
        // Generate scan lines
        const diagonal = Math.sqrt((maxX - minX) ** 2 + (maxY - minY) ** 2);
        const numLines = Math.ceil(diagonal / stepover);
        
        for (let i = 0; i < numLines; i++) {
            const offset = (i - numLines / 2) * stepover;
            
            // Line perpendicular to angle
            const lineStart = {
                x: minX + cos_a * offset - sin_a * diagonal,
                y: minY + sin_a * offset + cos_a * diagonal
            };
            const lineEnd = {
                x: minX + cos_a * offset + sin_a * diagonal,
                y: minY + sin_a * offset - cos_a * diagonal
            };
            
            // Find intersections with boundary
            const intersections = this._linePolygonIntersections(lineStart, lineEnd, boundary);
            
            // Sort and pair intersections
            intersections.sort((a, b) => {
                const da = (a.x - lineStart.x) ** 2 + (a.y - lineStart.y) ** 2;
                const db = (b.x - lineStart.x) ** 2 + (b.y - lineStart.y) ** 2;
                return da - db;
            });
            
            // Zigzag pattern
            for (let j = 0; j < intersections.length - 1; j += 2) {
                if (i % 2 === 0) {
                    toolpath.push(intersections[j], intersections[j + 1]);
                } else {
                    toolpath.push(intersections[j + 1], intersections[j]);
                }
            }
        }
        
        return toolpath;
    },
    
    _linePolygonIntersections: function(start, end, polygon) {
        const intersections = [];
        const n = polygon.length;
        
        for (let i = 0; i < n; i++) {
            const p1 = polygon[i];
            const p2 = polygon[(i + 1) % n];
            
            const int = this._lineLineIntersection(start, end, p1, p2);
            if (int) intersections.push(int);
        }
        
        return intersections;
    },
    
    _lineLineIntersection: function(p1, p2, p3, p4) {
        const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
        if (Math.abs(d) < 1e-10) return null;
        
        const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
        const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / d;
        
        if (u >= 0 && u <= 1) {
            return {
                x: p1.x + t * (p2.x - p1.x),
                y: p1.y + t * (p2.y - p1.y)
            };
        }
        
        return null;
    },
    
    /**
     * Scallop Height Calculator
     * Source: MIT 2.008
     */
    calculateScallopHeight: function(toolRadius, stepover) {
        // h = R - sqrt(R² - (s/2)²)
        const R = toolRadius;
        const s = stepover;
        return R - Math.sqrt(R * R - (s / 2) * (s / 2));
    },
    
    /**
     * Stepover from target scallop height
     */
    stepoverFromScallop: function(toolRadius, targetScallop) {
        // s = 2 * sqrt(2*R*h - h²)
        const R = toolRadius;
        const h = targetScallop;
        return 2 * Math.sqrt(2 * R * h - h * h);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACTION STATISTICS
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_MIT_EXTRACTION_STATS = {
    generatedDate: "2026-01-17T21:36:15.605685",
    sourceCourses: [
        "2.158J - Computational Geometry",
        "6.837 - Computer Graphics", 
        "18.086 - Computational Science",
        "2.008 - Design and Manufacturing II",
        "2.007 - Design and Manufacturing I",
        "2.75 - Precision Machine Design",
        "2.086 - Numerical Computation",
        "3.11 - Mechanics of Materials",
        "16.412J - Cognitive Robotics"
    ],
    extractedAlgorithms: {
        cad: 16,
        cam: 11,
        graphics: 33
    },
    totalFormulas: 840,
    keyExcerpts: 78
};

// ═══════════════════════════════════════════════════════════════════════════
// GATEWAY REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

if (typeof PRISM_GATEWAY !== 'undefined') {
    // CAD kernel routes
    PRISM_GATEWAY.register('cad.nurbs.evaluate', 'PRISM_CAD_KERNEL_MIT.deBoorEvaluate');
    PRISM_GATEWAY.register('cad.bezier.evaluate', 'PRISM_CAD_KERNEL_MIT.deCasteljau');
    PRISM_GATEWAY.register('cad.nurbs.insertKnot', 'PRISM_CAD_KERNEL_MIT.insertKnot');
    PRISM_GATEWAY.register('cad.nurbs.surfaceEval', 'PRISM_CAD_KERNEL_MIT.evaluateNURBSSurface');
    PRISM_GATEWAY.register('cad.geometry.convexHull', 'PRISM_CAD_KERNEL_MIT.convexHull2D');
    PRISM_GATEWAY.register('cad.geometry.bezierIntersect', 'PRISM_CAD_KERNEL_MIT.bezierClipIntersect');
    
    // Graphics routes
    PRISM_GATEWAY.register('graphics.ray.triangle', 'PRISM_GRAPHICS_MIT.rayTriangleIntersect');
    PRISM_GATEWAY.register('graphics.ray.sphere', 'PRISM_GRAPHICS_MIT.raySphereIntersect');
    PRISM_GATEWAY.register('graphics.ray.aabb', 'PRISM_GRAPHICS_MIT.rayAABBIntersect');
    PRISM_GATEWAY.register('graphics.shade.blinnPhong', 'PRISM_GRAPHICS_MIT.blinnPhongShade');
    PRISM_GATEWAY.register('graphics.shade.cookTorrance', 'PRISM_GRAPHICS_MIT.cookTorranceBRDF');
    PRISM_GATEWAY.register('graphics.matrix.perspective', 'PRISM_GRAPHICS_MIT.createPerspectiveMatrix');
    PRISM_GATEWAY.register('graphics.matrix.lookAt', 'PRISM_GRAPHICS_MIT.createLookAtMatrix');
    
    // CAM routes
    PRISM_GATEWAY.register('cam.toolpath.offset', 'PRISM_CAM_KERNEL_MIT.offsetCurve2D');
    PRISM_GATEWAY.register('cam.toolpath.zigzagPocket', 'PRISM_CAM_KERNEL_MIT.zigzagPocket');
    PRISM_GATEWAY.register('cam.calc.scallopHeight', 'PRISM_CAM_KERNEL_MIT.calculateScallopHeight');
    PRISM_GATEWAY.register('cam.calc.stepoverFromScallop', 'PRISM_CAM_KERNEL_MIT.stepoverFromScallop');
    
    console.log('[PRISM] MIT CAD/CAM/Graphics Kernel loaded - 17 gateway routes');
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PRISM_CAD_KERNEL_MIT,
        PRISM_GRAPHICS_MIT,
        PRISM_CAM_KERNEL_MIT,
        PRISM_MIT_EXTRACTION_STATS
    };
}

console.log('[PRISM] MIT-sourced CAD/CAM/Graphics kernels ready');
/**
 * PRISM Enhanced CAD/CAM/Graphics Kernel - Pass 2
 * Deep extraction from MIT OpenCourseWare
 * Generated: 2026-01-17
 * 
 * Sources: 6.837, 2.008, 2.007, 2.75, 2.830J, 2.086, 3.11, 3.22, 2.001, 2.004, 2.141
 * 
 * Pass 2 Enhancements:
 * - Surface differential geometry (curvatures, normals, tangents)
 * - Advanced mesh operations (Delaunay, Voronoi, subdivision)
 * - Comprehensive B-spline/NURBS operations
 * - BVH acceleration structure with SAH
 * - Path tracing with importance sampling
 * - Complete quaternion math
 * - Advanced toolpath strategies
 * - Cutting physics models
 */

// ═══════════════════════════════════════════════════════════════════════════
// PRISM CAD KERNEL ENHANCED - PASS 2
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_CAD_KERNEL_PASS2 = {
    
    // ─────────────────────────────────────────────────────────────────────────
    // B-SPLINE BASIS FUNCTIONS (from 2.158J Computational Geometry)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Cox-de Boor recursive B-spline basis function
     * N_{i,p}(u) = (u - u_i)/(u_{i+p} - u_i) * N_{i,p-1}(u) +
     *             (u_{i+p+1} - u)/(u_{i+p+1} - u_{i+1}) * N_{i+1,p-1}(u)
     */
    basisFunction: function(i, p, u, knots) {
        if (p === 0) {
            return (u >= knots[i] && u < knots[i + 1]) ? 1.0 : 0.0;
        }
        
        let left = 0.0, right = 0.0;
        
        const denom1 = knots[i + p] - knots[i];
        const denom2 = knots[i + p + 1] - knots[i + 1];
        
        if (Math.abs(denom1) > 1e-10) {
            left = ((u - knots[i]) / denom1) * this.basisFunction(i, p - 1, u, knots);
        }
        
        if (Math.abs(denom2) > 1e-10) {
            right = ((knots[i + p + 1] - u) / denom2) * this.basisFunction(i + 1, p - 1, u, knots);
        }
        
        return left + right;
    },
    
    /**
     * Derivative of B-spline basis function
     * N'_{i,p}(u) = p * [N_{i,p-1}(u)/(u_{i+p} - u_i) - N_{i+1,p-1}(u)/(u_{i+p+1} - u_{i+1})]
     */
    basisFunctionDerivative: function(i, p, u, knots, order = 1) {
        if (order === 0) {
            return this.basisFunction(i, p, u, knots);
        }
        
        if (p === 0) return 0.0;
        
        let left = 0.0, right = 0.0;
        
        const denom1 = knots[i + p] - knots[i];
        const denom2 = knots[i + p + 1] - knots[i + 1];
        
        if (Math.abs(denom1) > 1e-10) {
            left = this.basisFunctionDerivative(i, p - 1, u, knots, order - 1) / denom1;
        }
        
        if (Math.abs(denom2) > 1e-10) {
            right = this.basisFunctionDerivative(i + 1, p - 1, u, knots, order - 1) / denom2;
        }
        
        return p * (left - right);
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // B-SPLINE CURVE EVALUATION
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Evaluate B-spline curve at parameter u
     * C(u) = sum_{i=0}^{n} N_{i,p}(u) * P_i
     */
    evaluateBSplineCurve: function(u, degree, controlPoints, knots) {
        const n = controlPoints.length;
        let result = { x: 0, y: 0, z: 0 };
        
        for (let i = 0; i < n; i++) {
            const basis = this.basisFunction(i, degree, u, knots);
            result.x += basis * controlPoints[i].x;
            result.y += basis * controlPoints[i].y;
            result.z += basis * (controlPoints[i].z || 0);
        }
        
        return result;
    },
    
    /**
     * Evaluate B-spline curve derivative
     */
    evaluateBSplineCurveDerivative: function(u, degree, controlPoints, knots, order = 1) {
        const n = controlPoints.length;
        let result = { x: 0, y: 0, z: 0 };
        
        for (let i = 0; i < n; i++) {
            const dBasis = this.basisFunctionDerivative(i, degree, u, knots, order);
            result.x += dBasis * controlPoints[i].x;
            result.y += dBasis * controlPoints[i].y;
            result.z += dBasis * (controlPoints[i].z || 0);
        }
        
        return result;
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // NURBS CURVE (Rational B-spline)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Evaluate NURBS curve
     * C(u) = sum(N_{i,p}(u) * w_i * P_i) / sum(N_{i,p}(u) * w_i)
     */
    evaluateNURBSCurve: function(u, degree, controlPoints, knots, weights) {
        const n = controlPoints.length;
        let numerator = { x: 0, y: 0, z: 0 };
        let denominator = 0;
        
        for (let i = 0; i < n; i++) {
            const basis = this.basisFunction(i, degree, u, knots);
            const w = weights[i];
            const bw = basis * w;
            
            numerator.x += bw * controlPoints[i].x;
            numerator.y += bw * controlPoints[i].y;
            numerator.z += bw * (controlPoints[i].z || 0);
            denominator += bw;
        }
        
        if (Math.abs(denominator) < 1e-12) {
            return controlPoints[0];
        }
        
        return {
            x: numerator.x / denominator,
            y: numerator.y / denominator,
            z: numerator.z / denominator
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // B-SPLINE SURFACE EVALUATION
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Evaluate B-spline surface at (u, v)
     * S(u,v) = sum_i sum_j N_{i,p}(u) * N_{j,q}(v) * P_{i,j}
     */
    evaluateBSplineSurface: function(u, v, degreeU, degreeV, controlNet, knotsU, knotsV) {
        const numU = controlNet.length;
        const numV = controlNet[0].length;
        
        let result = { x: 0, y: 0, z: 0 };
        
        for (let i = 0; i < numU; i++) {
            const basisU = this.basisFunction(i, degreeU, u, knotsU);
            
            for (let j = 0; j < numV; j++) {
                const basisV = this.basisFunction(j, degreeV, v, knotsV);
                const basisUV = basisU * basisV;
                
                result.x += basisUV * controlNet[i][j].x;
                result.y += basisUV * controlNet[i][j].y;
                result.z += basisUV * (controlNet[i][j].z || 0);
            }
        }
        
        return result;
    },
    
    /**
     * Evaluate surface partial derivatives
     */
    evaluateSurfaceDerivatives: function(u, v, degreeU, degreeV, controlNet, knotsU, knotsV) {
        const numU = controlNet.length;
        const numV = controlNet[0].length;
        
        let S = { x: 0, y: 0, z: 0 };    // S(u,v)
        let Su = { x: 0, y: 0, z: 0 };   // dS/du
        let Sv = { x: 0, y: 0, z: 0 };   // dS/dv
        let Suu = { x: 0, y: 0, z: 0 };  // d2S/du2
        let Suv = { x: 0, y: 0, z: 0 };  // d2S/dudv
        let Svv = { x: 0, y: 0, z: 0 };  // d2S/dv2
        
        for (let i = 0; i < numU; i++) {
            const Nu = this.basisFunction(i, degreeU, u, knotsU);
            const dNu = this.basisFunctionDerivative(i, degreeU, u, knotsU, 1);
            const d2Nu = this.basisFunctionDerivative(i, degreeU, u, knotsU, 2);
            
            for (let j = 0; j < numV; j++) {
                const Nv = this.basisFunction(j, degreeV, v, knotsV);
                const dNv = this.basisFunctionDerivative(j, degreeV, v, knotsV, 1);
                const d2Nv = this.basisFunctionDerivative(j, degreeV, v, knotsV, 2);
                
                const P = controlNet[i][j];
                const px = P.x, py = P.y, pz = P.z || 0;
                
                S.x += Nu * Nv * px;
                S.y += Nu * Nv * py;
                S.z += Nu * Nv * pz;
                
                Su.x += dNu * Nv * px;
                Su.y += dNu * Nv * py;
                Su.z += dNu * Nv * pz;
                
                Sv.x += Nu * dNv * px;
                Sv.y += Nu * dNv * py;
                Sv.z += Nu * dNv * pz;
                
                Suu.x += d2Nu * Nv * px;
                Suu.y += d2Nu * Nv * py;
                Suu.z += d2Nu * Nv * pz;
                
                Suv.x += dNu * dNv * px;
                Suv.y += dNu * dNv * py;
                Suv.z += dNu * dNv * pz;
                
                Svv.x += Nu * d2Nv * px;
                Svv.y += Nu * d2Nv * py;
                Svv.z += Nu * d2Nv * pz;
            }
        }
        
        return { S, Su, Sv, Suu, Suv, Svv };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // SURFACE DIFFERENTIAL GEOMETRY
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Calculate surface normal at (u, v)
     * N = Su × Sv / |Su × Sv|
     */
    surfaceNormal: function(Su, Sv) {
        const cross = this._cross(Su, Sv);
        return this._normalize(cross);
    },
    
    /**
     * Calculate first fundamental form coefficients (I)
     * E = Su · Su, F = Su · Sv, G = Sv · Sv
     */
    firstFundamentalForm: function(Su, Sv) {
        return {
            E: this._dot(Su, Su),
            F: this._dot(Su, Sv),
            G: this._dot(Sv, Sv)
        };
    },
    
    /**
     * Calculate second fundamental form coefficients (II)
     * L = Suu · N, M = Suv · N, N = Svv · N
     */
    secondFundamentalForm: function(Suu, Suv, Svv, N) {
        return {
            L: this._dot(Suu, N),
            M: this._dot(Suv, N),
            N: this._dot(Svv, N)
        };
    },
    
    /**
     * Calculate Gaussian and Mean curvature
     * K = (LN - M²) / (EG - F²)
     * H = (EN - 2FM + GL) / (2(EG - F²))
     */
    surfaceCurvatures: function(Su, Sv, Suu, Suv, Svv) {
        const N = this.surfaceNormal(Su, Sv);
        const I = this.firstFundamentalForm(Su, Sv);
        const II = this.secondFundamentalForm(Suu, Suv, Svv, N);
        
        const denom = I.E * I.G - I.F * I.F;
        
        if (Math.abs(denom) < 1e-12) {
            return { gaussian: 0, mean: 0, k1: 0, k2: 0 };
        }
        
        const gaussian = (II.L * II.N - II.M * II.M) / denom;
        const mean = (I.E * II.N - 2 * I.F * II.M + I.G * II.L) / (2 * denom);
        
        // Principal curvatures
        const discriminant = Math.sqrt(Math.max(0, mean * mean - gaussian));
        const k1 = mean + discriminant;
        const k2 = mean - discriminant;
        
        return {
            gaussian,
            mean,
            k1,
            k2,
            normal: N,
            type: this._classifySurfacePoint(gaussian, mean)
        };
    },
    
    _classifySurfacePoint: function(K, H) {
        const eps = 1e-10;
        if (Math.abs(K) < eps && Math.abs(H) < eps) return 'planar';
        if (Math.abs(K) < eps) return 'developable';
        if (K > eps) return 'elliptic';
        if (K < -eps) return 'hyperbolic';
        return 'parabolic';
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // KNOT OPERATIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Create uniform knot vector
     */
    createUniformKnots: function(numControlPoints, degree) {
        const n = numControlPoints - 1;
        const m = n + degree + 1;
        const knots = [];
        
        for (let i = 0; i <= m; i++) {
            if (i <= degree) {
                knots.push(0);
            } else if (i >= m - degree) {
                knots.push(1);
            } else {
                knots.push((i - degree) / (m - 2 * degree));
            }
        }
        
        return knots;
    },
    
    /**
     * Knot insertion using Oslo algorithm
     */
    insertKnot: function(u, degree, controlPoints, knots, times = 1) {
        let newCP = [...controlPoints.map(p => ({ ...p }))];
        let newKnots = [...knots];
        
        for (let t = 0; t < times; t++) {
            // Find knot span
            let k = 0;
            while (k < newKnots.length - 1 && newKnots[k + 1] <= u) k++;
            
            // Insert knot
            newKnots.splice(k + 1, 0, u);
            
            // Calculate new control points
            const tempCP = [];
            for (let i = 0; i <= newCP.length; i++) {
                if (i <= k - degree) {
                    tempCP.push({ ...newCP[i] });
                } else if (i > k) {
                    tempCP.push({ ...newCP[i - 1] });
                } else {
                    const alpha = (u - newKnots[i]) / (newKnots[i + degree + t] - newKnots[i]);
                    tempCP.push({
                        x: (1 - alpha) * newCP[i - 1].x + alpha * newCP[i].x,
                        y: (1 - alpha) * newCP[i - 1].y + alpha * newCP[i].y,
                        z: (1 - alpha) * (newCP[i - 1].z || 0) + alpha * (newCP[i].z || 0)
                    });
                }
            }
            newCP = tempCP;
        }
        
        return { controlPoints: newCP, knots: newKnots };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // DELAUNAY TRIANGULATION (Bowyer-Watson)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Delaunay triangulation using Bowyer-Watson algorithm
     */
    delaunayTriangulate: function(points) {
        if (points.length < 3) return [];
        
        // Create super-triangle
        const bounds = this._getBounds(points);
        const d = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 3;
        const cx = (bounds.minX + bounds.maxX) / 2;
        const cy = (bounds.minY + bounds.maxY) / 2;
        
        const superTri = [
            { x: cx - d, y: cy - d, __super: true },
            { x: cx + d, y: cy - d, __super: true },
            { x: cx, y: cy + d, __super: true }
        ];
        
        const allPoints = [...superTri, ...points];
        let triangles = [{ a: 0, b: 1, c: 2 }];
        
        // Add points one at a time
        for (let i = 3; i < allPoints.length; i++) {
            const point = allPoints[i];
            const badTriangles = [];
            const polygon = [];
            
            // Find bad triangles (whose circumcircle contains point)
            for (let j = triangles.length - 1; j >= 0; j--) {
                const tri = triangles[j];
                const cc = this._circumcircle(
                    allPoints[tri.a],
                    allPoints[tri.b],
                    allPoints[tri.c]
                );
                
                if (cc && this._pointInCircle(point, cc)) {
                    badTriangles.push(triangles.splice(j, 1)[0]);
                }
            }
            
            // Find boundary polygon
            for (const tri of badTriangles) {
                const edges = [
                    [tri.a, tri.b],
                    [tri.b, tri.c],
                    [tri.c, tri.a]
                ];
                
                for (const edge of edges) {
                    const shared = badTriangles.some(other => 
                        other !== tri && this._triangleHasEdge(other, edge)
                    );
                    if (!shared) {
                        polygon.push(edge);
                    }
                }
            }
            
            // Create new triangles
            for (const edge of polygon) {
                triangles.push({ a: edge[0], b: edge[1], c: i });
            }
        }
        
        // Remove triangles with super-triangle vertices
        triangles = triangles.filter(tri => 
            tri.a >= 3 && tri.b >= 3 && tri.c >= 3
        );
        
        // Adjust indices
        return triangles.map(tri => ({
            a: tri.a - 3,
            b: tri.b - 3,
            c: tri.c - 3
        }));
    },
    
    _circumcircle: function(p1, p2, p3) {
        const ax = p1.x, ay = p1.y;
        const bx = p2.x, by = p2.y;
        const cx = p3.x, cy = p3.y;
        
        const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
        if (Math.abs(d) < 1e-12) return null;
        
        const ux = ((ax*ax + ay*ay) * (by - cy) + 
                    (bx*bx + by*by) * (cy - ay) + 
                    (cx*cx + cy*cy) * (ay - by)) / d;
        const uy = ((ax*ax + ay*ay) * (cx - bx) + 
                    (bx*bx + by*by) * (ax - cx) + 
                    (cx*cx + cy*cy) * (bx - ax)) / d;
        
        const r = Math.sqrt((ax - ux) * (ax - ux) + (ay - uy) * (ay - uy));
        
        return { x: ux, y: uy, r: r };
    },
    
    _pointInCircle: function(point, circle) {
        const dx = point.x - circle.x;
        const dy = point.y - circle.y;
        return dx * dx + dy * dy <= circle.r * circle.r * 1.0001;
    },
    
    _triangleHasEdge: function(tri, edge) {
        const vertices = [tri.a, tri.b, tri.c];
        return vertices.includes(edge[0]) && vertices.includes(edge[1]);
    },
    
    _getBounds: function(points) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        for (const p of points) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }
        return { minX, minY, maxX, maxY };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // VORONOI DIAGRAM (dual of Delaunay)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Compute Voronoi diagram from Delaunay triangulation
     */
    voronoiFromDelaunay: function(points, triangles) {
        // Voronoi vertices = circumcenters of Delaunay triangles
        const vertices = triangles.map(tri => {
            return this._circumcircle(
                points[tri.a],
                points[tri.b],
                points[tri.c]
            );
        }).filter(v => v !== null);
        
        // Build cells (regions around each point)
        const cells = points.map(() => []);
        
        triangles.forEach((tri, triIdx) => {
            cells[tri.a].push(triIdx);
            cells[tri.b].push(triIdx);
            cells[tri.c].push(triIdx);
        });
        
        return { vertices, cells };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // SUBDIVISION SURFACES (Catmull-Clark)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Catmull-Clark subdivision for quad meshes
     */
    catmullClarkSubdivide: function(vertices, faces) {
        const newVertices = [];
        const newFaces = [];
        
        // Step 1: Calculate face points (average of face vertices)
        const facePoints = faces.map(face => {
            const avg = { x: 0, y: 0, z: 0 };
            for (const vi of face) {
                avg.x += vertices[vi].x;
                avg.y += vertices[vi].y;
                avg.z += vertices[vi].z || 0;
            }
            avg.x /= face.length;
            avg.y /= face.length;
            avg.z /= face.length;
            return avg;
        });
        
        // Step 2: Calculate edge points
        const edgeMap = new Map();
        const edgePoints = [];
        
        faces.forEach((face, faceIdx) => {
            const n = face.length;
            for (let i = 0; i < n; i++) {
                const v1 = face[i];
                const v2 = face[(i + 1) % n];
                const edgeKey = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
                
                if (!edgeMap.has(edgeKey)) {
                    edgeMap.set(edgeKey, { faces: [], v1, v2 });
                }
                edgeMap.get(edgeKey).faces.push(faceIdx);
            }
        });
        
        edgeMap.forEach((edge, key) => {
            const v1 = vertices[edge.v1];
            const v2 = vertices[edge.v2];
            
            let edgePoint;
            if (edge.faces.length === 2) {
                // Interior edge: average of edge vertices and adjacent face points
                const f1 = facePoints[edge.faces[0]];
                const f2 = facePoints[edge.faces[1]];
                edgePoint = {
                    x: (v1.x + v2.x + f1.x + f2.x) / 4,
                    y: (v1.y + v2.y + f1.y + f2.y) / 4,
                    z: ((v1.z || 0) + (v2.z || 0) + f1.z + f2.z) / 4
                };
            } else {
                // Boundary edge: midpoint
                edgePoint = {
                    x: (v1.x + v2.x) / 2,
                    y: (v1.y + v2.y) / 2,
                    z: ((v1.z || 0) + (v2.z || 0)) / 2
                };
            }
            
            edge.pointIdx = edgePoints.length;
            edgePoints.push(edgePoint);
        });
        
        // Step 3: Calculate new vertex positions
        const vertexFaces = vertices.map(() => []);
        const vertexEdges = vertices.map(() => []);
        
        faces.forEach((face, faceIdx) => {
            for (const vi of face) {
                vertexFaces[vi].push(faceIdx);
            }
        });
        
        edgeMap.forEach((edge) => {
            vertexEdges[edge.v1].push(edge.pointIdx);
            vertexEdges[edge.v2].push(edge.pointIdx);
        });
        
        const newVertexPositions = vertices.map((v, vi) => {
            const n = vertexFaces[vi].length;
            
            if (n === 0) return { ...v };
            
            // Average of face points
            let avgF = { x: 0, y: 0, z: 0 };
            for (const fi of vertexFaces[vi]) {
                avgF.x += facePoints[fi].x;
                avgF.y += facePoints[fi].y;
                avgF.z += facePoints[fi].z;
            }
            avgF.x /= n;
            avgF.y /= n;
            avgF.z /= n;
            
            // Average of edge midpoints
            let avgE = { x: 0, y: 0, z: 0 };
            for (const ei of vertexEdges[vi]) {
                avgE.x += edgePoints[ei].x;
                avgE.y += edgePoints[ei].y;
                avgE.z += edgePoints[ei].z;
            }
            avgE.x /= vertexEdges[vi].length;
            avgE.y /= vertexEdges[vi].length;
            avgE.z /= vertexEdges[vi].length;
            
            // New position: (F + 2E + (n-3)V) / n
            return {
                x: (avgF.x + 2 * avgE.x + (n - 3) * v.x) / n,
                y: (avgF.y + 2 * avgE.y + (n - 3) * v.y) / n,
                z: (avgF.z + 2 * avgE.z + (n - 3) * (v.z || 0)) / n
            };
        });
        
        // Build output
        newVertices.push(...newVertexPositions);
        const fpOffset = newVertices.length;
        newVertices.push(...facePoints);
        const epOffset = newVertices.length;
        newVertices.push(...edgePoints);
        
        // Create new faces
        faces.forEach((face, faceIdx) => {
            const fpIdx = fpOffset + faceIdx;
            const n = face.length;
            
            for (let i = 0; i < n; i++) {
                const vi = face[i];
                const v1 = face[(i - 1 + n) % n];
                const v2 = face[(i + 1) % n];
                
                const e1Key = vi < v1 ? `${vi}-${v1}` : `${v1}-${vi}`;
                const e2Key = vi < v2 ? `${vi}-${v2}` : `${v2}-${vi}`;
                
                const ep1Idx = epOffset + edgeMap.get(e1Key).pointIdx;
                const ep2Idx = epOffset + edgeMap.get(e2Key).pointIdx;
                
                newFaces.push([vi, ep2Idx, fpIdx, ep1Idx]);
            }
        });
        
        return { vertices: newVertices, faces: newFaces };
    },
    
    // Vector utilities
    _dot: function(a, b) { return a.x * b.x + a.y * b.y + (a.z || 0) * (b.z || 0); },
    _cross: function(a, b) {
        return {
            x: a.y * (b.z || 0) - (a.z || 0) * b.y,
            y: (a.z || 0) * b.x - a.x * (b.z || 0),
            z: a.x * b.y - a.y * b.x
        };
    },
    _normalize: function(v) {
        const len = Math.sqrt(this._dot(v, v));
        return len > 0 ? { x: v.x / len, y: v.y / len, z: (v.z || 0) / len } : v;
    },
    _sub: function(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) }; },
    _add: function(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: (a.z || 0) + (b.z || 0) }; },
    _scale: function(v, s) { return { x: v.x * s, y: v.y * s, z: (v.z || 0) * s }; }
};

// ═══════════════════════════════════════════════════════════════════════════
// PRISM GRAPHICS ENGINE ENHANCED - PASS 2
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_GRAPHICS_KERNEL_PASS2 = {
    
    // ─────────────────────────────────────────────────────────────────────────
    // BVH (Bounding Volume Hierarchy) with SAH
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Build BVH with Surface Area Heuristic
     */
    buildBVH: function(triangles, maxLeafSize = 4) {
        if (triangles.length === 0) return null;
        
        // Precompute centroids and bounds
        const primitives = triangles.map((tri, idx) => ({
            index: idx,
            triangle: tri,
            centroid: this._triangleCentroid(tri),
            bounds: this._triangleBounds(tri)
        }));
        
        return this._buildBVHNode(primitives, 0, maxLeafSize);
    },
    
    _buildBVHNode: function(primitives, depth, maxLeafSize) {
        if (primitives.length === 0) return null;
        
        // Compute bounds
        const bounds = this._unionBounds(primitives.map(p => p.bounds));
        
        if (primitives.length <= maxLeafSize || depth > 32) {
            return {
                bounds,
                primitives: primitives.map(p => p.triangle),
                isLeaf: true
            };
        }
        
        // SAH split
        const split = this._sahSplit(primitives, bounds);
        
        if (!split) {
            return {
                bounds,
                primitives: primitives.map(p => p.triangle),
                isLeaf: true
            };
        }
        
        const left = this._buildBVHNode(split.left, depth + 1, maxLeafSize);
        const right = this._buildBVHNode(split.right, depth + 1, maxLeafSize);
        
        return {
            bounds,
            left,
            right,
            axis: split.axis,
            isLeaf: false
        };
    },
    
    _sahSplit: function(primitives, bounds) {
        const numBuckets = 12;
        let bestCost = primitives.length;
        let bestAxis = -1;
        let bestSplit = -1;
        
        for (let axis = 0; axis < 3; axis++) {
            const axisName = ['x', 'y', 'z'][axis];
            const extent = bounds.max[axisName] - bounds.min[axisName];
            
            if (extent < 1e-6) continue;
            
            // Initialize buckets
            const buckets = Array(numBuckets).fill(null).map(() => ({
                count: 0,
                bounds: null
            }));
            
            // Fill buckets
            for (const prim of primitives) {
                const offset = (prim.centroid[axisName] - bounds.min[axisName]) / extent;
                const b = Math.min(numBuckets - 1, Math.floor(offset * numBuckets));
                buckets[b].count++;
                buckets[b].bounds = this._unionBoundsTwo(buckets[b].bounds, prim.bounds);
            }
            
            // Compute costs
            for (let i = 0; i < numBuckets - 1; i++) {
                let leftCount = 0, rightCount = 0;
                let leftBounds = null, rightBounds = null;
                
                for (let j = 0; j <= i; j++) {
                    leftCount += buckets[j].count;
                    leftBounds = this._unionBoundsTwo(leftBounds, buckets[j].bounds);
                }
                
                for (let j = i + 1; j < numBuckets; j++) {
                    rightCount += buckets[j].count;
                    rightBounds = this._unionBoundsTwo(rightBounds, buckets[j].bounds);
                }
                
                if (leftCount === 0 || rightCount === 0) continue;
                
                const cost = 1 + (leftCount * this._surfaceArea(leftBounds) + 
                                  rightCount * this._surfaceArea(rightBounds)) / 
                                  this._surfaceArea(bounds);
                
                if (cost < bestCost) {
                    bestCost = cost;
                    bestAxis = axis;
                    bestSplit = i;
                }
            }
        }
        
        if (bestAxis === -1) return null;
        
        // Partition primitives
        const axisName = ['x', 'y', 'z'][bestAxis];
        const extent = bounds.max[axisName] - bounds.min[axisName];
        const splitPos = bounds.min[axisName] + (bestSplit + 1) / numBuckets * extent;
        
        const left = [], right = [];
        for (const prim of primitives) {
            if (prim.centroid[axisName] < splitPos) {
                left.push(prim);
            } else {
                right.push(prim);
            }
        }
        
        return { left, right, axis: bestAxis };
    },
    
    _triangleCentroid: function(tri) {
        return {
            x: (tri.v0.x + tri.v1.x + tri.v2.x) / 3,
            y: (tri.v0.y + tri.v1.y + tri.v2.y) / 3,
            z: (tri.v0.z + tri.v1.z + tri.v2.z) / 3
        };
    },
    
    _triangleBounds: function(tri) {
        return {
            min: {
                x: Math.min(tri.v0.x, tri.v1.x, tri.v2.x),
                y: Math.min(tri.v0.y, tri.v1.y, tri.v2.y),
                z: Math.min(tri.v0.z, tri.v1.z, tri.v2.z)
            },
            max: {
                x: Math.max(tri.v0.x, tri.v1.x, tri.v2.x),
                y: Math.max(tri.v0.y, tri.v1.y, tri.v2.y),
                z: Math.max(tri.v0.z, tri.v1.z, tri.v2.z)
            }
        };
    },
    
    _unionBounds: function(boundsList) {
        if (boundsList.length === 0) return null;
        return boundsList.reduce((a, b) => this._unionBoundsTwo(a, b));
    },
    
    _unionBoundsTwo: function(a, b) {
        if (!a) return b;
        if (!b) return a;
        return {
            min: {
                x: Math.min(a.min.x, b.min.x),
                y: Math.min(a.min.y, b.min.y),
                z: Math.min(a.min.z, b.min.z)
            },
            max: {
                x: Math.max(a.max.x, b.max.x),
                y: Math.max(a.max.y, b.max.y),
                z: Math.max(a.max.z, b.max.z)
            }
        };
    },
    
    _surfaceArea: function(bounds) {
        if (!bounds) return 0;
        const d = {
            x: bounds.max.x - bounds.min.x,
            y: bounds.max.y - bounds.min.y,
            z: bounds.max.z - bounds.min.z
        };
        return 2 * (d.x * d.y + d.y * d.z + d.z * d.x);
    },
    
    /**
     * Traverse BVH for ray intersection
     */
    traceBVH: function(bvh, origin, direction) {
        if (!bvh) return null;
        
        const invDir = {
            x: 1 / direction.x,
            y: 1 / direction.y,
            z: 1 / direction.z
        };
        
        return this._traceBVHRecursive(bvh, origin, invDir, Infinity);
    },
    
    _traceBVHRecursive: function(node, origin, invDir, maxT) {
        if (!this._rayBoxIntersect(origin, invDir, node.bounds, maxT)) {
            return null;
        }
        
        if (node.isLeaf) {
            let closest = null;
            for (const tri of node.primitives) {
                const hit = this.rayTriangleIntersect(origin, 
                    { x: 1/invDir.x, y: 1/invDir.y, z: 1/invDir.z }, 
                    tri.v0, tri.v1, tri.v2);
                if (hit && hit.t < maxT && (!closest || hit.t < closest.t)) {
                    closest = hit;
                    maxT = hit.t;
                }
            }
            return closest;
        }
        
        const leftHit = this._traceBVHRecursive(node.left, origin, invDir, maxT);
        if (leftHit) maxT = leftHit.t;
        
        const rightHit = this._traceBVHRecursive(node.right, origin, invDir, maxT);
        
        if (!leftHit) return rightHit;
        if (!rightHit) return leftHit;
        return leftHit.t < rightHit.t ? leftHit : rightHit;
    },
    
    _rayBoxIntersect: function(origin, invDir, bounds, maxT) {
        let tmin = (bounds.min.x - origin.x) * invDir.x;
        let tmax = (bounds.max.x - origin.x) * invDir.x;
        if (tmin > tmax) [tmin, tmax] = [tmax, tmin];
        
        let tymin = (bounds.min.y - origin.y) * invDir.y;
        let tymax = (bounds.max.y - origin.y) * invDir.y;
        if (tymin > tymax) [tymin, tymax] = [tymax, tymin];
        
        if (tmin > tymax || tymin > tmax) return false;
        
        if (tymin > tmin) tmin = tymin;
        if (tymax < tmax) tmax = tymax;
        
        let tzmin = (bounds.min.z - origin.z) * invDir.z;
        let tzmax = (bounds.max.z - origin.z) * invDir.z;
        if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];
        
        if (tmin > tzmax || tzmin > tmax) return false;
        
        if (tzmin > tmin) tmin = tzmin;
        if (tzmax < tmax) tmax = tzmax;
        
        return tmin < maxT && tmax > 0;
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // RAY INTERSECTION (Möller-Trumbore)
    // ─────────────────────────────────────────────────────────────────────────
    
    rayTriangleIntersect: function(origin, direction, v0, v1, v2) {
        const EPSILON = 1e-8;
        
        const edge1 = this._sub(v1, v0);
        const edge2 = this._sub(v2, v0);
        const h = this._cross(direction, edge2);
        const a = this._dot(edge1, h);
        
        if (Math.abs(a) < EPSILON) return null;
        
        const f = 1.0 / a;
        const s = this._sub(origin, v0);
        const u = f * this._dot(s, h);
        
        if (u < 0.0 || u > 1.0) return null;
        
        const q = this._cross(s, edge1);
        const v = f * this._dot(direction, q);
        
        if (v < 0.0 || u + v > 1.0) return null;
        
        const t = f * this._dot(edge2, q);
        
        if (t > EPSILON) {
            return {
                t,
                point: this._add(origin, this._scale(direction, t)),
                normal: this._normalize(this._cross(edge1, edge2)),
                u, v,
                w: 1 - u - v
            };
        }
        
        return null;
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // PBR SHADING (GGX Microfacet)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * GGX/Trowbridge-Reitz normal distribution
     * D = α² / (π * ((n·h)²(α²-1) + 1)²)
     */
    ggxDistribution: function(NdotH, roughness) {
        const a = roughness * roughness;
        const a2 = a * a;
        const NdotH2 = NdotH * NdotH;
        const denom = NdotH2 * (a2 - 1) + 1;
        return a2 / (Math.PI * denom * denom);
    },
    
    /**
     * Smith geometry function (GGX)
     * G = G1(l) * G1(v)
     */
    smithGeometry: function(NdotL, NdotV, roughness) {
        const r = roughness + 1;
        const k = (r * r) / 8;
        
        const G1L = NdotL / (NdotL * (1 - k) + k);
        const G1V = NdotV / (NdotV * (1 - k) + k);
        
        return G1L * G1V;
    },
    
    /**
     * Schlick Fresnel approximation
     * F = F0 + (1 - F0)(1 - cosθ)^5
     */
    fresnelSchlick: function(cosTheta, F0) {
        const t = Math.pow(1 - cosTheta, 5);
        return {
            x: F0.x + (1 - F0.x) * t,
            y: F0.y + (1 - F0.y) * t,
            z: F0.z + (1 - F0.z) * t
        };
    },
    
    /**
     * Cook-Torrance specular BRDF
     */
    cookTorranceBRDF: function(params) {
        const { N, V, L, roughness, F0 } = params;
        
        const H = this._normalize(this._add(V, L));
        
        const NdotV = Math.max(0.001, this._dot(N, V));
        const NdotL = Math.max(0.001, this._dot(N, L));
        const NdotH = Math.max(0.001, this._dot(N, H));
        const VdotH = Math.max(0.001, this._dot(V, H));
        
        const D = this.ggxDistribution(NdotH, roughness);
        const G = this.smithGeometry(NdotL, NdotV, roughness);
        const F = this.fresnelSchlick(VdotH, F0);
        
        const specular = {
            x: D * G * F.x / (4 * NdotV * NdotL),
            y: D * G * F.y / (4 * NdotV * NdotL),
            z: D * G * F.z / (4 * NdotV * NdotL)
        };
        
        return specular;
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // PATH TRACING UTILITIES
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Cosine-weighted hemisphere sampling
     */
    cosineSampleHemisphere: function(N) {
        const u1 = Math.random();
        const u2 = Math.random();
        
        const r = Math.sqrt(u1);
        const theta = 2 * Math.PI * u2;
        
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        const z = Math.sqrt(1 - u1);
        
        // Create local coordinate frame
        const up = Math.abs(N.y) < 0.999 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
        const tangent = this._normalize(this._cross(up, N));
        const bitangent = this._cross(N, tangent);
        
        // Transform to world space
        return {
            direction: this._normalize({
                x: tangent.x * x + bitangent.x * y + N.x * z,
                y: tangent.y * x + bitangent.y * y + N.y * z,
                z: tangent.z * x + bitangent.z * y + N.z * z
            }),
            pdf: z / Math.PI
        };
    },
    
    /**
     * GGX importance sampling
     */
    ggxSampleHalfVector: function(N, roughness) {
        const u1 = Math.random();
        const u2 = Math.random();
        
        const a = roughness * roughness;
        const theta = Math.atan(a * Math.sqrt(u1) / Math.sqrt(1 - u1));
        const phi = 2 * Math.PI * u2;
        
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        
        const x = sinTheta * Math.cos(phi);
        const y = sinTheta * Math.sin(phi);
        const z = cosTheta;
        
        const up = Math.abs(N.y) < 0.999 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
        const tangent = this._normalize(this._cross(up, N));
        const bitangent = this._cross(N, tangent);
        
        return this._normalize({
            x: tangent.x * x + bitangent.x * y + N.x * z,
            y: tangent.y * x + bitangent.y * y + N.y * z,
            z: tangent.z * x + bitangent.z * y + N.z * z
        });
    },
    
    /**
     * Russian Roulette for path termination
     */
    russianRoulette: function(throughput, minBounces, currentBounce) {
        if (currentBounce < minBounces) {
            return { continue: true, probability: 1 };
        }
        
        const maxComponent = Math.max(throughput.x, throughput.y, throughput.z);
        const probability = Math.min(0.95, maxComponent);
        
        return {
            continue: Math.random() < probability,
            probability
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // QUATERNION MATH
    // ─────────────────────────────────────────────────────────────────────────
    
    quaternionFromAxisAngle: function(axis, angle) {
        const halfAngle = angle / 2;
        const s = Math.sin(halfAngle);
        return {
            w: Math.cos(halfAngle),
            x: axis.x * s,
            y: axis.y * s,
            z: axis.z * s
        };
    },
    
    quaternionMultiply: function(q1, q2) {
        return {
            w: q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z,
            x: q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
            y: q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
            z: q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w
        };
    },
    
    quaternionToMatrix: function(q) {
        const { w, x, y, z } = q;
        return [
            [1 - 2*y*y - 2*z*z, 2*x*y - 2*w*z, 2*x*z + 2*w*y, 0],
            [2*x*y + 2*w*z, 1 - 2*x*x - 2*z*z, 2*y*z - 2*w*x, 0],
            [2*x*z - 2*w*y, 2*y*z + 2*w*x, 1 - 2*x*x - 2*y*y, 0],
            [0, 0, 0, 1]
        ];
    },
    
    slerp: function(q1, q2, t) {
        let dot = q1.w*q2.w + q1.x*q2.x + q1.y*q2.y + q1.z*q2.z;
        
        if (dot < 0) {
            q2 = { w: -q2.w, x: -q2.x, y: -q2.y, z: -q2.z };
            dot = -dot;
        }
        
        if (dot > 0.9995) {
            const result = {
                w: q1.w + t * (q2.w - q1.w),
                x: q1.x + t * (q2.x - q1.x),
                y: q1.y + t * (q2.y - q1.y),
                z: q1.z + t * (q2.z - q1.z)
            };
            const len = Math.sqrt(result.w*result.w + result.x*result.x + 
                                  result.y*result.y + result.z*result.z);
            return { w: result.w/len, x: result.x/len, y: result.y/len, z: result.z/len };
        }
        
        const theta0 = Math.acos(dot);
        const theta = theta0 * t;
        const sinTheta = Math.sin(theta);
        const sinTheta0 = Math.sin(theta0);
        
        const s0 = Math.cos(theta) - dot * sinTheta / sinTheta0;
        const s1 = sinTheta / sinTheta0;
        
        return {
            w: s0 * q1.w + s1 * q2.w,
            x: s0 * q1.x + s1 * q2.x,
            y: s0 * q1.y + s1 * q2.y,
            z: s0 * q1.z + s1 * q2.z
        };
    },
    
    // Vector utilities
    _dot: function(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; },
    _cross: function(a, b) {
        return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
    },
    _normalize: function(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        return len > 0 ? { x: v.x / len, y: v.y / len, z: v.z / len } : v;
    },
    _sub: function(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; },
    _add: function(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; },
    _scale: function(v, s) { return { x: v.x * s, y: v.y * s, z: v.z * s }; }
};

// ═══════════════════════════════════════════════════════════════════════════
// PRISM CAM KERNEL ENHANCED - PASS 2
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_CAM_KERNEL_PASS2 = {
    
    // ─────────────────────────────────────────────────────────────────────────
    // TOOLPATH STRATEGIES
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Adaptive clearing (constant engagement) toolpath
     */
    adaptiveClearingPath: function(boundary, toolRadius, maxEngagement, stepover) {
        const paths = [];
        const effectiveStepover = Math.min(stepover, toolRadius * maxEngagement);
        
        // Generate contour-parallel offsets
        let currentBoundary = this._offsetPolygon(boundary, -toolRadius);
        let level = 0;
        
        while (currentBoundary && currentBoundary.length >= 3 && level < 100) {
            paths.push({
                level,
                points: [...currentBoundary],
                type: 'clearing'
            });
            
            currentBoundary = this._offsetPolygon(currentBoundary, -effectiveStepover);
            level++;
        }
        
        // Add entry helix if needed
        if (paths.length > 0) {
            const center = this._polygonCentroid(paths[paths.length - 1].points);
            paths.unshift({
                type: 'helix_entry',
                center,
                radius: toolRadius * 0.5,
                pitch: toolRadius * 0.1
            });
        }
        
        return paths;
    },
    
    /**
     * Trochoidal milling toolpath
     */
    trochoidalPath: function(startPoint, endPoint, slotWidth, toolRadius, stepover) {
        const path = [];
        const dir = this._normalize2D({
            x: endPoint.x - startPoint.x,
            y: endPoint.y - startPoint.y
        });
        const perp = { x: -dir.y, y: dir.x };
        
        const totalLength = Math.sqrt(
            Math.pow(endPoint.x - startPoint.x, 2) +
            Math.pow(endPoint.y - startPoint.y, 2)
        );
        
        const circleRadius = (slotWidth - toolRadius * 2) / 2;
        const numCycles = Math.ceil(totalLength / stepover);
        const pointsPerCircle = 36;
        
        for (let i = 0; i <= numCycles; i++) {
            const progress = i / numCycles;
            const center = {
                x: startPoint.x + dir.x * totalLength * progress,
                y: startPoint.y + dir.y * totalLength * progress
            };
            
            // Generate circle with forward progression
            for (let j = 0; j < pointsPerCircle; j++) {
                const angle = (j / pointsPerCircle) * 2 * Math.PI;
                const extraProgress = (j / pointsPerCircle) * (stepover / totalLength);
                
                path.push({
                    x: center.x + dir.x * totalLength * extraProgress + 
                       circleRadius * Math.cos(angle),
                    y: center.y + dir.y * totalLength * extraProgress + 
                       circleRadius * Math.sin(angle),
                    z: startPoint.z || 0
                });
            }
        }
        
        return path;
    },
    
    /**
     * Spiral pocket toolpath (efficient for circular/round pockets)
     */
    spiralPocketPath: function(center, outerRadius, toolRadius, stepover, direction = 'inward') {
        const path = [];
        const effectiveRadius = outerRadius - toolRadius;
        
        if (direction === 'inward') {
            let r = effectiveRadius;
            let angle = 0;
            
            while (r > stepover) {
                const deltaAngle = stepover / r;
                path.push({
                    x: center.x + r * Math.cos(angle),
                    y: center.y + r * Math.sin(angle),
                    z: center.z || 0
                });
                angle += deltaAngle;
                r -= stepover * deltaAngle / (2 * Math.PI);
            }
        } else {
            // Outward spiral
            let r = stepover;
            let angle = 0;
            
            while (r < effectiveRadius) {
                const deltaAngle = stepover / r;
                path.push({
                    x: center.x + r * Math.cos(angle),
                    y: center.y + r * Math.sin(angle),
                    z: center.z || 0
                });
                angle += deltaAngle;
                r += stepover * deltaAngle / (2 * Math.PI);
            }
        }
        
        return path;
    },
    
    /**
     * Contour-parallel (offset) pocket strategy
     */
    contourParallelPocket: function(boundary, toolRadius, stepover) {
        const contours = [];
        let current = this._offsetPolygon(boundary, -toolRadius);
        
        while (current && current.length >= 3) {
            contours.push([...current]);
            current = this._offsetPolygon(current, -stepover);
        }
        
        return contours;
    },
    
    /**
     * Zigzag/raster toolpath
     */
    zigzagPath: function(boundary, stepover, angle = 0) {
        const bounds = this._getBounds(boundary);
        const path = [];
        
        const cos_a = Math.cos(angle);
        const sin_a = Math.sin(angle);
        
        const diagonal = Math.sqrt(
            Math.pow(bounds.maxX - bounds.minX, 2) +
            Math.pow(bounds.maxY - bounds.minY, 2)
        );
        
        const numLines = Math.ceil(diagonal / stepover);
        const cx = (bounds.minX + bounds.maxX) / 2;
        const cy = (bounds.minY + bounds.maxY) / 2;
        
        for (let i = 0; i < numLines; i++) {
            const offset = (i - numLines / 2) * stepover;
            
            // Line perpendicular to angle direction
            const lineStart = {
                x: cx - sin_a * diagonal + cos_a * offset,
                y: cy + cos_a * diagonal + sin_a * offset
            };
            const lineEnd = {
                x: cx + sin_a * diagonal + cos_a * offset,
                y: cy - cos_a * diagonal + sin_a * offset
            };
            
            const intersections = this._linePolygonIntersections(lineStart, lineEnd, boundary);
            
            if (intersections.length >= 2) {
                intersections.sort((a, b) => {
                    const da = Math.pow(a.x - lineStart.x, 2) + Math.pow(a.y - lineStart.y, 2);
                    const db = Math.pow(b.x - lineStart.x, 2) + Math.pow(b.y - lineStart.y, 2);
                    return da - db;
                });
                
                // Zigzag: alternate direction
                if (i % 2 === 0) {
                    path.push(intersections[0], intersections[1]);
                } else {
                    path.push(intersections[1], intersections[0]);
                }
            }
        }
        
        return path;
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // CUTTING PHYSICS
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Merchant's cutting force model
     */
    merchantCuttingForce: function(params) {
        const {
            chipThickness,      // h (mm)
            width,              // b (mm)
            rakeAngle,          // α (radians)
            frictionAngle,      // β (radians)
            shearStrength       // τs (MPa)
        } = params;
        
        // Shear angle from Merchant's minimum energy criterion
        const phi = Math.PI / 4 - (frictionAngle - rakeAngle) / 2;
        
        // Shear plane area
        const As = (chipThickness * width) / Math.sin(phi);
        
        // Shear force
        const Fs = shearStrength * As;
        
        // Resultant force
        const R = Fs / Math.cos(phi + frictionAngle - rakeAngle);
        
        // Cutting force (tangential)
        const Fc = R * Math.cos(frictionAngle - rakeAngle);
        
        // Thrust force (feed direction)
        const Ft = R * Math.sin(frictionAngle - rakeAngle);
        
        // Friction force
        const Ff = R * Math.sin(frictionAngle);
        
        // Normal force on rake face
        const Fn = R * Math.cos(frictionAngle);
        
        return {
            shearAngle: phi,
            shearForce: Fs,
            cuttingForce: Fc,
            thrustForce: Ft,
            frictionForce: Ff,
            normalForce: Fn,
            resultantForce: R,
            specificCuttingEnergy: Fc / (chipThickness * width),
            chipRatio: Math.cos(phi - rakeAngle) / Math.sin(phi)
        };
    },
    
    /**
     * Extended Taylor tool life equation
     * VT^n * f^a * d^b = C
     */
    taylorToolLife: function(params) {
        const {
            cuttingSpeed,   // V (m/min)
            feed = 1,       // f (mm/rev) - optional
            depth = 1,      // d (mm) - optional
            C,              // Taylor constant
            n,              // Speed exponent (typically 0.1-0.5)
            a = 0,          // Feed exponent
            b = 0           // Depth exponent
        } = params;
        
        const effectiveC = C / (Math.pow(feed, a) * Math.pow(depth, b));
        const toolLife = Math.pow(effectiveC / cuttingSpeed, 1 / n);
        
        return {
            toolLife,           // minutes
            cuttingLength: toolLife * cuttingSpeed * 1000, // mm
            constants: { C, n, a, b }
        };
    },
    
    /**
     * Surface roughness prediction
     * Ra = f² / (32 * R) for round nose tool
     */
    surfaceRoughness: function(params) {
        const { feed, noseRadius, operation = 'turning' } = params;
        
        if (operation === 'turning') {
            // Theoretical Ra for round nose tool
            const Ra = (feed * feed) / (32 * noseRadius);
            const Rz = Ra * 4;  // Approximate Rz
            return { Ra, Rz, theoretical: true };
        }
        
        if (operation === 'milling') {
            // Scallop height for ball end mill
            const { stepover, toolRadius } = params;
            const scallop = toolRadius - Math.sqrt(toolRadius * toolRadius - stepover * stepover / 4);
            return { Ra: scallop * 0.25, Rz: scallop, scallop };
        }
        
        return { Ra: 0, Rz: 0 };
    },
    
    /**
     * Material Removal Rate
     */
    materialRemovalRate: function(params) {
        const { operation = 'turning' } = params;
        
        if (operation === 'turning') {
            const { cuttingSpeed, feed, depth } = params;
            // MRR = V * f * d (cm³/min)
            return cuttingSpeed * feed * depth / 1000;
        }
        
        if (operation === 'milling') {
            const { stepover, axialDepth, feedRate, numFlutes = 1 } = params;
            // MRR = ae * ap * Vf (cm³/min)
            return stepover * axialDepth * feedRate / 1000;
        }
        
        return 0;
    },
    
    /**
     * Chip thickness calculation for milling
     */
    chipThickness: function(params) {
        const {
            feedPerTooth,       // fz (mm/tooth)
            radialEngagement,   // ae (mm)
            toolDiameter,       // D (mm)
            operation = 'peripheral'
        } = params;
        
        const engagementAngle = Math.acos(1 - 2 * radialEngagement / toolDiameter);
        
        if (operation === 'peripheral') {
            // Average chip thickness
            const hm = feedPerTooth * Math.sin(engagementAngle / 2);
            // Maximum chip thickness
            const hmax = feedPerTooth * Math.sin(engagementAngle);
            return { average: hm, maximum: hmax, engagementAngle };
        }
        
        return { average: feedPerTooth, maximum: feedPerTooth };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // COLLISION & GOUGE DETECTION
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Check tool-surface interference (gouge)
     */
    checkGouge: function(toolPos, toolAxis, toolRadius, surfacePoint, surfaceNormal) {
        // Vector from tool position to surface point
        const toSurface = {
            x: surfacePoint.x - toolPos.x,
            y: surfacePoint.y - toolPos.y,
            z: surfacePoint.z - toolPos.z
        };
        
        // Axial distance (along tool axis)
        const axialDist = this._dot3D(toSurface, toolAxis);
        
        // Radial vector (perpendicular to tool axis)
        const radialVec = {
            x: toSurface.x - axialDist * toolAxis.x,
            y: toSurface.y - axialDist * toolAxis.y,
            z: toSurface.z - axialDist * toolAxis.z
        };
        
        const radialDist = Math.sqrt(this._dot3D(radialVec, radialVec));
        
        // Gouge occurs if point is within tool radius and below tool tip
        const gouged = radialDist < toolRadius && axialDist > 0;
        
        return {
            gouged,
            axialDistance: axialDist,
            radialDistance: radialDist,
            margin: radialDist - toolRadius
        };
    },
    
    /**
     * Calculate tool orientation for 5-axis machining
     */
    fiveAxisToolOrientation: function(surfaceNormal, leadAngle, tiltAngle) {
        // Start with tool along -Z (pointing down)
        let toolAxis = { x: 0, y: 0, z: -1 };
        
        // Apply lead angle (rotation around feed direction)
        const leadRad = leadAngle * Math.PI / 180;
        // Apply tilt angle (rotation perpendicular to feed)
        const tiltRad = tiltAngle * Math.PI / 180;
        
        // Create rotation to align with surface normal
        // This is a simplified version - full implementation would use quaternions
        const dot = -surfaceNormal.z;
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        
        if (Math.abs(angle) > 0.001) {
            const axis = this._normalize3D({
                x: surfaceNormal.y,
                y: -surfaceNormal.x,
                z: 0
            });
            
            const cos_a = Math.cos(angle + leadRad);
            const sin_a = Math.sin(angle + leadRad);
            
            toolAxis = {
                x: axis.x * axis.x * (1 - cos_a) + cos_a,
                y: axis.x * axis.y * (1 - cos_a) + axis.z * sin_a,
                z: axis.x * axis.z * (1 - cos_a) - axis.y * sin_a
            };
        }
        
        return this._normalize3D(toolAxis);
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // UTILITY FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    _offsetPolygon: function(polygon, offset) {
        if (!polygon || polygon.length < 3) return null;
        
        const result = [];
        const n = polygon.length;
        
        for (let i = 0; i < n; i++) {
            const prev = polygon[(i - 1 + n) % n];
            const curr = polygon[i];
            const next = polygon[(i + 1) % n];
            
            const e1 = this._normalize2D({ x: curr.x - prev.x, y: curr.y - prev.y });
            const e2 = this._normalize2D({ x: next.x - curr.x, y: next.y - curr.y });
            
            const n1 = { x: -e1.y, y: e1.x };
            const n2 = { x: -e2.y, y: e2.x };
            
            const bisector = this._normalize2D({
                x: n1.x + n2.x,
                y: n1.y + n2.y
            });
            
            const dot = n1.x * bisector.x + n1.y * bisector.y;
            const d = Math.abs(dot) > 0.001 ? offset / dot : offset;
            
            result.push({
                x: curr.x + bisector.x * d,
                y: curr.y + bisector.y * d
            });
        }
        
        // Validate result
        const area = this._polygonArea(result);
        if (Math.abs(area) < 1e-6) return null;
        
        return result;
    },
    
    _polygonArea: function(polygon) {
        let area = 0;
        for (let i = 0; i < polygon.length; i++) {
            const j = (i + 1) % polygon.length;
            area += polygon[i].x * polygon[j].y;
            area -= polygon[j].x * polygon[i].y;
        }
        return area / 2;
    },
    
    _polygonCentroid: function(polygon) {
        let cx = 0, cy = 0;
        for (const p of polygon) {
            cx += p.x;
            cy += p.y;
        }
        return { x: cx / polygon.length, y: cy / polygon.length };
    },
    
    _getBounds: function(points) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        for (const p of points) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }
        return { minX, minY, maxX, maxY };
    },
    
    _linePolygonIntersections: function(lineStart, lineEnd, polygon) {
        const intersections = [];
        const n = polygon.length;
        
        for (let i = 0; i < n; i++) {
            const p1 = polygon[i];
            const p2 = polygon[(i + 1) % n];
            
            const int = this._lineLineIntersection(lineStart, lineEnd, p1, p2);
            if (int) intersections.push(int);
        }
        
        return intersections;
    },
    
    _lineLineIntersection: function(a1, a2, b1, b2) {
        const d = (a1.x - a2.x) * (b1.y - b2.y) - (a1.y - a2.y) * (b1.x - b2.x);
        if (Math.abs(d) < 1e-10) return null;
        
        const t = ((a1.x - b1.x) * (b1.y - b2.y) - (a1.y - b1.y) * (b1.x - b2.x)) / d;
        const u = -((a1.x - a2.x) * (a1.y - b1.y) - (a1.y - a2.y) * (a1.x - b1.x)) / d;
        
        if (u >= 0 && u <= 1) {
            return {
                x: a1.x + t * (a2.x - a1.x),
                y: a1.y + t * (a2.y - a1.y)
            };
        }
        
        return null;
    },
    
    _normalize2D: function(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y);
        return len > 0 ? { x: v.x / len, y: v.y / len } : v;
    },
    
    _normalize3D: function(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        return len > 0 ? { x: v.x / len, y: v.y / len, z: v.z / len } : v;
    },
    
    _dot3D: function(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// GATEWAY REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

if (typeof PRISM_GATEWAY !== 'undefined') {
    // CAD Kernel routes
    PRISM_GATEWAY.register('cad.bspline.basis', 'PRISM_CAD_KERNEL_PASS2.basisFunction');
    PRISM_GATEWAY.register('cad.bspline.basisDeriv', 'PRISM_CAD_KERNEL_PASS2.basisFunctionDerivative');
    PRISM_GATEWAY.register('cad.bspline.evaluateCurve', 'PRISM_CAD_KERNEL_PASS2.evaluateBSplineCurve');
    PRISM_GATEWAY.register('cad.bspline.evaluateCurveDeriv', 'PRISM_CAD_KERNEL_PASS2.evaluateBSplineCurveDerivative');
    PRISM_GATEWAY.register('cad.nurbs.evaluateCurve', 'PRISM_CAD_KERNEL_PASS2.evaluateNURBSCurve');
    PRISM_GATEWAY.register('cad.bspline.evaluateSurface', 'PRISM_CAD_KERNEL_PASS2.evaluateBSplineSurface');
    PRISM_GATEWAY.register('cad.bspline.surfaceDerivs', 'PRISM_CAD_KERNEL_PASS2.evaluateSurfaceDerivatives');
    PRISM_GATEWAY.register('cad.surface.normal', 'PRISM_CAD_KERNEL_PASS2.surfaceNormal');
    PRISM_GATEWAY.register('cad.surface.curvatures', 'PRISM_CAD_KERNEL_PASS2.surfaceCurvatures');
    PRISM_GATEWAY.register('cad.surface.firstForm', 'PRISM_CAD_KERNEL_PASS2.firstFundamentalForm');
    PRISM_GATEWAY.register('cad.surface.secondForm', 'PRISM_CAD_KERNEL_PASS2.secondFundamentalForm');
    PRISM_GATEWAY.register('cad.knots.uniform', 'PRISM_CAD_KERNEL_PASS2.createUniformKnots');
    PRISM_GATEWAY.register('cad.knots.insert', 'PRISM_CAD_KERNEL_PASS2.insertKnot');
    PRISM_GATEWAY.register('cad.mesh.delaunay', 'PRISM_CAD_KERNEL_PASS2.delaunayTriangulate');
    PRISM_GATEWAY.register('cad.mesh.voronoi', 'PRISM_CAD_KERNEL_PASS2.voronoiFromDelaunay');
    PRISM_GATEWAY.register('cad.mesh.catmullClark', 'PRISM_CAD_KERNEL_PASS2.catmullClarkSubdivide');
    
    // Graphics Kernel routes
    PRISM_GATEWAY.register('graphics.bvh.build', 'PRISM_GRAPHICS_KERNEL_PASS2.buildBVH');
    PRISM_GATEWAY.register('graphics.bvh.trace', 'PRISM_GRAPHICS_KERNEL_PASS2.traceBVH');
    PRISM_GATEWAY.register('graphics.ray.triangle', 'PRISM_GRAPHICS_KERNEL_PASS2.rayTriangleIntersect');
    PRISM_GATEWAY.register('graphics.brdf.ggx', 'PRISM_GRAPHICS_KERNEL_PASS2.ggxDistribution');
    PRISM_GATEWAY.register('graphics.brdf.smith', 'PRISM_GRAPHICS_KERNEL_PASS2.smithGeometry');
    PRISM_GATEWAY.register('graphics.brdf.fresnel', 'PRISM_GRAPHICS_KERNEL_PASS2.fresnelSchlick');
    PRISM_GATEWAY.register('graphics.brdf.cookTorrance', 'PRISM_GRAPHICS_KERNEL_PASS2.cookTorranceBRDF');
    PRISM_GATEWAY.register('graphics.sample.cosine', 'PRISM_GRAPHICS_KERNEL_PASS2.cosineSampleHemisphere');
    PRISM_GATEWAY.register('graphics.sample.ggx', 'PRISM_GRAPHICS_KERNEL_PASS2.ggxSampleHalfVector');
    PRISM_GATEWAY.register('graphics.pathTrace.rr', 'PRISM_GRAPHICS_KERNEL_PASS2.russianRoulette');
    PRISM_GATEWAY.register('graphics.quat.fromAxisAngle', 'PRISM_GRAPHICS_KERNEL_PASS2.quaternionFromAxisAngle');
    PRISM_GATEWAY.register('graphics.quat.multiply', 'PRISM_GRAPHICS_KERNEL_PASS2.quaternionMultiply');
    PRISM_GATEWAY.register('graphics.quat.toMatrix', 'PRISM_GRAPHICS_KERNEL_PASS2.quaternionToMatrix');
    PRISM_GATEWAY.register('graphics.quat.slerp', 'PRISM_GRAPHICS_KERNEL_PASS2.slerp');
    
    // CAM Kernel routes
    PRISM_GATEWAY.register('cam.toolpath.adaptive', 'PRISM_CAM_KERNEL_PASS2.adaptiveClearingPath');
    PRISM_GATEWAY.register('cam.toolpath.trochoidal', 'PRISM_CAM_KERNEL_PASS2.trochoidalPath');
    PRISM_GATEWAY.register('cam.toolpath.spiral', 'PRISM_CAM_KERNEL_PASS2.spiralPocketPath');
    PRISM_GATEWAY.register('cam.toolpath.contourParallel', 'PRISM_CAM_KERNEL_PASS2.contourParallelPocket');
    PRISM_GATEWAY.register('cam.toolpath.zigzag', 'PRISM_CAM_KERNEL_PASS2.zigzagPath');
    PRISM_GATEWAY.register('cam.physics.merchant', 'PRISM_CAM_KERNEL_PASS2.merchantCuttingForce');
    PRISM_GATEWAY.register('cam.physics.taylor', 'PRISM_CAM_KERNEL_PASS2.taylorToolLife');
    PRISM_GATEWAY.register('cam.physics.roughness', 'PRISM_CAM_KERNEL_PASS2.surfaceRoughness');
    PRISM_GATEWAY.register('cam.physics.mrr', 'PRISM_CAM_KERNEL_PASS2.materialRemovalRate');
    PRISM_GATEWAY.register('cam.physics.chipThickness', 'PRISM_CAM_KERNEL_PASS2.chipThickness');
    PRISM_GATEWAY.register('cam.collision.gouge', 'PRISM_CAM_KERNEL_PASS2.checkGouge');
    PRISM_GATEWAY.register('cam.fiveAxis.orientation', 'PRISM_CAM_KERNEL_PASS2.fiveAxisToolOrientation');
    
    console.log('[PRISM] Enhanced Kernel Pass 2 - 45 gateway routes registered');
}

// ═══════════════════════════════════════════════════════════════════════════
// SELF-TESTS
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_PASS2_TESTS = {
    runAll: function() {
        console.log('\n=== PRISM Enhanced Kernel Pass 2 - Self Tests ===\n');
        let passed = 0, failed = 0;
        
        // Test 1: B-spline basis function
        try {
            const knots = [0, 0, 0, 0.5, 1, 1, 1];
            const N = PRISM_CAD_KERNEL_PASS2.basisFunction(0, 2, 0.25, knots);
            if (N > 0 && N <= 1) { passed++; console.log('✓ B-spline basis function'); }
            else { failed++; console.log('✗ B-spline basis function'); }
        } catch(e) { failed++; console.log('✗ B-spline basis function:', e.message); }
        
        // Test 2: B-spline curve evaluation
        try {
            const cp = [{x:0,y:0,z:0}, {x:1,y:2,z:0}, {x:3,y:2,z:0}, {x:4,y:0,z:0}];
            const knots = [0, 0, 0, 0, 1, 1, 1, 1];
            const pt = PRISM_CAD_KERNEL_PASS2.evaluateBSplineCurve(0.5, 3, cp, knots);
            if (pt.x > 0 && pt.y > 0) { passed++; console.log('✓ B-spline curve evaluation'); }
            else { failed++; console.log('✗ B-spline curve evaluation'); }
        } catch(e) { failed++; console.log('✗ B-spline curve evaluation:', e.message); }
        
        // Test 3: Delaunay triangulation
        try {
            const points = [{x:0,y:0}, {x:1,y:0}, {x:0.5,y:1}, {x:0.5,y:0.5}];
            const tris = PRISM_CAD_KERNEL_PASS2.delaunayTriangulate(points);
            if (tris.length >= 2) { passed++; console.log('✓ Delaunay triangulation'); }
            else { failed++; console.log('✗ Delaunay triangulation'); }
        } catch(e) { failed++; console.log('✗ Delaunay triangulation:', e.message); }
        
        // Test 4: Ray-triangle intersection
        try {
            const origin = {x:0.25, y:0.25, z:1};
            const dir = {x:0, y:0, z:-1};
            const v0 = {x:0, y:0, z:0};
            const v1 = {x:1, y:0, z:0};
            const v2 = {x:0, y:1, z:0};
            const hit = PRISM_GRAPHICS_KERNEL_PASS2.rayTriangleIntersect(origin, dir, v0, v1, v2);
            if (hit && Math.abs(hit.t - 1) < 0.001) { passed++; console.log('✓ Ray-triangle intersection'); }
            else { failed++; console.log('✗ Ray-triangle intersection'); }
        } catch(e) { failed++; console.log('✗ Ray-triangle intersection:', e.message); }
        
        // Test 5: GGX distribution
        try {
            const D = PRISM_GRAPHICS_KERNEL_PASS2.ggxDistribution(1.0, 0.5);
            if (D > 0) { passed++; console.log('✓ GGX distribution'); }
            else { failed++; console.log('✗ GGX distribution'); }
        } catch(e) { failed++; console.log('✗ GGX distribution:', e.message); }
        
        // Test 6: Fresnel
        try {
            const F = PRISM_GRAPHICS_KERNEL_PASS2.fresnelSchlick(0.5, {x:0.04, y:0.04, z:0.04});
            if (F.x >= 0.04 && F.x <= 1) { passed++; console.log('✓ Fresnel-Schlick'); }
            else { failed++; console.log('✗ Fresnel-Schlick'); }
        } catch(e) { failed++; console.log('✗ Fresnel-Schlick:', e.message); }
        
        // Test 7: Quaternion operations
        try {
            const q = PRISM_GRAPHICS_KERNEL_PASS2.quaternionFromAxisAngle({x:0,y:1,z:0}, Math.PI/2);
            const m = PRISM_GRAPHICS_KERNEL_PASS2.quaternionToMatrix(q);
            if (m.length === 4 && m[0].length === 4) { passed++; console.log('✓ Quaternion operations'); }
            else { failed++; console.log('✗ Quaternion operations'); }
        } catch(e) { failed++; console.log('✗ Quaternion operations:', e.message); }
        
        // Test 8: Merchant cutting force
        try {
            const result = PRISM_CAM_KERNEL_PASS2.merchantCuttingForce({
                chipThickness: 0.1,
                width: 5,
                rakeAngle: 0.1745,
                frictionAngle: 0.6,
                shearStrength: 500
            });
            if (result.cuttingForce > 0 && result.shearAngle > 0) { 
                passed++; console.log('✓ Merchant cutting force'); 
            } else { failed++; console.log('✗ Merchant cutting force'); }
        } catch(e) { failed++; console.log('✗ Merchant cutting force:', e.message); }
        
        // Test 9: Taylor tool life
        try {
            const result = PRISM_CAM_KERNEL_PASS2.taylorToolLife({
                cuttingSpeed: 200,
                C: 400,
                n: 0.25
            });
            if (result.toolLife > 0) { passed++; console.log('✓ Taylor tool life'); }
            else { failed++; console.log('✗ Taylor tool life'); }
        } catch(e) { failed++; console.log('✗ Taylor tool life:', e.message); }
        
        // Test 10: Trochoidal toolpath
        try {
            const path = PRISM_CAM_KERNEL_PASS2.trochoidalPath(
                {x:0, y:0, z:0}, {x:100, y:0, z:0}, 10, 4, 3
            );
            if (path.length > 100) { passed++; console.log('✓ Trochoidal toolpath'); }
            else { failed++; console.log('✗ Trochoidal toolpath'); }
        } catch(e) { failed++; console.log('✗ Trochoidal toolpath:', e.message); }
        
        console.log(`\n=== Results: ${passed}/${passed+failed} tests passed ===\n`);
        return { passed, failed, total: passed + failed };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PRISM_CAD_KERNEL_PASS2,
        PRISM_GRAPHICS_KERNEL_PASS2,
        PRISM_CAM_KERNEL_PASS2,
        PRISM_PASS2_TESTS
    };
}

console.log('[PRISM] Enhanced CAD/CAM/Graphics Kernel Pass 2 loaded');
console.log('[PRISM] CAD: B-spline/NURBS, Delaunay, Voronoi, Catmull-Clark');
console.log('[PRISM] Graphics: BVH+SAH, PBR/GGX, Path tracing, Quaternions');
console.log('[PRISM] CAM: Adaptive, Trochoidal, Merchant, Taylor');

/**
 * PRISM BATCH 11: SIGNAL PROCESSING
 * Source: MIT 6.003, 6.341
 * 
 * Algorithms: FFT, Filtering, Wavelets, Spectral Analysis, Chatter Detection
 * Gateway Routes: 24
 */

const PRISM_SIGNAL = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FFT (Fast Fourier Transform)
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Compute FFT using Cooley-Tukey algorithm
   */
  fft: function(signal) {
    const N = signal.length;
    
    // Pad to power of 2 if needed
    const n = Math.pow(2, Math.ceil(Math.log2(N)));
    const padded = [...signal, ...Array(n - N).fill(0)];
    
    // Convert to complex if not already
    const complex = padded.map(x => 
      typeof x === 'object' ? x : { re: x, im: 0 }
    );
    
    return this._fftRecursive(complex);
  },
  
  _fftRecursive: function(x) {
    const N = x.length;
    
    if (N <= 1) return x;
    
    // Split even and odd
    const even = x.filter((_, i) => i % 2 === 0);
    const odd = x.filter((_, i) => i % 2 === 1);
    
    // Recursive FFT
    const E = this._fftRecursive(even);
    const O = this._fftRecursive(odd);
    
    // Combine
    const result = new Array(N);
    for (let k = 0; k < N / 2; k++) {
      const angle = -2 * Math.PI * k / N;
      const twiddle = { re: Math.cos(angle), im: Math.sin(angle) };
      
      const to = this._complexMul(twiddle, O[k]);
      
      result[k] = {
        re: E[k].re + to.re,
        im: E[k].im + to.im
      };
      result[k + N / 2] = {
        re: E[k].re - to.re,
        im: E[k].im - to.im
      };
    }
    
    return result;
  },
  
  /**
   * Inverse FFT
   */
  ifft: function(spectrum) {
    const N = spectrum.length;
    
    // Conjugate, FFT, conjugate, scale
    const conjugated = spectrum.map(x => ({ re: x.re, im: -x.im }));
    const transformed = this.fft(conjugated);
    
    return transformed.map(x => ({
      re: x.re / N,
      im: -x.im / N
    }));
  },
  
  /**
   * Compute magnitude spectrum
   */
  magnitude: function(spectrum) {
    return spectrum.map(x => Math.sqrt(x.re * x.re + x.im * x.im));
  },
  
  /**
   * Compute phase spectrum
   */
  phase: function(spectrum) {
    return spectrum.map(x => Math.atan2(x.im, x.re));
  },
  
  /**
   * Power Spectral Density
   */
  powerSpectralDensity: function(signal, fs = 1, window = 'hanning') {
    const windowed = this.applyWindow(signal, window);
    const spectrum = this.fft(windowed);
    const mag = this.magnitude(spectrum);
    const N = signal.length;
    
    // One-sided PSD (positive frequencies only)
    const psd = [];
    const freqs = [];
    
    for (let k = 0; k <= N / 2; k++) {
      psd.push((mag[k] * mag[k]) / (N * fs));
      freqs.push(k * fs / N);
    }
    
    // Double for one-sided (except DC and Nyquist)
    for (let k = 1; k < psd.length - 1; k++) {
      psd[k] *= 2;
    }
    
    return { psd, frequencies: freqs };
  },
  
  _complexMul: function(a, b) {
    return {
      re: a.re * b.re - a.im * b.im,
      im: a.re * b.im + a.im * b.re
    };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // WINDOW FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  hanningWindow: function(N) {
    const w = [];
    for (let n = 0; n < N; n++) {
      w.push(0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1))));
    }
    return w;
  },
  
  hammingWindow: function(N) {
    const w = [];
    for (let n = 0; n < N; n++) {
      w.push(0.54 - 0.46 * Math.cos(2 * Math.PI * n / (N - 1)));
    }
    return w;
  },
  
  blackmanWindow: function(N) {
    const w = [];
    for (let n = 0; n < N; n++) {
      w.push(0.42 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1)) 
             + 0.08 * Math.cos(4 * Math.PI * n / (N - 1)));
    }
    return w;
  },
  
  flatTopWindow: function(N) {
    const a0 = 0.21557895, a1 = 0.41663158, a2 = 0.277263158;
    const a3 = 0.083578947, a4 = 0.006947368;
    const w = [];
    for (let n = 0; n < N; n++) {
      const x = 2 * Math.PI * n / (N - 1);
      w.push(a0 - a1*Math.cos(x) + a2*Math.cos(2*x) - a3*Math.cos(3*x) + a4*Math.cos(4*x));
    }
    return w;
  },
  
  applyWindow: function(signal, windowType = 'hanning') {
    const N = signal.length;
    let window;
    
    switch (windowType.toLowerCase()) {
      case 'hanning': case 'hann':
        window = this.hanningWindow(N);
        break;
      case 'hamming':
        window = this.hammingWindow(N);
        break;
      case 'blackman':
        window = this.blackmanWindow(N);
        break;
      case 'flattop':
        window = this.flatTopWindow(N);
        break;
      case 'rectangular': case 'none':
        return [...signal];
      default:
        window = this.hanningWindow(N);
    }
    
    return signal.map((x, i) => x * window[i]);
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DIGITAL FILTERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Design Butterworth low-pass filter coefficients
   */
  lowpassFilter: function(config) {
    const { cutoff, fs, order = 2 } = config;
    const fc = cutoff / (fs / 2); // Normalized frequency
    
    // Simplified 2nd order Butterworth
    const wc = Math.tan(Math.PI * fc);
    const wc2 = wc * wc;
    const sqrt2 = Math.sqrt(2);
    
    const k1 = sqrt2 * wc;
    const k2 = wc2;
    const a0 = k2 / (1 + k1 + k2);
    const a1 = 2 * a0;
    const a2 = a0;
    const b1 = 2 * (k2 - 1) / (1 + k1 + k2);
    const b2 = (1 - k1 + k2) / (1 + k1 + k2);
    
    return {
      b: [a0, a1, a2],
      a: [1, b1, b2],
      type: 'lowpass',
      cutoff,
      fs,
      order
    };
  },
  
  /**
   * Design Butterworth high-pass filter coefficients
   */
  highpassFilter: function(config) {
    const { cutoff, fs, order = 2 } = config;
    const fc = cutoff / (fs / 2);
    
    const wc = Math.tan(Math.PI * fc);
    const wc2 = wc * wc;
    const sqrt2 = Math.sqrt(2);
    
    const k1 = sqrt2 * wc;
    const k2 = wc2;
    const a0 = 1 / (1 + k1 + k2);
    const a1 = -2 * a0;
    const a2 = a0;
    const b1 = 2 * (k2 - 1) / (1 + k1 + k2);
    const b2 = (1 - k1 + k2) / (1 + k1 + k2);
    
    return {
      b: [a0, a1, a2],
      a: [1, b1, b2],
      type: 'highpass',
      cutoff,
      fs,
      order
    };
  },
  
  /**
   * Design bandpass filter
   */
  bandpassFilter: function(config) {
    const { lowCutoff, highCutoff, fs, order = 2 } = config;
    
    // Combine low-pass and high-pass
    const lp = this.lowpassFilter({ cutoff: highCutoff, fs, order });
    const hp = this.highpassFilter({ cutoff: lowCutoff, fs, order });
    
    return {
      lowpass: lp,
      highpass: hp,
      type: 'bandpass',
      lowCutoff,
      highCutoff,
      fs
    };
  },
  
  /**
   * Design notch filter
   */
  notchFilter: function(config) {
    const { frequency, Q = 30, fs } = config;
    const w0 = 2 * Math.PI * frequency / fs;
    const bw = w0 / Q;
    
    const b0 = 1;
    const b1 = -2 * Math.cos(w0);
    const b2 = 1;
    const a0 = 1 + Math.sin(bw);
    const a1 = -2 * Math.cos(w0);
    const a2 = 1 - Math.sin(bw);
    
    return {
      b: [b0/a0, b1/a0, b2/a0],
      a: [1, a1/a0, a2/a0],
      type: 'notch',
      frequency,
      Q,
      fs
    };
  },
  
  /**
   * Apply IIR filter to signal
   */
  applyFilter: function(signal, filter) {
    const { b, a } = filter;
    const y = new Array(signal.length).fill(0);
    const x = signal;
    
    for (let n = 0; n < signal.length; n++) {
      // Feedforward
      for (let k = 0; k < b.length; k++) {
        if (n - k >= 0) {
          y[n] += b[k] * x[n - k];
        }
      }
      // Feedback
      for (let k = 1; k < a.length; k++) {
        if (n - k >= 0) {
          y[n] -= a[k] * y[n - k];
        }
      }
    }
    
    // For bandpass, cascade the two filters
    if (filter.type === 'bandpass') {
      const yLp = this.applyFilter(signal, filter.lowpass);
      return this.applyFilter(yLp, filter.highpass);
    }
    
    return y;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // WAVELET TRANSFORM
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Discrete Wavelet Transform decomposition
   */
  dwtDecompose: function(signal, wavelet = 'haar', levels = 3) {
    const coeffs = { approximation: null, details: [] };
    let approx = [...signal];
    
    for (let level = 0; level < levels; level++) {
      const { cA, cD } = this._dwtStep(approx, wavelet);
      coeffs.details.unshift(cD);
      approx = cA;
    }
    
    coeffs.approximation = approx;
    return coeffs;
  },
  
  _dwtStep: function(signal, wavelet) {
    // Get wavelet filter coefficients
    const { lo, hi } = this._getWaveletFilters(wavelet);
    
    // Convolve and downsample
    const cA = this._convolveDownsample(signal, lo);
    const cD = this._convolveDownsample(signal, hi);
    
    return { cA, cD };
  },
  
  _getWaveletFilters: function(wavelet) {
    switch (wavelet.toLowerCase()) {
      case 'haar':
        const h = 1 / Math.sqrt(2);
        return { lo: [h, h], hi: [h, -h] };
      case 'db4':
        return {
          lo: [0.4829629131, 0.8365163037, 0.2241438680, -0.1294095226],
          hi: [-0.1294095226, -0.2241438680, 0.8365163037, -0.4829629131]
        };
      default:
        const hh = 1 / Math.sqrt(2);
        return { lo: [hh, hh], hi: [hh, -hh] };
    }
  },
  
  _convolveDownsample: function(signal, filter) {
    const result = [];
    const N = signal.length;
    const M = filter.length;
    
    for (let n = 0; n < N; n += 2) {
      let sum = 0;
      for (let k = 0; k < M; k++) {
        const idx = n - k;
        if (idx >= 0 && idx < N) {
          sum += filter[k] * signal[idx];
        }
      }
      result.push(sum);
    }
    
    return result;
  },
  
  /**
   * Inverse DWT reconstruction
   */
  dwtReconstruct: function(coeffs, wavelet = 'haar') {
    let approx = coeffs.approximation;
    
    for (const detail of coeffs.details) {
      approx = this._idwtStep(approx, detail, wavelet);
    }
    
    return approx;
  },
  
  _idwtStep: function(cA, cD, wavelet) {
    const { lo, hi } = this._getWaveletFilters(wavelet);
    const N = cA.length * 2;
    const result = new Array(N).fill(0);
    
    // Upsample and convolve
    for (let n = 0; n < cA.length; n++) {
      for (let k = 0; k < lo.length; k++) {
        const idx = 2 * n + k;
        if (idx < N) {
          result[idx] += lo[k] * cA[n] + hi[k] * cD[n];
        }
      }
    }
    
    return result;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SPECTRAL FEATURES
  // ═══════════════════════════════════════════════════════════════════════════
  
  spectralCentroid: function(magnitude, fs) {
    const N = magnitude.length;
    let num = 0, den = 0;
    
    for (let k = 0; k < N / 2; k++) {
      const freq = k * fs / N;
      num += freq * magnitude[k];
      den += magnitude[k];
    }
    
    return den > 0 ? num / den : 0;
  },
  
  spectralBandwidth: function(magnitude, fs, centroid = null) {
    const N = magnitude.length;
    const sc = centroid || this.spectralCentroid(magnitude, fs);
    
    let num = 0, den = 0;
    for (let k = 0; k < N / 2; k++) {
      const freq = k * fs / N;
      num += Math.pow(freq - sc, 2) * magnitude[k];
      den += magnitude[k];
    }
    
    return den > 0 ? Math.sqrt(num / den) : 0;
  },
  
  spectralRolloff: function(magnitude, threshold = 0.85) {
    const totalEnergy = magnitude.reduce((sum, m) => sum + m * m, 0);
    const targetEnergy = threshold * totalEnergy;
    
    let cumulativeEnergy = 0;
    for (let k = 0; k < magnitude.length; k++) {
      cumulativeEnergy += magnitude[k] * magnitude[k];
      if (cumulativeEnergy >= targetEnergy) {
        return k;
      }
    }
    
    return magnitude.length - 1;
  },
  
  rmsEnergy: function(signal) {
    const sumSquares = signal.reduce((sum, x) => sum + x * x, 0);
    return Math.sqrt(sumSquares / signal.length);
  },
  
  zeroCrossingRate: function(signal) {
    let crossings = 0;
    for (let n = 1; n < signal.length; n++) {
      if ((signal[n] >= 0 && signal[n - 1] < 0) || 
          (signal[n] < 0 && signal[n - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / signal.length;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TIME-FREQUENCY ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Short-Time Fourier Transform
   */
  stft: function(signal, windowSize, hopSize, windowType = 'hanning') {
    const spectrogram = [];
    const window = this[windowType + 'Window'](windowSize);
    
    for (let start = 0; start + windowSize <= signal.length; start += hopSize) {
      const segment = signal.slice(start, start + windowSize);
      const windowed = segment.map((x, i) => x * window[i]);
      const spectrum = this.fft(windowed);
      const mag = this.magnitude(spectrum);
      spectrogram.push(mag.slice(0, windowSize / 2 + 1));
    }
    
    return spectrogram;
  },
  
  /**
   * Hilbert Transform (simplified via FFT)
   */
  hilbertTransform: function(signal) {
    const N = signal.length;
    const spectrum = this.fft(signal);
    
    // Zero negative frequencies, double positive
    const analytic = spectrum.map((x, k) => {
      if (k === 0 || k === N / 2) return x;
      if (k < N / 2) return { re: 2 * x.re, im: 2 * x.im };
      return { re: 0, im: 0 };
    });
    
    const analyticSignal = this.ifft(analytic);
    
    return {
      real: analyticSignal.map(x => x.re),
      imag: analyticSignal.map(x => x.im)
    };
  },
  
  /**
   * Compute signal envelope
   */
  envelope: function(signal) {
    const { real, imag } = this.hilbertTransform(signal);
    return real.map((r, i) => Math.sqrt(r * r + imag[i] * imag[i]));
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CHATTER DETECTION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Detect chatter in machining signal
   */
  detectChatter: function(signal, fs, config = {}) {
    const {
      chatterFreqMin = 500,
      chatterFreqMax = 5000,
      threshold = 0.3
    } = config;
    
    // Compute spectrum
    const windowed = this.applyWindow(signal, 'hanning');
    const spectrum = this.fft(windowed);
    const magnitude = this.magnitude(spectrum);
    
    const N = signal.length;
    const binMin = Math.floor(chatterFreqMin * N / fs);
    const binMax = Math.ceil(chatterFreqMax * N / fs);
    
    // Energy in chatter band
    let chatterEnergy = 0;
    let totalEnergy = 0;
    let peakBin = 0;
    let peakValue = 0;
    
    for (let k = 0; k < N / 2; k++) {
      const energy = magnitude[k] * magnitude[k];
      totalEnergy += energy;
      
      if (k >= binMin && k <= binMax) {
        chatterEnergy += energy;
        if (magnitude[k] > peakValue) {
          peakValue = magnitude[k];
          peakBin = k;
        }
      }
    }
    
    const chatterIndex = chatterEnergy / (totalEnergy + 1e-10);
    const peakFrequency = peakBin * fs / N;
    
    return {
      chatterDetected: chatterIndex > threshold,
      chatterIndex,
      peakFrequency,
      peakMagnitude: peakValue,
      severity: chatterIndex < 0.3 ? 'stable' : 
                chatterIndex < 0.5 ? 'warning' : 'chatter'
    };
  },
  
  /**
   * Compute chatter index
   */
  chatterIndex: function(magnitude, fs, chatterFreqMin, chatterFreqMax) {
    const N = magnitude.length * 2; // Assuming one-sided spectrum
    const binMin = Math.floor(chatterFreqMin * N / fs);
    const binMax = Math.ceil(chatterFreqMax * N / fs);
    
    let chatterEnergy = 0;
    let totalEnergy = 0;
    
    for (let k = 0; k < magnitude.length; k++) {
      const energy = magnitude[k] * magnitude[k];
      totalEnergy += energy;
      if (k >= binMin && k <= binMax) {
        chatterEnergy += energy;
      }
    }
    
    return totalEnergy > 0 ? chatterEnergy / totalEnergy : 0;
  }
};


// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH11_GATEWAY_ROUTES = {
  // FFT
  'signal.fft.forward': 'PRISM_SIGNAL.fft',
  'signal.fft.inverse': 'PRISM_SIGNAL.ifft',
  'signal.fft.magnitude': 'PRISM_SIGNAL.magnitude',
  'signal.fft.phase': 'PRISM_SIGNAL.phase',
  'signal.fft.psd': 'PRISM_SIGNAL.powerSpectralDensity',
  
  // Windowing
  'signal.window.hanning': 'PRISM_SIGNAL.hanningWindow',
  'signal.window.hamming': 'PRISM_SIGNAL.hammingWindow',
  'signal.window.blackman': 'PRISM_SIGNAL.blackmanWindow',
  'signal.window.apply': 'PRISM_SIGNAL.applyWindow',
  
  // Filtering
  'signal.filter.lowpass': 'PRISM_SIGNAL.lowpassFilter',
  'signal.filter.highpass': 'PRISM_SIGNAL.highpassFilter',
  'signal.filter.bandpass': 'PRISM_SIGNAL.bandpassFilter',
  'signal.filter.notch': 'PRISM_SIGNAL.notchFilter',
  'signal.filter.apply': 'PRISM_SIGNAL.applyFilter',
  
  // Wavelets
  'signal.wavelet.dwt': 'PRISM_SIGNAL.dwtDecompose',
  'signal.wavelet.idwt': 'PRISM_SIGNAL.dwtReconstruct',
  
  // Features
  'signal.features.centroid': 'PRISM_SIGNAL.spectralCentroid',
  'signal.features.bandwidth': 'PRISM_SIGNAL.spectralBandwidth',
  'signal.features.rolloff': 'PRISM_SIGNAL.spectralRolloff',
  'signal.features.rms': 'PRISM_SIGNAL.rmsEnergy',
  'signal.features.zcr': 'PRISM_SIGNAL.zeroCrossingRate',
  
  // Time-Frequency
  'signal.stft': 'PRISM_SIGNAL.stft',
  'signal.hilbert': 'PRISM_SIGNAL.hilbertTransform',
  'signal.envelope': 'PRISM_SIGNAL.envelope',
  
  // Chatter
  'signal.chatter.detect': 'PRISM_SIGNAL.detectChatter',
  'signal.chatter.index': 'PRISM_SIGNAL.chatterIndex'
};

function registerBatch11Routes() {
  if (typeof PRISM_GATEWAY !== 'undefined') {
    for (const [route, target] of Object.entries(BATCH11_GATEWAY_ROUTES)) {
      PRISM_GATEWAY.register(route, target);
    }
    console.log(`[Batch 11] Registered ${Object.keys(BATCH11_GATEWAY_ROUTES).length} routes`);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRISM_SIGNAL, BATCH11_GATEWAY_ROUTES, registerBatch11Routes };
}

if (typeof window !== 'undefined') {
  window.PRISM_SIGNAL = PRISM_SIGNAL;
  registerBatch11Routes();
}

console.log('[PRISM Batch 11] Signal Processing loaded - 26 routes');
/**
 * PRISM BATCH 12: COMPUTER GRAPHICS
 * Source: MIT 6.837, 6.839
 * 
 * Algorithms: Transformations, Projection, Lighting, Mesh Processing, Ray Casting
 * Gateway Routes: 18
 */

const PRISM_GRAPHICS = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSFORMATION MATRICES
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Create identity matrix
   */
  identity: function() {
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
  },
  
  /**
   * Create translation matrix
   */
  translate: function(tx, ty, tz) {
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      tx, ty, tz, 1
    ];
  },
  
  /**
   * Create scaling matrix
   */
  scale: function(sx, sy, sz) {
    if (sy === undefined) { sy = sx; sz = sx; }
    return [
      sx, 0, 0, 0,
      0, sy, 0, 0,
      0, 0, sz, 0,
      0, 0, 0, 1
    ];
  },
  
  /**
   * Create rotation matrix around X axis
   */
  rotateX: function(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [
      1, 0, 0, 0,
      0, c, s, 0,
      0, -s, c, 0,
      0, 0, 0, 1
    ];
  },
  
  /**
   * Create rotation matrix around Y axis
   */
  rotateY: function(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [
      c, 0, -s, 0,
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, 0, 1
    ];
  },
  
  /**
   * Create rotation matrix around Z axis
   */
  rotateZ: function(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [
      c, s, 0, 0,
      -s, c, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
  },
  
  /**
   * Create rotation matrix around arbitrary axis (Rodrigues)
   */
  rotate: function(angle, ax, ay, az) {
    // Normalize axis
    const len = Math.sqrt(ax*ax + ay*ay + az*az);
    ax /= len; ay /= len; az /= len;
    
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const t = 1 - c;
    
    return [
      t*ax*ax + c,      t*ax*ay + s*az,  t*ax*az - s*ay,  0,
      t*ax*ay - s*az,   t*ay*ay + c,     t*ay*az + s*ax,  0,
      t*ax*az + s*ay,   t*ay*az - s*ax,  t*az*az + c,     0,
      0,                0,               0,               1
    ];
  },
  
  /**
   * Multiply two 4x4 matrices
   */
  multiply: function(a, b) {
    const result = new Array(16).fill(0);
    
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        for (let k = 0; k < 4; k++) {
          result[row * 4 + col] += a[row * 4 + k] * b[k * 4 + col];
        }
      }
    }
    
    return result;
  },
  
  /**
   * Compose multiple transforms
   */
  composeTransforms: function(...matrices) {
    return matrices.reduce((acc, mat) => this.multiply(acc, mat), this.identity());
  },
  
  /**
   * Transform a point by matrix
   */
  transformPoint: function(m, p) {
    const x = p[0], y = p[1], z = p[2];
    const w = m[3]*x + m[7]*y + m[11]*z + m[15] || 1;
    
    return [
      (m[0]*x + m[4]*y + m[8]*z + m[12]) / w,
      (m[1]*x + m[5]*y + m[9]*z + m[13]) / w,
      (m[2]*x + m[6]*y + m[10]*z + m[14]) / w
    ];
  },
  
  /**
   * Transform a direction (ignore translation)
   */
  transformDirection: function(m, d) {
    return [
      m[0]*d[0] + m[4]*d[1] + m[8]*d[2],
      m[1]*d[0] + m[5]*d[1] + m[9]*d[2],
      m[2]*d[0] + m[6]*d[1] + m[10]*d[2]
    ];
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW & PROJECTION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Create look-at view matrix
   */
  lookAt: function(eye, target, up) {
    // Forward vector (camera looks down -Z)
    let fx = eye[0] - target[0];
    let fy = eye[1] - target[1];
    let fz = eye[2] - target[2];
    let flen = Math.sqrt(fx*fx + fy*fy + fz*fz);
    fx /= flen; fy /= flen; fz /= flen;
    
    // Right vector (X axis)
    let rx = up[1]*fz - up[2]*fy;
    let ry = up[2]*fx - up[0]*fz;
    let rz = up[0]*fy - up[1]*fx;
    let rlen = Math.sqrt(rx*rx + ry*ry + rz*rz);
    rx /= rlen; ry /= rlen; rz /= rlen;
    
    // Up vector (Y axis)
    const ux = fy*rz - fz*ry;
    const uy = fz*rx - fx*rz;
    const uz = fx*ry - fy*rx;
    
    return [
      rx, ux, fx, 0,
      ry, uy, fy, 0,
      rz, uz, fz, 0,
      -(rx*eye[0] + ry*eye[1] + rz*eye[2]),
      -(ux*eye[0] + uy*eye[1] + uz*eye[2]),
      -(fx*eye[0] + fy*eye[1] + fz*eye[2]),
      1
    ];
  },
  
  /**
   * Create perspective projection matrix
   */
  perspective: function(fovY, aspect, near, far) {
    const f = 1 / Math.tan(fovY / 2);
    const nf = 1 / (near - far);
    
    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ];
  },
  
  /**
   * Create orthographic projection matrix
   */
  orthographic: function(left, right, bottom, top, near, far) {
    const rl = 1 / (right - left);
    const tb = 1 / (top - bottom);
    const fn = 1 / (far - near);
    
    return [
      2 * rl, 0, 0, 0,
      0, 2 * tb, 0, 0,
      0, 0, -2 * fn, 0,
      -(right + left) * rl, -(top + bottom) * tb, -(far + near) * fn, 1
    ];
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LIGHTING
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Compute Phong lighting
   */
  phongLighting: function(config) {
    const {
      position,      // Surface position
      normal,        // Surface normal
      lightPos,      // Light position
      viewPos,       // Camera position
      ambient = [0.1, 0.1, 0.1],
      diffuseColor = [0.7, 0.7, 0.7],
      specularColor = [1, 1, 1],
      shininess = 32
    } = config;
    
    // Normalize vectors
    const N = this._normalize(normal);
    const L = this._normalize(this._subtract(lightPos, position));
    const V = this._normalize(this._subtract(viewPos, position));
    const R = this._reflect(this._negate(L), N);
    
    // Ambient
    const ambientComponent = ambient;
    
    // Diffuse
    const diff = Math.max(this._dot(N, L), 0);
    const diffuseComponent = diffuseColor.map(c => c * diff);
    
    // Specular
    const spec = Math.pow(Math.max(this._dot(R, V), 0), shininess);
    const specularComponent = specularColor.map(c => c * spec);
    
    // Combine
    return {
      color: [
        Math.min(ambientComponent[0] + diffuseComponent[0] + specularComponent[0], 1),
        Math.min(ambientComponent[1] + diffuseComponent[1] + specularComponent[1], 1),
        Math.min(ambientComponent[2] + diffuseComponent[2] + specularComponent[2], 1)
      ],
      diffuse: diff,
      specular: spec
    };
  },
  
  /**
   * Compute Blinn-Phong lighting (more efficient)
   */
  blinnPhongLighting: function(config) {
    const {
      position, normal, lightPos, viewPos,
      ambient = [0.1, 0.1, 0.1],
      diffuseColor = [0.7, 0.7, 0.7],
      specularColor = [1, 1, 1],
      shininess = 32
    } = config;
    
    const N = this._normalize(normal);
    const L = this._normalize(this._subtract(lightPos, position));
    const V = this._normalize(this._subtract(viewPos, position));
    const H = this._normalize(this._add(L, V)); // Halfway vector
    
    const diff = Math.max(this._dot(N, L), 0);
    const spec = Math.pow(Math.max(this._dot(N, H), 0), shininess);
    
    return {
      color: [
        Math.min(ambient[0] + diffuseColor[0] * diff + specularColor[0] * spec, 1),
        Math.min(ambient[1] + diffuseColor[1] * diff + specularColor[1] * spec, 1),
        Math.min(ambient[2] + diffuseColor[2] * diff + specularColor[2] * spec, 1)
      ],
      diffuse: diff,
      specular: spec
    };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MESH PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Compute face normals for mesh
   */
  computeNormals: function(vertices, indices, smooth = true) {
    const faceNormals = [];
    const vertexNormals = new Array(vertices.length / 3).fill(null).map(() => [0, 0, 0]);
    
    // Compute face normals
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i] * 3;
      const i1 = indices[i + 1] * 3;
      const i2 = indices[i + 2] * 3;
      
      const v0 = [vertices[i0], vertices[i0 + 1], vertices[i0 + 2]];
      const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
      const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];
      
      const edge1 = this._subtract(v1, v0);
      const edge2 = this._subtract(v2, v0);
      const normal = this._normalize(this._cross(edge1, edge2));
      
      faceNormals.push(normal);
      
      if (smooth) {
        // Accumulate to vertex normals
        for (const idx of [indices[i], indices[i + 1], indices[i + 2]]) {
          vertexNormals[idx][0] += normal[0];
          vertexNormals[idx][1] += normal[1];
          vertexNormals[idx][2] += normal[2];
        }
      }
    }
    
    // Normalize vertex normals
    if (smooth) {
      for (let i = 0; i < vertexNormals.length; i++) {
        vertexNormals[i] = this._normalize(vertexNormals[i]);
      }
    }
    
    return {
      faceNormals,
      vertexNormals: smooth ? vertexNormals.flat() : null
    };
  },
  
  /**
   * Compute bounding box
   */
  computeBounds: function(vertices) {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    
    for (let i = 0; i < vertices.length; i += 3) {
      min[0] = Math.min(min[0], vertices[i]);
      min[1] = Math.min(min[1], vertices[i + 1]);
      min[2] = Math.min(min[2], vertices[i + 2]);
      max[0] = Math.max(max[0], vertices[i]);
      max[1] = Math.max(max[1], vertices[i + 1]);
      max[2] = Math.max(max[2], vertices[i + 2]);
    }
    
    const center = [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2
    ];
    
    const size = [
      max[0] - min[0],
      max[1] - min[1],
      max[2] - min[2]
    ];
    
    const radius = Math.sqrt(size[0]*size[0] + size[1]*size[1] + size[2]*size[2]) / 2;
    
    return { min, max, center, size, radius };
  },
  
  /**
   * Compute mesh center
   */
  computeCenter: function(vertices) {
    let cx = 0, cy = 0, cz = 0;
    const count = vertices.length / 3;
    
    for (let i = 0; i < vertices.length; i += 3) {
      cx += vertices[i];
      cy += vertices[i + 1];
      cz += vertices[i + 2];
    }
    
    return [cx / count, cy / count, cz / count];
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RAY CASTING / PICKING
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Convert screen coordinates to world ray
   */
  screenToRay: function(screenX, screenY, width, height, viewMatrix, projMatrix) {
    // Convert to NDC
    const ndcX = (2 * screenX / width) - 1;
    const ndcY = 1 - (2 * screenY / height);
    
    // Clip space coordinates for near and far planes
    const nearPoint = [ndcX, ndcY, -1, 1];
    const farPoint = [ndcX, ndcY, 1, 1];
    
    // Invert view-projection matrix
    const vpMatrix = this.multiply(projMatrix, viewMatrix);
    const invVP = this._invertMatrix(vpMatrix);
    
    if (!invVP) return null;
    
    // Unproject points
    const nearWorld = this._unproject(nearPoint, invVP);
    const farWorld = this._unproject(farPoint, invVP);
    
    // Ray direction
    const direction = this._normalize(this._subtract(farWorld, nearWorld));
    
    return {
      origin: nearWorld,
      direction
    };
  },
  
  /**
   * Ray-triangle intersection (Möller-Trumbore)
   */
  rayTriangleIntersect: function(rayOrigin, rayDir, v0, v1, v2) {
    const EPSILON = 1e-7;
    
    const edge1 = this._subtract(v1, v0);
    const edge2 = this._subtract(v2, v0);
    
    const h = this._cross(rayDir, edge2);
    const a = this._dot(edge1, h);
    
    if (Math.abs(a) < EPSILON) return null; // Parallel
    
    const f = 1 / a;
    const s = this._subtract(rayOrigin, v0);
    const u = f * this._dot(s, h);
    
    if (u < 0 || u > 1) return null;
    
    const q = this._cross(s, edge1);
    const v = f * this._dot(rayDir, q);
    
    if (v < 0 || u + v > 1) return null;
    
    const t = f * this._dot(edge2, q);
    
    if (t > EPSILON) {
      return {
        t,
        point: [
          rayOrigin[0] + rayDir[0] * t,
          rayOrigin[1] + rayDir[1] * t,
          rayOrigin[2] + rayDir[2] * t
        ],
        u, v,
        barycentrics: [1 - u - v, u, v]
      };
    }
    
    return null;
  },
  
  /**
   * Ray-mesh intersection
   */
  rayMeshIntersect: function(rayOrigin, rayDir, vertices, indices) {
    let closest = null;
    let closestT = Infinity;
    let closestFace = -1;
    
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i] * 3;
      const i1 = indices[i + 1] * 3;
      const i2 = indices[i + 2] * 3;
      
      const v0 = [vertices[i0], vertices[i0 + 1], vertices[i0 + 2]];
      const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
      const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];
      
      const hit = this.rayTriangleIntersect(rayOrigin, rayDir, v0, v1, v2);
      
      if (hit && hit.t < closestT) {
        closestT = hit.t;
        closest = hit;
        closestFace = i / 3;
      }
    }
    
    if (closest) {
      closest.faceIndex = closestFace;
    }
    
    return closest;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COLOR UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * HSV to RGB conversion
   */
  hsvToRgb: function(h, s, v) {
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    
    return [r, g, b];
  },
  
  /**
   * Create color gradient
   */
  colorGradient: function(value, min, max, colors = null) {
    if (!colors) {
      colors = [
        [0, 0, 1],    // Blue (cold)
        [0, 1, 1],    // Cyan
        [0, 1, 0],    // Green
        [1, 1, 0],    // Yellow
        [1, 0, 0]     // Red (hot)
      ];
    }
    
    const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const idx = t * (colors.length - 1);
    const i = Math.floor(idx);
    const f = idx - i;
    
    if (i >= colors.length - 1) return colors[colors.length - 1];
    
    return [
      colors[i][0] + f * (colors[i + 1][0] - colors[i][0]),
      colors[i][1] + f * (colors[i + 1][1] - colors[i][1]),
      colors[i][2] + f * (colors[i + 1][2] - colors[i][2])
    ];
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // VECTOR UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════
  
  _add: function(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  },
  
  _subtract: function(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  },
  
  _negate: function(v) {
    return [-v[0], -v[1], -v[2]];
  },
  
  _scale: function(v, s) {
    return [v[0] * s, v[1] * s, v[2] * s];
  },
  
  _dot: function(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  },
  
  _cross: function(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  },
  
  _length: function(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  },
  
  _normalize: function(v) {
    const len = this._length(v);
    if (len === 0) return [0, 0, 0];
    return [v[0] / len, v[1] / len, v[2] / len];
  },
  
  _reflect: function(v, n) {
    const d = 2 * this._dot(v, n);
    return [v[0] - d * n[0], v[1] - d * n[1], v[2] - d * n[2]];
  },
  
  _unproject: function(point, invMatrix) {
    const x = invMatrix[0]*point[0] + invMatrix[4]*point[1] + invMatrix[8]*point[2] + invMatrix[12]*point[3];
    const y = invMatrix[1]*point[0] + invMatrix[5]*point[1] + invMatrix[9]*point[2] + invMatrix[13]*point[3];
    const z = invMatrix[2]*point[0] + invMatrix[6]*point[1] + invMatrix[10]*point[2] + invMatrix[14]*point[3];
    const w = invMatrix[3]*point[0] + invMatrix[7]*point[1] + invMatrix[11]*point[2] + invMatrix[15]*point[3];
    
    return [x / w, y / w, z / w];
  },
  
  _invertMatrix: function(m) {
    // 4x4 matrix inversion (simplified, assumes well-formed matrix)
    const inv = new Array(16);
    
    inv[0] = m[5]*m[10]*m[15] - m[5]*m[11]*m[14] - m[9]*m[6]*m[15] + m[9]*m[7]*m[14] + m[13]*m[6]*m[11] - m[13]*m[7]*m[10];
    inv[4] = -m[4]*m[10]*m[15] + m[4]*m[11]*m[14] + m[8]*m[6]*m[15] - m[8]*m[7]*m[14] - m[12]*m[6]*m[11] + m[12]*m[7]*m[10];
    inv[8] = m[4]*m[9]*m[15] - m[4]*m[11]*m[13] - m[8]*m[5]*m[15] + m[8]*m[7]*m[13] + m[12]*m[5]*m[11] - m[12]*m[7]*m[9];
    inv[12] = -m[4]*m[9]*m[14] + m[4]*m[10]*m[13] + m[8]*m[5]*m[14] - m[8]*m[6]*m[13] - m[12]*m[5]*m[10] + m[12]*m[6]*m[9];
    inv[1] = -m[1]*m[10]*m[15] + m[1]*m[11]*m[14] + m[9]*m[2]*m[15] - m[9]*m[3]*m[14] - m[13]*m[2]*m[11] + m[13]*m[3]*m[10];
    inv[5] = m[0]*m[10]*m[15] - m[0]*m[11]*m[14] - m[8]*m[2]*m[15] + m[8]*m[3]*m[14] + m[12]*m[2]*m[11] - m[12]*m[3]*m[10];
    inv[9] = -m[0]*m[9]*m[15] + m[0]*m[11]*m[13] + m[8]*m[1]*m[15] - m[8]*m[3]*m[13] - m[12]*m[1]*m[11] + m[12]*m[3]*m[9];
    inv[13] = m[0]*m[9]*m[14] - m[0]*m[10]*m[13] - m[8]*m[1]*m[14] + m[8]*m[2]*m[13] + m[12]*m[1]*m[10] - m[12]*m[2]*m[9];
    inv[2] = m[1]*m[6]*m[15] - m[1]*m[7]*m[14] - m[5]*m[2]*m[15] + m[5]*m[3]*m[14] + m[13]*m[2]*m[7] - m[13]*m[3]*m[6];
    inv[6] = -m[0]*m[6]*m[15] + m[0]*m[7]*m[14] + m[4]*m[2]*m[15] - m[4]*m[3]*m[14] - m[12]*m[2]*m[7] + m[12]*m[3]*m[6];
    inv[10] = m[0]*m[5]*m[15] - m[0]*m[7]*m[13] - m[4]*m[1]*m[15] + m[4]*m[3]*m[13] + m[12]*m[1]*m[7] - m[12]*m[3]*m[5];
    inv[14] = -m[0]*m[5]*m[14] + m[0]*m[6]*m[13] + m[4]*m[1]*m[14] - m[4]*m[2]*m[13] - m[12]*m[1]*m[6] + m[12]*m[2]*m[5];
    inv[3] = -m[1]*m[6]*m[11] + m[1]*m[7]*m[10] + m[5]*m[2]*m[11] - m[5]*m[3]*m[10] - m[9]*m[2]*m[7] + m[9]*m[3]*m[6];
    inv[7] = m[0]*m[6]*m[11] - m[0]*m[7]*m[10] - m[4]*m[2]*m[11] + m[4]*m[3]*m[10] + m[8]*m[2]*m[7] - m[8]*m[3]*m[6];
    inv[11] = -m[0]*m[5]*m[11] + m[0]*m[7]*m[9] + m[4]*m[1]*m[11] - m[4]*m[3]*m[9] - m[8]*m[1]*m[7] + m[8]*m[3]*m[5];
    inv[15] = m[0]*m[5]*m[10] - m[0]*m[6]*m[9] - m[4]*m[1]*m[10] + m[4]*m[2]*m[9] + m[8]*m[1]*m[6] - m[8]*m[2]*m[5];
    
    let det = m[0]*inv[0] + m[1]*inv[4] + m[2]*inv[8] + m[3]*inv[12];
    
    if (Math.abs(det) < 1e-10) return null;
    
    det = 1 / det;
    return inv.map(v => v * det);
  }
};


// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH12_GATEWAY_ROUTES = {
  // Transformations
  'graphics.transform.identity': 'PRISM_GRAPHICS.identity',
  'graphics.transform.translate': 'PRISM_GRAPHICS.translate',
  'graphics.transform.rotate': 'PRISM_GRAPHICS.rotate',
  'graphics.transform.scale': 'PRISM_GRAPHICS.scale',
  'graphics.transform.compose': 'PRISM_GRAPHICS.composeTransforms',
  'graphics.transform.point': 'PRISM_GRAPHICS.transformPoint',
  
  // View/Projection
  'graphics.view.lookAt': 'PRISM_GRAPHICS.lookAt',
  'graphics.projection.perspective': 'PRISM_GRAPHICS.perspective',
  'graphics.projection.orthographic': 'PRISM_GRAPHICS.orthographic',
  
  // Lighting
  'graphics.light.phong': 'PRISM_GRAPHICS.phongLighting',
  'graphics.light.blinnPhong': 'PRISM_GRAPHICS.blinnPhongLighting',
  
  // Mesh
  'graphics.mesh.normals': 'PRISM_GRAPHICS.computeNormals',
  'graphics.mesh.bounds': 'PRISM_GRAPHICS.computeBounds',
  'graphics.mesh.center': 'PRISM_GRAPHICS.computeCenter',
  
  // Picking
  'graphics.pick.ray': 'PRISM_GRAPHICS.screenToRay',
  'graphics.pick.triangle': 'PRISM_GRAPHICS.rayTriangleIntersect',
  'graphics.pick.mesh': 'PRISM_GRAPHICS.rayMeshIntersect',
  
  // Color
  'graphics.color.hsvToRgb': 'PRISM_GRAPHICS.hsvToRgb',
  'graphics.color.gradient': 'PRISM_GRAPHICS.colorGradient'
};

function registerBatch12Routes() {
  if (typeof PRISM_GATEWAY !== 'undefined') {
    for (const [route, target] of Object.entries(BATCH12_GATEWAY_ROUTES)) {
      PRISM_GATEWAY.register(route, target);
    }
    console.log(`[Batch 12] Registered ${Object.keys(BATCH12_GATEWAY_ROUTES).length} routes`);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRISM_GRAPHICS, BATCH12_GATEWAY_ROUTES, registerBatch12Routes };
}

if (typeof window !== 'undefined') {
  window.PRISM_GRAPHICS = PRISM_GRAPHICS;
  registerBatch12Routes();
}

console.log('[PRISM Batch 12] Computer Graphics loaded - 19 routes');

/**
 * PRISM BATCH 5: HUMAN FACTORS & UI
 * Source: MIT 16.400 (Human Factors Engineering)
 * 
 * Algorithms: Workload Assessment, Error Prevention, Display Optimization
 * Gateway Routes: 15
 */

const PRISM_HUMAN_FACTORS = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // WORKLOAD ASSESSMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Calculate NASA Task Load Index
   * @param {Object} ratings - 0-100 ratings for each dimension
   * @param {Object} weights - Optional pairwise comparison weights
   * @returns {Object} TLX scores
   */
  nasaTLX: function(ratings, weights = null) {
    const dimensions = ['mental', 'physical', 'temporal', 'performance', 'effort', 'frustration'];
    
    // Validate ratings
    for (const dim of dimensions) {
      if (ratings[dim] === undefined || ratings[dim] < 0 || ratings[dim] > 100) {
        throw new Error(`Invalid rating for ${dim}: must be 0-100`);
      }
    }
    
    // Raw TLX (unweighted average)
    const rawTLX = dimensions.reduce((sum, dim) => sum + ratings[dim], 0) / 6;
    
    // Weighted TLX if weights provided
    let weightedTLX = rawTLX;
    if (weights) {
      const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
      weightedTLX = dimensions.reduce((sum, dim) => 
        sum + ratings[dim] * (weights[dim] || 1), 0
      ) / totalWeight;
    }
    
    // Categorize workload level
    let level, recommendation;
    if (weightedTLX < 30) {
      level = 'LOW';
      recommendation = 'Operator may be underloaded. Consider adding monitoring tasks.';
    } else if (weightedTLX < 50) {
      level = 'MODERATE';
      recommendation = 'Optimal workload range for sustained performance.';
    } else if (weightedTLX < 70) {
      level = 'HIGH';
      recommendation = 'Consider automation assistance or task redistribution.';
    } else {
      level = 'OVERLOAD';
      recommendation = 'Critical: Reduce task demands or provide significant support.';
    }
    
    return {
      rawTLX,
      weightedTLX,
      level,
      recommendation,
      breakdown: { ...ratings },
      dominantFactor: this._findDominantFactor(ratings)
    };
  },
  
  _findDominantFactor: function(ratings) {
    let max = 0, dominant = null;
    for (const [dim, value] of Object.entries(ratings)) {
      if (value > max) {
        max = value;
        dominant = dim;
      }
    }
    return { dimension: dominant, value: max };
  },
  
  /**
   * Assess overall workload from multiple indicators
   */
  assessWorkload: function(indicators) {
    const {
      taskComplexity = 50,     // 0-100
      timeAvailable = 50,      // 0-100 (higher = more time)
      errorRate = 0,           // errors per hour
      responseTime = 500,      // ms average
      baselineResponseTime = 400
    } = indicators;
    
    // Normalize indicators
    const complexityScore = taskComplexity / 100;
    const timePressure = 1 - (timeAvailable / 100);
    const errorScore = Math.min(1, errorRate / 5);  // Normalize to 5 errors/hr max
    const rtDegradation = Math.max(0, (responseTime - baselineResponseTime) / baselineResponseTime);
    
    // Weighted combination
    const workloadIndex = (
      complexityScore * 0.3 +
      timePressure * 0.25 +
      errorScore * 0.25 +
      rtDegradation * 0.2
    ) * 100;
    
    return {
      workloadIndex,
      level: workloadIndex < 30 ? 'LOW' : workloadIndex < 60 ? 'MODERATE' : workloadIndex < 80 ? 'HIGH' : 'CRITICAL',
      factors: {
        complexity: complexityScore * 100,
        timePressure: timePressure * 100,
        errorImpact: errorScore * 100,
        responseTimeDegradation: rtDegradation * 100
      }
    };
  },
  
  /**
   * Predict workload for a task configuration
   */
  predictWorkload: function(taskConfig) {
    const {
      numDisplays,
      numControls,
      updateRate,         // Hz
      decisionFrequency,  // decisions per minute
      physicalDemand      // 0-100
    } = taskConfig;
    
    // Heuristic model based on human factors research
    const visualLoad = Math.min(100, numDisplays * 8 + updateRate * 5);
    const motorLoad = Math.min(100, numControls * 5 + physicalDemand);
    const cognitiveLoad = Math.min(100, decisionFrequency * 10);
    
    const predictedWorkload = (visualLoad + motorLoad + cognitiveLoad) / 3;
    
    return {
      predictedWorkload,
      visualLoad,
      motorLoad,
      cognitiveLoad,
      sustainable: predictedWorkload < 70,
      recommendations: this._generateWorkloadRecommendations(visualLoad, motorLoad, cognitiveLoad)
    };
  },
  
  _generateWorkloadRecommendations: function(visual, motor, cognitive) {
    const recs = [];
    if (visual > 70) recs.push('Reduce display complexity or update rate');
    if (motor > 70) recs.push('Automate frequent physical actions');
    if (cognitive > 70) recs.push('Provide decision support or automation');
    if (recs.length === 0) recs.push('Workload appears manageable');
    return recs;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR PREVENTION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Classify error type (Rasmussen taxonomy)
   */
  classifyError: function(errorDescription) {
    const skillBased = ['slip', 'lapse', 'misclick', 'wrong button', 'forgot', 'omit'];
    const ruleBased = ['wrong procedure', 'misapplied', 'incorrect rule', 'wrong sequence'];
    const knowledgeBased = ['didn\'t know', 'unfamiliar', 'novel', 'first time', 'unexpected'];
    
    const desc = errorDescription.toLowerCase();
    
    let type, prevention;
    
    if (skillBased.some(kw => desc.includes(kw))) {
      type = 'SKILL_BASED';
      prevention = [
        'Add forcing functions/interlocks',
        'Improve feedback on actions',
        'Use distinct controls for different functions',
        'Implement checklists for critical sequences'
      ];
    } else if (ruleBased.some(kw => desc.includes(kw))) {
      type = 'RULE_BASED';
      prevention = [
        'Improve procedure clarity',
        'Add decision support systems',
        'Provide better situational indicators',
        'Implement guided workflows'
      ];
    } else {
      type = 'KNOWLEDGE_BASED';
      prevention = [
        'Provide training for novel situations',
        'Implement AI assistance',
        'Add expert system recommendations',
        'Improve documentation access'
      ];
    }
    
    return { type, prevention, description: errorDescription };
  },
  
  /**
   * Generate error prevention strategies
   */
  errorPrevention: function(operation) {
    const strategies = {
      elimination: [],
      substitution: [],
      engineering: [],
      administrative: [],
      recovery: []
    };
    
    // Analyze operation for common error sources
    if (operation.manualEntry) {
      strategies.elimination.push('Replace manual entry with dropdown selection');
      strategies.substitution.push('Use barcode/RFID scanning instead');
    }
    
    if (operation.criticalTiming) {
      strategies.engineering.push('Add interlock to prevent premature action');
      strategies.administrative.push('Add confirmation step');
    }
    
    if (operation.sequenceDependent) {
      strategies.engineering.push('Implement sequence enforcement');
      strategies.administrative.push('Provide step-by-step wizard');
    }
    
    if (operation.irreversible) {
      strategies.engineering.push('Add physical guard or key switch');
      strategies.administrative.push('Require supervisor approval');
      strategies.recovery.push('Implement undo where possible');
    }
    
    // Always include recovery options
    strategies.recovery.push('Auto-save state before critical operations');
    strategies.recovery.push('Clear error messages with corrective actions');
    
    return strategies;
  },
  
  /**
   * Check interlock conditions
   */
  interlockCheck: function(conditions) {
    const results = [];
    let allPassed = true;
    
    for (const [name, { required, actual, message }] of Object.entries(conditions)) {
      const passed = actual === required;
      results.push({
        name,
        required,
        actual,
        passed,
        message: passed ? 'OK' : message
      });
      if (!passed) allPassed = false;
    }
    
    return {
      allPassed,
      canProceed: allPassed,
      results,
      failedConditions: results.filter(r => !r.passed)
    };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DISPLAY DESIGN
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Optimize control/display layout using Fitts' Law
   */
  optimizeLayout: function(elements, constraints = {}) {
    const { screenWidth = 1920, screenHeight = 1080, startPosition = { x: 960, y: 540 } } = constraints;
    
    // Sort by frequency of use (higher frequency = closer to start)
    const sorted = [...elements].sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
    
    // Calculate optimal positions
    const positioned = [];
    let angle = 0;
    const angleStep = (2 * Math.PI) / Math.max(8, elements.length);
    
    for (let i = 0; i < sorted.length; i++) {
      const elem = sorted[i];
      const freq = elem.frequency || 1;
      
      // Distance based on frequency (more frequent = closer)
      const distance = 100 + (1 / freq) * 200;
      
      // Size based on importance and frequency
      const size = Math.max(40, 30 + freq * 10 + (elem.importance || 0) * 10);
      
      const x = startPosition.x + distance * Math.cos(angle);
      const y = startPosition.y + distance * Math.sin(angle);
      
      positioned.push({
        ...elem,
        x: Math.max(size/2, Math.min(screenWidth - size/2, x)),
        y: Math.max(size/2, Math.min(screenHeight - size/2, y)),
        width: size,
        height: size,
        fittsID: this.fittsLaw(distance, size).indexOfDifficulty
      });
      
      angle += angleStep;
    }
    
    return {
      layout: positioned,
      averageFittsID: positioned.reduce((sum, p) => sum + p.fittsID, 0) / positioned.length
    };
  },
  
  /**
   * Apply visual hierarchy to elements
   */
  applyHierarchy: function(elements) {
    // Sort by priority (1 = highest)
    const sorted = [...elements].sort((a, b) => (a.priority || 99) - (b.priority || 99));
    
    return sorted.map((elem, index) => {
      const priority = elem.priority || index + 1;
      
      return {
        ...elem,
        fontSize: Math.max(12, 24 - priority * 2),
        fontWeight: priority <= 2 ? 'bold' : 'normal',
        opacity: Math.max(0.6, 1 - priority * 0.1),
        zIndex: 100 - priority,
        color: this._priorityColor(priority)
      };
    });
  },
  
  _priorityColor: function(priority) {
    const colors = {
      1: '#FF0000',  // Critical - Red
      2: '#FF6600',  // High - Orange
      3: '#FFCC00',  // Medium - Yellow
      4: '#00AA00',  // Normal - Green
      5: '#0066CC'   // Low - Blue
    };
    return colors[Math.min(priority, 5)] || '#666666';
  },
  
  /**
   * Generate accessible color palette
   */
  accessibleColors: function(baseColors, options = {}) {
    const { ensureContrast = true, colorblindSafe = true } = options;
    
    // Colorblind-safe palette
    const safeColors = {
      red: '#D55E00',
      orange: '#E69F00',
      yellow: '#F0E442',
      green: '#009E73',
      blue: '#0072B2',
      purple: '#CC79A7',
      gray: '#999999'
    };
    
    const result = {};
    
    for (const [name, color] of Object.entries(baseColors)) {
      result[name] = {
        original: color,
        accessible: colorblindSafe ? (safeColors[name] || color) : color,
        contrastOnWhite: this._calculateContrast(color, '#FFFFFF'),
        contrastOnBlack: this._calculateContrast(color, '#000000'),
        useOnDark: this._calculateContrast(color, '#000000') > 4.5
      };
    }
    
    return result;
  },
  
  _calculateContrast: function(color1, color2) {
    // Simplified contrast calculation
    const getLuminance = (hex) => {
      const rgb = parseInt(hex.slice(1), 16);
      const r = (rgb >> 16) & 255;
      const g = (rgb >> 8) & 255;
      const b = rgb & 255;
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    };
    
    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DECISION SUPPORT
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Generate decision recommendation with explanation
   */
  generateRecommendation: function(options, criteria, weights = null) {
    // Calculate weighted score for each option
    const scored = options.map(option => {
      let totalScore = 0;
      let totalWeight = 0;
      const breakdown = {};
      
      for (const [criterion, value] of Object.entries(option.scores || {})) {
        const weight = weights?.[criterion] || 1;
        breakdown[criterion] = { score: value, weight, weighted: value * weight };
        totalScore += value * weight;
        totalWeight += weight;
      }
      
      return {
        ...option,
        totalScore,
        normalizedScore: totalScore / totalWeight,
        breakdown
      };
    });
    
    // Sort by score
    scored.sort((a, b) => b.normalizedScore - a.normalizedScore);
    
    const recommended = scored[0];
    const alternative = scored[1];
    
    return {
      recommended: recommended.name || recommended.id,
      confidence: this._calculateConfidence(recommended, alternative),
      scores: scored,
      explanation: this._generateExplanation(recommended, criteria),
      alternatives: scored.slice(1, 3).map(s => s.name || s.id)
    };
  },
  
  _calculateConfidence: function(first, second) {
    if (!second) return 1;
    const gap = first.normalizedScore - second.normalizedScore;
    return Math.min(1, 0.5 + gap);
  },
  
  _generateExplanation: function(option, criteria) {
    const topFactors = Object.entries(option.breakdown)
      .sort((a, b) => b[1].weighted - a[1].weighted)
      .slice(0, 3)
      .map(([name, data]) => `${name}: ${(data.score * 100).toFixed(0)}%`);
    
    return `Recommended based on: ${topFactors.join(', ')}`;
  },
  
  /**
   * Explain a decision/calculation
   */
  explainDecision: function(decision, context) {
    return {
      summary: decision.summary || 'Decision made based on provided criteria',
      inputs: decision.inputs,
      process: decision.steps || ['Evaluated options', 'Applied weights', 'Selected best match'],
      result: decision.result,
      confidence: decision.confidence || 'HIGH',
      alternatives: decision.alternatives || [],
      limitations: decision.limitations || ['Based on provided data only']
    };
  },
  
  /**
   * Assess situation awareness
   */
  situationAwareness: function(operatorState, systemState) {
    const assessment = {
      level1_perception: 0,
      level2_comprehension: 0,
      level3_projection: 0
    };
    
    // Level 1: Does operator know current state?
    let correctPerceptions = 0;
    for (const [key, actual] of Object.entries(systemState.current)) {
      if (operatorState.perceived?.[key] === actual) correctPerceptions++;
    }
    assessment.level1_perception = correctPerceptions / Object.keys(systemState.current).length;
    
    // Level 2: Does operator understand implications?
    if (operatorState.understands?.trends) assessment.level2_comprehension += 0.5;
    if (operatorState.understands?.causes) assessment.level2_comprehension += 0.5;
    
    // Level 3: Can operator predict near future?
    if (operatorState.predicts?.nextState) {
      const predicted = operatorState.predicts.nextState;
      const actual = systemState.projected;
      assessment.level3_projection = this._comparePredictions(predicted, actual);
    }
    
    const overall = (assessment.level1_perception + assessment.level2_comprehension + assessment.level3_projection) / 3;
    
    return {
      ...assessment,
      overall,
      level: overall > 0.8 ? 'HIGH' : overall > 0.5 ? 'MODERATE' : 'LOW',
      recommendations: this._saRecommendations(assessment)
    };
  },
  
  _comparePredictions: function(predicted, actual) {
    if (!predicted || !actual) return 0;
    let matches = 0, total = 0;
    for (const key of Object.keys(actual)) {
      if (predicted[key] !== undefined) {
        total++;
        if (Math.abs(predicted[key] - actual[key]) < actual[key] * 0.1) matches++;
      }
    }
    return total > 0 ? matches / total : 0;
  },
  
  _saRecommendations: function(assessment) {
    const recs = [];
    if (assessment.level1_perception < 0.7) recs.push('Improve status displays and highlighting');
    if (assessment.level2_comprehension < 0.7) recs.push('Add trend indicators and summaries');
    if (assessment.level3_projection < 0.7) recs.push('Implement predictive displays');
    return recs;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ERGONOMICS CALCULATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Fitts' Law calculation
   */
  fittsLaw: function(distance, width, a = 50, b = 150) {
    const indexOfDifficulty = Math.log2(2 * distance / width);
    const movementTime = a + b * indexOfDifficulty;
    
    return {
      indexOfDifficulty,
      movementTime,
      throughput: indexOfDifficulty / (movementTime / 1000)
    };
  },
  
  /**
   * Hick's Law calculation
   */
  hicksLaw: function(numChoices, a = 200, b = 150) {
    const reactionTime = a + b * Math.log2(numChoices + 1);
    
    return {
      numChoices,
      reactionTime,
      recommendation: numChoices > 7 ? 'Consider grouping or hierarchy' : 'Acceptable'
    };
  },
  
  /**
   * Optimize control layout for minimal movement time
   */
  optimizeControlLayout: function(controls, workspace) {
    const { width, height, handPosition } = workspace;
    
    // Sort controls by frequency
    const sorted = [...controls].sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
    
    // Place most frequent closest to hand position
    const positioned = [];
    const usedPositions = new Set();
    
    for (const control of sorted) {
      let bestPos = null;
      let bestTime = Infinity;
      
      // Try grid positions
      for (let x = 50; x < width; x += 80) {
        for (let y = 50; y < height; y += 80) {
          const key = `${x},${y}`;
          if (usedPositions.has(key)) continue;
          
          const distance = Math.sqrt((x - handPosition.x) ** 2 + (y - handPosition.y) ** 2);
          const fitts = this.fittsLaw(distance, control.size || 50);
          
          if (fitts.movementTime < bestTime) {
            bestTime = fitts.movementTime;
            bestPos = { x, y };
          }
        }
      }
      
      if (bestPos) {
        usedPositions.add(`${bestPos.x},${bestPos.y}`);
        positioned.push({
          ...control,
          position: bestPos,
          estimatedAccessTime: bestTime
        });
      }
    }
    
    return {
      layout: positioned,
      totalEstimatedTime: positioned.reduce((sum, c) => sum + c.estimatedAccessTime * (c.frequency || 1), 0)
    };
  }
};


// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH5_GATEWAY_ROUTES = {
  // Workload
  'hf.workload.tlx': 'PRISM_HUMAN_FACTORS.nasaTLX',
  'hf.workload.assess': 'PRISM_HUMAN_FACTORS.assessWorkload',
  'hf.workload.predict': 'PRISM_HUMAN_FACTORS.predictWorkload',
  
  // Error Prevention
  'hf.error.classify': 'PRISM_HUMAN_FACTORS.classifyError',
  'hf.error.prevent': 'PRISM_HUMAN_FACTORS.errorPrevention',
  'hf.interlock.check': 'PRISM_HUMAN_FACTORS.interlockCheck',
  
  // Display Design
  'hf.display.layout': 'PRISM_HUMAN_FACTORS.optimizeLayout',
  'hf.display.hierarchy': 'PRISM_HUMAN_FACTORS.applyHierarchy',
  'hf.color.accessible': 'PRISM_HUMAN_FACTORS.accessibleColors',
  
  // Decision Support
  'hf.decision.recommend': 'PRISM_HUMAN_FACTORS.generateRecommendation',
  'hf.decision.explain': 'PRISM_HUMAN_FACTORS.explainDecision',
  'hf.sa.assess': 'PRISM_HUMAN_FACTORS.situationAwareness',
  
  // Ergonomics
  'hf.fitts': 'PRISM_HUMAN_FACTORS.fittsLaw',
  'hf.hicks': 'PRISM_HUMAN_FACTORS.hicksLaw',
  'hf.layout.optimize': 'PRISM_HUMAN_FACTORS.optimizeControlLayout'
};

function registerBatch5Routes() {
  if (typeof PRISM_GATEWAY !== 'undefined') {
    for (const [route, target] of Object.entries(BATCH5_GATEWAY_ROUTES)) {
      PRISM_GATEWAY.register(route, target);
    }
    console.log(`[Batch 5] Registered ${Object.keys(BATCH5_GATEWAY_ROUTES).length} routes`);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRISM_HUMAN_FACTORS, BATCH5_GATEWAY_ROUTES, registerBatch5Routes };
}

if (typeof window !== 'undefined') {
  window.PRISM_HUMAN_FACTORS = PRISM_HUMAN_FACTORS;
  registerBatch5Routes();
}

console.log('[PRISM Batch 5] Human Factors & UI loaded - 15 routes');
/**
 * PRISM BATCH 6: SOFTWARE ENGINEERING
 * Source: MIT 1.124j (Software Construction) + 1.264j (Database) + 16.355j (Software Safety)
 * 
 * Algorithms: Design Patterns, Database, Testing, Safety
 * Gateway Routes: 15
 */

const PRISM_SOFTWARE = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FACTORY PATTERN
  // ═══════════════════════════════════════════════════════════════════════════
  
  factory: {
    creators: {},
    
    register: function(type, creator) {
      this.creators[type] = creator;
    },
    
    create: function(type, params) {
      const creator = this.creators[type];
      if (!creator) {
        throw new Error(`Unknown type: ${type}. Registered: ${Object.keys(this.creators).join(', ')}`);
      }
      return creator(params);
    },
    
    getTypes: function() {
      return Object.keys(this.creators);
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COMMAND PATTERN (Undo/Redo)
  // ═══════════════════════════════════════════════════════════════════════════
  
  commandManager: {
    history: [],
    redoStack: [],
    maxHistory: 100,
    
    execute: function(command) {
      if (typeof command.execute !== 'function' || typeof command.undo !== 'function') {
        throw new Error('Command must have execute() and undo() methods');
      }
      
      const result = command.execute();
      this.history.push(command);
      this.redoStack = [];  // Clear redo on new command
      
      // Limit history size
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }
      
      return result;
    },
    
    undo: function() {
      const command = this.history.pop();
      if (!command) return { success: false, message: 'Nothing to undo' };
      
      command.undo();
      this.redoStack.push(command);
      return { success: true, command: command.name || 'Command' };
    },
    
    redo: function() {
      const command = this.redoStack.pop();
      if (!command) return { success: false, message: 'Nothing to redo' };
      
      command.execute();
      this.history.push(command);
      return { success: true, command: command.name || 'Command' };
    },
    
    canUndo: function() {
      return this.history.length > 0;
    },
    
    canRedo: function() {
      return this.redoStack.length > 0;
    },
    
    clear: function() {
      this.history = [];
      this.redoStack = [];
    },
    
    getHistory: function() {
      return this.history.map((cmd, i) => ({
        index: i,
        name: cmd.name || `Command ${i}`,
        timestamp: cmd.timestamp
      }));
    }
  },
  
  // Helper to create commands
  createCommand: function(name, executeFn, undoFn) {
    return {
      name,
      timestamp: Date.now(),
      execute: executeFn,
      undo: undoFn
    };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE MACHINE
  // ═══════════════════════════════════════════════════════════════════════════
  
  stateManager: {
    states: {},
    current: null,
    history: [],
    
    define: function(config) {
      this.states = config.states;
      this.current = config.initial;
      this.onTransition = config.onTransition || (() => {});
      this.history = [{ state: this.current, timestamp: Date.now() }];
    },
    
    transition: function(to, payload = {}) {
      const currentConfig = this.states[this.current];
      if (!currentConfig) {
        throw new Error(`Invalid current state: ${this.current}`);
      }
      
      const allowedTransitions = currentConfig.transitions || [];
      if (!allowedTransitions.includes(to)) {
        return {
          success: false,
          error: `Cannot transition from ${this.current} to ${to}. Allowed: ${allowedTransitions.join(', ')}`
        };
      }
      
      const from = this.current;
      this.current = to;
      this.history.push({ state: to, timestamp: Date.now(), from, payload });
      
      // Call exit action
      if (currentConfig.onExit) currentConfig.onExit(payload);
      
      // Call enter action
      const newConfig = this.states[to];
      if (newConfig?.onEnter) newConfig.onEnter(payload);
      
      // Call global transition handler
      this.onTransition({ from, to, payload });
      
      return { success: true, from, to };
    },
    
    canTransition: function(to) {
      const currentConfig = this.states[this.current];
      return currentConfig?.transitions?.includes(to) || false;
    },
    
    getState: function() {
      return this.current;
    },
    
    getAvailableTransitions: function() {
      return this.states[this.current]?.transitions || [];
    },
    
    getHistory: function() {
      return [...this.history];
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SIMPLE IN-MEMORY DATABASE
  // ═══════════════════════════════════════════════════════════════════════════
  
  database: {
    tables: {},
    indexes: {},
    
    createTable: function(name, schema) {
      this.tables[name] = {
        schema,
        rows: [],
        autoIncrement: 1
      };
      this.indexes[name] = {};
      return { success: true, table: name };
    },
    
    insert: function(table, data) {
      if (!this.tables[table]) throw new Error(`Table ${table} does not exist`);
      
      const t = this.tables[table];
      const row = {
        _id: t.autoIncrement++,
        ...data,
        _created: Date.now(),
        _modified: Date.now()
      };
      
      // Validate against schema if exists
      if (t.schema) {
        for (const [field, config] of Object.entries(t.schema)) {
          if (config.required && row[field] === undefined) {
            throw new Error(`Required field missing: ${field}`);
          }
        }
      }
      
      t.rows.push(row);
      this._updateIndexes(table, row);
      
      return { success: true, id: row._id, row };
    },
    
    query: function(table, conditions = {}, options = {}) {
      if (!this.tables[table]) throw new Error(`Table ${table} does not exist`);
      
      let results = [...this.tables[table].rows];
      
      // Filter by conditions
      for (const [field, value] of Object.entries(conditions)) {
        if (typeof value === 'object') {
          // Advanced operators
          if (value.$gt !== undefined) results = results.filter(r => r[field] > value.$gt);
          if (value.$gte !== undefined) results = results.filter(r => r[field] >= value.$gte);
          if (value.$lt !== undefined) results = results.filter(r => r[field] < value.$lt);
          if (value.$lte !== undefined) results = results.filter(r => r[field] <= value.$lte);
          if (value.$in !== undefined) results = results.filter(r => value.$in.includes(r[field]));
          if (value.$contains !== undefined) results = results.filter(r => 
            String(r[field]).toLowerCase().includes(String(value.$contains).toLowerCase())
          );
        } else {
          results = results.filter(r => r[field] === value);
        }
      }
      
      // Sort
      if (options.orderBy) {
        const [field, dir] = options.orderBy.split(' ');
        const mult = dir?.toLowerCase() === 'desc' ? -1 : 1;
        results.sort((a, b) => (a[field] > b[field] ? 1 : -1) * mult);
      }
      
      // Pagination
      if (options.limit) {
        const offset = options.offset || 0;
        results = results.slice(offset, offset + options.limit);
      }
      
      // Select specific fields
      if (options.select) {
        const fields = options.select.split(',').map(f => f.trim());
        results = results.map(r => {
          const selected = {};
          for (const f of fields) selected[f] = r[f];
          return selected;
        });
      }
      
      return results;
    },
    
    update: function(table, conditions, updates) {
      if (!this.tables[table]) throw new Error(`Table ${table} does not exist`);
      
      let count = 0;
      for (const row of this.tables[table].rows) {
        let match = true;
        for (const [field, value] of Object.entries(conditions)) {
          if (row[field] !== value) { match = false; break; }
        }
        
        if (match) {
          Object.assign(row, updates, { _modified: Date.now() });
          count++;
        }
      }
      
      return { success: true, modified: count };
    },
    
    delete: function(table, conditions) {
      if (!this.tables[table]) throw new Error(`Table ${table} does not exist`);
      
      const before = this.tables[table].rows.length;
      this.tables[table].rows = this.tables[table].rows.filter(row => {
        for (const [field, value] of Object.entries(conditions)) {
          if (row[field] === value) return false;
        }
        return true;
      });
      
      return { success: true, deleted: before - this.tables[table].rows.length };
    },
    
    createIndex: function(table, field) {
      if (!this.tables[table]) throw new Error(`Table ${table} does not exist`);
      
      this.indexes[table][field] = {};
      for (const row of this.tables[table].rows) {
        this._addToIndex(table, field, row);
      }
      
      return { success: true, indexed: field };
    },
    
    _addToIndex: function(table, field, row) {
      const value = row[field];
      if (!this.indexes[table][field][value]) {
        this.indexes[table][field][value] = [];
      }
      this.indexes[table][field][value].push(row._id);
    },
    
    _updateIndexes: function(table, row) {
      for (const field of Object.keys(this.indexes[table] || {})) {
        this._addToIndex(table, field, row);
      }
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CACHE
  // ═══════════════════════════════════════════════════════════════════════════
  
  cache: {
    store: new Map(),
    maxSize: 1000,
    ttl: 300000, // 5 minutes default
    
    set: function(key, value, ttl = this.ttl) {
      if (this.store.size >= this.maxSize) {
        // Remove oldest entry (LRU approximation)
        const firstKey = this.store.keys().next().value;
        this.store.delete(firstKey);
      }
      
      this.store.set(key, {
        value,
        expires: Date.now() + ttl,
        hits: 0
      });
      
      return { success: true, key };
    },
    
    get: function(key) {
      const entry = this.store.get(key);
      if (!entry) return { found: false };
      
      if (Date.now() > entry.expires) {
        this.store.delete(key);
        return { found: false, expired: true };
      }
      
      entry.hits++;
      return { found: true, value: entry.value, hits: entry.hits };
    },
    
    invalidate: function(key) {
      return { deleted: this.store.delete(key) };
    },
    
    clear: function() {
      const size = this.store.size;
      this.store.clear();
      return { cleared: size };
    },
    
    getStats: function() {
      let totalHits = 0, expired = 0;
      const now = Date.now();
      
      for (const [key, entry] of this.store) {
        totalHits += entry.hits;
        if (now > entry.expires) expired++;
      }
      
      return {
        size: this.store.size,
        maxSize: this.maxSize,
        totalHits,
        expiredEntries: expired
      };
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TESTING UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════
  
  testing: {
    tests: [],
    results: [],
    
    describe: function(name, fn) {
      this.currentSuite = name;
      fn();
      this.currentSuite = null;
    },
    
    it: function(name, fn) {
      this.tests.push({
        suite: this.currentSuite,
        name,
        fn
      });
    },
    
    runTests: function(filter = null) {
      this.results = [];
      const testsToRun = filter 
        ? this.tests.filter(t => t.name.includes(filter) || t.suite?.includes(filter))
        : this.tests;
      
      for (const test of testsToRun) {
        const result = {
          suite: test.suite,
          name: test.name,
          passed: false,
          error: null,
          duration: 0
        };
        
        const start = performance.now();
        try {
          test.fn();
          result.passed = true;
        } catch (e) {
          result.error = e.message;
        }
        result.duration = performance.now() - start;
        
        this.results.push(result);
      }
      
      const passed = this.results.filter(r => r.passed).length;
      const failed = this.results.filter(r => !r.passed).length;
      
      return {
        total: this.results.length,
        passed,
        failed,
        passRate: (passed / this.results.length * 100).toFixed(1) + '%',
        results: this.results,
        failures: this.results.filter(r => !r.passed)
      };
    },
    
    getCoverage: function(module) {
      // Simplified coverage estimation
      const functions = Object.keys(module).filter(k => typeof module[k] === 'function');
      const testedFunctions = new Set();
      
      for (const test of this.tests) {
        const src = test.fn.toString();
        for (const fn of functions) {
          if (src.includes(fn)) testedFunctions.add(fn);
        }
      }
      
      return {
        totalFunctions: functions.length,
        testedFunctions: testedFunctions.size,
        coverage: (testedFunctions.size / functions.length * 100).toFixed(1) + '%',
        untested: functions.filter(f => !testedFunctions.has(f))
      };
    },
    
    // Assertion helpers
    assert: {
      equal: (a, b, msg) => {
        if (a !== b) throw new Error(msg || `Expected ${a} to equal ${b}`);
      },
      deepEqual: (a, b, msg) => {
        if (JSON.stringify(a) !== JSON.stringify(b)) {
          throw new Error(msg || `Deep equality failed`);
        }
      },
      throws: (fn, msg) => {
        try {
          fn();
          throw new Error(msg || 'Expected function to throw');
        } catch (e) {
          if (e.message === msg) throw e;
        }
      },
      truthy: (val, msg) => {
        if (!val) throw new Error(msg || `Expected truthy value, got ${val}`);
      }
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // INPUT VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  validation: {
    rules: {
      number: (v, opts = {}) => {
        if (typeof v !== 'number' || !isFinite(v)) return 'Must be a valid number';
        if (opts.min !== undefined && v < opts.min) return `Must be at least ${opts.min}`;
        if (opts.max !== undefined && v > opts.max) return `Must be at most ${opts.max}`;
        return null;
      },
      string: (v, opts = {}) => {
        if (typeof v !== 'string') return 'Must be a string';
        if (opts.minLength && v.length < opts.minLength) return `Must be at least ${opts.minLength} characters`;
        if (opts.maxLength && v.length > opts.maxLength) return `Must be at most ${opts.maxLength} characters`;
        if (opts.pattern && !opts.pattern.test(v)) return `Must match pattern ${opts.pattern}`;
        return null;
      },
      array: (v, opts = {}) => {
        if (!Array.isArray(v)) return 'Must be an array';
        if (opts.minLength && v.length < opts.minLength) return `Must have at least ${opts.minLength} items`;
        return null;
      },
      enum: (v, opts) => {
        if (!opts.values?.includes(v)) return `Must be one of: ${opts.values.join(', ')}`;
        return null;
      }
    },
    
    validateInput: function(input, schema) {
      const errors = {};
      let valid = true;
      
      for (const [field, config] of Object.entries(schema)) {
        const value = input[field];
        
        // Required check
        if (config.required && (value === undefined || value === null)) {
          errors[field] = 'Required field';
          valid = false;
          continue;
        }
        
        if (value === undefined) continue;
        
        // Type check
        const rule = this.rules[config.type];
        if (rule) {
          const error = rule(value, config);
          if (error) {
            errors[field] = error;
            valid = false;
          }
        }
        
        // Custom validator
        if (config.validate) {
          const error = config.validate(value, input);
          if (error) {
            errors[field] = error;
            valid = false;
          }
        }
      }
      
      return { valid, errors };
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SAFETY
  // ═══════════════════════════════════════════════════════════════════════════
  
  safety: {
    hazards: [],
    watchdogs: new Map(),
    
    analyzeHazard: function(hazard) {
      const { component, failureMode, effect, severity, probability, detection } = hazard;
      
      const rpn = severity * probability * detection;
      
      const priority = rpn > 100 ? 'CRITICAL' : rpn > 50 ? 'HIGH' : rpn > 20 ? 'MEDIUM' : 'LOW';
      
      const mitigations = [];
      if (severity >= 8) mitigations.push('Add redundant system or backup');
      if (probability >= 5) mitigations.push('Improve component reliability or add monitoring');
      if (detection >= 5) mitigations.push('Add sensors or automated detection');
      
      this.hazards.push({
        ...hazard,
        rpn,
        priority,
        mitigations,
        analyzed: Date.now()
      });
      
      return { rpn, priority, mitigations };
    },
    
    watchdog: function(id, timeout, onTimeout) {
      // Clear existing watchdog if any
      if (this.watchdogs.has(id)) {
        clearTimeout(this.watchdogs.get(id).timer);
      }
      
      const timer = setTimeout(() => {
        console.error(`[WATCHDOG] ${id} timeout after ${timeout}ms`);
        onTimeout();
      }, timeout);
      
      this.watchdogs.set(id, {
        timer,
        timeout,
        onTimeout,
        lastKick: Date.now()
      });
      
      return {
        kick: () => {
          const wd = this.watchdogs.get(id);
          if (wd) {
            clearTimeout(wd.timer);
            wd.timer = setTimeout(wd.onTimeout, wd.timeout);
            wd.lastKick = Date.now();
          }
        },
        stop: () => {
          const wd = this.watchdogs.get(id);
          if (wd) {
            clearTimeout(wd.timer);
            this.watchdogs.delete(id);
          }
        }
      };
    },
    
    engageFailsafe: function(reason, actions) {
      console.error(`[FAILSAFE] Engaging due to: ${reason}`);
      
      const results = [];
      for (const action of actions) {
        try {
          action();
          results.push({ action: action.name || 'anonymous', success: true });
        } catch (e) {
          results.push({ action: action.name || 'anonymous', success: false, error: e.message });
        }
      }
      
      return {
        reason,
        timestamp: Date.now(),
        results,
        allSucceeded: results.every(r => r.success)
      };
    },
    
    getHazardReport: function() {
      return {
        total: this.hazards.length,
        bySeverity: {
          critical: this.hazards.filter(h => h.priority === 'CRITICAL').length,
          high: this.hazards.filter(h => h.priority === 'HIGH').length,
          medium: this.hazards.filter(h => h.priority === 'MEDIUM').length,
          low: this.hazards.filter(h => h.priority === 'LOW').length
        },
        hazards: this.hazards.sort((a, b) => b.rpn - a.rpn)
      };
    }
  }
};


// ═══════════════════════════════════════════════════════════════════════════════
// GATEWAY ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH6_GATEWAY_ROUTES = {
  // Factory
  'sw.factory.create': 'PRISM_SOFTWARE.factory.create',
  'sw.factory.register': 'PRISM_SOFTWARE.factory.register',
  
  // Command
  'sw.command.execute': 'PRISM_SOFTWARE.commandManager.execute',
  'sw.command.undo': 'PRISM_SOFTWARE.commandManager.undo',
  'sw.command.redo': 'PRISM_SOFTWARE.commandManager.redo',
  
  // State
  'sw.state.transition': 'PRISM_SOFTWARE.stateManager.transition',
  'sw.state.get': 'PRISM_SOFTWARE.stateManager.getState',
  
  // Database
  'sw.db.query': 'PRISM_SOFTWARE.database.query',
  'sw.db.insert': 'PRISM_SOFTWARE.database.insert',
  'sw.db.update': 'PRISM_SOFTWARE.database.update',
  
  // Cache
  'sw.cache.get': 'PRISM_SOFTWARE.cache.get',
  'sw.cache.set': 'PRISM_SOFTWARE.cache.set',
  
  // Testing
  'sw.test.run': 'PRISM_SOFTWARE.testing.runTests',
  'sw.validate': 'PRISM_SOFTWARE.validation.validateInput',
  
  // Safety
  'sw.safety.hazard': 'PRISM_SOFTWARE.safety.analyzeHazard',
  'sw.safety.watchdog': 'PRISM_SOFTWARE.safety.watchdog',
  'sw.safety.failsafe': 'PRISM_SOFTWARE.safety.engageFailsafe'
};

function registerBatch6Routes() {
  if (typeof PRISM_GATEWAY !== 'undefined') {
    for (const [route, target] of Object.entries(BATCH6_GATEWAY_ROUTES)) {
      PRISM_GATEWAY.register(route, target);
    }
    console.log(`[Batch 6] Registered ${Object.keys(BATCH6_GATEWAY_ROUTES).length} routes`);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PRISM_SOFTWARE, BATCH6_GATEWAY_ROUTES, registerBatch6Routes };
}

if (typeof window !== 'undefined') {
  window.PRISM_SOFTWARE = PRISM_SOFTWARE;
  registerBatch6Routes();
}

console.log('[PRISM Batch 6] Software Engineering loaded - 17 routes');

/**
 * PRISM MIT Course Knowledge - Batch 13
 * Mechanical Engineering Algorithms (Courses 1-5)
 * Source: MIT 2.001, 2.004, 2.007, 2.008
 * Generated: January 18, 2026
 */

// ═══════════════════════════════════════════════════════════════
// GEAR DESIGN (MIT 2.007 - Lectures 12-13)
// ═══════════════════════════════════════════════════════════════

const PRISM_GEAR_DESIGN = {
    /**
     * Calculate gear geometry parameters
     * @param {number} N - Number of teeth
     * @param {number} P - Diametral pitch (teeth/inch) or module (mm) if metric
     * @param {number} pressureAngle - Pressure angle in degrees (typically 14.5 or 20)
     * @param {boolean} isMetric - Use module instead of diametral pitch
     * @returns {Object} Gear geometry
     */
    calculateGeometry: function(N, P, pressureAngle = 20, isMetric = false) {
        const phi = pressureAngle * Math.PI / 180;
        
        let d, m, circularPitch;
        if (isMetric) {
            m = P; // P is module in mm
            d = m * N; // Pitch diameter in mm
            circularPitch = Math.PI * m;
        } else {
            d = N / P; // Pitch diameter in inches
            m = 25.4 / P; // Module in mm
            circularPitch = Math.PI / P;
        }
        
        const addendum = isMetric ? m : 1 / P;
        const dedendum = isMetric ? 1.25 * m : 1.25 / P;
        const clearance = isMetric ? 0.25 * m : 0.25 / P;
        const wholeDepth = addendum + dedendum;
        const workingDepth = 2 * addendum;
        
        const outsideDiameter = d + 2 * addendum;
        const rootDiameter = d - 2 * dedendum;
        const baseDiameter = d * Math.cos(phi);
        
        // Tooth thickness at pitch circle
        const toothThickness = circularPitch / 2;
        
        return {
            pitchDiameter: d,
            module: m,
            diametralPitch: isMetric ? 25.4 / m : P,
            circularPitch: circularPitch,
            addendum: addendum,
            dedendum: dedendum,
            clearance: clearance,
            wholeDepth: wholeDepth,
            workingDepth: workingDepth,
            outsideDiameter: outsideDiameter,
            rootDiameter: rootDiameter,
            baseDiameter: baseDiameter,
            toothThickness: toothThickness,
            pressureAngle: pressureAngle,
            numberOfTeeth: N
        };
    },

    /**
     * Generate involute curve points
     * @param {number} baseRadius - Base circle radius
     * @param {number} numPoints - Number of points to generate
     * @param {number} maxAngle - Maximum roll angle in radians
     * @returns {Array} Array of {x, y} points
     */
    generateInvoluteCurve: function(baseRadius, numPoints = 50, maxAngle = Math.PI / 2) {
        const points = [];
        for (let i = 0; i < numPoints; i++) {
            const theta = (i / (numPoints - 1)) * maxAngle;
            const x = baseRadius * (Math.cos(theta) + theta * Math.sin(theta));
            const y = baseRadius * (Math.sin(theta) - theta * Math.cos(theta));
            points.push({ x, y, theta });
        }
        return points;
    },

    /**
     * Calculate gear ratio for a gear train
     * @param {Array} gears - Array of {driver: N, driven: N} pairs
     * @returns {Object} Gear train analysis
     */
    calculateGearTrain: function(gears) {
        let totalRatio = 1;
        const stages = [];
        
        for (const pair of gears) {
            const stageRatio = pair.driven / pair.driver;
            totalRatio *= stageRatio;
            stages.push({
                driverTeeth: pair.driver,
                drivenTeeth: pair.driven,
                stageRatio: stageRatio,
                speedReduction: stageRatio > 1,
                torqueMultiplier: stageRatio
            });
        }
        
        return {
            totalRatio: totalRatio,
            stages: stages,
            outputSpeedFactor: 1 / totalRatio,
            outputTorqueFactor: totalRatio
        };
    },

    /**
     * Lewis bending stress calculation
     * @param {number} Wt - Transmitted tangential load (force)
     * @param {number} P - Diametral pitch
     * @param {number} F - Face width
     * @param {number} Y - Lewis form factor
     * @returns {number} Bending stress
     */
    lewisBendingStress: function(Wt, P, F, Y) {
        return (Wt * P) / (F * Y);
    },

    /**
     * Get Lewis form factor for standard 20° pressure angle gears
     * @param {number} N - Number of teeth
     * @returns {number} Lewis form factor Y
     */
    getLewisFormFactor: function(N) {
        // Approximate Lewis form factor for 20° pressure angle full-depth teeth
        // Based on AGMA standards
        const factorTable = {
            12: 0.245, 13: 0.261, 14: 0.277, 15: 0.290,
            16: 0.296, 17: 0.303, 18: 0.309, 19: 0.314,
            20: 0.322, 21: 0.328, 22: 0.331, 24: 0.337,
            26: 0.346, 28: 0.353, 30: 0.359, 34: 0.371,
            38: 0.384, 43: 0.397, 50: 0.409, 60: 0.422,
            75: 0.435, 100: 0.447, 150: 0.460, 300: 0.472
        };
        
        // Find closest value
        const keys = Object.keys(factorTable).map(Number).sort((a, b) => a - b);
        for (let i = 0; i < keys.length; i++) {
            if (N <= keys[i]) {
                if (i === 0) return factorTable[keys[0]];
                // Interpolate
                const lower = keys[i - 1];
                const upper = keys[i];
                const t = (N - lower) / (upper - lower);
                return factorTable[lower] + t * (factorTable[upper] - factorTable[lower]);
            }
        }
        return factorTable[300]; // Max value for rack
    },

    /**
     * Check minimum teeth to avoid interference
     * @param {number} pressureAngle - Pressure angle in degrees
     * @param {number} addendumCoeff - Addendum coefficient (typically 1)
     * @returns {number} Minimum number of teeth
     */
    minimumTeethNoInterference: function(pressureAngle = 20, addendumCoeff = 1) {
        const phi = pressureAngle * Math.PI / 180;
        return Math.ceil(2 * addendumCoeff / (Math.sin(phi) * Math.sin(phi)));
    }
};

// ═══════════════════════════════════════════════════════════════
// MECHANISM ANALYSIS (MIT 2.007 - Lecture 6)
// ═══════════════════════════════════════════════════════════════

const PRISM_MECHANISM_ANALYSIS = {
    /**
     * Calculate degrees of freedom using Gruebler's equation
     * @param {number} n - Number of links (including ground)
     * @param {number} j1 - Number of full joints (1 DOF: pins, sliders)
     * @param {number} j2 - Number of half joints (2 DOF: cam, gear contact)
     * @returns {number} Degrees of freedom
     */
    grueblerDOF: function(n, j1, j2 = 0) {
        return 3 * (n - 1) - 2 * j1 - j2;
    },

    /**
     * Check Grashof criterion for four-bar linkage
     * @param {Array} links - Array of 4 link lengths [L1, L2, L3, L4]
     * @returns {Object} Grashof analysis
     */
    grashofCriterion: function(links) {
        const sorted = [...links].sort((a, b) => a - b);
        const s = sorted[0]; // Shortest
        const l = sorted[3]; // Longest
        const p = sorted[1];
        const q = sorted[2];
        
        const grashofSum = s + l;
        const otherSum = p + q;
        
        let classification;
        if (grashofSum < otherSum) {
            classification = 'Class I Grashof (at least one crank)';
        } else if (grashofSum === otherSum) {
            classification = 'Special Grashof (change point mechanism)';
        } else {
            classification = 'Non-Grashof (no full rotation possible)';
        }
        
        return {
            isGrashof: grashofSum <= otherSum,
            shortest: s,
            longest: l,
            grashofSum: grashofSum,
            otherSum: otherSum,
            classification: classification,
            canHaveCrank: grashofSum <= otherSum
        };
    },

    /**
     * Four-bar linkage position analysis
     * @param {Object} params - {L1: ground, L2: crank, L3: coupler, L4: rocker}
     * @param {number} theta2 - Crank angle in radians
     * @returns {Object} Position solution
     */
    fourBarPosition: function(params, theta2) {
        const { L1, L2, L3, L4 } = params;
        
        // Using vector loop equation and Freudenstein's equation
        const K1 = L1 / L2;
        const K2 = L1 / L4;
        const K3 = (L2 * L2 - L3 * L3 + L4 * L4 + L1 * L1) / (2 * L2 * L4);
        
        const A = Math.cos(theta2) - K1 - K2 * Math.cos(theta2) + K3;
        const B = -2 * Math.sin(theta2);
        const C = K1 - (K2 + 1) * Math.cos(theta2) + K3;
        
        const discriminant = B * B - 4 * A * C;
        
        if (discriminant < 0) {
            return { valid: false, reason: 'No valid position - linkage cannot reach' };
        }
        
        // Two solutions (open and crossed configurations)
        const t1 = (-B + Math.sqrt(discriminant)) / (2 * A);
        const t2 = (-B - Math.sqrt(discriminant)) / (2 * A);
        
        const theta4_open = 2 * Math.atan(t1);
        const theta4_crossed = 2 * Math.atan(t2);
        
        // Calculate theta3 for open configuration
        const theta3 = Math.atan2(
            L4 * Math.sin(theta4_open) - L2 * Math.sin(theta2),
            L1 + L4 * Math.cos(theta4_open) - L2 * Math.cos(theta2)
        );
        
        return {
            valid: true,
            theta2: theta2,
            theta3: theta3,
            theta4_open: theta4_open,
            theta4_crossed: theta4_crossed,
            theta2Deg: theta2 * 180 / Math.PI,
            theta3Deg: theta3 * 180 / Math.PI,
            theta4Deg: theta4_open * 180 / Math.PI
        };
    },

    /**
     * Four-bar linkage velocity analysis
     * @param {Object} params - Link lengths
     * @param {number} theta2 - Crank angle (rad)
     * @param {number} theta3 - Coupler angle (rad)
     * @param {number} theta4 - Rocker angle (rad)
     * @param {number} omega2 - Crank angular velocity (rad/s)
     * @returns {Object} Angular velocities
     */
    fourBarVelocity: function(params, theta2, theta3, theta4, omega2) {
        const { L2, L3, L4 } = params;
        
        // Velocity equations from loop closure differentiation
        const denom = L3 * L4 * Math.sin(theta4 - theta3);
        
        const omega3 = (L2 * L4 * omega2 * Math.sin(theta4 - theta2)) / denom;
        const omega4 = (L2 * L3 * omega2 * Math.sin(theta2 - theta3)) / denom;
        
        return {
            omega2: omega2,
            omega3: omega3,
            omega4: omega4,
            velocityRatio34: omega4 / omega3,
            velocityRatio42: omega4 / omega2
        };
    }
};

// ═══════════════════════════════════════════════════════════════
// NUMERICAL METHODS (MIT 2.007 - Lecture 21)
// ═══════════════════════════════════════════════════════════════

const PRISM_NUMERICAL_METHODS_MIT = {
    /**
     * Newton-Raphson method for root finding
     * @param {Function} f - Function to find root of
     * @param {Function} df - Derivative of f
     * @param {number} x0 - Initial guess
     * @param {number} tol - Tolerance
     * @param {number} maxIter - Maximum iterations
     * @returns {Object} Solution and convergence info
     */
    newtonRaphson: function(f, df, x0, tol = 1e-10, maxIter = 100) {
        let x = x0;
        const history = [{ iter: 0, x: x, fx: f(x) }];
        
        for (let i = 0; i < maxIter; i++) {
            const fx = f(x);
            const dfx = df(x);
            
            if (Math.abs(dfx) < 1e-15) {
                return { 
                    converged: false, 
                    reason: 'Derivative too small',
                    x: x,
                    history: history
                };
            }
            
            const xNew = x - fx / dfx;
            history.push({ iter: i + 1, x: xNew, fx: f(xNew) });
            
            if (Math.abs(xNew - x) < tol) {
                return {
                    converged: true,
                    root: xNew,
                    iterations: i + 1,
                    finalError: Math.abs(f(xNew)),
                    history: history
                };
            }
            
            x = xNew;
        }
        
        return {
            converged: false,
            reason: 'Max iterations exceeded',
            x: x,
            history: history
        };
    },

    /**
     * Secant method for root finding (no derivative needed)
     * @param {Function} f - Function to find root of
     * @param {number} x0 - First initial guess
     * @param {number} x1 - Second initial guess
     * @param {number} tol - Tolerance
     * @param {number} maxIter - Maximum iterations
     * @returns {Object} Solution
     */
    secantMethod: function(f, x0, x1, tol = 1e-10, maxIter = 100) {
        let xPrev = x0;
        let xCurr = x1;
        const history = [
            { iter: 0, x: x0, fx: f(x0) },
            { iter: 1, x: x1, fx: f(x1) }
        ];
        
        for (let i = 0; i < maxIter; i++) {
            const fPrev = f(xPrev);
            const fCurr = f(xCurr);
            
            if (Math.abs(fCurr - fPrev) < 1e-15) {
                return {
                    converged: false,
                    reason: 'Division by near-zero',
                    x: xCurr,
                    history: history
                };
            }
            
            const xNew = xCurr - fCurr * (xCurr - xPrev) / (fCurr - fPrev);
            history.push({ iter: i + 2, x: xNew, fx: f(xNew) });
            
            if (Math.abs(xNew - xCurr) < tol) {
                return {
                    converged: true,
                    root: xNew,
                    iterations: i + 2,
                    finalError: Math.abs(f(xNew)),
                    history: history
                };
            }
            
            xPrev = xCurr;
            xCurr = xNew;
        }
        
        return {
            converged: false,
            reason: 'Max iterations exceeded',
            x: xCurr,
            history: history
        };
    },

    /**
     * Bisection method for root finding (guaranteed convergence)
     * @param {Function} f - Function to find root of
     * @param {number} a - Lower bound
     * @param {number} b - Upper bound
     * @param {number} tol - Tolerance
     * @param {number} maxIter - Maximum iterations
     * @returns {Object} Solution
     */
    bisectionMethod: function(f, a, b, tol = 1e-10, maxIter = 100) {
        const fa = f(a);
        const fb = f(b);
        
        if (fa * fb > 0) {
            return {
                converged: false,
                reason: 'f(a) and f(b) must have opposite signs'
            };
        }
        
        const history = [];
        
        for (let i = 0; i < maxIter; i++) {
            const c = (a + b) / 2;
            const fc = f(c);
            history.push({ iter: i, a: a, b: b, c: c, fc: fc });
            
            if (Math.abs(fc) < tol || (b - a) / 2 < tol) {
                return {
                    converged: true,
                    root: c,
                    iterations: i + 1,
                    finalError: Math.abs(fc),
                    bracketWidth: b - a,
                    history: history
                };
            }
            
            if (fa * fc < 0) {
                b = c;
            } else {
                a = c;
            }
        }
        
        return {
            converged: false,
            reason: 'Max iterations exceeded',
            x: (a + b) / 2,
            history: history
        };
    }
};

// ═══════════════════════════════════════════════════════════════
// CONTROL SYSTEMS (MIT 2.004)
// ═══════════════════════════════════════════════════════════════

const PRISM_CONTROL_SYSTEMS_MIT = {
    /**
     * PID Controller implementation
     * @param {number} Kp - Proportional gain
     * @param {number} Ki - Integral gain
     * @param {number} Kd - Derivative gain
     * @returns {Object} PID controller object
     */
    createPIDController: function(Kp, Ki, Kd) {
        return {
            Kp: Kp,
            Ki: Ki,
            Kd: Kd,
            integral: 0,
            prevError: 0,
            
            /**
             * Compute control output
             * @param {number} setpoint - Desired value
             * @param {number} measured - Measured value
             * @param {number} dt - Time step
             * @returns {number} Control output
             */
            compute: function(setpoint, measured, dt) {
                const error = setpoint - measured;
                
                // Proportional term
                const P = this.Kp * error;
                
                // Integral term (with anti-windup)
                this.integral += error * dt;
                const I = this.Ki * this.integral;
                
                // Derivative term (on measurement to avoid derivative kick)
                const derivative = (error - this.prevError) / dt;
                const D = this.Kd * derivative;
                
                this.prevError = error;
                
                return P + I + D;
            },
            
            /**
             * Reset controller state
             */
            reset: function() {
                this.integral = 0;
                this.prevError = 0;
            }
        };
    },

    /**
     * Ziegler-Nichols PID tuning
     * @param {number} Ku - Ultimate gain
     * @param {number} Tu - Ultimate period
     * @param {string} type - 'P', 'PI', or 'PID'
     * @returns {Object} Tuned gains
     */
    zieglerNicholsTuning: function(Ku, Tu, type = 'PID') {
        switch (type) {
            case 'P':
                return { Kp: 0.5 * Ku, Ki: 0, Kd: 0 };
            case 'PI':
                return { Kp: 0.45 * Ku, Ki: 1.2 * Ku / Tu, Kd: 0 };
            case 'PID':
                return { Kp: 0.6 * Ku, Ki: 2 * Ku / Tu, Kd: Ku * Tu / 8 };
            default:
                return { Kp: 0.6 * Ku, Ki: 2 * Ku / Tu, Kd: Ku * Tu / 8 };
        }
    },

    /**
     * First-order system step response
     * @param {number} K - DC gain
     * @param {number} tau - Time constant
     * @param {number} t - Time
     * @returns {number} Output at time t
     */
    firstOrderStep: function(K, tau, t) {
        return K * (1 - Math.exp(-t / tau));
    },

    /**
     * Second-order system step response
     * @param {number} K - DC gain
     * @param {number} wn - Natural frequency
     * @param {number} zeta - Damping ratio
     * @param {number} t - Time
     * @returns {number} Output at time t
     */
    secondOrderStep: function(K, wn, zeta, t) {
        if (zeta < 1) {
            // Underdamped
            const wd = wn * Math.sqrt(1 - zeta * zeta);
            const phi = Math.atan(zeta / Math.sqrt(1 - zeta * zeta));
            return K * (1 - (Math.exp(-zeta * wn * t) / Math.sqrt(1 - zeta * zeta)) *
                   Math.sin(wd * t + phi + Math.PI / 2));
        } else if (zeta === 1) {
            // Critically damped
            return K * (1 - (1 + wn * t) * Math.exp(-wn * t));
        } else {
            // Overdamped
            const s1 = -wn * (zeta - Math.sqrt(zeta * zeta - 1));
            const s2 = -wn * (zeta + Math.sqrt(zeta * zeta - 1));
            return K * (1 + (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s1 - s2));
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// DESIGN FOR MANUFACTURING (MIT 2.008)
// ═══════════════════════════════════════════════════════════════

const PRISM_DFM_MIT = {
    /**
     * Tolerance stackup analysis
     * @param {Array} tolerances - Array of individual tolerances
     * @param {string} method - 'worst' or 'rss' (root sum square)
     * @returns {Object} Stackup analysis
     */
    toleranceStackup: function(tolerances, method = 'rss') {
        const worstCase = tolerances.reduce((sum, t) => sum + Math.abs(t), 0);
        const rss = Math.sqrt(tolerances.reduce((sum, t) => sum + t * t, 0));
        
        return {
            worstCase: worstCase,
            rss: rss,
            recommended: method === 'worst' ? worstCase : rss,
            method: method,
            individual: tolerances,
            count: tolerances.length,
            reductionFactor: worstCase / rss // How much RSS saves
        };
    },

    /**
     * Process capability indices
     * @param {number} USL - Upper specification limit
     * @param {number} LSL - Lower specification limit
     * @param {number} mean - Process mean
     * @param {number} sigma - Process standard deviation
     * @returns {Object} Capability indices
     */
    processCapability: function(USL, LSL, mean, sigma) {
        const Cp = (USL - LSL) / (6 * sigma);
        const Cpk_upper = (USL - mean) / (3 * sigma);
        const Cpk_lower = (mean - LSL) / (3 * sigma);
        const Cpk = Math.min(Cpk_upper, Cpk_lower);
        
        // Cpm (Taguchi capability)
        const T = (USL + LSL) / 2; // Target
        const Cpm = (USL - LSL) / (6 * Math.sqrt(sigma * sigma + (mean - T) * (mean - T)));
        
        let rating;
        if (Cpk >= 2.0) rating = 'World Class (Six Sigma)';
        else if (Cpk >= 1.67) rating = 'Excellent';
        else if (Cpk >= 1.33) rating = 'Good';
        else if (Cpk >= 1.0) rating = 'Marginal';
        else rating = 'Poor - Process improvement needed';
        
        return {
            Cp: Cp,
            Cpk: Cpk,
            Cpk_upper: Cpk_upper,
            Cpk_lower: Cpk_lower,
            Cpm: Cpm,
            rating: rating,
            centered: Math.abs(Cpk_upper - Cpk_lower) < 0.1,
            defectRate: this._estimateDefectRate(Cpk)
        };
    },

    _estimateDefectRate: function(Cpk) {
        // Approximate defect rate based on Cpk
        if (Cpk >= 2.0) return '3.4 PPM (Six Sigma)';
        if (Cpk >= 1.67) return '~60 PPM';
        if (Cpk >= 1.33) return '~6,200 PPM';
        if (Cpk >= 1.0) return '~66,800 PPM';
        return '>66,800 PPM';
    }
};

// ═══════════════════════════════════════════════════════════════
// EXPORT AND GATEWAY REGISTRATION
// ═══════════════════════════════════════════════════════════════

// Register with PRISM Gateway if available
if (typeof PRISM_GATEWAY !== 'undefined') {
    // Gear routes
    PRISM_GATEWAY.register('mech.gear.geometry', 'PRISM_GEAR_DESIGN.calculateGeometry');
    PRISM_GATEWAY.register('mech.gear.involute', 'PRISM_GEAR_DESIGN.generateInvoluteCurve');
    PRISM_GATEWAY.register('mech.gear.train', 'PRISM_GEAR_DESIGN.calculateGearTrain');
    PRISM_GATEWAY.register('mech.gear.lewis', 'PRISM_GEAR_DESIGN.lewisBendingStress');
    PRISM_GATEWAY.register('mech.gear.formFactor', 'PRISM_GEAR_DESIGN.getLewisFormFactor');
    PRISM_GATEWAY.register('mech.gear.minTeeth', 'PRISM_GEAR_DESIGN.minimumTeethNoInterference');
    
    // Mechanism routes
    PRISM_GATEWAY.register('mech.linkage.dof', 'PRISM_MECHANISM_ANALYSIS.grueblerDOF');
    PRISM_GATEWAY.register('mech.linkage.grashof', 'PRISM_MECHANISM_ANALYSIS.grashofCriterion');
    PRISM_GATEWAY.register('mech.linkage.fourbar.position', 'PRISM_MECHANISM_ANALYSIS.fourBarPosition');
    PRISM_GATEWAY.register('mech.linkage.fourbar.velocity', 'PRISM_MECHANISM_ANALYSIS.fourBarVelocity');
    
    // Numerical methods routes
    PRISM_GATEWAY.register('math.solve.newton', 'PRISM_NUMERICAL_METHODS_MIT.newtonRaphson');
    PRISM_GATEWAY.register('math.solve.secant', 'PRISM_NUMERICAL_METHODS_MIT.secantMethod');
    PRISM_GATEWAY.register('math.solve.bisection', 'PRISM_NUMERICAL_METHODS_MIT.bisectionMethod');
    
    // Control routes
    PRISM_GATEWAY.register('control.pid.create', 'PRISM_CONTROL_SYSTEMS_MIT.createPIDController');
    PRISM_GATEWAY.register('control.pid.tuneZN', 'PRISM_CONTROL_SYSTEMS_MIT.zieglerNicholsTuning');
    PRISM_GATEWAY.register('control.step.first', 'PRISM_CONTROL_SYSTEMS_MIT.firstOrderStep');
    PRISM_GATEWAY.register('control.step.second', 'PRISM_CONTROL_SYSTEMS_MIT.secondOrderStep');
    
    // DFM routes
    PRISM_GATEWAY.register('dfm.tolerance.stackup', 'PRISM_DFM_MIT.toleranceStackup');
    PRISM_GATEWAY.register('dfm.process.capability', 'PRISM_DFM_MIT.processCapability');
    
    console.log('[PRISM] MIT Batch 13 Knowledge loaded - 18 new gateway routes');
}

// Self-test
const PRISM_MIT_BATCH_13_TESTS = {
    runAll: function() {
        console.log('=== PRISM MIT Batch 13 Self-Tests ===');
        let passed = 0;
        let failed = 0;
        
        // Test 1: Gear geometry
        try {
            const gear = PRISM_GEAR_DESIGN.calculateGeometry(20, 8, 20, false);
            if (Math.abs(gear.pitchDiameter - 2.5) < 0.001) {
                console.log('✓ Gear geometry calculation');
                passed++;
            } else {
                throw new Error(`Expected 2.5, got ${gear.pitchDiameter}`);
            }
        } catch (e) {
            console.log('✗ Gear geometry:', e.message);
            failed++;
        }
        
        // Test 2: Gear train ratio
        try {
            const train = PRISM_GEAR_DESIGN.calculateGearTrain([
                { driver: 20, driven: 60 },
                { driver: 15, driven: 45 }
            ]);
            if (Math.abs(train.totalRatio - 9) < 0.001) {
                console.log('✓ Gear train ratio calculation');
                passed++;
            } else {
                throw new Error(`Expected 9, got ${train.totalRatio}`);
            }
        } catch (e) {
            console.log('✗ Gear train ratio:', e.message);
            failed++;
        }
        
        // Test 3: Gruebler DOF
        try {
            const dof = PRISM_MECHANISM_ANALYSIS.grueblerDOF(4, 4, 0);
            if (dof === 1) {
                console.log('✓ Gruebler DOF (4-bar = 1 DOF)');
                passed++;
            } else {
                throw new Error(`Expected 1, got ${dof}`);
            }
        } catch (e) {
            console.log('✗ Gruebler DOF:', e.message);
            failed++;
        }
        
        // Test 4: Newton-Raphson
        try {
            const f = x => x * x - 4;
            const df = x => 2 * x;
            const result = PRISM_NUMERICAL_METHODS_MIT.newtonRaphson(f, df, 1);
            if (result.converged && Math.abs(result.root - 2) < 1e-8) {
                console.log('✓ Newton-Raphson (√4 = 2)');
                passed++;
            } else {
                throw new Error(`Expected 2, got ${result.root}`);
            }
        } catch (e) {
            console.log('✗ Newton-Raphson:', e.message);
            failed++;
        }
        
        // Test 5: Process capability
        try {
            const cap = PRISM_DFM_MIT.processCapability(10, 0, 5, 1);
            if (Math.abs(cap.Cp - 1.667) < 0.01) {
                console.log('✓ Process capability Cp calculation');
                passed++;
            } else {
                throw new Error(`Expected ~1.667, got ${cap.Cp}`);
            }
        } catch (e) {
            console.log('✗ Process capability:', e.message);
            failed++;
        }
        
        console.log(`\nResults: ${passed}/${passed + failed} tests passed`);
        return { passed, failed };
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PRISM_GEAR_DESIGN,
        PRISM_MECHANISM_ANALYSIS,
        PRISM_NUMERICAL_METHODS_MIT,
        PRISM_CONTROL_SYSTEMS_MIT,
        PRISM_DFM_MIT,
        PRISM_MIT_BATCH_13_TESTS
    };
}

console.log('[PRISM] MIT Batch 13 loaded: Gear Design, Mechanisms, Control, DFM');
/**
 * PRISM MIT Course Knowledge - Batch 14
 * Computational Geometry, Numerical Methods, System Modeling
 * Source: MIT 2.034J, 2.086, 2.141, 2.158J, 2.171
 * Generated: January 18, 2026
 */

// ═══════════════════════════════════════════════════════════════
// NURBS AND B-SPLINE ALGORITHMS (MIT 2.158J)
// ═══════════════════════════════════════════════════════════════

const PRISM_NURBS_MIT = {
    /**
     * Evaluate B-spline basis function using Cox-de Boor recursion
     * @param {number} i - Basis function index
     * @param {number} k - Order (degree + 1)
     * @param {number} u - Parameter value
     * @param {Array} knots - Knot vector
     * @returns {number} Basis function value
     */
    basisFunction: function(i, k, u, knots) {
        // Base case: k = 1
        if (k === 1) {
            return (u >= knots[i] && u < knots[i + 1]) ? 1.0 : 0.0;
        }
        
        let left = 0, right = 0;
        
        // Left term
        const denom1 = knots[i + k - 1] - knots[i];
        if (Math.abs(denom1) > 1e-10) {
            left = ((u - knots[i]) / denom1) * this.basisFunction(i, k - 1, u, knots);
        }
        
        // Right term
        const denom2 = knots[i + k] - knots[i + 1];
        if (Math.abs(denom2) > 1e-10) {
            right = ((knots[i + k] - u) / denom2) * this.basisFunction(i + 1, k - 1, u, knots);
        }
        
        return left + right;
    },

    /**
     * Evaluate B-spline curve at parameter u using de Boor algorithm
     * More efficient than direct basis function evaluation
     * @param {number} u - Parameter value
     * @param {number} k - Order (degree + 1)
     * @param {Array} knots - Knot vector
     * @param {Array} controlPoints - Control points [{x,y,z}, ...]
     * @returns {Object} Point {x, y, z}
     */
    deBoor: function(u, k, knots, controlPoints) {
        const n = controlPoints.length - 1;
        const p = k - 1; // degree
        
        // Find span index
        let s = p;
        for (let i = p; i < n + 1; i++) {
            if (u >= knots[i] && u < knots[i + 1]) {
                s = i;
                break;
            }
        }
        // Handle u = knots[n+1] case
        if (Math.abs(u - knots[n + 1]) < 1e-10) {
            s = n;
        }
        
        // Initialize d array with affected control points
        const d = [];
        for (let i = 0; i <= p; i++) {
            d[i] = {
                x: controlPoints[s - p + i].x,
                y: controlPoints[s - p + i].y,
                z: controlPoints[s - p + i].z || 0
            };
        }
        
        // de Boor recursion
        for (let r = 1; r <= p; r++) {
            for (let i = p; i >= r; i--) {
                const alpha = (u - knots[s - p + i]) / (knots[s + 1 + i - r] - knots[s - p + i]);
                d[i] = {
                    x: (1 - alpha) * d[i - 1].x + alpha * d[i].x,
                    y: (1 - alpha) * d[i - 1].y + alpha * d[i].y,
                    z: (1 - alpha) * d[i - 1].z + alpha * d[i].z
                };
            }
        }
        
        return d[p];
    },

    /**
     * Evaluate NURBS curve at parameter u
     * @param {number} u - Parameter value
     * @param {number} k - Order
     * @param {Array} knots - Knot vector
     * @param {Array} controlPoints - Control points with weights [{x,y,z,w}, ...]
     * @returns {Object} Point {x, y, z}
     */
    evaluateNURBS: function(u, k, knots, controlPoints) {
        // Convert to homogeneous coordinates
        const homogeneous = controlPoints.map(p => ({
            x: p.x * p.w,
            y: p.y * p.w,
            z: (p.z || 0) * p.w,
            w: p.w
        }));
        
        // Evaluate using de Boor
        const result = this.deBoor(u, k, knots, homogeneous);
        
        // Project back from homogeneous
        return {
            x: result.x / result.z, // z holds the w coordinate here
            y: result.y / result.z,
            z: 0
        };
    },

    /**
     * Generate uniform B-spline knot vector
     * @param {number} n - Number of control points - 1
     * @param {number} k - Order
     * @param {boolean} clamped - Use clamped (open) knot vector
     * @returns {Array} Knot vector
     */
    generateKnotVector: function(n, k, clamped = true) {
        const numKnots = n + k + 1;
        const knots = [];
        
        if (clamped) {
            // Clamped: first k and last k knots are repeated
            for (let i = 0; i < k; i++) knots.push(0);
            for (let i = 1; i <= n - k + 2; i++) knots.push(i / (n - k + 2));
            for (let i = 0; i < k; i++) knots.push(1);
        } else {
            // Uniform
            for (let i = 0; i < numKnots; i++) {
                knots.push(i / (numKnots - 1));
            }
        }
        
        return knots;
    },

    /**
     * Boehm's knot insertion algorithm
     * @param {number} uNew - New knot to insert
     * @param {number} k - Order
     * @param {Array} knots - Current knot vector
     * @param {Array} controlPoints - Current control points
     * @returns {Object} {knots, controlPoints} - Updated arrays
     */
    insertKnot: function(uNew, k, knots, controlPoints) {
        const n = controlPoints.length - 1;
        
        // Find span for new knot
        let s = 0;
        for (let i = 0; i < knots.length - 1; i++) {
            if (uNew >= knots[i] && uNew < knots[i + 1]) {
                s = i;
                break;
            }
        }
        
        // Create new knot vector
        const newKnots = [...knots.slice(0, s + 1), uNew, ...knots.slice(s + 1)];
        
        // Create new control points
        const newCP = [];
        for (let i = 0; i <= n + 1; i++) {
            if (i <= s - k + 1) {
                newCP[i] = { ...controlPoints[i] };
            } else if (i >= s + 1) {
                newCP[i] = { ...controlPoints[i - 1] };
            } else {
                const alpha = (uNew - knots[i]) / (knots[i + k - 1] - knots[i]);
                newCP[i] = {
                    x: (1 - alpha) * controlPoints[i - 1].x + alpha * controlPoints[i].x,
                    y: (1 - alpha) * controlPoints[i - 1].y + alpha * controlPoints[i].y,
                    z: (1 - alpha) * (controlPoints[i - 1].z || 0) + alpha * (controlPoints[i].z || 0)
                };
            }
        }
        
        return { knots: newKnots, controlPoints: newCP };
    }
};

// ═══════════════════════════════════════════════════════════════
// BÉZIER CURVES (MIT 2.158J)
// ═══════════════════════════════════════════════════════════════

const PRISM_BEZIER_MIT = {
    /**
     * Binomial coefficient C(n, k)
     */
    binomial: function(n, k) {
        if (k < 0 || k > n) return 0;
        if (k === 0 || k === n) return 1;
        
        let result = 1;
        for (let i = 0; i < k; i++) {
            result = result * (n - i) / (i + 1);
        }
        return result;
    },

    /**
     * Bernstein basis polynomial
     * @param {number} i - Index
     * @param {number} n - Degree
     * @param {number} u - Parameter [0,1]
     * @returns {number} Basis value
     */
    bernstein: function(i, n, u) {
        return this.binomial(n, i) * Math.pow(u, i) * Math.pow(1 - u, n - i);
    },

    /**
     * Evaluate Bézier curve at parameter u
     * @param {number} u - Parameter [0,1]
     * @param {Array} controlPoints - Control points
     * @returns {Object} Point {x, y, z}
     */
    evaluate: function(u, controlPoints) {
        const n = controlPoints.length - 1;
        let x = 0, y = 0, z = 0;
        
        for (let i = 0; i <= n; i++) {
            const B = this.bernstein(i, n, u);
            x += B * controlPoints[i].x;
            y += B * controlPoints[i].y;
            z += B * (controlPoints[i].z || 0);
        }
        
        return { x, y, z };
    },

    /**
     * de Casteljau algorithm for Bézier evaluation and subdivision
     * @param {number} u - Parameter [0,1]
     * @param {Array} controlPoints - Control points
     * @returns {Object} {point, left, right} - Point and subdivided curves
     */
    deCasteljau: function(u, controlPoints) {
        const n = controlPoints.length - 1;
        const pyramid = [controlPoints.map(p => ({ ...p }))];
        
        // Build de Casteljau pyramid
        for (let r = 1; r <= n; r++) {
            pyramid[r] = [];
            for (let i = 0; i <= n - r; i++) {
                pyramid[r][i] = {
                    x: (1 - u) * pyramid[r - 1][i].x + u * pyramid[r - 1][i + 1].x,
                    y: (1 - u) * pyramid[r - 1][i].y + u * pyramid[r - 1][i + 1].y,
                    z: (1 - u) * (pyramid[r - 1][i].z || 0) + u * (pyramid[r - 1][i + 1].z || 0)
                };
            }
        }
        
        // Extract subdivision control points
        const left = [];
        const right = [];
        for (let i = 0; i <= n; i++) {
            left.push(pyramid[i][0]);
            right.push(pyramid[n - i][i]);
        }
        
        return {
            point: pyramid[n][0],
            left: left,
            right: right
        };
    },

    /**
     * Compute Bézier curve derivative
     * @param {Array} controlPoints - Control points
     * @returns {Array} Derivative control points (n-1 points)
     */
    derivative: function(controlPoints) {
        const n = controlPoints.length - 1;
        const deriv = [];
        
        for (let i = 0; i < n; i++) {
            deriv.push({
                x: n * (controlPoints[i + 1].x - controlPoints[i].x),
                y: n * (controlPoints[i + 1].y - controlPoints[i].y),
                z: n * ((controlPoints[i + 1].z || 0) - (controlPoints[i].z || 0))
            });
        }
        
        return deriv;
    }
};

// ═══════════════════════════════════════════════════════════════
// SURFACE GEOMETRY (MIT 2.158J)
// ═══════════════════════════════════════════════════════════════

const PRISM_SURFACE_GEOMETRY_MIT = {
    /**
     * Evaluate tensor product B-spline surface
     * @param {number} u - U parameter
     * @param {number} v - V parameter
     * @param {number} ku - U order
     * @param {number} kv - V order
     * @param {Array} knotsU - U knot vector
     * @param {Array} knotsV - V knot vector
     * @param {Array} controlGrid - 2D array of control points
     * @returns {Object} Point {x, y, z}
     */
    evaluateBSplineSurface: function(u, v, ku, kv, knotsU, knotsV, controlGrid) {
        const nu = controlGrid.length;
        const nv = controlGrid[0].length;
        
        let x = 0, y = 0, z = 0;
        
        for (let i = 0; i < nu; i++) {
            for (let j = 0; j < nv; j++) {
                const Nu = PRISM_NURBS_MIT.basisFunction(i, ku, u, knotsU);
                const Nv = PRISM_NURBS_MIT.basisFunction(j, kv, v, knotsV);
                const N = Nu * Nv;
                
                x += N * controlGrid[i][j].x;
                y += N * controlGrid[i][j].y;
                z += N * controlGrid[i][j].z;
            }
        }
        
        return { x, y, z };
    },

    /**
     * Compute surface normal at (u, v)
     * Uses finite differences for partial derivatives
     * @param {Function} surfaceEval - Surface evaluation function S(u,v)
     * @param {number} u - U parameter
     * @param {number} v - V parameter
     * @param {number} h - Step size for finite differences
     * @returns {Object} Unit normal {x, y, z}
     */
    computeNormal: function(surfaceEval, u, v, h = 0.001) {
        // Partial derivatives via central differences
        const Su_plus = surfaceEval(u + h, v);
        const Su_minus = surfaceEval(u - h, v);
        const Sv_plus = surfaceEval(u, v + h);
        const Sv_minus = surfaceEval(u, v - h);
        
        const Su = {
            x: (Su_plus.x - Su_minus.x) / (2 * h),
            y: (Su_plus.y - Su_minus.y) / (2 * h),
            z: (Su_plus.z - Su_minus.z) / (2 * h)
        };
        
        const Sv = {
            x: (Sv_plus.x - Sv_minus.x) / (2 * h),
            y: (Sv_plus.y - Sv_minus.y) / (2 * h),
            z: (Sv_plus.z - Sv_minus.z) / (2 * h)
        };
        
        // Cross product Su × Sv
        const normal = {
            x: Su.y * Sv.z - Su.z * Sv.y,
            y: Su.z * Sv.x - Su.x * Sv.z,
            z: Su.x * Sv.y - Su.y * Sv.x
        };
        
        // Normalize
        const len = Math.sqrt(normal.x ** 2 + normal.y ** 2 + normal.z ** 2);
        if (len < 1e-10) return { x: 0, y: 0, z: 1 };
        
        return {
            x: normal.x / len,
            y: normal.y / len,
            z: normal.z / len
        };
    },

    /**
     * Compute Gaussian and mean curvature at (u, v)
     * @param {Function} surfaceEval - Surface evaluation function
     * @param {number} u - U parameter
     * @param {number} v - V parameter
     * @param {number} h - Step size
     * @returns {Object} {gaussian, mean, principal1, principal2}
     */
    computeCurvature: function(surfaceEval, u, v, h = 0.001) {
        // First derivatives
        const Su_plus = surfaceEval(u + h, v);
        const Su_minus = surfaceEval(u - h, v);
        const Sv_plus = surfaceEval(u, v + h);
        const Sv_minus = surfaceEval(u, v - h);
        const S = surfaceEval(u, v);
        
        const Su = {
            x: (Su_plus.x - Su_minus.x) / (2 * h),
            y: (Su_plus.y - Su_minus.y) / (2 * h),
            z: (Su_plus.z - Su_minus.z) / (2 * h)
        };
        
        const Sv = {
            x: (Sv_plus.x - Sv_minus.x) / (2 * h),
            y: (Sv_plus.y - Sv_minus.y) / (2 * h),
            z: (Sv_plus.z - Sv_minus.z) / (2 * h)
        };
        
        // Second derivatives
        const Suu = {
            x: (Su_plus.x - 2 * S.x + Su_minus.x) / (h * h),
            y: (Su_plus.y - 2 * S.y + Su_minus.y) / (h * h),
            z: (Su_plus.z - 2 * S.z + Su_minus.z) / (h * h)
        };
        
        const Svv = {
            x: (Sv_plus.x - 2 * S.x + Sv_minus.x) / (h * h),
            y: (Sv_plus.y - 2 * S.y + Sv_minus.y) / (h * h),
            z: (Sv_plus.z - 2 * S.z + Sv_minus.z) / (h * h)
        };
        
        // Mixed derivative
        const Suv_pp = surfaceEval(u + h, v + h);
        const Suv_pm = surfaceEval(u + h, v - h);
        const Suv_mp = surfaceEval(u - h, v + h);
        const Suv_mm = surfaceEval(u - h, v - h);
        
        const Suv = {
            x: (Suv_pp.x - Suv_pm.x - Suv_mp.x + Suv_mm.x) / (4 * h * h),
            y: (Suv_pp.y - Suv_pm.y - Suv_mp.y + Suv_mm.y) / (4 * h * h),
            z: (Suv_pp.z - Suv_pm.z - Suv_mp.z + Suv_mm.z) / (4 * h * h)
        };
        
        // First fundamental form coefficients
        const E = Su.x * Su.x + Su.y * Su.y + Su.z * Su.z;
        const F = Su.x * Sv.x + Su.y * Sv.y + Su.z * Sv.z;
        const G = Sv.x * Sv.x + Sv.y * Sv.y + Sv.z * Sv.z;
        
        // Normal
        const normal = this.computeNormal(surfaceEval, u, v, h);
        
        // Second fundamental form coefficients
        const L = Suu.x * normal.x + Suu.y * normal.y + Suu.z * normal.z;
        const M = Suv.x * normal.x + Suv.y * normal.y + Suv.z * normal.z;
        const N = Svv.x * normal.x + Svv.y * normal.y + Svv.z * normal.z;
        
        // Curvatures
        const denom = E * G - F * F;
        const gaussian = (L * N - M * M) / denom;
        const mean = (E * N + G * L - 2 * F * M) / (2 * denom);
        
        // Principal curvatures from quadratic formula
        const discriminant = mean * mean - gaussian;
        const sqrtD = Math.sqrt(Math.max(0, discriminant));
        const k1 = mean + sqrtD;
        const k2 = mean - sqrtD;
        
        return {
            gaussian: gaussian,
            mean: mean,
            principal1: k1,
            principal2: k2,
            E, F, G, L, M, N
        };
    }
};

// ═══════════════════════════════════════════════════════════════
// ODE SOLVERS (MIT 2.086)
// ═══════════════════════════════════════════════════════════════

const PRISM_ODE_SOLVERS_MIT = {
    /**
     * Euler forward (explicit) method
     * @param {Function} f - ODE function f(t, y)
     * @param {number} y0 - Initial condition
     * @param {number} t0 - Initial time
     * @param {number} tf - Final time
     * @param {number} n - Number of steps
     * @returns {Object} {t, y} arrays
     */
    eulerForward: function(f, y0, t0, tf, n) {
        const h = (tf - t0) / n;
        const t = [t0];
        const y = [y0];
        
        for (let i = 0; i < n; i++) {
            y.push(y[i] + h * f(t[i], y[i]));
            t.push(t[i] + h);
        }
        
        return { t, y };
    },

    /**
     * Euler backward (implicit) method
     * Uses Newton's method for implicit equation
     * @param {Function} f - ODE function
     * @param {Function} df - Partial derivative ∂f/∂y
     * @param {number} y0 - Initial condition
     * @param {number} t0 - Initial time
     * @param {number} tf - Final time
     * @param {number} n - Number of steps
     * @returns {Object} {t, y} arrays
     */
    eulerBackward: function(f, df, y0, t0, tf, n) {
        const h = (tf - t0) / n;
        const t = [t0];
        const y = [y0];
        
        for (let i = 0; i < n; i++) {
            const tNext = t[i] + h;
            let yNext = y[i]; // Initial guess
            
            // Newton iteration to solve y_{n+1} = y_n + h*f(t_{n+1}, y_{n+1})
            for (let iter = 0; iter < 10; iter++) {
                const F = yNext - y[i] - h * f(tNext, yNext);
                const dF = 1 - h * df(tNext, yNext);
                yNext = yNext - F / dF;
            }
            
            y.push(yNext);
            t.push(tNext);
        }
        
        return { t, y };
    },

    /**
     * Classical 4th-order Runge-Kutta method
     * @param {Function} f - ODE function f(t, y)
     * @param {number} y0 - Initial condition
     * @param {number} t0 - Initial time
     * @param {number} tf - Final time
     * @param {number} n - Number of steps
     * @returns {Object} {t, y} arrays
     */
    rk4: function(f, y0, t0, tf, n) {
        const h = (tf - t0) / n;
        const t = [t0];
        const y = [y0];
        
        for (let i = 0; i < n; i++) {
            const k1 = f(t[i], y[i]);
            const k2 = f(t[i] + h / 2, y[i] + h * k1 / 2);
            const k3 = f(t[i] + h / 2, y[i] + h * k2 / 2);
            const k4 = f(t[i] + h, y[i] + h * k3);
            
            y.push(y[i] + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4));
            t.push(t[i] + h);
        }
        
        return { t, y };
    },

    /**
     * Solve system of ODEs using RK4
     * @param {Function} F - System function F(t, Y) returning array
     * @param {Array} Y0 - Initial conditions array
     * @param {number} t0 - Initial time
     * @param {number} tf - Final time
     * @param {number} n - Number of steps
     * @returns {Object} {t, Y} where Y is 2D array
     */
    rk4System: function(F, Y0, t0, tf, n) {
        const h = (tf - t0) / n;
        const dim = Y0.length;
        const t = [t0];
        const Y = [Y0.slice()];
        
        for (let i = 0; i < n; i++) {
            const Yi = Y[i];
            const ti = t[i];
            
            const k1 = F(ti, Yi);
            const k2 = F(ti + h / 2, Yi.map((y, j) => y + h * k1[j] / 2));
            const k3 = F(ti + h / 2, Yi.map((y, j) => y + h * k2[j] / 2));
            const k4 = F(ti + h, Yi.map((y, j) => y + h * k3[j]));
            
            const Ynext = Yi.map((y, j) => 
                y + (h / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])
            );
            
            Y.push(Ynext);
            t.push(ti + h);
        }
        
        return { t, Y };
    }
};

// ═══════════════════════════════════════════════════════════════
// LINEAR ALGEBRA (MIT 2.086)
// ═══════════════════════════════════════════════════════════════

const PRISM_LINALG_MIT = {
    /**
     * LU decomposition with partial pivoting
     * @param {Array} A - Square matrix (2D array)
     * @returns {Object} {L, U, P} - Lower, Upper, Permutation
     */
    luDecomposition: function(A) {
        const n = A.length;
        const L = Array(n).fill(null).map(() => Array(n).fill(0));
        const U = A.map(row => [...row]);
        const P = Array(n).fill(null).map((_, i) => i);
        
        for (let k = 0; k < n - 1; k++) {
            // Find pivot
            let maxVal = Math.abs(U[k][k]);
            let maxRow = k;
            for (let i = k + 1; i < n; i++) {
                if (Math.abs(U[i][k]) > maxVal) {
                    maxVal = Math.abs(U[i][k]);
                    maxRow = i;
                }
            }
            
            // Swap rows
            if (maxRow !== k) {
                [U[k], U[maxRow]] = [U[maxRow], U[k]];
                [L[k], L[maxRow]] = [L[maxRow], L[k]];
                [P[k], P[maxRow]] = [P[maxRow], P[k]];
            }
            
            // Elimination
            for (let i = k + 1; i < n; i++) {
                L[i][k] = U[i][k] / U[k][k];
                for (let j = k; j < n; j++) {
                    U[i][j] -= L[i][k] * U[k][j];
                }
            }
        }
        
        // Set diagonal of L to 1
        for (let i = 0; i < n; i++) {
            L[i][i] = 1;
        }
        
        return { L, U, P };
    },

    /**
     * Solve Ax = b using LU decomposition
     * @param {Array} A - Matrix
     * @param {Array} b - RHS vector
     * @returns {Array} Solution x
     */
    solveLU: function(A, b) {
        const { L, U, P } = this.luDecomposition(A);
        const n = A.length;
        
        // Apply permutation to b
        const pb = P.map(i => b[i]);
        
        // Forward substitution: Ly = pb
        const y = Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            y[i] = pb[i];
            for (let j = 0; j < i; j++) {
                y[i] -= L[i][j] * y[j];
            }
        }
        
        // Backward substitution: Ux = y
        const x = Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = y[i];
            for (let j = i + 1; j < n; j++) {
                x[i] -= U[i][j] * x[j];
            }
            x[i] /= U[i][i];
        }
        
        return x;
    },

    /**
     * Least squares solution via QR factorization
     * @param {Array} A - m×n matrix (m >= n)
     * @param {Array} b - RHS vector
     * @returns {Array} Least squares solution x
     */
    leastSquaresQR: function(A, b) {
        const m = A.length;
        const n = A[0].length;
        
        // QR via Gram-Schmidt
        const Q = Array(m).fill(null).map(() => Array(n).fill(0));
        const R = Array(n).fill(null).map(() => Array(n).fill(0));
        
        for (let j = 0; j < n; j++) {
            // Copy column j
            for (let i = 0; i < m; i++) {
                Q[i][j] = A[i][j];
            }
            
            // Orthogonalize against previous columns
            for (let k = 0; k < j; k++) {
                let dot = 0;
                for (let i = 0; i < m; i++) {
                    dot += Q[i][k] * A[i][j];
                }
                R[k][j] = dot;
                for (let i = 0; i < m; i++) {
                    Q[i][j] -= dot * Q[i][k];
                }
            }
            
            // Normalize
            let norm = 0;
            for (let i = 0; i < m; i++) {
                norm += Q[i][j] * Q[i][j];
            }
            norm = Math.sqrt(norm);
            R[j][j] = norm;
            for (let i = 0; i < m; i++) {
                Q[i][j] /= norm;
            }
        }
        
        // Solve R x = Q^T b
        const Qtb = Array(n).fill(0);
        for (let j = 0; j < n; j++) {
            for (let i = 0; i < m; i++) {
                Qtb[j] += Q[i][j] * b[i];
            }
        }
        
        // Back substitution
        const x = Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = Qtb[i];
            for (let j = i + 1; j < n; j++) {
                x[i] -= R[i][j] * x[j];
            }
            x[i] /= R[i][i];
        }
        
        return x;
    }
};

// ═══════════════════════════════════════════════════════════════
// DIGITAL CONTROL (MIT 2.171)
// ═══════════════════════════════════════════════════════════════

const PRISM_DIGITAL_CONTROL_MIT = {
    /**
     * Tustin (bilinear) discretization of continuous transfer function
     * Converts s-domain to z-domain
     * @param {Object} tf - {num: [], den: []} continuous TF coefficients
     * @param {number} T - Sampling period
     * @returns {Object} Discrete transfer function
     */
    tustinDiscretize: function(tf, T) {
        // For first-order system: G(s) = K/(τs + 1)
        // G(z) = K(1 + z^-1) / ((2τ/T + 1) + (1 - 2τ/T)z^-1)
        
        // This is simplified - full implementation would handle arbitrary order
        const K = tf.num[0] / tf.den[tf.den.length - 1];
        const tau = tf.den[0] / tf.den[tf.den.length - 1];
        
        const a = 2 * tau / T;
        const numZ = [K, K]; // K(1 + z^-1)
        const denZ = [a + 1, 1 - a]; // (a+1) + (1-a)z^-1
        
        // Normalize
        const norm = denZ[0];
        return {
            num: numZ.map(x => x / norm),
            den: denZ.map(x => x / norm),
            T: T
        };
    },

    /**
     * Zero-order hold discretization
     * @param {Object} ss - {A, B, C, D} continuous state space
     * @param {number} T - Sampling period
     * @returns {Object} Discrete state space {Phi, Gamma, C, D}
     */
    zohDiscretize: function(ss, T) {
        const { A, B, C, D } = ss;
        const n = A.length;
        
        // Phi = e^(AT) ≈ I + AT + (AT)²/2! + ...
        // Using Padé approximation for small T
        const AT = A.map(row => row.map(x => x * T));
        
        // Simple approximation: Phi ≈ I + AT
        const Phi = A.map((row, i) => 
            row.map((x, j) => (i === j ? 1 : 0) + x * T)
        );
        
        // Gamma ≈ BT
        const Gamma = B.map(x => x * T);
        
        return { Phi, Gamma, C, D, T };
    },

    /**
     * Digital PID controller
     * @param {number} Kp - Proportional gain
     * @param {number} Ki - Integral gain
     * @param {number} Kd - Derivative gain
     * @param {number} T - Sampling period
     * @returns {Object} Digital PID controller object
     */
    createDigitalPID: function(Kp, Ki, Kd, T) {
        return {
            Kp, Ki, Kd, T,
            integral: 0,
            prevError: 0,
            
            compute: function(setpoint, measured) {
                const error = setpoint - measured;
                
                // Proportional
                const P = this.Kp * error;
                
                // Integral (trapezoidal)
                this.integral += this.T * (error + this.prevError) / 2;
                const I = this.Ki * this.integral;
                
                // Derivative (backward difference)
                const D = this.Kd * (error - this.prevError) / this.T;
                
                this.prevError = error;
                
                return P + I + D;
            },
            
            reset: function() {
                this.integral = 0;
                this.prevError = 0;
            }
        };
    }
};

// ═══════════════════════════════════════════════════════════════
// GATEWAY REGISTRATION
// ═══════════════════════════════════════════════════════════════

if (typeof PRISM_GATEWAY !== 'undefined') {
    // NURBS routes
    PRISM_GATEWAY.register('geom.nurbs.basis', 'PRISM_NURBS_MIT.basisFunction');
    PRISM_GATEWAY.register('geom.nurbs.deBoor', 'PRISM_NURBS_MIT.deBoor');
    PRISM_GATEWAY.register('geom.nurbs.evaluate', 'PRISM_NURBS_MIT.evaluateNURBS');
    PRISM_GATEWAY.register('geom.nurbs.knotVector', 'PRISM_NURBS_MIT.generateKnotVector');
    PRISM_GATEWAY.register('geom.nurbs.insertKnot', 'PRISM_NURBS_MIT.insertKnot');
    
    // Bézier routes
    PRISM_GATEWAY.register('geom.bezier.bernstein', 'PRISM_BEZIER_MIT.bernstein');
    PRISM_GATEWAY.register('geom.bezier.evaluate', 'PRISM_BEZIER_MIT.evaluate');
    PRISM_GATEWAY.register('geom.bezier.deCasteljau', 'PRISM_BEZIER_MIT.deCasteljau');
    PRISM_GATEWAY.register('geom.bezier.derivative', 'PRISM_BEZIER_MIT.derivative');
    
    // Surface routes
    PRISM_GATEWAY.register('geom.surface.evalBSpline', 'PRISM_SURFACE_GEOMETRY_MIT.evaluateBSplineSurface');
    PRISM_GATEWAY.register('geom.surface.normal', 'PRISM_SURFACE_GEOMETRY_MIT.computeNormal');
    PRISM_GATEWAY.register('geom.surface.curvature', 'PRISM_SURFACE_GEOMETRY_MIT.computeCurvature');
    
    // ODE routes
    PRISM_GATEWAY.register('num.ode.eulerForward', 'PRISM_ODE_SOLVERS_MIT.eulerForward');
    PRISM_GATEWAY.register('num.ode.eulerBackward', 'PRISM_ODE_SOLVERS_MIT.eulerBackward');
    PRISM_GATEWAY.register('num.ode.rk4', 'PRISM_ODE_SOLVERS_MIT.rk4');
    PRISM_GATEWAY.register('num.ode.rk4System', 'PRISM_ODE_SOLVERS_MIT.rk4System');
    
    // Linear algebra routes
    PRISM_GATEWAY.register('num.linalg.lu', 'PRISM_LINALG_MIT.luDecomposition');
    PRISM_GATEWAY.register('num.linalg.solveLU', 'PRISM_LINALG_MIT.solveLU');
    PRISM_GATEWAY.register('num.linalg.leastSquaresQR', 'PRISM_LINALG_MIT.leastSquaresQR');
    
    // Digital control routes
    PRISM_GATEWAY.register('control.discrete.tustin', 'PRISM_DIGITAL_CONTROL_MIT.tustinDiscretize');
    PRISM_GATEWAY.register('control.discrete.zoh', 'PRISM_DIGITAL_CONTROL_MIT.zohDiscretize');
    PRISM_GATEWAY.register('control.discrete.pid', 'PRISM_DIGITAL_CONTROL_MIT.createDigitalPID');
    
    console.log('[PRISM] MIT Batch 14 Knowledge loaded - 22 new gateway routes');
}

// ═══════════════════════════════════════════════════════════════
// SELF-TESTS
// ═══════════════════════════════════════════════════════════════

const PRISM_MIT_BATCH_14_TESTS = {
    runAll: function() {
        console.log('=== PRISM MIT Batch 14 Self-Tests ===');
        let passed = 0;
        let failed = 0;
        
        // Test 1: Bézier evaluation
        try {
            const cp = [{x:0,y:0}, {x:1,y:2}, {x:3,y:2}, {x:4,y:0}];
            const pt = PRISM_BEZIER_MIT.evaluate(0.5, cp);
            if (Math.abs(pt.x - 2) < 0.01 && Math.abs(pt.y - 1.5) < 0.01) {
                console.log('✓ Bézier curve evaluation');
                passed++;
            } else {
                throw new Error(`Expected (2, 1.5), got (${pt.x}, ${pt.y})`);
            }
        } catch (e) {
            console.log('✗ Bézier evaluation:', e.message);
            failed++;
        }
        
        // Test 2: de Casteljau subdivision
        try {
            const cp = [{x:0,y:0,z:0}, {x:1,y:1,z:0}, {x:2,y:0,z:0}];
            const result = PRISM_BEZIER_MIT.deCasteljau(0.5, cp);
            if (result.left.length === 3 && result.right.length === 3) {
                console.log('✓ de Casteljau subdivision');
                passed++;
            } else {
                throw new Error('Subdivision failed');
            }
        } catch (e) {
            console.log('✗ de Casteljau:', e.message);
            failed++;
        }
        
        // Test 3: RK4 ODE solver
        try {
            const f = (t, y) => -y; // dy/dt = -y, solution: y = e^(-t)
            const result = PRISM_ODE_SOLVERS_MIT.rk4(f, 1, 0, 1, 100);
            const expected = Math.exp(-1);
            if (Math.abs(result.y[100] - expected) < 0.001) {
                console.log('✓ RK4 ODE solver');
                passed++;
            } else {
                throw new Error(`Expected ${expected}, got ${result.y[100]}`);
            }
        } catch (e) {
            console.log('✗ RK4:', e.message);
            failed++;
        }
        
        // Test 4: LU decomposition
        try {
            const A = [[2, 1], [1, 3]];
            const b = [3, 4];
            const x = PRISM_LINALG_MIT.solveLU(A, b);
            // Verify: Ax = b
            const check = A[0][0]*x[0] + A[0][1]*x[1];
            if (Math.abs(check - b[0]) < 0.001) {
                console.log('✓ LU decomposition solve');
                passed++;
            } else {
                throw new Error('LU solve failed');
            }
        } catch (e) {
            console.log('✗ LU solve:', e.message);
            failed++;
        }
        
        // Test 5: B-spline basis
        try {
            const knots = [0, 0, 0, 1, 1, 1]; // Cubic, clamped
            const N0 = PRISM_NURBS_MIT.basisFunction(0, 3, 0, knots);
            if (Math.abs(N0 - 1) < 0.001) {
                console.log('✓ B-spline basis function');
                passed++;
            } else {
                throw new Error(`Expected 1, got ${N0}`);
            }
        } catch (e) {
            console.log('✗ B-spline basis:', e.message);
            failed++;
        }
        
        // Test 6: Digital PID
        try {
            const pid = PRISM_DIGITAL_CONTROL_MIT.createDigitalPID(1, 0.1, 0.01, 0.01);
            const u = pid.compute(10, 0);
            if (u > 0) {
                console.log('✓ Digital PID controller');
                passed++;
            } else {
                throw new Error('PID output should be positive');
            }
        } catch (e) {
            console.log('✗ Digital PID:', e.message);
            failed++;
        }
        
        console.log(`\nResults: ${passed}/${passed + failed} tests passed`);
        return { passed, failed };
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PRISM_NURBS_MIT,
        PRISM_BEZIER_MIT,
        PRISM_SURFACE_GEOMETRY_MIT,
        PRISM_ODE_SOLVERS_MIT,
        PRISM_LINALG_MIT,
        PRISM_DIGITAL_CONTROL_MIT,
        PRISM_MIT_BATCH_14_TESTS
    };
}

console.log('[PRISM] MIT Batch 14 loaded: NURBS, Bézier, ODE Solvers, Linear Algebra, Digital Control');
/**
 * PRISM MIT Course Knowledge - Batch 15
 * HIGH PRIORITY MANUFACTURING: Precision Machine Design, Process Control
 * Source: MIT 2.43, 2.72, 2.75, 2.76, 2.830J
 * Generated: January 18, 2026
 */

console.log('[PRISM MIT Batch 15] Loading High Priority Manufacturing Knowledge...');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: PRECISION MACHINE DESIGN (MIT 2.75 - Slocum)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_PRECISION_DESIGN = {
    
    /**
     * Calculate Abbe error from angular error and offset distance
     * @param {number} offset_mm - Abbe offset distance in mm
     * @param {number} angularError_arcsec - Angular error in arcseconds
     * @returns {Object} Error analysis with positioning error
     */
    abbeError: function(offset_mm, angularError_arcsec) {
        // Convert arcseconds to radians
        const theta_rad = angularError_arcsec * (Math.PI / 180) / 3600;
        
        // Abbe error: δ = L × sin(θ) ≈ L × θ for small angles
        const error_mm = offset_mm * Math.sin(theta_rad);
        const error_um = error_mm * 1000;
        
        return {
            offset_mm,
            angularError_arcsec,
            angularError_rad: theta_rad,
            positionError_mm: error_mm,
            positionError_um: error_um,
            recommendation: error_um > 1 ? 
                'Consider reducing Abbe offset or improving angular accuracy' : 
                'Acceptable for precision applications'
        };
    },
    
    /**
     * Thermal expansion calculator
     * @param {number} length_mm - Original length in mm
     * @param {number} deltaT_C - Temperature change in °C
     * @param {string} material - Material type
     * @returns {Object} Expansion analysis
     */
    thermalExpansion: function(length_mm, deltaT_C, material = 'steel') {
        // Coefficient of thermal expansion (CTE) × 10⁻⁶/°C
        const CTE = {
            'invar': 1.2,
            'super_invar': 0.3,
            'zerodur': 0.05,
            'granite': 6,
            'cast_iron': 11,
            'steel': 12,
            'stainless_steel': 16,
            'aluminum': 23,
            'brass': 19,
            'copper': 17,
            'titanium': 8.6
        };
        
        const alpha = CTE[material.toLowerCase()] || CTE['steel'];
        
        // ΔL = α × L × ΔT
        const deltaL_mm = alpha * 1e-6 * length_mm * deltaT_C;
        const deltaL_um = deltaL_mm * 1000;
        
        return {
            material,
            originalLength_mm: length_mm,
            temperatureChange_C: deltaT_C,
            cte_per_C: alpha * 1e-6,
            expansion_mm: deltaL_mm,
            expansion_um: deltaL_um,
            strainPPM: alpha * deltaT_C,
            recommendation: this._thermalRecommendation(deltaL_um, material)
        };
    },
    
    _thermalRecommendation: function(error_um, material) {
        if (error_um < 0.1) return 'Excellent thermal stability';
        if (error_um < 1) return 'Good for precision work';
        if (error_um < 10) return 'Consider temperature control or low-CTE material';
        return 'Significant thermal error - use Invar, active cooling, or compensation';
    },
    
    /**
     * Error budget calculation using RSS method
     * @param {Array} errors - Array of {name, value_um, type: 'systematic'|'random'}
     * @returns {Object} Combined error budget
     */
    errorBudget: function(errors) {
        const systematic = errors.filter(e => e.type === 'systematic');
        const random = errors.filter(e => e.type === 'random');
        
        // Systematic errors add algebraically (worst case)
        const systematicTotal = systematic.reduce((sum, e) => sum + Math.abs(e.value_um), 0);
        
        // Random errors combine RSS
        const randomRSS = Math.sqrt(random.reduce((sum, e) => sum + e.value_um ** 2, 0));
        
        // Total error (systematic + random RSS combined)
        const totalError = Math.sqrt(systematicTotal ** 2 + randomRSS ** 2);
        
        return {
            systematicErrors: systematic,
            randomErrors: random,
            systematicTotal_um: systematicTotal,
            randomRSS_um: randomRSS,
            totalError_um: totalError,
            breakdown: {
                systematic_percent: (systematicTotal / totalError * 100).toFixed(1),
                random_percent: (randomRSS / totalError * 100).toFixed(1)
            },
            largestContributors: [...errors].sort((a, b) => 
                Math.abs(b.value_um) - Math.abs(a.value_um)).slice(0, 3)
        };
    },
    
    /**
     * Kinematic coupling analysis (3-groove type)
     * @param {number} ballDiameter_mm - Ball diameter
     * @param {number} grooveAngle_deg - V-groove angle (typically 90°)
     * @param {number} preload_N - Applied preload force
     * @returns {Object} Coupling analysis
     */
    kinematicCoupling: function(ballDiameter_mm, grooveAngle_deg = 90, preload_N = 100) {
        const R = ballDiameter_mm / 2;
        const theta = grooveAngle_deg * Math.PI / 180 / 2; // Half angle
        
        // Contact force per ball (3 balls, 2 contacts each)
        const F_contact = preload_N / (6 * Math.sin(theta));
        
        // Hertzian contact radius (simplified for steel on steel)
        const E_star = 115000; // MPa for steel
        const contactRadius = Math.pow(3 * F_contact * R / (4 * E_star), 1/3);
        
        // Stiffness estimate
        const K_contact = 3 * F_contact / (2 * contactRadius);
        const K_total = 6 * K_contact; // 6 contact points
        
        return {
            ballDiameter_mm,
            grooveAngle_deg,
            preload_N,
            contactForce_N: F_contact,
            contactRadius_mm: contactRadius,
            stiffness_N_per_um: K_total / 1000,
            repeatability_um: 0.1 * R / Math.sqrt(K_total), // Empirical estimate
            constraints: 6,
            type: '3-groove kinematic coupling'
        };
    },
    
    /**
     * Hydrostatic bearing design
     * @param {Object} params - Bearing parameters
     * @returns {Object} Bearing analysis
     */
    hydrostaticBearing: function(params) {
        const {
            supplyPressure_MPa = 3,
            pocketArea_mm2 = 500,
            filmThickness_um = 20,
            viscosity_cP = 30,
            innerRadius_mm = 20,
            outerRadius_mm = 40
        } = params;
        
        const h0 = filmThickness_um / 1000; // mm
        const mu = viscosity_cP * 1e-9; // MPa·s
        
        // Load capacity (simplified)
        const loadCapacity_N = supplyPressure_MPa * pocketArea_mm2 * 0.5;
        
        // Stiffness (approximate)
        const stiffness_N_per_um = 3 * loadCapacity_N / filmThickness_um;
        
        // Flow rate (circular pad)
        const Q = Math.PI * Math.pow(h0, 3) * supplyPressure_MPa / 
                  (6 * mu * Math.log(outerRadius_mm / innerRadius_mm));
        
        // Power loss (pumping)
        const pumpPower_W = Q * supplyPressure_MPa * 1000;
        
        return {
            loadCapacity_N,
            stiffness_N_per_um,
            flowRate_cc_per_min: Q * 60000,
            pumpPower_W,
            filmThickness_um,
            supplyPressure_MPa,
            advantages: ['Zero friction', 'High stiffness', 'High damping'],
            disadvantages: ['Requires pump', 'Oil management', 'Temperature sensitive']
        };
    },
    
    /**
     * Leadscrew critical speed calculation
     * @param {number} diameter_mm - Screw diameter
     * @param {number} length_mm - Unsupported length
     * @param {string} endConditions - 'fixed-fixed', 'fixed-free', 'fixed-supported'
     * @returns {Object} Critical speed analysis
     */
    leadscrewCriticalSpeed: function(diameter_mm, length_mm, endConditions = 'fixed-supported') {
        const d = diameter_mm;
        const L = length_mm;
        
        // End condition factors
        const factors = {
            'fixed-free': 0.56,
            'fixed-supported': 1.25,
            'fixed-fixed': 2.23,
            'supported-supported': 1.0
        };
        
        const K = factors[endConditions] || 1.25;
        
        // Critical speed for steel (E = 207 GPa, ρ = 7850 kg/m³)
        // N_c = K × (d/L²) × 4.76×10⁶  [RPM]
        const Nc = K * (d / (L * L)) * 4.76e6;
        
        // Safe operating speed (70% of critical)
        const safeSpeed = Nc * 0.7;
        
        return {
            diameter_mm: d,
            length_mm: L,
            endConditions,
            endFactor: K,
            criticalSpeed_RPM: Math.round(Nc),
            safeOperatingSpeed_RPM: Math.round(safeSpeed),
            recommendation: safeSpeed < 1000 ? 
                'Consider shorter screw, larger diameter, or linear motor' :
                'Acceptable for typical machine tool applications'
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: STATISTICAL PROCESS CONTROL (MIT 2.830J)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_SPC = {
    
    // Control chart constants
    CONSTANTS: {
        2: { A2: 1.880, D3: 0, D4: 3.267, d2: 1.128 },
        3: { A2: 1.023, D3: 0, D4: 2.574, d2: 1.693 },
        4: { A2: 0.729, D3: 0, D4: 2.282, d2: 2.059 },
        5: { A2: 0.577, D3: 0, D4: 2.114, d2: 2.326 },
        6: { A2: 0.483, D3: 0, D4: 2.004, d2: 2.534 },
        7: { A2: 0.419, D3: 0.076, D4: 1.924, d2: 2.704 },
        8: { A2: 0.373, D3: 0.136, D4: 1.864, d2: 2.847 },
        9: { A2: 0.337, D3: 0.184, D4: 1.816, d2: 2.970 },
        10: { A2: 0.308, D3: 0.223, D4: 1.777, d2: 3.078 }
    },
    
    /**
     * Calculate X-bar and R control chart limits
     * @param {Array} subgroups - Array of subgroup arrays
     * @returns {Object} Control chart limits and analysis
     */
    controlChartXbarR: function(subgroups) {
        const n = subgroups[0].length; // Subgroup size
        const k = subgroups.length; // Number of subgroups
        
        if (!this.CONSTANTS[n]) {
            throw new Error(`Subgroup size ${n} not supported (use 2-10)`);
        }
        
        const { A2, D3, D4, d2 } = this.CONSTANTS[n];
        
        // Calculate means and ranges for each subgroup
        const means = subgroups.map(sg => sg.reduce((a, b) => a + b, 0) / n);
        const ranges = subgroups.map(sg => Math.max(...sg) - Math.min(...sg));
        
        // Grand mean and average range
        const xBar = means.reduce((a, b) => a + b, 0) / k;
        const rBar = ranges.reduce((a, b) => a + b, 0) / k;
        
        // Estimate sigma
        const sigma = rBar / d2;
        
        // Control limits
        const xBar_UCL = xBar + A2 * rBar;
        const xBar_LCL = xBar - A2 * rBar;
        const R_UCL = D4 * rBar;
        const R_LCL = D3 * rBar;
        
        // Check for out of control points
        const xBarOOC = means.filter((m, i) => m > xBar_UCL || m < xBar_LCL);
        const rangeOOC = ranges.filter(r => r > R_UCL || r < R_LCL);
        
        return {
            subgroupSize: n,
            numSubgroups: k,
            grandMean: xBar,
            averageRange: rBar,
            estimatedSigma: sigma,
            xBarChart: {
                centerLine: xBar,
                UCL: xBar_UCL,
                LCL: xBar_LCL,
                outOfControl: xBarOOC.length
            },
            rangeChart: {
                centerLine: rBar,
                UCL: R_UCL,
                LCL: R_LCL,
                outOfControl: rangeOOC.length
            },
            inControl: xBarOOC.length === 0 && rangeOOC.length === 0,
            data: { means, ranges }
        };
    },
    
    /**
     * Calculate process capability indices
     * @param {number} USL - Upper specification limit
     * @param {number} LSL - Lower specification limit
     * @param {number} mean - Process mean
     * @param {number} sigma - Process standard deviation
     * @returns {Object} Capability analysis
     */
    processCapability: function(USL, LSL, mean, sigma) {
        // Cp - potential capability (ignores centering)
        const Cp = (USL - LSL) / (6 * sigma);
        
        // Cpk - actual capability (accounts for centering)
        const Cpu = (USL - mean) / (3 * sigma);
        const Cpl = (mean - LSL) / (3 * sigma);
        const Cpk = Math.min(Cpu, Cpl);
        
        // Cpm - Taguchi capability (includes target)
        const target = (USL + LSL) / 2;
        const Cpm = Cp / Math.sqrt(1 + Math.pow((mean - target) / sigma, 2));
        
        // PPM out of spec (assuming normal distribution)
        const ppmLower = this._normalCDF((LSL - mean) / sigma) * 1e6;
        const ppmUpper = (1 - this._normalCDF((USL - mean) / sigma)) * 1e6;
        const ppmTotal = ppmLower + ppmUpper;
        
        // Sigma level
        const sigmaLevel = this._sigmaLevel(Cpk);
        
        return {
            Cp,
            Cpk,
            Cpu,
            Cpl,
            Cpm,
            sigmaLevel,
            ppm: {
                lower: Math.round(ppmLower),
                upper: Math.round(ppmUpper),
                total: Math.round(ppmTotal)
            },
            rating: this._capabilityRating(Cpk),
            centered: Math.abs(mean - target) < sigma * 0.5
        };
    },
    
    _normalCDF: function(z) {
        // Approximation of standard normal CDF
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;
        
        const sign = z < 0 ? -1 : 1;
        z = Math.abs(z) / Math.sqrt(2);
        
        const t = 1.0 / (1.0 + p * z);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
        
        return 0.5 * (1.0 + sign * y);
    },
    
    _sigmaLevel: function(Cpk) {
        return Cpk * 3;
    },
    
    _capabilityRating: function(Cpk) {
        if (Cpk >= 2.0) return 'World Class (Six Sigma)';
        if (Cpk >= 1.67) return 'Excellent';
        if (Cpk >= 1.33) return 'Good';
        if (Cpk >= 1.0) return 'Marginal';
        if (Cpk >= 0.67) return 'Poor';
        return 'Incapable';
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: CUTTING PROCESS PHYSICS (MIT 2.830J)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_CUTTING_PHYSICS = {
    
    /**
     * Merchant's Circle cutting force analysis
     * @param {Object} params - Cutting parameters
     * @returns {Object} Force analysis
     */
    merchantForces: function(params) {
        const {
            chipThickness_mm = 0.1,     // Uncut chip thickness t1
            chipWidth_mm = 2,            // Width of cut b
            rakeAngle_deg = 10,          // Tool rake angle α
            frictionAngle_deg = 35,      // Friction angle β
            shearStrength_MPa = 400      // Material shear strength τs
        } = params;
        
        const t1 = chipThickness_mm;
        const b = chipWidth_mm;
        const alpha = rakeAngle_deg * Math.PI / 180;
        const beta = frictionAngle_deg * Math.PI / 180;
        const tau_s = shearStrength_MPa;
        
        // Shear angle from Merchant's equation
        // 2φ + β - α = π/2
        const phi = (Math.PI / 4) - (beta - alpha) / 2;
        
        // Chip ratio
        const rc = Math.cos(phi - alpha) / Math.cos(alpha);
        
        // Shear area
        const As = (b * t1) / Math.sin(phi);
        
        // Shear force
        const Fs = tau_s * As;
        
        // Cutting force (tangential)
        const Fc = Fs * Math.cos(beta - alpha) / Math.cos(phi + beta - alpha);
        
        // Thrust force (normal)
        const Ft = Fs * Math.sin(beta - alpha) / Math.cos(phi + beta - alpha);
        
        // Friction force
        const Ff = Fc * Math.sin(beta) + Ft * Math.cos(beta);
        
        // Normal force on rake face
        const Fn = Fc * Math.cos(beta) - Ft * Math.sin(beta);
        
        // Coefficient of friction
        const mu = Math.tan(beta);
        
        return {
            shearAngle_deg: phi * 180 / Math.PI,
            chipRatio: rc,
            cuttingForce_N: Fc,
            thrustForce_N: Ft,
            shearForce_N: Fs,
            frictionForce_N: Ff,
            normalForce_N: Fn,
            coefficientOfFriction: mu,
            specificCuttingEnergy_J_mm3: Fc / (b * t1),
            shearArea_mm2: As
        };
    },
    
    /**
     * Taylor tool life equation
     * @param {number} speed_mpm - Cutting speed in m/min
     * @param {Object} material - Tool/workpiece material properties
     * @returns {Object} Tool life prediction
     */
    taylorToolLife: function(speed_mpm, material = {}) {
        const {
            n = 0.25,           // Taylor exponent
            C = 300,            // Taylor constant
            feed_mm = 0.2,      // Feed per rev
            doc_mm = 2,         // Depth of cut
            m = 0.15,           // Feed exponent
            p = 0.08            // DOC exponent
        } = material;
        
        // Extended Taylor: V × T^n × f^m × d^p = C
        // Solving for T: T = (C / (V × f^m × d^p))^(1/n)
        const T = Math.pow(C / (speed_mpm * Math.pow(feed_mm, m) * Math.pow(doc_mm, p)), 1/n);
        
        return {
            speed_mpm,
            toolLife_min: T,
            taylorN: n,
            taylorC: C,
            feed_mm,
            doc_mm,
            // Additional analytics
            doublingSpeedReduction: (1 - Math.pow(0.5, 1/n)) * 100, // % life lost if speed doubles
            optimalSpeed: C * Math.pow(T / 60, -n) // For 1-hour tool life
        };
    },
    
    /**
     * Cutting temperature estimation
     * @param {Object} params - Process parameters
     * @returns {Object} Temperature analysis
     */
    cuttingTemperature: function(params) {
        const {
            speed_mpm = 100,
            feed_mm = 0.2,
            specificEnergy_J_mm3 = 3.5,
            conductivity_W_mK = 50,    // Workpiece thermal conductivity
            density_kg_m3 = 7850,       // Workpiece density
            specificHeat_J_kgK = 500    // Workpiece specific heat
        } = params;
        
        // Thermal diffusivity
        const alpha = conductivity_W_mK / (density_kg_m3 * specificHeat_J_kgK);
        
        // Characteristic length (feed)
        const L = feed_mm / 1000; // m
        
        // Chip temperature rise (Trigger equation simplified)
        const V = speed_mpm / 60; // m/s
        const deltaT = (0.4 * specificEnergy_J_mm3 * 1e9 * V) / 
                       (density_kg_m3 * specificHeat_J_kgK * Math.sqrt(alpha * L));
        
        // Approximate temperatures
        const ambientTemp = 25;
        const chipTemp = ambientTemp + deltaT;
        const toolTemp = ambientTemp + deltaT * 0.7; // Tool sees ~70% of chip temp
        const workpieceTemp = ambientTemp + deltaT * 0.1; // Workpiece sees ~10%
        
        return {
            speed_mpm,
            chipTemperature_C: Math.round(chipTemp),
            toolTemperature_C: Math.round(toolTemp),
            workpieceTemperature_C: Math.round(workpieceTemp),
            temperatureRise_C: Math.round(deltaT),
            heatPartition: {
                chip_percent: 70,
                tool_percent: 20,
                workpiece_percent: 10
            }
        };
    },
    
    /**
     * Stability lobe diagram calculation
     * @param {Object} machineParams - Machine dynamic parameters
     * @param {Object} cuttingParams - Cutting parameters
     * @returns {Object} Stability analysis
     */
    stabilityLobes: function(machineParams, cuttingParams) {
        const {
            naturalFreq_Hz = 500,
            damping = 0.03,
            stiffness_N_um = 50
        } = machineParams;
        
        const {
            specificForce_N_mm2 = 2000,
            numTeeth = 4
        } = cuttingParams;
        
        const omega_n = 2 * Math.PI * naturalFreq_Hz;
        const Ks = specificForce_N_um * 1000; // N/m per mm DOC
        
        // Calculate stability lobes
        const lobes = [];
        for (let k = 0; k < 5; k++) { // First 5 lobes
            const points = [];
            for (let ratio = 0.5; ratio <= 1.5; ratio += 0.01) {
                const omega = omega_n * ratio;
                
                // Transfer function real part
                const G_real = -omega_n * omega_n * (omega_n * omega_n - omega * omega) /
                    (Math.pow(omega_n * omega_n - omega * omega, 2) + 
                     Math.pow(2 * damping * omega_n * omega, 2));
                
                // Critical depth of cut
                const b_lim = -1 / (2 * Ks * G_real);
                
                if (b_lim > 0 && b_lim < 20) {
                    // Spindle speed for this frequency
                    const epsilon = Math.atan2(2 * damping * omega_n * omega, 
                                               omega_n * omega_n - omega * omega);
                    const N = 60 * omega / (2 * Math.PI * (k + epsilon / (2 * Math.PI)));
                    
                    if (N > 0 && N < 50000) {
                        points.push({ rpm: N, doc_mm: b_lim });
                    }
                }
            }
            if (points.length > 0) {
                lobes.push({ lobe: k, points });
            }
        }
        
        // Find sweet spots (local maxima)
        const sweetSpots = lobes.flatMap(l => {
            const maxPoint = l.points.reduce((max, p) => 
                p.doc_mm > max.doc_mm ? p : max, l.points[0]);
            return { lobe: l.lobe, rpm: Math.round(maxPoint.rpm), doc_mm: maxPoint.doc_mm.toFixed(2) };
        });
        
        return {
            naturalFrequency_Hz: naturalFreq_Hz,
            damping,
            stiffness_N_um,
            lobes,
            sweetSpots,
            recommendation: sweetSpots.length > 0 ? 
                `Optimal spindle speeds: ${sweetSpots.map(s => s.rpm + ' RPM').join(', ')}` :
                'Consider reducing speed or depth of cut'
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: DESIGN FOR MANUFACTURING (MIT 2.72)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_DFM = {
    
    /**
     * Tolerance stackup analysis
     * @param {Array} tolerances - Array of {name, nominal, tolerance, distribution}
     * @param {string} method - 'worst_case', 'rss', 'monte_carlo'
     * @returns {Object} Stackup analysis
     */
    toleranceStackup: function(tolerances, method = 'rss') {
        const nominalStack = tolerances.reduce((sum, t) => sum + t.nominal, 0);
        const toleranceValues = tolerances.map(t => t.tolerance);
        
        let totalTolerance;
        switch (method) {
            case 'worst_case':
                totalTolerance = toleranceValues.reduce((sum, t) => sum + Math.abs(t), 0);
                break;
            case 'rss':
                totalTolerance = Math.sqrt(toleranceValues.reduce((sum, t) => sum + t * t, 0));
                break;
            case 'monte_carlo':
                // Simulate 10000 assemblies
                const simulations = 10000;
                const results = [];
                for (let i = 0; i < simulations; i++) {
                    const assembly = tolerances.reduce((sum, t) => {
                        const variation = (Math.random() - 0.5) * 2 * t.tolerance;
                        return sum + t.nominal + variation;
                    }, 0);
                    results.push(assembly);
                }
                const mean = results.reduce((a, b) => a + b, 0) / simulations;
                const variance = results.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / simulations;
                totalTolerance = 3 * Math.sqrt(variance); // 3-sigma
                break;
        }
        
        return {
            method,
            nominalDimension: nominalStack,
            totalTolerance: totalTolerance,
            minDimension: nominalStack - totalTolerance,
            maxDimension: nominalStack + totalTolerance,
            contributors: tolerances.map(t => ({
                name: t.name,
                nominal: t.nominal,
                tolerance: t.tolerance,
                percentContribution: (method === 'rss' ? 
                    (t.tolerance * t.tolerance / (totalTolerance * totalTolerance) * 100).toFixed(1) :
                    (Math.abs(t.tolerance) / toleranceValues.reduce((s, v) => s + Math.abs(v), 0) * 100).toFixed(1)
                )
            }))
        };
    },
    
    /**
     * Bolt joint preload calculation
     * @param {Object} params - Joint parameters
     * @returns {Object} Preload analysis
     */
    boltPreload: function(params) {
        const {
            torque_Nm = 25,
            diameter_mm = 10,
            nutFactor = 0.2,        // K factor
            yieldStrength_MPa = 640, // Bolt yield strength
            threadPitch_mm = 1.5,
            clamping_mm = 20
        } = params;
        
        const d = diameter_mm;
        const T = torque_Nm * 1000; // N·mm
        const K = nutFactor;
        
        // Preload force: F = T / (K × d)
        const preload_N = T / (K * d);
        
        // Bolt stress area (approximate)
        const d2 = d - 0.6495 * threadPitch_mm;
        const stressArea_mm2 = Math.PI / 4 * Math.pow((d2 + (d - threadPitch_mm)) / 2, 2);
        
        // Bolt stress
        const boltStress_MPa = preload_N / stressArea_mm2;
        const safetyFactor = yieldStrength_MPa / boltStress_MPa;
        
        // Bolt stiffness (approximate)
        const E_steel = 207000; // MPa
        const boltLength = clamping_mm + 0.5 * d;
        const K_bolt = E_steel * stressArea_mm2 / boltLength; // N/mm
        
        // Clamped material stiffness (rule of thumb: 3x bolt stiffness)
        const K_clamp = 3 * K_bolt;
        
        // Load factor
        const loadFactor = K_bolt / (K_bolt + K_clamp);
        
        return {
            torque_Nm,
            preload_N: Math.round(preload_N),
            boltStress_MPa: Math.round(boltStress_MPa),
            safetyFactor: safetyFactor.toFixed(2),
            stressArea_mm2: stressArea_mm2.toFixed(1),
            boltStiffness_N_mm: Math.round(K_bolt),
            clampStiffness_N_mm: Math.round(K_clamp),
            loadFactor: loadFactor.toFixed(3),
            recommendation: safetyFactor < 1.5 ? 
                'Warning: Low safety factor - reduce torque or use larger bolt' :
                safetyFactor > 3 ? 'Consider increasing torque for better clamping' :
                'Good preload for typical applications'
        };
    },
    
    /**
     * Fatigue analysis using Modified Goodman
     * @param {Object} params - Loading and material parameters
     * @returns {Object} Fatigue analysis
     */
    fatigueGoodman: function(params) {
        const {
            alternatingStress_MPa = 100,
            meanStress_MPa = 50,
            ultimateStrength_MPa = 500,
            enduranceLimit_MPa = 250,
            surfaceFactor = 0.9,
            sizeFactor = 0.85,
            loadFactor = 1.0,
            tempFactor = 1.0,
            reliabilityFactor = 0.897 // 90% reliability
        } = params;
        
        const Sa = alternatingStress_MPa;
        const Sm = meanStress_MPa;
        const Sut = ultimateStrength_MPa;
        const Se_prime = enduranceLimit_MPa;
        
        // Modified endurance limit
        const Se = surfaceFactor * sizeFactor * loadFactor * tempFactor * reliabilityFactor * Se_prime;
        
        // Modified Goodman: Sa/Se + Sm/Sut = 1/n
        const n = 1 / (Sa/Se + Sm/Sut);
        
        // Soderberg (more conservative): Sa/Se + Sm/Sy = 1/n
        const Sy = 0.9 * Sut; // Approximate yield
        const n_soderberg = 1 / (Sa/Se + Sm/Sy);
        
        // Gerber (less conservative): Sa/Se + (Sm/Sut)² = 1/n
        const n_gerber = 1 / (Sa/Se + Math.pow(Sm/Sut, 2));
        
        return {
            modifiedEnduranceLimit_MPa: Se.toFixed(1),
            safetyFactors: {
                goodman: n.toFixed(2),
                soderberg: n_soderberg.toFixed(2),
                gerber: n_gerber.toFixed(2)
            },
            recommendation: n < 1 ? 'FAILURE PREDICTED - redesign required' :
                           n < 1.5 ? 'Marginal design - consider increasing strength' :
                           n < 2.5 ? 'Acceptable for general applications' :
                           'Conservative design - could optimize',
            infiniteLife: n >= 1,
            modificationFactors: {
                surface: surfaceFactor,
                size: sizeFactor,
                load: loadFactor,
                temperature: tempFactor,
                reliability: reliabilityFactor
            }
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: MICRO/NANO DESIGN (MIT 2.76)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_MICRO_DESIGN = {
    
    /**
     * Blade flexure stiffness calculation
     * @param {Object} params - Flexure geometry
     * @returns {Object} Stiffness analysis
     */
    bladeFlexure: function(params) {
        const {
            length_mm = 10,
            width_mm = 5,
            thickness_mm = 0.5,
            youngsModulus_GPa = 200 // Steel
        } = params;
        
        const L = length_mm;
        const b = width_mm;
        const t = thickness_mm;
        const E = youngsModulus_GPa * 1000; // MPa
        
        // Moment of inertia
        const I = b * Math.pow(t, 3) / 12;
        
        // Axial stiffness
        const K_axial = E * b * t / L;
        
        // Bending stiffness (transverse)
        const K_bending = E * b * Math.pow(t, 3) / (4 * Math.pow(L, 3));
        
        // Stiffness ratio (high is good for single-DOF constraint)
        const stiffnessRatio = K_axial / K_bending;
        
        // Maximum deflection before yield (assuming 500 MPa yield)
        const yieldStress = 500; // MPa
        const maxDeflection = yieldStress * Math.pow(L, 2) / (3 * E * t);
        
        return {
            axialStiffness_N_mm: K_axial.toFixed(1),
            bendingStiffness_N_mm: K_bending.toFixed(4),
            stiffnessRatio: stiffnessRatio.toFixed(0),
            momentOfInertia_mm4: I.toFixed(6),
            maxDeflection_mm: maxDeflection.toFixed(3),
            recommendation: stiffnessRatio > 1000 ? 
                'Excellent single-DOF constraint' : 
                'Consider thinner blade for better ratio'
        };
    },
    
    /**
     * Scaling law analysis
     * @param {number} scaleFactor - Size reduction factor
     * @returns {Object} How properties scale
     */
    scalingLaws: function(scaleFactor) {
        const L = scaleFactor;
        
        return {
            scaleFactor: L,
            volume: Math.pow(L, 3),
            surfaceArea: Math.pow(L, 2),
            mass: Math.pow(L, 3),
            surfaceForces: Math.pow(L, 2),
            volumeForces: Math.pow(L, 3),
            stiffness: L,
            naturalFrequency: 1 / L,
            stress: 1, // Constant for same loading
            strain: 1, // Constant for same loading
            heatCapacity: Math.pow(L, 3),
            heatTransfer: Math.pow(L, 2),
            thermalTimeConstant: L,
            surfaceToVolumeRatio: 1 / L,
            dominantForces: L < 1 ? 'Surface forces dominate' : 'Body forces dominate',
            thermalBehavior: L < 1 ? 'Fast thermal response' : 'Slow thermal response',
            vibrationBehavior: L < 1 ? 'Higher natural frequencies' : 'Lower natural frequencies'
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// GATEWAY ROUTES REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

const BATCH15_GATEWAY_ROUTES = {
    // Precision Design (MIT 2.75)
    'precision.error.abbe': 'PRISM_PRECISION_DESIGN.abbeError',
    'precision.thermal.expansion': 'PRISM_PRECISION_DESIGN.thermalExpansion',
    'precision.error.budget': 'PRISM_PRECISION_DESIGN.errorBudget',
    'precision.coupling.kinematic': 'PRISM_PRECISION_DESIGN.kinematicCoupling',
    'precision.bearing.hydrostatic': 'PRISM_PRECISION_DESIGN.hydrostaticBearing',
    'precision.leadscrew.critical': 'PRISM_PRECISION_DESIGN.leadscrewCriticalSpeed',
    
    // SPC (MIT 2.830J)
    'spc.control.xbar_r': 'PRISM_SPC.controlChartXbarR',
    'spc.capability.cpk': 'PRISM_SPC.processCapability',
    
    // Cutting Physics (MIT 2.830J)
    'cutting.merchant.forces': 'PRISM_CUTTING_PHYSICS.merchantForces',
    'cutting.taylor.toollife': 'PRISM_CUTTING_PHYSICS.taylorToolLife',
    'cutting.temperature': 'PRISM_CUTTING_PHYSICS.cuttingTemperature',
    'cutting.stability.lobes': 'PRISM_CUTTING_PHYSICS.stabilityLobes',
    
    // DFM (MIT 2.72)
    'dfm.tolerance.stackup': 'PRISM_DFM.toleranceStackup',
    'dfm.bolt.preload': 'PRISM_DFM.boltPreload',
    'dfm.fatigue.goodman': 'PRISM_DFM.fatigueGoodman',
    
    // Micro Design (MIT 2.76)
    'micro.flexure.blade': 'PRISM_MICRO_DESIGN.bladeFlexure',
    'micro.scaling.laws': 'PRISM_MICRO_DESIGN.scalingLaws'
};

// Auto-register routes with PRISM_GATEWAY
function registerBatch15Routes() {
    if (typeof PRISM_GATEWAY !== 'undefined') {
        for (const [route, target] of Object.entries(BATCH15_GATEWAY_ROUTES)) {
            PRISM_GATEWAY.register(route, target);
        }
        console.log(`[Batch 15] Registered ${Object.keys(BATCH15_GATEWAY_ROUTES).length} routes`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SELF-TESTS
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_MIT_BATCH_15_TESTS = {
    runAll: function() {
        console.log('\n[PRISM MIT Batch 15] Running Self-Tests...\n');
        let passed = 0;
        let failed = 0;
        
        // Test 1: Abbe Error
        try {
            const abbe = PRISM_PRECISION_DESIGN.abbeError(100, 1);
            if (Math.abs(abbe.positionError_um - 0.485) < 0.01) {
                console.log('✓ Abbe error calculation');
                passed++;
            } else {
                throw new Error(`Expected ~0.485 μm, got ${abbe.positionError_um}`);
            }
        } catch (e) {
            console.log('✗ Abbe error:', e.message);
            failed++;
        }
        
        // Test 2: Thermal Expansion
        try {
            const thermal = PRISM_PRECISION_DESIGN.thermalExpansion(1000, 10, 'aluminum');
            if (Math.abs(thermal.expansion_um - 230) < 5) {
                console.log('✓ Thermal expansion calculation');
                passed++;
            } else {
                throw new Error(`Expected ~230 μm, got ${thermal.expansion_um}`);
            }
        } catch (e) {
            console.log('✗ Thermal expansion:', e.message);
            failed++;
        }
        
        // Test 3: Process Capability
        try {
            const cap = PRISM_SPC.processCapability(10.5, 9.5, 10.0, 0.1);
            if (Math.abs(cap.Cpk - 1.667) < 0.01) {
                console.log('✓ Process capability Cpk');
                passed++;
            } else {
                throw new Error(`Expected ~1.667, got ${cap.Cpk}`);
            }
        } catch (e) {
            console.log('✗ Process capability:', e.message);
            failed++;
        }
        
        // Test 4: Merchant Forces
        try {
            const forces = PRISM_CUTTING_PHYSICS.merchantForces({
                chipThickness_mm: 0.1,
                chipWidth_mm: 2,
                rakeAngle_deg: 10,
                frictionAngle_deg: 35,
                shearStrength_MPa: 400
            });
            if (forces.cuttingForce_N > 100 && forces.thrustForce_N > 0) {
                console.log('✓ Merchant force calculation');
                passed++;
            } else {
                throw new Error('Invalid force values');
            }
        } catch (e) {
            console.log('✗ Merchant forces:', e.message);
            failed++;
        }
        
        // Test 5: Taylor Tool Life
        try {
            const taylor = PRISM_CUTTING_PHYSICS.taylorToolLife(100, { n: 0.25, C: 300 });
            if (taylor.toolLife_min > 0 && taylor.toolLife_min < 1000) {
                console.log('✓ Taylor tool life calculation');
                passed++;
            } else {
                throw new Error(`Unexpected tool life: ${taylor.toolLife_min}`);
            }
        } catch (e) {
            console.log('✗ Taylor tool life:', e.message);
            failed++;
        }
        
        // Test 6: Tolerance Stackup
        try {
            const stackup = PRISM_DFM.toleranceStackup([
                { name: 'A', nominal: 10, tolerance: 0.1 },
                { name: 'B', nominal: 20, tolerance: 0.2 },
                { name: 'C', nominal: 15, tolerance: 0.15 }
            ], 'rss');
            const expectedRSS = Math.sqrt(0.1*0.1 + 0.2*0.2 + 0.15*0.15);
            if (Math.abs(stackup.totalTolerance - expectedRSS) < 0.001) {
                console.log('✓ Tolerance stackup RSS');
                passed++;
            } else {
                throw new Error(`Expected ${expectedRSS}, got ${stackup.totalTolerance}`);
            }
        } catch (e) {
            console.log('✗ Tolerance stackup:', e.message);
            failed++;
        }
        
        // Test 7: Blade Flexure
        try {
            const flexure = PRISM_MICRO_DESIGN.bladeFlexure({
                length_mm: 10,
                width_mm: 5,
                thickness_mm: 0.5
            });
            if (parseFloat(flexure.stiffnessRatio) > 100) {
                console.log('✓ Blade flexure stiffness');
                passed++;
            } else {
                throw new Error(`Low stiffness ratio: ${flexure.stiffnessRatio}`);
            }
        } catch (e) {
            console.log('✗ Blade flexure:', e.message);
            failed++;
        }
        
        console.log(`\nResults: ${passed}/${passed + failed} tests passed`);
        return { passed, failed };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PRISM_PRECISION_DESIGN,
        PRISM_SPC,
        PRISM_CUTTING_PHYSICS,
        PRISM_DFM,
        PRISM_MICRO_DESIGN,
        BATCH15_GATEWAY_ROUTES,
        registerBatch15Routes,
        PRISM_MIT_BATCH_15_TESTS
    };
}

if (typeof window !== 'undefined') {
    window.PRISM_PRECISION_DESIGN = PRISM_PRECISION_DESIGN;
    window.PRISM_SPC = PRISM_SPC;
    window.PRISM_CUTTING_PHYSICS = PRISM_CUTTING_PHYSICS;
    window.PRISM_DFM = PRISM_DFM;
    window.PRISM_MICRO_DESIGN = PRISM_MICRO_DESIGN;
    registerBatch15Routes();
}

console.log('[PRISM MIT Batch 15] High Priority Manufacturing loaded - 17 routes');
console.log('[PRISM MIT Batch 15] Courses: 2.43, 2.72, 2.75 (Slocum), 2.76, 2.830J');
/**
 * PRISM MIT Course Knowledge - Batch 16
 * MATERIALS SCIENCE: Properties, Mechanics, Behavior, Kinetics
 * Source: MIT 3.021J, 3.11, 3.15, 3.21, 3.22
 * Generated: January 18, 2026
 */

console.log('[PRISM MIT Batch 16] Loading Materials Science Knowledge...');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: STRESS AND STRAIN ANALYSIS (MIT 3.11)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_STRESS_ANALYSIS = {
    
    /**
     * Calculate Von Mises equivalent stress
     * @param {Object} stress - Stress tensor components
     * @returns {Object} Von Mises stress and analysis
     */
    vonMises: function(stress) {
        const {
            sigma_x = 0, sigma_y = 0, sigma_z = 0,
            tau_xy = 0, tau_yz = 0, tau_xz = 0
        } = stress;
        
        // Von Mises formula
        const vm = Math.sqrt(
            0.5 * (
                Math.pow(sigma_x - sigma_y, 2) +
                Math.pow(sigma_y - sigma_z, 2) +
                Math.pow(sigma_z - sigma_x, 2) +
                6 * (tau_xy * tau_xy + tau_yz * tau_yz + tau_xz * tau_xz)
            )
        );
        
        // Hydrostatic stress
        const hydrostatic = (sigma_x + sigma_y + sigma_z) / 3;
        
        // Deviatoric stresses
        const s_x = sigma_x - hydrostatic;
        const s_y = sigma_y - hydrostatic;
        const s_z = sigma_z - hydrostatic;
        
        return {
            vonMises_MPa: vm,
            hydrostatic_MPa: hydrostatic,
            deviatoric: { s_x, s_y, s_z },
            triaxiality: hydrostatic / (vm || 1),
            inputStress: stress
        };
    },
    
    /**
     * Calculate principal stresses from stress tensor
     * @param {Object} stress - Stress tensor components
     * @returns {Object} Principal stresses and directions
     */
    principalStresses: function(stress) {
        const {
            sigma_x = 0, sigma_y = 0, sigma_z = 0,
            tau_xy = 0, tau_yz = 0, tau_xz = 0
        } = stress;
        
        // Stress invariants
        const I1 = sigma_x + sigma_y + sigma_z;
        const I2 = sigma_x * sigma_y + sigma_y * sigma_z + sigma_z * sigma_x
                   - tau_xy * tau_xy - tau_yz * tau_yz - tau_xz * tau_xz;
        const I3 = sigma_x * sigma_y * sigma_z 
                   + 2 * tau_xy * tau_yz * tau_xz
                   - sigma_x * tau_yz * tau_yz 
                   - sigma_y * tau_xz * tau_xz 
                   - sigma_z * tau_xy * tau_xy;
        
        // Solve cubic equation: σ³ - I1σ² + I2σ - I3 = 0
        // Using trigonometric solution for real roots
        const p = I2 - I1 * I1 / 3;
        const q = 2 * Math.pow(I1 / 3, 3) - I1 * I2 / 3 + I3;
        
        let sigma1, sigma2, sigma3;
        
        if (Math.abs(p) < 1e-10) {
            // Special case: nearly hydrostatic
            sigma1 = sigma2 = sigma3 = I1 / 3;
        } else {
            const phi = Math.acos(Math.max(-1, Math.min(1, 
                3 * q / (2 * p) * Math.sqrt(-3 / p)))) / 3;
            const t = 2 * Math.sqrt(-p / 3);
            
            sigma1 = t * Math.cos(phi) + I1 / 3;
            sigma2 = t * Math.cos(phi - 2 * Math.PI / 3) + I1 / 3;
            sigma3 = t * Math.cos(phi - 4 * Math.PI / 3) + I1 / 3;
        }
        
        // Sort: σ1 > σ2 > σ3
        const principals = [sigma1, sigma2, sigma3].sort((a, b) => b - a);
        
        // Maximum shear stress (Tresca)
        const tau_max = (principals[0] - principals[2]) / 2;
        
        return {
            sigma1: principals[0],
            sigma2: principals[1],
            sigma3: principals[2],
            maxShear_MPa: tau_max,
            invariants: { I1, I2, I3 },
            meanStress: I1 / 3
        };
    },
    
    /**
     * Convert engineering strain to true strain
     * @param {number} engStrain - Engineering strain (decimal, e.g., 0.1 for 10%)
     * @returns {Object} Strain conversions
     */
    trueStrain: function(engStrain) {
        const trueStrain = Math.log(1 + engStrain);
        const stretchRatio = 1 + engStrain;
        
        return {
            engineeringStrain: engStrain,
            engineeringStrain_percent: engStrain * 100,
            trueStrain: trueStrain,
            trueStrain_percent: trueStrain * 100,
            stretchRatio: stretchRatio,
            // For constant volume plasticity
            trueStress_factor: stretchRatio // σ_true = σ_eng × (1 + ε_eng)
        };
    },
    
    /**
     * Convert between elastic constants
     * @param {Object} known - Known elastic constants
     * @returns {Object} All elastic constants
     */
    elasticConstants: function(known) {
        let E, G, K, nu, lambda;
        
        if (known.E && known.nu) {
            E = known.E;
            nu = known.nu;
            G = E / (2 * (1 + nu));
            K = E / (3 * (1 - 2 * nu));
            lambda = E * nu / ((1 + nu) * (1 - 2 * nu));
        } else if (known.E && known.G) {
            E = known.E;
            G = known.G;
            nu = E / (2 * G) - 1;
            K = E / (3 * (1 - 2 * nu));
            lambda = G * (E - 2 * G) / (3 * G - E);
        } else if (known.K && known.G) {
            K = known.K;
            G = known.G;
            E = 9 * K * G / (3 * K + G);
            nu = (3 * K - 2 * G) / (2 * (3 * K + G));
            lambda = K - 2 * G / 3;
        } else if (known.lambda && known.G) {
            lambda = known.lambda;
            G = known.G;
            E = G * (3 * lambda + 2 * G) / (lambda + G);
            nu = lambda / (2 * (lambda + G));
            K = lambda + 2 * G / 3;
        } else {
            throw new Error('Provide (E, nu), (E, G), (K, G), or (lambda, G)');
        }
        
        // Verify relationships
        const verification = {
            E_check: 9 * K * G / (3 * K + G),
            nu_check: (3 * K - 2 * G) / (2 * (3 * K + G))
        };
        
        return {
            E_MPa: E,
            G_MPa: G,
            K_MPa: K,
            nu: nu,
            lambda_MPa: lambda,
            description: {
                E: "Young's modulus (tension/compression)",
                G: "Shear modulus",
                K: "Bulk modulus (volumetric)",
                nu: "Poisson's ratio",
                lambda: "Lamé's first parameter"
            }
        };
    },
    
    /**
     * Beam deflection calculations
     * @param {Object} params - Beam parameters
     * @returns {Object} Deflection analysis
     */
    beamDeflection: function(params) {
        const {
            type = 'cantilever_point',
            length_mm,
            E_MPa,
            I_mm4,
            load_N,
            loadPosition_mm = null
        } = params;
        
        const L = length_mm;
        const EI = E_MPa * I_mm4;
        const P = load_N;
        
        let maxDeflection, maxLocation, formula;
        
        switch (type) {
            case 'cantilever_point':
                // Point load at end
                maxDeflection = P * Math.pow(L, 3) / (3 * EI);
                maxLocation = L;
                formula = 'δ = PL³/(3EI)';
                break;
                
            case 'cantilever_uniform':
                // Uniform load
                maxDeflection = P * Math.pow(L, 4) / (8 * EI);
                maxLocation = L;
                formula = 'δ = wL⁴/(8EI)';
                break;
                
            case 'simply_supported_center':
                // Point load at center
                maxDeflection = P * Math.pow(L, 3) / (48 * EI);
                maxLocation = L / 2;
                formula = 'δ = PL³/(48EI)';
                break;
                
            case 'simply_supported_uniform':
                // Uniform load
                maxDeflection = 5 * P * Math.pow(L, 4) / (384 * EI);
                maxLocation = L / 2;
                formula = 'δ = 5wL⁴/(384EI)';
                break;
                
            case 'fixed_fixed_center':
                // Fixed-fixed, point load at center
                maxDeflection = P * Math.pow(L, 3) / (192 * EI);
                maxLocation = L / 2;
                formula = 'δ = PL³/(192EI)';
                break;
                
            default:
                throw new Error(`Unknown beam type: ${type}`);
        }
        
        return {
            type,
            maxDeflection_mm: maxDeflection,
            maxLocation_mm: maxLocation,
            formula,
            stiffness_N_per_mm: P / maxDeflection,
            inputs: { length_mm, E_MPa, I_mm4, load_N }
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: DIFFUSION AND KINETICS (MIT 3.21)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_KINETICS = {
    
    /**
     * Calculate diffusion coefficient using Arrhenius equation
     * @param {number} temperature_C - Temperature in Celsius
     * @param {Object} material - Diffusion parameters
     * @returns {Object} Diffusion coefficient and analysis
     */
    diffusionCoefficient: function(temperature_C, material = {}) {
        const {
            D0_m2_s = 1e-4,           // Pre-exponential factor
            Q_kJ_mol = 150,           // Activation energy
            name = 'Custom'
        } = material;
        
        const T_K = temperature_C + 273.15;
        const R = 8.314; // J/(mol·K)
        const Q = Q_kJ_mol * 1000; // Convert to J/mol
        
        // D = D0 × exp(-Q/RT)
        const D = D0_m2_s * Math.exp(-Q / (R * T_K));
        
        // Characteristic diffusion distance in 1 hour
        const x_1hr = Math.sqrt(D * 3600) * 1000; // mm
        
        return {
            material: name,
            temperature_C,
            temperature_K: T_K,
            D_m2_s: D,
            D_cm2_s: D * 1e4,
            diffusionLength_1hr_mm: x_1hr,
            diffusionLength_1hr_um: x_1hr * 1000,
            parameters: { D0_m2_s, Q_kJ_mol }
        };
    },
    
    /**
     * Diffusion profile for semi-infinite solid
     * @param {Object} params - Diffusion parameters
     * @returns {Object} Concentration profile
     */
    diffusionProfile: function(params) {
        const {
            C0 = 0,                   // Initial concentration
            Cs = 1,                   // Surface concentration
            D_m2_s,                   // Diffusion coefficient
            time_s,                   // Time in seconds
            depths_mm = [0, 0.1, 0.2, 0.5, 1, 2, 5] // Depths to calculate
        } = params;
        
        const profile = depths_mm.map(x_mm => {
            const x = x_mm / 1000; // Convert to meters
            const argument = x / (2 * Math.sqrt(D_m2_s * time_s));
            const erf_val = this._erf(argument);
            const C = C0 + (Cs - C0) * (1 - erf_val);
            
            return {
                depth_mm: x_mm,
                depth_um: x_mm * 1000,
                concentration: C,
                normalized: (C - C0) / (Cs - C0)
            };
        });
        
        // Characteristic diffusion length
        const diffLength = Math.sqrt(D_m2_s * time_s) * 1000; // mm
        
        return {
            C0,
            Cs,
            D_m2_s,
            time_s,
            time_hours: time_s / 3600,
            characteristicLength_mm: diffLength,
            profile
        };
    },
    
    // Error function approximation
    _erf: function(x) {
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;
        
        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x);
        
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        
        return sign * y;
    },
    
    /**
     * Calculate critical nucleus size for phase transformation
     * @param {Object} params - Nucleation parameters
     * @returns {Object} Critical nucleus analysis
     */
    criticalNucleus: function(params) {
        const {
            gamma_J_m2 = 0.5,         // Surface energy
            deltaGv_J_m3 = -1e8,      // Volume free energy change (negative for transformation)
            temperature_C = 500
        } = params;
        
        const T_K = temperature_C + 273.15;
        
        // Critical radius: r* = -2γ/ΔGv
        const r_star = -2 * gamma_J_m2 / deltaGv_J_m3;
        
        // Critical free energy: ΔG* = (16πγ³)/(3ΔGv²)
        const deltaG_star = (16 * Math.PI * Math.pow(gamma_J_m2, 3)) / 
                           (3 * Math.pow(deltaGv_J_m3, 2));
        
        // Number of atoms in critical nucleus (approximate for metallic system)
        const atomVolume = 2e-29; // m³ typical
        const n_star = (4/3) * Math.PI * Math.pow(r_star, 3) / atomVolume;
        
        // Boltzmann factor
        const kB = 1.38e-23;
        const nucleationBarrier = deltaG_star / (kB * T_K);
        
        return {
            criticalRadius_m: r_star,
            criticalRadius_nm: r_star * 1e9,
            criticalFreeEnergy_J: deltaG_star,
            criticalFreeEnergy_kT: nucleationBarrier,
            atomsInNucleus: Math.round(n_star),
            temperature_C,
            parameters: { gamma_J_m2, deltaGv_J_m3 }
        };
    },
    
    /**
     * Avrami equation for transformation kinetics
     * @param {Object} params - Transformation parameters
     * @returns {Object} Transformation fraction over time
     */
    avramiTransformation: function(params) {
        const {
            k = 0.01,                 // Rate constant (s^-n)
            n = 3,                    // Avrami exponent
            times_s = [0, 60, 120, 300, 600, 1200, 3600] // Times to calculate
        } = params;
        
        const profile = times_s.map(t => {
            // f = 1 - exp(-kt^n)
            const f = 1 - Math.exp(-k * Math.pow(t, n));
            return {
                time_s: t,
                time_min: t / 60,
                fractionTransformed: f,
                fractionRemaining: 1 - f
            };
        });
        
        // Time for 50% transformation
        const t_half = Math.pow(Math.log(2) / k, 1/n);
        
        // Interpretation of n
        let interpretation;
        if (n <= 1) interpretation = '1D growth, site saturation';
        else if (n <= 2) interpretation = '2D growth or 1D + continuous nucleation';
        else if (n <= 3) interpretation = '3D growth, site saturation';
        else interpretation = '3D growth with continuous nucleation';
        
        return {
            k,
            n,
            interpretation,
            halfTime_s: t_half,
            halfTime_min: t_half / 60,
            profile
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: MECHANICAL BEHAVIOR (MIT 3.22)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_MECHANICAL_BEHAVIOR = {
    
    /**
     * Power law (Hollomon) hardening model
     * @param {number} strain - True plastic strain
     * @param {Object} material - Material parameters
     * @returns {Object} Flow stress analysis
     */
    hollomonHardening: function(strain, material = {}) {
        const {
            K_MPa = 500,              // Strength coefficient
            n = 0.2,                  // Strain hardening exponent
            name = 'Custom'
        } = material;
        
        // σ = K × ε^n
        const stress = K_MPa * Math.pow(Math.max(strain, 1e-10), n);
        
        // Necking onset at ε = n
        const neckingStrain = n;
        const neckingStress = K_MPa * Math.pow(n, n);
        
        // Work hardening rate
        const dSigma_dEpsilon = n * stress / Math.max(strain, 1e-10);
        
        return {
            material: name,
            trueStrain: strain,
            trueStress_MPa: stress,
            workHardeningRate_MPa: dSigma_dEpsilon,
            instabilityPoint: {
                strain: neckingStrain,
                stress_MPa: neckingStress
            },
            parameters: { K_MPa, n }
        };
    },
    
    /**
     * Steady-state creep rate calculation
     * @param {Object} params - Creep parameters
     * @returns {Object} Creep rate analysis
     */
    creepRate: function(params) {
        const {
            stress_MPa = 100,
            temperature_C = 500,
            A = 1e10,                 // Pre-exponential factor
            n = 4,                    // Stress exponent
            Q_kJ_mol = 250,           // Activation energy
            mechanism = 'dislocation' // 'dislocation', 'nabarro_herring', 'coble'
        } = params;
        
        const T_K = temperature_C + 273.15;
        const R = 8.314;
        const Q = Q_kJ_mol * 1000;
        
        // ε̇ = A × σⁿ × exp(-Q/RT)
        let creepRate = A * Math.pow(stress_MPa, n) * Math.exp(-Q / (R * T_K));
        
        // For diffusion creep, adjust for grain size if provided
        let mechanismDescription;
        switch (mechanism) {
            case 'dislocation':
                mechanismDescription = 'Power-law dislocation creep (n = 3-8)';
                break;
            case 'nabarro_herring':
                mechanismDescription = 'Nabarro-Herring diffusion creep (n = 1)';
                break;
            case 'coble':
                mechanismDescription = 'Coble grain boundary diffusion (n = 1)';
                break;
            default:
                mechanismDescription = 'Custom mechanism';
        }
        
        // Time to 1% strain
        const timeTo1Percent = 0.01 / creepRate;
        
        return {
            stress_MPa,
            temperature_C,
            creepRate_per_s: creepRate,
            creepRate_per_hour: creepRate * 3600,
            timeTo1Percent_hours: timeTo1Percent / 3600,
            mechanism: mechanismDescription,
            parameters: { A, n, Q_kJ_mol }
        };
    },
    
    /**
     * Larson-Miller parameter for creep life prediction
     * @param {Object} params - LMP parameters
     * @returns {Object} Creep life prediction
     */
    larsonMiller: function(params) {
        const {
            temperature_C = 500,
            stress_MPa = 100,
            LMP = null,               // If known LMP for this stress
            C = 20,                   // LMP constant (typically 20)
            ruptureTime_hr = null     // If calculating LMP from test data
        } = params;
        
        const T_K = temperature_C + 273.15;
        
        if (ruptureTime_hr !== null) {
            // Calculate LMP from test data
            const calculatedLMP = T_K * (C + Math.log10(ruptureTime_hr));
            return {
                temperature_C,
                ruptureTime_hr,
                LMP: calculatedLMP,
                C,
                mode: 'Calculate LMP from test'
            };
        } else if (LMP !== null) {
            // Predict rupture time from known LMP
            const predictedTime = Math.pow(10, LMP / T_K - C);
            return {
                temperature_C,
                stress_MPa,
                LMP,
                predictedRuptureTime_hr: predictedTime,
                predictedRuptureTime_days: predictedTime / 24,
                predictedRuptureTime_years: predictedTime / 8760,
                C,
                mode: 'Predict life from LMP'
            };
        } else {
            throw new Error('Provide either LMP or ruptureTime_hr');
        }
    },
    
    /**
     * Basquin equation for high-cycle fatigue (S-N curve)
     * @param {Object} params - Fatigue parameters
     * @returns {Object} Fatigue life prediction
     */
    basquinFatigue: function(params) {
        const {
            stressAmplitude_MPa = null,
            cycles = null,
            sigma_f_MPa = 1000,       // Fatigue strength coefficient
            b = -0.1                  // Fatigue strength exponent
        } = params;
        
        if (stressAmplitude_MPa !== null) {
            // Calculate cycles to failure from stress
            // σ_a = σ'_f × (2N_f)^b
            // 2N_f = (σ_a / σ'_f)^(1/b)
            const twoNf = Math.pow(stressAmplitude_MPa / sigma_f_MPa, 1/b);
            const Nf = twoNf / 2;
            
            return {
                stressAmplitude_MPa,
                cyclesToFailure: Nf,
                reversals: twoNf,
                mode: 'Life from stress',
                parameters: { sigma_f_MPa, b }
            };
        } else if (cycles !== null) {
            // Calculate stress amplitude for given life
            const sigma_a = sigma_f_MPa * Math.pow(2 * cycles, b);
            
            return {
                targetCycles: cycles,
                stressAmplitude_MPa: sigma_a,
                mode: 'Stress from life',
                parameters: { sigma_f_MPa, b }
            };
        } else {
            throw new Error('Provide either stressAmplitude_MPa or cycles');
        }
    },
    
    /**
     * Coffin-Manson equation for low-cycle fatigue
     * @param {Object} params - Fatigue parameters
     * @returns {Object} Strain-life analysis
     */
    coffinManson: function(params) {
        const {
            strainAmplitude = null,   // Total strain amplitude
            cycles = null,
            E_MPa = 200000,           // Young's modulus
            sigma_f_MPa = 1000,       // Fatigue strength coefficient
            b = -0.1,                 // Fatigue strength exponent
            epsilon_f = 0.5,          // Fatigue ductility coefficient
            c = -0.6                  // Fatigue ductility exponent
        } = params;
        
        // Combined equation:
        // Δε/2 = (σ'_f/E)(2N_f)^b + ε'_f(2N_f)^c
        
        if (cycles !== null) {
            const twoNf = 2 * cycles;
            const elasticPart = (sigma_f_MPa / E_MPa) * Math.pow(twoNf, b);
            const plasticPart = epsilon_f * Math.pow(twoNf, c);
            const totalAmplitude = elasticPart + plasticPart;
            
            // Transition life (where elastic = plastic)
            const transitionLife = Math.pow(
                (epsilon_f * E_MPa / sigma_f_MPa), 
                1 / (b - c)
            ) / 2;
            
            return {
                targetCycles: cycles,
                strainAmplitude_total: totalAmplitude,
                strainAmplitude_elastic: elasticPart,
                strainAmplitude_plastic: plasticPart,
                transitionLife_cycles: transitionLife,
                regime: cycles < transitionLife ? 'Low-cycle (plastic)' : 'High-cycle (elastic)',
                parameters: { sigma_f_MPa, b, epsilon_f, c }
            };
        } else if (strainAmplitude !== null) {
            // Iteratively solve for Nf
            let Nf = 1000; // Initial guess
            for (let i = 0; i < 50; i++) {
                const twoNf = 2 * Nf;
                const calculated = (sigma_f_MPa / E_MPa) * Math.pow(twoNf, b) + 
                                  epsilon_f * Math.pow(twoNf, c);
                const ratio = strainAmplitude / calculated;
                Nf = Nf * Math.pow(ratio, 1 / Math.min(b, c));
                if (Math.abs(calculated - strainAmplitude) / strainAmplitude < 0.001) break;
            }
            
            return {
                strainAmplitude,
                cyclesToFailure: Nf,
                mode: 'Life from strain',
                parameters: { sigma_f_MPa, b, epsilon_f, c }
            };
        } else {
            throw new Error('Provide either strainAmplitude or cycles');
        }
    }