const PRISM_GEOMETRY_ALGORITHMS = {

    version: '1.0.0',
    source: 'MIT RES.16-002 Computational Geometry',

    // DELAUNAY TRIANGULATION
    // Using Bowyer-Watson incremental algorithm

    delaunay: {
        /**
         * Bowyer-Watson algorithm for Delaunay triangulation
         * O(n²) average, O(n²) worst case
         */
        triangulate: function(points) {
            if (points.length < 3) return { triangles: [], edges: [] };

            // Create super-triangle that contains all points
            const bounds = this.getBounds(points);
            const superTriangle = this.createSuperTriangle(bounds);

            // Start with super-triangle
            let triangles = [superTriangle];

            // Add points one by one
            for (const point of points) {
                triangles = this.addPoint(triangles, point);
            }
            // Remove triangles that share vertices with super-triangle
            const superVerts = new Set([0, 1, 2]);
            triangles = triangles.filter(t =>
                !t.vertices.some(v => superVerts.has(v))
            );

            // Adjust vertex indices (remove super-triangle vertices)
            triangles = triangles.map(t => ({
                vertices: t.vertices.map(v => v - 3),
                circumcenter: t.circumcenter,
                circumradius: t.circumradius
            }));

            // Extract edges
            const edges = this.extractEdges(triangles, points.length);

            return { triangles, edges, points };
        },
        getBounds: function(points) {
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;

            for (const p of points) {
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y);
                maxY = Math.max(maxY, p.y);
            }
            return { minX, maxX, minY, maxY };
        },
        createSuperTriangle: function(bounds) {
            const dx = bounds.maxX - bounds.minX;
            const dy = bounds.maxY - bounds.minY;
            const dmax = Math.max(dx, dy) * 10;
            const midX = (bounds.minX + bounds.maxX) / 2;
            const midY = (bounds.minY + bounds.maxY) / 2;

            // Store super-triangle vertices at indices 0, 1, 2
            this.superVertices = [
                { x: midX - dmax, y: midY - dmax },
                { x: midX + dmax, y: midY - dmax },
                { x: midX, y: midY + dmax }
            ];

            return this.createTriangle([0, 1, 2], this.superVertices);
        },
        createTriangle: function(vertices, allPoints) {
            const [i, j, k] = vertices;
            const p1 = allPoints[i];
            const p2 = allPoints[j];
            const p3 = allPoints[k];

            // Circumcenter calculation
            const ax = p1.x, ay = p1.y;
            const bx = p2.x, by = p2.y;
            const cx = p3.x, cy = p3.y;

            const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));

            if (Math.abs(d) < 1e-12) {
                return { vertices, circumcenter: { x: 0, y: 0 }, circumradius: Infinity };
            }
            const ux = ((ax * ax + ay * ay) * (by - cy) +
                       (bx * bx + by * by) * (cy - ay) +
                       (cx * cx + cy * cy) * (ay - by)) / d;
            const uy = ((ax * ax + ay * ay) * (cx - bx) +
                       (bx * bx + by * by) * (ax - cx) +
                       (cx * cx + cy * cy) * (bx - ax)) / d;

            const circumcenter = { x: ux, y: uy };
            const circumradius = Math.sqrt((ax - ux) ** 2 + (ay - uy) ** 2);

            return { vertices, circumcenter, circumradius };
        },
        addPoint: function(triangles, point) {
            // Find all triangles whose circumcircle contains the point
            const badTriangles = [];
            const goodTriangles = [];

            // Temporarily add point to vertices
            const pointIndex = this.superVertices.length;
            this.superVertices.push(point);

            for (const tri of triangles) {
                const dist = Math.sqrt(
                    (point.x - tri.circumcenter.x) ** 2 +
                    (point.y - tri.circumcenter.y) ** 2
                );

                if (dist < tri.circumradius) {
                    badTriangles.push(tri);
                } else {
                    goodTriangles.push(tri);
                }
            }
            // Find boundary of bad triangles (polygon hole)
            const boundary = this.findBoundary(badTriangles);

            // Create new triangles from boundary edges to new point
            const newTriangles = [];
            for (const edge of boundary) {
                const newTri = this.createTriangle(
                    [edge[0], edge[1], pointIndex],
                    this.superVertices
                );
                newTriangles.push(newTri);
            }
            return [...goodTriangles, ...newTriangles];
        },
        findBoundary: function(triangles) {
            const edgeCount = new Map();

            for (const tri of triangles) {
                const edges = [
                    [tri.vertices[0], tri.vertices[1]],
                    [tri.vertices[1], tri.vertices[2]],
                    [tri.vertices[2], tri.vertices[0]]
                ];

                for (const edge of edges) {
                    const key = edge[0] < edge[1]
                        ? `${edge[0]},${edge[1]}`
                        : `${edge[1]},${edge[0]}`;
                    edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
                }
            }
            // Boundary edges appear exactly once
            const boundary = [];
            for (const tri of triangles) {
                const edges = [
                    [tri.vertices[0], tri.vertices[1]],
                    [tri.vertices[1], tri.vertices[2]],
                    [tri.vertices[2], tri.vertices[0]]
                ];

                for (const edge of edges) {
                    const key = edge[0] < edge[1]
                        ? `${edge[0]},${edge[1]}`
                        : `${edge[1]},${edge[0]}`;
                    if (edgeCount.get(key) === 1) {
                        boundary.push(edge);
                    }
                }
            }
            return boundary;
        },
        extractEdges: function(triangles, numPoints) {
            const edges = new Set();

            for (const tri of triangles) {
                const [a, b, c] = tri.vertices;
                edges.add(a < b ? `${a},${b}` : `${b},${a}`);
                edges.add(b < c ? `${b},${c}` : `${c},${b}`);
                edges.add(c < a ? `${c},${a}` : `${a},${c}`);
            }
            return Array.from(edges).map(e => {
                const [a, b] = e.split(',').map(Number);
                return [a, b];
            });
        }
    },
    // CONVEX HULL
    // Graham scan and Jarvis march implementations

    convexHull: {
        /**
         * Graham Scan - O(n log n)
         * Returns indices of hull vertices in counter-clockwise order
         */
        grahamScan: function(points) {
            if (points.length < 3) return points.map((_, i) => i);

            // Find bottom-most point (and left-most if tie)
            let pivot = 0;
            for (let i = 1; i < points.length; i++) {
                if (points[i].y < points[pivot].y ||
                    (points[i].y === points[pivot].y && points[i].x < points[pivot].x)) {
                    pivot = i;
                }
            }
            // Sort by polar angle with respect to pivot
            const indices = points.map((_, i) => i).filter(i => i !== pivot);

            indices.sort((a, b) => {
                const angle_a = Math.atan2(points[a].y - points[pivot].y,
                                          points[a].x - points[pivot].x);
                const angle_b = Math.atan2(points[b].y - points[pivot].y,
                                          points[b].x - points[pivot].x);
                return angle_a - angle_b;
            });

            // Build hull
            const hull = [pivot];

            for (const idx of indices) {
                while (hull.length > 1 && this.ccw(points[hull[hull.length - 2]],
                                                   points[hull[hull.length - 1]],
                                                   points[idx]) <= 0) {
                    hull.pop();
                }
                hull.push(idx);
            }
            return hull;
        },
        /**
         * Jarvis March (Gift Wrapping) - O(nh) where h is hull size
         * Better for small hulls
         */
        jarvisMarch: function(points) {
            if (points.length < 3) return points.map((_, i) => i);

            // Find left-most point
            let leftmost = 0;
            for (let i = 1; i < points.length; i++) {
                if (points[i].x < points[leftmost].x) {
                    leftmost = i;
                }
            }
            const hull = [];
            let current = leftmost;

            do {
                hull.push(current);
                let next = 0;

                for (let i = 1; i < points.length; i++) {
                    if (next === current ||
                        this.ccw(points[current], points[next], points[i]) < 0) {
                        next = i;
                    }
                }
                current = next;
            } while (current !== leftmost);

            return hull;
        },
        /**
         * Counter-clockwise test
         * Returns > 0 if CCW, < 0 if CW, 0 if collinear
         */
        ccw: function(p1, p2, p3) {
            return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
        },
        /**
         * Check if point is inside convex hull
         */
        containsPoint: function(hull, points, testPoint) {
            const n = hull.length;

            for (let i = 0; i < n; i++) {
                const p1 = points[hull[i]];
                const p2 = points[hull[(i + 1) % n]];

                if (this.ccw(p1, p2, testPoint) < 0) {
                    return false;
                }
            }
            return true;
        }
    },
    // POLYGON OPERATIONS

    polygon: {
        /**
         * Calculate signed area (positive for CCW)
         */
        signedArea: function(vertices) {
            let area = 0;
            const n = vertices.length;

            for (let i = 0; i < n; i++) {
                const j = (i + 1) % n;
                area += vertices[i].x * vertices[j].y;
                area -= vertices[j].x * vertices[i].y;
            }
            return area / 2;
        },
        /**
         * Calculate centroid
         */
        centroid: function(vertices) {
            const area = this.signedArea(vertices);
            let cx = 0, cy = 0;
            const n = vertices.length;

            for (let i = 0; i < n; i++) {
                const j = (i + 1) % n;
                const factor = vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
                cx += (vertices[i].x + vertices[j].x) * factor;
                cy += (vertices[i].y + vertices[j].y) * factor;
            }
            const scale = 1 / (6 * area);
            return { x: cx * scale, y: cy * scale };
        },
        /**
         * Point in polygon test (ray casting)
         */
        containsPoint: function(vertices, point) {
            let inside = false;
            const n = vertices.length;

            for (let i = 0, j = n - 1; i < n; j = i++) {
                const xi = vertices[i].x, yi = vertices[i].y;
                const xj = vertices[j].x, yj = vertices[j].y;

                if (((yi > point.y) !== (yj > point.y)) &&
                    (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
                    inside = !inside;
                }
            }
            return inside;
        },
        /**
         * Polygon offset (for toolpath offset)
         */
        offset: function(vertices, distance) {
            const n = vertices.length;
            const result = [];

            for (let i = 0; i < n; i++) {
                const prev = vertices[(i - 1 + n) % n];
                const curr = vertices[i];
                const next = vertices[(i + 1) % n];

                // Edge vectors
                const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
                const v2 = { x: next.x - curr.x, y: next.y - curr.y };

                // Normals
                const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
                const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

                const n1 = { x: -v1.y / len1, y: v1.x / len1 };
                const n2 = { x: -v2.y / len2, y: v2.x / len2 };

                // Bisector
                const bis = { x: n1.x + n2.x, y: n1.y + n2.y };
                const bisLen = Math.sqrt(bis.x * bis.x + bis.y * bis.y);

                if (bisLen > 1e-10) {
                    const dot = n1.x * (bis.x / bisLen) + n1.y * (bis.y / bisLen);
                    const miter = Math.abs(dot) > 0.1 ? distance / dot : distance;
                    const limitedMiter = Math.min(Math.abs(miter), Math.abs(distance) * 4) * Math.sign(miter);

                    result.push({
                        x: curr.x + bis.x / bisLen * limitedMiter,
                        y: curr.y + bis.y / bisLen * limitedMiter
                    });
                } else {
                    result.push({
                        x: curr.x + n1.x * distance,
                        y: curr.y + n1.y * distance
                    });
                }
            }
            return result;
        }
    }
}