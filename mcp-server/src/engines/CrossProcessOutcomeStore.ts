/**
 * CrossProcessOutcomeStore — event-sourced outcome ledger for the 5 XPROC
 * bridges (XPROC-SFC, XPROC-POST, XPROC-FEAT, XPROC-AI, XPROC-ROUTER).
 *
 * Every bridge invocation is logged here with full request/response context
 * plus eventual outcome (success / failure / operator override / pending).
 * Downstream Tier-1 neural engines read from this store as their training
 * signal source: the neural learner trains on classification accuracy, the
 * transfer engine looks up similar past jobs across processes, the explainer
 * computes feature importance from observed outcomes.
 *
 * Storage:
 *   - In-memory ring buffer (capacity-bounded, default 10,000 events)
 *   - Append-only JSONL persistence at the configured store_path
 *   - Each event carries a schemaVersion for forward-compat migration
 *   - record() and recordOutcome() are O(1) append; query/retrieveSimilar
 *     are O(N) over the active window
 *
 * Concurrency:
 *   - In-process thread safety: JS event loop guarantees single-writer
 *   - Cross-process: each consumer must hold the file open in append mode;
 *     we don't lock — the store is intended for single-server use, with
 *     cross-shop sharing handled by the federated aggregator (Tier-1 engine 5)
 *
 * Three pure entry points:
 *   1. record(event) — append a bridge-invocation event, returns event id
 *   2. recordOutcome(id, outcome) — attach outcome to an existing event
 *   3. retrieveSimilar(context, k) — k-nearest historical events by similarity
 *
 * Plus: query(), stats(), replay(), clear() (test-only), and capacity
 * management via setCapacity().
 *
 * @engine CrossProcessOutcomeStore
 * @milestone XPROC-NEURAL-T1-01
 * @see CrossProcessNeuralLearningEngine — primary consumer (T1-02)
 * @see CrossProcessTransferLearningEngine — similarity consumer (T1-03)
 * @see CrossProcessAttentionExplainEngine — calibration monitor (T1-04)
 * @see CrossProcessAGIBridge — federated layer (T1-05)
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
// XPROC-NEURAL-OPTIMIZE/U-NN-LOOP02: emit closed-loop events as outcomes land.
// Subscribers (NN auto-trainer, memory consolidator, P2P feedback) wire here.
// Direct import (no cycle): FeedbackBusEngine has no PRISM-side dependencies.
import { feedbackBusEngine } from "./FeedbackBusEngine.js";

// ============================================================================
// CONSTANTS
// ============================================================================

export const OUTCOME_BRIDGES = ["sf", "post", "feature", "ai", "router"] as const;
export type OutcomeBridge = (typeof OUTCOME_BRIDGES)[number];

export const OUTCOME_PROCESSES = ["mill", "lathe", "wedm"] as const;
export type OutcomeProcess = (typeof OUTCOME_PROCESSES)[number];

export const OUTCOME_KINDS = ["success", "failure", "operator_override", "pending"] as const;
export type OutcomeKind = (typeof OUTCOME_KINDS)[number];

export const SCHEMA_VERSION = "1.0";

const DEFAULT_CAPACITY = 10_000;
const MIN_CAPACITY = 100;
const MAX_CAPACITY = 1_000_000;

// Similarity weighting for retrieveSimilar — categorical mismatches dominate
// (a different process is a complete mismatch regardless of numeric proximity)
const SIM_WEIGHT_PROCESS = 5.0;
const SIM_WEIGHT_BRIDGE = 1.0;
const SIM_WEIGHT_MATERIAL = 3.0;
const SIM_WEIGHT_TOOL_MATERIAL = 2.0;
const SIM_WEIGHT_MACHINE_FAMILY = 1.5;
const SIM_WEIGHT_OPERATION = 2.0;
const SIM_WEIGHT_NUMERIC = 1.0; // applied to each numeric distance term

// ============================================================================
// TYPES
// ============================================================================

/**
 * Numeric request fields that drive similarity ranking. All optional —
 * absent fields contribute zero distance (treated as "don't care").
 */
