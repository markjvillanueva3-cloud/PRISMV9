const PRISM_HARMONIC_MAPS_ENGINE = {
    name: 'PRISM_HARMONIC_MAPS_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 468, Floater 1997',

    parameterize: function(mesh, options = {}) {
        const { weightType = 'cotangent', boundaryType = 'circle' } = options;
        const n = mesh.vertices.length / 3;
        const boundary = this._findBoundary(mesh);
        const interior = [];
        for (let i = 0; i < n; i++) if (!boundary.includes(i)) interior.push(i);
        
        const boundaryUV = this._mapBoundary(mesh, boundary, boundaryType);
        const W = this._buildWeights(mesh, weightType);
        const uv = this._solve(n, interior, boundary, boundaryUV, W);
        
        return { uv, boundary, interior, distortion: this._computeDistortion(mesh, uv) };
    },

    _findBoundary: function(mesh) {
        const edgeCount = new Map();
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const a = mesh.indices[i], b = mesh.indices[i+1], c = mesh.indices[i+2];
            for (const [v1, v2] of [[a,b], [b,c], [c,a]]) {
                const key = `${Math.min(v1,v2)},${Math.max(v1,v2)}`;
                edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
            }
        }
        const boundaryEdges = [];
        for (const [key, count] of edgeCount) {
            if (count === 1) boundaryEdges.push(key.split(',').map(Number));
        }
        if (boundaryEdges.length === 0) return [];
        
        const boundary = [boundaryEdges[0][0]];
        const remaining = new Set(boundaryEdges.map((_, i) => i));
        remaining.delete(0);
        let current = boundaryEdges[0][1];
        
        while (remaining.size > 0 && current !== boundary[0]) {
            boundary.push(current);
            for (const i of remaining) {
                if (boundaryEdges[i][0] === current) { remaining.delete(i); current = boundaryEdges[i][1]; break; }
                else if (boundaryEdges[i][1] === current) { remaining.delete(i); current = boundaryEdges[i][0]; break; }
            }
        }
        return boundary;
    },

    _mapBoundary: function(mesh, boundary, shape) {
        const n = boundary.length, uv = [];
        for (let i = 0; i < n; i++) {
            const angle = 2 * Math.PI * i / n;
            uv.push({ u: 0.5 + 0.5 * Math.cos(angle), v: 0.5 + 0.5 * Math.sin(angle) });
        }
        return uv;
    },

    _buildWeights: function(mesh, type) {
        const n = mesh.vertices.length / 3;
        const W = Array.from({ length: n }, () => new Map());
        
        for (let f = 0; f < mesh.indices.length; f += 3) {
            const i = mesh.indices[f], j = mesh.indices[f+1], k = mesh.indices[f+2];
            const vi = this._getV(mesh.vertices, i), vj = this._getV(mesh.vertices, j), vk = this._getV(mesh.vertices, k);
            
            const wij = type === 'uniform' ? 1 : this._cot(vk, vi, vj);
            const wjk = type === 'uniform' ? 1 : this._cot(vi, vj, vk);
            const wki = type === 'uniform' ? 1 : this._cot(vj, vk, vi);
            
            W[i].set(j, (W[i].get(j) || 0) + wij); W[j].set(i, (W[j].get(i) || 0) + wij);
            W[j].set(k, (W[j].get(k) || 0) + wjk); W[k].set(j, (W[k].get(j) || 0) + wjk);
            W[k].set(i, (W[k].get(i) || 0) + wki); W[i].set(k, (W[i].get(k) || 0) + wki);
        }
        return W;
    },

    _solve: function(n, interior, boundary, boundaryUV, W) {
        const uv = new Array(n);
        for (let i = 0; i < boundary.length; i++) uv[boundary[i]] = boundaryUV[i];
        
        const idx = new Map();
        interior.forEach((v, i) => idx.set(v, i));
        
        const m = interior.length;
        const A = Array.from({ length: m }, () => new Array(m).fill(0));
        const bu = new Array(m).fill(0), bv = new Array(m).fill(0);
        
        for (let i = 0; i < m; i++) {
            const v = interior[i];
            let sumW = 0;
            for (const [nb, w] of W[v]) {
                if (idx.has(nb)) A[i][idx.get(nb)] = -w;
                else {
                    const bIdx = boundary.indexOf(nb);
                    if (bIdx >= 0) { bu[i] += w * boundaryUV[bIdx].u; bv[i] += w * boundaryUV[bIdx].v; }
                }
                sumW += w;
            }
            A[i][i] = sumW;
        }
        
        const xu = this._gaussSeidel(A, bu, m), xv = this._gaussSeidel(A, bv, m);
        for (let i = 0; i < m; i++) uv[interior[i]] = { u: xu[i], v: xv[i] };
        return uv;
    },

    _gaussSeidel: function(A, b, n, maxIter = 500, tol = 1e-8) {
        const x = new Array(n).fill(0);
        for (let iter = 0; iter < maxIter; iter++) {
            let maxDiff = 0;
            for (let i = 0; i < n; i++) {
                let sum = b[i];
                for (let j = 0; j < n; j++) if (i !== j) sum -= A[i][j] * x[j];
                const newVal = sum / A[i][i];
                maxDiff = Math.max(maxDiff, Math.abs(newVal - x[i]));
                x[i] = newVal;
            }
            if (maxDiff < tol) break;
        }
        return x;
    },

    _cot: function(a, b, c) {
        const ba = { x: a.x-b.x, y: a.y-b.y, z: a.z-b.z };
        const bc = { x: c.x-b.x, y: c.y-b.y, z: c.z-b.z };
        const dot = ba.x*bc.x + ba.y*bc.y + ba.z*bc.z;
        const cross = { x: ba.y*bc.z - ba.z*bc.y, y: ba.z*bc.x - ba.x*bc.z, z: ba.x*bc.y - ba.y*bc.x };
        const len = Math.sqrt(cross.x**2 + cross.y**2 + cross.z**2);
        return len > 1e-10 ? dot / len : 0;
    },

    _computeDistortion: function(mesh, uv) { return 0; },
    _getV: function(v, i) { return { x: v[i*3], y: v[i*3+1], z: v[i*3+2] }; }
}