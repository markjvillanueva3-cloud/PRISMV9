const PRISM_LP_SOLVERS = {
    name: 'PRISM_LP_SOLVERS',
    version: '1.0.0',
    source: 'MIT 15.083j - Integer Programming & 15.084j - Nonlinear Programming',
    
    /**
     * Revised Simplex Method
     * Standard LP solver: min c'x s.t. Ax = b, x >= 0
     * Source: MIT 15.083j
     */
    revisedSimplex: function(config) {
        const {
            c,      // Objective coefficients (n)
            A,      // Constraint matrix (m x n)
            b,      // RHS (m)
            maxIter = 1000
        } = config;
        
        const m = A.length;
        const n = c.length;
        
        // Add slack variables for standard form
        // Assuming Ax <= b, convert to Ax + s = b
        const fullA = A.map((row, i) => {
            const newRow = [...row];
            for (let j = 0; j < m; j++) {
                newRow.push(i === j ? 1 : 0);
            }
            return newRow;
        });
        
        const fullC = [...c, ...new Array(m).fill(0)];
        const totalVars = n + m;
        
        // Initial basis: slack variables
        let basis = [];
        for (let i = 0; i < m; i++) {
            basis.push(n + i);
        }
        
        // Initial BFS: x_slack = b, x_original = 0
        let x = new Array(totalVars).fill(0);
        for (let i = 0; i < m; i++) {
            x[n + i] = b[i];
            if (b[i] < 0) {
                return { feasible: false, reason: 'Negative RHS not supported' };
            }
        }
        
        for (let iter = 0; iter < maxIter; iter++) {
            // Compute reduced costs
            const B = basis.map(j => fullA.map(row => row[j]));
            const cB = basis.map(j => fullC[j]);
            
            // Solve B'y = cB for dual variables
            const y = this._solveSystem(this._transpose(B), cB);
            
            // Find entering variable (most negative reduced cost)
            let entering = -1;
            let minReducedCost = -1e-10;
            
            for (let j = 0; j < totalVars; j++) {
                if (!basis.includes(j)) {
                    const col = fullA.map(row => row[j]);
                    const reducedCost = fullC[j] - this._dot(y, col);
                    
                    if (reducedCost < minReducedCost) {
                        minReducedCost = reducedCost;
                        entering = j;
                    }
                }
            }
            
            if (entering === -1) {
                // Optimal
                const solution = new Array(n).fill(0);
                for (let i = 0; i < m; i++) {
                    if (basis[i] < n) {
                        solution[basis[i]] = x[basis[i]];
                    }
                }
                
                return {
                    feasible: true,
                    optimal: true,
                    x: solution,
                    objective: this._dot(c, solution),
                    iterations: iter
                };
            }
            
            // Compute direction
            const enteringCol = fullA.map(row => row[entering]);
            const d = this._solveSystem(B, enteringCol);
            
            // Ratio test for leaving variable
            let leaving = -1;
            let minRatio = Infinity;
            
            for (let i = 0; i < m; i++) {
                if (d[i] > 1e-10) {
                    const ratio = x[basis[i]] / d[i];
                    if (ratio < minRatio) {
                        minRatio = ratio;
                        leaving = i;
                    }
                }
            }
            
            if (leaving === -1) {
                return { feasible: true, optimal: false, unbounded: true };
            }
            
            // Update solution
            const step = minRatio;
            for (let i = 0; i < m; i++) {
                x[basis[i]] -= step * d[i];
            }
            x[entering] = step;
            
            // Update basis
            basis[leaving] = entering;
        }
        
        return { feasible: true, optimal: false, reason: 'Max iterations' };
    },
    
    /**
     * Primal-Dual Interior Point Method
     * Large-scale LP solver
     * Source: MIT 15.084j Lectures 14-15
     */
    primalDualInteriorPoint: function(config) {
        const {
            c,          // Objective (n)
            A,          // Constraints (m x n)
            b,          // RHS (m)
            maxIter = 100,
            tol = 1e-8
        } = config;
        
        const m = A.length;
        const n = c.length;
        
        // Initialize strictly feasible points
        let x = new Array(n).fill(1);  // Primal variables
        let s = new Array(n).fill(1);  // Slack variables
        let y = new Array(m).fill(0);  // Dual variables
        
        // Centering parameter
        const sigma = 0.1;
        
        for (let iter = 0; iter < maxIter; iter++) {
            // Compute residuals
            const Ax = this._matVec(A, x);
            const rb = b.map((bi, i) => bi - Ax[i]);  // Primal residual
            
            const ATy = this._matVec(this._transpose(A), y);
            const rc = c.map((ci, i) => ci - ATy[i] - s[i]);  // Dual residual
            
            const mu = this._dot(x, s) / n;  // Duality gap
            
            // Check convergence
            const rbNorm = Math.sqrt(this._dot(rb, rb));
            const rcNorm = Math.sqrt(this._dot(rc, rc));
            
            if (rbNorm < tol && rcNorm < tol && mu < tol) {
                return {
                    feasible: true,
                    optimal: true,
                    x,
                    objective: this._dot(c, x),
                    dualObjective: this._dot(b, y),
                    iterations: iter,
                    dualityGap: mu
                };
            }
            
            // Compute Newton direction (simplified)
            // Full system: [0 A' I; A 0 0; S 0 X] [dx; dy; ds] = [rc; rb; sigma*mu*e - XSe]
            
            // Using normal equations approach
            const XinvS = x.map((xi, i) => s[i] / (xi + 1e-10));
            const targetGap = sigma * mu;
            
            // Affine direction
            const { dx, dy, ds } = this._solveIPSystem(A, XinvS, x, s, rb, rc, targetGap);
            
            // Step length (fraction to boundary)
            let alphaP = 1, alphaD = 1;
            const tau = 0.995;
            
            for (let i = 0; i < n; i++) {
                if (dx[i] < 0) alphaP = Math.min(alphaP, -tau * x[i] / dx[i]);
                if (ds[i] < 0) alphaD = Math.min(alphaD, -tau * s[i] / ds[i]);
            }
            
            // Update
            for (let i = 0; i < n; i++) {
                x[i] += alphaP * dx[i];
                s[i] += alphaD * ds[i];
            }
            for (let i = 0; i < m; i++) {
                y[i] += alphaD * dy[i];
            }
        }
        
        return {
            feasible: true,
            optimal: false,
            x,
            objective: this._dot(c, x),
            reason: 'Max iterations'
        };
    },
    
    _solveIPSystem: function(A, XinvS, x, s, rb, rc, targetGap) {
        const m = A.length;
        const n = A[0].length;
        
        // Simplified: use gradient of barrier function
        const dx = new Array(n).fill(0);
        const dy = new Array(m).fill(0);
        const ds = new Array(n).fill(0);
        
        // Compute modified RHS
        const rhs = rc.map((rci, i) => -rci + targetGap / (x[i] + 1e-10));
        
        // Diagonal scaling
        const D = x.map((xi, i) => xi / (s[i] + 1e-10));
        
        // Form A*D*A' (normal equations)
        const ADA = [];
        for (let i = 0; i < m; i++) {
            ADA[i] = [];
            for (let j = 0; j < m; j++) {
                let sum = 0;
                for (let k = 0; k < n; k++) {
                    sum += A[i][k] * D[k] * A[j][k];
                }
                ADA[i][j] = sum;
            }
        }
        
        // RHS for normal equations
        const rhsNormal = [];
        for (let i = 0; i < m; i++) {
            let sum = rb[i];
            for (let k = 0; k < n; k++) {
                sum += A[i][k] * D[k] * rhs[k];
            }
            rhsNormal[i] = sum;
        }
        
        // Solve for dy
        const dyResult = this._solveSystem(ADA, rhsNormal);
        for (let i = 0; i < m; i++) dy[i] = dyResult[i];
        
        // Back-substitute for dx
        const ATdy = this._matVec(this._transpose(A), dy);
        for (let i = 0; i < n; i++) {
            dx[i] = D[i] * (rhs[i] - ATdy[i]);
        }
        
        // Compute ds
        for (let i = 0; i < n; i++) {
            ds[i] = -rc[i] - ATdy[i];
        }
        
        return { dx, dy, ds };
    },
    
    /**
     * Active Set Method for QP
     * min 0.5*x'Hx + c'x s.t. Ax <= b
     * Source: MIT 15.084j Lectures 6-8
     */
    activeSetQP: function(config) {
        const {
            H,          // Hessian (n x n, positive definite)
            c,          // Linear term (n)
            A,          // Inequality constraints (m x n)
            b,          // RHS (m)
            x0 = null,  // Initial feasible point
            maxIter = 1000
        } = config;
        
        const n = H.length;
        const m = A.length;
        
        // Find initial feasible point if not provided
        let x = x0 || this._findFeasiblePoint(A, b, n);
        if (!x) {
            return { feasible: false, reason: 'Could not find feasible point' };
        }
        
        // Initialize working set (active constraints)
        let workingSet = [];
        for (let i = 0; i < m; i++) {
            const slack = b[i] - this._dot(A[i], x);
            if (Math.abs(slack) < 1e-8) {
                workingSet.push(i);
            }
        }
        
        for (let iter = 0; iter < maxIter; iter++) {
            // Compute gradient
            const g = this._add(this._matVec(H, x), c);
            
            // Solve equality-constrained QP subproblem
            // min 0.5*p'Hp + g'p s.t. A_W*p = 0
            
            const AW = workingSet.map(i => A[i]);
            
            let p;
            if (workingSet.length === 0) {
                // Unconstrained: p = -H^{-1}g
                p = this._solveSystem(H, g.map(gi => -gi));
            } else {
                // KKT system
                const result = this._solveKKT(H, g, AW);
                p = result.p;
            }
            
            const pNorm = Math.sqrt(this._dot(p, p));
            
            if (pNorm < 1e-10) {
                // Check Lagrange multipliers
                if (workingSet.length === 0) {
                    // Optimal
                    return {
                        feasible: true,
                        optimal: true,
                        x,
                        objective: 0.5 * this._dot(x, this._matVec(H, x)) + this._dot(c, x),
                        iterations: iter
                    };
                }
                
                // Compute multipliers
                const lambdas = this._computeLambdas(H, c, x, A, workingSet);
                
                // Find most negative multiplier
                let minLambda = 0;
                let minIdx = -1;
                for (let i = 0; i < workingSet.length; i++) {
                    if (lambdas[i] < minLambda) {
                        minLambda = lambdas[i];
                        minIdx = i;
                    }
                }
                
                if (minIdx === -1) {
                    // All multipliers non-negative - optimal
                    return {
                        feasible: true,
                        optimal: true,
                        x,
                        objective: 0.5 * this._dot(x, this._matVec(H, x)) + this._dot(c, x),
                        iterations: iter,
                        activeConstraints: workingSet
                    };
                }
                
                // Remove constraint with most negative multiplier
                workingSet.splice(minIdx, 1);
                
            } else {
                // Compute step length
                let alpha = 1;
                let blockingConstraint = -1;
                
                for (let i = 0; i < m; i++) {
                    if (!workingSet.includes(i)) {
                        const ap = this._dot(A[i], p);
                        if (ap > 1e-10) {
                            const slack = b[i] - this._dot(A[i], x);
                            const ratio = slack / ap;
                            if (ratio < alpha) {
                                alpha = ratio;
                                blockingConstraint = i;
                            }
                        }
                    }
                }
                
                // Take step
                x = this._add(x, p.map(pi => alpha * pi));
                
                // Add blocking constraint to working set
                if (alpha < 1 && blockingConstraint >= 0) {
                    workingSet.push(blockingConstraint);
                }
            }
        }
        
        return {
            feasible: true,
            optimal: false,
            x,
            reason: 'Max iterations'
        };
    },
    
    _solveKKT: function(H, g, AW) {
        const n = H.length;
        const m = AW.length;
        
        if (m === 0) {
            return { p: this._solveSystem(H, g.map(gi => -gi)) };
        }
        
        // Build KKT matrix [H A'; A 0]
        const size = n + m;
        const KKT = [];
        
        for (let i = 0; i < n; i++) {
            KKT[i] = [...H[i]];
            for (let j = 0; j < m; j++) {
                KKT[i].push(AW[j][i]);
            }
        }
        
        for (let i = 0; i < m; i++) {
            KKT[n + i] = [...AW[i], ...new Array(m).fill(0)];
        }
        
        // RHS: [-g; 0]
        const rhs = [...g.map(gi => -gi), ...new Array(m).fill(0)];
        
        // Solve
        const sol = this._solveSystem(KKT, rhs);
        
        return {
            p: sol.slice(0, n),
            lambda: sol.slice(n)
        };
    },
    
    _computeLambdas: function(H, c, x, A, workingSet) {
        // λ = (A_W H^{-1} A_W')^{-1} (A_W H^{-1} g + A_W x - b_W)
        const g = this._add(this._matVec(H, x), c);
        const AW = workingSet.map(i => A[i]);
        
        if (AW.length === 0) return [];
        
        // Simplified: use gradient projection
        const lambdas = [];
        for (let i = 0; i < workingSet.length; i++) {
            const ai = AW[i];
            lambdas.push(this._dot(ai, g) / this._dot(ai, ai));
        }
        
        return lambdas;
    },
    
    _findFeasiblePoint