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
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR, type ISOGroup } from "../physics/constants.js";
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
import { randomUUID } from "node:crypto";
import {
  latheAGIFeatureBridgeEngine,
  type AGIReasonInput,
  type AGIReasonResult,
} from "./LatheAGIFeatureBridgeEngine.js";
import { latheAGIContinuousLearningEngine } from "./LatheAGIContinuousLearningEngine.js";
import {
  latheAGISafetyContainmentEngine,
  type SafetyCheckInput,
  type SafetyReport,
} from "./LatheAGISafetyContainmentEngine.js";
import {
  DOMAIN_AGI_CONTRACT_VERSION,
  DomainAGIIntentSchema,
  type DomainAGIIntent,
  type DomainAGIResult,
  type DecisionKindT,
  type LatheActionT,
} from "../schemas/domainAGIContract.js";
import type { OutcomeEvent } from "../schemas/outcomeEventSchema.js";
// P1-U03 (INFRA-AGI-ROUTER-MS2): factored to the shared kit. The kit's
// ORCHESTRATE_OUTCOME_TOPIC + ORCHESTRATE_STAGE constants are consumed
// internally by makeOutcomeEvent + publishOutcomeToFeedbackBus — this
// engine never references them directly. See domainAGIAdapterKit.ts header.
import {
  makeDefaultConsensusVote,
  publishOutcomeToFeedbackBus,
  makeFailResult,
  makeOutcomeEvent,
  rollupJointConfidence,
} from "./domainAGIAdapterKit.js";

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
// DOMAIN AGI CONTRACT — INFRA-AGI-ROUTER-MS2/P0-U03
// ============================================================================
//
// The lathe domain's implementation of the unified DomainAGIIntent contract
// (P0-U01). orchestrate(intent) composes the LatheAGI engine cluster —
// LatheAGIFeatureBridgeEngine (speed/feed + strategy reasoning),
// LatheAGIContinuousLearningEngine (EWMA feed adjustment), and
// LatheAGISafetyContainmentEngine (physics-envelope validation) — behind the
// single contract ProcessIntelligenceRouterEngine (U05) dispatches uniformly.
// The legacy KG API (upsertNode/upsertEdge/query/traceReasoning) is untouched.
//
// TIE-UP NOTE: the consensus + outcome-bus + ISO-inference scaffolding below is
// a deliberate near-twin of the MillingAGIMasterEngine P0-U02 block. P0-U05
// (the "thin glue" router unit) is the designated home for extracting a shared
// domainAGIAdapterKit and retrofitting U02 + U03 — see the milestone envelope's
// per-unit "TIE UP" four_loop step. Duplicated here (not prematurely extracted)
// to match the convention P0-U02 already shipped (Karpathy R11).

/** Decision categories the orchestrator routes through consensus. */
type ConsensusDecisionKind = Extract<DecisionKindT, "tool" | "strategy" | "feed">;

/**
 * One consensus question. When `intent.consensusRequired === true` the lathe
 * engine asks the voices to vote over the candidate options it would otherwise
 * pick unilaterally.
 */
export interface LatheConsensusQuery {
  /** Which pick is being decided. */
  decisionKind: ConsensusDecisionKind;
  /** Human-readable question handed to the consensus voices. */
  question: string;
  /** Candidate options to vote over. options[0] is the engine's unilateral pick. */
  options: string[];
}

/** Verdict returned by a consensus call. */
export interface LatheConsensusVerdict {
  /** The option the voices converged on (SHOULD be one of query.options). */
  answer: string;
  /** Consensus confidence in [0,1]. */
  confidence: number;
  /** Model voices that produced the winning answer. */
  voters: string[];
  /**
   * REAL pointer into consensus-decisions.jsonl IF the consensus implementation
   * can produce one. The production default seam returns this UNSET —
   * ConsensusAuditLogEngine.append() returns void and the audit row carries no
   * retrievable id. Never fabricate a pointer that dereferences to nothing
   * (Karpathy R12); precise linkage lands when INFRA-CONSENSUS-WIRE-MS0/P0-U04's
   * audit ledger exposes a queryable key. Mirrors MillConsensusVerdict.auditId.
   */
  auditId?: string;
}

