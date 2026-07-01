/**
 * VoxelStockIntegrationEngine — CAMK-MS2/U02
 *
 * Connects novel algorithm segments to VoxelStockEngine for volumetric
 * material removal simulation. Tracks:
 * - Remaining stock volume per step (IPW — In-Process Workpiece)
 * - Engagement angle at each point (actual vs predicted)
 * - Air cutting detection (tool moving through already-removed material)
 * - Residual stock identification (uncut material after toolpath)
 *
 * References: Altintas "Manufacturing Automation" Ch.9 (engaged cutter geometry)
 */

import type { SegmentPoint } from "./NovelToolpathEngine.js";
import { voxelStockEngine, type VoxelGrid, type ToolGeometry } from "./VoxelStockEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface StockSimulationInput {
  /** Toolpath segments from novel algorithm output */
  segments: SegmentPoint[];
  /** Stock bounding box */
  stock: {
    min_x: number; min_y: number; min_z: number;
    max_x: number; max_y: number; max_z: number;
  };
  /** Tool geometry */
  tool: {
    type: "endmill" | "ball" | "bullnose" | "flat";
    diameter_mm: number;
    cutting_length_mm?: number;
    corner_radius_mm?: number;
  };
  /** Voxel resolution in mm (default: auto-calculated) */
  resolution_mm?: number;
  /** Algorithm name for context */
  algorithm?: string;
}

export interface EngagementPoint {
  index: number;
  position: { x: number; y: number; z: number };
  /** Actual engagement angle from voxel analysis (degrees) */
  engagement_deg: number;
  /** Predicted engagement angle from ae/d ratio (degrees) */
  predicted_engagement_deg: number;
  /** Engagement error (actual - predicted) */
  engagement_error_deg: number;
  /** Volume removed at this step (mm³) */
  volume_removed_mm3: number;
  /** Cumulative volume removed (mm³) */
  cumulative_removed_mm3: number;
  /** Remaining stock volume (mm³) */
  remaining_volume_mm3: number;
  /** True if tool is cutting air (no material removed) */
  is_air_cut: boolean;
  /** Radial depth of cut (actual, from voxel) */
  actual_ae_mm: number;
  /** Axial depth of cut (actual) */
  actual_ap_mm: number;
}

export interface ResidualStock {
  /** Number of residual (uncut) voxels */
  voxel_count: number;
  /** Approximate residual volume (mm³) */
  volume_mm3: number;
  /** Regions where residual stock remains */
  regions: Array<{
    center: { x: number; y: number; z: number };
    extent_mm: number;
  }>;
}

export interface StockSimulationResult {
  /** Per-point engagement data */
  points: EngagementPoint[];
  /** Total volume removed (mm³) */
  total_removed_mm3: number;
  /** Initial stock volume (mm³) */
  initial_volume_mm3: number;
  /** Removal percentage */
  removal_pct: number;
  /** Air cutting analysis */
  air_cutting: {
    count: number;
    percentage: number;
    indices: number[];
  };
  /** Engagement accuracy */
  engagement_accuracy: {
    mean_error_deg: number;
    max_error_deg: number;
    rmse_deg: number;
  };
  /** Residual stock analysis */
  residual: ResidualStock;
  /** IPW snapshots at intervals */
  ipw_snapshots: Array<{
    step: number;
    remaining_volume_mm3: number;
    removal_pct: number;
  }>;
  /** Algorithm-specific validation */
  validation: string[];
  /** Warnings */
  warnings: string[];
}

// ============================================================================
// ENGAGEMENT COMPUTATION
// ============================================================================

/**
 * Compute engagement angle from ae/d ratio.
 * engagement = arccos(1 - ae/R) in degrees
 * For full slotting: ae = d → engagement = 180°
 */
function predictedEngagement(ae_mm: number, diameter_mm: number): number {
  const R = diameter_mm / 2;
  if (ae_mm <= 0) return 0;
  if (ae_mm >= diameter_mm) return 180;
  return Math.acos(1 - ae_mm / R) * (180 / Math.PI);
}

/**
 * Estimate actual engagement from voxel removal pattern.
 * Samples points around the tool circumference to find engaged arc.
 */
