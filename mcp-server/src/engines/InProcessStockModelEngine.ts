/**
 * InProcessStockModelEngine — MIO-MS0/U-MIO18
 *
 * Tracks in-process stock geometry for collision avoidance and engagement
 * calculation. Uses voxel-based representation for efficient material removal
 * simulation and remaining stock tracking.
 *
 * Key capabilities:
 * 1. Voxel-based stock removal simulation
 * 2. Update collision bounds after each operation
 * 3. Track remaining stock geometry
 * 4. Output collision-safe envelope for rapid moves
 * 5. Estimate remaining material volume
 *
 * The voxel model uses a sparse octree-like structure for efficiency,
 * only storing cells that contain material.
 *
 * @module engines/InProcessStockModelEngine
 * @milestone MIO-MS0
 */

import { log } from "../utils/Logger.js";

export interface StockBounds {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface VoxelConfig {
  resolution_mm: number;
  bounds: StockBounds;
}

export interface ToolpathPoint {
  x: number;
  y: number;
  z: number;
}

export interface ToolGeometry {
  type: "flat_endmill" | "ball_endmill" | "bull_endmill" | "drill" | "face_mill";
  diameter_mm: number;
  corner_radius_mm?: number;
  length_mm: number;
  flute_length_mm?: number;
}

export interface Operation {
  id: string;
  tool: ToolGeometry;
  toolpath: ToolpathPoint[];
  axial_depth_mm: number;
  radial_depth_mm: number;
}

export interface StockUpdateResult {
  operation_id: string;
  volume_removed_mm3: number;
  remaining_volume_mm3: number;
  removal_percentage: number;
  updated_bounds: StockBounds;
  collision_envelope: StockBounds;
  ai_reasoning: string[];
}

export interface CollisionCheckResult {
  safe: boolean;
  clearance_mm: number;
  nearest_stock_point: ToolpathPoint | null;
  collision_points: ToolpathPoint[];
}

export interface StockState {
  initial_volume_mm3: number;
  current_volume_mm3: number;
  removal_percentage: number;
  bounds: StockBounds;
  collision_envelope: StockBounds;
  operations_applied: number;
}

class InProcessStockModelEngine {
  private voxels: Map<string, boolean> = new Map();
  private config: VoxelConfig | null = null;
  private initialVolume: number = 0;
  private operationsApplied: number = 0;

  /**
   * Initialize stock model from bounding box
   */
  initialize(bounds: StockBounds, resolution_mm: number = 1.0): void {
    this.config = { resolution_mm, bounds };
    this.voxels.clear();
    this.operationsApplied = 0;

    // Fill voxel grid with material
    const { min, max } = bounds;
    const res = resolution_mm;

    for (let x = min.x; x <= max.x; x += res) {
      for (let y = min.y; y <= max.y; y += res) {
        for (let z = min.z; z <= max.z; z += res) {
          const key = this.voxelKey(x, y, z);
          this.voxels.set(key, true);
        }
      }
    }

    this.initialVolume = this.voxels.size * Math.pow(res, 3);
  }

  /**
   * Apply a machining operation and update stock
   */
  applyOperation(operation: Operation): StockUpdateResult {
    if (!this.config) {
      throw new Error("Stock model not initialized");
    }

    const reasoning: string[] = [];
    const res = this.config.resolution_mm;
    const toolRadius = operation.tool.diameter_mm / 2;
    let removedCount = 0;

    reasoning.push(`[STOCK-MODEL] Applying operation ${operation.id}`);
    reasoning.push(`[STOCK-MODEL] Tool: Ø${operation.tool.diameter_mm}mm ${operation.tool.type}`);

    // Simulate tool path and remove voxels
    for (let i = 0; i < operation.toolpath.length - 1; i++) {
      const p1 = operation.toolpath[i];
      const p2 = operation.toolpath[i + 1];

      // Interpolate along segment
      const dist = Math.sqrt(
        Math.pow(p2.x - p1.x, 2) +
        Math.pow(p2.y - p1.y, 2) +
        Math.pow(p2.z - p1.z, 2)
      );
      const steps = Math.max(1, Math.ceil(dist / (res * 0.5)));

      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const px = p1.x + (p2.x - p1.x) * t;
        const py = p1.y + (p2.y - p1.y) * t;
        const pz = p1.z + (p2.z - p1.z) * t;

        // Remove voxels within tool envelope
        removedCount += this.removeToolEnvelope(
          px, py, pz,
          operation.tool,
          operation.axial_depth_mm
        );
      }
    }

