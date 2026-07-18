/**
 * MillScientificPipelineEngine — composite mill-physics analysis + parameter
 * optimization + Monte-Carlo uncertainty quantification.
 *
 * STUB-RESCUE (slot:bravo 2026-05-27, U-STUB-HUNT-06, mill-galaxy). Original
 * returned {ok:false, stub:true, input}. millDispatcher routes 3 actions
 * here (analyze/optimize/quantifyUncertainty). All physics defers to
 * MillingForceEngine (canonical Kienzle from src/physics/constants.ts —
 * NEVER inlined per bravo-soul rule).
 *
 * @version 2.0.0 — restored from stub
 */
import { millingForceEngine, type CalculateInput, type ToolGeometry } from "./MillingForceEngine.js";

const DEFAULT_RPM_SAMPLES = 5;
const DEFAULT_FZ_SAMPLES = 5;
const DEFAULT_MC_TRIALS = 200;
const DEFAULT_KC_UNCERTAINTY_PCT = 0.15;
const DEFAULT_FZ_UNCERTAINTY_PCT = 0.10;

export interface AnalyzeResult {
  force: ReturnType<typeof millingForceEngine.calculate>;
  power: ReturnType<typeof millingForceEngine.verifyPower>;
  chatter: ReturnType<typeof millingForceEngine.predictChatter>;
  mrr_cm3_per_min: number;
}

export interface OptimizeInput extends CalculateInput {
  machine: { max_power_kw: number };
  rpmRange: [number, number];
  fzRange: [number, number];
  rpmSamples?: number;
  fzSamples?: number;
  overhang_mm?: number;
}

export interface OptimizeResult {
  best: { rpm: number; fz: number; mrr_cm3_per_min: number; power_kw: number };
  evaluated: number;
  feasible: number;
  reason?: string;
}

export interface UncertaintyInput extends CalculateInput {
  trials?: number;
  kcUncertaintyPct?: number;
  fzUncertaintyPct?: number;
}

export interface UncertaintyResult {
  trials: number;
  force_n: { mean: number; sigma: number; min: number; max: number; p05: number; p95: number };
  power_kw: { mean: number; sigma: number; min: number; max: number; p05: number; p95: number };
}

function quantile(sorted: number[], q: number): number {
  const i = Math.max(0, Math.min(sorted.length - 1, Math.floor(q * sorted.length)));
  return sorted[i];
}

function stats(xs: number[]): { mean: number; sigma: number; min: number; max: number; p05: number; p95: number } {
  if (xs.length === 0) return { mean: 0, sigma: 0, min: 0, max: 0, p05: 0, p95: 0 };
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
  const variance = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length;
  const sorted = [...xs].sort((a, b) => a - b);
  return {
    mean,
    sigma: Math.sqrt(variance),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p05: quantile(sorted, 0.05),
    p95: quantile(sorted, 0.95),
  };
}

function mrrCm3PerMin(tool: ToolGeometry, params: { rpm?: number; doc_mm?: number; woc_mm?: number; feed_per_tooth?: number }): number {
  const rpm = params.rpm ?? 0;
  const fz = params.feed_per_tooth ?? 0;
  const ap = params.doc_mm ?? 0;
  const ae = params.woc_mm ?? tool.diameter_mm;
  const feed_mmpm = rpm * tool.flutes * fz;
  return (feed_mmpm * ap * ae) / 1000;     // mm³/min → cm³/min
}

export class MillScientificPipelineEngine {
  /** Composite analysis: force + power + chatter + MRR. */
  analyze(input: CalculateInput & { machine?: { max_power_kw: number }; overhang_mm?: number }): AnalyzeResult {
    if (!input?.tool) throw new Error("MillScientificPipelineEngine.analyze: tool required");
    if (!input?.parameters) throw new Error("MillScientificPipelineEngine.analyze: parameters required");
    const force = millingForceEngine.calculate(input);
    const power = millingForceEngine.verifyPower(input);
    const chatter = millingForceEngine.predictChatter({
      tool: input.tool,
      overhang_mm: input.overhang_mm,
    });
    return {
      force,
      power,
      chatter,
      mrr_cm3_per_min: mrrCm3PerMin(input.tool, input.parameters),
    };
  }

