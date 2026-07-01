/**
 * PRISM_NURBS_MIT
 * Extracted from PRISM v8.89.002 monolith
 * References: 12
 * Category: cad
 * Lines: 582
 * Session: R2.3.3 Algorithm Extraction Wave 2
 */

const PRISM_NURBS_MIT = {
    /**
     * Evaluate B-spline basis function using Cox-de Boor recursion
     * @param {number} i - Basis function index
     * @param {number} k - Order (degree + 1)
     * @param {number} u - Parameter value
     * @param {Array} knots - Knot vector
     * @returns {number} Basis function value
     */
    basisFunction: function(i, k, u, knots) {
        // Base case: k = 1
        if (k === 1) {
            return (u >= knots[i] && u < knots[i + 1]) ? 1.0 : 0.0;
        }
        
        let left = 0, right = 0;
        
        // Left term
        const denom1 = knots[i + k - 1] - knots[i];
        if (Math.abs(denom1) > 1e-10) {
            left = ((u - knots[i]) / denom1) * this.basisFunction(i, k - 1, u, knots);
        }
        
        // Right term
        const denom2 = knots[i + k] - knots[i + 1];
        if (Math.abs(denom2) > 1e-10) {
            right = ((knots[i + k] - u) / denom2) * this.basisFunction(i + 1, k - 1, u, knots);
        }
        
        return left + right;
    },

    /**
     * Evaluate B-spline curve at parameter u using de Boor algorithm
     * More efficient than direct basis function evaluation
     * @param {number} u - Parameter value
     * @param {number} k - Order (degree + 1)
     * @param {Array} knots - Knot vector
     * @param {Array} controlPoints - Control points [{x,y,z}, ...]
     * @returns {Object} Point {x, y, z}
     */
    deBoor: function(u, k, knots, controlPoints) {
        const n = controlPoints.length - 1;
        const p = k - 1; // degree
        
        // Find span index
        let s = p;
        for (let i = p; i < n + 1; i++) {
            if (u >= knots[i] && u < knots[i + 1]) {
                s = i;
                break;
            }
        }
        // Handle u = knots[n+1] case
        if (Math.abs(u - knots[n + 1]) < 1e-10) {
            s = n;
        }
        
        // Initialize d array with affected control points
        const d = [];
        for (let i = 0; i <= p; i++) {
            d[i] = {
                x: controlPoints[s - p + i].x,
                y: controlPoints[s - p + i].y,
                z: controlPoints[s - p + i].z || 0
            };
        }
        
        // de Boor recursion
        for (let r = 1; r <= p; r++) {
            for (let i = p; i >= r; i--) {
                const alpha = (u - knots[s - p + i]) / (knots[s + 1 + i - r] - knots[s - p + i]);
                d[i] = {
                    x: (1 - alpha) * d[i - 1].x + alpha * d[i].x,
                    y: (1 - alpha) * d[i - 1].y + alpha * d[i].y,
                    z: (1 - alpha) * d[i - 1].z + alpha * d[i].z
                };
            }
        }
        
        return d[p];
    },

    /**
     * Evaluate NURBS curve at parameter u
     * @param {number} u - Parameter value
     * @param {number} k - Order
     * @param {Array} knots - Knot vector
     * @param {Array} controlPoints - Control points with weights [{x,y,z,w}, ...]
     * @returns {Object} Point {x, y, z}
     */
    evaluateNURBS: function(u, k, knots, controlPoints) {
        // Convert to homogeneous coordinates
        const homogeneous = controlPoints.map(p => ({
            x: p.x * p.w,
            y: p.y * p.w,
            z: (p.z || 0) * p.w,
            w: p.w
        }));
        
        // Evaluate using de Boor
        const result = this.deBoor(u, k, knots, homogeneous);
        
        // Project back from homogeneous
        return {
            x: result.x / result.z, // z holds the w coordinate here
            y: result.y / result.z,
            z: 0
        };
    },

    /**
     * Generate uniform B-spline knot vector
     * @param {number} n - Number of control points - 1
     * @param {number} k - Order
     * @param {boolean} clamped - Use clamped (open) knot vector
     * @returns {Array} Knot vector
     */
    generateKnotVector: function(n, k, clamped = true) {
        const numKnots = n + k + 1;
        const knots = [];
        
        if (clamped) {
            // Clamped: first k and last k knots are repeated
            for (let i = 0; i < k; i++) knots.push(0);
            for (let i = 1; i <= n - k + 2; i++) knots.push(i / (n - k + 2));
            for (let i = 0; i < k; i++) knots.push(1);
        } else {
            // Uniform
            for (let i = 0; i < numKnots; i++) {
                knots.push(i / (numKnots - 1));
            }
        }
        
        return knots;
    },

    /**
     * Boehm's knot insertion algorithm
     * @param {number} uNew - New knot to insert
     * @param {number} k - Order
     * @param {Array} knots - Current knot vector
     * @param {Array} controlPoints - Current control points
     * @returns {Object} {knots, controlPoints} - Updated arrays
     */
    insertKnot: function(uNew, k, knots, controlPoints) {
        const n = controlPoints.length - 1;
        
        // Find span for new knot
        let s = 0;
        for (let i = 0; i < knots.length - 1; i++) {
            if (uNew >= knots[i] && uNew < knots[i + 1]) {
                s = i;
                break;
            }
        }
        
        // Create new knot vector
        const newKnots = [...knots.slice(0, s + 1), uNew, ...knots.slice(s + 1)];
        
        // Create new control points
        const newCP = [];
        for (let i = 0; i <= n + 1; i++) {
            if (i <= s - k + 1) {
                newCP[i] = { ...controlPoints[i] };
            } else if (i >= s + 1) {
                newCP[i] = { ...controlPoints[i - 1] };
            } else {
                const alpha = (uNew - knots[i]) / (knots[i + k - 1] - knots[i]);
                newCP[i] = {
                    x: (1 - alpha) * controlPoints[i - 1].x + alpha * controlPoints[i].x,
                    y: (1 - alpha) * controlPoints[i - 1].y + alpha * controlPoints[i].y,
                    z: (1 - alpha) * (controlPoints[i - 1].z || 0) + alpha * (controlPoints[i].z || 0)
                };
            }
        }
        
        return { knots: newKnots, controlPoints: newCP };
    }
};

