/**
 * PRISM_CURVATURE_ANALYSIS_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 313
 * Session: R2.3.1 Engine Gap Extraction Round 3
 */

const PRISM_CURVATURE_ANALYSIS_ENGINE = {
    name: 'PRISM_CURVATURE_ANALYSIS_ENGINE',
    version: '1.0.0',
    source: 'Meyer et al. 2003, Stanford CS 468',
    
    /**
     * Compute all curvature types
     */
    computeAll: function(mesh) {
        const gaussian = this.computeGaussian(mesh);
        const mean = this.computeMean(mesh);
        const principal = this.computePrincipal(gaussian, mean);
        
        return {
            gaussian,
            mean,
            principalMax: principal.max,
            principalMin: principal.min,
            shapeIndex: principal.shapeIndex,
            curvedness: principal.curvedness
        };
    },
    
    /**
     * Gaussian curvature via angle defect
     */
    computeGaussian: function(mesh) {
        const numVertices = mesh.vertices.length / 3;
        const curvature = new Float32Array(numVertices);
        const areas = this._computeMixedVoronoiAreas(mesh);
        
        // Initialize with 2π (full angle for interior vertex)
        for (let i = 0; i < numVertices; i++) {
            curvature[i] = 2 * Math.PI;
        }
        
        // Subtract angles at each face
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const a = mesh.indices[i], b = mesh.indices[i + 1], c = mesh.indices[i + 2];
            
            const va = this._getVertex(mesh.vertices, a);
            const vb = this._getVertex(mesh.vertices, b);
            const vc = this._getVertex(mesh.vertices, c);
            
            const angles = this._computeTriangleAngles(va, vb, vc);
            
            curvature[a] -= angles[0];
            curvature[b] -= angles[1];
            curvature[c] -= angles[2];
        }
        
        // Normalize by mixed area
        for (let i = 0; i < numVertices; i++) {
            if (areas[i] > 1e-10) {
                curvature[i] /= areas[i];
            }
        }
        
        return Array.from(curvature);
    },
    
    /**
     * Mean curvature via Laplace-Beltrami
     */
    computeMean: function(mesh) {
        const numVertices = mesh.vertices.length / 3;
        const curvature = new Float32Array(numVertices);
        const areas = this._computeMixedVoronoiAreas(mesh);
        const cotWeights = this._computeCotangentWeights(mesh);
        
        for (let i = 0; i < numVertices; i++) {
            const vi = this._getVertex(mesh.vertices, i);
            let laplaceX = 0, laplaceY = 0, laplaceZ = 0;
            
            for (const { neighbor, weight } of cotWeights[i]) {
                const vj = this._getVertex(mesh.vertices, neighbor);
                laplaceX += weight * (vj.x - vi.x);
                laplaceY += weight * (vj.y - vi.y);
                laplaceZ += weight * (vj.z - vi.z);
            }
            
            // Mean curvature = |Laplacian| / (2 * A)
            const laplaceMag = Math.sqrt(laplaceX * laplaceX + laplaceY * laplaceY + laplaceZ * laplaceZ);
            
            if (areas[i] > 1e-10) {
                curvature[i] = laplaceMag / (2 * areas[i]);
            }
        }
        
        return Array.from(curvature);
    },
    
    /**
     * Principal curvatures from Gaussian and Mean
     */
    computePrincipal: function(gaussian, mean) {
        const n = gaussian.length;
        const max = new Float32Array(n);
        const min = new Float32Array(n);
        const shapeIndex = new Float32Array(n);
        const curvedness = new Float32Array(n);
        
        for (let i = 0; i < n; i++) {
            const K = gaussian[i]; // Gaussian = k1 * k2
            const H = mean[i];     // Mean = (k1 + k2) / 2
            
            const discriminant = Math.max(0, H * H - K);
            const sqrtD = Math.sqrt(discriminant);
            
            max[i] = H + sqrtD;  // k1
            min[i] = H - sqrtD;  // k2
            
            // Shape index: -1 (cup) to +1 (cap)
            if (Math.abs(max[i] - min[i]) > 1e-10) {
                shapeIndex[i] = (2 / Math.PI) * Math.atan((max[i] + min[i]) / (max[i] - min[i]));
            }
            
            // Curvedness: measure of total curvature
            curvedness[i] = Math.sqrt((max[i] * max[i] + min[i] * min[i]) / 2);
        }
        
        return {
            max: Array.from(max),
            min: Array.from(min),
            shapeIndex: Array.from(shapeIndex),
            curvedness: Array.from(curvedness)
        };
    },
    
    /**
     * Classify surface type at each vertex
     */
    classifySurface: function(curvatureData) {
        const { gaussian, mean, shapeIndex } = curvatureData;
        const n = gaussian.length;
        const classification = [];
        
        for (let i = 0; i < n; i++) {
            const K = gaussian[i];
            const H = mean[i];
            const eps = 1e-6;
            
            let type;
            if (Math.abs(K) < eps && Math.abs(H) < eps) {
                type = 'planar';
            } else if (Math.abs(K) < eps && H > eps) {
                type = 'cylindrical_convex';
            } else if (Math.abs(K) < eps && H < -eps) {
                type = 'cylindrical_concave';
            } else if (K > eps && H > eps) {
                type = 'elliptic_convex';
            } else if (K > eps && H < -eps) {
                type = 'elliptic_concave';
            } else if (K < -eps) {
                type = 'hyperbolic';
            } else if (Math.abs(H) < eps) {
                type = 'minimal_surface';
            } else {
                type = 'unknown';
            }
            
            classification.push({
                type,
                gaussian: K,
                mean: H,
                shapeIndex: shapeIndex[i]
            });
        }
        
        return classification;
    },
    
    _computeMixedVoronoiAreas: function(mesh) {
        const numVertices = mesh.vertices.length / 3;
        const areas = new Float32Array(numVertices);
        
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const a = mesh.indices[i], b = mesh.indices[i + 1], c = mesh.indices[i + 2];
            
            const va = this._getVertex(mesh.vertices, a);
            const vb = this._getVertex(mesh.vertices, b);
            const vc = this._getVertex(mesh.vertices, c);
            
            const angles = this._computeTriangleAngles(va, vb, vc);
            const isObtuse = angles.some(ang => ang > Math.PI / 2);
            
            if (isObtuse) {
                // Use face area / 2 or / 4
                const faceArea = this._triangleArea(va, vb, vc);
                for (let j = 0; j < 3; j++) {
                    const idx = mesh.indices[i + j];
                    areas[idx] += angles[j] > Math.PI / 2 ? faceArea / 2 : faceArea / 4;
                }
            } else {
                // Voronoi area using cotangent formula
                const cotA = this._cotangent(angles[0]);
                const cotB = this._cotangent(angles[1]);
                const cotC = this._cotangent(angles[2]);
                
                const ab2 = this._distSquared(va, vb);
                const bc2 = this._distSquared(vb, vc);
                const ca2 = this._distSquared(vc, va);
                
                areas[a] += (ab2 * cotC + ca2 * cotB) / 8;
                areas[b] += (ab2 * cotC + bc2 * cotA) / 8;
                areas[c] += (bc2 * cotA + ca2 * cotB) / 8;
            }
        }
        
        return areas;
    },
    
    _computeCotangentWeights: function(mesh) {
        const numVertices = mesh.vertices.length / 3;
        const weights = Array.from({ length: numVertices }, () => []);
        const edgeWeights = new Map();
        
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const indices = [mesh.indices[i], mesh.indices[i + 1], mesh.indices[i + 2]];
            const verts = indices.map(idx => this._getVertex(mesh.vertices, idx));
            
            for (let j = 0; j < 3; j++) {
                const a = indices[j];
                const b = indices[(j + 1) % 3];
                const c = indices[(j + 2) % 3];
                
                const ca = this._subtract(verts[j], verts[(j + 2) % 3]);
                const cb = this._subtract(verts[(j + 1) % 3], verts[(j + 2) % 3]);
                
                const dot = this._dot(ca, cb);
                const cross = this._cross(ca, cb);
                const crossLen = Math.sqrt(this._dot(cross, cross));
                
                const cotWeight = crossLen > 1e-10 ? dot / crossLen : 0;
                
                const key = `${Math.min(a, b)},${Math.max(a, b)}`;
                edgeWeights.set(key, (edgeWeights.get(key) || 0) + Math.max(0, cotWeight) / 2);
            }
        }
        
        for (const [key, weight] of edgeWeights) {
            const [a, b] = key.split(',').map(Number);
            weights[a].push({ neighbor: b, weight });
            weights[b].push({ neighbor: a, weight });
        }
        
        return weights;
    },
    
    _computeTriangleAngles: function(a, b, c) {
        const ab = this._subtract(b, a);
        const ac = this._subtract(c, a);
        const ba = this._subtract(a, b);
        const bc = this._subtract(c, b);
        const ca = this._subtract(a, c);
        const cb = this._subtract(b, c);
        
        return [
            this._angleBetween(ab, ac),
            this._angleBetween(ba, bc),
            this._angleBetween(ca, cb)
        ];
    },
    
    _angleBetween: function(a, b) {
        const dot = this._dot(a, b);
        const lenA = Math.sqrt(this._dot(a, a));
        const lenB = Math.sqrt(this._dot(b, b));
        if (lenA < 1e-10 || lenB < 1e-10) return 0;
        return Math.acos(Math.max(-1, Math.min(1, dot / (lenA * lenB))));
    },
    
    _triangleArea: function(a, b, c) {
        const ab = this._subtract(b, a);
        const ac = this._subtract(c, a);
        const cross = this._cross(ab, ac);
        return Math.sqrt(this._dot(cross, cross)) / 2;
    },
    
    _cotangent: function(angle) {
        const sinA = Math.sin(angle);
        return sinA > 1e-10 ? Math.cos(angle) / sinA : 0;
    },
    
    _getVertex: function(vertices, idx) {
        return {
            x: vertices[idx * 3],
            y: vertices[idx * 3 + 1],
            z: vertices[idx * 3 + 2]
        };
    },
    
    _subtract: function(a, b) {
        return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    },
    
    _dot: function(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    },
    
    _cross: function(a, b) {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    },
    
    _distSquared: function(a, b) {
        const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
        return dx * dx + dy * dy + dz * dz;
    }
}