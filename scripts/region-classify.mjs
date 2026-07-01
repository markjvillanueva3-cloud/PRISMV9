#!/usr/bin/env node
// scripts/region-classify.mjs
//
// BLUEPRINT-VISION-OCR P1.5 step 2b -- the LIVE layout-aware region-routing glue. Segments a
// blueprint page into layout regions, routes each to an extractor, crops + OCRs each region, and
// UNIONs the result with a full-page floor pass. The thin-glue half of the pure-lib + thin-glue
// split (cores: scripts/lib/region-classifier-lib.mjs + scripts/lib/region-glue-lib.mjs).
//
// LOAD-BEARING (data-loss-safe, recall-first): the full-page OCR floor ALWAYS runs, regardless of
// the route. On a low-confidence / malformed / empty segmentation, decideRegionRouting returns
// "full_page" and the floor IS the result (region routing declined -- never a worse box-cropped
// subset). On "region_route", mergeRegionResults UNIONs the per-region passes ON TOP of the floor,
// so region routing can only ADD recall (small dims in dense corners), never remove it.
//
// Transport: curl @reqfile to Ollama /api/generate for the cheap segmentation pass (node fetch
// fails against Ollama, per page-classify.mjs). The per-region + full-page OCR reuse the proven
// runEnsembleOverImage; crop reuses crop-image-tiles.py via cropTilesPy; lift reuses computeLift.
//
// PURE-OVER-DEPS orchestrator: extractWithRegionRouting(opts, deps) takes injectable deps
// (readImageSize / segment / cropRegions / runEnsemble) so the routing+merge logic is unit-tested
// WITHOUT a GPU (see region-classify.test.mjs). main() wires the real deps + CLI.

import { writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { argv, exit, env, pid } from "node:process";

import {
  buildRegionSegmentPrompt,
  buildRegionSegmentRequestBody,
  parseRegionSegmentResponse,
  decideRegionRouting,
  DEFAULT_VISION_MODEL,
  DEFAULT_REGION_TIMEOUT_MS,
} from "./lib/region-classifier-lib.mjs";
import { buildRegionCropSpecs, mergeRegionResults, buildRegionRoutedFused } from "./lib/region-glue-lib.mjs";
// REUSE the tiling glue's proven helpers (R8 -- do not reinvent png-size / crop / lift).
import { readPngSize, cropTilesPy, computeLift } from "./vision-tiling-extract.mjs";
import { runEnsembleOverImage } from "./lib/vision-ensemble-fuse.mjs";

const OLLAMA = (env.OLLAMA_URL || "http://127.0.0.1:11434") + "/api/generate";

/**
 * Default LIVE segmentation dep: curl one rendered page PNG through the VLM and return the raw
 * model response text (for parseRegionSegmentResponse). FAIL-SOFT: any load/curl/parse failure
 * returns "" so parse fails -> decideRegionRouting falls back to full_page (data-loss-safe).
 *
 * @param {string} png   rendered page PNG path
 * @param {{model?:string, timeoutMs?:number, workDir?:string}} [opts]
 * @returns {string} raw model response text ("" on any failure)
 */
export function runRegionSegment(png, opts = {}) {
  const model = typeof opts.model === "string" && opts.model ? opts.model : DEFAULT_VISION_MODEL;
  const timeoutSec = Math.ceil((Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : DEFAULT_REGION_TIMEOUT_MS) / 1000);
  let b64;
  try { b64 = readFileSync(png).toString("base64"); } catch { return ""; }
  const body = buildRegionSegmentRequestBody(buildRegionSegmentPrompt(), b64, { model });
  const workDir = opts.workDir || tmpdir();
  const reqFile = join(workDir, `region-seg-req-${pid}-${Math.abs(hashStr(png))}.json`);
  try {
    mkdirSync(workDir, { recursive: true });
    writeFileSync(reqFile, JSON.stringify(body));
  } catch { return ""; }
  let raw = "";
  try {
    const r = spawnSync("curl", ["-s", "--max-time", String(timeoutSec), OLLAMA, "-d", "@" + reqFile], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    if (!r || r.status !== 0) return "";
    const parsed = JSON.parse(r.stdout);
    raw = typeof parsed.response === "string" ? parsed.response : "";
  } catch { raw = ""; }
  finally { try { if (existsSync(reqFile)) rmSync(reqFile, { force: true }); } catch { /* best-effort */ } }
  return raw;
}

// small deterministic string hash for a unique-but-stable temp filename (no Math.random in this repo's scripts)
function hashStr(s) {
  let h = 0;
  const str = String(s);
  for (let i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) | 0; }
  return h;
}

function dimsOf(res) {
  return res && res.fused && Array.isArray(res.fused.dimensions) ? res.fused.dimensions : [];
}
// The ensemble depth a region pass ran at. Used as the fallback summary.n_models when the full-page
// floor FAILED (no summary) so the region-rescued dims stay trainable downstream (buildTrainsetRow's
// corroboration gate is summary.n_models>=2). Prefer the fused summary's n_models; fall back to models_ok.
function nModelsOf(res) {
  if (res && res.fused && res.fused.summary && Number.isFinite(res.fused.summary.n_models)) {
    return res.fused.summary.n_models;
  }
  return res && Number.isFinite(res.models_ok) ? res.models_ok : 0;
}

/**
 * Attribute WHY a region-routed page produced zero scoreable dimensions -- the diagnostic that makes a
 * multi-seed GPU drop-investigation conclusive. Under region_route the full-page floor ALWAYS runs and
 * region passes UNION on top, so a page that drops to 0 scoreable dims has exactly one of these roots,
 * which behave differently across seeds:
 *   - "ok"                       unionScoreableCount > 0 (no drop)
 *   - "merge_or_unit_dropped"    the floor read SCOREABLE dims (floorOk, floorDimCount>0) yet none
 *                                survived in the union -- a CODE signal (merge clique-collapse or unit
 *                                normalization), reproducible across seeds. THE bug to chase first.
 *   - "blank_page"              the floor ran clean (floorOk) but read 0 dims -- a genuine non-callout
 *                                page (cover/notes/table). Stable across seeds = an expected drop, NOT a bug.
 *   - "floor_failed_regions_ran" the floor FAILED (timeout/contention) but regions ran, recovering no
 *                                scoreable dims -- host-side starvation under the heavier per-page path.
 *   - "extraction_failed"        nothing read at all (floor failed AND no region succeeded) -- VLM/host
 *                                failure; if it VARIES across seeds it is VLM variance, if STABLE it is host.
 * Pure (counts in, label out) so it is unit-tested without a GPU.
 *
 * @param {{floorOk?:boolean, floorDimCount?:number, unionScoreableCount?:number, regionsOcrOk?:number}} counts
 *   floorDimCount and unionScoreableCount MUST be counted with the SAME predicate (scoreable dims --
 *   finite positive value_mm) so "merge_or_unit_dropped" cannot fire on a non-positive floor read.
 * @returns {"ok"|"merge_or_unit_dropped"|"blank_page"|"floor_failed_regions_ran"|"extraction_failed"}
 */
export function classifyRegionPageDrop(counts = {}) {
  const fOk = counts.floorOk === true;
  const fDims = Number.isFinite(counts.floorDimCount) ? counts.floorDimCount : 0;
  const uScore = Number.isFinite(counts.unionScoreableCount) ? counts.unionScoreableCount : 0;
  const rOk = Number.isFinite(counts.regionsOcrOk) ? counts.regionsOcrOk : 0;
  if (uScore > 0) return "ok";
  if (fOk) return fDims > 0 ? "merge_or_unit_dropped" : "blank_page";
  return rOk > 0 ? "floor_failed_regions_ran" : "extraction_failed";
}

// R12 fail-loud parity with the tiling glue: runEnsembleOverImage returns error:null even when
// EVERY model failed (models_ok=0). OCR is "ok" only when at least one model produced an extraction.
function ensembleOk(res) {
  const okModels = res ? res.models_ok : undefined;
  return !!res && !res.error && (typeof okModels === "number" ? okModels > 0 : true);
}

/**
 * Segment a page, route its regions, OCR each region + the full-page floor, and UNION them. Pure
 * over injectable deps.
 *
 * @param {{pngPath:string, models?:string[], segmentModel?:string, segmentTimeoutMs?:number,
 *          minConfidence?:number, minTrustedRegions?:number, partClass?:string, wireEdm?:boolean,
 *          assumeUnits?:string, forceUnits?:string, workDir?:string, keep?:boolean,
 *          valueTolMm?:number, liftTolMm?:number, ensembleOpts?:object}} opts
 * @param {{readImageSize?:Function, segment?:Function, cropRegions?:Function, runEnsemble?:Function}} [deps]
 * @returns {Promise<object>}  { route, page, decision, dimensions, fullPage, perRegion?, merged?,
 *            cropSpecs?, lift?, regionsOcrOk, regionsOcrFailed }
 */
export async function extractWithRegionRouting(opts, deps = {}) {
  if (!opts || typeof opts.pngPath !== "string" || !opts.pngPath) throw new Error("extractWithRegionRouting: pngPath required");
  const readImageSize = deps.readImageSize || readPngSize;
  const segment = deps.segment || runRegionSegment;
  const cropRegions = deps.cropRegions || cropTilesPy;
  const runEnsemble = deps.runEnsemble || runEnsembleOverImage;
  const models = Array.isArray(opts.models) && opts.models.length ? opts.models : [];

  const { width, height } = await readImageSize(opts.pngPath);

  // 1. SEGMENT (cheap layout pass) -> route decision (data-loss-safe full_page on any failure).
  //    A THROWING segment dep is itself a failure -> empty text -> full_page fallback (never crash
  //    the whole extraction over a flaky layout pass; the real runRegionSegment is already fail-soft).
  let segText = "";
  try {
    const segRaw = await segment(opts.pngPath, { model: opts.segmentModel, timeoutMs: opts.segmentTimeoutMs, workDir: opts.workDir });
    segText = typeof segRaw === "string" ? segRaw : (segRaw && typeof segRaw.response === "string" ? segRaw.response : "");
  } catch { segText = ""; }
  const parsed = parseRegionSegmentResponse(segText);
  const decision = decideRegionRouting(parsed, { minConfidence: opts.minConfidence, minTrustedRegions: opts.minTrustedRegions });

  // 2. The full-page OCR floor ALWAYS runs -- the recall guarantee + the lift baseline. It keeps the
  //    title block, so it is NOT unit-forced (assumeUnits stays a fallback there).
  const ensembleCommon = { models, partClass: opts.partClass, wireEdm: opts.wireEdm, assumeUnits: opts.assumeUnits, ...(opts.ensembleOpts || {}) };
  const fullRes = await runEnsemble({ png: opts.pngPath, ...ensembleCommon });
  const fullDims = dimsOf(fullRes);
  const fullPageOk = ensembleOk(fullRes);

  // 3. full_page route -> the floor IS the result. Region routing declined; no box-cropped subset.
  if (decision.route !== "region_route") {
    const fullFused = fullRes && fullRes.fused ? fullRes.fused : null;
    return {
      route: "full_page", page: { width, height }, decision,
      dimensions: fullDims, fullPage: { dimensions: fullDims, ok: fullPageOk, fused: fullFused },
      // `fused` is a complete fused object a rich-label consumer (e.g. the training cron's
      // buildTrainsetRow) can use directly. On full_page route it is simply the full-page pass's fused.
      fused: fullFused,
      perRegion: [], cropSpecs: [], lift: null, regionsOcrOk: 0, regionsOcrFailed: 0,
    };
  }

  // 4. region_route -> crop each routable region, OCR it, then UNION with the full-page floor.
  const cropSpecs = buildRegionCropSpecs(decision.routed, width, height);
  const workDir = opts.workDir || join(tmpdir(), `prism-region-${pid}-${cropSpecs.length}`);
  // Region crops strip the title block (like tiling) -> force the global units onto each region so a
  // per-region VLM unit guess can't produce a wrong-scale value. The full-page floor (step 2) is unforced.
  const regionForceUnits = opts.forceUnits || opts.assumeUnits || undefined;
  const regionEnsembleCommon = regionForceUnits ? { ...ensembleCommon, forceUnits: regionForceUnits } : ensembleCommon;

  const perRegion = [];
  let regionsOcrOk = 0;
  let regionsOcrFailed = 0;
  let regionNModels = 0; // best region ensemble depth -> fallback summary.n_models when the floor fails
  if (cropSpecs.length) {
    const cropMap = await cropRegions(opts.pngPath, cropSpecs, workDir);
    for (const spec of cropSpecs) {
      const regionPng = cropMap && typeof cropMap.get === "function" ? cropMap.get(spec.id) : undefined;
      if (!regionPng) { regionsOcrFailed++; continue; } // uncroppable region -> the full-page floor covers it
      const res = await runEnsemble({ png: regionPng, ...regionEnsembleCommon });
      if (ensembleOk(res)) regionsOcrOk++; else regionsOcrFailed++;
      const rn = nModelsOf(res);
      if (rn > regionNModels) regionNModels = rn;
      // Capture each region's FULL fused (not just dims) so the dense-rescue non-dim merge can recover
      // gdt/notes/profiles/surface_finishes the region crops read when the full-page floor failed.
      perRegion.push({ id: spec.id, dimensions: dimsOf(res), fused: res && res.fused ? res.fused : null });
    }
  }

  const merged = mergeRegionResults(perRegion, fullDims, cropSpecs, width, height, { valueTolMm: opts.valueTolMm });
  // Recall lift of region-routing over the full-page baseline (the R15 numeric proof).
  const lift = computeLift(fullDims, merged.dimensions, { valueTolMm: opts.liftTolMm });
  lift.baselineFailed = !fullPageOk;

  if (!opts.keep && opts.workDir == null && existsSync(workDir)) {
    try { rmSync(workDir, { recursive: true, force: true }); } catch { /* best-effort cleanup */ }
  }

  const fullFused = fullRes && fullRes.fused ? fullRes.fused : null;
  return {
    route: "region_route", page: { width, height }, decision,
    dimensions: merged.dimensions, merged,
    fullPage: { dimensions: fullDims, ok: fullPageOk, fused: fullFused },
    // `fused` = the HYBRID a rich-label consumer (training cron buildTrainsetRow) uses directly:
    // region-routed dimensions + the full-page floor's non-dimension schema (gdt/notes/profiles/
    // surface_finishes/summary) -- region routing's dim-recall WITHOUT dropping the other labels.
    // fallbackNModels synthesizes summary.n_models from the region ensemble WHEN the full-page floor
    // failed (no summary), so a dense-page rescue (floor=0 dims, regions recover them) stays TRAINABLE.
    fused: buildRegionRoutedFused(merged.dimensions, fullFused, { fallbackNModels: regionNModels, regionFused: perRegion.map((p) => p.fused).filter(Boolean) }),
    perRegion, cropSpecs, lift, regionsOcrOk, regionsOcrFailed, regionNModels,
  };
}

// ---- CLI ----------------------------------------------------------------------------------------

function parseArgs(args) {
  const o = { models: [], json: false, keep: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--image") o.pngPath = args[++i];
    else if (a === "--models") o.models = String(args[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--model") o.models = [String(args[++i] || "").trim()].filter(Boolean);
    else if (a === "--segment-model") o.segmentModel = args[++i];
    else if (a === "--assume-units") o.assumeUnits = args[++i];
    else if (a === "--force-units") o.forceUnits = args[++i];
    else if (a === "--part-class") o.partClass = args[++i];
    else if (a === "--min-conf") o.minConfidence = Number(args[++i]);
    else if (a === "--min-trusted") o.minTrustedRegions = Number(args[++i]);
    else if (a === "--segment-timeout") o.segmentTimeoutMs = Number(args[++i]);
    else if (a === "--wire-edm") o.wireEdm = true;
    else if (a === "--json") o.json = true;
    else if (a === "--keep") o.keep = true;
  }
  return o;
}

async function main() {
  const o = parseArgs(argv.slice(2));
  if (!o.pngPath) {
    process.stderr.write("usage: region-classify.mjs --image <page.png> [--models a,b] [--segment-model m] [--force-units in|mm] [--json]\n");
    exit(2);
  }
  if (!o.models.length) o.models = [DEFAULT_VISION_MODEL];
  const r = await extractWithRegionRouting(o);
  if (o.json) {
    process.stdout.write(JSON.stringify({
      route: r.route, page: r.page, decision_reason: r.decision && r.decision.reason,
      dimension_count: r.dimensions.length, full_page_count: r.fullPage.dimensions.length,
      regions_ocr_ok: r.regionsOcrOk, regions_ocr_failed: r.regionsOcrFailed, lift: r.lift,
    }) + "\n");
  } else {
    process.stdout.write(`[region-classify] route=${r.route} dims=${r.dimensions.length} (full-page floor=${r.fullPage.dimensions.length}, regions ok=${r.regionsOcrOk}/${r.regionsOcrOk + r.regionsOcrFailed})` +
      (r.lift ? ` lift: +${r.lift.newInTiled} new vs full-page` : "") + "\n");
  }
}

const isMain = argv[1] && resolve(argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((e) => { process.stderr.write(`[region-classify] FAIL: ${String(e && e.stack || e)}\n`); exit(1); });
