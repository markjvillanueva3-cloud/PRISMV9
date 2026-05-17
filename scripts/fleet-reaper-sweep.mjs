// NOTE: no shebang. This file IS run as a CLI (--once / --monitor-loop / etc.)
// but ALL its invocations go through explicit `node X.mjs` (the scheduled task,
// the Stop-hook arm, the /fleet-reaper skill, the alpha-guardian) — never via
// chmod+x + `./X.mjs` direct execution. A line-1 `#!` is fine for node + esbuild
// + bash but vite's SSR transform does NOT strip it; it injects its preamble
// above, stranding `#!` mid-file and breaking the whole .claude/helpers/*.test.mjs
// vitest suite. Removing the vestigial shebang is the cleanest fix.
/**
 * fleet-reaper-sweep.mjs — slot-aware orphan process reaper for the 7-chat fleet.
 *
 * PRISM runs up to 7 concurrent Claude chats (alpha..foxtrot + golf). Each chat
 * spawns node.exe (hooks/helpers/MCP), bash.exe (the Bash tool), and git.exe
 * children. When a chat crashes or is closed WITHOUT firing its Stop hooks those
 * children are orphaned — they pin RAM and, across several dead chats, cause the
 * commit-memory pressure that destabilizes the surviving live chats.
 *
 * This is the slot-aware layer the existing generic reapers
 * (node-process-janitor, cleanup-orchestrator + 5 sub-cleaners) lack: it maps
 * every running node/git/bash PID to its owning chat slot via process ancestry
 * (process-slot-map.mjs) and reaps only those whose owning slot is provably dead
 * — gated by a confirm-after-N-ticks rule so a brief heartbeat gap never kills a
 * live chat's process.
 *
 * It does NOT re-run the generic lock/claim/bash cleaners — those stay with the
 * existing "PRISM Cleanup Orchestrator" scheduled task. This one owns exactly
 * the slot-attributed orphan layer.
 *
 * Kill gate (all must hold):
 *   - classifyProcess() returned `owned-by-crashed` or `unowned` (a reap CANDIDATE)
 *   - the process is older than the age floor (default 45s — never touch a
 *     just-spawned process whose slot hasn't heartbeated yet)
 *   - it has been continuously a candidate for >= killAfter * interval of
 *     wall-clock (default 2 * 300s = 10 min) — the "confirm-after-N-ticks" rule.
 *     Tracked by `firstSeenAt` in the candidate ledger, NOT a counter, so the
 *     gate is correct even when the Monitor + scheduled task + Stop hook all
 *     sweep independently. firstSeenAt resets the moment a PID stops being a
 *     candidate (its slot came back alive).
 *   - graduated memory pressure: >= memPressurePct drops the confirm window to
 *     one tick; >= memCriticalPct collapses it to zero (reap this sweep) —
 *     relieve faster when the box is actually struggling.
 *
 * Usage:
 *   node fleet-reaper-sweep.mjs                       # one sweep, text summary
 *   node fleet-reaper-sweep.mjs --once --json         # one sweep, JSON
 *   node fleet-reaper-sweep.mjs --status              # report only, no write/reap
 *   node fleet-reaper-sweep.mjs --dry-run             # classify + decide, never kill
 *   node fleet-reaper-sweep.mjs --monitor-loop        # poll forever (Monitor tool / loop)
 *   node fleet-reaper-sweep.mjs --monitor-loop --interval 300
 *   node fleet-reaper-sweep.mjs --once --stop-event   # invoked by the Stop hook
 *   Flags: --kill-after N  --age-floor SEC  --interval SEC  --help
 *
 * Env knobs (CLI flags win over env):
 *   PRISM_FLEET_REAPER_DISABLE=1          sweep refuses to kill anything
 *   PRISM_FLEET_REAPER_DRY_RUN=1          same as --dry-run
 *   PRISM_FLEET_REAPER_KILL_AFTER=N       default 2
 *   PRISM_FLEET_REAPER_AGE_FLOOR_SEC=N    default 45
 *   PRISM_FLEET_REAPER_INTERVAL_SEC=N     default 300
 *   PRISM_FLEET_REAPER_MEM_PRESSURE_PCT=N default 90
 *   PRISM_FLEET_REAPER_MEM_CRITICAL_PCT=N default 95
 *
 * Exit codes: 0 ok · 1 sweep completed but reported a problem · 2 misuse.
 */

