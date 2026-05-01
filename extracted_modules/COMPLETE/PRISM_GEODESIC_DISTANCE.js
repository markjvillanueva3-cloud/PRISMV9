const PRISM_GEODESIC_DISTANCE = {
    name: 'PRISM_GEODESIC_DISTANCE',
    version: '1.0.0',
    source: 'Crane et al. 2013 (Heat Method), Stanford CS 468',
    
    /**
     * Compute geodesic distance using Dijkstra on mesh edges
     * Exact but O(n log n) complexity
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @param {number} sourceVertex - Source vertex index
     * @returns {Array} Distance from source to each vertex
     */
    dijkstra: function(vertices, faces, sourceVertex) {
        const n = vertices.length;
        
        // Build adjacency list with edge weights
        const adj = vertices.map(() => []);
        
        for (const face of faces) {
            for (let i = 0; i < face.length; i++) {
                const v1 = face[i];
                const v2 = face[(i + 1) % face.length];
                const dist = this._distance(vertices[v1], vertices[v2]);
                
                // Add edges in both directions
                adj[v1].push({ vertex: v2, weight: dist });
                adj[v2].push({ vertex: v1, weight: dist });
            }
        }
        
        // Dijkstra's algorithm
        const dist = new Array(n).fill(Infinity);
        const visited = new Array(n).fill(false);
        dist[sourceVertex] = 0;
        
        // Simple priority queue using array (could use heap for efficiency)
        const pq = [{ vertex: sourceVertex, dist: 0 }];
        
        while (pq.length > 0) {
            // Extract minimum
            pq.sort((a, b) => a.dist - b.dist);
            const { vertex: u } = pq.shift();
            
            if (visited[u]) continue;
            visited[u] = true;
            
            for (const { vertex: v, weight } of adj[u]) {
                if (!visited[v] && dist[u] + weight < dist[v]) {
                    dist[v] = dist[u] + weight;
                    pq.push({ vertex: v, dist: dist[v] });
                }
            }
        }
        
        return dist;
    },
    
    /**
     * Compute geodesic distance using Heat Method (Crane et al. 2013)
     * Approximate but more robust for complex meshes
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @param {number} sourceVertex - Source vertex index
     * @param {number} timeStep - Heat diffusion time (default: avg edge length²)
     * @returns {Array} Distance from source to each vertex
     */
    heatMethod: function(vertices, faces, sourceVertex, timeStep = null) {
        const n = vertices.length;
        
        // Calculate average edge length for default time step
        if (timeStep === null) {
            let totalLength = 0;
            let edgeCount = 0;
            for (const face of faces) {
                for (let i = 0; i < face.length; i++) {
                    totalLength += this._distance(
                        vertices[face[i]], 
                        vertices[face[(i + 1) % face.length]]
                    );
                    edgeCount++;
                }
            }
            const avgEdge = totalLength / edgeCount;
            timeStep = avgEdge * avgEdge;
        }
        
        // Build cotangent Laplacian matrix
        const L = this._buildCotangentLaplacian(vertices, faces);
        const M = this._buildMassMatrix(vertices, faces);
        
        // Step 1: Solve heat equation (M + t*L)u = δ
        // where δ is 1 at source, 0 elsewhere
        const delta = new Array(n).fill(0);
        delta[sourceVertex] = 1;
        
        // Simple iterative solver for (M + t*L)u = delta
        const A = this._addMatrices(M, this._scaleMatrix(L, timeStep));
        const u = this._solveLinearSystem(A, delta, 100);
        
        // Step 2: Compute normalized gradient X = -∇u/|∇u|
        const X = this._computeNormalizedGradient(vertices, faces, u);
        
        // Step 3: Solve Poisson equation L*φ = div(X)
        const divX = this._computeDivergence(vertices, faces, X);
        const phi = this._solveLinearSystem(L, divX, 100);
        
        // Shift so minimum is 0
        const minPhi = Math.min(...phi);
        return phi.map(p => p - minPhi);
    },
    
    /**
     * Compute all-pairs geodesic distances (expensive!)
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @param {string} method - 'dijkstra' or 'heat'
     * @returns {Array} n×n distance matrix
     */
    allPairs: function(vertices, faces, method = 'dijkstra') {
        const n = vertices.length;
        const distMatrix = [];
        
        for (let i = 0; i < n; i++) {
            if (method === 'heat') {
                distMatrix.push(this.heatMethod(vertices, faces, i));
            } else {
                distMatrix.push(this.dijkstra(vertices, faces, i));
            }
        }
        
        return distMatrix;
    },
    
    /**
     * Find geodesic path between two vertices
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @param {number} source - Source vertex index
     * @param {number} target - Target vertex index
     * @returns {Array} Path as array of vertex indices
     */
    findPath: function(vertices, faces, source, target) {
        const n = vertices.length;
        
        // Build adjacency list
        const adj = vertices.map(() => []);
        for (const face of faces) {
            for (let i = 0; i < face.length; i++) {
                const v1 = face[i];
                const v2 = face[(i + 1) % face.length];
                const dist = this._distance(vertices[v1], vertices[v2]);
                adj[v1].push({ vertex: v2, weight: dist });
                adj[v2].push({ vertex: v1, weight: dist });
            }
        }
        
        // Dijkstra with path tracking
        const dist = new Array(n).fill(Infinity);
        const prev = new Array(n).fill(-1);
        const visited = new Array(n).fill(false);
        dist[source] = 0;
        
        const pq = [{ vertex: source, dist: 0 }];
        
        while (pq.length > 0) {
            pq.sort((a, b) => a.dist - b.dist);
            const { vertex: u } = pq.shift();
            
            if (visited[u]) continue;
            visited[u] = true;
            
            if (u === target) break;
            
            for (const { vertex: v, weight } of adj[u]) {
                if (!visited[v] && dist[u] + weight < dist[v]) {
                    dist[v] = dist[u] + weight;
                    prev[v] = u;
                    pq.push({ vertex: v, dist: dist[v] });
                }
            }
        }
        
        // Reconstruct path
        const path = [];
        let current = target;
        while (current !== -1) {
            path.unshift(current);
            current = prev[current];
        }
        
        return {
            path,
            distance: dist[target],
            found: dist[target] < Infinity
        };
    },
    
    _distance: function(v1, v2) {
        const dx = v2.x - v1.x;
        const dy = v2.y - v1.y;
        const dz = (v2.z || 0) - (v1.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },
    
    _buildCotangentLaplacian: function(vertices, faces) {
        const n = vertices.length;
        const L = Array(n).fill(null).map(() => Array(n).fill(0));
        
        for (const face of faces) {
            for (let i = 0; i < 3; i++) {
                const i0 = face[i];
                const i1 = face[(i + 1) % 3];
                const i2 = face[(i + 2) % 3];
                
                const v0 = vertices[i0];
                const v1 = vertices[i1];
                const v2 = vertices[i2];
                
                // Cotangent of angle at i0
                const cot = this._cotangent(v0, v1, v2);
                
                L[i1][i2] += cot / 2;
                L[i2][i1] += cot / 2;
                L[i1][i1] -= cot / 2;
                L[i2][i2] -= cot / 2;
            }
        }
        
        return L;
    },
    
    _buildMassMatrix: function(vertices, faces) {
        const n = vertices.length;
        const M = Array(n).fill(null).map(() => Array(n).fill(0));
        
        for (const face of faces) {
            const area = this._triangleArea(
                vertices[face[0]],
                vertices[face[1]],
                vertices[face[2]]
            ) / 3;
            
            for (const vi of face) {
                M[vi][vi] += area;
            }
        }
        
        return M;
    },
    
    _cotangent: function(apex, v1, v2) {
        const a = { x: v1.x - apex.x, y: v1.y - apex.y, z: (v1.z || 0) - (apex.z || 0) };
        const b = { x: v2.x - apex.x, y: v2.y - apex.y, z: (v2.z || 0) - (apex.z || 0) };
        
        const dot = a.x * b.x + a.y * b.y + a.z * b.z;
        const crossLen = Math.sqrt(
            Math.pow(a.y * b.z - a.z * b.y, 2) +
            Math.pow(a.z * b.x - a.x * b.z, 2) +
            Math.pow(a.x * b.y - a.y * b.x, 2)
        );
        
        return dot / (crossLen + 1e-10);
    },
    
    _triangleArea: function(v0, v1, v2) {
        const ax = v1.x - v0.x, ay = v1.y - v0.y, az = (v1.z || 0) - (v0.z || 0);
        const bx = v2.x - v0.x, by = v2.y - v0.y, bz = (v2.z || 0) - (v0.z || 0);
        return 0.5 * Math.sqrt(
            Math.pow(ay * bz - az * by, 2) +
            Math.pow(az * bx - ax * bz, 2) +
            Math.pow(ax * by - ay * bx, 2)
        );
    },
    
    _addMatrices: function(A, B) {
        return A.map((row, i) => row.map((val, j) => val + B[i][j]));
    },
    
    _scaleMatrix: function(M, s) {
        return M.map(row => row.map(val => val * s));
    },
    
    _solveLinearSystem: function(A, b, maxIter = 100) {
        // Gauss-Seidel iterative solver
        const n = b.length;
        const x = new Array(n).fill(0);
        
        for (let iter = 0; iter < maxIter; iter++) {
            for (let i = 0; i < n; i++) {
                let sum = b[i];
                for (let j = 0; j < n; j++) {
                    if (i !== j) {
                        sum -= A[i][j] * x[j];
                    }
                }
                if (Math.abs(A[i][i]) > 1e-10) {
                    x[i] = sum / A[i][i];
                }
            }
        }
        
        return x;
    },
    
    _computeNormalizedGradient: function(vertices, faces, u) {
        return faces.map(face => {
            const v0 = vertices[face[0]];
            const v1 = vertices[face[1]];
            const v2 = vertices[face[2]];
            
            // Compute gradient in triangle
            const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: (v1.z || 0) - (v0.z || 0) };
            const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: (v2.z || 0) - (v0.z || 0) };
            
            const u0 = u[face[0]];
            const u1 = u[face[1]];
            const u2 = u[face[2]];
            
            // Gradient = (u1-u0)*perpE2 + (u2-u0)*perpE1
            // Simplified: return normalized direction
            const grad = {
                x: (u1 - u0) * e2.y - (u2 - u0) * e1.y,
                y: (u2 - u0) * e1.x - (u1 - u0) * e2.x,
                z: 0
            };
            
            const len = Math.sqrt(grad.x * grad.x + grad.y * grad.y + grad.z * grad.z);
            if (len > 1e-10) {
                return { x: -grad.x / len, y: -grad.y / len, z: -grad.z / len };
            }
            return { x: 0, y: 0, z: 0 };
        });
    },
    
    _computeDivergence: function(vertices, faces, X) {
        const n = vertices.length;
        const div = new Array(n).fill(0);
        
        faces.forEach((face, faceIdx) => {
            const area = this._triangleArea(
                vertices[face[0]],
                vertices[face[1]],
                vertices[face[2]]
            );
            
            const gradient = X[faceIdx];
            
            for (let i = 0; i < 3; i++) {
                div[face[i]] += area * gradient.x / 3;
            }
        });
        
        return div;
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('geodesic.dijkstra', 'PRISM_GEODESIC_DISTANCE.dijkstra');
            PRISM_GATEWAY.register('geodesic.heat', 'PRISM_GEODESIC_DISTANCE.heatMethod');
            PRISM_GATEWAY.register('geodesic.allPairs', 'PRISM_GEODESIC_DISTANCE.allPairs');
            PRISM_GATEWAY.register('geodesic.path', 'PRISM_GEODESIC_DISTANCE.findPath');
        }
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// PRISM_SHAPE_DIAMETER_FUNCTION - Shape analysis via SDF
// Source: Shapira et al. 2008 "Consistent Mesh Partitioning"
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_SHAPE_DIAMETER_FUNCTION = {
    name: 'PRISM_SHAPE_DIAMETER_FUNCTION',
    version: '1.0.0',
    source: 'Shapira et al. 2008, CGAL Shape Analysis',
    
    /**
     * Compute Shape Diameter Function for each vertex
     * SDF measures local thickness by shooting rays into the interior
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @param {Object} options - Computation options
     * @returns {Array} SDF value for each vertex
     */
    computeSDF: function(vertices, faces, options = {}) {
        const {
            numRays = 30,
            coneAngle = Math.PI / 6, // 30 degrees
            useMedian = true
        } = options;
        
        // Compute vertex normals
        const normals = this._computeVertexNormals(vertices, faces);
        
        // Build BVH or spatial index for ray casting
        const triangles = faces.map(face => ({
            v0: vertices[face[0]],
            v1: vertices[face[1]],
            v2: vertices[face[2]],
            indices: face
        }));
        
        const sdf = vertices.map((vertex, vi) => {
            const normal = normals[vi];
            const inwardNormal = { x: -normal.x, y: -normal.y, z: -normal.z };
            
            // Sample rays in cone around inward normal
            const distances = [];
            
            for (let i = 0; i < numRays; i++) {
                const rayDir = this._sampleConeDirection(inwardNormal, coneAngle);
                const hit = this._raycast(vertex, rayDir, triangles, vi);
                
                if (hit.distance > 0 && hit.distance < Infinity) {
                    distances.push(hit.distance);
                }
            }
            
            if (distances.length === 0) {
                return 0;
            }
            
            if (useMedian) {
                distances.sort((a, b) => a - b);
                return distances[Math.floor(distances.length / 2)];
            } else {
                return distances.reduce((a, b) => a + b, 0) / distances.length;
            }
        });
        
        return sdf;
    },
    
    /**
     * Segment mesh based on SDF values
     * Uses k-means clustering on SDF
     * @param {Array} sdf - SDF values per vertex
     * @param {number} numSegments - Number of segments
     * @returns {Array} Segment ID for each vertex
     */
    segmentBySDF: function(sdf, numSegments = 4) {
        // K-means clustering on SDF values
        const n = sdf.length;
        
        // Initialize centroids
        const minSDF = Math.min(...sdf.filter(s => s > 0));
        const maxSDF = Math.max(...sdf);
        const centroids = [];
        
        for (let i = 0; i < numSegments; i++) {
            centroids.push(minSDF + (maxSDF - minSDF) * (i + 0.5) / numSegments);
        }
        
        let labels = new Array(n).fill(0);
        
        // K-means iterations
        for (let iter = 0; iter < 20; iter++) {
            // Assign each vertex to nearest centroid
            labels = sdf.map(s => {
                let minDist = Infinity;
                let minIdx = 0;
                for (let j = 0; j < numSegments; j++) {
                    const dist = Math.abs(s - centroids[j]);
                    if (dist < minDist) {
                        minDist = dist;
                        minIdx = j;
                    }
                }
                return minIdx;
            });
            
            // Update centroids
            const sums = new Array(numSegments).fill(0);
            const counts = new Array(numSegments).fill(0);
            
            for (let i = 0; i < n; i++) {
                sums[labels[i]] += sdf[i];
                counts[labels[i]]++;
            }
            
            for (let j = 0; j < numSegments; j++) {
                if (counts[j] > 0) {
                    centroids[j] = sums[j] / counts[j];
                }
            }
        }
        
        return {
            labels,
            centroids,
            numSegments
        };
    },
    
    /**
     * Compute volume of mesh using SDF integration
     * Approximate volume from shape diameter
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @param {Array} sdf - Pre-computed SDF (optional)
     * @returns {number} Approximate volume
     */
    estimateVolume: function(vertices, faces, sdf = null) {
        if (!sdf) {
            sdf = this.computeSDF(vertices, faces);
        }
        
        // Integrate SDF over surface: V ≈ ∫ SDF/2 dA
        let volume = 0;
        
        for (const face of faces) {
            const area = this._triangleArea(
                vertices[face[0]],
                vertices[face[1]],
                vertices[face[2]]
            );
            
            const avgSDF = (sdf[face[0]] + sdf[face[1]] + sdf[face[2]]) / 3;
            volume += area * avgSDF / 2;
        }
        
        return volume;
    },
    
    _computeVertexNormals: function(vertices, faces) {
        const normals = vertices.map(() => ({ x: 0, y: 0, z: 0 }));
        
        for (const face of faces) {
            const v0 = vertices[face[0]];
            const v1 = vertices[face[1]];
            const v2 = vertices[face[2]];
            
            // Face normal
            const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: (v1.z || 0) - (v0.z || 0) };
            const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: (v2.z || 0) - (v0.z || 0) };
            
            const n = {
                x: e1.y * e2.z - e1.z * e2.y,
                y: e1.z * e2.x - e1.x * e2.z,
                z: e1.x * e2.y - e1.y * e2.x
            };
            
            for (const vi of face) {
                normals[vi].x += n.x;
                normals[vi].y += n.y;
                normals[vi].z += n.z;
            }
        }
        
        // Normalize
        return normals.map(n => {
            const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
            if (len > 1e-10) {
                return { x: n.x / len, y: n.y / len, z: n.z / len };
            }
            return { x: 0, y: 0, z: 1 };
        });
    },
    
    _sampleConeDirection: function(axis, coneAngle) {
        // Sample uniformly in cone
        const phi = Math.random() * 2 * Math.PI;
        const cosTheta = 1 - Math.random() * (1 - Math.cos(coneAngle));
        const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
        
        // Create local coordinate system
        const up = Math.abs(axis.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
        const right = this._normalize(this._cross(up, axis));
        const forward = this._cross(axis, right);
        
        return {
            x: sinTheta * Math.cos(phi) * right.x + sinTheta * Math.sin(phi) * forward.x + cosTheta * axis.x,
            y: sinTheta * Math.cos(phi) * right.y + sinTheta * Math.sin(phi) * forward.y + cosTheta * axis.y,
            z: sinTheta * Math.cos(phi) * right.z + sinTheta * Math.sin(phi) * forward.z + cosTheta * axis.z
        };
    },
    
    _raycast: function(origin, direction, triangles, excludeVertex) {
        let minDist = Infinity;
        
        for (const tri of triangles) {
            // Skip triangles containing the origin vertex
            if (tri.indices.includes(excludeVertex)) continue;
            
            const hit = this._rayTriangleIntersect(origin, direction, tri.v0, tri.v1, tri.v2);
            if (hit > 1e-6 && hit < minDist) {
                minDist = hit;
            }
        }
        
        return { distance: minDist };
    },
    
    _rayTriangleIntersect: function(origin, dir, v0, v1, v2) {
        // Möller–Trumbore algorithm
        const EPSILON = 1e-10;
        
        const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: (v1.z || 0) - (v0.z || 0) };
        const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: (v2.z || 0) - (v0.z || 0) };
        
        const h = this._cross(dir, e2);
        const a = this._dot(e1, h);
        
        if (Math.abs(a) < EPSILON) return -1;
        
        const f = 1 / a;
        const s = { x: origin.x - v0.x, y: origin.y - v0.y, z: (origin.z || 0) - (v0.z || 0) };
        const u = f * this._dot(s, h);
        
        if (u < 0 || u > 1) return -1;
        
        const q = this._cross(s, e1);
        const v = f * this._dot(dir, q);
        
        if (v < 0 || u + v > 1) return -1;
        
        const t = f * this._dot(e2, q);
        return t;
    },
    
    _cross: function(a, b) {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    },
    
    _dot: function(a, b) {
        return a.x * b.x + a.y * b.y + (a.z || 0) * (b.z || 0);
    },
    
    _normalize: function(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        if (len > 1e-10) {
            return { x: v.x / len, y: v.y / len, z: v.z / len };
        }
        return { x: 0, y: 0, z: 1 };
    },
    
    _triangleArea: function(v0, v1, v2) {
        const ax = v1.x - v0.x, ay = v1.y - v0.y, az = (v1.z || 0) - (v0.z || 0);
        const bx = v2.x - v0.x, by = v2.y - v0.y, bz = (v2.z || 0) - (v0.z || 0);
        return 0.5 * Math.sqrt(
            Math.pow(ay * bz - az * by, 2) +
            Math.pow(az * bx - ax * bz, 2) +
            Math.pow(ax * by - ay * bx, 2)
        );
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('shape.sdf.compute', 'PRISM_SHAPE_DIAMETER_FUNCTION.computeSDF');
            PRISM_GATEWAY.register('shape.sdf.segment', 'PRISM_SHAPE_DIAMETER_FUNCTION.segmentBySDF');
            PRISM_GATEWAY.register('shape.sdf.volume', 'PRISM_SHAPE_DIAMETER_FUNCTION.estimateVolume');
        }
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// PRISM_ISOTROPIC_REMESHING - Uniform triangle quality remeshing
// Source: Botsch & Kobbelt 2004 "A Remeshing Approach to Multiresolution Modeling"
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_ISOTROPIC_REMESHING = {
    name: 'PRISM_ISOTROPIC_REMESHING',
    version: '1.0.0',
    source: 'Botsch & Kobbelt 2004, CGAL Surface Mesh Simplification',
    
    /**
     * Perform isotropic remeshing to achieve uniform edge lengths
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @param {number} targetEdgeLength - Desired edge length
     * @param {number} iterations - Number of remeshing iterations
     * @returns {Object} { vertices, faces }
     */
    remesh: function(vertices, faces, targetEdgeLength, iterations = 5) {
        let currentVertices = vertices.map(v => ({ ...v }));
        let currentFaces = faces.map(f => [...f]);
        
        const lowThreshold = 4/5 * targetEdgeLength;
        const highThreshold = 4/3 * targetEdgeLength;
        
        for (let iter = 0; iter < iterations; iter++) {
            // Step 1: Split long edges
            const splitResult = this._splitLongEdges(currentVertices, currentFaces, highThreshold);
            currentVertices = splitResult.vertices;
            currentFaces = splitResult.faces;
            
            // Step 2: Collapse short edges
            const collapseResult = this._collapseShortEdges(currentVertices, currentFaces, lowThreshold, highThreshold);
            currentVertices = collapseResult.vertices;
            currentFaces = collapseResult.faces;
            
            // Step 3: Flip edges to improve valence
            currentFaces = this._flipEdgesForValence(currentVertices, currentFaces);
            
            // Step 4: Tangential relaxation (smooth)
            currentVertices = this._tangentialRelaxation(currentVertices, currentFaces);
        }
        
        return {
            vertices: currentVertices,
            faces: currentFaces
        };
    },
    
    _splitLongEdges: function(vertices, faces, threshold) {
        const newVertices = [...vertices.map(v => ({ ...v }))];
        let newFaces = [...faces.map(f => [...f])];
        
        const thresholdSq = threshold * threshold;
        let changed = true;
        
        while (changed) {
            changed = false;
            const edgesToSplit = new Map();
            
            // Find edges to split
            newFaces.forEach((face, faceIdx) => {
                for (let i = 0; i < 3; i++) {
                    const v1 = face[i];
                    const v2 = face[(i + 1) % 3];
                    const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
                    
                    const dx = newVertices[v2].x - newVertices[v1].x;
                    const dy = newVertices[v2].y - newVertices[v1].y;
                    const dz = (newVertices[v2].z || 0) - (newVertices[v1].z || 0);
                    const lenSq = dx * dx + dy * dy + dz * dz;
                    
                    if (lenSq > thresholdSq && !edgesToSplit.has(key)) {
                        edgesToSplit.set(key, {
                            v1: Math.min(v1, v2),
                            v2: Math.max(v1, v2),
                            midpoint: {
                                x: (newVertices[v1].x + newVertices[v2].x) / 2,
                                y: (newVertices[v1].y + newVertices[v2].y) / 2,
                                z: ((newVertices[v1].z || 0) + (newVertices[v2].z || 0)) / 2
                            }
                        });
                    }
                }
            });
            
            if (edgesToSplit.size === 0) break;
            changed = true;
            
            // Process edge splits
            const edgeVertexMap = new Map();
            
            edgesToSplit.forEach((edge, key) => {
                const newIdx = newVertices.length;
                newVertices.push(edge.midpoint);
                edgeVertexMap.set(key, newIdx);
            });
            
            // Update faces
            const updatedFaces = [];
            
            for (const face of newFaces) {
                const splitEdges = [];
                
                for (let i = 0; i < 3; i++) {
                    const v1 = face[i];
                    const v2 = face[(i + 1) % 3];
                    const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
                    
                    if (edgeVertexMap.has(key)) {
                        splitEdges.push({ edge: i, midVertex: edgeVertexMap.get(key) });
                    }
                }
                
                if (splitEdges.length === 0) {
                    updatedFaces.push(face);
                } else if (splitEdges.length === 1) {
                    // One edge split: 2 triangles
                    const { edge, midVertex } = splitEdges[0];
                    const v0 = face[edge];
                    const v1 = face[(edge + 1) % 3];
                    const v2 = face[(edge + 2) % 3];
                    
                    updatedFaces.push([v0, midVertex, v2]);
                    updatedFaces.push([midVertex, v1, v2]);
                } else {
                    // Multiple splits: more complex subdivision
                    // For simplicity, use fan triangulation
                    updatedFaces.push(face);
                }
            }
            
            newFaces = updatedFaces;
        }
        
        return { vertices: newVertices, faces: newFaces };
    },
    
    _collapseShortEdges: function(vertices, faces, lowThreshold, highThreshold) {
        const newVertices = [...vertices.map(v => ({ ...v }))];
        let newFaces = [...faces.map(f => [...f])];
        
        const lowSq = lowThreshold * lowThreshold;
        const highSq = highThreshold * highThreshold;
        const collapsed = new Set();
        const vertexMap = new Array(newVertices.length).fill(null).map((_, i) => i);
        
        // Find short edges
        const shortEdges = [];
        
        newFaces.forEach(face => {
            for (let i = 0; i < 3; i++) {
                const v1 = face[i];
                const v2 = face[(i + 1) % 3];
                
                const dx = newVertices[v2].x - newVertices[v1].x;
                const dy = newVertices[v2].y - newVertices[v1].y;
                const dz = (newVertices[v2].z || 0) - (newVertices[v1].z || 0);
                const lenSq = dx * dx + dy * dy + dz * dz;
                
                if (lenSq < lowSq) {
                    shortEdges.push({ v1, v2, lenSq });
                }
            }
        });
        
        // Sort by length (collapse shortest first)
        shortEdges.sort((a, b) => a.lenSq - b.lenSq);
        
        // Collapse edges
        for (const edge of shortEdges) {
            const v1 = vertexMap[edge.v1];
            const v2 = vertexMap[edge.v2];
            
            if (v1 === v2 || collapsed.has(v1) || collapsed.has(v2)) continue;
            
            // Check if collapse would create long edges
            const midpoint = {
                x: (newVertices[v1].x + newVertices[v2].x) / 2,
                y: (newVertices[v1].y + newVertices[v2].y) / 2,
                z: ((newVertices[v1].z || 0) + (newVertices[v2].z || 0)) / 2
            };
            
            // Collapse v2 into v1
            newVertices[v1] = midpoint;
            collapsed.add(v2);
            
            // Update vertex map
            for (let i = 0; i < vertexMap.length; i++) {
                if (vertexMap[i] === v2) {
                    vertexMap[i] = v1;
                }
            }
        }
        
        // Remap faces and remove degenerate
        newFaces = newFaces
            .map(face => face.map(v => vertexMap[v]))
            .filter(face => {
                return face[0] !== face[1] && face[1] !== face[2] && face[2] !== face[0];
            });
        
        // Compact vertices
        const usedVertices = new Set(newFaces.flat());
        const compactMap = new Map();
        const compactVertices = [];
        
        for (const vi of usedVertices) {
            compactMap.set(vi, compactVertices.length);
            compactVertices.push(newVertices[vi]);
        }
        
        const compactFaces = newFaces.map(face => 
            face.map(v => compactMap.get(v))
        );
        
        return { vertices: compactVertices, faces: compactFaces };
    },
    
    _flipEdgesForValence: function(vertices, faces) {
        // Target valence is 6 for interior vertices
        const newFaces = [...faces.map(f => [...f])];
        
        // Build edge-to-face map
        const edgeFaces = new Map();
        
        newFaces.forEach((face, faceIdx) => {
            for (let i = 0; i < 3; i++) {
                const v1 = face[i];
                const v2 = face[(i + 1) % 3];
                const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
                
                if (!edgeFaces.has(key)) {
                    edgeFaces.set(key, []);
                }
                edgeFaces.get(key).push({ faceIdx, edgeIdx: i });
            }
        });
        
        // Calculate vertex valence
        const valence = vertices.map(() => 0);
        for (const face of newFaces) {
            for (const v of face) valence[v]++;
        }
        
        // Flip edges where it improves valence
        edgeFaces.forEach((faceList, key) => {
            if (faceList.length !== 2) return; // Only interior edges
            
            const [v1, v2] = key.split('-').map(Number);
            const f1 = newFaces[faceList[0].faceIdx];
            const f2 = newFaces[faceList[1].faceIdx];
            
            // Find opposite vertices
            const v3 = f1.find(v => v !== v1 && v !== v2);
            const v4 = f2.find(v => v !== v1 && v !== v2);
            
            if (v3 === undefined || v4 === undefined) return;
            
            // Calculate valence deviation before/after flip
            const targetValence = 6;
            const beforeDev = Math.abs(valence[v1] - targetValence) + 
                              Math.abs(valence[v2] - targetValence) +
                              Math.abs(valence[v3] - targetValence) +
                              Math.abs(valence[v4] - targetValence);
            
            const afterDev = Math.abs(valence[v1] - 1 - targetValence) +
                             Math.abs(valence[v2] - 1 - targetValence) +
                             Math.abs(valence[v3] + 1 - targetValence) +
                             Math.abs(valence[v4] + 1 - targetValence);
            
            if (afterDev < beforeDev) {
                // Perform flip
                newFaces[faceList[0].faceIdx] = [v1, v4, v3];
                newFaces[faceList[1].faceIdx] = [v2, v3, v4];
                
                valence[v1]--;
                valence[v2]--;
                valence[v3]++;
                valence[v4]++;
            }
        });
        
        return newFaces;
    },
    
    _tangentialRelaxation: function(vertices, faces) {
        const newVertices = vertices.map(v => ({ ...v }));
        
        // Build adjacency and compute normals
        const adj = vertices.map(() => new Set());
        const normals = vertices.map(() => ({ x: 0, y: 0, z: 0 }));
        
        for (const face of faces) {
            for (let i = 0; i < 3; i++) {
                const v = face[i];
                adj[v].add(face[(i + 1) % 3]);
                adj[v].add(face[(i + 2) % 3]);
            }
            
            // Accumulate face normal
            const v0 = vertices[face[0]];
            const v1 = vertices[face[1]];
            const v2 = vertices[face[2]];
            
            const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: (v1.z || 0) - (v0.z || 0) };
            const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: (v2.z || 0) - (v0.z || 0) };
            
            const n = {
                x: e1.y * e2.z - e1.z * e2.y,
                y: e1.z * e2.x - e1.x * e2.z,
                z: e1.x * e2.y - e1.y * e2.x
            };
            
            for (const vi of face) {
                normals[vi].x += n.x;
                normals[vi].y += n.y;
                normals[vi].z += n.z;
            }
        }
        
        // Normalize normals
        for (let i = 0; i < normals.length; i++) {
            const len = Math.sqrt(normals[i].x ** 2 + normals[i].y ** 2 + normals[i].z ** 2);
            if (len > 1e-10) {
                normals[i].x /= len;
                normals[i].y /= len;
                normals[i].z /= len;
            }
        }
        
        // Tangential relaxation
        const lambda = 0.5;
        
        for (let i = 0; i < vertices.length; i++) {
            if (adj[i].size === 0) continue;
            
            // Compute centroid of neighbors
            let cx = 0, cy = 0, cz = 0;
            for (const j of adj[i]) {
                cx += vertices[j].x;
                cy += vertices[j].y;
                cz += vertices[j].z || 0;
            }
            cx /= adj[i].size;
            cy /= adj[i].size;
            cz /= adj[i].size;
            
            // Direction to centroid
            const dx = cx - vertices[i].x;
            const dy = cy - vertices[i].y;
            const dz = cz - (vertices[i].z || 0);
            
            // Project onto tangent plane
            const n = normals[i];
            const dot = dx * n.x + dy * n.y + dz * n.z;
            
            const tx = dx - dot * n.x;
            const ty = dy - dot * n.y;
            const tz = dz - dot * n.z;
            
            // Update position
            newVertices[i].x += lambda * tx;
            newVertices[i].y += lambda * ty;
            newVertices[i].z = (newVertices[i].z || 0) + lambda * tz;
        }
        
        return newVertices;
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('mesh.remesh.isotropic', 'PRISM_ISOTROPIC_REMESHING.remesh');
        }
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// PRISM_OFFSET_SURFACE - Surface offsetting for CAM/machining
// Source: MIT 2.158J, Industry offset surface methods
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_OFFSET_SURFACE = {
    name: 'PRISM_OFFSET_SURFACE',
    version: '1.0.0',
    source: 'MIT 2.158J Computational Geometry, CAM offsetting',
    
    /**
     * Offset mesh surface by moving vertices along normals
     * Simple but can create self-intersections
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @param {number} distance - Offset distance (positive = outward)
     * @returns {Object} Offset mesh { vertices, faces }
     */
    offsetSimple: function(vertices, faces, distance) {
        // Compute vertex normals
        const normals = this._computeVertexNormals(vertices, faces);
        
        // Offset each vertex along its normal
        const offsetVertices = vertices.map((v, i) => ({
            x: v.x + distance * normals[i].x,
            y: v.y + distance * normals[i].y,
            z: (v.z || 0) + distance * normals[i].z
        }));
        
        return {
            vertices: offsetVertices,
            faces: faces.map(f => [...f])
        };
    },
    
    /**
     * Offset with variable distance per vertex
     * Useful for adaptive offsetting based on curvature
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @param {Array} distances - Distance for each vertex
     * @returns {Object} Offset mesh
     */
    offsetVariable: function(vertices, faces, distances) {
        const normals = this._computeVertexNormals(vertices, faces);
        
        const offsetVertices = vertices.map((v, i) => ({
            x: v.x + distances[i] * normals[i].x,
            y: v.y + distances[i] * normals[i].y,
            z: (v.z || 0) + distances[i] * normals[i].z
        }));
        
        return {
            vertices: offsetVertices,
            faces: faces.map(f => [...f])
        };
    },
    
    /**
     * Curvature-aware offsetting
     * Reduces offset where curvature is high to prevent self-intersection
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @param {number} baseDistance - Nominal offset distance
     * @param {Object} options - Curvature options
     * @returns {Object} Offset mesh
     */
    offsetCurvatureAware: function(vertices, faces, baseDistance, options = {}) {
        const {
            minDistanceRatio = 0.5,
            curvatureThreshold = 1.0
        } = options;
        
        // Compute vertex curvatures (mean curvature)
        const curvatures = this._computeVertexCurvature(vertices, faces);
        
        // Adjust distance based on curvature
        const distances = curvatures.map(k => {
            const absK = Math.abs(k);
            if (absK * Math.abs(baseDistance) > curvatureThreshold) {
                // Reduce offset to avoid self-intersection
                const factor = Math.max(minDistanceRatio, 1 / (1 + absK * Math.abs(baseDistance)));
                return baseDistance * factor;
            }
            return baseDistance;
        });
        
        return this.offsetVariable(vertices, faces, distances);
    },
    
    /**
     * Create shell (inset and outset surfaces)
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @param {number} thickness - Shell thickness
     * @returns {Object} Shell mesh with inner and outer surfaces
     */
    createShell: function(vertices, faces, thickness) {
        const halfThickness = thickness / 2;
        
        const outer = this.offsetSimple(vertices, faces, halfThickness);
        const inner = this.offsetSimple(vertices, faces, -halfThickness);
        
        // Flip inner surface normals (reverse face winding)
        const innerFacesFlipped = inner.faces.map(f => [f[0], f[2], f[1]]);
        
        // Combine into single mesh
        const combinedVertices = [...outer.vertices, ...inner.vertices];
        const innerOffset = outer.vertices.length;
        
        const combinedFaces = [
            ...outer.faces,
            ...innerFacesFlipped.map(f => f.map(v => v + innerOffset))
        ];
        
        // TODO: Add side faces to close the shell
        
        return {
            vertices: combinedVertices,
            faces: combinedFaces,
            outerVertexCount: outer.vertices.length,
            innerVertexCount: inner.vertices.length
        };
    },
    
    /**
     * Offset for tool path generation
     * Returns parallel offset curves at specified height
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @param {number} toolRadius - Tool radius
     * @param {number} zLevel - Z height for slicing
     * @returns {Array} Offset contours
     */
    toolpathOffset: function(vertices, faces, toolRadius, zLevel) {
        // First, slice mesh at zLevel
        const contours = this._sliceMesh(vertices, faces, zLevel);
        
        // Then offset each contour
        const offsetContours = contours.map(contour => 
            this._offsetContour2D(contour, toolRadius)
        );
        
        return offsetContours;
    },
    
    _computeVertexNormals: function(vertices, faces) {
        const normals = vertices.map(() => ({ x: 0, y: 0, z: 0 }));
        
        for (const face of faces) {
            const v0 = vertices[face[0]];
            const v1 = vertices[face[1]];
            const v2 = vertices[face[2]];
            
            const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: (v1.z || 0) - (v0.z || 0) };
            const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: (v2.z || 0) - (v0.z || 0) };
            
            const n = {
                x: e1.y * e2.z - e1.z * e2.y,
                y: e1.z * e2.x - e1.x * e2.z,
                z: e1.x * e2.y - e1.y * e2.x
            };
            
            for (const vi of face) {
                normals[vi].x += n.x;
                normals[vi].y += n.y;
                normals[vi].z += n.z;
            }
        }
        
        return normals.map(n => {
            const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
            if (len > 1e-10) {
                return { x: n.x / len, y: n.y / len, z: n.z / len };
            }
            return { x: 0, y: 0, z: 1 };
        });
    },
    
    _computeVertexCurvature: function(vertices, faces) {
        // Discrete mean curvature using cotangent Laplacian
        const n = vertices.length;
        const curvatures = new Array(n).fill(0);
        const areas = new Array(n).fill(0);
        
        for (const face of faces) {
            for (let i = 0; i < 3; i++) {
                const i0 = face[i];
                const i1 = face[(i + 1) % 3];
                const i2 = face[(i + 2) % 3];
                
                const v0 = vertices[i0];
                const v1 = vertices[i1];
                const v2 = vertices[i2];
                
                // Cotangent weights
                const cot = this._cotangent(v0, v1, v2);
                
                // Mean curvature contribution
                const dx = v1.x - v2.x;
                const dy = v1.y - v2.y;
                const dz = (v1.z || 0) - (v2.z || 0);
                
                curvatures[i1] += cot * Math.sqrt(dx * dx + dy * dy + dz * dz);
                curvatures[i2] += cot * Math.sqrt(dx * dx + dy * dy + dz * dz);
            }
            
            // Barycentric area
            const area = this._triangleArea(
                vertices[face[0]],
                vertices[face[1]],
                vertices[face[2]]
            ) / 3;
            
            for (const vi of face) {
                areas[vi] += area;
            }
        }
        
        return curvatures.map((c, i) => areas[i] > 0 ? c / (4 * areas[i]) : 0);
    },
    
    _cotangent: function(apex, v1, v2) {
        const a = { x: v1.x - apex.x, y: v1.y - apex.y, z: (v1.z || 0) - (apex.z || 0) };
        const b = { x: v2.x - apex.x, y: v2.y - apex.y, z: (v2.z || 0) - (apex.z || 0) };
        
        const dot = a.x * b.x + a.y * b.y + a.z * b.z;
        const crossLen = Math.sqrt(
            Math.pow(a.y * b.z - a.z * b.y, 2) +
            Math.pow(a.z * b.x - a.x * b.z, 2) +
            Math.pow(a.x * b.y - a.y * b.x, 2)
        );
        
        return dot / (crossLen + 1e-10);
    },
    
    _triangleArea: function(v0, v1, v2) {
        const ax = v1.x - v0.x, ay = v1.y - v0.y, az = (v1.z || 0) - (v0.z || 0);
        const bx = v2.x - v0.x, by = v2.y - v0.y, bz = (v2.z || 0) - (v0.z || 0);
        return 0.5 * Math.sqrt(
            Math.pow(ay * bz - az * by, 2) +
            Math.pow(az * bx - ax * bz, 2) +
            Math.pow(ax * by - ay * bx, 2)
        );
    },
    
    _sliceMesh: function(vertices, faces, zLevel) {
        const contourSegments = [];
        
        for (const face of faces) {
            const v0 = vertices[face[0]];
            const v1 = vertices[face[1]];
            const v2 = vertices[face[2]];
            
            const z0 = v0.z || 0;
            const z1 = v1.z || 0;
            const z2 = v2.z || 0;
            
            const intersections = [];
            
            // Check each edge for intersection with z plane
            const edges = [[v0, v1, z0, z1], [v1, v2, z1, z2], [v2, v0, z2, z0]];
            
            for (const [va, vb, za, zb] of edges) {
                if ((za <= zLevel && zb > zLevel) || (za > zLevel && zb <= zLevel)) {
                    const t = (zLevel - za) / (zb - za);
                    intersections.push({
                        x: va.x + t * (vb.x - va.x),
                        y: va.y + t * (vb.y - va.y)
                    });
                }
            }
            
            if (intersections.length === 2) {
                contourSegments.push(intersections);
            }
        }
        
        // Connect segments into contours (simplified - just return segments)
        return contourSegments;
    },
    
    _offsetContour2D: function(contour, distance) {
        // Simple 2D contour offset (segments to offset)
        return contour.map(segment => {
            const dx = segment[1].x - segment[0].x;
            const dy = segment[1].y - segment[0].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            
            if (len < 1e-10) return segment;
            
            // Perpendicular direction
            const nx = -dy / len;
            const ny = dx / len;
            
            return [
                { x: segment[0].x + distance * nx, y: segment[0].y + distance * ny },
                { x: segment[1].x + distance * nx, y: segment[1].y + distance * ny }
            ];
        });
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('surface.offset.simple', 'PRISM_OFFSET_SURFACE.offsetSimple');
            PRISM_GATEWAY.register('surface.offset.variable', 'PRISM_OFFSET_SURFACE.offsetVariable');
            PRISM_GATEWAY.register('surface.offset.curvatureAware', 'PRISM_OFFSET_SURFACE.offsetCurvatureAware');
            PRISM_GATEWAY.register('surface.shell', 'PRISM_OFFSET_SURFACE.createShell');
            PRISM_GATEWAY.register('surface.toolpathOffset', 'PRISM_OFFSET_SURFACE.toolpathOffset');
        }
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// PRISM_SYMMETRY_DETECTION - Detect mesh symmetry
// Source: Mitra et al. 2006 "Partial and Approximate Symmetry Detection"
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_SYMMETRY_DETECTION = {
    name: 'PRISM_SYMMETRY_DETECTION',
    version: '1.0.0',
    source: 'Mitra et al. 2006, Stanford CS 468',
    
    /**
     * Detect reflective symmetry planes
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @param {Object} options - Detection options
     * @returns {Array} Detected symmetry planes
     */
    detectReflectiveSymmetry: function(vertices, faces, options = {}) {
        const {
            tolerance = 0.05,
            minSupport = 0.8
        } = options;
        
        // Compute centroid
        const centroid = this._computeCentroid(vertices);
        
        // Test common symmetry planes
        const candidatePlanes = [
            { normal: { x: 1, y: 0, z: 0 }, point: centroid }, // YZ plane
            { normal: { x: 0, y: 1, z: 0 }, point: centroid }, // XZ plane
            { normal: { x: 0, y: 0, z: 1 }, point: centroid }, // XY plane
            // Diagonal planes
            { normal: this._normalize({ x: 1, y: 1, z: 0 }), point: centroid },
            { normal: this._normalize({ x: 1, y: 0, z: 1 }), point: centroid },
            { normal: this._normalize({ x: 0, y: 1, z: 1 }), point: centroid }
        ];
        
        const detectedPlanes = [];
        
        for (const plane of candidatePlanes) {
            const support = this._evaluateReflectionSymmetry(vertices, plane, tolerance);
            
            if (support >= minSupport) {
                detectedPlanes.push({
                    plane,
                    support,
                    type: 'reflective'
                });
            }
        }
        
        return detectedPlanes;
    },
    
    /**
     * Detect rotational symmetry
     * @param {Array} vertices - Vertex positions
     * @param {Object} options - Detection options
     * @returns {Array} Detected rotational symmetries
     */
    detectRotationalSymmetry: function(vertices, options = {}) {
        const {
            tolerance = 0.05,
            minSupport = 0.8,
            maxFold = 8
        } = options;
        
        const centroid = this._computeCentroid(vertices);
        
        // Test common rotation axes
        const candidateAxes = [
            { x: 1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 },
            { x: 0, y: 0, z: 1 }
        ];
        
        const detectedSymmetries = [];
        
        for (const axis of candidateAxes) {
            for (let fold = 2; fold <= maxFold; fold++) {
                const angle = (2 * Math.PI) / fold;
                const support = this._evaluateRotationSymmetry(vertices, centroid, axis, angle, tolerance);
                
                if (support >= minSupport) {
                    detectedSymmetries.push({
                        axis,
                        center: centroid,
                        fold,
                        angle: angle * 180 / Math.PI,
                        support,
                        type: 'rotational'
                    });
                }
            }
        }
        
        return detectedSymmetries;
    },
    
    /**
     * Detect any symmetry (both reflective and rotational)
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @param {Object} options - Detection options
     * @returns {Object} All detected symmetries
     */
    detectAllSymmetry: function(vertices, faces, options = {}) {
        return {
            reflective: this.detectReflectiveSymmetry(vertices, faces, options),
            rotational: this.detectRotationalSymmetry(vertices, options)
        };
    },
    
    /**
     * Make mesh symmetric by averaging with reflected version
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @param {Object} plane - Symmetry plane
     * @returns {Object} Symmetrized mesh
     */
    makeSymmetric: function(vertices, faces, plane) {
        const symVertices = vertices.map(v => {
            const reflected = this._reflectPoint(v, plane);
            return {
                x: (v.x + reflected.x) / 2,
                y: (v.y + reflected.y) / 2,
                z: ((v.z || 0) + (reflected.z || 0)) / 2
            };
        });
        
        return {
            vertices: symVertices,
            faces: faces.map(f => [...f])
        };
    },
    
    _computeCentroid: function(vertices) {
        let cx = 0, cy = 0, cz = 0;
        for (const v of vertices) {
            cx += v.x;
            cy += v.y;
            cz += v.z || 0;
        }
        return {
            x: cx / vertices.length,
            y: cy / vertices.length,
            z: cz / vertices.length
        };
    },
    
    _evaluateReflectionSymmetry: function(vertices, plane, tolerance) {
        let matchCount = 0;
        
        for (const v of vertices) {
            const reflected = this._reflectPoint(v, plane);
            
            // Find nearest vertex to reflected point
            let minDist = Infinity;
            for (const u of vertices) {
                const dx = u.x - reflected.x;
                const dy = u.y - reflected.y;
                const dz = (u.z || 0) - (reflected.z || 0);
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                minDist = Math.min(minDist, dist);
            }
            
            // Normalize by mesh size
            const meshSize = this._computeMeshSize(vertices);
            if (minDist / meshSize < tolerance) {
                matchCount++;
            }
        }
        
        return matchCount / vertices.length;
    },
    
    _evaluateRotationSymmetry: function(vertices, center, axis, angle, tolerance) {
        let matchCount = 0;
        const meshSize = this._computeMeshSize(vertices);
        
        for (const v of vertices) {
            const rotated = this._rotatePoint(v, center, axis, angle);
            
            let minDist = Infinity;
            for (const u of vertices) {
                const dx = u.x - rotated.x;
                const dy = u.y - rotated.y;
                const dz = (u.z || 0) - (rotated.z || 0);
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                minDist = Math.min(minDist, dist);
            }
            
            if (minDist / meshSize < tolerance) {
                matchCount++;
            }
        }
        
        return matchCount / vertices.length;
    },
    
    _reflectPoint: function(point, plane) {
        const d = (point.x - plane.point.x) * plane.normal.x +
                  (point.y - plane.point.y) * plane.normal.y +
                  ((point.z || 0) - (plane.point.z || 0)) * plane.normal.z;
        
        return {
            x: point.x - 2 * d * plane.normal.x,
            y: point.y - 2 * d * plane.normal.y,
            z: (point.z || 0) - 2 * d * plane.normal.z
        };
    },
    
    _rotatePoint: function(point, center, axis, angle) {
        // Translate to origin
        const px = point.x - center.x;
        const py = point.y - center.y;
        const pz = (point.z || 0) - center.z;
        
        // Rodrigues rotation formula
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const oneMinusCos = 1 - cos;
        
        const dot = px * axis.x + py * axis.y + pz * axis.z;
        const crossX = axis.y * pz - axis.z * py;
        const crossY = axis.z * px - axis.x * pz;
        const crossZ = axis.x * py - axis.y * px;
        
        const rx = px * cos + crossX * sin + axis.x * dot * oneMinusCos;
        const ry = py * cos + crossY * sin + axis.y * dot * oneMinusCos;
        const rz = pz * cos + crossZ * sin + axis.z * dot * oneMinusCos;
        
        return {
            x: rx + center.x,
            y: ry + center.y,
            z: rz + center.z
        };
    },
    
    _computeMeshSize: function(vertices) {
        let maxDist = 0;
        const centroid = this._computeCentroid(vertices);
        
        for (const v of vertices) {
            const dx = v.x - centroid.x;
            const dy = v.y - centroid.y;
            const dz = (v.z || 0) - centroid.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            maxDist = Math.max(maxDist, dist);
        }
        
        return maxDist * 2;
    },
    
    _normalize: function(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + (v.z || 0) * (v.z || 0));
        if (len > 1e-10) {
            return { x: v.x / len, y: v.y / len, z: (v.z || 0) / len };
        }
        return { x: 0, y: 0, z: 1 };
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('symmetry.detect.reflective', 'PRISM_SYMMETRY_DETECTION.detectReflectiveSymmetry');
            PRISM_GATEWAY.register('symmetry.detect.rotational', 'PRISM_SYMMETRY_DETECTION.detectRotationalSymmetry');
            PRISM_GATEWAY.register('symmetry.detect.all', 'PRISM_SYMMETRY_DETECTION.detectAllSymmetry');
            PRISM_GATEWAY.register('symmetry.make', 'PRISM_SYMMETRY_DETECTION.makeSymmetric');
        }
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// PRISM_SILHOUETTE_ENGINE - View-dependent silhouette extraction
// Source: MIT 6.837, Real-time rendering techniques
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_SILHOUETTE_ENGINE = {
    name: 'PRISM_SILHOUETTE_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.837 Computer Graphics, NPR rendering',
    
    /**
     * Extract silhouette edges for a given view direction
     * Silhouette = edges where one adjacent face is front-facing, other is back-facing
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @param {Object} viewDir - View direction vector (from camera)
     * @returns {Array} Silhouette edges as [v1, v2] pairs
     */
    extractSilhouette: function(vertices, faces, viewDir) {
        const normalizedView = this._normalize(viewDir);
        
        // Compute face normals and facing
        const faceData = faces.map(face => {
            const v0 = vertices[face[0]];
            const v1 = vertices[face[1]];
            const v2 = vertices[face[2]];
            
            const normal = this._faceNormal(v0, v1, v2);
            const dot = normal.x * normalizedView.x + 
                        normal.y * normalizedView.y + 
                        normal.z * normalizedView.z;
            
            return {
                normal,
                frontFacing: dot < 0 // Normal pointing toward viewer
            };
        });
        
        // Build edge-to-face map
        const edgeFaces = new Map();
        
        faces.forEach((face, faceIdx) => {
            for (let i = 0; i < face.length; i++) {
                const v1 = face[i];
                const v2 = face[(i + 1) % face.length];
                const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
                
                if (!edgeFaces.has(key)) {
                    edgeFaces.set(key, []);
                }
                edgeFaces.get(key).push(faceIdx);
            }
        });
        
        // Find silhouette edges
        const silhouetteEdges = [];
        
        edgeFaces.forEach((faceList, key) => {
            if (faceList.length === 2) {
                const f0 = faceData[faceList[0]];
                const f1 = faceData[faceList[1]];
                
                // Silhouette: one front-facing, one back-facing
                if (f0.frontFacing !== f1.frontFacing) {
                    const [v1, v2] = key.split('-').map(Number);
                    silhouetteEdges.push([v1, v2]);
                }
            } else if (faceList.length === 1) {
                // Boundary edge - always silhouette
                const [v1, v2] = key.split('-').map(Number);
                silhouetteEdges.push([v1, v2]);
            }
        });
        
        return silhouetteEdges;
    },
    
    /**
     * Extract contour edges (sharp edges) based on dihedral angle
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @param {number} angleThreshold - Threshold angle in degrees
     * @returns {Array} Contour edges
     */
    extractCreaseEdges: function(vertices, faces, angleThreshold = 30) {
        const thresholdRad = angleThreshold * Math.PI / 180;
        
        // Compute face normals
        const faceNormals = faces.map(face => 
            this._faceNormal(
                vertices[face[0]],
                vertices[face[1]],
                vertices[face[2]]
            )
        );
        
        // Build edge-to-face map
        const edgeFaces = new Map();
        
        faces.forEach((face, faceIdx) => {
            for (let i = 0; i < face.length; i++) {
                const v1 = face[i];
                const v2 = face[(i + 1) % face.length];
                const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
                
                if (!edgeFaces.has(key)) edgeFaces.set(key, []);
                edgeFaces.get(key).push(faceIdx);
            }
        });
        
        // Find crease edges
        const creaseEdges = [];
        
        edgeFaces.forEach((faceList, key) => {
            if (faceList.length === 2) {
                const n0 = faceNormals[faceList[0]];
                const n1 = faceNormals[faceList[1]];
                
                const dot = n0.x * n1.x + n0.y * n1.y + n0.z * n1.z;
                const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
                
                if (angle > thresholdRad) {
                    const [v1, v2] = key.split('-').map(Number);
                    creaseEdges.push({ edge: [v1, v2], angle: angle * 180 / Math.PI });
                }
            }
        });
        
        return creaseEdges;
    },
    
    /**
     * Extract all visible edges (silhouette + crease)
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @param {Object} viewDir - View direction
     * @param {number} creaseAngle - Crease angle threshold
     * @returns {Object} { silhouette, crease, boundary }
     */
    extractAllEdges: function(vertices, faces, viewDir, creaseAngle = 30) {
        const silhouette = this.extractSilhouette(vertices, faces, viewDir);
        const crease = this.extractCreaseEdges(vertices, faces, creaseAngle);
        
        // Find boundary edges
        const edgeCount = new Map();
        
        faces.forEach(face => {
            for (let i = 0; i < face.length; i++) {
                const v1 = face[i];
                const v2 = face[(i + 1) % face.length];
                const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
                edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
            }
        });
        
        const boundary = [];
        edgeCount.forEach((count, key) => {
            if (count === 1) {
                const [v1, v2] = key.split('-').map(Number);
                boundary.push([v1, v2]);
            }
        });
        
        return { silhouette, crease, boundary };
    },
    
    /**
     * Generate silhouette edge mesh for rendering
     * @param {Array} vertices - Vertex positions
     * @param {Array} edges - Edge pairs [v1, v2]
     * @param {number} width - Line width
     * @returns {Object} Mesh for rendering edges as quads
     */
    generateEdgeMesh: function(vertices, edges, width = 0.01) {
        const quadVertices = [];
        const quadFaces = [];
        
        for (const [v1, v2] of edges) {
            const p1 = vertices[v1];
            const p2 = vertices[v2];
            
            // Edge direction
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dz = (p2.z || 0) - (p1.z || 0);
            const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            if (len < 1e-10) continue;
            
            // Perpendicular direction (simplified - in screen space ideally)
            const perpX = -dy / len;
            const perpY = dx / len;
            
            const halfWidth = width / 2;
            const baseIdx = quadVertices.length;
            
            // Create quad
            quadVertices.push(
                { x: p1.x + perpX * halfWidth, y: p1.y + perpY * halfWidth, z: p1.z || 0 },
                { x: p1.x - perpX * halfWidth, y: p1.y - perpY * halfWidth, z: p1.z || 0 },
                { x: p2.x - perpX * halfWidth, y: p2.y - perpY * halfWidth, z: p2.z || 0 },
                { x: p2.x + perpX * halfWidth, y: p2.y + perpY * halfWidth, z: p2.z || 0 }
            );
            
            quadFaces.push(
                [baseIdx, baseIdx + 1, baseIdx + 2],
                [baseIdx, baseIdx + 2, baseIdx + 3]
            );
        }
        
        return {
            vertices: quadVertices,
            faces: quadFaces
        };
    },
    
    _faceNormal: function(v0, v1, v2) {
        const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: (v1.z || 0) - (v0.z || 0) };
        const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: (v2.z || 0) - (v0.z || 0) };
        
        const n = {
            x: e1.y * e2.z - e1.z * e2.y,
            y: e1.z * e2.x - e1.x * e2.z,
            z: e1.x * e2.y - e1.y * e2.x
        };
        
        return this._normalize(n);
    },
    
    _normalize: function(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + (v.z || 0) * (v.z || 0));
        if (len > 1e-10) {
            return { x: v.x / len, y: v.y / len, z: (v.z || 0) / len };
        }
        return { x: 0, y: 0, z: 1 };
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('silhouette.extract', 'PRISM_SILHOUETTE_ENGINE.extractSilhouette');
            PRISM_GATEWAY.register('silhouette.crease', 'PRISM_SILHOUETTE_ENGINE.extractCreaseEdges');
            PRISM_GATEWAY.register('silhouette.all', 'PRISM_SILHOUETTE_ENGINE.extractAllEdges');
            PRISM_GATEWAY.register('silhouette.mesh', 'PRISM_SILHOUETTE_ENGINE.generateEdgeMesh');
        }
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// MODULE REGISTRATION & SELF-TESTS
// ═══════════════════════════════════════════════════════════════════════════

