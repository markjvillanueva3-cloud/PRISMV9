const PRISM_EKF_ENGINE = {
    name: 'PRISM Extended Kalman Filter',
    version: '1.0.0',
    source: 'MIT 2.004 - Dynamics & Control II',

    /**
     * Extended Kalman Filter for nonlinear state estimation
     * Handles nonlinear state transition and observation models
     */
    ExtendedKalmanFilter: class {
        /**
         * @param {Function} f - State transition function f(x, u)
         * @param {Function} h - Observation function h(x)
         * @param {Function} F - Jacobian of f with respect to x
         * @param {Function} H - Jacobian of h with respect to x
         * @param {Array} Q - Process noise covariance
         * @param {Array} R - Measurement noise covariance
         * @param {Array} x0 - Initial state estimate
         * @param {Array} P0 - Initial error covariance
         */
        constructor(f, h, F, H, Q, R, x0, P0) {
            this.f = f;  // Nonlinear state transition
            this.h = h;  // Nonlinear observation
            this.F = F;  // Jacobian of f
            this.H = H;  // Jacobian of h
            this.Q = Q;  // Process noise covariance
            this.R = R;  // Measurement noise covariance
            this.x = [...x0];  // State estimate
            this.P = P0.map(row => [...row]);  // Error covariance
            this.n = x0.length;  // State dimension
            this.m = R.length;   // Measurement dimension
        }
        /**
         * Prediction step
         * @param {Array} u - Control input (optional)
         */
        predict(u = null) {
            // Predict state: x̂⁻ = f(x̂, u)
            this.x = this.f(this.x, u);

            // Compute Jacobian at current state
            const Fk = this.F(this.x, u);

            // Predict covariance: P⁻ = F * P * F' + Q
            this.P = this._addMat(
                this._multiplyMat(this._multiplyMat(Fk, this.P), this._transpose(Fk)),
                this.Q
            );

            return this.x;
        }
        /**
         * Update step with measurement
         * @param {Array} z - Measurement vector
         */
        update(z) {
            // Compute Jacobian of observation model
            const Hk = this.H(this.x);

            // Innovation: y = z - h(x̂⁻)
            const hx = this.h(this.x);
            const y = z.map((zi, i) => zi - hx[i]);

            // Innovation covariance: S = H * P * H' + R
            const S = this._addMat(
                this._multiplyMat(this._multiplyMat(Hk, this.P), this._transpose(Hk)),
                this.R
            );

            // Kalman gain: K = P * H' * S⁻¹
            const K = this._multiplyMat(
                this._multiplyMat(this.P, this._transpose(Hk)),
                this._inverse(S)
            );

            // Update state: x̂ = x̂⁻ + K * y
            const Ky = this._multiplyMatVec(K, y);
            this.x = this.x.map((xi, i) => xi + Ky[i]);

            // Update covariance: P = (I - K * H) * P
            const I = this._identity(this.n);
            const IKH = this._subtractMat(I, this._multiplyMat(K, Hk));
            this.P = this._multiplyMat(IKH, this.P);

            // Joseph form for numerical stability
            // P = (I - KH) * P * (I - KH)' + K * R * K'
            this.P = this._addMat(
                this._multiplyMat(this._multiplyMat(IKH, this.P), this._transpose(IKH)),
                this._multiplyMat(this._multiplyMat(K, this.R), this._transpose(K))
            );

            return {
                state: this.x,
                covariance: this.P,
                innovation: y,
                gain: K
            };
        }
        /**
         * Get current state estimate
         */
        getState() {
            return {
                x: [...this.x],
                P: this.P.map(row => [...row]),
                uncertainty: this.P.map((row, i) => Math.sqrt(row[i]))
            };
        }
        // Matrix operations
        _identity(n) {
            return Array(n).fill(null).map((_, i) =>
                Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
            );
        }
        _transpose(A) {
            if (!A || !A[0]) return A;
            return A[0].map((_, j) => A.map(row => row[j]));
        }
        _multiplyMat(A, B) {
            if (!A || !B || !A[0] || !B[0]) return A || B;
            const m = A.length, n = B[0].length, k = B.length;
            const result = Array(m).fill(null).map(() => Array(n).fill(0));
            for (let i = 0; i < m; i++) {
                for (let j = 0; j < n; j++) {
                    for (let l = 0; l < k; l++) {
                        result[i][j] += (A[i][l] || 0) * (B[l][j] || 0);
                    }
                }
            }
            return result;
        }
        _multiplyMatVec(A, v) {
            return A.map(row => row.reduce((sum, aij, j) => sum + aij * v[j], 0));
        }
        _addMat(A, B) {
            return A.map((row, i) => row.map((aij, j) => aij + (B[i]?.[j] || 0)));
        }
        _subtractMat(A, B) {
            return A.map((row, i) => row.map((aij, j) => aij - (B[i]?.[j] || 0)));
        }
        _inverse(A) {
            const n = A.length;
            const aug = A.map((row, i) => [...row, ...this._identity(n)[i]]);

            // Gauss-Jordan elimination
            for (let i = 0; i < n; i++) {
                // Find pivot
                let maxRow = i;
                for (let k = i + 1; k < n; k++) {
                    if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
                }
                [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

                // Scale pivot row
                const pivot = aug[i][i] || 1e-10;
                for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;

                // Eliminate
                for (let k = 0; k < n; k++) {
                    if (k !== i) {
                        const factor = aug[k][i];
                        for (let j = 0; j < 2 * n; j++) {
                            aug[k][j] -= factor * aug[i][j];
                        }
                    }
                }
            }
            return aug.map(row => row.slice(n));
        }
    },
    // MANUFACTURING APPLICATIONS

    /**
     * Create EKF for CNC machine position estimation
     * State: [x, y, z, vx, vy, vz] - position and velocity
     */
    createMachinePositionEKF(initialPosition = [0, 0, 0], options = {}) {
        const {
            dt = 0.001,           // Sample time (s)
            processNoise = 0.01,  // Position uncertainty (mm)
            measureNoise = 0.001  // Encoder resolution (mm)
        } = options;

        // State transition: x[k+1] = x[k] + v[k]*dt + 0.5*a*dt²
        // Simplified: x[k+1] = x[k] + v[k]*dt
        const f = (x, u) => [
            x[0] + x[3] * dt,  // x position
            x[1] + x[4] * dt,  // y position
            x[2] + x[5] * dt,  // z position
            x[3] + (u?.[0] || 0),  // x velocity
            x[4] + (u?.[1] || 0),  // y velocity
            x[5] + (u?.[2] || 0)   // z velocity
        ];

        // Observation: measure position only
        const h = (x) => [x[0], x[1], x[2]];

        // State Jacobian
        const F = (x, u) => [
            [1, 0, 0, dt, 0, 0],
            [0, 1, 0, 0, dt, 0],
            [0, 0, 1, 0, 0, dt],
            [0, 0, 0, 1, 0, 0],
            [0, 0, 0, 0, 1, 0],
            [0, 0, 0, 0, 0, 1]
        ];

        // Observation Jacobian
        const H = (x) => [
            [1, 0, 0, 0, 0, 0],
            [0, 1, 0, 0, 0, 0],
            [0, 0, 1, 0, 0, 0]
        ];

        // Process noise covariance
        const q = processNoise;
        const Q = [
            [q*dt**4/4, 0, 0, q*dt**3/2, 0, 0],
            [0, q*dt**4/4, 0, 0, q*dt**3/2, 0],
            [0, 0, q*dt**4/4, 0, 0, q*dt**3/2],
            [q*dt**3/2, 0, 0, q*dt**2, 0, 0],
            [0, q*dt**3/2, 0, 0, q*dt**2, 0],
            [0, 0, q*dt**3/2, 0, 0, q*dt**2]
        ];

        // Measurement noise covariance
        const r = measureNoise ** 2;
        const R = [[r, 0, 0], [0, r, 0], [0, 0, r]];

        // Initial state and covariance
        const x0 = [...initialPosition, 0, 0, 0];
        const P0 = [
            [1, 0, 0, 0, 0, 0],
            [0, 1, 0, 0, 0, 0],
            [0, 0, 1, 0, 0, 0],
            [0, 0, 0, 1, 0, 0],
            [0, 0, 0, 0, 1, 0],
            [0, 0, 0, 0, 0, 1]
        ];

        return new this.ExtendedKalmanFilter(f, h, F, H, Q, R, x0, P0);
    },
    /**
     * Create EKF for thermal error compensation
     * State: [T1, T2, T3, dT1, dT2, dT3] - temperatures and rates
     */
    createThermalCompensationEKF(options = {}) {
        const {
            dt = 1.0,  // Sample time (s)
            thermalTimeConstant = 300,  // τ (s)
            processNoise = 0.1,
            measureNoise = 0.5
        } = options;

        const tau = thermalTimeConstant;

        // Thermal dynamics: dT/dt = (T_amb - T) / τ + Q / (m*c)
        const f = (x, u) => {
            const decay = Math.exp(-dt / tau);
            return [
                x[0] * decay + x[3] * dt,
                x[1] * decay + x[4] * dt,
                x[2] * decay + x[5] * dt,
                x[3] * 0.99,  // Rate decays slowly
                x[4] * 0.99,
                x[5] * 0.99
            ];
        };
        const h = (x) => [x[0], x[1], x[2]];

        const decay = Math.exp(-dt / tau);
        const F = (x, u) => [
            [decay, 0, 0, dt, 0, 0],
            [0, decay, 0, 0, dt, 0],
            [0, 0, decay, 0, 0, dt],
            [0, 0, 0, 0.99, 0, 0],
            [0, 0, 0, 0, 0.99, 0],
            [0, 0, 0, 0, 0, 0.99]
        ];

        const H = (x) => [
            [1, 0, 0, 0, 0, 0],
            [0, 1, 0, 0, 0, 0],
            [0, 0, 1, 0, 0, 0]
        ];

        const q = processNoise;
        const Q = Array(6).fill(null).map((_, i) =>
            Array(6).fill(0).map((_, j) => i === j ? q : 0)
        );

        const r = measureNoise ** 2;
        const R = [[r, 0, 0], [0, r, 0], [0, 0, r]];

        const x0 = [20, 20, 20, 0, 0, 0];  // Ambient temperature
        const P0 = Array(6).fill(null).map((_, i) =>
            Array(6).fill(0).map((_, j) => i === j ? 10 : 0)
        );

        return new this.ExtendedKalmanFilter(f, h, F, H, Q, R, x0, P0);
    },
    /**
     * Estimate machining error from sensor fusion
     */
    estimateMachiningError(positionEKF, thermalEKF, forceData) {
        // Get position uncertainty
        const posState = positionEKF.getState();
        const thermalState = thermalEKF.getState();

        // Thermal expansion error model
        const alpha = 12e-6;  // Thermal expansion coefficient (steel)
        const L = 500;        // Characteristic length (mm)
        const thermalError = thermalState.x.slice(0, 3).map(T => alpha * (T - 20) * L);

        // Force-induced deflection error
        const stiffness = 50000;  // N/mm
        const forceError = forceData ? forceData.map(F => F / stiffness) : [0, 0, 0];

        // Total error (RSS of components)
        const totalError = {
            x: Math.sqrt(posState.uncertainty[0]**2 + thermalError[0]**2 + forceError[0]**2),
            y: Math.sqrt(posState.uncertainty[1]**2 + thermalError[1]**2 + forceError[1]**2),
            z: Math.sqrt(posState.uncertainty[2]**2 + thermalError[2]**2 + forceError[2]**2)
        };
        return {
            position: { x: posState.x[0], y: posState.x[1], z: posState.x[2] },
            velocity: { x: posState.x[3], y: posState.x[4], z: posState.x[5] },
            temperature: { T1: thermalState.x[0], T2: thermalState.x[1], T3: thermalState.x[2] },
            error: totalError,
            totalError3D: Math.sqrt(totalError.x**2 + totalError.y**2 + totalError.z**2),
            components: {
                position: posState.uncertainty.slice(0, 3),
                thermal: thermalError,
                force: forceError
            }
        };
    }
}