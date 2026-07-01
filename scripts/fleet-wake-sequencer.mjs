#!/usr/bin/env node
/**
 * fleet-wake-sequencer.mjs — staggered, token-gated fleet wake for the ZULU/
 * Hermes orchestrator (slot:bravo, hermes-zulu galaxy).
 *
 * THE GAP THIS CLOSES (per the 2026-06-03 ZULU-fleet-control assessment): the
 * pull control loop already works (fleet-orchestrate composes a per-slot brief →
 * slot-brief-inject delivers it on the slot's next turn). What was MISSING is a
 * way to PROACTIVELY WAKE idle slots in a *staggered* order, and to *wait until
 * each woken chat starts accumulating tokens before waking the next* — so 17
 * chats don't all hit account-check / session-start simultaneously (thundering
 * herd → API errors). This is exactly the operator ask:
 *   "stagger each chat continuation to avoid api errors for all chats trying to
 *    start up at the same time during account checks; wait until tokens start
 *    accumulating before moving on to the next chat to get it started again."
 *
 * It is built ON the existing CHAT-ORCHESTRATOR-MS0 / ZULU-ORCHESTRATOR-MS0
 * primitives — it does NOT reinvent them:
 *   - scripts/lib/resolve-hwnd-by-title.mjs  (slot topic → HWND, fail-loud unique)
 *   - .claude/helpers/send-keys-to-window.ps1 (HWND + text → keystrokes, gated)
 *   - .claude/helpers/slot-session-sidecar.mjs (per-slot transcript convention)
 *   - state/shared/active-fleet.json          (the 17-slot active roster)
 *
 * ARCHITECTURE — pure core + injected I/O (the PRISM "pure-core + injected
 * readers MUST ship a real-data E2E" rule):
 *   PURE (no I/O, fully unit-tested):
 *     computeWakePlan()        — order + dedup + drop-unknown + never-wake-self
 *     classifyAccumulation()   — before/after transcript snapshot → accumulating|waiting
 *     nextAction()             — gate state machine → advance | skip | wait
 *   I/O (injectable, fail-soft):
 *     readActiveFleet()        — active-fleet.json (fallback: embedded 17)
 *     listPendingBriefSlots()  — slots with a queued slot-brief
 *     readSlotsState()         — chat-slots.json slots map (for window topic)
 *     statSlotTranscript()     — newest .jsonl in the slot's project dir
 *     defaultSendKeys()        — resolveHwndByTitle + send-keys-to-window.ps1
 *   ORCHESTRATION:
 *     runSequencer()           — drives the above, one slot at a time, gated.
 *
 * SAFETY: actuation (sending keys into a real chat window) is DRY-RUN by default.
 * Pass --apply to actually wake. A wrong HWND would type a command into the WRONG
 * chat (silent context loss), so resolveHwndByTitle NEVER best-guesses — ambiguous
 * or no-match → that slot is SKIPPED, never guessed (R12). A window we cannot send
 * to is skipped immediately (you cannot token-gate a chat you never woke).
 *
 * Knobs / CLI:
 *   --slots a,b,c        explicit wake list (overrides roster)
 *   --all-pending        wake only slots with a queued slot-brief
 *   --active-fleet       wake the active-fleet.json roster (DEFAULT)
 *   --apply              actually send keys (default = dry-run)
 *   --stagger-ms N       floor delay between a gate-pass and the next wake (def 5000)
 *   --poll-ms N          transcript re-stat interval while gating (def 4000)
 *   --timeout-ms N       per-slot max wait for token-accumulation before skip (def 120000)
 *   --min-growth N       bytes of transcript growth that count as "accumulating" (def 500)
 *   --wake-cmd "..."     command template, {slot} substituted (def "/checkin-{slot}")
 *   --json               compact JSON output
 *   PRISM_ROOT           repo root override (tests)
 *   PRISM_SLOT           this chat's own slot (never woken; also --self <slot>)
 *
 * @module fleet-wake-sequencer
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { SLOT_NAMES } from "../.claude/helpers/chat-slots.mjs";
import { resolveHwndByTitle } from "./lib/resolve-hwnd-by-title.mjs";

const ROOT = process.env.PRISM_ROOT || "H:/prism";

// ── Defaults (all overridable per-call / per-CLI) ────────────────────────────
const DEFAULT_STAGGER_MS = 5000;     // floor between a gate-pass and the next wake
const DEFAULT_POLL_MS = 4000;        // transcript re-stat cadence while gating
const DEFAULT_TIMEOUT_MS = 120000;   // per-slot wait for accumulation before skip
const DEFAULT_MIN_GROWTH = 500;      // bytes of growth that count as "accumulating"
const DEFAULT_WAKE_CMD = "/checkin-{slot}";
const DEFAULT_PRIORITY = ["golf"];   // reaper first — never the slot that gets skipped
const DEFAULT_LOCK_STALE_MS = 10 * 60 * 1000;
const DEFAULT_SEND_TIMEOUT_MS = 35000;

const DEFAULT_SLOTS_FILE = path.join(ROOT, "state/shared/chat-slots.json");
const DEFAULT_BRIEFS_DIR = path.join(ROOT, "state/shared/slot-briefs");
const DEFAULT_ACTIVE_FLEET_FILE = path.join(ROOT, "state/shared/active-fleet.json");
const DEFAULT_LOCK_FILE = path.join(ROOT, "state/shared/.cron-locks/fleet-wake-sequencer.lock");
const SENDKEYS_PS = path.join(ROOT, ".claude/helpers/send-keys-to-window.ps1");

// Fail-soft safety net ONLY — active-fleet.json is the source of truth. Kept in
// sync with that file's activeSlots; the file overrides this at runtime.
const FALLBACK_ACTIVE_FLEET = [
  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel",
  "india", "juliett", "kilo", "lima", "mike", "oscar", "whiskey", "xray", "romeo",
];

// ═════════════════════════════════════════════════════════════════════════════
// PURE CORE — no I/O, fully unit-testable.
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Order the wake plan: validate against SLOT_NAMES, drop unknowns, dedup, never
 * wake self, front-load priority slots (golf reaper first) preserving order.
 *
 * @param {string[]} slots
 * @param {{selfSlot?:string|null, priority?:string[]}} [opts]
 * @returns {{slot:string,index:number}[]}
 */
