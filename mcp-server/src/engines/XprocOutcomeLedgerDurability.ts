/**
 * XprocOutcomeLedgerDurability -- U-XPROC-LEDGER-DURABLE (slot:india 2026-06-16)
 *
 * Closes the verified orphan gap in PRISM's self-improving loop: the cross-process
 * semantic outcome ledger (CrossProcessOutcomeStore -- the bus that `xproc_outcome_publish`
 * feeds, carrying real shop-floor actual_metrics per bridge/process) was IN-MEMORY ONLY.
 * `CrossProcessOutcomeStore.configureStorePath()` had ZERO production callers (only its own
 * tests), and `record()` never triggers `persistEvent()`, so every MCP restart wiped the
 * entire outcome history that the live learners depend on:
 *   - CAMLoRAAdapterTrainerEngine       (incremental LoRA training on outcome.recorded)
 *   - ConformalPredictionLogEngine      (auto-pairs predictions on outcome.recorded)
 *   - ConformalCalibrationMonitorEngine (calibration window on outcome.completed)
 *
 * The persistence machinery (configureStorePath + persistEvent + reload + 400 lines of
 * tests) was BUILT + TESTED but never WIRED -- an R15 orphan. This module finishes the
 * wiring WITHOUT modifying the shared store's sync `record()` hot path.
 *
 *   ensureXprocLedgerDurable():
 *     1. (OPT-IN gate) no-op unless PRISM_XPROC_LEDGER_DURABLE=1 (or an explicit opts.path is
 *        passed -- test/caller injection). Default OFF preserves the current in-memory
 *        behavior: making the ledger durable + reloading on restart changes BOOT semantics
 *        for the shared consumers above, so activation is a deliberate one-env-var fleet
 *        decision, not a unilateral flip. ACTIVATE FLEET-WIDE: set PRISM_XPROC_LEDGER_DURABLE=1
 *        in settings.json env (recommended -- net-positive: the self-improving loop's
 *        shop-floor memory then survives restarts).
 *     2. subscribe FIRST (sync) to outcome.recorded + outcome.completed on the feedback bus.
 *     3. configureStorePath(path) -- reloads prior records (restores the learning signal
 *        across restarts) -- then drain the cold-start buffer.
 *     4. every subsequent recorded/completed outcome -> persistEvent(id) (append-only jsonl).
 *
 * Race-free: the bus fans out via queueMicrotask, so the subscriber for the very first
 * record runs AFTER the triggering publish() returns; ids that arrive before
 * configureStorePath resolves are buffered in `preReadyIds` and flushed once the store
 * path is live -- nothing is missed, and fresh ids never collide with reloaded ones.
 *
 * Fail-loud: persistEvent() is async (fs.appendFile). A swallowed rejection (disk full /
 * EPERM) would silently break the durability guarantee, so every persist .catch()es and
 * increments `persistErrors` + logs -- the counter is exposed via status().
 *
 * Idempotent: a single in-flight/resolved `configurePromise` is shared across every
 * caller (publish funnel + dispatcher inline handlers), so concurrent first-uses wire once.
 *
 * Reload semantics (scrutiny-hardened):
 *   - configureStorePath reload was made dedup-by-id in the same unit (latest line wins),
 *     so a restored ledger has unique events[] -- replay()/replaySince() do NOT double-count
 *     a pending->terminal pair.
 *   - reload does NOT republish to the feedback bus (it only restores in-memory state), so
 *     id-pairing consumers (ConformalPredictionLog) never see a double-delivery on restart.
 *   - clear() is in-memory only (and store-doc'd test-only); it does NOT truncate the on-disk
 *     ledger, so a clear()+restart reload restores the records. To wipe durably, truncate the
 *     ledger file directly. Production never calls clear() on a populated store.
 *
 * KNOWN v1 SCOPE (honest):
 *   - Covers the xproc emission surface (OutcomePublishAdapterEngine + the dispatcher's
 *     inline xproc_outcome_record handlers). A direct CrossProcessOutcomeStore.record()
 *     caller that runs BEFORE any xproc publish/dispatch in a server lifetime is not
 *     persisted until the first xproc trigger wires the subscriber. A one-line call to
 *     ensureXprocLedgerDurable() at server bootstrap would make it universal (follow-up,
 *     left to the bootstrap owner -- shared infra, out of india's safe lane this pass).
 *   - Append-only jsonl. The semantic bus is low-traffic (shop-floor outcomes, not
 *     per-tool telemetry -- that is the separate outcome-bus.jsonl shell bus), so disk
 *     growth is slow; reload bounds MEMORY via the store ring buffer. A store-side
 *     compact() / rotation (needs the engine's private dedup index) is the documented
 *     follow-up if a high-volume synthetic-outcome batch is ever pointed at this bus.
 *
 * @engine XprocOutcomeLedgerDurability
 * @unit U-XPROC-LEDGER-DURABLE
 * @see OutcomePublishAdapterEngine -- canonical publish funnel (wires this on first use)
 * @see CrossProcessOutcomeStore    -- backing ledger (configureStorePath + persistEvent)
 * @see FeedbackBusEngine           -- outcome.recorded / outcome.completed topics
 */

