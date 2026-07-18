#!/usr/bin/env node
// scripts/blueprint-ocr-training-loop.mjs
//
// U-XRAY-OCR-TRAINING-LOOP — the closed-loop OCR training-data engine (runner).
//
// Trains the print-READING stage TODAY, without delta's CAD-gen. Three phases:
//   1. CALIBRATE — generate perfect-GT synthetic prints (mixed difficulty) → multi-VLM ensemble →
//      measure P(consensus dim CORRECT | corroboration k) → isotonic calibration (the validated
//      trust function). This is the answer to "how much do we trust a k-corroborated pseudo-label?"
//   2. WEAK-LABEL — run the ensemble over REAL prints (operator-supplied PNGs / a dir) → tier each
//      pseudo-label by the calibration → gold/silver = trainable supervised labels for india's LoRA;
//      bronze/reject/ambiguous/hallucination → active-learning queue (operator-confirm), NEVER
//      silently trained on (R12 + the garbage-in-garbage-out ML pitfall).
//   3. EMIT — trainset.jsonl (for india), active-learning-queue.jsonl, and a run report.
//
// Reuses (does NOT reimplement): vision-ensemble-fuse (concurrent ensemble + fusion), vision-ab-compare
// (synthetic-print gen), dimension-set-score (the type-aware mm matcher), ocr-training-loop-lib (the
// pure calibration/tiering core). The no-re-OCR soul is honored: WEAK-LABEL runs ONLY on the bounded
// operator-supplied set, never the 257K corpus.
//
// USAGE:
//   node scripts/blueprint-ocr-training-loop.mjs --calibrate-count 8 [--difficulties easy,hard]
//        [--real-png <a.png> --real-png <b.png> | --real-dir <dir>] [--models a,b]
//        [--out-dir state/shared/ocr-training-loop] [--max-time-sec 300] [--json]
//        [--force-units in|mm]  (force the global unit on PHASE-2 per-page OCR -- pages 2+ of a multi-page
//                                print lose the title block; JM is INCH -> --force-units in fixes wrong-scale labels)
// EXIT: 0 = ran · 2 = calibration produced no samples (ensemble never extracted) · 3 = args/setup error.

import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync, appendFileSync, rmSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { argv, exit, env, pid } from "node:process";

import { fetchAvailableVisionModels, isThinkingTrap, VISION_FAMILY_LEADERS } from "./lib/vision-model-select.mjs";
import { generateSyntheticPrint } from "./lib/vision-ab-compare.mjs";
import { dimMatches, typesCompatible, dimType, dimToMm } from "./lib/dimension-set-score.mjs";
import { runEnsembleOverImage } from "./lib/vision-ensemble-fuse.mjs";
import { extractWithRegionRouting } from "./region-classify.mjs";
import { resolvePageTitleBlockUnit, pageForceUnit } from "./lib/ollama-vision-extract-lib.mjs";
import {
  calibrateAgreement,
  buildTrainsetRow,
  classifyActiveLearning,
  MIN_ENSEMBLE_FOR_CORROBORATION,
  printCursorKey,
  parseCursorDoneSet,
  formatCursorLine,
  partitionByResumeCursor,
  isCorpusDrained,
} from "./lib/ocr-training-loop-lib.mjs";
import {
  DEFAULT_SAMPLE_CAP,
  loadCalibrationStore,
  appendCalibrationStore,
  mergeCalibrationSamples,
  resetCalibrationStore,
} from "./lib/calibration-sample-store.mjs";
// Optional pre-VLM page gate: skip confident non-drawing pages (BOM/notes/blank/photo) before the
// expensive ensemble. Opt-in via --page-classify; data-loss-safe (skips ONLY a confident not-a-drawing).
import { classifyImage } from "./page-classify.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PYTHON = env.PRISM_PYTHON || "H:/Tools/python/python.exe";
const GEN = join(REPO_ROOT, "scripts", "lib", "synthetic-print-gen.py");
const OLLAMA_URL = env.OLLAMA_URL || "http://127.0.0.1:11434";
// Diverse family leaders -- single-sourced from VISION_FAMILY_LEADERS (vision-model-select.mjs)
// so this closed-loop + the ensemble CLI never drift. Availability-gated; thinking-traps excluded below.
const FAMILY_LEADERS = VISION_FAMILY_LEADERS;

