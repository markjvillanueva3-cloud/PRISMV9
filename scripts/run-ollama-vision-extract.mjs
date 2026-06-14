#!/usr/bin/env node
// scripts/run-ollama-vision-extract.mjs
//
// U-TDP06 — Ollama Vision Extractor CLI.
//
// Renders a blueprint PDF to PNG via PyMuPDF (Python subprocess), calls the
// local Ollama vision model, parses the JSON response into BlueprintExtraction
// shape, optionally emits an event into blueprint-accuracy-events.jsonl to
// flow into U-BPA-CONSUMER + U-TDP03 aggregator.
//
// USAGE:
//   node scripts/run-ollama-vision-extract.mjs --pdf <path> --part-class <c> [--model qwen3-vl:8b-instruct] [--dpi 300] [--num-ctx 8192] [--assume-units in] [--page N] [--max-pages M] [--emit-event] [--json]
//   --assume-units in|mm : fallback unit for dimensions the model emits with no unit token (JM corpus is all-inch). Unresolved dims stay flagged.
//   (default) ALL pages are rendered + extracted — one extraction object per page (multi-print containers are common). --page N forces a single page (back-compat); --max-pages M caps the count. One --emit-event outcome_record is written PER successful page.
//   --grayscale : render single-channel grayscale (pure PyMuPDF). --preprocess : grayscale + opencv Otsu binarize + denoise for scans (degrades to grayscale-only, loud, if cv2 absent). --deskew : (with --preprocess) conservative small-angle deskew.
//
// PREREQUISITES:
//   - PyMuPDF (fitz) on H:/Tools/python/python.exe — install: `H:/Tools/python/python.exe -m pip install pymupdf`
//   - Ollama daemon at http://127.0.0.1:11434 with the vision model pulled (qwen3-vl:8b-instruct — `ollama pull qwen3-vl:8b-instruct`)
//   - GPU headroom: qwen2.5-VL needs the fleet's coder model UNLOADED to stay
//     GPU-resident (else size_vram=0 → CPU → ~5-min/page). See VRAM note in
//     lib's buildOllamaRequestBody + reference_xray_ocr_gateway_unblocked.
//
// EXIT CODES:
//   0 — extraction succeeded
//   2 — PDF render failed (pdf missing / python error)
//   3 — Ollama call failed
//   4 — response parse failed (model returned non-JSON)

import { existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve, join, basename } from "node:path";
import { argv, env, exit } from "node:process";
import { fileURLToPath } from "node:url";

import {
  buildVisionPrompt,
  buildTranscriptionPrompt,
  parseVisionResponse,
  buildOllamaRequestBody,
  DEFAULT_VISION_MODEL,
  DEFAULT_TIMEOUT_MS,
} from "./lib/ollama-vision-extract-lib.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PYTHON = env.PRISM_PYTHON || "H:/Tools/python/python.exe";
const PDF_TO_PNG_SCRIPT = join(REPO_ROOT, "scripts", "lib", "pdf-to-png.py");
// PDF render/count is normally <1s, but under heavy host load (full chat fleet +
// GPU saturation) the python subprocess starves; 60s timed out in live pilots.
// 120s default survives moderate contention. Configurable for the batch runner.
const RENDER_TIMEOUT_MS = Number(env.PRISM_RENDER_TIMEOUT_MS) > 0 ? Number(env.PRISM_RENDER_TIMEOUT_MS) : 120000;
const DEFAULT_OLLAMA_URL = env.OLLAMA_URL || "http://127.0.0.1:11434";
const DEFAULT_EVENTS_FILE = env.PRISM_BPA_EVENTS_FILE || join(REPO_ROOT, "state", "shared", "blueprint-accuracy-events.jsonl");
const TMP_DIR = env.PRISM_TDP_TMP_DIR || join(REPO_ROOT, ".cache", "temp", "tdp-vision");

