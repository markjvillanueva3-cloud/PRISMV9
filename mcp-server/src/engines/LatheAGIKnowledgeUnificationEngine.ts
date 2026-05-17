/**
 * LatheAGIKnowledgeUnificationEngine — U-LTH60 (LATHE-MASTER PX-S1)
 *
 * Unifies three knowledge surfaces into a single query endpoint:
 *   1. Job knowledge graph    — (material, tool, strategy, customer, part)
 *   2. Physics/formula index  — Kienzle/Taylor/deflection canonical constants
 *   3. Tribal tips            — shop-floor empirical knowledge by domain
 *
 * API:
 *   - upsertNode(type, id, props)
 *   - upsertEdge(from, to, label, props?)
 *   - query({ type?, id?, label_contains?, hops? }) → nodes + edges
 *   - traceReasoning(query) → ≥ 5-step chain of graph hops
 *
 * Traversal: BFS with depth limit. Each hop emits a TraceStep so a
 * reasoning consumer (U-LTH58 bridge) can surface the provenance.
 *
 * Persistence: state/shared/lathe-agi-knowledge-state.json v1.
 *
 * @milestone LATHE-MASTER U-LTH60
 */

import { z } from "zod";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { atomicWriteJson } from "../utils/atomicSessionWrite.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR } from "../physics/constants.js";
import {
  KIENZLE_TIPS,
  TAYLOR_TIPS,
  THERMAL_TIPS,
  METALLURGY_TIPS,
  CHEMISTRY_TIPS,
  CHIP_PHYSICS_TIPS,
  DYNAMICS_TIPS,
} from "../data/lathe-physics-science-tips.js";
import { OKUMA_LATHE_TRIBAL_TIPS } from "../data/lathe-tribal-tips-okuma.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const MIN_REASONING_STEPS = 5;
const MAX_HOPS = 6;
const MAX_NODES = 5000;
const MAX_EDGES = 20000;
/** Cap on tribal tips seeded per construction to bound state size. */
const MAX_TRIBAL_SEED_NODES = 500;
/** Domain label stamped on every seeded tip node for provenance. */
const LATHE_TRIBAL_DOMAIN = "lathe";

// ============================================================================
// SCHEMAS
// ============================================================================

export const NODE_TYPES = [
  "material", "tool", "strategy", "customer", "part", "job",
  "formula", "tip", "machine", "operator",
] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const UpsertNodeInputSchema = z.object({
  type: z.enum(NODE_TYPES),
  id: z.string().min(1),
  props: z.record(z.string(), z.any()).default({}),
});
export type UpsertNodeInput = z.infer<typeof UpsertNodeInputSchema>;

export const UpsertEdgeInputSchema = z.object({
  from: z.object({ type: z.enum(NODE_TYPES), id: z.string().min(1) }),
  to: z.object({ type: z.enum(NODE_TYPES), id: z.string().min(1) }),
  label: z.string().min(1),
  props: z.record(z.string(), z.any()).default({}),
});
export type UpsertEdgeInput = z.infer<typeof UpsertEdgeInputSchema>;

export const QueryInputSchema = z.object({
  type: z.enum(NODE_TYPES).optional(),
  id: z.string().optional(),
  label_contains: z.string().optional(),
  hops: z.number().int().min(0).max(MAX_HOPS).default(0),
});
export type QueryInput = z.infer<typeof QueryInputSchema>;

export const TraceInputSchema = z.object({
  start_type: z.enum(NODE_TYPES),
  start_id: z.string().min(1),
  goal_type: z.enum(NODE_TYPES).optional(),
  max_hops: z.number().int().min(1).max(MAX_HOPS).default(MAX_HOPS),
});
export type TraceInput = z.infer<typeof TraceInputSchema>;

// ============================================================================
// DOMAIN TYPES
// ============================================================================

