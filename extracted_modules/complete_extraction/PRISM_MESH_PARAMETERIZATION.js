const PRISM_MESH_PARAMETERIZATION = {
    name: 'PRISM_MESH_PARAMETERIZATION',
    version: '1.0.0',
    source: 'Lévy et al. SIGGRAPH 2002, Tutte 1963',
    description: 'Mesh parameterization for texture mapping',
    
    /**
     * Tutte embedding (barycentric mapping)
     * Source: Tutte, "How to Draw a Graph" (1963)
     * Maps boundary to circle, interior via barycentric coordinates
     */
    tutteEmbedding: function(vertices, faces) {
        const boundary = this._findBoundary(vertices.length, faces);
        const interiorVertices = [];
        
        for (let i = 0; i < vertices.length; i++) {
            if (!boundary.has(i)) interiorVertices.push(i);
        }
        
        // Map boundary to unit circle
        const uvCoords = new Array(vertices.length);
        const boundaryList = [...boundary];
        const n = boundaryList.length;
        
        for (let i = 0; i < n; i++) {
            const angle = (2 * Math.PI * i) / n;
            uvCoords[boundaryList[i]] = {
                u: 0.5 + 0.5 * Math.cos(angle),
                v: 0.5 + 0.5 * Math.sin(angle)
            };
        }
        
        // Build adjacency
        const adj = this._buildAdjacency(vertices.length, faces);
        
        // Solve linear system for interior vertices
        // Using iterative Gauss-Seidel
        for (let i = 0; i < vertices.length; i++) {
            if (!uvCoords[i]) uvCoords[i] = { u: 0.5, v: 0.5 };
        }
        
        for (let iter = 0; iter < 500; iter++) {
            for (const vi of interiorVertices) {
                const neighbors = adj[vi];
                if (neighbors.length === 0) continue;
                
                let sumU = 0, sumV = 0;
                for (const ni of neighbors) {
                    sumU += uvCoords[ni].u;
                    sumV += uvCoords[ni].v;
                }
                
                uvCoords[vi] = {
                    u: sumU / neighbors.length,
                    v: sumV / neighbors.length
                };
            }
        }
        
        return uvCoords;
    },
    
    /**
     * LSCM (Least Squares Conformal Maps)
     * Source: Lévy et al., "Least Squares Conformal Maps" (2002)
     * Minimizes conformal energy (angle distortion)
     */
    lscmParameterization: function(vertices, faces) {
        // Pin two boundary vertices
        const boundary = [...this._findBoundary(vertices.length, faces)];
        if (boundary.length < 2) {
            return this.tutteEmbedding(vertices, faces);
        }
        
        // Find two farthest boundary vertices
        let maxDist = 0;
        let pin1 = boundary[0], pin2 = boundary[1];
        
        for (let i = 0; i < boundary.length; i++) {
            for (let j = i + 1; j < boundary.length; j++) {
                const vi = boundary[i], vj = boundary[j];
                const dx = vertices[vi].x - vertices[vj].x;
                const dy = vertices[vi].y - vertices[vj].y;
                const dz = vertices[vi].z - vertices[vj].z;
                const dist = dx * dx + dy * dy + dz * dz;
                
                if (dist > maxDist) {
                    maxDist = dist;
                    pin1 = vi;
                    pin2 = vj;
                }
            }
        }
        
        // Initialize UV coordinates
        const uvCoords = vertices.map(() => ({ u: 0, v: 0 }));
        uvCoords[pin1] = { u: 0, v: 0 };
        uvCoords[pin2] = { u: 1, v: 0 };
        
        // Build cotangent Laplacian and solve
        const adj = this._buildAdjacency(vertices.length, faces);
        const cotWeights = this._computeCotangentWeights(vertices, faces);
        
        // Iterative solve (simplified LSCM)
        const pinned = new Set([pin1, pin2]);
        
        for (let iter = 0; iter < 1000; iter++) {
            for (let i = 0; i < vertices.length; i++) {
                if (pinned.has(i)) continue;
                
                const neighbors = adj[i];
                const weights = cotWeights[i];
                
                let sumU = 0, sumV = 0, sumW = 0;
                for (const ni of neighbors) {
                    const w = weights[ni] || 1;
                    sumU += w * uvCoords[ni].u;
                    sumV += w * uvCoords[ni].v;
                    sumW += w;
                }
                
                if (sumW > 1e-10) {
                    uvCoords[i] = {
                        u: sumU / sumW,
                        v: sumV / sumW
                    };
                }
            }
        }
        
        return uvCoords;
    },
    
    _findBoundary: function(numVertices, faces) {
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
    },
    
    _buildAdjacency: function(numVertices, faces) {
        const adj = Array(numVertices).fill(null).map(() => []);
        const seen = Array(numVertices).fill(null).map(() => new Set());
        
        for (const face of faces) {
            const n = face.length;
            for (let i = 0; i < n; i++) {
                const v = face[i];
                const next = face[(i + 1) % n];
                
                if (!seen[v].has(next)) {
                    adj[v].push(next);
                    seen[v].add(next);
                }
                if (!seen[next].has(v)) {
                    adj[next].push(v);
                    seen[next].add(v);
                }
            }
        }
        
        return adj;
    },
    
    _computeCotangentWeights: function(vertices, faces) {
        const weights = Array(vertices.length).fill(null).map(() => ({}));
        
        for (const face of faces) {
            if (face.length !== 3) continue;
            
            const [i0, i1, i2] = face;
            const v0 = vertices[i0];
            const v1 = vertices[i1];
            const v2 = vertices[i2];
            
            const cot0 = this._cotangent(v1, v0, v2);
            const cot1 = this._cotangent(v2, v1, v0);
            const cot2 = this._cotangent(v0, v2, v1);
            
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
        return Math.max(-100, Math.min(100, dot / crossLen));
    }
}