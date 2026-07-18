#!/usr/bin/env node
/**
 * cam-build-corpus-and-train.mjs — U-CAM-CORPUS-AND-FIRST-TRAIN (slot kilo, 2026-05-31)
 * =====================================================================================
 *
 * The missing orchestration seam for the CAM regression-training corpus. The pieces
 * existed and were designed to chain, but nobody ever ran the batch extractor to WRITE
 * the corpus file (it was a manual 8-sample proof on 2026-04-21, since deleted). This
 * runner connects them end-to-end on a REAL JM Die G-code sample:
 *
 *   JM Die .MIN/.NC programs
 *     → CAMFeatureExtractorEngine.extractOne()  (parse → FeatureVector, real speed/feed)
 *     → {vectors:[]} JSON  (FEATURE_VECTORS_SAMPLE.json)
 *     → CAMMLSplitEngine.splitFromFiles()  (customer-disjoint, leakage-audited)
 *     → JM_DIE_ML_SPLITS.json
 *     → CAMBaselineRegressorEngine.trainFromFiles()  (Bayesian-ridge + gradient-boost)
 *     → models/cam-baseline/{bayesian,gradient_boost,metrics}.json
 *
 * SAFETY / ML DISCIPLINE: this trains the model that recommends real spindle RPM + feed.
 * Garbage-in poisons it. So: (1) only parsed_ok vectors enter the corpus (no fabrication);
 * (2) the sample is spread across the archive for customer/material diversity; (3) the
 * resulting metrics are reported HONESTLY and the corpus is labeled proof-of-pipeline,
 * not production-grade (the full ~25K-program train is U-CAM-ML-02 / #10).
 *
 * Usage:
 *   node scripts/cam-build-corpus-and-train.mjs [--sample N] [--root <JM DIE path>] [--out <dir>] [--dry-run]
 *
 * Imports the BUILT engines from mcp-server/dist (no rebuild needed unless those engines changed).
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const DIST = path.join(REPO, "mcp-server", "dist", "engines");

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}
const SAMPLE = Math.max(1, parseInt(arg("--sample", "300"), 10) || 300);
const ROOT = arg("--root", "H:/PRISM/JM DIE");
const OUT_DIR = arg("--out", path.join(REPO, "mcp-server", "data", "state"));
const DRY_RUN = process.argv.includes("--dry-run");

const SAMPLE_PATH = path.join(OUT_DIR, "JM_DIE_FEATURE_VECTORS_SAMPLE.json");
const SPLITS_PATH = path.join(OUT_DIR, "JM_DIE_ML_SPLITS.json");
const MODELS_DIR = path.join(OUT_DIR, "models", "cam-baseline");

function log(...a) { console.log("[cam-corpus]", ...a); }
function fail(msg) { console.error("[cam-corpus] FATAL:", msg); process.exit(1); }

// ── 1. Discover a diverse .MIN/.NC sample (spread across the archive, not the first N) ──
function discover(root, exts, cap) {
  const out = [];
  const stack = [root];
  while (stack.length && out.length < cap) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        const up = e.name.toUpperCase();
        if (up === "BACKUP" || up === "OLD" || up === "ARCHIVE" || up === "TEMP") continue;
        stack.push(full);
      } else if (exts.some((x) => e.name.toLowerCase().endsWith(x))) {
        out.push(full);
        if (out.length >= cap) break;
      }
    }
  }
  return out;
}

async function main() {
  if (!fs.existsSync(ROOT)) fail(`JM Die archive not found at ${ROOT}`);
  for (const f of ["CAMFeatureExtractorEngine.js", "CAMMLSplitEngine.js", "CAMBaselineRegressorEngine.js"]) {
    if (!fs.existsSync(path.join(DIST, f))) fail(`built engine missing: ${path.join(DIST, f)} — run 'npm run build' in mcp-server first`);
  }

  // Collect a bounded candidate pool, then take an evenly-spread subsample for customer/
  // material diversity (the archive is dir-ordered, so striding spreads across folders).
  log(`discovering programs under ${ROOT} ...`);
  const pool = discover(ROOT, [".min", ".nc"], 8000);
  if (pool.length === 0) fail("no .MIN/.NC programs found");
  const stride = Math.max(1, Math.floor(pool.length / SAMPLE));
  const picked = [];
  for (let i = 0; i < pool.length && picked.length < SAMPLE; i += stride) picked.push(pool[i]);
  log(`pool=${pool.length} program files; sampling ${picked.length} (stride ${stride})`);

  // ── 2. Extract REAL feature vectors (parsed_ok only — no fabrication) ──
  const { CAMFeatureExtractorEngine } = await import(pathToFileURL(path.join(DIST, "CAMFeatureExtractorEngine.js")).href);
  const extractor = new CAMFeatureExtractorEngine(ROOT);
  const vectors = [];
  let parseFail = 0;
  for (const f of picked) {
    try {
      const v = extractor.extractOne(f);
      if (v && v.parsed_ok) vectors.push(v);
      else parseFail++;
    } catch { parseFail++; }
  }
  const byCust = new Set(vectors.map((v) => v.customer));
  log(`extracted ${vectors.length} parsed_ok vectors (${parseFail} parse-skipped); distinct customers=${byCust.size}`);
  if (vectors.length < 10) fail(`only ${vectors.length} parsed_ok vectors — too few to train a meaningful split (need >=10)`);

  if (DRY_RUN) { log("--dry-run: stopping before write/split/train"); return; }

  // ── 3. Write the corpus in the {vectors:[]} shape splitFromFiles reads ──
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const sample = {
    schemaVersion: 1,
    extracted_at: new Date().toISOString(),
    sample_size: vectors.length,
    proof_of_pipeline: true,            // NOT production-grade; full corpus = U-CAM-ML-02
    source_root: ROOT,
    vectors,
    statistics: {
      total_programs: picked.length,
      parsed_ok_count: vectors.length,
      parsed_ok_rate: vectors.length / picked.length,
      distinct_customers: byCust.size,
    },
  };
  fs.writeFileSync(SAMPLE_PATH, JSON.stringify(sample, null, 2));
  log(`wrote corpus → ${SAMPLE_PATH}`);

  // ── 4. Customer-disjoint, leakage-audited split ──
  const { CAMMLSplitEngine } = await import(pathToFileURL(path.join(DIST, "CAMMLSplitEngine.js")).href);
  const splitEng = new CAMMLSplitEngine();
  const splitRes = splitEng.splitFromFiles(SAMPLE_PATH, SPLITS_PATH);
  log(`split → ${SPLITS_PATH} | train=${splitRes.summary?.train?.program_count} val=${splitRes.summary?.val?.program_count} test=${splitRes.summary?.test?.program_count} | no_leakage=${splitRes.leakage_audit?.no_leakage}`);
  if (splitRes.warnings?.length) for (const w of splitRes.warnings.slice(0, 5)) log("  split-warn:", w);

  // ── 5. Train the baseline regressor (Bayesian-ridge + gradient-boost) ──
  const { CAMBaselineRegressorEngine } = await import(pathToFileURL(path.join(DIST, "CAMBaselineRegressorEngine.js")).href);
  const trainFn = typeof CAMBaselineRegressorEngine.trainFromFiles === "function"
    ? CAMBaselineRegressorEngine.trainFromFiles.bind(CAMBaselineRegressorEngine)
    : new CAMBaselineRegressorEngine().trainFromFiles.bind(new CAMBaselineRegressorEngine());
  const trainRes = trainFn(SPLITS_PATH, MODELS_DIR);
  log(`trained → ${MODELS_DIR} | n_train=${trainRes.n_train} n_val=${trainRes.n_val}`);

  // ── 6. Honest metrics report ──
  log("─── PROOF-OF-PIPELINE RESULT (NOT production-grade) ───");
  log(`  corpus: ${vectors.length} real vectors / ${byCust.size} customers from ${ROOT}`);
  const m = trainRes.val_metrics || trainRes.train_metrics || {};
  log(`  val metrics: ${JSON.stringify(m)}`);
  log(`  models written: ${fs.readdirSync(MODELS_DIR).join(", ")}`);
  log("  NEXT: scale to full ~25K corpus (U-CAM-ML-02 / #10); arm the live feed (#4).");
}

main().catch((e) => fail(e?.stack || String(e)));
