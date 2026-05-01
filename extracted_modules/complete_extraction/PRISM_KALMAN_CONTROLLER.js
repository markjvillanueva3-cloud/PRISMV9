const PRISM_KALMAN_CONTROLLER = {

    version: '1.0.0',
    authority: 'PRISM_KALMAN_CONTROLLER',
    created: '2026-01-14',
    innovationId: 'KALMAN_FEEDRATE',

    // CONFIGURATION

    config: {
        // Default filter parameters
        DEFAULT_PROCESS_NOISE: 0.01,      // Process noise variance
        DEFAULT_MEASUREMENT_NOISE: 0.1,    // Measurement noise variance
        DEFAULT_INITIAL_COVARIANCE: 1.0,   // Initial state covariance

        // Feedrate control parameters
        MIN_FEEDRATE: 50,                  // mm/min
        MAX_FEEDRATE: 10000,               // mm/min
        MAX_FEEDRATE_CHANGE: 500,          // mm/min per cycle

        // Force limits
        MAX_CUTTING_FORCE: 5000,           // N
        FORCE_SAFETY_FACTOR: 0.8,

        // Update rate
        CONTROL_CYCLE_TIME: 0.01,          // seconds (100 Hz)

        // State dimensions for cutting process
        CUTTING_STATE_DIM: 4,              // [position, velocity, force, wear]
        CUTTING_MEASUREMENT_DIM: 2         // [position, force]
    },
    // SECTION 1: MATRIX OPERATIONS

    matrix: {
        /**
         * Create identity matrix
         */
        identity: function(n) {
            const I = [];
            for (let i = 0; i < n; i++) {
                I[i] = [];
                for (let j = 0; j < n; j++) {
                    I[i][j] = (i === j) ? 1 : 0;
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
        multiply: function(A, B) {
            const rowsA = A.length;
            const colsA = A[0].length;
            const colsB = B[0].length;

            const C = this.zeros(rowsA, colsB);

            for (let i = 0; i < rowsA; i++) {
                for (let j = 0; j < colsB; j++) {
                    for (let k = 0; k < colsA; k++) {
                        C[i][j] += A[i][k] * B[k][j];
                    }
                }
            }
            return C;
        },
        /**
         * Matrix-vector multiplication
         */
        multiplyVector: function(A, v) {
            const rows = A.length;
            const result = new Array(rows).fill(0);

            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < v.length; j++) {
                    result[i] += A[i][j] * v[j];
                }
            }
            return result;
        },
        /**
         * Matrix addition
         */
        add: function(A, B) {
            const rows = A.length;
            const cols = A[0].length;
            const C = this.zeros(rows, cols);

            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    C[i][j] = A[i][j] + B[i][j];
                }
            }
            return C;
        },
        /**
         * Matrix subtraction
         */
        subtract: function(A, B) {
            const rows = A.length;
            const cols = A[0].length;
            const C = this.zeros(rows, cols);

            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    C[i][j] = A[i][j] - B[i][j];
                }
            }
            return C;
        },
        /**
         * Matrix transpose
         */
        transpose: function(A) {
            const rows = A.length;
            const cols = A[0].length;
            const T = this.zeros(cols, rows);

            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    T[j][i] = A[i][j];
                }
            }
            return T;
        },
        /**
         * Scale matrix
         */
        scale: function(A, s) {
            return A.map(row => row.map(val => val * s));
        },
        /**
         * Matrix inverse (using Gauss-Jordan elimination)
         * For small matrices typical in Kalman filters
         */
        inverse: function(A) {
            const n = A.length;

            // Create augmented matrix [A | I]
            const aug = [];
            for (let i = 0; i < n; i++) {
                aug[i] = [...A[i]];
                for (let j = 0; j < n; j++) {
                    aug[i].push(i === j ? 1 : 0);
                }
            }
            // Forward elimination
            for (let col = 0; col < n; col++) {
                // Find pivot
                let maxRow = col;
                for (let row = col + 1; row < n; row++) {
                    if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
                        maxRow = row;
                    }
                }
                [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

                if (Math.abs(aug[col][col]) < 1e-10) {
                    // Singular matrix - return identity as fallback
                    console.warn('[KALMAN] Near-singular matrix in inverse');
                    return this.identity(n);
                }
                // Scale pivot row
                const scale = aug[col][col];
                for (let j = 0; j < 2 * n; j++) {
                    aug[col][j] /= scale;
                }
                // Eliminate column
                for (let row = 0; row < n; row++) {
                    if (row !== col) {
                        const factor = aug[row][col];
                        for (let j = 0; j < 2 * n; j++) {
                            aug[row][j] -= factor * aug[col][j];
                        }
                    }
                }
            }
            // Extract inverse
            const inv = [];
            for (let i = 0; i < n; i++) {
                inv[i] = aug[i].slice(n);
            }
            return inv;
        }
    },
    // SECTION 2: KALMAN FILTER CORE

    /**
     * Create a new Kalman filter
     * @param {Object} options - Filter configuration
     * @returns {Object} Kalman filter object
     */
    createFilter: function(options = {}) {
        const stateDim = options.stateDim || 4;
        const measurementDim = options.measurementDim || 2;

        // State transition matrix (A)
        const A = options.A || this.matrix.identity(stateDim);

        // Control input matrix (B)
        const B = options.B || this.matrix.zeros(stateDim, 1);

        // Measurement matrix (H)
        const H = options.H || this.matrix.zeros(measurementDim, stateDim);
        if (!options.H) {
            // Default: measure first measurementDim states
            for (let i = 0; i < measurementDim && i < stateDim; i++) {
                H[i][i] = 1;
            }
        }
        // Process noise covariance (Q)
        const Q = options.Q || this.matrix.scale(
            this.matrix.identity(stateDim),
            this.config.DEFAULT_PROCESS_NOISE
        );

        // Measurement noise covariance (R)
        const R = options.R || this.matrix.scale(
            this.matrix.identity(measurementDim),
            this.config.DEFAULT_MEASUREMENT_NOISE
        );

        // Initial state estimate
        const x = options.initialState || new Array(stateDim).fill(0);

        // Initial covariance estimate
        const P = options.initialCovariance || this.matrix.scale(
            this.matrix.identity(stateDim),
            this.config.DEFAULT_INITIAL_COVARIANCE
        );

        return {
            stateDim,
            measurementDim,
            A,       // State transition
            B,       // Control input
            H,       // Measurement
            Q,       // Process noise
            R,       // Measurement noise
            x,       // State estimate
            P,       // Covariance estimate
            K: null, // Kalman gain (computed during update)

            // History for analysis
            history: {
                states: [],
                covariances: [],
                innovations: [],
                gains: []
            }
        };
    },
    /**
     * Prediction step: x̂ₖ₋ = A·x̂ₖ₋₁ + B·uₖ₋₁
     * @param {Object} filter - Kalman filter object
     * @param {Array} control - Control input (optional)
     * @returns {Object} Updated filter with predicted state
     */
    predict: function(filter, control = null) {
        const { A, B, Q, x, P } = filter;

        // Predicted state: x̂ₖ₋ = A·x̂ₖ₋₁ + B·uₖ₋₁
        let xPred = this.matrix.multiplyVector(A, x);

        if (control) {
            const Bu = this.matrix.multiplyVector(B, control);
            xPred = xPred.map((val, i) => val + Bu[i]);
        }
        // Predicted covariance: Pₖ₋ = A·Pₖ₋₁·Aᵀ + Q
        const AP = this.matrix.multiply(A, P);
        const APAt = this.matrix.multiply(AP, this.matrix.transpose(A));
        const PPred = this.matrix.add(APAt, Q);

        // Update filter
        filter.x = xPred;
        filter.P = PPred;

        return filter;
    },
    /**
     * Update step: Incorporate measurement
     * @param {Object} filter - Kalman filter object
     * @param {Array} measurement - Measurement vector
     * @returns {Object} Updated filter with corrected state
     */
    update: function(filter, measurement) {
        const { H, R, x, P, measurementDim } = filter;

        // Innovation: yₖ = zₖ - H·x̂ₖ₋
        const Hx = this.matrix.multiplyVector(H, x);
        const innovation = measurement.map((z, i) => z - Hx[i]);

        // Innovation covariance: S = H·Pₖ₋·Hᵀ + R
        const HP = this.matrix.multiply(H, P);
        const HPHt = this.matrix.multiply(HP, this.matrix.transpose(H));
        const S = this.matrix.add(HPHt, R);

        // Kalman gain: K = Pₖ₋·Hᵀ·S⁻¹
        const Sinv = this.matrix.inverse(S);
        const PHt = this.matrix.multiply(P, this.matrix.transpose(H));
        const K = this.matrix.multiply(PHt, Sinv);

        // Updated state: x̂ₖ = x̂ₖ₋ + K·yₖ
        const Ky = this.matrix.multiplyVector(K, innovation);
        const xUpdated = x.map((val, i) => val + Ky[i]);

        // Updated covariance: Pₖ = (I - K·H)·Pₖ₋
        const KH = this.matrix.multiply(K, H);
        const IminusKH = this.matrix.subtract(
            this.matrix.identity(filter.stateDim),
            KH
        );
        const PUpdated = this.matrix.multiply(IminusKH, P);

        // Update filter
        filter.x = xUpdated;
        filter.P = PUpdated;
        filter.K = K;

        // Store history
        filter.history.states.push([...xUpdated]);
        filter.history.innovations.push([...innovation]);

        return filter;
    },
    /**
     * Single step: predict + update
     */
    step: function(filter, measurement, control = null) {
        this.predict(filter, control);
        return this.update(filter, measurement);
    },
    // SECTION 3: CUTTING PROCESS STATE ESTIMATION

    /**
     * Create Kalman filter for cutting process state estimation
     * State: [position, velocity, cutting_force, tool_wear]
     * Measurement: [position, force_sensor]
     */
    createCuttingFilter: function(options = {}) {
        const dt = options.dt || this.config.CONTROL_CYCLE_TIME;

        // State transition matrix for cutting dynamics
        // x(k+1) = A * x(k)
        // [pos]     [1  dt  0   0 ] [pos]
        // [vel]  =  [0  1   0   0 ] [vel]
        // [force]   [0  0   a   0 ] [force]  (force dynamics)
        // [wear]    [0  0   0   1 ] [wear]   (wear accumulates)

        const forceDynamics = options.forceDynamics || 0.95; // Force time constant

        const A = [
            [1, dt, 0, 0],
            [0, 1, 0, 0],
            [0, 0, forceDynamics, 0],
            [0, 0, 0, 1]
        ];

        // Control input: feedrate affects velocity
        const B = [
            [0],
            [dt],
            [0],
            [0]
        ];

        // Measurement matrix: we measure position and force
        const H = [
            [1, 0, 0, 0],  // Position measurement
            [0, 0, 1, 0]   // Force measurement
        ];

        // Process noise - higher for force (more uncertain)
        const Q = [
            [0.001, 0, 0, 0],
            [0, 0.01, 0, 0],
            [0, 0, 0.1, 0],
            [0, 0, 0, 0.0001]  // Wear changes slowly
        ];

        // Measurement noise
        const R = [
            [0.01, 0],      // Position sensor noise
            [0, 1.0]        // Force sensor noise (higher)
        ];

        return this.createFilter({
            stateDim: 4,
            measurementDim: 2,
            A, B, H, Q, R,
            initialState: options.initialState || [0, 0, 0, 0],
            initialCovariance: options.initialCovariance
        });
    },
    /**
     * Estimate cutting state from sensor readings
     * @param {Object} filter - Cutting process filter
     * @param {number} positionReading - Position sensor reading
     * @param {number} forceReading - Force sensor reading
     * @param {number} feedrateCommand - Current feedrate command
     * @returns {Object} Estimated state
     */
    estimateCuttingState: function(filter, positionReading, forceReading, feedrateCommand = null) {
        const measurement = [positionReading, forceReading];
        const control = feedrateCommand ? [feedrateCommand / 60000] : null; // Convert to mm/ms

        this.step(filter, measurement, control);

        return {
            position: filter.x[0],
            velocity: filter.x[1],
            cuttingForce: filter.x[2],
            toolWear: filter.x[3],
            uncertainty: {
                position: Math.sqrt(filter.P[0][0]),
                velocity: Math.sqrt(filter.P[1][1]),
                force: Math.sqrt(filter.P[2][2]),
                wear: Math.sqrt(filter.P[3][3])
            }
        };
    },
    // SECTION 4: ADAPTIVE FEEDRATE CONTROLLER

    /**
     * Create adaptive feedrate controller using Kalman estimation
     * @param {Object} options - Controller options
     * @returns {Object} Controller object
     */
    createAdaptiveFeedrateController: function(options = {}) {
        const filter = this.createCuttingFilter(options);

        return {
            filter: filter,

            // Target parameters
            targetForce: options.targetForce || 2000,       // N
            maxForce: options.maxForce || this.config.MAX_CUTTING_FORCE,

            // Feedrate limits
            minFeedrate: options.minFeedrate || this.config.MIN_FEEDRATE,
            maxFeedrate: options.maxFeedrate || this.config.MAX_FEEDRATE,
            maxFeedrateChange: options.maxFeedrateChange || this.config.MAX_FEEDRATE_CHANGE,

            // Current state
            currentFeedrate: options.initialFeedrate || 1000,

            // Control gains
            Kp: options.Kp || 0.5,    // Proportional gain
            Ki: options.Ki || 0.1,    // Integral gain
            Kd: options.Kd || 0.05,   // Derivative gain

            // Integral state
            integralError: 0,
            lastError: 0,

            // Prediction horizon
            predictionSteps: options.predictionSteps || 5,

            // Statistics
            stats: {
                cycles: 0,
                averageForce: 0,
                forceVariance: 0,
                feedrateAdjustments: 0
            }
        };
    },
    /**
     * Compute adaptive feedrate based on current state
     * @param {Object} controller - Adaptive controller object
     * @param {number} positionReading - Current position
     * @param {number} forceReading - Current force
     * @returns {Object} New feedrate command and state info
     */
    computeAdaptiveFeedrate: function(controller, positionReading, forceReading) {
        const { filter, targetForce, maxForce, Kp, Ki, Kd } = controller;

        // Estimate current state
        const state = this.estimateCuttingState(
            filter,
            positionReading,
            forceReading,
            controller.currentFeedrate
        );

        // Predict future force (look-ahead)
        const predictedForce = this._predictFutureForce(
            filter,
            controller.predictionSteps
        );

        // Use predicted force for control (proactive, not reactive)
        const effectiveForce = 0.3 * state.cuttingForce + 0.7 * predictedForce;

        // Force error
        const error = targetForce - effectiveForce;

        // PID control
        controller.integralError += error * this.config.CONTROL_CYCLE_TIME;
        controller.integralError = Math.max(-1000, Math.min(1000, controller.integralError)); // Anti-windup

        const derivativeError = (error - controller.lastError) / this.config.CONTROL_CYCLE_TIME;
        controller.lastError = error;

        // Control output
        let feedrateAdjustment = Kp * error + Ki * controller.integralError + Kd * derivativeError;

        // Safety: reduce feedrate if force too high
        if (effectiveForce > maxForce * this.config.FORCE_SAFETY_FACTOR) {
            feedrateAdjustment = -Math.abs(feedrateAdjustment) - 100;
        }
        // Rate limit
        feedrateAdjustment = Math.max(
            -controller.maxFeedrateChange,
            Math.min(controller.maxFeedrateChange, feedrateAdjustment)
        );

        // Apply adjustment
        let newFeedrate = controller.currentFeedrate + feedrateAdjustment;

        // Clamp to limits
        newFeedrate = Math.max(controller.minFeedrate, Math.min(controller.maxFeedrate, newFeedrate));

        // Update controller state
        controller.currentFeedrate = newFeedrate;
        controller.stats.cycles++;

        // Update running statistics
        const alpha = 0.1;
        controller.stats.averageForce = alpha * state.cuttingForce + (1 - alpha) * controller.stats.averageForce;

        if (Math.abs(feedrateAdjustment) > 10) {
            controller.stats.feedrateAdjustments++;
        }
        return {
            feedrate: Math.round(newFeedrate),
            feedrateUnit: 'mm/min',

            estimatedState: state,
            predictedForce: predictedForce,

            control: {
                error: error,
                adjustment: feedrateAdjustment,
                pTerm: Kp * error,
                iTerm: Ki * controller.integralError,
                dTerm: Kd * derivativeError
            },
            safety: {
                forceRatio: effectiveForce / maxForce,
                isLimiting: effectiveForce > maxForce * this.config.FORCE_SAFETY_FACTOR
            }
        };
    },
    /**
     * Predict future force using Kalman prediction
     */
    _predictFutureForce: function(filter, steps) {
        // Clone filter state for prediction
        const tempX = [...filter.x];
        const A = filter.A;

        // Propagate state forward
        let x = tempX;
        for (let i = 0; i < steps; i++) {
            x = this.matrix.multiplyVector(A, x);
        }
        // Return predicted force (state index 2)
        return x[2];
    },
    /**
     * Process a sequence of readings for batch feedrate optimization
     * @param {Array} readings - Array of {position, force} readings
     * @param {Object} options - Controller options
     * @returns {Array} Optimized feedrate profile
     */
    optimizeFeedrateProfile: function(readings, options = {}) {
        const controller = this.createAdaptiveFeedrateController(options);
        const results = [];

        for (const reading of readings) {
            const result = this.computeAdaptiveFeedrate(
                controller,
                reading.position,
                reading.force
            );
            results.push(result);
        }
        // Smooth the profile
        const smoothed = this._smoothFeedrateProfile(results.map(r => r.feedrate));

        return {
            profile: results.map((r, i) => ({
                ...r,
                smoothedFeedrate: smoothed[i]
            })),
            statistics: controller.stats,
            finalFeedrate: results[results.length - 1].feedrate
        };
    },
    /**
     * Smooth feedrate profile using moving average
     */
    _smoothFeedrateProfile: function(feedrates, windowSize = 5) {
        const smoothed = [];

        for (let i = 0; i < feedrates.length; i++) {
            let sum = 0;
            let count = 0;

            for (let j = Math.max(0, i - windowSize); j <= Math.min(feedrates.length - 1, i + windowSize); j++) {
                sum += feedrates[j];
                count++;
            }
            smoothed.push(sum / count);
        }
        return smoothed;
    },
    // SECTION 5: TOOL WEAR ESTIMATION

    /**
     * Create filter specifically for tool wear tracking
     */
    createToolWearFilter: function(options = {}) {
        // State: [wear_amount, wear_rate, temperature_effect]
        const A = [
            [1, options.dt || 0.01, 0],      // Wear accumulates
            [0, 1, 0.01],                     // Wear rate affected by temp
            [0, 0, 0.95]                      // Temperature decays
        ];

        const H = [
            [1, 0, 0]   // We estimate wear from indirect measurements
        ];

        return this.createFilter({
            stateDim: 3,
            measurementDim: 1,
            A, H,
            initialState: [0, 0, 0],
            Q: [[0.0001, 0, 0], [0, 0.00001, 0], [0, 0, 0.001]],
            R: [[0.01]]
        });
    },
    /**
     * Estimate tool wear from force measurements
     * @param {Object} filter - Tool wear filter
     * @param {number} forceReading - Current cutting force
     * @param {number} baselineForce - Expected force for sharp tool
     * @returns {Object} Wear estimate
     */
    estimateToolWear: function(filter, forceReading, baselineForce) {
        // Force increase indicates wear
        // Simple model: wear ∝ (current_force - baseline) / baseline
        const wearIndicator = Math.max(0, (forceReading - baselineForce) / baselineForce);

        this.step(filter, [wearIndicator]);

        const wearAmount = filter.x[0];
        const wearRate = filter.x[1];

        // Estimate remaining tool life
        const maxWear = 0.3; // 30% wear is typically end of life
        const remainingLife = wearRate > 0.0001
            ? (maxWear - wearAmount) / wearRate
            : Infinity;

        return {
            wearAmount: Math.max(0, Math.min(1, wearAmount)),
            wearRate: wearRate,
            wearPercent: (wearAmount * 100).toFixed(1) + '%',
            remainingLifeSeconds: remainingLife,
            remainingLifeMinutes: (remainingLife / 60).toFixed(1),
            needsReplacement: wearAmount > maxWear,
            confidence: 1 - Math.sqrt(filter.P[0][0])
        };
    },
    // SECTION 6: SELF-TEST

    selfTest: function() {
        console.log('[PRISM_KALMAN] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };

        // Test 1: Basic filter creation
        try {
            const filter = this.createFilter({ stateDim: 3, measurementDim: 2 });
            const pass = filter.A.length === 3 && filter.H.length === 2;

            results.tests.push({
                name: 'Filter creation',
                pass,
                stateDim: filter.stateDim,
                measurementDim: filter.measurementDim
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Filter creation', pass: false, error: e.message });
            results.failed++;
        }
        // Test 2: Predict step
        try {
            const filter = this.createFilter({ stateDim: 2, measurementDim: 1 });
            filter.x = [1, 0];
            filter.A = [[1, 1], [0, 1]];

            this.predict(filter);

            const pass = Math.abs(filter.x[0] - 1) < 0.01;

            results.tests.push({
                name: 'Prediction step',
                pass,
                predictedState: filter.x
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Prediction step', pass: false, error: e.message });
            results.failed++;
        }
        // Test 3: Update step with measurement
        try {
            const filter = this.createFilter({ stateDim: 2, measurementDim: 1 });
            filter.x = [0, 0];
            filter.H = [[1, 0]];

            this.update(filter, [5]);

            // State should move toward measurement
            const pass = filter.x[0] > 0;

            results.tests.push({
                name: 'Update with measurement',
                pass,
                updatedState: filter.x[0].toFixed(2)
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Update step', pass: false, error: e.message });
            results.failed++;
        }
        // Test 4: Cutting process filter
        try {
            const filter = this.createCuttingFilter();

            // Simulate a few steps
            for (let i = 0; i < 10; i++) {
                this.step(filter, [i * 0.1, 1000 + i * 10]);
            }
            const pass = filter.x[0] > 0 && filter.x[2] > 0;

            results.tests.push({
                name: 'Cutting process filter',
                pass,
                estimatedPosition: filter.x[0].toFixed(3),
                estimatedForce: filter.x[2].toFixed(1)
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Cutting filter', pass: false, error: e.message });
            results.failed++;
        }
        // Test 5: Adaptive feedrate controller
        try {
            const controller = this.createAdaptiveFeedrateController({
                targetForce: 1000,
                initialFeedrate: 500
            });

            // Simulate high force - should reduce feedrate
            const result1 = this.computeAdaptiveFeedrate(controller, 10, 2000);

            // Simulate low force - should increase feedrate
            const result2 = this.computeAdaptiveFeedrate(controller, 20, 500);

            const pass = result1.feedrate < controller.maxFeedrate &&
                        result2.feedrate > controller.minFeedrate;

            results.tests.push({
                name: 'Adaptive feedrate controller',
                pass,
                feedrateAfterHighForce: result1.feedrate,
                feedrateAfterLowForce: result2.feedrate
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Adaptive controller', pass: false, error: e.message });
            results.failed++;
        }
        // Test 6: Matrix operations
        try {
            const A = [[1, 2], [3, 4]];
            const B = [[5, 6], [7, 8]];

            const C = this.matrix.multiply(A, B);
            const expected = [[19, 22], [43, 50]];

            const pass = C[0][0] === expected[0][0] && C[1][1] === expected[1][1];

            results.tests.push({
                name: 'Matrix multiplication',
                pass,
                result: C
            });
            pass ? results.passed++ : results.failed++;
        } catch (e) {
            results.tests.push({ name: 'Matrix ops', pass: false, error: e.message });
            results.failed++;
        }
        console.log(`[PRISM_KALMAN] Tests complete: ${results.passed}/${results.passed + results.failed} passed`);
        return results;
    }
}