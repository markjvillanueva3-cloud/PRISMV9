/**
 * CriticalPathDetectorEngine — U-FORE-07 (PSAU-FORESIGHT)
 * ========================================================
 *
 * Dynamic critical-path analysis over the roadmap DAG produced by
 * RoadmapDAGEngine. Computes the longest weighted path to each node
 * via topological DP, then returns the top-K schedule-critical nodes
 * plus the full path ending at each one.
 *
 * Re-entrant: call computeCriticalPath() any time the DAG changes and
 * it runs in O(V + E) over the current graph.
 */

import {
  roadmapDAGEngine,
  type RoadmapDAGEngine,
  type DAGNode,
} from "./RoadmapDAGEngine.js";

export interface CriticalPathResult {
  unitId: string;
  title: string;
  totalWeight: number;
  path: string[];
  depth: number;
}

export interface CriticalPathReport {
  topK: CriticalPathResult[];
  maxTotalWeight: number;
  totalAnalyzedNodes: number;
  computedInMs: number;
}

export class CriticalPathDetectorEngine {
  readonly name = "CriticalPathDetectorEngine";

  constructor(private readonly dag: RoadmapDAGEngine = roadmapDAGEngine) {}

  /**
   * Compute the top-K longest weighted paths through the DAG.
   *
   * @param opts.k              How many results to return (default 5).
   * @param opts.reload         Force the DAG to reload from disk first.
   * @param opts.includeCompleted  Consider completed milestones too.
   */
  computeCriticalPath(opts: { k?: number; reload?: boolean; includeCompleted?: boolean } = {}): CriticalPathReport {
    const started = Date.now();
    if (opts.reload || (opts.includeCompleted && !this.dag["loaded"])) {
      this.dag.reset();
      this.dag.load({ includeCompleted: opts.includeCompleted, forceReload: true });
    } else {
      this.dag.load({ includeCompleted: opts.includeCompleted });
    }
    const k = typeof opts.k === "number" && opts.k > 0 ? opts.k : 5;
    const nodes = this.dag.allNodes();
    if (nodes.length === 0) {
      return { topK: [], maxTotalWeight: 0, totalAnalyzedNodes: 0, computedInMs: Date.now() - started };
    }

    // Use cycle-tolerant topoSort — real roadmap data occasionally has
    // cycles from data-entry bugs; skip cycle-bound nodes rather than
    // throwing so the rest of the graph still produces a useful path.
    const { order, cycleNodes } = this.dag.topoSortPartial();
    const totalWeight = new Map<string, number>();
    const bestPredecessor = new Map<string, string | null>();

    for (const node of order) {
      let best = node.weight;
      let pred: string | null = null;
      for (const inId of node.incoming) {
        const w = (totalWeight.get(inId) ?? 0) + node.weight;
        if (w > best) {
          best = w;
          pred = inId;
        }
      }
      totalWeight.set(node.id, best);
      bestPredecessor.set(node.id, pred);
    }

    const sorted = [...nodes].sort(
      (a, b) => (totalWeight.get(b.id) ?? 0) - (totalWeight.get(a.id) ?? 0)
    );
    const picked: CriticalPathResult[] = [];
    const covered = new Set<string>();
    for (const node of sorted) {
      const path = this.reconstructPath(node.id, bestPredecessor);
      const key = path.join("|");
      if (covered.has(key)) continue;
      covered.add(key);
      picked.push({
        unitId: node.id,
        title: node.title,
        totalWeight: totalWeight.get(node.id) ?? node.weight,
        path,
        depth: path.length,
      });
      if (picked.length >= k) break;
    }

    const maxTotalWeight = picked.length > 0 ? picked[0].totalWeight : 0;
    return {
      topK: picked,
      maxTotalWeight,
      totalAnalyzedNodes: nodes.length,
      computedInMs: Date.now() - started,
    };
  }

  /**
   * List of every unit whose slip would delay the top-K critical paths.
   */
  criticalUnits(opts: { k?: number } = {}): string[] {
    const report = this.computeCriticalPath(opts);
    const ids = new Set<string>();
    for (const r of report.topK) for (const u of r.path) ids.add(u);
    return Array.from(ids);
  }

  /**
   * Render a short announcement suitable for SessionStart-hook output.
   */
  announce(report: CriticalPathReport): string {
    if (report.topK.length === 0) {
      return "Critical path: roadmap has no open units (or all roots are leaves).";
    }
    const top = report.topK[0];
    const others = report.topK
      .slice(1)
      .map((r) => `${r.unitId} (${r.totalWeight.toFixed(1)}w)`)
      .join(", ");
    const lines: string[] = [];
    lines.push(
      `Critical path: ${top.unitId} — ${top.title} (total ${top.totalWeight.toFixed(1)} sessions, depth ${top.depth})`
    );
    if (others) lines.push(`Also critical: ${others}`);
    lines.push(
      `Computed over ${report.totalAnalyzedNodes} nodes in ${report.computedInMs}ms.`
    );
    return lines.join("\n");
  }

  private reconstructPath(
    end: string,
    bestPredecessor: Map<string, string | null>
  ): string[] {
    const out: string[] = [];
    let cur: string | null | undefined = end;
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      out.unshift(cur);
      const pred = bestPredecessor.get(cur);
      cur = pred ?? null;
    }
    return out;
  }
}

export const criticalPathDetectorEngine = new CriticalPathDetectorEngine();
