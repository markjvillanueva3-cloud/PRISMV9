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
}