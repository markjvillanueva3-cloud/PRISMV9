/**
 * PRISM_MONTE_CARLO_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * References: 20
 * Lines: 342
 * Session: R2.3.1 Wave 2 Engine Gap Extraction
 */

const PRISM_MONTE_CARLO_ENGINE = {

    version: '1.0.0',
    authority: 'PRISM_MONTE_CARLO_ENGINE',
    created: '2026-01-14',
    innovationId: 'MONTE_CARLO_TOOL_LIFE',

    // CONFIGURATION

    config: {
        DEFAULT_SAMPLES: 10000,
        MIN_SAMPLES: 100,
        MAX_SAMPLES: 1000000,

        // Confidence levels
        CONFIDENCE_90: 0.90,
        CONFIDENCE_95: 0.95,
        CONFIDENCE_99: 0.99,

        // Tool life parameter uncertainties (coefficient of variation)
        TAYLOR_C_CV: 0.15,      // 15% uncertainty in Taylor C constant
        TAYLOR_N_CV: 0.08,      // 8% uncertainty in Taylor n exponent
        CUTTING_SPEED_CV: 0.02, // 2% machine variation

        // Process variations
        MATERIAL_HARDNESS_CV: 0.05,   // 5% material variation
        TOOL_QUALITY_CV: 0.10,        // 10% tool-to-tool variation
        SETUP_VARIATION_CV: 0.03      // 3% setup variation
    },
    // SECTION 1: RANDOM NUMBER GENERATION & DISTRIBUTIONS

    random: {
        /**
         * Uniform random number in [min, max]
         */
        uniform: function(min = 0, max = 1) {
            return min + Math.random() * (max - min);
        },
        /**
         * Normal (Gaussian) distribution using Box-Muller transform
         * @param {number} mean - Mean of distribution
         * @param {number} stdDev - Standard deviation
         * @returns {number} Random sample from normal distribution
         */
        normal: function(mean = 0, stdDev = 1) {
            let u1, u2;
            do {
                u1 = Math.random();
                u2 = Math.random();
            } while (u1 === 0);

            const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            return mean + z * stdDev;
        },
        /**
         * Log-normal distribution (for positive quantities like tool life)
         * @param {number} mu - Mean of underlying normal
         * @param {number} sigma - Std dev of underlying normal
         */
        lognormal: function(mu, sigma) {
            return Math.exp(this.normal(mu, sigma));
        },
        /**
         * Log-normal from mean and CV (coefficient of variation)
         * More intuitive parameterization
         */
        lognormalFromMeanCV: function(mean, cv) {
            const sigma2 = Math.log(1 + cv * cv);
            const mu = Math.log(mean) - sigma2 / 2;
            const sigma = Math.sqrt(sigma2);
            return this.lognormal(mu, sigma);
        },
        /**
         * Weibull distribution (for reliability/failure modeling)
         * @param {number} scale - Scale parameter (lambda)
         * @param {number} shape - Shape parameter (k)
         */
        weibull: function(scale, shape) {
            const u = Math.random();
            return scale * Math.pow(-Math.log(1 - u), 1 / shape);
        },
        /**
         * Exponential distribution
         * @param {number} rate - Rate parameter (lambda = 1/mean)
         */
        exponential: function(rate) {
            return -Math.log(Math.random()) / rate;
        },
        /**
         * Triangular distribution
         * @param {number} min - Minimum value
         * @param {number} mode - Most likely value
         * @param {number} max - Maximum value
         */
        triangular: function(min, mode, max) {
            const u = Math.random();
            const f = (mode - min) / (max - min);

            if (u < f) {
                return min + Math.sqrt(u * (max - min) * (mode - min));
            } else {
                return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
            }
        },
        /**
         * Beta distribution (for bounded quantities like percentages)
         * @param {number} alpha - Shape parameter 1
         * @param {number} beta - Shape parameter 2
         */
        beta: function(alpha, beta) {
            // Using Gamma distribution method
            const gamma1 = this.gamma(alpha, 1);
            const gamma2 = this.gamma(beta, 1);
            return gamma1 / (gamma1 + gamma2);
        },
        /**
         * Gamma distribution (helper for beta)
         */
        gamma: function(shape, scale) {
            if (shape < 1) {
                return this.gamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
            }
            const d = shape - 1 / 3;
            const c = 1 / Math.sqrt(9 * d);

            while (true) {
                let x, v;
                do {
                    x = this.normal(0, 1);
                    v = 1 + c * x;
                } while (v <= 0);

                v = v * v * v;
                const u = Math.random();

                if (u < 1 - 0.0331 * x * x * x * x) {
                    return d * v * scale;
                }
                if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
                    return d * v * scale;
                }
            }
        }
    },
    // SECTION 2: CORE MONTE CARLO SIMULATION

    /**
     * Run Monte Carlo simulation
     * @param {Function} model - Function that takes no args and returns a sample
     * @param {number} samples - Number of samples to generate
     * @returns {Object} Simulation results with statistics
     */
    simulate: function(model, samples = null) {
        const n = samples || this.config.DEFAULT_SAMPLES;
        const results = [];

        const startTime = performance.now();

        // Generate samples
        for (let i = 0; i < n; i++) {
            results.push(model());
        }
        const endTime = performance.now();

        // Calculate statistics
        return this.analyzeResults(results, endTime - startTime);
    },
    /**
     * Analyze simulation results
     * @param {Array} samples - Array of sample values
     * @param {number} executionTime - Time taken for simulation
     * @returns {Object} Statistical analysis
     */
    analyzeResults: function(samples, executionTime = 0) {
        const n = samples.length;
        if (n === 0) return null;

        // Sort for percentile calculations
        const sorted = [...samples].sort((a, b) => a - b);

        // Basic statistics
        const sum = samples.reduce((a, b) => a + b, 0);
        const mean = sum / n;

        const squaredDiffs = samples.map(x => Math.pow(x - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (n - 1);
        const stdDev = Math.sqrt(variance);

        // Percentiles
        const percentile = (p) => {
            const idx = Math.ceil(p * n) - 1;
            return sorted[Math.max(0, Math.min(n - 1, idx))];
        };
        // Confidence intervals
        const ci95 = {
            lower: percentile(0.025),
            upper: percentile(0.975)
        };
        const ci90 = {
            lower: percentile(0.05),
            upper: percentile(0.95)
        };
        const ci99 = {
            lower: percentile(0.005),
            upper: percentile(0.995)
        };
        return {
            sampleCount: n,
            mean: mean,
            median: percentile(0.5),
            stdDev: stdDev,
            variance: variance,
            cv: stdDev / mean,  // Coefficient of variation
            min: sorted[0],
            max: sorted[n - 1],

            percentiles: {
                p5: percentile(0.05),
                p10: percentile(0.10),
                p25: percentile(0.25),
                p50: percentile(0.50),
                p75: percentile(0.75),
                p90: percentile(0.90),
                p95: percentile(0.95),
                p99: percentile(0.99)
            },
            confidenceIntervals: {
                ci90: ci90,
                ci95: ci95,
                ci99: ci99
            },
            executionTime: executionTime.toFixed(2) + 'ms',

            // Raw data for histogram
            samples: sorted
        };
    },
    /**
     * Generate histogram bins from samples
     */
    histogram: function(samples, binCount = 20) {
        const min = Math.min(...samples);
        const max = Math.max(...samples);
        const binWidth = (max - min) / binCount;

        const bins = Array(binCount).fill(0);
        const binEdges = [];

        for (let i = 0; i <= binCount; i++) {
            binEdges.push(min + i * binWidth);
        }
        for (const sample of samples) {
            const binIdx = Math.min(
                Math.floor((sample - min) / binWidth),
                binCount - 1
            );
            bins[binIdx]++;
        }
        return {
            bins: bins,
            binEdges: binEdges,
            binWidth: binWidth,
            frequencies: bins.map(b => b / samples.length)
        };
    },
    // SECTION 3: TOOL LIFE PREDICTION

    /**
     * Probabilistic tool life prediction using Taylor's equation with uncertainty
     * T = C / V^(1/n) where C and n have uncertainty
     *
     * @param {Object} params - Cutting parameters
     * @param {Object} material - Material properties with Taylor constants
     * @param {Object} options - Simulation options
     * @returns {Object} Probabilistic tool life prediction
     */
    predictToolLife: function(params, material, options = {}) {
        const samples = options.samples || this.config.DEFAULT_SAMPLES;

        // Extract parameters
        const cuttingSpeed = params.cuttingSpeed || params.v || 100; // m/min
        const feedrate = params.feedrate || params.f || 0.2;         // mm/rev
        const doc = params.doc || params.ap || 2;                    // mm

        // Taylor constants with uncertainty
        const C_mean = material.taylorC || material.C || 200;
        const n_mean = material.taylorN || material.n || 0.25;

        // Coefficient of variation for parameters
        const C_cv = options.C_cv || this.config.TAYLOR_C_CV;
        const n_cv = options.N_cv || this.config.TAYLOR_N_CV;
        const v_cv = options.v_cv || this.config.CUTTING_SPEED_CV;

        // Tool quality variation
        const toolQuality_cv = options.toolQuality_cv || this.config.TOOL_QUALITY_CV;

        const self = this;

        // Monte Carlo model
        const toolLifeModel = function() {
            // Sample uncertain parameters
            const C = self.random.lognormalFromMeanCV(C_mean, C_cv);
            const n = self.random.normal(n_mean, n_mean * n_cv);
            const v = self.random.normal(cuttingSpeed, cuttingSpeed * v_cv);
            const toolFactor = self.random.lognormalFromMeanCV(1.0, toolQuality_cv);

            // Extended Taylor equation
            // T = C * toolFactor / (V^(1/n) * f^a * ap^b)
            const a = 0.2;  // Feed exponent
            const b = 0.1;  // Depth exponent

            const toolLife = (C * toolFactor) /
                            (Math.pow(Math.max(v, 1), 1/Math.max(n, 0.1)) *
                             Math.pow(feedrate, a) *
                             Math.pow(doc, b));

            return Math.max(0.1, toolLife); // Minimum 0.1 minutes
        };
        // Run simulation
        const results = this.simulate(toolLifeModel, samples);

        // Add interpretation
        return {
            ...results,

            // Formatted output
            prediction: {
                expected: results.mean.toFixed(1) + ' min',
                median: results.median.toFixed(1) + ' min',
                ci95: `${results.confidenceIntervals.ci95.lower.toFixed(1)} - ${results.confidenceIntervals.ci95.upper.toFixed(1)} min`,
                ci90: `${results.confidenceIntervals.ci90.lower.toFixed(1)} - ${results.confidenceIntervals.ci90.upper.toFixed(1)} min`
            },
            // Risk assessment
            risk: {
                // Probability of tool lasting less than X minutes
                probLessThan10min: this._calculateProbLessThan(results.samples, 10),
                probLessThan20min: this._calculateProbLessThan(results.samples, 20),
                probLessThan30min: this._calculateProbLessThan(results.samples, 30),

                // Recommended tool change interval (95% confidence won't fail)
                safeChangeInterval: results.percentiles.p5.toFixed(1) + ' min'
            }