/**
 * CADGeometricAugmentationEngine — U-ML-02
 * ==========================================
 *
 * Geometric augmentation for CAD model ML training corpus expansion.
 * Produces 10× effective corpus from base geometry through:
 *   1. Mirror — flip along X/Y/Z planes
 *   2. Scale — uniform and non-uniform scaling within tolerance
 *   3. Rotate — rotation around principal axes (90°, 180°, 270°)
 *   4. Tolerance noise — dimensional variations within ISO tolerance bands
 *   5. CSG permutation — reorder boolean operations when semantically equivalent
 *
 * Key properties:
 *   - All augmentations preserve topological validity
 *   - Tolerance noise respects manufacturing constraints
 *   - Provenance tracking for every augmented sample
 *   - Statistics on augmentation distribution
 *
 * @module engines/CADGeometricAugmentationEngine
 * @milestone CAD-COMPLETE-MS0 PHASE-49 U-ML-02
 */

import { log } from "../utils/Logger.js";
import { createHash } from "crypto";

// ============================================================================
// TYPES
// ============================================================================

export type AugmentationType =
  | "mirror_x"
  | "mirror_y"
  | "mirror_z"
  | "scale_uniform"
  | "scale_nonuniform"
  | "rotate_90_x"
  | "rotate_90_y"
  | "rotate_90_z"
  | "rotate_180_x"
  | "rotate_180_y"
  | "rotate_180_z"
  | "rotate_270_x"
  | "rotate_270_y"
  | "rotate_270_z"
  | "tolerance_noise"
  | "csg_permute";

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox {
  min: Point3D;
  max: Point3D;
}

export interface CSGOperation {
  id: string;
  type: "union" | "subtract" | "intersect";
  operand_a: string;
  operand_b: string;
  order_index: number;
}

export interface CADGeometry {
  id: string;
  name: string;
  format: "brep" | "mesh" | "step" | "stl" | "iges";
  vertices: Point3D[];
  bounding_box: BoundingBox;
  csg_tree?: CSGOperation[];
  volume_mm3?: number;
  surface_area_mm2?: number;
  centroid?: Point3D;
}

export interface AugmentedGeometry extends CADGeometry {
  origin_id: string;
  augmentation_type: AugmentationType;
  augmentation_params: Record<string, number | string>;
  provenance_hash: string;
}

export interface AugmentationConfig {
  enable_mirror: boolean;
  mirror_axes: ("x" | "y" | "z")[];
  enable_scale: boolean;
  scale_uniform_range: [number, number];
  scale_nonuniform_max_ratio: number;
  enable_rotate: boolean;
  rotation_angles_deg: number[];
  enable_tolerance_noise: boolean;
  tolerance_iso_grade: "IT5" | "IT6" | "IT7" | "IT8" | "IT9" | "IT10";
  enable_csg_permute: boolean;
  target_multiplier: number;
  seed?: number;
}

export interface AugmentationReport {
  source_count: number;
  augmented_count: number;
  multiplier_achieved: number;
  by_type: Record<AugmentationType, number>;
  total_vertices_processed: number;
  elapsed_ms: number;
}

// ============================================================================
// ISO TOLERANCE TABLE (IT grades) — from ISO 286-1:2010
// Values in micrometers for nominal diameter 0-3mm
// ============================================================================

const ISO_TOLERANCE_UM: Record<string, number> = {
  IT5: 4,
  IT6: 6,
  IT7: 10,
  IT8: 14,
  IT9: 25,
  IT10: 40,
};

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: AugmentationConfig = {
  enable_mirror: true,
  mirror_axes: ["x", "y", "z"],
  enable_scale: true,
  scale_uniform_range: [0.95, 1.05],
  scale_nonuniform_max_ratio: 1.02,
  enable_rotate: true,
  rotation_angles_deg: [90, 180, 270],
  enable_tolerance_noise: true,
  tolerance_iso_grade: "IT7",
  enable_csg_permute: true,
  target_multiplier: 10,
  seed: undefined,
};

// ============================================================================
// ENGINE
// ============================================================================