export function computeWakePlan(slots, opts = {}) {
  const valid = new Set(SLOT_NAMES);
  const selfSlot = opts.selfSlot ? String(opts.selfSlot).trim().toLowerCase() : null;
  const priority = Array.isArray(opts.priority) ? opts.priority : DEFAULT_PRIORITY;
  const seen = new Set();
  const cleaned = [];
  for (const raw of Array.isArray(slots) ? slots : []) {
    const slot = String(raw ?? "").trim().toLowerCase();
    if (!valid.has(slot)) continue;     // unknown slot → drop (never wake a non-slot)
    if (slot === selfSlot) continue;    // never wake the chat running this
    if (seen.has(slot)) continue;       // dedup
    seen.add(slot);
    cleaned.push(slot);
  }
  const pri = priority.map((p) => String(p).toLowerCase()).filter((p) => seen.has(p));
  const priSet = new Set(pri);
  const rest = cleaned.filter((s) => !priSet.has(s));
  const ordered = [...pri, ...rest];
  return ordered.map((slot, index) => ({ slot, index }));
}

/**
 * Classify whether a woken slot is accumulating tokens, from before/after
 * snapshots of the newest transcript .jsonl in its project dir.
 *
 * Signals (any ⇒ accumulating):
 *   - a NEW transcript file appeared since wake (woke into a fresh session), size>0
 *   - the same transcript grew by ≥ minGrowthBytes (resumed + producing)
 * Otherwise → waiting.
 *
 * @param {{exists:boolean,sizeBytes:number,mtimeMs:number,path:string|null}} before
 * @param {{exists:boolean,sizeBytes:number,mtimeMs:number,path:string|null}} after
 * @param {{minGrowthBytes?:number}} [opts]
 * @returns {"accumulating"|"waiting"}
 */
