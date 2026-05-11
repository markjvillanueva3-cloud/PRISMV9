/**
 * OutcomeRLBridgeEngine — XPROC-NEURAL-CONNECT-MS0 / U-CN12
 *
 * The reinforcement-learning fan-out bridge. Closes the gap where the three
 * cross-process RL kernels — `CrossProcessRewardShaperEngine` (T4-01),
 * `CrossProcessQLearningTabularEngine` (T4-02), `CrossProcessPolicyGradientEngine`
 * (T4-03) and `CrossProcessMultiArmedBanditEngine` (T4-04) — were dispatcher-wired
 * but completely blind to the live outcome stream: every Q-update, policy step and
 * bandit pull had to be hand-fed. CN12 makes the closed loop feed them.
 *
 * Subscription topic: `outcome.completed` (terminal pending→success/failure/
 * override transitions only — same family as CN06/07/08). Each event carries the
 * full `OutcomeRecord`; the bridge turns it into an (state, action, reward) tuple
 * and fans it to all three learners.
 *
 * ── Tuple extraction ──────────────────────────────────────────────────────────
 *
 *   state  = discretizeState(record)
 *            `process|material|operation|toolMatBin|tdBin|dcBin` — a stable,
 *            length-bounded string. Free-form categoricals are sanitised + clipped;
 *            numerics are coarse-binned (4-5 buckets each) so the tabular Q-table
 *            and per-state policy θ-vectors stay small.
 *
 *   action = discretizeAction(record).actionIndex   (0 … SPEED_TIERS*FEED_TIERS-1)
 *            The *recommended cutting parameters* the system chose, mapped onto a
 *            speed×feed grid. `cutting_speed_m_min` (or spindle_rpm·π·d / 1000 as a
 *            fallback) → speedTier; `feed_rate_mm_min` → feedTier. Missing → mid
 *            tier. Also yields `armId = process|operation|a{actionIndex}` for the
 *            bandit (clipped to the engine's 128-char arm-name limit).
 *
 *   reward = CrossProcessRewardShaperEngine.shape({ event }).reward
 *            + (applyKindPrior ? KIND_PRIOR[kind] : 0)
 *            The shaper scores *parameter quality* (Ra vs target, tool-life delta,
 *            cycle-time delta, safety vetoes, operator overrides). The kind prior is
 *            a separate axis — *did the job succeed at all* — so the two are summed,
 *            not max'd: a successful job with mediocre params and a failed job that
 *            happened to predict good params are genuinely different signals. Metric
 *            values are sanitised to finite numbers before the shaper sees them, so a
 *            NaN/∞ shop-floor reading degrades to "missing field" rather than
 *            poisoning the reward.
 *
 * ── Fan-out (3 downstream calls, each independently try/catch'd) ───────────────
 *
 *   1. CrossProcessQLearningTabularEngine.update({ state, action, reward,
 *        nextState: null })   — terminal/one-step: Q(s,a) ← Q(s,a)+α·(r−Q(s,a)),
 *        i.e. a running mean of the realised reward for (state, action). Each
 *        shop-floor job is an independent decision, so there is no bootstrap target.
 *
 *   2. CrossProcessPolicyGradientEngine.step({ state, action, reward,
 *        episodeId })  then  .commit({ episodeId })   — single-step REINFORCE
 *        episode per outcome; episodeId = record.id (clipped to 128).
 *
 *   3. CrossProcessMultiArmedBanditEngine.registerArm({ armId })  (idempotent)
 *        then .update({ armId, reward })   — bandit view over the speed×feed grid
 *        partitioned by process+operation.
 *
 * Failure isolation: the feedback bus already wraps each subscriber callback in
 * try/catch; inside the handler every downstream call is *also* try/catch'd and
 * counted in `failures.<engine>` so one malformed event never disables the bridge.
 *
 * Wired:
 *   - `prism_ai` (aiReasoningDispatcher) via
 *     `xproc_rl_bridge_subscribe | _unsubscribe | _status | _configure | _stats |
 *      _reset | _replay`.
 *   - MCP server boot — `XProcNeuralAutoFireEngine.activate()` turns this bridge on
 *     alongside the other four (it is the 6th component).
 *
 * @engine OutcomeRLBridgeEngine
 * @milestone XPROC-NEURAL-CONNECT-MS0 / U-CN12
 * @see CrossProcessRewardShaperEngine
 * @see CrossProcessQLearningTabularEngine
 * @see CrossProcessPolicyGradientEngine
 * @see CrossProcessMultiArmedBanditEngine
 * @see CrossProcessOutcomeStore
 */