/**
 * Uniform Decision.value shape for every orchestrate() decision. ONE shape
 * whether or not a consensus call ran, so downstream consumers
 * (ProcessIntelligenceRouterEngine, OutcomeCaptureBus consumers) never have to
 * branch on the runtime type of `value`.
 */
export interface LatheDecisionValue {
  /** Final selected pick — engine pick, or the consensus answer if it overrode. */
  selected: string;
  /** What the engine picked unilaterally, before any consensus call. */
  enginePick: string;
  /** The engine's structured recommendation object for this pick. */
  detail: unknown;
  /** true when a consensus vote replaced the engine's unilateral pick. */
  consensusOverride: boolean;
}

/** Injectable consensus seam — default wraps MultiModelConsensusEngine.ask(). */
export type LatheConsensusFn = (query: LatheConsensusQuery) => Promise<LatheConsensusVerdict>;

/** Injectable feedback-bus seam — default publishes to the MS1 FeedbackBusEngine. */
export type LathePublishOutcomeFn = (event: OutcomeEvent) => void;

/** Injectable FeatureBridge seam — default = real latheAGIFeatureBridgeEngine.reason. */
export type LatheFeatureReasonFn = (input: AGIReasonInput) => AGIReasonResult;

/** Injectable ContinuousLearning seam — default = real predictAdjustment. */
export type LathePredictAdjustmentFn = (feature: string, key: string) => number;

/** Injectable SafetyContainment seam — default = real check. */
export type LatheSafetyCheckFn = (input: SafetyCheckInput) => SafetyReport;

/** Per-call seam overrides for orchestrate(). All default to production seams. */
export interface LatheOrchestrateOptions {
  /** Override the consensus seam (tests inject a deterministic fake). */
  consensusDecide?: LatheConsensusFn;
  /** Override the outcome-event publish seam (tests inject a spy). */
  publishOutcome?: LathePublishOutcomeFn;
  /** Override the FeatureBridge reasoning seam (tests inject a fake/throwing reasoner). */
  featureReason?: LatheFeatureReasonFn;
  /** Override the ContinuousLearning adjustment seam. */
  predictAdjustment?: LathePredictAdjustmentFn;
  /** Override the SafetyContainment validation seam. */
  safetyCheck?: LatheSafetyCheckFn;
}

// ORCHESTRATE_OUTCOME_TOPIC + ORCHESTRATE_STAGE imported from
// domainAGIAdapterKit (P1-U01) — see import block above.

/**
 * Per-decision confidence for the deterministic tool pick. The action→insert
 * map below is standard ISO-1832 tooling — a sound, established choice — but it
 * is NOT a job-optimized selection (no registry/physics query). 0.80 reflects
 * "solid standard tool" without overclaiming optimization (Karpathy R12).
 */
const LATHE_TOOL_HEURISTIC_CONFIDENCE = 0.8;

/**
 * Coarse material-name → ISO machining group classifier. Name-based triage
 * ONLY — the canonical material→ISO mapping lives in the material registry
 * (src/registries/). Unknown names fall back to "N" and orchestrate() surfaces
 * a warning so the operator verifies (Karpathy R12: an inferred value must
 * never masquerade as a measured one). Intentional twin of the same heuristic
 * in MillingAGIMasterEngine — both are documented-local triage; P0-U05 extracts
 * the shared kit (see TIE-UP NOTE above).
 */
