// ZULU-ORCHESTRATOR-MS0 / U-ZULU02 — pure-core orchestrator library.
//
// Composes CHO01 (decideClearOrCompact) + CHO02 (readChatPressure) + U-ZULU01
// (resolveHwndFromPid) + U-ZULU05 (buildCheckinPayload) + U-CHO04 (PS
// send-keys-to-window.ps1) into a per-slot orchestration plan. All planning
// logic is pure & deterministic — the only I/O happens in the CLI shell
// (scripts/zulu-orchestrator-sweep.mjs), which injects readers/writers/spawn.
//
// SAFETY INVARIANTS (load-bearing, per ZULU-ORCHESTRATOR-DESIGN.md §safety):
//   1. Per-slot opt-in default FALSE — slots[name].zuluOptIn must === true.
//   2. Env kill switch cascade — PRISM_ZULU_DISABLE=1 ⇒ no slots eligible;
//      PRISM_SENDKEYS_DISABLE=1 ⇒ every plan downgrades to dry-run.
//   3. Dry-run grace period — a slot whose opt-in is newer than dryRunUntilMs
//      runs in dry-run regardless of operator config.
//   4. No self-action — the chat running this sweep MUST NOT plan an action
//      against its OWN slot (would race the decision loop on the same window).
//      Also: the golf hygiene slot is always self-exempt — it never operates
//      on itself.
//   5. Stagger — caller (CLI) enforces ≥staggerMs between successive
//      SendKeys executions; we expose the constant.
//   6. R12 fail-loud — every error path is named in the result envelope,
//      never silently dropped.

import {
  buildAwarenessHint,
  buildCheckinPayload,
} from "./zulu-bd-priority.mjs";

export const DEFAULT_STAGGER_MS = 5000;
// G3 — /compact on a large chat runs 20-60s+; the normal inter-line stagger
// would land the follow-up /checkin keystrokes mid-compaction and corrupt
// them. After a /compact line we wait this much longer, generous-flat window.
// Waiting too long only delays; too short corrupts — so we bias hard to safe.
export const DEFAULT_COMPACT_WAIT_MS = 90 * 1000;
// A /precompact line makes the MODEL author its handoff (~30-60s), so the
// follow-up /compact must NOT land 5s later (the old stagger) mid-authoring.
// Give /precompact the same generous flat window as /compact. Knob:
// PRISM_ZULU_PRECOMPACT_WAIT_MS (sweep) / opts.precompactWaitMs (here).
export const DEFAULT_PRECOMPACT_WAIT_MS = 75 * 1000;
export const DEFAULT_DRY_RUN_GRACE_HOURS = 24;
// The chat slot reserved for ZULU itself when it acquires a real chat —
// it must never plan against its own slot OR against the golf hygiene slot
// (golf has its own kill-switch + write-allowlist; zulu orchestrates work
// slots only).
export const SELF_EXEMPT_SLOTS = Object.freeze(["zulu", "golf"]);