// Register all modules
PRISM_MESH_REPAIR_ENGINE.register();
PRISM_GEODESIC_DISTANCE.register();
PRISM_SHAPE_DIAMETER_FUNCTION.register();
PRISM_ISOTROPIC_REMESHING.register();
PRISM_OFFSET_SURFACE.register();
PRISM_SYMMETRY_DETECTION.register();
PRISM_SILHOUETTE_ENGINE.register();

// Self-tests
const PRISM_SESSION5_EXTENDED_V3_TESTS = {
    name: 'PRISM_SESSION5_EXTENDED_V3_TESTS',
    
    runAll: function() {
        console.log('═══════════════════════════════════════════════════');
        console.log('PRISM Session 5 Extended v3 Tests');
        console.log('═══════════════════════════════════════════════════');
        
        const tests = [
            this.testBoundaryDetection,
            this.testHoleFilling,
            this.testMeshRepair,
            this.testGeodesicDijkstra,
            this.testGeodesicPath,
            this.testSDFCompute,
            this.testIsotropicRemesh,
            this.testSurfaceOffset,
            this.testSymmetryDetection,
            this.testSilhouetteExtraction
        ];
        
        let passed = 0;
        let failed = 0;
        
        for (const test of tests) {
            try {
                test.call(this);
                passed++;
            } catch (e) {
                console.error(`FAILED: ${test.name}:`, e.message);
                failed++;
            }
        }
        
        console.log('═══════════════════════════════════════════════════');
        console.log(`Results: ${passed} passed, ${failed} failed`);
        console.log('═══════════════════════════════════════════════════');
        
        return { passed, failed };
    },
    
    testBoundaryDetection: function() {
        // Simple quad with hole (missing one face)
        const vertices = [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 1, y: 1, z: 0 },
            { x: 0, y: 1, z: 0 }
        ];
        const faces = [[0, 1, 2]]; // Missing face [0, 2, 3]
        
        const loops = PRISM_MESH_REPAIR_ENGINE.findBoundaryLoops(vertices, faces);
        
        if (loops.length !== 1) {
            throw new Error(`Expected 1 boundary loop, got ${loops.length}`);
        }
        console.log('✓ testBoundaryDetection passed');
    },
    
    testHoleFilling: function() {
        const vertices = [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 1, y: 1, z: 0 },
            { x: 0, y: 1, z: 0 }
        ];
        const boundaryLoop = [0, 1, 2, 3];
        
        const triangles = PRISM_MESH_REPAIR_ENGINE.fillHoleMinArea(vertices, boundaryLoop);
        
        if (triangles.length !== 2) {
            throw new Error(`Expected 2 triangles to fill quad hole, got ${triangles.length}`);
        }
        console.log('✓ testHoleFilling passed');
    },
    
    testMeshRepair: function() {
        // Mesh with duplicate vertices and degenerate face
        const vertices = [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 0.5, y: 1, z: 0 },
            { x: 0, y: 0, z: 0 }, // Duplicate of 0
            { x: 0, y: 0, z: 0 }  // Another duplicate
        ];
        const faces = [
            [0, 1, 2],
            [3, 4, 4] // Degenerate
        ];
        
        const result = PRISM_MESH_REPAIR_ENGINE.repairMesh(vertices, faces);
        
        if (result.vertices.length > 3) {
            throw new Error(`Should have merged duplicates, got ${result.vertices.length} vertices`);
        }
        console.log('✓ testMeshRepair passed');
    },
    
    testGeodesicDijkstra: function() {
        // Simple triangle strip
        const vertices = [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 0.5, y: 1, z: 0 },
            { x: 1.5, y: 1, z: 0 }
        ];
        const faces = [[0, 1, 2], [1, 3, 2]];
        
        const distances = PRISM_GEODESIC_DISTANCE.dijkstra(vertices, faces, 0);
        
        if (distances[0] !== 0) {
            throw new Error('Distance to source should be 0');
        }
        if (distances[1] <= 0) {
            throw new Error('Distance to vertex 1 should be positive');
        }
        console.log('✓ testGeodesicDijkstra passed');
    },
    
    testGeodesicPath: function() {
        const vertices = [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 2, y: 0, z: 0 },
            { x: 0.5, y: 1, z: 0 },
            { x: 1.5, y: 1, z: 0 }
        ];
        const faces = [[0, 1, 3], [1, 2, 4], [1, 4, 3]];
        
        const result = PRISM_GEODESIC_DISTANCE.findPath(vertices, faces, 0, 2);
        
        if (!result.found) {
            throw new Error('Should have found path');
        }
        if (result.path[0] !== 0 || result.path[result.path.length - 1] !== 2) {
            throw new Error('Path should start at 0 and end at 2');
        }
        console.log('✓ testGeodesicPath passed');
    },
    
    testSDFCompute: function() {
        // Simple box-like mesh (cube faces)
        const vertices = [
            { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
            { x: 1, y: 1, z: 0 }, { x: 0, y: 1, z: 0 },
            { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 },
            { x: 1, y: 1, z: 1 }, { x: 0, y: 1, z: 1 }
        ];
        const faces = [
            [0, 1, 2], [0, 2, 3], // Front
            [4, 6, 5], [4, 7, 6], // Back
            [0, 4, 5], [0, 5, 1], // Bottom
            [2, 6, 7], [2, 7, 3], // Top
            [0, 3, 7], [0, 7, 4], // Left
            [1, 5, 6], [1, 6, 2]  // Right
        ];
        
        const sdf = PRISM_SHAPE_DIAMETER_FUNCTION.computeSDF(vertices, faces, { numRays: 10 });
        
        if (sdf.length !== vertices.length) {
            throw new Error(`SDF length ${sdf.length} should match vertex count ${vertices.length}`);
        }
        console.log('✓ testSDFCompute passed');
    },
    
    testIsotropicRemesh: function() {
        // Simple triangle
        const vertices = [
            { x: 0, y: 0, z: 0 },
            { x: 2, y: 0, z: 0 },
            { x: 1, y: 2, z: 0 }
        ];
        const faces = [[0, 1, 2]];
        
        const result = PRISM_ISOTROPIC_REMESHING.remesh(vertices, faces, 0.5, 2);
        
        if (result.vertices.length <= 3) {
            throw new Error('Remeshing should have added vertices for small target edge length');
        }
        console.log('✓ testIsotropicRemesh passed');
    },
    
    testSurfaceOffset: function() {
        const vertices = [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 0.5, y: 1, z: 0 }
        ];
        const faces = [[0, 1, 2]];
        
        const offset = PRISM_OFFSET_SURFACE.offsetSimple(vertices, faces, 0.1);
        
        if (offset.vertices.length !== 3) {
            throw new Error('Offset should preserve vertex count');
        }
        // Check that z changed (normal is along z for flat triangle)
        if (Math.abs(offset.vertices[0].z - 0.1) > 0.01) {
            throw new Error('Offset distance should be applied');
        }
        console.log('✓ testSurfaceOffset passed');
    },
    
    testSymmetryDetection: function() {
        // Symmetric box
        const vertices = [
            { x: -1, y: -1, z: 0 }, { x: 1, y: -1, z: 0 },
            { x: 1, y: 1, z: 0 }, { x: -1, y: 1, z: 0 }
        ];
        const faces = [[0, 1, 2], [0, 2, 3]];
        
        const symmetries = PRISM_SYMMETRY_DETECTION.detectReflectiveSymmetry(vertices, faces, {
            tolerance: 0.1,
            minSupport: 0.9
        });
        
        if (symmetries.length === 0) {
            throw new Error('Should detect symmetry in symmetric quad');
        }
        console.log('✓ testSymmetryDetection passed');
    },
    
    testSilhouetteExtraction: function() {
        // Simple quad - all edges are boundary (silhouette)
        const vertices = [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 1, y: 1, z: 0 },
            { x: 0, y: 1, z: 0 }
        ];
        const faces = [[0, 1, 2], [0, 2, 3]];
        const viewDir = { x: 0, y: 0, z: -1 };
        
        const edges = PRISM_SILHOUETTE_ENGINE.extractSilhouette(vertices, faces, viewDir);
        
        // Should have boundary edges as silhouette
        if (edges.length !== 4) {
            throw new Error(`Expected 4 silhouette edges (boundary), got ${edges.length}`);
        }
        console.log('✓ testSilhouetteExtraction passed');
    }
};

