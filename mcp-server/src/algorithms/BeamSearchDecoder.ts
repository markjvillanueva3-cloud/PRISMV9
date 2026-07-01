/**
 * BeamSearchDecoder — approximate n-best sequence decoding over a log-probability
 * trellis (the standard decoder for language models / structured-prediction).
 *
 * Given per-step emission log-probs and an optional first-order transition model,
 * beam search keeps only the top-B partial sequences at each step:
 *
 *   step 0:  score(v)        = initial[v]  + emissions[0][v]
 *   step t:  score(seq·v)    = score(seq)  + transition[last][v] + emissions[t][v]
 *            → keep the B highest-scoring partials, advance
 *   end:     return the top-K complete sequences by cumulative log-score
 *
 * Relationship to the exact `ViterbiDecoder` shipped this milestone (same matrix
 * inputs, deliberately): Viterbi returns THE single MAP path in O(T·V²); beam
 * returns the top-K (n-best) paths in O(T·B·V). For B ≥ V beam is exact and equals
 * Viterbi's best as its #1; for B < V it trades a small optimality risk for
 * cost/scale — the regime that matters when V is large (vocab-sized decoding,
 * deep-reasoning hypothesis enumeration, diverse-candidate generation). Returning
 * the *top-K* (not just the best) is the feature Viterbi can't give: downstream
 * re-ranking, beam diversity, and uncertainty over alternatives.
 *
 * Matrix-formulated (no closure inputs) so it is fully `prism_algorithm`-wireable,
 * unlike a successor-function beam search.
 *
 * Why NEW (grep 2026-05-29): no beam-search / n-best decoder exists in the
 * algorithms/ directory; `ml_viterbi` is exact single-path only.
 *
 * @module algorithms/BeamSearchDecoder
 * @see ALGO-SYNERGY (slot:tango, 2026-05-29) — n-best sequence decoding
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
} from "./types.js";

export interface BeamSearchInput {
  /** Emission log-probabilities [T × V]: emissions[t][v] = log P(observe token v at step t). */
  emissions: number[][];
  /** First-order transition log-probs [V × V]: transition[i][j] = log P(j follows i). Default 0 (independent steps). */
  transition?: number[][];
  /** Prior log-probs for the first token [V]. Default 0 (uniform). */
  initial?: number[];
  /** Beam width B (≥1): number of partial hypotheses kept per step. */
  beamWidth: number;
  /** How many complete sequences to return (default = beamWidth, capped at what survives). */
  topK?: number;
}

export interface BeamSearchOutput {
  /** Top-K decoded sequences (each an array of token indices, length T), best first. */
  sequences: number[][];
  /** Cumulative log-score of each returned sequence, descending. */
  scores: number[];
  beamWidth: number;
  topK: number;
  steps: number;
  vocabSize: number;
  /** True when B ≥ V at every step (beam is then exact: #1 equals the Viterbi MAP path). */
  exact: boolean;
  warnings: string[];
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}
function isMatrix(m: unknown): m is number[][] {
  if (!Array.isArray(m) || m.length === 0 || !Array.isArray(m[0])) return false;
  const d = (m[0] as unknown[]).length;
  return d >= 1 && (m as unknown[][]).every((r) => Array.isArray(r) && r.length === d);
}

interface Beam { seq: number[]; score: number; last: number; }

/** Keep the top-n beams by score (partial selection, descending). */
function topBeams(beams: Beam[], n: number): Beam[] {
  beams.sort((a, b) => b.score - a.score);
  return beams.slice(0, n);
}

