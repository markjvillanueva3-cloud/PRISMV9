/**
 * PipelineConsistencyHookEngine — post-pipeline consistency verification.
 *
 * After any pipeline runs, automatically verify the result against canonical
 * physics (Kienzle force, Taylor tool life, cantilever deflection, Brammertz Ra).
 * Warns if predictions diverge >10% from canonical.
 *
 * QS-MS6 P3: Created 2026-03-15
 *
 * @module engines/PipelineConsistencyHookEngine
 */

import { log } from "../utils/Logger.js";
import {
  resolveMaterial,
  kienzleForce,
  taylorLife,
  toolDeflection,
  predictedRa,
  cuttingPower,
  rpmFromVc,
  CANONICAL_TOOL_MODULUS,
} from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ConsistencyCheckInput {
  /** Which pipeline produced the result */
  pipeline_name: string;
  /** Pipeline output values to check */
  result: {
    cutting_force_N?: number;
    power_kW?: number;
    tool_life_min?: number;
    surface_finish_Ra_um?: number;
    deflection_um?: number;
    spindle_rpm?: number;
    feed_rate_mmmin?: number;
  };
  // Context to reproduce with canonical physics
  material?: string;
  tool_diameter_mm?: number;
  flutes?: number;
  ap_mm?: number;
  ae_mm?: number;
  /** Feed per tooth [mm] — derived from feed_rate if not given */
  fz_mm?: number;
  /** Tool stickout for deflection check [mm] */
  tool_stickout_mm?: number;
  /** Corner/nose radius for Ra check [mm] */
  corner_radius_mm?: number;
  /** Tool material for modulus lookup */
  tool_material?: string;
  /** Cutting speed [m/min] — derived from RPM+diameter if not given */
  cutting_speed_mpm?: number;
}

export interface MetricComparison {
  metric: string;
  pipeline_value: number;
  canonical_value: number;
  divergence_pct: number;
}

export interface ConsistencyCheckResult {
  pipeline_name: string;
  checked_at: string;
  canonical_comparison: MetricComparison[];
  max_divergence_pct: number;
  verdict: "consistent" | "minor_divergence" | "major_divergence";
  warnings: string[];
  auto_action: "none" | "logged" | "flagged";
}

interface HistoryEntry {
  input: ConsistencyCheckInput;
  result: ConsistencyCheckResult;
}

// ============================================================================
// ENGINE
// ============================================================================

const MAX_HISTORY = 100;

export class PipelineConsistencyHookEngine {
  private history: HistoryEntry[] = [];

