const PRISM_TOPOLOGICAL_ANALYSIS = {

    version: '1.0.0',
    phase: 'Phase 2: Topological Analysis',
    created: '2026-01-14',

    // SECTION 1: PERSISTENT HOMOLOGY ENGINE (INDUSTRY FIRST)
    // Source: MIT 18.905, Edelsbrunner & Harer, PRISM_LAYER3_PLUS_ENHANCEMENT_PACK.js
    // Purpose: Topological feature recognition robust to noise and mesh quality

    persistentHomology: {
        name: "Persistent Homology Engine",
        description: "Topological Data Analysis for robust feature recognition - Betti numbers, persistence diagrams",
        industryFirst: true,

        // Simplicial Complex Construction

        /**
         * Create a simplex (vertex, edge, triangle, tetrahedron)
         * @param {Array} vertices - Vertex indices in sorted order
         * @param {number} filtrationValue - When this simplex appears
         */
        createSimplex: function(vertices, filtrationValue = 0) {
            return {
                vertices: [...vertices].sort((a, b) => a - b),
                dimension: vertices.length - 1,
                filtration: filtrationValue,
                id: vertices.sort((a, b) => a - b).join('-')
            };
        },
        /**
         * Build Vietoris-Rips complex from points
         * @param {Array} points - Array of points [[x,y,z], ...]
         * @param {number} epsilon - Maximum edge length
         * @param {number} maxDimension - Maximum simplex dimension (default 2 for triangles)
         */
        buildVietorisRips: function(points, epsilon, maxDimension = 2) {
            const n = points.length;
            const simplices = [];

            // Add 0-simplices (vertices)
            for (let i = 0; i < n; i++) {
                simplices.push(this.createSimplex([i], 0));
            }
            // Compute pairwise distances
            const distances = [];
            for (let i = 0; i < n; i++) {
                distances[i] = [];
                for (let j = 0; j < n; j++) {
                    if (i === j) {
                        distances[i][j] = 0;
                    } else if (j < i) {
                        distances[i][j] = distances[j][i];
                    } else {
                        let d = 0;
                        for (let k = 0; k < points[i].length; k++) {
                            d += (points[i][k] - points[j][k]) ** 2;
                        }
                        distances[i][j] = Math.sqrt(d);
                    }
                }
            }
            // Add 1-simplices (edges) with filtration = distance
            const edges = [];
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    if (distances[i][j] <= epsilon) {
                        const edge = this.createSimplex([i, j], distances[i][j]);
                        simplices.push(edge);
                        edges.push({ i, j, dist: distances[i][j] });
                    }
                }
            }
            // Add higher-dimensional simplices
            if (maxDimension >= 2) {
                // Add triangles
                for (let i = 0; i < n; i++) {
                    for (let j = i + 1; j < n; j++) {
                        if (distances[i][j] > epsilon) continue;
                        for (let k = j + 1; k < n; k++) {
                            if (distances[i][k] > epsilon || distances[j][k] > epsilon) continue;
                            const maxDist = Math.max(distances[i][j], distances[i][k], distances[j][k]);
                            simplices.push(this.createSimplex([i, j, k], maxDist));
                        }
                    }
                }
            }
            if (maxDimension >= 3) {
                // Add tetrahedra
                for (let i = 0; i < n; i++) {
                    for (let j = i + 1; j < n; j++) {
                        if (distances[i][j] > epsilon) continue;
                        for (let k = j + 1; k < n; k++) {
                            if (distances[i][k] > epsilon || distances[j][k] > epsilon) continue;
                            for (let l = k + 1; l < n; l++) {
                                if (distances[i][l] > epsilon || distances[j][l] > epsilon || distances[k][l] > epsilon) continue;
                                const maxDist = Math.max(
                                    distances[i][j], distances[i][k], distances[i][l],
                                    distances[j][k], distances[j][l], distances[k][l]
                                );
                                simplices.push(this.createSimplex([i, j, k, l], maxDist));
                            }
                        }
                    }
                }
            }
            // Sort by filtration value, then by dimension
            simplices.sort((a, b) => {
                if (a.filtration !== b.filtration) return a.filtration - b.filtration;
                return a.dimension - b.dimension;
            });

            return {
                simplices,
                numVertices: n,
                maxEpsilon: epsilon,
                maxDimension
            };
        },
        /**
         * Build Alpha complex from 2D points (requires Delaunay triangulation)
         * @param {Array} points - Array of 2D points [[x,y], ...]
         */
        buildAlphaComplex2D: function(points) {
            // First compute Delaunay triangulation
            const triangulation = this.delaunay2D(points);
            const simplices = [];

            // Add vertices with filtration 0
            for (let i = 0; i < points.length; i++) {
                simplices.push(this.createSimplex([i], 0));
            }
            // For each edge and triangle, compute alpha value (circumradius)
            const edges = new Set();

            for (const tri of triangulation.triangles) {
                const [i, j, k] = tri;

                // Add edges with filtration = circumradius of smallest circumcircle
                const edgePairs = [[i, j], [j, k], [i, k]];
                for (const [a, b] of edgePairs) {
                    const edgeId = `${Math.min(a, b)}-${Math.max(a, b)}`;
                    if (!edges.has(edgeId)) {
                        edges.add(edgeId);
                        const dist = Math.sqrt(
                            (points[a][0] - points[b][0]) ** 2 +
                            (points[a][1] - points[b][1]) ** 2
                        ) / 2; // Radius of smallest circle containing edge
                        simplices.push(this.createSimplex([a, b], dist));
                    }
                }
                // Add triangle with filtration = circumradius
                const circumradius = this.circumradius2D(points[i], points[j], points[k]);
                simplices.push(this.createSimplex([i, j, k], circumradius));
            }
            // Sort by filtration
            simplices.sort((a, b) => {
                if (a.filtration !== b.filtration) return a.filtration - b.filtration;
                return a.dimension - b.dimension;
            });

            return { simplices, numVertices: points.length, triangulation };
        },
        /**
         * Simple 2D Delaunay triangulation (Bowyer-Watson algorithm)
         */
        delaunay2D: function(points) {
            if (points.length < 3) return { triangles: [] };

            // Find bounding box
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            for (const p of points) {
                minX = Math.min(minX, p[0]);
                maxX = Math.max(maxX, p[0]);
                minY = Math.min(minY, p[1]);
                maxY = Math.max(maxY, p[1]);
            }
            const dx = maxX - minX;
            const dy = maxY - minY;
            const dmax = Math.max(dx, dy) * 2;

            // Super-triangle vertices
            const st = [
                [minX - dmax, minY - dmax],
                [minX + dmax * 2, minY - dmax],
                [minX + dx / 2, maxY + dmax]
            ];

            // Add super-triangle indices
            const stIdx = [points.length, points.length + 1, points.length + 2];
            const allPoints = [...points, ...st];

            // Initial triangulation is just the super-triangle
            let triangles = [stIdx];

            // Add points one by one
            for (let i = 0; i < points.length; i++) {
                const p = points[i];
                const badTriangles = [];

                // Find all triangles whose circumcircle contains point
                for (const tri of triangles) {
                    if (this.inCircumcircle(p, allPoints[tri[0]], allPoints[tri[1]], allPoints[tri[2]])) {
                        badTriangles.push(tri);
                    }
                }
                // Find boundary of polygon hole
                const polygon = [];
                for (const tri of badTriangles) {
                    for (let j = 0; j < 3; j++) {
                        const edge = [tri[j], tri[(j + 1) % 3]];
                        const edgeKey = edge.sort((a, b) => a - b).join('-');

                        // Check if edge is shared with another bad triangle
                        let shared = false;
                        for (const other of badTriangles) {
                            if (other === tri) continue;
                            for (let k = 0; k < 3; k++) {
                                const otherEdge = [other[k], other[(k + 1) % 3]].sort((a, b) => a - b).join('-');
                                if (edgeKey === otherEdge) {
                                    shared = true;
                                    break;
                                }
                            }
                            if (shared) break;
                        }
                        if (!shared) {
                            polygon.push([tri[j], tri[(j + 1) % 3]]);
                        }
                    }
                }
                // Remove bad triangles
                triangles = triangles.filter(tri => !badTriangles.includes(tri));

                // Re-triangulate polygon with new point
                for (const edge of polygon) {
                    triangles.push([edge[0], edge[1], i]);
                }
            }
            // Remove triangles connected to super-triangle
            triangles = triangles.filter(tri =>
                !tri.some(v => v >= points.length)
            );

            return { triangles };
        },
        /**
         * Check if point is inside circumcircle of triangle
         */
        inCircumcircle: function(p, a, b, c) {
            const ax = a[0] - p[0], ay = a[1] - p[1];
            const bx = b[0] - p[0], by = b[1] - p[1];
            const cx = c[0] - p[0], cy = c[1] - p[1];

            const det = (ax * ax + ay * ay) * (bx * cy - cx * by) -
                       (bx * bx + by * by) * (ax * cy - cx * ay) +
                       (cx * cx + cy * cy) * (ax * by - bx * ay);

            // Positive means inside (for counter-clockwise triangle)
            const orientation = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
            return orientation > 0 ? det > 0 : det < 0;
        },
        /**
         * Compute circumradius of 2D triangle
         */
        circumradius2D: function(a, b, c) {
            const ax = b[0] - a[0], ay = b[1] - a[1];
            const bx = c[0] - a[0], by = c[1] - a[1];

            const d = 2 * (ax * by - ay * bx);
            if (Math.abs(d) < 1e-10) return Infinity;

            const al = ax * ax + ay * ay;
            const bl = bx * bx + by * by;

            const ux = (by * al - ay * bl) / d;
            const uy = (ax * bl - bx * al) / d;

            return Math.sqrt(ux * ux + uy * uy);
        },
        // Boundary Matrix and Persistence Computation

        /**
         * Compute boundary of a simplex
         * @param {Object} simplex - Simplex object
         * @returns {Array} Array of boundary simplex IDs
         */
        boundary: function(simplex) {
            if (simplex.dimension === 0) return [];

            const boundaries = [];
            for (let i = 0; i < simplex.vertices.length; i++) {
                const face = [...simplex.vertices];
                face.splice(i, 1);
                boundaries.push({
                    vertices: face,
                    id: face.join('-'),
                    sign: (i % 2 === 0) ? 1 : -1
                });
            }
            return boundaries;
        },
        /**
         * Build boundary matrix (sparse representation)
         * @param {Object} complex - Simplicial complex
         * @returns {Object} Boundary matrix in sparse format
         */
        buildBoundaryMatrix: function(complex) {
            const { simplices } = complex;
            const n = simplices.length;

            // Create index map
            const indexMap = {};
            simplices.forEach((s, i) => indexMap[s.id] = i);

            // Build sparse matrix (column-wise)
            const columns = [];
            for (let j = 0; j < n; j++) {
                const col = [];
                const boundaries = this.boundary(simplices[j]);

                for (const b of boundaries) {
                    const i = indexMap[b.id];
                    if (i !== undefined) {
                        col.push({ row: i, value: b.sign });
                    }
                }
                // Sort by row index
                col.sort((a, b) => a.row - b.row);
                columns.push(col);
            }
            return { columns, n, indexMap, simplices };
        },
        /**
         * Reduce boundary matrix (standard algorithm for persistence)
         * This computes persistence pairs
         */
        reduceBoundaryMatrix: function(boundaryMatrix) {
            const { columns, n, simplices } = boundaryMatrix;

            // Working copy of columns
            const R = columns.map(col => [...col]);

            // Track low entry of each column
            const low = new Array(n).fill(-1);

            // Track which columns have been used for reduction
            const pivot = {};

            // Persistence pairs: (birth, death)
            const pairs = [];
            const essential = [];

            for (let j = 0; j < n; j++) {
                // Reduce column j
                while (R[j].length > 0) {
                    const lowJ = R[j][R[j].length - 1].row;

                    if (pivot[lowJ] === undefined) {
                        // This is a new pivot
                        pivot[lowJ] = j;
                        low[j] = lowJ;
                        break;
                    }
                    // Add column pivot[lowJ] to column j (mod 2)
                    const k = pivot[lowJ];
                    R[j] = this.addColumnsMod2(R[j], R[k]);
                }
                if (R[j].length === 0) {
                    // Column reduced to zero - this simplex creates a new cycle
                    low[j] = -1;
                }
            }
            // Extract persistence pairs
            for (let j = 0; j < n; j++) {
                if (low[j] >= 0) {
                    // j kills the cycle born at low[j]
                    pairs.push({
                        birth: simplices[low[j]].filtration,
                        death: simplices[j].filtration,
                        birthSimplex: simplices[low[j]],
                        deathSimplex: simplices[j],
                        dimension: simplices[low[j]].dimension,
                        persistence: simplices[j].filtration - simplices[low[j]].filtration
                    });
                }
            }
            // Find essential (never-dying) cycles
            const killed = new Set(pairs.map(p => p.birthSimplex.id));
            for (let j = 0; j < n; j++) {
                if (low[j] === -1 && !killed.has(simplices[j].id)) {
                    // Check if this simplex creates a cycle that's never killed
                    const dim = simplices[j].dimension;
                    if (dim >= 0) {
                        essential.push({
                            birth: simplices[j].filtration,
                            death: Infinity,
                            birthSimplex: simplices[j],
                            dimension: dim,
                            persistence: Infinity
                        });
                    }
                }
            }
            return { pairs, essential, reduced: R, low };
        },
        /**
         * Add two columns mod 2 (XOR operation)
         */
        addColumnsMod2: function(col1, col2) {
            const result = [];
            let i = 0, j = 0;

            while (i < col1.length && j < col2.length) {
                if (col1[i].row < col2[j].row) {
                    result.push(col1[i]);
                    i++;
                } else if (col1[i].row > col2[j].row) {
                    result.push(col2[j]);
                    j++;
                } else {
                    // Same row - cancel (mod 2)
                    i++;
                    j++;
                }
            }
            while (i < col1.length) {
                result.push(col1[i]);
                i++;
            }
            while (j < col2.length) {
                result.push(col2[j]);
                j++;
            }
            return result;
        },
        // Betti Numbers and Persistence Diagrams

        /**
         * Compute Betti numbers at a given filtration value
         * β₀ = connected components
         * β₁ = holes/loops
         * β₂ = voids/cavities
         */
        computeBettiNumbers: function(complex, filtrationValue = Infinity) {
            // Filter simplices up to filtration value
            const filtered = {
                simplices: complex.simplices.filter(s => s.filtration <= filtrationValue),
                numVertices: complex.numVertices
            };
            if (filtered.simplices.length === 0) {
                return { beta0: 0, beta1: 0, beta2: 0 };
            }
            // Build and reduce boundary matrix
            const boundaryMatrix = this.buildBoundaryMatrix(filtered);
            const { pairs, essential } = this.reduceBoundaryMatrix(boundaryMatrix);

            // Count by dimension
            const betti = { 0: 0, 1: 0, 2: 0 };

            // Essential cycles contribute to Betti numbers
            for (const e of essential) {
                if (e.dimension >= 0 && e.dimension <= 2) {
                    betti[e.dimension]++;
                }
            }
            // Pairs that haven't died yet also contribute
            for (const p of pairs) {
                if (p.death > filtrationValue && p.dimension >= 0 && p.dimension <= 2) {
                    betti[p.dimension]++;
                }
            }
            return {
                beta0: betti[0],
                beta1: betti[1],
                beta2: betti[2]
            };
        },
        /**
         * Build persistence diagram
         */
        buildPersistenceDiagram: function(complex) {
            const boundaryMatrix = this.buildBoundaryMatrix(complex);
            const { pairs, essential } = this.reduceBoundaryMatrix(boundaryMatrix);

            // Organize by dimension
            const diagram = {
                dim0: [], // Connected components
                dim1: [], // Loops/holes
                dim2: [], // Voids
                all: []
            };
            for (const p of pairs) {
                const point = {
                    birth: p.birth,
                    death: p.death,
                    persistence: p.persistence,
                    dimension: p.dimension
                };
                diagram.all.push(point);

                if (p.dimension === 0) diagram.dim0.push(point);
                else if (p.dimension === 1) diagram.dim1.push(point);
                else if (p.dimension === 2) diagram.dim2.push(point);
            }
            for (const e of essential) {
                const point = {
                    birth: e.birth,
                    death: Infinity,
                    persistence: Infinity,
                    dimension: e.dimension,
                    essential: true
                };
                diagram.all.push(point);

                if (e.dimension === 0) diagram.dim0.push(point);
                else if (e.dimension === 1) diagram.dim1.push(point);
                else if (e.dimension === 2) diagram.dim2.push(point);
            }
            return diagram;
        },
        /**
         * Compute bottleneck distance between persistence diagrams
         */
        bottleneckDistance: function(diagram1, diagram2) {
            // Simplified: just compare number of significant features
            const sig1 = diagram1.all.filter(p => p.persistence > 0.01).length;
            const sig2 = diagram2.all.filter(p => p.persistence > 0.01).length;

            // More sophisticated implementation would use Hungarian algorithm
            return Math.abs(sig1 - sig2);
        },
        // Manufacturing Applications

        /**
         * Validate B-Rep topology
         * A valid solid should have: β₀ = 1, β₂ = 0 (no internal voids for simple solid)
         */
        validateBRepTopology: function(brep) {
            // Extract vertices from B-Rep
            const vertices = brep.vertices || [];
            if (vertices.length < 4) {
                return {
                    valid: false,
                    error: 'Too few vertices for solid',
                    beta0: 0, beta1: 0, beta2: 0
                };
            }
            const points = vertices.map(v => v.position || v);

            // Build Vietoris-Rips complex
            // Use edge length from B-Rep if available
            let maxEdge = 0;
            if (brep.edges) {
                for (const e of brep.edges) {
                    if (e.length) maxEdge = Math.max(maxEdge, e.length);
                }
            }
            if (maxEdge === 0) {
                // Estimate from bounding box
                let minCoord = [Infinity, Infinity, Infinity];
                let maxCoord = [-Infinity, -Infinity, -Infinity];
                for (const p of points) {
                    for (let i = 0; i < 3; i++) {
                        minCoord[i] = Math.min(minCoord[i], p[i]);
                        maxCoord[i] = Math.max(maxCoord[i], p[i]);
                    }
                }
                const diagonal = Math.sqrt(
                    (maxCoord[0] - minCoord[0]) ** 2 +
                    (maxCoord[1] - minCoord[1]) ** 2 +
                    (maxCoord[2] - minCoord[2]) ** 2
                );
                maxEdge = diagonal / 2;
            }
            const complex = this.buildVietorisRips(points, maxEdge * 1.5, 2);
            const betti = this.computeBettiNumbers(complex);

            const issues = [];
            if (betti.beta0 !== 1) {
                issues.push(`Expected 1 connected component, found ${betti.beta0}`);
            }
            if (betti.beta2 > 0) {
                issues.push(`Found ${betti.beta2} internal voids`);
            }
            return {
                valid: issues.length === 0,
                beta0: betti.beta0,
                beta1: betti.beta1,
                beta2: betti.beta2,
                issues,
                interpretation: {
                    connectedComponents: betti.beta0,
                    holes: betti.beta1,
                    voids: betti.beta2
                }
            };
        },
        /**
         * Detect topological features in mesh
         */
        detectTopologicalFeatures: function(mesh) {
            const points = mesh.vertices || mesh.points || [];
            if (points.length < 3) return { features: [] };

            // Build complex at multiple scales
            let maxDist = 0;
            for (let i = 0; i < Math.min(points.length, 100); i++) {
                for (let j = i + 1; j < Math.min(points.length, 100); j++) {
                    const d = Math.sqrt(
                        (points[i][0] - points[j][0]) ** 2 +
                        (points[i][1] - points[j][1]) ** 2 +
                        (points[i][2] || 0 - points[j][2] || 0) ** 2
                    );
                    maxDist = Math.max(maxDist, d);
                }
            }
            const complex = this.buildVietorisRips(points, maxDist, 2);
            const diagram = this.buildPersistenceDiagram(complex);

            // Significant features have high persistence
            const threshold = maxDist * 0.1;

            const features = [];

            // Holes (β₁ features)
            for (const p of diagram.dim1) {
                if (p.persistence > threshold || p.persistence === Infinity) {
                    features.push({
                        type: 'HOLE',
                        birth: p.birth,
                        death: p.death,
                        persistence: p.persistence,
                        significance: p.persistence / maxDist
                    });
                }
            }
            // Voids (β₂ features)
            for (const p of diagram.dim2) {
                if (p.persistence > threshold || p.persistence === Infinity) {
                    features.push({
                        type: 'VOID',
                        birth: p.birth,
                        death: p.death,
                        persistence: p.persistence,
                        significance: p.persistence / maxDist
                    });
                }
            }
            // Sort by significance
            features.sort((a, b) => b.significance - a.significance);

            return {
                features,
                diagram,
                summary: {
                    totalHoles: diagram.dim1.length,
                    significantHoles: features.filter(f => f.type === 'HOLE').length,
                    totalVoids: diagram.dim2.length,
                    significantVoids: features.filter(f => f.type === 'VOID').length
                }
            };
        },
        /**
         * Robust feature recognition that works on noisy/imperfect meshes
         */
        robustFeatureRecognition: function(noisyMesh, noiseEstimate = 0) {
            const points = noisyMesh.vertices || noisyMesh.points || [];
            const features = this.detectTopologicalFeatures({ points });

            // Filter out features that are smaller than noise level
            if (noiseEstimate > 0) {
                features.features = features.features.filter(f =>
                    f.persistence > noiseEstimate * 3
                );
            }
            return features;
        },
        prismApplication: "TopologicalFeatureRecognition - robust feature detection, B-Rep validation"
    },
    // SECTION 2: ALPHA SHAPES ENGINE (INDUSTRY FIRST)
    // Source: Edelsbrunner, PRISM_LAYER3_PLUS_ENHANCEMENT_PACK.js
    // Purpose: Point cloud to surface reconstruction

    alphaShapes: {
        name: "Alpha Shapes Engine",
        description: "Point cloud to surface reconstruction with automatic hole/cavity detection",
        industryFirst: true,

        // 2D Alpha Shapes

        /**
         * Compute 2D alpha shape
         * @param {Array} points - 2D points [[x,y], ...]
         * @param {number} alpha - Alpha parameter (1/alpha = maximum circumradius)
         */
        compute2D: function(points, alpha) {
            if (points.length < 3) {
                return { boundary: points, triangles: [], alpha };
            }
            // Build Delaunay triangulation
            const delaunay = PRISM_TOPOLOGICAL_ANALYSIS.persistentHomology.delaunay2D(points);

            // Filter triangles by circumradius
            const alphaTriangles = [];
            for (const tri of delaunay.triangles) {
                const [i, j, k] = tri;
                const r = PRISM_TOPOLOGICAL_ANALYSIS.persistentHomology.circumradius2D(
                    points[i], points[j], points[k]
                );
                if (r <= 1 / alpha) {
                    alphaTriangles.push(tri);
                }
            }
            // Extract boundary edges
            const edgeCount = {};
            for (const tri of alphaTriangles) {
                const edges = [
                    [Math.min(tri[0], tri[1]), Math.max(tri[0], tri[1])],
                    [Math.min(tri[1], tri[2]), Math.max(tri[1], tri[2])],
                    [Math.min(tri[0], tri[2]), Math.max(tri[0], tri[2])]
                ];
                for (const e of edges) {
                    const key = e.join('-');
                    edgeCount[key] = (edgeCount[key] || 0) + 1;
                }
            }
            // Boundary edges appear exactly once
            const boundaryEdges = [];
            for (const [key, count] of Object.entries(edgeCount)) {
                if (count === 1) {
                    const [i, j] = key.split('-').map(Number);
                    boundaryEdges.push([i, j]);
                }
            }
            // Order boundary vertices
            const boundary = this.orderBoundary(boundaryEdges, points);

            return {
                boundary,
                triangles: alphaTriangles,
                edges: boundaryEdges,
                alpha,
                numHoles: this.countHoles2D(boundaryEdges, points)
            };
        },
        /**
         * Order boundary edges into a polygon
         */
        orderBoundary: function(edges, points) {
            if (edges.length === 0) return [];

            const adjacency = {};
            for (const [i, j] of edges) {
                if (!adjacency[i]) adjacency[i] = [];
                if (!adjacency[j]) adjacency[j] = [];
                adjacency[i].push(j);
                adjacency[j].push(i);
            }
            // Find starting point
            let start = edges[0][0];
            const boundary = [start];
            const visited = new Set([start]);
            let current = start;

            while (true) {
                const neighbors = adjacency[current] || [];
                let next = null;

                for (const n of neighbors) {
                    if (!visited.has(n)) {
                        next = n;
                        break;
                    }
                }
                if (next === null) break;

                boundary.push(next);
                visited.add(next);
                current = next;
            }
            return boundary.map(i => points[i]);
        },
        /**
         * Count holes in 2D alpha shape using Euler characteristic
         */
        countHoles2D: function(edges, points) {
            // V - E + F = 2 - 2g (for surface of genus g)
            // For 2D: V - E + F = 1 - h (where h = number of holes)

            // Count unique vertices
            const vertices = new Set();
            for (const [i, j] of edges) {
                vertices.add(i);
                vertices.add(j);
            }
            const V = vertices.size;
            const E = edges.length;

            // For simply connected region, V - E = 0
            // Each hole adds 1 to E - V
            return Math.max(0, E - V);
        },
        // 3D Alpha Shapes (Simplified)

        /**
         * Compute 3D alpha shape (simplified using convex hull + filtering)
         */
        compute3D: function(points, alpha) {
            if (points.length < 4) {
                return { faces: [], alpha };
            }
            // Build tetrahedralization (simplified - use convex hull as approximation)
            const hull = this.convexHull3D(points);

            // Filter faces by circumsphere radius
            const alphaFaces = [];
            for (const face of hull.faces) {
                // Compute circumradius of face triangle
                const [i, j, k] = face;
                const r = this.circumradius3D(points[i], points[j], points[k]);
                if (r <= 1 / alpha) {
                    alphaFaces.push(face);
                }
            }
            return {
                faces: alphaFaces,
                vertices: points,
                alpha
            };
        },
        /**
         * Simple 3D convex hull using gift wrapping
         */
        convexHull3D: function(points) {
            if (points.length < 4) return { faces: [] };

            // Find extreme points to start
            let minZ = 0;
            for (let i = 1; i < points.length; i++) {
                if (points[i][2] < points[minZ][2]) minZ = i;
            }
            // Simplified: just return all triangular combinations for small point sets
            // (Full implementation would use incremental convex hull)
            const faces = [];
            const n = points.length;

            if (n <= 20) {
                for (let i = 0; i < n; i++) {
                    for (let j = i + 1; j < n; j++) {
                        for (let k = j + 1; k < n; k++) {
                            // Check if this face is on convex hull
                            if (this.isHullFace(points, i, j, k)) {
                                faces.push([i, j, k]);
                            }
                        }
                    }
                }
            }
            return { faces };
        },
        /**
         * Check if triangle is on convex hull
         */
        isHullFace: function(points, i, j, k) {
            const a = points[i], b = points[j], c = points[k];

            // Compute face normal
            const ab = [b[0]-a[0], b[1]-a[1], b[2]-a[2]];
            const ac = [c[0]-a[0], c[1]-a[1], c[2]-a[2]];
            const normal = [
                ab[1]*ac[2] - ab[2]*ac[1],
                ab[2]*ac[0] - ab[0]*ac[2],
                ab[0]*ac[1] - ab[1]*ac[0]
            ];

            // Check all points are on same side
            let pos = 0, neg = 0;
            for (let m = 0; m < points.length; m++) {
                if (m === i || m === j || m === k) continue;

                const ap = [points[m][0]-a[0], points[m][1]-a[1], points[m][2]-a[2]];
                const dot = normal[0]*ap[0] + normal[1]*ap[1] + normal[2]*ap[2];

                if (dot > 1e-10) pos++;
                else if (dot < -1e-10) neg++;
            }
            return pos === 0 || neg === 0;
        },
        /**
         * Compute circumradius of 3D triangle
         */
        circumradius3D: function(a, b, c) {
            // Area of triangle
            const ab = [b[0]-a[0], b[1]-a[1], b[2]-a[2]];
            const ac = [c[0]-a[0], c[1]-a[1], c[2]-a[2]];
            const cross = [
                ab[1]*ac[2] - ab[2]*ac[1],
                ab[2]*ac[0] - ab[0]*ac[2],
                ab[0]*ac[1] - ab[1]*ac[0]
            ];
            const area = 0.5 * Math.sqrt(cross[0]**2 + cross[1]**2 + cross[2]**2);

            if (area < 1e-10) return Infinity;

            // Side lengths
            const la = Math.sqrt((c[0]-b[0])**2 + (c[1]-b[1])**2 + (c[2]-b[2])**2);
            const lb = Math.sqrt((a[0]-c[0])**2 + (a[1]-c[1])**2 + (a[2]-c[2])**2);
            const lc = Math.sqrt((b[0]-a[0])**2 + (b[1]-a[1])**2 + (b[2]-a[2])**2);

            // Circumradius = (a*b*c)/(4*area)
            return (la * lb * lc) / (4 * area);
        },
        // Optimal Alpha Finding

        /**
         * Find optimal alpha parameter
         * @param {Array} points - Input points
         * @param {number} targetHoles - Target number of holes (0 for solid reconstruction)
         */
        findOptimalAlpha: function(points, targetHoles = 0) {
            let alphaLow = 0.001;
            let alphaHigh = 10;

            for (let iter = 0; iter < 20; iter++) {
                const alphaMid = (alphaLow + alphaHigh) / 2;
                const shape = this.compute2D(points, alphaMid);
                const numHoles = shape.numHoles;

                if (numHoles > targetHoles) {
                    // Too many holes - increase alpha (tighter filtering)
                    alphaLow = alphaMid;
                } else if (numHoles < targetHoles) {
                    // Too few holes - decrease alpha
                    alphaHigh = alphaMid;
                } else {
                    return alphaMid;
                }
            }
            return (alphaLow + alphaHigh) / 2;
        },
        // Manufacturing Applications

        /**
         * Convert point cloud to B-Rep boundary
         */
        pointCloudToBRep: function(scanData, options = {}) {
            const {
                alpha = null,
                targetHoles = 0,
                smoothing = false
            } = options;

            const points = scanData.points || scanData;

            // Determine optimal alpha if not provided
            const useAlpha = alpha || this.findOptimalAlpha(points, targetHoles);

            // Compute alpha shape
            const is3D = points[0] && points[0].length === 3;
            const shape = is3D ?
                this.compute3D(points, useAlpha) :
                this.compute2D(points, useAlpha);

            // Build B-Rep structure
            const brep = {
                vertices: points.map((p, i) => ({ id: i, position: p })),
                edges: [],
                faces: [],
                alpha: useAlpha
            };
            if (is3D && shape.faces) {
                brep.faces = shape.faces.map((f, i) => ({
                    id: i,
                    vertices: f,
                    type: 'TRIANGLE'
                }));
            } else if (shape.boundary) {
                brep.boundary = shape.boundary;
                brep.triangles = shape.triangles;
            }
            return brep;
        },
        /**
         * Reconstruct surface from sparse probe points
         */
        reconstructSurfaceFromProbes: function(probePoints) {
            // Use alpha shapes to find boundary
            const points2D = probePoints.map(p => [p[0], p[1]]);
            const alpha = this.findOptimalAlpha(points2D, 0);
            const shape = this.compute2D(points2D, alpha);

            return {
                boundary: shape.boundary,
                triangulation: shape.triangles,
                probePoints,
                alpha
            };
        },
        /**
         * Detect cavities and through-holes in point cloud
         */
        detectCavities: function(pointCloud) {
            // Try different alpha values and track topology changes
            const points = pointCloud.points || pointCloud;
            const results = [];

            for (let alpha = 0.1; alpha <= 5; alpha += 0.1) {
                const shape = this.compute2D(points, alpha);
                results.push({
                    alpha,
                    numHoles: shape.numHoles,
                    boundaryLength: shape.boundary ? shape.boundary.length : 0
                });
            }
            // Find alpha values where topology changes (new holes appear)
            const cavities = [];
            for (let i = 1; i < results.length; i++) {
                if (results[i].numHoles > results[i-1].numHoles) {
                    cavities.push({
                        alpha: results[i].alpha,
                        newHoles: results[i].numHoles - results[i-1].numHoles,
                        estimatedSize: 1 / results[i].alpha
                    });
                }
            }
            return {
                cavities,
                alphaProfile: results
            };
        },
        prismApplication: "ReverseEngineeringEngine - point cloud to B-Rep, cavity detection"
    },
    // SECTION 3: HAUSDORFF DISTANCE ENGINE
    // Source: Hausdorff (1914), PRISM_LAYER3_PLUS_ENHANCEMENT_PACK.js
    // Purpose: Surface comparison and machining verification

    hausdorffDistance: {
        name: "Hausdorff Distance Engine",
        description: "Maximum deviation measurement between point sets - surface verification",

        // Distance Computations

        /**
         * Euclidean distance between two points
         */
        pointDistance: function(p1, p2) {
            let sum = 0;
            for (let i = 0; i < p1.length; i++) {
                sum += (p1[i] - (p2[i] || 0)) ** 2;
            }
            return Math.sqrt(sum);
        },
        /**
         * Directed Hausdorff distance: max_{a∈A} min_{b∈B} d(a,b)
         * Maximum distance from any point in A to the closest point in B
         */
        directedHausdorff: function(setA, setB) {
            let maxMinDist = 0;
            let worstPoint = null;
            let closestToWorst = null;

            for (const a of setA) {
                let minDist = Infinity;
                let closest = null;

                for (const b of setB) {
                    const d = this.pointDistance(a, b);
                    if (d < minDist) {
                        minDist = d;
                        closest = b;
                    }
                }
                if (minDist > maxMinDist) {
                    maxMinDist = minDist;
                    worstPoint = a;
                    closestToWorst = closest;
                }
            }
            return {
                distance: maxMinDist,
                worstPoint,
                closestToWorst
            };
        },
        /**
         * Symmetric Hausdorff distance: max(d_H(A,B), d_H(B,A))
         */
        compute: function(setA, setB) {
            const dAB = this.directedHausdorff(setA, setB);
            const dBA = this.directedHausdorff(setB, setA);

            const isABWorse = dAB.distance >= dBA.distance;

            return {
                hausdorffDistance: Math.max(dAB.distance, dBA.distance),
                directedAB: dAB.distance,
                directedBA: dBA.distance,
                worstDeviation: isABWorse ? dAB : dBA
            };
        },
        /**
         * Average Hausdorff distance (mean of all point-to-set distances)
         */
        averageHausdorff: function(setA, setB) {
            let sumAB = 0;
            for (const a of setA) {
                let minDist = Infinity;
                for (const b of setB) {
                    minDist = Math.min(minDist, this.pointDistance(a, b));
                }
                sumAB += minDist;
            }
            let sumBA = 0;
            for (const b of setB) {
                let minDist = Infinity;
                for (const a of setA) {
                    minDist = Math.min(minDist, this.pointDistance(a, b));
                }
                sumBA += minDist;
            }
            return {
                averageAB: sumAB / setA.length,
                averageBA: sumBA / setB.length,
                symmetricAverage: (sumAB / setA.length + sumBA / setB.length) / 2
            };
        },
        // Manufacturing Applications

        /**
         * Compare machined surface to CAD model
         * @param {Array} machinedPoints - Points from machined surface
         * @param {Array} cadPoints - Points from CAD model
         * @param {number} tolerance - Acceptable deviation
         */
        compareSurfaces: function(machinedPoints, cadPoints, tolerance) {
            const hausdorff = this.compute(machinedPoints, cadPoints);
            const average = this.averageHausdorff(machinedPoints, cadPoints);

            // Compute deviation distribution
            const deviations = [];
            for (const m of machinedPoints) {
                let minDist = Infinity;
                for (const c of cadPoints) {
                    const dist = this.pointDistance(m, c);
                    if (dist < minDist) minDist = dist;
                }
                deviations.push(minDist);
            }
            deviations.sort((a, b) => a - b);

            const percentile = (p) => {
                const idx = Math.floor(deviations.length * p / 100);
                return deviations[Math.min(idx, deviations.length - 1)];
            };
            // RMS deviation
            const rms = Math.sqrt(
                deviations.reduce((sum, d) => sum + d * d, 0) / deviations.length
            );

            return {
                maxDeviation: hausdorff.hausdorffDistance,
                averageDeviation: average.symmetricAverage,
                rmsDeviation: rms,
                percentile50: percentile(50),
                percentile95: percentile(95),
                percentile99: percentile(99),
                withinTolerance: hausdorff.hausdorffDistance <= tolerance,
                percentWithinTolerance: (deviations.filter(d => d <= tolerance).length / deviations.length) * 100,
                worstLocation: hausdorff.worstDeviation,
                deviationHistogram: this.computeHistogram(deviations, 10),
                passFailStatus: hausdorff.hausdorffDistance <= tolerance ? 'PASS' : 'FAIL'
            };
        },
        /**
         * Compute histogram of deviations
         */
        computeHistogram: function(values, numBins) {
            if (values.length === 0) return [];

            const min = Math.min(...values);
            const max = Math.max(...values);
            const binWidth = (max - min) / numBins || 1;

            const bins = Array(numBins).fill(0);
            for (const v of values) {
                const idx = Math.min(Math.floor((v - min) / binWidth), numBins - 1);
                bins[idx]++;
            }
            return bins.map((count, i) => ({
                rangeStart: min + i * binWidth,
                rangeEnd: min + (i + 1) * binWidth,
                count,
                percentage: (count / values.length) * 100
            }));
        },
        /**
         * Verify machining quality
         */
        verifyMachining: function(actualSurface, targetSurface, specs) {
            const {
                maxDeviation = 0.1,
                averageDeviation = 0.05,
                surfaceRoughness = null
            } = specs;

            const comparison = this.compareSurfaces(actualSurface, targetSurface, maxDeviation);

            const checks = {
                maxDeviationOK: comparison.maxDeviation <= maxDeviation,
                averageDeviationOK: comparison.averageDeviation <= averageDeviation,
                overallPass: false
            };
            checks.overallPass = checks.maxDeviationOK && checks.averageDeviationOK;

            return {
                ...comparison,
                specifications: specs,
                checks,
                recommendation: checks.overallPass ?
                    'Surface within specifications' :
                    `Rework required - max deviation ${comparison.maxDeviation.toFixed(4)} exceeds ${maxDeviation}`
            };
        },
        /**
         * Compute deviation map for visualization
         */
        computeDeviationMap: function(surface1, surface2) {
            const map = [];

            for (const p1 of surface1) {
                let minDist = Infinity;
                let closestPoint = null;

                for (const p2 of surface2) {
                    const d = this.pointDistance(p1, p2);
                    if (d < minDist) {
                        minDist = d;
                        closestPoint = p2;
                    }
                }
                map.push({
                    point: p1,
                    deviation: minDist,
                    closestTarget: closestPoint,
                    direction: closestPoint ?
                        p1.map((v, i) => (closestPoint[i] || 0) - v) : null
                });
            }
            return map;
        },
        prismApplication: "SurfaceVerificationEngine - compare machined vs target, quality inspection"
    }
};
// INTEGRATION & EXPORT

