/**
 * PRISM_ODE_SOLVERS_MIT
 * Extracted from PRISM v8.89.002 monolith
 * References: 9
 * Category: numerical
 * Lines: 6378
 * Session: R2.3.2 Algorithm Extraction
 */

const PRISM_ODE_SOLVERS_MIT = {
    /**
     * Euler forward (explicit) method
     * @param {Function} f - ODE function f(t, y)
     * @param {number} y0 - Initial condition
     * @param {number} t0 - Initial time
     * @param {number} tf - Final time
     * @param {number} n - Number of steps
     * @returns {Object} {t, y} arrays
     */
    eulerForward: function(f, y0, t0, tf, n) {
        const h = (tf - t0) / n;
        const t = [t0];
        const y = [y0];
        
        for (let i = 0; i < n; i++) {
            y.push(y[i] + h * f(t[i], y[i]));
            t.push(t[i] + h);
        }
        
        return { t, y };
    },

    /**
     * Euler backward (implicit) method
     * Uses Newton's method for implicit equation
     * @param {Function} f - ODE function
     * @param {Function} df - Partial derivative ∂f/∂y
     * @param {number} y0 - Initial condition
     * @param {number} t0 - Initial time
     * @param {number} tf - Final time
     * @param {number} n - Number of steps
     * @returns {Object} {t, y} arrays
     */
    eulerBackward: function(f, df, y0, t0, tf, n) {
        const h = (tf - t0) / n;
        const t = [t0];
        const y = [y0];
        
        for (let i = 0; i < n; i++) {
            const tNext = t[i] + h;
            let yNext = y[i]; // Initial guess
            
            // Newton iteration to solve y_{n+1} = y_n + h*f(t_{n+1}, y_{n+1})
            for (let iter = 0; iter < 10; iter++) {
                const F = yNext - y[i] - h * f(tNext, yNext);
                const dF = 1 - h * df(tNext, yNext);
                yNext = yNext - F / dF;
            }
            
            y.push(yNext);
            t.push(tNext);
        }
        
        return { t, y };
    },

    /**
     * Classical 4th-order Runge-Kutta method
     * @param {Function} f - ODE function f(t, y)
     * @param {number} y0 - Initial condition
     * @param {number} t0 - Initial time
     * @param {number} tf - Final time
     * @param {number} n - Number of steps
     * @returns {Object} {t, y} arrays
     */
    rk4: function(f, y0, t0, tf, n) {
        const h = (tf - t0) / n;
        const t = [t0];
        const y = [y0];
        
        for (let i = 0; i < n; i++) {
            const k1 = f(t[i], y[i]);
            const k2 = f(t[i] + h / 2, y[i] + h * k1 / 2);
            const k3 = f(t[i] + h / 2, y[i] + h * k2 / 2);
            const k4 = f(t[i] + h, y[i] + h * k3);
            
            y.push(y[i] + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4));
            t.push(t[i] + h);
        }
        
        return { t, y };
    },

    /**
     * Solve system of ODEs using RK4
     * @param {Function} F - System function F(t, Y) returning array
     * @param {Array} Y0 - Initial conditions array
     * @param {number} t0 - Initial time
     * @param {number} tf - Final time
     * @param {number} n - Number of steps
     * @returns {Object} {t, Y} where Y is 2D array
     */
    rk4System: function(F, Y0, t0, tf, n) {
        const h = (tf - t0) / n;
        const dim = Y0.length;
        const t = [t0];
        const Y = [Y0.slice()];
        
        for (let i = 0; i < n; i++) {
            const Yi = Y[i];
            const ti = t[i];
            
            const k1 = F(ti, Yi);
            const k2 = F(ti + h / 2, Yi.map((y, j) => y + h * k1[j] / 2));
            const k3 = F(ti + h / 2, Yi.map((y, j) => y + h * k2[j] / 2));
            const k4 = F(ti + h, Yi.map((y, j) => y + h * k3[j]));
            
            const Ynext = Yi.map((y, j) => 
                y + (h / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])
            );
            
            Y.push(Ynext);
            t.push(ti + h);
        }
        
        return { t, Y };
    }
};

// ═══════════════════════════════════════════════════════════════
// LINEAR ALGEBRA (MIT 2.086)
// ═══════════════════════════════════════════════════════════════

const PRISM_LINALG_MIT = {
    /**
     * LU decomposition with partial pivoting
     * @param {Array} A - Square matrix (2D array)
     * @returns {Object} {L, U, P} - Lower, Upper, Permutation
     */
    luDecomposition: function(A) {
        const n = A.length;
        const L = Array(n).fill(null).map(() => Array(n).fill(0));
        const U = A.map(row => [...row]);
        const P = Array(n).fill(null).map((_, i) => i);
        
        for (let k = 0; k < n - 1; k++) {
            // Find pivot
            let maxVal = Math.abs(U[k][k]);
            let maxRow = k;
            for (let i = k + 1; i < n; i++) {
                if (Math.abs(U[i][k]) > maxVal) {
                    maxVal = Math.abs(U[i][k]);
                    maxRow = i;
                }
            }
            
            // Swap rows
            if (maxRow !== k) {
                [U[k], U[maxRow]] = [U[maxRow], U[k]];
                [L[k], L[maxRow]] = [L[maxRow], L[k]];
                [P[k], P[maxRow]] = [P[maxRow], P[k]];
            }
            
            // Elimination
            for (let i = k + 1; i < n; i++) {
                L[i][k] = U[i][k] / U[k][k];
                for (let j = k; j < n; j++) {
                    U[i][j] -= L[i][k] * U[k][j];
                }
            }
        }
        
        // Set diagonal of L to 1
        for (let i = 0; i < n; i++) {
            L[i][i] = 1;
        }
        
        return { L, U, P };
    },

    /**
     * Solve Ax = b using LU decomposition
     * @param {Array} A - Matrix
     * @param {Array} b - RHS vector
     * @returns {Array} Solution x
     */
    solveLU: function(A, b) {
        const { L, U, P } = this.luDecomposition(A);
        const n = A.length;
        
        // Apply permutation to b
        const pb = P.map(i => b[i]);
        
        // Forward substitution: Ly = pb
        const y = Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            y[i] = pb[i];
            for (let j = 0; j < i; j++) {
                y[i] -= L[i][j] * y[j];
            }
        }
        
        // Backward substitution: Ux = y
        const x = Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = y[i];
            for (let j = i + 1; j < n; j++) {
                x[i] -= U[i][j] * x[j];
            }
            x[i] /= U[i][i];
        }
        
        return x;
    },

    /**
     * Least squares solution via QR factorization
     * @param {Array} A - m×n matrix (m >= n)
     * @param {Array} b - RHS vector
     * @returns {Array} Least squares solution x
     */
    leastSquaresQR: function(A, b) {
        const m = A.length;
        const n = A[0].length;
        
        // QR via Gram-Schmidt
        const Q = Array(m).fill(null).map(() => Array(n).fill(0));
        const R = Array(n).fill(null).map(() => Array(n).fill(0));
        
        for (let j = 0; j < n; j++) {
            // Copy column j
            for (let i = 0; i < m; i++) {
                Q[i][j] = A[i][j];
            }
            
            // Orthogonalize against previous columns
            for (let k = 0; k < j; k++) {
                let dot = 0;
                for (let i = 0; i < m; i++) {
                    dot += Q[i][k] * A[i][j];
                }
                R[k][j] = dot;
                for (let i = 0; i < m; i++) {
                    Q[i][j] -= dot * Q[i][k];
                }
            }
            
            // Normalize
            let norm = 0;
            for (let i = 0; i < m; i++) {
                norm += Q[i][j] * Q[i][j];
            }
            norm = Math.sqrt(norm);
            R[j][j] = norm;
            for (let i = 0; i < m; i++) {
                Q[i][j] /= norm;
            }
        }
        
        // Solve R x = Q^T b
        const Qtb = Array(n).fill(0);
        for (let j = 0; j < n; j++) {
            for (let i = 0; i < m; i++) {
                Qtb[j] += Q[i][j] * b[i];
            }
        }
        
        // Back substitution
        const x = Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = Qtb[i];
            for (let j = i + 1; j < n; j++) {
                x[i] -= R[i][j] * x[j];
            }
            x[i] /= R[i][i];
        }
        
        return x;
    }
};

// ═══════════════════════════════════════════════════════════════
// DIGITAL CONTROL (MIT 2.171)
// ═══════════════════════════════════════════════════════════════

const PRISM_DIGITAL_CONTROL_MIT = {
    /**
     * Tustin (bilinear) discretization of continuous transfer function
     * Converts s-domain to z-domain
     * @param {Object} tf - {num: [], den: []} continuous TF coefficients
     * @param {number} T - Sampling period
     * @returns {Object} Discrete transfer function
     */
    tustinDiscretize: function(tf, T) {
        // For first-order system: G(s) = K/(τs + 1)
        // G(z) = K(1 + z^-1) / ((2τ/T + 1) + (1 - 2τ/T)z^-1)
        
        // This is simplified - full implementation would handle arbitrary order
        const K = tf.num[0] / tf.den[tf.den.length - 1];
        const tau = tf.den[0] / tf.den[tf.den.length - 1];
        
        const a = 2 * tau / T;
        const numZ = [K, K]; // K(1 + z^-1)
        const denZ = [a + 1, 1 - a]; // (a+1) + (1-a)z^-1
        
        // Normalize
        const norm = denZ[0];
        return {
            num: numZ.map(x => x / norm),
            den: denZ.map(x => x / norm),
            T: T
        };
    },

    /**
     * Zero-order hold discretization
     * @param {Object} ss - {A, B, C, D} continuous state space
     * @param {number} T - Sampling period
     * @returns {Object} Discrete state space {Phi, Gamma, C, D}
     */
    zohDiscretize: function(ss, T) {
        const { A, B, C, D } = ss;
        const n = A.length;
        
        // Phi = e^(AT) ≈ I + AT + (AT)²/2! + ...
        // Using Padé approximation for small T
        const AT = A.map(row => row.map(x => x * T));
        
        // Simple approximation: Phi ≈ I + AT
        const Phi = A.map((row, i) => 
            row.map((x, j) => (i === j ? 1 : 0) + x * T)
        );
        
        // Gamma ≈ BT
        const Gamma = B.map(x => x * T);
        
        return { Phi, Gamma, C, D, T };
    },

    /**
     * Digital PID controller
     * @param {number} Kp - Proportional gain
     * @param {number} Ki - Integral gain
     * @param {number} Kd - Derivative gain
     * @param {number} T - Sampling period
     * @returns {Object} Digital PID controller object
     */
    createDigitalPID: function(Kp, Ki, Kd, T) {
        return {
            Kp, Ki, Kd, T,
            integral: 0,
            prevError: 0,
            
            compute: function(setpoint, measured) {
                const error = setpoint - measured;
                
                // Proportional
                const P = this.Kp * error;
                
                // Integral (trapezoidal)
                this.integral += this.T * (error + this.prevError) / 2;
                const I = this.Ki * this.integral;
                
                // Derivative (backward difference)
                const D = this.Kd * (error - this.prevError) / this.T;
                
                this.prevError = error;
                
                return P + I + D;
            },
            
            reset: function() {
                this.integral = 0;
                this.prevError = 0;
            }
        };
    }
};

// ═══════════════════════════════════════════════════════════════
// GATEWAY REGISTRATION
// ═══════════════════════════════════════════════════════════════

if (typeof PRISM_GATEWAY !== 'undefined') {
    // NURBS routes
    PRISM_GATEWAY.register('geom.nurbs.basis', 'PRISM_NURBS_MIT.basisFunction');
    PRISM_GATEWAY.register('geom.nurbs.deBoor', 'PRISM_NURBS_MIT.deBoor');
    PRISM_GATEWAY.register('geom.nurbs.evaluate', 'PRISM_NURBS_MIT.evaluateNURBS');
    PRISM_GATEWAY.register('geom.nurbs.knotVector', 'PRISM_NURBS_MIT.generateKnotVector');
    PRISM_GATEWAY.register('geom.nurbs.insertKnot', 'PRISM_NURBS_MIT.insertKnot');
    
    // Bézier routes
    PRISM_GATEWAY.register('geom.bezier.bernstein', 'PRISM_BEZIER_MIT.bernstein');
    PRISM_GATEWAY.register('geom.bezier.evaluate', 'PRISM_BEZIER_MIT.evaluate');
    PRISM_GATEWAY.register('geom.bezier.deCasteljau', 'PRISM_BEZIER_MIT.deCasteljau');
    PRISM_GATEWAY.register('geom.bezier.derivative', 'PRISM_BEZIER_MIT.derivative');
    
    // Surface routes
    PRISM_GATEWAY.register('geom.surface.evalBSpline', 'PRISM_SURFACE_GEOMETRY_MIT.evaluateBSplineSurface');
    PRISM_GATEWAY.register('geom.surface.normal', 'PRISM_SURFACE_GEOMETRY_MIT.computeNormal');
    PRISM_GATEWAY.register('geom.surface.curvature', 'PRISM_SURFACE_GEOMETRY_MIT.computeCurvature');
    
    // ODE routes
    PRISM_GATEWAY.register('num.ode.eulerForward', 'PRISM_ODE_SOLVERS_MIT.eulerForward');
    PRISM_GATEWAY.register('num.ode.eulerBackward', 'PRISM_ODE_SOLVERS_MIT.eulerBackward');
    PRISM_GATEWAY.register('num.ode.rk4', 'PRISM_ODE_SOLVERS_MIT.rk4');
    PRISM_GATEWAY.register('num.ode.rk4System', 'PRISM_ODE_SOLVERS_MIT.rk4System');
    
    // Linear algebra routes
    PRISM_GATEWAY.register('num.linalg.lu', 'PRISM_LINALG_MIT.luDecomposition');
    PRISM_GATEWAY.register('num.linalg.solveLU', 'PRISM_LINALG_MIT.solveLU');
    PRISM_GATEWAY.register('num.linalg.leastSquaresQR', 'PRISM_LINALG_MIT.leastSquaresQR');
    
    // Digital control routes
    PRISM_GATEWAY.register('control.discrete.tustin', 'PRISM_DIGITAL_CONTROL_MIT.tustinDiscretize');
    PRISM_GATEWAY.register('control.discrete.zoh', 'PRISM_DIGITAL_CONTROL_MIT.zohDiscretize');
    PRISM_GATEWAY.register('control.discrete.pid', 'PRISM_DIGITAL_CONTROL_MIT.createDigitalPID');
    
    console.log('[PRISM] MIT Batch 14 Knowledge loaded - 22 new gateway routes');
}

// ═══════════════════════════════════════════════════════════════
// SELF-TESTS
// ═══════════════════════════════════════════════════════════════

const PRISM_MIT_BATCH_14_TESTS = {
    runAll: function() {
        console.log('=== PRISM MIT Batch 14 Self-Tests ===');
        let passed = 0;
        let failed = 0;
        
        // Test 1: Bézier evaluation
        try {
            const cp = [{x:0,y:0}, {x:1,y:2}, {x:3,y:2}, {x:4,y:0}];
            const pt = PRISM_BEZIER_MIT.evaluate(0.5, cp);
            if (Math.abs(pt.x - 2) < 0.01 && Math.abs(pt.y - 1.5) < 0.01) {
                console.log('✓ Bézier curve evaluation');
                passed++;
            } else {
                throw new Error(`Expected (2, 1.5), got (${pt.x}, ${pt.y})`);
            }
        } catch (e) {
            console.log('✗ Bézier evaluation:', e.message);
            failed++;
        }
        
        // Test 2: de Casteljau subdivision
        try {
            const cp = [{x:0,y:0,z:0}, {x:1,y:1,z:0}, {x:2,y:0,z:0}];
            const result = PRISM_BEZIER_MIT.deCasteljau(0.5, cp);
            if (result.left.length === 3 && result.right.length === 3) {
                console.log('✓ de Casteljau subdivision');
                passed++;
            } else {
                throw new Error('Subdivision failed');
            }
        } catch (e) {
            console.log('✗ de Casteljau:', e.message);
            failed++;
        }
        
        // Test 3: RK4 ODE solver
        try {
            const f = (t, y) => -y; // dy/dt = -y, solution: y = e^(-t)
            const result = PRISM_ODE_SOLVERS_MIT.rk4(f, 1, 0, 1, 100);
            const expected = Math.exp(-1);
            if (Math.abs(result.y[100] - expected) < 0.001) {
                console.log('✓ RK4 ODE solver');
                passed++;
            } else {
                throw new Error(`Expected ${expected}, got ${result.y[100]}`);
            }
        } catch (e) {
            console.log('✗ RK4:', e.message);
            failed++;
        }
        
        // Test 4: LU decomposition
        try {
            const A = [[2, 1], [1, 3]];
            const b = [3, 4];
            const x = PRISM_LINALG_MIT.solveLU(A, b);
            // Verify: Ax = b
            const check = A[0][0]*x[0] + A[0][1]*x[1];
            if (Math.abs(check - b[0]) < 0.001) {
                console.log('✓ LU decomposition solve');
                passed++;
            } else {
                throw new Error('LU solve failed');
            }
        } catch (e) {
            console.log('✗ LU solve:', e.message);
            failed++;
        }
        
        // Test 5: B-spline basis
        try {
            const knots = [0, 0, 0, 1, 1, 1]; // Cubic, clamped
            const N0 = PRISM_NURBS_MIT.basisFunction(0, 3, 0, knots);
            if (Math.abs(N0 - 1) < 0.001) {
                console.log('✓ B-spline basis function');
                passed++;
            } else {
                throw new Error(`Expected 1, got ${N0}`);
            }
        } catch (e) {
            console.log('✗ B-spline basis:', e.message);
            failed++;
        }
        
        // Test 6: Digital PID
        try {
            const pid = PRISM_DIGITAL_CONTROL_MIT.createDigitalPID(1, 0.1, 0.01, 0.01);
            const u = pid.compute(10, 0);
            if (u > 0) {
                console.log('✓ Digital PID controller');
                passed++;
            } else {
                throw new Error('PID output should be positive');
            }
        } catch (e) {
            console.log('✗ Digital PID:', e.message);
            failed++;
        }
        
        console.log(`\nResults: ${passed}/${passed + failed} tests passed`);
        return { passed, failed };
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PRISM_NURBS_MIT,
        PRISM_BEZIER_MIT,
        PRISM_SURFACE_GEOMETRY_MIT,
        PRISM_ODE_SOLVERS_MIT,
        PRISM_LINALG_MIT,
        PRISM_DIGITAL_CONTROL_MIT,
        PRISM_MIT_BATCH_14_TESTS
    };
}

console.log('[PRISM] MIT Batch 14 loaded: NURBS, Bézier, ODE Solvers, Linear Algebra, Digital Control');
/**
 * PRISM MIT Course Knowledge - Batch 15
 * HIGH PRIORITY MANUFACTURING: Precision Machine Design, Process Control
 * Source: MIT 2.43, 2.72, 2.75, 2.76, 2.830J
 * Generated: January 18, 2026
 */

