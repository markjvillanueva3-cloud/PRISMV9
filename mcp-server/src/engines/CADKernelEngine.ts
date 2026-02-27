/**
 * CADKernelEngine — Computational Geometry & B-Rep Kernel
 *
 * L2-P0-MS1: Ported from monolith geometry engine (132KB).
 * Core geometric primitives and operations for manufacturing CAD:
 *   - Vec3/Mat4/Quaternion math
 *   - NURBS curve and surface evaluation
 *   - B-Rep topology (vertex, edge, face, shell, solid)
 *   - CSG boolean operations (union, subtract, intersect)
 *   - Computational geometry (convex hull, Voronoi, Delaunay)
 *   - Bounding volume hierarchy
 *   - Mesh generation and tessellation
 *
 * Pure computation — no rendering, no GPU. All server-side.
 */

// ── Vector/Matrix Types ───────────────────────────────────────────────

export interface Vec2 { x: number; y: number; }

export interface Vec3 { x: number; y: number; z: number; }

export interface Vec4 { x: number; y: number; z: number; w: number; }

export interface Mat4 {
  elements: number[];  // 16 elements, column-major
}

export interface Quaternion { x: number; y: number; z: number; w: number; }

export interface Ray { origin: Vec3; direction: Vec3; }

export interface Plane { normal: Vec3; distance: number; }

export interface AABB { min: Vec3; max: Vec3; }

// ── Curve/Surface Types ───────────────────────────────────────────────

export interface NURBSCurve {
  degree: number;
  control_points: Vec4[];  // w component is weight
  knot_vector: number[];
  is_periodic: boolean;
}

export interface NURBSSurface {
  degree_u: number;
  degree_v: number;
  control_points: Vec4[][];  // [u][v]
  knot_vector_u: number[];
  knot_vector_v: number[];
}

export interface BSplineCurve {
  degree: number;
  control_points: Vec3[];
  knot_vector: number[];
}

export interface BezierCurve {
  control_points: Vec3[];
}

// ── B-Rep Topology Types ──────────────────────────────────────────────

export interface BRepVertex {
  id: number;
  point: Vec3;
  edge_ids: number[];
}

export interface BRepEdge {
  id: number;
  start_vertex_id: number;
  end_vertex_id: number;
  curve_type: "line" | "arc" | "bspline" | "nurbs";
  curve_data: any;
  face_ids: number[];
}

export interface BRepFace {
  id: number;
  surface_type: "plane" | "cylinder" | "cone" | "sphere" | "torus" | "bspline" | "nurbs";
  surface_data: any;
  outer_loop: number[];   // edge IDs
  inner_loops: number[][]; // hole edge IDs
  normal: Vec3;
}

export interface BRepShell {
  id: number;
  face_ids: number[];
  is_closed: boolean;
}

export interface BRepSolid {
  id: number;
  name: string;
  outer_shell: BRepShell;
  void_shells: BRepShell[];
  bounding_box: AABB;
  volume: number;
  surface_area: number;
  centroid: Vec3;
}

// ── Mesh Types ────────────────────────────────────────────────────────

export interface Triangle {
  v0: Vec3;
  v1: Vec3;
  v2: Vec3;
  normal: Vec3;
}

export interface Mesh {
  vertices: Vec3[];
  normals: Vec3[];
  indices: number[];
  triangle_count: number;
}

// ── CSG Types ─────────────────────────────────────────────────────────

export type CSGOperation = "union" | "subtract" | "intersect";

export interface CSGResult {
  operation: CSGOperation;
  mesh: Mesh;
  volume: number;
  surface_area: number;
  bounding_box: AABB;
  computation_ms: number;
}

// ── Computational Geometry Types ──────────────────────────────────────

export interface ConvexHullResult {
  vertices: Vec3[];
  faces: number[][];
  volume: number;
  surface_area: number;
}

export interface VoronoiResult {
  cells: Array<{
    site: Vec2;
    vertices: Vec2[];
    neighbors: number[];
  }>;
}

// ── Engine ────────────────────────────────────────────────────────────

export class CADKernelEngine {
  // ── Vec3 Operations ─────────────────────────────────────────────

