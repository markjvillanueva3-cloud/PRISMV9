/**
 * PRISM_BSPLINE_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * References: 25
 * Lines: 200
 * Session: R2.3.1 Wave 2 Engine Gap Extraction
 */

const PRISM_BSPLINE_ENGINE = {
    name: 'PRISM_BSPLINE_ENGINE',
    version: '1.0.0',

    // Find knot span index
    findKnotSpan: function(n, degree, t, knots) {
        if (t >= knots[n + 1]) return n;
        if (t <= knots[degree]) return degree;

        let low = degree, high = n + 1, mid = Math.floor((low + high) / 2);
        while (t < knots[mid] || t >= knots[mid + 1]) {
            if (t < knots[mid]) high = mid;
            else low = mid;
            mid = Math.floor((low + high) / 2);
        }
        return mid;
    },
    // Compute basis functions using Cox-de Boor recursion
    basisFunctions: function(span, t, degree, knots) {
        const N = new Array(degree + 1).fill(0);
        const left = new Array(degree + 1).fill(0);
        const right = new Array(degree + 1).fill(0);

        N[0] = 1.0;

        for (let j = 1; j <= degree; j++) {
            left[j] = t - knots[span + 1 - j];
            right[j] = knots[span + j] - t;
            let saved = 0.0;

            for (let r = 0; r < j; r++) {
                const temp = N[r] / (right[r + 1] + left[j - r]);
                N[r] = saved + right[r + 1] * temp;
                saved = left[j - r] * temp;
            }
            N[j] = saved;
        }
        return N;
    },
    // Evaluate B-spline curve at parameter t
    evaluateCurve: function(controlPoints, degree, knots, t) {
        const n = controlPoints.length - 1;
        const span = this.findKnotSpan(n, degree, t, knots);
        const N = this.basisFunctions(span, t, degree, knots);

        let point = { x: 0, y: 0, z: 0 };
        for (let i = 0; i <= degree; i++) {
            const cp = controlPoints[span - degree + i];
            point.x += N[i] * cp.x;
            point.y += N[i] * cp.y;
            point.z += N[i] * cp.z;
        }
        return point;
    },
    // Evaluate NURBS curve (rational B-spline)
    evaluateNURBSCurve: function(controlPoints, weights, degree, knots, t) {
        const n = controlPoints.length - 1;
        const span = this.findKnotSpan(n, degree, t, knots);
        const N = this.basisFunctions(span, t, degree, knots);

        let point = { x: 0, y: 0, z: 0 };
        let w = 0;

        for (let i = 0; i <= degree; i++) {
            const idx = span - degree + i;
            const cp = controlPoints[idx];
            const weight = weights[idx];
            const Nw = N[i] * weight;

            point.x += Nw * cp.x;
            point.y += Nw * cp.y;
            point.z += Nw * cp.z;
            w += Nw;
        }
        if (Math.abs(w) > PRISM_CAD_MATH.EPSILON) {
            point.x /= w;
            point.y /= w;
            point.z /= w;
        }
        return point;
    },
    // Evaluate B-spline surface at parameters (u, v)
    evaluateSurface: function(controlGrid, degreeU, degreeV, knotsU, knotsV, u, v) {
        const nU = controlGrid.length - 1;
        const nV = controlGrid[0].length - 1;

        const spanU = this.findKnotSpan(nU, degreeU, u, knotsU);
        const spanV = this.findKnotSpan(nV, degreeV, v, knotsV);

        const Nu = this.basisFunctions(spanU, u, degreeU, knotsU);
        const Nv = this.basisFunctions(spanV, v, degreeV, knotsV);

        let point = { x: 0, y: 0, z: 0 };

        for (let i = 0; i <= degreeU; i++) {
            for (let j = 0; j <= degreeV; j++) {
                const cp = controlGrid[spanU - degreeU + i][spanV - degreeV + j];
                const basis = Nu[i] * Nv[j];

                point.x += basis * cp.x;
                point.y += basis * cp.y;
                point.z += basis * cp.z;
            }
        }
        return point;
    },
    // Evaluate NURBS surface (rational B-spline surface)
    evaluateNURBSSurface: function(controlGrid, weightsGrid, degreeU, degreeV, knotsU, knotsV, u, v) {
        const nU = controlGrid.length - 1;
        const nV = controlGrid[0].length - 1;

        const spanU = this.findKnotSpan(nU, degreeU, u, knotsU);
        const spanV = this.findKnotSpan(nV, degreeV, v, knotsV);

        const Nu = this.basisFunctions(spanU, u, degreeU, knotsU);
        const Nv = this.basisFunctions(spanV, v, degreeV, knotsV);

        let point = { x: 0, y: 0, z: 0 };
        let w = 0;

        for (let i = 0; i <= degreeU; i++) {
            for (let j = 0; j <= degreeV; j++) {
                const idxU = spanU - degreeU + i;
                const idxV = spanV - degreeV + j;
                const cp = controlGrid[idxU][idxV];
                const weight = weightsGrid[idxU][idxV];
                const basis = Nu[i] * Nv[j] * weight;

                point.x += basis * cp.x;
                point.y += basis * cp.y;
                point.z += basis * cp.z;
                w += basis;
            }
        }
        if (Math.abs(w) > PRISM_CAD_MATH.EPSILON) {
            point.x /= w;
            point.y /= w;
            point.z /= w;
        }
        return point;
    },
    // Compute surface normal via partial derivatives
    evaluateSurfaceNormal: function(controlGrid, weightsGrid, degreeU, degreeV, knotsU, knotsV, u, v) {
        const eps = 1e-5;

        // Central difference approximation for partial derivatives
        const p = this.evaluateNURBSSurface(controlGrid, weightsGrid, degreeU, degreeV, knotsU, knotsV, u, v);

        // dP/du
        const u1 = Math.max(0, u - eps);
        const u2 = Math.min(1, u + eps);
        const pU1 = this.evaluateNURBSSurface(controlGrid, weightsGrid, degreeU, degreeV, knotsU, knotsV, u1, v);
        const pU2 = this.evaluateNURBSSurface(controlGrid, weightsGrid, degreeU, degreeV, knotsU, knotsV, u2, v);
        const dPdu = {
            x: (pU2.x - pU1.x) / (u2 - u1),
            y: (pU2.y - pU1.y) / (u2 - u1),
            z: (pU2.z - pU1.z) / (u2 - u1)
        };
        // dP/dv
        const v1 = Math.max(0, v - eps);
        const v2 = Math.min(1, v + eps);
        const pV1 = this.evaluateNURBSSurface(controlGrid, weightsGrid, degreeU, degreeV, knotsU, knotsV, u, v1);
        const pV2 = this.evaluateNURBSSurface(controlGrid, weightsGrid, degreeU, degreeV, knotsU, knotsV, u, v2);
        const dPdv = {
            x: (pV2.x - pV1.x) / (v2 - v1),
            y: (pV2.y - pV1.y) / (v2 - v1),
            z: (pV2.z - pV1.z) / (v2 - v1)
        };
        // Normal = dPdu × dPdv
        const normal = PRISM_CAD_MATH.vec3.cross(dPdu, dPdv);
        return PRISM_CAD_MATH.vec3.normalize(normal);
    },
    // Self-test
    selfTest: function() {
        console.log('[PRISM B-Spline] Running self-test...');

        // Test: cubic B-spline curve evaluation
        const cp = [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 2, z: 0 },
            { x: 3, y: 2, z: 0 },
            { x: 4, y: 0, z: 0 }
        ];
        const knots = [0, 0, 0, 0, 1, 1, 1, 1];

        const p0 = this.evaluateCurve(cp, 3, knots, 0);
        const p1 = this.evaluateCurve(cp, 3, knots, 1);
        const pMid = this.evaluateCurve(cp, 3, knots, 0.5);

        const tests = [
            { name: 'Curve start', pass: PRISM_CAD_MATH.vec3.equal(p0, cp[0], 1e-6) },
            { name: 'Curve end', pass: PRISM_CAD_MATH.vec3.equal(p1, cp[3], 1e-6) },
            { name: 'Curve midpoint reasonable', pass: pMid.y > 0 && pMid.y < 3 }
        ];

        const allPassed = tests.every(t => t.pass);
        console.log(`[PRISM B-Spline] Self-test ${allPassed ? 'PASSED' : 'FAILED'}:`, tests);
        return allPassed;
    }
}