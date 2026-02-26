const PRISM_NUMERICAL = {
    
    /**
     * Bisection method for root finding
     * @param {Function} f - Function to find root of
     * @param {number} a - Left bracket
     * @param {number} b - Right bracket
     * @param {Object} options - Tolerance and max iterations
     * @returns {Object} Root and convergence info
     */
    bisection: function(f, a, b, options = {}) {
        const { tol = 1e-10, maxIter = 100 } = options;
        
        if (f(a) * f(b) > 0) {
            return { error: 'Function must have opposite signs at brackets' };
        }
        
        let iter = 0;
        const history = [];
        
        while ((b - a) / 2 > tol && iter < maxIter) {
            const c = (a + b) / 2;
            history.push({ iter, a, b, c, fc: f(c) });
            
            if (Math.abs(f(c)) < tol) {
                return { root: c, iterations: iter, history, converged: true };
            }
            
            if (f(a) * f(c) < 0) {
                b = c;
            } else {
                a = c;
            }
            iter++;
        }
        
        const root = (a + b) / 2;
        return { root, iterations: iter, error: Math.abs(f(root)), converged: true };
    },
    
    /**
     * Newton-Raphson method for root finding
     * @param {Function} f - Function to find root of
     * @param {Function} df - Derivative of f
     * @param {number} x0 - Initial guess
     * @param {Object} options - Tolerance and max iterations
     * @returns {Object} Root and convergence info
     */
    newtonRaphson: function(f, df, x0, options = {}) {
        const { tol = 1e-10, maxIter = 50 } = options;
        
        let x = x0;
        let iter = 0;
        const history = [{ iter: 0, x, fx: f(x) }];
        
        while (iter < maxIter) {
            const fx = f(x);
            const dfx = df(x);
            
            if (Math.abs(dfx) < 1e-15) {
                return { error: 'Derivative too small', x, iterations: iter };
            }
            
            const xNew = x - fx / dfx;
            history.push({ iter: iter + 1, x: xNew, fx: f(xNew) });
            
            if (Math.abs(xNew - x) < tol) {
                return { root: xNew, iterations: iter + 1, history, converged: true };
            }
            
            x = xNew;
            iter++;
        }
        
        return { root: x, iterations: iter, converged: false, history };
    },
    
    /**
     * Secant method for root finding (no derivative needed)
     * @param {Function} f - Function to find root of
     * @param {number} x0 - First initial guess
     * @param {number} x1 - Second initial guess
     * @param {Object} options - Tolerance and max iterations
     * @returns {Object} Root and convergence info
     */
    secant: function(f, x0, x1, options = {}) {
        const { tol = 1e-10, maxIter = 50 } = options;
        
        let xPrev = x0;
        let x = x1;
        let iter = 0;
        
        while (iter < maxIter) {
            const fPrev = f(xPrev);
            const fx = f(x);
            
            if (Math.abs(fx - fPrev) < 1e-15) {
                return { error: 'Division by zero imminent', x, iterations: iter };
            }
            
            const xNew = x - fx * (x - xPrev) / (fx - fPrev);
            
            if (Math.abs(xNew - x) < tol) {
                return { root: xNew, iterations: iter + 1, converged: true };
            }
            
            xPrev = x;
            x = xNew;
            iter++;
        }
        
        return { root: x, iterations: iter, converged: false };
    },
    
    /**
     * Lagrange interpolation
     * @param {Array} xs - x coordinates
     * @param {Array} ys - y coordinates
     * @param {number} x - Point to interpolate
     * @returns {number} Interpolated value
     */
    lagrangeInterpolation: function(xs, ys, x) {
        const n = xs.length;
        let result = 0;
        
        for (let i = 0; i < n; i++) {
            let term = ys[i];
            for (let j = 0; j < n; j++) {
                if (j !== i) {
                    term *= (x - xs[j]) / (xs[i] - xs[j]);
                }
            }
            result += term;
        }
        
        return result;
    },
    
    /**
     * Golden section search for 1D optimization
     * @param {Function} f - Function to minimize
     * @param {number} a - Left bound
     * @param {number} b - Right bound
     * @param {Object} options - Tolerance
     * @returns {Object} Minimum location and value
     */
    goldenSection: function(f, a, b, options = {}) {
        const { tol = 1e-8 } = options;
        const phi = (Math.sqrt(5) - 1) / 2;  // Golden ratio conjugate
        
        let x1 = b - phi * (b - a);
        let x2 = a + phi * (b - a);
        let f1 = f(x1);
        let f2 = f(x2);
        let iter = 0;
        
        while (Math.abs(b - a) > tol) {
            if (f1 < f2) {
                b = x2;
                x2 = x1;
                f2 = f1;
                x1 = b - phi * (b - a);
                f1 = f(x1);
            } else {
                a = x1;
                x1 = x2;
                f1 = f2;
                x2 = a + phi * (b - a);
                f2 = f(x2);
            }
            iter++;
        }
        
        const xMin = (a + b) / 2;
        return { minimum: xMin, value: f(xMin), iterations: iter };
    }
}