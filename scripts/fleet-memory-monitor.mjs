/**
 * fleet-memory-monitor.mjs — durable system-RAM + per-slot memory monitor.
 *
 * Sits ALONGSIDE the fleet-reaper. The reaper reaps orphan processes of
 * CRASHED slots (after a 10-min confirm window) and runs at +210s phase off
 * the host. That covers post-crash cleanup, but leaves a real gap: when ALL
 * 13 chats are LIVE and the box drifts toward commit-memory saturation, the
 * reaper has no candidates to kill, fleet-reaper-sweep returns "ok 0
 * candidates", and pressure climbs unnoticed until a chat dies hard.
 *
 * This monitor closes that gap. Every 5 minutes (Windows Scheduled Task —
 * survives every chat closing) it:
 *   1. Samples system memory via Win32_OperatingSystem (Total+Free physical)
 *      and the commit budget via TotalVirtual/FreeVirtual.
 *   2. Enumerates running node/claude/bash/git/powershell processes with
 *      WorkingSetSize.
 *   3. Joins to chat-slots.json — each chat's harness PID anchors a process
 *      family — sums per-slot RSS (the live RAM footprint of each chat).
 *   4. Computes pressure: physical%, commit%, top-3 largest slots.
 *   5. Decides clean | warn | critical from the worst of physical/commit.
 *   6. Appends to state/shared/fleet-memory-history.jsonl (size-rotated).
 *   7. On critical (or warn with sustained-N-ticks confirmation) emits ONE
 *      throttled advisory to state/shared/AGENT_CHAT.jsonl identifying the
 *      LARGEST live slot — the operator's best /compact target.
 *
 * The single thing this monitor does that the reaper cannot: surface WHICH
 * LIVE CHAT to compact when pressure rises. The reaper only kills the dead;
 * this names the heaviest live tenant. Strictly advisory — never kills,
 * never auto-compacts (no slash-command surface on the harness side).
 *
 * Independence invariant: the Windows scheduled task runs whether-logged-on
 * (S4U principal) and at boot — alpha's /compact, every chat dying, the
 * fleet-reaper being disabled — none of them stop this monitor. The /loop
 * + Monitor-tool paths are optional convenience surfaces, not the backbone.
 *
 * Usage:
 *   node fleet-memory-monitor.mjs                 # one sample, text summary
 *   node fleet-memory-monitor.mjs --once --json   # one sample, JSON
 *   node fleet-memory-monitor.mjs --status        # read ledger, no sample
 *   node fleet-memory-monitor.mjs --history [N]   # tail N (default 20) telemetry rows
 *   node fleet-memory-monitor.mjs --reset         # clear telemetry + ledger
 *   node fleet-memory-monitor.mjs --no-advisory   # sample + telemetry only, no chat-bus emit
 *   node fleet-memory-monitor.mjs --dry-run       # full sample, never write/emit
 *   node fleet-memory-monitor.mjs --help
 *
 * Env knobs (CLI flags win over env):
 *   PRISM_FLEET_MEMMON_DISABLE=1         monitor refuses to write/emit
 *   PRISM_FLEET_MEMMON_WARN_PCT=N        physical+commit threshold for warn (default 80)
 *   PRISM_FLEET_MEMMON_CRIT_PCT=N        physical+commit threshold for critical (default 92)
 *   PRISM_FLEET_MEMMON_ADVISORY_COOLDOWN_SEC=N   min seconds between AGENT_CHAT emits (default 600)
 *   PRISM_FLEET_MEMMON_SUSTAINED_TICKS=N         consecutive warn ticks before warn advisory (default 2)
 *   PRISM_FLEET_MEMMON_PS_TIMEOUT_MS=N           PowerShell sample timeout (default 10000)
 *
 * Exit codes: 0 ok (clean) · 1 warn · 2 critical · 3 measurement/IO failure (R12 fail-loud)
 *
 * Built 2026-05-16, slot=golf-work, in response to:
 *   "monitor memory and ram usage every 5 minutes to keep 13 chats active.
 *    fleet-reaper isn't enough since it drops during alpha's compaction."
 *
 * NOT TO BE CONFUSED WITH:
 *   - scripts/memory-size-watch.mjs        — watches MEMORY.md file byte size
 *   - scripts/synergy-regression-watch.mjs — week-over-week synergy ratio
 *   - scripts/fleet-reaper-sweep.mjs       — kills orphan processes of crashed slots
 *   - 03-memory-pressure-auto-relief hook  — generic Windows commit-pressure janitor
 * This monitor is the load-bearing 5th: per-LIVE-slot RAM attribution + advisory.
 */

import { spawnSync } from "node:child_process";
import {
  appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ─── Paths & constants ──────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const SHARED_DIR = join(REPO_ROOT, "state", "shared");
const TELEMETRY_PATH = join(SHARED_DIR, "fleet-memory-history.jsonl");
const LEDGER_PATH = join(SHARED_DIR, "fleet-memory-monitor-state.json");
const CHAT_BUS_PATH = join(SHARED_DIR, "AGENT_CHAT.jsonl");
const SLOTS_PATH = join(REPO_ROOT, ".claude", "state", "chat-slots.json");
const SLOTS_PATH_FALLBACK = join(SHARED_DIR, "chat-slots.json");
const PS_WINDOW_PINS_PATH = join(SHARED_DIR, "ps-window-pins.json");
const LOG_ROTATE_BYTES = 512 * 1024;   // 512 KB — ~ a week at 5-min cadence
const TELEMETRY_BACKUP = TELEMETRY_PATH + ".1";

// ─── FLEET-REAPER-MS3/U-FR-MS3-C — per-chat-tree advisory paths + defaults ──
// New advisory layer that fires BEFORE system-wide critical, naming WHICH
// chat tree is bloating. Complementary to the existing decideAdvisory layer
// (which fires on physical/commit system pressure), not redundant.
const CHAT_ADVISORY_LEDGER_PATH = join(SHARED_DIR, ".fleet-memory-chat-advisories.jsonl");
const CHAT_ADVISORY_LEDGER_BACKUP = CHAT_ADVISORY_LEDGER_PATH + ".1";
const CHAT_ADVISORY_LEDGER_ROTATE_BYTES = 1024 * 1024;   // 1 MB cap, then .1 rotation
export const CHAT_ADVISORY_DEFAULT_THRESHOLD_MB = 2048;  // 2 GB default per-chat threshold
export const CHAT_ADVISORY_DEFAULT_COOLDOWN_SEC = 1800;  // 30-min default cooldown
const CHAT_ADVISORY_THRESHOLD_MB_MIN = 256;              // floor — clamp range
const CHAT_ADVISORY_THRESHOLD_MB_MAX = 16384;            // ceiling — 16 GB max threshold
const CHAT_ADVISORY_COOLDOWN_SEC_MIN = 60;               // 1 min floor (sane noise floor)
const CHAT_ADVISORY_COOLDOWN_SEC_MAX = 86400;            // 24 h ceiling (longer = silent)

function _clampIntInRange(v, def, lo, hi) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(lo, Math.min(hi, Math.floor(n)));
}

