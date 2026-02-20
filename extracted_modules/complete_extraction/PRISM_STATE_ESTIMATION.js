const PRISM_STATE_ESTIMATION = {

    version: '1.0.0',
    source: 'MIT 2.004, 2.830',

    // EXTENDED KALMAN FILTER (MIT 2.004)
    // For nonlinear state estimation in machine control

    ExtendedKalmanFilter: class {
        constructor(stateDim, measurementDim, options = {}) {
            this.n = stateDim;
            this.m = measurementDim;

            // State estimate
            this.x = options.x0 || new Array(stateDim).fill(0);

            // State covariance
            this.P = options.P0 || this.identity(stateDim).map(row => row.map(v => v * 1));

            // Process noise covariance
            this.Q = options.Q || this.identity(stateDim).map(row => row.map(v => v * 0.01));

            // Measurement noise covariance
            this.R = options.R || this.identity(measurementDim).map(row => row.map(v => v * 0.1));

            // State transition function f(x, u)
            this.f = options.f || ((x, u) => x);

            // Measurement function h(x)
            this.h = options.h || (x => x.slice(0, measurementDim));

            // Jacobian of f with respect to x
            this.F = options.F || ((x, u) => this.identity(stateDim));

            // Jacobian of h with respect to x
            this.H = options.H || ((x) => {
                const H = new Array(measurementDim).fill(null).map(() => new Array(stateDim).fill(0));
                for (let i = 0; i < Math.min(measurementDim, stateDim); i++) H[i][i] = 1;
                return H;
            });
        }
        identity(n) {
            return Array(n).fill(null).map((_, i) => Array(n).fill(0).map((_, j) => i === j ? 1 : 0));
        }
        matMul(A, B) {
            const m = A.length, n = B[0].length, p = B.length;
            const C = Array(m).fill(null).map(() => Array(n).fill(0));
            for (let i = 0; i < m; i++)
                for (let j = 0; j < n; j++)
                    for (let k = 0; k < p; k++)
                        C[i][j] += A[i][k] * B[k][j];
            return C;
        }
        matVecMul(A, x) {
            return A.map(row => row.reduce((sum, a, j) => sum + a * x[j], 0));
        }
        transpose(A) {
            return A[0].map((_, j) => A.map(row => row[j]));
        }
        matAdd(A, B) {
            return A.map((row, i) => row.map((v, j) => v + B[i][j]));
        }
        matSub(A, B) {
            return A.map((row, i) => row.map((v, j) => v - B[i][j]));
        }
        inverse(A) {
            const n = A.length;
            const aug = A.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);

            for (let i = 0; i < n; i++) {
                let maxRow = i;
                for (let k = i + 1; k < n; k++)
                    if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
                [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

                const pivot = aug[i][i];
                if (Math.abs(pivot) < 1e-12) throw new Error('Matrix is singular');

                for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;

                for (let k = 0; k < n; k++) {
                    if (k !== i) {
                        const factor = aug[k][i];
                        for (let j = 0; j < 2 * n; j++) aug[k][j] -= factor * aug[i][j];
                    }
                }
            }
            return aug.map(row => row.slice(n));
        }
        /**
         * Prediction step
         * x_pred = f(x, u)
         * P_pred = F * P * F' + Q
         */
        predict(u = null) {
            // State prediction
            this.x = this.f(this.x, u);

            // Jacobian at current state
            const F = this.F(this.x, u);

            // Covariance prediction: P = F * P * F' + Q
            const FP = this.matMul(F, this.P);
            const FPFt = this.matMul(FP, this.transpose(F));
            this.P = this.matAdd(FPFt, this.Q);

            return { x: [...this.x], P: this.P.map(row => [...row]) };
        }
        /**
         * Update step with measurement
         * K = P * H' * (H * P * H' + R)^(-1)
         * x = x + K * (z - h(x))
         * P = (I - K * H) * P
         */
        update(z) {
            // Measurement Jacobian
            const H = this.H(this.x);

            // Innovation covariance: S = H * P * H' + R
            const HP = this.matMul(H, this.P);
            const HPHt = this.matMul(HP, this.transpose(H));
            const S = this.matAdd(HPHt, this.R);

            // Kalman gain: K = P * H' * S^(-1)
            const PHt = this.matMul(this.P, this.transpose(H));
            const Sinv = this.inverse(S);
            const K = this.matMul(PHt, Sinv);

            // Innovation: y = z - h(x)
            const hx = this.h(this.x);
            const y = z.map((zi, i) => zi - hx[i]);

            // State update: x = x + K * y
            const Ky = this.matVecMul(K, y);
            this.x = this.x.map((xi, i) => xi + Ky[i]);

            // Covariance update: P = (I - K * H) * P
            const KH = this.matMul(K, H);
            const IminusKH = this.matSub(this.identity(this.n), KH);
            this.P = this.matMul(IminusKH, this.P);

            return {
                x: [...this.x],
                P: this.P.map(row => [...row]),
                K,
                innovation: y
            };
        }
        /**
         * Combined predict and update
         */
        step(z, u = null) {
            this.predict(u);
            return this.update(z);
        }
        getState() { return [...this.x]; }
        getCovariance() { return this.P.map(row => [...row]); }
    },
    // LQR CONTROLLER (MIT 2.004)
    // Linear Quadratic Regulator for optimal control

    LQRController: {
        /**
         * Solve continuous-time algebraic Riccati equation
         * A'P + PA - PBR^(-1)B'P + Q = 0
         * Returns optimal gain K = R^(-1)B'P
         */
        solve: function(A, B, Q, R, options = {}) {
            const { maxIter = 1000, tol = 1e-9 } = options;
            const n = A.length;
            const m = B[0].length;

            // Matrix utilities
            const matMul = (A, B) => {
                const m = A.length, n = B[0].length, p = B.length;
                const C = Array(m).fill(null).map(() => Array(n).fill(0));
                for (let i = 0; i < m; i++)
                    for (let j = 0; j < n; j++)
                        for (let k = 0; k < p; k++)
                            C[i][j] += A[i][k] * B[k][j];
                return C;
            };
            const transpose = (A) => A[0].map((_, j) => A.map(row => row[j]));
            const matAdd = (A, B) => A.map((row, i) => row.map((v, j) => v + B[i][j]));
            const matSub = (A, B) => A.map((row, i) => row.map((v, j) => v - B[i][j]));
            const scale = (A, s) => A.map(row => row.map(v => v * s));

            const inverse = (A) => {
                const n = A.length;
                const aug = A.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);
                for (let i = 0; i < n; i++) {
                    let maxRow = i;
                    for (let k = i + 1; k < n; k++)
                        if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
                    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
                    const pivot = aug[i][i];
                    for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;
                    for (let k = 0; k < n; k++) {
                        if (k !== i) {
                            const factor = aug[k][i];
                            for (let j = 0; j < 2 * n; j++) aug[k][j] -= factor * aug[i][j];
                        }
                    }
                }
                return aug.map(row => row.slice(n));
            };
            const norm = (A) => Math.sqrt(A.flat().reduce((s, v) => s + v * v, 0));

            // Initialize P = Q
            let P = Q.map(row => [...row]);

            // R^(-1)
            const Rinv = inverse(R);

            // B * R^(-1) * B'
            const BRinvBt = matMul(matMul(B, Rinv), transpose(B));

            // Iterative solution
            for (let iter = 0; iter < maxIter; iter++) {
                // P_new = A'P + PA - PBR^(-1)B'P + Q
                const AtP = matMul(transpose(A), P);
                const PA = matMul(P, A);
                const PBRinvBtP = matMul(matMul(P, BRinvBt), P);

                const Pnew = matAdd(matSub(matAdd(AtP, PA), PBRinvBtP), Q);

                // Check convergence
                const diff = norm(matSub(Pnew, P));
                if (diff < tol) {
                    P = Pnew;
                    break;
                }
                // Damped update for stability
                P = matAdd(scale(P, 0.5), scale(Pnew, 0.5));
            }
            // Optimal gain: K = R^(-1) * B' * P
            const K = matMul(matMul(Rinv, transpose(B)), P);

            return { K, P };
        },
        /**
         * Compute optimal control input
         * u = -K * x
         */
        computeControl: function(K, x) {
            return K.map(row => -row.reduce((sum, k, j) => sum + k * x[j], 0));
        }
    },
    // MACHINE TOOL STATE ESTIMATION

    MachineToolEKF: {
        /**
         * Create EKF for 5-axis machine tool position estimation
         * State: [x, y, z, a, c, vx, vy, vz, va, vc]
         * Measurements: [x_enc, y_enc, z_enc, a_enc, c_enc]
         */
        create: function(options = {}) {
            const dt = options.dt || 0.001; // 1ms sample time

            // State transition (constant velocity model)
            const f = (x, u) => {
                const xNew = [...x];
                // Position update: p = p + v * dt
                for (let i = 0; i < 5; i++) {
                    xNew[i] = x[i] + x[i + 5] * dt;
                }
                return xNew;
            };
            // Measurement function (encoders measure position)
            const h = (x) => x.slice(0, 5);

            // State transition Jacobian
            const F = (x, u) => {
                const J = Array(10).fill(null).map(() => Array(10).fill(0));
                for (let i = 0; i < 10; i++) J[i][i] = 1;
                for (let i = 0; i < 5; i++) J[i][i + 5] = dt;
                return J;
            };
            // Measurement Jacobian
            const H = (x) => {
                const J = Array(5).fill(null).map(() => Array(10).fill(0));
                for (let i = 0; i < 5; i++) J[i][i] = 1;
                return J;
            };
            return new PRISM_STATE_ESTIMATION.ExtendedKalmanFilter(10, 5, {
                f, h, F, H,
                Q: Array(10).fill(null).map((_, i) =>
                    Array(10).fill(0).map((_, j) => i === j ? (i < 5 ? 1e-6 : 1e-4) : 0)
                ),
                R: Array(5).fill(null).map((_, i) =>
                    Array(5).fill(0).map((_, j) => i === j ? 1e-5 : 0)
                )
            });
        }
    }
}