/**
 * PersonalizedPageRank — seed-biased random-walk-with-restart over a graph.
 *
 * Computes the stationary distribution of a random walker that, at each step,
 * either (with probability 1 − α) follows an out-edge uniformly at random or
 * (with probability α) teleports back to a seed distribution s. The result
 * `r ∈ ℝ^n` ranks every node by its "importance to the seed":
 *
 *     r = α · s + (1 − α) · Pᵀ · r
 *
 * where P is the row-stochastic transition matrix. Solved iteratively until
 * ‖rₖ₊₁ − rₖ‖₁ < tol.
 *
 * Properties:
 *   • Generalizes PageRank — when s is uniform (1/n everywhere), this is
 *     vanilla PageRank.
 *   • Concentrates importance near the seed — at small α (e.g., 0.15) most
 *     mass stays in the seed's neighborhood, at large α it spreads.
 *   • Converges in O(log(1/tol) / log(1/(1−α))) iterations — typically 30-60
 *     iterations for α ∈ [0.1, 0.3] and tol = 1e-6.
 *
 * Why PRISM needs it (per PSN-ALGORITHM-SCOPING-2026-05-24 §3.2 ALGO-RET-04,
 * cross-agent convergence: Agent B named it directly):
 *
 *   `/system-viz` presents ~110K nodes across 10 layers + 21 roost overlays.
 *   Today the importance metric is degree-based — same ranking regardless of
 *   what slot/task is active. Personalized PageRank seeded by the current
 *   slot-domain + task-keyword anchor nodes makes the same graph render with
 *   **slot-personalized importance** — sierra sees viz infrastructure
 *   weighted, india sees post-processor nodes weighted, etc.
 *
 *   Other consumers (all utilization:0 today):
 *     • Blast-radius weighting in `/impact` — current is unweighted BFS
 *     • Ghost-roost confidence calibration — currently degree-based
 *     • AuthorityRankingEngine — has the data, no PPR algorithm
 *     • Every SubagentStart presearch — currently BM25-only
 *
 * Why this is NEW (per master-index query 2026-05-24):
 *   No PageRank / RWR / PPR primitive exists in the 90-file algorithms/
 *   directory. AuthorityRankingEngine exists with utilization:0 — this
 *   algorithm is the math piece that engine has been missing.
 *
 * References:
 *   - Haveliwala, T. H. (2002) "Topic-sensitive PageRank." WWW 2002 — the
 *     paper that introduced personalized PageRank.
 *   - Page, L., Brin, S., Motwani, R., Winograd, T. (1998) "The PageRank
 *     Citation Ranking: Bringing Order to the Web." Stanford TR.
 *   - Andersen, R., Chung, F., Lang, K. (2006) "Local Graph Partitioning
 *     using PageRank Vectors." FOCS — the local-PPR variant.
 *
 * @module algorithms/PersonalizedPageRank
 * @since ALGO-SYNERGY-MS0 Phase 2 (2026-05-24, slot:tango)
 */

import type { Algorithm, AlgorithmMeta, ValidationResult } from "./types.js";
import { createValidationResult } from "./types.js";

// ─── Input / Output Types ──────────────────────────────────────────────

/**
 * Sparse graph: adjacency by node-id. Edge weights (if any) MUST be ≥ 0; they
 * are normalized to a row-stochastic transition matrix internally.
 */
export interface GraphInput {
  /** All node IDs (so isolated nodes are visible to the walker). */
  nodes: readonly string[];
  /**
   * Edges as a flat array of {from, to, weight?}. Weight defaults to 1.
   * Self-loops are accepted and treated as a hold-in-place transition.
   * Parallel edges are SUMMED (treated as a single weighted edge).
   */
  edges: ReadonlyArray<{
    readonly from: string;
    readonly to: string;
    readonly weight?: number;
  }>;
}

export interface PPRInput {
  graph: GraphInput;
  /**
   * Seed distribution. Either:
   *   • a list of seed node IDs (uniform mass over them), or
   *   • a Record<nodeId, weight> mapping (will be L1-normalized).
   * If omitted, defaults to uniform-over-all (= vanilla PageRank).
   */
  seed?: ReadonlyArray<string> | Readonly<Record<string, number>>;
  /**
   * Damping factor d = (1 − α). Each step the walker continues with prob d
   * and teleports with prob α. Standard PageRank uses d = 0.85 (α = 0.15).
   */
  damping?: number;
  /** Max iterations (default 200). Convergence is typically O(log(1/tol)) iters. */
  maxIter?: number;
  /** L1 convergence tolerance (default 1e-7). */
  tol?: number;
  /**
   * Top-K rank to return (default 50). The full vector is always returned in
   * `scores` — `topK` is just a convenience-sorted view for callers.
   */
  topK?: number;
}

