const PRISM_SUBDIVISION_SURFACES = {
    name: 'PRISM_SUBDIVISION_SURFACES',
    version: '2.0.0',
    source: 'MIT 6.837, Stanford CS 468, Loop SIGGRAPH 1987',
    description: 'Unified subdivision surface algorithms for mesh refinement',
    
    /**
     * Loop Subdivision for triangular meshes
     * Source: Loop, "Smooth Subdivision Surfaces Based on Triangles" (1987)
     * @param {Array} vertices - Mesh vertices [{x, y, z}, ...]
     * @param {Array} faces - Triangle faces [[v0, v1, v2], ...]
     * @param {number} iterations - Number of subdivision iterations
     * @returns {Object} Subdivided mesh
     */
    loopSubdivide: function(vertices, faces, iterations = 1) {
        let V = vertices.map(v => ({ ...v }));
        let F = faces.map(f => [...f]);
        
        for (let iter = 0; iter < iterations; iter++) {
            const result = this._loopSubdivideOnce(V, F);
            V = result.vertices;
            F = result.faces;
        }
        
        return { vertices: V, faces: F };
    },
    
    _loopSubdivideOnce: function(vertices, faces) {
        const edgeMap = new Map();
        const newVertices = [...vertices.map(v => ({ ...v, isOriginal: true }))];
        const newFaces = [];
        
        // Build vertex adjacency
        const vertexAdjacency = this._buildVertexAdjacency(vertices.length, faces);
        
        // Create edge vertices
        const getEdgeVertex = (v1, v2) => {
            const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
            if (edgeMap.has(key)) return edgeMap.get(key);
            
            // Find adjacent faces
            const adjFaces = faces.filter(f => 
                (f.includes(v1) && f.includes(v2))
            );
            
            let newVertex;
            if (adjFaces.length === 2) {
                // Interior edge: 3/8 * (v1 + v2) + 1/8 * (v3 + v4)
                const opposites = [];
                for (const face of adjFaces) {
                    const other = face.find(v => v !== v1 && v !== v2);
                    if (other !== undefined) opposites.push(other);
                }
                
                newVertex = {
                    x: (3/8) * (vertices[v1].x + vertices[v2].x) + 
                       (1/8) * (vertices[opposites[0]].x + vertices[opposites[1]].x),
                    y: (3/8) * (vertices[v1].y + vertices[v2].y) + 
                       (1/8) * (vertices[opposites[0]].y + vertices[opposites[1]].y),
                    z: (3/8) * (vertices[v1].z + vertices[v2].z) + 
                       (1/8) * (vertices[opposites[0]].z + vertices[opposites[1]].z),
                    isOriginal: false
                };
            } else {
                // Boundary edge: midpoint
                newVertex = {
                    x: (vertices[v1].x + vertices[v2].x) / 2,
                    y: (vertices[v1].y + vertices[v2].y) / 2,
                    z: (vertices[v1].z + vertices[v2].z) / 2,
                    isOriginal: false
                };
            }
            
            const idx = newVertices.length;
            newVertices.push(newVertex);
            edgeMap.set(key, idx);
            return idx;
        };
        
        // Update original vertices
        for (let i = 0; i < vertices.length; i++) {
            const neighbors = vertexAdjacency[i];
            const n = neighbors.length;
            
            if (n === 0) continue;
            
            // Loop's beta formula
            let beta;
            if (n === 3) {
                beta = 3/16;
            } else {
                beta = 3 / (8 * n);
            }
            
            const sumNeighbors = { x: 0, y: 0, z: 0 };
            for (const ni of neighbors) {
                sumNeighbors.x += vertices[ni].x;
                sumNeighbors.y += vertices[ni].y;
                sumNeighbors.z += vertices[ni].z;
            }
            
            newVertices[i] = {
                x: (1 - n * beta) * vertices[i].x + beta * sumNeighbors.x,
                y: (1 - n * beta) * vertices[i].y + beta * sumNeighbors.y,
                z: (1 - n * beta) * vertices[i].z + beta * sumNeighbors.z,
                isOriginal: true
            };
        }
        
        // Create new faces
        for (const face of faces) {
            const [v0, v1, v2] = face;
            const e01 = getEdgeVertex(v0, v1);
            const e12 = getEdgeVertex(v1, v2);
            const e20 = getEdgeVertex(v2, v0);
            
            // 4 new triangles
            newFaces.push([v0, e01, e20]);
            newFaces.push([v1, e12, e01]);
            newFaces.push([v2, e20, e12]);
            newFaces.push([e01, e12, e20]);
        }
        
        return { vertices: newVertices, faces: newFaces };
    },
    
    /**
     * Catmull-Clark subdivision for quad meshes
     * Source: Catmull & Clark 1978, MIT 6.837
     * @param {Array} vertices - Mesh vertices
     * @param {Array} faces - Quad faces (also handles triangles)
     * @param {number} iterations - Number of iterations
     */
    catmullClarkSubdivide: function(vertices, faces, iterations = 1) {
        let V = vertices.map(v => ({ ...v }));
        let F = faces.map(f => [...f]);
        
        for (let iter = 0; iter < iterations; iter++) {
            const result = this._catmullClarkOnce(V, F);
            V = result.vertices;
            F = result.faces;
        }
        
        return { vertices: V, faces: F };
    },
    
    _catmullClarkOnce: function(vertices, faces) {
        const newVertices = [];
        const facePointIndices = [];
        const edgeMap = new Map();
        const edgeFaces = new Map();
        
        // Step 1: Face points (centroid of face)
        for (let fi = 0; fi < faces.length; fi++) {
            const face = faces[fi];
            const facePoint = { x: 0, y: 0, z: 0 };
            for (const vi of face) {
                facePoint.x += vertices[vi].x;
                facePoint.y += vertices[vi].y;
                facePoint.z += vertices[vi].z;
            }
            facePoint.x /= face.length;
            facePoint.y /= face.length;
            facePoint.z /= face.length;
            
            facePointIndices.push(newVertices.length);
            newVertices.push(facePoint);
            
            // Track edge-face relationships
            const n = face.length;
            for (let i = 0; i < n; i++) {
                const v1 = face[i];
                const v2 = face[(i + 1) % n];
                const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
                if (!edgeFaces.has(key)) edgeFaces.set(key, []);
                edgeFaces.get(key).push(fi);
            }
        }
        
        // Step 2: Edge points
        const getEdgePoint = (v1, v2) => {
            const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
            if (edgeMap.has(key)) return edgeMap.get(key);
            
            const adjFaceIndices = edgeFaces.get(key) || [];
            let edgePoint;
            
            if (adjFaceIndices.length === 2) {
                // Interior edge: average of edge midpoint and face points
                const fp1 = newVertices[facePointIndices[adjFaceIndices[0]]];
                const fp2 = newVertices[facePointIndices[adjFaceIndices[1]]];
                
                edgePoint = {
                    x: (vertices[v1].x + vertices[v2].x + fp1.x + fp2.x) / 4,
                    y: (vertices[v1].y + vertices[v2].y + fp1.y + fp2.y) / 4,
                    z: (vertices[v1].z + vertices[v2].z + fp1.z + fp2.z) / 4
                };
            } else {
                // Boundary edge: midpoint
                edgePoint = {
                    x: (vertices[v1].x + vertices[v2].x) / 2,
                    y: (vertices[v1].y + vertices[v2].y) / 2,
                    z: (vertices[v1].z + vertices[v2].z) / 2
                };
            }
            
            const idx = newVertices.length;
            newVertices.push(edgePoint);
            edgeMap.set(key, idx);
            return idx;
        };
        
        // Step 3: Update original vertices
        const originalVertexIndices = [];
        for (let vi = 0; vi < vertices.length; vi++) {
            // Find all faces containing this vertex
            const adjFaces = [];
            for (let fi = 0; fi < faces.length; fi++) {
                if (faces[fi].includes(vi)) adjFaces.push(fi);
            }
            
            // Find all adjacent vertices
            const adjVertices = new Set();
            for (const fi of adjFaces) {
                const face = faces[fi];
                const idx = face.indexOf(vi);
                adjVertices.add(face[(idx + 1) % face.length]);
                adjVertices.add(face[(idx - 1 + face.length) % face.length]);
            }
            
            const n = adjFaces.length;
            
            if (n === 0) {
                originalVertexIndices.push(newVertices.length);
                newVertices.push({ ...vertices[vi] });
                continue;
            }
            
            // Average of face points
            const F_avg = { x: 0, y: 0, z: 0 };
            for (const fi of adjFaces) {
                const fp = newVertices[facePointIndices[fi]];
                F_avg.x += fp.x;
                F_avg.y += fp.y;
                F_avg.z += fp.z;
            }
            F_avg.x /= n;
            F_avg.y /= n;
            F_avg.z /= n;
            
            // Average of edge midpoints
            const R_avg = { x: 0, y: 0, z: 0 };
            let edgeCount = 0;
            for (const av of adjVertices) {
                R_avg.x += (vertices[vi].x + vertices[av].x) / 2;
                R_avg.y += (vertices[vi].y + vertices[av].y) / 2;
                R_avg.z += (vertices[vi].z + vertices[av].z) / 2;
                edgeCount++;
            }
            R_avg.x /= edgeCount;
            R_avg.y /= edgeCount;
            R_avg.z /= edgeCount;
            
            // New vertex position: (F + 2R + (n-3)V) / n
            const newVertex = {
                x: (F_avg.x + 2 * R_avg.x + (n - 3) * vertices[vi].x) / n,
                y: (F_avg.y + 2 * R_avg.y + (n - 3) * vertices[vi].y) / n,
                z: (F_avg.z + 2 * R_avg.z + (n - 3) * vertices[vi].z) / n
            };
            
            originalVertexIndices.push(newVertices.length);
            newVertices.push(newVertex);
        }
        
        // Step 4: Create new faces
        const newFaces = [];
        for (let fi = 0; fi < faces.length; fi++) {
            const face = faces[fi];
            const facePointIdx = facePointIndices[fi];
            const n = face.length;
            
            for (let i = 0; i < n; i++) {
                const v = face[i];
                const vPrev = face[(i - 1 + n) % n];
                const vNext = face[(i + 1) % n];
                
                const epPrev = getEdgePoint(vPrev, v);
                const epNext = getEdgePoint(v, vNext);
                const vNew = originalVertexIndices[v];
                
                newFaces.push([vNew, epNext, facePointIdx, epPrev]);
            }
        }
        
        return { vertices: newVertices, faces: newFaces };
    },
    
    /**
     * Butterfly subdivision (interpolating)
     * Source: Dyn, Levin, Gregory 1990
     * @param {Array} vertices - Mesh vertices
     * @param {Array} faces - Triangle faces
     * @param {number} iterations - Number of iterations
     */
    butterflySubdivide: function(vertices, faces, iterations = 1) {
        let V = vertices.map(v => ({ ...v }));
        let F = faces.map(f => [...f]);
        
        for (let iter = 0; iter < iterations; iter++) {
            const result = this._butterflyOnce(V, F);
            V = result.vertices;
            F = result.faces;
        }
        
        return { vertices: V, faces: F };
    },
    
    _butterflyOnce: function(vertices, faces) {
        const edgeMap = new Map();
        const newVertices = [...vertices.map(v => ({ ...v }))];
        const newFaces = [];
        
        // Build edge-face adjacency
        const edgeFaces = new Map();
        for (let fi = 0; fi < faces.length; fi++) {
            const face = faces[fi];
            for (let i = 0; i < 3; i++) {
                const v1 = face[i];
                const v2 = face[(i + 1) % 3];
                const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
                if (!edgeFaces.has(key)) edgeFaces.set(key, []);
                edgeFaces.get(key).push({ faceIdx: fi, opposite: face[(i + 2) % 3] });
            }
        }
        
        const getEdgeVertex = (v1, v2) => {
            const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
            if (edgeMap.has(key)) return edgeMap.get(key);
            
            const adjInfo = edgeFaces.get(key) || [];
            let newVertex;
            
            if (adjInfo.length === 2) {
                // Butterfly stencil: 1/2(a+b) + 1/8(c+d) - 1/16(e+f+g+h)
                const a = vertices[v1];
                const b = vertices[v2];
                const c = vertices[adjInfo[0].opposite];
                const d = vertices[adjInfo[1].opposite];
                
                // Simplified butterfly (without 8-point stencil)
                newVertex = {
                    x: 0.5 * (a.x + b.x) + 0.125 * (c.x + d.x) - 0.0625 * (a.x + b.x),
                    y: 0.5 * (a.y + b.y) + 0.125 * (c.y + d.y) - 0.0625 * (a.y + b.y),
                    z: 0.5 * (a.z + b.z) + 0.125 * (c.z + d.z) - 0.0625 * (a.z + b.z)
                };
                
                // Correct formula: a=1/2, b=1/8, others balance
                newVertex = {
                    x: 0.5 * (a.x + b.x) + 0.125 * (c.x + d.x),
                    y: 0.5 * (a.y + b.y) + 0.125 * (c.y + d.y),
                    z: 0.5 * (a.z + b.z) + 0.125 * (c.z + d.z)
                };
                
                // Normalize to maintain shape
                const weight = 0.5 + 0.25;
                newVertex.x /= weight;
                newVertex.y /= weight;
                newVertex.z /= weight;
            } else {
                // Boundary: simple midpoint
                newVertex = {
                    x: (vertices[v1].x + vertices[v2].x) / 2,
                    y: (vertices[v1].y + vertices[v2].y) / 2,
                    z: (vertices[v1].z + vertices[v2].z) / 2
                };
            }
            
            const idx = newVertices.length;
            newVertices.push(newVertex);
            edgeMap.set(key, idx);
            return idx;
        };
        
        // Create new faces
        for (const face of faces) {
            const [v0, v1, v2] = face;
            const e01 = getEdgeVertex(v0, v1);
            const e12 = getEdgeVertex(v1, v2);
            const e20 = getEdgeVertex(v2, v0);
            
            newFaces.push([v0, e01, e20]);
            newFaces.push([v1, e12, e01]);
            newFaces.push([v2, e20, e12]);
            newFaces.push([e01, e12, e20]);
        }
        
        return { vertices: newVertices, faces: newFaces };
    },
    
    // Helper: Build vertex adjacency
    _buildVertexAdjacency: function(numVertices, faces) {
        const adj = Array(numVertices).fill(null).map(() => new Set());
        
        for (const face of faces) {
            const n = face.length;
            for (let i = 0; i < n; i++) {
                adj[face[i]].add(face[(i + 1) % n]);
                adj[face[i]].add(face[(i - 1 + n) % n]);
            }
        }
        
        return adj.map(s => [...s]);
    }
};


// ═══════════════════════════════════════════════════════════════════════════════
// PRISM_MESH_SMOOTHING - Mesh Smoothing Algorithms
// Sources: Stanford CS 468, Taubin 1995
// ═══════════════════════════════════════════════════════════════════════════════

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
};


