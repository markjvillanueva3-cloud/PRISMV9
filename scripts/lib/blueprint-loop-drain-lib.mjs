// scripts/lib/blueprint-loop-drain-lib.mjs
//
// U-BPA-LOOP-DRAIN-CORE (slot:india, CAD/print learning-AI) -- the pure
// orchestration core that turns the blueprint-accuracy consumer's action plan
// into a sequence of xproc_* dispatches.
//
// WHY a separate, injectable core: the consumer
// (`scripts/blueprint-accuracy-consumer.mjs`) is PRINT-ONLY -- it computes the
// plan (via `applyEvents`) and prints the xproc_* actions, but nothing routes
// them through `prism_ai`, so predictions->outcomes->RETRAIN never closes its
// final arrow. A hook/script CANNOT call an MCP dispatcher (no transport), so
// the in-process routing must live in the dispatcher. This module is the SHARED
// core both sides use: the dispatcher action injects a real in-process
// `routeXprocAction`; the CLI + tests inject a mock/no-op. Build-once (R8) so
// the plan->dispatch mapping cannot drift between the two callers.
//
// The xproc_* actions the plan names are all wired in aiReasoningDispatcher
// (xproc_replay_add / xproc_drift_observe / xproc_ewc_consolidate /
// xproc_predlog_pair / xproc_outcome_record). The MS1 hook pre-computes a
// `dispatch:{action,params}` block inside each event payload, so for most events
// the params are already in the exact shape the engine expects; `resolveDispatch`
// prefers that and falls back to the canonical EVENT_TO_XPROC_ACTION map.
//
// Pure except for the injected async `dispatch` fn -- NO fs, NO MCP coupling.

import {
  parseEventsBlob,
  applyEvents,
  EVENT_TO_XPROC_ACTION,
} from "./blueprint-accuracy-consumer-lib.mjs";

/**
 * Resolve the concrete xproc dispatch `{action, params}` for one planned action.
 *
 * Priority for `action`: the plan's own `xproc_action` (set by applyEvents from
 * EVENT_TO_XPROC_ACTION) -> the EVENT_TO_XPROC_ACTION map keyed by event_type.
 * Priority for `params`: the hook-precomputed `payload.dispatch.params` (already
 * engine-shaped) -> the raw event `payload` -> `{}`.
 *
 * Returns `{ action: null }` when no xproc action can be resolved (caller skips +
 * records it -- never dispatches an undefined action).
 *
 * @param {{ event_type?: string, xproc_action?: string, payload?: any }} planAction
 * @returns {{ action: string|null, params: object }}
 */
export function resolveDispatch(planAction) {
  if (!planAction || typeof planAction !== "object") return { action: null, params: {} };
  const action =
    (typeof planAction.xproc_action === "string" && planAction.xproc_action) ||
    EVENT_TO_XPROC_ACTION[planAction.event_type] ||
    null;
  const payload = planAction.payload;
  const pre = payload && typeof payload === "object" ? payload.dispatch : null;
  let params;
  if (pre && typeof pre === "object" && pre.params && typeof pre.params === "object" && !Array.isArray(pre.params)) {
    params = pre.params;
  } else if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    params = payload;
  } else {
    params = {};
  }
  return { action, params };
}

/**
 * Drain a tail blob of JSONL events into xproc dispatches.
 *
 * Pure except for the injected async `dispatch(action, params)` fn. The OFFSET
 * advance + state persistence is the CALLER's responsibility (it reads the tail
 * from `priorState.lastProcessedOffset` and persists `newState` with the advanced
 * offset) -- this mirrors the consumer CLI so idempotency is owned in one place.
 *
 * Fail-soft PER ACTION (R12-surfaced): a single throwing dispatch is recorded in
 * `dispatched[i].error` and does NOT abort the drain or block the other actions.
 * The event is still consumed (the offset still advances in the caller) -- at-
 * most-once delivery, because NOT advancing would re-dispatch every already-
 * successful action in the tail on the next run (duplicate training signal, the
 * worse failure). Failures are surfaced in the summary so the loss is visible.
 *
 * @param {{
 *   tailBlob: string,
 *   priorState: object|null,
 *   dispatch?: (action: string, params: object) => Promise<any>,
 *   skipActions?: string[],
 *   windowCap?: number,
 *   consolidateThreshold?: number,
 *   dryRun?: boolean,
 *   now?: () => string,
 * }} args
 * @returns {Promise<{ newState: object, plan: object[], dispatched: object[], summary: object }>}
 */
export async function drainEvents(args = {}) {
  const {
    tailBlob,
    priorState,
    dispatch,
    skipActions,
    windowCap,
    consolidateThreshold,
    dryRun = false,
    now,
  } = args;

  // Actions to SKIP by policy (resolved but never routed) -- e.g. outcome_record
  // for blueprint (the machining outcome store rejects a process-agnostic
  // extraction). Counted as dispatchedSkipped, NOT dispatchedOk, so the summary
  // never overstates the real dispatch count (R12).
  const skip = new Set(Array.isArray(skipActions) ? skipActions : []);

  const parsed = parseEventsBlob(typeof tailBlob === "string" ? tailBlob : "");
  const { state, actions, summary } = applyEvents(priorState, parsed.events, {
    windowCap,
    consolidateThreshold,
    now,
  });

  const dispatched = [];
  let dispatchedOk = 0;
  let dispatchedFailed = 0;
  let dispatchedNoop = 0;
  let dispatchedSkipped = 0;
  let skippedNoAction = 0;

  if (!dryRun) {
    for (const a of actions) {
      const { action, params } = resolveDispatch(a);
      if (!action) {
        skippedNoAction += 1;
        dispatched.push({ event_type: a.event_type, action: null, ok: false, dispatched: false, error: "unresolvable xproc action" });
        continue;
      }
      // Skipped-by-policy: resolved but never routed (counted separately).
      if (skip.has(action)) {
        dispatchedSkipped += 1;
        dispatched.push({ event_type: a.event_type, action, ok: true, dispatched: false, skipped: true, note: "skipped by policy (skipActions)" });
        continue;
      }
      // No injected dispatch fn -> the action RESOLVED but nothing was actually
      // routed (plan-only). Count it separately from a real dispatch so a caller
      // reading dispatchedOk never mistakes "would-dispatch" for "really dispatched".
      if (typeof dispatch !== "function") {
        dispatchedNoop += 1;
        dispatched.push({ event_type: a.event_type, action, ok: true, dispatched: false, note: "no dispatch fn (plan-only)" });
        continue;
      }
      try {
        const result = await dispatch(action, params);
        dispatchedOk += 1;
        dispatched.push({ event_type: a.event_type, action, ok: true, dispatched: true, result: result ?? null });
      } catch (e) {
        dispatchedFailed += 1;
        dispatched.push({ event_type: a.event_type, action, ok: false, dispatched: false, error: e instanceof Error ? e.message : String(e) });
      }
    }
  }

  return {
    newState: state,
    plan: actions,
    dispatched,
    summary: {
      ...summary,
      parsedEvents: parsed.events.length,
      malformedCount: parsed.malformedCount,
      planCount: actions.length,
      dryRun,
      dispatchedOk,
      dispatchedFailed,
      dispatchedNoop,
      dispatchedSkipped,
      skippedNoAction,
    },
  };
}
