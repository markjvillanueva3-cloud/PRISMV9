/**
 * StepImportEngine — STEP/AP203/AP214 File Import via OpenCascade (occt-import-js)
 *
 * Wraps the occt-import-js WASM module to parse STEP files and extract:
 *   - Triangulated mesh data (vertices, faces, edges, normals)
 *   - Geometric metadata (bounding box, volume, surface area, part count)
 *   - Manufacturing-relevant features (holes, pockets, slots, fillets, chamfers)
 *   - Wall thickness estimates via mesh ray-casting
 *   - B-Rep topology summaries (shells, faces, edges, vertices)
 *
 * Actions: step_import, step_analyze, step_features
 *
 * Unblocks RX-MS0 P3-U02 (deferred STEP file parsing).
 *
 * @module engines/StepImportEngine
 */

import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox3D {
  min: Point3D;
  max: Point3D;
  size: Point3D;
}

export interface MeshData {
  name: string;
  color: { r: number; g: number; b: number; a: number } | null;
  vertex_count: number;
  triangle_count: number;
  vertices: number[];
  normals: number[];
  indices: number[];
}

export interface StepImportResult {
  file_path: string;
  mesh_count: number;
  total_vertices: number;
  total_triangles: number;
  meshes: MeshData[];
  bounding_box: BoundingBox3D;
}

export interface StepAnalysisResult {
  file_path: string;
  file_size_bytes: number;
  mesh_count: number;
  part_count: number;
  assembly_structure: AssemblyNode[];
  bounding_box: BoundingBox3D;
  volume_mm3: number;
  surface_area_mm2: number;
  total_vertices: number;
  total_triangles: number;
  total_edges_estimate: number;
}

export interface AssemblyNode {
  name: string;
  vertex_count: number;
  triangle_count: number;
  bounding_box: BoundingBox3D;
  volume_mm3: number;
  surface_area_mm2: number;
}

export interface HoleFeature {
  type: "through_hole" | "blind_hole";
  center: Point3D;
  axis: Point3D;
  diameter_mm: number;
  depth_mm: number;
  confidence: number;
}

export interface PlanarFace {
  normal: Point3D;
  area_mm2: number;
  centroid: Point3D;
}

export interface CylindricalFace {
  axis: Point3D;
  center: Point3D;
  radius_mm: number;
  height_mm: number;
  is_inner: boolean;
}

export interface FilletFeature {
  radius_mm: number;
  location: Point3D;
  confidence: number;
}

export interface ChamferFeature {
  width_mm: number;
  angle_deg: number;
  location: Point3D;
  confidence: number;
}

export interface SlotFeature {
  width_mm: number;
  length_mm: number;
  depth_mm: number;
  center: Point3D;
  direction: Point3D;
  confidence: number;
}

export interface PocketFeature {
  width_mm: number;
  length_mm: number;
  depth_mm: number;
  center: Point3D;
  corner_radius_mm: number;
  confidence: number;
}

export interface StepFeatureResult {
  file_path: string;
  holes: HoleFeature[];
  pockets: PocketFeature[];
  slots: SlotFeature[];
  planar_faces: PlanarFace[];
  cylindrical_faces: CylindricalFace[];
  fillets: FilletFeature[];
  chamfers: ChamferFeature[];
  feature_summary: Record<string, number>;
}

export interface WallThicknessResult {
  file_path: string;
  min_thickness_mm: number;
  max_thickness_mm: number;
  avg_thickness_mm: number;
  thin_regions: Array<{ location: Point3D; thickness_mm: number }>;
  ray_count: number;
  hit_count: number;
}

export interface BRepSummary {
  file_path: string;
  shell_count: number;
  face_count: number;
  edge_count: number;
  vertex_count: number;
  mesh_count: number;
  topology_type: "solid" | "sheet" | "wire" | "mixed";
}

// ============================================================================
// INTERNALS — occt-import-js wrapper
// ============================================================================

/** Cached WASM instance */
let _occtInstance: any = null;

async function getOcct(): Promise<any> {
  if (_occtInstance) return _occtInstance;
  const occtimportjs = (await import("occt-import-js")).default;
  _occtInstance = await occtimportjs();
  return _occtInstance;
}

interface OcctMesh {
  name?: string;
  color?: [number, number, number, number] | { r: number; g: number; b: number; a: number };
  attributes: {
    position: { array: Float32Array | number[] };
    normal?: { array: Float32Array | number[] };
  };
  index?: { array: Uint32Array | number[] };
}

interface OcctResult {
  meshes: OcctMesh[];
}

function readStepBuffer(filePath: string): Uint8Array {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`STEP file not found: ${resolved}`);
  }
  const buf = fs.readFileSync(resolved);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

