/**
 * AutomationChainTelemetryEngine — ACP-MS6 / P1-U01 + P1-U02 + P1-U03
 *
 * Pure aggregator over the `TelemetryEvent` stream emitted by AutomationChainEngine.
 * Computes per-chain fire rates, token costs, latency percentiles (p50/p95/p99 via
 * Algorithm R reservoir sampling), downgrade frequency, user override rate, and a
 * per-session automation health summary.
 *
 * No I/O. Single-threaded ingest. Bounded memory (reservoir = 256 latency samples
 * per chain × 9 task classes = 2304 numbers max). Safe to construct one instance
 * per session and discard at session end.
 *
 * Karpathy discipline:
 *   CLASSIFY — streaming-aggregation over a typed event log.
 *   TECHNIQUE — running counters + bounded reservoir sample for percentiles.
 *   EDGE CASES — empty stream, single sample, all-failed chain, unseen chain id,
 *                negative token_cost (rejected), unknown status (rejected).
 *   FAILURE MODES — Number overflow (53-bit mantissa is fine for token totals at
 *                   the session scale we care about); bounded memory by reservoir.
 *
 * Wiring (ACP-MS6.forge_triple + ENGINE WIRING TO ALL SOURCES doctrine):
 *   - prism_telemetry: automation_chain_record / _summary / _chain_health / _session_health
 *   - AutomationChainEngine.createTelemetryEvent() consumers feed ingest() directly.
 */

import { TelemetryEventStatusSchema } from "../schemas/automationChainSchema.js";
import type { TelemetryEvent, TaskClass } from "./AutomationChainEngine.js";

// ─── Public Result Types ──────────────────────────────────────────────────

/** Per-chain aggregated stats. Lossless counts + bounded-sample percentiles. */
export interface ChainHealth {
  chain_id: string;
  task_class: TaskClass | "unknown";
  fires: number;                       // P1-U01: chain start count (status === "started")
  completed: number;                   // status === "completed"
  failed: number;                      // P1-U02: chain failure count (downgrade trigger)
  skipped: number;                     // P1-U02: user override / step skip
  completion_rate: number;             // completed / (fires || 1)  — [0..1]
  downgrade_rate: number;              // P1-U02: failed / (fires || 1)  — [0..1]
  override_rate: number;               // P1-U02: skipped / (fires || 1) — [0..1]
  token_cost_total: number;            // P1-U01: cumulative tokens across all events
  token_cost_per_fire: number;         // token_cost_total / (fires || 1)
  latency_p50_ms: number | null;       // P1-U01: median latency of COMPLETED events
  latency_p95_ms: number | null;       // P1-U01: 95th percentile
  latency_p99_ms: number | null;       // P1-U01: 99th percentile (tail)
  latency_sample_size: number;         // reservoir fill (≤ RESERVOIR_SIZE)
  last_event_ts: string | null;        // ISO of most recent event for this chain
  recent_errors: string[];             // P1-U02: up to RECENT_ERRORS_KEEP last failures
}

/** P1-U03: per-session automation health roll-up across every chain. */
export interface SessionAutomationHealth {
  session_started_at: string;
  events_total: number;
  chains_active: number;               // distinct chain_ids seen
  fires_total: number;
  completed_total: number;
  failed_total: number;
  skipped_total: number;
  completion_rate: number;             // completed_total / (fires_total || 1)
  downgrade_rate: number;              // failed_total / (fires_total || 1)
  override_rate: number;               // skipped_total / (fires_total || 1)
  token_cost_total: number;
  token_budget_total: number;          // sum of chain budgets seen (advisory)
  token_budget_utilization: number;    // tokens_on_budgeted_chains / (token_budget_total || 1)
  token_budget_coverage: number;       // chains_with_budget / (chains_active || 1)  — caller diagnostic
  worst_chain_by_downgrade: string | null;
  worst_chain_by_latency: string | null;
  best_chain_by_completion: string | null;
  per_chain: ChainHealth[];            // ranked by fires desc then chain_id asc
}

// ─── Internals ─────────────────────────────────────────────────────────────

