/**
 * SFC full-space batch sweep COORDINATOR (U-FT-05, SFC-FULLTUNE).
 * ===============================================================
 *
 * Orchestrates the offline 20,321,280-cell sweep: forks a pool of sfc-batch-worker.mjs
 * children and fans the 1,152 regime-aligned work units (enumerateWorkUnits) across them,
 * one unit per worker at a time (FIFO acquire). Each completed unit is recorded in an
 * ATOMIC, RESUMABLE manifest so a killed run restarts where it left off -- zero recomputed
 * units, zero double-credit.
 *
 * Protocol mirrors CADRegressionWorkerThreadRunnerEngine (the cited pool pattern):
 *   coordinator -> worker : {type:'run', runId, task}
 *   worker -> coordinator : {type:'ready'} | {type:'result',runId,result} | {type:'error',runId,...}
 *   coordinator -> worker : {type:'shutdown'}
 * A monotonic per-dispatch runId + per-worker current-runId is the bleed-guard: a stale
 * message (from a unit a re-forked worker already abandoned) is ignored, never credited.
 *
 * RUNTIME: run under tsx (`npx tsx scripts/sfc-batch-coordinator.mjs [opts]`). The
 * coordinator's own TS imports resolve because IT runs under tsx; it forks workers with
 * `execArgv: process.execArgv` so each child's main thread inherits the SAME tsx loader
 * (the worker is plain .mjs whose .ts imports need it). See sfc-batch-worker.mjs header
 * for why fork (not worker_threads) is used.
 *
 * CLI:
 *   --workers N   pool size (default min(14, max(1, cpus-2)); env PRISM_SFC_BATCH_WORKERS)
 *   --out DIR     output root (default state/sfc-batch); shards in <out>/chunks/, manifest <out>/manifest.json
 *   --limit N     only run the first N pending units (smoke/subset; full run omits it)
 *   --fresh       ignore + clear any existing manifest/shards (full re-run); default RESUMES
 *   --dry-run     print the plan (pending/complete counts) and exit without forking
 *
 * Output: per-unit JSONL shards <out>/chunks/<unitId>.jsonl (DrivenCell stream the U-FT-06
 * reducer consumes) + <out>/manifest.json (completion ledger + roll-up tallies).
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  enumerateWorkUnits,
  SFC_WORK_UNIT_COUNT,
  SFC_CELLS_PER_WORK_UNIT,
  SFC_FULL_SPACE_SIZE,
} from "../src/data/sfc-combinatorial-enumerator.js";

const MANIFEST_SCHEMA_VERSION = "1.0.0";
const WORKER_PATH = fileURLToPath(new URL("./sfc-batch-worker.mjs", import.meta.url));
// Bound the requeue-on-crash loop: if a worker PROCESS dies (not an in-runUnit exception,
// which the worker catches + reports as {type:error}) repeatedly on the SAME unit, abandon
// it after this many attempts -- a bounded LOUD failure (recorded in manifest.errors), never
// an unbounded refork spin on a poison unit.
const MAX_UNIT_ATTEMPTS = 3;

// ---- CLI ------------------------------------------------------------------
function parseArgs(argv) {
  const a = { workers: 0, out: "", limit: 0, fresh: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--workers") a.workers = parseInt(argv[++i], 10) || 0;
    else if (t === "--out") a.out = argv[++i] ?? "";
    else if (t === "--limit") a.limit = parseInt(argv[++i], 10) || 0;
    else if (t === "--fresh") a.fresh = true;
    else if (t === "--dry-run") a.dryRun = true;
  }
  return a;
}

function defaultPoolSize() {
  const env = parseInt(process.env.PRISM_SFC_BATCH_WORKERS ?? "", 10);
  if (Number.isFinite(env) && env > 0) return env;
  return Math.min(14, Math.max(1, os.cpus().length - 2));
}

// ---- manifest (atomic temp -> rename) -------------------------------------
function emptyManifest() {
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalUnits: SFC_WORK_UNIT_COUNT,
    cellsPerUnit: SFC_CELLS_PER_WORK_UNIT,
    fullSpaceSize: SFC_FULL_SPACE_SIZE,
    completed: {}, // unitId -> { drivenCount, errorCount, citedCount, total, gateTally, elapsedMs, at }
    errors: {}, // unitId -> { error, at }
  };
}

function loadManifest(manifestPath) {
  try {
    const raw = fs.readFileSync(manifestPath, "utf8");
    const m = JSON.parse(raw);
    if (m && m.schemaVersion === MANIFEST_SCHEMA_VERSION && m.completed) return m;
  } catch { /* missing/corrupt -> fresh */ }
  return emptyManifest();
}