import path from "node:path";

import { crossProcessOutcomeStore } from "./CrossProcessOutcomeStore.js";
import {
  feedbackBusEngine,
  type FeedbackEvent,
  type SubscriptionHandle,
} from "./FeedbackBusEngine.js";

/** Canonical durable ledger path (relative to repo root / process.cwd). */
export const DEFAULT_LEDGER_PATH = "mcp-server/data/state/xproc-outcome-ledger.jsonl";
const RECORDED_TOPIC = "outcome.recorded";
const COMPLETED_TOPIC = "outcome.completed";

export interface DurabilityResult {
  /** false when not opted in (PRISM_XPROC_LEDGER_DURABLE!=1 and no opts.path) -- nothing wired. */
  enabled: boolean;
  /** absolute resolved ledger path, or null when disabled. */
  path: string | null;
  /** records reloaded from disk at configure time (restored learning signal). */
  recordsLoaded: number;
  /** true when a prior ensure call already wired the subscriber + store path. */
  alreadyWired: boolean;
}

interface DurabilityState {
  enabled: boolean;
  storeReady: boolean;
  path: string | null;
  recordsLoaded: number;
  preReadyIds: string[];
  handles: SubscriptionHandle[];
  configurePromise: Promise<DurabilityResult> | null;
  persistErrors: number;
}

function freshState(): DurabilityState {
  return {
    enabled: false,
    storeReady: false,
    path: null,
    recordsLoaded: 0,
    preReadyIds: [],
    handles: [],
    configurePromise: null,
    persistErrors: 0,
  };
}

let state: DurabilityState = freshState();

/**
 * True when the operator has opted IN to durable persistence (default OFF). Activate
 * fleet-wide by setting PRISM_XPROC_LEDGER_DURABLE=1 in the server env.
 */
export function isXprocLedgerEnabled(): boolean {
  return process.env.PRISM_XPROC_LEDGER_DURABLE === "1";
}

/**
 * Resolve the ledger path: PRISM_XPROC_LEDGER_PATH override (absolute or cwd-relative),
 * else DEFAULT_LEDGER_PATH. Always returns an absolute path.
 */