export interface OutcomeNumericFeatures {
  tool_diameter_mm?: number;
  depth_of_cut_mm?: number;
  workpiece_thickness_mm?: number;
  target_ra_um?: number;
  spindle_rpm?: number;
  feed_rate_mm_min?: number;
  cutting_speed_m_min?: number;
}

/**
 * Categorical context — keys used both for query filtering and for
 * similarity scoring. Free-form strings: the store does not validate
 * the value space (different shops use different material code systems).
 */
export interface OutcomeCategoricalFeatures {
  material?: string;
  tool_material?: string;
  machine_family?: string;
  operation?: string;
  feature?: string;
  controller?: string;
  customer?: string;
  quality_tier?: "aerospace" | "medical" | "precision" | "general" | string;
}

export interface OutcomeRequestSummary
  extends OutcomeCategoricalFeatures,
    OutcomeNumericFeatures {
  intent?: string;
}

export interface OutcomeResponseSummary {
  /** Primary engine output identifier — e.g. "mill" classification, "rough" pass, "G54" wcs */
  primary_output?: string;
  success?: boolean;
  warnings_count?: number;
  /** Per-bridge metrics actually returned (cycle_time, mrr, current_A, etc.) */
  metrics?: Record<string, number>;
}

export interface OutcomeOperator {
  id?: string;
  skill_level?: "beginner" | "intermediate" | "expert";
  override_reason?: string;
}

export interface OutcomeRecord {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  ts: string;
  bridge: OutcomeBridge;
  process: OutcomeProcess;
  request_summary: OutcomeRequestSummary;
  response_summary: OutcomeResponseSummary;
  outcome?: {
    kind: OutcomeKind;
    failure_mode?: string;
    /** Actual measured values from shop floor (Ra, cycle time, breakage event, etc.) */
    actual_metrics?: Record<string, number>;
    notes?: string;
  };
  operator?: OutcomeOperator;
}

export interface RecordEventInput {
  bridge: OutcomeBridge;
  process: OutcomeProcess;
  request_summary?: OutcomeRequestSummary;
  response_summary?: OutcomeResponseSummary;
  outcome?: OutcomeRecord["outcome"];
  operator?: OutcomeOperator;
}

export interface OutcomeQueryFilter {
  bridge?: OutcomeBridge;
  process?: OutcomeProcess;
  material?: string;
  customer?: string;
  outcome_kind?: OutcomeKind;
  /** ISO timestamp lower bound (inclusive) */
  since?: string;
  /** ISO timestamp upper bound (exclusive) */
  until?: string;
  /** Maximum records to return (after sort by ts desc) */
  limit?: number;
}

export interface SimilarityResult {
  record: OutcomeRecord;
  /** Distance ∈ [0, ∞) — lower = more similar; 0 = exact categorical+numeric match */
  distance: number;
}

export interface OutcomeStats {
  total: number;
  by_bridge: Record<OutcomeBridge, number>;
  by_process: Record<OutcomeProcess, number>;
  by_outcome_kind: Record<OutcomeKind, number>;
  pending_count: number;
  capacity: number;
  oldest_ts?: string;
  newest_ts?: string;
}

// ============================================================================
// ENGINE
// ============================================================================

export class CrossProcessOutcomeStore {
  private events: OutcomeRecord[] = [];
  private byId: Map<string, number> = new Map();
  private capacity: number = DEFAULT_CAPACITY;
  private storePath: string | null = null;
  private nextId = 1;

