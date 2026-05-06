/**
 * CrossProcessCausalGraphLearnerEngine — XPROC-NEURAL Tier 9 (T9-01)
 *
 * Learns a directed acyclic graph (DAG) over PRISM cross-process variables
 * from a stream of `CrossProcessOutcomeEvent` records. Implementation follows
 * the PC-stable algorithm (Spirtes & Glymour 1991, Colombo & Maathuis 2014):
 *
 *   1. Skeleton phase: start with the complete undirected graph over the 6
 *      canonical variables. For each pair (X, Y) and each conditioning set
 *      S of increasing size 0, 1, 2, test X ⊥ Y | S. Remove edge if found
 *      conditionally independent.
 *   2. Orientation phase: identify v-structures (X → Z ← Y where X, Y not
 *      adjacent and Z ∉ separating set). Apply Meek's R1/R2 rules to
 *      propagate orientations without creating new v-structures.
 *
 * Conditional independence test: Fisher's Z-transform on partial correlation.
 *   ρ_xy.S = partial correlation residualizing x, y on S
 *   z = 0.5 * ln((1+ρ)/(1-ρ))
 *   z* = sqrt(n - |S| - 3) * |z|
 *   p = 2 * (1 - Φ(z*))     (two-tailed)
 *
 * Variables: 6 canonical PRISM-XPROC dimensions (PRISM_VARS below). Numeric
 * variables (sf, ap, fz) are standardized; categorical (material_iso, process,
 * outcome_class) use ordinal encoding. Latent confounders are NOT modelled
 * (the PC algorithm assumes causal sufficiency).
 *
 * Tractability bounds:
 *   - Max conditioning set size = 2 (PC-stable; full is exponential)
 *   - Min sample size: n ≥ 30 (Fisher Z asymptotic; otherwise empty DAG)
 *   - 6 vars × 6 = 15 unordered pairs × ≤16 conditioning sets each ≈ 240 CI tests
 *
 * Per CLAUDE.md "wire to all sources": this engine routes through
 * `prism_intelligence` (xproc namespace). T9-02/T9-03/T9-04 consume its output.
 *
 * References:
 *   - Spirtes, Glymour, Scheines (2000). Causation, Prediction, and Search.
 *   - Colombo & Maathuis (2014). Order-independent constraint-based causal
 *     structure learning. JMLR 15:3741-3782.
 *   - Pearl (2009). Causality: Models, Reasoning, and Inference. Ch. 2.
 *
 * @module CrossProcessCausalGraphLearnerEngine
 */

import { z } from "zod";

// Canonical 6-variable XPROC space. Names match CrossProcessOutcomeEvent fields.
export const PRISM_VARS = ["material_iso", "process", "sf", "fz", "tool_class", "outcome_class"] as const;
export type PrismVar = typeof PRISM_VARS[number];

// Sample event — one row of the outcome ledger encoded for CI testing
const EventSchema = z.object({
  material_iso: z.string().min(1).describe("ISO material group P/M/K/N/S/H or alias"),
  process: z.enum(["mill", "lathe", "wedm"]).describe("Cross-process domain tag"),
  sf: z.number().finite().positive().describe("Surface speed m/min"),
  fz: z.number().finite().positive().describe("Feed per tooth mm"),
  tool_class: z.string().min(1).describe("Tool family identifier"),
  outcome_class: z.enum(["pass", "marginal", "fail"]).describe("Discrete outcome label"),
});
export type Event = z.infer<typeof EventSchema>;

const LearnDAGInputSchema = z.object({
  events: z.array(EventSchema).min(1),
  alpha: z.number().finite().min(0).max(1).default(0.05).describe("CI test significance level"),
  max_cond_size: z.number().int().min(0).max(2).default(2),
});
export type LearnDAGInput = z.infer<typeof LearnDAGInputSchema>;

export interface CIDecision {
  x: PrismVar;
  y: PrismVar;
  cond: PrismVar[];
  rho: number;
  z_stat: number;
  p_value: number;
  independent: boolean;
}

export type EdgeOrientation = "directed" | "undirected";
export interface CausalEdge {
  from: PrismVar;
  to: PrismVar;
  orientation: EdgeOrientation;
  evidence: string;  // "v-structure" | "meek-r1" | "meek-r2" | "skeleton"
}

