#!/usr/bin/env node
// scripts/vision-tiling-extract.mjs
//
// U-XRAY-TILING-EXTRACT -- P0.2 dense-page region tiling, end to end.
//
// Splits a blueprint page PNG into overlapping tiles (computeTileGrid), OCRs EACH tile with the
// multi-VLM ensemble (runEnsembleOverImage), then recombines the per-tile dimension sets into one
// de-duplicated set (mergeTiledDimensions). Tiling raises the effective DPI per region without a
// bigger model -- the highest-leverage recall lever for "a dim that was clear but missed in a busy
// corner" (backlog knowledge/wiki/architecture/blueprint-reading-improvement-backlog-2026-06-19.md P0.2).
//
// The orchestrator `extractWithTiling(opts, deps)` is PURE over injectable deps (readImageSize /
// cropTiles / runEnsemble) so the orchestration logic is unit-tested with mocks; the CLI wires the real
// deps (PNG-header size read + Python PIL cropper + the live ensemble) and runs a real print E2E.
//
// USAGE:
//   node scripts/vision-tiling-extract.mjs --image <page.png> [--rows 2 --cols 2 --overlap 0.15]
//        [--models a,b,c | --model qwen3-vl:8b] [--part-class electrode] [--wire-edm]
//        [--assume-units in] [--baseline] [--json] [--keep] [--out <report.json>]
//   --baseline : ALSO OCR the full page once and report the tiling-vs-baseline dimension lift (the
//                R15 "validate with numbers" evidence that tiling finds dims the single pass missed).
//
// EXIT: 0 = ran (grid built + >=1 tile OCR'd) | 2 = no tile produced an extraction | 3 = args/setup error.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { argv, exit, env, pid } from "node:process";

import { computeTileGrid, mergeTiledDimensions, dimValueMm, dimRawText } from "./lib/vision-tiling-lib.mjs";
import { runEnsembleOverImage } from "./lib/vision-ensemble-fuse.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PY_BIN = env.PRISM_PYTHON || "H:/Tools/python/python.exe";
const CROP_PY = join(REPO_ROOT, "scripts", "lib", "crop-image-tiles.py");

// ---- default (real) deps -----------------------------------------------------------------------