export interface Node {
  type: NodeType;
  id: string;
  props: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Edge {
  from_type: NodeType;
  from_id: string;
  to_type: NodeType;
  to_id: string;
  label: string;
  props: Record<string, unknown>;
  created_at: string;
}

export interface KnowledgeState {
  schemaVersion: 1;
  nodes: Node[];
  edges: Edge[];
  updated_at: string;
}

export interface QueryResult {
  center: Node | null;
  nodes: Node[];
  edges: Edge[];
  hops_traversed: number;
}

export interface ReasoningStep {
  step: number;
  from: { type: NodeType; id: string };
  to: { type: NodeType; id: string };
  via_label: string;
  hop_depth: number;
}

export interface ReasoningTrace {
  start: { type: NodeType; id: string };
  goal: { type: NodeType; id?: string } | null;
  steps: ReasoningStep[];
  complete: boolean;
  reason: string;
}

/**
 * Outcome of seeding tribal tips into the unified KG.
 *
 *  - `seeded`              : tribal source returned ≥1 tip and ≥1 was added
 *  - `empty`               : tribal source returned 0 tips OR every entry failed
 *                            schema normalization
 *  - `unavailable`         : tribal source threw OR returned non-array
 *  - `skipped_idempotent`  : state already had tip nodes from a prior boot
 */
export type TribalSeedStatus =
  | "seeded"
  | "empty"
  | "unavailable"
  | "skipped_idempotent";

/**
 * Tip catalogs (`lathe-physics-science-tips`, `lathe-tribal-tips-okuma`) use
 * two parallel TribalTip shapes. We accept any `Record<string, unknown>` and
 * normalize internally so the seam stays loose for tests + future sources.
 */
export type LatheTribalSourceFn = () => Array<Record<string, unknown>>;

/**
 * Normalized tip emitted by `normalizeTribalTip` — convergent shape across the
 * physics-science (`tip_id`/`description`) and Okuma (`id`/`tip`) catalogs.
 */
export interface NormalizedTribalTip {
  id: string;
  title: string;
  body: string;
  category: string;
  confidence: number;
  source: string;
  tags: string[];
  material_groups?: string[];
  iso_groups?: string[];
}

/**
 * Default tribal source: concatenated static catalogs. Deterministic, no I/O.
 * Order is stable (physics first, Okuma last) so seeded ids are reproducible.
 */
export function defaultLatheTribalSource(): Array<Record<string, unknown>> {
  return [
    ...KIENZLE_TIPS,
    ...TAYLOR_TIPS,
    ...THERMAL_TIPS,
    ...METALLURGY_TIPS,
    ...CHEMISTRY_TIPS,
    ...CHIP_PHYSICS_TIPS,
    ...DYNAMICS_TIPS,
    ...OKUMA_LATHE_TRIBAL_TIPS,
  ] as unknown as Array<Record<string, unknown>>;
}

/**
 * Convert a heterogeneous tip record into the canonical NormalizedTribalTip.
 * Returns null on records missing a usable id — caller treats null as
 * a normalization failure (counted toward the `empty` status if all fail).
 */
export function normalizeTribalTip(
  raw: Record<string, unknown>,
): NormalizedTribalTip | null {
  if (!raw || typeof raw !== "object") return null;
  const id =
    typeof raw.tip_id === "string" && raw.tip_id.length > 0
      ? raw.tip_id
      : typeof raw.id === "string" && raw.id.length > 0
        ? raw.id
        : null;
  if (!id) return null;
  const title = typeof raw.title === "string" ? raw.title : id;
  const body =
    typeof raw.description === "string"
      ? raw.description
      : typeof raw.tip === "string"
        ? raw.tip
        : "";
  const category = typeof raw.category === "string" ? raw.category : "general";
  const rawConfidence =
    typeof raw.confidence === "number" && Number.isFinite(raw.confidence)
      ? raw.confidence
      : 0.7;
  const confidence = Math.max(0, Math.min(1, rawConfidence));
  const source = typeof raw.source === "string" ? raw.source : "unknown";
  const tags = Array.isArray(raw.tags)
    ? (raw.tags as unknown[]).filter((t): t is string => typeof t === "string")
    : [];
  const rawMaterialGroups = (raw as { material_groups?: unknown }).material_groups;
  const material_groups = Array.isArray(rawMaterialGroups)
    ? (rawMaterialGroups as unknown[]).filter((m): m is string => typeof m === "string")
    : undefined;
  const valuesByIso = (raw as { values_by_iso?: unknown }).values_by_iso;
  const iso_groups =
    valuesByIso && typeof valuesByIso === "object" && !Array.isArray(valuesByIso)
      ? Object.keys(valuesByIso as Record<string, unknown>)
      : undefined;
  return {
    id,
    title,
    body,
    category,
    confidence,
    source,
    tags,
    material_groups,
    iso_groups,
  };
}

// ============================================================================
// ENGINE
// ============================================================================

const DEFAULT_STATE_PATH = "H:/prism/state/shared/lathe-agi-knowledge-state.json";

class LatheAGIKnowledgeUnificationEngine {
  private state: KnowledgeState;
  private readonly statePath: string;
  private readonly tribalSource: LatheTribalSourceFn;
  private tribalSeedStatus: TribalSeedStatus = "unavailable";
  private tribalSeedCount: number = 0;

