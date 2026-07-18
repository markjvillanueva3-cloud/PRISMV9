#!/usr/bin/env node
// scripts/bench-vision-ocr-ab.mjs
//
// U-XRAY-VISION-AB — paired A/B blueprint-OCR benchmark across vision models.
//
// THE GATE vision-model-select.mjs REFERENCES. It answers, with evidence on real
// prints, the question that file declares EMPIRICAL: does a bigger GPU-resident
// vision model (now affordable on the 96GB RTX 6000 Blackwell) actually beat the
// proven 8b-instruct safe default ON BLUEPRINT OCR — and by enough to justify the
// VRAM/latency cost? Output drops straight into the selection seam's decision.
//
// DESIGN (why this is trustworthy):
//   • PAIRED: every model OCRs the SAME synthetic prints (same seeds → byte-identical
//     images + perfect ground truth). Within-subjects ⇒ a 2-pt F1 delta is the model's
//     contribution, not print-draw luck. Aggregate margin + per-print win-rate +
//     coverage floor are three independent guards against noise→upgrade (R12).
//   • WARM-FIRST: each model gets one throwaway OCR call BEFORE the timed prints, so a
//     freshly-pulled 32B's cold-load (~minutes) is NOT charged as a per-print timeout
//     that would systematically penalise exactly the big model we're evaluating.
//   • AVAILABILITY-GATED: only models actually pulled (ollama /api/tags) are run; the
//     rest are reported as skipped, never silently 404'd into a fake "miss".
//   • SYNTHETIC = CAPABILITY CEILING: clean labels isolate model dimension-reading
//     skill from scan-noise; the caveat is surfaced loudly in the report (R12).
//
// Reuses (does NOT reimplement): vision-ab-compare (verdict core + paired-run shell),
// vision-model-select (selection seam + availability/VRAM probes), synthetic-print-gen.py.
//
// USAGE:
//   node scripts/bench-vision-ocr-ab.mjs [--models a,b,c] [--count 6] [--difficulty easy|hard]
//        [--baseline qwen3-vl:8b-instruct] [--seed-base 7000] [--max-time-sec 300]
//        [--margin 0.02] [--min-win-rate 0.5] [--min-coverage 0.5] [--no-warm]
//        [--report <path>] [--keep] [--json]
//   (no --models → auto-discovers every pulled vision model, baseline always included,
//    thinking-trap tags excluded)
//
// EXIT: 0 = ran (verdict emitted) · 2 = no model OCR'd a single print · 3 = args/setup error.