function parseArgs(args) {
  // page: null = ALL pages (the multi-print default — one extraction per page);
  // a number forces a single page (back-compat). maxPages 0 = unlimited.
  const out = { pdf: null, partClass: null, model: DEFAULT_VISION_MODEL, dpi: 300, numCtx: 8192, assumeUnits: null, page: null, maxPages: 0, grayscale: false, preprocess: false, deskew: false, emitEvent: false, json: false, transcribe: false, timeoutMs: DEFAULT_TIMEOUT_MS };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--pdf") out.pdf = args[++i];
    else if (a === "--part-class") out.partClass = args[++i];
    else if (a === "--model") out.model = args[++i];
    else if (a === "--dpi") out.dpi = parseInt(args[++i], 10);
    else if (a === "--num-ctx") out.numCtx = parseInt(args[++i], 10);
    else if (a === "--assume-units") out.assumeUnits = args[++i]; // 'in'|'mm' fallback for dims with no unit (JM corpus is inch)
    else if (a === "--page") out.page = parseInt(args[++i], 10);   // single page (back-compat); omit = all pages
    else if (a === "--max-pages") out.maxPages = parseInt(args[++i], 10);
    else if (a === "--grayscale") out.grayscale = true;            // scan preprocessing: grayscale render (pure PyMuPDF)
    else if (a === "--preprocess") out.preprocess = true;          // grayscale + opencv Otsu binarize + denoise (degrades to grayscale)
    else if (a === "--deskew") out.deskew = true;                  // (with --preprocess) conservative small-angle deskew
    else if (a === "--timeout-ms") out.timeoutMs = parseInt(args[++i], 10);
    else if (a === "--emit-event") out.emitEvent = true;
    else if (a === "--json") out.json = true;
    else if (a === "--transcribe") out.transcribe = true; // U-QP-DOCUSTRATA-RUN-ALL: document text-transcription mode (raw text, not blueprint JSON)
  }
  return out;
}

/**
 * Pure: build the pdf-to-png.py argv for a page render. Exported for testing
 * the scan-preprocessing flag threading (#2) without spawning Python.
 * preOpts: {grayscale, preprocess, deskew} — --deskew only meaningful with --preprocess.
 */
export function buildRenderArgs(scriptPath, pdfPath, pngOut, dpi, page, preOpts = {}) {
  const a = [scriptPath, pdfPath, pngOut, "--dpi", String(dpi), "--page", String(page)];
  if (preOpts.preprocess) {
    a.push("--preprocess");
    if (preOpts.deskew) a.push("--deskew");
  } else if (preOpts.grayscale) {
    a.push("--grayscale");
  }
  return a;
}

function renderPdfToPng(pdfPath, pngOut, dpi, page = 0, preOpts = {}) {
  const result = spawnSync(DEFAULT_PYTHON, buildRenderArgs(PDF_TO_PNG_SCRIPT, pdfPath, pngOut, dpi, page, preOpts), {
    encoding: "utf8",
    timeout: RENDER_TIMEOUT_MS,
  });
  if (result.status !== 0) {
    return {
      success: false,
      error: "pdf-to-png exit=" + result.status + " stderr=" + (result.stderr || "").trim().slice(0, 200),
    };
  }
  return { success: true, stdout: (result.stdout || "").trim() };
}

/** Get the page count of a PDF via pdf-to-png.py --count. */
function getPageCount(pdfPath) {
  const r = spawnSync(DEFAULT_PYTHON, [PDF_TO_PNG_SCRIPT, pdfPath, "--count"], { encoding: "utf8", timeout: RENDER_TIMEOUT_MS });
  if (r.status !== 0) {
    return { success: false, error: "page-count exit=" + r.status + " stderr=" + (r.stderr || "").trim().slice(0, 120) };
  }
  const n = parseInt((r.stdout || "").trim(), 10);
  return Number.isFinite(n) ? { success: true, count: n } : { success: false, error: "page-count parse failed: " + (r.stdout || "").slice(0, 60) };
}

/**
 * Pure: which page indices to process. Default = ALL pages (the multi-print
 * fix — the runner formerly rendered page 0 only, silently dropping ~76% of
 * corpus pages). An explicit opts.page forces a single page (back-compat).
 * opts.maxPages > 0 caps the count (the batch runner uses this).
 *
 * @param {number} pageCount
 * @param {{page?: number|null, maxPages?: number}} [opts]
 * @returns {number[]} 0-based page indices (empty if none valid)
 */
export function selectPages(pageCount, opts = {}) {
  const n = Number.isFinite(pageCount) && pageCount > 0 ? Math.floor(pageCount) : 0;
  if (n === 0) return [];
  if (opts.page != null && Number.isFinite(opts.page)) {
    const p = Math.floor(opts.page);
    return p >= 0 && p < n ? [p] : [];
  }
  let pages = Array.from({ length: n }, (_, i) => i);
  const cap = Number.isFinite(opts.maxPages) && opts.maxPages > 0 ? Math.floor(opts.maxPages) : 0;
  if (cap > 0 && pages.length > cap) pages = pages.slice(0, cap);
  return pages;
}

