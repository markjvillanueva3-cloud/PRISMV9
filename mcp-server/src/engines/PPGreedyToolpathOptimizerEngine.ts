/**
 * PPGreedyToolpathOptimizerEngine — PP-DL-MS5
 *
 * Iteratively optimizes cutting parameters using greedy hill climbing.
 * Instead of PPO reinforcement learning, uses physics-guided search:
 *
 *   1. Start with recommended baseline parameters
 *   2. Perturb one parameter at a time (speed, feed, DOC, WOC)
 *   3. Evaluate objective function (MRR × tool_life × quality × safety)
 *   4. Keep best direction, repeat
 *   5. Stop when no improvement found or max iterations reached
 *
 * Objective function balances competing goals:
 *   - MRR (material removal rate) — higher is better for productivity
 *   - Tool life factor — longer life, less cost
 *   - Surface quality — closer to target Ra is better
 *   - Safety margin — further from limits is safer
 *
 * @module PPGreedyToolpathOptimizerEngine
 */

import { ppPhysicsConstraintValidatorEngine, type CuttingCondition } from "./PPPhysicsConstraintValidatorEngine.js";

// ── Types ─────────────────────────────────────────────────────────────

export interface OptimizationInput {
  tool_diameter_mm: number;
  tool_flute_count: number;
  material_kc1_1: number;
  material_mc: number;
  spindle_power_kW: number;
  machine_max_rpm: number;
  tool_overhang_mm?: number;
  target_ra_um?: number;
  objective: "max_mrr" | "max_tool_life" | "balanced" | "best_finish";
  initial_speed_rpm?: number;
  initial_feed_mm_min?: number;
  initial_doc_mm?: number;
  initial_woc_mm?: number;
}

export interface OptimizationStep {
  iteration: number;
  parameter_changed: string;
  direction: "increase" | "decrease";
  new_value: number;
  objective_value: number;
  mrr: number;
  safe: boolean;
}

