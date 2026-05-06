/**
 * CrossProcessMAMLLiteEngine — XPROC-NEURAL Tier 7 (T7-01)
 *
 * First-order Model-Agnostic Meta-Learning (FOMAML) per Finn, Abbeel,
 * Levine 2017, "Model-Agnostic Meta-Learning for Fast Adaptation of
 * Deep Networks," ICML.
 *
 * ## Why "Lite"
 *
 * The full MAML paper does TWO gradient passes per task: (a) inner-loop
 * gradient steps from θ → θ' on the support set, and (b) outer-loop
 * gradient ∇_θ L(θ', query) which is a SECOND-order derivative through
 * the inner steps (involves the Hessian). Computing ∇_θ ∇_θ' L(θ',·)
 * costs roughly 3-5× a normal forward+backward pass and adds nontrivial
 * implementation complexity.
 *
 * FOMAML (Finn 2017 §5.2) drops the second-order term and approximates:
 *
 *   ∇_θ L(θ', q) ≈ ∇_θ' L(θ', q)
 *
 * That is: treat the inner-loop adapted parameters θ' as if they had
 * been the originals. The paper reports the FOMAML accuracy is within
 * a few percentage points of full MAML on Omniglot/MiniImageNet while
 * being substantially cheaper. For PRISM's manufacturing-domain
 * adaptation problem (new material/machine arrives, ≤10 examples
 * available) this trade-off is the right call.
 *
 * ## Architecture decision — pure aggregator (matches Tier 5/6 pattern)
 *
 * We do NOT train neural nets in this engine. The engine accepts:
 *   - the meta-trained init θ (a flat number[] — flattened MLP weights
 *     from T1-02 CrossProcessNeuralLearningEngine; we treat opaquely)
 *   - per-task gradient updates {gradients[][], query_gradient[]}
 *     pre-computed by the caller's MLP
 *
 * and produces:
 *   - meta-update Δθ to apply to the global init (outer-loop step)
 *   - per-task adaptation trajectories (inner-loop preview)
 *
 * Why this split: T1-02 owns the MLP forward+backward; this engine owns
 * the META-LEARNING UPDATE RULE. Decoupling lets us swap MLP topology
 * (or even replace it with a different model) without rewriting MAML.
 *
 * ## Algorithm — single outer-loop step
 *
 * Caller provides a meta-batch of tasks. Each task contributes:
 *   support_gradients  — K inner-loop gradients, one per inner step,
 *                        each evaluated at θ_k after k-1 prior updates
 *   query_gradient     — gradient at θ_K (post-adaptation) on the query set
 *   inner_lr           — α (Finn's notation), inner-loop step size
 *
 * Inner-loop adaptation (computed by caller, we just mirror in metadata):
 *   θ_0 = θ                                (start at meta-init)
 *   θ_k = θ_{k-1} - α · support_gradients[k-1]   for k=1..K
 *   → final adapted θ_K
 *
 * FOMAML outer-loop step (THIS ENGINE'S CORE OPERATION):
 *   Δθ = β · (1/|tasks|) · Σ_t query_gradient_t
 *
 * where β is the meta learning rate. The negation is folded into the
 * gradient sign convention (caller passes ∇L; engine descends).
 *
 *   θ_new = θ - Δθ      (apply via metaStep() return)
 *
 * ## Acceptance (XPROC-NEURAL-ROADMAP.md Tier 7 R1)
 *
 *   "Reaches 80% of T1-02 batch-trained accuracy with 10 examples on
 *   held-out task."
 *
 * Direct accuracy testing requires a real T1-02 instance. Instead we
 * verify the FOMAML math on a synthetic quadratic loss meta-task (see
 * tests):
 *   - Inner-loop steps move toward task minimum monotonically when
 *     inner_lr is in stable range.
 *   - Outer-loop update direction matches the average query gradient.
 *   - Meta-init after K outer steps converges toward a centroid that
 *     is closer to all task minima than any single-task init would be.
 *
 * ## Failure modes covered
 *
 *   1. Empty meta-batch                    → invalid_input
 *   2. Mismatched gradient lengths in batch → invalid_input
 *   3. NaN/Inf gradients                   → invalid_input (Zod)
 *   4. inner_lr ≤ 0                        → invalid_input
 *   5. meta_lr ≤ 0                         → invalid_input
 *   6. inner_steps = 0                     → equivalent to direct query-grad
 *      meta-update; engine accepts and warns
 *   7. theta length mismatch with gradient → invalid_input
 *   8. Excessive inner_lr causing divergence → flagged via inner-loop
 *      norm growth check (warn, don't fail — caller's choice)
 *   9. Single-task meta-batch (no averaging) → mathematically valid;
 *      degenerate to plain gradient descent; warn
 *
 * @module CrossProcessMAMLLiteEngine
 */

import { z } from "zod";

// ============================================================================
// Constants
// ============================================================================

/** Sanity bound on flattened parameter vector length. */
const MAX_PARAMS = 1_000_000;

/** Sanity bound on inner-loop step count. */
const MAX_INNER_STEPS = 32;

