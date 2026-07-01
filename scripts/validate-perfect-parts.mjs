#!/usr/bin/env node
// scripts/validate-perfect-parts.mjs
//
// U-XRAY-PERFECT-PARTS-TRUETEST — the TRUE end-to-end test of the OCR/blueprint-reading system on the
// 91 perfect parts (print + CAD + CNC program) BEFORE scaling to the full corpus. For each part: OCR
// the blueprint → extract dims (mm), parse the matching CNC program → objective machined-dim GT, and
// score recall (did the OCR read what the part is actually cut to?) + precision (are the OCR dims
// real?). The program is the answer key — no synthetic GT, no operator labeling needed (R9/R12).
//
// SOURCE: state/shared/ocr-training-loop/perfect-print-cad-program-parts.json (the 91 parts, R8 — from
// juliett's join, not re-OCR). The join stores filenames; this resolver globs the PN stem to find the
// real print (Docustrata) + program (JM DIE) on disk. RESUMABLE: per-part append to a results jsonl +
// a processed-cursor (reaper-survivable, like the corpus loop — the host reaps long node under load).
//
// USAGE:
//   node scripts/validate-perfect-parts.mjs [--parts <json>] [--out-dir <dir>] [--limit N]
//        [--models a,b] [--rel-tol 0.02] [--neutral-step-only] [--cad-triangulate [--reconcile]] [--fresh] [--json]
// EXIT: 0 ok · 2 nothing scored · 3 inputs missing.

