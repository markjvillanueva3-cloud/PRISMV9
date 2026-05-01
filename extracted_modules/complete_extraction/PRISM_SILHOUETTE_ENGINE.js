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
}