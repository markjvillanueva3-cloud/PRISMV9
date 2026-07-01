#!/usr/bin/env node
// scripts/sfc-jm-corpus-analyze.mjs
//
// SFC-JM-ACCURACY -- analyze the as-programmed JM parameter corpus
// (sfc-jm-program-corpus.mjs output) and surface the programs whose programmed
// speeds/feeds the shop's OWN body of work + basic physics disagree with. These
// are the operator's "amateur-written, use as the guideline to TEST AGAINST"
// candidates: the highest-priority programs for PRISM's SFC to re-adjudicate.
//
// Two streaming passes over program-params.jsonl (kept off-heap; 1.17M ops fit
// the value arrays but not 1.17M op objects):
//   pass 1 -- collect spindle/feed values per (machineClass x spindleMode) bucket,
//            compute the shop distribution + Tukey IQR fences.
//   pass 2 -- flag each op vs its bucket fences (shop-relative outlier) AND vs
//            absolute physical bounds (gross error). Top-N most extreme retained.
//
// USAGE: node scripts/sfc-jm-corpus-analyze.mjs [--corpus <jsonl>] [--out <prefix>]
//        [--top N] [--json]
// EXIT: 0 ok; 2 corpus missing.

import { createReadStream, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  summarize, iqrFences, classifyAgainstFences, grossFlags, bucketKey,
} from "./lib/sfc-corpus-analyze-lib.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_CORPUS = "state/shared/sfc-jm-program-corpus/program-params.jsonl";
const DEFAULT_OUT = "state/shared/SFC-JM-CORPUS-ANALYSIS";
const DEFAULT_TOP = 50;

function parseArgs(argv) {
  const a = { corpus: DEFAULT_CORPUS, out: DEFAULT_OUT, top: DEFAULT_TOP, json: false };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--corpus") a.corpus = argv[++i];
    else if (t === "--out") a.out = argv[++i];
    else if (t === "--top") a.top = Number(argv[++i]) || DEFAULT_TOP;
    else if (t === "--json") a.json = true;
  }
  return a;
}