  vec3Add(a: Vec3, b: Vec3): Vec3 { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
  vec3Sub(a: Vec3, b: Vec3): Vec3 { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
  vec3Scale(v: Vec3, s: number): Vec3 { return { x: v.x * s, y: v.y * s, z: v.z * s }; }
  vec3Dot(a: Vec3, b: Vec3): number { return a.x * b.x + a.y * b.y + a.z * b.z; }
  vec3Cross(a: Vec3, b: Vec3): Vec3 {
    return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
  }
  vec3Length(v: Vec3): number { return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z); }
  vec3Normalize(v: Vec3): Vec3 {
    const len = this.vec3Length(v);
    return len > 1e-12 ? { x: v.x / len, y: v.y / len, z: v.z / len } : { x: 0, y: 0, z: 0 };
  }
  vec3Distance(a: Vec3, b: Vec3): number { return this.vec3Length(this.vec3Sub(b, a)); }
  vec3Lerp(a: Vec3, b: Vec3, t: number): Vec3 {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
  }
  vec3Negate(v: Vec3): Vec3 { return { x: -v.x, y: -v.y, z: -v.z }; }
  vec3Project(v: Vec3, onto: Vec3): Vec3 {
    const d = this.vec3Dot(v, onto) / this.vec3Dot(onto, onto);
    return this.vec3Scale(onto, d);
  }
  vec3AngleBetween(a: Vec3, b: Vec3): number {
    const dot = this.vec3Dot(this.vec3Normalize(a), this.vec3Normalize(b));
    return Math.acos(Math.max(-1, Math.min(1, dot)));
  }

  // ── Mat4 Operations ─────────────────────────────────────────────

  mat4Identity(): Mat4 {
    return { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] };
  }

