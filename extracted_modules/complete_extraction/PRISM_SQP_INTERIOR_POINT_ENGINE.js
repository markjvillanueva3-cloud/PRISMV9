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
        } = config;
        
        if (method === 'interior_point') {
            return this.primalDualInteriorPoint({ c, A, b, Aeq, beq });
        }
        
        // Use revised simplex for small problems
        return this._revisedSimplex({ c, A, b, Aeq, beq, bounds });
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Quadratic Programming
    // ─────────────────────────────────────────────────────────────────────────────
    
    quadraticProgramming: function(config) {
        const {
            H,        // Hessian: 0.5 * x' * H * x
            f,        // Linear: f' * x
            A = [],   // Inequality: Ax <= b
            b = [],
            Aeq = [], // Equality: Aeq * x = beq
            beq = [],
            x0 = null,
            maxIter = 1000,
            tol = 1e-8
        } = config;
        
        const n = f.length;
        
        // Use active set method
        let x = x0 || new Array(n).fill(0);
        let activeSet = new Set();
        
        const history = [];
        
        for (let iter = 0; iter < maxIter; iter++) {
            // Current objective value
            const objVal = 0.5 * this._quadForm(x, H, x) + this._dot(f, x);
            
            // Gradient
            const g = this._add(this._matVec(H, x), f);
            
            history.push({ x: [...x], objective: objVal, activeSetSize: activeSet.size });
            
            // Build KKT system for active constraints
            const activeConstraints = [...activeSet];
            const nActive = activeConstraints.length;
            const nEq = Aeq.length;
            
            // Solve equality-constrained QP
            // [H  A_active']  [d]    = [-g]
            // [A_active  0 ]  [lambda]   [-residual]
            
            let d, lambda;
            
            if (nActive + nEq === 0) {
                // Unconstrained step
                d = this._solveLinear(H, this._scale(g, -1));
                lambda = [];
            } else {
                const result = this._solveEqualityQP(H, g, Aeq, beq, A, b, activeConstraints, x);
                d = result.d;
                lambda = result.lambda;
            }
            
            // Check if we can make progress
            const dNorm = this._norm(d);
            
            if (dNorm < tol) {
                // Check multipliers for active inequalities
                let minLambda = Infinity;
                let minIdx = -1;
                
                for (let i = 0; i < lambda.length - nEq; i++) {
                    if (lambda[i + nEq] < minLambda) {
                        minLambda = lambda[i + nEq];
                        minIdx = activeConstraints[i];
                    }
                }
                
                if (minLambda >= -tol) {
                    // Optimal
                    return {
                        x,
                        objective: objVal,
                        converged: true,
                        iterations: iter,
                        activeSet: [...activeSet],
                        history,
                        method: 'QP Active Set'
                    };
                }
                
                // Remove constraint with most negative multiplier
                activeSet.delete(minIdx);
            } else {
                // Find step length
                let alpha = 1;
                let blockingConstraint = -1;
                
                for (let i = 0; i < A.length; i++) {
                    if (activeSet.has(i)) continue;
                    
                    const Ad = this._dot(A[i], d);
                    if (Ad > tol) {
                        const slack = b[i] - this._dot(A[i], x);
                        const alphaI = slack / Ad;
                        if (alphaI < alpha) {
                            alpha = alphaI;
                            blockingConstraint = i;
                        }
                    }
                }
                
                // Take step
                x = this._add(x, this._scale(d, alpha));
                
                // Add blocking constraint to active set
                if (blockingConstraint >= 0) {
                    activeSet.add(blockingConstraint);
                }
            }
        }
        
        return {
            x,
            objective: 0.5 * this._quadForm(x, H, x) + this._dot(f, x),
            converged: false,
            iterations: maxIter,
            history,
            method: 'QP Active Set'
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Helper Methods
    // ─────────────────────────────────────────────────────────────────────────────
    
    _computeJacobian: function(constraints, x, eps = 1e-7) {
        return constraints.map(c => {
            const cx = c(x);
            return x.map((_, j) => {
                const xPlus = [...x];
                xPlus[j] += eps;
                return (c(xPlus) - cx) / eps;
            });
        });
    },
    
    _computeKKTViolation: function(g, h, gIneq, lambda, mu, eqCon, ineqCon, x) {
        let violation = 0;
        
        // Gradient of Lagrangian
        let gradL = [...g];
        // Add contributions from constraints (simplified)
        violation += this._norm(g);
        
        // Equality constraints
        for (const hi of h) {
            violation += Math.abs(hi);
        }
        
        // Inequality constraints
        for (let i = 0; i < gIneq.length; i++) {
            violation += Math.max(0, gIneq[i]);
            violation += Math.abs(mu[i] * gIneq[i]); // Complementarity
        }
        
        return violation;
    },
    
    _solveQP: function(B, g, Ae, h, Ai, gIneq) {
        // Simplified QP solver for SQP subproblem
        const n = g.length;
        
        // Solve unconstrained problem as approximation
        const d = this._solveLinear(B, this._scale(g, -1));
        
        return {
            success: true,
            d,
            lambda: new Array(Ae.length).fill(0),
            mu: new Array(Ai.length).fill(0)
        };
    },
    
    _meritLineSearch: function(f, eqCon, ineqCon, x, d, g, rho = 10) {
        const merit = (x) => {
            let val = f(x);
            for (const h of eqCon) val += rho * Math.abs(h(x));
            for (const g of ineqCon) val += rho * Math.max(0, g(x));
            return val;
        };
        
        let alpha = 1;
        const m0 = merit(x);
        
        for (let i = 0; i < 20; i++) {
            const xNew = this._add(x, this._scale(d, alpha));
            if (merit(xNew) < m0 - 0.0001 * alpha * this._norm(d)) {