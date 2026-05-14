#!/usr/bin/env node
/**
 * process-slot-map.mjs — map running node/git/bash processes to the PRISM chat
 * slot (alpha..foxtrot+golf) that spawned them, via process ancestry.
 *
 * Consumed by:
 *   - scripts/fleet-reaper-sweep.mjs      (the slot-aware orphan reaper)
 *   - .claude/hooks/fleet-reaper-stop.mjs (prompt sweep when a chat ends)
 *
 * Why this exists: PRISM already has generic reapers (node-process-janitor,
 * cleanup-orchestrator + 5 sub-cleaners). All of them use age / dead-parent /
 * cmdline heuristics. NONE of them cross-reference chat-slots.json — so none can
 * say "this node.exe belongs to slot delta, and delta is crashed → reap it" vs
 * "belongs to alpha, which is alive → leave it alone." This module is that
 * missing slot-ownership layer. It does NOT kill anything — it only classifies.
 *
 * Purity: every function here is pure EXCEPT enumerateProcesses() (one
 * PowerShell / ps pass) and loadPidRegistry() (one file read). Both are
 * injectable so tests run against synthetic process tables + slot files.
 * enumerateProcesses() never throws — an OS-layer failure degrades to an empty
 * process table (a safe state: zero processes → zero reap candidates). The two
 * downstream callers are a Stop hook and a Monitor loop; neither may crash.
 *
 * Safety invariant (load-bearing): a process is only ever a reap CANDIDATE when
 * its ancestry provably leads to a GENUINELY DEAD PID (`unowned`) OR to a
 * crashed chat slot WHOSE RECORDED HARNESS PID IS ITSELF DEAD (`owned-by-crashed`).
 * If ownership is uncertain — a live ancestor we can't pin, a crashed-slot record
 * that contradicts a still-alive PID, missing ancestry, anything desktop/system-
 * rooted — it is NEVER a candidate. Uncertainty always resolves toward "do not kill."
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { randomBytes } from "node:crypto";

// ─── chat-slots primitives (vendored — read the note) ───────────────────────
//
// SLOT_NAMES / classifySlot / readSlots are re-implemented here rather than
// imported from .claude/helpers/chat-slots.mjs. chat-slots.mjs is the canonical
// owner of chat-slots.json, but it cannot be loaded under the repo's vitest
// harness — a pre-existing transform incompatibility (chat-slots.mjs has no test
// of its own, so it was never surfaced). Importing it would make this module —
// and everything downstream — untestable. The vendored copies are tiny, stable,
// and module-PRIVATE (deliberately NOT re-exported — chat-slots.mjs stays the
// sole public owner of these names, so no second module can hand out a copy
// that has drifted). readSlots is additionally READ-ONLY: unlike
// chat-slots.mjs's readSlots it never writes a `.corrupt-*` backup — a reader
// must not mutate a file a peer process owns.
//
// KEEP IN SYNC WITH chat-slots.mjs (verified 2026-05-14):
//   SLOT_NAMES         = [alpha, bravo, charlie, delta, echo, foxtrot, golf]
//   STALE_TTL_MS       = 2 * 60 * 1000     (alive  if heartbeat younger)
//   CRASH_TTL_MS       = 10 * 60 * 1000    (stale below this, crashed above)
//   classifySlot()     = idle | alive | stale | crashed (same branch logic)
//   readSlots() parse + 7-slot-backfill contract (only the corrupt-backup WRITE
//     is intentionally dropped here — the parse/shape behaviour must still track)
//   DEFAULT_SLOTS_PATH (chat-slots.mjs calls this DEFAULT_STATE_PATH)
// The drift guard in fleet-reaper.test.mjs text-asserts these values against
// chat-slots.mjs so silent drift becomes a red test. If chat-slots.mjs ever
// becomes vitest-loadable, delete this block and restore the direct import.

/** NATO-phonetic slot names — alpha..foxtrot work slots + golf hygiene slot. */
const SLOT_NAMES = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf"];

/** A slot whose heartbeat is younger than this is "alive". */
const STALE_TTL_MS = 2 * 60 * 1000;
/** A slot with no heartbeat for this long is "crashed" (slot reclaimable). */
const CRASH_TTL_MS = 10 * 60 * 1000;

/** Canonical chat-slots registry path (chat-slots.mjs: DEFAULT_STATE_PATH). */
const DEFAULT_SLOTS_PATH = "H:/prism/state/shared/chat-slots.json";

/**
 * Classify a slot by heartbeat age: idle (no slot) · alive (<2min) ·
 * stale (2-10min) · crashed (>10min, or an unparseable heartbeat).
 */