function inferISOGroup(material: string): { iso: ISOGroup; certain: boolean } {
  const m = material.toLowerCase();
  if (/inconel|hastelloy|titanium|\bti-?6al\b|waspaloy|\brene\b|nimonic|superalloy|monel/.test(m)) return { iso: "S", certain: true };
  if (/hardened|\bhrc\b|case.?harden/.test(m)) return { iso: "H", certain: true };
  if (/cast.?iron|gray.?iron|grey.?iron|ductile.?iron/.test(m)) return { iso: "K", certain: true };
  if (/stainless|austenit|\b303\b|\b304\b|\b316\b|\b17-4\b|\b15-5\b|duplex/.test(m)) return { iso: "M", certain: true };
  if (/alumin|\b6061\b|\b7075\b|\b2024\b|brass|bronze|copper|magnesium|delrin|acetal|nylon|plastic/.test(m)) return { iso: "N", certain: true };
  if (/steel|carbon|\b10\d\d\b|\b41\d\d\b|\b43\d\d\b|\b86\d\d\b|\bp20\b|\ba36\b/.test(m)) return { iso: "P", certain: true };
  return { iso: "N", certain: false };
}

/**
 * Deterministic lathe-tool pick by action. Returns standard ISO-1832 indexable-
 * insert designations — shop-floor-standard turning/threading/grooving tooling.
 * Tool selection here is a bounded action→insert heuristic, not a registry
 * query (a fresh KG holds no tool nodes); confidence is fixed at
 * LATHE_TOOL_HEURISTIC_CONFIDENCE. Citation: ISO 1832 indexable-insert
 * designation system.
 */
function latheToolPick(action: LatheActionT): { pick: string; alternatives: string[]; rationale: string } {
  switch (action) {
    case "turning":
    case "facing":
    case "chamfering":
      return {
        pick: "CNMG-432 80-deg rhombic carbide insert",
        alternatives: ["DNMG-432 55-deg rhombic insert", "WNMG-432 trigon insert"],
        rationale: `80-deg rhombic CNMG insert — strong corner for general OD ${action} (ISO 1832).`,
      };
    case "threading":
      return {
        pick: "16ER laydown threading insert (60-deg ISO)",
        alternatives: ["16ER full-profile threading insert", "11ER threading insert"],
        rationale: "60-deg laydown threading insert for single-point threading (ISO 1832).",
      };
    case "parting":
      return {
        pick: "MGMN-300 parting blade insert (3 mm)",
        alternatives: ["MGMN-200 parting blade insert (2 mm)", "GTN-3 parting insert"],
        rationale: "Narrow parting blade insert for cut-off (ISO 1832).",
      };
    case "grooving":
      return {
        pick: "MGMN-300 grooving insert (3 mm)",
        alternatives: ["MGMN-200 grooving insert (2 mm)", "GTN-3 grooving insert"],
        rationale: "Grooving insert sized to the groove width (ISO 1832).",
      };
    case "boring":
      return {
        pick: "CCMT-432 boring insert on carbide boring bar",
        alternatives: ["DCMT-432 boring insert", "TCMT-432 boring insert"],
        rationale: "Positive-rake CCMT insert on a carbide boring bar for ID work (ISO 1832).",
      };
    case "drilling":
      return {
        pick: "Solid carbide twist drill",
        alternatives: ["Indexable U-drill", "Spade drill"],
        rationale: "Solid carbide drill for on-center hole-making.",
      };
    case "knurling":
      return {
        pick: "Form (bump) knurling tool",
        alternatives: ["Cut knurling tool", "Scissor knurling tool"],
        rationale: "Form knurling tool — displaces material to raise the knurl pattern.",
      };
    default: {
      // Exhaustiveness guard — a new LatheAction added to the contract without
      // a case here fails the build (`action` is no longer `never`), instead of
      // silently returning undefined at runtime (Karpathy R12).
      const _exhaustive: never = action;
      throw new Error(`latheToolPick: unhandled lathe action '${String(_exhaustive)}'`);
    }
  }
}

