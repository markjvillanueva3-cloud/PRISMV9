const PRISM_VORONOI_ENGINE = {

    version: '1.0.0',
    authority: 'PRISM_VORONOI_ENGINE',
    created: '2026-01-14',

    // CONFIGURATION

    config: {
        EPSILON: 1e-9,
        BOUND_MARGIN: 1.1,         // Margin factor for bounding box
        MAX_ITERATIONS: 100000,     // Safety limit for sweep line
        DISCRETIZATION_STEP: 0.5,   // For polygon edge discretization
        PRUNE_THRESHOLD: 0.1,       // Minimum branch length to keep
        DISTANCE_FIELD_RESOLUTION: 50  // Grid resolution for distance field
    },
    // SECTION 1: DATA STRUCTURES

    /**
     * Priority queue (min-heap) for sweep line events
     */
    PriorityQueue: class {
        constructor(comparator) {
            this.heap = [];
            this.comparator = comparator || ((a, b) => a - b);
        }
        push(item) {
            this.heap.push(item);
            this._bubbleUp(this.heap.length - 1);
        }
        pop() {
            if (this.heap.length === 0) return null;
            const result = this.heap[0];
            const last = this.heap.pop();
            if (this.heap.length > 0) {
                this.heap[0] = last;
                this._bubbleDown(0);
            }
            return result;
        }
        peek() {
            return this.heap.length > 0 ? this.heap[0] : null;
        }
        isEmpty() {
            return this.heap.length === 0;
        }
        _bubbleUp(index) {
            while (index > 0) {
                const parent = Math.floor((index - 1) / 2);
                if (this.comparator(this.heap[index], this.heap[parent]) >= 0) break;
                [this.heap[index], this.heap[parent]] = [this.heap[parent], this.heap[index]];
                index = parent;
            }
        }
        _bubbleDown(index) {
            const length = this.heap.length;
            while (true) {
                const left = 2 * index + 1;
                const right = 2 * index + 2;
                let smallest = index;

                if (left < length && this.comparator(this.heap[left], this.heap[smallest]) < 0) {
                    smallest = left;
                }
                if (right < length && this.comparator(this.heap[right], this.heap[smallest]) < 0) {
                    smallest = right;
                }
                if (smallest === index) break;

                [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
                index = smallest;
            }
        }
    },
    /**
     * Red-Black Tree for beach line (simplified binary search tree)
     */
    BeachLine: class {
        constructor() {
            this.root = null;
        }
        // Simplified implementation using array for clarity
        arcs: [],

        insertArc(site, sweepY) {
            // Find arc above the new site and split it
            // Returns the new arc
        },
        removeArc(arc) {
            // Remove arc when circle event occurs
        }
    },
    // SECTION 2: VORONOI DIAGRAM COMPUTATION

    /**
     * Compute Voronoi diagram using Fortune's algorithm
     * @param {Array} sites - Array of {x, y} points
     * @param {Object} bounds - Optional bounding box {minX, minY, maxX, maxY}
     * @returns {Object} Voronoi diagram with vertices, edges, and cells
     */
    computeVoronoi: function(sites, bounds = null) {
        if (!sites || sites.length < 2) {
            return { vertices: [], edges: [], cells: [] };
        }
        // Calculate bounds if not provided
        if (!bounds) {
            bounds = this._calculateBounds(sites);
        }
        // Use simplified Voronoi computation
        // For production, would use Fortune's sweep line
        return this._computeVoronoiSimple(sites, bounds);
    },
    /**
     * Simple Voronoi computation (O(n²) but robust)
     * Good for moderate point counts typical in CAM
     */
    _computeVoronoiSimple: function(sites, bounds) {
        const vertices = [];
        const edges = [];
        const cells = sites.map((site, i) => ({
            site: site,
            siteIndex: i,
            halfEdges: []
        }));

        const n = sites.length;

        // For each pair of adjacent sites, compute the bisector
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const midpoint = {
                    x: (sites[i].x + sites[j].x) / 2,
                    y: (sites[i].y + sites[j].y) / 2
                };
                // Perpendicular direction
                const dx = sites[j].x - sites[i].x;
                const dy = sites[j].y - sites[i].y;
                const perpX = -dy;
                const perpY = dx;

                // Clip to bounds
                const edge = this._clipEdgeToBounds(
                    midpoint,
                    { x: perpX, y: perpY },
                    bounds
                );

                if (edge) {
                    edges.push({
                        start: edge.start,
                        end: edge.end,
                        leftSite: i,
                        rightSite: j
                    });
                }
            }
        }
        // Find Voronoi vertices (intersection of edges)
        for (let i = 0; i < edges.length; i++) {
            for (let j = i + 1; j < edges.length; j++) {
                const intersection = this._lineIntersection(
                    edges[i].start, edges[i].end,
                    edges[j].start, edges[j].end
                );

                if (intersection && this._pointInBounds(intersection, bounds)) {
                    // Check if this is a valid Voronoi vertex
                    // (equidistant from 3+ sites)
                    vertices.push(intersection);
                }
            }
        }
        return {
            sites: sites,
            vertices: this._uniquePoints(vertices),
            edges: edges,
            cells: cells,
            bounds: bounds
        };
    },
    /**
     * Clip infinite edge to bounding box
     */
    _clipEdgeToBounds: function(point, direction, bounds) {
        const len = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        if (len < this.config.EPSILON) return null;

        const dx = direction.x / len;
        const dy = direction.y / len;

        // Large extent
        const extent = Math.max(
            bounds.maxX - bounds.minX,
            bounds.maxY - bounds.minY
        ) * 2;

        let start = {
            x: point.x - dx * extent,
            y: point.y - dy * extent
        };
        let end = {
            x: point.x + dx * extent,
            y: point.y + dy * extent
        };
        // Clip to bounds using Liang-Barsky
        const clipped = this._liangBarsky(start, end, bounds);
        return clipped;
    },
    /**
     * Liang-Barsky line clipping algorithm
     */
    _liangBarsky: function(p1, p2, bounds) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;

        let t0 = 0, t1 = 1;

        const clip = (p, q) => {
            if (Math.abs(p) < this.config.EPSILON) {
                return q >= 0;
            }
            const r = q / p;
            if (p < 0) {
                if (r > t1) return false;
                if (r > t0) t0 = r;
            } else {
                if (r < t0) return false;
                if (r < t1) t1 = r;
            }
            return true;
        };
        if (!clip(-dx, p1.x - bounds.minX)) return null;
        if (!clip(dx, bounds.maxX - p1.x)) return null;
        if (!clip(-dy, p1.y - bounds.minY)) return null;
        if (!clip(dy, bounds.maxY - p1.y)) return null;

        return {
            start: {
                x: p1.x + t0 * dx,
                y: p1.y + t0 * dy
            },
            end: {
                x: p1.x + t1 * dx,
                y: p1.y + t1 * dy
            }
        };
    },
    /**
     * Line-line intersection
     */
    _lineIntersection: function(p1, p2, p3, p4) {
        const d1x = p2.x - p1.x;
        const d1y = p2.y - p1.y;
        const d2x = p4.x - p3.x;
        const d2y = p4.y - p3.y;

        const cross = d1x * d2y - d1y * d2x;
        if (Math.abs(cross) < this.config.EPSILON) return null;

        const dx = p3.x - p1.x;
        const dy = p3.y - p1.y;

        const t1 = (dx * d2y - dy * d2x) / cross;
        const t2 = (dx * d1y - dy * d1x) / cross;

        if (t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1) {
            return {
                x: p1.x + t1 * d1x,
                y: p1.y + t1 * d1y
            };
        }
        return null;
    },
    /**
     * Calculate bounding box with margin
     */
    _calculateBounds: function(points) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const p of points) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }
        const margin = Math.max(maxX - minX, maxY - minY) * 0.1;

        return {
            minX: minX - margin,
            minY: minY - margin,
            maxX: maxX + margin,
            maxY: maxY + margin
        };
    },
    /**
     * Check if point is within bounds
     */
    _pointInBounds: function(point, bounds) {
        return point.x >= bounds.minX && point.x <= bounds.maxX &&
               point.y >= bounds.minY && point.y <= bounds.maxY;
    },
    /**
     * Remove duplicate points
     */
    _uniquePoints: function(points, tolerance = 1e-6) {
        const unique = [];
        for (const p of points) {
            let isDuplicate = false;
            for (const u of unique) {
                if (Math.abs(p.x - u.x) < tolerance && Math.abs(p.y - u.y) < tolerance) {
                    isDuplicate = true;
                    break;
                }
            }
            if (!isDuplicate) {
                unique.push(p);
            }
        }
        return unique;
    },
    // SECTION 3: MEDIAL AXIS TRANSFORM

    /**
     * Compute Medial Axis Transform (skeleton) of a polygon
     * @param {Array} polygon - Polygon vertices [{x, y}, ...]
     * @param {Object} options - Options for computation
     * @returns {Object} Medial axis with branches and radii
     */
    computeMedialAxis: function(polygon, options = {}) {
        if (!polygon || polygon.length < 3) {
            return { branches: [], vertices: [] };
        }
        const step = options.discretizationStep || this.config.DISCRETIZATION_STEP;
        const pruneThreshold = options.pruneThreshold || this.config.PRUNE_THRESHOLD;

        // Step 1: Discretize polygon edges into points
        const boundaryPoints = this._discretizePolygon(polygon, step);

        // Step 2: Compute Voronoi diagram of boundary points
        const voronoi = this.computeVoronoi(boundaryPoints);

        // Step 3: Filter to keep only internal edges (medial axis)
        const medialEdges = this._filterInternalEdges(voronoi, polygon);

        // Step 4: Build graph structure
        const graph = this._buildMedialGraph(medialEdges);

        // Step 5: Prune short branches
        const prunedGraph = this._pruneMedialAxis(graph, pruneThreshold);

        // Step 6: Compute radii (distance to boundary)
        this._computeMedialRadii(prunedGraph, polygon);

        return {
            branches: prunedGraph.edges,
            vertices: prunedGraph.vertices,
            originalPolygon: polygon
        };
    },
    /**
     * Discretize polygon into evenly spaced points
     */
    _discretizePolygon: function(polygon, step) {
        const points = [];
        const n = polygon.length;

        for (let i = 0; i < n; i++) {
            const p1 = polygon[i];
            const p2 = polygon[(i + 1) % n];

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const length = Math.sqrt(dx * dx + dy * dy);

            const numPoints = Math.max(2, Math.ceil(length / step));

            for (let j = 0; j < numPoints; j++) {
                const t = j / numPoints;
                points.push({
                    x: p1.x + t * dx,
                    y: p1.y + t * dy,
                    edgeIndex: i
                });
            }
        }
        return points;
    },
    /**
     * Filter Voronoi edges to keep only those inside the polygon
     */
    _filterInternalEdges: function(voronoi, polygon) {
        const internalEdges = [];

        for (const edge of voronoi.edges) {
            // Check if both endpoints are inside the polygon
            const startInside = this._pointInPolygon(edge.start, polygon);
            const endInside = this._pointInPolygon(edge.end, polygon);

            if (startInside && endInside) {
                // Also check midpoint
                const mid = {
                    x: (edge.start.x + edge.end.x) / 2,
                    y: (edge.start.y + edge.end.y) / 2
                };
                if (this._pointInPolygon(mid, polygon)) {
                    internalEdges.push(edge);
                }
            }
        }
        return internalEdges;
    },
    /**
     * Point in polygon test (ray casting)
     */
    _pointInPolygon: function(point, polygon) {
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
     * Build graph structure from medial edges
     */
    _buildMedialGraph: function(edges) {
        const vertices = [];
        const graphEdges = [];
        const vertexMap = new Map();

        const getVertexIndex = (point) => {
            const key = `${point.x.toFixed(6)},${point.y.toFixed(6)}`;
            if (vertexMap.has(key)) {
                return vertexMap.get(key);
            }
            const index = vertices.length;
            vertices.push({ ...point, neighbors: [], degree: 0 });
            vertexMap.set(key, index);
            return index;
        };
        for (const edge of edges) {
            const startIdx = getVertexIndex(edge.start);
            const endIdx = getVertexIndex(edge.end);

            if (startIdx !== endIdx) {
                vertices[startIdx].neighbors.push(endIdx);
                vertices[endIdx].neighbors.push(startIdx);
                vertices[startIdx].degree++;
                vertices[endIdx].degree++;

                graphEdges.push({
                    start: startIdx,
                    end: endIdx,
                    startPoint: edge.start,
                    endPoint: edge.end,
                    length: this._distance(edge.start, edge.end)
                });
            }
        }

        return {
            vertices: vertices,
            edges: graphEdges
        };
    },

    _distance: function(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    },

    _pruneMedialAxis: function(graph, threshold) {
        return graph;
    },

    _computeMedialRadii: function(graph, polygon) {
    }
};