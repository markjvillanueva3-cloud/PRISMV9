/**
 * CAMStockModelEngine — CAM-AI-TRAINING-MS0/U-CAMT-STOCK
 *
 * Computes the stock model for a part:
 *   - stock dimensions = part-bbox + per-side allowance
 *   - removal volume = stock - part envelope
 *   - per-op stock-to-leave (rough leaves more, finish leaves zero)
 *   - mass + weight (caller passes density g/cm^3 — no fabricated density tables)
 *
 * Pure geometry. No CAD tessellation here — caller passes part envelope
 * (axis-aligned bbox or hull volume estimate).
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import { camOperationTaxonomyEngine, type CamOperation } from "./CAMOperationTaxonomyEngine.js";

export type StockShapeKind = "rectangular_block" | "round_bar" | "tube" | "near_net_casting";

export interface PartEnvelope {
  /** Axis-aligned bbox of the finished part, in mm. */
  bbox: { x: number; y: number; z: number };
  /** Optional — caller passes a tighter hull volume in mm^3 (else falls back to bbox). */
  hullVolumeMm3?: number;
}

export interface StockAllowance {
  /** mm of extra material on each side of the part bbox. */
  perSideMm: number;
  /** Bottom face — separate, because it's where chuck/vise grip lives (often larger). */
  bottomMm?: number;
}

export interface StockModel {
  shape: StockShapeKind;
  /** Stock outer dimensions, mm. For round_bar: x = y = diameter, z = length. */
  bbox: { x: number; y: number; z: number };
  stockVolumeMm3: number;
  partVolumeMm3: number;
  removalVolumeMm3: number;
  /** Material density g/cm^3 — only populated when caller passes density into compute(). */
  densityGCm3?: number;
  /** Stock mass in grams (when density supplied). */
  stockMassG?: number;
  /** Part mass in grams (when density supplied). */
  partMassG?: number;
  /** Per-op stock-to-leave map: op → leave-on-walls / leave-on-floor (mm). */
  perOpLeave: Record<CamOperation, { wallMm: number; floorMm: number }>;
}

/** Default stock-to-leave by op-family strategy. Roughing leaves material; finishing strips to zero. */
const STRATEGY_TO_LEAVE: Record<string, { wallMm: number; floorMm: number }> = {
  // Roughing leaves >= 0.2 mm so finishing has stock to remove.
  rough_milling:     { wallMm: 0.30, floorMm: 0.20 },
  pre_finish:        { wallMm: 0.10, floorMm: 0.05 },
  finishing:         { wallMm: 0.00, floorMm: 0.00 },
  semi_finish:       { wallMm: 0.05, floorMm: 0.02 },
  // Drilling / probing leave nothing on walls (they cut on Z only).
  drilling:          { wallMm: 0.00, floorMm: 0.00 },
  probing:           { wallMm: 0.00, floorMm: 0.00 },
  // Turning roughing leaves 0.3-0.5 mm; finish 0.
  turning_rough:     { wallMm: 0.40, floorMm: 0.40 },
  turning_finish:    { wallMm: 0.00, floorMm: 0.00 },
  // EDM / waterjet / laser cut to size — no leave.
  edm:               { wallMm: 0.00, floorMm: 0.00 },
  laser:             { wallMm: 0.00, floorMm: 0.00 },
  waterjet:          { wallMm: 0.00, floorMm: 0.00 },
  // Additive adds, never leaves.
  additive:          { wallMm: 0.00, floorMm: 0.00 },
};

