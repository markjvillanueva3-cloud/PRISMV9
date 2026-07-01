/**
 * HeterophilyAwareAggregator — H2GCN-style ego/neighbor-separated, higher-order
 * graph feature aggregation for learning on HETEROPHILOUS graphs.
 *
 * On a *homophilous* graph (connected nodes share labels), vanilla GCN/GraphSAGE
 * works because mixing a node's own features with the mean of its neighbours is a
 * good prior. PRISM's wiring graph is the opposite — an `engine` node connects to
 * a `dispatcher` node of a *different* type; an `unwired-engine` ghost connects to
 * the dispatcher it *should* attach to. Connected nodes have DIFFERENT labels.
 * Under that heterophily, blending ego+neighbour features destroys signal — the
 * exact failure behind the deferred NN/GNN PSN leg (link-pred AUROC ≈ 0.096,
 * an anti-correlation; see CLAUDE.md §NN-GRAPH-MS2 / NN-1).
 *
 * This algorithm implements the two load-bearing ideas of H2GCN
 * (Zhu et al. 2020, "Beyond Homophily in Graph Neural Networks") as a pure,
 * deterministic feature-transform primitive — NO learned weights (the learned
 * linear layer is applied downstream by the GNN; this is the AGGREGATION step):
 *
 *   1. **Ego / neighbour separation** — a node's own features are kept in their
 *      own block and NEVER averaged into the neighbour aggregation. The output is
 *      a CONCATENATION, not a blend.
 *   2. **Higher-order neighbourhoods** — features are aggregated separately over
 *      *exactly*-k-hop neighbourhoods (shortest-path distance == k, disjoint by
 *      distance), for k = 1..maxHops. On heterophilous graphs the 2-hop
 *      neighbourhood is frequently homophilous even when the 1-hop is not, so the
 *      2-hop block recovers signal the 1-hop block lacks.
 *
 * Output per node i (with d-dim input features, maxHops = H):
 *
 *     z_i = [ x_i ‖ agg(N₁(i)) ‖ agg(N₂(i)) ‖ … ‖ agg(N_H(i)) ]   ∈ ℝ^{d·(1+H)}
 *
 * where N_k(i) is the set of nodes at shortest-path distance exactly k and
 * agg is mean (default) or sum. Isolated hops contribute a zero block (and are
 * surfaced in `isolatedNodes` / per-node `hopNeighborCounts` — never silent).
 *
 * Why PRISM needs it: feeding `z` (instead of plain `x`) into the GraphSAGE
 * link-prediction pipeline (`scripts/lib/graphsage-train-pipeline.mjs`, india's
 * ai-training galaxy) is the documented model-side lever to lift AUROC past the
 * 0.78 deploy gate on the heterophilous SystemViz wiring graph — unblocking PSN
 * leg #10 and the GNN tier-5 ghost-node→dispatcher classifier (sierra's graph).
 *
 * Why NEW (master-index + grep, 2026-05-29): no heterophily / H2GCN / ego-neighbor
 * primitive exists in the 115-file algorithms/ directory. The string "heterophily"
 * appears only in ai-training/{CLAUDE,MEMORY}.md as a named-but-unbuilt lever.
 *
 * @module algorithms/HeterophilyAwareAggregator
 * @see ALGO-SYNERGY (slot:tango, 2026-05-29) — algorithm generation goal
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
} from "./types.js";

// ─── I/O types ─────────────────────────────────────────────────────

export interface HeterophilyAggInput {
  /** n × d node feature matrix (rectangular, all finite). */
  features: number[][];
  /** Undirected edges as [u, v] node-index pairs (0-based). */
  edges: Array<[number, number]>;
  /** Highest neighbourhood order to aggregate (default 2). Each adds one d-block. */
  maxHops?: number;
  /** Neighbour aggregation: "mean" (default) or "sum". */
  normalize?: "mean" | "sum";
}

export interface HeterophilyAggOutput {
  /** n × d·(1+maxHops) embedding: [ego ‖ hop1 ‖ … ‖ hopH]. */
  embeddings: number[][];
  /** Total embedding width = egoDim · (1 + maxHops). */
  embeddingDim: number;
  /** Input feature dimension d. */
  egoDim: number;
  /** Effective maxHops used. */
  maxHops: number;
  /** Aggregation mode used. */
  normalize: "mean" | "sum";
  /** Per-node neighbour count at each hop 1..maxHops (diagnostics). */
  hopNeighborCounts: number[][];
  /** Node indices with zero 1-hop neighbours (ego-only embedding). */
  isolatedNodes: number[];
  /** Non-fatal warnings (self-loops dropped, duplicate edges, large maxHops…). */
  warnings: string[];
}

