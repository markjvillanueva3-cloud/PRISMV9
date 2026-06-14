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
//
// Knobs: PRISM_SELF_COMPACT_DISABLE=1 -> always fallback (never SendKeys). For testing
// or operators who want to keep /compact strictly manual.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { resolveHwndFromPid } from "./lib/resolve-hwnd.mjs";
import { sendKeysToWindow } from "./lib/send-keys.mjs";
import { focusWtTabBySlot } from "./lib/wt-tab-focus.mjs";
import { enumerateWindows, matchWindowsByTitle } from "./lib/resolve-hwnd-by-title.mjs";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const SLOTS_FILE = path.join(PRISM, "state/shared/chat-slots.json");
const LEDGER = path.join(PRISM, "state/shared/dashboards/self-compact-log.jsonl");
const HANDOFF_HELPER = path.join(PRISM, ".claude/helpers/per-agent-handoff.mjs");
const HANDOFF_WRITE_TIMEOUT_MS = 20000;

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
  const slots = slotsDoc?.slots || {};
  if (slot && slots[slot]) return { slot, entry: slots[slot] };
  if (sessionId) {
    for (const [name, data] of Object.entries(slots)) {
      if (!data?.chatId) continue;
      const bare = data.chatId.replace(/^claude-/, "");
      if (data.chatId === sessionId || sessionId.includes(bare)) {
        return { slot: name, entry: data };
      }
    }
  }
  return null;
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

// UIA errors that mean "no focusable Windows-Terminal here" -- safe to fall through
// to the legacy title-window resolver + the owning-window-pid tier (we are NOT inside
// a WT tab, so a different resolution path is appropriate). Any OTHER UIA error
// (no-tab / ambiguous-tab / pane-count) means "WT is present but I will NOT guess
// which tab is yours" -> we must NOT try to target a window, we fall back. This
// mirrors zulu-orchestrator-sweep's exact safety gating.
const UIA_FALLTHROUGH_ERRORS = new Set(["no-wt-process", "platform-not-windows", "disabled"]);

/**
 * Resolve THIS chat's terminal window hwnd, the SAFE way, via the SAME tiered
 * resolver the proven zulu-orchestrator-sweep uses -- so self-compact actually
 * actuates on the Windows-Terminal-tab fleet instead of always falling back:
 *   Tier 1 (UIA): focusWtTabBySlot(slot) -- focus THIS chat's WT tab by slot name,
 *                 verified single-pane. Works on `tw-wt` tabs (the fleet norm).
 *   Tier 2 (title): matchWindowsByTitle(enumerateWindows(), "PRISM <slot>") -- legacy
 *                 separate-window terminals. Only when WT is absent (no-wt-process).
 *   Tier 3 (pid): the stable owning-window pid (tw-ps/tw-pa) -- dedicated-window
 *                 terminals without a "PRISM <slot>" title. Never the transient slot.pid.
 * Returns { hwnd, why, tier } -- hwnd null (with a human `why`) whenever we cannot
 * attribute a window to THIS chat with confidence. Every external call is injectable
 * so all tiers + the safety gates are deterministically testable.
 */
export function resolveOwnWindow(slot, entry, deps = {}) {
  const {
    focusTab = focusWtTabBySlot,
    enumWindows = enumerateWindows,
    matchByTitle = matchWindowsByTitle,
    isAlive = isPidAlive,
    resolveHwnd = resolveHwndFromPid,
    dryRun = false,
  } = deps;

  // Tier 1 -- UIA focus this chat's own WT tab by slot.
  const uia = focusTab(slot, { dryRun });
  if (uia.ok) return { hwnd: uia.hwnd, why: `UIA-focused WT tab '${uia.tabName}' (slot ${slot})`, tier: "uia" };

  // A WT-present-but-not-uniquely-targetable error is a hard stop (never guess a tab).
  if (!UIA_FALLTHROUGH_ERRORS.has(uia.error)) {
    return { hwnd: null, why: `WT tab for slot ${slot} not safely targetable (UIA:${uia.error}) -- refusing to guess which tab is yours`, tier: null };
  }

  // Tier 2 -- legacy separate-window title match (only reached when WT is absent).
  const list = enumWindows();
  if (list.ok) {
    const m = matchByTitle(list.windows, `PRISM ${slot}`);
    if (m.ok) return { hwnd: m.hwnd, why: `title-matched window 'PRISM ${slot}'`, tier: "title" };
  }

  // Tier 3 -- stable owning-window pid (never the transient slot.pid).
  const owningPid = twidToOwningPid(entry?.terminalWindowId);
  if (owningPid != null && isAlive(owningPid)) {
    const r = resolveHwnd(owningPid);
    if (r.ok) return { hwnd: r.hwnd, why: `owning-window pid ${owningPid} (terminalWindowId)`, tier: "pid" };
  }

  const twid = entry?.terminalWindowId || "(none)";
  return { hwnd: null, why: `no safely-resolvable window for slot ${slot} (UIA:${uia.error}; no 'PRISM ${slot}' title window; no stable owning-window pid in '${twid}')`, tier: null };
}

/**
 * Decide + actuate the compaction given a resolved window. Pure-ish: the side
 * effects (SendKeys, ledger append) are injected (sendKeys, log) so every branch
 * -- fallback, dry-run, send-ok, send-failed -- is testable WITHOUT poking a real
 * window. Returns { payload } (the JSON the CLI prints). NEVER fabricates success:
 * a fallback or a failed send both yield ok:false.
 */
export function actuate({ slot, reason, win, disabled, dryRun, handoff, sendKeys = sendKeysToWindow, log = logEvent }) {
  const decision = decideAction({ hwnd: win.hwnd, disabled });
  const base = { ts: new Date().toISOString(), slot, reason, hwnd: win.hwnd, winWhy: win.why, handoff };

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
  const sessionId = arg("--session-id");
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
  const { payload } = actuate({ slot: resolved.slot, reason, win, disabled, dryRun, handoff });
  console.log(JSON.stringify(payload, null, 2));
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/self-compact.mjs")) {
  main();
}
