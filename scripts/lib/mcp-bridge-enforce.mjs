#!/usr/bin/env node
// tier: lib
/**
 * mcp-bridge-enforce.mjs -- pure decision logic for the PreToolUse MCP-bridge
 * ENFORCEMENT gate (MCP-CLIENT-ENFORCE-MS1, 2026-06-16, slot bravo).
 *
 * THE GAP THIS CLOSES (operator pain 2026-06-16: "chats still losing connection
 * and enforcements in place for chats to check to see if they're connected don't
 * work"):
 *   `mcp-connectivity-check.mjs` (UserPromptSubmit) and `mcp-bridge-liveness.mjs`
 *   already DETECT a dead per-chat bridge precisely and inject a banner. But that
 *   banner is advisory `additionalContext` -- the model can (and does) ignore it,
 *   so the chat keeps firing dead mcp__prism__* calls. There was NO hard gate.
 *
 *   This module is the ENFORCEMENT half: a PreToolUse hook calls decideEnforcement
 *   with the SAME tested liveness verdict (reused, not re-derived -- R8) and, on a
 *   CONFIDENT disconnect, returns block=true so the harness DENIES the tool call.
 *   The block is a hard interrupt the model cannot skip past silently.
 *
 * NO-DEADLOCK INVARIANT (the load-bearing safety property): a hook CANNOT reconnect
 *   the harness MCP client (harness-owned -- only `/mcp` does). So blocking EVERY
 *   tool call forever would brick the chat. We block at most ONCE per `throttleMs`
 *   window (default 3min): the first dead-bridge tool call is hard-denied with the
 *   recovery directive, then enforcement goes quiet so the model can proceed with
 *   the documented MCP-down fallbacks (`node scripts/<X>.mjs`, `prism_safe`). This
 *   converts an IGNORABLE banner into an UNMISSABLE one-shot interrupt, without ever
 *   trapping a chat that genuinely cannot self-reconnect.
 *
 * NO-FALSE-POSITIVE INVARIANT: we block ONLY on `isConfidentlyDisconnected` verdicts
 *   (pid-dead / stale-heartbeat) or a fleet-wide bridges===0 outage. We NEVER block on
 *   no-sentinel / unknown-slot / parse-error / a stale-or-absent fleet cache -- those
 *   are "no signal" (a pre-upgrade bridge, a shared-tree chat, a cold cache), and a
 *   false block there would be far worse than a missed enforce. This mirrors
 *   mcp-bridge-liveness.isConfidentlyDisconnected exactly.
 *
 * AUTO-BROADCAST: when the FLEET-wide bridge count is 0 (every chat down -- e.g. the
 *   daemon was swapped), the first chat to detect it writes/refreshes
 *   state/shared/mcp-reconnect-signal.json so the existing
 *   mcp-broadcast-reconnect-inject.mjs nudges ALL 26 slots to `/mcp`. That makes the
 *   enforcement AUTOMATED + FLEET-WIDE from a single detection, not 26 independent ones.
 *
 * Pure (testable) exports: decideEnforcement, buildEnforceReason, buildBroadcastSignal,
 *   shouldWriteBroadcast, BROADCAST_SCHEMA_VERSION, DEFAULT_THROTTLE_MS, DEFAULT_BROADCAST_TTL_SEC.
 */

export const DEFAULT_THROTTLE_MS = 180_000; // block at most once per 3min per chat
export const DEFAULT_BROADCAST_TTL_SEC = 900; // 15min -- matches the reaper enum-cache cadence
export const BROADCAST_SCHEMA_VERSION = "1.0.0";

/**
 * Pure enforcement decision. Reuses the liveness verdict + fleet bridge count;
 * does NOT re-derive connectivity (single source of truth = mcp-bridge-liveness).
 *
 * @param {object} a
 * @param {object|null} a.verdict     readBridgeLiveness() result for THIS chat (per-chat sentinel)
 * @param {object|null} a.fleetBridges countBridges() result { ok, bridges, ageSec } or null
 * @param {boolean} [a.serverUp]      cached :3100 health (true=healthy). When true, a fleet
 *                                    count of 0 is treated as IDLE (no reconnect broadcast),
 *                                    since 0 transient bridges + a healthy server is normal.
 *                                    Omitted/undefined => legacy broadcast-on-fleet-0 behavior.
 * @param {number} a.lastEnforcedMs   epoch ms of this chat's last enforce-block (0 = never)
 * @param {number} a.now              epoch ms
 * @param {number} [a.throttleMs]     re-block window (default DEFAULT_THROTTLE_MS)
 * @returns {{ block:boolean, reason:string|null, broadcast:boolean, kind:string }}
 *   kind: 'connected' | 'no-signal' | 'per-chat' | 'fleet' | 'both' | 'throttled'
 */