const DEFAULT_MAX_HOPS = 2;
const MAX_REASONABLE_HOPS = 16;

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/**
 * Build an undirected adjacency list from edges, deduping, dropping self-loops,
 * and collecting warnings. Edge indices are assumed pre-validated.
 */
function buildAdjacency(
  n: number,
  edges: Array<[number, number]>,
  warnings: string[],
): Array<Set<number>> {
  const adj: Array<Set<number>> = Array.from({ length: n }, () => new Set<number>());
  let selfLoops = 0;
  for (const [u, v] of edges) {
    if (u === v) {
      selfLoops++;
      continue;
    }
    adj[u].add(v);
    adj[v].add(u);
  }
  if (selfLoops > 0) {
    warnings.push(`Dropped ${selfLoops} self-loop edge(s) — not meaningful for neighbourhood aggregation.`);
  }
  return adj;
}

/**
 * BFS from `src` bucketing reachable nodes by shortest-path distance,
 * capped at maxHops. Returns hops[k] = node indices at exactly distance k+1.
 */
function hopBuckets(adj: Array<Set<number>>, src: number, maxHops: number): number[][] {
  const dist = new Int32Array(adj.length).fill(-1);
  dist[src] = 0;
  const buckets: number[][] = Array.from({ length: maxHops }, () => []);
  let frontier = [src];
  for (let h = 1; h <= maxHops && frontier.length > 0; h++) {
    const next: number[] = [];
    for (const u of frontier) {
      for (const w of adj[u]) {
        if (dist[w] === -1) {
          dist[w] = h;
          buckets[h - 1].push(w);
          next.push(w);
        }
      }
    }
    frontier = next;
  }
  return buckets;
}