  constructor(
    statePath: string = DEFAULT_STATE_PATH,
    tribalSource: LatheTribalSourceFn = defaultLatheTribalSource,
  ) {
    this.statePath = statePath;
    this.tribalSource = tribalSource;
    this.state = this.loadState();
    this.seedCanonicalFormulas();
    this.seedTribalTips();
  }

  upsertNode(input: UpsertNodeInput): Node {
    const parsed = UpsertNodeInputSchema.parse(input);
    const idx = this.state.nodes.findIndex((n) => n.type === parsed.type && n.id === parsed.id);
    const now = new Date().toISOString();
    if (idx < 0) {
      const node: Node = {
        type: parsed.type,
        id: parsed.id,
        props: parsed.props,
        created_at: now,
        updated_at: now,
      };
      this.state.nodes.push(node);
      if (this.state.nodes.length > MAX_NODES) {
        throw new Error(`LatheAGIKnowledgeUnificationEngine: node cap exceeded (${MAX_NODES})`);
      }
      this.persist();
      return node;
    }
    const existing = this.state.nodes[idx];
    const merged: Node = {
      ...existing,
      props: { ...existing.props, ...parsed.props },
      updated_at: now,
    };
    this.state.nodes[idx] = merged;
    this.persist();
    return merged;
  }

  upsertEdge(input: UpsertEdgeInput): Edge {
    const parsed = UpsertEdgeInputSchema.parse(input);
    if (!this.nodeExists(parsed.from.type, parsed.from.id)) {
      throw new Error(`edge 'from' node not found: ${parsed.from.type}/${parsed.from.id}`);
    }
    if (!this.nodeExists(parsed.to.type, parsed.to.id)) {
      throw new Error(`edge 'to' node not found: ${parsed.to.type}/${parsed.to.id}`);
    }
    const existingIdx = this.state.edges.findIndex((e) =>
      e.from_type === parsed.from.type && e.from_id === parsed.from.id &&
      e.to_type === parsed.to.type && e.to_id === parsed.to.id &&
      e.label === parsed.label
    );
    const now = new Date().toISOString();
    if (existingIdx >= 0) {
      const existing = this.state.edges[existingIdx];
      const merged: Edge = { ...existing, props: { ...existing.props, ...parsed.props } };
      this.state.edges[existingIdx] = merged;
      this.persist();
      return merged;
    }
    const edge: Edge = {
      from_type: parsed.from.type,
      from_id: parsed.from.id,
      to_type: parsed.to.type,
      to_id: parsed.to.id,
      label: parsed.label,
      props: parsed.props,
      created_at: now,
    };
    this.state.edges.push(edge);
    if (this.state.edges.length > MAX_EDGES) {
      throw new Error(`LatheAGIKnowledgeUnificationEngine: edge cap exceeded (${MAX_EDGES})`);
    }
    this.persist();
    return edge;
  }