  /**
   * Record a new bridge invocation event. Outcome may be omitted (defaults
   * to "pending") and attached later via recordOutcome().
   *
   * Throws on:
   *   - missing or unknown bridge
   *   - missing or unknown process
   *   - non-finite numeric feature values
   *   - outcome.kind outside OUTCOME_KINDS
   *
   * @param input — bridge invocation context
   * @returns the assigned event id (use for recordOutcome later)
   */
  record(input: RecordEventInput): string {
    if (!input || typeof input !== "object") {
      throw new Error("CrossProcessOutcomeStore.record: input object required");
    }
    if (!(OUTCOME_BRIDGES as readonly string[]).includes(input.bridge)) {
      throw new Error(
        `CrossProcessOutcomeStore.record: bridge "${String(input.bridge)}" not in [${OUTCOME_BRIDGES.join(", ")}]`,
      );
    }
    if (!(OUTCOME_PROCESSES as readonly string[]).includes(input.process)) {
      throw new Error(
        `CrossProcessOutcomeStore.record: process "${String(input.process)}" not in [${OUTCOME_PROCESSES.join(", ")}]`,
      );
    }
    validateNumericFeatures(input.request_summary);
    if (input.outcome) {
      validateOutcomeKind(input.outcome.kind);
    }

    const id = `evt-${this.nextId++}`;
    const record: OutcomeRecord = {
      schemaVersion: SCHEMA_VERSION,
      id,
      ts: new Date().toISOString(),
      bridge: input.bridge,
      process: input.process,
      request_summary: input.request_summary ?? {},
      response_summary: input.response_summary ?? {},
      outcome: input.outcome ?? { kind: "pending" },
      operator: input.operator,
    };
    this.events.push(record);
    this.byId.set(id, this.events.length - 1);
    this.enforceCapacity();
    // U-NN-LOOP02: announce the new outcome to the feedback graph. Fan-out
    // is microtask-async — never blocks record(). Subscriber crashes are
    // isolated by the bus; nothing here can corrupt the ledger.
    feedbackBusEngine.publish("outcome.recorded", {
      id,
      bridge: record.bridge,
      process: record.process,
      outcomeKind: record.outcome?.kind ?? "pending",
      record,
    });
    return id;
  }

  /**
   * Attach (or replace) the outcome on an existing event. Useful for the
   * pending → success/failure transition once shop-floor results arrive.
   *
   * Throws on unknown id or invalid outcome.kind.
   *
   * @param id — event id from record()
   * @param outcome — outcome payload
   * @returns true if updated, false if id was unknown
   */
  recordOutcome(id: string, outcome: NonNullable<OutcomeRecord["outcome"]>): boolean {
    if (typeof id !== "string" || id.length === 0) {
      throw new Error("CrossProcessOutcomeStore.recordOutcome: id required");
    }
    if (!outcome || typeof outcome !== "object") {
      throw new Error("CrossProcessOutcomeStore.recordOutcome: outcome required");
    }
    validateOutcomeKind(outcome.kind);
    const idx = this.byId.get(id);
    if (idx === undefined) return false;
    const existing = this.events[idx];
    const updated = { ...existing, outcome };
    this.events[idx] = updated;
    // U-NN-LOOP02: pending → terminal transition is the signal the neural
    // learner trains on. Emit only when the outcome.kind actually transitioned
    // (i.e. previous was 'pending' or different) to avoid replay noise.
    const prevKind = existing.outcome?.kind ?? "pending";
    if (prevKind !== outcome.kind) {
      feedbackBusEngine.publish("outcome.completed", {
        id,
        bridge: updated.bridge,
        process: updated.process,
        previousKind: prevKind,
        outcomeKind: outcome.kind,
        record: updated,
      });
    }
    return true;
  }

