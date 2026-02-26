const PRISM_NURBS_ENHANCED = {
    name: 'PRISM_NURBS_ENHANCED',
    version: '1.0.0',
    source: 'MIT 2.158J Computational Geometry, Stanford CS 348A',
    
    /**
     * Knot Insertion (Oslo Algorithm)
     * Insert a new knot without changing curve shape
     */
    insertKnot: function(params) {
        const {
            degree,
            controlPoints,
            knots,
            weights = null,
            newKnot
        } = params;
        
        const n = controlPoints.length - 1;
        const p = degree;
        
        // Find knot span
        let k = 0;
        for (let i = 0; i < knots.length - 1; i++) {
            if (newKnot >= knots[i] && newKnot < knots[i + 1]) {
                k = i;
                break;
            }
        }
        
        // Check multiplicity
        let s = 0;
        for (const knot of knots) {
            if (Math.abs(knot - newKnot) < 1e-10) s++;
        }
        
        if (s >= p) {
            return { success: false, reason: 'Knot already at maximum multiplicity' };
        }
        
        // New control points
        const newCPs = [];
        const newWeights = weights ? [] : null;
        
        for (let i = 0; i <= n + 1; i++) {
            if (i <= k - p) {
                newCPs.push({ ...controlPoints[i] });
                if (weights) newWeights.push(weights[i]);
            } else if (i >= k - s + 1) {
                newCPs.push({ ...controlPoints[i - 1] });
                if (weights) newWeights.push(weights[i - 1]);
            } else {
                const alpha = (newKnot - knots[i]) / (knots[i + p] - knots[i]);
                const prevPt = controlPoints[i - 1];
                const currPt = controlPoints[i];
                
                newCPs.push({
                    x: (1 - alpha) * prevPt.x + alpha * currPt.x,
                    y: (1 - alpha) * prevPt.y + alpha * currPt.y,
                    z: (1 - alpha) * (prevPt.z || 0) + alpha * (currPt.z || 0)
                });
                
                if (weights) {
                    newWeights.push((1 - alpha) * weights[i - 1] + alpha * weights[i]);
                }
            }
        }
        
        // New knot vector
        const newKnots = [...knots.slice(0, k + 1), newKnot, ...knots.slice(k + 1)];
        
        return {
            success: true,
            controlPoints: newCPs,
            knots: newKnots,
            weights: newWeights,
            insertedAt: k + 1
        };
    },
    
    /**
     * Knot Removal
     * Remove a knot if curve deviation is within tolerance
     */
    removeKnot: function(params) {
        const {
            degree,
            controlPoints,
            knots,
            knotIndex,
            tolerance = 1e-6
        } = params;
        
        const n = controlPoints.length - 1;
        const p = degree;
        const r = knotIndex;
        
        // Find multiplicity
        let s = 0;
        const u = knots[r];
        for (const knot of knots) {
            if (Math.abs(knot - u) < 1e-10) s++;
        }
        
        if (s === 0) {
            return { success: false, reason: 'Knot not found' };
        }
        
        // Compute new control points
        const ord = p + 1;
        const fout = Math.floor((2 * r - s - p) / 2);
        const last = r - s;
        const first = r - p;
        
        const temp = [];
        for (let i = 0; i <= n; i++) {
            temp[i] = { ...controlPoints[i] };
        }
        
        // Try removal
        let i = first;
        let j = last;
        let t = 0;
        
        while (j - i > t) {
            const alphai = (u - knots[i]) / (knots[i + ord] - knots[i]);
            const alphaj = (u - knots[j]) / (knots[j + ord] - knots[j]);
            
            temp[i] = {
                x: (controlPoints[i].x - (1 - alphai) * temp[i - 1].x) / alphai,
                y: (controlPoints[i].y - (1 - alphai) * temp[i - 1].y) / alphai,
                z: ((controlPoints[i].z || 0) - (1 - alphai) * (temp[i - 1].z || 0)) / alphai
            };
            
            temp[j] = {
                x: (controlPoints[j].x - alphaj * temp[j + 1].x) / (1 - alphaj),
                y: (controlPoints[j].y - alphaj * temp[j + 1].y) / (1 - alphaj),
                z: ((controlPoints[j].z || 0) - alphaj * (temp[j + 1].z || 0)) / (1 - alphaj)
            };
            
            i++;
            j--;
            t++;
        }
        
        // Check deviation
        const dx = temp[i - 1].x - temp[j + 1].x;
        const dy = temp[i - 1].y - temp[j + 1].y;
        const dz = (temp[i - 1].z || 0) - (temp[j + 1].z || 0);
        const deviation = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        if (deviation > tolerance) {
            return { success: false, reason: 'Deviation exceeds tolerance', deviation };
        }
        
        // Build new arrays
        const newCPs = [];
        for (let i = 0; i <= first - 1; i++) newCPs.push(controlPoints[i]);
        for (let i = first; i <= last; i++) newCPs.push(temp[i]);
        for (let i = last + 1; i <= n; i++) newCPs.push(controlPoints[i]);
        
        const newKnots = [...knots.slice(0, r), ...knots.slice(r + 1)];
        
        return {
            success: true,
            controlPoints: newCPs.slice(0, n),
            knots: newKnots,
            deviation
        };
    },
    
    /**
     * Degree Elevation
     * Increase curve degree without changing shape
     */
    elevateDegree: function(params) {
        const {
            degree,
            controlPoints,
            knots,
            elevateBy = 1
        } = params;
        
        const n = controlPoints.length - 1;
        const p = degree;
        const t = elevateBy;
        const newDegree = p + t;
        
        // Bezier degree elevation coefficients
        const bezierCoeffs = [];
        for (let i = 0; i <= newDegree; i++) {
            bezierCoeffs[i] = [];
            for (let j = Math.max(0, i - t); j <= Math.min(p, i); j++) {
                bezierCoeffs[i][j] = this._binomial(p, j) * this._binomial(t, i - j) / 
                                     this._binomial(newDegree, i);
            }
        }
        
        // Find unique knots and multiplicities
        const uniqueKnots = [];
        const multiplicities = [];
        let prev = knots[0] - 1;
        
        for (const knot of knots) {
            if (Math.abs(knot - prev) > 1e-10) {
                uniqueKnots.push(knot);
                multiplicities.push(1);
                prev = knot;
            } else {
                multiplicities[multiplicities.length - 1]++;
            }
        }
        
        // New knot vector
        const newKnots = [];
        for (let i = 0; i < uniqueKnots.length; i++) {
            const newMult = Math.min(multiplicities[i] + t, newDegree + 1);
            for (let j = 0; j < newMult; j++) {
                newKnots.push(uniqueKnots[i]);
            }
        }
        
        // Simplified: compute new control points for single Bezier segment
        // For full implementation, decompose into Bezier segments first
        const newCPs = [];
        const m = n + t;
        
        for (let i = 0; i <= m; i++) {
            let pt = { x: 0, y: 0, z: 0 };
            for (let j = Math.max(0, i - t); j <= Math.min(p, i); j++) {
                if (j <= n) {
                    const coeff = bezierCoeffs[i][j] || 0;
                    pt.x += coeff * controlPoints[j].x;
                    pt.y += coeff * controlPoints[j].y;
                    pt.z += coeff * (controlPoints[j].z || 0);
                }
            }
            newCPs.push(pt);
        }
        
        return {
            degree: newDegree,
            controlPoints: newCPs,
            knots: newKnots
        };
    },
    
    /**
     * Least Squares Curve Fitting
     * Fit B-spline to data points
     */
    fitCurve: function(params) {
        const {
            dataPoints,      // Array of {x, y, z}
            degree = 3,
            numControlPoints = null
        } = params;
        
        const m = dataPoints.length;
        const n = numControlPoints || Math.max(degree + 1, Math.floor(m / 3));
        const p = degree;
        
        // Parameterize data points (chord length)
        const t = [0];
        let totalLength = 0;
        for (let i = 1; i < m; i++) {
            const dx = dataPoints[i].x - dataPoints[i-1].x;
            const dy = dataPoints[i].y - dataPoints[i-1].y;
            const dz = (dataPoints[i].z || 0) - (dataPoints[i-1].z || 0);
            totalLength += Math.sqrt(dx*dx + dy*dy + dz*dz);
            t.push(totalLength);
        }
        for (let i = 0; i < m; i++) t[i] /= totalLength;
        
        // Generate uniform knot vector
        const knots = [];
        for (let i = 0; i <= p; i++) knots.push(0);
        const innerKnots = n - p;
        for (let i = 1; i < innerKnots; i++) {
            knots.push(i / innerKnots);
        }
        for (let i = 0; i <= p; i++) knots.push(1);
        
        // Build basis function matrix N (m x n)
        const N = [];
        for (let i = 0; i < m; i++) {
            N[i] = [];
            for (let j = 0; j < n; j++) {
                N[i][j] = this._basisFunction(j, p, t[i], knots);
            }
        }
        
        // Solve N' * N * P = N' * D (least squares)
        // Simplified: use normal equations
        const NtN = [];
        const NtD = { x: [], y: [], z: [] };
        
        for (let i = 0; i < n; i++) {
            NtN[i] = [];
            for (let j = 0; j < n; j++) {
                let sum = 0;
                for (let k = 0; k < m; k++) {
                    sum += N[k][i] * N[k][j];
                }
                NtN[i][j] = sum;
            }
            
            let sumX = 0, sumY = 0, sumZ = 0;
            for (let k = 0; k < m; k++) {
                sumX += N[k][i] * dataPoints[k].x;
                sumY += N[k][i] * dataPoints[k].y;
                sumZ += N[k][i] * (dataPoints[k].z || 0);
            }
            NtD.x[i] = sumX;
            NtD.y[i] = sumY;
            NtD.z[i] = sumZ;
        }
        
        // Solve using Gaussian elimination
        const Px = this._solveLinearSystem(NtN, NtD.x);
        const Py = this._solveLinearSystem(NtN, NtD.y);
        const Pz = this._solveLinearSystem(NtN, NtD.z);
        
        const controlPoints = [];
        for (let i = 0; i < n; i++) {
            controlPoints.push({ x: Px[i], y: Py[i], z: Pz[i] });
        }
        
        // Calculate fitting error
        let maxError = 0;
        for (let i = 0; i < m; i++) {
            const pt = this._evaluateBSpline(t[i], p, controlPoints, knots);
            const dx = pt.x - dataPoints[i].x;
            const dy = pt.y - dataPoints[i].y;
            const dz = pt.z - (dataPoints[i].z || 0);
            const error = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if (error > maxError) maxError = error;
        }
        
        return {
            degree,
            controlPoints,
            knots,
            maxError,
            parameterization: t
        };
    },
    
    /**
     * Surface Fitting (Tensor Product)
     */
    fitSurface: function(params) {
        const {
            dataPoints,      // 2D array of {x, y, z}
            degreeU = 3,
            degreeV = 3
        } = params;
        
        const m = dataPoints.length;
        const n = dataPoints[0].length;
        
        // Fit curves in U direction
        const uCurves = [];
        for (let j = 0; j < n; j++) {
            const rowPoints = dataPoints.map(row => row[j]);
            const curve = this.fitCurve({ dataPoints: rowPoints, degree: degreeU });
            uCurves.push(curve.controlPoints);
        }
        
        // Fit curves in V direction through U-curve control points
        const controlNet = [];
        const numCPu = uCurves[0].length;
        
        for (let i = 0; i < numCPu; i++) {
            const colPoints = uCurves.map(curve => curve[i]);
            const curve = this.fitCurve({ dataPoints: colPoints, degree: degreeV });
            controlNet.push(curve.controlPoints);
        }
        
        // Generate knot vectors
        const knotsU = this._generateUniformKnots(numCPu, degreeU);
        const knotsV = this._generateUniformKnots(controlNet[0].length, degreeV);
        
        return {
            degreeU,
            degreeV,
            controlNet,
            knotsU,
            knotsV
        };
    },
    
    // Helper functions
    _binomial: function(n, k) {
        if (k > n) return 0;
        if (k === 0 || k === n) return 1;
        let result = 1;
        for (let i = 1; i <= k; i++) {
            result = result * (n - i + 1) / i;
        }
        return result;
    },
    
    _basisFunction: function(i, p, t, knots) {
        if (p === 0) {
            return (t >= knots[i] && t < knots[i + 1]) ? 1 : 0;
        }
        
        let left = 0, right = 0;
        const denom1 = knots[i + p] - knots[i];
        const denom2 = knots[i + p + 1] - knots[i + 1];
        
        if (denom1 > 1e-10) {
            left = (t - knots[i]) / denom1 * this._basisFunction(i, p - 1, t, knots);
        }
        if (denom2 > 1e-10) {
            right = (knots[i + p + 1] - t) / denom2 * this._basisFunction(i + 1, p - 1, t, knots);
        }
        
        return left + right;
    },
    
    _evaluateBSpline: function(t, degree, controlPoints, knots) {
        let pt = { x: 0, y: 0, z: 0 };
        for (let i = 0; i < controlPoints.length; i++) {
            const basis = this._basisFunction(i, degree, t, knots);
            pt.x += basis * controlPoints[i].x;
            pt.y += basis * controlPoints[i].y;
            pt.z += basis * (controlPoints[i].z || 0);
        }
        return pt;
    },
    
    _generateUniformKnots: function(numCP, degree) {
        const knots = [];
        for (let i = 0; i <= degree; i++) knots.push(0);
        const inner = numCP - degree;
        for (let i = 1; i < inner; i++) knots.push(i / inner);
        for (let i = 0; i <= degree; i++) knots.push(1);
        return knots;
    },
    
    _solveLinearSystem: function(A, b) {
        const n = b.length;
        const aug = A.map((row, i) => [...row, b[i]]);
        
        // Forward elimination
        for (let col = 0; col < n; col++) {
            let maxRow = col;
            for (let row = col + 1; row < n; row++) {
                if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
                    maxRow = row;
                }
            }
            [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
            
            if (Math.abs(aug[col][col]) < 1e-12) continue;
            
            for (let row = col + 1; row < n; row++) {
                const factor = aug[row][col] / aug[col][col];
                for (let j = col; j <= n; j++) {
                    aug[row][j] -= factor * aug[col][j];
                }
            }
        }
        
        // Back substitution
        const x = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            let sum = aug[i][n];
            for (let j = i + 1; j < n; j++) {
                sum -= aug[i][j] * x[j];
            }
            x[i] = Math.abs(aug[i][i]) > 1e-12 ? sum / aug[i][i] : 0;
        }
        
        return x;
    }
}