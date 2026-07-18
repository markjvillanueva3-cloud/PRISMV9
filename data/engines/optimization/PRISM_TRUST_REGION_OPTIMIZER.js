/**
 * PRISM_TRUST_REGION_OPTIMIZER
 * Extracted from PRISM v8.89.002 monolith
 * References: 12
 * Lines: 367
 * Session: R2.3.1 Wave 2 Engine Gap Extraction
 */

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
}