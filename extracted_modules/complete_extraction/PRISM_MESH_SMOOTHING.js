const PRISM_MESH_SMOOTHING = {
    name: 'PRISM_MESH_SMOOTHING',
    version: '1.0.0',
    source: 'Stanford CS 468, Taubin SIGGRAPH 1995',
    description: 'Mesh smoothing algorithms for noise reduction and surface processing',
    
    /**
     * Laplacian smoothing (uniform weights)
     * Classic mesh smoothing - moves vertices toward neighbor centroid
     * @param {Array} vertices - Mesh vertices
     * @param {Array} faces - Mesh faces
     * @param {number} lambda - Smoothing factor (0-1)
     * @param {number} iterations - Number of iterations
     * @param {boolean} preserveBoundary - Keep boundary vertices fixed
     */
    laplacianSmooth: function(vertices, faces, lambda = 0.5, iterations = 1, preserveBoundary = true) {
        let V = vertices.map(v => ({ ...v }));
        const adj = this._buildAdjacency(V.length, faces);
        const boundary = preserveBoundary ? this._findBoundaryVertices(V.length, faces) : new Set();
        
        for (let iter = 0; iter < iterations; iter++) {
            const newV = V.map(v => ({ ...v }));
            
            for (let i = 0; i < V.length; i++) {
                if (boundary.has(i)) continue;
                
                const neighbors = adj[i];
                if (neighbors.length === 0) continue;
                
                // Compute Laplacian (centroid of neighbors - vertex)
                const centroid = { x: 0, y: 0, z: 0 };
                for (const ni of neighbors) {
                    centroid.x += V[ni].x;
                    centroid.y += V[ni].y;
                    centroid.z += V[ni].z;
                }
                centroid.x /= neighbors.length;
                centroid.y /= neighbors.length;
                centroid.z /= neighbors.length;
                
                // Move toward centroid
                newV[i] = {
                    x: V[i].x + lambda * (centroid.x - V[i].x),
                    y: V[i].y + lambda * (centroid.y - V[i].y),
                    z: V[i].z + lambda * (centroid.z - V[i].z)
                };
            }
            
            V = newV;
        }
        
        return V;
    },
    
    /**
     * Taubin smoothing (volume-preserving)
     * Alternates positive and negative Laplacian steps
     * Source: Taubin, "A Signal Processing Approach to Fair Surface Design" (1995)
     * @param {Array} vertices - Mesh vertices
     * @param {Array} faces - Mesh faces
     * @param {number} lambda - Positive step factor
     * @param {number} mu - Negative step factor (usually -lambda - small epsilon)
     * @param {number} iterations - Number of iteration pairs
     */
    taubinSmooth: function(vertices, faces, lambda = 0.5, mu = -0.53, iterations = 5) {
        let V = vertices.map(v => ({ ...v }));
        const adj = this._buildAdjacency(V.length, faces);
        const boundary = this._findBoundaryVertices(V.length, faces);
        
        for (let iter = 0; iter < iterations; iter++) {
            // Positive step (shrinking)
            V = this._laplacianStep(V, adj, boundary, lambda);
            // Negative step (inflation to preserve volume)
            V = this._laplacianStep(V, adj, boundary, mu);
        }
        
        return V;
    },
    
    _laplacianStep: function(vertices, adj, boundary, factor) {
        const newV = vertices.map(v => ({ ...v }));
        
        for (let i = 0; i < vertices.length; i++) {
            if (boundary.has(i)) continue;
            
            const neighbors = adj[i];
            if (neighbors.length === 0) continue;
            
            const centroid = { x: 0, y: 0, z: 0 };
            for (const ni of neighbors) {
                centroid.x += vertices[ni].x;
                centroid.y += vertices[ni].y;
                centroid.z += vertices[ni].z;
            }
            centroid.x /= neighbors.length;
            centroid.y /= neighbors.length;
            centroid.z /= neighbors.length;
            
            newV[i] = {
                x: vertices[i].x + factor * (centroid.x - vertices[i].x),
                y: vertices[i].y + factor * (centroid.y - vertices[i].y),
                z: vertices[i].z + factor * (centroid.z - vertices[i].z)
            };
        }
        
        return newV;
    },
    
    /**
     * Cotangent Laplacian smoothing
     * Uses geometric weights based on triangle angles
     * Source: Meyer et al., "Discrete Differential-Geometry Operators" (2002)
     */
    cotangentSmooth: function(vertices, faces, lambda = 0.5, iterations = 1) {
        let V = vertices.map(v => ({ ...v }));
        const boundary = this._findBoundaryVertices(V.length, faces);
        
        for (let iter = 0; iter < iterations; iter++) {
            const newV = V.map(v => ({ ...v }));
            const cotangentWeights = this._computeCotangentWeights(V, faces);
            
            for (let i = 0; i < V.length; i++) {
                if (boundary.has(i)) continue;
                
                const weights = cotangentWeights[i];
                if (!weights || Object.keys(weights).length === 0) continue;
                
                let sumWeights = 0;
                const weighted = { x: 0, y: 0, z: 0 };
                
                for (const [ni, w] of Object.entries(weights)) {
                    const nIdx = parseInt(ni);
                    weighted.x += w * V[nIdx].x;
                    weighted.y += w * V[nIdx].y;
                    weighted.z += w * V[nIdx].z;
                    sumWeights += w;
                }
                
                if (sumWeights > 1e-10) {
                    weighted.x /= sumWeights;
                    weighted.y /= sumWeights;
                    weighted.z /= sumWeights;
                    
                    newV[i] = {
                        x: V[i].x + lambda * (weighted.x - V[i].x),
                        y: V[i].y + lambda * (weighted.y - V[i].y),
                        z: V[i].z + lambda * (weighted.z - V[i].z)
                    };
                }
            }
            
            V = newV;
        }
        
        return V;
    },
    
    _computeCotangentWeights: function(vertices, faces) {
        const weights = Array(vertices.length).fill(null).map(() => ({}));
        
        for (const face of faces) {
            const [i0, i1, i2] = face;
            const v0 = vertices[i0];
            const v1 = vertices[i1];
            const v2 = vertices[i2];
            
            // Cotangent of angle at each vertex
            const cot0 = this._cotangent(v1, v0, v2);
            const cot1 = this._cotangent(v2, v1, v0);
            const cot2 = this._cotangent(v0, v2, v1);
            
            // Add weights
            weights[i0][i1] = (weights[i0][i1] || 0) + cot2;
            weights[i0][i2] = (weights[i0][i2] || 0) + cot1;
            weights[i1][i0] = (weights[i1][i0] || 0) + cot2;
            weights[i1][i2] = (weights[i1][i2] || 0) + cot0;
            weights[i2][i0] = (weights[i2][i0] || 0) + cot1;
            weights[i2][i1] = (weights[i2][i1] || 0) + cot0;
        }
        
        return weights;
    },
    
    _cotangent: function(v, apex, w) {
        const va = { x: v.x - apex.x, y: v.y - apex.y, z: v.z - apex.z };
        const wa = { x: w.x - apex.x, y: w.y - apex.y, z: w.z - apex.z };
        
        const dot = va.x * wa.x + va.y * wa.y + va.z * wa.z;
        const cross = {
            x: va.y * wa.z - va.z * wa.y,
            y: va.z * wa.x - va.x * wa.z,
            z: va.x * wa.y - va.y * wa.x
        };
        const crossLen = Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
        
        if (crossLen < 1e-10) return 0;
        return dot / crossLen;
    },
    
    /**
     * Bilateral mesh smoothing
     * Preserves features while smoothing noise
     * Source: Fleishman et al., "Bilateral Mesh Denoising" (2003)
     */
    bilateralSmooth: function(vertices, faces, sigmaC = 1.0, sigmaN = 0.3, iterations = 1) {
        let V = vertices.map(v => ({ ...v }));
        const normals = this._computeVertexNormals(V, faces);
        const adj = this._buildAdjacency(V.length, faces);
        
        for (let iter = 0; iter < iterations; iter++) {
            const newNormals = this._computeVertexNormals(V, faces);
            const newV = V.map(v => ({ ...v }));
            
            for (let i = 0; i < V.length; i++) {
                const neighbors = adj[i];
                if (neighbors.length === 0) continue;
                
                const n_i = newNormals[i];
                let sumWeights = 0;
                let displacement = 0;
                
                for (const j of neighbors) {
                    // Spatial weight
                    const dx = V[j].x - V[i].x;
                    const dy = V[j].y - V[i].y;
                    const dz = V[j].z - V[i].z;
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    const wc = Math.exp(-dist * dist / (2 * sigmaC * sigmaC));
                    
                    // Height difference along normal
                    const h = dx * n_i.x + dy * n_i.y + dz * n_i.z;
                    
                    // Range weight
                    const ws = Math.exp(-h * h / (2 * sigmaN * sigmaN));
                    
                    const w = wc * ws;
                    sumWeights += w;
                    displacement += w * h;
                }
                
                if (sumWeights > 1e-10) {
                    displacement /= sumWeights;
                    newV[i] = {
                        x: V[i].x + displacement * n_i.x,
                        y: V[i].y + displacement * n_i.y,
                        z: V[i].z + displacement * n_i.z
                    };
                }
            }
            
            V = newV;
        }
        
        return V;
    },
    
    _computeVertexNormals: function(vertices, faces) {
        const normals = vertices.map(() => ({ x: 0, y: 0, z: 0 }));
        
        for (const face of faces) {
            const [i0, i1, i2] = face;
            const v0 = vertices[i0];
            const v1 = vertices[i1];
            const v2 = vertices[i2];
            
            const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
            const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
            
            const n = {
                x: e1.y * e2.z - e1.z * e2.y,
                y: e1.z * e2.x - e1.x * e2.z,
                z: e1.x * e2.y - e1.y * e2.x
            };
            
            for (const vi of [i0, i1, i2]) {
                normals[vi].x += n.x;
                normals[vi].y += n.y;
                normals[vi].z += n.z;
            }
        }
        
        // Normalize
        for (const n of normals) {
            const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
            if (len > 1e-10) {
                n.x /= len;
                n.y /= len;
                n.z /= len;
            }
        }
        
        return normals;
    },
    
    _buildAdjacency: function(numVertices, faces) {
        const adj = Array(numVertices).fill(null).map(() => []);
        const seen = Array(numVertices).fill(null).map(() => new Set());
        
        for (const face of faces) {
            const n = face.length;
            for (let i = 0; i < n; i++) {
                const v = face[i];
                const next = face[(i + 1) % n];
                const prev = face[(i - 1 + n) % n];
                
                if (!seen[v].has(next)) {
                    adj[v].push(next);
                    seen[v].add(next);
                }
                if (!seen[v].has(prev)) {
                    adj[v].push(prev);
                    seen[v].add(prev);
                }
            }
        }
        
        return adj;
    },
    
    _findBoundaryVertices: function(numVertices, faces) {
        const edgeCount = new Map();
        
        for (const face of faces) {
            const n = face.length;
            for (let i = 0; i < n; i++) {
                const v1 = face[i];
                const v2 = face[(i + 1) % n];
                const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
                edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
            }
        }
        
        const boundary = new Set();
        for (const [key, count] of edgeCount) {
            if (count === 1) {
                const [v1, v2] = key.split('-').map(Number);
                boundary.add(v1);
                boundary.add(v2);
            }
        }
        
        return boundary;
    }
}