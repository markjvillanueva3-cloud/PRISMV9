#!/usr/bin/env node
// ollama-night-batch.mjs -- registry-driven OFF-HOURS Ollama work lane
// (U-NIGHT-BATCH, slot:zulu, 2026-06-12).
//
// Operator directive: "find a way to enforce it for better token savings and
// more background tasks running during off hours." The fleet already owns the
// extraction machinery (registry-driven galaxy transcript miner, capability
// probe, YouTube pipeline); what was missing is the DURABLE off-hours runner
// that drains a registry of local-LLM batch jobs while no chat is competing
// for the GPU. This is that runner -- invoked by the "PRISM Ollama Night
// Batch" scheduled task nightly, or manually with --force.
//
// DESIGN (Karpathy: state machine over a job list; failure modes first):
//   - Registry: state/shared/ollama-night-batch-registry.json (schemaVersion'd;
//     each job = {id, cmd[], timeoutMs, enabled, note}). A job's cmd[0] MUST be
//     "node" -- this lane runs repo scripts via spawnSync(file, args[]) with NO
//     shell, and the validator rejects shell metacharacters in every arg.
//   - Window: default 22:00..06:00 local (wraps midnight). Outside the window
//     it exits 0 doing nothing (the scheduled task can fire redundantly).
//     --force bypasses; PRISM_NIGHT_BATCH_DISABLE=1 kills the lane.
//   - Lock: state/shared/.ollama-night-batch.lock -- one runner at a time;
//     a stale lock (>LOCK_STALE_MS) is broken loudly (reaper-killed prior run).
//   - Ollama pre-check: /api/tags must answer; a down daemon aborts LOUD
//     (exit 1) -- queueing local-LLM jobs against a dead daemon would burn the
//     window silently (R12).
//   - Per-job: spawnSync node <script...> with the job's timeout; one job's
//     failure never stops the next (fail-soft per job, fail-LOUD in the log +
//     summary). Every run appends JSONL rows to
//     state/shared/dashboards/ollama-night-batch-log.jsonl.
//   - NEVER seed index-mutating embed batches here unattended -- the tribal
//     brain clobber (8bf1873577) happened exactly that way. The probe writes
//     only its own matrix (all-zero outage runs refuse the write). The miner
//     writes staging digests PLUS a creation-only live vault memo
//     (reference_<G>_transcript_synthesis.md) -- safe AS SEEDED because
//     --next-unpopulated selects only memo-less galaxies and the miner's
//     shrink-guard protects re-runs (scrutiny 2026-06-12: do NOT reseed with
//     --galaxy/--force-vault believing this lane never touches live surfaces).
//   - Jobs must not spawn detached children: the timeout kill is NOT a tree
//     kill on Windows, and reaper protection is by script-NAME pattern match
//     (lib/fleet-reaper-mcp-zombie-hunter DEFAULT_PRISM_WORKER_PROTECT_REGEX)
//     -- a forked grandchild has neither protection.
//
// Usage:
//   node scripts/ollama-night-batch.mjs            # window-gated run
//   node scripts/ollama-night-batch.mjs --force    # ignore the window (manual)
//   node scripts/ollama-night-batch.mjs --dry-run  # plan only, execute nothing
//   node scripts/ollama-night-batch.mjs --status   # show registry + last log rows

import * as fs from "node:fs";
import * as path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const ROOT = process.env.PRISM_ROOT || "H:/prism";
export const REGISTRY_PATH = `${ROOT}/state/shared/ollama-night-batch-registry.json`;
export const LOG_PATH = `${ROOT}/state/shared/dashboards/ollama-night-batch-log.jsonl`;
export const LOCK_PATH = `${ROOT}/state/shared/.ollama-night-batch.lock`;
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const SCHEMA_VERSION = "1.0.0";
export const LOCK_STALE_MS = 4 * 60 * 60 * 1000; // a night job may legitimately run hours
const TAGS_TIMEOUT_MS = 5000;
const TAIL_CHARS = 400;
const DEFAULT_START_HOUR = 22;
const DEFAULT_END_HOUR = 6;

// ── pure helpers ─────────────────────────────────────────────────────────────

/** Off-hours window test; wraps midnight when startHour > endHour. Pure. */
export function inWindow(hour, startHour = DEFAULT_START_HOUR, endHour = DEFAULT_END_HOUR) {
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return false;
  if (startHour === endHour) return false; // zero-width window = never
  return startHour < endHour
    ? hour >= startHour && hour < endHour
    : hour >= startHour || hour < endHour;
}