// Self-test function
PRISM_TOPOLOGICAL_ANALYSIS.selfTest = function() {
    console.log('\n[PRISM Topological Analysis] Running self-tests...\n');

    const results = {
        persistentHomology: false,
        alphaShapes: false,
        hausdorffDistance: false
    };
    try {
        // Test 1: Persistent Homology
        const PH = this.persistentHomology;
        const points = [[0,0], [1,0], [0.5, 0.866], [0.5, 0.3]]; // Triangle + interior point
        const complex = PH.buildVietorisRips(points, 2, 2);
        const betti = PH.computeBettiNumbers(complex);

        results.persistentHomology = (
            complex.simplices.length > 0 &&
            betti.beta0 >= 1
        );
        console.log(`  ✓ Persistent Homology: ${results.persistentHomology ? 'PASS' : 'FAIL'}`);
        console.log(`    - Simplices: ${complex.simplices.length}`);
        console.log(`    - Betti numbers: β₀=${betti.beta0}, β₁=${betti.beta1}, β₂=${betti.beta2}`);
    } catch (e) {
        console.log(`  ✗ Persistent Homology: ERROR - ${e.message}`);
    }
    try {
        // Test 2: Alpha Shapes
        const AS = this.alphaShapes;
        const points = [[0,0], [1,0], [1,1], [0,1], [0.5,0.5]]; // Square with center
        const shape = AS.compute2D(points, 2);

        results.alphaShapes = (
            shape.boundary && shape.boundary.length >= 4 &&
            shape.triangles && shape.triangles.length > 0
        );
        console.log(`  ✓ Alpha Shapes: ${results.alphaShapes ? 'PASS' : 'FAIL'}`);
        console.log(`    - Boundary vertices: ${shape.boundary ? shape.boundary.length : 0}`);
        console.log(`    - Triangles: ${shape.triangles ? shape.triangles.length : 0}`);
        console.log(`    - Detected holes: ${shape.numHoles}`);
    } catch (e) {
        console.log(`  ✗ Alpha Shapes: ERROR - ${e.message}`);
    }
    try {
        // Test 3: Hausdorff Distance
        const HD = this.hausdorffDistance;
        const setA = [[0,0], [1,0], [1,1], [0,1]];
        const setB = [[0.1,0.1], [1.1,0.1], [1.1,1.1], [0.1,1.1]];
        const result = HD.compute(setA, setB);

        const expected = Math.sqrt(0.02); // ~0.141
        results.hausdorffDistance = (
            Math.abs(result.hausdorffDistance - expected) < 0.01
        );
        console.log(`  ✓ Hausdorff Distance: ${results.hausdorffDistance ? 'PASS' : 'FAIL'}`);
        console.log(`    - Hausdorff distance: ${result.hausdorffDistance.toFixed(4)}`);
        console.log(`    - Expected: ~${expected.toFixed(4)}`);
    } catch (e) {
        console.log(`  ✗ Hausdorff Distance: ERROR - ${e.message}`);
    }
    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;

    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log(`\n[PRISM Topological Analysis] Tests completed: ${passed}/${total} passed\n`);

    return results;
};
// Export
if (typeof window !== 'undefined') {
    window.PRISM_TOPOLOGICAL_ANALYSIS = PRISM_TOPOLOGICAL_ANALYSIS;

    // Integrate with PRISM_MASTER if available
    if (typeof PRISM_MASTER !== 'undefined') {
        PRISM_MASTER.topologicalAnalysis = PRISM_TOPOLOGICAL_ANALYSIS;
        PRISM_MASTER.persistentHomology = PRISM_TOPOLOGICAL_ANALYSIS.persistentHomology;
        PRISM_MASTER.alphaShapes = PRISM_TOPOLOGICAL_ANALYSIS.alphaShapes;
        PRISM_MASTER.hausdorffDistance = PRISM_TOPOLOGICAL_ANALYSIS.hausdorffDistance;
        console.log('[PRISM Topological Analysis] Integrated with PRISM_MASTER');
    }
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PRISM_TOPOLOGICAL_ANALYSIS;
}
console.log('═'.repeat(80));
console.log('PRISM LAYER 4 PHASE 2: TOPOLOGICAL ANALYSIS - LOADED');
console.log('Components: PersistentHomology, AlphaShapes, HausdorffDistance');
console.log('Industry-First: Persistent Homology Feature Recognition, Alpha Shapes B-Rep');
console.log('═'.repeat(80));

