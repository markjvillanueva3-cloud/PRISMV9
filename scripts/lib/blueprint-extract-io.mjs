// scripts/lib/blueprint-extract-io.mjs
//
// U-TDP07 - I/O orchestrator for the blueprint OCR cascade.
//
// Stitches three boundaries:
//   1) python sidecar  (PyMuPDF text+raster) ─┐
//                                              ├─► pure core (blueprint-extractor-lib.mjs)
//   2) Ollama          (qwen2.5-vl:7b VLM)   ─┘
//   3) U-TDP04 benchmark contract:
//        extractor :: {pdf_path, part_class, ground_truth_dims} ->
//                     {dimensions: [{kind, presence_only:true}], source}
//
// CASCADE (per-page, then unioned across pages):
//   - sidecar.pages[i].is_vector_text === true  → aggregateTokenSignals(tokens)
//   - sidecar.pages[i].png_b64 != null          → Ollama VLM → parseVlmJsonResponse
//   - mergeStages(vector, vlm) per page; union across pages; filterToAllowedKinds
//
// FAIL-LOUD R12:
//   - sidecar non-zero exit, sidecar ok:false, ollama unreachable, ollama
//     timeout, all-pages-empty: ALL surface in the returned record's
//     `notes` array. NEVER swallow.
//   - Empty extraction returns {dimensions: [], source: "live-cascade",
//     notes: ["<reason>"]} so the benchmark scores it as FN (full miss),
//     not as a thrown exception that aborts the walk.
//
// PURE-CORE BOUNDARY: this module owns ALL subprocess + network I/O. The lib
// module stays subprocess-free so it can be unit-tested deterministically.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  aggregateTokenSignals,
  buildVlmPrompt,
  parseVlmJsonResponse,
  mergeStages,
  filterToAllowedKinds,
  GT_KINDS,
} from "./blueprint-extractor-lib.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SIDECAR_PATH = join(REPO_ROOT, "scripts", "blueprint-extract-sidecar.py");

// ---- Bounded knobs (env overrides for ops; safe defaults for benchmark walks) ----
const DEFAULT_PYTHON_BIN = process.env.PRISM_PYTHON_BIN || "H:/Tools/python/python.exe";
const DEFAULT_OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
// qwen3-vl:8b-instruct: 8.1GB GPU-resident (vs qwen2.5vl:7b's 15.3GB CPU-spill on 16GB),
// no thinking-chain (the bare qwen3-vl:8b never emits JSON). See the canonical default in
// ollama-vision-extract-lib.mjs + reference_xray_ocr_gpu_concurrency_2026_05_31.
const DEFAULT_VLM_MODEL = process.env.PRISM_VLM_MODEL || "qwen3-vl:8b-instruct";

// Per-PDF sidecar budget. Conservative — most blueprint PDFs are 1-3 pages.
const SIDECAR_TIMEOUT_MS = 60_000;
// Per-page VLM call. Qwen2.5-VL 7B on an RTX 4080:
//   - warm-path inference at dpi=100 image: ~15s
//   - cold-load (first call after another model evicted it): ~110s
// 4080 has 16GB VRAM, qwen2.5-vl:7b consumes 15.4GB — ANY other model load
// (e.g. nomic-embed-text from another hook) evicts the VLM, forcing the next
// call to cold-load. Until we have model-pin lifecycle, the per-call cap
// must cover cold-load. 240s leaves room for cold-load + warm-inference +
// transient stalls.
const VLM_TIMEOUT_MS = 240_000;
// maxBuffer for the sidecar's stdout — sized to MAX_TOTAL_PNG_B64_CHARS (80MB)
// from the sidecar plus JSON wrapper headroom. Reviewer-B's math: 96MB safe.
const SIDECAR_MAX_BUFFER = 128 * 1024 * 1024;

