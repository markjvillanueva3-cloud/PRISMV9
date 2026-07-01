#!/usr/bin/env node
// scripts/self-compact.mjs
//
// SELF-COMPACT-MS0 / U-SELFCOMPACT (slot:alpha 2026-06-13) -- model-invokable
// self-compaction. Operator directive: "upgrade our compactions that if you tell
// me we should compact and start a new session, you kick it off yourself if
// possible."
//
// When THIS chat's model concludes a /compact is warranted (a spiral, a deliberate
// fresh-context reset, or a proactive checkpoint before the native ~95% autocompact),
// it runs this script INSTEAD of merely telling the operator to type /compact. The
// script:
//   1. writes a fresh per-chat handoff (so /compact's reset preserves continuity --
//      a quality live-chat handoff, not the precompact-hook stub) IF --resume given;
//   2. resolves THIS chat's terminal window via the SAME tiered resolver the proven
//      zulu-orchestrator-sweep uses (reuse, R8): Tier 1 UIA focusWtTabBySlot(slot)
//      focuses this chat's Windows-Terminal tab by slot name (works on the `tw-wt`
//      tab fleet -- the modern norm); Tier 2 matchWindowsByTitle("PRISM <slot>") for
//      legacy separate windows (only when no WT is present); Tier 3 the STABLE
//      owning-window pid (tw-ps/tw-pa) for dedicated-window terminals. It NEVER
//      resolves from the transient slot.pid (chat-slots.mjs:504 "the transient
//      chat-slots.mjs [pid]" -- dies seconds after claim; a recycled pid could
//      SendKeys into a STRANGER's window). If UIA finds WT but cannot UNIQUELY target
//      this slot's tab (ambiguous-tab / multi-pane), it REFUSES rather than guess.
//   3. SendKeys "/compact" + Enter into that window (reusing the proven CHO04 send
//      path: sendKeysToWindow). Claude Code queues the type-ahead and fires /compact
//      when the current turn ends.
//
// "if possible" (the fail-soft contract): when no tier can attribute a window to THIS
// chat with confidence (UIA reports an ambiguous/multi-pane tab, or there is no WT
// AND no "PRISM <slot>" window AND no stable owning pid), the script does NOT pretend
// success. It exits action:"fallback" + a clear message telling the model to ask the
// operator to /compact manually. Native autocompact at ~95% is the automatic backstop
// either way; self-compact is for the MODEL-DECIDED case below that threshold.
//
// SAFETY: every tier is slot-keyed to THIS chat (UIA tab name = slot, title = "PRISM
// <slot>", pid = this chat's owning-window pid). The send hwnd is never derived from
// the recycling-prone slot.pid, and a non-uniquely-targetable WT tab is refused, so
// /compact can never land in another chat's window.
//
// Usage:
//   node scripts/self-compact.mjs --session-id <harness-session-id> --reason "<why>" \
//        [--resume "<next-action directive for the handoff>"] [--topic <slug>] [--dry-run]
//   node scripts/self-compact.mjs --slot alpha --reason "spiral" --dry-run
//   node scripts/self-compact.mjs --confirm   # U-SELFCOMPACT-CONFIRM: prove past
//        sends actually compacted (correlate ledger sends vs transcript boundaries)
//
// Knobs: PRISM_SELF_COMPACT_DISABLE=1 -> always fallback (never SendKeys). For testing
// or operators who want to keep /compact strictly manual.

import fs from "node:fs";
import path from "node:path";
import { spawnSync, spawn } from "node:child_process";
import { resolveHwndFromPid } from "./lib/resolve-hwnd.mjs";
import { sendKeysToWindow } from "./lib/send-keys.mjs";
import { focusWtTabBySlot, countWtWindowTabs } from "./lib/wt-tab-focus.mjs";
import { enumerateWindows, matchWindowsByTitle } from "./lib/resolve-hwnd-by-title.mjs";
import { findPsAncestorPid } from "../.claude/helpers/ps-window-pin.mjs";
import { runConfirm } from "./lib/self-compact-confirm-lib.mjs";
import { resolveSlotShared, canonicalChatId } from "./lib/slot-resolve-shared.mjs";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const SLOTS_FILE = path.join(PRISM, "state/shared/chat-slots.json");
const LEDGER = path.join(PRISM, "state/shared/dashboards/self-compact-log.jsonl");
const HANDOFF_HELPER = path.join(PRISM, ".claude/helpers/per-agent-handoff.mjs");
const HANDOFF_WRITE_TIMEOUT_MS = 20000;
const SELF_STARTUP_SCRIPT = path.join(PRISM, "scripts/self-startup.mjs");

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
function flag(name) { return process.argv.includes(name); }
function readJson(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }

/**
 * Pure: resolve {slot, entry} for this chat from chat-slots.json. Prefer an explicit
 * slot; else match the harness session_id against each slot's chatId (the same
 * lenient matcher slot-soul-inject / galaxy-claudemd-inject use). Returns null if
 * nothing resolves. We return the whole entry (not just pid) because the SAFE
 * owning-window pid lives in entry.terminalWindowId, NOT entry.pid.
 */
export function resolveSlot(slotsDoc, { slot = null, sessionId = null } = {}) {
  // U-SLOT-RESOLVE-UNIFY (2026-06-18): delegate to the canonical shared
  // resolver so precompaction + compaction + handoff can never drift. It keeps
  // the prior exact-anywhere-beats-lenient guarantee AND adds the canonical
  // `claude-<8hex>` exact pass this inline version lacked -- its
  // `chatId === sessionId` never matched a full-UUID sessionId (stored chatId is
  // claude-<8hex>), so it had been relying on the lenient substring alone.
  return resolveSlotShared(slotsDoc, { slot, sessionId });
}

/**
 * Pure: resolve the session id for this chat, falling back to the harness-
 * exported CLAUDE_CODE_SESSION_ID env when no explicit --session-id arg was
 * passed. The harness exports the full session UUID into every tool subprocess
 * (verified 2026-06-10), so a BARE / cron / --dry-run invocation (skill +
 * watcher always pass --session-id; an ad-hoc resolvability check does not) can
 * still resolve its own slot instead of hitting the "could not resolve this
 * chat's slot" fallback.
 *
 * @param {string|null} argVal   the --session-id CLI value (verbatim when present)
 * @param {string|null} envVal   process.env.CLAUDE_CODE_SESSION_ID (full UUID)
 * @param {{canonical?:boolean}} [opts]
 *   canonical=true  -> derive the SHORT `claude-<8hex>` form from the env UUID
 *                      (self-compact: slot-resolution + handoff key want the
 *                      stored chatId form). The arg is returned verbatim (the
 *                      skill already passes the short form).
 *   canonical=false -> return the env value verbatim (self-startup:
 *                      statSlotTranscript's shared-tree fallback needs the FULL
 *                      UUID as the `<id>.jsonl` filename; resolveSlot accepts
 *                      either form).
 * @returns {string|null}
 */
export function resolveSessionId(argVal, envVal, { canonical = false } = {}) {
  if (argVal) return argVal;
  if (!envVal) return null;
  return canonical ? (canonicalChatId(envVal) || null) : envVal;
}

/**
 * Pure: extract the STABLE owning-window pid from a chat-slots terminalWindowId,
 * implementing the tier doctrine documented in chat-slots.mjs:
 *   tw-ps-<pid> (tier 3): PowerShell host PID -- STABLE for the window lifetime  -> use
 *   tw-pa-<pid> (tier 2): first non-shell ancestor PID -- STABLE for harness life -> use
 *   tw-pp-<pid> (tier 1): immediate parent PID -- TRANSIENT (often a dead bash)   -> null
 *   tw-wt-<guid>(tier 4): Windows Terminal session GUID -- NO pid encoded         -> null
 * Returns a positive integer pid, or null when no stable pid is carried. Never
 * returns the transient slot.pid -- that is deliberately not a source here.
 */
