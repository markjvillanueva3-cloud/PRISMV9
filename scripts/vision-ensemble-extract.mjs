#!/usr/bin/env node
// scripts/vision-ensemble-extract.mjs
//
// U-XRAY-VISION-ENSEMBLE — CLI for multi-VLM ensemble blueprint OCR (the Blackwell unlock).
//
// Runs N diverse vision models over ONE print CONCURRENTLY (the 96GB RTX Blackwell can hold
// qwen3-vl + qwen2.5-vl + llama3.2-vision resident at once) and fuses their extractions into
// a corroborated consensus dimension set: dims ≥2 independent models agree on are high-trust;
// dims only one model reports are flagged hallucination candidates for the operator gate.
//
// Two modes:
//   • --image <png>     OCR a real raster print, emit the fused consensus.
//   • --gen [--seed N]  generate a synthetic dimensioned print WITH ground truth, OCR it, and
//                       SCORE each single model AND the fused consensus against truth — the
//                       evidence that the ensemble lifts accuracy over any single model (R9/R12).
//
// Reuses (does NOT reimplement): vision-ensemble-fuse (the concurrent runner + fusion core),
// vision-ab-compare (synthetic-print generator), dimension-set-score (the truth scorer),
// vision-model-select (pulled-model discovery + thinking-trap guard).
//
// USAGE:
//   node scripts/vision-ensemble-extract.mjs --gen [--seed 7100] [--difficulty easy|hard]
//   node scripts/vision-ensemble-extract.mjs --image <path.png> [--part-class electrode] [--wire-edm]
//   common: [--models a,b,c] [--max-models 3] [--assume-units in] [--quorum N]
//           [--max-time-sec 300] [--report <path>] [--json] [--keep]
//
// EXIT: 0 = ran (≥1 model OCR'd) · 2 = no model produced an extraction · 3 = args/setup error.

import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { argv, exit, env, pid } from "node:process";

import { fetchAvailableVisionModels, isThinkingTrap, VISION_FAMILY_LEADERS } from "./lib/vision-model-select.mjs";
import { generateSyntheticPrint } from "./lib/vision-ab-compare.mjs";
import { scoreDimensionSet } from "./lib/dimension-set-score.mjs";
import { runEnsembleOverImage } from "./lib/vision-ensemble-fuse.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PYTHON = env.PRISM_PYTHON || "H:/Tools/python/python.exe";
const GEN = join(REPO_ROOT, "scripts", "lib", "synthetic-print-gen.py");
const OLLAMA_URL = env.OLLAMA_URL || "http://127.0.0.1:11434";
const DEFAULT_REPORT = join(REPO_ROOT, "state", "shared", "vision-ensemble-report.json");

// Default ensemble roster -- single-sourced from VISION_FAMILY_LEADERS (vision-model-select.mjs)
// so the ensemble CLI + the closed-loop training-loop can never drift apart. Availability-gated
// + thinking-trap-filtered just below (chosen = FAMILY_LEADERS.filter(pulled && !isThinkingTrap)).
const FAMILY_LEADERS = VISION_FAMILY_LEADERS;

function parseArgs(args) {
  const get = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
  const has = (f) => args.includes(f);
  const num = (f, d) => { const v = Number(get(f, d)); return Number.isFinite(v) ? v : d; };
  return {
    image: get("--image", null),
    gen: has("--gen"),
    seed: num("--seed", 7100),
    difficulty: get("--difficulty", "easy"),
    models: get("--models", null),
    maxModels: Math.max(1, num("--max-models", 3)),
    partClass: get("--part-class", "generic"),
    wireEdm: has("--wire-edm"),
    assumeUnits: get("--assume-units", "in"),
    quorum: get("--quorum", null) != null ? num("--quorum", null) : null,
    maxTimeSec: num("--max-time-sec", 300),
    report: get("--report", DEFAULT_REPORT),
    json: has("--json"),
    keep: has("--keep"),
  };
}

