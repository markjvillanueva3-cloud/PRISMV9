/**
 * PRISM_CONSTRAINED_OPTIMIZER
 * Extracted from PRISM v8.89.002 monolith
 * References: 14
 * Lines: 477
 * Session: R2.3.1 Wave 2 Engine Gap Extraction
 */

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
}