console.log('[PRISM MIT Batch 15] Loading High Priority Manufacturing Knowledge...');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: PRECISION MACHINE DESIGN (MIT 2.75 - Slocum)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_PRECISION_DESIGN = {
    
    /**
     * Calculate Abbe error from angular error and offset distance
     * @param {number} offset_mm - Abbe offset distance in mm
     * @param {number} angularError_arcsec - Angular error in arcseconds
     * @returns {Object} Error analysis with positioning error
     */
    abbeError: function(offset_mm, angularError_arcsec) {
        // Convert arcseconds to radians
        const theta_rad = angularError_arcsec * (Math.PI / 180) / 3600;
        
        // Abbe error: δ = L × sin(θ) ≈ L × θ for small angles
        const error_mm = offset_mm * Math.sin(theta_rad);
        const error_um = error_mm * 1000;
        
        return {
            offset_mm,
            angularError_arcsec,
            angularError_rad: theta_rad,
            positionError_mm: error_mm,
            positionError_um: error_um,
            recommendation: error_um > 1 ? 
                'Consider reducing Abbe offset or improving angular accuracy' : 
                'Acceptable for precision applications'
        };
    },
    
    /**
     * Thermal expansion calculator
     * @param {number} length_mm - Original length in mm
     * @param {number} deltaT_C - Temperature change in °C
     * @param {string} material - Material type
     * @returns {Object} Expansion analysis
     */
    thermalExpansion: function(length_mm, deltaT_C, material = 'steel') {
        // Coefficient of thermal expansion (CTE) × 10⁻⁶/°C
        const CTE = {
            'invar': 1.2,
            'super_invar': 0.3,
            'zerodur': 0.05,
            'granite': 6,
            'cast_iron': 11,
            'steel': 12,
            'stainless_steel': 16,
            'aluminum': 23,
            'brass': 19,
            'copper': 17,
            'titanium': 8.6
        };
        
        const alpha = CTE[material.toLowerCase()] || CTE['steel'];
        
        // ΔL = α × L × ΔT
        const deltaL_mm = alpha * 1e-6 * length_mm * deltaT_C;
        const deltaL_um = deltaL_mm * 1000;
        
        return {
            material,
            originalLength_mm: length_mm,
            temperatureChange_C: deltaT_C,
            cte_per_C: alpha * 1e-6,
            expansion_mm: deltaL_mm,
            expansion_um: deltaL_um,
            strainPPM: alpha * deltaT_C,
            recommendation: this._thermalRecommendation(deltaL_um, material)
        };
    },
    
    _thermalRecommendation: function(error_um, material) {
        if (error_um < 0.1) return 'Excellent thermal stability';
        if (error_um < 1) return 'Good for precision work';
        if (error_um < 10) return 'Consider temperature control or low-CTE material';
        return 'Significant thermal error - use Invar, active cooling, or compensation';
    },
    
    /**
     * Error budget calculation using RSS method
     * @param {Array} errors - Array of {name, value_um, type: 'systematic'|'random'}
     * @returns {Object} Combined error budget
     */
    errorBudget: function(errors) {
        const systematic = errors.filter(e => e.type === 'systematic');
        const random = errors.filter(e => e.type === 'random');
        
        // Systematic errors add algebraically (worst case)
        const systematicTotal = systematic.reduce((sum, e) => sum + Math.abs(e.value_um), 0);
        
        // Random errors combine RSS
        const randomRSS = Math.sqrt(random.reduce((sum, e) => sum + e.value_um ** 2, 0));
        
        // Total error (systematic + random RSS combined)
        const totalError = Math.sqrt(systematicTotal ** 2 + randomRSS ** 2);
        
        return {
            systematicErrors: systematic,
            randomErrors: random,
            systematicTotal_um: systematicTotal,
            randomRSS_um: randomRSS,
            totalError_um: totalError,
            breakdown: {
                systematic_percent: (systematicTotal / totalError * 100).toFixed(1),
                random_percent: (randomRSS / totalError * 100).toFixed(1)
            },
            largestContributors: [...errors].sort((a, b) => 
                Math.abs(b.value_um) - Math.abs(a.value_um)).slice(0, 3)
        };
    },
    
    /**
     * Kinematic coupling analysis (3-groove type)
     * @param {number} ballDiameter_mm - Ball diameter
     * @param {number} grooveAngle_deg - V-groove angle (typically 90°)
     * @param {number} preload_N - Applied preload force
     * @returns {Object} Coupling analysis
     */
    kinematicCoupling: function(ballDiameter_mm, grooveAngle_deg = 90, preload_N = 100) {
        const R = ballDiameter_mm / 2;
        const theta = grooveAngle_deg * Math.PI / 180 / 2; // Half angle
        
        // Contact force per ball (3 balls, 2 contacts each)
        const F_contact = preload_N / (6 * Math.sin(theta));
        
        // Hertzian contact radius (simplified for steel on steel)
        const E_star = 115000; // MPa for steel
        const contactRadius = Math.pow(3 * F_contact * R / (4 * E_star), 1/3);
        
        // Stiffness estimate
        const K_contact = 3 * F_contact / (2 * contactRadius);
        const K_total = 6 * K_contact; // 6 contact points
        
        return {
            ballDiameter_mm,
            grooveAngle_deg,
            preload_N,
            contactForce_N: F_contact,
            contactRadius_mm: contactRadius,
            stiffness_N_per_um: K_total / 1000,
            repeatability_um: 0.1 * R / Math.sqrt(K_total), // Empirical estimate
            constraints: 6,
            type: '3-groove kinematic coupling'
        };
    },
    
    /**
     * Hydrostatic bearing design
     * @param {Object} params - Bearing parameters
     * @returns {Object} Bearing analysis
     */
    hydrostaticBearing: function(params) {
        const {
            supplyPressure_MPa = 3,
            pocketArea_mm2 = 500,
            filmThickness_um = 20,
            viscosity_cP = 30,
            innerRadius_mm = 20,
            outerRadius_mm = 40
        } = params;
        
        const h0 = filmThickness_um / 1000; // mm
        const mu = viscosity_cP * 1e-9; // MPa·s
        
        // Load capacity (simplified)
        const loadCapacity_N = supplyPressure_MPa * pocketArea_mm2 * 0.5;
        
        // Stiffness (approximate)
        const stiffness_N_per_um = 3 * loadCapacity_N / filmThickness_um;
        
        // Flow rate (circular pad)
        const Q = Math.PI * Math.pow(h0, 3) * supplyPressure_MPa / 
                  (6 * mu * Math.log(outerRadius_mm / innerRadius_mm));
        
        // Power loss (pumping)
        const pumpPower_W = Q * supplyPressure_MPa * 1000;
        
        return {
            loadCapacity_N,
            stiffness_N_per_um,
            flowRate_cc_per_min: Q * 60000,
            pumpPower_W,
            filmThickness_um,
            supplyPressure_MPa,
            advantages: ['Zero friction', 'High stiffness', 'High damping'],
            disadvantages: ['Requires pump', 'Oil management', 'Temperature sensitive']
        };
    },
    
    /**
     * Leadscrew critical speed calculation
     * @param {number} diameter_mm - Screw diameter
     * @param {number} length_mm - Unsupported length
     * @param {string} endConditions - 'fixed-fixed', 'fixed-free', 'fixed-supported'
     * @returns {Object} Critical speed analysis
     */
    leadscrewCriticalSpeed: function(diameter_mm, length_mm, endConditions = 'fixed-supported') {
        const d = diameter_mm;
        const L = length_mm;
        
        // End condition factors
        const factors = {
            'fixed-free': 0.56,
            'fixed-supported': 1.25,
            'fixed-fixed': 2.23,
            'supported-supported': 1.0
        };
        
        const K = factors[endConditions] || 1.25;
        
        // Critical speed for steel (E = 207 GPa, ρ = 7850 kg/m³)
        // N_c = K × (d/L²) × 4.76×10⁶  [RPM]
        const Nc = K * (d / (L * L)) * 4.76e6;
        
        // Safe operating speed (70% of critical)
        const safeSpeed = Nc * 0.7;
        
        return {
            diameter_mm: d,
            length_mm: L,
            endConditions,
            endFactor: K,
            criticalSpeed_RPM: Math.round(Nc),
            safeOperatingSpeed_RPM: Math.round(safeSpeed),
            recommendation: safeSpeed < 1000 ? 
                'Consider shorter screw, larger diameter, or linear motor' :
                'Acceptable for typical machine tool applications'
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: STATISTICAL PROCESS CONTROL (MIT 2.830J)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_SPC = {
    
    // Control chart constants
    CONSTANTS: {
        2: { A2: 1.880, D3: 0, D4: 3.267, d2: 1.128 },
        3: { A2: 1.023, D3: 0, D4: 2.574, d2: 1.693 },
        4: { A2: 0.729, D3: 0, D4: 2.282, d2: 2.059 },
        5: { A2: 0.577, D3: 0, D4: 2.114, d2: 2.326 },
        6: { A2: 0.483, D3: 0, D4: 2.004, d2: 2.534 },
        7: { A2: 0.419, D3: 0.076, D4: 1.924, d2: 2.704 },
        8: { A2: 0.373, D3: 0.136, D4: 1.864, d2: 2.847 },
        9: { A2: 0.337, D3: 0.184, D4: 1.816, d2: 2.970 },
        10: { A2: 0.308, D3: 0.223, D4: 1.777, d2: 3.078 }
    },
    
    /**
     * Calculate X-bar and R control chart limits
     * @param {Array} subgroups - Array of subgroup arrays
     * @returns {Object} Control chart limits and analysis
     */
    controlChartXbarR: function(subgroups) {
        const n = subgroups[0].length; // Subgroup size
        const k = subgroups.length; // Number of subgroups
        
        if (!this.CONSTANTS[n]) {
            throw new Error(`Subgroup size ${n} not supported (use 2-10)`);
        }
        
        const { A2, D3, D4, d2 } = this.CONSTANTS[n];
        
        // Calculate means and ranges for each subgroup
        const means = subgroups.map(sg => sg.reduce((a, b) => a + b, 0) / n);
        const ranges = subgroups.map(sg => Math.max(...sg) - Math.min(...sg));
        
        // Grand mean and average range
        const xBar = means.reduce((a, b) => a + b, 0) / k;
        const rBar = ranges.reduce((a, b) => a + b, 0) / k;
        
        // Estimate sigma
        const sigma = rBar / d2;
        
        // Control limits
        const xBar_UCL = xBar + A2 * rBar;
        const xBar_LCL = xBar - A2 * rBar;
        const R_UCL = D4 * rBar;
        const R_LCL = D3 * rBar;
        
        // Check for out of control points
        const xBarOOC = means.filter((m, i) => m > xBar_UCL || m < xBar_LCL);
        const rangeOOC = ranges.filter(r => r > R_UCL || r < R_LCL);
        
        return {
            subgroupSize: n,
            numSubgroups: k,
            grandMean: xBar,
            averageRange: rBar,
            estimatedSigma: sigma,
            xBarChart: {
                centerLine: xBar,
                UCL: xBar_UCL,
                LCL: xBar_LCL,
                outOfControl: xBarOOC.length
            },
            rangeChart: {
                centerLine: rBar,
                UCL: R_UCL,
                LCL: R_LCL,
                outOfControl: rangeOOC.length
            },
            inControl: xBarOOC.length === 0 && rangeOOC.length === 0,
            data: { means, ranges }
        };
    },
    
    /**
     * Calculate process capability indices
     * @param {number} USL - Upper specification limit
     * @param {number} LSL - Lower specification limit
     * @param {number} mean - Process mean
     * @param {number} sigma - Process standard deviation
     * @returns {Object} Capability analysis
     */
    processCapability: function(USL, LSL, mean, sigma) {
        // Cp - potential capability (ignores centering)
        const Cp = (USL - LSL) / (6 * sigma);
        
        // Cpk - actual capability (accounts for centering)
        const Cpu = (USL - mean) / (3 * sigma);
        const Cpl = (mean - LSL) / (3 * sigma);
        const Cpk = Math.min(Cpu, Cpl);
        
        // Cpm - Taguchi capability (includes target)
        const target = (USL + LSL) / 2;
        const Cpm = Cp / Math.sqrt(1 + Math.pow((mean - target) / sigma, 2));
        
        // PPM out of spec (assuming normal distribution)
        const ppmLower = this._normalCDF((LSL - mean) / sigma) * 1e6;
        const ppmUpper = (1 - this._normalCDF((USL - mean) / sigma)) * 1e6;
        const ppmTotal = ppmLower + ppmUpper;
        
        // Sigma level
        const sigmaLevel = this._sigmaLevel(Cpk);
        
        return {
            Cp,
            Cpk,
            Cpu,
            Cpl,
            Cpm,
            sigmaLevel,
            ppm: {
                lower: Math.round(ppmLower),
                upper: Math.round(ppmUpper),
                total: Math.round(ppmTotal)
            },
            rating: this._capabilityRating(Cpk),
            centered: Math.abs(mean - target) < sigma * 0.5
        };
    },
    
    _normalCDF: function(z) {
        // Approximation of standard normal CDF
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;
        
        const sign = z < 0 ? -1 : 1;
        z = Math.abs(z) / Math.sqrt(2);
        
        const t = 1.0 / (1.0 + p * z);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
        
        return 0.5 * (1.0 + sign * y);
    },
    
    _sigmaLevel: function(Cpk) {
        return Cpk * 3;
    },
    
    _capabilityRating: function(Cpk) {
        if (Cpk >= 2.0) return 'World Class (Six Sigma)';
        if (Cpk >= 1.67) return 'Excellent';
        if (Cpk >= 1.33) return 'Good';
        if (Cpk >= 1.0) return 'Marginal';
        if (Cpk >= 0.67) return 'Poor';
        return 'Incapable';
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: CUTTING PROCESS PHYSICS (MIT 2.830J)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_CUTTING_PHYSICS = {
    
    /**
     * Merchant's Circle cutting force analysis
     * @param {Object} params - Cutting parameters
     * @returns {Object} Force analysis
     */
    merchantForces: function(params) {
        const {
            chipThickness_mm = 0.1,     // Uncut chip thickness t1
            chipWidth_mm = 2,            // Width of cut b
            rakeAngle_deg = 10,          // Tool rake angle α
            frictionAngle_deg = 35,      // Friction angle β
            shearStrength_MPa = 400      // Material shear strength τs
        } = params;
        
        const t1 = chipThickness_mm;
        const b = chipWidth_mm;
        const alpha = rakeAngle_deg * Math.PI / 180;
        const beta = frictionAngle_deg * Math.PI / 180;
        const tau_s = shearStrength_MPa;
        
        // Shear angle from Merchant's equation
        // 2φ + β - α = π/2
        const phi = (Math.PI / 4) - (beta - alpha) / 2;
        
        // Chip ratio
        const rc = Math.cos(phi - alpha) / Math.cos(alpha);
        
        // Shear area
        const As = (b * t1) / Math.sin(phi);
        
        // Shear force
        const Fs = tau_s * As;
        
        // Cutting force (tangential)
        const Fc = Fs * Math.cos(beta - alpha) / Math.cos(phi + beta - alpha);
        
        // Thrust force (normal)
        const Ft = Fs * Math.sin(beta - alpha) / Math.cos(phi + beta - alpha);
        
        // Friction force
        const Ff = Fc * Math.sin(beta) + Ft * Math.cos(beta);
        
        // Normal force on rake face
        const Fn = Fc * Math.cos(beta) - Ft * Math.sin(beta);
        
        // Coefficient of friction
        const mu = Math.tan(beta);
        
        return {
            shearAngle_deg: phi * 180 / Math.PI,
            chipRatio: rc,
            cuttingForce_N: Fc,
            thrustForce_N: Ft,
            shearForce_N: Fs,
            frictionForce_N: Ff,
            normalForce_N: Fn,
            coefficientOfFriction: mu,
            specificCuttingEnergy_J_mm3: Fc / (b * t1),
            shearArea_mm2: As
        };
    },
    
    /**
     * Taylor tool life equation
     * @param {number} speed_mpm - Cutting speed in m/min
     * @param {Object} material - Tool/workpiece material properties
     * @returns {Object} Tool life prediction
     */
    taylorToolLife: function(speed_mpm, material = {}) {
        const {
            n = 0.25,           // Taylor exponent
            C = 300,            // Taylor constant
            feed_mm = 0.2,      // Feed per rev
            doc_mm = 2,         // Depth of cut
            m = 0.15,           // Feed exponent
            p = 0.08            // DOC exponent
        } = material;
        
        // Extended Taylor: V × T^n × f^m × d^p = C
        // Solving for T: T = (C / (V × f^m × d^p))^(1/n)
        const T = Math.pow(C / (speed_mpm * Math.pow(feed_mm, m) * Math.pow(doc_mm, p)), 1/n);
        
        return {
            speed_mpm,
            toolLife_min: T,
            taylorN: n,
            taylorC: C,
            feed_mm,
            doc_mm,
            // Additional analytics
            doublingSpeedReduction: (1 - Math.pow(0.5, 1/n)) * 100, // % life lost if speed doubles
            optimalSpeed: C * Math.pow(T / 60, -n) // For 1-hour tool life
        };
    },
    
    /**
     * Cutting temperature estimation
     * @param {Object} params - Process parameters
     * @returns {Object} Temperature analysis
     */
    cuttingTemperature: function(params) {
        const {
            speed_mpm = 100,
            feed_mm = 0.2,
            specificEnergy_J_mm3 = 3.5,
            conductivity_W_mK = 50,    // Workpiece thermal conductivity
            density_kg_m3 = 7850,       // Workpiece density
            specificHeat_J_kgK = 500    // Workpiece specific heat
        } = params;
        
        // Thermal diffusivity
        const alpha = conductivity_W_mK / (density_kg_m3 * specificHeat_J_kgK);
        
        // Characteristic length (feed)
        const L = feed_mm / 1000; // m
        
        // Chip temperature rise (Trigger equation simplified)
        const V = speed_mpm / 60; // m/s
        const deltaT = (0.4 * specificEnergy_J_mm3 * 1e9 * V) / 
                       (density_kg_m3 * specificHeat_J_kgK * Math.sqrt(alpha * L));
        
        // Approximate temperatures
        const ambientTemp = 25;
        const chipTemp = ambientTemp + deltaT;
        const toolTemp = ambientTemp + deltaT * 0.7; // Tool sees ~70% of chip temp
        const workpieceTemp = ambientTemp + deltaT * 0.1; // Workpiece sees ~10%
        
        return {
            speed_mpm,
            chipTemperature_C: Math.round(chipTemp),
            toolTemperature_C: Math.round(toolTemp),
            workpieceTemperature_C: Math.round(workpieceTemp),
            temperatureRise_C: Math.round(deltaT),
            heatPartition: {
                chip_percent: 70,
                tool_percent: 20,
                workpiece_percent: 10
            }
        };
    },
    
    /**
     * Stability lobe diagram calculation
     * @param {Object} machineParams - Machine dynamic parameters
     * @param {Object} cuttingParams - Cutting parameters
     * @returns {Object} Stability analysis
     */
    stabilityLobes: function(machineParams, cuttingParams) {
        const {
            naturalFreq_Hz = 500,
            damping = 0.03,
            stiffness_N_um = 50
        } = machineParams;
        
        const {
            specificForce_N_mm2 = 2000,
            numTeeth = 4
        } = cuttingParams;
        
        const omega_n = 2 * Math.PI * naturalFreq_Hz;
        const Ks = specificForce_N_um * 1000; // N/m per mm DOC
        
        // Calculate stability lobes
        const lobes = [];
        for (let k = 0; k < 5; k++) { // First 5 lobes
            const points = [];
            for (let ratio = 0.5; ratio <= 1.5; ratio += 0.01) {
                const omega = omega_n * ratio;
                
                // Transfer function real part
                const G_real = -omega_n * omega_n * (omega_n * omega_n - omega * omega) /
                    (Math.pow(omega_n * omega_n - omega * omega, 2) + 
                     Math.pow(2 * damping * omega_n * omega, 2));
                
                // Critical depth of cut
                const b_lim = -1 / (2 * Ks * G_real);
                
                if (b_lim > 0 && b_lim < 20) {
                    // Spindle speed for this frequency
                    const epsilon = Math.atan2(2 * damping * omega_n * omega, 
                                               omega_n * omega_n - omega * omega);
                    const N = 60 * omega / (2 * Math.PI * (k + epsilon / (2 * Math.PI)));
                    
                    if (N > 0 && N < 50000) {
                        points.push({ rpm: N, doc_mm: b_lim });
                    }
                }
            }
            if (points.length > 0) {
                lobes.push({ lobe: k, points });
            }
        }
        
        // Find sweet spots (local maxima)
        const sweetSpots = lobes.flatMap(l => {
            const maxPoint = l.points.reduce((max, p) => 
                p.doc_mm > max.doc_mm ? p : max, l.points[0]);
            return { lobe: l.lobe, rpm: Math.round(maxPoint.rpm), doc_mm: maxPoint.doc_mm.toFixed(2) };
        });
        
        return {
            naturalFrequency_Hz: naturalFreq_Hz,
            damping,
            stiffness_N_um,
            lobes,
            sweetSpots,
            recommendation: sweetSpots.length > 0 ? 
                `Optimal spindle speeds: ${sweetSpots.map(s => s.rpm + ' RPM').join(', ')}` :
                'Consider reducing speed or depth of cut'
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: DESIGN FOR MANUFACTURING (MIT 2.72)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_DFM = {
    
    /**
     * Tolerance stackup analysis
     * @param {Array} tolerances - Array of {name, nominal, tolerance, distribution}
     * @param {string} method - 'worst_case', 'rss', 'monte_carlo'
     * @returns {Object} Stackup analysis
     */
    toleranceStackup: function(tolerances, method = 'rss') {
        const nominalStack = tolerances.reduce((sum, t) => sum + t.nominal, 0);
        const toleranceValues = tolerances.map(t => t.tolerance);
        
        let totalTolerance;
        switch (method) {
            case 'worst_case':
                totalTolerance = toleranceValues.reduce((sum, t) => sum + Math.abs(t), 0);
                break;
            case 'rss':
                totalTolerance = Math.sqrt(toleranceValues.reduce((sum, t) => sum + t * t, 0));
                break;
            case 'monte_carlo':
                // Simulate 10000 assemblies
                const simulations = 10000;
                const results = [];
                for (let i = 0; i < simulations; i++) {
                    const assembly = tolerances.reduce((sum, t) => {
                        const variation = (Math.random() - 0.5) * 2 * t.tolerance;
                        return sum + t.nominal + variation;
                    }, 0);
                    results.push(assembly);
                }
                const mean = results.reduce((a, b) => a + b, 0) / simulations;
                const variance = results.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / simulations;
                totalTolerance = 3 * Math.sqrt(variance); // 3-sigma
                break;
        }
        
        return {
            method,
            nominalDimension: nominalStack,
            totalTolerance: totalTolerance,
            minDimension: nominalStack - totalTolerance,
            maxDimension: nominalStack + totalTolerance,
            contributors: tolerances.map(t => ({
                name: t.name,
                nominal: t.nominal,
                tolerance: t.tolerance,
                percentContribution: (method === 'rss' ? 
                    (t.tolerance * t.tolerance / (totalTolerance * totalTolerance) * 100).toFixed(1) :
                    (Math.abs(t.tolerance) / toleranceValues.reduce((s, v) => s + Math.abs(v), 0) * 100).toFixed(1)
                )
            }))
        };
    },
    
    /**
     * Bolt joint preload calculation
     * @param {Object} params - Joint parameters
     * @returns {Object} Preload analysis
     */
    boltPreload: function(params) {
        const {
            torque_Nm = 25,
            diameter_mm = 10,
            nutFactor = 0.2,        // K factor
            yieldStrength_MPa = 640, // Bolt yield strength
            threadPitch_mm = 1.5,
            clamping_mm = 20
        } = params;
        
        const d = diameter_mm;
        const T = torque_Nm * 1000; // N·mm
        const K = nutFactor;
        
        // Preload force: F = T / (K × d)
        const preload_N = T / (K * d);
        
        // Bolt stress area (approximate)
        const d2 = d - 0.6495 * threadPitch_mm;
        const stressArea_mm2 = Math.PI / 4 * Math.pow((d2 + (d - threadPitch_mm)) / 2, 2);
        
        // Bolt stress
        const boltStress_MPa = preload_N / stressArea_mm2;
        const safetyFactor = yieldStrength_MPa / boltStress_MPa;
        
        // Bolt stiffness (approximate)
        const E_steel = 207000; // MPa
        const boltLength = clamping_mm + 0.5 * d;
        const K_bolt = E_steel * stressArea_mm2 / boltLength; // N/mm
        
        // Clamped material stiffness (rule of thumb: 3x bolt stiffness)
        const K_clamp = 3 * K_bolt;
        
        // Load factor
        const loadFactor = K_bolt / (K_bolt + K_clamp);
        
        return {
            torque_Nm,
            preload_N: Math.round(preload_N),
            boltStress_MPa: Math.round(boltStress_MPa),
            safetyFactor: safetyFactor.toFixed(2),
            stressArea_mm2: stressArea_mm2.toFixed(1),
            boltStiffness_N_mm: Math.round(K_bolt),
            clampStiffness_N_mm: Math.round(K_clamp),
            loadFactor: loadFactor.toFixed(3),
            recommendation: safetyFactor < 1.5 ? 
                'Warning: Low safety factor - reduce torque or use larger bolt' :
                safetyFactor > 3 ? 'Consider increasing torque for better clamping' :
                'Good preload for typical applications'
        };
    },
    
    /**
     * Fatigue analysis using Modified Goodman
     * @param {Object} params - Loading and material parameters
     * @returns {Object} Fatigue analysis
     */
    fatigueGoodman: function(params) {
        const {
            alternatingStress_MPa = 100,
            meanStress_MPa = 50,
            ultimateStrength_MPa = 500,
            enduranceLimit_MPa = 250,
            surfaceFactor = 0.9,
            sizeFactor = 0.85,
            loadFactor = 1.0,
            tempFactor = 1.0,
            reliabilityFactor = 0.897 // 90% reliability
        } = params;
        
        const Sa = alternatingStress_MPa;
        const Sm = meanStress_MPa;
        const Sut = ultimateStrength_MPa;
        const Se_prime = enduranceLimit_MPa;
        
        // Modified endurance limit
        const Se = surfaceFactor * sizeFactor * loadFactor * tempFactor * reliabilityFactor * Se_prime;
        
        // Modified Goodman: Sa/Se + Sm/Sut = 1/n
        const n = 1 / (Sa/Se + Sm/Sut);
        
        // Soderberg (more conservative): Sa/Se + Sm/Sy = 1/n
        const Sy = 0.9 * Sut; // Approximate yield
        const n_soderberg = 1 / (Sa/Se + Sm/Sy);
        
        // Gerber (less conservative): Sa/Se + (Sm/Sut)² = 1/n
        const n_gerber = 1 / (Sa/Se + Math.pow(Sm/Sut, 2));
        
        return {
            modifiedEnduranceLimit_MPa: Se.toFixed(1),
            safetyFactors: {
                goodman: n.toFixed(2),
                soderberg: n_soderberg.toFixed(2),
                gerber: n_gerber.toFixed(2)
            },
            recommendation: n < 1 ? 'FAILURE PREDICTED - redesign required' :
                           n < 1.5 ? 'Marginal design - consider increasing strength' :
                           n < 2.5 ? 'Acceptable for general applications' :
                           'Conservative design - could optimize',
            infiniteLife: n >= 1,
            modificationFactors: {
                surface: surfaceFactor,
                size: sizeFactor,
                load: loadFactor,
                temperature: tempFactor,
                reliability: reliabilityFactor
            }
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: MICRO/NANO DESIGN (MIT 2.76)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_MICRO_DESIGN = {
    
    /**
     * Blade flexure stiffness calculation
     * @param {Object} params - Flexure geometry
     * @returns {Object} Stiffness analysis
     */
    bladeFlexure: function(params) {
        const {
            length_mm = 10,
            width_mm = 5,
            thickness_mm = 0.5,
            youngsModulus_GPa = 200 // Steel
        } = params;
        
        const L = length_mm;
        const b = width_mm;
        const t = thickness_mm;
        const E = youngsModulus_GPa * 1000; // MPa
        
        // Moment of inertia
        const I = b * Math.pow(t, 3) / 12;
        
        // Axial stiffness
        const K_axial = E * b * t / L;
        
        // Bending stiffness (transverse)
        const K_bending = E * b * Math.pow(t, 3) / (4 * Math.pow(L, 3));
        
        // Stiffness ratio (high is good for single-DOF constraint)
        const stiffnessRatio = K_axial / K_bending;
        
        // Maximum deflection before yield (assuming 500 MPa yield)
        const yieldStress = 500; // MPa
        const maxDeflection = yieldStress * Math.pow(L, 2) / (3 * E * t);
        
        return {
            axialStiffness_N_mm: K_axial.toFixed(1),
            bendingStiffness_N_mm: K_bending.toFixed(4),
            stiffnessRatio: stiffnessRatio.toFixed(0),
            momentOfInertia_mm4: I.toFixed(6),
            maxDeflection_mm: maxDeflection.toFixed(3),
            recommendation: stiffnessRatio > 1000 ? 
                'Excellent single-DOF constraint' : 
                'Consider thinner blade for better ratio'
        };
    },
    
    /**
     * Scaling law analysis
     * @param {number} scaleFactor - Size reduction factor
     * @returns {Object} How properties scale
     */
    scalingLaws: function(scaleFactor) {
        const L = scaleFactor;
        
        return {
            scaleFactor: L,
            volume: Math.pow(L, 3),
            surfaceArea: Math.pow(L, 2),
            mass: Math.pow(L, 3),
            surfaceForces: Math.pow(L, 2),
            volumeForces: Math.pow(L, 3),
            stiffness: L,
            naturalFrequency: 1 / L,
            stress: 1, // Constant for same loading
            strain: 1, // Constant for same loading
            heatCapacity: Math.pow(L, 3),
            heatTransfer: Math.pow(L, 2),
            thermalTimeConstant: L,
            surfaceToVolumeRatio: 1 / L,
            dominantForces: L < 1 ? 'Surface forces dominate' : 'Body forces dominate',
            thermalBehavior: L < 1 ? 'Fast thermal response' : 'Slow thermal response',
            vibrationBehavior: L < 1 ? 'Higher natural frequencies' : 'Lower natural frequencies'
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// GATEWAY ROUTES REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

const BATCH15_GATEWAY_ROUTES = {
    // Precision Design (MIT 2.75)
    'precision.error.abbe': 'PRISM_PRECISION_DESIGN.abbeError',
    'precision.thermal.expansion': 'PRISM_PRECISION_DESIGN.thermalExpansion',
    'precision.error.budget': 'PRISM_PRECISION_DESIGN.errorBudget',
    'precision.coupling.kinematic': 'PRISM_PRECISION_DESIGN.kinematicCoupling',
    'precision.bearing.hydrostatic': 'PRISM_PRECISION_DESIGN.hydrostaticBearing',
    'precision.leadscrew.critical': 'PRISM_PRECISION_DESIGN.leadscrewCriticalSpeed',
    
    // SPC (MIT 2.830J)
    'spc.control.xbar_r': 'PRISM_SPC.controlChartXbarR',
    'spc.capability.cpk': 'PRISM_SPC.processCapability',
    
    // Cutting Physics (MIT 2.830J)
    'cutting.merchant.forces': 'PRISM_CUTTING_PHYSICS.merchantForces',
    'cutting.taylor.toollife': 'PRISM_CUTTING_PHYSICS.taylorToolLife',
    'cutting.temperature': 'PRISM_CUTTING_PHYSICS.cuttingTemperature',
    'cutting.stability.lobes': 'PRISM_CUTTING_PHYSICS.stabilityLobes',
    
    // DFM (MIT 2.72)
    'dfm.tolerance.stackup': 'PRISM_DFM.toleranceStackup',
    'dfm.bolt.preload': 'PRISM_DFM.boltPreload',
    'dfm.fatigue.goodman': 'PRISM_DFM.fatigueGoodman',
    
    // Micro Design (MIT 2.76)
    'micro.flexure.blade': 'PRISM_MICRO_DESIGN.bladeFlexure',
    'micro.scaling.laws': 'PRISM_MICRO_DESIGN.scalingLaws'
};

// Auto-register routes with PRISM_GATEWAY
function registerBatch15Routes() {
    if (typeof PRISM_GATEWAY !== 'undefined') {
        for (const [route, target] of Object.entries(BATCH15_GATEWAY_ROUTES)) {
            PRISM_GATEWAY.register(route, target);
        }
        console.log(`[Batch 15] Registered ${Object.keys(BATCH15_GATEWAY_ROUTES).length} routes`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SELF-TESTS
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_MIT_BATCH_15_TESTS = {
    runAll: function() {
        console.log('\n[PRISM MIT Batch 15] Running Self-Tests...\n');
        let passed = 0;
        let failed = 0;
        
        // Test 1: Abbe Error
        try {
            const abbe = PRISM_PRECISION_DESIGN.abbeError(100, 1);
            if (Math.abs(abbe.positionError_um - 0.485) < 0.01) {
                console.log('✓ Abbe error calculation');
                passed++;
            } else {
                throw new Error(`Expected ~0.485 μm, got ${abbe.positionError_um}`);
            }
        } catch (e) {
            console.log('✗ Abbe error:', e.message);
            failed++;
        }
        
        // Test 2: Thermal Expansion
        try {
            const thermal = PRISM_PRECISION_DESIGN.thermalExpansion(1000, 10, 'aluminum');
            if (Math.abs(thermal.expansion_um - 230) < 5) {
                console.log('✓ Thermal expansion calculation');
                passed++;
            } else {
                throw new Error(`Expected ~230 μm, got ${thermal.expansion_um}`);
            }
        } catch (e) {
            console.log('✗ Thermal expansion:', e.message);
            failed++;
        }
        
        // Test 3: Process Capability
        try {
            const cap = PRISM_SPC.processCapability(10.5, 9.5, 10.0, 0.1);
            if (Math.abs(cap.Cpk - 1.667) < 0.01) {
                console.log('✓ Process capability Cpk');
                passed++;
            } else {
                throw new Error(`Expected ~1.667, got ${cap.Cpk}`);
            }
        } catch (e) {
            console.log('✗ Process capability:', e.message);
            failed++;
        }
        
        // Test 4: Merchant Forces
        try {
            const forces = PRISM_CUTTING_PHYSICS.merchantForces({
                chipThickness_mm: 0.1,
                chipWidth_mm: 2,
                rakeAngle_deg: 10,
                frictionAngle_deg: 35,
                shearStrength_MPa: 400
            });
            if (forces.cuttingForce_N > 100 && forces.thrustForce_N > 0) {
                console.log('✓ Merchant force calculation');
                passed++;
            } else {
                throw new Error('Invalid force values');
            }
        } catch (e) {
            console.log('✗ Merchant forces:', e.message);
            failed++;
        }
        
        // Test 5: Taylor Tool Life
        try {
            const taylor = PRISM_CUTTING_PHYSICS.taylorToolLife(100, { n: 0.25, C: 300 });
            if (taylor.toolLife_min > 0 && taylor.toolLife_min < 1000) {
                console.log('✓ Taylor tool life calculation');
                passed++;
            } else {
                throw new Error(`Unexpected tool life: ${taylor.toolLife_min}`);
            }
        } catch (e) {
            console.log('✗ Taylor tool life:', e.message);
            failed++;
        }
        
        // Test 6: Tolerance Stackup
        try {
            const stackup = PRISM_DFM.toleranceStackup([
                { name: 'A', nominal: 10, tolerance: 0.1 },
                { name: 'B', nominal: 20, tolerance: 0.2 },
                { name: 'C', nominal: 15, tolerance: 0.15 }
            ], 'rss');
            const expectedRSS = Math.sqrt(0.1*0.1 + 0.2*0.2 + 0.15*0.15);
            if (Math.abs(stackup.totalTolerance - expectedRSS) < 0.001) {
                console.log('✓ Tolerance stackup RSS');
                passed++;
            } else {
                throw new Error(`Expected ${expectedRSS}, got ${stackup.totalTolerance}`);
            }
        } catch (e) {
            console.log('✗ Tolerance stackup:', e.message);
            failed++;
        }
        
        // Test 7: Blade Flexure
        try {
            const flexure = PRISM_MICRO_DESIGN.bladeFlexure({
                length_mm: 10,
                width_mm: 5,
                thickness_mm: 0.5
            });
            if (parseFloat(flexure.stiffnessRatio) > 100) {
                console.log('✓ Blade flexure stiffness');
                passed++;
            } else {
                throw new Error(`Low stiffness ratio: ${flexure.stiffnessRatio}`);
            }
        } catch (e) {
            console.log('✗ Blade flexure:', e.message);
            failed++;
        }
        
        console.log(`\nResults: ${passed}/${passed + failed} tests passed`);
        return { passed, failed };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PRISM_PRECISION_DESIGN,
        PRISM_SPC,
        PRISM_CUTTING_PHYSICS,
        PRISM_DFM,
        PRISM_MICRO_DESIGN,
        BATCH15_GATEWAY_ROUTES,
        registerBatch15Routes,
        PRISM_MIT_BATCH_15_TESTS
    };
}

if (typeof window !== 'undefined') {
    window.PRISM_PRECISION_DESIGN = PRISM_PRECISION_DESIGN;
    window.PRISM_SPC = PRISM_SPC;
    window.PRISM_CUTTING_PHYSICS = PRISM_CUTTING_PHYSICS;
    window.PRISM_DFM = PRISM_DFM;
    window.PRISM_MICRO_DESIGN = PRISM_MICRO_DESIGN;
    registerBatch15Routes();
}

console.log('[PRISM MIT Batch 15] High Priority Manufacturing loaded - 17 routes');
console.log('[PRISM MIT Batch 15] Courses: 2.43, 2.72, 2.75 (Slocum), 2.76, 2.830J');
/**
 * PRISM MIT Course Knowledge - Batch 16
 * MATERIALS SCIENCE: Properties, Mechanics, Behavior, Kinetics
 * Source: MIT 3.021J, 3.11, 3.15, 3.21, 3.22
 * Generated: January 18, 2026
 */

console.log('[PRISM MIT Batch 16] Loading Materials Science Knowledge...');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: STRESS AND STRAIN ANALYSIS (MIT 3.11)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_STRESS_ANALYSIS = {
    
    /**
     * Calculate Von Mises equivalent stress
     * @param {Object} stress - Stress tensor components
     * @returns {Object} Von Mises stress and analysis
     */
    vonMises: function(stress) {
        const {
            sigma_x = 0, sigma_y = 0, sigma_z = 0,
            tau_xy = 0, tau_yz = 0, tau_xz = 0
        } = stress;
        
        // Von Mises formula
        const vm = Math.sqrt(
            0.5 * (
                Math.pow(sigma_x - sigma_y, 2) +
                Math.pow(sigma_y - sigma_z, 2) +
                Math.pow(sigma_z - sigma_x, 2) +
                6 * (tau_xy * tau_xy + tau_yz * tau_yz + tau_xz * tau_xz)
            )
        );
        
        // Hydrostatic stress
        const hydrostatic = (sigma_x + sigma_y + sigma_z) / 3;
        
        // Deviatoric stresses
        const s_x = sigma_x - hydrostatic;
        const s_y = sigma_y - hydrostatic;
        const s_z = sigma_z - hydrostatic;
        
        return {
            vonMises_MPa: vm,
            hydrostatic_MPa: hydrostatic,
            deviatoric: { s_x, s_y, s_z },
            triaxiality: hydrostatic / (vm || 1),
            inputStress: stress
        };
    },
    
    /**
     * Calculate principal stresses from stress tensor
     * @param {Object} stress - Stress tensor components
     * @returns {Object} Principal stresses and directions
     */
    principalStresses: function(stress) {
        const {
            sigma_x = 0, sigma_y = 0, sigma_z = 0,
            tau_xy = 0, tau_yz = 0, tau_xz = 0
        } = stress;
        
        // Stress invariants
        const I1 = sigma_x + sigma_y + sigma_z;
        const I2 = sigma_x * sigma_y + sigma_y * sigma_z + sigma_z * sigma_x
                   - tau_xy * tau_xy - tau_yz * tau_yz - tau_xz * tau_xz;
        const I3 = sigma_x * sigma_y * sigma_z 
                   + 2 * tau_xy * tau_yz * tau_xz
                   - sigma_x * tau_yz * tau_yz 
                   - sigma_y * tau_xz * tau_xz 
                   - sigma_z * tau_xy * tau_xy;
        
        // Solve cubic equation: σ³ - I1σ² + I2σ - I3 = 0
        // Using trigonometric solution for real roots
        const p = I2 - I1 * I1 / 3;
        const q = 2 * Math.pow(I1 / 3, 3) - I1 * I2 / 3 + I3;
        
        let sigma1, sigma2, sigma3;
        
        if (Math.abs(p) < 1e-10) {
            // Special case: nearly hydrostatic
            sigma1 = sigma2 = sigma3 = I1 / 3;
        } else {
            const phi = Math.acos(Math.max(-1, Math.min(1, 
                3 * q / (2 * p) * Math.sqrt(-3 / p)))) / 3;
            const t = 2 * Math.sqrt(-p / 3);
            
            sigma1 = t * Math.cos(phi) + I1 / 3;
            sigma2 = t * Math.cos(phi - 2 * Math.PI / 3) + I1 / 3;
            sigma3 = t * Math.cos(phi - 4 * Math.PI / 3) + I1 / 3;
        }
        
        // Sort: σ1 > σ2 > σ3
        const principals = [sigma1, sigma2, sigma3].sort((a, b) => b - a);
        
        // Maximum shear stress (Tresca)
        const tau_max = (principals[0] - principals[2]) / 2;
        
        return {
            sigma1: principals[0],
            sigma2: principals[1],
            sigma3: principals[2],
            maxShear_MPa: tau_max,
            invariants: { I1, I2, I3 },
            meanStress: I1 / 3
        };
    },
    
    /**
     * Convert engineering strain to true strain
     * @param {number} engStrain - Engineering strain (decimal, e.g., 0.1 for 10%)
     * @returns {Object} Strain conversions
     */
    trueStrain: function(engStrain) {
        const trueStrain = Math.log(1 + engStrain);
        const stretchRatio = 1 + engStrain;
        
        return {
            engineeringStrain: engStrain,
            engineeringStrain_percent: engStrain * 100,
            trueStrain: trueStrain,
            trueStrain_percent: trueStrain * 100,
            stretchRatio: stretchRatio,
            // For constant volume plasticity
            trueStress_factor: stretchRatio // σ_true = σ_eng × (1 + ε_eng)
        };
    },
    
    /**
     * Convert between elastic constants
     * @param {Object} known - Known elastic constants
     * @returns {Object} All elastic constants
     */
    elasticConstants: function(known) {
        let E, G, K, nu, lambda;
        
        if (known.E && known.nu) {
            E = known.E;
            nu = known.nu;
            G = E / (2 * (1 + nu));
            K = E / (3 * (1 - 2 * nu));
            lambda = E * nu / ((1 + nu) * (1 - 2 * nu));
        } else if (known.E && known.G) {
            E = known.E;
            G = known.G;
            nu = E / (2 * G) - 1;
            K = E / (3 * (1 - 2 * nu));
            lambda = G * (E - 2 * G) / (3 * G - E);
        } else if (known.K && known.G) {
            K = known.K;
            G = known.G;
            E = 9 * K * G / (3 * K + G);
            nu = (3 * K - 2 * G) / (2 * (3 * K + G));
            lambda = K - 2 * G / 3;
        } else if (known.lambda && known.G) {
            lambda = known.lambda;
            G = known.G;
            E = G * (3 * lambda + 2 * G) / (lambda + G);
            nu = lambda / (2 * (lambda + G));
            K = lambda + 2 * G / 3;
        } else {
            throw new Error('Provide (E, nu), (E, G), (K, G), or (lambda, G)');
        }
        
        // Verify relationships
        const verification = {
            E_check: 9 * K * G / (3 * K + G),
            nu_check: (3 * K - 2 * G) / (2 * (3 * K + G))
        };
        
        return {
            E_MPa: E,
            G_MPa: G,
            K_MPa: K,
            nu: nu,
            lambda_MPa: lambda,
            description: {
                E: "Young's modulus (tension/compression)",
                G: "Shear modulus",
                K: "Bulk modulus (volumetric)",
                nu: "Poisson's ratio",
                lambda: "Lamé's first parameter"
            }
        };
    },
    
    /**
     * Beam deflection calculations
     * @param {Object} params - Beam parameters
     * @returns {Object} Deflection analysis
     */
    beamDeflection: function(params) {
        const {
            type = 'cantilever_point',
            length_mm,
            E_MPa,
            I_mm4,
            load_N,
            loadPosition_mm = null
        } = params;
        
        const L = length_mm;
        const EI = E_MPa * I_mm4;
        const P = load_N;
        
        let maxDeflection, maxLocation, formula;
        
        switch (type) {
            case 'cantilever_point':
                // Point load at end
                maxDeflection = P * Math.pow(L, 3) / (3 * EI);
                maxLocation = L;
                formula = 'δ = PL³/(3EI)';
                break;
                
            case 'cantilever_uniform':
                // Uniform load
                maxDeflection = P * Math.pow(L, 4) / (8 * EI);
                maxLocation = L;
                formula = 'δ = wL⁴/(8EI)';
                break;
                
            case 'simply_supported_center':
                // Point load at center
                maxDeflection = P * Math.pow(L, 3) / (48 * EI);
                maxLocation = L / 2;
                formula = 'δ = PL³/(48EI)';
                break;
                
            case 'simply_supported_uniform':
                // Uniform load
                maxDeflection = 5 * P * Math.pow(L, 4) / (384 * EI);
                maxLocation = L / 2;
                formula = 'δ = 5wL⁴/(384EI)';
                break;
                
            case 'fixed_fixed_center':
                // Fixed-fixed, point load at center
                maxDeflection = P * Math.pow(L, 3) / (192 * EI);
                maxLocation = L / 2;
                formula = 'δ = PL³/(192EI)';
                break;
                
            default:
                throw new Error(`Unknown beam type: ${type}`);
        }
        
        return {
            type,
            maxDeflection_mm: maxDeflection,
            maxLocation_mm: maxLocation,
            formula,
            stiffness_N_per_mm: P / maxDeflection,
            inputs: { length_mm, E_MPa, I_mm4, load_N }
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: DIFFUSION AND KINETICS (MIT 3.21)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_KINETICS = {
    
    /**
     * Calculate diffusion coefficient using Arrhenius equation
     * @param {number} temperature_C - Temperature in Celsius
     * @param {Object} material - Diffusion parameters
     * @returns {Object} Diffusion coefficient and analysis
     */
    diffusionCoefficient: function(temperature_C, material = {}) {
        const {
            D0_m2_s = 1e-4,           // Pre-exponential factor
            Q_kJ_mol = 150,           // Activation energy
            name = 'Custom'
        } = material;
        
        const T_K = temperature_C + 273.15;
        const R = 8.314; // J/(mol·K)
        const Q = Q_kJ_mol * 1000; // Convert to J/mol
        
        // D = D0 × exp(-Q/RT)
        const D = D0_m2_s * Math.exp(-Q / (R * T_K));
        
        // Characteristic diffusion distance in 1 hour
        const x_1hr = Math.sqrt(D * 3600) * 1000; // mm
        
        return {
            material: name,
            temperature_C,
            temperature_K: T_K,
            D_m2_s: D,
            D_cm2_s: D * 1e4,
            diffusionLength_1hr_mm: x_1hr,
            diffusionLength_1hr_um: x_1hr * 1000,
            parameters: { D0_m2_s, Q_kJ_mol }
        };
    },
    
    /**
     * Diffusion profile for semi-infinite solid
     * @param {Object} params - Diffusion parameters
     * @returns {Object} Concentration profile
     */
    diffusionProfile: function(params) {
        const {
            C0 = 0,                   // Initial concentration
            Cs = 1,                   // Surface concentration
            D_m2_s,                   // Diffusion coefficient
            time_s,                   // Time in seconds
            depths_mm = [0, 0.1, 0.2, 0.5, 1, 2, 5] // Depths to calculate
        } = params;
        
        const profile = depths_mm.map(x_mm => {
            const x = x_mm / 1000; // Convert to meters
            const argument = x / (2 * Math.sqrt(D_m2_s * time_s));
            const erf_val = this._erf(argument);
            const C = C0 + (Cs - C0) * (1 - erf_val);
            
            return {
                depth_mm: x_mm,
                depth_um: x_mm * 1000,
                concentration: C,
                normalized: (C - C0) / (Cs - C0)
            };
        });
        
        // Characteristic diffusion length
        const diffLength = Math.sqrt(D_m2_s * time_s) * 1000; // mm
        
        return {
            C0,
            Cs,
            D_m2_s,
            time_s,
            time_hours: time_s / 3600,
            characteristicLength_mm: diffLength,
            profile
        };
    },
    
    // Error function approximation
    _erf: function(x) {
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;
        
        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x);
        
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        
        return sign * y;
    },
    
    /**
     * Calculate critical nucleus size for phase transformation
     * @param {Object} params - Nucleation parameters
     * @returns {Object} Critical nucleus analysis
     */
    criticalNucleus: function(params) {
        const {
            gamma_J_m2 = 0.5,         // Surface energy
            deltaGv_J_m3 = -1e8,      // Volume free energy change (negative for transformation)
            temperature_C = 500
        } = params;
        
        const T_K = temperature_C + 273.15;
        
        // Critical radius: r* = -2γ/ΔGv
        const r_star = -2 * gamma_J_m2 / deltaGv_J_m3;
        
        // Critical free energy: ΔG* = (16πγ³)/(3ΔGv²)
        const deltaG_star = (16 * Math.PI * Math.pow(gamma_J_m2, 3)) / 
                           (3 * Math.pow(deltaGv_J_m3, 2));
        
        // Number of atoms in critical nucleus (approximate for metallic system)
        const atomVolume = 2e-29; // m³ typical
        const n_star = (4/3) * Math.PI * Math.pow(r_star, 3) / atomVolume;
        
        // Boltzmann factor
        const kB = 1.38e-23;
        const nucleationBarrier = deltaG_star / (kB * T_K);
        
        return {
            criticalRadius_m: r_star,
            criticalRadius_nm: r_star * 1e9,
            criticalFreeEnergy_J: deltaG_star,
            criticalFreeEnergy_kT: nucleationBarrier,
            atomsInNucleus: Math.round(n_star),
            temperature_C,
            parameters: { gamma_J_m2, deltaGv_J_m3 }
        };
    },
    
    /**
     * Avrami equation for transformation kinetics
     * @param {Object} params - Transformation parameters
     * @returns {Object} Transformation fraction over time
     */
    avramiTransformation: function(params) {
        const {
            k = 0.01,                 // Rate constant (s^-n)
            n = 3,                    // Avrami exponent
            times_s = [0, 60, 120, 300, 600, 1200, 3600] // Times to calculate
        } = params;
        
        const profile = times_s.map(t => {
            // f = 1 - exp(-kt^n)
            const f = 1 - Math.exp(-k * Math.pow(t, n));
            return {
                time_s: t,
                time_min: t / 60,
                fractionTransformed: f,
                fractionRemaining: 1 - f
            };
        });
        
        // Time for 50% transformation
        const t_half = Math.pow(Math.log(2) / k, 1/n);
        
        // Interpretation of n
        let interpretation;
        if (n <= 1) interpretation = '1D growth, site saturation';
        else if (n <= 2) interpretation = '2D growth or 1D + continuous nucleation';
        else if (n <= 3) interpretation = '3D growth, site saturation';
        else interpretation = '3D growth with continuous nucleation';
        
        return {
            k,
            n,
            interpretation,
            halfTime_s: t_half,
            halfTime_min: t_half / 60,
            profile
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: MECHANICAL BEHAVIOR (MIT 3.22)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_MECHANICAL_BEHAVIOR = {
    
    /**
     * Power law (Hollomon) hardening model
     * @param {number} strain - True plastic strain
     * @param {Object} material - Material parameters
     * @returns {Object} Flow stress analysis
     */
    hollomonHardening: function(strain, material = {}) {
        const {
            K_MPa = 500,              // Strength coefficient
            n = 0.2,                  // Strain hardening exponent
            name = 'Custom'
        } = material;
        
        // σ = K × ε^n
        const stress = K_MPa * Math.pow(Math.max(strain, 1e-10), n);
        
        // Necking onset at ε = n
        const neckingStrain = n;
        const neckingStress = K_MPa * Math.pow(n, n);
        
        // Work hardening rate
        const dSigma_dEpsilon = n * stress / Math.max(strain, 1e-10);
        
        return {
            material: name,
            trueStrain: strain,
            trueStress_MPa: stress,
            workHardeningRate_MPa: dSigma_dEpsilon,
            instabilityPoint: {
                strain: neckingStrain,
                stress_MPa: neckingStress
            },
            parameters: { K_MPa, n }
        };
    },
    
    /**
     * Steady-state creep rate calculation
     * @param {Object} params - Creep parameters
     * @returns {Object} Creep rate analysis
     */
    creepRate: function(params) {
        const {
            stress_MPa = 100,
            temperature_C = 500,
            A = 1e10,                 // Pre-exponential factor
            n = 4,                    // Stress exponent
            Q_kJ_mol = 250,           // Activation energy
            mechanism = 'dislocation' // 'dislocation', 'nabarro_herring', 'coble'
        } = params;
        
        const T_K = temperature_C + 273.15;
        const R = 8.314;
        const Q = Q_kJ_mol * 1000;
        
        // ε̇ = A × σⁿ × exp(-Q/RT)
        let creepRate = A * Math.pow(stress_MPa, n) * Math.exp(-Q / (R * T_K));
        
        // For diffusion creep, adjust for grain size if provided
        let mechanismDescription;
        switch (mechanism) {
            case 'dislocation':
                mechanismDescription = 'Power-law dislocation creep (n = 3-8)';
                break;
            case 'nabarro_herring':
                mechanismDescription = 'Nabarro-Herring diffusion creep (n = 1)';
                break;
            case 'coble':
                mechanismDescription = 'Coble grain boundary diffusion (n = 1)';
                break;
            default:
                mechanismDescription = 'Custom mechanism';
        }
        
        // Time to 1% strain
        const timeTo1Percent = 0.01 / creepRate;
        
        return {
            stress_MPa,
            temperature_C,
            creepRate_per_s: creepRate,
            creepRate_per_hour: creepRate * 3600,
            timeTo1Percent_hours: timeTo1Percent / 3600,
            mechanism: mechanismDescription,
            parameters: { A, n, Q_kJ_mol }
        };
    },
    
    /**
     * Larson-Miller parameter for creep life prediction
     * @param {Object} params - LMP parameters
     * @returns {Object} Creep life prediction
     */
    larsonMiller: function(params) {
        const {
            temperature_C = 500,
            stress_MPa = 100,
            LMP = null,               // If known LMP for this stress
            C = 20,                   // LMP constant (typically 20)
            ruptureTime_hr = null     // If calculating LMP from test data
        } = params;
        
        const T_K = temperature_C + 273.15;
        
        if (ruptureTime_hr !== null) {
            // Calculate LMP from test data
            const calculatedLMP = T_K * (C + Math.log10(ruptureTime_hr));
            return {
                temperature_C,
                ruptureTime_hr,
                LMP: calculatedLMP,
                C,
                mode: 'Calculate LMP from test'
            };
        } else if (LMP !== null) {
            // Predict rupture time from known LMP
            const predictedTime = Math.pow(10, LMP / T_K - C);
            return {
                temperature_C,
                stress_MPa,
                LMP,
                predictedRuptureTime_hr: predictedTime,
                predictedRuptureTime_days: predictedTime / 24,
                predictedRuptureTime_years: predictedTime / 8760,
                C,
                mode: 'Predict life from LMP'
            };
        } else {
            throw new Error('Provide either LMP or ruptureTime_hr');
        }
    },
    
    /**
     * Basquin equation for high-cycle fatigue (S-N curve)
     * @param {Object} params - Fatigue parameters
     * @returns {Object} Fatigue life prediction
     */
    basquinFatigue: function(params) {
        const {
            stressAmplitude_MPa = null,
            cycles = null,
            sigma_f_MPa = 1000,       // Fatigue strength coefficient
            b = -0.1                  // Fatigue strength exponent
        } = params;
        
        if (stressAmplitude_MPa !== null) {
            // Calculate cycles to failure from stress
            // σ_a = σ'_f × (2N_f)^b
            // 2N_f = (σ_a / σ'_f)^(1/b)
            const twoNf = Math.pow(stressAmplitude_MPa / sigma_f_MPa, 1/b);
            const Nf = twoNf / 2;
            
            return {
                stressAmplitude_MPa,
                cyclesToFailure: Nf,
                reversals: twoNf,
                mode: 'Life from stress',
                parameters: { sigma_f_MPa, b }
            };
        } else if (cycles !== null) {
            // Calculate stress amplitude for given life
            const sigma_a = sigma_f_MPa * Math.pow(2 * cycles, b);
            
            return {
                targetCycles: cycles,
                stressAmplitude_MPa: sigma_a,
                mode: 'Stress from life',
                parameters: { sigma_f_MPa, b }
            };
        } else {
            throw new Error('Provide either stressAmplitude_MPa or cycles');
        }
    },
    
    /**
     * Coffin-Manson equation for low-cycle fatigue
     * @param {Object} params - Fatigue parameters
     * @returns {Object} Strain-life analysis
     */
    coffinManson: function(params) {
        const {
            strainAmplitude = null,   // Total strain amplitude
            cycles = null,
            E_MPa = 200000,           // Young's modulus
            sigma_f_MPa = 1000,       // Fatigue strength coefficient
            b = -0.1,                 // Fatigue strength exponent
            epsilon_f = 0.5,          // Fatigue ductility coefficient
            c = -0.6                  // Fatigue ductility exponent
        } = params;
        
        // Combined equation:
        // Δε/2 = (σ'_f/E)(2N_f)^b + ε'_f(2N_f)^c
        
        if (cycles !== null) {
            const twoNf = 2 * cycles;
            const elasticPart = (sigma_f_MPa / E_MPa) * Math.pow(twoNf, b);
            const plasticPart = epsilon_f * Math.pow(twoNf, c);
            const totalAmplitude = elasticPart + plasticPart;
            
            // Transition life (where elastic = plastic)
            const transitionLife = Math.pow(
                (epsilon_f * E_MPa / sigma_f_MPa), 
                1 / (b - c)
            ) / 2;
            
            return {
                targetCycles: cycles,
                strainAmplitude_total: totalAmplitude,
                strainAmplitude_elastic: elasticPart,
                strainAmplitude_plastic: plasticPart,
                transitionLife_cycles: transitionLife,
                regime: cycles < transitionLife ? 'Low-cycle (plastic)' : 'High-cycle (elastic)',
                parameters: { sigma_f_MPa, b, epsilon_f, c }
            };
        } else if (strainAmplitude !== null) {
            // Iteratively solve for Nf
            let Nf = 1000; // Initial guess
            for (let i = 0; i < 50; i++) {
                const twoNf = 2 * Nf;
                const calculated = (sigma_f_MPa / E_MPa) * Math.pow(twoNf, b) + 
                                  epsilon_f * Math.pow(twoNf, c);
                const ratio = strainAmplitude / calculated;
                Nf = Nf * Math.pow(ratio, 1 / Math.min(b, c));
                if (Math.abs(calculated - strainAmplitude) / strainAmplitude < 0.001) break;
            }
            
            return {
                strainAmplitude,
                cyclesToFailure: Nf,
                mode: 'Life from strain',
                parameters: { sigma_f_MPa, b, epsilon_f, c }
            };
        } else {
            throw new Error('Provide either strainAmplitude or cycles');
        }
    },
    
    /**
     * Miner's rule for cumulative fatigue damage
     * @param {Array} loadHistory - Array of {stress_MPa, cycles}
     * @param {Object} snParams - S-N curve parameters
     * @returns {Object} Damage analysis
     */
    minerDamage: function(loadHistory, snParams = {}) {
        const { sigma_f_MPa = 1000, b = -0.1 } = snParams;
        
        let totalDamage = 0;
        const details = loadHistory.map(load => {
            // Calculate Nf for this stress level
            const twoNf = Math.pow(load.stress_MPa / sigma_f_MPa, 1/b);
            const Nf = twoNf / 2;
            
            // Damage from this block
            const damage = load.cycles / Nf;
            totalDamage += damage;
            
            return {
                stress_MPa: load.stress_MPa,
                appliedCycles: load.cycles,
                allowableCycles: Nf,
                damage: damage,
                damagePercent: (damage * 100).toFixed(2)
            };
        });
        
        // Remaining life
        const damageFraction = totalDamage;
        const remainingLife = 1 - totalDamage;
        
        return {
            loadBlocks: details,
            totalDamage: totalDamage,
            damagePercent: (totalDamage * 100).toFixed(2),
            remainingLifeFraction: Math.max(0, remainingLife),
            prediction: totalDamage >= 1 ? 'FAILURE PREDICTED' : 
                        totalDamage >= 0.8 ? 'Critical - replace soon' :
                        totalDamage >= 0.5 ? 'Moderate damage' : 'Acceptable'
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: FRACTURE MECHANICS (MIT 3.22)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_FRACTURE = {
    
    /**
     * Stress intensity factor calculation
     * @param {Object} params - Crack and loading parameters
     * @returns {Object} SIF analysis
     */
    stressIntensityFactor: function(params) {
        const {
            stress_MPa,
            crackLength_mm,
            geometry = 'center_crack',  // 'center_crack', 'edge_crack', 'surface_crack'
            width_mm = null,            // Plate width for finite geometry
            thickness_mm = null
        } = params;
        
        const a = crackLength_mm / 1000; // Convert to meters for calculation
        let Y = 1; // Geometry factor
        
        switch (geometry) {
            case 'center_crack':
                if (width_mm) {
                    const W = width_mm / 1000;
                    // Secant correction
                    Y = Math.sqrt(1 / Math.cos(Math.PI * a / W));
                } else {
                    Y = 1; // Infinite plate
                }
                break;
                
            case 'edge_crack':
                if (width_mm) {
                    const W = width_mm / 1000;
                    const ratio = a / W;
                    Y = 1.12 - 0.231 * ratio + 10.55 * Math.pow(ratio, 2) - 
                        21.72 * Math.pow(ratio, 3) + 30.39 * Math.pow(ratio, 4);
                } else {
                    Y = 1.12; // Semi-infinite plate
                }
                break;
                
            case 'surface_crack':
                Y = 1.12; // Simplified
                break;
                
            default:
                Y = 1;
        }
        
        // K = Y × σ × √(πa)
        const K = Y * stress_MPa * Math.sqrt(Math.PI * a);
        
        return {
            geometry,
            stress_MPa,
            crackLength_mm,
            geometryFactor: Y,
            K_MPa_sqrt_m: K,
            K_MPa_sqrt_mm: K * Math.sqrt(1000),
            formula: 'K = Y × σ × √(πa)'
        };
    },
    
    /**
     * Paris law fatigue crack growth
     * @param {Object} params - Crack growth parameters
     * @returns {Object} Crack growth analysis
     */
    parisLaw: function(params) {
        const {
            deltaK_MPa_sqrt_m,        // Stress intensity range
            C = 1e-11,                // Paris constant (m/cycle)
            m = 3,                    // Paris exponent
            initialCrack_mm = 1,
            finalCrack_mm = 10,
            stress_MPa = 100,
            geometry = 'center_crack'
        } = params;
        
        // da/dN = C × (ΔK)^m
        const dadN = C * Math.pow(deltaK_MPa_sqrt_m, m);
        
        // Integrate for cycles (simplified for constant ΔK)
        // For variable ΔK, would need numerical integration
        const da = (finalCrack_mm - initialCrack_mm) / 1000; // meters
        const N_approx = da / dadN;
        
        // More accurate integration for center crack
        // N = ∫ da / (C × (Y×σ×√πa)^m)
        let N_integrated = 0;
        const steps = 1000;
        const da_step = (finalCrack_mm - initialCrack_mm) / steps;
        
        for (let i = 0; i < steps; i++) {
            const a = (initialCrack_mm + i * da_step) / 1000;
            const K = stress_MPa * Math.sqrt(Math.PI * a);
            const dN = (da_step / 1000) / (C * Math.pow(K, m));
            N_integrated += dN;
        }
        
        return {
            C,
            m,
            deltaK_MPa_sqrt_m,
            crackGrowthRate_m_per_cycle: dadN,
            crackGrowthRate_mm_per_cycle: dadN * 1000,
            initialCrack_mm,
            finalCrack_mm,
            estimatedCycles: Math.round(N_integrated),
            warning: m < 2 || m > 5 ? 'Unusual Paris exponent' : null
        };
    },
    
    /**
     * Fracture toughness assessment
     * @param {Object} params - Assessment parameters
     * @returns {Object} Fracture assessment
     */
    fractureToughness: function(params) {
        const {
            K_applied_MPa_sqrt_m,
            K_IC_MPa_sqrt_m,          // Plane strain fracture toughness
            yield_MPa
        } = params;
        
        // Safety factor
        const safetyFactor = K_IC_MPa_sqrt_m / K_applied_MPa_sqrt_m;
        
        // Plastic zone size (plane strain)
        const r_p = (1 / (6 * Math.PI)) * Math.pow(K_applied_MPa_sqrt_m / yield_MPa, 2);
        
        // Critical crack length
        const a_critical = Math.pow(K_IC_MPa_sqrt_m, 2) / (Math.PI * Math.pow(yield_MPa, 2));
        
        return {
            K_applied_MPa_sqrt_m,
            K_IC_MPa_sqrt_m,
            safetyFactor: safetyFactor.toFixed(2),
            plasticZoneSize_mm: r_p * 1000,
            criticalCrackLength_mm: a_critical * 1000,
            prediction: safetyFactor < 1 ? 'FRACTURE PREDICTED' :
                        safetyFactor < 1.5 ? 'Critical - take action' :
                        safetyFactor < 2 ? 'Acceptable with monitoring' : 'Safe'
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: MATERIAL PROPERTIES DATABASE (MIT 3.15)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_MATERIAL_PROPERTIES = {
    
    // Thermal and electrical properties
    properties: {
        'steel_1045': {
            name: 'Steel 1045',
            E_GPa: 205,
            nu: 0.29,
            yield_MPa: 530,
            ultimate_MPa: 625,
            density_kg_m3: 7850,
            thermalConductivity_W_mK: 49.8,
            thermalExpansion_per_K: 11.2e-6,
            specificHeat_J_kgK: 486,
            resistivity_ohm_m: 1.71e-7
        },
        'aluminum_6061': {
            name: 'Aluminum 6061-T6',
            E_GPa: 69,
            nu: 0.33,
            yield_MPa: 276,
            ultimate_MPa: 310,
            density_kg_m3: 2700,
            thermalConductivity_W_mK: 167,
            thermalExpansion_per_K: 23.6e-6,
            specificHeat_J_kgK: 896,
            resistivity_ohm_m: 3.99e-8
        },
        'titanium_6al4v': {
            name: 'Titanium 6Al-4V',
            E_GPa: 114,
            nu: 0.34,
            yield_MPa: 880,
            ultimate_MPa: 950,
            density_kg_m3: 4430,
            thermalConductivity_W_mK: 6.7,
            thermalExpansion_per_K: 8.6e-6,
            specificHeat_J_kgK: 526,
            resistivity_ohm_m: 1.78e-6
        },
        'inconel_718': {
            name: 'Inconel 718',
            E_GPa: 200,
            nu: 0.29,
            yield_MPa: 1034,
            ultimate_MPa: 1241,
            density_kg_m3: 8220,
            thermalConductivity_W_mK: 11.4,
            thermalExpansion_per_K: 13e-6,
            specificHeat_J_kgK: 435,
            resistivity_ohm_m: 1.25e-6
        },
        'copper': {
            name: 'Copper (annealed)',
            E_GPa: 117,
            nu: 0.35,
            yield_MPa: 70,
            ultimate_MPa: 220,
            density_kg_m3: 8960,
            thermalConductivity_W_mK: 401,
            thermalExpansion_per_K: 16.5e-6,
            specificHeat_J_kgK: 385,
            resistivity_ohm_m: 1.68e-8
        }
    },
    
    /**
     * Get material properties
     * @param {string} material - Material key
     * @returns {Object} Material properties
     */
    get: function(material) {
        const key = material.toLowerCase().replace(/[\s-]/g, '_');
        return this.properties[key] || null;
    },
    
    /**
     * List available materials
     * @returns {Array} Material names
     */
    list: function() {
        return Object.keys(this.properties).map(k => this.properties[k].name);
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// GATEWAY ROUTES REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

const BATCH16_GATEWAY_ROUTES = {
    // Stress Analysis (MIT 3.11)
    'material.stress.vonmises': 'PRISM_STRESS_ANALYSIS.vonMises',
    'material.stress.principal': 'PRISM_STRESS_ANALYSIS.principalStresses',
    'material.strain.true': 'PRISM_STRESS_ANALYSIS.trueStrain',
    'material.elastic.convert': 'PRISM_STRESS_ANALYSIS.elasticConstants',
    'material.beam.deflection': 'PRISM_STRESS_ANALYSIS.beamDeflection',
    
    // Kinetics (MIT 3.21)
    'material.diffusion.coefficient': 'PRISM_KINETICS.diffusionCoefficient',
    'material.diffusion.profile': 'PRISM_KINETICS.diffusionProfile',
    'material.nucleation.critical': 'PRISM_KINETICS.criticalNucleus',
    'material.transform.avrami': 'PRISM_KINETICS.avramiTransformation',
    
    // Mechanical Behavior (MIT 3.22)
    'material.hardening.hollomon': 'PRISM_MECHANICAL_BEHAVIOR.hollomonHardening',
    'material.creep.rate': 'PRISM_MECHANICAL_BEHAVIOR.creepRate',
    'material.creep.larsonmiller': 'PRISM_MECHANICAL_BEHAVIOR.larsonMiller',
    'material.fatigue.basquin': 'PRISM_MECHANICAL_BEHAVIOR.basquinFatigue',
    'material.fatigue.coffinmanson': 'PRISM_MECHANICAL_BEHAVIOR.coffinManson',
    'material.fatigue.miner': 'PRISM_MECHANICAL_BEHAVIOR.minerDamage',
    
    // Fracture (MIT 3.22)
    'material.fracture.sif': 'PRISM_FRACTURE.stressIntensityFactor',
    'material.fracture.paris': 'PRISM_FRACTURE.parisLaw',
    'material.fracture.toughness': 'PRISM_FRACTURE.fractureToughness',
    
    // Properties (MIT 3.15)
    'material.properties.get': 'PRISM_MATERIAL_PROPERTIES.get',
    'material.properties.list': 'PRISM_MATERIAL_PROPERTIES.list'
};

// Auto-register routes with PRISM_GATEWAY
function registerBatch16Routes() {
    if (typeof PRISM_GATEWAY !== 'undefined') {
        for (const [route, target] of Object.entries(BATCH16_GATEWAY_ROUTES)) {
            PRISM_GATEWAY.register(route, target);
        }
        console.log(`[Batch 16] Registered ${Object.keys(BATCH16_GATEWAY_ROUTES).length} routes`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SELF-TESTS
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_MIT_BATCH_16_TESTS = {
    runAll: function() {
        console.log('\n[PRISM MIT Batch 16] Running Self-Tests...\n');
        let passed = 0;
        let failed = 0;
        
        // Test 1: Von Mises stress (uniaxial)
        try {
            const vm = PRISM_STRESS_ANALYSIS.vonMises({ sigma_x: 100, sigma_y: 0, sigma_z: 0 });
            if (Math.abs(vm.vonMises_MPa - 100) < 0.1) {
                console.log('✓ Von Mises stress (uniaxial)');
                passed++;
            } else {
                throw new Error(`Expected 100, got ${vm.vonMises_MPa}`);
            }
        } catch (e) {
            console.log('✗ Von Mises stress:', e.message);
            failed++;
        }
        
        // Test 2: Principal stresses
        try {
            const principal = PRISM_STRESS_ANALYSIS.principalStresses({ 
                sigma_x: 100, sigma_y: 50, sigma_z: 0 
            });
            if (principal.sigma1 > principal.sigma2 && principal.sigma2 > principal.sigma3) {
                console.log('✓ Principal stress ordering');
                passed++;
            } else {
                throw new Error('Principal stresses not properly ordered');
            }
        } catch (e) {
            console.log('✗ Principal stresses:', e.message);
            failed++;
        }
        
        // Test 3: True strain
        try {
            const strain = PRISM_STRESS_ANALYSIS.trueStrain(0.1);
            const expected = Math.log(1.1);
            if (Math.abs(strain.trueStrain - expected) < 0.001) {
                console.log('✓ True strain conversion');
                passed++;
            } else {
                throw new Error(`Expected ${expected}, got ${strain.trueStrain}`);
            }
        } catch (e) {
            console.log('✗ True strain:', e.message);
            failed++;
        }
        
        // Test 4: Elastic constants
        try {
            const elastic = PRISM_STRESS_ANALYSIS.elasticConstants({ E: 200000, nu: 0.3 });
            const expectedG = 200000 / (2 * 1.3);
            if (Math.abs(elastic.G_MPa - expectedG) < 1) {
                console.log('✓ Elastic constants conversion');
                passed++;
            } else {
                throw new Error(`Expected G=${expectedG}, got ${elastic.G_MPa}`);
            }
        } catch (e) {
            console.log('✗ Elastic constants:', e.message);
            failed++;
        }
        
        // Test 5: Diffusion coefficient
        try {
            const diff = PRISM_KINETICS.diffusionCoefficient(500, { D0_m2_s: 1e-4, Q_kJ_mol: 150 });
            if (diff.D_m2_s > 0 && diff.D_m2_s < 1e-10) {
                console.log('✓ Diffusion coefficient');
                passed++;
            } else {
                throw new Error(`Unexpected diffusion coefficient: ${diff.D_m2_s}`);
            }
        } catch (e) {
            console.log('✗ Diffusion coefficient:', e.message);
            failed++;
        }
        
        // Test 6: Hollomon hardening
        try {
            const flow = PRISM_MECHANICAL_BEHAVIOR.hollomonHardening(0.1, { K_MPa: 500, n: 0.2 });
            const expected = 500 * Math.pow(0.1, 0.2);
            if (Math.abs(flow.trueStress_MPa - expected) < 0.1) {
                console.log('✓ Hollomon hardening');
                passed++;
            } else {
                throw new Error(`Expected ${expected}, got ${flow.trueStress_MPa}`);
            }
        } catch (e) {
            console.log('✗ Hollomon hardening:', e.message);
            failed++;
        }
        
        // Test 7: Basquin fatigue
        try {
            const fatigue = PRISM_MECHANICAL_BEHAVIOR.basquinFatigue({ 
                stressAmplitude_MPa: 300, sigma_f_MPa: 1000, b: -0.1 
            });
            if (fatigue.cyclesToFailure > 1000 && fatigue.cyclesToFailure < 1e9) {
                console.log('✓ Basquin fatigue life');
                passed++;
            } else {
                throw new Error(`Unexpected life: ${fatigue.cyclesToFailure}`);
            }
        } catch (e) {
            console.log('✗ Basquin fatigue:', e.message);
            failed++;
        }
        
        // Test 8: Stress intensity factor
        try {
            const sif = PRISM_FRACTURE.stressIntensityFactor({ 
                stress_MPa: 100, crackLength_mm: 10, geometry: 'center_crack' 
            });
            // K = σ√(πa) = 100 × √(π × 0.01) = 17.72
            if (Math.abs(sif.K_MPa_sqrt_m - 17.72) < 0.5) {
                console.log('✓ Stress intensity factor');
                passed++;
            } else {
                throw new Error(`Expected ~17.72, got ${sif.K_MPa_sqrt_m}`);
            }
        } catch (e) {
            console.log('✗ Stress intensity factor:', e.message);
            failed++;
        }
        
        // Test 9: Miner's damage
        try {
            const miner = PRISM_MECHANICAL_BEHAVIOR.minerDamage([
                { stress_MPa: 300, cycles: 10000 },
                { stress_MPa: 200, cycles: 50000 }
            ], { sigma_f_MPa: 1000, b: -0.1 });
            if (miner.totalDamage > 0 && miner.totalDamage < 10) {
                console.log('✓ Miner cumulative damage');
                passed++;
            } else {
                throw new Error(`Unexpected damage: ${miner.totalDamage}`);
            }
        } catch (e) {
            console.log('✗ Miner damage:', e.message);
            failed++;
        }
        
        // Test 10: Material properties
        try {
            const steel = PRISM_MATERIAL_PROPERTIES.get('steel_1045');
            if (steel && steel.E_GPa === 205) {
                console.log('✓ Material properties lookup');
                passed++;
            } else {
                throw new Error('Material not found or wrong property');
            }
        } catch (e) {
            console.log('✗ Material properties:', e.message);
            failed++;
        }
        
        console.log(`\nResults: ${passed}/${passed + failed} tests passed`);
        return { passed, failed };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PRISM_STRESS_ANALYSIS,
        PRISM_KINETICS,
        PRISM_MECHANICAL_BEHAVIOR,
        PRISM_FRACTURE,
        PRISM_MATERIAL_PROPERTIES,
        BATCH16_GATEWAY_ROUTES,
        registerBatch16Routes,
        PRISM_MIT_BATCH_16_TESTS
    };
}

if (typeof window !== 'undefined') {
    window.PRISM_STRESS_ANALYSIS = PRISM_STRESS_ANALYSIS;
    window.PRISM_KINETICS = PRISM_KINETICS;
    window.PRISM_MECHANICAL_BEHAVIOR = PRISM_MECHANICAL_BEHAVIOR;
    window.PRISM_FRACTURE = PRISM_FRACTURE;
    window.PRISM_MATERIAL_PROPERTIES = PRISM_MATERIAL_PROPERTIES;
    registerBatch16Routes();
}

console.log('[PRISM MIT Batch 16] Materials Science loaded - 20 routes');
console.log('[PRISM MIT Batch 16] Courses: 3.021J, 3.11, 3.15, 3.21, 3.22');
/**
 * PRISM MIT Course Knowledge - Batch 17
 * EECS ALGORITHMS: Search, AI, Optimization, Dynamic Programming
 * Source: MIT 6.006, 6.034, 6.046J, 6.079, 6.231
 * Generated: January 18, 2026
 */

console.log('[PRISM MIT Batch 17] Loading EECS Algorithms Knowledge...');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: SORTING ALGORITHMS (MIT 6.006)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_SORTING = {
    
    /**
     * Quicksort with median-of-three pivot selection
     * @param {Array} arr - Array to sort
     * @param {Function} compare - Optional comparison function
     * @returns {Array} Sorted array
     */
    quickSort: function(arr, compare = (a, b) => a - b) {
        const result = [...arr];
        
        const partition = (low, high) => {
            // Median-of-three pivot
            const mid = Math.floor((low + high) / 2);
            if (compare(result[mid], result[low]) < 0) [result[low], result[mid]] = [result[mid], result[low]];
            if (compare(result[high], result[low]) < 0) [result[low], result[high]] = [result[high], result[low]];
            if (compare(result[mid], result[high]) < 0) [result[mid], result[high]] = [result[high], result[mid]];
            
            const pivot = result[high];
            let i = low - 1;
            
            for (let j = low; j < high; j++) {
                if (compare(result[j], pivot) <= 0) {
                    i++;
                    [result[i], result[j]] = [result[j], result[i]];
                }
            }
            [result[i + 1], result[high]] = [result[high], result[i + 1]];
            return i + 1;
        };
        
        const sort = (low, high) => {
            if (low < high) {
                const pi = partition(low, high);
                sort(low, pi - 1);
                sort(pi + 1, high);
            }
        };
        
        sort(0, result.length - 1);
        return result;
    },
    
    /**
     * Merge sort (stable)
     * @param {Array} arr - Array to sort
     * @param {Function} compare - Optional comparison function
     * @returns {Array} Sorted array
     */
    mergeSort: function(arr, compare = (a, b) => a - b) {
        if (arr.length <= 1) return [...arr];
        
        const merge = (left, right) => {
            const result = [];
            let i = 0, j = 0;
            
            while (i < left.length && j < right.length) {
                if (compare(left[i], right[j]) <= 0) {
                    result.push(left[i++]);
                } else {
                    result.push(right[j++]);
                }
            }
            return result.concat(left.slice(i)).concat(right.slice(j));
        };
        
        const mid = Math.floor(arr.length / 2);
        const left = this.mergeSort(arr.slice(0, mid), compare);
        const right = this.mergeSort(arr.slice(mid), compare);
        
        return merge(left, right);
    },
    
    /**
     * Heap sort
     * @param {Array} arr - Array to sort
     * @param {Function} compare - Optional comparison function
     * @returns {Array} Sorted array
     */
    heapSort: function(arr, compare = (a, b) => a - b) {
        const result = [...arr];
        const n = result.length;
        
        const heapify = (size, i) => {
            let largest = i;
            const left = 2 * i + 1;
            const right = 2 * i + 2;
            
            if (left < size && compare(result[left], result[largest]) > 0) {
                largest = left;
            }
            if (right < size && compare(result[right], result[largest]) > 0) {
                largest = right;
            }
            if (largest !== i) {
                [result[i], result[largest]] = [result[largest], result[i]];
                heapify(size, largest);
            }
        };
        
        // Build max heap
        for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
            heapify(n, i);
        }
        
        // Extract elements
        for (let i = n - 1; i > 0; i--) {
            [result[0], result[i]] = [result[i], result[0]];
            heapify(i, 0);
        }
        
        return result;
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: GRAPH ALGORITHMS (MIT 6.006, 6.034)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_GRAPH = {
    
    /**
     * Dijkstra's shortest path algorithm
     * @param {Object} graph - Adjacency list {node: [{to, weight}]}
     * @param {string|number} start - Start node
     * @returns {Object} Distances and paths
     */
    dijkstra: function(graph, start) {
        const distances = {};
        const previous = {};
        const visited = new Set();
        const nodes = Object.keys(graph);
        
        // Initialize
        for (const node of nodes) {
            distances[node] = Infinity;
            previous[node] = null;
        }
        distances[start] = 0;
        
        // Priority queue (simple array implementation)
        const pq = [[0, start]];
        
        while (pq.length > 0) {
            // Get minimum
            pq.sort((a, b) => a[0] - b[0]);
            const [dist, current] = pq.shift();
            
            if (visited.has(current)) continue;
            visited.add(current);
            
            if (!graph[current]) continue;
            
            for (const edge of graph[current]) {
                if (visited.has(edge.to)) continue;
                
                const newDist = dist + edge.weight;
                if (newDist < distances[edge.to]) {
                    distances[edge.to] = newDist;
                    previous[edge.to] = current;
                    pq.push([newDist, edge.to]);
                }
            }
        }
        
        // Reconstruct paths
        const paths = {};
        for (const node of nodes) {
            const path = [];
            let current = node;
            while (current !== null) {
                path.unshift(current);
                current = previous[current];
            }
            paths[node] = path.length > 1 || node === start ? path : [];
        }
        
        return { distances, paths, previous };
    },
    
    /**
     * A* search algorithm
     * @param {Object} params - Search parameters
     * @returns {Object} Path and cost
     */
    astar: function(params) {
        const {
            start,
            goal,
            neighbors,  // function(node) => [{node, cost}]
            heuristic,  // function(node) => estimated cost to goal
            isGoal = (n) => n === goal
        } = params;
        
        const openSet = new Map([[start, { g: 0, f: heuristic(start), parent: null }]]);
        const closedSet = new Set();
        
        while (openSet.size > 0) {
            // Find node with lowest f score
            let current = null;
            let lowestF = Infinity;
            for (const [node, data] of openSet) {
                if (data.f < lowestF) {
                    lowestF = data.f;
                    current = node;
                }
            }
            
            if (isGoal(current)) {
                // Reconstruct path
                const path = [];
                let node = current;
                while (node !== null) {
                    path.unshift(node);
                    const data = openSet.get(node) || { parent: null };
                    node = data.parent;
                }
                return {
                    path,
                    cost: openSet.get(current).g,
                    nodesExplored: closedSet.size + 1
                };
            }
            
            const currentData = openSet.get(current);
            openSet.delete(current);
            closedSet.add(current);
            
            for (const neighbor of neighbors(current)) {
                if (closedSet.has(neighbor.node)) continue;
                
                const tentativeG = currentData.g + neighbor.cost;
                
                if (!openSet.has(neighbor.node)) {
                    openSet.set(neighbor.node, {
                        g: tentativeG,
                        f: tentativeG + heuristic(neighbor.node),
                        parent: current
                    });
                } else if (tentativeG < openSet.get(neighbor.node).g) {
                    openSet.set(neighbor.node, {
                        g: tentativeG,
                        f: tentativeG + heuristic(neighbor.node),
                        parent: current
                    });
                }
            }
        }
        
        return { path: [], cost: Infinity, nodesExplored: closedSet.size };
    },
    
    /**
     * Bellman-Ford algorithm (handles negative weights)
     * @param {Object} graph - Adjacency list
     * @param {string|number} start - Start node
     * @returns {Object} Distances or negative cycle detection
     */
    bellmanFord: function(graph, start) {
        const nodes = Object.keys(graph);
        const distances = {};
        const previous = {};
        
        // Initialize
        for (const node of nodes) {
            distances[node] = Infinity;
            previous[node] = null;
        }
        distances[start] = 0;
        
        // Relax edges V-1 times
        for (let i = 0; i < nodes.length - 1; i++) {
            for (const u of nodes) {
                if (!graph[u]) continue;
                for (const edge of graph[u]) {
                    if (distances[u] + edge.weight < distances[edge.to]) {
                        distances[edge.to] = distances[u] + edge.weight;
                        previous[edge.to] = u;
                    }
                }
            }
        }
        
        // Check for negative cycles
        for (const u of nodes) {
            if (!graph[u]) continue;
            for (const edge of graph[u]) {
                if (distances[u] + edge.weight < distances[edge.to]) {
                    return { hasNegativeCycle: true, distances: null };
                }
            }
        }
        
        return { hasNegativeCycle: false, distances, previous };
    },
    
    /**
     * Kruskal's Minimum Spanning Tree
     * @param {Array} edges - [{from, to, weight}]
     * @param {number} numNodes - Number of nodes
     * @returns {Object} MST edges and total weight
     */
    kruskalMST: function(edges, numNodes) {
        // Union-Find data structure
        const parent = Array.from({ length: numNodes }, (_, i) => i);
        const rank = Array(numNodes).fill(0);
        
        const find = (x) => {
            if (parent[x] !== x) parent[x] = find(parent[x]);
            return parent[x];
        };
        
        const union = (x, y) => {
            const px = find(x), py = find(y);
            if (px === py) return false;
            if (rank[px] < rank[py]) parent[px] = py;
            else if (rank[px] > rank[py]) parent[py] = px;
            else { parent[py] = px; rank[px]++; }
            return true;
        };
        
        // Sort edges by weight
        const sortedEdges = [...edges].sort((a, b) => a.weight - b.weight);
        
        const mst = [];
        let totalWeight = 0;
        
        for (const edge of sortedEdges) {
            if (union(edge.from, edge.to)) {
                mst.push(edge);
                totalWeight += edge.weight;
                if (mst.length === numNodes - 1) break;
            }
        }
        
        return { edges: mst, totalWeight, complete: mst.length === numNodes - 1 };
    },
    
    /**
     * Breadth-First Search
     * @param {Object} graph - Adjacency list
     * @param {string|number} start - Start node
     * @returns {Object} BFS traversal order and distances
     */
    bfs: function(graph, start) {
        const visited = new Set([start]);
        const queue = [start];
        const order = [];
        const distances = { [start]: 0 };
        
        while (queue.length > 0) {
            const current = queue.shift();
            order.push(current);
            
            if (!graph[current]) continue;
            
            for (const neighbor of graph[current]) {
                const node = typeof neighbor === 'object' ? neighbor.to : neighbor;
                if (!visited.has(node)) {
                    visited.add(node);
                    queue.push(node);
                    distances[node] = distances[current] + 1;
                }
            }
        }
        
        return { order, distances };
    },
    
    /**
     * Depth-First Search
     * @param {Object} graph - Adjacency list
     * @param {string|number} start - Start node
     * @returns {Object} DFS traversal order
     */
    dfs: function(graph, start) {
        const visited = new Set();
        const order = [];
        
        const visit = (node) => {
            if (visited.has(node)) return;
            visited.add(node);
            order.push(node);
            
            if (!graph[node]) return;
            
            for (const neighbor of graph[node]) {
                const next = typeof neighbor === 'object' ? neighbor.to : neighbor;
                visit(next);
            }
        };
        
        visit(start);
        return { order };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: DYNAMIC PROGRAMMING (MIT 6.006, 6.231)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_DP = {
    
    /**
     * Longest Common Subsequence
     * @param {string|Array} X - First sequence
     * @param {string|Array} Y - Second sequence
     * @returns {Object} LCS length and sequence
     */
    lcs: function(X, Y) {
        const m = X.length, n = Y.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        
        // Fill DP table
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (X[i - 1] === Y[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        
        // Reconstruct LCS
        const lcs = [];
        let i = m, j = n;
        while (i > 0 && j > 0) {
            if (X[i - 1] === Y[j - 1]) {
                lcs.unshift(X[i - 1]);
                i--; j--;
            } else if (dp[i - 1][j] > dp[i][j - 1]) {
                i--;
            } else {
                j--;
            }
        }
        
        return {
            length: dp[m][n],
            sequence: typeof X === 'string' ? lcs.join('') : lcs
        };
    },
    
    /**
     * 0/1 Knapsack Problem
     * @param {Array} items - [{value, weight}]
     * @param {number} capacity - Maximum weight
     * @returns {Object} Maximum value and selected items
     */
    knapsack: function(items, capacity) {
        const n = items.length;
        const dp = Array(n + 1).fill(null).map(() => Array(capacity + 1).fill(0));
        
        // Fill DP table
        for (let i = 1; i <= n; i++) {
            for (let w = 0; w <= capacity; w++) {
                if (items[i - 1].weight <= w) {
                    dp[i][w] = Math.max(
                        dp[i - 1][w],
                        dp[i - 1][w - items[i - 1].weight] + items[i - 1].value
                    );
                } else {
                    dp[i][w] = dp[i - 1][w];
                }
            }
        }
        
        // Find selected items
        const selected = [];
        let w = capacity;
        for (let i = n; i > 0 && w > 0; i--) {
            if (dp[i][w] !== dp[i - 1][w]) {
                selected.unshift(i - 1);
                w -= items[i - 1].weight;
            }
        }
        
        return {
            maxValue: dp[n][capacity],
            selectedIndices: selected,
            selectedItems: selected.map(i => items[i]),
            totalWeight: selected.reduce((sum, i) => sum + items[i].weight, 0)
        };
    },
    
    /**
     * Edit Distance (Levenshtein Distance)
     * @param {string} s1 - First string
     * @param {string} s2 - Second string
     * @returns {Object} Distance and operations
     */
    editDistance: function(s1, s2) {
        const m = s1.length, n = s2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        
        // Initialize
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        
        // Fill DP table
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (s1[i - 1] === s2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(
                        dp[i - 1][j - 1], // Replace
                        dp[i - 1][j],     // Delete
                        dp[i][j - 1]      // Insert
                    );
                }
            }
        }
        
        // Reconstruct operations
        const ops = [];
        let i = m, j = n;
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && s1[i - 1] === s2[j - 1]) {
                i--; j--;
            } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
                ops.unshift({ op: 'replace', pos: i - 1, from: s1[i - 1], to: s2[j - 1] });
                i--; j--;
            } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
                ops.unshift({ op: 'delete', pos: i - 1, char: s1[i - 1] });
                i--;
            } else {
                ops.unshift({ op: 'insert', pos: i, char: s2[j - 1] });
                j--;
            }
        }
        
        return { distance: dp[m][n], operations: ops };
    },
    
    /**
     * Value Iteration for MDP
     * @param {Object} mdp - MDP definition
     * @returns {Object} Optimal value function and policy
     */
    valueIteration: function(mdp) {
        const {
            states,           // Array of states
            actions,          // Array of actions
            transition,       // function(s, a) => [{state, prob}]
            reward,           // function(s, a) => number
            gamma = 0.99,     // Discount factor
            epsilon = 0.001,  // Convergence threshold
            maxIter = 1000
        } = mdp;
        
        // Initialize value function
        const V = {};
        for (const s of states) V[s] = 0;
        
        let iter = 0;
        let delta;
        
        do {
            delta = 0;
            const newV = {};
            
            for (const s of states) {
                let maxQ = -Infinity;
                
                for (const a of actions) {
                    let q = reward(s, a);
                    for (const { state: sp, prob } of transition(s, a)) {
                        q += gamma * prob * V[sp];
                    }
                    maxQ = Math.max(maxQ, q);
                }
                
                newV[s] = maxQ;
                delta = Math.max(delta, Math.abs(newV[s] - V[s]));
            }
            
            for (const s of states) V[s] = newV[s];
            iter++;
        } while (delta > epsilon && iter < maxIter);
        
        // Extract policy
        const policy = {};
        for (const s of states) {
            let bestA = null, maxQ = -Infinity;
            
            for (const a of actions) {
                let q = reward(s, a);
                for (const { state: sp, prob } of transition(s, a)) {
                    q += gamma * prob * V[sp];
                }
                if (q > maxQ) {
                    maxQ = q;
                    bestA = a;
                }
            }
            policy[s] = bestA;
        }
        
        return { V, policy, iterations: iter, converged: delta <= epsilon };
    },
    
    /**
     * Q-Learning (model-free RL)
     * @param {Object} params - Learning parameters
     * @returns {Object} Q-table and derived policy
     */
    qLearning: function(params) {
        const {
            states,
            actions,
            episodes = 1000,
            alpha = 0.1,      // Learning rate
            gamma = 0.99,     // Discount factor
            epsilon = 0.1,    // Exploration rate
            getNextState,     // function(s, a) => {nextState, reward, done}
            initialState      // function() => starting state
        } = params;
        
        // Initialize Q-table
        const Q = {};
        for (const s of states) {
            Q[s] = {};
            for (const a of actions) {
                Q[s][a] = 0;
            }
        }
        
        const rewards = [];
        
        for (let ep = 0; ep < episodes; ep++) {
            let s = initialState();
            let totalReward = 0;
            let steps = 0;
            const maxSteps = 1000;
            
            while (steps < maxSteps) {
                // Epsilon-greedy action selection
                let a;
                if (Math.random() < epsilon) {
                    a = actions[Math.floor(Math.random() * actions.length)];
                } else {
                    a = actions.reduce((best, act) => 
                        Q[s][act] > Q[s][best] ? act : best, actions[0]);
                }
                
                const { nextState, reward, done } = getNextState(s, a);
                
                // Q-learning update
                const maxNextQ = Math.max(...actions.map(ap => Q[nextState]?.[ap] || 0));
                Q[s][a] = Q[s][a] + alpha * (reward + gamma * maxNextQ - Q[s][a]);
                
                totalReward += reward;
                s = nextState;
                steps++;
                
                if (done) break;
            }
            
            rewards.push(totalReward);
        }
        
        // Derive policy from Q-table
        const policy = {};
        for (const s of states) {
            policy[s] = actions.reduce((best, a) => 
                Q[s][a] > Q[s][best] ? a : best, actions[0]);
        }
        
        return {
            Q,
            policy,
            averageReward: rewards.reduce((a, b) => a + b, 0) / rewards.length,
            rewardHistory: rewards
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: OPTIMIZATION ALGORITHMS (MIT 6.079)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_OPTIMIZATION = {
    
    /**
     * Gradient Descent with backtracking line search
     * @param {Object} params - Optimization parameters
     * @returns {Object} Optimal point and convergence info
     */
    gradientDescent: function(params) {
        const {
            f,                // Objective function f(x)
            gradient,         // Gradient function ∇f(x)
            x0,               // Initial point (array)
            alpha = 0.3,      // Backtracking parameter
            beta = 0.8,       // Backtracking parameter
            epsilon = 1e-6,   // Convergence tolerance
            maxIter = 10000
        } = params;
        
        let x = [...x0];
        const history = [{ x: [...x], f: f(x) }];
        
        for (let iter = 0; iter < maxIter; iter++) {
            const grad = gradient(x);
            const gradNorm = Math.sqrt(grad.reduce((s, g) => s + g * g, 0));
            
            // Check convergence
            if (gradNorm < epsilon) {
                return {
                    x,
                    fValue: f(x),
                    iterations: iter,
                    converged: true,
                    history
                };
            }
            
            // Backtracking line search
            let t = 1;
            const fx = f(x);
            const gradDotGrad = grad.reduce((s, g) => s + g * g, 0);
            
            while (f(x.map((xi, i) => xi - t * grad[i])) > fx - alpha * t * gradDotGrad) {
                t *= beta;
                if (t < 1e-10) break;
            }
            
            // Update
            x = x.map((xi, i) => xi - t * grad[i]);
            history.push({ x: [...x], f: f(x) });
        }
        
        return {
            x,
            fValue: f(x),
            iterations: maxIter,
            converged: false,
            history
        };
    },
    
    /**
     * Newton's Method for optimization
     * @param {Object} params - Optimization parameters
     * @returns {Object} Optimal point and convergence info
     */
    newtonsMethod: function(params) {
        const {
            f,                // Objective function
            gradient,         // Gradient function
            hessian,          // Hessian function (returns 2D array)
            x0,
            epsilon = 1e-8,
            maxIter = 100
        } = params;
        
        let x = [...x0];
        const n = x.length;
        
        // Helper: solve linear system Ax = b using Gaussian elimination
        const solve = (A, b) => {
            const aug = A.map((row, i) => [...row, b[i]]);
            
            // Forward elimination
            for (let i = 0; i < n; i++) {
                let maxRow = i;
                for (let k = i + 1; k < n; k++) {
                    if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
                }
                [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
                
                for (let k = i + 1; k < n; k++) {
                    const c = aug[k][i] / aug[i][i];
                    for (let j = i; j <= n; j++) {
                        aug[k][j] -= c * aug[i][j];
                    }
                }
            }
            
            // Back substitution
            const x = Array(n).fill(0);
            for (let i = n - 1; i >= 0; i--) {
                x[i] = aug[i][n];
                for (let j = i + 1; j < n; j++) {
                    x[i] -= aug[i][j] * x[j];
                }
                x[i] /= aug[i][i];
            }
            return x;
        };
        
        for (let iter = 0; iter < maxIter; iter++) {
            const grad = gradient(x);
            const gradNorm = Math.sqrt(grad.reduce((s, g) => s + g * g, 0));
            
            if (gradNorm < epsilon) {
                return { x, fValue: f(x), iterations: iter, converged: true };
            }
            
            const H = hessian(x);
            const step = solve(H, grad.map(g => -g));
            
            // Line search for damped Newton
            let t = 1;
            while (f(x.map((xi, i) => xi + t * step[i])) > f(x) + 0.01 * t * grad.reduce((s, g, i) => s + g * step[i], 0)) {
                t *= 0.5;
                if (t < 1e-10) break;
            }
            
            x = x.map((xi, i) => xi + t * step[i]);
        }
        
        return { x, fValue: f(x), iterations: maxIter, converged: false };
    },
    
    /**
     * Simplex Algorithm for Linear Programming
     * @param {Object} lp - LP in standard form
     * @returns {Object} Optimal solution
     */
    simplex: function(lp) {
        const { c, A, b } = lp;
        // c: objective coefficients (minimize c^T x)
        // A: constraint matrix (Ax <= b)
        // b: RHS of constraints
        
        const m = A.length;     // constraints
        const n = c.length;     // variables
        
        // Convert to slack form: add slack variables
        const tableau = [];
        for (let i = 0; i < m; i++) {
            const row = [...A[i]];
            for (let j = 0; j < m; j++) {
                row.push(i === j ? 1 : 0);  // Slack variable
            }
            row.push(b[i]);  // RHS
            tableau.push(row);
        }
        
        // Objective row (negated for maximization)
        const objRow = c.map(ci => -ci);
        for (let j = 0; j < m; j++) objRow.push(0);
        objRow.push(0);
        tableau.push(objRow);
        
        const numCols = n + m + 1;
        const maxIter = 100;
        
        for (let iter = 0; iter < maxIter; iter++) {
            // Find pivot column (most negative in objective row)
            let pivotCol = -1;
            let minVal = 0;
            for (let j = 0; j < numCols - 1; j++) {
                if (tableau[m][j] < minVal) {
                    minVal = tableau[m][j];
                    pivotCol = j;
                }
            }
            
            if (pivotCol === -1) {
                // Optimal solution found
                const x = Array(n).fill(0);
                for (let i = 0; i < m; i++) {
                    for (let j = 0; j < n; j++) {
                        if (Math.abs(tableau[i][j] - 1) < 1e-10) {
                            let isBasic = true;
                            for (let k = 0; k < m; k++) {
                                if (k !== i && Math.abs(tableau[k][j]) > 1e-10) {
                                    isBasic = false;
                                    break;
                                }
                            }
                            if (isBasic) x[j] = tableau[i][numCols - 1];
                        }
                    }
                }
                return {
                    optimal: true,
                    x: x.slice(0, n),
                    objectiveValue: tableau[m][numCols - 1],
                    iterations: iter
                };
            }
            
            // Find pivot row (minimum ratio test)
            let pivotRow = -1;
            let minRatio = Infinity;
            for (let i = 0; i < m; i++) {
                if (tableau[i][pivotCol] > 1e-10) {
                    const ratio = tableau[i][numCols - 1] / tableau[i][pivotCol];
                    if (ratio < minRatio) {
                        minRatio = ratio;
                        pivotRow = i;
                    }
                }
            }
            
            if (pivotRow === -1) {
                return { optimal: false, unbounded: true };
            }
            
            // Pivot operation
            const pivot = tableau[pivotRow][pivotCol];
            for (let j = 0; j < numCols; j++) {
                tableau[pivotRow][j] /= pivot;
            }
            
            for (let i = 0; i <= m; i++) {
                if (i !== pivotRow) {
                    const factor = tableau[i][pivotCol];
                    for (let j = 0; j < numCols; j++) {
                        tableau[i][j] -= factor * tableau[pivotRow][j];
                    }
                }
            }
        }
        
        return { optimal: false, maxIterReached: true };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: CONSTRAINT SATISFACTION (MIT 6.034)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_CSP = {
    
    /**
     * CSP Backtracking with MRV and forward checking
     * @param {Object} csp - CSP definition
     * @returns {Object} Solution or null
     */
    backtrackingSearch: function(csp) {
        const {
            variables,        // Array of variable names
            domains,          // {var: [possible values]}
            constraints       // function(assignment) => boolean
        } = csp;
        
        // Create working copy of domains
        const currentDomains = {};
        for (const v of variables) {
            currentDomains[v] = [...domains[v]];
        }
        
        const assignment = {};
        let nodesExplored = 0;
        
        const selectVariable = () => {
            // MRV: choose variable with minimum remaining values
            let minVar = null, minSize = Infinity;
            for (const v of variables) {
                if (!(v in assignment) && currentDomains[v].length < minSize) {
                    minSize = currentDomains[v].length;
                    minVar = v;
                }
            }
            return minVar;
        };
        
        const isConsistent = (variable, value) => {
            assignment[variable] = value;
            const result = constraints(assignment);
            delete assignment[variable];
            return result;
        };
        
        const backtrack = () => {
            nodesExplored++;
            
            if (Object.keys(assignment).length === variables.length) {
                return { ...assignment };
            }
            
            const variable = selectVariable();
            if (!variable) return null;
            
            for (const value of currentDomains[variable]) {
                if (isConsistent(variable, value)) {
                    assignment[variable] = value;
                    
                    const result = backtrack();
                    if (result) return result;
                    
                    delete assignment[variable];
                }
            }
            
            return null;
        };
        
        const solution = backtrack();
        return { solution, nodesExplored };
    },
    
    /**
     * AC-3 Arc Consistency Algorithm
     * @param {Object} csp - CSP with binary constraints
     * @returns {Object} Reduced domains
     */
    ac3: function(csp) {
        const { variables, domains, binaryConstraints } = csp;
        // binaryConstraints: {[v1,v2]: function(val1, val2) => boolean}
        
        const currentDomains = {};
        for (const v of variables) {
            currentDomains[v] = [...domains[v]];
        }
        
        // Initialize queue with all arcs
        const queue = [];
        for (const [key, _] of Object.entries(binaryConstraints)) {
            const [xi, xj] = key.split(',');
            queue.push([xi, xj]);
            queue.push([xj, xi]);
        }
        
        let revisionsCount = 0;
        
        const revise = (xi, xj) => {
            let revised = false;
            const constraintKey = `${xi},${xj}`;
            const reverseKey = `${xj},${xi}`;
            const constraint = binaryConstraints[constraintKey] || 
                              ((a, b) => binaryConstraints[reverseKey]?.(b, a));
            
            if (!constraint) return false;
            
            currentDomains[xi] = currentDomains[xi].filter(vi => {
                for (const vj of currentDomains[xj]) {
                    if (constraint(vi, vj)) return true;
                }
                revised = true;
                return false;
            });
            
            if (revised) revisionsCount++;
            return revised;
        };
        
        while (queue.length > 0) {
            const [xi, xj] = queue.shift();
            
            if (revise(xi, xj)) {
                if (currentDomains[xi].length === 0) {
                    return { consistent: false, domains: currentDomains };
                }
                
                // Add all arcs (xk, xi) to queue
                for (const xk of variables) {
                    if (xk !== xi && xk !== xj) {
                        const key1 = `${xk},${xi}`;
                        const key2 = `${xi},${xk}`;
                        if (binaryConstraints[key1] || binaryConstraints[key2]) {
                            queue.push([xk, xi]);
                        }
                    }
                }
            }
        }
        
        return { consistent: true, domains: currentDomains, revisions: revisionsCount };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: LQR CONTROL (MIT 6.231)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_CONTROL = {
    
    /**
     * Discrete-time LQR solver
     * @param {Object} params - System and cost matrices
     * @returns {Object} Optimal gain matrix K
     */
    lqr: function(params) {
        const {
            A,            // State matrix (n x n)
            B,            // Input matrix (n x m)
            Q,            // State cost matrix (n x n)
            R,            // Input cost matrix (m x m)
            maxIter = 1000,
            epsilon = 1e-9
        } = params;
        
        const n = A.length;
        const m = B[0].length;
        
        // Matrix operations helpers
        const matMul = (A, B) => {
            const result = Array(A.length).fill(null).map(() => Array(B[0].length).fill(0));
            for (let i = 0; i < A.length; i++) {
                for (let j = 0; j < B[0].length; j++) {
                    for (let k = 0; k < B.length; k++) {
                        result[i][j] += A[i][k] * B[k][j];
                    }
                }
            }
            return result;
        };
        
        const matAdd = (A, B) => A.map((row, i) => row.map((val, j) => val + B[i][j]));
        const matSub = (A, B) => A.map((row, i) => row.map((val, j) => val - B[i][j]));
        const transpose = (A) => A[0].map((_, j) => A.map(row => row[j]));
        
        // Simple matrix inverse for small matrices using Gaussian elimination
        const matInv = (M) => {
            const n = M.length;
            const aug = M.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);
            
            for (let i = 0; i < n; i++) {
                let maxRow = i;
                for (let k = i + 1; k < n; k++) {
                    if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
                }
                [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
                
                const pivot = aug[i][i];
                for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;
                
                for (let k = 0; k < n; k++) {
                    if (k !== i) {
                        const factor = aug[k][i];
                        for (let j = 0; j < 2 * n; j++) {
                            aug[k][j] -= factor * aug[i][j];
                        }
                    }
                }
            }
            
            return aug.map(row => row.slice(n));
        };
        
        // Solve discrete-time algebraic Riccati equation by iteration
        let P = Q.map(row => [...row]);  // Initialize P = Q
        
        for (let iter = 0; iter < maxIter; iter++) {
            // K = (R + B'PB)^-1 B'PA
            const BtP = matMul(transpose(B), P);
            const BtPB = matMul(BtP, B);
            const BtPA = matMul(BtP, A);
            const RplusBtPB = matAdd(R, BtPB);
            const invRBtPB = matInv(RplusBtPB);
            const K = matMul(invRBtPB, BtPA);
            
            // P_new = Q + A'PA - A'PB(R+B'PB)^-1 B'PA
            const AtP = matMul(transpose(A), P);
            const AtPA = matMul(AtP, A);
            const AtPB = matMul(AtP, B);
            const correction = matMul(matMul(AtPB, invRBtPB), BtPA);
            const P_new = matSub(matAdd(Q, AtPA), correction);
            
            // Check convergence
            let maxDiff = 0;
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    maxDiff = Math.max(maxDiff, Math.abs(P_new[i][j] - P[i][j]));
                }
            }
            
            P = P_new;
            
            if (maxDiff < epsilon) {
                // Compute final K
                const BtPfinal = matMul(transpose(B), P);
                const finalK = matMul(matInv(matAdd(R, matMul(BtPfinal, B))), matMul(BtPfinal, A));
                
                return { K: finalK, P, iterations: iter + 1, converged: true };
            }
        }
        
        // Return best K found
        const BtP = matMul(transpose(B), P);
        const K = matMul(matInv(matAdd(R, matMul(BtP, B))), matMul(BtP, A));
        
        return { K, P, iterations: maxIter, converged: false };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// GATEWAY ROUTES REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

const BATCH17_GATEWAY_ROUTES = {
    // Sorting (MIT 6.006)
    'algo.sort.quick': 'PRISM_SORTING.quickSort',
    'algo.sort.merge': 'PRISM_SORTING.mergeSort',
    'algo.sort.heap': 'PRISM_SORTING.heapSort',
    
    // Graph (MIT 6.006, 6.034)
    'algo.graph.dijkstra': 'PRISM_GRAPH.dijkstra',
    'algo.graph.astar': 'PRISM_GRAPH.astar',
    'algo.graph.bellmanford': 'PRISM_GRAPH.bellmanFord',
    'algo.graph.mst': 'PRISM_GRAPH.kruskalMST',
    'algo.graph.bfs': 'PRISM_GRAPH.bfs',
    'algo.graph.dfs': 'PRISM_GRAPH.dfs',
    
    // Dynamic Programming (MIT 6.006, 6.231)
    'algo.dp.lcs': 'PRISM_DP.lcs',
    'algo.dp.knapsack': 'PRISM_DP.knapsack',
    'algo.dp.editdistance': 'PRISM_DP.editDistance',
    'dp.value.iteration': 'PRISM_DP.valueIteration',
    'dp.qlearning': 'PRISM_DP.qLearning',
    
    // Optimization (MIT 6.079)
    'optim.gradient.descent': 'PRISM_OPTIMIZATION.gradientDescent',
    'optim.newton': 'PRISM_OPTIMIZATION.newtonsMethod',
    'optim.lp.simplex': 'PRISM_OPTIMIZATION.simplex',
    
    // CSP (MIT 6.034)
    'ai.csp.backtrack': 'PRISM_CSP.backtrackingSearch',
    'ai.csp.ac3': 'PRISM_CSP.ac3',
    
    // Control (MIT 6.231)
    'control.lqr': 'PRISM_CONTROL.lqr'
};

// Auto-register routes
function registerBatch17Routes() {
    if (typeof PRISM_GATEWAY !== 'undefined') {
        for (const [route, target] of Object.entries(BATCH17_GATEWAY_ROUTES)) {
            PRISM_GATEWAY.register(route, target);
        }
        console.log(`[Batch 17] Registered ${Object.keys(BATCH17_GATEWAY_ROUTES).length} routes`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SELF-TESTS
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_MIT_BATCH_17_TESTS = {
    runAll: function() {
        console.log('\n[PRISM MIT Batch 17] Running Self-Tests...\n');
        let passed = 0;
        let failed = 0;
        
        // Test 1: Quicksort
        try {
            const arr = [5, 2, 8, 1, 9, 3];
            const sorted = PRISM_SORTING.quickSort(arr);
            if (JSON.stringify(sorted) === JSON.stringify([1, 2, 3, 5, 8, 9])) {
                console.log('✓ Quicksort');
                passed++;
            } else {
                throw new Error(`Got ${sorted}`);
            }
        } catch (e) {
            console.log('✗ Quicksort:', e.message);
            failed++;
        }
        
        // Test 2: Mergesort
        try {
            const sorted = PRISM_SORTING.mergeSort([5, 2, 8, 1, 9, 3]);
            if (JSON.stringify(sorted) === JSON.stringify([1, 2, 3, 5, 8, 9])) {
                console.log('✓ Mergesort');
                passed++;
            } else {
                throw new Error(`Got ${sorted}`);
            }
        } catch (e) {
            console.log('✗ Mergesort:', e.message);
            failed++;
        }
        
        // Test 3: Dijkstra
        try {
            const graph = {
                'A': [{ to: 'B', weight: 1 }, { to: 'C', weight: 4 }],
                'B': [{ to: 'C', weight: 2 }, { to: 'D', weight: 5 }],
                'C': [{ to: 'D', weight: 1 }],
                'D': []
            };
            const result = PRISM_GRAPH.dijkstra(graph, 'A');
            if (result.distances['D'] === 4) {
                console.log('✓ Dijkstra shortest path');
                passed++;
            } else {
                throw new Error(`Expected 4, got ${result.distances['D']}`);
            }
        } catch (e) {
            console.log('✗ Dijkstra:', e.message);
            failed++;
        }
        
        // Test 4: BFS
        try {
            const graph = { 1: [2, 3], 2: [4], 3: [4], 4: [] };
            const result = PRISM_GRAPH.bfs(graph, 1);
            if (result.distances[4] === 2) {
                console.log('✓ BFS');
                passed++;
            } else {
                throw new Error(`Expected distance 2 to node 4`);
            }
        } catch (e) {
            console.log('✗ BFS:', e.message);
            failed++;
        }
        
        // Test 5: LCS
        try {
            const result = PRISM_DP.lcs('ABCDGH', 'AEDFHR');
            if (result.length === 3 && result.sequence === 'ADH') {
                console.log('✓ Longest Common Subsequence');
                passed++;
            } else {
                throw new Error(`Got length ${result.length}, sequence ${result.sequence}`);
            }
        } catch (e) {
            console.log('✗ LCS:', e.message);
            failed++;
        }
        
        // Test 6: Knapsack
        try {
            const items = [
                { value: 60, weight: 10 },
                { value: 100, weight: 20 },
                { value: 120, weight: 30 }
            ];
            const result = PRISM_DP.knapsack(items, 50);
            if (result.maxValue === 220) {
                console.log('✓ 0/1 Knapsack');
                passed++;
            } else {
                throw new Error(`Expected 220, got ${result.maxValue}`);
            }
        } catch (e) {
            console.log('✗ Knapsack:', e.message);
            failed++;
        }
        
        // Test 7: Edit Distance
        try {
            const result = PRISM_DP.editDistance('kitten', 'sitting');
            if (result.distance === 3) {
                console.log('✓ Edit Distance');
                passed++;
            } else {
                throw new Error(`Expected 3, got ${result.distance}`);
            }
        } catch (e) {
            console.log('✗ Edit Distance:', e.message);
            failed++;
        }
        
        // Test 8: Gradient Descent
        try {
            const result = PRISM_OPTIMIZATION.gradientDescent({
                f: (x) => x[0] * x[0] + x[1] * x[1],
                gradient: (x) => [2 * x[0], 2 * x[1]],
                x0: [5, 5],
                epsilon: 1e-4
            });
            if (Math.abs(result.x[0]) < 0.01 && Math.abs(result.x[1]) < 0.01) {
                console.log('✓ Gradient Descent');
                passed++;
            } else {
                throw new Error(`Expected [0,0], got [${result.x}]`);
            }
        } catch (e) {
            console.log('✗ Gradient Descent:', e.message);
            failed++;
        }
        
        // Test 9: Simplex LP
        try {
            // Minimize -x1 - x2 subject to x1 + x2 <= 4, x1 <= 2, x2 <= 3
            const result = PRISM_OPTIMIZATION.simplex({
                c: [-1, -1],
                A: [[1, 1], [1, 0], [0, 1]],
                b: [4, 2, 3]
            });
            if (result.optimal && Math.abs(result.objectiveValue + 5) < 0.01) {
                console.log('✓ Simplex LP');
                passed++;
            } else {
                throw new Error(`Expected -5, got ${result.objectiveValue}`);
            }
        } catch (e) {
            console.log('✗ Simplex LP:', e.message);
            failed++;
        }
        
        // Test 10: CSP Backtracking
        try {
            const result = PRISM_CSP.backtrackingSearch({
                variables: ['A', 'B'],
                domains: { A: [1, 2], B: [1, 2] },
                constraints: (a) => !a.A || !a.B || a.A !== a.B
            });
            if (result.solution && result.solution.A !== result.solution.B) {
                console.log('✓ CSP Backtracking');
                passed++;
            } else {
                throw new Error('No valid solution found');
            }
        } catch (e) {
            console.log('✗ CSP Backtracking:', e.message);
            failed++;
        }
        
        console.log(`\nResults: ${passed}/${passed + failed} tests passed`);
        return { passed, failed };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PRISM_SORTING,
        PRISM_GRAPH,
        PRISM_DP,
        PRISM_OPTIMIZATION,
        PRISM_CSP,
        PRISM_CONTROL,
        BATCH17_GATEWAY_ROUTES,
        registerBatch17Routes,
        PRISM_MIT_BATCH_17_TESTS
    };
}

if (typeof window !== 'undefined') {
    window.PRISM_SORTING = PRISM_SORTING;
    window.PRISM_GRAPH = PRISM_GRAPH;
    window.PRISM_DP = PRISM_DP;
    window.PRISM_OPTIMIZATION = PRISM_OPTIMIZATION;
    window.PRISM_CSP = PRISM_CSP;
    window.PRISM_CONTROL = PRISM_CONTROL;
    registerBatch17Routes();
}

console.log('[PRISM MIT Batch 17] EECS Algorithms loaded - 21 routes');
console.log('[PRISM MIT Batch 17] Courses: 6.006, 6.034, 6.046J, 6.079, 6.231');
/**
 * PRISM MIT Course Knowledge - Batch 19
 * AEROSPACE & DYNAMICS: Structures, Dynamics, Control, Communications
 * Source: MIT 16.001, 16.07, 16.30, 16.31, 16.36
 * Generated: January 18, 2026
 */

console.log('[PRISM MIT Batch 19] Loading Aerospace & Dynamics Knowledge...');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: STRUCTURAL ANALYSIS (MIT 16.001)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_STRUCTURES = {
    
    /**
     * Calculate beam bending stress
     * @param {Object} params - Beam parameters
     * @returns {Object} Stress analysis results
     */
    beamBendingStress: function(params) {
        const {
            moment,      // Bending moment [N·mm or lb·in]
            I,           // Second moment of area [mm⁴ or in⁴]
            y,           // Distance from neutral axis [mm or in]
            yMax = null  // Maximum distance (for max stress)
        } = params;
        
        const stress = moment * y / I;
        const maxStress = yMax ? moment * yMax / I : null;
        
        return {
            stress,
            maxStress,
            formula: 'σ = My/I',
            units: 'Same as M/I·y (typically MPa or psi)'
        };
    },
    
    /**
     * Calculate second moment of area for common sections
     * @param {string} type - Section type
     * @param {Object} dims - Dimensions
     * @returns {Object} Section properties
     */
    sectionProperties: function(type, dims) {
        let I, A, yMax, Z;
        
        switch (type.toLowerCase()) {
            case 'rectangle':
                // dims: {b: width, h: height}
                A = dims.b * dims.h;
                I = dims.b * Math.pow(dims.h, 3) / 12;
                yMax = dims.h / 2;
                Z = I / yMax;  // Section modulus
                break;
                
            case 'circle':
                // dims: {r: radius} or {d: diameter}
                const r = dims.r || dims.d / 2;
                A = Math.PI * r * r;
                I = Math.PI * Math.pow(r, 4) / 4;
                yMax = r;
                Z = I / yMax;
                break;
                
            case 'hollow_circle':
            case 'tube':
                // dims: {ro: outer radius, ri: inner radius}
                A = Math.PI * (dims.ro * dims.ro - dims.ri * dims.ri);
                I = Math.PI * (Math.pow(dims.ro, 4) - Math.pow(dims.ri, 4)) / 4;
                yMax = dims.ro;
                Z = I / yMax;
                break;
                
            case 'i_beam':
                // dims: {w: flange width, h: total height, tf: flange thickness, tw: web thickness}
                const hw = dims.h - 2 * dims.tf;  // Web height
                A = 2 * dims.w * dims.tf + hw * dims.tw;
                I = (dims.w * Math.pow(dims.h, 3) - (dims.w - dims.tw) * Math.pow(hw, 3)) / 12;
                yMax = dims.h / 2;
                Z = I / yMax;
                break;
                
            default:
                throw new Error(`Unknown section type: ${type}`);
        }
        
        return {
            type,
            area: A,
            momentOfInertia: I,
            yMax,
            sectionModulus: Z,
            radiusOfGyration: Math.sqrt(I / A)
        };
    },
    
    /**
     * Calculate beam deflection for standard cases
     * @param {Object} params - Beam and loading parameters
     * @returns {Object} Deflection results
     */
    beamDeflection: function(params) {
        const {
            type,        // 'cantilever_point', 'cantilever_uniform', 'simply_point', 'simply_uniform'
            L,           // Length
            E,           // Young's modulus
            I,           // Moment of inertia
            P = 0,       // Point load
            w = 0,       // Distributed load (per unit length)
            a = null     // Load position for point loads (from left support)
        } = params;
        
        let maxDeflection, maxSlope, deflectionAt;
        
        switch (type) {
            case 'cantilever_point':
                // Point load P at free end
                maxDeflection = P * Math.pow(L, 3) / (3 * E * I);
                maxSlope = P * Math.pow(L, 2) / (2 * E * I);
                deflectionAt = (x) => P * Math.pow(x, 2) * (3 * L - x) / (6 * E * I);
                break;
                
            case 'cantilever_uniform':
                // Uniform load w over entire length
                maxDeflection = w * Math.pow(L, 4) / (8 * E * I);
                maxSlope = w * Math.pow(L, 3) / (6 * E * I);
                deflectionAt = (x) => w * Math.pow(x, 2) * (6 * L * L - 4 * L * x + x * x) / (24 * E * I);
                break;
                
            case 'simply_point':
                // Point load P at center of simply supported beam
                maxDeflection = P * Math.pow(L, 3) / (48 * E * I);
                maxSlope = P * Math.pow(L, 2) / (16 * E * I);
                deflectionAt = (x) => {
                    if (x <= L/2) {
                        return P * x * (3 * L * L - 4 * x * x) / (48 * E * I);
                    } else {
                        return P * (L - x) * (3 * L * L - 4 * Math.pow(L - x, 2)) / (48 * E * I);
                    }
                };
                break;
                
            case 'simply_uniform':
                // Uniform load w on simply supported beam
                maxDeflection = 5 * w * Math.pow(L, 4) / (384 * E * I);
                maxSlope = w * Math.pow(L, 3) / (24 * E * I);
                deflectionAt = (x) => w * x * (L - x) * (L * L + x * (L - x)) / (24 * E * I);
                break;
                
            default:
                throw new Error(`Unknown beam type: ${type}`);
        }
        
        return {
            type,
            maxDeflection,
            maxSlope,
            deflectionAt,
            stiffness: type.includes('point') ? P / maxDeflection : w * L / maxDeflection
        };
    },
    
    /**
     * Euler buckling analysis
     * @param {Object} params - Column parameters
     * @returns {Object} Buckling results
     */
    eulerBuckling: function(params) {
        const {
            E,           // Young's modulus
            I,           // Minimum moment of inertia
            L,           // Length
            endCondition = 'pinned-pinned',  // End condition
            A = null,    // Cross-sectional area (for stress calc)
            sigmaY = null // Yield stress (for applicability check)
        } = params;
        
        // Effective length factors
        const K_factors = {
            'fixed-fixed': 0.5,
            'fixed-pinned': 0.7,
            'pinned-pinned': 1.0,
            'fixed-free': 2.0
        };
        
        const K = K_factors[endCondition] || 1.0;
        const Le = K * L;  // Effective length
        
        // Critical load
        const Pcr = Math.PI * Math.PI * E * I / (Le * Le);
        
        // Results object
        const result = {
            criticalLoad: Pcr,
            effectiveLength: Le,
            effectiveLengthFactor: K,
            endCondition
        };
        
        // Additional calculations if area provided
        if (A) {
            const r = Math.sqrt(I / A);  // Radius of gyration
            const slenderness = Le / r;
            const criticalStress = Pcr / A;
            
            result.radiusOfGyration = r;
            result.slendernessRatio = slenderness;
            result.criticalStress = criticalStress;
            
            // Check applicability (Euler valid for long columns)
            if (sigmaY) {
                const transitionSlenderness = Math.PI * Math.sqrt(E / sigmaY);
                result.transitionSlenderness = transitionSlenderness;
                result.eulerValid = slenderness > transitionSlenderness;
                result.safetyFactor = sigmaY / criticalStress;
            }
        }
        
        return result;
    },
    
    /**
     * Shaft torsion analysis
     * @param {Object} params - Shaft parameters
     * @returns {Object} Torsion results
     */
    shaftTorsion: function(params) {
        const {
            T,           // Torque
            L,           // Length
            G,           // Shear modulus
            type = 'solid',
            ro,          // Outer radius
            ri = 0       // Inner radius (for hollow)
        } = params;
        
        // Polar moment of inertia
        const J = type === 'hollow' 
            ? Math.PI * (Math.pow(ro, 4) - Math.pow(ri, 4)) / 2
            : Math.PI * Math.pow(ro, 4) / 2;
        
        // Maximum shear stress (at outer surface)
        const tauMax = T * ro / J;
        
        // Angle of twist
        const phi = T * L / (G * J);
        
        return {
            polarMomentOfInertia: J,
            maxShearStress: tauMax,
            angleOfTwist: phi,
            angleOfTwistDegrees: phi * 180 / Math.PI,
            torsionalStiffness: G * J / L
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: DYNAMICS & VIBRATIONS (MIT 16.07)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_DYNAMICS = {
    
    /**
     * Free vibration analysis (undamped)
     * @param {Object} params - System parameters
     * @returns {Object} Vibration characteristics
     */
    freeVibration: function(params) {
        const { m, k, x0 = 0, v0 = 0 } = params;
        
        const omega_n = Math.sqrt(k / m);  // Natural frequency [rad/s]
        const f_n = omega_n / (2 * Math.PI);  // [Hz]
        const T = 1 / f_n;  // Period [s]
        
        // Response: x(t) = A*cos(ωt) + B*sin(ωt)
        const A = x0;
        const B = v0 / omega_n;
        const amplitude = Math.sqrt(A * A + B * B);
        const phase = Math.atan2(B, A);
        
        return {
            naturalFrequencyRad: omega_n,
            naturalFrequencyHz: f_n,
            period: T,
            amplitude,
            phase,
            response: (t) => A * Math.cos(omega_n * t) + B * Math.sin(omega_n * t)
        };
    },
    
    /**
     * Damped free vibration analysis
     * @param {Object} params - System parameters
     * @returns {Object} Damped vibration characteristics
     */
    dampedVibration: function(params) {
        const { m, c, k, x0 = 1, v0 = 0 } = params;
        
        const omega_n = Math.sqrt(k / m);
        const c_cr = 2 * Math.sqrt(k * m);  // Critical damping
        const zeta = c / c_cr;  // Damping ratio
        
        let type, omega_d, response;
        
        if (Math.abs(zeta - 1) < 1e-6) {
            // Critically damped
            type = 'critically_damped';
            const A = x0;
            const B = v0 + omega_n * x0;
            response = (t) => (A + B * t) * Math.exp(-omega_n * t);
        } else if (zeta < 1) {
            // Underdamped
            type = 'underdamped';
            omega_d = omega_n * Math.sqrt(1 - zeta * zeta);
            const A = x0;
            const B = (v0 + zeta * omega_n * x0) / omega_d;
            response = (t) => Math.exp(-zeta * omega_n * t) * 
                (A * Math.cos(omega_d * t) + B * Math.sin(omega_d * t));
        } else {
            // Overdamped
            type = 'overdamped';
            const s1 = -zeta * omega_n + omega_n * Math.sqrt(zeta * zeta - 1);
            const s2 = -zeta * omega_n - omega_n * Math.sqrt(zeta * zeta - 1);
            const A = (v0 - s2 * x0) / (s1 - s2);
            const B = x0 - A;
            response = (t) => A * Math.exp(s1 * t) + B * Math.exp(s2 * t);
        }
        
        return {
            naturalFrequency: omega_n,
            dampingRatio: zeta,
            criticalDamping: c_cr,
            dampedFrequency: omega_d || null,
            type,
            response,
            // For underdamped: logarithmic decrement
            logDecrement: type === 'underdamped' ? 2 * Math.PI * zeta / Math.sqrt(1 - zeta * zeta) : null
        };
    },
    
    /**
     * Forced vibration response (harmonic excitation)
     * @param {Object} params - System and excitation parameters
     * @returns {Object} Forced response
     */
    forcedVibration: function(params) {
        const { m, c, k, F0, omega } = params;
        
        const omega_n = Math.sqrt(k / m);
        const zeta = c / (2 * Math.sqrt(k * m));
        const r = omega / omega_n;  // Frequency ratio
        
        // Steady-state amplitude
        const X = (F0 / k) / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2));
        
        // Phase angle
        const phi = Math.atan2(2 * zeta * r, 1 - r * r);
        
        // Magnification factor
        const MF = X / (F0 / k);
        
        // Transmissibility (force transmitted to base)
        const TR = Math.sqrt(1 + Math.pow(2 * zeta * r, 2)) / 
                   Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2));
        
        return {
            amplitude: X,
            phase: phi,
            phaseDegrees: phi * 180 / Math.PI,
            magnificationFactor: MF,
            transmissibility: TR,
            frequencyRatio: r,
            dampingRatio: zeta,
            isResonant: Math.abs(r - 1) < 0.1,
            response: (t) => X * Math.cos(omega * t - phi)
        };
    },
    
    /**
     * Calculate moment of inertia for rigid bodies
     * @param {string} type - Body type
     * @param {Object} params - Body parameters
     * @returns {Object} Inertia properties
     */
    rigidBodyInertia: function(type, params) {
        const { m } = params;
        let I, description;
        
        switch (type.toLowerCase()) {
            case 'slender_rod_center':
                // Rod about center, perpendicular to length
                I = m * params.L * params.L / 12;
                description = 'Slender rod about center';
                break;
                
            case 'slender_rod_end':
                // Rod about end, perpendicular to length
                I = m * params.L * params.L / 3;
                description = 'Slender rod about end';
                break;
                
            case 'solid_cylinder':
                // About central axis
                I = m * params.r * params.r / 2;
                description = 'Solid cylinder about axis';
                break;
                
            case 'solid_sphere':
                I = 2 * m * params.r * params.r / 5;
                description = 'Solid sphere about diameter';
                break;
                
            case 'hollow_sphere':
                I = 2 * m * params.r * params.r / 3;
                description = 'Thin hollow sphere';
                break;
                
            case 'disk':
                I = m * params.r * params.r / 2;
                description = 'Thin disk about axis';
                break;
                
            case 'hoop':
                I = m * params.r * params.r;
                description = 'Thin hoop about axis';
                break;
                
            case 'rectangular_plate':
                // About center, perpendicular to plate
                I = m * (params.a * params.a + params.b * params.b) / 12;
                description = 'Rectangular plate about center normal';
                break;
                
            default:
                throw new Error(`Unknown body type: ${type}`);
        }
        
        return {
            type,
            description,
            momentOfInertia: I,
            mass: m,
            // Radius of gyration
            radiusOfGyration: Math.sqrt(I / m)
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: FEEDBACK CONTROL (MIT 16.30, 16.31)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_CONTROL = {
    
    /**
     * Analyze transfer function poles and zeros
     * @param {Object} tf - Transfer function {num: [...], den: [...]}
     * @returns {Object} Pole-zero analysis
     */
    poleZeroAnalysis: function(tf) {
        // For polynomials up to 2nd order, find roots analytically
        const findRoots = (coeffs) => {
            const n = coeffs.length - 1;
            if (n === 0) return [];
            if (n === 1) return [-coeffs[1] / coeffs[0]];
            if (n === 2) {
                const a = coeffs[0], b = coeffs[1], c = coeffs[2];
                const disc = b * b - 4 * a * c;
                if (disc >= 0) {
                    return [(-b + Math.sqrt(disc)) / (2 * a), (-b - Math.sqrt(disc)) / (2 * a)];
                } else {
                    return [
                        { real: -b / (2 * a), imag: Math.sqrt(-disc) / (2 * a) },
                        { real: -b / (2 * a), imag: -Math.sqrt(-disc) / (2 * a) }
                    ];
                }
            }
            // For higher order, would need numerical root finding
            return null;
        };
        
        const poles = findRoots(tf.den);
        const zeros = findRoots(tf.num);
        
        // Stability analysis
        let stable = true;
        if (poles) {
            for (const p of poles) {
                const realPart = typeof p === 'object' ? p.real : p;
                if (realPart >= 0) {
                    stable = false;
                    break;
                }
            }
        }
        
        // DC gain
        const dcGain = tf.num[tf.num.length - 1] / tf.den[tf.den.length - 1];
        
        return {
            poles,
            zeros,
            stable,
            dcGain,
            order: tf.den.length - 1
        };
    },
    
    /**
     * Routh-Hurwitz stability criterion
     * @param {Array} coeffs - Characteristic polynomial coefficients [a_n, a_{n-1}, ..., a_0]
     * @returns {Object} Stability analysis
     */
    routhHurwitz: function(coeffs) {
        const n = coeffs.length - 1;
        
        // Build Routh array
        const rows = Math.ceil((n + 1) / 2);
        const array = [];
        
        // First two rows from coefficients
        array[0] = [];
        array[1] = [];
        for (let i = 0; i <= n; i++) {
            if (i % 2 === 0) array[0].push(coeffs[i]);
            else array[1].push(coeffs[i]);
        }
        
        // Pad with zeros
        const cols = Math.max(array[0].length, array[1].length);
        while (array[0].length < cols) array[0].push(0);
        while (array[1].length < cols) array[1].push(0);
        
        // Compute remaining rows
        for (let i = 2; i <= n; i++) {
            array[i] = [];
            for (let j = 0; j < cols - 1; j++) {
                const a = array[i-1][0];
                const b = array[i-2][0];
                const c = array[i-1][j+1] || 0;
                const d = array[i-2][j+1] || 0;
                
                if (Math.abs(a) < 1e-10) {
                    // Special case: zero in first column
                    array[i].push(0);
                } else {
                    array[i].push((a * d - b * c) / a);
                }
            }
            if (array[i].length === 0) array[i].push(0);
        }
        
        // Count sign changes in first column
        const firstCol = array.map(row => row[0]);
        let signChanges = 0;
        for (let i = 1; i < firstCol.length; i++) {
            if (firstCol[i] * firstCol[i-1] < 0) signChanges++;
        }
        
        return {
            routhArray: array,
            firstColumn: firstCol,
            signChanges,
            rhpPoles: signChanges,
            stable: signChanges === 0
        };
    },
    
    /**
     * PID controller tuning (Ziegler-Nichols)
     * @param {Object} params - System parameters from step response or ultimate gain test
     * @returns {Object} PID gains
     */
    pidTuning: function(params) {
        const { method = 'ziegler-nichols-step' } = params;
        let Kp, Ki, Kd;
        
        if (method === 'ziegler-nichols-step') {
            // From step response: K (gain), L (delay), T (time constant)
            const { K, L, T } = params;
            
            return {
                P: { Kp: T / (K * L), Ki: 0, Kd: 0 },
                PI: { Kp: 0.9 * T / (K * L), Ki: 0.9 * T / (K * L) / (3.33 * L), Kd: 0 },
                PID: { Kp: 1.2 * T / (K * L), Ki: 1.2 * T / (K * L) / (2 * L), Kd: 1.2 * T / (K * L) * 0.5 * L }
            };
        } else if (method === 'ziegler-nichols-ultimate') {
            // From ultimate gain test: Ku (ultimate gain), Tu (ultimate period)
            const { Ku, Tu } = params;
            
            return {
                P: { Kp: 0.5 * Ku, Ki: 0, Kd: 0 },
                PI: { Kp: 0.45 * Ku, Ki: 0.45 * Ku / (0.83 * Tu), Kd: 0 },
                PID: { Kp: 0.6 * Ku, Ki: 0.6 * Ku / (0.5 * Tu), Kd: 0.6 * Ku * 0.125 * Tu }
            };
        }
        
        throw new Error(`Unknown tuning method: ${method}`);
    },
    
    /**
     * Calculate gain and phase margins from frequency response data
     * @param {Function} G - Transfer function G(jω) returning {mag, phase}
     * @param {Object} options - Frequency range options
     * @returns {Object} Stability margins
     */
    stabilityMargins: function(G, options = {}) {
        const { omegaMin = 0.01, omegaMax = 1000, points = 1000 } = options;
        
        const logMin = Math.log10(omegaMin);
        const logMax = Math.log10(omegaMax);
        
        let gainCrossover = null;  // Where |G| = 1
        let phaseCrossover = null; // Where phase = -180°
        let gainMargin = null;
        let phaseMargin = null;
        
        let prevMag = null, prevPhase = null, prevOmega = null;
        
        for (let i = 0; i <= points; i++) {
            const omega = Math.pow(10, logMin + (logMax - logMin) * i / points);
            const { mag, phase } = G(omega);
            
            // Find gain crossover (|G| = 1)
            if (prevMag !== null && ((prevMag - 1) * (mag - 1) < 0)) {
                // Interpolate
                const t = (1 - prevMag) / (mag - prevMag);
                gainCrossover = prevOmega + t * (omega - prevOmega);
                const phaseAtCrossover = prevPhase + t * (phase - prevPhase);
                phaseMargin = 180 + phaseAtCrossover;  // PM = 180 + phase(at |G|=1)
            }
            
            // Find phase crossover (phase = -180°)
            if (prevPhase !== null && ((prevPhase + 180) * (phase + 180) < 0)) {
                const t = (-180 - prevPhase) / (phase - prevPhase);
                phaseCrossover = prevOmega + t * (omega - prevOmega);
                const magAtCrossover = prevMag + t * (mag - prevMag);
                gainMargin = 1 / magAtCrossover;  // GM = 1/|G| at phase=-180
            }
            
            prevMag = mag;
            prevPhase = phase;
            prevOmega = omega;
        }
        
        return {
            gainMargin,
            gainMarginDB: gainMargin ? 20 * Math.log10(gainMargin) : null,
            phaseMargin,
            gainCrossoverFreq: gainCrossover,
            phaseCrossoverFreq: phaseCrossover,
            stable: (gainMargin === null || gainMargin > 1) && (phaseMargin === null || phaseMargin > 0)
        };
    },
    
    /**
     * State feedback pole placement (Ackermann's formula for 2x2)
     * @param {Object} system - State space {A, B} matrices
     * @param {Array} desiredPoles - Desired closed-loop poles
     * @returns {Object} Feedback gain K
     */
    polePlacement: function(system, desiredPoles) {
        const { A, B } = system;
        const n = A.length;
        
        if (n !== 2) {
            throw new Error('This implementation supports 2x2 systems only');
        }
        
        // Check controllability
        const C = [B, this._matVec(A, B)];
        const detC = C[0][0] * C[1][1] - C[0][1] * C[1][0];
        
        if (Math.abs(detC) < 1e-10) {
            return { controllable: false, K: null };
        }
        
        // Desired characteristic polynomial: (s - p1)(s - p2) = s² + a1*s + a0
        const p1 = desiredPoles[0], p2 = desiredPoles[1];
        const a1 = -(p1 + p2);
        const a0 = p1 * p2;
        
        // Ackermann: K = [0 1] * C^(-1) * α(A)
        // α(A) = A² + a1*A + a0*I
        
        const A2 = this._matMul(A, A);
        const alphaA = [
            [A2[0][0] + a1 * A[0][0] + a0, A2[0][1] + a1 * A[0][1]],
            [A2[1][0] + a1 * A[1][0], A2[1][1] + a1 * A[1][1] + a0]
        ];
        
        // C^(-1)
        const Cinv = [
            [C[1][1] / detC, -C[0][1] / detC],
            [-C[1][0] / detC, C[0][0] / detC]
        ];
        
        // [0 1] * Cinv * alphaA
        const CinvAlpha = this._matMul(Cinv, alphaA);
        const K = [CinvAlpha[1][0], CinvAlpha[1][1]];  // [0 1] * CinvAlpha
        
        return {
            controllable: true,
            K,
            desiredPoles,
            closedLoopA: [
                [A[0][0] - B[0] * K[0], A[0][1] - B[0] * K[1]],
                [A[1][0] - B[1] * K[0], A[1][1] - B[1] * K[1]]
            ]
        };
    },
    
    /**
     * Luenberger observer design
     * @param {Object} system - State space {A, C} matrices
     * @param {Array} desiredPoles - Desired observer poles
     * @returns {Object} Observer gain L
     */
    observerDesign: function(system, desiredPoles) {
        const { A, C } = system;
        const n = A.length;
        
        if (n !== 2) {
            throw new Error('This implementation supports 2x2 systems only');
        }
        
        // Observability matrix O = [C; CA]
        const CA = [C[0] * A[0][0] + C[1] * A[1][0], C[0] * A[0][1] + C[1] * A[1][1]];
        const O = [[C[0], C[1]], CA];
        const detO = O[0][0] * O[1][1] - O[0][1] * O[1][0];
        
        if (Math.abs(detO) < 1e-10) {
            return { observable: false, L: null };
        }
        
        // Use duality: observer poles = eigenvalues of (A - LC)
        // Design using transposed system: (A', C') with desired poles
        const AT = [[A[0][0], A[1][0]], [A[0][1], A[1][1]]];
        const CT = [[C[0]], [C[1]]];
        
        // Desired characteristic polynomial
        const p1 = desiredPoles[0], p2 = desiredPoles[1];
        const a1 = -(p1 + p2);
        const a0 = p1 * p2;
        
        // Controllability of (A', C')
        const Ct = [CT[0][0], CT[1][0]];
        const ATCt = [AT[0][0] * Ct[0] + AT[0][1] * Ct[1], AT[1][0] * Ct[0] + AT[1][1] * Ct[1]];
        
        const Cbar = [[Ct[0], ATCt[0]], [Ct[1], ATCt[1]]];
        const detCbar = Cbar[0][0] * Cbar[1][1] - Cbar[0][1] * Cbar[1][0];
        
        // α(A')
        const AT2 = this._matMul(AT, AT);
        const alphaAT = [
            [AT2[0][0] + a1 * AT[0][0] + a0, AT2[0][1] + a1 * AT[0][1]],
            [AT2[1][0] + a1 * AT[1][0], AT2[1][1] + a1 * AT[1][1] + a0]
        ];
        
        const CbarInv = [
            [Cbar[1][1] / detCbar, -Cbar[0][1] / detCbar],
            [-Cbar[1][0] / detCbar, Cbar[0][0] / detCbar]
        ];
        
        const temp = this._matMul(CbarInv, alphaAT);
        const LT = [temp[1][0], temp[1][1]];
        const L = [[LT[0]], [LT[1]]];  // Transpose back
        
        return {
            observable: true,
            L: [L[0][0], L[1][0]],
            desiredPoles,
            observerA: [
                [A[0][0] - L[0][0] * C[0], A[0][1] - L[0][0] * C[1]],
                [A[1][0] - L[1][0] * C[0], A[1][1] - L[1][0] * C[1]]
            ]
        };
    },
    
    // Helper functions
    _matMul: function(A, B) {
        const m = A.length, n = B[0].length, p = B.length;
        const C = Array(m).fill(null).map(() => Array(n).fill(0));
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                for (let k = 0; k < p; k++) {
                    C[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        return C;
    },
    
    _matVec: function(A, v) {
        return A.map(row => row.reduce((s, a, j) => s + a * v[j], 0));
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: SIGNAL PROCESSING (MIT 16.36)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_SIGNALS = {
    
    /**
     * Compute FFT for spectrum analysis
     * @param {Array} x - Time domain signal
     * @returns {Object} Frequency domain representation
     */
    fftSpectrum: function(x) {
        const N = x.length;
        
        // Ensure power of 2 (pad if necessary)
        const N2 = Math.pow(2, Math.ceil(Math.log2(N)));
        const padded = [...x, ...Array(N2 - N).fill(0)];
        
        // Cooley-Tukey FFT
        const fft = this._fft(padded);
        
        // Compute magnitude and phase
        const magnitude = fft.map(c => Math.sqrt(c.real * c.real + c.imag * c.imag));
        const phase = fft.map(c => Math.atan2(c.imag, c.real));
        
        // Power spectral density (one-sided for real signals)
        const psd = magnitude.slice(0, N2 / 2 + 1).map(m => m * m / N2);
        psd[0] /= 2;  // DC component
        for (let i = 1; i < psd.length - 1; i++) psd[i] *= 2;
        
        return {
            fft,
            magnitude: magnitude.slice(0, N2 / 2 + 1),
            phase: phase.slice(0, N2 / 2 + 1),
            psd,
            N: N2,
            freqBins: N2 / 2 + 1
        };
    },
    
    /**
     * Cooley-Tukey FFT implementation
     * @private
     */
    _fft: function(x) {
        const N = x.length;
        if (N <= 1) return x.map(v => ({ real: v, imag: 0 }));
        
        // Bit-reversal permutation
        const bits = Math.log2(N);
        const reversed = new Array(N);
        for (let i = 0; i < N; i++) {
            let j = 0;
            for (let k = 0; k < bits; k++) {
                j = (j << 1) | ((i >> k) & 1);
            }
            reversed[j] = { real: x[i], imag: 0 };
        }
        
        // Cooley-Tukey iterative FFT
        for (let size = 2; size <= N; size *= 2) {
            const halfSize = size / 2;
            const tableStep = N / size;
            
            for (let i = 0; i < N; i += size) {
                for (let j = 0; j < halfSize; j++) {
                    const angle = -2 * Math.PI * j / size;
                    const twiddle = { real: Math.cos(angle), imag: Math.sin(angle) };
                    
                    const even = reversed[i + j];
                    const odd = reversed[i + j + halfSize];
                    
                    const t = {
                        real: twiddle.real * odd.real - twiddle.imag * odd.imag,
                        imag: twiddle.real * odd.imag + twiddle.imag * odd.real
                    };
                    
                    reversed[i + j] = {
                        real: even.real + t.real,
                        imag: even.imag + t.imag
                    };
                    reversed[i + j + halfSize] = {
                        real: even.real - t.real,
                        imag: even.imag - t.imag
                    };
                }
            }
        }
        
        return reversed;
    },
    
    /**
     * AM modulation
     * @param {Object} params - Modulation parameters
     * @returns {Object} Modulated signal info
     */
    amModulation: function(params) {
        const { 
            messageFreq,    // Message frequency
            carrierFreq,    // Carrier frequency
            modulationIndex = 1,  // Modulation index μ
            sampleRate = null,
            duration = null
        } = params;
        
        const result = {
            type: modulationIndex === 1 ? 'DSB-SC' : 'AM',
            messageFrequency: messageFreq,
            carrierFrequency: carrierFreq,
            modulationIndex,
            bandwidth: 2 * messageFreq,
            sidebands: {
                upper: carrierFreq + messageFreq,
                lower: carrierFreq - messageFreq
            }
        };
        
        // Generate waveform if sample rate provided
        if (sampleRate && duration) {
            const N = Math.floor(sampleRate * duration);
            const t = Array(N).fill(0).map((_, i) => i / sampleRate);
            const message = t.map(ti => Math.cos(2 * Math.PI * messageFreq * ti));
            
            if (modulationIndex === 1) {
                // DSB-SC
                result.signal = t.map((ti, i) => message[i] * Math.cos(2 * Math.PI * carrierFreq * ti));
            } else {
                // Conventional AM
                result.signal = t.map((ti, i) => 
                    (1 + modulationIndex * message[i]) * Math.cos(2 * Math.PI * carrierFreq * ti));
            }
            result.time = t;
        }
        
        return result;
    },
    
    /**
     * Nyquist sampling analysis
     * @param {Object} params - Signal parameters
     * @returns {Object} Sampling requirements
     */
    nyquistAnalysis: function(params) {
        const { maxFrequency, actualSampleRate = null } = params;
        
        const nyquistRate = 2 * maxFrequency;
        
        const result = {
            maxSignalFrequency: maxFrequency,
            nyquistRate,
            minimumSampleRate: nyquistRate,
            recommendedSampleRate: 2.5 * maxFrequency  // Some margin
        };
        
        if (actualSampleRate) {
            result.actualSampleRate = actualSampleRate;
            result.meetsNyquist = actualSampleRate >= nyquistRate;
            result.aliasingRisk = actualSampleRate < nyquistRate;
            result.maxRecoverableFreq = actualSampleRate / 2;
            
            if (result.aliasingRisk) {
                result.aliasedFrequencies = this._findAliases(maxFrequency, actualSampleRate);
            }
        }
        
        return result;
    },
    
    _findAliases: function(freq, sampleRate) {
        const aliases = [];
        const fs = sampleRate;
        
        // Find where freq folds back into [0, fs/2]
        let f = freq;
        while (f > fs / 2) {
            f = Math.abs(f - fs);
            if (f <= fs / 2) aliases.push(f);
        }
        
        return aliases;
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// GATEWAY ROUTES REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

const BATCH19_GATEWAY_ROUTES = {
    // Structures (MIT 16.001)
    'struct.stress.beam': 'PRISM_STRUCTURES.beamBendingStress',
    'struct.section.properties': 'PRISM_STRUCTURES.sectionProperties',
    'struct.deflection.beam': 'PRISM_STRUCTURES.beamDeflection',
    'struct.buckling.euler': 'PRISM_STRUCTURES.eulerBuckling',
    'struct.torsion.shaft': 'PRISM_STRUCTURES.shaftTorsion',
    
    // Dynamics (MIT 16.07)
    'dynamics.vibration.free': 'PRISM_DYNAMICS.freeVibration',
    'dynamics.vibration.damped': 'PRISM_DYNAMICS.dampedVibration',
    'dynamics.vibration.forced': 'PRISM_DYNAMICS.forcedVibration',
    'dynamics.rigid.inertia': 'PRISM_DYNAMICS.rigidBodyInertia',
    
    // Control (MIT 16.30, 16.31)
    'control.tf.poles': 'PRISM_CONTROL.poleZeroAnalysis',
    'control.stability.routh': 'PRISM_CONTROL.routhHurwitz',
    'control.pid.tune': 'PRISM_CONTROL.pidTuning',
    'control.margins': 'PRISM_CONTROL.stabilityMargins',
    'control.state.placement': 'PRISM_CONTROL.polePlacement',
    'control.observer.design': 'PRISM_CONTROL.observerDesign',
    
    // Signals (MIT 16.36)
    'signal.fft.spectrum': 'PRISM_SIGNALS.fftSpectrum',
    'signal.modulation.am': 'PRISM_SIGNALS.amModulation',
    'signal.sampling.nyquist': 'PRISM_SIGNALS.nyquistAnalysis'
};

// Auto-register routes
function registerBatch19Routes() {
    if (typeof PRISM_GATEWAY !== 'undefined') {
        for (const [route, target] of Object.entries(BATCH19_GATEWAY_ROUTES)) {
            PRISM_GATEWAY.register(route, target);
        }
        console.log(`[Batch 19] Registered ${Object.keys(BATCH19_GATEWAY_ROUTES).length} routes`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SELF-TESTS
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_MIT_BATCH_19_TESTS = {
    runAll: function() {
        console.log('\n[PRISM MIT Batch 19] Running Self-Tests...\n');
        let passed = 0;
        let failed = 0;
        
        // Test 1: Section properties
        try {
            const rect = PRISM_STRUCTURES.sectionProperties('rectangle', { b: 10, h: 20 });
            if (Math.abs(rect.momentOfInertia - 10 * 20 * 20 * 20 / 12) < 0.01) {
                console.log('✓ Section properties (rectangle)');
                passed++;
            } else {
                throw new Error(`Expected ${10*8000/12}, got ${rect.momentOfInertia}`);
            }
        } catch (e) {
            console.log('✗ Section properties:', e.message);
            failed++;
        }
        
        // Test 2: Beam deflection
        try {
            const defl = PRISM_STRUCTURES.beamDeflection({
                type: 'cantilever_point',
                L: 1000, E: 200000, I: 10000, P: 100
            });
            const expected = 100 * Math.pow(1000, 3) / (3 * 200000 * 10000);
            if (Math.abs(defl.maxDeflection - expected) < 0.01) {
                console.log('✓ Beam deflection (cantilever)');
                passed++;
            } else {
                throw new Error(`Expected ${expected}, got ${defl.maxDeflection}`);
            }
        } catch (e) {
            console.log('✗ Beam deflection:', e.message);
            failed++;
        }
        
        // Test 3: Euler buckling
        try {
            const buck = PRISM_STRUCTURES.eulerBuckling({
                E: 200000, I: 1000, L: 500, endCondition: 'pinned-pinned'
            });
            const expected = Math.PI * Math.PI * 200000 * 1000 / (500 * 500);
            if (Math.abs(buck.criticalLoad - expected) < 0.1) {
                console.log('✓ Euler buckling');
                passed++;
            } else {
                throw new Error(`Expected ${expected}, got ${buck.criticalLoad}`);
            }
        } catch (e) {
            console.log('✗ Euler buckling:', e.message);
            failed++;
        }
        
        // Test 4: Free vibration
        try {
            const vib = PRISM_DYNAMICS.freeVibration({ m: 1, k: 100 });
            if (Math.abs(vib.naturalFrequencyRad - 10) < 0.01) {
                console.log('✓ Free vibration');
                passed++;
            } else {
                throw new Error(`Expected ωn=10, got ${vib.naturalFrequencyRad}`);
            }
        } catch (e) {
            console.log('✗ Free vibration:', e.message);
            failed++;
        }
        
        // Test 5: Damped vibration
        try {
            const damped = PRISM_DYNAMICS.dampedVibration({ m: 1, c: 2, k: 100 });
            // c_cr = 2*sqrt(100) = 20, so zeta = 2/20 = 0.1
            if (Math.abs(damped.dampingRatio - 0.1) < 0.01 && damped.type === 'underdamped') {
                console.log('✓ Damped vibration');
                passed++;
            } else {
                throw new Error(`Expected ζ=0.1, got ${damped.dampingRatio}`);
            }
        } catch (e) {
            console.log('✗ Damped vibration:', e.message);
            failed++;
        }
        
        // Test 6: Routh-Hurwitz
        try {
            // s³ + 2s² + 3s + 4 (stable)
            const routh = PRISM_CONTROL.routhHurwitz([1, 2, 3, 4]);
            // First column: 1, 2, 1, 4 -> all positive, stable
            if (routh.signChanges === 0 && routh.stable) {
                console.log('✓ Routh-Hurwitz stability');
                passed++;
            } else {
                throw new Error(`Expected stable, got ${routh.signChanges} sign changes`);
            }
        } catch (e) {
            console.log('✗ Routh-Hurwitz:', e.message);
            failed++;
        }
        
        // Test 7: PID tuning
        try {
            const pid = PRISM_CONTROL.pidTuning({
                method: 'ziegler-nichols-step',
                K: 1, L: 1, T: 5
            });
            if (pid.PID.Kp > 0 && pid.PID.Ki > 0 && pid.PID.Kd > 0) {
                console.log('✓ PID tuning (Z-N)');
                passed++;
            } else {
                throw new Error('Invalid PID gains');
            }
        } catch (e) {
            console.log('✗ PID tuning:', e.message);
            failed++;
        }
        
        // Test 8: Pole placement
        try {
            const result = PRISM_CONTROL.polePlacement(
                { A: [[0, 1], [-2, -3]], B: [0, 1] },
                [-5, -5]
            );
            if (result.controllable && result.K.length === 2) {
                console.log('✓ Pole placement');
                passed++;
            } else {
                throw new Error('Pole placement failed');
            }
        } catch (e) {
            console.log('✗ Pole placement:', e.message);
            failed++;
        }
        
        // Test 9: FFT
        try {
            const signal = [1, 0, -1, 0, 1, 0, -1, 0];  // Simple oscillation
            const spec = PRISM_SIGNALS.fftSpectrum(signal);
            if (spec.magnitude && spec.magnitude.length > 0) {
                console.log('✓ FFT spectrum');
                passed++;
            } else {
                throw new Error('FFT failed');
            }
        } catch (e) {
            console.log('✗ FFT:', e.message);
            failed++;
        }
        
        // Test 10: Nyquist analysis
        try {
            const nyq = PRISM_SIGNALS.nyquistAnalysis({
                maxFrequency: 1000,
                actualSampleRate: 2500
            });
            if (nyq.meetsNyquist && nyq.nyquistRate === 2000) {
                console.log('✓ Nyquist analysis');
                passed++;
            } else {
                throw new Error(`Nyquist rate should be 2000, got ${nyq.nyquistRate}`);
            }
        } catch (e) {
            console.log('✗ Nyquist analysis:', e.message);
            failed++;
        }
        
        console.log(`\nResults: ${passed}/${passed + failed} tests passed`);
        return { passed, failed };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PRISM_STRUCTURES,
        PRISM_DYNAMICS,
        PRISM_CONTROL,
        PRISM_SIGNALS,
        BATCH19_GATEWAY_ROUTES,
        registerBatch19Routes,
        PRISM_MIT_BATCH_19_TESTS
    };
}

if (typeof window !== 'undefined') {
    window.PRISM_STRUCTURES = PRISM_STRUCTURES;
    window.PRISM_DYNAMICS = PRISM_DYNAMICS;
    window.PRISM_CONTROL = PRISM_CONTROL;
    window.PRISM_SIGNALS = PRISM_SIGNALS;
    registerBatch19Routes();
}

console.log('[PRISM MIT Batch 19] Aerospace & Dynamics loaded - 18 routes');
console.log('[PRISM MIT Batch 19] Courses: 16.001, 16.07, 16.30, 16.31, 16.36');
/**
 * PRISM MIT Course Knowledge - Batch 20
 * MECHANICAL ENGINEERING FUNDAMENTALS & DESIGN
 * Source: MIT 1.00, 2.000, 2.001, 2.72, 2.75
 * Generated: January 18, 2026
 */

console.log('[PRISM MIT Batch 20] Loading Mechanical Engineering Fundamentals...');

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: NUMERICAL METHODS (MIT 1.00)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_NUMERICAL = {
    
    /**
     * Bisection method for root finding
     * @param {Function} f - Function to find root of
     * @param {number} a - Left bracket
     * @param {number} b - Right bracket
     * @param {Object} options - Tolerance and max iterations
     * @returns {Object} Root and convergence info
     */
    bisection: function(f, a, b, options = {}) {
        const { tol = 1e-10, maxIter = 100 } = options;
        
        if (f(a) * f(b) > 0) {
            return { error: 'Function must have opposite signs at brackets' };
        }
        
        let iter = 0;
        const history = [];
        
        while ((b - a) / 2 > tol && iter < maxIter) {
            const c = (a + b) / 2;
            history.push({ iter, a, b, c, fc: f(c) });
            
            if (Math.abs(f(c)) < tol) {
                return { root: c, iterations: iter, history, converged: true };
            }
            
            if (f(a) * f(c) < 0) {
                b = c;
            } else {
                a = c;
            }
            iter++;
        }
        
        const root = (a + b) / 2;
        return { root, iterations: iter, error: Math.abs(f(root)), converged: true };
    },
    
    /**
     * Newton-Raphson method for root finding
     * @param {Function} f - Function to find root of
     * @param {Function} df - Derivative of f
     * @param {number} x0 - Initial guess
     * @param {Object} options - Tolerance and max iterations
     * @returns {Object} Root and convergence info
     */
    newtonRaphson: function(f, df, x0, options = {}) {
        const { tol = 1e-10, maxIter = 50 } = options;
        
        let x = x0;
        let iter = 0;
        const history = [{ iter: 0, x, fx: f(x) }];
        
        while (iter < maxIter) {
            const fx = f(x);
            const dfx = df(x);
            
            if (Math.abs(dfx) < 1e-15) {
                return { error: 'Derivative too small', x, iterations: iter };
            }
            
            const xNew = x - fx / dfx;
            history.push({ iter: iter + 1, x: xNew, fx: f(xNew) });
            
            if (Math.abs(xNew - x) < tol) {
                return { root: xNew, iterations: iter + 1, history, converged: true };
            }
            
            x = xNew;
            iter++;
        }
        
        return { root: x, iterations: iter, converged: false, history };
    },
    
    /**
     * Secant method for root finding (no derivative needed)
     * @param {Function} f - Function to find root of
     * @param {number} x0 - First initial guess
     * @param {number} x1 - Second initial guess
     * @param {Object} options - Tolerance and max iterations
     * @returns {Object} Root and convergence info
     */
    secant: function(f, x0, x1, options = {}) {
        const { tol = 1e-10, maxIter = 50 } = options;
        
        let xPrev = x0;
        let x = x1;
        let iter = 0;
        
        while (iter < maxIter) {
            const fPrev = f(xPrev);
            const fx = f(x);
            
            if (Math.abs(fx - fPrev) < 1e-15) {
                return { error: 'Division by zero imminent', x, iterations: iter };
            }
            
            const xNew = x - fx * (x - xPrev) / (fx - fPrev);
            
            if (Math.abs(xNew - x) < tol) {
                return { root: xNew, iterations: iter + 1, converged: true };
            }
            
            xPrev = x;
            x = xNew;
            iter++;
        }
        
        return { root: x, iterations: iter, converged: false };
    },
    
    /**
     * Lagrange interpolation
     * @param {Array} xs - x coordinates
     * @param {Array} ys - y coordinates
     * @param {number} x - Point to interpolate
     * @returns {number} Interpolated value
     */
    lagrangeInterpolation: function(xs, ys, x) {
        const n = xs.length;
        let result = 0;
        
        for (let i = 0; i < n; i++) {
            let term = ys[i];
            for (let j = 0; j < n; j++) {
                if (j !== i) {
                    term *= (x - xs[j]) / (xs[i] - xs[j]);
                }
            }
            result += term;
        }
        
        return result;
    },
    
    /**
     * Golden section search for 1D optimization
     * @param {Function} f - Function to minimize
     * @param {number} a - Left bound
     * @param {number} b - Right bound
     * @param {Object} options - Tolerance
     * @returns {Object} Minimum location and value
     */
    goldenSection: function(f, a, b, options = {}) {
        const { tol = 1e-8 } = options;
        const phi = (Math.sqrt(5) - 1) / 2;  // Golden ratio conjugate
        
        let x1 = b - phi * (b - a);
        let x2 = a + phi * (b - a);
        let f1 = f(x1);
        let f2 = f(x2);
        let iter = 0;
        
        while (Math.abs(b - a) > tol) {
            if (f1 < f2) {
                b = x2;
                x2 = x1;
                f2 = f1;
                x1 = b - phi * (b - a);
                f1 = f(x1);
            } else {
                a = x1;
                x1 = x2;
                f1 = f2;
                x2 = a + phi * (b - a);
                f2 = f(x2);
            }
            iter++;
        }
        
        const xMin = (a + b) / 2;
        return { minimum: xMin, value: f(xMin), iterations: iter };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: MECHANISMS (MIT 2.000)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_MECHANISMS = {
    
    /**
     * Gear train analysis
     * @param {Array} gears - Array of {teeth, type} objects
     * @returns {Object} Gear train analysis
     */
    gearTrain: function(gears) {
        if (gears.length < 2) {
            return { error: 'Need at least 2 gears' };
        }
        
        let totalRatio = 1;
        const stages = [];
        
        for (let i = 0; i < gears.length - 1; i += 2) {
            const driver = gears[i];
            const driven = gears[i + 1];
            const stageRatio = driven.teeth / driver.teeth;
            
            stages.push({
                stage: stages.length + 1,
                driver: driver.teeth,
                driven: driven.teeth,
                ratio: stageRatio
            });
            
            totalRatio *= stageRatio;
        }
        
        return {
            totalRatio,
            stages,
            speedReduction: totalRatio > 1,
            torqueMultiplication: totalRatio,
            outputDirection: gears.length % 2 === 0 ? 'same' : 'reversed'
        };
    },
    
    /**
     * Four-bar linkage analysis
     * @param {Object} links - Link lengths {a, b, c, d} where a=input crank
     * @returns {Object} Linkage classification and limits
     */
    fourBarLinkage: function(links) {
        const { a, b, c, d } = links;  // a=crank, b=coupler, c=rocker, d=ground
        const lengths = [a, b, c, d].sort((x, y) => x - y);
        const s = lengths[0];  // Shortest
        const l = lengths[3];  // Longest
        const p = lengths[1];
        const q = lengths[2];
        
        const grashof = s + l <= p + q;
        
        let type, description;
        if (grashof) {
            if (s === a) {
                type = 'crank-rocker';
                description = 'Input link rotates fully, output oscillates';
            } else if (s === d) {
                type = 'double-crank';
                description = 'Both input and output rotate fully';
            } else if (s === b) {
                type = 'double-rocker';
                description = 'Both links oscillate (coupler shortest)';
            } else {
                type = 'rocker-crank';
                description = 'Input oscillates, output rotates';
            }
        } else {
            type = 'triple-rocker';
            description = 'No link can rotate fully';
        }
        
        // Transmission angle limits (for crank-rocker)
        let muMin = null, muMax = null;
        if (type === 'crank-rocker') {
            // When crank aligned with ground
            const theta1 = 0;  // Crank along ground
            const theta2 = Math.PI;
            
            // Calculate transmission angles at extremes
            // This is simplified - full analysis needs iterative solution
            muMin = Math.acos((b*b + c*c - (a+d)*(a+d)) / (2*b*c));
            muMax = Math.acos((b*b + c*c - (d-a)*(d-a)) / (2*b*c));
        }
        
        return {
            grashofCondition: grashof,
            type,
            description,
            shortestLink: s,
            longestLink: l,
            transmissionAngleMin: muMin ? muMin * 180 / Math.PI : null,
            transmissionAngleMax: muMax ? muMax * 180 / Math.PI : null
        };
    },
    
    /**
     * Screw mechanism analysis
     * @param {Object} params - Screw parameters
     * @returns {Object} Screw mechanism properties
     */
    screwMechanism: function(params) {
        const {
            pitch,           // Thread pitch [mm]
            starts = 1,      // Number of starts
            diameter,        // Mean diameter [mm]
            frictionCoeff = 0.15  // Friction coefficient
        } = params;
        
        const lead = starts * pitch;
        const radius = diameter / 2;
        const circumference = 2 * Math.PI * radius;
        
        // Lead angle
        const leadAngle = Math.atan(lead / circumference);
        const leadAngleDeg = leadAngle * 180 / Math.PI;
        
        // Friction angle
        const frictionAngle = Math.atan(frictionCoeff);
        const frictionAngleDeg = frictionAngle * 180 / Math.PI;
        
        // Mechanical advantage
        const MA = circumference / lead;
        
        // Efficiency (square thread)
        const efficiency = Math.tan(leadAngle) / Math.tan(leadAngle + frictionAngle);
        
        // Self-locking check
        const selfLocking = leadAngle < frictionAngle;
        
        return {
            lead,
            leadAngleDeg,
            frictionAngleDeg,
            mechanicalAdvantage: MA,
            efficiency: efficiency * 100,  // Percentage
            selfLocking,
            backdrivable: !selfLocking,
            torqueToForce: (torque) => torque * 2 * Math.PI * efficiency / lead,
            forceToTorque: (force) => force * lead / (2 * Math.PI * efficiency)
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: STRESS ANALYSIS (MIT 2.001)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_STRESS = {
    
    /**
     * Calculate principal stresses (2D)
     * @param {Object} stress - Stress state {sigmaX, sigmaY, tauXY}
     * @returns {Object} Principal stresses and angles
     */
    principalStress: function(stress) {
        const { sigmaX, sigmaY, tauXY } = stress;
        
        const sigmaAvg = (sigmaX + sigmaY) / 2;
        const R = Math.sqrt(Math.pow((sigmaX - sigmaY) / 2, 2) + tauXY * tauXY);
        
        const sigma1 = sigmaAvg + R;
        const sigma2 = sigmaAvg - R;
        
        // Principal angle (to sigma1)
        const theta_p = 0.5 * Math.atan2(2 * tauXY, sigmaX - sigmaY);
        
        // Maximum shear stress
        const tauMax = R;
        const theta_s = theta_p + Math.PI / 4;  // Shear plane angle
        
        return {
            sigma1,
            sigma2,
            principalAngle: theta_p * 180 / Math.PI,
            tauMax,
            shearAngle: theta_s * 180 / Math.PI,
            sigmaAvg,
            radius: R
        };
    },
    
    /**
     * Generate Mohr's circle data
     * @param {Object} stress - Stress state
     * @returns {Object} Mohr's circle parameters
     */
    mohrsCircle: function(stress) {
        const { sigmaX, sigmaY, tauXY } = stress;
        
        const center = (sigmaX + sigmaY) / 2;
        const radius = Math.sqrt(Math.pow((sigmaX - sigmaY) / 2, 2) + tauXY * tauXY);
        
        // Points on circle
        const pointX = { sigma: sigmaX, tau: tauXY };
        const pointY = { sigma: sigmaY, tau: -tauXY };
        
        // Generate circle points for plotting
        const circlePoints = [];
        for (let angle = 0; angle <= 2 * Math.PI; angle += 0.1) {
            circlePoints.push({
                sigma: center + radius * Math.cos(angle),
                tau: radius * Math.sin(angle)
            });
        }
        
        return {
            center,
            radius,
            pointX,
            pointY,
            sigma1: center + radius,
            sigma2: center - radius,
            tauMax: radius,
            circlePoints
        };
    },
    
    /**
     * Calculate Von Mises stress
     * @param {Object} stress - Stress state (2D or 3D)
     * @returns {Object} Von Mises stress and yield check
     */
    vonMises: function(stress, sigmaYield = null) {
        const { sigmaX = 0, sigmaY = 0, sigmaZ = 0, tauXY = 0, tauYZ = 0, tauXZ = 0 } = stress;
        
        // Von Mises stress formula
        const term1 = Math.pow(sigmaX - sigmaY, 2);
        const term2 = Math.pow(sigmaY - sigmaZ, 2);
        const term3 = Math.pow(sigmaZ - sigmaX, 2);
        const term4 = 6 * (tauXY * tauXY + tauYZ * tauYZ + tauXZ * tauXZ);
        
        const sigmaVM = Math.sqrt((term1 + term2 + term3 + term4) / 2);
        
        const result = {
            vonMisesStress: sigmaVM,
            formula: 'σ_vm = √[(σx-σy)² + (σy-σz)² + (σz-σx)² + 6(τxy² + τyz² + τxz²)] / √2'
        };
        
        if (sigmaYield !== null) {
            result.safetyFactor = sigmaYield / sigmaVM;
            result.yielding = sigmaVM >= sigmaYield;
        }
        
        return result;
    },
    
    /**
     * Tresca (maximum shear stress) criterion
     * @param {Object} principal - Principal stresses {sigma1, sigma2, sigma3}
     * @param {number} sigmaYield - Yield stress
     * @returns {Object} Tresca analysis
     */
    tresca: function(principal, sigmaYield = null) {
        const { sigma1 = 0, sigma2 = 0, sigma3 = 0 } = principal;
        
        // Sort principal stresses
        const sorted = [sigma1, sigma2, sigma3].sort((a, b) => b - a);
        const sigmaMax = sorted[0];
        const sigmaMin = sorted[2];
        
        const tauMax = (sigmaMax - sigmaMin) / 2;
        
        const result = {
            maxShearStress: tauMax,
            sigmaMax,
            sigmaMin
        };
        
        if (sigmaYield !== null) {
            const tauYield = sigmaYield / 2;
            result.safetyFactor = tauYield / tauMax;
            result.yielding = tauMax >= tauYield;
        }
        
        return result;
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: FATIGUE ANALYSIS (MIT 2.001)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_FATIGUE = {
    
    /**
     * Modified Goodman fatigue analysis
     * @param {Object} params - Stress and material parameters
     * @returns {Object} Fatigue safety factor
     */
    goodman: function(params) {
        const {
            sigmaA,      // Alternating stress amplitude
            sigmaM,      // Mean stress
            Se,          // Endurance limit
            Sut,         // Ultimate tensile strength
            Kf = 1       // Fatigue stress concentration factor
        } = params;
        
        // Apply stress concentration to alternating stress
        const sigmaAeff = Kf * sigmaA;
        
        // Goodman line: σa/Se + σm/Sut = 1/n
        // Solve for n: n = 1 / (σa/Se + σm/Sut)
        const safetyFactor = 1 / (sigmaAeff / Se + sigmaM / Sut);
        
        // Also calculate by other criteria
        const soderberg = 1 / (sigmaAeff / Se + sigmaM / params.Sy);  // If Sy provided
        
        return {
            safetyFactor,
            criterion: 'Modified Goodman',
            effectiveAlternating: sigmaAeff,
            meanStress: sigmaM,
            infiniteLife: safetyFactor > 1,
            formula: 'σa/Se + σm/Sut = 1/n'
        };
    },
    
    /**
     * Miner's rule for cumulative damage
     * @param {Array} loadHistory - Array of {stress, cycles, Nf} objects
     * @returns {Object} Cumulative damage analysis
     */
    minerRule: function(loadHistory) {
        let totalDamage = 0;
        const damages = [];
        
        for (const load of loadHistory) {
            const { stress, cycles, Nf } = load;
            const damage = cycles / Nf;
            damages.push({
                stress,
                cycles,
                cyclesToFailure: Nf,
                damage
            });
            totalDamage += damage;
        }
        
        return {
            cumulativeDamage: totalDamage,
            damages,
            failed: totalDamage >= 1,
            remainingLife: totalDamage < 1 ? 1 - totalDamage : 0,
            formula: 'D = Σ(ni/Ni), failure when D ≥ 1'
        };
    },
    
    /**
     * Estimate endurance limit from ultimate strength (steel)
     * @param {number} Sut - Ultimate tensile strength [MPa]
     * @param {Object} factors - Modification factors
     * @returns {Object} Corrected endurance limit
     */
    enduranceLimit: function(Sut, factors = {}) {
        const {
            ka = 1,    // Surface factor
            kb = 1,    // Size factor
            kc = 1,    // Load factor (1 for bending, 0.85 for axial, 0.59 for torsion)
            kd = 1,    // Temperature factor
            ke = 1,    // Reliability factor
            kf = 1     // Miscellaneous factor
        } = factors;
        
        // Base endurance limit (rotating beam)
        let SeePrime;
        if (Sut <= 1400) {
            SeePrime = 0.5 * Sut;
        } else {
            SeePrime = 700;  // MPa, cap for high-strength steels
        }
        
        // Corrected endurance limit
        const Se = ka * kb * kc * kd * ke * kf * SeePrime;
        
        return {
            SeePrime,
            Se,
            factors: { ka, kb, kc, kd, ke, kf },
            formula: "Se = ka×kb×kc×kd×ke×kf×Se'"
        };
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: MACHINE DESIGN (MIT 2.72)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_DESIGN = {
    
    /**
     * Bolted joint analysis
     * @param {Object} params - Joint parameters
     * @returns {Object} Joint analysis results
     */
    boltJoint: function(params) {
        const {
            At,          // Tensile stress area [mm²]
            E_bolt,      // Bolt modulus [MPa]
            E_member,    // Member modulus [MPa]
            L_grip,      // Grip length [mm]
            d,           // Nominal bolt diameter [mm]
            Fi,          // Preload [N]
            P            // External load [N]
        } = params;
        
        // Bolt stiffness
        const kb = At * E_bolt / L_grip;
        
        // Member stiffness (frustum approximation)
        const km = (Math.PI * E_member * d * Math.tan(30 * Math.PI / 180)) /
                   Math.log((L_grip + 0.5 * d) / (L_grip + 2.5 * d));
        
        // Joint constant
        const C = kb / (kb + km);
        
        // Bolt force under load
        const Fb = Fi + C * P;
        
        // Member force under load
        const Fm = Fi - (1 - C) * P;
        
        // Separation load
        const P_sep = Fi / (1 - C);
        
        // Safety factors
        const n_sep = P_sep / P;
        
        return {
            boltStiffness: kb,
            memberStiffness: km,
            jointConstant: C,
            boltForce: Fb,
            memberForce: Fm,
            separationLoad: P_sep,
            separationSafetyFactor: n_sep,
            jointSeparates: P >= P_sep
        };
    },
    
    /**
     * Shaft diameter calculation
     * @param {Object} params - Loading and material parameters
     * @returns {Object} Required shaft diameter
     */
    shaftDiameter: function(params) {
        const {
            M,           // Bending moment [N·mm]
            T,           // Torque [N·mm]
            Sy,          // Yield strength [MPa]
            n = 2        // Safety factor
        } = params;
        
        // DE-ASME (static, ductile materials)
        // d³ = (16n/π) × √[(M/Sy)² + (3/4)(T/Sy)²]
        const d_cubed = (16 * n / Math.PI) * 
            Math.sqrt(Math.pow(M / Sy, 2) + 0.75 * Math.pow(T / Sy, 2));
        
        const d = Math.pow(d_cubed, 1/3);
        
        // Round up to standard size
        const standardSizes = [6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 32, 35, 38, 40, 45, 50];
        const d_standard = standardSizes.find(s => s >= d) || Math.ceil(d);
        
        return {
            calculatedDiameter: d,
            recommendedDiameter: d_standard,
            safetyFactor: n,
            formula: 'd³ = (16n/π)√[(M/Sy)² + (3/4)(T/Sy)²]'
        };
    },
    
    /**
     * Ball bearing L10 life calculation
     * @param {Object} params - Bearing parameters
     * @returns {Object} Bearing life estimate
     */
    bearingLife: function(params) {
        const {
            C,           // Basic dynamic load rating [N]
            P,           // Equivalent dynamic load [N]
            n_rpm,       // Rotational speed [rpm]
            type = 'ball', // 'ball' or 'roller'
            a1 = 1,      // Reliability factor
            a2 = 1,      // Material factor
            a3 = 1       // Lubrication factor
        } = params;
        
        // Life exponent
        const p = type === 'ball' ? 3 : 10/3;
        
        // Basic L10 life (90% reliability)
        const L10_rev = Math.pow(C / P, p) * 1e6;  // Revolutions
        
        // L10 in hours
        const L10_hours = L10_rev / (60 * n_rpm);
        
        // Adjusted life
        const Lna = a1 * a2 * a3 * L10_hours;
        
        return {
            L10_revolutions: L10_rev,
            L10_hours,
            adjustedLife_hours: Lna,
            exponent: p,
            factors: { a1, a2, a3 },
            formula: 'L10 = (C/P)^p × 10⁶ revolutions'
        };
    },
    
    /**
     * Helical compression spring design
     * @param {Object} params - Spring parameters
     * @returns {Object} Spring characteristics
     */
    helicalSpring: function(params) {
        const {
            d,           // Wire diameter [mm]
            D,           // Mean coil diameter [mm]
            Na,          // Active coils
            G,           // Shear modulus [MPa]
            F = null     // Applied force [N] (optional)
        } = params;
        
        // Spring index
        const C_index = D / d;
        
        // Spring rate
        const k = G * Math.pow(d, 4) / (8 * Math.pow(D, 3) * Na);
        
        // Wahl factor (for fatigue)
        const Kw = (4 * C_index - 1) / (4 * C_index - 4) + 0.615 / C_index;
        
        // Shear stress correction (static)
        const Ks = 1 + 0.5 / C_index;
        
        const result = {
            springIndex: C_index,
            springRate: k,
            wahlFactor: Kw,
            staticFactor: Ks,
            indexValid: C_index >= 4 && C_index <= 12
        };
        
        if (F !== null) {
            // Shear stress under load
            const tau = Ks * 8 * F * D / (Math.PI * Math.pow(d, 3));
            const tau_fatigue = Kw * 8 * F * D / (Math.PI * Math.pow(d, 3));
            const deflection = F / k;
            
            result.shearStress = tau;
            result.fatigueStress = tau_fatigue;
            result.deflection = deflection;
        }
        
        return result;
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: PRECISION DESIGN (MIT 2.75)
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_PRECISION = {
    
    /**
     * Abbe error calculation
     * @param {Object} params - Offset and angular error
     * @returns {Object} Abbe error analysis
     */
    abbeError: function(params) {
        const {
            offset,      // Abbe offset [mm]
            angularError // Angular error [radians] or [degrees] with isDegrees flag
        } = params;
        
        let theta = angularError;
        if (params.isDegrees) {
            theta = angularError * Math.PI / 180;
        }
        
        // Abbe error = offset × sin(θ) ≈ offset × θ for small angles
        const errorExact = offset * Math.sin(theta);
        const errorApprox = offset * theta;
        
        return {
            abbeError: errorExact,
            approximateError: errorApprox,
            offset,
            angularErrorRad: theta,
            angularErrorArcSec: theta * 180 * 3600 / Math.PI,
            formula: 'ε = d × sin(θ) ≈ d × θ',
            recommendation: offset > 10 ? 'Consider reducing Abbe offset' : 'Offset acceptable'
        };
    },
    
    /**
     * Thermal expansion error
     * @param {Object} params - Dimensions and temperature change
     * @returns {Object} Thermal error analysis
     */
    thermalError: function(params) {
        const {
            length,      // Nominal length [mm]
            alpha,       // CTE [1/°C] (e.g., 11.7e-6 for steel)
            deltaT       // Temperature change [°C]
        } = params;
        
        const expansion = alpha * length * deltaT;
        
        // For reference, common CTEs
        const commonCTEs = {
            steel: 11.7e-6,
            aluminum: 23.1e-6,
            invar: 1.2e-6,
            zerodur: 0.05e-6,
            granite: 6e-6
        };
        
        return {
            thermalExpansion: expansion,
            strainPPM: alpha * deltaT * 1e6,
            length,
            cte: alpha,
            temperatureChange: deltaT,
            formula: 'ΔL = α × L × ΔT',
            commonCTEs
        };
    },
    
    /**
     * Blade flexure stiffness
     * @param {Object} params - Flexure geometry and material
     * @returns {Object} Flexure properties
     */
    bladeFlexure: function(params) {
        const {
            E,           // Young's modulus [MPa]
            b,           // Width [mm]
            t,           // Thickness [mm]
            L,           // Length [mm]
            Sy = null    // Yield strength [MPa] (optional)
        } = params;
        
        // Second moment of area
        const I = b * Math.pow(t, 3) / 12;
        
        // Rotational stiffness
        const k_theta = E * I / L;  // N·mm/rad
        
        // Linear stiffness (lateral)
        const k_lateral = 12 * E * I / Math.pow(L, 3);  // N/mm
        
        // Axial stiffness
        const k_axial = E * b * t / L;  // N/mm
        
        const result = {
            momentOfInertia: I,
            rotationalStiffness: k_theta,
            lateralStiffness: k_lateral,
            axialStiffness: k_axial,
            stiffnessRatio: k_axial / k_lateral  // Should be >> 1 for good flexure
        };
        
        if (Sy !== null) {
            // Maximum rotation before yield
            // σ = E × t × θ / (2L) => θ_max = 2 × L × Sy / (E × t)
            const theta_max = 2 * L * Sy / (E * t);
            result.maxRotationRad = theta_max;
            result.maxRotationDeg = theta_max * 180 / Math.PI;
        }
        
        return result;
    }