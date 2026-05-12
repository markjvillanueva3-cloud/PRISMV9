/**
 * StatisticalLearningBoundsEngine — PAC / VC / Rademacher generalization bounds
 *
 * Phase 0.20 U-MATH5 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Closed-form
 * generalization bounds for classification models:
 *
 *   - PAC sample complexity m ≥ (1/ε)·(ln|H| + ln(1/δ))
 *   - VC bound: |R(h) − R̂(h)| ≤ O(√(d/n)) with d = VC dimension
 *   - Rademacher bound: |R(h) − R̂(h)| ≤ 2·R̂_n + 3·√(ln(2/δ)/(2n))
 *
 * References:
 *   - Valiant (1984), Vapnik & Chervonenkis (1971),
 *     Bartlett & Mendelson (2002) "Rademacher and Gaussian Complexities"
 *
 * @module engines/StatisticalLearningBoundsEngine
 * @milestone PP-0.20-U-MATH5
 */

export interface PacInput {
  /** Hypothesis class size |H|. */
  hypothesisClassSize: number;
  /** Desired accuracy ε in (0, 1). */
  epsilon: number;
  /** Desired confidence δ in (0, 1). */
  delta: number;
}

export interface VcInput {
  /** VC dimension d. */
  vcDim: number;
  /** Sample size n. */
  n: number;
  /** Desired confidence δ in (0, 1). */
  delta: number;
}

export interface RademacherInput {
  /** Empirical Rademacher complexity R̂_n ≥ 0. */
  empiricalRademacher: number;
  /** Sample size n. */
  n: number;
  /** Desired confidence δ in (0, 1). */
  delta: number;
}

export interface BoundOutput {
  value: number;
  formula: string;
}

export class StatisticalLearningBoundsEngine {
  pacSampleComplexity(input: PacInput): BoundOutput {
    const { hypothesisClassSize, epsilon, delta } = input;
    if (!(hypothesisClassSize >= 1)) throw new Error("|H| must be ≥ 1");
    this.assertProb(epsilon, "epsilon");
    this.assertProb(delta, "delta");
    const m = (1 / epsilon) * (Math.log(hypothesisClassSize) + Math.log(1 / delta));
    return {
      value: Math.ceil(m),
      formula: "m ≥ (1/ε)·(ln|H| + ln(1/δ))",
    };
  }

  vcBound(input: VcInput): BoundOutput {
    const { vcDim, n, delta } = input;
    if (!(vcDim >= 0)) throw new Error("vcDim must be ≥ 0");
    if (!Number.isInteger(n) || n <= 0) throw new Error("n must be a positive integer");
    this.assertProb(delta, "delta");
    // Classic VC bound up to constants: O(√((d ln(n/d) + ln(1/δ))/n)).
    const inner = (vcDim * (Math.log(n) - Math.log(Math.max(1, vcDim))) + Math.log(1 / delta)) / n;
    const value = Math.sqrt(Math.max(0, inner));
    return {
      value: round4(value),
      formula: "√((d·ln(n/d) + ln(1/δ))/n)",
    };
  }

  rademacherBound(input: RademacherInput): BoundOutput {
    const { empiricalRademacher, n, delta } = input;
    if (!(empiricalRademacher >= 0)) throw new Error("empiricalRademacher must be ≥ 0");
    if (!Number.isInteger(n) || n <= 0) throw new Error("n must be a positive integer");
    this.assertProb(delta, "delta");
    const value = 2 * empiricalRademacher + 3 * Math.sqrt(Math.log(2 / delta) / (2 * n));
    return {
      value: round4(value),
      formula: "2·R̂_n + 3·√(ln(2/δ)/(2n))",
    };
  }

  /**
   * PAC-Bayes McAllester bound (simplified): √((KL(Q||P) + ln(n/δ))/(2(n-1))).
   */
  pacBayesBound(input: { kl: number; n: number; delta: number }): BoundOutput {
    if (input.kl < 0) throw new Error("kl must be ≥ 0");
    if (!Number.isInteger(input.n) || input.n <= 1) throw new Error("n must be integer > 1");
    this.assertProb(input.delta, "delta");
    const value = Math.sqrt((input.kl + Math.log(input.n / input.delta)) / (2 * (input.n - 1)));
    return {
      value: round4(value),
      formula: "√((KL(Q||P) + ln(n/δ)) / (2(n-1)))",
    };
  }

  private assertProb(p: number, name: string): void {
    if (!(p > 0 && p < 1)) throw new Error(`${name} must be in (0, 1)`);
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export const statisticalLearningBoundsEngine = new StatisticalLearningBoundsEngine();
