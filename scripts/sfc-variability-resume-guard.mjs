#!/usr/bin/env node
/**
 * SFC-ACCURACY-MS1 — Variability batch resume-guard (watchdog). v4.
 *
 * The Stage-2 batch (`sfc-variability-batch-run.mjs`) is a multi-day workload
 * toward billions of compatibility-filtered combos. It has died TWICE on
 * machine switches (the H: drive is shared across PCs; disk state survives,
 * processes do not). This guard makes the batch self-resuming so it survives
 * machine switches, reboots, and session ends without manual relaunch.
 *
 * ── TWO-TASK ARCHITECTURE (why the guard does NOT spawn the batch) ───────
 * A process spawned as a child of a Windows Scheduled-Task process lives in
 * that task's job object; when the task instance ends, Task Scheduler closes
 * the job and KILLS the children — a detached `spawn` would NOT survive the
 * guard's own 5-minute task instance exiting (livelock: relaunch → exit →
 * batch killed → relaunch …). So the guard does NOT spawn the batch.
 * Instead `install-sfc-variability-task.ps1` registers THREE tasks:
 *   • "PRISM SFC Variability Guard"        — runs THIS script every 5 min.
 *   • "PRISM SFC Variability Batch Mill"   — on-demand; action = the launcher
 *   • "PRISM SFC Variability Batch Lathe"  — on-demand; action = the launcher
 * The guard's relaunch step is `schtasks /run` of the per-domain batch task.
 * A Task-Scheduler-launched task runs under ITS OWN job object, independent
 * of the guard — so the batch outlives the guard pass that triggered it.
 * The launcher (`sfc-variability-launch.mjs`) reads the resume-state sidecar
 * (which the guard writes BEFORE triggering) and execs the batch.
 *
 * ── RESUME-SKIP CORRECTNESS (the load-bearing property) ──────────────────
 * The batch with `--skip S --workers N` runs N children; child w processes
 * combos whose global enumerator index satisfies `idx > S` AND
 * `(idx-1) % N === w`. The enumerator is deterministic and NOT itself
 * resumable — `--skip` only suppresses OUTPUT for `idx ≤ S`. Chunk files are
 * named by `chunkStartIdx` (== `--skip` for a worker's first file), NOT by
 * the highest index they contain. Therefore a resume point CANNOT be derived
 * from filenames — it must come from the `idx` field inside the records.
 *
 * Workers die at DIFFERENT frontiers (independent processes). A single
 * global `--skip` is applied to all N workers on relaunch, so the only
 * choice that loses NO combo is:
 *
 *     skip = min over workers w∈[0,N) of ( max record idx written by w )
 *
 * A worker that flushed ZERO records did not advance past the prior run's
 * launch `--skip`, so its frontier is exactly that prior launch skip — NOT
 * 0. The prior launch skip is recovered from a per-domain RESUME-STATE
 * SIDECAR (`.resume-state.json`) the guard writes on every relaunch. No
 * sidecar (first run / lost) + a zero-record worker ⇒ skip 0 (a genuinely
 * unknown prior state ⇒ safe full redo; rare).
 *
 * Re-processed combos (workers between minFrontier and their own frontier)
 * are byte-identical (deterministic enumerator + SAME --workers/--chunk).
 * The relaunch's `chunkStartIdx` differs from the original run's, so the
 * new chunk FILENAMES do NOT overwrite the originals — they coexist. The
 * SOLE rework-dedup mechanism is the fingerprint Map in
 * `sfc-variability-cache.mjs` (Stage-6) / the Stage-4 emitter, which is
 * fp-keyed: duplicate combos resolve to one identical value.
 *
 * Resume is ONLY valid when the relaunch uses the SAME --workers as the
 * original run (the round-robin partition depends on N). The authoritative
 * prior N is the sidecar's `workers`; absent a sidecar, a mismatch is
 * declared ONLY when a chunk filename carries a worker index ≥ the
 * configured N. A SUBSET of workers having flushed is NOT a mismatch.
 *
 * ── CROSS-PC ──────────────────────────────────────────────────────────────
 * H: is shared across both PCs but process enumeration is host-local. The
 * sidecar's `host` + `ts` is the only cross-host signal. The guard REFRESHES
 * the sidecar `ts` on every pass it observes the batch alive on THIS host —
 * so a healthy guard-managed batch keeps its own cross-host window perpetually
 * fresh. `decideHostOwnership` uses a cadence-scaled staleness window
 * (HOST_STALENESS_MIN, ≈3× the 5-min guard cadence) — NOT the batch runtime:
 * a sidecar from another host refreshed within that window ⇒ batch presumed
 * alive there ⇒ no relaunch; a stale sidecar ⇒ that host's guard stopped
 * refreshing ⇒ the batch is dead there ⇒ safe to take over.
 *
 * The guard re-checks every cadence, so even a transient mis-read self-heals
 * within one interval.
 *
 * Kill switch: PRISM_SFC_VARIABILITY_GUARD_DISABLE=1 → every run no-ops.
 *
 * CLI:
 *   node scripts/sfc-variability-resume-guard.mjs \
 *     --domains mill,lathe --workers 4 --max-minutes 600 \
 *     --chunk 50 [--dry-run]
 *
 * Process enumeration + task trigger use spawnSync (shell-free, fixed argv —
 * no shell injection surface). Pure functions are exported for hermetic
 * testing; the IO shell takes injected deps so tests never trigger a task.
 */