function classifySlot(slot, now = Date.now()) {
  if (!slot) return "idle";
  const lastMs = Date.parse(slot.lastHeartbeat);
  if (!Number.isFinite(lastMs)) return "crashed";
  const age = now - lastMs;
  if (age < STALE_TTL_MS) return "alive";
  if (age < CRASH_TTL_MS) return "stale";
  return "crashed";
}

/** Empty chat-slots file shape (all 7 slots null). */
function emptySlotsFile() {
  const slots = {};
  for (const n of SLOT_NAMES) slots[n] = null;
  return { schemaVersion: 1, lastUpdated: new Date().toISOString(), slots };
}

/**
 * Read the chat-slots registry — READ-ONLY, self-healing, never throws.
 * Returns the empty shape on a missing/corrupt/malformed file (chat-slots.mjs
 * owns corruption recovery; a reader stays passive). Absent slot keys are
 * backfilled to null so the result always carries all 7 — a true behavioural
 * subset of chat-slots.mjs's readSlots minus only the corrupt-backup write.
 *
 * Every return carries `__slotsResolved`:
 *   - `true`  — we have a DEFINITE answer: the file parsed cleanly, OR the file
 *               is genuinely absent (no chat has ever claimed a slot → nothing
 *               is pinned, which is itself a definite statement).
 *   - `false` — DEGRADED: the file exists but could not be parsed/validated
 *               (mid-write race, corruption, EBUSY). We do NOT know the slot
 *               map. FLEET-REAPER-MS1's `leftover-bash-task` classifier reads
 *               this flag and refuses to classify when it is `false` — a
 *               degraded slots file must never WIDEN the candidate set (it
 *               would make every live unpinned-looking harness a false orphan).
 * The flag is namespaced (`__`) so it never collides with a real slot key and
 * `mapPidsToSlots` — which only reads `.slots` — is unaffected.
 */