export const LEDGER_SCHEMA_VERSION = 1;
export const DEFAULT_WARN_PCT = 80;
export const DEFAULT_CRIT_PCT = 92;
export const DEFAULT_ADVISORY_COOLDOWN_SEC = 600;   // 10 min
export const DEFAULT_SUSTAINED_TICKS = 2;            // need 2 warn ticks for advisory
export const DEFAULT_PS_TIMEOUT_MS = 10_000;

// PIDs in this set are the *anchors* whose descendants we attribute to slots.
// Lowercased basenames. We deliberately include both "claude.exe" (the
// harness) and "node.exe" — a slot's heartbeat field carries the harness
// pid (43832 above), so the slot anchor is one of these two depending on
// how the user launched claude. We attribute via ancestor PID match.
const TARGET_PROC_NAMES = new Set([
  "node.exe", "claude.exe", "bash.exe", "git.exe", "pwsh.exe", "powershell.exe",
]);

// ─── PowerShell sampler ─────────────────────────────────────────────────────

/**
 * Sample {os: {physTotalKb, physFreeKb, virtTotalKb, virtFreeKb}, procs: [...]}
 * via one PowerShell invocation. ONE invocation matters — three forks of
 * powershell.exe under fleet pressure is itself a measurable RAM tax.
 *
 * Edge cases:
 *  - PS missing or wedged: 10s timeout, throws → caller exits with code 3.
 *  - CommandLine carries raw C0 control bytes (PS 5.1 ConvertTo-Json does NOT
 *    escape them) → we strip [\x00-\x1F] → space INSIDE PowerShell before
 *    JSON-encoding, per the 2026-05-16b lesson on reaper enumeration blinding.
 *    Lossless for our use (we only need name+pid+parent+RSS, not CommandLine
 *    parsing).
 *  - Process disappears mid-enumeration: PS Get-CimInstance returns the
 *    snapshot atomically; later joining never assumes a PID still exists.
 *
 * @param {{timeoutMs?:number, _spawn?:Function}} [opts]
 * @returns {{os:{physTotalKb:number,physFreeKb:number,virtTotalKb:number,virtFreeKb:number}, procs:Array<{pid:number,ppid:number,name:string,rssBytes:number}>}}
 */
export function samplePowerShell(opts = {}) {
  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs
    : Number(process.env.PRISM_FLEET_MEMMON_PS_TIMEOUT_MS) || DEFAULT_PS_TIMEOUT_MS;
  const spawn = opts._spawn || spawnSync;

  // The script does its own [\x00-\x1F] strip on CommandLine BEFORE the
  // ConvertTo-Json — same defense as the reaper's enumeration. We don't
  // emit CommandLine; the strip is belt-and-suspenders so a future change
  // that adds the field cannot blind us.
  const psScript = `
$ErrorActionPreference = 'Stop'
$os = Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction Stop |
  Select-Object TotalVisibleMemorySize, FreePhysicalMemory, TotalVirtualMemorySize, FreeVirtualMemory
$names = @('node.exe','claude.exe','bash.exe','git.exe','pwsh.exe','powershell.exe')
$procs = Get-CimInstance -ClassName Win32_Process -ErrorAction Stop |
  Where-Object { $names -contains $_.Name } |
  ForEach-Object {
    [PSCustomObject]@{
      pid      = [int64]$_.ProcessId
      ppid     = [int64]$_.ParentProcessId
      name     = [string]$_.Name
      rssBytes = [int64]$_.WorkingSetSize
    }
  }
[PSCustomObject]@{
  os = [PSCustomObject]@{
    physTotalKb = [int64]$os.TotalVisibleMemorySize
    physFreeKb  = [int64]$os.FreePhysicalMemory
    virtTotalKb = [int64]$os.TotalVirtualMemorySize
    virtFreeKb  = [int64]$os.FreeVirtualMemory
  }
  procs = $procs
} | ConvertTo-Json -Depth 4 -Compress
`.trim();

  // Prefer pwsh.exe (PS 7+, faster + better CIM perf); fall back to PowerShell 5.1.
  const psCmd = "powershell.exe";   // 5.1 is universally present on Win10/11
  const res = spawn(psCmd, ["-NoProfile", "-NoLogo", "-NonInteractive", "-Command", psScript], {
    encoding: "utf8", timeout: timeoutMs, windowsHide: true,
  });

  if (res.error) {
    const err = new Error(`fleet-memory-monitor: PowerShell spawn failed: ${res.error.code || res.error.message}`);
    err.cause = res.error;
    throw err;
  }
  if (res.status !== 0) {
    throw new Error(`fleet-memory-monitor: PowerShell exited ${res.status} — stderr: ${(res.stderr || "").slice(0, 400)}`);
  }
  const out = (res.stdout || "").trim();
  if (!out) {
    throw new Error("fleet-memory-monitor: PowerShell returned empty stdout (sample failed silently)");
  }
  let parsed;
  try {
    parsed = JSON.parse(out);
  } catch (e) {
    throw new Error(`fleet-memory-monitor: PowerShell stdout was not JSON: ${(e.message || "parse").slice(0, 200)} — head: ${out.slice(0, 200)}`);
  }
  // PS ConvertTo-Json wraps a single-element array as the element itself
  // (loses array-ness). procs[] under load is multi-element so this is moot
  // in practice, but defend the boundary anyway: a 1-proc shape would have
  // procs as the object, not an array.
  if (parsed && parsed.procs && !Array.isArray(parsed.procs)) parsed.procs = [parsed.procs];
  if (!parsed || !parsed.os || !Array.isArray(parsed.procs)) {
    throw new Error("fleet-memory-monitor: PowerShell payload shape unexpected (missing os/procs)");
  }
  // Drop procs whose name isn't one we asked for — Where-Object already
  // filters, but be defensive on the JS boundary.
  parsed.procs = parsed.procs.filter(p => p && Number.isFinite(p.pid) && TARGET_PROC_NAMES.has((p.name || "").toLowerCase()));
  return parsed;
}