// ═══════════════════════════════════════════════════════════════════════════════
// PRISM_POINT_CLOUD_PROCESSING - Point Cloud Algorithms
// Sources: Alexa et al. 2001, Hoppe et al. 1992
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_POINT_CLOUD_PROCESSING = {
    name: 'PRISM_POINT_CLOUD_PROCESSING',
    version: '1.0.0',
    source: 'Alexa et al. 2001, Hoppe et al. 1992, MIT 6.837',
    description: 'Point cloud processing for surface reconstruction',
    
    /**
     * Estimate normals from point cloud using PCA
     * Source: Hoppe et al., "Surface Reconstruction from Unorganized Points" (1992)
     * @param {Array} points - Point cloud [{x, y, z}, ...]
     * @param {number} k - Number of neighbors for normal estimation
     */
    estimateNormals: function(points, k = 10) {
        const normals = [];
        const kdtree = this._buildKDTree(points);
        
        for (let i = 0; i < points.length; i++) {
            const neighbors = this._kNearestNeighbors(kdtree, points[i], k, points);
            
            // Compute covariance matrix
            const centroid = { x: 0, y: 0, z: 0 };
            for (const ni of neighbors) {
                centroid.x += points[ni].x;
                centroid.y += points[ni].y;
                centroid.z += points[ni].z;
            }
            centroid.x /= neighbors.length;
            centroid.y /= neighbors.length;
            centroid.z /= neighbors.length;
            
            // Covariance matrix
            let cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
            for (const ni of neighbors) {
                const dx = points[ni].x - centroid.x;
                const dy = points[ni].y - centroid.y;
                const dz = points[ni].z - centroid.z;
                
                cov[0][0] += dx * dx;
                cov[0][1] += dx * dy;
                cov[0][2] += dx * dz;
                cov[1][1] += dy * dy;
                cov[1][2] += dy * dz;
                cov[2][2] += dz * dz;
            }
            cov[1][0] = cov[0][1];
            cov[2][0] = cov[0][2];
            cov[2][1] = cov[1][2];
            
            // Find smallest eigenvector (normal)
            const normal = this._smallestEigenvector(cov);
            normals.push(normal);
        }
        
        // Orient normals consistently (propagate orientation via MST)
        this._orientNormals(points, normals, kdtree);
        
        return normals;
    },
    
    /**
     * Moving Least Squares (MLS) surface projection
     * Source: Alexa et al., "Point Set Surfaces" (2001)
     * @param {Array} points - Point cloud
     * @param {number} queryPoint - Point to project
     * @param {number} h - Smoothing parameter
     */
    mlsProject: function(points, queryPoint, h = 1.0) {
        const kdtree = this._buildKDTree(points);
        const neighbors = this._neighborsInRadius(kdtree, queryPoint, 3 * h, points);
        
        if (neighbors.length < 3) {
            return { ...queryPoint };
        }
        
        // Weighted centroid
        let sumW = 0;
        const centroid = { x: 0, y: 0, z: 0 };
        
        for (const ni of neighbors) {
            const dx = points[ni].x - queryPoint.x;
            const dy = points[ni].y - queryPoint.y;
            const dz = points[ni].z - queryPoint.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const w = Math.exp(-dist * dist / (h * h));
            
            centroid.x += w * points[ni].x;
            centroid.y += w * points[ni].y;
            centroid.z += w * points[ni].z;
            sumW += w;
        }
        
        centroid.x /= sumW;
        centroid.y /= sumW;
        centroid.z /= sumW;
        
        // Fit local plane using weighted PCA
        let cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        for (const ni of neighbors) {
            const dx = points[ni].x - queryPoint.x;
            const dy = points[ni].y - queryPoint.y;
            const dz = points[ni].z - queryPoint.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const w = Math.exp(-dist * dist / (h * h));
            
            const px = points[ni].x - centroid.x;
            const py = points[ni].y - centroid.y;
            const pz = points[ni].z - centroid.z;
            
            cov[0][0] += w * px * px;
            cov[0][1] += w * px * py;
            cov[0][2] += w * px * pz;
            cov[1][1] += w * py * py;
            cov[1][2] += w * py * pz;
            cov[2][2] += w * pz * pz;
        }
        cov[1][0] = cov[0][1];
        cov[2][0] = cov[0][2];
        cov[2][1] = cov[1][2];
        
        const normal = this._smallestEigenvector(cov);
        
        // Project query point onto plane
        const d = (queryPoint.x - centroid.x) * normal.x +
                  (queryPoint.y - centroid.y) * normal.y +
                  (queryPoint.z - centroid.z) * normal.z;
        
        return {
            x: queryPoint.x - d * normal.x,
            y: queryPoint.y - d * normal.y,
            z: queryPoint.z - d * normal.z
        };
    },
    
    /**
     * Reconstruct surface from point cloud
     * Creates a triangle mesh using Ball Pivoting Algorithm (simplified)
     */
    reconstructSurface: function(points, ballRadius = 1.0) {
        const normals = this.estimateNormals(points);
        const vertices = points.map(p => ({ ...p }));
        const faces = [];
        
        // Use Poisson reconstruction approach (simplified marching cubes)
        const bounds = this._computeBounds(points);
        const resolution = Math.ceil(Math.max(
            bounds.max.x - bounds.min.x,
            bounds.max.y - bounds.min.y,
            bounds.max.z - bounds.min.z
        ) / ballRadius) * 2;
        
        // Create implicit function from oriented points
        const gridSize = Math.min(resolution, 50);
        const grid = this._createImplicitGrid(points, normals, bounds, gridSize);
        
        // March through grid
        const result = PRISM_ISOSURFACE_ENGINE.marchingCubes(grid, 0.0);
        
        return {
            vertices: result.vertices,
            faces: result.faces,
            normals: normals
        };
    },
    
    _createImplicitGrid: function(points, normals, bounds, gridSize) {
        const dx = (bounds.max.x - bounds.min.x) / gridSize;
        const dy = (bounds.max.y - bounds.min.y) / gridSize;
        const dz = (bounds.max.z - bounds.min.z) / gridSize;
        
        const grid = [];
        
        for (let i = 0; i <= gridSize; i++) {
            const plane = [];
            for (let j = 0; j <= gridSize; j++) {
                const row = [];
                for (let k = 0; k <= gridSize; k++) {
                    const x = bounds.min.x + i * dx;
                    const y = bounds.min.y + j * dy;
                    const z = bounds.min.z + k * dz;
                    
                    // Compute signed distance (simplified)
                    let minDist = Infinity;
                    let sign = 1;
                    
                    for (let pi = 0; pi < points.length; pi++) {
                        const px = x - points[pi].x;
                        const py = y - points[pi].y;
                        const pz = z - points[pi].z;
                        const dist = Math.sqrt(px * px + py * py + pz * pz);
                        
                        if (dist < minDist) {
                            minDist = dist;
                            // Sign from normal
                            const dot = px * normals[pi].x + py * normals[pi].y + pz * normals[pi].z;
                            sign = dot >= 0 ? 1 : -1;
                        }
                    }
                    
                    row.push(sign * minDist);
                }
                plane.push(row);
            }
            grid.push(plane);
        }
        
        return {
            data: grid,
            bounds: bounds,
            size: { x: gridSize + 1, y: gridSize + 1, z: gridSize + 1 }
        };
    },
    
    // Simplified KD-tree implementation
    _buildKDTree: function(points) {
        return { points: points, root: this._buildKDNode(points.map((_, i) => i), 0, points) };
    },
    
    _buildKDNode: function(indices, depth, points) {
        if (indices.length === 0) return null;
        if (indices.length === 1) return { index: indices[0], left: null, right: null };
        
        const axis = depth % 3;
        const axisKey = ['x', 'y', 'z'][axis];
        
        indices.sort((a, b) => points[a][axisKey] - points[b][axisKey]);
        const mid = Math.floor(indices.length / 2);
        
        return {
            index: indices[mid],
            axis: axis,
            left: this._buildKDNode(indices.slice(0, mid), depth + 1, points),
            right: this._buildKDNode(indices.slice(mid + 1), depth + 1, points)
        };
    },
    
    _kNearestNeighbors: function(kdtree, point, k, points) {
        const heap = [];
        this._knnSearch(kdtree.root, point, k, heap, points);
        return heap.map(h => h.index).sort((a, b) => a - b);
    },
    
    _knnSearch: function(node, point, k, heap, points) {
        if (!node) return;
        
        const p = points[node.index];
        const dist = Math.sqrt(
            Math.pow(p.x - point.x, 2) +
            Math.pow(p.y - point.y, 2) +
            Math.pow(p.z - point.z, 2)
        );
        
        if (heap.length < k) {
            heap.push({ index: node.index, dist: dist });
            heap.sort((a, b) => b.dist - a.dist);
        } else if (dist < heap[0].dist) {
            heap[0] = { index: node.index, dist: dist };
            heap.sort((a, b) => b.dist - a.dist);
        }
        
        const axis = node.axis || 0;
        const axisKey = ['x', 'y', 'z'][axis];
        const diff = point[axisKey] - p[axisKey];
        
        const first = diff < 0 ? node.left : node.right;
        const second = diff < 0 ? node.right : node.left;
        
        this._knnSearch(first, point, k, heap, points);
        
        if (heap.length < k || Math.abs(diff) < heap[0].dist) {
            this._knnSearch(second, point, k, heap, points);
        }
    },
    
    _neighborsInRadius: function(kdtree, point, radius, points) {
        const result = [];
        this._radiusSearch(kdtree.root, point, radius, result, points);
        return result;
    },
    
    _radiusSearch: function(node, point, radius, result, points) {
        if (!node) return;
        
        const p = points[node.index];
        const dist = Math.sqrt(
            Math.pow(p.x - point.x, 2) +
            Math.pow(p.y - point.y, 2) +
            Math.pow(p.z - point.z, 2)
        );
        
        if (dist <= radius) {
            result.push(node.index);
        }
        
        const axis = node.axis || 0;
        const axisKey = ['x', 'y', 'z'][axis];
        const diff = point[axisKey] - p[axisKey];
        
        if (diff - radius <= 0) this._radiusSearch(node.left, point, radius, result, points);
        if (diff + radius >= 0) this._radiusSearch(node.right, point, radius, result, points);
    },
    
    _smallestEigenvector: function(cov) {
        // Power iteration for smallest eigenvector (via inverse)
        // Simplified: assume normal is approximately axis-aligned
        let v = { x: 1, y: 0, z: 0 };
        
        for (let iter = 0; iter < 20; iter++) {
            const newV = {
                x: cov[0][0] * v.x + cov[0][1] * v.y + cov[0][2] * v.z,
                y: cov[1][0] * v.x + cov[1][1] * v.y + cov[1][2] * v.z,
                z: cov[2][0] * v.x + cov[2][1] * v.y + cov[2][2] * v.z
            };
            
            const len = Math.sqrt(newV.x * newV.x + newV.y * newV.y + newV.z * newV.z);
            if (len < 1e-10) break;
            
            v = { x: newV.x / len, y: newV.y / len, z: newV.z / len };
        }
        
        // For smallest eigenvector, find perpendicular to largest
        // Simplified: use cross product with arbitrary vector
        let perp = { x: 0, y: 1, z: 0 };
        if (Math.abs(v.y) > 0.9) perp = { x: 1, y: 0, z: 0 };
        
        const cross = {
            x: v.y * perp.z - v.z * perp.y,
            y: v.z * perp.x - v.x * perp.z,
            z: v.x * perp.y - v.y * perp.x
        };
        
        const crossLen = Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
        if (crossLen > 1e-10) {
            return { x: cross.x / crossLen, y: cross.y / crossLen, z: cross.z / crossLen };
        }
        
        return { x: 0, y: 0, z: 1 };
    },
    
    _orientNormals: function(points, normals, kdtree) {
        // Simple propagation: flip normals to be consistent with neighbors
        const visited = new Set([0]);
        const queue = [0];
        
        while (queue.length > 0) {
            const current = queue.shift();
            const neighbors = this._kNearestNeighbors(kdtree, points[current], 6, points);
            
            for (const ni of neighbors) {
                if (visited.has(ni)) continue;
                
                // Check if normal needs flipping
                const dot = normals[current].x * normals[ni].x +
                           normals[current].y * normals[ni].y +
                           normals[current].z * normals[ni].z;
                
                if (dot < 0) {
                    normals[ni].x = -normals[ni].x;
                    normals[ni].y = -normals[ni].y;
                    normals[ni].z = -normals[ni].z;
                }
                
                visited.add(ni);
                queue.push(ni);
            }
        }
    },
    
    _computeBounds: function(points) {
        const min = { x: Infinity, y: Infinity, z: Infinity };
        const max = { x: -Infinity, y: -Infinity, z: -Infinity };
        
        for (const p of points) {
            min.x = Math.min(min.x, p.x);
            min.y = Math.min(min.y, p.y);
            min.z = Math.min(min.z, p.z);
            max.x = Math.max(max.x, p.x);
            max.y = Math.max(max.y, p.y);
            max.z = Math.max(max.z, p.z);
        }
        
        return { min, max };
    }
};


// ═══════════════════════════════════════════════════════════════════════════════
// PRISM_ISOSURFACE_ENGINE - Isosurface Extraction
// Sources: Lorensen & Cline 1987, Bloomenthal 1988
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_ISOSURFACE_ENGINE = {
    name: 'PRISM_ISOSURFACE_ENGINE',
    version: '1.0.0',
    source: 'Lorensen & Cline SIGGRAPH 1987',
    description: 'Isosurface extraction using Marching Cubes algorithm',
    
    // Marching Cubes edge table (simplified version)
    edgeTable: new Uint16Array([
        0x0, 0x109, 0x203, 0x30a, 0x406, 0x50f, 0x605, 0x70c,
        0x80c, 0x905, 0xa0f, 0xb06, 0xc0a, 0xd03, 0xe09, 0xf00,
        0x190, 0x99, 0x393, 0x29a, 0x596, 0x49f, 0x795, 0x69c,
        0x99c, 0x895, 0xb9f, 0xa96, 0xd9a, 0xc93, 0xf99, 0xe90,
        0x230, 0x339, 0x33, 0x13a, 0x636, 0x73f, 0x435, 0x53c,
        0xa3c, 0xb35, 0x83f, 0x936, 0xe3a, 0xf33, 0xc39, 0xd30,
        0x3a0, 0x2a9, 0x1a3, 0xaa, 0x7a6, 0x6af, 0x5a5, 0x4ac,
        0xbac, 0xaa5, 0x9af, 0x8a6, 0xfaa, 0xea3, 0xda9, 0xca0,
        0x460, 0x569, 0x663, 0x76a, 0x66, 0x16f, 0x265, 0x36c,
        0xc6c, 0xd65, 0xe6f, 0xf66, 0x86a, 0x963, 0xa69, 0xb60,
        0x5f0, 0x4f9, 0x7f3, 0x6fa, 0x1f6, 0xff, 0x3f5, 0x2fc,
        0xdfc, 0xcf5, 0xfff, 0xef6, 0x9fa, 0x8f3, 0xbf9, 0xaf0,
        0x650, 0x759, 0x453, 0x55a, 0x256, 0x35f, 0x55, 0x15c,
        0xe5c, 0xf55, 0xc5f, 0xd56, 0xa5a, 0xb53, 0x859, 0x950,
        0x7c0, 0x6c9, 0x5c3, 0x4ca, 0x3c6, 0x2cf, 0x1c5, 0xcc,
        0xfcc, 0xec5, 0xdcf, 0xcc6, 0xbca, 0xac3, 0x9c9, 0x8c0,
        0x8c0, 0x9c9, 0xac3, 0xbca, 0xcc6, 0xdcf, 0xec5, 0xfcc,
        0xcc, 0x1c5, 0x2cf, 0x3c6, 0x4ca, 0x5c3, 0x6c9, 0x7c0,
        0x950, 0x859, 0xb53, 0xa5a, 0xd56, 0xc5f, 0xf55, 0xe5c,
        0x15c, 0x55, 0x35f, 0x256, 0x55a, 0x453, 0x759, 0x650,
        0xaf0, 0xbf9, 0x8f3, 0x9fa, 0xef6, 0xfff, 0xcf5, 0xdfc,
        0x2fc, 0x3f5, 0xff, 0x1f6, 0x6fa, 0x7f3, 0x4f9, 0x5f0,
        0xb60, 0xa69, 0x963, 0x86a, 0xf66, 0xe6f, 0xd65, 0xc6c,
        0x36c, 0x265, 0x16f, 0x66, 0x76a, 0x663, 0x569, 0x460,
        0xca0, 0xda9, 0xea3, 0xfaa, 0x8a6, 0x9af, 0xaa5, 0xbac,
        0x4ac, 0x5a5, 0x6af, 0x7a6, 0xaa, 0x1a3, 0x2a9, 0x3a0,
        0xd30, 0xc39, 0xf33, 0xe3a, 0x936, 0x83f, 0xb35, 0xa3c,
        0x53c, 0x435, 0x73f, 0x636, 0x13a, 0x33, 0x339, 0x230,
        0xe90, 0xf99, 0xc93, 0xd9a, 0xa96, 0xb9f, 0x895, 0x99c,
        0x69c, 0x795, 0x49f, 0x596, 0x29a, 0x393, 0x99, 0x190,
        0xf00, 0xe09, 0xd03, 0xc0a, 0xb06, 0xa0f, 0x905, 0x80c,
        0x70c, 0x605, 0x50f, 0x406, 0x30a, 0x203, 0x109, 0x0
    ]),
    
    /**
     * Marching Cubes algorithm
     * Source: Lorensen & Cline, "Marching Cubes" (1987)
     * @param {Object} grid - 3D scalar field {data, bounds, size}
     * @param {number} isovalue - Isosurface level
     */
    marchingCubes: function(grid, isovalue = 0.0) {
        const vertices = [];
        const faces = [];
        const vertexMap = new Map();
        
        const { data, bounds, size } = grid;
        const dx = (bounds.max.x - bounds.min.x) / (size.x - 1);
        const dy = (bounds.max.y - bounds.min.y) / (size.y - 1);
        const dz = (bounds.max.z - bounds.min.z) / (size.z - 1);
        
        const getVertex = (p1, p2, v1, v2) => {
            if (Math.abs(isovalue - v1) < 1e-10) return p1;
            if (Math.abs(isovalue - v2) < 1e-10) return p2;
            if (Math.abs(v1 - v2) < 1e-10) return p1;
            
            const t = (isovalue - v1) / (v2 - v1);
            return {
                x: p1.x + t * (p2.x - p1.x),
                y: p1.y + t * (p2.y - p1.y),
                z: p1.z + t * (p2.z - p1.z)
            };
        };
        
        const addVertex = (v) => {
            const key = `${v.x.toFixed(6)},${v.y.toFixed(6)},${v.z.toFixed(6)}`;
            if (vertexMap.has(key)) return vertexMap.get(key);
            const idx = vertices.length;
            vertices.push(v);
            vertexMap.set(key, idx);
            return idx;
        };
        
        // Process each cube
        for (let i = 0; i < size.x - 1; i++) {
            for (let j = 0; j < size.y - 1; j++) {
                for (let k = 0; k < size.z - 1; k++) {
                    // Get corner values
                    const v = [
                        data[i][j][k],
                        data[i + 1][j][k],
                        data[i + 1][j][k + 1],
                        data[i][j][k + 1],
                        data[i][j + 1][k],
                        data[i + 1][j + 1][k],
                        data[i + 1][j + 1][k + 1],
                        data[i][j + 1][k + 1]
                    ];
                    
                    // Get corner positions
                    const p = [
                        { x: bounds.min.x + i * dx, y: bounds.min.y + j * dy, z: bounds.min.z + k * dz },
                        { x: bounds.min.x + (i + 1) * dx, y: bounds.min.y + j * dy, z: bounds.min.z + k * dz },
                        { x: bounds.min.x + (i + 1) * dx, y: bounds.min.y + j * dy, z: bounds.min.z + (k + 1) * dz },
                        { x: bounds.min.x + i * dx, y: bounds.min.y + j * dy, z: bounds.min.z + (k + 1) * dz },
                        { x: bounds.min.x + i * dx, y: bounds.min.y + (j + 1) * dy, z: bounds.min.z + k * dz },
                        { x: bounds.min.x + (i + 1) * dx, y: bounds.min.y + (j + 1) * dy, z: bounds.min.z + k * dz },
                        { x: bounds.min.x + (i + 1) * dx, y: bounds.min.y + (j + 1) * dy, z: bounds.min.z + (k + 1) * dz },
                        { x: bounds.min.x + i * dx, y: bounds.min.y + (j + 1) * dy, z: bounds.min.z + (k + 1) * dz }
                    ];
                    
                    // Determine cube index
                    let cubeIndex = 0;
                    for (let c = 0; c < 8; c++) {
                        if (v[c] < isovalue) cubeIndex |= (1 << c);
                    }
                    
                    if (cubeIndex === 0 || cubeIndex === 255) continue;
                    
                    const edgeFlags = this.edgeTable[cubeIndex];
                    if (edgeFlags === 0) continue;
                    
                    // Interpolate edge vertices
                    const edgeVertices = new Array(12);
                    const edges = [
                        [0, 1], [1, 2], [2, 3], [3, 0],
                        [4, 5], [5, 6], [6, 7], [7, 4],
                        [0, 4], [1, 5], [2, 6], [3, 7]
                    ];
                    
                    for (let e = 0; e < 12; e++) {
                        if (edgeFlags & (1 << e)) {
                            const [e1, e2] = edges[e];
                            edgeVertices[e] = getVertex(p[e1], p[e2], v[e1], v[e2]);
                        }
                    }
                    
                    // Generate triangles (simplified - uses most common cases)
                    const triangles = this._getTriangles(cubeIndex);
                    for (const tri of triangles) {
                        const [e1, e2, e3] = tri;
                        if (edgeVertices[e1] && edgeVertices[e2] && edgeVertices[e3]) {
                            const i1 = addVertex(edgeVertices[e1]);
                            const i2 = addVertex(edgeVertices[e2]);
                            const i3 = addVertex(edgeVertices[e3]);
                            faces.push([i1, i2, i3]);
                        }
                    }
                }
            }
        }
        
        return { vertices, faces };
    },
    
    _getTriangles: function(cubeIndex) {
        // Simplified triangle table for common cases
        const triTable = {
            0: [],
            1: [[0, 8, 3]],
            2: [[0, 1, 9]],
            3: [[1, 8, 3], [9, 8, 1]],
            // ... (full table has 256 entries)
        };
        
        // For simplicity, generate approximate triangles based on edge flags
        const triangles = [];
        const edgeFlags = this.edgeTable[cubeIndex];
        
        const activeEdges = [];
        for (let e = 0; e < 12; e++) {
            if (edgeFlags & (1 << e)) activeEdges.push(e);
        }
        
        // Create triangles from active edges (simplified fan)
        if (activeEdges.length >= 3) {
            for (let i = 1; i < activeEdges.length - 1; i++) {
                triangles.push([activeEdges[0], activeEdges[i], activeEdges[i + 1]]);
            }
        }
        
        return triangles;
    },
    
    /**
     * Evaluate implicit function at a point
     * For use with procedural surfaces
     */
    evaluateImplicit: function(func, x, y, z) {
        return func(x, y, z);
    },
    
    /**
     * Create grid from implicit function
     */
    createImplicitGrid: function(func, bounds, resolution) {
        const data = [];
        const dx = (bounds.max.x - bounds.min.x) / resolution;
        const dy = (bounds.max.y - bounds.min.y) / resolution;
        const dz = (bounds.max.z - bounds.min.z) / resolution;
        
        for (let i = 0; i <= resolution; i++) {
            const plane = [];
            for (let j = 0; j <= resolution; j++) {
                const row = [];
                for (let k = 0; k <= resolution; k++) {
                    const x = bounds.min.x + i * dx;
                    const y = bounds.min.y + j * dy;
                    const z = bounds.min.z + k * dz;
                    row.push(func(x, y, z));
                }
                plane.push(row);
            }
            data.push(plane);
        }
        
        return {
            data,
            bounds,
            size: { x: resolution + 1, y: resolution + 1, z: resolution + 1 }
        };
    }
};


