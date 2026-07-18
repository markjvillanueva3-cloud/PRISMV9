#!/usr/bin/env node
/**
 * lathe-tribal-ollama-ingest.mjs -- slot:whiskey  [U-W6: max lathe tribal]
 * ==========================================================================
 * Resumable, $0-Claude lathe tribal ingestion. For each lathe/turning PDF:
 *   pypdf text (portable python) -> Ollama qwen2.5-coder:32b tip extraction
 *   -> append structured tips to state/shared/lathe-tribal-corpus.jsonl.
 *   IMAGE-HEAVY PDFs (catalogs, Siemens cycle docs) that pypdf can't read fall
 *   back to a VISION route: PyMuPDF raster -> local vision model (qwen2.5vl) ->
 *   transcription -> the SAME tip-extraction step. The corpus is auto-DISCOVERED
 *   across the verified lathe roots (lathe-tribal-corpus-discover.mjs), not a
 *   hard-coded list -- "all means all" + rot-proof.
 *
 * The heavy work runs in Ollama (local, free) -- Claude never sees the PDF
 * text (route-doctrine: NEVER read whole PDFs into Claude context). Reuses the
 * tested scripts/lib/harness-last-json.mjs to parse the model's JSON envelope.
 *
 * Resumable: skips any source already present as kind="extracted-tip".
 *
 * Usage:
 *   node scripts/lathe-tribal-ollama-ingest.mjs "<pdf>"        # one source
 *   node scripts/lathe-tribal-ollama-ingest.mjs --all [--limit N]
 *   node scripts/lathe-tribal-ollama-ingest.mjs --all --max-chars 24000
 *   node scripts/lathe-tribal-ollama-ingest.mjs --all --vision-model qwen2.5vl:7b --vision-pages 4
 *   flags: --no-vision (skip vision fallback) · --no-discover (curated seed only)
 */
import { readFileSync, appendFileSync, existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lastJson } from "./lib/harness-last-json.mjs";
import { discoverLathePdfs, LATHE_PDF_ROOTS } from "./lib/lathe-tribal-corpus-discover.mjs";
import { selectVisionPages } from "./lib/lathe-vision-page-select.mjs";

const REPO = resolve(fileURLToPath(import.meta.url), "..", "..");
const CORPUS = join(REPO, "state", "shared", "lathe-tribal-corpus.jsonl");
const PY = "H:/Tools/python/python.exe";
const MODEL = "qwen2.5-coder:32b";
const OLLAMA_TIMEOUT_MS = 300_000;
// Vision fallback for image-heavy PDFs (catalogs / Siemens cycle docs).
const VISION_MODEL_DEFAULT = "qwen2.5vl:7b";   // fast + Blackwell-resident; --vision-model overrides
const VISION_PAGES_DEFAULT = 4;                // pages rasterized per PDF; --vision-pages overrides
const SHORT_TEXT_FLOOR = 40;                   // pypdf text >= this (but <200) is still extracted, not discarded

// Curated SEED of verified lathe/turning PDFs (Glob-confirmed 2026-06-26).
// At runtime this is UNIONED with auto-discovery over LATHE_PDF_ROOTS (~129 PDFs)
// unless --no-discover is passed. The seed guarantees the highest-value sources
// are always queued even if a root dir moves.
const LATHE_PDFS = [
  "resources/RESOURCE PDFS/Okuma-OSP-P200L-Programming.pdf",
  "resources/RESOURCE PDFS/G76 Threading Cycle for CNC Lathes (Fanuc).pdf",
  "resources/cimco-2026/CIMCOEdit/Templates/Attachments/Siemens_Turning_CYCLE93_Grooving.pdf",
  "resources/cimco-2026/CIMCOEdit/Templates/Attachments/Siemens_Turning_CYCLE95_Stock Removal.pdf",
  "resources/cimco-2026/CIMCOEdit/Templates/Attachments/Siemens_Turning_CYCLE97_Threading Cycle.pdf",
  "resources/MANUFACTURER_CATALOGS/uploaded/korloy turning.pdf",
  "resources/MANUFACTURER_CATALOGS/uploaded/Turning 2018.1.pdf",
  "resources/MANUFACTURER_CATALOGS/uploaded/pulled-2026-05-29/sumitomo-turning-ac6020.pdf",
  "resources/MANUFACTURER_CATALOGS/uploaded/pulled-2026-05-29/horn-turning-cutting-data.pdf",
  "resources/MANUFACTURER_CATALOGS/uploaded/pulled-2026-05-29/ingersoll-turning-tech.pdf",
  "resources/MANUFACTURER_CATALOGS/uploaded/pulled-2026-05-29/mitsubishi-materials-turning-c009e.pdf",
  "resources/MANUFACTURER_CATALOGS/uploaded/pulled-2026-05-29/schwanog-id-grooving-turning.pdf",
];