export function classifyAccumulation(before, after, opts = {}) {
  const minGrowthBytes = Number.isFinite(opts.minGrowthBytes) ? opts.minGrowthBytes : DEFAULT_MIN_GROWTH;
  const b = before || { exists: false, sizeBytes: 0, mtimeMs: 0, path: null };
  const a = after || { exists: false, sizeBytes: 0, mtimeMs: 0, path: null };
  if (!a.exists) return "waiting";
  const aSize = Number(a.sizeBytes) || 0;
  if (aSize <= 0) return "waiting";
  // A new transcript file appeared (fresh session started after the wake).
  if (a.path && a.path !== (b.path || null)) return "accumulating";
  // Same transcript grew past the floor (existing session resumed + producing).
  if (aSize - (Number(b.sizeBytes) || 0) >= minGrowthBytes) return "accumulating";
  return "waiting";
}

/**
 * Gate state machine: given the before/after snapshots + elapsed time since
 * wake, decide whether to ADVANCE to the next slot, SKIP (timed out), or keep
 * WAITING. Pure — all time + stats injected.
 *
 * @param {{before:object, after:object, wakeAtMs:number, nowMs:number}} state
 * @param {{perSlotTimeoutMs?:number, minGrowthBytes?:number}} [opts]
 * @returns {{action:"advance"|"skip"|"wait", reason?:string}}
 */
export function nextAction(state, opts = {}) {
  const perSlotTimeoutMs = Number.isFinite(opts.perSlotTimeoutMs) ? opts.perSlotTimeoutMs : DEFAULT_TIMEOUT_MS;
  const cls = classifyAccumulation(state?.before, state?.after, { minGrowthBytes: opts.minGrowthBytes });
  if (cls === "accumulating") return { action: "advance", reason: "token-accumulation" };
  const elapsed = Number(state?.nowMs) - Number(state?.wakeAtMs);
  if (Number.isFinite(elapsed) && elapsed > perSlotTimeoutMs) return { action: "skip", reason: "timeout" };
  return { action: "wait" };
}

/** Substitute {slot} into a wake-command template. Pure. */
export function renderWakeText(cmdTemplate, slot) {
  return String(cmdTemplate || DEFAULT_WAKE_CMD).replace(/\{slot\}/g, slot);
}