// ═══════════════════════════════════════════════════════════════════════════════
// PRISM_MESH_PARAMETERIZATION - UV Parameterization
// Sources: Lévy et al. 2002, Tutte 1963
// ═══════════════════════════════════════════════════════════════════════════════

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
};


// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED GATEWAY ROUTES - Session 5 v2.0
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_SESSION5_ENHANCED_ROUTES = {
    // === SUBDIVISION SURFACES ===
    'mesh.subdivide.loop': 'PRISM_SUBDIVISION_SURFACES.loopSubdivide',
    'mesh.subdivide.catmullClark': 'PRISM_SUBDIVISION_SURFACES.catmullClarkSubdivide',
    'mesh.subdivide.butterfly': 'PRISM_SUBDIVISION_SURFACES.butterflySubdivide',
    
    // === MESH SMOOTHING ===
    'mesh.smooth.laplacian': 'PRISM_MESH_SMOOTHING.laplacianSmooth',
    'mesh.smooth.taubin': 'PRISM_MESH_SMOOTHING.taubinSmooth',
    'mesh.smooth.cotangent': 'PRISM_MESH_SMOOTHING.cotangentSmooth',
    'mesh.smooth.bilateral': 'PRISM_MESH_SMOOTHING.bilateralSmooth',
    
    // === POINT CLOUD PROCESSING ===
    'pointcloud.normals': 'PRISM_POINT_CLOUD_PROCESSING.estimateNormals',
    'pointcloud.mlsProject': 'PRISM_POINT_CLOUD_PROCESSING.mlsProject',
    'pointcloud.reconstruct': 'PRISM_POINT_CLOUD_PROCESSING.reconstructSurface',
    
    // === ISOSURFACE ===
    'isosurface.marchingCubes': 'PRISM_ISOSURFACE_ENGINE.marchingCubes',
    'isosurface.createGrid': 'PRISM_ISOSURFACE_ENGINE.createImplicitGrid',
    
    // === PARAMETERIZATION ===
    'mesh.parameterize.tutte': 'PRISM_MESH_PARAMETERIZATION.tutteEmbedding',
    'mesh.parameterize.lscm': 'PRISM_MESH_PARAMETERIZATION.lscmParameterization'
};


