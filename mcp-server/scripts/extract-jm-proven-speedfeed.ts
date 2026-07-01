#!/usr/bin/env tsx
/**
 * extract-jm-proven-speedfeed.ts -- U-SFC-PROVEN-PIPELINE-ACTIVATE (slot:oscar)
 *
 * Resumable corpus miner that activates the dormant JM-Die proven speed/feed
 * pipeline. Parses the JM Die program corpus, aggregates via
 * ProvenSpeedFeedAggregatorEngine, and persists the versioned store that the
 * engine hydrates at init -- which is what makes the orchestrator's proven-blend
 * (SpeedFeedOrchestratorEngine.ts:2196) go live in the MCP server (today the
 * singleton is empty every process).
 *
 * TWO LANES (fold into ONE store -- disjoint material:op:lathe vs :mill keys):
 *   - LATHE: walk .MIN Okuma programs -> OkumaOSPParserEngine -> aggregateLatheData.
 *     RESUMABLE (host reaps long node procs -- reference_xray_ocr_corpus_resumable):
 *     durable processed-cursor + per-file raw-rows JSONL; re-runs skip done files;
 *     store re-aggregated from the FULL raw JSONL each pass + checkpoint-persisted.
 *   - MILL: JMDieProgramInventoryEngine.scan -> findByType("mill") ->
 *     MillPatternMinerEngine.mineJMDiePrograms (skips .mcx-8 + unparsed controllers)
 *     -> chip_load_samples -> aggregateMillData. Single idempotent batch (the mill
 *     corpus is small); samples written to a raw-mill JSONL the aggregation folds in.
 *
 * Usage:
 *   npx tsx scripts/extract-jm-proven-speedfeed.ts [options]
 *     --lane <lathe|mill|both>  which lane(s) to mine (default: lathe)
 *     --root <dir>              lathe corpus root (default: H:/PRISM/JM DIE/CNC LATHE)
 *     --mill-root <dir>         mill scan root (default: H:/PRISM/JM DIE)
 *     --max-files <N>           cap files processed THIS run, per lane (default: all)
 *     --checkpoint-every <N>    lathe: re-aggregate + persist every N files (default: 2000)
 *     --store <path>            store path override (default: data/state/proven-speed-feed-store.json)
 *     --reset                   truncate cursor + raw JSONLs and start fresh
 *     --json                    emit machine-readable summary
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { okumaOSPParserEngine } from "../src/engines/OkumaOSPParserEngine.js";
import type { DetailedSpeedFeed } from "../src/engines/OkumaOSPParserEngine.js";
import {
  provenSpeedFeedAggregatorEngine,
  type ProvenSpeedFeedStore,
} from "../src/engines/ProvenSpeedFeedAggregatorEngine.js";
import { millPatternMinerEngine } from "../src/engines/MillPatternMinerEngine.js";
import type { ChipLoadSample } from "../src/engines/MillPatternMinerEngine.js";
import { jmDieProgramInventoryEngine } from "../src/engines/JMDieProgramInventoryEngine.js";
import { jmdieMillProvenSamples } from "../src/engines/lib/jmdie-mill-proven-samples.js";
import { PATHS } from "../src/constants.js";

type Lane = "lathe" | "mill" | "both";

interface Args {
  lane: Lane;
  root: string;
  millRoot: string;
  maxFiles: number;
  checkpointEvery: number;
  storePath?: string;
  reset: boolean;
  json: boolean;
  includeCatalog: boolean;
}

function parseArgs(argv: string[]): Args {
  const a: Args = {
    lane: "lathe",
    root: path.join("H:/PRISM", "JM DIE", "CNC LATHE"),
    millRoot: path.join("H:/PRISM", "JM DIE"),
    maxFiles: Number.POSITIVE_INFINITY,
    checkpointEvery: 2000,
    reset: false,
    json: false,
    includeCatalog: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--lane") {
      const v = (argv[++i] || "").toLowerCase();
      if (v === "lathe" || v === "mill" || v === "both") a.lane = v;
    } else if (t === "--root") a.root = argv[++i];
    else if (t === "--mill-root") a.millRoot = argv[++i];
    else if (t === "--max-files") a.maxFiles = Math.max(1, parseInt(argv[++i], 10) || 0);
    else if (t === "--checkpoint-every") a.checkpointEvery = Math.max(1, parseInt(argv[++i], 10) || 2000);
    else if (t === "--store") a.storePath = argv[++i];
    else if (t === "--reset") a.reset = true;
    else if (t === "--json") a.json = true;
    else if (t === "--no-catalog") a.includeCatalog = false;
  }
  return a;
}

const STATE_DIR = path.join(PATHS.MCP_SERVER, "data", "state");
const CURSOR_FILE = path.join(STATE_DIR, "proven-sf-mine-cursor.jsonl");
const RAW_FILE = path.join(STATE_DIR, "proven-sf-raw-lathe.jsonl");
const RAW_MILL_FILE = path.join(STATE_DIR, "proven-sf-raw-mill.jsonl");

/** Recursively collect .MIN file paths under root (case-insensitive extension). */
function collectMinFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const out: string[] = [];
  const stack: string[] = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue; // unreadable dir -- fail-soft, skip
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile() && e.name.toLowerCase().endsWith(".min")) out.push(full);
    }
  }
  return out;
}