    const volumeRemoved = removedCount * Math.pow(res, 3);
    const remainingVolume = this.voxels.size * Math.pow(res, 3);
    const removalPct = ((this.initialVolume - remainingVolume) / this.initialVolume) * 100;

    // Calculate updated bounds
    const updatedBounds = this.calculateBounds();
    const collisionEnvelope = this.calculateCollisionEnvelope(5); // 5mm safety margin

    this.operationsApplied++;

    reasoning.push(`[STOCK-MODEL] Removed ${volumeRemoved.toFixed(1)}mm³`);
    reasoning.push(`[STOCK-MODEL] Remaining: ${remainingVolume.toFixed(1)}mm³ (${(100 - removalPct).toFixed(1)}%)`);

    return {
      operation_id: operation.id,
      volume_removed_mm3: volumeRemoved,
      remaining_volume_mm3: remainingVolume,
      removal_percentage: removalPct,
      updated_bounds: updatedBounds,
      collision_envelope: collisionEnvelope,
      ai_reasoning: reasoning,
    };
  }

  /**
   * Remove voxels within tool envelope at given position
   */
  private removeToolEnvelope(
    x: number,
    y: number,
    z: number,
    tool: ToolGeometry,
    axialDepth: number
  ): number {
    if (!this.config) return 0;

    const res = this.config.resolution_mm;
    const toolRadius = tool.diameter_mm / 2;
    let removed = 0;

    // Search area around tool position
    const searchRadius = toolRadius + res;
    const { bounds } = this.config;

    for (let vx = x - searchRadius; vx <= x + searchRadius; vx += res) {
      for (let vy = y - searchRadius; vy <= y + searchRadius; vy += res) {
        // Check if point is within tool radius (XY plane)
        const distXY = Math.sqrt(Math.pow(vx - x, 2) + Math.pow(vy - y, 2));
        if (distXY > toolRadius) continue;

        // Check Z range (tool cuts below its tip by axial depth)
        for (let vz = z - axialDepth; vz <= z; vz += res) {
          if (vz < bounds.min.z || vz > bounds.max.z) continue;

          const key = this.voxelKey(vx, vy, vz);
          if (this.voxels.has(key)) {
            this.voxels.delete(key);
            removed++;
          }
        }
      }
    }

    return removed;
  }

  /**
   * Generate voxel key for lookup
   */
  private voxelKey(x: number, y: number, z: number): string {
    if (!this.config) return "";
    const res = this.config.resolution_mm;
    const ix = Math.round(x / res);
    const iy = Math.round(y / res);
    const iz = Math.round(z / res);
    return `${ix},${iy},${iz}`;
  }

