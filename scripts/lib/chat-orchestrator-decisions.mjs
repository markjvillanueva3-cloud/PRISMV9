/**
 * chat-orchestrator-decisions.mjs — pure decision functions for the
 * CHAT-ORCHESTRATOR-MS0 golf-side fleet orchestrator.
 *
 * Two decisions, both no-IO + fully deterministic + injection-free, so they
 * are exhaustively testable without any process / filesystem / window state.
 * The orchestrator main loop (scripts/chat-orchestrator.mjs) is the only
 * caller; it gathers state from chat-slots / fleet-memory-monitor / token-
 * watch / ps-window-pin readers, hands the bundled state to these two
 * functions, and then executes the returned action via respawn (U-CHO03),
 * UI Automation SendKeys (U-CHO04), or advisory injection (U-CHO06).
 *
 * DOCTRINE — golf is an ORCHESTRATOR not a SEIZER. Every action is opt-in
 * by the target chat (orchestrator-advisory-inject hook must be wired) or
 * gated by an env knob. The decision functions never recommend action
 * outside that contract; e.g. they never recommend "compact" on a chat
 * that the orchestrator cannot reach.
 *
 * R12 fail-loud: when state is incomplete or ambiguous, return a SAFE
 * default (noop / skip-unknown) and surface the reason — never guess.
 */

// ─── decideClearOrCompact ───────────────────────────────────────────────────

/**
 * Recommend a context-relief action for ONE chat based on its measured
 * context-fill pressure + continuity state.
 *
 * Decision tree:
 *   pressureLevel === "clean"     → "noop"  (no relief needed)
 *   pressureLevel === "warn"      → "advise-only" (early signal, no action)
 *   pressureLevel === "critical" AND (hasActiveLoop OR hasUncommittedCriticalWork)
 *                                 → "compact" (preserve RESUME continuity)
 *   pressureLevel === "critical" AND clean continuity state
 *                                 → "clear" (cheaper full reset)
 *   anything else                 → "advise-only" (degrade-to-safe)
 *
 * "compact" is the PRESERVE-CONTINUITY choice: it summarises but keeps the
 * conversation thread + handoff RESUME directive intact, so a /loop or
 * mid-build chat picks up where it was.
 *
 * "clear" is the CHEAPER-FULL-RESET choice: it wipes the context entirely
 * and the chat starts fresh — only appropriate when there's nothing
 * load-bearing to lose. The orchestrator separately pre-populates the
 * pinned handoff with `## RESUME: /startup-<slot>` BEFORE issuing /clear
 * so the auto-resume hook (session-start-auto-resume) re-bootstraps the
 * cleared chat into its slot.
 *
 * @param {object} chatState
 * @param {number} chatState.tokensEstimate  — measured tokens-since-last-compact (informational)
 * @param {"clean"|"warn"|"critical"} chatState.pressureLevel  — pressure classification (load-bearing)
 * @param {boolean} chatState.hasActiveLoop  — loop-state.mjs reports status==="running" for this session
 * @param {boolean} chatState.hasUncommittedCriticalWork  — git status shows uncommitted source code (.ts/.mjs/.tsx)
 * @param {boolean} chatState.hasUnresolvedHandoff  — pinned handoff has a fresh ## RESUME directive
 * @returns {{ action: "noop"|"advise-only"|"clear"|"compact", reason: string }}
 */
export function decideClearOrCompact(chatState) {
  if (!chatState || typeof chatState !== "object") {
    return { action: "advise-only", reason: "missing-chat-state-fail-safe" };
  }
  const level = chatState.pressureLevel;
  if (level !== "clean" && level !== "warn" && level !== "critical") {
    return { action: "advise-only", reason: `unknown-pressure-level:${String(level)}` };
  }
  if (level === "clean") {
    return { action: "noop", reason: "pressure-clean" };
  }
  if (level === "warn") {
    return { action: "advise-only", reason: "pressure-warn-early-signal" };
  }
  // pressureLevel === "critical" — must act, decide HOW.
  const hasLoop = chatState.hasActiveLoop === true;
  const hasUncommitted = chatState.hasUncommittedCriticalWork === true;
  const hasHandoff = chatState.hasUnresolvedHandoff === true;
  if (hasLoop) {
    return { action: "compact", reason: "critical-active-loop-preserve-continuity" };
  }
  if (hasUncommitted) {
    return { action: "compact", reason: "critical-uncommitted-critical-work-preserve" };
  }
  if (hasHandoff) {
    return { action: "compact", reason: "critical-unresolved-handoff-preserve" };
  }
  // Critical pressure + clean continuity state → /clear is cheaper.
  return { action: "clear", reason: "critical-clean-state-cheap-reset" };
}

