#!/usr/bin/env node
// scripts/ocr-extract-one.mjs
//
// U-XRAY-DRAWING-EXTRACT-ROUTE-ASYNC -- OCR ONE source file (pdf | png/jpg/...) to a fused
// VLM-ensemble extraction, emit a SLIM JSON tuple tuned for the async drawing-extract job runner
// (extractionJobRunner.ts `OcrResult` = { fused, models_ok, error? }).
//
// This is the real `ocr` dependency the Express route spawns out-of-process so the heavy GPU work
// stays OFF the server event loop. It is a THIN orchestration over already-built pieces -- it does
// NOT reimplement the ensemble:
//   - PDF -> PNG raster  : scripts/lib/pdf-to-png.py (the ONLY new step vision-ensemble-extract lacks)
//   - concurrent ensemble: runEnsembleOverImage (scripts/lib/vision-ensemble-fuse.mjs, shared core)
//   - model roster       : VISION_FAMILY_LEADERS pulled-gated (scripts/lib/vision-model-select.mjs)
// (vision-ensemble-extract.mjs stays the human-facing CLI with scoring/synthetic-gen/report UX; this
//  is the machine-facing single-source -> fused JSON the job runner consumes.)
//
// USAGE:
//   node scripts/ocr-extract-one.mjs --source <path.pdf|png|jpg> [--models a,b,c] [--page 0]
//        [--dpi 300] [--part-class electrode] [--wire-edm] [--assume-units in] [--max-time-sec 300] [--json]
//
// OUTPUT (stdout, always JSON): { ok, fused, models_ok, models_failed, image, models, error? }
// EXIT: 0 = >=1 model OCR'd  ·  2 = no model produced an extraction  ·  3 = args/raster/setup error.