function args() {
  const a = { all: false, limit: 1, maxChars: 10000, pdf: null, vision: true, visionModel: VISION_MODEL_DEFAULT, visionPages: VISION_PAGES_DEFAULT, discover: true, list: false };
  for (let i = 2; i < process.argv.length; i++) {
    const t = process.argv[i];
    if (t === "--all") a.all = true;
    else if (t === "--list") a.list = true;
    else if (t === "--limit") a.limit = parseInt(process.argv[++i], 10) || a.limit;
    else if (t === "--max-chars") a.maxChars = parseInt(process.argv[++i], 10) || a.maxChars;
    else if (t === "--no-vision") a.vision = false;
    else if (t === "--vision-model") a.visionModel = process.argv[++i] || a.visionModel;
    else if (t === "--vision-pages") a.visionPages = parseInt(process.argv[++i], 10) || a.visionPages;
    else if (t === "--no-discover") a.discover = false;
    else if (!t.startsWith("--")) a.pdf = t;
  }
  return a;
}

// Recursive PDF lister for one repo-relative root -> repo-relative paths (fail-soft).
function listRepoPdfs(rootRel) {
  const absRoot = join(REPO, rootRel);
  if (!existsSync(absRoot)) return [];
  let entries;
  try { entries = readdirSync(absRoot, { recursive: true }); } catch { return []; }
  return entries
    .filter((e) => typeof e === "string" && e.toLowerCase().endsWith(".pdf"))
    .map((e) => `${rootRel}/${e.replace(/\\/g, "/")}`);
}

// Curated seed UNIONED with auto-discovery (deduped, seed first).
function corpusList(useDiscover) {
  const seed = LATHE_PDFS.slice();
  if (!useDiscover) return seed;
  const seen = new Set(seed.map((p) => p.replace(/\\/g, "/").toLowerCase()));
  for (const d of discoverLathePdfs(LATHE_PDF_ROOTS, listRepoPdfs)) {
    const key = d.replace(/\\/g, "/").toLowerCase();
    if (!seen.has(key)) { seed.push(d); seen.add(key); }
  }
  return seed;
}

function slugOf(p) { return p.toLowerCase().replace(/[\\/]/g, "_").replace(/[^a-z0-9_]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, ""); }