export function twidToOwningPid(twid) {
  if (typeof twid !== "string") return null;
  const m = twid.match(/^tw-(ps|pa)-(\d+)$/);
  if (!m) return null; // tw-wt (no pid), tw-pp (transient), malformed -> not safe to send
  const pid = Number(m[2]);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

/**
 * Pure: given a resolved hwnd (or null) and the disable flag, decide the action.
 * "send" only when we have a usable hwnd AND self-compact is not disabled; otherwise
 * "fallback" (the model must ask the operator -- "if possible" was not possible).
 */
export function decideAction({ hwnd, disabled }) {
  if (disabled) return { action: "fallback", why: "PRISM_SELF_COMPACT_DISABLE=1 (operator keeps /compact manual)" };
  if (!hwnd || !Number.isInteger(hwnd) || hwnd <= 0) return { action: "fallback", why: "no resolvable terminal window" };
  return { action: "send", why: "window resolved" };
}

export function fallbackMessage(reason) {
  return (
    "SELF-COMPACT FALLBACK -- I could not auto-trigger /compact for this chat" +
    (reason ? ` (${reason})` : "") +
    ". Please type /compact yourself to reset context (the per-chat handoff is written, so it will resume seamlessly). " +
    "Native autocompact at ~95% is the automatic backstop."
  );
}

export function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; }
}

function writeHandoff({ sessionId, slot, resume, topic, reason }) {
  if (!resume) return { wrote: false, why: "no --resume given (precompact hook will write on /compact)" };
  // Reuse the canonical live-chat handoff writer (NOT the stub-prone hook writer).
  const terminal = sessionId || `claude-${slot}`;
  const args = [HANDOFF_HELPER, "write", "--terminal", terminal, "--source", "live-chat",
    "--resume", resume, "--state", `Self-compact requested${reason ? " (" + reason + ")" : ""}. Slot ${slot}.`];
  if (topic) args.push("--topic", topic);
  try {
    const r = spawnSync(process.execPath, args, { encoding: "utf8", timeout: HANDOFF_WRITE_TIMEOUT_MS });
    const ok = r.status === 0 && /"ok":true/.test(r.stdout || "");
    return { wrote: ok, why: ok ? "handoff written (live-chat)" : `handoff write failed: ${(r.stdout || r.stderr || "").slice(0, 160)}` };
  } catch (e) { return { wrote: false, why: `handoff write threw: ${e.message}` }; }
}

function logEvent(ev) {
  try {
    fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
    fs.appendFileSync(LEDGER, JSON.stringify(ev) + "\n");
  } catch { /* fail-soft */ }
}

/**
 * SELF-STARTUP-MS0 pairing (slot:bravo 2026-06-17): after a CONFIRMED /compact
 * send, spawn a detached, SELF-SCOPED self-startup watcher. It waits out the
 * compaction + any model auto-continue, then re-enters THIS chat's own loop IFF
 * the chat STALLED (auto-continue -> the watcher's stall gate no-ops; a true
 * stall -> it SendKeys `/startup-<slot> /loop [10m] /goal`). Self-directed (own
 * window only -- same tiered resolver, same refuse-on-ambiguous contract), so it
 * is within the self-compaction authorization, NOT fleet control.
 *
 * Detached + unref + stdio:ignore so self-compact returns immediately and the
 * watcher survives this process; the watcher carries its own hard self-timeout so
 * it can never orphan (R14). Fail-soft. Opt out: PRISM_SELF_COMPACT_NO_AUTOSTART=1.
 */
export function spawnAutostartWatcher({ slot, sessionId, _spawn = spawn }) {
  if (process.env.PRISM_SELF_COMPACT_NO_AUTOSTART === "1") return { spawned: false, why: "disabled (PRISM_SELF_COMPACT_NO_AUTOSTART=1)" };
  try {
    // --confirm is load-bearing (self-startup is dry-run-by-default); --loop-active
    // because the model self-compacting means it was working. --session-id only when
    // present (an empty-string arg is fragile; the watcher resolves by --slot anyway).
    const args = [SELF_STARTUP_SCRIPT, "--watch", "--slot", slot, "--confirm", "--loop-active"];
    if (sessionId) args.push("--session-id", sessionId);
    const child = _spawn(process.execPath, args, { detached: true, windowsHide: true, stdio: "ignore" });
    if (typeof child.unref === "function") child.unref();
    return { spawned: true, pid: child.pid ?? null };
  } catch (e) { return { spawned: false, why: String(e?.message || e) }; }
}