// Pure: filter the slots doc to slots eligible for orchestration.
// Returns array of { slot, entry, optIn, optInAt, optedInRecently }.
// `selfSlot` is the slot the running sweep is bound to (or null if N/A).
// `now` is injected (ms epoch) so tests are deterministic.
export function pickActionableSlots(slotsDoc, opts = {}) {
  if (!slotsDoc || !slotsDoc.slots || typeof slotsDoc.slots !== "object") {
    return [];
  }
  const selfSlot = typeof opts.selfSlot === "string" ? opts.selfSlot : null;
  const now = typeof opts.now === "number" ? opts.now : Date.now();
  const graceHours = typeof opts.dryRunGraceHours === "number"
    ? opts.dryRunGraceHours
    : DEFAULT_DRY_RUN_GRACE_HOURS;
  const graceMs = graceHours * 60 * 60 * 1000;

  const out = [];
  for (const [slot, entry] of Object.entries(slotsDoc.slots)) {
    if (!entry || typeof entry !== "object") continue;
    if (SELF_EXEMPT_SLOTS.includes(slot)) continue;
    if (selfSlot && slot === selfSlot) continue;
    if (entry.zuluOptIn !== true) continue;
    // GAP#1 fix: the PID for HWND resolution lives in entry.pid (a number).
    // entry.terminalWindowId is a "tw-wt-<uuid>" STRING — never a numeric PID;
    // Number()-ing it yields NaN and silently drops every real slot.
    const pidNum = Number(entry.pid);
    if (!Number.isFinite(pidNum) || pidNum <= 0) continue;

    const optInAt = typeof entry.zuluOptInAt === "string"
      ? Date.parse(entry.zuluOptInAt)
      : NaN;
    const optedInRecently = Number.isFinite(optInAt)
      ? (now - optInAt) < graceMs
      : true; // unknown opt-in time → conservative: treat as recent

    out.push({ slot, entry, pid: pidNum, optInAt, optedInRecently });
  }
  return out;
}

/**
 * Diagnose WHY a sweep has (or has not) actionable slots -- the observability
 * companion to pickActionableSlots. Mirrors its exact filter ORDER so the counts
 * reconcile: total valid entries, self-exempt, opted-out, opted-in-but-missing a
 * live numeric entry.pid (the transient-pid gate that silently idles the whole
 * fleet once the prior-session pids expire), and finally eligible. `reason` names
 * the dominant cause of a zero-eligible sweep so a frozen audit log reads as
 * "alive + idle (here is why)" instead of "dead". Pure; reads entry.zuluOptIn
 * AFTER opt-in projection, so call it on the SAME projected slotsDoc that
 * pickActionableSlots consumed.
 * @param {{slots?:Record<string,any>}} slotsDoc
 * @param {{selfSlot?:string}} [opts]
 * @returns {{total:number, selfExempt:number, optedIn:number, notOptedIn:number, missingPid:number, eligible:number, reason:string}}
 */
export function summarizeSweepEligibility(slotsDoc, opts = {}) {
  const slots = slotsDoc && slotsDoc.slots && typeof slotsDoc.slots === "object" ? slotsDoc.slots : {};
  const selfSlot = typeof opts.selfSlot === "string" ? opts.selfSlot : null;
  let total = 0, selfExempt = 0, notOptedIn = 0, missingPid = 0, eligible = 0;
  for (const [slot, entry] of Object.entries(slots)) {
    if (!entry || typeof entry !== "object") continue;
    total++;
    if (SELF_EXEMPT_SLOTS.includes(slot) || (selfSlot && slot === selfSlot)) { selfExempt++; continue; }
    if (entry.zuluOptIn !== true) { notOptedIn++; continue; }
    const pidNum = Number(entry.pid);
    if (!Number.isFinite(pidNum) || pidNum <= 0) { missingPid++; continue; }
    eligible++;
  }
  // non-self-exempt entries that passed the opt-in gate (may still lack a live pid)
  const optedIn = missingPid + eligible;
  let reason = "eligible-slots-present";
  if (eligible === 0) {
    if (total === 0) reason = "no-slots";
    else if (optedIn === 0) reason = "no-slots-opted-in";
    else if (missingPid === optedIn) reason = "all-opted-in-slots-missing-live-pid";
    else reason = "no-eligible-slots";
  }
  return { total, selfExempt, optedIn, notOptedIn, missingPid, eligible, reason };
}