/**
 * Spawn the python sidecar one-shot. Returns the parsed JSON or throws on
 * preflight error (exit 2 / no JSON). Sidecar's own ok:false (corrupt PDF)
 * surfaces as a normal return — caller inspects .ok.
 *
 * Pure-I/O wrapper.
 *
 * @param {string} pdfPath
 * @param {{dpi?:number,maxPages?:number,skipRasterWhenVector?:boolean,pythonBin?:string,timeoutMs?:number}} opts
 * @returns {{ok:boolean,page_count:number,pages:Array,stats:Object,warnings:string[]}}
 */
export function runSidecar(pdfPath, opts = {}) {
  const pythonBin = opts.pythonBin || DEFAULT_PYTHON_BIN;
  const timeout = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : SIDECAR_TIMEOUT_MS;
  if (!existsSync(SIDECAR_PATH)) {
    throw new Error("sidecar script missing: " + SIDECAR_PATH);
  }
  const stdinPayload = JSON.stringify({
    pdf_path: pdfPath,
    // dpi=100 is the 4080-sweet-spot: image stays small enough that
    // qwen2.5-vl:7b's vision encoder responds in ~10-20s, while the text
    // is still legible at the small dimensions JM Die prints typically
    // include. Bumped up for higher-fidelity OCR at the cost of latency.
    dpi: Number.isFinite(opts.dpi) ? opts.dpi : 100,
    max_pages: Number.isFinite(opts.maxPages) ? opts.maxPages : 4,
    skip_raster_when_vector: opts.skipRasterWhenVector !== false,
  });
  // stdio:pipe captures stderr so a python traceback surfaces in the throw
  // (reviewer-A P2: spawn failure should carry sidecar's stderr context).
  try {
    const stdout = execFileSync(pythonBin, [SIDECAR_PATH], {
      input: stdinPayload,
      timeout,
      maxBuffer: SIDECAR_MAX_BUFFER,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return JSON.parse(stdout);
  } catch (e) {
    // Attach sidecar stderr to the error message for ops triage.
    const stderr = e && e.stderr ? String(e.stderr).slice(0, 512) : "";
    if (stderr) {
      const msg = (e && e.message ? e.message : String(e)) + " | stderr: " + stderr;
      const wrapped = new Error(msg);
      throw wrapped;
    }
    throw e;
  }
}

/**
 * Call Ollama's /api/generate with an image attached. Returns the model's
 * raw text response, or throws on network error / non-2xx. Caller passes the
 * result to `parseVlmJsonResponse`.
 *
 * Pure-I/O wrapper. No retries — the U-TDP04 benchmark walks each print
 * once; a flaky VLM call surfaces as parseOk:false (FN) on that print, which
 * is the honest answer (do not silently re-roll until success).
 *
 * @param {string} prompt
 * @param {string} pngB64  base64-encoded image (no data: prefix)
 * @param {{ollamaUrl?:string,model?:string,timeoutMs?:number,fetchImpl?:Function}} opts
 * @returns {Promise<string>}  raw response text
 */
export async function callOllamaVlm(prompt, pngB64, opts = {}) {
  const ollamaUrl = opts.ollamaUrl || DEFAULT_OLLAMA_URL;
  const model = opts.model || DEFAULT_VLM_MODEL;
  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : VLM_TIMEOUT_MS;
  // Injected fetch (for tests). Default is the global fetch (node 18+).
  const fetchImpl = typeof opts.fetchImpl === "function" ? opts.fetchImpl : globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("no fetch available; pass opts.fetchImpl for older node");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(ollamaUrl + "/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        images: [pngB64],
        stream: false,
        // keep_alive: lets the model stay warm between successive prints.
        keep_alive: "10m",
        options: {
          // Low temperature for a classification task — we want consistent
          // structured-JSON output, not creative prose.
          temperature: 0.1,
          // Bound output; the JSON schema fits well under 512 tokens.
          num_predict: 512,
        },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error("ollama HTTP " + res.status + " " + res.statusText);
    }
    const j = await res.json();
    if (!j || typeof j.response !== "string") {
      throw new Error("ollama response missing .response string");
    }
    return j.response;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run the full cascade for ONE pdf. Returns the U-TDP04-shaped extraction
 * record plus telemetry. Never throws on a corrupt PDF / unreachable VLM /
 * timeout — every failure becomes a note + empty/partial dimensions, so the
 * benchmark walk keeps moving and scores honestly.
 *
 * @param {{pdf_path:string, part_class:string, ground_truth_dims?:Array}} input
 * @param {{
 *   useVlm?:boolean,
 *   sidecar?:{dpi?:number,maxPages?:number,skipRasterWhenVector?:boolean,timeoutMs?:number,pythonBin?:string},
 *   vlm?:{ollamaUrl?:string,model?:string,timeoutMs?:number,fetchImpl?:Function},
 *   runSidecarImpl?:Function,    // injection seam for hermetic tests
 *   callVlmImpl?:Function,        // injection seam for hermetic tests
 * }} [opts]
 * @returns {Promise<{dimensions:Array,source:string,notes:string[],per_page:Array,raw_kinds:string[]}>}
 */
export async function extractBlueprint(input, opts = {}) {
  const notes = [];
  const perPage = [];
  const rawKinds = new Set();
  const pdfPath = input?.pdf_path;
  if (typeof pdfPath !== "string" || !pdfPath) {
    return {
      dimensions: [], source: "live-cascade",
      notes: ["missing-pdf_path"], per_page: [], raw_kinds: [],
    };
  }

  // -- Stage 0: sidecar --------------------------------------------------
  const runSc = typeof opts.runSidecarImpl === "function" ? opts.runSidecarImpl : runSidecar;
  let sc;
  try {
    sc = runSc(pdfPath, opts.sidecar || {});
  } catch (e) {
    notes.push("sidecar-spawn-failed: " + (e instanceof Error ? e.message : String(e)));
    return { dimensions: [], source: "live-cascade", notes, per_page: [], raw_kinds: [] };
  }
  if (!sc || sc.ok !== true) {
    notes.push("sidecar-ok-false");
    // Defensive: sc.warnings should always be an array when sc is a parsed
    // sidecar JSON, but a future protocol drift / partial JSON would make
    // the spread throw TypeError if not array-guarded.
    if (sc && Array.isArray(sc.warnings)) notes.push(...sc.warnings);
    return { dimensions: [], source: "live-cascade", notes, per_page: [], raw_kinds: [] };
  }
  if (Array.isArray(sc.warnings) && sc.warnings.length > 0) notes.push(...sc.warnings);

  const useVlm = opts.useVlm !== false;
  const callVlm = typeof opts.callVlmImpl === "function" ? opts.callVlmImpl : callOllamaVlm;
  const vlmOpts = opts.vlm || {};
  const prompt = buildVlmPrompt(GT_KINDS);

  // -- Stage 1+2: per page --------------------------------------------------
  const mergedKinds = new Set();
  const sources = new Set();
  for (const page of sc.pages || []) {
    const pageNote = { page: page?.page, vector_kinds: [], vlm_kinds: [], vlm_reason: null, vlm_called: false };

    // Stage 1: vector tokens.
    let vector = null;
    if (Array.isArray(page?.tokens) && page.tokens.length > 0) {
      vector = aggregateTokenSignals(page.tokens);
      pageNote.vector_kinds = vector.dimensions.map((d) => d.kind);
    }

    // Stage 2: VLM (only when there's an image AND vlm is enabled).
    let vlm = null;
    if (useVlm && typeof page?.png_b64 === "string" && page.png_b64.length > 0 && !page.render_failed) {
      pageNote.vlm_called = true;
      try {
        const responseText = await callVlm(prompt, page.png_b64, vlmOpts);
        vlm = parseVlmJsonResponse(responseText, GT_KINDS);
        pageNote.vlm_kinds = vlm.dimensions.map((d) => d.kind);
        pageNote.vlm_reason = vlm.parseOk ? null : vlm.reason;
        for (const k of vlm.raw_kinds || []) rawKinds.add(k);
      } catch (e) {
        pageNote.vlm_reason = "vlm-call-failed: " + (e instanceof Error ? e.message : String(e));
        notes.push("page-" + page?.page + "-vlm-failed: " + pageNote.vlm_reason);
      }
    }

    // Cascade merge per page; accumulate union across pages.
    const merged = mergeStages(vector, vlm);
    for (const d of merged.dimensions) mergedKinds.add(d.kind);
    for (const s of merged.sources) sources.add(s);
    perPage.push(pageNote);
  }

  const allDims = [...mergedKinds].map((kind) => ({ kind, presence_only: true }));
  // Final allowlist filter — belt and suspenders; aggregateTokenSignals and
  // parseVlmJsonResponse already keep within GT_KINDS, but if a future
  // signal source slips a non-GT kind through, this catches it.
  const dimensions = filterToAllowedKinds(allDims);

  // R12 honesty: if nothing was extracted, name why so the operator sees it.
  if (dimensions.length === 0 && notes.length === 0) {
    notes.push("no-kinds-detected");
  }

  return {
    dimensions,
    source: "live-cascade",
    notes,
    per_page: perPage,
    raw_kinds: [...rawKinds],
    stats: sc.stats || null,
    sources: [...sources],
  };
}

/**
 * Pin the VLM in VRAM for the duration of a benchmark walk. The benchmark
 * is a batch process — pay the cold-load once, then warm-inference
 * each print. Returns load_duration_ms for telemetry / null on failure.
 *
 * Pure-I/O. Caller MUST invoke this once before the walk if the VLM is on.
 *
 * @param {{ollamaUrl?:string,model?:string,keepAlive?:string,timeoutMs?:number,fetchImpl?:Function}} [opts]
 * @returns {Promise<{ok:boolean, loadDurationMs:number|null, reason?:string}>}
 */
export async function prewarmVlm(opts = {}) {
  const ollamaUrl = opts.ollamaUrl || DEFAULT_OLLAMA_URL;
  const model = opts.model || DEFAULT_VLM_MODEL;
  const keepAlive = opts.keepAlive || "30m";
  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : VLM_TIMEOUT_MS;
  const fetchImpl = typeof opts.fetchImpl === "function" ? opts.fetchImpl : globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return { ok: false, loadDurationMs: null, reason: "no-fetch-available" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(ollamaUrl + "/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: "x",
        stream: false,
        keep_alive: keepAlive,
        options: { num_predict: 2, temperature: 0 },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false, loadDurationMs: null, reason: "http-" + res.status };
    }
    const j = await res.json();
    return {
      ok: true,
      loadDurationMs: typeof j.load_duration === "number"
        ? Math.round(j.load_duration / 1e6)
        : null,
    };
  } catch (e) {
    return {
      ok: false,
      loadDurationMs: null,
      reason: e instanceof Error ? e.message : String(e),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Build a U-TDP04 extractor adapter — the shape `run-ocr-benchmark.mjs`'s
 * `makeLiveExtractor()` is supposed to produce. Returns an async function
 * the benchmark calls per print.
 *
 * @param {{useVlm?:boolean, sidecar?:Object, vlm?:Object}} [adapterOpts]
 * @returns {(req:{pdf_path:string,part_class:string,ground_truth_dims?:Array}) => Promise<{dimensions:Array,source:string}>}
 */
export function makeCascadeExtractor(adapterOpts = {}) {
  return async (req) => {
    const r = await extractBlueprint(req, adapterOpts);
    // The benchmark only consumes `.dimensions` + `.source`; the richer
    // telemetry (notes, per_page, raw_kinds) is for ops, attached but
    // ignored by the grader.
    return r;
  };
}
