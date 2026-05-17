#!/usr/bin/env node
/**
 * probe-cache-daemon — REAPER-PERMFIX-MS1 / U-C3
 *
 * A single 5-second-TTL poll daemon for the three probes every fleet-reaper
 * sweep currently forks for itself: nvidia-smi (GPU), Ollama (/api/tags +
 * /api/ps), and the Docker+supporting-services health probe.
 *
 * THE PROBLEM (REAPER-PERMFIX-PLAN diagnosis #2): the --monitor-loop sweep
 * forks ~5 subprocesses per cycle. Across 12 chats × 12 sweeps/hr that is
 * ~720 nvidia-smi forks/hr alone — and every fork() at ≥95% commit memory
 * can ENOMEM-storm into "xmalloc: cannot allocate 8192 bytes". The reaper,
 * the very thing meant to RELIEVE fork pressure, becomes a fork-pressure
 * SOURCE.
 *
 * THE FIX: one daemon polls all three probes every 5s and writes an atomic
 * JSON snapshot. All 12 chats READ that JSON (zero forks) instead of each
 * probing. 720 forks/hr → 12 forks/hr (just this daemon's own probes).
 *
 * Readers use `readProbeCache()` (exported) which returns null when the
 * cache is missing or stale (>STALE_MAX_MS) — the caller then falls back to
 * a direct probe, so a dead daemon degrades gracefully, never breaks a sweep.
 *
 * Modes:
 *   node scripts/probe-cache-daemon.mjs            # run the daemon (forever)
 *   node scripts/probe-cache-daemon.mjs --once     # single probe + write, exit
 *   node scripts/probe-cache-daemon.mjs --status   # print current cache, exit
 *   node scripts/probe-cache-daemon.mjs --stop     # signal a running daemon to exit
 *
 * Knobs:
 *   PRISM_PROBE_CACHE_DISABLE=1     — --once/daemon refuse to run (kill switch)
 *   PRISM_PROBE_CACHE_INTERVAL_MS=N — poll cadence (default 5000, floor 1000)
 *   PRISM_PROBE_CACHE_GPU_DISABLE=1 — skip the nvidia-smi probe
 *
 * Exit codes: 0 ok · 1 another daemon already running (daemon mode) · 2 error.
 */

import { spawnSync } from "node:child_process";
import {
  existsSync, readFileSync, writeFileSync, renameSync, unlinkSync, mkdirSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_FILE = join(REPO_ROOT, "state", "shared", ".probe-cache.json");
const LOCK_FILE = join(REPO_ROOT, "state", "shared", ".probe-cache-daemon.lock");
const STOP_FILE = join(REPO_ROOT, "state", "shared", ".probe-cache-daemon.stop");
const DOCKER_HEALTH_SCRIPT = join(REPO_ROOT, "scripts", "ollama-docker-health.mjs");

const DEFAULT_INTERVAL_MS = 5000;
const MIN_INTERVAL_MS = 1000;          // floor — guards against a probe-storm config
const STALE_MAX_MS = 15000;            // readers fall back to direct probe past this
const PROBE_TIMEOUT_MS = 4000;
const LOCK_STALE_MS = 60000;           // a lock older than this = crashed daemon, steal it
const SCHEMA_VERSION = "1.0.0";

// ─── probes ──────────────────────────────────────────────────────────────────

/**
 * GPU state via nvidia-smi (one CSV row). Never throws — a missing nvidia-smi
 * or driver degrades to { available:false }. Mirrors the sweep's existing
 * --query-gpu fields so a sweep reading this cache sees the identical shape.
 */
export function probeGpu({ runner = defaultNvidiaSmi } = {}) {
  if (process.env.PRISM_PROBE_CACHE_GPU_DISABLE === "1") {
    return { available: false, reason: "PRISM_PROBE_CACHE_GPU_DISABLE=1" };
  }
  let raw;
  try { raw = runner(); } catch { return { available: false, reason: "nvidia-smi runner threw" }; }
  if (!raw) return { available: false, reason: "nvidia-smi unavailable" };
  // CSV: name, memory.total, memory.used, memory.free, utilization.gpu
  const cols = raw.trim().split(/\r?\n/)[0]?.split(",").map(s => s.trim()) || [];
  if (cols.length < 5) return { available: false, reason: "nvidia-smi unparseable" };
  const num = (s) => { const n = Number(String(s).replace(/[^\d.]/g, "")); return Number.isFinite(n) ? n : null; };
  return {
    available: true,
    name: cols[0] || null,
    memTotalMb: num(cols[1]),
    memUsedMb: num(cols[2]),
    memFreeMb: num(cols[3]),
    utilizationPct: num(cols[4]),
  };
}

function defaultNvidiaSmi() {
  const r = spawnSync("nvidia-smi", [
    "--query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu",
    "--format=csv,noheader,nounits",
  ], { encoding: "utf8", timeout: PROBE_TIMEOUT_MS });
  if (r.error || r.status !== 0) return null;
  return r.stdout || null;
}

/**
 * Docker + Ollama + supporting-services state. Delegates to the pre-built
 * ollama-docker-health.mjs --json probe (DRY — that script is the canonical
 * stack probe the sweep already uses). Never throws.
 */
export function probeOllamaDocker({ runner = defaultDockerHealth } = {}) {
  let raw;
  try { raw = runner(); } catch { return { available: false, reason: "docker-health runner threw" }; }
  if (!raw) return { available: false, reason: "docker-health unavailable" };
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return { available: false, reason: "docker-health non-JSON" }; }
  return { available: true, ...parsed };
}