function readSlots(statePath = DEFAULT_SLOTS_PATH) {
  try {
    if (!existsSync(statePath)) return { ...emptySlotsFile(), __slotsResolved: true };
    const parsed = JSON.parse(readFileSync(statePath, "utf-8"));
    if (!parsed || typeof parsed !== "object" ||
        !parsed.slots || typeof parsed.slots !== "object") {
      return { ...emptySlotsFile(), __slotsResolved: false };
    }
    for (const n of SLOT_NAMES) {
      if (!(n in parsed.slots)) parsed.slots[n] = null;
    }
    parsed.__slotsResolved = true;
    return parsed;
  } catch {
    return { ...emptySlotsFile(), __slotsResolved: false };
  }
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** PID→session registry written by .claude/hooks/session-id-pin.mjs. */
export const DEFAULT_PID_REGISTRY =
  "H:/prism/state/shared/handoffs/.active-sessions-by-pid.json";

/** PowerShell enumeration timeout — generous; a busy box has 400+ processes. */
const PS_TIMEOUT_MS = 12000;

/** Cap on ancestry-walk depth. The `seen` set already guarantees termination on
 *  cycles independent of this cap — 40 is a safe over-allocation (real Windows
 *  process trees are rarely deeper than ~15). */
const MAX_ANCESTRY_DEPTH = 40;

/** Only trust a PID→session pin refreshed within this window. The registry
 *  retains entries for ~8h (session-id-pin.mjs), but a PID recycles far faster
 *  on a busy box — a stale pin + PID reuse would mis-attribute a live process.
 *  Mirrors stable-session-id.mjs's PIN_FRESH_MS. */
const PID_REGISTRY_FRESH_MS = 10 * 60 * 1000;

/** Process names this module reasons about. Everything else is ignored outright. */
export const TARGET_NAMES = new Set(["node", "git", "bash", "sh"]);

/** Claude harness process name(s). A LIVE ancestor with this name = "owned by a
 *  live chat we couldn't pin to a slot" → protected. Best-effort secondary net;
 *  the primary attribution path is slotPidMap (chat-slots.json `pid` field). */
export const HARNESS_NAMES = new Set(["claude"]);

/**
 * Process names eligible for the FLEET-REAPER-MS1 "leftover-bash-task" classifier.
 * Subset of TARGET_NAMES restricted to shells — the leftover-task pattern is a
 * shell idiom (`while true; do … sleep N; done`, `tail -f`, etc.). A leftover
 * node.exe would be a hung helper / orphaned MCP and is the existing reapers'
 * concern (`owned-by-crashed` / `unowned`), not this one.
 */
export const LEFTOVER_TASK_NAMES = new Set(["bash", "sh"]);

/**
 * Signatures of long-running shell tasks that survive their owning chat. Each
 * signature is an `all` array of SIMPLE regexes — every regex in the array must
 * match the cmdline for the signature to fire. This AND-of-simple-regexes shape
 * is deliberate and load-bearing:
 *
 *   - **ReDoS-safe.** Each individual regex is linear (no unbounded `.*`
 *     between paired tokens, no nested quantifiers). The earlier design used a
 *     single regex with a `[\s\S]{0,200}` window between `while…do` and
 *     `sleep` — that is NOT linear: with no `sleep` token the engine retries
 *     the window at every `while…do` start. Splitting into two independent
 *     `.test()` calls removes the coupled backtracking entirely.
 *   - **Structural, not substring.** A literal `echo "while true"` lacks the
 *     paired `sleep \d+` token, so the `while-sleep-loop` signature does not
 *     fire. `matchesLeftoverTaskPattern` additionally truncates the haystack to
 *     LEFTOVER_CMD_SCAN_MAX before testing — a leftover-task signature always
 *     appears in the first few hundred chars, and the cap kills the
 *     input-length dimension for an adversarial 64 KB cmdline.
 *
 * Vetted against the live `bash.exe` cmdlines we actually observe orphaned:
 * Bash-tool persistent loops (`while true; do … sleep N; done` — this is the
 * exact form of the leftover `/fleet-reaper` Monitor wrapper we saw in the
 * wild) and Claude Code's documented Monitor idioms (`tail -f … | grep
 * --line-buffered`, `inotifywait -m`).
 *
 * NOT included: `--monitor-loop` as a bare substring (dropped — it is a plain
 * substring that matches doc edits / greps / unrelated flags, and the real
 * leftover Monitor is a `while…sleep` loop already caught by signature #1; a
 * direct `node …--monitor-loop` is a `node` process, excluded by
 * LEFTOVER_TASK_NAMES). NOT included: detachment idioms (`nohup`, `setsid`,
 * `disown`, `screen -dmS`, `tmux new-session -d`) — those SEVER the harness
 * ancestry this classifier's branch depends on (the detached shell's parent
 * becomes init / the multiplexer daemon, never `claude.exe`), so they are
 * unreachable here by construction and belong to the `unowned` path instead.
 */
export const LEFTOVER_TASK_PATTERNS = Object.freeze([
  { name: "while-sleep-loop", all: [/while\s+(?:true|:)\s*;?\s*do\b/, /\bsleep\s+\d+/] },
  { name: "tail-f-grep", all: [/\btail\s+-f\b/, /\bgrep\s+--line-buffered\b/] },
  { name: "inotifywait", all: [/\binotifywait\s+-m\b/] },
]);

/** Cmdline scan cap for `matchesLeftoverTaskPattern` — a leftover-task
 *  signature is always near the front; capping the haystack keeps regex cost
 *  bounded regardless of how long an adversarial `proc.cmd` is. */
const LEFTOVER_CMD_SCAN_MAX = 4096;

/**
 * Minimum age before a leftover-pattern shell is considered for reap. 15 min.
 *
 * Calibration:
 *   - longer than the alive-slot heartbeat TTL (2 min) so we never demote a
 *     fresh helper whose slot just hasn't pinged yet,
 *   - longer than the kill-after × interval default (10 min) so the existing
 *     `unowned` path still wins for genuine dead-ancestor orphans (those reap
 *     at ~10 min; this class is gated to ~15 min here AND re-gated by the
 *     sweep's confirm-after-N-ticks window before any kill),
 *   - short enough that a Monitor whose chat died but whose unpinned harness
 *     persisted is caught within one extra sweep cycle.
 */
export const LEFTOVER_AGE_MS_MIN = 15 * 60 * 1000;

/** True when `name` is a shell eligible for leftover-task classification. */
export function isLeftoverTaskName(n) {
  return LEFTOVER_TASK_NAMES.has(normName(n));
}

/**
 * True when `cmd` matches any LEFTOVER_TASK_PATTERNS signature (every regex in
 * a signature's `all` array must match). Pure; ReDoS-safe (haystack truncated
 * to LEFTOVER_CMD_SCAN_MAX, each regex linear).
 */
export function matchesLeftoverTaskPattern(cmd) {
  const hay = String(cmd || "").slice(0, LEFTOVER_CMD_SCAN_MAX);
  if (!hay) return false;
  for (const sig of LEFTOVER_TASK_PATTERNS) {
    if (sig.all.every((re) => re.test(hay))) return true;
  }
  return false;
}

/**
 * Never reap these even when the ancestry looks orphaned — long-lived infra or
 * processes another reaper owns. Patterns mirror node-process-janitor.mjs and
 * reap-zombie-procs.mjs so the three reapers agree on what is off-limits.
 */
export const PROTECTED_PATTERNS = [
  /dist[\\/]index\.js/i,        // PRISM MCP core server
  /tsserver(\.js)?/i,           // TypeScript language server (IDE-backing)
  /typingsInstaller/i,          // auto-respawned by tsserver
  /typescript-language-server/i,
  /dashboard-serve\.mjs/i,      // PRISM dashboard daemon
  /mcp-http-bridge\.mjs/i,      // long-lived bridge service
  /observability-drain/i,       // intentional long-lived drain
  /\b(vitest|jest|tsx|esbuild)\b/i, // test/build workers — node-orphan-cleaner owns these
  /@playwright[\\/].*mcp/i,     // playwright MCP — node-process-janitor owns these
];

/** Most recent OS-enumeration failure message (null if the last pass was clean
 *  or used an injected enumerator). snapshotFleet surfaces this as a caveat. */
let lastEnumerationError = null;

/** @returns {string|null} the last enumerateProcesses() OS failure, or null. */
export function getLastEnumerationError() {
  return lastEnumerationError;
}

// ─── Name helpers ───────────────────────────────────────────────────────────

function normName(n) {
  return String(n || "").toLowerCase().replace(/\.exe$/, "");
}
export function isTargetName(n) {
  return TARGET_NAMES.has(normName(n));
}
export function isHarnessName(n) {
  return HARNESS_NAMES.has(normName(n));
}
export function isProtectedCmd(proc) {
  const hay = `${proc?.name || ""} ${proc?.cmd || ""}`;
  return PROTECTED_PATTERNS.some((re) => re.test(hay));
}

// ─── Process enumeration (the only OS side effect) ──────────────────────────

/** Resolve a usable PowerShell binary. Portable-node hosts often have a PATH
 *  that lacks System32 (see stable-session-id.mjs), so prefer the absolute path. */
function resolvePowershell() {
  const abs = "C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe";
  try {
    if (existsSync(abs)) return abs;
  } catch { /* fall through */ }
  return "powershell.exe";
}

/**
 * One Win32_Process snapshot → array of
 *   { pid, ppid, name, cmd, createdMs, rssBytes }
 * createdMs is epoch-ms (null if the OS didn't report a creation date).
 */
function windowsEnumerate() {
  const psScript = `
$ErrorActionPreference = 'SilentlyContinue'
$procs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue
$out = foreach ($p in $procs) {
  $cms = $null
  if ($p.CreationDate) {
    try { $cms = [int64]([datetimeoffset]$p.CreationDate).ToUnixTimeMilliseconds() } catch { $cms = $null }
  }
  [pscustomobject]@{
    pid       = [int]$p.ProcessId
    ppid      = [int]$p.ParentProcessId
    name      = $p.Name
    cmd       = $p.CommandLine
    createdMs = $cms
    rssBytes  = [int64]$p.WorkingSetSize
  }
}
$out | ConvertTo-Json -Compress -Depth 3
`.trim();

  const psFile = join(
    tmpdir(),
    `prism-fleet-reaper-enum-${process.pid}-${randomBytes(4).toString("hex")}.ps1`,
  );
  writeFileSync(psFile, psScript, "utf-8");
  try {
    const raw = execFileSync(
      resolvePowershell(),
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", psFile],
      {
        timeout: PS_TIMEOUT_MS, encoding: "utf-8", windowsHide: true,
        maxBuffer: 64 * 1024 * 1024,
        // SIGKILL (not the default SIGTERM) on timeout: a WMI-wedged powershell
        // can ignore SIGTERM and leak — the reaper must not leak its own tools.
        killSignal: "SIGKILL",
      },
    );
    const text = String(raw || "").trim();
    if (!text) return [];
    const parsed = JSON.parse(text);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return arr.map(normalizeProc).filter(Boolean);
  } finally {
    try { unlinkSync(psFile); } catch { /* best-effort */ }
  }
}

/** POSIX fallback so the module runs (and tests) on non-Windows hosts. */
function posixEnumerate() {
  const raw = execFileSync(
    "ps",
    ["-eo", "pid=,ppid=,etimes=,rss=,comm=,args="],
    { timeout: PS_TIMEOUT_MS, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 },
  );
  const now = Date.now();
  const procs = [];
  for (const line of String(raw || "").split("\n")) {
    // groups: 1=pid 2=ppid 3=etimes 4=rss 5=comm 6=args
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s*(.*)$/);
    if (!m) continue;
    const etimes = Number(m[3]);
    procs.push(normalizeProc({
      pid: Number(m[1]),
      ppid: Number(m[2]),
      // comm may be an absolute path on macOS — basename it so isTargetName works.
      name: basename(m[5]),
      cmd: m[6] || m[5],
      createdMs: Number.isFinite(etimes) ? now - etimes * 1000 : null,
      rssBytes: Number(m[4]) * 1024, // ps rss is in KiB
    }));
  }
  return procs.filter(Boolean);
}