import { existsSync, mkdirSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { argv, exit, env } from "node:process";

import { DEFAULT_VISION_MODEL } from "./lib/ollama-vision-extract-lib.mjs";
import {
  selectVisionModel,
  fetchAvailableVisionModels,
  probeTotalVramGB,
  isThinkingTrap,
} from "./lib/vision-model-select.mjs";
import {
  generateSyntheticPrint,
  ocrPngWithModel,
  runModelOverPrints,
  summarizeModelRun,
  pairedF1Delta,
  determineWinner,
  buildUpgradeRecommendation,
  DEFAULT_F1_MARGIN,
  DEFAULT_MIN_WIN_RATE,
  DEFAULT_MIN_COVERAGE,
} from "./lib/vision-ab-compare.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PYTHON = env.PRISM_PYTHON || "H:/Tools/python/python.exe";
const GEN = join(REPO_ROOT, "scripts", "lib", "synthetic-print-gen.py");
const OLLAMA_URL = env.OLLAMA_URL || "http://127.0.0.1:11434";
const DEFAULT_REPORT = join(REPO_ROOT, "state", "shared", "vision-ocr-ab-report.json");

// Bigger ceiling than the closed-loop's 200s: a freshly-pulled 32B's FIRST (cold) call
// can exceed 200s; the warm-up uses this too so it doesn't false-timeout the load.
const DEFAULT_MAX_TIME_SEC = 300;

// A pulled model is a vision model if its tag is in a known vision family. Conservative
// — only families we actually run for OCR. Non-vision tags (coder/embed/r1) are skipped.
const VISION_FAMILY_RE = /(^|[:/-])(vl|vision|llava|moondream|minicpm-?v|bakllava)\b|vl:/i;
function isVisionModel(id) {
  return typeof id === "string" && VISION_FAMILY_RE.test(id.toLowerCase());
}

function parseArgs(args) {
  const get = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
  const has = (f) => args.includes(f);
  const num = (f, d) => { const v = Number(get(f, d)); return Number.isFinite(v) ? v : d; };
  return {
    models: get("--models", null),
    count: Math.max(1, num("--count", 6)),
    difficulty: get("--difficulty", "easy"),
    baseline: get("--baseline", DEFAULT_VISION_MODEL),
    seedBase: num("--seed-base", 7000),
    maxTimeSec: num("--max-time-sec", DEFAULT_MAX_TIME_SEC),
    marginF1: num("--margin", DEFAULT_F1_MARGIN),
    minWinRate: num("--min-win-rate", DEFAULT_MIN_WIN_RATE),
    minCoverage: num("--min-coverage", DEFAULT_MIN_COVERAGE),
    warm: !has("--no-warm"),
    report: get("--report", DEFAULT_REPORT),
    keep: has("--keep"),
    json: has("--json"),
  };
}

function atomicWriteJson(path, obj) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = path + ".tmp-" + process.pid + "-" + Date.now();
  writeFileSync(tmp, JSON.stringify(obj, null, 2));
  renameSync(tmp, path);
}

/** Resolve the model set: explicit --models, else auto-discover pulled vision models.
 *  Baseline is ALWAYS included (the verdict needs a floor). Thinking-traps excluded
 *  (they emit <think>, never JSON — would score coverage 0 and pollute the run). */
function resolveModels(opts, available) {
  let requested;
  if (opts.models) {
    requested = opts.models.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
  } else {
    requested = available.filter(isVisionModel);
  }
  // Always include the baseline.
  if (!requested.includes(opts.baseline)) requested.unshift(opts.baseline);
  // Drop thinking-trap tags (with a note); dedup preserving order.
  const dropped = [];
  const seen = new Set();
  const kept = [];
  for (const m of requested) {
    if (isThinkingTrap(m)) { dropped.push(m); continue; }
    if (seen.has(m)) continue;
    seen.add(m);
    kept.push(m);
  }
  return { kept, dropped };
}

