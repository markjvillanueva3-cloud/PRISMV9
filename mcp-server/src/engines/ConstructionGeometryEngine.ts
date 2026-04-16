/**
 * PRISM MCP Server -- Construction Geometry Engine
 *
 * Construction geometry operations (Fusion 360 style):
 * - Plane construction: offset, angle, tangent, midplane, three-point, path
 * - Axis construction: through cylinder, perpendicular, two-plane intersection, two-point
 * - Point construction: vertex, edge-edge, three-plane, edge-plane, center
 *
 * Ported from PRISM_CONSTRUCTION_GEOMETRY_ENGINE.js (monolith R2.3.1).
 *
 * @module ConstructionGeometryEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Vec3 { x: number; y: number; z: number; }

export interface Plane {
  type: "plane";
  origin: Vec3;
  normal: Vec3;
  construction: boolean;
  [key: string]: unknown;
}

export interface Axis {
  type: "axis";
  point: Vec3;
  direction: Vec3;
  construction: boolean;
  [key: string]: unknown;
}

export interface ConstructionPoint {
  type: "point";
  x: number; y: number; z: number;
  construction: boolean;
  [key: string]: unknown;
}

export interface Edge {
  start: Vec3;
  end: Vec3;
}

export interface Cylinder {
  center: Vec3;
  radius: number;
  axis?: Vec3;
}

export interface Curve {
  type: "line" | "arc";
  start: Vec3;
  end?: Vec3;
  center?: Vec3;
  radius?: number;
  startAngle?: number;
  endAngle?: number;
}

// ============================================================================
// ENGINE
// ============================================================================

class ConstructionGeometryEngineImpl {

  // ── PLANE CONSTRUCTION ──

  createOffsetPlane(basePlane: Plane, distance: number): Plane {
    return {
      type: "plane",
      origin: {
        x: basePlane.origin.x + basePlane.normal.x * distance,
        y: basePlane.origin.y + basePlane.normal.y * distance,
        z: basePlane.origin.z + basePlane.normal.z * distance,
      },
      normal: { ...basePlane.normal },
      construction: true,
      offsetDistance: distance,
    };
  }

  createPlaneAtAngle(basePlane: Plane, axis: { direction: Vec3; point?: Vec3 }, angleDegrees: number): Plane {
    const rotated = rotateVectorAroundAxis(basePlane.normal, axis.direction, angleDegrees * Math.PI / 180);
    return {
      type: "plane",
      origin: axis.point ?? basePlane.origin,
      normal: rotated,
      construction: true,
      angle: angleDegrees,
    };
  }

  createTangentPlane(cylinder: Cylinder, angleDegrees: number): Plane {
    const rad = angleDegrees * Math.PI / 180;
    return {
      type: "plane",
      origin: {
        x: cylinder.center.x + cylinder.radius * Math.cos(rad),
        y: cylinder.center.y + cylinder.radius * Math.sin(rad),
        z: cylinder.center.z,
      },
      normal: { x: Math.cos(rad), y: Math.sin(rad), z: 0 },
      construction: true,
    };
  }

  createMidplane(plane1: Plane, plane2: Plane): Plane {
    const avg = {
      x: (plane1.normal.x + plane2.normal.x) / 2,
      y: (plane1.normal.y + plane2.normal.y) / 2,
      z: (plane1.normal.z + plane2.normal.z) / 2,
    };
    return {
      type: "plane",
      origin: {
        x: (plane1.origin.x + plane2.origin.x) / 2,
        y: (plane1.origin.y + plane2.origin.y) / 2,
        z: (plane1.origin.z + plane2.origin.z) / 2,
      },
      normal: normalize(avg),
      construction: true,
    };
  }

  createPlaneThroughThreePoints(p1: Vec3, p2: Vec3, p3: Vec3): Plane {
    const v1 = sub(p2, p1);
    const v2 = sub(p3, p1);
    return {
      type: "plane",
      origin: p1,
      normal: normalize(cross(v1, v2)),
      construction: true,
    };
  }

  createPlaneThroughTwoEdges(edge1: Edge, edge2: Edge): Plane {
    const d1 = normalize(sub(edge1.end, edge1.start));
    const d2 = normalize(sub(edge2.end, edge2.start));
    return {
      type: "plane",
      origin: edge1.start,
      normal: normalize(cross(d1, d2)),
      construction: true,
    };
  }

  createPlaneAlongPath(curve: Curve, t: number): Plane {
    return {
      type: "plane",
      origin: evaluateCurve(curve, t),
      normal: evaluateCurveTangent(curve, t),
      construction: true,
      pathParameter: t,
    };
  }

  // ── AXIS CONSTRUCTION ──

  createAxisThroughCylinder(cylinder: Cylinder): Axis {
    return {
      type: "axis",
      point: cylinder.center,
      direction: cylinder.axis ?? { x: 0, y: 0, z: 1 },
      construction: true,
    };
  }

  createAxisThroughTwoPoints(p1: Vec3, p2: Vec3): Axis {
    return {
      type: "axis",
      point: p1,
      direction: normalize(sub(p2, p1)),
      construction: true,
    };
  }

  createAxisAlongEdge(edge: Edge): Axis {
    return {
      type: "axis",
      point: edge.start,
      direction: normalize(sub(edge.end, edge.start)),
      construction: true,
    };
  }

  createAxisThroughTwoPlanes(plane1: Plane, plane2: Plane): Axis {
    const direction = normalize(cross(plane1.normal, plane2.normal));
    const point = planePlaneIntersectionPoint(plane1, plane2);
    return { type: "axis", point, direction, construction: true };
  }

  createAxisPerpendicularAtPoint(normal: Vec3, point: Vec3): Axis {
    return { type: "axis", point, direction: normalize(normal), construction: true };
  }

  // ── POINT CONSTRUCTION ──

  createPointAtVertex(vertex: Vec3): ConstructionPoint {
    return { type: "point", x: vertex.x, y: vertex.y, z: vertex.z, construction: true };
  }

  createPointAtCenter(geometry: { center: Vec3 }): ConstructionPoint {
    return { type: "point", x: geometry.center.x, y: geometry.center.y, z: geometry.center.z ?? 0, construction: true };
  }

  createPointThroughThreePlanes(plane1: Plane, plane2: Plane, plane3: Plane): ConstructionPoint | null {
    const pt = threePlanesIntersection(plane1, plane2, plane3);
    if (!pt) return null;
    return { type: "point", x: pt.x, y: pt.y, z: pt.z, construction: true };
  }

  createPointAtEdgeAndPlane(edge: Edge, plane: Plane): ConstructionPoint | null {
    const pt = edgePlaneIntersection(edge, plane);
    if (!pt) return null;
    return { type: "point", x: pt.x, y: pt.y, z: pt.z, construction: true };
  }

  createPointThroughTwoEdges(edge1: Edge, edge2: Edge): ConstructionPoint | null {
    const pt = edgeEdgeClosestPoint(edge1, edge2);
    if (!pt) return null;
    return { type: "point", x: pt.x, y: pt.y, z: pt.z, construction: true };
  }
}

// ── Vector helpers ──

function sub(a: Vec3, b: Vec3): Vec3 { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function dot(a: Vec3, b: Vec3): number { return a.x * b.x + a.y * b.y + a.z * b.z; }
function cross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}
function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < 1e-10) return { x: 0, y: 0, z: 1 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function rotateVectorAroundAxis(v: Vec3, k: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle), s = Math.sin(angle);
  const d = dot(k, v);
  const cr = cross(k, v);
  return {
    x: v.x * c + cr.x * s + k.x * d * (1 - c),
    y: v.y * c + cr.y * s + k.y * d * (1 - c),
    z: v.z * c + cr.z * s + k.z * d * (1 - c),
  };
}

function planePlaneIntersectionPoint(p1: Plane, p2: Plane): Vec3 {
  const n1 = p1.normal, n2 = p2.normal;
  const d1 = dot(n1, p1.origin), d2 = dot(n2, p2.origin);
  const dir = cross(n1, n2);
  const denom = dot(dir, dir);
  if (denom < 1e-10) return p1.origin;
  const c1 = (d1 * dot(n2, n2) - d2 * dot(n1, n2)) / denom;
  const c2 = (d2 * dot(n1, n1) - d1 * dot(n1, n2)) / denom;
  return { x: c1 * n1.x + c2 * n2.x, y: c1 * n1.y + c2 * n2.y, z: c1 * n1.z + c2 * n2.z };
}

function threePlanesIntersection(p1: Plane, p2: Plane, p3: Plane): Vec3 | null {
  const n1 = p1.normal, n2 = p2.normal, n3 = p3.normal;
  const d1 = dot(n1, p1.origin), d2 = dot(n2, p2.origin), d3 = dot(n3, p3.origin);
  const denom = dot(n1, cross(n2, n3));
  if (Math.abs(denom) < 1e-10) return null;
  const c23 = cross(n2, n3), c31 = cross(n3, n1), c12 = cross(n1, n2);
  return {
    x: (d1 * c23.x + d2 * c31.x + d3 * c12.x) / denom,
    y: (d1 * c23.y + d2 * c31.y + d3 * c12.y) / denom,
    z: (d1 * c23.z + d2 * c31.z + d3 * c12.z) / denom,
  };
}

function edgePlaneIntersection(edge: Edge, plane: Plane): Vec3 | null {
  const dir = sub(edge.end, edge.start);
  const d = dot(plane.normal, sub(plane.origin, edge.start));
  const denom = dot(plane.normal, dir);
  if (Math.abs(denom) < 1e-10) return null;
  const t = d / denom;
  if (t < 0 || t > 1) return null;
  return { x: edge.start.x + t * dir.x, y: edge.start.y + t * dir.y, z: edge.start.z + t * dir.z };
}

function edgeEdgeClosestPoint(e1: Edge, e2: Edge): Vec3 | null {
  const d1 = sub(e1.end, e1.start), d2 = sub(e2.end, e2.start), w0 = sub(e1.start, e2.start);
  const a = dot(d1, d1), b = dot(d1, d2), c = dot(d2, d2), d = dot(d1, w0), e = dot(d2, w0);
  const denom = a * c - b * b;
  if (Math.abs(denom) < 1e-10) return null;
  const s = Math.max(0, Math.min(1, (b * e - c * d) / denom));
  return { x: e1.start.x + s * d1.x, y: e1.start.y + s * d1.y, z: e1.start.z + s * d1.z };
}

function evaluateCurve(curve: Curve, t: number): Vec3 {
  if (curve.type === "line" && curve.end) {
    return { x: curve.start.x + t * (curve.end.x - curve.start.x), y: curve.start.y + t * (curve.end.y - curve.start.y), z: (curve.start.z ?? 0) + t * ((curve.end.z ?? 0) - (curve.start.z ?? 0)) };
  }
  if (curve.type === "arc" && curve.center && curve.radius != null && curve.startAngle != null && curve.endAngle != null) {
    const angle = curve.startAngle + t * (curve.endAngle - curve.startAngle);
    return { x: curve.center.x + curve.radius * Math.cos(angle), y: curve.center.y + curve.radius * Math.sin(angle), z: curve.center.z ?? 0 };
  }
  return curve.start;
}

function evaluateCurveTangent(curve: Curve, t: number): Vec3 {
  if (curve.type === "line" && curve.end) {
    return normalize(sub(curve.end, curve.start));
  }
  if (curve.type === "arc" && curve.startAngle != null && curve.endAngle != null) {
    const angle = curve.startAngle + t * (curve.endAngle - curve.startAngle);
    return { x: -Math.sin(angle), y: Math.cos(angle), z: 0 };
  }
  return { x: 1, y: 0, z: 0 };
}

export const constructionGeometryEngine = new ConstructionGeometryEngineImpl();
