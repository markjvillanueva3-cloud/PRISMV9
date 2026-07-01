#!/usr/bin/env node
// scripts/page-classify.mjs
//
// U-PSGB-XRAY-PAGE-CLASSIFIER — the live actuator for the drawing-vs-paperwork
// page classifier. Given rendered page PNG(s), it asks the GPU-resident VLM a
// CHEAP yes/no ("is this a dimensioned engineering drawing?") and emits a verdict
// per page (extract | skip). Run BEFORE the expensive full OCR extraction to skip
// the non-drawing pages (the overnight corpus was ~76% paperwork by GPU time).
//
// Transport: curl @reqfile to Ollama /api/generate (node fetch fails against
// localhost Ollama under contention — same proven pattern as ocr-closed-loop.mjs).
// Pure logic lives in scripts/lib/page-classifier-lib.mjs (prompt/body/parse/decide);
// this file is the glue (image load + HTTP + report assembly).
//
// SCOPE: input is a RENDERED PAGE PNG — the unit the VLM consumes. PDF→PNG render
// is the existing OCR pipeline's job; this classifier slots in on the rendered
// pages it already produces (no new render dependency here).
//
// USAGE:
//   node scripts/page-classify.mjs --image <page.png> [--min-confidence 0.7] [--json]
//   node scripts/page-classify.mjs --dir <dir-of-pngs> [--report <path>] [--min-confidence 0.7]
//   node scripts/page-classify.mjs --pdf <file.pdf> [--dpi 150] [--max-pages N] [--report <path>]
//       → renders each page (pdf-to-png.py) + classifies; report.extract_pages is the filtered worklist

import { spawnSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { argv, exit, env } from "node:process";
import {
  buildPageClassifierPrompt,
  buildClassifierRequestBody,
  parsePageClassifierResponse,
  decidePageVerdict,
  DEFAULT_VISION_MODEL,
  DEFAULT_CLASSIFIER_TIMEOUT_MS,
} from "./lib/page-classifier-lib.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OLLAMA = (env.OLLAMA_URL || "http://127.0.0.1:11434") + "/api/generate";
const PYTHON = env.PRISM_PYTHON || "H:/Tools/python/python.exe";
const PDF2PNG = join(REPO_ROOT, "scripts", "lib", "pdf-to-png.py");

/**
 * Classify one rendered page PNG via the VLM (curl transport).
 * @returns {{png:string, verdict:string, confident_skip:boolean, classification:(object|null), ms:number, error?:string}}
 */
export function classifyImage(png, opts = {}) {
  const model = opts.model || DEFAULT_VISION_MODEL;
  const minConfidence = opts.minConfidence;
  const timeoutSec = Math.ceil((Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : DEFAULT_CLASSIFIER_TIMEOUT_MS) / 1000);
  const workDir = opts.workDir || join(tmpdir(), "page-classify");
  if (!existsSync(png)) return { png, verdict: "extract", confident_skip: false, classification: null, ms: 0, error: "image not found" };
  mkdirSync(workDir, { recursive: true });

  let b64;
  try { b64 = readFileSync(png).toString("base64"); }
  catch (e) { return { png, verdict: "extract", confident_skip: false, classification: null, ms: 0, error: "read: " + (e instanceof Error ? e.message : String(e)) }; }

  const body = buildClassifierRequestBody(buildPageClassifierPrompt(), b64, { model });
  const reqFile = join(workDir, `clreq-${basename(png)}-${process.pid}.json`);
  writeFileSync(reqFile, JSON.stringify(body));
  const t0 = Date.now();
  const r = spawnSync("curl", ["-s", "--max-time", String(timeoutSec), OLLAMA, "-d", "@" + reqFile], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  const ms = Date.now() - t0;
  try { unlinkSync(reqFile); } catch { /* ignore */ }

  if (r.status !== 0) return { png, verdict: "extract", confident_skip: false, classification: null, ms, error: `curl exit=${r.status}` };
  let raw;
  try { raw = JSON.parse(r.stdout).response || ""; } catch { return { png, verdict: "extract", confident_skip: false, classification: null, ms, error: "ollama response not JSON" }; }
  const parsed = parsePageClassifierResponse(raw);
  if (!parsed.success) {
    // A classifier failure must NOT lose the page — fall through to extraction.
    return { png, verdict: "extract", confident_skip: false, classification: null, ms, error: "parse: " + parsed.error };
  }
  const decision = decidePageVerdict(parsed.classification, { minConfidence });
  return { png, verdict: decision.verdict, confident_skip: decision.confident_skip, classification: parsed.classification, ms, reason: decision.reason };
}

/** Default page-count via pdf-to-png.py --count. Returns {n} or {error}. */
function defaultPageCount(pdfPath) {
  const cnt = spawnSync(PYTHON, [PDF2PNG, pdfPath, "--count"], { encoding: "utf8", timeout: 30000 });
  if (cnt.status !== 0) return { error: "page-count failed: " + ((cnt.stderr || "").trim().slice(0, 120) || `exit=${cnt.status}`) };
  const n = parseInt(String(cnt.stdout || "").trim(), 10);
  if (!Number.isInteger(n) || n < 1) return { error: "bad page count: " + String(cnt.stdout || "").slice(0, 60) };
  return { n };
}

/** Default single-page render via pdf-to-png.py. Returns {ok:true} or {ok:false,error}. */
function defaultRenderPage(pdfPath, png, page, dpi) {
  const r = spawnSync(PYTHON, [PDF2PNG, pdfPath, png, "--page", String(page), "--dpi", String(dpi), "--grayscale"], { encoding: "utf8", timeout: 90000 });
  if (r.status !== 0 || !existsSync(png)) {
    return { ok: false, error: "render: " + ((r.stderr || "").trim().slice(0, 80) || `exit=${r.status}`) };
  }
  return { ok: true };
}

/**
 * Render each page of a PDF and classify it. The classifier slots in on the real
 * corpus this way: the OCR pipeline (run-ollama-vision-extract.mjs) renders TRANSIENT
 * per-page PNGs rather than a persistent dir, so the gate must own the render loop.
 * A page whose RENDER fails is recorded as verdict:"extract" — a render failure must
 * NEVER skip a page (same data-loss-safe bias as classifyImage).
 *
 * pageCount + render are injectable (default to the real pdf-to-png.py spawns) so the
 * render-loop + the render-fail→extract invariant can be unit-tested without Python/Ollama.
 *
 * @param {string} pdfPath
 * @param {{dpi?:number, maxPages?:number, keep?:boolean, classify?:Function, pageCount?:Function,
 *          render?:Function, workDir?:string, model?:string, minConfidence?:number}} [opts]
 * @returns {{pdf:string, page_count?:number, classified_pages?:number, pages:Array<object>, error?:string}}
 */
export function classifyPdf(pdfPath, opts = {}) {
  if (!existsSync(pdfPath)) return { pdf: pdfPath, error: "pdf not found", pages: [] };
  const dpi = Number.isInteger(opts.dpi) && opts.dpi > 0 ? opts.dpi : 150; // classify needs less than the 300dpi extract
  const classify = typeof opts.classify === "function" ? opts.classify : classifyImage;
  const pageCount = typeof opts.pageCount === "function" ? opts.pageCount : defaultPageCount;
  const render = typeof opts.render === "function" ? opts.render : defaultRenderPage;
  const workDir = opts.workDir || join(tmpdir(), "page-classify");
  mkdirSync(workDir, { recursive: true });

  const pc = pageCount(pdfPath);
  if (pc.error) return { pdf: pdfPath, error: pc.error, pages: [] };
  const n = pc.n;

  const limit = Number.isInteger(opts.maxPages) && opts.maxPages > 0 ? Math.min(n, opts.maxPages) : n;
  const pages = [];
  for (let i = 0; i < limit; i++) {
    const png = join(workDir, `pg-${basename(pdfPath)}-${i}-${process.pid}.png`);
    const rr = render(pdfPath, png, i, dpi);
    if (!rr || !rr.ok) {
      // render failure → cannot classify → MUST extract (never skip on failure)
      pages.push({ png: `${basename(pdfPath)}#${i}`, page: i, pdf: basename(pdfPath), verdict: "extract", confident_skip: false, classification: null, ms: 0, error: (rr && rr.error) || "render failed" });
      try { unlinkSync(png); } catch { /* best-effort: clean a partial render */ }
      continue;
    }
    const res = classify(png, opts);
    res.page = i;
    res.pdf = basename(pdfPath);
    pages.push(res);
    if (!opts.keep) { try { unlinkSync(png); } catch { /* ignore */ } }
  }
  return { pdf: pdfPath, page_count: n, classified_pages: pages.length, pages };
}

/**
 * PURE: assemble a report from an array of classifyImage/classifyPdf-page results. No I/O.
 * @param {Array<object>} results
 * @returns {object}
 */
export function buildClassificationReport(results) {
  const arr = Array.isArray(results) ? results : [];
  const total = arr.length;
  const errors = arr.filter((r) => r && r.error).length;
  const classified = total - errors;
  const skip = arr.filter((r) => r && r.verdict === "skip").length;
  const extract = total - skip; // errors fall through to extract by construction
  const byKind = {};
  for (const r of arr) {
    const k = (r && r.classification && r.classification.page_kind) || (r && r.error ? "_error" : "_unknown");
    byKind[k] = (byKind[k] || 0) + 1;
  }
  return {
    total,
    classified,
    errors,
    extract,
    skip,
    // fraction of pages the gate would skip (the GPU-time saved on the full extract)
    skip_rate: total ? +(skip / total).toFixed(4) : 0,
    by_kind: byKind,
    // the actionable filtered worklist (PDF mode): page indices to extract / skip.
    // Only populated for results carrying a .page; errors are extract by construction.
    extract_pages: arr.filter((r) => r && r.verdict !== "skip" && Number.isInteger(r.page)).map((r) => r.page),
    skip_pages: arr.filter((r) => r && r.verdict === "skip" && Number.isInteger(r.page)).map((r) => r.page),
    cases: arr.map((r) => ({
      png: r && r.png ? basename(r.png) : null,
      page: r && Number.isInteger(r.page) ? r.page : null,
      verdict: r ? r.verdict : null,
      page_kind: r && r.classification ? r.classification.page_kind : null,
      confidence: r && r.classification ? r.classification.confidence : null,
      confident_skip: r ? r.confident_skip === true : false,
      ms: r ? r.ms : null,
      error: r && r.error ? r.error : undefined,
    })),
  };
}

function listPngs(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.png$/i.test(e.name))
    .map((e) => join(dir, e.name))
    .sort();
}

async function main() {
  const args = argv.slice(2);
  const get = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
  const image = get("--image", null);
  const dir = get("--dir", null);
  const pdf = get("--pdf", null);
  const model = get("--model", DEFAULT_VISION_MODEL);
  const mcRaw = get("--min-confidence", null);
  const minConfidence = mcRaw != null ? Number(mcRaw) : undefined;
  const dpiRaw = get("--dpi", null);
  const dpi = dpiRaw != null ? parseInt(dpiRaw, 10) : undefined;
  const maxPagesRaw = get("--max-pages", null);
  const maxPages = maxPagesRaw != null ? parseInt(maxPagesRaw, 10) : undefined;
  const jsonOut = args.includes("--json");
  const workDir = join(tmpdir(), "page-classify");

  if (!image && !dir && !pdf) {
    console.error("usage: node scripts/page-classify.mjs (--image <png> | --dir <dir> | --pdf <file>) [--min-confidence 0.7] [--dpi 150] [--max-pages N] [--report <path>] [--json]");
    exit(1);
  }

  const logRes = (res) => {
    const kind = res.classification ? res.classification.page_kind : "—";
    const conf = res.classification ? res.classification.confidence : "—";
    const label = Number.isInteger(res.page) ? `${res.pdf || basename(res.png || "")}#${res.page}` : basename(res.png || "?");
    const tag = res.error ? `ERR ${res.error}` : `${String(res.verdict).toUpperCase()} kind=${kind} conf=${conf}`;
    console.log(`[page-classify] ${label} → ${tag} (${res.ms}ms)`);
  };

  let results;
  if (pdf) {
    console.log(`[page-classify] model=${model} pdf=${basename(pdf)}${minConfidence != null ? ` min-conf=${minConfidence}` : ""}`);
    const out = classifyPdf(pdf, { model, minConfidence, workDir, dpi, maxPages });
    if (out.error) { console.error(`[page-classify] ${out.error}`); exit(2); }
    results = out.pages;
    for (const res of results) logRes(res);
  } else {
    const targets = image ? [image] : listPngs(dir);
    if (targets.length === 0) { console.error(`[page-classify] no PNGs found in ${dir}`); exit(2); }
    console.log(`[page-classify] model=${model} targets=${targets.length}${minConfidence != null ? ` min-conf=${minConfidence}` : ""}`);
    results = [];
    for (const png of targets) {
      const res = classifyImage(png, { model, minConfidence, workDir });
      results.push(res);
      logRes(res);
    }
  }

  const report = buildClassificationReport(results);
  const reportPath = get("--report", image ? null : join(REPO_ROOT, "state", "shared", "page-classify-report.json"));
  if (reportPath) {
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }

  if (jsonOut) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`\n[page-classify] === ${report.classified}/${report.total} classified (${report.errors} error→extract) ===`);
    console.log(`  extract=${report.extract}  skip=${report.skip}  skip_rate=${report.skip_rate}`);
    console.log(`  by_kind: ${JSON.stringify(report.by_kind)}`);
    if (pdf) console.log(`  extract_pages=[${report.extract_pages.join(",")}]  skip_pages=[${report.skip_pages.join(",")}]`);
    if (reportPath) console.log(`  report → ${reportPath}`);
  }
  // Honest exit: every page errored-out → nothing was actually classified.
  exit(report.classified === 0 && report.total > 0 ? 2 : 0);
}

const isMain = argv[1] && fileURLToPath(import.meta.url) === resolve(argv[1]);
if (isMain) main().catch((e) => { console.error("[page-classify] FATAL: " + (e instanceof Error ? e.message : String(e))); exit(1); });
