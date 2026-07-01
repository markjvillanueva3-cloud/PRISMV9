#!/usr/bin/env node
/**
 * extract-jm-proven-speedfeed -- U-SFC-PROVEN-PIPELINE-ACTIVATE (slot:oscar, 2026-06-21)
 * ====================================================================================
 *
 * Activates the DORMANT JM-Die proven speed/feed pipeline. The parser + aggregator
 * (OkumaOSPParserEngine, ProvenSpeedFeedAggregatorEngine) already work end-to-end
 * (POC: 40 .MIN -> 211 rows -> 8 proven sets, 0 parse err) but NOTHING ran them over
 * the corpus and persisted the result, so `provenSpeedFeedAggregatorEngine.getProvenParams`
 * is empty in every process and the orchestrator's proven-blend (SpeedFeedOrchestratorEngine
 * .ts:2164-2191) is dead code. This harness mines the JM Die Okuma lathe corpus
 * (H:/PRISM/JM DIE/CNC LATHE, ~34,993 .MIN), aggregates, and persists a versioned
 * proven-store JSON. RESUMABLE per-file (the host reaps long node procs --
 * reference_xray_ocr_corpus_resumable_multipage_2026_06_08): each file's samples
 * stream-append to a JSONL ledger and the filePath appends to a processed-cursor
 * AFTER its rows are durably written, so a kill mid-run re-runs zero already-done files.
 *
 * Non-outward-facing: produces a DATA file. It does NOT wire the orchestrator to LOAD
 * the store (that changes production UI numbers where confidence>=0.7 -> operator-gated
 * follow-on, paired with the SFC convergence sign-off).
 *
 * Run:
 *   npx tsx scripts/extract-jm-proven-speedfeed.mjs --sample 200        (bounded validate)
 *   npx tsx scripts/extract-jm-proven-speedfeed.mjs                     (full corpus, resumable)
 *   npx tsx scripts/extract-jm-proven-speedfeed.mjs --resume            (continue an interrupted run)
 *   npx tsx scripts/extract-jm-proven-speedfeed.mjs --json              (machine summary)
 *
 * @milestone SFC-CONVERGENCE
 * @unit U-SFC-PROVEN-PIPELINE-ACTIVATE
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { reexecUnderTsxIfNeeded } from "./lib/tsx-reexec-guard.mjs";

export const STORE_SCHEMA_VERSION = "1.0.0";
const DEFAULT_ROOT = "H:/PRISM/JM DIE/CNC LATHE";
// Anchor state paths to the mcp-server root (this script lives in <root>/scripts/) so a
// --resume launched from ANY cwd resolves the SAME ledgers -- never a spurious missing-cursor
// that would otherwise wipe accumulated samples (scrutiny arm C P1).
const MCP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATE_DIR = path.join(MCP_ROOT, "data", "state");
const DEFAULT_STORE = path.join(STATE_DIR, "jm-proven-speedfeed-store.json");
const DEFAULT_SAMPLES = path.join(STATE_DIR, "jm-proven-speedfeed-samples.jsonl");
const DEFAULT_CURSOR = path.join(STATE_DIR, "jm-proven-speedfeed-cursor.jsonl");

// === PURE HELPERS (no I/O -- unit-tested in extract-jm-proven-speedfeed.test.mjs) ===

/** Recursively collect up to `cap` `.MIN` files under `root`. Pure given a readdir fn (injected for tests). */
export function enumerateMinFiles(root, cap = Infinity, readdir = defaultReaddir) {
  const out = [];
  const stack = [root];
  while (stack.length && out.length < cap) {
    const dir = stack.shift();
    let ents;
    try { ents = readdir(dir); } catch { continue; }
    for (const e of ents) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory) stack.push(fp);
      else if (/\.MIN$/i.test(e.name)) {
        out.push(fp);
        if (out.length >= cap) break;
      }
    }
  }
  return out;
}

/** Parse a processed-cursor JSONL body into a Set of done filePaths. Tolerant of torn last line. */
export function parseCursorDoneSet(cursorText) {
  const done = new Set();
  if (!cursorText) return done;
  for (const line of cursorText.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try {
      const o = JSON.parse(t);
      if (o && typeof o.file === "string") done.add(o.file);
    } catch { /* torn final line -- skip (resume re-processes it, harmless) */ }
  }
  return done;
}

/** Split candidate files into {todo, skipped} given a done-set (resume). */
export function partitionByResumeCursor(files, doneSet) {
  const todo = [], skipped = [];
  for (const f of files) (doneSet.has(f) ? skipped : todo).push(f);
  return { todo, skipped };
}