/** Coerce one raw process record into the canonical shape; drop unusable rows. */
function normalizeProc(r) {
  if (!r || typeof r !== "object") return null;
  const pid = Number(r.pid);
  const ppid = Number(r.ppid);
  if (!Number.isInteger(pid) || pid <= 0) return null;
  const createdMs = Number(r.createdMs);
  return {
    pid,
    ppid: Number.isInteger(ppid) && ppid > 0 ? ppid : 0,
    name: String(r.name || ""),
    cmd: r.cmd == null ? "" : String(r.cmd),
    createdMs: Number.isFinite(createdMs) ? createdMs : null,
    rssBytes: Number.isFinite(Number(r.rssBytes)) ? Number(r.rssBytes) : 0,
  };
}

/**
 * @param {{ enumerator?: () => object[] }} [opts] — inject `enumerator` in tests.
 * @returns {Array<{pid,ppid,name,cmd,createdMs,rssBytes}>} — `[]` on OS failure.
 *
 * Never throws. An OS-layer failure (powershell missing, timeout, ENOBUFS,
 * truncated/garbage output) is caught and degraded to an empty table; the
 * failure message is stashed in `lastEnumerationError` for snapshotFleet to
 * surface. A Stop hook and a Monitor loop call this — neither may crash.
 */
