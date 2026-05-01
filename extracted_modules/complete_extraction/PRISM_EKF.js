const PRISM_EKF = {
    name: "Extended Kalman Filter",
    mitSource: "MIT 2.004 - Dynamics and Control II",
    complexity: { time: "O(n³)", space: "O(n²)" },

    predict: function(state) {
        // State: { x, P, F, Q }
        const { x, P, F, Q } = state;

        // Predicted state: x_pred = F * x
        const x_pred = this.matVecMult(F, x);

        // Predicted covariance: P_pred = F * P * F' + Q
        const FP = this.matMult(F, P);
        const FPFt = this.matMult(FP, this.transpose(F));
        const P_pred = this.matAdd(FPFt, Q);

        return { x: x_pred, P: P_pred };
    },
    update: function(state, measurement) {
        // State: { x, P, H, R, z }
        const { x, P, H, R } = state;
        const z = measurement;

        // Innovation: y = z - H * x
        const Hx = this.matVecMult(H, x);
        const y = z.map((zi, i) => zi - Hx[i]);

        // Innovation covariance: S = H * P * H' + R
        const HP = this.matMult(H, P);
        const HPHt = this.matMult(HP, this.transpose(H));
        const S = this.matAdd(HPHt, R);

        // Kalman gain: K = P * H' * S^(-1)
        const PHt = this.matMult(P, this.transpose(H));
        const Sinv = this.inverse(S);
        const K = this.matMult(PHt, Sinv);

        // Updated state: x_new = x + K * y
        const Ky = this.matVecMult(K, y);
        const x_new = x.map((xi, i) => xi + Ky[i]);

        // Updated covariance: P_new = (I - K*H) * P
        const n = x.length;
        const I = Array(n).fill(0).map((_, i) => Array(n).fill(0).map((_, j) => i === j ? 1 : 0));
        const KH = this.matMult(K, H);
        const IminusKH = this.matSub(I, KH);
        const P_new = this.matMult(IminusKH, P);

        return {
            x: x_new,
            P: P_new,
            K: K,
            innovation: y,
            innovationCovariance: S
        };
    },
    // Matrix utilities
    matMult: function(A, B) {
        const m = A.length, n = B[0].length, p = B.length;
        const C = Array(m).fill(0).map(() => Array(n).fill(0));
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                for (let k = 0; k < p; k++) {
                    C[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        return C;
    },
    matVecMult: function(A, x) {
        return A.map(row => row.reduce((sum, aij, j) => sum + aij * x[j], 0));
    },
    transpose: function(A) {
        return A[0].map((_, j) => A.map(row => row[j]));
    },
    matAdd: function(A, B) {
        return A.map((row, i) => row.map((aij, j) => aij + B[i][j]));
    },
    matSub: function(A, B) {
        return A.map((row, i) => row.map((aij, j) => aij - B[i][j]));
    },
    inverse: function(A) {
        const n = A.length;
        const Aug = A.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);

        for (let i = 0; i < n; i++) {
            // Find pivot
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(Aug[k][i]) > Math.abs(Aug[maxRow][i])) maxRow = k;
            }
            [Aug[i], Aug[maxRow]] = [Aug[maxRow], Aug[i]];

            // Scale
            const pivot = Aug[i][i];
            if (Math.abs(pivot) < 1e-10) continue;
            for (let j = 0; j < 2 * n; j++) Aug[i][j] /= pivot;

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
    }
}