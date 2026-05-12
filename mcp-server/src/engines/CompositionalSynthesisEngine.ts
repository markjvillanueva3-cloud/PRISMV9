/**
 * CompositionalSynthesisEngine — Enumerate valid combinations of primitives
 *
 * Phase 0.18 U-AGI8 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Given a problem
 * expressed as input/output types + constraints, and a catalog of primitives
 * (engines, actions, formulas) each with declared type signatures, enumerate
 * short pipelines that transform input → output.
 *
 * Bounded depth (default 4 steps) keeps enumeration tractable. Candidate
 * pipelines are scored by (length penalty) × (average primitive confidence)
 * so shorter, higher-confidence chains bubble up.
 *
 * @module engines/CompositionalSynthesisEngine
 * @milestone PP-0.18-U-AGI8
 */

export interface Primitive {
  id: string;
  name: string;
  input: string;
  output: string;
  confidence: number; // 0..1
  tags?: string[];
}

export interface SynthesisProblem {
  input: string;
  output: string;
  maxDepth?: number;
  requireTags?: string[];
}

export interface PipelineCandidate {
  primitives: Primitive[];
  score: number;
  length: number;
}

export class CompositionalSynthesisEngine {
  private readonly primitives = new Map<string, Primitive>();

  register(p: Primitive): Primitive {
    this.validate(p);
    const canon = { ...p, tags: p.tags?.map((t) => t.toLowerCase()) };
    this.primitives.set(p.id, canon);
    return canon;
  }

  registerAll(primitives: readonly Primitive[]): void {
    for (const p of primitives) this.register(p);
  }

  /**
   * Enumerate pipelines whose first primitive accepts `problem.input` and
   * whose last primitive produces `problem.output`. Depth bounded.
   */
  synthesize(problem: SynthesisProblem, limit = 5): PipelineCandidate[] {
    this.validateProblem(problem);
    const maxDepth = problem.maxDepth ?? 4;
    const requireTags = problem.requireTags?.map((t) => t.toLowerCase());

    const candidates: PipelineCandidate[] = [];
    const prims = [...this.primitives.values()].filter((p) => {
      if (!requireTags || requireTags.length === 0) return true;
      return (p.tags ?? []).some((t) => requireTags.includes(t));
    });

    const visit = (chain: Primitive[], currentType: string) => {
      if (chain.length > maxDepth) return;
      if (chain.length > 0 && currentType === problem.output) {
        candidates.push(this.asCandidate(chain));
        return;
      }
      if (chain.length === maxDepth) return;
      for (const p of prims) {
        if (p.input !== currentType) continue;
        if (chain.some((c) => c.id === p.id)) continue; // no repeats in a single pipeline
        chain.push(p);
        visit(chain, p.output);
        chain.pop();
      }
    };

    visit([], problem.input);

    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.length !== b.length) return a.length - b.length;
      return a.primitives.map((p) => p.id).join(",").localeCompare(b.primitives.map((p) => p.id).join(","));
    });

    return limit > 0 ? candidates.slice(0, limit) : candidates;
  }

  size(): number {
    return this.primitives.size;
  }

  clear(): void {
    this.primitives.clear();
  }

  // --- internals ---------------------------------------------------------

  private asCandidate(chain: Primitive[]): PipelineCandidate {
    const avgConfidence =
      chain.reduce((a, p) => a + p.confidence, 0) / chain.length;
    const lengthPenalty = 1 / chain.length;
    const score = Math.round(avgConfidence * lengthPenalty * 10000) / 10000;
    return { primitives: [...chain], score, length: chain.length };
  }

  private validate(p: Primitive): void {
    if (!p.id) throw new Error("id required");
    if (!p.name) throw new Error("name required");
    if (!p.input) throw new Error("input type required");
    if (!p.output) throw new Error("output type required");
    if (!(p.confidence >= 0 && p.confidence <= 1)) throw new Error("confidence in [0,1]");
  }

  private validateProblem(p: SynthesisProblem): void {
    if (!p.input) throw new Error("problem.input required");
    if (!p.output) throw new Error("problem.output required");
    if (p.maxDepth !== undefined && (!Number.isInteger(p.maxDepth) || p.maxDepth <= 0)) {
      throw new Error("maxDepth must be a positive integer");
    }
  }
}

export const compositionalSynthesisEngine = new CompositionalSynthesisEngine();