export function decideEnforcement(a = {}) {
  const verdict = a.verdict || null;
  const fleet = a.fleetBridges || null;
  const now = Number.isFinite(a.now) ? a.now : Date.now();
  const lastEnforcedMs = Number.isFinite(a.lastEnforcedMs) ? a.lastEnforcedMs : 0;
  const throttleMs = Number.isFinite(a.throttleMs) && a.throttleMs >= 0 ? a.throttleMs : DEFAULT_THROTTLE_MS;

  // CONFIDENT per-chat disconnect == exactly the two reasons mcp-bridge-liveness
  // marks confident. Anything else (no-sentinel/unknown-slot/parse-error) is no-signal.
  const perChat = !!verdict && (verdict.reason === "pid-dead" || verdict.reason === "stale-heartbeat");
  // FLEET outage == cache is FRESH+parseable (ok:true) AND zero bridges. A stale/absent
  // cache (ok:false) is NOT an outage -- never block on missing evidence.
  const fleetOut = !!fleet && fleet.ok === true && fleet.bridges === 0;

  // BROADCAST gate (U-MCP-FALSEPOS-SUPPRESS, slot golf 2026-06-17): a fleet count of 0
  // transient bridges is the NORMAL IDLE state when the :3100 server is HEALTHY (bridges
  // are transient -- 1486 spawn/exit cycles in the log; 0-live-bridges is the resting value
  // between request bursts; only 4 REAL terminal bridge deaths exist fleet-wide ever). A
  // "/mcp reconnect" broadcast is only warranted on a GENUINE fleet outage, which with the
  // evidence means the SERVER is down -- not bare fleet-0. So the broadcast fires only when
  // the caller has NOT confirmed the server healthy (serverUp !== true). Back-compat: a caller
  // that does not pass serverUp (undefined) keeps the legacy broadcast-on-fleet-0 behavior, so
  // the per-chat HARD-BLOCK decision below is entirely unchanged -- only the advisory broadcast
  // is suppressed once a caller proves the server is up.
  const broadcastOut = fleetOut && a.serverUp !== true;

  // Connected / no signal -> nothing to do.
  if (!perChat && !fleetOut) {
    return { block: false, reason: null, broadcast: false, kind: verdict && verdict.alive ? "connected" : "no-signal" };
  }

  // FLEET-WIDE count=0 drives the ADVISORY broadcast ONLY -- NEVER a hard block.
  // The enum-cache is SHARED + stale-prone: it reads 0 in EVERY chat at once, so a
  // hard block on it fires fleet-wide simultaneously and interrupts shared-tree git
  // staging across all chats (operator 2026-06-16: "mcp blocks keep eating stagings
  // for other chats"). Only a PER-CHAT confident sentinel (pid-dead / stale-heartbeat)
  // -- precise + isolated to the one genuinely-dead chat -- is safe to hard-block on.
  if (!perChat) {
    return { block: false, reason: null, broadcast: broadcastOut, kind: "fleet-advisory" };
  }

  // NO-DEADLOCK: block at most once per throttle window for this chat.
  if (lastEnforcedMs > 0 && now - lastEnforcedMs < throttleMs) {
    return { block: false, reason: null, broadcast: false, kind: "throttled" };
  }

  const kind = fleetOut ? "both" : "per-chat";
  return {
    block: true,
    reason: buildEnforceReason({ verdict, fleetOut, fleet }),
    broadcast: broadcastOut,
    kind,
  };
}

/** Pure: the rich, actionable deny reason shown to the model. */
export function buildEnforceReason({ verdict, fleetOut, fleet } = {}) {
  const detail = [];
  if (verdict && (verdict.reason === "pid-dead" || verdict.reason === "stale-heartbeat")) {
    detail.push(
      `THIS chat's bridge is ${verdict.reason}${verdict.pid ? ` (pid ${verdict.pid} gone)` : ""}`,
    );
  }
  if (fleetOut) {
    detail.push(`fleet-wide: 0 mcp-http-bridge processes running${fleet && Number.isFinite(fleet.ageSec) ? ` (enum-cache ${fleet.ageSec}s old)` : ""}`);
  }
  return [
    "PRISM MCP DISCONNECTED -- ENFORCED CHECK (your prism MCP tools are dead this session)",
    `   ${detail.join(" | ")}.`,
    "   The daemon (:3100) may be UP, but THIS session has no live MCP bridge -- every mcp__prism__* call will fail.",
    "   This block fires ONCE per disconnect episode (~3min), then degraded-mode proceeds (no deadlock).",
    "   ENFORCED ACTIONS:",
    "     1. Tell the operator: run `/mcp` -> reconnect `prism` (a hook CANNOT reconnect the harness client -- harness-owned).",
    "     2. Until reconnected, DO NOT call mcp__prism__* -- use direct fallbacks:",
    "        `node H:/prism/scripts/<X>.mjs`, the `prism_safe` stdio server, or `node scripts/system-viz-query.mjs find <q>`.",
    "     3. Self-diagnose: `node H:/prism/scripts/lib/mcp-bridge-liveness.mjs --check`",
    "   Disable enforcement (advisory-only): PRISM_MCP_ENFORCE_DISABLE=1",
  ].join("\n");
}

/** Pure: build the fleet broadcast signal record (schema matches mcp-broadcast-reconnect-inject.mjs). */
export function buildBroadcastSignal({ now = Date.now(), pid = 0, reason, ttlSec = DEFAULT_BROADCAST_TTL_SEC } = {}) {
  const signaledAtMs = Number.isFinite(now) ? now : Date.now();
  const ttl = Number.isFinite(ttlSec) && ttlSec > 0 ? ttlSec : DEFAULT_BROADCAST_TTL_SEC;
  return {
    schemaVersion: BROADCAST_SCHEMA_VERSION,
    signaledAt: new Date(signaledAtMs).toISOString(),
    signaledAtMs,
    signaledByPid: Number.isFinite(pid) ? pid : 0,
    reason: reason || "auto: fleet MCP bridge count=0 (every chat disconnected) -- /mcp reconnect prism",
    ttlSec: ttl,
    expiresAtMs: signaledAtMs + ttl * 1000,
  };
}

/**
 * Pure: should we WRITE a fresh broadcast signal? Only when there is no existing
 * signal OR the existing one is expired -- so 26 chats detecting the same outage do
 * NOT each rewrite it every turn (the existing signal's own TTL is the dedup window).
 */
export function shouldWriteBroadcast(existingSignal, now = Date.now()) {
  if (!existingSignal || typeof existingSignal !== "object") return true;
  const exp = Number(existingSignal.expiresAtMs);
  if (!Number.isFinite(exp)) return true;
  return now >= exp;
}
