/**
 * CausalReasoningEngine — Intervention-calculus over a PRISM dependency graph
 *
 * Phase 0.18 U-AGI2 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Maintains a
 * directed graph of causal edges (A causes B) with confidence weights and
 * optional polarity (positive / negative). Supports impact traces ("if A
 * changes, which nodes are affected, in what order, with what confidence?"),
 * root-cause queries, and pruning.
 *
 * Pure in-memory. Bounded traversal (default 3 hops) avoids unbounded walks.
 *
 * @module engines/CausalReasoningEngine
 * @milestone PP-0.18-U-AGI2
 */

export type Polarity = "positive" | "negative" | "unknown";

export interface CausalEdge {
  from: string;
  to: string;
  confidence: number; // 0..1
  polarity: Polarity;
  reason?: string;
}

export interface ImpactPath {
  target: string;
  hops: number;
  confidence: number; // product along the path
  polarity: Polarity;
  via: string[];
}

export interface ImpactReport {
  source: string;
  maxHops: number;
  paths: ImpactPath[];
}

export class CausalReasoningEngine {
  private readonly nodes = new Set<string>();
  private readonly edges: CausalEdge[] = [];

  addEdge(edge: CausalEdge): CausalEdge {
    this.validateEdge(edge);
    this.nodes.add(edge.from);
    this.nodes.add(edge.to);
    this.edges.push({ ...edge });
    return edge;
  }

  addEdges(edges: readonly CausalEdge[]): void {
    for (const e of edges) this.addEdge(e);
  }

  removeEdge(from: string, to: string): number {
    const before = this.edges.length;
    for (let i = this.edges.length - 1; i >= 0; i -= 1) {
      if (this.edges[i].from === from && this.edges[i].to === to) this.edges.splice(i, 1);
    }
    return before - this.edges.length;
  }

  /**
   * BFS over outgoing edges up to `maxHops`. Returns each reachable node with
   * the best (highest-confidence) path to it.
   */
  traceImpact(source: string, maxHops = 3): ImpactReport {
    if (!source || source.trim() === "") throw new Error("source required");
    if (!Number.isInteger(maxHops) || maxHops <= 0) throw new Error("maxHops must be a positive integer");

    const best = new Map<string, ImpactPath>();
    const queue: Array<{ node: string; hops: number; confidence: number; polarity: Polarity; via: string[] }> = [
      { node: source, hops: 0, confidence: 1, polarity: "positive", via: [] },
    ];

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur.hops >= maxHops) continue;
      for (const e of this.edges) {
        if (e.from !== cur.node) continue;
        const confidence = round4(cur.confidence * e.confidence);
        const polarity = combinePolarity(cur.polarity, e.polarity);
        const hops = cur.hops + 1;
        const via = [...cur.via, e.to];
        const candidate: ImpactPath = { target: e.to, hops, confidence, polarity, via };
        const existing = best.get(e.to);
        if (!existing || candidate.confidence > existing.confidence) {
          best.set(e.to, candidate);
          queue.push({ node: e.to, hops, confidence, polarity, via });
        }
      }
    }

    const paths = [...best.values()].sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return a.target.localeCompare(b.target);
    });
    return { source, maxHops, paths };
  }

  rootCauses(target: string, maxHops = 3): string[] {
    if (!target) throw new Error("target required");
    const visited = new Set<string>();
    const frontier: Array<{ node: string; hops: number }> = [{ node: target, hops: 0 }];
    const roots: string[] = [];

    while (frontier.length > 0) {
      const cur = frontier.shift()!;
      if (cur.hops > maxHops) continue;
      if (visited.has(cur.node)) continue;
      visited.add(cur.node);

      const parents = this.edges.filter((e) => e.to === cur.node);
      if (parents.length === 0 && cur.node !== target) {
        roots.push(cur.node);
        continue;
      }
      for (const p of parents) {
        frontier.push({ node: p.from, hops: cur.hops + 1 });
      }
    }
    return [...new Set(roots)].sort();
  }

  nodeCount(): number {
    return this.nodes.size;
  }

  edgeCount(): number {
    return this.edges.length;
  }

  clear(): void {
    this.nodes.clear();
    this.edges.length = 0;
  }

  // --- internals ---------------------------------------------------------

  private validateEdge(e: CausalEdge): void {
    if (!e.from || e.from.trim() === "") throw new Error("edge.from required");
    if (!e.to || e.to.trim() === "") throw new Error("edge.to required");
    if (e.from === e.to) throw new Error("self-loop not allowed");
    if (!(e.confidence >= 0 && e.confidence <= 1)) throw new Error("confidence in [0,1]");
    if (!["positive", "negative", "unknown"].includes(e.polarity)) throw new Error("polarity invalid");
  }
}

function combinePolarity(a: Polarity, b: Polarity): Polarity {
  if (a === "unknown" || b === "unknown") return "unknown";
  return a === b ? "positive" : "negative";
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export const causalReasoningEngine = new CausalReasoningEngine();