/** Render + OCR + parse ONE page. Returns a per-page result (never throws). */
async function extractPage(args, pageIndex) {
  const pngPath = join(TMP_DIR, basename(args.pdf, ".pdf") + "-p" + pageIndex + "-" + Date.now() + ".png");
  const render = renderPdfToPng(args.pdf, pngPath, args.dpi, pageIndex, { grayscale: args.grayscale, preprocess: args.preprocess, deskew: args.deskew });
  if (!render.success) return { page_index: pageIndex, success: false, error: "render: " + render.error };
  let imageBase64;
  try {
    imageBase64 = readFileSync(pngPath).toString("base64");
  } catch (e) {
    return { page_index: pageIndex, success: false, error: "png load: " + (e instanceof Error ? e.message : String(e)), png_path: pngPath };
  }
  // Transcription mode (U-QP-DOCUSTRATA-RUN-ALL): business documents get a verbatim
  // text-transcription prompt and the raw model text is returned -- the blueprint
  // dimension/GD&T parse is bypassed (it would mangle a quote/invoice).
  const prompt = args.transcribe ? buildTranscriptionPrompt({ docHint: args.partClass }) : buildVisionPrompt(args.partClass);
  const startMs = Date.now();
  const callResult = await callOllamaVision(args.model, prompt, imageBase64, args.timeoutMs, args.numCtx);
  const wallMs = Date.now() - startMs;
  if (!callResult.success) return { page_index: pageIndex, success: false, error: "ollama: " + callResult.error, png_path: pngPath, wall_ms: wallMs };
  if (args.transcribe) {
    const text = typeof callResult.raw === "string" ? callResult.raw.trim() : "";
    if (!text) return { page_index: pageIndex, success: false, error: "transcribe: empty response", png_path: pngPath, wall_ms: wallMs };
    return {
      page_index: pageIndex, success: true, png_path: pngPath, text,
      raw_response_chars: text.length, ollama_total_ms: callResult.duration_ms, wall_ms: wallMs,
    };
  }
  const parsed = parseVisionResponse(callResult.raw, { assumeUnits: args.assumeUnits });
  if (!parsed.success) {
    return { page_index: pageIndex, success: false, error: "parse: " + parsed.error, png_path: pngPath, raw_head: callResult.raw.slice(0, 500), wall_ms: wallMs };
  }
  return {
    page_index: pageIndex, success: true, png_path: pngPath, extraction: parsed.extraction,
    raw_response_chars: callResult.raw.length, ollama_total_ms: callResult.duration_ms, wall_ms: wallMs,
  };
}

async function callOllamaVision(model, prompt, imageBase64, timeoutMs, numCtx) {
  // numCtx is load-bearing: an uncapped context makes qwen2.5-VL's footprint
  // exceed 16GB VRAM → CPU offload → multi-minute inference. See lib comment.
  const modelOptions = Number.isFinite(numCtx) && numCtx > 0 ? { num_ctx: numCtx } : undefined;
  const body = buildOllamaRequestBody(prompt, imageBase64, { model, modelOptions });
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(DEFAULT_OLLAMA_URL + "/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!resp.ok) {
      return { success: false, error: "ollama HTTP " + resp.status, raw: null };
    }
    const data = await resp.json();
    return { success: true, raw: data.response || "", duration_ms: data.total_duration ? Math.round(data.total_duration / 1e6) : null };
  } catch (e) {
    clearTimeout(t);
    return { success: false, error: e instanceof Error ? e.message : String(e), raw: null };
  }
}