/** Summarize per-slot results into counts. Pure. */
export function summarize(results) {
  const out = { total: results.length, woke: 0, timeout: 0, skip: 0, dryRun: 0 };
  for (const r of results) {
    if (r.status === "woke") out.woke++;
    else if (r.status === "timeout") out.timeout++;
    else if (r.status === "skip") out.skip++;
    else if (r.status === "dry-run") out.dryRun++;
  }
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
// I/O HELPERS — injectable, fail-soft (never throw on missing/corrupt files).
// ═════════════════════════════════════════════════════════════════════════════

/** Read the active-fleet roster. Fail-soft → FALLBACK_ACTIVE_FLEET. */
export function readActiveFleet(opts = {}) {
  const file = opts.activeFleetFile || DEFAULT_ACTIVE_FLEET_FILE;
  const _fs = opts._fs || fs;
  try {
    if (_fs.existsSync(file)) {
      const parsed = JSON.parse(_fs.readFileSync(file, "utf-8"));
      const list = Array.isArray(parsed?.activeSlots) ? parsed.activeSlots : null;
      if (list && list.length) {
        const filtered = list.filter((s) => SLOT_NAMES.includes(s));
        if (filtered.length) return filtered;
      }
    }
  } catch { /* fail-soft */ }
  return FALLBACK_ACTIVE_FLEET.filter((s) => SLOT_NAMES.includes(s));
}

/** Slots with a queued (pending, not-yet-consumed) slot-brief. Fail-soft → []. */
export function listPendingBriefSlots(opts = {}) {
  const dir = opts.briefsDir || DEFAULT_BRIEFS_DIR;
  const _fs = opts._fs || fs;
  try {
    if (!_fs.existsSync(dir)) return [];
    return _fs.readdirSync(dir)
      .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
      .map((f) => f.replace(/\.md$/, ""))
      .filter((s) => SLOT_NAMES.includes(s));
  } catch { return []; }
}

/** The chat-slots.json slots map (slot → {topic, chatId, sessionId, ...}). Fail-soft → {}. */
export function readSlotsState(opts = {}) {
  const file = opts.slotsFile || DEFAULT_SLOTS_FILE;
  const _fs = opts._fs || fs;
  try {
    if (!_fs.existsSync(file)) return {};
    const parsed = JSON.parse(_fs.readFileSync(file, "utf-8"));
    return (parsed && typeof parsed.slots === "object" && parsed.slots) || {};
  } catch { return {}; }
}

/** Newest .jsonl in `dir`, compared against `chosen`. Fail-soft. Pure-ish I/O. */
function newestJsonl(_fs, dir, chosen) {
  try {
    if (!_fs.existsSync(dir)) return chosen;
    for (const f of _fs.readdirSync(dir)) {
      if (!f.endsWith(".jsonl")) continue;
      let st;
      try { st = _fs.statSync(path.join(dir, f)); } catch { continue; }
      if (st.mtimeMs > chosen.mtimeMs) {
        chosen = { exists: true, sizeBytes: st.size, mtimeMs: st.mtimeMs, path: f };
      }
    }
  } catch { /* fail-soft */ }
  return chosen;
}

/**
 * Snapshot the newest transcript .jsonl for the slot. Fail-soft → not-exists.
 *
 * Resolution order:
 *   1. PRIMARY — the slot's worktree project dir
 *      (<home>/.claude/projects/H--prism-slot-<slot>/), newest .jsonl. Detects
 *      both a resumed session growing and a brand-new session file appearing.
 *   2. FALLBACK — a slot running in the SHARED tree (e.g. golf, the hygiene/
 *      integrator slot, or a conflict-fork chat) writes to
 *      H--prism/<sessionId>.jsonl. We target the EXACT session file (NOT "newest"
 *      — the shared dir holds many slots' transcripts, so newest would cross-
 *      contaminate). sessionId comes from chat-slots.json; absent → cannot
 *      disambiguate the shared tree, so we skip it (the slot gate then advances
 *      on timeout rather than fast-advancing — it still staggers, just slower).
 *
 * @returns {{exists:boolean,sizeBytes:number,mtimeMs:number,path:string|null}}
 */
export function statSlotTranscript(slot, opts = {}) {
  const _fs = opts._fs || fs;
  const home = opts.home || process.env.USERPROFILE || process.env.HOME || "";
  const empty = { exists: false, sizeBytes: 0, mtimeMs: 0, path: null };
  if (!home || !slot) return empty;
  const projectsRoot = opts.projectsRoot || path.join(home, ".claude", "projects");
  let chosen = empty;

  // 1. PRIMARY: slot-worktree project dir.
  const slotDir = opts.projectDir || path.join(projectsRoot, `H--prism-slot-${slot}`);
  chosen = newestJsonl(_fs, slotDir, chosen);

  // 2. FALLBACK: shared-tree, exact session file.
  const sessionId = opts.sessionId;
  if (sessionId && typeof sessionId === "string" && sessionId.trim() !== "") {
    const sharedFile = path.join(projectsRoot, "H--prism", `${sessionId}.jsonl`);
    try {
      if (_fs.existsSync(sharedFile)) {
        const st = _fs.statSync(sharedFile);
        if (st.mtimeMs > chosen.mtimeMs) {
          chosen = { exists: true, sizeBytes: st.size, mtimeMs: st.mtimeMs, path: `${sessionId}.jsonl` };
        }
      }
    } catch { /* fail-soft */ }
  }
  return chosen;
}

/**
 * Default wake actuator: resolve the slot's window by its STABLE `PRISM <slot>`
 * caption, then send the wake text via send-keys-to-window.ps1. Returns a
 * structured result; never throws. DRY-RUN unless opts.confirm (which sets the
 * script's PRISM_SENDKEYS_CONFIRM gate via the child's env).
 *
 * The window caption is ALWAYS `PRISM <slot> - <topic>` (or `PRISM <slot>` when
 * topicless) per rename-window-intercept.mjs composeSlotTitle(). The stable
 * resolution key is therefore the `PRISM <slot>` PREFIX — matched by the
 * resolver's contains-tier against the decorated caption — exactly as the
 * canonical zulu-orchestrator-sweep.mjs does. Resolving by the volatile `topic`
 * is the retired `hwnd:title-missing` bug (it skips topicless slots and risks a
 * wrong-window substring match); do NOT reintroduce it.
 *
 * @returns {{ok:boolean, slot:string, hwnd?:number, dryRun?:boolean, error?:string|null, reason?:string|null, title?:string}}
 */
export function defaultSendKeys(slot, text, opts = {}) {
  const _spawn = opts._spawn || spawnSync;
  const resolve = opts.resolveHwnd || resolveHwndByTitle;
  const title = `PRISM ${slot}`;
  const hr = resolve(title, opts);
  if (!hr || !hr.ok) {
    // R12: ambiguous / no-match → SKIP, never guess a window. A wrong HWND would
    // type the wake command into the WRONG chat (silent context loss).
    return { ok: false, slot, error: `hwnd:${hr?.error || "unknown"}`, reason: hr?.reason || null, title };
  }
  const env = { ...process.env };
  // Dry-run is the default. Explicitly CLEAR any ambient confirm gate so dry-run
  // stays safe even if the operator exported PRISM_SENDKEYS_CONFIRM=1 globally —
  // only an explicit opts.confirm (--apply) may actuate.
  if (opts.confirm) env.PRISM_SENDKEYS_CONFIRM = "1";
  else delete env.PRISM_SENDKEYS_CONFIRM;
  let res;
  try {
    res = _spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", SENDKEYS_PS,
        "-Hwnd", String(hr.hwnd), "-Text", text],
      { encoding: "utf8", env, timeout: opts.sendTimeoutMs || DEFAULT_SEND_TIMEOUT_MS, windowsHide: true },
    );
  } catch (e) {
    return { ok: false, slot, error: "send-spawn-threw", reason: String(e?.message || e).slice(0, 200), hwnd: hr.hwnd };
  }
  if (res?.error) {
    return { ok: false, slot, error: "send-spawn-error", reason: String(res.error?.message || res.error).slice(0, 200), hwnd: hr.hwnd };
  }
  let parsed = null;
  try { parsed = JSON.parse(String(res?.stdout || "").trim()); } catch { /* */ }
  if (!parsed) {
    return { ok: false, slot, error: "send-no-json", reason: String(res?.stdout || "").slice(0, 200), hwnd: hr.hwnd };
  }
  return {
    ok: parsed.ok === true,
    slot,
    hwnd: hr.hwnd,
    dryRun: parsed.dryRun === true,
    sendChars: parsed.chars ?? null,
    error: parsed.error || null,
    title,
  };
}

