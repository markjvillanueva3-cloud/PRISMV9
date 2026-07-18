#!/usr/bin/env node
// SYSTEM-VIZ-HIGH-ROI-AUDIT-2026-05-20 G4 CLI: dead-pixel sweep over system-graph.
//
// Reads state/shared/system-viz/system-graph.json, runs the pure detector,
// writes report to state/shared/system-viz-dead-pixels-<date>.md (and .json).
//
// Flags:
//   --graph <path>         override input graph
//   --out <path>           override output base (date suffix appended unless .md/.json)
//   --top N                topOrphans (default 50)
//   --max-examples N       cap concrete dead-pixel records (default 500)
//   --json                 also/only emit JSON
//   --no-write             dry-run, stdout only
//   --help

import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { detectDeadPixels, renderDeadPixelMarkdown } from "./lib/system-viz-dead-pixel-detector.mjs";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const DEFAULT_GRAPH = "H:/prism/state/shared/system-viz/system-graph.json";
const DEFAULT_OUT_DIR = "H:/prism/state/shared";

function parseArgs(argv) {
  const a = {
    graphPath: DEFAULT_GRAPH, outPath: null,
    topOrphans: 50, maxExamples: 500,
    emitJson: false, write: true, help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === "--help" || v === "-h") a.help = true;
    else if (v === "--graph" && argv[i + 1]) a.graphPath = argv[++i];
    else if (v === "--out" && argv[i + 1]) a.outPath = argv[++i];
    else if (v === "--top" && argv[i + 1]) a.topOrphans = Number(argv[++i]) || 50;
    else if (v === "--max-examples" && argv[i + 1]) a.maxExamples = Number(argv[++i]) || 500;
    else if (v === "--json") a.emitJson = true;
    else if (v === "--no-write") a.write = false;
  }
  return a;
}

function help() {
  process.stdout.write(`system-viz-dead-pixel-sweep — find referenced-but-missing assets.

USAGE
  node H:/prism/scripts/system-viz-dead-pixel-sweep.mjs [flags]

FLAGS
  --graph <path>         input graph (default ${DEFAULT_GRAPH})
  --out <path>           output base path (default state/shared/system-viz-dead-pixels-<date>.md)
  --top N                topOrphans (default 50)
  --max-examples N       cap concrete dead-pixel records (default 500)
  --json                 emit JSON to stdout
  --no-write             dry-run, stdout only
  --help
`);
}

function todayYMD() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { help(); process.exit(0); }

  if (!existsSync(args.graphPath)) {
    process.stderr.write(`ERROR: graph not found at ${args.graphPath}\n`);
    process.exit(2);
  }

  const t0 = Date.now();
  process.stderr.write(`[dead-pixel-sweep] reading ${args.graphPath} (${(statSync(args.graphPath).size / 1024 / 1024).toFixed(1)} MB)…\n`);
  let graph;
  try {
    graph = readGraphStreaming(args.graphPath); // streaming read — see scripts/lib/graph-io.mjs
  } catch (err) {
    process.stderr.write(`ERROR: parse failed: ${err.message}\n`);
    process.exit(3);
  }
  const t1 = Date.now();
  process.stderr.write(`[dead-pixel-sweep] parsed in ${t1 - t0}ms — ${graph.nodes?.length ?? 0} nodes / ${graph.edges?.length ?? 0} edges\n`);

  const report = detectDeadPixels(graph, {
    topOrphans: args.topOrphans,
    maxDeadPixelExamples: args.maxExamples,
  });
  const t2 = Date.now();
  process.stderr.write(`[dead-pixel-sweep] analyzed in ${t2 - t1}ms — ${report.deadEdgeCount} dead edges / ${report.orphanTargets.length} orphan targets\n`);

  if (args.emitJson) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    if (!args.write) process.exit(0);
  }

  const md = renderDeadPixelMarkdown(report);
  if (!args.write) {
    process.stdout.write(md);
    process.exit(0);
  }

  const ymd = todayYMD();
  const outMd = args.outPath || `${DEFAULT_OUT_DIR}/system-viz-dead-pixels-${ymd}.md`;
  const outJson = outMd.replace(/\.md$/, ".json");
  writeFileSync(outMd, md, "utf8");
  writeFileSync(outJson, JSON.stringify(report, null, 2), "utf8");
  process.stderr.write(`[dead-pixel-sweep] wrote ${outMd} + ${outJson}\n`);
  process.exit(0);
}

const isCli = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/") ?? ""}`
  || (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/")));
if (isCli) main();
