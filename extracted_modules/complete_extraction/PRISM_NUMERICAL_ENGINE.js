const PRISM_NUMERICAL_ENGINE = {

    version: '1.0.0',
    layer: 3,
    name: 'Core Numerical Algorithms',
    source: 'MIT 18.06, 18.086, 6.251J, 18.330',

    // SECTION 1: LINEAR ALGEBRA - Matrix Operations (MIT 18.06)

    linearAlgebra: {

        /**
         * Gaussian Elimination with Partial Pivoting
         * Solves Ax = b for x
         * O(n³) time complexity
         * Source: MIT 18.06 Lecture 2-3
         */
        gaussianElimination: function(A, b) {
            const n = A.length;

            // Create augmented matrix [A|b]
            const aug = A.map((row, i) => [...row, b[i]]);

            // Forward elimination with partial pivoting
            for (let col = 0; col < n; col++) {
                // Find pivot (largest absolute value in column)
                let maxRow = col;
                let maxVal = Math.abs(aug[col][col]);

                for (let row = col + 1; row < n; row++) {
                    if (Math.abs(aug[row][col]) > maxVal) {
                        maxVal = Math.abs(aug[row][col]);
                        maxRow = row;
                    }
                }
                // Swap rows if necessary
                if (maxRow !== col) {
                    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
                }
                // Check for singular matrix
                if (Math.abs(aug[col][col]) < 1e-12) {
                    throw new Error('Matrix is singular or nearly singular');
                }
                // Eliminate below pivot
                for (let row = col + 1; row < n; row++) {
                    const factor = aug[row][col] / aug[col][col];
                    for (let j = col; j <= n; j++) {
                        aug[row][j] -= factor * aug[col][j];
                    }
                }
            }
            // Back substitution
            const x = new Array(n).fill(0);
            for (let i = n - 1; i >= 0; i--) {
                let sum = aug[i][n];
                for (let j = i + 1; j < n; j++) {
                    sum -= aug[i][j] * x[j];
                }
                x[i] = sum / aug[i][i];
            }
            return x;
        },
        /**
         * LU Decomposition with Partial Pivoting
         * Decomposes A = PLU where P is permutation, L lower triangular, U upper triangular
         * O(n³) time complexity
         * Source: MIT 18.06 Lecture 4-5
         */
        luDecomposition: function(A) {
            const n = A.length;
            const L = Array(n).fill(null).map(() => Array(n).fill(0));
            const U = A.map(row => [...row]);
            const P = Array(n).fill(null).map((_, i) => i); // Permutation vector

            for (let k = 0; k < n; k++) {
                // Find pivot
                let maxVal = Math.abs(U[k][k]);
                let maxRow = k;

                for (let i = k + 1; i < n; i++) {
                    if (Math.abs(U[i][k]) > maxVal) {
                        maxVal = Math.abs(U[i][k]);
                        maxRow = i;
                    }
                }
                // Swap rows in U, L, and P
                if (maxRow !== k) {
                    [U[k], U[maxRow]] = [U[maxRow], U[k]];
                    [P[k], P[maxRow]] = [P[maxRow], P[k]];

                    // Swap L's existing entries
                    for (let j = 0; j < k; j++) {
                        [L[k][j], L[maxRow][j]] = [L[maxRow][j], L[k][j]];
                    }
                }
                // Compute L and U
                L[k][k] = 1;

                for (let i = k + 1; i < n; i++) {
                    L[i][k] = U[i][k] / U[k][k];
                    for (let j = k; j < n; j++) {
                        U[i][j] -= L[i][k] * U[k][j];
                    }
                }
            }
            return { L, U, P };
        },
        /**
         * Solve using LU decomposition
         * First solve Ly = Pb (forward substitution)
         * Then solve Ux = y (back substitution)
         */
        luSolve: function(L, U, P, b) {
            const n = L.length;

            // Apply permutation to b
            const pb = P.map(i => b[i]);

            // Forward substitution: Ly = Pb
            const y = new Array(n).fill(0);
            for (let i = 0; i < n; i++) {
                let sum = pb[i];
                for (let j = 0; j < i; j++) {
                    sum -= L[i][j] * y[j];
                }
                y[i] = sum; // L[i][i] = 1
            }
            // Back substitution: Ux = y
            const x = new Array(n).fill(0);
            for (let i = n - 1; i >= 0; i--) {
                let sum = y[i];
                for (let j = i + 1; j < n; j++) {
                    sum -= U[i][j] * x[j];
                }
                x[i] = sum / U[i][i];
            }
            return x;
        },
        /**
         * QR Decomposition using Modified Gram-Schmidt
         * Decomposes A = QR where Q is orthogonal, R is upper triangular
         * O(mn²) for m×n matrix
         * Source: MIT 18.06 Lecture 16-17
         */
        qrDecomposition: function(A) {
            const m = A.length;
            const n = A[0].length;

            // Work with column vectors
            const Q = Array(m).fill(null).map(() => Array(n).fill(0));
            const R = Array(n).fill(null).map(() => Array(n).fill(0));

            // Copy A columns
            const V = Array(n).fill(null).map((_, j) => A.map(row => row[j]));

            for (let j = 0; j < n; j++) {
                // Orthogonalize against previous columns
                for (let i = 0; i < j; i++) {
                    // R[i][j] = Q[:,i] · V[:,j]
                    let dot = 0;
                    for (let k = 0; k < m; k++) {
                        dot += Q[k][i] * V[j][k];
                    }
                    R[i][j] = dot;

                    // V[:,j] -= R[i][j] * Q[:,i]
                    for (let k = 0; k < m; k++) {
                        V[j][k] -= R[i][j] * Q[k][i];
                    }
                }
                // Normalize
                let norm = 0;
                for (let k = 0; k < m; k++) {
                    norm += V[j][k] * V[j][k];
                }
                norm = Math.sqrt(norm);

                R[j][j] = norm;

                if (norm > 1e-12) {
                    for (let k = 0; k < m; k++) {
                        Q[k][j] = V[j][k] / norm;
                    }
                }
            }
            return { Q, R };
        },
        /**
         * Cholesky Decomposition
         * For symmetric positive definite A, finds L such that A = LL^T
         * O(n³/3) - faster than LU for SPD matrices
         * Source: MIT 18.06, used in covariance matrices
         */
        choleskyDecomposition: function(A) {
            const n = A.length;
            const L = Array(n).fill(null).map(() => Array(n).fill(0));

            for (let i = 0; i < n; i++) {
                for (let j = 0; j <= i; j++) {
                    let sum = 0;

                    if (i === j) {
                        // Diagonal element
                        for (let k = 0; k < j; k++) {
                            sum += L[j][k] * L[j][k];
                        }
                        const val = A[j][j] - sum;
                        if (val <= 0) {
                            throw new Error('Matrix is not positive definite');
                        }
                        L[j][j] = Math.sqrt(val);
                    } else {
                        // Off-diagonal element
                        for (let k = 0; k < j; k++) {
                            sum += L[i][k] * L[j][k];
                        }
                        L[i][j] = (A[i][j] - sum) / L[j][j];
                    }
                }
            }
            return L;
        },
        /**
         * Matrix multiplication
         * C = A × B
         */
        matrixMultiply: function(A, B) {
            const m = A.length;
            const n = B[0].length;
            const p = B.length;

            const C = Array(m).fill(null).map(() => Array(n).fill(0));

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
         * Matrix transpose
         */
        transpose: function(A) {
            const m = A.length;
            const n = A[0].length;
            return Array(n).fill(null).map((_, j) => A.map(row => row[j]));
        },
        /**
         * Matrix-vector multiplication
         */
        matrixVectorMultiply: function(A, x) {
            return A.map(row => row.reduce((sum, val, j) => sum + val * x[j], 0));
        },
        /**
         * Vector dot product
         */
        dot: function(a, b) {
            return a.reduce((sum, val, i) => sum + val * b[i], 0);
        },
        /**
         * Vector norm (L2)
         */
        norm: function(v) {
            return Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
        },
        /**
         * Matrix determinant (using LU)
         */
        determinant: function(A) {
            const { U, P } = this.luDecomposition(A);
            let det = 1;
            let swaps = 0;

            for (let i = 0; i < A.length; i++) {
                det *= U[i][i];
                if (P[i] !== i) swaps++;
            }
            // Account for permutation sign
            return det * (swaps % 2 === 0 ? 1 : -1);
        },
        /**
         * Matrix inverse using LU decomposition
         */
        inverse: function(A) {
            const n = A.length;
            const { L, U, P } = this.luDecomposition(A);

            const inv = Array(n).fill(null).map(() => Array(n).fill(0));

            // Solve for each column of inverse
            for (let j = 0; j < n; j++) {
                const e = Array(n).fill(0);
                e[j] = 1;
                const col = this.luSolve(L, U, P, e);
                for (let i = 0; i < n; i++) {
                    inv[i][j] = col[i];
                }
            }
            return inv;
        }
    },
    // SECTION 2: ROOT FINDING ALGORITHMS (MIT 18.330)

    rootFinding: {

        /**
         * Newton-Raphson Method
         * Finds root of f(x) = 0 given f and f'
         * Quadratic convergence near root
         * Source: MIT 18.330 Numerical Analysis
         */
        newtonRaphson: function(f, df, x0, options = {}) {
            const { tol = 1e-10, maxIter = 100, verbose = false } = options;

            let x = x0;
            let iterations = [];

            for (let i = 0; i < maxIter; i++) {
                const fx = f(x);
                const dfx = df(x);

                if (Math.abs(dfx) < 1e-15) {
                    throw new Error('Derivative too small - method may not converge');
                }
                const xNew = x - fx / dfx;
                const error = Math.abs(xNew - x);

                if (verbose) {
                    iterations.push({ iter: i, x, fx, error });
                }
                if (error < tol) {
                    return {
                        root: xNew,
                        iterations: i + 1,
                        converged: true,
                        finalError: error,
                        history: verbose ? iterations : null
                    };
                }
                x = xNew;
            }
            return {
                root: x,
                iterations: maxIter,
                converged: false,
                finalError: Math.abs(f(x)),
                history: verbose ? iterations : null
            };
        },
        /**
         * Secant Method
         * Newton-like but doesn't require derivative
         * Superlinear convergence (order ~1.618)
         */
        secant: function(f, x0, x1, options = {}) {
            const { tol = 1e-10, maxIter = 100 } = options;

            let xPrev = x0;
            let xCurr = x1;

            for (let i = 0; i < maxIter; i++) {
                const fPrev = f(xPrev);
                const fCurr = f(xCurr);

                if (Math.abs(fCurr - fPrev) < 1e-15) {
                    break;
                }
                const xNext = xCurr - fCurr * (xCurr - xPrev) / (fCurr - fPrev);

                if (Math.abs(xNext - xCurr) < tol) {
                    return { root: xNext, iterations: i + 1, converged: true };
                }
                xPrev = xCurr;
                xCurr = xNext;
            }
            return { root: xCurr, iterations: maxIter, converged: false };
        },
        /**
         * Bisection Method
         * Guaranteed convergence but slow (linear)
         * Requires f(a) and f(b) have opposite signs
         */
        bisection: function(f, a, b, options = {}) {
            const { tol = 1e-10, maxIter = 100 } = options;

            let fa = f(a);
            let fb = f(b);

            if (fa * fb > 0) {
                throw new Error('f(a) and f(b) must have opposite signs');
            }
            for (let i = 0; i < maxIter; i++) {
                const mid = (a + b) / 2;
                const fmid = f(mid);

                if (Math.abs(fmid) < tol || (b - a) / 2 < tol) {
                    return { root: mid, iterations: i + 1, converged: true };
                }
                if (fa * fmid < 0) {
                    b = mid;
                    fb = fmid;
                } else {
                    a = mid;
                    fa = fmid;
                }
            }
            return { root: (a + b) / 2, iterations: maxIter, converged: false };
        },
        /**
         * Brent's Method
         * Combines bisection, secant, and inverse quadratic interpolation
         * Robust and efficient
         */
        brent: function(f, a, b, options = {}) {
            const { tol = 1e-10, maxIter = 100 } = options;

            let fa = f(a);
            let fb = f(b);

            if (fa * fb > 0) {
                throw new Error('f(a) and f(b) must have opposite signs');
            }
            // Ensure |f(b)| <= |f(a)|
            if (Math.abs(fa) < Math.abs(fb)) {
                [a, b] = [b, a];
                [fa, fb] = [fb, fa];
            }
            let c = a, fc = fa;
            let d = b - a;
            let e = d;

            for (let i = 0; i < maxIter; i++) {
                if (Math.abs(fb) < tol) {
                    return { root: b, iterations: i + 1, converged: true };
                }
                if (fa !== fc && fb !== fc) {
                    // Inverse quadratic interpolation
                    const s = (a * fb * fc) / ((fa - fb) * (fa - fc)) +
                              (b * fa * fc) / ((fb - fa) * (fb - fc)) +
                              (c * fa * fb) / ((fc - fa) * (fc - fb));

                    if ((s < (3 * a + b) / 4 || s > b) ||
                        (Math.abs(s - b) >= Math.abs(e) / 2)) {
                        // Fall back to bisection
                        d = e = (a + b) / 2 - b;
                    } else {
                        d = e;
                        e = s - b;
                    }
                } else {
                    // Secant method
                    if (fb !== fa) {
                        const s = b - fb * (b - a) / (fb - fa);
                        if ((s < (3 * a + b) / 4 || s > b) ||
                            (Math.abs(s - b) >= Math.abs(e) / 2)) {
                            d = e = (a + b) / 2 - b;
                        } else {
                            d = e;
                            e = s - b;
                        }
                    } else {
                        d = e = (a + b) / 2 - b;
                    }
                }
                a = b;
                fa = fb;
                b += Math.abs(e) > tol ? e : (e >= 0 ? tol : -tol);
                fb = f(b);

                if (fa * fb > 0) {
                    c = a;
                    fc = fa;
                }
            }
            return { root: b, iterations: maxIter, converged: false };
        }
    }
}