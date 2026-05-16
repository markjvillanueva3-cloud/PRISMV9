#!/usr/bin/env node
/**
 * cron-revwalk.mjs — SYSTEM-VIZ-FS-COVERAGE-MS1/U-MS1-CRON-RUNNER
 *
 * Daily re-walk wrapper. Reads the system-viz graph, ranks namespaces by churn
 * (via namespace-churn-ranker.mjs), and invokes expand-system-viz-l12-files.mjs
 * for the top-N stalest entries. Designed to run from a Windows scheduled task
 * (`PRISM System-Viz Re-walk Daily` — installer in
 *  .claude/helpers/install-system-viz-revwalk-task.ps1) at 03:00 local but is
 * safe to invoke manually any time.
 *
 * Safety:
 *   - Concurrent-writer trample on the 250MB graph: sequential walks ONLY.
 *     Never spawns parallel children that write the graph.
 *   - Lock file at state/shared/.cron-revwalk.lock prevents two instances racing
 *     (a manual /loop iter shouldn't fight the 03:00 scheduled task).
 *   - --dry-run shows what would walk without running expand-system-viz-l12.
 *   - Per-namespace timeout (default 30m) — a stuck walk doesn't block the rest.
 *   - 8 GB heap by default (--max-old-space-size=8192) — the 200k-cap retries
 *     showed the 2GB default is not enough for JM DIE / Docustrata.
 *
 * Usage:
 *   node scripts/cron-revwalk.mjs                                  # run with defaults
 *   node scripts/cron-revwalk.mjs --top 3                          # only top-3
 *   node scripts/cron-revwalk.mjs --dry-run                        # report only, no walks
 *   node scripts/cron-revwalk.mjs --max-files 300000               # raise walk cap
 *   node scripts/cron-revwalk.mjs --json                           # machine output
 *   node scripts/cron-revwalk.mjs --log H:/prism/.cache/cron-revwalk.log
 *
 * Exit codes:
 *   0 — all selected namespaces walked (or none needed)
 *   1 — lock contention (another instance is running)
 *   2 — graph missing/corrupt
 *   3 — one or more walks failed (others may have succeeded — see log)
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  rankNamespacesByChurn,
  selectTopNForRewalk,
  loadNamespacesFromGraph,
  defaultFsStat,
  DEFAULT_TOP_N,
} from "./lib/namespace-churn-ranker.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GRAPH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
const WALK_SCRIPT = path.join(ROOT, "scripts", "expand-system-viz-l12-files.mjs");
const LOCK_FILE = path.join(ROOT, "state", "shared", ".cron-revwalk.lock");
const DEFAULT_BUNDLE_THRESHOLD = 75;
const DEFAULT_HEAP_MB = 8192;
const DEFAULT_PER_WALK_TIMEOUT_MS = 30 * 60 * 1000; // 30 min
const LOCK_STALE_MS = 90 * 60 * 1000; // 90 min — older lockfile is presumed dead

function parseArgs(argv) {
  const out = {
    topN: DEFAULT_TOP_N,
    maxFiles: 250000,
    bundleThreshold: DEFAULT_BUNDLE_THRESHOLD,
    heapMb: DEFAULT_HEAP_MB,
    timeoutMs: DEFAULT_PER_WALK_TIMEOUT_MS,
    dryRun: false,
    json: false,
    logPath: null,
    graphPath: GRAPH,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--json") out.json = true;
    else if (a === "--top") out.topN = Number(argv[++i]) || DEFAULT_TOP_N;
    else if (a === "--max-files") out.maxFiles = Number(argv[++i]) || out.maxFiles;
    else if (a === "--bundle-threshold") out.bundleThreshold = Number(argv[++i]) || out.bundleThreshold;
    else if (a === "--heap") out.heapMb = Number(argv[++i]) || out.heapMb;
    else if (a === "--timeout-ms") out.timeoutMs = Number(argv[++i]) || out.timeoutMs;
    else if (a === "--log") out.logPath = argv[++i];
    else if (a === "--graph") out.graphPath = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.error("usage: cron-revwalk [--top N] [--max-files N] [--bundle-threshold N] [--heap MB] [--timeout-ms N] [--dry-run] [--json] [--log path] [--graph path]");
      process.exit(0);
    }
  }
  return out;
}

function acquireLock() {
  try {
    const stat = fs.statSync(LOCK_FILE);
    const ageMs = Date.now() - stat.mtimeMs;
    if (ageMs < LOCK_STALE_MS) {
      const owner = (() => { try { return fs.readFileSync(LOCK_FILE, "utf8").trim(); } catch { return "unknown"; } })();
      return { acquired: false, owner, ageMs };
    }
    // Stale → claim
  } catch {
    // No lock → claim
  }
  try {
    fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
    fs.writeFileSync(LOCK_FILE, `pid=${process.pid} host=${process.env.COMPUTERNAME || "unknown"} at=${new Date().toISOString()}\n`);
    return { acquired: true };
  } catch (err) {
    return { acquired: false, owner: `lock-write-failed: ${err?.message || String(err)}`, ageMs: 0 };
  }
}

function releaseLock() { try { fs.unlinkSync(LOCK_FILE); } catch { /* ignore */ } }