/** Validate one registry job. Returns null when valid, else the reason. Pure. */
export function jobInvalidReason(job) {
  if (!job || typeof job !== "object") return "not an object";
  if (!job.id || typeof job.id !== "string") return "missing id";
  if (!Array.isArray(job.cmd) || job.cmd.length < 2) return "cmd must be [node, script, ...]";
  if (job.cmd[0] !== "node") return "cmd[0] must be 'node' (repo scripts only -- no arbitrary commands)";
  if (job.cmd.some((c) => typeof c !== "string" || /[;&|<>`$]/.test(c))) return "cmd args must be plain strings (no shell metacharacters)";
  // Repo-script confinement (scrutiny P1 2026-06-12): without this, `node -e
  // <js>`, absolute paths, and ../ traversal all passed -- the "repo scripts
  // only" contract was an overclaim. cmd[1] must be a relative scripts/ path
  // (so it can never be a node option like -e/--eval); later args are the
  // script's own flags and may start with '-'.
  const script = job.cmd[1];
  if (!/^scripts\/[A-Za-z0-9._/-]+\.(mjs|js)$/.test(script) || script.includes("..")) {
    return "cmd[1] must be a relative repo script (scripts/<name>.mjs|.js -- no node options, no traversal, no absolute paths)";
  }
  if (typeof job.timeoutMs !== "number" || !Number.isFinite(job.timeoutMs) || job.timeoutMs <= 0) {
    return "timeoutMs must be a positive number";
  }
  return null;
}

/** Parse + validate the registry text. Returns {ok, registry|error}. Pure. */
export function parseRegistry(text) {
  let r;
  try { r = JSON.parse(text); } catch (e) { return { ok: false, error: `registry is not valid JSON: ${e.message}` }; }
  if (!r || typeof r !== "object") return { ok: false, error: "registry is not an object" };
  if (r.schemaVersion !== SCHEMA_VERSION) return { ok: false, error: `schemaVersion ${r.schemaVersion} != ${SCHEMA_VERSION}` };
  if (!Array.isArray(r.jobs)) return { ok: false, error: "jobs is not an array" };
  if (r.window != null) {
    const okHour = (h) => Number.isInteger(h) && h >= 0 && h <= 23;
    if (!okHour(r.window.startHour) || !okHour(r.window.endHour) || r.window.startHour === r.window.endHour) {
      return { ok: false, error: "window start/end hours must be integers 0..23 and non-equal (a zero-width window would silently never run)" };
    }
  }
  for (const j of r.jobs) {
    const bad = jobInvalidReason(j);
    if (bad) return { ok: false, error: `job ${j && j.id ? j.id : "?"}: ${bad}` };
  }
  const ids = new Set(r.jobs.map((j) => j.id));
  if (ids.size !== r.jobs.length) return { ok: false, error: "duplicate job ids" };
  return { ok: true, registry: r };
}

// ── impure shell (deps injected for tests) ───────────────────────────────────

// Atomic acquire via {flag:"wx"} (scrutiny P2: the existsSync+write pattern was
// TOCTOU -- a scheduled fire overlapping a manual --force run could both win).
function acquireLock(now = Date.now()) {
  const tryWrite = () => {
    try {
      fs.writeFileSync(LOCK_PATH, JSON.stringify({ pid: process.pid, ts: new Date(now).toISOString() }), { flag: "wx" });
      return true;
    } catch { return false; }
  };
  if (tryWrite()) return { ok: true };
  let prev = null;
  try { prev = JSON.parse(fs.readFileSync(LOCK_PATH, "utf8")); } catch { /* corrupt = stale */ }
  const age = prev ? now - Date.parse(prev.ts || 0) : Infinity;
  if (Number.isFinite(age) && age < LOCK_STALE_MS) return { ok: false, holder: prev };
  process.stderr.write(`[night-batch] breaking STALE/corrupt lock (${prev ? `pid ${prev.pid}, ${Math.round(age / 60000)}min old` : "unparseable"})\n`);
  try { fs.unlinkSync(LOCK_PATH); } catch { /* a racing breaker may have won */ }
  return tryWrite() ? { ok: true } : { ok: false, error: "lost the lock race after stale-break" };
}

function releaseLock() { try { fs.unlinkSync(LOCK_PATH); } catch { /* gone is fine */ } }

async function ollamaUp() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TAGS_TIMEOUT_MS);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch { clearTimeout(t); return false; }
}

function appendLog(row) {
  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.appendFileSync(LOG_PATH, JSON.stringify(row) + "\n");
  } catch { /* log loss is non-fatal; the summary still prints */ }
}

// No-shell child runner: spawn(file, args[]) -- arguments are never
// interpreted by a shell, and the registry validator already rejected
// metacharacters (defence-in-depth).
const MAX_CHILD_OUTPUT_BYTES = 64 * 1024 * 1024; // scrutiny P1: the 1MiB spawnSync default KILLS a chatty 2h miner mid-run
const KILL_GRACE_MS = 5000;                       // backstop: settle even if 'close' never fires after a tree-kill