import { z } from "zod";
import {
  feedbackBusEngine,
  type FeedbackEvent,
  type SubscriptionHandle,
} from "./FeedbackBusEngine.js";
import { CrossProcessRewardShaperEngine } from "./CrossProcessRewardShaperEngine.js";
import { CrossProcessQLearningTabularEngine } from "./CrossProcessQLearningTabularEngine.js";
import { CrossProcessPolicyGradientEngine } from "./CrossProcessPolicyGradientEngine.js";
import { CrossProcessMultiArmedBanditEngine } from "./CrossProcessMultiArmedBanditEngine.js";
import { crossProcessOutcomeStore } from "./CrossProcessOutcomeStore.js";

// ============================================================================
// Constants
// ============================================================================

/** Reward axis #2: "did the job succeed" — summed with the param-quality reward. */
const KIND_PRIOR: Readonly<Record<string, number>> = {
  success: 0.5,
  operator_override: -0.5,
  failure: -1.0,
};

/** Terminal outcome kinds the bridge acts on (everything else is skipped). */
const TERMINAL_KINDS: ReadonlySet<string> = new Set(["success", "failure", "operator_override"]);

/** Coarse speed bins (cutting speed, m/min). Index = speedTier. */
const SPEED_BIN_EDGES: readonly number[] = [50, 100, 200, 400]; // → 5 tiers (0..4)
/** Coarse feed bins (feed rate, mm/min). Index = feedTier. */
const FEED_BIN_EDGES: readonly number[] = [50, 150, 400, 1000]; // → 5 tiers (0..4)
const SPEED_TIERS = SPEED_BIN_EDGES.length + 1; // 5
const FEED_TIERS = FEED_BIN_EDGES.length + 1; // 5
const ACTION_SPACE = SPEED_TIERS * FEED_TIERS; // 25
const MID_TIER = 2; // fallback bucket when a parameter is missing

/** Coarse tool-diameter bins (mm). */
const TOOL_DIA_BIN_EDGES: readonly number[] = [3, 6, 12, 20];
/** Coarse depth-of-cut bins (mm). */
const DOC_BIN_EDGES: readonly number[] = [0.5, 1, 2, 4];

/** Length clip for any single free-form categorical field inside the state key. */
const CAT_FIELD_MAX = 24;
/** Hard ceiling on the assembled state-key length (Q-engine schema allows 256). */
const STATE_KEY_MAX = 240;
/** Bandit arm-name limit (mirrors CrossProcessMultiArmedBanditEngine MAX_ARM_NAME_LENGTH). */
const ARM_NAME_MAX = 120;
/** episodeId limit (mirrors CrossProcessPolicyGradientEngine schema). */
const EPISODE_ID_MAX = 120;

const DEFAULT_REPLAY_LIMIT = 200;
const MAX_REPLAY_LIMIT = 100_000;

// ============================================================================
// Public types
// ============================================================================

export interface RLBridgeConfig {
  /** Add KIND_PRIOR[kind] on top of the reward-shaper output. Default true. */
  applyKindPrior: boolean;
}

export interface RLBridgeFanoutCounts {
  qlearn: number;
  policy: number;
  bandit: number;
}

export interface RLBridgeFailureCounts {
  qlearn: number;
  policy: number;
  bandit: number;
  decode: number;
}

export interface RLBridgeLastTuple {
  state: string;
  action: number;
  armId: string;
  reward: number;
  shaperReward: number;
  kindPrior: number;
  kind: string;
  process: string;
}

