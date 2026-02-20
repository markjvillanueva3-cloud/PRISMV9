const PRISM_ENHANCED_COLLISION_ENGINE = {
  name: 'PRISM_ENHANCED_COLLISION_ENGINE',
  version: '1.0.0',
  description: 'Complete collision detection with gouge prevention',

  checkToolAssembly(toolAssembly, workpiece, machine, position) {
    const result = { hasCollision: false, collisions: [], gougePoints: [], nearMisses: [], safetyMargin: Infinity };
    const checks = [
      { name: 'cutter', mesh: toolAssembly.cutter, critical: true },
      { name: 'holder', mesh: toolAssembly.holder, critical: true },
      { name: 'spindle', mesh: toolAssembly.spindle, critical: false },
      { name: 'collet', mesh: toolAssembly.collet, critical: true }
    ];

    for (const check of checks) {
      if (!check.mesh) continue;
      const transformedMesh = this._transformMesh(check.mesh, position);

      const wpCollision = this._meshMeshCollision(transformedMesh, workpiece.mesh);
      if (wpCollision.hasCollision) {
        result.hasCollision = true;
        result.collisions.push({
          component: check.name, target: 'workpiece',
          points: wpCollision.points, depth: wpCollision.maxDepth, critical: check.critical
        });
      }
      if (workpiece.fixtures) {
        for (const fixture of workpiece.fixtures) {
          const fxCollision = this._meshMeshCollision(transformedMesh, fixture.mesh);
          if (fxCollision.hasCollision) {
            result.hasCollision = true;
            result.collisions.push({
              component: check.name, target: 'fixture', fixtureId: fixture.id,
              points: fxCollision.points, depth: fxCollision.maxDepth, critical: true
            });
          }
        }
      }
      const margin = this._calculateSafetyMargin(transformedMesh, workpiece, machine);
      result.safetyMargin = Math.min(result.safetyMargin, margin);
    }
    return result;
  },
  checkGouge(toolpath, surface, tool, tolerance = 0.001) {
    const gouges = [];
    const toolRadius = tool.diameter / 2, cornerRadius = tool.cornerRadius || 0;
    const points = toolpath.points || toolpath;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.type === 'rapid') continue;

      if (typeof PRISM_NURBS_LIBRARY !== 'undefined') {
        const closest = PRISM_NURBS_LIBRARY.surface.closestPoint(surface, p);
        const surfacePoint = closest.point;
        const surfaceNormal = PRISM_NURBS_LIBRARY.surface.normal(surface, closest.u, closest.v);

        const dist = (p.x - surfacePoint.x) * surfaceNormal.x +
                     (p.y - surfacePoint.y) * surfaceNormal.y +
                     (p.z - surfacePoint.z) * surfaceNormal.z;
        const expectedDist = toolRadius;
        const deviation = dist - expectedDist;

        if (deviation < -tolerance) {
          gouges.push({
            pointIndex: i, position: p, surfacePoint,
            gougeDepth: -deviation, surfaceNormal
          });
        }
      }
    }
    return {
      hasGouge: gouges.length > 0,
      gouges,
      maxGougeDepth: gouges.length > 0 ? Math.max(...gouges.map(g => g.gougeDepth)) : 0
    };
  },
  correctGouges(toolpath, surface, tool, tolerance = 0.001) {
    const corrected = JSON.parse(JSON.stringify(toolpath));
    const points = corrected.points || corrected;
    const toolRadius = tool.diameter / 2;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.type === 'rapid') continue;
      const safeZ = this._findSafeZ(surface, p.x, p.y, toolRadius, tolerance);
      if (p.z < safeZ) { p.z = safeZ; p.corrected = true; }
    }
    return corrected;
  },
  buildMachineModel(machineDefinition) {
    const model = { components: [], kinematics: machineDefinition.kinematics, limits: machineDefinition.limits };
    const components = ['base', 'column', 'headstock', 'table', 'aAxis', 'cAxis', 'spindle'];

    for (const comp of components) {
      if (machineDefinition[comp]) {
        model.components.push({
          name: comp,
          mesh: this._buildSimpleMesh(machineDefinition[comp]),
          transform: machineDefinition[comp].transform || this._identityMatrix()
        });
      }
    }
    return model;
  },
  buildCollisionTree(mesh) {
    const triangles = [];
    const { vertices, indices } = mesh;
    for (let i = 0; i < indices.length; i += 3) {
      triangles.push({ v0: vertices[indices[i]], v1: vertices[indices[i + 1]], v2: vertices[indices[i + 2]] });
    }
    return this._buildOBBTree(triangles, 0);
  },
  _meshMeshCollision(meshA, meshB) {
    const result = { hasCollision: false, points: [], maxDepth: 0 };
    if (!meshA || !meshB) return result;

    const trisA = this._getTriangles(meshA), trisB = this._getTriangles(meshB);
    const bvhB = this._buildAABBTree(trisB);

    for (const triA of trisA) {
      const triAABB = this._triangleAABB(triA);
      const candidates = this._queryBVH(bvhB, triAABB);

      for (const triB of candidates) {
        const intersection = this._triangleTriangleIntersection(triA, triB);
        if (intersection) {
          result.hasCollision = true;
          result.points.push(intersection.point);
          result.maxDepth = Math.max(result.maxDepth, intersection.depth || 0);
        }
      }
    }
    return result;
  },
  _transformMesh(mesh, position) {
    const { vertices, indices } = mesh;
    const transformedVertices = vertices.map(v => {
      const tv = { x: v.x + position.x, y: v.y + position.y, z: v.z + position.z };
      if (position.A !== undefined || position.B !== undefined || position.C !== undefined) {
        this._rotatePoint(tv, position);
      }
      return tv;
    });
    return { vertices: transformedVertices, indices };
  },
  _rotatePoint(point, angles) {
    const { A = 0, B = 0, C = 0 } = angles;
    if (A !== 0) {
      const cosA = Math.cos(A * Math.PI / 180), sinA = Math.sin(A * Math.PI / 180);
      const y = point.y * cosA - point.z * sinA, z = point.y * sinA + point.z * cosA;
      point.y = y; point.z = z;
    }
    if (B !== 0) {
      const cosB = Math.cos(B * Math.PI / 180), sinB = Math.sin(B * Math.PI / 180);
      const x = point.x * cosB + point.z * sinB, z = -point.x * sinB + point.z * cosB;
      point.x = x; point.z = z;
    }
    if (C !== 0) {
      const cosC = Math.cos(C * Math.PI / 180), sinC = Math.sin(C * Math.PI / 180);
      const x = point.x * cosC - point.y * sinC, y = point.x * sinC + point.y * cosC;
      point.x = x; point.y = y;
    }
  },
  _calculateSafetyMargin(mesh, workpiece, machine) {
    let minDist = Infinity;
    if (!mesh || !mesh.vertices) return minDist;

    if (workpiece && workpiece.mesh) {
      for (const v of mesh.vertices) {
        const dist = this._pointToMeshDistance(v, workpiece.mesh);
        minDist = Math.min(minDist, dist);
      }
    }
    return minDist;
  },
  _pointToMeshDistance(point, mesh) {
    let minDist = Infinity;
    const tris = this._getTriangles(mesh);
    for (const tri of tris) {
      const dist = this._pointToTriangleDistance(point, tri);
      minDist = Math.min(minDist, dist);
    }
    return minDist;
  },
  _pointToTriangleDistance(point, tri) {
    const { v0, v1, v2 } = tri;
    const ab = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
    const ac = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
    const normal = {
      x: ab.y * ac.z - ab.z * ac.y,
      y: ab.z * ac.x - ab.x * ac.z,
      z: ab.x * ac.y - ab.y * ac.x
    };
    const len = Math.sqrt(normal.x*normal.x + normal.y*normal.y + normal.z*normal.z);
    if (len > 1e-10) {
      const ap = { x: point.x - v0.x, y: point.y - v0.y, z: point.z - v0.z };
      return Math.abs(ap.x * normal.x + ap.y * normal.y + ap.z * normal.z) / len;
    }
    return Infinity;
  },
  _findSafeZ(surface, x, y, toolRadius, tolerance) {
    let safeZ = -Infinity;
    if (typeof PRISM_NURBS_LIBRARY !== 'undefined') {
      for (let dx = -toolRadius; dx <= toolRadius; dx += toolRadius / 4) {
        for (let dy = -toolRadius; dy <= toolRadius; dy += toolRadius / 4) {
          if (dx*dx + dy*dy > toolRadius*toolRadius) continue;
          const result = PRISM_NURBS_LIBRARY.surface.closestPoint(surface, { x: x + dx, y: y + dy, z: 0 });
          if (result.point) {
            const requiredZ = result.point.z + toolRadius + tolerance;
            safeZ = Math.max(safeZ, requiredZ);
          }
        }
      }
    }
    return safeZ;
  },
  _getTriangles(mesh) {
    const triangles = [];
    if (!mesh || !mesh.vertices || !mesh.indices) return triangles;
    const { vertices, indices } = mesh;
    for (let i = 0; i < indices.length; i += 3) {
      triangles.push({ v0: vertices[indices[i]], v1: vertices[indices[i + 1]], v2: vertices[indices[i + 2]] });
    }
    return triangles;
  },
  _triangleAABB(tri) {
    const { v0, v1, v2 } = tri;
    return {
      min: { x: Math.min(v0.x, v1.x, v2.x), y: Math.min(v0.y, v1.y, v2.y), z: Math.min(v0.z, v1.z, v2.z) },
      max: { x: Math.max(v0.x, v1.x, v2.x), y: Math.max(v0.y, v1.y, v2.y), z: Math.max(v0.z, v1.z, v2.z) }
    };
  },
  _buildAABBTree(triangles) {
    if (triangles.length <= 4) return { triangles, isLeaf: true };

    let bounds = { min: { x: Infinity, y: Infinity, z: Infinity }, max: { x: -Infinity, y: -Infinity, z: -Infinity } };
    for (const tri of triangles) {
      const aabb = this._triangleAABB(tri);
      bounds.min.x = Math.min(bounds.min.x, aabb.min.x); bounds.min.y = Math.min(bounds.min.y, aabb.min.y); bounds.min.z = Math.min(bounds.min.z, aabb.min.z);
      bounds.max.x = Math.max(bounds.max.x, aabb.max.x); bounds.max.y = Math.max(bounds.max.y, aabb.max.y); bounds.max.z = Math.max(bounds.max.z, aabb.max.z);
    }
    const size = { x: bounds.max.x - bounds.min.x, y: bounds.max.y - bounds.min.y, z: bounds.max.z - bounds.min.z };
    const axis = size.x > size.y ? (size.x > size.z ? 'x' : 'z') : (size.y > size.z ? 'y' : 'z');

    triangles.sort((a, b) => {
      const ca = (a.v0[axis] + a.v1[axis] + a.v2[axis]) / 3;
      const cb = (b.v0[axis] + b.v1[axis] + b.v2[axis]) / 3;
      return ca - cb;
    });

    const mid = Math.floor(triangles.length / 2);
    return {
      bounds,
      left: this._buildAABBTree(triangles.slice(0, mid)),
      right: this._buildAABBTree(triangles.slice(mid)),
      isLeaf: false
    };
  },
  _queryBVH(node, aabb) {
    const results = [];
    if (node.isLeaf) return node.triangles;
    if (this._aabbIntersects(node.bounds, aabb)) {
      results.push(...this._queryBVH(node.left, aabb));
      results.push(...this._queryBVH(node.right, aabb));
    }
    return results;
  },
  _aabbIntersects(a, b) {
    return a.min.x <= b.max.x && a.max.x >= b.min.x &&
           a.min.y <= b.max.y && a.max.y >= b.min.y &&
           a.min.z <= b.max.z && a.max.z >= b.min.z;
  },
  _triangleTriangleIntersection(triA, triB) {
    const edge1 = this._sub(triA.v1, triA.v0);
    const edge2 = this._sub(triA.v2, triA.v0);
    const normalA = this._cross(edge1, edge2);

    const dB0 = this._dot(normalA, this._sub(triB.v0, triA.v0));
    const dB1 = this._dot(normalA, this._sub(triB.v1, triA.v0));
    const dB2 = this._dot(normalA, this._sub(triB.v2, triA.v0));

    if ((dB0 > 0 && dB1 > 0 && dB2 > 0) || (dB0 < 0 && dB1 < 0 && dB2 < 0)) return null;

    const center = {
      x: (triA.v0.x + triA.v1.x + triA.v2.x + triB.v0.x + triB.v1.x + triB.v2.x) / 6,
      y: (triA.v0.y + triA.v1.y + triA.v2.y + triB.v0.y + triB.v1.y + triB.v2.y) / 6,
      z: (triA.v0.z + triA.v1.z + triA.v2.z + triB.v0.z + triB.v1.z + triB.v2.z) / 6
    };
    return { point: center, depth: Math.min(Math.abs(dB0), Math.abs(dB1), Math.abs(dB2)) };
  },
  _buildOBBTree(triangles, depth) {
    if (triangles.length <= 2 || depth > 20) return { triangles, isLeaf: true };
    const bounds = this._computeBounds(triangles);
    const size = { x: bounds.max.x - bounds.min.x, y: bounds.max.y - bounds.min.y, z: bounds.max.z - bounds.min.z };
    const axis = size.x > size.y ? (size.x > size.z ? 'x' : 'z') : (size.y > size.z ? 'y' : 'z');
    const mid = (bounds.min[axis] + bounds.max[axis]) / 2;

    const left = triangles.filter(t => (t.v0[axis] + t.v1[axis] + t.v2[axis]) / 3 < mid);
    const right = triangles.filter(t => (t.v0[axis] + t.v1[axis] + t.v2[axis]) / 3 >= mid);

    if (left.length === 0 || right.length === 0) return { triangles, bounds, isLeaf: true };
    return { bounds, left: this._buildOBBTree(left, depth + 1), right: this._buildOBBTree(right, depth + 1), isLeaf: false };
  },
  _computeBounds(triangles) {
    const bounds = { min: { x: Infinity, y: Infinity, z: Infinity }, max: { x: -Infinity, y: -Infinity, z: -Infinity } };
    for (const tri of triangles) {
      for (const v of [tri.v0, tri.v1, tri.v2]) {
        bounds.min.x = Math.min(bounds.min.x, v.x); bounds.min.y = Math.min(bounds.min.y, v.y); bounds.min.z = Math.min(bounds.min.z, v.z);
        bounds.max.x = Math.max(bounds.max.x, v.x); bounds.max.y = Math.max(bounds.max.y, v.y); bounds.max.z = Math.max(bounds.max.z, v.z);
      }
    }
    return bounds;
  },
  _buildSimpleMesh(component) {
    if (component.mesh) return component.mesh;
    if (component.dimensions) return this._createBoxMesh(component.dimensions);
    return { vertices: [], indices: [] };
  },
  _createBoxMesh({ x, y, z }) {
    const hx = x / 2, hy = y / 2, hz = z / 2;
    const vertices = [
      { x: -hx, y: -hy, z: -hz }, { x: hx, y: -hy, z: -hz }, { x: hx, y: hy, z: -hz }, { x: -hx, y: hy, z: -hz },
      { x: -hx, y: -hy, z: hz }, { x: hx, y: -hy, z: hz }, { x: hx, y: hy, z: hz }, { x: -hx, y: hy, z: hz }
    ];
    const indices = [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 2, 6, 7, 2, 7, 3, 0, 3, 7, 0, 7, 4, 1, 5, 6, 1, 6, 2];
    return { vertices, indices };
  },
  _identityMatrix() { return [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]; },
  _sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; },
  _cross(a, b) { return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }; },
  _dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
}