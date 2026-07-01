#!/usr/bin/env node
// scripts/probe-vision-model.mjs
//
// U-XRAY-VISION-PROBE -- empirically test ANY vision model on a REAL print, bypassing the
// isThinkingTrap() pre-filter that the ensemble + bench-vision-ocr-ab use. Built because that filter
// ASSUMES any non-"-instruct" qwen3-vl tag is a thinking-trap and refuses to even run it, so there was
// no way to answer the zulu ladder work-order's empirical question: "is bare qwen3-vl:32b actually
// JSON-safe on a blueprint, or does it leak <think>?" This probe runs the model directly + reports
// (a) thinking-trap? (b) dims extracted (vs the 2-model ensemble that FAILED on this exact print).
//
// Reuses (does NOT reimplement): buildVisionPrompt / buildOllamaRequestBody / parseVisionResponse
// (ollama-vision-extract-lib) + the curl @reqfile transport (node fetch fails against Ollama, per
// page-classify.mjs). Diagnostic CLI -- no dispatcher wiring (sibling of page-classify.mjs).
//
// USAGE:
//   node scripts/probe-vision-model.mjs --model qwen3-vl:32b --pdf "H:/PRISM/Docustrata/Unfiled/D22706-12.pdf"
//        [--page 0] [--part-class generic] [--dpi 300] [--timeout-sec 600] [--no-format-json] [--json]
// EXIT: 0 = probed (verdict emitted) · 2 = render/curl failure · 3 = args error.

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, rmSync } from "node:fs";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { argv, exit, env, pid } from "node:process";

import { buildVisionPrompt, buildOllamaRequestBody, parseVisionResponse } from "./lib/ollama-vision-extract-lib.mjs";
import { buildReadingGuidanceBlock } from "./lib/blueprint-reading-knowledge.mjs";

const PYTHON = env.PRISM_PYTHON || "H:/Tools/python/python.exe";
const PDF2PNG = "H:/prism/scripts/lib/pdf-to-png.py";
const OLLAMA = (env.OLLAMA_URL || "http://127.0.0.1:11434") + "/api/generate";

/**
 * Pure: does a raw model response leak chain-of-thought (the "thinking-trap" failure)? A thinking
 * model emits <think>...</think> (or <reasoning>) prose instead of / around the answer, which breaks
 * JSON extraction. Definitive signal = the explicit tags. Returns true if present. (A model run with
 * format:"json" grammar constraint cannot emit these, so a false here under format-json means the
 * model is grammar-safe regardless of its default thinking behavior.)
 * @param {string} rawText
 * @returns {boolean}
 */
export function detectThinkingTrap(rawText) {
  const t = String(rawText == null ? "" : rawText);
  return /<\/?think\s*>/i.test(t) || /<\/?reasoning\s*>/i.test(t);
}

function parseArgs(args) {
  const get = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
  const has = (f) => args.includes(f);
  const num = (f, d) => { const v = Number(get(f, d)); return Number.isFinite(v) ? v : d; };
  return {
    model: get("--model", null),
    pdf: get("--pdf", null),
    png: get("--png", null),
    page: Math.max(0, num("--page", 0)),
    partClass: get("--part-class", "generic"),
    dpi: String(num("--dpi", 300)),
    timeoutSec: Math.max(30, num("--timeout-sec", 600)),
    formatJson: !has("--no-format-json"), // production uses format:"json"; --no-format-json sees raw think-leak
    enhance: has("--enhance"),            // apply pdf-to-png --preprocess --deskew (scan cleanup) before OCR
    rawOut: get("--raw-out", null),       // write the full raw model response to this path (root-cause debugging)
    readingGuidance: has("--reading-guidance"), // U-XRAY-READING-KNOWLEDGE: append the curated tribal+Y14.5 reading block
    numPredict: Math.max(0, num("--num-predict", 0)), // 0 = lib default (4096); >0 raises the output cap (couples num_ctx)
    json: has("--json"),
  };
}

function renderPage(pdf, png, page, dpi, enhance) {
  const args = [PDF2PNG, pdf, png, "--page", String(page), "--dpi", String(dpi), "--grayscale"];
  if (enhance) args.push("--preprocess", "--deskew"); // existing scan cleanup in pdf-to-png.py (Otsu+despeckle+deskew)
  const r = spawnSync(PYTHON, args, { encoding: "utf8", timeout: 120000, windowsHide: true });
  return r.status === 0 && existsSync(png);
}

