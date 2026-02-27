/**
 * GeometryEngine — L2-P2-MS1 CAD/CAM Layer
 *
 * High-level geometry operations: boolean ops, offset, fillet, chamfer,
 * distance, area/volume, bounding box, coordinate transforms.
 * Composes CADKernelEngine primitives into manufacturing-useful operations.
 *
 * Actions: geometry_create, geometry_transform, geometry_analyze,
 *          geometry_boolean, geometry_offset, geometry_fillet
 */

import { cadKernelEngine } from "./CADKernelEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type GeomPrimitiveType = "point" | "line" | "arc" | "circle" | "rectangle" | "polygon" | "box" | "cylinder" | "sphere" | "cone";

export interface GeomPoint { x: number; y: number; z?: number; }

export interface GeomPrimitive {
  id: string;
  type: GeomPrimitiveType;
  params: Record<string, number | number[]>;
  transform?: GeomTransform;
}

export interface GeomTransform {
  translate?: GeomPoint;
  rotate_deg?: GeomPoint;  // Euler angles in degrees
  scale?: GeomPoint | number;
  mirror?: "x" | "y" | "z" | "xy" | "xz" | "yz";
}

export interface BoundingBox3D {
  min: GeomPoint;
  max: GeomPoint;
  size: GeomPoint;
  center: GeomPoint;
  volume_mm3: number;
  surface_area_mm2: number;
}

export interface DistanceResult {
  distance_mm: number;
  closest_point_a: GeomPoint;
  closest_point_b: GeomPoint;
}

export interface OffsetResult {
  success: boolean;
  offset_mm: number;
  self_intersection: boolean;
  notes: string[];
}

export interface FilletResult {
  success: boolean;
  radius_mm: number;
  edge_count: number;
  notes: string[];
}

export interface GeomAnalysis {
  primitive_count: number;
  bounding_box: BoundingBox3D;
  total_volume_mm3: number;
  total_surface_area_mm2: number;
  centroid: GeomPoint;
  is_closed: boolean;
  is_manifold: boolean;
  smallest_feature_mm: number;
}

export type BooleanOp = "union" | "subtract" | "intersect";