export interface RLBridgeStats {
  subscribed: boolean;
  total_events_seen: number;
  total_skipped_pending: number;
  total_skipped_bad_payload: number;
  total_processed: number;
  total_fanned: RLBridgeFanoutCounts;
  failures: RLBridgeFailureCounts;
  last: RLBridgeLastTuple | null;
  config: RLBridgeConfig;
}

/** Result of {@link OutcomeRLBridgeEngine.handleOutcomeRecord} — the synchronous test seam. */
export interface RLBridgeHandleResult {
  ok: boolean;
  /** "processed" — tuple extracted + fanned; "skipped_pending" / "skipped_bad_payload" otherwise. */
  status: "processed" | "skipped_pending" | "skipped_bad_payload";
  tuple: RLBridgeLastTuple | null;
  /** Which downstream learners accepted the tuple this call. */
  fanned: { qlearn: boolean; policy: boolean; bandit: boolean };
  /** Per-engine failure flags for this call. */
  failed: { qlearn: boolean; policy: boolean; bandit: boolean };
}

export interface RLBridgeReplayResult {
  ok: true;
  scanned: number;
  replayed: number;
  skipped: number;
  fanned: RLBridgeFanoutCounts;
}

export interface RLBridgeOpErr {
  ok: false;
  error: "invalid_input";
  message: string;
}

// ============================================================================
// Schemas
// ============================================================================

const ConfigureInputSchema = z.object({
  applyKindPrior: z.boolean().optional(),
});

const ReplayInputSchema = z.object({
  limit: z.number().int().min(1).max(MAX_REPLAY_LIMIT).optional(),
  process: z.enum(["mill", "lathe", "wedm"]).optional(),
});

// ============================================================================
// Pure helpers (exported for unit-testing the discretisation directly)
// ============================================================================

/** Finite-number coercion: returns x only when it is a real, finite number. */
export function coerceFinite(x: unknown): number | undefined {
  return typeof x === "number" && Number.isFinite(x) ? x : undefined;
}

/** Sanitise a free-form categorical field for embedding in a key. */
function cleanCat(v: unknown): string {
  if (typeof v !== "string" || v.length === 0) return "?";
  // Collapse whitespace + drop the key delimiter so fields can't bleed into each other.
  const s = v.trim().replace(/\s+/g, "_").replace(/\|/g, "/");
  return s.length > CAT_FIELD_MAX ? s.slice(0, CAT_FIELD_MAX) : s;
}

/** Bin a numeric into 0..edges.length using ascending edge thresholds; `miss` when absent. */
function binNumeric(value: number | undefined, edges: readonly number[], miss: number): number {
  if (value === undefined) return miss;
  for (let i = 0; i < edges.length; i++) {
    if (value < edges[i]) return i;
  }
  return edges.length;
}

interface RequestSummaryLike {
  material?: unknown;
  tool_material?: unknown;
  operation?: unknown;
  tool_diameter_mm?: unknown;
  depth_of_cut_mm?: unknown;
  spindle_rpm?: unknown;
  feed_rate_mm_min?: unknown;
  cutting_speed_m_min?: unknown;
  target_ra_um?: unknown;
}

interface OutcomeLike {
  kind?: unknown;
  failure_mode?: unknown;
  actual_metrics?: Record<string, unknown>;
}

interface ResponseSummaryLike {
  metrics?: Record<string, unknown>;
}

interface OutcomeRecordLike {
  id?: unknown;
  process?: unknown;
  request_summary?: RequestSummaryLike;
  response_summary?: ResponseSummaryLike;
  outcome?: OutcomeLike;
}

/** Build the discretised state key from a record's request context. */
export function discretizeState(record: OutcomeRecordLike): string {
  const proc = cleanCat(record.process);
  const rq = record.request_summary ?? {};
  const material = cleanCat(rq.material);
  const operation = cleanCat(rq.operation);
  const toolMat = cleanCat(rq.tool_material);
  const tdBin = binNumeric(coerceFinite(rq.tool_diameter_mm), TOOL_DIA_BIN_EDGES, 0);
  const dcBin = binNumeric(coerceFinite(rq.depth_of_cut_mm), DOC_BIN_EDGES, 0);
  const key = `${proc}|${material}|${operation}|tm:${toolMat}|td${tdBin}|dc${dcBin}`;
  return key.length > STATE_KEY_MAX ? key.slice(0, STATE_KEY_MAX) : key;
}