function saveManifest(manifestPath, manifest) {
  manifest.updatedAt = new Date().toISOString();
  const tmp = manifestPath + `.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2));
  fs.renameSync(tmp, manifestPath); // atomic on a single filesystem
}

// ---- main -----------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outRoot = path.resolve(args.out || path.join(process.cwd(), "state/sfc-batch"));
  const chunksDir = path.join(outRoot, "chunks");
  const manifestPath = path.join(outRoot, "manifest.json");
  const poolSize = args.workers > 0 ? args.workers : defaultPoolSize();

  fs.mkdirSync(chunksDir, { recursive: true });

  if (args.fresh) {
    for (const f of fs.existsSync(chunksDir) ? fs.readdirSync(chunksDir) : []) {
      if (f.endsWith(".jsonl") || f.endsWith(".partial")) fs.rmSync(path.join(chunksDir, f), { force: true });
    }
    fs.rmSync(manifestPath, { force: true });
  }

  // Sweep stale *.partial from a prior crashed run (defense in depth; workers self-clean).
  for (const f of fs.readdirSync(chunksDir)) {
    if (f.endsWith(".partial")) fs.rmSync(path.join(chunksDir, f), { force: true });
  }

  const manifest = loadManifest(manifestPath);
  const allUnits = enumerateWorkUnits();

  // A unit is DONE iff recorded complete AND its shard is actually on disk (a manifest
  // entry without a shard -- e.g. a half-synced copy -- is re-run, never trusted blindly).
  const isDone = (u) =>
    u.unitId in manifest.completed && fs.existsSync(path.join(chunksDir, `${u.unitId}.jsonl`));
  let pending = allUnits.filter((u) => !isDone(u));
  if (args.limit > 0) pending = pending.slice(0, args.limit);

  const doneCount = allUnits.length - allUnits.filter((u) => !isDone(u)).length;
  const plan = {
    outRoot, poolSize, totalUnits: allUnits.length, alreadyComplete: doneCount,
    pending: pending.length, cellsToCompute: pending.length * SFC_CELLS_PER_WORK_UNIT,
  };
  console.log("[sfc-batch] plan:", JSON.stringify(plan, null, 2));

  if (args.dryRun) { console.log("[sfc-batch] --dry-run: not forking."); return; }
  if (pending.length === 0) { console.log("[sfc-batch] nothing to do (all units complete)."); return; }

  const t0 = process.hrtime.bigint();
  let nextRunId = 1;
  let dispatched = 0;
  let completed = 0;
  let erroredUnits = 0;
  let active = 0;
  const workers = [];
  let shuttingDown = false;

  /** Take the next pending unit + send it to a worker (or shut the worker down if drained). */
  function dispatch(w) {
    const u = pending.shift();
    if (!u) { w._idle = true; maybeShutdown(w); return; }
    w._idle = false;
    w._unit = u;
    w._runId = nextRunId++;
    dispatched++;
    w.send({ type: "run", runId: w._runId, task: { unitId: u.unitId, offset: u.offset, count: u.count, outputDir: chunksDir } });
  }

  function maybeShutdown(w) {
    if (pending.length === 0 && !w._shutdownSent) {
      w._shutdownSent = true;
      try { w.send({ type: "shutdown" }); } catch { /* channel may be closing */ }
    }
  }

  function logProgress() {
    const elapsed = Number(process.hrtime.bigint() - t0) / 1e9;
    const pct = ((completed / (plan.pending)) * 100).toFixed(1);
    const rate = completed > 0 ? (elapsed / completed) : 0;
    const eta = rate * pending.length;
    console.log(`[sfc-batch] ${completed}/${plan.pending} units (${pct}%) | errors ${erroredUnits} | ${elapsed.toFixed(0)}s elapsed | ETA ~${eta.toFixed(0)}s`);
  }

  function onMessage(w, m) {
    if (!m || typeof m !== "object") return;
    if (m.type === "ready") { dispatch(w); return; }
    if (m.type === "result") {
      if (m.runId !== w._runId) return; // bleed-guard: stale result, ignore
      const r = m.result;
      manifest.completed[r.unitId] = {
        drivenCount: r.drivenCount, errorCount: r.errorCount, citedCount: r.citedCount,
        total: r.total, gateTally: r.gateTally, elapsedMs: r.elapsedMs, at: new Date().toISOString(),
      };
      delete manifest.errors[r.unitId];
      completed++;
      saveManifest(manifestPath, manifest);
      if (completed % 25 === 0 || pending.length === 0) logProgress();
      dispatch(w);
      return;
    }
    if (m.type === "error") {
      if (m.runId !== w._runId) return;
      manifest.errors[m.unitId] = { error: m.error, at: new Date().toISOString() };
      erroredUnits++;
      saveManifest(manifestPath, manifest);
      console.error(`[sfc-batch] unit ${m.unitId} ERROR: ${m.error}`);
      // Skip the failed unit this run (recorded in manifest.errors). It writes NO shard, so
      // isDone() stays false -> a bare resume rerun auto-retries it (no --fresh needed); a
      // later success clears its manifest.errors entry.
      dispatch(w);
      return;
    }
  }

  /** Fork one worker + wire its lifecycle (re-fork on unexpected exit, requeue its unit). */
  function spawnWorker(idx) {
    const w = fork(WORKER_PATH, [], { execArgv: process.execArgv, env: process.env, stdio: ["inherit", "inherit", "inherit", "ipc"] });
    w._idx = idx; w._idle = true; w._shutdownSent = false; w._unit = null; w._runId = -1;
    active++;
    w.on("message", (m) => onMessage(w, m));
    w.on("exit", (code) => {
      active--;
      // Re-queue an in-flight unit if the worker died mid-unit (not a clean shutdown) --
      // UNLESS it has already crash-looped MAX_UNIT_ATTEMPTS times, in which case abandon it
      // loud (recorded) rather than spin forever on a process-killing poison unit.
      if (!shuttingDown && !w._shutdownSent && w._unit && !w._idle) {
        const u = w._unit;
        u._attempts = (u._attempts || 0) + 1;
        if (u._attempts >= MAX_UNIT_ATTEMPTS) {
          manifest.errors[u.unitId] = {
            error: `worker process crashed ${u._attempts}x on this unit (process death, not a cell error) -- abandoned`,
            at: new Date().toISOString(),
          };
          erroredUnits++;
          saveManifest(manifestPath, manifest);
          console.error(`[sfc-batch] unit ${u.unitId} crash-looped ${u._attempts}x (last code ${code}) -- ABANDONED (recorded in manifest.errors)`);
        } else {
          pending.push(u);
          console.error(`[sfc-batch] worker ${idx} died (code ${code}) mid-unit ${u.unitId} -- requeued (attempt ${u._attempts}/${MAX_UNIT_ATTEMPTS})`);
        }
      }
      // Refill the pool whenever work remains -- REGARDLESS of exit code, and decoupled
      // from the requeue above. A worker that drained the queue then a SIBLING crashes (or
      // a clean code-0 mid-unit exit) must still be replaced, else the requeued unit is
      // stranded and finish() would report a clean DONE with < all units complete. Refill
      // takes priority over finish() so the last-worker-requeue case re-forks, never ends.
      if (!shuttingDown && pending.length > 0 && active < poolSize) {
        spawnWorker(idx);
        return;
      }
      // Only finish when the pool is fully drained AND nothing is left to dispatch.
      if (active === 0) finish();
    });
    workers.push(w);
    return w;
  }

  let finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    const elapsed = Number(process.hrtime.bigint() - t0) / 1e9;
    const totalDriven = Object.values(manifest.completed).reduce((s, c) => s + (c.drivenCount || 0), 0);
    const totalComplete = Object.keys(manifest.completed).length;
    saveManifest(manifestPath, manifest);
    console.log(`[sfc-batch] DONE: ${completed} units this run | ${totalComplete}/${SFC_WORK_UNIT_COUNT} total complete | ${erroredUnits} errored | ${totalDriven} cells driven this run | ${elapsed.toFixed(0)}s`);
    console.log(`[sfc-batch] manifest: ${manifestPath} | shards: ${chunksDir}`);
    // Fail loud (non-zero exit) on incompleteness so a caller/cron/U-FT-06 trigger can tell
    // a complete sweep from a partial one without re-parsing the manifest (R12).
    if (pending.length > 0) {
      console.error(`[sfc-batch] INCOMPLETE: ${pending.length} unit(s) left pending at finish (pool exhausted before draining work).`);
      process.exitCode = 1;
    }
    if (erroredUnits > 0) {
      console.error(`[sfc-batch] ${erroredUnits} unit(s) errored this run -- see manifest.errors. They carry no shard, so a bare resume rerun auto-retries them.`);
      process.exitCode = 1;
    }
    if (args.limit === 0 && totalComplete < SFC_WORK_UNIT_COUNT) {
      console.error(`[sfc-batch] INCOMPLETE COVERAGE: ${totalComplete}/${SFC_WORK_UNIT_COUNT} units complete (rerun to resume the remainder).`);
      process.exitCode = 1;
    }
  }

  // Graceful shutdown: persist manifest + stop workers on Ctrl-C (resume picks up later).
  function shutdown() {
    shuttingDown = true;
    saveManifest(manifestPath, manifest);
    for (const w of workers) { try { w.send({ type: "shutdown" }); } catch { /* ignore */ } }
    console.log("\n[sfc-batch] interrupted -- manifest saved; rerun to resume.");
  }
  process.on("SIGINT", () => { shutdown(); setTimeout(() => process.exit(130), 500); });

  for (let i = 0; i < Math.min(poolSize, pending.length); i++) spawnWorker(i);
}

main().catch((err) => {
  console.error("[sfc-batch] fatal:", err instanceof Error ? err.stack : String(err));
  process.exit(1);
});
