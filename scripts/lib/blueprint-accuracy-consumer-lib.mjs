// scripts/lib/blueprint-accuracy-consumer-lib.mjs
//
// BLUEPRINT-OCR-TRAINING-MS2/U-BPA-CONSUMER — pure functional core.
//
// The MS1 hook (`.claude/hooks/blueprint-accuracy-guard.mjs`) emits four event
// types to `state/shared/blueprint-accuracy-events.jsonl` after every blueprint
// extraction tool call:
//   - drift_observation  (conformal-bound widening >threshold)
//   - replay_add         (confidence below floor OR operator-confirmed match)
//   - outcome_record     (operator_correction block present)
//   - ewc_consolidate    (outcome count crossed CONSOLIDATE_THRESHOLD)
//
// The hook docstring says: "An offline consumer (script or scheduled task) reads
// this file and dispatches the corresponding xproc_* actions through prism_ai."
// That consumer SHIPPED (U-BPA-CONSUMER, 2026-05-18) and was made idempotent
// (U-BPA-CONSUMER-STATE-ISOLATE, 2026-06-24): it tracks its progress in its OWN
// `blueprint-accuracy-consumer-state.json`, NEVER the hook's
// `blueprint-accuracy-state.json` (which the hook resets to a fresh v1).
//
// This module is the pure core of that consumer. It does NO I/O — caller passes
// in events + current state + opts and gets back the new state + an action
// plan describing which xproc_* dispatches the caller should make. CLI shell
// (`scripts/blueprint-accuracy-consumer.mjs`) does the actual fs.read/write +
// dispatch.
//
// Idempotency: every event carries a content-derived id (or the consumer derives
// one from offset + ts + type); the consumer's state tracks `lastProcessedOffset`
// so re-running on the same file is a no-op.
//
// Schema invariant: the consumer's `blueprint-accuracy-consumer-state.json` is
// `schemaVersion:2` with `{ window, outcomesSinceConsolidate, lastConsolidatedAt,
// lastProcessedOffset, eventCounts }`. The legacy `schemaVersion:1` shape
// (`{ window: [], outcomesSinceConsolidate: 0, lastConsolidatedAt: null }` -- the
// hook's drift-state shape) is still accepted as a migration source (back-compat).

/** Default rolling-window cap. Matches the hook's PRISM_BLUEPRINT_ROLLING_WINDOW default. */
export const DEFAULT_WINDOW_CAP = 50;

/** Min/max window cap clamp (matches hook bounds). */
export const MIN_WINDOW_CAP = 5;
export const MAX_WINDOW_CAP = 500;

/** Default consolidation threshold. Matches hook's PRISM_BLUEPRINT_CONSOLIDATE_THRESHOLD. */
export const DEFAULT_CONSOLIDATE_THRESHOLD = 25;

/** Event types we recognize. Anything else routes to `unknown` bucket. */
export const KNOWN_EVENT_TYPES = Object.freeze([
  "drift_observation",
  "replay_add",
  "outcome_record",
  "predlog_pair",
  "ewc_consolidate",
]);

/** Maps each event type to the canonical xproc_* dispatch action. */
export const EVENT_TO_XPROC_ACTION = Object.freeze({
  drift_observation: "xproc_drift_observe",
  replay_add: "xproc_replay_add",
  // CREATE action (crossProcessOutcomeStore.record -> new id), NOT the UPDATE
  // variant `xproc_outcome_record_outcome` (recordOutcome(id) -- THROWS without
  // an `id`). Every outcome_record producer (the canonical writer's
  // rag_extraction events + the hook's operator_correction dispatch) emits NO
  // `id`, so the _outcome variant would fail-soft 100% once the live drainer
  // dispatches. The hook's pre-computed dispatch already names xproc_outcome_record
  // (blueprint-accuracy-guard.mjs); this aligns the map with it. (U-BPA-LOOP-DRAIN-CORE)
  outcome_record: "xproc_outcome_record",
  predlog_pair: "xproc_predlog_pair",
  ewc_consolidate: "xproc_ewc_consolidate",
});

