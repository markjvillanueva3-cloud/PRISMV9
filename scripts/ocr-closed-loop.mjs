#!/usr/bin/env node
// scripts/ocr-closed-loop.mjs
//
// U-PSGB-XRAY-CLOSED-LOOP — the OCR print-reading closed loop, end to end:
//   GENERATE a clean synthetic dimensioned print with KNOWN ground-truth dims
//   → OCR it with qwen3-vl:8b-instruct (the concurrent GPU-resident model)
//   → SCORE the extracted dims vs ground truth (value-recovery precision/recall/F1/MAE)
//   → AGGREGATE + report, surfacing the worst cases for FEEDBACK (prompt/param tuning).
//
// Synthetic ground truth (vs the real corpus) gives PERFECT labels + clean images, so
// the accuracy number measures the model's dimension-reading capability directly,
// without scan-noise / sparse-CAD confounds. Reuses the production OCR lib (prompt +
// request body + response parse) + the dimension-set scorer — only the HTTP transport
// is local (curl, because node fetch fails against localhost Ollama under contention).
//
// USAGE: node scripts/ocr-closed-loop.mjs [--count 5] [--model qwen3-vl:8b-instruct]
//        [--seed-base 1000] [--report <path>] [--keep] [--dpi-note]

import { spawnSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { argv, exit, env } from "node:process";
import { buildVisionPrompt, buildOllamaRequestBody, parseVisionResponse, DEFAULT_VISION_MODEL } from "./lib/ollama-vision-extract-lib.mjs";
import { scoreDimensionSet, aggregateScores } from "./lib/dimension-set-score.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PYTHON = env.PRISM_PYTHON || "H:/Tools/python/python.exe";
const GEN = join(REPO_ROOT, "scripts", "lib", "synthetic-print-gen.py");
const OLLAMA = (env.OLLAMA_URL || "http://127.0.0.1:11434") + "/api/generate";

/** Generate one synthetic print → {png, truth}. Returns null on failure (fail-loud). */
function generatePrint(seed, workDir, difficulty) {
  const png = join(workDir, `syn-${seed}.png`);
  const r = spawnSync(PYTHON, [GEN, "--out", png, "--seed", String(seed), "--units", "in", "--difficulty", difficulty || "easy"], { encoding: "utf8", timeout: 60000 });
  if (r.status !== 0 || !existsSync(png) || !existsSync(png + ".truth.json")) {
    return { error: `gen seed=${seed} exit=${r.status} ${(r.stderr || "").slice(0, 120)}` };
  }
  return { png, truth: JSON.parse(readFileSync(png + ".truth.json", "utf8")) };
}

/** OCR a PNG via Ollama (curl transport). Returns parsed extraction or {error}. */
function ocrPng(png, model, workDir, seed) {
  const b64 = readFileSync(png).toString("base64");
  const body = buildOllamaRequestBody(buildVisionPrompt("generic"), b64, { model });
  const reqFile = join(workDir, `req-${seed}.json`);
  writeFileSync(reqFile, JSON.stringify(body));
  const r = spawnSync("curl", ["-s", "--max-time", "200", OLLAMA, "-d", "@" + reqFile], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  try { unlinkSync(reqFile); } catch { /* ignore */ }
  if (r.status !== 0) return { error: `curl exit=${r.status}` };
  let raw;
  try { raw = JSON.parse(r.stdout).response || ""; } catch { return { error: "ollama response not JSON" }; }
  if (!raw) return { error: "empty response" };
  // JM corpus + synthetic prints are inch; code-side inch→mm so truth(mm) lines up.
  // parseVisionResponse returns a WRAPPER {success, error, extraction} — unwrap to the
  // inner extraction (title_block + dimensions[].nominal_mm) the scorer consumes.
  const parsed = parseVisionResponse(raw, { assumeUnits: "in" });
  if (!parsed || !parsed.success || !parsed.extraction) return { error: "parse: " + ((parsed && parsed.error) || "no extraction") };
  return parsed.extraction;
}

async function main() {
  const args = argv.slice(2);
  const get = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
  const count = parseInt(get("--count", "5"), 10) || 5;
  const model = get("--model", DEFAULT_VISION_MODEL);
  const seedBase = parseInt(get("--seed-base", "1000"), 10) || 1000;
  const reportPath = get("--report", join(REPO_ROOT, "state", "shared", "ocr-closed-loop-report.json"));
  const keep = args.includes("--keep");
  const difficulty = get("--difficulty", "easy");
  const workDir = join(tmpdir(), "ocr-closed-loop");
  mkdirSync(workDir, { recursive: true });

  console.log(`[closed-loop] model=${model} count=${count} seed-base=${seedBase} difficulty=${difficulty}`);
  const cases = [];
  const scores = [];
  for (let i = 0; i < count; i++) {
    const seed = seedBase + i;
    const g = generatePrint(seed, workDir, difficulty);
    if (g.error) { console.log(`[closed-loop] seed=${seed} GEN-FAIL ${g.error}`); cases.push({ seed, error: g.error }); continue; }
    const t0 = Date.now();
    const ex = ocrPng(g.png, model, workDir, seed);
    const ms = Date.now() - t0;
    if (ex.error) { console.log(`[closed-loop] seed=${seed} OCR-FAIL ${ex.error} (${ms}ms)`); cases.push({ seed, error: ex.error, ms }); }
    else {
      const sc = scoreDimensionSet(ex.dimensions || [], g.truth.dimensions || []);
      scores.push(sc);
      const pnHit = ((ex.title_block || {}).part_number || "") === g.truth.title_block.part_number;
      cases.push({ seed, ms, n_truth: sc.n_truth, n_extracted: sc.n_extracted, matched: sc.matched, recall: sc.recall, precision: sc.precision, mae_mm: sc.mae_mm, pn_hit: pnHit, missed_mm: sc.missed_mm, extra_mm: sc.extra_mm });
      console.log(`[closed-loop] seed=${seed} R=${sc.recall} P=${sc.precision} mae=${sc.mae_mm}mm matched=${sc.matched}/${sc.n_truth} pn=${pnHit ? "✓" : "✗"} (${ms}ms)`);
    }
    if (!keep) { try { unlinkSync(g.png); unlinkSync(g.png + ".truth.json"); } catch { /* ignore */ } }
  }
  const agg = aggregateScores(scores);
  const ok = scores.length;
  const coverage = count ? +(ok / count).toFixed(4) : 0;
  const degraded = ok < count;
  // R12 honesty: the aggregate is computed ONLY over prints that OCR'd. If some
  // prints failed (gen/curl/parse), the headline is NOT a clean full-run result —
  // surface coverage + degraded loudly, and exit non-zero on total failure so a
  // partial/empty run can never masquerade as a perfect one.
  const caveat = "DIMENSION-RECOVERY accuracy (type-aware + optimal matching) on CLEAN SYNTHETIC prints — this is the model's "
    + "ceiling on ideal input, NOT real-scanned-print accuracy (the real corpus is ~60/280). "
    + "A high score here + low real-corpus yield means the gap is INPUT QUALITY (scan noise / "
    + "non-drawing pages), not model capability. Matching is TYPE-AWARE + optimal (max-cardinality) "
    + "assignment by default (a diameter no longer matches a linear/angular of equal magnitude; pass "
    + "typeAware:false to scoreDimensionSet for the legacy value-only metric). For a useful training "
    + "gradient, run --difficulty hard (tolerances, GD&T, noise, rotation).";
  const report = {
    ts: get("--ts", new Date().toISOString()), model, count, ocr_ok: ok, gen_or_ocr_fail: count - ok,
    coverage, degraded, caveat,
    difficulty: get("--difficulty", "easy"),
    aggregate: agg,
    worst: cases.filter((c) => Number.isFinite(c.recall)).sort((a, b) => a.recall - b.recall).slice(0, 5),
    cases,
  };
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const cov = degraded ? `⚠ DEGRADED ${ok}/${count} OCR'd (coverage ${coverage})` : `${ok}/${count} OCR'd`;
  console.log(`\n[closed-loop] === AGGREGATE (${cov}) ===`);
  if (degraded) console.log(`  ⚠ ${count - ok} print(s) FAILED (gen/curl/parse) — aggregate is over the ${ok} that ran, NOT the full set.`);
  console.log(`  micro recall=${agg.micro_recall}  precision=${agg.micro_precision}  F1=${agg.micro_f1}  mean MAE=${agg.mean_mae_mm}mm`);
  console.log(`  dims: matched ${agg.total_matched}/${agg.total_truth} truth · ${agg.total_extracted} extracted`);
  console.log(`  CAVEAT: ${caveat}`);
  console.log(`  report → ${reportPath}`);
  // exit non-zero when NOTHING ran (total failure must not look like success)
  exit(ok === 0 ? 2 : 0);
}

const isMain = argv[1] && fileURLToPath(import.meta.url) === resolve(argv[1]);
if (isMain) main().catch((e) => { console.error("[closed-loop] FATAL: " + (e instanceof Error ? e.message : String(e))); exit(1); });
