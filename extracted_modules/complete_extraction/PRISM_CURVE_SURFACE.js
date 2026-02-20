const PRISM_CURVE_SURFACE = {

    version: '1.0.0',
    source: 'Stanford CS348A',

    /**
     * De Casteljau Algorithm for Bezier Curves
     * Numerically stable recursive evaluation
     * O(n²) for degree n
     */
    deCasteljau: {
        /**
         * Evaluate Bezier curve at parameter t
         * @param {Array} controlPoints - Array of {x, y, z} control points
         * @param {number} t - Parameter in [0, 1]
         */
        evaluate: function(controlPoints, t) {
            if (controlPoints.length === 1) return controlPoints[0];

            const newPoints = [];
            for (let i = 0; i < controlPoints.length - 1; i++) {
                newPoints.push({
                    x: (1 - t) * controlPoints[i].x + t * controlPoints[i + 1].x,
                    y: (1 - t) * controlPoints[i].y + t * controlPoints[i + 1].y,
                    z: (1 - t) * (controlPoints[i].z || 0) + t * (controlPoints[i + 1].z || 0)
                });
            }
            return this.evaluate(newPoints, t);
        },
        /**
         * Evaluate derivative at parameter t
         */
        derivative: function(controlPoints, t) {
            const n = controlPoints.length - 1;

            // Derivative control points
            const derivPoints = [];
            for (let i = 0; i < n; i++) {
                derivPoints.push({
                    x: n * (controlPoints[i + 1].x - controlPoints[i].x),
                    y: n * (controlPoints[i + 1].y - controlPoints[i].y),
                    z: n * ((controlPoints[i + 1].z || 0) - (controlPoints[i].z || 0))
                });
            }
            return this.evaluate(derivPoints, t);
        },
        /**
         * Subdivide curve at parameter t
         * Returns two Bezier curves
         */
        subdivide: function(controlPoints, t = 0.5) {
            const left = [controlPoints[0]];
            const right = [controlPoints[controlPoints.length - 1]];

            let current = controlPoints;

            while (current.length > 1) {
                const next = [];
                for (let i = 0; i < current.length - 1; i++) {
                    next.push({
                        x: (1 - t) * current[i].x + t * current[i + 1].x,
                        y: (1 - t) * current[i].y + t * current[i + 1].y,
                        z: (1 - t) * (current[i].z || 0) + t * (current[i + 1].z || 0)
                    });
                }
                left.push(next[0]);
                right.unshift(next[next.length - 1]);
                current = next;
            }
            return { left, right };
        }
    },
    /**
     * De Boor Algorithm for B-Spline/NURBS Curves
     * Numerically stable evaluation
     * O(k²) for degree k
     */
    deBoor: {
        /**
         * Evaluate B-spline curve at parameter u
         * @param {Array} controlPoints - Control points
         * @param {number} degree - Curve degree
         * @param {Array} knots - Knot vector
         * @param {number} u - Parameter value
         */
        evaluate: function(controlPoints, degree, knots, u) {
            const n = controlPoints.length - 1;
            const p = degree;

            // Find knot span
            let k = this.findSpan(n, p, u, knots);

            // Clamp to valid range
            if (k < p) k = p;
            if (k > n) k = n;

            // Initialize with affected control points
            const d = [];
            for (let j = 0; j <= p; j++) {
                const idx = k - p + j;
                if (idx >= 0 && idx <= n) {
                    d.push({ ...controlPoints[idx] });
                } else {
                    d.push({ x: 0, y: 0, z: 0 });
                }
            }
            // Triangular computation
            for (let r = 1; r <= p; r++) {
                for (let j = p; j >= r; j--) {
                    const i = k - p + j;
                    const alpha = (u - knots[i]) / (knots[i + p + 1 - r] - knots[i]);

                    d[j] = {
                        x: (1 - alpha) * d[j - 1].x + alpha * d[j].x,
                        y: (1 - alpha) * d[j - 1].y + alpha * d[j].y,
                        z: (1 - alpha) * (d[j - 1].z || 0) + alpha * (d[j].z || 0)
                    };
                }
            }
            return d[p];
        },
        /**
         * Find knot span containing u
         */
        findSpan: function(n, p, u, knots) {
            if (u >= knots[n + 1]) return n;
            if (u <= knots[p]) return p;

            let low = p, high = n + 1;
            let mid = Math.floor((low + high) / 2);

            while (u < knots[mid] || u >= knots[mid + 1]) {
                if (u < knots[mid]) high = mid;
                else low = mid;
                mid = Math.floor((low + high) / 2);
            }
            return mid;
        },
        /**
         * Evaluate NURBS curve (rational B-spline)
         */
        evaluateNURBS: function(controlPoints, weights, degree, knots, u) {
            const n = controlPoints.length;

            // Create homogeneous control points
            const homogeneous = controlPoints.map((p, i) => ({
                x: p.x * weights[i],
                y: p.y * weights[i],
                z: (p.z || 0) * weights[i],
                w: weights[i]
            }));

            // Evaluate as 4D B-spline
            const result = this.evaluate(homogeneous, degree, knots, u);

            // Project back to 3D
            return {
                x: result.x / result.w,
                y: result.y / result.w,
                z: result.z / result.w
            };
        },
        /**
         * Compute basis functions (for debugging/visualization)
         */
        basisFunctions: function(i, p, u, knots) {
            const N = Array(p + 1).fill(0);

            // N[0] = 1 at start
            N[0] = 1;

            const left = Array(p + 1).fill(0);
            const right = Array(p + 1).fill(0);

            for (let j = 1; j <= p; j++) {
                left[j] = u - knots[i + 1 - j];
                right[j] = knots[i + j] - u;

                let saved = 0;
                for (let r = 0; r < j; r++) {
                    const temp = N[r] / (right[r + 1] + left[j - r]);
                    N[r] = saved + right[r + 1] * temp;
                    saved = left[j - r] * temp;
                }
                N[j] = saved;
            }
            return N;
        }
    },
    /**
     * Bezier Surface Evaluation
     */
    bezierSurface: {
        evaluate: function(controlGrid, u, v) {
            // Evaluate in u direction for each row
            const uCurve = controlGrid.map(row =>
                PRISM_CURVE_SURFACE.deCasteljau.evaluate(row, u)
            );

            // Evaluate in v direction
            return PRISM_CURVE_SURFACE.deCasteljau.evaluate(uCurve, v);
        },
        normal: function(controlGrid, u, v, epsilon = 0.0001) {
            const p = this.evaluate(controlGrid, u, v);
            const pu = this.evaluate(controlGrid, Math.min(u + epsilon, 1), v);
            const pv = this.evaluate(controlGrid, u, Math.min(v + epsilon, 1));

            const du = { x: pu.x - p.x, y: pu.y - p.y, z: pu.z - p.z };
            const dv = { x: pv.x - p.x, y: pv.y - p.y, z: pv.z - p.z };

            const n = {
                x: du.y * dv.z - du.z * dv.y,
                y: du.z * dv.x - du.x * dv.z,
                z: du.x * dv.y - du.y * dv.x
            };
            const len = Math.sqrt(n.x*n.x + n.y*n.y + n.z*n.z);
            return len > 1e-10 ? { x: n.x/len, y: n.y/len, z: n.z/len } : { x: 0, y: 0, z: 1 };
        }
    }
}