async function parseStepFile(filePath: string): Promise<OcctResult> {
  const occt = await getOcct();
  const fileBuffer = readStepBuffer(filePath);
  const result = occt.ReadStepFile(fileBuffer, null);
  if (!result || !result.meshes) {
    throw new Error(`Failed to parse STEP file: ${filePath}`);
  }
  return result;
}

// ============================================================================
// GEOMETRY HELPERS
// ============================================================================

function computeBoundingBox(positions: number[]): BoundingBox3D {
  if (positions.length < 3) {
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
      size: { x: 0, y: 0, z: 0 },
    };
  }
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
    size: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ },
  };
}

function mergeBoundingBoxes(boxes: BoundingBox3D[]): BoundingBox3D {
  if (boxes.length === 0) {
    return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 }, size: { x: 0, y: 0, z: 0 } };
  }
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const b of boxes) {
    if (b.min.x < minX) minX = b.min.x;
    if (b.min.y < minY) minY = b.min.y;
    if (b.min.z < minZ) minZ = b.min.z;
    if (b.max.x > maxX) maxX = b.max.x;
    if (b.max.y > maxY) maxY = b.max.y;
    if (b.max.z > maxZ) maxZ = b.max.z;
  }
  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
    size: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ },
  };
}

/**
 * Compute signed volume of a triangulated mesh using the divergence theorem.
 * V = (1/6) * sum_i (v0 . (v1 x v2)) for each triangle
 */
function computeMeshVolume(positions: number[], indices: number[]): number {
  let vol = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3, i1 = indices[i + 1] * 3, i2 = indices[i + 2] * 3;
    const x0 = positions[i0], y0 = positions[i0 + 1], z0 = positions[i0 + 2];
    const x1 = positions[i1], y1 = positions[i1 + 1], z1 = positions[i1 + 2];
    const x2 = positions[i2], y2 = positions[i2 + 1], z2 = positions[i2 + 2];
    // Signed volume of tetrahedron formed with origin
    const cross_x = y1 * z2 - z1 * y2;
    const cross_y = z1 * x2 - x1 * z2;
    const cross_z = x1 * y2 - y1 * x2;
    vol += x0 * cross_x + y0 * cross_y + z0 * cross_z;
  }
  return Math.abs(vol) / 6.0;
}

/**
 * Compute surface area as sum of triangle areas.
 * A = 0.5 * ||(v1-v0) x (v2-v0)||
 */
function computeMeshSurfaceArea(positions: number[], indices: number[]): number {
  let area = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3, i1 = indices[i + 1] * 3, i2 = indices[i + 2] * 3;
    const ax = positions[i1] - positions[i0], ay = positions[i1 + 1] - positions[i0 + 1], az = positions[i1 + 2] - positions[i0 + 2];
    const bx = positions[i2] - positions[i0], by = positions[i2 + 1] - positions[i0 + 1], bz = positions[i2 + 2] - positions[i0 + 2];
    const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
    area += Math.sqrt(cx * cx + cy * cy + cz * cz);
  }
  return area * 0.5;
}

