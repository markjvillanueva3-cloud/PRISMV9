const PRISM_GRAPHICS_KERNEL_PASS2 = {
    
    // ─────────────────────────────────────────────────────────────────────────
    // BVH (Bounding Volume Hierarchy) with SAH
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Build BVH with Surface Area Heuristic
     */
    buildBVH: function(triangles, maxLeafSize = 4) {
        if (triangles.length === 0) return null;
        
        // Precompute centroids and bounds
        const primitives = triangles.map((tri, idx) => ({
            index: idx,
            triangle: tri,
            centroid: this._triangleCentroid(tri),
            bounds: this._triangleBounds(tri)
        }));
        
        return this._buildBVHNode(primitives, 0, maxLeafSize);
    },
    
    _buildBVHNode: function(primitives, depth, maxLeafSize) {
        if (primitives.length === 0) return null;
        
        // Compute bounds
        const bounds = this._unionBounds(primitives.map(p => p.bounds));
        
        if (primitives.length <= maxLeafSize || depth > 32) {
            return {
                bounds,
                primitives: primitives.map(p => p.triangle),
                isLeaf: true
            };
        }
        
        // SAH split
        const split = this._sahSplit(primitives, bounds);
        
        if (!split) {
            return {
                bounds,
                primitives: primitives.map(p => p.triangle),
                isLeaf: true
            };
        }
        
        const left = this._buildBVHNode(split.left, depth + 1, maxLeafSize);
        const right = this._buildBVHNode(split.right, depth + 1, maxLeafSize);
        
        return {
            bounds,
            left,
            right,
            axis: split.axis,
            isLeaf: false
        };
    },
    
    _sahSplit: function(primitives, bounds) {
        const numBuckets = 12;
        let bestCost = primitives.length;
        let bestAxis = -1;
        let bestSplit = -1;
        
        for (let axis = 0; axis < 3; axis++) {
            const axisName = ['x', 'y', 'z'][axis];
            const extent = bounds.max[axisName] - bounds.min[axisName];
            
            if (extent < 1e-6) continue;
            
            // Initialize buckets
            const buckets = Array(numBuckets).fill(null).map(() => ({
                count: 0,
                bounds: null
            }));
            
            // Fill buckets
            for (const prim of primitives) {
                const offset = (prim.centroid[axisName] - bounds.min[axisName]) / extent;
                const b = Math.min(numBuckets - 1, Math.floor(offset * numBuckets));
                buckets[b].count++;
                buckets[b].bounds = this._unionBoundsTwo(buckets[b].bounds, prim.bounds);
            }
            
            // Compute costs
            for (let i = 0; i < numBuckets - 1; i++) {
                let leftCount = 0, rightCount = 0;
                let leftBounds = null, rightBounds = null;
                
                for (let j = 0; j <= i; j++) {
                    leftCount += buckets[j].count;
                    leftBounds = this._unionBoundsTwo(leftBounds, buckets[j].bounds);
                }
                
                for (let j = i + 1; j < numBuckets; j++) {
                    rightCount += buckets[j].count;
                    rightBounds = this._unionBoundsTwo(rightBounds, buckets[j].bounds);
                }
                
                if (leftCount === 0 || rightCount === 0) continue;
                
                const cost = 1 + (leftCount * this._surfaceArea(leftBounds) + 
                                  rightCount * this._surfaceArea(rightBounds)) / 
                                  this._surfaceArea(bounds);
                
                if (cost < bestCost) {
                    bestCost = cost;
                    bestAxis = axis;
                    bestSplit = i;
                }
            }
        }
        
        if (bestAxis === -1) return null;
        
        // Partition primitives
        const axisName = ['x', 'y', 'z'][bestAxis];
        const extent = bounds.max[axisName] - bounds.min[axisName];
        const splitPos = bounds.min[axisName] + (bestSplit + 1) / numBuckets * extent;
        
        const left = [], right = [];
        for (const prim of primitives) {
            if (prim.centroid[axisName] < splitPos) {
                left.push(prim);
            } else {
                right.push(prim);
            }
        }
        
        return { left, right, axis: bestAxis };
    },
    
    _triangleCentroid: function(tri) {
        return {
            x: (tri.v0.x + tri.v1.x + tri.v2.x) / 3,
            y: (tri.v0.y + tri.v1.y + tri.v2.y) / 3,
            z: (tri.v0.z + tri.v1.z + tri.v2.z) / 3
        };
    },
    
    _triangleBounds: function(tri) {
        return {
            min: {
                x: Math.min(tri.v0.x, tri.v1.x, tri.v2.x),
                y: Math.min(tri.v0.y, tri.v1.y, tri.v2.y),
                z: Math.min(tri.v0.z, tri.v1.z, tri.v2.z)
            },
            max: {
                x: Math.max(tri.v0.x, tri.v1.x, tri.v2.x),
                y: Math.max(tri.v0.y, tri.v1.y, tri.v2.y),
                z: Math.max(tri.v0.z, tri.v1.z, tri.v2.z)
            }
        };
    },
    
    _unionBounds: function(boundsList) {
        if (boundsList.length === 0) return null;
        return boundsList.reduce((a, b) => this._unionBoundsTwo(a, b));
    },
    
    _unionBoundsTwo: function(a, b) {
        if (!a) return b;
        if (!b) return a;
        return {
            min: {
                x: Math.min(a.min.x, b.min.x),
                y: Math.min(a.min.y, b.min.y),
                z: Math.min(a.min.z, b.min.z)
            },
            max: {
                x: Math.max(a.max.x, b.max.x),
                y: Math.max(a.max.y, b.max.y),
                z: Math.max(a.max.z, b.max.z)
            }
        };
    },
    
    _surfaceArea: function(bounds) {
        if (!bounds) return 0;
        const d = {
            x: bounds.max.x - bounds.min.x,
            y: bounds.max.y - bounds.min.y,
            z: bounds.max.z - bounds.min.z
        };
        return 2 * (d.x * d.y + d.y * d.z + d.z * d.x);
    },
    
    /**
     * Traverse BVH for ray intersection
     */
    traceBVH: function(bvh, origin, direction) {
        if (!bvh) return null;
        
        const invDir = {
            x: 1 / direction.x,
            y: 1 / direction.y,
            z: 1 / direction.z
        };
        
        return this._traceBVHRecursive(bvh, origin, invDir, Infinity);
    },
    
    _traceBVHRecursive: function(node, origin, invDir, maxT) {
        if (!this._rayBoxIntersect(origin, invDir, node.bounds, maxT)) {
            return null;
        }
        
        if (node.isLeaf) {
            let closest = null;
            for (const tri of node.primitives) {
                const hit = this.rayTriangleIntersect(origin, 
                    { x: 1/invDir.x, y: 1/invDir.y, z: 1/invDir.z }, 
                    tri.v0, tri.v1, tri.v2);
                if (hit && hit.t < maxT && (!closest || hit.t < closest.t)) {
                    closest = hit;
                    maxT = hit.t;
                }
            }
            return closest;
        }
        
        const leftHit = this._traceBVHRecursive(node.left, origin, invDir, maxT);
        if (leftHit) maxT = leftHit.t;
        
        const rightHit = this._traceBVHRecursive(node.right, origin, invDir, maxT);
        
        if (!leftHit) return rightHit;
        if (!rightHit) return leftHit;
        return leftHit.t < rightHit.t ? leftHit : rightHit;
    },
    
    _rayBoxIntersect: function(origin, invDir, bounds, maxT) {
        let tmin = (bounds.min.x - origin.x) * invDir.x;
        let tmax = (bounds.max.x - origin.x) * invDir.x;
        if (tmin > tmax) [tmin, tmax] = [tmax, tmin];
        
        let tymin = (bounds.min.y - origin.y) * invDir.y;
        let tymax = (bounds.max.y - origin.y) * invDir.y;
        if (tymin > tymax) [tymin, tymax] = [tymax, tymin];
        
        if (tmin > tymax || tymin > tmax) return false;
        
        if (tymin > tmin) tmin = tymin;
        if (tymax < tmax) tmax = tymax;
        
        let tzmin = (bounds.min.z - origin.z) * invDir.z;
        let tzmax = (bounds.max.z - origin.z) * invDir.z;
        if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];
        
        if (tmin > tzmax || tzmin > tmax) return false;
        
        if (tzmin > tmin) tmin = tzmin;
        if (tzmax < tmax) tmax = tzmax;
        
        return tmin < maxT && tmax > 0;
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // RAY INTERSECTION (Möller-Trumbore)
    // ─────────────────────────────────────────────────────────────────────────
    
    rayTriangleIntersect: function(origin, direction, v0, v1, v2) {
        const EPSILON = 1e-8;
        
        const edge1 = this._sub(v1, v0);
        const edge2 = this._sub(v2, v0);
        const h = this._cross(direction, edge2);
        const a = this._dot(edge1, h);
        
        if (Math.abs(a) < EPSILON) return null;
        
        const f = 1.0 / a;
        const s = this._sub(origin, v0);
        const u = f * this._dot(s, h);
        
        if (u < 0.0 || u > 1.0) return null;
        
        const q = this._cross(s, edge1);
        const v = f * this._dot(direction, q);
        
        if (v < 0.0 || u + v > 1.0) return null;
        
        const t = f * this._dot(edge2, q);
        
        if (t > EPSILON) {
            return {
                t,
                point: this._add(origin, this._scale(direction, t)),
                normal: this._normalize(this._cross(edge1, edge2)),
                u, v,
                w: 1 - u - v
            };
        }
        
        return null;
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // PBR SHADING (GGX Microfacet)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * GGX/Trowbridge-Reitz normal distribution
     * D = α² / (π * ((n·h)²(α²-1) + 1)²)
     */
    ggxDistribution: function(NdotH, roughness) {
        const a = roughness * roughness;
        const a2 = a * a;
        const NdotH2 = NdotH * NdotH;
        const denom = NdotH2 * (a2 - 1) + 1;
        return a2 / (Math.PI * denom * denom);
    },
    
    /**
     * Smith geometry function (GGX)
     * G = G1(l) * G1(v)
     */
    smithGeometry: function(NdotL, NdotV, roughness) {
        const r = roughness + 1;
        const k = (r * r) / 8;
        
        const G1L = NdotL / (NdotL * (1 - k) + k);
        const G1V = NdotV / (NdotV * (1 - k) + k);
        
        return G1L * G1V;
    },
    
    /**
     * Schlick Fresnel approximation
     * F = F0 + (1 - F0)(1 - cosθ)^5
     */
    fresnelSchlick: function(cosTheta, F0) {
        const t = Math.pow(1 - cosTheta, 5);
        return {
            x: F0.x + (1 - F0.x) * t,
            y: F0.y + (1 - F0.y) * t,
            z: F0.z + (1 - F0.z) * t
        };
    },
    
    /**
     * Cook-Torrance specular BRDF
     */
    cookTorranceBRDF: function(params) {
        const { N, V, L, roughness, F0 } = params;
        
        const H = this._normalize(this._add(V, L));
        
        const NdotV = Math.max(0.001, this._dot(N, V));
        const NdotL = Math.max(0.001, this._dot(N, L));
        const NdotH = Math.max(0.001, this._dot(N, H));
        const VdotH = Math.max(0.001, this._dot(V, H));
        
        const D = this.ggxDistribution(NdotH, roughness);
        const G = this.smithGeometry(NdotL, NdotV, roughness);
        const F = this.fresnelSchlick(VdotH, F0);
        
        const specular = {
            x: D * G * F.x / (4 * NdotV * NdotL),
            y: D * G * F.y / (4 * NdotV * NdotL),
            z: D * G * F.z / (4 * NdotV * NdotL)
        };
        
        return specular;
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // PATH TRACING UTILITIES
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Cosine-weighted hemisphere sampling
     */
    cosineSampleHemisphere: function(N) {
        const u1 = Math.random();
        const u2 = Math.random();
        
        const r = Math.sqrt(u1);
        const theta = 2 * Math.PI * u2;
        
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        const z = Math.sqrt(1 - u1);
        
        // Create local coordinate frame
        const up = Math.abs(N.y) < 0.999 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
        const tangent = this._normalize(this._cross(up, N));
        const bitangent = this._cross(N, tangent);
        
        // Transform to world space
        return {
            direction: this._normalize({
                x: tangent.x * x + bitangent.x * y + N.x * z,
                y: tangent.y * x + bitangent.y * y + N.y * z,
                z: tangent.z * x + bitangent.z * y + N.z * z
            }),
            pdf: z / Math.PI
        };
    },
    
    /**
     * GGX importance sampling
     */
    ggxSampleHalfVector: function(N, roughness) {
        const u1 = Math.random();
        const u2 = Math.random();
        
        const a = roughness * roughness;
        const theta = Math.atan(a * Math.sqrt(u1) / Math.sqrt(1 - u1));
        const phi = 2 * Math.PI * u2;
        
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        
        const x = sinTheta * Math.cos(phi);
        const y = sinTheta * Math.sin(phi);
        const z = cosTheta;
        
        const up = Math.abs(N.y) < 0.999 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
        const tangent = this._normalize(this._cross(up, N));
        const bitangent = this._cross(N, tangent);
        
        return this._normalize({
            x: tangent.x * x + bitangent.x * y + N.x * z,
            y: tangent.y * x + bitangent.y * y + N.y * z,
            z: tangent.z * x + bitangent.z * y + N.z * z
        });
    },
    
    /**
     * Russian Roulette for path termination
     */
    russianRoulette: function(throughput, minBounces, currentBounce) {
        if (currentBounce < minBounces) {
            return { continue: true, probability: 1 };
        }
        
        const maxComponent = Math.max(throughput.x, throughput.y, throughput.z);
        const probability = Math.min(0.95, maxComponent);
        
        return {
            continue: Math.random() < probability,
            probability
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // QUATERNION MATH
    // ─────────────────────────────────────────────────────────────────────────
    
    quaternionFromAxisAngle: function(axis, angle) {
        const halfAngle = angle / 2;
        const s = Math.sin(halfAngle);
        return {
            w: Math.cos(halfAngle),
            x: axis.x * s,
            y: axis.y * s,
            z: axis.z * s
        };
    },
    
    quaternionMultiply: function(q1, q2) {
        return {
            w: q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z,
            x: q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
            y: q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
            z: q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w
        };
    },
    
    quaternionToMatrix: function(q) {
        const { w, x, y, z } = q;
        return [
            [1 - 2*y*y - 2*z*z, 2*x*y - 2*w*z, 2*x*z + 2*w*y, 0],
            [2*x*y + 2*w*z, 1 - 2*x*x - 2*z*z, 2*y*z - 2*w*x, 0],
            [2*x*z - 2*w*y, 2*y*z + 2*w*x, 1 - 2*x*x - 2*y*y, 0],
            [0, 0, 0, 1]
        ];
    },
    
    slerp: function(q1, q2, t) {
        let dot = q1.w*q2.w + q1.x*q2.x + q1.y*q2.y + q1.z*q2.z;
        
        if (dot < 0) {
            q2 = { w: -q2.w, x: -q2.x, y: -q2.y, z: -q2.z };
            dot = -dot;
        }
        
        if (dot > 0.9995) {
            const result = {
                w: q1.w + t * (q2.w - q1.w),
                x: q1.x + t * (q2.x - q1.x),
                y: q1.y + t * (q2.y - q1.y),
                z: q1.z + t * (q2.z - q1.z)
            };
            const len = Math.sqrt(result.w*result.w + result.x*result.x + 
                                  result.y*result.y + result.z*result.z);
            return { w: result.w/len, x: result.x/len, y: result.y/len, z: result.z/len };
        }
        
        const theta0 = Math.acos(dot);
        const theta = theta0 * t;
        const sinTheta = Math.sin(theta);
        const sinTheta0 = Math.sin(theta0);
        
        const s0 = Math.cos(theta) - dot * sinTheta / sinTheta0;
        const s1 = sinTheta / sinTheta0;
        
        return {
            w: s0 * q1.w + s1 * q2.w,
            x: s0 * q1.x + s1 * q2.x,
            y: s0 * q1.y + s1 * q2.y,
            z: s0 * q1.z + s1 * q2.z
        };
    },
    
    // Vector utilities
    _dot: function(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; },
    _cross: function(a, b) {
        return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
    },
    _normalize: function(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        return len > 0 ? { x: v.x / len, y: v.y / len, z: v.z / len } : v;
    },
    _sub: function(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; },
    _add: function(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; },
    _scale: function(v, s) { return { x: v.x * s, y: v.y * s, z: v.z * s }; }
}