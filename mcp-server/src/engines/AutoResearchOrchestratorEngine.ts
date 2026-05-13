/**
 * AutoResearchOrchestratorEngine — AUTO-LEARNING-LOOP-MS0 / U-ALL03
 * =================================================================
 *
 * Sits between U-ALL02 `NoveltyDetectionEngine` (filters known-from-novel)
 * and U-ALL04 `SynergyClassifierEngine` (scores research output for PRISM
 * fit). Its only job is to **rate-limit** the dispatch of researcher
 * subagents so that a 200-item RSS burst cannot turn into a token bomb
 * on the user's account.
 *
 * Two limits, both hard:
 *   1. **Concurrency** — at most `maxConcurrent` (default 3) researcher
 *      subagents are in flight at any one wall-clock instant. The rest
 *      sit in the pending queue and wake up on the next `flush()` call.
 *   2. **Daily budget** — at most `dailyBudget` (default 12) dispatch
 *      *attempts* per UTC day. **Each attempt counts** — a timeout
 *      or crash followed by a retry consumes two of the day's slots,
 *      not one. This is intentional: every attempt costs real tokens
 *      on the subagent dispatch surface, so the budget reflects spend
 *      rather than logical-item progress. Callers who want a "12
 *      items per day, retries free" semantic should pre-deduplicate
 *      against the dead-letter pile before re-enqueuing. Once
 *      exhausted, `flush()` returns `deferred` items and the queue
 *      persists across restarts so the items pick up tomorrow's
 *      quota.
 *
 * Spec § U-ALL03 failure-mode coverage:
 *   - subagent timeout (>15 min) → engine raises `AbortSignal.abort()`
 *     on the dispatcher's signal AND surfaces `kind:"timeout"` outcome.
 *     Production dispatcher is responsible for honouring the abort
 *     (cancelling the underlying agent run); the engine guarantees
 *     forward progress even if the dispatcher leaks the orphan
 *     promise. Item is re-enqueued with `attempts++`; after
 *     `maxAttempts` (default 3) it moves to the dead-letter pile.
 *   - subagent crash (DispatchFn rejects / returns `ok:false`) → same
 *     treatment as timeout, with `kind:"crash"` outcome and the error
 *     string surfaced in the dead-letter envelope for operator triage.
 *   - prompt injection from source content → `sanitizeForPrompt()`
 *     strips ASCII control chars, ChatML control tokens, mustache
 *     interpolation, leading role markers ("System:", "Assistant:",
 *     "User:"), and truncates to `MAX_PROMPT_CHARS` (default 5000).
 *     Sanitization happens INSIDE the engine — the dispatcher receives
 *     a `SanitizedItem`, never the raw `SourceItem`.
 *   - queue starvation (always full → some items wait forever) →
 *     queue entries past `queueTtlMs` (default 7 days) are aged out
 *     of pending and moved to dead-letter with `reason:"ttl_expired"`.
 *
 * Concurrency model — INSIDE a single `flush()` call all dispatches
 * run via `Promise.allSettled`, so a slow / hung dispatcher cannot
 * block the others. Each in-flight dispatch races against a timer
 * (`Promise.race` with `timeoutMs`); the timer arm aborts the
 * abort-controller AND resolves the race, so the engine never waits
 * longer than `timeoutMs` per item. Multiple concurrent callers of
 * `flush()` are serialized by an internal lock: the first call drains;
 * subsequent calls see an empty `dispatched` list (or zero, with
 * `reason:"already_flushing"`) and return immediately.
 *
 * Threading assumption — engine state (`pending`, `inFlight`,
 * `dailyUsed`, `completed`, `deadLetter`) is mutated synchronously
 * from a single JS event loop. The engine relies on Node.js
 * single-threaded execution: an `enqueue()` call that lands while a
 * `flush()` is mid-await IS observable (it sees a partially-drained
 * pending list), but the two cannot interleave at the byte level
 * since neither yields to the loop between its synchronous mutation
 * spans. If you ever embed this engine in a worker_thread pool or
 * SharedArrayBuffer setup, add coarse locking around `state.*`
 * writes before relying on the dedup guarantees.
 *
 * Persistence contract — pure data. The engine never touches disk
 * directly; the CLI (`scripts/auto-research-flush.mjs`, deferred to
 * U-ALL07 cron landing) is responsible for `getQueueState()` →
 * JSON-on-disk → `.previous.json` backup rotation. This mirrors the
 * U-ALL02 split: dispatcher action `prism_ai:auto_research_dispatch`
 * and CLI share the singleton; both can be in flight simultaneously
 * during a cron tick. `inFlight` is in-memory only (a dispatcher
 * crash mid-run causes orphaned items to be rediscovered as `pending`
 * on the next process start — by construction, since they were
 * removed from `pending` only after a verdict landed).
 *
 * Determinism + testability:
 *   - `dispatch`, `now`, `setTimer`, `clearTimer`, `randomId` are
 *     injected via `EngineOpts` and default to production
 *     implementations. Tests inject:
 *       * `dispatch` — fake DispatchFn returning canned outcomes
 *         (success, crash, never-resolve for timeout cases).
 *       * `now` — frozen clock, advanced manually between asserts.
 *       * `setTimer` / `clearTimer` — vitest fake timers when
 *         exercising day-rollover / TTL aging.
 *       * `randomId` — deterministic counter so dispatch IDs are
 *         predictable in snapshot-style asserts.
 *   - The engine performs ZERO network I/O. The injected DispatchFn
 *     owns all subagent spawning; engine tests can therefore stay
 *     hermetic.
 *
 * @milestone AUTO-LEARNING-LOOP-MS0 / U-ALL03
 */