  /**
   * Calculate current stock bounds
   */
  private calculateBounds(): StockBounds {
    if (!this.config || this.voxels.size === 0) {
      return this.config?.bounds ?? { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
    }

    const res = this.config.resolution_mm;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const key of this.voxels.keys()) {
      const [ix, iy, iz] = key.split(",").map(Number);
      const x = ix * res, y = iy * res, z = iz * res;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }

    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX + res, y: maxY + res, z: maxZ + res },
    };
  }

  /**
   * Calculate collision-safe envelope with margin
   */
  private calculateCollisionEnvelope(margin_mm: number): StockBounds {
    const bounds = this.calculateBounds();
    return {
      min: {
        x: bounds.min.x - margin_mm,
        y: bounds.min.y - margin_mm,
        z: bounds.min.z - margin_mm,
      },
      max: {
        x: bounds.max.x + margin_mm,
        y: bounds.max.y + margin_mm,
        z: bounds.max.z + margin_mm,
      },
    };
  }

  /**
   * Check if a point is safe (outside stock + margin)
   */
  checkCollision(
    point: ToolpathPoint,
    tool_diameter_mm: number,
    safety_margin_mm: number = 2
  ): CollisionCheckResult {
    if (!this.config) {
      return { safe: true, clearance_mm: Infinity, nearest_stock_point: null, collision_points: [] };
    }

    const res = this.config.resolution_mm;
    const toolRadius = tool_diameter_mm / 2;
    const checkRadius = toolRadius + safety_margin_mm + res;
    const collisionPoints: ToolpathPoint[] = [];
    let minClearance = Infinity;
    let nearestPoint: ToolpathPoint | null = null;

    // Check nearby voxels
    for (let dx = -checkRadius; dx <= checkRadius; dx += res) {
      for (let dy = -checkRadius; dy <= checkRadius; dy += res) {
        for (let dz = -checkRadius; dz <= checkRadius; dz += res) {
          const vx = point.x + dx;
          const vy = point.y + dy;
          const vz = point.z + dz;
          const key = this.voxelKey(vx, vy, vz);

          if (this.voxels.has(key)) {
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const clearance = dist - toolRadius;

            if (clearance < minClearance) {
              minClearance = clearance;
              nearestPoint = { x: vx, y: vy, z: vz };
            }

            if (clearance < safety_margin_mm) {
              collisionPoints.push({ x: vx, y: vy, z: vz });
            }
          }
        }
      }
    }

    return {
      safe: collisionPoints.length === 0,
      clearance_mm: minClearance === Infinity ? Infinity : minClearance,
      nearest_stock_point: nearestPoint,
      collision_points: collisionPoints,
    };
  }

  /**
   * Get current stock state
   */
  getState(): StockState {
    const currentVolume = this.config
      ? this.voxels.size * Math.pow(this.config.resolution_mm, 3)
      : 0;

    return {
      initial_volume_mm3: this.initialVolume,
      current_volume_mm3: currentVolume,
      removal_percentage: this.initialVolume > 0
        ? ((this.initialVolume - currentVolume) / this.initialVolume) * 100
        : 0,
      bounds: this.calculateBounds(),
      collision_envelope: this.calculateCollisionEnvelope(5),
      operations_applied: this.operationsApplied,
    };
  }

  /**
   * Quick check if material exists at a point
   */
  hasMaterial(point: ToolpathPoint): boolean {
    const key = this.voxelKey(point.x, point.y, point.z);
    return this.voxels.has(key);
  }

  /**
   * Get remaining stock height at XY position (for 2.5D operations)
   */
  getStockHeight(x: number, y: number): number {
    if (!this.config) return 0;

    const res = this.config.resolution_mm;
    let maxZ = -Infinity;

    for (let z = this.config.bounds.max.z; z >= this.config.bounds.min.z; z -= res) {
      const key = this.voxelKey(x, y, z);
      if (this.voxels.has(key)) {
        maxZ = z + res;
        break;
      }
    }

    return maxZ === -Infinity ? 0 : maxZ;
  }

  /**
   * Generate height map for remaining stock
   */
  generateHeightMap(resolution_mm?: number): { x: number; y: number; height: number }[] {
    if (!this.config) return [];

    const res = resolution_mm ?? this.config.resolution_mm * 2;
    const { min, max } = this.config.bounds;
    const heightMap: { x: number; y: number; height: number }[] = [];

    for (let x = min.x; x <= max.x; x += res) {
      for (let y = min.y; y <= max.y; y += res) {
        const height = this.getStockHeight(x, y);
        if (height > 0) {
          heightMap.push({ x, y, height });
        }
      }
    }

    return heightMap;
  }

  /**
   * Reset stock model
   */
  reset(): void {
    this.voxels.clear();
    this.config = null;
    this.initialVolume = 0;
    this.operationsApplied = 0;
  }
}

export const inProcessStockModelEngine = new InProcessStockModelEngine();