export interface PPRRankedNode {
  id: string;
  score: number;
  rank: number; // 1-indexed, smaller = higher importance
}

export interface PPROutput {
  /** Sorted top-K nodes by score (descending). */
  topK: PPRRankedNode[];
  /** Full PPR vector keyed by node id. Sums to 1.0 (± floating-point). */
  scores: Record<string, number>;
  /** L1 norm of the final residual ‖rₖ₊₁ − rₖ‖₁. */
  residual: number;
  /** Number of iterations performed. */
  iterations: number;
  /** Convergence status. */
  status: "converged" | "max_iter";
  /** Damping used (echoed). */
  damping: number;
  /** Number of dangling (out-degree=0) nodes — their mass is redistributed via seed. */
  danglingNodes: number;
  /** Warnings (e.g., empty seed defaulted to uniform). */
  warnings: string[];
  /** ISO timestamp. */
  computed_at: string;
}

// ─── Internal representation ───────────────────────────────────────────

interface CSRMatrix {
  /** Row pointer (length n+1). row i's neighbors live in indices [rowPtr[i], rowPtr[i+1]). */
  rowPtr: Int32Array;
  /** Column indices (one per non-zero). */
  colIdx: Int32Array;
  /** Edge weights, already row-normalized (row i sums to 1 unless dangling). */
  values: Float64Array;
  /** Indices of dangling rows (rows with no out-edges). */
  dangling: number[];
}

function buildCSR(graph: GraphInput): { csr: CSRMatrix; indexOf: Map<string, number> } {
  const n = graph.nodes.length;
  const indexOf = new Map<string, number>();
  for (let i = 0; i < n; i++) indexOf.set(graph.nodes[i], i);

  // Group edges by source, summing weights for parallel edges (key = from-to).
  const outBySrc: Map<number, Map<number, number>> = new Map();
  for (const e of graph.edges) {
    const src = indexOf.get(e.from);
    const dst = indexOf.get(e.to);
    if (src === undefined || dst === undefined) continue; // silently drop
    const w = e.weight ?? 1;
    if (!(w >= 0)) continue; // negative weights ignored — caller should catch in validate
    let row = outBySrc.get(src);
    if (!row) {
      row = new Map();
      outBySrc.set(src, row);
    }
    row.set(dst, (row.get(dst) ?? 0) + w);
  }

  // Build CSR. Row i contributes the non-zeros sorted by column for cache friendliness.
  const rowPtr = new Int32Array(n + 1);
  let nnz = 0;
  for (let i = 0; i < n; i++) {
    rowPtr[i] = nnz;
    nnz += outBySrc.get(i)?.size ?? 0;
  }
  rowPtr[n] = nnz;

  const colIdx = new Int32Array(nnz);
  const values = new Float64Array(nnz);
  const dangling: number[] = [];
  for (let i = 0; i < n; i++) {
    const row = outBySrc.get(i);
    if (!row || row.size === 0) {
      dangling.push(i);
      continue;
    }
    // Row-normalize.
    let rowSum = 0;
    for (const w of row.values()) rowSum += w;
    let idx = rowPtr[i];
    const sorted = Array.from(row.entries()).sort((a, b) => a[0] - b[0]);
    for (const [col, w] of sorted) {
      colIdx[idx] = col;
      values[idx] = w / rowSum;
      idx++;
    }
  }

  return { csr: { rowPtr, colIdx, values, dangling }, indexOf };
}

/**
 * Build seed vector s ∈ ℝ^n, L1-normalized.
 * - undefined → uniform 1/n
 * - string[]  → uniform over the listed nodes
 * - Record    → L1-normalize the provided weights
 *
 * Unknown node IDs are silently dropped (warned in caller).
 */
function buildSeed(
  rawSeed: PPRInput["seed"],
  n: number,
  indexOf: Map<string, number>,
): { s: Float64Array; droppedUnknown: number; warnings: string[] } {
  const s = new Float64Array(n);
  const warnings: string[] = [];

  if (rawSeed === undefined) {
    s.fill(1 / n);
    return { s, droppedUnknown: 0, warnings };
  }

  let total = 0;
  let dropped = 0;

  if (Array.isArray(rawSeed)) {
    for (const id of rawSeed) {
      const idx = indexOf.get(id);
      if (idx === undefined) {
        dropped++;
        continue;
      }
      s[idx] = 1; // uniform-over-listed; total computed after the loop
    }
    // Compute total after the loop — duplicate IDs are idempotent (set to 1 once).
    for (let i = 0; i < n; i++) total += s[i];
  } else {
    for (const [id, w] of Object.entries(rawSeed as Record<string, number>)) {
      if (!(w >= 0)) {
        warnings.push(`seed weight for "${id}" is negative or NaN — ignored`);
        continue;
      }
      const idx = indexOf.get(id);
      if (idx === undefined) {
        dropped++;
        continue;
      }
      s[idx] += w;
      total += w;
    }
  }

  if (total <= 0) {
    warnings.push(
      "seed L1-mass is zero (all weights dropped or zero) — falling back to uniform",
    );
    s.fill(1 / n);
  } else {
    for (let i = 0; i < n; i++) s[i] /= total;
  }

  return { s, droppedUnknown: dropped, warnings };
}