export class CAMStockModelEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMStockModelEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Computes stock dimensions, removal volume, mass, and per-op stock-to-leave.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "compute",           description: "Compute stock model from part envelope",     actions: ["cam_stock_compute"] },
      { name: "removal_volume",    description: "Compute volume to remove only",              actions: ["cam_stock_removal_volume"] },
      { name: "per_op_leave",      description: "Per-op stock-to-leave map",                  actions: ["cam_stock_per_op_leave"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMStockModelEngine", note: "use typed methods" };
  }

  /** Full stock model. */
  compute(
    part: PartEnvelope,
    shape: StockShapeKind,
    allowance: StockAllowance,
    opts?: { densityGCm3?: number; opList?: ReadonlyArray<CamOperation> },
  ): StockModel {
    const perSide = Math.max(0, allowance.perSideMm);
    const bottom = Math.max(0, allowance.bottomMm ?? perSide);
    let stockBbox: { x: number; y: number; z: number };
    let stockVolumeMm3: number;

    switch (shape) {
      case "rectangular_block": {
        stockBbox = {
          x: part.bbox.x + 2 * perSide,
          y: part.bbox.y + 2 * perSide,
          z: part.bbox.z + perSide + bottom,
        };
        stockVolumeMm3 = stockBbox.x * stockBbox.y * stockBbox.z;
        break;
      }
      case "round_bar": {
        const partDia = Math.max(part.bbox.x, part.bbox.y);
        const dia = partDia + 2 * perSide;
        const length = part.bbox.z + perSide + bottom;
        stockBbox = { x: dia, y: dia, z: length };
        stockVolumeMm3 = Math.PI * (dia / 2) ** 2 * length;
        break;
      }
      case "tube": {
        const partOuterDia = Math.max(part.bbox.x, part.bbox.y);
        const outerDia = partOuterDia + 2 * perSide;
        const length = part.bbox.z + perSide + bottom;
        stockBbox = { x: outerDia, y: outerDia, z: length };
        // Tube wall-thickness allowance: assume wall = part wall + perSide on each side.
        const innerDia = Math.max(0, partOuterDia - 4 * perSide);
        stockVolumeMm3 = Math.PI * ((outerDia / 2) ** 2 - (innerDia / 2) ** 2) * length;
        break;
      }
      case "near_net_casting": {
        // Castings — stock is the part hull + minimal allowance (per-side 1-3mm typical).
        stockBbox = {
          x: part.bbox.x + 2 * perSide,
          y: part.bbox.y + 2 * perSide,
          z: part.bbox.z + 2 * perSide,
        };
        // For castings, hull volume estimate (when supplied) is much closer to reality than the bbox.
        const hull = part.hullVolumeMm3 ?? part.bbox.x * part.bbox.y * part.bbox.z * 0.85;
        const allowanceShell = (stockBbox.x * stockBbox.y * stockBbox.z) - (part.bbox.x * part.bbox.y * part.bbox.z);
        stockVolumeMm3 = hull + allowanceShell;
        break;
      }
    }

    const partVolumeMm3 = part.hullVolumeMm3 ?? part.bbox.x * part.bbox.y * part.bbox.z;
    const removalVolumeMm3 = Math.max(0, stockVolumeMm3 - partVolumeMm3);

    const result: StockModel = {
      shape,
      bbox: stockBbox,
      stockVolumeMm3,
      partVolumeMm3,
      removalVolumeMm3,
      perOpLeave: {} as Record<CamOperation, { wallMm: number; floorMm: number }>,
    };

    if (opts?.densityGCm3 != null) {
      const density = opts.densityGCm3;
      result.densityGCm3 = density;
      result.stockMassG = (stockVolumeMm3 / 1000) * density;
      result.partMassG = (partVolumeMm3 / 1000) * density;
    }

    const ops = opts?.opList ?? [];
    for (const op of ops) {
      result.perOpLeave[op] = this.leaveFor(op);
    }

    return result;
  }

  /** Just the removal-volume number (cheap call for cost estimation). */
  removal_volume(part: PartEnvelope, shape: StockShapeKind, allowance: StockAllowance): number {
    return this.compute(part, shape, allowance).removalVolumeMm3;
  }

  /** Stock-to-leave for one op. */
  per_op_leave(op: CamOperation): { wallMm: number; floorMm: number } {
    return this.leaveFor(op);
  }

  private leaveFor(op: CamOperation): { wallMm: number; floorMm: number } {
    const spec = camOperationTaxonomyEngine.getSpec(op);
    if (!spec) return { wallMm: 0, floorMm: 0 };
    const family = spec.family;
    const strategy = spec.strategy;
    // Map family + strategy → key in STRATEGY_TO_LEAVE.
    if (family === "edm")      return STRATEGY_TO_LEAVE.edm;
    if (family === "laser")    return STRATEGY_TO_LEAVE.laser;
    if (family === "waterjet") return STRATEGY_TO_LEAVE.waterjet;
    if (family === "additive") return STRATEGY_TO_LEAVE.additive;
    if (family === "drilling") return STRATEGY_TO_LEAVE.drilling;
    if (family === "probing")  return STRATEGY_TO_LEAVE.probing;
    if (family === "turning" || family === "mill_turn") {
      return strategy === "finishing" ? STRATEGY_TO_LEAVE.turning_finish : STRATEGY_TO_LEAVE.turning_rough;
    }
    // Milling families → strategy-driven.
    if (strategy === "roughing")  return STRATEGY_TO_LEAVE.rough_milling;
    if (strategy === "finishing") return STRATEGY_TO_LEAVE.finishing;
    if (strategy === "pre_finish") return STRATEGY_TO_LEAVE.pre_finish;
    if (strategy === "semi_finish") return STRATEGY_TO_LEAVE.semi_finish;
    return { wallMm: 0, floorMm: 0 };
  }
}

export const camStockModelEngine = new CAMStockModelEngine();