// ─── Chat-tree attribution (PID-stable; slot overlay best-effort) ──────────
//
// CHAT-SLOTS.JSON IS NOT A RELIABLE PROCESS-ANCHOR. The state.pid field is the
// pid of whatever subshell happened to call `chat-slots.mjs claim` — usually a
// bash.exe spawned by the Bash tool that exited seconds later. The
// terminalWindowId encodes a parent shell pid that's similarly ephemeral
// (a fresh PowerShell each session, often recycled by /compact). Neither
// survives long enough to anchor a 5-min monitor.
//
// What IS stable: the **claude.exe** process. Each open chat IS a claude.exe
// (and the harness restart on /compact spawns a NEW claude.exe whose
// descendants are clean — the previous one truly dies). So the chat-tree
// attribution unit is "claude.exe PID + all descendants". 13 chats → 13
// claude.exe processes; if a sweep counts a different number, that's the
// honest live state, not an attribution error.
//
// Slot labels: we still try to overlay them, but ONLY when the live claude.exe
// PID matches a chat-slots state.pid OR when the chain provably reaches a
// recognizable handle. When nothing matches we report by PID — the operator
// knows which window holds which PID. Never INVENT a slot label.
export function readSlotsForAttribution(_io = {}) {
  const readFile = _io.readFileSync || readFileSync;
  const exists = _io.existsSync || existsSync;
  const candidates = [_io.path1 || SLOTS_PATH, _io.path2 || SLOTS_PATH_FALLBACK];
  let text = null;
  for (const p of candidates) {
    try { if (exists(p)) { text = readFile(p, "utf8"); if (text) break; } } catch { /* tolerate, try next */ }
  }
  if (!text) return {};
  let parsed;
  try { parsed = JSON.parse(text); } catch { return {}; }
  // chat-slots.mjs schema: { schemaVersion, slots: { alpha: {...} | null, ... } }
  // OR a flat shape on legacy files. Handle both.
  const slotMap = (parsed && typeof parsed === "object" && parsed.slots && typeof parsed.slots === "object")
    ? parsed.slots : (parsed && typeof parsed === "object" ? parsed : {});
  const out = {};
  for (const [name, state] of Object.entries(slotMap)) {
    if (!state || typeof state !== "object") continue;
    if (!Number.isFinite(state.pid)) continue;
    out[name] = {
      chatId: state.chatId || null,
      pid: state.pid,
      lastHeartbeat: state.lastHeartbeat || null,
      topic: state.topic || null,
      branch: state.branch || null,
    };
  }
  return out;
}

/**
 * Read the PowerShell-window → slot pin map written by chat-slots.mjs U-SDF21
 * via .claude/helpers/ps-window-pin.mjs. The pin keys on the PowerShell ancestor
 * PID — STABLE for the window's life — so it survives the /compact + /clear +
 * crash-respawn boundaries that make slot.pid useless for attribution
 * (slot.pid is the ephemeral subshell that called the claim, which exits
 * seconds later; terminalWindowId tier is similarly per-chat-ephemeral on
 * standalone PowerShell where WT_SESSION is empty).
 *
 * Returns Map<psPidString, slotName>. Empty map when the file is missing /
 * unparseable / has no pins — graceful degradation back to the slot.pid
 * heuristic in attributeProcesses (which keeps the historic tree-PID label
 * for trees the pin map cannot resolve).
 *
 * Pure-ish: takes optional _io for test injection mirroring readSlots-
 * ForAttribution.
 */
export function readPinsForAttribution(_io = {}) {
  const readFile = _io.readFileSync || readFileSync;
  const exists = _io.existsSync || existsSync;
  const path = _io.path || PS_WINDOW_PINS_PATH;
  const out = new Map();
  try {
    if (!exists(path)) return out;
    const text = readFile(path, "utf8");
    if (!text) return out;
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || !parsed.pins || typeof parsed.pins !== "object") return out;
    for (const [psPid, pin] of Object.entries(parsed.pins)) {
      if (!pin || typeof pin !== "object") continue;
      if (typeof pin.slot !== "string" || !pin.slot) continue;
      // Key as string so caller can pass numeric PIDs without coercion mismatch.
      out.set(String(psPid), pin.slot);
    }
  } catch {
    // Fail-soft: a corrupt pins file MUST NOT stall the monitor sweep. The
    // worst case is graceful degradation to the slot.pid heuristic, i.e.
    // today's behavior. Operator sees stale labels, not a crashed monitor.
  }
  return out;
}

/**
 * Walk parent-pid ancestry. Given a process pid + the proc table, return the
 * first ancestor pid that matches any anchorPid in `anchors`. Returns null if
 * the chain exits (orphaned to System) or cycles (defensive: > 32 hops).
 *
 * Pure function — no IO.
 */
export function findAnchorAncestor(pid, procIndex, anchors) {
  if (anchors.size === 0) return null;
  if (anchors.has(pid)) return pid;   // self-anchored (the harness PID itself)
  let cur = pid, hops = 0;
  const seen = new Set();
  while (cur && hops++ < 32) {
    if (seen.has(cur)) return null;   // cycle — defensive
    seen.add(cur);
    const p = procIndex.get(cur);
    if (!p) return null;
    if (anchors.has(p.ppid)) return p.ppid;
    cur = p.ppid;
  }
  return null;
}