// Pure: compose the SendKeys text for a given decision.
// `decision.action` ∈ {"noop", "advise-only", "clear", "compact"}.
// Returns { ok, text?, error?, lines? }.
//   noop / advise-only → no text (caller skips).
//   clear   → "/precompact" then "/clear"   then /checkin-<slot>.
//   compact → "/precompact" then "/compact" then /checkin-<slot>.
// EVERY actionable plan LEADS with /precompact: it writes the durable
// HANDOFF-<slot>-<topic>.md BEFORE the context is summarised (/compact) or
// discarded (/clear), so the /checkin-<slot> that follows always has a fresh
// RESUME to anchor to. /compact's PreCompact hook also writes a handoff, but
// the explicit /precompact guarantees it + runs the full close-out skill —
// and for /clear it is the ONLY thing that preserves state across the wipe.
// The trailing /checkin-<slot> payload carries the U-ZULU05 backend-dev
// priority filter so the next pick is biased toward
// U-WIRE*/U-BRIDGE*/U-HOOK*/U-INFRA*/U-DEVTOOL*/U-CK*.
export function composeSendKeysText(decision, slot, opts = {}) {
  if (!decision || !decision.action) return { ok: false, error: "missing-decision" };
  if (!slot || typeof slot !== "string") return { ok: false, error: "missing-slot" };
  const a = decision.action;
  if (a === "noop" || a === "advise-only") {
    return { ok: false, error: `no-action-needed:${a}` };
  }
  if (a !== "clear" && a !== "compact") {
    return { ok: false, error: `unknown-action:${a}` };
  }
  const slashLine = a === "clear" ? "/clear" : "/compact";
  const checkin = buildCheckinPayload(slot, opts);
  if (!checkin.ok) return { ok: false, error: `checkin-payload:${checkin.error}` };
  return { ok: true, lines: ["/precompact", slashLine, checkin.text] };
}

// G3 — Pure: how long to wait AFTER sending `line`, before the next line.
// A `/compact` line gets the long compact-specific wait (compaction is slow
// and the next line MUST NOT land mid-compaction); `/clear` and everything
// else get the normal stagger (those complete near-instantly).
// `opts.staggerMs` / `opts.compactWaitMs` override the module defaults.
export function staggerAfterLine(line, opts = {}) {
  const stagger = Number.isFinite(opts.staggerMs) && opts.staggerMs >= 0
    ? opts.staggerMs
    : DEFAULT_STAGGER_MS;
  const compactWait = Number.isFinite(opts.compactWaitMs) && opts.compactWaitMs >= 0
    ? opts.compactWaitMs
    : DEFAULT_COMPACT_WAIT_MS;
  // A /precompact line makes the MODEL author its handoff (slow); /compact
  // must not land mid-authoring. Give it a generous flat window like /compact's.
  const precompactWait = Number.isFinite(opts.precompactWaitMs) && opts.precompactWaitMs >= 0
    ? opts.precompactWaitMs
    : DEFAULT_PRECOMPACT_WAIT_MS;
  const norm = typeof line === "string" ? line.trim().toLowerCase() : "";
  // Match the leading /compact token — the command may carry trailing args.
  if (norm === "/compact" || norm.startsWith("/compact ")) return compactWait;
  if (norm === "/precompact" || norm.startsWith("/precompact ")) return precompactWait;
  return stagger;
}

// Pure: decide whether to actually execute the SendKeys plan, dry-run, or
// abort. Returns { gate, reason }.
//   "execute" — caller fires the PS sendkeys with -Confirm:$true.
//   "dry-run" — caller fires with -Confirm:$false (or skips PS entirely
//               and just logs the intent).
//   "skip"    — caller does nothing.
export function decideExecutionGate(slotPick, env = {}) {
  if (!slotPick) return { gate: "skip", reason: "no-pick" };
  if (env.PRISM_ZULU_DISABLE === "1") return { gate: "skip", reason: "zulu-disabled-env" };
  if (env.PRISM_ZULU_DRY_RUN === "1") return { gate: "dry-run", reason: "zulu-dry-run-env" };
  if (env.PRISM_SENDKEYS_DISABLE === "1") return { gate: "dry-run", reason: "sendkeys-disabled-env" };
  if (slotPick.optedInRecently) return { gate: "dry-run", reason: "opt-in-grace-period" };
  return { gate: "execute", reason: "live" };
}

