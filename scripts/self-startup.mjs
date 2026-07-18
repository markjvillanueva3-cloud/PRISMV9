#!/usr/bin/env node
// scripts/self-startup.mjs
//
// SELF-STARTUP-MS0 (slot:bravo 2026-06-17) -- the symmetric twin of
// self-compact.mjs. Operator: "we solved self compaction but not self startup."
//
// THE GAP: self-compact.mjs gives the model a real ACTUATOR to /compact its own
// window. But the RE-ENTRY after that compaction is only ADVISORY -- the
// session-start-auto-resume.mjs hook INJECTS `/startup-<slot> /loop [10m] /goal`
// as SessionStart additionalContext, and the model is told injected context is
// background, not an instruction, so it does not reliably fire it. zulu-
// orchestrator-sweep types a re-entry only at RED/CRITICAL pressure -- so a chat
// that self-compacts in the new prudent YELLOW band (or simply stalls mid-loop)
// gets NO re-entry actuation and sits idle. This script is that missing actuator.
//
// WHAT IT DOES: re-enters a chat's autonomous loop by SendKeys'ing the FULL
// `/startup-<slot> /loop [10m] /goal` re-entry into its OWN terminal window --
// but only when the chat is genuinely STALLED (not producing tokens) AND was
// mid-loop. It is the exact mirror of self-compact: same SAFE tiered window
// resolver (reuse resolveOwnWindow -- refuses an ambiguous WT tab rather than
// guess), same dry-run-default + ledger, same self-scoped contract (it only ever
// targets THIS chat's own window; it never controls a peer).
//
// TWO GATES make it safe to auto-fire:
//   1. STALL gate (reuse fleet-wake classifyAccumulation): if the chat is still
//      accumulating tokens (it auto-continued after /compact, or it is mid-work),
//      we SKIP -- never interrupt a working chat. Robust to "the /compact never
//      actually fired" too: a still-growing transcript -> SKIP.
//   2. LOOP-ACTIVE gate: only a chat that was mid-`/loop` (its handoff carries a
//      RESUME_LOOP section or a `/loop ... /goal` re-entry directive) is restarted
//      -- a deliberately-stopped chat is never force-looped back to life.
//
// KNOWN LIMITATION (R12, honest): the stall gate reads transcript-file growth, so
// a chat mid a SINGLE long tool call (> the 90s settle + 30s poll = ~120s quiet)
// shows no growth and is read as "stalled". This is bounded + non-destructive: the
// watcher fires ONCE per self-compact (not a recurring cron), and Claude Code
// queues the typed `/startup...` as TYPE-AHEAD that only lands at the next turn
// boundary -- it cannot interrupt the in-flight tool. A future refinement could
// detect an awaiting-continuation last transcript entry instead of pure growth.
//
// PAIRING: self-compact.mjs, after a CONFIRMED /compact send, spawns a detached,
// self-scoped, hard-timeout instance of this script in `--watch` mode. The watcher
// waits out the compaction + any model auto-continue, then re-enters IFF the chat
// stalled. This makes self-compaction + self-startup a single self-directed pair.
//
// SCOPE (governance, bravo soul `unsafe-fleet-control-before-governance`): this
// actuator is SELF-SCOPED -- a chat restarting its OWN window. The fleet-wide
// scan (re-entering OTHER stalled slots from a cron) is deliberately NOT built
// here; that is the governance-gated fleet-control surface and is left for an
// operator-armed follow-up.
//
// Usage (DRY-RUN BY DEFAULT -- pass --confirm to actually type into the terminal):
//   node scripts/self-startup.mjs --slot bravo                      # one-shot PROBE (dry-run)
//   node scripts/self-startup.mjs --slot bravo --confirm            # one-shot, actuate if stalled
//   node scripts/self-startup.mjs --watch --slot bravo --session-id <full> --confirm --loop-active
//
// Knobs: PRISM_SELF_STARTUP_DISABLE=1 -> always skip (never SendKeys).

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { resolveSlot, resolveOwnWindow, resolveSessionId } from "./self-compact.mjs";
import { statSlotTranscript, classifyAccumulation } from "./fleet-wake-sequencer.mjs";
import { sendKeysToWindow } from "./lib/send-keys.mjs";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const SLOTS_FILE = path.join(PRISM, "state/shared/chat-slots.json");
const LEDGER = path.join(PRISM, "state/shared/dashboards/self-startup-log.jsonl");
const HANDOFF_HELPER = path.join(PRISM, ".claude/helpers/per-agent-handoff.mjs");
const HANDOFF_READ_TIMEOUT_MS = 8000;