function parseArgs(args) {
  const get = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
  const getAll = (f) => args.reduce((acc, a, i) => (a === f && args[i + 1] ? acc.concat(args[i + 1]) : acc), []);
  const has = (f) => args.includes(f);
  const num = (f, d) => { const v = Number(get(f, d)); return Number.isFinite(v) ? v : d; };
  return {
    calibrateCount: Math.max(0, num("--calibrate-count", 8)),
    difficulties: get("--difficulties", "easy,hard").split(",").map((s) => s.trim()).filter(Boolean),
    realPngs: getAll("--real-png"),
    realDir: get("--real-dir", null),
    worklist: get("--worklist", null),     // newline file of print PNG paths (corpus-scale lane)
    // --force-units <in|mm>: AUTHORITATIVE unit override for PHASE-2 per-page OCR. Multi-page prints
    // (96% of the JM corpus) OCR each page independently, and pages 2+ LOSE the title block (which carries
    // the drawing's units) -> the VLM guesses the unit and emits wrong-scale training labels. JM is INCH,
    // so `--force-units in` forces every page to the known global unit. Default null = unchanged (fallback
    // behavior). Reuses the forceUnits chain (extractDimension/parseVisionResponse/runEnsembleOverImage).
    forceUnits: get("--force-units", null),
    models: get("--models", null),
    maxModels: Math.max(1, num("--max-models", 3)),
    outDir: get("--out-dir", join(REPO_ROOT, "state", "shared", "ocr-training-loop")),
    maxTimeSec: num("--max-time-sec", 300),
    fresh: has("--fresh"),                  // ignore + truncate the resume cursor (start over)
    // OPT-IN (default OFF): "do it all until complete" mode (operator 2026-06-19). The WEAK-LABEL loop
    // already drains the ENTIRE remaining worklist in one process (no internal time budget) -- this flag
    // governs only the BACKSTOP relaunch: a frequent scheduled-task relaunch on an ALREADY-DRAINED corpus
    // would otherwise burn ~24 synthetic-print calibrations of GPU for nothing. With --until-complete the
    // runner cheaply pre-checks the resume cursor vs the worklist BEFORE calibration and fast-exits 0 when
    // every print is cursored. Meaningful only with --worklist (corpus lane); no behavior change otherwise.
    untilComplete: has("--until-complete"),
    // OPT-IN (default OFF): re-queue prints cursored as a RECOVERABLE failure (ensemble-failed /
    // rasterize-failed) so a stronger model lineup gets another attempt. Default resume keeps them
    // done (the same 2 models would just fail again). Use this AFTER adding a stronger VLM (e.g.
    // qwen3-vl:32b) to recover the ~15% the small ensemble could not read. Does NOT re-queue
    // skipped-missing or skipped-all-paperwork (a model upgrade can't fix an absent file / blank page).
    retryFailed: has("--retry-failed"),
    // OPT-IN (default OFF): classify each rendered page (cheap 1-model VLM call) BEFORE the ensemble
    // and skip a CONFIDENT non-drawing (BOM/notes/blank/photo). Measured 2026-06-16: 40-67% of pages
    // in multi-page scanned bundles are non-drawing -> that much ensemble GPU time saved. COST: a KEPT
    // (drawing) page pays +1 classify call (~2-4s warm) on top of the 2-model ensemble, so the gate is
    // net-POSITIVE only on multi-page bundles with a real paperwork fraction and net-NEGATIVE (pure tax)
    // on single-page-drawing-dominant inputs -- enable per corpus shape. Data-loss-safe (page-classifier-lib
    // only skips a confident not-a-drawing; render/parse/classifier failure falls through to extraction).
    // When OFF, the weak-label path is byte-identical to before.
    pageClassify: has("--page-classify"),
    pageClassifyMinConf: num("--page-classify-min-conf", undefined), // override the lib's 0.70 skip floor
    // OPT-IN (default OFF): P1.5 layout-aware region routing per page. Segments the page, crops dense
    // regions, OCRs each, and UNIONs them with the full-page floor (recall-first; the floor ALWAYS runs).
    // The hybrid `fused` carries the region-recovered dims + the full-page non-dimension labels + a
    // synthesized summary so a dense-page RESCUE (floor fails, regions succeed) stays trainable. When OFF,
    // the per-page weak-label path is byte-identical to before (runEnsembleOverImage only).
    regionRoute: has("--region-route"),
    // OPT-IN (default OFF): pass Ollama format:"json" grammar-constrained decode to every ensemble VLM
    // call. Structurally prevents the qwen2.5vl runaway-JSON dropout (~30-37% of outputs hit num_predict
    // mid-structure -> malformed blob -> whole-print parse-fail -> "1 model survived" calibration
    // exclusions). When OFF, opts.format is undefined -> the request body is byte-identical to before.
    format: has("--format-json") ? "json" : undefined,
    // Cross-run calibration accumulation (U-XRAY-CALIB-ACCUMULATE). A single run's ~24 synthetic-GT
    // samples is below MIN_RELIABLE_SAMPLES (50) -> permanently reliable:false. The durable store lets
    // the calibration corpus grow across nightly runs and cross MIN_RELIABLE with no new GPU/model/data.
    // Default ON at a FIXED repo path (stable across --out-dir changes); --no-calibration-store reverts
    // to fresh-only (byte-identical to pre-accumulation). --reset-calibration-store wipes it (NOT --fresh,
    // which only resets the print-resume cursor -- the two corpora are orthogonal).
    calibrationStore: has("--no-calibration-store")
      ? null
      : get("--calibration-store", join(REPO_ROOT, "state", "shared", "ocr-training-loop", "calibration-samples.jsonl")),
    calibrationStoreCap: Math.max(1, num("--calibration-store-cap", DEFAULT_SAMPLE_CAP)),
    resetCalibStore: has("--reset-calibration-store"),
    json: has("--json"),
  };
}