  /**
   * Filter the active window. All filter fields are optional and combine
   * with AND semantics. Results are returned newest-first; pass `limit`
   * to cap the result set.
   *
   * @param filter — optional filter spec
   * @returns matching records, newest first
   */
  query(filter: OutcomeQueryFilter = {}): OutcomeRecord[] {
    if (filter.outcome_kind !== undefined) {
      validateOutcomeKind(filter.outcome_kind);
    }
    let out = this.events.slice();
    if (filter.bridge) out = out.filter((e) => e.bridge === filter.bridge);
    if (filter.process) out = out.filter((e) => e.process === filter.process);
    if (filter.material) {
      const m = filter.material.toLowerCase();
      out = out.filter((e) => e.request_summary.material?.toLowerCase() === m);
    }
    if (filter.customer) {
      const c = filter.customer.toLowerCase();
      out = out.filter((e) => e.request_summary.customer?.toLowerCase() === c);
    }
    if (filter.outcome_kind) {
      out = out.filter((e) => e.outcome?.kind === filter.outcome_kind);
    }
    if (filter.since) {
      const lb = filter.since;
      out = out.filter((e) => e.ts >= lb);
    }
    if (filter.until) {
      const ub = filter.until;
      out = out.filter((e) => e.ts < ub);
    }
    out.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
    if (filter.limit !== undefined) {
      if (!Number.isFinite(filter.limit) || filter.limit < 0) {
        throw new Error(
          "CrossProcessOutcomeStore.query: limit must be a non-negative finite number",
        );
      }
      out = out.slice(0, Math.floor(filter.limit));
    }
    return out;
  }

  /**
   * Find the k records most similar to the given context. Similarity is a
   * weighted sum of categorical Hamming distance + numeric Euclidean
   * distance over normalized features.
   *
   * Categorical mismatches dominate — a different process can never be
   * more similar than a same-process record with very different numerics.
   *
   * Throws on non-finite k or k < 0.
   *
   * @param context — partial categorical + numeric features to match
   * @param k — top-k count (default 5)
   * @returns sorted-ascending-by-distance results (most similar first)
   */
  retrieveSimilar(
    context: OutcomeCategoricalFeatures & OutcomeNumericFeatures & { process?: OutcomeProcess; bridge?: OutcomeBridge },
    k: number = 5,
  ): SimilarityResult[] {
    if (typeof k !== "number" || !Number.isFinite(k) || k < 0) {
      throw new Error(
        "CrossProcessOutcomeStore.retrieveSimilar: k must be a non-negative finite number",
      );
    }
    if (!context || typeof context !== "object") {
      throw new Error("CrossProcessOutcomeStore.retrieveSimilar: context object required");
    }
    validateNumericFeatures(context);
    const scored: SimilarityResult[] = this.events.map((record) => ({
      record,
      distance: computeDistance(context, record),
    }));
    scored.sort((a, b) => a.distance - b.distance);
    return scored.slice(0, Math.floor(k));
  }

  /**
   * Aggregate counters by bridge, process, and outcome kind.
   * @returns OutcomeStats snapshot
   */
  stats(): OutcomeStats {
    const byBridge = blankBridgeCounter();
    const byProcess = blankProcessCounter();
    const byOutcomeKind = blankOutcomeKindCounter();
    let pending = 0;
    let oldest: string | undefined;
    let newest: string | undefined;
    for (const e of this.events) {
      byBridge[e.bridge] += 1;
      byProcess[e.process] += 1;
      const kind = e.outcome?.kind ?? "pending";
      byOutcomeKind[kind] += 1;
      if (kind === "pending") pending += 1;
      if (oldest === undefined || e.ts < oldest) oldest = e.ts;
      if (newest === undefined || e.ts > newest) newest = e.ts;
    }
    return {
      total: this.events.length,
      by_bridge: byBridge,
      by_process: byProcess,
      by_outcome_kind: byOutcomeKind,
      pending_count: pending,
      capacity: this.capacity,
      oldest_ts: oldest,
      newest_ts: newest,
    };
  }

  /**
   * Stream every event through the handler in chronological order. Useful
   * for replaying the log into a downstream consumer (neural trainer,
   * federated aggregator, etc.).
   *
   * @param handler — invoked once per event in ts-ascending order
   */
  replay(handler: (event: OutcomeRecord) => void): void {
    if (typeof handler !== "function") {
      throw new Error("CrossProcessOutcomeStore.replay: handler must be a function");
    }
    const sorted = this.events.slice().sort((a, b) => (a.ts < b.ts ? -1 : 1));
    for (const e of sorted) handler(e);
  }