/**
 * Walk parent-pid ancestry from startPid looking for the first ancestor whose
 * name matches a shell (powershell.exe / pwsh.exe / cmd.exe). Returns that
 * shell ancestor's PID, or null if none found within `maxHops` (or if the
 * chain cycles / exits to System).
 *
 * Pure function — mirrors findAnchorAncestor's walking shape but with a
 * name-match predicate instead of an anchor-set membership test. Used to
 * bridge each claude.exe (anchor) to its PowerShell window for ps-window-pin
 * lookup. maxHops defaults to 8, matching ps-window-pin.mjs MAX_HOPS so the
 * two walkers cover the same depth.
 */
export function findPsAncestor(startPid, procIndex, maxHops = 8) {
  const SHELLS = new Set(["powershell.exe", "pwsh.exe", "cmd.exe"]);
  let cur = startPid, hops = 0;
  const seen = new Set();
  while (cur && hops++ < maxHops) {
    if (seen.has(cur)) return null;   // cycle — defensive
    seen.add(cur);
    const p = procIndex.get(cur);
    if (!p) return null;
    if (p.ppid && p.ppid > 0) {
      const parent = procIndex.get(p.ppid);
      if (parent && parent.name && SHELLS.has(String(parent.name).toLowerCase())) {
        return p.ppid;
      }
      cur = p.ppid;
    } else {
      return null;
    }
  }
  return null;
}

/**
 * Build chat-tree attribution: each claude.exe is an anchor; every node/git/
 * bash/powershell descendant rolls up into that tree. Procs whose ancestry
 * never reaches a claude.exe are "unowned" (system processes that happened
 * to match the name filter — rare).
 *
 * Pure function — composes findAnchorAncestor across the table.
 *
 * Returns:
 *   {
 *     perTree: {
 *       "tree-46816": {anchorPid, anchorRssBytes, rssBytes, count, procs:[pid,...], slotLabel?},
 *       ...
 *     },
 *     unowned: {rssBytes, count, procs:[pid,...]}
 *   }
 *
 * @param {Array<{pid:number,ppid:number,name:string,rssBytes:number}>} procs
 * @param {Record<string,{pid:number}>=} slots  optional — when a slot.pid matches a claude.exe pid, the tree carries its name
 * @param {Map<string,string>=} pins  optional — PowerShell-PID → slot map from
 *   ps-window-pins.json (written by chat-slots.mjs U-SDF21 via ps-window-pin.mjs).
 *   Resolves slot → claude.exe via the STABLE PS-window ancestry — the only
 *   anchor that survives /compact + /clear + crash-respawn. Empty Map (default)
 *   is graceful degradation to the slot.pid heuristic — the historic
 *   tree-<PID> label pattern.
 */
export function attributeProcesses(procs, slots = {}, pins = new Map()) {
  // Anchor set: every live claude.exe.
  const anchorByPid = new Map();
  for (const p of procs) {
    if ((p.name || "").toLowerCase() === "claude.exe") {
      anchorByPid.set(p.pid, { anchorRssBytes: p.rssBytes });
    }
  }
  const anchorSet = new Set(anchorByPid.keys());
  const procIndex = new Map(procs.map(p => [p.pid, p]));

  // PASS 1 — slot label overlay via slot.pid heuristic (legacy + cheap).
  // The slot.pid is USUALLY stale (it's the ephemeral subshell that called
  // chat-slots.claim, which exits seconds later), but when it happens to land
  // on a live claude.exe we use the slot's name. Kept for back-compat and as
  // a fast-path that doesn't need the pins file.
  const slotLabelByPid = new Map();
  for (const [name, s] of Object.entries(slots || {})) {
    if (Number.isFinite(s.pid) && anchorByPid.has(s.pid)) {
      slotLabelByPid.set(s.pid, name);
    }
  }

  // PASS 2 — slotLabel:null deep-fix via ps-window-pin map. This is the
  // primary path that finally makes attribution reliable across /compact /
  // /clear / crash-respawn — each claude.exe walks UP to its PowerShell
  // window ancestor (stable for the window's life), the pin map says which
  // slot owns that window. Closes the bug surfaced 2026-05-17 by golf
  // claude-339c8ff7 (the 16h of "tree-<PID>" advisories that meant Build B
  // of FLEET-TASK-HEALTH-MS0 was silently no-op fleet-wide). Pass 1 wins on
  // ties so a slot that just claimed and HAPPENED to land on a live claude.
  // exe pid keeps that label (newest signal wins over the persistent pin).
  if (pins && pins.size > 0) {
    for (const claudePid of anchorSet) {
      if (slotLabelByPid.has(claudePid)) continue;  // pass-1 already labeled
      const psPid = findPsAncestor(claudePid, procIndex);
      if (psPid === null) continue;
      const slot = pins.get(String(psPid));
      if (slot) slotLabelByPid.set(claudePid, slot);
    }
  }

  /** @type {Record<string,{anchorPid:number,anchorRssBytes:number,rssBytes:number,count:number,procs:number[],slotLabel:string|null}>} */
  const perTree = {};
  const unowned = { rssBytes: 0, count: 0, procs: [] };

  // Initialize a bucket per claude.exe — even an idle claude.exe with no
  // children should appear (the harness itself is 700-900MB of pressure).
  for (const anchorPid of anchorSet) {
    perTree[`tree-${anchorPid}`] = {
      anchorPid,
      anchorRssBytes: anchorByPid.get(anchorPid).anchorRssBytes,
      rssBytes: 0,        // accumulator across self+descendants
      count: 0,
      procs: [],
      slotLabel: slotLabelByPid.get(anchorPid) || null,
    };
  }

  for (const p of procs) {
    const anchorPid = findAnchorAncestor(p.pid, procIndex, anchorSet);
    if (anchorPid !== null) {
      const bucket = perTree[`tree-${anchorPid}`];
      bucket.rssBytes += p.rssBytes;
      bucket.count += 1;
      bucket.procs.push(p.pid);
    } else {
      unowned.rssBytes += p.rssBytes;
      unowned.count += 1;
      unowned.procs.push(p.pid);
    }
  }
  return { perTree, unowned };
}

// ─── FLEET-REAPER-MS3/U-FR-MS3-C — per-chat advisory ledger & evaluator ────