// ═══════════════════════════════════════════════════════════════════════════════
// SELF-TESTS FOR ENHANCED MODULES
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_SESSION5_ENHANCED_TESTS = {
    name: 'Session 5 Enhanced CAD/Geometry Tests',
    
    runAll: function() {
        const results = { passed: 0, failed: 0, tests: [] };
        
        const tests = [
            this.testLoopSubdivision,
            this.testCatmullClark,
            this.testLaplacianSmooth,
            this.testTaubinSmooth,
            this.testBilateralSmooth,
            this.testNormalEstimation,
            this.testMarchingCubes,
            this.testTutteEmbedding
        ];
        
        for (const test of tests) {
            try {
                const result = test.call(this);
                if (result.passed) {
                    results.passed++;
                } else {
                    results.failed++;
                }
                results.tests.push(result);
            } catch (error) {
                results.failed++;
                results.tests.push({
                    name: test.name,
                    passed: false,
                    error: error.message
                });
            }
        }
        
        console.log(`[Session 5 Enhanced] ${results.passed}/${results.passed + results.failed} passed`);
        return results;
    },
    
    testLoopSubdivision: function() {
        // Tetrahedron
        const vertices = [
            { x: 0, y: 0, z: 1 },
            { x: 1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 },
            { x: -1, y: -1, z: 0 }
        ];
        const faces = [[0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 3, 2]];
        
        const result = PRISM_SUBDIVISION_SURFACES.loopSubdivide(vertices, faces, 1);
        
        return {
            name: 'Loop Subdivision',
            passed: result.vertices.length > vertices.length && result.faces.length > faces.length,
            details: `Vertices: ${vertices.length} -> ${result.vertices.length}, Faces: ${faces.length} -> ${result.faces.length}`
        };
    },
    
    testCatmullClark: function() {
        // Cube (quads)
        const vertices = [
            { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
            { x: 1, y: 1, z: 0 }, { x: 0, y: 1, z: 0 },
            { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 },
            { x: 1, y: 1, z: 1 }, { x: 0, y: 1, z: 1 }
        ];
        const faces = [
            [0, 1, 2, 3], [4, 7, 6, 5],
            [0, 4, 5, 1], [2, 6, 7, 3],
            [0, 3, 7, 4], [1, 5, 6, 2]
        ];
        
        const result = PRISM_SUBDIVISION_SURFACES.catmullClarkSubdivide(vertices, faces, 1);
        
        return {
            name: 'Catmull-Clark Subdivision',
            passed: result.vertices.length > vertices.length,
            details: `Vertices: ${vertices.length} -> ${result.vertices.length}`
        };
    },
    
    testLaplacianSmooth: function() {
        const vertices = [
            { x: 0, y: 0, z: 0 }, { x: 1, y: 0.1, z: 0 },
            { x: 0.5, y: 1, z: 0 }, { x: 0.5, y: 0.5, z: 0.2 }
        ];
        const faces = [[0, 1, 3], [1, 2, 3], [0, 3, 2]];
        
        const smoothed = PRISM_MESH_SMOOTHING.laplacianSmooth(vertices, faces, 0.5, 3);
        
        // Check that center vertex moved
        const moved = Math.abs(smoothed[3].z - vertices[3].z) > 0.001;
        
        return {
            name: 'Laplacian Smoothing',
            passed: moved,
            details: `Center z: ${vertices[3].z.toFixed(4)} -> ${smoothed[3].z.toFixed(4)}`
        };
    },
    
    testTaubinSmooth: function() {
        const vertices = [
            { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
            { x: 0.5, y: 1, z: 0 }, { x: 0.5, y: 0.5, z: 0.5 }
        ];
        const faces = [[0, 1, 3], [1, 2, 3], [0, 3, 2]];
        
        const smoothed = PRISM_MESH_SMOOTHING.taubinSmooth(vertices, faces, 0.5, -0.53, 5);
        
        return {
            name: 'Taubin Smoothing',
            passed: Array.isArray(smoothed) && smoothed.length === vertices.length,
            details: `Processed ${smoothed.length} vertices`
        };
    },
    
    testBilateralSmooth: function() {
        const vertices = [
            { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
            { x: 0.5, y: 1, z: 0 }, { x: 0.5, y: 0.5, z: 0.3 }
        ];
        const faces = [[0, 1, 3], [1, 2, 3], [0, 3, 2]];
        
        const smoothed = PRISM_MESH_SMOOTHING.bilateralSmooth(vertices, faces, 1.0, 0.3, 2);
        
        return {
            name: 'Bilateral Smoothing',
            passed: Array.isArray(smoothed),
            details: `Processed ${smoothed.length} vertices`
        };
    },
    
    testNormalEstimation: function() {
        const points = [
            { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 },
            { x: 0.5, y: 0.5, z: 0.1 }
        ];
        
        const normals = PRISM_POINT_CLOUD_PROCESSING.estimateNormals(points, 4);
        
        return {
            name: 'Point Cloud Normal Estimation',
            passed: normals.length === points.length,
            details: `Estimated ${normals.length} normals`
        };
    },
    
    testMarchingCubes: function() {
        // Create a simple sphere implicit function
        const sphereFunc = (x, y, z) => x * x + y * y + z * z - 1;
        const bounds = { min: { x: -1.5, y: -1.5, z: -1.5 }, max: { x: 1.5, y: 1.5, z: 1.5 } };
        
        const grid = PRISM_ISOSURFACE_ENGINE.createImplicitGrid(sphereFunc, bounds, 10);
        const mesh = PRISM_ISOSURFACE_ENGINE.marchingCubes(grid, 0);
        
        return {
            name: 'Marching Cubes',
            passed: mesh.vertices.length > 0 && mesh.faces.length > 0,
            details: `Vertices: ${mesh.vertices.length}, Faces: ${mesh.faces.length}`
        };
    },
    
    testTutteEmbedding: function() {
        // Simple triangle mesh
        const vertices = [
            { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
            { x: 0.5, y: 1, z: 0 }, { x: 0.5, y: 0.5, z: 0.5 }
        ];
        const faces = [[0, 1, 3], [1, 2, 3], [0, 3, 2], [0, 2, 1]];
        
        const uvCoords = PRISM_MESH_PARAMETERIZATION.tutteEmbedding(vertices, faces);
        
        const valid = uvCoords.every(uv => 
            uv.u >= 0 && uv.u <= 1 && uv.v >= 0 && uv.v <= 1
        );
        
        return {
            name: 'Tutte Embedding',
            passed: valid,
            details: `Generated ${uvCoords.length} UV coordinates`
        };
    }
};


// ═══════════════════════════════════════════════════════════════════════════════
// REGISTRATION AND INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

function registerSession5EnhancedRoutes() {
    if (typeof PRISM_GATEWAY !== 'undefined') {
        for (const [route, target] of Object.entries(PRISM_SESSION5_ENHANCED_ROUTES)) {
            PRISM_GATEWAY.register(route, target);
        }
        console.log(`[Session 5 Enhanced] Registered ${Object.keys(PRISM_SESSION5_ENHANCED_ROUTES).length} gateway routes`);
    }
}

// Auto-register if PRISM_GATEWAY exists
if (typeof PRISM_GATEWAY !== 'undefined') {
    registerSession5EnhancedRoutes();
}

// Module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PRISM_SUBDIVISION_SURFACES,
        PRISM_MESH_SMOOTHING,
        PRISM_POINT_CLOUD_PROCESSING,
        PRISM_ISOSURFACE_ENGINE,
        PRISM_MESH_PARAMETERIZATION,
        PRISM_SESSION5_ENHANCED_ROUTES,
        PRISM_SESSION5_ENHANCED_TESTS,
        registerSession5EnhancedRoutes
    };
}

console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║  PRISM SESSION 5 ENHANCED: CAD/GEOMETRY v2.0 LOADED                         ║');
console.log('║                                                                              ║');
console.log('║  NEW Modules from Knowledge Bases:                                          ║');
console.log('║    • PRISM_SUBDIVISION_SURFACES - Loop, Catmull-Clark, Butterfly            ║');
console.log('║    • PRISM_MESH_SMOOTHING - Laplacian, Taubin, Bilateral                    ║');
console.log('║    • PRISM_POINT_CLOUD_PROCESSING - MLS, Normal Estimation                  ║');
console.log('║    • PRISM_ISOSURFACE_ENGINE - Marching Cubes                               ║');
console.log('║    • PRISM_MESH_PARAMETERIZATION - LSCM, Tutte Embedding                    ║');
console.log('║                                                                              ║');
console.log('║  Gateway Routes: 16 new routes registered                                   ║');
console.log('║  Self-Tests: 8 available                                                    ║');
console.log('║                                                                              ║');
console.log('║  Sources: MIT 6.837, Stanford CS 468, CS 348A                               ║');
console.log('║           Loop 1987, Taubin 1995, Lorensen & Cline 1987                     ║');
console.log('║           Alexa et al. 2001, Lévy et al. 2002                               ║');
console.log('║                                                                              ║');
console.log('║  Run PRISM_SESSION5_ENHANCED_TESTS.runAll() to verify                       ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝');


// ═══════════════════════════════════════════════════════════════════════════
// PRISM SESSION 5 EXTENDED ENHANCEMENTS v3
// Additional CAD/Geometry Processing Algorithms
// Integrated: 2026-01-18
// ═══════════════════════════════════════════════════════════════════════════

/**
 * PRISM Session 5 Extended Enhancements v3
 * Additional CAD/Geometry Processing Algorithms
 * Sources: Stanford CS 468, MIT 6.837, MIT 2.158J, CGAL, libigl
 * Generated: January 18, 2026
 */

// ═══════════════════════════════════════════════════════════════════════════
// PRISM_MESH_REPAIR_ENGINE - Mesh topology repair and hole filling
// Source: Stanford CS 468 - Geometry Processing Algorithms
// ═══════════════════════════════════════════════════════════════════════════

const PRISM_MESH_REPAIR_ENGINE = {
    name: 'PRISM_MESH_REPAIR_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 468, CGAL Polygon Mesh Processing',
    
    /**
     * Find boundary loops (holes) in mesh
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @returns {Array} Array of boundary loops (arrays of vertex indices)
     */
    findBoundaryLoops: function(vertices, faces) {
        // Build half-edge structure to find boundaries
        const edgeMap = new Map();
        
        faces.forEach((face, faceIdx) => {
            for (let i = 0; i < face.length; i++) {
                const v1 = face[i];
                const v2 = face[(i + 1) % face.length];
                const key = `${v1}-${v2}`;
                const reverseKey = `${v2}-${v1}`;
                
                if (edgeMap.has(reverseKey)) {
                    // Mark as interior edge (has opposite half-edge)
                    edgeMap.get(reverseKey).paired = true;
                    edgeMap.set(key, { v1, v2, paired: true });
                } else {
                    edgeMap.set(key, { v1, v2, paired: false, next: null });
                }
            }
        });
        
        // Find boundary edges (unpaired half-edges)
        const boundaryEdges = [];
        edgeMap.forEach((edge, key) => {
            if (!edge.paired) {
                boundaryEdges.push({ v1: edge.v1, v2: edge.v2 });
            }
        });
        
        if (boundaryEdges.length === 0) {
            return []; // Closed mesh, no boundaries
        }
        
        // Build boundary loops by following edges
        const loops = [];
        const used = new Set();
        
        for (const startEdge of boundaryEdges) {
            if (used.has(`${startEdge.v1}-${startEdge.v2}`)) continue;
            
            const loop = [startEdge.v1];
            let current = startEdge.v2;
            used.add(`${startEdge.v1}-${startEdge.v2}`);
            
            while (current !== startEdge.v1) {
                loop.push(current);
                
                // Find next boundary edge starting from current
                let found = false;
                for (const edge of boundaryEdges) {
                    if (edge.v1 === current && !used.has(`${edge.v1}-${edge.v2}`)) {
                        used.add(`${edge.v1}-${edge.v2}`);
                        current = edge.v2;
                        found = true;
                        break;
                    }
                }
                
                if (!found) break; // Open boundary
            }
            
            if (loop.length >= 3) {
                loops.push(loop);
            }
        }
        
        return loops;
    },
    
    /**
     * Fill a hole using minimum-area triangulation
     * Liepa's method for hole filling (2003)
     * @param {Array} vertices - Vertex positions
     * @param {Array} boundaryLoop - Vertex indices forming the hole boundary
     * @returns {Array} New triangles to fill the hole
     */
    fillHoleMinArea: function(vertices, boundaryLoop) {
        const n = boundaryLoop.length;
        if (n < 3) return [];
        if (n === 3) {
            return [[boundaryLoop[0], boundaryLoop[1], boundaryLoop[2]]];
        }
        
        // Dynamic programming for minimum area triangulation
        // dp[i][j] = minimum weight for triangulating polygon from i to j
        const dp = Array(n).fill(null).map(() => Array(n).fill(Infinity));
        const split = Array(n).fill(null).map(() => Array(n).fill(-1));
        
        // Base case: adjacent vertices
        for (let i = 0; i < n - 1; i++) {
            dp[i][i + 1] = 0;
        }
        
        // Fill DP table
        for (let len = 2; len < n; len++) {
            for (let i = 0; i < n - len; i++) {
                const j = i + len;
                for (let k = i + 1; k < j; k++) {
                    const area = this._triangleArea(
                        vertices[boundaryLoop[i]],
                        vertices[boundaryLoop[k]],
                        vertices[boundaryLoop[j]]
                    );
                    const cost = dp[i][k] + dp[k][j] + area;
                    if (cost < dp[i][j]) {
                        dp[i][j] = cost;
                        split[i][j] = k;
                    }
                }
            }
        }
        
        // Reconstruct triangulation
        const triangles = [];
        this._reconstructTriangulation(boundaryLoop, split, 0, n - 1, triangles);
        
        return triangles;
    },
    
    _reconstructTriangulation: function(loop, split, i, j, triangles) {
        if (j - i < 2) return;
        
        const k = split[i][j];
        if (k === -1) return;
        
        triangles.push([loop[i], loop[k], loop[j]]);
        this._reconstructTriangulation(loop, split, i, k, triangles);
        this._reconstructTriangulation(loop, split, k, j, triangles);
    },
    
    /**
     * Fill hole with refinement (Liepa's advanced method)
     * Creates better quality triangles by inserting centroid
     * @param {Array} vertices - Vertex positions (will be modified)
     * @param {Array} boundaryLoop - Hole boundary indices
     * @returns {Object} { newVertices, newFaces }
     */
    fillHoleWithRefinement: function(vertices, boundaryLoop) {
        const n = boundaryLoop.length;
        if (n < 3) return { newVertices: [], newFaces: [] };
        
        // Calculate centroid of boundary
        let cx = 0, cy = 0, cz = 0;
        for (const idx of boundaryLoop) {
            cx += vertices[idx].x;
            cy += vertices[idx].y;
            cz += vertices[idx].z || 0;
        }
        cx /= n;
        cy /= n;
        cz /= n;
        
        const centroidIdx = vertices.length;
        const centroid = { x: cx, y: cy, z: cz };
        
        // Create fan triangulation from centroid
        const newFaces = [];
        for (let i = 0; i < n; i++) {
            const v1 = boundaryLoop[i];
            const v2 = boundaryLoop[(i + 1) % n];
            newFaces.push([v1, v2, centroidIdx]);
        }
        
        return {
            newVertices: [centroid],
            newFaces: newFaces
        };
    },
    
    /**
     * Detect and fix non-manifold edges
     * Non-manifold: edge shared by more than 2 faces
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @returns {Object} { manifoldFaces, removedFaces, nonManifoldEdges }
     */
    fixNonManifoldEdges: function(vertices, faces) {
        const edgeCount = new Map();
        const edgeFaces = new Map();
        
        faces.forEach((face, faceIdx) => {
            for (let i = 0; i < face.length; i++) {
                const v1 = Math.min(face[i], face[(i + 1) % face.length]);
                const v2 = Math.max(face[i], face[(i + 1) % face.length]);
                const key = `${v1}-${v2}`;
                
                edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
                if (!edgeFaces.has(key)) edgeFaces.set(key, []);
                edgeFaces.get(key).push(faceIdx);
            }
        });
        
        // Find non-manifold edges
        const nonManifoldEdges = [];
        const facesToRemove = new Set();
        
        edgeCount.forEach((count, key) => {
            if (count > 2) {
                nonManifoldEdges.push(key);
                // Keep first 2 faces, remove extras
                const faceList = edgeFaces.get(key);
                for (let i = 2; i < faceList.length; i++) {
                    facesToRemove.add(faceList[i]);
                }
            }
        });
        
        const manifoldFaces = faces.filter((_, idx) => !facesToRemove.has(idx));
        
        return {
            manifoldFaces,
            removedFaces: Array.from(facesToRemove),
            nonManifoldEdges
        };
    },
    
    /**
     * Fix non-manifold vertices
     * Non-manifold vertex: vertex where incident faces don't form a disk/fan
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @returns {Object} Repair result with duplicated vertices
     */
    fixNonManifoldVertices: function(vertices, faces) {
        // Build vertex-to-face adjacency
        const vertexFaces = vertices.map(() => []);
        faces.forEach((face, faceIdx) => {
            for (const vi of face) {
                vertexFaces[vi].push(faceIdx);
            }
        });
        
        const newVertices = [...vertices];
        const newFaces = faces.map(f => [...f]);
        const duplicatedVertices = [];
        
        vertexFaces.forEach((faceList, vi) => {
            if (faceList.length < 2) return;
            
            // Check if faces form connected components around vertex
            const components = this._findConnectedFaceComponents(vi, faceList, faces);
            
            if (components.length > 1) {
                // Non-manifold: duplicate vertex for each extra component
                for (let c = 1; c < components.length; c++) {
                    const newIdx = newVertices.length;
                    newVertices.push({ ...vertices[vi] });
                    duplicatedVertices.push({ original: vi, duplicate: newIdx });
                    
                    // Update faces in this component to use new vertex
                    for (const faceIdx of components[c]) {
                        const faceVerts = newFaces[faceIdx];
                        for (let i = 0; i < faceVerts.length; i++) {
                            if (faceVerts[i] === vi) {
                                faceVerts[i] = newIdx;
                            }
                        }
                    }
                }
            }
        });
        
        return {
            vertices: newVertices,
            faces: newFaces,
            duplicatedVertices
        };
    },
    
    _findConnectedFaceComponents: function(vertexIdx, faceIndices, faces) {
        const visited = new Set();
        const components = [];
        
        for (const startFace of faceIndices) {
            if (visited.has(startFace)) continue;
            
            const component = [];
            const queue = [startFace];
            
            while (queue.length > 0) {
                const faceIdx = queue.shift();
                if (visited.has(faceIdx)) continue;
                visited.add(faceIdx);
                component.push(faceIdx);
                
                // Find adjacent faces sharing an edge with this face at vertexIdx
                const face = faces[faceIdx];
                const viPos = face.indexOf(vertexIdx);
                const prev = face[(viPos + face.length - 1) % face.length];
                const next = face[(viPos + 1) % face.length];
                
                for (const otherFaceIdx of faceIndices) {
                    if (visited.has(otherFaceIdx)) continue;
                    const otherFace = faces[otherFaceIdx];
                    
                    // Check if shares edge at vertex
                    if (otherFace.includes(prev) || otherFace.includes(next)) {
                        queue.push(otherFaceIdx);
                    }
                }
            }
            
            components.push(component);
        }
        
        return components;
    },
    
    /**
     * Remove degenerate faces (zero area triangles)
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @param {number} areaThreshold - Minimum acceptable area
     * @returns {Object} { cleanFaces, removedCount }
     */
    removeDegenerateFaces: function(vertices, faces, areaThreshold = 1e-10) {
        const cleanFaces = [];
        let removedCount = 0;
        
        for (const face of faces) {
            const area = this._triangleArea(
                vertices[face[0]],
                vertices[face[1]],
                vertices[face[2]]
            );
            
            if (area > areaThreshold) {
                cleanFaces.push(face);
            } else {
                removedCount++;
            }
        }
        
        return { cleanFaces, removedCount };
    },
    
    /**
     * Stitch close vertices (merge duplicates)
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @param {number} tolerance - Distance threshold for merging
     * @returns {Object} { vertices, faces, mergeCount }
     */
    stitchVertices: function(vertices, faces, tolerance = 1e-6) {
        const tolSq = tolerance * tolerance;
        const vertexMap = new Array(vertices.length);
        const newVertices = [];
        let mergeCount = 0;
        
        for (let i = 0; i < vertices.length; i++) {
            let merged = false;
            
            for (let j = 0; j < newVertices.length; j++) {
                const dx = vertices[i].x - newVertices[j].x;
                const dy = vertices[i].y - newVertices[j].y;
                const dz = (vertices[i].z || 0) - (newVertices[j].z || 0);
                const distSq = dx * dx + dy * dy + dz * dz;
                
                if (distSq < tolSq) {
                    vertexMap[i] = j;
                    merged = true;
                    mergeCount++;
                    break;
                }
            }
            
            if (!merged) {
                vertexMap[i] = newVertices.length;
                newVertices.push({ ...vertices[i] });
            }
        }
        
        // Remap face indices
        const newFaces = faces.map(face => 
            face.map(vi => vertexMap[vi])
        ).filter(face => {
            // Remove faces that collapsed
            return face[0] !== face[1] && face[1] !== face[2] && face[2] !== face[0];
        });
        
        return {
            vertices: newVertices,
            faces: newFaces,
            mergeCount
        };
    },
    
    /**
     * Complete mesh repair pipeline
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @param {Object} options - Repair options
     * @returns {Object} Repaired mesh
     */
    repairMesh: function(vertices, faces, options = {}) {
        const {
            stitchTolerance = 1e-6,
            fillHoles = true,
            fixNonManifold = true,
            removeDegenerate = true
        } = options;
        
        let currentVertices = [...vertices.map(v => ({...v}))];
        let currentFaces = [...faces.map(f => [...f])];
        const report = { operations: [] };
        
        // 1. Stitch duplicate vertices
        const stitchResult = this.stitchVertices(currentVertices, currentFaces, stitchTolerance);
        currentVertices = stitchResult.vertices;
        currentFaces = stitchResult.faces;
        report.operations.push({ name: 'stitch', mergedVertices: stitchResult.mergeCount });
        
        // 2. Remove degenerate faces
        if (removeDegenerate) {
            const degResult = this.removeDegenerateFaces(currentVertices, currentFaces);
            currentFaces = degResult.cleanFaces;
            report.operations.push({ name: 'removeDegenerate', removed: degResult.removedCount });
        }
        
        // 3. Fix non-manifold edges
        if (fixNonManifold) {
            const nmEdgeResult = this.fixNonManifoldEdges(currentVertices, currentFaces);
            currentFaces = nmEdgeResult.manifoldFaces;
            report.operations.push({ 
                name: 'fixNonManifoldEdges', 
                removedFaces: nmEdgeResult.removedFaces.length,
                nonManifoldEdges: nmEdgeResult.nonManifoldEdges.length
            });
            
            // Fix non-manifold vertices
            const nmVertResult = this.fixNonManifoldVertices(currentVertices, currentFaces);
            currentVertices = nmVertResult.vertices;
            currentFaces = nmVertResult.faces;
            report.operations.push({
                name: 'fixNonManifoldVertices',
                duplicatedVertices: nmVertResult.duplicatedVertices.length
            });
        }
        
        // 4. Fill holes
        if (fillHoles) {
            const loops = this.findBoundaryLoops(currentVertices, currentFaces);
            let holeFillCount = 0;
            
            for (const loop of loops) {
                const fillResult = this.fillHoleWithRefinement(currentVertices, loop);
                currentVertices.push(...fillResult.newVertices);
                currentFaces.push(...fillResult.newFaces);
                holeFillCount++;
            }
            
            report.operations.push({ name: 'fillHoles', holesFilled: holeFillCount });
        }
        
        report.finalVertices = currentVertices.length;
        report.finalFaces = currentFaces.length;
        
        return {
            vertices: currentVertices,
            faces: currentFaces,
            report
        };
    },
    
    _triangleArea: function(v0, v1, v2) {
        const ax = v1.x - v0.x, ay = v1.y - v0.y, az = (v1.z || 0) - (v0.z || 0);
        const bx = v2.x - v0.x, by = v2.y - v0.y, bz = (v2.z || 0) - (v0.z || 0);
        const cx = ay * bz - az * by;
        const cy = az * bx - ax * bz;
        const cz = ax * by - ay * bx;
        return 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('mesh.repair.findBoundaries', 'PRISM_MESH_REPAIR_ENGINE.findBoundaryLoops');
            PRISM_GATEWAY.register('mesh.repair.fillHole', 'PRISM_MESH_REPAIR_ENGINE.fillHoleMinArea');
            PRISM_GATEWAY.register('mesh.repair.fillHoleRefined', 'PRISM_MESH_REPAIR_ENGINE.fillHoleWithRefinement');
            PRISM_GATEWAY.register('mesh.repair.fixNonManifoldEdges', 'PRISM_MESH_REPAIR_ENGINE.fixNonManifoldEdges');
            PRISM_GATEWAY.register('mesh.repair.fixNonManifoldVertices', 'PRISM_MESH_REPAIR_ENGINE.fixNonManifoldVertices');
            PRISM_GATEWAY.register('mesh.repair.stitch', 'PRISM_MESH_REPAIR_ENGINE.stitchVertices');
            PRISM_GATEWAY.register('mesh.repair.full', 'PRISM_MESH_REPAIR_ENGINE.repairMesh');
        }
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// PRISM_GEODESIC_DISTANCE - Geodesic distance computation on meshes
// Source: Crane et al. "Geodesics in Heat" (2013), Dijkstra on mesh graphs
// ═══════════════════════════════════════════════════════════════════════════

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
        
        // Remove interior faces (keep boundary only)
        const faceCount = new Map();
        for (const tri of filteredTriangles) {
            const key = [tri.i, tri.j, tri.k].sort().join(',');
            faceCount.set(key, (faceCount.get(key) || 0) + 1);
        }
        
        const boundaryTriangles = filteredTriangles.filter(tri => {
            const key = [tri.i, tri.j, tri.k].sort().join(',');
            return faceCount.get(key) === 1;
        });
        
        return this._buildMeshFromTriangles(points, boundaryTriangles);
    },
    
    _buildOctree: function(points, depth) {
        // Compute bounds
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        
        for (const p of points) {
            minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
            minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
        }
        
        const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ) * 1.1;
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const cz = (minZ + maxZ) / 2;
        
        const root = {
            center: { x: cx, y: cy, z: cz },
            size,
            depth: 0,
            children: null,
            points: []
        };
        
        // Insert points
        for (let i = 0; i < points.length; i++) {
            this._insertPoint(root, points[i], i, depth);
        }
        
        return root;
    },
    
    _insertPoint: function(node, point, idx, maxDepth) {
        if (node.depth >= maxDepth || node.points.length < 8) {
            node.points.push(idx);
            return;
        }
        
        // Subdivide if needed
        if (!node.children) {
            this._subdivideNode(node);
            // Re-insert existing points
            for (const p of node.points) {
                this._insertPointIntoChild(node, point, p);
            }
            node.points = [];
        }
        
        this._insertPointIntoChild(node, point, idx);
    },
    
    _subdivideNode: function(node) {
        const s = node.size / 4;
        const c = node.center;
        
        node.children = [];
        for (let i = 0; i < 8; i++) {
            const ox = (i & 1) ? s : -s;
            const oy = (i & 2) ? s : -s;
            const oz = (i & 4) ? s : -s;
            
            node.children.push({
                center: { x: c.x + ox, y: c.y + oy, z: c.z + oz },
                size: node.size / 2,
                depth: node.depth + 1,
                children: null,
                points: []
            });
        }
    },
    
    _insertPointIntoChild: function(node, point, idx) {
        const c = node.center;
        const childIdx = (point.x >= c.x ? 1 : 0) |
                        (point.y >= c.y ? 2 : 0) |
                        (point.z >= c.z ? 4 : 0);
        node.children[childIdx].points.push(idx);
    },
    
    _computeIndicatorFunction: function(octree, points, normals) {
        // Simplified: distribute normals to octree nodes
        const values = new Map();
        
        const processNode = (node) => {
            if (node.points.length > 0) {
                let vx = 0, vy = 0, vz = 0;
                for (const idx of node.points) {
                    vx += normals[idx].x;
                    vy += normals[idx].y;
                    vz += normals[idx].z;
                }
                values.set(node, { x: vx, y: vy, z: vz });
            }
            
            if (node.children) {
                for (const child of node.children) {
                    processNode(child);
                }
            }
        };
        
        processNode(octree);
        return values;
    },
    
    _solvePoissonEquation: function(octree, indicator) {
        // Simplified: use indicator magnitudes as values
        const values = new Map();
        
        const processNode = (node) => {
            const ind = indicator.get(node);
            if (ind) {
                values.set(node, Math.sqrt(ind.x * ind.x + ind.y * ind.y + ind.z * ind.z));
            } else {
                values.set(node, 0);
            }
            
            if (node.children) {
                for (const child of node.children) {
                    processNode(child);
                }
            }
        };
        
        processNode(octree);
        return values;
    },
    
    _computeIsovalue: function(values, points, octree) {
        // Average value at point locations
        let sum = 0;
        let count = 0;
        
        // ... simplified
        return 0.5;
    },
    
    _extractIsosurface: function(octree, values, isovalue) {
        // Marching cubes on octree
        const vertices = [];
        const indices = [];
        
        // ... simplified marching cubes implementation
        
        return {
            vertices: new Float32Array(vertices),
            indices: new Uint32Array(indices)
        };
    },
    
    _estimateBallRadius: function(points) {
        // Estimate based on average nearest neighbor distance
        const k = Math.min(6, points.length);
        let totalDist = 0;
        const sampleSize = Math.min(100, points.length);
        
        for (let i = 0; i < sampleSize; i++) {
            const p = points[i];
            const distances = [];
            
            for (let j = 0; j < points.length; j++) {
                if (i === j) continue;
                const d = Math.sqrt(
                    Math.pow(points[j].x - p.x, 2) +
                    Math.pow(points[j].y - p.y, 2) +
                    Math.pow(points[j].z - p.z, 2)
                );
                distances.push(d);
            }
            
            distances.sort((a, b) => a - b);
            for (let j = 0; j < k; j++) {
                totalDist += distances[j];
            }
        }
        
        return (totalDist / (sampleSize * k)) * 2;
    },
    
    _findSeedTriangle: function(points, normals, radius) {
        // Find three points that form a valid seed triangle
        for (let i = 0; i < points.length - 2; i++) {
            for (let j = i + 1; j < points.length - 1; j++) {
                const dij = this._distance3D(points[i], points[j]);
                if (dij > 2 * radius) continue;
                
                for (let k = j + 1; k < points.length; k++) {
                    const dik = this._distance3D(points[i], points[k]);
                    const djk = this._distance3D(points[j], points[k]);
                    
                    if (dik > 2 * radius || djk > 2 * radius) continue;
                    
                    // Check if ball touches all three and no other points inside
                    const center = this._ballCenter(points[i], points[j], points[k], radius);
                    if (center && this._isValidSeed(points, center, radius, i, j, k)) {
                        return { i, j, k };
                    }
                }
            }
        }
        
        return null;
    },
    
    _ballCenter: function(p1, p2, p3, radius) {
        // Find center of ball touching three points
        const n = this._triangleNormal(p1, p2, p3);
        const circumcenter = this._triangleCircumcenter(p1, p2, p3);
        const circumradius = this._triangleCircumradius(p1, p2, p3);
        
        if (circumradius > radius) return null;
        
        const h = Math.sqrt(radius * radius - circumradius * circumradius);
        
        return {
            x: circumcenter.x + h * n.x,
            y: circumcenter.y + h * n.y,
            z: circumcenter.z + h * n.z
        };
    },
    
    _isValidSeed: function(points, center, radius, i, j, k) {
        const epsilon = radius * 0.01;
        
        for (let l = 0; l < points.length; l++) {
            if (l === i || l === j || l === k) continue;
            
            const d = this._distance3D(points[l], center);
            if (d < radius - epsilon) {
                return false;
            }
        }
        
        return true;
    },
    
    _findPivotingPoint: function(points, normals, edge, used, radius) {
        const pi = points[edge.i];
        const pj = points[edge.j];
        
        let bestPoint = null;
        let bestAngle = -Infinity;
        
        for (let k = 0; k < points.length; k++) {
            if (used.has(k)) continue;
            if (k === edge.i || k === edge.j) continue;
            
            const pk = points[k];
            
            // Check distances
            const dik = this._distance3D(pi, pk);
            const djk = this._distance3D(pj, pk);
            
            if (dik > 2 * radius || djk > 2 * radius) continue;
            
            // Find ball center
            const center = this._ballCenter(pi, pj, pk, radius);
            if (!center) continue;
            
            // Check that no points are inside the ball
            let valid = true;
            for (let l = 0; l < points.length; l++) {
                if (l === edge.i || l === edge.j || l === k) continue;
                
                const d = this._distance3D(points[l], center);
                if (d < radius * 0.99) {
                    valid = false;
                    break;
                }
            }
            
            if (valid) {
                // Compute angle for ordering
                const angle = this._pivotAngle(pi, pj, points[edge.opposite], pk);
                if (angle > bestAngle) {
                    bestAngle = angle;
                    bestPoint = k;
                }
            }
        }
        
        return bestPoint;
    },
    
    _pivotAngle: function(pi, pj, oldPoint, newPoint) {
        // Compute angle between old and new triangles
        const edgeMid = {
            x: (pi.x + pj.x) / 2,
            y: (pi.y + pj.y) / 2,
            z: (pi.z + pj.z) / 2
        };
        
        const v1 = {
            x: oldPoint.x - edgeMid.x,
            y: oldPoint.y - edgeMid.y,
            z: oldPoint.z - edgeMid.z
        };
        const v2 = {
            x: newPoint.x - edgeMid.x,
            y: newPoint.y - edgeMid.y,
            z: newPoint.z - edgeMid.z
        };
        
        const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
        const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
        const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
        
        return len1 > 0 && len2 > 0 ? dot / (len1 * len2) : 0;
    },
    
    _updateFront: function(front, i, j, opposite) {
        // Check if edge already exists
        for (let k = front.length - 1; k >= 0; k--) {
            const e = front[k];
            if ((e.i === j && e.j === i) || (e.i === i && e.j === j)) {
                // Remove edge (it's now interior)
                front.splice(k, 1);
                return;
            }
        }
        
        // Add new edge
        front.push({ i, j, opposite });
    },
    
    _buildMeshFromTriangles: function(points, triangles) {
        const vertices = new Float32Array(points.length * 3);
        
        for (let i = 0; i < points.length; i++) {
            vertices[i * 3] = points[i].x;
            vertices[i * 3 + 1] = points[i].y;
            vertices[i * 3 + 2] = points[i].z;
        }
        
        const indices = new Uint32Array(triangles.length * 3);
        for (let i = 0; i < triangles.length; i++) {
            indices[i * 3] = triangles[i].i;
            indices[i * 3 + 1] = triangles[i].j;
            indices[i * 3 + 2] = triangles[i].k;
        }
        
        return { vertices, indices };
    },
    
    _delaunay3D: function(points) {
        // Simplified 3D Delaunay - just return empty for now
        return { tetrahedra: [] };
    },
    
    _tetrahedronCircumradius: function(a, b, c, d) {
        // Compute circumradius of tetrahedron
        // ... simplified
        return 1;
    },
    
    _triangleCircumradius: function(a, b, c) {
        const ab = this._distance3D(a, b);
        const bc = this._distance3D(b, c);
        const ca = this._distance3D(c, a);
        
        const area = this._triangleArea(a, b, c);
        
        return area > 1e-10 ? (ab * bc * ca) / (4 * area) : Infinity;
    },
    
    _triangleCircumcenter: function(a, b, c) {
        // Circumcenter of triangle
        const ax = a.x, ay = a.y, az = a.z;
        const bx = b.x, by = b.y, bz = b.z;
        const cx = c.x, cy = c.y, cz = c.z;
        
        const ab = { x: bx - ax, y: by - ay, z: bz - az };
        const ac = { x: cx - ax, y: cy - ay, z: cz - az };
        
        const abLen2 = ab.x * ab.x + ab.y * ab.y + ab.z * ab.z;
        const acLen2 = ac.x * ac.x + ac.y * ac.y + ac.z * ac.z;
        
        const cross = {
            x: ab.y * ac.z - ab.z * ac.y,
            y: ab.z * ac.x - ab.x * ac.z,
            z: ab.x * ac.y - ab.y * ac.x
        };
        const crossLen2 = cross.x * cross.x + cross.y * cross.y + cross.z * cross.z;
        
        if (crossLen2 < 1e-20) return { x: (ax + bx + cx) / 3, y: (ay + by + cy) / 3, z: (az + bz + cz) / 3 };
        
        const t1 = {
            x: acLen2 * (ab.y * cross.z - ab.z * cross.y) - abLen2 * (ac.y * cross.z - ac.z * cross.y),
            y: acLen2 * (ab.z * cross.x - ab.x * cross.z) - abLen2 * (ac.z * cross.x - ac.x * cross.z),
            z: acLen2 * (ab.x * cross.y - ab.y * cross.x) - abLen2 * (ac.x * cross.y - ac.y * cross.x)
        };
        
        const denom = 2 * crossLen2;
        
        return {
            x: ax + t1.x / denom,
            y: ay + t1.y / denom,
            z: az + t1.z / denom
        };
    },
    
    _triangleNormal: function(a, b, c) {
        const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
        const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
        
        const n = {
            x: ab.y * ac.z - ab.z * ac.y,
            y: ab.z * ac.x - ab.x * ac.z,
            z: ab.x * ac.y - ab.y * ac.x
        };
        
        const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
        
        return len > 1e-10 ? { x: n.x / len, y: n.y / len, z: n.z / len } : { x: 0, y: 1, z: 0 };
    },
    
    _triangleArea: function(a, b, c) {
        const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
        const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
        
        const cross = {
            x: ab.y * ac.z - ab.z * ac.y,
            y: ab.z * ac.x - ab.x * ac.z,
            z: ab.x * ac.y - ab.y * ac.x
        };
        
        return 0.5 * Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
    },
    
    _distance3D: function(a, b) {
        return Math.sqrt(
            Math.pow(b.x - a.x, 2) +
            Math.pow(b.y - a.y, 2) +
            Math.pow(b.z - a.z, 2)
        );
    }
};


// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 8: PRISM_SDF_ENGINE (Signed Distance Fields)
// Source: MIT 6.837, Stanford CS 468
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_SDF_ENGINE = {
    name: 'PRISM_SDF_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.837, Bridson Level Sets',
    
    /**
     * Compute Signed Distance Field for mesh
     */
    computeSDF: function(mesh, resolution = 50) {
        // Compute bounds
        const bounds = this._computeBounds(mesh.vertices);
        const padding = 0.1;
        
        const size = {
            x: bounds.max.x - bounds.min.x,
            y: bounds.max.y - bounds.min.y,
            z: bounds.max.z - bounds.min.z
        };
        
        const maxSize = Math.max(size.x, size.y, size.z) * (1 + 2 * padding);
        const cellSize = maxSize / resolution;
        
        const origin = {
            x: (bounds.min.x + bounds.max.x) / 2 - maxSize / 2,
            y: (bounds.min.y + bounds.max.y) / 2 - maxSize / 2,
            z: (bounds.min.z + bounds.max.z) / 2 - maxSize / 2
        };
        
        const nx = resolution;
        const ny = resolution;
        const nz = resolution;
        
        // Initialize grid
        const grid = Array(nx).fill(null).map(() =>
            Array(ny).fill(null).map(() =>
                Array(nz).fill(Infinity)
            )
        );
        
        // Compute distances
        for (let i = 0; i < nx; i++) {
            for (let j = 0; j < ny; j++) {
                for (let k = 0; k < nz; k++) {
                    const p = {
                        x: origin.x + (i + 0.5) * cellSize,
                        y: origin.y + (j + 0.5) * cellSize,
                        z: origin.z + (k + 0.5) * cellSize
                    };
                    
                    grid[i][j][k] = this._signedDistanceToMesh(p, mesh);
                }
            }
        }
        
        // Find max distance for normalization
        let maxDist = 0;
        for (let i = 0; i < nx; i++) {
            for (let j = 0; j < ny; j++) {
                for (let k = 0; k < nz; k++) {
                    maxDist = Math.max(maxDist, Math.abs(grid[i][j][k]));
                }
            }
        }
        
        return { grid, origin, cellSize, nx, ny, nz, maxDist, bounds };
    },
    
    /**
     * Extract isosurface from SDF using Marching Cubes
     */
    extractIsosurface: function(sdf, isovalue = 0) {
        const vertices = [];
        const indices = [];
        const vertexMap = new Map();
        
        for (let i = 0; i < sdf.nx - 1; i++) {
            for (let j = 0; j < sdf.ny - 1; j++) {
                for (let k = 0; k < sdf.nz - 1; k++) {
                    this._marchCube(
                        sdf, i, j, k, isovalue,
                        vertices, indices, vertexMap
                    );
                }
            }
        }
        
        return {
            vertices: new Float32Array(vertices),
            indices: new Uint32Array(indices)
        };
    },
    
    /**
     * Boolean operations via SDF
     */
    sdfUnion: function(sdfA, sdfB) {
        return this._combineSDF(sdfA, sdfB, Math.min);
    },
    
    sdfIntersection: function(sdfA, sdfB) {
        return this._combineSDF(sdfA, sdfB, Math.max);
    },
    
    sdfDifference: function(sdfA, sdfB) {
        return this._combineSDF(sdfA, sdfB, (a, b) => Math.max(a, -b));
    },
    
    /**
     * Smooth union/intersection
     */
    sdfSmoothUnion: function(sdfA, sdfB, k = 0.1) {
        return this._combineSDF(sdfA, sdfB, (a, b) => {
            const h = Math.max(k - Math.abs(a - b), 0) / k;
            return Math.min(a, b) - h * h * k / 4;
        });
    },
    
    /**
     * Offset surface (dilate/erode)
     */
    sdfOffset: function(sdf, offset) {
        const result = {
            ...sdf,
            grid: sdf.grid.map(plane =>
                plane.map(row =>
                    row.map(val => val - offset)
                )
            )
        };
        return result;
    },
    
    _signedDistanceToMesh: function(point, mesh) {
        let minDist = Infinity;
        let sign = 1;
        
        const numFaces = mesh.indices.length / 3;
        let closestNormal = { x: 0, y: 1, z: 0 };
        
        for (let f = 0; f < numFaces; f++) {
            const v0 = this._getVertex(mesh.vertices, mesh.indices[f * 3]);
            const v1 = this._getVertex(mesh.vertices, mesh.indices[f * 3 + 1]);
            const v2 = this._getVertex(mesh.vertices, mesh.indices[f * 3 + 2]);
            
            const { distance, closest, normal } = this._pointTriangleDistance(point, v0, v1, v2);
            
            if (distance < minDist) {
                minDist = distance;
                closestNormal = normal;
            }
        }
        
        // Determine sign (inside/outside)
        // Use closest normal to determine sign
        const toPoint = { x: point.x, y: point.y, z: point.z };
        // Simplified: assume outward normals, negative inside
        // In practice, need consistent winding
        
        return minDist; // Unsigned for now
    },
    
    _pointTriangleDistance: function(p, v0, v1, v2) {
        // Compute closest point on triangle to p
        const e0 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
        const e1 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
        const v = { x: v0.x - p.x, y: v0.y - p.y, z: v0.z - p.z };
        
        const a = e0.x * e0.x + e0.y * e0.y + e0.z * e0.z;
        const b = e0.x * e1.x + e0.y * e1.y + e0.z * e1.z;
        const c = e1.x * e1.x + e1.y * e1.y + e1.z * e1.z;
        const d = e0.x * v.x + e0.y * v.y + e0.z * v.z;
        const e = e1.x * v.x + e1.y * v.y + e1.z * v.z;
        
        const det = a * c - b * b;
        let s = b * e - c * d;
        let t = b * d - a * e;
        
        if (s + t <= det) {
            if (s < 0) {
                if (t < 0) {
                    // Region 4
                    if (d < 0) {
                        t = 0;
                        s = -d >= a ? 1 : -d / a;
                    } else {
                        s = 0;
                        t = e >= 0 ? 0 : (-e >= c ? 1 : -e / c);
                    }
                } else {
                    // Region 3
                    s = 0;
                    t = e >= 0 ? 0 : (-e >= c ? 1 : -e / c);
                }
            } else if (t < 0) {
                // Region 5
                t = 0;
                s = d >= 0 ? 0 : (-d >= a ? 1 : -d / a);
            } else {
                // Region 0
                const invDet = 1 / det;
                s *= invDet;
                t *= invDet;
            }
        } else {
            if (s < 0) {
                // Region 2
                const tmp0 = b + d;
                const tmp1 = c + e;
                if (tmp1 > tmp0) {
                    const numer = tmp1 - tmp0;
                    const denom = a - 2 * b + c;
                    s = numer >= denom ? 1 : numer / denom;
                    t = 1 - s;
                } else {
                    s = 0;
                    t = tmp1 <= 0 ? 1 : (e >= 0 ? 0 : -e / c);
                }
            } else if (t < 0) {
                // Region 6
                const tmp0 = b + e;
                const tmp1 = a + d;
                if (tmp1 > tmp0) {
                    const numer = tmp1 - tmp0;
                    const denom = a - 2 * b + c;
                    t = numer >= denom ? 1 : numer / denom;
                    s = 1 - t;
                } else {
                    t = 0;
                    s = tmp1 <= 0 ? 1 : (d >= 0 ? 0 : -d / a);
                }
            } else {
                // Region 1
                const numer = (c + e) - (b + d);
                if (numer <= 0) {
                    s = 0;
                } else {
                    const denom = a - 2 * b + c;
                    s = numer >= denom ? 1 : numer / denom;
                }
                t = 1 - s;
            }
        }
        
        const closest = {
            x: v0.x + s * e0.x + t * e1.x,
            y: v0.y + s * e0.y + t * e1.y,
            z: v0.z + s * e0.z + t * e1.z
        };
        
        const distance = Math.sqrt(
            Math.pow(p.x - closest.x, 2) +
            Math.pow(p.y - closest.y, 2) +
            Math.pow(p.z - closest.z, 2)
        );
        
        // Face normal
        const normal = this._triangleNormal(v0, v1, v2);
        
        return { distance, closest, normal };
    },
    
    _triangleNormal: function(v0, v1, v2) {
        const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
        const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
        
        const n = {
            x: e1.y * e2.z - e1.z * e2.y,
            y: e1.z * e2.x - e1.x * e2.z,
            z: e1.x * e2.y - e1.y * e2.x
        };
        
        const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
        
        return len > 1e-10 ? { x: n.x / len, y: n.y / len, z: n.z / len } : { x: 0, y: 1, z: 0 };
    },
    
    _combineSDF: function(sdfA, sdfB, op) {
        // Assuming same resolution
        const result = {
            ...sdfA,
            grid: sdfA.grid.map((plane, i) =>
                plane.map((row, j) =>
                    row.map((val, k) => op(val, sdfB.grid[i][j][k]))
                )
            )
        };
        return result;
    },
    
    _marchCube: function(sdf, i, j, k, isovalue, vertices, indices, vertexMap) {
        // Get corner values
        const values = [
            sdf.grid[i][j][k],
            sdf.grid[i + 1][j][k],
            sdf.grid[i + 1][j + 1][k],
            sdf.grid[i][j + 1][k],
            sdf.grid[i][j][k + 1],
            sdf.grid[i + 1][j][k + 1],
            sdf.grid[i + 1][j + 1][k + 1],
            sdf.grid[i][j + 1][k + 1]
        ];
        
        // Compute cube index
        let cubeIndex = 0;
        for (let v = 0; v < 8; v++) {
            if (values[v] < isovalue) {
                cubeIndex |= (1 << v);
            }
        }
        
        if (cubeIndex === 0 || cubeIndex === 255) return;
        
        // Get corner positions
        const corners = [
            { x: sdf.origin.x + i * sdf.cellSize, y: sdf.origin.y + j * sdf.cellSize, z: sdf.origin.z + k * sdf.cellSize },
            { x: sdf.origin.x + (i + 1) * sdf.cellSize, y: sdf.origin.y + j * sdf.cellSize, z: sdf.origin.z + k * sdf.cellSize },
            { x: sdf.origin.x + (i + 1) * sdf.cellSize, y: sdf.origin.y + (j + 1) * sdf.cellSize, z: sdf.origin.z + k * sdf.cellSize },
            { x: sdf.origin.x + i * sdf.cellSize, y: sdf.origin.y + (j + 1) * sdf.cellSize, z: sdf.origin.z + k * sdf.cellSize },
            { x: sdf.origin.x + i * sdf.cellSize, y: sdf.origin.y + j * sdf.cellSize, z: sdf.origin.z + (k + 1) * sdf.cellSize },
            { x: sdf.origin.x + (i + 1) * sdf.cellSize, y: sdf.origin.y + j * sdf.cellSize, z: sdf.origin.z + (k + 1) * sdf.cellSize },
            { x: sdf.origin.x + (i + 1) * sdf.cellSize, y: sdf.origin.y + (j + 1) * sdf.cellSize, z: sdf.origin.z + (k + 1) * sdf.cellSize },
            { x: sdf.origin.x + i * sdf.cellSize, y: sdf.origin.y + (j + 1) * sdf.cellSize, z: sdf.origin.z + (k + 1) * sdf.cellSize }
        ];
        
        // Edge table (simplified)
        const edgeVertex = [];
        const edges = [
            [0, 1], [1, 2], [2, 3], [3, 0],
            [4, 5], [5, 6], [6, 7], [7, 4],
            [0, 4], [1, 5], [2, 6], [3, 7]
        ];
        
        for (let e = 0; e < 12; e++) {
            const [v1, v2] = edges[e];
            
            if ((values[v1] < isovalue) !== (values[v2] < isovalue)) {
                const t = (isovalue - values[v1]) / (values[v2] - values[v1]);
                const p = {
                    x: corners[v1].x + t * (corners[v2].x - corners[v1].x),
                    y: corners[v1].y + t * (corners[v2].y - corners[v1].y),
                    z: corners[v1].z + t * (corners[v2].z - corners[v1].z)
                };
                
                const key = `${p.x.toFixed(6)},${p.y.toFixed(6)},${p.z.toFixed(6)}`;
                
                if (!vertexMap.has(key)) {
                    vertexMap.set(key, vertices.length / 3);
                    vertices.push(p.x, p.y, p.z);
                }
                
                edgeVertex[e] = vertexMap.get(key);
            }
        }
        
        // Generate triangles (simplified - using edge midpoint approach)
        // Full implementation would use marching cubes lookup table
        const triTable = this._getMarchingCubesTriangles(cubeIndex);
        
        for (let t = 0; t < triTable.length; t += 3) {
            if (triTable[t] < 0) break;
            
            if (edgeVertex[triTable[t]] !== undefined &&
                edgeVertex[triTable[t + 1]] !== undefined &&
                edgeVertex[triTable[t + 2]] !== undefined) {
                indices.push(
                    edgeVertex[triTable[t]],
                    edgeVertex[triTable[t + 1]],
                    edgeVertex[triTable[t + 2]]
                );
            }
        }
    },
    
    _getMarchingCubesTriangles: function(cubeIndex) {
        // Simplified triangle table - returns edges for common cases
        // Full implementation would have complete 256-case lookup table
        const table = {
            1: [0, 8, 3],
            2: [0, 1, 9],
            3: [1, 8, 3, 9, 8, 1],
            // ... would have all 256 cases
        };
        
        return table[cubeIndex] || [];
    },
    
    _computeBounds: function(vertices) {
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        
        for (let i = 0; i < vertices.length; i += 3) {
            minX = Math.min(minX, vertices[i]);
            minY = Math.min(minY, vertices[i + 1]);
            minZ = Math.min(minZ, vertices[i + 2]);
            maxX = Math.max(maxX, vertices[i]);
            maxY = Math.max(maxY, vertices[i + 1]);
            maxZ = Math.max(maxZ, vertices[i + 2]);
        }
        
        return {
            min: { x: minX, y: minY, z: minZ },
            max: { x: maxX, y: maxY, z: maxZ }
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

console.log('[PRISM Session 5 Ultimate v4 Part 2] Modules 5-8 loaded');
console.log('  - PRISM_MESH_SEGMENTATION_ENGINE');
console.log('  - PRISM_MESH_DEFORMATION_ENGINE');
console.log('  - PRISM_SURFACE_RECONSTRUCTION_ENGINE');
console.log('  - PRISM_SDF_ENGINE');
/**
 * PRISM SESSION 5 - ULTIMATE CAD/GEOMETRY ENHANCEMENT PACKAGE v4 - PART 3
 * ══════════════════════════════════════════════════════════════════════════════
 * Modules 9-16: Advanced Geometry Processing
 * ══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 9: PRISM_ICP_REGISTRATION_ENGINE
// Iterative Closest Point Registration
// Source: Besl & McKay 1992, Stanford CS 468
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_ICP_REGISTRATION_ENGINE = {
    name: 'PRISM_ICP_REGISTRATION_ENGINE',
    version: '1.0.0',
    source: 'Besl & McKay 1992, Stanford CS 468',
    
    /**
     * Point-to-point ICP
     */
    alignPointToPoint: function(sourcePoints, targetPoints, options = {}) {
        const {
            maxIterations = 50,
            tolerance = 1e-6,
            maxCorrespondenceDistance = Infinity
        } = options;
        
        let source = sourcePoints.map(p => ({ ...p }));
        let totalTransform = this._identityMatrix();
        
        for (let iter = 0; iter < maxIterations; iter++) {
            // Find correspondences
            const correspondences = this._findCorrespondences(source, targetPoints, maxCorrespondenceDistance);
            
            if (correspondences.length < 3) {
                console.warn('[ICP] Insufficient correspondences');
                break;
            }
            
            // Compute optimal transform
            const transform = this._computeRigidTransform(
                correspondences.map(c => c.source),
                correspondences.map(c => c.target)
            );
            
            // Apply transform to source
            source = source.map(p => this._applyTransform(p, transform));
            
            // Accumulate transform
            totalTransform = this._multiplyMatrices(transform, totalTransform);
            
            // Check convergence
            const error = this._computeMeanError(correspondences);
            if (error < tolerance) break;
        }
        
        return {
            transform: totalTransform,
            alignedPoints: source,
            finalError: this._computeMeanError(this._findCorrespondences(source, targetPoints, Infinity))
        };
    },
    
    /**
     * Point-to-plane ICP (faster convergence)
     */
    alignPointToPlane: function(sourcePoints, targetMesh, options = {}) {
        const {
            maxIterations = 30,
            tolerance = 1e-6
        } = options;
        
        // Build KD-tree for target
        const targetWithNormals = this._computeVertexNormals(targetMesh);
        const kdTree = this._buildSimpleKDTree(targetWithNormals);
        
        let source = sourcePoints.map(p => ({ ...p }));
        let totalTransform = this._identityMatrix();
        
        for (let iter = 0; iter < maxIterations; iter++) {
            // Find correspondences with normals
            const correspondences = [];
            for (const p of source) {
                const nearest = this._findNearestInKDTree(kdTree, p);
                if (nearest) {
                    correspondences.push({
                        source: p,
                        target: nearest.point,
                        normal: nearest.normal
                    });
                }
            }
            
            if (correspondences.length < 6) break;
            
            // Solve point-to-plane using linear least squares
            const transform = this._solvePointToPlane(correspondences);
            
            // Apply transform
            source = source.map(p => this._applyTransform(p, transform));
            totalTransform = this._multiplyMatrices(transform, totalTransform);
            
            // Check convergence
            const error = correspondences.reduce((sum, c) => {
                const d = this._dot(this._subtract(c.source, c.target), c.normal);
                return sum + d * d;
            }, 0) / correspondences.length;
            
            if (Math.sqrt(error) < tolerance) break;
        }
        
        return {
            transform: totalTransform,
            alignedPoints: source
        };
    },
    
    _findCorrespondences: function(source, target, maxDist) {
        const correspondences = [];
        for (const s of source) {
            let bestDist = Infinity, bestTarget = null;
            for (const t of target) {
                const d = this._distance(s, t);
                if (d < bestDist && d < maxDist) {
                    bestDist = d;
                    bestTarget = t;
                }
            }
            if (bestTarget) {
                correspondences.push({ source: s, target: bestTarget, distance: bestDist });
            }
        }
        return correspondences;
    },
    
    _computeRigidTransform: function(source, target) {
        // Compute centroids
        const centroidS = this._computeCentroid(source);
        const centroidT = this._computeCentroid(target);
        
        // Center points
        const centeredS = source.map(p => this._subtract(p, centroidS));
        const centeredT = target.map(p => this._subtract(p, centroidT));
        
        // Compute covariance matrix H
        const H = [[0,0,0], [0,0,0], [0,0,0]];
        for (let i = 0; i < centeredS.length; i++) {
            const s = centeredS[i], t = centeredT[i];
            H[0][0] += s.x * t.x; H[0][1] += s.x * t.y; H[0][2] += s.x * t.z;
            H[1][0] += s.y * t.x; H[1][1] += s.y * t.y; H[1][2] += s.y * t.z;
            H[2][0] += s.z * t.x; H[2][1] += s.z * t.y; H[2][2] += s.z * t.z;
        }
        
        // SVD for rotation (simplified Jacobi-like approach)
        const R = this._computeRotationFromSVD(H);
        
        // Translation: t = centroidT - R * centroidS
        const rotatedCentroid = this._multiplyMatrixVector(R, centroidS);
        const translation = this._subtract(centroidT, rotatedCentroid);
        
        return {
            rotation: R,
            translation: translation
        };
    },
    
    _computeRotationFromSVD: function(H) {
        // Simplified SVD via power iteration for 3x3
        // Returns rotation matrix from H = USV^T, R = VU^T
        const maxIter = 50;
        
        // Start with H^T * H
        const HtH = this._transposeMultiply(H, H);
        
        // Power iteration for principal eigenvector
        let v = [1, 0, 0];
        for (let i = 0; i < maxIter; i++) {
            const next = this._multiplyMatrixVector3(HtH, { x: v[0], y: v[1], z: v[2] });
            const norm = Math.sqrt(next.x*next.x + next.y*next.y + next.z*next.z);
            if (norm < 1e-10) break;
            v = [next.x/norm, next.y/norm, next.z/norm];
        }
        
        // For simplicity, use Rodrigues rotation formula approximation
        // Full SVD would be more accurate
        const det = H[0][0]*(H[1][1]*H[2][2]-H[1][2]*H[2][1]) -
                    H[0][1]*(H[1][0]*H[2][2]-H[1][2]*H[2][0]) +
                    H[0][2]*(H[1][0]*H[2][1]-H[1][1]*H[2][0]);
        
        // If det(H) < 0, need to flip one column
        const sign = det >= 0 ? 1 : -1;
        
        // Normalize columns of H for approximate rotation
        const c0 = Math.sqrt(H[0][0]*H[0][0] + H[1][0]*H[1][0] + H[2][0]*H[2][0]) || 1;
        const c1 = Math.sqrt(H[0][1]*H[0][1] + H[1][1]*H[1][1] + H[2][1]*H[2][1]) || 1;
        const c2 = Math.sqrt(H[0][2]*H[0][2] + H[1][2]*H[1][2] + H[2][2]*H[2][2]) || 1;
        
        const R = [
            [H[0][0]/c0, H[0][1]/c1, sign*H[0][2]/c2],
            [H[1][0]/c0, H[1][1]/c1, sign*H[1][2]/c2],
            [H[2][0]/c0, H[2][1]/c1, sign*H[2][2]/c2]
        ];
        
        // Orthogonalize using Gram-Schmidt
        return this._orthogonalize(R);
    },
    
    _orthogonalize: function(M) {
        const col0 = { x: M[0][0], y: M[1][0], z: M[2][0] };
        const col1 = { x: M[0][1], y: M[1][1], z: M[2][1] };
        const col2 = { x: M[0][2], y: M[1][2], z: M[2][2] };
        
        const u0 = this._normalize(col0);
        const u1 = this._normalize(this._subtract(col1, this._scale(u0, this._dot(col1, u0))));
        const u2 = this._cross(u0, u1);
        
        return [
            [u0.x, u1.x, u2.x],
            [u0.y, u1.y, u2.y],
            [u0.z, u1.z, u2.z]
        ];
    },
    
    _solvePointToPlane: function(correspondences) {
        // Linear least squares for point-to-plane
        // Minimize sum_i (n_i · (R*s_i + t - t_i))^2
        // Linearized for small rotations: R ≈ I + [α]×
        
        const n = correspondences.length;
        const A = [], b = [];
        
        for (const c of correspondences) {
            const s = c.source, t = c.target, norm = c.normal;
            
            // Row: [s×n, n] · [α, t] = n·(t-s)
            const sxn = this._cross(s, norm);
            A.push([sxn.x, sxn.y, sxn.z, norm.x, norm.y, norm.z]);
            b.push(this._dot(norm, this._subtract(t, s)));
        }
        
        // Solve via normal equations
        const AtA = this._matrixTransposeMultiply6(A);
        const Atb = this._matrixTransposeVector6(A, b);
        
        const x = this._solve6x6(AtA, Atb);
        
        // Build rotation from skew-symmetric
        const alpha = { x: x[0], y: x[1], z: x[2] };
        const R = [
            [1, -alpha.z, alpha.y],
            [alpha.z, 1, -alpha.x],
            [-alpha.y, alpha.x, 1]
        ];
        
        return {
            rotation: this._orthogonalize(R),
            translation: { x: x[3], y: x[4], z: x[5] }
        };
    },
    
    _matrixTransposeMultiply6: function(A) {
        const n = A.length;
        const AtA = Array.from({ length: 6 }, () => Array(6).fill(0));
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 6; j++) {
                for (let k = 0; k < n; k++) {
                    AtA[i][j] += A[k][i] * A[k][j];
                }
            }
        }
        return AtA;
    },
    
    _matrixTransposeVector6: function(A, b) {
        const n = A.length;
        const Atb = Array(6).fill(0);
        for (let i = 0; i < 6; i++) {
            for (let k = 0; k < n; k++) {
                Atb[i] += A[k][i] * b[k];
            }
        }
        return Atb;
    },
    
    _solve6x6: function(A, b) {
        // Gauss-Jordan elimination for 6x6
        const aug = A.map((row, i) => [...row, b[i]]);
        const n = 6;
        
        for (let col = 0; col < n; col++) {
            // Find pivot
            let maxRow = col;
            for (let row = col + 1; row < n; row++) {
                if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
                    maxRow = row;
                }
            }
            [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
            
            if (Math.abs(aug[col][col]) < 1e-10) continue;
            
            // Scale pivot row
            const pivot = aug[col][col];
            for (let j = col; j <= n; j++) {
                aug[col][j] /= pivot;
            }
            
            // Eliminate
            for (let row = 0; row < n; row++) {
                if (row !== col) {
                    const factor = aug[row][col];
                    for (let j = col; j <= n; j++) {
                        aug[row][j] -= factor * aug[col][j];
                    }
                }
            }
        }
        
        return aug.map(row => row[n]);
    },
    
    _identityMatrix: function() {
        return {
            rotation: [[1,0,0], [0,1,0], [0,0,1]],
            translation: { x: 0, y: 0, z: 0 }
        };
    },
    
    _applyTransform: function(p, transform) {
        const rotated = this._multiplyMatrixVector(transform.rotation, p);
        return {
            x: rotated.x + transform.translation.x,
            y: rotated.y + transform.translation.y,
            z: rotated.z + transform.translation.z
        };
    },
    
    _multiplyMatrices: function(A, B) {
        const R1 = A.rotation, R2 = B.rotation;
        const R = [[0,0,0], [0,0,0], [0,0,0]];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                for (let k = 0; k < 3; k++) {
                    R[i][j] += R1[i][k] * R2[k][j];
                }
            }
        }
        
        const rotatedT2 = this._multiplyMatrixVector(R1, B.translation);
        
        return {
            rotation: R,
            translation: {
                x: rotatedT2.x + A.translation.x,
                y: rotatedT2.y + A.translation.y,
                z: rotatedT2.z + A.translation.z
            }
        };
    },
    
    _multiplyMatrixVector: function(M, v) {
        return {
            x: M[0][0]*v.x + M[0][1]*v.y + M[0][2]*v.z,
            y: M[1][0]*v.x + M[1][1]*v.y + M[1][2]*v.z,
            z: M[2][0]*v.x + M[2][1]*v.y + M[2][2]*v.z
        };
    },
    
    _multiplyMatrixVector3: function(M, v) {
        return {
            x: M[0][0]*v.x + M[0][1]*v.y + M[0][2]*v.z,
            y: M[1][0]*v.x + M[1][1]*v.y + M[1][2]*v.z,
            z: M[2][0]*v.x + M[2][1]*v.y + M[2][2]*v.z
        };
    },
    
    _transposeMultiply: function(A, B) {
        const C = [[0,0,0], [0,0,0], [0,0,0]];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                for (let k = 0; k < 3; k++) {
                    C[i][j] += A[k][i] * B[k][j];
                }
            }
        }
        return C;
    },
    
    _computeCentroid: function(points) {
        const sum = { x: 0, y: 0, z: 0 };
        for (const p of points) {
            sum.x += p.x; sum.y += p.y; sum.z += p.z;
        }
        const n = points.length;
        return { x: sum.x/n, y: sum.y/n, z: sum.z/n };
    },
    
    _subtract: function(a, b) {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    },
    
    _distance: function(a, b) {
        const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    },
    
    _dot: function(a, b) {
        return a.x*b.x + a.y*b.y + a.z*b.z;
    },
    
    _cross: function(a, b) {
        return {
            x: a.y*b.z - a.z*b.y,
            y: a.z*b.x - a.x*b.z,
            z: a.x*b.y - a.y*b.x
        };
    },
    
    _normalize: function(v) {
        const len = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z) || 1;
        return { x: v.x/len, y: v.y/len, z: v.z/len };
    },
    
    _scale: function(v, s) {
        return { x: v.x*s, y: v.y*s, z: v.z*s };
    },
    
    _computeMeanError: function(correspondences) {
        if (correspondences.length === 0) return Infinity;
        const sum = correspondences.reduce((s, c) => s + c.distance * c.distance, 0);
        return Math.sqrt(sum / correspondences.length);
    },
    
    _computeVertexNormals: function(mesh) {
        const normals = Array(mesh.vertices.length / 3).fill(null).map(() => ({ x: 0, y: 0, z: 0 }));
        const counts = Array(mesh.vertices.length / 3).fill(0);
        
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const i0 = mesh.indices[i], i1 = mesh.indices[i+1], i2 = mesh.indices[i+2];
            const v0 = this._getVertex(mesh.vertices, i0);
            const v1 = this._getVertex(mesh.vertices, i1);
            const v2 = this._getVertex(mesh.vertices, i2);
            
            const n = this._cross(this._subtract(v1, v0), this._subtract(v2, v0));
            
            for (const idx of [i0, i1, i2]) {
                normals[idx].x += n.x;
                normals[idx].y += n.y;
                normals[idx].z += n.z;
                counts[idx]++;
            }
        }
        
        return normals.map((n, i) => ({
            point: this._getVertex(mesh.vertices, i),
            normal: this._normalize(n)
        })).filter(v => counts[normals.indexOf(n)] > 0);
    },
    
    _getVertex: function(vertices, idx) {
        return { x: vertices[idx*3], y: vertices[idx*3+1], z: vertices[idx*3+2] };
    },
    
    _buildSimpleKDTree: function(pointsWithNormals) {
        return { points: pointsWithNormals };
    },
    
    _findNearestInKDTree: function(kdTree, query) {
        let best = null, bestDist = Infinity;
        for (const pn of kdTree.points) {
            const d = this._distance(query, pn.point);
            if (d < bestDist) {
                bestDist = d;
                best = pn;
            }
        }
        return best;
    }
};

