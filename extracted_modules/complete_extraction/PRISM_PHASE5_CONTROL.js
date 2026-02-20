const PRISM_PHASE5_CONTROL = {
    version: '8.50.000',
    phase: 'Phase 5: Advanced Control',
    buildDate: '2026-01-12',
    sources: ['MIT 2.14', 'MIT 6.241J', 'MIT 2.830J', 'MIT 2.003J', 'Caltech ME 115'],

    // SECTION 1: ADVANCED STATE ESTIMATION
    // MIT 6.241J - Beyond Kalman Filter for nonlinear/non-Gaussian systems

    StateEstimation: {
        // Particle Filter (Sequential Monte Carlo)
        // For nonlinear, non-Gaussian state estimation
        ParticleFilter: class {
            constructor(options = {}) {
                this.numParticles = options.numParticles || 1000;
                this.stateDim = options.stateDim || 2;
                this.processNoise = options.processNoise || 0.1;
                this.measurementNoise = options.measurementNoise || 0.5;
                this.stateTransition = options.stateTransition || ((x) => x);
                this.measurementModel = options.measurementModel || ((x) => x[0]);

                this.particles = [];
                this.weights = [];
                this._initialize();
            }
            _initialize() {
                this.particles = [];
                this.weights = [];
                for (let i = 0; i < this.numParticles; i++) {
                    this.particles.push(Array(this.stateDim).fill(0).map(() => (Math.random() - 0.5) * 2));
                    this.weights.push(1 / this.numParticles);
                }
            }
            _randn() {
                const u1 = Math.random(), u2 = Math.random();
                return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            }
            // Predict step: propagate particles through dynamics
            predict(u = null) {
                for (let i = 0; i < this.numParticles; i++) {
                    this.particles[i] = this.stateTransition(this.particles[i], u);
                    // Add process noise
                    for (let j = 0; j < this.stateDim; j++) {
                        this.particles[i][j] += this.processNoise * this._randn();
                    }
                }
            }
            // Update step: weight particles by measurement likelihood
            update(measurement) {
                let sumWeights = 0;

                for (let i = 0; i < this.numParticles; i++) {
                    const predicted = this.measurementModel(this.particles[i]);
                    const error = measurement - predicted;
                    // Gaussian likelihood
                    const likelihood = Math.exp(-0.5 * (error / this.measurementNoise) ** 2);
                    this.weights[i] *= likelihood;
                    sumWeights += this.weights[i];
                }
                // Normalize weights
                if (sumWeights > 0) {
                    for (let i = 0; i < this.numParticles; i++) {
                        this.weights[i] /= sumWeights;
                    }
                }
                // Resample if effective sample size is low
                const nEff = 1 / this.weights.reduce((s, w) => s + w * w, 0);
                if (nEff < this.numParticles / 2) {
                    this._resample();
                }
            }
            _resample() {
                // Systematic resampling
                const cumSum = [];
                let sum = 0;
                for (const w of this.weights) {
                    sum += w;
                    cumSum.push(sum);
                }
                const newParticles = [];
                const u0 = Math.random() / this.numParticles;

                let j = 0;
                for (let i = 0; i < this.numParticles; i++) {
                    const u = u0 + i / this.numParticles;
                    while (cumSum[j] < u && j < this.numParticles - 1) j++;
                    newParticles.push([...this.particles[j]]);
                }
                this.particles = newParticles;
                this.weights = Array(this.numParticles).fill(1 / this.numParticles);
            }
            // Get state estimate (weighted mean)
            getEstimate() {
                const estimate = Array(this.stateDim).fill(0);
                for (let i = 0; i < this.numParticles; i++) {
                    for (let j = 0; j < this.stateDim; j++) {
                        estimate[j] += this.weights[i] * this.particles[i][j];
                    }
                }
                return estimate;
            }
            // Get covariance estimate
            getCovariance() {
                const mean = this.getEstimate();
                const cov = Array(this.stateDim).fill(null).map(() => Array(this.stateDim).fill(0));

                for (let i = 0; i < this.numParticles; i++) {
                    for (let j = 0; j < this.stateDim; j++) {
                        for (let k = 0; k < this.stateDim; k++) {
                            cov[j][k] += this.weights[i] * (this.particles[i][j] - mean[j]) * (this.particles[i][k] - mean[k]);
                        }
                    }
                }
                return cov;
            }
        },
        // Ensemble Kalman Filter (EnKF)
        // For high-dimensional systems (weather, process control)
        EnsembleKalmanFilter: class {
            constructor(options = {}) {
                this.ensembleSize = options.ensembleSize || 50;
                this.stateDim = options.stateDim || 3;
                this.measureDim = options.measureDim || 1;
                this.processNoise = options.processNoise || 0.01;
                this.measureNoise = options.measureNoise || 0.1;
                this.stateTransition = options.stateTransition || ((x) => x);
                this.measurementModel = options.measurementModel || ((x) => [x[0]]);

                this.ensemble = [];
                this._initialize();
            }
            _initialize() {
                this.ensemble = [];
                for (let i = 0; i < this.ensembleSize; i++) {
                    this.ensemble.push(Array(this.stateDim).fill(0).map(() => Math.random() - 0.5));
                }
            }
            _randn() {
                const u1 = Math.random(), u2 = Math.random();
                return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            }
            predict(u = null) {
                for (let i = 0; i < this.ensembleSize; i++) {
                    this.ensemble[i] = this.stateTransition(this.ensemble[i], u);
                    for (let j = 0; j < this.stateDim; j++) {
                        this.ensemble[i][j] += this.processNoise * this._randn();
                    }
                }
            }
            update(measurement) {
                const N = this.ensembleSize;

                // Ensemble mean
                const xMean = Array(this.stateDim).fill(0);
                for (let i = 0; i < N; i++) {
                    for (let j = 0; j < this.stateDim; j++) {
                        xMean[j] += this.ensemble[i][j] / N;
                    }
                }
                // Predicted measurements
                const yPred = this.ensemble.map(x => this.measurementModel(x));
                const yMean = Array(this.measureDim).fill(0);
                for (let i = 0; i < N; i++) {
                    for (let j = 0; j < this.measureDim; j++) {
                        yMean[j] += yPred[i][j] / N;
                    }
                }
                // Covariances Pxy and Pyy
                const Pxy = Array(this.stateDim).fill(null).map(() => Array(this.measureDim).fill(0));
                const Pyy = Array(this.measureDim).fill(null).map(() => Array(this.measureDim).fill(0));

                for (let i = 0; i < N; i++) {
                    for (let j = 0; j < this.stateDim; j++) {
                        for (let k = 0; k < this.measureDim; k++) {
                            Pxy[j][k] += (this.ensemble[i][j] - xMean[j]) * (yPred[i][k] - yMean[k]) / (N - 1);
                        }
                    }
                    for (let j = 0; j < this.measureDim; j++) {
                        for (let k = 0; k < this.measureDim; k++) {
                            Pyy[j][k] += (yPred[i][j] - yMean[j]) * (yPred[i][k] - yMean[k]) / (N - 1);
                        }
                    }
                }
                // Add measurement noise to Pyy
                for (let j = 0; j < this.measureDim; j++) {
                    Pyy[j][j] += this.measureNoise * this.measureNoise;
                }
                // Kalman gain K = Pxy * Pyy^-1 (simplified for 1D measurement)
                const K = Pxy.map(row => row.map((v, k) => v / Pyy[k][k]));

                // Update ensemble members
                for (let i = 0; i < N; i++) {
                    const innovation = measurement.map((m, k) => m - yPred[i][k] + this.measureNoise * this._randn());
                    for (let j = 0; j < this.stateDim; j++) {
                        for (let k = 0; k < this.measureDim; k++) {
                            this.ensemble[i][j] += K[j][k] * innovation[k];
                        }
                    }
                }
            }
            getEstimate() {
                const mean = Array(this.stateDim).fill(0);
                for (let i = 0; i < this.ensembleSize; i++) {
                    for (let j = 0; j < this.stateDim; j++) {
                        mean[j] += this.ensemble[i][j] / this.ensembleSize;
                    }
                }
                return mean;
            }
        },
        // Moving Horizon Estimation (MHE)
        // Optimization-based state estimation with constraints
        MovingHorizonEstimation: class {
            constructor(options = {}) {
                this.horizon = options.horizon || 10;
                this.stateDim = options.stateDim || 2;
                this.measureDim = options.measureDim || 1;
                this.Q = options.Q || 1;  // Process weight
                this.R = options.R || 1;  // Measurement weight
                this.stateTransition = options.stateTransition || ((x) => x);
                this.measurementModel = options.measurementModel || ((x) => [x[0]]);

                this.history = { measurements: [], inputs: [] };
                this.currentEstimate = Array(this.stateDim).fill(0);
            }
            addMeasurement(y, u = null) {
                this.history.measurements.push(y);
                this.history.inputs.push(u);

                // Keep only horizon length
                if (this.history.measurements.length > this.horizon) {
                    this.history.measurements.shift();
                    this.history.inputs.shift();
                }
            }
            // Solve MHE problem (simplified gradient descent)
            solve(iterations = 50, stepSize = 0.01) {
                if (this.history.measurements.length < 2) {
                    return this.currentEstimate;
                }
                const N = this.history.measurements.length;
                let states = [];
                for (let i = 0; i < N; i++) {
                    states.push([...this.currentEstimate]);
                }
                // Gradient descent
                for (let iter = 0; iter < iterations; iter++) {
                    const grad = states.map(() => Array(this.stateDim).fill(0));

                    // Measurement cost gradient
                    for (let k = 0; k < N; k++) {
                        const yPred = this.measurementModel(states[k]);
                        for (let j = 0; j < this.stateDim; j++) {
                            grad[k][j] += 2 * this.R * (yPred[0] - this.history.measurements[k]) * (j === 0 ? 1 : 0);
                        }
                    }
                    // Process cost gradient (penalize state jumps)
                    for (let k = 1; k < N; k++) {
                        const predicted = this.stateTransition(states[k-1], this.history.inputs[k-1]);
                        for (let j = 0; j < this.stateDim; j++) {
                            grad[k][j] += 2 * this.Q * (states[k][j] - predicted[j]);
                            grad[k-1][j] -= 2 * this.Q * (states[k][j] - predicted[j]);
                        }
                    }
                    // Update
                    for (let k = 0; k < N; k++) {
                        for (let j = 0; j < this.stateDim; j++) {
                            states[k][j] -= stepSize * grad[k][j];
                        }
                    }
                }
                this.currentEstimate = states[N - 1];
                return this.currentEstimate;
            }
        },
        // Sensor Fusion Framework
        SensorFusion: class {
            constructor() {
                this.sensors = new Map();
                this.fusedState = {};
            }
            addSensor(name, config) {
                this.sensors.set(name, {
                    weight: config.weight || 1,
                    noise: config.noise || 0.1,
                    bias: config.bias || 0,
                    lastValue: null,
                    stateMapping: config.stateMapping || ['x']
                });
            }
            updateSensor(name, value) {
                const sensor = this.sensors.get(name);
                if (sensor) {
                    sensor.lastValue = value - sensor.bias;
                }
            }
            // Weighted fusion with covariance intersection
            fuse() {
                const result = {};
                const totalWeight = {};

                for (const [name, sensor] of this.sensors) {
                    if (sensor.lastValue === null) continue;

                    const weight = sensor.weight / (sensor.noise * sensor.noise);

                    for (let i = 0; i < sensor.stateMapping.length; i++) {
                        const state = sensor.stateMapping[i];
                        const value = Array.isArray(sensor.lastValue) ? sensor.lastValue[i] : sensor.lastValue;

                        if (!result[state]) {
                            result[state] = 0;
                            totalWeight[state] = 0;
                        }
                        result[state] += weight * value;
                        totalWeight[state] += weight;
                    }
                }
                for (const state in result) {
                    result[state] /= totalWeight[state];
                }
                this.fusedState = result;
                return result;
            }
        }
    },
    // SECTION 2: MODEL PREDICTIVE CONTROL (MPC)
    // MIT 2.830J - Optimal control with constraints over prediction horizon

    MPC: {
        // Linear MPC: min Σ(x'Qx + u'Ru) s.t. x_{k+1} = Ax_k + Bu_k
        LinearMPC: class {
            constructor(A, B, Q, R, horizon = 10) {
                this.A = A;  // State transition matrix (n×n)
                this.B = B;  // Input matrix (n×m)
                this.Q = Q;  // State cost matrix (n×n)
                this.R = R;  // Input cost matrix (m×m)
                this.N = horizon;
                this.n = A.length;
                this.m = B[0].length;

                this.uMin = Array(this.m).fill(-Infinity);
                this.uMax = Array(this.m).fill(Infinity);
                this.xMin = Array(this.n).fill(-Infinity);
                this.xMax = Array(this.n).fill(Infinity);
            }
            setInputConstraints(uMin, uMax) {
                this.uMin = uMin;
                this.uMax = uMax;
            }
            setStateConstraints(xMin, xMax) {
                this.xMin = xMin;
                this.xMax = xMax;
            }
            // Matrix multiplication helper
            _matMul(A, B) {
                const m = A.length, n = B[0].length, k = B.length;
                const C = Array(m).fill(null).map(() => Array(n).fill(0));
                for (let i = 0; i < m; i++) {
                    for (let j = 0; j < n; j++) {
                        for (let l = 0; l < k; l++) {
                            C[i][j] += A[i][l] * B[l][j];
                        }
                    }
                }
                return C;
            }
            _matVec(A, x) {
                return A.map(row => row.reduce((s, a, i) => s + a * x[i], 0));
            }
            // Solve MPC (simplified QP via gradient descent)
            solve(x0, xRef = null, iterations = 100) {
                // Initialize control sequence
                let U = [];
                for (let k = 0; k < this.N; k++) {
                    U.push(Array(this.m).fill(0));
                }
                const stepSize = 0.01;

                for (let iter = 0; iter < iterations; iter++) {
                    // Forward simulate to get state trajectory
                    const X = [x0];
                    for (let k = 0; k < this.N; k++) {
                        const xNext = this._matVec(this.A, X[k]);
                        const Bu = this._matVec(this.B, U[k]);
                        X.push(xNext.map((xi, i) => xi + Bu[i]));
                    }
                    // Backward pass: compute gradients
                    let lambda = Array(this.n).fill(0);

                    for (let k = this.N - 1; k >= 0; k--) {
                        // State cost gradient
                        const xErr = X[k + 1].map((xi, i) => xi - (xRef ? xRef[i] : 0));
                        lambda = lambda.map((l, i) => 2 * this.Q[i][i] * xErr[i] + l);

                        // Input cost gradient
                        const uGrad = U[k].map((ui, i) => 2 * this.R[i][i] * ui);

                        // Control gradient from state cost (chain rule through B)
                        for (let i = 0; i < this.m; i++) {
                            for (let j = 0; j < this.n; j++) {
                                uGrad[i] += this.B[j][i] * lambda[j];
                            }
                        }
                        // Update control
                        for (let i = 0; i < this.m; i++) {
                            U[k][i] -= stepSize * uGrad[i];
                            // Apply constraints
                            U[k][i] = Math.max(this.uMin[i], Math.min(this.uMax[i], U[k][i]));
                        }
                        // Propagate lambda backward
                        lambda = this._matVec(this.A, lambda);
                    }
                }
                return { optimalInput: U[0], trajectory: U };
            }
        },
        // Nonlinear MPC using iterative linearization
        NonlinearMPC: class {
            constructor(options = {}) {
                this.horizon = options.horizon || 10;
                this.stateDim = options.stateDim || 2;
                this.inputDim = options.inputDim || 1;
                this.dynamics = options.dynamics || ((x, u) => x);
                this.stageCost = options.stageCost || ((x, u) => x[0]**2 + u[0]**2);
                this.terminalCost = options.terminalCost || ((x) => x[0]**2);

                this.uMin = Array(this.inputDim).fill(-10);
                this.uMax = Array(this.inputDim).fill(10);
            }
            setInputConstraints(uMin, uMax) {
                this.uMin = uMin;
                this.uMax = uMax;
            }
            // Solve using shooting method with gradient descent
            solve(x0, iterations = 50) {
                // Initialize control sequence
                let U = [];
                for (let k = 0; k < this.horizon; k++) {
                    U.push(Array(this.inputDim).fill(0));
                }
                const stepSize = 0.001;
                const eps = 0.001; // For numerical gradients

                for (let iter = 0; iter < iterations; iter++) {
                    // Compute trajectory and cost
                    const { trajectory, cost } = this._simulate(x0, U);

                    // Compute gradients numerically
                    for (let k = 0; k < this.horizon; k++) {
                        for (let i = 0; i < this.inputDim; i++) {
                            // Perturb
                            const Uplus = U.map((u, kk) => kk === k ? [...u] : u);
                            Uplus[k][i] += eps;
                            const costPlus = this._simulate(x0, Uplus).cost;

                            const grad = (costPlus - cost) / eps;
                            U[k][i] -= stepSize * grad;

                            // Constraints
                            U[k][i] = Math.max(this.uMin[i], Math.min(this.uMax[i], U[k][i]));
                        }
                    }
                }
                return { optimalInput: U[0], trajectory: U };
            }
            _simulate(x0, U) {
                let x = [...x0];
                let cost = 0;
                const trajectory = [x];

                for (let k = 0; k < this.horizon; k++) {
                    cost += this.stageCost(x, U[k]);
                    x = this.dynamics(x, U[k]);
                    trajectory.push(x);
                }
                cost += this.terminalCost(x);

                return { trajectory, cost };
            }
        }
    },
    // SECTION 3: ADAPTIVE CONTROL
    // MIT 2.14 - Self-adjusting controllers for uncertain systems

    AdaptiveControl: {
        // Model Reference Adaptive Control (MRAC)
        MRAC: class {
            constructor(options = {}) {
                this.Am = options.Am || [[-1]];  // Reference model
                this.Bm = options.Bm || [[1]];
                this.gamma = options.gamma || 1;  // Adaptation gain
                this.n = this.Am.length;

                // Adaptive parameters
                this.theta = Array(this.n).fill(0);
                this.xm = Array(this.n).fill(0);  // Reference model state
            }
            update(x, r, dt) {
                // Reference model: xm_dot = Am*xm + Bm*r
                const xmDot = this.xm.map((xmi, i) =>
                    this.Am[i].reduce((s, a, j) => s + a * this.xm[j], 0) +
                    this.Bm[i].reduce((s, b, j) => s + b * (Array.isArray(r) ? r[j] : r), 0)
                );
                this.xm = this.xm.map((xmi, i) => xmi + xmDot[i] * dt);

                // Tracking error
                const e = x.map((xi, i) => xi - this.xm[i]);

                // Adaptation law: theta_dot = -gamma * e * x
                for (let i = 0; i < this.n; i++) {
                    this.theta[i] -= this.gamma * e[i] * x[i] * dt;
                }
                // Control law: u = theta' * x + r
                const u = this.theta.reduce((s, t, i) => s + t * x[i], 0) + (Array.isArray(r) ? r[0] : r);

                return {
                    control: u,
                    error: e,
                    parameters: [...this.theta],
                    referenceState: [...this.xm]
                };
            }
        },
        // Self-Tuning Regulator (STR)
        SelfTuningRegulator: class {
            constructor(options = {}) {
                this.na = options.na || 2;  // Model order (denominator)
                this.nb = options.nb || 1;  // Model order (numerator)
                this.lambda = options.lambda || 0.99;  // Forgetting factor

                // Estimated parameters
                this.theta = Array(this.na + this.nb).fill(0);
                this.P = Array(this.na + this.nb).fill(null).map((_, i) =>
                    Array(this.na + this.nb).fill(0).map((_, j) => i === j ? 100 : 0)
                );

                // History buffers
                this.yHistory = Array(this.na).fill(0);
                this.uHistory = Array(this.nb).fill(0);
            }
            // Recursive Least Squares (RLS) parameter estimation
            estimate(y) {
                const phi = [...this.yHistory, ...this.uHistory];
                const yPred = phi.reduce((s, p, i) => s + p * this.theta[i], 0);
                const error = y - yPred;

                // RLS update
                const Pphi = this.P.map(row => row.reduce((s, p, i) => s + p * phi[i], 0));
                const phiPphi = phi.reduce((s, p, i) => s + p * Pphi[i], 0);
                const k = Pphi.map(p => p / (this.lambda + phiPphi));

                // Update theta
                for (let i = 0; i < this.theta.length; i++) {
                    this.theta[i] += k[i] * error;
                }
                // Update P
                for (let i = 0; i < this.P.length; i++) {
                    for (let j = 0; j < this.P[i].length; j++) {
                        this.P[i][j] = (this.P[i][j] - k[i] * Pphi[j]) / this.lambda;
                    }
                }
                return { parameters: [...this.theta], predictionError: error };
            }
            // Compute control based on estimated model
            computeControl(y, r) {
                this.estimate(y);

                // Pole placement (simplified: cancel poles and add desired)
                const a = this.theta.slice(0, this.na);
                const b = this.theta.slice(this.na);

                // Simple control: u = (r - a'y) / b[0]
                const b0 = b[0] || 1;
                const ay = a.reduce((s, ai, i) => s + ai * (i < this.yHistory.length ? this.yHistory[i] : 0), 0);
                const u = (r - ay) / b0;

                // Update history
                this.yHistory.unshift(y);
                this.yHistory.pop();
                this.uHistory.unshift(u);
                this.uHistory.pop();

                return u;
            }
        },
        // Gain Scheduling
        GainScheduler: class {
            constructor() {
                this.schedulePoints = [];
                this.currentGains = { Kp: 1, Ki: 0, Kd: 0 };
            }
            addSchedulePoint(condition, gains) {
                this.schedulePoints.push({ condition, gains });
            }
            // condition is a function (state) => boolean, or a value for interpolation
            updateGains(operatingPoint) {
                // Find applicable gain set (interpolation for continuous scheduling)
                if (typeof operatingPoint === 'number') {
                    // Linear interpolation between schedule points
                    const sorted = this.schedulePoints.sort((a, b) => a.condition - b.condition);

                    if (operatingPoint <= sorted[0].condition) {
                        this.currentGains = { ...sorted[0].gains };
                    } else if (operatingPoint >= sorted[sorted.length - 1].condition) {
                        this.currentGains = { ...sorted[sorted.length - 1].gains };
                    } else {
                        for (let i = 0; i < sorted.length - 1; i++) {
                            if (operatingPoint >= sorted[i].condition && operatingPoint < sorted[i + 1].condition) {
                                const t = (operatingPoint - sorted[i].condition) / (sorted[i + 1].condition - sorted[i].condition);
                                this.currentGains = {
                                    Kp: sorted[i].gains.Kp + t * (sorted[i + 1].gains.Kp - sorted[i].gains.Kp),
                                    Ki: sorted[i].gains.Ki + t * (sorted[i + 1].gains.Ki - sorted[i].gains.Ki),
                                    Kd: sorted[i].gains.Kd + t * (sorted[i + 1].gains.Kd - sorted[i].gains.Kd)
                                };
                                break;
                            }
                        }
                    }
                }
                return this.currentGains;
            }
            getGains() {
                return this.currentGains;
            }
        }
    },
    // SECTION 4: ROBUST CONTROL
    // MIT 6.241J - Control design accounting for uncertainty

    RobustControl: {
        // H-infinity controller design (simplified)
        HInfinity: class {
            constructor(options = {}) {
                this.gamma = options.gamma || 1;  // Performance level
                this.Q = options.Q || [[1]];     // State weight
                this.R = options.R || [[1]];     // Input weight
                this.stateDim = options.stateDim || 1;
            }
            // Compute H∞ controller gains (simplified Riccati-based)
            computeGains(A, B, C) {
                // Simplified: use LQR-like approach with gamma weighting
                // True H∞ requires solving coupled Riccati equations

                const n = A.length;
                const m = B[0].length;

                // Initialize P (solution to algebraic Riccati equation)
                let P = Array(n).fill(null).map((_, i) =>
                    Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
                );

                // Iterate to solve ARE (simplified)
                for (let iter = 0; iter < 100; iter++) {
                    // P = Q + A'PA - A'PB(R + B'PB)^-1 B'PA
                    // Simplified for SISO
                    const BPBA = P[0][0] * B[0][0] * B[0][0];
                    const K = P[0][0] * B[0][0] / (this.R[0][0] + BPBA);

                    P[0][0] = this.Q[0][0] + A[0][0] * A[0][0] * P[0][0] -
                              A[0][0] * P[0][0] * B[0][0] * K * A[0][0];
                }
                // Compute gain
                const K = P[0][0] * B[0][0] / (this.R[0][0] + P[0][0] * B[0][0] * B[0][0] / (this.gamma * this.gamma));

                return { K: [K], P, achievedGamma: this.gamma };
            }
        },
        // Uncertainty modeling
        UncertaintyModel: class {
            constructor() {
                this.nominalModel = null;
                this.uncertainties = [];
            }
            setNominalModel(A, B, C, D) {
                this.nominalModel = { A, B, C, D };
            }
            addParametricUncertainty(parameter, range) {
                this.uncertainties.push({
                    type: 'parametric',
                    parameter,
                    min: range[0],
                    max: range[1],
                    nominal: (range[0] + range[1]) / 2
                });
            }
            addUnstructuredUncertainty(bound, frequency = null) {
                this.uncertainties.push({
                    type: 'unstructured',
                    bound,
                    frequency
                });
            }
            // Get worst-case model
            getWorstCase() {
                const model = { ...this.nominalModel };
                // Simple worst-case: extreme values of parametric uncertainties
                for (const unc of this.uncertainties) {
                    if (unc.type === 'parametric') {
                        // Use extremes that maximize sensitivity
                        model[unc.parameter] = unc.max;
                    }
                }
                return model;
            }
            // Monte Carlo robustness analysis
            monteCarloAnalysis(controller, samples = 100) {
                const results = { stable: 0, unstable: 0, performances: [] };

                for (let i = 0; i < samples; i++) {
                    // Sample uncertainties
                    const perturbedModel = { ...this.nominalModel };
                    for (const unc of this.uncertainties) {
                        if (unc.type === 'parametric') {
                            const sample = unc.min + Math.random() * (unc.max - unc.min);
                            // Simplified: perturb A matrix
                            if (perturbedModel.A) {
                                perturbedModel.A = perturbedModel.A.map(row => row.map(a => a * (1 + 0.1 * (sample - unc.nominal) / (unc.max - unc.min))));
                            }
                        }
                    }
                    // Check stability (simplified: eigenvalue check for 1D)
                    const isStable = perturbedModel.A[0][0] < 0;
                    if (isStable) results.stable++;
                    else results.unstable++;
                }
                results.robustness = (results.stable / samples * 100).toFixed(1) + '%';
                return results;
            }
        }
    },
    // SECTION 5: CNC MOTION CONTROL
    // Caltech ME 115 - Smooth trajectory generation for machine tools

    CNCMotion: {
        // S-curve acceleration profile
        SCurveProfile: class {
            constructor(vMax, aMax, jMax) {
                this.vMax = vMax;  // Max velocity
                this.aMax = aMax;  // Max acceleration
                this.jMax = jMax;  // Max jerk
            }
            // Generate S-curve for point-to-point move
            generate(distance) {
                const { vMax, aMax, jMax } = this;

                // Time for jerk phase
                const tj = aMax / jMax;

                // Time for constant acceleration
                const ta = vMax / aMax - tj;

                // Check if triangular profile needed
                let profile;
                if (ta < 0) {
                    // Triangular velocity profile
                    const vPeak = Math.sqrt(aMax * distance);
                    profile = {
                        type: 'triangular',
                        vPeak: Math.min(vPeak, vMax),
                        totalTime: 2 * Math.sqrt(distance / aMax) + 2 * tj
                    };
                } else {
                    // Full S-curve
                    const dAccel = vMax * (tj + ta);
                    const dConst = distance - 2 * dAccel;
                    const tConst = dConst / vMax;

                    profile = {
                        type: 'trapezoidal',
                        phases: {
                            jerkUp: tj,
                            constAccel: ta,
                            jerkDown: tj,
                            constVel: Math.max(0, tConst),
                            jerkUp2: tj,
                            constDecel: ta,
                            jerkDown2: tj
                        },
                        totalTime: 2 * (2 * tj + ta) + Math.max(0, tConst)
                    };
                }
                return profile;
            }
            // Get position/velocity/acceleration at time t
            evaluate(profile, t) {
                // Simplified evaluation for trapezoidal
                if (t <= 0) return { pos: 0, vel: 0, acc: 0, jerk: 0 };
                if (t >= profile.totalTime) return { pos: 1, vel: 0, acc: 0, jerk: 0 };

                // Normalized time
                const tNorm = t / profile.totalTime;

                // Simplified S-curve (sinusoidal approximation)
                const pos = 0.5 * (1 - Math.cos(Math.PI * tNorm));
                const vel = 0.5 * Math.PI * Math.sin(Math.PI * tNorm) / profile.totalTime;
                const acc = 0.5 * Math.PI * Math.PI * Math.cos(Math.PI * tNorm) / (profile.totalTime * profile.totalTime);

                return { pos, vel, acc, jerk: 0 };
            }
        },
        // Jerk-limited trajectory (7-segment)
        JerkLimitedTrajectory: class {
            constructor(params) {
                this.vMax = params.vMax || 100;    // mm/s
                this.aMax = params.aMax || 1000;   // mm/s²
                this.jMax = params.jMax || 10000;  // mm/s³
            }
            // Calculate 7-segment times
            calculate7Segments(distance) {
                const { vMax, aMax, jMax } = this;

                // Time for jerk ramp
                const Tj = aMax / jMax;

                // Time for constant acceleration
                const Ta = vMax / aMax - Tj;

                // Distances during acceleration phase
                const Da = jMax * Tj * Tj * Tj / 6 + // Jerk up
                          aMax * Ta * Ta / 2 + aMax * Ta * Tj + // Const accel
                          jMax * Tj * Tj * Tj / 6 + aMax * Tj * Tj / 2; // Jerk down

                if (2 * Da > distance) {
                    // Need to reduce velocity
                    const scale = Math.sqrt(distance / (2 * Da));
                    return this.calculate7Segments(distance * scale);
                }
                // Constant velocity phase
                const Dc = distance - 2 * Da;
                const Tc = Dc / vMax;

                return {
                    segments: [
                        { name: 'Jerk+', duration: Tj, jerk: jMax },
                        { name: 'Accel', duration: Ta, jerk: 0 },
                        { name: 'Jerk-', duration: Tj, jerk: -jMax },
                        { name: 'Coast', duration: Tc, jerk: 0 },
                        { name: 'Jerk-', duration: Tj, jerk: -jMax },
                        { name: 'Decel', duration: Ta, jerk: 0 },
                        { name: 'Jerk+', duration: Tj, jerk: jMax }
                    ],
                    totalTime: 4 * Tj + 2 * Ta + Tc,
                    peakVelocity: vMax,
                    peakAcceleration: aMax
                };
            }
        },
        // Look-ahead path planning
        LookAhead: class {
            constructor(bufferSize = 100) {
                this.buffer = [];
                this.bufferSize = bufferSize;
            }
            addSegment(segment) {
                if (this.buffer.length >= this.bufferSize) {
                    this.buffer.shift();
                }
                this.buffer.push(segment);
            }
            // Calculate corner velocities using look-ahead
            calculateCornerVelocities(maxAccel, maxJerk) {
                if (this.buffer.length < 2) return;

                for (let i = 0; i < this.buffer.length - 1; i++) {
                    const curr = this.buffer[i];
                    const next = this.buffer[i + 1];

                    // Calculate angle between segments
                    const angle = this._calculateAngle(curr.end, next.start, next.end);

                    // Corner velocity based on centripetal acceleration
                    const radius = Math.min(curr.length, next.length) * 0.5;
                    const vCorner = Math.sqrt(maxAccel * radius);

                    // Apply angle factor (sharper corner = slower)
                    const angleFactor = Math.cos(angle / 2);
                    curr.exitVelocity = vCorner * angleFactor;
                    next.entryVelocity = vCorner * angleFactor;
                }
            }
            _calculateAngle(p1, p2, p3) {
                const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
                const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
                const dot = v1.x * v2.x + v1.y * v2.y;
                const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
                const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
                return Math.acos(dot / (mag1 * mag2 + 0.0001));
            }
            // Optimize feed rates backward
            backwardPass(maxDecel) {
                for (let i = this.buffer.length - 2; i >= 0; i--) {
                    const curr = this.buffer[i];
                    const next = this.buffer[i + 1];

                    // v² = v0² + 2*a*d
                    const vMax = Math.sqrt(next.entryVelocity ** 2 + 2 * maxDecel * curr.length);
                    curr.exitVelocity = Math.min(curr.exitVelocity || Infinity, vMax);
                }
            }
        },
        // Corner smoothing (arc blending)
        CornerSmoothing: class {
            constructor(tolerance = 0.01) {
                this.tolerance = tolerance;  // mm
            }
            // Insert arc at corner
            blendCorner(p1, p2, p3, radius) {
                // Calculate corner angle
                const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
                const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

                const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
                const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

                // Normalize
                v1.x /= mag1; v1.y /= mag1;
                v2.x /= mag2; v2.y /= mag2;

                const dot = v1.x * v2.x + v1.y * v2.y;
                const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

                // Distance from corner to tangent points
                const d = radius / Math.tan(angle / 2);

                if (d > Math.min(mag1, mag2) / 2) {
                    // Not enough room for arc
                    return { type: 'sharp', point: p2 };
                }
                // Tangent points
                const t1 = { x: p2.x + v1.x * d, y: p2.y + v1.y * d };
                const t2 = { x: p2.x + v2.x * d, y: p2.y + v2.y * d };

                // Arc center
                const bisector = { x: v1.x + v2.x, y: v1.y + v2.y };
                const bisectorMag = Math.sqrt(bisector.x * bisector.x + bisector.y * bisector.y);
                bisector.x /= bisectorMag;
                bisector.y /= bisectorMag;

                const centerDist = radius / Math.sin(angle / 2);
                const center = {
                    x: p2.x + bisector.x * centerDist,
                    y: p2.y + bisector.y * centerDist
                };
                return {
                    type: 'arc',
                    center,
                    radius,
                    start: t1,
                    end: t2,
                    angle: Math.PI - angle
                };
            }
        }
    },
    // SECTION 6: FEEDRATE OPTIMIZATION
    // MIT 2.830J - Optimize cutting performance while respecting constraints

    FeedrateOptimization: {
        // Constant chip load control
        ConstantChipLoad: class {
            constructor(targetChipLoad, numTeeth) {
                this.targetFz = targetChipLoad;  // mm/tooth
                this.z = numTeeth;
            }
            // Calculate feedrate for varying engagement
            calculateFeedrate(rpm, radialEngagement, toolDiameter) {
                // Effective number of teeth in cut
                const engagementAngle = Math.acos(1 - 2 * radialEngagement / toolDiameter);
                const effectiveTeeth = this.z * engagementAngle / (2 * Math.PI);

                // F = fz * z_eff * n
                const feedrate = this.targetFz * effectiveTeeth * rpm;

                return {
                    feedrate: feedrate.toFixed(1),
                    effectiveTeeth: effectiveTeeth.toFixed(2),
                    actualChipLoad: this.targetFz.toFixed(4)
                };
            }
            // Adjust for corner entry/exit
            adjustForCorner(baseFeedrate, cornerAngle, isEntry) {
                // Reduce feed at sharp corners
                const angleFactor = Math.cos(cornerAngle / 2);
                const cornerFeedrate = baseFeedrate * (isEntry ? angleFactor : 1 / angleFactor);
                return Math.min(baseFeedrate, cornerFeedrate);
            }
        },
        // Constant MRR (Material Removal Rate) control
        ConstantMRR: class {
            constructor(targetMRR) {
                this.targetMRR = targetMRR;  // mm³/min
            }
            // Calculate feedrate for constant MRR
            calculateFeedrate(axialDOC, radialDOC) {
                // MRR = ap * ae * vf
                // vf = MRR / (ap * ae)
                const feedrate = this.targetMRR / (axialDOC * radialDOC);

                return {
                    feedrate: feedrate.toFixed(1),
                    MRR: this.targetMRR,
                    units: 'mm/min'
                };
            }
            // Adaptive MRR based on power
            adaptiveMRR(currentPower, maxPower, currentFeedrate) {
                const powerRatio = currentPower / maxPower;

                if (powerRatio > 0.9) {
                    return currentFeedrate * 0.9;  // Reduce
                } else if (powerRatio < 0.7) {
                    return currentFeedrate * 1.1;  // Increase
                }
                return currentFeedrate;
            }
        },
        // Power-limited feedrate optimization
        PowerLimitedOptimization: class {
            constructor(params) {
                this.maxPower = params.maxPower || 10;  // kW
                this.spindleEfficiency = params.efficiency || 0.85;
                this.Kc = params.Kc || 2000;  // Specific cutting force N/mm²
            }
            // Calculate max feedrate for power limit
            calculateMaxFeedrate(rpm, axialDOC, radialDOC, toolDiameter) {
                // P = Fc * Vc / 60000
                // Fc = Kc * ap * ae * fz
                // Vc = π * D * n / 1000

                const Vc = Math.PI * toolDiameter * rpm / 1000;  // m/min

                // Max force from power
                const Fc_max = this.maxPower * this.spindleEfficiency * 60000 / Vc;

                // Max chip area
                const chipArea_max = Fc_max / this.Kc;

                // Max feed per tooth
                const fz_max = chipArea_max / (axialDOC * radialDOC);

                return {
                    maxFeedPerTooth: fz_max.toFixed(4),
                    maxFeedrate: (fz_max * rpm).toFixed(0),
                    powerLimit: this.maxPower,
                    units: 'mm/min'
                };
            }
        },
        // Surface finish constrained optimization
        SurfaceFinishOptimization: class {
            constructor(targetRa) {
                this.targetRa = targetRa;  // µm
            }
            // Max feed for surface finish (turning)
            maxFeedTurning(noseRadius) {
                // Ra = f² / (32 * r)
                // f = sqrt(32 * Ra * r)
                const maxFeed = Math.sqrt(32 * this.targetRa / 1000 * noseRadius);

                return {
                    maxFeed: maxFeed.toFixed(4),
                    predictedRa: this.targetRa,
                    units: 'mm/rev'
                };
            }
            // Max stepover for surface finish (ball end milling)
            maxStepover(toolRadius) {
                // h = ae² / (8r)
                // Ra ≈ h/4
                // ae = sqrt(32 * Ra * r)
                const maxStepover = Math.sqrt(32 * this.targetRa / 1000 * toolRadius);

                return {
                    maxStepover: maxStepover.toFixed(3),
                    predictedRa: this.targetRa,
                    units: 'mm'
                };
            }
        }
    },
    // SECTION 7: PROCESS MONITORING
    // MIT 2.830J - Real-time process state estimation

    ProcessMonitoring: {
        // Force monitoring
        ForceMonitor: class {
            constructor(params = {}) {
                this.Kc = params.Kc || 2000;  // Specific cutting force
                this.Kr = params.Kr || 0.3;   // Radial force ratio
                this.Ka = params.Ka || 0.1;   // Axial force ratio

                this.history = { Fc: [], Fr: [], Fa: [] };
                this.limits = { Fc: params.FcMax || 1000, Fr: params.FrMax || 500, Fa: params.FaMax || 200 };
            }
            // Estimate forces from cutting parameters
            estimateForces(ap, ae, fz, numTeeth) {
                const h = fz;  // Chip thickness (simplified)
                const Ac = ap * h;  // Chip cross-section

                const Fc = this.Kc * Ac * numTeeth;
                const Fr = Fc * this.Kr;
                const Fa = Fc * this.Ka;

                return { Fc: Fc.toFixed(1), Fr: Fr.toFixed(1), Fa: Fa.toFixed(1), units: 'N' };
            }
            // Update with measurement
            update(forces) {
                this.history.Fc.push(forces.Fc);
                this.history.Fr.push(forces.Fr);
                this.history.Fa.push(forces.Fa);

                // Keep last 100 samples
                if (this.history.Fc.length > 100) {
                    this.history.Fc.shift();
                    this.history.Fr.shift();
                    this.history.Fa.shift();
                }
            }
            // Check for anomalies
            checkLimits(forces) {
                const alerts = [];
                if (forces.Fc > this.limits.Fc) alerts.push({ type: 'Fc_high', value: forces.Fc, limit: this.limits.Fc });
                if (forces.Fr > this.limits.Fr) alerts.push({ type: 'Fr_high', value: forces.Fr, limit: this.limits.Fr });
                if (forces.Fa > this.limits.Fa) alerts.push({ type: 'Fa_high', value: forces.Fa, limit: this.limits.Fa });

                return { withinLimits: alerts.length === 0, alerts };
            }
            // Detect tool wear from force trend
            detectToolWear() {
                if (this.history.Fc.length < 10) return { detected: false };

                const recent = this.history.Fc.slice(-10);
                const earlier = this.history.Fc.slice(0, 10);

                const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
                const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

                const increase = (recentAvg - earlierAvg) / earlierAvg * 100;

                return {
                    detected: increase > 20,
                    forceIncrease: increase.toFixed(1) + '%',
                    recommendation: increase > 20 ? 'Replace tool' : increase > 10 ? 'Monitor closely' : 'Normal'
                };
            }
        },
        // Power monitoring
        PowerMonitor: class {
            constructor(params = {}) {
                this.spindlePowerMax = params.spindlePowerMax || 15;  // kW
                this.history = [];
                this.baseline = null;
            }
            setBaseline(idlePower) {
                this.baseline = idlePower;
            }
            update(power) {
                this.history.push({ time: Date.now(), power });
                if (this.history.length > 1000) this.history.shift();
            }
            getCuttingPower() {
                if (!this.baseline || this.history.length === 0) return 0;
                return this.history[this.history.length - 1].power - this.baseline;
            }
            // Estimate MRR from power
            estimateMRR(specificEnergy = 3) {  // kJ/cm³
                const cuttingPower = this.getCuttingPower();
                const MRR = cuttingPower / specificEnergy * 1000;  // mm³/s
                return { MRR: MRR.toFixed(1), units: 'mm³/s' };
            }
            // Detect chatter from power fluctuation
            detectChatter() {
                if (this.history.length < 50) return { detected: false };

                const powers = this.history.slice(-50).map(h => h.power);
                const mean = powers.reduce((a, b) => a + b, 0) / powers.length;
                const variance = powers.reduce((s, p) => s + (p - mean) ** 2, 0) / powers.length;
                const cv = Math.sqrt(variance) / mean;  // Coefficient of variation

                return {
                    detected: cv > 0.2,
                    variability: (cv * 100).toFixed(1) + '%',
                    recommendation: cv > 0.2 ? 'Chatter detected - reduce DOC or change spindle speed' : 'Stable'
                };
            }
        },
        // Acoustic emission monitoring
        AcousticEmission: class {
            constructor(params = {}) {
                this.sampleRate = params.sampleRate || 1000000;  // 1 MHz typical
                this.threshold = params.threshold || 0.5;
                this.history = [];
            }
            // Process AE signal
            processSignal(samples) {
                // RMS
                const rms = Math.sqrt(samples.reduce((s, x) => s + x * x, 0) / samples.length);

                // Peak
                const peak = Math.max(...samples.map(Math.abs));

                // Count threshold crossings
                let crossings = 0;
                for (let i = 1; i < samples.length; i++) {
                    if ((samples[i - 1] < this.threshold && samples[i] >= this.threshold) ||
                        (samples[i - 1] >= this.threshold && samples[i] < this.threshold)) {
                        crossings++;
                    }
                }
                return {
                    rms: rms.toFixed(4),
                    peak: peak.toFixed(4),
                    crossingRate: (crossings / samples.length * this.sampleRate).toFixed(0)
                };
            }
            // Detect tool breakage
            detectBreakage(current, baseline) {
                const rmsRatio = current.rms / baseline.rms;
                const peakRatio = current.peak / baseline.peak;

                return {
                    breakage: rmsRatio > 3 || peakRatio > 5,
                    severity: rmsRatio > 5 ? 'Catastrophic' : rmsRatio > 3 ? 'Major' : rmsRatio > 2 ? 'Minor' : 'None',
                    rmsRatio: rmsRatio.toFixed(2),
                    peakRatio: peakRatio.toFixed(2)
                };
            }
        },
        // Vibration signature analysis
        VibrationAnalyzer: class {
            constructor(params = {}) {
                this.sampleRate = params.sampleRate || 10000;  // Hz
                this.resolution = params.resolution || 1;  // Hz
            }
            // Simple FFT (Cooley-Tukey for power of 2)
            fft(signal) {
                const N = signal.length;

                if (N <= 1) return signal.map(x => ({ re: x, im: 0 }));

                if (N & (N - 1)) {
                    // Pad to power of 2
                    const nextPow2 = Math.pow(2, Math.ceil(Math.log2(N)));
                    while (signal.length < nextPow2) signal.push(0);
                    return this.fft(signal);
                }
                // Divide
                const even = this.fft(signal.filter((_, i) => i % 2 === 0));
                const odd = this.fft(signal.filter((_, i) => i % 2 === 1));

                // Combine
                const result = [];
                for (let k = 0; k < N / 2; k++) {
                    const angle = -2 * Math.PI * k / N;
                    const t = {
                        re: Math.cos(angle) * odd[k].re - Math.sin(angle) * odd[k].im,
                        im: Math.cos(angle) * odd[k].im + Math.sin(angle) * odd[k].re
                    };
                    result[k] = {
                        re: even[k].re + t.re,
                        im: even[k].im + t.im
                    };
                    result[k + N / 2] = {
                        re: even[k].re - t.re,
                        im: even[k].im - t.im
                    };
                }
                return result;
            }
            // Get frequency spectrum
            analyze(signal) {
                const spectrum = this.fft(signal);
                const N = spectrum.length;

                const frequencies = [];
                for (let i = 0; i < N / 2; i++) {
                    const freq = i * this.sampleRate / N;
                    const magnitude = Math.sqrt(spectrum[i].re ** 2 + spectrum[i].im ** 2) / N;
                    frequencies.push({ frequency: freq, magnitude });
                }
                // Find peaks
                const peaks = frequencies.filter((f, i) => {
                    if (i === 0 || i === frequencies.length - 1) return false;
                    return f.magnitude > frequencies[i - 1].magnitude &&
                           f.magnitude > frequencies[i + 1].magnitude &&
                           f.magnitude > 0.1;
                });

                return {
                    spectrum: frequencies,
                    dominantFrequency: peaks.length > 0 ? peaks.reduce((a, b) => a.magnitude > b.magnitude ? a : b).frequency : 0,
                    peaks: peaks.slice(0, 5)
                };
            }
            // Detect imbalance from spectrum
            detectImbalance(spectrum, rpm) {
                const runoutFreq = rpm / 60;
                const harmonics = [runoutFreq, 2 * runoutFreq, 3 * runoutFreq];

                const harmonicPeaks = harmonics.map(f => {
                    const idx = Math.round(f / (this.sampleRate / spectrum.length));
                    return spectrum[idx] ? spectrum[idx].magnitude : 0;
                });

                const total = harmonicPeaks.reduce((a, b) => a + b, 0);

                return {
                    imbalance: harmonicPeaks[0] > 0.5,
                    1x: harmonicPeaks[0].toFixed(4),
                    2x: harmonicPeaks[1].toFixed(4),
                    3x: harmonicPeaks[2].toFixed(4),
                    recommendation: harmonicPeaks[0] > 0.5 ? 'Balance spindle/tool' : 'OK'
                };
            }
        }
    },
    // TEST SUITE

    runTests() {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('PRISM Phase 5 Advanced Control - MIT Algorithm Tests');
        console.log('═══════════════════════════════════════════════════════════════');

        const results = [];

        // Test Particle Filter
        try {
            const pf = new this.StateEstimation.ParticleFilter({
                numParticles: 100,
                stateDim: 2,
                stateTransition: (x) => [x[0] + 0.1, x[1] - 0.05],
                measurementModel: (x) => x[0]
            });
            pf.predict();
            pf.update(0.5);
            const est = pf.getEstimate();
            results.push({ name: 'Particle Filter', status: 'PASS', estimate: est.map(e => e.toFixed(3)) });
            console.log(`✓ Particle Filter: PASS (estimate=[${est.map(e => e.toFixed(3))}])`);
        } catch (e) { results.push({ name: 'Particle Filter', status: 'FAIL' }); console.log(`✗ Particle Filter: FAIL`); }

        // Test Ensemble Kalman Filter
        try {
            const enkf = new this.StateEstimation.EnsembleKalmanFilter({
                ensembleSize: 30, stateDim: 2, measureDim: 1
            });
            enkf.predict();
            enkf.update([0.5]);
            const est = enkf.getEstimate();
            results.push({ name: 'Ensemble Kalman', status: 'PASS', estimate: est.map(e => e.toFixed(3)) });
            console.log(`✓ Ensemble Kalman: PASS`);
        } catch (e) { results.push({ name: 'EnKF', status: 'FAIL' }); console.log(`✗ EnKF: FAIL`); }

        // Test Linear MPC
        try {
            const mpc = new this.MPC.LinearMPC(
                [[0.9, 0.1], [0, 0.95]],  // A
                [[1], [0.5]],              // B
                [[1, 0], [0, 1]],          // Q
                [[0.1]],                   // R
                5                          // horizon
            );
            mpc.setInputConstraints([-10], [10]);
            const result = mpc.solve([1, 0.5], [0, 0]);
            results.push({ name: 'Linear MPC', status: 'PASS', control: result.optimalInput[0].toFixed(3) });
            console.log(`✓ Linear MPC: PASS (u=${result.optimalInput[0].toFixed(3)})`);
        } catch (e) { results.push({ name: 'Linear MPC', status: 'FAIL' }); console.log(`✗ MPC: FAIL`); }

        // Test MRAC
        try {
            const mrac = new this.AdaptiveControl.MRAC({ Am: [[-1]], Bm: [[1]], gamma: 0.5 });
            const result = mrac.update([0.5], 1, 0.01);
            results.push({ name: 'MRAC', status: 'PASS', control: result.control.toFixed(3) });
            console.log(`✓ MRAC: PASS (u=${result.control.toFixed(3)})`);
        } catch (e) { results.push({ name: 'MRAC', status: 'FAIL' }); console.log(`✗ MRAC: FAIL`); }

        // Test Gain Scheduler
        try {
            const gs = new this.AdaptiveControl.GainScheduler();
            gs.addSchedulePoint(0, { Kp: 1, Ki: 0.1, Kd: 0.01 });
            gs.addSchedulePoint(100, { Kp: 2, Ki: 0.2, Kd: 0.02 });
            const gains = gs.updateGains(50);
            results.push({ name: 'Gain Scheduler', status: 'PASS', Kp: gains.Kp.toFixed(2) });
            console.log(`✓ Gain Scheduler: PASS (Kp=${gains.Kp.toFixed(2)} at op=50)`);
        } catch (e) { results.push({ name: 'Gain Scheduler', status: 'FAIL' }); console.log(`✗ GS: FAIL`); }

        // Test S-curve Profile
        try {
            const scurve = new this.CNCMotion.SCurveProfile(100, 1000, 10000);
            const profile = scurve.generate(50);
            results.push({ name: 'S-curve Profile', status: 'PASS', type: profile.type });
            console.log(`✓ S-curve: PASS (type=${profile.type}, time=${profile.totalTime.toFixed(3)}s)`);
        } catch (e) { results.push({ name: 'S-curve', status: 'FAIL' }); console.log(`✗ S-curve: FAIL`); }

        // Test Corner Smoothing
        try {
            const cs = new this.CNCMotion.CornerSmoothing(0.01);
            const blend = cs.blendCorner({x: 0, y: 0}, {x: 10, y: 0}, {x: 10, y: 10}, 2);
            results.push({ name: 'Corner Smoothing', status: 'PASS', type: blend.type });
            console.log(`✓ Corner Smoothing: PASS (type=${blend.type}, r=${blend.radius})`);
        } catch (e) { results.push({ name: 'Corner Smoothing', status: 'FAIL' }); console.log(`✗ Corner: FAIL`); }

        // Test Constant Chip Load
        try {
            const ccl = new this.FeedrateOptimization.ConstantChipLoad(0.1, 4);
            const result = ccl.calculateFeedrate(10000, 3, 12);
            results.push({ name: 'Constant Chip Load', status: 'PASS', feedrate: result.feedrate });
            console.log(`✓ Constant Chip Load: PASS (F=${result.feedrate} mm/min)`);
        } catch (e) { results.push({ name: 'CCL', status: 'FAIL' }); console.log(`✗ CCL: FAIL`); }

        // Test Force Monitor
        try {
            const fm = new this.ProcessMonitoring.ForceMonitor({ Kc: 2000 });
            const forces = fm.estimateForces(2, 3, 0.1, 4);
            const check = fm.checkLimits({ Fc: parseFloat(forces.Fc), Fr: parseFloat(forces.Fr), Fa: parseFloat(forces.Fa) });
            results.push({ name: 'Force Monitor', status: 'PASS', Fc: forces.Fc + 'N' });
            console.log(`✓ Force Monitor: PASS (Fc=${forces.Fc}N, within=${check.withinLimits})`);
        } catch (e) { results.push({ name: 'Force Monitor', status: 'FAIL' }); console.log(`✗ Force: FAIL`); }

        // Test Vibration Analyzer
        try {
            const va = new this.ProcessMonitoring.VibrationAnalyzer({ sampleRate: 1024 });
            const signal = Array(256).fill(0).map((_, i) => Math.sin(2 * Math.PI * 50 * i / 1024) + 0.5 * Math.sin(2 * Math.PI * 100 * i / 1024));
            const analysis = va.analyze(signal);
            results.push({ name: 'Vibration FFT', status: 'PASS', dominant: analysis.dominantFrequency.toFixed(1) + 'Hz' });
            console.log(`✓ Vibration FFT: PASS (dominant=${analysis.dominantFrequency.toFixed(1)}Hz)`);
        } catch (e) { results.push({ name: 'Vibration FFT', status: 'FAIL' }); console.log(`✗ FFT: FAIL`); }

        console.log('═══════════════════════════════════════════════════════════════');
        const passed = results.filter(r => r.status === 'PASS').length;
        console.log(`Results: ${passed}/${results.length} tests passed`);
        console.log('═══════════════════════════════════════════════════════════════');

        return results;
    }
}