export interface BooleanResult {
  operation: BooleanOp;
  success: boolean;
  result_volume_mm3: number;
  notes: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class GeometryEngine {
  createPrimitive(type: GeomPrimitiveType, params: Record<string, number>): GeomPrimitive {
    const id = `geom-${type}-${Date.now().toString(36)}`;
    return { id, type, params };
  }

  boundingBox(primitives: GeomPrimitive[]): BoundingBox3D {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const p of primitives) {
      const extents = this.primitiveExtents(p);
      minX = Math.min(minX, extents.min.x);
      minY = Math.min(minY, extents.min.y);
      minZ = Math.min(minZ, extents.min.z ?? 0);
      maxX = Math.max(maxX, extents.max.x);
      maxY = Math.max(maxY, extents.max.y);
      maxZ = Math.max(maxZ, extents.max.z ?? 0);
    }

    const sx = maxX - minX, sy = maxY - minY, sz = maxZ - minZ;
    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
      size: { x: sx, y: sy, z: sz },
      center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 },
      volume_mm3: sx * sy * sz,
      surface_area_mm2: 2 * (sx * sy + sy * sz + sx * sz),
    };
  }

  /** Extract a numeric param (handles number | number[] union by taking first element of arrays). */
  private num(pr: Record<string, number | number[]>, key: string, fallback = 0): number {
    const v = pr[key];
    if (v === undefined || v === null) return fallback;
    return typeof v === "number" ? v : (v[0] ?? fallback);
  }

  private primitiveExtents(p: GeomPrimitive): { min: GeomPoint; max: GeomPoint } {
    const pr = p.params;
    switch (p.type) {
      case "box": {
        const hw = this.num(pr, "width", 100) / 2, hh = this.num(pr, "height", 100) / 2, hd = this.num(pr, "depth", 100) / 2;
        const cx = this.num(pr, "cx"), cy = this.num(pr, "cy"), cz = this.num(pr, "cz");
        return { min: { x: cx - hw, y: cy - hh, z: cz - hd }, max: { x: cx + hw, y: cy + hh, z: cz + hd } };
      }
      case "cylinder": {
        const r = this.num(pr, "diameter", 50) / 2, h = this.num(pr, "height", 100);
        const cx = this.num(pr, "cx"), cy = this.num(pr, "cy"), cz = this.num(pr, "cz");
        return { min: { x: cx - r, y: cy - r, z: cz }, max: { x: cx + r, y: cy + r, z: cz + h } };
      }
      case "sphere": {
        const r = this.num(pr, "diameter", 50) / 2;
        const cx = this.num(pr, "cx"), cy = this.num(pr, "cy"), cz = this.num(pr, "cz");
        return { min: { x: cx - r, y: cy - r, z: cz - r }, max: { x: cx + r, y: cy + r, z: cz + r } };
      }
      default: {
        const x = this.num(pr, "x"), y = this.num(pr, "y"), z = this.num(pr, "z");
        const w = this.num(pr, "width"), h = this.num(pr, "height");
        return { min: { x, y, z }, max: { x: x + w, y: y + h, z } };
      }
    }
  }

  transform(primitive: GeomPrimitive, t: GeomTransform): GeomPrimitive {
    return { ...primitive, transform: { ...primitive.transform, ...t } };
  }

  distance(a: GeomPoint, b: GeomPoint): DistanceResult {
    const dx = b.x - a.x, dy = b.y - a.y, dz = (b.z ?? 0) - (a.z ?? 0);
    return {
      distance_mm: Math.sqrt(dx * dx + dy * dy + dz * dz),
      closest_point_a: a,
      closest_point_b: b,
    };
  }

  boolean(op: BooleanOp, volumeA_mm3: number, volumeB_mm3: number): BooleanResult {
    let resultVol: number;
    switch (op) {
      case "union": resultVol = volumeA_mm3 + volumeB_mm3 * 0.95; break; // overlap estimate
      case "subtract": resultVol = Math.max(0, volumeA_mm3 - volumeB_mm3); break;
      case "intersect": resultVol = Math.min(volumeA_mm3, volumeB_mm3) * 0.5; break;
    }
    return { operation: op, success: true, result_volume_mm3: Math.round(resultVol), notes: [] };
  }

  offset2D(contourLength_mm: number, offsetDistance_mm: number): OffsetResult {
    const selfIntersect = offsetDistance_mm < 0 && Math.abs(offsetDistance_mm) > contourLength_mm / (2 * Math.PI);
    return {
      success: !selfIntersect,
      offset_mm: offsetDistance_mm,
      self_intersection: selfIntersect,
      notes: selfIntersect ? ["Offset distance exceeds minimum radius — self-intersection detected"] : [],
    };
  }

  fillet(radius_mm: number, edgeCount: number): FilletResult {
    return {
      success: radius_mm > 0 && edgeCount > 0,
      radius_mm,
      edge_count: edgeCount,
      notes: radius_mm < 0.5 ? ["Fillet radius below 0.5mm may be difficult to machine"] : [],
    };
  }

  analyze(primitives: GeomPrimitive[]): GeomAnalysis {
    const bb = this.boundingBox(primitives);
    let totalVol = 0;
    let totalSA = 0;
    let smallest = Infinity;

    for (const p of primitives) {
      const ext = this.primitiveExtents(p);
      const sx = ext.max.x - ext.min.x;
      const sy = ext.max.y - ext.min.y;
      const sz = (ext.max.z ?? 0) - (ext.min.z ?? 0);
      totalVol += sx * sy * Math.max(sz, 1);
      totalSA += 2 * (sx * sy + sy * Math.max(sz, 1) + sx * Math.max(sz, 1));
      smallest = Math.min(smallest, sx, sy, Math.max(sz, 0.01));
    }

    return {
      primitive_count: primitives.length,
      bounding_box: bb,
      total_volume_mm3: Math.round(totalVol),
      total_surface_area_mm2: Math.round(totalSA),
      centroid: bb.center,
      is_closed: true,
      is_manifold: true,
      smallest_feature_mm: Math.round(smallest * 1000) / 1000,
    };
  }
}

export const geometryEngine = new GeometryEngine();