export const BeamSearchDecoder: Algorithm<BeamSearchInput, BeamSearchOutput> = {
  validate(input: BeamSearchInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    const { emissions, beamWidth } = input ?? ({} as BeamSearchInput);

    if (!isMatrix(emissions)) {
      issues.push({ field: "emissions", message: "emissions must be a non-empty [T × V] matrix (all rows same length).", severity: "error" });
    } else {
      const V = emissions[0].length;
      for (let t = 0; t < emissions.length; t++) {
        for (let v = 0; v < emissions[t].length; v++) {
          if (!isFiniteNumber(emissions[t][v])) {
            issues.push({ field: `emissions[${t}][${v}]`, message: "emission log-probs must be finite.", severity: "error" });
            break;
          }
        }
      }
      if (input?.transition !== undefined) {
        const tr = input.transition;
        const okShape = Array.isArray(tr) && tr.length === V && tr.every((r) => Array.isArray(r) && r.length === V && r.every(isFiniteNumber));
        if (!okShape) issues.push({ field: "transition", message: `transition must be a finite [V × V] matrix (V=${V}).`, severity: "error" });
      }
      if (input?.initial !== undefined) {
        const init = input.initial;
        if (!Array.isArray(init) || init.length !== V || !init.every(isFiniteNumber)) {
          issues.push({ field: "initial", message: `initial must be a finite array of length V=${V}.`, severity: "error" });
        }
      }
    }
    if (!Number.isInteger(beamWidth) || beamWidth < 1) {
      issues.push({ field: "beamWidth", message: "beamWidth must be an integer ≥ 1.", severity: "error" });
    }
    if (input?.topK !== undefined && (!Number.isInteger(input.topK) || input.topK < 1)) {
      issues.push({ field: "topK", message: "topK must be an integer ≥ 1.", severity: "error" });
    }

    const errors = issues.filter((i) => i.severity === "error").map((i) => i.message);
    const warnings = issues.filter((i) => i.severity === "warning").map((i) => i.message);
    return { valid: errors.length === 0, errors, warnings, issues };
  },

  calculate(input: BeamSearchInput): BeamSearchOutput {
    const v0 = this.validate(input);
    if (!v0.valid) {
      throw new Error(`BeamSearchDecoder: invalid input — ${(v0.errors ?? []).join("; ")}`);
    }
    const warnings: string[] = [];
    const emissions = input.emissions;
    const T = emissions.length;
    const V = emissions[0].length;
    const B = input.beamWidth;
    const transition = input.transition;
    const initial = input.initial;
    const topK = Math.min(input.topK ?? B, B);

    // step 0 — seed beams from the prior + first emission
    let beams: Beam[] = [];
    for (let v = 0; v < V; v++) {
      const s = (initial ? initial[v] : 0) + emissions[0][v];
      beams.push({ seq: [v], score: s, last: v });
    }
    beams = topBeams(beams, B);

    // steps 1..T-1 — expand every beam by every token, prune to B
    for (let t = 1; t < T; t++) {
      const cand: Beam[] = [];
      for (const bm of beams) {
        for (let v = 0; v < V; v++) {
          const trS = transition ? transition[bm.last][v] : 0;
          cand.push({ seq: [...bm.seq, v], score: bm.score + trS + emissions[t][v], last: v });
        }
      }
      beams = topBeams(cand, B);
    }

    const finalBeams = topBeams(beams, topK);
    const exact = B >= V; // when the beam can hold every state, no pruning ever discards the optimum

    if (!exact) warnings.push(`beamWidth ${B} < vocabSize ${V}: decoding is approximate (top-1 may not be the global MAP path — use ViterbiDecoder / B≥V for an exact guarantee).`);
    if ((input.topK ?? B) > B) warnings.push(`topK ${input.topK} capped to beamWidth ${B} (only ${B} hypotheses survive pruning).`);

    return {
      sequences: finalBeams.map((b) => b.seq),
      scores: finalBeams.map((b) => b.score),
      beamWidth: B, topK, steps: T, vocabSize: V, exact, warnings,
    };
  },

  getMetadata(): AlgorithmMeta {
    return {
      id: "beam_search_decoder",
      name: "Beam Search Decoder (n-best)",
      version: "1.0.0",
      domain: "ml",
      category: "sequence-decoding",
      description:
        "Approximate top-K sequence decoding over an emission/transition log-prob trellis. Keeps the B best partial hypotheses per step; returns the n-best complete paths with scores. Matrix-formulated (no closures) — companion to the exact ViterbiDecoder.",
      equation_plain: "score(seq·v) = score(seq) + transition[last][v] + emissions[t][v]; keep top-B per step, return top-K",
      assumptions: [
        "First-order (Markov) transition model; additive log-scores.",
        "emissions [T×V]; transition (optional) [V×V]; initial (optional) [V].",
      ],
      limitations: [
        "Approximate for B < V — the global optimum can be pruned (use B ≥ V or ViterbiDecoder for an exact MAP guarantee).",
        "Greedy beam pruning ≠ exact n-best of the full lattice when B is small.",
      ],
      reference: "Lowerre, B. (1976). The HARPY Speech Recognition System (beam search); cf. Graves (2012) sequence transduction.",
      inputs: {
        emissions: { type: "number[][]", description: "[T×V] emission log-probs" },
        transition: { type: "number[][]", description: "[V×V] transition log-probs (optional)" },
        initial: { type: "number[]", description: "[V] first-token prior log-probs (optional)" },
        beamWidth: { type: "number", description: "beam width B (≥1)" },
        topK: { type: "number", description: "how many sequences to return (≤ B)" },
      },
      outputs: {
        sequences: { type: "number[][]", description: "top-K token-index sequences, best first" },
        scores: { type: "number[]", description: "cumulative log-scores, descending" },
        exact: { type: "boolean", description: "true when B ≥ V (decoding is exact)" },
      },
      last_validated: "2026-05-29",
    };
  },
};
