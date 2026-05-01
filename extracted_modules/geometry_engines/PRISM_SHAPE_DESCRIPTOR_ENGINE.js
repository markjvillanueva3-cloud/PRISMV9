const PRISM_SHAPE_DESCRIPTOR_ENGINE = {
    name: 'PRISM_SHAPE_DESCRIPTOR_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 468, Osada Shape Distributions',

    computeD2: function(mesh, numSamples = 10000) {
        const hist = new Array(64).fill(0);
        let maxD = 0;
        const dists = [];
        
        for (let i = 0; i < numSamples; i++) {
            const p1 = this._sampleRandom(mesh), p2 = this._sampleRandom(mesh);
            const d = this._dist(p1, p2);
            dists.push(d);
            maxD = Math.max(maxD, d);
        }
        
        for (const d of dists) {
            const bin = Math.min(63, Math.floor(64 * d / maxD));
            hist[bin]++;
        }
        
        const sum = hist.reduce((a, b) => a + b, 0);
        return hist.map(h => h / sum);
    },

    computeA3: function(mesh, numSamples = 10000) {
        const hist = new Array(64).fill(0);
        
        for (let i = 0; i < numSamples; i++) {
            const p1 = this._sampleRandom(mesh), p2 = this._sampleRandom(mesh), p3 = this._sampleRandom(mesh);
            const v1 = { x: p1.x-p2.x, y: p1.y-p2.y, z: p1.z-p2.z };
            const v2 = { x: p3.x-p2.x, y: p3.y-p2.y, z: p3.z-p2.z };
            const len1 = Math.sqrt(v1.x**2 + v1.y**2 + v1.z**2);
            const len2 = Math.sqrt(v2.x**2 + v2.y**2 + v2.z**2);
            
            if (len1 > 1e-10 && len2 > 1e-10) {
                const dot = (v1.x*v2.x + v1.y*v2.y + v1.z*v2.z) / (len1 * len2);
                const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
                hist[Math.min(63, Math.floor(64 * angle / Math.PI))]++;
            }
        }
        
        const sum = hist.reduce((a, b) => a + b, 0);
        return hist.map(h => h / sum);
    },

    compareHistograms: function(h1, h2) {
        let emd = 0, sum1 = 0, sum2 = 0;
        for (let i = 0; i < h1.length; i++) {
            sum1 += h1[i]; sum2 += h2[i];
            emd += Math.abs(sum1 - sum2);
        }
        return emd / h1.length;
    },

    _sampleRandom: function(mesh) {
        const areas = [], total = [];
        let totalArea = 0;
        
        for (let i = 0; i < mesh.indices.length; i += 3) {
            const v0 = this._getV(mesh.vertices, mesh.indices[i]);
            const v1 = this._getV(mesh.vertices, mesh.indices[i+1]);
            const v2 = this._getV(mesh.vertices, mesh.indices[i+2]);
            const area = this._triArea(v0, v1, v2);
            areas.push(area);
            totalArea += area;
        }
        
        let r = Math.random() * totalArea, triIdx = 0;
        for (let i = 0; i < areas.length; i++) {
            r -= areas[i];
            if (r <= 0) { triIdx = i; break; }
        }
        
        const v0 = this._getV(mesh.vertices, mesh.indices[triIdx*3]);
        const v1 = this._getV(mesh.vertices, mesh.indices[triIdx*3+1]);
        const v2 = this._getV(mesh.vertices, mesh.indices[triIdx*3+2]);
        
        let u = Math.random(), v = Math.random();
        if (u + v > 1) { u = 1 - u; v = 1 - v; }
        
        return {
            x: v0.x + u*(v1.x-v0.x) + v*(v2.x-v0.x),
            y: v0.y + u*(v1.y-v0.y) + v*(v2.y-v0.y),
            z: v0.z + u*(v1.z-v0.z) + v*(v2.z-v0.z)
        };
    },

    _triArea: function(v0, v1, v2) {
        const e1 = { x: v1.x-v0.x, y: v1.y-v0.y, z: v1.z-v0.z };
        const e2 = { x: v2.x-v0.x, y: v2.y-v0.y, z: v2.z-v0.z };
        const cross = { x: e1.y*e2.z - e1.z*e2.y, y: e1.z*e2.x - e1.x*e2.z, z: e1.x*e2.y - e1.y*e2.x };
        return 0.5 * Math.sqrt(cross.x**2 + cross.y**2 + cross.z**2);
    },

    _getV: function(v, i) { return { x: v[i*3], y: v[i*3+1], z: v[i*3+2] }; },
    _dist: function(a, b) { return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2); }
}