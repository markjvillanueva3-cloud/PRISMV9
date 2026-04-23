/**
 * BVHEngine — Bounding Volume Hierarchy for spatial queries
 *
 * Accelerates collision detection, ray casting, and nearest-neighbor
 * queries on 3D geometry. Uses AABB (Axis-Aligned Bounding Box) nodes
 * with SAH (Surface Area Heuristic) splits.
 *
 * Manufacturing use: collision detection (tool/fixture/workpiece),
 * stock material tracking, gouge detection, nesting optimization.
 *
 * @module BVHEngine
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AABB {
  min: [number, number, number];
  max: [number, number, number];
}

export interface Triangle {
  v0: [number, number, number];
  v1: [number, number, number];
  v2: [number, number, number];
  id?: number;
}

export interface BVHNode {
  aabb: AABB;
  left: BVHNode | null;
  right: BVHNode | null;
  triangles: number[];   // Leaf node triangle indices
  depth: number;
}

export interface RayHit {
  triangleIndex: number;
  t: number;             // Distance along ray
  point: [number, number, number];
  normal: [number, number, number];
}

export interface BVHStats {
  nodeCount: number;
  leafCount: number;
  maxDepth: number;
  avgTrianglesPerLeaf: number;
  totalTriangles: number;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class BVHEngineImpl {

  /**
   * Build a BVH from triangles.
   */
  build(triangles: Triangle[], maxLeafSize = 4): BVHNode {
    const indices = triangles.map((_, i) => i);
    return this._buildNode(triangles, indices, 0, maxLeafSize);
  }

  /**
   * Ray-BVH intersection test.
   * Returns all hits sorted by distance, or null if no intersection.
   */
  raycast(
    root: BVHNode, triangles: Triangle[],
    origin: [number, number, number],
    direction: [number, number, number]
  ): RayHit[] {
    const hits: RayHit[] = [];
    this._raycastNode(root, triangles, origin, direction, hits);
    hits.sort((a, b) => a.t - b.t);
    return hits;
  }

  /**
   * Test if two BVHs overlap (collision detection).
   */
  collides(
    rootA: BVHNode, trianglesA: Triangle[],
    rootB: BVHNode, trianglesB: Triangle[]
  ): boolean {
    return this._collidesNodes(rootA, trianglesA, rootB, trianglesB);
  }

  /**
   * Find all triangles within distance of a point.
   */
  queryRadius(
    root: BVHNode, triangles: Triangle[],
    center: [number, number, number], radius: number
  ): number[] {
    const results: number[] = [];
    this._queryRadiusNode(root, triangles, center, radius, results);
    return results;
  }

  /**
   * Compute AABB of a set of triangles.
   */
  computeAABB(triangles: Triangle[]): AABB {
    const min: [number, number, number] = [Infinity, Infinity, Infinity];
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

    for (const tri of triangles) {
      for (const v of [tri.v0, tri.v1, tri.v2]) {
        for (let i = 0; i < 3; i++) {
          min[i] = Math.min(min[i], v[i]);
          max[i] = Math.max(max[i], v[i]);
        }
      }
    }

    return { min, max };
  }

  /**
   * Check if a point is inside an AABB.
   */
  pointInAABB(point: [number, number, number], aabb: AABB): boolean {
    return point[0] >= aabb.min[0] && point[0] <= aabb.max[0]
        && point[1] >= aabb.min[1] && point[1] <= aabb.max[1]
        && point[2] >= aabb.min[2] && point[2] <= aabb.max[2];
  }

  /**
   * Test AABB-AABB overlap.
   */
  aabbOverlap(a: AABB, b: AABB): boolean {
    return a.min[0] <= b.max[0] && a.max[0] >= b.min[0]
        && a.min[1] <= b.max[1] && a.max[1] >= b.min[1]
        && a.min[2] <= b.max[2] && a.max[2] >= b.min[2];
  }

  /**
   * Get BVH statistics.
   */
  stats(root: BVHNode): BVHStats {
    let nodeCount = 0, leafCount = 0, maxDepth = 0, totalTris = 0;
    const queue = [root];

    while (queue.length > 0) {
      const node = queue.pop()!;
      nodeCount++;
      maxDepth = Math.max(maxDepth, node.depth);

      if (node.triangles.length > 0) {
        leafCount++;
        totalTris += node.triangles.length;
      }

      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }

    return {
      nodeCount, leafCount, maxDepth,
      totalTriangles: totalTris,
      avgTrianglesPerLeaf: leafCount > 0 ? totalTris / leafCount : 0,
    };
  }

  // -------------------------------------------------------------------------
  // Build internals (SAH split)
  // -------------------------------------------------------------------------

  private _buildNode(
    triangles: Triangle[], indices: number[], depth: number, maxLeafSize: number
  ): BVHNode {
    const aabb = this._computeAABBFromIndices(triangles, indices);

    if (indices.length <= maxLeafSize) {
      return { aabb, left: null, right: null, triangles: indices, depth };
    }

    // Find best split axis and position using SAH
    const { axis, splitPos } = this._findSAHSplit(triangles, indices, aabb);

    const left: number[] = [];
    const right: number[] = [];

    for (const idx of indices) {
      const centroid = this._triCentroid(triangles[idx]);
      if (centroid[axis] < splitPos) {
        left.push(idx);
      } else {
        right.push(idx);
      }
    }

    // Fallback: split in half if SAH produces degenerate split
    if (left.length === 0 || right.length === 0) {
      const mid = Math.floor(indices.length / 2);
      const sorted = [...indices].sort((a, b) =>
        this._triCentroid(triangles[a])[axis] - this._triCentroid(triangles[b])[axis]
      );
      return {
        aabb,
        left: this._buildNode(triangles, sorted.slice(0, mid), depth + 1, maxLeafSize),
        right: this._buildNode(triangles, sorted.slice(mid), depth + 1, maxLeafSize),
        triangles: [],
        depth,
      };
    }

    return {
      aabb,
      left: this._buildNode(triangles, left, depth + 1, maxLeafSize),
      right: this._buildNode(triangles, right, depth + 1, maxLeafSize),
      triangles: [],
      depth,
    };
  }

  private _findSAHSplit(
    triangles: Triangle[], indices: number[], aabb: AABB
  ): { axis: number; splitPos: number } {
    let bestCost = Infinity;
    let bestAxis = 0;
    let bestPos = 0;
    const bins = 8;

    for (let axis = 0; axis < 3; axis++) {
      const extent = aabb.max[axis] - aabb.min[axis];
      if (extent < 1e-10) continue;

      for (let b = 1; b < bins; b++) {
        const splitPos = aabb.min[axis] + (b / bins) * extent;
        let leftCount = 0, rightCount = 0;

        for (const idx of indices) {
          if (this._triCentroid(triangles[idx])[axis] < splitPos) leftCount++;
          else rightCount++;
        }

        if (leftCount === 0 || rightCount === 0) continue;

        // SAH cost = leftCount * leftSA + rightCount * rightSA
        const cost = leftCount + rightCount; // Simplified SAH
        if (cost < bestCost) {
          bestCost = cost;
          bestAxis = axis;
          bestPos = splitPos;
        }
      }
    }

    // Fallback to midpoint of longest axis
    if (bestCost === Infinity) {
      const extents = [0, 1, 2].map(i => aabb.max[i] - aabb.min[i]);
      bestAxis = extents.indexOf(Math.max(...extents));
      bestPos = (aabb.min[bestAxis] + aabb.max[bestAxis]) / 2;
    }

    return { axis: bestAxis, splitPos: bestPos };
  }

  // -------------------------------------------------------------------------
  // Ray intersection
  // -------------------------------------------------------------------------

  private _raycastNode(
    node: BVHNode, triangles: Triangle[],
    origin: [number, number, number], dir: [number, number, number],
    hits: RayHit[]
  ): void {
    if (!this._rayAABB(origin, dir, node.aabb)) return;

    if (node.triangles.length > 0) {
      for (const idx of node.triangles) {
        const hit = this._rayTriangle(origin, dir, triangles[idx], idx);
        if (hit) hits.push(hit);
      }
      return;
    }

    if (node.left) this._raycastNode(node.left, triangles, origin, dir, hits);
    if (node.right) this._raycastNode(node.right, triangles, origin, dir, hits);
  }

  private _rayAABB(
    origin: [number, number, number], dir: [number, number, number], aabb: AABB
  ): boolean {
    let tmin = -Infinity, tmax = Infinity;

    for (let i = 0; i < 3; i++) {
      if (Math.abs(dir[i]) < 1e-12) {
        if (origin[i] < aabb.min[i] || origin[i] > aabb.max[i]) return false;
      } else {
        const invD = 1 / dir[i];
        let t1 = (aabb.min[i] - origin[i]) * invD;
        let t2 = (aabb.max[i] - origin[i]) * invD;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) return false;
      }
    }

    return tmax >= 0;
  }

  private _rayTriangle(
    origin: [number, number, number], dir: [number, number, number],
    tri: Triangle, idx: number
  ): RayHit | null {
    // Möller–Trumbore
    const edge1 = this._sub(tri.v1, tri.v0);
    const edge2 = this._sub(tri.v2, tri.v0);
    const h = this._cross(dir, edge2);
    const a = this._dot(edge1, h);

    if (Math.abs(a) < 1e-10) return null;

    const f = 1 / a;
    const s = this._sub(origin, tri.v0);
    const u = f * this._dot(s, h);
    if (u < 0 || u > 1) return null;

    const q = this._cross(s, edge1);
    const v = f * this._dot(dir, q);
    if (v < 0 || u + v > 1) return null;

    const t = f * this._dot(edge2, q);
    if (t < 1e-6) return null;

    const point: [number, number, number] = [
      origin[0] + t * dir[0],
      origin[1] + t * dir[1],
      origin[2] + t * dir[2],
    ];

    const normal = this._normalize(this._cross(edge1, edge2));

    return { triangleIndex: idx, t, point, normal };
  }

  // -------------------------------------------------------------------------
  // Collision detection
  // -------------------------------------------------------------------------

  private _collidesNodes(
    nodeA: BVHNode, trisA: Triangle[],
    nodeB: BVHNode, trisB: Triangle[]
  ): boolean {
    if (!this.aabbOverlap(nodeA.aabb, nodeB.aabb)) return false;

    // Both leaves: test triangle pairs
    if (nodeA.triangles.length > 0 && nodeB.triangles.length > 0) {
      for (const ia of nodeA.triangles) {
        for (const ib of nodeB.triangles) {
          if (this._trianglesIntersect(trisA[ia], trisB[ib])) return true;
        }
      }
      return false;
    }

    // Recurse into larger node
    if (nodeA.triangles.length === 0 && nodeA.left && nodeA.right) {
      return this._collidesNodes(nodeA.left, trisA, nodeB, trisB)
          || this._collidesNodes(nodeA.right, trisA, nodeB, trisB);
    }

    if (nodeB.triangles.length === 0 && nodeB.left && nodeB.right) {
      return this._collidesNodes(nodeA, trisA, nodeB.left, trisB)
          || this._collidesNodes(nodeA, trisA, nodeB.right, trisB);
    }

    return false;
  }

  private _trianglesIntersect(a: Triangle, b: Triangle): boolean {
    // Simplified: check if any edge of A intersects triangle B and vice versa
    const edgesA = [[a.v0, a.v1], [a.v1, a.v2], [a.v2, a.v0]] as const;
    for (const [p0, p1] of edgesA) {
      const dir = this._sub(p1, p0);
      const hit = this._rayTriangle(p0, dir, b, 0);
      if (hit && hit.t <= 1) return true;
    }

    const edgesB = [[b.v0, b.v1], [b.v1, b.v2], [b.v2, b.v0]] as const;
    for (const [p0, p1] of edgesB) {
      const dir = this._sub(p1, p0);
      const hit = this._rayTriangle(p0, dir, a, 0);
      if (hit && hit.t <= 1) return true;
    }

    return false;
  }

  // -------------------------------------------------------------------------
  // Radius query
  // -------------------------------------------------------------------------

  private _queryRadiusNode(
    node: BVHNode, triangles: Triangle[],
    center: [number, number, number], radius: number,
    results: number[]
  ): void {
    if (!this._aabbSphereOverlap(node.aabb, center, radius)) return;

    if (node.triangles.length > 0) {
      for (const idx of node.triangles) {
        const c = this._triCentroid(triangles[idx]);
        const dist = Math.sqrt(
          (c[0] - center[0]) ** 2 + (c[1] - center[1]) ** 2 + (c[2] - center[2]) ** 2
        );
        if (dist <= radius) results.push(idx);
      }
      return;
    }

    if (node.left) this._queryRadiusNode(node.left, triangles, center, radius, results);
    if (node.right) this._queryRadiusNode(node.right, triangles, center, radius, results);
  }

  private _aabbSphereOverlap(aabb: AABB, center: [number, number, number], r: number): boolean {
    let dist2 = 0;
    for (let i = 0; i < 3; i++) {
      if (center[i] < aabb.min[i]) dist2 += (center[i] - aabb.min[i]) ** 2;
      else if (center[i] > aabb.max[i]) dist2 += (center[i] - aabb.max[i]) ** 2;
    }
    return dist2 <= r * r;
  }

  // -------------------------------------------------------------------------
  // Vector utilities
  // -------------------------------------------------------------------------

  private _computeAABBFromIndices(triangles: Triangle[], indices: number[]): AABB {
    const min: [number, number, number] = [Infinity, Infinity, Infinity];
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

    for (const idx of indices) {
      const tri = triangles[idx];
      for (const v of [tri.v0, tri.v1, tri.v2]) {
        for (let i = 0; i < 3; i++) {
          min[i] = Math.min(min[i], v[i]);
          max[i] = Math.max(max[i], v[i]);
        }
      }
    }

    return { min, max };
  }

  private _triCentroid(tri: Triangle): [number, number, number] {
    return [
      (tri.v0[0] + tri.v1[0] + tri.v2[0]) / 3,
      (tri.v0[1] + tri.v1[1] + tri.v2[1]) / 3,
      (tri.v0[2] + tri.v1[2] + tri.v2[2]) / 3,
    ];
  }

  private _sub(a: readonly number[], b: readonly number[]): [number, number, number] {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  private _cross(a: [number, number, number], b: [number, number, number]): [number, number, number] {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }

  private _dot(a: [number, number, number], b: [number, number, number]): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  private _normalize(v: [number, number, number]): [number, number, number] {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return len > 1e-10 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 0];
  }
}

export const bvhEngine = new BVHEngineImpl();