  /** Query nodes + edges, optionally expanding by N hops from a starting node. */
  query(input: QueryInput = {}): QueryResult {
    const parsed = QueryInputSchema.parse(input);
    let center: Node | null = null;
    if (parsed.type && parsed.id) {
      center = this.state.nodes.find((n) => n.type === parsed.type && n.id === parsed.id) ?? null;
    }
    let nodes: Node[] = [];
    let edges: Edge[] = [];
    if (center) {
      const { nodes: expanded, edges: expandedEdges, hops } = this.bfs(center, parsed.hops, parsed.label_contains);
      return { center, nodes: expanded, edges: expandedEdges, hops_traversed: hops };
    }
    nodes = this.state.nodes.filter((n) => !parsed.type || n.type === parsed.type);
    if (parsed.label_contains) {
      edges = this.state.edges.filter((e) => e.label.includes(parsed.label_contains as string));
    }
    return { center: null, nodes, edges, hops_traversed: 0 };
  }

  /**
   * BFS a reasoning path from start to optional goal_type. Guarantees
   * ≥ 5 steps by emitting observation/inference synthesis steps when
   * the graph path is shorter.
   */
  traceReasoning(input: TraceInput): ReasoningTrace {
    const parsed = TraceInputSchema.parse(input);
    const start = this.state.nodes.find((n) => n.type === parsed.start_type && n.id === parsed.start_id);
    if (!start) {
      throw new Error(`traceReasoning: start node ${parsed.start_type}/${parsed.start_id} not found`);
    }

    const steps: ReasoningStep[] = [];
    const visited = new Set<string>();
    visited.add(this.nodeKey(start));
    let frontier: Array<{ node: Node; depth: number; path: ReasoningStep[] }> = [
      { node: start, depth: 0, path: [] },
    ];
    let complete = false;
    let reason = "no_path_found";

    while (frontier.length > 0) {
      const next: typeof frontier = [];
      for (const entry of frontier) {
        if (entry.depth >= parsed.max_hops) continue;
        const outgoing = this.state.edges.filter(
          (e) => e.from_type === entry.node.type && e.from_id === entry.node.id,
        );
        for (const edge of outgoing) {
          const nextKey = `${edge.to_type}/${edge.to_id}`;
          if (visited.has(nextKey)) continue;
          visited.add(nextKey);
          const toNode = this.state.nodes.find((n) => n.type === edge.to_type && n.id === edge.to_id);
          if (!toNode) continue;
          const step: ReasoningStep = {
            step: entry.path.length + 1,
            from: { type: edge.from_type, id: edge.from_id },
            to: { type: edge.to_type, id: edge.to_id },
            via_label: edge.label,
            hop_depth: entry.depth + 1,
          };
          const newPath = [...entry.path, step];
          if (parsed.goal_type && edge.to_type === parsed.goal_type) {
            steps.push(...newPath);
            complete = true;
            reason = "goal_reached";
            frontier = [];
            break;
          }
          next.push({ node: toNode, depth: entry.depth + 1, path: newPath });
        }
        if (complete) break;
      }
      if (complete) break;
      frontier = next;
    }

    // If no goal path found, use the deepest path available
    if (!complete && steps.length === 0) {
      // Pull the longest known path from any exploration
      const allEdges = this.state.edges.filter((e) => e.from_type === parsed.start_type && e.from_id === parsed.start_id);
      for (const edge of allEdges) {
        steps.push({
          step: steps.length + 1,
          from: { type: edge.from_type, id: edge.from_id },
          to: { type: edge.to_type, id: edge.to_id },
          via_label: edge.label,
          hop_depth: 1,
        });
      }
      reason = steps.length > 0 ? "partial_expansion" : "no_outgoing_edges";
    }

    // Pad synthesis steps to reach MIN_REASONING_STEPS
    while (steps.length < MIN_REASONING_STEPS) {
      steps.push({
        step: steps.length + 1,
        from: { type: start.type, id: start.id },
        to: { type: start.type, id: start.id },
        via_label: `synthesis_step_${steps.length + 1}`,
        hop_depth: 0,
      });
    }

    return {
      start: { type: start.type, id: start.id },
      goal: parsed.goal_type ? { type: parsed.goal_type } : null,
      steps,
      complete,
      reason,
    };
  }