// Watcher timings: wait long enough for /compact to fire + compaction + any model
// auto-continue, then sample a poll window to classify stalled vs working.
const DEFAULT_DELAY_MS = 90000;       // settle window before the first transcript sample
const DEFAULT_POLL_MS = 30000;        // sample window to detect post-compact accumulation
const DEFAULT_MIN_GROWTH = 500;       // bytes of growth that count as "accumulating"
const WATCH_HARD_TIMEOUT_MS = 300000; // belt-and-suspenders: never orphan (R14)

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
function flag(name) { return process.argv.includes(name); }
function readJson(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }

// ── PURE CORE ────────────────────────────────────────────────────────────────

/**
 * Pure: the re-entry text typed into the chat's terminal. Mirrors exactly the
 * directive session-start-auto-resume.buildSlotWrapperDirective emits, so the
 * actuated command and the advisory injection are byte-identical.
 */
export function buildReentryText(slot, opts = {}) {
  const loopArg = opts.loopArg || "[10m]";
  return `/startup-${slot} /loop ${loopArg} /goal`;
}

/**
 * Pure: is this chat mid-loop (eligible for forced re-entry)? A chat is loop-active
 * when caller asserts it (opts.assume -- the self-compact pairing knows the model
 * was working), OR its handoff carries a RESUME_LOOP section (written by
 * stop-force-loop-continue), OR a `/loop ... /goal` re-entry directive (written by
 * /loop + self-compact's --resume). A deliberately-stopped chat has none of these.
 */
