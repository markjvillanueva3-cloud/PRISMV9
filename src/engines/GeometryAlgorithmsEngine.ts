/**
 * PRISM MCP Server — Geometry Algorithms Engine
 *
 * Computational geometry primitives:
 * - Delaunay triangulation (Bowyer-Watson incremental)
 * - Convex hull (Graham scan, Jarvis march)
 * - Polygon operations (area, centroid, point-in-polygon, offset)
 *
 * Ported from PRISM_GEOMETRY_ALGORITHMS.js (monolith R2.3.1).
 *
 * @module GeometryAlgorithmsEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Point2D { x: number; y: number; }

export interface Triangle {
  vertices: [number, number, number];
  circumcenter: Point2D;
  circumradius: number;
}

export interface DelaunayResult {
  triangles: Triangle[];
  edges: [number, number][];
  points: Point2D[];
}

export interface PolygonInfo {
  signedArea: number;
  area: number;
  centroid: Point2D;
  isClockwise: boolean;
}

// ============================================================================
// ENGINE
// ============================================================================

class GeometryAlgorithmsEngineImpl {

  // ── Delaunay triangulation (Bowyer-Watson) ──

  delaunayTriangulate(points: Point2D[]): DelaunayResult {
    if (points.length < 3) return { triangles: [], edges: [], points };

    const bounds = this.getBounds(points);
    const allPts = [...this.createSuperVertices(bounds), ...points];
    let triangles = [this.makeTriangle([0, 1, 2], allPts)];

    for (let p = 3; p < allPts.length; p++) {
      const point = allPts[p];
      const bad: Triangle[] = [];
      const good: Triangle[] = [];

      for (const tri of triangles) {
        const dist = Math.hypot(point.x - tri.circumcenter.x, point.y - tri.circumcenter.y);
        (dist < tri.circumradius ? bad : good).push(tri);
      }

      const boundary = this.findBoundary(bad);
      const newTris = boundary.map(edge =>
        this.makeTriangle([edge[0], edge[1], p], allPts),
      );
      triangles = [...good, ...newTris];
    }

    // Remove super-triangle vertices
    const superVerts = new Set([0, 1, 2]);
    triangles = triangles
      .filter(t => !t.vertices.some(v => superVerts.has(v)))
      .map(t => ({
        ...t,
        vertices: [t.vertices[0] - 3, t.vertices[1] - 3, t.vertices[2] - 3] as [number, number, number],
      }));

    const edges = this.extractEdges(triangles);
    return { triangles, edges, points };
  }

  // ── Convex hull ──

  /** Graham scan — O(n log n). Returns hull vertex indices CCW. */
  grahamScan(points: Point2D[]): number[] {
    if (points.length < 3) return points.map((_, i) => i);

    let pivot = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].y < points[pivot].y
        || (points[i].y === points[pivot].y && points[i].x < points[pivot].x)) {
        pivot = i;
      }
    }

    const indices = points.map((_, i) => i).filter(i => i !== pivot);
    indices.sort((a, b) => {
      const aa = Math.atan2(points[a].y - points[pivot].y, points[a].x - points[pivot].x);
      const ab = Math.atan2(points[b].y - points[pivot].y, points[b].x - points[pivot].x);
      return aa - ab;
    });

    const hull = [pivot];
    for (const idx of indices) {
      while (hull.length > 1 && this.ccw(
        points[hull[hull.length - 2]], points[hull[hull.length - 1]], points[idx],
      ) <= 0) hull.pop();
      hull.push(idx);
    }
    return hull;
  }

  /** Jarvis march (gift wrapping) — O(nh). */
  jarvisMarch(points: Point2D[]): number[] {
    if (points.length < 3) return points.map((_, i) => i);

    let leftmost = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].x < points[leftmost].x) leftmost = i;
    }

    const hull: number[] = [];
    let current = leftmost;
    do {
      hull.push(current);
      let next = 0;
      for (let i = 1; i < points.length; i++) {
        if (next === current || this.ccw(points[current], points[next], points[i]) < 0) {
          next = i;
        }
      }
      current = next;
    } while (current !== leftmost);
    return hull;
  }

  /** Check if point is inside convex hull. */
  pointInConvexHull(hull: number[], points: Point2D[], test: Point2D): boolean {
    for (let i = 0; i < hull.length; i++) {
      const p1 = points[hull[i]];
      const p2 = points[hull[(i + 1) % hull.length]];
      if (this.ccw(p1, p2, test) < 0) return false;
    }
    return true;
  }

  // ── Polygon operations ──

  /** Signed area (positive for CCW). */
  polygonSignedArea(vertices: Point2D[]): number {
    let area = 0;
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
    }
    return area / 2;
  }

  /** Polygon centroid. */
  polygonCentroid(vertices: Point2D[]): Point2D {
    const area = this.polygonSignedArea(vertices);
    let cx = 0, cy = 0;
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const f = vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
      cx += (vertices[i].x + vertices[j].x) * f;
      cy += (vertices[i].y + vertices[j].y) * f;
    }
    const s = 1 / (6 * area);
    return { x: cx * s, y: cy * s };
  }

  /** Polygon info (area, centroid, winding). */
  polygonInfo(vertices: Point2D[]): PolygonInfo {
    const signedArea = this.polygonSignedArea(vertices);
    return {
      signedArea,
      area: Math.abs(signedArea),
      centroid: this.polygonCentroid(vertices),
      isClockwise: signedArea < 0,
    };
  }

  /** Point-in-polygon test (ray casting). */
  pointInPolygon(vertices: Point2D[], point: Point2D): boolean {
    let inside = false;
    const n = vertices.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = vertices[i].x, yi = vertices[i].y;
      const xj = vertices[j].x, yj = vertices[j].y;
      if (((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  /** Polygon offset (miter-based, for toolpath offsets). */
  polygonOffset(vertices: Point2D[], distance: number): Point2D[] {
    const n = vertices.length;
    const result: Point2D[] = [];

    for (let i = 0; i < n; i++) {
      const prev = vertices[(i - 1 + n) % n];
      const curr = vertices[i];
      const next = vertices[(i + 1) % n];

      const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
      const v2 = { x: next.x - curr.x, y: next.y - curr.y };
      const len1 = Math.hypot(v1.x, v1.y) || 1;
      const len2 = Math.hypot(v2.x, v2.y) || 1;

      const n1 = { x: -v1.y / len1, y: v1.x / len1 };
      const n2 = { x: -v2.y / len2, y: v2.x / len2 };
      const bis = { x: n1.x + n2.x, y: n1.y + n2.y };
      const bisLen = Math.hypot(bis.x, bis.y);

      if (bisLen > 1e-10) {
        const dot = n1.x * (bis.x / bisLen) + n1.y * (bis.y / bisLen);
        const miter = Math.abs(dot) > 0.1 ? distance / dot : distance;
        const limited = Math.min(Math.abs(miter), Math.abs(distance) * 4) * Math.sign(miter);
        result.push({ x: curr.x + bis.x / bisLen * limited, y: curr.y + bis.y / bisLen * limited });
      } else {
        result.push({ x: curr.x + n1.x * distance, y: curr.y + n1.y * distance });
      }
    }
    return result;
  }

  // ── Internal helpers ──

  ccw(p1: Point2D, p2: Point2D, p3: Point2D): number {
    return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
  }

  private getBounds(points: Point2D[]) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    return { minX, maxX, minY, maxY };
  }

  private createSuperVertices(bounds: { minX: number; maxX: number; minY: number; maxY: number }): Point2D[] {
    const d = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 10;
    const mx = (bounds.minX + bounds.maxX) / 2;
    const my = (bounds.minY + bounds.maxY) / 2;
    return [{ x: mx - d, y: my - d }, { x: mx + d, y: my - d }, { x: mx, y: my + d }];
  }

  private makeTriangle(verts: [number, number, number], pts: Point2D[]): Triangle {
    const [i, j, k] = verts;
    const ax = pts[i].x, ay = pts[i].y;
    const bx = pts[j].x, by = pts[j].y;
    const cx = pts[k].x, cy = pts[k].y;
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(d) < 1e-12) return { vertices: verts, circumcenter: { x: 0, y: 0 }, circumradius: Infinity };
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    return { vertices: verts, circumcenter: { x: ux, y: uy }, circumradius: Math.hypot(ax - ux, ay - uy) };
  }

  private findBoundary(triangles: Triangle[]): [number, number][] {
    const edgeCount = new Map<string, number>();
    for (const t of triangles) {
      for (const [a, b] of [[t.vertices[0], t.vertices[1]], [t.vertices[1], t.vertices[2]], [t.vertices[2], t.vertices[0]]]) {
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
      }
    }
    const boundary: [number, number][] = [];
    for (const t of triangles) {
      for (const edge of [[t.vertices[0], t.vertices[1]], [t.vertices[1], t.vertices[2]], [t.vertices[2], t.vertices[0]]] as [number, number][]) {
        const key = edge[0] < edge[1] ? `${edge[0]},${edge[1]}` : `${edge[1]},${edge[0]}`;
        if (edgeCount.get(key) === 1) boundary.push(edge);
      }
    }
    return boundary;
  }

  private extractEdges(triangles: Triangle[]): [number, number][] {
    const edges = new Set<string>();
    for (const t of triangles) {
      const [a, b, c] = t.vertices;
      edges.add(a < b ? `${a},${b}` : `${b},${a}`);
      edges.add(b < c ? `${b},${c}` : `${c},${b}`);
      edges.add(c < a ? `${c},${a}` : `${a},${c}`);
    }
    return Array.from(edges).map(e => {
      const [a, b] = e.split(",").map(Number);
      return [a, b] as [number, number];
    });
  }
}

export const geometryAlgorithmsEngine = new GeometryAlgorithmsEngineImpl();