// Pure: assemble the JSONL log entry for a single slot's sweep outcome.
// `result` is { ok, error?, dryRun?, hwnd?, chars? } from PS or local skip.
export function formatLogEntry(slotPick, decision, plan, gate, result, now) {
  const t = typeof now === "number" ? new Date(now).toISOString() : new Date().toISOString();
  return JSON.stringify({
    ts: t,
    slot: slotPick?.slot || "unknown",
    pid: slotPick?.pid || null,
    decision: decision?.action || "unknown",
    decisionReason: decision?.reason || null,
    gate: gate?.gate || "skip",
    gateReason: gate?.reason || null,
    planLines: plan?.lines || null,
    planError: plan?.error || null,
    resultOk: result?.ok === true,
    resultDryRun: result?.dryRun === true,
    resultError: result?.error || null,
    resultHwnd: result?.hwnd || null,
    resultChars: typeof result?.chars === "number" ? result.chars : null,
  });
}

// Pure: convenience composer — given a slot pick + pressure + flags, produce
// the full plan that downstream I/O will execute. Returns an envelope:
// { slot, pid, decision, plan, gate }.
export function planSlotAction(slotPick, pressure, opts = {}) {
  const {
    decideClearOrCompact, env = {}, hasActiveLoop, hasHandoff,
    hasUncommittedCriticalWork,
    // G13 — awareness fingerprint queueLength feeds the decision (was log-only).
    slotQueueLength,
    // U-ZPSN01 — full awareness fingerprint feeds the DIRECTIVE TEXT (was log-
    // only and queueLength-only). When provided, planSlotAction composes a
    // PSN-aware extraHint from the fingerprint via buildAwarenessHint and
    // forwards it to composeSendKeysText -> buildCheckinPayload, so the
    // /checkin-<slot> directive sent to the target chat carries the slot's
    // domain/role/queue/top-tribal metadata. Backward-compatible: when omitted
    // (or non-object), behavior is identical to the pre-MS3 lib.
    slotAwareness,
  } = opts;
  if (!slotPick) return { ok: false, error: "missing-slot-pick" };
  // Accept BOTH pressure-input shapes — the CHO02 reader (chat-token-watch.mjs:
  // readChatPressure) returns {pressureLevel, tokensEstimate}, while the
  // orchestrator-lib's own tests + older callers used the local {level, tokens}
  // shape. Fall through to either field so the lib never silently misses the
  // signal because of a field-name mismatch (the bug ZULU-ORCHESTRATOR-MS1 /
  // U-ZM1-03 smoke-test caught — every slot got "missing-pressure" because
  // pressure.level was undefined on the CHO02 shape).
  const _level = pressure ? (pressure.pressureLevel ?? pressure.level) : undefined;
  const _tokens = pressure ? (pressure.tokensEstimate ?? pressure.tokens ?? 0) : 0;
  if (!_level) {
    return {
      ok: false,
      error: "missing-pressure",
      slot: slotPick.slot,
      pid: slotPick.pid,
    };
  }
  if (typeof decideClearOrCompact !== "function") {
    return { ok: false, error: "missing-decision-fn", slot: slotPick.slot };
  }
  const chatState = {
    tokensEstimate: _tokens,
    pressureLevel: _level,
    hasActiveLoop: hasActiveLoop === true,
    // G2 — real uncommitted-work signal injected by the sweep when available.
    // Default stays conservative: a missing/unknown signal => true, biasing to
    // /compact (preserve) over /clear (discard). Only an explicit `false`
    // (sweep proved the tree clean) opens the /clear path.
    hasUncommittedCriticalWork: hasUncommittedCriticalWork !== false,
    // G13 — fold awareness `slotQueueLength` into the handoff signal: a slot
    // with pending queued work biases to /compact the same way an unresolved
    // handoff does. This is the "implement what it learns" half — awareness
    // weights now influence the DECISION FLOW, not just log enrichment.
    hasUnresolvedHandoff: hasHandoff === true || ((Number(slotQueueLength) || 0) > 0),
  };
  let decision;
  try { decision = decideClearOrCompact(chatState); }
  catch (e) {
    return { ok: false, error: `decide-threw:${e?.message || e}`, slot: slotPick.slot };
  }
  if (!decision || !decision.action) {
    return { ok: false, error: "decision-empty", slot: slotPick.slot };
  }
  // U-ZPSN01 — synthesize the PSN-awareness hint once per slot; the helper
  // returns "" on missing/empty fingerprint, which buildCheckinPayload then
  // treats the same as no hint. Forward via composeSendKeysText -> buildCheckinPayload.
  const psnHint = buildAwarenessHint(slotAwareness);
  const composeOpts = psnHint.length > 0 ? { extraHint: psnHint } : {};
  const plan = composeSendKeysText(decision, slotPick.slot, composeOpts);
  const gate = decideExecutionGate(slotPick, env);
  return {
    ok: true,
    slot: slotPick.slot,
    pid: slotPick.pid,
    decision,
    plan,
    gate,
  };
}