async function resolveModels(opts) {
  if (opts.models) return opts.models.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
  const pulled = new Set(await fetchAvailableVisionModels(OLLAMA_URL));
  return FAMILY_LEADERS.filter((m) => pulled.has(m) && !isThinkingTrap(m)).slice(0, opts.maxModels);
}

const PDF_TO_PNG = join(REPO_ROOT, "scripts", "lib", "pdf-to-png.py");

/**
 * Rasterize a worklist entry to a PNG path the ensemble can read. A `.png` passes through unchanged;
 * a `.pdf` is rendered (page 0, the worklist builder already filters to single-print drawings — the
 * STEP-2b multi-page contamination concern is handled at manifest-build time, not here) to a temp PNG
 * via pdf-to-png.py (grayscale removes color-channel noise for the VLM encoder). Returns the PNG path
 * + an optional cleanup() for the temp file, or {error} on a render failure (fail-loud, never silent).
 * @param {string} entry  a .pdf or .png path
 * @param {string} workDir  temp dir for rendered PNGs
 * @returns {{png:string, cleanup?:Function}|{error:string}}
 */
const RASTER_DPI = "300";
const RASTER_TIMEOUT_MS = 120000;
// 96% of JM drawing PDFs are multi-page (verified 2026-06-08, STEP 2b) — rendering page 0 ONLY
// silently dropped ~76% of dimension-bearing pages. Each page of an engineering drawing SET carries
// real dims, so we OCR every page. Cap bounds a runaway (a 32-page scan-bundle) — pages beyond the
// cap are logged, never silently dropped (R12). An assembly's cover/BOM page just yields few dims.
const MAX_PAGES_PER_PRINT = 12;