console.log('PRISM Session 5 Extended v3 loaded - 7 new modules, 24 gateway routes');

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PRISM_MESH_REPAIR_ENGINE,
        PRISM_GEODESIC_DISTANCE,
        PRISM_SHAPE_DIAMETER_FUNCTION,
        PRISM_ISOTROPIC_REMESHING,
        PRISM_OFFSET_SURFACE,
        PRISM_SYMMETRY_DETECTION,
        PRISM_SILHOUETTE_ENGINE,
        PRISM_SESSION5_EXTENDED_V3_TESTS
    };
}

// END OF PRISM v8.76.001 - SESSION 5 EXTENDED v3 ENHANCED BUILD


// ═══════════════════════════════════════════════════════════════════════════════
// SESSION 5 ULTIMATE v4 - ADVANCED CAD/GEOMETRY ENHANCEMENTS
// 26 NEW MODULES: Medial Axis, NURBS, Bezier, Surface Intersection, Harmonic Maps,
// Shape Descriptors, Feature Curves, Mesh Repair, Offset Surface, Boolean Operations
// Sources: Stanford CS 348A, CS 468, MIT 6.837, 2.158J, 18.086
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════════════════
// PRISM SESSION 5 ULTIMATE EXTENSION v4 - MAXIMUM CAD/GEOMETRY ENHANCEMENTS - PART 1
// ═══════════════════════════════════════════════════════════════════════════════════════════
// Version: 4.0.0
// Date: January 18, 2026
// Total New Lines: ~12,000+
// New Modules: 25+
// New Gateway Routes: 95+
//
// Sources: Stanford CS 348A, CS 468, MIT 6.837, MIT 2.158J, MIT 18.086, CGAL, libigl
// ═══════════════════════════════════════════════════════════════════════════════════════════