function alreadyDone() {
  const done = new Set();
  if (!existsSync(CORPUS)) return done;
  for (const line of readFileSync(CORPUS, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { const r = JSON.parse(line); if ((r.kind === "extracted-tip" || r.kind === "skipped") && r.source) done.add(r.source); } catch { /* skip */ }
  }
  return done;
}

function pdfText(absPath, maxChars) {
  const py = `import sys,pypdf\nr=pypdf.PdfReader(sys.argv[1])\no=[];t=0\nfor p in r.pages:\n x=p.extract_text() or ''\n o.append(x);t+=len(x)\n if t>${maxChars}:break\nsys.stdout.write(('\\n'.join(o))[:${maxChars}])`;
  const r = spawnSync(PY, ["-c", py, absPath], { encoding: "utf8", timeout: 120000, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? (r.stdout || "") : "";
}

// --- Vision fallback: rasterize PDF pages -> local vision model -> transcription.
// The transcription text feeds the SAME extractTips() step ($0-Claude). curl is
// used (node fetch is broken for localhost Ollama on this host).
// Cheap page count (fitz open, NO rendering) so the JS-side selector can DISTRIBUTE the
// vision-page budget across the whole document instead of rasterizing only the first N.
function pageCountOf(absPath) {
  const py = `import sys,fitz\nsys.stdout.write(str(fitz.open(sys.argv[1]).page_count))`;
  const r = spawnSync(PY, ["-c", py, absPath], { encoding: "utf8", timeout: 60000, windowsHide: true, maxBuffer: 1024 * 1024 });
  if (r.status !== 0) return 0;
  const n = parseInt((r.stdout || "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// Rasterize the GIVEN 0-based page indices (NOT the first N) -- the selector spreads them
// across the doc so a vendor catalog's body tables (insert/grade/feed-speed), not just its
// cover + TOC, reach the vision model. Python clamps each index to the real page_count.
function rasterizePdfPages(absPath, indices) {
  if (!Array.isArray(indices) || !indices.length) return [];
  const py = `import sys,base64,json,fitz\n` +
    `doc=fitz.open(sys.argv[1]); idx=json.loads(sys.argv[2]); mat=fitz.Matrix(2,2); out=[]\n` +
    `for i in idx:\n if isinstance(i,int) and 0<=i<doc.page_count:\n  out.append(base64.b64encode(doc[i].get_pixmap(matrix=mat).tobytes("png")).decode())\n` +
    `sys.stdout.write(json.dumps(out))`;
  const r = spawnSync(PY, ["-c", py, absPath, JSON.stringify(indices)], { encoding: "utf8", timeout: 120000, windowsHide: true, maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) return [];
  try { const arr = JSON.parse(r.stdout || "[]"); return Array.isArray(arr) ? arr : []; } catch { return []; }
}

function transcribePage(b64, model) {
  const prompt = "You are transcribing a CNC LATHE / turning reference page (manual, tool catalog, or controller cycle doc). " +
    "Output ALL readable text, table values, cutting-data numbers, parameter names, G-code/cycle references, and machining notes as PLAIN TEXT. " +
    "Preserve numbers and units exactly. No commentary, no markdown.";
  const payload = JSON.stringify({ model, prompt, images: [b64], stream: false, keep_alive: "10m", options: { temperature: 0.1, num_ctx: 8192, num_predict: 1800 } });
  const cr = spawnSync("curl", ["-s", "-m", "280", "http://127.0.0.1:11434/api/generate", "-H", "content-type: application/json", "-d", "@-"], { input: payload, encoding: "utf8", timeout: OLLAMA_TIMEOUT_MS, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  if (cr.status !== 0) throw new Error(`vision curl exit ${cr.status}: ${(cr.stderr || "").slice(0, 120)}`);
  let body = null;
  try { body = JSON.parse(cr.stdout); } catch { return cr.stdout || ""; }
  // Ollama returns HTTP 200 + {"error":"model ... not found"} for a config error -- that is
  // DETERMINISTIC-but-fixable, NOT "no text". Throw so it propagates as retriable (no permanent skip).
  if (body && body.error) throw new Error(`vision model error: ${String(body.error).slice(0, 120)}`);
  return body && typeof body.response === "string" ? body.response : "";
}

async function pdfVisionText(absPath, maxChars, model, pages) {
  const total = pageCountOf(absPath);
  // Distribute the budget across the whole doc; if the count probe failed (status!=0), fall back
  // to the first `pages` (old behavior -- python clamps to page_count) so we NEVER regress to zero.
  const indices = total > 0
    ? selectVisionPages(total, pages)
    : Array.from({ length: Math.max(1, pages | 0) }, (_, i) => i);
  const imgs = rasterizePdfPages(absPath, indices);
  if (!imgs.length) return "";
  const parts = [];
  for (const b64 of imgs) {
    const t = transcribePage(b64, model);  // throws on transient curl failure -> propagates (retriable)
    if (t && t.trim()) parts.push(t.trim());
  }
  return parts.join("\n").slice(0, maxChars);
}

async function extractTips(text, sourceName) {
  const prompt = `You are an expert CNC LATHE / turning machinist and Okuma OSP / Fanuc / Siemens programmer. ` +
    `From the following manual/catalog text, extract concise, ACTIONABLE shop-floor tribal tips for lathe/turning ` +
    `(G-codes, cycles, speeds/feeds, tool/insert selection, threading, grooving, parting, boring, workholding, safety). ` +
    `Each tip = one specific fact a machinist would value. Ignore boilerplate/legal/TOC. ` +
    `Respond with ONLY a JSON object: {"tips":[{"tip":"...","topic":"..."}]} (max 15 tips, no prose).\n\nTEXT (${sourceName}):\n` +
    text.slice(0, 24000);
  // Call Ollama via curl (proven on this host; node/undici fetch fails on localhost here).
  // Payload via stdin (@-) to dodge Windows arg-length limits on the ~10K-char prompt.
  const payload = JSON.stringify({ model: MODEL, prompt, stream: false, keep_alive: "15m", options: { temperature: 0.2, num_ctx: 8192, num_predict: 2048 } });
  const cr = spawnSync("curl", ["-s", "-m", "280", "http://127.0.0.1:11434/api/generate", "-H", "content-type: application/json", "-d", "@-"], { input: payload, encoding: "utf8", timeout: OLLAMA_TIMEOUT_MS, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  if (cr.status !== 0) throw new Error(`curl exit ${cr.status}: ${(cr.stderr || "").slice(0, 150)}`);
  let body = null;
  try { body = JSON.parse(cr.stdout); } catch { /* non-JSON -> treat stdout as raw below */ }
  if (body && body.error) throw new Error(`ollama error: ${String(body.error).slice(0, 140)}`);  // config/transient, NOT empty tips
  const resp = body && typeof body.response === "string" ? body.response : (cr.stdout || "");
  const parsed = lastJson(resp);
  const tips = parsed && Array.isArray(parsed.tips) ? parsed.tips : [];
  return tips.filter((t) => t && typeof t.tip === "string" && t.tip.trim().length > 8);
}

function markSkipped(abs, relPath, reason) {
  // Append a "skipped" marker so the resumable cursor (alreadyDone) advances past
  // DETERMINISTIC failures (missing / no-text image-heavy). Ollama errors are NOT
  // marked -- they are transient and must stay retriable.
  appendFileSync(CORPUS, JSON.stringify({
    ts: new Date().toISOString(), schemaVersion: "1.0.0", domain: "lathe",
    slug: slugOf(relPath), id: relPath, kind: "skipped", source: abs,
    reason, audience: "whiskey", advisory: true,
  }) + "\n");
}

async function ingestOne(relPath, maxChars, opts = {}) {
  const abs = join(REPO, relPath).replace(/\//g, "\\");
  if (!existsSync(abs)) { markSkipped(abs, relPath, "missing"); return { source: abs, ok: false, reason: "missing (marked skipped)", tips: 0 }; }
  let text = pdfText(abs, maxChars);
  const pdfLen = text.trim().length;
  let via = "pdf";
  if (pdfLen < 200) {
    // pypdf got little/no usable text -> image-heavy PDF. Try the VISION route unless disabled.
    if (opts.vision === false) {
      if (pdfLen >= SHORT_TEXT_FLOOR) { via = "pdf-short"; }  // some real (terse) text -> still extract, don't discard
      else { markSkipped(abs, relPath, "no-text-image-heavy-vision-disabled"); return { source: abs, ok: false, reason: "no-text (vision disabled, marked skipped)", tips: 0 }; }
    } else {
      try {
        const vt = await pdfVisionText(abs, maxChars, opts.visionModel || VISION_MODEL_DEFAULT, opts.visionPages || VISION_PAGES_DEFAULT);
        if (vt.trim().length >= 200) { text = vt; via = "pdf-vision"; }
        else if (pdfLen >= SHORT_TEXT_FLOOR) { via = "pdf-short"; }  // vision added little, but pypdf had real terse text -> use it
        else { markSkipped(abs, relPath, "no-text-vision-empty"); return { source: abs, ok: false, reason: "no-text + vision yielded nothing (marked skipped)", tips: 0 }; }
      } catch (e) {
        // Transient (GPU busy / curl / model-not-found) -- do NOT markSkipped; stays retriable on the next fire.
        return { source: abs, ok: false, reason: `vision transient: ${String(e.message || e).slice(0, 120)}`, tips: 0, retriable: true };
      }
    }
  }
  let tips;
  try { tips = await extractTips(text, relPath.split(/[\\/]/).pop()); }
  catch (e) { return { source: abs, ok: false, reason: String(e.message || e), tips: 0 }; }
  const ts = new Date().toISOString();
  const slug = slugOf(relPath);
  const extractedBy = via === "pdf-vision" ? `ollama:${opts.visionModel || VISION_MODEL_DEFAULT}+${MODEL}` : `ollama:${MODEL}`;
  let n = 0;
  for (const t of tips) {
    appendFileSync(CORPUS, JSON.stringify({
      ts, schemaVersion: "1.0.0", domain: "lathe", slug, id: relPath,
      kind: "extracted-tip", source: abs, source_type: via,
      tip: t.tip.trim(), topic: (t.topic || "lathe").toString().slice(0, 60),
      extracted_by: extractedBy, audience: "whiskey", advisory: true,
    }) + "\n");
    n++;
  }
  return { source: abs, ok: true, tips: n, via };
}

const a = args();
const done = alreadyDone();
const corpus = a.pdf ? [a.pdf] : corpusList(a.discover);
const queue = corpus.filter((p) => !done.has(join(REPO, p).replace(/\//g, "\\")));
if (a.list) {
  console.log(JSON.stringify({ ok: true, corpus_size: corpus.length, already_done: done.size, remaining: queue.length, sample: queue.slice(0, 20) }, null, 2));
  process.exit(0);
}
const todo = a.all ? queue.slice(0, a.limit) : queue.slice(0, 1);
const results = [];
for (const p of todo) results.push(await ingestOne(p, a.maxChars, a));
const totalTips = results.reduce((s, r) => s + r.tips, 0);
console.log(JSON.stringify({ ok: true, processed: results.length, tips_added: totalTips, corpus_size: corpus.length, already_done: done.size, remaining: queue.length - todo.length, results }, null, 2));
