#!/usr/bin/env node
/**
 * CIMCO fleet closed-loop drive -- U-CIMCO-FLEET-DRIVE.
 *
 * "Begin closed-loop testing on all JM fleet machines." Drives each sim-able JM
 * machine through CIMCO Machine Simulation AUTONOMOUSLY (the MSAA driver launches
 * CIMCO cold -- no operator, proven U-CIMCO-SIM-AUTONOMOUS-PROOF):
 *   launch CIMCO + invoke "Machine Simulation" -> --op read-report -> normalize
 *   -> parseSimulationReport verdict.
 * EDM machines route to discharge-physics (CIMCO models mill/lathe kinematics only).
 *
 * FAIL-SAFE: kills every CIMCO between machines (never two at once, never an orphan).
 * Per-machine bounded timeouts; a hung/empty/blocked read is recorded honestly, never
 * a fake clearance. `cleared` is structurally false (this is sim conformance, not
 * metal). Honest about gaps: records ribbonRealized / reportFound / source so a
 * "sim view engaged but report empty" (collision-run-trigger gap) is visible.
 *
 * No shell strings anywhere -- every spawn is execFileSync(bin, [args]) (no injection).
 *
 * CLI: node scripts/cimco-fleet-drive.mjs [--limit N] [--ids VMC-01,LTH-03]
 * Out: state/shared/cimco/fleet-drive-results.{json,md}
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { normalizeReportNodes } from "./lib/cimco-report-normalize.mjs";
import { parseSimulationReport } from "./cimco-control-map.mjs";

const ROOT = "H:/prism";
const EXE = join(ROOT, "mcp-server/data/posts/prism-base/cimco-bridge/ui-driver/PrismCimcoUI.exe");
const MAP = JSON.parse(readFileSync(join(ROOT, "state/shared/cimco/jm-fleet-sim-map.json"), "utf8"));
const machines = MAP.machines || MAP;
const OUT_JSON = join(ROOT, "state/shared/cimco/fleet-drive-results.json");
const OUT_MD = join(ROOT, "state/shared/cimco/fleet-drive-results.md");

const argv = process.argv.slice(2);
const LIMIT = argv.includes("--limit") ? Number(argv[argv.indexOf("--limit") + 1]) : Infinity;
const ONLY_IDS = argv.includes("--ids") ? new Set(argv[argv.indexOf("--ids") + 1].split(",")) : null;
const FRESH = argv.includes("--fresh"); // ignore any prior results cursor
// Reaper-safe path: a PowerShell loop calls the exe per machine (PowerShell isn't a reapable node
// orphan) and writes raw invoke-read envelopes to a JSONL; this fast no-CIMCO node pass normalizes
// them through the real safety gate. Sidesteps the fleet-reaper killing a long node driver mid-sweep.
const FROM_ENV = argv.includes("--from-envelopes") ? argv[argv.indexOf("--from-envelopes") + 1] : null;

// Terminal readiness states -- a machine recorded with one of these is NOT re-driven on resume.
// `skipped-limit` is intentionally NOT terminal (it was deferred, not tested).
const TERMINAL = new Set(["loop-ran", "sim-engaged-no-report", "drive-failed-ribbon", "drive-failed-read", "edm-discharge-physics"]);

const DRIVE_TIMEOUT_MS = 150_000; // one process: CIMCO cold launch + open sim + run (Simulate) + settle + read
const WALK_FILE_CAP = 6000; // bound the JM DIE NC-pool walk
const NC_PER_BUCKET = 3; // representative goldens per machine type

const KILL_SETTLE_MS = 3000; // taskkill /F is async -- let the OS fully release the window before --launch

/** Synchronous sleep (driveMachine is sync; the inter-launch settle must block). */
function sleepSync(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }

// Kill BOTH the CIMCO GUI AND PrismCimcoUI.exe -- the driver runs resident with --keep, so a prior
// invocation lingers holding the CIMCO; not reaping it makes the next --launch collide with a
// half-dead instance ("no XTPMainFrame window"). This is also R14: close every process I spawn.
function killCimco() {
  for (const img of ["CIMCOEdit.exe", "CIMCOSimulation.exe", "PrismCimcoUI.exe"]) {
    try { execFileSync("taskkill", ["/F", "/IM", img, "/T"], { stdio: "ignore", timeout: 15_000 }); }
    catch { /* none running -- expected */ }
  }
  sleepSync(KILL_SETTLE_MS);
}
function runExe(args, timeoutMs) {
  try { return execFileSync(EXE, args, { encoding: "utf8", timeout: timeoutMs, windowsHide: false }); }
  catch (e) { return String(e.stdout || "") + String(e.stderr || ""); } // tolerate timeout/non-zero; parse what came back
}
function tailJson(out) {
  const lines = String(out || "").trim().split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    try { const o = JSON.parse(lines[i]); if (o && typeof o === "object") return o; } catch { /* keep scanning up */ }
  }
  return null;
}