// UIA errors that mean "no focusable Windows-Terminal here" -- safe to fall through
// to the legacy title-window resolver + the owning-window-pid tier (we are NOT inside
// a WT tab, so a different resolution path is appropriate). Any OTHER UIA error
// (no-tab / ambiguous-tab / pane-count) means "WT is present but I will NOT guess
// which tab is yours" -> we must NOT blindly target a window. This mirrors
// zulu-orchestrator-sweep's exact safety gating.
const UIA_FALLTHROUGH_ERRORS = new Set(["no-wt-process", "platform-not-windows", "disabled"]);

// Does a UIA error mean "WT is present but THIS chat's tab cannot be name-matched"
// (the operator did not name the tab after the slot, or two tabs collide)? For
// these, the owning-window pid CAN still be used SAFELY -- but ONLY if that
// window is verified to host exactly ONE tab (then the focused tab IS this chat's
// tab, unambiguously). `pane-count` / `ok-bad-pane-count:*` are deliberately
// EXCLUDED: those mean a name-MATCHED tab is multi-pane (a different hazard --
// U-ZM2-02 pane-focus territory), so they keep the hard-stop refusal.
//
// IMPORTANT (scrutiny arm A P3, 2026-06-24): the PS layer emits `FAIL ambiguous-tab
// <count>`, so parseFocusOutput yields the error WITH the trailing count
// ("ambiguous-tab 2"), NOT the bare token. A `Set.has("ambiguous-tab")` check would
// never match the real envelope -> the ambiguous-tab rescue would be dead. So we
// match `no-tab` exactly and `ambiguous-tab` by PREFIX. (U-SELFCOMPACT-SINGLETAB, 2026-06-24 slot:charlie)
export function isSingleTabFallthroughError(uiaError) {
  if (typeof uiaError !== "string") return false;
  return uiaError === "no-tab" || uiaError.startsWith("ambiguous-tab");
}

/**
 * Resolve THIS chat's terminal window hwnd, the SAFE way, via the SAME tiered
 * resolver the proven zulu-orchestrator-sweep uses -- so self-compact actually
 * actuates on the Windows-Terminal-tab fleet instead of always falling back:
 *   Tier 1   (UIA): focusWtTabBySlot(slot) -- focus THIS chat's WT tab by slot name,
 *                 verified single-pane. Works on `tw-wt` tabs (the fleet norm).
 *   Tier 1.5 (singletab): WT present but the tab cannot be name-matched (no-tab /
 *                 ambiguous-tab) -- use the owning-window pid IFF its WT window
 *                 hosts exactly ONE tab (then the focused tab IS this chat's tab).
 *                 (U-SELFCOMPACT-SINGLETAB)
 *   Tier 2   (title): matchWindowsByTitle(enumerateWindows(), "PRISM <slot>") -- legacy
 *                 separate-window terminals. Only when WT is absent (no-wt-process).
 *   Tier 3   (pid): the owning-window pid -- LIVE-re-resolved from the chat's
 *                 current process ancestry (the recorded terminalWindowId pid
 *                 recycles after /clear), else the recorded stable tw-ps/tw-pa
 *                 pid. Never the transient slot.pid.
 * Returns { hwnd, why, tier } -- hwnd null (with a human `why`) whenever we cannot
 * attribute a window to THIS chat with confidence (e.g. an explorer-launched
 * desktop-app chat with no shell ancestor -- native autocompact is its backstop).
 * Every external call is injectable so all tiers + the safety gates are
 * deterministically testable.
 */
