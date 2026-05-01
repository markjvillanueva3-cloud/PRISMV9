const PRISM_SIGNED_DISTANCE_FIELD = {
    name: 'PRISM Signed Distance Field Engine',
    version: '1.0.0',
    source: 'Stanford CS 468, Level Set Methods',
    
    generateFromMesh: function(mesh, bounds, resolution) {
        if (!bounds) bounds = this._computeBounds(mesh.vertices);
        const padding = 0.1 * Math.max(bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y, bounds.max.z - bounds.min.z);
        bounds = {
            min: { x: bounds.min.x - padding, y: bounds.min.y - padding, z: bounds.min.z - padding },
            max: { x: bounds.max.x + padding, y: bounds.max.y + padding, z: bounds.max.z + padding }
        };
        const size = { x: bounds.max.x - bounds.min.x, y: bounds.max.y - bounds.min.y, z: bounds.max.z - bounds.min.z };
        const cellSize = Math.max(size.x, size.y, size.z) / resolution;
        const nx = Math.ceil(size.x / cellSize) + 1, ny = Math.ceil(size.y / cellSize) + 1, nz = Math.ceil(size.z / cellSize) + 1;
        const data = new Float32Array(nx * ny * nz);
        const triangles = mesh.faces.map(f => ({ v0: mesh.vertices[f[0]], v1: mesh.vertices[f[1]], v2: mesh.vertices[f[2]] }));
        
        for (let iz = 0; iz < nz; iz++) {
            for (let iy = 0; iy < ny; iy++) {
                for (let ix = 0; ix < nx; ix++) {
                    const point = { x: bounds.min.x + ix * cellSize, y: bounds.min.y + iy * cellSize, z: bounds.min.z + iz * cellSize };
                    const { distance, sign } = this._computeSignedDistance(point, triangles);
                    data[iz * ny * nx + iy * nx + ix] = distance * sign;
                }
            }
        }
        return { data, resolution: { x: nx, y: ny, z: nz }, bounds, cellSize };
    },
    
    sample: function(sdf, point) {
        const { data, resolution, bounds, cellSize } = sdf;
        const gx = (point.x - bounds.min.x) / cellSize, gy = (point.y - bounds.min.y) / cellSize, gz = (point.z - bounds.min.z) / cellSize;
        const ix = Math.max(0, Math.min(resolution.x - 2, Math.floor(gx)));
        const iy = Math.max(0, Math.min(resolution.y - 2, Math.floor(gy)));
        const iz = Math.max(0, Math.min(resolution.z - 2, Math.floor(gz)));
        const fx = gx - ix, fy = gy - iy, fz = gz - iz;
        const get = (i, j, k) => data[k * resolution.y * resolution.x + j * resolution.x + i];
        const c00 = get(ix, iy, iz) * (1-fx) + get(ix+1, iy, iz) * fx;
        const c01 = get(ix, iy, iz+1) * (1-fx) + get(ix+1, iy, iz+1) * fx;
        const c10 = get(ix, iy+1, iz) * (1-fx) + get(ix+1, iy+1, iz) * fx;
        const c11 = get(ix, iy+1, iz+1) * (1-fx) + get(ix+1, iy+1, iz+1) * fx;
        const c0 = c00 * (1-fy) + c10 * fy, c1 = c01 * (1-fy) + c11 * fy;
        return c0 * (1-fz) + c1 * fz;
    },
    
    gradient: function(sdf, point) {
        const h = sdf.cellSize * 0.5;
        const dx = this.sample(sdf, {x: point.x+h, y: point.y, z: point.z}) - this.sample(sdf, {x: point.x-h, y: point.y, z: point.z});
        const dy = this.sample(sdf, {x: point.x, y: point.y+h, z: point.z}) - this.sample(sdf, {x: point.x, y: point.y-h, z: point.z});
        const dz = this.sample(sdf, {x: point.x, y: point.y, z: point.z+h}) - this.sample(sdf, {x: point.x, y: point.y, z: point.z-h});
        const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
        return len < 1e-10 ? { x: 0, y: 0, z: 1 } : { x: dx/len, y: dy/len, z: dz/len };
    },
    
    sphereSDF: (center, radius) => (p) => Math.sqrt((p.x-center.x)**2 + (p.y-center.y)**2 + (p.z-center.z)**2) - radius,
    
    boxSDF: (center, half) => (p) => {
        const qx = Math.abs(p.x-center.x) - half.x, qy = Math.abs(p.y-center.y) - half.y, qz = Math.abs(p.z-center.z) - half.z;
        return Math.sqrt(Math.max(qx,0)**2 + Math.max(qy,0)**2 + Math.max(qz,0)**2) + Math.min(Math.max(qx, qy, qz), 0);
    },
    
    opUnion: (a, b) => (p) => Math.min(a(p), b(p)),
    opIntersection: (a, b) => (p) => Math.max(a(p), b(p)),
    opSubtraction: (a, b) => (p) => Math.max(a(p), -b(p)),
    opSmoothUnion: (a, b, k) => (p) => { const av = a(p), bv = b(p), h = Math.max(k - Math.abs(av-bv), 0) / k; return Math.min(av, bv) - h*h*k*0.25; },
    
    _computeBounds: function(vertices) {
        const min = { x: Infinity, y: Infinity, z: Infinity }, max = { x: -Infinity, y: -Infinity, z: -Infinity };
        for (const v of vertices) {
            min.x = Math.min(min.x, v.x); min.y = Math.min(min.y, v.y); min.z = Math.min(min.z, v.z);
            max.x = Math.max(max.x, v.x); max.y = Math.max(max.y, v.y); max.z = Math.max(max.z, v.z);
        }
        return { min, max };
    },
    
    _computeSignedDistance: function(point, triangles) {
        let minDist = Infinity, closestNormal = null, closestPoint = null;
        for (const tri of triangles) {
            const { distance, closest, normal } = this._pointToTriangleDistance(point, tri);
            if (distance < minDist) { minDist = distance; closestNormal = normal; closestPoint = closest; }
        }
        const toPoint = { x: point.x - closestPoint.x, y: point.y - closestPoint.y, z: point.z - closestPoint.z };
        const sign = this._dot(toPoint, closestNormal) >= 0 ? 1 : -1;
        return { distance: minDist, sign };
    },
    
    _pointToTriangleDistance: function(p, tri) {
        const { v0, v1, v2 } = tri;
        const e0 = this._sub(v1, v0), e1 = this._sub(v2, v0), v = this._sub(v0, p);
        const a = this._dot(e0, e0), b = this._dot(e0, e1), c = this._dot(e1, e1), d = this._dot(e0, v), e = this._dot(e1, v);
        const det = a * c - b * b;
        let s = b * e - c * d, t = b * d - a * e;
        
        if (s + t <= det) {
            if (s < 0) { if (t < 0) { if (d < 0) { t = 0; s = Math.min(Math.max(-d/a,0),1); } else { s = 0; t = Math.min(Math.max(-e/c,0),1); } } else { s = 0; t = Math.min(Math.max(-e/c,0),1); } }
            else if (t < 0) { t = 0; s = Math.min(Math.max(-d/a,0),1); }
            else { const invDet = 1/det; s *= invDet; t *= invDet; }
        } else {
            if (s < 0) { const tmp0 = b+d, tmp1 = c+e; if (tmp1 > tmp0) { const numer = tmp1-tmp0; s = Math.min(Math.max(numer/(a-2*b+c),0),1); t = 1-s; } else { s = 0; t = Math.min(Math.max(-e/c,0),1); } }
            else if (t < 0) { const tmp0 = b+e, tmp1 = a+d; if (tmp1 > tmp0) { t = Math.min(Math.max((tmp1-tmp0)/(a-2*b+c),0),1); s = 1-t; } else { t = 0; s = Math.min(Math.max(-d/a,0),1); } }
            else { const numer = (c+e)-(b+d); s = numer <= 0 ? 0 : Math.min(Math.max(numer/(a-2*b+c),0),1); t = 1-s; }
        }
        
        const closest = { x: v0.x + s*e0.x + t*e1.x, y: v0.y + s*e0.y + t*e1.y, z: v0.z + s*e0.z + t*e1.z };
        const normal = this._normalize(this._cross(e0, e1));
        const diff = this._sub(p, closest);
        return { distance: Math.sqrt(diff.x*diff.x + diff.y*diff.y + diff.z*diff.z), closest, normal };
    },
    
    _dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
    _cross: (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }),
    _sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
    _normalize: function(v) { const l = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z); return l > 1e-10 ? { x: v.x/l, y: v.y/l, z: v.z/l } : { x: 0, y: 0, z: 1 }; },
    
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('sdf.generate', 'PRISM_SIGNED_DISTANCE_FIELD.generateFromMesh');
            PRISM_GATEWAY.register('sdf.sample', 'PRISM_SIGNED_DISTANCE_FIELD.sample');
            PRISM_GATEWAY.register('sdf.gradient', 'PRISM_SIGNED_DISTANCE_FIELD.gradient');
            PRISM_GATEWAY.register('sdf.sphere', 'PRISM_SIGNED_DISTANCE_FIELD.sphereSDF');
            PRISM_GATEWAY.register('sdf.box', 'PRISM_SIGNED_DISTANCE_FIELD.boxSDF');
            PRISM_GATEWAY.register('sdf.union', 'PRISM_SIGNED_DISTANCE_FIELD.opUnion');
            PRISM_GATEWAY.register('sdf.intersection', 'PRISM_SIGNED_DISTANCE_FIELD.opIntersection');
            PRISM_GATEWAY.register('sdf.subtraction', 'PRISM_SIGNED_DISTANCE_FIELD.opSubtraction');
            PRISM_GATEWAY.register('sdf.smoothUnion', 'PRISM_SIGNED_DISTANCE_FIELD.opSmoothUnion');
        }
    }
}