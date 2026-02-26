const PRISM_CROSS_DOMAIN = {

    version: '1.0.0',
    phase: 'Phase 6: Cross-Domain Innovations',
    created: '2026-01-14',

    // SECTION 1: KALMAN FILTER ENGINE
    // Source: MIT 2.004, PRISM_ADVANCED_CROSS_DOMAIN_v1.js
    // Purpose: Optimal state estimation for machine position tracking

    kalmanFilter: {
        name: "Kalman Filter Engine",
        description: "Optimal linear state estimation for position tracking and sensor fusion",

        // Matrix Operations

        /**
         * Create identity matrix
         */
        eye: function(n) {
            const I = [];
            for (let i = 0; i < n; i++) {
                I[i] = [];
                for (let j = 0; j < n; j++) {
                    I[i][j] = i === j ? 1 : 0;
                }
            }
            return I;
        },
        /**
         * Create zero matrix
         */
        zeros: function(rows, cols) {
            const Z = [];
            for (let i = 0; i < rows; i++) {
                Z[i] = new Array(cols).fill(0);
            }
            return Z;
        },
        /**
         * Matrix multiplication
         */
        matMul: function(A, B) {
            const m = A.length;
            const n = B[0].length;
            const p = B.length;
            const C = this.zeros(m, n);

            for (let i = 0; i < m; i++) {
                for (let j = 0; j < n; j++) {
                    for (let k = 0; k < p; k++) {
                        C[i][j] += A[i][k] * B[k][j];
                    }
                }
            }
            return C;
        },
        /**
         * Matrix-vector multiplication
         */
        matVecMul: function(A, v) {
            const m = A.length;
            const result = new Array(m).fill(0);
            for (let i = 0; i < m; i++) {
                for (let j = 0; j < v.length; j++) {
                    result[i] += A[i][j] * v[j];
                }
            }
            return result;
        },
        /**
         * Matrix addition
         */
        matAdd: function(A, B) {
            const m = A.length;
            const n = A[0].length;
            const C = this.zeros(m, n);
            for (let i = 0; i < m; i++) {
                for (let j = 0; j < n; j++) {
                    C[i][j] = A[i][j] + B[i][j];
                }
            }
            return C;
        },
        /**
         * Matrix subtraction
         */
        matSub: function(A, B) {
            const m = A.length;
            const n = A[0].length;
            const C = this.zeros(m, n);
            for (let i = 0; i < m; i++) {
                for (let j = 0; j < n; j++) {
                    C[i][j] = A[i][j] - B[i][j];
                }
            }
            return C;
        },
        /**
         * Matrix transpose
         */
        transpose: function(A) {
            const m = A.length;
            const n = A[0].length;
            const T = this.zeros(n, m);
            for (let i = 0; i < m; i++) {
                for (let j = 0; j < n; j++) {
                    T[j][i] = A[i][j];
                }
            }
            return T;
        },
        /**
         * Matrix inverse (Gauss-Jordan)
         */
        inverse: function(A) {
            const n = A.length;
            const Aug = A.map((row, i) => [...row, ...this.eye(n)[i]]);

            for (let i = 0; i < n; i++) {
                // Pivot
                let maxRow = i;
                for (let k = i + 1; k < n; k++) {
                    if (Math.abs(Aug[k][i]) > Math.abs(Aug[maxRow][i])) {
                        maxRow = k;
                    }
                }
                [Aug[i], Aug[maxRow]] = [Aug[maxRow], Aug[i]];

                // Scale
                const pivot = Aug[i][i];
                if (Math.abs(pivot) < 1e-10) {
                    throw new Error('Matrix is singular');
                }
                for (let j = 0; j < 2 * n; j++) {
                    Aug[i][j] /= pivot;
                }
                // Eliminate
                for (let k = 0; k < n; k++) {
                    if (k !== i) {
                        const factor = Aug[k][i];
                        for (let j = 0; j < 2 * n; j++) {
                            Aug[k][j] -= factor * Aug[i][j];
                        }
                    }
                }
            }
            return Aug.map(row => row.slice(n));
        },
        /**
         * Vector subtraction
         */
        vecSub: function(a, b) {
            return a.map((v, i) => v - b[i]);
        },
        /**
         * Vector addition
         */
        vecAdd: function(a, b) {
            return a.map((v, i) => v + b[i]);
        },
        // Kalman Filter Implementation

        /**
         * Create a new Kalman Filter
         * @param {Object} config - Configuration
         */
        create: function(config) {
            const {
                stateSize,      // Dimension of state vector
                measurementSize, // Dimension of measurement vector
                F,              // State transition matrix
                H,              // Measurement matrix
                Q,              // Process noise covariance
                R,              // Measurement noise covariance
                x0,             // Initial state estimate
                P0              // Initial covariance estimate
            } = config;

            return {
                n: stateSize,
                m: measurementSize,
                F: F || this.eye(stateSize),
                H: H || this.eye(measurementSize),
                Q: Q || this.eye(stateSize).map(r => r.map(v => v * 0.01)),
                R: R || this.eye(measurementSize).map(r => r.map(v => v * 0.1)),
                x: x0 || new Array(stateSize).fill(0),
                P: P0 || this.eye(stateSize),

                // Control input (optional)
                B: config.B || null,

                // History
                history: []
            };
        },
        /**
         * Prediction step
         */
        predict: function(kf, u = null) {
            // x_pred = F * x + B * u
            let x_pred = this.matVecMul(kf.F, kf.x);
            if (kf.B && u) {
                const Bu = this.matVecMul(kf.B, u);
                x_pred = this.vecAdd(x_pred, Bu);
            }
            // P_pred = F * P * F' + Q
            const FP = this.matMul(kf.F, kf.P);
            const FPFt = this.matMul(FP, this.transpose(kf.F));
            const P_pred = this.matAdd(FPFt, kf.Q);

            return { x: x_pred, P: P_pred };
        },
        /**
         * Update step
         */
        update: function(kf, z, predicted) {
            const { x: x_pred, P: P_pred } = predicted;

            // Innovation: y = z - H * x_pred
            const Hx = this.matVecMul(kf.H, x_pred);
            const y = this.vecSub(z, Hx);

            // Innovation covariance: S = H * P_pred * H' + R
            const HP = this.matMul(kf.H, P_pred);
            const HPHt = this.matMul(HP, this.transpose(kf.H));
            const S = this.matAdd(HPHt, kf.R);

            // Kalman gain: K = P_pred * H' * S^(-1)
            const PHt = this.matMul(P_pred, this.transpose(kf.H));
            const S_inv = this.inverse(S);
            const K = this.matMul(PHt, S_inv);

            // Updated state: x = x_pred + K * y
            const Ky = this.matVecMul(K, y);
            const x = this.vecAdd(x_pred, Ky);

            // Updated covariance: P = (I - K * H) * P_pred
            const KH = this.matMul(K, kf.H);
            const IKH = this.matSub(this.eye(kf.n), KH);
            const P = this.matMul(IKH, P_pred);

            // Update filter state
            kf.x = x;
            kf.P = P;

            // Store history
            kf.history.push({
                x: [...x],
                P: P.map(r => [...r]),
                innovation: [...y],
                gain: K.map(r => [...r])
            });

            return { x, P, innovation: y, gain: K };
        },
        /**
         * Single step: predict + update
         */
        step: function(kf, z, u = null) {
            const predicted = this.predict(kf, u);
            return this.update(kf, z, predicted);
        },
        /**
         * Get current state estimate
         */
        getState: function(kf) {
            return {
                x: [...kf.x],
                P: kf.P.map(r => [...r]),
                uncertainty: kf.P.map((r, i) => Math.sqrt(r[i])) // Diagonal std devs
            };
        },
        // Manufacturing Applications

        /**
         * Create position tracking filter for CNC machine
         * State: [x, y, z, vx, vy, vz] (position + velocity)
         */
        createPositionTracker: function(dt = 0.001, processNoise = 0.01, measurementNoise = 0.001) {
            const n = 6; // State size
            const m = 3; // Measurement size (position only)

            // State transition matrix (constant velocity model)
            const F = [
                [1, 0, 0, dt, 0, 0],
                [0, 1, 0, 0, dt, 0],
                [0, 0, 1, 0, 0, dt],
                [0, 0, 0, 1, 0, 0],
                [0, 0, 0, 0, 1, 0],
                [0, 0, 0, 0, 0, 1]
            ];

            // Measurement matrix (we only measure position)
            const H = [
                [1, 0, 0, 0, 0, 0],
                [0, 1, 0, 0, 0, 0],
                [0, 0, 1, 0, 0, 0]
            ];

            // Process noise
            const Q = this.eye(n).map(r => r.map(v => v * processNoise));

            // Measurement noise
            const R = this.eye(m).map(r => r.map(v => v * measurementNoise));

            return this.create({
                stateSize: n,
                measurementSize: m,
                F, H, Q, R,
                x0: [0, 0, 0, 0, 0, 0],
                P0: this.eye(n)
            });
        },
        /**
         * Create thermal compensation filter
         * State: [temp, dtemp/dt, thermal_error]
         */
        createThermalCompensation: function(thermalCoeff = 11.7e-6) {
            const n = 3;
            const m = 2; // Measure temperature and position error

            const dt = 1.0; // 1 second samples

            const F = [
                [1, dt, 0],
                [0, 1, 0],
                [thermalCoeff, 0, 1]
            ];

            const H = [
                [1, 0, 0],  // Temperature measurement
                [0, 0, 1]   // Error measurement
            ];

            return this.create({
                stateSize: n,
                measurementSize: m,
                F, H,
                Q: [[0.1, 0, 0], [0, 0.01, 0], [0, 0, 0.001]],
                R: [[0.5, 0], [0, 0.001]],
                x0: [20, 0, 0], // 20°C initial, no drift, no error
                P0: this.eye(n)
            });
        },
        /**
         * Fuse multiple encoder readings
         */
        fuseEncoders: function(readings, weights = null) {
            const n = readings.length;
            if (n === 0) return null;

            if (!weights) {
                weights = new Array(n).fill(1 / n);
            }
            // Weighted average
            let sum = 0;
            let variance = 0;

            for (let i = 0; i < n; i++) {
                sum += weights[i] * readings[i].value;
            }
            // Compute weighted variance
            for (let i = 0; i < n; i++) {
                variance += weights[i] * weights[i] * (readings[i].uncertainty || 0.001) ** 2;
            }
            return {
                value: sum,
                uncertainty: Math.sqrt(variance)
            };
        },
        prismApplication: "PositionTrackingEngine - encoder fusion, thermal compensation"
    },
    // SECTION 2: UNCERTAINTY PROPAGATION ENGINE (INDUSTRY FIRST)
    // Source: NIST GUM, PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js
    // Purpose: Track and accumulate errors through entire CAD/CAM workflow

    uncertaintyPropagation: {
        name: "Uncertainty Propagation Engine",
        description: "Track and propagate measurement uncertainty through calculations",
        industryFirst: true,

        /**
         * Create uncertain value
         */
        uncertain: function(value, uncertainty, distribution = 'normal') {
            return {
                value,
                uncertainty,
                distribution,
                dof: Infinity, // Degrees of freedom
                sources: []    // Contributing uncertainty sources
            };
        },
        /**
         * Add uncertain values: c = a + b
         */
        add: function(a, b) {
            const aVal = typeof a === 'number' ? a : a.value;
            const bVal = typeof b === 'number' ? b : b.value;
            const aUnc = typeof a === 'number' ? 0 : a.uncertainty;
            const bUnc = typeof b === 'number' ? 0 : b.uncertainty;

            return {
                value: aVal + bVal,
                uncertainty: Math.sqrt(aUnc * aUnc + bUnc * bUnc),
                distribution: 'normal',
                sources: [
                    { operation: 'add', contribution: aUnc * aUnc },
                    { operation: 'add', contribution: bUnc * bUnc }
                ]
            };
        },
        /**
         * Subtract uncertain values: c = a - b
         */
        subtract: function(a, b) {
            const aVal = typeof a === 'number' ? a : a.value;
            const bVal = typeof b === 'number' ? b : b.value;
            const aUnc = typeof a === 'number' ? 0 : a.uncertainty;
            const bUnc = typeof b === 'number' ? 0 : b.uncertainty;

            return {
                value: aVal - bVal,
                uncertainty: Math.sqrt(aUnc * aUnc + bUnc * bUnc),
                distribution: 'normal',
                sources: [
                    { operation: 'subtract', contribution: aUnc * aUnc },
                    { operation: 'subtract', contribution: bUnc * bUnc }
                ]
            };
        },
        /**
         * Multiply uncertain values: c = a * b
         */
        multiply: function(a, b) {
            const aVal = typeof a === 'number' ? a : a.value;
            const bVal = typeof b === 'number' ? b : b.value;
            const aUnc = typeof a === 'number' ? 0 : a.uncertainty;
            const bUnc = typeof b === 'number' ? 0 : b.uncertainty;

            const value = aVal * bVal;

            // Relative uncertainty propagation
            const relA = aVal !== 0 ? aUnc / Math.abs(aVal) : 0;
            const relB = bVal !== 0 ? bUnc / Math.abs(bVal) : 0;
            const relC = Math.sqrt(relA * relA + relB * relB);

            return {
                value,
                uncertainty: Math.abs(value) * relC,
                distribution: 'normal',
                sources: [
                    { operation: 'multiply', relativeContribution: relA * relA },
                    { operation: 'multiply', relativeContribution: relB * relB }
                ]
            };
        },
        /**
         * Divide uncertain values: c = a / b
         */
        divide: function(a, b) {
            const aVal = typeof a === 'number' ? a : a.value;
            const bVal = typeof b === 'number' ? b : b.value;
            const aUnc = typeof a === 'number' ? 0 : a.uncertainty;
            const bUnc = typeof b === 'number' ? 0 : b.uncertainty;

            if (Math.abs(bVal) < 1e-10) {
                throw new Error('Division by zero');
            }
            const value = aVal / bVal;

            const relA = aVal !== 0 ? aUnc / Math.abs(aVal) : 0;
            const relB = bUnc / Math.abs(bVal);
            const relC = Math.sqrt(relA * relA + relB * relB);

            return {
                value,
                uncertainty: Math.abs(value) * relC,
                distribution: 'normal'
            };
        },
        /**
         * Power: c = a^n
         */
        power: function(a, n) {
            const aVal = typeof a === 'number' ? a : a.value;
            const aUnc = typeof a === 'number' ? 0 : a.uncertainty;

            const value = Math.pow(aVal, n);
            const relA = aVal !== 0 ? aUnc / Math.abs(aVal) : 0;

            return {
                value,
                uncertainty: Math.abs(n) * Math.abs(value) * relA,
                distribution: 'normal'
            };
        },
        /**
         * Square root: c = sqrt(a)
         */
        sqrt: function(a) {
            return this.power(a, 0.5);
        },
        /**
         * Trigonometric functions with uncertainty
         */
        sin: function(a) {
            const aVal = typeof a === 'number' ? a : a.value;
            const aUnc = typeof a === 'number' ? 0 : a.uncertainty;

            return {
                value: Math.sin(aVal),
                uncertainty: Math.abs(Math.cos(aVal)) * aUnc,
                distribution: 'normal'
            };
        },
        cos: function(a) {
            const aVal = typeof a === 'number' ? a : a.value;
            const aUnc = typeof a === 'number' ? 0 : a.uncertainty;

            return {
                value: Math.cos(aVal),
                uncertainty: Math.abs(Math.sin(aVal)) * aUnc,
                distribution: 'normal'
            };
        },
        /**
         * General function propagation using partial derivatives
         * f(x1, x2, ..., xn) with uncertainties u1, u2, ..., un
         * uc = sqrt(sum((df/dxi * ui)^2))
         */
        propagate: function(f, values, uncertainties, dx = 1e-6) {
            const n = values.length;
            const y = f(...values);

            // Compute partial derivatives numerically
            const partials = [];
            for (let i = 0; i < n; i++) {
                const valuesPlus = [...values];
                valuesPlus[i] += dx;
                const yPlus = f(...valuesPlus);
                partials.push((yPlus - y) / dx);
            }
            // Compute combined uncertainty
            let uc2 = 0;
            const contributions = [];
            for (let i = 0; i < n; i++) {
                const contribution = (partials[i] * uncertainties[i]) ** 2;
                uc2 += contribution;
                contributions.push({
                    index: i,
                    partial: partials[i],
                    uncertainty: uncertainties[i],
                    contribution: Math.sqrt(contribution)
                });
            }
            return {
                value: y,
                uncertainty: Math.sqrt(uc2),
                distribution: 'normal',
                contributions
            };
        },
        /**
         * Compute expanded uncertainty with coverage factor
         */
        expandedUncertainty: function(u, k = 2) {
            // k=2 gives ~95% confidence for normal distribution
            return {
                standard: u.uncertainty,
                expanded: u.uncertainty * k,
                coverageFactor: k,
                confidenceLevel: k === 2 ? 0.95 : (k === 3 ? 0.997 : null)
            };
        },
        // Manufacturing Applications

        /**
         * Propagate uncertainty through coordinate transformation
         */
        transformPoint: function(point, uncertainties, transform) {
            // point: [x, y, z] with uncertainties
            const { rotation, translation } = transform;

            // For rotation matrix R and translation T:
            // p' = R * p + T

            // Simplified: propagate through each coordinate
            const results = [];
            for (let i = 0; i < 3; i++) {
                let sum = 0;
                let unc2 = 0;

                for (let j = 0; j < 3; j++) {
                    const r = rotation ? rotation[i][j] : (i === j ? 1 : 0);
                    sum += r * point[j];
                    unc2 += (r * uncertainties[j]) ** 2;
                }
                if (translation) {
                    sum += translation[i];
                    // Translation uncertainty would be added here
                }
                results.push({
                    value: sum,
                    uncertainty: Math.sqrt(unc2)
                });
            }
            return results;
        },
        /**
         * Compute total part uncertainty from multiple sources
         */
        combinedPartUncertainty: function(sources) {
            // sources: [{ name, type, uncertainty }, ...]
            // Types: 'A' (statistical), 'B' (other)

            let typeA = 0;
            let typeB = 0;
            const breakdown = [];

            for (const source of sources) {
                const u2 = source.uncertainty ** 2;

                if (source.type === 'A') {
                    typeA += u2;
                } else {
                    typeB += u2;
                }
                breakdown.push({
                    name: source.name,
                    type: source.type,
                    uncertainty: source.uncertainty,
                    varianceContribution: u2
                });
            }
            const combined = Math.sqrt(typeA + typeB);
            const expanded = combined * 2; // k=2

            return {
                typeA: Math.sqrt(typeA),
                typeB: Math.sqrt(typeB),
                combined,
                expanded,
                coverageFactor: 2,
                breakdown
            };
        },
        /**
         * Evaluate if part is within tolerance given uncertainty
         */
        toleranceEvaluation: function(measured, nominal, tolerance, uncertainty) {
            const deviation = Math.abs(measured - nominal);
            const guardBand = uncertainty * 2; // 95% confidence

            return {
                measured,
                nominal,
                deviation,
                tolerance,
                uncertainty,
                guardBand,
                conformance: deviation + guardBand <= tolerance ? 'PASS' :
                            (deviation - guardBand > tolerance ? 'FAIL' : 'UNCERTAIN'),
                margin: tolerance - deviation - guardBand
            };
        },
        prismApplication: "UncertaintyEngine - error budgets, tolerance analysis"
    },
    // SECTION 3: MONTE CARLO SIMULATION ENGINE
    // Source: MIT 6.041, PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js
    // Purpose: Statistical simulation for validation and optimization

    monteCarlo: {
        name: "Monte Carlo Simulation Engine",
        description: "Statistical simulation for validation, optimization, and uncertainty analysis",

        // Random Number Generation

        /**
         * Generate uniform random number in [a, b]
         */
        uniform: function(a = 0, b = 1) {
            return a + Math.random() * (b - a);
        },
        /**
         * Generate normal random number (Box-Muller transform)
         */
        normal: function(mean = 0, stdDev = 1) {
            const u1 = Math.random();
            const u2 = Math.random();
            const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            return mean + z0 * stdDev;
        },
        /**
         * Generate log-normal random number
         */
        logNormal: function(mu, sigma) {
            return Math.exp(this.normal(mu, sigma));
        },
        /**
         * Generate triangular random number
         */
        triangular: function(a, b, c) {
            const u = Math.random();
            const fc = (c - a) / (b - a);

            if (u < fc) {
                return a + Math.sqrt(u * (b - a) * (c - a));
            } else {
                return b - Math.sqrt((1 - u) * (b - a) * (b - c));
            }
        },
        /**
         * Generate from arbitrary distribution (inverse transform)
         */
        fromCDF: function(inverseCDF) {
            return inverseCDF(Math.random());
        },
        // Simulation Functions

        /**
         * Run Monte Carlo simulation
         * @param {Function} model - Function to evaluate
         * @param {Array} inputs - Input specifications
         * @param {number} iterations - Number of iterations
         */
        simulate: function(model, inputs, iterations = 10000) {
            const results = [];

            for (let i = 0; i < iterations; i++) {
                // Generate random inputs
                const sampledInputs = inputs.map(input => {
                    switch (input.distribution) {
                        case 'normal':
                            return this.normal(input.mean, input.stdDev);
                        case 'uniform':
                            return this.uniform(input.min, input.max);
                        case 'triangular':
                            return this.triangular(input.min, input.max, input.mode);
                        case 'lognormal':
                            return this.logNormal(input.mu, input.sigma);
                        case 'constant':
                            return input.value;
                        default:
                            return this.normal(input.mean || 0, input.stdDev || 1);
                    }
                });

                // Evaluate model
                const output = model(...sampledInputs);
                results.push(output);
            }
            return this.analyzeResults(results);
        },
        /**
         * Analyze simulation results
         */
        analyzeResults: function(results) {
            const n = results.length;
            const sorted = [...results].sort((a, b) => a - b);

            // Basic statistics
            const mean = results.reduce((a, b) => a + b, 0) / n;
            const variance = results.reduce((sum, x) => sum + (x - mean) ** 2, 0) / (n - 1);
            const stdDev = Math.sqrt(variance);

            // Percentiles
            const percentile = (p) => {
                const idx = Math.floor(p * n);
                return sorted[Math.min(idx, n - 1)];
            };
            return {
                count: n,
                mean,
                stdDev,
                variance,
                min: sorted[0],
                max: sorted[n - 1],
                median: percentile(0.5),
                percentile5: percentile(0.05),
                percentile25: percentile(0.25),
                percentile75: percentile(0.75),
                percentile95: percentile(0.95),
                percentile99: percentile(0.99),

                // Confidence interval (95%)
                confidenceInterval: {
                    lower: mean - 1.96 * stdDev / Math.sqrt(n),
                    upper: mean + 1.96 * stdDev / Math.sqrt(n)
                },
                // Histogram
                histogram: this.createHistogram(results, 20)
            };
        },
        /**
         * Create histogram from results
         */
        createHistogram: function(results, bins = 20) {
            const min = Math.min(...results);
            const max = Math.max(...results);
            const binWidth = (max - min) / bins;

            const histogram = [];
            for (let i = 0; i < bins; i++) {
                histogram.push({
                    binStart: min + i * binWidth,
                    binEnd: min + (i + 1) * binWidth,
                    count: 0
                });
            }
            for (const value of results) {
                const binIdx = Math.min(Math.floor((value - min) / binWidth), bins - 1);
                histogram[binIdx].count++;
            }
            // Convert to density
            const n = results.length;
            for (const bin of histogram) {
                bin.density = bin.count / (n * binWidth);
            }
            return histogram;
        },
        // Manufacturing Applications

        /**
         * Simulate dimensional variation in machining
         */
        simulateDimensionalVariation: function(nominal, sources, iterations = 10000) {
            // sources: [{ name, stdDev, distribution }, ...]

            const model = (...errors) => {
                return nominal + errors.reduce((a, b) => a + b, 0);
            };
            const inputs = sources.map(s => ({
                distribution: s.distribution || 'normal',
                mean: 0,
                stdDev: s.stdDev
            }));

            const results = this.simulate(model, inputs, iterations);

            return {
                ...results,
                nominal,
                sources,
                deviationFromNominal: {
                    mean: results.mean - nominal,
                    stdDev: results.stdDev
                }
            };
        },
        /**
         * Simulate tool wear progression
         */
        simulateToolWear: function(config) {
            const {
                taylorN = 0.25,
                taylorC = 200,
                cuttingSpeed,
                speedVariation = 0.05,
                iterations = 1000
            } = config;

            const model = (speed) => {
                // Taylor tool life: T = (C/V)^(1/n)
                return Math.pow(taylorC / speed, 1 / taylorN);
            };
            const inputs = [{
                distribution: 'normal',
                mean: cuttingSpeed,
                stdDev: cuttingSpeed * speedVariation
            }];

            return this.simulate(model, inputs, iterations);
        },
        /**
         * Simulate cycle time variation
         */
        simulateCycleTime: function(operations, iterations = 5000) {
            // operations: [{ name, meanTime, stdDev }, ...]

            const model = (...times) => times.reduce((a, b) => a + b, 0);

            const inputs = operations.map(op => ({
                distribution: 'normal',
                mean: op.meanTime,
                stdDev: op.stdDev || op.meanTime * 0.1
            }));

            return this.simulate(model, inputs, iterations);
        },
        prismApplication: "SimulationEngine - variation analysis, process validation"
    },
    // SECTION 4: PROCESS CAPABILITY ENGINE (INDUSTRY FIRST)
    // Source: AIAG SPC Manual, PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js
    // Purpose: Real-time Cp/Cpk calculation during toolpath generation

    processCapability: {
        name: "Process Capability Engine",
        description: "Calculate Cp, Cpk, Pp, Ppk for process quality assessment",
        industryFirst: true,

        /**
         * Calculate basic statistics from samples
         */
        calculateStatistics: function(data) {
            const n = data.length;
            if (n === 0) return null;

            const mean = data.reduce((a, b) => a + b, 0) / n;
            const variance = data.reduce((sum, x) => sum + (x - mean) ** 2, 0) / (n - 1);
            const stdDev = Math.sqrt(variance);

            // For subgroups - estimate sigma using range method
            // This would use control chart constants

            return {
                n,
                mean,
                variance,
                stdDev,
                min: Math.min(...data),
                max: Math.max(...data),
                range: Math.max(...data) - Math.min(...data)
            };
        },
        /**
         * Calculate Cp (Process Capability)
         * Cp = (USL - LSL) / (6 * sigma)
         */
        calculateCp: function(USL, LSL, sigma) {
            return (USL - LSL) / (6 * sigma);
        },
        /**
         * Calculate Cpk (Process Capability Index)
         * Cpk = min(Cpu, Cpl)
         * Cpu = (USL - mean) / (3 * sigma)
         * Cpl = (mean - LSL) / (3 * sigma)
         */
        calculateCpk: function(USL, LSL, mean, sigma) {
            const Cpu = (USL - mean) / (3 * sigma);
            const Cpl = (mean - LSL) / (3 * sigma);
            return Math.min(Cpu, Cpl);
        },
        /**
         * Calculate Pp (Process Performance)
         * Uses overall standard deviation instead of within-subgroup
         */
        calculatePp: function(USL, LSL, overallSigma) {
            return (USL - LSL) / (6 * overallSigma);
        },
        /**
         * Calculate Ppk (Process Performance Index)
         */
        calculatePpk: function(USL, LSL, mean, overallSigma) {
            const Ppu = (USL - mean) / (3 * overallSigma);
            const Ppl = (mean - LSL) / (3 * overallSigma);
            return Math.min(Ppu, Ppl);
        },
        /**
         * Full capability analysis
         */
        analyze: function(data, USL, LSL, options = {}) {
            const {
                targetCpk = 1.33,
                subgroupSize = 5
            } = options;

            const stats = this.calculateStatistics(data);
            if (!stats) return null;

            // Calculate within-subgroup sigma (simplified - uses overall)
            // In practice, use R-bar/d2 or S-bar/c4
            const withinSigma = stats.stdDev;
            const overallSigma = stats.stdDev;

            const Cp = this.calculateCp(USL, LSL, withinSigma);
            const Cpk = this.calculateCpk(USL, LSL, stats.mean, withinSigma);
            const Pp = this.calculatePp(USL, LSL, overallSigma);
            const Ppk = this.calculatePpk(USL, LSL, stats.mean, overallSigma);

            // Estimate percent out of spec
            const zUpper = (USL - stats.mean) / stats.stdDev;
            const zLower = (stats.mean - LSL) / stats.stdDev;
            const ppmUpper = this.normalCDF(-zUpper) * 1e6;
            const ppmLower = this.normalCDF(-zLower) * 1e6;
            const ppmTotal = ppmUpper + ppmLower;

            // Capability interpretation
            let interpretation;
            if (Cpk >= 2.0) interpretation = 'Excellent (Six Sigma)';
            else if (Cpk >= 1.67) interpretation = 'Very Good';
            else if (Cpk >= 1.33) interpretation = 'Good (Industry Standard)';
            else if (Cpk >= 1.0) interpretation = 'Marginal';
            else interpretation = 'Poor (Needs Improvement)';

            return {
                statistics: stats,
                specifications: { USL, LSL, target: (USL + LSL) / 2 },
                capability: {
                    Cp,
                    Cpk,
                    Pp,
                    Ppk,
                    Cpu: (USL - stats.mean) / (3 * withinSigma),
                    Cpl: (stats.mean - LSL) / (3 * withinSigma)
                },
                defects: {
                    ppmUpper,
                    ppmLower,
                    ppmTotal,
                    percentDefective: ppmTotal / 10000
                },
                assessment: {
                    interpretation,
                    meetsTarget: Cpk >= targetCpk,
                    targetCpk
                }
            };
        },
        /**
         * Standard normal CDF approximation
         */
        normalCDF: function(z) {
            const a1 = 0.254829592;
            const a2 = -0.284496736;
            const a3 = 1.421413741;
            const a4 = -1.453152027;
            const a5 = 1.061405429;
            const p = 0.3275911;

            const sign = z < 0 ? -1 : 1;
            z = Math.abs(z) / Math.sqrt(2);

            const t = 1.0 / (1.0 + p * z);
            const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

            return 0.5 * (1.0 + sign * y);
        },
        // Manufacturing Applications

        /**
         * Analyze dimensional capability for a feature
         */
        analyzeFeature: function(measurements, nominalDimension, tolerance) {
            const USL = nominalDimension + tolerance;
            const LSL = nominalDimension - tolerance;

            const result = this.analyze(measurements, USL, LSL);
            if (!result) return null;

            return {
                ...result,
                feature: {
                    nominal: nominalDimension,
                    tolerance,
                    USL,
                    LSL
                }
            };
        },
        /**
         * Real-time capability tracking during production
         */
        createTracker: function(USL, LSL, windowSize = 30) {
            return {
                USL,
                LSL,
                windowSize,
                data: [],
                history: [],

                addMeasurement: (value) => {
                    this.data.push(value);
                    if (this.data.length > windowSize) {
                        this.data.shift();
                    }
                    if (this.data.length >= 5) {
                        const result = PRISM_CROSS_DOMAIN.processCapability.analyze(
                            this.data, USL, LSL
                        );
                        this.history.push({
                            timestamp: Date.now(),
                            Cpk: result.capability.Cpk,
                            mean: result.statistics.mean
                        });
                        return result;
                    }
                    return null;
                },
                getHistory: () => this.history,

                isCapable: (threshold = 1.33) => {
                    if (this.history.length === 0) return null;
                    return this.history[this.history.length - 1].Cpk >= threshold;
                }
            };
        },
        /**
         * Suggest process adjustments based on capability
         */
        suggestAdjustments: function(analysis) {
            const suggestions = [];

            if (!analysis) return suggestions;

            const { capability, statistics, specifications } = analysis;
            const target = (specifications.USL + specifications.LSL) / 2;

            // Check centering
            const offset = statistics.mean - target;
            if (Math.abs(offset) > (specifications.USL - specifications.LSL) * 0.1) {
                suggestions.push({
                    type: 'CENTERING',
                    severity: 'HIGH',
                    message: `Process mean is offset by ${offset.toFixed(4)} from target`,
                    action: `Adjust process by ${(-offset).toFixed(4)} to center on target`
                });
            }
            // Check variation
            if (capability.Cp < 1.33 && capability.Cpk < 1.33) {
                suggestions.push({
                    type: 'VARIATION',
                    severity: 'HIGH',
                    message: `Process variation too high (Cp = ${capability.Cp.toFixed(2)})`,
                    action: 'Reduce process variation through tighter controls'
                });
            }
            // Check capability vs performance
            if (capability.Cp > 1.33 && capability.Cpk < 1.33) {
                suggestions.push({
                    type: 'CENTERING',
                    severity: 'MEDIUM',
                    message: 'Process is capable but not centered',
                    action: 'Recenter process to improve Cpk'
                });
            }
            return suggestions;
        },
        prismApplication: "QualityEngine - SPC integration, real-time capability tracking"
    }
}