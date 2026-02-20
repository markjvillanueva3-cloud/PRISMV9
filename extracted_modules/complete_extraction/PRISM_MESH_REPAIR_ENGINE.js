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
        report.operations.push(`Stitched ${stitchResult.mergeCount} duplicate vertices`);
        
        // 2. Remove degenerate faces
        if (removeDegenerate) {
            const degenerateResult = this.removeDegenerateFaces(currentVertices, currentFaces);
            currentFaces = degenerateResult.cleanFaces;
            report.operations.push(`Removed ${degenerateResult.removedCount} degenerate faces`);
        }
        
        // 3. Fix non-manifold edges
        if (fixNonManifold) {
            const edgeResult = this.fixNonManifoldEdges(currentVertices, currentFaces);
            currentFaces = edgeResult.manifoldFaces;
            report.operations.push(`Fixed ${edgeResult.nonManifoldEdges.length} non-manifold edges`);
        }
        
        // 4. Fix non-manifold vertices
        if (fixNonManifold) {
            const vertexResult = this.fixNonManifoldVertices(currentVertices, currentFaces);
            currentVertices = vertexResult.vertices;
            currentFaces = vertexResult.faces;
            report.operations.push(`Fixed ${vertexResult.duplicatedVertices.length} non-manifold vertices`);
        }
        
        // 5. Fill holes
        if (fillHoles) {
            const holes = this.findBoundaryLoops(currentVertices, currentFaces);
            let filledCount = 0;
            
            for (const hole of holes) {
                if (hole.length <= 20) { // Don't fill very large holes
                    const fillResult = this.fillHoleWithRefinement(currentVertices, hole);
                    currentVertices.push(...fillResult.newVertices);
                    currentFaces.push(...fillResult.newFaces);
                    filledCount++;
                }
            }
            report.operations.push(`Filled ${filledCount} holes`);
        }
        
        return {
            vertices: currentVertices,
            faces: currentFaces,
            report
        };
    },
    
    /**
     * Calculate triangle area
     * @private
     */
    _triangleArea: function(v1, v2, v3) {
        const ax = v2.x - v1.x;
        const ay = v2.y - v1.y;
        const az = (v2.z || 0) - (v1.z || 0);
        
        const bx = v3.x - v1.x;
        const by = v3.y - v1.y;
        const bz = (v3.z || 0) - (v1.z || 0);
        
        const cx = ay * bz - az * by;
        const cy = az * bx - ax * bz;
        const cz = ax * by - ay * bx;
        
        return 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
    }
}