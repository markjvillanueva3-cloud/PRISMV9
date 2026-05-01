const PRISM_GRAPHICS_MIT = {
    
    // ─────────────────────────────────────────────────────────────────────────
    // RAY TRACING (from 6.837)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Ray-Triangle Intersection (Möller-Trumbore)
     * Source: MIT 6.837 Computer Graphics
     */
    rayTriangleIntersect: function(rayOrigin, rayDir, v0, v1, v2) {
        const EPSILON = 1e-8;
        
        const edge1 = this._vecSub(v1, v0);
        const edge2 = this._vecSub(v2, v0);
        const h = this._vecCross(rayDir, edge2);
        const a = this._vecDot(edge1, h);
        
        if (a > -EPSILON && a < EPSILON) return null;
        
        const f = 1.0 / a;
        const s = this._vecSub(rayOrigin, v0);
        const u = f * this._vecDot(s, h);
        
        if (u < 0.0 || u > 1.0) return null;
        
        const q = this._vecCross(s, edge1);
        const v = f * this._vecDot(rayDir, q);
        
        if (v < 0.0 || u + v > 1.0) return null;
        
        const t = f * this._vecDot(edge2, q);
        
        if (t > EPSILON) {
            return {
                t: t,
                point: this._vecAdd(rayOrigin, this._vecScale(rayDir, t)),
                normal: this._vecNormalize(this._vecCross(edge1, edge2)),
                u: u,
                v: v
            };
        }
        
        return null;
    },
    
    /**
     * Ray-Sphere Intersection
     * Source: MIT 6.837
     */
    raySphereIntersect: function(rayOrigin, rayDir, sphereCenter, radius) {
        const oc = this._vecSub(rayOrigin, sphereCenter);
        const a = this._vecDot(rayDir, rayDir);
        const b = 2.0 * this._vecDot(oc, rayDir);
        const c = this._vecDot(oc, oc) - radius * radius;
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant < 0) return null;
        
        const t = (-b - Math.sqrt(discriminant)) / (2 * a);
        if (t < 0) return null;
        
        const point = this._vecAdd(rayOrigin, this._vecScale(rayDir, t));
        const normal = this._vecNormalize(this._vecSub(point, sphereCenter));
        
        return { t, point, normal };
    },
    
    /**
     * Ray-AABB Intersection (slab method)
     * Source: MIT 6.837
     */
    rayAABBIntersect: function(rayOrigin, rayDir, boxMin, boxMax) {
        let tmin = -Infinity, tmax = Infinity;
        
        for (let i = 0; i < 3; i++) {
            const axis = ['x', 'y', 'z'][i];
            if (Math.abs(rayDir[axis]) < 1e-8) {
                if (rayOrigin[axis] < boxMin[axis] || rayOrigin[axis] > boxMax[axis]) {
                    return null;
                }
            } else {
                let t1 = (boxMin[axis] - rayOrigin[axis]) / rayDir[axis];
                let t2 = (boxMax[axis] - rayOrigin[axis]) / rayDir[axis];
                if (t1 > t2) [t1, t2] = [t2, t1];
                tmin = Math.max(tmin, t1);
                tmax = Math.min(tmax, t2);
                if (tmin > tmax) return null;
            }
        }
        
        return tmin >= 0 ? tmin : tmax >= 0 ? tmax : null;
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // SHADING MODELS (from 6.837)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Blinn-Phong Shading
     * Source: MIT 6.837
     */
    blinnPhongShade: function(params) {
        const { 
            normal, viewDir, lightDir, lightColor,
            ambient, diffuseColor, specularColor, shininess
        } = params;
        
        const N = this._vecNormalize(normal);
        const V = this._vecNormalize(viewDir);
        const L = this._vecNormalize(lightDir);
        const H = this._vecNormalize(this._vecAdd(V, L));
        
        // Diffuse
        const NdotL = Math.max(0, this._vecDot(N, L));
        const diffuse = this._vecScale(diffuseColor, NdotL);
        
        // Specular
        const NdotH = Math.max(0, this._vecDot(N, H));
        const specular = this._vecScale(specularColor, Math.pow(NdotH, shininess));
        
        // Combine
        return this._vecAdd(
            ambient,
            this._vecMul(lightColor, this._vecAdd(diffuse, specular))
        );
    },
    
    /**
     * Cook-Torrance BRDF (Physically Based)
     * Source: MIT 6.837
     */
    cookTorranceBRDF: function(params) {
        const { normal, viewDir, lightDir, roughness, metallic, baseColor, F0 } = params;
        
        const N = this._vecNormalize(normal);
        const V = this._vecNormalize(viewDir);
        const L = this._vecNormalize(lightDir);
        const H = this._vecNormalize(this._vecAdd(V, L));
        
        const NdotV = Math.max(0.001, this._vecDot(N, V));
        const NdotL = Math.max(0.001, this._vecDot(N, L));
        const NdotH = Math.max(0.001, this._vecDot(N, H));
        const VdotH = Math.max(0.001, this._vecDot(V, H));
        
        // GGX Distribution
        const alpha = roughness * roughness;
        const alpha2 = alpha * alpha;
        const denom = NdotH * NdotH * (alpha2 - 1) + 1;
        const D = alpha2 / (Math.PI * denom * denom);
        
        // Schlick-GGX Geometry
        const k = (roughness + 1) * (roughness + 1) / 8;
        const G1V = NdotV / (NdotV * (1 - k) + k);
        const G1L = NdotL / (NdotL * (1 - k) + k);
        const G = G1V * G1L;
        
        // Fresnel-Schlick
        const F = this._fresnelSchlick(VdotH, F0);
        
        // Specular BRDF
        const specular = this._vecScale(F, D * G / (4 * NdotV * NdotL));
        
        // Diffuse
        const kD = this._vecScale(this._vecSub({x:1,y:1,z:1}, F), 1 - metallic);
        const diffuse = this._vecMul(kD, this._vecScale(baseColor, 1 / Math.PI));
        
        return this._vecScale(this._vecAdd(diffuse, specular), NdotL);
    },
    
    _fresnelSchlick: function(cosTheta, F0) {
        const t = Math.pow(1 - cosTheta, 5);
        return {
            x: F0.x + (1 - F0.x) * t,
            y: F0.y + (1 - F0.y) * t,
            z: F0.z + (1 - F0.z) * t
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // TRANSFORMATION MATRICES (from 6.837, 18.06)
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Create 4x4 transformation matrices
     */
    createTranslationMatrix: function(tx, ty, tz) {
        return [
            [1, 0, 0, tx],
            [0, 1, 0, ty],
            [0, 0, 1, tz],
            [0, 0, 0, 1]
        ];
    },
    
    createRotationMatrixX: function(angle) {
        const c = Math.cos(angle), s = Math.sin(angle);
        return [
            [1, 0, 0, 0],
            [0, c, -s, 0],
            [0, s, c, 0],
            [0, 0, 0, 1]
        ];
    },
    
    createRotationMatrixY: function(angle) {
        const c = Math.cos(angle), s = Math.sin(angle);
        return [
            [c, 0, s, 0],
            [0, 1, 0, 0],
            [-s, 0, c, 0],
            [0, 0, 0, 1]
        ];
    },
    
    createRotationMatrixZ: function(angle) {
        const c = Math.cos(angle), s = Math.sin(angle);
        return [
            [c, -s, 0, 0],
            [s, c, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ];
    },
    
    createPerspectiveMatrix: function(fov, aspect, near, far) {
        const f = 1 / Math.tan(fov / 2);
        const nf = 1 / (near - far);
        return [
            [f / aspect, 0, 0, 0],
            [0, f, 0, 0],
            [0, 0, (far + near) * nf, 2 * far * near * nf],
            [0, 0, -1, 0]
        ];
    },
    
    createLookAtMatrix: function(eye, target, up) {
        const zAxis = this._vecNormalize(this._vecSub(eye, target));
        const xAxis = this._vecNormalize(this._vecCross(up, zAxis));
        const yAxis = this._vecCross(zAxis, xAxis);
        
        return [
            [xAxis.x, xAxis.y, xAxis.z, -this._vecDot(xAxis, eye)],
            [yAxis.x, yAxis.y, yAxis.z, -this._vecDot(yAxis, eye)],
            [zAxis.x, zAxis.y, zAxis.z, -this._vecDot(zAxis, eye)],
            [0, 0, 0, 1]
        ];
    },
    
    // Vector utilities
    _vecAdd: function(a, b) { return {x: a.x+b.x, y: a.y+b.y, z: a.z+b.z}; },
    _vecSub: function(a, b) { return {x: a.x-b.x, y: a.y-b.y, z: a.z-b.z}; },
    _vecScale: function(v, s) { return {x: v.x*s, y: v.y*s, z: v.z*s}; },
    _vecMul: function(a, b) { return {x: a.x*b.x, y: a.y*b.y, z: a.z*b.z}; },
    _vecDot: function(a, b) { return a.x*b.x + a.y*b.y + a.z*b.z; },
    _vecCross: function(a, b) { 
        return {
            x: a.y*b.z - a.z*b.y,
            y: a.z*b.x - a.x*b.z,
            z: a.x*b.y - a.y*b.x
        };
    },
    _vecLength: function(v) { return Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z); },
    _vecNormalize: function(v) {
        const len = this._vecLength(v);
        return len > 0 ? this._vecScale(v, 1/len) : v;
    }
}