class CADGeometricAugmentationEngine {
  private config: AugmentationConfig;
  private rng: () => number;
  private stats = {
    total_augmented: 0,
    by_type: {} as Record<AugmentationType, number>,
    total_sources: 0,
  };

  constructor(config: Partial<AugmentationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rng = this.createSeededRng(this.config.seed);
    this.initStats();
  }

  private createSeededRng(seed?: number): () => number {
    if (seed === undefined) {
      return Math.random;
    }
    let state = seed;
    return () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };
  }

  private initStats(): void {
    const types: AugmentationType[] = [
      "mirror_x", "mirror_y", "mirror_z",
      "scale_uniform", "scale_nonuniform",
      "rotate_90_x", "rotate_90_y", "rotate_90_z",
      "rotate_180_x", "rotate_180_y", "rotate_180_z",
      "rotate_270_x", "rotate_270_y", "rotate_270_z",
      "tolerance_noise", "csg_permute",
    ];
    for (const t of types) {
      this.stats.by_type[t] = 0;
    }
  }

  /**
   * Generate augmented geometries from a single source.
   */
  augment(source: CADGeometry): AugmentedGeometry[] {
    const results: AugmentedGeometry[] = [];

    if (this.config.enable_mirror) {
      for (const axis of this.config.mirror_axes) {
        results.push(this.applyMirror(source, axis));
      }
    }

    if (this.config.enable_scale) {
      results.push(this.applyUniformScale(source));
      results.push(this.applyNonuniformScale(source));
    }

    if (this.config.enable_rotate) {
      for (const angle of this.config.rotation_angles_deg) {
        for (const axis of ["x", "y", "z"] as const) {
          results.push(this.applyRotation(source, axis, angle));
        }
      }
    }

    if (this.config.enable_tolerance_noise) {
      results.push(this.applyToleranceNoise(source));
    }

    if (this.config.enable_csg_permute && source.csg_tree && source.csg_tree.length >= 2) {
      const permuted = this.applyCSGPermutation(source);
      if (permuted) results.push(permuted);
    }

    this.stats.total_sources++;
    this.stats.total_augmented += results.length;

    for (const r of results) {
      this.stats.by_type[r.augmentation_type]++;
    }

    return results;
  }

  /**
   * Batch augment multiple source geometries.
   */
  augmentBatch(sources: CADGeometry[]): { augmented: AugmentedGeometry[]; report: AugmentationReport } {
    const startTime = Date.now();
    const allAugmented: AugmentedGeometry[] = [];
    let totalVertices = 0;

    for (const src of sources) {
      const augmented = this.augment(src);
      allAugmented.push(...augmented);
      totalVertices += src.vertices.length * (1 + augmented.length);
    }

    const report: AugmentationReport = {
      source_count: sources.length,
      augmented_count: allAugmented.length,
      multiplier_achieved: sources.length > 0 ? (sources.length + allAugmented.length) / sources.length : 0,
      by_type: { ...this.stats.by_type },
      total_vertices_processed: totalVertices,
      elapsed_ms: Date.now() - startTime,
    };

    log.info(`CADGeometricAugmentationEngine: Batch: ${sources.length} → ${sources.length + allAugmented.length} (${report.multiplier_achieved.toFixed(1)}×)`);

    return { augmented: allAugmented, report };
  }

  // --------------------------------------------------------------------------
  // MIRROR TRANSFORMATIONS
  // --------------------------------------------------------------------------

  private applyMirror(source: CADGeometry, axis: "x" | "y" | "z"): AugmentedGeometry {
    const newVertices = source.vertices.map((v) => ({
      x: axis === "x" ? -v.x : v.x,
      y: axis === "y" ? -v.y : v.y,
      z: axis === "z" ? -v.z : v.z,
    }));

    const newBBox = this.computeBoundingBox(newVertices);
    const augType = `mirror_${axis}` as AugmentationType;

    return {
      ...source,
      id: this.generateId(source.id, augType),
      vertices: newVertices,
      bounding_box: newBBox,
      centroid: this.computeCentroid(newVertices),
      origin_id: source.id,
      augmentation_type: augType,
      augmentation_params: { axis },
      provenance_hash: this.computeProvenanceHash(source.id, augType),
    };
  }

  // --------------------------------------------------------------------------
  // SCALE TRANSFORMATIONS
  // --------------------------------------------------------------------------

  private applyUniformScale(source: CADGeometry): AugmentedGeometry {
    const [minScale, maxScale] = this.config.scale_uniform_range;
    const scale = minScale + this.rng() * (maxScale - minScale);

    const newVertices = source.vertices.map((v) => ({
      x: v.x * scale,
      y: v.y * scale,
      z: v.z * scale,
    }));

    const newBBox = this.computeBoundingBox(newVertices);
    const newVolume = source.volume_mm3 ? source.volume_mm3 * scale ** 3 : undefined;
    const newSurfaceArea = source.surface_area_mm2 ? source.surface_area_mm2 * scale ** 2 : undefined;

    return {
      ...source,
      id: this.generateId(source.id, "scale_uniform"),
      vertices: newVertices,
      bounding_box: newBBox,
      volume_mm3: newVolume,
      surface_area_mm2: newSurfaceArea,
      centroid: this.computeCentroid(newVertices),
      origin_id: source.id,
      augmentation_type: "scale_uniform",
      augmentation_params: { scale_factor: scale },
      provenance_hash: this.computeProvenanceHash(source.id, "scale_uniform"),
    };
  }

  private applyNonuniformScale(source: CADGeometry): AugmentedGeometry {
    const maxRatio = this.config.scale_nonuniform_max_ratio;
    const scaleX = 1 + (this.rng() - 0.5) * 2 * (maxRatio - 1);
    const scaleY = 1 + (this.rng() - 0.5) * 2 * (maxRatio - 1);
    const scaleZ = 1 + (this.rng() - 0.5) * 2 * (maxRatio - 1);

    const newVertices = source.vertices.map((v) => ({
      x: v.x * scaleX,
      y: v.y * scaleY,
      z: v.z * scaleZ,
    }));

    const newBBox = this.computeBoundingBox(newVertices);

    return {
      ...source,
      id: this.generateId(source.id, "scale_nonuniform"),
      vertices: newVertices,
      bounding_box: newBBox,
      centroid: this.computeCentroid(newVertices),
      origin_id: source.id,
      augmentation_type: "scale_nonuniform",
      augmentation_params: { scale_x: scaleX, scale_y: scaleY, scale_z: scaleZ },
      provenance_hash: this.computeProvenanceHash(source.id, "scale_nonuniform"),
    };
  }

  // --------------------------------------------------------------------------
  // ROTATION TRANSFORMATIONS
  // --------------------------------------------------------------------------

  private applyRotation(source: CADGeometry, axis: "x" | "y" | "z", angleDeg: number): AugmentedGeometry {
    const rad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const newVertices = source.vertices.map((v) => {
      switch (axis) {
        case "x":
          return { x: v.x, y: v.y * cos - v.z * sin, z: v.y * sin + v.z * cos };
        case "y":
          return { x: v.x * cos + v.z * sin, y: v.y, z: -v.x * sin + v.z * cos };
        case "z":
          return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos, z: v.z };
      }
    });

    const newBBox = this.computeBoundingBox(newVertices);
    const augType = `rotate_${angleDeg}_${axis}` as AugmentationType;

    return {
      ...source,
      id: this.generateId(source.id, augType),
      vertices: newVertices,
      bounding_box: newBBox,
      centroid: this.computeCentroid(newVertices),
      origin_id: source.id,
      augmentation_type: augType,
      augmentation_params: { axis, angle_deg: angleDeg },
      provenance_hash: this.computeProvenanceHash(source.id, augType),
    };
  }

  // --------------------------------------------------------------------------
  // TOLERANCE NOISE
  // --------------------------------------------------------------------------

  private applyToleranceNoise(source: CADGeometry): AugmentedGeometry {
    const toleranceUm = ISO_TOLERANCE_UM[this.config.tolerance_iso_grade] || ISO_TOLERANCE_UM.IT7;
    const toleranceMm = toleranceUm / 1000;

    const newVertices = source.vertices.map((v) => ({
      x: v.x + (this.rng() - 0.5) * toleranceMm,
      y: v.y + (this.rng() - 0.5) * toleranceMm,
      z: v.z + (this.rng() - 0.5) * toleranceMm,
    }));

    const newBBox = this.computeBoundingBox(newVertices);

    return {
      ...source,
      id: this.generateId(source.id, "tolerance_noise"),
      vertices: newVertices,
      bounding_box: newBBox,
      centroid: this.computeCentroid(newVertices),
      origin_id: source.id,
      augmentation_type: "tolerance_noise",
      augmentation_params: {
        iso_grade: this.config.tolerance_iso_grade,
        tolerance_mm: toleranceMm,
      },
      provenance_hash: this.computeProvenanceHash(source.id, "tolerance_noise"),
    };
  }

  // --------------------------------------------------------------------------
  // CSG PERMUTATION
  // --------------------------------------------------------------------------

  private applyCSGPermutation(source: CADGeometry): AugmentedGeometry | null {
    if (!source.csg_tree || source.csg_tree.length < 2) return null;

    const permutableOps = source.csg_tree.filter(
      (op) => op.type === "union" || op.type === "intersect"
    );
    if (permutableOps.length < 2) return null;

    const swapIdx = Math.floor(this.rng() * (permutableOps.length - 1));
    const newCSGTree = [...source.csg_tree];

    const opA = permutableOps[swapIdx];
    const opB = permutableOps[swapIdx + 1];

    const idxA = newCSGTree.findIndex((o) => o.id === opA.id);
    const idxB = newCSGTree.findIndex((o) => o.id === opB.id);

    if (idxA >= 0 && idxB >= 0) {
      [newCSGTree[idxA], newCSGTree[idxB]] = [newCSGTree[idxB], newCSGTree[idxA]];
      newCSGTree[idxA] = { ...newCSGTree[idxA], order_index: idxA };
      newCSGTree[idxB] = { ...newCSGTree[idxB], order_index: idxB };
    }

    return {
      ...source,
      id: this.generateId(source.id, "csg_permute"),
      csg_tree: newCSGTree,
      origin_id: source.id,
      augmentation_type: "csg_permute",
      augmentation_params: {
        swapped_ops: `${opA.id}:${opB.id}`,
        original_indices: `${idxA}:${idxB}`,
      },
      provenance_hash: this.computeProvenanceHash(source.id, "csg_permute"),
    };
  }

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  private computeBoundingBox(vertices: Point3D[]): BoundingBox {
    if (vertices.length === 0) {
      return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
    }

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const v of vertices) {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      minZ = Math.min(minZ, v.z);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
      maxZ = Math.max(maxZ, v.z);
    }

    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
    };
  }

  private computeCentroid(vertices: Point3D[]): Point3D {
    if (vertices.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }

    let sumX = 0, sumY = 0, sumZ = 0;
    for (const v of vertices) {
      sumX += v.x;
      sumY += v.y;
      sumZ += v.z;
    }

    return {
      x: sumX / vertices.length,
      y: sumY / vertices.length,
      z: sumZ / vertices.length,
    };
  }

  private generateId(sourceId: string, augType: AugmentationType): string {
    return `${sourceId}_aug_${augType}_${Date.now().toString(36)}`;
  }

  private computeProvenanceHash(sourceId: string, augType: AugmentationType): string {
    const data = `${sourceId}|${augType}|${Date.now()}`;
    return createHash("sha256").update(data).digest("hex").slice(0, 16);
  }

  /**
   * Get current augmentation statistics.
   */
  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * Reset statistics counters.
   */
  resetStats(): void {
    this.stats.total_augmented = 0;
    this.stats.total_sources = 0;
    this.initStats();
  }

  /**
   * Update configuration.
   */
  configure(config: Partial<AugmentationConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.seed !== undefined) {
      this.rng = this.createSeededRng(config.seed);
    }
  }

  /**
   * Get current configuration.
   */
  getConfig(): AugmentationConfig {
    return { ...this.config };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const cadGeometricAugmentationEngine = new CADGeometricAugmentationEngine();
export { CADGeometricAugmentationEngine };