export function enumerateProcesses(opts = {}) {
  lastEnumerationError = null;
  if (typeof opts.enumerator === "function") {
    return opts.enumerator().map(normalizeProc).filter(Boolean);
  }
  try {
    return process.platform === "win32" ? windowsEnumerate() : posixEnumerate();
  } catch (err) {
    lastEnumerationError = err?.message || String(err);
    return [];
  }
}

// ─── Ancestry ───────────────────────────────────────────────────────────────

/**
 * Build a PID index + an ancestor-walker over a process list.
 * `ancestorsOf(pid)` returns the chain of PARENT pids from the immediate parent
 * upward, stopping at the first parent that is NOT in the table (a dead/missing
 * ancestor) or at the root. The first not-in-table entry IS included — callers
 * use `byPid.has(apid)` to tell "alive ancestor" from "dead link." Because the
 * walk stops at the first dead link, an orphan whose intermediate parent is also
 * dead cannot be attributed past that point — it is still correctly flagged
 * `unowned` (and reaped), but `ownerSlot` may be null.
 */
export function buildAncestry(procs) {
  const byPid = new Map();
  for (const p of procs) byPid.set(p.pid, p);

  function ancestorsOf(pid, maxDepth = MAX_ANCESTRY_DEPTH) {
    const chain = [];
    const seen = new Set([pid]);
    let cur = byPid.get(pid);
    let depth = 0;
    while (cur && cur.ppid && !seen.has(cur.ppid) && depth < maxDepth) {
      seen.add(cur.ppid);
      chain.push(cur.ppid);
      const parent = byPid.get(cur.ppid);
      if (!parent) break; // dead/missing ancestor — chain ends here
      cur = parent;
      depth += 1;
    }
    return chain;
  }

  return { byPid, ancestorsOf };
}

// ─── Slot ownership map ─────────────────────────────────────────────────────

/** Status precedence for conflict resolution — higher = "more alive" = safer. */
const STATUS_RANK = { alive: 3, stale: 2, crashed: 1, idle: 0 };

/**
 * Safely read the PID→session registry. Shape:
 *   { pids: { "<pid>": { session_id, last_seen, cwd, ... } } }
 * Self-heals on every failure path — never throws (mirrors readSlots).
 */
export function loadPidRegistry(registryPath = DEFAULT_PID_REGISTRY) {
  try {
    if (!existsSync(registryPath)) return { pids: {} };
    const parsed = JSON.parse(readFileSync(registryPath, "utf-8"));
    if (
      !parsed || typeof parsed !== "object" ||
      typeof parsed.pids !== "object" || parsed.pids === null ||
      Array.isArray(parsed.pids)
    ) {
      return { pids: {} };
    }
    return { pids: parsed.pids };
  } catch {
    return { pids: {} };
  }
}

/**
 * Build Map<harnessPid, { slot, status, chatId }> — the set of PIDs that, if
 * found in a process's ancestry, attribute it to a chat slot.
 *
 * A slot's owning PIDs = its chat-slots.json `pid` field ∪ every FRESH PID in
 * the session registry whose `session_id` matches the slot's `chatId`. Registry
 * entries older than PID_REGISTRY_FRESH_MS (or with an unparseable `last_seen`)
 * are skipped — a stale pin + PID reuse would otherwise mis-attribute a live
 * unrelated process to a dead slot.
 *
 * Note a slot's recorded harness PID is usually itself dead when the slot is
 * crashed — that is fine here (it still lets classifyProcess attribute the
 * orphan); classifyProcess separately confirms the PID is genuinely dead before
 * ever treating it as a reap candidate.
 *
 * @returns {{ map: Map, caveats: string[] }} caveats flags alive/stale slots
 *   whose PID we could not resolve — the sweep surfaces these so a data gap
 *   is visible rather than silently widening the "uncertain → don't kill" set.
 */
