const PRISM_NURBS_ADVANCED_ENGINE = {
    name: 'PRISM_NURBS_ADVANCED_ENGINE',
    version: '1.0.0',
    source: 'Stanford CS 348A, Piegl & Tiller',

    evaluateCurve: function(curve, u) {
        const { controlPoints, weights, knots, degree } = curve;
        const n = controlPoints.length - 1;
        const span = this._findSpan(n, degree, u, knots);
        const N = this._basisFns(span, u, degree, knots);
        
        let x = 0, y = 0, z = 0, w = 0;
        for (let i = 0; i <= degree; i++) {
            const idx = span - degree + i;
            const wt = weights ? weights[idx] : 1;
            const Nw = N[i] * wt;
            x += Nw * controlPoints[idx].x;
            y += Nw * controlPoints[idx].y;
            z += Nw * (controlPoints[idx].z || 0);
            w += Nw;
        }
        return { x: x/w, y: y/w, z: z/w };
    },

    evaluateSurface: function(surface, u, v) {
        const { controlPoints, knotsU, knotsV, degreeU, degreeV, numU, numV } = surface;
        const spanU = this._findSpan(numU-1, degreeU, u, knotsU);
        const spanV = this._findSpan(numV-1, degreeV, v, knotsV);
        const Nu = this._basisFns(spanU, u, degreeU, knotsU);
        const Nv = this._basisFns(spanV, v, degreeV, knotsV);
        
        let x = 0, y = 0, z = 0, w = 0;
        for (let i = 0; i <= degreeU; i++) {
            for (let j = 0; j <= degreeV; j++) {
                const idxU = spanU - degreeU + i, idxV = spanV - degreeV + j;
                const cp = controlPoints[idxU * numV + idxV];
                const Nw = Nu[i] * Nv[j];
                x += Nw * cp.x; y += Nw * cp.y; z += Nw * (cp.z || 0); w += Nw;
            }
        }
        return { x: x/w, y: y/w, z: z/w };
    },

    insertKnot: function(curve, u, times = 1) {
        let { controlPoints, weights, knots, degree } = curve;
        let newKnots = [...knots], newCP = controlPoints.map(p => ({...p}));
        let newW = weights ? [...weights] : null;
        
        for (let t = 0; t < times; t++) {
            const k = this._findSpan(newCP.length - 1, degree, u, newKnots);
            const tempCP = [], tempW = newW ? [] : null;
            
            for (let i = 0; i <= newCP.length; i++) {
                if (i <= k - degree) {
                    tempCP.push({...newCP[i]});
                    if (tempW) tempW.push(newW[i]);
                } else if (i > k) {
                    tempCP.push({...newCP[i-1]});
                    if (tempW) tempW.push(newW[i-1]);
                } else {
                    const alpha = (u - newKnots[i]) / (newKnots[i + degree] - newKnots[i]);
                    const p0 = newCP[i-1], p1 = newCP[i];
                    tempCP.push({
                        x: (1-alpha)*p0.x + alpha*p1.x,
                        y: (1-alpha)*p0.y + alpha*p1.y,
                        z: (1-alpha)*(p0.z||0) + alpha*(p1.z||0)
                    });
                    if (tempW) tempW.push((1-alpha)*newW[i-1] + alpha*newW[i]);
                }
            }
            newKnots = [...newKnots.slice(0, k+1), u, ...newKnots.slice(k+1)];
            newCP = tempCP; newW = tempW;
        }
        return { controlPoints: newCP, weights: newW, knots: newKnots, degree };
    },

    curveDerivative: function(curve, u, order = 1) {
        const { controlPoints, knots, degree } = curve;
        if (order > degree) return { x: 0, y: 0, z: 0 };
        
        const derivCP = [];
        for (let i = 0; i < controlPoints.length - 1; i++) {
            const f = degree / (knots[i + degree + 1] - knots[i + 1]);
            derivCP.push({
                x: f * (controlPoints[i+1].x - controlPoints[i].x),
                y: f * (controlPoints[i+1].y - controlPoints[i].y),
                z: f * ((controlPoints[i+1].z||0) - (controlPoints[i].z||0))
            });
        }
        
        if (order === 1) {
            return this.evaluateCurve({ controlPoints: derivCP, knots: knots.slice(1,-1), degree: degree-1 }, u);
        }
        return this.curveDerivative({ controlPoints: derivCP, knots: knots.slice(1,-1), degree: degree-1 }, u, order-1);
    },

    splitCurve: function(curve, u) {
        const split = this.insertKnot(curve, u, curve.degree + 1);
        const k = this._findSpan(curve.controlPoints.length - 1, curve.degree, u, curve.knots);
        return {
            left: { controlPoints: split.controlPoints.slice(0, k+1), knots: split.knots.slice(0, k+curve.degree+2), degree: curve.degree },
            right: { controlPoints: split.controlPoints.slice(k), knots: split.knots.slice(k), degree: curve.degree }
        };
    },

    _findSpan: function(n, p, u, knots) {
        if (u >= knots[n+1]) return n;
        if (u <= knots[p]) return p;
        let lo = p, hi = n + 1, mid = Math.floor((lo+hi)/2);
        while (u < knots[mid] || u >= knots[mid+1]) {
            if (u < knots[mid]) hi = mid; else lo = mid;
            mid = Math.floor((lo+hi)/2);
        }
        return mid;
    },

    _basisFns: function(span, u, degree, knots) {
        const N = new Array(degree+1).fill(0), left = new Array(degree+1).fill(0), right = new Array(degree+1).fill(0);
        N[0] = 1.0;
        for (let j = 1; j <= degree; j++) {
            left[j] = u - knots[span+1-j]; right[j] = knots[span+j] - u;
            let saved = 0.0;
            for (let r = 0; r < j; r++) {
                const temp = N[r] / (right[r+1] + left[j-r]);
                N[r] = saved + right[r+1] * temp;
                saved = left[j-r] * temp;
            }
            N[j] = saved;
        }
        return N;
    }
}