import { execFileSync, spawn } from "node:child_process";
import {
  appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync,
  unlinkSync, writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

import { snapshotFleet } from "../.claude/helpers/process-slot-map.mjs";
// Shared Ollama telemetry writer — best-effort, never throws (see its header).
// Sibling helper, ships together, no side effects on import. The coordinator
// records prewarm/hint decisions here so `/ollama-offload-dashboard` captures
// FLEET-REAPER-MS1 actions for free. Injectable via `opts.recordEvent` in tests.
// NOTE: `ollama-stats.mjs` hardcodes its stats path to the MAIN repo tree
// (`H:/prism/mcp-server/data/state/ollama-offload-stats.json`) — BY DESIGN. The
// offload dashboard is fleet-wide; a sweep running from a per-slot worktree
// still reports into the one canonical dashboard, not a worktree-local copy.
// Do not "fix" this to a worktree-relative path.
import { recordOllamaEvent } from "../.claude/hooks/lib/ollama-stats.mjs";

// ─── Paths & constants ──────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const SHARED_DIR = join(REPO_ROOT, "state", "shared");
const DEFAULT_LEDGER_PATH = join(SHARED_DIR, "fleet-reaper-candidates.json");
const DEFAULT_LOG_PATH = join(SHARED_DIR, "fleet-reaper.log");
// Append-only forensic trail for FLEET-REAPER-MS1 soft-relief actions. A
// DEDICATED file — deliberately NOT node-process-janitor.mjs's
// `.janitor-kills.jsonl`: that file is a *kills* log and every consumer reads
// it as such, so mixing non-kill events (priority demote, working-set trim)
// into it would corrupt the semantics. Record shape mirrors the janitor's
// `{ts,pid,ppid,name,reason}` core so a forensic parser can read both with one
// schema, plus `ownerSlot` + `rssReclaimedBytes` extras.
const DEFAULT_AUDIT_LOG_PATH = join(SHARED_DIR, ".fleet-reaper-actions.jsonl");
// TTL'd routing hint written by the Ollama coordinator, read by
// .claude/hooks/ollama-task-offloader.mjs. See knowledge/wiki/architecture/
// ollama-routing-hint.md for the full contract.
//
// Deliberately a FIXED absolute path — NOT SHARED_DIR-relative like the ledger
// / log / audit files above. Those are producer-private (this sweep reads its
// own ledger). The hint is a CROSS-PROCESS contract: the consumer is a hook
// (`ollama-task-offloader.mjs`) pinned to the main tree (`H:/prism`), so the
// producer and consumer MUST agree on one canonical location regardless of
// which worktree the sweep itself runs from. The consumer hardcodes the
// identical literal — keep the two in sync.
const DEFAULT_HINT_PATH = "H:/prism/state/shared/.ollama-routing-hint.json";
const LOG_ROTATE_BYTES = 256 * 1024;

export const LEDGER_SCHEMA_VERSION = 1;
export const DEFAULT_INTERVAL_SEC = 300;
export const DEFAULT_AGE_FLOOR_SEC = 45;
export const DEFAULT_KILL_AFTER = 2;
export const DEFAULT_MEM_PRESSURE_PCT = 90;
// FLEET-REAPER-MS1 Tier 1: a second, higher band above the warn pressure %.
// warn band (>= MEM_PRESSURE_PCT) drops the confirm window to one tick;
// critical band (>= MEM_CRITICAL_PCT) collapses it to zero — a candidate that
// is still a candidate at a critical-pressure sweep is reaped THIS tick rather
// than after another interval. Knob: PRISM_FLEET_REAPER_MEM_CRITICAL_PCT.
export const DEFAULT_MEM_CRITICAL_PCT = 95;

// ── FLEET-REAPER-MS1 Layer 1: soft RAM/CPU relief ──
// Under memory pressure, processes owned by STALE chat slots (no heartbeat in
// 2-10 min — see process-slot-map.mjs) get a reversible nudge: CPU priority
// dropped to BelowNormal + working set trimmed. Neither is a kill — Windows
// re-pages on demand and a slot that revives just re-raises its own priority.
export const DEFAULT_SOFT_RELIEF_AGE_SEC = 180; // min process age before a nudge
export const DEFAULT_SOFT_RELIEF_PRESSURE_PCT = 90; // mem% gate (mirrors mem-pressure)
const MAX_SOFT_RELIEF_AGE_SEC = 86400;

// ── FLEET-REAPER-MS1 Layer 2/3: GPU + Ollama coordinator ──
// The RTX-class GPU sits near-idle while commit memory is critical. When the
// box is under pressure AND the GPU has headroom AND Ollama is reachable, the
// coordinator pre-warms a local model and writes a routing hint that nudges
// ollama-task-offloader.mjs to absorb more hook-eligible work — converting
// idle VRAM into Claude-CLI throughput instead of adding more kills.
export const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
export const DEFAULT_OLLAMA_PREWARM_MODEL = "qwen2.5-coder:7b";
export const DEFAULT_OLLAMA_KEEP_ALIVE = "10m";
export const DEFAULT_HINT_TTL_SEC = 300;          // hint validity == one sweep interval
export const DEFAULT_GPU_FREE_MIN_MB = 2048;      // GPU headroom floor to act
export const DEFAULT_HINT_THRESHOLD_DELTA = 0.15; // magnitude; applied negatively
export const HINT_SCHEMA_VERSION = 1;
const HINT_THRESHOLD_DELTA_CAP = 0.30;            // hard clamp on |thresholdDelta|
const MAX_HINT_TTL_SEC = 3600;
const PROBE_TIMEOUT_MS = 4000;       // curl / nvidia-smi probe ceiling
const PROBE_TIMEOUT_SEC = 3;         // curl -m value (kept under PROBE_TIMEOUT_MS)
const PROBE_MAX_BUFFER = 4 * 1024 * 1024;
// Prewarm POST is detached + unref'd (never blocks the sweep) but still gets a
// curl max-time so a wedged Ollama can't leave the detached curl alive forever.
// Larger than PROBE_TIMEOUT_SEC: a cold model load is genuinely slow.
const PREWARM_CURL_TIMEOUT_SEC = 30;

const LEDGER_LOCK_TIMEOUT_MS = 3000;
const PS_TIMEOUT_MS = 10000;
const PS_MAX_BUFFER = 64 * 1024 * 1024; // stdout ceiling for PowerShell forks
const MIN_INTERVAL_SEC = 30;     // floor — a tighter loop just churns PowerShell
const MAX_INTERVAL_SEC = 3600;   // ceiling — an hour between sweeps is the useful max
const MAX_AGE_FLOOR_SEC = 86400; // 24h — an age floor beyond a day is nonsensical
const MAX_KILL_AFTER = 100;      // confirm-tick ceiling — beyond this is effectively "never"
const LOCK_RETRY_MIN_MS = 40;    // ledger-lock retry backoff floor
const LOCK_RETRY_JITTER_MS = 60; // ledger-lock retry backoff jitter

// ─── PowerShell resolution (trivial path-picker; mirrors process-slot-map.mjs) ──

function resolvePowershell() {
  const abs = "C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe";
  try { if (existsSync(abs)) return abs; } catch { /* fall through */ }
  return "powershell.exe";
}

// ─── Memory pressure ────────────────────────────────────────────────────────

/**
 * Read host memory pressure. Returns physical + commit used-% and the max of
 * the two (commit pressure causes the `xmalloc: cannot allocate` failures the
 * fleet actually hits; physical pressure causes thrash). Never throws — an OS
 * failure degrades to all-null (treated as "no pressure", the safe direction).
 */
export function readHostMemory() {
  try {
    if (process.platform === "win32") {
      const psFile = join(
        tmpdir(), `prism-fleet-reaper-mem-${process.pid}-${randomBytes(4).toString("hex")}.ps1`,
      );
      writeFileSync(psFile, [
        "$ErrorActionPreference='SilentlyContinue'",
        "$os = Get-CimInstance Win32_OperatingSystem",
        "[pscustomobject]@{",
        "  physTotalMb   = [math]::Round([int64]$os.TotalVisibleMemorySize / 1024)",
        "  physFreeMb    = [math]::Round([int64]$os.FreePhysicalMemory / 1024)",
        "  commitTotalMb = [math]::Round([int64]$os.TotalVirtualMemorySize / 1024)",
        "  commitFreeMb  = [math]::Round([int64]$os.FreeVirtualMemory / 1024)",
        "} | ConvertTo-Json -Compress",
      ].join("\n"), "utf-8");
      try {
        const raw = execFileSync(
          resolvePowershell(),
          ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", psFile],
          { timeout: PS_TIMEOUT_MS, encoding: "utf-8", windowsHide: true, killSignal: "SIGKILL" },
        );
        return finalizeMemory(JSON.parse(String(raw || "{}").trim() || "{}"));
      } finally {
        try { unlinkSync(psFile); } catch { /* best-effort */ }
      }
    }
    // POSIX: /proc/meminfo (Linux). Commit ≈ physical here — good enough fallback.
    const mi = readFileSync("/proc/meminfo", "utf-8");
    const kb = (key) => {
      const m = mi.match(new RegExp(`^${key}:\\s+(\\d+)\\s+kB`, "m"));
      return m ? Number(m[1]) : null;
    };
    const total = kb("MemTotal");
    const avail = kb("MemAvailable");
    if (total == null || avail == null) return finalizeMemory({});
    return finalizeMemory({
      physTotalMb: Math.round(total / 1024), physFreeMb: Math.round(avail / 1024),
      commitTotalMb: Math.round(total / 1024), commitFreeMb: Math.round(avail / 1024),
    });
  } catch {
    return finalizeMemory({});
  }
}

function pct(total, free) {
  if (!Number.isFinite(total) || !Number.isFinite(free) || total <= 0) return null;
  return Math.round(((total - free) / total) * 1000) / 10; // one decimal place
}

function finalizeMemory(raw) {
  const physTotalMb = Number(raw.physTotalMb);
  const physFreeMb = Number(raw.physFreeMb);
  const commitTotalMb = Number(raw.commitTotalMb);
  const commitFreeMb = Number(raw.commitFreeMb);
  const physUsedPct = pct(physTotalMb, physFreeMb);
  const commitUsedPct = pct(commitTotalMb, commitFreeMb);
  const candidates = [physUsedPct, commitUsedPct].filter((v) => Number.isFinite(v));
  return {
    physTotalMb: Number.isFinite(physTotalMb) ? physTotalMb : null,
    physFreeMb: Number.isFinite(physFreeMb) ? physFreeMb : null,
    commitTotalMb: Number.isFinite(commitTotalMb) ? commitTotalMb : null,
    commitFreeMb: Number.isFinite(commitFreeMb) ? commitFreeMb : null,
    physUsedPct,
    commitUsedPct,
    usedPct: candidates.length ? Math.max(...candidates) : null,
  };
}

// ─── Candidate ledger ───────────────────────────────────────────────────────

function readLedger(ledgerPath) {
  try {
    if (!existsSync(ledgerPath)) return { schemaVersion: LEDGER_SCHEMA_VERSION, candidates: {} };
    const parsed = JSON.parse(readFileSync(ledgerPath, "utf-8"));
    if (!parsed || typeof parsed !== "object" || typeof parsed.candidates !== "object" ||
        parsed.candidates === null || Array.isArray(parsed.candidates)) {
      return { schemaVersion: LEDGER_SCHEMA_VERSION, candidates: {} };
    }
    return { schemaVersion: parsed.schemaVersion || LEDGER_SCHEMA_VERSION, candidates: parsed.candidates };
  } catch {
    return { schemaVersion: LEDGER_SCHEMA_VERSION, candidates: {} };
  }
}

/** PID-reuse-safe ledger key. createdMs distinguishes a reused PID number. */
function ledgerKey(c) {
  return `${c.pid}:${Number.isFinite(c.createdMs) ? c.createdMs : "x"}`;
}

/**
 * Merge the current candidate set into the prior ledger.
 *  - a candidate already tracked KEEPS its `firstSeenAt` (the confirm clock)
 *  - a brand-new candidate gets `firstSeenAt = now`
 *  - a prior entry NOT in the current set is DROPPED — so `firstSeenAt` resets
 *    if a PID stops being a candidate (its slot revived) and reappears later.
 * Pure — no I/O. `now` injectable.
 */
export function updateLedger(prevLedger, candidates, now) {
  const prev = (prevLedger && prevLedger.candidates) || {};
  const next = {};
  for (const c of candidates) {
    const key = ledgerKey(c);
    const existing = prev[key];
    const firstSeenAt = existing && Number.isFinite(existing.firstSeenAt) ? existing.firstSeenAt : now;
    const sweeps = existing && Number.isInteger(existing.sweeps) ? existing.sweeps + 1 : 1;
    next[key] = {
      pid: c.pid,
      createdMs: Number.isFinite(c.createdMs) ? c.createdMs : null,
      name: c.name || "",
      class: c.class,
      ownerSlot: c.ownerSlot || null,
      firstSeenAt,
      lastSeenAt: now,
      sweeps,
    };
  }
  return {
    schemaVersion: LEDGER_SCHEMA_VERSION,
    lastUpdated: new Date(now).toISOString(),
    candidates: next,
  };
}

function writeLedgerAtomic(ledger, ledgerPath) {
  mkdirSync(dirname(ledgerPath), { recursive: true });
  const tmp = `${ledgerPath}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  writeFileSync(tmp, JSON.stringify(ledger, null, 2), "utf-8");
  renameSync(tmp, ledgerPath);
}

/** Synchronous sleep without a CPU busy-spin (Atomics.wait on a throwaway SAB). */
function sleepSync(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(0, ms));
  } catch {
    const end = Date.now() + ms; // SharedArrayBuffer unavailable — bounded fallback
    while (Date.now() < end) { /* */ }
  }
}

/**
 * Best-effort serialization of the ledger read-merge-write. This is NOT a true
 * mutex — the stale-lock break is non-atomic, so two sweepers can briefly both
 * believe they hold it. That is acceptable BY DESIGN: the worst case of a race
 * is a lost `firstSeenAt` — either a candidate's confirm-clock restarts, or a
 * freshly added entry is dropped and re-added next sweep. Both only DELAY a reap
 * by a cycle; neither can cause an erroneous kill, because the kill gate
 * requires `firstSeenAt` to be OLD. Lock failure is likewise non-fatal — we
 * proceed and note it in caveats.
 */
function withLedgerLock(lockPath, fn) {
  const start = Date.now();
  let acquired = false;
  while (Date.now() - start < LEDGER_LOCK_TIMEOUT_MS) {
    try {
      mkdirSync(dirname(lockPath), { recursive: true });
      writeFileSync(lockPath, `${process.pid}\n${new Date().toISOString()}`, { flag: "wx" });
      acquired = true;
      break;
    } catch {
      try {
        const st = statSync(lockPath);
        if (Date.now() - st.mtimeMs > LEDGER_LOCK_TIMEOUT_MS) {
          writeFileSync(lockPath, `${process.pid}`, { flag: "w" }); // break stale lock
          acquired = true;
          break;
        }
      } catch { /* lock vanished mid-check — retry */ }
      sleepSync(LOCK_RETRY_MIN_MS + Math.random() * LOCK_RETRY_JITTER_MS);
    }
  }
  try {
    return fn(acquired);
  } finally {
    if (acquired) { try { unlinkSync(lockPath); } catch { /* best-effort */ } }
  }
}

// ─── Reap decision ──────────────────────────────────────────────────────────

/**
 * Decide whether a confirmed candidate may be reaped THIS sweep.
 * Pure. Returns { reap, reason }.
 *
 * @param {object} entry      the candidate's ledger entry (has firstSeenAt)
 * @param {object} candidate  the current classifyProcess() result
 * @param {object} cfg        { ageFloorMs, killAfterMs }
 * @param {number} now
 */
export function shouldReap(entry, candidate, cfg, now) {
  if (!candidate || candidate.isCandidate !== true) {
    return { reap: false, reason: "not a reap candidate" };
  }
  const ageMs = candidate.ageMs;
  if (!Number.isFinite(ageMs)) {
    return { reap: false, reason: "process age unknown — refusing to reap" };
  }
  if (ageMs < cfg.ageFloorMs) {
    return { reap: false, reason: `too young (${Math.round(ageMs / 1000)}s < ${Math.round(cfg.ageFloorMs / 1000)}s floor)` };
  }
  if (!entry || !Number.isFinite(entry.firstSeenAt)) {
    return { reap: false, reason: "not yet tracked in the candidate ledger" };
  }
  const confirmedForMs = now - entry.firstSeenAt;
  if (confirmedForMs < cfg.killAfterMs) {
    const remain = Math.ceil((cfg.killAfterMs - confirmedForMs) / 1000);
    return { reap: false, reason: `confirming (${Math.round(confirmedForMs / 1000)}s/${Math.round(cfg.killAfterMs / 1000)}s — ~${remain}s left)` };
  }
  return { reap: true, reason: `confirmed orphan for ${Math.round(confirmedForMs / 1000)}s` };
}

// ─── Process killing ────────────────────────────────────────────────────────

function windowsKill(pids) {
  const psFile = join(
    tmpdir(), `prism-fleet-reaper-kill-${process.pid}-${randomBytes(4).toString("hex")}.ps1`,
  );
  // pids originate from Win32_Process.ProcessId (always integers); String(Number())
  // double-coerces so nothing but a numeric literal can land inside @(...).
  const idLiteral = pids.map((p) => String(Number(p))).join(",");
  writeFileSync(psFile, [
    "$ErrorActionPreference='SilentlyContinue'",
    `foreach ($id in @(${idLiteral})) {`,
    "  try { Stop-Process -Id $id -Force -ErrorAction Stop; \"ok $id\" }",
    "  catch { \"err $id \" + $_.Exception.Message }",
    "}",
  ].join("\n"), "utf-8");
  try {
    let raw = "";
    try {
      raw = execFileSync(
        resolvePowershell(),
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", psFile],
        {
          timeout: PS_TIMEOUT_MS, encoding: "utf-8", windowsHide: true,
          maxBuffer: PS_MAX_BUFFER, killSignal: "SIGKILL",
        },
      );
    } catch (err) {
      // PowerShell spawn failure / timeout — report every PID as not-killed
      // rather than throwing. runSweep is called from a Stop hook that must
      // never crash; the next sweep retries these PIDs.
      return pids.map((p) => ({
        pid: p, killed: false, error: `kill subprocess failed: ${err?.message || err}`,
      }));
    }
    const result = new Map();
    for (const line of String(raw || "").split("\n")) {
      const m = line.match(/^(ok|err)\s+(\d+)\s*(.*)$/);
      if (!m) continue;
      result.set(Number(m[2]), { killed: m[1] === "ok", error: m[1] === "err" ? (m[3] || "kill failed") : null });
    }
    return pids.map((p) => ({
      pid: p,
      killed: result.has(p) ? result.get(p).killed : false,
      error: result.has(p) ? result.get(p).error : "no result returned by Stop-Process",
    }));
  } finally {
    try { unlinkSync(psFile); } catch { /* best-effort */ }
  }
}

function posixKill(pids) {
  return pids.map((pid) => {
    try {
      process.kill(pid, "SIGKILL");
      return { pid, killed: true, error: null };
    } catch (err) {
      // ESRCH = already gone — treat as success (the goal was "not running").
      if (err && err.code === "ESRCH") return { pid, killed: true, error: null };
      return { pid, killed: false, error: err?.message || String(err) };
    }
  });
}

function defaultKiller(pids) {
  return process.platform === "win32" ? windowsKill(pids) : posixKill(pids);
}

/** @returns {Array<{pid,killed,error}>} */
export function reapProcesses(pids, { dryRun = false, killer = defaultKiller } = {}) {
  if (!Array.isArray(pids) || pids.length === 0) return [];
  if (dryRun) return pids.map((pid) => ({ pid, killed: false, error: null, dryRun: true }));
  return killer(pids);
}

// ─── Audit trail (shared with node-process-janitor.mjs) ─────────────────────

/**
 * Append JSONL records to the shared forensic trail. Best-effort — audit is
 * advisory, a write failure must never abort a sweep. Each record carries a
 * `reason` tag (`soft-priority-demoted`, `soft-workingset-trimmed`,
 * `ollama-prewarm-fired`, `ollama-hint-written`) so an operator can see what
 * the reaper did beyond kills.
 */
function appendAuditLines(records, auditPath = DEFAULT_AUDIT_LOG_PATH) {
  if (!Array.isArray(records) || records.length === 0) return;
  try {
    mkdirSync(dirname(auditPath), { recursive: true });
    appendFileSync(auditPath, records.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  } catch { /* best-effort — audit is advisory, never fatal */ }
}

// ─── Layer 1: soft RAM/CPU relief (FLEET-REAPER-MS1) ────────────────────────
//
// Under memory pressure, processes owned by STALE chat slots (no heartbeat in
// 2-10 min) get a reversible nudge — CPU priority dropped to BelowNormal +
// working set trimmed. Neither is a kill: Windows re-pages a trimmed working
// set on demand, and a slot that revives re-raises its own priority. This is
// the tier BETWEEN "healthy" and "reap" — soft-first, kill-last.

/**
 * Index a fleet snapshot's classified processes by owning slot. Pure.
 * Processes with no `ownerSlot` (unowned / leftover / not-target) are skipped —
 * soft relief only ever touches slot-attributed processes.
 * @returns {Map<string,{pids:number[],statuses:Set<string>,totalRssBytes:number}>}
 */
export function readSlotProcesses(snap) {
  const bySlot = new Map();
  for (const c of (snap && snap.classified) || []) {
    if (!c.ownerSlot) continue;
    let entry = bySlot.get(c.ownerSlot);
    if (!entry) {
      entry = { pids: [], statuses: new Set(), totalRssBytes: 0 };
      bySlot.set(c.ownerSlot, entry);
    }
    entry.pids.push(c.pid);
    if (c.ownerStatus) entry.statuses.add(c.ownerStatus);
    entry.totalRssBytes += Number.isFinite(c.rssBytes) ? c.rssBytes : 0;
  }
  return bySlot;
}

/**
 * Tally distinct chat slots by status from a snapshot's slotPidMap. Pure.
 * Used by the Ollama coordinator to answer "are there live chats to hint to?"
 * @returns {{alive:number,stale:number,crashed:number,idle:number}}
 */
export function countSlotsByStatus(snap) {
  const seen = new Map(); // slot -> status (first wins; slotPidMap already
  //                          resolved status precedence in process-slot-map)
  const values = snap && snap.slotPidMap && typeof snap.slotPidMap.values === "function"
    ? snap.slotPidMap.values() : [];
  for (const v of values) {
    if (v && v.slot && !seen.has(v.slot)) seen.set(v.slot, v.status);
  }
  const counts = { alive: 0, stale: 0, crashed: 0, idle: 0 };
  for (const status of seen.values()) {
    if (Object.prototype.hasOwnProperty.call(counts, status)) counts[status] += 1;
  }
  return counts;
}

/**
 * Select processes eligible for a soft (reversible) pressure nudge. Pure.
 *
 * Targets: processes whose classified `class` is `owned-by-stale` — a slot that
 * hasn't heartbeated in 2-10 min. NOT alive slots (live work), NOT crashed
 * (those are the reap path), NOT protected (classifyProcess already excluded
 * them), NOT reap candidates (defense-in-depth — the reap path owns those).
 * Age-gated so a just-spawned helper of a briefly-stale slot is left alone.
 *
 * @returns {{targets:Array<{pid,name,ownerSlot,ageMs,rssBytes}>, skipped:number}}
 */
export function selectSoftReliefTargets(snap, { softReliefAgeSec, now } = {}) {
  const ageFloorMs = (Number.isFinite(softReliefAgeSec)
    ? softReliefAgeSec : DEFAULT_SOFT_RELIEF_AGE_SEC) * 1000;
  const targets = [];
  let skipped = 0;
  for (const c of (snap && snap.classified) || []) {
    if (c.class !== "owned-by-stale") continue;
    if (c.isCandidate) { skipped += 1; continue; } // never double-act with the reap path
    if (!Number.isFinite(c.ageMs) || c.ageMs < ageFloorMs) { skipped += 1; continue; }
    targets.push({
      pid: c.pid, ppid: c.ppid, name: c.name, ownerSlot: c.ownerSlot,
      ageMs: c.ageMs, rssBytes: c.rssBytes,
    });
  }
  return { targets, skipped };
}

/**
 * Run an inline PowerShell script; return stdout, or null on spawn failure /
 * timeout / non-Windows. Mirrors windowsKill's hardening: `killSignal:
 * "SIGKILL"` so a WMI-wedged powershell that ignores SIGTERM on timeout is
 * hard-killed (the reaper must not leak its own tools), temp-file cleanup,
 * never throws. The caller builds the script + parses the output.
 */
function runPsScript(label, scriptLines) {
  const psFile = join(
    tmpdir(), `prism-fleet-reaper-${label}-${process.pid}-${randomBytes(4).toString("hex")}.ps1`,
  );
  writeFileSync(psFile, scriptLines.join("\n"), "utf-8");
  try {
    return execFileSync(
      resolvePowershell(),
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", psFile],
      {
        timeout: PS_TIMEOUT_MS, encoding: "utf-8", windowsHide: true,
        maxBuffer: PS_MAX_BUFFER, killSignal: "SIGKILL",
      },
    );
  } catch {
    return null; // spawn failure / timeout — caller maps every PID to a failure
  } finally {
    try { unlinkSync(psFile); } catch { /* best-effort */ }
  }
}

/** Windows: drop CPU priority to BelowNormal for each PID. */
function windowsPriorityRelief(pids) {
  // pids originate from Win32_Process.ProcessId (integers); String(Number())
  // double-coerces so nothing but a numeric literal lands inside @(...).
  const idLiteral = pids.map((p) => String(Number(p))).join(",");
  const raw = runPsScript("prio", [
    "$ErrorActionPreference='SilentlyContinue'",
    `foreach ($id in @(${idLiteral})) {`,
    "  try { (Get-Process -Id $id -ErrorAction Stop).PriorityClass = 'BelowNormal'; \"ok $id\" }",
    "  catch { \"err $id \" + $_.Exception.Message }",
    "}",
  ]);
  if (raw == null) {
    return pids.map((p) => ({ pid: p, demoted: false, error: "priority subprocess failed" }));
  }
  const result = new Map();
  for (const line of String(raw || "").split("\n")) {
    const m = line.match(/^(ok|err)\s+(\d+)\s*(.*)$/);
    if (!m) continue;
    result.set(Number(m[2]), {
      demoted: m[1] === "ok", error: m[1] === "err" ? (m[3] || "priority change failed") : null,
    });
  }
  return pids.map((p) => (result.has(p)
    ? { pid: p, demoted: result.get(p).demoted, error: result.get(p).error }
    : { pid: p, demoted: false, error: "no result returned by Get-Process" }));
}

/** Windows: trim each PID's working set via PSAPI EmptyWorkingSet. */
function windowsWorkingSetTrim(pids) {
  const idLiteral = pids.map((p) => String(Number(p))).join(",");
  // EmptyWorkingSet is the documented "trim working set to minimum" call — the
  // OS re-pages on demand, so this is reversible, not a kill. We capture
  // WorkingSet64 before + immediately after to estimate the reclaim.
  const raw = runPsScript("trim", [
    "$ErrorActionPreference='SilentlyContinue'",
    "$sig = '[DllImport(\"psapi.dll\")] public static extern bool EmptyWorkingSet(System.IntPtr hProcess);'",
    "try { Add-Type -Namespace PrismFR -Name Mem -MemberDefinition $sig -ErrorAction Stop } catch {}",
    `foreach ($id in @(${idLiteral})) {`,
    "  try {",
    "    $p = Get-Process -Id $id -ErrorAction Stop",
    "    $before = [int64]$p.WorkingSet64",
    "    [void][PrismFR.Mem]::EmptyWorkingSet($p.Handle)",
    "    $p.Refresh()",
    "    $after = [int64]$p.WorkingSet64",
    "    \"ok $id $before $after\"",
    "  } catch { \"err $id \" + $_.Exception.Message }",
    "}",
  ]);
  if (raw == null) {
    return pids.map((p) => ({ pid: p, trimmed: false, error: "trim subprocess failed", rssReclaimedBytes: 0 }));
  }
  const result = new Map();
  for (const line of String(raw || "").split("\n")) {
    const ok = line.match(/^ok\s+(\d+)\s+(\d+)\s+(\d+)\s*$/);
    if (ok) {
      const before = Number(ok[2]);
      const after = Number(ok[3]);
      const reclaimed = Number.isFinite(before) && Number.isFinite(after)
        ? Math.max(0, before - after) : 0;
      result.set(Number(ok[1]), { trimmed: true, error: null, rssReclaimedBytes: reclaimed });
      continue;
    }
    const err = line.match(/^err\s+(\d+)\s*(.*)$/);
    if (err) {
      result.set(Number(err[1]), {
        trimmed: false, error: err[2] || "working-set trim failed", rssReclaimedBytes: 0,
      });
    }
  }
  return pids.map((p) => (result.has(p)
    ? { pid: p, ...result.get(p) }
    : { pid: p, trimmed: false, error: "no result returned by Get-Process", rssReclaimedBytes: 0 }));
}

/** POSIX: drop scheduling priority via `renice +5`. Best-effort, never throws. */
function posixPriorityRelief(pids) {
  try {
    execFileSync("renice", ["+5", ...pids.map((p) => String(Number(p)))],
      { timeout: PS_TIMEOUT_MS, encoding: "utf-8" });
    return pids.map((p) => ({ pid: p, demoted: true, error: null }));
  } catch (err) {
    return pids.map((p) => ({ pid: p, demoted: false, error: err?.message || String(err) }));
  }
}

function defaultPriorityApplier(pids) {
  return process.platform === "win32" ? windowsPriorityRelief(pids) : posixPriorityRelief(pids);
}

function defaultWorkingSetApplier(pids) {
  if (process.platform === "win32") return windowsWorkingSetTrim(pids);
  // POSIX has no cheap reversible working-set trim equivalent worth the surface
  // for a Windows-primary repo — report skipped, not failed (avoids noise).
  return pids.map((p) => ({ pid: p, trimmed: false, error: null, skipped: "posix", rssReclaimedBytes: 0 }));
}

/**
 * Drop CPU priority to BelowNormal for a list of PIDs. Injectable applier seam
 * for tests. dryRun → classify the intent without touching the OS.
 * @returns {Array<{pid,demoted,error,dryRun?}>}
 */
export function applyPriorityRelief(pids, { dryRun = false, applier = defaultPriorityApplier } = {}) {
  if (!Array.isArray(pids) || pids.length === 0) return [];
  if (dryRun) return pids.map((pid) => ({ pid, demoted: false, error: null, dryRun: true }));
  return applier(pids);
}

/**
 * Trim the working set for a list of PIDs. Injectable applier seam for tests.
 * dryRun → classify the intent without touching the OS.
 * @returns {Array<{pid,trimmed,error,rssReclaimedBytes,dryRun?}>}
 */
export function applyWorkingSetTrim(pids, { dryRun = false, applier = defaultWorkingSetApplier } = {}) {
  if (!Array.isArray(pids) || pids.length === 0) return [];
  if (dryRun) {
    return pids.map((pid) => ({ pid, trimmed: false, error: null, rssReclaimedBytes: 0, dryRun: true }));
  }
  return applier(pids);
}

// ─── Layer 2: GPU + Ollama state probes (FLEET-REAPER-MS1) ──────────────────

/** Default nvidia-smi runner — one CSV line. Returns stdout or null on failure. */
function defaultRunNvidiaSmi() {
  try {
    return execFileSync("nvidia-smi", [
      "--query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu",
      "--format=csv,noheader,nounits",
    ], {
      timeout: PROBE_TIMEOUT_MS, encoding: "utf-8", windowsHide: true, maxBuffer: PROBE_MAX_BUFFER,
    });
  } catch {
    return null; // no NVIDIA GPU / driver absent / timeout — degrade, never throw
  }
}

/**
 * Read GPU state via nvidia-smi. Never throws — a missing nvidia-smi degrades
 * to { available:false }. Parses the FIRST GPU row (the fleet runs one box).
 * @returns {{available,name?,totalMb?,usedMb?,freeMb?,utilizationPct?,reason?}}
 */
export function readGpuState({ runNvidiaSmi = defaultRunNvidiaSmi } = {}) {
  if (process.env.PRISM_FLEET_REAPER_GPU_DISABLE === "1") {
    return { available: false, reason: "PRISM_FLEET_REAPER_GPU_DISABLE=1" };
  }
  let raw;
  try {
    raw = runNvidiaSmi();
  } catch {
    return { available: false, reason: "nvidia-smi runner threw" };
  }
  if (!raw || typeof raw !== "string") {
    return { available: false, reason: "nvidia-smi unavailable" };
  }
  const line = raw.split("\n").map((l) => l.trim()).filter(Boolean)[0];
  if (!line) return { available: false, reason: "nvidia-smi returned no GPU rows" };
  const parts = line.split(",").map((p) => p.trim());
  if (parts.length < 5) return { available: false, reason: `nvidia-smi row malformed: "${line}"` };
  const num = (s) => { const n = Number(s); return Number.isFinite(n) ? n : null; };
  const totalMb = num(parts[1]);
  const usedMb = num(parts[2]);
  const freeMb = num(parts[3]);
  const utilizationPct = num(parts[4]);
  if (totalMb == null || freeMb == null) {
    return { available: false, reason: `nvidia-smi row had non-numeric memory: "${line}"` };
  }
  return { available: true, name: parts[0] || "GPU", totalMb, usedMb, freeMb, utilizationPct };
}

/** Default curl runner for an Ollama endpoint. Returns body string or null. */
function defaultRunCurl(url) {
  try {
    return execFileSync("curl", ["-s", "-m", String(PROBE_TIMEOUT_SEC), url], {
      timeout: PROBE_TIMEOUT_MS, encoding: "utf-8", windowsHide: true, maxBuffer: PROBE_MAX_BUFFER,
    });
  } catch {
    return null; // daemon down / curl absent / timeout — degrade, never throw
  }
}

/**
 * Resolve the Ollama base URL — explicit arg > OLLAMA_URL env > default.
 * Defense-in-depth: a value that does not start with http:// or https:// is
 * rejected back to DEFAULT_OLLAMA_URL. The URL only ever lands in a `spawn`
 * args array (no shell — no RCE), but a malformed/non-http value would just
 * make curl fail; falling back to the default keeps the probe meaningful.
 */
function resolveOllamaUrl(ollamaUrl) {
  const raw = (ollamaUrl || process.env.OLLAMA_URL || DEFAULT_OLLAMA_URL).replace(/\/+$/, "");
  return /^https?:\/\//i.test(raw) ? raw : DEFAULT_OLLAMA_URL;
}

/**
 * Read Ollama state — reachability (/api/tags), available models, loaded models
 * (/api/ps). Never throws — an unreachable daemon degrades to
 * { reachable:false, models:[], loaded:[] }. Reachability stands on /api/tags;
 * /api/ps is best-effort (an older Ollama without it still reports reachable).
 * @returns {{reachable,models:string[],loaded:Array<{model,sizeMb}>,reason?}}
 */
export function readOllamaState({ runCurl = defaultRunCurl, ollamaUrl } = {}) {
  // No env gate here: PRISM_FLEET_REAPER_GPU_DISABLE belongs to readGpuState
  // ONLY (the GPU probe), and PRISM_FLEET_REAPER_OLLAMA_COORD_DISABLE / --no-coord
  // already short-circuit the whole Layer 2/3 block in runSweep before this is
  // ever reached. Gating Ollama on the GPU knob would wrongly couple the two.
  const base = resolveOllamaUrl(ollamaUrl);
  let tagsRaw;
  try {
    tagsRaw = runCurl(`${base}/api/tags`);
  } catch {
    return { reachable: false, models: [], loaded: [], reason: "Ollama /api/tags probe threw" };
  }
  if (!tagsRaw) {
    return { reachable: false, models: [], loaded: [], reason: "Ollama /api/tags unreachable" };
  }
  let models = [];
  try {
    const tags = JSON.parse(tagsRaw);
    models = Array.isArray(tags && tags.models)
      ? tags.models.map((m) => m && m.name).filter(Boolean) : [];
  } catch {
    return { reachable: false, models: [], loaded: [], reason: "Ollama /api/tags returned non-JSON" };
  }
  let loaded = [];
  try {
    const psRaw = runCurl(`${base}/api/ps`);
    if (psRaw) {
      const ps = JSON.parse(psRaw);
      loaded = Array.isArray(ps && ps.models)
        ? ps.models.map((m) => ({
          model: (m && (m.name || m.model)) || "",
          sizeMb: Number.isFinite(Number(m && m.size))
            ? Math.round(Number(m.size) / (1024 * 1024)) : null,
        })).filter((m) => m.model)
        : [];
    }
  } catch { /* /api/ps best-effort — reachability already stands on /api/tags */ }
  return { reachable: true, models, loaded };
}

// ─── Layer 2b: Docker stack health probe (FLEET-REAPER-MS1.1) ───────────────
//
// Reuses the pre-built `scripts/ollama-docker-health.mjs --json` probe so
// every fleet-reaper sweep also sees: Docker daemon, Postgres (postgres-prism),
// Qdrant, Prometheus. The probe is fail-soft (every service "down" is a
// status, never a crash) and bounded (PROBE_TIMEOUT_MS).
//
// Why surface this in the reaper sweep:
//   1. Ollama runs in a Docker container — a Docker outage explains an Ollama
//      probe failure that would otherwise look like a coordinator bug.
//   2. Operators get fleet-wide infra health in one verdict line (no need to
//      run /ollama-docker-health manually).
//   3. The Monitor's live event feed catches Docker/Qdrant/Postgres going down
//      with no extra wiring — the existing `monitorEvent` already prints
//      `caveats`, so a degraded service is one chat-message away.
//
// Knobs: `PRISM_FLEET_REAPER_DOCKER_DISABLE=1` (skip the probe entirely),
//        `PRISM_FLEET_REAPER_DOCKER_HEALTH_PATH=<path>` (override script path).

const DEFAULT_DOCKER_HEALTH_SCRIPT = "H:/prism/scripts/ollama-docker-health.mjs";

function defaultRunDockerHealth() {
  const scriptPath = process.env.PRISM_FLEET_REAPER_DOCKER_HEALTH_PATH
    || DEFAULT_DOCKER_HEALTH_SCRIPT;
  // Use process.execPath, NOT bare "node" — under portable-node deployments
  // (H:/Tools/nodejs/node.exe not on PATH for harness-spawned children) bare
  // "node" returns ENOENT and the probe silently never fires. Same class of
  // regression as [[reference_precompact_bare_node_enoent_2026_05_16]].
  try {
    return execFileSync(process.execPath, [scriptPath, "--json"], {
      timeout: PROBE_TIMEOUT_MS * 2,  // docker daemon probes are 2-step (engine + service list)
      encoding: "utf-8", windowsHide: true, maxBuffer: PROBE_MAX_BUFFER,
    });
  } catch {
    return null;
  }
}

/**
 * Probe the Docker + supporting-services stack. Returns a normalized
 * { available, services } where services is a per-name {up, detail} map.
 * Never throws — a missing probe / unreachable Docker degrades to
 * { available:false, services:{} } so the coordinator can decide whether
 * its Ollama prewarm is even meaningful.
 */
export function readDockerHealth({ runHealthProbe = defaultRunDockerHealth } = {}) {
  if (process.env.PRISM_FLEET_REAPER_DOCKER_DISABLE === "1") {
    return { available: false, services: {}, reason: "PRISM_FLEET_REAPER_DOCKER_DISABLE=1" };
  }
  let raw;
  try {
    raw = runHealthProbe();
  } catch {
    return { available: false, services: {}, reason: "docker-health probe threw" };
  }
  if (!raw || typeof raw !== "string") {
    return { available: false, services: {}, reason: "docker-health probe unavailable" };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { available: false, services: {}, reason: "docker-health returned non-JSON" };
  }
  // `parsed.services` is `{ollama, docker, postgres, qdrant, prometheus}` with
  // each entry shaped `{up: boolean, detail?: string, error?: string}`. We
  // mirror only the up-flags here to keep the sweep result compact; details
  // are one --json invocation away if an operator wants them.
  const services = {};
  if (parsed && parsed.services && typeof parsed.services === "object") {
    for (const [name, svc] of Object.entries(parsed.services)) {
      services[name] = {
        up: !!(svc && svc.up),
        detail: svc && typeof svc.detail === "string" ? svc.detail : null,
      };
    }
  }
  return {
    available: !!(services.docker && services.docker.up),
    services,
  };
}

// ─── Layer 3: Ollama coordinator (FLEET-REAPER-MS1) ─────────────────────────
//
// When the box is under memory pressure AND the GPU has headroom AND Ollama is
// reachable, the coordinator (a) pre-warms a local model into VRAM so the next
// hook offload skips the cold-start, and (b) writes a TTL'd routing hint that
// nudges ollama-task-offloader.mjs to absorb more hook-eligible work — turning
// idle VRAM into Claude-CLI throughput instead of adding more kills.

/**
 * Decide whether to pre-warm Ollama + write an offload routing hint. PURE — no
 * I/O, fully testable. The side-effecting actions (prewarmOllama,
 * writeRoutingHint) are separate functions the sweep calls from this decision.
 *
 * @param {object} args
 *   mem         readHostMemory() result
 *   gpu         readGpuState() result
 *   ollama      readOllamaState() result
 *   slotCounts  { alive, stale, crashed, idle } — chat-slot tallies, NOT procs
 *   cfg         { gpuFreeMinMb, prewarmModel, hintThresholdDelta, prewarmPct,
 *                 hintPct, disabled }
 * @returns {{shouldPrewarm,prewarmModel,shouldHintOffload,thresholdDelta,
 *            reason,skipped}}
 */
export function decideOllamaCoordination({ mem, gpu, ollama, slotCounts, cfg } = {}) {
  const c = cfg || {};
  const prewarmModel = c.prewarmModel || DEFAULT_OLLAMA_PREWARM_MODEL;
  const noop = (skipped) => ({
    shouldPrewarm: false, prewarmModel, shouldHintOffload: false,
    thresholdDelta: 0, reason: skipped, skipped,
  });
  if (c.disabled) return noop("coordinator disabled");
  if (!gpu || !gpu.available) return noop(`GPU unavailable (${(gpu && gpu.reason) || "no probe"})`);
  if (!ollama || !ollama.reachable) {
    return noop(`Ollama unreachable (${(ollama && ollama.reason) || "no probe"})`);
  }
  const memPct = mem && Number.isFinite(mem.usedPct) ? mem.usedPct : null;
  if (memPct == null) return noop("host memory unknown");

  const gpuFreeMinMb = Number.isFinite(c.gpuFreeMinMb) ? c.gpuFreeMinMb : DEFAULT_GPU_FREE_MIN_MB;
  const prewarmPct = Number.isFinite(c.prewarmPct) ? c.prewarmPct : DEFAULT_SOFT_RELIEF_PRESSURE_PCT;
  const hintPct = Number.isFinite(c.hintPct) ? c.hintPct : DEFAULT_SOFT_RELIEF_PRESSURE_PCT;

  if (!Number.isFinite(gpu.freeMb) || gpu.freeMb < gpuFreeMinMb) {
    return noop(`GPU free ${gpu.freeMb == null ? "?" : gpu.freeMb}MB < ${gpuFreeMinMb}MB floor`);
  }

  const aliveSlots = slotCounts && Number.isFinite(slotCounts.alive) ? slotCounts.alive : 0;
  const modelLoaded = Array.isArray(ollama.loaded)
    && ollama.loaded.some((m) => m && m.model === prewarmModel);

  // Pre-warm: pressure is real, GPU has room, and the model is NOT already
  // resident — load it so the next offload skips the ~3 s cold-start.
  const shouldPrewarm = memPct >= prewarmPct && !modelLoaded;
  // Hint: pressure is real, GPU has room, AND there is ≥1 live chat whose hooks
  // can actually consume the hint. No alive slots → nobody to route work to.
  const shouldHintOffload = memPct >= hintPct && aliveSlots >= 1;

  const deltaMag = Math.min(
    HINT_THRESHOLD_DELTA_CAP,
    Math.abs(Number.isFinite(c.hintThresholdDelta)
      ? c.hintThresholdDelta : DEFAULT_HINT_THRESHOLD_DELTA),
  );
  const thresholdDelta = shouldHintOffload ? -deltaMag : 0;

  const bits = [`commit ${memPct}%`, `gpuFree ${gpu.freeMb}MB`, `${aliveSlots} alive slot(s)`];
  if (modelLoaded) bits.push(`${prewarmModel} already loaded`);
  if (!shouldPrewarm && !shouldHintOffload) bits.push("below pressure floor — no action");
  return {
    shouldPrewarm, prewarmModel, shouldHintOffload, thresholdDelta,
    reason: bits.join(" · "), skipped: null,
  };
}

/** Default detached spawn for the prewarm POST — returns the child pid (or null). */
function defaultPrewarmSpawn(model, base, keepAlive) {
  const body = JSON.stringify({ model, prompt: " ", keep_alive: keepAlive, stream: false });
  const child = spawn("curl", [
    "-s", "-m", String(PREWARM_CURL_TIMEOUT_SEC), "-X", "POST", `${base}/api/generate`,
    "-H", "Content-Type: application/json", "-d", body,
  ], { detached: true, stdio: "ignore", windowsHide: true });
  child.unref();
  return child.pid == null ? null : child.pid;
}

/**
 * Fire-and-forget Ollama model pre-warm. POSTs /api/generate with a 1-space
 * prompt + keep_alive so the model loads into VRAM and stays resident. Never
 * blocks, never throws — a spawn failure is swallowed into { fired:false }.
 * @returns {{fired,pid,model,keepAlive,error}}
 */
export function prewarmOllama(model, { ollamaUrl, keepAlive, spawnImpl = defaultPrewarmSpawn } = {}) {
  const base = resolveOllamaUrl(ollamaUrl);
  const ka = keepAlive || process.env.PRISM_FLEET_REAPER_OLLAMA_KEEP_ALIVE || DEFAULT_OLLAMA_KEEP_ALIVE;
  try {
    const pid = spawnImpl(model, base, ka);
    return { fired: true, pid: pid == null ? null : pid, model, keepAlive: ka, error: null };
  } catch (err) {
    return { fired: false, pid: null, model, keepAlive: ka, error: err && err.message ? err.message : String(err) };
  }
}

/**
 * Write the TTL'd Ollama routing hint atomically (temp + rename). When
 * `decision.shouldHintOffload` is false the hint is NEUTRALIZED — written with
 * mode "auto" and thresholdDelta 0 — so a stale aggressive hint from a prior
 * sweep cannot linger. The file IS the canonical statement; every sweep
 * restates it. `thresholdDelta` is hard-clamped to ±HINT_THRESHOLD_DELTA_CAP so
 * a bad decision can never push the consumer's threshold to 0 or 2. Never throws.
 * @returns {{written,mode,thresholdDelta,validUntil,path,error}}
 */
export function writeRoutingHint(decision, { now = Date.now(), path = DEFAULT_HINT_PATH, hintTtlSec } = {}) {
  const ttlSec = Number.isFinite(hintTtlSec)
    ? Math.max(1, Math.min(MAX_HINT_TTL_SEC, hintTtlSec))
    : DEFAULT_HINT_TTL_SEC;
  const aggressive = !!(decision && decision.shouldHintOffload);
  const rawDelta = decision && Number.isFinite(decision.thresholdDelta) ? decision.thresholdDelta : 0;
  const thresholdDelta = aggressive
    ? Math.max(-HINT_THRESHOLD_DELTA_CAP, Math.min(HINT_THRESHOLD_DELTA_CAP, rawDelta))
    : 0;
  const hint = {
    schemaVersion: HINT_SCHEMA_VERSION,
    mode: aggressive ? "aggressive-offload" : "auto",
    thresholdDelta,
    validUntil: new Date(now + ttlSec * 1000).toISOString(),
    writtenAt: new Date(now).toISOString(),
    writtenBy: "fleet-reaper-sweep",
    reason: (decision && decision.reason) || "no decision",
  };
  try {
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
    writeFileSync(tmp, JSON.stringify(hint, null, 2), "utf-8");
    renameSync(tmp, path);
    return {
      written: true, mode: hint.mode, thresholdDelta, validUntil: hint.validUntil, path, error: null,
    };
  } catch (err) {
    return {
      written: false, mode: hint.mode, thresholdDelta, validUntil: hint.validUntil, path,
      error: err && err.message ? err.message : String(err),
    };
  }
}

// ─── One sweep ──────────────────────────────────────────────────────────────

/**
 * Run a single sweep. Fully injectable — every OS touch point has an opts seam
 * so tests run against synthetic data and never kill a real process.
 *
 * @param {object} [opts]
 *   mode            "once" | "stop-event" | "status"  (status = read-only)
 *   dryRun          classify + decide but never kill
 *   intervalSec, ageFloorSec, killAfter, memPressurePct, memCriticalPct  config
 *   now             clock injection
 *   enumerator, slotsFile, pidRegistry, slotsPath, registryPath  → snapshotFleet
 *   readMemory      injectable host-memory reader
 *   killer          injectable process killer
 *   ledgerPath, ledgerLockPath  injectable ledger paths
 * @returns {object} the sweep result (see summarize() for the shape consumers use)
 */
export function runSweep(opts = {}) {
  const now = Number.isFinite(opts.now) ? opts.now : Date.now();
  const mode = opts.mode || "once";
  const isStatus = mode === "status";
  const disabled = process.env.PRISM_FLEET_REAPER_DISABLE === "1";
  const dryRun = !!opts.dryRun || process.env.PRISM_FLEET_REAPER_DRY_RUN === "1";

  const intervalSec = clampInt(opts.intervalSec, DEFAULT_INTERVAL_SEC, MIN_INTERVAL_SEC, MAX_INTERVAL_SEC);
  const ageFloorSec = clampInt(opts.ageFloorSec, DEFAULT_AGE_FLOOR_SEC, 0, MAX_AGE_FLOOR_SEC);
  const killAfter = clampInt(opts.killAfter, DEFAULT_KILL_AFTER, 1, MAX_KILL_AFTER);
  const memPressurePct = clampInt(opts.memPressurePct, DEFAULT_MEM_PRESSURE_PCT, 1, 100);
  const memCriticalPct = clampInt(opts.memCriticalPct, DEFAULT_MEM_CRITICAL_PCT, 1, 100);
  const ledgerPath = opts.ledgerPath || DEFAULT_LEDGER_PATH;
  const ledgerLockPath = opts.ledgerLockPath || `${ledgerPath}.lock`;

  // 1. Fleet snapshot — slot-aware classification of every node/git/bash process.
  const snap = snapshotFleet({
    enumerator: opts.enumerator,
    slotsFile: opts.slotsFile,
    pidRegistry: opts.pidRegistry,
    slotsPath: opts.slotsPath,
    registryPath: opts.registryPath,
    selfPid: opts.selfPid,
    now,
  });

  // 2. Host memory — pressure makes the kill gate one tick more eager.
  const mem = (opts.readMemory || readHostMemory)();
  const { tier: pressureTier, effectiveKillAfter } = tierFromPressure(
    mem.usedPct, memPressurePct, memCriticalPct, killAfter,
  );
  // `underPressure` retains its pre-MS1 meaning (>= warn band) for the
  // human/JSON report + the prose-only callers in summarize(); the new
  // critical band is surfaced separately as `pressureTier`/`criticalPressure`.
  const underPressure = pressureTier !== "normal";
  const criticalPressure = pressureTier === "critical";
  const cfg = {
    ageFloorMs: ageFloorSec * 1000,
    killAfterMs: effectiveKillAfter * intervalSec * 1000,
  };

  const caveats = [...snap.caveats];

  // 3. Ledger: merge current candidates, decide reaps. status mode never writes.
  let ledger;
  const lockResult = withLedgerLock(ledgerLockPath, (acquired) => {
    if (!acquired) caveats.push("ledger lock not acquired — proceeded best-effort (a race only delays a reap, never causes one)");
    const prev = readLedger(ledgerPath);
    const merged = updateLedger(prev, snap.candidates, now);
    if (!isStatus) {
      try {
        writeLedgerAtomic(merged, ledgerPath);
      } catch (err) {
        caveats.push(`ledger write failed: ${err?.message || err}`);
      }
    }
    return merged;
  });
  ledger = lockResult;

  // 4. Per-candidate reap decision.
  const candidateReport = snap.candidates.map((c) => {
    const entry = ledger.candidates[ledgerKey(c)];
    const decision = shouldReap(entry, c, cfg, now);
    return {
      pid: c.pid,
      name: c.name,
      class: c.class,
      ownerSlot: c.ownerSlot || null,
      ownerStatus: c.ownerStatus || null,
      ageMs: c.ageMs,
      rssBytes: c.rssBytes,
      reason: c.reason,
      firstSeenAt: entry ? entry.firstSeenAt : null,
      sweeps: entry ? entry.sweeps : 0,
      willReap: decision.reap,
      decision: decision.reason,
    };
  });

  // 5. Reap — unless status mode, disabled, or dry-run.
  const reapList = candidateReport.filter((c) => c.willReap);
  let reaped = [];
  let blockedBy = null;
  if (isStatus) {
    blockedBy = "status mode (read-only)";
  } else if (disabled) {
    blockedBy = "PRISM_FLEET_REAPER_DISABLE=1";
  } else if (reapList.length > 0) {
    try {
      const killResults = reapProcesses(
        reapList.map((c) => c.pid),
        { dryRun, killer: opts.killer },
      );
      const killByPid = new Map(killResults.map((r) => [r.pid, r]));
      reaped = reapList.map((c) => {
        const k = killByPid.get(c.pid) || { killed: false, error: "no kill result" };
        return {
          pid: c.pid, name: c.name, class: c.class, ownerSlot: c.ownerSlot,
          ownerStatus: c.ownerStatus, rssBytes: c.rssBytes,
          killed: !!k.killed, dryRun: !!k.dryRun, error: k.error || null,
        };
      });
    } catch (err) {
      // Defense in depth: windowsKill/posixKill already guard themselves, and
      // the killer is injectable — but never let a kill-path throw escape
      // runSweep (it is called from a Stop hook + a Monitor loop).
      caveats.push(`reap step failed: ${err?.message || err}`);
      reaped = [];
    }
  }

  const reapedOk = reaped.filter((r) => r.killed && !r.dryRun).length;
  const reapFailed = reaped.filter((r) => !r.killed && !r.dryRun).length;

  // ── FLEET-REAPER-MS1 config: soft-relief + coordinator knobs ──
  // Resolved here (not in resolveConfig) so a direct runSweep() caller — tests,
  // the Stop hook — gets the same env-knob behaviour as the CLI path.
  const envInt = (name) => {
    const n = Number(process.env[name]);
    return Number.isFinite(n) ? n : null;
  };
  const noRelief = !!opts.noRelief || process.env.PRISM_FLEET_REAPER_SOFT_RELIEF_DISABLE === "1";
  const noCoord = !!opts.noCoord || process.env.PRISM_FLEET_REAPER_OLLAMA_COORD_DISABLE === "1";
  const softReliefAgeSec = clampInt(
    opts.softReliefAgeSec ?? envInt("PRISM_FLEET_REAPER_SOFT_RELIEF_AGE_SEC"),
    DEFAULT_SOFT_RELIEF_AGE_SEC, 0, MAX_SOFT_RELIEF_AGE_SEC,
  );
  const softReliefPressurePct = clampInt(
    opts.softReliefPressurePct ?? envInt("PRISM_FLEET_REAPER_SOFT_RELIEF_PRESSURE_PCT"),
    DEFAULT_SOFT_RELIEF_PRESSURE_PCT, 1, 100,
  );
  // Side-effecting actions (kills already done above; soft-relief nudges +
  // prewarm + hint-write below) are suppressed in status / disabled / dry-run.
  const actionsAllowed = !isStatus && !disabled && !dryRun;
  const softUnderPressure = Number.isFinite(mem.usedPct) && mem.usedPct >= softReliefPressurePct;

  // 6. Layer 1 — soft RAM/CPU relief. Under pressure, nudge stale-slot processes
  //    (reversible: BelowNormal priority + working-set trim). Never a kill.
  let softRelief = {
    attempted: false, priorityDemoted: 0, workingSetTrimmed: 0,
    rssReclaimedBytes: 0, targets: 0, skipped: 0, dryRun, error: null,
  };
  if (!noRelief && softUnderPressure) {
    try {
      const { targets, skipped } = selectSoftReliefTargets(snap, { softReliefAgeSec, now });
      softRelief.targets = targets.length;
      softRelief.skipped = skipped;
      if (targets.length > 0 && (actionsAllowed || dryRun)) {
        const pids = targets.map((t) => t.pid);
        const prio = applyPriorityRelief(pids, { dryRun, applier: opts.priorityApplier });
        const trim = applyWorkingSetTrim(pids, { dryRun, applier: opts.workingSetApplier });
        softRelief.attempted = true;
        softRelief.priorityDemoted = prio.filter((r) => r.demoted && !r.dryRun).length;
        softRelief.workingSetTrimmed = trim.filter((r) => r.trimmed && !r.dryRun).length;
        softRelief.rssReclaimedBytes = trim.reduce(
          (s, r) => s + (Number.isFinite(r.rssReclaimedBytes) ? r.rssReclaimedBytes : 0), 0,
        );
        if (actionsAllowed) {
          const byPid = new Map(targets.map((t) => [t.pid, t]));
          const auditTs = new Date(now).toISOString();
          const records = [];
          for (const r of prio) {
            if (r.demoted) {
              const t = byPid.get(r.pid) || {};
              records.push({
                ts: auditTs, pid: r.pid, ppid: t.ppid ?? null, name: t.name || "",
                ownerSlot: t.ownerSlot || null, reason: "soft-priority-demoted",
              });
            }
          }
          for (const r of trim) {
            if (r.trimmed) {
              const t = byPid.get(r.pid) || {};
              records.push({
                ts: auditTs, pid: r.pid, ppid: t.ppid ?? null, name: t.name || "",
                ownerSlot: t.ownerSlot || null, reason: "soft-workingset-trimmed",
                rssReclaimedBytes: r.rssReclaimedBytes || 0,
              });
            }
          }
          appendAuditLines(records, opts.auditPath || DEFAULT_AUDIT_LOG_PATH);
        }
      }
    } catch (err) {
      // Defense in depth: the appliers guard themselves — but a soft-relief
      // failure must never abort the sweep (it is called from a Stop hook).
      softRelief.error = err && err.message ? err.message : String(err);
      caveats.push(`soft-relief step failed: ${softRelief.error}`);
    }
  }

  // 7. Layer 2 — GPU + Ollama probes. Read-only; run even in status mode so the
  //    verdict surfaces GPU/Ollama state. Skipped entirely when --no-coord.
  let gpu = { available: false, reason: "coordinator skipped (--no-coord)" };
  let ollama = { reachable: false, models: [], loaded: [], reason: "coordinator skipped (--no-coord)" };
  let dockerHealth = { available: false, services: {}, reason: "coordinator skipped (--no-coord)" };
  let coordinator = {
    evaluated: false, shouldPrewarm: false, shouldHintOffload: false,
    thresholdDelta: 0, prewarmFired: false, hintWritten: false,
    reason: "coordinator skipped (--no-coord)", skipped: "--no-coord", error: null,
  };
  if (!noCoord) {
    try {
      gpu = (opts.readGpu || readGpuState)({ runNvidiaSmi: opts.runNvidiaSmi });
      ollama = (opts.readOllama || readOllamaState)({ runCurl: opts.runCurl, ollamaUrl: opts.ollamaUrl });
      // FLEET-REAPER-MS1.1: Docker + supporting-services health probe. Advisory
      // — never gates the coordinator decision (Ollama probe already catches
      // an unreachable daemon). Surfaces Docker / Postgres / Qdrant / Prometheus
      // status in the sweep result so operators see the whole infra layer.
      dockerHealth = (opts.readDockerHealth || readDockerHealth)({
        runHealthProbe: opts.runDockerHealthProbe,
      });
      // If Docker is down BUT Ollama probe says reachable, that's a Windows-
      // host Ollama (not the containerized one) — caveat for forensic clarity.
      // The reverse case (Docker up + Ollama unreachable) is interesting
      // because it means the container exited; surface that too.
      if (!dockerHealth.available && ollama.reachable) {
        caveats.push("docker down but ollama reachable — host-installed daemon, not the container");
      } else if (dockerHealth.available && !ollama.reachable) {
        caveats.push("docker up but ollama unreachable — ollama container exited or wrong network");
      }

      // 8. Layer 3 — coordinator decision (pure) + actions.
      const slotCounts = countSlotsByStatus(snap);
      const decision = decideOllamaCoordination({
        mem,
        gpu,
        ollama,
        slotCounts,
        cfg: {
          disabled: false, // noCoord already short-circuited above
          gpuFreeMinMb: opts.gpuFreeMinMb ?? envInt("PRISM_FLEET_REAPER_GPU_FREE_MIN_MB"),
          prewarmModel: opts.prewarmModel
            || process.env.PRISM_FLEET_REAPER_OLLAMA_PREWARM_MODEL || DEFAULT_OLLAMA_PREWARM_MODEL,
          hintThresholdDelta: opts.hintThresholdDelta
            ?? envInt("PRISM_FLEET_REAPER_HINT_THRESHOLD_DELTA"),
          prewarmPct: softReliefPressurePct,
          hintPct: softReliefPressurePct,
        },
      });
      coordinator = {
        evaluated: true,
        shouldPrewarm: decision.shouldPrewarm,
        shouldHintOffload: decision.shouldHintOffload,
        thresholdDelta: decision.thresholdDelta,
        prewarmModel: decision.prewarmModel,
        prewarmFired: false,
        prewarmError: null,
        hintWritten: false,
        hintError: null,
        reason: decision.reason,
        skipped: decision.skipped,
        error: null,
      };
      const recordEvent = opts.recordEvent || recordOllamaEvent;
      const hintTtlSec = opts.hintTtlSec ?? envInt("PRISM_FLEET_REAPER_HINT_TTL_SEC") ?? DEFAULT_HINT_TTL_SEC;
      // keep-alive resolved HERE (not deep inside prewarmOllama) so it threads
      // through the same opts→env→default layer as every sibling coordinator
      // knob — and so a test injecting runSweep({ keepAlive }) is honoured.
      const keepAlive = opts.keepAlive
        || process.env.PRISM_FLEET_REAPER_OLLAMA_KEEP_ALIVE || DEFAULT_OLLAMA_KEEP_ALIVE;

      if (actionsAllowed) {
        // Pre-warm — fire-and-forget; never blocks.
        if (decision.shouldPrewarm) {
          const pw = prewarmOllama(decision.prewarmModel, {
            ollamaUrl: opts.ollamaUrl, keepAlive, spawnImpl: opts.prewarmSpawn,
          });
          coordinator.prewarmFired = pw.fired;
          coordinator.prewarmError = pw.error;
          if (pw.error) caveats.push(`ollama prewarm failed: ${pw.error}`);
          recordEvent({
            hook: "fleet-reaper-coordinator", decision: "suggest",
            category: "fleet-reaper-prewarm",
            extras: { mode: "prewarm", model: decision.prewarmModel, fired: pw.fired },
          });
        }
        // Routing hint — always (re)written when the coordinator evaluated, so
        // a stale aggressive hint is neutralized to "auto" on the next sweep.
        const hr = (opts.writeHint || writeRoutingHint)(decision, {
          now, path: opts.hintPath, hintTtlSec,
        });
        coordinator.hintWritten = hr.written;
        coordinator.hintMode = hr.mode;
        coordinator.hintError = hr.error;
        if (hr.error) caveats.push(`ollama routing-hint write failed: ${hr.error}`);
        if (hr.written && hr.mode === "aggressive-offload") {
          recordEvent({
            hook: "fleet-reaper-coordinator", decision: "suggest",
            category: "fleet-reaper-hint",
            extras: { mode: "hint", thresholdDelta: hr.thresholdDelta, hintReason: decision.reason },
          });
        }
      }
    } catch (err) {
      // Defense in depth: every coordinator function guards itself — but never
      // let the GPU/Ollama layer abort the sweep.
      coordinator.error = err && err.message ? err.message : String(err);
      caveats.push(`coordinator step failed: ${coordinator.error}`);
    }
  }

  // `ok` reflects ONLY the reap mission — its MS0 contract. The CLI exit code,
  // the Stop hook, and the Monitor loop all read `ok` as "the reaper did its
  // core job." Soft-relief + coordinator are advisory layers: their errors are
  // surfaced loudly (caveats + softRelief.error / coordinator.error fields +
  // summarize/monitorEvent lines + logSweep) but must NOT flip the load-bearing
  // verdict — an Ollama glitch can't be allowed to exit-1 a scheduled task.
  const ok = reapFailed === 0;

  return {
    ok,
    now,
    mode,
    disabled,
    dryRun,
    config: {
      intervalSec, ageFloorSec, killAfter, effectiveKillAfter, memPressurePct,
      memCriticalPct, softReliefAgeSec, softReliefPressurePct, noRelief, noCoord,
    },
    mem,
    underPressure,
    pressureTier,
    criticalPressure,
    blockedBy,
    slots: snap.counts,
    slotsResolved: snap.slotsResolved !== false,
    caveats,
    candidates: candidateReport,
    pending: candidateReport.filter((c) => !c.willReap).length,
    reaped,
    reapedOk,
    reapFailed,
    softRelief,
    gpu,
    ollama,
    dockerHealth,
    coordinator,
    ledgerPath,
  };
}

/**
 * FLEET-REAPER-MS1 Tier 1 — graduated memory-pressure → confirm-tick gate.
 *
 * Replaces the prior binary `underPressure ? min(killAfter,1) : killAfter`
 * with three bands:
 *   usedPct < warnPct                 → killAfter          (normal)
 *   warnPct  <= usedPct < criticalPct → min(killAfter, 1)   (warn — eager)
 *   usedPct  >= criticalPct           → 0                    (critical — reap now)
 *
 * Pure: no clock, env, or I/O. Fail-safe by construction —
 *  • non-finite / negative usedPct (a missing or bogus memory read) is treated
 *    as "no pressure signal" → killAfter unchanged (a blind sweep must never
 *    escalate reaping).
 *  • criticalPct misconfigured below warnPct is floored up to warnPct so the
 *    ≥critical band is always reachable (the two bands collapse, never invert).
 *  • non-finite killAfter → 0; a negative confirm window is meaningless so it
 *    is floored at 0.
 *
 * @param {number} usedPct      worst-of phys/commit memory %, or non-finite
 * @param {number} warnPct      lower band edge (== memPressurePct, default 90)
 * @param {number} criticalPct  upper band edge (default 95)
 * @param {number} killAfter    base confirm-tick window
 * @returns {{tier:'normal'|'warn'|'critical', effectiveKillAfter:number}}
 */
export function tierFromPressure(usedPct, warnPct, criticalPct, killAfter) {
  const ka = Number.isFinite(killAfter) ? Math.max(0, Math.trunc(killAfter)) : 0;
  const warn = Number.isFinite(warnPct) ? warnPct : DEFAULT_MEM_PRESSURE_PCT;
  let crit = Number.isFinite(criticalPct) ? criticalPct : DEFAULT_MEM_CRITICAL_PCT;
  if (crit < warn) crit = warn;
  if (!Number.isFinite(usedPct) || usedPct < 0) {
    return { tier: "normal", effectiveKillAfter: ka };
  }
  if (usedPct >= crit) return { tier: "critical", effectiveKillAfter: 0 };
  if (usedPct >= warn) return { tier: "warn", effectiveKillAfter: Math.min(ka, 1) };
  return { tier: "normal", effectiveKillAfter: ka };
}

function clampInt(value, fallback, min, max) {
  // `null` and `undefined` must short-circuit to fallback BEFORE Number() —
  // `Number(null) === 0` which is finite, so without this guard a null upstream
  // (e.g. envInt() returning null for an unset env var, then `?? null`) silently
  // clamps to `min` instead of using the meaningful default. That bug
  // manifested as soft-relief firing at 1% pressure instead of 90%.
  if (value === null || value === undefined) value = fallback;
  const n = Number(value);
  // Clamp the fallback too — a misconfigured default should still land in range.
  const base = Number.isFinite(n) ? Math.trunc(n) : fallback;
  return Math.min(max, Math.max(min, base));
}

// ─── Logging ────────────────────────────────────────────────────────────────

function logSweep(result, logPath = DEFAULT_LOG_PATH) {
  try {
    mkdirSync(dirname(logPath), { recursive: true });
    try {
      const st = statSync(logPath);
      if (st.size > LOG_ROTATE_BYTES) {
        const rotated = `${logPath}.1`;
        try { if (existsSync(rotated)) unlinkSync(rotated); } catch { /* */ }
        renameSync(logPath, rotated);
      }
    } catch { /* no log yet — fine */ }
    const sr = result.softRelief || {};
    const co = result.coordinator || {};
    const gpu = result.gpu || {};
    const ol = result.ollama || {};
    const line = JSON.stringify({
      ts: new Date(result.now).toISOString(),
      mode: result.mode,
      reaped: result.reaped.map((r) => ({
        pid: r.pid, name: r.name, class: r.class, ownerSlot: r.ownerSlot,
        killed: r.killed, dryRun: r.dryRun, error: r.error,
      })),
      reapedOk: result.reapedOk,
      reapFailed: result.reapFailed,
      pending: result.pending,
      memUsedPct: result.mem.usedPct,
      underPressure: result.underPressure,
      blockedBy: result.blockedBy,
      dryRun: result.dryRun,
      disabled: result.disabled,
      // FLEET-REAPER-MS1: soft relief + coordinator outcomes.
      softRelief: {
        priorityDemoted: sr.priorityDemoted || 0,
        workingSetTrimmed: sr.workingSetTrimmed || 0,
        rssReclaimedBytes: sr.rssReclaimedBytes || 0,
        targets: sr.targets || 0,
        error: sr.error || null,
      },
      gpu: { available: !!gpu.available, freeMb: gpu.freeMb ?? null, utilizationPct: gpu.utilizationPct ?? null },
      ollama: { reachable: !!ol.reachable, loaded: Array.isArray(ol.loaded) ? ol.loaded.length : 0 },
      coordinator: {
        evaluated: !!co.evaluated,
        prewarmFired: !!co.prewarmFired,
        hintWritten: !!co.hintWritten,
        hintMode: co.hintMode || null,
        thresholdDelta: co.thresholdDelta || 0,
        skipped: co.skipped || null,
        error: co.error || co.prewarmError || co.hintError || null,
      },
      caveats: result.caveats,
    });
    appendFileSync(logPath, line + "\n", "utf8");
  } catch { /* logging is best-effort, never fatal */ }
}

/** True when a sweep result is worth a log line / a Monitor event (vs a quiet no-op). */
function isNoteworthy(result) {
  const sr = result.softRelief;
  const co = result.coordinator;
  return (
    result.reaped.length > 0 ||
    result.underPressure ||
    result.caveats.length > 0 ||
    !result.ok ||
    // FLEET-REAPER-MS1: a degraded chat-slots read suppresses leftover-bash-task
    // classification — safety-relevant, always surface it.
    result.slotsResolved === false ||
    // soft relief acted, or the coordinator pre-warmed / wrote an aggressive
    // hint, or an advisory layer errored — all worth a Monitor event + log line.
    !!(sr && (sr.priorityDemoted > 0 || sr.workingSetTrimmed > 0 || sr.error)) ||
    !!(co && (co.prewarmFired || (co.hintWritten && co.shouldHintOffload) || co.error))
  );
}

/** Human-readable byte size — "1.2G" / "812M" / "0". */
function fmtBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(1)}G`;
  if (n >= 1024 * 1024) return `${Math.round(n / (1024 * 1024))}M`;
  return `${Math.round(n / 1024)}K`;
}

// ─── Human summary ──────────────────────────────────────────────────────────

export function summarize(result) {
  const m = result.mem;
  const memStr = Number.isFinite(m.usedPct)
    ? `${m.usedPct}%${result.criticalPressure ? " 🔴 CRITICAL" : result.underPressure ? " ⚠ PRESSURE" : ""}`
    : "n/a";
  const lines = [];
  const tag = result.dryRun ? " [dry-run]" : result.disabled ? " [DISABLED]" : "";
  lines.push(
    `fleet-reaper (${result.mode})${tag}: ${result.reapedOk} reaped, ` +
    `${result.pending} pending, ${result.candidates.length} candidate(s), mem ${memStr}`,
  );
  // `result.slots` is snap.counts — keyed by PROCESS class, not by slot. Label
  // it "procs" so a reader never mistakes "12 alive" for "12 live chat slots".
  lines.push(
    `  procs: ${result.slots["owned-by-alive"] || 0} alive · ` +
    `${result.slots["owned-by-stale"] || 0} stale · ` +
    `${result.slots["owned-by-crashed"] || 0} crashed-owned · ` +
    `${result.slots["leftover-bash-task"] || 0} leftover-bash · ` +
    `${result.slots.unowned || 0} unowned · ${result.slots.protected || 0} protected`,
  );
  for (const c of result.candidates) {
    const owner = c.ownerSlot ? `slot ${c.ownerSlot}/${c.ownerStatus}` : c.class;
    const age = Number.isFinite(c.ageMs) ? `${Math.round(c.ageMs / 1000)}s` : "age?";
    const mark = c.willReap ? "→ REAP" : "· hold";
    lines.push(`  ${mark} pid ${c.pid} ${c.name} (${owner}, ${age}) — ${c.decision}`);
  }
  for (const r of result.reaped) {
    const verb = r.dryRun ? "would reap" : r.killed ? "reaped" : "FAILED to reap";
    lines.push(`  ${verb} pid ${r.pid} ${r.name}${r.error ? ` — ${r.error}` : ""}`);
  }
  // ── FLEET-REAPER-MS1: soft relief ──
  const sr = result.softRelief;
  if (sr && (sr.attempted || sr.targets > 0)) {
    const verb = sr.dryRun ? "would nudge" : "nudged";
    lines.push(
      `  soft-relief: ${verb} ${sr.priorityDemoted} priority · ${sr.workingSetTrimmed} working-set` +
      `${sr.rssReclaimedBytes > 0 ? ` (~${fmtBytes(sr.rssReclaimedBytes)} reclaimed)` : ""}` +
      ` · ${sr.targets} stale-slot target(s)${sr.error ? ` — ERROR ${sr.error}` : ""}`,
    );
  }
  // ── FLEET-REAPER-MS1: GPU + Ollama + coordinator ──
  const gpu = result.gpu;
  if (gpu && gpu.available) {
    lines.push(
      `  gpu: ${gpu.name} ${fmtBytes((gpu.freeMb || 0) * 1024 * 1024)} free / ` +
      `${fmtBytes((gpu.totalMb || 0) * 1024 * 1024)} · ${gpu.utilizationPct ?? "?"}% util`,
    );
  } else if (gpu && gpu.reason) {
    lines.push(`  gpu: unavailable — ${gpu.reason}`);
  }
  const ol = result.ollama;
  if (ol && ol.reachable) {
    const loadedStr = ol.loaded && ol.loaded.length
      ? ol.loaded.map((l) => `${l.model}${l.sizeMb ? ` (${fmtBytes(l.sizeMb * 1024 * 1024)})` : ""}`).join(", ")
      : "no model loaded";
    lines.push(`  ollama: reachable · loaded: ${loadedStr}`);
  } else if (ol && ol.reason) {
    lines.push(`  ollama: unreachable — ${ol.reason}`);
  }
  const co = result.coordinator;
  if (co && co.evaluated) {
    if (co.prewarmFired) {
      lines.push(`  prewarm: fired ${co.prewarmModel} (keep_alive)${co.prewarmError ? ` — ERROR ${co.prewarmError}` : ""}`);
    }
    if (co.hintWritten) {
      lines.push(
        `  hint: ${co.hintMode} Δ=${co.thresholdDelta} — ${co.reason}` +
        `${co.shouldHintOffload ? " → ollama-task-offloader will absorb more" : " (neutralized)"}`,
      );
    } else if (co.hintError) {
      lines.push(`  hint: write FAILED — ${co.hintError}`);
    } else if (co.skipped) {
      lines.push(`  coordinator: skipped — ${co.skipped}`);
    }
  }
  for (const cv of result.caveats) lines.push(`  caveat: ${cv}`);
  if (result.blockedBy && result.candidates.some((c) => c.willReap)) {
    lines.push(`  (reap suppressed: ${result.blockedBy})`);
  }
  return lines.join("\n");
}

/** Compact one-line event for the Monitor loop (only emitted when noteworthy). */
function monitorEvent(result) {
  const parts = [`[${new Date(result.now).toISOString()}] fleet-reaper`];
  if (result.reaped.length) {
    const ok = result.reapedOk;
    const fail = result.reapFailed;
    const dry = result.reaped.filter((r) => r.dryRun).length;
    const pids = result.reaped.map((r) => `${r.pid}(${r.ownerSlot || r.class})`).join(", ");
    parts.push(dry ? `would reap ${dry}: ${pids}` : `reaped ${ok}${fail ? `, ${fail} FAILED` : ""}: ${pids}`);
  }
  if (result.underPressure) {
    parts.push(`memory pressure ${result.mem.usedPct}% — kill-after → ${result.config.effectiveKillAfter}`);
  }
  // FLEET-REAPER-MS1: surface soft relief + coordinator activity in the feed.
  const sr = result.softRelief;
  if (sr && (sr.priorityDemoted > 0 || sr.workingSetTrimmed > 0)) {
    parts.push(
      `soft-relief: ${sr.priorityDemoted} priority + ${sr.workingSetTrimmed} working-set` +
      `${sr.rssReclaimedBytes > 0 ? ` (~${fmtBytes(sr.rssReclaimedBytes)})` : ""}`,
    );
  }
  const co = result.coordinator;
  if (co && co.prewarmFired) parts.push(`ollama prewarm: ${co.prewarmModel}`);
  if (co && co.hintWritten && co.shouldHintOffload) {
    parts.push(`ollama hint: aggressive-offload Δ=${co.thresholdDelta}`);
  }
  // Advisory-layer errors are surfaced explicitly — they no longer flip
  // `result.ok` (that stays reap-mission-only), so the monitor must name them.
  if (sr && sr.error) parts.push(`soft-relief ERROR: ${sr.error}`);
  if (co && co.error) parts.push(`coordinator ERROR: ${co.error}`);
  if (result.slotsResolved === false) parts.push("chat-slots unreadable — leftover-bash class suppressed");
  if (result.caveats.length) parts.push(`caveat: ${result.caveats[0]}`);
  // reapFailed is already named inside the `reaped` line above when reaps were
  // attempted — only add the standalone catch-all when that line didn't fire.
  if (result.reapFailed > 0 && !result.reaped.length) parts.push(`${result.reapFailed} reap FAILED`);
  return parts.join(" — ");
}

// ─── Monitor loop ───────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function monitorLoop(cfg) {
  const intervalMs = clampInt(cfg.intervalSec, DEFAULT_INTERVAL_SEC, MIN_INTERVAL_SEC, MAX_INTERVAL_SEC) * 1000;
  // One armed-event so the Monitor tool shows the watch is live.
  process.stdout.write(
    `[${new Date().toISOString()}] fleet-reaper monitor armed — interval ${intervalMs / 1000}s, ` +
    `kill-after ${cfg.killAfter}, age-floor ${cfg.ageFloorSec}s, dry-run ${!!cfg.dryRun}\n`,
  );
  for (;;) {
    let result;
    try {
      result = runSweep({ ...cfg, mode: "once" });
    } catch (err) {
      // A sweep must never kill the monitor — emit the error as an event and continue.
      process.stdout.write(`[${new Date().toISOString()}] fleet-reaper ERROR: ${err?.message || err}\n`);
      await sleep(intervalMs);
      continue;
    }
    if (isNoteworthy(result)) {
      process.stdout.write(monitorEvent(result) + "\n");
      logSweep(result);
    }
    await sleep(intervalMs);
  }
}

// ─── CLI ────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const args = {
    once: false, monitorLoop: false, status: false, stopEvent: false,
    detach: false, dryRun: false, json: false, help: false,
    noCoord: false, noRelief: false,
    intervalSec: null, ageFloorSec: null, killAfter: null,
  };
  const errors = [];
  const takesValue = { "--interval": "intervalSec", "--age-floor": "ageFloorSec", "--kill-after": "killAfter" };
  const boolFlags = new Set([
    "--once", "--monitor-loop", "--status", "--stop-event", "--detach",
    "--dry-run", "--json", "--help", "-h", "--no-coord", "--no-relief",
  ]);
  for (let i = 0; i < argv.length; i += 1) {
    let raw = argv[i];
    let inlineValue = null;
    const eq = raw.indexOf("=");
    if (raw.startsWith("--") && eq !== -1) {
      inlineValue = raw.slice(eq + 1);
      raw = raw.slice(0, eq);
    }
    // A boolean flag with `=value` (e.g. `--detach=foo`) is rejected outright —
    // silently accepting it would, for `--detach`, survive the childArgs filter
    // and re-spawn forever.
    if (inlineValue != null && boolFlags.has(raw)) {
      errors.push(`${raw} does not take a value`);
      continue;
    }
    if (raw === "--once") args.once = true;
    else if (raw === "--monitor-loop") args.monitorLoop = true;
    else if (raw === "--status") args.status = true;
    else if (raw === "--stop-event") args.stopEvent = true;
    else if (raw === "--detach") args.detach = true;
    else if (raw === "--dry-run") args.dryRun = true;
    else if (raw === "--json") args.json = true;
    else if (raw === "--no-coord") args.noCoord = true;
    else if (raw === "--no-relief") args.noRelief = true;
    else if (raw === "--help" || raw === "-h") args.help = true;
    else if (takesValue[raw]) {
      const v = inlineValue != null ? inlineValue : argv[++i];
      // `--interval=` (empty inline value) and a missing trailing value both
      // surface as an error rather than silently coercing Number("") → 0.
      if (v == null || v === "") {
        errors.push(`${raw} expects a number, got an empty value`);
      } else {
        const n = Number(v);
        if (!Number.isFinite(n)) errors.push(`${raw} expects a number, got '${v}'`);
        else args[takesValue[raw]] = n;
      }
    } else {
      errors.push(`unknown argument '${argv[i]}'`);
    }
  }
  if ([args.monitorLoop, args.status].filter(Boolean).length > 1) {
    errors.push("--monitor-loop and --status are mutually exclusive");
  }
  if (args.monitorLoop && (args.once || args.stopEvent)) {
    errors.push("--monitor-loop cannot be combined with --once / --stop-event");
  }
  if (args.monitorLoop && args.detach) {
    errors.push("--monitor-loop cannot be combined with --detach (would orphan a silent daemon)");
  }
  return { args, errors };
}

/** Merge CLI args over env knobs over built-in defaults. */
export function resolveConfig(args, env = process.env) {
  const envInt = (name) => {
    const n = Number(env[name]);
    return Number.isFinite(n) ? n : null;
  };
  return {
    intervalSec: args.intervalSec ?? envInt("PRISM_FLEET_REAPER_INTERVAL_SEC") ?? DEFAULT_INTERVAL_SEC,
    ageFloorSec: args.ageFloorSec ?? envInt("PRISM_FLEET_REAPER_AGE_FLOOR_SEC") ?? DEFAULT_AGE_FLOOR_SEC,
    killAfter: args.killAfter ?? envInt("PRISM_FLEET_REAPER_KILL_AFTER") ?? DEFAULT_KILL_AFTER,
    memPressurePct: envInt("PRISM_FLEET_REAPER_MEM_PRESSURE_PCT") ?? DEFAULT_MEM_PRESSURE_PCT,
    memCriticalPct: envInt("PRISM_FLEET_REAPER_MEM_CRITICAL_PCT") ?? DEFAULT_MEM_CRITICAL_PCT,
    dryRun: !!args.dryRun || env.PRISM_FLEET_REAPER_DRY_RUN === "1",
    // FLEET-REAPER-MS1: CLI flags OR env disable the soft-relief / coordinator
    // layers. The numeric tuning knobs (age, pressure %, gpu floor, hint TTL/Δ)
    // are read directly by runSweep with env fallback — they need no CLI flag.
    noRelief: !!args.noRelief || env.PRISM_FLEET_REAPER_SOFT_RELIEF_DISABLE === "1",
    noCoord: !!args.noCoord || env.PRISM_FLEET_REAPER_OLLAMA_COORD_DISABLE === "1",
  };
}

function usage() {
  return [
    "fleet-reaper-sweep.mjs — slot-aware orphan process reaper + RAM/CPU/GPU coordinator.",
    "",
    "Usage:",
    "  node fleet-reaper-sweep.mjs [--once] [--json] [--dry-run]   one sweep (default)",
    "  node fleet-reaper-sweep.mjs --status                       report only, no write/reap",
    "  node fleet-reaper-sweep.mjs --monitor-loop [--interval SEC] poll forever (Monitor tool)",
    "  node fleet-reaper-sweep.mjs --once --stop-event --detach    Stop-hook seam (returns at once)",
    "",
    "Flags: --kill-after N · --age-floor SEC · --interval SEC · --detach · --json · --dry-run · -h",
    "  --detach     re-spawn the sweep detached and return immediately (tight-budget callers)",
    "  --no-relief  skip Layer 1 (soft RAM/CPU relief — priority demote + working-set trim)",
    "  --no-coord   skip Layers 2-3 (GPU/Ollama probe + coordinator pre-warm + routing hint)",
    "Env knobs: PRISM_FLEET_REAPER_{DISABLE,DRY_RUN,KILL_AFTER,AGE_FLOOR_SEC,INTERVAL_SEC,",
    "  MEM_PRESSURE_PCT,MEM_CRITICAL_PCT,SOFT_RELIEF_DISABLE,SOFT_RELIEF_AGE_SEC,SOFT_RELIEF_PRESSURE_PCT,",
    "  OLLAMA_COORD_DISABLE,GPU_DISABLE,GPU_FREE_MIN_MB,HINT_TTL_SEC,HINT_THRESHOLD_DELTA,",
    "  OLLAMA_PREWARM_MODEL,OLLAMA_KEEP_ALIVE} · OLLAMA_URL",
    "",
    "Exit codes: 0 ok · 1 sweep completed but reported a problem · 2 misuse.",
  ].join("\n");
}

async function main() {
  const { args, errors } = parseArgs(process.argv.slice(2));
  if (errors.length) {
    for (const e of errors) process.stderr.write(`fleet-reaper-sweep: ${e}\n`);
    process.stderr.write(usage() + "\n");
    process.exit(2);
  }
  if (args.help) {
    process.stdout.write(usage() + "\n");
    return;
  }

  // Fast-return seam for the Stop hook: re-spawn ourselves detached so a caller
  // with a tight time budget (a Stop hook) never blocks on the ~1-30s sweep.
  if (args.detach) {
    const childArgs = process.argv.slice(2).filter((a) => a !== "--detach");
    const child = spawn(
      process.execPath, [fileURLToPath(import.meta.url), ...childArgs],
      { detached: true, stdio: "ignore", windowsHide: true },
    );
    child.unref();
    process.stdout.write(`fleet-reaper-sweep: detached sweep spawned (pid ${child.pid ?? "?"})\n`);
    return;
  }

  const cfg = resolveConfig(args);

  if (args.monitorLoop) {
    await monitorLoop(cfg); // runs until the process is killed
    return;
  }

  // `stop-event` runs the IDENTICAL sweep as `once` — the distinct mode is a
  // telemetry label only (it tags the log line so Stop-triggered sweeps are
  // attributable). It is intentionally neither more nor less aggressive.
  const mode = args.status ? "status" : args.stopEvent ? "stop-event" : "once";
  const result = runSweep({ ...cfg, mode });

  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    process.stdout.write(summarize(result) + "\n");
  }
  if (mode !== "status" && isNoteworthy(result)) logSweep(result);

  process.exit(result.ok ? 0 : 1);
}

// Guard against import-side execution: the test file imports this module, and an
// unconditional main() would fork PowerShell against the live OS and call
// process.exit() inside the vitest worker. Mirrors cleanup-orchestrator.mjs.
const invokedAsCli = (() => {
  try {
    if (!process.argv[1]) return false;
    return pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
  } catch {
    return false;
  }
})();

if (invokedAsCli) {
  main().catch((err) => {
    const detail = String(err?.stack || err);
    process.stderr.write(`fleet-reaper-sweep: fatal: ${detail}\n`);
    // Fail loud AND durably — leave an on-disk trace (mirrors cleanup-orchestrator.mjs).
    try {
      mkdirSync(SHARED_DIR, { recursive: true });
      appendFileSync(
        DEFAULT_LOG_PATH,
        JSON.stringify({ ts: new Date().toISOString(), fatal: detail }) + "\n",
        "utf8",
      );
    } catch { /* best-effort */ }
    process.exit(1);
  });
}
