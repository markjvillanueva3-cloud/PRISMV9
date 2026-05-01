const PRISM_UNCONSTRAINED_OPTIMIZATION = {
    name: 'PRISM_UNCONSTRAINED_OPTIMIZATION',
    version: '1.0.0',
    source: 'MIT 6.251J - Mathematical Programming',
    
    // Linear Algebra Helpers
    _dot: function(a, b) {
        return a.reduce((sum, ai, i) => sum + ai * (b[i] || 0), 0);
    },
    
    _norm: function(v) {
        return Math.sqrt(v.reduce((sum, vi) => sum + vi * vi, 0));
    },
    
    _scale: function(v, s) {
        return v.map(vi => vi * s);
    },
    
    _add: function(a, b) {
        return a.map((ai, i) => ai + (b[i] || 0));
    },
    
    _sub: function(a, b) {
        return a.map((ai, i) => ai - (b[i] || 0));
    },
    
    _outerProduct: function(a, b) {
        return a.map(ai => b.map(bj => ai * bj));
    },
    
    _matVec: function(A, x) {
        return A.map(row => this._dot(row, x));
    },
    
    /**
     * L-BFGS (Limited-memory BFGS)
     * Memory-efficient quasi-Newton for large-scale problems
     * Source: MIT 6.251J - Optimization Methods
     */
    lbfgs: function(config) {
        const {
            f,              // Objective function
            gradient,       // Gradient function
            x0,             // Initial point
            m = 10,         // Memory size (number of corrections to store)
            maxIter = 1000,
            tol = 1e-8,
            c1 = 1e-4,      // Armijo condition parameter
            c2 = 0.9        // Wolfe condition parameter
        } = config;
        
        const n = x0.length;
        let x = [...x0];
        let g = gradient(x);
        
        // Storage for limited memory
        const s_list = [];  // s_k = x_{k+1} - x_k
        const y_list = [];  // y_k = g_{k+1} - g_k
        const rho_list = []; // rho_k = 1 / (y_k' s_k)
        
        const history = [{ x: [...x], f: f(x), gradNorm: this._norm(g) }];
        
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
            
            // Two-loop recursion to compute search direction
            const d = this._lbfgsTwoLoop(g, s_list, y_list, rho_list);
            
            // Line search with Wolfe conditions
            const { alpha, x_new, g_new } = this._wolfeLineSearch(f, gradient, x, d, g, c1, c2);
            
            if (alpha === 0) {
                return { x, f: f(x), converged: false, iterations: iter, reason: 'Line search failed', history };
            }
            
            // Update storage
            const s = this._sub(x_new, x);
            const y = this._sub(g_new, g);
            const ys = this._dot(y, s);
            
            if (ys > 1e-10) {  // Curvature condition
                if (s_list.length >= m) {
                    s_list.shift();
                    y_list.shift();
                    rho_list.shift();
                }
                s_list.push(s);
                y_list.push(y);
                rho_list.push(1 / ys);
            }
            
            x = x_new;
            g = g_new;
            history.push({ x: [...x], f: f(x), gradNorm: this._norm(g), alpha });
        }
        
        return { x, f: f(x), converged: false, iterations: maxIter, history, method: 'L-BFGS' };
    },
    
    _lbfgsTwoLoop: function(g, s_list, y_list, rho_list) {
        const m = s_list.length;
        let q = [...g];
        const alpha = [];
        
        // First loop (backward)
        for (let i = m - 1; i >= 0; i--) {
            alpha[i] = rho_list[i] * this._dot(s_list[i], q);
            q = this._sub(q, this._scale(y_list[i], alpha[i]));
        }
        
        // Initial Hessian approximation (scaled identity)
        let gamma = 1;
        if (m > 0) {
            gamma = this._dot(s_list[m-1], y_list[m-1]) / this._dot(y_list[m-1], y_list[m-1]);
        }
        let r = this._scale(q, gamma);
        
        // Second loop (forward)
        for (let i = 0; i < m; i++) {
            const beta = rho_list[i] * this._dot(y_list[i], r);
            r = this._add(r, this._scale(s_list[i], alpha[i] - beta));
        }
        
        // Negate for descent direction
        return this._scale(r, -1);
    },
    
    _wolfeLineSearch: function(f, gradient, x, d, g, c1, c2, maxIter = 20) {
        let alpha = 1;
        const fx = f(x);
        const gd = this._dot(g, d);
        
        for (let i = 0; i < maxIter; i++) {
            const x_new = this._add(x, this._scale(d, alpha));
            const fx_new = f(x_new);
            
            // Armijo condition
            if (fx_new > fx + c1 * alpha * gd) {
                alpha *= 0.5;
                continue;
            }
            
            const g_new = gradient(x_new);
            
            // Curvature condition (weak Wolfe)
            if (this._dot(g_new, d) < c2 * gd) {
                alpha *= 2;
                if (alpha > 100) break;
                continue;
            }
            
            return { alpha, x_new, g_new };
        }
        
        // Return best found
        const x_new = this._add(x, this._scale(d, alpha));
        return { alpha, x_new, g_new: gradient(x_new) };
    },
    
    /**
     * Trust Region Method (Dogleg)
     * Source: MIT 6.251J - Nonlinear Optimization
     */
    trustRegion: function(config) {
        const {
            f,              // Objective function
            gradient,       // Gradient function
            hessian,        // Hessian function
            x0,
            initialRadius = 1.0,
            maxRadius = 10.0,
            eta = 0.1,      // Acceptance threshold
            maxIter = 100,
            tol = 1e-8
        } = config;
        
        let x = [...x0];
        let radius = initialRadius;
        const history = [{ x: [...x], f: f(x), radius }];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const g = gradient(x);
            const gradNorm = this._norm(g);
            
            if (gradNorm < tol) {
                return { x, f: f(x), converged: true, iterations: iter, history, method: 'Trust Region' };
            }
            
            const H = hessian(x);
            const fx = f(x);
            
            // Compute dogleg step
            const p = this._doglegStep(g, H, radius);
            const x_new = this._add(x, p);
            const fx_new = f(x_new);
            
            // Compute actual vs predicted reduction
            const actualReduction = fx - fx_new;
            const predictedReduction = -(this._dot(g, p) + 0.5 * this._dot(p, this._matVec(H, p)));
            const rho = predictedReduction > 0 ? actualReduction / predictedReduction : 0;
            
            // Update trust region radius
            if (rho < 0.25) {
                radius *= 0.25;
            } else if (rho > 0.75 && Math.abs(this._norm(p) - radius) < 1e-10) {
                radius = Math.min(2 * radius, maxRadius);
            }
            
            // Accept or reject step
            if (rho > eta) {
                x = x_new;
            }
            
            history.push({ x: [...x], f: f(x), radius, rho, stepNorm: this._norm(p) });
        }
        
        return { x, f: f(x), converged: false, iterations: maxIter, history, method: 'Trust Region' };
    },
    
    _doglegStep: function(g, H, radius) {
        const n = g.length;
        
        // Compute Cauchy point (steepest descent direction)
        const gHg = this._dot(g, this._matVec(H, g));
        let tau_c = gHg > 0 ? this._norm(g) ** 2 / gHg : 1;
        const p_c = this._scale(g, -tau_c);
        
        // If Cauchy point outside trust region, return scaled Cauchy
        const p_c_norm = this._norm(p_c);
        if (p_c_norm >= radius) {
            return this._scale(g, -radius / this._norm(g));
        }
        
        // Compute Newton point
        const p_n = this._solveLinear(H, this._scale(g, -1));
        const p_n_norm = this._norm(p_n);
        
        // If Newton point inside trust region, return Newton
        if (p_n_norm <= radius) {
            return p_n;
        }
        
        // Dogleg: interpolate between Cauchy and Newton
        const d = this._sub(p_n, p_c);
        const a = this._dot(d, d);
        const b = 2 * this._dot(p_c, d);
        const c = this._dot(p_c, p_c) - radius * radius;
        const discriminant = b * b - 4 * a * c;
        const tau = (-b + Math.sqrt(Math.max(0, discriminant))) / (2 * a);
        
        return this._add(p_c, this._scale(d, Math.min(1, Math.max(0, tau))));
    },
    
    _solveLinear: function(A, b) {
        const n = b.length;
        const aug = A.map((row, i) => [...row, b[i]]);
        
        // Gaussian elimination with partial pivoting
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
    
    /**
     * Conjugate Gradient (Polak-Ribière variant)
     * Source: MIT 6.251J
     */
    conjugateGradient: function(config) {
        const {
            f,
            gradient,
            x0,
            maxIter = 1000,
            tol = 1e-8,
            restartInterval = null  // Restart every n iterations (null = n)
        } = config;
        
        const n = x0.length;
        const restart = restartInterval || n;
        
        let x = [...x0];
        let g = gradient(x);
        let d = this._scale(g, -1);  // Initial direction = -gradient
        
        const history = [{ x: [...x], f: f(x), gradNorm: this._norm(g) }];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const gradNorm = this._norm(g);
            
            if (gradNorm < tol) {
                return { x, f: f(x), converged: true, iterations: iter, history, method: 'Conjugate Gradient' };
            }
            
            // Line search
            const alpha = this._backtrackingLineSearch(f, gradient, x, d, g);
            const x_new = this._add(x, this._scale(d, alpha));
            const g_new = gradient(x_new);
            
            // Polak-Ribière beta
            const g_diff = this._sub(g_new, g);
            let beta = this._dot(g_new, g_diff) / this._dot(g, g);
            beta = Math.max(0, beta);  // Reset to steepest descent if beta < 0
            
            // Restart periodically
            if ((iter + 1) % restart === 0) {
                beta = 0;
            }
            
            // Update direction
            d = this._add(this._scale(g_new, -1), this._scale(d, beta));
            
            x = x_new;
            g = g_new;
            history.push({ x: [...x], f: f(x), gradNorm: this._norm(g), alpha, beta });
        }
        
        return { x, f: f(x), converged: false, iterations: maxIter, history, method: 'Conjugate Gradient' };
    },
    
    _backtrackingLineSearch: function(f, gradient, x, d, g, c1 = 1e-4, rho = 0.5) {
        let alpha = 1;
        const fx = f(x);
        const gd = this._dot(g, d);
        
        for (let i = 0; i < 50; i++) {
            const x_new = this._add(x, this._scale(d, alpha));
            if (f(x_new) <= fx + c1 * alpha * gd) {
                return alpha;
            }
            alpha *= rho;
        }
        
        return alpha;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: CONSTRAINED OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_CONSTRAINED_OPTIMIZATION_ENHANCED = {
    name: 'PRISM_CONSTRAINED_OPTIMIZATION_ENHANCED',
    version: '1.0.0',
    source: 'MIT 15.084j - Nonlinear Programming',
    
    /**
     * Augmented Lagrangian Method
     * Handles both equality and inequality constraints
     * Source: MIT 15.084j Lecture 13
     */
    augmentedLagrangian: function(config) {
        const {
            f,                    // Objective function
            gradient,             // Gradient of f
            equalityConstraints = [],  // h_i(x) = 0
            inequalityConstraints = [], // g_j(x) <= 0
            x0,
            rho0 = 1,             // Initial penalty parameter
            rhoMax = 1e6,
            rhoGrowth = 2,
            maxOuterIter = 50,
            maxInnerIter = 100,
            tol = 1e-6
        } = config;
        
        const nEq = equalityConstraints.length;
        const nIneq = inequalityConstraints.length;
        
        let x = [...x0];
        let lambda = new Array(nEq).fill(0);    // Equality multipliers
        let mu = new Array(nIneq).fill(0);      // Inequality multipliers
        let rho = rho0;
        
        const history = [];
        
        for (let outer = 0; outer < maxOuterIter; outer++) {
            // Define augmented Lagrangian
            const L_aug = (x) => {
                let val = f(x);
                
                // Equality constraints: L += lambda'h + (rho/2)||h||^2
                for (let i = 0; i < nEq; i++) {
                    const h = equalityConstraints[i](x);
                    val += lambda[i] * h + (rho / 2) * h * h;
                }
                
                // Inequality constraints with slack
                for (let j = 0; j < nIneq; j++) {
                    const g = inequalityConstraints[j](x);
                    const muRho = mu[j] + rho * g;
                    if (muRho > 0) {
                        val += muRho * muRho / (2 * rho) - mu[j] * mu[j] / (2 * rho);
                    }
                }
                
                return val;
            };
            
            // Gradient of augmented Lagrangian
            const gradL = (x) => {
                const grad = gradient(x);
                const eps = 1e-8;
                
                for (let i = 0; i < nEq; i++) {
                    const h = equalityConstraints[i](x);
                    // Numerical gradient of h
                    for (let k = 0; k < x.length; k++) {
                        const x_plus = [...x]; x_plus[k] += eps;
                        const x_minus = [...x]; x_minus[k] -= eps;
                        const dh = (equalityConstraints[i](x_plus) - equalityConstraints[i](x_minus)) / (2 * eps);
                        grad[k] += (lambda[i] + rho * h) * dh;
                    }
                }
                
                for (let j = 0; j < nIneq; j++) {
                    const g = inequalityConstraints[j](x);
                    const muRho = mu[j] + rho * g;
                    if (muRho > 0) {
                        for (let k = 0; k < x.length; k++) {
                            const x_plus = [...x]; x_plus[k] += eps;
                            const x_minus = [...x]; x_minus[k] -= eps;
                            const dg = (inequalityConstraints[j](x_plus) - inequalityConstraints[j](x_minus)) / (2 * eps);
                            grad[k] += muRho * dg;
                        }
                    }
                }
                
                return grad;
            };
            
            // Minimize augmented Lagrangian using L-BFGS
            const result = PRISM_UNCONSTRAINED_OPTIMIZATION.lbfgs({
                f: L_aug,
                gradient: gradL,
                x0: x,
                maxIter: maxInnerIter,
                tol: tol / 10
            });
            
            x = result.x;
            
            // Compute constraint violations
            let maxViolation = 0;
            const hVals = equalityConstraints.map(h => h(x));
            const gVals = inequalityConstraints.map(g => g(x));
            
            for (const h of hVals) maxViolation = Math.max(maxViolation, Math.abs(h));
            for (const g of gVals) maxViolation = Math.max(maxViolation, Math.max(0, g));
            
            history.push({
                outer,
                x: [...x],
                f: f(x),
                maxViolation,
                rho,
                lambda: [...lambda],
                mu: [...mu]
            });
            
            // Check convergence
            if (maxViolation < tol) {
                return {
                    x,
                    f: f(x),
                    converged: true,
                    outerIterations: outer + 1,
                    lambda,
                    mu,
                    history,
                    method: 'Augmented Lagrangian'
                };
            }
            
            // Update multipliers
            for (let i = 0; i < nEq; i++) {
                lambda[i] += rho * hVals[i];
            }
            for (let j = 0; j < nIneq; j++) {
                mu[j] = Math.max(0, mu[j] + rho * gVals[j]);
            }
            
            // Increase penalty
            rho = Math.min(rhoMax, rho * rhoGrowth);
        }