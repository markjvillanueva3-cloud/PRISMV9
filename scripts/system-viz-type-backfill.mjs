#!/usr/bin/env node
// scripts/system-viz-type-backfill.mjs
// CLI runner for SYSTEM-VIZ-HIGH-ROI-AUDIT-2026-05-20 G1.
// Reads system-graph.json, applies node-type backfill via the pure lib,
// atomically writes back. Honors PRISM_SYSTEM_GRAPH_WRITE_LOCK (U-VIZ-F11).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming, writeGraphStreamingAtomic } from "./lib/graph-io.mjs";
import {
  applyTypeBackfill,
  countTypeCoverage,
} from "./lib/system-viz-type-backfill.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO = path.resolve(__dirname, "..");
const GRAPH = path.join(REPO, "state/shared/system-viz/system-graph.json");
const LOCK_DIR = path.join(REPO, ".cron-locks");
const LOCK_FILE = path.join(LOCK_DIR, "system-graph.write.lock");
const LOCK_OFF = process.env.PRISM_SYSTEM_GRAPH_WRITE_LOCK_OFF === "1";

function parseArgs(argv) {
  const args = { dryRun: false, onUnknown: "throw", graphPath: GRAPH, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--allow-unknown") args.onUnknown = "allow";
    else if (a === "--skip-unknown") args.onUnknown = "skip";
    else if (a === "--json") args.json = true;
    else if (a === "--graph") args.graphPath = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.log(
        [
          "system-viz-type-backfill — backfill node.type from id-prefix.",
          "",
          "Usage: node scripts/system-viz-type-backfill.mjs [--dry-run] [--allow-unknown|--skip-unknown] [--json] [--graph <path>]",
          "",
          "  --dry-run         analyze only; do not write back",
          "  --allow-unknown   type novel prefixes as 'unknown' (default: fail-loud throw)",
          "  --skip-unknown    leave novel prefixes untyped (default: fail-loud throw)",
          "  --json            machine-readable report on stdout",
          "  --graph <path>    override path to system-graph.json",
          "",
          "Honors PRISM_SYSTEM_GRAPH_WRITE_LOCK_OFF=1 to bypass cross-lock (U-VIZ-F11).",
        ].join("\n"),
      );
      process.exit(0);
    }
  }
  return args;
}