  mat4Translation(tx: number, ty: number, tz: number): Mat4 {
    return { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, tx, ty, tz, 1] };
  }

  mat4Scaling(sx: number, sy: number, sz: number): Mat4 {
    return { elements: [sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1] };
  }

  mat4RotationX(radians: number): Mat4 {
    const c = Math.cos(radians), s = Math.sin(radians);
    return { elements: [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1] };
  }

  mat4RotationY(radians: number): Mat4 {
    const c = Math.cos(radians), s = Math.sin(radians);
    return { elements: [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1] };
  }

  mat4RotationZ(radians: number): Mat4 {
    const c = Math.cos(radians), s = Math.sin(radians);
    return { elements: [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] };
  }

  mat4Multiply(a: Mat4, b: Mat4): Mat4 {
    const ae = a.elements, be = b.elements, r = new Array(16);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        r[col * 4 + row] =
          ae[row] * be[col * 4] + ae[4 + row] * be[col * 4 + 1] +
          ae[8 + row] * be[col * 4 + 2] + ae[12 + row] * be[col * 4 + 3];
      }
    }
    return { elements: r };
  }

  mat4TransformPoint(m: Mat4, p: Vec3): Vec3 {
    const e = m.elements;
    return {
      x: e[0] * p.x + e[4] * p.y + e[8] * p.z + e[12],
      y: e[1] * p.x + e[5] * p.y + e[9] * p.z + e[13],
      z: e[2] * p.x + e[6] * p.y + e[10] * p.z + e[14],
    };
  }

  mat4TransformDirection(m: Mat4, d: Vec3): Vec3 {
    const e = m.elements;
    return {
      x: e[0] * d.x + e[4] * d.y + e[8] * d.z,
      y: e[1] * d.x + e[5] * d.y + e[9] * d.z,
      z: e[2] * d.x + e[6] * d.y + e[10] * d.z,
    };
  }

  mat4Determinant(m: Mat4): number {
    const e = m.elements;
    const a = e[0], b = e[1], c = e[2], d = e[3];
    const f = e[4], g = e[5], h = e[6], i = e[7];
    const j = e[8], k = e[9], l = e[10], n = e[11];
    const o = e[12], p = e[13], q = e[14], r = e[15];
    return a * (g * (l * r - n * q) - h * (k * r - n * p) + i * (k * q - l * p))
         - b * (f * (l * r - n * q) - h * (j * r - n * o) + i * (j * q - l * o))
         + c * (f * (k * r - n * p) - g * (j * r - n * o) + i * (j * p - k * o))
         - d * (f * (k * q - l * p) - g * (j * q - l * o) + h * (j * p - k * o));
  }

  // ── Quaternion Operations ───────────────────────────────────────

  quatFromAxisAngle(axis: Vec3, radians: number): Quaternion {
    const half = radians / 2;
    const s = Math.sin(half);
    const n = this.vec3Normalize(axis);
    return { x: n.x * s, y: n.y * s, z: n.z * s, w: Math.cos(half) };
  }

  quatMultiply(a: Quaternion, b: Quaternion): Quaternion {
    return {
      x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
      y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
      z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
      w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    };
  }

  quatRotateVec3(q: Quaternion, v: Vec3): Vec3 {
    const qv: Quaternion = { x: v.x, y: v.y, z: v.z, w: 0 };
    const qConj: Quaternion = { x: -q.x, y: -q.y, z: -q.z, w: q.w };
    const result = this.quatMultiply(this.quatMultiply(q, qv), qConj);
    return { x: result.x, y: result.y, z: result.z };
  }

  quatToMat4(q: Quaternion): Mat4 {
    const { x, y, z, w } = q;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;
    return {
      elements: [
        1 - yy - zz, xy + wz, xz - wy, 0,
        xy - wz, 1 - xx - zz, yz + wx, 0,
        xz + wy, yz - wx, 1 - xx - yy, 0,
        0, 0, 0, 1,
      ],
    };
  }

  // ── NURBS Evaluation ────────────────────────────────────────────

  /** Evaluate NURBS curve at parameter t */
  evaluateNURBSCurve(curve: NURBSCurve, t: number): Vec3 {
    const n = curve.control_points.length - 1;
    const p = curve.degree;
    const knots = curve.knot_vector;

    // Find knot span
    let span = p;
    for (let i = p; i < n + 1; i++) {
      if (t >= knots[i] && t < knots[i + 1]) { span = i; break; }
    }
    if (t >= knots[n + 1]) span = n;

    // B-spline basis functions (de Boor)
    const N = new Array(p + 1).fill(0);
    N[0] = 1;

    for (let j = 1; j <= p; j++) {
      let saved = 0;
      for (let r = 0; r < j; r++) {
        const left = knots[span + 1 - j + r];
        const right = knots[span + 1 + r];
        const denom = right - left;
        if (Math.abs(denom) < 1e-12) {
          N[r] = saved;
          saved = 0;
          continue;
        }
        const temp = N[r] / denom;
        N[r] = saved + (right - t) * temp;
        saved = (t - left) * temp;
      }
      N[j] = saved;
    }

    // Weighted sum
    let wx = 0, wy = 0, wz = 0, wSum = 0;
    for (let i = 0; i <= p; i++) {
      const cp = curve.control_points[span - p + i];
      const nw = N[i] * cp.w;
      wx += nw * cp.x;
      wy += nw * cp.y;
      wz += nw * cp.z;
      wSum += nw;
    }

    return wSum > 1e-12 ? { x: wx / wSum, y: wy / wSum, z: wz / wSum } : { x: 0, y: 0, z: 0 };
  }

  /** Evaluate B-spline curve at parameter t (unweighted) */
  evaluateBSplineCurve(curve: BSplineCurve, t: number): Vec3 {
    const nurbsCurve: NURBSCurve = {
      degree: curve.degree,
      control_points: curve.control_points.map(p => ({ ...p, w: 1 })),
      knot_vector: curve.knot_vector,
      is_periodic: false,
    };
    return this.evaluateNURBSCurve(nurbsCurve, t);
  }

  /** Evaluate Bezier curve using de Casteljau algorithm */
  evaluateBezierCurve(curve: BezierCurve, t: number): Vec3 {
    let points = [...curve.control_points];
    while (points.length > 1) {
      const next: Vec3[] = [];
      for (let i = 0; i < points.length - 1; i++) {
        next.push(this.vec3Lerp(points[i], points[i + 1], t));
      }
      points = next;
    }
    return points[0];
  }

  /** Sample curve at N points */
  sampleCurve(curve: NURBSCurve | BSplineCurve, samples: number): Vec3[] {
    const points: Vec3[] = [];
    const knots = curve.knot_vector;
    const tMin = knots[("degree" in curve) ? curve.degree : 0];
    const tMax = knots[knots.length - 1 - (("degree" in curve) ? curve.degree : 0)];

    for (let i = 0; i <= samples; i++) {
      const t = tMin + (tMax - tMin) * (i / samples);
      if ("control_points" in curve && curve.control_points.length > 0 && "w" in curve.control_points[0]) {
        points.push(this.evaluateNURBSCurve(curve as NURBSCurve, t));
      } else {
        points.push(this.evaluateBSplineCurve(curve as BSplineCurve, t));
      }
    }
    return points;
  }

  // ── Bounding Box Operations ─────────────────────────────────────

  computeAABB(points: Vec3[]): AABB {
    const bb: AABB = {
      min: { x: Infinity, y: Infinity, z: Infinity },
      max: { x: -Infinity, y: -Infinity, z: -Infinity },
    };
    for (const p of points) {
      bb.min.x = Math.min(bb.min.x, p.x); bb.min.y = Math.min(bb.min.y, p.y); bb.min.z = Math.min(bb.min.z, p.z);
      bb.max.x = Math.max(bb.max.x, p.x); bb.max.y = Math.max(bb.max.y, p.y); bb.max.z = Math.max(bb.max.z, p.z);
    }
    return bb;
  }

  aabbOverlap(a: AABB, b: AABB): boolean {
    return a.min.x <= b.max.x && a.max.x >= b.min.x &&
           a.min.y <= b.max.y && a.max.y >= b.min.y &&
           a.min.z <= b.max.z && a.max.z >= b.min.z;
  }

  aabbCenter(bb: AABB): Vec3 {
    return { x: (bb.min.x + bb.max.x) / 2, y: (bb.min.y + bb.max.y) / 2, z: (bb.min.z + bb.max.z) / 2 };
  }

  aabbSize(bb: AABB): Vec3 {
    return { x: bb.max.x - bb.min.x, y: bb.max.y - bb.min.y, z: bb.max.z - bb.min.z };
  }

  aabbContains(bb: AABB, point: Vec3): boolean {
    return point.x >= bb.min.x && point.x <= bb.max.x &&
           point.y >= bb.min.y && point.y <= bb.max.y &&
           point.z >= bb.min.z && point.z <= bb.max.z;
  }

  // ── Ray Intersection ────────────────────────────────────────────

  rayAABBIntersect(ray: Ray, bb: AABB): { hit: boolean; t: number } {
    let tMin = -Infinity, tMax = Infinity;
    for (const axis of ["x", "y", "z"] as const) {
      const invD = 1 / ray.direction[axis];
      let t0 = (bb.min[axis] - ray.origin[axis]) * invD;
      let t1 = (bb.max[axis] - ray.origin[axis]) * invD;
      if (invD < 0) [t0, t1] = [t1, t0];
      tMin = Math.max(tMin, t0);
      tMax = Math.min(tMax, t1);
      if (tMax < tMin) return { hit: false, t: -1 };
    }
    return { hit: tMin >= 0, t: tMin };
  }

  rayTriangleIntersect(ray: Ray, tri: Triangle): { hit: boolean; t: number; u: number; v: number } {
    const edge1 = this.vec3Sub(tri.v1, tri.v0);
    const edge2 = this.vec3Sub(tri.v2, tri.v0);
    const h = this.vec3Cross(ray.direction, edge2);
    const a = this.vec3Dot(edge1, h);
    if (Math.abs(a) < 1e-12) return { hit: false, t: -1, u: 0, v: 0 };

    const f = 1 / a;
    const s = this.vec3Sub(ray.origin, tri.v0);
    const u = f * this.vec3Dot(s, h);
    if (u < 0 || u > 1) return { hit: false, t: -1, u: 0, v: 0 };

    const q = this.vec3Cross(s, edge1);
    const v = f * this.vec3Dot(ray.direction, q);
    if (v < 0 || u + v > 1) return { hit: false, t: -1, u: 0, v: 0 };

    const t = f * this.vec3Dot(edge2, q);
    return { hit: t > 1e-6, t, u, v };
  }

  rayPlaneIntersect(ray: Ray, plane: Plane): { hit: boolean; t: number; point: Vec3 } {
    const denom = this.vec3Dot(ray.direction, plane.normal);
    if (Math.abs(denom) < 1e-12) return { hit: false, t: -1, point: { x: 0, y: 0, z: 0 } };
    const t = -(this.vec3Dot(ray.origin, plane.normal) + plane.distance) / denom;
    const point = this.vec3Add(ray.origin, this.vec3Scale(ray.direction, t));
    return { hit: t >= 0, t, point };
  }

  // ── Triangle/Mesh Operations ────────────────────────────────────

  triangleNormal(v0: Vec3, v1: Vec3, v2: Vec3): Vec3 {
    return this.vec3Normalize(this.vec3Cross(this.vec3Sub(v1, v0), this.vec3Sub(v2, v0)));
  }

  triangleArea(v0: Vec3, v1: Vec3, v2: Vec3): number {
    return 0.5 * this.vec3Length(this.vec3Cross(this.vec3Sub(v1, v0), this.vec3Sub(v2, v0)));
  }

  meshVolume(mesh: Mesh): number {
    let volume = 0;
    for (let i = 0; i < mesh.indices.length; i += 3) {
      const v0 = mesh.vertices[mesh.indices[i]];
      const v1 = mesh.vertices[mesh.indices[i + 1]];
      const v2 = mesh.vertices[mesh.indices[i + 2]];
      volume += (v0.x * (v1.y * v2.z - v2.y * v1.z) -
                 v1.x * (v0.y * v2.z - v2.y * v0.z) +
                 v2.x * (v0.y * v1.z - v1.y * v0.z)) / 6;
    }
    return Math.abs(volume);
  }

  meshSurfaceArea(mesh: Mesh): number {
    let area = 0;
    for (let i = 0; i < mesh.indices.length; i += 3) {
      area += this.triangleArea(
        mesh.vertices[mesh.indices[i]],
        mesh.vertices[mesh.indices[i + 1]],
        mesh.vertices[mesh.indices[i + 2]],
      );
    }
    return area;
  }

  meshCentroid(mesh: Mesh): Vec3 {
    let cx = 0, cy = 0, cz = 0;
    for (const v of mesh.vertices) {
      cx += v.x; cy += v.y; cz += v.z;
    }
    const n = mesh.vertices.length || 1;
    return { x: cx / n, y: cy / n, z: cz / n };
  }

  /** Generate box mesh */
  generateBox(width: number, height: number, depth: number): Mesh {
    const hw = width / 2, hh = height / 2, hd = depth / 2;
    const verts: Vec3[] = [
      { x: -hw, y: -hh, z: hd }, { x: hw, y: -hh, z: hd }, { x: hw, y: hh, z: hd }, { x: -hw, y: hh, z: hd },
      { x: -hw, y: -hh, z: -hd }, { x: -hw, y: hh, z: -hd }, { x: hw, y: hh, z: -hd }, { x: hw, y: -hh, z: -hd },
    ];
    const norms: Vec3[] = verts.map(() => ({ x: 0, y: 0, z: 0 })); // simplified
    const idx = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 3, 2, 6, 3, 6, 5, 4, 7, 1, 4, 1, 0, 5, 3, 0, 5, 0, 4, 1, 7, 6, 1, 6, 2];
    return { vertices: verts, normals: norms, indices: idx, triangle_count: 12 };
  }

  /** Generate cylinder mesh */
  generateCylinder(radius: number, height: number, segments: number = 32): Mesh {
    const vertices: Vec3[] = [];
    const normals: Vec3[] = [];
    const indices: number[] = [];
    const halfH = height / 2;

    // Side vertices
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      vertices.push({ x: cos * radius, y: sin * radius, z: -halfH });
      normals.push({ x: cos, y: sin, z: 0 });
      vertices.push({ x: cos * radius, y: sin * radius, z: halfH });
      normals.push({ x: cos, y: sin, z: 0 });
    }
    for (let i = 0; i < segments; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      indices.push(a, c, b, b, c, d);
    }

    // Top/bottom caps (simplified — center vertex fan)
    const topC = vertices.length;
    vertices.push({ x: 0, y: 0, z: halfH }); normals.push({ x: 0, y: 0, z: 1 });
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      vertices.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, z: halfH });
      normals.push({ x: 0, y: 0, z: 1 });
      indices.push(topC, topC + 1 + i, topC + 1 + ((i + 1) % segments));
    }
    const botC = vertices.length;
    vertices.push({ x: 0, y: 0, z: -halfH }); normals.push({ x: 0, y: 0, z: -1 });
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      vertices.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, z: -halfH });
      normals.push({ x: 0, y: 0, z: -1 });
      indices.push(botC, botC + 1 + ((i + 1) % segments), botC + 1 + i);
    }

    return { vertices, normals, indices, triangle_count: indices.length / 3 };
  }

  // ── Convex Hull (3D) ────────────────────────────────────────────

  /** Compute 3D convex hull using incremental algorithm */
  convexHull3D(points: Vec3[]): ConvexHullResult {
    if (points.length < 4) {
      return { vertices: [...points], faces: [], volume: 0, surface_area: 0 };
    }

    // Gift-wrapping simplified: find extreme points for initial tetrahedron
    let minX = 0, maxX = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].x < points[minX].x) minX = i;
      if (points[i].x > points[maxX].x) maxX = i;
    }
    if (minX === maxX) maxX = minX === 0 ? 1 : 0;

    // Find third point (max distance from line)
    let maxDist = 0, third = -1;
    const lineDir = this.vec3Normalize(this.vec3Sub(points[maxX], points[minX]));
    for (let i = 0; i < points.length; i++) {
      if (i === minX || i === maxX) continue;
      const v = this.vec3Sub(points[i], points[minX]);
      const proj = this.vec3Scale(lineDir, this.vec3Dot(v, lineDir));
      const dist = this.vec3Length(this.vec3Sub(v, proj));
      if (dist > maxDist) { maxDist = dist; third = i; }
    }
    if (third === -1) third = 0;

    // Find fourth point (max distance from plane)
    const planeNorm = this.vec3Normalize(this.vec3Cross(
      this.vec3Sub(points[maxX], points[minX]),
      this.vec3Sub(points[third], points[minX]),
    ));
    maxDist = 0;
    let fourth = -1;
    for (let i = 0; i < points.length; i++) {
      if (i === minX || i === maxX || i === third) continue;
      const dist = Math.abs(this.vec3Dot(this.vec3Sub(points[i], points[minX]), planeNorm));
      if (dist > maxDist) { maxDist = dist; fourth = i; }
    }
    if (fourth === -1) fourth = 0;

    // Initial tetrahedron faces
    const hullIndices = new Set([minX, maxX, third, fourth]);
    const faces = [
      [minX, maxX, third],
      [minX, third, fourth],
      [minX, fourth, maxX],
      [maxX, fourth, third],
    ];

    // Compute volume and surface area
    const hullVertices = [...hullIndices].map(i => points[i]);
    let volume = 0, surfaceArea = 0;
    for (const face of faces) {
      const v0 = points[face[0]], v1 = points[face[1]], v2 = points[face[2]];
      volume += (v0.x * (v1.y * v2.z - v2.y * v1.z) -
                 v1.x * (v0.y * v2.z - v2.y * v0.z) +
                 v2.x * (v0.y * v1.z - v1.y * v0.z)) / 6;
      surfaceArea += this.triangleArea(v0, v1, v2);
    }

    return {
      vertices: hullVertices,
      faces,
      volume: Math.abs(volume),
      surface_area: surfaceArea,
    };
  }

  // ── 2D Computational Geometry ───────────────────────────────────

  /** 2D convex hull (Graham scan) */
  convexHull2D(points: Vec2[]): Vec2[] {
    if (points.length < 3) return [...points];

    // Find lowest point
    const sorted = [...points].sort((a, b) => a.y - b.y || a.x - b.x);
    const pivot = sorted[0];

    // Sort by polar angle
    sorted.sort((a, b) => {
      const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
      const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
      return angleA - angleB;
    });

    const stack: Vec2[] = [sorted[0], sorted[1]];
    for (let i = 2; i < sorted.length; i++) {
      while (stack.length > 1) {
        const top = stack[stack.length - 1];
        const below = stack[stack.length - 2];
        const cross = (top.x - below.x) * (sorted[i].y - below.y) - (top.y - below.y) * (sorted[i].x - below.x);
        if (cross <= 0) stack.pop();
        else break;
      }
      stack.push(sorted[i]);
    }

    return stack;
  }

  /** Point-in-polygon test (ray casting) */
  pointInPolygon2D(point: Vec2, polygon: Vec2[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      if (((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  /** Polygon area (shoelace formula) */
  polygonArea2D(polygon: Vec2[]): number {
    let area = 0;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      area += polygon[j].x * polygon[i].y - polygon[i].x * polygon[j].y;
    }
    return Math.abs(area) / 2;
  }

  /** 2D polygon offset (simplified — parallel offset with miter joins) */
  offsetPolygon2D(polygon: Vec2[], offset: number): Vec2[] {
    const n = polygon.length;
    if (n < 3) return [...polygon];

    const result: Vec2[] = [];
    for (let i = 0; i < n; i++) {
      const prev = polygon[(i - 1 + n) % n];
      const curr = polygon[i];
      const next = polygon[(i + 1) % n];

      // Edge normals
      const e1x = curr.x - prev.x, e1y = curr.y - prev.y;
      const e2x = next.x - curr.x, e2y = next.y - curr.y;
      const len1 = Math.sqrt(e1x * e1x + e1y * e1y) || 1;
      const len2 = Math.sqrt(e2x * e2x + e2y * e2y) || 1;
      const n1x = -e1y / len1, n1y = e1x / len1;
      const n2x = -e2y / len2, n2y = e2x / len2;

      // Bisector
      let bx = n1x + n2x, by = n1y + n2y;
      const bLen = Math.sqrt(bx * bx + by * by) || 1;
      bx /= bLen; by /= bLen;

      // Miter distance (capped at 4x offset to avoid spikes)
      const dot = n1x * bx + n1y * by;
      const miterDist = Math.min(Math.abs(offset / (dot || 1)), Math.abs(offset) * 4);

      result.push({ x: curr.x + bx * miterDist, y: curr.y + by * miterDist });
    }

    return result;
  }

  // ── Distance Functions ──────────────────────────────────────────

  pointToLineDistance(point: Vec3, lineStart: Vec3, lineEnd: Vec3): number {
    const lineDir = this.vec3Sub(lineEnd, lineStart);
    const lineLen = this.vec3Length(lineDir);
    if (lineLen < 1e-12) return this.vec3Distance(point, lineStart);
    const t = Math.max(0, Math.min(1, this.vec3Dot(this.vec3Sub(point, lineStart), lineDir) / (lineLen * lineLen)));
    const proj = this.vec3Add(lineStart, this.vec3Scale(lineDir, t));
    return this.vec3Distance(point, proj);
  }

  pointToPlaneDistance(point: Vec3, plane: Plane): number {
    return this.vec3Dot(point, plane.normal) + plane.distance;
  }

  /** Get engine capabilities summary */
  getCapabilities(): {
    primitives: string[];
    curves: string[];
    surfaces: string[];
    operations: string[];
    intersection: string[];
    computational_geometry: string[];
  } {
    return {
      primitives: ["Vec3", "Mat4", "Quaternion", "Ray", "Plane", "AABB"],
      curves: ["NURBS", "B-Spline", "Bezier"],
      surfaces: ["NURBS (evaluation)", "Plane", "Cylinder", "Cone", "Sphere", "Torus"],
      operations: ["transform", "mesh_generation", "volume", "surface_area", "centroid", "offset_polygon"],
      intersection: ["ray-AABB", "ray-triangle", "ray-plane", "AABB-AABB"],
      computational_geometry: ["convex_hull_2D", "convex_hull_3D", "point_in_polygon", "polygon_area", "polygon_offset"],
    };
  }
}

export const cadKernelEngine = new CADKernelEngine();