import { spawnSync } from "node:child_process";
import {
  readdirSync, readFileSync, openSync, closeSync, unlinkSync,
  statSync, appendFileSync, mkdirSync, writeFileSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hostname as osHostname } from "node:os";

const PROJECT_ROOT = resolve(fileURLToPath(import.meta.url), "../..");

// Defaults mirror the proven-working v5 batch invocation.
const DEFAULT_WORKERS = 4;
const DEFAULT_MAX_MINUTES = 600;
const DEFAULT_CHUNK = 50;
const GUARD_CADENCE_MIN = 5;       // the scheduled-task fire interval
const HOST_STALENESS_MIN = 15;     // 3× cadence — cross-PC liveness window
const LOCK_STALE_MIN = 10;
const SEC_PER_MIN = 60;
const MS_PER_SEC = 1000;
const MIN_TO_MS = SEC_PER_MIN * MS_PER_SEC;
const LOCK_STALE_MS = LOCK_STALE_MIN * MIN_TO_MS;   // a hung guard never wedges the next
const HOST_STALENESS_MS = HOST_STALENESS_MIN * MIN_TO_MS;
const SUBPROCESS_TIMEOUT_MS = 20000; // bound for the proc-enum + schtasks spawnSync calls
const ERR_MSG_MAX = 200;
const TELEMETRY_SCHEMA = "1.0.0";
const RESUME_STATE_FILE = ".resume-state.json";
const RESUME_STATE_SCHEMA = "1.0.0";
const GUARD_TASK_NAME = "PRISM SFC Variability Guard";
const BATCH_TASK_PREFIX = "PRISM SFC Variability Batch ";
// chunk-w<workerIdx>-<12-digit chunkStartIdx>.jsonl
const CHUNK_RE = /^chunk-w(\d+)-(\d+)\.jsonl$/;
const VALID_DOMAINS = new Set(["mill", "lathe"]);

// ─── PURE CORE (exported, hermetically testable) ─────────────────────────

/** The on-demand Scheduled-Task name for a domain's batch. */
function batchTaskName(domain) {
  const d = String(domain);
  return BATCH_TASK_PREFIX + d.charAt(0).toUpperCase() + d.slice(1);
}

/**
 * Parse `{workerIdx, startIdx}` out of a chunk filename, or null.
 * Both must be finite non-negative integers.
 */
function parseChunkName(filename) {
  if (typeof filename !== "string") return null;
  const m = CHUNK_RE.exec(filename);
  if (!m) return null;
  const workerIdx = Number(m[1]);
  const startIdx = Number(m[2]);
  if (!Number.isFinite(workerIdx) || workerIdx < 0) return null;
  if (!Number.isFinite(startIdx) || startIdx < 0) return null;
  return { workerIdx, startIdx };
}