export function resolveOwnWindow(slot, entry, deps = {}) {
  const {
    focusTab = focusWtTabBySlot,
    enumWindows = enumerateWindows,
    matchByTitle = matchWindowsByTitle,
    isAlive = isPidAlive,
    resolveHwnd = resolveHwndFromPid,
    countTabs = countWtWindowTabs,
    liveOwningPid = resolveLiveOwningPid,
    dryRun = false,
  } = deps;

  // Tier 1 -- UIA focus this chat's own WT tab by slot.
  const uia = focusTab(slot, { dryRun });
  if (uia.ok) return { hwnd: uia.hwnd, why: `UIA-focused WT tab '${uia.tabName}' (slot ${slot})`, tier: "uia" };

  // Resolve a usable owning-window pid LAZILY + at most ONCE: prefer a LIVE
  // re-resolution from the chat's current process (the recorded terminalWindowId
  // pid recycles after a /clear or host respawn -- proven dead live 2026-06-24),
  // else fall back to the recorded stable tw-ps/tw-pa pid. (B) of
  // U-SELFCOMPACT-SINGLETAB. Lazy so the expensive PowerShell ancestry walk fires
  // ONLY when a tier actually needs a pid -- never on the UIA-success path above
  // nor on the pane-count hard-stop below (scrutiny arm C P2).
  let _pidResolved = false, _owningPid = null;
  const owningPid = () => {
    if (!_pidResolved) { _owningPid = resolveOwningPidForChat(entry, liveOwningPid, isAlive); _pidResolved = true; }
    return _owningPid;
  };

  // Tier 1.5 (U-SELFCOMPACT-SINGLETAB) -- WT present but THIS chat's tab cannot be
  // name-matched (no-tab / ambiguous-tab). The owning-window pid is SAFE to use
  // IFF its WT window hosts exactly ONE tab (the focused tab IS this chat's tab).
  // Verified via countWtWindowTabs (UIA tab count for that pid's window). Any
  // other UIA error (pane-count) keeps the hard-stop below.
  if (isSingleTabFallthroughError(uia.error)) {
    const pid = owningPid();
    if (pid != null) {
      const tc = countTabs(pid);
      if (tc.ok && tc.tabCount === 1) {
        return { hwnd: tc.hwnd, why: `single-tab owning window (pid ${pid}, UIA:${uia.error} -> tabCount 1)`, tier: "singletab" };
      }
      // Window is multi-tab (or count unavailable): refuse -- never guess a sibling tab.
      return { hwnd: null, why: `WT tab for slot ${slot} not name-matched (UIA:${uia.error}) and owning window not single-tab (${tc.ok ? `tabCount ${tc.tabCount}` : tc.error}) -- refusing to guess which tab is yours`, tier: null };
    }
    // No owning pid (explorer-launched / unresolvable): fall to the hard-stop below.
  }

  // A WT-present-but-not-uniquely-targetable error that is NOT a single-tab
  // candidate (e.g. pane-count) is a hard stop (never guess a tab).
  if (!UIA_FALLTHROUGH_ERRORS.has(uia.error)) {
    return { hwnd: null, why: `WT tab for slot ${slot} not safely targetable (UIA:${uia.error}) -- refusing to guess which tab is yours`, tier: null };
  }

  // Tier 2 -- legacy separate-window title match (only reached when WT is absent).
  const list = enumWindows();
  if (list.ok) {
    const m = matchByTitle(list.windows, `PRISM ${slot}`);
    if (m.ok) return { hwnd: m.hwnd, why: `title-matched window 'PRISM ${slot}'`, tier: "title" };
  }

  // Tier 3 -- stable owning-window pid (live-re-resolved or recorded; never the transient slot.pid).
  const pid3 = owningPid();
  if (pid3 != null) {
    const r = resolveHwnd(pid3);
    if (r.ok) return { hwnd: r.hwnd, why: `owning-window pid ${pid3}`, tier: "pid" };
  }

  const twid = entry?.terminalWindowId || "(none)";
  return { hwnd: null, why: `no safely-resolvable window for slot ${slot} (UIA:${uia.error}; no 'PRISM ${slot}' title window; no live/recorded owning-window pid in '${twid}')`, tier: null };
}