/**
 * Read the per-chat advisory ledger (JSONL, one sweep record per line).
 * Returns array of `{tsMs, ts, keysOver[], emitted[]}` — fail-soft on missing
 * file or malformed lines (skipped, valid lines kept).
 */
export function readChatAdvisoryLedger(path = CHAT_ADVISORY_LEDGER_PATH, _io = {}) {
  const exists = _io.existsSync || existsSync;
  const read = _io.readFileSync || readFileSync;
  if (!exists(path)) return [];
  try {
    const text = read(path, "utf8");
    return text.split(/\r?\n/).filter(Boolean).map(l => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}

/**
 * Append a sweep record to the per-chat advisory ledger. Rotates at
 * `CHAT_ADVISORY_LEDGER_ROTATE_BYTES` (1 MB) by renaming the active file to
 * `.1`. Best-effort — any I/O failure is swallowed (the monitor must never
 * crash because its audit log can't be written).
 */
export function appendChatAdvisorySweepRecord(record, path = CHAT_ADVISORY_LEDGER_PATH) {
  try {
    mkdirSync(dirname(path), { recursive: true });
    if (existsSync(path)) {
      const sz = statSync(path).size;
      if (sz > CHAT_ADVISORY_LEDGER_ROTATE_BYTES) {
        // Rotate: rename active → .1; next append starts a fresh file.
        try { renameSync(path, CHAT_ADVISORY_LEDGER_BACKUP); } catch { /* best-effort */ }
      }
    }
    appendFileSync(path, JSON.stringify(record) + "\n", "utf8");
  } catch { /* best-effort — never throw out of the audit-log writer */ }
}

/**
 * Pure decision: which chat trees should receive a per-chat advisory right now?
 *
 * Cooldown rule: at most one advisory per (key, "per-chat-threshold") per
 * cooldownSec. Key = `slotLabel` if known, else `tree-<anchorPid>` (matches
 * MS1 graceful degradation).
 *
 * Cooldown CLEARS on drop+resume: if a key was emitted, then dropped below
 * threshold (an intermediate sweep's `keysOver` did NOT contain the key),
 * then bloated again, a fresh advisory fires immediately (no cooldown).
 * Encoded in `reason: "drop-clear"` on the emitted advisory.
 *
 * @param {Record<string, {anchorPid:number, rssBytes:number, slotLabel:string|null}>} perTree
 * @param {object} [opts]
 * @param {number} [opts.nowMs]
 * @param {Record<string,string>} [opts.env]
 * @param {Array<object>} [opts.ledger]   prior sweep records (see readChatAdvisoryLedger)
 * @returns {{advisories:Array<object>, sweepRecord:object, disabled:boolean, thresholdMb:number, cooldownSec:number}}
 */
export function evaluateChatTreeAdvisories(perTree, opts = {}) {
  const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const env = opts.env || process.env;
  const disabled = env.PRISM_FM_CHAT_ADVISORY_DISABLE === "1";
  const thresholdMb = _clampIntInRange(
    env.PRISM_FM_CHAT_THRESHOLD_MB,
    CHAT_ADVISORY_DEFAULT_THRESHOLD_MB,
    CHAT_ADVISORY_THRESHOLD_MB_MIN,
    CHAT_ADVISORY_THRESHOLD_MB_MAX,
  );
  const cooldownSec = _clampIntInRange(
    env.PRISM_FM_CHAT_ADVISORY_COOLDOWN_SEC,
    CHAT_ADVISORY_DEFAULT_COOLDOWN_SEC,
    CHAT_ADVISORY_COOLDOWN_SEC_MIN,
    CHAT_ADVISORY_COOLDOWN_SEC_MAX,
  );
  const cooldownMs = cooldownSec * 1000;
  const thresholdBytes = thresholdMb * 1024 * 1024;
  const ledger = Array.isArray(opts.ledger) ? opts.ledger : [];

  // Identify the trees currently over threshold.
  const currentOverKeys = [];
  const treesByKey = new Map();
  for (const [treeKey, tree] of Object.entries(perTree || {})) {
    if (!tree || !Number.isFinite(tree.rssBytes)) continue;
    if (tree.rssBytes <= thresholdBytes) continue;
    const key = tree.slotLabel || treeKey;
    currentOverKeys.push(key);
    treesByKey.set(key, { treeKey, tree });
  }

  const advisories = [];
  if (!disabled) {
    for (const key of currentOverKeys) {
      // Walk the ledger forward to find the most recent advise for this key
      // AND whether any intermediate sweep registered a drop (key not in
      // keysOver after the most-recent emission). This is the "clear on drop"
      // semantic from the spec — re-bloat fires a fresh advisory even within
      // the cooldown window.
      let lastAdviseMs = -Infinity;
      let droppedSinceLastAdvise = false;
      for (const e of ledger) {
        if (!e || !Number.isFinite(e.tsMs)) continue;
        const emitted = Array.isArray(e.emitted) ? e.emitted : [];
        const keysOver = Array.isArray(e.keysOver) ? e.keysOver : [];
        if (emitted.includes(key)) {
          lastAdviseMs = e.tsMs;
          droppedSinceLastAdvise = false; // reset after each fresh emission
        } else if (lastAdviseMs > -Infinity && !keysOver.includes(key)) {
          droppedSinceLastAdvise = true;
        }
      }
      const inCooldown = lastAdviseMs > -Infinity && (nowMs - lastAdviseMs) < cooldownMs;
      const shouldEmit = !inCooldown || droppedSinceLastAdvise;
      if (!shouldEmit) continue;

      const { treeKey, tree } = treesByKey.get(key);
      const rssBytes = tree.rssBytes;
      const rssGb = (rssBytes / 1024 / 1024 / 1024).toFixed(2);
      const thresholdGb = (thresholdMb / 1024).toFixed(2);
      advisories.push({
        key,
        slot: tree.slotLabel || null,
        treeKey,
        anchorPid: tree.anchorPid,
        rssBytes,
        rssMb: Math.round(rssBytes / 1024 / 1024),
        thresholdMb,
        tsMs: nowMs,
        ts: new Date(nowMs).toISOString(),
        body: `This chat's claude.exe tree is at ${rssGb} GB (threshold ${thresholdGb} GB). Consider /compact to reclaim RAM before fleet-wide critical.`,
        reason: (droppedSinceLastAdvise && inCooldown) ? "drop-clear" : "fresh",
      });
    }
  }

  const sweepRecord = {
    tsMs: nowMs,
    ts: new Date(nowMs).toISOString(),
    keysOver: currentOverKeys,
    emitted: advisories.map(a => a.key),
  };

  return { advisories, sweepRecord, disabled, thresholdMb, cooldownSec };
}

// ─── Decision logic ─────────────────────────────────────────────────────────

/**
 * Decide level from physical + commit pressure. The worst of the two wins —
 * commit pressure causes hard chat-death on Windows even when physical is
 * available (commit budget exhaustion).
 *
 * @param {{physUsedPct:number, commitUsedPct:number}} pressure
 * @param {{warnPct:number, critPct:number}} thresh
 * @returns {"clean"|"warn"|"critical"}
 */
export function decideLevel(pressure, thresh) {
  const worst = Math.max(pressure.physUsedPct, pressure.commitUsedPct);
  if (worst >= thresh.critPct) return "critical";
  if (worst >= thresh.warnPct) return "warn";
  return "clean";
}

/**
 * Pick the largest chat tree by total RSS. Returns null when no claude.exe
 * is running.
 */
export function pickLargestSlot(perTree) {
  const entries = Object.entries(perTree);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1].rssBytes - a[1].rssBytes);
  const [key, agg] = entries[0];
  return {
    slot: agg.slotLabel || key,   // slot name when known, "tree-PID" otherwise
    anchorPid: agg.anchorPid,
    rssBytes: agg.rssBytes,
    count: agg.count,
  };
}