// Force-kill a child AND every descendant. The 2026-06-15 incident: a job with a
// correct 2h `timeoutMs` ran 13.6h because the old `spawnSync({timeout})` killed
// only the DIRECT child on Windows, then BLOCKED draining stdout/stderr pipes
// that an orphaned GRANDCHILD (the miner's own ollama subprocess, looping on HTTP
// 503) still held open -- the whole night lane stalled 5.6h past the 06:00 window
// AND burned the GPU into the workday. A live process-group / tree kill is the
// only thing that reaps the descendants. Best-effort: a kill failure must never
// throw out of the runner (R12 -- we still record the job as failed).
export function killTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === "win32") {
      // /t kills the entire child-process tree; /f forces it. Bounded + no shell.
      spawnSync("taskkill", ["/pid", String(pid), "/t", "/f"], { stdio: "ignore", timeout: 10000 });
    } else {
      // detached:true made the child its own group leader -> negative pid signals the GROUP.
      try { process.kill(-pid, "SIGKILL"); } catch { process.kill(pid, "SIGKILL"); }
    }
  } catch { /* best-effort: a dead/unkillable pid must not crash the lane */ }
}

// Run one job to completion OR hard-kill its whole tree at `timeoutMs`. Returns a
// spawnSync-shaped result {status,error,stdout,stderr} so runJobs' row-capture is
// unchanged: status=null + error.code on a timeout/output-cap kill, exit code otherwise.
// Async (returns a Promise) BECAUSE the kill must fire on a wall-clock timer while
// the child is still LIVE -- spawnSync gives no live handle and cannot tree-kill.
export function spawnJob(cmd, timeoutMs, cwd) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(cmd[0] === "node" ? process.execPath : cmd[0], cmd.slice(1), {
        cwd, windowsHide: true,
        detached: process.platform !== "win32", // POSIX: own process group for a group-kill
        env: { ...process.env, PRISM_NIGHT_BATCH_CHILD: "1" },
      });
    } catch (e) { resolve({ status: null, error: e, stdout: "", stderr: "" }); return; }

    let out = "", err = "", outBytes = 0, errBytes = 0;
    let settled = false, killReason = null, graceTimer = null;
    const finish = (status, error) => {
      if (settled) return; settled = true;
      clearTimeout(timer); if (graceTimer) clearTimeout(graceTimer);
      resolve({ status, error: error || undefined, stdout: out, stderr: err });
    };
    const killFor = (code) => {
      if (killReason) return; killReason = { code };
      killTree(child.pid);
      // 'close' should fire once the (now-killed) tree releases the pipes; if it
      // somehow never does, settle anyway after a grace so the lane never stalls.
      graceTimer = setTimeout(() => finish(null, killReason), KILL_GRACE_MS);
      graceTimer.unref?.();
    };
    const timer = setTimeout(() => killFor("ETIMEDOUT"), timeoutMs);
    timer.unref?.();

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (d) => { outBytes += d.length; if (outBytes <= MAX_CHILD_OUTPUT_BYTES) out += d; else killFor("ENOBUFS"); });
    child.stderr?.on("data", (d) => { errBytes += d.length; if (errBytes <= MAX_CHILD_OUTPUT_BYTES) err += d; else killFor("ENOBUFS"); });
    child.on("error", (e) => finish(null, e));                       // ENOENT etc. (spawn-level failure)
    child.on("close", (code) => finish(killReason ? null : code, killReason || undefined));
  });
}

/**
 * Run every enabled job sequentially. runImpl injected for tests.
 * Returns {ran, failed, skipped, skippedWindow, rows}. One job failing never
 * stops the next; a CLOSED window stops everything after the current job.
 */