  /** Grid-search rpm × fz, maximize MRR subject to power.pass. */
  optimize(input: OptimizeInput): OptimizeResult {
    if (!input?.tool) throw new Error("MillScientificPipelineEngine.optimize: tool required");
    if (!input?.parameters) throw new Error("MillScientificPipelineEngine.optimize: parameters required");
    const rpmSamples = input.rpmSamples ?? DEFAULT_RPM_SAMPLES;
    const fzSamples = input.fzSamples ?? DEFAULT_FZ_SAMPLES;
    const [rpmLo, rpmHi] = input.rpmRange;
    const [fzLo, fzHi] = input.fzRange;
    if (!(rpmHi > rpmLo) || !(fzHi > fzLo)) {
      throw new Error("MillScientificPipelineEngine.optimize: range hi must exceed lo");
    }
    let best: OptimizeResult["best"] | null = null;
    let evaluated = 0;
    let feasible = 0;
    for (let i = 0; i < rpmSamples; i++) {
      const rpm = rpmLo + (rpmHi - rpmLo) * (i / Math.max(1, rpmSamples - 1));
      for (let j = 0; j < fzSamples; j++) {
        const fz = fzLo + (fzHi - fzLo) * (j / Math.max(1, fzSamples - 1));
        evaluated += 1;
        const candidate = {
          ...input,
          parameters: { ...input.parameters, rpm, feed_per_tooth: fz },
        };
        let p;
        try { p = millingForceEngine.verifyPower(candidate); }
        catch { continue; }
        if (!p.pass) continue;
        feasible += 1;
        const mrr = mrrCm3PerMin(input.tool, candidate.parameters);
        if (best === null || mrr > best.mrr_cm3_per_min) {
          best = { rpm, fz, mrr_cm3_per_min: mrr, power_kw: p.required_power_kw };
        }
      }
    }
    if (best === null) {
      return { best: { rpm: 0, fz: 0, mrr_cm3_per_min: 0, power_kw: 0 }, evaluated, feasible, reason: "no feasible point within power envelope" };
    }
    return { best, evaluated, feasible };
  }

  /** Monte-Carlo: perturb kc1.1 by ±kcUncertainty, fz by ±fzUncertainty. */
  quantifyUncertainty(input: UncertaintyInput): UncertaintyResult {
    if (!input?.tool) throw new Error("MillScientificPipelineEngine.quantifyUncertainty: tool required");
    if (!input?.parameters) throw new Error("MillScientificPipelineEngine.quantifyUncertainty: parameters required");
    const trials = input.trials ?? DEFAULT_MC_TRIALS;
    const kcUncert = input.kcUncertaintyPct ?? DEFAULT_KC_UNCERTAINTY_PCT;
    const fzUncert = input.fzUncertaintyPct ?? DEFAULT_FZ_UNCERTAINTY_PCT;
    const baseline = millingForceEngine.calculate(input);
    const forces: number[] = [];
    const powers: number[] = [];
    const baseFz = baseline.fz_mm;
    const baseKc = baseline.kc1_1_n_per_mm2;
    for (let i = 0; i < trials; i++) {
      const kcPerturbed = baseKc * (1 + (Math.random() * 2 - 1) * kcUncert);
      const fzPerturbed = Math.max(1e-6, baseFz * (1 + (Math.random() * 2 - 1) * fzUncert));
      const trial = {
        ...input,
        kc1_1: kcPerturbed,
        mc: baseline.mc,
        parameters: { ...input.parameters, feed_per_tooth: fzPerturbed },
      };
      let p;
      try { p = millingForceEngine.verifyPower(trial); }
      catch { continue; }
      forces.push(p.cutting_force_n);
      powers.push(p.required_power_kw);
    }
    return {
      trials: forces.length,
      force_n: stats(forces),
      power_kw: stats(powers),
    };
  }
}

export const millScientificPipelineEngine = new MillScientificPipelineEngine();