/** Pick the ensemble model list: explicit --models, else the diverse family leaders that are pulled. */
async function resolveEnsembleModels(opts) {
  if (opts.models) {
    const list = opts.models.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
    return { models: list, source: "--models", available: null };
  }
  const available = await fetchAvailableVisionModels(OLLAMA_URL);
  const pulled = new Set(available);
  // family leaders that are actually pulled AND JSON-safe (no thinking traps), capped at maxModels.
  const chosen = FAMILY_LEADERS.filter((m) => pulled.has(m) && !isThinkingTrap(m)).slice(0, opts.maxModels);
  return { models: chosen, source: "auto (diverse family leaders, pulled-gated)", available };
}

function fmtMs(ms) { return ms == null ? "—" : `${(ms / 1000).toFixed(1)}s`; }

/** Map fused consensus dims → the {nominal_mm,type} shape scoreDimensionSet reads. */
function consensusToScoreable(fusedDims) {
  return (fusedDims || []).map((d) => ({ nominal_mm: d.value_mm, type: d.type }));
}

async function main() {
  const opts = parseArgs(argv.slice(2));
  if (!opts.gen && !opts.image) {
    console.error("ERROR: pass --image <png> or --gen. See header for usage.");
    return 3;
  }

  // 1. Resolve the image (+ truth, for --gen).
  let png = opts.image;
  let truth = null;
  let workDir = png ? dirname(resolve(png)) : null;
  let genCleanup = null;
  if (opts.gen) {
    workDir = join(tmpdir(), `ens-gen-${pid}-${opts.seed}`);
    try { mkdirSync(workDir, { recursive: true }); } catch { /* exists */ }
    const g = generateSyntheticPrint({ seed: opts.seed, workDir, difficulty: opts.difficulty, python: PYTHON, gen: GEN });
    if (g.error) { console.error(`ERROR: synthetic gen failed: ${g.error}`); return 3; }
    png = g.png; truth = g.truth;
    genCleanup = [png, png + ".truth.json"];
  }
  if (!png || !existsSync(png)) { console.error(`ERROR: image not found: ${png}`); return 3; }

  // 2. Resolve the ensemble model set.
  const { models, source, available } = await resolveEnsembleModels(opts);
  if (!models.length) {
    console.error(`ERROR: no usable vision models. ${available ? "pulled: " + available.join(", ") : ""}`);
    return 3;
  }

  // 3. Run the ensemble (concurrent) + fuse.
  console.log(`\n🔭 Multi-VLM ensemble OCR  ·  image=${opts.gen ? `synthetic(seed=${opts.seed},${opts.difficulty})` : png}`);
  console.log(`   models (${models.length}, ${source}): ${models.join(", ")}`);
  const t0 = Date.now();
  const res = await runEnsembleOverImage({
    png, models,
    partClass: opts.partClass, wireEdm: opts.wireEdm, assumeUnits: opts.assumeUnits,
    ollamaUrl: OLLAMA_URL, maxTimeSec: opts.maxTimeSec, workDir,
    fuseOpts: opts.quorum != null ? { quorum: opts.quorum } : {},
  });
  const wallMs = Date.now() - t0;
  const fused = res.fused;

  // 4. Per-model run report.
  console.log(`\n  per-model (wall ${fmtMs(wallMs)} — concurrent; sum-if-serial would be ~${fmtMs(res.per_model_runs.reduce((s, r) => s + (r.ms || 0), 0))}):`);
  for (const r of res.per_model_runs) {
    console.log(`    ${r.ok ? "✓" : "✗"} ${r.model.padEnd(24)} ${fmtMs(r.ms).padStart(7)}  ${r.ok ? `${r.dim_count} dims` : `FAIL: ${r.error}`}`);
  }

  // 5. Consensus summary.
  const s = fused.summary;
  console.log(`\n  fused consensus: ${s.n_clusters} dims · ${s.n_corroborated} corroborated (≥2 models) · ${s.n_singleton} singleton · ${s.n_hallucination_candidates} hallucination-candidate · ${s.n_ambiguous_pairs} ambiguous-pair`);
  console.log(`    corroboration histogram (k models → #dims): ${JSON.stringify(s.corroboration_histogram)}`);
  if (s.mean_agreement_confidence_corroborated != null)
    console.log(`    mean agreement-confidence of corroborated dims: ${s.mean_agreement_confidence_corroborated}`);
  const top = fused.dimensions.slice(0, 12);
  if (top.length) {
    console.log(`    top dims:`);
    for (const d of top) console.log(`      [${String(d.corroboration)}/${d.n_models}] ${d.type.padEnd(12)} ${String(d.value_mm).padStart(9)}mm  conf=${d.agreement_confidence}${d.hallucination_candidate ? "  ⚠HALLUCINATION-CANDIDATE" : ""}`);
  }
  if (fused.ambiguous_pairs.length) {
    console.log(`    ⚠ ambiguous pairs (operator must disambiguate — never auto-merged):`);
    for (const p of fused.ambiguous_pairs) console.log(`      ${p.type}: ${p.value_a_mm}mm (${p.models_a.join("/")}) vs ${p.value_b_mm}mm (${p.models_b.join("/")})  rel=${p.rel_diff}`);
  }

  // 6. Ground-truth scoring (the ensemble-lift evidence) — only when truth is known.
  let scoring = null;
  if (truth && Array.isArray(truth.dimensions)) {
    const singleScores = res.per_model_runs
      .filter((r) => r.ok && r.extraction)
      .map((r) => ({ model: r.model, score: scoreDimensionSet(r.extraction.dimensions || [], truth.dimensions) }));
    const consensusScore = scoreDimensionSet(consensusToScoreable(fused.dimensions), truth.dimensions);
    // ensemble vs the BEST single model — the honest comparison (R12: not vs the worst).
    const bestSingleF1 = singleScores.reduce((m, x) => Math.max(m, x.score.f1 ?? 0), 0);
    scoring = {
      truth_dims: truth.dimensions.length,
      singles: singleScores.map((x) => ({ model: x.model, f1: x.score.f1, recall: x.score.recall, precision: x.score.precision, mae_mm: x.score.mae_mm })),
      consensus: { f1: consensusScore.f1, recall: consensusScore.recall, precision: consensusScore.precision, mae_mm: consensusScore.mae_mm },
      best_single_f1: bestSingleF1,
      ensemble_lift_f1: consensusScore.f1 != null ? +(consensusScore.f1 - bestSingleF1).toFixed(4) : null,
    };
    console.log(`\n  📊 vs ground truth (${truth.dimensions.length} true dims):`);
    for (const x of scoring.singles) console.log(`      single  ${x.model.padEnd(24)} F1=${x.f1}  R=${x.recall} P=${x.precision} MAE=${x.mae_mm}mm`);
    console.log(`      ENSEMBLE consensus          F1=${scoring.consensus.f1}  R=${scoring.consensus.recall} P=${scoring.consensus.precision} MAE=${scoring.consensus.mae_mm}mm`);
    console.log(`      → ensemble lift over best single: ${scoring.ensemble_lift_f1 >= 0 ? "+" : ""}${scoring.ensemble_lift_f1} F1`);
  }

  // 7. Persist report.
  const report = {
    schemaVersion: "1.0.0",
    generatedAtMs: Date.now(),
    host: env.COMPUTERNAME || env.HOSTNAME || null,
    mode: opts.gen ? "synthetic" : "image",
    image: opts.gen ? `synthetic(seed=${opts.seed},${opts.difficulty})` : png,
    models, model_source: source,
    wall_ms: wallMs,
    models_ok: res.models_ok, models_failed: res.models_failed,
    per_model_runs: res.per_model_runs.map((r) => ({ model: r.model, ok: r.ok, ms: r.ms, dim_count: r.dim_count, error: r.error })),
    fused_summary: s,
    fused_dimensions: fused.dimensions,
    ambiguous_pairs: fused.ambiguous_pairs,
    scoring,
  };
  try {
    mkdirSync(dirname(opts.report), { recursive: true });
    writeFileSync(opts.report, JSON.stringify(report, null, 2));
    console.log(`\n  report → ${opts.report}`);
  } catch (e) { console.error(`  ⚠ report write failed: ${e instanceof Error ? e.message : String(e)}`); }
  if (opts.json) console.log(JSON.stringify(report));

  // 8. Cleanup synthetic artifacts unless --keep.
  if (genCleanup && !opts.keep) for (const f of genCleanup) { try { unlinkSync(f); } catch { /* ignore */ } }

  return res.models_ok > 0 ? 0 : 2;
}

main().then((code) => exit(code)).catch((e) => { console.error("FATAL:", e instanceof Error ? e.stack : String(e)); exit(3); });
