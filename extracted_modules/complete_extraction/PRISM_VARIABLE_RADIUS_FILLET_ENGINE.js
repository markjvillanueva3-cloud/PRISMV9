const PRISM_VARIABLE_RADIUS_FILLET_ENGINE = {
  version: '1.0.0',

  /**
   * Create variable radius fillet between blade root and hub
   */
  createBladeRootFillet(params) {
    const {
      blade,                    // Blade surface data
      hub,                      // Hub surface data
      radiusFunction = null,    // Function(span) => radius, or array of [span, radius] pairs
      radiusValues = null,      // Alternative: array of { span, radius } objects
      minRadius = 1.0,          // Minimum fillet radius (mm)
      maxRadius = 5.0,          // Maximum fillet radius (mm)
      leadingEdgeRadius = null, // Optional: different radius at LE
      trailingEdgeRadius = null,// Optional: different radius at TE
      blendContinuity = 'G2',   // G1 = tangent, G2 = curvature continuous
      divisions = 50            // Number of divisions along fillet
    } = params;

    // Build radius function if not provided
    const getRadius = this._buildRadiusFunction(radiusFunction, radiusValues, minRadius, maxRadius);

    // Build fillet surface
    const filletSurface = {
      type: 'VARIABLE_RADIUS_FILLET',
      sections: [],
      parameters: params
    };
    // Generate fillet cross-sections along blade root
    for (let i = 0; i <= divisions; i++) {
      const t = i / divisions;  // Parameter along blade root (0 = LE, 1 = TE)

      // Get radius at this position
      let radius = getRadius(t);

      // Apply LE/TE specific radii if provided
      if (leadingEdgeRadius !== null && t < 0.1) {
        const blend = t / 0.1;
        radius = leadingEdgeRadius * (1 - blend) + radius * blend;
      }
      if (trailingEdgeRadius !== null && t > 0.9) {
        const blend = (t - 0.9) / 0.1;
        radius = radius * (1 - blend) + trailingEdgeRadius * blend;
      }
      // Generate fillet cross-section at this position
      const section = this._generateFilletSection(blade, hub, t, radius, blendContinuity);
      filletSurface.sections.push(section);
    }
    // Create NURBS surface through fillet sections
    const nurbsSurface = this._createFilletNURBS(filletSurface.sections);

    return {
      success: true,
      surface: nurbsSurface,
      sections: filletSurface.sections,
      metadata: {
        radiusRange: [minRadius, maxRadius],
        continuity: blendContinuity,
        sectionCount: divisions + 1
      }
    };
  },
  /**
   * Build radius function from various input formats
   */
  _buildRadiusFunction(func, values, minR, maxR) {
    if (typeof func === 'function') {
      return func;
    }
    if (Array.isArray(values) && values.length > 0) {
      // Interpolate between provided radius values
      return (t) => {
        // Find bracketing values
        let low = values[0];
        let high = values[values.length - 1];

        for (let i = 0; i < values.length - 1; i++) {
          if (t >= values[i].span && t <= values[i + 1].span) {
            low = values[i];
            high = values[i + 1];
            break;
          }
        }
        // Linear interpolation
        const spanRange = high.span - low.span;
        if (spanRange < 1e-10) return low.radius;

        const blend = (t - low.span) / spanRange;
        return low.radius + blend * (high.radius - low.radius);
      };
    }
    // Default: linear variation from max at root to min at tip
    return (t) => {
      // Larger fillet at leading edge, smaller toward trailing edge
      const leBlend = Math.cos(t * Math.PI / 2);
      return minR + (maxR - minR) * leBlend;
    };
  },
  /**
   * Generate fillet cross-section at parameter t along blade root
   */
  _generateFilletSection(blade, hub, t, radius, continuity) {
    // Get blade root point at parameter t
    const bladeRootPoint = blade.surfaces?.pressure?.evaluate?.(t, 0) ||
                           { x: t, y: 0, z: 0 };

    // Get corresponding hub point
    const hubPoint = hub?.evaluate?.(t) || { x: t, y: 0, z: -radius };

    // Get tangent directions
    const bladeTangent = blade.surfaces?.pressure?.normal?.(t, 0) ||
                         { x: 0, y: 1, z: 0 };
    const hubNormal = { x: 0, y: 0, z: 1 };  // Hub typically has Z-up normal

    // Generate fillet arc points
    const arcPoints = [];
    const arcDivisions = 10;

    for (let i = 0; i <= arcDivisions; i++) {
      const angle = (Math.PI / 2) * (i / arcDivisions);  // 0 to 90 degrees

      // Fillet center
      const centerX = bladeRootPoint.x + radius * bladeTangent.x;
      const centerY = bladeRootPoint.y + radius * bladeTangent.y;
      const centerZ = hubPoint.z + radius;

      // Point on fillet arc
      const ptX = centerX - radius * Math.cos(angle) * bladeTangent.x;
      const ptY = centerY - radius * Math.cos(angle) * bladeTangent.y;
      const ptZ = centerZ - radius * Math.sin(angle);

      // Calculate tangent for continuity
      let tangent = { x: 0, y: 0, z: 0 };
      if (continuity === 'G2') {
        tangent = {
          x: Math.sin(angle) * bladeTangent.x,
          y: Math.sin(angle) * bladeTangent.y,
          z: -Math.cos(angle)
        };
      }
      arcPoints.push({
        x: ptX,
        y: ptY,
        z: ptZ,
        tangent,
        curvature: 1 / radius
      });
    }
    return {
      t,
      radius,
      bladePoint: bladeRootPoint,
      hubPoint,
      arcPoints,
      continuity
    };
  },
  /**
   * Create NURBS surface through fillet sections
   */
  _createFilletNURBS(sections) {
    if (sections.length < 2) {
      return null;
    }
    const controlPoints = [];

    sections.forEach(section => {
      const row = section.arcPoints.map(pt => ({
        x: pt.x,
        y: pt.y,
        z: pt.z
      }));
      controlPoints.push(row);
    });

    // Generate knot vectors
    const uKnots = this._generateUniformKnots(controlPoints[0].length, 3);
    const vKnots = this._generateUniformKnots(controlPoints.length, 3);

    return {
      type: 'VARIABLE_FILLET_NURBS',
      controlPoints,
      uKnots,
      vKnots,
      degreeU: 3,
      degreeV: 3,

      evaluate: (u, v) => this._evaluateFilletSurface(controlPoints, uKnots, vKnots, u, v),
      normal: (u, v) => this._filletSurfaceNormal(controlPoints, uKnots, vKnots, u, v)
    };
  },
  _generateUniformKnots(n, degree) {
    const m = n + degree + 1;
    const knots = [];
    for (let i = 0; i <= m; i++) {
      if (i <= degree) knots.push(0);
      else if (i >= m - degree) knots.push(1);
      else knots.push((i - degree) / (m - 2 * degree));
    }
    return knots;
  },
  _evaluateFilletSurface(controlPoints, uKnots, vKnots, u, v) {
    // Simplified bilinear interpolation for now
    const n = controlPoints.length;
    const m = controlPoints[0]?.length || 0;

    const vi = Math.min(Math.floor(v * (n - 1)), n - 2);
    const ui = Math.min(Math.floor(u * (m - 1)), m - 2);

    const vf = v * (n - 1) - vi;
    const uf = u * (m - 1) - ui;

    const p00 = controlPoints[vi][ui];
    const p01 = controlPoints[vi][ui + 1] || p00;
    const p10 = controlPoints[vi + 1]?.[ui] || p00;
    const p11 = controlPoints[vi + 1]?.[ui + 1] || p00;

    return {
      x: (1-vf) * ((1-uf) * p00.x + uf * p01.x) + vf * ((1-uf) * p10.x + uf * p11.x),
      y: (1-vf) * ((1-uf) * p00.y + uf * p01.y) + vf * ((1-uf) * p10.y + uf * p11.y),
      z: (1-vf) * ((1-uf) * p00.z + uf * p01.z) + vf * ((1-uf) * p10.z + uf * p11.z)
    };
  },
  _filletSurfaceNormal(controlPoints, uKnots, vKnots, u, v) {
    const delta = 0.01;
    const p = this._evaluateFilletSurface(controlPoints, uKnots, vKnots, u, v);
    const pu = this._evaluateFilletSurface(controlPoints, uKnots, vKnots, Math.min(u + delta, 1), v);
    const pv = this._evaluateFilletSurface(controlPoints, uKnots, vKnots, u, Math.min(v + delta, 1));

    const du = { x: pu.x - p.x, y: pu.y - p.y, z: pu.z - p.z };
    const dv = { x: pv.x - p.x, y: pv.y - p.y, z: pv.z - p.z };

    const n = {
      x: du.y * dv.z - du.z * dv.y,
      y: du.z * dv.x - du.x * dv.z,
      z: du.x * dv.y - du.y * dv.x
    };
    const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
    if (len > 1e-10) {
      n.x /= len;
      n.y /= len;
      n.z /= len;
    }
    return n;
  },
  /**
   * Create fillet between two arbitrary surfaces
   */
  createSurfaceToSurfaceFillet(params) {
    const {
      surface1,
      surface2,
      radiusFunction,
      contactCurve1,  // Parametric curve on surface1 defining contact
      contactCurve2,  // Parametric curve on surface2 defining contact
      divisions = 50
    } = params;

    // Similar implementation for general surface-to-surface fillets
    // Used for splitter-to-hub, shroud-to-blade, etc.

    return {
      type: 'SURFACE_TO_SURFACE_FILLET',
      // Implementation details...
    };
  }
}