const RESERVOIR_SIZE = 256;
const RECENT_ERRORS_KEEP = 5;
const MAX_ERROR_CHARS = 512;          // P1 (Arm A #3): cap per-error string to prevent log/PII bloat
const MAX_CHAIN_ID_CHARS = 256;        // P0 (Arm B #2): prevent unbounded sort/storage from crafted chain_id
// Single-sourced from the canonical schema enum (R7) so the allow-set can NEVER
// drift from the contract again. The previous hard-coded 4-value set rejected
// the schema-valid `timeout` / `budget_exceeded` statuses -- exactly the events
// AutomationChainEngine.executeChain now PRODUCES (ACP-MS2). Both are routed to
// the failure bucket below (a budget-overrun or step-timeout IS a chain failure).
const ALLOWED_STATUSES = new Set<TelemetryEvent["status"]>(TelemetryEventStatusSchema.options);

interface ChainState {
  fires: number;
  completed: number;
  failed: number;
  skipped: number;
  tokens: number;
  reservoir: number[];        // bounded latency sample for COMPLETED events
  seen: number;               // total completed events seen (for Algorithm R)
  lastEventTs: string | null;
  recentErrors: string[];
  taskClass: TaskClass | "unknown";
  tokenBudget: number;        // optional, recorded via recordChainBudget()
}

function newChainState(): ChainState {
  return {
    fires: 0, completed: 0, failed: 0, skipped: 0, tokens: 0,
    reservoir: [], seen: 0, lastEventTs: null, recentErrors: [],
    taskClass: "unknown", tokenBudget: 0,
  };
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];
  // R-7 / linear interpolation (matches numpy default)
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function toChainHealth(chainId: string, st: ChainState): ChainHealth {
  const sorted = st.reservoir.slice().sort((a, b) => a - b);
  const fires = st.fires;
  const fireDiv = fires || 1;
  return {
    chain_id: chainId,
    task_class: st.taskClass,
    fires,
    completed: st.completed,
    failed: st.failed,
    skipped: st.skipped,
    completion_rate: st.completed / fireDiv,
    downgrade_rate: st.failed / fireDiv,
    override_rate: st.skipped / fireDiv,
    token_cost_total: st.tokens,
    token_cost_per_fire: st.tokens / fireDiv,
    latency_p50_ms: percentile(sorted, 50),
    latency_p95_ms: percentile(sorted, 95),
    latency_p99_ms: percentile(sorted, 99),
    latency_sample_size: sorted.length,
    last_event_ts: st.lastEventTs,
    recent_errors: st.recentErrors.slice(),
  };
}

// ─── Engine ────────────────────────────────────────────────────────────────

export interface AutomationChainTelemetryOptions {
  /** Test seam — inject a deterministic PRNG for reservoir sampling. Default: Math.random. */
  randomFn?: () => number;
}

export class AutomationChainTelemetryEngine {
  private readonly state = new Map<string, ChainState>();
  private sessionStartedAt: string;
  private totalEvents = 0;
  private readonly randomFn: () => number;

  /**
   * @param opts - Optional {@link AutomationChainTelemetryOptions}; pass `randomFn` to
   *   make reservoir sampling deterministic in tests.
   */
  constructor(opts: AutomationChainTelemetryOptions = {}) {
    this.randomFn = opts.randomFn ?? Math.random;
    this.sessionStartedAt = new Date().toISOString();
  }

  /**
   * Reset `session_started_at` to "now" without dropping accumulated state.
   * Use when reusing a long-lived engine instance for a fresh session.
   * To drop state too, call {@link reset} first.
   */
  startSession(): void {
    this.sessionStartedAt = new Date().toISOString();
  }

