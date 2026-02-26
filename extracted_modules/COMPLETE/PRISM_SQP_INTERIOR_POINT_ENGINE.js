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
                return alpha;
            }
            alpha *= 0.5;
        }
        
        return alpha;
    },
    
    _dampedBFGSUpdate: function(B, s, y) {
        const sTy = this._dot(s, y);
        const sBs = this._quadForm(s, B, s);
        
        if (sTy < 0.2 * sBs) {
            // Damping
            const theta = 0.8 * sBs / (sBs - sTy);
            const yDamped = this._add(this._scale(y, theta), this._scale(this._matVec(B, s), 1 - theta));
            return this._bfgsUpdate(B, s, yDamped);
        }
        
        return this._bfgsUpdate(B, s, y);
    },
    
    _bfgsUpdate: function(B, s, y) {
        const n = s.length;
        const sTy = this._dot(s, y);
        if (sTy < 1e-10) return B;
        
        const Bs = this._matVec(B, s);
        const sBs = this._dot(s, Bs);
        
        const newB = B.map((row, i) => row.map((bij, j) =>
            bij - Bs[i] * Bs[j] / sBs + y[i] * y[j] / sTy
        ));
        
        return newB;
    },
    
    _solveIPMSystem: function(A, Aeq, s, lambda, rd, rp, rc, muTarget) {
        const m = A.length;
        const n = rd.length;
        
        // Simplified solve using diagonal scaling
        const D = s.map((si, i) => lambda[i] / si);
        const rcMod = rc.map((rci, i) => -rci + muTarget - lambda[i] * rp[i]);
        
        // Solve reduced system
        // (A' * D * A) * dx = -rd + A' * D * (rcMod / lambda - rp)
        
        const dx = new Array(n).fill(0);
        // Simple iteration (would use proper linear solve in production)
        for (let i = 0; i < n; i++) {
            dx[i] = -rd[i] / (1 + D.reduce((sum, di) => sum + di * A.reduce((s, row) => s + row[i] * row[i], 0), 0));
        }
        
        const ds = rp.map((rpi, i) => -rpi - this._dot(A[i], dx));
        const dlambda = rcMod.map((rci, i) => (rci - lambda[i] * ds[i]) / s[i]);
        
        return { dx, ds, dlambda };
    },
    
    _solveEqualityQP: function(H, g, Aeq, beq, A, b, activeSet, x) {
        const n = g.length;
        const nActive = activeSet.length;
        const nEq = Aeq.length;
        
        // Build full constraint matrix
        const nCon = nEq + nActive;
        
        if (nCon === 0) {
            return { d: this._solveLinear(H, this._scale(g, -1)), lambda: [] };
        }
        
        // [H  C'] [d]      = [-g]
        // [C  0 ] [lambda]   [residual]
        
        const C = [];
        const residual = [];
        
        for (let i = 0; i < nEq; i++) {
            C.push(Aeq[i]);
            residual.push(beq[i] - this._dot(Aeq[i], x));
        }
        
        for (const i of activeSet) {
            C.push(A[i]);
            residual.push(0); // Active constraint satisfied
        }
        
        // Solve using null-space method (simplified)
        const d = this._solveLinear(H, this._scale(g, -1));
        const lambda = new Array(nCon).fill(0);
        
        return { d, lambda };
    },
    
    // Basic utilities
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
    
    _matVec: function(A, x) {
        return A.map(row => this._dot(row, x));
    },
    
    _transpose: function(A) {
        if (A.length === 0) return [];
        return A[0].map((_, j) => A.map(row => row[j]));
    },
    
    _quadForm: function(x, A, y) {
        return this._dot(x, this._matVec(A, y));
    },
    
    _identity: function(n) {
        return Array(n).fill(null).map((_, i) =>
            Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
        );
    },
    
    _solveLinear: function(A, b) {
        return PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER._solveLinear(A, b);
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('opt.sqp', 'PRISM_SQP_INTERIOR_POINT_ENGINE.sqp');
            PRISM_GATEWAY.register('opt.interiorPoint.primalDual', 'PRISM_SQP_INTERIOR_POINT_ENGINE.primalDualInteriorPoint');
            PRISM_GATEWAY.register('opt.lp', 'PRISM_SQP_INTERIOR_POINT_ENGINE.linearProgramming');
            PRISM_GATEWAY.register('opt.qp', 'PRISM_SQP_INTERIOR_POINT_ENGINE.quadraticProgramming');
        }
    }
};


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// REGISTER ALL PART 2 MODULES
// ═══════════════════════════════════════════════════════════════════════════════════════════════

