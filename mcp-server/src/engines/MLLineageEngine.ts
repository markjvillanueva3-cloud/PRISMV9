/**
 * MLLineageEngine — U-LEARN-02 (companion to FeatureStore)
 * ==========================================================
 *
 * Graph store for ML-pipeline lineage: raw_event → feature_row →
 * training_example → model_checkpoint → prediction → outcome_event.
 * Append-only JSONL edges at state/lineage/edges.jsonl with atomic
 * writes. Readers walk the graph in-memory.
 *
 * Answers two load-bearing questions identified by the Data-Pipeline
 * scrutiny (0.28):
 *   1. Forward: "given this prediction, which training example produced
 *      it?"  → traceBackward(prediction_id).
 *   2. Backward: "given this observed outcome, which training row caused
 *      the bad recommendation?"  → traceBackward(outcome_event).
 *
 * Design invariants:
 *   - APPEND-ONLY.  Edges never mutate.
 *   - ATOMIC WRITE.  tmp+fsync+rename like OutcomeCaptureBus + FeatureStore.
 *   - TYPED RELATIONS.  Closed enum prevents graph pollution.
 *   - BOUNDED TRAVERSAL.  max_depth ≤ 32 on trace calls; truncation flagged.
 *   - NEVER-THROW.  Bad input returns `{ok:false, warning}` not an exception.
 *
 * @module engines/MLLineageEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-02 (lineage subunit)
 */

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  LineageEdgeSchema,
  LinkInputSchema,
  TraceInputSchema,
  type LineageEdge,
  type LineageNodeRef,
  type LinkInput,
  type TraceInput,
  type TraceResult,
  type LineageRelationT,
} from "../schemas/mlLineageSchema.js";

const LINEAGE_DIR = path.resolve(process.cwd(), "state/lineage");
const EDGES_FILE = "edges.jsonl";
const SCHEMA_VERSION = "1.0.0" as const;

export interface LinkResult {
  ok: boolean;
  edge_id: string;
  path: string;
  warning?: string;
}

export class MLLineageEngine {
  private readonly rootDir: string;

  constructor(rootDir: string = LINEAGE_DIR) {
    this.rootDir = rootDir;
  }

