#!/usr/bin/env node
// scripts/cnc-ground-truth-build.mjs
//
// U-TDP06 — CNC-derived Ground Truth CLI shell.
//
// Walks a CNC program corpus, derives presence-only BlueprintExtraction-shape
// ground truth from each program's G-code (via the pure
// scripts/lib/cnc-ground-truth-lib.mjs), and writes one
// <part_class>.json per class in the U-TDP04 benchmark's ground-truth schema
// so `run-ocr-benchmark.mjs --ground-truth-dir <out>` consumes it directly.
//
// This is the CNC half of "compare to cad files and cnc programs to determine
// if you extracted the correct data" (CAD half = U-TDP05). Presence-only by
// design — see the lib header for why a raw-text nominal would poison the
// dim benchmark.
//
// USAGE:
//   node scripts/cnc-ground-truth-build.mjs [--corpus-dir <dir>] [--out-dir <dir>]
//                                            [--max-files N] [--json] [--dry-run]
//
// EXIT CODES:
//   0 — ground truth produced (>=1 record written, or --dry-run with >=1 record)
//   1 — corpus walked but ZERO feature-bearing programs found (no GT produced)
//   2 — corpus directory missing
//   3 — args / fs / fatal error

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve, join, extname } from "node:path";
import { argv, env } from "node:process";
import { fileURLToPath } from "node:url";

import { analyzeNcResult, createBatchSummary, groupRecordsByPartClass } from "./lib/cnc-ground-truth-lib.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_CORPUS_DIR = env.PRISM_CNC_CORPUS_DIR || join(REPO_ROOT, "JM DIE");
const DEFAULT_OUT_DIR = env.PRISM_CNC_GT_DIR || join(REPO_ROOT, "state", "shared", "ocr-ground-truth-cnc");

// NC program extensions only — deliberately NOT .h/.i/.txt (too broad; would
// pull source headers and notes). Mazak .eia, Okuma .min, generic .nc/.cnc,
// Fanuc .tap/.pgm, Siemens .mpf.
const NC_EXTS = new Set([".min", ".nc", ".cnc", ".eia", ".tap", ".pgm", ".mpf"]);
const MAX_FILE_BYTES = 4 * 1024 * 1024; // an NC program over 4 MB is not a hand/post program — skip
const MAX_DEPTH = 8;                    // bounded recursion (symlink-loop / pathological-tree guard)

