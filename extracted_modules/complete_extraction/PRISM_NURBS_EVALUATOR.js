const PRISM_NURBS_EVALUATOR = {
  version: '1.0.0',
  courseBasis: 'Stanford CS 348A - Geometric Modeling',

  /**
   * Evaluate B-Spline curve at parameter t using De Boor's algorithm
   * MIT 18.06 basis: Matrix operations for basis functions
   */
  evaluateBSplineCurve(controlPoints, knots, degree, t) {
    const n = controlPoints.length - 1;

    // Find knot span (which segment we're in)
    let span = this.findSpan(n, degree, t, knots);

    // Calculate basis functions using De Boor's algorithm
    const basis = this.basisFunctions(span, t, degree, knots);

    // Evaluate point
    const point = { x: 0, y: 0, z: 0 };
    for (let i = 0; i <= degree; i++) {
      const cp = controlPoints[span - degree + i];
      point.x += basis[i] * cp.x;
      point.y += basis[i] * cp.y;
      point.z += basis[i] * (cp.z || 0);
    }
    return point;
  },
  /**
   * Evaluate NURBS curve (rational B-spline) at parameter t
   */
  evaluateNURBSCurve(controlPoints, weights, knots, degree, t) {
    const n = controlPoints.length - 1;
    const span = this.findSpan(n, degree, t, knots);
    const basis = this.basisFunctions(span, t, degree, knots);

    // Weighted sum
    let point = { x: 0, y: 0, z: 0 };
    let weightSum = 0;

    for (let i = 0; i <= degree; i++) {
      const idx = span - degree + i;
      const cp = controlPoints[idx];
      const w = weights ? weights[idx] : 1;
      const bw = basis[i] * w;

      point.x += bw * cp.x;
      point.y += bw * cp.y;
      point.z += bw * (cp.z || 0);
      weightSum += bw;
    }
    // Normalize
    if (Math.abs(weightSum) > 1e-10) {
      point.x /= weightSum;
      point.y /= weightSum;
      point.z /= weightSum;
    }
    return point;
  },
  /**
   * Evaluate B-Spline surface at parameters (u, v)
   */
  evaluateBSplineSurface(controlGrid, knotsU, knotsV, degreeU, degreeV, u, v) {
    const nu = controlGrid.length - 1;
    const nv = controlGrid[0].length - 1;

    const spanU = this.findSpan(nu, degreeU, u, knotsU);
    const spanV = this.findSpan(nv, degreeV, v, knotsV);

    const basisU = this.basisFunctions(spanU, u, degreeU, knotsU);
    const basisV = this.basisFunctions(spanV, v, degreeV, knotsV);

    const point = { x: 0, y: 0, z: 0 };

    for (let i = 0; i <= degreeU; i++) {
      for (let j = 0; j <= degreeV; j++) {
        const idxU = spanU - degreeU + i;
        const idxV = spanV - degreeV + j;
        const cp = controlGrid[idxU][idxV];
        const factor = basisU[i] * basisV[j];

        point.x += factor * cp.x;
        point.y += factor * cp.y;
        point.z += factor * (cp.z || 0);
      }
    }
    return point;
  },
  /**
   * Evaluate NURBS surface (rational B-spline surface)
   */
  evaluateNURBSSurface(controlGrid, weights, knotsU, knotsV, degreeU, degreeV, u, v) {
    const nu = controlGrid.length - 1;
    const nv = controlGrid[0].length - 1;

    const spanU = this.findSpan(nu, degreeU, u, knotsU);
    const spanV = this.findSpan(nv, degreeV, v, knotsV);

    const basisU = this.basisFunctions(spanU, u, degreeU, knotsU);
    const basisV = this.basisFunctions(spanV, v, degreeV, knotsV);

    let point = { x: 0, y: 0, z: 0 };
    let weightSum = 0;

    for (let i = 0; i <= degreeU; i++) {
      for (let j = 0; j <= degreeV; j++) {
        const idxU = spanU - degreeU + i;
        const idxV = spanV - degreeV + j;
        const cp = controlGrid[idxU][idxV];
        const w = weights ? weights[idxU][idxV] : 1;
        const factor = basisU[i] * basisV[j] * w;

        point.x += factor * cp.x;
        point.y += factor * cp.y;
        point.z += factor * (cp.z || 0);
        weightSum += factor;
      }
    }
    if (Math.abs(weightSum) > 1e-10) {
      point.x /= weightSum;
      point.y /= weightSum;
      point.z /= weightSum;
    }
    return point;
  },
  /**
   * Calculate surface normal at (u, v) using partial derivatives
   * MIT 18.02: Multivariable Calculus - Cross product of partials
   */
  surfaceNormal(controlGrid, weights, knotsU, knotsV, degreeU, degreeV, u, v) {
    const eps = 1e-6;

    // Central differences for partial derivatives
    const p00 = this.evaluateNURBSSurface(controlGrid, weights, knotsU, knotsV, degreeU, degreeV, u, v);
    const pU1 = this.evaluateNURBSSurface(controlGrid, weights, knotsU, knotsV, degreeU, degreeV, Math.min(u + eps, 1), v);
    const pU0 = this.evaluateNURBSSurface(controlGrid, weights, knotsU, knotsV, degreeU, degreeV, Math.max(u - eps, 0), v);
    const pV1 = this.evaluateNURBSSurface(controlGrid, weights, knotsU, knotsV, degreeU, degreeV, u, Math.min(v + eps, 1));
    const pV0 = this.evaluateNURBSSurface(controlGrid, weights, knotsU, knotsV, degreeU, degreeV, u, Math.max(v - eps, 0));

    // Partial derivatives
    const dU = {
      x: (pU1.x - pU0.x) / (2 * eps),
      y: (pU1.y - pU0.y) / (2 * eps),
      z: (pU1.z - pU0.z) / (2 * eps)
    };
    const dV = {
      x: (pV1.x - pV0.x) / (2 * eps),
      y: (pV1.y - pV0.y) / (2 * eps),
      z: (pV1.z - pV0.z) / (2 * eps)
    };
    // Cross product: N = dU × dV
    const normal = {
      x: dU.y * dV.z - dU.z * dV.y,
      y: dU.z * dV.x - dU.x * dV.z,
      z: dU.x * dV.y - dU.y * dV.x
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
  /**
   * Find knot span index using binary search (MIT 6.006)
   */
  findSpan(n, degree, t, knots) {
    // Special cases
    if (t >= knots[n + 1]) return n;
    if (t <= knots[degree]) return degree;

    // Binary search
    let low = degree;
    let high = n + 1;
    let mid = Math.floor((low + high) / 2);

    while (t < knots[mid] || t >= knots[mid + 1]) {
      if (t < knots[mid]) {
        high = mid;
      } else {
        low = mid;
      }
      mid = Math.floor((low + high) / 2);
    }
    return mid;
  },
  /**
   * Calculate B-spline basis functions using Cox-de Boor recursion
   */
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
  /**
   * Sample curve uniformly for rendering
   */
  sampleCurve(controlPoints, weights, knots, degree, numSamples = 50) {
    const points = [];
    const hasWeights = weights && weights.length === controlPoints.length;

    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      const point = hasWeights ?
        this.evaluateNURBSCurve(controlPoints, weights, knots, degree, t) :
        this.evaluateBSplineCurve(controlPoints, knots, degree, t);
      points.push(point);
    }
    return points;
  },
  /**
   * Tessellate surface into triangles for rendering
   * Adaptive subdivision based on curvature (Stanford CS 348A)
   */
  tessellateSurface(controlGrid, weights, knotsU, knotsV, degreeU, degreeV, options = {}) {
    const {
      resolution = 20,         // Base resolution
      adaptive = true,         // Use adaptive subdivision
      maxDepth = 4,           // Max subdivision depth
      flatnessTolerance = 0.01 // Tolerance for flatness test
    } = options;

    const vertices = [];
    const normals = [];
    const triangles = [];

    if (adaptive) {
      // Adaptive tessellation using recursive subdivision
      this._adaptiveTessellate(
        controlGrid, weights, knotsU, knotsV, degreeU, degreeV,
        0, 1, 0, 1, 0, maxDepth, flatnessTolerance,
        vertices, normals, triangles
      );
    } else {
      // Uniform grid tessellation
      for (let i = 0; i <= resolution; i++) {
        for (let j = 0; j <= resolution; j++) {
          const u = i / resolution;
          const v = j / resolution;

          const point = this.evaluateNURBSSurface(
            controlGrid, weights, knotsU, knotsV, degreeU, degreeV, u, v
          );
          const normal = this.surfaceNormal(
            controlGrid, weights, knotsU, knotsV, degreeU, degreeV, u, v
          );

          vertices.push(point);
          normals.push(normal);
        }
      }
      // Generate triangles
      for (let i = 0; i < resolution; i++) {
        for (let j = 0; j < resolution; j++) {
          const idx = i * (resolution + 1) + j;

          // Two triangles per quad
          triangles.push([idx, idx + 1, idx + resolution + 1]);
          triangles.push([idx + 1, idx + resolution + 2, idx + resolution + 1]);
        }
      }
    }
    return { vertices, normals, triangles };
  },
  /**
   * Adaptive tessellation with flatness test
   */
  _adaptiveTessellate(grid, weights, kU, kV, dU, dV, u0, u1, v0, v1, depth, maxDepth, tol, verts, norms, tris) {
    const uMid = (u0 + u1) / 2;
    const vMid = (v0 + v1) / 2;

    // Evaluate corners and midpoints
    const p00 = this.evaluateNURBSSurface(grid, weights, kU, kV, dU, dV, u0, v0);
    const p10 = this.evaluateNURBSSurface(grid, weights, kU, kV, dU, dV, u1, v0);
    const p01 = this.evaluateNURBSSurface(grid, weights, kU, kV, dU, dV, u0, v1);
    const p11 = this.evaluateNURBSSurface(grid, weights, kU, kV, dU, dV, u1, v1);
    const pMid = this.evaluateNURBSSurface(grid, weights, kU, kV, dU, dV, uMid, vMid);

    // Flatness test: check if midpoint is close to bilinear interpolation
    const pInterp = {
      x: (p00.x + p10.x + p01.x + p11.x) / 4,
      y: (p00.y + p10.y + p01.y + p11.y) / 4,
      z: (p00.z + p10.z + p01.z + p11.z) / 4
    };
    const dist = Math.sqrt(
      (pMid.x - pInterp.x) ** 2 +
      (pMid.y - pInterp.y) ** 2 +
      (pMid.z - pInterp.z) ** 2
    );

    if (depth >= maxDepth || dist < tol) {
      // Emit triangles
      const baseIdx = verts.length;

      verts.push(p00, p10, p01, p11);

      // Calculate normals
      const n00 = this.surfaceNormal(grid, weights, kU, kV, dU, dV, u0, v0);
      const n10 = this.surfaceNormal(grid, weights, kU, kV, dU, dV, u1, v0);
      const n01 = this.surfaceNormal(grid, weights, kU, kV, dU, dV, u0, v1);
      const n11 = this.surfaceNormal(grid, weights, kU, kV, dU, dV, u1, v1);

      norms.push(n00, n10, n01, n11);

      // Two triangles
      tris.push([baseIdx, baseIdx + 1, baseIdx + 2]);
      tris.push([baseIdx + 1, baseIdx + 3, baseIdx + 2]);
    } else {
      // Subdivide into 4 quads
      this._adaptiveTessellate(grid, weights, kU, kV, dU, dV, u0, uMid, v0, vMid, depth + 1, maxDepth, tol, verts, norms, tris);
      this._adaptiveTessellate(grid, weights, kU, kV, dU, dV, uMid, u1, v0, vMid, depth + 1, maxDepth, tol, verts, norms, tris);
      this._adaptiveTessellate(grid, weights, kU, kV, dU, dV, u0, uMid, vMid, v1, depth + 1, maxDepth, tol, verts, norms, tris);
      this._adaptiveTessellate(grid, weights, kU, kV, dU, dV, uMid, u1, vMid, v1, depth + 1, maxDepth, tol, verts, norms, tris);
    }
  }
}