/** Sanity bound on tasks per meta-batch. */
const MAX_META_BATCH = 256;

/** Inner-loop divergence guard: if final ||θ_K|| / ||θ_0|| exceeds this, warn. */
const DIVERGENCE_RATIO = 10;

// ============================================================================
// Schemas
// ============================================================================

const TaskGradientsSchema = z.object({
  taskId: z.string().min(1).max(128),
  /** K inner-loop gradients, evaluated at θ_0, θ_1, ..., θ_{K-1}. */
  supportGradients: z.array(z.array(z.number().finite()).max(MAX_PARAMS)).max(MAX_INNER_STEPS),
  /** Single gradient at θ_K on the query set. */
  queryGradient: z.array(z.number().finite()).min(1).max(MAX_PARAMS),
});

const MetaStepInputSchema = z.object({
  /** Current meta-init parameter vector θ. */
  theta: z.array(z.number().finite()).min(1).max(MAX_PARAMS),
  innerLR: z.number().finite().positive().max(10),
  metaLR: z.number().finite().positive().max(10),
  tasks: z.array(TaskGradientsSchema).min(1).max(MAX_META_BATCH),
});

const InnerLoopInputSchema = z.object({
  theta: z.array(z.number().finite()).min(1).max(MAX_PARAMS),
  innerLR: z.number().finite().positive().max(10),
  supportGradients: z.array(z.array(z.number().finite()).max(MAX_PARAMS)).min(1).max(MAX_INNER_STEPS),
});

// ============================================================================
// Public types
// ============================================================================

export interface TaskGradients {
  taskId: string;
  supportGradients: number[][];
  queryGradient: number[];
}

export interface InnerLoopOk {
  ok: true;
  /** Adapted parameters θ_K after all inner steps. */
  thetaAdapted: number[];
  /** Per-step parameter trajectories: trajectory[k] = θ after k+1 inner steps. */
  trajectory: number[][];
  /** ||θ_K - θ_0||₂. Larger = bigger adaptation. */
  adaptationNorm: number;
  /** Detected divergence (norm growth > threshold). */
  diverged: boolean;
  warnings: string[];
}

export interface MetaStepOk {
  ok: true;
  /** New meta-init parameters θ_new = θ - metaLR · meanQueryGradient. */
  thetaNew: number[];
  /** Mean query gradient across tasks (the FOMAML descent direction). */
  meanQueryGradient: number[];
  /** L2 norm of the meta-update step. */
  metaUpdateNorm: number;
  /** Per-task adaptation diagnostics. */
  taskDiagnostics: {
    taskId: string;
    adaptationNorm: number;
    queryGradNorm: number;
    diverged: boolean;
  }[];
  warnings: string[];
}

export interface OpErr {
  ok: false;
  error: "invalid_input" | "invalid_state";
  message: string;
}

export type InnerLoopResult = InnerLoopOk | OpErr;
export type MetaStepResult = MetaStepOk | OpErr;

// ============================================================================
// Helpers
// ============================================================================

function l2norm(v: number[]): number {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  return Math.sqrt(s);
}

function ensureSameLength(a: number[], b: number[], label: string): string | null {
  if (a.length !== b.length) {
    return `${label}: length mismatch (${a.length} vs ${b.length})`;
  }
  return null;
}

function applyInnerStep(theta: number[], gradient: number[], innerLR: number): number[] {
  const out = new Array<number>(theta.length);
  for (let i = 0; i < theta.length; i++) {
    out[i] = theta[i] - innerLR * gradient[i];
  }
  return out;
}

// ============================================================================
// Public API
// ============================================================================

export class CrossProcessMAMLLiteEngine {
  static readonly tier = "T7-01";

  /**
   * Run the inner-loop adaptation for a SINGLE task. Pure function:
   * given θ, support gradients evaluated at successive θ_k, and the
   * inner learning rate, return the adapted θ_K and the trajectory.
   *
   * Caller must have computed each support gradient at the appropriate
   * intermediate θ_k. (We cannot compute gradients here because we do
   * not have the model — that lives in T1-02.)
   */
  static innerLoop(input: unknown): InnerLoopResult {
    const parsed = InnerLoopInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { theta, innerLR, supportGradients } = parsed.data;

    for (let k = 0; k < supportGradients.length; k++) {
      const lenErr = ensureSameLength(theta, supportGradients[k], `supportGradients[${k}]`);
      if (lenErr) {
        return { ok: false, error: "invalid_input", message: lenErr };
      }
    }

    const warnings: string[] = [];
    const trajectory: number[][] = [];
    let current = theta.slice();
    const initNorm = l2norm(theta);

    for (let k = 0; k < supportGradients.length; k++) {
      current = applyInnerStep(current, supportGradients[k], innerLR);
      trajectory.push(current.slice());
    }

    const finalNorm = l2norm(current);
    const diverged = initNorm > 0 && finalNorm / initNorm > DIVERGENCE_RATIO;
    if (diverged) {
      warnings.push(
        `inner-loop diverged: ||θ_K||/||θ_0|| = ${(finalNorm / initNorm).toFixed(2)} > ${DIVERGENCE_RATIO}; consider lowering innerLR`,
      );
    }

    const delta = new Array<number>(theta.length);
    for (let i = 0; i < theta.length; i++) delta[i] = current[i] - theta[i];

    return {
      ok: true,
      thetaAdapted: current,
      trajectory,
      adaptationNorm: l2norm(delta),
      diverged,
      warnings,
    };
  }