/**
 * Top-level `type` aliases. Some writers emit a divergent top-level `type`
 * instead of the canonical shape. The canonical JS builder
 * (`training-driver-lib.buildOperatorCorrectionEvent`) emits
 * `type:"outcome_record"` with `payload.kind:"operator_correction"`, and the
 * MS1 hook dispatches `xproc_outcome_record` for operator corrections -- so an
 * operator correction IS an outcome record. But a divergent (python) writer was
 * observed emitting top-level `type:"operator_correction"` directly, which fell
 * through to the `unknown` bucket and was SILENTLY DROPPED -- losing the single
 * highest-value training signal (human-confirmed ground truth). We absorb that
 * divergence here so the loop still consumes it, while `summary.aliasedCount`
 * keeps the divergence observable (fail-loud, not silently masked).
 *
 * ADD-only: aliasing a type that is already canonical is a no-op; never remove a
 * known type via this map.
 */
export const EVENT_TYPE_ALIASES = Object.freeze({
  operator_correction: "outcome_record",
});

/**
 * Resolve a raw event type through the alias map. Unknown/aliased-to-unknown
 * types are returned unchanged (the caller buckets them to `unknown`).
 *
 * @param {string} rawType
 * @returns {string}
 */
export function resolveEventType(rawType) {
  if (typeof rawType !== "string") return "unknown";
  return EVENT_TYPE_ALIASES[rawType] ?? rawType;
}

/** Current schemaVersion the consumer writes. Migration from v1 is additive. */
export const STATE_SCHEMA_VERSION = 2;

/**
 * State-file basenames. THE CONSUMER MUST NOT SHARE A FILE WITH THE HOOK.
 *
 * The MS1 hook (`blueprint-accuracy-guard.mjs`) persists its OWN rolling-window
 * drift state -- `schemaVersion:1` with `window:[{ts,width}]` -- to
 * `HOOK_STATE_FILENAME`, and its `loadState` accepts ONLY `schemaVersion===1`
 * (anything else is treated as corrupt and reset to a fresh v1). The consumer
 * writes `schemaVersion:2` with `lastProcessedOffset`/`eventCounts` and a
 * window of `{type,ts,payload}` events. If both point at the same path:
 *   1. the hook reads the consumer's v2 file, rejects it (schema!==1), and
 *      overwrites it with a fresh v1 -- DESTROYING `lastProcessedOffset`;
 *   2. the consumer's next run migrates that v1 file, finds no offset, defaults
 *      to 0, and RE-PROCESSES the entire ledger (inflated daily-ledger counts +
 *      duplicate xproc action lists -- the closed-loop signal double-counts);
 *   3. the two `window` arrays hold incompatible shapes, cross-polluting.
 * They are semantically distinct states and require distinct files
 * (U-BPA-CONSUMER-STATE-ISOLATE, slot:india; R7 don't-blend-two-states). The
 * consumer owns CONSUMER_STATE_FILENAME and never touches the hook's path.
 */
export const HOOK_STATE_FILENAME = "blueprint-accuracy-state.json";
export const CONSUMER_STATE_FILENAME = "blueprint-accuracy-consumer-state.json";

/**
 * Parse a single JSONL line into an event object. Returns null on malformed
 * input (fail-soft — corrupt lines must NOT block legitimate downstream events).
 *
 * @param {string} line — one line from the events JSONL file
 * @returns {object|null}
 */
export function parseEventLine(line) {
  if (typeof line !== "string") return null;
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const obj = JSON.parse(trimmed);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
    if (typeof obj.type !== "string") return null;
    return obj;
  } catch {
    return null;
  }
}

/**
 * Parse a JSONL blob (file contents) into an array of well-formed events.
 * Malformed lines are dropped (counted in the returned stats).
 *
 * @param {string} blob
 * @returns {{ events: object[], malformedCount: number, totalLines: number }}
 */
export function parseEventsBlob(blob) {
  if (typeof blob !== "string" || !blob.length) {
    return { events: [], malformedCount: 0, totalLines: 0 };
  }
  const lines = blob.split(/\r?\n/);
  const events = [];
  let malformed = 0;
  let total = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    total += 1;
    const e = parseEventLine(line);
    if (e === null) {
      malformed += 1;
      continue;
    }
    events.push(e);
  }
  return { events, malformedCount: malformed, totalLines: total };
}