// ─── G8 — per-slot action cooldown ──────────────────────────────────────────
// Minimum gap between two EXECUTED actuations against the same slot. The
// 5-min sweep + a stale pressure sidecar would otherwise re-fire /compact
// into a chat that just compacted. 15 min ≈ skip 2 sweeps after a real action.
export const DEFAULT_ACTION_COOLDOWN_MS = 15 * 60 * 1000;

// Pure: given recent JSONL log lines (any order), decide whether `slot` is
// still inside its post-action cooldown. Only a successfully EXECUTED action
// (gate === "execute" && resultOk === true) starts a cooldown — dry-runs and
// failed/skipped sweeps never disrupt the target chat, so they do not gate.
// Returns { cooldown, lastActionAt, sinceMs }.
export function slotInCooldown(logLines, slot, opts = {}) {
  const now = typeof opts.now === "number" && Number.isFinite(opts.now)
    ? opts.now
    : Date.now();
  const cooldownMs = typeof opts.cooldownMs === "number"
    && Number.isFinite(opts.cooldownMs) && opts.cooldownMs >= 0
    ? opts.cooldownMs
    : DEFAULT_ACTION_COOLDOWN_MS;
  if (!Array.isArray(logLines) || typeof slot !== "string" || slot.length === 0) {
    return { cooldown: false, lastActionAt: null, sinceMs: null };
  }
  let lastActionAt = null;
  for (const raw of logLines) {
    if (typeof raw !== "string" || raw.length === 0) continue;
    let e;
    try { e = JSON.parse(raw); } catch { continue; }
    if (!e || e.slot !== slot) continue;
    if (e.gate !== "execute" || e.resultOk !== true) continue;
    const t = Date.parse(e.ts || "");
    if (!Number.isFinite(t)) continue;
    if (lastActionAt === null || t > lastActionAt) lastActionAt = t;
  }
  if (lastActionAt === null) {
    return { cooldown: false, lastActionAt: null, sinceMs: null };
  }
  const sinceMs = now - lastActionAt;
  return { cooldown: sinceMs < cooldownMs, lastActionAt, sinceMs };
}

