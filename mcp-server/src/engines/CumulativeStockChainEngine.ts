/**
 * CumulativeStockChainEngine — CK-MS1/U02
 * Tracks in-process workpiece (IPW) between ALL operations so each
 * operation knows the actual remaining stock shape. Uses AABB-based
 * material removal tracking (feeds into VoxelStockIntegrationEngine
 * for detailed simulation when needed).
 */

export interface StockState {
  /** Remaining stock bounding regions (AABB list) */
  regions: StockRegion[];
  /** Total volume remaining (mm³) */
  volume_mm3: number;
  /** Percentage of original stock removed */
  removed_pct: number;
  /** Operations applied so far */
  operations_applied: number;
}

export interface StockRegion {
  min_x: number; max_x: number;
  min_y: number; max_y: number;
  min_z: number; max_z: number;
  volume_mm3: number;
}

export interface StockOperation {
  operation_id: string;
  type: string;
  tool_diameter_mm: number;
  tool_corner_radius_mm?: number;
  cutting_region: {
    min_x: number; max_x: number;
    min_y: number; max_y: number;
    min_z: number; max_z: number;
  };
  depth_mm: number;
  engagement_ae_mm: number;
  engagement_ap_mm: number;
}

export interface StockChainResult {
  states: Array<{
    after_operation: string;
    stock_state: StockState;
  }>;
  final_state: StockState;
  total_material_removed_mm3: number;
  total_material_removed_pct: number;
  air_cut_operations: string[];
  residual_stock_warnings: Array<{
    region: StockRegion;
    feature_id?: string;
    message: string;
  }>;
}

export class CumulativeStockChainEngine {
  /**
   * Chain stock state through a sequence of operations.
   * Each operation subtracts its cutting volume from the current stock.
   */
  chain(
    initial_stock: { length_mm: number; width_mm: number; height_mm: number },
    operations: StockOperation[],
  ): StockChainResult {
    const initialVolume = initial_stock.length_mm * initial_stock.width_mm * initial_stock.height_mm;

    // Start with full stock as single region
    let currentRegions: StockRegion[] = [{
      min_x: 0, max_x: initial_stock.length_mm,
      min_y: 0, max_y: initial_stock.width_mm,
      min_z: -initial_stock.height_mm, max_z: 0,
      volume_mm3: initialVolume,
    }];
    let currentVolume = initialVolume;

    const states: StockChainResult["states"] = [];
    const airCutOps: string[] = [];
    const residualWarnings: StockChainResult["residual_stock_warnings"] = [];

    for (const op of operations) {
      const cr = op.cutting_region;

      // Calculate material actually removed (intersection of cutting region with stock)
      let removedVolume = 0;
      const newRegions: StockRegion[] = [];

      for (const region of currentRegions) {
        // Check intersection
        const ix_min = Math.max(region.min_x, cr.min_x);
        const ix_max = Math.min(region.max_x, cr.max_x);
        const iy_min = Math.max(region.min_y, cr.min_y);
        const iy_max = Math.min(region.max_y, cr.max_y);
        const iz_min = Math.max(region.min_z, cr.min_z);
        const iz_max = Math.min(region.max_z, cr.max_z);

        if (ix_min >= ix_max || iy_min >= iy_max || iz_min >= iz_max) {
          // No intersection — region unchanged
          newRegions.push(region);
          continue;
        }

        // Volume removed from this region
        const cutVol = (ix_max - ix_min) * (iy_max - iy_min) * (iz_max - iz_min);
        removedVolume += cutVol;

        // Decompose remaining region into up to 6 sub-regions (AABB subtraction)
        const subs = this._subtractAABB(region, {
          min_x: ix_min, max_x: ix_max,
          min_y: iy_min, max_y: iy_max,
          min_z: iz_min, max_z: iz_max,
        });
        newRegions.push(...subs);
      }

      // Merge tiny regions to prevent fragmentation
      currentRegions = this._mergeSmallRegions(newRegions, initial_stock.length_mm * 0.01);
      currentVolume -= removedVolume;

      if (removedVolume < 0.001) {
        airCutOps.push(op.operation_id);
      }

      states.push({
        after_operation: op.operation_id,
        stock_state: {
          regions: [...currentRegions],
          volume_mm3: Math.max(0, Math.round(currentVolume * 100) / 100),
          removed_pct: Math.round(((initialVolume - currentVolume) / initialVolume) * 10000) / 100,
          operations_applied: states.length + 1,
        },
      });
    }

    // Check for residual stock in intended cutting regions
    for (const op of operations) {
      const cr = op.cutting_region;
      for (const region of currentRegions) {
        const ix_min = Math.max(region.min_x, cr.min_x);
        const ix_max = Math.min(region.max_x, cr.max_x);
        const iy_min = Math.max(region.min_y, cr.min_y);
        const iy_max = Math.min(region.max_y, cr.max_y);
        const iz_min = Math.max(region.min_z, cr.min_z);
        const iz_max = Math.min(region.max_z, cr.max_z);

        if (ix_max - ix_min > 0.5 && iy_max - iy_min > 0.5 && iz_max - iz_min > 0.5) {
          const resVol = (ix_max - ix_min) * (iy_max - iy_min) * (iz_max - iz_min);
          if (resVol > 1.0) {
            residualWarnings.push({
              region: {
                min_x: ix_min, max_x: ix_max,
                min_y: iy_min, max_y: iy_max,
                min_z: iz_min, max_z: iz_max,
                volume_mm3: resVol,
              },
              message: `${resVol.toFixed(1)}mm³ residual stock near operation ${op.operation_id}`,
            });
          }
        }
      }
    }

    return {
      states,
      final_state: {
        regions: currentRegions,
        volume_mm3: Math.max(0, Math.round(currentVolume * 100) / 100),
        removed_pct: Math.round(((initialVolume - currentVolume) / initialVolume) * 10000) / 100,
        operations_applied: operations.length,
      },
      total_material_removed_mm3: Math.round((initialVolume - currentVolume) * 100) / 100,
      total_material_removed_pct: Math.round(((initialVolume - currentVolume) / initialVolume) * 10000) / 100,
      air_cut_operations: airCutOps,
      residual_stock_warnings: residualWarnings,
    };
  }