/**
 * Pure-ish: resolve a LIVE, alive owning-window pid for this chat, preferring a
 * fresh re-resolution from the chat's current process over the (recycling-prone)
 * recorded terminalWindowId pid. Returns a positive integer pid or null.
 *
 *   1. LIVE: walk the chat's live process ancestry to its shell host pid
 *      (`liveOwningPid(entry)` -> findPsAncestorPid from the chat's live pid).
 *      The recorded tw-pa/tw-ps pid goes stale after a /clear or host respawn;
 *      the live walk reflects the CURRENT window. Used only if alive.
 *   2. RECORDED: the stable tw-ps/tw-pa pid from terminalWindowId, if alive.
 *
 * Both are gated on isAlive -- a dead pid is never returned (it would resolve a
 * stranger's recycled-pid window). Injected deps make every branch testable.
 */
export function resolveOwningPidForChat(entry, liveOwningPid, isAlive) {
  const live = liveOwningPid ? liveOwningPid(entry) : null;
  if (live != null && Number.isInteger(live) && live > 0 && isAlive(live)) return live;
  const recorded = twidToOwningPid(entry?.terminalWindowId);
  if (recorded != null && isAlive(recorded)) return recorded;
  return null;
}

/**
 * Resolve the chat's CURRENT shell-host owning pid by walking the live process
 * ancestry from the chat's recorded live pid (entry.pid). Returns a positive
 * integer pid or null. This is the (B) live-re-resolution -- it sidesteps the
 * stale recorded terminalWindowId. Returns null on a non-terminal (e.g.
 * explorer-launched / desktop-app) chat that has no PowerShell/cmd ancestor --
 * the correct outcome (those chats are not SendKeys-actuatable and must fall
 * back to native autocompact). The chat's live pid is `entry.pid`; if it is
 * dead, the walk starts there and findPsAncestorPid returns null (Get-CimInstance
 * finds no such process), which is also correct.
 */
