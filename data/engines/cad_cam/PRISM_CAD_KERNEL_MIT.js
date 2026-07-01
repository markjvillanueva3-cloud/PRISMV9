// PRISM_CAD_KERNEL_MIT - Lines 789641-789926 (286 lines) - CAD kernel\n\nconst PRISM_CAD_KERNEL_MIT = {
    
    // ─────────────────────────────────────────────────────────────────────────
    // NURBS & B-SPLINE ALGORITHMS (from 2.158J)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * De Boor Algorithm - Evaluate B-spline at parameter t
     * Source: MIT 2.158J Computational Geometry
     * @param {number} t - Parameter value
     * @param {number} degree - Spline degree
     * @param {Array} controlPoints - Array of control points [{x,y,z}]
     * @param {Array} knots - Knot vector
     * @returns {Object} Point {x, y, z}
     */
    deBoorEvaluate: function(t, degree, controlPoints, knots) {
        const n = controlPoints.length - 1;
        const p = degree;
        
        // Find knot span
        let k = this._findKnotSpan(t, degree, knots);
        
        // Extract relevant control points
        let d = [];
        for (let j = 0; j <= p; j++) {
            d[j] = { ...controlPoints[k - p + j] };
        }
        
        // De Boor recursion
        for (let r = 1; r <= p; r++) {
            for (let j = p; j >= r; j--) {
                const alpha = (t - knots[k - p + j]) / (knots[k + 1 + j - r] - knots[k - p + j]);
                d[j] = {
                    x: (1 - alpha) * d[j - 1].x + alpha * d[j].x,
                    y: (1 - alpha) * d[j - 1].y + alpha * d[j].y,
                    z: (1 - alpha) * (d[j - 1].z || 0) + alpha * (d[j].z || 0)
                };
            }
        }
        
        return d[p];
    },
    
    _findKnotSpan: function(t, degree, knots) {
        const n = knots.length - degree - 2;
        if (t >= knots[n + 1]) return n;
        if (t <= knots[degree]) return degree;
        
        let low = degree, high = n + 1;
        let mid = Math.floor((low + high) / 2);
        
        while (t < knots[mid] || t >= knots[mid + 1]) {
            if (t < knots[mid]) high = mid;
            else low = mid;
            mid = Math.floor((low + high) / 2);
        }
        
        return mid;
    },
    
    /**
     * De Casteljau Algorithm - Evaluate Bezier curve at parameter t
     * Source: MIT 2.158J, 6.837
     * @param {number} t - Parameter 0-1
     * @param {Array} controlPoints - Control points
     * @returns {Object} Point at t
     */
    deCasteljau: function(t, controlPoints) {
        if (controlPoints.length === 1) return controlPoints[0];
        
        const newPoints = [];
        for (let i = 0; i < controlPoints.length - 1; i++) {
            newPoints.push({
                x: (1 - t) * controlPoints[i].x + t * controlPoints[i + 1].x,
                y: (1 - t) * controlPoints[i].y + t * controlPoints[i + 1].y,
                z: (1 - t) * (controlPoints[i].z || 0) + t * (controlPoints[i + 1].z || 0)
            });
        }
        
        return this.deCasteljau(t, newPoints);
    },
    
    /**
     * Knot Insertion (Oslo Algorithm)
     * Source: MIT 2.158J
     * @param {number} u - New knot value
     * @param {Array} controlPoints - Current control points
     * @param {Array} knots - Current knot vector
     * @param {number} degree - Curve degree
     * @returns {Object} {newControlPoints, newKnots}
     */
    insertKnot: function(u, controlPoints, knots, degree) {
        const k = this._findKnotSpan(u, degree, knots);
        const n = controlPoints.length;
        
        // New knot vector
        const newKnots = [...knots.slice(0, k + 1), u, ...knots.slice(k + 1)];
        
        // New control points
        const newCP = [];
        for (let i = 0; i <= n; i++) {
            if (i <= k - degree) {
                newCP.push({ ...controlPoints[i] });
            } else if (i > k) {
                newCP.push({ ...controlPoints[i - 1] });
            } else {
                const alpha = (u - knots[i]) / (knots[i + degree] - knots[i]);
                newCP.push({
                    x: (1 - alpha) * controlPoints[i - 1].x + alpha * controlPoints[i].x,
                    y: (1 - alpha) * controlPoints[i - 1].y + alpha * controlPoints[i].y,
                    z: (1 - alpha) * (controlPoints[i - 1].z || 0) + alpha * (controlPoints[i].z || 0)
                });
            }
        }
        
        return { newControlPoints: newCP, newKnots };
    },
    
    /**
     * NURBS Surface Evaluation
     * Source: MIT 2.158J
     * @param {number} u - U parameter
     * @param {number} v - V parameter
     * @param {Array} controlNet - 2D array of control points with weights
     * @param {Array} knotsU - U direction knots
     * @param {Array} knotsV - V direction knots
     * @param {number} degreeU - U degree
     * @param {number} degreeV - V degree
     */
    evaluateNURBSSurface: function(u, v, controlNet, knotsU, knotsV, degreeU, degreeV) {
        const nU = controlNet.length;
        const nV = controlNet[0].length;
        
        // Evaluate in U direction first
        const uCurves = [];
        for (let j = 0; j < nV; j++) {
            const uPoints = controlNet.map(row => row[j]);
            uCurves.push(this._evaluateNURBSCurve(u, uPoints, knotsU, degreeU));
        }
        
        // Then in V direction
        return this._evaluateNURBSCurve(v, uCurves, knotsV, degreeV);
    },
    
    _evaluateNURBSCurve: function(t, weightedPoints, knots, degree) {
        // Convert to homogeneous coords, evaluate, convert back
        const homogeneous = weightedPoints.map(p => ({
            x: p.x * (p.w || 1),
            y: p.y * (p.w || 1),
            z: (p.z || 0) * (p.w || 1),
            w: p.w || 1
        }));
        
        const result = this.deBoorEvaluate(t, degree, homogeneous, knots);
        return {
            x: result.x / result.w,
            y: result.y / result.w,
            z: result.z / result.w
        };
    },

    // ─────────────────────────────────────────────────────────────────────────
    // GEOMETRIC ALGORITHMS (from 2.158J, 18.086)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Convex Hull - Graham Scan
     * Source: MIT 2.158J, 6.046J
     */
    convexHull2D: function(points) {
        if (points.length < 3) return points;
        
        // Find lowest point
        let start = 0;
        for (let i = 1; i < points.length; i++) {
            if (points[i].y < points[start].y || 
                (points[i].y === points[start].y && points[i].x < points[start].x)) {
                start = i;
            }
        }
        
        const pivot = points[start];
        const sorted = points.slice().sort((a, b) => {
            const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
            const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
            return angleA - angleB;
        });
        
        const stack = [sorted[0], sorted[1]];
        
        for (let i = 2; i < sorted.length; i++) {
            while (stack.length > 1 && this._ccw(stack[stack.length - 2], stack[stack.length - 1], sorted[i]) <= 0) {
                stack.pop();
            }
            stack.push(sorted[i]);
        }
        
        return stack;
    },
    
    _ccw: function(p1, p2, p3) {
        return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
    },
    
    /**
     * Curve-Curve Intersection using Bezier clipping
     * Source: MIT 2.158J
     */
    bezierClipIntersect: function(curve1, curve2, tolerance = 1e-6, maxIter = 50) {
        const intersections = [];
        this._bezierClipRecurse(curve1, curve2, 0, 1, 0, 1, intersections, tolerance, 0, maxIter);
        return intersections;
    },
    
    _bezierClipRecurse: function(c1, c2, t1min, t1max, t2min, t2max, results, tol, depth, maxDepth) {
        if (depth > maxDepth) return;
        
        const box1 = this._getBoundingBox(c1);
        const box2 = this._getBoundingBox(c2);
        
        if (!this._boxesIntersect(box1, box2)) return;
        
        if (this._boxSize(box1) < tol && this._boxSize(box2) < tol) {
            results.push({
                t1: (t1min + t1max) / 2,
                t2: (t2min + t2max) / 2,
                point: this.deCasteljau(0.5, c1)
            });
            return;
        }
        
        // Subdivide larger curve
        if (this._boxSize(box1) > this._boxSize(box2)) {
            const [c1a, c1b] = this._subdivideBezier(c1, 0.5);
            const tmid = (t1min + t1max) / 2;
            this._bezierClipRecurse(c1a, c2, t1min, tmid, t2min, t2max, results, tol, depth + 1, maxDepth);
            this._bezierClipRecurse(c1b, c2, tmid, t1max, t2min, t2max, results, tol, depth + 1, maxDepth);
        } else {
            const [c2a, c2b] = this._subdivideBezier(c2, 0.5);
            const tmid = (t2min + t2max) / 2;
            this._bezierClipRecurse(c1, c2a, t1min, t1max, t2min, tmid, results, tol, depth + 1, maxDepth);
            this._bezierClipRecurse(c1, c2b, t1min, t1max, tmid, t2max, results, tol, depth + 1, maxDepth);
        }
    },
    
    _subdivideBezier: function(points, t) {
        const left = [points[0]];
        const right = [points[points.length - 1]];
        let current = points;
        
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
        
        return [left, right];
    },
    
    _getBoundingBox: function(points) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of points) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }
        return { minX, minY, maxX, maxY };
    },
    
    _boxesIntersect: function(a, b) {
        return !(a.maxX < b.minX || b.maxX < a.minX || a.maxY < b.minY || b.maxY < a.minY);
    },
    
    _boxSize: function(box) {
        return Math.max(box.maxX - box.minX, box.maxY - box.minY);
    }
};