function appendLog(logPath, line) {
  if (!logPath) return;
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, line + "\n");
  } catch { /* never block on log */ }
}

function runWalk(selected, opts) {
  const env = { ...process.env, NODE_OPTIONS: `--max-old-space-size=${opts.heapMb}` };
  const args = [
    WALK_SCRIPT,
    "--root", selected.root,
    "--apply",
    "--bundle-threshold", String(opts.bundleThreshold),
    "--max-files", String(opts.maxFiles),
  ];
  const startedAt = Date.now();
  let result;
  try {
    result = spawnSync(process.execPath, args, {
      env,
      timeout: opts.timeoutMs,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024, // 16 MB stdout cap
    });
  } catch (err) {
    return { ok: false, namespace: selected.namespace, root: selected.root, durationMs: Date.now() - startedAt, error: err?.message || String(err), stdout: "", stderr: "" };
  }
  const durationMs = Date.now() - startedAt;
  if (result.error) {
    return { ok: false, namespace: selected.namespace, root: selected.root, durationMs, error: result.error.message || String(result.error), stdout: result.stdout || "", stderr: result.stderr || "" };
  }
  if (result.signal === "SIGTERM" || result.signal === "SIGKILL") {
    return { ok: false, namespace: selected.namespace, root: selected.root, durationMs, error: `timed out (signal=${result.signal})`, stdout: result.stdout || "", stderr: result.stderr || "" };
  }
  return {
    ok: result.status === 0,
    namespace: selected.namespace,
    root: selected.root,
    durationMs,
    exitCode: result.status,
    stdout: (result.stdout || "").slice(-2000), // tail-cap stdout
    stderr: (result.stderr || "").slice(-2000),
  };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const log = (msg) => {
    appendLog(opts.logPath, `[${new Date().toISOString()}] ${msg}`);
    if (!opts.json) console.error(msg);
  };

  if (!fs.existsSync(opts.graphPath)) {
    if (opts.json) console.log(JSON.stringify({ ok: false, error: `graph missing: ${opts.graphPath}`, walked: [] }));
    else console.error(`ERROR: graph not found at ${opts.graphPath}`);
    process.exit(2);
  }

  const lock = acquireLock();
  if (!lock.acquired) {
    const msg = `lock held by ${lock.owner} (age ${Math.round(lock.ageMs / 1000)}s)`;
    if (opts.json) console.log(JSON.stringify({ ok: false, error: "lock-contention", lockOwner: lock.owner, walked: [] }));
    else console.error(`cron-revwalk: ${msg} — exiting`);
    process.exit(1);
  }

  try {
    log(`cron-revwalk start — graph=${opts.graphPath} top=${opts.topN} maxFiles=${opts.maxFiles} bundle=${opts.bundleThreshold} heap=${opts.heapMb}MB dry=${opts.dryRun}`);
    const entries = loadNamespacesFromGraph(opts.graphPath);
    if (entries.length === 0) {
      const msg = "no fsCoverage namespaces in graph";
      log(msg);
      if (opts.json) console.log(JSON.stringify({ ok: true, walked: [], skipped: [], note: msg }));
      process.exit(0);
    }
    const ranked = rankNamespacesByChurn(entries, { fsStat: defaultFsStat });
    const selected = selectTopNForRewalk(ranked, opts.topN);
    log(`ranked ${entries.length} namespaces, ${selected.length} selected for re-walk`);

    if (opts.dryRun) {
      const report = { ok: true, dryRun: true, total: entries.length, selected: selected.map((s) => ({ namespace: s.namespace, root: s.root, churnScore: s.churnScore === Infinity ? "Infinity" : s.churnScore, reason: s.reason })) };
      if (opts.json) console.log(JSON.stringify(report, null, 2));
      else {
        console.log(`DRY-RUN — would walk ${selected.length} namespace(s):`);
        selected.forEach((s, i) => console.log(`  #${i + 1} ${s.namespace} — ${s.reason}`));
      }
      process.exit(0);
    }

    const walked = [];
    let failures = 0;
    for (const s of selected) {
      log(`walking ${s.namespace} root=${s.root}`);
      const r = runWalk(s, opts);
      if (!r.ok) failures++;
      walked.push(r);
      log(`  → ${r.ok ? "OK" : "FAIL"} duration=${(r.durationMs / 1000).toFixed(1)}s exit=${r.exitCode ?? "?"}${r.error ? " error=" + r.error : ""}`);
    }
    const summary = { ok: failures === 0, walked: walked.length, succeeded: walked.length - failures, failed: failures, namespaces: walked.map(({ namespace, ok, durationMs, exitCode, error }) => ({ namespace, ok, durationMs, exitCode, error })) };
    if (opts.json) console.log(JSON.stringify(summary, null, 2));
    else console.log(`cron-revwalk DONE — ${summary.succeeded}/${summary.walked} succeeded${failures ? `, ${failures} FAILED` : ""}`);
    process.exit(failures > 0 ? 3 : 0);
  } finally {
    releaseLock();
  }
}

// Run when invoked directly (not when imported).
const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();

// Export the runner for tests
export { acquireLock, releaseLock, parseArgs, runWalk, LOCK_FILE, LOCK_STALE_MS, DEFAULT_PER_WALK_TIMEOUT_MS };
