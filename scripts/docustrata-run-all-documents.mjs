#!/usr/bin/env node
// scripts/docustrata-run-all-documents.mjs
//
// U-QP-DOCUSTRATA-RUN-ALL (slot:charlie, 2026-06-12) -- ONE command to run ALL
// Docustrata documents through the quoting closed-loop, end to end:
//
//   classified index --[route]--> text-layer (pypdf, cheap) \
//   (73,506 records)              scanned (vision OCR, slow) / --[merge]--> text-extracted
//                                                                              |
//                                                          extract-docustrata-outcomes.mjs
//                                                                              |
//                                                                  (quoted,actual) pairs
//                                                                              |
//                                                                       coverage report
//
// This is the connective tissue the corpus was missing. Every stage REUSES an
// existing, proven piece (R8):
//   - routing/merge/funnel  -> scripts/lib/docustrata-doc-pipeline-lib.mjs (pure, tested)
//   - cheap text-layer route -> scripts/lib/pdf-text-layer-extract.py (pypdf, lima's method)
//   - scanned OCR route      -> scripts/run-ollama-vision-extract.mjs --transcribe (this session)
//   - quote<->invoice pairing-> scripts/extract-docustrata-outcomes.mjs (charlie iter58)
//
// WHY this exists: the closed loop trained on ~10 curated pairs because the 257K
// Docustrata PDFs were never OCR'd (documents-text-extracted-v3.jsonl carries ZERO
// text). This runner generates that text and feeds the existing extractor -- the
// answer to "can we utilize data from other sources to train the model further".
//
// RESUMABLE + TIME-BUDGETED so the full 257K run is an unattended overnight job
// (a small --limit proves the chain end-to-end first).
//
// USAGE:
//   node scripts/docustrata-run-all-documents.mjs --dry-run            # enumerate + route + coverage, no extraction
//   node scripts/docustrata-run-all-documents.mjs --limit 5 --routes textLayer   # cheap proof
//   node scripts/docustrata-run-all-documents.mjs --limit 3 --routes ocr         # vision proof (GPU)
//   node scripts/docustrata-run-all-documents.mjs --ocr-time-budget-min 600      # full overnight run
//
// EXIT: 0 ran (see report); 2 classified index missing; 3 arg error.