import type { SourceItem } from "./ReputableSourceMonitorEngine.js";

// ─── Public types ────────────────────────────────────────────────────

/**
 * Outcome returned by an external DispatchFn — the researcher
 * subagent's verdict. `content` is the prose research output; the
 * engine doesn't interpret it (U-ALL04 SynergyClassifier does).
 */
export type ResearchOutcome =
  | { ok: true; content: string; modelHint?: string }
  | { ok: false; error: string };

/**
 * Engine-internal outcome envelope. `kind:"ok"` carries the upstream
 * ResearchOutcome verbatim; `kind:"timeout"` / `kind:"crash"` are
 * synthesised by the engine wrapper around DispatchFn.
 */
export type DispatchOutcome =
  | { kind: "ok"; outcome: ResearchOutcome; durationMs: number }
  | { kind: "timeout"; durationMs: number }
  | { kind: "crash"; error: string; durationMs: number };

/**
 * Item shape after `sanitizeForPrompt()`. Engine guarantees the
 * dispatcher never sees raw source content.
 */
export interface SanitizedItem {
  source: string;
  guid: string;
  title: string;
  link?: string;
  summary?: string;
  /** True iff the sanitiser actually modified one of the fields. */
  sanitized: boolean;
  /** Length of the *original* (pre-truncate) title + summary in chars. */
  rawCharsBefore: number;
}

/**
 * Dispatcher contract. Production wires this to a researcher subagent
 * spawn (Agent tool / ollama / etc.); tests inject a fake.
 *
 * @param item       Sanitised source item. Treat as untrusted input.
 * @param signal     AbortSignal. The engine fires `signal.abort()`
 *                   when `timeoutMs` elapses; dispatcher SHOULD honour
 *                   this and cancel the underlying agent run.
 * @param dispatchId Engine-assigned id for log correlation.
 * @returns          ResearchOutcome.
 */
export type DispatchFn = (
  item: SanitizedItem,
  signal: AbortSignal,
  dispatchId: string,
) => Promise<ResearchOutcome>;

/** Persisted queue entry. `attempts` survives across restarts. */
export interface QueueEntry {
  /** The actual source item (sanitised on enqueue). */
  item: SanitizedItem;
  /** How many times we've tried to dispatch this item. 0 ⇒ fresh. */
  attempts: number;
  /** Epoch ms at which this entry was first enqueued. */
  enqueuedAt: number;
  /** Optional notes from the previous failed attempt. */
  lastError?: string;
}

/** Snapshot suitable for JSON persistence. */
export interface QueueState {
  schemaVersion: number;
  /** UTC day key, e.g. "2026-05-13". Used to detect rollover on load. */
  dayKey: string;
  /** Count of *dispatches* (success + failure + timeout) this UTC day. */
  dailyUsed: number;
  pending: QueueEntry[];
  /**
   * Persisted log of completed dispatches over the last 24h. Keeps
   * dedup against recent guids working across a restart.
   */
  completed: CompletedRecord[];
  /** Items that ran out of retries or aged out of the queue. */
  deadLetter: DeadLetterEntry[];
}

export interface CompletedRecord {
  guid: string;
  source: string;
  kind: "ok" | "timeout" | "crash";
  completedAt: number;
  /** Free-form note (error message on failure). */
  note?: string;
}

export interface DeadLetterEntry {
  /** Original sanitised item. */
  item: SanitizedItem;
  /** Why this entry was dead-lettered. */
  reason: "max_attempts" | "ttl_expired";
  /** Final attempt count. */
  attempts: number;
  /** Epoch ms at which it was moved to the dead-letter pile. */
  deadAt: number;
  /** Best-effort error/diagnostic text. */
  note?: string;
}

export interface EnqueueOutcome {
  /** Number of items added to the pending queue. */
  added: number;
  /** Guids rejected because they already sit in pending. */
  dedupedAgainstPending: string[];
  /** Guids rejected because they are currently in-flight. */
  dedupedAgainstInFlight: string[];
  /** Guids rejected because they completed within the dedup window. */
  dedupedAgainstCompleted: string[];
  /** Guids rejected because they are in the dead-letter pile. */
  dedupedAgainstDeadLetter: string[];
  /** Guids rejected because their shape failed validation. */
  rejected: Array<{ guid: string; reason: string }>;
  /** Pending queue size *after* the enqueue. */
  pendingAfter: number;
}