// ─── Ledger (sustained-tick tracking + advisory cooldown) ───────────────────

function readLedger(path = LEDGER_PATH) {
  try {
    if (!existsSync(path)) return { schemaVersion: LEDGER_SCHEMA_VERSION, warnTicks: 0, lastAdvisoryAt: null, lastLevel: null };
    const j = JSON.parse(readFileSync(path, "utf8"));
    if (!j || typeof j !== "object") throw new Error("malformed ledger");
    return {
      schemaVersion: j.schemaVersion || LEDGER_SCHEMA_VERSION,
      warnTicks: Number.isFinite(j.warnTicks) ? j.warnTicks : 0,
      lastAdvisoryAt: j.lastAdvisoryAt || null,
      lastLevel: j.lastLevel || null,
    };
  } catch {
    return { schemaVersion: LEDGER_SCHEMA_VERSION, warnTicks: 0, lastAdvisoryAt: null, lastLevel: null };
  }
}

function writeLedger(state, path = LEDGER_PATH) {
  const tmp = path + ".tmp." + process.pid;
  try { mkdirSync(dirname(path), { recursive: true }); } catch { /* ignore */ }
  writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  renameSync(tmp, path);
}

/**
 * Throttle decision: should we emit an AGENT_CHAT advisory now?
 *   - critical → emit if cooldown elapsed
 *   - warn     → emit ONLY if sustained N consecutive ticks AND cooldown elapsed
 *   - clean    → never emit
 *
 * Returns { emit:boolean, newLedger:object, reason:string }.
 * Pure function — caller persists newLedger.
 */
export function decideAdvisory(level, ledger, nowMs, cfg) {
  const cooldownMs = cfg.cooldownSec * 1000;
  const lastAt = ledger.lastAdvisoryAt ? Date.parse(ledger.lastAdvisoryAt) : 0;
  const cooled = !lastAt || (nowMs - lastAt) >= cooldownMs;
  const next = { ...ledger, lastLevel: level };

  if (level === "critical") {
    next.warnTicks = 0;
    if (!cooled) return { emit: false, newLedger: next, reason: "cooldown" };
    next.lastAdvisoryAt = new Date(nowMs).toISOString();
    return { emit: true, newLedger: next, reason: "critical" };
  }
  if (level === "warn") {
    next.warnTicks = ledger.warnTicks + 1;
    if (next.warnTicks < cfg.sustainedTicks) return { emit: false, newLedger: next, reason: `sustained ${next.warnTicks}/${cfg.sustainedTicks}` };
    if (!cooled) return { emit: false, newLedger: next, reason: "cooldown" };
    next.lastAdvisoryAt = new Date(nowMs).toISOString();
    return { emit: true, newLedger: next, reason: `sustained ${next.warnTicks}` };
  }
  // clean
  next.warnTicks = 0;
  return { emit: false, newLedger: next, reason: "clean" };
}

// ─── Telemetry append (size-rotated, fail-loud per R12) ─────────────────────

function rotateIfLarge(path = TELEMETRY_PATH, limit = LOG_ROTATE_BYTES) {
  try {
    const st = statSync(path);
    if (st.size >= limit) renameSync(path, TELEMETRY_BACKUP);
  } catch {
    /* missing/inaccessible → write will create it */
  }
}

function appendTelemetry(row, path = TELEMETRY_PATH) {
  try { mkdirSync(dirname(path), { recursive: true }); } catch { /* ignore */ }
  rotateIfLarge(path);
  appendFileSync(path, JSON.stringify(row) + "\n", "utf8");
}

function appendChatBus(record, path = CHAT_BUS_PATH) {
  try { mkdirSync(dirname(path), { recursive: true }); } catch { /* ignore */ }
  appendFileSync(path, JSON.stringify(record) + "\n", "utf8");
}

// ─── Main sweep ─────────────────────────────────────────────────────────────

function fmtBytes(b) {
  if (!Number.isFinite(b) || b <= 0) return "0";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0, v = b;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0) + u[i];
}

function parseFlags(argv) {
  const a = new Set(argv);
  const idx = (flag) => argv.indexOf(flag);
  const valAfter = (flag) => { const i = idx(flag); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null; };
  return {
    once: a.has("--once") || (!a.has("--status") && !a.has("--history") && !a.has("--reset") && !a.has("--help")),
    json: a.has("--json"),
    status: a.has("--status"),
    history: a.has("--history"),
    historyN: Number(valAfter("--history")) > 0 ? Number(valAfter("--history")) : 20,
    reset: a.has("--reset"),
    noAdvisory: a.has("--no-advisory"),
    dryRun: a.has("--dry-run"),
    help: a.has("--help") || a.has("-h"),
  };
}