/** Pure: page count of a PDF via pdf-to-png.py --count. Returns a positive int, or null on failure. */
function pdfPageCount(pdf) {
  const r = spawnSync(PYTHON, [PDF_TO_PNG, pdf, "--count"], { encoding: "utf8", timeout: 30000, windowsHide: true });
  if (r.status !== 0) return null;
  const n = parseInt(String(r.stdout || "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Rasterize a worklist entry into the page PNGs the ensemble reads. A `.png` passes through as a
 * single page; a `.pdf` is rendered page-by-page (grayscale removes color-channel noise for the VLM
 * encoder) up to MAX_PAGES_PER_PRINT. Returns {pages:[{page, png}], pageCount, capped} + a cleanup()
 * for all temp PNGs, or {error} if NO page rendered (a per-page render failure is skipped, not fatal).
 * @param {string} entry  a .pdf or .png path
 * @param {string} workDir  temp dir
 * @returns {{pages:Array<{page:number,png:string}>, pageCount:number, capped:boolean, cleanup:Function}|{error:string}}
 */
function rasterizePrintPages(entry, workDir) {
  if (!/\.pdf$/i.test(entry)) return { pages: [{ page: 0, png: entry }], pageCount: 1, capped: false, cleanup: () => {} };
  const total = pdfPageCount(entry);
  if (total === null) return { error: "rasterize: page-count failed (unreadable pdf)" };
  const nPages = Math.min(total, MAX_PAGES_PER_PRINT);
  const stem = printCursorKey(entry) || `p${pid}`;
  const pages = [];
  for (let pg = 0; pg < nPages; pg++) {
    const outPng = join(workDir, `${stem}__p${pg}.png`);
    const r = spawnSync(PYTHON, [PDF_TO_PNG, entry, outPng, "--dpi", RASTER_DPI, "--page", String(pg), "--grayscale"], {
      encoding: "utf8", timeout: RASTER_TIMEOUT_MS, windowsHide: true,
    });
    if (r.status === 0 && existsSync(outPng)) pages.push({ page: pg, png: outPng });
    // a single bad page is skipped (the rest of the print still trains); only ZERO pages → error.
  }
  if (!pages.length) return { error: "rasterize: no page rendered" };
  return {
    pages, pageCount: total, capped: total > MAX_PAGES_PER_PRINT,
    cleanup: () => { for (const p of pages) { try { rmSync(p.png, { force: true }); } catch { /* best-effort */ } } },
  };
}

/** Normalize a fused consensus dim's type string to the lowercased, sentinel-null convention dimType uses. */
function consensusType(t) { return (typeof t === "string" && t && t.toLowerCase() !== "unknown") ? t.toLowerCase() : null; }

/**
 * Per consensus dim: {f: agreement fraction, correct} where f = corroboration / nModels and
 * correct = it matches ANY ground-truth dim (value within tolerance AND type-compatible). f is the
 * ensemble-size-invariant calibration sample; the caller MUST only pass dims from n_models≥2 prints.
 */
function perDimCorrectness(consensusDims, truthDims, nModels) {
  const truth = (Array.isArray(truthDims) ? truthDims : []).map((t) => ({ mm: dimToMm(t), type: dimType(t) })).filter((t) => t.mm !== null);
  return (consensusDims || []).map((d) => {
    const ctype = consensusType(d.type);
    const correct = truth.some((t) => dimMatches(d.value_mm, t.mm) && typesCompatible(ctype, t.type));
    const nm = Number.isFinite(d.n_models) && d.n_models > 0 ? d.n_models : nModels;
    return { f: nm > 0 ? d.corroboration / nm : 0, correct };
  });
}

async function main() {
  const opts = parseArgs(argv.slice(2));

  // --until-complete fast-exit (operator 2026-06-19 "do it all until complete"): a frequent BACKSTOP
  // relaunch on an already-DRAINED corpus must not burn GPU re-running the 24-print calibration. Cheaply
  // read the worklist + resume cursor and exit 0 if every distinct print is cursored. Reuses the pure
  // partition core (isCorpusDrained); fires ONLY with a real --worklist, never for --real-png/--real-dir
  // or calibration-only runs (no behavior change when the flag is absent).
  if (opts.untilComplete && opts.worklist && !opts.realPngs.length && !opts.realDir && existsSync(opts.worklist)) {
    const wlEntries = [];
    try { for (const ln of readFileSync(opts.worklist, "utf8").split(/\r?\n/)) { const t = ln.trim(); if (t && !t.startsWith("#")) wlEntries.push(t); } }
    catch { /* unreadable worklist -> fall through to the normal run (it fails loud there) */ }
    const cursorPath0 = join(opts.outDir, "processed-cursor.jsonl");
    let done0 = new Set();
    if (!opts.fresh && existsSync(cursorPath0)) {
      try { done0 = parseCursorDoneSet(readFileSync(cursorPath0, "utf8"), { retryFailed: opts.retryFailed }); } catch { /* treat as empty */ }
    }
    if (isCorpusDrained(wlEntries, done0)) {
      console.log(`\n[until-complete] corpus DRAINED -- all ${wlEntries.length} worklist print(s) already cursored. Fast-exit (no calibration, no work).`);
      return 0;
    }
  }

  const models = await resolveModels(opts);
  if (!models.length) { console.error("ERROR: no usable vision models pulled."); return 3; }
  mkdirSync(opts.outDir, { recursive: true });
  console.log(`\n🔁 OCR closed-loop training  ·  models (${models.length}): ${models.join(", ")}`);

  // ── PHASE 1: CALIBRATE on perfect-GT synthetic prints ──────────────────────
  const calSamples = [];
  const calCases = [];
  if (opts.calibrateCount > 0) {
    const workDir = join(tmpdir(), `ocr-tl-cal-${pid}`);
    mkdirSync(workDir, { recursive: true });
    console.log(`\n  [1/3] CALIBRATE — ${opts.calibrateCount} synthetic prints (${opts.difficulties.join("/")})`);
    for (let i = 0; i < opts.calibrateCount; i++) {
      const difficulty = opts.difficulties[i % opts.difficulties.length];
      const seed = 9000 + i;
      const g = generateSyntheticPrint({ seed, workDir, difficulty, python: PYTHON, gen: GEN });
      if (g.error) { console.log(`    seed ${seed}: gen FAIL ${g.error}`); continue; }
      const res = await runEnsembleOverImage({ png: g.png, models, assumeUnits: "in", ollamaUrl: OLLAMA_URL, maxTimeSec: opts.maxTimeSec, format: opts.format, workDir });
      const nm = res.fused.summary.n_models;
      if (nm < MIN_ENSEMBLE_FOR_CORROBORATION) { console.log(`    seed ${seed}: ${nm} model(s) survived — EXCLUDED from calibration (no corroboration signal at n_models<${MIN_ENSEMBLE_FOR_CORROBORATION})`); continue; }
      const samples = perDimCorrectness(res.fused.dimensions, g.truth.dimensions, nm);
      calSamples.push(...samples);
      const corr = samples.filter((s) => s.correct).length;
      calCases.push({ seed, difficulty, n_models: nm, dims: samples.length, correct: corr });
      console.log(`    seed ${seed} [${difficulty}]: ${nm} models, ${samples.length} consensus dims, ${corr} correct`);
    }
  }
  // Accumulate calibration samples across runs (U-XRAY-CALIB-ACCUMULATE): one run's ~24 synthetic-GT
  // samples is below MIN_RELIABLE_SAMPLES (50) so a single run is permanently reliable:false. Load the
  // durable store, calibrate on the union, then append this run's fresh samples so the corpus grows for
  // the NEXT run -- crosses MIN_RELIABLE over a few nightly runs with no new GPU/model/data. The store is
  // domain-neutral {f,correct} provenance-tagged rows; --no-calibration-store reverts to fresh-only.
  if (opts.calibrationStore && opts.resetCalibStore) resetCalibrationStore(opts.calibrationStore);
  const persistedSamples = opts.calibrationStore ? loadCalibrationStore(opts.calibrationStore) : [];
  const calMerge = mergeCalibrationSamples(persistedSamples, calSamples, { cap: opts.calibrationStoreCap });
  const calibration = calibrateAgreement(calMerge.merged);
  // append THIS run's fresh samples AFTER calibrating (append-only, provenance-tagged) so the store grows
  // for the next run. Best-effort: an I/O failure returns -1 and never crashes the loop.
  let calStoreWritten = 0;
  if (opts.calibrationStore && calSamples.length) {
    calStoreWritten = appendCalibrationStore(opts.calibrationStore, calSamples, { source: "synthetic-gt" });
  }
  if (opts.calibrationStore) {
    // surface the store PATH (it lives at a fixed repo location, NOT under --out-dir, so it is stable
    // across runs -- an operator inspecting a corpus-train/ run dir would otherwise not find the accumulator).
    console.log(`  calibration corpus: ${calMerge.persistedCount} persisted + ${calMerge.freshCount} fresh = ${calMerge.merged.length} samples${calMerge.capped ? ` (capped at ${calMerge.cap})` : ""} -> ${calibration.reliable ? "RELIABLE" : "under-powered"} [store: ${opts.calibrationStore}]`);
  }
  if (calibration.calibrated) {
    console.log(`\n  calibration P(correct | agreement fraction f)${calibration.reliable ? "" : ` ⚠ UNDER-POWERED (<${calibration.minReliableSamples} samples — operator-verify before trusting tiers)`}:`);
    for (const b of calibration.byF) console.log(`    f=${b.f}: raw ${b.raw} → isotonic ${b.isotonic}  (n=${b.n})`);
  } else {
    console.log(`  ⚠ no calibration samples (ensemble extracted nothing) — weak-label tiers will be 'uncalibrated'.`);
  }

  // ── PHASE 2: WEAK-LABEL real prints (RESUMABLE — stream-append + cursor) ─────
  // Corpus-scale runs MUST survive a fleet-reaper kill (the host reaps long node/python under load).
  // Each completed print appends its trainset/queue rows AND a cursor line IMMEDIATELY, so a kill
  // loses at most the one in-flight print; a restart skips every cursored print (re-OCR count = 0).
  const realPngs = [...opts.realPngs];
  if (opts.realDir && existsSync(opts.realDir)) {
    for (const f of readdirSync(opts.realDir)) if (/\.png$/i.test(f)) realPngs.push(join(opts.realDir, f));
  }
  if (opts.worklist && existsSync(opts.worklist)) {
    try {
      // Skip blank + `#` comment lines (the worklist builders prepend a `# header`); a comment counted
      // as a print pollutes the cursor with a bogus skipped-missing entry.
      for (const ln of readFileSync(opts.worklist, "utf8").split(/\r?\n/)) { const t = ln.trim(); if (t && !t.startsWith("#")) realPngs.push(t); }
    } catch (e) { console.error(`  ⚠ worklist read failed: ${e instanceof Error ? e.message : String(e)}`); }
  }

  const trainsetPath = join(opts.outDir, "trainset.jsonl");
  const queuePath = join(opts.outDir, "active-learning-queue.jsonl");
  const cursorPath = join(opts.outDir, "processed-cursor.jsonl");
  const reportPath = join(opts.outDir, "training-loop-report.json");

  // --fresh truncates the three data files + cursor (start the corpus over). Without it, this is a
  // RESUME: load the done-set from the cursor and skip those prints. A torn final cursor line (kill
  // mid-write) is fail-soft-skipped by parseCursorDoneSet — that one print just re-processes.
  if (opts.fresh) {
    for (const p of [trainsetPath, queuePath, cursorPath]) { try { writeFileSync(p, ""); } catch { /* best-effort */ } }
  }
  let doneSet = new Set();
  if (!opts.fresh && existsSync(cursorPath)) {
    try { doneSet = parseCursorDoneSet(readFileSync(cursorPath, "utf8"), { retryFailed: opts.retryFailed }); }
    catch (e) { console.error(`  ⚠ cursor read failed (treating as empty): ${e instanceof Error ? e.message : String(e)}`); }
  }
  const { todo, skippedDone, skippedNullKey, skippedWorklistDup, skippedCursorDone, distinctTotal } = partitionByResumeCursor(realPngs, doneSet);

  // Running tallies for the report — recomputed from this run + the prior cursor's count, never lost
  // to a kill (the durable data is the appended jsonl, not these in-memory numbers).
  const agg = { gold: 0, silver: 0, bronze: 0, reject: 0, uncalibrated: 0, no_corroboration: 0 };
  // Non-dimension coverage rolled up across every ensembled page (GD&T/notes/profiles/finish the
  // ensemble read, now that fuseEnsemble unions them). Captured for ALL pages, not just those with
  // trainable dims, so the report shows non-dim reach even on dimension-poor prints. (U-XRAY-ENSEMBLE-NONDIM-UNION)
  const nonDimCoverage = { gdt: 0, notes: 0, profiles: 0, surface_finishes: 0 };
  let trainableGdtTotal = 0; // GD&T frames that tiered gold/silver this run (U-XRAY-GDT-LABEL-TIER)
  let scored = 0, totalLabels = 0, trainableLabels = 0, alQueue = 0, ensembleFailed = 0, missing = 0, pagesSkippedPaperwork = 0;

  const rasterDir = join(tmpdir(), `ocr-tl-raster-${pid}`);
  if (todo.length) mkdirSync(rasterDir, { recursive: true });
  if (realPngs.length) {
    console.log(`\n  [2/3] WEAK-LABEL -- ${distinctTotal} distinct prints (${realPngs.length} listed, ${skippedWorklistDup} re-filed dup) | ${todo.length} todo | ${skippedCursorDone} done (resume) = ${distinctTotal ? ((skippedCursorDone / distinctTotal) * 100).toFixed(1) : "0.0"}% corpus${skippedNullKey ? ` | ${skippedNullKey} blank-skipped` : ""}`);
    for (const entry of todo) {
      const key = printCursorKey(entry);
      if (!existsSync(entry)) {
        console.log(`    ${basename(entry)}: MISSING — skip`); missing++;
        try { appendFileSync(cursorPath, formatCursorLine({ key, status: "skipped-missing", ts: new Date().toISOString() })); } catch { /* best-effort */ }
        continue;
      }
      // Rasterize ALL pages of a PDF (96% of JM drawings are multi-page — page-0-only dropped ~76%
      // of dim-bearing pages). A render failure is logged + cursored (don't retry a corrupt PDF
      // forever), never silently dropped.
      const rast = rasterizePrintPages(entry, rasterDir);
      if (rast.error) {
        console.log(`    ${basename(entry)}: ${rast.error} — skip`); ensembleFailed++;
        try { appendFileSync(cursorPath, formatCursorLine({ key, status: "skipped-rasterize-failed", ts: new Date().toISOString() })); } catch { /* best-effort */ }
        continue;
      }

      // Run the ensemble per PAGE; each page is its own (image, dims) training pair (what india's VL
      // trainer consumes). Aggregate page tallies; emit one trainset row PER PAGE that has trainable
      // dims. The cursor stays per-PRINT (resume skips the whole print). try/finally guarantees the
      // temp-PNG cleanup fires even if buildTrainsetRow/classifyActiveLearning throws (the parser has
      // a bug history — leading-dot/truncation; a throw must not leak ≤12 page PNGs). Scrutiny-C P2.
      let printTrainable = 0, anyPageOk = false, pageClassifySkips = 0;
      // Per-print unit anchor (auto mode). Pages 2+ of a multi-page print LOSE the title block, so the
      // VLM guesses units there (a .94in dim mis-read as 0.94mm -> wrong-scale weak label). Detect the
      // print's unit from the FIRST OCR'd page that declares a confident title block (usually page 1)
      // and FORCE it on every later page of the SAME print -- inch AND metric, one OCR pass. An explicit
      // --force-units stays authoritative (operator global override) + short-circuits detection. Revert
      // to pure per-page resolution with PRISM_OCR_PER_PRINT_UNIT_DISABLE=1. printUnit RESETS per print.
      let printUnit = null, unanchoredOcrdPages = 0;
      const autoUnit = !opts.forceUnits && env.PRISM_OCR_PER_PRINT_UNIT_DISABLE !== "1";
      try {
        for (const { page, png } of rast.pages) {
          // OPT-IN pre-VLM gate: a CONFIDENT non-drawing page is skipped before the (expensive) ensemble.
          // page-classifier-lib skips ONLY a confident not-a-drawing; a render/parse/classifier failure
          // returns verdict:"extract", so a real drawing is never lost to a classifier hiccup (data-loss-safe).
          if (opts.pageClassify) {
            const cls = classifyImage(png, { minConfidence: opts.pageClassifyMinConf });
            if (cls && cls.verdict === "skip") {
              pageClassifySkips++; pagesSkippedPaperwork++;
              const kind = cls.classification ? cls.classification.page_kind : "non-drawing";
              const conf = cls.classification ? cls.classification.confidence : "?";
              console.log(`    ${basename(entry)}#p${page}: page-classify SKIP (${kind}, conf ${conf}) -- not a drawing, ensemble skipped`);
              continue;
            }
          }
          // `fused` is resolved from EITHER the full-page ensemble (default) OR the P1.5 region-routing
          // union (opt-in --region-route). Downstream (buildTrainsetRow / classifyActiveLearning / queue
          // summary) consumes `fused` uniformly -- both paths emit the same fused shape.
          let fused;
          if (opts.regionRoute) {
            // Region routing forces units onto each title-block-stripped crop (regions); the full-page
            // floor keeps the title block (unforced unless the operator passed --force-units, which the
            // non-region path also honors via pageForceUnit). No per-page printUnit anchor in region mode
            // -- units are forced globally (mirrors the validate-perfect-parts region wire).
            const rrEnsembleOpts = { ollamaUrl: OLLAMA_URL, maxTimeSec: opts.maxTimeSec, format: opts.format };
            if (opts.forceUnits) rrEnsembleOpts.forceUnits = opts.forceUnits; // operator force -> floor too (parity)
            const rr = await extractWithRegionRouting({ pngPath: png, models, assumeUnits: "in", forceUnits: opts.forceUnits || undefined, ensembleOpts: rrEnsembleOpts });
            // Page "ok" = the floor OCR'd OR a region rescued it. Both-failed -> skip (other pages may train).
            if (!((rr.fullPage && rr.fullPage.ok) || rr.regionsOcrOk > 0)) continue;
            fused = rr.fused;
          } else {
            const res = await runEnsembleOverImage({ png, models, assumeUnits: "in", forceUnits: pageForceUnit(opts.forceUnits, printUnit), ollamaUrl: OLLAMA_URL, maxTimeSec: opts.maxTimeSec, format: opts.format });
            if (res.models_ok === 0) continue; // this page's VLMs all failed; other pages may still train
            // Anchor the print's unit from the FIRST OCR'd page that declares a confident title block, then
            // forward-propagate it to later pages (above, via pageForceUnit). Forward-only: if the anchor
            // lands on a page > the first OCR'd page, earlier pages used per-page units -- logged (R12) so
            // the rare title-block-on-a-later-page case is measurable, not silent.
            if (autoUnit && !printUnit) {
              const detected = resolvePageTitleBlockUnit(res.per_model_runs);
              if (detected) {
                printUnit = detected;
                if (unanchoredOcrdPages > 0) console.log(`    ${basename(entry)}: unit anchor '${detected}' set after ${unanchoredOcrdPages} unanchored page(s) -- those used per-page units (forward-only)`);
              } else { unanchoredOcrdPages++; }
            }
            fused = res.fused;
          }
          anyPageOk = true;
          const pageImage = rast.pageCount > 1 ? `${entry}#page=${page}` : entry;
          const trainsetRow = buildTrainsetRow({ part: `${basename(entry)}#p${page}`, image: pageImage }, fused, calibration);
          const activeLearning = classifyActiveLearning({ fused, trainsetRow });

          // APPEND durable rows BEFORE the cursor (a kill re-processes the whole print idempotently —
          // never loses a label). A kill after page k leaves up to k duplicate rows on resume; each row
          // carries distinct `key`+`page`+`image` so xray-trainset-to-lora.mjs dedups them last-wins.
          const trainable = trainsetRow.labels.filter((l) => l.trainable);
          // GD&T frames tiered gold/silver are ALSO trainable labels (U-XRAY-GDT-LABEL-TIER) -- the
          // LoRA pair builder emits a GD&T training pair per trainable gdt_label (image -> FCF text).
          const trainableGdt = (trainsetRow.gdt_labels || []).filter((l) => l.trainable);
          if (trainable.length > 0 || trainableGdt.length > 0) {
            try { appendFileSync(trainsetPath, JSON.stringify({ key, page, part: trainsetRow.part, image: pageImage, n_models: trainsetRow.n_models, labels: trainable, gdt_labels: trainableGdt, gdt_count: trainsetRow.gdt_count, note_count: trainsetRow.note_count, profile_count: trainsetRow.profile_count, surface_finish_count: trainsetRow.surface_finish_count, source: "ensemble-distillation" }) + "\n"); }
            catch (e) { console.error(`    ⚠ trainset append failed: ${e instanceof Error ? e.message : String(e)}`); }
          }
          trainableGdtTotal += trainableGdt.length;
          // Accumulate non-dim coverage for EVERY ensembled page (independent of trainable dims).
          nonDimCoverage.gdt += trainsetRow.gdt_count || 0;
          nonDimCoverage.notes += trainsetRow.note_count || 0;
          nonDimCoverage.profiles += trainsetRow.profile_count || 0;
          nonDimCoverage.surface_finishes += trainsetRow.surface_finish_count || 0;
          if (activeLearning.needsReview) {
            try { appendFileSync(queuePath, JSON.stringify({ key, page, part: trainsetRow.part, image: pageImage, reasons: activeLearning.reasons, summary: fused.summary }) + "\n"); alQueue++; }
            catch (e) { console.error(`    ⚠ queue append failed: ${e instanceof Error ? e.message : String(e)}`); }
          }
          printTrainable += trainable.length;
          for (const l of trainsetRow.labels) { agg[l.tier] = (agg[l.tier] || 0) + 1; totalLabels++; if (l.trainable) trainableLabels++; }
        }
      } finally {
        if (rast.cleanup) rast.cleanup();
      }

      if (!anyPageOk) {
        // Every page was skipped as confident paperwork = a LEGITIMATE done state (not an ensemble
        // failure). Only when at least one page reached the ensemble AND none survived is it a real
        // failure. Distinguishing them keeps the cursor honest (R12) + the failure tally accurate.
        const allPaperwork = opts.pageClassify && pageClassifySkips > 0 && pageClassifySkips === rast.pages.length;
        if (allPaperwork) {
          console.log(`    ${basename(entry)}: all ${rast.pages.length} page(s) classified non-drawing -- skip (paperwork, no ensemble)`);
          try { appendFileSync(cursorPath, formatCursorLine({ key, status: "skipped-all-paperwork", ts: new Date().toISOString() })); } catch { /* best-effort */ }
        } else {
          console.log(`    ${basename(entry)}: ensemble all-failed (all ${rast.pages.length} page(s)) -- skip`); ensembleFailed++;
          try { appendFileSync(cursorPath, formatCursorLine({ key, status: "skipped-ensemble-failed", ts: new Date().toISOString() })); } catch { /* best-effort */ }
        }
        continue;
      }
      try { appendFileSync(cursorPath, formatCursorLine({ key, status: "labeled", trainable: printTrainable, n_models: models.length, ts: new Date().toISOString() })); }
      catch (e) { console.error(`    ⚠ cursor append failed: ${e instanceof Error ? e.message : String(e)}`); }

      scored++;
      const capNote = rast.capped ? ` (capped ${MAX_PAGES_PER_PRINT}/${rast.pageCount}pp)` : (rast.pageCount > 1 ? ` (${rast.pages.length}pp)` : "");
      console.log(`    ${basename(entry)}${capNote}: ${printTrainable} trainable dim(s) across pages`);
    }
    try { rmSync(rasterDir, { recursive: true, force: true }); } catch { /* best-effort temp cleanup */ }
  } else {
    console.log(`\n  [2/3] WEAK-LABEL — no --real-png/--real-dir/--worklist supplied (calibration-only run).`);
  }

  // ── PHASE 3: EMIT report (summary snapshot — the durable trainset is the appended jsonl) ─────
  const cursorTotal = (() => {
    try { return parseCursorDoneSet(readFileSync(cursorPath, "utf8")).size; } catch { return scored; }
  })();
  const trainable_yield = totalLabels ? +(trainableLabels / totalLabels).toFixed(4) : 0;
  try {
    writeFileSync(reportPath, JSON.stringify({
      schemaVersion: "1.1.0", models, n_models: models.length,
      calibrate: { count_attempted: opts.calibrateCount, cases: calCases, samples: calSamples.length,
        calibration_samples_used: calMerge.merged.length, fresh_samples_appended: calStoreWritten,
        store_path: opts.calibrationStore, store_capped: calMerge.capped, calibration },
      weak_label: {
        // corpus-wide (survives resumes, re-read from the cursor):
        listed: realPngs.length,
        corpus_distinct_prints: distinctTotal,          // TRUE denominator (distinct basenames) -- 100% == corpus_processed_total === this
        worklist_duplicate_lines: skippedWorklistDup,   // re-filed scans deduped by basename (correct dedup, NOT lost coverage)
        // percent uses the END-of-run cursor count (cursorTotal), matching corpus_processed_total --
        // NOT the start-of-run skippedCursorDone, which would lag this run's just-scored prints by one run.
        corpus_percent_complete: distinctTotal ? +((Math.min(cursorTotal, distinctTotal) / distinctTotal) * 100).toFixed(2) : 0,
        corpus_processed_total: cursorTotal, resumed_skipped: skippedDone, resumed_cursor_done: skippedCursorDone,
        // THIS-RUN-ONLY (in-memory counters, reset each process — never read as corpus-wide):
        this_run_scored: scored, this_run_missing: missing, this_run_rasterize_or_ensemble_failed: ensembleFailed,
        this_run_total_labels: totalLabels, this_run_trainable_labels: trainableLabels, this_run_trainable_yield: trainable_yield,
        this_run_tier_totals: agg, this_run_active_learning_queued: alQueue,
        this_run_pages_skipped_paperwork: pagesSkippedPaperwork, // pre-VLM page-classify skips (0 when --page-classify off)
        // Non-dim reach this run (gdt/notes/profiles/finish the ensemble captured). Counts only --
        // these are NOT trainable labels yet (a future unit tiers GD&T); surfaced so the corpus is
        // observably no longer dimension-only. (U-XRAY-ENSEMBLE-NONDIM-UNION)
        this_run_non_dim_coverage: nonDimCoverage,
        this_run_trainable_gdt_labels: trainableGdtTotal, // GD&T frames tiered gold/silver -> LoRA pairs
      },
      outputs: { trainset: trainsetPath, active_learning_queue: queuePath, cursor: cursorPath },
      mustHumanVerify: true, note: "Pseudo-labels are ensemble-distilled. Gold/silver are calibration-tiered (validated on synthetic perfect-GT); operator must confirm the active-learning queue before LoRA fine-tune (india). Resumable: trainset/queue/cursor are append-only; re-run resumes from processed-cursor.jsonl. Multi-page PDFs emit one row PER PAGE (key+page+image). A reaper kill mid-print leaves up to k duplicate rows; xray-trainset-to-lora.mjs dedups them last-wins by key+page.",
    }, null, 2));
  } catch (e) { console.error(`  ⚠ report emit failed: ${e instanceof Error ? e.message : String(e)}`); }

  console.log(`\n  [3/3] EMIT — this run scored ${scored} · corpus total ${cursorTotal} · trainable labels ${trainableLabels}/${totalLabels} (yield ${trainable_yield}) · AL queue +${alQueue}`);
  console.log(`    tier totals (this run): ${JSON.stringify(agg)}`);
  console.log(`    → ${reportPath}`);
  if (opts.json) console.log(JSON.stringify({ scored, cursorTotal, trainableLabels, totalLabels, trainable_yield, tier_totals: agg }));

  // exit 2 only if we attempted calibration but got nothing AND no real labels (ensemble dead)
  if (opts.calibrateCount > 0 && !calibration.calibrated && scored === 0) return 2;
  return 0;
}

// Run-as-main guard (convention parity with the manifest builder + lora-stager) — a future importer
// of a runner helper must not trigger the corpus run / process.exit.
if (argv[1] && resolve(argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => exit(code)).catch((e) => { console.error("FATAL:", e instanceof Error ? e.stack : String(e)); exit(3); });
}
