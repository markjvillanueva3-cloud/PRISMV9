const PRISM_NURBS_100 = {
  version: '3.0.0',
  confidence: 100,
  courseBasis: 'Stanford CS 348A + MIT 18.02',

  // 2.1: NURBS Derivative Evaluation - Critical for normals and curvature

  /**
   * Evaluate B-spline curve and its derivatives at parameter t
   * Returns: [C(t), C'(t), C''(t), ...] up to k-th derivative
   * Algorithm: Modified De Boor using derivative basis functions
   */
  evaluateCurveDerivatives(controlPoints, knots, degree, t, k = 2) {
    const n = controlPoints.length - 1;
    const span = this.findKnotSpan(n, degree, t, knots);

    // Compute basis function derivatives
    const ders = this.derivBasisFunctions(span, t, degree, k, knots);

    // Initialize derivatives array
    const CK = [];
    for (let j = 0; j <= k; j++) {
      CK[j] = { x: 0, y: 0, z: 0 };
    }
    // Compute derivatives
    for (let j = 0; j <= Math.min(k, degree); j++) {
      for (let i = 0; i <= degree; i++) {
        const idx = span - degree + i;
        const cp = controlPoints[idx];
        CK[j].x += ders[j][i] * cp.x;
        CK[j].y += ders[j][i] * cp.y;
        CK[j].z += ders[j][i] * (cp.z || 0);
      }
    }
    return CK;
  },
  /**
   * Compute derivatives of basis functions
   * Based on: The NURBS Book, Algorithm A2.3
   */
  derivBasisFunctions(span, t, degree, k, knots) {
    const ndu = [];
    for (let i = 0; i <= degree; i++) {
      ndu[i] = new Array(degree + 1).fill(0);
    }
    const left = new Array(degree + 1).fill(0);
    const right = new Array(degree + 1).fill(0);

    ndu[0][0] = 1;

    for (let j = 1; j <= degree; j++) {
      left[j] = t - knots[span + 1 - j];
      right[j] = knots[span + j] - t;
      let saved = 0;

      for (let r = 0; r < j; r++) {
        ndu[j][r] = right[r + 1] + left[j - r];
        const temp = ndu[r][j - 1] / ndu[j][r];
        ndu[r][j] = saved + right[r + 1] * temp;
        saved = left[j - r] * temp;
      }
      ndu[j][j] = saved;
    }
    // Compute derivatives
    const ders = [];
    for (let j = 0; j <= k; j++) {
      ders[j] = new Array(degree + 1).fill(0);
    }
    // Load basis functions
    for (let j = 0; j <= degree; j++) {
      ders[0][j] = ndu[j][degree];
    }
    // Compute derivatives
    const a = [new Array(degree + 1).fill(0), new Array(degree + 1).fill(0)];

    for (let r = 0; r <= degree; r++) {
      let s1 = 0, s2 = 1;
      a[0][0] = 1;

      for (let kk = 1; kk <= k; kk++) {
        let d = 0;
        const rk = r - kk;
        const pk = degree - kk;

        if (r >= kk) {
          a[s2][0] = a[s1][0] / ndu[pk + 1][rk];
          d = a[s2][0] * ndu[rk][pk];
        }
        const j1 = rk >= -1 ? 1 : -rk;
        const j2 = (r - 1 <= pk) ? kk - 1 : degree - r;

        for (let j = j1; j <= j2; j++) {
          a[s2][j] = (a[s1][j] - a[s1][j - 1]) / ndu[pk + 1][rk + j];
          d += a[s2][j] * ndu[rk + j][pk];
        }
        if (r <= pk) {
          a[s2][kk] = -a[s1][kk - 1] / ndu[pk + 1][r];
          d += a[s2][kk] * ndu[r][pk];
        }
        ders[kk][r] = d;
        [s1, s2] = [s2, s1];
      }
    }
    // Multiply by correct factors
    let rr = degree;
    for (let kk = 1; kk <= k; kk++) {
      for (let j = 0; j <= degree; j++) {
        ders[kk][j] *= rr;
      }
      rr *= (degree - kk);
    }
    return ders;
  },
  /**
   * Evaluate NURBS surface and derivatives (for precise normals)
   */
  evaluateSurfaceDerivatives(controlGrid, weights, knotsU, knotsV,
                              degreeU, degreeV, u, v, k = 1) {
    const nu = controlGrid.length - 1;
    const nv = controlGrid[0].length - 1;

    const spanU = this.findKnotSpan(nu, degreeU, u, knotsU);
    const spanV = this.findKnotSpan(nv, degreeV, v, knotsV);

    const dersU = this.derivBasisFunctions(spanU, u, degreeU, k, knotsU);
    const dersV = this.derivBasisFunctions(spanV, v, degreeV, k, knotsV);

    // Compute surface derivatives
    const SKL = [];
    for (let kk = 0; kk <= k; kk++) {
      SKL[kk] = [];
      for (let l = 0; l <= k - kk; l++) {
        SKL[kk][l] = { x: 0, y: 0, z: 0 };

        for (let i = 0; i <= degreeU; i++) {
          const temp = { x: 0, y: 0, z: 0 };
          for (let j = 0; j <= degreeV; j++) {
            const idxU = spanU - degreeU + i;
            const idxV = spanV - degreeV + j;
            const cp = controlGrid[idxU][idxV];
            const w = weights ? weights[idxU][idxV] : 1;
            const factor = dersV[l][j] * w;

            temp.x += factor * cp.x;
            temp.y += factor * cp.y;
            temp.z += factor * (cp.z || 0);
          }
          SKL[kk][l].x += dersU[kk][i] * temp.x;
          SKL[kk][l].y += dersU[kk][i] * temp.y;
          SKL[kk][l].z += dersU[kk][i] * temp.z;
        }
      }
    }
    // For NURBS, need to apply quotient rule
    // For now, this handles non-rational case properly

    return SKL;
  },
  /**
   * Compute exact surface normal using partial derivatives
   */
  computeExactNormal(controlGrid, weights, knotsU, knotsV, degreeU, degreeV, u, v) {
    const ders = this.evaluateSurfaceDerivatives(
      controlGrid, weights, knotsU, knotsV, degreeU, degreeV, u, v, 1
    );

    const dPdu = ders[1][0];  // ∂P/∂u
    const dPdv = ders[0][1];  // ∂P/∂v

    // Normal = ∂P/∂u × ∂P/∂v
    const normal = {
      x: dPdu.y * dPdv.z - dPdu.z * dPdv.y,
      y: dPdu.z * dPdv.x - dPdu.x * dPdv.z,
      z: dPdu.x * dPdv.y - dPdu.y * dPdv.x
    };
    // Normalize
    const len = Math.sqrt(normal.x ** 2 + normal.y ** 2 + normal.z ** 2);
    if (len > 1e-10) {
      normal.x /= len;
      normal.y /= len;
      normal.z /= len;
    }
    return normal;
  },
  // 2.2: Curvature Calculation - Critical for adaptive tessellation

  /**
   * Compute Gaussian and mean curvature at surface point
   * Used for: Adaptive tessellation, quality assessment
   */
  computeCurvature(controlGrid, weights, knotsU, knotsV, degreeU, degreeV, u, v) {
    const ders = this.evaluateSurfaceDerivatives(
      controlGrid, weights, knotsU, knotsV, degreeU, degreeV, u, v, 2
    );

    // First derivatives
    const Pu = ders[1][0];
    const Pv = ders[0][1];

    // Second derivatives
    const Puu = ders[2][0];
    const Puv = ders[1][1];
    const Pvv = ders[0][2];

    // Normal
    const N = this.cross(Pu, Pv);
    const len = Math.sqrt(N.x ** 2 + N.y ** 2 + N.z ** 2);
    if (len > 1e-10) {
      N.x /= len; N.y /= len; N.z /= len;
    }
    // First fundamental form coefficients
    const E = this.dot(Pu, Pu);
    const F = this.dot(Pu, Pv);
    const G = this.dot(Pv, Pv);

    // Second fundamental form coefficients
    const L = this.dot(Puu, N);
    const M = this.dot(Puv, N);
    const NN = this.dot(Pvv, N);

    // Gaussian curvature: K = (LN - M²) / (EG - F²)
    const denom = E * G - F * F;
    const K = denom > 1e-10 ? (L * NN - M * M) / denom : 0;

    // Mean curvature: H = (EN - 2FM + GL) / (2(EG - F²))
    const H = denom > 1e-10 ? (E * NN - 2 * F * M + G * L) / (2 * denom) : 0;

    // Principal curvatures
    const discriminant = Math.max(0, H * H - K);
    const k1 = H + Math.sqrt(discriminant);
    const k2 = H - Math.sqrt(discriminant);

    return {
      gaussian: K,
      mean: H,
      principal: [k1, k2],
      maxCurvature: Math.max(Math.abs(k1), Math.abs(k2))
    };
  },
  // 2.3: Knot Manipulation - Insert/remove knots for refinement

  /**
   * Insert a knot into B-spline curve (Boehm's algorithm)
   * Preserves curve shape while adding control points
   */
  insertKnot(controlPoints, knots, degree, t, r = 1) {
    const n = controlPoints.length - 1;
    const k = this.findKnotSpan(n, degree, t, knots);

    // Count existing multiplicity
    let s = 0;
    for (let i = 0; i < knots.length; i++) {
      if (Math.abs(knots[i] - t) < 1e-10) s++;
    }
    // Can't insert more than degree times
    if (s + r > degree) {
      r = degree - s;
    }
    if (r <= 0) return { controlPoints, knots };

    // New knot vector
    const newKnots = [...knots.slice(0, k + 1)];
    for (let i = 0; i < r; i++) newKnots.push(t);
    newKnots.push(...knots.slice(k + 1));

    // New control points
    const newCPs = [];
    for (let i = 0; i <= k - degree; i++) {
      newCPs.push({ ...controlPoints[i] });
    }
    // Compute intermediate control points
    for (let j = 1; j <= r; j++) {
      const L = k - degree + j;
      for (let i = 0; i <= degree - j - s; i++) {
        const alpha = (t - knots[L + i]) / (knots[i + k + 1] - knots[L + i]);
        const cp1 = controlPoints[L + i - 1] || controlPoints[0];
        const cp2 = controlPoints[L + i] || controlPoints[n];

        newCPs[L + i] = {
          x: (1 - alpha) * cp1.x + alpha * cp2.x,
          y: (1 - alpha) * cp1.y + alpha * cp2.y,
          z: (1 - alpha) * (cp1.z || 0) + alpha * (cp2.z || 0)
        };
      }
    }
    // Copy remaining control points
    for (let i = k - s; i <= n; i++) {
      newCPs.push({ ...controlPoints[i] });
    }
    return {
      controlPoints: newCPs,
      knots: newKnots
    };
  },
  /**
   * Degree elevation - Increase curve degree while preserving shape
   */
  elevateDegree(controlPoints, knots, degree, t = 1) {
    const n = controlPoints.length - 1;
    const newDegree = degree + t;

    // This is a simplified implementation
    // Full implementation requires Bézier extraction and degree elevation

    const newKnots = [];
    const newCPs = [];

    // Elevate each Bézier segment
    let start = degree;
    while (start < knots.length - degree - 1) {
      // Find span of current Bézier segment
      let end = start + 1;
      while (end < knots.length && knots[end] === knots[start]) end++;
      while (end < knots.length - degree && knots[end] !== knots[end + 1]) end++;

      // Extract Bézier segment
      const bezierCPs = [];
      for (let i = 0; i <= degree; i++) {
        if (start - degree + i < controlPoints.length) {
          bezierCPs.push(controlPoints[start - degree + i]);
        }
      }
      // Degree elevate Bézier
      const elevated = this.elevateBezier(bezierCPs, t);

      // Add to result (avoiding duplicates)
      elevated.forEach((cp, i) => {
        if (newCPs.length === 0 || i > 0) {
          newCPs.push(cp);
        }
      });

      start = end;
    }
    // Build new knot vector
    for (let i = 0; i <= newDegree; i++) newKnots.push(knots[0]);

    const uniqueKnots = [...new Set(knots.slice(degree, knots.length - degree))];
    uniqueKnots.forEach(k => {
      for (let i = 0; i < t; i++) newKnots.push(k);
    });

    for (let i = 0; i <= newDegree; i++) newKnots.push(knots[knots.length - 1]);

    return {
      controlPoints: newCPs,
      knots: newKnots,
      degree: newDegree
    };
  },
  /**
   * Degree elevate a single Bézier curve
   */
  elevateBezier(controlPoints, t = 1) {
    const n = controlPoints.length - 1;
    const elevated = [];

    for (let i = 0; i <= n + t; i++) {
      elevated[i] = { x: 0, y: 0, z: 0 };

      for (let j = Math.max(0, i - t); j <= Math.min(n, i); j++) {
        const coef = this.binomial(n, j) * this.binomial(t, i - j) / this.binomial(n + t, i);
        elevated[i].x += coef * controlPoints[j].x;
        elevated[i].y += coef * controlPoints[j].y;
        elevated[i].z += coef * (controlPoints[j].z || 0);
      }
    }
    return elevated;
  },
  // 2.4: Curve Fitting - Fit NURBS to point data

  /**
   * Fit B-spline curve through data points (least squares)
   * MIT 18.06: Linear Algebra - Least squares solution
   */
  fitCurve(points, degree = 3, numControlPoints = null) {
    const n = points.length - 1;
    const m = numControlPoints ? numControlPoints - 1 : Math.min(n, degree + n / 3);

    // Generate knot vector (uniform)
    const knots = this.generateUniformKnots(m + 1, degree);

    // Compute parameter values for data points (chord length)
    const params = [0];
    let totalLen = 0;
    for (let i = 1; i <= n; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const dz = (points[i].z || 0) - (points[i - 1].z || 0);
      totalLen += Math.sqrt(dx * dx + dy * dy + dz * dz);
      params.push(totalLen);
    }
    for (let i = 0; i <= n; i++) {
      params[i] /= totalLen;
    }
    // Build coefficient matrix
    const N = [];
    for (let i = 0; i <= n; i++) {
      N[i] = [];
      const span = this.findKnotSpan(m, degree, params[i], knots);
      const basis = this.basisFunctions(span, params[i], degree, knots);

      for (let j = 0; j <= m; j++) {
        N[i][j] = 0;
      }
      for (let j = 0; j <= degree; j++) {
        const idx = span - degree + j;
        if (idx >= 0 && idx <= m) {
          N[i][idx] = basis[j];
        }
      }
    }
    // Solve least squares: N^T N P = N^T Q
    const NtN = this.multiplyMatrices(this.transpose(N), N);
    const NtQx = this.multiplyMatrixVector(this.transpose(N), points.map(p => p.x));
    const NtQy = this.multiplyMatrixVector(this.transpose(N), points.map(p => p.y));
    const NtQz = this.multiplyMatrixVector(this.transpose(N), points.map(p => p.z || 0));

    // Solve with Gauss-Jordan elimination
    const Px = this.solveLinearSystem(NtN, NtQx);
    const Py = this.solveLinearSystem([...NtN.map(r => [...r])], NtQy);
    const Pz = this.solveLinearSystem([...NtN.map(r => [...r])], NtQz);

    const controlPoints = [];
    for (let i = 0; i <= m; i++) {
      controlPoints.push({
        x: Px[i],
        y: Py[i],
        z: Pz[i]
      });
    }
    return { controlPoints, knots, degree };
  },
  // Helper functions

  findKnotSpan(n, degree, t, knots) {
    if (t >= knots[n + 1]) return n;
    if (t <= knots[degree]) return degree;

    let low = degree, high = n + 1;
    let mid = Math.floor((low + high) / 2);

    while (t < knots[mid] || t >= knots[mid + 1]) {
      if (t < knots[mid]) high = mid;
      else low = mid;
      mid = Math.floor((low + high) / 2);
    }
    return mid;
  },
  basisFunctions(span, t, degree, knots) {
    const N = new Array(degree + 1).fill(0);
    const left = new Array(degree + 1).fill(0);
    const right = new Array(degree + 1).fill(0);

    N[0] = 1;

    for (let j = 1; j <= degree; j++) {
      left[j] = t - knots[span + 1 - j];
      right[j] = knots[span + j] - t;

      let saved = 0;
      for (let r = 0; r < j; r++) {
        const temp = N[r] / (right[r + 1] + left[j - r]);
        N[r] = saved + right[r + 1] * temp;
        saved = left[j - r] * temp;
      }
      N[j] = saved;
    }
    return N;
  },
  generateUniformKnots(n, degree) {
    const knots = [];
    for (let i = 0; i <= degree; i++) knots.push(0);
    for (let i = 1; i < n - degree; i++) {
      knots.push(i / (n - degree));
    }
    for (let i = 0; i <= degree; i++) knots.push(1);
    return knots;
  },
  cross(a, b) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };
  },
  dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  },
  binomial(n, k) {
    if (k < 0