function defaultDockerHealth() {
  if (!existsSync(DOCKER_HEALTH_SCRIPT)) return null;
  const r = spawnSync(process.execPath, [DOCKER_HEALTH_SCRIPT, "--json"], {
    encoding: "utf8",
    timeout: PROBE_TIMEOUT_MS * 2, // docker daemon probe is multi-step
  });
  if (r.error || r.status !== 0) return null;
  return r.stdout || null;
}

// ─── cache write/read ────────────────────────────────────────────────────────

function buildSnapshot() {
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    updatedAtMs: Date.now(),
    daemonPid: process.pid,
    gpu: probeGpu(),
    stack: probeOllamaDocker(),
  };
}

/** Atomic write — tmp file + rename, so a concurrent reader never sees a partial JSON. */
function writeCache(snapshot) {
  try {
    mkdirSync(dirname(CACHE_FILE), { recursive: true });
    const tmp = `${CACHE_FILE}.tmp-${process.pid}-${Date.now()}`;
    writeFileSync(tmp, JSON.stringify(snapshot, null, 2), "utf8");
    renameSync(tmp, CACHE_FILE);
    return true;
  } catch {
    return false;
  }
}

/**
 * EXPORTED reader for fleet-reaper-sweep.mjs and any other consumer.
 * Returns the cached snapshot, or null when the cache is missing, unparseable,
 * or older than maxAgeMs (default STALE_MAX_MS). A null return is the caller's
 * signal to fall back to a direct probe — the daemon being down is never an
 * error for a reader.
 */
export function readProbeCache({ maxAgeMs = STALE_MAX_MS, now = Date.now() } = {}) {
  if (!existsSync(CACHE_FILE)) return null;
  let snap;
  try { snap = JSON.parse(readFileSync(CACHE_FILE, "utf8")); } catch { return null; }
  const ts = typeof snap?.updatedAtMs === "number"
    ? snap.updatedAtMs
    : Date.parse(snap?.updatedAt || "");
  if (!Number.isFinite(ts) || (now - ts) > maxAgeMs) return null;
  return snap;
}

// ─── singleton lock ──────────────────────────────────────────────────────────

/** True if a process with this PID is alive. process.kill(pid,0) throws ESRCH if not. */
function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (e) { return e && e.code === "EPERM"; } // EPERM = alive but not ours
}

/**
 * Acquire the singleton lock. Returns true on success. A lock held by a dead
 * PID, or one older than LOCK_STALE_MS, is stolen (the prior daemon crashed).
 */
function acquireLock() {
  try {
    if (existsSync(LOCK_FILE)) {
      let prior = null;
      try { prior = JSON.parse(readFileSync(LOCK_FILE, "utf8")); } catch { /* corrupt → steal */ }
      const priorPid = prior?.pid;
      const priorAgeMs = prior?.tsMs ? (Date.now() - prior.tsMs) : Infinity;
      if (priorPid && pidAlive(priorPid) && priorAgeMs < LOCK_STALE_MS) {
        return false; // a live, fresh daemon already owns the lock
      }
      // dead PID or stale lock — steal it
    }
    mkdirSync(dirname(LOCK_FILE), { recursive: true });
    writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, tsMs: Date.now() }), "utf8");
    return true;
  } catch {
    return false;
  }
}