function parseArgs(args) {
  // maxFiles 0 = unlimited (flag absent — intended). A PRESENT but
  // unparseable/negative --max-files is an operator typo on a bounding flag:
  // fail loud (exit 3) rather than silently scanning the whole corpus.
  const out = { corpusDir: null, outDir: null, maxFiles: 0, json: false, dryRun: false, argError: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--corpus-dir") out.corpusDir = args[++i];
    else if (a === "--out-dir") out.outDir = args[++i];
    else if (a === "--max-files") {
      const raw = args[++i];
      const n = Number(raw);
      if (raw === undefined || !Number.isInteger(n) || n < 0) {
        out.argError = "--max-files requires a non-negative integer (got: " + String(raw) + ")";
      } else {
        out.maxFiles = n;
      }
    } else if (a === "--json") out.json = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--help" || a === "-h") out.help = true;
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

// Bounded, deterministic (sorted) recursive walk. Per-entry failures are
// skipped (fail-soft) and counted; the overall run still fails loud via the
// final record count (R12).
function walkNcFiles(rootDir, maxFiles) {
  const found = [];
  const skipped = { unreadable_dir: 0, too_large: 0 };
  const stack = [{ dir: rootDir, depth: 0 }];
  while (stack.length > 0) {
    if (maxFiles > 0 && found.length >= maxFiles) break;
    const { dir, depth } = stack.pop();
    if (depth > MAX_DEPTH) continue;
    let entries;
    try {
      entries = readdirSync(dir).sort();
    } catch {
      skipped.unreadable_dir += 1;
      continue;
    }
    for (const e of entries) {
      const full = join(dir, e);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        stack.push({ dir: full, depth: depth + 1 });
      } else if (st.isFile() && NC_EXTS.has(extname(e).toLowerCase())) {
        if (st.size > MAX_FILE_BYTES) {
          skipped.too_large += 1;
          continue;
        }
        found.push(full);
        if (maxFiles > 0 && found.length >= maxFiles) break;
      }
    }
  }
  found.sort(); // stable, machine-independent output ordering
  return { found, skipped };
}

function main() {
  const args = parseArgs(argv.slice(2));
  if (args.help) {
    console.log("usage: node scripts/cnc-ground-truth-build.mjs [--corpus-dir <dir>] [--out-dir <dir>] [--max-files N] [--json] [--dry-run]");
    return 0;
  }
  if (args.argError) {
    console.error("ERR: " + args.argError);
    return 3;
  }
  const corpusDir = resolve(args.corpusDir || DEFAULT_CORPUS_DIR);
  const outDir = resolve(args.outDir || DEFAULT_OUT_DIR);

  if (!existsSync(corpusDir) || !statSync(corpusDir).isDirectory()) {
    console.error("ERR: corpus directory missing: " + corpusDir);
    return 2;
  }

  const { found, skipped } = walkNcFiles(corpusDir, args.maxFiles);

  // Streaming pass: analyze each NC file exactly once and let its content go
  // out of scope before the next read. The previous design retained every
  // file's full text in an `ncResults` array (to re-feed summarizeBatch, which
  // re-tokenized it a second time) — ~16.5k NC files in JM DIE/CNC LATHE alone
  // made that unbounded retention OOM. Memory is now bounded by `records`,
  // which holds only the small GT objects of feature-bearing programs.
  const records = [];
  const summaryAcc = createBatchSummary();
  let readErrors = 0;
  for (const file of found) {
    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      readErrors += 1;
      continue;
    }
    const analysis = analyzeNcResult({ file_path: file, content });
    summaryAcc.add(analysis);
    if (analysis.record) records.push(analysis.record);
    // `content` is now unreferenced — eligible for GC before the next file.
  }

  const summary = summaryAcc.result();
  const grouped = groupRecordsByPartClass(records);

  const result = {
    schemaVersion: 1,
    generated_at: new Date().toISOString(),
    corpus_dir: corpusDir,
    out_dir: outDir,
    scanned: found.length,
    gt_records: records.length,
    part_classes: grouped.length,
    read_errors: readErrors,
    skipped,
    summary,
    advisoryOnly: true,
    mustHumanVerify: true,
  };

  if (!args.dryRun) {
    for (const set of grouped) {
      atomicWriteJson(join(outDir, set.part_class + ".json"), set);
    }
    atomicWriteJson(join(outDir, "_manifest.json"), result);
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("[cnc-gt] corpus:   " + corpusDir);
    console.log("[cnc-gt] scanned:  " + found.length + " NC files");
    console.log("[cnc-gt] GT recs:  " + records.length + " (" + grouped.length + " part classes)");
    console.log("[cnc-gt] no-feat:  " + summary.no_features + " | read-err: " + readErrors + " | too-large: " + skipped.too_large);
    console.log("[cnc-gt] " + (args.dryRun ? "DRY RUN — nothing written" : "wrote: " + outDir));
  }

  // R12 exit contract:
  //  - >=1 GT record               → 0 (success)
  //  - 0 records on a FULL walk    → 1 (loud "barren corpus" failure)
  //  - 0 records on a --max-files  → 0 + WARN. A bounded SAMPLE having no
  //    features is NOT evidence the corpus is barren; emitting exit 1 here
  //    (the round-1 P1) would false-fail smoke-test automation.
  if (records.length > 0) return 0;
  if (args.maxFiles > 0) {
    console.error("[cnc-gt] WARN: sampled " + found.length + " file(s) via --max-files, 0 had features — NOT a corpus-wide verdict");
    return 0;
  }
  console.error("[cnc-gt] FAIL: full corpus walk produced 0 ground-truth records");
  return 1;
}

// main() RETURNS its exit code; we set process.exitCode rather than calling
// process.exit(). process.exit() force-truncates buffered stdout/stderr when
// they are a pipe (which they are under any non-TTY harness) — that silently
// ate the --json report and the WARN/FAIL lines (an R12 fail-loud violation:
// a run whose verdict vanishes looks like a no-op). Setting exitCode lets node
// drain both streams, then exit with the right code.
try {
  const code = main();
  process.exitCode = Number.isInteger(code) ? code : 0;
} catch (e) {
  console.error("[cnc-gt] FATAL: " + (e instanceof Error ? e.message : String(e)));
  process.exitCode = 3;
}