import { existsSync, mkdirSync, writeFileSync, appendFileSync, readFileSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { argv, exit, env } from "node:process";

import { runEnsembleOverImage } from "./lib/vision-ensemble-fuse.mjs";
import { resolvePageTitleBlockUnit, pageForceUnit } from "./lib/ollama-vision-extract-lib.mjs";
import { extractWithTiling } from "./vision-tiling-extract.mjs";
import { extractWithRegionRouting, classifyRegionPageDrop } from "./region-classify.mjs";
import { dimToMm } from "./lib/dimension-set-score.mjs";
import { extractProgramGT, extractMillProgramGT, scorePartAgainstProgram, isParsableNcText, programGtAgreementSamples } from "./lib/cnc-program-gt-lib.mjs";
import { printCursorKey, parseCursorDoneSet, partitionByResumeCursor } from "./lib/ocr-training-loop-lib.mjs";
import { appendCalibrationStore } from "./lib/calibration-sample-store.mjs";
import { extractCadGT, triangulateGT } from "./lib/cad-dimension-gt-lib.mjs";
import { buildPartCandidates } from "./lib/reconcile-candidate-adapters.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PYTHON = env.PRISM_PYTHON || "H:/Tools/python/python.exe";
const PDF_TO_PNG = join(REPO_ROOT, "scripts", "lib", "pdf-to-png.py");
const OLLAMA_URL = env.OLLAMA_URL || "http://127.0.0.1:11434";
const DEFAULT_PARTS = join(REPO_ROOT, "state", "shared", "ocr-training-loop", "perfect-print-cad-program-parts.json");
const DEFAULT_OUT = join(REPO_ROOT, "state", "shared", "ocr-training-loop", "truetest");
const DOCUSTRATA = "H:/PRISM/Docustrata";
const JM_DIE = "H:/PRISM/JM DIE";
const MODELS = ["qwen3-vl:8b-instruct", "qwen2.5vl:7b"]; // the 2 live-reliable VLMs (others fail dense dims)
const RECALL_PASS = 0.5; // a part "passes" the true-test if the OCR corroborates >=50% of the machined GT dims

/** The join stores a print's DISPLAY filename (e.g. "Scanned Document - 12/1/2020 7:22 AM.pdf") which
 * contains `/` and `:` — characters Windows forbids in filenames, so the file on disk has them
 * sanitized to `_` ("Scanned Document - 12_1_2020 7_22 AM.pdf"). Mirror that sanitization before the
 * glob, else 3-of-6 prints silently never resolve (the real resolver bug the true-test surfaced). */
function diskFilename(displayName) {
  return String(displayName || "").replace(/[\/:*?"<>|]/g, "_");
}

/** Locate ONE file on H: matching a filename, under root. Returns absolute path or null. Uses the fast
 * -Filter glob (the corpus lives on a Windows volume; node glob over 257K files is slow). Sanitizes
 * the display filename to its on-disk form first (so "…7:22 AM.pdf" matches the stored "…7_22 AM.pdf").
 * -Filter treats `[` `]` as wildcards — escape them; the sanitized name has no other glob-specials. */
function findOne(displayFilename, root) {
  const disk = diskFilename(displayFilename).replace(/[`"]/g, "");
  const r = spawnSync("powershell", ["-NoProfile", "-Command",
    `Get-ChildItem -Path "${root}" -Recurse -Filter "${disk}" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName`],
    { encoding: "utf8", timeout: 120000, windowsHide: true });
  const out = String(r.stdout || "").trim().split(/\r?\n/)[0];
  return out && existsSync(out) ? out : null;
}

/** Resolve a part's neutral STEP file (.stp/.step) on disk. The corpus records has_neutral_step but NOT
 *  the STEP filename (sample_cad is usually the .ipt), so resolve the sample CAD's folder and glob it for
 *  a STEP sibling. Returns abs path or null. IGES (.igs/.iges) is intentionally NOT returned -- the
 *  cad-dimension-gt-lib parses STEP entity syntax only (CYLINDRICAL_SURFACE/CIRCLE/CARTESIAN_POINT). */
function findStepForPart(part, root) {
  const cad = part.sample_cad ? findOne(part.sample_cad, root) : null;
  if (!cad) return null;
  const dir = dirname(cad).replace(/[`"]/g, ""); // strip PS-breaking chars (mirror findOne)
  const r = spawnSync("powershell", ["-NoProfile", "-Command",
    `Get-ChildItem -Path "${dir}\\*" -Include *.stp,*.step -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName`],
    { encoding: "utf8", timeout: 60000, windowsHide: true });
  const out = String(r.stdout || "").trim().split(/\r?\n/)[0];
  return out && existsSync(out) ? out : null;
}

const MAX_PRINT_PAGES = 12;
/**
 * Rasterize ALL pages of a print PDF → [{page, png}] (cap MAX_PRINT_PAGES). The "perfect-parts prints
 * are single drawings" assumption was FALSE (verified 2026-06-19): Docustrata bundles are commonly
 * multi-page (a table/cover/routing page + the actual DRAWING on a LATER page), so page-0-only OCR read
 * the cover and silently MISSED the drawing → false recall=0 (e.g. "Scanned Document - 11_18_2020":
 * page 0 = table, page 2 = drawing with 14 dims). Mirrors the grinder's rasterizePrintPages multi-page
 * discipline. A per-page render failure is skipped (the rest still OCR); only ZERO pages → []. */
function rasterAllPages(pdfPath, workDir, enhance) {
  const stem = printCursorKey(pdfPath) || "p";
  const cnt = spawnSync(PYTHON, [PDF_TO_PNG, pdfPath, "--count"], { encoding: "utf8", timeout: 30000, windowsHide: true });
  let total = parseInt(String(cnt.stdout || "").trim(), 10);
  if (!Number.isFinite(total) || total < 1) total = 1;
  const pages = [];
  for (let pg = 0; pg < Math.min(total, MAX_PRINT_PAGES); pg++) {
    const outPng = join(workDir, `${stem}__p${pg}.png`);
    // --enhance: scan cleanup (Otsu binarize + connected-component despeckle + small-angle deskew) for
    // legibility-limited scanned drawings -- the MEASURED 05850 recall bottleneck (recall pinned at 3/7
    // across the num_predict + reading-guidance + region-route levers; the 4 misses are scan legibility,
    // NOT budget/prompt -- see [[reference_xray_gt_validation_05850_2026_06_23]]). pdf-to-png.py degrades
    // to grayscale-only LOUD if cv2/numpy absent (never a silent skip). OFF -> byte-identical raster args.
    const pageArgs = [PDF_TO_PNG, pdfPath, outPng, "--dpi", "300", "--page", String(pg), "--grayscale"];
    if (enhance) pageArgs.push("--preprocess", "--deskew");
    const r = spawnSync(PYTHON, pageArgs, { encoding: "utf8", timeout: 120000, windowsHide: true });
    if (r.status === 0 && existsSync(outPng)) pages.push({ page: pg, png: outPng });
  }
  return pages;
}

function parseArgs(args) {
  const get = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
  const has = (f) => args.includes(f);
  const num = (f, d) => { const v = Number(get(f, d)); return Number.isFinite(v) ? v : d; };
  return {
    parts: get("--parts", DEFAULT_PARTS),
    outDir: get("--out-dir", DEFAULT_OUT),
    axis: String(get("--axis", "all")).toLowerCase(), // all | mill | lathe -- skip (no OCR) off-axis parts
    limit: num("--limit", 0),
    models: get("--models", null),
    relTol: num("--rel-tol", 0.02),
    neutralStepOnly: has("--neutral-step-only"),
    // GPU-free CAD<->program cross-source GT triangulation over neutral-STEP parts. Bounded payoff
    // (~11 of 91 parts have a neutral STEP; the rest are .ipt/Parasolid binary -- see
    // [[reference_xray_perfect_parts_gt_source_2026_06_22]]); this is the cross-source DETERMINATION
    // pass (the reconcile-engine's "(b) cad adapter" applied), NOT an OCR-recall-corpus expansion.
    cadTriangulate: has("--cad-triangulate"),
    // with --cad-triangulate: also CALL the consensus engine (CrossSourceDimensionReconciliationEngine
    // via dist) on each part's reconcile-ready candidates -> a live cross-source consensus per real part.
    // GPU-free; lazy-loads the engine only when set; requires a built mcp-server/dist.
    reconcile: has("--reconcile"),
    fresh: has("--fresh"),
    json: has("--json"),
    // --tile: route each page through P0.2 region tiling (split into overlapping tiles, OCR each, merge)
    // instead of one full-page pass -- the dense-page recall lever, measured here against the program GT.
    tile: has("--tile"),
    tileRows: num("--tile-rows", 2),
    tileCols: num("--tile-cols", 2),
    tileOverlap: num("--tile-overlap", 0.15),
    // --region-route: P1.5 layout-aware region routing (segment -> route -> crop -> OCR each -> UNION
    // with the full-page floor). Parallel measurement path to --tile; if BOTH are passed --tile wins
    // (the branch order below). --region-min-conf tunes the segmentation trust floor (default lib 0.7).
    regionRoute: has("--region-route"),
    regionMinConf: has("--region-min-conf") ? num("--region-min-conf", 0.7) : undefined,
    // --reading-guidance: opt-in (default OFF). Inject the curated tribal+ASME-Y14.5 reading-guidance block
    // (U-XRAY-READING-KNOWLEDGE) into every VLM prompt for this run, so a with/without GT comparison on the
    // recall harness can decide whether the knowledge channel lifts recall (esp. on the region-route crop
    // path, which avoids the num_predict truncation that confounds the full-page comparison). OFF ->
    // injectReadingGuidance:false -> byte-identical prompt.
    readingGuidance: has("--reading-guidance"),
    // --enhance: opt-in (default OFF). Pre-clean each scanned page (pdf-to-png --preprocess --deskew:
    // Otsu binarize + despeckle + small-angle deskew) before OCR. The MEASURED next recall lever on
    // legibility-limited scanned drawings (05850 recall was pinned at 3/7 across budget/prompt/region
    // levers -- the misses are scan legibility, not extraction budget). OFF -> byte-identical raster.
    enhance: has("--enhance"),
    // --emit-calibration: opt-in (default OFF). Harvest REAL program-GT {f,correct} calibration samples
    // (source:"program-gt") from each SCORED part into the durable calibration-sample-store, so the
    // closed-loop calibration is grounded in real machined dims, not only synthetic prints
    // (U-XRAY-PROGRAM-GT-CALIB). Piggybacks on the OCR this validation already runs -- no extra GPU, no
    // new GT source (only the gtReliable-gated, posted-program parts the recall scorer already trusts).
    // Plain full-page branch only (it reliably carries the per-dim agreement metadata). OFF -> no
    // collection, no I/O -> byte-identical to before.
    emitCalibration: has("--emit-calibration"),
    calibrationStore: get("--calibration-store", join(REPO_ROOT, "state", "shared", "ocr-training-loop", "calibration-samples.jsonl")),
  };
}

async function main() {
  const opts = parseArgs(argv.slice(2));
  if (!existsSync(opts.parts)) { console.error(`ERROR: perfect-parts json not found: ${opts.parts}`); return 3; }
  mkdirSync(opts.outDir, { recursive: true });
  const models = opts.models ? opts.models.split(/[,\s]+/).filter(Boolean) : MODELS;

  const doc = JSON.parse(readFileSync(opts.parts, "utf8"));
  let parts = (doc.parts || []).filter((p) => p && p.sample_print && p.sample_nc);
  if (opts.neutralStepOnly) parts = parts.filter((p) => p.has_neutral_step);
  parts.sort((a, b) => Number(b.has_neutral_step) - Number(a.has_neutral_step) || (b.customer_corroborated_n || 0) - (a.customer_corroborated_n || 0));
  if (opts.limit > 0) parts = parts.slice(0, opts.limit);

  // --cad-triangulate: GPU-free cross-source GT DETERMINATION pass. For each neutral-STEP part, derive
  // CAD-model dim GT (cad-dimension-gt-lib) + the posted-program GT (where present) and triangulate the
  // two into the corroborated (high-confidence) dim set. This is the reconcile-engine's "(b) cad adapter"
  // applied as a measurement -- it establishes which dims BOTH the CAD model and the program agree on,
  // the strongest GT derivable without an operator label. Bounded to the ~11 neutral-STEP parts (the
  // .ipt/Parasolid majority is unreadable -- [[reference_xray_perfect_parts_gt_source_2026_06_22]]);
  // does NOT OCR or touch the recall corpus. Returns early (no OCR loop).
  if (opts.cadTriangulate) {
    const neutral = parts.filter((p) => p.has_neutral_step);
    console.log(`\n🔺 CAD<->program triangulation (GPU-free, no OCR) -- ${neutral.length} neutral-STEP part(s)`);
    const tagg = { neutral: neutral.length, cadReliable: 0, programReliable: 0, both: 0, stepUnresolved: 0, cadUnreliable: 0, totalCorroborated: 0 };
    // --reconcile: lazy-load the consensus engine from dist ONCE (only when opted in). The .mjs runner
    // cannot import the .ts engine directly, so it consumes the built dist; fail LOUD if absent (R12).
    let reconcileEngine = null;
    if (opts.reconcile) {
      const distEngine = join(REPO_ROOT, "mcp-server", "dist", "engines", "CrossSourceDimensionReconciliationEngine.js");
      if (!existsSync(distEngine)) { console.error(`ERROR: --reconcile needs a built engine at ${distEngine} -- run 'npm run build' in mcp-server first.`); return 3; }
      try {
        const mod = await import(pathToFileURL(distEngine).href);
        reconcileEngine = mod.crossSourceDimensionReconciliationEngine || (mod.CrossSourceDimensionReconciliationEngine ? new mod.CrossSourceDimensionReconciliationEngine() : null);
      } catch (e) { console.error(`ERROR: --reconcile could not load the engine: ${e instanceof Error ? e.message : String(e)}`); return 3; }
      if (!reconcileEngine || typeof reconcileEngine.reconcile !== "function") { console.error("ERROR: --reconcile loaded the engine module but found no reconcile()."); return 3; }
    }
    const rows = [];
    for (const part of neutral) {
      const row = { part_number: part.part_number };
      try {
        const stepPath = findStepForPart(part, JM_DIE);
        if (!stepPath) { row.skip = "step-unresolved"; tagg.stepUnresolved++; rows.push(row); continue; }
        const cadGT = extractCadGT(readFileSync(stepPath, "utf8"));
        row.step = stepPath; row.cad_unit = cadGT.unit; row.cad_class = cadGT.cadGtClass; row.cad_callout_dims = cadGT.calloutDimsMm.length;
        if (!cadGT.gtReliable) { row.skip = "cad-unreliable"; tagg.cadUnreliable++; rows.push(row); continue; }
        tagg.cadReliable++;
        // posted-program GT (best-effort; many neutral-STEP parts are program_not_nc / contour -> null)
        let programGT = null;
        const progPath = part.sample_nc ? findOne(part.sample_nc, JM_DIE) : null;
        if (progPath) {
          const ext = "." + progPath.split(".").pop().toLowerCase();
          const progText = readFileSync(progPath, "utf8");
          if (isParsableNcText(progText, { ext }).ok) {
            let gt = extractProgramGT(progText, { ext });
            if (gt.axis === "mill") gt = extractMillProgramGT(progText, { ext });
            if (gt.gtReliable) { programGT = gt; tagg.programReliable++; }
          }
        }
        const tri = triangulateGT({ programGT, cadGT }, { relTol: opts.relTol });
        if (programGT) tagg.both++;
        tagg.totalCorroborated += tri.nCorroborated;
        row.triangulation = { confidence: tri.confidence, nCorroborated: tri.nCorroborated, nProgram: tri.nProgram, nCad: tri.nCad, corroboratedMm: tri.corroboratedMm.slice(0, 12) };
        // reconcile-ready DimCandidate[] (cad + cnc sources; print added on the OCR path) for
        // CrossSourceDimensionReconciliationEngine (prism_cad:cad_dimension_reconcile). Emitting these
        // makes cadGtToCandidates a live consumer (no longer orphan) + provides the consensus input.
        row.candidates = buildPartCandidates({ cadGT, programGT });
        tagg.totalCandidates = (tagg.totalCandidates || 0) + row.candidates.length;
        // --reconcile: run the live consensus engine on this real part's candidates -> consensus dims +
        // conflicts. This is the cross-source DETERMINATION ("use prints + CAD + programs to determine
        // dimensions") executed on a real JM part, not synthetic fixtures.
        if (reconcileEngine && row.candidates.length) {
          const rep = reconcileEngine.reconcile(row.candidates, { pct: opts.relTol * 100 });
          row.consensus = {
            total: rep.coverage.total, confirmed: rep.coverage.confirmed,
            single_source: rep.coverage.single_source, presence_only: rep.coverage.presence_only,
            conflicts: rep.conflicts.length,
            dims: rep.dimensions.slice(0, 16).map((d) => ({ value_mm: d.value_mm, type: d.type, status: d.status, confidence: d.confidence, sources: d.sources })),
          };
          tagg.totalConfirmed = (tagg.totalConfirmed || 0) + rep.coverage.confirmed;
          tagg.totalConsensusDims = (tagg.totalConsensusDims || 0) + rep.coverage.total;
        }
        const consensusStr = row.consensus ? ` | consensus dims=${row.consensus.total} confirmed=${row.consensus.confirmed} conflicts=${row.consensus.conflicts}` : "";
        console.log(`  ${String(part.part_number).padEnd(20)} cad=${tri.nCad} prog=${tri.nProgram} corroborated=${tri.nCorroborated} conf=${tri.confidence}${consensusStr}`);
      } catch (e) { row.error = e instanceof Error ? e.message : String(e); }
      rows.push(row);
    }
    const triReport = { schemaVersion: "1.0.0", mode: "cad-program-triangulate", ...tagg, rel_tol: opts.relTol, rows,
      note: "Cross-source GT determination: CAD-model dim GT (STEP cylindrical-feature diameters + envelope, cad-dimension-gt-lib) triangulated with posted-program GT. corroborated = dims BOTH sources carry within rel_tol (high-confidence, no operator label). Bounded to neutral-STEP parts; CAD-GT alone is lower-confidence than program GT (a STEP carries fillet/cosmetic features a print never dimensions -- filtered to callout-class, but still noisier). NOT an OCR-recall measurement." };
    writeFileSync(join(opts.outDir, "cad-triangulation-report.json"), JSON.stringify(triReport, null, 2));
    const consensusSummary = opts.reconcile ? ` · consensus dims ${tagg.totalConsensusDims || 0} (confirmed ${tagg.totalConfirmed || 0})` : "";
    console.log(`\n  SUMMARY -- cadReliable ${tagg.cadReliable} · programReliable ${tagg.programReliable} · both ${tagg.both} · corroborated dims ${tagg.totalCorroborated} · reconcile candidates ${tagg.totalCandidates || 0}${consensusSummary}`);
    console.log(`    -> ${join(opts.outDir, "cad-triangulation-report.json")}`);
    if (opts.json) console.log(JSON.stringify(triReport));
    return 0;
  }

  const resultsPath = join(opts.outDir, "truetest-results.jsonl");
  const cursorPath = join(opts.outDir, "processed-cursor.jsonl");
  if (opts.fresh) for (const p of [resultsPath, cursorPath]) { try { writeFileSync(p, ""); } catch { /* best-effort */ } }
  let done = new Set();
  if (!opts.fresh && existsSync(cursorPath)) { try { done = parseCursorDoneSet(readFileSync(cursorPath, "utf8")); } catch { /* ignore */ } }
  const partKeys = parts.map((p) => p.part_number);
  const { todo: todoKeys } = partitionByResumeCursor(partKeys, done);
  const todoSet = new Set(todoKeys);
  const todo = parts.filter((p) => todoSet.has(p.part_number));

  console.log(`\n🧪 TRUE-TEST — ${parts.length} perfect parts · ${todo.length} todo · ${parts.length - todo.length} resumed · models ${models.join(",")}`);
  const rasterDir = join(tmpdir(), `truetest-raster-${process.pid}`);
  mkdirSync(rasterDir, { recursive: true });

  const agg = { scored: 0, passed: 0, print_unresolved: 0, prog_unresolved: 0, prog_not_nc: 0, prog_non_lathe: 0, prog_contour_gt: 0, prog_mill_no_gt: 0, axis_filtered: 0, raster_failed: 0, ocr_failed: 0, sumRecall: 0, sumPrecision: 0 };
  for (const part of todo) {
    const pn = part.part_number;
    const key = printCursorKey(pn);
    const rec = { part_number: pn, customers: part.customers };
    try {
      // 1. resolve the print (Docustrata) + program (JM DIE) on disk
      // NOTE: do NOT basename() first — the display filename can contain "/" (e.g. a scan date
      // "12/1/2020"), which basename() would split on, mangling the name. findOne sanitizes "/" → "_"
      // (the on-disk form) itself; the join stores a bare filename, not a path, so basename is unneeded.
      const printPath = findOne(part.sample_print, DOCUSTRATA);
      const progPath = findOne(part.sample_nc, JM_DIE);
      if (!printPath) { rec.skip = "print-unresolved"; agg.print_unresolved++; }
      else if (!progPath) { rec.skip = "program-unresolved"; agg.prog_unresolved++; }
      else {
        const ext = "." + progPath.split(".").pop().toLowerCase();
        const progText = readFileSync(progPath, "utf8");
        // 2. GUARD: only POSTED G-code text — reject binary CAM sources (.mcx-8 etc) that would scrape
        //    fake coordinates from binary noise (scrutiny P0-1). Then require LATHE axis (X=diameter);
        //    a mill/unknown program's X is not a diameter, so its GT can't validate a turned part.
        const parseable = isParsableNcText(progText, { ext });
        if (!parseable.ok) { rec.skip = "program-not-nc"; rec.skip_detail = parseable.reason; agg.prog_not_nc++; }
        else {
          let gt = extractProgramGT(progText, { ext });
          // MILL parts: the lathe extractor only flags axis=mill (X is a POSITION, not a diameter). Route
          // them to the MILL ground-truth (hole/bore feature diameters from tool comments + full-circle
          // G2/G3 arcs) so the closed-loop measurement covers mill prints, not lathe-only -- the largest
          // previously-invisible corpus segment (U-XRAY-MILL-PROGRAM-GT).
          if (gt.axis === "mill") gt = extractMillProgramGT(progText, { ext });
          // --axis filter: skip an off-axis part BEFORE the expensive OCR (e.g. --axis mill isolates the
          // mill subset so a bounded run measures the mill-GT recall lift without OCRing every lathe part).
          if (opts.axis !== "all" && gt.axis !== opts.axis) { rec.skip = "axis-filtered"; rec.program_axis = gt.axis; agg.axis_filtered++; }
          else if (gt.axis !== "lathe" && gt.axis !== "mill") { rec.skip = "program-non-lathe"; rec.program_axis = gt.axis; agg.prog_non_lathe++; }
          // GT-RELIABILITY GATE (R12 honest metric): a CONTOUR/RADIUS/TAPER lathe part's program sweeps many
          // distinct diameters that the PRINT dimensions with a single R/angle; a MILL part with NO hole/bore
          // feature has no callout GT at all. Either way the program set is NOT a callout answer-key, so
          // scoring OCR against it conflates a metric artifact with a real miss -- skip it (BEFORE the
          // expensive OCR -- saves GPU too), recording the classification for transparency/audit, exactly
          // like program-not-nc / program-non-lathe. Knob: --gt-contour-tol (lathe only).
          else if (!gt.gtReliable) {
            rec.skip = gt.gtClass === "mill-no-features" ? "program-mill-no-gt" : "program-contour-gt";
            rec.gt_class = gt.gtClass; rec.contour_fraction = gt.contourFraction;
            rec.feature_diameters_in = gt.featureDiametersIn; rec.move_profile = gt.moveProfile;
            if (gt.gtClass === "mill-no-features") agg.prog_mill_no_gt++; else agg.prog_contour_gt++;
          }
          else {
            // 3. OCR the print -- ALL pages, UNION the dims. Multi-page bundles (cover/table page +
            //    the drawing on a LATER page) were silently read page-0-only -> the drawing was missed
            //    -> false recall=0 (verified 2026-06-19). Mirrors the grinder's multi-page discipline.
            //    Sequential (not Promise.all) on purpose: Ollama serializes per-model + must not hammer
            //    the GPU concurrently with the live corpus grinder.
            const pages = rasterAllPages(printPath, rasterDir, opts.enhance);
            if (!pages.length) { rec.skip = "raster-failed"; agg.raster_failed++; }
            else {
              const allDimsMm = []; let anyOk = false; let modelsOkMax = 0; let pagesOcrd = 0;
              // U-XRAY-PROGRAM-GT-CALIB: per-part fused dims (with agreement metadata) for real-GT
              // calibration emission. Populated ONLY when --emit-calibration AND only by the plain branch.
              const allFusedDims = [];
              // P1.5 region-route per-page floor/region/attribution breakdown -- recorded onto rec so a
              // multi-seed GPU run can attribute every page drop (merge/unit vs floor-failure vs blank
              // vs variance). Empty unless --region-route. let pageNo track the 1-based page index.
              const pageDiags = []; let pageNo = 0;
              // Per-print unit anchor (clone of the training-loop fix): pages 2+ lose the title block, so
              // detect the print's unit from the first OCR'd page that declares one and force it on later
              // pages -- inch AND metric, so recall is scored on correctly-scaled mm dims. PRISM_OCR_PER_
              // PRINT_UNIT_DISABLE=1 reverts. printUnit RESETS per print. (Non-tiling branch only; the
              // tiling branch already forces assumeUnits onto tiles -- scoped follow-up.)
              let printUnit = null;
              const autoUnit = env.PRISM_OCR_PER_PRINT_UNIT_DISABLE !== "1";
              for (const { png } of pages) {
                pageNo++;
                let pageDims, pageOk, pageModelsOk;
                if (opts.tile) {
                  // P0.2 tiling: crop the page into overlapping tiles, OCR each, merge. assumeUnits is forced
                  // onto tiles (they lose the title block). Dims come from the merged fused set (value_mm).
                  const t = await extractWithTiling({
                    pngPath: png, models, assumeUnits: "in", workDir: rasterDir,
                    tileOpts: { rows: opts.tileRows, cols: opts.tileCols, overlapFrac: opts.tileOverlap },
                    ensembleOpts: { ollamaUrl: OLLAMA_URL, maxTimeSec: 120 },
                  });
                  pageOk = t.tilesOcrOk > 0; pageModelsOk = t.tilesOcrOk;
                  pageDims = (t.merged.dimensions || []).map((d) => d.value_mm).filter((v) => Number.isFinite(v) && v > 0);
                } else if (opts.regionRoute) {
                  // P1.5 region routing: segment -> route -> crop each region -> OCR -> UNION with a
                  // full-page floor (recall-first). assumeUnits forced onto regions (they lose the title
                  // block, like tiles); the full-page floor keeps it. Dims from the merged union (value_mm).
                  const rr = await extractWithRegionRouting({
                    pngPath: png, models, assumeUnits: "in", workDir: rasterDir,
                    minConfidence: opts.regionMinConf,
                    // injectReadingGuidance flows through ensembleCommon -> the full-page floor AND every
                    // region crop (region-classify.mjs:172,196,207), so the reading block reaches all VLM
                    // calls on this path. Default off -> byte-identical.
                    ensembleOpts: { ollamaUrl: OLLAMA_URL, maxTimeSec: 120, injectReadingGuidance: opts.readingGuidance },
                  });
                  pageOk = rr.fullPage.ok || rr.regionsOcrOk > 0; pageModelsOk = Math.max(rr.regionsOcrOk, rr.fullPage.ok ? 1 : 0);
                  pageDims = (rr.dimensions || []).map((d) => d.value_mm).filter((v) => Number.isFinite(v) && v > 0);
                  // capture WHY this page dropped (or did not) so a multi-seed run is conclusive (R12).
                  const floorOk = rr.fullPage ? rr.fullPage.ok === true : false;
                  const floorDimsRaw = (rr.fullPage && Array.isArray(rr.fullPage.dimensions)) ? rr.fullPage.dimensions.length : 0;
                  // count the floor's SCOREABLE dims with the SAME finite-positive value_mm predicate the union
                  // uses (pageDims), so "merge_or_unit_dropped" fires only when a scoreable floor dim genuinely
                  // failed to survive the merge/unit step -- not when the floor's reads were non-positive (scrutiny P2).
                  const floorScoreable = (rr.fullPage && Array.isArray(rr.fullPage.dimensions))
                    ? rr.fullPage.dimensions.filter((d) => d && Number.isFinite(d.value_mm) && d.value_mm > 0).length : 0;
                  pageDiags.push({
                    page: pageNo, route: rr.route, floor_ok: floorOk,
                    floor_dims: floorDimsRaw, floor_scoreable: floorScoreable, union_scoreable: pageDims.length,
                    regions_ok: rr.regionsOcrOk, regions_failed: rr.regionsOcrFailed,
                    // merge clique stats (collapsed = rawCount-mergedCount) make a "merge_or_unit_dropped"
                    // verdict resolvable WITHOUT a re-run: collapsed>0 confirms the merge clique-representative
                    // selection dropped the floor's scoreable dims. null when the page declined to full_page (no merge).
                    merge_stats: rr.merged && rr.merged.stats ? rr.merged.stats : null,
                    attribution: classifyRegionPageDrop({ floorOk, floorDimCount: floorScoreable, unionScoreableCount: pageDims.length, regionsOcrOk: rr.regionsOcrOk }),
                  });
                } else {
                  const res = await runEnsembleOverImage({ png, models, assumeUnits: "in", forceUnits: pageForceUnit(null, printUnit), ollamaUrl: OLLAMA_URL, maxTimeSec: 120, injectReadingGuidance: opts.readingGuidance });
                  pageOk = res.models_ok > 0; pageModelsOk = res.models_ok;
                  pageDims = pageOk ? (res.fused.dimensions || []).map((d) => d.value_mm).filter((v) => Number.isFinite(v) && v > 0) : [];
                  // anchor the print unit from the first page that declares a confident title block
                  if (pageOk && autoUnit && !printUnit) { const det = resolvePageTitleBlockUnit(res.per_model_runs); if (det) printUnit = det; }
                  // collect fused dims (value_mm + agreement) for real-GT calibration emission. Resolve
                  // each dim's n_models (per-dim, else the page run-level), mirroring buildTrainsetRow.
                  if (opts.emitCalibration && pageOk) {
                    const pnm = res.fused.summary && Number.isFinite(res.fused.summary.n_models) ? res.fused.summary.n_models : pageModelsOk;
                    for (const d of (res.fused.dimensions || [])) {
                      if (d && Number.isFinite(d.value_mm) && d.value_mm > 0) {
                        allFusedDims.push({ value_mm: d.value_mm, corroboration: d.corroboration, n_models: Number.isFinite(d.n_models) && d.n_models > 0 ? d.n_models : pnm, type: d.type });
                      }
                    }
                  }
                }
                if (pageOk) {
                  anyOk = true; pagesOcrd++; modelsOkMax = Math.max(modelsOkMax, pageModelsOk);
                  for (const v of pageDims) allDimsMm.push(v);
                }
              }
              // region-route per-page attribution onto the record (present even on ocr-failed, so a drop
              // that fails the whole print is still attributable). Other branches do not expose the breakdown.
              if (opts.regionRoute && pageDiags.length) rec.region_page_diags = pageDiags;
              if (!anyOk) { rec.skip = "ocr-failed"; agg.ocr_failed++; }
              else {
                const ocrDimsMm = allDimsMm; // union across every page of the bundle
                const score = scorePartAgainstProgram(ocrDimsMm, gt, { relTol: opts.relTol });
                const pass = score.recall >= RECALL_PASS;
                Object.assign(rec, {
                  print: printPath, program: progPath, program_axis: gt.axis,
                  feature_diameters_in: gt.featureDiametersIn, program_length_in: gt.lengthIn,
                  toolpath_points: score.toolpathPoints, // context only -- NOT the recall denominator
                  ocr_dims_mm: ocrDimsMm.length, pages_total: pages.length, pages_ocrd: pagesOcrd, models_ok: modelsOkMax,
                  gt_class: gt.gtClass, contour_fraction: gt.contourFraction, // scored parts are stepped/insufficient (reliable)
                  recall: score.recall, precision: score.precision, callout_gt_count: score.gtCount, gt_matched: score.gtMatched,
                  matched_pairs: score.matchedPairs.slice(0, 8), pass,
                });
                agg.scored++; agg.sumRecall += score.recall; agg.sumPrecision += score.precision; if (pass) agg.passed++;
                console.log(`  ${pn.padEnd(18)} axis=${gt.axis} calloutGT=${score.gtCount}(toolpath ${score.toolpathPoints}) recall=${score.recall} prec=${score.precision} dims=${ocrDimsMm.length}(${pagesOcrd}/${pages.length}pp) ${pass ? "PASS" : "fail"}`);
                // U-XRAY-PROGRAM-GT-CALIB: harvest real program-GT {f,correct} samples from this scored
                // part (the program is already the trusted answer key here -- gtReliable-gated) into the
                // durable calibration store, so the closed-loop calibration learns from real machined dims.
                if (opts.emitCalibration && allFusedDims.length) {
                  const calSamples = programGtAgreementSamples(allFusedDims, gt, { relTol: opts.relTol });
                  if (calSamples.length) {
                    const wrote = appendCalibrationStore(opts.calibrationStore, calSamples, { source: "program-gt" });
                    rec.calibration_samples_emitted = calSamples.length;
                    rec.calibration_store_written = wrote;
                    // count only samples that actually PERSISTED (wrote = -1 on I/O failure) so the
                    // report's calibration_samples_emitted is not inflated by a failed append.
                    if (wrote > 0) agg.calibrationSamples = (agg.calibrationSamples || 0) + wrote;
                  }
                }
              }
            }
          }
        }
      }
    } catch (e) { rec.error = e instanceof Error ? e.message : String(e); }
    try { appendFileSync(resultsPath, JSON.stringify(rec) + "\n"); } catch { /* best-effort */ }
    try { appendFileSync(cursorPath, JSON.stringify({ key, status: rec.skip || rec.error ? "skipped" : "scored", ts: new Date().toISOString() }) + "\n"); } catch { /* best-effort */ }
  }
  try { spawnSync("powershell", ["-NoProfile", "-Command", `Remove-Item -Recurse -Force "${rasterDir}" -ErrorAction SilentlyContinue`], { timeout: 20000 }); } catch { /* best-effort */ }

  const meanRecall = agg.scored ? +(agg.sumRecall / agg.scored).toFixed(4) : 0;
  const meanPrecision = agg.scored ? +(agg.sumPrecision / agg.scored).toFixed(4) : 0;
  const report = {
    schemaVersion: "1.0.0", generated_from: opts.parts, models, rel_tol: opts.relTol, recall_pass_threshold: RECALL_PASS,
    parts_listed: parts.length, scored: agg.scored, passed: agg.passed,
    pass_rate: agg.scored ? +(agg.passed / agg.scored).toFixed(4) : 0,
    mean_recall: meanRecall, mean_precision: meanPrecision,
    calibration_samples_emitted: agg.calibrationSamples || 0, // real program-GT {f,correct} -> calibration store (U-XRAY-PROGRAM-GT-CALIB; 0 unless --emit-calibration)
    skipped: { print_unresolved: agg.print_unresolved, program_unresolved: agg.prog_unresolved, program_not_nc: agg.prog_not_nc, program_non_lathe: agg.prog_non_lathe, program_contour_gt: agg.prog_contour_gt, program_mill_no_gt: agg.prog_mill_no_gt, axis_filtered: agg.axis_filtered, raster_failed: agg.raster_failed, ocr_failed: agg.ocr_failed },
    note: "GT = CALLOUT-CLASS machined dims. LATHE: distinct G1/G2/G3 FEED-move feature diameters + overall feed-Z length (inch->mm). MILL: hole/bore feature diameters from tool-change comments (.250 DRILL, 1/2 REAM, .531 C'BORE) + full-circle G2/G3 arc bores (2*radius) -- tap-drill + end-mill cutter diameters EXCLUDED (not print callouts). NOT every toolpath vertex (a roughing pass has ~100+ points a print never dimensions; that denominator would falsely fail even perfect OCR). recall = fraction of callout-class GT the OCR corroborated; precision = fraction of OCR dims that are real machined dims. PASS at recall>=" + RECALL_PASS + ". GUARDS: only POSTED G-code text (binary .mcx-8/CAM sources -> program-not-nc); lathe X=diameter, mill X/Y=position so mill GT is hole/bore dia (unknown axis -> program-non-lathe); a contour lathe part -> program-contour-gt, a mill part with no hole/bore feature -> program-mill-no-gt (no callout answer-key, skipped not scored). HONESTY: a low recall here = real-scan OCR reads few dims (a domain-shift weakness vs clean synthetic prints), NOT a metric artifact. Resumable: re-run continues from processed-cursor.jsonl.",
  };
  writeFileSync(join(opts.outDir, "truetest-report.json"), JSON.stringify(report, null, 2));
  console.log(`\n  SUMMARY — scored ${agg.scored}/${parts.length} · PASS ${agg.passed} (rate ${report.pass_rate}) · mean recall ${meanRecall} · mean precision ${meanPrecision}`);
  console.log(`    skipped: ${JSON.stringify(report.skipped)}`);
  console.log(`    → ${join(opts.outDir, "truetest-report.json")}`);
  if (opts.json) console.log(JSON.stringify(report));
  return agg.scored === 0 ? 2 : 0;
}

const invokedDirectly = argv[1] && resolve(argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().then((code) => exit(code)).catch((e) => { console.error("FATAL:", e instanceof Error ? e.stack : String(e)); exit(3); });
}
