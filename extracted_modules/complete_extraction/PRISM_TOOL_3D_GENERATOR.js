const PRISM_TOOL_3D_GENERATOR = {
  version: '1.0.0',

  // Generate 3D model for any tool type
  generate(toolType, params) {
    switch (toolType) {
      case 'endmill':
      case 'endmill_square':
        return this.generateEndMill(params);
      case 'endmill_ball':
        return this.generateBallEndMill(params);
      case 'endmill_barrel':
        return this.generateBarrelCutter(params);
      case 'drill':
        return this.generateDrill(params);
      case 'tap':
        return this.generateTap(params);
      case 'turning_insert':
        return this.generateTurningInsert(params);
      case 'milling_insert':
        return this.generateMillingInsert(params);
      case 'holder':
        return this.generateToolHolder(params);
      case 'face_mill':
        return this.generateFaceMill(params);
      default:
        return this.generateGenericCylinder(params);
    }
  },
  // Generate square end mill 3D mesh
  generateEndMill(params) {
    const { diameter, flutes, loc, oal, cornerRadius = 0, helixAngle = 35 } = params;
    const r = diameter / 2;
    const resolution = Math.max(24, flutes * 8);

    const vertices = [];
    const fluteProfiles = [];

    // Generate helical flutes
    const fluteDepth = r * 0.3;  // 30% of radius
    const helixPitch = (Math.PI * diameter) / Math.tan(helixAngle * Math.PI / 180);

    for (let z = 0; z <= loc; z += loc / 20) {
      const rotation = (z / helixPitch) * Math.PI * 2;

      for (let i = 0; i < resolution; i++) {
        const baseAngle = (i / resolution) * Math.PI * 2;
        const angle = baseAngle + rotation;

        // Check if in flute
        let radius = r;
        for (let f = 0; f < flutes; f++) {
          const fluteAngle = (f / flutes) * Math.PI * 2;
          const diff = Math.abs(((angle - fluteAngle) % (Math.PI * 2 / flutes)));
          if (diff < 0.3) {
            radius = r - fluteDepth * (1 - diff / 0.3);
          }
        }
        vertices.push([
          radius * Math.cos(baseAngle),
          radius * Math.sin(baseAngle),
          z
        ]);
      }
    }
    // Shank section (above LOC)
    for (let z = loc; z <= oal; z += (oal - loc) / 5) {
      for (let i = 0; i < resolution; i++) {
        const angle = (i / resolution) * Math.PI * 2;
        vertices.push([r * Math.cos(angle), r * Math.sin(angle), z]);
      }
    }
    return {
      type: 'endmill',
      diameter: diameter,
      flutes: flutes,
      loc: loc,
      oal: oal,
      cornerRadius: cornerRadius,
      helixAngle: helixAngle,
      vertices: vertices,
      vertexCount: vertices.length,
      boundingBox: {
        min: [-r, -r, 0],
        max: [r, r, oal]
      }
    };
  },
  // Generate ball end mill
  generateBallEndMill(params) {
    const { diameter, flutes, loc, oal } = params;
    const r = diameter / 2;
    const resolution = 24;
    const axialRes = 18;

    const vertices = [];

    // Ball hemisphere
    for (let i = 0; i <= axialRes; i++) {
      const phi = (i / axialRes) * (Math.PI / 2);
      const ringR = r * Math.cos(phi);
      const z = r * Math.sin(phi);

      for (let j = 0; j < resolution; j++) {
        const theta = (j / resolution) * Math.PI * 2;
        vertices.push([ringR * Math.cos(theta), ringR * Math.sin(theta), r - z]);
      }
    }
    // Cylindrical section
    for (let z = r; z <= loc; z += (loc - r) / 10) {
      for (let j = 0; j < resolution; j++) {
        const theta = (j / resolution) * Math.PI * 2;
        vertices.push([r * Math.cos(theta), r * Math.sin(theta), z]);
      }
    }
    return {
      type: 'ball_endmill',
      diameter: diameter,
      ballRadius: r,
      vertices: vertices,
      vertexCount: vertices.length,
      boundingBox: {
        min: [-r, -r, 0],
        max: [r, r, oal]
      }
    };
  },
  // Generate barrel cutter
  generateBarrelCutter(params) {
    const { diameter, barrelRadius, loc, oal } = params;
    const r = diameter / 2;
    const resolution = 36;
    const axialRes = 24;

    const vertices = [];

    // Barrel profile (circular arc)
    const arcAngle = loc / barrelRadius;

    for (let i = 0; i <= axialRes; i++) {
      const t = i / axialRes;
      const angle = -arcAngle / 2 + t * arcAngle;
      const profileR = r + barrelRadius * (1 - Math.cos(angle));
      const z = (loc / 2) + barrelRadius * Math.sin(angle);

      for (let j = 0; j < resolution; j++) {
        const theta = (j / resolution) * Math.PI * 2;
        vertices.push([profileR * Math.cos(theta), profileR * Math.sin(theta), z]);
      }
    }
    return {
      type: 'barrel_cutter',
      diameter: diameter,
      barrelRadius: barrelRadius,
      effectiveRadius: barrelRadius,
      vertices: vertices,
      vertexCount: vertices.length,
      boundingBox: {
        min: [-r - 2, -r - 2, 0],
        max: [r + 2, r + 2, loc]
      }
    };
  },
  // Generate drill
  generateDrill(params) {
    const { diameter, pointAngle = 118, fluteLength, oal } = params;
    const r = diameter / 2;
    const resolution = 24;

    const vertices = [];

    // Point (cone)
    const pointHeight = r / Math.tan((pointAngle / 2) * Math.PI / 180);

    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const z = t * pointHeight;
      const currentR = r * (1 - t);

      for (let j = 0; j < resolution; j++) {
        const theta = (j / resolution) * Math.PI * 2;
        vertices.push([currentR * Math.cos(theta), currentR * Math.sin(theta), z]);
      }
    }
    // Tip
    vertices.push([0, 0, 0]);

    // Fluted body
    for (let z = pointHeight; z <= fluteLength; z += (fluteLength - pointHeight) / 15) {
      for (let j = 0; j < resolution; j++) {
        const theta = (j / resolution) * Math.PI * 2;
        vertices.push([r * Math.cos(theta), r * Math.sin(theta), z]);
      }
    }
    return {
      type: 'drill',
      diameter: diameter,
      pointAngle: pointAngle,
      vertices: vertices,
      vertexCount: vertices.length,
      boundingBox: {
        min: [-r, -r, 0],
        max: [r, r, oal]
      }
    };
  },
  // Generate turning insert
  generateTurningInsert(params) {
    const { shape, ic, thickness, cornerRadius = 0.8 } = params;

    const shapeVertices = {
      'C': this._diamondShape(80),
      'D': this._diamondShape(55),
      'V': this._diamondShape(35),
      'T': this._triangleShape(),
      'S': this._squareShape(),
      'R': this._roundShape()
    };
    const baseShape = shapeVertices[shape] || shapeVertices['C'];
    const scale = ic / 2;
    const halfT = thickness / 2;

    const vertices = [];

    // Top face
    baseShape.forEach(v => {
      vertices.push([v[0] * scale, v[1] * scale, halfT]);
    });

    // Bottom face
    baseShape.forEach(v => {
      vertices.push([v[0] * scale, v[1] * scale, -halfT]);
    });

    return {
      type: 'turning_insert',
      shape: shape,
      ic: ic,
      thickness: thickness,
      cornerRadius: cornerRadius,
      vertices: vertices,
      vertexCount: vertices.length,
      boundingBox: {
        min: [-ic/2, -ic/2, -halfT],
        max: [ic/2, ic/2, halfT]
      }
    };
  },
  // Generate milling insert
  generateMillingInsert(params) {
    const { shape, ic, thickness } = params;

    // Similar to turning but with different common shapes
    const shapeVertices = {
      'APKT': this._parallelogramShape(),
      'SEKN': this._squareShape(),
      'RCKT': this._roundShape(),
      'LNMU': this._rectangleShape()
    };
    const baseShape = shapeVertices[shape] || this._squareShape();
    const scale = ic / 2;
    const halfT = thickness / 2;

    const vertices = [];

    baseShape.forEach(v => {
      vertices.push([v[0] * scale, v[1] * scale, halfT]);
      vertices.push([v[0] * scale, v[1] * scale, -halfT]);
    });

    return {
      type: 'milling_insert',
      shape: shape,
      vertices: vertices,
      boundingBox: {
        min: [-ic/2, -ic/2, -halfT],
        max: [ic/2, ic/2, halfT]
      }
    };
  },
  // Generate tool holder
  generateToolHolder(params) {
    const { type, shankDiameter, length, taperType } = params;

    const vertices = [];
    const r = shankDiameter / 2;
    const resolution = 24;

    // Generate based on taper type
    if (taperType === 'CAT40' || taperType === 'BT40') {
      // Taper section
      const taperLength = 2.5;
      const taperTopR = 1.75;
      const taperBottomR = 1.25;

      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const z = t * taperLength;
        const currentR = taperBottomR + t * (taperTopR - taperBottomR);

        for (let j = 0; j < resolution; j++) {
          const theta = (j / resolution) * Math.PI * 2;
          vertices.push([currentR * Math.cos(theta), currentR * Math.sin(theta), z]);
        }
      }
    }
    // Straight section
    for (let z = 0; z <= length; z += length / 10) {
      for (let j = 0; j < resolution; j++) {
        const theta = (j / resolution) * Math.PI * 2;
        vertices.push([r * Math.cos(theta), r * Math.sin(theta), -z]);
      }
    }
    return {
      type: 'tool_holder',
      holderType: type,
      taperType: taperType,
      vertices: vertices,
      boundingBox: {
        min: [-r * 2, -r * 2, -length],
        max: [r * 2, r * 2, 3]
      }
    };
  },
  // Generate face mill
  generateFaceMill(params) {
    const { diameter, pockets, height } = params;
    const r = diameter / 2;
    const resolution = 48;

    const vertices = [];

    // Main body
    for (let z = 0; z <= height; z += height / 8) {
      for (let i = 0; i < resolution; i++) {
        const theta = (i / resolution) * Math.PI * 2;
        vertices.push([r * Math.cos(theta), r * Math.sin(theta), -z]);
      }
    }
    // Insert pockets (simplified)
    const pocketInfo = [];
    for (let p = 0; p < pockets; p++) {
      const angle = (p / pockets) * Math.PI * 2;
      pocketInfo.push({
        position: [(r - 10) * Math.cos(angle), (r - 10) * Math.sin(angle), -5],
        angle: angle
      });
    }
    return {
      type: 'face_mill',
      diameter: diameter,
      pocketCount: pockets,
      vertices: vertices,
      pockets: pocketInfo,
      boundingBox: {
        min: [-r, -r, -height],
        max: [r, r, 0]
      }
    };
  },
  // Generate generic cylinder
  generateGenericCylinder(params) {
    const { diameter, length } = params;
    const r = diameter / 2;
    const resolution = 24;

    const vertices = [];

    for (let z = 0; z <= length; z += length / 10) {
      for (let i = 0; i < resolution; i++) {
        const theta = (i / resolution) * Math.PI * 2;
        vertices.push([r * Math.cos(theta), r * Math.sin(theta), z]);
      }
    }
    return {
      type: 'cylinder',
      vertices: vertices,
      boundingBox: {
        min: [-r, -r, 0],
        max: [r, r, length]
      }
    };
  },
  // Shape generators
  _diamondShape(angle) {
    const rad = angle * Math.PI / 180 / 2;
    return [
      [0, 1],
      [Math.sin(rad), 0],
      [0, -1],
      [-Math.sin(rad), 0]
    ];
  },
  _triangleShape() {
    return [
      [0, 1],
      [0.866, -0.5],
      [-0.866, -0.5]
    ];
  },
  _squareShape() {
    return [
      [-0.707, 0.707],
      [0.707, 0.707],
      [0.707, -0.707],
      [-0.707, -0.707]
    ];
  },
  _roundShape(res = 24) {
    const verts = [];
    for (let i = 0; i < res; i++) {
      const theta = (i / res) * Math.PI * 2;
      verts.push([Math.cos(theta), Math.sin(theta)]);
    }
    return verts;
  },
  _parallelogramShape() {
    return [
      [-0.8, 0.5],
      [0.8, 0.5],
      [1.0, -0.5],
      [-0.6, -0.5]
    ];
  },
  _rectangleShape() {
    return [
      [-1, 0.5],
      [1, 0.5],
      [1, -0.5],
      [-1, -0.5]
    ];
  }
}