const PRISM_COLLISION_ALGORITHMS = {

    version: '1.0.0',
    source: 'MIT 6.838, Real-Time Collision Detection (Ericson)',

    /**
     * GJK Algorithm (Gilbert-Johnson-Keerthi)
     * Determines if two convex shapes intersect
     * O(n) per iteration, typically converges in 10-20 iterations
     *
     * CAM Application: Tool-workpiece collision detection
     */
    gjk: {
        /**
         * Check if two convex shapes intersect
         * @param {Function} support1 - Support function for shape 1: (direction) => farthest point
         * @param {Function} support2 - Support function for shape 2: (direction) => farthest point
         * @returns {boolean} True if shapes intersect
         */
        intersects: function(support1, support2, maxIterations = 50) {
            const support = (d) => this.minkowskiDiff(support1, support2, d);

            // Initial direction
            let d = { x: 1, y: 0, z: 0 };
            let simplex = [support(d)];

            d = this.negate(simplex[0]);

            for (let iter = 0; iter < maxIterations; iter++) {
                const a = support(d);

                // If a doesn't pass the origin, no intersection
                if (this.dot(a, d) < 0) return false;

                simplex.push(a);

                // Check if simplex contains origin, update simplex and direction
                const result = this.doSimplex(simplex, d);
                simplex = result.simplex;
                d = result.direction;

                if (result.containsOrigin) return true;
            }
            return false;
        },
        minkowskiDiff: function(support1, support2, d) {
            const p1 = support1(d);
            const p2 = support2(this.negate(d));
            return { x: p1.x - p2.x, y: p1.y - p2.y, z: p1.z - p2.z };
        },
        doSimplex: function(simplex, d) {
            switch (simplex.length) {
                case 2: return this.doSimplexLine(simplex, d);
                case 3: return this.doSimplexTriangle(simplex, d);
                case 4: return this.doSimplexTetrahedron(simplex, d);
                default: return { simplex, direction: d, containsOrigin: false };
            }
        },
        doSimplexLine: function(simplex, d) {
            const [b, a] = simplex;
            const ab = this.sub(b, a);
            const ao = this.negate(a);

            if (this.dot(ab, ao) > 0) {
                // Origin is between a and b
                const newD = this.tripleProduct(ab, ao, ab);
                return { simplex: [b, a], direction: newD, containsOrigin: false };
            } else {
                // Origin is beyond a
                return { simplex: [a], direction: ao, containsOrigin: false };
            }
        },
        doSimplexTriangle: function(simplex, d) {
            const [c, b, a] = simplex;
            const ab = this.sub(b, a);
            const ac = this.sub(c, a);
            const ao = this.negate(a);
            const abc = this.cross(ab, ac);

            if (this.dot(this.cross(abc, ac), ao) > 0) {
                if (this.dot(ac, ao) > 0) {
                    return { simplex: [c, a], direction: this.tripleProduct(ac, ao, ac), containsOrigin: false };
                } else {
                    return this.doSimplexLine([b, a], d);
                }
            } else {
                if (this.dot(this.cross(ab, abc), ao) > 0) {
                    return this.doSimplexLine([b, a], d);
                } else {
                    if (this.dot(abc, ao) > 0) {
                        return { simplex: [c, b, a], direction: abc, containsOrigin: false };
                    } else {
                        return { simplex: [b, c, a], direction: this.negate(abc), containsOrigin: false };
                    }
                }
            }
        },
        doSimplexTetrahedron: function(simplex, d) {
            const [d_, c, b, a] = simplex;
            const ab = this.sub(b, a);
            const ac = this.sub(c, a);
            const ad = this.sub(d_, a);
            const ao = this.negate(a);

            const abc = this.cross(ab, ac);
            const acd = this.cross(ac, ad);
            const adb = this.cross(ad, ab);

            if (this.dot(abc, ao) > 0) {
                return this.doSimplexTriangle([c, b, a], d);
            }
            if (this.dot(acd, ao) > 0) {
                return this.doSimplexTriangle([d_, c, a], d);
            }
            if (this.dot(adb, ao) > 0) {
                return this.doSimplexTriangle([b, d_, a], d);
            }
            // Origin is inside tetrahedron
            return { simplex, direction: d, containsOrigin: true };
        },
        // Vector utilities
        dot: (a, b) => a.x*b.x + a.y*b.y + a.z*b.z,
        cross: (a, b) => ({ x: a.y*b.z - a.z*b.y, y: a.z*b.x - a.x*b.z, z: a.x*b.y - a.y*b.x }),
        sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
        negate: (v) => ({ x: -v.x, y: -v.y, z: -v.z }),
        tripleProduct: function(a, b, c) {
            // (a × b) × c = b(a·c) - a(b·c)
            const ac = this.dot(a, c);
            const bc = this.dot(b, c);
            return { x: b.x*ac - a.x*bc, y: b.y*ac - a.y*bc, z: b.z*ac - a.z*bc };
        }
    },
    /**
     * SAT (Separating Axis Theorem)
     * Fast collision detection for convex polygons
     *
     * CAM Application: 2D fixture/workpiece collision checking
     */
    sat: {
        /**
         * Check if two convex 2D polygons intersect
         */
        intersects2D: function(poly1, poly2) {
            const axes = [...this.getAxes(poly1), ...this.getAxes(poly2)];

            for (const axis of axes) {
                const proj1 = this.project(poly1, axis);
                const proj2 = this.project(poly2, axis);

                if (!this.overlap(proj1, proj2)) {
                    return false; // Separating axis found
                }
            }
            return true; // No separating axis
        },
        getAxes: function(poly) {
            const axes = [];
            for (let i = 0; i < poly.length; i++) {
                const j = (i + 1) % poly.length;
                const edge = { x: poly[j].x - poly[i].x, y: poly[j].y - poly[i].y };
                // Perpendicular (normal)
                const len = Math.sqrt(edge.x*edge.x + edge.y*edge.y);
                axes.push({ x: -edge.y/len, y: edge.x/len });
            }
            return axes;
        },
        project: function(poly, axis) {
            let min = Infinity, max = -Infinity;
            for (const p of poly) {
                const proj = p.x * axis.x + p.y * axis.y;
                min = Math.min(min, proj);
                max = Math.max(max, proj);
            }
            return { min, max };
        },
        overlap: function(a, b) {
            return a.max >= b.min && b.max >= a.min;
        }
    },
    /**
     * Ray-Triangle Intersection (Möller–Trumbore)
     * Fast ray-triangle intersection test
     *
     * CAM Application: Tool gouge detection, surface point queries
     */
    rayTriangle: function(rayOrigin, rayDir, v0, v1, v2) {
        const EPSILON = 1e-10;

        const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
        const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };

        const h = {
            x: rayDir.y * edge2.z - rayDir.z * edge2.y,
            y: rayDir.z * edge2.x - rayDir.x * edge2.z,
            z: rayDir.x * edge2.y - rayDir.y * edge2.x
        };
        const a = edge1.x * h.x + edge1.y * h.y + edge1.z * h.z;

        if (Math.abs(a) < EPSILON) return null; // Ray parallel to triangle

        const f = 1 / a;
        const s = { x: rayOrigin.x - v0.x, y: rayOrigin.y - v0.y, z: rayOrigin.z - v0.z };
        const u = f * (s.x * h.x + s.y * h.y + s.z * h.z);

        if (u < 0 || u > 1) return null;

        const q = {
            x: s.y * edge1.z - s.z * edge1.y,
            y: s.z * edge1.x - s.x * edge1.z,
            z: s.x * edge1.y - s.y * edge1.x
        };
        const v = f * (rayDir.x * q.x + rayDir.y * q.y + rayDir.z * q.z);

        if (v < 0 || u + v > 1) return null;

        const t = f * (edge2.x * q.x + edge2.y * q.y + edge2.z * q.z);

        if (t > EPSILON) {
            return {
                t,
                point: {
                    x: rayOrigin.x + rayDir.x * t,
                    y: rayOrigin.y + rayDir.y * t,
                    z: rayOrigin.z + rayDir.z * t
                },
                u, v,
                barycentric: { u, v, w: 1 - u - v }
            };
        }
        return null;
    },
    /**
     * Point-in-Polygon (2D)
     * Ray casting algorithm
     */
    pointInPolygon: function(point, polygon) {
        let inside = false;
        const n = polygon.length;

        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            if (((yi > point.y) !== (yj > point.y)) &&
                (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    },
    /**
     * Closest point on line segment
     */
    closestPointOnSegment: function(point, segStart, segEnd) {
        const dx = segEnd.x - segStart.x;
        const dy = segEnd.y - segStart.y;
        const dz = (segEnd.z || 0) - (segStart.z || 0);

        const lengthSq = dx*dx + dy*dy + dz*dz;
        if (lengthSq < 1e-12) return { ...segStart };

        const t = Math.max(0, Math.min(1,
            ((point.x - segStart.x) * dx +
             (point.y - segStart.y) * dy +
             ((point.z || 0) - (segStart.z || 0)) * dz) / lengthSq
        ));

        return {
            x: segStart.x + t * dx,
            y: segStart.y + t * dy,
            z: (segStart.z || 0) + t * dz
        };
    },
    /**
     * Distance from point to line segment
     */
    pointToSegmentDistance: function(point, segStart, segEnd) {
        const closest = this.closestPointOnSegment(point, segStart, segEnd);
        const dx = point.x - closest.x;
        const dy = point.y - closest.y;
        const dz = (point.z || 0) - (closest.z || 0);
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }
}