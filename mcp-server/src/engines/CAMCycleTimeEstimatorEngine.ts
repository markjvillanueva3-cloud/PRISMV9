/**
 * CAMCycleTimeEstimatorEngine — CAM-AI-TRAINING-MS0/U-CAMT-CYCLE-TIME
 *
 * Estimates cycle time per CamOperation from feed/spindle/MRR + removal
 * volume + air-time + tool-change overhead. Used by quoting and shop
 * scheduling.
 *
 * Inputs (per op):
 *   - removalVolumeMm3  (from CAMStockModelEngine)
 *   - cuttingFeedMmMin  (template feedrate)
 *   - depthOfCutMm      (template stepdown)
 *   - widthOfCutMm      (template stepover)
 *   - rapidFeedMmMin    (machine rapid traverse, default 30000)
 *   - airDistanceMm     (approach + retract path, default = 2× partHeight)
 *   - toolChangeSec     (default 5 s — VMC ATC typical)
 *
 * Output: cuttingMin / airMin / toolChangeMin / totalMin, plus an
 * effectiveMRR (mm^3/min) for diagnostic sanity-check vs the template
 * MRR.
 *
 * Pure logic. No tool-life model here — CAMTaylorToolLifeEngine handles
 * that separately when it lands.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";

export interface CycleTimeInputs {
  removalVolumeMm3: number;
  cuttingFeedMmMin: number;
  /** mm of axial depth per pass — stepdown. */
  depthOfCutMm: number;
  /** mm of radial step per pass — stepover. */
  widthOfCutMm: number;
  rapidFeedMmMin?: number;
  airDistanceMm?: number;
  toolChangeSec?: number;
}

export interface CycleTimeResult {
  cuttingMin: number;
  airMin: number;
  toolChangeMin: number;
  totalMin: number;
  /** mm^3/min — derived from inputs. */
  effectiveMRR: number;
}

export interface BatchInput {
  op: string;
  inputs: CycleTimeInputs;
}

export interface BatchResult {
  perOp: Record<string, CycleTimeResult>;
  totalMin: number;
}

const DEFAULT_RAPID_MM_MIN = 30000;       // typical VMC G0 rapid
const DEFAULT_AIR_DISTANCE_MM = 100;
const DEFAULT_TOOL_CHANGE_SEC = 5;

export class CAMCycleTimeEstimatorEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMCycleTimeEstimatorEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Estimates cycle time per CamOperation from MRR + feed + tool-change overhead.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "estimate",       description: "Cycle time for one op",   actions: ["cam_cycle_time_estimate"] },
      { name: "estimate_batch", description: "Cycle time for op-list",  actions: ["cam_cycle_time_batch"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMCycleTimeEstimatorEngine", note: "use typed methods" };
  }

  /**
   * Single-op cycle-time estimate.
   *   MRR = depthOfCut × widthOfCut × feed   (mm/min × mm × mm = mm^3/min)
   *   cuttingMin = removalVolume / MRR
   *   airMin = airDistance / rapid
   *   toolChangeMin = toolChangeSec / 60
   *   totalMin = cuttingMin + airMin + toolChangeMin
   */
  estimate(inputs: CycleTimeInputs): CycleTimeResult {
    const removal = Math.max(0, inputs.removalVolumeMm3);
    const feed = Math.max(1, inputs.cuttingFeedMmMin); // 1 mm/min floor — avoid div-by-zero
    const depth = Math.max(0.01, inputs.depthOfCutMm);
    const width = Math.max(0.01, inputs.widthOfCutMm);
    const rapid = Math.max(1, inputs.rapidFeedMmMin ?? DEFAULT_RAPID_MM_MIN);
    const air = Math.max(0, inputs.airDistanceMm ?? DEFAULT_AIR_DISTANCE_MM);
    const tcSec = Math.max(0, inputs.toolChangeSec ?? DEFAULT_TOOL_CHANGE_SEC);

    const effectiveMRR = depth * width * feed; // mm^3/min
    const cuttingMin = removal / effectiveMRR;
    const airMin = air / rapid;
    const toolChangeMin = tcSec / 60;
    const totalMin = cuttingMin + airMin + toolChangeMin;

    return {
      cuttingMin,
      airMin,
      toolChangeMin,
      totalMin,
      effectiveMRR,
    };
  }

  /** Batch estimate for an op-list — sums totals, returns per-op detail. */
  estimate_batch(ops: ReadonlyArray<BatchInput>): BatchResult {
    const perOp: Record<string, CycleTimeResult> = {};
    let totalMin = 0;
    for (const item of ops) {
      const r = this.estimate(item.inputs);
      perOp[item.op] = r;
      totalMin += r.totalMin;
    }
    return { perOp, totalMin };
  }
}

export const camCycleTimeEstimatorEngine = new CAMCycleTimeEstimatorEngine();
