/**
 * PRISM_NUMERICAL_METHODS_MIT
 * Extracted from PRISM v8.89.002 monolith
 * References: 8
 * Category: numerical
 * Lines: 159
 * Session: R2.3.2 Algorithm Extraction
 */

const PRISM_NUMERICAL_METHODS_MIT = {
    /**
     * Newton-Raphson method for root finding
     * @param {Function} f - Function to find root of
     * @param {Function} df - Derivative of f
     * @param {number} x0 - Initial guess
     * @param {number} tol - Tolerance
     * @param {number} maxIter - Maximum iterations
     * @returns {Object} Solution and convergence info
     */
    newtonRaphson: function(f, df, x0, tol = 1e-10, maxIter = 100) {
        let x = x0;
        const history = [{ iter: 0, x: x, fx: f(x) }];
        
        for (let i = 0; i < maxIter; i++) {
            const fx = f(x);
            const dfx = df(x);
            
            if (Math.abs(dfx) < 1e-15) {
                return { 
                    converged: false, 
                    reason: 'Derivative too small',
                    x: x,
                    history: history
                };
            }
            
            const xNew = x - fx / dfx;
            history.push({ iter: i + 1, x: xNew, fx: f(xNew) });
            
            if (Math.abs(xNew - x) < tol) {
                return {
                    converged: true,
                    root: xNew,
                    iterations: i + 1,
                    finalError: Math.abs(f(xNew)),
                    history: history
                };
            }
            
            x = xNew;
        }
        
        return {
            converged: false,
            reason: 'Max iterations exceeded',
            x: x,
            history: history
        };
    },

    /**
     * Secant method for root finding (no derivative needed)
     * @param {Function} f - Function to find root of
     * @param {number} x0 - First initial guess
     * @param {number} x1 - Second initial guess
     * @param {number} tol - Tolerance
     * @param {number} maxIter - Maximum iterations
     * @returns {Object} Solution
     */
    secantMethod: function(f, x0, x1, tol = 1e-10, maxIter = 100) {
        let xPrev = x0;
        let xCurr = x1;
        const history = [
            { iter: 0, x: x0, fx: f(x0) },
            { iter: 1, x: x1, fx: f(x1) }
        ];
        
        for (let i = 0; i < maxIter; i++) {
            const fPrev = f(xPrev);
            const fCurr = f(xCurr);
            
            if (Math.abs(fCurr - fPrev) < 1e-15) {
                return {
                    converged: false,
                    reason: 'Division by near-zero',
                    x: xCurr,
                    history: history
                };
            }
            
            const xNew = xCurr - fCurr * (xCurr - xPrev) / (fCurr - fPrev);
            history.push({ iter: i + 2, x: xNew, fx: f(xNew) });
            
            if (Math.abs(xNew - xCurr) < tol) {
                return {
                    converged: true,
                    root: xNew,
                    iterations: i + 2,
                    finalError: Math.abs(f(xNew)),
                    history: history
                };
            }
            
            xPrev = xCurr;
            xCurr = xNew;
        }
        
        return {
            converged: false,
            reason: 'Max iterations exceeded',
            x: xCurr,
            history: history
        };
    },

    /**
     * Bisection method for root finding (guaranteed convergence)
     * @param {Function} f - Function to find root of
     * @param {number} a - Lower bound
     * @param {number} b - Upper bound
     * @param {number} tol - Tolerance
     * @param {number} maxIter - Maximum iterations
     * @returns {Object} Solution
     */
    bisectionMethod: function(f, a, b, tol = 1e-10, maxIter = 100) {
        const fa = f(a);
        const fb = f(b);
        
        if (fa * fb > 0) {
            return {
                converged: false,
                reason: 'f(a) and f(b) must have opposite signs'
            };
        }
        
        const history = [];
        
        for (let i = 0; i < maxIter; i++) {
            const c = (a + b) / 2;
            const fc = f(c);
            history.push({ iter: i, a: a, b: b, c: c, fc: fc });
            
            if (Math.abs(fc) < tol || (b - a) / 2 < tol) {
                return {
                    converged: true,
                    root: c,
                    iterations: i + 1,
                    finalError: Math.abs(fc),
                    bracketWidth: b - a,
                    history: history
                };
            }
            
            if (fa * fc < 0) {
                b = c;
            } else {
                a = c;
            }
        }
        
        return {
            converged: false,
            reason: 'Max iterations exceeded',
            x: (a + b) / 2,
            history: history
        };
    }
}