/**
 * SpatialIndexEngine — Reverse-engineered from PRISM v8.89 monolith
 *
 * Spatial data structures for 3D point queries:
 * - KD-Tree: nearest neighbor, k-nearest, radius search, range query
 * - Octree: spatial subdivision, radius search, voxelization
 *
 * Manufacturing applications: collision detection, toolpath proximity,
 * point cloud processing, mesh analysis, fixture placement.
 *
 * Source: PRISM_KDTREE (MIT 6.837, Bentley 1975),
 *         PRISM_OCTREE (MIT 6.837, Meagher 1982)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Point3D { x: number; y: number; z: number; }

export interface KDNode {
  point: Point3D & { index: number };
  axis: number;
  left: KDNode | null;
  right: KDNode | null;
}

export interface NearestResult {
  point: Point3D;
  distance: number;
  index: number;
}

export interface Bounds3D {
  min: Point3D;
  max: Point3D;
}

export interface OctreeNode {
  bounds: Bounds3D;
  points: Array<Point3D & { index: number }>;
  children: (OctreeNode | null)[] | null;
  isLeaf: boolean;
  depth: number;
}

export interface VoxelResult {
  voxels: Point3D[];
  resolution: number;
  cellSize: number;
  bounds: Bounds3D;
}

// ---------------------------------------------------------------------------
// KD-Tree
// ---------------------------------------------------------------------------

class KDTreeImpl {

  build(points: Point3D[]): KDNode | null {
    if (!points || points.length === 0) return null;
    return this._buildRecursive(
      points.map((p, i) => ({ ...p, index: i })),
      0
    );
  }

  nearestNeighbor(tree: KDNode | null, query: Point3D): NearestResult | null {
    if (!tree) return null;
    const best: { point: (Point3D & { index: number }) | null; distance: number } = { point: null, distance: Infinity };
    this._nnSearch(tree, query, best);
    return {
      point: { x: best.point!.x, y: best.point!.y, z: best.point!.z },
      distance: Math.sqrt(best.distance),
      index: best.point!.index,
    };
  }

  kNearestNeighbors(tree: KDNode | null, query: Point3D, k: number): NearestResult[] {
    if (!tree || k <= 0) return [];
    const heap: Array<{ point: Point3D & { index: number }; distance: number }> = [];
    this._knnSearch(tree, query, k, heap);
    return heap
      .sort((a, b) => a.distance - b.distance)
      .map(item => ({
        point: { x: item.point.x, y: item.point.y, z: item.point.z },
        distance: Math.sqrt(item.distance),
        index: item.point.index,
      }));
  }

  radiusSearch(tree: KDNode | null, center: Point3D, radius: number): NearestResult[] {
    if (!tree) return [];
    const results: Array<{ point: any; distance: number }> = [];
    const radiusSq = radius * radius;
    this._radiusSearchRecursive(tree, center, radiusSq, results);
    return results.map(item => ({
      point: { x: item.point.x, y: item.point.y, z: item.point.z },
      distance: Math.sqrt(item.distance),
      index: item.point.index,
    }));
  }

  rangeQuery(tree: KDNode | null, minBound: Point3D, maxBound: Point3D): NearestResult[] {
    if (!tree) return [];
    const results: Array<Point3D & { index: number }> = [];
    this._rangeQueryRecursive(tree, minBound, maxBound, results);
    return results.map(p => ({
      point: { x: p.x, y: p.y, z: p.z },
      distance: 0,
      index: p.index,
    }));
  }

  // --- Internal ---

  private _buildRecursive(points: Array<Point3D & { index: number }>, depth: number): KDNode | null {
    if (points.length === 0) return null;
    if (points.length === 1) return { point: points[0], left: null, right: null, axis: depth % 3 };

    const axis = depth % 3;
    const axisKey = (["x", "y", "z"] as const)[axis];
    points.sort((a, b) => a[axisKey] - b[axisKey]);
    const mid = Math.floor(points.length / 2);

    return {
      point: points[mid],
      axis,
      left: this._buildRecursive(points.slice(0, mid), depth + 1),
      right: this._buildRecursive(points.slice(mid + 1), depth + 1),
    };
  }

  private _nnSearch(node: KDNode | null, query: Point3D, best: { point: (Point3D & { index: number }) | null; distance: number }): void {
    if (!node) return;
    const dist = this._squaredDistance(query, node.point);
    if (dist < best.distance) { best.distance = dist; best.point! = node.point; }

    const axisKey = (["x", "y", "z"] as const)[node.axis];
    const diff = query[axisKey] - node.point[axisKey];
    this._nnSearch(diff < 0 ? node.left : node.right, query, best);
    if (diff * diff < best.distance) {
      this._nnSearch(diff < 0 ? node.right : node.left, query, best);
    }
  }

  private _knnSearch(node: KDNode | null, query: Point3D, k: number, heap: Array<{ point: Point3D & { index: number }; distance: number }>): void {
    if (!node) return;
    const dist = this._squaredDistance(query, node.point);

    if (heap.length < k) {
      heap.push({ point: node.point, distance: dist });
      if (heap.length === k) {
        for (let i = Math.floor(heap.length / 2) - 1; i >= 0; i--) this._maxHeapify(heap, i);
      }
    } else if (dist < heap[0].distance) {
      heap[0] = { point: node.point, distance: dist };
      this._maxHeapify(heap, 0);
    }

    const axisKey = (["x", "y", "z"] as const)[node.axis];
    const diff = query[axisKey] - node.point[axisKey];
    this._knnSearch(diff < 0 ? node.left : node.right, query, k, heap);
    if (diff * diff < (heap.length < k ? Infinity : heap[0].distance)) {
      this._knnSearch(diff < 0 ? node.right : node.left, query, k, heap);
    }
  }

  private _maxHeapify(heap: Array<{ distance: number }>, i: number): void {
    const left = 2 * i + 1, right = 2 * i + 2;
    let largest = i;
    if (left < heap.length && heap[left].distance > heap[largest].distance) largest = left;
    if (right < heap.length && heap[right].distance > heap[largest].distance) largest = right;
    if (largest !== i) {
      [heap[i], heap[largest]] = [heap[largest], heap[i]];
      this._maxHeapify(heap, largest);
    }
  }

  private _radiusSearchRecursive(node: KDNode | null, center: Point3D, radiusSq: number, results: Array<{ point: Point3D & { index: number }; distance: number }>): void {
    if (!node) return;
    const dist = this._squaredDistance(center, node.point);
    if (dist <= radiusSq) results.push({ point: node.point, distance: dist });

    const axisKey = (["x", "y", "z"] as const)[node.axis];
    const diff = center[axisKey] - node.point[axisKey];
    this._radiusSearchRecursive(diff < 0 ? node.left : node.right, center, radiusSq, results);
    if (diff * diff <= radiusSq) {
      this._radiusSearchRecursive(diff < 0 ? node.right : node.left, center, radiusSq, results);
    }
  }

  private _rangeQueryRecursive(node: KDNode | null, minB: Point3D, maxB: Point3D, results: Array<Point3D & { index: number }>): void {
    if (!node) return;
    const p = node.point;
    if (p.x >= minB.x && p.x <= maxB.x && p.y >= minB.y && p.y <= maxB.y && p.z >= minB.z && p.z <= maxB.z) {
      results.push(p);
    }
    const axisKey = (["x", "y", "z"] as const)[node.axis];
    if (minB[axisKey] <= node.point[axisKey]) this._rangeQueryRecursive(node.left, minB, maxB, results);
    if (maxB[axisKey] >= node.point[axisKey]) this._rangeQueryRecursive(node.right, minB, maxB, results);
  }

  private _squaredDistance(a: Point3D, b: Point3D): number {
    return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
  }
}

// ---------------------------------------------------------------------------
// Octree
// ---------------------------------------------------------------------------

class OctreeImpl {

  build(points: Point3D[], maxDepth: number = 10, maxPoints: number = 8): OctreeNode {
    const bounds = this._computeBounds(points);
    const size = Math.max(
      bounds.max.x - bounds.min.x,
      bounds.max.y - bounds.min.y,
      bounds.max.z - bounds.min.z
    );
    const center = {
      x: (bounds.min.x + bounds.max.x) / 2,
      y: (bounds.min.y + bounds.max.y) / 2,
      z: (bounds.min.z + bounds.max.z) / 2,
    };
    const cubeBounds: Bounds3D = {
      min: { x: center.x - size / 2, y: center.y - size / 2, z: center.z - size / 2 },
      max: { x: center.x + size / 2, y: center.y + size / 2, z: center.z + size / 2 },
    };
    return this._buildRecursive(
      points.map((p, i) => ({ ...p, index: i })),
      cubeBounds, 0, maxDepth, maxPoints
    );
  }

  radiusSearch(octree: OctreeNode, center: Point3D, radius: number): NearestResult[] {
    const results: NearestResult[] = [];
    this._radiusSearchRecursive(octree, center, radius, results);
    return results;
  }

  voxelize(vertices: Point3D[], faces: number[][], resolution: number): VoxelResult {
    const bounds = this._computeBounds(vertices);
    const size = Math.max(
      bounds.max.x - bounds.min.x,
      bounds.max.y - bounds.min.y,
      bounds.max.z - bounds.min.z
    );
    const cellSize = size / resolution;
    const voxels = new Set<string>();

    for (const face of faces) {
      if (face.length < 3) continue;
      this._voxelizeTriangle(vertices[face[0]], vertices[face[1]], vertices[face[2]], bounds.min, cellSize, resolution, voxels);
    }

    return {
      voxels: Array.from(voxels).map(key => {
        const [x, y, z] = key.split(",").map(Number);
        return { x, y, z };
      }),
      resolution,
      cellSize,
      bounds,
    };
  }

  // --- Internal ---

  private _buildRecursive(
    points: Array<Point3D & { index: number }>,
    bounds: Bounds3D, depth: number, maxDepth: number, maxPoints: number
  ): OctreeNode {
    const node: OctreeNode = { bounds, points: [], children: null, isLeaf: true, depth };
    if (points.length <= maxPoints || depth >= maxDepth) {
      node.points = points;
      return node;
    }

    node.isLeaf = false;
    node.children = new Array(8).fill(null);
    const cx = (bounds.min.x + bounds.max.x) / 2;
    const cy = (bounds.min.y + bounds.max.y) / 2;
    const cz = (bounds.min.z + bounds.max.z) / 2;

    const childBounds: Bounds3D[] = [];
    const childPoints: Array<Array<Point3D & { index: number }>> = Array.from({ length: 8 }, () => []);

    for (let i = 0; i < 8; i++) {
      childBounds.push({
        min: { x: (i & 1) ? cx : bounds.min.x, y: (i & 2) ? cy : bounds.min.y, z: (i & 4) ? cz : bounds.min.z },
        max: { x: (i & 1) ? bounds.max.x : cx, y: (i & 2) ? bounds.max.y : cy, z: (i & 4) ? bounds.max.z : cz },
      });
    }

    for (const p of points) {
      const idx = (p.x >= cx ? 1 : 0) | (p.y >= cy ? 2 : 0) | (p.z >= cz ? 4 : 0);
      childPoints[idx].push(p);
    }

    for (let i = 0; i < 8; i++) {
      if (childPoints[i].length > 0) {
        node.children[i] = this._buildRecursive(childPoints[i], childBounds[i], depth + 1, maxDepth, maxPoints);
      }
    }

    return node;
  }

  private _radiusSearchRecursive(node: OctreeNode, center: Point3D, radius: number, results: NearestResult[]): void {
    if (!node || !this._sphereIntersectsBox(center, radius, node.bounds)) return;

    if (node.isLeaf) {
      const radiusSq = radius * radius;
      for (const p of node.points) {
        const distSq = (p.x - center.x) ** 2 + (p.y - center.y) ** 2 + (p.z - center.z) ** 2;
        if (distSq <= radiusSq) {
          results.push({ point: { x: p.x, y: p.y, z: p.z }, distance: Math.sqrt(distSq), index: p.index });
        }
      }
    } else if (node.children) {
      for (const child of node.children) {
        if (child) this._radiusSearchRecursive(child, center, radius, results);
      }
    }
  }

  private _voxelizeTriangle(v0: Point3D, v1: Point3D, v2: Point3D, origin: Point3D, cellSize: number, resolution: number, voxels: Set<string>): void {
    if (!v0 || !v1 || !v2) return;
    const minX = Math.max(0, Math.floor((Math.min(v0.x, v1.x, v2.x) - origin.x) / cellSize));
    const minY = Math.max(0, Math.floor((Math.min(v0.y, v1.y, v2.y) - origin.y) / cellSize));
    const minZ = Math.max(0, Math.floor((Math.min(v0.z, v1.z, v2.z) - origin.z) / cellSize));
    const maxX = Math.min(resolution - 1, Math.floor((Math.max(v0.x, v1.x, v2.x) - origin.x) / cellSize));
    const maxY = Math.min(resolution - 1, Math.floor((Math.max(v0.y, v1.y, v2.y) - origin.y) / cellSize));
    const maxZ = Math.min(resolution - 1, Math.floor((Math.max(v0.z, v1.z, v2.z) - origin.z) / cellSize));
    for (let z = minZ; z <= maxZ; z++) {
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          voxels.add(`${x},${y},${z}`);
        }
      }
    }
  }

  private _sphereIntersectsBox(center: Point3D, radius: number, box: Bounds3D): boolean {
    let distSq = 0;
    if (center.x < box.min.x) distSq += (box.min.x - center.x) ** 2;
    else if (center.x > box.max.x) distSq += (center.x - box.max.x) ** 2;
    if (center.y < box.min.y) distSq += (box.min.y - center.y) ** 2;
    else if (center.y > box.max.y) distSq += (center.y - box.max.y) ** 2;
    if (center.z < box.min.z) distSq += (box.min.z - center.z) ** 2;
    else if (center.z > box.max.z) distSq += (center.z - box.max.z) ** 2;
    return distSq <= radius * radius;
  }

  private _computeBounds(points: Point3D[]): Bounds3D {
    const min = { x: Infinity, y: Infinity, z: Infinity };
    const max = { x: -Infinity, y: -Infinity, z: -Infinity };
    for (const p of points) {
      if (p.x < min.x) min.x = p.x;
      if (p.y < min.y) min.y = p.y;
      if (p.z < min.z) min.z = p.z;
      if (p.x > max.x) max.x = p.x;
      if (p.y > max.y) max.y = p.y;
      if (p.z > max.z) max.z = p.z;
    }
    return { min, max };
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const kdTree = new KDTreeImpl();
export const octree = new OctreeImpl();