const HELP = `fleet-memory-monitor.mjs — durable system-RAM + per-slot memory monitor.

Usage:
  node fleet-memory-monitor.mjs                # one sample, text summary
  node fleet-memory-monitor.mjs --once --json  # one sample, JSON
  node fleet-memory-monitor.mjs --status       # read-only ledger summary
  node fleet-memory-monitor.mjs --history [N]  # tail N telemetry rows (default 20)
  node fleet-memory-monitor.mjs --reset        # clear telemetry + ledger
  node fleet-memory-monitor.mjs --no-advisory  # sample + telemetry only
  node fleet-memory-monitor.mjs --dry-run      # full sample, no writes
  node fleet-memory-monitor.mjs --help

Knobs: see file header.
Exit: 0 clean · 1 warn · 2 critical · 3 measurement/IO failure.`;

export function runOnce(opts = {}) {
  const disabled = process.env.PRISM_FLEET_MEMMON_DISABLE === "1";
  const warnPct = Number(process.env.PRISM_FLEET_MEMMON_WARN_PCT) || DEFAULT_WARN_PCT;
  const critPct = Number(process.env.PRISM_FLEET_MEMMON_CRIT_PCT) || DEFAULT_CRIT_PCT;
  const cooldownSec = Number(process.env.PRISM_FLEET_MEMMON_ADVISORY_COOLDOWN_SEC) || DEFAULT_ADVISORY_COOLDOWN_SEC;
  const sustainedTicks = Number(process.env.PRISM_FLEET_MEMMON_SUSTAINED_TICKS) || DEFAULT_SUSTAINED_TICKS;
  const cfg = { warnPct, critPct, cooldownSec, sustainedTicks };
  const dryRun = !!opts.dryRun || disabled;
  const noAdvisory = !!opts.noAdvisory;

  const sample = (opts.sampler || samplePowerShell)({ timeoutMs: opts.timeoutMs });
  const slots = (opts.readSlots || readSlotsForAttribution)();
  const pins = (opts.readPins || readPinsForAttribution)();
  const attribution = attributeProcesses(sample.procs, slots, pins);
  const liveTrees = Object.keys(attribution.perTree).length;

  const physTotalBytes = sample.os.physTotalKb * 1024;
  const physFreeBytes = sample.os.physFreeKb * 1024;
  const physUsedBytes = Math.max(0, physTotalBytes - physFreeBytes);
  const physUsedPct = physTotalBytes > 0 ? (physUsedBytes / physTotalBytes) * 100 : 0;

  const virtTotalBytes = sample.os.virtTotalKb * 1024;
  const virtFreeBytes = sample.os.virtFreeKb * 1024;
  const commitUsedBytes = Math.max(0, virtTotalBytes - virtFreeBytes);
  const commitUsedPct = virtTotalBytes > 0 ? (commitUsedBytes / virtTotalBytes) * 100 : 0;

  const level = decideLevel({ physUsedPct, commitUsedPct }, cfg);
  const largest = pickLargestSlot(attribution.perTree);

  const ts = new Date().toISOString();
  const row = {
    ts,
    level,
    physUsedPct: +physUsedPct.toFixed(2),
    commitUsedPct: +commitUsedPct.toFixed(2),
    physTotalBytes, physUsedBytes, virtTotalBytes, commitUsedBytes,
    liveChatTrees: liveTrees,
    largestTree: largest ? largest.slot : null,
    largestTreePid: largest ? largest.anchorPid : null,
    largestRssBytes: largest ? largest.rssBytes : 0,
    perTree: Object.fromEntries(Object.entries(attribution.perTree).map(([key, v]) => [key, {
      anchorPid: v.anchorPid, rssBytes: v.rssBytes, count: v.count, slotLabel: v.slotLabel,
    }])),
    unownedRssBytes: attribution.unowned.rssBytes,
    unownedCount: attribution.unowned.count,
  };

  // Throttle + advisory decision (pure)
  const ledger = readLedger();
  const nowMs = Date.parse(ts);
  const adv = decideAdvisory(level, ledger, nowMs, cfg);

  // FLEET-REAPER-MS3/U-FR-MS3-C — per-chat-tree advisory (complementary to
  // the system-wide advisory above). Fires when a SINGLE chat's tree exceeds
  // the per-chat threshold (default 2 GB) BEFORE system-wide critical,
  // naming WHICH slot to /compact. Pure-injected for testing.
  const chatAdvLedger = (opts.readChatAdvLedger || readChatAdvisoryLedger)();
  const chatAdv = evaluateChatTreeAdvisories(attribution.perTree, {
    ledger: chatAdvLedger,
    nowMs,
    env: process.env,
  });

  let writes = { telemetry: false, ledger: false, advisory: false, chatAdvisories: 0 };
  if (!dryRun) {
    appendTelemetry(row);
    writes.telemetry = true;
    writeLedger(adv.newLedger);
    writes.ledger = true;
    if (adv.emit && !noAdvisory) {
      const target = largest
        ? `${largest.slot} (PID ${largest.anchorPid}, ${fmtBytes(largest.rssBytes)} tree)`
        : "(no live chat trees)";
      const msg = level === "critical"
        ? `system memory pressure CRITICAL (phys ${physUsedPct.toFixed(1)}% / commit ${commitUsedPct.toFixed(1)}%, ${liveTrees} chat trees) — recommend /compact on ${target}`
        : `system memory pressure WARN sustained ${adv.newLedger.warnTicks} ticks (phys ${physUsedPct.toFixed(1)}% / commit ${commitUsedPct.toFixed(1)}%, ${liveTrees} chat trees) — consider /compact on ${target}`;
      appendChatBus({
        ts, from: "fleet-memory-monitor", kind: "memory-pressure", level,
        physUsedPct: row.physUsedPct, commitUsedPct: row.commitUsedPct,
        largestTree: row.largestTree, largestTreePid: row.largestTreePid,
        largestRssBytes: row.largestRssBytes,
        liveChatTrees: liveTrees,
        sustainedTicks: adv.newLedger.warnTicks,
        message: msg,
      });
      writes.advisory = true;
    }

    // FLEET-REAPER-MS3/U-FR-MS3-C — emit per-chat advisories (independent of
    // system-wide advisory above). Always append the sweep record when there
    // is any over-threshold activity now OR in history — needed so the next
    // sweep's drop-detection sees the transitions. The audit log is bounded
    // by `CHAT_ADVISORY_LEDGER_ROTATE_BYTES`.
    const hasChatActivity = chatAdv.sweepRecord.keysOver.length > 0
      || chatAdv.sweepRecord.emitted.length > 0
      || chatAdvLedger.length > 0;
    if (hasChatActivity && !noAdvisory) {
      appendChatAdvisorySweepRecord(chatAdv.sweepRecord);
    }
    for (const a of chatAdv.advisories) {
      if (noAdvisory) break;
      appendChatBus({
        ts: a.ts,
        from: "fleet-memory-monitor",
        to: a.slot || a.treeKey,
        kind: "per-chat-advisory",
        subject: "per-chat memory threshold",
        body: a.body,
        slot: a.slot,
        treeKey: a.treeKey,
        anchorPid: a.anchorPid,
        rssBytes: a.rssBytes,
        thresholdMb: a.thresholdMb,
        reason: a.reason,
      });
      writes.chatAdvisories += 1;
    }
  }

  const exitCode = level === "critical" ? 2 : level === "warn" ? 1 : 0;
  return { row, level, advisory: adv, chatAdv, writes, exitCode, cfg, dryRun, disabled };
}

