const PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER = {
    name: 'PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER',
    version: '1.0.0',
    description: 'Advanced unconstrained optimization: L-BFGS, Trust Region, Steepest Descent variants',
    source: 'MIT 15.084j, Nocedal & Wright',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Linear Algebra Utilities
    // ─────────────────────────────────────────────────────────────────────────────
    
    _dot: function(a, b) {
        return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    },
    
    _norm: function(v) {
        return Math.sqrt(v.reduce((sum, vi) => sum + vi * vi, 0));
    },
    
    _scale: function(v, s) {
        return v.map(vi => vi * s);
    },
    
    _add: function(a, b) {
        return a.map((ai, i) => ai + b[i]);
    },
    
    _sub: function(a, b) {
        return a.map((ai, i) => ai - b[i]);
    },
    
    _clone: function(v) {
        return [...v];
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // L-BFGS (Limited-Memory BFGS)
    // Efficient for large-scale optimization
    // ─────────────────────────────────────────────────────────────────────────────
    
    lbfgs: function(config) {
        const {
            f,
            gradient,
            x0,
            m = 10,           // Memory size (number of corrections stored)
            maxIter = 1000,
            tol = 1e-8,
            lineSearchMaxIter = 20,
            c1 = 1e-4,        // Armijo condition
            c2 = 0.9          // Curvature condition
        } = config;
        
        const n = x0.length;
        let x = this._clone(x0);
        let g = gradient(x);
        
        // Storage for s and y vectors
        const sHistory = [];  // s_k = x_{k+1} - x_k
        const yHistory = [];  // y_k = g_{k+1} - g_k
        const rhoHistory = []; // rho_k = 1 / (y_k^T s_k)
        
        const history = [{ x: this._clone(x), f: f(x), gradNorm: this._norm(g) }];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const gradNorm = this._norm(g);
            
            if (gradNorm < tol) {
                return {
                    x,
                    f: f(x),
                    converged: true,
                    iterations: iter,
                    history,
                    method: 'L-BFGS'
                };
            }
            
            // Compute search direction using two-loop recursion
            const d = this._lbfgsTwoLoop(g, sHistory, yHistory, rhoHistory);
            
            // Line search (Strong Wolfe conditions)
            const { alpha, fNew, gNew } = this._wolfeLineSearch(f, gradient, x, d, g, c1, c2, lineSearchMaxIter);
            
            if (alpha === 0) {
                return {
                    x,
                    f: f(x),
                    converged: false,
                    iterations: iter,
                    reason: 'Line search failed',
                    history
                };
            }
            
            // Compute s and y
            const s = this._scale(d, alpha);
            const xNew = this._add(x, s);
            const y = this._sub(gNew, g);
            
            // Update history
            const sTy = this._dot(s, y);
            if (sTy > 1e-10) { // Curvature condition
                if (sHistory.length >= m) {
                    sHistory.shift();
                    yHistory.shift();
                    rhoHistory.shift();
                }
                sHistory.push(s);
                yHistory.push(y);
                rhoHistory.push(1 / sTy);
            }
            
            x = xNew;
            g = gNew;
            
            history.push({
                x: this._clone(x),
                f: fNew,
                gradNorm: this._norm(g),
                alpha
            });
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            iterations: maxIter,
            history,
            method: 'L-BFGS'
        };
    },
    
    _lbfgsTwoLoop: function(g, sHistory, yHistory, rhoHistory) {
        const k = sHistory.length;
        let q = this._clone(g);
        const alpha = [];
        
        // First loop (backward)
        for (let i = k - 1; i >= 0; i--) {
            alpha[i] = rhoHistory[i] * this._dot(sHistory[i], q);
            q = this._sub(q, this._scale(yHistory[i], alpha[i]));
        }
        
        // Initial Hessian approximation (scaled identity)
        let gamma = 1;
        if (k > 0) {
            gamma = this._dot(sHistory[k-1], yHistory[k-1]) / 
                    this._dot(yHistory[k-1], yHistory[k-1]);
        }
        let r = this._scale(q, gamma);
        
        // Second loop (forward)
        for (let i = 0; i < k; i++) {
            const beta = rhoHistory[i] * this._dot(yHistory[i], r);
            r = this._add(r, this._scale(sHistory[i], alpha[i] - beta));
        }
        
        // Negate for descent direction
        return this._scale(r, -1);
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Steepest Descent with Adaptive Step Size
    // ─────────────────────────────────────────────────────────────────────────────
    
    steepestDescentAdaptive: function(config) {
        const {
            f,
            gradient,
            x0,
            maxIter = 10000,
            tol = 1e-8,
            initialStep = 1.0,
            stepIncrease = 1.2,
            stepDecrease = 0.5,
            c = 0.0001
        } = config;
        
        let x = this._clone(x0);
        let step = initialStep;
        const history = [];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const g = gradient(x);
            const gradNorm = this._norm(g);
            const fx = f(x);
            
            history.push({ x: this._clone(x), f: fx, gradNorm, step });
            
            if (gradNorm < tol) {
                return {
                    x,
                    f: fx,
                    converged: true,
                    iterations: iter,
                    history,
                    method: 'Steepest Descent (Adaptive)'
                };
            }
            
            // Direction: negative gradient
            const d = this._scale(g, -1);
            
            // Adaptive step size with Armijo condition
            let alpha = step;
            let accepted = false;
            
            for (let ls = 0; ls < 50; ls++) {
                const xNew = this._add(x, this._scale(d, alpha));
                const fNew = f(xNew);
                
                // Armijo condition
                if (fNew <= fx + c * alpha * this._dot(g, d)) {
                    x = xNew;
                    accepted = true;
                    
                    // Increase step for next iteration
                    step = Math.min(alpha * stepIncrease, 10);
                    break;
                }
                
                alpha *= stepDecrease;
            }
            
            if (!accepted) {
                return {
                    x,
                    f: fx,
                    converged: false,
                    iterations: iter,
                    reason: 'Line search failed',
                    history
                };
            }
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            iterations: maxIter,
            history,
            method: 'Steepest Descent (Adaptive)'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Nonlinear Conjugate Gradient (Fletcher-Reeves & Polak-Ribière)
    // ─────────────────────────────────────────────────────────────────────────────
    
    nonlinearCG: function(config) {
        const {
            f,
            gradient,
            x0,
            method = 'PR',    // 'FR' (Fletcher-Reeves) or 'PR' (Polak-Ribière)
            maxIter = 10000,
            tol = 1e-8,
            restartInterval = null
        } = config;
        
        const n = x0.length;
        let x = this._clone(x0);
        let g = gradient(x);
        let d = this._scale(g, -1);
        const history = [];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const gradNorm = this._norm(g);
            const fx = f(x);
            
            history.push({ x: this._clone(x), f: fx, gradNorm });
            
            if (gradNorm < tol) {
                return {
                    x,
                    f: fx,
                    converged: true,
                    iterations: iter,
                    history,
                    method: `Nonlinear CG (${method})`
                };
            }
            
            // Line search
            const alpha = this._backtrackingLineSearch(f, x, d, g);
            x = this._add(x, this._scale(d, alpha));
            
            const gNew = gradient(x);
            
            // Compute beta
            let beta;
            if (method === 'FR') {
                // Fletcher-Reeves
                beta = this._dot(gNew, gNew) / this._dot(g, g);
            } else {
                // Polak-Ribière (with restart)
                beta = Math.max(0, this._dot(gNew, this._sub(gNew, g)) / this._dot(g, g));
            }
            
            // Restart check
            if (restartInterval && (iter + 1) % restartInterval === 0) {
                beta = 0;
            }
            
            // Update direction
            d = this._add(this._scale(gNew, -1), this._scale(d, beta));
            g = gNew;
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            iterations: maxIter,
            history,
            method: `Nonlinear CG (${method})`
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // SR1 (Symmetric Rank-1) Quasi-Newton
    // ─────────────────────────────────────────────────────────────────────────────
    
    sr1: function(config) {
        const {
            f,
            gradient,
            x0,
            maxIter = 1000,
            tol = 1e-8,
            skipThreshold = 1e-8
        } = config;
        
        const n = x0.length;
        let x = this._clone(x0);
        let g = gradient(x);
        
        // Initialize Hessian approximation as identity
        let B = this._identity(n);
        
        const history = [{ x: this._clone(x), f: f(x), gradNorm: this._norm(g) }];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const gradNorm = this._norm(g);
            
            if (gradNorm < tol) {
                return {
                    x,
                    f: f(x),
                    converged: true,
                    iterations: iter,
                    history,
                    method: 'SR1'
                };
            }
            
            // Solve B * d = -g for search direction
            const d = this._solveLinear(B, this._scale(g, -1));
            
            // Line search
            const alpha = this._backtrackingLineSearch(f, x, d, g);
            
            const s = this._scale(d, alpha);
            const xNew = this._add(x, s);
            const gNew = gradient(xNew);
            const y = this._sub(gNew, g);
            
            // SR1 update
            const Bs = this._matVec(B, s);
            const r = this._sub(y, Bs);
            const rTs = this._dot(r, s);
            
            // Skip update if denominator is too small
            if (Math.abs(rTs) > skipThreshold * this._norm(r) * this._norm(s)) {
                // B = B + (r * r') / (r' * s)
                const rrT = this._outer(r, r);
                B = this._matAdd(B, this._matScale(rrT, 1 / rTs));
            }
            
            x = xNew;
            g = gNew;
            
            history.push({
                x: this._clone(x),
                f: f(x),
                gradNorm: this._norm(g),
                alpha
            });
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            iterations: maxIter,
            history,
            method: 'SR1'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // DFP (Davidon-Fletcher-Powell) Quasi-Newton
    // ─────────────────────────────────────────────────────────────────────────────
    
    dfp: function(config) {
        const {
            f,
            gradient,
            x0,
            maxIter = 1000,
            tol = 1e-8
        } = config;
        
        const n = x0.length;
        let x = this._clone(x0);
        let g = gradient(x);
        
        // Initialize inverse Hessian approximation as identity
        let H = this._identity(n);
        
        const history = [{ x: this._clone(x), f: f(x), gradNorm: this._norm(g) }];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const gradNorm = this._norm(g);
            
            if (gradNorm < tol) {
                return {
                    x,
                    f: f(x),
                    converged: true,
                    iterations: iter,
                    history,
                    method: 'DFP'
                };
            }
            
            // Search direction: d = -H * g
            const d = this._scale(this._matVec(H, g), -1);
            
            // Line search
            const alpha = this._backtrackingLineSearch(f, x, d, g);
            
            const s = this._scale(d, alpha);
            const xNew = this._add(x, s);
            const gNew = gradient(xNew);
            const y = this._sub(gNew, g);
            
            // DFP update
            const sTy = this._dot(s, y);
            if (sTy > 1e-10) {
                const Hy = this._matVec(H, y);
                const yTHy = this._dot(y, Hy);
                
                // H = H + (s * s') / (s' * y) - (Hy * Hy') / (y' * Hy)
                const ssT = this._outer(s, s);
                const HyyTH = this._outer(Hy, Hy);
                
                H = this._matAdd(H, this._matScale(ssT, 1 / sTy));
                H = this._matSub(H, this._matScale(HyyTH, 1 / yTHy));
            }
            
            x = xNew;
            g = gNew;
            
            history.push({
                x: this._clone(x),
                f: f(x),
                gradNorm: this._norm(g),
                alpha
            });
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            iterations: maxIter,
            history,
            method: 'DFP'
        };
    }
};