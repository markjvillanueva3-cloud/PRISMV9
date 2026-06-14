#!/usr/bin/env node
// scripts/blueprint-trainset-curate.mjs
//
// U-PSGB-XRAY-TRAINSET-CURATE — curate the supervised OCR/print→CAD training set from the
// existing pairing manifest, EXCLUDING poison labels (garbage/ambiguous match_confidence).
//
// WHY: blueprint-training-pairs.jsonl marks 4,245 parts `train_eligible`, but the corpus'
// own match_confidence flags ~5,029 garbage + 232 ambiguous pairings inside that set — a
// print joined to the WRONG program/CAD answer-key. Training a dimension reader against a
// wrong key is garbage-in-garbage-out. This emits ONLY the trustworthy-labeled parts
// (exact/loose + a real program/CAD source) as the curated trainset, tagged by training
// subset (roundtrip_b = print+CAD, print_program, triple).
//
// Pure streaming (the 51.8MB pairs file is never JSON.parse'd whole). NO OCR, NO Ollama,
// NO PDF/CAD reads. R8: consumes juliett's already-built pairs manifest. In-session-runnable.
//
// Usage:
//   node scripts/blueprint-trainset-curate.mjs [--pairs <path>] [--out <trainset.jsonl>]
//        [--census <census.json>] [--report-only] [--json]
// Defaults: pairs=state/shared/blueprint-training-pairs.jsonl
//           out=state/shared/blueprint-trainset-clean.jsonl
//           census=state/shared/blueprint-trainset-census.json

import { createReadStream, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { argv, exit } from "node:process";
import {
  curateRecord, newCurationStats, accumulate, finalizeCuration,
} from "./lib/blueprint-trainset-curate-lib.mjs";

function atomicWrite(path, text) {
  const dir = dirname(path);
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = path + ".tmp-" + process.pid;
  writeFileSync(tmp, text);
  renameSync(tmp, path);
}

async function main() {
  const args = argv.slice(2);
  const get = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
  const pairs = get("--pairs", "H:/prism/state/shared/blueprint-training-pairs.jsonl");
  const outTrain = get("--out", "H:/prism/state/shared/blueprint-trainset-clean.jsonl");
  const outCensus = get("--census", "H:/prism/state/shared/blueprint-trainset-census.json");
  const reportOnly = args.includes("--report-only");
  const jsonOut = args.includes("--json");

  if (!existsSync(pairs)) { console.error(`[curate] pairs manifest not found: ${pairs}`); exit(2); }

  let acc = newCurationStats();
  const cleanRows = [];
  let badLines = 0;
  const rl = createInterface({ input: createReadStream(pairs), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let recObj;
    try { recObj = JSON.parse(line); } catch { badLines++; continue; }
    const v = curateRecord(recObj);
    acc = accumulate(acc, v);
    if (v.keep && !reportOnly) cleanRows.push(JSON.stringify(v.row));
  }

  const census = finalizeCuration(acc);
  // schemaVersion + advisory envelope per repo §SCHEMA VERSIONING (every state JSON requires one)
  census.schemaVersion = "1.0.0";
  census.kind = "blueprint-trainset-census";
  census.owner_slot = "xray";
  census.source = pairs;
  census.bad_lines = badLines;
  census.note = "ADVISORY — curated supervised trainset profile; clean rows exclude poison (garbage/ambiguous) labels. Human-verify before a training run.";
  census.mustHumanVerify = true;

  atomicWrite(outCensus, JSON.stringify(census, null, 2));
  if (!reportOnly) {
    atomicWrite(outTrain, cleanRows.join("\n") + (cleanRows.length ? "\n" : ""));
  }

  if (jsonOut) {
    console.log(JSON.stringify(census, null, 2));
  } else {
    console.log(`[curate] === trainset curation (${census.total_parts} parts) ===`);
    console.log(`  CLEAN trainset    : ${census.clean_trainset}  (clean_rate ${census.clean_rate})`);
    console.log(`  excluded          : ${census.excluded}  (POISON labels: ${census.poison_excluded})`);
    console.log(`  by tier           : ${JSON.stringify(census.by_tier)}`);
    console.log(`  trainable subsets : ${JSON.stringify(census.trainable_subsets)}`);
    console.log(`  exclusion reasons : ${JSON.stringify(census.by_exclusion_reason)}`);
    if (badLines) console.log(`  ⚠ ${badLines} unparseable line(s) skipped`);
    console.log(`  census → ${outCensus}`);
    if (!reportOnly) console.log(`  clean trainset → ${outTrain} (${census.clean_trainset} rows)`);
  }
  // honest exit: a corpus with parts but ZERO clean labels is a degenerate (every label poison/absent)
  exit(census.total_parts > 0 && census.clean_trainset === 0 ? 3 : 0);
}

main().catch((e) => { console.error("[curate] FATAL: " + (e instanceof Error ? e.message : String(e))); exit(1); });
