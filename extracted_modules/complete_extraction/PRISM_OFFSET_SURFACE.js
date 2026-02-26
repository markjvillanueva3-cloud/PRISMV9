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
}