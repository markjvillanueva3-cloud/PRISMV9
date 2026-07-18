/**
 * SFC full-space batch sweep WORKER (U-FT-04, SFC-FULLTUNE).
 * ==========================================================
 *
 * One worker of the offline 20,321,280-cell sweep. The coordinator (U-FT-05,
 * sfc-batch-coordinator.mjs) forks a pool of these and fans the 1,152 regime-aligned
 * work units (sfc-combinatorial-enumerator.enumerateWorkUnits) across them, one unit
 * per `{type:'run'}` IPC message.
 *
 * Per unit it: enumerates the contiguous slice [offset, offset+count) via
 * `enumerateRange` (NO sampling -- the FULL valid space), drives every cell through the
 * REAL UltimateSpeedFeedEngine in FAST bulk mode (U-FT-01: skips the per-cell ledger
 * append, ~0.087ms/cell) via the canonical `CombinatorialSpeedFeedHarnessDriver.driveCells`
 * (the typed + unit-tested DrivenCell producer), and writes one DrivenCell JSONL line per
 * cell to `<outputDir>/<unitId>.jsonl`. The shard is written to a `.partial` sibling and
 * renamed on success so a crash mid-unit never leaves a partial shard the coordinator
 * would mis-count as complete (unit-atomic completion).
 *
 * NO maxCells cap (offline path -- the dispatcher's 64-cell ceiling is a DIFFERENT,
 * online surface). Fail-loud per cell is inherited from driveCells (an engine throw ->
 * driven:false record, never a fabricated default). Protocol mirrors the CAD pool
 * (CADRegressionWorkerThreadRunnerEngine): {type:'run',runId,task} in, {type:'result',
 * runId,result} out, with the runId echoed so a stale message can never be mis-credited.
 *
 * RUNTIME: a child PROCESS (child_process.fork), NOT a worker_thread. tsx's ESM loader
 * cannot be registered inside a worker_thread (it hard-refuses `register()` post-Node-20:
 * "tsx must be loaded with --import"), but a forked child's MAIN thread loads tsx cleanly
 * via the `--import` execArgv the coordinator passes. Process isolation is also the safer
 * choice for a long offline sweep (a worker crash never corrupts a sibling's heap, and the
 * fleet-reaper sees real PIDs). This plain-ESM (.mjs) entry loads natively; its TypeScript
 * imports resolve through that inherited tsx loader. The heavy, typed logic is driveCells.
 *
 * @typedef {{ unitId: string, offset: number, count: number, outputDir: string }} RunTask
 */
import fs from "node:fs";
import path from "node:path";
import { CombinatorialSpeedFeedHarnessDriver } from "../src/data/sfc-combinatorial-driver.js";
import { enumerateRange, SFC_FULL_SPACE_SIZE } from "../src/data/sfc-combinatorial-enumerator.js";

if (typeof process.send !== "function") {
  throw new Error("sfc-batch-worker.mjs must run as a forked child (no IPC channel)");
}
/** @type {(m: unknown) => void} */
const send = (m) => process.send(m);

// One real engine + real romeo vendor provider for the worker's lifetime (the engine is
// a singleton; the datasource loads its catalogs once per worker).
const driver = CombinatorialSpeedFeedHarnessDriver.withRealEngine();

/**
 * Drive one work unit's full slice and write its shard atomically.
 * @param {RunTask} task
 */
function runUnit(task) {
  const { unitId, offset, count, outputDir } = task;
  if (!Number.isInteger(offset) || offset < 0 || offset >= SFC_FULL_SPACE_SIZE) {
    throw new RangeError(`runUnit: offset ${offset} out of range [0, ${SFC_FULL_SPACE_SIZE})`);
  }
  if (!Number.isInteger(count) || count <= 0) {
    throw new RangeError(`runUnit: count ${count} must be a positive integer`);
  }
  const t0 = process.hrtime.bigint();
  fs.mkdirSync(outputDir, { recursive: true });

  // Enumerate the FULL slice (end-clamped) and drive it in FAST bulk mode.
  const cells = enumerateRange(offset, count);
  const res = driver.driveCells(cells, { fastBulk: true });

  // Write all DrivenCell records as JSONL to a .partial sibling, fsync + close, then
  // rename on success so the coordinator only ever sees complete shards (unit-atomic
  // completion). On ANY failure (disk-full mid-write, fsync error, rename collision) the
  // .partial is unlinked so a failed/never-retried unit leaves NO orphan -- and the error
  // propagates to the message handler as a fail-loud {type:'error'} (never a silent drop).
  // (Close BEFORE rename: Windows cannot reliably rename a still-open handle.)
  const shardPath = path.join(outputDir, `${unitId}.jsonl`);
  const partial = shardPath + ".partial";
  const fd = fs.openSync(partial, "w");
  let closed = false;
  try {
    for (const rec of res.records) fs.writeSync(fd, JSON.stringify(rec) + "\n");
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    closed = true;
    fs.renameSync(partial, shardPath);
  } catch (err) {
    if (!closed) { try { fs.closeSync(fd); } catch { /* may already be closed */ } }
    try { fs.rmSync(partial, { force: true }); } catch { /* best-effort orphan cleanup */ }
    throw err;
  }

  return {
    unitId,
    shardPath,
    drivenCount: res.drivenCount,
    errorCount: res.errorCount,
    citedCount: res.citedCount,
    total: res.total,
    gateTally: res.gateTally,
    elapsedMs: Number(process.hrtime.bigint() - t0) / 1e6,
  };
}

process.on("message", (msg) => {
  if (!msg || typeof msg !== "object") return;
  const m = /** @type {{ type?: string, runId?: number, task?: RunTask }} */ (msg);
  if (m.type === "shutdown") {
    process.exit(0);
  }
  if (m.type !== "run" || !m.task) return; // ignore unknown
  const runId = m.runId;
  try {
    const result = runUnit(m.task);
    send({ type: "result", runId, result });
  } catch (err) {
    send({
      type: "error",
      runId,
      unitId: m.task.unitId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// Signal readiness so the coordinator's FIFO acquire knows this worker can take work.
send({ type: "ready" });