import { createReadStream, existsSync, mkdirSync, appendFileSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { createInterface } from "node:readline";
import { spawnSync } from "node:child_process";
import { dirname, resolve, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, env, exit } from "node:process";

import { readdirSync } from "node:fs";
import {
  selectDocumentWorkSet,
  buildWorkSetFromFolders,
  FOLDER_ROLE_MAP,
  partitionByRoute,
  buildWorklistPaths,
  parseDocTextCheckpoint,
  mergeTextIntoRecord,
  coverageFunnel,
  DEFAULT_MIN_ROLE_CONFIDENCE,
  DEFAULT_TEXT_LAYER_MIN_CHARS,
} from "./lib/docustrata-doc-pipeline-lib.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NODE = process.execPath;
const PYTHON = env.PRISM_PYTHON || "H:/Tools/python/python.exe";
const VISION_RUNNER = join(REPO_ROOT, "scripts", "run-ollama-vision-extract.mjs");
const TEXT_LAYER_SCRIPT = join(REPO_ROOT, "scripts", "lib", "pdf-text-layer-extract.py");
const EXTRACTOR = join(REPO_ROOT, "scripts", "extract-docustrata-outcomes.mjs");

const DEFAULTS = {
  classified: "H:/PRISM/Docustrata/.index/documents-classified-v3.jsonl",
  checkpoint: join(REPO_ROOT, "state", "shared", "quoting", "docustrata-doctext-checkpoint.jsonl"),
  mergedOut: join(REPO_ROOT, "state", "shared", "quoting", "documents-text-extracted-withtext.jsonl"),
  extractedOut: join(REPO_ROOT, "state", "shared", "quoting", "docustrata-extracted.jsonl"),
  report: join(REPO_ROOT, "state", "shared", "quoting", "docustrata-run-all-report.json"),
  tmpDir: join(REPO_ROOT, ".cache", "temp", "docustrata-run-all"),
};

// Cap pages per document -- quotes/invoices are 1-2 pages; a sprawling multi-page
// sales order rarely needs more than the header pages for (customer, part, total).
const MAX_PAGES_PER_DOC = 4;

function parseArgs(args) {
  const out = {
    classified: DEFAULTS.classified, checkpoint: DEFAULTS.checkpoint, mergedOut: DEFAULTS.mergedOut,
    extractedOut: DEFAULTS.extractedOut, report: DEFAULTS.report,
    limit: Infinity, routes: "both", ocrBudgetMin: 0,
    minRoleConf: DEFAULT_MIN_ROLE_CONFIDENCE, textLayerMinChars: DEFAULT_TEXT_LAYER_MIN_CHARS,
    dryRun: false, runExtractor: true, json: false,
    // Folder-scan source: the REAL quote/order corpus (35,231 PDFs) lives in the
    // JMD folders, NOT in the .index (verified -- 0 index records inside them).
    fromFolders: false, foldersRoot: "H:/PRISM/Docustrata",
    folderRoles: "QUOTE,SALES_ORDER,CLOSED_ORDER", // PACKING_SLIP excluded (no price -> not a pairing target)
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--classified") out.classified = resolve(args[++i]);
    else if (a === "--checkpoint") out.checkpoint = resolve(args[++i]);
    else if (a === "--merged-out") out.mergedOut = resolve(args[++i]);
    else if (a === "--extracted-out") out.extractedOut = resolve(args[++i]);
    else if (a === "--report") out.report = resolve(args[++i]);
    else if (a === "--limit") out.limit = Number(args[++i]);
    else if (a === "--routes") out.routes = args[++i]; // both|textLayer|ocr
    else if (a === "--ocr-time-budget-min") out.ocrBudgetMin = Number(args[++i]);
    else if (a === "--min-role-conf") out.minRoleConf = Number(args[++i]);
    else if (a === "--text-layer-min-chars") out.textLayerMinChars = Number(args[++i]);
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--no-extractor") out.runExtractor = false;
    else if (a === "--json") out.json = true;
    else if (a === "--from-folders") out.fromFolders = true;
    else if (a === "--folders-root") out.foldersRoot = resolve(args[++i]);
    else if (a === "--folder-roles") out.folderRoles = args[++i];
  }
  return out;
}

function log(msg) { console.error("[run-all] " + msg); }

function ensureDir(p) { const d = dirname(p); if (!existsSync(d)) mkdirSync(d, { recursive: true }); }

/** Stream the classified JSONL -> array of records (tolerant of bad lines). */
async function loadClassified(path) {
  const records = [];
  const rl = createInterface({ input: createReadStream(path, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of rl) {
    const s = line.trim();
    if (!s) continue;
    try { records.push(JSON.parse(s)); } catch { /* skip malformed */ }
  }
  return records;
}

/** Append one checkpoint row (atomic-enough: appendFileSync is a single syscall). */
function appendCheckpoint(checkpointPath, row) {
  appendFileSync(checkpointPath, JSON.stringify(row) + "\n");
}

/** Atomic write (tmp + rename) so a crash never leaves a half-written artifact. */
function atomicWrite(path, content) {
  ensureDir(path);
  const tmp = path + ".tmp-" + basename(path) + "-write";
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}

/** Run the cheap pypdf text-layer route over pending paths. Returns {okPaths:Set, failedPaths:string[]}. */
function runTextLayer(pendingDocs, args) {
  const paths = buildWorklistPaths(pendingDocs);
  const okPaths = new Set();
  const failedPaths = [];
  if (paths.length === 0) return { okPaths, failedPaths };
  if (!existsSync(PYTHON)) { log("python not found at " + PYTHON + " -- skipping text-layer route, all -> OCR"); return { okPaths, failedPaths: paths }; }
  ensureDir(join(args.tmpDir, "x"));
  const worklist = join(args.tmpDir, "textlayer-worklist.txt");
  const tlOut = join(args.tmpDir, "textlayer-out.jsonl");
  writeFileSync(worklist, paths.join("\n") + "\n");
  try { writeFileSync(tlOut, ""); } catch { /* fresh */ }
  log("text-layer: " + paths.length + " doc(s) via pypdf ...");
  const r = spawnSync(PYTHON, [TEXT_LAYER_SCRIPT, "--worklist", worklist, "--out", tlOut, "--min-chars", String(args.textLayerMinChars)], { encoding: "utf8", timeout: 30 * 60 * 1000 });
  if (r.status !== 0) { log("text-layer script exit=" + r.status + " " + (r.stderr || "").trim().slice(0, 200)); }
  // Fold results into the master checkpoint; ok=true -> usable text, ok=false -> route to OCR.
  let body = "";
  try { body = readFileSync(tlOut, "utf8"); } catch { body = ""; }
  for (const line of body.split(/\r?\n/)) {
    const s = line.trim();
    if (!s) continue;
    let o; try { o = JSON.parse(s); } catch { continue; }
    if (!o || typeof o.path !== "string") continue;
    if (o.ok === true && typeof o.text === "string" && o.text) {
      appendCheckpoint(args.checkpoint, { path: o.path, ok: true, route: "textLayer", chars: o.chars || o.text.length, text: o.text });
      okPaths.add(o.path);
    } else {
      failedPaths.push(o.path); // no usable text layer -> OCR fallback
    }
  }
  log("text-layer: " + okPaths.size + " ok, " + failedPaths.length + " -> OCR fallback");
  return { okPaths, failedPaths };
}

/** OCR one document via the vision runner in --transcribe mode. Returns joined page text or null. */
function ocrOneDoc(pdfPath) {
  const r = spawnSync(NODE, [VISION_RUNNER, "--pdf", pdfPath, "--transcribe", "--json", "--grayscale", "--max-pages", String(MAX_PAGES_PER_DOC), "--num-ctx", "8192"], { encoding: "utf8", timeout: 20 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0 || !r.stdout) return null;
  let parsed; try { parsed = JSON.parse(r.stdout); } catch { return null; }
  const pages = Array.isArray(parsed.pages) ? parsed.pages : [];
  const texts = pages.filter((p) => p && p.success && typeof p.text === "string" && p.text).map((p) => p.text);
  if (texts.length === 0) return null;
  return texts.join("\n\n");
}

/** Run the vision OCR route over pending paths, time-budgeted. Returns count OCR'd. */
function runOcr(pendingPaths, args) {
  if (pendingPaths.length === 0) return 0;
  const startMs = Date.now();
  const budgetMs = Number.isFinite(args.ocrBudgetMin) && args.ocrBudgetMin > 0 ? args.ocrBudgetMin * 60000 : 0;
  let done = 0;
  log("OCR (vision --transcribe): " + pendingPaths.length + " doc(s)" + (budgetMs ? " budget=" + args.ocrBudgetMin + "min" : ""));
  for (const pdfPath of pendingPaths) {
    if (budgetMs && Date.now() - startMs >= budgetMs) { log("OCR time budget reached -- stopping (resume next run)"); break; }
    const text = ocrOneDoc(pdfPath);
    if (text) {
      appendCheckpoint(args.checkpoint, { path: pdfPath, ok: true, route: "ocr", chars: text.length, text });
      done += 1;
    } else {
      appendCheckpoint(args.checkpoint, { path: pdfPath, ok: false, route: "ocr", reason: "ocr-failed" });
    }
    if (done % 10 === 0 && done > 0) log("OCR progress: " + done + "/" + pendingPaths.length);
  }
  return done;
}

/** Glob PDFs from the on-disk JMD folders -> work-set (folder name = ground-truth role). */
function globFolderWorkSet(args) {
  const wantRoles = new Set(String(args.folderRoles).split(",").map((s) => s.trim()).filter(Boolean));
  const pdfsByRole = {};
  for (const [folderName, role] of Object.entries(FOLDER_ROLE_MAP)) {
    if (!wantRoles.has(role)) continue;
    const dir = join(args.foldersRoot, folderName);
    if (!existsSync(dir)) { log("folder not found, skipping: " + dir); continue; }
    let entries = [];
    try { entries = readdirSync(dir, { recursive: true, encoding: "utf8" }); }
    catch (e) { log("readdir failed for " + dir + ": " + (e instanceof Error ? e.message : String(e))); continue; }
    const pdfs = [];
    for (const rel of entries) {
      if (typeof rel !== "string" || !/\.pdf$/i.test(rel)) continue;
      pdfs.push(join(dir, rel));
    }
    pdfsByRole[role] = pdfs;
    log("folder " + folderName + " (" + role + "): " + pdfs.length + " PDFs");
  }
  return buildWorkSetFromFolders(pdfsByRole, { roles: [...wantRoles] });
}

async function main() {
  // BUILD-FOR-BLACKWELL heap guard: the Stage-5 in-memory merge OOMs at the default node
  // heap on 12K+ records (the full JMD Orders-Closed run -> 6,718 actuals proved it). Re-exec
  // ONCE with a generous heap; NODE_OPTIONS propagates it to the extractor subprocess too.
  // Knob PRISM_OC_HEAP_MB (default 16384); __OC_HEAP_GUARD prevents an infinite re-exec loop.
  if (!env.__OC_HEAP_GUARD) {
    const heapMb = env.PRISM_OC_HEAP_MB || "16384";
    const childEnv = { ...env, __OC_HEAP_GUARD: "1", NODE_OPTIONS: ((env.NODE_OPTIONS || "") + " --max-old-space-size=" + heapMb).trim() };
    const r = spawnSync(process.execPath, ["--max-old-space-size=" + heapMb, fileURLToPath(import.meta.url), ...argv.slice(2)], { stdio: "inherit", env: childEnv });
    exit(r.status == null ? 1 : r.status);
  }
  const args = parseArgs(argv.slice(2));
  args.tmpDir = DEFAULTS.tmpDir;
  if (!["both", "textLayer", "ocr"].includes(args.routes)) { console.error("ERR: --routes must be both|textLayer|ocr"); exit(3); }
  if (!args.fromFolders && !existsSync(args.classified)) { console.error("ERR: classified index not found: " + args.classified); exit(2); }
  for (const p of [args.checkpoint, args.mergedOut, args.extractedOut, args.report]) ensureDir(p);
  if (!existsSync(args.checkpoint)) writeFileSync(args.checkpoint, "");

  // STAGE 1 -- ENUMERATE (folder source = the real 35K quote/order corpus; index source = Unfiled/scans)
  let ws;
  if (args.fromFolders) {
    log("scanning JMD folders under: " + args.foldersRoot + " (roles: " + args.folderRoles + ")");
    ws = globFolderWorkSet(args);
  } else {
    log("loading classified index: " + args.classified);
    const records = await loadClassified(args.classified);
    ws = selectDocumentWorkSet(records, { minRoleConfidence: args.minRoleConf });
  }
  let workDocs = ws.docs;
  if (Number.isFinite(args.limit) && args.limit >= 0 && workDocs.length > args.limit) workDocs = workDocs.slice(0, args.limit);
  log("classified=" + ws.total + " work-set=" + ws.matched + " (using " + workDocs.length + ") by-role=" + JSON.stringify(ws.byRole));

  // STAGE 2 -- ROUTE
  const part = partitionByRoute(workDocs, { textLayerMinChars: args.textLayerMinChars });
  log("route: textLayer=" + part.textLayer.length + " ocr=" + part.ocr.length);

  // resume: already-have-text set from the checkpoint
  let doneText = parseDocTextCheckpoint(existsSync(args.checkpoint) ? readFileSync(args.checkpoint, "utf8") : "");
  log("checkpoint: " + doneText.size + " doc(s) already have text");

  if (!args.dryRun) {
    // STAGE 3 -- TEXT-LAYER (cheap) route
    let ocrFallback = [];
    if (args.routes === "both" || args.routes === "textLayer") {
      const pendingTL = part.textLayer.filter((d) => !doneText.has(d.disk_path));
      const tl = runTextLayer(pendingTL, args);
      ocrFallback = tl.failedPaths;
    }
    // STAGE 4 -- OCR (scanned) route, incl. text-layer fallbacks
    if (args.routes === "both" || args.routes === "ocr") {
      doneText = parseDocTextCheckpoint(readFileSync(args.checkpoint, "utf8")); // refresh after text-layer
      const ocrSet = new Set([...part.ocr.map((d) => d.disk_path), ...ocrFallback]);
      const pendingOcr = [...ocrSet].filter((p) => p && !doneText.has(p));
      runOcr(pendingOcr, args);
    }
  }

  // STAGE 5 -- MERGE checkpoint text into extractor-shape records
  doneText = parseDocTextCheckpoint(existsSync(args.checkpoint) ? readFileSync(args.checkpoint, "utf8") : "");
  let merged = 0;
  if (!args.dryRun) {
    const lines = [];
    for (const rec of workDocs) {
      const m = mergeTextIntoRecord(rec, doneText);
      if (m) { lines.push(JSON.stringify(m)); merged += 1; }
    }
    atomicWrite(args.mergedOut, lines.join("\n") + (lines.length ? "\n" : ""));
    log("merged " + merged + " record(s) with text -> " + args.mergedOut);
  }

  // STAGE 6 -- EXTRACT (quote<->actual pairing + standalone actuals) via the existing extractor
  let extractorPairs = 0, extractorActuals = 0, extractorQualified = 0;
  if (!args.dryRun && args.runExtractor && merged > 0) {
    log("extractor: " + EXTRACTOR + " --input " + args.mergedOut);
    const r = spawnSync(NODE, [EXTRACTOR, "--input=" + args.mergedOut, "--out=" + args.extractedOut], { encoding: "utf8", timeout: 30 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 });
    if (r.stdout) process.stderr.write(r.stdout);
    try {
      // The output is a single pretty-printed JSON object -- parse it and count RECORDS
      // (invoices=pairs, actuals=standalone). Counting non-empty LINES over-reports ~580x.
      const body = existsSync(args.extractedOut) ? readFileSync(args.extractedOut, "utf8") : "";
      const parsed = body.trim() ? JSON.parse(body) : {};
      extractorPairs = Array.isArray(parsed.invoices) ? parsed.invoices.length : 0;
      extractorActuals = Array.isArray(parsed.actuals) ? parsed.actuals.length : 0;
    } catch { /* report 0 */ }
    extractorQualified = merged;
    log("extractor records: pairs=" + extractorPairs + " standalone-actuals=" + extractorActuals);
  }

  // STAGE 7 -- REPORT (coverage funnel)
  const funnel = coverageFunnel({
    totalClassified: ws.total, roleMatched: ws.matched, byRole: ws.byRole,
    routeTextLayer: part.textLayer.length, routeOcr: part.ocr.length,
    textObtained: doneText.size, extractorQualified, pairs: extractorPairs,
  });
  const report = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    unit: "U-QP-DOCUSTRATA-RUN-ALL",
    dryRun: args.dryRun,
    routes: args.routes,
    limitApplied: Number.isFinite(args.limit) ? args.limit : null,
    workDocsProcessed: workDocs.length,
    mergedRecords: merged,
    extractorPairs,
    extractorActuals,
    coverage: funnel,
    inputs: { classified: args.classified, checkpoint: args.checkpoint },
    outputs: { merged: args.mergedOut, extracted: args.extractedOut },
  };
  atomicWrite(args.report, JSON.stringify(report, null, 2));
  log("report -> " + args.report);

  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log("");
    console.log("=== Docustrata run-all coverage ===");
    console.log("  classified records : " + funnel.total_classified);
    console.log("  quoting work-set   : " + funnel.role_matched + " (" + funnel.role_matched_pct_of_total + "% of total)  " + JSON.stringify(funnel.by_role));
    console.log("  routes             : textLayer=" + funnel.route_text_layer + " ocr=" + funnel.route_ocr);
    console.log("  text obtained      : " + funnel.text_obtained + " (" + funnel.text_obtained_pct_of_matched + "% of work-set)");
    console.log("  pairs extracted    : " + funnel.pairs + " (" + funnel.pairs_pct_of_matched + "% of work-set)");
    console.log("  report             : " + args.report);
  }
}

main().catch((e) => { console.error("[run-all] FATAL: " + (e instanceof Error ? e.stack : String(e))); exit(1); });
