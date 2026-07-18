/**
 * CAMOmegaScoreEngine — CAM-AI-TRAINING-MS0/U-CAMT-OMEGA
 *
 * Composes safety (S(x)) + tolerance compliance into a single Ω score —
 * the PRISM "ready to release" readiness number. shop_floor tier requires
 * Ω ≥ 0.95.
 *
 * Ω = 0.6 * S(x) + 0.4 * T_compliance
 *   where T_compliance ∈ [0,1] is 1.0 when all ops fit within print tolerance,
 *   linearly decaying to 0 as cumulative uncertainty exceeds 2× the print tol.
 *
 * Pure logic — no I/O. Composes upstream engine results passed in by caller.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";

export interface OmegaInputs {
  /** S(x) from CAMSafetyValidatorEngine.validateTemplate. */
  sx: number;
  /** Cumulative tolerance result from CAMToleranceStackPropagatorEngine.propagate. */
  cumulativeMm: number;
  /** Print tolerance the part was designed to. */
  printToleranceMm: number;
}

export interface OmegaResult {
  omega: number;
  sx: number;
  toleranceCompliance: number;
  /** Pass requires Ω ≥ 0.95 (shop_floor). */
  ok: boolean;
  /** Breakdown for audit. */
  breakdown: { sxComponent: number; toleranceComponent: number };
}

const SX_WEIGHT = 0.6;
const TOL_WEIGHT = 0.4;
const SHOP_FLOOR_OMEGA = 0.95;

export class CAMOmegaScoreEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMOmegaScoreEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Composes safety + tolerance compliance into a single Ω readiness score.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "score",      description: "Compute Ω from S(x) + cumulative tolerance", actions: ["cam_omega_score"] },
      { name: "threshold",  description: "Shop-floor pass threshold (constant)",       actions: ["cam_omega_threshold"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMOmegaScoreEngine", note: "use typed methods" };
  }

  /** Compute Ω readiness score. */
  score(inputs: OmegaInputs): OmegaResult {
    const sx = Math.max(0, Math.min(1, inputs.sx));
    let toleranceCompliance = 0;
    if (inputs.printToleranceMm > 0 && Number.isFinite(inputs.printToleranceMm)) {
      const ratio = inputs.cumulativeMm / inputs.printToleranceMm;
      if (ratio <= 1) toleranceCompliance = 1;
      else if (ratio >= 2) toleranceCompliance = 0;
      else toleranceCompliance = 2 - ratio;            // linear decay from 1→0 between 1× and 2×
    }
    const sxComponent = SX_WEIGHT * sx;
    const toleranceComponent = TOL_WEIGHT * toleranceCompliance;
    const omega = sxComponent + toleranceComponent;
    return {
      omega,
      sx,
      toleranceCompliance,
      ok: omega >= SHOP_FLOOR_OMEGA,
      breakdown: { sxComponent, toleranceComponent },
    };
  }

  /** Return the shop-floor pass threshold for Ω. */
  threshold(): number {
    return SHOP_FLOOR_OMEGA;
  }
}

export const camOmegaScoreEngine = new CAMOmegaScoreEngine();