function appendEvent(eventsFile, event) {
  try {
    const d = dirname(eventsFile);
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
    appendFileSync(eventsFile, JSON.stringify(event) + "\n");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function buildPageEvent(args, pageIndex, pageCount, extraction) {
  return {
    type: "outcome_record",
    ts: new Date().toISOString(),
    payload: {
      pdf_path: args.pdf,
      page_index: pageIndex,
      page_count: pageCount,
      part_class: args.partClass,
      operator_id: null,
      extract_status: "ok",
      cad_status: "skipped",
      cam_status: "skipped",
      extraction_confidence: extraction.confidence,
      extraction,
      cad_dispatched_count: 0,
      cad_skipped_count: 0,
      cam_nc_output_present: false,
      accurate: false, // single extraction — not a full pipeline run
    },
  };
}

async function main() {
  const args = parseArgs(argv.slice(2));
  // Transcription mode needs only --pdf (a business document has no part class).
  if (!args.pdf || (!args.transcribe && !args.partClass)) {
    console.error("ERR: --pdf <path> --part-class <c> are required (part-class optional with --transcribe)");
    exit(3);
  }
  if (!existsSync(args.pdf)) {
    console.error("ERR: pdf does not exist: " + args.pdf);
    exit(2);
  }
  if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });

  // Page discovery → page selection (ALL pages by default; the runner formerly
  // rendered page 0 only, silently dropping ~76% of multi-page corpus pages).
  const pc = getPageCount(args.pdf);
  if (!pc.success) {
    console.error("[vision] page count failed: " + pc.error);
    exit(2);
  }
  const pages = selectPages(pc.count, { page: args.page, maxPages: args.maxPages });
  if (pages.length === 0) {
    console.error("[vision] no pages to process (count=" + pc.count + ", page=" + args.page + ")");
    exit(2);
  }

  // Process each page → one extraction object per print (doctrine).
  // SEQUENTIAL await is INTENTIONAL — the GPU runs one VLM inference at a time;
  // parallelizing pages would thrash VRAM (the contention failure mode). Do NOT
  // convert to Promise.all.
  const totalStart = Date.now();
  const pageResults = [];
  for (const pi of pages) {
    const r = await extractPage(args, pi);
    if (args.emitEvent && r.success) {
      const er = appendEvent(DEFAULT_EVENTS_FILE, buildPageEvent(args, pi, pc.count, r.extraction));
      r.event_status = er.success ? "appended" : ("failed: " + er.error);
    }
    pageResults.push(r);
  }
  const totalWallMs = Date.now() - totalStart;
  const okCount = pageResults.filter((r) => r.success).length;

  const result = {
    pdf: args.pdf,
    part_class: args.partClass,
    model: args.model,
    page_count: pc.count,
    pages_processed: pages.length,
    pages_ok: okCount,
    total_wall_ms: totalWallMs,
    pages: pageResults,
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("[vision] pdf=" + args.pdf);
    console.log("[vision] model=" + args.model + " dpi=" + args.dpi + " pages=" + pc.count + " processed=" + pages.length + " ok=" + okCount + " total_wall_ms=" + totalWallMs);
    for (const r of pageResults) {
      if (!r.success) {
        console.log("[vision] page " + r.page_index + ": FAILED — " + r.error);
        continue;
      }
      if (r.text != null) { // transcribe mode -- no blueprint extraction object
        console.log("[vision] page " + r.page_index + ": transcribed " + r.raw_response_chars + " chars (" + r.wall_ms + "ms)");
        continue;
      }
      const ex = r.extraction;
      const tb = ex.title_block || {};
      const ur = ex.unit_resolution || {};
      console.log("[vision] page " + r.page_index + ": title=" + (tb.title || "?") + " part_number=" + (tb.part_number || "?") + " material=" + (tb.material || "?") + " units=" + (ex.units || "?") + " conf=" + ex.confidence + " dims=" + ex.dimensions.length + " (unit-resolved " + (ur.dimensions_unit_resolved || 0) + "/" + (ur.dimensions_total || 0) + ") gdt=" + ex.gdt.length + " notes=" + ex.notes.length + " profiles=" + ex.profiles.length + " (" + r.wall_ms + "ms)");
      if (ur.dimensions_total && ur.dimensions_unit_resolved < ur.dimensions_total) {
        console.log("[vision]   ⚠ " + (ur.dimensions_total - ur.dimensions_unit_resolved) + " dimension(s) UNRESOLVED units — nominal kept raw, NOT mm (pass --assume-units in for the JM corpus)");
      }
      for (const d of ex.dimensions.slice(0, 10)) {
        const val = d.nominal_mm != null ? d.nominal_mm.toFixed(3) + "mm" : (d.nominal_raw != null ? d.nominal_raw + " " + d.unit + "(unresolved)" : "(no nominal)");
        const tol = d.tolerance_mm && d.tolerance_mm.upper != null && d.tolerance_mm.lower != null
          ? " ±" + ((d.tolerance_mm.upper - d.tolerance_mm.lower) / 2).toFixed(4) + "mm" : "";
        console.log("[vision]     - " + d.type + ": " + val + tol + (d.unit_assumed ? " [unit assumed]" : ""));
      }
      if (ex.dimensions.length > 10) console.log("[vision]     ... and " + (ex.dimensions.length - 10) + " more");
      const deficientFcf = ex.gdt.filter((g) => g.datum_deficient).length;
      if (deficientFcf > 0) console.log("[vision]   ⚠ " + deficientFcf + " GD&T callout(s) datum-3-2-1 deficient (low trust)");
      if (r.event_status) console.log("[vision]   event: " + r.event_status);
    }
  }
  // exit 0 if ≥1 page extracted; 4 if every page failed to OCR/parse.
  exit(okCount > 0 ? 0 : 4);
}

// Entry-point guard: run the CLI only when this file is the direct entry point,
// NOT when a test/other module imports selectPages. (Without this, `node --test`
// importing the module fired main() → "ERR: --pdf required".)
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMainModule) {
  main().catch((e) => {
    console.error("[vision] FATAL: " + (e instanceof Error ? e.message : String(e)));
    exit(3);
  });
}