export function mapPidsToSlots(slotsFile, pidRegistry, now = Date.now()) {
  const map = new Map();
  const caveats = [];
  const slots = (slotsFile && slotsFile.slots) || {};

  // Index registry: sessionId -> [pid, ...], freshness-filtered.
  const sessionPids = new Map();
  for (const [pidStr, rec] of Object.entries((pidRegistry && pidRegistry.pids) || {})) {
    const pid = Number(pidStr);
    if (!Number.isInteger(pid) || pid <= 0) continue;
    const sid = rec && rec.session_id;
    if (!sid) continue;
    const lastSeenMs = Date.parse(rec && rec.last_seen);
    if (!Number.isFinite(lastSeenMs) || now - lastSeenMs > PID_REGISTRY_FRESH_MS) continue;
    if (!sessionPids.has(sid)) sessionPids.set(sid, []);
    sessionPids.get(sid).push(pid);
  }

  for (const name of SLOT_NAMES) {
    const slot = slots[name];
    if (!slot) continue;
    const status = classifySlot(slot, now);
    const owned = new Set();
    if (Number.isInteger(slot.pid) && slot.pid > 0) owned.add(slot.pid);
    if (slot.chatId && sessionPids.has(slot.chatId)) {
      for (const p of sessionPids.get(slot.chatId)) owned.add(p);
    }
    if (owned.size === 0 && (status === "alive" || status === "stale")) {
      caveats.push(`slot ${name} is ${status} but has no resolvable PID (chatId=${slot.chatId || "?"})`);
    }
    for (const p of owned) {
      const prev = map.get(p);
      // If a PID maps to two slots (PID reuse / stale registry), keep the
      // "more alive" attribution — never let a stale entry mark a PID crashed.
      if (!prev || (STATUS_RANK[status] ?? -1) > (STATUS_RANK[prev.status] ?? -1)) {
        map.set(p, { slot: name, status, chatId: slot.chatId || null });
      }
    }
  }

  return { map, caveats };
}

// ─── Per-process classification ─────────────────────────────────────────────

/**
 * Classify ONE process by ownership. Returns the canonical record plus:
 *   class       — protected | owned-by-alive | owned-by-stale | owned-by-crashed
 *                 | owned-by-other-live | unowned | indeterminate | not-target
 *                 | leftover-bash-task (FLEET-REAPER-MS1)
 *   isCandidate — true for owned-by-crashed, unowned, and leftover-bash-task.
 *                 The leftover-bash-task path carries EXTRA gates the other two
 *                 do not (shell name + age floor + structural cmd pattern +
 *                 unpinned harness + resolved slot data) — see the branch below.
 *   ageMs       — surfaced for the downstream sweep's age-floor gate; ALSO read
 *                 here for the leftover-bash-task age gate (the only place
 *                 classification consults age — every other class is pure
 *                 ownership).
 *
 * @param {object} proc  one normalized process record
 * @param {object} ctx   { byPid, ancestorsOf, slotPidMap, selfPid?, now?,
 *                          slotsResolved? }
 *                       byPid / ancestorsOf / slotPidMap are required;
 *                       selfPid defaults to null, now defaults to Date.now().
 *                       slotsResolved defaults to true — but `snapshotFleet`
 *                       ALWAYS passes it explicitly (false when the chat-slots
 *                       file was unreadable). When false, the
 *                       leftover-bash-task branch is suppressed: degraded slot
 *                       data must never widen the candidate set.
 */