/** Effective cutting speed (m/min): prefer the explicit field, else derive from rpm + dia. */
function effectiveCuttingSpeed(rq: RequestSummaryLike): number | undefined {
  const cs = coerceFinite(rq.cutting_speed_m_min);
  if (cs !== undefined && cs > 0) return cs;
  const rpm = coerceFinite(rq.spindle_rpm);
  const dia = coerceFinite(rq.tool_diameter_mm);
  if (rpm !== undefined && rpm > 0 && dia !== undefined && dia > 0) {
    return (Math.PI * dia * rpm) / 1000;
  }
  return undefined;
}

/** Map the chosen cutting parameters onto a speed×feed grid → integer action + bandit arm id. */
export function discretizeAction(record: OutcomeRecordLike): { actionIndex: number; armId: string; speedTier: number; feedTier: number } {
  const rq = record.request_summary ?? {};
  const speedTier = binNumeric(effectiveCuttingSpeed(rq), SPEED_BIN_EDGES, MID_TIER);
  const feedTier = binNumeric(coerceFinite(rq.feed_rate_mm_min), FEED_BIN_EDGES, MID_TIER);
  const actionIndex = speedTier * FEED_TIERS + feedTier; // 0..ACTION_SPACE-1
  const proc = cleanCat(record.process);
  const operation = cleanCat(rq.operation);
  let armId = `${proc}|${operation}|a${actionIndex}`;
  if (armId.length > ARM_NAME_MAX) armId = armId.slice(0, ARM_NAME_MAX);
  return { actionIndex, armId, speedTier, feedTier };
}

/** Pick the first finite value found under any of the candidate keys in `bag`. */
function pickMetric(bag: Record<string, unknown> | undefined, keys: readonly string[]): number | undefined {
  if (!bag || typeof bag !== "object") return undefined;
  for (const k of keys) {
    const v = coerceFinite(bag[k]);
    if (v !== undefined) return v;
  }
  return undefined;
}

/** Build the {@link CrossProcessRewardShaperEngine} OutcomeEvent from a record. */
export function buildShaperEvent(record: OutcomeRecordLike): {
  raActualMicrometers?: number;
  raTargetMicrometers?: number;
  toolLifeActualMin?: number;
  toolLifePredictedMin?: number;
  cycleTimeActualS?: number;
  cycleTimePredictedS?: number;
  safetyVetoCount?: number;
  operatorOverrideCount?: number;
} {
  const rq = record.request_summary ?? {};
  const actual = record.outcome?.actual_metrics;
  const predicted = record.response_summary?.metrics;
  const kind = typeof record.outcome?.kind === "string" ? (record.outcome.kind as string) : "";
  const failureMode = typeof record.outcome?.failure_mode === "string" ? (record.outcome.failure_mode as string).toLowerCase() : "";

  const raActual = pickMetric(actual, ["ra_um", "surface_ra_um", "ra_actual_um", "ra"]);
  const raTarget = coerceFinite(rq.target_ra_um) ?? pickMetric(actual, ["ra_target_um", "target_ra_um"]);
  const lifeActual = pickMetric(actual, ["tool_life_min", "tool_life_actual_min", "life_min"]);
  const lifePredicted = pickMetric(predicted, ["tool_life_min", "tool_life_predicted_min", "tool_life_pred_min"]);
  const cycleActual = pickMetric(actual, ["cycle_time_s", "cycle_time_actual_s", "cycle_s"]);
  const cyclePredicted = pickMetric(predicted, ["cycle_time_s", "cycle_time_predicted_s", "cycle_time_pred_s"]);

  // Safety vetoes / operator overrides: explicit metric counts win; otherwise infer from kind.
  let safetyVeto = pickMetric(actual, ["safety_veto_count", "safety_vetoes"]);
  if (safetyVeto === undefined) {
    safetyVeto = kind === "failure" && /safety|collision|crash|gouge|overload/.test(failureMode) ? 1 : 0;
  }
  let overrideCount = pickMetric(actual, ["operator_override_count", "operator_overrides"]);
  if (overrideCount === undefined) {
    overrideCount = kind === "operator_override" ? 1 : 0;
  }

  const ev: Record<string, number> = {};
  if (raActual !== undefined) ev.raActualMicrometers = raActual;
  // raTarget alone is meaningless to the shaper (it scores the *delta*); only include it
  // when we also have an actual reading.
  if (raActual !== undefined && raTarget !== undefined && raTarget > 0) ev.raTargetMicrometers = raTarget;
  if (lifeActual !== undefined) ev.toolLifeActualMin = lifeActual;
  if (lifePredicted !== undefined && lifePredicted > 0) ev.toolLifePredictedMin = lifePredicted;
  if (cycleActual !== undefined && cycleActual >= 0) ev.cycleTimeActualS = cycleActual;
  if (cyclePredicted !== undefined && cyclePredicted > 0) ev.cycleTimePredictedS = cyclePredicted;
  ev.safetyVetoCount = Math.max(0, Math.round(safetyVeto));
  ev.operatorOverrideCount = Math.max(0, Math.round(overrideCount));
  return ev;
}

