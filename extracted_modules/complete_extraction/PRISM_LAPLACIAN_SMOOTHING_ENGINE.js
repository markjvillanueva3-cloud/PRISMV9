const PRISM_LAPLACIAN_SMOOTHING_ENGINE = {
    name: 'PRISM_LAPLACIAN_SMOOTHING_ENGINE',
    version: '1.0.0',
    source: 'Taubin 1995, Stanford CS 468',
    
    /**
     * Laplacian smoothing (shrinkage-prone)
     */
    smoothLaplacian: function(mesh, options = {}) {
        const { iterations = 5, lambda = 0.5 } = options;
        
        const adjacency = this._buildAdjacency(mesh);
        let vertices = this._copyVertices(mesh.vertices);
        
        for (let iter = 0; iter < iterations; iter++) {
            const newVertices = new Float32Array(vertices.length);
            
            for (let i = 0; i < vertices.length / 3; i++) {
                const neighbors = adjacency[i];
                
                if (neighbors.length === 0) {
                    newVertices[i * 3] = vertices[i * 3];
                    newVertices[i * 3 + 1] = vertices[i * 3 + 1];
                    newVertices[i * 3 + 2] = vertices[i * 3 + 2];
                    continue;
                }
                
                // Compute Laplacian: L(v) = (1/n) * sum(neighbors) - v
                let lx = 0, ly = 0, lz = 0;
                for (const j of neighbors) {
                    lx += vertices[j * 3];
                    ly += vertices[j * 3 + 1];
                    lz += vertices[j * 3 + 2];
                }
                lx = lx / neighbors.length - vertices[i * 3];
                ly = ly / neighbors.length - vertices[i * 3 + 1];
                lz = lz / neighbors.length - vertices[i * 3 + 2];
                
                // Update: v' = v + lambda * L(v)
                newVertices[i * 3] = vertices[i * 3] + lambda * lx;
                newVertices[i * 3 + 1] = vertices[i * 3 + 1] + lambda * ly;
                newVertices[i * 3 + 2] = vertices[i * 3 + 2] + lambda * lz;
            }
            
            vertices = newVertices;
        }
        
        return { vertices: Array.from(vertices), indices: mesh.indices };
    },
    
    /**
     * Taubin smoothing (shrinkage-free via oscillation)
     */
    smoothTaubin: function(mesh, options = {}) {
        const { iterations = 5, lambda = 0.5, mu = -0.53 } = options;
        
        const adjacency = this._buildAdjacency(mesh);
        let vertices = this._copyVertices(mesh.vertices);
        
        for (let iter = 0; iter < iterations; iter++) {
            // Forward pass (shrink)
            vertices = this._laplacianStep(vertices, adjacency, lambda);
            
            // Backward pass (inflate)
            vertices = this._laplacianStep(vertices, adjacency, mu);
        }
        
        return { vertices: Array.from(vertices), indices: mesh.indices };
    },
    
    /**
     * Cotangent-weighted Laplacian (more geometrically accurate)
     */
    smoothCotangent: function(mesh, options = {}) {
        const { iterations = 3, lambda = 0.5 } = options;
        
        let vertices = this._copyVertices(mesh.vertices);
        const cotWeights = this._computeCotangentWeights(mesh);
        
        for (let iter = 0; iter < iterations; iter++) {
            const newVertices = new Float32Array(vertices.length);
            
            for (let i = 0; i < vertices.length / 3; i++) {
                const weights = cotWeights[i];
                
                if (weights.length === 0) {
                    newVertices[i * 3] = vertices[i * 3];
                    newVertices[i * 3 + 1] = vertices[i * 3 + 1];
                    newVertices[i * 3 + 2] = vertices[i * 3 + 2];
                    continue;
                }
                
                let totalWeight = 0;
                let lx = 0, ly = 0, lz = 0;
                
                for (const { neighbor, weight } of weights) {
                    lx += weight * (vertices[neighbor * 3] - vertices[i * 3]);
                    ly += weight * (vertices[neighbor * 3 + 1] - vertices[i * 3 + 1]);
                    lz += weight * (vertices[neighbor * 3 + 2] - vertices[i * 3 + 2]);
                    totalWeight += weight;
                }
                
                if (totalWeight > 0) {
                    lx /= totalWeight;
                    ly /= totalWeight;
                    lz /= totalWeight;
                }
                
                newVertices[i * 3] = vertices[i * 3] + lambda * lx;
                newVertices[i * 3 + 1] = vertices[i * 3 + 1] + lambda * ly;
                newVertices[i * 3 + 2] = vertices[i * 3 + 2] + lambda * lz;
            }
            
            vertices = newVertices;
        }
        
        return { vertices: Array.from(vertices), indices: mesh.indices };
    },
    
    _laplacianStep: function(vertices, adjacency, factor) {
        const newVertices = new Float32Array(vertices.length);
        
        for (let i = 0; i < vertices.length / 3; i++) {
            const neighbors = adjacency[i];
            
            if (neighbors.length === 0) {
                newVertices[i * 3] = vertices[i * 3];
                newVertices[i * 3 + 1] = vertices[i * 3 + 1];
                newVertices[i * 3 + 2] = vertices[i * 3 + 2];
                continue;
            }
            
            let lx = 0, ly = 0, lz = 0;
            for (const j of neighbors) {
                lx += vertices[j * 3];
                ly += vertices[j * 3 + 1];
                lz += vertices[j * 3 + 2];
            }
            lx = lx / neighbors.length - vertices[i * 3];
            ly = ly / neighbors.length - vertices[i * 3 + 1];
            lz = lz / neighbors.length - vertices[i * 3 + 2];
            
            newVertices[i * 3] = vertices[i * 3] + factor * lx;
            newVertices[i * 3 + 1] = vertices[i * 3 + 1] + factor * ly;
            newVertices[i * 3 + 2] = vertices[i * 3 + 2] + factor * lz;
        }
        
        return newVertices;
    },
    
    _buildAdjacency: function(mesh) {
        const numVertices = mesh.vertices.length / 3;
        const adjacency = Array.from({ length: numVertices }, () => new Set());
        
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const a = mesh.indices[i];
            const b = mesh.indices[i + 1];
            const c = mesh.indices[i + 2];
            
            adjacency[a].add(b); adjacency[a].add(c);
            adjacency[b].add(a); adjacency[b].add(c);
            adjacency[c].add(a); adjacency[c].add(b);
        }
        
        return adjacency.map(s => Array.from(s));
    },
    
    _computeCotangentWeights: function(mesh) {
        const numVertices = mesh.vertices.length / 3;
        const weights = Array.from({ length: numVertices }, () => []);
        const edgeWeights = new Map();
        
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const indices = [mesh.indices[i], mesh.indices[i + 1], mesh.indices[i + 2]];
            const verts = indices.map(idx => ({
                x: mesh.vertices[idx * 3],
                y: mesh.vertices[idx * 3 + 1],
                z: mesh.vertices[idx * 3 + 2]
            }));
            
            for (let j = 0; j < 3; j++) {
                const a = indices[j];
                const b = indices[(j + 1) % 3];
                const c = indices[(j + 2) % 3];
                
                // Cotangent of angle at c
                const ca = this._subtract(verts[j], verts[(j + 2) % 3]);
                const cb = this._subtract(verts[(j + 1) % 3], verts[(j + 2) % 3]);
                
                const dot = this._dot(ca, cb);
                const cross = this._cross(ca, cb);
                const crossLen = Math.sqrt(this._dot(cross, cross));
                
                const cotWeight = crossLen > 1e-10 ? dot / crossLen : 0;
                
                const key = `${Math.min(a, b)},${Math.max(a, b)}`;
                edgeWeights.set(key, (edgeWeights.get(key) || 0) + Math.max(0, cotWeight) / 2);
            }
        }
        
        for (const [key, weight] of edgeWeights) {
            const [a, b] = key.split(',').map(Number);
            weights[a].push({ neighbor: b, weight });
            weights[b].push({ neighbor: a, weight });
        }
        
        return weights;
    },
    
    _copyVertices: function(vertices) {
        return new Float32Array(vertices);
    },
    
    _subtract: function(a, b) {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    },
    
    _dot: function(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    },
    
    _cross: function(a, b) {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    }
};