import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { join, dirname, resolve, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { argv, exit, env, pid } from "node:process";
import { spawnSync } from "node:child_process";

import { fetchAvailableVisionModels, isThinkingTrap, VISION_FAMILY_LEADERS } from "./lib/vision-model-select.mjs";
import { runEnsembleOverImage } from "./lib/vision-ensemble-fuse.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PYTHON = env.PRISM_PYTHON || "H:/Tools/python/python.exe";
const PDF_TO_PNG = join(REPO_ROOT, "scripts", "lib", "pdf-to-png.py");
const OLLAMA_URL = env.OLLAMA_URL || "http://127.0.0.1:11434";

/** Raster source extensions handled directly (no PDF render step). */
const RASTER_EXTS = new Set([".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"]);

/** Hard ceiling on the PDF->PNG raster subprocess (PyMuPDF render of one page is ~sub-second). */
const RASTER_TIMEOUT_MS = 120000;

/** Auto-roster size ceiling -- N diverse VLMs must fit GPU-resident CONCURRENT (the Blackwell budget). */
const MAX_ENSEMBLE_MODELS = 3;

/** Pure: parse argv tail -> options. No side effects (unit-testable). */
export function parseOcrOneArgs(args) {
  const get = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
  const has = (f) => args.includes(f);
  const num = (f, d) => { const v = Number(get(f, d)); return Number.isFinite(v) ? v : d; };
  return {
    source: get("--source", null),
    models: get("--models", null),
    page: Math.max(0, num("--page", 0)),
    dpi: Math.max(72, num("--dpi", 300)),
    partClass: get("--part-class", "generic"),
    wireEdm: has("--wire-edm"),
    assumeUnits: get("--assume-units", "in"),
    maxTimeSec: num("--max-time-sec", 300),
    json: has("--json"),
  };
}

/**
 * Pure: decide how `source` becomes a PNG the ensemble can read. Returns the lowercased ext, whether
 * a PDF raster step is needed, and (on an unhandled ext) a reason -- so main() never spawns blindly.
 */
export function planRaster(source) {
  if (typeof source !== "string" || !source.length) return { ok: false, reason: "no --source" };
  const ext = extname(source).toLowerCase();
  if (ext === ".pdf") return { ok: true, ext, needsRaster: true };
  if (RASTER_EXTS.has(ext)) return { ok: true, ext, needsRaster: false };
  return { ok: false, ext, reason: `unsupported source ext '${ext}' (want .pdf or a raster image)` };
}

/**
 * Pure: pick the ensemble roster -- explicit --models (verbatim) else the diverse family leaders that
 * are actually pulled AND JSON-safe (not a thinking-trap), capped at the concurrent-GPU budget.
 * `leaders`/`maxModels` are injectable so the pulled-gate + thinking-trap filter + cap are unit-testable
 * independent of the live VISION_FAMILY_LEADERS roster size (default = production values).
 */
export function chooseModels(explicit, available, leaders = VISION_FAMILY_LEADERS, maxModels = MAX_ENSEMBLE_MODELS) {
  if (explicit) {
    const list = String(explicit).split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
    return { models: list, source: "--models" };
  }
  const pulled = new Set(available || []);
  const chosen = leaders.filter((m) => pulled.has(m) && !isThinkingTrap(m)).slice(0, Math.max(1, maxModels));
  return { models: chosen, source: "auto (pulled family leaders)" };
}

/** Emit the slim result tuple + exit. Single sink so every path returns the same JSON shape. */
function emit(obj, code) {
  process.stdout.write(JSON.stringify(obj) + "\n");
  return code;
}

async function main() {
  const opts = parseOcrOneArgs(argv.slice(2));

  const plan = planRaster(opts.source);
  if (!plan.ok) return emit({ ok: false, fused: null, models_ok: 0, error: plan.reason }, 3);
  if (!existsSync(opts.source)) return emit({ ok: false, fused: null, models_ok: 0, error: `source not found: ${opts.source}` }, 3);

  // 1. Resolve the PNG (rasterize a PDF page, or use the raster source directly).
  let png = opts.source;
  let cleanup = null;
  let workDir = dirname(resolve(opts.source));
  if (plan.needsRaster) {
    workDir = join(tmpdir(), `ocr-one-${pid}`);
    try { mkdirSync(workDir, { recursive: true }); } catch { /* exists */ }
    png = join(workDir, `${basename(opts.source, plan.ext)}-p${opts.page}.png`);
    const r = spawnSync(PYTHON, [PDF_TO_PNG, opts.source, png, "--dpi", String(opts.dpi), "--page", String(opts.page)], {
      encoding: "utf-8", windowsHide: true, timeout: RASTER_TIMEOUT_MS,
    });
    if (r.status !== 0 || !existsSync(png)) {
      // r.error carries the REAL cause on a launch failure (python ENOENT) or a timeout (status=null) --
      // surface it, else the diagnostic degrades to a bare "exit null" (R12).
      const cause = r.error ? `, ${r.error.message}` : "";
      return emit({ ok: false, fused: null, models_ok: 0, error: `pdf raster failed (exit ${r.status}${cause}): ${(r.stderr || "").slice(0, 200)}` }, 3);
    }
    cleanup = png;
  }

  // The rasterized PNG is a temp artifact -- guarantee it is removed on EVERY exit (success, no-models,
  // OR an unexpected ensemble throw) via finally, so a reject never leaks the file (arm-B P2).
  try {
    // 2. Resolve the ensemble model set (network probe of pulled vision models, unless --models given).
    let available = null;
    if (!opts.models) {
      try { available = await fetchAvailableVisionModels(OLLAMA_URL); } catch { available = []; }
    }
    const { models, source: modelSource } = chooseModels(opts.models, available);
    if (!models.length) {
      return emit({ ok: false, fused: null, models_ok: 0, error: `no usable vision models${available ? " (pulled: " + available.join(",") + ")" : ""}` }, 3);
    }

    // 3. Run the concurrent ensemble + fuse.
    const res = await runEnsembleOverImage({
      png, models,
      partClass: opts.partClass, wireEdm: opts.wireEdm, assumeUnits: opts.assumeUnits,
      ollamaUrl: OLLAMA_URL, maxTimeSec: opts.maxTimeSec, workDir,
    });

    const models_ok = res.models_ok || 0;
    // The runner feeds `fused` straight to prism_cad:blueprint_extract_and_route (normalizeFusedToContract).
    // Surface models_ok=0 as an explicit error so the runner records `failed`, not a silent empty `done`.
    const out = {
      ok: models_ok > 0,
      fused: models_ok > 0 ? res.fused : null,
      models_ok,
      models_failed: res.models_failed || 0,
      image: res.image || png,
      page: opts.page, // which PDF page was OCR'd (0 for a raster image) -- so a multi-page source is not implied whole
      models, model_source: modelSource,
      ...(models_ok > 0 ? {} : { error: res.error || "no model produced an extraction" }),
    };
    return emit(out, models_ok > 0 ? 0 : 2);
  } finally {
    if (cleanup) { try { unlinkSync(cleanup); } catch { /* best-effort */ } }
  }
}

// Only run when invoked directly (so the pure cores can be imported by tests without executing main).
if (resolve(fileURLToPath(import.meta.url)) === resolve(argv[1] || "")) {
  main().then((code) => exit(code)).catch((e) => {
    process.stdout.write(JSON.stringify({ ok: false, fused: null, models_ok: 0, error: `FATAL: ${e instanceof Error ? e.message : String(e)}` }) + "\n");
    exit(3);
  });
}
