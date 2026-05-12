/**
 * ComplexityAwareRouterEngine — Classify problems and route to solvers
 *
 * Phase 0.20 U-MATH11 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Given a
 * problem descriptor (size + structural features), classify its complexity
 * class and recommend a solver strategy. This is a heuristic router: it
 * does not prove the class, it matches observable features to canonical
 * problem shapes (sorting → P, SAT → NP-complete, tour → NPC, etc.).
 *
 * No I/O. Callers pass in feature flags; the engine returns a routing
 * decision with rationale.
 *
 * @module engines/ComplexityAwareRouterEngine
 * @milestone PP-0.20-U-MATH11
 */

export type ComplexityClass = "P" | "NP" | "NPC" | "PSPACE" | "EXP" | "undecidable" | "unknown";

export interface ProblemFeatures {
  name?: string;
  sizeN?: number;
  /** Problem is polynomially solvable (sort, shortest-path, LP, max-flow). */
  polynomialKnown?: boolean;
  /** Problem is classic NP-complete (SAT/3-SAT, TSP, k-coloring, subset-sum). */
  npCompleteKnown?: boolean;
  /** Problem involves game state / 2-player adversarial search. */
  gameLike?: boolean;
  /** Problem requires halting analysis / arbitrary-precision recursion. */
  turingComplete?: boolean;
  /** Known approximation algorithm exists (α-approx with α in (1, ∞)). */
  approximableFactor?: number;
  tags?: string[];
}

export interface RoutingDecision {
  class: ComplexityClass;
  solver: string;
  approximate: boolean;
  warn: boolean;
  rationale: string[];
  estimatedBudgetSeconds: number;
}

export class ComplexityAwareRouterEngine {
  classify(features: ProblemFeatures): RoutingDecision {
    this.assertValid(features);
    const rationale: string[] = [];
    let cls: ComplexityClass = "unknown";
    let solver = "heuristic";
    let approximate = false;
    let warn = false;

    if (features.turingComplete) {
      cls = "undecidable";
      solver = "reject";
      warn = true;
      rationale.push("turing-complete → undecidable; refuse");
    } else if (features.gameLike) {
      cls = "PSPACE";
      solver = "alpha-beta";
      warn = true;
      rationale.push("adversarial game search → PSPACE");
    } else if (features.npCompleteKnown) {
      cls = "NPC";
      if (features.approximableFactor !== undefined) {
        solver = `approx (α=${features.approximableFactor})`;
        approximate = true;
        rationale.push(`NP-complete with known ${features.approximableFactor}-approximation`);
      } else {
        solver = "SAT/ILP";
        warn = true;
        rationale.push("NP-complete, no approx → full search / time-boxed");
      }
    } else if (features.polynomialKnown) {
      cls = "P";
      solver = "polynomial exact";
      rationale.push("polynomial algorithm known");
    } else {
      rationale.push("class unknown from features; caller should supply more hints");
    }

    const budget = this.budgetFor(cls, features.sizeN);
    if (features.sizeN !== undefined && features.sizeN > 10000 && cls !== "P") {
      warn = true;
      rationale.push(`large n=${features.sizeN} on non-P problem`);
    }

    return {
      class: cls,
      solver,
      approximate,
      warn,
      rationale,
      estimatedBudgetSeconds: budget,
    };
  }

  private budgetFor(cls: ComplexityClass, n?: number): number {
    const size = n ?? 1000;
    switch (cls) {
      case "P":
        return Math.max(0.001, Math.min(60, size * 1e-5));
      case "NPC":
        return Math.min(600, Math.pow(2, Math.min(30, Math.log2(Math.max(2, size)))));
      case "NP":
        return Math.min(300, size * 0.01);
      case "PSPACE":
        return 60;
      case "EXP":
        return 900;
      case "undecidable":
        return 0;
      default:
        return 10;
    }
  }

  private assertValid(f: ProblemFeatures): void {
    if (f.sizeN !== undefined && (!Number.isFinite(f.sizeN) || f.sizeN < 0)) {
      throw new Error("sizeN must be a non-negative number");
    }
    if (f.approximableFactor !== undefined && !(f.approximableFactor > 1)) {
      throw new Error("approximableFactor must be > 1");
    }
    const hints = [f.polynomialKnown, f.npCompleteKnown, f.gameLike, f.turingComplete].filter(Boolean).length;
    if (hints > 1) throw new Error("problem features contradict each other");
  }
}

export const complexityAwareRouterEngine = new ComplexityAwareRouterEngine();