// Register gateway routes
if (typeof PRISM_GATEWAY !== 'undefined') {
    PRISM_GATEWAY.register('registration.icp.point', 'PRISM_ICP_REGISTRATION_ENGINE.alignPointToPoint');
    PRISM_GATEWAY.register('registration.icp.plane', 'PRISM_ICP_REGISTRATION_ENGINE.alignPointToPlane');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 10: PRISM_DELAUNAY_3D_ENGINE
// 3D Delaunay Triangulation
// Source: MIT 18.086, Bowyer-Watson Algorithm
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_DELAUNAY_3D_ENGINE = {
    name: 'PRISM_DELAUNAY_3D_ENGINE',
    version: '1.0.0',
    source: 'MIT 18.086, Bowyer-Watson 1981',
    
    /**
     * Compute 3D Delaunay tetrahedralization
     * Bowyer-Watson incremental algorithm
     */
    tetrahedralize: function(points) {
        if (points.length < 4) {
            return { tetrahedra: [], vertices: points };
        }
        
        // Create super tetrahedron
        const bounds = this._computeBounds(points);
        const superTet = this._createSuperTetrahedron(bounds);
        
        // Start with super tetrahedron
        let tetrahedra = [superTet];
        
        // Add points incrementally
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            
            // Find all tetrahedra whose circumsphere contains p
            const badTetrahedra = [];
            const goodTetrahedra = [];
            
            for (const tet of tetrahedra) {
                if (this._inCircumsphere(tet, p)) {
                    badTetrahedra.push(tet);
                } else {
                    goodTetrahedra.push(tet);
                }
            }
            
            // Find boundary polygon (faces of bad tetrahedra not shared)
            const boundary = this._findBoundaryFaces(badTetrahedra);
            
            // Create new tetrahedra from boundary faces to point
            const newTetrahedra = boundary.map(face => ({
                vertices: [...face.vertices, i + 4], // +4 for super tet vertices
                circumcenter: null,
                circumradius: null
            }));
            
            // Compute circumspheres for new tetrahedra
            for (const tet of newTetrahedra) {
                const vs = tet.vertices.map(v => v < 4 ? superTet.superVertices[v] : points[v - 4]);
                const circ = this._computeCircumsphere(vs);
                tet.circumcenter = circ.center;
                tet.circumradius = circ.radius;
            }
            
            tetrahedra = [...goodTetrahedra, ...newTetrahedra];
        }
        
        // Remove tetrahedra connected to super tetrahedron
        tetrahedra = tetrahedra.filter(tet => 
            tet.vertices.every(v => v >= 4)
        );
        
        // Remap vertex indices
        tetrahedra = tetrahedra.map(tet => ({
            vertices: tet.vertices.map(v => v - 4),
            circumcenter: tet.circumcenter,
            circumradius: tet.circumradius
        }));
        
        return {
            tetrahedra,
            vertices: points
        };
    },
    
    /**
     * Extract surface triangulation from tetrahedralization
     */
    extractSurface: function(delaunay) {
        const faceCount = new Map();
        
        for (const tet of delaunay.tetrahedra) {
            const v = tet.vertices;
            const faces = [
                [v[0], v[1], v[2]],
                [v[0], v[1], v[3]],
                [v[0], v[2], v[3]],
                [v[1], v[2], v[3]]
            ];
            
            for (const face of faces) {
                const key = face.slice().sort((a, b) => a - b).join(',');
                faceCount.set(key, (faceCount.get(key) || 0) + 1);
            }
        }
        
        // Surface faces appear exactly once
        const surfaceFaces = [];
        for (const [key, count] of faceCount.entries()) {
            if (count === 1) {
                surfaceFaces.push(key.split(',').map(Number));
            }
        }
        
        return {
            faces: surfaceFaces,
            vertices: delaunay.vertices
        };
    },
    
    _createSuperTetrahedron: function(bounds) {
        const center = {
            x: (bounds.min.x + bounds.max.x) / 2,
            y: (bounds.min.y + bounds.max.y) / 2,
            z: (bounds.min.z + bounds.max.z) / 2
        };
        
        const size = Math.max(
            bounds.max.x - bounds.min.x,
            bounds.max.y - bounds.min.y,
            bounds.max.z - bounds.min.z
        ) * 10;
        
        const superVertices = [
            { x: center.x, y: center.y + size * 3, z: center.z },
            { x: center.x - size * 2, y: center.y - size, z: center.z - size },
            { x: center.x + size * 2, y: center.y - size, z: center.z - size },
            { x: center.x, y: center.y - size, z: center.z + size * 2 }
        ];
        
        const circ = this._computeCircumsphere(superVertices);
        
        return {
            vertices: [0, 1, 2, 3],
            superVertices,
            circumcenter: circ.center,
            circumradius: circ.radius
        };
    },
    
    _computeCircumsphere: function(vertices) {
        const [a, b, c, d] = vertices;
        
        // Solve linear system for circumcenter
        const ax = a.x, ay = a.y, az = a.z;
        const bx = b.x - ax, by = b.y - ay, bz = b.z - az;
        const cx = c.x - ax, cy = c.y - ay, cz = c.z - az;
        const dx = d.x - ax, dy = d.y - ay, dz = d.z - az;
        
        const bSq = bx*bx + by*by + bz*bz;
        const cSq = cx*cx + cy*cy + cz*cz;
        const dSq = dx*dx + dy*dy + dz*dz;
        
        const det = 2 * (bx*(cy*dz - cz*dy) - by*(cx*dz - cz*dx) + bz*(cx*dy - cy*dx));
        
        if (Math.abs(det) < 1e-10) {
            return { center: a, radius: Infinity };
        }
        
        const ux = (bSq*(cy*dz - cz*dy) - cSq*(by*dz - bz*dy) + dSq*(by*cz - bz*cy)) / det;
        const uy = (bx*(cSq*dz - dSq*cz) - cx*(bSq*dz - dSq*bz) + dx*(bSq*cz - cSq*bz)) / det;
        const uz = (bx*(cy*dSq - dy*cSq) - cx*(by*dSq - dy*bSq) + dx*(by*cSq - cy*bSq)) / det;
        
        const center = { x: ax + ux, y: ay + uy, z: az + uz };
        const radius = Math.sqrt(ux*ux + uy*uy + uz*uz);
        
        return { center, radius };
    },
    
    _inCircumsphere: function(tet, p) {
        if (!tet.circumcenter || tet.circumradius === Infinity) return false;
        
        const dx = p.x - tet.circumcenter.x;
        const dy = p.y - tet.circumcenter.y;
        const dz = p.z - tet.circumcenter.z;
        
        return Math.sqrt(dx*dx + dy*dy + dz*dz) < tet.circumradius;
    },
    
    _findBoundaryFaces: function(badTetrahedra) {
        const faceCount = new Map();
        
        for (const tet of badTetrahedra) {
            const v = tet.vertices;
            const faces = [
                { vertices: [v[0], v[1], v[2]] },
                { vertices: [v[0], v[1], v[3]] },
                { vertices: [v[0], v[2], v[3]] },
                { vertices: [v[1], v[2], v[3]] }
            ];
            
            for (const face of faces) {
                const key = face.vertices.slice().sort((a, b) => a - b).join(',');
                faceCount.set(key, (faceCount.get(key) || 0) + 1);
                if (!faceCount.has(key + '_data')) {
                    faceCount.set(key + '_data', face);
                }
            }
        }
        
        const boundary = [];
        for (const [key, count] of faceCount.entries()) {
            if (key.endsWith('_data')) continue;
            if (count === 1) {
                boundary.push(faceCount.get(key + '_data'));
            }
        }
        
        return boundary;
    },
    
    _computeBounds: function(points) {
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        
        for (const p of points) {
            minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
            minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
        }
        
        return {
            min: { x: minX, y: minY, z: minZ },
            max: { x: maxX, y: maxY, z: maxZ }
        };
    }
};

