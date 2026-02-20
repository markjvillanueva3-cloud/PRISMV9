const PRISM_UNIVERSITY_ALGORITHMS = {

    version: '2.0.0',
    date: '2026-01-14',
    algorithmCount: 20,

    // SECTION 1: COMPUTATIONAL GEOMETRY ALGORITHMS
    // Sources: MIT 2.158J, Berkeley CS274, Stanford CS164

    computationalGeometry: {

        /**
         * ALGORITHM 1: Ruppert's Delaunay Refinement
         * Source: MIT 2.158J Computational Geometry, Berkeley CS274
         * Purpose: Generate quality triangular meshes with angle guarantees
         * Complexity: O(n log n) expected
         */
        ruppertRefinement: {
            name: "Ruppert's Delaunay Refinement Algorithm",
            source: "MIT 2.158J / Berkeley CS274",
            description: "Generates quality triangular mesh with minimum angle guarantee",

            refine: function(points, segments, minAngle = 20) {
                // Minimum angle in degrees (typically 20-33 degrees)
                const minAngleRad = minAngle * Math.PI / 180;
                const B = 1 / (2 * Math.sin(minAngleRad)); // Quality bound

                // Initialize with constrained Delaunay triangulation
                let triangulation = this.constrainedDelaunay(points, segments);

                const queue = [];

                // Find all encroached segments and skinny triangles
                this.findEncroachedSegments(triangulation, segments, queue);
                this.findSkinnyTriangles(triangulation, minAngleRad, queue);

                while (queue.length > 0) {
                    const item = queue.shift();

                    if (item.type === 'segment') {
                        // Split encroached segment at midpoint
                        const midpoint = this.splitSegment(item.segment);
                        triangulation = this.insertPoint(triangulation, midpoint);

                        // Check for new encroachments
                        this.findEncroachedSegments(triangulation, segments, queue);
                    } else if (item.type === 'triangle') {
                        // Insert circumcenter of skinny triangle
                        const circumcenter = this.circumcenter(item.triangle);

                        // Check if circumcenter encroaches any segment
                        const encroached = this.checkEncroachment(circumcenter, segments);

                        if (encroached) {
                            // Add encroached segment to queue instead
                            queue.unshift({ type: 'segment', segment: encroached });
                        } else {
                            triangulation = this.insertPoint(triangulation, circumcenter);
                        }
                        this.findSkinnyTriangles(triangulation, minAngleRad, queue);
                    }
                }
                return triangulation;
            },
            constrainedDelaunay: function(points, segments) {
                // Build constrained Delaunay triangulation
                const triangles = [];

                // Start with super-triangle
                const bounds = this.getBounds(points);
                const superTriangle = this.createSuperTriangle(bounds);
                triangles.push(superTriangle);

                // Insert points one by one
                for (const point of points) {
                    this.insertPointDelaunay(triangles, point);
                }
                // Enforce segment constraints
                for (const segment of segments) {
                    this.enforceSegment(triangles, segment);
                }
                // Remove super-triangle vertices
                this.removeSuperTriangle(triangles, superTriangle);

                return { triangles, points: [...points] };
            },
            circumcenter: function(triangle) {
                const [a, b, c] = triangle.vertices;

                const D = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));

                const ux = ((a.x*a.x + a.y*a.y) * (b.y - c.y) +
                           (b.x*b.x + b.y*b.y) * (c.y - a.y) +
                           (c.x*c.x + c.y*c.y) * (a.y - b.y)) / D;

                const uy = ((a.x*a.x + a.y*a.y) * (c.x - b.x) +
                           (b.x*b.x + b.y*b.y) * (a.x - c.x) +
                           (c.x*c.x + c.y*c.y) * (b.x - a.x)) / D;

                return { x: ux, y: uy };
            },
            findSkinnyTriangles: function(triangulation, minAngleRad, queue) {
                for (const tri of triangulation.triangles) {
                    const angles = this.triangleAngles(tri);
                    if (Math.min(...angles) < minAngleRad) {
                        queue.push({ type: 'triangle', triangle: tri });
                    }
                }
            },
            triangleAngles: function(triangle) {
                const [a, b, c] = triangle.vertices;

                const ab = Math.sqrt((b.x-a.x)**2 + (b.y-a.y)**2);
                const bc = Math.sqrt((c.x-b.x)**2 + (c.y-b.y)**2);
                const ca = Math.sqrt((a.x-c.x)**2 + (a.y-c.y)**2);

                const angleA = Math.acos((ab*ab + ca*ca - bc*bc) / (2*ab*ca));
                const angleB = Math.acos((ab*ab + bc*bc - ca*ca) / (2*ab*bc));
                const angleC = Math.PI - angleA - angleB;

                return [angleA, angleB, angleC];
            }
        },
        /**
         * ALGORITHM 2: Sweep Line for Polygon Boolean Operations
         * Source: MIT 6.046J, Berkeley CS274
         * Purpose: Union, intersection, difference of polygons
         * Complexity: O((n + k) log n) where k = intersections
         */
        sweepLineBoolean: {
            name: "Bentley-Ottmann Sweep Line Algorithm",
            source: "MIT 6.046J / Berkeley CS274",
            description: "Polygon boolean operations via sweep line",

            // Event types
            EVENT_LEFT: 0,
            EVENT_RIGHT: 1,
            EVENT_INTERSECTION: 2,

            findIntersections: function(segments) {
                const events = new AVLTree((a, b) => {
                    if (a.point.x !== b.point.x) return a.point.x - b.point.x;
                    return a.point.y - b.point.y;
                });

                const status = new AVLTree((a, b) => {
                    // Compare y-coordinate at current sweep line x
                    const ya = this.yAtX(a, this.currentX);
                    const yb = this.yAtX(b, this.currentX);
                    return ya - yb;
                });

                const intersections = [];

                // Initialize events
                for (const seg of segments) {
                    const left = seg.p1.x < seg.p2.x ? seg.p1 : seg.p2;
                    const right = seg.p1.x < seg.p2.x ? seg.p2 : seg.p1;

                    events.insert({ type: this.EVENT_LEFT, point: left, segment: seg });
                    events.insert({ type: this.EVENT_RIGHT, point: right, segment: seg });
                }
                while (!events.isEmpty()) {
                    const event = events.extractMin();
                    this.currentX = event.point.x;

                    if (event.type === this.EVENT_LEFT) {
                        const seg = event.segment;
                        status.insert(seg);

                        const above = status.successor(seg);
                        const below = status.predecessor(seg);

                        if (above) this.checkIntersection(seg, above, events, intersections);
                        if (below) this.checkIntersection(seg, below, events, intersections);
                    } else if (event.type === this.EVENT_RIGHT) {
                        const seg = event.segment;
                        const above = status.successor(seg);
                        const below = status.predecessor(seg);

                        status.delete(seg);

                        if (above && below) {
                            this.checkIntersection(above, below, events, intersections);
                        }
                    } else { // INTERSECTION
                        intersections.push(event.point);

                        // Swap the two segments in status
                        const [seg1, seg2] = event.segments;
                        status.swap(seg1, seg2);

                        // Check for new intersections
                        const above1 = status.successor(seg1);
                        const below2 = status.predecessor(seg2);

                        if (above1) this.checkIntersection(seg1, above1, events, intersections);
                        if (below2) this.checkIntersection(seg2, below2, events, intersections);
                    }
                }
                return intersections;
            },
            polygonUnion: function(polyA, polyB) {
                const segments = [...this.polygonToSegments(polyA), ...this.polygonToSegments(polyB)];
                const intersections = this.findIntersections(segments);
                return this.buildResultPolygon(segments, intersections, 'union');
            },
            polygonIntersection: function(polyA, polyB) {
                const segments = [...this.polygonToSegments(polyA), ...this.polygonToSegments(polyB)];
                const intersections = this.findIntersections(segments);
                return this.buildResultPolygon(segments, intersections, 'intersection');
            },
            polygonDifference: function(polyA, polyB) {
                const segments = [...this.polygonToSegments(polyA), ...this.polygonToSegments(polyB)];
                const intersections = this.findIntersections(segments);
                return this.buildResultPolygon(segments, intersections, 'difference');
            },
            yAtX: function(segment, x) {
                const dx = segment.p2.x - segment.p1.x;
                if (Math.abs(dx) < 1e-10) return segment.p1.y;
                const t = (x - segment.p1.x) / dx;
                return segment.p1.y + t * (segment.p2.y - segment.p1.y);
            },
            checkIntersection: function(seg1, seg2, events, intersections) {
                const intersection = this.segmentIntersection(seg1, seg2);
                if (intersection && intersection.x > this.currentX) {
                    events.insert({
                        type: this.EVENT_INTERSECTION,
                        point: intersection,
                        segments: [seg1, seg2]
                    });
                }
            },
            segmentIntersection: function(s1, s2) {
                const d1x = s1.p2.x - s1.p1.x;
                const d1y = s1.p2.y - s1.p1.y;
                const d2x = s2.p2.x - s2.p1.x;
                const d2y = s2.p2.y - s2.p1.y;

                const cross = d1x * d2y - d1y * d2x;
                if (Math.abs(cross) < 1e-10) return null;

                const dx = s2.p1.x - s1.p1.x;
                const dy = s2.p1.y - s1.p1.y;

                const t1 = (dx * d2y - dy * d2x) / cross;
                const t2 = (dx * d1y - dy * d1x) / cross;

                if (t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1) {
                    return {
                        x: s1.p1.x + t1 * d1x,
                        y: s1.p1.y + t1 * d1y
                    };
                }
                return null;
            }
        },
        /**
         * ALGORITHM 3: Minkowski Sum for Configuration Space
         * Source: Stanford CS326 Motion Planning
         * Purpose: Compute obstacle regions in C-space for collision-free motion
         * Complexity: O(n*m) for convex polygons
         */
        minkowskiSum: {
            name: "Minkowski Sum Algorithm",
            source: "Stanford CS326 Motion Planning",
            description: "Compute configuration space obstacles",

            computeConvex: function(polyA, polyB) {
                // For convex polygons: merge sorted edge sequences
                const edgesA = this.getEdgeVectors(polyA);
                const edgesB = this.getEdgeVectors(polyB);

                // Sort edges by angle
                edgesA.sort((a, b) => Math.atan2(a.dy, a.dx) - Math.atan2(b.dy, b.dx));
                edgesB.sort((a, b) => Math.atan2(a.dy, a.dx) - Math.atan2(b.dy, b.dx));

                // Merge edge sequences
                const mergedEdges = [];
                let i = 0, j = 0;

                while (i < edgesA.length || j < edgesB.length) {
                    if (i >= edgesA.length) {
                        mergedEdges.push(edgesB[j++]);
                    } else if (j >= edgesB.length) {
                        mergedEdges.push(edgesA[i++]);
                    } else {
                        const angleA = Math.atan2(edgesA[i].dy, edgesA[i].dx);
                        const angleB = Math.atan2(edgesB[j].dy, edgesB[j].dx);
                        if (angleA <= angleB) {
                            mergedEdges.push(edgesA[i++]);
                        } else {
                            mergedEdges.push(edgesB[j++]);
                        }
                    }
                }
                // Build result polygon from merged edges
                const result = [];
                let current = {
                    x: polyA[0].x + polyB[0].x,
                    y: polyA[0].y + polyB[0].y
                };
                result.push({ ...current });

                for (const edge of mergedEdges) {
                    current.x += edge.dx;
                    current.y += edge.dy;
                    result.push({ ...current });
                }
                return result;
            },
            computeGeneral: function(polyA, polyB) {
                // For non-convex polygons: decompose and merge
                const decompositionA = this.convexDecomposition(polyA);
                const decompositionB = this.convexDecomposition(polyB);

                const sums = [];
                for (const partA of decompositionA) {
                    for (const partB of decompositionB) {
                        sums.push(this.computeConvex(partA, partB));
                    }
                }
                // Union all partial sums
                return this.unionPolygons(sums);
            },
            getEdgeVectors: function(polygon) {
                const edges = [];
                for (let i = 0; i < polygon.length; i++) {
                    const j = (i + 1) % polygon.length;
                    edges.push({
                        dx: polygon[j].x - polygon[i].x,
                        dy: polygon[j].y - polygon[i].y
                    });
                }
                return edges;
            }
        }
    },
    // SECTION 2: MOTION PLANNING ALGORITHMS
    // Sources: Stanford CS223A/CS326, CMU 16-782

    motionPlanning: {

        /**
         * ALGORITHM 4: RRT* (Optimal Rapidly-exploring Random Trees)
         * Source: CMU 16-782, Stanfor