export interface FlushOutcome {
  /** Number of items dispatched in this flush call. */
  dispatched: number;
  /** Number of items still pending after the flush. */
  pendingAfter: number;
  /** Number of items deferred to tomorrow (daily budget exhausted). */
  deferred: number;
  /** Number of items dead-lettered during this flush (TTL / attempts). */
  deadLettered: number;
  /** dailyUsed value AFTER this flush. */
  dailyUsed: number;
  /** Budget remaining for the rest of the UTC day. */
  dailyRemaining: number;
  /** Per-dispatch outcomes for the flushed items. */
  outcomes: Array<{
    guid: string;
    dispatchId: string;
    outcome: DispatchOutcome;
    /** Final attempt count (0-indexed: 0=first try, 1=second, …). */
    attempt: number;
  }>;
  /** Set when a concurrent flush is already running. */
  reason?: "already_flushing" | "no_dispatch_configured";
}

export interface LoadOutcome {
  ok: boolean;
  /** Number of pending entries restored. */
  pending: number;
  /** Reason for failure when ok===false. */
  error?: string;
}

export interface EngineOpts {
  /** Production wires a real subagent dispatcher; tests inject a fake. */
  dispatch?: DispatchFn | null;
  /** Max concurrent in-flight dispatches. Default 3, per spec § U-ALL03. */
  maxConcurrent?: number;
  /** Max dispatches per UTC day. Default 12, per spec § U-ALL03. */
  dailyBudget?: number;
  /** Wall-clock-ms timeout per dispatch. Default 15 min, per spec. */
  timeoutMs?: number;
  /** Hard ceiling on retries before dead-lettering. Default 3. */
  maxAttempts?: number;
  /** Pending entries older than this age out. Default 7 days. */
  queueTtlMs?: number;
  /** Completed-dedup window. Default 24h. */
  completedDedupMs?: number;
  /** Per-item prompt-content size cap. Default 5000 chars. */
  maxPromptChars?: number;
  /** Wall-clock injection. Default `Date.now`. */
  now?: () => number;
  /** Pre-seed state (used by CLI on startup). */
  initialState?: QueueState | null;
  /** Test-side deterministic dispatch-id generator. */
  randomId?: () => string;
}

// ─── Constants ──────────────────────────────────────────────────────

export const QUEUE_SCHEMA_VERSION = 1;
export const DEFAULT_MAX_CONCURRENT = 3;
export const DEFAULT_DAILY_BUDGET = 12;
export const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;
export const DEFAULT_MAX_ATTEMPTS = 3;
export const DEFAULT_QUEUE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const DEFAULT_COMPLETED_DEDUP_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_MAX_PROMPT_CHARS = 5000;
/**
 * Hard upper bound on guid length. Tuned to comfortably accommodate
 * arxiv UUIDs (36), DOIs (60-80), RFC2822 message ids (≤512), and
 * RSS GUID URIs (≤1024 in practice) while rejecting adversarial
 * megabyte payloads. Guids above this cap are rejected at enqueue
 * with reason "guid_too_long".
 */
export const MAX_GUID_LEN = 2048;
/**
 * Hard upper bound on single `enqueue()` batch size. Without this,
 * a runaway poller could DoS the engine by passing a million items.
 * Past this cap the engine rejects the trailing items with reason
 * "batch_overflow"; callers should chunk large input before
 * enqueuing.
 */
export const MAX_ENQUEUE_BATCH = 10_000;

/** Keys we refuse to insert into state objects — defence-in-depth. */
const FORBIDDEN_KEYS: ReadonlySet<string> = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

/**
 * ChatML / role-marker tokens we strip from sanitised content. The
 * goal is to keep injected source text from looking like an
 * out-of-band system message to whichever LLM eventually consumes the
 * researcher prompt.
 *
 * Matched case-insensitively, anchored at line start where applicable.
 */
const CHATML_TOKEN_PATTERN = /<\|(?:im_start|im_end|system|user|assistant|endoftext|fim_prefix|fim_middle|fim_suffix)\|>/gi;
const ROLE_MARKER_PATTERN = /^(?:\s*)(?:system|assistant|user|tool|function|developer)\s*:\s*/gim;
const MUSTACHE_PATTERN = /\{\{[\s\S]{0,200}?\}\}/g;
/**
 * ASCII control chars except \t (0x09), \n (0x0a), \r (0x0d). Strips
 * the bell / NUL / ESC / DEL / etc. that some LLM tokenisers honour.
 *
 * Built via new RegExp(string) so the SOURCE file is pure UTF-8 with
 * zero literal control bytes — git, grep, the master-index ingestor,
 * and most IDEs treat any file containing a literal NUL as binary
 * and silently skip it. The string-builder form below sidesteps that.
 */