function eachRow(path, onRow) {
  return new Promise((res, rej) => {
    const rl = createInterface({ input: createReadStream(path, "utf8"), crlfDelay: Infinity });
    rl.on("line", (line) => {
      if (!line) return;
      let row;
      try { row = JSON.parse(line); } catch { return; }
      onRow(row);
    });
    rl.on("close", res);
    rl.on("error", rej);
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const corpusPath = resolve(REPO_ROOT, args.corpus);
  if (!existsSync(corpusPath)) { console.error(`[fatal] corpus not found: ${corpusPath}`); process.exit(2); }

  // PASS 1: collect distributions per bucket.
  const spindleByBucket = new Map(); // key -> number[]
  const feedByBucket = new Map();
  let rows = 0, opsTotal = 0;
  await eachRow(corpusPath, (row) => {
    rows++;
    if (!row.ok || !Array.isArray(row.ops)) return;
    for (const op of row.ops) {
      opsTotal++;
      const k = bucketKey(row.machineCategory, op.spindleMode);
      if (Number.isFinite(op.spindleValue)) {
        if (!spindleByBucket.has(k)) spindleByBucket.set(k, []);
        spindleByBucket.get(k).push(op.spindleValue);
      }
      const fk = bucketKey(row.machineCategory, op.feedMode);
      if (Number.isFinite(op.feed)) {
        if (!feedByBucket.has(fk)) feedByBucket.set(fk, []);
        feedByBucket.get(fk).push(op.feed);
      }
    }
  });

  const spindleStats = new Map(), feedStats = new Map();
  for (const [k, vals] of spindleByBucket) { const s = summarize(vals); spindleStats.set(k, { summary: s, fences: iqrFences(s) }); }
  for (const [k, vals] of feedByBucket) { const s = summarize(vals); feedStats.set(k, { summary: s, fences: iqrFences(s) }); }

  // PASS 2: flag ops vs bucket fences + gross physical bounds.
  const counts = { ops: 0, spindleOutliers: 0, feedOutliers: 0, grossOps: 0 };
  const grossByFlag = {};
  const top = []; // most-extreme outliers, bounded
  const pushTop = (rec) => {
    top.push(rec);
    if (top.length > args.top * 4) { top.sort((a, b) => b.severity - a.severity); top.length = args.top; }
  };

  await eachRow(corpusPath, (row) => {
    if (!row.ok || !Array.isArray(row.ops)) return;
    for (const op of row.ops) {
      counts.ops++;
      const sk = bucketKey(row.machineCategory, op.spindleMode);
      const fk = bucketKey(row.machineCategory, op.feedMode);
      const sFences = spindleStats.get(sk)?.fences;
      const fFences = feedStats.get(fk)?.fences;
      const sClass = classifyAgainstFences(op.spindleValue, sFences);
      const fClass = classifyAgainstFences(op.feed, fFences);
      const gross = grossFlags(op, row.units);

      if (sClass !== "normal") counts.spindleOutliers++;
      if (fClass !== "normal") counts.feedOutliers++;
      if (gross.length) { counts.grossOps++; for (const g of gross) grossByFlag[g] = (grossByFlag[g] || 0) + 1; }

      if (gross.length || sClass !== "normal" || fClass !== "normal") {
        // severity: gross errors rank above shop-relative outliers; distance-from-fence as tiebreak.
        let severity = gross.length * 1000;
        if (sFences && sClass !== "normal") severity += Math.abs(op.spindleValue - (sClass === "high" ? sFences.upper : sFences.lower));
        pushTop({
          filePath: row.filePath, machineCategory: row.machineCategory, units: row.units,
          toolNumber: op.toolNumber, spindleMode: op.spindleMode, spindleValue: op.spindleValue,
          feedMode: op.feedMode, feed: op.feed,
          spindleClass: sClass, feedClass: fClass, gross, severity,
        });
      }
    }
  });
  top.sort((a, b) => b.severity - a.severity);
  top.length = Math.min(top.length, args.top);

  const buckets = {};
  for (const [k, v] of spindleStats) buckets[k] = { spindle: v.summary, spindleFences: v.fences };
  for (const [k, v] of feedStats) { buckets[k] = buckets[k] || {}; buckets[k].feed = v.summary; buckets[k].feedFences = v.fences; }

  const report = {
    generatedAt: new Date().toISOString(),
    corpus: corpusPath, programRows: rows, opsTotal,
    counts, grossByFlag,
    bucketCount: Object.keys(buckets).length,
    buckets,
    topOutliers: top,
    note: "Shop-relative outliers use each bucket's own IQR fences (unit-consistent within a bucket). Gross flags assume JM inch convention for unit=unknown (LABELED). These are TEST-AGAINST candidates -- programs to re-adjudicate with PRISM SFC, not ground truth.",
  };

  const outPrefix = resolve(REPO_ROOT, args.out);
  mkdirSync(dirname(outPrefix), { recursive: true });
  writeFileSync(`${outPrefix}.json`, JSON.stringify(report, null, 2));

  if (args.json) console.log(JSON.stringify({ counts, grossByFlag, bucketCount: report.bucketCount, programRows: rows, opsTotal }, null, 2));
  else {
    console.log(`[analyze] ${rows} programs, ${opsTotal} ops, ${report.bucketCount} buckets`);
    console.log(`  spindle outliers ${counts.spindleOutliers} | feed outliers ${counts.feedOutliers} | gross-physical ops ${counts.grossOps}`);
    console.log(`  grossByFlag ${JSON.stringify(grossByFlag)}`);
    console.log(`  report: ${outPrefix}.json (top ${top.length} outliers)`);
  }
  process.exit(0);
}

const INVOKED_DIRECTLY = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (INVOKED_DIRECTLY) main();
