#!/usr/bin/env node
// scripts/run-ocr-benchmark.mjs
//
// U-TDP04 — OCR Extraction Benchmark CLI shell.
//
// Reads a ground-truth JSON catalog, runs the extraction adapter on each
// listed print, compares results, emits per-class precision/recall/F1 +
// dimensional error percentiles. The "prove we can extract correct data"
// gate that decides whether to progress from print-reading to CAD/CAM training.
//
// GROUND-TRUTH SCHEMA (state/shared/ocr-ground-truth/<part_class>.json):
//   {
//     "schemaVersion": 1,
//     "part_class": "extrude_punch",
//     "prints": [
//       {
//         "pdf_path": "H:/prism/JM DIE/Punch-001.pdf",
//         "dimensions": [
//           { "kind": "central_oil_hole", "nominal": 1.27, "tolerance": {"upper": 0.025, "lower": -0.025} },
//           { "kind": "stepped_revolved_axis", "nominal": 6.35 }
//         ]
//       },
//       ...
//     ]
//   }
//
// USAGE:
//   node scripts/run-ocr-benchmark.mjs --ground-truth-dir <dir> [--stub-mode] [--json]
//   node scripts/run-ocr-benchmark.mjs --ground-truth-file <file> [--stub-mode]
//   node scripts/run-ocr-benchmark.mjs --ground-truth-dir <dir> --no-vlm
//
// EXTRACTORS (--stub-mode XOR --no-vlm XOR default cascade):
//   - default          - U-TDP07 cascade: PyMuPDF vector text +
//                        Qwen2.5-VL 7B raster fallback (live Ollama)
//   - --no-vlm         - Stage 1 only (vector text from PyMuPDF; no VLM call)
//   - --stub-mode      - perfect extractor (returns GT verbatim), for plumbing
//
// EXIT CODES:
//   0 — benchmark completed, ALL classes passed thresholds
//   1 — benchmark completed, one or more classes FAILED thresholds
//   2 — ground-truth dir/file missing
//   3 — args / fs error

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { argv, env, exit } from "node:process";
import { fileURLToPath } from "node:url";

import { compareExtractionToGroundTruth, aggregateBenchmark, formatBenchmarkSummary } from "./lib/ocr-benchmark-lib.mjs";
import { makeCascadeExtractor, prewarmVlm } from "./lib/blueprint-extract-io.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_GT_DIR = env.PRISM_OCR_GT_DIR || join(REPO_ROOT, "state", "shared", "ocr-ground-truth");
const DEFAULT_OUT_DIR = env.PRISM_OCR_BENCHMARK_DIR || join(REPO_ROOT, "state", "shared", "ocr-benchmarks");

function parseArgs(args) {
  const out = {
    groundTruthDir: null, groundTruthFile: null,
    stubMode: false, noVlm: false, json: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--ground-truth-dir") out.groundTruthDir = args[++i];
    else if (a === "--ground-truth-file") out.groundTruthFile = args[++i];
    else if (a === "--stub-mode") out.stubMode = true;
    else if (a === "--no-vlm") out.noVlm = true;
    else if (a === "--json") out.json = true;
  }
  return out;
}

function atomicWriteJson(path, obj) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = path + ".tmp-" + process.pid + "-" + Date.now();
  writeFileSync(tmp, JSON.stringify(obj, null, 2));
  renameSync(tmp, path);
}

function loadGroundTruthFile(path) {
  if (!existsSync(path)) return null;
  try {
    const obj = JSON.parse(readFileSync(path, "utf8"));
    if (obj && typeof obj === "object" && typeof obj.part_class === "string" && Array.isArray(obj.prints)) {
      return obj;
    }
    return null;
  } catch {
    return null;
  }
}

function loadGroundTruthDir(dir) {
  const files = [];
  try {
    const entries = readdirSync(dir);
    for (const e of entries) {
      if (!e.toLowerCase().endsWith(".json")) continue;
      const full = join(dir, e);
      const obj = loadGroundTruthFile(full);
      if (obj) files.push(obj);
    }
  } catch {
    // dir not readable
  }
  return files;
}