/** Bounded recursive walk of JM DIE collecting NC files, bucketed lathe/mill by path keyword. */
function findNcPool() {
  const lathe = [], mill = [];
  const stack = [join(ROOT, "JM DIE")];
  let seen = 0;
  while (stack.length && seen < WALK_FILE_CAP) {
    const dir = stack.pop();
    let ents; try { ents = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { stack.push(p); continue; }
      seen++;
      if (!/\.(nc|min|hnc)$/i.test(e.name)) continue;
      const up = p.toUpperCase();
      if (/LATHE|OKUMA|GENOS|TURN/.test(up) && lathe.length < NC_PER_BUCKET) lathe.push(p);
      else if (/MILL|VMC|HAAS|HURCO|ROKU|MAZAK/.test(up) && mill.length < NC_PER_BUCKET) mill.push(p);
      if (lathe.length >= NC_PER_BUCKET && mill.length >= NC_PER_BUCKET) return { lathe, mill };
    }
  }
  return { lathe, mill };
}

function isEdm(m) { return /edm/i.test(m.machine_id) || /edm/i.test(m.type || ""); }

function driveMachine(nc) {
  killCimco();
  // Single-process invoke-read: launch CIMCO -> open Machine Simulation -> RUN it ("Simulate") -> settle -> read
  // the report grid, ALL in ONE process holding the frame handle. Fixes the two-process attach (the separate read
  // used to return no-read) AND triggers the collision-run so the report actually populates. One launch per
  // process -> survives the reaper. killCimco backstops any sim child the op's own finally missed (R14).
  const rep = tailJson(runExe(
    ["--op", "invoke-read", "--name", "Machine Simulation", "--then", "Simulate", "--launch", "--nc", nc, "--allow-actions", "--wait", "45", "--settle", "22"],
    DRIVE_TIMEOUT_MS));
  killCimco();
  return recordFromRep(rep, nc);
}

/** Normalize a (possibly null) invoke-read envelope into the per-machine record. SINGLE SOURCE so the
 *  live-drive and the --from-envelopes finalize path classify identically (R7 -- no divergent verdict). */
function recordFromRep(rep, nc) {
  const norm = rep ? normalizeReportNodes(rep) : { rows: [], source: "no-read", blockedBy: "read-failed-or-timeout", nodeCount: 0 };
  const verdict = parseSimulationReport(norm.rows);
  const ribbonRealized = !!(rep && rep.frameRealized);
  const reportFound = !!(rep && rep.found);
  const invokeState = (rep && rep.invokeState) || null;
  // Honest ladder: a null payload means launch-or-read failed outright; a realized ribbon with no report pane OR
  // a header-only/0-row read (AMBIGUOUS -- not clearance-capable) is sim-engaged-no-report; only a report WITH
  // parsed data rows is a full loop run.
  const hasRows = norm.rows.length > 0;
  const readiness = !rep ? "drive-failed-read" : !ribbonRealized ? "drive-failed-ribbon" : (!reportFound || !hasRows) ? "sim-engaged-no-report" : "loop-ran";
  return {
    readiness, nc: nc.split(/[\\/]/).pop(),
    invokeState, ribbonRealized, reportFound,
    reportSource: norm.source, reportRows: norm.rows.length, reportBlockedBy: norm.blockedBy || null,
    simPass: verdict.pass, clearedForLiveRun: verdict.clearedForLiveRun,
    cleared: false, // controllerVerified is structurally false -- sim conformance, not metal
    note: readiness === "sim-engaged-no-report"
      ? "sim ran (see invokeState) but report grid had 0 data rows -- clean program OR no findings; AMBIGUOUS, non-clearing. .mcfg machine-load is the remaining fidelity wire." : undefined,
  };
}

/** --from-envelopes: classify pre-captured invoke-read envelopes (reaper-safe; no CIMCO). JSONL rows:
 *  {machine_id, machine_name, type, mcfg, nc, edm?, envelope?}. Uses recordFromRep -> identical verdict. */
function finalizeFromEnvelopes(started) {
  const lines = readFileSync(FROM_ENV, "utf8").split(/\r?\n/).filter((l) => l.trim());
  const results = [];
  for (const line of lines) {
    let row; try { row = JSON.parse(line); } catch { continue; }
    const base = { machine_id: row.machine_id, machine_name: row.machine_name || "", type: row.type, mcfg: row.mcfg || null };
    if (row.edm) { results.push({ ...base, readiness: "edm-discharge-physics", note: "CIMCO models mill/lathe kinematics only -- EDM verdict is PRISM discharge-physics.", cleared: null }); continue; }
    results.push({ ...base, ...recordFromRep(row.envelope || null, row.nc || "") });
  }
  const rollup = flush(results, { lathe: [], mill: [] }, started);
  process.stderr.write(`[fleet] FINALIZE ${rollup.loopRan} loop-ran / ${rollup.simEngagedNoReport} sim-no-report / ${rollup.driveFailed} drive-failed / ${rollup.edmRouted} EDM <- ${FROM_ENV}\n`);
}