// ── Lock (only one sequencer at a time — two would wake in conflicting orders) ─
function isPidAlive(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (e) { return e && e.code === "EPERM"; } // EPERM = exists but not ours
}

export function acquireLock(opts = {}) {
  const lockFile = opts.lockFile || DEFAULT_LOCK_FILE;
  const _fs = opts._fs || fs;
  const staleMs = Number.isFinite(opts.lockStaleMs) ? opts.lockStaleMs : DEFAULT_LOCK_STALE_MS;
  try {
    _fs.mkdirSync(path.dirname(lockFile), { recursive: true });
    if (_fs.existsSync(lockFile)) {
      let prev = null;
      try { prev = JSON.parse(_fs.readFileSync(lockFile, "utf-8")); } catch { /* corrupt → reclaim */ }
      const ageMs = prev?.startedAt ? (Date.now() - Date.parse(prev.startedAt)) : Infinity;
      const holderAlive = prev?.pid ? isPidAlive(Number(prev.pid)) : false;
      if (holderAlive && Number.isFinite(ageMs) && ageMs < staleMs) {
        return { ok: false, heldBy: prev };
      }
      // else: stale (dead holder, corrupt, or aged out) → reclaim
    }
    _fs.writeFileSync(lockFile, JSON.stringify({ pid: process.pid, host: os.hostname(), startedAt: new Date().toISOString() }));
    return { ok: true, lockFile };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export function releaseLock(lockFile, opts = {}) {
  const _fs = opts._fs || fs;
  try { if (lockFile && _fs.existsSync(lockFile)) _fs.unlinkSync(lockFile); } catch { /* */ }
}

// ═════════════════════════════════════════════════════════════════════════════
// ORCHESTRATION — drive the pure core + I/O, one slot at a time, token-gated.
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Wake each slot in the plan one at a time; after each successful (non-dry-run)
 * wake, poll its transcript until tokens accumulate (then advance) or the per-
 * slot timeout elapses (then skip + continue — one dead chat never blocks the
 * fleet). A stagger floor separates consecutive wakes.
 *
 * @returns {Promise<{plan:string[], results:object[], summary:object}>}
 */
export async function runSequencer(opts = {}) {
  const plan = computeWakePlan(opts.slots, opts);
  const staggerMs = Number.isFinite(opts.staggerMs) ? opts.staggerMs : DEFAULT_STAGGER_MS;
  const pollMs = Number.isFinite(opts.pollMs) ? opts.pollMs : DEFAULT_POLL_MS;
  const perSlotTimeoutMs = Number.isFinite(opts.perSlotTimeoutMs) ? opts.perSlotTimeoutMs : DEFAULT_TIMEOUT_MS;
  const minGrowthBytes = Number.isFinite(opts.minGrowthBytes) ? opts.minGrowthBytes : DEFAULT_MIN_GROWTH;
  const wakeCmd = opts.wakeCmd || DEFAULT_WAKE_CMD;
  // Read chat-slots once so the default transcript stat can target a shared-tree
  // slot's exact session file (golf etc.) via its sessionId.
  const slotsState = opts.slotsState || readSlotsState(opts);
  const sendFn = opts.sendFn || ((slot, text) => defaultSendKeys(slot, text, opts));
  const statFn = opts.statFn || ((slot) => statSlotTranscript(slot, { ...opts, sessionId: slotsState?.[slot]?.sessionId }));
  const now = opts.now || (() => Date.now());
  const sleep = opts.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));

  const results = [];
  for (let cursor = 0; cursor < plan.length; cursor++) {
    const { slot } = plan[cursor];
    const wakeText = renderWakeText(wakeCmd, slot);
    const before = statFn(slot);
    const wakeAtMs = now();
    const sendRes = await sendFn(slot, wakeText);

    if (!sendRes || sendRes.ok === false) {
      // Could not actuate (window closed / ambiguous title / send failed). Cannot
      // token-gate a chat we never woke — record + move on (R12: skip, don't guess).
      results.push({ slot, status: "skip", reason: sendRes?.error || "send-failed", detail: sendRes || null });
      continue;
    }
    if (sendRes.dryRun) {
      results.push({ slot, status: "dry-run", wouldSend: wakeText, hwnd: sendRes.hwnd ?? null, title: sendRes.title ?? null });
      continue; // no real wake happened → nothing to gate
    }

    // Token-accumulation gate.
    let gateResult = "timeout";
    // Hard ceiling on poll iterations defends against a pathological clock/stat.
    const maxIters = Math.max(1, Math.ceil(perSlotTimeoutMs / Math.max(1, pollMs)) + 2);
    for (let i = 0; i < maxIters; i++) {
      const after = statFn(slot);
      const decision = nextAction({ before, after, wakeAtMs, nowMs: now() }, { perSlotTimeoutMs, minGrowthBytes });
      if (decision.action === "advance") { gateResult = "woke"; break; }
      if (decision.action === "skip") { gateResult = "timeout"; break; }
      await sleep(pollMs);
    }
    results.push({ slot, status: gateResult, wakeText, hwnd: sendRes.hwnd ?? null });

    // Stagger floor before the NEXT wake (even after a fast gate-pass) so two
    // account-checks never overlap.
    if (cursor < plan.length - 1) await sleep(staggerMs);
  }

  return { plan: plan.map((p) => p.slot), results, summary: summarize(results) };
}