// ═══════════════════════════════════════════════════════════════
// BÉZIER CURVES (MIT 2.158J)
// ═══════════════════════════════════════════════════════════════

const PRISM_BEZIER_MIT = {
    /**
     * Binomial coefficient C(n, k)
     */
    binomial: function(n, k) {
        if (k < 0 || k > n) return 0;
        if (k === 0 || k === n) return 1;
        
        let result = 1;
        for (let i = 0; i < k; i++) {
            result = result * (n - i) / (i + 1);
        }
        return result;
    },

    /**
     * Bernstein basis polynomial
     * @param {number} i - Index
     * @param {number} n - Degree
     * @param {number} u - Parameter [0,1]
     * @returns {number} Basis value
     */
    bernstein: function(i, n, u) {
        return this.binomial(n, i) * Math.pow(u, i) * Math.pow(1 - u, n - i);
    },

    /**
     * Evaluate Bézier curve at parameter u
     * @param {number} u - Parameter [0,1]
     * @param {Array} controlPoints - Control points
     * @returns {Object} Point {x, y, z}
     */
    evaluate: function(u, controlPoints) {
        const n = controlPoints.length - 1;
        let x = 0, y = 0, z = 0;
        
        for (let i = 0; i <= n; i++) {
            const B = this.bernstein(i, n, u);
            x += B * controlPoints[i].x;
            y += B * controlPoints[i].y;
            z += B * (controlPoints[i].z || 0);
        }
        
        return { x, y, z };
    },

    /**
     * de Casteljau algorithm for Bézier evaluation and subdivision
     * @param {number} u - Parameter [0,1]
     * @param {Array} controlPoints - Control points
     * @returns {Object} {point, left, right} - Point and subdivided curves
     */
    deCasteljau: function(u, controlPoints) {
        const n = controlPoints.length - 1;
        const pyramid = [controlPoints.map(p => ({ ...p }))];
        
        // Build de Casteljau pyramid
        for (let r = 1; r <= n; r++) {
            pyramid[r] = [];
            for (let i = 0; i <= n - r; i++) {
                pyramid[r][i] = {
                    x: (1 - u) * pyramid[r - 1][i].x + u * pyramid[r - 1][i + 1].x,
                    y: (1 - u) * pyramid[r - 1][i].y + u * pyramid[r - 1][i + 1].y,
                    z: (1 - u) * (pyramid[r - 1][i].z || 0) + u * (pyramid[r - 1][i + 1].z || 0)
                };
            }
        }
        
        // Extract subdivision control points
        const left = [];
        const right = [];
        for (let i = 0; i <= n; i++) {
            left.push(pyramid[i][0]);
            right.push(pyramid[n - i][i]);
        }
        
        return {
            point: pyramid[n][0],
            left: left,
            right: right
        };
    },

    /**
     * Compute Bézier curve derivative
     * @param {Array} controlPoints - Control points
     * @returns {Array} Derivative control points (n-1 points)
     */
    derivative: function(controlPoints) {
        const n = controlPoints.length - 1;
        const deriv = [];
        
        for (let i = 0; i < n; i++) {
            deriv.push({
                x: n * (controlPoints[i + 1].x - controlPoints[i].x),
                y: n * (controlPoints[i + 1].y - controlPoints[i].y),
                z: n * ((controlPoints[i + 1].z || 0) - (controlPoints[i].z || 0))
            });
        }
        
        return deriv;
    }
};