export interface OptimizationResult {
  optimal: {
    spindle_speed_rpm: number;
    feed_rate_mm_min: number;
    depth_of_cut_mm: number;
    width_of_cut_mm: number;
  };
  mrr_cm3_min: number;
  mrr_improvement_pct: number;
  objective_score: number;
  physics_safe: boolean;
  iterations: number;
  convergence_reason: string;
  steps: OptimizationStep[];
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPGreedyToolpathOptimizerEngine {
  /**
   * Optimize cutting parameters using greedy hill climbing.
   */
  optimize(input: OptimizationInput, maxIter = 30): OptimizationResult {
    const dia = input.tool_diameter_mm;
    const flutes = input.tool_flute_count;

    // Initial parameters (defaults if not specified)
    let rpm = input.initial_speed_rpm ?? this.defaultRPM(dia, input.material_kc1_1);
    let feed = input.initial_feed_mm_min ?? rpm * flutes * 0.08; // fz = 0.08
    let doc = input.initial_doc_mm ?? dia * 0.5;
    let woc = input.initial_woc_mm ?? dia * 0.3;

    // Record initial MRR
    const initialMRR = this.computeMRR(doc, woc, feed);
    let bestObj = this.evaluateObjective(rpm, feed, doc, woc, input);
    const steps: OptimizationStep[] = [];

    let convergenceReason = "max_iterations";
    let noImproveCount = 0;

    for (let iter = 0; iter < maxIter; iter++) {
      let improved = false;

      // Try each parameter in each direction
      const params: Array<{
        name: string;
        current: number;
        step: number;
        min: number;
        max: number;
        setter: (v: number) => void;
        getter: () => number;
      }> = [
        { name: "spindle_speed", current: rpm, step: rpm * 0.05, min: 500, max: input.machine_max_rpm, setter: v => rpm = v, getter: () => rpm },
        { name: "feed_rate", current: feed, step: feed * 0.05, min: 50, max: rpm * flutes * 0.3, setter: v => feed = v, getter: () => feed },
        { name: "depth_of_cut", current: doc, step: doc * 0.1, min: 0.1, max: dia * 2, setter: v => doc = v, getter: () => doc },
        { name: "width_of_cut", current: woc, step: woc * 0.1, min: dia * 0.05, max: dia, setter: v => woc = v, getter: () => woc },
      ];

      for (const p of params) {
        for (const dir of ["increase", "decrease"] as const) {
          const delta = dir === "increase" ? p.step : -p.step;
          const newVal = Math.max(p.min, Math.min(p.max, p.current + delta));
          if (Math.abs(newVal - p.current) < 0.01) continue;

          const old = p.getter();
          p.setter(newVal);
          const obj = this.evaluateObjective(rpm, feed, doc, woc, input);
          const safe = this.checkSafe(rpm, feed, doc, woc, input);
          const mrr = this.computeMRR(doc, woc, feed);

          steps.push({
            iteration: iter,
            parameter_changed: p.name,
            direction: dir,
            new_value: round2(newVal),
            objective_value: round4(obj),
            mrr: round2(mrr),
            safe,
          });

          if (obj > bestObj && safe) {
            bestObj = obj;
            improved = true;
            p.current = newVal; // keep change
          } else {
            p.setter(old); // revert
          }
        }
      }

      if (!improved) {
        noImproveCount++;
        if (noImproveCount >= 3) {
          convergenceReason = "converged";
          break;
        }
      } else {
        noImproveCount = 0;
      }
    }

    const finalMRR = this.computeMRR(doc, woc, feed);
    const mrrImprovement = initialMRR > 0 ? ((finalMRR - initialMRR) / initialMRR) * 100 : 0;

    return {
      optimal: {
        spindle_speed_rpm: Math.round(rpm),
        feed_rate_mm_min: Math.round(feed),
        depth_of_cut_mm: round2(doc),
        width_of_cut_mm: round2(woc),
      },
      mrr_cm3_min: round2(finalMRR / 1000), // mm³→cm³
      mrr_improvement_pct: round2(mrrImprovement),
      objective_score: round4(bestObj),
      physics_safe: this.checkSafe(rpm, feed, doc, woc, input),
      iterations: steps.length,
      convergence_reason: convergenceReason,
      steps: steps.slice(-20), // keep last 20 steps
    };
  }

  /** Quick optimize with just 10 iterations. */
  quickOptimize(input: OptimizationInput): OptimizationResult {
    return this.optimize(input, 10);
  }

  // ── Private ──────────────────────────────────────────────────────────

  private defaultRPM(dia: number, kc: number): number {
    // Higher kc = lower speed
    const baseSFM = kc < 1000 ? 300 : kc < 2000 ? 180 : kc < 2500 ? 100 : 60;
    return Math.round((baseSFM * 1000) / (Math.PI * dia)); // SFM → RPM
  }

  private computeMRR(doc: number, woc: number, feed: number): number {
    return doc * woc * feed; // mm³/min
  }

  private evaluateObjective(
    rpm: number, feed: number, doc: number, woc: number,
    input: OptimizationInput,
  ): number {
    const mrr = this.computeMRR(doc, woc, feed);
    const mrrNorm = Math.min(1, mrr / 50000); // normalize to 50000 mm³/min

    // Tool life factor (inverse of force — lower force = longer life)
    const fz = feed / (rpm * input.tool_flute_count);
    const Fc = input.material_kc1_1 * doc * Math.pow(Math.max(fz, 0.001), 1 - input.material_mc);
    const toolLifeFactor = Math.max(0, 1 - Fc / 15000); // 0 at 15kN, 1 at 0N

    // Surface quality (lower chip load = better finish)
    const qualityFactor = Math.max(0, 1 - fz / 0.3); // 0 at fz=0.3, 1 at fz=0

    // Safety margin
    const Vc = Math.PI * input.tool_diameter_mm * rpm / 1000;
    const power = (Fc * Vc) / (60000 * 0.85);
    const safetyFactor = Math.max(0, 1 - power / (input.spindle_power_kW * 1.2));

    // Weighted objective based on strategy
    switch (input.objective) {
      case "max_mrr":
        return mrrNorm * 0.6 + toolLifeFactor * 0.15 + qualityFactor * 0.05 + safetyFactor * 0.2;
      case "max_tool_life":
        return mrrNorm * 0.15 + toolLifeFactor * 0.5 + qualityFactor * 0.15 + safetyFactor * 0.2;
      case "best_finish":
        return mrrNorm * 0.05 + toolLifeFactor * 0.15 + qualityFactor * 0.6 + safetyFactor * 0.2;
      case "balanced":
      default:
        return mrrNorm * 0.3 + toolLifeFactor * 0.25 + qualityFactor * 0.2 + safetyFactor * 0.25;
    }
  }

  private checkSafe(
    rpm: number, feed: number, doc: number, woc: number,
    input: OptimizationInput,
  ): boolean {
    return ppPhysicsConstraintValidatorEngine.isSafe({
      spindle_speed_rpm: rpm,
      feed_rate_mm_min: feed,
      depth_of_cut_mm: doc,
      width_of_cut_mm: woc,
      tool_diameter_mm: input.tool_diameter_mm,
      tool_flute_count: input.tool_flute_count,
      tool_overhang_mm: input.tool_overhang_mm,
      material_kc1_1: input.material_kc1_1,
      material_mc: input.material_mc,
      spindle_power_kW: input.spindle_power_kW,
      machine_max_rpm: input.machine_max_rpm,
    });
  }
}

function round2(x: number): number { return Math.round(x * 100) / 100; }
function round4(x: number): number { return Math.round(x * 10000) / 10000; }

export const ppGreedyToolpathOptimizerEngine = new PPGreedyToolpathOptimizerEngine();