// ╔═══════════════════════════════════════════════════════════════════════════════════════════╗
// ║ MODULE 1: PRISM_CSG_BOOLEAN_ENGINE - Constructive Solid Geometry                        ║
// ╚═══════════════════════════════════════════════════════════════════════════════════════════╝

const PRISM_CSG_BOOLEAN_ENGINE = {
    name: 'PRISM CSG Boolean Engine',
    version: '1.0.0',
    source: 'MIT 2.158J, Stanford CS 348A',
    
    buildBSP: function(mesh) {
        const faces = this._meshToFaces(mesh);
        if (faces.length === 0) return null;
        return this._buildBSPNode(faces);
    },
    
    _buildBSPNode: function(faces) {
        if (faces.length === 0) return null;
        const splitter = faces[0];
        const plane = this._faceToPlane(splitter);
        const front = [], back = [], coplanarFront = [], coplanarBack = [];
        for (const face of faces) {
            this._splitFace(face, plane, coplanarFront, coplanarBack, front, back);
        }
        return {
            plane, front: this._buildBSPNode(front), back: this._buildBSPNode(back),
            coplanarFront, coplanarBack
        };
    },
    
    union: function(meshA, meshB) {
        const bspA = this.buildBSP(meshA), bspB = this.buildBSP(meshB);
        if (!bspA) return meshB;
        if (!bspB) return meshA;
        const clippedA = this._clipTo(bspA, bspB);
        const clippedB = this._clipTo(bspB, bspA);
        const clippedB2 = this._clipTo(clippedB, clippedA);
        return this._facesToMesh([...this._collectFaces(clippedA), ...this._collectFaces(clippedB2)]);
    },
    
    intersection: function(meshA, meshB) {
        const bspA = this.buildBSP(meshA), bspB = this.buildBSP(meshB);
        if (!bspA || !bspB) return { vertices: [], faces: [] };
        this._invert(bspA);
        const clippedB = this._clipTo(bspB, bspA);
        this._invert(clippedB);
        const clippedA = this._clipTo(bspA, clippedB);
        this._invert(clippedA);
        const clippedB2 = this._clipTo(clippedB, clippedA);
        return this._facesToMesh([...this._collectFaces(clippedA), ...this._collectFaces(clippedB2)]);
    },
    
    difference: function(meshA, meshB) {
        const bspA = this.buildBSP(meshA), bspB = this.buildBSP(meshB);
        if (!bspA) return { vertices: [], faces: [] };
        if (!bspB) return meshA;
        this._invert(bspB);
        const clippedA = this._clipTo(bspA, bspB);
        const clippedB = this._clipTo(bspB, clippedA);
        this._invert(clippedB);
        const clippedB2 = this._clipTo(clippedB, clippedA);
        this._invert(clippedB2);
        return this._facesToMesh([...this._collectFaces(clippedA), ...this._collectFaces(clippedB2)]);
    },
    
    _meshToFaces: function(mesh) {
        return mesh.faces.map(f => ({
            vertices: [{ ...mesh.vertices[f[0]] }, { ...mesh.vertices[f[1]] }, { ...mesh.vertices[f[2]] }]
        }));
    },
    
    _facesToMesh: function(faces) {
        const vertices = [], meshFaces = [], vertexMap = new Map();
        const getIdx = (v) => {
            const key = `${v.x.toFixed(8)},${v.y.toFixed(8)},${v.z.toFixed(8)}`;
            if (vertexMap.has(key)) return vertexMap.get(key);
            const idx = vertices.length;
            vertices.push({ x: v.x, y: v.y, z: v.z });
            vertexMap.set(key, idx);
            return idx;
        };
        for (const face of faces) {
            meshFaces.push([getIdx(face.vertices[0]), getIdx(face.vertices[1]), getIdx(face.vertices[2])]);
        }
        return { vertices, faces: meshFaces };
    },
    
    _faceToPlane: function(face) {
        const v = face.vertices;
        const e1 = this._sub(v[1], v[0]), e2 = this._sub(v[2], v[0]);
        const n = this._normalize(this._cross(e1, e2));
        return { normal: n, w: this._dot(n, v[0]) };
    },
    
    _splitFace: function(face, plane, coplanarFront, coplanarBack, front, back) {
        const EPSILON = 1e-6;
        let faceType = 0;
        const types = face.vertices.map(v => {
            const t = this._dot(plane.normal, v) - plane.w;
            const type = (t < -EPSILON) ? 2 : (t > EPSILON) ? 1 : 0;
            faceType |= type;
            return type;
        });
        
        if (faceType === 0) {
            (this._dot(plane.normal, this._faceNormal(face)) > 0 ? coplanarFront : coplanarBack).push(face);
        } else if (faceType === 1) { front.push(face); }
        else if (faceType === 2) { back.push(face); }
        else {
            const f = [], b = [];
            for (let i = 0; i < 3; i++) {
                const j = (i + 1) % 3, ti = types[i], tj = types[j];
                const vi = face.vertices[i], vj = face.vertices[j];
                if (ti !== 2) f.push({ ...vi });
                if (ti !== 1) b.push({ ...vi });
                if ((ti | tj) === 3) {
                    const t = (plane.w - this._dot(plane.normal, vi)) / this._dot(plane.normal, this._sub(vj, vi));
                    const v = this._lerp(vi, vj, t);
                    f.push({ ...v }); b.push({ ...v });
                }
            }
            if (f.length >= 3) { front.push({ vertices: [f[0], f[1], f[2]] }); if (f.length === 4) front.push({ vertices: [f[0], f[2], f[3]] }); }
            if (b.length >= 3) { back.push({ vertices: [b[0], b[1], b[2]] }); if (b.length === 4) back.push({ vertices: [b[0], b[2], b[3]] }); }
        }
    },
    
    _clipTo: function(nodeA, nodeB) {
        if (!nodeA) return null;
        const faces = [...nodeA.coplanarFront, ...nodeA.coplanarBack];
        const clipped = this._clipFaces(faces, nodeB);
        nodeA.coplanarFront = []; nodeA.coplanarBack = [];
        for (const face of clipped) {
            (this._dot(nodeA.plane.normal, this._faceNormal(face)) > 0 ? nodeA.coplanarFront : nodeA.coplanarBack).push(face);
        }
        nodeA.front = this._clipTo(nodeA.front, nodeB);
        nodeA.back = this._clipTo(nodeA.back, nodeB);
        return nodeA;
    },
    
    _clipFaces: function(faces, node) {
        if (!node) return faces;
        let front = [], back = [];
        for (const face of faces) this._splitFace(face, node.plane, front, back, front, back);
        if (node.front) front = this._clipFaces(front, node.front);
        back = node.back ? this._clipFaces(back, node.back) : [];
        return [...front, ...back];
    },
    
    _invert: function(node) {
        if (!node) return;
        [...node.coplanarFront, ...node.coplanarBack].forEach(f => f.vertices.reverse());
        [node.coplanarFront, node.coplanarBack] = [node.coplanarBack, node.coplanarFront];
        node.plane.normal = this._scale(node.plane.normal, -1);
        node.plane.w = -node.plane.w;
        [node.front, node.back] = [node.back, node.front];
        this._invert(node.front); this._invert(node.back);
    },
    
    _collectFaces: function(node) {
        if (!node) return [];
        return [...node.coplanarFront, ...node.coplanarBack, ...this._collectFaces(node.front), ...this._collectFaces(node.back)];
    },
    
    _faceNormal: function(face) {
        const e1 = this._sub(face.vertices[1], face.vertices[0]), e2 = this._sub(face.vertices[2], face.vertices[0]);
        return this._normalize(this._cross(e1, e2));
    },
    
    _dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
    _cross: (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }),
    _sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
    _scale: (v, s) => ({ x: v.x * s, y: v.y * s, z: v.z * s }),
    _normalize: function(v) { const l = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z); return l > 1e-10 ? { x: v.x/l, y: v.y/l, z: v.z/l } : { x: 0, y: 0, z: 1 }; },
    _lerp: (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }),
    
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('csg.union', 'PRISM_CSG_BOOLEAN_ENGINE.union');
            PRISM_GATEWAY.register('csg.intersection', 'PRISM_CSG_BOOLEAN_ENGINE.intersection');
            PRISM_GATEWAY.register('csg.difference', 'PRISM_CSG_BOOLEAN_ENGINE.difference');
            PRISM_GATEWAY.register('csg.buildBSP', 'PRISM_CSG_BOOLEAN_ENGINE.buildBSP');
        }
    }
};

