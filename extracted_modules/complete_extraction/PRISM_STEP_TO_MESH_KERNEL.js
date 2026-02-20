const PRISM_STEP_TO_MESH_KERNEL = {
  version: '1.0.0',

  // CORE NURBS/B-SPLINE MATHEMATICS

  math: {
    /**
     * Cox-de Boor recursion formula for B-spline basis functions
     */
    basisFunction(i, p, u, knots) {
      if (p === 0) {
        return (u >= knots[i] && u < knots[i + 1]) ? 1.0 : 0.0;
      }
      let left = 0, right = 0;

      const denom1 = knots[i + p] - knots[i];
      if (denom1 !== 0) {
        left = ((u - knots[i]) / denom1) * this.basisFunction(i, p - 1, u, knots);
      }
      const denom2 = knots[i + p + 1] - knots[i + 1];
      if (denom2 !== 0) {
        right = ((knots[i + p + 1] - u) / denom2) * this.basisFunction(i + 1, p - 1, u, knots);
      }
      return left + right;
    },
    /**
     * Evaluate B-spline curve at parameter t
     */
    evaluateBSplineCurve(controlPoints, degree, knots, weights, t) {
      const n = controlPoints.length - 1;
      let point = { x: 0, y: 0, z: 0 };
      let weightSum = 0;

      for (let i = 0; i <= n; i++) {
        const basis = this.basisFunction(i, degree, t, knots);
        const w = weights ? weights[i] : 1.0;
        const bw = basis * w;

        point.x += controlPoints[i].x * bw;
        point.y += controlPoints[i].y * bw;
        point.z += controlPoints[i].z * bw;
        weightSum += bw;
      }
      if (weightSum !== 0) {
        point.x /= weightSum;
        point.y /= weightSum;
        point.z /= weightSum;
      }
      return point;
    },
    /**
     * Evaluate B-spline surface at parameters (u, v)
     */
    evaluateBSplineSurface(controlNet, degreeU, degreeV, knotsU, knotsV, weights, u, v) {
      const m = controlNet.length - 1;      // rows
      const n = controlNet[0].length - 1;   // cols

      let point = { x: 0, y: 0, z: 0 };
      let weightSum = 0;

      for (let i = 0; i <= m; i++) {
        const basisU = this.basisFunction(i, degreeU, u, knotsU);

        for (let j = 0; j <= n; j++) {
          const basisV = this.basisFunction(j, degreeV, v, knotsV);
          const w = weights ? weights[i][j] : 1.0;
          const bw = basisU * basisV * w;

          const cp = controlNet[i][j];
          point.x += cp.x * bw;
          point.y += cp.y * bw;
          point.z += cp.z * bw;
          weightSum += bw;
        }
      }
      if (weightSum !== 0) {
        point.x /= weightSum;
        point.y /= weightSum;
        point.z /= weightSum;
      }
      return point;
    },
    /**
     * Compute surface normal at (u, v)
     */
    computeSurfaceNormal(controlNet, degreeU, degreeV, knotsU, knotsV, weights, u, v) {
      const eps = 0.0001;

      const p = this.evaluateBSplineSurface(controlNet, degreeU, degreeV, knotsU, knotsV, weights, u, v);
      const pu = this.evaluateBSplineSurface(controlNet, degreeU, degreeV, knotsU, knotsV, weights,
                                              Math.min(u + eps, 1), v);
      const pv = this.evaluateBSplineSurface(controlNet, degreeU, degreeV, knotsU, knotsV, weights,
                                              u, Math.min(v + eps, 1));

      // Tangent vectors
      const tu = { x: pu.x - p.x, y: pu.y - p.y, z: pu.z - p.z };
      const tv = { x: pv.x - p.x, y: pv.y - p.y, z: pv.z - p.z };

      // Cross product for normal
      const n = {
        x: tu.y * tv.z - tu.z * tv.y,
        y: tu.z * tv.x - tu.x * tv.z,
        z: tu.x * tv.y - tu.y * tv.x
      };
      // Normalize
      const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
      if (len > 0) {
        n.x /= len;
        n.y /= len;
        n.z /= len;
      }
      return n;
    },
    /**
     * Evaluate plane at parameters (u, v)
     */
    evaluatePlane(origin, axisU, axisV, u, v) {
      return {
        x: origin.x + axisU.x * u + axisV.x * v,
        y: origin.y + axisU.y * u + axisV.y * v,
        z: origin.z + axisU.z * u + axisV.z * v
      };
    },
    /**
     * Evaluate cylindrical surface
     */
    evaluateCylinder(origin, axis, refDir, radius, u, v) {
      // u = angle (0 to 2π), v = height along axis
      const cos_u = Math.cos(u);
      const sin_u = Math.sin(u);

      // Perpendicular direction
      const perp = {
        x: axis.y * refDir.z - axis.z * refDir.y,
        y: axis.z * refDir.x - axis.x * refDir.z,
        z: axis.x * refDir.y - axis.y * refDir.x
      };
      return {
        x: origin.x + radius * (cos_u * refDir.x + sin_u * perp.x) + v * axis.x,
        y: origin.y + radius * (cos_u * refDir.y + sin_u * perp.y) + v * axis.y,
        z: origin.z + radius * (cos_u * refDir.z + sin_u * perp.z) + v * axis.z
      };
    },
    /**
     * Evaluate conical surface
     */
    evaluateCone(origin, axis, refDir, radius, halfAngle, u, v) {
      const r = radius + v * Math.tan(halfAngle);
      const cos_u = Math.cos(u);
      const sin_u = Math.sin(u);

      const perp = {
        x: axis.y * refDir.z - axis.z * refDir.y,
        y: axis.z * refDir.x - axis.x * refDir.z,
        z: axis.x * refDir.y - axis.y * refDir.x
      };
      return {
        x: origin.x + r * (cos_u * refDir.x + sin_u * perp.x) + v * axis.x,
        y: origin.y + r * (cos_u * refDir.y + sin_u * perp.y) + v * axis.y,
        z: origin.z + r * (cos_u * refDir.z + sin_u * perp.z) + v * axis.z
      };
    },
    /**
     * Evaluate spherical surface
     */
    evaluateSphere(origin, radius, u, v) {
      // u = longitude (0 to 2π), v = latitude (-π/2 to π/2)
      const cos_v = Math.cos(v);
      return {
        x: origin.x + radius * cos_v * Math.cos(u),
        y: origin.y + radius * cos_v * Math.sin(u),
        z: origin.z + radius * Math.sin(v)
      };
    },
    /**
     * Evaluate toroidal surface
     */
    evaluateTorus(origin, axis, refDir, majorRadius, minorRadius, u, v) {
      const cos_u = Math.cos(u);
      const sin_u = Math.sin(u);
      const cos_v = Math.cos(v);
      const sin_v = Math.sin(v);

      const perp = {
        x: axis.y * refDir.z - axis.z * refDir.y,
        y: axis.z * refDir.x - axis.x * refDir.z,
        z: axis.x * refDir.y - axis.y * refDir.x
      };
      const r = majorRadius + minorRadius * cos_v;

      return {
        x: origin.x + r * (cos_u * refDir.x + sin_u * perp.x) + minorRadius * sin_v * axis.x,
        y: origin.y + r * (cos_u * refDir.y + sin_u * perp.y) + minorRadius * sin_v * axis.y,
        z: origin.z + r * (cos_u * refDir.z + sin_u * perp.z) + minorRadius * sin_v * axis.z
      };
    }
  },
  // SURFACE TESSELLATION ENGINE

  tessellator: {
    /**
     * Tessellate any surface type into triangles
     */
    tessellateSurface(surfaceData, options = {}) {
      const divisions = options.divisions || 20;
      const adaptiveThreshold = options.adaptiveThreshold || 0.01;

      switch (surfaceData.type) {
        case 'plane':
          return this._tessellatePlane(surfaceData, divisions);
        case 'cylindrical':
          return this._tessellateCylinder(surfaceData, divisions);
        case 'conical':
          return this._tessellateCone(surfaceData, divisions);
        case 'spherical':
          return this._tessellateSphere(surfaceData, divisions);
        case 'toroidal':
          return this._tessellateTorus(surfaceData, divisions);
        case 'bspline':
          return this._tessellateBSplineSurface(surfaceData, divisions, adaptiveThreshold);
        default:
          console.warn('[TESSELLATOR] Unknown surface type:', surfaceData.type);
          return { vertices: [], normals: [], indices: [] };
      }
    },
    _tessellatePlane(surface, divisions) {
      const vertices = [];
      const normals = [];
      const indices = [];

      const origin = surface.origin || { x: 0, y: 0, z: 0 };
      const normal = surface.normal || { x: 0, y: 0, z: 1 };
      const bounds = surface.bounds || { uMin: -100, uMax: 100, vMin: -100, vMax: 100 };

      // Create U and V directions
      let axisU = { x: 1, y: 0, z: 0 };
      if (Math.abs(normal.x) > 0.9) {
        axisU = { x: 0, y: 1, z: 0 };
      }
      // Gram-Schmidt orthogonalization
      const dot = axisU.x * normal.x + axisU.y * normal.y + axisU.z * normal.z;
      axisU.x -= dot * normal.x;
      axisU.y -= dot * normal.y;
      axisU.z -= dot * normal.z;
      const len = Math.sqrt(axisU.x ** 2 + axisU.y ** 2 + axisU.z ** 2);
      axisU.x /= len; axisU.y /= len; axisU.z /= len;

      const axisV = {
        x: normal.y * axisU.z - normal.z * axisU.y,
        y: normal.z * axisU.x - normal.x * axisU.z,
        z: normal.x * axisU.y - normal.y * axisU.x
      };
      const uRange = bounds.uMax - bounds.uMin;
      const vRange = bounds.vMax - bounds.vMin;

      for (let i = 0; i <= divisions; i++) {
        for (let j = 0; j <= divisions; j++) {
          const u = bounds.uMin + (i / divisions) * uRange;
          const v = bounds.vMin + (j / divisions) * vRange;

          const p = PRISM_STEP_TO_MESH_KERNEL.math.evaluatePlane(origin, axisU, axisV, u, v);
          vertices.push(p.x, p.y, p.z);
          normals.push(normal.x, normal.y, normal.z);
        }
      }
      // Create indices
      for (let i = 0; i < divisions; i++) {
        for (let j = 0; j < divisions; j++) {
          const a = i * (divisions + 1) + j;
          const b = a + 1;
          const c = a + (divisions + 1);
          const d = c + 1;

          indices.push(a, b, c);
          indices.push(b, d, c);
        }
      }
      return { vertices, normals, indices };
    },
    _tessellateCylinder(surface, divisions) {
      const vertices = [];
      const normals = [];
      const indices = [];

      const origin = surface.origin || { x: 0, y: 0, z: 0 };
      const axis = surface.axis || { x: 0, y: 0, z: 1 };
      const refDir = surface.refDir || { x: 1, y: 0, z: 0 };
      const radius = surface.radius || 10;
      const height = surface.height || 50;

      const uDivisions = Math.max(24, divisions);
      const vDivisions = Math.max(4, Math.floor(divisions / 4));

      for (let i = 0; i <= uDivisions; i++) {
        for (let j = 0; j <= vDivisions; j++) {
          const u = (i / uDivisions) * Math.PI * 2;
          const v = (j / vDivisions) * height - height / 2;

          const p = PRISM_STEP_TO_MESH_KERNEL.math.evaluateCylinder(origin, axis, refDir, radius, u, v);
          vertices.push(p.x, p.y, p.z);

          // Normal points radially outward
          const cos_u = Math.cos(u);
          const sin_u = Math.sin(u);
          const perp = {
            x: axis.y * refDir.z - axis.z * refDir.y,
            y: axis.z * refDir.x - axis.x * refDir.z,
            z: axis.x * refDir.y - axis.y * refDir.x
          };
          const n = {
            x: cos_u * refDir.x + sin_u * perp.x,
            y: cos_u * refDir.y + sin_u * perp.y,
            z: cos_u * refDir.z + sin_u * perp.z
          };
          normals.push(n.x, n.y, n.z);
        }
      }
      for (let i = 0; i < uDivisions; i++) {
        for (let j = 0; j < vDivisions; j++) {
          const a = i * (vDivisions + 1) + j;
          const b = a + 1;
          const c = a + (vDivisions + 1);
          const d = c + 1;

          indices.push(a, c, b);
          indices.push(b, c, d);
        }
      }
      return { vertices, normals, indices };
    },
    _tessellateCone(surface, divisions) {
      const vertices = [];
      const normals = [];
      const indices = [];

      const origin = surface.origin || { x: 0, y: 0, z: 0 };
      const axis = surface.axis || { x: 0, y: 0, z: 1 };
      const refDir = surface.refDir || { x: 1, y: 0, z: 0 };
      const radius = surface.radius || 10;
      const halfAngle = surface.halfAngle || Math.PI / 6;
      const height = surface.height || 50;

      const uDivisions = Math.max(24, divisions);
      const vDivisions = Math.max(4, Math.floor(divisions / 4));

      for (let i = 0; i <= uDivisions; i++) {
        for (let j = 0; j <= vDivisions; j++) {
          const u = (i / uDivisions) * Math.PI * 2;
          const v = (j / vDivisions) * height;

          const p = PRISM_STEP_TO_MESH_KERNEL.math.evaluateCone(origin, axis, refDir, radius, halfAngle, u, v);
          vertices.push(p.x, p.y, p.z);

          // Normal for cone
          const cos_u = Math.cos(u);
          const sin_u = Math.sin(u);
          const cosHalf = Math.cos(halfAngle);
          const sinHalf = Math.sin(halfAngle);

          const perp = {
            x: axis.y * refDir.z - axis.z * refDir.y,
            y: axis.z * refDir.x - axis.x * refDir.z,
            z: axis.x * refDir.y - axis.y * refDir.x
          };
          const n = {
            x: cosHalf * (cos_u * refDir.x + sin_u * perp.x) - sinHalf * axis.x,
            y: cosHalf * (cos_u * refDir.y + sin_u * perp.y) - sinHalf * axis.y,
            z: cosHalf * (cos_u * refDir.z + sin_u * perp.z) - sinHalf * axis.z
          };
          const len = Math.sqrt(n.x ** 2 + n.y ** 2 + n.z ** 2);
          normals.push(n.x / len, n.y / len, n.z / len);
        }
      }
      for (let i = 0; i < uDivisions; i++) {
        for (let j = 0; j < vDivisions; j++) {
          const a = i * (vDivisions + 1) + j;
          const b = a + 1;
          const c = a + (vDivisions + 1);
          const d = c + 1;

          indices.push(a, c, b);
          indices.push(b, c, d);
        }
      }
      return { vertices, normals, indices };
    },
    _tessellateSphere(surface, divisions) {
      const vertices = [];
      const normals = [];
      const indices = [];

      const origin = surface.origin || { x: 0, y: 0, z: 0 };
      const radius = surface.radius || 10;

      const uDivisions = Math.max(24, divisions);
      const vDivisions = Math.max(12, Math.floor(divisions / 2));

      for (let i = 0; i <= uDivisions; i++) {
        for (let j = 0; j <= vDivisions; j++) {
          const u = (i / uDivisions) * Math.PI * 2;
          const v = (j / vDivisions) * Math.PI - Math.PI / 2;

          const p = PRISM_STEP_TO_MESH_KERNEL.math.evaluateSphere(origin, radius, u, v);
          vertices.push(p.x, p.y, p.z);

          // Normal is direction from center
          const n = {
            x: (p.x - origin.x) / radius,
            y: (p.y - origin.y) / radius,
            z: (p.z - origin.z) / radius
          };
          normals.push(n.x, n.y, n.z);
        }
      }
      for (let i = 0; i < uDivisions; i++) {
        for (let j = 0; j < vDivisions; j++) {
          const a = i * (vDivisions + 1) + j;
          const b = a + 1;
          const c = a + (vDivisions + 1);
          const d = c + 1;

          indices.push(a, c, b);
          indices.push(b, c, d);
        }
      }
      return { vertices, normals, indices };
    },
    _tessellateTorus(surface, divisions) {
      const vertices = [];
      const normals = [];
      const indices = [];

      const origin = surface.origin || { x: 0, y: 0, z: 0 };
      const axis = surface.axis || { x: 0, y: 0, z: 1 };
      const refDir = surface.refDir || { x: 1, y: 0, z: 0 };
      const majorRadius = surface.majorRadius || 20;
      const minorRadius = surface.minorRadius || 5;

      const uDivisions = Math.max(36, divisions);
      const vDivisions = Math.max(18, Math.floor(divisions / 2));

      for (let i = 0; i <= uDivisions; i++) {
        for (let j = 0; j <= vDivisions; j++) {
          const u = (i / uDivisions) * Math.PI * 2;
          const v = (j / vDivisions) * Math.PI * 2;

          const p = PRISM_STEP_TO_MESH_KERNEL.math.evaluateTorus(origin, axis, refDir, majorRadius, minorRadius, u, v);
          vertices.push(p.x, p.y, p.z);

          // Normal calculation for torus
          const cos_u = Math.cos(u);
          const sin_u = Math.sin(u);
          const cos_v = Math.cos(v);
          const sin_v = Math.sin(v);

          const perp = {
            x: axis.y * refDir.z - axis.z * refDir.y,
            y: axis.z * refDir.x - axis.x * refDir.z,
            z: axis.x * refDir.y - axis.y * refDir.x
          };
          const n = {
            x: cos_v * (cos_u * refDir.x + sin_u * perp.x) + sin_v * axis.x,
            y: cos_v * (cos_u * refDir.y + sin_u * perp.y) + sin_v * axis.y,
            z: cos_v * (cos_u * refDir.z + sin_u * perp.z) + sin_v * axis.z
          };
          const len = Math.sqrt(n.x ** 2 + n.y ** 2 + n.z ** 2);
          normals.push(n.x / len, n.y / len, n.z / len);
        }
      }
      for (let i = 0; i < uDivisions; i++) {
        for (let j = 0; j < vDivisions; j++) {
          const a = i * (vDivisions + 1) + j;
          const b = a + 1;
          const c = a + (vDivisions + 1);
          const d = c + 1;

          indices.push(a, c, b);
          indices.push(b, c, d);
        }
      }
      return { vertices, normals, indices };
    },
    _tessellateBSplineSurface(surface, divisions, adaptiveThreshold) {
      const vertices = [];
      const normals = [];
      const indices = [];

      const controlNet = surface.controlPoints;
      const degreeU = surface.degreeU || 3;
      const degreeV = surface.degreeV || 3;
      const knotsU = surface.knotsU;
      const knotsV = surface.knotsV;
      const weights = surface.weights;

      if (!controlNet || !knotsU || !knotsV) {
        console.warn('[TESSELLATOR] Invalid B-spline surface data');
        return { vertices: [], normals: [], indices: [] };
      }
      const uDivisions = divisions;
      const vDivisions = divisions;

      // Parameter range (from knot vectors)
      const uMin = knotsU[degreeU];
      const uMax = knotsU[knotsU.length - degreeU - 1];
      const vMin = knotsV[degreeV];
      const vMax = knotsV[knotsV.length - degreeV - 1];

      const uRange = uMax - uMin;
      const vRange = vMax - vMin;

      for (let i = 0; i <= uDivisions; i++) {
        for (let j = 0; j <= vDivisions; j++) {
          const u = uMin + (i / uDivisions) * uRange;
          const v = vMin + (j / vDivisions) * vRange;

          const p = PRISM_STEP_TO_MESH_KERNEL.math.evaluateBSplineSurface(
            controlNet, degreeU, degreeV, knotsU, knotsV, weights, u, v
          );
          vertices.push(p.x, p.y, p.z);

          const n = PRISM_STEP_TO_MESH_KERNEL.math.computeSurfaceNormal(
            controlNet, degreeU, degreeV, knotsU, knotsV, weights, u, v
          );
          normals.push(n.x, n.y, n.z);
        }
      }
      for (let i = 0; i < uDivisions; i++) {
        for (let j = 0; j < vDivisions; j++) {
          const a = i * (vDivisions + 1) + j;
          const b = a + 1;
          const c = a + (vDivisions + 1);
          const d = c + 1;

          indices.push(a, c, b);
          indices.push(b, c, d);
        }
      }
      return { vertices, normals, indices };
    }
  },
  // STEP ENTITY RESOLVER

  entityResolver: {
    /**
     * Resolve STEP entity reference to actual data
     */
    resolve(entityId, entities) {
      if (typeof entityId === 'object' && entityId.ref) {
        entityId = entityId.ref;
      }
      return entities[entityId];
    },
    /**
     * Get point coordinates from entity
     */
    getPoint(entityId, entities) {
      const entity = this.resolve(entityId, entities);
      if (!entity) return null;

      if (entity.type === 'CARTESIAN_POINT') {
        const coords = entity.args[1];
        return { x: coords[0] || 0, y: coords[1] || 0, z: coords[2] || 0 };
      }
      return null;
    },
    /**
     * Get direction vector from entity
     */
    getDirection(entityId, entities) {
      const entity = this.resolve(entityId, entities);
      if (!entity) return null;

      if (entity.type === 'DIRECTION') {
        const coords = entity.args[1];
        return { x: coords[0] || 0, y: coords[1] || 0, z: coords[2] || 1 };
      }
      return null;
    },
    /**
     * Get axis placement (origin, axis direction, reference direction)
     */
    getAxisPlacement(entityId, entities) {
      const entity = this.resolve(entityId, entities);
      if (!entity) return null;

      if (entity.type === 'AXIS2_PLACEMENT_3D') {
        const origin = this.getPoint(entity.args[1], entities) || { x: 0, y: 0, z: 0 };
        const axis = this.getDirection(entity.args[2], entities) || { x: 0, y: 0, z: 1 };
        const refDir = this.getDirection(entity.args[3], entities) || { x: 1, y: 0, z: 0 };
        return { origin, axis, refDir };
      }
      return null;
    },
    /**
     * Get surface data from entity
     */
    getSurfaceData(entityId, entities) {
      const entity = this.resolve(entityId, entities);
      if (!entity) return null;

      switch (entity.type) {
        case 'PLANE': {
          const placement = this.getAxisPlacement(entity.args[1], entities);
          return {
            type: 'plane',
            origin: placement?.origin,
            normal: placement?.axis,
            refDir: placement?.refDir
          };
        }
        case 'CYLINDRICAL_SURFACE': {
          const placement = this.getAxisPlacement(entity.args[1], entities);
          const radius = entity.args[2];
          return {
            type: 'cylindrical',
            origin: placement?.origin,
            axis: placement?.axis,
            refDir: placement?.refDir,
            radius: radius
          };
        }
        case 'CONICAL_SURFACE': {
          const placement = this.getAxisPlacement(entity.args[1], entities);
          const radius = entity.args[2];
          const halfAngle = entity.args[3];
          return {
            type: 'conical',
            origin: placement?.origin,
            axis: placement?.axis,
            refDir: placement?.refDir,
            radius: radius,
            halfAngle: halfAngle
          };
        }
        case 'SPHERICAL_SURFACE': {
          const placement = this.getAxisPlacement(entity.args[1], entities);
          const radius = entity.args[2];
          return {
            type: 'spherical',
            origin: placement?.origin,
            radius: radius
          };
        }
        case 'TOROIDAL_SURFACE': {
          const placement = this.getAxisPlacement(entity.args[1], entities);
          const majorRadius = entity.args[2];
          const minorRadius = entity.args[3];
          return {
            type: 'toroidal',
            origin: placement?.origin,
            axis: placement?.axis,
            refDir: placement?.refDir,
            majorRadius: majorRadius,
            minorRadius: minorRadius
          };
        }
        case 'B_SPLINE_SURFACE_WITH_KNOTS': {
          // Complex B-spline surface parsing
          return {
            type: 'bspline',
            degreeU: entity.args[1],
            degreeV: entity.args[2],
            controlPoints: this._parseControlPointGrid(entity.args[3], entities),
            knotsU: entity.args[8],
            knotsV: entity.args[9],
            multiplicityU: entity.args[6],
            multiplicityV: entity.args[7]
          };
        }
        default:
          return null;
      }
    },
    _parseControlPointGrid(grid, entities) {
      if (!Array.isArray(grid)) return null;

      return grid.map(row => {
        if (!Array.isArray(row)) return [];
        return row.map(ptRef => this.getPoint(ptRef, entities));
      });
    }
  },
  // MAIN STEP-TO-MESH PIPELINE

  /**
   * Convert parsed STEP data to Three.js compatible mesh
   */
  convertToMesh(stepData, options = {}) {
    const startTime = Date.now();

    const result = {
      success: true,
      meshes: [],
      totalVertices: 0,
      totalTriangles: 0,
      processingTime: 0,
      errors: []
    };
    if (!stepData || !stepData.entities) {
      result.success = false;
      result.errors.push('Invalid STEP data');
      return result;
    }
    const entities = stepData.entities.byId;
    const divisions = options.divisions || 24;

    try {
      // Process each solid/shell
      const shells = Object.values(entities).filter(e =>
        e.type === 'CLOSED_SHELL' || e.type === 'OPEN_SHELL'
      );

      for (const shell of shells) {
        const shellMesh = this._processShell(shell, entities, divisions);
        if (shellMesh) {
          result.meshes.push(shellMesh);
          result.totalVertices += shellMesh.vertices.length / 3;
          result.totalTriangles += shellMesh.indices.length / 3;
        }
      }
      // If no shells found, try to process faces directly
      if (result.meshes.length === 0) {
        const faces = Object.values(entities).filter(e => e.type === 'ADVANCED_FACE');

        const combinedMesh = {
          name: 'combined',
          vertices: [],
          normals: [],
          indices: []
        };
        let indexOffset = 0;

        for (const face of faces) {
          const faceMesh = this._processFace(face, entities, divisions);
          if (faceMesh && faceMesh.vertices.length > 0) {
            combinedMesh.vertices.push(...faceMesh.vertices);
            combinedMesh.normals.push(...faceMesh.normals);

            for (const idx of faceMesh.indices) {
              combinedMesh.indices.push(idx + indexOffset);
            }
            indexOffset += faceMesh.vertices.length / 3;
          }
        }
        if (combinedMesh.vertices.length > 0) {
          result.meshes.push(combinedMesh);
          result.totalVertices = combinedMesh.vertices.length / 3;
          result.totalTriangles = combinedMesh.indices.length / 3;
        }
      }
    } catch (err) {
      result.success = false;
      result.errors.push(err.message);
      console.error('[STEP_TO_MESH] Error:', err);
    }
    result.processingTime = Date.now() - startTime;
    return result;
  },
  _processShell(shell, entities, divisions) {
    const faceRefs = shell.args[1];
    if (!Array.isArray(faceRefs)) return null;

    const mesh = {
      name: shell.args[0] || 'shell_' + shell.id,
      vertices: [],
      normals: [],
      indices: []
    };
    let indexOffset = 0;

    for (const faceRef of faceRefs) {
      const faceEntity = this.entityResolver.resolve(faceRef, entities);
      if (!faceEntity) continue;

      const faceMesh = this._processFace(faceEntity, entities, divisions);
      if (faceMesh && faceMesh.vertices.length > 0) {
        mesh.vertices.push(...faceMesh.vertices);
        mesh.normals.push(...faceMesh.normals);

        for (const idx of faceMesh.indices) {
          mesh.indices.push(idx + indexOffset);
        }
        indexOffset += faceMesh.vertices.length / 3;
      }
    }
    return mesh;
  },
  _processFace(face, entities, divisions) {
    if (face.type !== 'ADVANCED_FACE') return null;

    // Get the underlying surface
    const surfaceRef = face.args[2];
    const surfaceData = this.entityResolver.getSurfaceData(surfaceRef, entities);

    if (!surfaceData) {
      // Unknown surface type - skip
      return { vertices: [], normals: [], indices: [] };
    }
    // Get face bounds for trimming (simplified - full implementation would use trim curves)
    const bounds = face.args[1];
    // TODO: Implement trimmed surface handling

    // Tessellate the surface
    const tessResult = this.tessellator.tessellateSurface(surfaceData, { divisions });

    // Apply sameSense flag (flip normals if needed)
    const sameSense = face.args[3];
    if (sameSense === false || sameSense === '.F.') {
      for (let i = 0; i < tessResult.normals.length; i++) {
        tessResult.normals[i] = -tessResult.normals[i];
      }
      // Also flip triangle winding
      for (let i = 0; i < tessResult.indices.length; i += 3) {
        const tmp = tessResult.indices[i + 1];
        tessResult.indices[i + 1] = tessResult.indices[i + 2];
        tessResult.indices[i + 2] = tmp;
      }
    }
    return tessResult;
  },
  // THREE.JS INTEGRATION

  /**
   * Create Three.js geometry from mesh data
   */
  createThreeGeometry(meshData) {
    if (typeof THREE === 'undefined') {
      console.error('[STEP_TO_MESH] Three.js not loaded');
      return null;
    }
    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute('position',
      new THREE.Float32BufferAttribute(meshData.vertices, 3));

    if (meshData.normals && meshData.normals.length > 0) {
      geometry.setAttribute('normal',
        new THREE.Float32BufferAttribute(meshData.normals, 3));
    } else {
      geometry.computeVertexNormals();
    }
    if (meshData.indices && meshData.indices.length > 0) {
      geometry.setIndex(meshData.indices);
    }
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
  },
  /**
   * Create complete Three.js mesh with material
   */
  createThreeMesh(meshData, options = {}) {
    const geometry = this.createThreeGeometry(meshData);
    if (!geometry) return null;

    const material = new THREE.MeshPhongMaterial({
      color: options.color || 0x888899,
      metalness: options.metalness || 0.7,
      roughness: options.roughness || 0.4,
      side: THREE.DoubleSide,
      flatShading: options.flatShading || false
    });

    return new THREE.Mesh(geometry, material);
  },
  /**
   * Create Three.js group from full STEP conversion
   */
  createThreeGroup(meshResult, options = {}) {
    if (!meshResult || !meshResult.meshes) return null;

    const group = new THREE.Group();

    const colors = [0x888899, 0x778888, 0x887788, 0x889988, 0x988888];

    meshResult.meshes.forEach((meshData, i) => {
      const mesh = this.createThreeMesh(meshData, {
        color: options.color || colors[i % colors.length],
        ...options
      });
      if (mesh) {
        mesh.name = meshData.name;
        group.add(mesh);
      }
    });

    return group;
  },
  // INITIALIZATION & INTEGRATION

  init() {
    console.log('[STEP_TO_MESH_KERNEL] Initializing...');

    // Connect to existing STEP parser
    if (typeof ADVANCED_CAD_RECOGNITION_ENGINE !== 'undefined') {
      ADVANCED_CAD_RECOGNITION_ENGINE.toMesh = (stepData, options) => {
        return this.convertToMesh(stepData, options);
      };
      ADVANCED_CAD_RECOGNITION_ENGINE.toThreeGeometry = (stepData, options) => {
        const meshResult = this.convertToMesh(stepData, options);
        return this.createThreeGroup(meshResult, options);
      };
      console.log('[STEP_TO_MESH_KERNEL] ✓ Connected to ADVANCED_CAD_RECOGNITION_ENGINE');
    }
    // Connect to machine 3D system
    if (typeof PRISM_MACHINE_3D_SYSTEM !== 'undefined') {
      PRISM_MACHINE_3D_SYSTEM.loadSTEPMesh = async (file) => {
        const parseResult = await ADVANCED_CAD_RECOGNITION_ENGINE.stepParser.parse(file);
        return this.convertToMesh(parseResult);
      };
      console.log('[STEP_TO_MESH_KERNEL] ✓ Connected to PRISM_MACHINE_3D_SYSTEM');
    }
    // Global access
    window.PRISM_STEP_TO_MESH_KERNEL = this;
    window.stepToMesh = (stepData, options) => this.convertToMesh(stepData, options);
    window.stepToThree = (stepData, options) => {
      const result = this.convertToMesh(stepData, options);
      return this.createThreeGroup(result, options);
    };
    console.log('[STEP_TO_MESH_KERNEL] ✓ Initialized');
    console.log('[STEP_TO_MESH_KERNEL]   - Surface types: plane, cylinder, cone, sphere, torus, bspline');
    console.log('[STEP_TO_MESH_KERNEL]   - NURBS evaluation: Cox-de Boor basis functions');
    console.log('[STEP_TO_MESH_KERNEL]   - Output: Three.js BufferGeometry compatible');

    return this;
  }
}