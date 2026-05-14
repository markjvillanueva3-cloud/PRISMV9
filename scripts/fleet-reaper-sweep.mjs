#!/usr/bin/env node
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
 *   - under memory pressure (commit/physical >= memPressurePct) killAfter drops
 *     to 1 for that sweep — relieve faster when the box is actually struggling.
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

// ─── Paths & constants ──────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const SHARED_DIR = join(REPO_ROOT, "state", "shared");
const DEFAULT_LEDGER_PATH = join(SHARED_DIR, "fleet-reaper-candidates.json");
const DEFAULT_LOG_PATH = join(SHARED_DIR, "fleet-reaper.log");
const LOG_ROTATE_BYTES = 256 * 1024;

export const LEDGER_SCHEMA_VERSION = 1;
export const DEFAULT_INTERVAL_SEC = 300;
export const DEFAULT_AGE_FLOOR_SEC = 45;
export const DEFAULT_KILL_AFTER = 2;
export const DEFAULT_MEM_PRESSURE_PCT = 90;

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

// ─── One sweep ──────────────────────────────────────────────────────────────

/**
 * Run a single sweep. Fully injectable — every OS touch point has an opts seam
 * so tests run against synthetic data and never kill a real process.
 *
 * @param {object} [opts]
 *   mode            "once" | "stop-event" | "status"  (status = read-only)
 *   dryRun          classify + decide but never kill
 *   intervalSec, ageFloorSec, killAfter, memPressurePct  config
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
  const underPressure = Number.isFinite(mem.usedPct) && mem.usedPct >= memPressurePct;
  const effectiveKillAfter = underPressure ? Math.min(killAfter, 1) : killAfter;
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
  const ok = reapFailed === 0;

  return {
    ok,
    now,
    mode,
    disabled,
    dryRun,
    config: { intervalSec, ageFloorSec, killAfter, effectiveKillAfter, memPressurePct },
    mem,
    underPressure,
    blockedBy,
    slots: snap.counts,
    caveats,
    candidates: candidateReport,
    pending: candidateReport.filter((c) => !c.willReap).length,
    reaped,
    reapedOk,
    reapFailed,
    ledgerPath,
  };
}

function clampInt(value, fallback, min, max) {
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
      caveats: result.caveats,
    });
    appendFileSync(logPath, line + "\n", "utf8");
  } catch { /* logging is best-effort, never fatal */ }
}

/** True when a sweep result is worth a log line / a Monitor event (vs a quiet no-op). */
function isNoteworthy(result) {
  return (
    result.reaped.length > 0 ||
    result.underPressure ||
    result.caveats.length > 0 ||
    !result.ok
  );
}

// ─── Human summary ──────────────────────────────────────────────────────────

export function summarize(result) {
  const m = result.mem;
  const memStr = Number.isFinite(m.usedPct)
    ? `${m.usedPct}%${result.underPressure ? " ⚠ PRESSURE" : ""}`
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
  if (result.caveats.length) parts.push(`caveat: ${result.caveats[0]}`);
  if (!result.ok && !result.reapFailed) parts.push("sweep reported a problem");
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
    intervalSec: null, ageFloorSec: null, killAfter: null,
  };
  const errors = [];
  const takesValue = { "--interval": "intervalSec", "--age-floor": "ageFloorSec", "--kill-after": "killAfter" };
  const boolFlags = new Set([
    "--once", "--monitor-loop", "--status", "--stop-event", "--detach",
    "--dry-run", "--json", "--help", "-h",
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
    dryRun: !!args.dryRun || env.PRISM_FLEET_REAPER_DRY_RUN === "1",
  };
}

function usage() {
  return [
    "fleet-reaper-sweep.mjs — slot-aware orphan process reaper for the 7-chat fleet.",
    "",
    "Usage:",
    "  node fleet-reaper-sweep.mjs [--once] [--json] [--dry-run]   one sweep (default)",
    "  node fleet-reaper-sweep.mjs --status                       report only, no write/reap",
    "  node fleet-reaper-sweep.mjs --monitor-loop [--interval SEC] poll forever (Monitor tool)",
    "  node fleet-reaper-sweep.mjs --once --stop-event --detach    Stop-hook seam (returns at once)",
    "",
    "Flags: --kill-after N · --age-floor SEC · --interval SEC · --detach · --json · --dry-run · -h",
    "  --detach   re-spawn the sweep detached and return immediately (for callers with a tight budget)",
    "Env knobs: PRISM_FLEET_REAPER_{DISABLE,DRY_RUN,KILL_AFTER,AGE_FLOOR_SEC,INTERVAL_SEC,MEM_PRESSURE_PCT}",
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