function actualEngagement(
  grid: VoxelGrid,
  pos: { x: number; y: number; z: number },
  toolR: number,
  ap: number,
  nSamples: number = 36
): { engagement_deg: number; actual_ae: number; actual_ap: number } {
  let engagedCount = 0;
  let maxRadialDepth = 0;

  for (let i = 0; i < nSamples; i++) {
    const angle = (2 * Math.PI * i) / nSamples;
    const px = pos.x + toolR * Math.cos(angle);
    const py = pos.y + toolR * Math.sin(angle);
    // Check at mid-depth
    const pz = pos.z - ap / 2;
    if (voxelStockEngine.isPointInStock(grid, px, py, pz)) {
      engagedCount++;
      // Estimate radial depth at this angle
      for (let dr = 0; dr <= toolR; dr += grid.resolution) {
        const rx = pos.x + (toolR - dr) * Math.cos(angle);
        const ry = pos.y + (toolR - dr) * Math.sin(angle);
        if (voxelStockEngine.isPointInStock(grid, rx, ry, pz)) {
          maxRadialDepth = Math.max(maxRadialDepth, dr);
          break;
        }
      }
    }
  }

  const engagement_deg = (engagedCount / nSamples) * 360;
  const actual_ae = maxRadialDepth;

  // Check actual axial depth
  let actual_ap = 0;
  for (let dz = 0; dz <= ap + grid.resolution; dz += grid.resolution) {
    if (voxelStockEngine.isPointInStock(grid, pos.x, pos.y, pos.z - dz)) {
      actual_ap = dz;
    }
  }

  return { engagement_deg, actual_ae, actual_ap: Math.min(actual_ap, ap) };
}

// ============================================================================
// RESIDUAL STOCK ANALYSIS
// ============================================================================

/**
 * Analyze remaining stock after toolpath execution.
 * Identifies clusters of uncut material.
 */
