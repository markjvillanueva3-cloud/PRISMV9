const PRISM_BILATERAL_MESH_FILTER = {
    name: 'PRISM_BILATERAL_MESH_FILTER',
    version: '1.0.0',
    source: 'Fleishman et al. 2003, Jones et al. 2003',
    
    /**
     * Bilateral mesh filtering
     * Preserves sharp features while smoothing noise
     */
    filter: function(mesh, options = {}) {
        const {
            iterations = 3,
            sigmaC = 0.5,  // Spatial sigma
            sigmaS = 0.3   // Range/influence sigma
        } = options;
        
        // Compute vertex normals
        const normals = this._computeVertexNormals(mesh);
        
        // Build neighborhood
        const neighbors = this._buildNeighborhood(mesh);
        
        let vertices = this._copyVertices(mesh.vertices);
        
        // Estimate average edge length for sigma scaling
        const avgEdgeLength = this._computeAverageEdgeLength(mesh);
        const spatialSigma = sigmaC * avgEdgeLength;
        
        for (let iter = 0; iter < iterations; iter++) {
            const newVertices = new Float32Array(vertices.length);
            const newNormals = this._computeVertexNormalsFromVerts(vertices, mesh.indices);
            
            for (let i = 0; i < vertices.length / 3; i++) {
                const vi = {
                    x: vertices[i * 3],
                    y: vertices[i * 3 + 1],
                    z: vertices[i * 3 + 2]
                };
                const ni = newNormals[i];
                
                let sumWeight = 0;
                let offset = 0;
                
                for (const j of neighbors[i]) {
                    const vj = {
                        x: vertices[j * 3],
                        y: vertices[j * 3 + 1],
                        z: vertices[j * 3 + 2]
                    };
                    
                    // Spatial distance
                    const spatialDist = this._distance(vi, vj);
                    
                    // Height difference along normal
                    const diff = this._subtract(vj, vi);
                    const h = this._dot(diff, ni);
                    
                    // Bilateral weight
                    const wc = Math.exp(-spatialDist * spatialDist / (2 * spatialSigma * spatialSigma));
                    const ws = Math.exp(-h * h / (2 * sigmaS * sigmaS * avgEdgeLength * avgEdgeLength));
                    const weight = wc * ws;
                    
                    sumWeight += weight;
                    offset += weight * h;
                }
                
                if (sumWeight > 1e-10) {
                    offset /= sumWeight;
                }
                
                // Move vertex along normal by filtered offset
                newVertices[i * 3] = vi.x + offset * ni.x;
                newVertices[i * 3 + 1] = vi.y + offset * ni.y;
                newVertices[i * 3 + 2] = vi.z + offset * ni.z;
            }
            
            vertices = newVertices;
        }
        
        return { vertices: Array.from(vertices), indices: mesh.indices };
    },
    
    /**
     * Normal-space bilateral filter
     */
    filterNormals: function(mesh, options = {}) {
        const { iterations = 2, sigmaC = 0.5, sigmaS = 0.5 } = options;
        
        let normals = this._computeVertexNormals(mesh);
        const neighbors = this._buildNeighborhood(mesh);
        const avgEdgeLength = this._computeAverageEdgeLength(mesh);
        
        for (let iter = 0; iter < iterations; iter++) {
            const newNormals = [];
            
            for (let i = 0; i < normals.length; i++) {
                const ni = normals[i];
                let sumWeight = 0;
                let sumN = { x: 0, y: 0, z: 0 };
                
                for (const j of neighbors[i]) {
                    const nj = normals[j];
                    
                    // Normal difference
                    const normalDiff = 1 - this._dot(ni, nj);
                    
                    // Weights
                    const ws = Math.exp(-normalDiff * normalDiff / (2 * sigmaS * sigmaS));
                    const weight = ws;
                    
                    sumWeight += weight;
                    sumN.x += weight * nj.x;
                    sumN.y += weight * nj.y;
                    sumN.z += weight * nj.z;
                }
                
                if (sumWeight > 1e-10) {
                    sumN.x /= sumWeight;
                    sumN.y /= sumWeight;
                    sumN.z /= sumWeight;
                }
                
                newNormals.push(this._normalize(sumN));
            }
            
            normals = newNormals;
        }
        
        // Update vertices based on filtered normals
        return this._updateVerticesFromNormals(mesh, normals);
    },
    
    _updateVerticesFromNormals: function(mesh, filteredNormals) {
        // Solve for vertices that best match filtered normals
        // This is a simplified approach - full would use vertex position optimization
        
        const vertices = this._copyVertices(mesh.vertices);
        const neighbors = this._buildNeighborhood(mesh);
        
        // One iteration of vertex update
        const newVertices = new Float32Array(vertices.length);
        
        for (let i = 0; i < vertices.length / 3; i++) {
            const vi = {
                x: vertices[i * 3],
                y: vertices[i * 3 + 1],
                z: vertices[i * 3 + 2]
            };
            const ni = filteredNormals[i];
            
            // Project neighbors onto tangent plane defined by filtered normal
            let centroid = { x: 0, y: 0, z: 0 };
            for (const j of neighbors[i]) {
                centroid.x += vertices[j * 3];
                centroid.y += vertices[j * 3 + 1];
                centroid.z += vertices[j * 3 + 2];
            }
            
            if (neighbors[i].length > 0) {
                centroid.x /= neighbors[i].length;
                centroid.y /= neighbors[i].length;
                centroid.z /= neighbors[i].length;
            } else {
                centroid = vi;
            }
            
            // Project centroid onto plane through vi with normal ni
            const d = this._dot(this._subtract(centroid, vi), ni);
            
            newVertices[i * 3] = centroid.x - d * ni.x * 0.5;
            newVertices[i * 3 + 1] = centroid.y - d * ni.y * 0.5;
            newVertices[i * 3 + 2] = centroid.z - d * ni.z * 0.5;
        }
        
        return { vertices: Array.from(newVertices), indices: mesh.indices };
    },
    
    _computeVertexNormals: function(mesh) {
        const numVertices = mesh.vertices.length / 3;
        const normals = Array.from({ length: numVertices }, () => ({ x: 0, y: 0, z: 0 }));
        
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const a = mesh.indices[i], b = mesh.indices[i + 1], c = mesh.indices[i + 2];
            
            const va = this._getVertex(mesh.vertices, a);
            const vb = this._getVertex(mesh.vertices, b);
            const vc = this._getVertex(mesh.vertices, c);
            
            const faceNormal = this._cross(this._subtract(vb, va), this._subtract(vc, va));
            
            for (const idx of [a, b, c]) {
                normals[idx].x += faceNormal.x;
                normals[idx].y += faceNormal.y;
                normals[idx].z += faceNormal.z;
            }
        }
        
        return normals.map(n => this._normalize(n));
    },
    
    _computeVertexNormalsFromVerts: function(vertices, indices) {
        const numVertices = vertices.length / 3;
        const normals = Array.from({ length: numVertices }, () => ({ x: 0, y: 0, z: 0 }));
        
        for (let i = 0; i < indices.length; i += 3) {
            const a = indices[i], b = indices[i + 1], c = indices[i + 2];
            
            const va = this._getVertex(vertices, a);
            const vb = this._getVertex(vertices, b);
            const vc = this._getVertex(vertices, c);
            
            const faceNormal = this._cross(this._subtract(vb, va), this._subtract(vc, va));
            
            for (const idx of [a, b, c]) {
                normals[idx].x += faceNormal.x;
                normals[idx].y += faceNormal.y;
                normals[idx].z += faceNormal.z;
            }
        }
        
        return normals.map(n => this._normalize(n));
    },
    
    _buildNeighborhood: function(mesh) {
        const numVertices = mesh.vertices.length / 3;
        const neighbors = Array.from({ length: numVertices }, () => new Set());
        
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const a = mesh.indices[i], b = mesh.indices[i + 1], c = mesh.indices[i + 2];
            neighbors[a].add(b); neighbors[a].add(c);
            neighbors[b].add(a); neighbors[b].add(c);
            neighbors[c].add(a); neighbors[c].add(b);
        }
        
        return neighbors.map(s => Array.from(s));
    },
    
    _computeAverageEdgeLength: function(mesh) {
        let totalLength = 0;
        let edgeCount = 0;
        
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const a = mesh.indices[i], b = mesh.indices[i + 1], c = mesh.indices[i + 2];
            
            totalLength += this._distance(
                this._getVertex(mesh.vertices, a),
                this._getVertex(mesh.vertices, b)
            );
            totalLength += this._distance(
                this._getVertex(mesh.vertices, b),
                this._getVertex(mesh.vertices, c)
            );
            totalLength += this._distance(
                this._getVertex(mesh.vertices, c),
                this._getVertex(mesh.vertices, a)
            );
            edgeCount += 3;
        }
        
        return totalLength / edgeCount;
    },
    
    _copyVertices: function(vertices) {
        return new Float32Array(vertices);
    },
    
    _getVertex: function(vertices, idx) {
        return {
            x: vertices[idx * 3],
            y: vertices[idx * 3 + 1],
            z: vertices[idx * 3 + 2]
        };
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
    },
    
    _normalize: function(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
        return { x: v.x / len, y: v.y / len, z: v.z / len };
    },
    
    _distance: function(a, b) {
        const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}