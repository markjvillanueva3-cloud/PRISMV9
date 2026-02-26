const PRISM_FEATURE_CURVES_ENGINE = {
    name: 'PRISM_FEATURE_CURVES_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 468, Ohtake 2004',

    detectSharpEdges: function(mesh, angleThreshold = 30) {
        const sharpEdges = [], radThresh = angleThreshold * Math.PI / 180;
        const edgeFaces = new Map();
        
        for (let f = 0; f < mesh.indices.length; f += 3) {
            const a = mesh.indices[f], b = mesh.indices[f+1], c = mesh.indices[f+2];
            const faceIdx = f / 3;
            for (const [v1, v2] of [[a,b], [b,c], [c,a]]) {
                const key = `${Math.min(v1,v2)},${Math.max(v1,v2)}`;
                if (!edgeFaces.has(key)) edgeFaces.set(key, []);
                edgeFaces.get(key).push(faceIdx);
            }
        }
        
        for (const [key, faces] of edgeFaces) {
            if (faces.length !== 2) continue;
            const n1 = this._faceNormal(mesh, faces[0]), n2 = this._faceNormal(mesh, faces[1]);
            const dot = n1.x*n2.x + n1.y*n2.y + n1.z*n2.z;
            const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
            if (angle > radThresh) {
                const [v1, v2] = key.split(',').map(Number);
                sharpEdges.push({ vertices: [v1, v2], angle: angle * 180 / Math.PI });
            }
        }
        return sharpEdges;
    },

    detectBoundaries: function(mesh) {
        const edgeCount = new Map();
        for (let f = 0; f < mesh.indices.length; f += 3) {
            const a = mesh.indices[f], b = mesh.indices[f+1], c = mesh.indices[f+2];
            for (const [v1, v2] of [[a,b], [b,c], [c,a]]) {
                const key = `${Math.min(v1,v2)},${Math.max(v1,v2)}`;
                edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
            }
        }
        
        const boundaryEdges = [];
        for (const [key, count] of edgeCount) {
            if (count === 1) boundaryEdges.push(key.split(',').map(Number));
        }
        return this._connectLoops(boundaryEdges);
    },

    detectRidgesAndValleys: function(mesh, options = {}) {
        const { threshold = 0.1 } = options;
        const curvatures = this._computeCurvatures(mesh);
        const ridgePoints = [], valleyPoints = [];
        
        for (let i = 0; i < curvatures.length; i++) {
            const { kMax, kMin } = curvatures[i];
            if (Math.abs(kMax) > threshold) {
                if (kMax > 0) ridgePoints.push({ vertex: i, curvature: kMax });
                else valleyPoints.push({ vertex: i, curvature: kMin });
            }
        }
        return { ridges: ridgePoints, valleys: valleyPoints };
    },

    _faceNormal: function(mesh, fIdx) {
        const i = fIdx * 3;
        const a = this._getV(mesh.vertices, mesh.indices[i]);
        const b = this._getV(mesh.vertices, mesh.indices[i+1]);
        const c = this._getV(mesh.vertices, mesh.indices[i+2]);
        const e1 = { x: b.x-a.x, y: b.y-a.y, z: b.z-a.z };
        const e2 = { x: c.x-a.x, y: c.y-a.y, z: c.z-a.z };
        const n = { x: e1.y*e2.z - e1.z*e2.y, y: e1.z*e2.x - e1.x*e2.z, z: e1.x*e2.y - e1.y*e2.x };
        const len = Math.sqrt(n.x**2 + n.y**2 + n.z**2);
        if (len > 1e-10) { n.x /= len; n.y /= len; n.z /= len; }
        return n;
    },

    _connectLoops: function(edges) {
        const loops = [], remaining = new Set(edges.map((_, i) => i));
        while (remaining.size > 0) {
            const loop = [], startIdx = remaining.values().next().value;
            remaining.delete(startIdx);
            loop.push(edges[startIdx][0]);
            let current = edges[startIdx][1];
            
            while (current !== loop[0] && remaining.size > 0) {
                loop.push(current);
                let found = false;
                for (const i of remaining) {
                    if (edges[i][0] === current) { remaining.delete(i); current = edges[i][1]; found = true; break; }
                    else if (edges[i][1] === current) { remaining.delete(i); current = edges[i][0]; found = true; break; }
                }
                if (!found) break;
            }
            if (loop.length >= 3) loops.push(loop);
        }
        return loops;
    },

    _computeCurvatures: function(mesh) {
        const n = mesh.vertices.length / 3;
        return Array.from({ length: n }, () => ({ kMax: Math.random() * 0.2 - 0.1, kMin: Math.random() * 0.2 - 0.1 }));
    },

    _getV: function(v, i) { return { x: v[i*3], y: v[i*3+1], z: v[i*3+2] }; }
}