/**
 * Group chunk filenames by worker index. Returns
 * `Map<workerIdx, {file, startIdx}[]>` with each worker's list sorted
 * ascending by startIdx (== ascending write order within a worker).
 * Non-conforming names are ignored.
 */
function groupChunksByWorker(filenames) {
  const byWorker = new Map();
  if (!Array.isArray(filenames)) return byWorker;
  for (const f of filenames) {
    const p = parseChunkName(f);
    if (!p) continue;
    if (!byWorker.has(p.workerIdx)) byWorker.set(p.workerIdx, []);
    byWorker.get(p.workerIdx).push({ file: f, startIdx: p.startIdx });
  }
  for (const list of byWorker.values()) {
    list.sort((a, b) => a.startIdx - b.startIdx);
  }
  return byWorker;
}

/** Last non-empty line of a buffer, or null. */
function lastNonEmptyLine(text) {
  if (typeof text !== "string") return null;
  const lines = text.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i].trim();
    if (t.length > 0) return t;
  }
  return null;
}

/** Highest record `idx` in a single chunk's raw text (records are appended
 *  in ascending idx within a chunk, so the last line is the max). */
function maxIdxInChunkText(text) {
  const line = lastNonEmptyLine(text);
  if (line == null) return null;
  try {
    const rec = JSON.parse(line);
    const idx = Number(rec?.idx);
    return Number.isFinite(idx) && idx >= 0 ? idx : null;
  } catch {
    return null;
  }
}

/**
 * Compute a provably-no-gap resume `--skip` from per-worker frontiers.
 *
 * @param perWorkerMaxIdx  Map<workerIdx, maxIdx>  (max RECORD idx per worker)
 * @param expectedWorkers  the relaunch worker count N
 * @param priorLaunchSkip  the `--skip` the dying run was launched with,
 *                         recovered from the resume-state sidecar; null if
 *                         no sidecar exists.
 * @returns { skip, reason }
 *
 * Rule: skip = min over w∈[0,N) of frontier(w).
 *   frontier(w) = w's max RECORD idx if it flushed any chunk,
 *                 else priorLaunchSkip (a worker that flushed nothing never
 *                 durably advanced past the run's launch skip).
 * If a worker flushed nothing AND there is no sidecar, the prior launch
 * skip is genuinely unknown ⇒ skip 0 (a safe full redo; fp-dedup absorbs it).
 */
function computeResumeSkip(perWorkerMaxIdx, expectedWorkers, priorLaunchSkip) {
  const N = Number.isFinite(expectedWorkers) && expectedWorkers > 0
    ? Math.floor(expectedWorkers) : DEFAULT_WORKERS;
  const map = perWorkerMaxIdx instanceof Map ? perWorkerMaxIdx : new Map();
  const hasPrior = Number.isFinite(priorLaunchSkip) && priorLaunchSkip >= 0;
  if (map.size === 0 && !hasPrior) return { skip: 0, reason: "no prior run — fresh start" };
  let minFrontier = Infinity;
  let usedPrior = false;
  for (let w = 0; w < N; w++) {
    const fw = map.get(w);
    let frontier;
    if (Number.isFinite(fw) && fw >= 0) {
      frontier = Math.floor(fw);
    } else if (hasPrior) {
      frontier = Math.floor(priorLaunchSkip);
      usedPrior = true;
    } else {
      return { skip: 0, reason: `worker ${w} flushed no records and no sidecar — full safe redo` };
    }
    if (frontier < minFrontier) minFrontier = frontier;
  }
  // Reaching here, every worker resolved a finite frontier, so minFrontier
  // is finite (the loop ran for N ≥ 1 iterations).
  const reason = usedPrior
    ? `min-worker-frontier over ${N} (sidecar launchSkip for un-flushed workers)`
    : `min-worker-frontier over ${N} workers`;
  return { skip: minFrontier, reason };
}

/**
 * Decide whether to relaunch a domain's batch.
 *  - "alive"          → no  (idempotent)
 *  - "dead"           → yes
 *  - "indeterminate"  → no  (fail-safe)
 *  - any other value  → no  (defensive default)
 */