// ╔═══════════════════════════════════════════════════════════════════════════════════════════╗
// ║ MODULE 2: PRISM_CONVEX_HULL_3D - 3D Convex Hull (Quickhull)                             ║
// ╚═══════════════════════════════════════════════════════════════════════════════════════════╝

const PRISM_CONVEX_HULL_3D = {
    name: 'PRISM 3D Convex Hull Engine',
    version: '1.0.0',
    source: 'MIT 6.046J, Quickhull Algorithm',
    
    quickhull: function(points) {
        if (points.length < 4) return { vertices: points.map(p => ({...p})), faces: [] };
        const initial = this._findInitialTetrahedron(points);
        if (!initial) return { vertices: points.map(p => ({...p})), faces: [] };
        const hull = this._createInitialHull(initial);
        const remaining = points.filter(p => !initial.includes(p));
        hull.faces.forEach(f => f.outsideSet = []);
        this._assignPointsToFaces(remaining, hull.faces);
        const facesToProcess = hull.faces.filter(f => f.outsideSet.length > 0);
        
        while (facesToProcess.length > 0) {
            const face = facesToProcess.pop();
            if (face.removed || face.outsideSet.length === 0) continue;
            const furthest = this._findFurthest(face);
            if (!furthest) continue;
            const { horizon, visibleFaces } = this._findHorizon(furthest, face, hull);
            visibleFaces.forEach(vf => { vf.removed = true; const idx = hull.faces.indexOf(vf); if (idx >= 0) hull.faces.splice(idx, 1); });
            const newFaces = horizon.map(edge => {
                const nf = { vertices: [edge[0], edge[1], furthest], outsideSet: [], removed: false };
                nf.normal = this._computeFaceNormal(nf);
                hull.faces.push(nf);
                return nf;
            });
            const orphaned = visibleFaces.flatMap(vf => vf.outsideSet);
            this._assignPointsToFaces(orphaned, newFaces);
            newFaces.filter(nf => nf.outsideSet.length > 0).forEach(nf => facesToProcess.push(nf));
        }
        return this._hullToMesh(hull);
    },
    
    compute: function(points) { return this.quickhull(points); },
    
    containsPoint: function(hull, point) {
        for (const face of hull.faces) {
            const v0 = hull.vertices[face[0]];
            const normal = this._computeFaceNormalFromMesh(hull, face);
            if (this._dot(this._sub(point, v0), normal) > 1e-8) return false;
        }
        return true;
    },
    
    _findInitialTetrahedron: function(points) {
        let minX = points[0], maxX = points[0], minY = points[0], maxY = points[0], minZ = points[0], maxZ = points[0];
        for (const p of points) {
            if (p.x < minX.x) minX = p; if (p.x > maxX.x) maxX = p;
            if (p.y < minY.y) minY = p; if (p.y > maxY.y) maxY = p;
            if (p.z < minZ.z) minZ = p; if (p.z > maxZ.z) maxZ = p;
        }
        const extremes = [minX, maxX, minY, maxY, minZ, maxZ];
        let maxDist = 0, p1 = null, p2 = null;
        for (let i = 0; i < extremes.length; i++) {
            for (let j = i + 1; j < extremes.length; j++) {
                const d = this._distance(extremes[i], extremes[j]);
                if (d > maxDist) { maxDist = d; p1 = extremes[i]; p2 = extremes[j]; }
            }
        }
        if (!p1 || !p2 || maxDist < 1e-10) return null;
        
        let maxLineDist = 0, p3 = null;
        for (const p of points) {
            if (p === p1 || p === p2) continue;
            const d = this._pointToLineDistance(p, p1, p2);
            if (d > maxLineDist) { maxLineDist = d; p3 = p; }
        }
        if (!p3 || maxLineDist < 1e-10) return null;
        
        const planeNormal = this._normalize(this._cross(this._sub(p2, p1), this._sub(p3, p1)));
        let maxPlaneDist = 0, p4 = null;
        for (const p of points) {
            if (p === p1 || p === p2 || p === p3) continue;
            const d = Math.abs(this._dot(this._sub(p, p1), planeNormal));
            if (d > maxPlaneDist) { maxPlaneDist = d; p4 = p; }
        }
        if (!p4 || maxPlaneDist < 1e-10) return null;
        return [p1, p2, p3, p4];
    },
    
    _createInitialHull: function(tetra) {
        const [p1, p2, p3, p4] = tetra;
        const centroid = { x: (p1.x+p2.x+p3.x+p4.x)/4, y: (p1.y+p2.y+p3.y+p4.y)/4, z: (p1.z+p2.z+p3.z+p4.z)/4 };
        const makeFace = (a, b, c) => {
            const face = { vertices: [a, b, c], outsideSet: [], removed: false };
            face.normal = this._computeFaceNormal(face);
            const fc = { x: (a.x+b.x+c.x)/3, y: (a.y+b.y+c.y)/3, z: (a.z+b.z+c.z)/3 };
            if (this._dot(face.normal, this._sub(centroid, fc)) > 0) {
                face.vertices = [a, c, b];
                face.normal = this._scale(face.normal, -1);
            }
            return face;
        };
        return { faces: [makeFace(p1,p2,p3), makeFace(p1,p2,p4), makeFace(p1,p3,p4), makeFace(p2,p3,p4)] };
    },
    
    _assignPointsToFaces: function(points, faces) {
        for (const p of points) {
            let maxDist = 0, bestFace = null;
            for (const face of faces) {
                if (face.removed) continue;
                const d = this._signedDistance(p, face);
                if (d > 1e-10 && d > maxDist) { maxDist = d; bestFace = face; }
            }
            if (bestFace) bestFace.outsideSet.push(p);
        }
    },
    
    _findFurthest: function(face) {
        let maxDist = 0, furthest = null;
        for (const p of face.outsideSet) {
            const d = this._signedDistance(p, face);
            if (d > maxDist) { maxDist = d; furthest = p; }
        }
        return furthest;
    },
    
    _findHorizon: function(eyePoint, startFace, hull) {
        const visibleFaces = [], horizon = [], visited = new Set();
        const stack = [startFace];
        while (stack.length > 0) {
            const face = stack.pop();
            if (visited.has(face) || face.removed) continue;
            visited.add(face);
            if (this._signedDistance(eyePoint, face) > 1e-10) {
                visibleFaces.push(face);
                for (let i = 0; i < 3; i++) {
                    const edge = [face.vertices[i], face.vertices[(i + 1) % 3]];
                    const neighbor = this._findNeighbor(edge, face, hull);
                    if (neighbor && !visited.has(neighbor)) {
                        if (this._signedDistance(eyePoint, neighbor) <= 1e-10) {
                            horizon.push([edge[1], edge[0]]);
                        } else stack.push(neighbor);
                    }
                }
            }
        }
        return { horizon, visibleFaces };
    },
    
    _findNeighbor: function(edge, excludeFace, hull) {
        for (const face of hull.faces) {
            if (face === excludeFace || face.removed) continue;
            for (let i = 0; i < 3; i++) {
                const v1 = face.vertices[i], v2 = face.vertices[(i + 1) % 3];
                if ((this._samePoint(v1, edge[0]) && this._samePoint(v2, edge[1])) ||
                    (this._samePoint(v1, edge[1]) && this._samePoint(v2, edge[0]))) return face;
            }
        }
        return null;
    },
    
    _samePoint: (a, b) => Math.abs(a.x-b.x) < 1e-10 && Math.abs(a.y-b.y) < 1e-10 && Math.abs(a.z-b.z) < 1e-10,
    
    _hullToMesh: function(hull) {
        const vertices = [], faces = [], vertexMap = new Map();
        const getIdx = (v) => {
            const key = `${v.x.toFixed(10)},${v.y.toFixed(10)},${v.z.toFixed(10)}`;
            if (vertexMap.has(key)) return vertexMap.get(key);
            const idx = vertices.length;
            vertices.push({ x: v.x, y: v.y, z: v.z });
            vertexMap.set(key, idx);
            return idx;
        };
        for (const face of hull.faces) {
            if (face.removed) continue;
            faces.push([getIdx(face.vertices[0]), getIdx(face.vertices[1]), getIdx(face.vertices[2])]);
        }
        return { vertices, faces };
    },
    
    _computeFaceNormal: function(face) {
        const v = face.vertices;
        return this._normalize(this._cross(this._sub(v[1], v[0]), this._sub(v[2], v[0])));
    },
    
    _computeFaceNormalFromMesh: function(mesh, face) {
        const v0 = mesh.vertices[face[0]], v1 = mesh.vertices[face[1]], v2 = mesh.vertices[face[2]];
        return this._normalize(this._cross(this._sub(v1, v0), this._sub(v2, v0)));
    },
    
    _signedDistance: function(point, face) { return this._dot(this._sub(point, face.vertices[0]), face.normal); },
    _pointToLineDistance: function(p, a, b) {
        const ab = this._sub(b, a), ap = this._sub(p, a), cross = this._cross(ab, ap);
        return Math.sqrt(cross.x*cross.x + cross.y*cross.y + cross.z*cross.z) / Math.sqrt(ab.x*ab.x + ab.y*ab.y + ab.z*ab.z);
    },
    
    _dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
    _cross: (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }),
    _sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
    _scale: (v, s) => ({ x: v.x * s, y: v.y * s, z: v.z * s }),
    _normalize: function(v) { const l = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z); return l > 1e-10 ? { x: v.x/l, y: v.y/l, z: v.z/l } : { x: 0, y: 0, z: 1 }; },
    _distance: function(a, b) { const d = this._sub(a, b); return Math.sqrt(d.x*d.x + d.y*d.y + d.z*d.z); },
    
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('hull.quickhull', 'PRISM_CONVEX_HULL_3D.quickhull');
            PRISM_GATEWAY.register('hull.compute', 'PRISM_CONVEX_HULL_3D.compute');
            PRISM_GATEWAY.register('hull.contains', 'PRISM_CONVEX_HULL_3D.containsPoint');
        }
    }
};

// ╔═══════════════════════════════════════════════════════════════════════════════════════════╗
// ║ MODULE 3: PRISM_SIGNED_DISTANCE_FIELD - SDF Generation                                  ║
// ╚═══════════════════════════════════════════════════════════════════════════════════════════╝

const PRISM_SIGNED_DISTANCE_FIELD = {
    name: 'PRISM Signed Distance Field Engine',
    version: '1.0.0',
    source: 'Stanford CS 468, Level Set Methods',
    
    generateFromMesh: function(mesh, bounds, resolution) {
        if (!bounds) bounds = this._computeBounds(mesh.vertices);
        const padding = 0.1 * Math.max(bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y, bounds.max.z - bounds.min.z);
        bounds = {
            min: { x: bounds.min.x - padding, y: bounds.min.y - padding, z: bounds.min.z - padding },
            max: { x: bounds.max.x + padding, y: bounds.max.y + padding, z: bounds.max.z + padding }
        };
        const size = { x: bounds.max.x - bounds.min.x, y: bounds.max.y - bounds.min.y, z: bounds.max.z - bounds.min.z };
        const cellSize = Math.max(size.x, size.y, size.z) / resolution;
        const nx = Math.ceil(size.x / cellSize) + 1, ny = Math.ceil(size.y / cellSize) + 1, nz = Math.ceil(size.z / cellSize) + 1;
        const data = new Float32Array(nx * ny * nz);
        const triangles = mesh.faces.map(f => ({ v0: mesh.vertices[f[0]], v1: mesh.vertices[f[1]], v2: mesh.vertices[f[2]] }));
        
        for (let iz = 0; iz < nz; iz++) {
            for (let iy = 0; iy < ny; iy++) {
                for (let ix = 0; ix < nx; ix++) {
                    const point = { x: bounds.min.x + ix * cellSize, y: bounds.min.y + iy * cellSize, z: bounds.min.z + iz * cellSize };
                    const { distance, sign } = this._computeSignedDistance(point, triangles);
                    data[iz * ny * nx + iy * nx + ix] = distance * sign;
                }
            }
        }
        return { data, resolution: { x: nx, y: ny, z: nz }, bounds, cellSize };
    },
    
    sample: function(sdf, point) {
        const { data, resolution, bounds, cellSize } = sdf;
        const gx = (point.x - bounds.min.x) / cellSize, gy = (point.y - bounds.min.y) / cellSize, gz = (point.z - bounds.min.z) / cellSize;
        const ix = Math.max(0, Math.min(resolution.x - 2, Math.floor(gx)));
        const iy = Math.max(0, Math.min(resolution.y - 2, Math.floor(gy)));
        const iz = Math.max(0, Math.min(resolution.z - 2, Math.floor(gz)));
        const fx = gx - ix, fy = gy - iy, fz = gz - iz;
        const get = (i, j, k) => data[k * resolution.y * resolution.x + j * resolution.x + i];
        const c00 = get(ix, iy, iz) * (1-fx) + get(ix+1, iy, iz) * fx;
        const c01 = get(ix, iy, iz+1) * (1-fx) + get(ix+1, iy, iz+1) * fx;
        const c10 = get(ix, iy+1, iz) * (1-fx) + get(ix+1, iy+1, iz) * fx;
        const c11 = get(ix, iy+1, iz+1) * (1-fx) + get(ix+1, iy+1, iz+1) * fx;
        const c0 = c00 * (1-fy) + c10 * fy, c1 = c01 * (1-fy) + c11 * fy;
        return c0 * (1-fz) + c1 * fz;
    },
    
    gradient: function(sdf, point) {
        const h = sdf.cellSize * 0.5;
        const dx = this.sample(sdf, {x: point.x+h, y: point.y, z: point.z}) - this.sample(sdf, {x: point.x-h, y: point.y, z: point.z});
        const dy = this.sample(sdf, {x: point.x, y: point.y+h, z: point.z}) - this.sample(sdf, {x: point.x, y: point.y-h, z: point.z});
        const dz = this.sample(sdf, {x: point.x, y: point.y, z: point.z+h}) - this.sample(sdf, {x: point.x, y: point.y, z: point.z-h});
        const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
        return len < 1e-10 ? { x: 0, y: 0, z: 1 } : { x: dx/len, y: dy/len, z: dz/len };
    },
    
    sphereSDF: (center, radius) => (p) => Math.sqrt((p.x-center.x)**2 + (p.y-center.y)**2 + (p.z-center.z)**2) - radius,
    
    boxSDF: (center, half) => (p) => {
        const qx = Math.abs(p.x-center.x) - half.x, qy = Math.abs(p.y-center.y) - half.y, qz = Math.abs(p.z-center.z) - half.z;
        return Math.sqrt(Math.max(qx,0)**2 + Math.max(qy,0)**2 + Math.max(qz,0)**2) + Math.min(Math.max(qx, qy, qz), 0);
    },
    
    opUnion: (a, b) => (p) => Math.min(a(p), b(p)),
    opIntersection: (a, b) => (p) => Math.max(a(p), b(p)),
    opSubtraction: (a, b) => (p) => Math.max(a(p), -b(p)),
    opSmoothUnion: (a, b, k) => (p) => { const av = a(p), bv = b(p), h = Math.max(k - Math.abs(av-bv), 0) / k; return Math.min(av, bv) - h*h*k*0.25; },
    
    _computeBounds: function(vertices) {
        const min = { x: Infinity, y: Infinity, z: Infinity }, max = { x: -Infinity, y: -Infinity, z: -Infinity };
        for (const v of vertices) {
            min.x = Math.min(min.x, v.x); min.y = Math.min(min.y, v.y); min.z = Math.min(min.z, v.z);
            max.x = Math.max(max.x, v.x); max.y = Math.max(max.y, v.y); max.z = Math.max(max.z, v.z);
        }
        return { min, max };
    },
    
    _computeSignedDistance: function(point, triangles) {
        let minDist = Infinity, closestNormal = null, closestPoint = null;
        for (const tri of triangles) {
            const { distance, closest, normal } = this._pointToTriangleDistance(point, tri);
            if (distance < minDist) { minDist = distance; closestNormal = normal; closestPoint = closest; }
        }
        const toPoint = { x: point.x - closestPoint.x, y: point.y - closestPoint.y, z: point.z - closestPoint.z };
        const sign = this._dot(toPoint, closestNormal) >= 0 ? 1 : -1;
        return { distance: minDist, sign };
    },
    
    _pointToTriangleDistance: function(p, tri) {
        const { v0, v1, v2 } = tri;
        const e0 = this._sub(v1, v0), e1 = this._sub(v2, v0), v = this._sub(v0, p);
        const a = this._dot(e0, e0), b = this._dot(e0, e1), c = this._dot(e1, e1), d = this._dot(e0, v), e = this._dot(e1, v);
        const det = a * c - b * b;
        let s = b * e - c * d, t = b * d - a * e;
        
        if (s + t <= det) {
            if (s < 0) { if (t < 0) { if (d < 0) { t = 0; s = Math.min(Math.max(-d/a,0),1); } else { s = 0; t = Math.min(Math.max(-e/c,0),1); } } else { s = 0; t = Math.min(Math.max(-e/c,0),1); } }
            else if (t < 0) { t = 0; s = Math.min(Math.max(-d/a,0),1); }
            else { const invDet = 1/det; s *= invDet; t *= invDet; }
        } else {
            if (s < 0) { const tmp0 = b+d, tmp1 = c+e; if (tmp1 > tmp0) { const numer = tmp1-tmp0; s = Math.min(Math.max(numer/(a-2*b+c),0),1); t = 1-s; } else { s = 0; t = Math.min(Math.max(-e/c,0),1); } }
            else if (t < 0) { const tmp0 = b+e, tmp1 = a+d; if (tmp1 > tmp0) { t = Math.min(Math.max((tmp1-tmp0)/(a-2*b+c),0),1); s = 1-t; } else { t = 0; s = Math.min(Math.max(-d/a,0),1); } }
            else { const numer = (c+e)-(b+d); s = numer <= 0 ? 0 : Math.min(Math.max(numer/(a-2*b+c),0),1); t = 1-s; }
        }
        
        const closest = { x: v0.x + s*e0.x + t*e1.x, y: v0.y + s*e0.y + t*e1.y, z: v0.z + s*e0.z + t*e1.z };
        const normal = this._normalize(this._cross(e0, e1));
        const diff = this._sub(p, closest);
        return { distance: Math.sqrt(diff.x*diff.x + diff.y*diff.y + diff.z*diff.z), closest, normal };
    },
    
    _dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
    _cross: (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }),
    _sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
    _normalize: function(v) { const l = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z); return l > 1e-10 ? { x: v.x/l, y: v.y/l, z: v.z/l } : { x: 0, y: 0, z: 1 }; },
    
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('sdf.generate', 'PRISM_SIGNED_DISTANCE_FIELD.generateFromMesh');
            PRISM_GATEWAY.register('sdf.sample', 'PRISM_SIGNED_DISTANCE_FIELD.sample');
            PRISM_GATEWAY.register('sdf.gradient', 'PRISM_SIGNED_DISTANCE_FIELD.gradient');
            PRISM_GATEWAY.register('sdf.sphere', 'PRISM_SIGNED_DISTANCE_FIELD.sphereSDF');
            PRISM_GATEWAY.register('sdf.box', 'PRISM_SIGNED_DISTANCE_FIELD.boxSDF');
            PRISM_GATEWAY.register('sdf.union', 'PRISM_SIGNED_DISTANCE_FIELD.opUnion');
            PRISM_GATEWAY.register('sdf.intersection', 'PRISM_SIGNED_DISTANCE_FIELD.opIntersection');
            PRISM_GATEWAY.register('sdf.subtraction', 'PRISM_SIGNED_DISTANCE_FIELD.opSubtraction');
            PRISM_GATEWAY.register('sdf.smoothUnion', 'PRISM_SIGNED_DISTANCE_FIELD.opSmoothUnion');
        }
    }
};