/** Read the processed-cursor into a Set of already-attempted file paths. */
function loadCursor(): Set<string> {
  const done = new Set<string>();
  if (!fs.existsSync(CURSOR_FILE)) return done;
  const raw = fs.readFileSync(CURSOR_FILE, "utf-8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const rec = JSON.parse(t) as { file?: string };
      if (rec.file) done.add(rec.file);
    } catch {
      /* skip corrupt cursor line */
    }
  }
  return done;
}

/**
 * JSONL reader. `dedup` collapses byte-identical lines and is for the APPEND-based
 * lathe lane ONLY: a kill in the window between the raw-row append and the cursor
 * mark makes a resume re-process that file and re-append byte-identical rows (the
 * parse is deterministic), which would double-count. The MILL lane OVERWRITES its
 * raw file in one batch (no resume re-append), so it must NOT dedup -- two distinct
 * programs legitimately sharing rpm/feed/tool/op are real repeated observations
 * whose count drives confidence; collapsing them would undercount n.
 *
 * Whole-file read stays well under V8's ~512MB string cap even at the full lathe
 * corpus (~200K rows * ~0.4KB ~= 80MB); switch to a streaming reader only if a
 * raw JSONL ever approaches the cap.
 */
function loadJsonl<T>(file: string, dedup: boolean): T[] {
  const rows: T[] = [];
  if (!fs.existsSync(file)) return rows;
  const raw = fs.readFileSync(file, "utf-8");
  const seen = dedup ? new Set<string>() : null;
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    if (seen) {
      if (seen.has(t)) continue;
      seen.add(t);
    }
    try {
      rows.push(JSON.parse(t) as T);
    } catch {
      /* skip corrupt raw line */
    }
  }
  return rows;
}

const loadRawRows = (): DetailedSpeedFeed[] => loadJsonl<DetailedSpeedFeed>(RAW_FILE, true);
const loadRawMillSamples = (): ChipLoadSample[] => loadJsonl<ChipLoadSample>(RAW_MILL_FILE, false);

/**
 * Mill lane: scan the JM Die tree, take mill programs, mine chip-load samples,
 * and write them to the raw-mill JSONL (overwrite -- a full idempotent batch).
 */
function mineMillLane(millRoot: string, maxFiles: number, includeCatalog: boolean): {
  entries: number;
  corpusSamples: number;
  catalogSamples: number;
  millProgramsFound: number;
  skipped: number;
} {
  const inv = jmDieProgramInventoryEngine.scan(millRoot);
  const millEntries = inv.programs.filter((p) => p.programType === "mill");
  const batch = Number.isFinite(maxFiles) ? millEntries.slice(0, maxFiles) : millEntries;
  const result = millPatternMinerEngine.mineJMDiePrograms(
    batch.map((p) => ({
      filePath: p.filePath,
      programType: p.programType,
      controller: p.controller,
      customer: p.customer,
      topFolder: p.topFolder,
    })),
  );
  // Fold the curated PROVEN mill catalog (high-quality die-steel HSM seed) into the
  // mill samples -- the corpus G-code yield is thin (Mastercam-binary-dominated).
  const catalog = includeCatalog ? jmdieMillProvenSamples() : [];
  const all = [...result.chip_load_samples, ...catalog];
  const lines = all.map((s) => JSON.stringify(s)).join("\n");
  fs.writeFileSync(RAW_MILL_FILE, lines ? lines + "\n" : "", "utf-8");
  return {
    entries: batch.length,
    corpusSamples: result.chip_load_samples.length,
    catalogSamples: catalog.length,
    millProgramsFound: millEntries.length,
    skipped: result.skipped_programs,
  };
}