/**
 * Default consensus seam — model vote via MultiModelConsensusEngine. Lazy-
 * imported (the consensus engine makes real model API calls; orchestrations that
 * never set consensusRequired must not pay its load cost). Fails soft: a null
 * consensus returns the engine's own pick. Mirrors the P0-U02 mill seam — see
 * the TIE-UP NOTE for the shared-kit extraction plan.
 */
const latheConsensusKitSeam = makeDefaultConsensusVote({
  engineName: "LatheAGIKnowledgeUnificationEngine",
  callerEngine: "LatheAGIKnowledgeUnificationEngine",
});
const defaultConsensusDecide: LatheConsensusFn = async (query) =>
  latheConsensusKitSeam({
    question: query.question,
    options: query.options,
    decisionKind: query.decisionKind,
  });

/** Default outcome-event seam — kit's publish helper (single line of indirection). */
const defaultPublishOutcome: LathePublishOutcomeFn = publishOutcomeToFeedbackBus;

/**
 * Default FeatureBridge seam — the real lathe AGI feature bridge singleton.
 * NOTE: LatheAGIFeatureBridgeEngine.reason() persists a capped call-history
 * record to lathe-agi-bridge-state.json. A hermetic unit test should inject
 * `opts.featureReason`, or reset the bridge via __resetForTests() in beforeEach.
 */
const defaultFeatureReason: LatheFeatureReasonFn = (input) => latheAGIFeatureBridgeEngine.reason(input);

/** Default ContinuousLearning seam — the real lathe AGI learning singleton. */
const defaultPredictAdjustment: LathePredictAdjustmentFn = (feature, key) =>
  latheAGIContinuousLearningEngine.predictAdjustment(feature, key);