function acquireLock() {
  if (LOCK_OFF) return null;
  if (!fs.existsSync(LOCK_DIR)) fs.mkdirSync(LOCK_DIR, { recursive: true });
  // Best-effort: write our pid + timestamp. Detect stale (older than 10 min).
  const STALE_MS = 10 * 60 * 1000;
  if (fs.existsSync(LOCK_FILE)) {
    try {
      const st = fs.statSync(LOCK_FILE);
      const ageMs = Date.now() - st.mtimeMs;
      if (ageMs < STALE_MS) {
        const body = fs.readFileSync(LOCK_FILE, "utf8");
        throw new Error(
          `system-graph write lock held (age=${Math.round(ageMs / 1000)}s, holder=${body.trim()}). ` +
            `Wait or set PRISM_SYSTEM_GRAPH_WRITE_LOCK_OFF=1 to bypass.`,
        );
      }
      // Stale: take over.
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  fs.writeFileSync(LOCK_FILE, `pid=${process.pid} script=system-viz-type-backfill at=${new Date().toISOString()}\n`);
  return LOCK_FILE;
}

function releaseLock(lock) {
  if (!lock) return;
  try {
    fs.unlinkSync(lock);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
}

function atomicWrite(filePath, contents) {
  const dir = path.dirname(filePath);
  const tmp = path.join(dir, `.tmp.${path.basename(filePath)}.${process.pid}.${Date.now()}`);
  fs.writeFileSync(tmp, contents);
  fs.renameSync(tmp, filePath); // atomic on same volume
}

function topByCount(obj, n) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

function main(argv) {
  const args = parseArgs(argv);
  if (!fs.existsSync(args.graphPath)) {
    console.error(`graph not found: ${args.graphPath}`);
    process.exit(2);
  }
  const startedAt = Date.now();

  const rawSize = fs.statSync(args.graphPath).size;
  const graph = readGraphStreaming(args.graphPath);  // off-heap: JSON.parse(readFileSync utf8) throws at >512MiB (U-VIZ-READER-CAPSAFE 2026-06-10)

  const before = countTypeCoverage(graph);

  let report, applyError = null;
  try {
    report = applyTypeBackfill(graph, { onUnknown: args.onUnknown });
  } catch (e) {
    applyError = e.message;
  }

  if (applyError) {
    // R12: surface novel prefix; do NOT write.
    if (args.json) {
      console.log(JSON.stringify({ ok: false, error: applyError, before }));
    } else {
      console.error("ERROR (R12 fail-loud):", applyError);
      console.error(
        "Hint: rerun with --allow-unknown to type novel prefixes as 'unknown', " +
          "or --skip-unknown to leave them untyped.",
      );
    }
    process.exit(3);
  }

  const after = countTypeCoverage(graph);

  let lock = null;
  let writeDurationMs = 0;
  if (!args.dryRun) {
    lock = acquireLock();
    try {
      const t0 = Date.now();
      writeGraphStreamingAtomic(args.graphPath, graph);  // cap-safe: raw JSON.stringify on the >512MiB graph throws Invalid-string-length (U-VIZ-WRITER-CAPSAFE 2026-06-23)
      writeDurationMs = Date.now() - t0;
    } finally {
      releaseLock(lock);
    }
  }

  const result = {
    ok: true,
    dryRun: args.dryRun,
    onUnknown: args.onUnknown,
    graphPath: args.graphPath,
    rawSizeMB: Math.round((rawSize / 1024 / 1024) * 10) / 10,
    before: {
      total: before.total,
      typed: before.typed,
      untyped: before.untyped,
      pctTyped: Math.round(before.pctTyped * 10) / 10,
    },
    after: {
      total: after.total,
      typed: after.typed,
      untyped: after.untyped,
      pctTyped: Math.round(after.pctTyped * 10) / 10,
    },
    delta: {
      mapped: report.mapped,
      alreadyTyped: report.alreadyTyped,
      allowedUnknown: report.allowedUnknown,
      skippedUnknown: report.skippedUnknown,
      noId: report.noId,
    },
    topTypesAddedByPrefix: Object.fromEntries(topByCount(report.typesAddedByPrefix, 20)),
    unknownPrefixes: Object.fromEntries(topByCount(report.unknownPrefixes, 30)),
    writeDurationMs,
    totalDurationMs: Date.now() - startedAt,
    lockHonored: !LOCK_OFF,
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`graph: ${result.graphPath} (${result.rawSizeMB} MB)`);
  console.log(`onUnknown: ${result.onUnknown}  dryRun: ${result.dryRun}  lock-honored: ${result.lockHonored}`);
  console.log("");
  console.log("BEFORE:");
  console.log(`  total:    ${result.before.total}`);
  console.log(`  typed:    ${result.before.typed} (${result.before.pctTyped}%)`);
  console.log(`  untyped:  ${result.before.untyped}`);
  console.log("");
  console.log("AFTER:");
  console.log(`  total:    ${result.after.total}`);
  console.log(`  typed:    ${result.after.typed} (${result.after.pctTyped}%)`);
  console.log(`  untyped:  ${result.after.untyped}`);
  console.log("");
  console.log(`DELTA: mapped=${result.delta.mapped}  alreadyTyped=${result.delta.alreadyTyped}` +
    `  allowedUnknown=${result.delta.allowedUnknown}  skippedUnknown=${result.delta.skippedUnknown}` +
    `  noId=${result.delta.noId}`);
  console.log("");
  console.log("Top 10 types added (by id-prefix):");
  for (const [p, n] of topByCount(report.typesAddedByPrefix, 10)) {
    console.log(`  ${p.padEnd(12)} ${n}`);
  }
  if (Object.keys(result.unknownPrefixes).length > 0) {
    console.log("");
    console.log("Unknown prefixes (need PREFIX_TO_TYPE mapping):");
    for (const [p, n] of topByCount(result.unknownPrefixes, 20)) {
      console.log(`  ${p.padEnd(20)} ${n}`);
    }
  }
  console.log("");
  console.log(`Wrote graph in ${result.writeDurationMs} ms` + (args.dryRun ? " (DRY RUN — not written)" : ""));
  console.log(`Total time: ${result.totalDurationMs} ms`);
}

main(process.argv.slice(2));