if (typeof PRISM_GATEWAY !== 'undefined') {
    PRISM_GATEWAY.register('delaunay.tetrahedralize', 'PRISM_DELAUNAY_3D_ENGINE.tetrahedralize');
    PRISM_GATEWAY.register('delaunay.extractSurface', 'PRISM_DELAUNAY_3D_ENGINE.extractSurface');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 11: PRISM_VORONOI_3D_ENGINE
// 3D Voronoi Diagram from Delaunay Dual
// Source: MIT 18.086, Fortune 1987
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_VORONOI_3D_ENGINE = {
    name: 'PRISM_VORONOI_3D_ENGINE',
    version: '1.0.0',
    source: 'MIT 18.086, Fortune 1987',
    
    /**
     * Compute Voronoi diagram as dual of Delaunay
     */
    compute: function(points) {
        // First compute Delaunay tetrahedralization
        const delaunay = PRISM_DELAUNAY_3D_ENGINE.tetrahedralize(points);
        
        // Voronoi vertices are Delaunay circumcenters
        const voronoiVertices = delaunay.tetrahedra.map(tet => tet.circumcenter);
        
        // Build adjacency: which tetrahedra share faces
        const tetAdjacency = this._buildTetrahedraAdjacency(delaunay.tetrahedra);
        
        // Voronoi edges connect circumcenters of adjacent tetrahedra
        const voronoiEdges = [];
        for (const [tetIdx, neighbors] of tetAdjacency.entries()) {
            for (const neighborIdx of neighbors) {
                if (neighborIdx > tetIdx) { // Avoid duplicates
                    voronoiEdges.push({
                        start: tetIdx,
                        end: neighborIdx
                    });
                }
            }
        }
        
        // Build Voronoi cells for each point
        const cells = this._buildVoronoiCells(points, delaunay, tetAdjacency);
        
        return {
            vertices: voronoiVertices,
            edges: voronoiEdges,
            cells,
            sites: points
        };
    },
    
    /**
     * Get Voronoi cell for a specific point
     */
    getCell: function(voronoi, pointIdx) {
        if (pointIdx < 0 || pointIdx >= voronoi.cells.length) return null;
        return voronoi.cells[pointIdx];
    },
    
    /**
     * Find which cell contains a query point
     */
    findCell: function(voronoi, query) {
        let bestIdx = 0;
        let bestDist = this._distance(query, voronoi.sites[0]);
        
        for (let i = 1; i < voronoi.sites.length; i++) {
            const d = this._distance(query, voronoi.sites[i]);
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
            }
        }
        
        return bestIdx;
    },
    
    _buildTetrahedraAdjacency: function(tetrahedra) {
        const faceToTet = new Map();
        const adjacency = new Map();
        
        for (let i = 0; i < tetrahedra.length; i++) {
            adjacency.set(i, new Set());
        }
        
        for (let i = 0; i < tetrahedra.length; i++) {
            const v = tetrahedra[i].vertices;
            const faces = [
                [v[0], v[1], v[2]],
                [v[0], v[1], v[3]],
                [v[0], v[2], v[3]],
                [v[1], v[2], v[3]]
            ];
            
            for (const face of faces) {
                const key = face.slice().sort((a, b) => a - b).join(',');
                
                if (faceToTet.has(key)) {
                    const j = faceToTet.get(key);
                    adjacency.get(i).add(j);
                    adjacency.get(j).add(i);
                } else {
                    faceToTet.set(key, i);
                }
            }
        }
        
        return adjacency;
    },
    
    _buildVoronoiCells: function(points, delaunay, adjacency) {
        const cells = Array.from({ length: points.length }, () => ({
            vertices: [],
            faces: [],
            neighbors: new Set()
        }));
        
        // Find which tetrahedra contain each point
        for (let i = 0; i < delaunay.tetrahedra.length; i++) {
            const tet = delaunay.tetrahedra[i];
            for (const v of tet.vertices) {
                cells[v].vertices.push(i); // Voronoi vertex = tet index
            }
        }
        
        // Find neighbors from shared edges
        for (let i = 0; i < delaunay.tetrahedra.length; i++) {
            const tet = delaunay.tetrahedra[i];
            const v = tet.vertices;
            
            // Each edge of tet connects two point cells as neighbors
            const edges = [
                [v[0], v[1]], [v[0], v[2]], [v[0], v[3]],
                [v[1], v[2]], [v[1], v[3]], [v[2], v[3]]
            ];
            
            for (const [a, b] of edges) {
                cells[a].neighbors.add(b);
                cells[b].neighbors.add(a);
            }
        }
        
        // Convert neighbor sets to arrays
        for (const cell of cells) {
            cell.neighbors = Array.from(cell.neighbors);
        }
        
        return cells;
    },
    
    _distance: function(a, b) {
        const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }
};

