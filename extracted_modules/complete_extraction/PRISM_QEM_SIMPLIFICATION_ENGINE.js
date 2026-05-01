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
}