function main() {
  const o = parseArgs(argv.slice(2));
  if (!o.model || (!o.pdf && !o.png)) { console.error("ERROR: --model and (--pdf|--png) required"); return 3; }

  const workDir = join(tmpdir(), `vision-probe-${pid}`);
  mkdirSync(workDir, { recursive: true });
  let png = o.png;
  if (o.pdf) {
    png = join(workDir, `probe-${basename(o.pdf)}-p${o.page}.png`);
    if (!renderPage(o.pdf, png, o.page, o.dpi, o.enhance)) { console.error(`ERROR: render failed for ${o.pdf} p${o.page}`); return 2; }
  }
  if (!existsSync(png)) { console.error(`ERROR: image not found: ${png}`); return 2; }

  const b64 = readFileSync(png).toString("base64");
  const readingGuidance = o.readingGuidance ? buildReadingGuidanceBlock({ partClass: o.partClass }) : "";
  const prompt = buildVisionPrompt(o.partClass, { readingGuidance });
  // --num-predict raises the output token cap; num_ctx MUST scale with it (input vision-tokens + prompt +
  // the larger output must fit), else the context overflows. Couple num_ctx = max(8192, 2 x num_predict).
  const modelOptions = o.numPredict > 0 ? { num_predict: o.numPredict, num_ctx: Math.max(8192, o.numPredict * 2) } : undefined;
  const body = buildOllamaRequestBody(prompt, b64, { model: o.model, format: o.formatJson ? "json" : undefined, ...(modelOptions ? { modelOptions } : {}) });
  const reqFile = join(workDir, `req-${pid}.json`);
  writeFileSync(reqFile, JSON.stringify(body));

  const t0 = Date.now();
  const r = spawnSync("curl", ["-s", "--max-time", String(o.timeoutSec), OLLAMA, "-d", "@" + reqFile],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const ms = Date.now() - t0;
  try { unlinkSync(reqFile); } catch { /* ignore */ }
  try { rmSync(workDir, { recursive: true, force: true }); } catch { /* ignore */ }

  if (r.status !== 0) { console.error(`ERROR: curl exit=${r.status} (${(r.stderr || "").slice(0, 120)})`); return 2; }
  let raw;
  try { raw = JSON.parse(r.stdout).response || ""; } catch { console.error("ERROR: ollama response not JSON"); return 2; }

  if (o.rawOut) { try { writeFileSync(o.rawOut, raw); } catch { /* best-effort debug dump */ } }
  const thinkingTrap = detectThinkingTrap(raw);
  // parseVisionResponse returns {success, error, extraction:{dimensions,...}} -- the dims live under
  // extraction.dimensions, NOT a top-level .dimensions (the earlier probe read the wrong key and
  // mis-reported 0 dims for every model; fixed 2026-06-19).
  const parsed = parseVisionResponse(raw, {});
  const ex = parsed && parsed.success && parsed.extraction ? parsed.extraction : null;
  const dims = ex && Array.isArray(ex.dimensions) ? ex.dimensions : [];
  const result = {
    model: o.model,
    source: o.pdf || o.png,
    page: o.page,
    format_json: o.formatJson,
    enhance: o.enhance,
    ms,
    raw_len: raw.length,
    thinking_trap: thinkingTrap,
    parse_ok: !!(parsed && parsed.success),
    parse_error: parsed && parsed.success ? null : (parsed ? parsed.error : "no parse"),
    dims_extracted: dims.length,
    gdt_count: ex && Array.isArray(ex.gdt) ? ex.gdt.length : 0,
    sample_dims: dims.slice(0, 6).map((d) => ({ value: d.value ?? d.nominal ?? d.value_mm, unit: d.unit, type: d.type })),
  };
  if (o.json) { console.log(JSON.stringify(result, null, 2)); return 0; }
  console.log(`\n=== vision-probe: ${o.model} on ${basename(String(o.pdf || o.png))} p${o.page} (format:${o.formatJson ? "json" : "raw"}) ===`);
  console.log(`  latency        : ${(ms / 1000).toFixed(1)}s   raw_len=${raw.length}`);
  console.log(`  thinking_trap  : ${thinkingTrap ? "YES (leaks <think>/<reasoning>) -- NOT JSON-safe" : "no (clean)"}`);
  console.log(`  parse_ok       : ${result.parse_ok}${result.parse_error ? " (" + result.parse_error + ")" : ""}`);
  console.log(`  dims_extracted : ${dims.length}   gdt: ${result.gdt_count}`);
  if (dims.length) console.log(`  sample         : ${JSON.stringify(result.sample_dims)}`);
  if (!dims.length && !thinkingTrap) console.log(`  raw head       : ${raw.slice(0, 200).replace(/\n/g, " ")}`);
  return 0;
}

if (argv[1] && (argv[1].endsWith("probe-vision-model.mjs"))) {
  try { exit(main()); } catch (e) { console.error("FATAL:", e instanceof Error ? e.stack : String(e)); exit(3); }
}