export function classifyProcess(proc, ctx) {
  const {
    byPid, ancestorsOf, slotPidMap, selfPid = null, now = Date.now(),
    slotsResolved = true,
  } = ctx;
  const ageMs = Number.isFinite(proc.createdMs) ? Math.max(0, now - proc.createdMs) : null;
  const base = {
    pid: proc.pid,
    ppid: proc.ppid,
    name: proc.name,
    cmd: proc.cmd || "",
    createdMs: Number.isFinite(proc.createdMs) ? proc.createdMs : null,
    rssBytes: Number.isFinite(proc.rssBytes) ? proc.rssBytes : 0,
    ageMs,
    ownerSlot: null,
    ownerStatus: null,
  };
  const verdict = (cls, reason, extra = {}) => ({
    ...base,
    ...extra,
    class: cls,
    reason,
    // FLEET-REAPER-MS1: `leftover-bash-task` joins the candidate set. It is the
    // *only* candidate class allowed to fire under a still-alive ancestor, so
    // the branch that produces it (below) carries four extra gates the other
    // two candidate classes do not: (1) shell process name, (2) age ≥
    // LEFTOVER_AGE_MS_MIN, (3) a structural cmd-pattern match, (4) the slots
    // file resolved cleanly. The downstream sweep then applies the SAME
    // confirm-after-N-ticks window it applies to every candidate (it does NOT
    // re-check the 15-min floor — that floor lives only here). Net effect:
    // ~15 min classification floor + ~10 min sweep confirm window before any
    // leftover-bash-task is reaped.
    isCandidate:
      cls === "owned-by-crashed" || cls === "unowned" || cls === "leftover-bash-task",
  });

  // Non-target processes are out of scope entirely.
  if (!isTargetName(proc.name)) return verdict("not-target", "non-target process name");

  // Never touch ourselves or anything we spawned.
  if (selfPid != null && proc.pid === selfPid) return verdict("protected", "self");
  const chain = ancestorsOf(proc.pid);
  if (selfPid != null && chain.includes(selfPid)) {
    return verdict("protected", "descendant of the sweep process");
  }

  // Long-lived infra / processes another reaper owns.
  if (isProtectedCmd(proc)) return verdict("protected", "matches PROTECTED_PATTERNS");

  // No ancestry at all (ppid 0 / unrooted) — cannot prove orphanhood. Stay safe.
  if (chain.length === 0) return verdict("indeterminate", "no ancestry information");

  // Walk parents from immediate up. Stop at the first decisive ancestor.
  for (const apid of chain) {
    // (1) Ancestor is a known chat-slot harness PID — strongest signal.
    if (slotPidMap.has(apid)) {
      const { slot, status } = slotPidMap.get(apid);
      const owner = { ownerSlot: slot, ownerStatus: status };
      if (status === "alive") {
        return verdict("owned-by-alive", `ancestor ${apid} = slot ${slot} (alive)`, owner);
      }
      if (status === "stale") {
        return verdict("owned-by-stale", `ancestor ${apid} = slot ${slot} (stale)`, owner);
      }
      // crashed (or idle) slot. ONLY a reap candidate if the recorded harness
      // PID is GENUINELY DEAD. If `apid` is still alive in the table the slot
      // record contradicts reality — a wedged-but-running harness, or PID reuse
      // by an unrelated live process — so refuse to reap: return indeterminate.
      if (byPid.has(apid)) {
        return verdict(
          "indeterminate",
          `slot ${slot} classified ${status} but ancestor PID ${apid} is still alive — stale slot record, not reaping`,
          owner,
        );
      }
      return verdict(
        "owned-by-crashed",
        `ancestor ${apid} = slot ${slot} (${status}); harness PID is dead`,
        owner,
      );
    }
    const ap = byPid.get(apid);
    if (ap) {
      // (2) Alive ancestor.
      if (isHarnessName(ap.name)) {
        // FLEET-REAPER-MS1: an alive `claude.exe` that is NOT pinned to any chat
        // slot is a *lingering* harness — the chat that spawned us may have died
        // hours ago while its harness process stuck around. If this process is
        // itself a shell running a long-running task pattern (`while true;
        // sleep`, `tail -f … grep`, `inotifywait -m`) AND has been alive longer
        // than LEFTOVER_AGE_MS_MIN, treat it as a leftover-bash-task candidate.
        //
        // Gates, every one load-bearing:
        //  - slotsResolved: when the chat-slots file was unreadable we CANNOT
        //    know this harness is unpinned — a degraded read makes every live
        //    harness *look* unpinned. Suppress the class entirely; fall back to
        //    the pre-MS1 `owned-by-alive` (the safe direction).
        //  - isLeftoverTaskName: shells only — a leftover node.exe is the
        //    existing reapers' `owned-by-crashed`/`unowned` concern.
        //  - ageMs ≥ LEFTOVER_AGE_MS_MIN: never demote a fresh helper.
        //  - matchesLeftoverTaskPattern: structural cmd signature, not substring.
        //
        // "Unpinned" scope: this checks the NEAREST `claude.exe` ancestor — step
        // (1) `slotPidMap.has(apid)` returned false for it and for every closer
        // ancestor. A second, deeper `claude.exe` ancestor is not a real Windows
        // scenario (the harness does not spawn a child harness), so the nearest
        // is the only one that matters.
        if (
          slotsResolved &&
          isLeftoverTaskName(proc.name) &&
          Number.isFinite(ageMs) &&
          ageMs >= LEFTOVER_AGE_MS_MIN &&
          matchesLeftoverTaskPattern(proc.cmd)
        ) {
          return verdict(
            "leftover-bash-task",
            `leftover ${proc.name} (age ${Math.round(ageMs / 1000)}s, ` +
            `pattern matched) under unpinned harness ${apid}`,
          );
        }
        // Default: a live Claude harness we couldn't pin = "live chat in motion."
        return verdict("owned-by-alive", `live harness ancestor ${apid} (${ap.name})`);
      }
      if (isTargetName(ap.name)) {
        // node/git/bash hook chain — keep climbing toward the real root.
        continue;
      }
      // Alive ancestor that is neither harness nor a hook process: a terminal,
      // explorer, svchost, the Task Scheduler, an editor... something real is
      // keeping this process alive. It is NOT an orphan of a dead chat.
      return verdict("owned-by-other-live", `live non-harness ancestor ${apid} (${ap.name || "?"})`);
    }
    // (3) Dead ancestor, not a slot PID — the chain broke here and we only
    //     passed through node/git/bash on the way. This is a genuine orphan.
    return verdict("unowned", `dead ancestor ${apid} — no live owner in the chain`);
  }

  // Chain exhausted through only alive hook processes (no dead link, no harness,
  // no slot PID, no desktop root). Rare; treat as indeterminate, never a candidate.
  return verdict("indeterminate", "ancestry exhausted without a decisive owner");
}