async function main() {
  const opts = parseArgs(argv.slice(2));
  const log = (...a) => { if (!opts.json) console.log(...a); };
  if (!["easy", "hard"].includes(opts.difficulty)) {
    console.error(`[ab] FATAL: --difficulty must be "easy" or "hard" (got "${opts.difficulty}").`);
    exit(3);
  }

  // 1. Probe hardware + pulled models (fail-soft → null/[]).
  const vramGB = probeTotalVramGB();
  const available = await fetchAvailableVisionModels(OLLAMA_URL);
  if (!available.length) {
    console.error("[ab] WARN: could not enumerate ollama /api/tags — availability gate disabled; models may 404.");
  }

  // 2. Resolve the A/B set (availability-gated).
  const { kept, dropped } = resolveModels(opts, available);
  const haveTags = available.length > 0;
  const runnable = kept.filter((m) => !haveTags || available.includes(m));
  const missing = kept.filter((m) => haveTags && !available.includes(m));
  if (dropped.length) log(`[ab] excluded thinking-trap tag(s): ${dropped.join(", ")}`);
  if (missing.length) log(`[ab] NOT pulled (skipped — pull to include): ${missing.join(", ")}`);
  if (!runnable.includes(opts.baseline)) {
    console.error(`[ab] FATAL: baseline "${opts.baseline}" is not pulled — no floor to compare against. Pull it first.`);
    exit(3);
  }
  if (runnable.length < 2) {
    log(`[ab] NOTE: only the baseline is runnable — verdict will be "stay" (no candidate). Pull a candidate (e.g. qwen2.5vl:32b) to make this a real A/B.`);
  }
  log(`[ab] vram=${vramGB ?? "?"}GB · baseline=${opts.baseline} · models=[${runnable.join(", ")}] · count=${opts.count} · difficulty=${opts.difficulty} · warm=${opts.warm}`);

  // 3. Generate the paired print set ONCE (same images for every model).
  // PID-scoped workdir so concurrent fleet runs never cross-delete each other's prints
  // (the basenames inside are seed-keyed, not pid-keyed — the dir is the isolation seam).
  const workDir = join(tmpdir(), `vision-ocr-ab-${process.pid}`);
  mkdirSync(workDir, { recursive: true });
  const prints = [];
  const genFails = [];
  for (let i = 0; i < opts.count; i++) {
    const seed = opts.seedBase + i;
    const g = generateSyntheticPrint({ seed, workDir, difficulty: opts.difficulty, python: PYTHON, gen: GEN });
    if (g.error) { genFails.push({ seed, error: g.error }); log(`[ab] GEN-FAIL seed=${seed} ${g.error}`); continue; }
    prints.push({ seed, png: g.png, truth: g.truth, workDir });
  }
  if (!prints.length) {
    console.error(`[ab] FATAL: 0 of ${opts.count} synthetic prints generated (python/PIL? ${PYTHON}) — cannot benchmark.`);
    exit(2);
  }
  log(`[ab] generated ${prints.length}/${opts.count} paired prints`);

  // 4. Run each model over the SAME prints (warm-first to avoid cold-load bias).
  const runs = [];
  const warmFailures = [];
  for (const model of runnable) {
    if (opts.warm) {
      log(`[ab] warming ${model} (cold-load, discarded)…`);
      const w0 = Date.now();
      const warm = ocrPngWithModel({ png: prints[0].png, model, workDir, seed: "warm", ollamaUrl: OLLAMA_URL, maxTimeSec: opts.maxTimeSec });
      if (warm && warm.error) {
        // Warm FAILED → model is NOT resident. Its first timed print will pay the
        // remaining cold-load and may time out → that print scores null, depressing
        // this model's coverage/win-rate. The bias is fail-SAFE (only under-credits a
        // candidate; never produces a false "upgrade"), but we surface it loudly so a
        // "stay" verdict caused by a load-timeout is not mistaken for a quality loss.
        log(`[ab]   ⚠ warm ${model} FAILED (${warm.error}, ${Date.now() - w0}ms) — NOT resident; first timed print may cold-load/timeout and UNDER-credit ${model}`);
        warmFailures.push({ model, error: warm.error, ms: Date.now() - w0 });
      } else {
        log(`[ab]   warm ${model}: ok (${Date.now() - w0}ms)`);
      }
    }
    log(`[ab] benchmarking ${model} over ${prints.length} prints…`);
    const run = runModelOverPrints({
      model, prints, ollamaUrl: OLLAMA_URL, maxTimeSec: opts.maxTimeSec,
      onCase: (c) => log(`[ab]   ${model} seed=${c.seed} ${c.error ? "FAIL " + c.error : `R=${c.recall} P=${c.precision} mae=${c.mae_mm}mm`} (${c.ms}ms)`),
    });
    runs.push(run);
  }

  // 5. Summarise + paired deltas vs baseline.
  const summaries = runs.map(summarizeModelRun);
  const baselineRun = runs.find((r) => r.model === opts.baseline) || null;
  const paired = {};
  if (baselineRun) {
    for (const r of runs) {
      if (r.model === opts.baseline) continue;
      paired[r.model] = pairedF1Delta(baselineRun.perPrintScores, r.perPrintScores);
    }
  }

  // 6. Verdict + 7. recommendation (plugged into the live selection seam).
  const verdict = determineWinner(summaries, {
    baselineModel: opts.baseline, marginF1: opts.marginF1, minWinRate: opts.minWinRate,
    minCoverage: opts.minCoverage, paired,
  });
  // Pass the operator override so the reported "SEAM currently picks X" matches what
  // production will actually resolve to (the verdict itself is unaffected — it keys off
  // opts.baseline, not the seam's pick).
  const selection = selectVisionModel({ vramGB, availableModels: available, envOverride: env.PRISM_VISION_MODEL || null });
  const recommendation = buildUpgradeRecommendation(verdict, selection);

  // 8. Report (atomic) + human summary.
  const report = {
    schemaVersion: 1,
    ts: new Date().toISOString(),
    host: { vramGB, ollamaUrl: OLLAMA_URL },
    config: { baseline: opts.baseline, count: opts.count, difficulty: opts.difficulty, seedBase: opts.seedBase, warm: opts.warm, maxTimeSec: opts.maxTimeSec, marginF1: opts.marginF1, minWinRate: opts.minWinRate, minCoverage: opts.minCoverage },
    models: { runnable, skippedNotPulled: missing, excludedThinkingTrap: dropped },
    promptsGenerated: prints.length,
    genFailures: genFails,
    warmFailures,
    caveat: "CAPABILITY measurement on CLEAN SYNTHETIC prints (perfect labels) — isolates model dimension-reading skill, NOT real-scanned-print accuracy. A win here is necessary but not sufficient; confirm on the real corpus before production. Run --difficulty hard for tolerances/GD&T/noise.",
    perModel: summaries.map((s) => ({
      ...s,
      paired: paired[s.model] || (s.model === opts.baseline ? "(baseline)" : null),
      cases: (runs.find((r) => r.model === s.model) || {}).cases || [],
    })),
    verdict,
    recommendation,
  };
  atomicWriteJson(opts.report, report);

  if (opts.json) {
    console.log(JSON.stringify({ ...report, reportPath: opts.report }, null, 2));
  } else {
    console.log(`\n[ab] ===== A/B RESULT (paired, ${prints.length} synthetic prints) =====`);
    for (const s of [...summaries].sort((a, b) => b.f1 - a.f1)) {
      const pr = paired[s.model];
      const tag = s.model === opts.baseline ? " (baseline)" : "";
      const win = pr && pr.winRate != null ? ` · paired-win ${(pr.winRate * 100).toFixed(0)}%` : "";
      console.log(`  ${s.model}${tag}: F1=${s.f1.toFixed(4)} R=${s.recall.toFixed(3)} P=${s.precision.toFixed(3)} mae=${s.maeMm ?? "—"}mm cov=${s.coverage} p95=${s.p95LatencyMs ?? "—"}ms${win}`);
    }
    console.log(`\n[ab] VERDICT: ${verdict.action.toUpperCase()} → ${verdict.recommendedModel}`);
    console.log(`[ab]   ${verdict.rationale}`);
    if (verdict.latencyWarning) console.log(`[ab]   latency: ${verdict.latencyWarning}`);
    console.log(`[ab] SEAM: vision-model-select currently picks "${selection.model}" (${selection.reason})`);
    if (selection.warning) console.log(`[ab]   seam-warning: ${selection.warning}`);
    if (warmFailures.length) console.log(`[ab]   ⚠ ${warmFailures.length} model(s) failed warm-up (may be under-credited): ${warmFailures.map((w) => w.model).join(", ")}`);
    console.log(`[ab] NEXT: ${recommendation.nextStep}`);
    console.log(`[ab] CAVEAT: ${report.caveat}`);
    console.log(`[ab] report → ${opts.report}`);
  }

  // Clean up generated prints unless --keep.
  if (!opts.keep) {
    for (const p of prints) { try { unlinkSync(p.png); unlinkSync(p.png + ".truth.json"); } catch { /* ignore */ } }
  }

  // Exit non-zero only if NOTHING OCR'd (total failure must not look like a clean run).
  const anyRan = summaries.some((s) => s.ran);
  exit(anyRan ? 0 : 2);
}

const isMain = argv[1] && fileURLToPath(import.meta.url) === resolve(argv[1]);
if (isMain) main().catch((e) => { console.error("[ab] FATAL: " + (e instanceof Error ? e.message : String(e))); exit(3); });