/** Compute the scalar reward (param-quality via shaper + optional kind prior). */
export function computeReward(
  record: OutcomeRecordLike,
  applyKindPrior: boolean,
): { reward: number; shaperReward: number; kindPrior: number; source: "shaper+kind_prior" | "shaper" | "kind_fallback" } {
  const kind = typeof record.outcome?.kind === "string" ? (record.outcome.kind as string) : "";
  const kindPriorValue = applyKindPrior ? (KIND_PRIOR[kind] ?? 0) : 0;
  let shaperReward = 0;
  let source: "shaper+kind_prior" | "shaper" | "kind_fallback";
  try {
    const event = buildShaperEvent(record);
    const r = CrossProcessRewardShaperEngine.shape({ event });
    if (r.ok) {
      shaperReward = Number.isFinite(r.reward) ? r.reward : 0;
      source = applyKindPrior ? "shaper+kind_prior" : "shaper";
    } else {
      // Shaper rejected the event (should be rare — every field is optional). Fall back to
      // the kind prior alone (or 0 if the prior is disabled).
      source = "kind_fallback";
    }
  } catch {
    source = "kind_fallback";
  }
  const reward = shaperReward + kindPriorValue;
  return { reward: Number.isFinite(reward) ? reward : 0, shaperReward, kindPrior: kindPriorValue, source };
}

// ============================================================================
// Engine
// ============================================================================

export class OutcomeRLBridgeEngine {
  static readonly milestone = "XPROC-NEURAL-CONNECT-MS0";
  static readonly unit = "U-CN12";

  // ──────────────────────────────────────────────────────────────────────────
  // State (module-private, reset()-able)
  // ──────────────────────────────────────────────────────────────────────────
  private static subscription: SubscriptionHandle | null = null;
  private static totalEvents = 0;
  private static skippedPending = 0;
  private static skippedBadPayload = 0;
  private static processed = 0;
  private static fannedQlearn = 0;
  private static fannedPolicy = 0;
  private static fannedBandit = 0;
  private static failQlearn = 0;
  private static failPolicy = 0;
  private static failBandit = 0;
  private static failDecode = 0;
  private static lastTuple: RLBridgeLastTuple | null = null;
  private static config: RLBridgeConfig = { applyKindPrior: true };

  // ──────────────────────────────────────────────────────────────────────────
  // Subscription lifecycle (uniform bridge contract — see CN04/06/07/08)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Subscribe to feedback-bus `outcome.completed`. Idempotent.
   * @returns `{ ok, alreadySubscribed }` — `alreadySubscribed` true if a subscription was already live.
   */
  static subscribeToOutcomes(): { ok: true; alreadySubscribed: boolean } {
    if (this.subscription !== null) return { ok: true, alreadySubscribed: true };
    this.subscription = feedbackBusEngine.subscribe("outcome.completed", (event: FeedbackEvent) => {
      try {
        this.handleOutcomeCompleted(event.payload);
      } catch {
        this.failDecode += 1;
      }
    });
    return { ok: true, alreadySubscribed: false };
  }

