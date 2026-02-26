const PRISM_COMPLETE_CAD_GENERATION_ENGINE = {
  version: '3.0.0',
  confidence: 100,

  // CONFIGURATION

  config: {
    tolerance: 1e-6,
    angularTolerance: 1e-9,
    arcSegments: 32,        // Segments per full circle for arcs
    filletSegments: 16,     // Segments for fillet cross-section
    threadSegments: 36,     // Segments per thread revolution
    units: 'inch',          // Default units
    scale: 1.0              // Output scale factor
  },
  // PART 1: MATHEMATICAL UTILITIES

  math: {
    // Vector operations
    vec3(x, y, z) {
      return { x: x || 0, y: y || 0, z: z || 0 };
    },
    add(a, b) {
      return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
    },
    sub(a, b) {
      return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    },
    scale(v, s) {
      return { x: v.x * s, y: v.y * s, z: v.z * s };
    },
    dot(a, b) {
      return a.x * b.x + a.y * b.y + a.z * b.z;
    },
    cross(a, b) {
      return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
      };
    },
    length(v) {
      return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    },
    normalize(v) {
      const len = this.length(v);
      if (len < 1e-10) return { x: 0, y: 0, z: 1 };
      return { x: v.x / len, y: v.y / len, z: v.z / len };
    },
    distance(a, b) {
      return this.length(this.sub(b, a));
    },
    // Matrix operations for transforms
    identityMatrix() {
      return [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
      ];
    },
    translationMatrix(tx, ty, tz) {
      return [
        [1, 0, 0, tx],
        [0, 1, 0, ty],
        [0, 0, 1, tz],
        [0, 0, 0, 1]
      ];
    },
    rotationMatrixZ(angle) {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      return [
        [c, -s, 0, 0],
        [s, c, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
      ];
    },
    rotationMatrixX(angle) {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      return [
        [1, 0, 0, 0],
        [0, c, -s, 0],
        [0, s, c, 0],
        [0, 0, 0, 1]
      ];
    },
    rotationMatrixY(angle) {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      return [
        [c, 0, s, 0],
        [0, 1, 0, 0],
        [-s, 0, c, 0],
        [0, 0, 0, 1]
      ];
    },
    multiplyMatrices(a, b) {
      const result = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          for (let k = 0; k < 4; k++) {
            result[i][j] += a[i][k] * b[k][j];
          }
        }
      }
      return result;
    },
    transformPoint(point, matrix) {
      const x = matrix[0][0] * point.x + matrix[0][1] * point.y + matrix[0][2] * point.z + matrix[0][3];
      const y = matrix[1][0] * point.x + matrix[1][1] * point.y + matrix[1][2] * point.z + matrix[1][3];
      const z = matrix[2][0] * point.x + matrix[2][1] * point.y + matrix[2][2] * point.z + matrix[2][3];
      return { x, y, z };
    },
    // Arc/circle point generation
    pointOnCircle(center, radius, angle, axis = 'z') {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      if (axis === 'z') {
        return { x: center.x + radius * c, y: center.y + radius * s, z: center.z };
      } else if (axis === 'x') {
        return { x: center.x, y: center.y + radius * c, z: center.z + radius * s };
      } else {
        return { x: center.x + radius * c, y: center.y, z: center.z + radius * s };
      }
    },
    // Generate arc points
    generateArcPoints(center, radius, startAngle, endAngle, segments, axis = 'z') {
      const points = [];
      const angleStep = (endAngle - startAngle) / segments;
      for (let i = 0; i <= segments; i++) {
        const angle = startAngle + i * angleStep;
        points.push(this.pointOnCircle(center, radius, angle, axis));
      }
      return points;
    },
    // Generate helix points for threads
    generateHelixPoints(center, radius, pitch, turns, segments) {
      const points = [];
      const totalSegments = Math.ceil(turns * segments);
      for (let i = 0; i <= totalSegments; i++) {
        const t = i / segments; // Number of turns completed
        const angle = t * 2 * Math.PI;
        const z = t * pitch;
        points.push({
          x: center.x + radius * Math.cos(angle),
          y: center.y + radius * Math.sin(angle),
          z: center.z + z
        });
      }
      return points;
    }
  },
  // PART 2: B-REP TOPOLOGY BUILDER

  topology: {
    _id: 0,
    _entities: [],

    reset() {
      this._id = 0;
      this._entities = [];
    },
    nextId() {
      return ++this._id;
    },
    addEntity(type, data) {
      const id = this.nextId();
      const entity = { id, type, ...data };
      this._entities.push(entity);
      return entity;
    },
    getEntity(id) {
      return this._entities.find(e => e.id === id);
    },
    getAllEntities() {
      return this._entities;
    },
    // Create STEP entities
    createPoint(x, y, z) {
      return this.addEntity('CARTESIAN_POINT', { coords: [x, y, z] });
    },
    createDirection(x, y, z) {
      const len = Math.sqrt(x*x + y*y + z*z);
      if (len < 1e-10) return this.createDirection(0, 0, 1);
      return this.addEntity('DIRECTION', { ratios: [x/len, y/len, z/len] });
    },
    createAxis2Placement3D(origin, axis, refDir) {
      return this.addEntity('AXIS2_PLACEMENT_3D', {
        location: origin.id,
        axis: axis.id,
        refDirection: refDir.id
      });
    },
    createPlane(placement) {
      return this.addEntity('PLANE', { position: placement.id });
    },
    createCylindricalSurface(placement, radius) {
      return this.addEntity('CYLINDRICAL_SURFACE', { position: placement.id, radius });
    },
    createConicalSurface(placement, radius, semiAngle) {
      return this.addEntity('CONICAL_SURFACE', { position: placement.id, radius, semiAngle });
    },
    createSphericalSurface(placement, radius) {
      return this.addEntity('SPHERICAL_SURFACE', { position: placement.id, radius });
    },
    createToroidalSurface(placement, majorRadius, minorRadius) {
      return this.addEntity('TOROIDAL_SURFACE', { position: placement.id, majorRadius, minorRadius });
    },
    createLine(point, direction) {
      return this.addEntity('LINE', { pnt: point.id, dir: direction.id });
    },
    createCircle(placement, radius) {
      return this.addEntity('CIRCLE', { position: placement.id, radius });
    },
    createEllipse(placement, semiAxis1, semiAxis2) {
      return this.addEntity('ELLIPSE', { position: placement.id, semiAxis1, semiAxis2 });
    },
    createBSplineCurve(degree, controlPoints, knots, multiplicities) {
      return this.addEntity('B_SPLINE_CURVE_WITH_KNOTS', {
        degree,
        controlPoints: controlPoints.map(p => p.id),
        knots,
        knotMultiplicities: multiplicities,
        curveForm: 'UNSPECIFIED'
      });
    },
    createBSplineSurface(degreeU, degreeV, controlPointGrid, knotsU, knotsV, multsU, multsV) {
      return this.addEntity('B_SPLINE_SURFACE_WITH_KNOTS', {
        uDegree: degreeU,
        vDegree: degreeV,
        controlPoints: controlPointGrid.map(row => row.map(p => p.id)),
        uKnots: knotsU,
        vKnots: knotsV,
        uMultiplicities: multsU,
        vMultiplicities: multsV,
        surfaceForm: 'UNSPECIFIED'
      });
    },
    createVertex(point) {
      return this.addEntity('VERTEX_POINT', { vertexGeometry: point.id });
    },
    createEdgeCurve(startVertex, endVertex, curve, sameSense = true) {
      return this.addEntity('EDGE_CURVE', {
        edgeStart: startVertex.id,
        edgeEnd: endVertex.id,
        edgeGeometry: curve.id,
        sameSense
      });
    },
    createOrientedEdge(edge, orientation = true) {
      return this.addEntity('ORIENTED_EDGE', {
        edgeElement: edge.id,
        orientation
      });
    },
    createEdgeLoop(orientedEdges) {
      return this.addEntity('EDGE_LOOP', {
        edgeList: orientedEdges.map(e => e.id)
      });
    },
    createFaceOuterBound(loop, orientation = true) {
      return this.addEntity('FACE_OUTER_BOUND', {
        bound: loop.id,
        orientation
      });
    },
    createFaceBound(loop, orientation = true) {
      return this.addEntity('FACE_BOUND', {
        bound: loop.id,
        orientation
      });
    },
    createAdvancedFace(bounds, surface, sameSense = true) {
      return this.addEntity('ADVANCED_FACE', {
        bounds: bounds.map(b => b.id),
        faceGeometry: surface.id,
        sameSense
      });
    },
    createClosedShell(faces) {
      return this.addEntity('CLOSED_SHELL', {
        cfsFaces: faces.map(f => f.id)
      });
    },
    createManifoldSolidBrep(name, shell) {
      return this.addEntity('MANIFOLD_SOLID_BREP', {
        name,
        outer: shell.id
      });
    }
  },
  // PART 3: SOLID PRIMITIVE GENERATORS

  primitives: {

    /**
     * Create a rectangular box/block solid
     */
    createBox(origin, length, width, height) {
      const topo = PRISM_COMPLETE_CAD_GENERATION_ENGINE.topology;
      const math = PRISM_COMPLETE_CAD_GENERATION_ENGINE.math;

      const x = origin.x || 0;
      const y = origin.y || 0;
      const z = origin.z || 0;

      // 8 corner points
      const p = [
        topo.createPoint(x, y, z),
        topo.createPoint(x + length, y, z),
        topo.createPoint(x + length, y + width, z),
        topo.createPoint(x, y + width, z),
        topo.createPoint(x, y, z + height),
        topo.createPoint(x + length, y, z + height),
        topo.createPoint(x + length, y + width, z + height),
        topo.createPoint(x, y + width, z + height)
      ];

      // 8 vertices
      const v = p.map(pt => topo.createVertex(pt));

      // Direction vectors
      const dirX = topo.createDirection(1, 0, 0);
      const dirY = topo.createDirection(0, 1, 0);
      const dirZ = topo.createDirection(0, 0, 1);
      const dirNX = topo.createDirection(-1, 0, 0);
      const dirNY = topo.createDirection(0, -1, 0);
      const dirNZ = topo.createDirection(0, 0, -1);

      // Create 12 edges (lines)
      const edges = [];
      const edgePairs = [
        [0,1], [1,2], [2,3], [3,0],  // Bottom face
        [4,5], [5,6], [6,7], [7,4],  // Top face
        [0,4], [1,5], [2,6], [3,7]   // Vertical edges
      ];

      for (const [i, j] of edgePairs) {
        const dir = math.normalize(math.sub(
          { x: p[j].coords[0], y: p[j].coords[1], z: p[j].coords[2] },
          { x: p[i].coords[0], y: p[i].coords[1], z: p[i].coords[2] }
        ));
        const lineDir = topo.createDirection(dir.x, dir.y, dir.z);
        const line = topo.createLine(p[i], lineDir);
        edges.push(topo.createEdgeCurve(v[i], v[j], line, true));
      }
      // Create 6 faces
      const faces = [];

      // Helper to create a face from edge indices
      const createPlanarFace = (edgeIndices, orientations, normal, faceOrigin) => {
        const orientedEdges = edgeIndices.map((idx, i) =>
          topo.createOrientedEdge(edges[idx], orientations[i])
        );
        const loop = topo.createEdgeLoop(orientedEdges);
        const bound = topo.createFaceOuterBound(loop, true);

        const origin = topo.createPoint(faceOrigin.x, faceOrigin.y, faceOrigin.z);
        const axis = topo.createDirection(normal.x, normal.y, normal.z);
        const refDir = topo.createDirection(
          Math.abs(normal.z) < 0.9 ? 0 : 1,
          Math.abs(normal.z) < 0.9 ? 0 : 0,
          Math.abs(normal.z) < 0.9 ? 1 : 0
        );
        const placement = topo.createAxis2Placement3D(origin, axis, refDir);
        const plane = topo.createPlane(placement);

        return topo.createAdvancedFace([bound], plane, true);
      };
      // Bottom face (Z = 0)
      faces.push(createPlanarFace([0, 1, 2, 3], [true, true, true, true],
        {x: 0, y: 0, z: -1}, {x: x, y: y, z: z}));

      // Top face (Z = height)
      faces.push(createPlanarFace([4, 5, 6, 7], [true, true, true, true],
        {x: 0, y: 0, z: 1}, {x: x, y: y, z: z + height}));

      // Front face (Y = 0)
      faces.push(createPlanarFace([0, 9, 4, 8], [true, true, false, false],
        {x: 0, y: -1, z: 0}, {x: x, y: y, z: z}));

      // Back face (Y = width)
      faces.push(createPlanarFace([2, 10, 6, 11], [false, true, false, true],
        {x: 0, y: 1, z: 0}, {x: x, y: y + width, z: z}));

      // Left face (X = 0)
      faces.push(createPlanarFace([3, 8, 7, 11], [false, true, false, true],
        {x: -1, y: 0, z: 0}, {x: x, y: y, z: z}));

      // Right face (X = length)
      faces.push(createPlanarFace([1, 10, 5, 9], [false, true, false, true],
        {x: 1, y: 0, z: 0}, {x: x + length, y: y, z: z}));

      const shell = topo.createClosedShell(faces);
      return topo.createManifoldSolidBrep('Box', shell);
    },
    /**
     * Create a cylinder solid
     */
    createCylinder(center, radius, height, axis = {x: 0, y: 0, z: 1}) {
      const topo = PRISM_COMPLETE_CAD_GENERATION_ENGINE.topology;
      const math = PRISM_COMPLETE_CAD_GENERATION_ENGINE.math;
      const config = PRISM_COMPLETE_CAD_GENERATION_ENGINE.config;

      const segments = config.arcSegments;
      const faces = [];

      // Bottom center
      const bottomCenter = topo.createPoint(center.x, center.y, center.z);
      const topCenter = topo.createPoint(
        center.x + axis.x * height,
        center.y + axis.y * height,
        center.z + axis.z * height
      );

      // Generate circle points
      const bottomPoints = [];
      const topPoints = [];
      const bottomVertices = [];
      const topVertices = [];

      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        const bx = center.x + radius * Math.cos(angle);
        const by = center.y + radius * Math.sin(angle);
        const bz = center.z;

        const tx = bx + axis.x * height;
        const ty = by + axis.y * height;
        const tz = bz + axis.z * height;

        bottomPoints.push(topo.createPoint(bx, by, bz));
        topPoints.push(topo.createPoint(tx, ty, tz));
        bottomVertices.push(topo.createVertex(bottomPoints[i]));
        topVertices.push(topo.createVertex(topPoints[i]));
      }
      // Create cylindrical surface
      const axisDir = topo.createDirection(axis.x, axis.y, axis.z);
      const refDir = topo.createDirection(1, 0, 0);
      const cylPlacement = topo.createAxis2Placement3D(bottomCenter, axisDir, refDir);
      const cylSurface = topo.createCylindricalSurface(cylPlacement, radius);

      // Create bottom planar face
      const bottomAxis = topo.createDirection(-axis.x, -axis.y, -axis.z);
      const bottomPlacement = topo.createAxis2Placement3D(bottomCenter, bottomAxis, refDir);
      const bottomPlane = topo.createPlane(bottomPlacement);

      // Create top planar face
      const topPlacement = topo.createAxis2Placement3D(topCenter, axis