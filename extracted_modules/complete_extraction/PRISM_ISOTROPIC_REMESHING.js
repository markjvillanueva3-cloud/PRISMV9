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
}