export function resolveLedgerPath(): string {
  const override = process.env.PRISM_XPROC_LEDGER_PATH;
  const raw = override && override.length > 0 ? override : DEFAULT_LEDGER_PATH;
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

/**
 * Persist one event id, FAIL-LOUD on rejection. A bare `void persistEvent()` would swallow
 * an fs.appendFile rejection (disk full / EPERM / vanished path) and silently break the
 * durability guarantee -- so we .catch(), count it, and log. Returns the in-flight promise
 * so the cold-start flush can await ordering.
 */
function persistOne(id: string): Promise<void> {
  return crossProcessOutcomeStore.persistEvent(id).catch((err: unknown) => {
    state.persistErrors += 1;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[xproc-ledger-durable] persistEvent(${id}) FAILED (durability gap): ${msg}`);
  });
}

/** Persist one event id if the store path is live; otherwise buffer for cold-start flush. */
function persistOrBuffer(id: string): void {
  if (state.storeReady) {
    void persistOne(id);
  } else {
    state.preReadyIds.push(id);
  }
}

/** Extract a string `id` from a feedback-bus event payload, or null. */
function eventId(event: FeedbackEvent): string | null {
  const payload = event.payload as { id?: unknown } | undefined;
  return payload && typeof payload.id === "string" && payload.id.length > 0
    ? payload.id
    : null;
}

/**
 * Wire durable persistence for the cross-process outcome ledger. Idempotent + race-free.
 * Safe to call from every publish path on every invocation -- the first call wires, the
 * rest return the shared result.
 *
 * Opt-in: a no-op unless PRISM_XPROC_LEDGER_DURABLE=1 OR an explicit `opts.path` is passed.
 *
 * @param opts.path -- explicit path override; also force-enables (test/caller injection).
 */
export async function ensureXprocLedgerDurable(
  opts: { path?: string } = {},
): Promise<DurabilityResult> {
  const optedIn = opts.path !== undefined || isXprocLedgerEnabled();
  if (!optedIn) {
    return { enabled: false, path: null, recordsLoaded: 0, alreadyWired: false };
  }
  if (state.configurePromise) {
    // Already wiring/wired: share the result, but report alreadyWired=true to this caller.
    return state.configurePromise.then((r) => ({ ...r, alreadyWired: true }));
  }

  state.enabled = true;
  const ledgerPath = opts.path ?? resolveLedgerPath();
  state.path = ledgerPath;

  // Subscribe synchronously BEFORE the first await so no recorded/completed event that
  // fires during configureStorePath is missed (it buffers until storeReady).
  const onEvent = (event: FeedbackEvent): void => {
    const id = eventId(event);
    if (id) persistOrBuffer(id);
  };
  state.handles.push(feedbackBusEngine.subscribe(RECORDED_TOPIC, onEvent));
  state.handles.push(feedbackBusEngine.subscribe(COMPLETED_TOPIC, onEvent));

  state.configurePromise = (async (): Promise<DurabilityResult> => {
    await crossProcessOutcomeStore.configureStorePath(ledgerPath);
    state.recordsLoaded = crossProcessOutcomeStore.size();
    state.storeReady = true;
    // Flush cold-start buffer: ids recorded while configureStorePath was in flight.
    // Sequential await preserves append ORDER (parallel appendFile would interleave lines).
    const pending = state.preReadyIds.splice(0);
    for (const id of pending) {
      await persistOne(id);
    }
    return {
      enabled: true,
      path: ledgerPath,
      recordsLoaded: state.recordsLoaded,
      alreadyWired: false,
    };
  })();

  return state.configurePromise;
}

/** Snapshot of durability wiring state. Pure read -- no side effects. */
export function xprocLedgerDurabilityStatus(): {
  enabled: boolean;
  storeReady: boolean;
  path: string | null;
  recordsLoaded: number;
  bufferedIds: number;
  subscriptions: number;
  persistErrors: number;
} {
  return {
    enabled: state.enabled,
    storeReady: state.storeReady,
    path: state.path,
    recordsLoaded: state.recordsLoaded,
    bufferedIds: state.preReadyIds.length,
    subscriptions: state.handles.length,
    persistErrors: state.persistErrors,
  };
}

/**
 * Test-only: unsubscribe the bus handles and reset module state. Does NOT touch the store
 * (callers reset the store singleton via crossProcessOutcomeStore.clear() separately).
 */
export function resetXprocLedgerDurabilityForTest(): void {
  for (const handle of state.handles) {
    feedbackBusEngine.unsubscribe(handle);
  }
  state = freshState();
}
