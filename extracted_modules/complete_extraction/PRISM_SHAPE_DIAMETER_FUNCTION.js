const PRISM_SHAPE_DIAMETER_FUNCTION = {
    name: 'PRISM_SHAPE_DIAMETER_FUNCTION',
    version: '1.0.0',
    source: 'Shapira et al. 2008, CGAL Shape Analysis',
    
    /**
     * Compute Shape Diameter Function for each vertex
     * SDF measures local thickness by shooting rays into the interior
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @param {Object} options - Computation options
     * @returns {Array} SDF value for each vertex
     */
    computeSDF: function(vertices, faces, options = {}) {
        const {
            numRays = 30,
            coneAngle = Math.PI / 6, // 30 degrees
            useMedian = true
        } = options;
        
        // Compute vertex normals
        const normals = this._computeVertexNormals(vertices, faces);
        
        // Build BVH or spatial index for ray casting
        const triangles = faces.map(face => ({
            v0: vertices[face[0]],
            v1: vertices[face[1]],
            v2: vertices[face[2]],
            indices: face
        }));
        
        const sdf = vertices.map((vertex, vi) => {
            const normal = normals[vi];
            const inwardNormal = { x: -normal.x, y: -normal.y, z: -normal.z };
            
            // Sample rays in cone around inward normal
            const distances = [];
            
            for (let i = 0; i < numRays; i++) {
                const rayDir = this._sampleConeDirection(inwardNormal, coneAngle);
                const hit = this._raycast(vertex, rayDir, triangles, vi);
                
                if (hit.distance > 0 && hit.distance < Infinity) {
                    distances.push(hit.distance);
                }
            }
            
            if (distances.length === 0) {
                return 0;
            }
            
            if (useMedian) {
                distances.sort((a, b) => a - b);
                return distances[Math.floor(distances.length / 2)];
            } else {
                return distances.reduce((a, b) => a + b, 0) / distances.length;
            }
        });
        
        return sdf;
    },
    
    /**
     * Segment mesh based on SDF values
     * Uses k-means clustering on SDF
     * @param {Array} sdf - SDF values per vertex
     * @param {number} numSegments - Number of segments
     * @returns {Array} Segment ID for each vertex
     */
    segmentBySDF: function(sdf, numSegments = 4) {
        // K-means clustering on SDF values
        const n = sdf.length;
        
        // Initialize centroids
        const minSDF = Math.min(...sdf.filter(s => s > 0));
        const maxSDF = Math.max(...sdf);
        const centroids = [];
        
        for (let i = 0; i < numSegments; i++) {
            centroids.push(minSDF + (maxSDF - minSDF) * (i + 0.5) / numSegments);
        }
        
        let labels = new Array(n).fill(0);
        
        // K-means iterations
        for (let iter = 0; iter < 20; iter++) {
            // Assign each vertex to nearest centroid
            labels = sdf.map(s => {
                let minDist = Infinity;
                let minIdx = 0;
                for (let j = 0; j < numSegments; j++) {
                    const dist = Math.abs(s - centroids[j]);
                    if (dist < minDist) {
                        minDist = dist;
                        minIdx = j;
                    }
                }
                return minIdx;
            });
            
            // Update centroids
            const sums = new Array(numSegments).fill(0);
            const counts = new Array(numSegments).fill(0);
            
            for (let i = 0; i < n; i++) {
                sums[labels[i]] += sdf[i];
                counts[labels[i]]++;
            }
            
            for (let j = 0; j < numSegments; j++) {
                if (counts[j] > 0) {
                    centroids[j] = sums[j] / counts[j];
                }
            }
        }
        
        return {
            labels,
            centroids,
            numSegments
        };
    },
    
    /**
     * Compute volume of mesh using SDF integration
     * Approximate volume from shape diameter
     * @param {Array} vertices - Vertex positions
     * @param {Array} faces - Triangle indices
     * @param {Array} sdf - Pre-computed SDF (optional)
     * @returns {number} Approximate volume
     */
    estimateVolume: function(vertices, faces, sdf = null) {
        if (!sdf) {
            sdf = this.computeSDF(vertices, faces);
        }
        
        // Integrate SDF over surface: V ≈ ∫ SDF/2 dA
        let volume = 0;
        
        for (const face of faces) {
            const area = this._triangleArea(
                vertices[face[0]],
                vertices[face[1]],
                vertices[face[2]]
            );
            
            const avgSDF = (sdf[face[0]] + sdf[face[1]] + sdf[face[2]]) / 3;
            volume += area * avgSDF / 2;
        }
        
        return volume;
    },
    
    _computeVertexNormals: function(vertices, faces) {
        const normals = vertices.map(() => ({ x: 0, y: 0, z: 0 }));
        
        for (const face of faces) {
            const v0 = vertices[face[0]];
            const v1 = vertices[face[1]];
            const v2 = vertices[face[2]];
            
            // Face normal
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
        
        // Normalize
        return normals.map(n => {
            const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
            if (len > 1e-10) {
                return { x: n.x / len, y: n.y / len, z: n.z / len };
            }
            return { x: 0, y: 0, z: 1 };
        });
    },
    
    _sampleConeDirection: function(axis, coneAngle) {
        // Sample uniformly in cone
        const phi = Math.random() * 2 * Math.PI;
        const cosTheta = 1 - Math.random() * (1 - Math.cos(coneAngle));
        const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
        
        // Create local coordinate system
        const up = Math.abs(axis.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
        const right = this._normalize(this._cross(up, axis));
        const forward = this._cross(axis, right);
        
        return {
            x: sinTheta * Math.cos(phi) * right.x + sinTheta * Math.sin(phi) * forward.x + cosTheta * axis.x,
            y: sinTheta * Math.cos(phi) * right.y + sinTheta * Math.sin(phi) * forward.y + cosTheta * axis.y,
            z: sinTheta * Math.cos(phi) * right.z + sinTheta * Math.sin(phi) * forward.z + cosTheta * axis.z
        };
    },
    
    _raycast: function(origin, direction, triangles, excludeVertex) {
        let minDist = Infinity;
        
        for (const tri of triangles) {
            // Skip triangles containing the origin vertex
            if (tri.indices.includes(excludeVertex)) continue;
            
            const hit = this._rayTriangleIntersect(origin, direction, tri.v0, tri.v1, tri.v2);
            if (hit > 1e-6 && hit < minDist) {
                minDist = hit;
            }
        }
        
        return { distance: minDist };
    },
    
    _rayTriangleIntersect: function(origin, dir, v0, v1, v2) {
        // Möller–Trumbore algorithm
        const EPSILON = 1e-10;
        
        const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: (v1.z || 0) - (v0.z || 0) };
        const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: (v2.z || 0) - (v0.z || 0) };
        
        const h = this._cross(dir, e2);
        const a = this._dot(e1, h);
        
        if (Math.abs(a) < EPSILON) return -1;
        
        const f = 1 / a;
        const s = { x: origin.x - v0.x, y: origin.y - v0.y, z: (origin.z || 0) - (v0.z || 0) };
        const u = f * this._dot(s, h);
        
        if (u < 0 || u > 1) return -1;
        
        const q = this._cross(s, e1);
        const v = f * this._dot(dir, q);
        
        if (v < 0 || u + v > 1) return -1;
        
        const t = f * this._dot(e2, q);
        return t;
    },
    
    _cross: function(a, b) {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    },
    
    _dot: function(a, b) {
        return a.x * b.x + a.y * b.y + (a.z || 0) * (b.z || 0);
    },
    
    _normalize: function(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        if (len > 1e-10) {
            return { x: v.x / len, y: v.y / len, z: v.z / len };
        }
        return { x: 0, y: 0, z: 1 };
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
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('shape.sdf.compute', 'PRISM_SHAPE_DIAMETER_FUNCTION.computeSDF');
            PRISM_GATEWAY.register('shape.sdf.segment', 'PRISM_SHAPE_DIAMETER_FUNCTION.segmentBySDF');
            PRISM_GATEWAY.register('shape.sdf.volume', 'PRISM_SHAPE_DIAMETER_FUNCTION.estimateVolume');
        }
    }
}