// eslint-disable-next-line no-control-regex -- intentional control-char scrub.
const CONTROL_CHAR_PATTERN = new RegExp(
  "[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]",
  "g",
);

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * UTC day key like "2026-05-13". Stable identifier for daily-budget
 * rollover detection — never use a local-time key (chats can run
 * across timezones).
 */
export function utcDayKey(epochMs: number): string {
  const d = new Date(epochMs);
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${d.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Sanitise free-form source text for inclusion in a researcher prompt.
 * Steps (order matters):
 *   1. Drop ASCII control characters (preserve \t \n \r).
 *   2. Strip ChatML / OpenAI control tokens (<|system|>, etc.).
 *   3. Strip leading "Role:" markers ("System:", "Assistant:", …).
 *   4. Strip {{…}} mustache interpolation (template injection).
 *   5. Collapse runs of more than 4 newlines (prompt-bomb defense).
 *   6. Truncate to `maxChars`.
 */
export function sanitizeForPrompt(
  input: string,
  maxChars: number = DEFAULT_MAX_PROMPT_CHARS,
): { text: string; sanitized: boolean; rawLen: number } {
  const raw = typeof input === "string" ? input : "";
  let out = raw;
  out = out.replace(CONTROL_CHAR_PATTERN, "");
  out = out.replace(CHATML_TOKEN_PATTERN, "");
  out = out.replace(ROLE_MARKER_PATTERN, "");
  out = out.replace(MUSTACHE_PATTERN, "");
  out = out.replace(/\n{5,}/g, "\n\n\n\n");
  const truncated = out.length > maxChars;
  if (truncated) out = out.slice(0, maxChars);
  return {
    text: out,
    sanitized: out !== raw,
    rawLen: raw.length,
  };
}

/**
 * Apply sanitisation to a raw SourceItem; returns a SanitizedItem the
 * dispatcher can safely interpolate into a prompt.
 */
function sanitizeItem(
  raw: SourceItem | (SourceItem & { summary?: string }),
  maxChars: number,
): SanitizedItem {
  const title = sanitizeForPrompt(raw.title ?? "", maxChars);
  const summary = sanitizeForPrompt(raw.summary ?? "", maxChars);
  return {
    source: String(raw.source ?? ""),
    guid: String(raw.guid ?? ""),
    title: title.text,
    link: typeof raw.link === "string" ? raw.link : undefined,
    summary: summary.text || undefined,
    sanitized: title.sanitized || summary.sanitized,
    rawCharsBefore: title.rawLen + summary.rawLen,
  };
}

function freshQueueState(dayKey: string): QueueState {
  return {
    schemaVersion: QUEUE_SCHEMA_VERSION,
    dayKey,
    dailyUsed: 0,
    pending: [],
    completed: [],
    deadLetter: [],
  };
}

/**
 * Deep clone with `__proto__` / `constructor` / `prototype` stripped
 * at every level. JSON-roundtrip would already drop function values
 * but a structured-clone-style explicit construction is safer against
 * prototype-pollution payloads embedded in feed content that survived
 * sanitization.
 */
function deepCloneQueueState(state: QueueState): QueueState {
  const cloneItem = (q: QueueEntry): QueueEntry => ({
    item: {
      source: String(q.item.source ?? ""),
      guid: String(q.item.guid ?? ""),
      title: String(q.item.title ?? ""),
      link: typeof q.item.link === "string" ? q.item.link : undefined,
      summary: typeof q.item.summary === "string" ? q.item.summary : undefined,
      sanitized: Boolean(q.item.sanitized),
      rawCharsBefore: Number.isFinite(q.item.rawCharsBefore) ? Number(q.item.rawCharsBefore) : 0,
    },
    attempts: Number.isFinite(q.attempts) ? Number(q.attempts) : 0,
    enqueuedAt: Number.isFinite(q.enqueuedAt) ? Number(q.enqueuedAt) : 0,
    lastError: typeof q.lastError === "string" ? q.lastError : undefined,
  });
  const cloneCompleted = (c: CompletedRecord): CompletedRecord => ({
    guid: String(c.guid ?? ""),
    source: String(c.source ?? ""),
    kind: c.kind === "timeout" || c.kind === "crash" ? c.kind : "ok",
    completedAt: Number.isFinite(c.completedAt) ? Number(c.completedAt) : 0,
    note: typeof c.note === "string" ? c.note : undefined,
  });
  const cloneDead = (d: DeadLetterEntry): DeadLetterEntry => ({
    item: cloneItem({ item: d.item, attempts: 0, enqueuedAt: 0 }).item,
    reason: d.reason === "ttl_expired" ? "ttl_expired" : "max_attempts",
    attempts: Number.isFinite(d.attempts) ? Number(d.attempts) : 0,
    deadAt: Number.isFinite(d.deadAt) ? Number(d.deadAt) : 0,
    note: typeof d.note === "string" ? d.note : undefined,
  });
  return {
    schemaVersion: QUEUE_SCHEMA_VERSION,
    dayKey: String(state.dayKey ?? ""),
    dailyUsed: Number.isFinite(state.dailyUsed) ? Number(state.dailyUsed) : 0,
    pending: Array.isArray(state.pending) ? state.pending.map(cloneItem) : [],
    completed: Array.isArray(state.completed) ? state.completed.map(cloneCompleted) : [],
    deadLetter: Array.isArray(state.deadLetter) ? state.deadLetter.map(cloneDead) : [],
  };
}

// ─── Engine ─────────────────────────────────────────────────────────

export class AutoResearchOrchestratorEngine {
  readonly name = "AutoResearchOrchestratorEngine";

  private dispatch: DispatchFn | null;
  private state: QueueState;
  /** Guids currently being dispatched. Not persisted (in-memory only). */
  private inFlight: Set<string>;
  private maxConcurrent: number;
  private dailyBudget: number;
  private timeoutMs: number;
  private maxAttempts: number;
  private queueTtlMs: number;
  private completedDedupMs: number;
  private maxPromptChars: number;
  private nowFn: () => number;
  private randomId: () => string;
  /** Re-entrant flush lock. */
  private flushing: boolean;

  constructor(opts: EngineOpts = {}) {
    this.dispatch = opts.dispatch === undefined ? null : opts.dispatch;
    this.maxConcurrent = Math.max(1, Math.floor(opts.maxConcurrent ?? DEFAULT_MAX_CONCURRENT));
    this.dailyBudget = Math.max(1, Math.floor(opts.dailyBudget ?? DEFAULT_DAILY_BUDGET));
    this.timeoutMs = Math.max(1, Math.floor(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS));
    this.maxAttempts = Math.max(1, Math.floor(opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS));
    this.queueTtlMs = Math.max(1, Math.floor(opts.queueTtlMs ?? DEFAULT_QUEUE_TTL_MS));
    this.completedDedupMs = Math.max(0, Math.floor(opts.completedDedupMs ?? DEFAULT_COMPLETED_DEDUP_MS));
    this.maxPromptChars = Math.max(64, Math.floor(opts.maxPromptChars ?? DEFAULT_MAX_PROMPT_CHARS));
    this.nowFn = opts.now ?? Date.now;
    let counter = 0;
    this.randomId = opts.randomId ?? (() => {
      counter += 1;
      return `disp-${this.nowFn().toString(36)}-${counter.toString(36)}`;
    });
    this.inFlight = new Set();
    this.flushing = false;
    if (opts.initialState) {
      const loaded = this.cloneAndValidateState(opts.initialState);
      this.state = loaded.ok ? deepCloneQueueState(opts.initialState) : freshQueueState(utcDayKey(this.nowFn()));
    } else {
      this.state = freshQueueState(utcDayKey(this.nowFn()));
    }
    this.rolloverIfNeeded();
  }

  // ── public surface ──

  setDispatch(dispatch: DispatchFn | null): void {
    this.dispatch = dispatch;
  }

  isDispatchConfigured(): boolean {
    return this.dispatch !== null && typeof this.dispatch === "function";
  }

  /** Defensive snapshot — safe to mutate the result. */
  getQueueState(): QueueState {
    this.rolloverIfNeeded();
    return deepCloneQueueState(this.state);
  }

  /**
   * Replace in-memory state with the supplied snapshot. CLI uses this
   * on startup. Engine state is unchanged on validation failure.
   */
  loadState(next: QueueState): LoadOutcome {
    const validated = this.cloneAndValidateState(next);
    if (!validated.ok) return validated;
    this.state = deepCloneQueueState(next);
    this.rolloverIfNeeded();
    return { ok: true, pending: this.state.pending.length };
  }

  /** Parse JSON and load. Structured error rather than throwing. */
  loadJson(json: string): LoadOutcome {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (err) {
      return {
        ok: false,
        pending: 0,
        error: `parse_error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    if (typeof parsed !== "object" || parsed === null) {
      return { ok: false, pending: 0, error: "not_an_object" };
    }
    return this.loadState(parsed as QueueState);
  }

  /** Test-only hard reset. */
  resetAll(): void {
    this.state = freshQueueState(utcDayKey(this.nowFn()));
    this.inFlight = new Set();
    this.flushing = false;
  }

  getDailyUsage(): { used: number; budget: number; remaining: number; dayKey: string } {
    this.rolloverIfNeeded();
    return {
      used: this.state.dailyUsed,
      budget: this.dailyBudget,
      remaining: Math.max(0, this.dailyBudget - this.state.dailyUsed),
      dayKey: this.state.dayKey,
    };
  }

  getStats(): { pending: number; inFlight: number; completed: number; deadLetter: number } {
    return {
      pending: this.state.pending.length,
      inFlight: this.inFlight.size,
      completed: this.state.completed.length,
      deadLetter: this.state.deadLetter.length,
    };
  }

  /**
   * Push a batch of source items onto the pending queue.
   *
   * Dedup ladder (in order):
   *   1. Reject items missing a guid / non-string shape.
   *   2. Drop items whose guid sits in `pending`.
   *   3. Drop items whose guid sits in `inFlight`.
   *   4. Drop items whose guid completed within `completedDedupMs`.
   *   5. Drop items whose guid is in the dead-letter pile.
   *
   * Surviving items are sanitized then appended.
   */
  enqueue(items: ReadonlyArray<SourceItem | (SourceItem & { summary?: string })>): EnqueueOutcome {
    this.rolloverIfNeeded();
    const out: EnqueueOutcome = {
      added: 0,
      dedupedAgainstPending: [],
      dedupedAgainstInFlight: [],
      dedupedAgainstCompleted: [],
      dedupedAgainstDeadLetter: [],
      rejected: [],
      pendingAfter: this.state.pending.length,
    };
    if (!Array.isArray(items)) return out;
    const now = this.nowFn();
    const cutoff = now - this.completedDedupMs;
    const pendingGuids = new Set(this.state.pending.map((p) => p.item.guid));
    const completedGuids = new Set(
      this.state.completed.filter((c) => c.completedAt >= cutoff).map((c) => c.guid),
    );
    const deadGuids = new Set(this.state.deadLetter.map((d) => d.item.guid));

    // Adversarial-input bound: a runaway poller passing 1e6 items
    // would otherwise pin the event loop building the dedup set.
    // Trailing items past MAX_ENQUEUE_BATCH are rejected; callers
    // chunk on their side.
    const overBatch = Math.max(0, items.length - MAX_ENQUEUE_BATCH);
    const slice = overBatch > 0 ? items.slice(0, MAX_ENQUEUE_BATCH) : items;
    if (overBatch > 0) {
      for (let i = MAX_ENQUEUE_BATCH; i < items.length; i += 1) {
        const r = items[i];
        const g = r && typeof r === "object" && typeof r.guid === "string" ? r.guid : "";
        out.rejected.push({ guid: g, reason: "batch_overflow" });
      }
    }

    for (const raw of slice) {
      if (!raw || typeof raw !== "object") {
        out.rejected.push({ guid: "", reason: "not_an_object" });
        continue;
      }
      if (typeof raw.guid !== "string" || raw.guid.length === 0) {
        out.rejected.push({ guid: String((raw as { guid?: unknown }).guid ?? ""), reason: "missing_guid" });
        continue;
      }
      if (raw.guid.length > MAX_GUID_LEN) {
        // Truncate the rejection-log guid so a megabyte payload doesn't
        // explode the EnqueueOutcome envelope.
        out.rejected.push({ guid: raw.guid.slice(0, 64) + "…", reason: "guid_too_long" });
        continue;
      }
      if (typeof raw.source !== "string" || raw.source.length === 0) {
        out.rejected.push({ guid: raw.guid, reason: "missing_source" });
        continue;
      }
      if (typeof raw.title !== "string") {
        out.rejected.push({ guid: raw.guid, reason: "missing_title" });
        continue;
      }
      if (FORBIDDEN_KEYS.has(raw.guid)) {
        out.rejected.push({ guid: raw.guid, reason: "forbidden_key" });
        continue;
      }
      if (pendingGuids.has(raw.guid)) {
        out.dedupedAgainstPending.push(raw.guid);
        continue;
      }
      if (this.inFlight.has(raw.guid)) {
        out.dedupedAgainstInFlight.push(raw.guid);
        continue;
      }
      if (completedGuids.has(raw.guid)) {
        out.dedupedAgainstCompleted.push(raw.guid);
        continue;
      }
      if (deadGuids.has(raw.guid)) {
        out.dedupedAgainstDeadLetter.push(raw.guid);
        continue;
      }
      const sanitized = sanitizeItem(raw, this.maxPromptChars);
      this.state.pending.push({
        item: sanitized,
        attempts: 0,
        enqueuedAt: now,
      });
      pendingGuids.add(raw.guid);
      out.added += 1;
    }
    out.pendingAfter = this.state.pending.length;
    return out;
  }

  /**
   * Drain pending → dispatch in concurrent batches. Returns when the
   * batch is fully settled (success / timeout / crash for each item).
   *
   * Concurrent caller serialisation: if a flush is already running,
   * the second call returns `{ dispatched:0, reason:"already_flushing" }`
   * immediately without touching state.
   */
  async flush(): Promise<FlushOutcome> {
    this.rolloverIfNeeded();
    if (!this.dispatch) {
      return {
        dispatched: 0,
        pendingAfter: this.state.pending.length,
        deferred: this.state.pending.length,
        deadLettered: 0,
        dailyUsed: this.state.dailyUsed,
        dailyRemaining: Math.max(0, this.dailyBudget - this.state.dailyUsed),
        outcomes: [],
        reason: "no_dispatch_configured",
      };
    }
    if (this.flushing) {
      return {
        dispatched: 0,
        pendingAfter: this.state.pending.length,
        deferred: 0,
        deadLettered: 0,
        dailyUsed: this.state.dailyUsed,
        dailyRemaining: Math.max(0, this.dailyBudget - this.state.dailyUsed),
        outcomes: [],
        reason: "already_flushing",
      };
    }
    this.flushing = true;
    let deadLettered = 0;
    try {
      // 1) TTL age-out: pending entries past `queueTtlMs` move to dead-letter.
      const now0 = this.nowFn();
      const ttlSurvivors: QueueEntry[] = [];
      for (const entry of this.state.pending) {
        if (now0 - entry.enqueuedAt > this.queueTtlMs) {
          this.state.deadLetter.push({
            item: entry.item,
            reason: "ttl_expired",
            attempts: entry.attempts,
            deadAt: now0,
            note: entry.lastError,
          });
          deadLettered += 1;
        } else {
          ttlSurvivors.push(entry);
        }
      }
      this.state.pending = ttlSurvivors;

      // 2) Compute capacity: limited by both concurrency budget AND
      //    daily budget remaining.
      const concurrencyRoom = Math.max(0, this.maxConcurrent - this.inFlight.size);
      const dailyRoom = Math.max(0, this.dailyBudget - this.state.dailyUsed);
      const capacity = Math.min(concurrencyRoom, dailyRoom);
      const batch = this.state.pending.slice(0, capacity);
      // "Deferred" specifically means "won't fit in today's daily
      // budget". Items past the *concurrency* cap stay in pending and
      // dispatch on the next flush, same UTC day — they are NOT
      // deferred. Algebra: with P pending and dailyRoom D, the
      // overflow above today's budget is max(0, P - D).
      const deferred = Math.max(0, this.state.pending.length - dailyRoom);

      // 3) Move batch items into inFlight + remove from pending.
      for (const entry of batch) {
        this.inFlight.add(entry.item.guid);
      }
      this.state.pending = this.state.pending.slice(batch.length);

      // 4) Dispatch in parallel.
      const dispatchFn = this.dispatch;
      const outcomes = await Promise.all(
        batch.map((entry) => this.runOne(entry, dispatchFn)),
      );

      // 5) Settle each: requeue / dead-letter / record completion.
      let dispatched = 0;
      const settled: Array<{ guid: string; dispatchId: string; outcome: DispatchOutcome; attempt: number }> = [];
      const nowEnd = this.nowFn();
      for (let i = 0; i < outcomes.length; i += 1) {
        const { entry, dispatchId, outcome } = outcomes[i];
        this.inFlight.delete(entry.item.guid);
        this.state.dailyUsed += 1;
        dispatched += 1;
        const finalAttempt = entry.attempts;
        settled.push({ guid: entry.item.guid, dispatchId, outcome, attempt: finalAttempt });

        if (outcome.kind === "ok") {
          this.state.completed.push({
            guid: entry.item.guid,
            source: entry.item.source,
            kind: "ok",
            completedAt: nowEnd,
          });
          continue;
        }

        // failure path — timeout or crash
        const note =
          outcome.kind === "timeout"
            ? `timeout_after_${outcome.durationMs}ms`
            : `crash:${outcome.error}`;
        const nextAttempts = entry.attempts + 1;
        if (nextAttempts >= this.maxAttempts) {
          this.state.deadLetter.push({
            item: entry.item,
            reason: "max_attempts",
            attempts: nextAttempts,
            deadAt: nowEnd,
            note,
          });
          deadLettered += 1;
          this.state.completed.push({
            guid: entry.item.guid,
            source: entry.item.source,
            kind: outcome.kind,
            completedAt: nowEnd,
            note,
          });
        } else {
          this.state.pending.push({
            item: entry.item,
            attempts: nextAttempts,
            enqueuedAt: entry.enqueuedAt,
            lastError: note,
          });
        }
      }

      // 6) Prune completed log to dedup window.
      const dedupCutoff = nowEnd - this.completedDedupMs;
      this.state.completed = this.state.completed.filter((c) => c.completedAt >= dedupCutoff);

      return {
        dispatched,
        pendingAfter: this.state.pending.length,
        deferred,
        deadLettered,
        dailyUsed: this.state.dailyUsed,
        dailyRemaining: Math.max(0, this.dailyBudget - this.state.dailyUsed),
        outcomes: settled,
      };
    } finally {
      this.flushing = false;
    }
  }

  // ── private helpers ──

  /**
   * Run one dispatch with timeout enforcement. Never throws — caller
   * always sees a DispatchOutcome.
   */
  private async runOne(
    entry: QueueEntry,
    dispatchFn: DispatchFn,
  ): Promise<{ entry: QueueEntry; dispatchId: string; outcome: DispatchOutcome }> {
    const dispatchId = this.randomId();
    const ctrl = new AbortController();
    const startedAt = this.nowFn();
    let timer: ReturnType<typeof setTimeout> | null = null;
    // `settled` short-circuits the loser's resolution path in
    // Promise.race. Node's macrotask ordering guarantees `clearTimeout`
    // suppresses the queued timer callback, but we still guard the
    // timer body in case a microtask scheduler change ever lets the
    // callback fire after dispatch already won.
    let settled = false;

    const timerPromise = new Promise<DispatchOutcome>((resolve) => {
      timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        const durationMs = this.nowFn() - startedAt;
        try {
          ctrl.abort();
        } catch {
          // some environments treat .abort() with an existing reason as throw; ignore.
        }
        resolve({ kind: "timeout", durationMs });
      }, this.timeoutMs);
    });

    const dispatchPromise = (async (): Promise<DispatchOutcome> => {
      try {
        const r = await dispatchFn(entry.item, ctrl.signal, dispatchId);
        if (settled) {
          // Timer arm already won this race; the late ok-result is
          // discarded by Promise.race (the wrapper Promise from this
          // IIFE will resolve, but Promise.race ignores it).
          const durationMs = this.nowFn() - startedAt;
          return { kind: "ok", outcome: r, durationMs };
        }
        settled = true;
        const durationMs = this.nowFn() - startedAt;
        return { kind: "ok", outcome: r, durationMs };
      } catch (err) {
        const durationMs = this.nowFn() - startedAt;
        if (settled) {
          return {
            kind: "crash",
            error: err instanceof Error ? err.message : String(err),
            durationMs,
          };
        }
        settled = true;
        return {
          kind: "crash",
          error: err instanceof Error ? err.message : String(err),
          durationMs,
        };
      }
    })();

    let outcome: DispatchOutcome;
    try {
      outcome = await Promise.race([dispatchPromise, timerPromise]);
    } finally {
      if (timer !== null) clearTimeout(timer);
    }

    // If the DispatchFn returned ok:false, normalise to engine "crash"
    // so downstream retry logic kicks in (we treat dispatcher-reported
    // failure the same as a thrown error — both are token-spent + no
    // useful research output).
    if (outcome.kind === "ok" && outcome.outcome.ok === false) {
      return {
        entry,
        dispatchId,
        outcome: {
          kind: "crash",
          error: outcome.outcome.error || "dispatch_returned_ok_false",
          durationMs: outcome.durationMs,
        },
      };
    }

    return { entry, dispatchId, outcome };
  }

  /** Validate an inbound state object without mutating engine state. */
  private cloneAndValidateState(next: QueueState): LoadOutcome {
    if (!next || typeof next !== "object") {
      return { ok: false, pending: 0, error: "not_an_object" };
    }
    if (!Array.isArray(next.pending)) {
      return { ok: false, pending: 0, error: "pending_not_array" };
    }
    if (!Array.isArray(next.completed)) {
      return { ok: false, pending: 0, error: "completed_not_array" };
    }
    if (!Array.isArray(next.deadLetter)) {
      return { ok: false, pending: 0, error: "deadLetter_not_array" };
    }
    if (typeof next.dayKey !== "string" || next.dayKey.length === 0) {
      return { ok: false, pending: 0, error: "dayKey_missing" };
    }
    if (!Number.isFinite(next.dailyUsed) || (next.dailyUsed as number) < 0) {
      return { ok: false, pending: 0, error: "dailyUsed_invalid" };
    }
    return { ok: true, pending: next.pending.length };
  }

  /**
   * If the current UTC day differs from the persisted `dayKey`, reset
   * the daily counter. Called at the top of every public method that
   * reads or writes `dailyUsed`.
   */
  private rolloverIfNeeded(): void {
    const today = utcDayKey(this.nowFn());
    if (this.state.dayKey !== today) {
      this.state.dayKey = today;
      this.state.dailyUsed = 0;
    }
  }
}

// ─── Singleton ──────────────────────────────────────────────────────

/**
 * Production singleton. The dispatcher action
 * `prism_ai:auto_research_dispatch` (this milestone, U-ALL07/U-ALL08
 * wiring batch) and the CLI (`scripts/auto-research-flush.mjs`,
 * deferred to the U-ALL09 cron landing) share this instance.
 *
 * No dispatch is wired by default — `setDispatch()` injects the
 * production researcher-subagent dispatcher when ready. This keeps
 * the engine importable from process boot without forcing a circular
 * dependency on the Agent-tool surface.
 *
 * // WIRE-EXEMPT: dispatcher action `prism_ai:auto_research_dispatch`
 * // lands in the same U-ALL07/U-ALL08 wiring batch. The CLI is
 * // deferred to U-ALL09 (cron registration). `stop-auto-wire.mjs`
 * // should suppress orphan warnings during the gap.
 */
export const autoResearchOrchestratorEngine = new AutoResearchOrchestratorEngine();
