/**
 * PRISM_BEZIER_MIT
 * Extracted from PRISM v8.89.002 monolith
 * References: 11
 * Category: cad
 * Lines: 103
 * Session: R2.3.3 Algorithm Extraction Wave 2
 */

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
}