  /**
   * Check pipeline result against canonical physics.
   */
  check(input: ConsistencyCheckInput): ConsistencyCheckResult {
    log.info(`[PipelineConsistencyHook] Checking ${input.pipeline_name}`);

    const mat = resolveMaterial(input.material || "steel");
    const d = input.tool_diameter_mm || 12;
    const z = input.flutes || 4;
    const ap = input.ap_mm || (d * 0.5);
    const ae = input.ae_mm || (d * 0.5);

    // Derive feed per tooth
    const rpm = input.result.spindle_rpm || (input.cutting_speed_mpm
      ? rpmFromVc(input.cutting_speed_mpm, d)
      : rpmFromVc(mat.vc_base_roughing, d));
    const fz = input.fz_mm || (input.result.feed_rate_mmmin
      ? input.result.feed_rate_mmmin / (rpm * z)
      : 0.1);

    // Derive cutting speed
    const Vc = input.cutting_speed_mpm || (Math.PI * d * rpm) / 1000;

    const comparisons: MetricComparison[] = [];
    const warnings: string[] = [];

    // 1. Cutting force check
    if (input.result.cutting_force_N !== undefined) {
      const canonical_Fc = kienzleForce(mat.kc1_1, mat.mc, ap, fz);
      const div = pctDivergence(input.result.cutting_force_N, canonical_Fc);
      comparisons.push({
        metric: "cutting_force_N",
        pipeline_value: input.result.cutting_force_N,
        canonical_value: round2(canonical_Fc),
        divergence_pct: round2(div),
      });
      if (Math.abs(div) > 10) {
        warnings.push(`Cutting force diverges ${div > 0 ? '+' : ''}${round2(div)}% from Kienzle canonical (kc1.1=${mat.kc1_1}, mc=${mat.mc})`);
      }
    }

    // 2. Power check
    if (input.result.power_kW !== undefined) {
      const canonical_Fc = kienzleForce(mat.kc1_1, mat.mc, ap, fz);
      const canonical_P = cuttingPower(canonical_Fc, Vc);
      const div = pctDivergence(input.result.power_kW, canonical_P);
      comparisons.push({
        metric: "power_kW",
        pipeline_value: input.result.power_kW,
        canonical_value: round2(canonical_P),
        divergence_pct: round2(div),
      });
      if (Math.abs(div) > 10) {
        warnings.push(`Power diverges ${div > 0 ? '+' : ''}${round2(div)}% from canonical P=Fc×Vc/60000`);
      }
    }

    // 3. Tool life check
    if (input.result.tool_life_min !== undefined && Vc > 0) {
      const canonical_T = taylorLife(mat.taylor_C, mat.taylor_n, Vc);
      const div = pctDivergence(input.result.tool_life_min, canonical_T);
      comparisons.push({
        metric: "tool_life_min",
        pipeline_value: input.result.tool_life_min,
        canonical_value: round2(canonical_T),
        divergence_pct: round2(div),
      });
      if (Math.abs(div) > 10) {
        warnings.push(`Tool life diverges ${div > 0 ? '+' : ''}${round2(div)}% from Taylor canonical (C=${mat.taylor_C}, n=${mat.taylor_n})`);
      }
    }

    // 4. Surface finish check
    if (input.result.surface_finish_Ra_um !== undefined) {
      const re = input.corner_radius_mm || 0.8;
      const canonical_Ra = predictedRa(fz, re);
      const div = pctDivergence(input.result.surface_finish_Ra_um, canonical_Ra);
      comparisons.push({
        metric: "surface_finish_Ra_um",
        pipeline_value: input.result.surface_finish_Ra_um,
        canonical_value: round2(canonical_Ra),
        divergence_pct: round2(div),
      });
      if (Math.abs(div) > 10) {
        warnings.push(`Surface finish diverges ${div > 0 ? '+' : ''}${round2(div)}% from Brammertz Ra=fz²/(32×re)`);
      }
    }

    // 5. Deflection check
    if (input.result.deflection_um !== undefined) {
      const L = input.tool_stickout_mm || (d * 3);
      const E = CANONICAL_TOOL_MODULUS[(input.tool_material || "carbide") as keyof typeof CANONICAL_TOOL_MODULUS] || 600000;
      const canonical_Fc = kienzleForce(mat.kc1_1, mat.mc, ap, fz);
      const canonical_defl_mm = toolDeflection(canonical_Fc, L, d, E);
      const canonical_defl_um = canonical_defl_mm * 1000;
      const div = pctDivergence(input.result.deflection_um, canonical_defl_um);
      comparisons.push({
        metric: "deflection_um",
        pipeline_value: input.result.deflection_um,
        canonical_value: round2(canonical_defl_um),
        divergence_pct: round2(div),
      });
      if (Math.abs(div) > 10) {
        warnings.push(`Deflection diverges ${div > 0 ? '+' : ''}${round2(div)}% from canonical δ=FL³/3EI`);
      }
    }

    // 6. Spindle RPM check (if cutting speed context available)
    if (input.result.spindle_rpm !== undefined && input.cutting_speed_mpm) {
      const canonical_rpm = rpmFromVc(input.cutting_speed_mpm, d);
      const div = pctDivergence(input.result.spindle_rpm, canonical_rpm);
      comparisons.push({
        metric: "spindle_rpm",
        pipeline_value: input.result.spindle_rpm,
        canonical_value: canonical_rpm,
        divergence_pct: round2(div),
      });
      if (Math.abs(div) > 10) {
        warnings.push(`Spindle RPM diverges ${div > 0 ? '+' : ''}${round2(div)}% from N=1000×Vc/(π×D)`);
      }
    }

    const maxDiv = comparisons.length > 0
      ? Math.max(...comparisons.map(c => Math.abs(c.divergence_pct)))
      : 0;

    const verdict: ConsistencyCheckResult["verdict"] =
      maxDiv <= 5 ? "consistent" :
      maxDiv <= 10 ? "minor_divergence" :
      "major_divergence";

    const auto_action: ConsistencyCheckResult["auto_action"] =
      verdict === "major_divergence" ? "flagged" :
      verdict === "minor_divergence" ? "logged" :
      "none";

    const result: ConsistencyCheckResult = {
      pipeline_name: input.pipeline_name,
      checked_at: new Date().toISOString(),
      canonical_comparison: comparisons,
      max_divergence_pct: round2(maxDiv),
      verdict,
      warnings,
      auto_action,
    };

    // Store in history (ring buffer)
    this.history.push({ input, result });
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }

    if (warnings.length > 0) {
      log.warn(`[PipelineConsistencyHook] ${input.pipeline_name}: ${warnings.length} divergence warning(s), max ${round2(maxDiv)}%`);
    }

    return result;
  }

  /**
   * Get history of recent consistency checks.
   */
  getHistory(): HistoryEntry[] {
    return [...this.history];
  }

  /**
   * Get summary statistics of consistency checks.
   */
  getSummary(): {
    total_checks: number;
    consistent: number;
    minor_divergences: number;
    major_divergences: number;
    avg_max_divergence_pct: number;
    pipelines_checked: string[];
  } {
    const total = this.history.length;
    const consistent = this.history.filter(h => h.result.verdict === "consistent").length;
    const minor = this.history.filter(h => h.result.verdict === "minor_divergence").length;
    const major = this.history.filter(h => h.result.verdict === "major_divergence").length;
    const avgDiv = total > 0
      ? this.history.reduce((s, h) => s + h.result.max_divergence_pct, 0) / total
      : 0;
    const pipelines = [...new Set(this.history.map(h => h.result.pipeline_name))];

    return {
      total_checks: total,
      consistent,
      minor_divergences: minor,
      major_divergences: major,
      avg_max_divergence_pct: round2(avgDiv),
      pipelines_checked: pipelines,
    };
  }

  /**
   * Clear history.
   */
  clearHistory(): { cleared: number } {
    const cleared = this.history.length;
    this.history = [];
    return { cleared };
  }

  /**
   * Calculate method for dispatcher compatibility.
   */
  calculate(action: string, params: Record<string, unknown>): unknown {
    switch (action) {
      case "consistency_check":
        return this.check(params as unknown as ConsistencyCheckInput);
      case "consistency_history":
        return this.getHistory();
      case "consistency_summary":
        return this.getSummary();
      case "consistency_clear":
        return this.clearHistory();
      default:
        return { error: `Unknown action: ${action}` };
    }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/** Percentage divergence: (pipeline - canonical) / canonical × 100 */
function pctDivergence(pipeline: number, canonical: number): number {
  if (canonical === 0) return pipeline === 0 ? 0 : 100;
  return ((pipeline - canonical) / Math.abs(canonical)) * 100;
}

/** Round to 2 decimal places */
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const pipelineConsistencyHookEngine = new PipelineConsistencyHookEngine();
