// PRISM_FEATURE_RECOGNITION_ENHANCED - Lines 923737-924040 (304 lines) - Feature recognition\n\nconst PRISM_FEATURE_RECOGNITION_ENHANCED = {
    name: 'PRISM_FEATURE_RECOGNITION_ENHANCED',
    version: '1.0.0',
    source: 'MIT 2.008 Manufacturing Systems',
    
    /**
     * Detect Cylindrical Features (Holes, Bosses)
     */
    detectCylindricalFeatures: function(mesh) {
        const { vertices, faces } = mesh;
        const features = [];
        
        // Group faces by normal direction
        const faceGroups = this._groupFacesByNormal(vertices, faces);
        
        // Look for circular cross-sections
        for (const group of faceGroups) {
            const boundary = this._extractBoundary(group.faces, faces);
            
            if (boundary.length > 6) {
                const circlefit = this._fitCircle(boundary.map(i => vertices[i]));
                
                if (circlefit.error < 0.01 * circlefit.radius) {
                    features.push({
                        type: group.normal.z > 0.9 ? 'hole' : 'cylindrical_face',
                        center: circlefit.center,
                        radius: circlefit.radius,
                        normal: group.normal,
                        boundaryVertices: boundary,
                        confidence: 1 - circlefit.error / circlefit.radius
                    });
                }
            }
        }
        
        return features;
    },
    
    /**
     * Detect Pockets (Closed Depressions)
     */
    detectPockets: function(mesh) {
        const { vertices, faces } = mesh;
        const features = [];
        
        // Find planar face groups
        const planarGroups = this._findPlanarFaceGroups(vertices, faces);
        
        for (const group of planarGroups) {
            // Check if group forms a closed depression
            const boundary = this._extractBoundary(group.faces, faces);
            const boundaryPoints = boundary.map(i => vertices[i]);
            
            if (boundaryPoints.length >= 3) {
                const area = this._computePolygonArea(boundaryPoints);
                const perimeter = this._computePolygonPerimeter(boundaryPoints);
                const compactness = 4 * Math.PI * area / (perimeter * perimeter);
                
                // Pocket characteristics
                const avgZ = boundaryPoints.reduce((s, p) => s + (p.z || 0), 0) / boundaryPoints.length;
                const groupAvgZ = group.faces.reduce((s, fi) => {
                    const f = faces[fi];
                    return s + f.reduce((ss, vi) => ss + (vertices[vi].z || 0), 0) / f.length;
                }, 0) / group.faces.length;
                
                if (groupAvgZ < avgZ) { // Depression
                    features.push({
                        type: compactness > 0.7 ? 'circular_pocket' : 'rectangular_pocket',
                        boundary: boundaryPoints,
                        depth: avgZ - groupAvgZ,
                        area,
                        compactness,
                        faces: group.faces
                    });
                }
            }
        }
        
        return features;
    },
    
    /**
     * Detect Slots (Long Narrow Pockets)
     */
    detectSlots: function(mesh) {
        const pockets = this.detectPockets(mesh);
        const slots = [];
        
        for (const pocket of pockets) {
            // Slot criteria: high aspect ratio
            const bbox = this._computeBoundingBox(pocket.boundary);
            const aspectRatio = Math.max(bbox.width, bbox.height) / Math.min(bbox.width, bbox.height);
            
            if (aspectRatio > 3) {
                slots.push({
                    type: 'slot',
                    ...pocket,
                    aspectRatio,
                    length: Math.max(bbox.width, bbox.height),
                    width: Math.min(bbox.width, bbox.height),
                    orientation: bbox.width > bbox.height ? 'x' : 'y'
                });
            }
        }
        
        return slots;
    },
    
    /**
     * Complete Feature Analysis
     */
    analyzeFeatures: function(mesh) {
        const cylindrical = this.detectCylindricalFeatures(mesh);
        const pockets = this.detectPockets(mesh);
        const slots = this.detectSlots(mesh);
        
        // Filter slots from pockets
        const pocketIds = new Set(slots.map(s => s.faces.join(',')));
        const purePockets = pockets.filter(p => !pocketIds.has(p.faces.join(',')));
        
        // Classify holes vs bosses
        const holes = cylindrical.filter(f => f.type === 'hole');
        const bosses = cylindrical.filter(f => f.type !== 'hole');
        
        return {
            holes,
            pockets: purePockets,
            slots,
            bosses,
            summary: {
                totalHoles: holes.length,
                totalPockets: purePockets.length,
                totalSlots: slots.length,
                totalBosses: bosses.length
            }
        };
    },
    
    // Helper methods
    _groupFacesByNormal: function(vertices, faces) {
        const groups = [];
        const tolerance = 0.1;
        
        for (let fi = 0; fi < faces.length; fi++) {
            const face = faces[fi];
            const normal = this._computeFaceNormal(vertices, face);
            
            let found = false;
            for (const group of groups) {
                const dot = normal.x * group.normal.x + normal.y * group.normal.y + normal.z * group.normal.z;
                if (Math.abs(dot - 1) < tolerance) {
                    group.faces.push(fi);
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                groups.push({ normal, faces: [fi] });
            }
        }
        
        return groups;
    },
    
    _computeFaceNormal: function(vertices, face) {
        const p0 = vertices[face[0]];
        const p1 = vertices[face[1]];
        const p2 = vertices[face[2]];
        
        const v1 = { x: p1.x - p0.x, y: p1.y - p0.y, z: (p1.z || 0) - (p0.z || 0) };
        const v2 = { x: p2.x - p0.x, y: p2.y - p0.y, z: (p2.z || 0) - (p0.z || 0) };
        
        const n = {
            x: v1.y * v2.z - v1.z * v2.y,
            y: v1.z * v2.x - v1.x * v2.z,
            z: v1.x * v2.y - v1.y * v2.x
        };
        
        const len = Math.sqrt(n.x*n.x + n.y*n.y + n.z*n.z);
        if (len > 1e-10) {
            n.x /= len; n.y /= len; n.z /= len;
        }
        
        return n;
    },
    
    _extractBoundary: function(faceIndices, allFaces) {
        const edgeCounts = new Map();
        
        for (const fi of faceIndices) {
            const face = allFaces[fi];
            const n = face.length;
            
            for (let i = 0; i < n; i++) {
                const a = face[i];
                const b = face[(i + 1) % n];
                const key = a < b ? `${a}-${b}` : `${b}-${a}`;
                
                edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
            }
        }
        
        // Boundary edges appear once
        const boundary = [];
        for (const [key, count] of edgeCounts) {
            if (count === 1) {
                const [a, b] = key.split('-').map(Number);
                if (!boundary.includes(a)) boundary.push(a);
                if (!boundary.includes(b)) boundary.push(b);
            }
        }
        
        return boundary;
    },
    
    _fitCircle: function(points) {
        // Algebraic circle fit
        const n = points.length;
        let sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0, sumXY = 0;
        let sumX3 = 0, sumY3 = 0, sumX2Y = 0, sumXY2 = 0;
        
        for (const p of points) {
            const x = p.x, y = p.y;
            sumX += x; sumY += y;
            sumX2 += x*x; sumY2 += y*y;
            sumXY += x*y;
            sumX3 += x*x*x; sumY3 += y*y*y;
            sumX2Y += x*x*y; sumXY2 += x*y*y;
        }
        
        const A = n * sumX2 - sumX * sumX;
        const B = n * sumXY - sumX * sumY;
        const C = n * sumY2 - sumY * sumY;
        const D = 0.5 * (n * sumX3 + n * sumXY2 - sumX * sumX2 - sumX * sumY2);
        const E = 0.5 * (n * sumX2Y + n * sumY3 - sumY * sumX2 - sumY * sumY2);
        
        const denom = A * C - B * B;
        if (Math.abs(denom) < 1e-10) {
            return { center: { x: sumX/n, y: sumY/n }, radius: 0, error: Infinity };
        }
        
        const cx = (D * C - B * E) / denom;
        const cy = (A * E - B * D) / denom;
        
        let radius = 0;
        for (const p of points) {
            radius += Math.sqrt((p.x - cx) * (p.x - cx) + (p.y - cy) * (p.y - cy));
        }
        radius /= n;
        
        let error = 0;
        for (const p of points) {
            const dist = Math.sqrt((p.x - cx) * (p.x - cx) + (p.y - cy) * (p.y - cy));
            error += Math.abs(dist - radius);
        }
        error /= n;
        
        return { center: { x: cx, y: cy }, radius, error };
    },
    
    _findPlanarFaceGroups: function(vertices, faces) {
        return this._groupFacesByNormal(vertices, faces).filter(g => 
            Math.abs(g.normal.z) > 0.9
        );
    },
    
    _computePolygonArea: function(points) {
        let area = 0;
        const n = points.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        return Math.abs(area) / 2;
    },
    
    _computePolygonPerimeter: function(points) {
        let perimeter = 0;
        const n = points.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const dx = points[j].x - points[i].x;
            const dy = points[j].y - points[i].y;
            perimeter += Math.sqrt(dx*dx + dy*dy);
        }
        return perimeter;
    },
    
    _computeBoundingBox: function(points) {
        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);
        
        return {
            minX: Math.min(...xs),
            maxX: Math.max(...xs),
            minY: Math.min(...ys),
            maxY: Math.max(...ys),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys)
        };
    }
};
