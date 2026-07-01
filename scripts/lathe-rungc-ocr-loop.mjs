#!/usr/bin/env node
/**
 * lathe-rungc-ocr-loop.mjs -- slot:whiskey  [U-W2C: Rung C-CAD geometry leg]
 * ==========================================================================
 * Closes the GEOMETRY leg of the lathe closed-loop test. Rung A/B score
 * PARAMETERS on a synthetic grid; this scores a REAL part DRAWING end-to-end
 * through the production print->program pipeline, then compares the generated
 * speeds/feeds against the Rung A empirical cloud mined from 34,993 real .MIN
 * programs. THIS is what flips full_geometry_loop_closed for the PDF subset.
 *
 * Chain (all REAL production engines -- R15 test-through-the-path, no reconstruction):
 *   PDF -> fitz raster page0 -> PNG
 *       -> BlueprintVisionOCREngine.analyzeBlueprint({image, blueprint_type:"turning"})
 *       -> TurningPrintIntakeEngine.convertBlueprint({blueprint}) -> TurningInput
 *       -> TurningPrintToProgramEngine.runPipeline(turning_input) -> operations[]
 *       -> scoreProgram(operations, RungA bands)  (scripts/lib/lathe-band-score.mjs)
 *       -> pair to source .MIN via parsePartNumber (scripts/lib/lathe-part-number.mjs)
 *
 * Vision is LOCAL + FREE: node fetch is broken for localhost Ollama on this
 * host ([[node-fetch-localhost-ollama-broken-use-curl]]), so we inject a
 * curl-based ollamaVisionGenerate into the llmEngine singleton and null its
 * api_key -> guaranteed Ollama-only, $0-Claude (R5: OCR is mechanical).
 *
 * MUST run via tsx (imports the .ts engines):
 *   npx tsx scripts/lathe-rungc-ocr-loop.mjs --all --limit 1
 *   npx tsx scripts/lathe-rungc-ocr-loop.mjs --pdf "JM DIE/.../X Drawing v1.pdf"
 *
 * Resumable (reap-safe): each processed print appends to a cursor jsonl; a
 * fleet-reaper kill mid-corpus loses at most the in-flight print. Default
 * --limit 1 per fire (the 7b/32b vision models are GPU-contended).
 */

// --- force Ollama-only vision BEFORE importing LLMEngine (constructor reads env) ---
process.env.PRISM_LLM_OLLAMA_VISION_MODEL =
  process.env.PRISM_LLM_OLLAMA_VISION_MODEL || "qwen2.5vl:7b";