  /**
   * Append a directed causal edge to the lineage graph.
   */
  link(input: LinkInput): LinkResult {
    const parsed = LinkInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        edge_id: "",
        path: "",
        warning: `schema validation failed: ${parsed.error.message}`,
      };
    }
    const edge: LineageEdge = {
      schemaVersion: SCHEMA_VERSION,
      edge_id: randomUUID(),
      from: parsed.data.from,
      to: parsed.data.to,
      relation: parsed.data.relation,
      lineage_id: parsed.data.lineage_id,
      created_ts: new Date().toISOString(),
      metadata: parsed.data.metadata,
    };
    const check = LineageEdgeSchema.safeParse(edge);
    if (!check.success) {
      return {
        ok: false,
        edge_id: "",
        path: "",
        warning: `edge check failed: ${check.error.message}`,
      };
    }

    let line: string;
    try {
      line = JSON.stringify(edge) + "\n";
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        edge_id: "",
        path: "",
        warning: `serialization failed (non-JSON-safe): ${message}`,
      };
    }

    const filePath = path.join(this.rootDir, EDGES_FILE);
    const writeRes = this.atomicAppend(filePath, line);
    if (!writeRes.ok) {
      return {
        ok: false,
        edge_id: edge.edge_id,
        path: filePath,
        warning: writeRes.warning,
      };
    }
    return { ok: true, edge_id: edge.edge_id, path: filePath };
  }

  /**
   * Traverse the graph from `node` in the given `direction`.
   * Forward = follow edges where node == edge.from; backward = where node == edge.to.
   * BFS with max_depth guard (≤ 32). Returns the set of edges + nodes reached
   * and a flag indicating whether the traversal stopped at max_depth.
   */
  trace(input: TraceInput): TraceResult {
    const parsed = TraceInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        root: input.node,
        direction: input.direction,
        edges: [],
        nodes: [],
        truncated_at_depth: false,
      };
    }
    const { node: root, direction, max_depth, relations } = parsed.data;
    const allEdges = this.readEdges();

    // Index for O(1) neighbor lookup
    const fwd = new Map<string, LineageEdge[]>();    // key = refKey(from) → outgoing
    const bwd = new Map<string, LineageEdge[]>();    // key = refKey(to)   → incoming
    for (const e of allEdges) {
      if (relations && !relations.includes(e.relation)) continue;
      const fk = refKey(e.from);
      const tk = refKey(e.to);
      if (!fwd.has(fk)) fwd.set(fk, []);
      fwd.get(fk)!.push(e);
      if (!bwd.has(tk)) bwd.set(tk, []);
      bwd.get(tk)!.push(e);
    }

    const neighborsOf = direction === "forward"
      ? (n: LineageNodeRef) => fwd.get(refKey(n)) ?? []
      : (n: LineageNodeRef) => bwd.get(refKey(n)) ?? [];

    const seenEdges = new Set<string>();
    const seenNodes = new Set<string>();
    const collectedEdges: LineageEdge[] = [];
    const collectedNodes: LineageNodeRef[] = [];
    const queue: Array<{ node: LineageNodeRef; depth: number }> = [
      { node: root, depth: 0 },
    ];
    let truncated = false;

    seenNodes.add(refKey(root));
    collectedNodes.push(root);

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur.depth >= max_depth) {
        if (neighborsOf(cur.node).length > 0) truncated = true;
        continue;
      }
      for (const e of neighborsOf(cur.node)) {
        if (seenEdges.has(e.edge_id)) continue;
        seenEdges.add(e.edge_id);
        collectedEdges.push(e);
        const next = direction === "forward" ? e.to : e.from;
        const nextKey = refKey(next);
        if (!seenNodes.has(nextKey)) {
          seenNodes.add(nextKey);
          collectedNodes.push(next);
          queue.push({ node: next, depth: cur.depth + 1 });
        }
      }
    }

    return {
      root,
      direction,
      edges: collectedEdges,
      nodes: collectedNodes,
      truncated_at_depth: truncated,
    };
  }

  /**
   * Count edges by relation type and total, for /system-health dashboards.
   */
  stats(): {
    root_dir: string;
    total_edges: number;
    by_relation: Record<string, number>;
    by_node_kind_from: Record<string, number>;
    by_node_kind_to: Record<string, number>;
  } {
    const edges = this.readEdges();
    const by_relation: Record<string, number> = {};
    const by_from: Record<string, number> = {};
    const by_to: Record<string, number> = {};
    for (const e of edges) {
      by_relation[e.relation] = (by_relation[e.relation] ?? 0) + 1;
      by_from[e.from.kind] = (by_from[e.from.kind] ?? 0) + 1;
      by_to[e.to.kind] = (by_to[e.to.kind] ?? 0) + 1;
    }
    return {
      root_dir: this.rootDir,
      total_edges: edges.length,
      by_relation,
      by_node_kind_from: by_from,
      by_node_kind_to: by_to,
    };
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  private readEdges(): LineageEdge[] {
    const filePath = path.join(this.rootDir, EDGES_FILE);
    if (!fs.existsSync(filePath)) return [];
    let raw: string;
    try {
      raw = fs.readFileSync(filePath, "utf8");
    } catch {
      return [];
    }
    const edges: LineageEdge[] = [];
    for (const rawLine of raw.split(/\r?\n/)) {
      if (!rawLine.trim()) continue;
      try {
        const candidate = JSON.parse(rawLine);
        const parsed = LineageEdgeSchema.safeParse(candidate);
        if (parsed.success) edges.push(parsed.data);
      } catch {
        // Torn tail line — skip.
      }
    }
    return edges;
  }

  private atomicAppend(
    filePath: string,
    line: string,
  ): { ok: boolean; warning?: string } {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      let existing = "";
      if (fs.existsSync(filePath)) existing = fs.readFileSync(filePath, "utf8");
      const tmp = path.join(
        dir,
        `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`,
      );
      const fd = fs.openSync(tmp, "w");
      try {
        fs.writeSync(fd, existing);
        fs.writeSync(fd, line);
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      fs.renameSync(tmp, filePath);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(
        `[MLLineage] atomic-append failed for ${filePath}: ${message}\n`,
      );
      return { ok: false, warning: message };
    }
  }

  static getSelfAwareness() {
    return {
      name: "MLLineageEngine",
      version: "1.0.0",
      milestone: "PSAU P2.5-LEARN U-LEARN-02 (lineage subunit)",
      capabilities: ["link", "trace", "stats"],
      dependencies: ["mlLineageSchema"],
      dataSourcesUsed: ["state/lineage/edges.jsonl"],
    };
  }
}

function refKey(n: LineageNodeRef): string {
  return `${n.kind}::${n.id}`;
}

export const mlLineageEngine = new MLLineageEngine();
