const PRISM_TRUST_REGION = {
        name: 'PRISM Trust Region Optimization',
        version: '1.0.0',
        source: 'MIT 15.084j Nonlinear Programming',
        
        /**
         * Trust Region Newton Method
         * Combines Newton's method with trust region constraint for robust optimization
         * @param {Object} config - {f, gradient, hessian, x0, maxIter, tol, deltaMax, eta}
         * @returns {Object} {x, f, converged, iterations, history}
         */
        trustRegionNewton: function(config) {
            const {
                f,                          // Objective function
                gradient,                   // Gradient function
                hessian,                    // Hessian function
                x0,                         // Initial point
                maxIter = 100,              // Maximum iterations
                tol = 1e-8,                 // Convergence tolerance
                deltaMax = 10.0,            // Maximum trust region radius
                delta0 = 1.0,               // Initial trust region radius
                eta = 0.1                   // Acceptance threshold
            } = config;
            
            let x = [...x0];
            let delta = delta0;
            const n = x.length;
            const history = [{ x: [...x], f: f(x), delta }];
            
            for (let iter = 0; iter < maxIter; iter++) {
                const fx = f(x);
                const g = gradient(x);
                const H = hessian(x);
                
                // Check convergence
                const gradNorm = Math.sqrt(g.reduce((sum, gi) => sum + gi * gi, 0));
                if (gradNorm < tol) {
                    return { x, f: fx, converged: true, iterations: iter, history };
                }
                
                // Solve trust region subproblem (dogleg method)
                const p = this._doglegStep(g, H, delta, n);
                
                // Calculate actual vs predicted reduction
                const xNew = x.map((xi, i) => xi + p[i]);
                const fNew = f(xNew);
                const actualReduction = fx - fNew;
                
                // Predicted reduction using quadratic model
                const Hp = this._matVec(H, p);
                const predictedReduction = -(this._dot(g, p) + 0.5 * this._dot(p, Hp));
                
                // Calculate ratio
                const rho = actualReduction / (predictedReduction + 1e-12);
                
                // Update trust region radius
                if (rho < 0.25) {
                    delta = 0.25 * delta;
                } else if (rho > 0.75 && Math.abs(this._norm(p) - delta) < 1e-8) {
                    delta = Math.min(2 * delta, deltaMax);
                }
                
                // Accept or reject step
                if (rho > eta) {
                    x = xNew;
                    history.push({ x: [...x], f: fNew, delta, rho, gradNorm });
                }
            }
            
            return { x, f: f(x), converged: false, iterations: maxIter, history };
        },
        
        /**
         * Dogleg step for trust region subproblem
         */
        _doglegStep: function(g, H, delta, n) {
            // Cauchy point (steepest descent step)
            const gNorm = this._norm(g);
            const Hg = this._matVec(H, g);
            const gHg = this._dot(g, Hg);
            
            let tauCauchy;
            if (gHg <= 0) {
                tauCauchy = 1;
            } else {
                tauCauchy = Math.min(1, gNorm * gNorm * gNorm / (delta * gHg));
            }
            
            const pCauchy = g.map(gi => -tauCauchy * delta * gi / gNorm);
            
            // Newton step
            try {
                const pNewton = this._solveLinear(H, g.map(gi => -gi));
                const pNewtonNorm = this._norm(pNewton);
                
                if (pNewtonNorm <= delta) {
                    // Newton step is inside trust region
                    return pNewton;
                }
                
                // Dogleg: interpolate between Cauchy and Newton
                const pCauchyNorm = this._norm(pCauchy);
                if (pCauchyNorm >= delta) {
                    // Cauchy point is outside - use scaled steepest descent
                    return pCauchy.map(pi => pi * delta / pCauchyNorm);
                }
                
                // Find intersection with trust region boundary
                const diff = pNewton.map((pi, i) => pi - pCauchy[i]);
                const a = this._dot(diff, diff);
                const b = 2 * this._dot(pCauchy, diff);
                const c = this._dot(pCauchy, pCauchy) - delta * delta;
                
                const tau = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
                
                return pCauchy.map((pi, i) => pi + tau * diff[i]);
                
            } catch (e) {
                // If Newton step fails, use Cauchy
                return pCauchy;
            }
        },
        
        /**
         * Trust Region with Cauchy Point (simpler version)
         */
        trustRegionCauchy: function(config) {
            const {
                f, gradient, hessian, x0,
                maxIter = 100, tol = 1e-8,
                deltaMax = 10.0, delta0 = 1.0, eta = 0.1
            } = config;
            
            let x = [...x0];
            let delta = delta0;
            const history = [];
            
            for (let iter = 0; iter < maxIter; iter++) {
                const fx = f(x);
                const g = gradient(x);
                const H = hessian(x);
                
                const gradNorm = this._norm(g);
                if (gradNorm < tol) {
                    return { x, f: fx, converged: true, iterations: iter, history };
                }
                
                // Cauchy step
                const Hg = this._matVec(H, g);
                const gHg = this._dot(g, Hg);
                
                let alpha;
                if (gHg > 0) {
                    alpha = Math.min(gradNorm * gradNorm / gHg, delta / gradNorm);
                } else {
                    alpha = delta / gradNorm;
                }
                
                const p = g.map(gi => -alpha * gi);
                
                // Evaluate step
                const xNew = x.map((xi, i) => xi + p[i]);
                const fNew = f(xNew);
                const actualReduction = fx - fNew;
                const predictedReduction = -this._dot(g, p) - 0.5 * this._dot(p, this._matVec(H, p));
                
                const rho = actualReduction / (predictedReduction + 1e-12);
                
                // Update trust region
                if (rho < 0.25) {
                    delta *= 0.25;
                } else if (rho > 0.75) {
                    delta = Math.min(2 * delta, deltaMax);
                }
                
                if (rho > eta) {
                    x = xNew;
                }
                
                history.push({ x: [...x], f: f(x), delta, rho });
            }
            
            return { x, f: f(x), converged: false, iterations: maxIter, history };
        },
        
        // Helper functions
        _dot: function(a, b) {
            return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
        },
        
        _norm: function(v) {
            return Math.sqrt(v.reduce((sum, vi) => sum + vi * vi, 0));
        },
        
        _matVec: function(A, x) {
            return A.map(row => row.reduce((sum, aij, j) => sum + aij * x[j], 0));
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
                
                if (Math.abs(aug[i][i]) < 1e-12) throw new Error('Singular matrix');
                
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
                x[i] /= aug[i][i];
            }
            
            return x;
        },
        
        // Self-test
        selfTest: function() {
            console.log('[Trust Region] Running self-test...');
            
            // Test: Minimize Rosenbrock function
            const rosenbrock = (x) => {
                return Math.pow(1 - x[0], 2) + 100 * Math.pow(x[1] - x[0] * x[0], 2);
            };
            
            const gradient = (x) => {
                return [
                    -2 * (1 - x[0]) - 400 * x[0] * (x[1] - x[0] * x[0]),
                    200 * (x[1] - x[0] * x[0])
                ];
            };
            
            const hessian = (x) => {
                return [
                    [2 + 800 * x[0] * x[0] - 400 * (x[1] - x[0] * x[0]), -400 * x[0]],
                    [-400 * x[0], 200]
                ];
            };
            
            const result = this.trustRegionNewton({
                f: rosenbrock,
                gradient,
                hessian,
                x0: [-1, 1],
                maxIter: 200,
                tol: 1e-6
            });
            
            const success = result.converged && 
                Math.abs(result.x[0] - 1) < 0.01 && 
                Math.abs(result.x[1] - 1) < 0.01;
            
            console.log(`  ✓ Trust Region Newton: ${success ? 'PASS' : 'FAIL'} (converged=${result.converged}, x=[${result.x.map(v => v.toFixed(4)).join(',')}])`);
            
            return { passed: success ? 1 : 0, total: 1 };
        }
    };