/**
 * Resume reconcile: keep ONLY samples rows whose source file is in the cursor done-set.
 * Rows are stream-appended per file BEFORE the file's cursor mark, so a crash mid-file leaves
 * orphan rows whose file never got marked done. On resume that file is re-processed (not in the
 * done-set) and its rows re-appended -- without this filter the orphan copy would remain and the
 * aggregate would DOUBLE-COUNT (scrutiny arm C P1). Dropping orphans (filePath not committed)
 * makes resume idempotent. Pure.
 */
export function filterCommittedRows(rows, doneSet) {
  return rows.filter((r) => r && typeof r.filePath === "string" && doneSet.has(r.filePath));
}

/** Assemble the versioned persisted store from the aggregator outputs. Pure. */
export function buildProvenStore({ aggregate, exported, highConfidence, filesProcessed, generatedAt }) {
  return {
    schemaVersion: STORE_SCHEMA_VERSION,
    generatedAt,
    source: "JM Die Okuma OSP lathe corpus (.MIN) -- OkumaOSPParserEngine + ProvenSpeedFeedAggregatorEngine",
    filesProcessed,
    totalPrograms: aggregate?.totalPrograms ?? 0,
    totalSamples: aggregate?.totalSamples ?? 0,
    // The aggregator returns outliersFlagged as an ARRAY of {source,value,expected,reason}
    // (ProvenSpeedFeedAggregatorEngine AggregationResult) -- persist the COUNT, not the array
    // (scrutiny arms A/B/C P1: the field is documented/consumed as a count).
    outliersFlagged: Array.isArray(aggregate?.outliersFlagged)
      ? aggregate.outliersFlagged.length
      : (typeof aggregate?.outliersFlagged === "number" ? aggregate.outliersFlagged : 0),
    // exportForSpeedFeedOrchestrator() shape -- the orchestrator-consumable proven params.
    provenParams: Array.isArray(exported) ? exported : [],
    highConfidenceCount: Array.isArray(highConfidence) ? highConfidence.length : 0,
    byMaterialGroup: aggregate?.byMaterialGroup ?? {},
    byOperationCategory: aggregate?.byOperationCategory ?? {},
  };
}

function defaultReaddir(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).map((e) => ({ name: e.name, isDirectory: e.isDirectory() }));
}

// === MAIN (I/O orchestration; guarded so tests can import the pure helpers) ===