export function resolveLiveOwningPid(entry) {
  const livePid = Number(entry?.pid);
  if (!Number.isInteger(livePid) || livePid <= 0) return null;
  try {
    const r = findPsAncestorPid({ startPid: livePid });
    const n = r != null ? Number(r) : NaN;
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/**
 * Decide + actuate the compaction given a resolved window. Pure-ish: the side
 * effects (SendKeys, ledger append) are injected (sendKeys, log) so every branch
 * -- fallback, dry-run, send-ok, send-failed -- is testable WITHOUT poking a real
 * window. Returns { payload } (the JSON the CLI prints). NEVER fabricates success:
 * a fallback or a failed send both yield ok:false.
 */
export function actuate({ slot, sessionId = null, reason, win, disabled, dryRun, handoff, sendKeys = sendKeysToWindow, log = logEvent }) {
  const decision = decideAction({ hwnd: win.hwnd, disabled });
  // sessionId is recorded so U-SELFCOMPACT-CONFIRM can later locate THIS chat's
  // transcript and prove the SEND produced a real compact_boundary (end-to-end).
  const base = { ts: new Date().toISOString(), slot, sessionId, reason, hwnd: win.hwnd, winWhy: win.why, handoff };

  if (decision.action === "fallback") {
    const why = disabled ? decision.why : win.why;
    log({ ...base, action: "fallback", why });
    return { payload: { ok: false, action: "fallback", slot, handoff, message: fallbackMessage(why) } };
  }

  if (dryRun) {
    return { payload: { ok: true, action: "dry-run", slot, hwnd: win.hwnd, handoff,
      wouldSend: "/compact", message: `DRY-RUN: would SendKeys '/compact' to hwnd ${win.hwnd} (slot ${slot}, ${win.why}).` } };
  }

  // SEND: type "/compact" + Enter into this chat's terminal. Claude Code queues it as
  // type-ahead and fires it when the current turn ends.
  const sent = sendKeys({ hwnd: win.hwnd, text: "/compact", confirm: true });
  log({ ...base, action: "send", sent: { ok: sent.ok, chars: sent.chars, error: sent.error || null } });
  if (sent.ok) {
    return { payload: { ok: true, action: "sent", slot, hwnd: win.hwnd, handoff,
      message: `SENT '/compact' to this chat's terminal (slot ${slot}, hwnd ${win.hwnd}). It fires when this turn ends. End your turn now with a brief note.` } };
  }
  return { payload: { ok: false, action: "fallback", slot, handoff, sendError: sent.error,
    message: fallbackMessage(`SendKeys failed: ${sent.error}`) } };
}

function main() {
  if (flag("--confirm")) {
    // async path: surface an unexpected programming error as a clean non-zero
    // exit instead of an unhandled rejection (P2 hardening; scrutiny arm C).
    confirmMode().catch((e) => { console.error(`self-compact --confirm failed: ${e?.message || e}`); process.exitCode = 1; });
    return;
  }
  // Short canonical chatId for slot-resolution + handoff key; falls back to the
  // env UUID (-> short) when no --session-id arg was passed (bare/cron/--dry-run).
  const sessionId = resolveSessionId(arg("--session-id"), process.env.CLAUDE_CODE_SESSION_ID, { canonical: true });
  // The LEDGER must carry the FULL session UUID so U-SELFCOMPACT-CONFIRM can
  // locate the transcript (filename + compact_boundary.sessionId are the full
  // UUID; stable-session-id.mjs / --session-id give the short `claude-<8hex>`
  // form, which would never match a transcript). The harness exports the full
  // id into every tool subprocess as CLAUDE_CODE_SESSION_ID (verified
  // 2026-06-10). Slot resolution + handoff still use the short `sessionId`
  // (that is what chat-slots.chatId is keyed on).
  const ledgerSessionId = process.env.CLAUDE_CODE_SESSION_ID || sessionId;
  const slotArg = arg("--slot");
  const reason = arg("--reason", "model-decided");
  const resume = arg("--resume");
  const topic = arg("--topic");
  const dryRun = flag("--dry-run");
  const disabled = process.env.PRISM_SELF_COMPACT_DISABLE === "1";

  const slotsDoc = readJson(SLOTS_FILE);
  const resolved = resolveSlot(slotsDoc, { slot: slotArg, sessionId });
  if (!resolved) {
    const msg = fallbackMessage("could not resolve this chat's slot from chat-slots.json");
    console.log(JSON.stringify({ ok: false, action: "fallback", message: msg }, null, 2));
    return;
  }

  // Write the quality handoff FIRST (continuity) -- the /compact precompact hook is a backstop.
  const handoff = writeHandoff({ sessionId, slot: resolved.slot, resume, topic, reason });

  // Resolve THIS chat's window the SAFE way (UIA tab-focus -> title -> owning-pid), then decide + actuate.
  const win = resolveOwnWindow(resolved.slot, resolved.entry, { dryRun });
  const { payload } = actuate({ slot: resolved.slot, sessionId: ledgerSessionId, reason, win, disabled, dryRun, handoff });

  // SELF-STARTUP-MS0 pairing: on a REAL send (never on dry-run/fallback), arm the
  // self-scoped re-entry watcher so the chat restarts ITSELF after the compaction
  // settles -- closing the "self-compact fires but nothing re-enters the loop" gap.
  if (payload.action === "sent") {
    payload.autostart = spawnAutostartWatcher({ slot: resolved.slot, sessionId: ledgerSessionId });
  }
  console.log(JSON.stringify(payload, null, 2));
}

/**
 * `--confirm` mode (U-SELFCOMPACT-CONFIRM): correlate logged `send` events against
 * the real `compact_boundary` markers in each session's transcript, append any
 * newly-confirmed events to the ledger (idempotent), and print the summary. This
 * is the end-to-end PROOF the SEND path works -- read non-disruptively from the
 * real transcript, never by firing a test /compact.
 */
async function confirmMode() {
  const res = await runConfirm({ ledgerPath: LEDGER });
  for (const ev of res.newConfirms) logEvent(ev); // append-only, fail-soft
  console.log(JSON.stringify({
    ok: true, action: "confirm",
    summary: res.summary,
    newlyConfirmed: res.newConfirms.length,
    rows: res.correlations,
  }, null, 2));
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/self-compact.mjs")) {
  main();
}