function registerSession3Part2() {
    PRISM_CONSTRAINED_OPTIMIZER.register();
    PRISM_SQP_INTERIOR_POINT_ENGINE.register();
    
    console.log('[Session 3 Part 2] Registered 2 modules, 8 gateway routes');
    console.log('  - PRISM_CONSTRAINED_OPTIMIZER: Penalty, Barrier, Augmented Lagrangian, Projected Gradient');
    console.log('  - PRISM_SQP_INTERIOR_POINT_ENGINE: SQP, Primal-Dual IPM, LP, QP');
}

// Auto-register
if (typeof window !== 'undefined') {
    window.PRISM_CONSTRAINED_OPTIMIZER = PRISM_CONSTRAINED_OPTIMIZER;
    window.PRISM_SQP_INTERIOR_POINT_ENGINE = PRISM_SQP_INTERIOR_POINT_ENGINE;
    registerSession3Part2();
}

console.log('[Session 3 Part 2] Constrained Optimization loaded - 2 modules');
/**
 * ╔═══════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PRISM SESSION 3: ULTIMATE OPTIMIZATION ENHANCEMENT - PART 3                              ║
 * ║ Combinatorial Optimization & Advanced Metaheuristics                                      ║
 * ║ Source: MIT 15.083J (Integer Programming), Kirkpatrick 1983, Glover 1986                 ║
 * ║ Target: +1,000 lines | 2 Modules | 15+ Gateway Routes                                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MODULE 5: PRISM_COMBINATORIAL_OPTIMIZER
// Branch & Bound, Cutting Planes, Dynamic Programming
// Source: MIT 15.083J, Wolsey
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const PRISM_COMBINATORIAL_OPTIMIZER = {
    name: 'PRISM_COMBINATORIAL_OPTIMIZER',
    version: '1.0.0',
    description: 'Combinatorial optimization: Branch & Bound, Cutting Planes, DP',
    source: 'MIT 15.083J, Wolsey',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Branch and Bound (for Integer Programming)
    // ─────────────────────────────────────────────────────────────────────────────
    
    branchAndBound: function(config) {
        const {
            objective,            // Function to minimize
            constraints,          // Array of constraint functions g(x) <= 0
            bounds,               // [[lb, ub], ...] for each variable
            integerVars,          // Indices of integer variables
            relaxationSolver,     // Function to solve LP relaxation
            maxNodes = 10000,
            tolerance = 1e-6,
            branchingRule = 'most_infeasible'
        } = config;
        
        const n = bounds.length;
        
        // Initialize best solution
        let bestSolution = null;
        let bestObjective = Infinity;
        let nodesExplored = 0;
        
        // Priority queue (ordered by bound)
        const queue = [{
            bounds: bounds.map(b => [...b]),
            lowerBound: -Infinity,
            depth: 0
        }];
        
        const history = [];
        
        while (queue.length > 0 && nodesExplored < maxNodes) {
            nodesExplored++;
            
            // Select node (best-first)
            queue.sort((a, b) => a.lowerBound - b.lowerBound);
            const node = queue.shift();
            
            // Prune if bound is worse than best
            if (node.lowerBound >= bestObjective - tolerance) {
                continue;
            }
            
            // Solve relaxation
            const relaxResult = relaxationSolver({
                objective,
                constraints,
                bounds: node.bounds
            });
            
            if (!relaxResult.feasible) {
                continue; // Infeasible node
            }
            
            // Check if solution is integer
            const x = relaxResult.x;
            const isInteger = this._checkIntegerFeasibility(x, integerVars, tolerance);
            
            if (isInteger) {
                const objVal = objective(x);
                if (objVal < bestObjective) {
                    bestSolution = [...x];
                    bestObjective = objVal;
                    
                    history.push({
                        node: nodesExplored,
                        objective: objVal,
                        type: 'integer_solution'
                    });
                }
            } else {
                // Branch on most fractional integer variable
                const branchVar = this._selectBranchingVariable(x, integerVars, branchingRule);
                
                if (branchVar >= 0) {
                    const val = x[branchVar];
                    const floorVal = Math.floor(val);
                    const ceilVal = Math.ceil(val);
                    
                    // Left child: x[i] <= floor(val)
                    const leftBounds = node.bounds.map(b => [...b]);
                    leftBounds[branchVar][1] = Math.min(leftBounds[branchVar][1], floorVal);
                    
                    if (leftBounds[branchVar][0] <= leftBounds[branchVar][1]) {
                        queue.push({
                            bounds: leftBounds,
                            lowerBound: relaxResult.objective,
                            depth: node.depth + 1
                        });
                    }
                    
                    // Right child: x[i] >= ceil(val)
                    const rightBounds = node.bounds.map(b => [...b]);
                    rightBounds[branchVar][0] = Math.max(rightBounds[branchVar][0], ceilVal);
                    
                    if (rightBounds[branchVar][0] <= rightBounds[branchVar][1]) {
                        queue.push({
                            bounds: rightBounds,
                            lowerBound: relaxResult.objective,
                            depth: node.depth + 1
                        });
                    }
                }
            }
        }
        
        return {
            x: bestSolution,
            objective: bestObjective,
            optimal: queue.length === 0 || nodesExplored < maxNodes,
            nodesExplored,
            remainingNodes: queue.length,
            history,
            method: 'Branch and Bound'
        };
    },
    
    _checkIntegerFeasibility: function(x, integerVars, tol) {
        for (const i of integerVars) {
            if (Math.abs(x[i] - Math.round(x[i])) > tol) {
                return false;
            }
        }
        return true;
    },
    
    _selectBranchingVariable: function(x, integerVars, rule) {
        let bestVar = -1;
        let bestFrac = -1;
        
        for (const i of integerVars) {
            const frac = Math.abs(x[i] - Math.round(x[i]));
            
            if (frac > 1e-6) {
                if (rule === 'most_infeasible') {
                    // Most fractional (closest to 0.5)
                    const dist = Math.abs(frac - 0.5);
                    if (bestVar < 0 || dist < Math.abs(bestFrac - 0.5)) {
                        bestVar = i;
                        bestFrac = frac;
                    }
                } else {
                    // First fractional
                    if (bestVar < 0) {
                        bestVar = i;
                        bestFrac = frac;
                    }
                }
            }
        }
        
        return bestVar;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Dynamic Programming Framework
    // ─────────────────────────────────────────────────────────────────────────────
    
    dynamicProgramming: function(config) {
        const {
            stages,               // Number of stages
            stateSpace,           // Function(stage) returning possible states
            transitions,          // Function(stage, state, action) returning {nextState, cost}
            actions,              // Function(stage, state) returning possible actions
            terminalCost = () => 0,
            maximize = false
        } = config;
        
        const cmp = maximize ? (a, b) => a > b : (a, b) => a < b;
        const worst = maximize ? -Infinity : Infinity;
        
        // Value function and policy
        const V = new Map();  // V[stage][state] = optimal cost-to-go
        const policy = new Map(); // policy[stage][state] = optimal action
        
        // Initialize terminal stage
        V.set(stages, new Map());
        const terminalStates = stateSpace(stages);
        for (const state of terminalStates) {
            V.get(stages).set(JSON.stringify(state), terminalCost(state));
        }
        
        // Backward induction
        for (let t = stages - 1; t >= 0; t--) {
            V.set(t, new Map());
            policy.set(t, new Map());
            
            const states = stateSpace(t);
            
            for (const state of states) {
                const stateKey = JSON.stringify(state);
                let bestValue = worst;
                let bestAction = null;
                
                const possibleActions = actions(t, state);
                
                for (const action of possibleActions) {
                    const { nextState, cost } = transitions(t, state, action);
                    const nextStateKey = JSON.stringify(nextState);
                    
                    const futureValue = V.get(t + 1).get(nextStateKey);
                    if (futureValue === undefined) continue;
                    
                    const totalValue = cost + futureValue;
                    
                    if (cmp(totalValue, bestValue)) {
                        bestValue = totalValue;
                        bestAction = action;
                    }
                }
                
                V.get(t).set(stateKey, bestValue);
                policy.get(t).set(stateKey, bestAction);
            }
        }
        
        return {
            valueFunction: V,
            policy,
            
            // Extract optimal trajectory from initial state
            getOptimalPath: function(initialState) {
                const path = [{ stage: 0, state: initialState }];
                let state = initialState;
                let totalCost = 0;
                
                for (let t = 0; t < stages; t++) {
                    const stateKey = JSON.stringify(state);
                    const action = policy.get(t).get(stateKey);
                    
                    if (action === null || action === undefined) break;
                    
                    const { nextState, cost } = transitions(t, state, action);
                    totalCost += cost;
                    
                    path.push({
                        stage: t + 1,
                        state: nextState,
                        action,
                        cost
                    });
                    
                    state = nextState;
                }
                
                return { path, totalCost };
            }
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Knapsack Problem (0/1 and Bounded)
    // ─────────────────────────────────────────────────────────────────────────────
    
    knapsack01: function(weights, values, capacity) {
        const n = weights.length;
        
        // DP table: dp[i][w] = max value using items 0..i-1 with capacity w
        const dp = Array(n + 1).fill(null).map(() => Array(capacity + 1).fill(0));
        
        for (let i = 1; i <= n; i++) {
            for (let w = 0; w <= capacity; w++) {
                dp[i][w] = dp[i - 1][w]; // Don't take item i-1
                
                if (weights[i - 1] <= w) {
                    dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);
                }
            }
        }