function refreshLock() {
  try { writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, tsMs: Date.now() }), "utf8"); } catch { /* best-effort */ }
}

function releaseLock() {
  try {
    if (existsSync(LOCK_FILE)) {
      const cur = JSON.parse(readFileSync(LOCK_FILE, "utf8"));
      if (cur?.pid === process.pid) unlinkSync(LOCK_FILE);
    }
  } catch { /* best-effort */ }
}

// ─── modes ───────────────────────────────────────────────────────────────────

function runOnce() {
  if (process.env.PRISM_PROBE_CACHE_DISABLE === "1") {
    console.log(JSON.stringify({ ok: false, reason: "PRISM_PROBE_CACHE_DISABLE=1" }));
    return 0;
  }
  const snap = buildSnapshot();
  const ok = writeCache(snap);
  console.log(JSON.stringify({ ok, cache: CACHE_FILE, gpu: snap.gpu.available, stack: snap.stack.available }));
  return ok ? 0 : 2;
}

function runStatus() {
  const snap = readProbeCache({ maxAgeMs: Infinity }); // status shows even a stale cache
  if (!snap) {
    console.log(JSON.stringify({ ok: false, reason: "no cache file", path: CACHE_FILE }));
    return 0;
  }
  const ageMs = Date.now() - (snap.updatedAtMs || 0);
  console.log(JSON.stringify({
    ok: true,
    ageMs,
    fresh: ageMs <= STALE_MAX_MS,
    daemonPid: snap.daemonPid,
    daemonAlive: pidAlive(snap.daemonPid),
    gpu: snap.gpu,
    stackAvailable: snap.stack?.available ?? false,
  }, null, 2));
  return 0;
}

function runStop() {
  try {
    mkdirSync(dirname(STOP_FILE), { recursive: true });
    writeFileSync(STOP_FILE, String(Date.now()), "utf8");
    console.log(JSON.stringify({ ok: true, signalled: STOP_FILE }));
  } catch (e) {
    console.log(JSON.stringify({ ok: false, error: String(e?.message || e) }));
    return 2;
  }
  return 0;
}

async function runDaemon() {
  if (process.env.PRISM_PROBE_CACHE_DISABLE === "1") {
    console.log(JSON.stringify({ ok: false, reason: "PRISM_PROBE_CACHE_DISABLE=1" }));
    return 0;
  }
  if (!acquireLock()) {
    console.log(JSON.stringify({ ok: false, reason: "another probe-cache-daemon is already running" }));
    return 1;
  }
  // Clear any leftover stop signal from a prior run.
  try { if (existsSync(STOP_FILE)) unlinkSync(STOP_FILE); } catch { /* ignore */ }

  const intervalMs = Math.max(
    MIN_INTERVAL_MS,
    Number(process.env.PRISM_PROBE_CACHE_INTERVAL_MS) || DEFAULT_INTERVAL_MS,
  );
  let running = true;
  const shutdown = () => { running = false; };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log(JSON.stringify({ ok: true, mode: "daemon", pid: process.pid, intervalMs, cache: CACHE_FILE }));

  while (running) {
    writeCache(buildSnapshot());
    refreshLock();
    // Sleep in short slices so a --stop signal is honored within ~1s.
    const deadline = Date.now() + intervalMs;
    while (running && Date.now() < deadline) {
      if (existsSync(STOP_FILE)) { running = false; break; }
      await new Promise(r => setTimeout(r, Math.min(1000, deadline - Date.now())));
    }
  }

  releaseLock();
  try { if (existsSync(STOP_FILE)) unlinkSync(STOP_FILE); } catch { /* ignore */ }
  console.log(JSON.stringify({ ok: true, mode: "daemon", stopped: true }));
  return 0;
}

async function main() {
  const argv = process.argv.slice(2);
  let code;
  if (argv.includes("--status")) code = runStatus();
  else if (argv.includes("--stop")) code = runStop();
  else if (argv.includes("--once")) code = runOnce();
  else code = await runDaemon();
  process.exit(code);
}

// Only run main() when invoked as a script — `import`ing for readProbeCache()
// (the sweep's use case) must not start a daemon.
const INVOKED_DIRECTLY = process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1].replace(/\\/g, "/").replace(/^([a-z]):/i, (m, d) => d.toUpperCase() + ":");
if (INVOKED_DIRECTLY || (process.argv[1] && process.argv[1].endsWith("probe-cache-daemon.mjs"))) {
  // Fire-and-forget: main() owns its own process.exit() on every path.
  void main();
}