/** Re-aggregate from the raw JSONL(s) (both lanes) and persist the versioned store. */
function aggregateAndPersist(storePath: string | undefined, programsSeen: number): {
  store: ProvenSpeedFeedStore;
  file: string;
  paramSets: number;
} {
  const latheRows = loadRawRows();
  const millSamples = loadRawMillSamples();
  provenSpeedFeedAggregatorEngine.clear();
  const aggL = provenSpeedFeedAggregatorEngine.aggregateLatheData(latheRows);
  const aggM = provenSpeedFeedAggregatorEngine.aggregateMillData(millSamples);
  const totalSamples = aggL.totalSamples + aggM.totalSamples;
  const meta = { source: "jm-die-corpus:lathe+mill", totalPrograms: programsSeen, totalSamples };
  const res = provenSpeedFeedAggregatorEngine.persistToStore(storePath, meta);
  return { store: provenSpeedFeedAggregatorEngine.serialize(meta), file: res.file, paramSets: res.params };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  // When --store is given, make persist AND the load-at-init summary read-back
  // resolve the SAME file (otherwise the summary would hydrate the default
  // store and mix stale params into the printed result).
  if (args.storePath) process.env.PRISM_PROVEN_SF_STORE = args.storePath;
  fs.mkdirSync(STATE_DIR, { recursive: true });

  if (args.reset) {
    for (const f of [CURSOR_FILE, RAW_FILE, RAW_MILL_FILE]) {
      if (fs.existsSync(f)) fs.rmSync(f);
    }
  }

  const doLathe = args.lane !== "mill";
  const doMill = args.lane !== "lathe";

  let totalMinFilesFound = 0;
  let doneBefore = 0;
  let processed = 0;
  let parseErrors = 0;
  let rowsAppended = 0;
  let latheRemaining = 0;
  const errorSamples: string[] = [];

  if (doLathe) {
    const allFiles = collectMinFiles(args.root);
    totalMinFilesFound = allFiles.length;
    const done = loadCursor();
    doneBefore = done.size;
    const pending = allFiles.filter((f) => !done.has(f));
    const batch = Number.isFinite(args.maxFiles) ? pending.slice(0, args.maxFiles) : pending;

    for (const file of batch) {
      let rows: DetailedSpeedFeed[] = [];
      try {
        const text = fs.readFileSync(file, "utf-8");
        const program = okumaOSPParserEngine.parse(text, path.basename(file));
        rows = okumaOSPParserEngine.extractDetailedSpeedFeeds(program, file);
      } catch (err) {
        parseErrors++;
        if (errorSamples.length < 5) errorSamples.push(`${path.basename(file)}: ${(err as Error).message}`);
        // still mark done below so resume does not retry a poison file forever
      }
      // Stream-append raw rows BEFORE advancing the cursor (durable-then-mark).
      if (rows.length) {
        const lines = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
        fs.appendFileSync(RAW_FILE, lines, "utf-8");
        rowsAppended += rows.length;
      }
      fs.appendFileSync(CURSOR_FILE, JSON.stringify({ file, rows: rows.length, at: new Date().toISOString() }) + "\n", "utf-8");
      processed++;

      if (processed % args.checkpointEvery === 0) {
        const ck = aggregateAndPersist(args.storePath, doneBefore + processed);
        if (!args.json) {
          process.stderr.write(`  [checkpoint] ${processed}/${batch.length} files -> ${ck.paramSets} param sets persisted\n`);
        }
      }
    }
    latheRemaining = allFiles.length - (doneBefore + processed);
  }

  let mill = { entries: 0, corpusSamples: 0, catalogSamples: 0, millProgramsFound: 0, skipped: 0 };
  if (doMill) {
    if (!args.json) process.stderr.write(`  [mill] scanning ${args.millRoot} ...\n`);
    mill = mineMillLane(args.millRoot, args.maxFiles, args.includeCatalog);
  }

  // Final aggregation + persist over the FULL accumulated raw JSONL(s).
  const final = aggregateAndPersist(args.storePath, doneBefore + processed);
  const highConf = provenSpeedFeedAggregatorEngine.getHighConfidenceParams(0.5);
  const exported = provenSpeedFeedAggregatorEngine.exportForSpeedFeedOrchestrator();

  const summary = {
    lane: args.lane,
    corpusRoot: args.root,
    totalMinFilesFound,
    alreadyDoneBeforeRun: doneBefore,
    processedThisRun: processed,
    parseErrors,
    rowsAppendedThisRun: rowsAppended,
    latheRemaining,
    mill,
    totalSamples: final.store.totalSamples,
    paramSets: final.paramSets,
    highConfidenceParamSets: highConf.length,
    storeFile: final.file,
    cursorFile: CURSOR_FILE,
    errorSamples,
    topProven: exported.slice(0, 12).map((e) => ({
      material: e.materialGroup,
      operation: e.operation,
      cssRecommended: e.css?.recommended ?? null,
      feedRecommended: e.feed?.recommended ?? null,
      confidence: Number(e.confidence.toFixed(3)),
      n: e.sampleCount,
    })),
  };

  if (args.json) {
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  } else {
    process.stdout.write(
      `\nJM-Die proven S/F mine complete (lane=${args.lane}):\n` +
        (doLathe
          ? `  lathe: ${summary.totalMinFilesFound} .MIN found, processed this run ${processed} (errors ${parseErrors}), remaining ${latheRemaining}\n`
          : "") +
        (doMill
          ? `  mill: ${mill.millProgramsFound} programs found, mined ${mill.entries} (skipped ${mill.skipped}) -> ${mill.corpusSamples} corpus + ${mill.catalogSamples} catalog chip-load samples\n`
          : "") +
        `  total samples: ${summary.totalSamples}  ->  ${summary.paramSets} param sets (${summary.highConfidenceParamSets} high-conf)\n` +
        `  store: ${final.file}\n\n` +
        `  Top proven parameters:\n` +
        summary.topProven
          .map(
            (p) =>
              `    ${p.material}/${p.operation}: CSS ${p.cssRecommended ?? "-"} feed ${p.feedRecommended ?? "-"} (n=${p.n}, conf=${p.confidence})`,
          )
          .join("\n") +
        "\n",
    );
  }
}

main();
