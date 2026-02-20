const PRISM_BEZIER_INTERSECTION_ENGINE = {
    name: 'PRISM_BEZIER_INTERSECTION_ENGINE',
    version: '1.0.0',
    source: 'Sederberg & Nishita 1990',

    intersect: function(curve1, curve2, tolerance = 1e-6) {
        const results = [];
        this._intersectRecursive(curve1, curve2, 0, 1, 0, 1, tolerance, results, 0);
        return this._removeDups(results, tolerance);
    },

    _intersectRecursive: function(c1, c2, t1Min, t1Max, t2Min, t2Max, tol, results, depth) {
        if (depth > 50) return;
        const bb1 = this._bbox(c1), bb2 = this._bbox(c2);
        if (!this._boxOverlap(bb1, bb2)) return;
        
        const s1 = Math.max(bb1.maxX - bb1.minX, bb1.maxY - bb1.minY);
        const s2 = Math.max(bb2.maxX - bb2.minX, bb2.maxY - bb2.minY);
        
        if (s1 < tol && s2 < tol) {
            results.push({ t1: (t1Min+t1Max)/2, t2: (t2Min+t2Max)/2, point: this._evalBezier(c1, 0.5) });
            return;
        }
        
        if (s1 > s2) {
            const [left, right] = this._subdivide(c1, 0.5);
            const mid = (t1Min + t1Max) / 2;
            this._intersectRecursive(left, c2, t1Min, mid, t2Min, t2Max, tol, results, depth+1);
            this._intersectRecursive(right, c2, mid, t1Max, t2Min, t2Max, tol, results, depth+1);
        } else {
            const [left, right] = this._subdivide(c2, 0.5);
            const mid = (t2Min + t2Max) / 2;
            this._intersectRecursive(c1, left, t1Min, t1Max, t2Min, mid, tol, results, depth+1);
            this._intersectRecursive(c1, right, t1Min, t1Max, mid, t2Max, tol, results, depth+1);
        }
    },

    selfIntersect: function(curve, tolerance = 1e-6) {
        const [left, right] = this._subdivide(curve, 0.5);
        const intersections = this.intersect(left, right, tolerance);
        return intersections.map(i => ({ t1: i.t1 * 0.5, t2: 0.5 + i.t2 * 0.5, point: i.point }))
            .filter(i => Math.abs(i.t1 - i.t2) > tolerance);
    },

    _bbox: function(curve) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of curve) {
            minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
        }
        return { minX, minY, maxX, maxY };
    },

    _boxOverlap: function(b1, b2) {
        return !(b1.maxX < b2.minX || b1.minX > b2.maxX || b1.maxY < b2.minY || b1.minY > b2.maxY);
    },

    _evalBezier: function(curve, t) {
        const n = curve.length - 1;
        let x = 0, y = 0;
        for (let i = 0; i <= n; i++) {
            const b = this._bernstein(n, i, t);
            x += b * curve[i].x; y += b * curve[i].y;
        }
        return { x, y };
    },

    _bernstein: function(n, i, t) {
        return this._binomial(n, i) * Math.pow(t, i) * Math.pow(1-t, n-i);
    },

    _binomial: function(n, k) {
        if (k > n || k < 0) return 0;
        if (k === 0 || k === n) return 1;
        let r = 1;
        for (let i = 0; i < k; i++) r = r * (n-i) / (i+1);
        return r;
    },

    _subdivide: function(curve, t) {
        const n = curve.length - 1;
        const left = [curve[0]], right = [curve[n]];
        let pts = [...curve];
        for (let r = 1; r <= n; r++) {
            const newPts = [];
            for (let i = 0; i < pts.length - 1; i++) {
                newPts.push({ x: (1-t)*pts[i].x + t*pts[i+1].x, y: (1-t)*pts[i].y + t*pts[i+1].y });
            }
            left.push(newPts[0]);
            right.unshift(newPts[newPts.length-1]);
            pts = newPts;
        }
        return [left, right];
    },

    _removeDups: function(intersections, tol) {
        const unique = [];
        for (const i of intersections) {
            let isDup = false;
            for (const u of unique) {
                if (Math.abs(i.t1 - u.t1) < tol && Math.abs(i.t2 - u.t2) < tol) { isDup = true; break; }
            }
            if (!isDup) unique.push(i);
        }
        return unique;
    }
}