/**
 * Clamp a window cap value to [MIN_WINDOW_CAP, MAX_WINDOW_CAP]. Non-finite or
 * non-positive values fall back to DEFAULT_WINDOW_CAP.
 *
 * @param {unknown} v
 * @returns {number}
 */
export function clampWindowCap(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_WINDOW_CAP;
  if (n < MIN_WINDOW_CAP) return MIN_WINDOW_CAP;
  if (n > MAX_WINDOW_CAP) return MAX_WINDOW_CAP;
  return Math.floor(n);
}

/**
 * Normalize a possibly-v1 state object into v2 shape. v1 lacked
 * `lastProcessedOffset` and `eventCounts`; we add them with safe defaults.
 * Returns a NEW object — does not mutate input.
 *
 * @param {object|null|undefined} state — current persisted state
 * @returns {{ schemaVersion: number, window: object[], outcomesSinceConsolidate: number, lastConsolidatedAt: string|null, lastProcessedOffset: number, eventCounts: object }}
 */
export function migrateState(state) {
  const base = state && typeof state === "object" ? state : {};
  const window = Array.isArray(base.window) ? base.window.slice() : [];
  const outcomesSinceConsolidate = Number.isFinite(Number(base.outcomesSinceConsolidate))
    ? Math.max(0, Math.floor(Number(base.outcomesSinceConsolidate)))
    : 0;
  const lastConsolidatedAt =
    typeof base.lastConsolidatedAt === "string" || base.lastConsolidatedAt === null
      ? base.lastConsolidatedAt
      : null;
  const lastProcessedOffset = Number.isFinite(Number(base.lastProcessedOffset))
    ? Math.max(0, Math.floor(Number(base.lastProcessedOffset)))
    : 0;
  const eventCountsIn = base.eventCounts && typeof base.eventCounts === "object" && !Array.isArray(base.eventCounts)
    ? base.eventCounts
    : {};
  const eventCounts = {};
  for (const t of KNOWN_EVENT_TYPES) {
    const v = Number(eventCountsIn[t]);
    eventCounts[t] = Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
  }
  const u = Number(eventCountsIn.unknown);
  eventCounts.unknown = Number.isFinite(u) && u >= 0 ? Math.floor(u) : 0;

  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    window,
    outcomesSinceConsolidate,
    lastConsolidatedAt,
    lastProcessedOffset,
    eventCounts,
  };
}

/**
 * Apply a list of events to a state. Returns the new state + an action plan
 * naming which xproc_* dispatches the caller should make (one per applicable
 * event, in arrival order — caller can batch or sequence).
 *
 * `outcomesSinceConsolidate` increments on each `outcome_record` event and
 * resets to 0 when an `ewc_consolidate` event lands (mirroring the hook's
 * intent: consolidation marks the boundary). When a window-bounded entry
 * pushes off the FIFO front, no event is emitted — bookkeeping only.
 *
 * @param {object|null|undefined} stateIn
 * @param {object[]} events
 * @param {{ windowCap?: number, consolidateThreshold?: number, now?: () => string }} [opts]
 * @returns {{ state: object, actions: Array<{ event_type: string, xproc_action: string, payload: object }>, summary: object }}
 */
