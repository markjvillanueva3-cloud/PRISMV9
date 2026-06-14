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
import {
  calibrateAgreement,
  buildTrainsetRow,
  classifyActiveLearning,
  MIN_ENSEMBLE_FOR_CORROBORATION,
  printCursorKey,
  parseCursorDoneSet,
  formatCursorLine,
  partitionByResumeCursor,
} from "./lib/ocr-training-loop-lib.mjs";

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
    models: get("--models", null),
    maxModels: Math.max(1, num("--max-models", 3)),
    outDir: get("--out-dir", join(REPO_ROOT, "state", "shared", "ocr-training-loop")),
    maxTimeSec: num("--max-time-sec", 300),
    fresh: has("--fresh"),                  // ignore + truncate the resume cursor (start over)
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
      const res = await runEnsembleOverImage({ png: g.png, models, assumeUnits: "in", ollamaUrl: OLLAMA_URL, maxTimeSec: opts.maxTimeSec, workDir });
      const nm = res.fused.summary.n_models;
      if (nm < MIN_ENSEMBLE_FOR_CORROBORATION) { console.log(`    seed ${seed}: ${nm} model(s) survived — EXCLUDED from calibration (no corroboration signal at n_models<${MIN_ENSEMBLE_FOR_CORROBORATION})`); continue; }
      const samples = perDimCorrectness(res.fused.dimensions, g.truth.dimensions, nm);
      calSamples.push(...samples);
      const corr = samples.filter((s) => s.correct).length;
      calCases.push({ seed, difficulty, n_models: nm, dims: samples.length, correct: corr });
      console.log(`    seed ${seed} [${difficulty}]: ${nm} models, ${samples.length} consensus dims, ${corr} correct`);
    }
  }
  const calibration = calibrateAgreement(calSamples);
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
    try { doneSet = parseCursorDoneSet(readFileSync(cursorPath, "utf8")); }
    catch (e) { console.error(`  ⚠ cursor read failed (treating as empty): ${e instanceof Error ? e.message : String(e)}`); }
  }
  const { todo, skippedDone, skippedNullKey } = partitionByResumeCursor(realPngs, doneSet);

  // Running tallies for the report — recomputed from this run + the prior cursor's count, never lost
  // to a kill (the durable data is the appended jsonl, not these in-memory numbers).
  const agg = { gold: 0, silver: 0, bronze: 0, reject: 0, uncalibrated: 0, no_corroboration: 0 };
  let scored = 0, totalLabels = 0, trainableLabels = 0, alQueue = 0, ensembleFailed = 0, missing = 0;

  const rasterDir = join(tmpdir(), `ocr-tl-raster-${pid}`);
  if (todo.length) mkdirSync(rasterDir, { recursive: true });
  if (realPngs.length) {
    console.log(`\n  [2/3] WEAK-LABEL — ${realPngs.length} listed · ${todo.length} todo · ${skippedDone} already-done (resume)${skippedNullKey ? ` · ${skippedNullKey} blank-skipped` : ""}`);
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
      let printTrainable = 0, anyPageOk = false;
      try {
        for (const { page, png } of rast.pages) {
          const res = await runEnsembleOverImage({ png, models, assumeUnits: "in", ollamaUrl: OLLAMA_URL, maxTimeSec: opts.maxTimeSec });
          if (res.models_ok === 0) continue; // this page's VLMs all failed; other pages may still train
          anyPageOk = true;
          const pageImage = rast.pageCount > 1 ? `${entry}#page=${page}` : entry;
          const trainsetRow = buildTrainsetRow({ part: `${basename(entry)}#p${page}`, image: pageImage }, res.fused, calibration);
          const activeLearning = classifyActiveLearning({ fused: res.fused, trainsetRow });

          // APPEND durable rows BEFORE the cursor (a kill re-processes the whole print idempotently —
          // never loses a label). A kill after page k leaves up to k duplicate rows on resume; each row
          // carries distinct `key`+`page`+`image` so xray-trainset-to-lora.mjs dedups them last-wins.
          const trainable = trainsetRow.labels.filter((l) => l.trainable);
          if (trainable.length > 0) {
            try { appendFileSync(trainsetPath, JSON.stringify({ key, page, part: trainsetRow.part, image: pageImage, n_models: trainsetRow.n_models, labels: trainable, source: "ensemble-distillation" }) + "\n"); }
            catch (e) { console.error(`    ⚠ trainset append failed: ${e instanceof Error ? e.message : String(e)}`); }
          }
          if (activeLearning.needsReview) {
            try { appendFileSync(queuePath, JSON.stringify({ key, page, part: trainsetRow.part, image: pageImage, reasons: activeLearning.reasons, summary: res.fused.summary }) + "\n"); alQueue++; }
            catch (e) { console.error(`    ⚠ queue append failed: ${e instanceof Error ? e.message : String(e)}`); }
          }
          printTrainable += trainable.length;
          for (const l of trainsetRow.labels) { agg[l.tier] = (agg[l.tier] || 0) + 1; totalLabels++; if (l.trainable) trainableLabels++; }
        }
      } finally {
        if (rast.cleanup) rast.cleanup();
      }

      if (!anyPageOk) {
        console.log(`    ${basename(entry)}: ensemble all-failed (all ${rast.pages.length} page(s)) — skip`); ensembleFailed++;
        try { appendFileSync(cursorPath, formatCursorLine({ key, status: "skipped-ensemble-failed", ts: new Date().toISOString() })); } catch { /* best-effort */ }
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
      calibrate: { count_attempted: opts.calibrateCount, cases: calCases, samples: calSamples.length, calibration },
      weak_label: {
        // corpus-wide (survives resumes, re-read from the cursor):
        listed: realPngs.length, corpus_processed_total: cursorTotal, resumed_skipped: skippedDone,
        // THIS-RUN-ONLY (in-memory counters, reset each process — never read as corpus-wide):
        this_run_scored: scored, this_run_missing: missing, this_run_rasterize_or_ensemble_failed: ensembleFailed,
        this_run_total_labels: totalLabels, this_run_trainable_labels: trainableLabels, this_run_trainable_yield: trainable_yield,
        this_run_tier_totals: agg, this_run_active_learning_queued: alQueue,
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