async function main() {
  // A bare `node extract-jm-proven-speedfeed.mjs` (overnight cron / scheduled task / ad-hoc) cannot
  // resolve the `.ts` engine imports below -- Node type-strip won't rewrite a .js specifier to .ts.
  // Relaunch under tsx ONCE so every launch path works; no-op when already under tsx. [[tsx-reexec-guard]]
  reexecUnderTsxIfNeeded(import.meta.url);
  const args = process.argv.slice(2);
  const JSON_OUT = args.includes("--json");
  const RESUME = args.includes("--resume");
  const sIdx = args.indexOf("--sample");
  const CAP = sIdx >= 0 && args[sIdx + 1] ? Math.max(1, parseInt(args[sIdx + 1], 10) || 0) : Infinity;
  const rIdx = args.indexOf("--root");
  const ROOT = rIdx >= 0 && args[rIdx + 1] ? args[rIdx + 1] : DEFAULT_ROOT;
  const oIdx = args.indexOf("--out");
  const STORE = oIdx >= 0 && args[oIdx + 1] ? args[oIdx + 1] : DEFAULT_STORE;

  const { okumaOSPParserEngine } = await import("../src/engines/OkumaOSPParserEngine.js");
  const { provenSpeedFeedAggregatorEngine } = await import("../src/engines/ProvenSpeedFeedAggregatorEngine.js");
  const { atomicWriteJson } = await import("../src/utils/atomicWrite.js");

  fs.mkdirSync(STATE_DIR, { recursive: true });
  const log = (m) => { if (!JSON_OUT) console.log(m); };

  const all = enumerateMinFiles(ROOT, CAP);
  log(`Enumerated ${all.length} .MIN files under ${ROOT}${CAP !== Infinity ? ` (capped ${CAP})` : ""}`);

  // Resume: NEVER wipe accumulated data. Reconcile the samples ledger to the cursor so a
  // mid-write crash (rows appended, cursor not yet marked) cannot double-count on re-run.
  let doneSet = new Set();
  if (RESUME) {
    if (!fs.existsSync(DEFAULT_CURSOR)) {
      // Fail loud (R12): a missing cursor with a surviving samples ledger is an ambiguous
      // committed-set -- resuming would either lose data or double-count. Refuse, never guess.
      if (fs.existsSync(DEFAULT_SAMPLES)) {
        throw new Error(
          `--resume: cursor ${DEFAULT_CURSOR} is missing but a samples ledger exists -- cannot ` +
          `safely resume (ambiguous committed-set). Restore the cursor, or run fresh (no --resume) to re-mine.`,
        );
      }
      // both absent: nothing to resume -- behaves like a clean start (empty doneSet/ledger).
    } else {
      doneSet = parseCursorDoneSet(fs.readFileSync(DEFAULT_CURSOR, "utf8"));
      // Drop orphan rows (source file not committed in the cursor) via atomic temp+rename rewrite.
      if (fs.existsSync(DEFAULT_SAMPLES)) {
        const existing = fs.readFileSync(DEFAULT_SAMPLES, "utf8").split(/\r?\n/).filter(Boolean)
          .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
        const kept = filterCommittedRows(existing, doneSet);
        if (kept.length !== existing.length) {
          const tmp = DEFAULT_SAMPLES + ".tmp";
          fs.writeFileSync(tmp, kept.length ? kept.map((r) => JSON.stringify(r)).join("\n") + "\n" : "");
          fs.renameSync(tmp, DEFAULT_SAMPLES);
          log(`Resume reconcile: dropped ${existing.length - kept.length} orphan row(s) from an interrupted file`);
        }
      }
    }
  } else {
    // fresh run -- truncate ledgers so a re-run from scratch is clean
    try { fs.rmSync(DEFAULT_SAMPLES, { force: true }); } catch { /* ignore */ }
    try { fs.rmSync(DEFAULT_CURSOR, { force: true }); } catch { /* ignore */ }
  }
  const { todo, skipped } = partitionByResumeCursor(all, doneSet);
  log(`Resume: ${skipped.length} already done, ${todo.length} to process`);

  let parsed = 0, parseErr = 0, rows = 0;
  for (const fp of todo) {
    try {
      const src = fs.readFileSync(fp, "utf8");
      const prog = okumaOSPParserEngine.parse(src, path.basename(fp));
      const sf = okumaOSPParserEngine.extractDetailedSpeedFeeds(prog, fp);
      // Durability order: append rows FIRST, then mark the file done (cursor after data).
      if (Array.isArray(sf) && sf.length) {
        fs.appendFileSync(DEFAULT_SAMPLES, sf.map((r) => JSON.stringify(r)).join("\n") + "\n");
        rows += sf.length;
      }
      fs.appendFileSync(DEFAULT_CURSOR, JSON.stringify({ file: fp, rows: sf?.length ?? 0 }) + "\n");
      parsed++;
    } catch (e) {
      parseErr++;
      if (!JSON_OUT) log(`  parseErr ${path.basename(fp)}: ${e.message}`);
    }
  }
  log(`Processed ${parsed} files (parseErr=${parseErr}), +${rows} S/F rows this run`);

  // Aggregate from the FULL samples ledger (accumulates across resumed runs).
  const allRows = fs.existsSync(DEFAULT_SAMPLES)
    ? fs.readFileSync(DEFAULT_SAMPLES, "utf8").split(/\r?\n/).filter(Boolean).map((l) => {
        try { return JSON.parse(l); } catch { return null; }
      }).filter(Boolean)
    : [];
  provenSpeedFeedAggregatorEngine.clear();
  const aggregate = provenSpeedFeedAggregatorEngine.aggregateLatheData(allRows);
  const exported = provenSpeedFeedAggregatorEngine.exportForSpeedFeedOrchestrator();
  const highConfidence = provenSpeedFeedAggregatorEngine.getHighConfidenceParams(0.5);

  const store = buildProvenStore({
    aggregate, exported, highConfidence,
    filesProcessed: skipped.length + parsed,
    generatedAt: new Date().toISOString(),
  });
  await atomicWriteJson(STORE, store);

  const summary = {
    filesEnumerated: all.length, filesProcessedTotal: store.filesProcessed,
    totalSamples: store.totalSamples, provenParamSets: store.provenParams.length,
    highConfidenceCount: store.highConfidenceCount, storePath: STORE,
  };
  if (JSON_OUT) console.log(JSON.stringify(summary, null, 2));
  else {
    log(`\nPersisted proven store -> ${STORE}`);
    log(`  proven param sets: ${summary.provenParamSets} (high-conf>=0.5: ${summary.highConfidenceCount}) from ${summary.totalSamples} samples`);
  }
}

// run-as-main guard (so the test can import pure helpers without executing main)
const isMain = (() => {
  try { return process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]); }
  catch { return false; }
})();
if (isMain) main().catch((e) => { console.error(e); process.exit(1); });
