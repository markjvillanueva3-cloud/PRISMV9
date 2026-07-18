/**
 * VoronoiEngine — Voronoi diagram and Delaunay triangulation utilities
 *
 * Computes Voronoi diagrams, Delaunay triangulations, and related
 * geometric structures from 2D point sets.
 *
 * Manufacturing use: optimal sensor placement, nesting optimization,
 * fixture point selection, mesh generation for FEA.
 *
 * @module VoronoiEngine
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Point2D { x: number; y: number; }

export interface VoronoiCell {
  site: Point2D;
  vertices: Point2D[];
  neighbors: number[];   // Indices of neighboring cells
  area: number;
}

export interface VoronoiDiagram {
  cells: VoronoiCell[];
  vertices: Point2D[];
  edges: { from: Point2D; to: Point2D }[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface DelaunayTriangle {
  p0: number;  // Index into points array
  p1: number;
  p2: number;
  circumcenter: Point2D;
  circumradius: number;
}

export interface DelaunayResult {
  triangles: DelaunayTriangle[];
  points: Point2D[];
  convexHull: number[];
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class VoronoiEngineImpl {

  /**
   * Compute Delaunay triangulation using Bowyer-Watson algorithm.
   */
  delaunay(points: Point2D[]): DelaunayResult {
    if (points.length < 3) {
      return { triangles: [], points, convexHull: points.map((_, i) => i) };
    }

    // Create super-triangle
    const bounds = this._computeBounds(points);
    const dx = bounds.maxX - bounds.minX;
    const dy = bounds.maxY - bounds.minY;
    const dmax = Math.max(dx, dy) * 10;
    const mid = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };

    const superPts: Point2D[] = [
      { x: mid.x - dmax, y: mid.y - dmax },
      { x: mid.x + dmax, y: mid.y - dmax },
      { x: mid.x, y: mid.y + dmax },
    ];

    const allPts = [...points, ...superPts];
    const n = points.length;

    let triangles: { p0: number; p1: number; p2: number }[] = [
      { p0: n, p1: n + 1, p2: n + 2 },
    ];

    // Insert points one by one
    for (let i = 0; i < n; i++) {
      const badTriangles: number[] = [];

      for (let t = 0; t < triangles.length; t++) {
        const tri = triangles[t];
        const cc = this._circumcircle(allPts[tri.p0], allPts[tri.p1], allPts[tri.p2]);
        if (cc && this._dist(allPts[i], cc.center) < cc.radius) {
          badTriangles.push(t);
        }
      }

      // Find boundary polygon of bad triangles
      const polygon: { a: number; b: number }[] = [];
      for (const t of badTriangles) {
        const tri = triangles[t];
        const edges = [
          { a: tri.p0, b: tri.p1 },
          { a: tri.p1, b: tri.p2 },
          { a: tri.p2, b: tri.p0 },
        ];
        for (const edge of edges) {
          const isShared = badTriangles.some(t2 => {
            if (t2 === t) return false;
            const tri2 = triangles[t2];
            const e2 = [
              { a: tri2.p0, b: tri2.p1 }, { a: tri2.p1, b: tri2.p2 }, { a: tri2.p2, b: tri2.p0 },
            ];
            return e2.some(e => (e.a === edge.a && e.b === edge.b) || (e.a === edge.b && e.b === edge.a));
          });
          if (!isShared) polygon.push(edge);
        }
      }

      // Remove bad triangles (in reverse order)
      for (const t of badTriangles.sort((a, b) => b - a)) {
        triangles.splice(t, 1);
      }

      // Create new triangles from polygon edges to new point
      for (const edge of polygon) {
        triangles.push({ p0: edge.a, p1: edge.b, p2: i });
      }
    }

    // Remove triangles that share vertices with super-triangle
    triangles = triangles.filter(t =>
      t.p0 < n && t.p1 < n && t.p2 < n
    );

    // Build result
    const resultTriangles: DelaunayTriangle[] = triangles.map(t => {
      const cc = this._circumcircle(points[t.p0], points[t.p1], points[t.p2]);
      return {
        p0: t.p0, p1: t.p1, p2: t.p2,
        circumcenter: cc?.center ?? { x: 0, y: 0 },
        circumradius: cc?.radius ?? 0,
      };
    });

    return {
      triangles: resultTriangles,
      points,
      convexHull: this._convexHull(points),
    };
  }

  /**
   * Compute Voronoi diagram from Delaunay triangulation.
   */
  voronoi(points: Point2D[], clipBounds?: { minX: number; minY: number; maxX: number; maxY: number }): VoronoiDiagram {
    const dt = this.delaunay(points);
    const bounds = clipBounds ?? this._computeBounds(points);

    // Build adjacency: for each point, find which triangles contain it
    const pointTriangles: number[][] = Array.from({ length: points.length }, () => []);
    for (let t = 0; t < dt.triangles.length; t++) {
      const tri = dt.triangles[t];
      pointTriangles[tri.p0].push(t);
      pointTriangles[tri.p1].push(t);
      pointTriangles[tri.p2].push(t);
    }

    const allVertices: Point2D[] = [];
    const edges: { from: Point2D; to: Point2D }[] = [];
    const cells: VoronoiCell[] = [];

    for (let i = 0; i < points.length; i++) {
      const triIndices = pointTriangles[i];
      if (triIndices.length === 0) {
        cells.push({ site: points[i], vertices: [], neighbors: [], area: 0 });
        continue;
      }

      // Voronoi cell vertices = circumcenters of surrounding triangles
      const cellVerts = triIndices.map(t => dt.triangles[t].circumcenter);

      // Sort vertices by angle around site
      const sorted = [...cellVerts].sort((a, b) => {
        const angA = Math.atan2(a.y - points[i].y, a.x - points[i].x);
        const angB = Math.atan2(b.y - points[i].y, b.x - points[i].x);
        return angA - angB;
      });

      // Clip to bounds
      const clipped = sorted.map(v => ({
        x: Math.max(bounds.minX, Math.min(bounds.maxX, v.x)),
        y: Math.max(bounds.minY, Math.min(bounds.maxY, v.y)),
      }));

      allVertices.push(...clipped);

      // Build edges
      for (let j = 0; j < clipped.length; j++) {
        const next = (j + 1) % clipped.length;
        edges.push({ from: clipped[j], to: clipped[next] });
      }

      // Find neighbors (share a triangle edge)
      const neighbors = new Set<number>();
      for (const t of triIndices) {
        const tri = dt.triangles[t];
        if (tri.p0 !== i) neighbors.add(tri.p0);
        if (tri.p1 !== i) neighbors.add(tri.p1);
        if (tri.p2 !== i) neighbors.add(tri.p2);
      }

      const area = this._polygonArea(clipped);

      cells.push({
        site: points[i],
        vertices: clipped,
        neighbors: [...neighbors],
        area: Math.abs(area),
      });
    }

    return { cells, vertices: allVertices, edges, bounds };
  }

  /**
   * Find nearest Voronoi site to a query point.
   */
  nearestSite(points: Point2D[], query: Point2D): { index: number; distance: number } {
    let bestIdx = 0;
    let bestDist = Infinity;

    for (let i = 0; i < points.length; i++) {
      const d = this._dist(points[i], query);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    return { index: bestIdx, distance: bestDist };
  }

  /**
   * Lloyd relaxation: move sites to cell centroids.
   */
  lloydRelax(points: Point2D[], iterations = 1, clipBounds?: { minX: number; minY: number; maxX: number; maxY: number }): Point2D[] {
    let current = [...points];

    for (let iter = 0; iter < iterations; iter++) {
      const diagram = this.voronoi(current, clipBounds);
      current = diagram.cells.map(cell => {
        if (cell.vertices.length === 0) return cell.site;
        const cx = cell.vertices.reduce((s, v) => s + v.x, 0) / cell.vertices.length;
        const cy = cell.vertices.reduce((s, v) => s + v.y, 0) / cell.vertices.length;
        return { x: cx, y: cy };
      });
    }

    return current;
  }

  // -------------------------------------------------------------------------
  // Geometry utilities
  // -------------------------------------------------------------------------

  private _circumcircle(a: Point2D, b: Point2D, c: Point2D): { center: Point2D; radius: number } | null {
    const ax = a.x, ay = a.y;
    const bx = b.x, by = b.y;
    const cx = c.x, cy = c.y;

    const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(D) < 1e-10) return null;

    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / D;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / D;

    return {
      center: { x: ux, y: uy },
      radius: Math.sqrt((ax - ux) ** 2 + (ay - uy) ** 2),
    };
  }

  private _dist(a: Point2D, b: Point2D): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  private _computeBounds(points: Point2D[]) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    const pad = Math.max(maxX - minX, maxY - minY) * 0.1 || 1;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }

  private _polygonArea(vertices: Point2D[]): number {
    let area = 0;
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += vertices[i].x * vertices[j].y;
      area -= vertices[j].x * vertices[i].y;
    }
    return area / 2;
  }

  private _convexHull(points: Point2D[]): number[] {
    if (points.length < 3) return points.map((_, i) => i);

    // Graham scan
    const indexed = points.map((p, i) => ({ ...p, idx: i }));
    indexed.sort((a, b) => a.y - b.y || a.x - b.x);
    const pivot = indexed[0];

    const rest = indexed.slice(1).sort((a, b) => {
      const angA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
      const angB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
      return angA - angB;
    });

    const stack = [pivot, rest[0]];
    for (let i = 1; i < rest.length; i++) {
      while (stack.length > 1) {
        const top = stack[stack.length - 1];
        const prev = stack[stack.length - 2];
        const cross = (top.x - prev.x) * (rest[i].y - prev.y) - (top.y - prev.y) * (rest[i].x - prev.x);
        if (cross <= 0) stack.pop();
        else break;
      }
      stack.push(rest[i]);
    }

    return stack.map(p => p.idx);
  }
}

export const voronoiEngine = new VoronoiEngineImpl();