// ─── Top-level fleet snapshot ───────────────────────────────────────────────

/**
 * One end-to-end pass: enumerate → map slots → classify every target process.
 * Everything is injectable so tests never touch the real OS or real state files.
 * Never throws: an OS enumeration failure degrades to an empty fleet (zero
 * candidates) and is surfaced in `caveats`.
 *
 * @param {object} [opts]
 * @param {() => object[]}  [opts.enumerator]   inject a synthetic process table
 * @param {object}          [opts.slotsFile]    inject a synthetic chat-slots file
 * @param {object}          [opts.pidRegistry]  inject a synthetic PID registry
 * @param {string}          [opts.slotsPath]    path to chat-slots.json (default helper const)
 * @param {string}          [opts.registryPath] path to the PID registry
 * @param {number}          [opts.selfPid]      PID to treat as "self" (default process.pid)
 * @param {number}          [opts.now]          clock injection
 * @returns {{ now, procs, classified, candidates, slotPidMap, slotsResolved,
 *            caveats, counts }}
 *   slotsResolved — false when the chat-slots file existed but could not be
 *   parsed (degraded). Propagated into the classifier so the FLEET-REAPER-MS1
 *   leftover-bash-task branch is suppressed on degraded slot data. An injected
 *   `opts.slotsFile` is treated as resolved unless it explicitly carries
 *   `__slotsResolved: false` (so tests can exercise the degraded path).
 */
export function snapshotFleet(opts = {}) {
  const now = Number.isFinite(opts.now) ? opts.now : Date.now();
  const selfPid = Number.isFinite(opts.selfPid) ? opts.selfPid : process.pid;

  const procs = enumerateProcesses({ enumerator: opts.enumerator });
  const slotsFile = opts.slotsFile || readSlots(opts.slotsPath);
  const pidRegistry = opts.pidRegistry || loadPidRegistry(opts.registryPath);
  // `readSlots` stamps `__slotsResolved`; an injected slotsFile may omit it
  // (treated as resolved) or set it false to test the degraded path.
  const slotsResolved = slotsFile && slotsFile.__slotsResolved === false ? false : true;

  const { byPid, ancestorsOf } = buildAncestry(procs);
  const { map: slotPidMap, caveats: slotCaveats } = mapPidsToSlots(slotsFile, pidRegistry, now);
  const caveats = [...slotCaveats];

  // An empty process table from the real OS means enumeration failed (there are
  // always processes). Surface it — the sweep should treat this as "skipped",
  // not "fleet is clean."
  if (!opts.enumerator && procs.length === 0) {
    caveats.push(
      lastEnumerationError
        ? `process enumeration failed (${lastEnumerationError}) — 0 candidates (safe degraded state)`
        : "process enumeration returned 0 processes — OS query likely failed; sweep skipped",
    );
  }
  // A degraded slots read suppresses the leftover-bash-task class — surface it
  // so an operator sees WHY no leftover candidates appeared this sweep.
  if (!slotsResolved) {
    caveats.push(
      "chat-slots file unreadable — leftover-bash-task classification suppressed this sweep (degraded slot data must not widen the candidate set)",
    );
  }

  const ctx = { byPid, ancestorsOf, slotPidMap, selfPid, now, slotsResolved };
  const classified = [];
  for (const p of procs) {
    if (!isTargetName(p.name)) continue;
    classified.push(classifyProcess(p, ctx));
  }

  const candidates = classified.filter((c) => c.isCandidate);
  const counts = { targets: classified.length, candidates: candidates.length };
  for (const c of classified) counts[c.class] = (counts[c.class] || 0) + 1;

  return { now, procs, classified, candidates, slotPidMap, slotsResolved, caveats, counts };
}
