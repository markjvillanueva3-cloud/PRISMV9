/**
 * ConcentrationInequalityEngine — Tail bounds for bounded/unbounded random variables
 *
 * Phase 0.20 U-MATH17 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Closed-form
 * probability bounds (Hoeffding, Bernstein, McDiarmid, Chernoff) used by
 * session-awareness callers to answer "with what probability does my
 * empirical mean deviate from the true mean by more than ε?"
 *
 * All formulas are deterministic, no sampling. References:
 *   - Hoeffding (1963) "Probability Inequalities for Sums of Bounded
 *     Random Variables"
 *   - Bernstein inequality (Boucheron, Lugosi, Massart 2013, Theorem 2.10)
 *   - McDiarmid (1989) "On the method of bounded differences"
 *
 * @module engines/ConcentrationInequalityEngine
 * @milestone PP-0.20-U-MATH17
 */

export interface BoundInput {
  /** Number of samples. */
  n: number;
  /** Deviation threshold ε > 0. */
  epsilon: number;
}

export interface HoeffdingInput extends BoundInput {
  /** Lower and upper bounds on each sample (a ≤ X ≤ b). */
  a: number;
  b: number;
  /** Two-sided bound if true (default); one-sided otherwise. */
  twoSided?: boolean;
}

export interface BernsteinInput extends BoundInput {
  /** Variance of the random variable. */
  variance: number;
  /** Almost-sure upper bound on |X − E[X]|. */
  bound: number;
}

export interface McDiarmidInput extends BoundInput {
  /** Bounded-differences constants c_i (length = n). */
  c: readonly number[];
  twoSided?: boolean;
}

export interface ChernoffInput extends BoundInput {
  /** Empirical mean, 0 ≤ pHat ≤ 1. */
  pHat: number;
  /** true for upper-tail deviation, false for lower-tail. */
  upperTail: boolean;
}

export interface BoundResult {
  name: string;
  /** Upper bound on P(|mean − μ| ≥ ε). */
  probability: number;
  rationale: string;
}

export class ConcentrationInequalityEngine {
  hoeffding(input: HoeffdingInput): BoundResult {
    this.assertN(input.n);
    this.assertEps(input.epsilon);
    if (input.a >= input.b) throw new Error("a must be < b");
    const range = input.b - input.a;
    const exponent = -(2 * input.n * input.epsilon * input.epsilon) / (range * range);
    const onesided = Math.exp(exponent);
    const probability = input.twoSided === false ? onesided : 2 * onesided;
    return {
      name: "hoeffding",
      probability: this.clamp01(probability),
      rationale: `exp(-2·${input.n}·${input.epsilon}²/${range}²) ${input.twoSided === false ? "" : "× 2"}`,
    };
  }

  bernstein(input: BernsteinInput): BoundResult {
    this.assertN(input.n);
    this.assertEps(input.epsilon);
    if (input.variance < 0) throw new Error("variance must be ≥ 0");
    if (input.bound <= 0) throw new Error("bound must be > 0");
    const numerator = input.n * input.epsilon * input.epsilon;
    const denom = 2 * (input.variance + (input.bound * input.epsilon) / 3);
    const exponent = -numerator / denom;
    const probability = this.clamp01(2 * Math.exp(exponent));
    return {
      name: "bernstein",
      probability,
      rationale: `2·exp(-n·ε²/(2·(σ² + M·ε/3)))`,
    };
  }

  mcdiarmid(input: McDiarmidInput): BoundResult {
    this.assertN(input.n);
    this.assertEps(input.epsilon);
    if (input.c.length !== input.n) throw new Error(`c length must equal n=${input.n}`);
    let sumCsq = 0;
    for (const ci of input.c) {
      if (!(ci >= 0)) throw new Error("c_i must be ≥ 0");
      sumCsq += ci * ci;
    }
    if (sumCsq === 0) throw new Error("Σ c_i² must be > 0");
    const exponent = -(2 * input.epsilon * input.epsilon) / sumCsq;
    const one = Math.exp(exponent);
    const probability = input.twoSided === false ? one : 2 * one;
    return {
      name: "mcdiarmid",
      probability: this.clamp01(probability),
      rationale: `exp(-2·ε²/Σ c_i²) ${input.twoSided === false ? "" : "× 2"}`,
    };
  }

  chernoff(input: ChernoffInput): BoundResult {
    this.assertN(input.n);
    this.assertEps(input.epsilon);
    if (!(input.pHat >= 0 && input.pHat <= 1)) throw new Error("pHat must be in [0,1]");
    const delta = input.epsilon / Math.max(1e-9, input.pHat);
    const factor = input.upperTail
      ? Math.exp((-input.pHat * input.n * delta * delta) / 3)
      : Math.exp((-input.pHat * input.n * delta * delta) / 2);
    return {
      name: "chernoff",
      probability: this.clamp01(factor),
      rationale: input.upperTail
        ? `exp(-p·n·δ²/3), δ=ε/p`
        : `exp(-p·n·δ²/2), δ=ε/p`,
    };
  }

  /**
   * Sample size required so that two-sided Hoeffding bound ≤ δ for given ε
   * and range [a,b]. Returns ⌈value⌉.
   */
  hoeffdingSampleSize(epsilon: number, delta: number, range: number): number {
    this.assertEps(epsilon);
    if (!(delta > 0 && delta < 1)) throw new Error("delta must be in (0,1)");
    if (!(range > 0)) throw new Error("range must be > 0");
    const n = (range * range * Math.log(2 / delta)) / (2 * epsilon * epsilon);
    return Math.ceil(n);
  }

  // --- internals ---------------------------------------------------------

  private assertN(n: number): void {
    if (!Number.isInteger(n) || n <= 0) throw new Error("n must be a positive integer");
  }

  private assertEps(e: number): void {
    if (!(e > 0)) throw new Error("epsilon must be > 0");
  }

  private clamp01(x: number): number {
    if (!Number.isFinite(x)) return 1;
    return Math.max(0, Math.min(1, x));
  }
}

export const concentrationInequalityEngine = new ConcentrationInequalityEngine();