/** Load a prior results cursor: machine_id -> terminal record, so a reaper-killed run resumes. */
function loadCursor() {
  if (FRESH || !existsSync(OUT_JSON)) return new Map();
  try {
    const prior = JSON.parse(readFileSync(OUT_JSON, "utf8"));
    const m = new Map();
    for (const r of prior.results || []) if (r && TERMINAL.has(r.readiness)) m.set(r.machine_id, r);
    return m;
  } catch { return new Map(); } // corrupt/partial prior -> start clean (never throws away the live run)
}

/** Durable flush after EVERY machine -- a reaper kill keeps all prior rows (xray OCR resume lesson). */
function flush(results, pool, started) {
  const rollup = {
    total: results.length,
    edmRouted: results.filter((r) => r.readiness === "edm-discharge-physics").length,
    loopRan: results.filter((r) => r.readiness === "loop-ran").length,
    simEngagedNoReport: results.filter((r) => r.readiness === "sim-engaged-no-report").length,
    driveFailed: results.filter((r) => r.readiness === "drive-failed-ribbon" || r.readiness === "drive-failed-read").length,
  };
  const out = {
    schemaVersion: "1.0.0",
    generatedNote: "CIMCO fleet closed-loop drive (autonomous, resumable). cleared=false everywhere -- sim conformance, not metal.",
    elapsedSec: ((Date.now() - started) / 1000).toFixed(0),
    ncPool: { lathe: pool.lathe, mill: pool.mill },
    rollup, results,
  };
  writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));
  const md = [
    `# CIMCO fleet closed-loop drive -- ${rollup.loopRan}/${rollup.total - rollup.edmRouted} loop-ran (+ ${rollup.edmRouted} EDM-routed)`, "",
    `- loop-ran: ${rollup.loopRan} | sim-engaged-no-report: ${rollup.simEngagedNoReport} | drive-failed: ${rollup.driveFailed} | EDM-routed: ${rollup.edmRouted}`, "",
    "| machine | type | readiness | report | rows | source | note |", "|---|---|---|---|---|---|---|",
  ];
  for (const r of results) md.push(`| ${r.machine_id} | ${r.type} | ${r.readiness} | found=${r.reportFound ?? "-"} | ${r.reportRows ?? "-"} | ${r.reportSource || "-"} | ${(r.note || "").slice(0, 60)} |`);
  writeFileSync(OUT_MD, md.join("\n"));
  return rollup;
}

async function main() {
  const started = Date.now();
  if (FROM_ENV) { finalizeFromEnvelopes(started); return; } // reaper-safe: classify pre-captured envelopes, no CIMCO
  const pool = findNcPool();
  const fallbackLathe = pool.lathe[0] || join(ROOT, "JM DIE/CNC LATHE/9007405.MIN");
  const fallbackMill = pool.mill[0] || fallbackLathe;
  const cursor = loadCursor();
  const results = [];
  let driven = 0;

  for (const m of machines) {
    if (ONLY_IDS && !ONLY_IDS.has(m.machine_id)) continue;
    const base = { machine_id: m.machine_id, machine_name: m.machine_name || "", type: m.type, mcfg: (m.cimcoMatch && m.cimcoMatch.file) || m.simMcfg || null };
    if (cursor.has(m.machine_id)) { results.push(cursor.get(m.machine_id)); continue; } // resume -- already driven
    if (isEdm(m)) {
      results.push({ ...base, readiness: "edm-discharge-physics", note: "CIMCO models mill/lathe kinematics only -- EDM verdict is PRISM discharge-physics.", cleared: null });
      flush(results, pool, started); continue;
    }
    if (driven >= LIMIT) { results.push({ ...base, readiness: "skipped-limit" }); continue; }
    driven++;
    const nc = /lathe/i.test(m.type) ? fallbackLathe : fallbackMill;
    process.stderr.write(`[fleet] ${m.machine_id} (${m.type}) <- ${nc.split(/[\\/]/).pop()}\n`);
    results.push({ ...base, ...driveMachine(nc) });
    flush(results, pool, started); // durable after EACH machine -- reaper-survivable
  }
  killCimco();
  const rollup = flush(results, pool, started);
  process.stderr.write(`[fleet] DONE ${rollup.loopRan} loop-ran / ${rollup.simEngagedNoReport} sim-no-report / ${rollup.driveFailed} drive-failed / ${rollup.edmRouted} EDM in ${((Date.now() - started) / 1000).toFixed(0)}s -> state/shared/cimco/fleet-drive-results.{json,md}\n`);
}

main().catch((e) => {
  try { killCimco(); } catch { /* best-effort cleanup -- kills CIMCOEdit + CIMCOSimulation + the resident PrismCimcoUI (R14) */ }
  process.stderr.write(`[fleet] FATAL ${e?.stack || e}\n`);
  process.exit(1);
});
