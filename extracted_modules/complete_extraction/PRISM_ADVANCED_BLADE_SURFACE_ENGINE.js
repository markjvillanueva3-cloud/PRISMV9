const PRISM_ADVANCED_BLADE_SURFACE_ENGINE = {
  version: '1.0.0',

  /**
   * Generate blade surface as proper NURBS through airfoil sections
   * This replaces the simplified point-based blade surface generation
   */
  generateBladeSurface(params) {
    const {
      airfoilSections = [],        // Array of airfoil section profiles at different spans
      spanPositions = [],          // Span positions [0-1] for each section
      surfaceDegreeU = 3,          // NURBS degree in spanwise direction
      surfaceDegreeV = 5,          // NURBS degree in chordwise direction
      continuity = 'G2',           // Desired surface continuity
      side = 'both'                // 'pressure', 'suction', or 'both'
    } = params;

    if (airfoilSections.length < 2) {
      return { success: false, error: 'Minimum 2 airfoil sections required' };
    }
    // Ensure consistent point count on all sections
    const normalizedSections = this._normalizeSectionPointCount(airfoilSections);

    // Build control point grid for NURBS surface
    const controlPointGrid = this._buildControlPointGrid(normalizedSections, spanPositions);

    // Generate knot vectors for smooth interpolation
    const knotsU = this._generateChordKnots(normalizedSections[0].points.length, surfaceDegreeV);
    const knotsV = this._generateSpanKnots(spanPositions, surfaceDegreeU, continuity);

    // Calculate weights for rational NURBS (important for airfoils)
    const weights = this._calculateAirfoilWeights(controlPointGrid, normalizedSections);

    const surfaces = {};

    if (side === 'both' || side === 'pressure') {
      surfaces.pressure = {
        type: 'NURBS_BLADE_SURFACE',
        side: 'pressure',
        controlPoints: controlPointGrid.pressure,
        knotsU,
        knotsV,
        weights: weights.pressure,
        degreeU: surfaceDegreeV,
        degreeV: surfaceDegreeU,
        continuity,

        // Evaluation methods
        evaluate: (u, v) => this._evaluateBladeSurface(controlPointGrid.pressure, knotsU, knotsV, weights.pressure, surfaceDegreeV, surfaceDegreeU, u, v),
        normal: (u, v) => this._bladeSurfaceNormal(controlPointGrid.pressure, knotsU, knotsV, weights.pressure, surfaceDegreeV, surfaceDegreeU, u, v),
        curvature: (u, v) => this._bladeSurfaceCurvature(controlPointGrid.pressure, knotsU, knotsV, weights.pressure, surfaceDegreeV, surfaceDegreeU, u, v),

        // Tessellation for visualization
        tessellate: (uDiv = 40, vDiv = 20) => this._tessellateBladeSurface(controlPointGrid.pressure, knotsU, knotsV, weights.pressure, surfaceDegreeV, surfaceDegreeU, uDiv, vDiv)
      };
    }
    if (side === 'both' || side === 'suction') {
      surfaces.suction = {
        type: 'NURBS_BLADE_SURFACE',
        side: 'suction',
        controlPoints: controlPointGrid.suction,
        knotsU,
        knotsV,
        weights: weights.suction,
        degreeU: surfaceDegreeV,
        degreeV: surfaceDegreeU,
        continuity,

        evaluate: (u, v) => this._evaluateBladeSurface(controlPointGrid.suction, knotsU, knotsV, weights.suction, surfaceDegreeV, surfaceDegreeU, u, v),
        normal: (u, v) => this._bladeSurfaceNormal(controlPointGrid.suction, knotsU, knotsV, weights.suction, surfaceDegreeV, surfaceDegreeU, u, v),
        curvature: (u, v) => this._bladeSurfaceCurvature(controlPointGrid.suction, knotsU, knotsV, weights.suction, surfaceDegreeV, surfaceDegreeU, u, v),
        tessellate: (uDiv = 40, vDiv = 20) => this._tessellateBladeSurface(controlPointGrid.suction, knotsU, knotsV, weights.suction, surfaceDegreeV, surfaceDegreeU, uDiv, vDiv)
      };
    }
    // Generate leading and trailing edge curves
    surfaces.leadingEdge = this._generateEdgeCurve(normalizedSections, 'leading', spanPositions);
    surfaces.trailingEdge = this._generateEdgeCurve(normalizedSections, 'trailing', spanPositions);

    return {
      success: true,
      surfaces,
      metadata: {
        sectionCount: airfoilSections.length,
        pointsPerSection: normalizedSections[0].points.length,
        continuity,
        spanRange: [Math.min(...spanPositions), Math.max(...spanPositions)]
      }
    };
  },
  /**
   * Normalize all sections to same point count for surface interpolation
   */
  _normalizeSectionPointCount(sections, targetCount = 101) {
    return sections.map(section => {
      const originalPoints = section.points || section.upperSurface?.concat(section.lowerSurface?.reverse()) || [];

      if (originalPoints.length === targetCount) {
        return { ...section, points: originalPoints };
      }
      // Resample using arc-length parameterization
      const resampled = this._resampleCurveByArcLength(originalPoints, targetCount);
      return { ...section, points: resampled };
    });
  },
  /**
   * Resample curve points using arc-length parameterization for uniform distribution
   */
  _resampleCurveByArcLength(points, targetCount) {
    // Calculate cumulative arc lengths
    const arcLengths = [0];
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i-1].x;
      const dy = points[i].y - points[i-1].y;
      const dz = (points[i].z || 0) - (points[i-1].z || 0);
      arcLengths.push(arcLengths[i-1] + Math.sqrt(dx*dx + dy*dy + dz*dz));
    }
    const totalLength = arcLengths[arcLengths.length - 1];
    const resampled = [];

    for (let i = 0; i < targetCount; i++) {
      const targetArc = (i / (targetCount - 1)) * totalLength;

      // Find segment containing target arc length
      let j = 0;
      while (j < arcLengths.length - 1 && arcLengths[j+1] < targetArc) j++;

      // Interpolate within segment
      const segmentStart = arcLengths[j];
      const segmentEnd = arcLengths[j+1] || segmentStart;
      const t = segmentEnd > segmentStart ? (targetArc - segmentStart) / (segmentEnd - segmentStart) : 0;

      const p1 = points[j];
      const p2 = points[j+1] || p1;

      resampled.push({
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y),
        z: (p1.z || 0) + t * ((p2.z || 0) - (p1.z || 0))
      });
    }
    return resampled;
  },
  /**
   * Build NURBS control point grid from airfoil sections
   */
  _buildControlPointGrid(sections, spanPositions) {
    const pressure = [];
    const suction = [];

    const halfPointCount = Math.floor(sections[0].points.length / 2);

    sections.forEach((section, sIdx) => {
      const pressureRow = [];
      const suctionRow = [];
      const span = spanPositions[sIdx];

      // Split airfoil into pressure (lower) and suction (upper) sides
      for (let i = 0; i <= halfPointCount; i++) {
        const upperIdx = i;
        const lowerIdx = sections[0].points.length - 1 - i;

        // Transform to blade coordinate system (apply span position, twist, lean)
        const twist = section.twist || 0;
        const lean = section.lean || 0;
        const radius = section.radius || 1;

        const transformPoint = (pt) => {
          const twistRad = twist * Math.PI / 180;
          const leanRad = lean * Math.PI / 180;

          // Apply twist around blade axis
          const xTwisted = pt.x * Math.cos(twistRad) - pt.y * Math.sin(twistRad);
          const yTwisted = pt.x * Math.sin(twistRad) + pt.y * Math.cos(twistRad);

          // Position at radius with lean
          return {
            x: radius * Math.cos(leanRad) + xTwisted,
            y: radius * Math.sin(leanRad) + yTwisted,
            z: span * (section.bladeHeight || 1),
            u: i / halfPointCount,
            v: span
          };
        };
        if (section.points[upperIdx]) {
          suctionRow.push(transformPoint(section.points[upperIdx]));
        }
        if (section.points[lowerIdx]) {
          pressureRow.push(transformPoint(section.points[lowerIdx]));
        }
      }
      pressure.push(pressureRow);
      suction.push(suctionRow);
    });

    return { pressure, suction };
  },
  /**
   * Generate knot vector for chordwise (U) direction
   */
  _generateChordKnots(pointCount, degree) {
    const n = pointCount - 1;
    const m = n + degree + 1;
    const knots = [];

    // Clamped knot vector with interior knots for C2 continuity
    for (let i = 0; i <= m; i++) {
      if (i <= degree) {
        knots.push(0);
      } else if (i >= m - degree) {
        knots.push(1);
      } else {
        // Chord-length parameterization for interior knots
        knots.push((i - degree) / (m - 2 * degree));
      }
    }
    return knots;
  },
  /**
   * Generate knot vector for spanwise (V) direction with continuity control
   */
  _generateSpanKnots(spanPositions, degree, continuity) {
    const n = spanPositions.length - 1;
    const m = n + degree + 1;
    const knots = [];

    // Clamped ends
    for (let i = 0; i <= degree; i++) {
      knots.push(spanPositions[0]);
    }
    // Interior knots based on span positions
    if (continuity === 'G2' || continuity === 'C2') {
      // Smooth interpolation through all sections
      for (let i = 1; i < spanPositions.length - 1; i++) {
        knots.push(spanPositions[i]);
      }
    } else {
      // Uniform interior knots
      for (let i = 1; i < n - degree + 1; i++) {
        knots.push(spanPositions[0] + i * (spanPositions[n] - spanPositions[0]) / (n - degree + 1));
      }
    }
    // Clamped end
    for (let i = 0; i <= degree; i++) {
      knots.push(spanPositions[spanPositions.length - 1]);
    }
    return knots;
  },
  /**
   * Calculate weights for rational NURBS - important for accurate airfoil representation
   */
  _calculateAirfoilWeights(controlPointGrid, sections) {
    const pressureWeights = [];
    const suctionWeights = [];

    controlPointGrid.pressure.forEach((row, spanIdx) => {
      const section = sections[spanIdx];
      const rowWeights = [];

      row.forEach((pt, chordIdx) => {
        // Higher weights near leading edge for better curvature control
        const leWeight = chordIdx < row.length * 0.1 ? 1.2 : 1.0;
        // Higher weights at root for blending with hub
        const rootWeight = spanIdx === 0 ? 1.1 : 1.0;

        rowWeights.push(leWeight * rootWeight);
      });

      pressureWeights.push(rowWeights);
    });

    // Suction side typically needs similar weighting
    controlPointGrid.suction.forEach((row, spanIdx) => {
      const rowWeights = row.map((pt, chordIdx) => {
        const leWeight = chordIdx < row.length * 0.1 ? 1.2 : 1.0;
        const rootWeight = spanIdx === 0 ? 1.1 : 1.0;
        return leWeight * rootWeight;
      });
      suctionWeights.push(rowWeights);
    });

    return { pressure: pressureWeights, suction: suctionWeights };
  },
  /**
   * Evaluate point on blade NURBS surface
   */
  _evaluateBladeSurface(controlPoints, knotsU, knotsV, weights, degreeU, degreeV, u, v) {
    const n = controlPoints.length;        // spanwise control points
    const m = controlPoints[0]?.length || 0;  // chordwise control points

    if (n === 0 || m === 0) return { x: 0, y: 0, z: 0 };

    // Evaluate using de Boor algorithm
    let numerator = { x: 0, y: 0, z: 0 };
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      const basisV = this._basisFunction(i, degreeV, v, knotsV);
      if (basisV === 0) continue;

      for (let j = 0; j < m; j++) {
        const basisU = this._basisFunction(j, degreeU, u, knotsU);
        if (basisU === 0) continue;

        const w = weights[i]?.[j] || 1.0;
        const factor = basisU * basisV * w;

        const cp = controlPoints[i][j];
        numerator.x += cp.x * factor;
        numerator.y += cp.y * factor;
        numerator.z += cp.z * factor;
        denominator += factor;
      }
    }
    if (denominator === 0) return { x: 0, y: 0, z: 0 };

    return {
      x: numerator.x / denominator,
      y: numerator.y / denominator,
      z: numerator.z / denominator,
      u,
      v
    };
  },
  /**
   * Cox-de Boor recursion for B-spline basis function
   */
  _basisFunction(i, p, t, knots) {
    if (p === 0) {
      return (t >= knots[i] && t < knots[i + 1]) ? 1.0 : 0.0;
    }
    const denom1 = knots[i + p] - knots[i];
    const denom2 = knots[i + p + 1] - knots[i + 1];

    let term1 = 0, term2 = 0;

    if (denom1 > 1e-10) {
      term1 = ((t - knots[i]) / denom1) * this._basisFunction(i, p - 1, t, knots);
    }
    if (denom2 > 1e-10) {
      term2 = ((knots[i + p + 1] - t) / denom2) * this._basisFunction(i + 1, p - 1, t, knots);
    }
    return term1 + term2;
  },
  /**
   * Calculate surface normal at (u, v)
   */
  _bladeSurfaceNormal(controlPoints, knotsU, knotsV, weights, degreeU, degreeV, u, v) {
    const delta = 0.001;

    const p = this._evaluateBladeSurface(controlPoints, knotsU, knotsV, weights, degreeU, degreeV, u, v);
    const pu = this._evaluateBladeSurface(controlPoints, knotsU, knotsV, weights, degreeU, degreeV, Math.min(u + delta, 1), v);
    const pv = this._evaluateBladeSurface(controlPoints, knotsU, knotsV, weights, degreeU, degreeV, u, Math.min(v + delta, 1));

    // Tangent vectors
    const du = { x: (pu.x - p.x) / delta, y: (pu.y - p.y) / delta, z: (pu.z - p.z) / delta };
    const dv = { x: (pv.x - p.x) / delta, y: (pv.y - p.y) / delta, z: (pv.z - p.z) / delta };

    // Cross product for normal
    const normal = {
      x: du.y * dv.z - du.z * dv.y,
      y: du.z * dv.x - du.x * dv.z,
      z: du.x * dv.y - du.y * dv.x
    };
    // Normalize
    const len = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
    if (len > 1e-10) {
      normal.x /= len;
      normal.y /= len;
      normal.z /= len;
    }
    return normal;
  },
  /**
   * Calculate principal curvatures at (u, v)
   */
  _bladeSurfaceCurvature(controlPoints, knotsU, knotsV, weights, degreeU, degreeV, u, v) {
    const delta = 0.001;

    // Get normal at center and nearby points
    const n0 = this._bladeSurfaceNormal(controlPoints, knotsU, knotsV, weights, degreeU, degreeV, u, v);
    const nU = this._bladeSurfaceNormal(controlPoints, knotsU, knotsV, weights, degreeU, degreeV, Math.min(u + delta, 1), v);
    const nV = this._bladeSurfaceNormal(controlPoints, knotsU, knotsV, weights, degreeU, degreeV, u, Math.min(v + delta, 1));

    // Approximate curvatures from normal variation
    const kU = Math.sqrt(Math.pow(nU.x - n0.x, 2) + Math.pow(nU.y - n0.y, 2) + Math.pow(nU.z - n0.z, 2)) / delta;
    const kV = Math.sqrt(Math.pow(nV.x - n0.x, 2) + Math.pow(nV.y - n0.y, 2) + Math.pow(nV.z - n0.z, 2)) / delta;

    return {
      kMin: Math.min(kU, kV),
      kMax: Math.max(kU, kV),
      gaussian: kU * kV,
      mean: (kU + kV) / 2
    };
  },
  /**
   * Generate leading or trailing edge curve
   */
  _generateEdgeCurve(sections, edge, spanPositions) {
    const points = sections.map((section, idx) => {
      const span = spanPositions[idx];
      const edgePoint = edge === 'leading' ? section.points[0] : section.points[Math.floor(section.points.length / 2)];

      return {
        x: edgePoint.x,
        y: edgePoint.y,
        z: span * (section.bladeHeight || 1),
        span
      };
    });

    return {
      type: 'EDGE_CURVE',
      edge,
      points,

      // Interpolate along edge
      evaluate: (t) => {
        const idx = t * (points.length - 1);
        const i = Math.floor(idx);
        const frac = idx - i;

        if (i >= points.length - 1) return points[points.length - 1];

        return {
          x: points[i].x + frac * (points[i+1].x - points[i].x),
          y: points[i].y + frac * (points[i+1].y - points[i].y),
          z: points[i].z + frac * (points[i+1].z - points[i].z)
        };
      }
    };
  },
  /**
   * Tessellate blade surface for visualization
   */
  _tessellateBladeSurface(controlPoints, knotsU, knotsV, weights, degreeU, degreeV, uDiv, vDiv) {
    const vertices = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    // Generate grid of points
    for (let j = 0; j <= vDiv; j++) {
      const v = j / vDiv;
      for (let i = 0; i <= uDiv; i++) {
        const u = i / uDiv;

        const pt = this._evaluateBladeSurface(controlPoints, knotsU, knotsV, weights, degreeU, degreeV, u, v);
        const n = this._bladeSurfaceNormal(controlPoints, knotsU, knotsV, weights, degreeU, degreeV, u, v);

        vertices.push(pt.x, pt.y, pt.z);
        normals.push(n.x, n.y, n.z);
        uvs.push(u, v);
      }
    }
    // Generate triangles
    for (let j = 0; j < vDiv; j++) {
      for (let i = 0; i < uDiv; i++) {
        const a = j * (uDiv + 1) + i;
        const b = a + 1;
        const c = a + (uDiv + 1);
        const d = c + 1;

        // Two triangles per quad
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }
    return {
      vertices: new Float32Array(vertices),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint32Array(indices),
      vertexCount: vertices.length / 3,
      triangleCount: indices.length / 3
    };
  }
}