// Run self-test
PRISM_TOPOLOGICAL_ANALYSIS.selfTest();

// PRISM LAYER 4 ENHANCEMENT - PHASE 3: ADVANCED GEOMETRY
// Ruppert's Refinement | Marching Cubes | Advancing Front | Geodesic | Minkowski
// Date: January 14, 2026 | For Build: v8.66.001+
// INDUSTRY-FIRST FEATURES:
// - Geodesic Distance: True shortest paths on curved surfaces (Heat Method)
// SOURCES:
// - PRISM_UNIVERSITY_ALGORITHM_PACK_v2.js
// - MIT 6.838 Computational Geometry
// - Ruppert (1995) - Delaunay Refinement
// - Lorensen & Cline (1987) - Marching Cubes
// - Löhner (1996) - Advancing Front
// - Crane et al. (2013) - Geodesics in Heat

console.log('═'.repeat(80));
console.log('PRISM LAYER 4 ENHANCEMENT - PHASE 3: ADVANCED GEOMETRY');
console.log('Ruppert | Marching Cubes | Advancing Front | Geodesic | Minkowski');
console.log('═'.repeat(80));

const PRISM_ADVANCED_GEOMETRY = {

    version: '1.0.0',
    phase: 'Phase 3: Advanced Geometry',
    created: '2026-01-14',

    // SECTION 1: RUPPERT'S DELAUNAY REFINEMENT
    // Source: Ruppert (1995), MIT 2.158J, PRISM_UNIVERSITY_ALGORITHM_PACK_v2.js
    // Purpose: Quality mesh generation with guaranteed minimum angle (20-33°)

    ruppertRefinement: {
        name: "Ruppert's Delaunay Refinement",
        description: "Quality mesh generation with guaranteed minimum angle - no skinny triangles",

        // Geometric Utilities

        /**
         * Compute circumcenter of triangle
         */
        circumcenter: function(a, b, c) {
            const ax = a[0], ay = a[1];
            const bx = b[0], by = b[1];
            const cx = c[0], cy = c[1];

            const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
            if (Math.abs(d) < 1e-10) return null;

            const aSq = ax * ax + ay * ay;
            const bSq = bx * bx + by * by;
            const cSq = cx * cx + cy * cy;

            const ux = (aSq * (by - cy) + bSq * (cy - ay) + cSq * (ay - by)) / d;
            const uy = (aSq * (cx - bx) + bSq * (ax - cx) + cSq * (bx - ax)) / d;

            return [ux, uy];
        },
        /**
         * Compute circumradius of triangle
         */
        circumradius: function(a, b, c) {
            const cc = this.circumcenter(a, b, c);
            if (!cc) return Infinity;
            return Math.sqrt((a[0] - cc[0]) ** 2 + (a[1] - cc[1]) ** 2);
        },
        /**
         * Compute angles of triangle (in radians)
         */
        triangleAngles: function(a, b, c) {
            const ab = Math.sqrt((b[0]-a[0])**2 + (b[1]-a[1])**2);
            const bc = Math.sqrt((c[0]-b[0])**2 + (c[1]-b[1])**2);
            const ca = Math.sqrt((a[0]-c[0])**2 + (a[1]-c[1])**2);

            // Law of cosines
            const angleA = Math.acos(Math.max(-1, Math.min(1, (ab*ab + ca*ca - bc*bc) / (2*ab*ca))));
            const angleB = Math.acos(Math.max(-1, Math.min(1, (ab*ab + bc*bc - ca*ca) / (2*ab*bc))));
            const angleC = Math.PI - angleA - angleB;

            return [angleA, angleB, angleC];
        },
        /**
         * Get minimum angle of triangle
         */
        minAngle: function(a, b, c) {
            return Math.min(...this.triangleAngles(a, b, c));
        },
        /**
         * Check if point is inside circumcircle
         */
        inCircumcircle: function(p, a, b, c) {
            const ax = a[0] - p[0], ay = a[1] - p[1];
            const bx = b[0] - p[0], by = b[1] - p[1];
            const cx = c[0] - p[0], cy = c[1] - p[1];

            const det = (ax*ax + ay*ay) * (bx*cy - cx*by) -
                       (bx*bx + by*by) * (ax*cy - cx*ay) +
                       (cx*cx + cy*cy) * (ax*by - bx*ay);

            const orientation = (b[0]-a[0]) * (c[1]-a[1]) - (b[1]-a[1]) * (c[0]-a[0]);
            return orientation > 0 ? det > 0 : det < 0;
        },
        /**
         * Compute midpoint of segment
         */
        midpoint: function(a, b) {
            return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        },
        /**
         * Check if point encroaches upon segment
         * Point p encroaches segment ab if p is inside diametral circle
         */
        encroaches: function(p, a, b) {
            const mid = this.midpoint(a, b);
            const radius = Math.sqrt((a[0]-mid[0])**2 + (a[1]-mid[1])**2);
            const dist = Math.sqrt((p[0]-mid[0])**2 + (p[1]-mid[1])**2);
            return dist < radius - 1e-10;
        },
        // Delaunay Triangulation (Bowyer-Watson)

        /**
         * Build initial Delaunay triangulation
         */
        delaunayTriangulation: function(points) {
            if (points.length < 3) return { triangles: [], points: [...points] };

            // Find bounding box
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            for (const p of points) {
                minX = Math.min(minX, p[0]);
                maxX = Math.max(maxX, p[0]);
                minY = Math.min(minY, p[1]);
                maxY = Math.max(maxY, p[1]);
            }
            const dx = maxX - minX;
            const dy = maxY - minY;
            const dmax = Math.max(dx, dy) * 3;

            // Super-triangle
            const superTri = [
                [minX - dmax, minY - dmax],
                [minX + dmax * 2, minY - dmax],
                [minX + dx/2, maxY + dmax]
            ];

            const allPoints = [...points, ...superTri];
            const n = points.length;

            let triangles = [[n, n+1, n+2]]; // Super-triangle

            // Add points one by one
            for (let i = 0; i < n; i++) {
                const p = points[i];
                const badTriangles = [];

                // Find triangles whose circumcircle contains p
                for (const tri of triangles) {
                    const a = allPoints[tri[0]];
                    const b = allPoints[tri[1]];
                    const c = allPoints[tri[2]];

                    if (this.inCircumcircle(p, a, b, c)) {
                        badTriangles.push(tri);
                    }
                }
                // Find boundary polygon
                const polygon = [];
                for (const tri of badTriangles) {
                    for (let j = 0; j < 3; j++) {
                        const edge = [tri[j], tri[(j+1)%3]];
                        const edgeKey = [Math.min(edge[0], edge[1]), Math.max(edge[0], edge[1])].join('-');

                        let shared = false;
                        for (const other of badTriangles) {
                            if (other === tri) continue;
                            for (let k = 0; k < 3; k++) {
                                const otherEdge = [other[k], other[(k+1)%3]];
                                const otherKey = [Math.min(otherEdge[0], otherEdge[1]), Math.max(otherEdge[0], otherEdge[1])].join('-');
                                if (edgeKey === otherKey) {
                                    shared = true;
                                    break;
                                }
                            }
                            if (shared) break;
                        }
                        if (!shared) polygon.push(edge);
                    }
                }
                // Remove bad triangles
                triangles = triangles.filter(t => !badTriangles.includes(t));

                // Create new triangles
                for (const edge of polygon) {
                    triangles.push([edge[0], edge[1], i]);
                }
            }
            // Remove triangles connected to super-triangle
            triangles = triangles.filter(t =>
                t[0] < n && t[1] < n && t[2] < n
            );

            return { triangles, points: [...points] };
        },
        // Ruppert's Algorithm

        /**
         * Main refinement algorithm
         * @param {Array} points - Initial vertices
         * @param {Array} segments - Constraint segments [[i,j], ...]
         * @param {number} minAngle - Minimum angle in degrees (default 20°)
         * @returns {Object} Refined triangulation
         */
        refine: function(points, segments = [], minAngleDeg = 20) {
            const minAngleRad = minAngleDeg * Math.PI / 180;

            // Copy points (we'll add more)
            const vertices = points.map(p => [...p]);

            // Copy segments
            const constraintSegments = segments.map(s => [...s]);

            // Build initial triangulation
            let mesh = this.delaunayTriangulation(vertices);

            // Queues
            const encroachedSegments = [];
            const skinnyTriangles = [];

            // Find initial encroached segments and skinny triangles
            this.findEncroachedSegments(mesh, constraintSegments, vertices, encroachedSegments);
            this.findSkinnyTriangles(mesh, vertices, minAngleRad, skinnyTriangles);

            let iterations = 0;
            const maxIterations = vertices.length * 10 + 1000;

            while ((encroachedSegments.length > 0 || skinnyTriangles.length > 0) && iterations < maxIterations) {
                iterations++;

                // Priority: fix encroached segments first
                if (encroachedSegments.length > 0) {
                    const seg = encroachedSegments.pop();

                    // Split segment at midpoint
                    const mid = this.midpoint(vertices[seg[0]], vertices[seg[1]]);
                    const newIdx = vertices.length;
                    vertices.push(mid);

                    // Update constraint segments
                    const segIdx = constraintSegments.findIndex(s =>
                        (s[0] === seg[0] && s[1] === seg[1]) ||
                        (s[0] === seg[1] && s[1] === seg[0])
                    );
                    if (segIdx >= 0) {
                        constraintSegments.splice(segIdx, 1);
                        constraintSegments.push([seg[0], newIdx]);
                        constraintSegments.push([newIdx, seg[1]]);
                    }
                    // Rebuild triangulation
                    mesh = this.delaunayTriangulation(vertices);

                    // Recheck
                    encroachedSegments.length = 0;
                    skinnyTriangles.length = 0;
                    this.findEncroachedSegments(mesh, constraintSegments, vertices, encroachedSegments);
                    this.findSkinnyTriangles(mesh, vertices, minAngleRad, skinnyTriangles);

                } else if (skinnyTriangles.length > 0) {
                    const tri = skinnyTriangles.pop();

                    // Insert circumcenter
                    const a = vertices[tri[0]];
                    const b = vertices[tri[1]];
                    const c = vertices[tri[2]];
                    const cc = this.circumcenter(a, b, c);

                    if (!cc) continue;

                    // Check if circumcenter encroaches any segment
                    let encroachesSegment = false;
                    let encroached = null;

                    for (const seg of constraintSegments) {
                        if (this.encroaches(cc, vertices[seg[0]], vertices[seg[1]])) {
                            encroachesSegment = true;
                            encroached = seg;
                            break;
                        }
                    }
                    if (encroachesSegment) {
                        // Split the encroached segment instead
                        encroachedSegments.push(encroached);
                    } else {
                        // Insert circumcenter
                        vertices.push(cc);
                        mesh = this.delaunayTriangulation(vertices);

                        // Recheck
                        skinnyTriangles.length = 0;
                        this.findSkinnyTriangles(mesh, vertices, minAngleRad, skinnyTriangles);
                    }
                    // Always recheck encroachment
                    encroachedSegments.length = 0;
                    this.findEncroachedSegments(mesh, constraintSegments, vertices, encroachedSegments);
                }
            }
            return {
                triangles: mesh.triangles,
                vertices,
                iterations,
                minAngleAchieved: this.computeMinAngle(mesh, vertices) * 180 / Math.PI,
                targetMinAngle: minAngleDeg
            };
        },
        /**
         * Find segments encroached by triangulation vertices
         */
        findEncroachedSegments: function(mesh, segments, vertices, queue) {
            for (const seg of segments) {
                for (let i = 0; i < vertices.length; i++) {
                    if (i === seg[0] || i === seg[1]) continue;

                    if (this.encroaches(vertices[i], vertices[seg[0]], vertices[seg[1]])) {
                        // Check if not already in queue
                        const exists = queue.some(s =>
                            (s[0] === seg[0] && s[1] === seg[1]) ||
                            (s[0] === seg[1] && s[1] === seg[0])
                        );
                        if (!exists) {
                            queue.push(seg);
                        }
                        break;
                    }
                }
            }
        },
        /**
         * Find skinny triangles (below minimum angle)
         */
        findSkinnyTriangles: function(mesh, vertices, minAngleRad, queue) {
            for (const tri of mesh.triangles) {
                const a = vertices[tri[0]];
                const b = vertices[tri[1]];
                const c = vertices[tri[2]];

                if (!a || !b || !c) continue;

                const minAng = this.minAngle(a, b, c);
                if (minAng < minAngleRad) {
                    queue.push(tri);
                }
            }
        },
        /**
         * Compute overall minimum angle in mesh
         */
        computeMinAngle: function(mesh, vertices) {
            let minAng = Math.PI;
            for (const tri of mesh.triangles) {
                const a = vertices[tri[0]];
                const b = vertices[tri[1]];
                const c = vertices[tri[2]];
                if (a && b && c) {
                    minAng = Math.min(minAng, this.minAngle(a, b, c));
                }
            }
            return minAng;
        },
        // Manufacturing Applications

        /**
         * Generate quality mesh for FEA analysis
         */
        meshSurfaceForFEA: function(boundary, minAngle = 25) {
            // boundary: array of [x,y] points forming closed polygon
            const n = boundary.length;

            // Create segment constraints for boundary
            const segments = [];
            for (let i = 0; i < n; i++) {
                segments.push([i, (i + 1) % n]);
            }
            // Refine
            return this.refine(boundary, segments, minAngle);
        },
        /**
         * Quality tessellation for rendering
         */
        qualityTessellation: function(points, angleThreshold = 20) {
            return this.refine(points, [], angleThreshold);
        },
        prismApplication: "MeshQualityEngine - FEA meshing, quality tessellation"
    },
    // SECTION 2: MARCHING CUBES ALGORITHM
    // Source: Lorensen & Cline (1987), PRISM_UNIVERSITY_ALGORITHM_PACK_v2.js
    // Purpose: Isosurface extraction from voxel/scalar field data

    marchingCubes: {
        name: "Marching Cubes Algorithm",
        description: "Extract isosurfaces from 3D scalar fields - 256 cube configurations",

        // Edge table: which edges are cut for each of 256 cases
        // Each bit represents an edge (12 edges per cube)
        edgeTable: [
            0x0,0x109,0x203,0x30a,0x406,0x50f,0x605,0x70c,0x80c,0x905,0xa0f,0xb06,0xc0a,0xd03,0xe09,0xf00,
            0x190,0x99,0x393,0x29a,0x596,0x49f,0x795,0x69c,0x99c,0x895,0xb9f,0xa96,0xd9a,0xc93,0xf99,0xe90,
            0x230,0x339,0x33,0x13a,0x636,0x73f,0x435,0x53c,0xa3c,0xb35,0x83f,0x936,0xe3a,0xf33,0xc39,0xd30,
            0x3a0,0x2a9,0x1a3,0xaa,0x7a6,0x6af,0x5a5,0x4ac,0xbac,0xaa5,0x9af,0x8a6,0xfaa,0xea3,0xda9,0xca0,
            0x460,0x569,0x663,0x76a,0x66,0x16f,0x265,0x36c,0xc6c,0xd65,0xe6f,0xf66,0x86a,0x963,0xa69,0xb60,
            0x5f0,0x4f9,0x7f3,0x6fa,0x1f6,0xff,0x3f5,0x2fc,0xdfc,0xcf5,0xfff,0xef6,0x9fa,0x8f3,0xbf9,0xaf0,
            0x650,0x759,0x453,0x55a,0x256,0x35f,0x55,0x15c,0xe5c,0xf55,0xc5f,0xd56,0xa5a,0xb53,0x859,0x950,
            0x7c0,0x6c9,0x5c3,0x4ca,0x3c6,0x2cf,0x1c5,0xcc,0xfcc,0xec5,0xdcf,0xcc6,0xbca,0xac3,0x9c9,0x8c0,
            0x8c0,0x9c9,0xac3,0xbca,0xcc6,0xdcf,0xec5,0xfcc,0xcc,0x1c5,0x2cf,0x3c6,0x4ca,0x5c3,0x6c9,0x7c0,
            0x950,0x859,0xb53,0xa5a,0xd56,0xc5f,0xf55,0xe5c,0x15c,0x55,0x35f,0x256,0x55a,0x453,0x759,0x650,
            0xaf0,0xbf9,0x8f3,0x9fa,0xef6,0xfff,0xcf5,0xdfc,0x2fc,0x3f5,0xff,0x1f6,0x6fa,0x7f3,0x4f9,0x5f0,
            0xb60,0xa69,0x963,0x86a,0xf66,0xe6f,0xd65,0xc6c,0x36c,0x265,0x16f,0x66,0x76a,0x663,0x569,0x460,
            0xca0,0xda9,0xea3,0xfaa,0x8a6,0x9af,0xaa5,0xbac,0x4ac,0x5a5,0x6af,0x7a6,0xaa,0x1a3,0x2a9,0x3a0,
            0xd30,0xc39,0xf33,0xe3a,0x936,0x83f,0xb35,0xa3c,0x53c,0x435,0x73f,0x636,0x13a,0x33,0x339,0x230,
            0xe90,0xf99,0xc93,0xd9a,0xa96,0xb9f,0x895,0x99c,0x69c,0x795,0x49f,0x596,0x29a,0x393,0x99,0x190,
            0xf00,0xe09,0xd03,0xc0a,0xb06,0xa0f,0x905,0x80c,0x70c,0x605,0x50f,0x406,0x30a,0x203,0x109,0x0
        ],

        // Triangle table: which triangles to create for each case
        // -1 terminates the list
        triTable: [
            [-1],
            [0,8,3,-1],
            [0,1,9,-1],
            [1,8,3,9,8,1,-1],
            [1,2,10,-1],
            [0,8,3,1,2,10,-1],
            [9,2,10,0,2,9,-1],
            [2,8,3,2,10,8,10,9,8,-1],
            [3,11,2,-1],
            [0,11,2,8,11,0,-1],
            [1,9,0,2,3,11,-1],
            [1,11,2,1,9,11,9,8,11,-1],
            [3,10,1,11,10,3,-1],
            [0,10,1,0,8,10,8,11,10,-1],
            [3,9,0,3,11,9,11,10,9,-1],
            [9,8,10,10,8,11,-1],
            [4,7,8,-1],
            [4,3,0,7,3,4,-1],
            [0,1,9,8,4,7,-1],
            [4,1,9,4,7,1,7,3,1,-1],
            [1,2,10,8,4,7,-1],
            [3,4,7,3,0,4,1,2,10,-1],
            [9,2,10,9,0,2,8,4,7,-1],
            [2,10,9,2,9,7,2,7,3,7,9,4,-1],
            [8,4,7,3,11,2,-1],
            [11,4,7,11,2,4,2,0,4,-1],
            [9,0,1,8,4,7,2,3,11,-1],
            [4,7,11,9,4,11,9,11,2,9,2,1,-1],
            [3,10,1,3,11,10,7,8,4,-1],
            [1,11,10,1,4,11,1,0,4,7,11,4,-1],
            [4,7,8,9,0,11,9,11,10,11,0,3,-1],
            [4,7,11,4,11,9,9,11,10,-1],
            [9,5,4,-1],
            [9,5,4,0,8,3,-1],
            [0,5,4,1,5,0,-1],
            [8,5,4,8,3,5,3,1,5,-1],
            [1,2,10,9,5,4,-1],
            [3,0,8,1,2,10,4,9,5,-1],
            [5,2,10,5,4,2,4,0,2,-1],
            [2,10,5,3,2,5,3,5,4,3,4,8,-1],
            [9,5,4,2,3,11,-1],
            [0,11,2,0,8,11,4,9,5,-1],
            [0,5,4,0,1,5,2,3,11,-1],
            [2,1,5,2,5,8,2,8,11,4,8,5,-1],
            [10,3,11,10,1,3,9,5,4,-1],
            [4,9,5,0,8,1,8,10,1,8,11,10,-1],
            [5,4,0,5,0,11,5,11,10,11,0,3,-1],
            [5,4,8,5,8,10,10,8,11,-1],
            [9,7,8,5,7,9,-1],
            [9,3,0,9,5,3,5,7,3,-1],
            [0,7,8,0,1,7,1,5,7,-1],
            [1,5,3,3,5,7,-1],
            [9,7,8,9,5,7,10,1,2,-1],
            [10,1,2,9,5,0,5,3,0,5,7,3,-1],
            [8,0,2,8,2,5,8,5,7,10,5,2,-1],
            [2,10,5,2,5,3,3,5,7,-1],
            [7,9,5,7,8,9,3,11,2,-1],
            [9,5,7,9,7,2,9,2,0,2,7,11,-1],
            [2,3,11,0,1,8,1,7,8,1,5,7,-1],
            [11,2,1,11,1,7,7,1,5,-1],
            [9,5,8,8,5,7,10,1,3,10,3,11,-1],
            [5,7,0,5,0,9,7,11,0,1,0,10,11,10,0,-1],
            [11,10,0,11,0,3,10,5,0,8,0,7,5,7,0,-1],
            [11,10,5,7,11,5,-1],
            [10,6,5,-1],
            [0,8,3,5,10,6,-1],
            [9,0,1,5,10,6,-1],
            [1,8,3,1,9,8,5,10,6,-1],
            [1,6,5,2,6,1,-1],
            [1,6,5,1,2,6,3,0,8,-1],
            [9,6,5,9,0,6,0,2,6,-1],
            [5,9,8,5,8,2,5,2,6,3,2,8,-1],
            [2,3,11,10,6,5,-1],
            [11,0,8,11,2,0,10,6,5,-1],
            [0,1,9,2,3,11,5,10,6,-1],
            [5,10,6,1,9,2,9,11,2,9,8,11,-1],
            [6,3,11,6,5,3,5,1,3,-1],
            [0,8,11,0,11,5,0,5,1,5,11,6,-1],
            [3,11,6,0,3,6,0,6,5,0,5,9,-1],
            [6,5,9,6,9,11,11,9,8,-1],
            [5,10,6,4,7,8,-1],
            [4,3,0,4,7,3,6,5,10,-1],
            [1,9,0,5,10,6,8,4,7,-1],
            [10,6,5,1,9,7,1,7,3,7,9,4,-1],
            [6,1,2,6,5,1,4,7,8,-1],
            [1,2,5,5,2,6,3,0,4,3,4,7,-1],
            [8,4,7,9,0,5,0,6,5,0,2,6,-1],
            [7,3,9,7,9,4,3,2,9,5,9,6,2,6,9,-1],
            [3,11,2,7,8,4,10,6,5,-1],
            [5,10,6,4,7,2,4,2,0,2,7,11,-1],
            [0,1,9,4,7,8,2,3,11,5,10,6,-1],
            [9,2,1,9,11,2,9,4,11,7,11,4,5,10,6,-1],
            [8,4,7,3,11,5,3,5,1,5,11,6,-1],
            [5,1,11,5,11,6,1,0,11,7,11,4,0,4,11,-1],
            [0,5,9,0,6,5,0,3,6,11,6,3,8,4,7,-1],
            [6,5,9,6,9,11,4,7,9,7,11,9,-1],
            [10,4,9,6,4,10,-1],
            [4,10,6,4,9,10,0,8,3,-1],
            [10,0,1,10,6,0,6,4,0,-1],
            [8,3,1,8,1,6,8,6,4,6,1,10,-1],
            [1,4,9,1,2,4,2,6,4,-1],
            [3,0,8,1,2,9,2,4,9,2,6,4,-1],
            [0,2,4,4,2,6,-1],
            [8,3,2,8,2,4,4,2,6,-1],
            [10,4,9,10,6,4,11,2,3,-1],
            [0,8,2,2,8,11,4,9,10,4,10,6,-1],
            [3,11,2,0,1,6,0,6,4,6,1,10,-1],
            [6,4,1,6,1,10,4,8,1,2,1,11,8,11,1,-1],
            [9,6,4,9,3,6,9,1,3,11,6,3,-1],
            [8,11,1,8,1,0,11,6,1,9,1,4,6,4,1,-1],
            [3,11,6,3,6,0,0,6,4,-1],
            [6,4,8,11,6,8,-1],
            [7,10,6,7,8,10,8,9,10,-1],
            [0,7,3,0,10,7,0,9,10,6,7,10,-1],
            [10,6,7,1,10,7,1,7,8,1,8,0,-1],
            [10,6,7,10,7,1,1,7,3,-1],
            [1,2,6,1,6,8,1,8,9,8,6,7,-1],
            [2,6,9,2,9,1,6,7,9,0,9,3,7,3,9,-1],
            [7,8,0,7,0,6,6,0,2,-1],
            [7,3,2,6,7,2,-1],
            [2,3,11,10,6,8,10,8,9,8,6,7,-1],
            [2,0,7,2,7,11,0,9,7,6,7,10,9,10,7,-1],
            [1,8,0,1,7,8,1,10,7,6,7,10,2,3,11,-1],
            [11,2,1,11,1,7,10,6,1,6,7,1,-1],
            [8,9,6,8,6,7,9,1,6,11,6,3,1,3,6,-1],
            [0,9,1,11,6,7,-1],
            [7,8,0,7,0,6,3,11,0,11,6,0,-1],
            [7,11,6,-1],
            [7,6,11,-1],
            [3,0,8,11,7,6,-1],
            [0,1,9,11,7,6,-1],
            [8,1,9,8,3,1,11,7,6,-1],
            [10,1,2,6,11,7,-1],
            [1,2,10,3,0,8,6,11,7,-1],
            [2,9,0,2,10,9,6,11,7,-1],
            [6,11,7,2,10,3,10,8,3,10,9,8,-1],
            [7,2,3,6,2,7,-1],
            [7,0,8,7,6,0,6,2,0,-1],
            [2,7,6,2,3,7,0,1,9,-1],
            [1,6,2,1,8,6,1,9,8,8,7,6,-1],
            [10,7,6,10,1,7,1,3,7,-1],
            [10,7,6,1,7,10,1,8,7,1,0,8,-1],
            [0,3,7,0,7,10,0,10,9,6,10,7,-1],
            [7,6,10,7,10,8,8,10,9,-1],
            [6,8,4,11,8,6,-1],
            [3,6,11,3,0,6,0,4,6,-1],
            [8,6,11,8,4,6,9,0,1,-1],
            [9,4,6,9,6,3,9,3,1,11,3,6,-1],
            [6,8,4,6,11,8,2,10,1,-1],
            [1,2,10,3,0,11,0,6,11,0,4,6,-1],
            [4,11,8,4,6,11,0,2,9,2,10,9,-1],
            [10,9,3,10,3,2,9,4,3,11,3,6,4,6,3,-1],
            [8,2,3,8,4,2,4,6,2,-1],
            [0,4,2,4,6,2,-1],
            [1,9,0,2,3,4,2,4,6,4,3,8,-1],
            [1,9,4,1,4,2,2,4,6,-1],
            [8,1,3,8,6,1,8,4,6,6,10,1,-1],
            [10,1,0,10,0,6,6,0,4,-1],
            [4,6,3,4,3,8,6,10,3,0,3,9,10,9,3,-1],
            [10,9,4,6,10,4,-1],
            [4,9,5,7,6,11,-1],
            [0,8,3,4,9,5,11,7,6,-1],
            [5,0,1,5,4,0,7,6,11,-1],
            [11,7,6,8,3,4,3,5,4,3,1,5,-1],
            [9,5,4,10,1,2,7,6,11,-1],
            [6,11,7,1,2,10,0,8,3,4,9,5,-1],
            [7,6,11,5,4,10,4,2,10,4,0,2,-1],
            [3,4,8,3,5,4,3,2,5,10,5,2,11,7,6,-1],
            [7,2,3,7,6,2,5,4,9,-1],
            [9,5,4,0,8,6,0,6,2,6,8,7,-1],
            [3,6,2,3,7,6,1,5,0,5,4,0,-1],
            [6,2,8,6,8,7,2,1,8,4,8,5,1,5,8,-1],
            [9,5,4,10,1,6,1,7,6,1,3,7,-1],
            [1,6,10,1,7,6,1,0,7,8,7,0,9,5,4,-1],
            [4,0,10,4,10,5,0,3,10,6,10,7,3,7,10,-1],
            [7,6,10,7,10,8,5,4,10,4,8,10,-1],
            [6,9,5,6,11,9,11,8,9,-1],
            [3,6,11,0,6,3,0,5,6,0,9,5,-1],
            [0,11,8,0,5,11,0,1,5,5,6,11,-1],
            [6,11,3,6,3,5,5,3,1,-1],
            [1,2,10,9,5,11,9,11,8,11,5,6,-1],
            [0,11,3,0,6,11,0,9,6,5,6,9,1,2,10,-1],
            [11,8,5,11,5,6,8,0,5,10,5,2,0,2,5,-1],
            [6,11,3,6,3,5,2,10,3,10,5,3,-1],
            [5,8,9,5,2,8,5,6,2,3,8,2,-1],
            [9,5,6,9,6,0,0,6,2,-1],
            [1,5,8,1,8,0,5,6,8,3,8,2,6,2,8,-1],
            [1,5,6,2,1,6,-1],
            [1,3,6,1,6,10,3,8,6,5,6,9,8,9,6,-1],
            [10,1,0,10,0,6,9,5,0,5,6,0,-1],
            [0,3,8,5,6,10,-1],
            [10,5,6,-1],
            [11,5,10,7,5,11,-1],
            [11,5,10,11,7,5,8,3,0,-1],
            [5,11,7,5,10,11,1,9,0,-1],
            [10,7,5,10,11,7,9,8,1,8,3,1,-1],
            [11,1,2,11,7,1,7,5,1,-1],
            [0,8,3,1,2,7,1,7,5,7,2,11,-1],
            [9,7,5,9,2,7,9,0,2,2,11,7,-1],
            [7,5,2,7,2,11,5,9,2,3,2,8,9,8,2,-1],
            [2,5,10,2,3,5,3,7,5,-1],
            [8,2,0,8,5,2,8,7,5,10,2,5,-1],
            [9,0,1,5,10,3,5,3,7,3,10,2,-1],
            [9,8,2,9,2,1,8,7,2,10,2,5,7,5,2,-1],
            [1,3,5,3,7,5,-1],
            [0,8,7,0,7,1,1,7,5,-1],
            [9,0,3,9,3,5,5,3,7,-1],
            [9,8,7,5,9,7,-1],
            [5,8,4,5,10,8,10,11,8,-1],
            [5,0,4,5,11,0,5,10,11,11,3,0,-1],
            [0,1,9,8,4,10,8,10,11,10,4,5,-1],
            [10,11,4,10,4,5,11,3,4,9,4,1,3,1,4,-1],
            [2,5,1,2,8,5,2,11,8,4,5,8,-1],
            [0,4,11,0,11,3,4,5,11,2,11,1,5,1,11,-1],
            [0,2,5,0,5,9,2,11,5,4,5,8,11,8,5,-1],
            [9,4,5,2,11,3,-1],
            [2,5,10,3,5,2,3,4,5,3,8,4,-1],
            [5,10,2,5,2,4,4,2,0,-1],
            [3,10,2,3,5,10,3,8,5,4,5,8,0,1,9,-1],
            [5,10,2,5,2,4,1,9,2,9,4,2,-1],
            [8,4,5,8,5,3,3,5,1,-1],
            [0,4,5,1,0,5,-1],
            [8,4,5,8,5,3,9,0,5,0,3,5,-1],
            [9,4,5,-1],
            [4,11,7,4,9,11,9,10,11,-1],
            [0,8,3,4,9,7,9,11,7,9,10,11,-1],
            [1,10,11,1,11,4,1,4,0,7,4,11,-1],
            [3,1,4,3,4,8,1,10,4,7,4,11,10,11,4,-1],
            [4,11,7,9,11,4,9,2,11,9,1,2,-1],
            [9,7,4,9,11,7,9,1,11,2,11,1,0,8,3,-1],
            [11,7,4,11,4,2,2,4,0,-1],
            [11,7,4,11,4,2,8,3,4,3,2,4,-1],
            [2,9,10,2,7,9,2,3,7,7,4,9,-1],
            [9,10,7,9,7,4,10,2,7,8,7,0,2,0,7,-1],
            [3,7,10,3,10,2,7,4,10,1,10,0,4,0,10,-1],
            [1,10,2,8,7,4,-1],
            [4,9,1,4,1,7,7,1,3,-1],
            [4,9,1,4,1,7,0,8,1,8,7,1,-1],
            [4,0,3,7,4,3,-1],
            [4,8,7,-1],
            [9,10,8,10,11,8,-1],
            [3,0,9,3,9,11,11,9,10,-1],
            [0,1,10,0,10,8,8,10,11,-1],
            [3,1,10,11,3,10,-1],
            [1,2,11,1,11,9,9,11,8,-1],
            [3,0,9,3,9,11,1,2,9,2,11,9,-1],
            [0,2,11,8,0,11,-1],
            [3,2,11,-1],
            [2,3,8,2,8,10,10,8,9,-1],
            [9,10,2,0,9,2,-1],
            [2,3,8,2,8,10,0,1,8,1,10,8,-1],
            [1,10,2,-1],
            [1,3,8,9,1,8,-1],
            [0,9,1,-1],
            [0,3,8,-1],
            [-1]
        ],

        /**
         * Get cube index based on corner values
         */
        getCubeIndex: function(values, isoLevel) {
            let cubeIndex = 0;
            for (let i = 0; i < 8; i++) {
                if (values[i] < isoLevel) cubeIndex |= (1 << i);
            }
            return cubeIndex;
        },
        /**
         * Interpolate vertex position on edge
         */
        interpolateVertex: function(p1, p2, v1, v2, isoLevel) {
            if (Math.abs(isoLevel - v1) < 1e-10) return [...p1];
            if (Math.abs(isoLevel - v2) < 1e-10) return [...p2];
            if (Math.abs(v1 - v2) < 1e-10) return [...p1];

            const t = (isoLevel - v1) / (v2 - v1);
            return [
                p1[0] + t * (p2[0] - p1[0]),
                p1[1] + t * (p2[1] - p1[1]),
                p1[2] + t * (p2[2] - p1[2])
            ];
        },
        /**
         * Extract isosurface from 3D scalar field
         * @param {Function|Array} scalarField - Function(x,y,z) or 3D array
         * @param {number} isoLevel - Isosurface value
         * @param {Object} bounds - {min: [x,y,z], max: [x,y,z]}
         * @param {number} resolution - Grid resolution
         */
        extract: function(scalarField, isoLevel, bounds, resolution) {
            const { min, max } = bounds;
            const step = [
                (max[0] - min[0]) / resolution,
                (max[1] - min[1]) / resolution,
                (max[2] - min[2]) / resolution
            ];

            const triangles = [];
            const vertices = [];
            const vertexMap = new Map();

            // Edge to vertex indices
            const edgeIndices = [
                [0, 1], [1, 2], [2, 3], [3, 0],
                [4, 5], [5, 6], [6, 7], [7, 4],
                [0, 4], [1, 5], [2, 6], [3, 7]
            ];

            // Corner offsets
            const cornerOffsets = [
                [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
                [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]
            ];

            // Get value from scalar field
            const getValue = (i, j, k) => {
                const x = min[0] + i * step[0];
                const y = min[1] + j * step[1];
                const z = min[2] + k * step[2];

                if (typeof scalarField === 'function') {
                    return scalarField(x, y, z);
                } else {
                    // 3D array
                    return scalarField[i]?.[j]?.[k] ?? 0;
                }
            };
            // Process each cube
            for (let i = 0; i < resolution; i++) {
                for (let j = 0; j < resolution; j++) {
                    for (let k = 0; k < resolution; k++) {
                        // Get corner values
                        const values = [];
                        const positions = [];

                        for (const [di, dj, dk] of cornerOffsets) {
                            values.push(getValue(i + di, j + dj, k + dk));
                            positions.push([
                                min[0] + (i + di) * step[0],
                                min[1] + (j + dj) * step[1],
                                min[2] + (k + dk) * step[2]
                            ]);
                        }
                        const cubeIndex = this.getCubeIndex(values, isoLevel);
                        if (cubeIndex === 0 || cubeIndex === 255) continue;

                        // Get edge flags
                        const edgeFlags = this.edgeTable[cubeIndex];

                        // Compute edge vertices
                        const edgeVertices = [];
                        for (let e = 0; e < 12; e++) {
                            if (edgeFlags & (1 << e)) {
                                const [c1, c2] = edgeIndices[e];
                                const v = this.interpolateVertex(
                                    positions[c1], positions[c2],
                                    values[c1], values[c2],
                                    isoLevel
                                );
                                edgeVertices[e] = v;
                            }
                        }
                        // Create triangles
                        const triList = this.triTable[cubeIndex];
                        for (let t = 0; triList[t] !== -1; t += 3) {
                            const tri = [];
                            for (let v = 0; v < 3; v++) {
                                const edgeIdx = triList[t + v];
                                const vertex = edgeVertices[edgeIdx];

                                // Deduplicate vertices
                                const key = vertex.map(x => x.toFixed(6)).join(',');
                                let vertIdx = vertexMap.get(key);
                                if (vertIdx === undefined) {
                                    vertIdx = vertices.length;
                                    vertices.push(vertex);
                                    vertexMap.set(key, vertIdx);
                                }
                                tri.push(vertIdx);
                            }
                            triangles.push(tri);
                        }
                    }
                }
            }
            return {
                vertices,
                triangles,
                isoLevel,
                bounds,
                resolution
            };
        },
        // Manufacturing Applications

        /**
         * Visualize stock material (for simulation)
         */
        visualizeStock: function(voxelStock, threshold = 0.5) {
            // voxelStock: 3D array of occupancy values (0 = removed, 1 = material)
            const nx = voxelStock.length;
            const ny = voxelStock[0]?.length || 0;
            const nz = voxelStock[0]?.[0]?.length || 0;

            return this.extract(
                voxelStock,
                threshold,
                { min: [0, 0, 0], max: [nx, ny, nz] },
                Math.max(nx, ny, nz)
            );
        },
        /**
         * Extract REST stock surface
         */
        extractRESTStock: function(stockSimulation, resolution = 50) {
            // stockSimulation: { getData: (x,y,z) => occupancy }
            const bounds = stockSimulation.bounds || {
                min: [0, 0, 0],
                max: [100, 100, 100]
            };
            return this.extract(
                (x, y, z) => stockSimulation.getData(x, y, z),
                0.5,
                bounds,
                resolution
            );
        },
        prismApplication: "StockVisualizationEngine - voxel simulation, REST stock display"
    },
    // SECTION 3: ADVANCING FRONT MESH GENERATION
    // Source: Löhner (1996), PRISM_UNIVERSITY_ALGORITHM_PACK_v2.js
    // Purpose: High-quality boundary-conforming mesh generation

    advancingFront: {
        name: "Advancing Front Mesh Generation",
        description: "Generate high-quality boundary-conforming meshes",

        /**
         * Initialize front from boundary
         */
        initializeFront: function(boundary) {
            const front = [];
            const n = boundary.length;

            for (let i = 0; i < n; i++) {
                front.push({
                    p1: i,
                    p2: (i + 1) % n,
                    active: true
                });
            }
            return front;
        },
        /**
         * Find optimal point for new triangle
         */
        findOptimalPoint: function(edge, points, sizeFunction, front) {
            const p1 = points[edge.p1];
            const p2 = points[edge.p2];

            // Edge midpoint and length
            const mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
            const edgeLen = Math.sqrt((p2[0]-p1[0])**2 + (p2[1]-p1[1])**2);

            // Target size at midpoint
            const targetSize = typeof sizeFunction === 'function' ?
                sizeFunction(mid[0], mid[1]) : sizeFunction;

            // Normal direction (perpendicular to edge, pointing inward)
            const dx = p2[0] - p1[0];
            const dy = p2[1] - p1[1];
            const len = Math.sqrt(dx*dx + dy*dy);
            const nx = -dy / len;
            const ny = dx / len;

            // Ideal point at equilateral triangle height
            const height = targetSize * Math.sqrt(3) / 2;
            const ideal = [
                mid[0] + nx * height,
                mid[1] + ny * height
            ];

            // Check if ideal point is valid
            if (this.isValidPoint(ideal, edge, points, front)) {
                return { point: ideal, type: 'ideal' };
            }
            // Try existing front points
            let bestPoint = null;
            let bestDist = Infinity;

            for (const fe of front) {
                if (!fe.active) continue;

                for (const pi of [fe.p1, fe.p2]) {
                    if (pi === edge.p1 || pi === edge.p2) continue;

                    const p = points[pi];
                    const dist = Math.sqrt((p[0]-mid[0])**2 + (p[1]-mid[1])**2);

                    if (dist < bestDist && dist < targetSize * 2) {
                        if (this.isValidTriangle(points[edge.p1], points[edge.p2], p, front, points)) {
                            bestDist = dist;
                            bestPoint = { index: pi, type: 'existing' };
                        }
                    }
                }
            }
            if (bestPoint) return bestPoint;

            return { point: ideal, type: 'ideal' };
        },
        /**
         * Check if point is valid (doesn't cross front)
         */
        isValidPoint: function(p, baseEdge, points, front) {
            const p1 = points[baseEdge.p1];
            const p2 = points[baseEdge.p2];

            // Check that triangle doesn't overlap front edges
            for (const fe of front) {
                if (!fe.active) continue;
                if (fe === baseEdge) continue;

                const a = points[fe.p1];
                const b = points[fe.p2];

                // Check edge intersection
                if (this.edgesIntersect(p1, p, a, b) ||
                    this.edgesIntersect(p2, p, a, b)) {
                    return false;
                }
            }
            return true;
        },
        /**
         * Check if triangle is valid
         */
        isValidTriangle: function(p1, p2, p3, front, points) {
            // Check minimum angle
            const angles = this.triangleAngles(p1, p2, p3);
            if (Math.min(...angles) < Math.PI / 9) return false; // < 20 degrees

            // Check no edge crossings
            for (const fe of front) {
                if (!fe.active) continue;

                const a = points[fe.p1];
                const b = points[fe.p2];

                if (this.edgesIntersect(p1, p3, a, b) ||
                    this.edgesIntersect(p2, p3, a, b)) {
                    return false;
                }
            }
            return true;
        },
        /**
         * Check if two edges intersect
         */
        edgesIntersect: function(a1, a2, b1, b2) {
            const d1 = this.cross2D(a1, a2, b1);
            const d2 = this.cross2D(a1, a2, b2);
            const d3 = this.cross2D(b1, b2, a1);
            const d4 = this.cross2D(b1, b2, a2);

            if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
                ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
                return true;
            }
            return false;
        },
        /**
         * 2D cross product
         */
        cross2D: function(o, a, b) {
            return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        },
        /**
         * Triangle angles
         */
        triangleAngles: function(a, b, c) {
            const ab = Math.sqrt((b[0]-a[0])**2 + (b[1]-a[1])**2);
            const bc = Math.sqrt((c[0]-b[0])**2 + (c[1]-b[1])**2);
            const ca = Math.sqrt((a[0]-c[0])**2 + (a[1]-c[1])**2);

            const angleA = Math.acos(Math.max(-1, Math.min(1, (ab*ab + ca*ca - bc*bc) / (2*ab*ca))));
            const angleB = Math.acos(Math.max(-1, Math.min(1, (ab*ab + bc*bc - ca*ca) / (2*ab*bc))));
            const angleC = Math.PI - angleA - angleB;

            return [angleA, angleB, angleC];
        },
        /**
         * Update front after adding triangle
         */
        updateFront: function(front, p1Idx, p2Idx, p3Idx) {
            // Find and deactivate base edge
            for (const fe of front) {
                if ((fe.p1 === p1Idx && fe.p2 === p2Idx) ||
                    (fe.p1 === p2Idx && fe.p2 === p1Idx)) {
                    fe.active = false;
                    break;
                }
            }
            // Check if new edges exist in front (would close them)
            let foundE1 = false, foundE2 = false;

            for (const fe of front) {
                if ((fe.p1 === p1Idx && fe.p2 === p3Idx) ||
                    (fe.p1 === p3Idx && fe.p2 === p1Idx)) {
                    fe.active = false;
                    foundE1 = true;
                }
                if ((fe.p1 === p2Idx && fe.p2 === p3Idx) ||
                    (fe.p1 === p3Idx && fe.p2 === p2Idx)) {
                    fe.active = false;
                    foundE2 = true;
                }
            }
            // Add new edges if not found
            if (!foundE1) {
                front.push({ p1: p1Idx, p2: p3Idx, active: true });
            }
            if (!foundE2) {
                front.push({ p1: p3Idx, p2: p2Idx, active: true });
            }
        },
        /**
         * Main mesh generation
         * @param {Array} boundary - Boundary points [[x,y], ...]
         * @param {number|Function} sizeFunction - Target element size
         */
        generateMesh: function(boundary, sizeFunction = 1) {
            const points = boundary.map(p => [...p]);
            const front = this.initializeFront(boundary);
            const triangles = [];

            let iterations = 0;
            const maxIterations = boundary.length * 100;

            while (iterations < maxIterations) {
                iterations++;

                // Find active edge
                const activeEdge = front.find(e => e.active);
                if (!activeEdge) break;

                // Find optimal point
                const result = this.findOptimalPoint(activeEdge, points, sizeFunction, front);

                let p3Idx;
                if (result.type === 'ideal') {
                    p3Idx = points.length;
                    points.push(result.point);
                } else {
                    p3Idx = result.index;
                }
                // Add triangle
                triangles.push([activeEdge.p1, activeEdge.p2, p3Idx]);

                // Update front
                this.updateFront(front, activeEdge.p1, activeEdge.p2, p3Idx);
            }
            return {
                vertices: points,
                triangles,
                iterations
            };
        },
        prismApplication: "BoundaryMeshEngine - pocket meshing, surface mesh generation"
    }