function analyzeResidualStock(grid: VoxelGrid): ResidualStock {
  const stats = voxelStockEngine.getStatistics(grid);
  const res = grid.resolution;
  const volume = stats.solidVoxels * Math.pow(res, 3);

  // Find residual clusters by sampling
  const regions: ResidualStock["regions"] = [];
  const step = Math.max(Math.floor(grid.sizeX / 10), 1);

  for (let ix = 0; ix < grid.sizeX; ix += step) {
    for (let iy = 0; iy < grid.sizeY; iy += step) {
      for (let iz = 0; iz < grid.sizeZ; iz += step) {
        const idx = ix + iy * grid.sizeX + iz * grid.sizeX * grid.sizeY;
        if (grid.data[idx] === 1) {
          const cx = grid.origin.x + (ix + 0.5) * res;
          const cy = grid.origin.y + (iy + 0.5) * res;
          const cz = grid.origin.z + (iz + 0.5) * res;

          // Check if this is near an existing region
          const nearby = regions.find(r =>
            Math.abs(r.center.x - cx) < step * res * 2 &&
            Math.abs(r.center.y - cy) < step * res * 2 &&
            Math.abs(r.center.z - cz) < step * res * 2
          );
          if (!nearby) {
            regions.push({ center: { x: cx, y: cy, z: cz }, extent_mm: step * res });
          }
        }
      }
    }
  }

  return {
    voxel_count: stats.solidVoxels,
    volume_mm3: Math.round(volume * 100) / 100,
    regions,
  };
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

class VoxelStockIntegrationEngine {
  /**
   * Run full voxel stock simulation along novel toolpath segments.
   */
  simulate(input: StockSimulationInput): StockSimulationResult {
    const { stock, tool, segments } = input;
    const warnings: string[] = [];
    const validation: string[] = [];

    // Map tool type
    const toolGeom: ToolGeometry = {
      type: tool.type === "ball" ? "ballnose"
        : tool.type === "bullnose" ? "toroidal"
        : tool.type === "endmill" ? "endmill"
        : "flat",
      diameter: tool.diameter_mm,
      cuttingLength: tool.cutting_length_mm ?? 50,
      cornerRadius: tool.corner_radius_mm,
    };

    // Auto-calculate resolution
    const stockSize = Math.max(
      stock.max_x - stock.min_x,
      stock.max_y - stock.min_y,
      stock.max_z - stock.min_z
    );
    const resolution = input.resolution_mm ?? Math.max(
      tool.diameter_mm / 10,
      stockSize / 200,
      0.1
    );

    // Initialize voxel grid
    const { grid, result: initResult } = voxelStockEngine.initializeFromBox(
      stock.min_x, stock.min_y, stock.min_z,
      stock.max_x, stock.max_y, stock.max_z,
      resolution
    );

    const initialVolume = initResult.volume;
    const toolR = tool.diameter_mm / 2;

    // Track results
    const points: EngagementPoint[] = [];
    let cumulativeRemoved = 0;
    const airCutIndices: number[] = [];
    const snapshotInterval = Math.max(Math.floor(segments.length / 10), 1);
    const ipwSnapshots: StockSimulationResult["ipw_snapshots"] = [];

    // Process each segment point
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const ae = seg.ae_mm ?? tool.diameter_mm * 0.4;
      const ap = seg.ap_mm ?? 2;

      // Measure engagement BEFORE removal
      const engagement = actualEngagement(grid, seg, toolR, ap);
      const predictedEng = predictedEngagement(ae, tool.diameter_mm);

      // Remove material at this position
      const removalResult = voxelStockEngine.removeMaterial(
        grid,
        { x: seg.x, y: seg.y, z: seg.z },
        toolGeom
      );

      const volumeRemoved = removalResult.volumeRemoved;
      cumulativeRemoved += volumeRemoved;
      const isAir = volumeRemoved < resolution * resolution * resolution * 0.1;

      if (isAir) airCutIndices.push(i);

      const remainingVolume = initialVolume - cumulativeRemoved;

      points.push({
        index: i,
        position: { x: seg.x, y: seg.y, z: seg.z },
        engagement_deg: Math.round(engagement.engagement_deg * 10) / 10,
        predicted_engagement_deg: Math.round(predictedEng * 10) / 10,
        engagement_error_deg: Math.round((engagement.engagement_deg - predictedEng) * 10) / 10,
        volume_removed_mm3: Math.round(volumeRemoved * 100) / 100,
        cumulative_removed_mm3: Math.round(cumulativeRemoved * 100) / 100,
        remaining_volume_mm3: Math.round(Math.max(remainingVolume, 0) * 100) / 100,
        is_air_cut: isAir,
        actual_ae_mm: Math.round(engagement.actual_ae * 100) / 100,
        actual_ap_mm: Math.round(engagement.actual_ap * 100) / 100,
      });

      // IPW snapshot
      if (i % snapshotInterval === 0 || i === segments.length - 1) {
        ipwSnapshots.push({
          step: i,
          remaining_volume_mm3: Math.round(Math.max(remainingVolume, 0) * 100) / 100,
          removal_pct: Math.round((cumulativeRemoved / initialVolume) * 10000) / 100,
        });
      }
    }

    // Engagement accuracy
    const errors = points.map(p => p.engagement_error_deg).filter(e => !isNaN(e));
    const meanError = errors.length > 0
      ? errors.reduce((a, b) => a + b, 0) / errors.length : 0;
    const maxError = errors.length > 0 ? Math.max(...errors.map(Math.abs)) : 0;
    const rmse = errors.length > 0
      ? Math.sqrt(errors.reduce((a, e) => a + e * e, 0) / errors.length) : 0;

    // Air cutting analysis
    const airPct = segments.length > 0
      ? (airCutIndices.length / segments.length) * 100 : 0;

    if (airPct > 20) {
      warnings.push(`${airPct.toFixed(0)}% air cutting — consider optimizing approach paths`);
    }

    // Residual stock
    const residual = analyzeResidualStock(grid);

    // Algorithm-specific validation
    const algo = input.algorithm?.toUpperCase();
    if (algo === "VCMR" || algo === "TGAR") {
      // VCMR/TGAR vary engagement — check that actual matches predicted
      if (rmse < 15) {
        validation.push(`${algo} engagement prediction validated: RMSE=${rmse.toFixed(1)}°`);
      } else {
        validation.push(`${algo} engagement prediction poor: RMSE=${rmse.toFixed(1)}° (>15° target)`);
      }
    }
    if (algo === "VCER") {
      // VCER: vortex evacuation — check high MRR with low air cutting
      if (airPct < 10) {
        validation.push(`VCER chip evacuation efficient: ${airPct.toFixed(0)}% air cutting`);
      }
    }
    if (algo === "MTHZD") {
      validation.push(`MTHZD multi-zone stock tracking: ${ipwSnapshots.length} IPW snapshots recorded`);
    }

    return {
      points,
      total_removed_mm3: Math.round(cumulativeRemoved * 100) / 100,
      initial_volume_mm3: Math.round(initialVolume * 100) / 100,
      removal_pct: Math.round((cumulativeRemoved / initialVolume) * 10000) / 100,
      air_cutting: {
        count: airCutIndices.length,
        percentage: Math.round(airPct * 10) / 10,
        indices: airCutIndices.slice(0, 50), // cap to prevent huge output
      },
      engagement_accuracy: {
        mean_error_deg: Math.round(meanError * 10) / 10,
        max_error_deg: Math.round(maxError * 10) / 10,
        rmse_deg: Math.round(rmse * 10) / 10,
      },
      residual,
      ipw_snapshots: ipwSnapshots,
      validation,
      warnings,
    };
  }

  /**
   * Compute predicted engagement angle from ae/d.
   */
  predictedEngagement(ae_mm: number, diameter_mm: number): number {
    return predictedEngagement(ae_mm, diameter_mm);
  }

  /**
   * Quick stock removal simulation — returns just volume statistics.
   */
  quickSimulate(input: StockSimulationInput): {
    initial_mm3: number;
    removed_mm3: number;
    remaining_mm3: number;
    removal_pct: number;
    air_cut_pct: number;
  } {
    const result = this.simulate(input);
    return {
      initial_mm3: result.initial_volume_mm3,
      removed_mm3: result.total_removed_mm3,
      remaining_mm3: result.initial_volume_mm3 - result.total_removed_mm3,
      removal_pct: result.removal_pct,
      air_cut_pct: result.air_cutting.percentage,
    };
  }
}

export const voxelStockIntegrationEngine = new VoxelStockIntegrationEngine();