export const HeterophilyAwareAggregator: Algorithm<HeterophilyAggInput, HeterophilyAggOutput> = {
  validate(input: HeterophilyAggInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    const { features, edges } = input ?? ({} as HeterophilyAggInput);

    if (!Array.isArray(features) || features.length === 0) {
      issues.push({ field: "features", message: "features must be a non-empty n×d matrix.", severity: "error" });
    } else {
      const d = Array.isArray(features[0]) ? features[0].length : -1;
      if (d < 1) {
        issues.push({ field: "features", message: "feature rows must have dimension ≥ 1.", severity: "error" });
      }
      for (let i = 0; i < features.length; i++) {
        const row = features[i];
        if (!Array.isArray(row) || row.length !== d) {
          issues.push({ field: `features[${i}]`, message: `ragged matrix: row ${i} length ${row?.length} ≠ ${d}.`, severity: "error" });
          break;
        }
        for (let j = 0; j < row.length; j++) {
          if (!isFiniteNumber(row[j])) {
            issues.push({ field: `features[${i}][${j}]`, message: "feature values must be finite (no NaN/Infinity).", severity: "error" });
            break;
          }
        }
      }
    }

    const n = Array.isArray(features) ? features.length : 0;
    if (!Array.isArray(edges)) {
      issues.push({ field: "edges", message: "edges must be an array of [u,v] pairs.", severity: "error" });
    } else {
      for (let e = 0; e < edges.length; e++) {
        const pair = edges[e];
        if (!Array.isArray(pair) || pair.length !== 2 || !Number.isInteger(pair[0]) || !Number.isInteger(pair[1])) {
          issues.push({ field: `edges[${e}]`, message: "each edge must be a [int,int] pair.", severity: "error" });
          break;
        }
        if (pair[0] < 0 || pair[0] >= n || pair[1] < 0 || pair[1] >= n) {
          issues.push({ field: `edges[${e}]`, message: `edge index out of range [0,${n}).`, severity: "error" });
          break;
        }
      }
    }

    if (input?.maxHops !== undefined) {
      if (!Number.isInteger(input.maxHops) || input.maxHops < 1) {
        issues.push({ field: "maxHops", message: "maxHops must be an integer ≥ 1.", severity: "error" });
      } else if (input.maxHops > MAX_REASONABLE_HOPS) {
        issues.push({ field: "maxHops", message: `maxHops ${input.maxHops} > ${MAX_REASONABLE_HOPS}; embedding width grows linearly — confirm intent.`, severity: "warning" });
      }
    }
    if (input?.normalize !== undefined && input.normalize !== "mean" && input.normalize !== "sum") {
      issues.push({ field: "normalize", message: 'normalize must be "mean" or "sum".', severity: "error" });
    }

    const errors = issues.filter((i) => i.severity === "error").map((i) => i.message);
    const warnings = issues.filter((i) => i.severity === "warning").map((i) => i.message);
    return { valid: errors.length === 0, errors, warnings, issues };
  },

  calculate(input: HeterophilyAggInput): HeterophilyAggOutput {
    const v = this.validate(input);
    if (!v.valid) {
      throw new Error(`HeterophilyAwareAggregator: invalid input — ${(v.errors ?? []).join("; ")}`);
    }
    const warnings: string[] = [...(v.warnings ?? [])];
    const features = input.features;
    const n = features.length;
    const d = features[0].length;
    const maxHops = input.maxHops ?? DEFAULT_MAX_HOPS;
    const normalize = input.normalize ?? "mean";

    // Dedup count for warning (Set-based adjacency dedups silently otherwise).
    const seen = new Set<string>();
    let dupes = 0;
    for (const [u, w] of input.edges) {
      if (u === w) continue;
      const key = u < w ? `${u}-${w}` : `${w}-${u}`;
      if (seen.has(key)) dupes++;
      else seen.add(key);
    }
    if (dupes > 0) warnings.push(`Deduplicated ${dupes} duplicate undirected edge(s).`);

    const adj = buildAdjacency(n, input.edges, warnings);
    const embeddingDim = d * (1 + maxHops);
    const embeddings: number[][] = [];
    const hopNeighborCounts: number[][] = [];
    const isolatedNodes: number[] = [];

    for (let i = 0; i < n; i++) {
      const buckets = hopBuckets(adj, i, maxHops);
      const z = new Array<number>(embeddingDim).fill(0);
      // ego block — kept SEPARATE, never blended.
      for (let j = 0; j < d; j++) z[j] = features[i][j];

      const counts: number[] = [];
      for (let h = 0; h < maxHops; h++) {
        const bucket = buckets[h];
        counts.push(bucket.length);
        const base = d * (h + 1);
        if (bucket.length === 0) continue; // zero block (already filled)
        for (const nb of bucket) {
          const row = features[nb];
          for (let j = 0; j < d; j++) z[base + j] += row[j];
        }
        if (normalize === "mean") {
          for (let j = 0; j < d; j++) z[base + j] /= bucket.length;
        }
      }
      if (counts[0] === 0) isolatedNodes.push(i);
      embeddings.push(z);
      hopNeighborCounts.push(counts);
    }

    if (isolatedNodes.length > 0) {
      warnings.push(`${isolatedNodes.length} node(s) have no 1-hop neighbour — ego-only embedding (zero neighbourhood blocks).`);
    }

    return {
      embeddings,
      embeddingDim,
      egoDim: d,
      maxHops,
      normalize,
      hopNeighborCounts,
      isolatedNodes,
      warnings,
    };
  },

  getMetadata(): AlgorithmMeta {
    return {
      id: "heterophily_aware_aggregator",
      name: "Heterophily-Aware Aggregator (H2GCN-style)",
      version: "1.0.0",
      domain: "ml",
      category: "graph-representation",
      description:
        "Ego/neighbour-separated, higher-order (exactly-k-hop) graph feature aggregation for learning on heterophilous graphs. Pure deterministic feature-transform primitive (no learned weights) — feeds richer node embeddings into a downstream GNN to recover signal that ego+neighbour blending destroys under heterophily.",
      equation_plain: "z_i = [ x_i || agg(N_1(i)) || agg(N_2(i)) || ... || agg(N_H(i)) ], agg = mean|sum over exactly-k-hop neighbours",
      assumptions: [
        "Undirected graph (edges symmetrised).",
        "Node features are dense and comparable across nodes.",
        "Heterophily benefits from disjoint-by-distance neighbourhoods and ego separation.",
      ],
      limitations: [
        "Per-node BFS is O(n·(V+E)); intended for graph sizes the caller manages, not the full 370MB system-graph in one shot — batch or subgraph first.",
        "Embedding width grows linearly with maxHops (d·(1+maxHops)).",
        "Aggregation only — the learned transform is applied downstream by the GNN.",
      ],
      reference:
        "Zhu, J., Yan, Y., Zhao, L., Heimann, M., Akoglu, L., Koutra, D. (2020). Beyond Homophily in Graph Neural Networks: Current Limitations and Effective Designs. NeurIPS 2020.",
      inputs: {
        features: { type: "number[][]", description: "n×d node feature matrix" },
        edges: { type: "[number,number][]", description: "undirected edge index pairs" },
        maxHops: { type: "number", description: "highest neighbourhood order (default 2)" },
        normalize: { type: '"mean"|"sum"', description: "neighbour aggregation mode" },
      },
      outputs: {
        embeddings: { type: "number[][]", description: "n × d·(1+maxHops) concatenated embedding" },
        isolatedNodes: { type: "number[]", description: "nodes with no 1-hop neighbour" },
      },
      last_validated: "2026-05-29",
    };
  },
};
