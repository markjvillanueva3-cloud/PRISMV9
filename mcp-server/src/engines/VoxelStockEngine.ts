/**
 * PRISM MCP Server -- Voxel Stock Engine
 *
 * Voxel-based stock material simulation:
 * - Box/mesh initialization with adaptive resolution
 * - Material removal along tool paths (endmill, ball, bullnose, drill)
 * - Surface voxel extraction (6-neighbor adjacency)
 * - Point-in-stock query, statistics
 *
 * Ported from PRISM_VOXEL_STOCK_ENGINE.js (monolith R2.3.1).
 *
 * @module VoxelStockEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface VoxelGrid {
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  data: Uint8Array;
  resolution: number;
  origin: { x: number; y: number; z: number };
}

export interface StockBounds {
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
}

export interface ToolGeometry {
  type: "endmill" | "flat" | "ballnose" | "ball" | "bullnose" | "toroidal" | "chamfer" | "drill";
  diameter: number;
  length?: number;
  cuttingLength?: number;
  cornerRadius?: number;
  tipDiameter?: number;
  angle?: number;
  pointAngle?: number;
  fluteLength?: number;
}

export interface InitResult {
  success: boolean;
  voxelCount: number;
  resolution: number;
  dimensions: { sizeX: number; sizeY: number; sizeZ: number };
  volume: number;
}

export interface RemovalResult {
  voxelsRemoved: number;
  volumeRemoved: number;
  totalRemoved: number;
}

export interface PathRemovalResult {
  totalVoxelsRemoved: number;
  totalVolumeRemoved: number;
  remainingVolume: number;
}

export interface StockStatistics {
  resolution: number;
  totalVoxels: number;
  solidVoxels: number;
  removedVoxels: number;
  remainingVolume: number;
  removedVolume: number;
  removalPercentage: number;
}

export interface SurfacePoint {
  x: number; y: number; z: number;
}

// ============================================================================
// ENGINE
// ============================================================================

const MAX_VOXELS = 10_000_000;
const DEFAULT_RESOLUTION = 0.5;

class VoxelStockEngineImpl {

  /** Initialize a voxel grid from an axis-aligned bounding box. */
  initializeFromBox(
    minX: number, minY: number, minZ: number,
    maxX: number, maxY: number, maxZ: number,
    resolution?: number,
  ): { grid: VoxelGrid; bounds: StockBounds; result: InitResult } {
    let res = resolution ?? DEFAULT_RESOLUTION;

    const sizeX = Math.ceil((maxX - minX) / res);
    const sizeY = Math.ceil((maxY - minY) / res);
    const sizeZ = Math.ceil((maxZ - minZ) / res);
    const totalVoxels = sizeX * sizeY * sizeZ;

    if (totalVoxels > MAX_VOXELS) {
      const scale = Math.cbrt(totalVoxels / MAX_VOXELS);
      return this.initializeFromBox(minX, minY, minZ, maxX, maxY, maxZ, res * scale);
    }

    const grid: VoxelGrid = {
      sizeX, sizeY, sizeZ,
      data: new Uint8Array(totalVoxels).fill(1),
      resolution: res,
      origin: { x: minX, y: minY, z: minZ },
    };

    const bounds: StockBounds = { minX, minY, minZ, maxX, maxY, maxZ };
    const volume = totalVoxels * Math.pow(res, 3);

    return {
      grid,
      bounds,
      result: { success: true, voxelCount: totalVoxels, resolution: res, dimensions: { sizeX, sizeY, sizeZ }, volume },
    };
  }

  /** Get the bounding envelope for a tool geometry. */
  getToolEnvelope(tool: ToolGeometry): { radius: number; minZ: number; maxZ: number } {
    const r = tool.diameter / 2;
    const len = tool.cuttingLength ?? tool.length ?? 50;

    switch (tool.type) {
      case "endmill":
      case "flat":
        return { radius: r, minZ: 0, maxZ: len };
      case "ballnose":
      case "ball":
        return { radius: r, minZ: -r, maxZ: len - r };
      case "bullnose":
      case "toroidal": {
        const cr = tool.cornerRadius ?? 0;
        return { radius: r, minZ: -cr, maxZ: len - cr };
      }
      case "chamfer": {
        const tipR = (tool.tipDiameter ?? 0) / 2;
        const a = (tool.angle ?? 90) * Math.PI / 360;
        return { radius: tipR + (tool.length ?? 50) * Math.tan(a), minZ: 0, maxZ: tool.length ?? 50 };
      }
      case "drill": {
        const pa = (tool.pointAngle ?? 118) * Math.PI / 360;
        return { radius: r, minZ: -r / Math.tan(pa), maxZ: tool.fluteLength ?? len };
      }
      default:
        return { radius: r, minZ: 0, maxZ: len };
    }
  }

  /** Test if a point (relative to tool center) is inside the tool cutting envelope. */
  isInsideTool(dx: number, dy: number, dz: number, tool: ToolGeometry): boolean {
    const r2 = dx * dx + dy * dy;
    const toolR = tool.diameter / 2;
    const toolR2 = toolR * toolR;
    const len = tool.cuttingLength ?? tool.length ?? 50;

    switch (tool.type) {
      case "endmill":
      case "flat":
        return r2 <= toolR2 && dz >= 0 && dz <= len;

      case "ballnose":
      case "ball":
        if (dz < 0) {
          return Math.sqrt(r2 + dz * dz) <= toolR;
        }
        return dz <= len - toolR && r2 <= toolR2;

      case "bullnose":
      case "toroidal": {
        const cr = tool.cornerRadius ?? 0;
        if (dz < 0) return false;
        if (dz < cr) {
          const torusR = toolR - cr;
          const distFromRing = Math.sqrt(Math.pow(Math.sqrt(r2) - torusR, 2) + Math.pow(dz - cr, 2));
          return distFromRing <= cr;
        }
        return dz <= len && r2 <= toolR2;
      }

      default:
        return r2 <= toolR2 && dz >= 0 && dz <= len;
    }
  }

  /** Remove material at a single tool position. Returns count of removed voxels. */
  removeMaterial(grid: VoxelGrid, toolPos: { x: number; y: number; z: number }, tool: ToolGeometry): RemovalResult {
    const { x, y, z } = toolPos;
    const res = grid.resolution;
    const envelope = this.getToolEnvelope(tool);
    let removedCount = 0;

    const minVX = Math.max(0, Math.floor((x - envelope.radius - grid.origin.x) / res));
    const maxVX = Math.min(grid.sizeX - 1, Math.ceil((x + envelope.radius - grid.origin.x) / res));
    const minVY = Math.max(0, Math.floor((y - envelope.radius - grid.origin.y) / res));
    const maxVY = Math.min(grid.sizeY - 1, Math.ceil((y + envelope.radius - grid.origin.y) / res));
    const minVZ = Math.max(0, Math.floor((z + envelope.minZ - grid.origin.z) / res));
    const maxVZ = Math.min(grid.sizeZ - 1, Math.ceil((z + envelope.maxZ - grid.origin.z) / res));

    for (let vz = minVZ; vz <= maxVZ; vz++) {
      for (let vy = minVY; vy <= maxVY; vy++) {
        for (let vx = minVX; vx <= maxVX; vx++) {
          const idx = vx + vy * grid.sizeX + vz * grid.sizeX * grid.sizeY;
          if (grid.data[idx] === 1) {
            const cx = grid.origin.x + (vx + 0.5) * res;
            const cy = grid.origin.y + (vy + 0.5) * res;
            const cz = grid.origin.z + (vz + 0.5) * res;

            if (this.isInsideTool(cx - x, cy - y, cz - z, tool)) {
              grid.data[idx] = 0;
              removedCount++;
            }
          }
        }
      }
    }

    const volumeRemoved = removedCount * Math.pow(res, 3);
    return { voxelsRemoved: removedCount, volumeRemoved, totalRemoved: volumeRemoved };
  }

  /** Remove material along a path of tool positions. */
  removeAlongPath(
    grid: VoxelGrid,
    path: Array<{ x: number; y: number; z: number }>,
    tool: ToolGeometry,
    stepSize?: number,
  ): PathRemovalResult {
    const step = stepSize ?? grid.resolution;
    let totalRemoved = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i];
      const p2 = path[i + 1];
      const distance = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2 + (p2.z - p1.z) ** 2);
      const steps = Math.max(1, Math.ceil(distance / step));

      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const pos = {
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t,
          z: p1.z + (p2.z - p1.z) * t,
        };
        totalRemoved += this.removeMaterial(grid, pos, tool).voxelsRemoved;
      }
    }

    const res3 = Math.pow(grid.resolution, 3);
    const totalVoxels = grid.data.length;
    let solidCount = 0;
    for (let i = 0; i < totalVoxels; i++) { if (grid.data[i] === 1) solidCount++; }

    return {
      totalVoxelsRemoved: totalRemoved,
      totalVolumeRemoved: totalRemoved * res3,
      remainingVolume: solidCount * res3,
    };
  }

  /** Check if a world-space point is still solid stock. */
  isPointInStock(grid: VoxelGrid, x: number, y: number, z: number): boolean {
    const vx = Math.floor((x - grid.origin.x) / grid.resolution);
    const vy = Math.floor((y - grid.origin.y) / grid.resolution);
    const vz = Math.floor((z - grid.origin.z) / grid.resolution);

    if (vx < 0 || vx >= grid.sizeX || vy < 0 || vy >= grid.sizeY || vz < 0 || vz >= grid.sizeZ) {
      return false;
    }
    return grid.data[vx + vy * grid.sizeX + vz * grid.sizeX * grid.sizeY] === 1;
  }

  /** Get voxel grid statistics. */
  getStatistics(grid: VoxelGrid): StockStatistics {
    let solidCount = 0;
    for (let i = 0; i < grid.data.length; i++) {
      if (grid.data[i] === 1) solidCount++;
    }
    const res3 = Math.pow(grid.resolution, 3);
    const removedVoxels = grid.data.length - solidCount;

    return {
      resolution: grid.resolution,
      totalVoxels: grid.data.length,
      solidVoxels: solidCount,
      removedVoxels,
      remainingVolume: solidCount * res3,
      removedVolume: removedVoxels * res3,
      removalPercentage: grid.data.length > 0 ? (removedVoxels / grid.data.length) * 100 : 0,
    };
  }

  /** Extract surface voxels (voxels with at least one empty neighbor). */
  getSurfaceVoxels(grid: VoxelGrid): SurfacePoint[] {
    const surface: SurfacePoint[] = [];
    const neighbors = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];

    for (let vz = 0; vz < grid.sizeZ; vz++) {
      for (let vy = 0; vy < grid.sizeY; vy++) {
        for (let vx = 0; vx < grid.sizeX; vx++) {
          const idx = vx + vy * grid.sizeX + vz * grid.sizeX * grid.sizeY;
          if (grid.data[idx] !== 1) continue;

          let isSurface = false;
          for (const [dx, dy, dz] of neighbors) {
            const nx = vx + dx, ny = vy + dy, nz = vz + dz;
            if (nx < 0 || nx >= grid.sizeX || ny < 0 || ny >= grid.sizeY || nz < 0 || nz >= grid.sizeZ) {
              isSurface = true;
              break;
            }
            if (grid.data[nx + ny * grid.sizeX + nz * grid.sizeX * grid.sizeY] === 0) {
              isSurface = true;
              break;
            }
          }

          if (isSurface) {
            surface.push({
              x: grid.origin.x + (vx + 0.5) * grid.resolution,
              y: grid.origin.y + (vy + 0.5) * grid.resolution,
              z: grid.origin.z + (vz + 0.5) * grid.resolution,
            });
          }
        }
      }
    }
    return surface;
  }
}

export const voxelStockEngine = new VoxelStockEngineImpl();
