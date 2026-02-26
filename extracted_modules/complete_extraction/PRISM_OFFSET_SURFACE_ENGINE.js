const PRISM_OFFSET_SURFACE_ENGINE = {
    name: 'PRISM_OFFSET_SURFACE_ENGINE',
    version: '1.0.0',
    source: 'MIT 2.158J, Maekawa 1999',

    offsetMesh: function(mesh, distance, options = {}) {
        const { smoothNormals = true } = options;
        const n = mesh.vertices.length / 3;
        const normals = smoothNormals ? this._smoothNormals(mesh) : this._faceNormals(mesh);
        const newVerts = new Float64Array(n * 3);
        
        for (let i = 0; i < n; i++) {
            newVerts[i*3] = mesh.vertices[i*3] + distance * normals[i].x;
            newVerts[i*3+1] = mesh.vertices[i*3+1] + distance * normals[i].y;
            newVerts[i*3+2] = mesh.vertices[i*3+2] + distance * normals[i].z;
        }
        return { vertices: Array.from(newVerts), indices: [...mesh.indices] };
    },

    createShell: function(mesh, thickness, options = {}) {
        const { capOpenEdges = true } = options;
        const outer = this.offsetMesh(mesh, thickness / 2, options);
        const inner = this.offsetMesh(mesh, -thickness / 2, options);
        
        // Flip inner normals
        const flippedInner = { vertices: inner.vertices, indices: [] };
        for (let i = 0; i < inner.indices.length; i += 3) {
            flippedInner.indices.push(inner.indices[i], inner.indices[i+2], inner.indices[i+1]);
        }
        
        const outerVertCount = outer.vertices.length / 3;
        const combined = {
            vertices: [...outer.vertices, ...flippedInner.vertices],
            indices: [...outer.indices, ...flippedInner.indices.map(idx => idx + outerVertCount)]
        };
        
        if (capOpenEdges) {
            const caps = this._createCaps(mesh, outerVertCount);
            combined.indices.push(...caps);
        }
        return combined;
    },

    _smoothNormals: function(mesh) {
        const n = mesh.vertices.length / 3;
        const normals = Array.from({ length: n }, () => ({ x: 0, y: 0, z: 0 }));
        
        for (let f = 0; f < mesh.indices.length; f += 3) {
            const a = mesh.indices[f], b = mesh.indices[f+1], c = mesh.indices[f+2];
            const va = this._getV(mesh.vertices, a), vb = this._getV(mesh.vertices, b), vc = this._getV(mesh.vertices, c);
            const e1 = { x: vb.x-va.x, y: vb.y-va.y, z: vb.z-va.z };
            const e2 = { x: vc.x-va.x, y: vc.y-va.y, z: vc.z-va.z };
            const fn = { x: e1.y*e2.z - e1.z*e2.y, y: e1.z*e2.x - e1.x*e2.z, z: e1.x*e2.y - e1.y*e2.x };
            
            normals[a].x += fn.x; normals[a].y += fn.y; normals[a].z += fn.z;
            normals[b].x += fn.x; normals[b].y += fn.y; normals[b].z += fn.z;
            normals[c].x += fn.x; normals[c].y += fn.y; normals[c].z += fn.z;
        }
        
        for (let i = 0; i < n; i++) {
            const len = Math.sqrt(normals[i].x**2 + normals[i].y**2 + normals[i].z**2);
            if (len > 1e-10) { normals[i].x /= len; normals[i].y /= len; normals[i].z /= len; }
        }
        return normals;
    },

    _faceNormals: function(mesh) {
        const n = mesh.vertices.length / 3;
        const normals = Array.from({ length: n }, () => ({ x: 0, y: 0, z: 0 }));
        const counts = new Array(n).fill(0);
        
        for (let f = 0; f < mesh.indices.length; f += 3) {
            const a = mesh.indices[f], b = mesh.indices[f+1], c = mesh.indices[f+2];
            const va = this._getV(mesh.vertices, a), vb = this._getV(mesh.vertices, b), vc = this._getV(mesh.vertices, c);
            const e1 = { x: vb.x-va.x, y: vb.y-va.y, z: vb.z-va.z };
            const e2 = { x: vc.x-va.x, y: vc.y-va.y, z: vc.z-va.z };
            const fn = { x: e1.y*e2.z - e1.z*e2.y, y: e1.z*e2.x - e1.x*e2.z, z: e1.x*e2.y - e1.y*e2.x };
            const len = Math.sqrt(fn.x**2 + fn.y**2 + fn.z**2);
            if (len > 1e-10) { fn.x /= len; fn.y /= len; fn.z /= len; }
            
            for (const v of [a, b, c]) {
                normals[v].x += fn.x; normals[v].y += fn.y; normals[v].z += fn.z;
                counts[v]++;
            }
        }
        
        for (let i = 0; i < n; i++) {
            if (counts[i] > 0) { normals[i].x /= counts[i]; normals[i].y /= counts[i]; normals[i].z /= counts[i]; }
        }
        return normals;
    },

    _createCaps: function(mesh, outerVertOffset) {
        const caps = [], edgeCount = new Map();
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const a = mesh.indices[i], b = mesh.indices[i+1], c = mesh.indices[i+2];
            for (const [v1, v2] of [[a,b], [b,c], [c,a]]) {
                const key = `${Math.min(v1,v2)},${Math.max(v1,v2)}`;
                edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
            }
        }
        
        for (const [key, count] of edgeCount) {
            if (count === 1) {
                const [v1, v2] = key.split(',').map(Number);
                caps.push(v1, v2, v2 + outerVertOffset);
                caps.push(v1, v2 + outerVertOffset, v1 + outerVertOffset);
            }
        }
        return caps;
    },

    _getV: function(v, i) { return { x: v[i*3], y: v[i*3+1], z: v[i*3+2] }; }
}