function fmtSummary(r) {
  const tag = r.level === "critical" ? "[CRIT]" : r.level === "warn" ? "[WARN]" : "[OK]";
  const top3 = Object.entries(r.row.perTree)
    .sort((a, b) => b[1].rssBytes - a[1].rssBytes).slice(0, 3)
    .map(([, v]) => `${v.slotLabel || `PID${v.anchorPid}`}=${fmtBytes(v.rssBytes)}`).join(" ");
  const advNote = r.writes.advisory ? " advisory-emitted"
    : r.advisory.emit ? " advisory-suppressed(no-advisory)"
    : r.level !== "clean" ? ` advisory-skipped(${r.advisory.reason})` : "";
  const dry = r.dryRun ? " [dry-run]" : "";
  return `${tag} fleet-memory-monitor: phys ${r.row.physUsedPct.toFixed(1)}% (${fmtBytes(r.row.physUsedBytes)}/${fmtBytes(r.row.physTotalBytes)}) · commit ${r.row.commitUsedPct.toFixed(1)}% (${fmtBytes(r.row.commitUsedBytes)}/${fmtBytes(r.row.virtTotalBytes)}) · ${r.row.liveChatTrees} chat trees${top3 ? ` (top: ${top3})` : ""}${advNote}${dry}`;
}

function cmdStatus() {
  const ledger = readLedger();
  let lastRow = null;
  try {
    if (existsSync(TELEMETRY_PATH)) {
      const txt = readFileSync(TELEMETRY_PATH, "utf8");
      const lines = txt.trim().split(/\r?\n/);
      const last = lines[lines.length - 1];
      if (last) lastRow = JSON.parse(last);
    }
  } catch { /* tolerate */ }
  return { ledger, lastRow };
}

function cmdHistory(n) {
  if (!existsSync(TELEMETRY_PATH)) return [];
  const txt = readFileSync(TELEMETRY_PATH, "utf8");
  const lines = txt.trim().split(/\r?\n/).filter(Boolean);
  return lines.slice(-n).map(line => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);
}

function cmdReset() {
  for (const p of [TELEMETRY_PATH, TELEMETRY_BACKUP, LEDGER_PATH]) {
    try { if (existsSync(p)) renameSync(p, p + ".reset-" + Date.now()); } catch { /* ignore */ }
  }
}

// ─── CLI entry ──────────────────────────────────────────────────────────────

function main() {
  const flags = parseFlags(process.argv.slice(2));
  if (flags.help) { console.log(HELP); process.exit(0); }

  if (flags.reset) { cmdReset(); console.log("fleet-memory-monitor: telemetry + ledger reset"); process.exit(0); }

  if (flags.status) {
    const s = cmdStatus();
    if (flags.json) { console.log(JSON.stringify(s, null, 2)); process.exit(0); }
    if (!s.lastRow) { console.log("fleet-memory-monitor: no telemetry yet"); process.exit(0); }
    console.log(`fleet-memory-monitor [status] last sample ${s.lastRow.ts} level=${s.lastRow.level} phys=${s.lastRow.physUsedPct}% commit=${s.lastRow.commitUsedPct}% warnTicks=${s.ledger.warnTicks} lastAdvisory=${s.ledger.lastAdvisoryAt || "never"}`);
    process.exit(0);
  }

  if (flags.history) {
    const rows = cmdHistory(flags.historyN);
    if (flags.json) { console.log(JSON.stringify(rows, null, 2)); process.exit(0); }
    for (const r of rows) console.log(`${r.ts} ${r.level.padEnd(8)} phys=${String(r.physUsedPct).padStart(5)}% commit=${String(r.commitUsedPct).padStart(5)}% largest=${r.largestTree || "-"}(${fmtBytes(r.largestRssBytes)}) trees=${r.liveChatTrees}`);
    process.exit(0);
  }

  // --once / default
  let result;
  try {
    result = runOnce({ dryRun: flags.dryRun, noAdvisory: flags.noAdvisory });
  } catch (e) {
    if (flags.json) console.log(JSON.stringify({ ok: false, error: e.message, code: 3 }));
    else console.error(`[FAIL] fleet-memory-monitor: ${e.message}`);
    process.exit(3);
  }
  if (flags.json) console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  else console.log(fmtSummary(result));
  process.exit(result.exitCode);
}

// Run main only when invoked as a script (not when imported by tests).
const invokedAsScript = (() => {
  try {
    return process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
  } catch { return false; }
})();
if (invokedAsScript) {
  try { main(); }
  catch (e) { console.error(`[FAIL] fleet-memory-monitor: ${e.message}`); process.exit(3); }
}