function vec3Normalize(v: Point3D): Point3D {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < 1e-12) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function vec3Dot(a: Point3D, b: Point3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function vec3Sub(a: Point3D, b: Point3D): Point3D {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vec3Cross(a: Point3D, b: Point3D): Point3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function vec3Length(v: Point3D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function vec3Add(a: Point3D, b: Point3D): Point3D {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function vec3Scale(v: Point3D, s: number): Point3D {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

// ============================================================================
// FEATURE DETECTION HELPERS
// ============================================================================

interface TriangleNormal {
  centroid: Point3D;
  normal: Point3D;
  area: number;
  vertices: [Point3D, Point3D, Point3D];
}

function extractTriangleNormals(positions: number[], indices: number[]): TriangleNormal[] {
  const tris: TriangleNormal[] = [];
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3, i1 = indices[i + 1] * 3, i2 = indices[i + 2] * 3;
    const v0: Point3D = { x: positions[i0], y: positions[i0 + 1], z: positions[i0 + 2] };
    const v1: Point3D = { x: positions[i1], y: positions[i1 + 1], z: positions[i1 + 2] };
    const v2: Point3D = { x: positions[i2], y: positions[i2 + 1], z: positions[i2 + 2] };
    const edge1 = vec3Sub(v1, v0);
    const edge2 = vec3Sub(v2, v0);
    const cross = vec3Cross(edge1, edge2);
    const len = vec3Length(cross);
    if (len < 1e-12) continue;
    const normal = vec3Scale(cross, 1 / len);
    const area = len * 0.5;
    const centroid: Point3D = {
      x: (v0.x + v1.x + v2.x) / 3,
      y: (v0.y + v1.y + v2.y) / 3,
      z: (v0.z + v1.z + v2.z) / 3,
    };
    tris.push({ centroid, normal, area, vertices: [v0, v1, v2] });
  }
  return tris;
}

/**
 * Group triangles by similar normal direction (planar face detection).
 * Uses angular threshold for grouping.
 */
function detectPlanarFaces(triangles: TriangleNormal[], angleTolDeg: number = 5): PlanarFace[] {
  const tolCos = Math.cos((angleTolDeg * Math.PI) / 180);
  const groups: Array<{ normal: Point3D; triangles: TriangleNormal[] }> = [];

  for (const tri of triangles) {
    let found = false;
    for (const g of groups) {
      if (Math.abs(vec3Dot(g.normal, tri.normal)) > tolCos) {
        g.triangles.push(tri);
        found = true;
        break;
      }
    }
    if (!found) {
      groups.push({ normal: { ...tri.normal }, triangles: [tri] });
    }
  }

  // Filter to groups with meaningful area (at least 3 triangles)
  const faces: PlanarFace[] = [];
  for (const g of groups) {
    if (g.triangles.length < 3) continue;
    let totalArea = 0;
    let cx = 0, cy = 0, cz = 0;
    for (const t of g.triangles) {
      totalArea += t.area;
      cx += t.centroid.x * t.area;
      cy += t.centroid.y * t.area;
      cz += t.centroid.z * t.area;
    }
    if (totalArea < 1e-6) continue;
    faces.push({
      normal: vec3Normalize(g.normal),
      area_mm2: totalArea,
      centroid: { x: cx / totalArea, y: cy / totalArea, z: cz / totalArea },
    });
  }

  return faces.sort((a, b) => b.area_mm2 - a.area_mm2);
}

/**
 * Detect cylindrical faces by grouping triangles whose normals point radially
 * outward from a common axis. We look for rings of normals at similar heights.
 */
function detectCylindricalFaces(triangles: TriangleNormal[], bbox: BoundingBox3D): CylindricalFace[] {
  const cylinders: CylindricalFace[] = [];
  const axes: Point3D[] = [
    { x: 0, y: 0, z: 1 }, // Z axis
    { x: 0, y: 1, z: 0 }, // Y axis
    { x: 1, y: 0, z: 0 }, // X axis
  ];

  for (const axis of axes) {
    // Triangles whose normals are perpendicular to this axis (cylindrical surface)
    const perpTris = triangles.filter(t => {
      const dot = Math.abs(vec3Dot(t.normal, axis));
      return dot < 0.15; // normal perpendicular to axis
    });

    if (perpTris.length < 6) continue;

    // Group by distance from axis (radius bins)
    const binsMap = new Map<number, TriangleNormal[]>();
    const binSize = Math.max(0.5, (bbox.size.x + bbox.size.y + bbox.size.z) / 300);

    for (const tri of perpTris) {
      // Distance from centroid to the axis line (through bbox center)
      const bboxCenter: Point3D = {
        x: (bbox.min.x + bbox.max.x) / 2,
        y: (bbox.min.y + bbox.max.y) / 2,
        z: (bbox.min.z + bbox.max.z) / 2,
      };
      const toPoint = vec3Sub(tri.centroid, bboxCenter);
      const proj = vec3Scale(axis, vec3Dot(toPoint, axis));
      const radial = vec3Sub(toPoint, proj);
      const radius = vec3Length(radial);
      const binKey = Math.round(radius / binSize);
      if (!binsMap.has(binKey)) binsMap.set(binKey, []);
      binsMap.get(binKey)!.push(tri);
    }

    for (const binKey of Array.from(binsMap.keys())) {
      const binTris = binsMap.get(binKey)!;
      if (binTris.length < 6) continue;

      // Compute average radius and height span
      const bboxCenter: Point3D = {
        x: (bbox.min.x + bbox.max.x) / 2,
        y: (bbox.min.y + bbox.max.y) / 2,
        z: (bbox.min.z + bbox.max.z) / 2,
      };
      let radiusSum = 0;
      let minH = Infinity, maxH = -Infinity;
      let cx = 0, cy = 0, cz = 0;

      for (const tri of binTris) {
        const toPoint = vec3Sub(tri.centroid, bboxCenter);
        const h = vec3Dot(toPoint, axis);
        const proj = vec3Scale(axis, h);
        const radial = vec3Sub(toPoint, proj);
        radiusSum += vec3Length(radial);
        if (h < minH) minH = h;
        if (h > maxH) maxH = h;
        cx += tri.centroid.x;
        cy += tri.centroid.y;
        cz += tri.centroid.z;
      }

      const avgRadius = radiusSum / binTris.length;
      const height = maxH - minH;

      if (avgRadius < 0.1 || height < 0.1) continue;

      // Determine if inner or outer: check if normals point inward (toward axis)
      let inwardCount = 0;
      for (const tri of binTris) {
        const toCenter = vec3Sub(bboxCenter, tri.centroid);
        if (vec3Dot(toCenter, tri.normal) > 0) inwardCount++;
      }
      const isInner = inwardCount > binTris.length * 0.6;

      cylinders.push({
        axis,
        center: { x: cx / binTris.length, y: cy / binTris.length, z: cz / binTris.length },
        radius_mm: avgRadius,
        height_mm: height,
        is_inner: isInner,
      });
    }
  }

  return cylinders;
}

/**
 * Detect holes from inner cylindrical faces with small radii.
 */
function detectHoles(cylindricalFaces: CylindricalFace[]): HoleFeature[] {
  const holes: HoleFeature[] = [];
  for (const cyl of cylindricalFaces) {
    if (!cyl.is_inner) continue;
    if (cyl.radius_mm > 100) continue; // skip large bores

    const aspectRatio = cyl.height_mm / (cyl.radius_mm * 2);
    const isThrough = aspectRatio > 2.0;

    holes.push({
      type: isThrough ? "through_hole" : "blind_hole",
      center: cyl.center,
      axis: cyl.axis,
      diameter_mm: cyl.radius_mm * 2,
      depth_mm: cyl.height_mm,
      confidence: Math.min(0.95, 0.6 + aspectRatio * 0.05),
    });
  }
  return holes.sort((a, b) => a.diameter_mm - b.diameter_mm);
}

/**
 * Detect fillets by looking for narrow strips of triangles with smoothly
 * varying normals between two adjacent planar faces.
 */
function detectFillets(triangles: TriangleNormal[], bbox: BoundingBox3D): FilletFeature[] {
  const fillets: FilletFeature[] = [];
  const diag = vec3Length(bbox.size);
  if (diag < 1e-6) return fillets;

  // Find triangles with high curvature (normals change rapidly in neighborhood)
  // Simple heuristic: small triangles whose normals differ significantly from neighbors
  const smallTris = triangles.filter(t => t.area < diag * diag * 0.0001 && t.area > 1e-8);

  // Cluster small triangles by proximity
  const visited = new Set<number>();
  const clusters: TriangleNormal[][] = [];
  const proxThreshold = diag * 0.02;

  for (let i = 0; i < smallTris.length; i++) {
    if (visited.has(i)) continue;
    const cluster: TriangleNormal[] = [smallTris[i]];
    visited.add(i);
    const queue = [i];
    while (queue.length > 0) {
      const ci = queue.shift()!;
      for (let j = 0; j < smallTris.length; j++) {
        if (visited.has(j)) continue;
        const d = vec3Length(vec3Sub(smallTris[ci].centroid, smallTris[j].centroid));
        if (d < proxThreshold) {
          visited.add(j);
          cluster.push(smallTris[j]);
          queue.push(j);
          if (cluster.length > 200) break; // cap cluster size
        }
      }
      if (cluster.length > 200) break;
    }
    if (cluster.length >= 3) {
      clusters.push(cluster);
    }
  }

  // For each cluster, estimate fillet radius from curvature
  for (const cluster of clusters) {
    if (cluster.length < 3) continue;
    // Estimate radius: average distance between normals divided by arc length
    let totalNormalChange = 0;
    let totalArcLen = 0;
    for (let i = 1; i < cluster.length; i++) {
      const dot = vec3Dot(cluster[i - 1].normal, cluster[i].normal);
      const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
      const dist = vec3Length(vec3Sub(cluster[i].centroid, cluster[i - 1].centroid));
      totalNormalChange += angle;
      totalArcLen += dist;
    }
    if (totalNormalChange < 0.1 || totalArcLen < 1e-6) continue;
    const radius = totalArcLen / totalNormalChange;
    if (radius < 0.01 || radius > diag * 0.3) continue;

    // Centroid of cluster
    let cx = 0, cy = 0, cz = 0;
    for (const t of cluster) {
      cx += t.centroid.x; cy += t.centroid.y; cz += t.centroid.z;
    }
    const n = cluster.length;
    fillets.push({
      radius_mm: radius,
      location: { x: cx / n, y: cy / n, z: cz / n },
      confidence: Math.min(0.9, 0.5 + cluster.length * 0.01),
    });
  }

  return fillets.sort((a, b) => a.radius_mm - b.radius_mm);
}

/**
 * Detect chamfers: triangles at ~45 degrees between two perpendicular planar faces.
 */
function detectChamfers(triangles: TriangleNormal[], planarFaces: PlanarFace[]): ChamferFeature[] {
  const chamfers: ChamferFeature[] = [];
  if (planarFaces.length < 2) return chamfers;

  // Find triangles at ~45 degree angles to primary faces
  const primaryNormals = planarFaces.slice(0, Math.min(6, planarFaces.length)).map(f => f.normal);

  const chamferTris = triangles.filter(t => {
    for (const pn of primaryNormals) {
      const dot = Math.abs(vec3Dot(t.normal, pn));
      // Chamfer: ~45 degrees → dot ≈ 0.707
      if (dot > 0.6 && dot < 0.8) return true;
    }
    return false;
  });

  // Cluster by proximity
  if (chamferTris.length < 3) return chamfers;

  const diag = vec3Length({
    x: planarFaces[0].centroid.x,
    y: planarFaces[0].centroid.y,
    z: planarFaces[0].centroid.z,
  }) || 100;
  const proxThresh = diag * 0.05 || 5;

  const visited = new Set<number>();
  for (let i = 0; i < chamferTris.length; i++) {
    if (visited.has(i)) continue;
    const cluster = [chamferTris[i]];
    visited.add(i);
    for (let j = i + 1; j < chamferTris.length; j++) {
      if (visited.has(j)) continue;
      if (vec3Length(vec3Sub(chamferTris[i].centroid, chamferTris[j].centroid)) < proxThresh) {
        cluster.push(chamferTris[j]);
        visited.add(j);
      }
    }
    if (cluster.length < 2) continue;

    // Estimate chamfer width from triangle extent
    let minP = Infinity, maxP = -Infinity;
    const refNormal = primaryNormals[0];
    for (const t of cluster) {
      const p = vec3Dot(t.centroid, refNormal);
      if (p < minP) minP = p;
      if (p > maxP) maxP = p;
    }
    const width = maxP - minP;
    if (width < 0.01) continue;

    let cx = 0, cy = 0, cz = 0;
    for (const t of cluster) {
      cx += t.centroid.x; cy += t.centroid.y; cz += t.centroid.z;
    }
    const n = cluster.length;
    chamfers.push({
      width_mm: width,
      angle_deg: 45, // default assumption
      location: { x: cx / n, y: cy / n, z: cz / n },
      confidence: Math.min(0.85, 0.5 + cluster.length * 0.02),
    });
  }

  return chamfers;
}

/**
 * Detect slots: elongated pockets with parallel walls.
 * Identified as pairs of inner cylindrical faces with similar radius aligned along same axis.
 */
function detectSlots(cylindricalFaces: CylindricalFace[], holes: HoleFeature[]): SlotFeature[] {
  const slots: SlotFeature[] = [];
  const holeSet = new Set(holes.map(h => `${h.center.x.toFixed(2)},${h.center.y.toFixed(2)},${h.center.z.toFixed(2)}`));

  const innerCyls = cylindricalFaces.filter(c => {
    if (!c.is_inner) return false;
    const key = `${c.center.x.toFixed(2)},${c.center.y.toFixed(2)},${c.center.z.toFixed(2)}`;
    return !holeSet.has(key);
  });

  // Pair inner cylinders with similar radii and axes
  for (let i = 0; i < innerCyls.length; i++) {
    for (let j = i + 1; j < innerCyls.length; j++) {
      const a = innerCyls[i], b = innerCyls[j];
      const axisDot = Math.abs(vec3Dot(a.axis, b.axis));
      if (axisDot < 0.95) continue; // not parallel
      const radiusDiff = Math.abs(a.radius_mm - b.radius_mm);
      if (radiusDiff > a.radius_mm * 0.1) continue; // different radii

      const dist = vec3Length(vec3Sub(a.center, b.center));
      if (dist < a.radius_mm * 0.5) continue; // too close (same feature)

      slots.push({
        width_mm: a.radius_mm * 2,
        length_mm: dist,
        depth_mm: Math.min(a.height_mm, b.height_mm),
        center: {
          x: (a.center.x + b.center.x) / 2,
          y: (a.center.y + b.center.y) / 2,
          z: (a.center.z + b.center.z) / 2,
        },
        direction: vec3Normalize(vec3Sub(b.center, a.center)),
        confidence: 0.7,
      });
    }
  }

  return slots;
}

/**
 * Detect pockets: rectangular depressions surrounded by planar faces.
 */
function detectPockets(planarFaces: PlanarFace[], bbox: BoundingBox3D): PocketFeature[] {
  const pockets: PocketFeature[] = [];
  const diag = vec3Length(bbox.size);
  if (diag < 1e-6) return pockets;

  // Look for small planar faces recessed from larger faces with same normal direction
  const majorAxes: Point3D[] = [
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 1, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 0, z: -1 },
    { x: 0, y: -1, z: 0 },
    { x: -1, y: 0, z: 0 },
  ];

  for (const axis of majorAxes) {
    const alignedFaces = planarFaces.filter(f => Math.abs(vec3Dot(f.normal, axis)) > 0.95);
    if (alignedFaces.length < 2) continue;

    // Sort by offset along axis
    const sorted = alignedFaces
      .map(f => ({ face: f, offset: vec3Dot(f.centroid, axis) }))
      .sort((a, b) => a.offset - b.offset);

    // Pairs with offset difference (recessed face = pocket bottom)
    for (let i = 0; i < sorted.length - 1; i++) {
      const depth = sorted[i + 1].offset - sorted[i].offset;
      if (depth < 0.5 || depth > diag * 0.5) continue;
      const bottomFace = sorted[i].face;
      if (bottomFace.area_mm2 > sorted[i + 1].face.area_mm2) continue; // bottom should be smaller

      const sideLen = Math.sqrt(bottomFace.area_mm2);
      pockets.push({
        width_mm: sideLen,
        length_mm: sideLen,
        depth_mm: depth,
        center: bottomFace.centroid,
        corner_radius_mm: 0, // would need fillet data to determine
        confidence: 0.6,
      });
    }
  }

  return pockets;
}

// ============================================================================
// RAY-MESH INTERSECTION (for wall thickness)
// ============================================================================

interface Triangle3D {
  v0: Point3D;
  v1: Point3D;
  v2: Point3D;
}

/**
 * Moller-Trumbore ray-triangle intersection.
 * Returns distance t or -1 if no hit.
 */
function rayTriangleIntersect(
  origin: Point3D, dir: Point3D, tri: Triangle3D
): number {
  const EPSILON = 1e-8;
  const edge1 = vec3Sub(tri.v1, tri.v0);
  const edge2 = vec3Sub(tri.v2, tri.v0);
  const h = vec3Cross(dir, edge2);
  const a = vec3Dot(edge1, h);
  if (a > -EPSILON && a < EPSILON) return -1;
  const f = 1.0 / a;
  const s = vec3Sub(origin, tri.v0);
  const u = f * vec3Dot(s, h);
  if (u < 0.0 || u > 1.0) return -1;
  const q = vec3Cross(s, edge1);
  const v = f * vec3Dot(dir, q);
  if (v < 0.0 || u + v > 1.0) return -1;
  const t = f * vec3Dot(edge2, q);
  if (t > EPSILON) return t;
  return -1;
}

/**
 * Cast a ray against all triangles, return nearest hit distance.
 */
function castRay(
  origin: Point3D, dir: Point3D, triangles: Triangle3D[], minDist: number = 0.01
): number {
  let nearest = Infinity;
  for (const tri of triangles) {
    const t = rayTriangleIntersect(origin, dir, tri);
    if (t > minDist && t < nearest) {
      nearest = t;
    }
  }
  return nearest === Infinity ? -1 : nearest;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class StepImportEngine {

  // --------------------------------------------------------------------------
  // importStep — parse STEP file, return mesh data
  // --------------------------------------------------------------------------
  async importStep(input: { file_path: string }): Promise<StepImportResult> {
    const { file_path } = input;
    const occtResult = await parseStepFile(file_path);

    const meshes: MeshData[] = [];
    const allPositions: number[] = [];
    let totalVerts = 0;
    let totalTris = 0;

    for (const m of occtResult.meshes) {
      const positions = Array.from(m.attributes.position.array);
      const normals = m.attributes.normal ? Array.from(m.attributes.normal.array) : [];
      const indices = m.index ? Array.from(m.index.array) : [];
      const vertCount = Math.floor(positions.length / 3);
      const triCount = Math.floor(indices.length / 3);

      const color = m.color
        ? (Array.isArray(m.color)
          ? { r: m.color[0], g: m.color[1], b: m.color[2], a: m.color[3] ?? 1 }
          : { r: m.color.r, g: m.color.g, b: m.color.b, a: (m.color as any).a ?? 1 })
        : null;

      meshes.push({
        name: m.name || `mesh_${meshes.length}`,
        color,
        vertex_count: vertCount,
        triangle_count: triCount,
        vertices: positions,
        normals,
        indices,
      });

      allPositions.push(...positions);
      totalVerts += vertCount;
      totalTris += triCount;
    }

    return {
      file_path,
      mesh_count: meshes.length,
      total_vertices: totalVerts,
      total_triangles: totalTris,
      meshes,
      bounding_box: computeBoundingBox(allPositions),
    };
  }

  // --------------------------------------------------------------------------
  // analyzeStep — extract metadata: bbox, volume, surface area, assembly
  // --------------------------------------------------------------------------
  async analyzeStep(input: { file_path: string }): Promise<StepAnalysisResult> {
    const { file_path } = input;
    const occtResult = await parseStepFile(file_path);

    let fileSize = 0;
    try {
      const stat = fs.statSync(path.resolve(file_path));
      fileSize = stat.size;
    } catch { /* ignore */ }

    const nodes: AssemblyNode[] = [];
    let totalVerts = 0;
    let totalTris = 0;
    let totalVolume = 0;
    let totalArea = 0;
    const meshBboxes: BoundingBox3D[] = [];

    for (let i = 0; i < occtResult.meshes.length; i++) {
      const m = occtResult.meshes[i];
      const positions = Array.from(m.attributes.position.array);
      const indices = m.index ? Array.from(m.index.array) : [];
      const vertCount = Math.floor(positions.length / 3);
      const triCount = Math.floor(indices.length / 3);
      const meshBbox = computeBoundingBox(positions);
      const volume = indices.length > 0 ? computeMeshVolume(positions, indices) : 0;
      const area = indices.length > 0 ? computeMeshSurfaceArea(positions, indices) : 0;

      nodes.push({
        name: m.name || `part_${i}`,
        vertex_count: vertCount,
        triangle_count: triCount,
        bounding_box: meshBbox,
        volume_mm3: volume,
        surface_area_mm2: area,
      });

      meshBboxes.push(meshBbox);
      totalVerts += vertCount;
      totalTris += triCount;
      totalVolume += volume;
      totalArea += area;
    }

    // Euler formula edge estimate: E ≈ 3F/2 for closed triangle mesh (each edge shared by 2 tris)
    const totalEdgesEstimate = Math.round(totalTris * 1.5);

    return {
      file_path,
      file_size_bytes: fileSize,
      mesh_count: occtResult.meshes.length,
      part_count: occtResult.meshes.length,
      assembly_structure: nodes,
      bounding_box: mergeBoundingBoxes(meshBboxes),
      volume_mm3: totalVolume,
      surface_area_mm2: totalArea,
      total_vertices: totalVerts,
      total_triangles: totalTris,
      total_edges_estimate: totalEdgesEstimate,
    };
  }

  // --------------------------------------------------------------------------
  // extractFeatures — identify manufacturing-relevant features
  // --------------------------------------------------------------------------
  async extractFeatures(input: { file_path: string }): Promise<StepFeatureResult> {
    const { file_path } = input;
    const occtResult = await parseStepFile(file_path);

    // Aggregate all mesh data
    const allPositions: number[] = [];
    const allIndices: number[] = [];
    let vertexOffset = 0;

    for (const m of occtResult.meshes) {
      const positions = Array.from(m.attributes.position.array);
      const indices = m.index ? Array.from(m.index.array) : [];
      allPositions.push(...positions);
      for (const idx of indices) {
        allIndices.push(idx + vertexOffset);
      }
      vertexOffset += Math.floor(positions.length / 3);
    }

    const bbox = computeBoundingBox(allPositions);
    const triangles = extractTriangleNormals(allPositions, allIndices);

    // Detect features
    const planar_faces = detectPlanarFaces(triangles);
    const cylindrical_faces = detectCylindricalFaces(triangles, bbox);
    const holes = detectHoles(cylindrical_faces);
    const fillets = detectFillets(triangles, bbox);
    const chamfers = detectChamfers(triangles, planar_faces);
    const slots = detectSlots(cylindrical_faces, holes);
    const pockets = detectPockets(planar_faces, bbox);

    const feature_summary: Record<string, number> = {
      holes: holes.length,
      pockets: pockets.length,
      slots: slots.length,
      planar_faces: planar_faces.length,
      cylindrical_faces: cylindrical_faces.length,
      fillets: fillets.length,
      chamfers: chamfers.length,
    };

    return {
      file_path,
      holes,
      pockets,
      slots,
      planar_faces,
      cylindrical_faces,
      fillets,
      chamfers,
      feature_summary,
    };
  }

  // --------------------------------------------------------------------------
  // getWallThickness — estimate min wall thickness via ray-casting
  // --------------------------------------------------------------------------
  async getWallThickness(input: { file_path: string; ray_count?: number }): Promise<WallThicknessResult> {
    const { file_path, ray_count: requestedRays } = input;
    const occtResult = await parseStepFile(file_path);

    // Build triangle list
    const allTriangles: Triangle3D[] = [];
    const allPositions: number[] = [];
    let vertexOffset = 0;

    for (const m of occtResult.meshes) {
      const positions = Array.from(m.attributes.position.array);
      const indices = m.index ? Array.from(m.index.array) : [];
      allPositions.push(...positions);

      for (let i = 0; i < indices.length; i += 3) {
        const i0 = (indices[i] + vertexOffset) * 3;
        const i1 = (indices[i + 1] + vertexOffset) * 3;
        const i2 = (indices[i + 2] + vertexOffset) * 3;
        // Use positions with offset applied
        const baseOff = vertexOffset * 3;
        const pi0 = indices[i] * 3, pi1 = indices[i + 1] * 3, pi2 = indices[i + 2] * 3;
        allTriangles.push({
          v0: { x: positions[pi0], y: positions[pi0 + 1], z: positions[pi0 + 2] },
          v1: { x: positions[pi1], y: positions[pi1 + 1], z: positions[pi1 + 2] },
          v2: { x: positions[pi2], y: positions[pi2 + 1], z: positions[pi2 + 2] },
        });
      }
      vertexOffset += Math.floor(positions.length / 3);
    }

    const bbox = computeBoundingBox(allPositions);

    // Sample triangle centroids and cast rays along inverted normals
    const maxRays = requestedRays ?? Math.min(500, Math.max(50, allTriangles.length));
    const step = Math.max(1, Math.floor(allTriangles.length / maxRays));
    const thicknesses: Array<{ location: Point3D; thickness_mm: number }> = [];
    let hitCount = 0;
    let rayCount = 0;

    for (let i = 0; i < allTriangles.length && rayCount < maxRays; i += step) {
      const tri = allTriangles[i];
      const centroid: Point3D = {
        x: (tri.v0.x + tri.v1.x + tri.v2.x) / 3,
        y: (tri.v0.y + tri.v1.y + tri.v2.y) / 3,
        z: (tri.v0.z + tri.v1.z + tri.v2.z) / 3,
      };
      const edge1 = vec3Sub(tri.v1, tri.v0);
      const edge2 = vec3Sub(tri.v2, tri.v0);
      const normal = vec3Normalize(vec3Cross(edge1, edge2));
      if (vec3Length(normal) < 0.5) continue;

      // Cast ray inward (opposite to normal)
      const inwardDir = vec3Scale(normal, -1);
      const offset = vec3Add(centroid, vec3Scale(normal, 0.001)); // slight offset to avoid self-hit
      const dist = castRay(offset, inwardDir, allTriangles, 0.01);
      rayCount++;

      if (dist > 0 && dist < vec3Length(bbox.size)) {
        hitCount++;
        thicknesses.push({ location: centroid, thickness_mm: dist });
      }
    }

    if (thicknesses.length === 0) {
      return {
        file_path,
        min_thickness_mm: 0,
        max_thickness_mm: 0,
        avg_thickness_mm: 0,
        thin_regions: [],
        ray_count: rayCount,
        hit_count: hitCount,
      };
    }

    thicknesses.sort((a, b) => a.thickness_mm - b.thickness_mm);
    const min = thicknesses[0].thickness_mm;
    const max = thicknesses[thicknesses.length - 1].thickness_mm;
    const avg = thicknesses.reduce((s, t) => s + t.thickness_mm, 0) / thicknesses.length;

    // Thin regions: bottom 10% of thicknesses
    const thinThreshold = min + (max - min) * 0.1;
    const thin_regions = thicknesses
      .filter(t => t.thickness_mm <= thinThreshold)
      .slice(0, 20);

    return {
      file_path,
      min_thickness_mm: min,
      max_thickness_mm: max,
      avg_thickness_mm: avg,
      thin_regions,
      ray_count: rayCount,
      hit_count: hitCount,
    };
  }

  // --------------------------------------------------------------------------
  // toBRepSummary — topology summary: shells, faces, edges, vertices
  // --------------------------------------------------------------------------
  async toBRepSummary(input: { file_path: string }): Promise<BRepSummary> {
    const { file_path } = input;
    const occtResult = await parseStepFile(file_path);

    let totalFaces = 0;
    let totalVerts = 0;
    let totalTris = 0;
    let hasSheets = false;
    let hasSolids = false;

    for (const m of occtResult.meshes) {
      const positions = Array.from(m.attributes.position.array);
      const indices = m.index ? Array.from(m.index.array) : [];
      const vertCount = Math.floor(positions.length / 3);
      const triCount = Math.floor(indices.length / 3);

      totalVerts += vertCount;
      totalTris += triCount;

      // Estimate face count from connected triangle groups
      // Simple heuristic: each mesh represents approximately one shell
      // Volume test to distinguish solid vs sheet
      if (indices.length > 0) {
        const vol = computeMeshVolume(positions, indices);
        const area = computeMeshSurfaceArea(positions, indices);
        // If volume/area ratio is very small, it's likely a sheet body
        if (area > 0 && vol / area < 0.001) {
          hasSheets = true;
        } else {
          hasSolids = true;
        }
      }
    }

    // Euler formula estimates for closed manifold mesh:
    // V - E + F = 2 * shells  →  E ≈ 3F/2 for triangle mesh
    // Here F = totalTris (faces of the tessellation)
    const edgeEstimate = Math.round(totalTris * 1.5);
    // B-Rep faces (not triangles) — estimate from mesh count and triangle grouping
    // Each mesh from OCCT typically corresponds to one solid/shell
    const faceEstimate = totalTris; // tessellated face count

    let topologyType: "solid" | "sheet" | "wire" | "mixed" = "solid";
    if (hasSheets && hasSolids) topologyType = "mixed";
    else if (hasSheets) topologyType = "sheet";
    else if (!hasSolids && totalTris === 0) topologyType = "wire";

    return {
      file_path,
      shell_count: occtResult.meshes.length,
      face_count: faceEstimate,
      edge_count: edgeEstimate,
      vertex_count: totalVerts,
      mesh_count: occtResult.meshes.length,
      topology_type: topologyType,
    };
  }
}

// Singleton export
export const stepImportEngine = new StepImportEngine();