// ═══════════════════════════════════════════════════════════════
// SURFACE GEOMETRY (MIT 2.158J)
// ═══════════════════════════════════════════════════════════════

const PRISM_SURFACE_GEOMETRY_MIT = {
    /**
     * Evaluate tensor product B-spline surface
     * @param {number} u - U parameter
     * @param {number} v - V parameter
     * @param {number} ku - U order
     * @param {number} kv - V order
     * @param {Array} knotsU - U knot vector
     * @param {Array} knotsV - V knot vector
     * @param {Array} controlGrid - 2D array of control points
     * @returns {Object} Point {x, y, z}
     */
    evaluateBSplineSurface: function(u, v, ku, kv, knotsU, knotsV, controlGrid) {
        const nu = controlGrid.length;
        const nv = controlGrid[0].length;
        
        let x = 0, y = 0, z = 0;
        
        for (let i = 0; i < nu; i++) {
            for (let j = 0; j < nv; j++) {
                const Nu = PRISM_NURBS_MIT.basisFunction(i, ku, u, knotsU);
                const Nv = PRISM_NURBS_MIT.basisFunction(j, kv, v, knotsV);
                const N = Nu * Nv;
                
                x += N * controlGrid[i][j].x;
                y += N * controlGrid[i][j].y;
                z += N * controlGrid[i][j].z;
            }
        }
        
        return { x, y, z };
    },

    /**
     * Compute surface normal at (u, v)
     * Uses finite differences for partial derivatives
     * @param {Function} surfaceEval - Surface evaluation function S(u,v)
     * @param {number} u - U parameter
     * @param {number} v - V parameter
     * @param {number} h - Step size for finite differences
     * @returns {Object} Unit normal {x, y, z}
     */
    computeNormal: function(surfaceEval, u, v, h = 0.001) {
        // Partial derivatives via central differences
        const Su_plus = surfaceEval(u + h, v);
        const Su_minus = surfaceEval(u - h, v);
        const Sv_plus = surfaceEval(u, v + h);
        const Sv_minus = surfaceEval(u, v - h);
        
        const Su = {
            x: (Su_plus.x - Su_minus.x) / (2 * h),
            y: (Su_plus.y - Su_minus.y) / (2 * h),
            z: (Su_plus.z - Su_minus.z) / (2 * h)
        };
        
        const Sv = {
            x: (Sv_plus.x - Sv_minus.x) / (2 * h),
            y: (Sv_plus.y - Sv_minus.y) / (2 * h),
            z: (Sv_plus.z - Sv_minus.z) / (2 * h)
        };
        
        // Cross product Su × Sv
        const normal = {
            x: Su.y * Sv.z - Su.z * Sv.y,
            y: Su.z * Sv.x - Su.x * Sv.z,
            z: Su.x * Sv.y - Su.y * Sv.x
        };
        
        // Normalize
        const len = Math.sqrt(normal.x ** 2 + normal.y ** 2 + normal.z ** 2);
        if (len < 1e-10) return { x: 0, y: 0, z: 1 };
        
        return {
            x: normal.x / len,
            y: normal.y / len,
            z: normal.z / len
        };
    },

    /**
     * Compute Gaussian and mean curvature at (u, v)
     * @param {Function} surfaceEval - Surface evaluation function
     * @param {number} u - U parameter
     * @param {number} v - V parameter
     * @param {number} h - Step size
     * @returns {Object} {gaussian, mean, principal1, principal2}
     */
    computeCurvature: function(surfaceEval, u, v, h = 0.001) {
        // First derivatives
        const Su_plus = surfaceEval(u + h, v);
        const Su_minus = surfaceEval(u - h, v);
        const Sv_plus = surfaceEval(u, v + h);
        const Sv_minus = surfaceEval(u, v - h);
        const S = surfaceEval(u, v);
        
        const Su = {
            x: (Su_plus.x - Su_minus.x) / (2 * h),
            y: (Su_plus.y - Su_minus.y) / (2 * h),
            z: (Su_plus.z - Su_minus.z) / (2 * h)
        };
        
        const Sv = {
            x: (Sv_plus.x - Sv_minus.x) / (2 * h),
            y: (Sv_plus.y - Sv_minus.y) / (2 * h),
            z: (Sv_plus.z - Sv_minus.z) / (2 * h)
        };
        
        // Second derivatives
        const Suu = {
            x: (Su_plus.x - 2 * S.x + Su_minus.x) / (h * h),
            y: (Su_plus.y - 2 * S.y + Su_minus.y) / (h * h),
            z: (Su_plus.z - 2 * S.z + Su_minus.z) / (h * h)
        };
        
        const Svv = {
            x: (Sv_plus.x - 2 * S.x + Sv_minus.x) / (h * h),
            y: (Sv_plus.y - 2 * S.y + Sv_minus.y) / (h * h),
            z: (Sv_plus.z - 2 * S.z + Sv_minus.z) / (h * h)
        };
        
        // Mixed derivative
        const Suv_pp = surfaceEval(u + h, v + h);
        const Suv_pm = surfaceEval(u + h, v - h);
        const Suv_mp = surfaceEval(u - h, v + h);
        const Suv_mm = surfaceEval(u - h, v - h);
        
        const Suv = {
            x: (Suv_pp.x - Suv_pm.x - Suv_mp.x + Suv_mm.x) / (4 * h * h),
            y: (Suv_pp.y - Suv_pm.y - Suv_mp.y + Suv_mm.y) / (4 * h * h),
            z: (Suv_pp.z - Suv_pm.z - Suv_mp.z + Suv_mm.z) / (4 * h * h)
        };
        
        // First fundamental form coefficients
        const E = Su.x * Su.x + Su.y * Su.y + Su.z * Su.z;
        const F = Su.x * Sv.x + Su.y * Sv.y + Su.z * Sv.z;
        const G = Sv.x * Sv.x + Sv.y * Sv.y + Sv.z * Sv.z;
        
        // Normal
        const normal = this.computeNormal(surfaceEval, u, v, h);
        
        // Second fundamental form coefficients
        const L = Suu.x * normal.x + Suu.y * normal.y + Suu.z * normal.z;
        const M = Suv.x * normal.x + Suv.y * normal.y + Suv.z * normal.z;
        const N = Svv.x * normal.x + Svv.y * normal.y + Svv.z * normal.z;
        
        // Curvatures
        const denom = E * G - F * F;
        const gaussian = (L * N - M * M) / denom;
        const mean = (E * N + G * L - 2 * F * M) / (2 * denom);
        
        // Principal curvatures from quadratic formula
        const discriminant = mean * mean - gaussian;
        const sqrtD = Math.sqrt(Math.max(0, discriminant));
        const k1 = mean + sqrtD;
        const k2 = mean - sqrtD;
        
        return {
            gaussian: gaussian,
            mean: mean,
            principal1: k1,
            principal2: k2,
            E, F, G, L, M, N
        };
    }
};

// ═══════════════════════════════════════════════════════════════
// ODE SOLVERS (MIT 2.086)
// ═══════════════════════════════════════════════════════════════

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
}