export function applyEvents(stateIn, events, opts = {}) {
  const windowCap = clampWindowCap(opts.windowCap);
  const consolidateThreshold = Number.isFinite(Number(opts.consolidateThreshold))
    ? Math.max(1, Math.floor(Number(opts.consolidateThreshold)))
    : DEFAULT_CONSOLIDATE_THRESHOLD;
  const now = typeof opts.now === "function" ? opts.now : () => new Date().toISOString();

  let state = migrateState(stateIn);
  const actions = [];
  const summary = {
    processedCount: 0,
    droppedFromWindow: 0,
    consolidationTriggeredByEvent: false,
    consolidationTriggeredByThreshold: false,
    aliasedCount: 0,
  };

  for (const ev of Array.isArray(events) ? events : []) {
    if (!ev || typeof ev !== "object" || typeof ev.type !== "string") continue;

    // Resolve divergent top-level aliases (e.g. operator_correction ->
    // outcome_record) BEFORE the known-type check so a valuable signal emitted
    // with a non-canonical type still drives the loop instead of dropping to
    // the unknown bucket. aliasedCount surfaces the divergence (fail-loud).
    const resolvedType = resolveEventType(ev.type);
    const wasAliased = resolvedType !== ev.type;
    const t = KNOWN_EVENT_TYPES.includes(resolvedType) ? resolvedType : "unknown";
    if (wasAliased && t !== "unknown") summary.aliasedCount += 1;
    state.eventCounts[t] = (state.eventCounts[t] ?? 0) + 1;

    if (t === "unknown") continue;

    // Append to rolling window (FIFO bounded).
    state.window.push({
      type: t,
      ts: typeof ev.ts === "string" ? ev.ts : now(),
      payload: ev.payload ?? null,
    });
    while (state.window.length > windowCap) {
      state.window.shift();
      summary.droppedFromWindow += 1;
    }

    // outcome_record bumps the consolidate counter. ewc_consolidate resets it.
    if (t === "outcome_record") {
      state.outcomesSinceConsolidate += 1;
    } else if (t === "ewc_consolidate") {
      state.outcomesSinceConsolidate = 0;
      state.lastConsolidatedAt = typeof ev.ts === "string" ? ev.ts : now();
      summary.consolidationTriggeredByEvent = true;
    }

    actions.push({
      event_type: t,
      xproc_action: EVENT_TO_XPROC_ACTION[t],
      payload: ev.payload ?? null,
    });
    summary.processedCount += 1;
  }

  // Implicit consolidation: outcomesSinceConsolidate crossed threshold. Append
  // an ewc_consolidate action so the caller dispatches xproc_ewc_consolidate.
  // We DO NOT reset the counter here — the dispatched action will eventually
  // emit its own ewc_consolidate event back through the hook, which will reset
  // on the next consumer pass. (Caller can opt to short-circuit by passing
  // `opts.resetOnThreshold: true`; default false preserves the source-of-truth
  // round-trip.)
  if (state.outcomesSinceConsolidate >= consolidateThreshold) {
    summary.consolidationTriggeredByThreshold = true;
    actions.push({
      event_type: "ewc_consolidate",
      xproc_action: EVENT_TO_XPROC_ACTION.ewc_consolidate,
      payload: { reason: "threshold", outcomesSinceConsolidate: state.outcomesSinceConsolidate, threshold: consolidateThreshold },
    });
    if (opts.resetOnThreshold === true) {
      state.outcomesSinceConsolidate = 0;
      state.lastConsolidatedAt = now();
    }
  }

  return { state, actions, summary };
}

/**
 * Compute a daily consolidation summary from the current state. Pure — caller
 * decides where to write it.
 *
 * @param {object} state — post-migration state object
 * @param {{ now?: () => string }} [opts]
 * @returns {object}
 */
export function buildConsolidationSummary(state, opts = {}) {
  const now = typeof opts.now === "function" ? opts.now : () => new Date().toISOString();
  const generatedAt = now();
  const s = migrateState(state);
  const windowByType = {};
  for (const e of s.window) {
    const t = e?.type ?? "unknown";
    windowByType[t] = (windowByType[t] ?? 0) + 1;
  }
  return {
    schemaVersion: 1,
    generatedAt,
    windowSize: s.window.length,
    windowByType,
    outcomesSinceConsolidate: s.outcomesSinceConsolidate,
    lastConsolidatedAt: s.lastConsolidatedAt,
    lastProcessedOffset: s.lastProcessedOffset,
    eventCounts: { ...s.eventCounts },
  };
}

/**
 * Compute the new lastProcessedOffset after consuming a blob. The offset is
 * the byte length of the blob (UTF-8) — caller passes Buffer.byteLength(blob)
 * + prior offset. We expose this helper so the offset advance is testable
 * independent of fs.
 *
 * @param {number} priorOffset
 * @param {number} blobByteLength
 * @returns {number}
 */
export function advanceOffset(priorOffset, blobByteLength) {
  const p = Number.isFinite(Number(priorOffset)) ? Math.max(0, Math.floor(Number(priorOffset))) : 0;
  const b = Number.isFinite(Number(blobByteLength)) ? Math.max(0, Math.floor(Number(blobByteLength))) : 0;
  return p + b;
}
