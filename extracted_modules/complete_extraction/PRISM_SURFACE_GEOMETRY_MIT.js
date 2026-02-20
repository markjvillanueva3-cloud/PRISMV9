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
}