/** Default SafetyContainment seam — the real lathe AGI safety singleton. */
const defaultSafetyCheck: LatheSafetyCheckFn = (input) => latheAGISafetyContainmentEngine.check(input);

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

  upsertNode(input: z.input<typeof UpsertNodeInputSchema>): Node {
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

  upsertEdge(input: z.input<typeof UpsertEdgeInputSchema>): Edge {
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
  query(input: z.input<typeof QueryInputSchema> = {}): QueryResult {
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
  traceReasoning(input: z.input<typeof TraceInputSchema>): ReasoningTrace {
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
  // DOMAIN AGI CONTRACT — orchestrate(intent) — INFRA-AGI-ROUTER-MS2/P0-U03
  // ==========================================================================

  /**
   * Orchestrate a lathe job through the unified DomainAGIIntent contract.
   *
   * The lathe domain's implementation of the contract every domain AGI exposes
   * (P0-U01). ProcessIntelligenceRouterEngine (U05) dispatches mill/lathe/wedm
   * intents here without per-domain branching. Pipeline:
   *   1. Validate the intent; reject non-lathe domains (router misroute guard).
   *   2. Compose the LatheAGI cluster — LatheAGIFeatureBridgeEngine reasons
   *      speed/feed + print-to-program strategy; LatheAGIContinuousLearningEngine
   *      adjusts the feed via its EWMA slot.
   *   3. LatheAGISafetyContainmentEngine validates the speed/feed candidate that
   *      underlies the result — a hard-blocking check fails the orchestration.
   *   4. Lift the tool / strategy / feed picks into typed Decision objects; when
   *      intent.consensusRequired, route each through the consensus seam — the
   *      consensus answer overrides the engine's unilateral pick.
   *   5. Emit one `cross_process_decision` outcome event per decision to the MS1
   *      FeedbackBusEngine; collect them into result.outcomes.
   *
   * The legacy KG API (upsertNode/upsertEdge/query/traceReasoning) is untouched —
   * existing callers (lathe dispatcher, KG consumers) are unaffected.
   *
   * @param intent  Unified intent (re-validated against DomainAGIIntentSchema).
   * @param opts    Optional per-call seam overrides for the consensus call, the
   *                feedback bus, and the three cluster engines. Production uses
   *                the defaults; tests inject deterministic fakes so no
   *                network/model call happens.
   * @returns       DomainAGIResult — decisions[], confidence rollup, outcomes[].
   */
  async orchestrate(
    intent: DomainAGIIntent,
    opts: LatheOrchestrateOptions = {},
  ): Promise<DomainAGIResult> {
    const consensusDecide = opts.consensusDecide ?? defaultConsensusDecide;
    const publishOutcome = opts.publishOutcome ?? defaultPublishOutcome;
    const featureReason = opts.featureReason ?? defaultFeatureReason;
    const predictAdjustment = opts.predictAdjustment ?? defaultPredictAdjustment;
    const safetyCheck = opts.safetyCheck ?? defaultSafetyCheck;
    // Shared cross-event group key for every outcome event this run emits.
    const jobId = `lathe-agi-job-${randomUUID()}`;

    // ── 1. Validate the intent ───────────────────────────────────────────────
    const parsed = DomainAGIIntentSchema.safeParse(intent);
    if (!parsed.success) {
      return makeFailResult({
        code: "INVALID_INTENT",
        message: `DomainAGIIntent failed validation: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
        stage: "validation",
      });
    }
    const v = parsed.data;
    if (v.domain !== "lathe") {
      return makeFailResult({
        code: "WRONG_DOMAIN",
        message: `LatheAGIKnowledgeUnificationEngine.orchestrate handles domain 'lathe' only — received '${v.domain}'. Route via ProcessIntelligenceRouterEngine.`,
        stage: "validation",
      });
    }
    // domain==='lathe' ⇒ action ∈ LatheAction (enforced by the contract's
    // superRefine cross-field check). The cast records that invariant.
    const action = v.action as LatheActionT;
    const warnings: string[] = [];

    // ── 2. Compose the LatheAGI cluster ──────────────────────────────────────
    const { iso, certain } = inferISOGroup(v.material);
    if (!certain) {
      warnings.push(
        `ISO machining group inferred as '${iso}' from material '${v.material}' (name-based heuristic — verify against the material registry).`,
      );
    }

    const firstFeature = v.features[0];
    const tolUm = typeof firstFeature?.tolerance_um === "number" ? firstFeature.tolerance_um : undefined;
    const raUm = typeof firstFeature?.surface_finish_ra_um === "number" ? firstFeature.surface_finish_ra_um : undefined;

    let sfResult: AGIReasonResult;
    let ptpResult: AGIReasonResult;
    try {
      sfResult = featureReason({
        feature: "speed_feed",
        context: { iso_group: iso },
      });
      ptpResult = featureReason({
        feature: "print_to_program",
        context: {
          iso_group: iso,
          feature_type: firstFeature?.kind ?? action,
          // Only forward a tolerance/Ra when positive — the FeatureBridge
          // reasoner throws on a non-positive tolerance, so a feature carrying
          // tolerance_um=0 ("no tolerance") must fall through to its default.
          ...(tolUm !== undefined && tolUm > 0 ? { tolerance_mm: tolUm / 1000 } : {}),
          ...(raUm !== undefined && raUm > 0 ? { ra_um_target: raUm } : {}),
        },
      });
    } catch (err) {
      return makeFailResult({
        code: "REASONING_FAILED",
        message: `LatheAGIFeatureBridgeEngine.reason threw during orchestration: ${err instanceof Error ? err.message : String(err)}`,
        stage: "reasoning",
      });
    }

    // Guard fail-loud rather than assume the bridge populated every field — a
    // future refactor must not yield a silently empty DomainAGIResult (R12).
    const sfPred = sfResult.prediction;
    const ptpPred = ptpResult.prediction;
    const baseVc = typeof sfPred.vc_m_min === "number" ? sfPred.vc_m_min : NaN;
    const baseFz = typeof sfPred.fz_mm === "number" ? sfPred.fz_mm : NaN;
    const baseAp = typeof sfPred.ap_mm === "number" ? sfPred.ap_mm : NaN;
    const strategy = typeof ptpPred.strategy === "string" ? ptpPred.strategy : "";
    if (!Number.isFinite(baseVc) || !Number.isFinite(baseFz) || !Number.isFinite(baseAp) || strategy === "") {
      return makeFailResult({
        code: "REASONING_INCOMPLETE",
        message: "LatheAGIFeatureBridgeEngine.reason returned no usable speed/feed or strategy prediction — cannot build decisions.",
        stage: "reasoning",
      });
    }

    // ContinuousLearning EWMA feed adjustment (1.0 = neutral / unseen slot).
    const learningKey = `${v.material}|${action}`;
    const learningMultiplier = predictAdjustment("speed_feed", learningKey);
    const adjustedFz = Number((baseFz * learningMultiplier).toFixed(4));
    if (learningMultiplier !== 1.0) {
      warnings.push(
        `ContinuousLearning adjusted feed fz ${baseFz} -> ${adjustedFz} mm/rev (EWMA multiplier ${learningMultiplier}, slot '${learningKey}').`,
      );
    }

    // ── 3. SafetyContainment validates the speed/feed candidate ───────────────
    const safety = safetyCheck({
      category: "physics",
      speed_feed: { iso_group: iso, vc_m_min: baseVc, fz_mm: adjustedFz, ap_mm: baseAp },
    });
    if (!safety.passed) {
      const blockers = safety.checks
        .filter((c) => c.severity === "hard")
        .map((c) => c.message)
        .join("; ");
      return makeFailResult({
        code: "SAFETY_FLOOR_VIOLATED",
        message: `LatheAGISafetyContainmentEngine blocked the speed/feed candidate: ${blockers}`,
        stage: "safety_containment",
      });
    }
    for (const c of safety.checks) {
      if (c.severity === "soft") warnings.push(`Safety warning: ${c.message}`);
    }

    // ── 4. Lift tool / strategy / feed picks ─────────────────────────────────
    const toolSel = latheToolPick(action);
    const feedPick = `vc=${baseVc} fz=${adjustedFz}`;

    interface Pick {
      kind: ConsensusDecisionKind;
      enginePick: string;
      options: string[];
      detail: unknown;
      confidence: number;
      rationale: string;
    }
    const picks: Pick[] = [
      {
        kind: "tool",
        enginePick: toolSel.pick,
        options: [toolSel.pick, ...toolSel.alternatives],
        detail: { insert: toolSel.pick, action, iso_group: iso },
        confidence: LATHE_TOOL_HEURISTIC_CONFIDENCE,
        rationale: toolSel.rationale,
      },
      {
        kind: "strategy",
        enginePick: strategy,
        options: [strategy, strategy === "finish_single_pass" ? "rough_then_finish" : "finish_single_pass"],
        detail: ptpResult.prediction,
        confidence: ptpResult.confidence,
        rationale: ptpResult.explanation,
      },
      {
        kind: "feed",
        enginePick: feedPick,
        options: [
          feedPick,
          `vc=${Math.round(baseVc * 0.85)} fz=${adjustedFz}`,
          `vc=${Math.round(baseVc * 1.15)} fz=${adjustedFz}`,
        ],
        detail: {
          vc_m_min: baseVc,
          fz_mm: adjustedFz,
          ap_mm: baseAp,
          fc_n: sfPred.fc_n,
          tool_life_min: sfPred.tool_life_min,
          learning_multiplier: learningMultiplier,
        },
        confidence: sfResult.confidence,
        rationale: `${sfResult.explanation} SafetyContainment-validated within the ${iso} physics envelope.`,
      },
    ];

    // ── 5. Build decisions — consensus-gated when intent.consensusRequired ────
    const decisions: DomainAGIResult["decisions"] = [];
    const outcomes: OutcomeEvent[] = [];

    for (const pick of picks) {
      let confidence = pick.confidence;
      let source = "LatheAGIKnowledgeUnificationEngine.orchestrate";
      let rationale = pick.rationale;
      let selected = pick.enginePick;
      let consensusOverride = false;
      let consensusAuditId: string | undefined;
      let alternatives: { value: unknown; confidence: number; rejected_reason?: string }[] | undefined;

      if (v.consensusRequired) {
        try {
          const verdict = await consensusDecide({
            decisionKind: pick.kind,
            question: `For a ${action} operation in ${v.material}, which ${pick.kind} pick is optimal? Engine recommends: ${pick.enginePick}.`,
            options: pick.options,
          });
          source = `consensus_decide:${verdict.voters.length > 0 ? verdict.voters.join("+") : "no-voters"}`;
          confidence = verdict.confidence;
          // Only surface a consensus_audit_id when the seam provides a REAL one
          // (the production default leaves it unset — see LatheConsensusVerdict).
          if (verdict.auditId) consensusAuditId = verdict.auditId;
          alternatives = pick.options
            .filter((o) => o !== verdict.answer)
            .map((o) => ({ value: o, confidence: 0, rejected_reason: "not selected by consensus vote" }));
          if (verdict.answer !== pick.enginePick) {
            // Consensus replaced the engine's unilateral decision (P0-U03 mandate).
            consensusOverride = true;
            selected = verdict.answer;
            warnings.push(
              `Consensus overrode the ${pick.kind} pick: engine='${pick.enginePick}' -> consensus='${verdict.answer}'.`,
            );
            rationale = `Consensus vote (${source}) selected '${verdict.answer}' over engine pick '${pick.enginePick}'.`;
          }
        } catch (err) {
          warnings.push(
            `Consensus call failed for the ${pick.kind} pick — fell back to the engine's unilateral pick (${err instanceof Error ? err.message : String(err)}).`,
          );
        }
      }

      // Uniform Decision.value shape — identical whether or not consensus ran.
      const value: LatheDecisionValue = {
        selected,
        enginePick: pick.enginePick,
        detail: pick.detail,
        consensusOverride,
      };

      decisions.push({
        kind: pick.kind,
        value,
        confidence,
        source,
        rationale,
        ...(alternatives ? { alternatives } : {}),
        ...(consensusAuditId ? { consensus_audit_id: consensusAuditId } : {}),
      });

      // ── Emit outcome event to the MS1 feedback bus ─────────────────────────
      // Per-decision lineage_id (recommendation→outcome pairing key); shared
      // job_id groups every event from this orchestrate run.
      const event = makeOutcomeEvent({
        intent: v,
        lineageId: `lathe-agi-rec-${randomUUID()}`,
        jobId,
        engineName: "LatheAGIKnowledgeUnificationEngine",
        domain: "lathe",
        decisionKind: pick.kind,
        value,
        confidence,
        ...(consensusAuditId ? { consensusAuditId } : {}),
      });
      outcomes.push(event);
      try {
        publishOutcome(event);
      } catch (err) {
        warnings.push(
          `Outcome event for the ${pick.kind} decision could not be published to the feedback bus (${err instanceof Error ? err.message : String(err)}).`,
        );
      }
    }

    // Pipeline-level confidence — joint probability of the serial picks
    // (rollupJointConfidence, kit P1-U01). Edge: a consensus call that returns
    // 0 confidence (all voices down) zeroes the rollup — intentional (no
    // consensus ⇒ no pipeline confidence); a downstream gate should treat a 0
    // here as "re-run", not "discard the picks".
    const confidence = rollupJointConfidence(decisions);

    return {
      schemaVersion: DOMAIN_AGI_CONTRACT_VERSION,
      success: true,
      decisions,
      confidence,
      outcomes,
      warnings,
    };
  }

  // failResult + buildOutcomeEvent removed in P1-U03 — see makeFailResult +
  // makeOutcomeEvent in domainAGIAdapterKit.ts (P1-U01).

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