function decideRelaunch(aliveState) {
  if (aliveState === "alive")         return { relaunch: false, reason: "batch already alive" };
  if (aliveState === "dead")          return { relaunch: true,  reason: "no live batch — resuming" };
  if (aliveState === "indeterminate") return { relaunch: false, reason: "enumeration indeterminate — fail-safe skip" };
  return { relaunch: false, reason: `unknown alive state '${aliveState}'` };
}

/**
 * Build the argv the LAUNCHER uses to spawn the batch (exported so the
 * launcher and the guard's dry-run share one definition of the contract).
 */
function buildBatchArgv({ domain, workers, maxMinutes, chunkSize, skip, outDir }) {
  return [
    "--domain", String(domain),
    "--workers", String(workers),
    "--max-minutes", String(maxMinutes),
    "--chunk", String(chunkSize),
    "--skip", String(skip),
    "--out", outDir,
  ];
}

/**
 * Classify a domain's batch liveness from an array of node-process command
 * lines.
 *   - not an array                       → "indeterminate"
 *   - ZERO entries                       → "indeterminate" (this guard is a
 *       node process; an empty node list is a transient-WMI contradiction)
 *   - any cmdline has batch script + this domain flag → "alive"
 *   - otherwise                          → "dead"
 */
function classifyAliveFromLines(domain, lines) {
  if (!Array.isArray(lines)) return "indeterminate";
  if (lines.length === 0) return "indeterminate";
  const domainFlag = `--domain ${domain}`;
  for (const cl of lines) {
    if (typeof cl !== "string") continue;
    if (cl.includes("sfc-variability-batch-run") && cl.includes(domainFlag)) {
      return "alive";
    }
  }
  return "dead";
}

/** Validate a positive-finite numeric CLI value; throws loud on bad input. */
function requirePositiveInt(name, raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || Math.floor(n) !== n) {
    throw new Error(`invalid --${name}: '${raw}' (need a positive integer)`);
  }
  return n;
}

/**
 * Resolve the batch parameters from a resume-state sidecar, falling back to
 * the proven-working defaults for any missing / invalid field. Pure — used
 * by the launcher (`sfc-variability-launch.mjs`) to turn the guard-written
 * sidecar into a concrete batch invocation.
 *   skip:       sidecar.launchSkip if a finite ≥0 integer, else 0.
 *   workers/chunkSize/maxMinutes: sidecar value if a finite >0 integer,
 *                                 else the DEFAULT_*.
 */
function pickResumeParams(sidecar) {
  const sc = (sidecar && typeof sidecar === "object") ? sidecar : {};
  const posInt = (v, d) => (Number.isFinite(v) && v > 0 && Math.floor(v) === v) ? v : d;
  const ls = Number(sc.launchSkip);
  return {
    skip: (Number.isFinite(ls) && ls >= 0) ? Math.floor(ls) : 0,
    workers: posInt(Number(sc.workers), DEFAULT_WORKERS),
    chunkSize: posInt(Number(sc.chunkSize), DEFAULT_CHUNK),
    maxMinutes: posInt(Number(sc.maxMinutes), DEFAULT_MAX_MINUTES),
  };
}

// ─── IO SHELL (injected deps; fail-soft, never throws) ────────────────────

function classifyAlive(domain, procEnum) {
  let lines;
  try {
    lines = procEnum();
  } catch {
    return "indeterminate";
  }
  return classifyAliveFromLines(domain, lines);
}

/**
 * Default Windows process enumerator (node.exe cmdlines), shell-free via
 * spawnSync with a fixed argv. Throws on PowerShell failure so classifyAlive
 * resolves it to the fail-safe "indeterminate" state.
 */
function defaultProcEnum() {
  const r = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | " +
        "Select-Object -ExpandProperty CommandLine",
    ],
    { encoding: "utf8", timeout: SUBPROCESS_TIMEOUT_MS, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
  );
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`proc enum exit ${r.status}: ${String(r.stderr).slice(0, ERR_MSG_MAX)}`);
  return String(r.stdout).split(/\r?\n/).filter((s) => s.trim().length > 0);
}

/** Default relaunch: trigger the per-domain on-demand batch scheduled task.
 *  Throws on schtasks failure so runGuard records a "relaunch-failed" entry. */
