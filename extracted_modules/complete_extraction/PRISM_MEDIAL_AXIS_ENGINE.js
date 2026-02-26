const PRISM_MEDIAL_AXIS_ENGINE = {
    name: 'PRISM_MEDIAL_AXIS_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 468, Blum MAT',

    computeDistanceField: function(mesh, resolution = 50) {
        const bounds = this._computeBounds(mesh.vertices);
        const pad = 0.1, step = {
            x: (bounds.max.x - bounds.min.x + 2*pad) / resolution,
            y: (bounds.max.y - bounds.min.y + 2*pad) / resolution,
            z: (bounds.max.z - bounds.min.z + 2*pad) / resolution
        };
        
        const medialPoints = [];
        for (let i = 1; i < resolution; i++) {
            for (let j = 1; j < resolution; j++) {
                for (let k = 1; k < resolution; k++) {
                    const p = {
                        x: bounds.min.x - pad + i * step.x,
                        y: bounds.min.y - pad + j * step.y,
                        z: bounds.min.z - pad + k * step.z
                    };
                    const d = this._distanceToMesh(p, mesh);
                    if (d > 0) medialPoints.push({ ...p, radius: d });
                }
            }
        }
        return { points: medialPoints.slice(0, 1000), resolution, bounds };
    },

    computeCurveSkeleton: function(mesh, options = {}) {
        const { iterations = 10, weight = 0.5 } = options;
        const n = mesh.vertices.length / 3;
        let verts = [...mesh.vertices];
        
        for (let iter = 0; iter < iterations; iter++) {
            const newVerts = new Float64Array(verts.length);
            for (let i = 0; i < n; i++) {
                const neighbors = this._getNeighbors(mesh, i);
                if (neighbors.length === 0) {
                    newVerts[i*3] = verts[i*3]; newVerts[i*3+1] = verts[i*3+1]; newVerts[i*3+2] = verts[i*3+2];
                    continue;
                }
                let cx = 0, cy = 0, cz = 0;
                for (const j of neighbors) { cx += verts[j*3]; cy += verts[j*3+1]; cz += verts[j*3+2]; }
                cx /= neighbors.length; cy /= neighbors.length; cz /= neighbors.length;
                newVerts[i*3] = (1-weight)*verts[i*3] + weight*cx;
                newVerts[i*3+1] = (1-weight)*verts[i*3+1] + weight*cy;
                newVerts[i*3+2] = (1-weight)*verts[i*3+2] + weight*cz;
            }
            verts = newVerts;
        }
        return { vertices: Array.from(verts) };
    },

    _computeBounds: function(v) {
        let min = {x:Infinity, y:Infinity, z:Infinity}, max = {x:-Infinity, y:-Infinity, z:-Infinity};
        for (let i = 0; i < v.length; i += 3) {
            min.x = Math.min(min.x, v[i]); min.y = Math.min(min.y, v[i+1]); min.z = Math.min(min.z, v[i+2]);
            max.x = Math.max(max.x, v[i]); max.y = Math.max(max.y, v[i+1]); max.z = Math.max(max.z, v[i+2]);
        }
        return { min, max };
    },

    _distanceToMesh: function(p, mesh) {
        let minD = Infinity;
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const v0 = this._getV(mesh.vertices, mesh.indices[i]);
            const v1 = this._getV(mesh.vertices, mesh.indices[i+1]);
            const v2 = this._getV(mesh.vertices, mesh.indices[i+2]);
            minD = Math.min(minD, this._pointTriDist(p, v0, v1, v2));
        }
        return minD;
    },

    _pointTriDist: function(p, v0, v1, v2) {
        const e1 = {x:v1.x-v0.x, y:v1.y-v0.y, z:v1.z-v0.z};
        const e2 = {x:v2.x-v0.x, y:v2.y-v0.y, z:v2.z-v0.z};
        const n = {x: e1.y*e2.z - e1.z*e2.y, y: e1.z*e2.x - e1.x*e2.z, z: e1.x*e2.y - e1.y*e2.x};
        const len = Math.sqrt(n.x*n.x + n.y*n.y + n.z*n.z);
        if (len < 1e-10) return Infinity;
        return Math.abs((p.x-v0.x)*n.x/len + (p.y-v0.y)*n.y/len + (p.z-v0.z)*n.z/len);
    },

    _getNeighbors: function(mesh, idx) {
        const nb = new Set();
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const a = mesh.indices[i], b = mesh.indices[i+1], c = mesh.indices[i+2];
            if (a === idx) { nb.add(b); nb.add(c); }
            if (b === idx) { nb.add(a); nb.add(c); }
            if (c === idx) { nb.add(a); nb.add(b); }
        }
        return Array.from(nb);
    },

    _getV: function(v, i) { return {x: v[i*3], y: v[i*3+1], z: v[i*3+2]}; }
}