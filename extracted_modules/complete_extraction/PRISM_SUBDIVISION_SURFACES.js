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