  /**
   * Outer-loop FOMAML meta-update. Pure function: given the current
   * meta-init θ and a meta-batch of tasks (each contributing inner-loop
   * support gradients + a query gradient computed at θ_K), produce the
   * updated meta-init θ_new.
   *
   * FOMAML formula (Finn 2017 §5.2):
   *   θ_new = θ - β · (1/T) · Σ_t ∇L(θ_K^t, query_t)
   * where the second-order term ∇_θ ∇_θ' L(θ', q) is dropped.
   */
  static metaStep(input: unknown): MetaStepResult {
    const parsed = MetaStepInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { theta, innerLR, metaLR, tasks } = parsed.data;
    const D = theta.length;
    const warnings: string[] = [];

    // Validate per-task gradient shapes against θ.
    for (const t of tasks) {
      for (let k = 0; k < t.supportGradients.length; k++) {
        const lenErr = ensureSameLength(
          theta, t.supportGradients[k], `task '${t.taskId}'.supportGradients[${k}]`,
        );
        if (lenErr) {
          return { ok: false, error: "invalid_input", message: lenErr };
        }
      }
      const qErr = ensureSameLength(theta, t.queryGradient, `task '${t.taskId}'.queryGradient`);
      if (qErr) {
        return { ok: false, error: "invalid_input", message: qErr };
      }
    }

    if (tasks.length === 1) {
      warnings.push("meta-batch has only 1 task — degenerate to plain gradient descent");
    }

    // Compute inner-loop trajectories for diagnostics + average query gradient.
    const meanQueryGradient = new Array<number>(D).fill(0);
    const taskDiagnostics: MetaStepOk["taskDiagnostics"] = [];
    const initNorm = l2norm(theta);

    for (const t of tasks as TaskGradients[]) {
      let current = theta.slice();
      for (let k = 0; k < t.supportGradients.length; k++) {
        current = applyInnerStep(current, t.supportGradients[k], innerLR);
      }
      const finalNorm = l2norm(current);
      const diverged = initNorm > 0 && finalNorm / initNorm > DIVERGENCE_RATIO;
      const delta = new Array<number>(D);
      for (let i = 0; i < D; i++) delta[i] = current[i] - theta[i];

      taskDiagnostics.push({
        taskId: t.taskId,
        adaptationNorm: l2norm(delta),
        queryGradNorm: l2norm(t.queryGradient),
        diverged,
      });
      if (diverged) {
        warnings.push(`task '${t.taskId}' inner-loop diverged`);
      }

      for (let i = 0; i < D; i++) {
        meanQueryGradient[i] += t.queryGradient[i] / tasks.length;
      }
    }

    if (t_is_zero(tasks)) {
      warnings.push("inner_steps=0 across all tasks; meta-update degenerates to vanilla gradient descent on query gradients");
    }

    const thetaNew = new Array<number>(D);
    for (let i = 0; i < D; i++) thetaNew[i] = theta[i] - metaLR * meanQueryGradient[i];

    let metaUpdateNorm = 0;
    for (let i = 0; i < D; i++) metaUpdateNorm += (metaLR * meanQueryGradient[i]) ** 2;
    metaUpdateNorm = Math.sqrt(metaUpdateNorm);

    return {
      ok: true,
      thetaNew,
      meanQueryGradient,
      metaUpdateNorm,
      taskDiagnostics,
      warnings,
    };
  }

  /** Read-only constants snapshot. */
  static constants(): {
    MAX_PARAMS: number;
    MAX_INNER_STEPS: number;
    MAX_META_BATCH: number;
    DIVERGENCE_RATIO: number;
  } {
    return { MAX_PARAMS, MAX_INNER_STEPS, MAX_META_BATCH, DIVERGENCE_RATIO };
  }
}

// Helper: detect whether all tasks have zero inner steps.
function t_is_zero(tasks: { supportGradients: number[][] }[]): boolean {
  for (const t of tasks) {
    if (t.supportGradients.length > 0) return false;
  }
  return true;
}

export const crossProcessMAMLLiteEngine = CrossProcessMAMLLiteEngine;

/** Dispatcher convenience wrapper. */
export function crossProcessMAMLLite(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_maml_inner_loop":
      return CrossProcessMAMLLiteEngine.innerLoop(params);
    case "xproc_maml_meta_train":
      return CrossProcessMAMLLiteEngine.metaStep(params);
    case "xproc_maml_constants":
      return CrossProcessMAMLLiteEngine.constants();
    default:
      throw new Error(`crossProcessMAMLLite: unknown action '${action}'`);
  }
}