import { readFileSync, appendFileSync, existsSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { scoreProgram } from "./lib/lathe-band-score.mjs";
import { scoreSafetyEfficiency } from "./lib/lathe-safety-efficiency-score.mjs";
import { parsePartNumber } from "./lib/lathe-part-number.mjs";
import { fleetEnvelope } from "./lib/lathe-jm-fleet-envelope.mjs";
import { relevantTips } from "./lib/lathe-tribal-advisory.mjs";

const REPO = resolve(fileURLToPath(import.meta.url), "..", "..");
const DASH = join(REPO, "state", "shared", "dashboards");
const CURSOR = join(REPO, "state", "shared", "lathe-rungc-ocr-cursor.jsonl"); // gitignored
const RUNG_A = join(DASH, "lathe-jmdie-param-accuracy.json");
const PY = "H:/Tools/python/python.exe";
const MIN_ROOT = "H:/PRISM/JM DIE";
const TMP = join(REPO, "state", "shared", "tmp", "rungc-raster");
const OLLAMA_TIMEOUT_MS = 300_000;

// The real JM part DRAWINGS (not tooling-CAD PDFs). Glob-confirmed 2026-06-26.
const DEFAULT_PRINTS = [
  "JM DIE/JM DIE COMPANY/2475-037 (EXTRUDE PUNCH) Drawing v3.pdf",
  "JM DIE/PRISM CAD TESTING/PRISM_2475-037_Extrude_Punch Drawing v1.pdf",
  "JM DIE/OKUMA/REVERSE ENGINEERING/56 NATIONAL BLOCK 1 Drawing v1.pdf",
  "JM DIE/OKUMA/REVERSE ENGINEERING/56 NATIONAL BLOCK 2 Drawing v1.pdf",
  "JM DIE/JM DIE COMPANY/Downloads/STPM01010_RevD_2021-09-29.pdf",
  "JM DIE/JM DIE COMPANY/Downloads/STPM01011_RevD_2021-09-29.pdf",
  "JM DIE/JM DIE COMPANY/Downloads/STPM01012_RevC_2019-11-27.pdf",
  "JM DIE/HAAS-HURCO/57-CC-87.pdf",
  "JM DIE/HAAS-HURCO/PD1120.pdf",
  "JM DIE/HAAS-HURCO/SETUPS/1413-246-02-1.pdf",
];

function args() {
  const a = { all: false, limit: 1, pdf: null };
  for (let i = 2; i < process.argv.length; i++) {
    const t = process.argv[i];
    if (t === "--all") a.all = true;
    else if (t === "--limit") a.limit = parseInt(process.argv[++i], 10) || a.limit;
    else if (!t.startsWith("--")) a.pdf = t;
  }
  return a;
}

function slugOf(p) {
  return p.toLowerCase().replace(/[\\/]/g, "_").replace(/[^a-z0-9_]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

// Maxed lathe tribal corpus -> per-part advisory surfacing (clone of STEP leg). Loaded once, fail-soft.
const TRIBAL_CORPUS = join(REPO, "state", "shared", "lathe-tribal-corpus.jsonl");
let _tribalTips = null;
function loadTribalTips() {
  if (_tribalTips) return _tribalTips;
  _tribalTips = [];
  try {
    for (const line of readFileSync(TRIBAL_CORPUS, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      try { const e = JSON.parse(line); if (e.kind === "extracted-tip" && e.tip) _tribalTips.push(e); } catch { /* skip */ }
    }
  } catch { /* corpus absent -> no advisories (fail-soft) */ }
  return _tribalTips;
}

/**
 * Resumable cursor: a print is "done" ONLY when TERMINAL --
 *   - ok (scored)            : real result, never re-run
 *   - stage === "missing"    : file genuinely absent (deterministic)
 * Every OTHER outcome (raster-failed / ocr-threw / intake-threw / pipeline-threw /
 * intake-no-input / pipeline-no-ops) is TRANSIENT -- vision is stochastic + the
 * GPU is fleet-contended, so those MUST stay retriable on the next fire (same
 * doctrine as the sibling tribal ingest: Ollama errors are not marked done).
 * The attempt row is still appended (for dashboard failure stats) but does NOT
 * count toward "done".
 */
function isTerminal(r) {
  // Terminal (never re-run): a real scored result, a genuinely-missing file, or a
  // geometry-closed-but-all-specialty program (deterministic -- no bandable ops to gain).
  return r && (r.ok === true || r.stage === "missing" || r.stage === "scored-no-bandable-ops");
}
function alreadyDone() {
  const done = new Set();
  if (!existsSync(CURSOR)) return done;
  for (const line of readFileSync(CURSOR, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { const r = JSON.parse(line); if (r.rel && isTerminal(r)) done.add(r.rel); } catch { /* skip */ }
  }
  return done;
}

/** Rasterize PDF page 0 to a PNG file via PyMuPDF (fitz). Returns {path,pages} or null. */
function rasterizePage0(absPath, outPng) {
  const py =
    "import sys,fitz\n" +
    "d=fitz.open(sys.argv[1])\n" +
    "n=d.page_count\n" +
    "p=d.load_page(0)\n" +
    "pix=p.get_pixmap(matrix=fitz.Matrix(2,2))\n" + // 2x = ~150 DPI, enough for dim text
    "pix.save(sys.argv[2])\n" +
    "sys.stdout.write(str(n))\n";
  const r = spawnSync(PY, ["-c", py, absPath, outPng], { encoding: "utf8", timeout: 120000, windowsHide: true });
  if (r.status !== 0 || !existsSync(outPng)) return null;
  return { path: outPng, pages: parseInt((r.stdout || "1").trim(), 10) || 1 };
}

/** Curl-based Ollama vision generator (proven on this host) matching the
 *  llmEngine.deps.ollamaVisionGenerate signature. base64 images forwarded to
 *  Ollama /api/generate `images`. */
async function curlOllamaVision(o) {
  const payload = JSON.stringify({
    model: o.model, prompt: o.prompt, system: o.system,
    images: o.images, stream: false, keep_alive: "15m",
    options: { temperature: o.temperature ?? 0.1, num_predict: o.maxTokens ?? 2048 },
  });
  const cr = spawnSync(
    "curl",
    ["-s", "-m", "280", "http://127.0.0.1:11434/api/generate", "-H", "content-type: application/json", "-d", "@-"],
    { input: payload, encoding: "utf8", timeout: OLLAMA_TIMEOUT_MS, windowsHide: true, maxBuffer: 64 * 1024 * 1024 },
  );
  if (cr.status !== 0) return { ok: false, value: null, error: `curl exit ${cr.status}: ${(cr.stderr || "").slice(0, 150)}` };
  try { return { ok: true, value: JSON.parse(cr.stdout).response ?? "", error: null }; }
  catch (e) { return { ok: false, value: null, error: String(e?.message || e) }; }
}

function loadRungABands() {
  try {
    const d = JSON.parse(readFileSync(RUNG_A, "utf8"));
    return d.op_parameter_reference || null;
  } catch { return null; }
}

/** Build a part# -> [.MIN paths] index over the JM corpus so a generated
 *  program can be paired to its real source program (Rung C comparison set). */
let _minIndex = null;
function minPathsForPart(partNumber) {
  if (!partNumber) return [];
  if (!_minIndex) {
    _minIndex = new Map();
    const walk = (dir) => {
      let entries;
      try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        const fp = join(dir, e.name);
        if (e.isDirectory()) walk(fp);
        else if (/\.min$/i.test(e.name)) {
          const pn = parsePartNumber(e.name).partNumber;
          if (!pn) continue;
          if (!_minIndex.has(pn)) _minIndex.set(pn, []);
          _minIndex.get(pn).push(fp);
        }
      }
    };
    walk(MIN_ROOT);
  }
  return _minIndex.get(partNumber) || [];
}

let _enginesReady = false;
let _ocr, _intake, _pipeline, _fleetFloor = null;
/** Resolve the JM lathe fleet FLOOR (most restrictive lathe) from ShopConfig. Lightweight so main() can
 *  call it even on a rebuild-only run -> safety_basis stays accurate. Floor never marks a stall SAFE. (clone of STEP leg) */
async function resolveFleetFloor() {
  if (_fleetFloor) return _fleetFloor;
  try {
    const { shopConfigurationEngine } = await import("../mcp-server/src/engines/ShopConfigurationEngine.js");
    const env = fleetEnvelope(shopConfigurationEngine.getMachines());
    if (env.ok) _fleetFloor = env.floor;
  } catch { /* limits stay undefined -> safety PARTIAL (honest fallback, never false-SAFE) */ }
  return _fleetFloor;
}
async function loadEngines() {
  if (_enginesReady) return;
  const E = "../mcp-server/src/engines/";
  const { llmEngine } = await import(E + "LLMEngine.js");
  // Override ONLY the broken transport leg + force Ollama-only ($0-Claude).
  llmEngine.deps = llmEngine.deps || {};
  llmEngine.deps.ollamaVisionGenerate = curlOllamaVision;
  if (llmEngine.config) llmEngine.config.api_key = undefined; // no Claude vision escalation
  _ocr = (await import(E + "BlueprintVisionOCREngine.js")).blueprintVisionOCREngine;
  _intake = (await import(E + "TurningPrintIntakeEngine.js")).turningPrintIntakeEngine;
  _pipeline = (await import(E + "TurningPrintToProgramEngine.js")).turningPrintToProgramEngine;
  await resolveFleetFloor();
  _enginesReady = true;
}

function record(obj) { appendFileSync(CURSOR, JSON.stringify(obj) + "\n"); }

async function processPrint(rel, opRef) {
  // rel is repo-relative (e.g. "JM DIE/..." or "resources/..."); REPO=H:/prism.
  const abs = join(REPO, rel).replace(/\//g, "\\");
  const ts = new Date().toISOString();
  const base = { ts, rel, slug: slugOf(rel) };
  if (!existsSync(abs)) { const r = { ...base, ok: false, stage: "missing" }; record(r); return r; }

  // Load engines BEFORE rasterizing so a tsx/import failure cannot orphan a temp PNG.
  try { await loadEngines(); }
  catch (e) { const r = { ...base, ok: false, stage: "engines-failed", error: String(e?.message || e) }; record(r); return r; }

  mkdirSync(TMP, { recursive: true });
  const png = join(TMP, slugOf(rel) + ".png");
  const ras = rasterizePage0(abs, png);
  if (!ras) { const r = { ...base, ok: false, stage: "raster-failed" }; record(r); return r; }

  let ocrRes, intakeRes, prog;
  try {
    ocrRes = await _ocr.analyzeBlueprint({ image: { type: "file", path: png }, blueprint_type: "turning", expected_units: "inch" });
  } catch (e) { const r = { ...base, ok: false, stage: "ocr-threw", error: String(e?.message || e), pages: ras.pages }; record(r); cleanup(png); return r; }
  const dimCount = (ocrRes?.dimensions?.length) || 0;
  try {
    intakeRes = await _intake.convertBlueprint({ blueprint: ocrRes, optimization_target: "balanced" });
  } catch (e) { const r = { ...base, ok: false, stage: "intake-threw", error: String(e?.message || e), dims: dimCount, pages: ras.pages }; record(r); cleanup(png); return r; }
  if (!intakeRes?.success || !intakeRes.turning_input) {
    const r = { ...base, ok: false, stage: "intake-no-input", dims: dimCount, pages: ras.pages,
      ambiguities: (intakeRes?.ambiguities || []).map((a) => a.type) };
    record(r); cleanup(png); return r;
  }
  try {
    prog = _pipeline.runPipeline(intakeRes.turning_input);
  } catch (e) { const r = { ...base, ok: false, stage: "pipeline-threw", error: String(e?.message || e), dims: dimCount }; record(r); cleanup(png); return r; }
  cleanup(png);
  if (!prog?.success || !Array.isArray(prog.operations) || prog.operations.length === 0) {
    const r = { ...base, ok: false, stage: "pipeline-no-ops", dims: dimCount, success: !!prog?.success }; record(r); return r;
  }

  const score = scoreProgram(prog.operations, opRef);
  const partNumber = parsePartNumber(rel.split(/[\\/]/).pop()).partNumber;
  const minMatches = minPathsForPart(partNumber);
  // The geometry path closed (PDF -> OCR -> program), but the closed LOOP only
  // VALIDATES when >=1 op was scored vs the empirical cloud. A program of only
  // specialty ops (threading/parting/grooving -- all excluded from band scoring)
  // yields band_scored_ops=0: geometry closed, but nothing validated. That is a
  // DETERMINISTIC terminal outcome (re-running adds no bandable ops) and must NOT
  // flip full_geometry_loop_closed (R12 -- no silent false success; 3-of-3 arm C).
  const bandable = score.band_scored_ops > 0;
  // Safety + efficiency envelope (operator: collision avoidance + cost + machining
  // efficiency factored in). Machine limits from the intake's TurningInput; absent
  // limits -> PARTIAL (the scorer never asserts SAFE on an unchecked axis).
  const ti = intakeRes.turning_input;
  // Apply the JM fleet-floor spindle/power envelope (respect any per-part limit the intake derived).
  if (_fleetFloor) {
    ti.max_spindle_rpm = ti.max_spindle_rpm ?? _fleetFloor.max_spindle_rpm;
    ti.max_power_kW = ti.max_power_kW ?? _fleetFloor.max_power_kW;
  }
  const safetyEff = scoreSafetyEfficiency(prog, { max_spindle_rpm: ti?.max_spindle_rpm, max_power_kW: ti?.max_power_kW });
  // Tribal advisory: surface the maxed corpus's most-relevant shop tips for this part's ops+material.
  const opTypes = prog.operations.map((o) => o.operation_type).filter(Boolean);
  const matName = (prog.material && (prog.material.material_name || prog.material.name)) ||
    (typeof prog.material === "string" ? prog.material : "");
  const tribalAdvisory = relevantTips(loadTribalTips(), { opTypes, materialName: matName }, 3);
  const r = {
    ...base, ok: bandable, stage: bandable ? "scored" : "scored-no-bandable-ops",
    pages: ras.pages, multi_page: ras.pages > 1, // xray lesson: most JM drawings 1pp; flag multi
    dims: dimCount,
    part_number: partNumber,
    paired_min_count: minMatches.length,
    paired_min: minMatches.slice(0, 3).map((p) => p.replace(/\\/g, "/")),
    features: intakeRes.features.length,
    material: prog.material,
    total_ops: score.total_ops,
    band_scored_ops: score.band_scored_ops,
    sfm_in_band_pct: score.sfm_in_band_pct,
    sfm_typical_pct: score.sfm_typical_pct,
    ipr_in_band_pct: score.ipr_in_band_pct,
    ipr_typical_pct: score.ipr_typical_pct,
    both_in_band_pct: score.both_in_band_pct,
    // safety + efficiency (U-W2D)
    safety_verdict: safetyEff.verdict,
    safety_violations: safetyEff.safety_violations,
    safety_breakdown: safetyEff.breakdown,
    safety_unknowns: safetyEff.unknowns,
    cycle_time_sec: safetyEff.efficiency.cycle_time_sec,
    avg_mrr_mm3_min: safetyEff.efficiency.avg_mrr_mm3_min,
    min_tool_life_min: safetyEff.efficiency.min_tool_life_min,
    tribal_advisory: tribalAdvisory,
    tribal_advisory_count: tribalAdvisory.length,
  };
  record(r);
  return r;
}

function cleanup(png) { try { rmSync(png, { force: true }); } catch { /* ignore */ } }

function rebuildDashboard() {
  // Aggregate cursor results into the Rung C-CAD dashboard. A print may have
  // multiple attempt rows (transient retries) -- dedup by rel, last-wins, so a
  // failed-then-scored print counts ONCE at its latest state.
  const byRel = new Map();
  if (existsSync(CURSOR)) {
    for (const line of readFileSync(CURSOR, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      try { const r = JSON.parse(line); if (r.rel) byRel.set(r.rel, r); } catch { /* skip */ }
    }
  }
  const rows = [...byRel.values()];
  const scored = rows.filter((r) => r.ok && r.stage === "scored"); // band_scored_ops>0 (real validation)
  const geometryOnly = rows.filter((r) => r.stage === "scored-no-bandable-ops"); // closed but unvalidated
  const avg = (sel) => {
    const vals = scored.map(sel).filter((v) => typeof v === "number");
    return vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : null;
  };
  const report = {
    schemaVersion: "1.0.0",
    rung: "C-CAD -- real part DRAWING -> vision OCR -> pipeline -> scored vs Rung A empirical cloud",
    generated_at: new Date().toISOString(),
    ground_truth: "Rung A op_parameter_reference (34,993 real JM .MIN programs)",
    vision_model: process.env.PRISM_LLM_OLLAMA_VISION_MODEL,
    safety_basis: _fleetFloor
      ? `JM fleet-floor ${_fleetFloor.max_spindle_rpm}rpm/${_fleetFloor.max_power_kW}kW (most restrictive lathe -- never under-protects). NOTE: rpm axis is partly confirmatory (program G50-clamped to this floor); POWER is the discriminating axis. Collision independently checked.`
      : "machine limits undefined -> rpm/power axes PARTIAL",
    tribal_advisory: {
      corpus_tips: loadTribalTips().length,
      parts_with_advisory: scored.filter((s) => (s.tribal_advisory_count || 0) > 0).length,
      sample: (scored.find((s) => Array.isArray(s.tribal_advisory) && s.tribal_advisory.length) || {}).tribal_advisory || [],
    },
    prints_attempted: rows.length,
    prints_scored: scored.length,
    prints_geometry_only: geometryOnly.length, // program generated but all-specialty (0 bandable ops)
    prints_paired_to_min: scored.filter((r) => r.paired_min_count > 0).length,
    full_geometry_loop_closed: scored.length > 0, // TRUE only when >=1 print had >=1 band-scored op (R12)
    avg_sfm_in_band_pct: avg((r) => r.sfm_in_band_pct),
    avg_sfm_typical_pct: avg((r) => r.sfm_typical_pct),
    avg_ipr_in_band_pct: avg((r) => r.ipr_in_band_pct),
    avg_both_in_band_pct: avg((r) => r.both_in_band_pct),
    // safety + efficiency aggregate (U-W2D): collision avoidance + cost + machining efficiency
    safety_efficiency: {
      safe: scored.filter((r) => r.safety_verdict === "SAFE").length,
      unsafe: scored.filter((r) => r.safety_verdict === "UNSAFE").length,
      partial: scored.filter((r) => r.safety_verdict === "PARTIAL").length,
      unscored: scored.filter((r) => !r.safety_verdict).length, // legacy pre-U-W2D rows; keeps buckets summing to prints_scored
      total_safety_violations: scored.reduce((s, r) => s + (r.safety_violations || 0), 0),
      avg_cycle_time_sec: avg((r) => r.cycle_time_sec),
      avg_mrr_mm3_min: avg((r) => r.avg_mrr_mm3_min),
      min_tool_life_min: (() => {
        const vals = scored.map((r) => r.min_tool_life_min).filter((v) => typeof v === "number");
        return vals.length ? Math.min(...vals) : null;
      })(),
    },
    honest_note:
      "full_geometry_loop_closed is TRUE only when >=1 print went PDF->OCR->program AND had >=1 op " +
      "scored vs the empirical cloud (band_scored_ops>0); it does NOT count a program of only specialty " +
      "ops (prints_geometry_only -- geometry closed but nothing validated). PDF-print subset only " +
      "(vision-OCR path). STEP B-rep geometry leg (2,307 JM STEP files) still needs the Python cad-engine " +
      "bridge. Specialty ops (threading/parting/grooving) are excluded from band scoring (specialized feed regimes).",
    failures_by_stage: rows.filter((r) => !r.ok && r.stage !== "scored-no-bandable-ops")
      .reduce((m, r) => { m[r.stage] = (m[r.stage] || 0) + 1; return m; }, {}),
    prints: rows,
  };
  mkdirSync(DASH, { recursive: true });
  writeFileSync(join(DASH, "lathe-rungc-ocr.json"), JSON.stringify(report, null, 2));
  const md =
    `# Rung C-CAD -- print->program geometry closed loop (lathe)\n\n` +
    `- generated: ${report.generated_at}\n- vision model: ${report.vision_model}\n` +
    `- prints attempted: ${report.prints_attempted} | scored: ${report.prints_scored} | paired to .MIN: ${report.prints_paired_to_min}\n` +
    `- **full_geometry_loop_closed (PDF subset): ${report.full_geometry_loop_closed}**\n` +
    `- avg SFM in-band: ${report.avg_sfm_in_band_pct}% (typical ${report.avg_sfm_typical_pct}%) | IPR in-band: ${report.avg_ipr_in_band_pct}% | both: ${report.avg_both_in_band_pct}%\n` +
    `- tribal advisory: ${report.tribal_advisory.corpus_tips} corpus tips, ${report.tribal_advisory.parts_with_advisory} part(s) with surfaced shop tips\n\n` +
    `> ${report.honest_note}\n`;
  writeFileSync(join(DASH, "lathe-rungc-ocr.md"), md);
  return report;
}

async function main() {
  const a = args();
  const opRef = loadRungABands();
  if (!opRef) {
    console.log(JSON.stringify({ ok: false, error: `Rung A bands missing: ${RUNG_A}. Run lathe-jmdie-param-accuracy-harness.mjs first.` }));
    process.exit(1);
  }
  const done = alreadyDone();
  // Normalize --pdf to a repo-relative key so the abs-path construction and the
  // cursor key stay consistent (an absolute/backslash arg would otherwise build a
  // nonsense path -> "missing" -> terminal -> cursor poison; 3-of-3 arm C P2).
  let pdfRel = a.pdf ? a.pdf.replace(/^\.\//, "") : null;
  if (pdfRel && (/^[a-zA-Z]:[\\/]/.test(pdfRel) || pdfRel.startsWith("/"))) {
    const rel = relative(REPO, resolve(pdfRel)).replace(/\\/g, "/");
    if (!rel.startsWith("..")) pdfRel = rel; // inside REPO -> relativize; else leave as-is (records "missing" honestly)
  }
  const queue = (pdfRel ? [pdfRel] : DEFAULT_PRINTS).filter((p) => !done.has(p));
  const todo = a.all ? queue.slice(0, a.limit) : queue.slice(0, 1);
  const results = [];
  for (const rel of todo) results.push(await processPrint(rel, opRef));
  await resolveFleetFloor(); // safety_basis accurate even on a rebuild-only (todo empty) run
  const report = rebuildDashboard();
  console.log(JSON.stringify({
    ok: true, processed: results.length, remaining: queue.length - todo.length,
    prints_scored: report.prints_scored, prints_paired_to_min: report.prints_paired_to_min,
    full_geometry_loop_closed: report.full_geometry_loop_closed,
    avg_both_in_band_pct: report.avg_both_in_band_pct,
    results: results.map((r) => ({ rel: r.rel, ok: r.ok, stage: r.stage, dims: r.dims, ops: r.total_ops, both_pct: r.both_in_band_pct })),
  }, null, 2));
}

main().catch((e) => { console.log(JSON.stringify({ ok: false, error: String(e?.message || e) })); process.exit(1); });