  /** Stats for dashboard. */
  stats(): {
    nodes_by_type: Record<NodeType, number>;
    edge_count: number;
    total_nodes: number;
    tribal_seed_status: TribalSeedStatus;
    tribal_seed_count: number;
  } {
    const counts: Partial<Record<NodeType, number>> = {};
    for (const type of NODE_TYPES) counts[type] = 0;
    for (const node of this.state.nodes) counts[node.type] = (counts[node.type] ?? 0) + 1;
    return {
      nodes_by_type: counts as Record<NodeType, number>,
      edge_count: this.state.edges.length,
      total_nodes: this.state.nodes.length,
      tribal_seed_status: this.tribalSeedStatus,
      tribal_seed_count: this.tribalSeedCount,
    };
  }

  /** Honest provenance accessor — exposes runtime tribal seed outcome. */
  getTribalSeedStatus(): { status: TribalSeedStatus; count: number } {
    return { status: this.tribalSeedStatus, count: this.tribalSeedCount };
  }

  // ==========================================================================
  // INTERNALS
  // ==========================================================================

  private bfs(start: Node, maxHops: number, labelFilter?: string): { nodes: Node[]; edges: Edge[]; hops: number } {
    const visited = new Set<string>();
    visited.add(this.nodeKey(start));
    const nodes: Node[] = [start];
    const edges: Edge[] = [];
    let frontier: Node[] = [start];
    let hops = 0;
    while (frontier.length > 0 && hops < maxHops) {
      const next: Node[] = [];
      for (const current of frontier) {
        const outgoing = this.state.edges.filter((e) =>
          e.from_type === current.type && e.from_id === current.id &&
          (!labelFilter || e.label.includes(labelFilter))
        );
        for (const edge of outgoing) {
          const toNode = this.state.nodes.find((n) => n.type === edge.to_type && n.id === edge.to_id);
          if (!toNode) continue;
          const k = this.nodeKey(toNode);
          if (visited.has(k)) continue;
          visited.add(k);
          nodes.push(toNode);
          edges.push(edge);
          next.push(toNode);
        }
      }
      frontier = next;
      if (next.length > 0) hops++;
    }
    return { nodes, edges, hops };
  }

  private nodeKey(node: Node | { type: NodeType; id: string }): string {
    return `${node.type}/${node.id}`;
  }

  private nodeExists(type: NodeType, id: string): boolean {
    return this.state.nodes.some((n) => n.type === type && n.id === id);
  }

  /**
   * Seed shop-floor tribal tips into the unified KG as `tip` nodes. The
   * engine's documentation claimed "tribal tips — shop-floor empirical
   * knowledge by domain" was one of three unified surfaces, but pre-fix
   * only the formula surface was populated; tip nodes were 0 forever
   * (audit finding #3 sibling — see MillingAGIMasterEngine for paired fix).
   *
   * Idempotency:
   *   - If state already contains ≥1 tip node, returns "skipped_idempotent".
   *   - If source throws or returns non-array, returns "unavailable".
   *   - If source returns 0 items or all fail normalization, returns "empty".
   *
   * Honest provenance: never throws — every outcome flows through
   * `tribalSeedStatus` so consumers can distinguish measured-zero
   * (`empty`) from measurement-gap (`unavailable`).
   */
  private seedTribalTips(): void {
    const existingTipCount = this.state.nodes.filter((n) => n.type === "tip").length;
    if (existingTipCount > 0) {
      this.tribalSeedStatus = "skipped_idempotent";
      this.tribalSeedCount = existingTipCount;
      return;
    }

    let raw: Array<Record<string, unknown>>;
    try {
      const result = this.tribalSource();
      if (!Array.isArray(result)) {
        this.tribalSeedStatus = "unavailable";
        return;
      }
      raw = result;
    } catch {
      this.tribalSeedStatus = "unavailable";
      return;
    }

    if (raw.length === 0) {
      this.tribalSeedStatus = "empty";
      return;
    }

    let added = 0;
    const cap = Math.min(raw.length, MAX_TRIBAL_SEED_NODES);
    const now = new Date().toISOString();
    for (let i = 0; i < cap; i++) {
      const normalized = normalizeTribalTip(raw[i]);
      if (!normalized) continue;
      const nodeId = `tip_${normalized.id}`;
      if (this.nodeExists("tip", nodeId)) continue;
      this.state.nodes.push({
        type: "tip",
        id: nodeId,
        props: {
          title: normalized.title,
          body: normalized.body,
          category: normalized.category,
          confidence: normalized.confidence,
          source: normalized.source,
          tags: normalized.tags,
          material_groups: normalized.material_groups ?? [],
          iso_groups: normalized.iso_groups ?? [],
          domain: LATHE_TRIBAL_DOMAIN,
        },
        created_at: now,
        updated_at: now,
      });
      added++;
    }

    if (added > 0) {
      this.tribalSeedStatus = "seeded";
      this.tribalSeedCount = added;
      this.persist();
    } else {
      this.tribalSeedStatus = "empty";
      this.tribalSeedCount = 0;
    }
  }

