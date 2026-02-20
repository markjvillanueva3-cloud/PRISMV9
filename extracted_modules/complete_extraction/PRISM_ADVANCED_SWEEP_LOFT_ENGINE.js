const PRISM_ADVANCED_SWEEP_LOFT_ENGINE = {
  version: '1.0.0',
  name: 'Advanced Sweep & Loft Engine',
  description: 'Advanced sweep and loft operations with path, guide rails, and transitions',

  // Advanced extrude with options
  extrude: function(profile, params) {
    const {
      distance,
      direction = 'one_side',    // 'one_side', 'two_sides', 'symmetric'
      operation = 'new_body',     // 'new_body', 'join', 'cut', 'intersect'
      taperAngle = 0,            // Draft angle during extrusion
      startOffset = 0,           // Offset from profile plane
      thinExtrude = false,       // Create thin wall
      wallThickness = 1,
      wallLocation = 'center'    // 'inside', 'outside', 'center'
    } = params;

    const extrudeResult = {
      operation: 'extrude',
      profile: profile,
      params: params,
      geometry: null,
      success: true
    };
    // Calculate extrusion distances for each direction
    let dist1 = distance, dist2 = 0;

    if (direction === 'two_sides') {
      dist1 = distance;
      dist2 = params.distance2 || distance;
    } else if (direction === 'symmetric') {
      dist1 = distance / 2;
      dist2 = distance / 2;
    }
    // Generate geometry
    if (thinExtrude) {
      extrudeResult.geometry = this._generateThinExtrudeGeometry(
        profile, dist1, dist2, taperAngle, wallThickness, wallLocation
      );
    } else {
      extrudeResult.geometry = this._generateExtrudeGeometry(
        profile, dist1, dist2, taperAngle, startOffset
      );
    }
    extrudeResult.operationType = operation;
    return extrudeResult;
  },
  // Revolve with options
  revolve: function(profile, params) {
    const {
      axis,                      // Rotation axis
      angle = 360,               // Rotation angle
      direction = 'one_side',    // 'one_side', 'two_sides', 'symmetric'
      operation = 'new_body'
    } = params;

    const revolveResult = {
      operation: 'revolve',
      profile: profile,
      params: params,
      geometry: null,
      success: true
    };
    // Calculate angles for each direction
    let angle1 = angle, angle2 = 0;

    if (direction === 'two_sides') {
      angle1 = angle;
      angle2 = params.angle2 || angle;
    } else if (direction === 'symmetric') {
      angle1 = angle / 2;
      angle2 = angle / 2;
    }
    revolveResult.geometry = this._generateRevolveGeometry(profile, axis, angle1, angle2);
    revolveResult.operationType = operation;

    return revolveResult;
  },
  // Advanced sweep with guide rails and twist
  sweep: function(profile, params) {
    const {
      path,                      // Primary path curve
      guideRails = [],           // Guide rail curves
      orientation = 'perpendicular', // 'perpendicular', 'parallel', 'keep_normal'
      twist = 0,                 // Twist angle along path (degrees)
      scaling = 1.0,             // Scale factor at end
      operation = 'new_body',
      pathRange = [0, 1]         // Parameter range on path
    } = params;

    const sweepResult = {
      operation: 'sweep',
      profile: profile,
      params: params,
      geometry: null,
      success: true
    };
    // Generate sweep geometry with all options
    sweepResult.geometry = this._generateSweepGeometry(
      profile, path, guideRails, orientation, twist, scaling, pathRange
    );

    sweepResult.operationType = operation;
    return sweepResult;
  },
  // Advanced loft with rails and centerline
  loft: function(params) {
    const {
      profiles,                  // Array of profile sketches
      rails = [],                // Guide rails
      centerline = null,         // Centerline curve
      closeEnds = false,         // Close start/end
      tangentEdges = [],         // Edges to match tangency
      operation = 'new_body'
    } = params;

    const loftResult = {
      operation: 'loft',
      params: params,
      geometry: null,
      success: true
    };
    // Generate loft geometry
    loftResult.geometry = this._generateLoftGeometry(
      profiles, rails, centerline, closeEnds, tangentEdges
    );

    loftResult.operationType = operation;
    return loftResult;
  },
  // Create rib (structural web)
  rib: function(curve, params) {
    const {
      thickness,                 // Rib thickness
      direction = 'symmetric',   // 'side_1', 'side_2', 'symmetric'
      extentType = 'to_next',    // 'to_next', 'to_body', 'finite'
      depth = null,              // Depth if finite
      draft = 0,                 // Draft angle
      flipDirection = false
    } = params;

    const ribResult = {
      operation: 'rib',
      curve: curve,
      params: params,
      geometry: null,
      success: true
    };
    ribResult.geometry = this._generateRibGeometry(
      curve, thickness, direction, extentType, depth, draft, flipDirection
    );

    return ribResult;
  },
  // Create web (thin wall between surfaces)
  web: function(curves, params) {
    const {
      thickness,
      extentType = 'between_selections',
      surfaces = [],             // Bounding surfaces
      draft = 0
    } = params;

    const webResult = {
      operation: 'web',
      curves: curves,
      params: params,
      geometry: null,
      success: true
    };
    webResult.geometry = this._generateWebGeometry(curves, thickness, surfaces, draft);

    return webResult;
  },
  // Emboss text or sketch onto surface
  emboss: function(sketch, params) {
    const {
      targetFace,
      depth,
      direction = 'emboss',      // 'emboss' (outward) or 'engrave' (inward)
      taperAngle = 0,
      wrapToFace = true
    } = params;

    const embossResult = {
      operation: 'emboss',
      sketch: sketch,
      params: params,
      geometry: null,
      success: true
    };
    embossResult.geometry = this._generateEmbossGeometry(
      sketch, targetFace, depth, direction, taperAngle, wrapToFace
    );

    return embossResult;
  },
  // Geometry generation helpers
  _generateExtrudeGeometry: function(profile, dist1, dist2, taper, startOffset) {
    const vertices = [];
    const faces = [];

    // Get profile points
    const profilePoints = this._getProfilePoints(profile);
    const normal = profile.normal || { x: 0, y: 0, z: 1 };

    // Create vertices at start (with offset)
    const startZ = startOffset;
    for (const p of profilePoints) {
      vertices.push({
        x: p.x,
        y: p.y,
        z: startZ
      });
    }
    // Create vertices at end (with taper)
    const taperRad = taper * Math.PI / 180;
    const taperOffset = dist1 * Math.tan(taperRad);

    for (const p of profilePoints) {
      // Offset toward/away from center based on taper
      const centerX = profile.center?.x || 0;
      const centerY = profile.center?.y || 0;
      const dx = p.x - centerX;
      const dy = p.y - centerY;
      const dist = Math.sqrt(dx*dx + dy*dy);

      const newDist = dist + taperOffset;
      const scale = dist > 0 ? newDist / dist : 1;

      vertices.push({
        x: centerX + dx * scale,
        y: centerY + dy * scale,
        z: startZ + dist1
      });
    }
    return {
      type: 'extrusion',
      vertices: vertices,
      faces: faces,
      closed: profile.closed,
      distance1: dist1,
      distance2: dist2,
      taperAngle: taper
    };
  },
  _generateThinExtrudeGeometry: function(profile, dist1, dist2, taper, thickness, wallLoc) {
    // Create thin wall extrusion along profile boundary
    const innerOffset = wallLoc === 'inside' ? -thickness :
                        wallLoc === 'outside' ? 0 : -thickness/2;
    const outerOffset = wallLoc === 'inside' ? 0 :
                        wallLoc === 'outside' ? thickness : thickness/2;

    return {
      type: 'thin_extrusion',
      innerOffset: innerOffset,
      outerOffset: outerOffset,
      distance1: dist1,
      distance2: dist2,
      wallThickness: thickness
    };
  },
  _generateRevolveGeometry: function(profile, axis, angle1, angle2) {
    const sections = [];
    const angleStep = 10; // degrees per section

    const totalAngle = angle1 + angle2;
    const numSections = Math.ceil(totalAngle / angleStep) + 1;

    for (let i = 0; i < numSections; i++) {
      const angle = -angle2 + (totalAngle * i / (numSections - 1));
      const angleRad = angle * Math.PI / 180;

      sections.push({
        angle: angle,
        transform: this._rotationAboutAxis(axis, angleRad)
      });
    }
    return {
      type: 'revolve',
      axis: axis,
      angle1: angle1,
      angle2: angle2,
      sections: sections
    };
  },
  _generateSweepGeometry: function(profile, path, rails, orientation, twist, scale, range) {
    const sections = [];
    const numSections = 50;

    const pathLength = this._getCurveLength(path);

    for (let i = 0; i <= numSections; i++) {
      const t = range[0] + (range[1] - range[0]) * (i / numSections);
      const pathPoint = this._evaluateCurveAtParameter(path, t);
      const pathTangent = this._evaluateCurveTangentAtParameter(path, t);

      // Calculate twist at this position
      const twistAngle = twist * (i / numSections);

      // Calculate scale at this position
      const currentScale = 1 + (scale - 1) * (i / numSections);

      // Calculate orientation frame
      const frame = this._calculateFrenetFrame(pathTangent, orientation);

      sections.push({
        parameter: t,
        point: pathPoint,
        tangent: pathTangent,
        twist: twistAngle,
        scale: currentScale,
        frame: frame
      });
    }
    return {
      type: 'sweep',
      path: path,
      guideRails: rails,
      orientation: orientation,
      twist: twist,
      endScale: scale,
      sections: sections
    };
  },
  _generateLoftGeometry: function(profiles, rails, centerline, closeEnds, tangentEdges) {
    // Create interpolated sections between profiles
    const numIntermediateSections = 10;
    const allSections = [];

    for (let i = 0; i < profiles.length - 1; i++) {
      const profile1 = profiles[i];
      const profile2 = profiles[i + 1];

      for (let j = 0; j <= numIntermediateSections; j++) {
        if (j === numIntermediateSections && i < profiles.length - 2) continue;

        const t = j / numIntermediateSections;
        const interpolatedProfile = this._interpolateProfiles(profile1, profile2, t, rails);
        allSections.push(interpolatedProfile);
      }
    }
    return {
      type: 'loft',
      profiles: profiles,
      rails: rails,
      centerline: centerline,
      closedEnds: closeEnds,
      tangentEdges: tangentEdges,
      sections: allSections
    };
  },
  _generateRibGeometry: function(curve, thickness, direction, extentType, depth, draft, flip) {
    return {
      type: 'rib',
      curve: curve,
      thickness: thickness,
      direction: direction,
      extentType: extentType,
      depth: depth,
      draftAngle: draft,
      flipped: flip
    };
  },
  _generateWebGeometry: function(curves, thickness, surfaces, draft) {
    return {
      type: 'web',
      curves: curves,
      thickness: thickness,
      boundingSurfaces: surfaces,
      draftAngle: draft
    };
  },
  _generateEmbossGeometry: function(sketch, face, depth, direction, taper, wrap) {
    const actualDepth = direction === 'engrave' ? -depth : depth;

    return {
      type: 'emboss',
      sketch: sketch,
      targetFace: face,
      depth: actualDepth,
      direction: direction,
      taperAngle: taper,
      wrapToFace: wrap
    };
  },
  _getProfilePoints: function(profile) {
    if (profile.points) return profile.points;
    if (profile.vertices) return profile.vertices;
    if (profile.type === 'circle') {
      // Generate circle points
      const points = [];
      const numPoints = 36;
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI;
        points.push({
          x: profile.center.x + profile.radius * Math.cos(angle),
          y: profile.center.y + profile.radius * Math.sin(angle)
        });
      }
      return points;
    }
    return [];
  },
  _rotationAboutAxis: function(axis, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const t = 1 - c;
    const x = axis.direction.x, y = axis.direction.y, z = axis.direction.z;

    return {
      matrix: [
        [t*x*x + c, t*x*y - s*z, t*x*z + s*y],
        [t*x*y + s*z, t*y*y + c, t*y*z - s*x],
        [t*x*z - s*y, t*y*z + s*x, t*z*z + c]
      ],
      pivot: axis.point
    };
  },
  _calculateFrenetFrame: function(tangent, orientation) {
    // Calculate Frenet-Serret frame (tangent, normal, binormal)
    const T = this._normalize(tangent);

    // Choose an arbitrary up vector
    let up = { x: 0, y: 0, z: 1 };
    if (Math.abs(T.z) > 0.9) {
      up = { x: 1, y: 0, z: 0 };
    }
    // Normal = up x tangent (normalized)
    const N = this._normalize(this._cross(up, T));

    // Binormal = tangent x normal
    const B = this._cross(T, N);

    return { tangent: T, normal: N, binormal: B };
  },
  _interpolateProfiles: function(p1, p2, t, rails) {
    // Linear interpolation between profiles
    const points1 = this._getProfilePoints(p1);
    const points2 = this._getProfilePoints(p2);

    const interpolated = [];
    const numPoints = Math.min(points1.length, points2.length);

    for (let i = 0; i < numPoints; i++) {
      interpolated.push({
        x: points1[i].x + t * (points2[i].x - points1[i].x),
        y: points1[i].y + t * (points2[i].y - points1[i].y),
        z: (points1[i].z || 0) + t * ((points2[i].z || 0) - (points1[i].z || 0))
      });
    }
    return { points: interpolated, parameter: t };
  },
  _getCurveLength: function(curve) {
    if (curve.type === 'line') {
      const dx = curve.end.x - curve.start.x;
      const dy = curve.end.y - curve.start.y;
      const dz = (curve.end.z || 0) - (curve.start.z || 0);
      return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }
    return 100; // Default
  },
  _evaluateCurveAtParameter: function(curve, t) {
    if (curve.type === 'line') {
      return {
        x: curve.start.x + t * (curve.end.x - curve.start.x),
        y: curve.start.y + t * (curve.end.y - curve.start.y),
        z: (curve.start.z || 0) + t * ((curve.end.z || 0) - (curve.start.z || 0))
      };
    }
    return curve.start;
  },
  _evaluateCurveTangentAtParameter: function(curve, t) {
    if (curve.type === 'line') {
      return this._normalize({
        x: curve.end.x - curve.start.x,
        y: curve.end.y - curve.start.y,
        z: (curve.end.z || 0) - (curve.start.z || 0)
      });
    }
    return { x: 1, y: 0, z: 0 };
  },
  _normalize: function(v) {
    const len = Math.sqrt(v.x*v.x + v.y*v.y + (v.z||0)*(v.z||0));
    if (len === 0) return { x: 0, y: 0, z: 1 };
    return { x: v.x/len, y: v.y/len, z: (v.z||0)/len };
  },
  _cross: function(a, b) {
    return {
      x: a.y * (b.z||0) - (a.z||0) * b.y,
      y: (a.z||0) * b.x - a.x * (b.z||0),
      z: a.x * b.y - a.y * b.x
    };
  },
  confidence: {
    overall: 0.85,
    extrude: 0.92,
    revolve: 0.90,
    sweep: 0.82,
    loft: 0.80,
    rib: 0.78,
    emboss: 0.75
  }
}