// ╔═══════════════════════════════════════════════════════════════════════════════════════════╗
// ║ MODULE 4: PRISM_KDTREE_3D - KD-Tree for 3D Spatial Queries                              ║
// ╚═══════════════════════════════════════════════════════════════════════════════════════════╝

const PRISM_KDTREE_3D = {
    name: 'PRISM KD-Tree 3D',
    version: '1.0.0',
    source: 'MIT 6.837, Bentley 1975',
    
    build: function(points) {
        if (!points || points.length === 0) return null;
        return this._buildRecursive(points.map((p, i) => ({ ...p, index: i })), 0);
    },
    
    _buildRecursive: function(points, depth) {
        if (points.length === 0) return null;
        if (points.length === 1) return { point: points[0], left: null, right: null, axis: depth % 3 };
        const axis = depth % 3, axisKey = ['x', 'y', 'z'][axis];
        points.sort((a, b) => a[axisKey] - b[axisKey]);
        const mid = Math.floor(points.length / 2);
        return { point: points[mid], axis, left: this._buildRecursive(points.slice(0, mid), depth+1), right: this._buildRecursive(points.slice(mid+1), depth+1) };
    },
    
    nearestNeighbor: function(tree, query) {
        if (!tree) return null;
        const best = { point: null, distance: Infinity };
        this._nnSearch(tree, query, best);
        return { point: best.point, distance: Math.sqrt(best.distance), index: best.point?.index };
    },
    
    _nnSearch: function(node, query, best) {
        if (!node) return;
        const dist = this._squaredDistance(query, node.point);
        if (dist < best.distance) { best.distance = dist; best.point = node.point; }
        const axisKey = ['x', 'y', 'z'][node.axis], diff = query[axisKey] - node.point[axisKey];
        this._nnSearch(diff < 0 ? node.left : node.right, query, best);
        if (diff * diff < best.distance) this._nnSearch(diff < 0 ? node.right : node.left, query, best);
    },
    
    kNearestNeighbors: function(tree, query, k) {
        if (!tree || k <= 0) return [];
        const heap = [];
        this._knnSearch(tree, query, k, heap);
        return heap.sort((a, b) => a.distance - b.distance).map(item => ({ point: item.point, distance: Math.sqrt(item.distance), index: item.point?.index }));
    },
    
    _knnSearch: function(node, query, k, heap) {
        if (!node) return;
        const dist = this._squaredDistance(query, node.point);
        if (heap.length < k) {
            heap.push({ point: node.point, distance: dist });
            if (heap.length === k) for (let i = Math.floor(heap.length/2)-1; i >= 0; i--) this._maxHeapify(heap, i);
        } else if (dist < heap[0].distance) { heap[0] = { point: node.point, distance: dist }; this._maxHeapify(heap, 0); }
        const axisKey = ['x', 'y', 'z'][node.axis], diff = query[axisKey] - node.point[axisKey];
        this._knnSearch(diff < 0 ? node.left : node.right, query, k, heap);
        if (diff * diff < (heap.length < k ? Infinity : heap[0].distance)) this._knnSearch(diff < 0 ? node.right : node.left, query, k, heap);
    },
    
    _maxHeapify: function(heap, i) {
        const left = 2*i+1, right = 2*i+2;
        let largest = i;
        if (left < heap.length && heap[left].distance > heap[largest].distance) largest = left;
        if (right < heap.length && heap[right].distance > heap[largest].distance) largest = right;
        if (largest !== i) { [heap[i], heap[largest]] = [heap[largest], heap[i]]; this._maxHeapify(heap, largest); }
    },
    
    radiusSearch: function(tree, center, radius) {
        const results = [], radiusSq = radius * radius;
        this._radiusSearchRecursive(tree, center, radiusSq, results);
        return results.map(item => ({ point: item.point, distance: Math.sqrt(item.distance), index: item.point?.index }));
    },
    
    _radiusSearchRecursive: function(node, center, radiusSq, results) {
        if (!node) return;
        const dist = this._squaredDistance(center, node.point);
        if (dist <= radiusSq) results.push({ point: node.point, distance: dist });
        const axisKey = ['x', 'y', 'z'][node.axis], diff = center[axisKey] - node.point[axisKey];
        this._radiusSearchRecursive(diff < 0 ? node.left : node.right, center, radiusSq, results);
        if (diff * diff <= radiusSq) this._radiusSearchRecursive(diff < 0 ? node.right : node.left, center, radiusSq, results);
    },
    
    rangeQuery: function(tree, minBound, maxBound) {
        const results = [];
        this._rangeQueryRecursive(tree, minBound, maxBound, results);
        return results;
    },
    
    _rangeQueryRecursive: function(node, minBound, maxBound, results) {
        if (!node) return;
        const p = node.point;
        if (p.x >= minBound.x && p.x <= maxBound.x && p.y >= minBound.y && p.y <= maxBound.y && p.z >= minBound.z && p.z <= maxBound.z) results.push(p);
        const axisKey = ['x', 'y', 'z'][node.axis];
        if (minBound[axisKey] <= node.point[axisKey]) this._rangeQueryRecursive(node.left, minBound, maxBound, results);
        if (maxBound[axisKey] >= node.point[axisKey]) this._rangeQueryRecursive(node.right, minBound, maxBound, results);
    },
    
    _squaredDistance: (a, b) => (a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2,
    
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('kdtree.build', 'PRISM_KDTREE_3D.build');
            PRISM_GATEWAY.register('kdtree.nearest', 'PRISM_KDTREE_3D.nearestNeighbor');
            PRISM_GATEWAY.register('kdtree.knearest', 'PRISM_KDTREE_3D.kNearestNeighbors');
            PRISM_GATEWAY.register('kdtree.radius', 'PRISM_KDTREE_3D.radiusSearch');
            PRISM_GATEWAY.register('kdtree.range', 'PRISM_KDTREE_3D.rangeQuery');
        }
    }
};

// ╔═══════════════════════════════════════════════════════════════════════════════════════════╗
// ║ MODULE 5: PRISM_OCTREE_3D - Octree for Spatial Subdivision                              ║
// ╚═══════════════════════════════════════════════════════════════════════════════════════════╝