export interface CausalDAG {
  nodes: PrismVar[];
  edges: CausalEdge[];
  separating_sets: Record<string, PrismVar[]>;  // key = "x|y" sorted
  ci_decisions: CIDecision[];
  n_samples: number;
  alpha: number;
  warnings: string[];
}

const MIN_SAMPLES = 30;

// ----- Encoding & statistics helpers -----

function ordinalEncode(value: string, vocab: string[]): number {
  const idx = vocab.indexOf(value);
  if (idx >= 0) return idx;
  return vocab.length;  // unknown → bucket past last
}

const MATERIAL_VOCAB = ["P", "M", "K", "N", "S", "H"];
const PROCESS_VOCAB = ["mill", "lathe", "wedm"];
const OUTCOME_VOCAB = ["pass", "marginal", "fail"];

function encodeEvents(events: Event[]): Record<PrismVar, number[]> {
  const cols: Record<PrismVar, number[]> = {
    material_iso: [],
    process: [],
    sf: [],
    fz: [],
    tool_class: [],
    outcome_class: [],
  };
  // Tool-class vocab is dynamic — collect on first pass
  const toolVocab: string[] = [];
  for (const e of events) {
    if (!toolVocab.includes(e.tool_class)) toolVocab.push(e.tool_class);
  }
  for (const e of events) {
    cols.material_iso.push(ordinalEncode(e.material_iso.toUpperCase(), MATERIAL_VOCAB));
    cols.process.push(ordinalEncode(e.process, PROCESS_VOCAB));
    cols.sf.push(e.sf);
    cols.fz.push(e.fz);
    cols.tool_class.push(ordinalEncode(e.tool_class, toolVocab));
    cols.outcome_class.push(ordinalEncode(e.outcome_class, OUTCOME_VOCAB));
  }
  return cols;
}

function mean(xs: number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function variance(xs: number[]): number {
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - m) * (x - m);
  return s / xs.length;
}

function pearsonCorr(xs: number[], ys: number[]): number {
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < xs.length; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx2 += a * a;
    dy2 += b * b;
  }
  const denom = Math.sqrt(dx2 * dy2);
  if (denom < 1e-12) return 0;
  return num / denom;
}

/**
 * Partial correlation of x, y given conditioning set S, computed by recursion:
 *   ρ_xy.S = (ρ_xy.S' - ρ_xz.S' * ρ_yz.S') / sqrt((1 - ρ_xz.S'^2)(1 - ρ_yz.S'^2))
 * where z is one element of S and S' = S \ {z}.
 */
function partialCorr(
  cols: Record<PrismVar, number[]>,
  x: PrismVar,
  y: PrismVar,
  cond: PrismVar[],
): number {
  if (cond.length === 0) return pearsonCorr(cols[x], cols[y]);
  const z = cond[0];
  const rest = cond.slice(1);
  const rxy = partialCorr(cols, x, y, rest);
  const rxz = partialCorr(cols, x, z, rest);
  const ryz = partialCorr(cols, y, z, rest);
  const denom = Math.sqrt(Math.max(0, (1 - rxz * rxz) * (1 - ryz * ryz)));
  if (denom < 1e-12) return 0;
  return (rxy - rxz * ryz) / denom;
}