  /**
   * Ingest a single TelemetryEvent. Fails loud on bad shape (R12 doctrine).
   *
   * NOTE on `task_class`: this engine cannot infer the chain's `TaskClass` from
   * a TelemetryEvent (the event doesn't carry it). Callers should invoke
   * {@link recordChainBudget} BEFORE the first ingest for each chain so that
   * `chainHealth().task_class` is correctly labeled; otherwise it stays "unknown".
   *
   * NOTE on `downgrade_rate`: in the current AutomationChainEngine contract a
   * `status === "failed"` event IS a downgrade trigger (fail_behavior fires).
   * Until a separate `"downgraded"` status is introduced upstream, downgrade_rate
   * == failure_rate per chain. See ACP-MS6 P1-U02.
   *
   * @param event - TelemetryEvent emitted by AutomationChainEngine.
   * @throws Error on missing chain_id, oversized chain_id (>256 chars), unknown
   *   status, non-finite negatives.
   */
  ingest(event: TelemetryEvent): void {
    if (!event || typeof event !== "object") {
      throw new Error("AutomationChainTelemetry.ingest: event must be an object");
    }
    const { chain_id, status, token_cost, latency_ms, error, timestamp } = event;
    if (!chain_id || typeof chain_id !== "string") {
      throw new Error("AutomationChainTelemetry.ingest: chain_id required");
    }
    if (chain_id.length > MAX_CHAIN_ID_CHARS) {
      throw new Error(`AutomationChainTelemetry.ingest: chain_id length ${chain_id.length} exceeds ${MAX_CHAIN_ID_CHARS}`);
    }
    if (!ALLOWED_STATUSES.has(status)) {
      throw new Error(`AutomationChainTelemetry.ingest: unknown status '${status}'`);
    }
    if (typeof token_cost !== "number" || token_cost < 0 || !Number.isFinite(token_cost)) {
      throw new Error(`AutomationChainTelemetry.ingest: token_cost must be a non-negative finite number (got ${token_cost})`);
    }
    if (typeof latency_ms !== "number" || latency_ms < 0 || !Number.isFinite(latency_ms)) {
      throw new Error(`AutomationChainTelemetry.ingest: latency_ms must be a non-negative finite number (got ${latency_ms})`);
    }

    const st = this.state.get(chain_id) ?? newChainState();
    st.tokens += token_cost;
    st.lastEventTs = typeof timestamp === "string" && timestamp ? timestamp : new Date().toISOString();

    if (status === "started")        st.fires += 1;
    else if (status === "completed") st.completed += 1;
    else if (status === "skipped")   st.skipped += 1;
    // `failed`, `timeout`, `budget_exceeded` all count as a failure/downgrade
    // trigger (a step timeout or budget overrun aborts the chain). ACP-MS2.
    else if (status === "failed" || status === "timeout" || status === "budget_exceeded") st.failed += 1;

    if (status === "completed") {
      // Vitter (1985) Algorithm R reservoir sampling. `seen` is 1-indexed AFTER
      // the increment so the replacement probability k/seen is uniform across
      // all completed events. Random index j in [0, seen-1]; replace iff j<k.
      st.seen += 1;
      if (st.reservoir.length < RESERVOIR_SIZE) {
        st.reservoir.push(latency_ms);
      } else {
        const j = Math.floor(this.randomFn() * st.seen);
        if (j < RESERVOIR_SIZE) st.reservoir[j] = latency_ms;
      }
    }

    if ((status === "failed" || status === "timeout" || status === "budget_exceeded") && error) {
      // P1: cap each error to MAX_ERROR_CHARS to bound memory + reduce PII surface.
      const truncated = error.length > MAX_ERROR_CHARS
        ? error.slice(0, MAX_ERROR_CHARS) + "…[truncated]"
        : error;
      st.recentErrors.push(truncated);
      if (st.recentErrors.length > RECENT_ERRORS_KEEP) {
        st.recentErrors.splice(0, st.recentErrors.length - RECENT_ERRORS_KEEP);
      }
    }

    this.state.set(chain_id, st);
    this.totalEvents += 1;
  }

  /**
   * Record the AutomationChainEngine.getChain(taskClass).token_budget for one chain
   * so {@link sessionHealth} can compute token_budget_utilization. Idempotent —
   * subsequent calls overwrite (last-writer-wins; budgets are session-stable).
   * @param chainId - chain_id as it appears on TelemetryEvent.
   * @param taskClass - task class label (also backfills chainHealth().task_class).
   * @param tokenBudget - chain's declared token budget (non-negative finite).
   * @throws Error on missing/oversized chainId or invalid tokenBudget.
   */
  recordChainBudget(chainId: string, taskClass: TaskClass, tokenBudget: number): void {
    if (!chainId) throw new Error("recordChainBudget: chainId required");
    if (chainId.length > MAX_CHAIN_ID_CHARS) {
      throw new Error(`recordChainBudget: chainId length ${chainId.length} exceeds ${MAX_CHAIN_ID_CHARS}`);
    }
    if (typeof tokenBudget !== "number" || tokenBudget < 0 || !Number.isFinite(tokenBudget)) {
      throw new Error("recordChainBudget: tokenBudget must be non-negative finite");
    }
    const st = this.state.get(chainId) ?? newChainState();
    st.taskClass = taskClass;
    st.tokenBudget = tokenBudget;
    this.state.set(chainId, st);
  }