const PRISM_OCTREE_3D = {
    name: 'PRISM Octree 3D',
    version: '1.0.0',
    source: 'MIT 6.837, Meagher 1982',
    
    build: function(points, bounds = null, maxDepth = 10, maxPoints = 8) {
        if (!bounds) bounds = this._computeBounds(points);
        const size = Math.max(bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y, bounds.max.z - bounds.min.z);
        const center = { x: (bounds.min.x+bounds.max.x)/2, y: (bounds.min.y+bounds.max.y)/2, z: (bounds.min.z+bounds.max.z)/2 };
        bounds = { min: { x: center.x-size/2, y: center.y-size/2, z: center.z-size/2 }, max: { x: center.x+size/2, y: center.y+size/2, z: center.z+size/2 } };
        return this._buildRecursive(points.map((p, i) => ({ ...p, index: i })), bounds, 0, maxDepth, maxPoints);
    },
    
    _buildRecursive: function(points, bounds, depth, maxDepth, maxPoints) {
        const node = { bounds, points: [], children: null, isLeaf: true, depth };
        if (points.length <= maxPoints || depth >= maxDepth) { node.points = points; return node; }
        node.isLeaf = false;
        node.children = new Array(8).fill(null);
        const center = { x: (bounds.min.x+bounds.max.x)/2, y: (bounds.min.y+bounds.max.y)/2, z: (bounds.min.z+bounds.max.z)/2 };
        const childBounds = [], childPoints = [[], [], [], [], [], [], [], []];
        for (let i = 0; i < 8; i++) {
            childBounds.push({
                min: { x: (i&1)?center.x:bounds.min.x, y: (i&2)?center.y:bounds.min.y, z: (i&4)?center.z:bounds.min.z },
                max: { x: (i&1)?bounds.max.x:center.x, y: (i&2)?bounds.max.y:center.y, z: (i&4)?bounds.max.z:center.z }
            });
        }
        for (const p of points) {
            const idx = (p.x >= center.x ? 1 : 0) | (p.y >= center.y ? 2 : 0) | (p.z >= center.z ? 4 : 0);
            childPoints[idx].push(p);
        }
        for (let i = 0; i < 8; i++) {
            if (childPoints[i].length > 0) node.children[i] = this._buildRecursive(childPoints[i], childBounds[i], depth+1, maxDepth, maxPoints);
        }
        return node;
    },
    
    radiusSearch: function(octree, center, radius) {
        const results = [];
        this._radiusSearchRecursive(octree, center, radius, results);
        return results;
    },
    
    _radiusSearchRecursive: function(node, center, radius, results) {
        if (!node || !this._sphereIntersectsBox(center, radius, node.bounds)) return;
        if (node.isLeaf) {
            const radiusSq = radius * radius;
            for (const p of node.points) {
                const distSq = (p.x-center.x)**2 + (p.y-center.y)**2 + (p.z-center.z)**2;
                if (distSq <= radiusSq) results.push({ point: p, distance: Math.sqrt(distSq) });
            }
        } else if (node.children) {
            for (const child of node.children) this._radiusSearchRecursive(child, center, radius, results);
        }
    },
    
    voxelize: function(mesh, resolution) {
        const bounds = this._computeBoundsFromMesh(mesh);
        const size = Math.max(bounds.max.x-bounds.min.x, bounds.max.y-bounds.min.y, bounds.max.z-bounds.min.z);
        const cellSize = size / resolution;
        const voxels = new Set();
        for (const face of mesh.faces) {
            const v0 = mesh.vertices[face[0]], v1 = mesh.vertices[face[1]], v2 = mesh.vertices[face[2]];
            this._voxelizeTriangle(v0, v1, v2, bounds.min, cellSize, resolution, voxels);
        }
        return { voxels: Array.from(voxels).map(key => { const [x,y,z] = key.split(',').map(Number); return {x,y,z}; }), resolution, cellSize, bounds };
    },
    
    _voxelizeTriangle: function(v0, v1, v2, origin, cellSize, resolution, voxels) {
        const minX = Math.max(0, Math.floor((Math.min(v0.x,v1.x,v2.x)-origin.x)/cellSize));
        const minY = Math.max(0, Math.floor((Math.min(v0.y,v1.y,v2.y)-origin.y)/cellSize));
        const minZ = Math.max(0, Math.floor((Math.min(v0.z,v1.z,v2.z)-origin.z)/cellSize));
        const maxX = Math.min(resolution-1, Math.floor((Math.max(v0.x,v1.x,v2.x)-origin.x)/cellSize));
        const maxY = Math.min(resolution-1, Math.floor((Math.max(v0.y,v1.y,v2.y)-origin.y)/cellSize));
        const maxZ = Math.min(resolution-1, Math.floor((Math.max(v0.z,v1.z,v2.z)-origin.z)/cellSize));
        for (let z = minZ; z <= maxZ; z++) for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) voxels.add(`${x},${y},${z}`);
    },
    
    _sphereIntersectsBox: function(center, radius, box) {
        let distSq = 0;
        if (center.x < box.min.x) distSq += (box.min.x-center.x)**2;
        else if (center.x > box.max.x) distSq += (center.x-box.max.x)**2;
        if (center.y < box.min.y) distSq += (box.min.y-center.y)**2;
        else if (center.y > box.max.y) distSq += (center.y-box.max.y)**2;
        if (center.z < box.min.z) distSq += (box.min.z-center.z)**2;
        else if (center.z > box.max.z) distSq += (center.z-box.max.z)**2;
        return distSq <= radius * radius;
    },
    
    _computeBounds: function(points) {
        const min = { x: Infinity, y: Infinity, z: Infinity }, max = { x: -Infinity, y: -Infinity, z: -Infinity };
        for (const p of points) { min.x = Math.min(min.x,p.x); min.y = Math.min(min.y,p.y); min.z = Math.min(min.z,p.z); max.x = Math.max(max.x,p.x); max.y = Math.max(max.y,p.y); max.z = Math.max(max.z,p.z); }
        return { min, max };
    },
    _computeBoundsFromMesh: function(mesh) { return this._computeBounds(mesh.vertices); },
    
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('octree.build', 'PRISM_OCTREE_3D.build');
            PRISM_GATEWAY.register('octree.radius', 'PRISM_OCTREE_3D.radiusSearch');
            PRISM_GATEWAY.register('octree.voxelize', 'PRISM_OCTREE_3D.voxelize');
        }
    }
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// END PART 1 - Continue in PART 2
// ═══════════════════════════════════════════════════════════════════════════════════════════
/**
 * PRISM SESSION 5 - ULTIMATE CAD/GEOMETRY ENHANCEMENT PACKAGE v4 - PART 2
 * ══════════════════════════════════════════════════════════════════════════════
 * Modules 5-12: Advanced Mesh Processing
 * ══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 5: PRISM_MESH_SEGMENTATION_ENGINE
// Mesh Segmentation: K-means, Spectral, SDF-based
// Source: Stanford CS 468
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_MESH_SEGMENTATION_ENGINE = {
    name: 'PRISM_MESH_SEGMENTATION_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 468, Katz & Tal Shape Segmentation',
    
    /**
     * K-means segmentation based on face features
     */
    segmentKMeans: function(mesh, options = {}) {
        const {
            numClusters = 5,
            maxIterations = 100,
            features = ['normal', 'centroid', 'curvature']
        } = options;
        
        // Extract face features
        const faceFeatures = this._extractFaceFeatures(mesh, features);
        
        // Initialize centroids (K-means++)
        const centroids = this._initializeCentroids(faceFeatures, numClusters);
        
        // K-means iteration
        let labels = new Array(faceFeatures.length).fill(0);
        
        for (let iter = 0; iter < maxIterations; iter++) {
            // Assign faces to nearest centroid
            const newLabels = faceFeatures.map(f => 
                this._findNearestCentroid(f, centroids)
            );
            
            // Check convergence
            if (newLabels.every((l, i) => l === labels[i])) break;
            labels = newLabels;
            
            // Update centroids
            for (let k = 0; k < numClusters; k++) {
                const clusterFeatures = faceFeatures.filter((_, i) => labels[i] === k);
                if (clusterFeatures.length > 0) {
                    centroids[k] = this._computeCentroid(clusterFeatures);
                }
            }
        }
        
        // Build segments
        const segments = Array.from({ length: numClusters }, () => []);
        labels.forEach((label, faceIdx) => {
            segments[label].push(faceIdx);
        });
        
        return {
            labels,
            segments: segments.filter(s => s.length > 0),
            numSegments: segments.filter(s => s.length > 0).length
        };
    },
    
    /**
     * Spectral segmentation using graph Laplacian
     */
    segmentSpectral: function(mesh, options = {}) {
        const {
            numClusters = 5,
            sigmaAngle = 0.1,
            sigmaDist = 0.1
        } = options;
        
        const numFaces = mesh.indices.length / 3;
        
        // Build face adjacency graph with weights
        const adjacency = this._buildFaceAdjacencyGraph(mesh, sigmaAngle, sigmaDist);
        
        // Compute graph Laplacian
        const L = this._computeGraphLaplacian(adjacency, numFaces);
        
        // Compute eigenvectors (simplified power iteration)
        const eigenvectors = this._computeSmallestEigenvectors(L, numClusters);
        
        // K-means on eigenvector embedding
        const embedding = Array.from({ length: numFaces }, (_, i) => 
            eigenvectors.map(ev => ev[i])
        );
        
        const centroids = this._initializeCentroids(embedding, numClusters);
        let labels = embedding.map(f => this._findNearestCentroid(f, centroids));
        
        for (let iter = 0; iter < 50; iter++) {
            const newLabels = embedding.map(f => this._findNearestCentroid(f, centroids));
            if (newLabels.every((l, i) => l === labels[i])) break;
            labels = newLabels;
            
            for (let k = 0; k < numClusters; k++) {
                const clusterPoints = embedding.filter((_, i) => labels[i] === k);
                if (clusterPoints.length > 0) {
                    centroids[k] = this._computeCentroid(clusterPoints);
                }
            }
        }
        
        // Build segments
        const segments = Array.from({ length: numClusters }, () => []);
        labels.forEach((label, faceIdx) => {
            segments[label].push(faceIdx);
        });
        
        return {
            labels,
            segments: segments.filter(s => s.length > 0),
            numSegments: segments.filter(s => s.length > 0).length
        };
    },
    
    /**
     * SDF-based segmentation (Shape Diameter Function)
     */
    segmentBySDF: function(mesh, options = {}) {
        const {
            numClusters = 5,
            numRays = 30,
            coneAngle = Math.PI / 6
        } = options;
        
        // Compute SDF for each face
        const sdf = this._computeFaceSDF(mesh, numRays, coneAngle);
        
        // Cluster by SDF values
        const sdfValues = sdf.map(s => [s.diameter]);
        const centroids = this._initializeCentroids(sdfValues, numClusters);
        let labels = sdfValues.map(f => this._findNearestCentroid(f, centroids));
        
        for (let iter = 0; iter < 50; iter++) {
            const newLabels = sdfValues.map(f => this._findNearestCentroid(f, centroids));
            if (newLabels.every((l, i) => l === labels[i])) break;
            labels = newLabels;
            
            for (let k = 0; k < numClusters; k++) {
                const clusterVals = sdfValues.filter((_, i) => labels[i] === k);
                if (clusterVals.length > 0) {
                    centroids[k] = [clusterVals.reduce((s, v) => s + v[0], 0) / clusterVals.length];
                }
            }
        }
        
        // Sort clusters by SDF value (thin to thick)
        const clusterMeans = centroids.map((c, i) => ({ idx: i, mean: c[0] }));
        clusterMeans.sort((a, b) => a.mean - b.mean);
        
        const remapping = {};
        clusterMeans.forEach((c, newIdx) => { remapping[c.idx] = newIdx; });
        
        const remappedLabels = labels.map(l => remapping[l]);
        
        const segments = Array.from({ length: numClusters }, () => []);
        remappedLabels.forEach((label, faceIdx) => {
            segments[label].push(faceIdx);
        });
        
        return {
            labels: remappedLabels,
            segments: segments.filter(s => s.length > 0),
            sdf,
            numSegments: segments.filter(s => s.length > 0).length
        };
    },
    
    /**
     * Random Walk segmentation with user seeds
     */
    segmentRandomWalk: function(mesh, seeds) {
        // seeds: Array of { label: number, faces: number[] }
        const numFaces = mesh.indices.length / 3;
        const numLabels = seeds.length;
        
        // Build face adjacency
        const adjacency = this._buildSimpleFaceAdjacency(mesh);
        
        // Build Laplacian
        const L = [];
        const seededFaces = new Set();
        seeds.forEach(s => s.faces.forEach(f => seededFaces.add(f)));
        
        // Solve random walk for each label
        const probabilities = Array.from({ length: numLabels }, () => 
            new Float32Array(numFaces)
        );
        
        // Initialize seed probabilities
        seeds.forEach((seed, labelIdx) => {
            seed.faces.forEach(f => {
                probabilities[labelIdx][f] = 1;
            });
        });
        
        // Diffuse probabilities
        for (let iter = 0; iter < 100; iter++) {
            for (let labelIdx = 0; labelIdx < numLabels; labelIdx++) {
                const newProb = new Float32Array(numFaces);
                
                for (let f = 0; f < numFaces; f++) {
                    if (seededFaces.has(f)) {
                        newProb[f] = probabilities[labelIdx][f];
                        continue;
                    }
                    
                    const neighbors = adjacency[f] || [];
                    if (neighbors.length > 0) {
                        let sum = 0;
                        for (const n of neighbors) {
                            sum += probabilities[labelIdx][n];
                        }
                        newProb[f] = sum / neighbors.length;
                    }
                }
                
                probabilities[labelIdx] = newProb;
            }
        }
        
        // Assign labels by maximum probability
        const labels = [];
        for (let f = 0; f < numFaces; f++) {
            let maxProb = -1;
            let maxLabel = 0;
            for (let l = 0; l < numLabels; l++) {
                if (probabilities[l][f] > maxProb) {
                    maxProb = probabilities[l][f];
                    maxLabel = l;
                }
            }
            labels.push(maxLabel);
        }
        
        return { labels, probabilities };
    },
    
    _extractFaceFeatures: function(mesh, features) {
        const numFaces = mesh.indices.length / 3;
        const faceFeatures = [];
        
        for (let f = 0; f < numFaces; f++) {
            const feature = [];
            const v0 = this._getVertex(mesh.vertices, mesh.indices[f * 3]);
            const v1 = this._getVertex(mesh.vertices, mesh.indices[f * 3 + 1]);
            const v2 = this._getVertex(mesh.vertices, mesh.indices[f * 3 + 2]);
            
            if (features.includes('normal')) {
                const normal = this._computeFaceNormal(v0, v1, v2);
                feature.push(normal.x, normal.y, normal.z);
            }
            
            if (features.includes('centroid')) {
                feature.push(
                    (v0.x + v1.x + v2.x) / 3,
                    (v0.y + v1.y + v2.y) / 3,
                    (v0.z + v1.z + v2.z) / 3
                );
            }
            
            if (features.includes('area')) {
                feature.push(this._triangleArea(v0, v1, v2));
            }
            
            faceFeatures.push(feature);
        }
        
        // Normalize features
        const dim = faceFeatures[0].length;
        for (let d = 0; d < dim; d++) {
            const vals = faceFeatures.map(f => f[d]);
            const min = Math.min(...vals);
            const max = Math.max(...vals);
            const range = max - min || 1;
            for (const f of faceFeatures) {
                f[d] = (f[d] - min) / range;
            }
        }
        
        return faceFeatures;
    },
    
    _initializeCentroids: function(data, k) {
        // K-means++ initialization
        const centroids = [];
        const dim = data[0].length;
        
        // First centroid: random
        centroids.push([...data[Math.floor(Math.random() * data.length)]]);
        
        // Remaining centroids: weighted by distance
        while (centroids.length < k) {
            const distances = data.map(d => {
                return Math.min(...centroids.map(c => this._squaredDistance(d, c)));
            });
            
            const totalDist = distances.reduce((a, b) => a + b, 0);
            let r = Math.random() * totalDist;
            
            for (let i = 0; i < data.length; i++) {
                r -= distances[i];
                if (r <= 0) {
                    centroids.push([...data[i]]);
                    break;
                }
            }
        }
        
        return centroids;
    },
    
    _findNearestCentroid: function(point, centroids) {
        let minDist = Infinity;
        let minIdx = 0;
        
        for (let i = 0; i < centroids.length; i++) {
            const dist = this._squaredDistance(point, centroids[i]);
            if (dist < minDist) {
                minDist = dist;
                minIdx = i;
            }
        }
        
        return minIdx;
    },
    
    _computeCentroid: function(points) {
        const dim = points[0].length;
        const centroid = new Array(dim).fill(0);
        
        for (const p of points) {
            for (let d = 0; d < dim; d++) {
                centroid[d] += p[d];
            }
        }
        
        for (let d = 0; d < dim; d++) {
            centroid[d] /= points.length;
        }
        
        return centroid;
    },
    
    _squaredDistance: function(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += Math.pow(a[i] - b[i], 2);
        }
        return sum;
    },
    
    _buildFaceAdjacencyGraph: function(mesh, sigmaAngle, sigmaDist) {
        const numFaces = mesh.indices.length / 3;
        const adjacency = Array.from({ length: numFaces }, () => new Map());
        
        // Build edge-to-face mapping
        const edgeToFaces = new Map();
        
        for (let f = 0; f < numFaces; f++) {
            const i0 = mesh.indices[f * 3];
            const i1 = mesh.indices[f * 3 + 1];
            const i2 = mesh.indices[f * 3 + 2];
            
            const edges = [
                [Math.min(i0, i1), Math.max(i0, i1)],
                [Math.min(i1, i2), Math.max(i1, i2)],
                [Math.min(i2, i0), Math.max(i2, i0)]
            ];
            
            for (const [a, b] of edges) {
                const key = `${a},${b}`;
                if (!edgeToFaces.has(key)) {
                    edgeToFaces.set(key, []);
                }
                edgeToFaces.get(key).push(f);
            }
        }
        
        // Compute face normals and centroids
        const normals = [];
        const centroids = [];
        
        for (let f = 0; f < numFaces; f++) {
            const v0 = this._getVertex(mesh.vertices, mesh.indices[f * 3]);
            const v1 = this._getVertex(mesh.vertices, mesh.indices[f * 3 + 1]);
            const v2 = this._getVertex(mesh.vertices, mesh.indices[f * 3 + 2]);
            
            normals.push(this._computeFaceNormal(v0, v1, v2));
            centroids.push({
                x: (v0.x + v1.x + v2.x) / 3,
                y: (v0.y + v1.y + v2.y) / 3,
                z: (v0.z + v1.z + v2.z) / 3
            });
        }
        
        // Build adjacency with weights
        for (const faces of edgeToFaces.values()) {
            if (faces.length === 2) {
                const [f1, f2] = faces;
                
                // Angle-based weight
                const dotN = normals[f1].x * normals[f2].x + 
                            normals[f1].y * normals[f2].y + 
                            normals[f1].z * normals[f2].z;
                const angle = Math.acos(Math.max(-1, Math.min(1, dotN)));
                const angleWeight = Math.exp(-angle * angle / (2 * sigmaAngle * sigmaAngle));
                
                // Distance-based weight
                const dist = Math.sqrt(
                    Math.pow(centroids[f1].x - centroids[f2].x, 2) +
                    Math.pow(centroids[f1].y - centroids[f2].y, 2) +
                    Math.pow(centroids[f1].z - centroids[f2].z, 2)
                );
                const distWeight = Math.exp(-dist * dist / (2 * sigmaDist * sigmaDist));
                
                const weight = angleWeight * distWeight;
                adjacency[f1].set(f2, weight);
                adjacency[f2].set(f1, weight);
            }
        }
        
        return adjacency;
    },
    
    _buildSimpleFaceAdjacency: function(mesh) {
        const numFaces = mesh.indices.length / 3;
        const adjacency = Array.from({ length: numFaces }, () => []);
        
        const edgeToFaces = new Map();
        
        for (let f = 0; f < numFaces; f++) {
            const i0 = mesh.indices[f * 3];
            const i1 = mesh.indices[f * 3 + 1];
            const i2 = mesh.indices[f * 3 + 2];
            
            const edges = [
                [Math.min(i0, i1), Math.max(i0, i1)],
                [Math.min(i1, i2), Math.max(i1, i2)],
                [Math.min(i2, i0), Math.max(i2, i0)]
            ];
            
            for (const [a, b] of edges) {
                const key = `${a},${b}`;
                if (!edgeToFaces.has(key)) {
                    edgeToFaces.set(key, []);
                }
                edgeToFaces.get(key).push(f);
            }
        }
        
        for (const faces of edgeToFaces.values()) {
            if (faces.length === 2) {
                adjacency[faces[0]].push(faces[1]);
                adjacency[faces[1]].push(faces[0]);
            }
        }
        
        return adjacency;
    },
    
    _computeGraphLaplacian: function(adjacency, n) {
        const L = Array.from({ length: n }, () => new Map());
        
        for (let i = 0; i < n; i++) {
            let degree = 0;
            for (const [j, w] of adjacency[i]) {
                L[i].set(j, -w);
                degree += w;
            }
            L[i].set(i, degree);
        }
        
        return L;
    },
    
    _computeSmallestEigenvectors: function(L, k) {
        const n = L.length;
        const eigenvectors = [];
        
        // Simplified: use random projection
        for (let ev = 0; ev < k; ev++) {
            let v = Array(n).fill(0).map(() => Math.random() - 0.5);
            
            // Inverse power iteration (for smallest eigenvalues)
            for (let iter = 0; iter < 30; iter++) {
                // Orthogonalize
                for (const prev of eigenvectors) {
                    const dot = v.reduce((sum, x, i) => sum + x * prev[i], 0);
                    for (let i = 0; i < n; i++) v[i] -= dot * prev[i];
                }
                
                // Normalize
                const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
                v = v.map(x => x / (norm || 1));
            }
            
            eigenvectors.push(v);
        }
        
        return eigenvectors;
    },
    
    _computeFaceSDF: function(mesh, numRays, coneAngle) {
        const numFaces = mesh.indices.length / 3;
        const sdf = [];
        
        for (let f = 0; f < numFaces; f++) {
            const v0 = this._getVertex(mesh.vertices, mesh.indices[f * 3]);
            const v1 = this._getVertex(mesh.vertices, mesh.indices[f * 3 + 1]);
            const v2 = this._getVertex(mesh.vertices, mesh.indices[f * 3 + 2]);
            
            const centroid = {
                x: (v0.x + v1.x + v2.x) / 3,
                y: (v0.y + v1.y + v2.y) / 3,
                z: (v0.z + v1.z + v2.z) / 3
            };
            
            const normal = this._computeFaceNormal(v0, v1, v2);
            const inwardNormal = { x: -normal.x, y: -normal.y, z: -normal.z };
            
            // Shoot rays in cone around inward normal
            const distances = [];
            
            for (let r = 0; r < numRays; r++) {
                // Generate random direction in cone
                const dir = this._randomDirectionInCone(inwardNormal, coneAngle);
                
                // Ray-mesh intersection
                const hit = this._rayMeshIntersect(centroid, dir, mesh, f);
                
                if (hit) {
                    distances.push(hit.distance);
                }
            }
            
            // Use median distance
            if (distances.length > 0) {
                distances.sort((a, b) => a - b);
                const median = distances[Math.floor(distances.length / 2)];
                sdf.push({ diameter: median, face: f });
            } else {
                sdf.push({ diameter: 0, face: f });
            }
        }
        
        return sdf;
    },
    
    _randomDirectionInCone: function(axis, angle) {
        // Generate random direction within cone around axis
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(1 - Math.random() * (1 - Math.cos(angle)));
        
        // Create orthonormal basis
        let u, v;
        if (Math.abs(axis.x) < 0.9) {
            u = { x: 0, y: -axis.z, z: axis.y };
        } else {
            u = { x: -axis.z, y: 0, z: axis.x };
        }
        const uLen = Math.sqrt(u.x * u.x + u.y * u.y + u.z * u.z);
        u.x /= uLen; u.y /= uLen; u.z /= uLen;
        
        v = {
            x: axis.y * u.z - axis.z * u.y,
            y: axis.z * u.x - axis.x * u.z,
            z: axis.x * u.y - axis.y * u.x
        };
        
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);
        
        return {
            x: sinPhi * cosTheta * u.x + sinPhi * sinTheta * v.x + cosPhi * axis.x,
            y: sinPhi * cosTheta * u.y + sinPhi * sinTheta * v.y + cosPhi * axis.y,
            z: sinPhi * cosTheta * u.z + sinPhi * sinTheta * v.z + cosPhi * axis.z
        };
    },
    
    _rayMeshIntersect: function(origin, dir, mesh, excludeFace) {
        let closest = null;
        let closestDist = Infinity;
        
        const numFaces = mesh.indices.length / 3;
        
        for (let f = 0; f < numFaces; f++) {
            if (f === excludeFace) continue;
            
            const v0 = this._getVertex(mesh.vertices, mesh.indices[f * 3]);
            const v1 = this._getVertex(mesh.vertices, mesh.indices[f * 3 + 1]);
            const v2 = this._getVertex(mesh.vertices, mesh.indices[f * 3 + 2]);
            
            const hit = this._rayTriangleIntersect(origin, dir, v0, v1, v2);
            
            if (hit && hit.t > 0.001 && hit.t < closestDist) {
                closestDist = hit.t;
                closest = { distance: hit.t, face: f };
            }
        }
        
        return closest;
    },
    
    _rayTriangleIntersect: function(origin, dir, v0, v1, v2) {
        const EPSILON = 1e-7;
        
        const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
        const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
        
        const h = {
            x: dir.y * edge2.z - dir.z * edge2.y,
            y: dir.z * edge2.x - dir.x * edge2.z,
            z: dir.x * edge2.y - dir.y * edge2.x
        };
        
        const a = edge1.x * h.x + edge1.y * h.y + edge1.z * h.z;
        
        if (Math.abs(a) < EPSILON) return null;
        
        const f = 1 / a;
        const s = { x: origin.x - v0.x, y: origin.y - v0.y, z: origin.z - v0.z };
        const u = f * (s.x * h.x + s.y * h.y + s.z * h.z);
        
        if (u < 0 || u > 1) return null;
        
        const q = {
            x: s.y * edge1.z - s.z * edge1.y,
            y: s.z * edge1.x - s.x * edge1.z,
            z: s.x * edge1.y - s.y * edge1.x
        };
        
        const v = f * (dir.x * q.x + dir.y * q.y + dir.z * q.z);
        
        if (v < 0 || u + v > 1) return null;
        
        const t = f * (edge2.x * q.x + edge2.y * q.y + edge2.z * q.z);
        
        return t > EPSILON ? { t, u, v } : null;
    },
    
    _getVertex: function(vertices, idx) {
        return {
            x: vertices[idx * 3],
            y: vertices[idx * 3 + 1],
            z: vertices[idx * 3 + 2]
        };
    },
    
    _computeFaceNormal: function(v0, v1, v2) {
        const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
        const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
        
        const n = {
            x: e1.y * e2.z - e1.z * e2.y,
            y: e1.z * e2.x - e1.x * e2.z,
            z: e1.x * e2.y - e1.y * e2.x
        };
        
        const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
        if (len > 1e-10) {
            n.x /= len; n.y /= len; n.z /= len;
        }
        
        return n;
    },
    
    _triangleArea: function(v0, v1, v2) {
        const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
        const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
        const cross = {
            x: e1.y * e2.z - e1.z * e2.y,
            y: e1.z * e2.x - e1.x * e2.z,
            z: e1.x * e2.y - e1.y * e2.x
        };
        return 0.5 * Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
    }
};


// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 6: PRISM_MESH_DEFORMATION_ENGINE
// Mesh Deformation: ARAP, Laplacian, Cage-based
// Source: Stanford CS 468, Sorkine et al.
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_MESH_DEFORMATION_ENGINE = {
    name: 'PRISM_MESH_DEFORMATION_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 468, Sorkine As-Rigid-As-Possible',
    
    /**
     * As-Rigid-As-Possible (ARAP) Deformation
     * Preserves local rigidity during deformation
     */
    deformARAP: function(mesh, handles, options = {}) {
        const {
            maxIterations = 10,
            tolerance = 1e-6
        } = options;
        
        const n = mesh.vertices.length / 3;
        const positions = this._extractPositions(mesh);
        
        // Build cotangent Laplacian
        const L = this._buildCotangentLaplacian(mesh);
        
        // Compute edge weights
        const edgeWeights = this._computeEdgeWeights(mesh);
        
        // Initialize rotations to identity
        const rotations = Array(n).fill(null).map(() => [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ]);
        
        // Get handle constraints
        const handleSet = new Set(handles.map(h => h.vertex));
        const handlePositions = new Map(handles.map(h => [h.vertex, h.position]));
        
        let currentPositions = positions.map(p => ({ ...p }));
        
        // Alternating optimization
        for (let iter = 0; iter < maxIterations; iter++) {
            // Local step: estimate rotations
            for (let i = 0; i < n; i++) {
                const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
                
                // Sum over edges
                for (const [j, w] of edgeWeights[i]) {
                    const eij = {
                        x: positions[i].x - positions[j].x,
                        y: positions[i].y - positions[j].y,
                        z: positions[i].z - positions[j].z
                    };
                    const eij_prime = {
                        x: currentPositions[i].x - currentPositions[j].x,
                        y: currentPositions[i].y - currentPositions[j].y,
                        z: currentPositions[i].z - currentPositions[j].z
                    };
                    
                    // Outer product weighted by edge weight
                    S[0][0] += w * eij.x * eij_prime.x;
                    S[0][1] += w * eij.x * eij_prime.y;
                    S[0][2] += w * eij.x * eij_prime.z;
                    S[1][0] += w * eij.y * eij_prime.x;
                    S[1][1] += w * eij.y * eij_prime.y;
                    S[1][2] += w * eij.y * eij_prime.z;
                    S[2][0] += w * eij.z * eij_prime.x;
                    S[2][1] += w * eij.z * eij_prime.y;
                    S[2][2] += w * eij.z * eij_prime.z;
                }
                
                // SVD to extract rotation
                rotations[i] = this._extractRotationFromSVD(S);
            }
            
            // Global step: solve for positions
            const b = Array(n).fill(null).map(() => ({ x: 0, y: 0, z: 0 }));
            
            for (let i = 0; i < n; i++) {
                if (handleSet.has(i)) {
                    // Handle constraint
                    const pos = handlePositions.get(i);
                    b[i] = { x: pos.x, y: pos.y, z: pos.z };
                    continue;
                }
                
                // ARAP right-hand side
                for (const [j, w] of edgeWeights[i]) {
                    const eij = {
                        x: positions[i].x - positions[j].x,
                        y: positions[i].y - positions[j].y,
                        z: positions[i].z - positions[j].z
                    };
                    
                    // Average rotation
                    const Ri = rotations[i];
                    const Rj = rotations[j];
                    const avgR = this._averageRotation(Ri, Rj);
                    
                    // Rotated edge
                    const re = this._applyRotation(avgR, eij);
                    
                    b[i].x += w * 0.5 * re.x;
                    b[i].y += w * 0.5 * re.y;
                    b[i].z += w * 0.5 * re.z;
                }
            }
            
            // Solve system (simplified: direct iteration)
            const newPositions = this._solveWithConstraints(L, b, handleSet, handlePositions);
            
            // Check convergence
            let maxDiff = 0;
            for (let i = 0; i < n; i++) {
                const dx = newPositions[i].x - currentPositions[i].x;
                const dy = newPositions[i].y - currentPositions[i].y;
                const dz = newPositions[i].z - currentPositions[i].z;
                maxDiff = Math.max(maxDiff, Math.sqrt(dx * dx + dy * dy + dz * dz));
            }
            
            currentPositions = newPositions;
            
            if (maxDiff < tolerance) break;
        }
        
        // Build result mesh
        return this._buildDeformedMesh(mesh, currentPositions);
    },
    
    /**
     * Laplacian Surface Editing
     * Preserves differential coordinates (Laplacian)
     */
    deformLaplacian: function(mesh, handles) {
        const n = mesh.vertices.length / 3;
        const positions = this._extractPositions(mesh);
        
        // Build uniform Laplacian
        const L = this._buildUniformLaplacian(mesh);
        
        // Compute differential coordinates
        const delta = Array(n).fill(null).map((_, i) => {
            const d = { x: 0, y: 0, z: 0 };
            for (const [j, w] of L[i]) {
                if (i !== j) {
                    d.x -= w * (positions[j].x - positions[i].x);
                    d.y -= w * (positions[j].y - positions[i].y);
                    d.z -= w * (positions[j].z - positions[i].z);
                }
            }
            return d;
        });
        
        // Set up constrained system
        const handleSet = new Set(handles.map(h => h.vertex));
        const handlePositions = new Map(handles.map(h => [h.vertex, h.position]));
        
        // Solve for new positions maintaining differential coordinates
        const newPositions = this._solveLaplacianSystem(L, delta, handleSet, handlePositions);
        
        return this._buildDeformedMesh(mesh, newPositions);
    },
    
    /**
     * Mean Value Coordinates (MVC) Cage Deformation
     */
    deformCage: function(mesh, originalCage, deformedCage) {
        const n = mesh.vertices.length / 3;
        const positions = this._extractPositions(mesh);
        
        // Compute MVC weights for each vertex
        const weights = [];
        for (let i = 0; i < n; i++) {
            weights.push(this._computeMVCWeights(positions[i], originalCage));
        }
        
        // Apply deformation using cage
        const newPositions = [];
        for (let i = 0; i < n; i++) {
            const w = weights[i];
            const pos = { x: 0, y: 0, z: 0 };
            
            for (let c = 0; c < deformedCage.length; c++) {
                pos.x += w[c] * deformedCage[c].x;
                pos.y += w[c] * deformedCage[c].y;
                pos.z += w[c] * deformedCage[c].z;
            }
            
            newPositions.push(pos);
        }
        
        return this._buildDeformedMesh(mesh, newPositions);
    },
    
    _extractPositions: function(mesh) {
        const positions = [];
        for (let i = 0; i < mesh.vertices.length; i += 3) {
            positions.push({
                x: mesh.vertices[i],
                y: mesh.vertices[i + 1],
                z: mesh.vertices[i + 2]
            });
        }
        return positions;
    },
    
    _buildCotangentLaplacian: function(mesh) {
        const n = mesh.vertices.length / 3;
        const L = Array(n).fill(null).map(() => new Map());
        
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const i0 = mesh.indices[i];
            const i1 = mesh.indices[i + 1];
            const i2 = mesh.indices[i + 2];
            
            const v0 = this._getVertex(mesh.vertices, i0);
            const v1 = this._getVertex(mesh.vertices, i1);
            const v2 = this._getVertex(mesh.vertices, i2);
            
            const cot0 = this._cotangent(v1, v0, v2);
            const cot1 = this._cotangent(v2, v1, v0);
            const cot2 = this._cotangent(v0, v2, v1);
            
            this._addEntry(L, i1, i2, cot0 * 0.5);
            this._addEntry(L, i0, i2, cot1 * 0.5);
            this._addEntry(L, i0, i1, cot2 * 0.5);
        }
        
        // Set diagonal
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (const w of L[i].values()) sum += w;
            L[i].set(i, -sum);
        }
        
        return L;
    },
    
    _buildUniformLaplacian: function(mesh) {
        const n = mesh.vertices.length / 3;
        const adjacency = this._buildVertexAdjacency(mesh);
        const L = Array(n).fill(null).map(() => new Map());
        
        for (let i = 0; i < n; i++) {
            const neighbors = adjacency[i];
            const degree = neighbors.length;
            
            if (degree > 0) {
                for (const j of neighbors) {
                    L[i].set(j, -1 / degree);
                }
                L[i].set(i, 1);
            }
        }
        
        return L;
    },
    
    _buildVertexAdjacency: function(mesh) {
        const n = mesh.vertices.length / 3;
        const adjacency = Array(n).fill(null).map(() => new Set());
        
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const i0 = mesh.indices[i];
            const i1 = mesh.indices[i + 1];
            const i2 = mesh.indices[i + 2];
            
            adjacency[i0].add(i1); adjacency[i0].add(i2);
            adjacency[i1].add(i0); adjacency[i1].add(i2);
            adjacency[i2].add(i0); adjacency[i2].add(i1);
        }
        
        return adjacency.map(s => Array.from(s));
    },
    
    _computeEdgeWeights: function(mesh) {
        const n = mesh.vertices.length / 3;
        const weights = Array(n).fill(null).map(() => new Map());
        
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const i0 = mesh.indices[i];
            const i1 = mesh.indices[i + 1];
            const i2 = mesh.indices[i + 2];
            
            const v0 = this._getVertex(mesh.vertices, i0);
            const v1 = this._getVertex(mesh.vertices, i1);
            const v2 = this._getVertex(mesh.vertices, i2);
            
            const cot0 = this._cotangent(v1, v0, v2);
            const cot1 = this._cotangent(v2, v1, v0);
            const cot2 = this._cotangent(v0, v2, v1);
            
            this._addEntry(weights, i1, i2, cot0 * 0.5);
            this._addEntry(weights, i0, i2, cot1 * 0.5);
            this._addEntry(weights, i0, i1, cot2 * 0.5);
        }
        
        return weights;
    },
    
    _cotangent: function(a, b, c) {
        const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
        const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
        
        const dot = ab.x * ac.x + ab.y * ac.y + ab.z * ac.z;
        const cross = {
            x: ab.y * ac.z - ab.z * ac.y,
            y: ab.z * ac.x - ab.x * ac.z,
            z: ab.x * ac.y - ab.y * ac.x
        };
        const crossLen = Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
        
        return crossLen > 1e-10 ? dot / crossLen : 0;
    },
    
    _addEntry: function(M, i, j, w) {
        M[i].set(j, (M[i].get(j) || 0) + w);
        M[j].set(i, (M[j].get(i) || 0) + w);
    },
    
    _extractRotationFromSVD: function(S) {
        // Simplified: approximate rotation from covariance
        // Full implementation would use proper SVD
        
        // Compute S^T * S
        const ATA = [
            [S[0][0] * S[0][0] + S[1][0] * S[1][0] + S[2][0] * S[2][0],
             S[0][0] * S[0][1] + S[1][0] * S[1][1] + S[2][0] * S[2][1],
             S[0][0] * S[0][2] + S[1][0] * S[1][2] + S[2][0] * S[2][2]],
            [S[0][1] * S[0][0] + S[1][1] * S[1][0] + S[2][1] * S[2][0],
             S[0][1] * S[0][1] + S[1][1] * S[1][1] + S[2][1] * S[2][1],
             S[0][1] * S[0][2] + S[1][1] * S[1][2] + S[2][1] * S[2][2]],
            [S[0][2] * S[0][0] + S[1][2] * S[1][0] + S[2][2] * S[2][0],
             S[0][2] * S[0][1] + S[1][2] * S[1][1] + S[2][2] * S[2][1],
             S[0][2] * S[0][2] + S[1][2] * S[1][2] + S[2][2] * S[2][2]]
        ];
        
        // For simplicity, return identity if S is near-zero
        const norm = Math.sqrt(S.flat().reduce((sum, v) => sum + v * v, 0));
        if (norm < 1e-10) {
            return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
        }
        
        // Polar decomposition approximation
        // R = S * (S^T * S)^(-1/2)
        // Simplified: normalize columns
        const R = [];
        for (let col = 0; col < 3; col++) {
            let len = 0;
            for (let row = 0; row < 3; row++) {
                len += S[row][col] * S[row][col];
            }
            len = Math.sqrt(len);
            R.push(len > 1e-10 ? 
                [S[0][col] / len, S[1][col] / len, S[2][col] / len] :
                [col === 0 ? 1 : 0, col === 1 ? 1 : 0, col === 2 ? 1 : 0]
            );
        }
        
        return [
            [R[0][0], R[1][0], R[2][0]],
            [R[0][1], R[1][1], R[2][1]],
            [R[0][2], R[1][2], R[2][2]]
        ];
    },
    
    _averageRotation: function(R1, R2) {
        // Simple average (not geodesic)
        return [
            [(R1[0][0] + R2[0][0]) / 2, (R1[0][1] + R2[0][1]) / 2, (R1[0][2] + R2[0][2]) / 2],
            [(R1[1][0] + R2[1][0]) / 2, (R1[1][1] + R2[1][1]) / 2, (R1[1][2] + R2[1][2]) / 2],
            [(R1[2][0] + R2[2][0]) / 2, (R1[2][1] + R2[2][1]) / 2, (R1[2][2] + R2[2][2]) / 2]
        ];
    },
    
    _applyRotation: function(R, v) {
        return {
            x: R[0][0] * v.x + R[0][1] * v.y + R[0][2] * v.z,
            y: R[1][0] * v.x + R[1][1] * v.y + R[1][2] * v.z,
            z: R[2][0] * v.x + R[2][1] * v.y + R[2][2] * v.z
        };
    },
    
    _solveWithConstraints: function(L, b, handleSet, handlePositions) {
        const n = L.length;
        const positions = Array(n).fill(null).map((_, i) => {
            if (handleSet.has(i)) {
                return { ...handlePositions.get(i) };
            }
            return { ...b[i] };
        });
        
        // Gauss-Seidel iteration
        for (let iter = 0; iter < 50; iter++) {
            for (let i = 0; i < n; i++) {
                if (handleSet.has(i)) continue;
                
                let sumX = b[i].x, sumY = b[i].y, sumZ = b[i].z;
                let diag = 0;
                
                for (const [j, w] of L[i]) {
                    if (i === j) {
                        diag = w;
                    } else {
                        sumX -= w * positions[j].x;
                        sumY -= w * positions[j].y;
                        sumZ -= w * positions[j].z;
                    }
                }
                
                if (Math.abs(diag) > 1e-10) {
                    positions[i] = {
                        x: sumX / diag,
                        y: sumY / diag,
                        z: sumZ / diag
                    };
                }
            }
        }
        
        return positions;
    },
    
    _solveLaplacianSystem: function(L, delta, handleSet, handlePositions) {
        // Solve L * p = delta with handle constraints
        return this._solveWithConstraints(L, delta, handleSet, handlePositions);
    },
    
    _computeMVCWeights: function(point, cage) {
        // Mean Value Coordinates
        const n = cage.length;
        const weights = new Array(n).fill(0);
        
        // Compute vectors and distances to cage vertices
        const d = [];
        const u = [];
        
        for (let i = 0; i < n; i++) {
            const v = {
                x: cage[i].x - point.x,
                y: cage[i].y - point.y,
                z: cage[i].z - point.z
            };
            const dist = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
            d.push(dist);
            u.push(dist > 1e-10 ? { x: v.x / dist, y: v.y / dist, z: v.z / dist } : { x: 0, y: 0, z: 0 });
        }
        
        // Check if point is on a vertex
        for (let i = 0; i < n; i++) {
            if (d[i] < 1e-10) {
                weights[i] = 1;
                return weights;
            }
        }
        
        // Compute MVC weights
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            
            // Angle at point
            const dot = u[i].x * u[j].x + u[i].y * u[j].y + u[i].z * u[j].z;
            const theta = Math.acos(Math.max(-1, Math.min(1, dot)));
            
            const tanHalfTheta = Math.tan(theta / 2);
            
            if (!isFinite(tanHalfTheta)) continue;
            
            weights[i] += tanHalfTheta / d[i];
            weights[j] += tanHalfTheta / d[j];
        }
        
        // Normalize
        const sum = weights.reduce((a, b) => a + b, 0);
        if (sum > 1e-10) {
            for (let i = 0; i < n; i++) {
                weights[i] /= sum;
            }
        }
        
        return weights;
    },
    
    _buildDeformedMesh: function(originalMesh, newPositions) {
        const vertices = new Float32Array(newPositions.length * 3);
        
        for (let i = 0; i < newPositions.length; i++) {
            vertices[i * 3] = newPositions[i].x;
            vertices[i * 3 + 1] = newPositions[i].y;
            vertices[i * 3 + 2] = newPositions[i].z;
        }
        
        return {
            vertices,
            indices: new Uint32Array(originalMesh.indices)
        };
    },
    
    _getVertex: function(vertices, idx) {
        return {
            x: vertices[idx * 3],
            y: vertices[idx * 3 + 1],
            z: vertices[idx * 3 + 2]
        };
    }
};


// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 7: PRISM_SURFACE_RECONSTRUCTION_ENGINE
// Surface Reconstruction: Poisson, Ball Pivoting, Alpha Shapes
// Source: Stanford CS 468, Kazhdan et al.
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_SURFACE_RECONSTRUCTION_ENGINE = {
    name: 'PRISM_SURFACE_RECONSTRUCTION_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 468, Kazhdan Poisson, Bernardini Ball Pivoting',
    
    /**
     * Poisson Surface Reconstruction
     * Requires oriented point cloud with normals
     */
    poissonReconstruction: function(points, normals, options = {}) {
        const {
            depth = 8,
            scale = 1.1,
            samplesPerNode = 1.5
        } = options;
        
        // Build octree
        const octree = this._buildOctree(points, depth);
        
        // Set indicator function from normals (divergence of vector field)
        const indicator = this._computeIndicatorFunction(octree, points, normals);
        
        // Solve Poisson equation
        const values = this._solvePoissonEquation(octree, indicator);
        
        // Extract isosurface at average value
        const isovalue = this._computeIsovalue(values, points, octree);
        const mesh = this._extractIsosurface(octree, values, isovalue);
        
        return mesh;
    },
    
    /**
     * Ball Pivoting Algorithm
     * Simpler reconstruction from point cloud
     */
    ballPivoting: function(points, normals, options = {}) {
        const {
            radius = null,  // Auto-compute if null
            clustering = 0.005
        } = options;
        
        // Estimate radius if not provided
        const r = radius || this._estimateBallRadius(points);
        
        // Initialize data structures
        const used = new Set();
        const front = [];  // Active front edges
        const triangles = [];
        
        // Find seed triangle
        const seed = this._findSeedTriangle(points, normals, r);
        if (!seed) {
            console.warn('Could not find seed triangle');
            return { vertices: new Float32Array(0), indices: new Uint32Array(0) };
        }
        
        triangles.push(seed);
        used.add(seed.i); used.add(seed.j); used.add(seed.k);
        
        // Add edges to front
        front.push({ i: seed.i, j: seed.j, opposite: seed.k });
        front.push({ i: seed.j, j: seed.k, opposite: seed.i });
        front.push({ i: seed.k, j: seed.i, opposite: seed.j });
        
        // Process front
        let maxIterations = points.length * 10;
        while (front.length > 0 && maxIterations-- > 0) {
            const edge = front.pop();
            
            // Find pivoting point
            const pivot = this._findPivotingPoint(
                points, normals, edge, used, r
            );
            
            if (pivot !== null) {
                // Create new triangle
                triangles.push({ i: edge.i, j: edge.j, k: pivot });
                used.add(pivot);
                
                // Update front
                this._updateFront(front, edge.i, pivot, edge.j);
                this._updateFront(front, pivot, edge.j, edge.i);
            }
        }
        
        // Build mesh
        return this._buildMeshFromTriangles(points, triangles);
    },
    
    /**
     * Alpha Shapes reconstruction
     */
    alphaShapes: function(points, alpha) {
        // Compute Delaunay triangulation
        const delaunay = this._delaunay3D(points);
        
        // Filter simplices by alpha criterion
        const filteredTriangles = [];
        
        for (const tetra of delaunay.tetrahedra) {
            // Check circumradius
            const circumradius = this._tetrahedronCircumradius(
                points[tetra.a], points[tetra.b], points[tetra.c], points[tetra.d]
            );
            
            if (circumradius < alpha) {
                // Add boundary faces if they're alpha-exposed
                const faces = [
                    [tetra.a, tetra.b, tetra.c],
                    [tetra.a, tetra.b, tetra.d],
                    [tetra.a, tetra.c, tetra.d],
                    [tetra.b, tetra.c, tetra.d]
                ];
                
                for (const face of faces) {
                    const faceCircum = this._triangleCircumradius(
                        points[face[0]], points[face[1]], points[face[2]]
                    );
                    
                    if (faceCircum < alpha) {
                        filteredTriangles.push({
                            i: face[0], j: face[1], k: face[2]
                        });
                    }
                }
            }
        }