export async function runJobs(jobs, { runImpl, nowIso = () => new Date().toISOString(), logImpl = appendLog, cwd = ROOT, windowCheck = null } = {}) {
  // `spawnJob` is async (tree-kill on a live wall-clock timer); `await` also
  // passes a test's SYNC injected runImpl return value straight through, so the
  // hermetic runImpl tests stay valid.
  const run = runImpl || ((cmd, timeoutMs) => spawnJob(cmd, timeoutMs, cwd));
  let ran = 0, failed = 0, skipped = 0, skippedWindow = 0;
  const rows = [];
  for (const job of jobs) {
    if (job.enabled === false) { skipped++; continue; }
    // Between-jobs window re-check (scrutiny P2 2026-06-12): a long job can
    // legitimately end past the window's close; without this, the NEXT job
    // would bleed into the 01:00 Blueprint OCR Batch's GPU window or the
    // workday. The check runs before EVERY job (trivially true for the first,
    // since main() only reaches here in-window); --force passes null.
    if (windowCheck && !windowCheck()) {
      skippedWindow++;
      const row = { ts: nowIso(), jobId: job.id, skipped: "window-closed" };
      rows.push(row);
      logImpl(row);
      continue;
    }
    const started = Date.now();
    let exitCode = -1, tail = "";
    try {
      const r = await run(job.cmd, Number(job.timeoutMs));
      exitCode = r.status === null ? -1 : r.status; // null = timeout/kill/buffer-kill
      // Forensics (scrutiny P1): ETIMEDOUT / ENOBUFS / ENOENT all surface as
      // status null -- without r.error in the row, three distinct infra
      // failures are indistinguishable in the only log this lane has.
      const errNote = r.error ? ` [spawn-error: ${r.error.code || r.error.message}]` : "";
      tail = (`${r.stdout || ""}\n${r.stderr || ""}`.trim() + errNote).slice(-TAIL_CHARS);
    } catch (e) { tail = String((e && e.message) || e).slice(-TAIL_CHARS); }
    const row = { ts: nowIso(), jobId: job.id, exitCode, ms: Date.now() - started, tail };
    rows.push(row);
    logImpl(row);
    if (exitCode === 0) ran++; else failed++;
  }
  return { ran, failed, skipped, skippedWindow, rows };
}

function tailLog(n) {
  try {
    const lines = fs.readFileSync(LOG_PATH, "utf8").trim().split("\n");
    return lines.slice(-n).map((l) => { try { return JSON.parse(l); } catch { return { raw: l }; } });
  } catch { return []; }
}

async function main() {
  const args = process.argv.slice(2);
  const FORCE = args.includes("--force");
  const DRY = args.includes("--dry-run");
  const STATUS = args.includes("--status");

  if (process.env.PRISM_NIGHT_BATCH_DISABLE === "1") {
    console.log("[night-batch] disabled via PRISM_NIGHT_BATCH_DISABLE=1");
    return 0;
  }

  let regText;
  try { regText = fs.readFileSync(REGISTRY_PATH, "utf8"); }
  catch { console.error(`[night-batch] registry missing: ${REGISTRY_PATH} (R12: fail loud)`); return 1; }
  const parsed = parseRegistry(regText);
  if (!parsed.ok) { console.error(`[night-batch] ${parsed.error}`); return 1; }
  const { registry } = parsed;

  if (STATUS) {
    console.log(JSON.stringify({ registry, lastLog: tailLog(10) }, null, 2));
    return 0;
  }

  const hour = new Date().getHours();
  const { startHour = DEFAULT_START_HOUR, endHour = DEFAULT_END_HOUR } = registry.window || {};
  if (!FORCE && !inWindow(hour, startHour, endHour)) {
    console.log(`[night-batch] outside the ${startHour}:00..${endHour}:00 window (hour=${hour}) -- nothing to do (use --force to override)`);
    return 0;
  }

  if (DRY) {
    const plan = registry.jobs.filter((j) => j.enabled !== false).map((j) => `${j.id}: ${j.cmd.join(" ")}`);
    console.log(`[night-batch] DRY RUN -- would execute ${plan.length} job(s):\n  ${plan.join("\n  ")}`);
    return 0;
  }

  if (!(await ollamaUp())) {
    console.error(`[night-batch] Ollama is NOT answering at ${OLLAMA_URL}/api/tags -- aborting LOUD (queueing local-LLM jobs against a dead daemon burns the window silently). Restart 'PRISM Ollama Serve' and re-run.`);
    return 1;
  }

  const lock = acquireLock();
  if (!lock.ok) {
    console.error(`[night-batch] another run holds the lock (${JSON.stringify(lock.holder || lock.error)}) -- exiting`);
    return 1;
  }
  try {
    const t0 = Date.now();
    const { ran, failed, skipped, skippedWindow } = await runJobs(registry.jobs, {
      // --force ignores the window entirely (manual runs); scheduled runs
      // re-check before every job so nothing bleeds past the window close.
      windowCheck: FORCE ? null : () => inWindow(new Date().getHours(), startHour, endHour),
    });
    const mins = ((Date.now() - t0) / 60000).toFixed(1);
    const windowNote = skippedWindow > 0 ? `, ${skippedWindow} skipped (window closed mid-run)` : "";
    console.log(`[night-batch] done in ${mins}min: ${ran} ok, ${failed} failed, ${skipped} disabled${windowNote}. Log: ${LOG_PATH}`);
    return failed > 0 ? 2 : 0;
  } finally {
    releaseLock();
  }
}

const isMain = process.argv[1] && (() => {
  try { return pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url; }
  catch { return false; }
})();
if (isMain) {
  main().then((code) => process.exit(code)).catch((e) => {
    console.error(`[night-batch] fatal: ${(e && e.stack) || e}`);
    process.exit(1);
  });
}
