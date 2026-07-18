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
//        [--census <census.json>] [--holdout <eval-manifest.json> ...] [--report-only] [--json]
// Defaults: pairs=state/shared/blueprint-training-pairs.jsonl
//           out=state/shared/blueprint-trainset-clean.jsonl
//           census=state/shared/blueprint-trainset-census.json
//
// --holdout (DELTA-CAD-COMPLETION/U-DELTA-TRAINSET-LEAKGUARD + U-DELTA-HOLDOUT-MULTI): REPEATABLE.
// Given one or more eval-split manifests (e.g. --holdout cad-holdout/geom-50.json --holdout
// cad-holdout/ocr-150.json), every record whose part/path is in the UNION of the splits is EXCLUDED
// before curation (train/test leak guard) and counted as held_out_excluded in the census. Excluding only
// one split would leak the others, so multiple eval sets MUST be passed together. A belt-and-suspenders
// assertTrainsetNoLeak then proves the emitted set is disjoint from the union (fail-loud). Omitting
// --holdout is byte-identical to the pre-leakguard behavior (back-compat).
// NOTE: with --holdout active ONLY, the kept subset (~clean-trainset size, a fraction of the corpus)
// is buffered in memory for the belt assert -- the pairs file itself is still streamed, never parsed whole.

import { createReadStream, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { argv, exit } from "node:process";
import {
  curateRecord, newCurationStats, accumulate, finalizeCuration,
} from "./lib/blueprint-trainset-curate-lib.mjs";
import { loadHoldout } from "./lib/cad-holdout-guard.mjs";
import { buildHoldoutGuardIndex, mergeHoldoutGuardIndexes, recordLeak, assertTrainsetNoLeak } from "./lib/cad-trainset-leakguard-lib.mjs";

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
  // --holdout is REPEATABLE: the trainset must be disjoint from the UNION of every eval split passed
  // (e.g. --holdout geom-50.json --holdout ocr-150.json) -- excluding only one split leaks the other.
  const getAll = (f) => { const out = []; for (let i = 0; i < args.length; i++) if (args[i] === f) out.push(args[i + 1]); return out; };
  const holdoutPaths = getAll("--holdout");
  // R12: any `--holdout` with no value -- bare-trailing OR immediately followed by another --flag
  // (e.g. `--holdout --report-only`, which would consume "--report-only" as the path) -- must fail loud,
  // never silently disable the leak guard the user asked for.
  if (args.includes("--holdout") && holdoutPaths.some((v) => !v || v.startsWith("--"))) {
    console.error("[curate] --holdout requires a manifest path (repeatable; e.g. --holdout state/shared/cad-holdout/geom-50.json --holdout state/shared/cad-holdout/ocr-150.json)");
    exit(2);
  }

  if (!existsSync(pairs)) { console.error(`[curate] pairs manifest not found: ${pairs}`); exit(2); }

  // U-DELTA-TRAINSET-LEAKGUARD: optional train/test leak guard. loadHoldout throws on a
  // missing/corrupt/empty manifest (R12 -- an empty holdout silently disables the guard).
  let holdoutIdx = null;
  let heldOutExcluded = 0;
  const heldOutByVia = { path: 0, stem: 0, id: 0 };
  const holdoutManifests = []; // {manifest, count} per --holdout, for the census
  const keptRaw = []; // raw kept records, ONLY tracked when a holdout is active (belt assert)
  if (holdoutPaths.length) {
    const indexes = [];
    for (const hp of holdoutPaths) {
      const ho = loadHoldout(hp, "abs_path", false); // throws on missing/corrupt/empty (R12)
      indexes.push(buildHoldoutGuardIndex(ho.entries));
      holdoutManifests.push({ manifest: hp, count: ho.count });
    }
    holdoutIdx = indexes.length === 1 ? indexes[0] : mergeHoldoutGuardIndexes(indexes);
    console.error(`[curate] leak guard ON: ${holdoutManifests.length} split(s) -> ${holdoutManifests.map((m) => `${m.count}@${m.manifest.split(/[\\/]/).pop()}`).join(" + ")} (union stems=${holdoutIdx.stems.size}, ids=${holdoutIdx.ids.size})`);
  }

  let acc = newCurationStats();
  const cleanRows = [];
  let badLines = 0;
  const rl = createInterface({ input: createReadStream(pairs), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let recObj;
    try { recObj = JSON.parse(line); } catch { badLines++; continue; }
    // Leak guard FIRST (on the raw record, before curation strips/renames fields): a held-out
    // eval part never enters the curated trainset, regardless of its label quality.
    if (holdoutIdx) {
      const lk = recordLeak(recObj, holdoutIdx);
      if (lk.leaked) {
        heldOutExcluded++;
        heldOutByVia[lk.via] = (heldOutByVia[lk.via] || 0) + 1;
        continue;
      }
    }
    const v = curateRecord(recObj);
    acc = accumulate(acc, v);
    if (v.keep) {
      if (holdoutIdx) keptRaw.push(recObj);
      if (!reportOnly) cleanRows.push(JSON.stringify(v.row));
    }
  }

  // Belt-and-suspenders fail-loud (R12): prove the kept set is disjoint from the eval holdout.
  // The pre-curation filter already excluded leaks; this throws if a logic change ever regresses.
  if (holdoutIdx) assertTrainsetNoLeak(keptRaw, holdoutIdx);

  const census = finalizeCuration(acc);
  if (holdoutIdx) {
    census.held_out_excluded = heldOutExcluded;
    census.held_out_by_via = heldOutByVia;
    census.holdout_manifests = holdoutManifests; // array: every eval split the trainset is disjoint from
  }
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
    if (holdoutIdx) console.log(`  held-out excluded : ${heldOutExcluded}  (leak guard by_via ${JSON.stringify(heldOutByVia)}) from ${holdoutManifests.length} split(s): ${holdoutManifests.map((m) => m.manifest.split(/[\\/]/).pop()).join(", ")}`);
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
