const PRISM_BREP_TESSELLATOR = {
  version: '1.0.0',
  courseBasis: 'MIT 18.433 - Computational Geometry',

  /**
   * Tessellate a complete B-Rep solid into triangle mesh
   */
  tessellateBrep(stepData, entityMap, options = {}) {
    console.log('[B-Rep Tessellator] Starting tessellation...');
    const startTime = performance.now();

    const result = {
      vertices: [],
      normals: [],
      triangles: [],
      faceInfo: [],  // Per-triangle face mapping
      statistics: {
        faces: 0,
        triangles: 0,
        vertices: 0
      }
    };
    // Find all ADVANCED_FACE entities
    const faces = stepData.byType.get('ADVANCED_FACE') || [];

    faces.forEach((face, faceIdx) => {
      try {
        const faceMesh = this.tessellateFace(face, entityMap, options);

        // Add vertices and normals
        const vertexOffset = result.vertices.length;
        result.vertices.push(...faceMesh.vertices);
        result.normals.push(...faceMesh.normals);

        // Add triangles with offset
        faceMesh.triangles.forEach(tri => {
          result.triangles.push([
            tri[0] + vertexOffset,
            tri[1] + vertexOffset,
            tri[2] + vertexOffset
          ]);
          result.faceInfo.push(faceIdx);
        });

        result.statistics.faces++;
      } catch (err) {
        console.warn(`[Tessellator] Failed to tessellate face #${face.id}:`, err.message);
      }
    });

    result.statistics.triangles = result.triangles.length;
    result.statistics.vertices = result.vertices.length;

    const time = performance.now() - startTime;
    console.log(`[B-Rep Tessellator] Generated ${result.statistics.triangles} triangles from ${result.statistics.faces} faces in ${time.toFixed(1)}ms`);

    return result;
  },
  /**
   * Tessellate a single ADVANCED_FACE
   */
  tessellateFace(face, entityMap, options = {}) {
    const { resolution = 20 } = options;

    // Get the surface geometry
    const surfaceRef = face.args[2]?.ref;
    const surface = entityMap.get(surfaceRef);

    if (!surface) {
      throw new Error(`Surface #${surfaceRef} not found`);
    }
    // Get the bounds (loops)
    const boundsRefs = face.args[1];
    const sameSense = face.args[3];

    // Tessellate based on surface type
    switch (surface.type) {
      case 'PLANE':
        return this.tessellatePlanarFace(face, surface, entityMap, options);

      case 'CYLINDRICAL_SURFACE':
        return this.tessellateCylindricalFace(face, surface, entityMap, options);

      case 'CONICAL_SURFACE':
        return this.tessellateConicalFace(face, surface, entityMap, options);

      case 'SPHERICAL_SURFACE':
        return this.tessellateSphericalFace(face, surface, entityMap, options);

      case 'TOROIDAL_SURFACE':
        return this.tessellateToroidalFace(face, surface, entityMap, options);

      case 'B_SPLINE_SURFACE_WITH_KNOTS':
      case 'B_SPLINE_SURFACE':
      case 'RATIONAL_B_SPLINE_SURFACE':
        return this.tessellateBSplineFace(face, surface, entityMap, options);

      default:
        console.warn(`[Tessellator] Unsupported surface type: ${surface.type}`);
        return { vertices: [], normals: [], triangles: [] };
    }
  },
  /**
   * Tessellate a planar face
   */
  tessellatePlanarFace(face, surface, entityMap, options) {
    const vertices = [];
    const normals = [];
    const triangles = [];

    // Get plane placement
    const placementRef = surface.args[1]?.ref;
    const placement = this.getPlacement(placementRef, entityMap);

    // Get the outer bound loop
    const boundsRefs = face.args[1] || [];
    const loopVertices = [];

    boundsRefs.forEach(boundRef => {
      const bound = entityMap.get(boundRef.ref);
      if (!bound) return;

      const loopRef = bound.args[1]?.ref;
      const loop = entityMap.get(loopRef);
      if (!loop || loop.type !== 'EDGE_LOOP') return;

      const loopPoints = this.extractLoopVertices(loop, entityMap);
      loopVertices.push(...loopPoints);
    });

    if (loopVertices.length < 3) {
      return { vertices: [], normals: [], triangles: [] };
    }
    // Project to 2D for triangulation
    const projected = this.projectTo2D(loopVertices, placement);

    // Triangulate the polygon (ear clipping - MIT 18.433)
    const triIndices = this.earClipTriangulate(projected);

    // Build output
    loopVertices.forEach(v => {
      vertices.push(v);
      normals.push({ ...placement.normal });
    });

    triIndices.forEach(tri => {
      triangles.push(tri);
    });

    return { vertices, normals, triangles };
  },
  /**
   * Tessellate a cylindrical surface face
   */
  tessellateCylindricalFace(face, surface, entityMap, options) {
    const { resolution = 24 } = options;
    const vertices = [];
    const normals = [];
    const triangles = [];

    // Get cylinder parameters
    const placementRef = surface.args[1]?.ref;
    const placement = this.getPlacement(placementRef, entityMap);
    const radius = surface.args[2];

    // Get bounds to determine angular extent and height
    const bounds = this.extractFaceBounds(face, entityMap);

    // Default to full cylinder if bounds not determinable
    const startAngle = bounds.startAngle ?? 0;
    const endAngle = bounds.endAngle ?? (2 * Math.PI);
    const minZ = bounds.minZ ?? 0;
    const maxZ = bounds.maxZ ?? 10;

    const angleRange = endAngle - startAngle;
    const heightRange = maxZ - minZ;

    const numCirc = Math.max(4, Math.ceil(resolution * angleRange / (2 * Math.PI)));
    const numHeight = Math.max(2, Math.ceil(resolution * heightRange / 50));

    // Generate vertices
    for (let i = 0; i <= numCirc; i++) {
      const angle = startAngle + (i / numCirc) * angleRange;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      for (let j = 0; j <= numHeight; j++) {
        const z = minZ + (j / numHeight) * heightRange;

        // Local coordinates
        const localX = radius * cos;
        const localY = radius * sin;
        const localZ = z;

        // Transform to world coordinates
        const world = this.transformPoint({ x: localX, y: localY, z: localZ }, placement);
        vertices.push(world);

        // Normal points radially outward
        const normalLocal = { x: cos, y: sin, z: 0 };
        const normal = this.transformVector(normalLocal, placement);
        normals.push(normal);
      }
    }
    // Generate triangles
    for (let i = 0; i < numCirc; i++) {
      for (let j = 0; j < numHeight; j++) {
        const idx = i * (numHeight + 1) + j;
        const next = (i + 1) * (numHeight + 1) + j;

        triangles.push([idx, next, idx + 1]);
        triangles.push([next, next + 1, idx + 1]);
      }
    }
    return { vertices, normals, triangles };
  },
  /**
   * Tessellate a conical surface face
   */
  tessellateConicalFace(face, surface, entityMap, options) {
    const { resolution = 24 } = options;
    const vertices = [];
    const normals = [];
    const triangles = [];

    const placementRef = surface.args[1]?.ref;
    const placement = this.getPlacement(placementRef, entityMap);
    const baseRadius = surface.args[2];
    const semiAngle = surface.args[3]; // Radians

    // Cone expands/contracts as Z changes
    const tanAngle = Math.tan(semiAngle);

    const bounds = this.extractFaceBounds(face, entityMap);
    const minZ = bounds.minZ ?? 0;
    const maxZ = bounds.maxZ ?? 10;

    const numCirc = Math.max(4, resolution);
    const numHeight = Math.max(2, Math.ceil(resolution / 2));

    for (let i = 0; i <= numCirc; i++) {
      const angle = (i / numCirc) * 2 * Math.PI;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      for (let j = 0; j <= numHeight; j++) {
        const z = minZ + (j / numHeight) * (maxZ - minZ);
        const r = baseRadius + z * tanAngle;

        const localX = r * cos;
        const localY = r * sin;

        const world = this.transformPoint({ x: localX, y: localY, z }, placement);
        vertices.push(world);

        // Normal for cone
        const normalLen = Math.sqrt(1 + tanAngle * tanAngle);
        const normalLocal = {
          x: cos / normalLen,
          y: sin / normalLen,
          z: -tanAngle / normalLen
        };
        const normal = this.transformVector(normalLocal, placement);
        normals.push(normal);
      }
    }
    // Triangles
    for (let i = 0; i < numCirc; i++) {
      for (let j = 0; j < numHeight; j++) {
        const idx = i * (numHeight + 1) + j;
        const next = (i + 1) * (numHeight + 1) + j;

        triangles.push([idx, next, idx + 1]);
        triangles.push([next, next + 1, idx + 1]);
      }
    }
    return { vertices, normals, triangles };
  },
  /**
   * Tessellate a spherical surface face
   */
  tessellateSphericalFace(face, surface, entityMap, options) {
    const { resolution = 20 } = options;
    const vertices = [];
    const normals = [];
    const triangles = [];

    const placementRef = surface.args[1]?.ref;
    const placement = this.getPlacement(placementRef, entityMap);
    const radius = surface.args[2];

    const numLat = Math.max(4, resolution);
    const numLon = Math.max(8, resolution * 2);

    for (let i = 0; i <= numLat; i++) {
      const phi = (i / numLat) * Math.PI; // 0 to PI
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let j = 0; j <= numLon; j++) {
        const theta = (j / numLon) * 2 * Math.PI;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        const localX = radius * sinPhi * cosTheta;
        const localY = radius * sinPhi * sinTheta;
        const localZ = radius * cosPhi;

        const world = this.transformPoint({ x: localX, y: localY, z: localZ }, placement);
        vertices.push(world);

        const normalLocal = { x: sinPhi * cosTheta, y: sinPhi * sinTheta, z: cosPhi };
        const normal = this.transformVector(normalLocal, placement);
        normals.push(normal);
      }
    }
    // Triangles
    for (let i = 0; i < numLat; i++) {
      for (let j = 0; j < numLon; j++) {
        const idx = i * (numLon + 1) + j;
        const next = (i + 1) * (numLon + 1) + j;

        if (i > 0) {
          triangles.push([idx, next, idx + 1]);
        }
        if (i < numLat - 1) {
          triangles.push([next, next + 1, idx + 1]);
        }
      }
    }
    return { vertices, normals, triangles };
  },
  /**
   * Tessellate a toroidal surface face (fillets/rounds)
   */
  tessellateToroidalFace(face, surface, entityMap, options) {
    const { resolution = 16 } = options;
    const vertices = [];
    const normals = [];
    const triangles = [];

    const placementRef = surface.args[1]?.ref;
    const placement = this.getPlacement(placementRef, entityMap);
    const majorRadius = surface.args[2];
    const minorRadius = surface.args[3];

    const numMajor = Math.max(8, resolution);
    const numMinor = Math.max(8, resolution);

    for (let i = 0; i <= numMajor; i++) {
      const theta = (i / numMajor) * 2 * Math.PI; // Around the tube
      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);

      for (let j = 0; j <= numMinor; j++) {
        const phi = (j / numMinor) * 2 * Math.PI; // Around the cross-section
        const cosPhi = Math.cos(phi);
        const sinPhi = Math.sin(phi);

        // Point on torus
        const x = (majorRadius + minorRadius * cosPhi) * cosTheta;
        const y = (majorRadius + minorRadius * cosPhi) * sinTheta;
        const z = minorRadius * sinPhi;

        const world = this.transformPoint({ x, y, z }, placement);
        vertices.push(world);

        // Normal
        const nx = cosPhi * cosTheta;
        const ny = cosPhi * sinTheta;
        const nz = sinPhi;
        const normal = this.transformVector({ x: nx, y: ny, z: nz }, placement);
        normals.push(normal);
      }
    }
    // Triangles
    for (let i = 0; i < numMajor; i++) {
      for (let j = 0; j < numMinor; j++) {
        const idx = i * (numMinor + 1) + j;
        const next = (i + 1) * (numMinor + 1) + j;

        triangles.push([idx, next, idx + 1]);
        triangles.push([next, next + 1, idx + 1]);
      }
    }
    return { vertices, normals, triangles };
  },
  /**
   * Tessellate a B-spline surface face
   */
  tessellateBSplineFace(face, surface, entityMap, options) {
    // Extract B-spline parameters from entity
    const degreeU = surface.args[1];
    const degreeV = surface.args[2];
    const controlPointRefs = surface.args[3]; // 2D array of refs

    // Build control point grid
    const controlGrid = [];
    if (Array.isArray(controlPointRefs)) {
      controlPointRefs.forEach(row => {
        const gridRow = [];
        if (Array.isArray(row)) {
          row.forEach(ref => {
            const pt = entityMap.get(ref.ref);
            if (pt && pt.args && pt.args[1]) {
              const coords = pt.args[1];
              gridRow.push({
                x: coords[0] || 0,
                y: coords[1] || 0,
                z: coords[2] || 0
              });
            }
          });
        }
        if (gridRow.length > 0) {
          controlGrid.push(gridRow);
        }
      });
    }
    if (controlGrid.length < 2 || controlGrid[0].length < 2) {
      return { vertices: [], normals: [], triangles: [] };
    }
    // Get knots
    const knotsU = surface.args[6] || this.generateUniformKnots(controlGrid.length, degreeU);
    const knotsV = surface.args[7] || this.generateUniformKnots(controlGrid[0].length, degreeV);

    // Get weights for NURBS
    const weights = null; // Would extract from RATIONAL_B_SPLINE_SURFACE

    // Use NURBS evaluator for tessellation
    return PRISM_NURBS_EVALUATOR.tessellateSurface(
      controlGrid, weights, knotsU, knotsV, degreeU, degreeV, options
    );
  },
  /**
   * Generate uniform knot vector
   */
  generateUniformKnots(n, degree) {
    const knots = [];
    const numKnots = n + degree + 1;

    for (let i = 0; i < numKnots; i++) {
      if (i < degree + 1) {
        knots.push(0);
      } else if (i >= numKnots - degree - 1) {
        knots.push(1);
      } else {
        knots.push((i - degree) / (numKnots - 2 * degree - 1));
      }
    }
    return knots;
  },
  /**
   * Get placement transformation from AXIS2_PLACEMENT_3D
   */
  getPlacement(placementRef, entityMap) {
    const defaultPlacement = {
      origin: { x: 0, y: 0, z: 0 },
      axis: { x: 0, y: 0, z: 1 },
      refDir: { x: 1, y: 0, z: 0 },
      normal: { x: 0, y: 0, z: 1 }
    };
    if (!placementRef) return defaultPlacement;

    const placement = entityMap.get(placementRef);
    if (!placement || placement.type !== 'AXIS2_PLACEMENT_3D') {
      return defaultPlacement;
    }
    // Get origin
    const originRef = placement.args[1]?.ref;
    const originEnt = entityMap.get(originRef);
    const origin = originEnt?.args?.[1] || [0, 0, 0];

    // Get axis (Z direction)
    const axisRef = placement.args[2]?.ref;
    const axisEnt = entityMap.get(axisRef);
    const axis = axisEnt?.args?.[1] || [0, 0, 1];

    // Get reference direction (X direction)
    const refDirRef = placement.args[3]?.ref;
    const refDirEnt = entityMap.get(refDirRef);
    const refDir = refDirEnt?.args?.[1] || [1, 0, 0];

    return {
      origin: { x: origin[0], y: origin[1], z: origin[2] },
      axis: { x: axis[0], y: axis[1], z: axis[2] },
      refDir: { x: refDir[0], y: refDir[1], z: refDir[2] },
      normal: { x: axis[0], y: axis[1], z: axis[2] }
    };
  },
  /**
   * Transform point from local to world coordinates
   * MIT 18.06: Linear transformations, rotation matrices
   */
  transformPoint(local, placement) {
    // Build rotation matrix from axis and refDir
    const zAxis = this.normalize(placement.axis);
    const xAxis = this.normalize(placement.refDir);
    const yAxis = this.cross(zAxis, xAxis);

    // Apply rotation then translation
    return {
      x: placement.origin.x + local.x * xAxis.x + local.y * yAxis.x + local.z * zAxis.x,
      y: placement.origin.y + local.x * xAxis.y + local.y * yAxis.y + local.z * zAxis.y,
      z: placement.origin.z + local.x * xAxis.z + local.y * yAxis.z + local.z * zAxis.z
    };
  },
  /**
   * Transform vector (no translation, just rotation)
   */
  transformVector(local, placement) {
    const zAxis = this.normalize(placement.axis);
    const xAxis = this.normalize(placement.refDir);
    const yAxis = this.cross(zAxis, xAxis);

    const result = {
      x: local.x * xAxis.x + local.y * yAxis.x + local.z * zAxis.x,
      y: local.x * xAxis.y + local.y * yAxis.y + local.z * zAxis.y,
      z: local.x * xAxis.z + local.y * yAxis.z + local.z * zAxis.z
    };
    return this.normalize(result);
  },
  /**
   * Extract face bounds from edge loops
   */
  extractFaceBounds(face, entityMap) {
    const bounds = {
      startAngle: 0,
      endAngle: 2 * Math.PI,
      minZ: 0,
      maxZ: 10
    };
    // Would parse FACE_BOUND/EDGE_LOOP to get precise bounds
    // For now, return defaults

    return bounds;
  },
  /**
   * Extract vertices from edge loop
   */
  extractLoopVertices(loop, entityMap) {
    const vertices = [];

    const edgeRefs = loop.args[1] || [];
    edgeRefs.forEach(ref => {
      const orientedEdge = entityMap.get(ref.ref);
      if (!orientedEdge) return;

      const edgeRef = orientedEdge.args[3]?.ref;
      const edge = entityMap.get(edgeRef);
      if (!edge) return;

      // Get start vertex
      const startVertRef = edge.args[1]?.ref;
      const startVert = entityMap.get(startVertRef);
      if (startVert) {
        const pointRef = startVert.args[1]?.ref;
        const point = entityMap.get(pointRef);
        if (point && point.args && point.args[1]) {
          const coords = point.args[1];
          vertices.push({
            x: coords[0],
            y: coords[1],
            z: coords[2] || 0
          });
        }
      }
    });

    return vertices;
  },
  /**
   * Project 3D points to 2D using placement as projection plane
   */
  projectTo2D(points3d, placement) {
    const zAxis = this.normalize(placement.axis);
    const xAxis = this.normalize(placement.refDir);
    const yAxis = this.cross(zAxis, xAxis);

    return points3d.map(p => {
      const rel = {
        x: p.x - placement.origin.x,
        y: p.y - placement.origin.y,
        z: p.z - placement.origin.z
      };
      return {
        x: rel.x * xAxis.x + rel.y * xAxis.y + rel.z * xAxis.z,
        y: rel.x * yAxis.x + rel.y * yAxis.y + rel.z * yAxis.z
      };
    });
  },
  /**
   * Ear clipping polygon triangulation
   * MIT 18.433: Computational Geometry - O(n²) simple polygon triangulation
   */
  earClipTriangulate(polygon2d) {
    const triangles = [];
    const n = polygon2d.length;

    if (n < 3) return triangles;
    if (n === 3) return [[0, 1, 2]];

    // Create index array
    const indices = [];
    for (let i = 0; i < n; i++) indices.push(i);

    // Determine winding order
    const area = this.signedArea(polygon2d);
    const ccw = area > 0;

    let remaining = n;
    let i = 0;
    let failCount = 0;

    while (remaining > 3 && failCount < remaining) {
      const prev = indices[(i - 1 + remaining) % remaining];
      const curr = indices[i % remaining];
      const next = indices[(i + 1) % remaining];

      const p0 = polygon2d[prev];
      const p1 = polygon2d[curr];
      const p2 = polygon2d[next];

      // Check if this is an ear
      if (this.isEar(polygon2d, indices, prev, curr, next, ccw)) {
        triangles.push([prev, curr, next]);

        // Remove curr from indices
        indices.splice(i % remaining, 1);
        remaining--;
        failCount = 0;

        if (i >= remaining) i = 0;
      } else {
        i++;
        failCount++;
      }
    }
    // Last triangle
    if (remaining === 3) {
      triangles.push([indices[0], indices[1], indices[2]]);
    }
    return triangles;
  },
  /**
   * Check if vertex is an ear (can be clipped)
   */
  isEar(polygon, indices, prev, curr, next, ccw) {
    const p0 = polygon[prev];
    const p1 = polygon[curr];
    const p2 = polygon[next];

    // Check convexity
    const cross = (p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x);
    if ((ccw && cross <= 0) || (!ccw && cross >= 0)) {
      return false;
    }
    // Check that no other vertices are inside the triangle
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      if (idx === prev || idx === curr || idx === next) continue;

      if (this.pointInTriangle(polygon[idx], p0, p1, p2)) {
        return false;
      }
    }
    return true;
  },
  /**
   * Point in triangle test using barycentric coordinates
   */
  pointInTriangle(p, a, b, c) {
    const v0 = { x: c.x - a.x, y: c.y - a.y };
    const v1 = { x: b.x - a.x, y: b.y - a.y };
    const v2 = { x: p.x - a.x, y: p.y - a.y };

    const dot00 = v0.x * v0.x + v0.y * v0.y;
    const dot01 = v0.x * v1.x + v0.y * v1.y;
    const dot02 = v0.x * v2.x + v0.y * v2.y;
    const dot11 = v1.x * v1.x + v1.y * v1.y;
    const dot12 = v1.x * v2.x + v1.y * v2.y;

    const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    return (u >= 0) && (v >= 0) && (u + v < 1);
  },
  /**
   * Calculate signed area of polygon
   */
  signedArea(polygon) {
    let area = 0;
    const n = polygon.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += polygon[i].x * polygon[j].y;
      area -= polygon[j].x * polygon[i].y;
    }
    return area / 2;
  },
  // Vector utilities
  normalize(v) {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len < 1e-10) return { x: 0, y: 0, z: 1 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  },
  cross(a, b) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };
  }
}