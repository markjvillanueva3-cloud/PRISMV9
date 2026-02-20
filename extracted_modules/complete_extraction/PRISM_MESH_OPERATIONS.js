const PRISM_MESH_OPERATIONS = {
    name: 'PRISM_MESH_OPERATIONS',
    version: '1.0.0',
    source: 'Stanford CS 468 - Geometry Processing',
    
    /**
     * Loop Subdivision (Triangle Meshes)
     */
    loopSubdivision: function(mesh) {
        const { vertices, faces } = mesh;
        const newVertices = [...vertices];
        const newFaces = [];
        const edgeVertices = new Map();
        
        // Create edge midpoints
        for (const face of faces) {
            const edges = [
                [face[0], face[1]],
                [face[1], face[2]],
                [face[2], face[0]]
            ];
            
            for (const [i, j] of edges) {
                const key = i < j ? `${i}-${j}` : `${j}-${i}`;
                
                if (!edgeVertices.has(key)) {
                    // Find adjacent faces
                    const v0 = vertices[i];
                    const v1 = vertices[j];
                    
                    // Edge vertex (simplified - just midpoint for boundary)
                    const edgeVert = {
                        x: (v0.x + v1.x) / 2,
                        y: (v0.y + v1.y) / 2,
                        z: (v0.z + v1.z) / 2
                    };
                    
                    edgeVertices.set(key, newVertices.length);
                    newVertices.push(edgeVert);
                }
            }
        }
        
        // Update original vertices (simplified - just keep positions)
        // Full Loop would use β = 1/n * (5/8 - (3/8 + 1/4*cos(2π/n))²)
        
        // Create new faces
        for (const face of faces) {
            const [a, b, c] = face;
            
            const key_ab = a < b ? `${a}-${b}` : `${b}-${a}`;
            const key_bc = b < c ? `${b}-${c}` : `${c}-${b}`;
            const key_ca = c < a ? `${c}-${a}` : `${a}-${c}`;
            
            const ab = edgeVertices.get(key_ab);
            const bc = edgeVertices.get(key_bc);
            const ca = edgeVertices.get(key_ca);
            
            newFaces.push([a, ab, ca]);
            newFaces.push([ab, b, bc]);
            newFaces.push([ca, bc, c]);
            newFaces.push([ab, bc, ca]);
        }
        
        return { vertices: newVertices, faces: newFaces };
    },
    
    /**
     * Catmull-Clark Subdivision (Quad Meshes)
     */
    catmullClarkSubdivision: function(mesh) {
        const { vertices, faces } = mesh;
        const newVertices = [];
        const newFaces = [];
        
        // 1. Face points
        const facePoints = [];
        for (const face of faces) {
            let avg = { x: 0, y: 0, z: 0 };
            for (const idx of face) {
                avg.x += vertices[idx].x;
                avg.y += vertices[idx].y;
                avg.z += vertices[idx].z;
            }
            const n = face.length;
            facePoints.push({
                x: avg.x / n,
                y: avg.y / n,
                z: avg.z / n
            });
        }
        
        // 2. Edge points
        const edgePoints = new Map();
        const edgeAdjFaces = new Map();
        
        for (let fi = 0; fi < faces.length; fi++) {
            const face = faces[fi];
            const n = face.length;
            
            for (let i = 0; i < n; i++) {
                const a = face[i];
                const b = face[(i + 1) % n];
                const key = a < b ? `${a}-${b}` : `${b}-${a}`;
                
                if (!edgeAdjFaces.has(key)) {
                    edgeAdjFaces.set(key, []);
                }
                edgeAdjFaces.get(key).push(fi);
            }
        }
        
        for (const [key, adjFaces] of edgeAdjFaces) {
            const [a, b] = key.split('-').map(Number);
            const v0 = vertices[a];
            const v1 = vertices[b];
            
            if (adjFaces.length === 2) {
                // Interior edge: average of endpoints and adjacent face points
                const f0 = facePoints[adjFaces[0]];
                const f1 = facePoints[adjFaces[1]];
                edgePoints.set(key, {
                    x: (v0.x + v1.x + f0.x + f1.x) / 4,
                    y: (v0.y + v1.y + f0.y + f1.y) / 4,
                    z: (v0.z + v1.z + f0.z + f1.z) / 4
                });
            } else {
                // Boundary edge: midpoint
                edgePoints.set(key, {
                    x: (v0.x + v1.x) / 2,
                    y: (v0.y + v1.y) / 2,
                    z: (v0.z + v1.z) / 2
                });
            }
        }
        
        // 3. New vertex positions
        // Build vertex adjacency
        const vertexAdjFaces = vertices.map(() => []);
        const vertexAdjEdges = vertices.map(() => []);
        
        for (let fi = 0; fi < faces.length; fi++) {
            for (const v of faces[fi]) {
                vertexAdjFaces[v].push(fi);
            }
        }
        
        for (const key of edgeAdjFaces.keys()) {
            const [a, b] = key.split('-').map(Number);
            vertexAdjEdges[a].push(key);
            vertexAdjEdges[b].push(key);
        }
        
        const movedVertices = [];
        for (let vi = 0; vi < vertices.length; vi++) {
            const n = vertexAdjFaces[vi].length;
            const v = vertices[vi];
            
            if (n === 0) {
                movedVertices.push({ ...v });
                continue;
            }
            
            // F = average of adjacent face points
            let F = { x: 0, y: 0, z: 0 };
            for (const fi of vertexAdjFaces[vi]) {
                F.x += facePoints[fi].x;
                F.y += facePoints[fi].y;
                F.z += facePoints[fi].z;
            }
            F.x /= n; F.y /= n; F.z /= n;
            
            // R = average of adjacent edge midpoints
            let R = { x: 0, y: 0, z: 0 };
            for (const key of vertexAdjEdges[vi]) {
                const [a, b] = key.split('-').map(Number);
                const other = a === vi ? b : a;
                R.x += (v.x + vertices[other].x) / 2;
                R.y += (v.y + vertices[other].y) / 2;
                R.z += (v.z + vertices[other].z) / 2;
            }
            const numEdges = vertexAdjEdges[vi].length;
            if (numEdges > 0) {
                R.x /= numEdges; R.y /= numEdges; R.z /= numEdges;
            }
            
            // New position: (F + 2R + (n-3)P) / n
            movedVertices.push({
                x: (F.x + 2 * R.x + (n - 3) * v.x) / n,
                y: (F.y + 2 * R.y + (n - 3) * v.y) / n,
                z: (F.z + 2 * R.z + (n - 3) * v.z) / n
            });
        }
        
        // 4. Build new mesh
        // Add moved vertices
        for (const v of movedVertices) newVertices.push(v);
        const vertexOffset = movedVertices.length;
        
        // Add edge points
        const edgePointIndices = new Map();
        for (const [key, pt] of edgePoints) {
            edgePointIndices.set(key, newVertices.length);
            newVertices.push(pt);
        }
        const edgeOffset = newVertices.length;
        
        // Add face points
        const facePointIndices = [];
        for (const pt of facePoints) {
            facePointIndices.push(newVertices.length);
            newVertices.push(pt);
        }
        
        // Create new quad faces
        for (let fi = 0; fi < faces.length; fi++) {
            const face = faces[fi];
            const n = face.length;
            const faceIdx = facePointIndices[fi];
            
            for (let i = 0; i < n; i++) {
                const v = face[i];
                const vNext = face[(i + 1) % n];
                const vPrev = face[(i - 1 + n) % n];
                
                const keyNext = v < vNext ? `${v}-${vNext}` : `${vNext}-${v}`;
                const keyPrev = vPrev < v ? `${vPrev}-${v}` : `${v}-${vPrev}`;
                
                const edgeNext = edgePointIndices.get(keyNext);
                const edgePrev = edgePointIndices.get(keyPrev);
                
                newFaces.push([v, edgeNext, faceIdx, edgePrev]);
            }
        }
        
        return { vertices: newVertices, faces: newFaces };
    },
    
    /**
     * Laplacian Mesh Smoothing
     */
    laplacianSmoothing: function(mesh, iterations = 1, lambda = 0.5) {
        let { vertices, faces } = mesh;
        vertices = vertices.map(v => ({ ...v }));
        
        // Build adjacency
        const neighbors = vertices.map(() => new Set());
        for (const face of faces) {
            const n = face.length;
            for (let i = 0; i < n; i++) {
                const a = face[i];
                const b = face[(i + 1) % n];
                neighbors[a].add(b);
                neighbors[b].add(a);
            }
        }
        
        // Iterate
        for (let iter = 0; iter < iterations; iter++) {
            const newPositions = [];
            
            for (let i = 0; i < vertices.length; i++) {
                const v = vertices[i];
                const neighs = Array.from(neighbors[i]);
                
                if (neighs.length === 0) {
                    newPositions.push({ ...v });
                    continue;
                }
                
                // Compute centroid of neighbors
                let centroid = { x: 0, y: 0, z: 0 };
                for (const ni of neighs) {
                    centroid.x += vertices[ni].x;
                    centroid.y += vertices[ni].y;
                    centroid.z += vertices[ni].z;
                }
                centroid.x /= neighs.length;
                centroid.y /= neighs.length;
                centroid.z /= neighs.length;
                
                // Move toward centroid
                newPositions.push({
                    x: v.x + lambda * (centroid.x - v.x),
                    y: v.y + lambda * (centroid.y - v.y),
                    z: v.z + lambda * (centroid.z - v.z)
                });
            }
            
            vertices = newPositions;
        }
        
        return { vertices, faces };
    },
    
    /**
     * QEM Mesh Decimation (Quadric Error Metrics)
     */
    qemDecimation: function(mesh, targetFaces) {
        let { vertices, faces } = mesh;
        vertices = vertices.map(v => ({ ...v }));
        faces = faces.map(f => [...f]);
        
        // Compute quadrics for each vertex
        const quadrics = vertices.map(() => this._zeroQuadric());
        
        for (const face of faces) {
            const [i, j, k] = face;
            const p0 = vertices[i];
            const p1 = vertices[j];
            const p2 = vertices[k];
            
            // Face normal
            const v1 = { x: p1.x - p0.x, y: p1.y - p0.y, z: p1.z - p0.z };
            const v2 = { x: p2.x - p0.x, y: p2.y - p0.y, z: p2.z - p0.z };
            const n = this._cross(v1, v2);
            const len = Math.sqrt(n.x*n.x + n.y*n.y + n.z*n.z);
            
            if (len > 1e-10) {
                n.x /= len; n.y /= len; n.z /= len;
                const d = -(n.x * p0.x + n.y * p0.y + n.z * p0.z);
                
                // Plane quadric
                const Q = this._planeQuadric(n.x, n.y, n.z, d);
                
                this._addQuadric(quadrics[i], Q);
                this._addQuadric(quadrics[j], Q);
                this._addQuadric(quadrics[k], Q);
            }
        }
        
        // Build edge list with costs
        const edges = [];
        const edgeSet = new Set();
        
        for (const face of faces) {
            const faceEdges = [[face[0], face[1]], [face[1], face[2]], [face[2], face[0]]];
            for (const [i, j] of faceEdges) {
                const key = i < j ? `${i}-${j}` : `${j}-${i}`;
                if (!edgeSet.has(key)) {
                    edgeSet.add(key);
                    const cost = this._computeEdgeCost(quadrics[i], quadrics[j], vertices[i], vertices[j]);
                    edges.push({ i, j, cost: cost.cost, optimalPos: cost.position });
                }
            }
        }
        
        // Sort by cost
        edges.sort((a, b) => a.cost - b.cost);
        
        // Collapse edges until target reached
        const collapsed = new Set();
        let currentFaces = faces.length;
        
        while (currentFaces > targetFaces && edges.length > 0) {
            const edge = edges.shift();
            
            if (collapsed.has(edge.i) || collapsed.has(edge.j)) continue;
            
            // Collapse edge
            collapsed.add(edge.j);
            vertices[edge.i] = edge.optimalPos;
            
            // Update quadric
            this._addQuadric(quadrics[edge.i], quadrics[edge.j]);
            
            // Update faces
            const newFaces = [];
            for (const face of faces) {
                const newFace = face.map(v => v === edge.j ? edge.i : v);
                
                // Check for degenerate triangle
                if (new Set(newFace).size === 3) {
                    newFaces.push(newFace);
                } else {
                    currentFaces--;
                }
            }
            faces = newFaces;
        }
        
        // Remove collapsed vertices
        const vertexMap = new Map();
        const finalVertices = [];
        
        for (let i = 0; i < vertices.length; i++) {
            if (!collapsed.has(i)) {
                vertexMap.set(i, finalVertices.length);
                finalVertices.push(vertices[i]);
            }
        }
        
        const finalFaces = faces.map(face => 
            face.map(v => vertexMap.get(v))
        ).filter(face => face.every(v => v !== undefined));
        
        return { vertices: finalVertices, faces: finalFaces };
    },
    
    _zeroQuadric: function() {
        return [[0,0,0,0], [0,0,0,0], [0,0,0,0], [0,0,0,0]];
    },
    
    _planeQuadric: function(a, b, c, d) {
        return [
            [a*a, a*b, a*c, a*d],
            [a*b, b*b, b*c, b*d],
            [a*c, b*c, c*c, c*d],
            [a*d, b*d, c*d, d*d]
        ];
    },
    
    _addQuadric: function(Q1, Q2) {
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                Q1[i][j] += Q2[i][j];
            }
        }
    },
    
    _computeEdgeCost: function(Q1, Q2, v1, v2) {
        const Q = this._zeroQuadric();
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                Q[i][j] = Q1[i][j] + Q2[i][j];
            }
        }
        
        // Optimal position: midpoint (simplified - full would solve Q * v = 0)
        const position = {
            x: (v1.x + v2.x) / 2,
            y: (v1.y + v2.y) / 2,
            z: (v1.z + v2.z) / 2
        };
        
        // Quadric error at position
        const p = [position.x, position.y, position.z, 1];
        let cost = 0;
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                cost += p[i] * Q[i][j] * p[j];
            }
        }
        
        return { cost, position };
    },
    
    _cross: function(v1, v2) {
        return {
            x: v1.y * v2.z - v1.z * v2.y,
            y: v1.z * v2.x - v1.x * v2.z,
            z: v1.x * v2.y - v1.y * v2.x
        };
    }
}