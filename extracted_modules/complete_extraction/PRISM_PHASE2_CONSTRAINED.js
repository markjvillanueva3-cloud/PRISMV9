const PRISM_PHASE2_CONSTRAINED = {
    name: 'Phase 2 Constrained Optimization',
    version: '1.0.0',
    source: 'MIT 6.251J, MIT 15.084',
    
    /**
     * Interior Point Method (Log Barrier)
     * Source: MIT 6.251J - Mathematical Programming
     */
    interiorPoint: function(f, constraints, x0, options = {}) {
        const config = {
            maxIter: options.maxIter || 100,
            mu: options.mu || 10,          // Barrier parameter multiplier
            tol: options.tol || 1e-6,
            t0: options.t0 || 1            // Initial barrier parameter
        };
        
        let x = [...x0];
        let t = config.t0;
        
        const barrierGradient = (x, t) => {
            const grad = this._numericalGradient(y => f(y), x);
            
            for (const g of constraints) {
                const gVal = g(x);
                if (gVal >= 0) return null; // Infeasible
                
                const gGrad = this._numericalGradient(g, x);
                for (let i = 0; i < grad.length; i++) {
                    grad[i] -= (1 / (t * gVal)) * gGrad[i];
                }
            }
            
            return grad;
        };
        
        for (let iter = 0; iter < config.maxIter; iter++) {
            // Newton step on barrier problem
            for (let inner = 0; inner < 20; inner++) {
                const grad = barrierGradient(x, t);
                if (!grad) {
                    // Backtrack to feasible region
                    for (let i = 0; i < x.length; i++) {
                        x[i] = x0[i] + 0.5 * (x[i] - x0[i]);
                    }
                    continue;
                }
                
                const gradNorm = Math.sqrt(grad.reduce((s, g) => s + g*g, 0));
                if (gradNorm < config.tol) break;
                
                // Gradient descent step
                const alpha = 0.01 / (1 + iter);
                for (let i = 0; i < x.length; i++) {
                    x[i] -= alpha * grad[i];
                }
            }
            
            // Check duality gap
            const m = constraints.length;
            if (m / t < config.tol) {
                return {
                    optimal: x,
                    value: f(x),
                    iterations: iter,
                    converged: true,
                    source: 'MIT 6.251J - Interior Point'
                };
            }
            
            t *= config.mu;
        }
        
        return {
            optimal: x,
            value: f(x),
            iterations: config.maxIter,
            converged: false,
            source: 'MIT 6.251J - Interior Point'
        };
    },
    
    /**
     * Barrier Method
     */
    barrierMethod: function(f, constraints, x0, options = {}) {
        return this.interiorPoint(f, constraints, x0, options);
    },
    
    /**
     * Augmented Lagrangian Method
     * Source: MIT 6.251J
     */
    augmentedLagrangian: function(f, equalityConstraints, inequalityConstraints, x0, options = {}) {
        const config = {
            maxIter: options.maxIter || 50,
            rho: options.rho || 1,           // Penalty parameter
            rhoMax: options.rhoMax || 1e6,
            innerIter: options.innerIter || 50,
            tol: options.tol || 1e-6
        };
        
        let x = [...x0];
        let lambda = new Array(equalityConstraints.length).fill(0);
        let mu = new Array(inequalityConstraints.length).fill(0);
        let rho = config.rho;
        
        for (let iter = 0; iter < config.maxIter; iter++) {
            // Minimize augmented Lagrangian
            const augLagrangian = (y) => {
                let L = f(y);
                
                // Equality constraints
                for (let i = 0; i < equalityConstraints.length; i++) {
                    const h = equalityConstraints[i](y);
                    L += lambda[i] * h + (rho / 2) * h * h;
                }
                
                // Inequality constraints (with slack)
                for (let i = 0; i < inequalityConstraints.length; i++) {
                    const g = inequalityConstraints[i](y);
                    const term = Math.max(0, mu[i] + rho * g);
                    L += (term * term - mu[i] * mu[i]) / (2 * rho);
                }
                
                return L;
            };
            
            // Inner optimization (gradient descent)
            for (let inner = 0; inner < config.innerIter; inner++) {
                const grad = this._numericalGradient(augLagrangian, x);
                const gradNorm = Math.sqrt(grad.reduce((s, g) => s + g*g, 0));
                
                if (gradNorm < config.tol) break;
                
                const alpha = 0.01;
                for (let i = 0; i < x.length; i++) {
                    x[i] -= alpha * grad[i];
                }
            }
            
            // Update multipliers
            for (let i = 0; i < equalityConstraints.length; i++) {
                lambda[i] += rho * equalityConstraints[i](x);
            }
            
            for (let i = 0; i < inequalityConstraints.length; i++) {
                mu[i] = Math.max(0, mu[i] + rho * inequalityConstraints[i](x));
            }
            
            // Check convergence
            let maxViolation = 0;
            for (const h of equalityConstraints) {
                maxViolation = Math.max(maxViolation, Math.abs(h(x)));
            }
            for (const g of inequalityConstraints) {
                maxViolation = Math.max(maxViolation, Math.max(0, g(x)));
            }
            
            if (maxViolation < config.tol) {
                return {
                    optimal: x,
                    value: f(x),
                    lambda,
                    mu,
                    iterations: iter,
                    converged: true,
                    source: 'MIT 6.251J - Augmented Lagrangian'
                };
            }
            
            // Increase penalty
            rho = Math.min(rho * 2, config.rhoMax);
        }
        
        return {
            optimal: x,
            value: f(x),
            lambda,
            mu,
            iterations: config.maxIter,
            converged: false,
            source: 'MIT 6.251J - Augmented Lagrangian'
        };
    },
    
    /**
     * Sequential Quadratic Programming (SQP)
     * Source: MIT 6.251J
     */
    sqp: function(f, equalityConstraints, inequalityConstraints, x0, options = {}) {
        const config = {
            maxIter: options.maxIter || 100,
            tol: options.tol || 1e-6
        };
        
        let x = [...x0];
        const n = x.length;
        let B = []; // Approximate Hessian
        for (let i = 0; i < n; i++) {
            B[i] = new Array(n).fill(0);
            B[i][i] = 1;
        }
        
        for (let iter = 0; iter < config.maxIter; iter++) {
            const grad = this._numericalGradient(f, x);
            
            // Solve QP subproblem (simplified)
            const p = grad.map(g => -g * 0.1);
            
            // Line search
            let alpha = 1;
            const c1 = 1e-4;
            const fx = f(x);
            
            for (let ls = 0; ls < 20; ls++) {
                const xNew = x.map((xi, i) => xi + alpha * p[i]);
                
                let feasible = true;
                for (const g of inequalityConstraints) {
                    if (g(xNew) > 0) feasible = false;
                }
                
                if (feasible && f(xNew) < fx + c1 * alpha * grad.reduce((s, g, i) => s + g * p[i], 0)) {
                    break;
                }
                
                alpha *= 0.5;
            }
            
            // Update
            const xNew = x.map((xi, i) => xi + alpha * p[i]);
            
            // Check convergence
            const gradNorm = Math.sqrt(grad.reduce((s, g) => s + g*g, 0));
            if (gradNorm < config.tol) {
                return {
                    optimal: xNew,
                    value: f(xNew),
                    iterations: iter,
                    converged: true,
                    source: 'MIT 6.251J - SQP'
                };
            }
            
            x = xNew;
        }
        
        return {
            optimal: x,
            value: f(x),
            iterations: config.maxIter,
            converged: false,
            source: 'MIT 6.251J - SQP'
        };
    },
    
    /**
     * Penalty Method
     */
    penaltyMethod: function(f, constraints, x0, options = {}) {
        const config = {
            maxIter: options.maxIter || 50,
            rho: options.rho || 1,
            rhoMax: options.rhoMax || 1e8
        };
        
        let x = [...x0];
        let rho = config.rho;
        
        for (let iter = 0; iter < config.maxIter; iter++) {
            // Penalized objective
            const penalized = (y) => {
                let val = f(y);
                for (const g of constraints) {
                    const gVal = g(y);
                    if (gVal > 0) {
                        val += rho * gVal * gVal;
                    }
                }
                return val;
            };
            
            // Minimize penalized problem (gradient descent)
            for (let inner = 0; inner < 100; inner++) {
                const grad = this._numericalGradient(penalized, x);
                const gradNorm = Math.sqrt(grad.reduce((s, g) => s + g*g, 0));
                if (gradNorm < 1e-6) break;
                
                const alpha = 0.01;
                for (let i = 0; i < x.length; i++) {
                    x[i] -= alpha * grad[i];
                }
            }
            
            // Check feasibility
            let maxViolation = 0;
            for (const g of constraints) {
                maxViolation = Math.max(maxViolation, Math.max(0, g(x)));
            }
            
            if (maxViolation < 1e-6) {
                return {
                    optimal: x,
                    value: f(x),
                    iterations: iter,
                    converged: true,
                    source: 'MIT 6.251J - Penalty Method'
                };
            }
            
            rho = Math.min(rho * 10, config.rhoMax);
        }
        
        return {
            optimal: x,
            value: f(x),
            iterations: config.maxIter,
            converged: false,
            source: 'MIT 6.251J - Penalty Method'
        };
    },
    
    _numericalGradient: function(f, x, h = 1e-6) {
        const n = x.length;
        const grad = new Array(n);
        
        for (let i = 0; i < n; i++) {
            const xPlus = [...x];
            const xMinus = [...x];
            xPlus[i] += h;
            xMinus[i] -= h;
            grad[i] = (f(xPlus) - f(xMinus)) / (2 * h);
        }
        
        return grad;
    }
}