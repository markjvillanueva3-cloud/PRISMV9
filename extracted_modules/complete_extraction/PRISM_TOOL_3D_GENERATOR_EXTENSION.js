const PRISM_TOOL_3D_GENERATOR_EXTENSION = {

  /**
   * Generate tap with actual thread geometry
   */
  generateTap(params) {
    const {
      diameter = 10,
      pitch = 1.5,
      threadType = 'metric',  // 'metric', 'unc', 'unf'
      oal = 75,
      threadLength = 30,
      fluteCount = 3,
      fluteType = 'spiral',  // 'spiral', 'straight'
      chamferLength = null,
      coating = null
    } = params;

    const r = diameter / 2;
    const resolution = 36;
    const vertices = [];
    const faces = [];

    // Thread profile based on type
    const threadProfile = this._getThreadProfile(threadType, pitch);
    const actualChamfer = chamferLength || pitch * 2;

    // Generate chamfer section
    const chamferSteps = 8;
    for (let i = 0; i <= chamferSteps; i++) {
      const t = i / chamferSteps;
      const z = t * actualChamfer;
      const currentDia = diameter * 0.7 + (diameter * 0.3) * t; // Tapered entry
      const currentR = currentDia / 2;

      this._generateThreadRing(vertices, z, currentR, threadProfile, resolution, t * 360 / pitch * actualChamfer);
    }
    // Generate threaded section
    const threadSteps = Math.ceil(threadLength / pitch * 8);
    for (let i = 0; i <= threadSteps; i++) {
      const t = i / threadSteps;
      const z = actualChamfer + t * threadLength;
      const angle = t * 360 / pitch * threadLength;

      this._generateThreadRing(vertices, z, r, threadProfile, resolution, angle);
    }
    // Generate shank
    const shankStart = actualChamfer + threadLength;
    const shankSteps = 10;
    for (let i = 0; i <= shankSteps; i++) {
      const t = i / shankSteps;
      const z = shankStart + t * (oal - shankStart);

      for (let j = 0; j < resolution; j++) {
        const angle = (j / resolution) * Math.PI * 2;
        vertices.push({
          x: r * Math.cos(angle),
          y: r * Math.sin(angle),
          z: z
        });
      }
    }
    // Generate faces
    this._generateCylinderFaces(faces, vertices.length, resolution, chamferSteps + threadSteps + shankSteps);

    // Add flutes
    const flutedVertices = fluteType === 'spiral'
      ? this._addSpiralFlutes(vertices, fluteCount, r, threadLength + actualChamfer)
      : this._addStraightFlutes(vertices, fluteCount, r, threadLength + actualChamfer);

    return {
      type: 'tap',
      diameter,
      pitch,
      threadType,
      oal,
      threadLength,
      fluteCount,
      coating,
      vertices: flutedVertices,
      faces,
      boundingBox: {
        min: { x: -r, y: -r, z: 0 },
        max: { x: r, y: r, z: oal }
      }
    };
  },
  _getThreadProfile(threadType, pitch) {
    // ISO metric thread profile
    const H = pitch * Math.sqrt(3) / 2;  // Thread height
    const majorDepth = H * 5 / 8;         // Major diameter depth
    const minorDepth = H * 1 / 4;         // Minor diameter depth

    return {
      depth: majorDepth,
      pitch,
      angle: 60,  // Thread angle in degrees
      rootRadius: pitch * 0.125,
      crestFlat: pitch * 0.125
    };
  },
  _generateThreadRing(vertices, z, baseRadius, profile, resolution, angle) {
    const angleRad = angle * Math.PI / 180;

    for (let i = 0; i < resolution; i++) {
      const theta = (i / resolution) * Math.PI * 2 + angleRad;
      const threadOffset = Math.sin(theta * 2) * profile.depth * 0.5;
      const r = baseRadius + threadOffset;

      vertices.push({
        x: r * Math.cos(theta),
        y: r * Math.sin(theta),
        z: z
      });
    }
  },
  _generateCylinderFaces(faces, totalVerts, resolution, axialSteps) {
    for (let i = 0; i < axialSteps; i++) {
      for (let j = 0; j < resolution; j++) {
        const v0 = i * resolution + j;
        const v1 = i * resolution + ((j + 1) % resolution);
        const v2 = (i + 1) * resolution + ((j + 1) % resolution);
        const v3 = (i + 1) * resolution + j;

        if (v2 < totalVerts && v3 < totalVerts) {
          faces.push({ vertices: [v0, v1, v2] });
          faces.push({ vertices: [v0, v2, v3] });
        }
      }
    }
  },
  _addSpiralFlutes(vertices, fluteCount, radius, fluteLength) {
    const fluteDepth = radius * 0.35;
    const helixAngle = 15 * Math.PI / 180;

    return vertices.map((v, idx) => {
      if (v.z > fluteLength) return v;

      const angle = Math.atan2(v.y, v.x);
      const helixOffset = v.z * Math.tan(helixAngle);

      // Check if in flute
      for (let f = 0; f < fluteCount; f++) {
        const fluteAngle = (f / fluteCount) * Math.PI * 2 + helixOffset;
        const diff = Math.abs(((angle - fluteAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);

        if (diff < 0.4) {
          const depth = fluteDepth * (1 - diff / 0.4);
          const currentR = Math.sqrt(v.x * v.x + v.y * v.y);
          const newR = currentR - depth;
          return {
            x: newR * Math.cos(angle),
            y: newR * Math.sin(angle),
            z: v.z
          };
        }
      }
      return v;
    });
  },
  _addStraightFlutes(vertices, fluteCount, radius, fluteLength) {
    const fluteDepth = radius * 0.35;

    return vertices.map((v, idx) => {
      if (v.z > fluteLength) return v;

      const angle = Math.atan2(v.y, v.x);

      for (let f = 0; f < fluteCount; f++) {
        const fluteAngle = (f / fluteCount) * Math.PI * 2;
        const diff = Math.abs(((angle - fluteAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);

        if (diff < 0.3) {
          const depth = fluteDepth * (1 - diff / 0.3);
          const currentR = Math.sqrt(v.x * v.x + v.y * v.y);
          const newR = currentR - depth;
          return {
            x: newR * Math.cos(angle),
            y: newR * Math.sin(angle),
            z: v.z
          };
        }
      }
      return v;
    });
  },
  /**
   * Generate drill with coolant holes and split point
   */
  generateDrillEnhanced(params) {
    const {
      diameter = 10,
      pointAngle = 118,
      fluteLength = 50,
      oal = 80,
      coolantThrough = false,
      splitPoint = false,
      webThinning = false,
      coating = null
    } = params;

    const r = diameter / 2;
    const resolution = 36;
    const vertices = [];

    // Point geometry
    const pointHeight = r / Math.tan((pointAngle / 2) * Math.PI / 180);

    // Generate point with optional split point
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const z = t * pointHeight;
      const currentR = r * (1 - t);

      for (let j = 0; j < resolution; j++) {
        let angle = (j / resolution) * Math.PI * 2;
        let adjustedR = currentR;

        // Split point modification (S-shaped cutting edge)
        if (splitPoint && t < 0.5) {
          const splitOffset = currentR * 0.1 * Math.sin(angle * 2);
          adjustedR = currentR + splitOffset;
        }
        vertices.push({
          x: adjustedR * Math.cos(angle),
          y: adjustedR * Math.sin(angle),
          z: z
        });
      }
    }
    // Tip
    vertices.push({ x: 0, y: 0, z: 0 });

    // Fluted body
    const fluteDepth = r * 0.4;
    const helixAngle = 30;
    const helixPitch = (Math.PI * diameter) / Math.tan(helixAngle * Math.PI / 180);

    for (let z = pointHeight; z <= fluteLength; z += (fluteLength - pointHeight) / 20) {
      const rotation = (z / helixPitch) * Math.PI * 2;

      for (let j = 0; j < resolution; j++) {
        const baseAngle = (j / resolution) * Math.PI * 2;
        const angle = baseAngle + rotation;

        // Two flutes
        let adjustedR = r;
        for (let f = 0; f < 2; f++) {
          const fluteAngle = f * Math.PI + rotation;
          const diff = Math.abs(((angle - fluteAngle + Math.PI * 2) % Math.PI) - Math.PI / 2);
          if (diff < 0.5) {
            adjustedR = r - fluteDepth * (1 - diff / 0.5);
          }
        }
        vertices.push({
          x: adjustedR * Math.cos(baseAngle),
          y: adjustedR * Math.sin(baseAngle),
          z: z
        });
      }
    }
    // Shank
    for (let z = fluteLength; z <= oal; z += (oal - fluteLength) / 5) {
      for (let j = 0; j < resolution; j++) {
        const angle = (j / resolution) * Math.PI * 2;
        vertices.push({
          x: r * Math.cos(angle),
          y: r * Math.sin(angle),
          z: z
        });
      }
    }
    // Add coolant hole geometry if specified
    let coolantHoles = null;
    if (coolantThrough) {
      coolantHoles = this._generateCoolantHoles(diameter, oal);
    }
    return {
      type: 'drill',
      diameter,
      pointAngle,
      fluteLength,
      oal,
      coolantThrough,
      splitPoint,
      webThinning,
      coating,
      vertices,
      coolantHoles,
      boundingBox: {
        min: { x: -r, y: -r, z: 0 },
        max: { x: r, y: r, z: oal }
      }
    };
  },
  _generateCoolantHoles(diameter, length) {
    const holeD = diameter * 0.15;  // ~15% of drill diameter
    const holeOffset = diameter * 0.25;  // Offset from center
    const helixAngle = 30;

    const holes = [];
    for (let i = 0; i < 2; i++) {
      const baseAngle = i * Math.PI;
      const points = [];

      for (let z = 0; z <= length; z += length / 50) {
        const rotation = (z / (Math.PI * diameter / Math.tan(helixAngle * Math.PI / 180))) * Math.PI * 2;
        const angle = baseAngle + rotation;

        points.push({
          x: holeOffset * Math.cos(angle),
          y: holeOffset * Math.sin(angle),
          z: z
        });
      }
      holes.push({
        diameter: holeD,
        path: points
      });
    }
    return holes;
  },
  /**
   * Generate turning insert with chip breaker
   */
  generateTurningInsertEnhanced(params) {
    const {
      style = 'CNMG',
      size = 12.7,
      thickness = 4.76,
      cornerRadius = 0.8,
      chipBreakerStyle = 'PM',  // 'PM', 'PF', 'PR', 'MF', 'MM'
      coating = 'TiAlN'
    } = params;

    // Parse ISO style
    const shape = style.charAt(0);
    const clearance = style.charAt(1);
    const tolerance = style.charAt(2);
    const features = style.charAt(3);

    const vertices = [];
    const resolution = 24;

    // Base shape
    const shapeGeom = this._getInsertShape(shape, size);

    // Generate base insert
    const topZ = thickness;
    const bottomZ = 0;

    // Top face with chip breaker
    const chipBreaker = this._getChipBreakerProfile(chipBreakerStyle, size, thickness);

    shapeGeom.points.forEach((pt, i) => {
      // Top surface with chip breaker depression
      const cbDepth = this._getChipBreakerDepth(pt.x, pt.y, size, chipBreaker);
      vertices.push({ x: pt.x, y: pt.y, z: topZ - cbDepth });

      // Bottom surface
      vertices.push({ x: pt.x, y: pt.y, z: bottomZ });
    });

    // Add corner radius geometry
    const corners = this._addCornerRadius(shapeGeom.corners, cornerRadius, thickness);
    vertices.push(...corners);

    return {
      type: 'turning_insert',
      style,
      size,
      thickness,
      cornerRadius,
      chipBreakerStyle,
      coating,
      vertices,
      shapeType: shape,
      clearanceAngle: this._getClearanceAngle(clearance),
      boundingBox: {
        min: { x: -size/2, y: -size/2, z: 0 },
        max: { x: size/2, y: size/2, z: thickness }
      }
    };
  },
  _getInsertShape(shape, size) {
    const points = [];
    const corners = [];

    switch (shape) {
      case 'C':  // 80° diamond
        const angle80 = 80 * Math.PI / 180;
        points.push({ x: size/2, y: 0 });
        points.push({ x: 0, y: size/2 * Math.tan(angle80/2) });
        points.push({ x: -size/2, y: 0 });
        points.push({ x: 0, y: -size/2 * Math.tan(angle80/2) });
        corners.push(0, 2);
        break;

      case 'D':  // 55° diamond
        const angle55 = 55 * Math.PI / 180;
        points.push({ x: size/2, y: 0 });
        points.push({ x: 0, y: size/2 * Math.tan(angle55/2) });
        points.push({ x: -size/2, y: 0 });
        points.push({ x: 0, y: -size/2 * Math.tan(angle55/2) });
        corners.push(0, 2);
        break;

      case 'S':  // Square
        points.push({ x: size/2, y: size/2 });
        points.push({ x: -size/2, y: size/2 });
        points.push({ x: -size/2, y: -size/2 });
        points.push({ x: size/2, y: -size/2 });
        corners.push(0, 1, 2, 3);
        break;

      case 'T':  // Triangle
        const h = size * Math.sqrt(3) / 2;
        points.push({ x: 0, y: h * 2/3 });
        points.push({ x: -size/2, y: -h/3 });
        points.push({ x: size/2, y: -h/3 });
        corners.push(0, 1, 2);
        break;

      case 'W':  // Trigon (80° triangle)
        const angle = 80 * Math.PI / 180;
        points.push({ x: 0, y: size/2 });
        points.push({ x: -size/2 * Math.sin(angle/2), y: -size/2 * Math.cos(angle/2) });
        points.push({ x: size/2 * Math.sin(angle/2), y: -size/2 * Math.cos(angle/2) });
        corners.push(0, 1, 2);
        break;

      default:  // Round
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          points.push({ x: size/2 * Math.cos(a), y: size/2 * Math.sin(a) });
        }
        break;
    }
    return { points, corners };
  },
  _getChipBreakerProfile(style, size, thickness) {
    // Different chip breaker profiles
    const profiles = {
      'PM': { depth: thickness * 0.15, width: size * 0.6, angle: 15 },  // General purpose medium
      'PF': { depth: thickness * 0.1, width: size * 0.5, angle: 12 },   // Finishing
      'PR': { depth: thickness * 0.2, width: size * 0.7, angle: 18 },   // Roughing
      'MF': { depth: thickness * 0.12, width: size * 0.55, angle: 14 }, // Medium finishing
      'MM': { depth: thickness * 0.16, width: size * 0.65, angle: 16 }  // Medium
    };
    return profiles[style] || profiles['PM'];
  },
  _getChipBreakerDepth(x, y, size, profile) {
    const dist = Math.sqrt(x*x + y*y);
    const relDist = dist / (size/2);

    if (relDist < 0.2) return 0;  // Near center - no depression
    if (relDist > profile.width / (size/2)) return 0;  // Outside chip breaker

    const t = (relDist - 0.2) / (profile.width / (size/2) - 0.2);
    return profile.depth * Math.sin(t * Math.PI);
  },
  _addCornerRadius(cornerIndices, radius, thickness) {
    const corners = [];
    const segments = 8;

    // Simplified corner rounding
    for (const cornerIdx of cornerIndices) {
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI / 2;
        corners.push({
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle),
          z: thickness,
          cornerIndex: cornerIdx
        });
      }
    }
    return corners;
  },
  _getClearanceAngle(code) {
    const angles = {
      'A': 3, 'B': 5, 'C': 7, 'D': 15, 'E': 20, 'F': 25,
      'G': 30, 'N': 0, 'P': 11, 'O': -7
    };
    return angles[code] || 0;
  },
  // Coating visualization colors
  coatingColors: {
    'TiN': { color: '#FFD700', name: 'Titanium Nitride (Gold)' },
    'TiAlN': { color: '#4B0082', name: 'Titanium Aluminum Nitride (Dark Purple)' },
    'AlTiN': { color: '#2E0854', name: 'Aluminum Titanium Nitride' },
    'TiCN': { color: '#708090', name: 'Titanium Carbonitride (Gray)' },
    'AlCrN': { color: '#696969', name: 'Aluminum Chromium Nitride' },
    'DLC': { color: '#1C1C1C', name: 'Diamond-Like Carbon (Black)' },
    'nACo': { color: '#9370DB', name: 'Nano Aluminum Chromium Oxide' },
    'ZrN': { color: '#DAA520', name: 'Zirconium Nitride (Golden)' }
  },
  getCoatingColor(coating) {
    return this.coatingColors[coating] || { color: '#C0C0C0', name: 'Uncoated' };
  }
}