export function isLoopActive(handoffContent, opts = {}) {
  if (opts.assume === true) return true;
  if (!handoffContent || typeof handoffContent !== "string") return false;
  if (/^##\s*RESUME_LOOP\b/im.test(handoffContent)) return true;
  if (/\/loop\b/.test(handoffContent) && /\/goal\b/.test(handoffContent)) return true;
  return false;
}

/**
 * Pure: stalled vs working, from before/after transcript snapshots. Inverts
 * fleet-wake's classifyAccumulation: "accumulating" tokens => "working" (do not
 * interrupt); anything else => "stalled" (eligible for re-entry).
 */
export function classifyStall(before, after, opts = {}) {
  return classifyAccumulation(before, after, opts) === "accumulating" ? "working" : "stalled";
}

/**
 * Pure: decide the action given the two gates + a resolved window. SKIP wins over
 * everything (never interrupt a working chat, never restart a stopped one);
 * FALLBACK only when stalled+loop-active but no window resolved; SEND otherwise.
 */
export function decideReentry({ stalled, loopActive, hwnd, disabled }) {
  if (disabled) return { action: "skip", why: "PRISM_SELF_STARTUP_DISABLE=1 (operator keeps startup manual)" };
  if (!loopActive) return { action: "skip", why: "chat not loop-active (deliberately stopped -- never force-restart)" };
  if (!stalled) return { action: "skip", why: "chat is accumulating tokens (working -- never interrupt)" };
  if (!hwnd || !Number.isInteger(hwnd) || hwnd <= 0) return { action: "fallback", why: "no resolvable terminal window" };
  return { action: "send", why: "stalled + loop-active + window resolved" };
}

/**
 * Pure: actuation gate. DRY-RUN BY DEFAULT (safe) -- a bare invocation only
 * probes; actuation requires an explicit --confirm. An explicit --dry-run always
 * wins (probe even when --confirm is also passed), so --dry-run is a hard safety
 * override. This makes --confirm load-bearing: the self-compact pairing spawns the
 * watcher WITH --confirm (and WITHOUT --dry-run), so it actuates; any other
 * invocation must opt in to type into a terminal.
 */
export function resolveDryRun({ confirm, dryRunFlag } = {}) {
  return dryRunFlag === true || confirm !== true;
}

// ── I/O HELPERS (injectable, fail-soft) ──────────────────────────────────────

/** Read this slot's handoff content (for the loop-active gate). Fail-soft -> "". */
function readHandoffContent(slot) {
  if (!fs.existsSync(HANDOFF_HELPER)) return "";
  try {
    const r = spawnSync(process.execPath, [HANDOFF_HELPER, "read", "--slot", slot], { encoding: "utf8", timeout: HANDOFF_READ_TIMEOUT_MS });
    if (!r || r.status !== 0 || !r.stdout) return "";
    const parsed = JSON.parse(r.stdout);
    return (parsed && typeof parsed.content === "string") ? parsed.content : "";
  } catch { return ""; }
}

function logEvent(ev) {
  try {
    fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
    fs.appendFileSync(LEDGER, JSON.stringify(ev) + "\n");
  } catch { /* fail-soft */ }
}

// ── ORCHESTRATION ────────────────────────────────────────────────────────────

/**
 * Probe + actuate ONCE given already-taken before/after transcript snapshots.
 * Pure-ish: every side effect (window resolve, SendKeys, ledger) is injectable so
 * all five branches (skip-disabled, skip-working, skip-not-loop, fallback, send)
 * are testable WITHOUT a real window. NEVER fabricates success.
 */
export function runOnce({ slot, entry, sessionId = null, before, after, loopActive, disabled = false, dryRun = false,
  sendKeys = sendKeysToWindow, log = logEvent, resolveWin = resolveOwnWindow, minGrowthBytes = DEFAULT_MIN_GROWTH } = {}) {
  const stalled = classifyStall(before, after, { minGrowthBytes }) === "stalled";
  const win = resolveWin(slot, entry, { dryRun });
  const decision = decideReentry({ stalled, loopActive, hwnd: win.hwnd, disabled });
  const text = buildReentryText(slot);
  const base = { ts: new Date().toISOString(), slot, sessionId, stalled, loopActive, hwnd: win.hwnd, winWhy: win.why };

  if (decision.action === "skip") {
    log({ ...base, action: "skip", why: decision.why });
    return { payload: { ok: true, action: "skip", slot, stalled, loopActive, why: decision.why } };
  }
  if (decision.action === "fallback") {
    log({ ...base, action: "fallback", why: decision.why });
    return { payload: { ok: false, action: "fallback", slot, why: decision.why,
      message: `SELF-STARTUP FALLBACK -- stalled + loop-active but ${decision.why}. The session-start-auto-resume advisory remains; ask the operator to type '${text}'.` } };
  }
  if (dryRun) {
    return { payload: { ok: true, action: "dry-run", slot, hwnd: win.hwnd, wouldSend: text,
      message: `DRY-RUN: would SendKeys '${text}' to hwnd ${win.hwnd} (slot ${slot}, ${win.why}).` } };
  }
  const sent = sendKeys({ hwnd: win.hwnd, text, confirm: true });
  log({ ...base, action: "send", sent: { ok: sent.ok, chars: sent.chars, error: sent.error || null } });
  if (sent.ok) {
    return { payload: { ok: true, action: "sent", slot, hwnd: win.hwnd, wouldSend: text,
      message: `SENT '${text}' to slot ${slot} (hwnd ${win.hwnd}) -- the stalled chat re-enters its autonomous loop.` } };
  }
  return { payload: { ok: false, action: "fallback", slot, sendError: sent.error,
    message: `SELF-STARTUP FALLBACK -- SendKeys failed: ${sent.error}.` } };
}

/**
 * Detached `--watch` mode: wait out the compaction + any auto-continue, then take
 * a before/after transcript sample over a poll window and runOnce. The delay+poll
 * are bounded and there is a hard process timeout, so a watcher never orphans.
 */
export async function runWatch({ slot, entry, sessionId = null, loopActive, disabled = false, dryRun = false,
  delayMs = DEFAULT_DELAY_MS, pollMs = DEFAULT_POLL_MS, minGrowthBytes = DEFAULT_MIN_GROWTH,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  statFn = (s) => statSlotTranscript(s, { sessionId }),
  sendKeys = sendKeysToWindow, log = logEvent, resolveWin = resolveOwnWindow } = {}) {
  await sleep(delayMs);
  const before = statFn(slot);
  await sleep(pollMs);
  const after = statFn(slot);
  return runOnce({ slot, entry, sessionId, before, after, loopActive, disabled, dryRun, sendKeys, log, resolveWin, minGrowthBytes });
}

async function main() {
  const watch = flag("--watch");
  const slotArg = arg("--slot");
  // Full session id (verbatim arg, else the harness env UUID) -- statSlotTranscript's
  // shared-tree fallback needs the FULL UUID as the `<id>.jsonl` filename, and
  // resolveSlot accepts either form. Lets a bare/cron invocation resolve its slot.
  const sessionId = resolveSessionId(arg("--session-id"), process.env.CLAUDE_CODE_SESSION_ID);
  // Dry-run BY DEFAULT (safe): a bare invocation only probes. --confirm actuates;
  // an explicit --dry-run always wins (probe even with --confirm).
  const dryRun = resolveDryRun({ confirm: flag("--confirm"), dryRunFlag: flag("--dry-run") });
  const disabled = process.env.PRISM_SELF_STARTUP_DISABLE === "1";
  // Timing overrides (tuning the cron / fast live dry-run). Falsy/absent -> default.
  const pollMs = Number(arg("--poll-ms")) || DEFAULT_POLL_MS;
  const delayMs = Number(arg("--delay-ms")) || DEFAULT_DELAY_MS;

  const slotsDoc = readJson(SLOTS_FILE);
  const resolved = resolveSlot(slotsDoc, { slot: slotArg, sessionId });
  if (!resolved) {
    console.log(JSON.stringify({ ok: false, action: "fallback", message: "could not resolve this chat's slot from chat-slots.json" }, null, 2));
    return;
  }

  // Loop-active: --loop-active asserts it (the self-compact pairing knows the model
  // was working); otherwise read it from the slot's durable handoff.
  const loopActive = flag("--loop-active") ? true : isLoopActive(readHandoffContent(resolved.slot));

  if (watch) {
    // Hard self-timeout so a hung watcher can never become an orphan (R14).
    const guard = setTimeout(() => process.exit(0), WATCH_HARD_TIMEOUT_MS);
    if (typeof guard.unref === "function") guard.unref();
    const { payload } = await runWatch({ slot: resolved.slot, entry: resolved.entry, sessionId, loopActive, disabled, dryRun, delayMs, pollMs });
    console.log(JSON.stringify(payload, null, 2));
    clearTimeout(guard);
    return;
  }

  // One-shot probe: sample a short poll window now, then decide + actuate.
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const before = statSlotTranscript(resolved.slot, { sessionId });
  await sleep(pollMs);
  const after = statSlotTranscript(resolved.slot, { sessionId });
  const { payload } = runOnce({ slot: resolved.slot, entry: resolved.entry, sessionId, before, after, loopActive, disabled, dryRun });
  console.log(JSON.stringify(payload, null, 2));
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/self-startup.mjs")) {
  main().catch((e) => { console.error(`self-startup failed: ${e?.message || e}`); process.exitCode = 1; });
}