// ─── Algorithm Object ──────────────────────────────────────────────────

export const PersonalizedPageRank: Algorithm<PPRInput, PPROutput> = {
  validate(input: PPRInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!input || !input.graph) {
      errors.push("input.graph is required");
      return createValidationResult(errors, warnings);
    }
    const g = input.graph;
    if (!Array.isArray(g.nodes) || g.nodes.length === 0) {
      errors.push("graph.nodes must be a non-empty array");
    }
    if (!Array.isArray(g.edges)) {
      errors.push("graph.edges must be an array");
    }

    const nodeSet = new Set(g.nodes ?? []);
    if (Array.isArray(g.edges)) {
      for (let i = 0; i < g.edges.length; i++) {
        const e = g.edges[i];
        if (!e || typeof e.from !== "string" || typeof e.to !== "string") {
          errors.push(`edges[${i}] must have string from/to`);
          continue;
        }
        if (!nodeSet.has(e.from)) {
          warnings.push(`edges[${i}].from="${e.from}" not in nodes — edge dropped`);
        }
        if (!nodeSet.has(e.to)) {
          warnings.push(`edges[${i}].to="${e.to}" not in nodes — edge dropped`);
        }
        if (e.weight !== undefined) {
          if (!Number.isFinite(e.weight)) {
            errors.push(`edges[${i}].weight is not finite (${e.weight})`);
          } else if (e.weight < 0) {
            errors.push(
              `edges[${i}].weight=${e.weight} is negative — PPR requires non-negative weights`,
            );
          }
        }
      }
    }

    if (input.damping !== undefined) {
      if (!(input.damping > 0 && input.damping < 1)) {
        errors.push(`damping must be in (0, 1) (got ${input.damping})`);
      }
    }
    if (input.maxIter !== undefined) {
      if (!Number.isInteger(input.maxIter) || input.maxIter < 1) {
        errors.push(`maxIter must be a positive integer (got ${input.maxIter})`);
      }
    }
    if (input.tol !== undefined && !(input.tol >= 0)) {
      errors.push(`tol must be >= 0 (got ${input.tol})`);
    }
    if (input.topK !== undefined) {
      if (!Number.isInteger(input.topK) || input.topK < 0) {
        errors.push(`topK must be a non-negative integer (got ${input.topK})`);
      }
    }

    return createValidationResult(errors, warnings);
  },

  calculate(input: PPRInput): PPROutput {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(
        "PersonalizedPageRank: input validation failed: " +
          (validation.errors ?? []).join("; "),
      );
    }

    const damping = input.damping ?? 0.85;
    const alpha = 1 - damping;
    const maxIter = input.maxIter ?? 200;
    const tol = input.tol ?? 1e-7;
    const topK = input.topK ?? 50;
    const warnings: string[] = [];

    const n = input.graph.nodes.length;
    const { csr, indexOf } = buildCSR(input.graph);
    const { s: seed, droppedUnknown, warnings: seedWarnings } = buildSeed(
      input.seed,
      n,
      indexOf,
    );
    warnings.push(...seedWarnings);
    if (droppedUnknown > 0) {
      warnings.push(`${droppedUnknown} seed node(s) not in graph — dropped`);
    }

    // Initialize r ← seed.
    let r = new Float64Array(seed);
    const rNext = new Float64Array(n);

    let iter = 0;
    let residual = Infinity;
    let status: PPROutput["status"] = "max_iter";

    for (; iter < maxIter; iter++) {
      rNext.fill(0);

      // Compute mass from dangling nodes (no out-edges) — they redistribute
      // their current rank uniformly via the seed teleport (standard PR trick).
      // The standard formulation absorbs dangling mass into the teleport step;
      // we accumulate dangling rank and add it as additional seed mass.
      let danglingMass = 0;
      for (const dIdx of csr.dangling) danglingMass += r[dIdx];

      // Propagate from non-dangling rows: rNext[col] += damping · r[row] · P[row][col].
      for (let row = 0; row < n; row++) {
        const ri = r[row];
        if (ri === 0) continue;
        const start = csr.rowPtr[row];
        const end = csr.rowPtr[row + 1];
        if (start === end) continue;
        const contrib = damping * ri;
        for (let k = start; k < end; k++) {
          rNext[csr.colIdx[k]] += contrib * csr.values[k];
        }
      }

      // Add teleport contribution: α · s + damping · danglingMass · s.
      const teleport = alpha + damping * danglingMass;
      for (let i = 0; i < n; i++) {
        rNext[i] += teleport * seed[i];
      }

      // L1 residual then promote rNext → r for next iteration.
      residual = 0;
      for (let i = 0; i < n; i++) {
        residual += Math.abs(rNext[i] - r[i]);
        r[i] = rNext[i];
      }

      if (residual < tol) {
        status = "converged";
        iter++;
        break;
      }
    }

    // Normalize r to sum to 1 (guard against floating-point drift).
    let sum = 0;
    for (let i = 0; i < n; i++) sum += r[i];
    if (sum > 0) {
      for (let i = 0; i < n; i++) r[i] /= sum;
    }

    // Build topK list.
    const indices = new Array<number>(n);
    for (let i = 0; i < n; i++) indices[i] = i;
    indices.sort((a, b) => r[b] - r[a]);
    const limit = Math.min(topK, n);
    const top: PPRRankedNode[] = new Array(limit);
    for (let i = 0; i < limit; i++) {
      const ni = indices[i];
      top[i] = { id: input.graph.nodes[ni], score: r[ni], rank: i + 1 };
    }

    // Build full scores map.
    const scores: Record<string, number> = {};
    for (let i = 0; i < n; i++) scores[input.graph.nodes[i]] = r[i];

    return {
      topK: top,
      scores,
      residual,
      iterations: iter,
      status,
      damping,
      danglingNodes: csr.dangling.length,
      warnings,
      computed_at: new Date().toISOString(),
    };
  },

  getMetadata(): AlgorithmMeta {
    return {
      id: "personalized_pagerank",
      name: "Personalized PageRank",
      version: "1.0.0",
      domain: "optimization",
      category: "graph_centrality",
      description:
        "Random-walk-with-restart over a directed weighted graph, biased toward " +
        "a seed distribution. Computes the stationary rank vector r = α·s + " +
        "(1-α)·Pᵀ·r via power iteration with dangling-node mass redistribution. " +
        "Used to rank graph nodes by importance-to-the-seed, generalizing " +
        "vanilla PageRank (uniform seed) to topic/slot/task-personalized search.",
      equation_plain:
        "r_{k+1} = (1-d)·s + d·(Pᵀ·r_k + dangling_mass·s)   iterate until ‖r_{k+1}−r_k‖₁ < tol",
      formula: "personalized_pagerank",
      references: [
        {
          authors: "Haveliwala, T. H.",
          title: "Topic-Sensitive PageRank",
          publication: "Proc. 11th International World Wide Web Conference",
          year: 2002,
        },
        {
          authors: "Page, L., Brin, S., Motwani, R., Winograd, T.",
          title: "The PageRank Citation Ranking: Bringing Order to the Web",
          publication: "Stanford Digital Library Technologies Project",
          year: 1998,
        },
        {
          authors: "Andersen, R., Chung, F., Lang, K.",
          title: "Local Graph Partitioning using PageRank Vectors",
          publication: "Proc. 47th Annual IEEE Symposium on Foundations of Computer Science",
          year: 2006,
        },
      ],
      assumptions: [
        "Edge weights are non-negative (negative weights have no probability interpretation)",
        "Graph is finite (n < ~10M for memory-resident operation)",
        "Convergence is monotone in L1 — guaranteed for any d ∈ (0,1) on any finite graph",
      ],
      limitations: [
        "Dense scores vector — O(n) memory per query. For very large graphs, use " +
          "the local-PPR variant (Andersen-Chung-Lang 2006) which approximates via " +
          "push operations — not yet implemented (Phase-7 candidate U-ALGO-LOCAL-PPR).",
        "Parallel edges are summed silently — caller should pre-deduplicate if " +
          "semantically distinct edges share endpoints.",
        "Self-loops are valid hold-in-place transitions — no special handling.",
      ],
      inputs: {
        graph: "GraphInput with nodes (string[]) and edges ({from, to, weight?}[])",
        seed: "seed distribution: string[] (uniform over listed) or Record<id, weight>",
        damping: "1-α teleport-back probability (default 0.85)",
        maxIter: "max power-iterations (default 200)",
        tol: "L1 convergence tolerance (default 1e-7)",
        topK: "size of the sorted topK convenience view (default 50)",
      },
      outputs: {
        topK: "top-K nodes by rank (descending), each {id, score, rank}",
        scores: "full PPR vector keyed by node id, sums to 1",
        residual: "L1 norm of the final ‖r_{k+1} − r_k‖₁",
        iterations: "iterations performed",
        status: "converged | max_iter",
        danglingNodes: "count of out-degree=0 nodes (their mass redistributes via seed)",
      },
      last_validated: "2026-05-24",
    };
  },
};

export default PersonalizedPageRank;