  /**
   * Per-chain health for one chain.
   * @param chainId - chain identifier seen on TelemetryEvent.
   * @returns Fresh {@link ChainHealth} object (safe to mutate) or null if never seen.
   */
  chainHealth(chainId: string): ChainHealth | null {
    const st = this.state.get(chainId);
    if (!st) return null;
    return toChainHealth(chainId, st);
  }

  /**
   * All per-chain health rows.
   * @returns Array of fresh {@link ChainHealth} objects sorted by `fires desc`
   *   then `chain_id asc`. Safe to mutate.
   */
  summary(): ChainHealth[] {
    return Array.from(this.state.entries())
      .map(([id, st]) => toChainHealth(id, st))
      .sort((a, b) => (b.fires - a.fires) || a.chain_id.localeCompare(b.chain_id));
  }

  /**
   * P1-U03: full per-session automation health roll-up.
   *
   * `token_budget_utilization` is computed against ONLY the chains for which
   * {@link recordChainBudget} was called (budgeted-tokens / budget-sum), so
   * partial budget recording does not inflate utilization. The companion
   * `token_budget_coverage` field (budgeted_chains / active_chains) lets
   * callers detect partial recording.
   *
   * @returns Fresh {@link SessionAutomationHealth} object, safe to mutate.
   */
  sessionHealth(): SessionAutomationHealth {
    const perChain = this.summary();
    let fires = 0, completed = 0, failed = 0, skipped = 0, tokens = 0;
    let budget = 0, tokensOnBudgeted = 0, budgetedChains = 0;
    for (const c of perChain) {
      fires += c.fires; completed += c.completed; failed += c.failed; skipped += c.skipped;
      tokens += c.token_cost_total;
    }
    for (const [id, st] of this.state.entries()) {
      if (st.tokenBudget > 0) {
        budget += st.tokenBudget;
        budgetedChains += 1;
        const ch = perChain.find(c => c.chain_id === id);
        if (ch) tokensOnBudgeted += ch.token_cost_total;
      }
    }
    const div = fires || 1;

    let worstDowngrade: ChainHealth | null = null;
    let worstLatency: ChainHealth | null = null;
    let bestCompletion: ChainHealth | null = null;
    for (const c of perChain) {
      if (c.fires === 0) continue;
      if (!worstDowngrade || c.downgrade_rate > worstDowngrade.downgrade_rate) worstDowngrade = c;
      if (c.latency_p95_ms !== null) {
        const incumbent = worstLatency?.latency_p95_ms;
        if (worstLatency === null || incumbent === null || incumbent === undefined || c.latency_p95_ms > incumbent) {
          worstLatency = c;
        }
      }
      if (!bestCompletion || c.completion_rate > bestCompletion.completion_rate) bestCompletion = c;
    }

    return {
      session_started_at: this.sessionStartedAt,
      events_total: this.totalEvents,
      chains_active: perChain.length,
      fires_total: fires,
      completed_total: completed,
      failed_total: failed,
      skipped_total: skipped,
      completion_rate: completed / div,
      downgrade_rate: failed / div,
      override_rate: skipped / div,
      token_cost_total: tokens,
      token_budget_total: budget,
      token_budget_utilization: tokensOnBudgeted / (budget || 1),
      token_budget_coverage: budgetedChains / (perChain.length || 1),
      worst_chain_by_downgrade: worstDowngrade ? worstDowngrade.chain_id : null,
      worst_chain_by_latency: worstLatency ? worstLatency.chain_id : null,
      best_chain_by_completion: bestCompletion ? bestCompletion.chain_id : null,
      per_chain: perChain,
    };
  }

  /**
   * Test hook — drop all state AND reset session timestamp. Production code
   * must not call this; per-session lifecycle goes through {@link startSession}.
   */
  reset(): void {
    this.state.clear();
    this.totalEvents = 0;
    this.sessionStartedAt = new Date().toISOString();
  }
}

export const automationChainTelemetryEngine = new AutomationChainTelemetryEngine();
