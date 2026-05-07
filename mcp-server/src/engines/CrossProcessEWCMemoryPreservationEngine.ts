/**
 * CrossProcessEWCMemoryPreservationEngine — XPROC-NEURAL Tier 3 (T3-04)
 *
 * Elastic Weight Consolidation++ (Schwarz et al. 2018 extension of
 * Kirkpatrick et al. 2017). Diagonal Fisher-information-weighted
 * regularization that protects weights critical to old tasks while learning
 * new ones. Used by T3-01 + T3-03 warm_restart path.
 *
 * References:
 *   Kirkpatrick, J. et al. (2017) "Overcoming catastrophic forgetting in
 *     neural networks." PNAS 114(13).
 *   Schwarz, J. et al. (2018) "Progress & Compress: A scalable framework
 *     for continual learning." ICML.
 *
 * Algorithm:
 *   1. computeFisher: F_i = (1/N) · Σ_n (g_n_i)² (diagonal)
 *   2. regLoss:       L_reg = λ/2 · Σ_i F_i · (Δθ_i)²
 *                     ∂L_reg/∂θ_i = λ · F_i · (θ_i - θ*_i)
 *   3. consolidate:   F_run = decay·F_run + (1-decay)·F_new (Schwarz EMA)
 *
 * Failure modes covered (7):
 *   1. Empty samples → invalid_input
 *   2. Shape mismatch → shape_mismatch
 *   3. NaN/Infinity → non_finite
 *   4. λ < 0 → invalid_input (Zod gate)
 *   5. Zero Fisher entry → unconstrained weight (gradient = 0)
 *   6. consolidate before computeFisher → first call initializes runningFisher
 *   7. Single-sample Fisher (n<30) → returned but reliable=false flag
 *
 * @module CrossProcessEWCMemoryPreservationEngine
 */

import { z } from "zod";

const DEFAULT_LAMBDA = 1.0;
const EWC_PLUS_DECAY = 0.9;
const MIN_RELIABLE_SAMPLES = 30;
const MAX_VECTOR_DIM = 1_000_000;
const FISHER_EPSILON = 0;

const NumberArrayLoose = z.array(z.unknown()).min(1).max(MAX_VECTOR_DIM)
  .transform((arr, ctx) => {
    const out: number[] = [];
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      if (typeof v !== "number") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i], message: `expected number, got ${typeof v}` });
        return z.NEVER;
      }
      out.push(v);
    }
    return out;
  });

const ComputeFisherInputSchema = z.object({
  gradientSamples: z.array(NumberArrayLoose).min(1).max(100_000),
});

const RegLossInputSchema = z.object({
  newWeights: NumberArrayLoose,
  oldWeights: NumberArrayLoose,
  fisher: NumberArrayLoose,
  lambda: z.number().min(0).max(1e6).default(DEFAULT_LAMBDA),
});

const ConsolidateInputSchema = z.object({
  newFisher: NumberArrayLoose,
  decay: z.number().min(0).max(1).default(EWC_PLUS_DECAY),
});

export interface FisherResult {
  fisher: number[];
  numSamples: number;
  reliable: boolean;
  meanFisher: number;
  maxFisher: number;
}

export interface RegLossResult {
  loss: number;
  gradient: number[];
  perParamContribution: number[];
}

export interface ComputeFisherOk { ok: true; result: FisherResult; }
export interface RegLossOk { ok: true; result: RegLossResult; }
export interface ConsolidateOk { ok: true; fisher: number[]; mergeWeight: number; }

export interface OpErr {
  ok: false;
  error: "invalid_input" | "shape_mismatch" | "non_finite" | "invalid_state";
  message: string;
}

export type ComputeFisherResult = ComputeFisherOk | OpErr;
export type RegLossResultUnion = RegLossOk | OpErr;
export type ConsolidateResult = ConsolidateOk | OpErr;

interface EngineState {
  runningFisher: number[] | null;
  totalConsolidations: number;
  totalSamples: number;
}

function freshState(): EngineState {
  return { runningFisher: null, totalConsolidations: 0, totalSamples: 0 };
}

let state: EngineState = freshState();

function allFinite(arr: readonly number[]): boolean {
  for (const x of arr) if (!Number.isFinite(x)) return false;
  return true;
}

export class CrossProcessEWCMemoryPreservationEngine {
  static readonly tier = "T3-04";

