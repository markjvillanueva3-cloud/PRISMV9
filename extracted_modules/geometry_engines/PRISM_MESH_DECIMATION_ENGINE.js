const PRISM_MESH_DECIMATION_ENGINE = {
    name: 'PRISM_MESH_DECIMATION_ENGINE',
    version: '1.0.0',
    source: 'Garland & Heckbert 1997, Stanford CS 468',
    description: 'Quadric error mesh simplification for LOD generation',
    
    /**
     * Decimate mesh using Quadric Error Metrics (QEM)
     * @param {Object} mesh - {vertices: Float32Array, indices: Uint32Array}
     * @param {number} targetTriangles - Target triangle count
     * @returns {Object} Decimated mesh
     */
    decimate: function(mesh, targetTriangles) {
        // Parse mesh
        const vertices = this._parseVertices(mesh.vertices);
        const triangles = this._parseTriangles(mesh.indices);
        
        if (triangles.length <= targetTriangles) {
            return mesh; // Already at or below target
        }
        
        // Compute initial quadrics for each vertex
        const quadrics = this._computeInitialQuadrics(vertices, triangles);
        
        // Build edge list and compute error for each edge collapse
        const edges = this._buildEdgeList(triangles);
        const edgeHeap = this._buildEdgeHeap(edges, vertices, quadrics);
        
        // Collapse edges until target reached
        const currentTriangles = new Set(triangles.map((_, i) => i));
        let triCount = triangles.length;
        
        while (triCount > targetTriangles && edgeHeap.length > 0) {
            // Get minimum cost edge
            const minEdge = this._heapPop(edgeHeap);
            
            if (minEdge.collapsed) continue;
            
            // Collapse edge
            const result = this._collapseEdge(
                minEdge, vertices, triangles, quadrics, currentTriangles
            );
            
            if (result.success) {
                triCount -= result.removedTriangles;
                
                // Update affected edges in heap
                this._updateAffectedEdges(
                    result.affectedVertices, edges, vertices, quadrics, edgeHeap
                );
            }
        }
        
        // Build output mesh
        return this._buildOutputMesh(vertices, triangles, currentTriangles);
    },
    
    /**
     * Compute initial quadric matrix for each vertex
     * Q_v = sum of K_f for all faces f containing v
     * K_f is the fundamental quadric for face f
     */
    _computeInitialQuadrics: function(vertices, triangles) {
        const quadrics = vertices.map(() => this._zeroQuadric());
        
        for (const tri of triangles) {
            const v0 = vertices[tri.v0];
            const v1 = vertices[tri.v1];
            const v2 = vertices[tri.v2];
            
            // Compute plane equation ax + by + cz + d = 0
            const plane = this._computePlane(v0, v1, v2);
            
            // Fundamental quadric K_p = p * p^T
            const K = this._planeQuadric(plane);
            
            // Add to vertex quadrics
            this._addQuadric(quadrics[tri.v0], K);
            this._addQuadric(quadrics[tri.v1], K);
            this._addQuadric(quadrics[tri.v2], K);
        }
        
        return quadrics;
    },
    
    /**
     * Compute quadric error for collapsing edge (v1, v2) to point v
     * Error = v^T Q v where Q = Q1 + Q2
     */
    _computeEdgeError: function(v1Idx, v2Idx, vertices, quadrics) {
        const Q = this._addQuadrics(quadrics[v1Idx], quadrics[v2Idx]);
        
        // Find optimal position by solving Q' * v = [0, 0, 0, 1]
        const optimalPos = this._findOptimalPosition(Q, vertices[v1Idx], vertices[v2Idx]);
        
        // Compute error at optimal position
        const error = this._evaluateQuadric(Q, optimalPos);
        
        return { error, position: optimalPos };
    },
    
    /**
     * Find optimal position for edge collapse
     * Solve linear system or use midpoint if singular
     */
    _findOptimalPosition: function(Q, v1, v2) {
        // Try to solve: Q_bar * v = [0, 0, 0, 1]^T
        // where Q_bar replaces last row with [0, 0, 0, 1]
        
        const A = [
            [Q.a[0], Q.a[1], Q.a[2]],
            [Q.a[1], Q.a[4], Q.a[5]],
            [Q.a[2], Q.a[5], Q.a[6]]
        ];
        
        const b = [-Q.a[3], -Q.a[7], -Q.a[8]];
        
        const det = this._det3x3(A);
        
        if (Math.abs(det) < 1e-10) {
            // Singular - use midpoint
            return {
                x: (v1.x + v2.x) / 2,
                y: (v1.y + v2.y) / 2,
                z: (v1.z + v2.z) / 2
            };
        }
        
        // Cramer's rule
        const x = this._det3x3([
            [b[0], A[0][1], A[0][2]],
            [b[1], A[1][1], A[1][2]],
            [b[2], A[2][1], A[2][2]]
        ]) / det;
        
        const y = this._det3x3([
            [A[0][0], b[0], A[0][2]],
            [A[1][0], b[1], A[1][2]],
            [A[2][0], b[2], A[2][2]]
        ]) / det;
        
        const z = this._det3x3([
            [A[0][0], A[0][1], b[0]],
            [A[1][0], A[1][1], b[1]],
            [A[2][0], A[2][1], b[2]]
        ]) / det;
        
        return { x, y, z };
    },
    
    /**
     * Collapse edge by merging v2 into v1
     */
    _collapseEdge: function(edge, vertices, triangles, quadrics, currentTriangles) {
        const { v1, v2, position } = edge;
        
        if (vertices[v1].deleted || vertices[v2].deleted) {
            return { success: false };
        }
        
        // Move v1 to optimal position
        vertices[v1].x = position.x;
        vertices[v1].y = position.y;
        vertices[v1].z = position.z;
        
        // Update quadric
        this._addQuadric(quadrics[v1], quadrics[v2]);
        
        // Mark v2 as deleted
        vertices[v2].deleted = true;
        
        // Update triangles
        let removedTriangles = 0;
        const affectedVertices = new Set([v1]);
        
        for (const triIdx of currentTriangles) {
            const tri = triangles[triIdx];
            
            // Check if triangle uses v2
            let usesV2 = false;
            if (tri.v0 === v2) { tri.v0 = v1; usesV2 = true; }
            if (tri.v1 === v2) { tri.v1 = v1; usesV2 = true; }
            if (tri.v2 === v2) { tri.v2 = v1; usesV2 = true; }
            
            if (usesV2) {
                affectedVertices.add(tri.v0);
                affectedVertices.add(tri.v1);
                affectedVertices.add(tri.v2);
            }
            
            // Check if triangle is degenerate
            if (tri.v0 === tri.v1 || tri.v1 === tri.v2 || tri.v0 === tri.v2) {
                currentTriangles.delete(triIdx);
                removedTriangles++;
            }
        }
        
        return {
            success: true,
            removedTriangles: removedTriangles,
            affectedVertices: affectedVertices
        };
    },
    
    /**
     * Build edge list from triangles
     */
    _buildEdgeList: function(triangles) {
        const edgeMap = new Map();
        
        for (let i = 0; i < triangles.length; i++) {
            const tri = triangles[i];
            this._addEdge(edgeMap, tri.v0, tri.v1, i);
            this._addEdge(edgeMap, tri.v1, tri.v2, i);
            this._addEdge(edgeMap, tri.v2, tri.v0, i);
        }
        
        return Array.from(edgeMap.values());
    },
    
    _addEdge: function(edgeMap, v1, v2, triIdx) {
        const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
        
        if (!edgeMap.has(key)) {
            edgeMap.set(key, {
                v1: Math.min(v1, v2),
                v2: Math.max(v1, v2),
                triangles: [],
                collapsed: false
            });
        }
        
        edgeMap.get(key).triangles.push(triIdx);
    },
    
    /**
     * Build min-heap of edges sorted by collapse error
     */
    _buildEdgeHeap: function(edges, vertices, quadrics) {
        const heap = [];
        
        for (const edge of edges) {
            const { error, position } = this._computeEdgeError(edge.v1, edge.v2, vertices, quadrics);
            edge.error = error;
            edge.position = position;
            this._heapPush(heap, edge);
        }
        
        return heap;
    },
    
    /**
     * Update edges affected by vertex changes
     */
    _updateAffectedEdges: function(affectedVertices, edges, vertices, quadrics, heap) {
        for (const edge of edges) {
            if (edge.collapsed) continue;
            
            if (affectedVertices.has(edge.v1) || affectedVertices.has(edge.v2)) {
                if (vertices[edge.v1].deleted || vertices[edge.v2].deleted) {
                    edge.collapsed = true;
                } else {
                    const { error, position } = this._computeEdgeError(edge.v1, edge.v2, vertices, quadrics);
                    edge.error = error;
                    edge.position = position;
                    // Note: In production, would use decrease-key or lazy deletion
                }
            }
        }
        
        // Rebuild heap (simple approach - production would use better heap)
        heap.length = 0;
        for (const edge of edges) {
            if (!edge.collapsed) {
                this._heapPush(heap, edge);
            }
        }
    },
    
    /**
     * Build output mesh from remaining triangles
     */
    _buildOutputMesh: function(vertices, triangles, currentTriangles) {
        // Compact vertices
        const vertexMap = new Map();
        const newVertices = [];
        let newIdx = 0;
        
        for (let i = 0; i < vertices.length; i++) {
            if (!vertices[i].deleted) {
                vertexMap.set(i, newIdx);
                newVertices.push(vertices[i].x, vertices[i].y, vertices[i].z);
                newIdx++;
            }
        }
        
        // Compact triangles
        const newIndices = [];
        for (const triIdx of currentTriangles) {
            const tri = triangles[triIdx];
            if (vertexMap.has(tri.v0) && vertexMap.has(tri.v1) && vertexMap.has(tri.v2)) {
                newIndices.push(
                    vertexMap.get(tri.v0),
                    vertexMap.get(tri.v1),
                    vertexMap.get(tri.v2)
                );
            }
        }
        
        return {
            vertices: new Float32Array(newVertices),
            indices: new Uint32Array(newIndices)
        };
    },
    
    // Quadric operations
    _zeroQuadric: function() {
        return { a: new Float64Array(10) };
    },
    
    _planeQuadric: function(plane) {
        const { a, b, c, d } = plane;
        return {
            a: new Float64Array([
                a * a, a * b, a * c, a * d,
                b * b, b * c, b * d,
                c * c, c * d,
                d * d
            ])
        };
    },
    
    _addQuadric: function(Q1, Q2) {
        for (let i = 0; i < 10; i++) {
            Q1.a[i] += Q2.a[i];
        }
    },
    
    _addQuadrics: function(Q1, Q2) {
        const result = { a: new Float64Array(10) };
        for (let i = 0; i < 10; i++) {
            result.a[i] = Q1.a[i] + Q2.a[i];
        }
        return result;
    },
    
    _evaluateQuadric: function(Q, v) {
        // v^T Q v for homogeneous coordinates [x, y, z, 1]
        const a = Q.a;
        return (
            a[0] * v.x * v.x +
            2 * a[1] * v.x * v.y +
            2 * a[2] * v.x * v.z +
            2 * a[3] * v.x +
            a[4] * v.y * v.y +
            2 * a[5] * v.y * v.z +
            2 * a[6] * v.y +
            a[7] * v.z * v.z +
            2 * a[8] * v.z +
            a[9]
        );
    },
    
    _computePlane: function(v0, v1, v2) {
        // Normal from cross product
        const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
        const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
        
        const n = {
            x: e1.y * e2.z - e1.z * e2.y,
            y: e1.z * e2.x - e1.x * e2.z,
            z: e1.x * e2.y - e1.y * e2.x
        };
        
        const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
        if (len < 1e-10) return { a: 0, b: 0, c: 1, d: 0 };
        
        const a = n.x / len;
        const b = n.y / len;
        const c = n.z / len;
        const d = -(a * v0.x + b * v0.y + c * v0.z);
        
        return { a, b, c, d };
    },
    
    _det3x3: function(m) {
        return (
            m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
            m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
            m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
        );
    },
    
    // Mesh parsing
    _parseVertices: function(vertexArray) {
        const vertices = [];
        for (let i = 0; i < vertexArray.length; i += 3) {
            vertices.push({
                x: vertexArray[i],
                y: vertexArray[i + 1],
                z: vertexArray[i + 2],
                deleted: false
            });
        }
        return vertices;
    },
    
    _parseTriangles: function(indexArray) {
        const triangles = [];
        for (let i = 0; i < indexArray.length; i += 3) {
            triangles.push({
                v0: indexArray[i],
                v1: indexArray[i + 1],
                v2: indexArray[i + 2]
            });
        }
        return triangles;
    },
    
    // Min-heap operations
    _heapPush: function(heap, edge) {
        heap.push(edge);
        let i = heap.length - 1;
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (heap[parent].error <= heap[i].error) break;
            [heap[parent], heap[i]] = [heap[i], heap[parent]];
            i = parent;
        }
    },
    
    _heapPop: function(heap) {
        if (heap.length === 0) return null;
        if (heap.length === 1) return heap.pop();
        
        const result = heap[0];
        heap[0] = heap.pop();
        
        let i = 0;
        while (true) {
            const left = 2 * i + 1;
            const right = 2 * i + 2;
            let smallest = i;
            
            if (left < heap.length && heap[left].error < heap[smallest].error) {
                smallest = left;
            }
            if (right < heap.length && heap[right].error < heap[smallest].error) {
                smallest = right;
            }
            
            if (smallest === i) break;
            
            [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
            i = smallest;
        }
        
        return result;
    }
}