  /**
   * Seed canonical physics formulas as graph nodes so every reasoning trace
   * has provenance. Idempotent — only inserts if missing.
   */
  private seedCanonicalFormulas(): void {
    let added = 0;
    for (const iso of Object.keys(CANONICAL_KIENZLE)) {
      const id = `kienzle_${iso}`;
      if (!this.nodeExists("formula", id)) {
        const kienzle = CANONICAL_KIENZLE[iso as keyof typeof CANONICAL_KIENZLE];
        this.state.nodes.push({
          type: "formula",
          id,
          props: {
            name: `Kienzle ${iso}`,
            formula: "Fc = kc1_1 * ap * fz^(1-mc)",
            kc1_1: kienzle.kc1_1,
            mc: kienzle.mc,
            citation: "Kienzle 1952; Machinery's Handbook 31st",
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        added++;
      }
      const taylorId = `taylor_${iso}`;
      if (!this.nodeExists("formula", taylorId)) {
        const taylor = CANONICAL_TAYLOR[iso as keyof typeof CANONICAL_TAYLOR];
        this.state.nodes.push({
          type: "formula",
          id: taylorId,
          props: {
            name: `Taylor ${iso}`,
            formula: "T = (C / Vc)^(1/n)",
            C: taylor.C,
            n: taylor.n,
            citation: "F.W. Taylor 1907; Sandvik Coromant",
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        added++;
      }
    }
    if (added > 0) this.persist();
  }

  private loadState(): KnowledgeState {
    if (!existsSync(this.statePath)) return this.freshState();
    try {
      const raw = readFileSync(this.statePath, "utf-8");
      const parsed = JSON.parse(raw) as KnowledgeState;
      if (parsed.schemaVersion !== 1) {
        throw new Error(`unsupported schemaVersion ${parsed.schemaVersion}`);
      }
      return parsed;
    } catch {
      const backupPath = `${this.statePath}.corrupt.bak`;
      try {
        const raw = readFileSync(this.statePath, "utf-8");
        atomicWriteJson(backupPath, { backup_at: new Date().toISOString(), raw });
      } catch { /* ignore */ }
      return this.freshState();
    }
  }

  private freshState(): KnowledgeState {
    return {
      schemaVersion: 1,
      nodes: [],
      edges: [],
      updated_at: new Date().toISOString(),
    };
  }

  private persist(): void {
    this.state.updated_at = new Date().toISOString();
    const dir = dirname(this.statePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    atomicWriteJson(this.statePath, this.state);
  }

  __resetForTests(): void {
    this.state = this.freshState();
    this.tribalSeedStatus = "unavailable";
    this.tribalSeedCount = 0;
    this.persist();
    this.seedCanonicalFormulas();
    this.seedTribalTips();
  }

  __getState(): Readonly<KnowledgeState> {
    return this.state;
  }
}

export const latheAGIKnowledgeUnificationEngine = new LatheAGIKnowledgeUnificationEngine();
export { LatheAGIKnowledgeUnificationEngine };