  /**
   * Adjust the in-memory retention capacity. The oldest events are
   * dropped if the new capacity is smaller than the current event count.
   *
   * Throws on capacity outside [MIN_CAPACITY, MAX_CAPACITY].
   *
   * @param newCapacity — non-zero finite event capacity
   */
  setCapacity(newCapacity: number): void {
    if (
      typeof newCapacity !== "number" ||
      !Number.isFinite(newCapacity) ||
      newCapacity < MIN_CAPACITY ||
      newCapacity > MAX_CAPACITY
    ) {
      throw new Error(
        `CrossProcessOutcomeStore.setCapacity: capacity must be a finite number in [${MIN_CAPACITY}, ${MAX_CAPACITY}]`,
      );
    }
    this.capacity = Math.floor(newCapacity);
    this.enforceCapacity();
  }

  /**
   * Drop every in-memory event and reset the id counter.
   * Test-only: production code should never call this on a populated store.
   */
  clear(): void {
    this.events = [];
    this.byId.clear();
    this.nextId = 1;
  }

  /** @returns current event count (≤ capacity) */
  size(): number {
    return this.events.length;
  }

  /**
   * Configure on-disk persistence. After this call, every record() also
   * appends a JSONL line to `path`. Existing on-disk events at `path` are
   * loaded into memory (subject to capacity).
   *
   * @param storePath — absolute or relative file path for the JSONL log
   */
  async configureStorePath(storePath: string): Promise<void> {
    if (typeof storePath !== "string" || storePath.length === 0) {
      throw new Error("CrossProcessOutcomeStore.configureStorePath: storePath required");
    }
    this.storePath = path.resolve(storePath);
    const dir = path.dirname(this.storePath);
    await fs.mkdir(dir, { recursive: true });
    try {
      const raw = await fs.readFile(this.storePath, "utf-8");
      for (const line of raw.split(/\r?\n/)) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line) as OutcomeRecord;
          if (parsed.schemaVersion !== SCHEMA_VERSION) continue;
          this.events.push(parsed);
          this.byId.set(parsed.id, this.events.length - 1);
          // Bump nextId past any loaded id of the form "evt-N"
          const m = parsed.id.match(/^evt-(\d+)$/);
          if (m) {
            const n = Number(m[1]);
            if (Number.isFinite(n) && n >= this.nextId) this.nextId = n + 1;
          }
        } catch {
          // Skip malformed lines silently — corrupted log shouldn't crash startup
        }
      }
      this.enforceCapacity();
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code !== "ENOENT") throw err;
      // ENOENT is fine — fresh store
    }
  }

  /**
   * Persist a single record to disk. Called automatically after record()
   * if a store path is configured. Public for tests + manual flushing.
   */
  async persistEvent(eventId: string): Promise<void> {
    if (!this.storePath) return;
    const idx = this.byId.get(eventId);
    if (idx === undefined) return;
    const line = JSON.stringify(this.events[idx]) + "\n";
    await fs.appendFile(this.storePath, line, { encoding: "utf-8" });
  }

  // ── private ────────────────────────────────────────────────────────────

  private enforceCapacity(): void {
    while (this.events.length > this.capacity) {
      const dropped = this.events.shift();
      if (dropped) this.byId.delete(dropped.id);
    }
    // Rebuild index after ring-buffer drop (positions shifted)
    if (this.byId.size !== this.events.length) {
      this.byId.clear();
      for (let i = 0; i < this.events.length; i++) {
        this.byId.set(this.events[i].id, i);
      }
    }
  }
}

/**
 * Process-wide singleton. Engines that consume the outcome store import
 * this rather than constructing their own — single source of truth.
 */
export const crossProcessOutcomeStore = new CrossProcessOutcomeStore();

// ============================================================================
// HELPERS (module-private)
// ============================================================================

