/**
 * PRISM_OPTIMIZATION_ALGORITHMS
 * Extracted from PRISM v8.89.002 monolith
 * References: 40
 * Category: optimization
 * Lines: 187
 * Session: R2.3.2 Algorithm Extraction
 */

const PRISM_OPTIMIZATION_ALGORITHMS = {
    name: 'PRISM Optimization Algorithms',
    version: '1.0.0',
    sources: ['MIT 6.251J', 'MIT 15.099', 'MIT 18.433', 'Stanford AA222', 'CMU 10-725', 'Berkeley EECS127'],
    algorithmCount: 100,

    // ─────────────────────────────────────────────────────────────────────────────
    // 1.1 GRADIENT-BASED METHODS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * Gradient Descent with multiple variants
     * Source: MIT 15.099 Optimization Methods
     */
    gradientDescent: function(f, grad, x0, options = {}) {
        const maxIter = options.maxIter || 1000;
        const tol = options.tol || 1e-8;
        const alpha = options.learningRate || 0.01;
        const momentum = options.momentum || 0;
        const variant = options.variant || 'vanilla'; // vanilla, momentum, nesterov, adam
        
        let x = Array.isArray(x0) ? [...x0] : [x0];
        let v = new Array(x.length).fill(0); // velocity for momentum
        let m = new Array(x.length).fill(0); // first moment (Adam)
        let vAdam = new Array(x.length).fill(0); // second moment (Adam)
        const beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8;
        
        const history = [];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const g = grad(x);
            const fVal = f(x);
            history.push({ iter, x: [...x], f: fVal, gradNorm: this._norm(g) });
            
            if (this._norm(g) < tol) break;
            
            switch (variant) {
                case 'momentum':
                    for (let i = 0; i < x.length; i++) {
                        v[i] = momentum * v[i] - alpha * g[i];
                        x[i] += v[i];
                    }
                    break;
                    
                case 'nesterov':
                    const xLookahead = x.map((xi, i) => xi + momentum * v[i]);
                    const gLookahead = grad(xLookahead);
                    for (let i = 0; i < x.length; i++) {
                        v[i] = momentum * v[i] - alpha * gLookahead[i];
                        x[i] += v[i];
                    }
                    break;
                    
                case 'adam':
                    const t = iter + 1;
                    for (let i = 0; i < x.length; i++) {
                        m[i] = beta1 * m[i] + (1 - beta1) * g[i];
                        vAdam[i] = beta2 * vAdam[i] + (1 - beta2) * g[i] * g[i];
                        const mHat = m[i] / (1 - Math.pow(beta1, t));
                        const vHat = vAdam[i] / (1 - Math.pow(beta2, t));
                        x[i] -= alpha * mHat / (Math.sqrt(vHat) + epsilon);
                    }
                    break;
                    
                default: // vanilla
                    for (let i = 0; i < x.length; i++) {
                        x[i] -= alpha * g[i];
                    }
            }
        }
        
        return { x, f: f(x), iterations: history.length, history, converged: this._norm(grad(x)) < tol };
    },

    /**
     * Newton's Method with line search
     * Source: MIT 6.251J Mathematical Programming
     */
    newtonMethod: function(f, grad, hessian, x0, options = {}) {
        const maxIter = options.maxIter || 100;
        const tol = options.tol || 1e-10;
        const lineSearch = options.lineSearch !== false;
        
        let x = Array.isArray(x0) ? [...x0] : [x0];
        const n = x.length;
        const history = [];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const g = grad(x);
            const H = hessian(x);
            const fVal = f(x);
            
            history.push({ iter, x: [...x], f: fVal, gradNorm: this._norm(g) });
            
            if (this._norm(g) < tol) break;
            
            // Solve H * d = -g for Newton direction
            const d = this._solveLinearSystem(H, g.map(gi => -gi));
            
            // Line search (backtracking)
            let alpha = 1.0;
            if (lineSearch) {
                const c = 0.0001;
                const rho = 0.5;
                while (f(x.map((xi, i) => xi + alpha * d[i])) > fVal + c * alpha * this._dot(g, d)) {
                    alpha *= rho;
                    if (alpha < 1e-16) break;
                }
            }
            
            // Update
            for (let i = 0; i < n; i++) {
                x[i] += alpha * d[i];
            }
        }
        
        return { x, f: f(x), iterations: history.length, history, converged: this._norm(grad(x)) < tol };
    },

    /**
     * BFGS Quasi-Newton Method
     * Source: MIT 15.099, Stanford EE364a
     */
    bfgs: function(f, grad, x0, options = {}) {
        const maxIter = options.maxIter || 200;
        const tol = options.tol || 1e-8;
        
        let x = Array.isArray(x0) ? [...x0] : [x0];
        const n = x.length;
        
        // Initialize inverse Hessian approximation as identity
        let H = [];
        for (let i = 0; i < n; i++) {
            H[i] = new Array(n).fill(0);
            H[i][i] = 1;
        }
        
        const history = [];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const g = grad(x);
            const fVal = f(x);
            
            history.push({ iter, x: [...x], f: fVal, gradNorm: this._norm(g) });
            
            if (this._norm(g) < tol) break;
            
            // Search direction: d = -H * g
            const d = this._matVecMult(H, g.map(gi => -gi));
            
            // Line search
            let alpha = 1.0;
            const c = 0.0001;
            const rho = 0.5;
            while (f(x.map((xi, i) => xi + alpha * d[i])) > fVal + c * alpha * this._dot(g, d)) {
                alpha *= rho;
                if (alpha < 1e-16) break;
            }
            
            // Update x
            const xNew = x.map((xi, i) => xi + alpha * d[i]);
            const s = xNew.map((xni, i) => xni - x[i]);
            const gNew = grad(xNew);
            const y = gNew.map((gni, i) => gni - g[i]);
            
            // BFGS update for inverse Hessian
            const rho_k = 1 / this._dot(y, s);
            if (isFinite(rho_k)) {
                const I = [];
                for (let i = 0; i < n; i++) {
                    I[i] = new Array(n).fill(0);
                    I[i][i] = 1;
                }
                
                // H = (I - rho*s*y') * H * (I - rho*y*s') + rho*s*s'
                const sy = this._outerProduct(s, y);
                const ys = this._outerProduct(y, s);
                const ss = this._outerProduct(s, s);
                
                const M1 = this._matSubtract(I, this._matScale(sy, rho_k));
                const M2 = this._matSubtract(I, this._matScale(ys, rho_k));
                
                H = this._matAdd(
                    this._matMult(this._matMult(M1, H), M2),
                    this._matScale(ss, rho_k)
                );
            }