// Stub extract adapter — uses ground-truth dims AS the extraction (perfect
// match by definition). Used to verify the benchmark plumbing works
// end-to-end without depending on a live vision LLM. R12 honesty: this is
// NOT a real extractor — a 100% pass via --stub-mode proves nothing about
// the live cascade.
function makeStubExtractor() {
  return async ({ ground_truth_dims }) => {
    const dims = (ground_truth_dims || []).map((d) => ({ ...d }));
    return { dimensions: dims, source: "stub" };
  };
}

// Live extract adapter — U-TDP07 cascade (PyMuPDF text + Qwen2.5-VL fallback).
// Returns extraction records the U-TDP04 benchmark grades against the
// presence-only GT taxonomy emitted by U-TDP05 (CAD) + U-TDP06 (CNC).
//
// Honest failure mode: every per-print failure (sidecar exit, PDF corrupt,
// VLM timeout, no kinds detected) surfaces a structured record with
// `dimensions:[]` + populated `notes[]`, so the benchmark walk continues
// and scores the print as a full FN. No silent re-tries, no swallowing.
function makeLiveExtractor(opts = {}) {
  return makeCascadeExtractor({
    useVlm: opts.useVlm !== false,
  });
}

async function main() {
  const args = parseArgs(argv.slice(2));
  if (!args.groundTruthDir && !args.groundTruthFile) {
    console.error("ERR: must provide --ground-truth-dir <dir>  OR  --ground-truth-file <file>");
    exit(3);
  }

  const groundTruthSets = args.groundTruthFile
    ? (loadGroundTruthFile(args.groundTruthFile) ? [loadGroundTruthFile(args.groundTruthFile)] : [])
    : loadGroundTruthDir(args.groundTruthDir);

  if (groundTruthSets.length === 0) {
    console.error("ERR: no valid ground-truth JSON found");
    exit(2);
  }

  const useVlm = !args.noVlm;
  const extractor = args.stubMode
    ? makeStubExtractor()
    : makeLiveExtractor({ useVlm });

  // Prewarm the VLM once (cold-load is ~110s on RTX 4080) so the per-print
  // calls hit the warm-inference path (~15s/page). Skipped in stub-mode
  // (no VLM) and --no-vlm mode (vector-only).
  if (!args.stubMode && useVlm) {
    if (!args.json) console.log("[benchmark] prewarming VLM (cold-load ~110s on first run)...");
    const pre = await prewarmVlm();
    if (!args.json) {
      console.log("[benchmark] VLM prewarm: " + (pre.ok ? ("ok, load_ms=" + pre.loadDurationMs) : ("FAILED: " + pre.reason)));
    }
  }

  const prints = [];
  for (const set of groundTruthSets) {
    for (const gtPrint of set.prints) {
      const extracted = await extractor({
        pdf_path: gtPrint.pdf_path,
        part_class: set.part_class,
        ground_truth_dims: gtPrint.dimensions,
      });
      const comparison = compareExtractionToGroundTruth(
        extracted || { dimensions: [] },
        gtPrint,
      );
      prints.push({ part_class: set.part_class, comparison, extracted });
    }
  }

  const report = aggregateBenchmark(prints);

  // Write report.
  const date = new Date().toISOString().slice(0, 10);
  const outPath = join(DEFAULT_OUT_DIR, "benchmark-" + date + ".json");
  atomicWriteJson(outPath, report);

  if (args.json) {
    console.log(JSON.stringify({ ...report, outputPath: outPath }, null, 2));
  } else {
    for (const line of formatBenchmarkSummary(report)) console.log("[benchmark] " + line);
    console.log("[benchmark] wrote: " + outPath);
  }

  // Exit 1 if any class failed thresholds.
  const allPassed = report.classes.every((c) => c.pass);
  exit(allPassed ? 0 : 1);
}

main().catch((e) => {
  console.error("[benchmark] FATAL: " + (e instanceof Error ? e.message : String(e)));
  exit(3);
});