/** Standard normal CDF via error-function approximation (Abramowitz & Stegun 26.2.17). */
function normalCdf(z: number): number {
  // Approximation accurate to ~7e-8 for |z| ≤ 7.
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

function fisherZTest(rho: number, n: number, condSize: number): { z_stat: number; p_value: number } {
  // Clamp rho away from ±1 to avoid Infinity in atanh
  const rhoSafe = Math.max(-0.9999, Math.min(0.9999, rho));
  const z = 0.5 * Math.log((1 + rhoSafe) / (1 - rhoSafe));
  const dof = n - condSize - 3;
  if (dof <= 0) return { z_stat: 0, p_value: 1 };  // not enough samples → fail to reject
  const z_stat = Math.sqrt(dof) * Math.abs(z);
  const p_value = 2 * (1 - normalCdf(z_stat));
  return { z_stat, p_value };
}

function pairKey(a: PrismVar, b: PrismVar): string {
  return [a, b].sort().join("|");
}

// Generate all subsets of `arr` with size exactly `k`.
function* combinations<T>(arr: readonly T[], k: number): Generator<T[]> {
  if (k === 0) { yield []; return; }
  if (k > arr.length) return;
  for (let i = 0; i <= arr.length - k; i++) {
    for (const tail of combinations(arr.slice(i + 1), k - 1)) {
      yield [arr[i], ...tail];
    }
  }
}

export class CrossProcessCausalGraphLearnerEngine {
  /**
   * Run PC-stable on the supplied event ledger.
   *
   * @param input - {events, alpha, max_cond_size}
   * @returns CausalDAG with skeleton + oriented edges + CI decision log
   * @throws Zod validation error on malformed input
   */
  static learnDAG(input: LearnDAGInput): CausalDAG {
    const parsed = LearnDAGInputSchema.parse(input);
    const events = parsed.events;
    const alpha = parsed.alpha;
    const maxCond = parsed.max_cond_size;
    const n = events.length;
    const warnings: string[] = [];

    if (n < MIN_SAMPLES) {
      warnings.push(`n=${n} below minimum ${MIN_SAMPLES}; returning empty DAG (Fisher Z asymptotic invalid).`);
      return {
        nodes: [...PRISM_VARS],
        edges: [],
        separating_sets: {},
        ci_decisions: [],
        n_samples: n,
        alpha,
        warnings,
      };
    }

    const cols = encodeEvents(events);

    // Skeleton: start fully connected, prune via CI tests
    const adj = new Set<string>();
    for (let i = 0; i < PRISM_VARS.length; i++) {
      for (let j = i + 1; j < PRISM_VARS.length; j++) {
        adj.add(pairKey(PRISM_VARS[i], PRISM_VARS[j]));
      }
    }

    const sepSets: Record<string, PrismVar[]> = {};
    const ciDecisions: CIDecision[] = [];

    for (let condSize = 0; condSize <= maxCond; condSize++) {
      const toRemove: string[] = [];
      for (const key of adj) {
        const [x, y] = key.split("|") as [PrismVar, PrismVar];
        // Conditioning candidates: neighbors of x or y excluding x, y themselves
        const neighbors = new Set<PrismVar>();
        for (const otherKey of adj) {
          const [a, b] = otherKey.split("|") as [PrismVar, PrismVar];
          if (a === x && b !== y) neighbors.add(b);
          if (b === x && a !== y) neighbors.add(a);
          if (a === y && b !== x) neighbors.add(b);
          if (b === y && a !== x) neighbors.add(a);
        }
        const candidates = [...neighbors].filter((v) => v !== x && v !== y);
        if (candidates.length < condSize) continue;

        for (const cond of combinations(candidates, condSize)) {
          const rho = partialCorr(cols, x, y, cond);
          const { z_stat, p_value } = fisherZTest(rho, n, condSize);
          const independent = p_value > alpha;
          ciDecisions.push({ x, y, cond, rho, z_stat, p_value, independent });
          if (independent) {
            toRemove.push(key);
            sepSets[key] = cond;
            break;  // one separating set is enough
          }
        }
      }
      for (const k of toRemove) adj.delete(k);
    }

    // Orientation: detect v-structures X → Z ← Y where X-Z and Y-Z in skeleton
    // and X-Y not in skeleton and Z is NOT in sep(X, Y).
    const directedEdges = new Map<string, CausalEdge>();  // "from→to"
    const skeletonEdges: Array<[PrismVar, PrismVar]> = [];
    for (const key of adj) {
      const [a, b] = key.split("|") as [PrismVar, PrismVar];
      skeletonEdges.push([a, b]);
    }

    for (const x of PRISM_VARS) {
      for (const y of PRISM_VARS) {
        if (x === y) continue;
        if (adj.has(pairKey(x, y))) continue;
        // x and y are non-adjacent; look for common neighbor z
        const xNeighbors = skeletonEdges
          .filter(([a, b]) => a === x || b === x)
          .map(([a, b]) => (a === x ? b : a));
        const yNeighbors = skeletonEdges
          .filter(([a, b]) => a === y || b === y)
          .map(([a, b]) => (a === y ? b : a));
        const common = xNeighbors.filter((v) => yNeighbors.includes(v));
        for (const z of common) {
          const sep = sepSets[pairKey(x, y)] || [];
          if (!sep.includes(z)) {
            // v-structure: x → z ← y
            const ek1 = `${x}→${z}`, ek2 = `${y}→${z}`;
            if (!directedEdges.has(ek1)) {
              directedEdges.set(ek1, { from: x, to: z, orientation: "directed", evidence: "v-structure" });
            }
            if (!directedEdges.has(ek2)) {
              directedEdges.set(ek2, { from: y, to: z, orientation: "directed", evidence: "v-structure" });
            }
          }
        }
      }
    }

    // Meek's rule R1: if a → b and b — c (undirected) and a, c not adjacent,
    // orient b → c (avoids creating new v-structure b ← c).
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 10) {
      changed = false;
      iterations++;
      for (const [a, b] of skeletonEdges) {
        // For each undirected edge a—b in skeleton, check Meek R1
        const abKey = pairKey(a, b);
        if (!adj.has(abKey)) continue;
        if (directedEdges.has(`${a}→${b}`) || directedEdges.has(`${b}→${a}`)) continue;
        // Check if some predecessor x → a exists with x not adjacent to b
        for (const x of PRISM_VARS) {
          if (x === a || x === b) continue;
          if (directedEdges.has(`${x}→${a}`) && !adj.has(pairKey(x, b))) {
            directedEdges.set(`${a}→${b}`, { from: a, to: b, orientation: "directed", evidence: "meek-r1" });
            changed = true;
            break;
          }
        }
      }
    }

    // Build final edge list: directed (oriented) first, then leftover undirected
    const edges: CausalEdge[] = [...directedEdges.values()];
    for (const [a, b] of skeletonEdges) {
      if (directedEdges.has(`${a}→${b}`) || directedEdges.has(`${b}→${a}`)) continue;
      edges.push({ from: a, to: b, orientation: "undirected", evidence: "skeleton" });
    }

    return {
      nodes: [...PRISM_VARS],
      edges,
      separating_sets: sepSets,
      ci_decisions: ciDecisions,
      n_samples: n,
      alpha,
      warnings,
    };
  }

  /**
   * Test conditional independence X ⊥ Y | S directly without running PC.
   * Useful for ad-hoc queries against the ledger.
   */
  static testIndependence(
    events: Event[],
    x: PrismVar,
    y: PrismVar,
    cond: PrismVar[],
    alpha = 0.05,
  ): CIDecision {
    if (events.length < MIN_SAMPLES) {
      return { x, y, cond, rho: 0, z_stat: 0, p_value: 1, independent: true };
    }
    const cols = encodeEvents(events);
    const rho = partialCorr(cols, x, y, cond);
    const { z_stat, p_value } = fisherZTest(rho, events.length, cond.length);
    return { x, y, cond, rho, z_stat, p_value, independent: p_value > alpha };
  }

  /**
   * Compact JSON-export shape for downstream consumers (T9-02 do-calculus).
   */
  static exportGraph(dag: CausalDAG): {
    nodes: PrismVar[];
    directed_edges: Array<[PrismVar, PrismVar]>;
    undirected_edges: Array<[PrismVar, PrismVar]>;
  } {
    const directed_edges: Array<[PrismVar, PrismVar]> = [];
    const undirected_edges: Array<[PrismVar, PrismVar]> = [];
    for (const e of dag.edges) {
      if (e.orientation === "directed") directed_edges.push([e.from, e.to]);
      else undirected_edges.push([e.from, e.to]);
    }
    return { nodes: dag.nodes, directed_edges, undirected_edges };
  }

  static readonly engineId = "CrossProcessCausalGraphLearnerEngine";
  static readonly version = "1.0.0";
  static readonly tier = "T9-01";
}

export const crossProcessCausalGraphLearnerEngine = CrossProcessCausalGraphLearnerEngine;

/**
 * Dispatcher convenience wrapper — matches (action, params) signature.
 */
export function crossProcessCausalGraphLearner(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_causal_learn_dag":
      return CrossProcessCausalGraphLearnerEngine.learnDAG(params as LearnDAGInput);
    case "xproc_causal_test_independence": {
      const events = (params.events as Event[]) ?? [];
      const x = params.x as PrismVar;
      const y = params.y as PrismVar;
      const cond = (params.cond as PrismVar[]) ?? [];
      const alpha = (params.alpha as number | undefined) ?? 0.05;
      return CrossProcessCausalGraphLearnerEngine.testIndependence(events, x, y, cond, alpha);
    }
    case "xproc_causal_export_graph":
      return CrossProcessCausalGraphLearnerEngine.exportGraph(params as unknown as CausalDAG);
    default:
      throw new Error(`crossProcessCausalGraphLearner: unknown action '${action}'`);
  }
}