// --- U-ZULU-COMPACT-VERIFY -- SENT != COMPACTED backstop --------------------
// THE GAP. slotInCooldown (above) starts a 15-min cooldown on any
// `gate==="execute" && resultOk===true` actuation. But resultOk means the
// SendKeys PowerShell command DISPATCHED the keystrokes -- NOT that the target
// chat actually ran /compact. A SendKeys can land on the wrong / occluded WT
// tab and be swallowed, so the slot never compacts; yet resultOk:true starts a
// cooldown and zulu skips that still-critical slot for 15 min. This is the exact
// analog of the fleet-task-health ENABLED!=RAN gap: SENT != COMPACTED.
//
// This leg verifies a cooldown-starting actuation against the slot's CURRENT
// pressure (readChatPressure -> pressureLevel): dropped-to-clean = the /compact
// landed (effective); still-critical past a grace window = it did NOT land
// (ineffective) -> the caller breaks the FALSE cooldown and re-targets the slot.
// Pure -- no IO (the caller injects the current pressure level). FAIL-SAFE: any
// ambiguity (no reading / 'warn' / within grace / clock skew) is `pending`, which
// KEEPS the cooldown -- the unsafe direction is re-firing /compact into a chat,
// so we only ever break a cooldown on a DEFINITIVE still-critical reading.

// A real /compact completes in ~60-90s (DEFAULT_COMPACT_WAIT_MS); give it margin
// before calling a still-critical slot ineffective.
export const DEFAULT_COMPACT_VERIFY_GRACE_MS = 3 * 60 * 1000;     // 3 min
// Only verify RECENT actuations. A genuinely-compacted slot stays below critical
// well past this; bounding the lookback keeps a slow refill-to-critical from
// being mis-read as "the compact never landed". >= the 15-min action cooldown so
// every still-gating actuation is verifiable.
export const DEFAULT_COMPACT_VERIFY_LOOKBACK_MS = 20 * 60 * 1000; // 20 min

const PRESSURE_RESOLVED = "clean";        // GREEN -> the /compact dropped the context
const PRESSURE_STILL_MAXED = "critical";  // RED   -> the exact state that triggered the actuation

/**
 * Classify whether a /compact (or /clear) actuation actually took effect, from
 * the slot's CURRENT pressure level vs when the keystrokes were sent.
 *
 *   effective   -- pressureLevel is now 'clean' (the context dropped).
 *   pending     -- within the grace window, OR an ambiguous/absent reading, OR a
 *                  future sentAt (skew). KEEPS the cooldown (fail-safe).
 *   ineffective -- grace elapsed AND pressureLevel is STILL 'critical' (the exact
 *                  maxed state that triggered the actuation persists -> the
 *                  /compact did not land). The ONLY outcome that breaks a cooldown.
 *
 * Pure -- deterministic, no IO. An ambiguous 'warn' is deliberately `pending`
 * (not ineffective): re-firing /compact into a chat is the dangerous direction,
 * so a cooldown is broken only on a DEFINITIVE non-compaction.
 *
 * @param {{sentAt:number, currentPressureLevel:string|undefined, nowMs:number, graceMs?:number}} p
 * @returns {{outcome:"effective"|"pending"|"ineffective", reason:string}}
 */
