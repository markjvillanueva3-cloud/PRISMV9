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
}