/** Read a PNG's pixel size from its IHDR header (bytes 16..24) -- pure, no image lib, no decode. */
export function readPngSize(pngPath) {
  const buf = readFileSync(pngPath);
  // PNG signature: 89 'P' 'N' 'G' 0d 0a 1a 0a ; IHDR width@16 height@20 (big-endian uint32)
  if (buf.length < 24 || buf[0] !== 0x89 || buf.toString("ascii", 1, 4) !== "PNG") {
    throw new Error(`readPngSize: not a PNG file: ${pngPath}`);
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (!(width > 0 && height > 0)) throw new Error(`readPngSize: bad dimensions ${width}x${height} in ${pngPath}`);
  return { width, height };
}

/** Crop all tiles of a page in ONE Python (PIL) process. Returns Map<tileId, writtenTilePngPath>. */
export function cropTilesPy(pngPath, tiles, outDir, opts = {}) {
  const py = opts.pyBin || PY_BIN;
  const script = opts.cropScript || CROP_PY;
  mkdirSync(outDir, { recursive: true });
  const tilesJson = JSON.stringify(tiles);
  // A large grid's inline argv string can approach the OS command-line length limit (Windows
  // CreateProcess ~32K). The cropper also accepts a FILE PATH, so spill to a temp file past a safe bound.
  let tilesArg = tilesJson;
  if (tilesJson.length > 16384) { const f = join(outDir, "tiles.json"); writeFileSync(f, tilesJson); tilesArg = f; }
  const r = spawnSync(py, [script, pngPath, tilesArg, outDir], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (!r || r.status !== 0) {
    throw new Error(`cropTilesPy: python exit=${r ? r.status : "null"} ${(r && r.stderr ? r.stderr.slice(0, 200) : "")}`.trim());
  }
  let map;
  try { map = JSON.parse(r.stdout); } catch (e) { throw new Error(`cropTilesPy: bad cropper stdout: ${r.stdout.slice(0, 120)}`); }
  return new Map(Object.entries(map));
}

// ---- pure orchestrator -------------------------------------------------------------------------

/**
 * Tile a page, OCR each tile, merge. Pure over injectable deps.
 * @param {{pngPath:string, tileOpts?:object, models?:string[], partClass?:string, wireEdm?:boolean,
 *          assumeUnits?:string, workDir?:string, baseline?:boolean, ensembleOpts?:object}} opts
 *   NB: with the REAL runEnsemble, `models` is effectively required -- an empty list makes every tile
 *   fail (models_ok=0) and tilesOcrOk=0. The CLI injects a default model; a programmatic caller must pass one.
 * @param {{readImageSize?:Function, cropTiles?:Function, runEnsemble?:Function}} [deps]
 * @returns {Promise<{page:{width:number,height:number}, grid:object, perTile:Array, merged:object,
 *            baseline:(object|null), lift:(object|null), tilesOcrOk:number, tilesOcrFailed:number}>}
 */
export async function extractWithTiling(opts, deps = {}) {
  if (!opts || typeof opts.pngPath !== "string" || !opts.pngPath) throw new Error("extractWithTiling: pngPath required");
  const readImageSize = deps.readImageSize || readPngSize;
  const cropTiles = deps.cropTiles || cropTilesPy;
  const runEnsemble = deps.runEnsemble || runEnsembleOverImage;
  const models = Array.isArray(opts.models) && opts.models.length ? opts.models : [];

  const { width, height } = await readImageSize(opts.pngPath);
  const grid = computeTileGrid(width, height, opts.tileOpts || {});
  const workDir = opts.workDir || join(tmpdir(), `prism-tiling-${pid}-${grid.tiles.length}`);
  const cropMap = await cropTiles(opts.pngPath, grid.tiles, workDir);

  const ensembleCommon = {
    models, partClass: opts.partClass, wireEdm: opts.wireEdm, assumeUnits: opts.assumeUnits,
    workDir, ...(opts.ensembleOpts || {}),
  };
  // For TILES the global units are AUTHORITATIVE: tiling strips the title block from most tiles, so a
  // per-tile VLM unit guess (".94" -> mm) is unreliable and produces wrong-scale values. Force the explicit
  // forceUnits, else the assumed units, onto every tile. The full-page BASELINE keeps the title block, so it
  // is NOT forced (assumeUnits stays a fallback there). Fixes the dia .94 = 0.940mm-vs-23.876mm caveat.
  const tileForceUnits = opts.forceUnits || opts.assumeUnits || undefined;
  const tileEnsembleCommon = tileForceUnits ? { ...ensembleCommon, forceUnits: tileForceUnits } : ensembleCommon;

  const perTile = [];
  let tilesOcrOk = 0;
  let tilesOcrFailed = 0;
  for (const tile of grid.tiles) {
    const tilePng = cropMap.get(tile.id);
    if (!tilePng) { tilesOcrFailed++; continue; } // a tile that could not be cropped is not a silent pass
    const res = await runEnsemble({ png: tilePng, ...tileEnsembleCommon });
    const dims = res && res.fused && Array.isArray(res.fused.dimensions) ? res.fused.dimensions : [];
    // R12 fail-loud: runEnsembleOverImage returns top-level error:null even when EVERY model failed
    // (models_ok=0, e.g. an "empty response" trap on a thinking-model). A tile is only OCR-ok when at
    // least one model actually produced an extraction. (Mocks omit models_ok -> treated ok if no error.)
    const okModels = res ? res.models_ok : undefined;
    const ok = !!res && !res.error && (typeof okModels === "number" ? okModels > 0 : true);
    if (ok) tilesOcrOk++; else tilesOcrFailed++;
    perTile.push({ tileId: tile.id, dimensions: dims });
  }
  const merged = mergeTiledDimensions(perTile, { tiles: grid.tiles });

  // Optional full-page baseline + lift -- the R15 numeric proof that tiling recovers dims a single pass missed.
  let baseline = null;
  let lift = null;
  if (opts.baseline) {
    const bres = await runEnsemble({ png: opts.pngPath, ...ensembleCommon });
    const bdims = bres && bres.fused && Array.isArray(bres.fused.dimensions) ? bres.fused.dimensions : [];
    // R12 PARITY with the tile loop: the baseline OCR can ALSO hit the models_ok=0 "empty response" trap
    // and return error:null with 0 dims. If we don't detect that, computeLift reports newInTiled = ALL
    // tiled dims -- a FABRICATED recall-lift headline against a baseline that never actually ran.
    const bOkModels = bres ? bres.models_ok : undefined;
    const baselineOk = !!bres && !bres.error && (typeof bOkModels === "number" ? bOkModels > 0 : true);
    baseline = {
      dimensions: bdims, count: bdims.length, ok: baselineOk,
      error: (bres && bres.error) || (baselineOk ? null : "baseline OCR failed: models_ok=0 (no model produced an extraction)"),
    };
    lift = computeLift(bdims, merged.dimensions, opts.tileOpts);
    // when the baseline did not actually run, newInTiled is NOT a valid lift number -- flag it loudly.
    lift.baselineFailed = !baselineOk;
  }

  return { page: { width, height }, grid, perTile, merged, baseline, lift, tilesOcrOk, tilesOcrFailed };
}

/**
 * Pure: compare the baseline (full-page) dim set against the tiled+merged set. A dim is "matched" when a
 * same-type dim with a numeric value within tol (or an identical raw_text for value-less callouts) exists
 * in the other set. Reports how many tiled dims are NEW vs the baseline (the recall lift) and vice-versa.
 */
export function computeLift(baselineDims, tiledDims, tileOpts) {
  // NB: a deliberately COARSER bucket (0.05mm) than the merge's 0.01mm, and keyed on type+value only (no
  // raw) -- this is a reporting comparison (did tiling find a similar dim?), not the merge's identity key.
  const tolMm = tileOpts && Number.isFinite(tileOpts.valueTolMm) ? tileOpts.valueTolMm : 0.05;
  const key = (d) => {
    const t = String((d && (d.type ?? d.kind)) || "").toUpperCase();
    const mm = dimValueMm(d); // shape-tolerant: extractDimension nominal_mm OR fused value_mm
    const raw = dimRawText(d).toUpperCase().replace(/\s+/g, " ").trim();
    return mm != null ? `${t}|mm:${Math.round(mm / tolMm)}` : `${t}|raw:${raw}`;
  };
  const bSet = new Set((baselineDims || []).map(key));
  const tSet = new Set((tiledDims || []).map(key));
  let newInTiled = 0, sharedCount = 0, onlyInBaseline = 0;
  for (const k of tSet) { if (bSet.has(k)) sharedCount++; else newInTiled++; }
  for (const k of bSet) { if (!tSet.has(k)) onlyInBaseline++; }
  return {
    baselineCount: (baselineDims || []).length,
    tiledCount: (tiledDims || []).length,
    distinctBaseline: bSet.size,
    distinctTiled: tSet.size,
    newInTiled,          // dims tiling found that the single full-page pass missed (the recall lift)
    sharedCount,
    onlyInBaseline,      // dims the baseline had that tiling dropped (should be ~0; a regression signal)
  };
}

// ---- CLI ----------------------------------------------------------------------------------------

function parseArgs(args) {
  const o = { rows: 2, cols: 2, overlap: 0.15, models: [], json: false, baseline: false, keep: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--image") o.image = args[++i];
    else if (a === "--rows") o.rows = Number(args[++i]);
    else if (a === "--cols") o.cols = Number(args[++i]);
    else if (a === "--overlap") o.overlap = Number(args[++i]);
    else if (a === "--models") o.models = String(args[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--model") o.models = [String(args[++i] || "").trim()].filter(Boolean);
    else if (a === "--part-class") o.partClass = args[++i];
    else if (a === "--wire-edm") o.wireEdm = true;
    else if (a === "--assume-units") o.assumeUnits = args[++i];
    else if (a === "--force-units") o.forceUnits = args[++i];
    else if (a === "--baseline") o.baseline = true;
    else if (a === "--json") o.json = true;
    else if (a === "--keep") o.keep = true;
    else if (a === "--out") o.out = args[++i];
  }
  return o;
}

async function main() {
  const o = parseArgs(argv.slice(2));
  if (!o.image || !existsSync(o.image)) { process.stderr.write("ERROR: --image <existing png> required\n"); return 3; }
  // one fast RELIABLE model by default: qwen3-vl:8b-instruct (the lib default). NOT the plain qwen3-vl:8b
  // thinking variant (empty-response trap) nor the 32b qwen (documented empty-output, backlog P0.1 REJECTED).
  if (!o.models.length) o.models = [env.PRISM_TILING_MODEL || "qwen3-vl:8b-instruct"];
  const workDir = join(tmpdir(), `prism-tiling-${pid}`);
  let result;
  try {
    result = await extractWithTiling({
      pngPath: o.image, tileOpts: { rows: o.rows, cols: o.cols, overlapFrac: o.overlap },
      models: o.models, partClass: o.partClass, wireEdm: o.wireEdm, assumeUnits: o.assumeUnits,
      forceUnits: o.forceUnits, workDir, baseline: o.baseline,
    });
  } catch (e) {
    process.stderr.write(`ERROR: ${e instanceof Error ? e.message : String(e)}\n`);
    return 3;
  } finally {
    if (!o.keep) { try { rmSync(workDir, { recursive: true, force: true }); } catch { /* best-effort */ } }
  }

  if (o.out) { try { mkdirSync(dirname(o.out), { recursive: true }); writeFileSync(o.out, JSON.stringify(result, null, 2)); } catch (e) { process.stderr.write(`report write failed: ${e}\n`); } }

  if (o.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    const m = result.merged.stats;
    process.stdout.write(`page ${result.page.width}x${result.page.height} | ${result.grid.tiles.length} tiles (${o.rows}x${o.cols} +${o.overlap} ovl) | OCR ok=${result.tilesOcrOk} fail=${result.tilesOcrFailed}\n`);
    process.stdout.write(`merged dims: ${m.mergedCount} (raw ${m.rawCount}, collapsed ${m.collapsed}, max tile-agreement ${m.maxTileAgreement})\n`);
    if (result.lift) {
      const L = result.lift;
      if (L.baselineFailed) {
        process.stdout.write(`vs baseline: BASELINE OCR FAILED (${result.baseline.error}) -- lift number is NOT valid evidence (newInTiled would be inflated)\n`);
      } else {
        process.stdout.write(`vs baseline: tiled=${L.tiledCount} baseline=${L.baselineCount} | NEW-in-tiled=${L.newInTiled} shared=${L.sharedCount} only-in-baseline=${L.onlyInBaseline}\n`);
      }
    }
  }
  return result.tilesOcrOk > 0 ? 0 : 2;
}

// run only as CLI (robust cross-platform main-module check: resolve both sides to a real path)
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().then((code) => exit(code)).catch((e) => { process.stderr.write(String(e && e.stack ? e.stack : e) + "\n"); exit(3); });
}
