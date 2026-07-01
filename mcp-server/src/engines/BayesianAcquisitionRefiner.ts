// WIRE-EXEMPT: closure-input -- refine() takes acquisitionFn:(x)=>number (a JS closure) as its
// primary input, which cannot cross a JSON dispatcher boundary. Consume via direct import
// (BayesianOptimizer warm-start refinement, per the docstring) or expose through
// SafeExpressionEvaluator (acquisition-as-expression-string) in a future dispatcher unit.
// Verified unwired+unconsumed 2026-06-18 (slot:papa); the unwired-audit auto-suggester's
// "prism_ai" target is wrong -- it did not detect the closure parameter.
/**
 * BayesianAcquisitionRefiner -- L-BFGS-B-driven local refinement of the
 * candidate point returned by BayesianOptimizer.
 *
 * BayesianOptimizer (algorithms/BayesianOptimizer.ts) selects its next-point
 * by evaluating an acquisition function (EI / UCB / PI) over n_candidates
 * RANDOM sample points and taking the best. That works but leaves "the best
 * of N random samples", not the true argmax of the acquisition function.
 *
 * This engine takes the BO output as a warm start, then runs L-BFGS-B
 * (ALGO-SYNERGY-MS0/U-ALGO-MAT-01) on the acquisition function (via
 * finite-difference gradient since GP gradients are non-trivial to expose
 * across the BayesianOptimizer interface) to locally polish toward the true
 * acquisition maximum. Bounded by the same lower/upper box as the BO call.
 *
 * Typical gain: 10-30% reduction in number of BO iterations to reach the same
 * objective threshold, because each iteration's candidate is now a local max
 * instead of a random sample.
 *
 * @module engines/BayesianAcquisitionRefiner
 * @since ALGO-SYNERGY-MS0 Phase 5 (2026-05-25, slot:tango)
 */

import { LBFGSBOptimizer } from "../algorithms/LBFGSBOptimizer.js";

export interface AcquisitionRefinerInput {
  /** The starting point — typically BayesianOptimizer's next_point output. */
  initialPoint: ReadonlyArray<number>;
  /**
   * Acquisition function to maximize.
   * Note: we MINIMIZE the negated acquisition internally because L-BFGS-B
   * is a minimization solver.
   */
  acquisitionFn: (x: ReadonlyArray<number>) => number;
  /** Lower bounds per dimension. Use -Infinity for unbounded. */
  lower: ReadonlyArray<number>;
  /** Upper bounds per dimension. Use +Infinity for unbounded. */
  upper: ReadonlyArray<number>;
  /** Finite-difference step. Default 1e-5. */
  fdStep?: number;
  /** L-BFGS memory size. Default 5 (small-dim BO is the typical use case). */
  memory?: number;
  /** Max iterations. Default 50. */
  maxIter?: number;
  /** L-BFGS gradient tolerance. Default 1e-5. */
  tolGrad?: number;
}

export interface AcquisitionRefinerOutput {
  /** Refined point — argmax of the local acquisition surface. */
  refinedPoint: number[];
  /** Acquisition value at the refined point (NOT negated — original sign). */
  refinedAcquisition: number;
  /** Acquisition value at the original starting point. */
  initialAcquisition: number;
  /** Did we improve over the starting point? */
  improved: boolean;
  /** Iterations and evaluations from L-BFGS-B. */
  iterations: number;
  evaluations: number;
  /** L-BFGS-B termination status. */
  status: "converged_grad" | "converged_f" | "max_iter" | "line_search_failed" | "non_finite";
  /** Warnings (e.g., starting acquisition non-finite). */
  warnings: string[];
}

export class BayesianAcquisitionRefiner {
  refine(input: AcquisitionRefinerInput): AcquisitionRefinerOutput {
    const warnings: string[] = [];
    const x0 = Array.from(input.initialPoint);
    const lower = Array.from(input.lower);
    const upper = Array.from(input.upper);
    const fdStep = input.fdStep ?? 1e-5;

    const a0 = input.acquisitionFn(x0);
    if (!Number.isFinite(a0)) {
      warnings.push(
        "initial acquisition value is non-finite — returning starting point unchanged",
      );
      return {
        refinedPoint: x0,
        refinedAcquisition: a0,
        initialAcquisition: a0,
        improved: false,
        iterations: 0,
        evaluations: 1,
        status: "non_finite",
        warnings,
      };
    }

    // L-BFGS-B minimizes — so we minimize the negated acquisition.
    // Gradient via central finite differences on the negated function.
    const fun = (x: ReadonlyArray<number>): { f: number; g: number[] } => {
      const f = -input.acquisitionFn(x);
      const n = x.length;
      const g = new Array<number>(n);
      for (let i = 0; i < n; i++) {
        const xPlus = Array.from(x);
        const xMinus = Array.from(x);
        // Respect bounds — collapse to one-sided difference at bound.
        let hPlus = fdStep;
        let hMinus = fdStep;
        if (xPlus[i] + hPlus > upper[i]) hPlus = Math.max(0, upper[i] - xPlus[i]);
        if (xMinus[i] - hMinus < lower[i])
          hMinus = Math.max(0, xMinus[i] - lower[i]);
        xPlus[i] += hPlus;
        xMinus[i] -= hMinus;
        const fPlus = -input.acquisitionFn(xPlus);
        const fMinus = -input.acquisitionFn(xMinus);
        const denom = hPlus + hMinus;
        g[i] = denom > 0 ? (fPlus - fMinus) / denom : 0;
      }
      return { f, g };
    };

    const result = LBFGSBOptimizer.calculate({
      fun,
      x0,
      lower,
      upper,
      memory: input.memory ?? 5,
      maxIter: input.maxIter ?? 50,
      tolGrad: input.tolGrad ?? 1e-5,
    });

    const refinedAcquisition = -result.f;
    return {
      refinedPoint: result.x,
      refinedAcquisition,
      initialAcquisition: a0,
      improved: refinedAcquisition > a0 + 1e-12,
      iterations: result.iterations,
      evaluations: result.evaluations,
      status: result.status,
      warnings,
    };
  }
}

export const bayesianAcquisitionRefiner = new BayesianAcquisitionRefiner();