  /**
   * AABB subtraction: subtract inner box from outer, return remaining sub-regions.
   * Decomposes into up to 6 non-overlapping AABBs.
   */
  private _subtractAABB(
    outer: StockRegion,
    inner: { min_x: number; max_x: number; min_y: number; max_y: number; min_z: number; max_z: number },
  ): StockRegion[] {
    const subs: StockRegion[] = [];

    // Left slab (X < inner.min_x)
    if (inner.min_x > outer.min_x) {
      const vol = (inner.min_x - outer.min_x) * (outer.max_y - outer.min_y) * (outer.max_z - outer.min_z);
      if (vol > 0.001) subs.push({ min_x: outer.min_x, max_x: inner.min_x, min_y: outer.min_y, max_y: outer.max_y, min_z: outer.min_z, max_z: outer.max_z, volume_mm3: vol });
    }
    // Right slab (X > inner.max_x)
    if (inner.max_x < outer.max_x) {
      const vol = (outer.max_x - inner.max_x) * (outer.max_y - outer.min_y) * (outer.max_z - outer.min_z);
      if (vol > 0.001) subs.push({ min_x: inner.max_x, max_x: outer.max_x, min_y: outer.min_y, max_y: outer.max_y, min_z: outer.min_z, max_z: outer.max_z, volume_mm3: vol });
    }
    // Front slab (Y < inner.min_y, within inner X range)
    if (inner.min_y > outer.min_y) {
      const vol = (inner.max_x - inner.min_x) * (inner.min_y - outer.min_y) * (outer.max_z - outer.min_z);
      if (vol > 0.001) subs.push({ min_x: inner.min_x, max_x: inner.max_x, min_y: outer.min_y, max_y: inner.min_y, min_z: outer.min_z, max_z: outer.max_z, volume_mm3: vol });
    }
    // Back slab (Y > inner.max_y, within inner X range)
    if (inner.max_y < outer.max_y) {
      const vol = (inner.max_x - inner.min_x) * (outer.max_y - inner.max_y) * (outer.max_z - outer.min_z);
      if (vol > 0.001) subs.push({ min_x: inner.min_x, max_x: inner.max_x, min_y: inner.max_y, max_y: outer.max_y, min_z: outer.min_z, max_z: outer.max_z, volume_mm3: vol });
    }
    // Bottom slab (Z < inner.min_z, within inner X and Y range)
    if (inner.min_z > outer.min_z) {
      const vol = (inner.max_x - inner.min_x) * (inner.max_y - inner.min_y) * (inner.min_z - outer.min_z);
      if (vol > 0.001) subs.push({ min_x: inner.min_x, max_x: inner.max_x, min_y: inner.min_y, max_y: inner.max_y, min_z: outer.min_z, max_z: inner.min_z, volume_mm3: vol });
    }
    // Top slab (Z > inner.max_z, within inner X and Y range)
    if (inner.max_z < outer.max_z) {
      const vol = (inner.max_x - inner.min_x) * (inner.max_y - inner.min_y) * (outer.max_z - inner.max_z);
      if (vol > 0.001) subs.push({ min_x: inner.min_x, max_x: inner.max_x, min_y: inner.min_y, max_y: inner.max_y, min_z: inner.max_z, max_z: outer.max_z, volume_mm3: vol });
    }

    return subs;
  }

  /**
   * Merge regions smaller than threshold into adjacent regions.
   */
  private _mergeSmallRegions(regions: StockRegion[], minDim: number): StockRegion[] {
    return regions.filter((r) => {
      const dx = r.max_x - r.min_x;
      const dy = r.max_y - r.min_y;
      const dz = r.max_z - r.min_z;
      return dx >= minDim && dy >= minDim && dz >= minDim;
    });
  }
}

export const cumulativeStockChainEngine = new CumulativeStockChainEngine();
