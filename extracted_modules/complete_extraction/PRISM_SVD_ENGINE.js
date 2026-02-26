const PRISM_SVD_ENGINE = {

    version: '1.0.0',
    source: 'MIT 18.06, Stanford EE263',

    /**
     * Singular Value Decomposition: A = U * Σ * V^T
     * Uses one-sided Jacobi algorithm for numerical stability
     *
     * Applications in CAM:
     * - Least squares surface fitting
     * - Pseudo-inverse for over/under-determined systems
     * - Rank detection for singularity analysis
     * - PCA for sensor data reduction
     *
     * @param {number[][]} A - Input matrix (m x n)
     * @returns {Object} { U, S, V } where A ≈ U * diag(S) * V^T
     */
    decompose: function(A) {
        const m = A.length;
        const n = A[0].length;

        // Work with A^T * A for V, and A * A^T for U
        const AtA = this.matMul(this.transpose(A), A);
        const AAt = this.matMul(A, this.transpose(A));

        // Get eigenvalues and eigenvectors of A^T * A
        const { eigenvalues: eigValsV, eigenvectors: V } = this.symmetricEigen(AtA);

        // Singular values are sqrt of eigenvalues
        const singularValues = eigValsV.map(e => Math.sqrt(Math.max(0, e)));

        // Sort by descending singular value
        const indices = singularValues.map((_, i) => i)
            .sort((a, b) => singularValues[b] - singularValues[a]);

        const S = indices.map(i => singularValues[i]);
        const Vsorted = indices.map(i => V.map(row => row[i]));

        // Compute U = A * V * Σ^(-1)
        const U = this.computeU(A, Vsorted, S);

        return {
            U,
            S,
            V: this.transpose(Vsorted),
            rank: S.filter(s => s > 1e-10).length
        };
    },
    /**
     * Compute U from A, V, and singular values
     */
    computeU: function(A, V, S) {
        const m = A.length;
        const n = A[0].length;
        const k = Math.min(m, n);

        const U = Array(m).fill(null).map(() => Array(k).fill(0));

        for (let j = 0; j < k; j++) {
            if (S[j] > 1e-10) {
                // u_j = (1/σ_j) * A * v_j
                const vj = V[j];
                const Avj = A.map(row => row.reduce((sum, a, i) => sum + a * vj[i], 0));
                for (let i = 0; i < m; i++) {
                    U[i][j] = Avj[i] / S[j];
                }
            }
        }
        return U;
    },
    /**
     * Symmetric eigenvalue decomposition using Jacobi rotations
     * For symmetric matrices only (like A^T*A)
     */
    symmetricEigen: function(A, maxIter = 100) {
        const n = A.length;
        let V = this.identity(n);
        let D = A.map(row => [...row]);

        for (let iter = 0; iter < maxIter; iter++) {
            // Find largest off-diagonal element
            let maxVal = 0, p = 0, q = 1;
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    if (Math.abs(D[i][j]) > maxVal) {
                        maxVal = Math.abs(D[i][j]);
                        p = i; q = j;
                    }
                }
            }
            if (maxVal < 1e-12) break;

            // Jacobi rotation
            const theta = (D[q][q] - D[p][p]) / (2 * D[p][q]);
            const t = Math.sign(theta) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
            const c = 1 / Math.sqrt(t * t + 1);
            const s = t * c;

            // Update D
            const Dpp = D[p][p], Dqq = D[q][q], Dpq = D[p][q];
            D[p][p] = c*c*Dpp - 2*s*c*Dpq + s*s*Dqq;
            D[q][q] = s*s*Dpp + 2*s*c*Dpq + c*c*Dqq;
            D[p][q] = D[q][p] = 0;

            for (let i = 0; i < n; i++) {
                if (i !== p && i !== q) {
                    const Dip = D[i][p], Diq = D[i][q];
                    D[i][p] = D[p][i] = c*Dip - s*Diq;
                    D[i][q] = D[q][i] = s*Dip + c*Diq;
                }
            }
            // Update V
            for (let i = 0; i < n; i++) {
                const Vip = V[i][p], Viq = V[i][q];
                V[i][p] = c*Vip - s*Viq;
                V[i][q] = s*Vip + c*Viq;
            }
        }
        const eigenvalues = D.map((row, i) => row[i]);
        return { eigenvalues, eigenvectors: V };
    },
    /**
     * Moore-Penrose Pseudo-inverse: A⁺ = V * Σ⁺ * U^T
     * Critical for least-squares solutions
     */
    pseudoInverse: function(A, tolerance = 1e-10) {
        const { U, S, V } = this.decompose(A);
        const m = U.length;
        const n = V.length;
        const k = S.length;

        // Σ⁺ has 1/σᵢ on diagonal for non-zero σᵢ
        const Spinv = S.map(s => s > tolerance ? 1/s : 0);

        // A⁺ = V * Σ⁺ * U^T
        const result = Array(n).fill(null).map(() => Array(m).fill(0));

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < m; j++) {
                for (let l = 0; l < k; l++) {
                    result[i][j] += V[i][l] * Spinv[l] * U[j][l];
                }
            }
        }
        return result;
    },
    /**
     * Least Squares Solution: x = A⁺ * b
     * Solves min ||Ax - b||²
     */
    leastSquares: function(A, b) {
        const Apinv = this.pseudoInverse(A);
        return Apinv.map(row => row.reduce((sum, val, j) => sum + val * b[j], 0));
    },
    /**
     * Total Least Squares (errors-in-variables)
     * Minimizes perpendicular distances, not vertical
     */
    totalLeastSquares: function(A, b) {
        // Augment: [A | b]
        const Aug = A.map((row, i) => [...row, b[i]]);
        const { V, S } = this.decompose(Aug);

        // Solution is last column of V, normalized
        const n = A[0].length;
        const vLast = V.map(row => row[n]);
        const scale = -vLast[n];

        return vLast.slice(0, n).map(v => v / scale);
    },
    /**
     * Condition Number: κ(A) = σ_max / σ_min
     * Indicates numerical stability
     */
    conditionNumber: function(A) {
        const { S } = this.decompose(A);
        const nonzero = S.filter(s => s > 1e-15);
        if (nonzero.length === 0) return Infinity;
        return nonzero[0] / nonzero[nonzero.length - 1];
    },
    /**
     * Low-rank Approximation: keep only top k singular values
     * Used for noise reduction and compression
     */
    lowRankApprox: function(A, k) {
        const { U, S, V } = this.decompose(A);
        const m = U.length;
        const n = V.length;

        const result = Array(m).fill(null).map(() => Array(n).fill(0));

        for (let l = 0; l < Math.min(k, S.length); l++) {
            for (let i = 0; i < m; i++) {
                for (let j = 0; j < n; j++) {
                    result[i][j] += U[i][l] * S[l] * V[j][l];
                }
            }
        }
        return result;
    },
    // Utility functions
    transpose: function(A) {
        return A[0].map((_, j) => A.map(row => row[j]));
    },
    matMul: function(A, B) {
        const m = A.length, n = B[0].length, p = B.length;
        const C = Array(m).fill(null).map(() => Array(n).fill(0));
        for (let i = 0; i < m; i++)
            for (let j = 0; j < n; j++)
                for (let k = 0; k < p; k++)
                    C[i][j] += A[i][k] * B[k][j];
        return C;
    },
    identity: function(n) {
        return Array(n).fill(null).map((_, i) =>
            Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
        );
    }
}