// Exported (INFRA-NEURAL-LEDGER-MS1/P0-U01, 2026-05-12) so the boundary-layer
// schema (mcp-server/src/schemas/outcomeEventSchema.ts) can validate identical
// numeric features without duplicating the canonical list. Single source of
// truth — adding a key here automatically enforces it in both runtime and
// parse-time validation.
export const NUMERIC_FEATURE_KEYS = [
  "tool_diameter_mm",
  "depth_of_cut_mm",
  "workpiece_thickness_mm",
  "target_ra_um",
  "spindle_rpm",
  "feed_rate_mm_min",
  "cutting_speed_m_min",
] as const;
export type NumericFeatureKey = (typeof NUMERIC_FEATURE_KEYS)[number];

function validateNumericFeatures(features: Record<string, unknown> | undefined): void {
  if (!features) return;
  for (const k of NUMERIC_FEATURE_KEYS) {
    const v = features[k];
    if (v === undefined) continue;
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new Error(
        `CrossProcessOutcomeStore: numeric feature "${k}" must be a finite number (got ${String(v)})`,
      );
    }
  }
}

function validateOutcomeKind(kind: unknown): asserts kind is OutcomeKind {
  if (!(OUTCOME_KINDS as readonly string[]).includes(kind as string)) {
    throw new Error(
      `CrossProcessOutcomeStore: outcome.kind "${String(kind)}" not in [${OUTCOME_KINDS.join(", ")}]`,
    );
  }
}

function blankBridgeCounter(): Record<OutcomeBridge, number> {
  return { sf: 0, post: 0, feature: 0, ai: 0, router: 0 };
}

function blankProcessCounter(): Record<OutcomeProcess, number> {
  return { mill: 0, lathe: 0, wedm: 0 };
}

function blankOutcomeKindCounter(): Record<OutcomeKind, number> {
  return { success: 0, failure: 0, operator_override: 0, pending: 0 };
}

/**
 * Distance between a query context and a stored record. Categorical
 * mismatches add their fixed weight; numeric distances are normalized by
 * the magnitude of the larger of the two values to keep them bounded.
 */
function computeDistance(
  context: OutcomeCategoricalFeatures & OutcomeNumericFeatures & { process?: OutcomeProcess; bridge?: OutcomeBridge },
  record: OutcomeRecord,
): number {
  let distance = 0;

  if (context.process !== undefined && record.process !== context.process) {
    distance += SIM_WEIGHT_PROCESS;
  }
  if (context.bridge !== undefined && record.bridge !== context.bridge) {
    distance += SIM_WEIGHT_BRIDGE;
  }

  const reqCat: OutcomeCategoricalFeatures = record.request_summary;
  if (categoricalMismatch(context.material, reqCat.material)) distance += SIM_WEIGHT_MATERIAL;
  if (categoricalMismatch(context.tool_material, reqCat.tool_material))
    distance += SIM_WEIGHT_TOOL_MATERIAL;
  if (categoricalMismatch(context.machine_family, reqCat.machine_family))
    distance += SIM_WEIGHT_MACHINE_FAMILY;
  if (categoricalMismatch(context.operation, reqCat.operation)) distance += SIM_WEIGHT_OPERATION;

  const reqNum: OutcomeNumericFeatures = record.request_summary;
  for (const k of [
    "tool_diameter_mm",
    "depth_of_cut_mm",
    "workpiece_thickness_mm",
    "target_ra_um",
    "spindle_rpm",
    "feed_rate_mm_min",
    "cutting_speed_m_min",
  ] as const) {
    const a = (context as Record<string, unknown>)[k] as number | undefined;
    const b = reqNum[k];
    if (a === undefined || b === undefined) continue;
    const denom = Math.max(Math.abs(a), Math.abs(b), 1);
    distance += (Math.abs(a - b) / denom) * SIM_WEIGHT_NUMERIC;
  }
  return distance;
}

function categoricalMismatch(a: string | undefined, b: string | undefined): boolean {
  if (a === undefined) return false;
  if (b === undefined) return true;
  return a.toLowerCase() !== b.toLowerCase();
}