// ═════════════════════════════════════════════════════════════════════════════
// CLI
// ═════════════════════════════════════════════════════════════════════════════

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--apply") a.apply = true;
    else if (t === "--all-pending") a.allPending = true;
    else if (t === "--active-fleet") a.activeFleet = true;
    else if (t === "--json") a.json = true;
    else if (t === "--slots") a.slots = argv[++i];
    else if (t === "--self") a.self = argv[++i];
    else if (t === "--stagger-ms") a.staggerMs = Number(argv[++i]);
    else if (t === "--poll-ms") a.pollMs = Number(argv[++i]);
    else if (t === "--timeout-ms") a.timeoutMs = Number(argv[++i]);
    else if (t === "--min-growth") a.minGrowth = Number(argv[++i]);
    else if (t === "--wake-cmd") a.wakeCmd = argv[++i];
    else a._.push(t);
  }
  return a;
}

function numOr(v, d) { return Number.isFinite(v) ? v : d; }

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Resolve wake list (precedence: explicit --slots > --all-pending > active-fleet/default).
  let slots;
  let source;
  if (args.slots) { slots = String(args.slots).split(",").map((s) => s.trim()).filter(Boolean); source = "explicit"; }
  else if (args.allPending) { slots = listPendingBriefSlots(); source = "pending-briefs"; }
  else { slots = readActiveFleet(); source = "active-fleet"; }

  const selfSlot = args.self || process.env.PRISM_SLOT || null;

  const lock = acquireLock();
  if (!lock.ok) {
    process.stdout.write(JSON.stringify({ ok: false, error: "locked", heldBy: lock.heldBy || null, lockError: lock.error || null }) + "\n");
    process.exit(0);
  }
  try {
    const out = await runSequencer({
      slots,
      selfSlot,
      confirm: args.apply === true,
      staggerMs: numOr(args.staggerMs, DEFAULT_STAGGER_MS),
      pollMs: numOr(args.pollMs, DEFAULT_POLL_MS),
      perSlotTimeoutMs: numOr(args.timeoutMs, DEFAULT_TIMEOUT_MS),
      minGrowthBytes: numOr(args.minGrowth, DEFAULT_MIN_GROWTH),
      wakeCmd: args.wakeCmd || DEFAULT_WAKE_CMD,
    });
    const payload = { ok: true, apply: args.apply === true, source, selfSlot, ...out };
    process.stdout.write(JSON.stringify(payload, null, args.json ? 0 : 2) + "\n");
  } finally {
    releaseLock(lock.lockFile);
  }
}

// Run main() only when invoked directly (exact basename match — NOT startsWith,
// which would also match fleet-wake-sequencer.test.mjs and run main() on import).
const __invokedDirectly = (() => {
  try { return path.basename(process.argv[1] || "") === "fleet-wake-sequencer.mjs"; }
  catch { return false; }
})();

if (__invokedDirectly) {
  main().catch((e) => {
    process.stderr.write(`[fleet-wake-sequencer] fatal: ${e?.stack || e}\n`);
    process.exit(1);
  });
}