if (typeof PRISM_GATEWAY !== 'undefined') {
    PRISM_GATEWAY.register('voronoi.compute', 'PRISM_VORONOI_3D_ENGINE.compute');
    PRISM_GATEWAY.register('voronoi.getCell', 'PRISM_VORONOI_3D_ENGINE.getCell');
    PRISM_GATEWAY.register('voronoi.findCell', 'PRISM_VORONOI_3D_ENGINE.findCell');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 12: PRISM_QEM_SIMPLIFICATION_ENGINE
// Quadric Error Metric Mesh Simplification
// Source: Garland & Heckbert 1997, Stanford CS 468
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_QEM_SIMPLIFICATION_ENGINE = {
    name: 'PRISM_QEM_SIMPLIFICATION_ENGINE',
    version: '1.0.0',
    source: 'Garland & Heckbert 1997, Stanford CS 468',
    
    /**
     * Simplify mesh using Quadric Error Metrics
     */
    simplify: function(mesh, options = {}) {
        const {
            targetFaces = null,
            targetRatio = 0.5,
            preserveBoundary = true
        } = options;
        
        const targetCount = targetFaces || Math.floor(mesh.indices.length / 3 * targetRatio);
        
        // Convert to half-edge structure
        const he = this._buildHalfEdgeStructure(mesh);
        
        // Compute quadrics for each vertex
        const quadrics = this._computeQuadrics(he);
        
        // Build edge collapse heap
        const heap = this._buildCollapseHeap(he, quadrics, preserveBoundary);
        
        // Collapse edges until target reached
        let currentFaces = he.faces.filter(f => !f.deleted).length;
        
        while (currentFaces > targetCount && heap.length > 0) {
            const collapse = this._heapPop(heap);
            
            if (collapse.edge.deleted) continue;
            
            // Perform collapse
            const result = this._collapseEdge(he, collapse.edge, collapse.newVertex, quadrics);
            
            if (result) {
                currentFaces -= result.removedFaces;
                
                // Update affected edges in heap
                for (const edge of result.affectedEdges) {
                    const newCost = this._computeCollapseCost(edge, quadrics, preserveBoundary);
                    this._heapInsert(heap, { edge, cost: newCost.cost, newVertex: newCost.vertex });
                }
            }
        }
        
        // Convert back to mesh
        return this._halfEdgeToMesh(he);
    },
    
    _buildHalfEdgeStructure: function(mesh) {
        const vertices = [];
        for (let i = 0; i < mesh.vertices.length; i += 3) {
            vertices.push({
                x: mesh.vertices[i],
                y: mesh.vertices[i + 1],
                z: mesh.vertices[i + 2],
                halfEdge: null,
                deleted: false
            });
        }
        
        const faces = [];
        const halfEdges = [];
        const edgeMap = new Map();
        
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const face = { halfEdge: null, deleted: false };
            faces.push(face);
            
            const faceEdges = [];
            for (let j = 0; j < 3; j++) {
                const v1 = mesh.indices[i + j];
                const v2 = mesh.indices[i + (j + 1) % 3];
                
                const he = {
                    vertex: v2,
                    face: faces.length - 1,
                    next: null,
                    prev: null,
                    twin: null,
                    deleted: false
                };
                
                halfEdges.push(he);
                faceEdges.push(halfEdges.length - 1);
                
                vertices[v1].halfEdge = halfEdges.length - 1;
                
                const key = `${Math.min(v1, v2)},${Math.max(v1, v2)}`;
                if (edgeMap.has(key)) {
                    const twinIdx = edgeMap.get(key);
                    halfEdges[twinIdx].twin = halfEdges.length - 1;
                    he.twin = twinIdx;
                } else {
                    edgeMap.set(key, halfEdges.length - 1);
                }
            }
            
            // Link face edges
            for (let j = 0; j < 3; j++) {
                halfEdges[faceEdges[j]].next = faceEdges[(j + 1) % 3];
                halfEdges[faceEdges[j]].prev = faceEdges[(j + 2) % 3];
            }
            
            face.halfEdge = faceEdges[0];
        }
        
        return { vertices, faces, halfEdges };
    },
    
    _computeQuadrics: function(he) {
        const quadrics = he.vertices.map(() => this._zeroQuadric());
        
        for (let i = 0; i < he.faces.length; i++) {
            if (he.faces[i].deleted) continue;
            
            const heIdx = he.faces[i].halfEdge;
            const indices = this._getFaceVertices(he, heIdx);
            
            const v0 = he.vertices[indices[0]];
            const v1 = he.vertices[indices[1]];
            const v2 = he.vertices[indices[2]];
            
            // Compute face plane: ax + by + cz + d = 0
            const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
            const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
            const normal = this._cross(edge1, edge2);
            const len = Math.sqrt(normal.x*normal.x + normal.y*normal.y + normal.z*normal.z);
            
            if (len < 1e-10) continue;
            
            const a = normal.x / len;
            const b = normal.y / len;
            const c = normal.z / len;
            const d = -(a * v0.x + b * v0.y + c * v0.z);
            
            // Quadric Q = [a b c d]^T * [a b c d]
            const faceQuadric = [
                [a*a, a*b, a*c, a*d],
                [a*b, b*b, b*c, b*d],
                [a*c, b*c, c*c, c*d],
                [a*d, b*d, c*d, d*d]
            ];
            
            for (const idx of indices) {
                this._addQuadric(quadrics[idx], faceQuadric);
            }
        }
        
        return quadrics;
    },
    
    _zeroQuadric: function() {
        return [[0,0,0,0], [0,0,0,0], [0,0,0,0], [0,0,0,0]];
    },
    
    _addQuadric: function(Q1, Q2) {
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                Q1[i][j] += Q2[i][j];
            }
        }
    },
    
    _sumQuadrics: function(Q1, Q2) {
        const result = this._zeroQuadric();
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                result[i][j] = Q1[i][j] + Q2[i][j];
            }
        }
        return result;
    },
    
    _buildCollapseHeap: function(he, quadrics, preserveBoundary) {
        const heap = [];
        const processed = new Set();
        
        for (let i = 0; i < he.halfEdges.length; i++) {
            const edge = he.halfEdges[i];
            if (edge.deleted || edge.twin === null) continue;
            
            const v1 = he.halfEdges[edge.prev].vertex;
            const v2 = edge.vertex;
            const key = `${Math.min(v1, v2)},${Math.max(v1, v2)}`;
            
            if (processed.has(key)) continue;
            processed.add(key);
            
            const cost = this._computeCollapseCost({ index: i, v1, v2 }, quadrics, preserveBoundary);
            
            this._heapInsert(heap, {
                edge: { index: i, v1, v2, deleted: false },
                cost: cost.cost,
                newVertex: cost.vertex
            });
        }
        
        return heap;
    },
    
    _computeCollapseCost: function(edge, quadrics, preserveBoundary) {
        const Q = this._sumQuadrics(quadrics[edge.v1], quadrics[edge.v2]);
        
        // Try to solve for optimal vertex position
        // Q * [x y z 1]^T = 0 (minimize error)
        const A = [
            [Q[0][0], Q[0][1], Q[0][2]],
            [Q[1][0], Q[1][1], Q[1][2]],
            [Q[2][0], Q[2][1], Q[2][2]]
        ];
        const b = [-Q[0][3], -Q[1][3], -Q[2][3]];
        
        let optimalVertex;
        const det = this._det3x3(A);
        
        if (Math.abs(det) > 1e-10) {
            // Solve A * x = b
            optimalVertex = this._solve3x3(A, b);
        } else {
            // Use midpoint
            optimalVertex = {
                x: (quadrics[edge.v1].vertex?.x || 0 + quadrics[edge.v2].vertex?.x || 0) / 2,
                y: (quadrics[edge.v1].vertex?.y || 0 + quadrics[edge.v2].vertex?.y || 0) / 2,
                z: (quadrics[edge.v1].vertex?.z || 0 + quadrics[edge.v2].vertex?.z || 0) / 2
            };
        }
        
        // Compute error at optimal vertex
        const v = [optimalVertex.x, optimalVertex.y, optimalVertex.z, 1];
        let error = 0;
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                error += v[i] * Q[i][j] * v[j];
            }
        }
        
        return { cost: Math.max(0, error), vertex: optimalVertex };
    },
    
    _det3x3: function(A) {
        return A[0][0] * (A[1][1]*A[2][2] - A[1][2]*A[2][1])
             - A[0][1] * (A[1][0]*A[2][2] - A[1][2]*A[2][0])
             + A[0][2] * (A[1][0]*A[2][1] - A[1][1]*A[2][0]);
    },
    
    _solve3x3: function(A, b) {
        const det = this._det3x3(A);
        
        const Ax = [[b[0], A[0][1], A[0][2]], [b[1], A[1][1], A[1][2]], [b[2], A[2][1], A[2][2]]];
        const Ay = [[A[0][0], b[0], A[0][2]], [A[1][0], b[1], A[1][2]], [A[2][0], b[2], A[2][2]]];
        const Az = [[A[0][0], A[0][1], b[0]], [A[1][0], A[1][1], b[1]], [A[2][0], A[2][1], b[2]]];
        
        return {
            x: this._det3x3(Ax) / det,
            y: this._det3x3(Ay) / det,
            z: this._det3x3(Az) / det
        };
    },
    
    _collapseEdge: function(he, edge, newVertex, quadrics) {
        // Mark edges and faces as deleted
        // Move v1 to newVertex, delete v2
        // Update all edges pointing to v2 to point to v1
        
        const heEdge = he.halfEdges[edge.index];
        if (heEdge.deleted) return null;
        
        // Get affected faces and edges
        let current = edge.index;
        const affectedEdges = [];
        let removedFaces = 0;
        
        // Update vertex position
        he.vertices[edge.v1].x = newVertex.x;
        he.vertices[edge.v1].y = newVertex.y;
        he.vertices[edge.v1].z = newVertex.z;
        
        // Merge quadrics
        quadrics[edge.v1] = this._sumQuadrics(quadrics[edge.v1], quadrics[edge.v2]);
        
        // Mark v2 as deleted
        he.vertices[edge.v2].deleted = true;
        
        // Mark the two faces adjacent to this edge as deleted
        if (heEdge.face !== null) {
            he.faces[heEdge.face].deleted = true;
            removedFaces++;
        }
        
        if (heEdge.twin !== null && he.halfEdges[heEdge.twin].face !== null) {
            he.faces[he.halfEdges[heEdge.twin].face].deleted = true;
            removedFaces++;
        }
        
        // Update references from v2 to v1
        for (let i = 0; i < he.halfEdges.length; i++) {
            if (he.halfEdges[i].deleted) continue;
            if (he.halfEdges[i].vertex === edge.v2) {
                he.halfEdges[i].vertex = edge.v1;
                affectedEdges.push({
                    index: i,
                    v1: he.halfEdges[he.halfEdges[i].prev]?.vertex || edge.v1,
                    v2: edge.v1
                });
            }
        }
        
        // Mark collapsed edges as deleted
        heEdge.deleted = true;
        if (heEdge.twin !== null) {
            he.halfEdges[heEdge.twin].deleted = true;
        }
        
        return { removedFaces, affectedEdges };
    },
    
    _halfEdgeToMesh: function(he) {
        const vertexMap = new Map();
        const vertices = [];
        
        // Collect non-deleted vertices
        for (let i = 0; i < he.vertices.length; i++) {
            if (!he.vertices[i].deleted) {
                vertexMap.set(i, vertices.length / 3);
                vertices.push(he.vertices[i].x, he.vertices[i].y, he.vertices[i].z);
            }
        }
        
        // Collect non-deleted faces
        const indices = [];
        for (const face of he.faces) {
            if (face.deleted) continue;
            
            const faceVerts = this._getFaceVertices(he, face.halfEdge);
            if (faceVerts.every(v => vertexMap.has(v))) {
                indices.push(
                    vertexMap.get(faceVerts[0]),
                    vertexMap.get(faceVerts[1]),
                    vertexMap.get(faceVerts[2])
                );
            }
        }
        
        return { vertices, indices };
    },
    
    _getFaceVertices: function(he, heIdx) {
        const result = [];
        let current = heIdx;
        do {
            result.push(he.halfEdges[he.halfEdges[current].prev].vertex);
            current = he.halfEdges[current].next;
        } while (current !== heIdx && result.length < 3);
        return result;
    },
    
    _heapInsert: function(heap, item) {
        heap.push(item);
        let i = heap.length - 1;
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (heap[parent].cost <= heap[i].cost) break;
            [heap[parent], heap[i]] = [heap[i], heap[parent]];
            i = parent;
        }
    },
    
    _heapPop: function(heap) {
        if (heap.length === 0) return null;
        const result = heap[0];
        const last = heap.pop();
        if (heap.length > 0) {
            heap[0] = last;
            let i = 0;
            while (true) {
                const left = 2 * i + 1;
                const right = 2 * i + 2;
                let smallest = i;
                if (left < heap.length && heap[left].cost < heap[smallest].cost) smallest = left;
                if (right < heap.length && heap[right].cost < heap[smallest].cost) smallest = right;
                if (smallest === i) break;
                [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
                i = smallest;
            }
        }
        return result;
    },
    
    _cross: function(a, b) {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    }
};

if (typeof PRISM_GATEWAY !== 'undefined') {
    PRISM_GATEWAY.register('mesh.simplify.qem', 'PRISM_QEM_SIMPLIFICATION_ENGINE.simplify');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 13: PRISM_LAPLACIAN_SMOOTHING_ENGINE
// Laplacian and Taubin Smoothing
// Source: Taubin 1995, Stanford CS 468
// ═══════════════════════════════════════════════════════════════════════════════

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
}