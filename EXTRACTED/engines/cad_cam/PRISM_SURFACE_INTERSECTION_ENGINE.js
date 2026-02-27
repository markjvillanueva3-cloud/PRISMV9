/**
 * PRISM_SURFACE_INTERSECTION_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * References: 9
 * Lines: 119
 * Session: R2.3.1 Wave 3 Engine Gap Extraction
 */

const PRISM_SURFACE_INTERSECTION_ENGINE = {
    name: 'PRISM_SURFACE_INTERSECTION_ENGINE',
    version: '1.0.0',
    source: 'MIT 2.158J, Patrikalakis',

    intersect: function(s1, s2, options = {}) {
        const { tolerance = 1e-6, stepSize = 0.01, maxPoints = 500 } = options;
        const starts = this._findStarts(s1, s2, tolerance);
        if (starts.length === 0) return [];
        
        const curves = [], visited = new Set();
        for (const start of starts) {
            const key = `${start.u1.toFixed(4)},${start.v1.toFixed(4)}`;
            if (visited.has(key)) continue;
            const curve = this._trace(s1, s2, start, stepSize, maxPoints, visited);
            if (curve.length > 1) curves.push(curve);
        }
        return curves;
    },

    _findStarts: function(s1, s2, tol) {
        const starts = [], samples = 10;
        for (let i = 0; i <= samples; i++) {
            for (let j = 0; j <= samples; j++) {
                const u1 = i/samples, v1 = j/samples, p1 = this._eval(s1, u1, v1);
                for (let k = 0; k <= samples; k++) {
                    for (let l = 0; l <= samples; l++) {
                        const u2 = k/samples, v2 = l/samples, p2 = this._eval(s2, u2, v2);
                        if (this._dist(p1, p2) < tol * 10) {
                            const refined = this._refine(s1, s2, u1, v1, u2, v2, tol);
                            if (refined) starts.push(refined);
                        }
                    }
                }
            }
        }
        return this._removeDupPts(starts, tol);
    },

    _refine: function(s1, s2, u1, v1, u2, v2, tol) {
        for (let iter = 0; iter < 20; iter++) {
            const p1 = this._eval(s1, u1, v1), p2 = this._eval(s2, u2, v2);
            const diff = { x: p1.x-p2.x, y: p1.y-p2.y, z: p1.z-p2.z };
            const dist = Math.sqrt(diff.x*diff.x + diff.y*diff.y + diff.z*diff.z);
            if (dist < tol) return { u1, v1, u2, v2, point: p1 };
            
            // Simplified Newton step
            u1 = Math.max(0, Math.min(1, u1 - diff.x * 0.1));
            v1 = Math.max(0, Math.min(1, v1 - diff.y * 0.1));
            u2 = Math.max(0, Math.min(1, u2 + diff.x * 0.1));
            v2 = Math.max(0, Math.min(1, v2 + diff.y * 0.1));
        }
        return null;
    },

    _trace: function(s1, s2, start, step, max, visited) {
        const curve = [start];
        for (const dir of [1, -1]) {
            let cur = { ...start };
            for (let i = 0; i < max/2; i++) {
                const n1 = this._normal(s1, cur.u1, cur.v1), n2 = this._normal(s2, cur.u2, cur.v2);
                const t = { x: n1.y*n2.z - n1.z*n2.y, y: n1.z*n2.x - n1.x*n2.z, z: n1.x*n2.y - n1.y*n2.x };
                const len = Math.sqrt(t.x*t.x + t.y*t.y + t.z*t.z);
                if (len < 1e-10) break;
                
                const nu1 = cur.u1 + dir * step * t.x / len;
                const nv1 = cur.v1 + dir * step * t.y / len;
                if (nu1 < 0 || nu1 > 1 || nv1 < 0 || nv1 > 1) break;
                
                const refined = this._refine(s1, s2, nu1, nv1, cur.u2, cur.v2, 1e-8);
                if (!refined) break;
                
                const key = `${refined.u1.toFixed(4)},${refined.v1.toFixed(4)}`;
                if (visited.has(key)) break;
                visited.add(key);
                
                dir === 1 ? curve.push(refined) : curve.unshift(refined);
                cur = refined;
            }
        }
        return curve;
    },

    _eval: function(s, u, v) {
        if (s.fn) return s.fn(u, v);
        const { controlPoints, numU, numV } = s;
        const i = Math.min(Math.floor(u * (numU-1)), numU-2);
        const j = Math.min(Math.floor(v * (numV-1)), numV-2);
        const ss = u * (numU-1) - i, tt = v * (numV-1) - j;
        const p00 = controlPoints[i*numV+j], p01 = controlPoints[i*numV+j+1];
        const p10 = controlPoints[(i+1)*numV+j], p11 = controlPoints[(i+1)*numV+j+1];
        return {
            x: (1-ss)*(1-tt)*p00.x + (1-ss)*tt*p01.x + ss*(1-tt)*p10.x + ss*tt*p11.x,
            y: (1-ss)*(1-tt)*p00.y + (1-ss)*tt*p01.y + ss*(1-tt)*p10.y + ss*tt*p11.y,
            z: (1-ss)*(1-tt)*p00.z + (1-ss)*tt*p01.z + ss*(1-tt)*p10.z + ss*tt*p11.z
        };
    },

    _normal: function(s, u, v) {
        const eps = 1e-6;
        const p0u = this._eval(s, Math.max(0, u-eps), v), p1u = this._eval(s, Math.min(1, u+eps), v);
        const p0v = this._eval(s, u, Math.max(0, v-eps)), p1v = this._eval(s, u, Math.min(1, v+eps));
        const du = { x: (p1u.x-p0u.x)/(2*eps), y: (p1u.y-p0u.y)/(2*eps), z: (p1u.z-p0u.z)/(2*eps) };
        const dv = { x: (p1v.x-p0v.x)/(2*eps), y: (p1v.y-p0v.y)/(2*eps), z: (p1v.z-p0v.z)/(2*eps) };
        const n = { x: du.y*dv.z - du.z*dv.y, y: du.z*dv.x - du.x*dv.z, z: du.x*dv.y - du.y*dv.x };
        const len = Math.sqrt(n.x*n.x + n.y*n.y + n.z*n.z);
        if (len > 1e-10) { n.x /= len; n.y /= len; n.z /= len; }
        return n;
    },

    _dist: function(a, b) { return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2); },
    _removeDupPts: function(pts, tol) {
        const unique = [];
        for (const p of pts) {
            if (!unique.some(u => Math.abs(p.u1-u.u1) < tol && Math.abs(p.v1-u.v1) < tol)) unique.push(p);
        }
        return unique;
    }
}