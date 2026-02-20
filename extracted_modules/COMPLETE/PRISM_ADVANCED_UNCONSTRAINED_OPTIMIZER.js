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
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Broyden's Method (for systems of equations)
    // ─────────────────────────────────────────────────────────────────────────────
    
    broyden: function(config) {
        const {
            F,              // Vector function F(x) = 0
            x0,
            maxIter = 100,
            tol = 1e-8
        } = config;
        
        const n = x0.length;
        let x = this._clone(x0);
        let Fx = F(x);
        
        // Initialize Jacobian approximation as identity
        let J = this._identity(n);
        
        const history = [{ x: this._clone(x), residual: this._norm(Fx) }];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const residual = this._norm(Fx);
            
            if (residual < tol) {
                return {
                    x,
                    residual,
                    converged: true,
                    iterations: iter,
                    history,
                    method: 'Broyden'
                };
            }
            
            // Solve J * s = -F for Newton step
            const s = this._solveLinear(J, this._scale(Fx, -1));
            
            const xNew = this._add(x, s);
            const FxNew = F(xNew);
            const y = this._sub(FxNew, Fx);
            
            // Broyden update: J = J + ((y - J*s) * s') / (s' * s)
            const Js = this._matVec(J, s);
            const diff = this._sub(y, Js);
            const sTs = this._dot(s, s);
            
            if (sTs > 1e-12) {
                const update = this._outer(diff, s);
                J = this._matAdd(J, this._matScale(update, 1 / sTs));
            }
            
            x = xNew;
            Fx = FxNew;
            
            history.push({ x: this._clone(x), residual: this._norm(Fx) });
        }
        
        return {
            x,
            residual: this._norm(Fx),
            converged: false,
            iterations: maxIter,
            history,
            method: 'Broyden'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Line Search Methods
    // ─────────────────────────────────────────────────────────────────────────────
    
    _wolfeLineSearch: function(f, gradient, x, d, g, c1, c2, maxIter) {
        let alpha = 1;
        let alphaLo = 0;
        let alphaHi = Infinity;
        
        const fx = f(x);
        const gTd = this._dot(g, d);
        
        for (let i = 0; i < maxIter; i++) {
            const xNew = this._add(x, this._scale(d, alpha));
            const fNew = f(xNew);
            const gNew = gradient(xNew);
            
            // Armijo condition
            if (fNew > fx + c1 * alpha * gTd) {
                alphaHi = alpha;
                alpha = (alphaLo + alphaHi) / 2;
                continue;
            }
            
            // Curvature condition
            const gNewTd = this._dot(gNew, d);
            if (gNewTd < c2 * gTd) {
                alphaLo = alpha;
                alpha = alphaHi === Infinity ? 2 * alpha : (alphaLo + alphaHi) / 2;
                continue;
            }
            
            // Both conditions satisfied
            return { alpha, fNew, gNew };
        }
        
        // Return best found
        const xNew = this._add(x, this._scale(d, alpha));
        return { alpha, fNew: f(xNew), gNew: gradient(xNew) };
    },
    
    _backtrackingLineSearch: function(f, x, d, g, c = 0.0001, rho = 0.5) {
        let alpha = 1;
        const fx = f(x);
        const gTd = this._dot(g, d);
        
        for (let i = 0; i < 50; i++) {
            const xNew = this._add(x, this._scale(d, alpha));
            if (f(xNew) <= fx + c * alpha * gTd) {
                return alpha;
            }
            alpha *= rho;
        }
        
        return alpha;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Matrix Utilities
    // ─────────────────────────────────────────────────────────────────────────────
    
    _identity: function(n) {
        return Array(n).fill(null).map((_, i) => 
            Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
        );
    },
    
    _outer: function(a, b) {
        return a.map(ai => b.map(bj => ai * bj));
    },
    
    _matVec: function(A, x) {
        return A.map(row => this._dot(row, x));
    },
    
    _matAdd: function(A, B) {
        return A.map((row, i) => row.map((a, j) => a + B[i][j]));
    },
    
    _matSub: function(A, B) {
        return A.map((row, i) => row.map((a, j) => a - B[i][j]));
    },
    
    _matScale: function(A, s) {
        return A.map(row => row.map(a => a * s));
    },
    
    _solveLinear: function(A, b) {
        const n = b.length;
        const aug = A.map((row, i) => [...row, b[i]]);
        
        // Forward elimination with pivoting
        for (let i = 0; i < n; i++) {
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
            }
            [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
            
            if (Math.abs(aug[i][i]) < 1e-12) continue;
            
            for (let k = i + 1; k < n; k++) {
                const factor = aug[k][i] / aug[i][i];
                for (let j = i; j <= n; j++) {
                    aug[k][j] -= factor * aug[i][j];
                }
            }
        }
        
        // Back substitution
        const x = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = aug[i][n];
            for (let j = i + 1; j < n; j++) {
                x[i] -= aug[i][j] * x[j];
            }
            x[i] /= aug[i][i] || 1;
        }
        
        return x;
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('opt.lbfgs', 'PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.lbfgs');
            PRISM_GATEWAY.register('opt.steepestAdaptive', 'PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.steepestDescentAdaptive');
            PRISM_GATEWAY.register('opt.nlcg', 'PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.nonlinearCG');
            PRISM_GATEWAY.register('opt.sr1', 'PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.sr1');
            PRISM_GATEWAY.register('opt.dfp', 'PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.dfp');
            PRISM_GATEWAY.register('opt.broyden', 'PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.broyden');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 2: PRISM_TRUST_REGION_OPTIMIZER
// Trust Region Methods for Robust Optimization
// Source: MIT 15.084j, Conn-Gould-Toint
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_TRUST_REGION_OPTIMIZER = {
    name: 'PRISM_TRUST_REGION_OPTIMIZER',
    version: '1.0.0',
    description: 'Trust region methods: Cauchy Point, Dogleg, Steihaug-Toint CG',
    source: 'MIT 15.084j, Conn-Gould-Toint',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Cauchy Point Trust Region
    // ─────────────────────────────────────────────────────────────────────────────
    
    trustRegionCauchy: function(config) {
        const {
            f,
            gradient,
            hessian,
            x0,
            maxIter = 1000,
            tol = 1e-8,
            initialRadius = 1.0,
            maxRadius = 100.0,
            eta = 0.15
        } = config;
        
        let x = [...x0];
        let delta = initialRadius;
        const history = [];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const g = gradient(x);
            const gradNorm = this._norm(g);
            const fx = f(x);
            
            history.push({ x: [...x], f: fx, gradNorm, delta });
            
            if (gradNorm < tol) {
                return {
                    x,
                    f: fx,
                    converged: true,
                    iterations: iter,
                    history,
                    method: 'Trust Region (Cauchy Point)'
                };
            }
            
            const H = hessian(x);
            
            // Compute Cauchy point
            const gHg = this._quadForm(g, H, g);
            let tau;
            
            if (gHg <= 0) {
                tau = 1;
            } else {
                tau = Math.min(1, Math.pow(gradNorm, 3) / (delta * gHg));
            }
            
            const pC = this._scale(g, -tau * delta / gradNorm);
            
            // Compute actual vs predicted reduction
            const xNew = this._add(x, pC);
            const fNew = f(xNew);
            
            const actualReduction = fx - fNew;
            const predictedReduction = -this._dot(g, pC) - 0.5 * this._quadForm(pC, H, pC);
            
            const rho = predictedReduction !== 0 ? actualReduction / predictedReduction : 0;
            
            // Update trust region radius
            if (rho < 0.25) {
                delta *= 0.25;
            } else if (rho > 0.75 && Math.abs(this._norm(pC) - delta) < 1e-8) {
                delta = Math.min(2 * delta, maxRadius);
            }
            
            // Accept or reject step
            if (rho > eta) {
                x = xNew;
            }
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            iterations: maxIter,
            history,
            method: 'Trust Region (Cauchy Point)'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Dogleg Trust Region
    // ─────────────────────────────────────────────────────────────────────────────
    
    trustRegionDogleg: function(config) {
        const {
            f,
            gradient,
            hessian,
            x0,
            maxIter = 1000,
            tol = 1e-8,
            initialRadius = 1.0,
            maxRadius = 100.0,
            eta = 0.15
        } = config;
        
        let x = [...x0];
        let delta = initialRadius;
        const history = [];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const g = gradient(x);
            const gradNorm = this._norm(g);
            const fx = f(x);
            
            history.push({ x: [...x], f: fx, gradNorm, delta });
            
            if (gradNorm < tol) {
                return {
                    x,
                    f: fx,
                    converged: true,
                    iterations: iter,
                    history,
                    method: 'Trust Region (Dogleg)'
                };
            }
            
            const H = hessian(x);
            
            // Compute Newton step
            const pB = this._solveLinear(H, this._scale(g, -1));
            const pBNorm = this._norm(pB);
            
            // Compute Cauchy point
            const gHg = this._quadForm(g, H, g);
            const pU = this._scale(g, -gradNorm * gradNorm / gHg);
            const pUNorm = this._norm(pU);
            
            // Compute dogleg path
            let p;
            if (pBNorm <= delta) {
                // Newton step is inside trust region
                p = pB;
            } else if (pUNorm >= delta) {
                // Cauchy point is outside trust region
                p = this._scale(g, -delta / gradNorm);
            } else {
                // Interpolate between Cauchy and Newton
                const diff = this._sub(pB, pU);
                const a = this._dot(diff, diff);
                const b = 2 * this._dot(pU, diff);
                const c = this._dot(pU, pU) - delta * delta;
                
                const tau = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
                p = this._add(pU, this._scale(diff, tau));
            }
            
            // Compute actual vs predicted reduction
            const xNew = this._add(x, p);
            const fNew = f(xNew);
            
            const actualReduction = fx - fNew;
            const predictedReduction = -this._dot(g, p) - 0.5 * this._quadForm(p, H, p);
            
            const rho = predictedReduction !== 0 ? actualReduction / predictedReduction : 0;
            
            // Update trust region radius
            if (rho < 0.25) {
                delta *= 0.25;
            } else if (rho > 0.75 && Math.abs(this._norm(p) - delta) < 1e-8) {
                delta = Math.min(2 * delta, maxRadius);
            }
            
            // Accept or reject step
            if (rho > eta) {
                x = xNew;
            }
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            iterations: maxIter,
            history,
            method: 'Trust Region (Dogleg)'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Steihaug-Toint CG Trust Region
    // ─────────────────────────────────────────────────────────────────────────────
    
    trustRegionSteihaugCG: function(config) {
        const {
            f,
            gradient,
            hessian,
            x0,
            maxIter = 1000,
            tol = 1e-8,
            initialRadius = 1.0,
            maxRadius = 100.0,
            eta = 0.15,
            cgMaxIter = 100
        } = config;
        
        let x = [...x0];
        let delta = initialRadius;
        const history = [];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const g = gradient(x);
            const gradNorm = this._norm(g);
            const fx = f(x);
            
            history.push({ x: [...x], f: fx, gradNorm, delta });
            
            if (gradNorm < tol) {
                return {
                    x,
                    f: fx,
                    converged: true,
                    iterations: iter,
                    history,
                    method: 'Trust Region (Steihaug-CG)'
                };
            }
            
            const H = hessian(x);
            
            // Solve trust region subproblem using CG
            const p = this._steihaugCG(g, H, delta, gradNorm * 1e-3, cgMaxIter);
            
            // Compute actual vs predicted reduction
            const xNew = this._add(x, p);
            const fNew = f(xNew);
            
            const actualReduction = fx - fNew;
            const predictedReduction = -this._dot(g, p) - 0.5 * this._quadForm(p, H, p);
            
            const rho = predictedReduction !== 0 ? actualReduction / predictedReduction : 0;
            
            // Update trust region radius
            if (rho < 0.25) {
                delta *= 0.25;
            } else if (rho > 0.75 && Math.abs(this._norm(p) - delta) < 1e-8) {
                delta = Math.min(2 * delta, maxRadius);
            }
            
            // Accept or reject step
            if (rho > eta) {
                x = xNew;
            }
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            iterations: maxIter,
            history,
            method: 'Trust Region (Steihaug-CG)'
        };
    },
    
    _steihaugCG: function(g, H, delta, tol, maxIter) {
        const n = g.length;
        let z = new Array(n).fill(0);
        let r = [...g];
        let d = this._scale(g, -1);
        
        if (this._norm(r) < tol) {
            return z;
        }
        
        for (let j = 0; j < maxIter; j++) {
            const Hd = this._matVec(H, d);
            const dHd = this._dot(d, Hd);
            
            // Check for negative curvature
            if (dHd <= 0) {
                // Find tau such that ||z + tau*d|| = delta
                const tau = this._findBoundaryIntersection(z, d, delta);
                return this._add(z, this._scale(d, tau));
            }
            
            const alpha = this._dot(r, r) / dHd;
            const zNew = this._add(z, this._scale(d, alpha));
            
            // Check if we hit the boundary
            if (this._norm(zNew) >= delta) {
                const tau = this._findBoundaryIntersection(z, d, delta);
                return this._add(z, this._scale(d, tau));
            }
            
            z = zNew;
            const rNew = this._add(r, this._scale(Hd, alpha));
            
            if (this._norm(rNew) < tol) {
                return z;
            }
            
            const beta = this._dot(rNew, rNew) / this._dot(r, r);
            d = this._add(this._scale(rNew, -1), this._scale(d, beta));
            r = rNew;
        }
        
        return z;
    },
    
    _findBoundaryIntersection: function(z, d, delta) {
        const a = this._dot(d, d);
        const b = 2 * this._dot(z, d);
        const c = this._dot(z, z) - delta * delta;
        
        const discriminant = b * b - 4 * a * c;
        if (discriminant < 0) return 0;
        
        return (-b + Math.sqrt(discriminant)) / (2 * a);
    },
    
    // Helper functions
    _norm: function(v) {
        return Math.sqrt(v.reduce((sum, vi) => sum + vi * vi, 0));
    },
    
    _dot: function(a, b) {
        return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
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
    
    _matVec: function(A, x) {
        return A.map(row => this._dot(row, x));
    },
    
    _quadForm: function(x, A, y) {
        return this._dot(x, this._matVec(A, y));
    },
    
    _solveLinear: function(A, b) {
        return PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER._solveLinear(A, b);
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('opt.trustRegion.cauchy', 'PRISM_TRUST_REGION_OPTIMIZER.trustRegionCauchy');
            PRISM_GATEWAY.register('opt.trustRegion.dogleg', 'PRISM_TRUST_REGION_OPTIMIZER.trustRegionDogleg');
            PRISM_GATEWAY.register('opt.trustRegion.steihaugCG', 'PRISM_TRUST_REGION_OPTIMIZER.trustRegionSteihaugCG');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// REGISTER ALL PART 1 MODULES
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerSession3Part1() {
    PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.register();
    PRISM_TRUST_REGION_OPTIMIZER.register();
    
    console.log('[Session 3 Part 1] Registered 2 modules, 9 gateway routes');
    console.log('  - PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER: L-BFGS, Steepest, NLCG, SR1, DFP, Broyden');
    console.log('  - PRISM_TRUST_REGION_OPTIMIZER: Cauchy, Dogleg, Steihaug-CG');
}

// Auto-register
if (typeof window !== 'undefined') {
    window.PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER = PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER;
    window.PRISM_TRUST_REGION_OPTIMIZER = PRISM_TRUST_REGION_OPTIMIZER;
    registerSession3Part1();
}

console.log('[Session 3 Part 1] Advanced Unconstrained Optimization loaded - 2 modules');
/**
 * ╔═══════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PRISM SESSION 3: ULTIMATE OPTIMIZATION ENHANCEMENT - PART 2                              ║
 * ║ Constrained Optimization: Barrier, Augmented Lagrangian, SQP, Interior Point             ║
 * ║ Source: MIT 15.084j, MIT 6.251J, Boyd & Vandenberghe                                     ║
 * ║ Target: +1,200 lines | 2 Modules | 15+ Gateway Routes                                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 3: PRISM_CONSTRAINED_OPTIMIZER
// Penalty, Barrier, and Augmented Lagrangian Methods
// Source: MIT 15.084j, Boyd & Vandenberghe
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_CONSTRAINED_OPTIMIZER = {
    name: 'PRISM_CONSTRAINED_OPTIMIZER',
    version: '1.0.0',
    description: 'Constrained optimization: Penalty, Barrier, Augmented Lagrangian',
    source: 'MIT 15.084j, Boyd & Vandenberghe',
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Quadratic Penalty Method
    // ─────────────────────────────────────────────────────────────────────────────
    
    quadraticPenalty: function(config) {
        const {
            f,                    // Objective function
            gradient,             // Gradient of objective
            equalityConstraints = [],   // Array of h_i(x) = 0 functions
            inequalityConstraints = [], // Array of g_i(x) <= 0 functions
            x0,
            mu0 = 1,              // Initial penalty parameter
            muGrowth = 10,        // Growth factor for mu
            maxOuterIter = 50,
            maxInnerIter = 1000,
            outerTol = 1e-6,
            innerTol = 1e-8
        } = config;
        
        let x = [...x0];
        let mu = mu0;
        const history = [];
        
        for (let outer = 0; outer < maxOuterIter; outer++) {
            // Penalized objective
            const penalizedF = (x) => {
                let val = f(x);
                
                // Equality constraints: sum of h_i(x)^2
                for (const h of equalityConstraints) {
                    val += mu * Math.pow(h(x), 2);
                }
                
                // Inequality constraints: sum of max(0, g_i(x))^2
                for (const g of inequalityConstraints) {
                    val += mu * Math.pow(Math.max(0, g(x)), 2);
                }
                
                return val;
            };
            
            // Gradient of penalized objective (numerical)
            const penalizedGradient = (x) => {
                const eps = 1e-7;
                return x.map((_, i) => {
                    const xPlus = [...x];
                    const xMinus = [...x];
                    xPlus[i] += eps;
                    xMinus[i] -= eps;
                    return (penalizedF(xPlus) - penalizedF(xMinus)) / (2 * eps);
                });
            };
            
            // Solve unconstrained subproblem
            const result = PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.lbfgs({
                f: penalizedF,
                gradient: penalizedGradient,
                x0: x,
                maxIter: maxInnerIter,
                tol: innerTol
            });
            
            x = result.x;
            
            // Check constraint violation
            let maxViolation = 0;
            for (const h of equalityConstraints) {
                maxViolation = Math.max(maxViolation, Math.abs(h(x)));
            }
            for (const g of inequalityConstraints) {
                maxViolation = Math.max(maxViolation, Math.max(0, g(x)));
            }
            
            history.push({
                x: [...x],
                f: f(x),
                mu,
                maxViolation,
                innerIter: result.iterations
            });
            
            // Check convergence
            if (maxViolation < outerTol) {
                return {
                    x,
                    f: f(x),
                    converged: true,
                    outerIterations: outer + 1,
                    constraintViolation: maxViolation,
                    history,
                    method: 'Quadratic Penalty'
                };
            }
            
            // Increase penalty
            mu *= muGrowth;
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            outerIterations: maxOuterIter,
            history,
            method: 'Quadratic Penalty'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Log Barrier Method (Interior Point)
    // ─────────────────────────────────────────────────────────────────────────────
    
    logBarrier: function(config) {
        const {
            f,                    // Objective function
            gradient,             // Gradient of objective
            inequalityConstraints = [], // Array of g_i(x) <= 0 functions
            x0,
            t0 = 1,               // Initial barrier parameter
            tGrowth = 10,         // Growth factor for t
            maxOuterIter = 50,
            maxInnerIter = 100,
            outerTol = 1e-6,
            innerTol = 1e-8
        } = config;
        
        const m = inequalityConstraints.length;
        let x = [...x0];
        let t = t0;
        const history = [];
        
        // Verify initial point is strictly feasible
        for (let i = 0; i < m; i++) {
            if (inequalityConstraints[i](x) >= 0) {
                console.warn(`Initial point violates constraint ${i}`);
            }
        }
        
        for (let outer = 0; outer < maxOuterIter; outer++) {
            // Barrier function: f(x) - (1/t) * sum(log(-g_i(x)))
            const barrierF = (x) => {
                let val = t * f(x);
                
                for (const g of inequalityConstraints) {
                    const gi = g(x);
                    if (gi >= 0) return Infinity; // Infeasible
                    val -= Math.log(-gi);
                }
                
                return val;
            };
            
            // Gradient of barrier function (numerical)
            const barrierGradient = (x) => {
                const eps = 1e-7;
                return x.map((_, i) => {
                    const xPlus = [...x];
                    const xMinus = [...x];
                    xPlus[i] += eps;
                    xMinus[i] -= eps;
                    const fPlus = barrierF(xPlus);
                    const fMinus = barrierF(xMinus);
                    if (!isFinite(fPlus) || !isFinite(fMinus)) {
                        // One-sided difference
                        return (barrierF(xPlus) - barrierF(x)) / eps;
                    }
                    return (fPlus - fMinus) / (2 * eps);
                });
            };
            
            // Solve barrier subproblem
            const result = PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.lbfgs({
                f: barrierF,
                gradient: barrierGradient,
                x0: x,
                maxIter: maxInnerIter,
                tol: innerTol
            });
            
            x = result.x;
            
            // Duality gap
            const dualityGap = m / t;
            
            history.push({
                x: [...x],
                f: f(x),
                t,
                dualityGap,
                innerIter: result.iterations
            });
            
            // Check convergence
            if (dualityGap < outerTol) {
                return {
                    x,
                    f: f(x),
                    converged: true,
                    outerIterations: outer + 1,
                    dualityGap,
                    history,
                    method: 'Log Barrier'
                };
            }
            
            // Increase t
            t *= tGrowth;
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            outerIterations: maxOuterIter,
            history,
            method: 'Log Barrier'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Augmented Lagrangian Method (Method of Multipliers)
    // ─────────────────────────────────────────────────────────────────────────────
    
    augmentedLagrangian: function(config) {
        const {
            f,                    // Objective function
            gradient,             // Gradient of objective
            equalityConstraints = [],   // Array of h_i(x) = 0 functions
            inequalityConstraints = [], // Array of g_i(x) <= 0 functions
            x0,
            lambda0 = null,       // Initial Lagrange multipliers for equality
            mu0 = null,           // Initial Lagrange multipliers for inequality
            rho0 = 1,             // Initial penalty parameter
            rhoGrowth = 2,        // Growth factor for rho
            maxOuterIter = 50,
            maxInnerIter = 1000,
            outerTol = 1e-6,
            innerTol = 1e-8
        } = config;
        
        const nEq = equalityConstraints.length;
        const nIneq = inequalityConstraints.length;
        
        let x = [...x0];
        let lambda = lambda0 || new Array(nEq).fill(0);
        let mu = mu0 || new Array(nIneq).fill(0);
        let rho = rho0;
        
        const history = [];
        
        for (let outer = 0; outer < maxOuterIter; outer++) {
            // Augmented Lagrangian function
            const augLag = (x) => {
                let val = f(x);
                
                // Equality constraints
                for (let i = 0; i < nEq; i++) {
                    const hi = equalityConstraints[i](x);
                    val += lambda[i] * hi + (rho / 2) * hi * hi;
                }
                
                // Inequality constraints (using slack formulation)
                for (let i = 0; i < nIneq; i++) {
                    const gi = inequalityConstraints[i](x);
                    const term = Math.max(0, mu[i] + rho * gi);
                    val += (1 / (2 * rho)) * (term * term - mu[i] * mu[i]);
                }
                
                return val;
            };
            
            // Gradient of augmented Lagrangian (numerical)
            const augLagGradient = (x) => {
                const eps = 1e-7;
                return x.map((_, i) => {
                    const xPlus = [...x];
                    const xMinus = [...x];
                    xPlus[i] += eps;
                    xMinus[i] -= eps;
                    return (augLag(xPlus) - augLag(xMinus)) / (2 * eps);
                });
            };
            
            // Solve augmented Lagrangian subproblem
            const result = PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.lbfgs({
                f: augLag,
                gradient: augLagGradient,
                x0: x,
                maxIter: maxInnerIter,
                tol: innerTol
            });
            
            x = result.x;
            
            // Update multipliers
            for (let i = 0; i < nEq; i++) {
                lambda[i] += rho * equalityConstraints[i](x);
            }
            
            for (let i = 0; i < nIneq; i++) {
                mu[i] = Math.max(0, mu[i] + rho * inequalityConstraints[i](x));
            }
            
            // Check constraint violation
            let maxViolation = 0;
            for (let i = 0; i < nEq; i++) {
                maxViolation = Math.max(maxViolation, Math.abs(equalityConstraints[i](x)));
            }
            for (let i = 0; i < nIneq; i++) {
                maxViolation = Math.max(maxViolation, Math.max(0, inequalityConstraints[i](x)));
            }
            
            history.push({
                x: [...x],
                f: f(x),
                rho,
                maxViolation,
                lambda: [...lambda],
                mu: [...mu],
                innerIter: result.iterations
            });
            
            // Check convergence
            if (maxViolation < outerTol) {
                return {
                    x,
                    f: f(x),
                    converged: true,
                    outerIterations: outer + 1,
                    constraintViolation: maxViolation,
                    lambda,
                    mu,
                    history,
                    method: 'Augmented Lagrangian'
                };
            }
            
            // Increase penalty
            rho *= rhoGrowth;
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            outerIterations: maxOuterIter,
            lambda,
            mu,
            history,
            method: 'Augmented Lagrangian'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Projected Gradient Method (for box constraints)
    // ─────────────────────────────────────────────────────────────────────────────
    
    projectedGradient: function(config) {
        const {
            f,
            gradient,
            x0,
            lowerBounds,
            upperBounds,
            maxIter = 10000,
            tol = 1e-8,
            learningRate = 0.01,
            lineSearch = true
        } = config;
        
        const project = (x) => {
            return x.map((xi, i) => {
                let val = xi;
                if (lowerBounds && lowerBounds[i] !== undefined) {
                    val = Math.max(val, lowerBounds[i]);
                }
                if (upperBounds && upperBounds[i] !== undefined) {
                    val = Math.min(val, upperBounds[i]);
                }
                return val;
            });
        };
        
        let x = project([...x0]);
        const history = [];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const g = gradient(x);
            const gradNorm = this._norm(g);
            const fx = f(x);
            
            history.push({ x: [...x], f: fx, gradNorm });
            
            // Check convergence using projected gradient
            const xTest = project(this._sub(x, this._scale(g, 1)));
            const projGradNorm = this._norm(this._sub(x, xTest));
            
            if (projGradNorm < tol) {
                return {
                    x,
                    f: fx,
                    converged: true,
                    iterations: iter,
                    history,
                    method: 'Projected Gradient'
                };
            }
            
            // Line search or fixed step
            let alpha = learningRate;
            
            if (lineSearch) {
                // Backtracking line search with projection
                const c = 0.0001;
                for (let ls = 0; ls < 30; ls++) {
                    const xNew = project(this._sub(x, this._scale(g, alpha)));
                    if (f(xNew) <= fx + c * this._dot(g, this._sub(xNew, x))) {
                        x = xNew;
                        break;
                    }
                    alpha *= 0.5;
                }
            } else {
                x = project(this._sub(x, this._scale(g, alpha)));
            }
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            iterations: maxIter,
            history,
            method: 'Projected Gradient'
        };
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('opt.penalty.quadratic', 'PRISM_CONSTRAINED_OPTIMIZER.quadraticPenalty');
            PRISM_GATEWAY.register('opt.barrier.log', 'PRISM_CONSTRAINED_OPTIMIZER.logBarrier');
            PRISM_GATEWAY.register('opt.augmentedLagrangian', 'PRISM_CONSTRAINED_OPTIMIZER.augmentedLagrangian');
            PRISM_GATEWAY.register('opt.projectedGradient', 'PRISM_CONSTRAINED_OPTIMIZER.projectedGradient');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 4: PRISM_SQP_INTERIOR_POINT_ENGINE
// Sequential Quadratic Programming and Primal-Dual Interior Point
// Source: MIT 6.251J, Wright (IPM book)
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_SQP_INTERIOR_POINT_ENGINE = {
    name: 'PRISM_SQP_INTERIOR_POINT_ENGINE',
    version: '1.0.0',
    description: 'SQP and Interior Point methods for constrained optimization',
    source: 'MIT 6.251J, Wright',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Sequential Quadratic Programming (SQP)
    // ─────────────────────────────────────────────────────────────────────────────
    
    sqp: function(config) {
        const {
            f,
            gradient,
            hessianApprox = 'bfgs',
            equalityConstraints = [],
            inequalityConstraints = [],
            x0,
            maxIter = 100,
            tol = 1e-6
        } = config;
        
        const nEq = equalityConstraints.length;
        const nIneq = inequalityConstraints.length;
        const n = x0.length;
        
        let x = [...x0];
        let lambda = new Array(nEq).fill(0);
        let mu = new Array(nIneq).fill(1);
        
        // Initialize approximate Hessian
        let B = this._identity(n);
        
        const history = [];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const g = gradient(x);
            const fx = f(x);
            
            // Evaluate constraints
            const h = equalityConstraints.map(c => c(x));
            const gIneq = inequalityConstraints.map(c => c(x));
            
            // Check KKT conditions
            const kktViolation = this._computeKKTViolation(g, h, gIneq, lambda, mu, equalityConstraints, inequalityConstraints, x);
            
            history.push({ x: [...x], f: fx, kktViolation });
            
            if (kktViolation < tol) {
                return {
                    x,
                    f: fx,
                    converged: true,
                    iterations: iter,
                    lambda,
                    mu,
                    history,
                    method: 'SQP'
                };
            }
            
            // Solve QP subproblem
            // min 0.5 * d' * B * d + g' * d
            // s.t. Ae * d + h = 0 (equality)
            //      Ai * d + gIneq <= 0 (inequality)
            
            // Compute constraint Jacobians (numerical)
            const Ae = this._computeJacobian(equalityConstraints, x);
            const Ai = this._computeJacobian(inequalityConstraints, x);
            
            // Simplified QP solve using active set method
            const qpResult = this._solveQP(B, g, Ae, h, Ai, gIneq);
            
            if (!qpResult.success) {
                console.warn('QP subproblem failed');
                break;
            }
            
            const d = qpResult.d;
            const lambdaNew = qpResult.lambda;
            const muNew = qpResult.mu;
            
            // Line search with merit function
            const alpha = this._meritLineSearch(f, equalityConstraints, inequalityConstraints, x, d, g, rho);
            
            // BFGS update for B
            const xNew = this._add(x, this._scale(d, alpha));
            const gNew = gradient(xNew);
            
            const s = this._scale(d, alpha);
            const y = this._sub(gNew, g);
            
            // Damped BFGS update
            B = this._dampedBFGSUpdate(B, s, y);
            
            // Update
            x = xNew;
            lambda = lambdaNew;
            mu = muNew.map(m => Math.max(0, m));
        }
        
        return {
            x,
            f: f(x),
            converged: false,
            iterations: maxIter,
            history,
            method: 'SQP'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Primal-Dual Interior Point Method
    // ─────────────────────────────────────────────────────────────────────────────
    
    primalDualInteriorPoint: function(config) {
        const {
            c,                    // Linear objective coefficients
            A,                    // Inequality constraint matrix (Ax <= b)
            b,                    // Inequality constraint RHS
            Aeq = null,           // Equality constraint matrix
            beq = null,           // Equality RHS
            x0 = null,
            maxIter = 100,
            tol = 1e-8
        } = config;
        
        const m = A.length;      // Number of inequalities
        const n = c.length;      // Number of variables
        const mEq = Aeq ? Aeq.length : 0;
        
        // Initialize
        let x = x0 || new Array(n).fill(1);
        let s = new Array(m).fill(1);  // Slack variables
        let lambda = new Array(m).fill(1); // Dual variables for inequality
        let nu = mEq > 0 ? new Array(mEq).fill(0) : []; // Dual for equality
        
        const history = [];
        
        for (let iter = 0; iter < maxIter; iter++) {
            // Residuals
            const Ax = this._matVec(A, x);
            const rp = Ax.map((ai, i) => ai + s[i] - b[i]); // Primal residual
            const rd = this._add(c, this._matVec(this._transpose(A), lambda)); // Dual residual
            if (Aeq) {
                const rdEq = this._matVec(this._transpose(Aeq), nu);
                for (let i = 0; i < n; i++) rd[i] += rdEq[i];
            }
            const rc = s.map((si, i) => si * lambda[i]); // Complementarity
            
            const rpNorm = this._norm(rp);
            const rdNorm = this._norm(rd);
            const mu = rc.reduce((a, b) => a + b, 0) / m; // Duality measure
            
            history.push({
                x: [...x],
                objective: this._dot(c, x),
                rpNorm,
                rdNorm,
                mu
            });
            
            // Check convergence
            if (rpNorm < tol && rdNorm < tol && mu < tol) {
                return {
                    x,
                    objective: this._dot(c, x),
                    converged: true,
                    iterations: iter,
                    lambda,
                    history,
                    method: 'Primal-Dual Interior Point'
                };
            }
            
            // Centering parameter
            const sigma = 0.1;
            const muTarget = sigma * mu;
            
            // Solve Newton system
            // [0  A'  Aeq'] [dx]    [-rd]
            // [A  0   0   ] [ds]  = [-rp]
            // [S  Lambda 0] [dlam]  [-rc + muTarget*e]
            
            // Simplified: solve using Schur complement
            const { dx, ds, dlambda } = this._solveIPMSystem(
                A, Aeq, s, lambda, rd, rp, rc, muTarget
            );
            
            // Line search to maintain positivity
            let alphaP = 1;
            let alphaD = 1;
            const tau = 0.995;
            
            for (let i = 0; i < m; i++) {
                if (ds[i] < 0) {
                    alphaP = Math.min(alphaP, -tau * s[i] / ds[i]);
                }
                if (dlambda[i] < 0) {
                    alphaD = Math.min(alphaD, -tau * lambda[i] / dlambda[i]);
                }
            }
            
            // Update
            x = this._add(x, this._scale(dx, alphaP));
            s = this._add(s, this._scale(ds, alphaP));
            lambda = this._add(lambda, this._scale(dlambda, alphaD));
        }
        
        return {
            x,
            objective: this._dot(c, x),
            converged: false,
            iterations: maxIter,
            history,
            method: 'Primal-Dual Interior Point'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Linear Programming (Simplex-like for small problems)
    // ─────────────────────────────────────────────────────────────────────────────
    
    linearProgramming: function(config) {
        const {
            c,        // Objective: min c'x
            A,        // Inequality constraints: Ax <= b
            b,
            Aeq = null,
            beq = null,
            bounds = null, // [[lb, ub], ...]
            method = 'interior_point'
        }