// ─── decideRestartAction ────────────────────────────────────────────────────

/**
 * Recommend whether a slot's claude.exe should be respawned by the
 * orchestrator.
 *
 * Decision tree (each clause early-returns on the first match):
 *   status === "alive" AND claudePidAlive       → "skip-alive"
 *   status === "alive" AND !claudePidAlive AND ageMs < 30s
 *                                                → "skip-still-claim" (race window)
 *   status === "crashed" AND terminalWindowAlive AND hasPin
 *                                                → "respawn"
 *   status === "crashed" AND (!terminalWindowAlive OR !hasPin)
 *                                                → "skip-unrecoverable"
 *   status missing / not-recognized              → "skip-unknown"
 *
 * The respawn path requires BOTH a live PowerShell window AND a pin (so
 * the orchestrator knows WHICH window to spawn the new claude.exe in).
 * Without either, the orchestrator cannot reliably reach the right
 * terminal — surface as `skip-unrecoverable` and let the operator
 * manually re-`/checkin-<slot>` in a fresh terminal.
 *
 * @param {object} slotState
 * @param {"alive"|"crashed"|"stale"|null|undefined} slotState.status
 * @param {boolean} slotState.claudePidAlive  — claude.exe pinned to this slot is in Win32_Process
 * @param {number} slotState.ageMs            — ms since lastHeartbeat
 * @param {boolean} slotState.terminalWindowAlive — PS-window PID from ps-window-pin still alive
 * @param {boolean} slotState.hasPin          — entry exists in ps-window-pins.json
 * @returns {{ action: "respawn"|"skip-alive"|"skip-still-claim"|"skip-unrecoverable"|"skip-unknown", reason: string }}
 */
export function decideRestartAction(slotState) {
  if (!slotState || typeof slotState !== "object") {
    return { action: "skip-unknown", reason: "missing-slot-state-fail-safe" };
  }
  const status = slotState.status;
  const alive = slotState.claudePidAlive === true;
  const ageMs = Number.isFinite(slotState.ageMs) ? slotState.ageMs : Infinity;
  const winAlive = slotState.terminalWindowAlive === true;
  const hasPin = slotState.hasPin === true;
  if (status === "alive" && alive) {
    return { action: "skip-alive", reason: "claude-exe-running" };
  }
  if (status === "alive" && !alive && ageMs < 30000) {
    return { action: "skip-still-claim", reason: "claim-recency-30s-window" };
  }
  if (status === "crashed" && winAlive && hasPin) {
    return { action: "respawn", reason: "crashed-window-alive-pin-present" };
  }
  if (status === "crashed" && (!winAlive || !hasPin)) {
    const why = !winAlive ? "ps-window-dead" : "no-pin";
    return { action: "skip-unrecoverable", reason: `crashed-${why}-operator-must-recheckin` };
  }
  return { action: "skip-unknown", reason: `unrecognized-status:${String(status)}` };
}

// ─── Helpers — exported only for testability ────────────────────────────────

/** Clamp + normalise a pressure-level string to the 3 known values. */
export function normalisePressureLevel(raw) {
  if (raw === "clean" || raw === "warn" || raw === "critical") return raw;
  return null;
}

/** Helper: which actions are SAFE side-effects (never reach an external chat)? */
export const SAFE_ACTIONS = new Set([
  "noop", "advise-only", "skip-alive", "skip-still-claim",
  "skip-unrecoverable", "skip-unknown",
]);

/** Helper: which actions DO reach a target chat (need authorisation gate)? */
export const REACHING_ACTIONS = new Set([
  "clear", "compact", "respawn",
]);