  /**
   * Detach the subscription. Idempotent.
   * @returns `{ ok, wasSubscribed }` — `wasSubscribed` true if a subscription was live and is now gone.
   */
  static unsubscribeFromOutcomes(): { ok: true; wasSubscribed: boolean } {
    if (this.subscription === null) return { ok: true, wasSubscribed: false };
    feedbackBusEngine.unsubscribe(this.subscription);
    this.subscription = null;
    return { ok: true, wasSubscribed: true };
  }

  /** @returns true if the bridge currently holds a live `outcome.completed` subscription. */
  static isSubscribedToOutcomes(): boolean {
    return this.subscription !== null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Config / introspection
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Update bridge config.
   * @param input `{ applyKindPrior?: boolean }`
   * @returns the validated effective config, or an `invalid_input` error object.
   */
  static configure(input: unknown): { ok: true; config: RLBridgeConfig } | RLBridgeOpErr {
    const parsed = ConfigureInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; "),
      };
    }
    if (parsed.data.applyKindPrior !== undefined) this.config.applyKindPrior = parsed.data.applyKindPrior;
    return { ok: true, config: { ...this.config } };
  }

  /** @returns a snapshot of the bridge's counters, last extracted tuple, and config. */
  static stats(): RLBridgeStats {
    return {
      subscribed: this.subscription !== null,
      total_events_seen: this.totalEvents,
      total_skipped_pending: this.skippedPending,
      total_skipped_bad_payload: this.skippedBadPayload,
      total_processed: this.processed,
      total_fanned: { qlearn: this.fannedQlearn, policy: this.fannedPolicy, bandit: this.fannedBandit },
      failures: { qlearn: this.failQlearn, policy: this.failPolicy, bandit: this.failBandit, decode: this.failDecode },
      last: this.lastTuple ? { ...this.lastTuple } : null,
      config: { ...this.config },
    };
  }

  /** @returns read-only discretisation constants (bin edges, action-space size, key limits). */
  static constants(): {
    SPEED_BIN_EDGES: number[];
    FEED_BIN_EDGES: number[];
    TOOL_DIA_BIN_EDGES: number[];
    DOC_BIN_EDGES: number[];
    ACTION_SPACE: number;
    KIND_PRIOR: Record<string, number>;
    STATE_KEY_MAX: number;
    ARM_NAME_MAX: number;
  } {
    return {
      SPEED_BIN_EDGES: [...SPEED_BIN_EDGES],
      FEED_BIN_EDGES: [...FEED_BIN_EDGES],
      TOOL_DIA_BIN_EDGES: [...TOOL_DIA_BIN_EDGES],
      DOC_BIN_EDGES: [...DOC_BIN_EDGES],
      ACTION_SPACE,
      KIND_PRIOR: { ...KIND_PRIOR },
      STATE_KEY_MAX,
      ARM_NAME_MAX,
    };
  }

  /** Reset all bridge state. Does NOT touch the downstream RL engines' state. */
  static reset(): void {
    if (this.subscription !== null) {
      feedbackBusEngine.unsubscribe(this.subscription);
      this.subscription = null;
    }
    this.totalEvents = 0;
    this.skippedPending = 0;
    this.skippedBadPayload = 0;
    this.processed = 0;
    this.fannedQlearn = 0;
    this.fannedPolicy = 0;
    this.fannedBandit = 0;
    this.failQlearn = 0;
    this.failPolicy = 0;
    this.failBandit = 0;
    this.failDecode = 0;
    this.lastTuple = null;
    this.config = { applyKindPrior: true };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Replay — bootstrap the learners from historical outcomes in the store
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Re-process the most recent terminal outcomes from {@link crossProcessOutcomeStore}
   * through the same extraction + fan-out path as the live subscription. Useful for
   * warm-starting the Q-table / policy / bandit after a fresh boot.
   *
   * @param input `{ limit?: number (default 200, max 100000), process?: "mill"|"lathe"|"wedm" }`
   * @returns `{ ok, scanned, replayed, skipped, fanned }`, or an `invalid_input` error object.
   */
  static replayFromStore(input: unknown): RLBridgeReplayResult | RLBridgeOpErr {
    const parsed = ReplayInputSchema.safeParse(input ?? {});
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; "),
      };
    }
    const limit = parsed.data.limit ?? DEFAULT_REPLAY_LIMIT;
    let records: OutcomeRecordLike[] = [];
    try {
      records = crossProcessOutcomeStore.query({
        limit,
        ...(parsed.data.process ? { process: parsed.data.process } : {}),
      }) as OutcomeRecordLike[];
    } catch {
      records = [];
    }
    const fannedBefore: RLBridgeFanoutCounts = { qlearn: this.fannedQlearn, policy: this.fannedPolicy, bandit: this.fannedBandit };
    let replayed = 0;
    let skipped = 0;
    for (const rec of records) {
      const res = this.handleOutcomeRecord(rec);
      if (res.status === "processed") replayed += 1;
      else skipped += 1;
    }
    return {
      ok: true,
      scanned: records.length,
      replayed,
      skipped,
      fanned: {
        qlearn: this.fannedQlearn - fannedBefore.qlearn,
        policy: this.fannedPolicy - fannedBefore.policy,
        bandit: this.fannedBandit - fannedBefore.bandit,
      },
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Core handler
  // ──────────────────────────────────────────────────────────────────────────

  /** Internal: decode the bus envelope, then delegate to {@link handleOutcomeRecord}. */
  private static handleOutcomeCompleted(payload: unknown): void {
    if (!payload || typeof payload !== "object") {
      this.totalEvents += 1;
      this.skippedBadPayload += 1;
      return;
    }
    const env = payload as { record?: unknown; outcomeKind?: unknown };
    this.totalEvents += 1;
    const record = env.record;
    if (!record || typeof record !== "object") {
      this.skippedBadPayload += 1;
      return;
    }
    // handleOutcomeRecord increments its own bookkeeping (processed / skipped*), but we've
    // already counted the event — call the inner shared path.
    this.processRecord(record as OutcomeRecordLike, /* countEvent */ false);
  }

  /**
   * Process one {@link OutcomeRecord}: extract (state, action, reward) and fan to the three
   * RL kernels. Synchronous — the public test seam and the replay path both use this.
   *
   * @param record an OutcomeRecord-shaped object (only `process`, `request_summary`,
   *               `response_summary`, `outcome` are read).
   * @returns {@link RLBridgeHandleResult} describing the outcome of this call.
   */
  static handleOutcomeRecord(record: unknown): RLBridgeHandleResult {
    if (!record || typeof record !== "object") {
      this.totalEvents += 1;
      this.skippedBadPayload += 1;
      return { ok: false, status: "skipped_bad_payload", tuple: null, fanned: { qlearn: false, policy: false, bandit: false }, failed: { qlearn: false, policy: false, bandit: false } };
    }
    return this.processRecord(record as OutcomeRecordLike, /* countEvent */ true);
  }

  private static processRecord(record: OutcomeRecordLike, countEvent: boolean): RLBridgeHandleResult {
    if (countEvent) this.totalEvents += 1;

    const kind = typeof record.outcome?.kind === "string" ? (record.outcome.kind as string) : "";
    if (!TERMINAL_KINDS.has(kind)) {
      this.skippedPending += 1;
      return { ok: true, status: "skipped_pending", tuple: null, fanned: { qlearn: false, policy: false, bandit: false }, failed: { qlearn: false, policy: false, bandit: false } };
    }

    const process = typeof record.process === "string" && record.process.length > 0 ? record.process : "?";
    const state = discretizeState(record);
    const { actionIndex, armId } = discretizeAction(record);
    const { reward, shaperReward, kindPrior } = computeReward(record, this.config.applyKindPrior);
    const episodeIdRaw = typeof record.id === "string" && record.id.length > 0 ? record.id : `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const episodeId = episodeIdRaw.length > EPISODE_ID_MAX ? episodeIdRaw.slice(0, EPISODE_ID_MAX) : episodeIdRaw;

    const fanned = { qlearn: false, policy: false, bandit: false };
    const failed = { qlearn: false, policy: false, bandit: false };

    // 1. Tabular Q-learning — one-step / terminal (nextState = null ⇒ no bootstrap).
    try {
      const r = CrossProcessQLearningTabularEngine.update({ state, action: actionIndex, reward, nextState: null });
      if (r && (r as { ok?: boolean }).ok) {
        this.fannedQlearn += 1;
        fanned.qlearn = true;
      } else {
        this.failQlearn += 1;
        failed.qlearn = true;
      }
    } catch {
      this.failQlearn += 1;
      failed.qlearn = true;
    }

    // 2. Policy gradient — single-step REINFORCE episode (step then commit).
    try {
      const stepRes = CrossProcessPolicyGradientEngine.step({ state, action: actionIndex, reward, episodeId });
      if (stepRes && (stepRes as { ok?: boolean }).ok) {
        const commitRes = CrossProcessPolicyGradientEngine.commit({ episodeId });
        if (commitRes && (commitRes as { ok?: boolean }).ok) {
          this.fannedPolicy += 1;
          fanned.policy = true;
        } else {
          this.failPolicy += 1;
          failed.policy = true;
        }
      } else {
        this.failPolicy += 1;
        failed.policy = true;
      }
    } catch {
      this.failPolicy += 1;
      failed.policy = true;
    }

    // 3. Multi-armed bandit — register arm (idempotent) then update with the realised reward.
    try {
      CrossProcessMultiArmedBanditEngine.registerArm({ armId });
      const r = CrossProcessMultiArmedBanditEngine.update({ armId, reward });
      if (r && (r as { ok?: boolean }).ok) {
        this.fannedBandit += 1;
        fanned.bandit = true;
      } else {
        this.failBandit += 1;
        failed.bandit = true;
      }
    } catch {
      this.failBandit += 1;
      failed.bandit = true;
    }

    this.processed += 1;
    const tuple: RLBridgeLastTuple = { state, action: actionIndex, armId, reward, shaperReward, kindPrior, kind, process };
    this.lastTuple = tuple;
    return { ok: true, status: "processed", tuple: { ...tuple }, fanned, failed };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Test seam
  // ──────────────────────────────────────────────────────────────────────────
  /** @internal — for tests only. Synchronously feeds a bus-envelope-shaped payload. */
  static __testHandle(payload: unknown): void {
    this.handleOutcomeCompleted(payload);
  }
}

export const outcomeRLBridgeEngine = OutcomeRLBridgeEngine;

// ============================================================================
// Dispatcher convenience wrapper
// ============================================================================

export function outcomeRLBridgeDispatch(action: string, params: Record<string, unknown>): unknown {
  switch (action) {
    case "xproc_rl_bridge_subscribe":
      return OutcomeRLBridgeEngine.subscribeToOutcomes();
    case "xproc_rl_bridge_unsubscribe":
      return OutcomeRLBridgeEngine.unsubscribeFromOutcomes();
    case "xproc_rl_bridge_status":
      return { ok: true, subscribed: OutcomeRLBridgeEngine.isSubscribedToOutcomes() };
    case "xproc_rl_bridge_configure":
      return OutcomeRLBridgeEngine.configure(params);
    case "xproc_rl_bridge_stats":
      return { ok: true, stats: OutcomeRLBridgeEngine.stats() };
    case "xproc_rl_bridge_replay":
      return OutcomeRLBridgeEngine.replayFromStore(params);
    case "xproc_rl_bridge_reset":
      OutcomeRLBridgeEngine.reset();
      return { ok: true };
    default:
      throw new Error(`outcomeRLBridgeDispatch: unknown action '${action}'`);
  }
}