function defaultRelaunch(ctx) {
  const r = spawnSync(
    "schtasks",
    ["/run", "/tn", batchTaskName(ctx.domain)],
    { encoding: "utf8", timeout: SUBPROCESS_TIMEOUT_MS, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
  );
  if (r.error) throw r.error;
  if (r.status !== 0) {
    throw new Error(`schtasks /run '${batchTaskName(ctx.domain)}' exit ${r.status}: ` +
      String(r.stderr).slice(0, ERR_MSG_MAX));
  }
  return { triggered: true, task: batchTaskName(ctx.domain) };
}

/**
 * Read per-worker resume state from the out dir, using injected readdir/
 * readFile so tests stay hermetic.
 *  - perWorkerMaxIdx:  Map<workerIdx, maxRecordIdx>  (flushed workers only)
 *  - maxWorkerIdxSeen: highest workerIdx across all chunk filenames, or -1.
 * For each worker, chunks are scanned HIGHEST-named first; the first chunk
 * that yields a valid max idx wins (a corrupt/0-byte newest chunk falls back
 * to the prior complete chunk — preserves the worker's true frontier).
 * The directory scan (readdir + regex) is O(total chunk files) but only runs
 * on the relaunch path — a healthy alive batch noops before this is reached.
 */
function readResumeState(outDir, deps) {
  const readdir = deps.readdir;
  const readFile = deps.readFile;
  let names;
  try { names = readdir(outDir); } catch { names = []; }
  const byWorker = groupChunksByWorker(names);
  const perWorkerMaxIdx = new Map();
  let maxWorkerIdxSeen = -1;
  for (const [w, list] of byWorker.entries()) {
    if (w > maxWorkerIdxSeen) maxWorkerIdxSeen = w;
    if (list.length === 0) continue;
    // Scan newest → oldest; first chunk yielding a valid max idx wins.
    for (let i = list.length - 1; i >= 0; i--) {
      let txt = null;
      try { txt = readFile(join(outDir, list[i].file)); } catch { txt = null; }
      const mi = txt == null ? null : maxIdxInChunkText(txt);
      if (mi != null) { perWorkerMaxIdx.set(w, mi); break; }
    }
  }
  return { perWorkerMaxIdx, maxWorkerIdxSeen };
}

/**
 * Read the per-domain resume-state sidecar. Returns the parsed object, or
 * null when absent / unreadable / malformed (fail-soft).
 */
function readSidecar(outDir, deps) {
  const readFile = deps.readFile;
  let txt;
  try { txt = readFile(join(outDir, RESUME_STATE_FILE)); } catch { return null; }
  try {
    const obj = JSON.parse(txt);
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
}

/**
 * Decide whether a non-null sidecar implies the batch is alive on ANOTHER
 * host. The owning host's guard refreshes the sidecar `ts` every cadence; a
 * sidecar from a different host whose `ts` is within HOST_STALENESS_MS is
 * therefore being kept fresh ⇒ batch presumed alive there ⇒ do not relaunch.
 *   - "remote-alive"  the other host's guard is actively refreshing
 *   - "clear"         same host, no sidecar, stale ts, or unparseable ts
 */
function decideHostOwnership(sidecar, thisHost, nowMs, stalenessMs) {
  if (!sidecar || typeof sidecar !== "object") return "clear";
  const host = typeof sidecar.host === "string" ? sidecar.host : null;
  if (!host || host === thisHost) return "clear";
  const tsMs = Date.parse(sidecar.ts);
  if (!Number.isFinite(tsMs)) return "clear";
  const windowMs = (Number.isFinite(stalenessMs) && stalenessMs > 0)
    ? stalenessMs : HOST_STALENESS_MS;
  return (nowMs - tsMs) < windowMs ? "remote-alive" : "clear";
}

/**
 * Write the per-domain resume-state sidecar. Returns true on success, false
 * on failure (caller surfaces a relaunch-path failure loudly — R12).
 */
function writeSidecar(outDir, record, deps) {
  const writeText = deps.writeText;
  try {
    writeText(join(outDir, RESUME_STATE_FILE), JSON.stringify(record, null, 2) + "\n");
    return true;
  } catch {
    return false;
  }
}

/** Build a sidecar record (pure — exported for testing). */
function buildSidecarRecord({ host, nowMs, launchSkip, workers, chunkSize, maxMinutes, note }) {
  return {
    schemaVersion: RESUME_STATE_SCHEMA,
    host,
    ts: new Date(nowMs).toISOString(),
    launchSkip: Number.isFinite(launchSkip) ? Math.floor(launchSkip) : null,
    workers,
    chunkSize,
    maxMinutes,
    ...(note ? { note } : {}),
  };
}

/** Host-keyed lock path — H: is shared across PCs; a single global lock
 *  would let one PC reap the other's live lock. The guard's job is
 *  host-local, so the lock is host-local. */
function lockPathForHost(host) {
  const safe = String(host).replace(/[^A-Za-z0-9._-]/g, "_");
  return resolve(PROJECT_ROOT, "state/shared", `.sfc-variability-guard-${safe}.lock`);
}

function acquireLock(lockPath, nowMs) {
  try {
    const st = statSync(lockPath);
    if (nowMs - st.mtimeMs > LOCK_STALE_MS) {
      try { unlinkSync(lockPath); } catch { /* raced; openSync below decides */ }
    }
  } catch { /* no lock file — fine */ }
  try {
    mkdirSync(dirname(lockPath), { recursive: true });
    const fd = openSync(lockPath, "wx");
    try { writeFileSync(fd, JSON.stringify({ pid: process.pid, ts: new Date(nowMs).toISOString() })); }
    catch { /* lock content is advisory only */ }
    return fd;
  } catch {
    return null; // another guard holds it — back off
  }
}

function releaseLock(fd, lockPath) {
  if (fd != null) { try { closeSync(fd); } catch { /* noop */ } }
  try { unlinkSync(lockPath); } catch { /* noop */ }
}

/** Append a telemetry record. Returns true on success, false on failure. */
function appendTelemetry(telemetryPath, record) {
  try {
    mkdirSync(dirname(telemetryPath), { recursive: true });
    appendFileSync(telemetryPath, JSON.stringify(record) + "\n", "utf8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Run one guard pass over the requested domains. Fail-soft: a per-domain
 * error is recorded and skipped, never thrown. Returns a summary object.
 *
 * deps: { readdir, readFile, writeText, procEnum, relaunch, now, hostname }
 *       — all injectable for tests.
 */
function runGuard(opts, deps = {}) {
  const {
    domains = ["mill"],
    workers = DEFAULT_WORKERS,
    maxMinutes = DEFAULT_MAX_MINUTES,
    chunkSize = DEFAULT_CHUNK,
    dryRun = false,
    resultsRoot = resolve(PROJECT_ROOT, "state/shared/sfc-variability-results"),
  } = opts || {};

  const readdir = deps.readdir || ((d) => readdirSync(d));
  const readFile = deps.readFile || ((p) => readFileSync(p, "utf8"));
  const writeText = deps.writeText || ((p, t) => {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, t, "utf8");
  });
  const procEnum = deps.procEnum || defaultProcEnum;
  const relaunch = deps.relaunch || defaultRelaunch;
  const now = deps.now || (() => Date.now());
  // deps.hostname is an injectable provider FUNCTION (like deps.now).
  const thisHost = (deps.hostname || osHostname)();

  const summary = {
    schemaVersion: TELEMETRY_SCHEMA,
    ts: new Date(now()).toISOString(),
    host: thisHost,
    domains: [], disabled: false, dryRun,
  };

  if (process.env.PRISM_SFC_VARIABILITY_GUARD_DISABLE === "1") {
    summary.disabled = true;
    return summary;
  }

  for (const domain of domains) {
    if (!VALID_DOMAINS.has(domain)) {
      summary.domains.push({ domain, action: "skip", reason: "unknown domain" });
      continue;
    }
    const outDir = join(resultsRoot, domain);
    let entry;
    try {
      const aliveState = classifyAlive(domain, procEnum);
      const decision = decideRelaunch(aliveState);
      if (!decision.relaunch) {
        // Batch alive on THIS host → refresh the sidecar ts so the cross-PC
        // liveness window never lapses for a healthy guard-managed batch.
        // LOAD-BEARING INVARIANT: the refresh copies the prior sidecar's
        // launchSkip/workers/chunkSize/maxMinutes forward unchanged — it
        // re-stamps `ts` only. This is correct ONLY because the guard is the
        // SOLE writer of the sidecar's launch fields and writes them on every
        // relaunch (below), so the sidecar always describes the currently-
        // alive batch. Do NOT add a second sidecar writer (e.g. the launcher
        // persisting its own params) without re-validating this — a divergent
        // sidecar would make a later un-flushed-worker resume use a wrong skip.
        let sidecarRefreshed = false;
        if (aliveState === "alive" && !dryRun) {
          const sc = readSidecar(outDir, { readFile }) || {};
          const refreshed = buildSidecarRecord({
            host: thisHost, nowMs: now(),
            launchSkip: Number.isFinite(sc.launchSkip) ? sc.launchSkip : null,
            workers: Number.isFinite(sc.workers) ? Math.floor(sc.workers) : workers,
            chunkSize: Number.isFinite(sc.chunkSize) ? Math.floor(sc.chunkSize) : chunkSize,
            maxMinutes: Number.isFinite(sc.maxMinutes) ? Math.floor(sc.maxMinutes) : maxMinutes,
            note: typeof sc.note === "string" ? sc.note : undefined,
          });
          sidecarRefreshed = writeSidecar(outDir, refreshed, { writeText });
        }
        entry = { domain, action: "noop", aliveState, reason: decision.reason, sidecarRefreshed };
        summary.domains.push(entry);
        continue;
      }
      // Host-local enumeration says "dead" — but the batch may be alive on
      // the OTHER PC. The sidecar's host + fresh ts is the cross-host signal.
      const sidecar = readSidecar(outDir, { readFile });
      const ownership = decideHostOwnership(sidecar, thisHost, now(), HOST_STALENESS_MS);
      if (ownership === "remote-alive") {
        entry = {
          domain, action: "noop", aliveState: "indeterminate",
          reason: `sidecar shows batch on host '${sidecar.host}' refreshed within ${HOST_STALENESS_MIN}min — fail-safe`,
        };
        summary.domains.push(entry);
        continue;
      }
      const st = readResumeState(outDir, { readdir, readFile });
      const priorWorkers = Number.isFinite(sidecar?.workers) ? Math.floor(sidecar.workers) : null;
      if (priorWorkers != null && priorWorkers !== workers) {
        entry = {
          domain, action: "noop", aliveState,
          reason: `sidecar worker-count mismatch (prior ${priorWorkers} vs configured ${workers}) — fail-safe`,
          priorWorkers,
        };
        summary.domains.push(entry);
        continue;
      }
      if (st.maxWorkerIdxSeen >= workers) {
        entry = {
          domain, action: "noop", aliveState,
          reason: `prior run used > ${workers} workers (chunk worker idx ${st.maxWorkerIdxSeen}) — fail-safe`,
          maxWorkerIdxSeen: st.maxWorkerIdxSeen,
        };
        summary.domains.push(entry);
        continue;
      }
      const priorLaunchSkip = Number.isFinite(sidecar?.launchSkip)
        ? Math.floor(sidecar.launchSkip) : null;
      const { skip, reason } = computeResumeSkip(st.perWorkerMaxIdx, workers, priorLaunchSkip);
      if (dryRun) {
        entry = {
          domain, action: "would-relaunch", aliveState, skip, skipReason: reason,
          batchTask: batchTaskName(domain),
          batchArgv: buildBatchArgv({ domain, workers, maxMinutes, chunkSize, skip, outDir }),
        };
        summary.domains.push(entry);
        continue;
      }
      // Write the sidecar FIRST so the launcher (triggered next) reads the
      // freshly-computed launchSkip; then trigger the per-domain batch task.
      const sidecarRec = buildSidecarRecord({
        host: thisHost, nowMs: now(),
        launchSkip: skip, workers, chunkSize, maxMinutes,
      });
      const sidecarWritten = writeSidecar(outDir, sidecarRec, { writeText });
      let triggered = false;
      let triggerError = null;
      try {
        relaunch({ domain, skip, workers, maxMinutes, chunkSize, outDir });
        triggered = true;
      } catch (e) {
        triggerError = String(e?.message ?? e).slice(0, ERR_MSG_MAX);
      }
      entry = {
        domain, action: triggered ? "relaunched" : "relaunch-failed",
        aliveState, skip, skipReason: reason,
        batchTask: batchTaskName(domain), sidecarWritten, triggerError,
      };
    } catch (e) {
      entry = { domain, action: "error", reason: String(e?.message ?? e).slice(0, ERR_MSG_MAX) };
    }
    summary.domains.push(entry);
  }
  return summary;
}

// ─── CLI ──────────────────────────────────────────────────────────────────

function parseCliArgs(argv) {
  const a = {
    domains: ["mill"],
    workers: DEFAULT_WORKERS,
    maxMinutes: DEFAULT_MAX_MINUTES,
    chunkSize: DEFAULT_CHUNK,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--domains")          a.domains = String(argv[++i]).split(",").map((s) => s.trim()).filter(Boolean);
    else if (k === "--workers")     a.workers = requirePositiveInt("workers", argv[++i]);
    else if (k === "--max-minutes") a.maxMinutes = requirePositiveInt("max-minutes", argv[++i]);
    else if (k === "--chunk")       a.chunkSize = requirePositiveInt("chunk", argv[++i]);
    else if (k === "--dry-run")     a.dryRun = true;
  }
  if (a.domains.length === 0) throw new Error("no --domains given");
  return a;
}

const _modulePath = fileURLToPath(import.meta.url);
const _isEntry = process.argv[1] && resolve(process.argv[1]) === resolve(_modulePath);
if (_isEntry) {
  let args;
  try {
    args = parseCliArgs(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`[sfc-guard] ${String(e?.message ?? e)}\n`);
    process.exit(2);
  }
  const thisHostCli = osHostname();
  const lockPath = lockPathForHost(thisHostCli);
  const telemetryPath = resolve(PROJECT_ROOT, "state/shared/sfc-variability-guard.jsonl");
  const nowMs = Date.now();
  const fd = acquireLock(lockPath, nowMs);
  if (fd == null) {
    process.stdout.write(JSON.stringify({ ts: new Date(nowMs).toISOString(), skipped: "lock held" }) + "\n");
    process.exit(0);
  }
  try {
    const summary = runGuard(args);
    const wrote = appendTelemetry(telemetryPath, summary);
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
    // R12: surface load-bearing failures loudly.
    const relaunched = summary.domains.some((d) => d && d.action === "relaunched");
    if (!wrote && relaunched) {
      process.stderr.write("[sfc-guard] WARNING: relaunched a batch but telemetry write FAILED — no durable trail\n");
      process.exitCode = 3;
    }
    const sidecarMissed = summary.domains.some(
      (d) => d && d.action === "relaunched" && d.sidecarWritten === false,
    );
    if (sidecarMissed) {
      process.stderr.write("[sfc-guard] WARNING: relaunched a batch but sidecar write FAILED — next resume runs blind\n");
      process.exitCode = 3;
    }
    const relaunchFailed = summary.domains.filter((d) => d && d.action === "relaunch-failed");
    if (relaunchFailed.length > 0) {
      for (const d of relaunchFailed) {
        process.stderr.write(`[sfc-guard] WARNING: relaunch FAILED for '${d.domain}': ${d.triggerError}\n`);
      }
      process.exitCode = 3;
    }
  } finally {
    releaseLock(fd, lockPath);
  }
}

export {
  GUARD_TASK_NAME,
  BATCH_TASK_PREFIX,
  RESUME_STATE_FILE,
  HOST_STALENESS_MIN,
  GUARD_CADENCE_MIN,
  batchTaskName,
  parseChunkName,
  groupChunksByWorker,
  lastNonEmptyLine,
  maxIdxInChunkText,
  computeResumeSkip,
  decideRelaunch,
  buildBatchArgv,
  classifyAliveFromLines,
  classifyAlive,
  requirePositiveInt,
  pickResumeParams,
  readResumeState,
  readSidecar,
  decideHostOwnership,
  writeSidecar,
  buildSidecarRecord,
  lockPathForHost,
  runGuard,
  parseCliArgs,
};