export function classifyActuationEffectiveness(p) {
  const sentAt = p && p.sentAt;
  const nowMs = p && p.nowMs;
  const graceMs = Number.isFinite(p && p.graceMs) && p.graceMs > 0
    ? p.graceMs : DEFAULT_COMPACT_VERIFY_GRACE_MS;
  if (!Number.isFinite(sentAt)) return { outcome: "pending", reason: "no actuation timestamp" };
  if (Number.isFinite(nowMs) && sentAt > nowMs) {
    return { outcome: "pending", reason: "actuation timestamp in the future (clock skew) -- cannot verify" };
  }
  // authoritative=false marks a NON-sidecar (byte-estimate) reading whose
  // 'critical' must NOT break a cooldown (it over-reports). Default true: a caller
  // that does not mark the source trusts the level (the sweep passes source).
  const authoritative = !(p && p.authoritative === false);
  const lvl = typeof (p && p.currentPressureLevel) === "string"
    ? p.currentPressureLevel.trim().toLowerCase() : "";
  if (!lvl) return { outcome: "pending", reason: "no current pressure reading -- cannot verify (keep cooldown)" };
  if (lvl === PRESSURE_RESOLVED) {
    return { outcome: "effective", reason: "pressure dropped to clean after the actuation -- it landed" };
  }
  const sinceMs = Number.isFinite(nowMs) ? nowMs - sentAt : 0;
  if (sinceMs < graceMs) {
    return {
      outcome: "pending",
      reason: `actuated ${Math.round(sinceMs / 1000)}s ago -- within the ${Math.round(graceMs / 1000)}s compaction grace`,
    };
  }
  if (lvl === PRESSURE_STILL_MAXED) {
    // Only an AUTHORITATIVE (sidecar) still-critical reading is evidence enough to
    // break a cooldown + re-fire /compact. The byte-estimate fallback over-reports
    // 'critical' on a stale-sidecar large post-compact transcript (the 2026-06-10/11
    // false-critical class) -- never actuate on that unreliable proxy (keep cooldown).
    if (!authoritative) {
      return { outcome: "pending", reason: "pressure 'critical' is from the byte-estimate fallback (not authoritative) -- keep cooldown" };
    }
    return {
      outcome: "ineffective",
      reason: `/compact sent ${Math.round(sinceMs / 60000)}min ago but pressure is STILL critical `
        + `-- it did not land (occluded/wrong WT tab swallowed the keystrokes)`,
    };
  }
  // Not clean, not critical (e.g. 'warn') past grace: ambiguous -> keep cooldown.
  return { outcome: "pending", reason: `pressure '${lvl}' is ambiguous (neither clean nor critical) -- keep cooldown` };
}

/**
 * Given the recent sweep-log lines + a slot's CURRENT pressure level, verify the
 * actuation that started its cooldown. Finds the most-recent EXECUTED compact/
 * clear actuation for the slot within the lookback window and classifies it.
 * Pure -- no IO (caller reads the log + the current pressure).
 *
 * @param {string[]} logLines
 * @param {string} slot
 * @param {string|undefined} currentPressureLevel  'clean'|'warn'|'critical'
 * @param {{now?:number, lookbackMs?:number, graceMs?:number}} [opts]
 * @returns {{outcome:string, reason:string, sentAt:string|null, decision:string|null}}
 */
export function verifyCooldownActuation(logLines, slot, currentPressureLevel, opts = {}) {
  const now = Number.isFinite(opts.now) ? opts.now : Date.now();
  const lookbackMs = Number.isFinite(opts.lookbackMs) && opts.lookbackMs > 0
    ? opts.lookbackMs : DEFAULT_COMPACT_VERIFY_LOOKBACK_MS;
  if (!Array.isArray(logLines) || typeof slot !== "string" || slot.length === 0) {
    return { outcome: "pending", reason: "no log/slot", sentAt: null, decision: null };
  }
  let sentAt = null;
  let decision = null;
  for (const raw of logLines) {
    if (typeof raw !== "string" || raw.length === 0) continue;
    let e;
    try { e = JSON.parse(raw); } catch { continue; }
    if (!e || e.slot !== slot) continue;
    // Only a successfully-EXECUTED compact/clear starts a cooldown -- mirror the
    // exact gate slotInCooldown keys on, so we verify the same actuations.
    if (e.gate !== "execute" || e.resultOk !== true) continue;
    if (e.decision !== "compact" && e.decision !== "clear") continue;
    const t = Date.parse(e.ts || "");
    if (!Number.isFinite(t)) continue;
    if (now - t > lookbackMs) continue;
    if (sentAt === null || t > sentAt) { sentAt = t; decision = e.decision; }
  }
  if (sentAt === null) {
    return { outcome: "pending", reason: "no recent executed actuation in the lookback", sentAt: null, decision: null };
  }
  const v = classifyActuationEffectiveness({ sentAt, currentPressureLevel, nowMs: now, graceMs: opts.graceMs, authoritative: opts.authoritative });
  return { outcome: v.outcome, reason: v.reason, sentAt: new Date(sentAt).toISOString(), decision };
}