  static computeFisher(input: unknown): ComputeFisherResult {
    const parsed = ComputeFisherInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { gradientSamples } = parsed.data;
    const D = gradientSamples[0].length;
    for (let n = 0; n < gradientSamples.length; n++) {
      const sample = gradientSamples[n];
      if (sample.length !== D) {
        return { ok: false, error: "shape_mismatch", message: `gradientSamples[${n}].length=${sample.length} ≠ ${D}` };
      }
      if (!allFinite(sample)) {
        return { ok: false, error: "non_finite", message: `gradientSamples[${n}] contains NaN or Infinity` };
      }
    }

    const fisher = new Array(D).fill(0);
    for (const sample of gradientSamples) {
      for (let i = 0; i < D; i++) fisher[i] += sample[i] * sample[i];
    }
    const N = gradientSamples.length;
    for (let i = 0; i < D; i++) fisher[i] /= N;

    let mean = 0;
    let max = 0;
    for (const f of fisher) {
      mean += f;
      if (f > max) max = f;
    }
    mean /= D;

    return {
      ok: true,
      result: {
        fisher,
        numSamples: N,
        reliable: N >= MIN_RELIABLE_SAMPLES,
        meanFisher: mean,
        maxFisher: max,
      },
    };
  }

  static regLoss(input: unknown): RegLossResultUnion {
    const parsed = RegLossInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { newWeights, oldWeights, fisher, lambda } = parsed.data;
    const D = newWeights.length;
    if (oldWeights.length !== D) {
      return { ok: false, error: "shape_mismatch", message: `oldWeights.length=${oldWeights.length} ≠ ${D}` };
    }
    if (fisher.length !== D) {
      return { ok: false, error: "shape_mismatch", message: `fisher.length=${fisher.length} ≠ ${D}` };
    }
    if (!allFinite(newWeights) || !allFinite(oldWeights) || !allFinite(fisher)) {
      return { ok: false, error: "non_finite", message: "weights or fisher contain NaN or Infinity" };
    }
    for (let i = 0; i < D; i++) {
      if (fisher[i] < 0) {
        return { ok: false, error: "invalid_input", message: `fisher[${i}]=${fisher[i]} < 0` };
      }
    }

    const gradient = new Array(D);
    const perParamContribution = new Array(D);
    let loss = 0;
    for (let i = 0; i < D; i++) {
      const delta = newWeights[i] - oldWeights[i];
      const f = Math.max(fisher[i], FISHER_EPSILON);
      const contrib = f * delta * delta;
      perParamContribution[i] = contrib;
      loss += contrib;
      gradient[i] = lambda * f * delta;
    }
    loss = (lambda / 2) * loss;

    return { ok: true, result: { loss, gradient, perParamContribution } };
  }

  static consolidate(input: unknown): ConsolidateResult {
    const parsed = ConsolidateInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { newFisher, decay } = parsed.data;
    if (!allFinite(newFisher)) {
      return { ok: false, error: "non_finite", message: "newFisher contains NaN/Infinity" };
    }
    for (let i = 0; i < newFisher.length; i++) {
      if (newFisher[i] < 0) {
        return { ok: false, error: "invalid_input", message: `newFisher[${i}]=${newFisher[i]} < 0` };
      }
    }
    if (state.runningFisher === null) {
      state.runningFisher = newFisher.slice();
      state.totalConsolidations = 1;
      return { ok: true, fisher: state.runningFisher.slice(), mergeWeight: 1.0 };
    }
    if (state.runningFisher.length !== newFisher.length) {
      return {
        ok: false,
        error: "shape_mismatch",
        message: `runningFisher.length=${state.runningFisher.length} ≠ newFisher.length=${newFisher.length}`,
      };
    }
    const oneMinusDecay = 1 - decay;
    for (let i = 0; i < state.runningFisher.length; i++) {
      state.runningFisher[i] = decay * state.runningFisher[i] + oneMinusDecay * newFisher[i];
    }
    state.totalConsolidations++;
    return { ok: true, fisher: state.runningFisher.slice(), mergeWeight: oneMinusDecay };
  }

  static getRunningFisher(): number[] | null {
    return state.runningFisher === null ? null : state.runningFisher.slice();
  }

  static reset(): void {
    state = freshState();
  }

  static constants(): {
    DEFAULT_LAMBDA: number;
    EWC_PLUS_DECAY: number;
    MIN_RELIABLE_SAMPLES: number;
  } {
    return { DEFAULT_LAMBDA, EWC_PLUS_DECAY, MIN_RELIABLE_SAMPLES };
  }
}

export const crossProcessEWCMemoryPreservationEngine = CrossProcessEWCMemoryPreservationEngine;

export function crossProcessEWCMemoryPreservation(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_ewc_compute_fisher":
      return CrossProcessEWCMemoryPreservationEngine.computeFisher(params);
    case "xproc_ewc_reg_loss":
      return CrossProcessEWCMemoryPreservationEngine.regLoss(params);
    case "xproc_ewc_consolidate":
      return CrossProcessEWCMemoryPreservationEngine.consolidate(params);
    case "xproc_ewc_get_fisher":
      return { fisher: CrossProcessEWCMemoryPreservationEngine.getRunningFisher() };
    case "xproc_ewc_reset":
      CrossProcessEWCMemoryPreservationEngine.reset();
      return { ok: true };
    case "xproc_ewc_constants":
      return CrossProcessEWCMemoryPreservationEngine.constants();
    default:
      throw new Error(`crossProcessEWCMemoryPreservation: unknown action '${action}'`);
  }
}
