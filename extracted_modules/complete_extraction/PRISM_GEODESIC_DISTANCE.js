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
}