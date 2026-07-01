#!/usr/bin/env node
/**
 * generate-pdf-tribal-tips-hermes.mjs
 *
 * MAX tribal-knowledge generation from the extracted resources PDF corpus, using
 * the Hermes /learn lane (xAI Grok via the free :8645 OAuth proxy), with an Ollama
 * fallback. Closes the gap left by generate-cad-cam-pdf-tribal-seeds.mjs, which
 * emits POINTER tips only ("PRISM has N PDFs, query via...") because its comment
 * said "full semantic summarization requires Ollama (currently offline)". Ollama
 * AND the Hermes proxy are now UP, so this distills the ACTUAL shop-floor tribal
 * knowledge (settings, gotchas, rules-of-thumb) from each node's text.
 *
 * Input:  state/shared/cad-cam-pdf-nodes/<domain>/<sha8>.json  (each has .text)
 * Output: state/shared/pdf-tribal-tips/tips.jsonl  (one row per node, append-only)
 *         -> ingest into the tribal store (tribal-embed-index) feeds RAG/GNN/LoRA
 *            + tribal-by-domain injection (the PRISM app) downstream.
 *
 * RESUMABLE: done sha8s are derived from the existing tips.jsonl on startup, so a
 * reaper kill mid-corpus just resumes (re-run skips done nodes). FAIL-SOFT per node
 * (a model error logs + skips that node, never aborts the batch).
 *
 * CLI:
 *   node scripts/generate-pdf-tribal-tips-hermes.mjs            # all nodes (Hermes-first)
 *   node scripts/generate-pdf-tribal-tips-hermes.mjs --limit 5  # first 5 (sample)
 *   node scripts/generate-pdf-tribal-tips-hermes.mjs --ollama-only   # skip Hermes
 *   --max-chars N (default 8000)  --max-tokens N (default 600)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Source-agnostic: PRISM_TRIBAL_SOURCE_DIR points the same tribal extractor at ANY
// text-bearing corpus (cad-cam-pdf-nodes, youtube-extraction, video-learned/transcripts,
// future sources); PRISM_TRIBAL_OUT keeps each corpus's tips in its own jsonl.
const NODES_BASE = process.env.PRISM_TRIBAL_SOURCE_DIR ? path.resolve(process.env.PRISM_TRIBAL_SOURCE_DIR) : path.join(ROOT, "state", "shared", "cad-cam-pdf-nodes");
const OUT_DIR = path.join(ROOT, "state", "shared", "pdf-tribal-tips");
const OUT_JSONL = process.env.PRISM_TRIBAL_OUT ? path.resolve(process.env.PRISM_TRIBAL_OUT) : path.join(OUT_DIR, "tips.jsonl");
const HERMES_URL = process.env.PRISM_HERMES_PROXY_URL ?? "http://127.0.0.1:8645/v1";
const HERMES_TOKEN = process.env.PRISM_HERMES_TOKEN ?? "prism";
const HERMES_MODEL = process.env.PRISM_HERMES_MODEL ?? "grok-4";
const OLLAMA_URL = process.env.PRISM_OLLAMA_URL ?? "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.PRISM_TRIBAL_OLLAMA_MODEL ?? "qwen2.5-coder:32b";

const SYSTEM_PROMPT =
  "You are a master CNC machinist + CAD/CAM expert extracting SHOP-FLOOR TRIBAL KNOWLEDGE for a manufacturing AI. " +
  "From the document text, extract 3 to 8 ACTIONABLE tribal tips: specific settings, gotchas, failure modes, " +
  "best practices, and rules-of-thumb an expert would tell an apprentice. Each tip is ONE terse sentence, " +
  "concrete (keep numbers/conditions/material/tool context when present), no fluff, never restate the document title. " +
  "Output ONLY a numbered list (1. 2. 3.) and nothing else. If the text has no real machining/CAD/CAM knowledge " +
  "(e.g. a license page, a UI menu dump), output exactly: NONE";

// ───────────────────────── pure helpers ─────────────────────────

/** The text a node carries (defensive across shapes). */
export function nodeText(node) {
  if (!node || typeof node !== "object") return "";
  if (typeof node.text === "string") return node.text;
  if (typeof node.content === "string") return node.content;
  if (typeof node.transcript === "string") return node.transcript;            // video transcript
  if (typeof node.transcript_summary === "string") return node.transcript_summary; // youtube-extraction
  if (Array.isArray(node.pages)) return node.pages.map((p) => (p && p.text) || "").join("\n");
  if (Array.isArray(node.segments)) return node.segments.map((s) => (s && s.text) || "").join(" ");
  return "";
}

/** Build the user message (title + capped text). */
export function buildUserPrompt(node, maxChars = 8000) {
  const title = (node && (node.title || node.relPath || node.source)) || "(untitled)";
  const dom = [node && node.domain, node && node.software].filter(Boolean).join("/") || "manufacturing";
  const text = nodeText(node).slice(0, maxChars);
  return `DOMAIN: ${dom}\nTITLE: ${title}\n\nTEXT:\n${text}`;
}

/** Parse a numbered/bulleted model reply into clean tip strings. "NONE" -> []. */
export function parseTips(reply) {
  if (typeof reply !== "string") return [];
  const trimmed = reply.trim();
  if (/^none\b/i.test(trimmed)) return [];
  const tips = [];
  for (const raw of trimmed.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    // strip leading "1." / "1)" / "- " / "* " / bullet
    const m = line.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").trim();
    if (m.length < 12) continue;              // too short to be a real tip
    if (/^none$/i.test(m)) continue;
    tips.push(m.replace(/\s+/g, " "));
  }
  return tips.slice(0, 8);
}

/** Should this node be sent to the model at all? (skip near-empty text). */
export function worthExtracting(node, minChars = 200) {
  return nodeText(node).replace(/\s+/g, "").length >= minChars;
}

// ───────────────────────── impure I/O ─────────────────────────

/** Exclude meta/sidecar files that are not corpus documents. */
function isCorpusJson(name) {
  return name.endsWith(".json") && !name.startsWith("_") && !name.includes("fallback") && name !== "learning-registry.json";
}

/** Collect corpus *.json from NODES_BASE: both flat files AND one level of subdirs
 *  (pdf-nodes are domain/<sha>.json; youtube-extraction is flat <id>.json). */
function listNodeFiles() {
  const out = [];
  let entries = [];
  try { entries = fs.readdirSync(NODES_BASE, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.isFile() && isCorpusJson(e.name)) {
      out.push(path.join(NODES_BASE, e.name));
    } else if (e.isDirectory()) {
      const dir = path.join(NODES_BASE, e.name);
      let files = [];
      try { files = fs.readdirSync(dir); } catch { continue; }
      for (const f of files) if (isCorpusJson(f)) out.push(path.join(dir, f));
    }
  }
  return out.sort();
}

/** Resume set: sha8s already in tips.jsonl. */
function loadDoneSet() {
  const done = new Set();
  if (!fs.existsSync(OUT_JSONL)) return done;
  for (const line of fs.readFileSync(OUT_JSONL, "utf-8").split("\n")) {
    if (!line.trim()) continue;
    try { const r = JSON.parse(line); if (r && r.sha8) done.add(r.sha8); } catch { /* tolerate a torn last line */ }
  }
  return done;
}

async function callHermes(userPrompt, maxTokens, timeoutMs = 60000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${HERMES_URL}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": `Bearer ${HERMES_TOKEN}` },
      body: JSON.stringify({ model: HERMES_MODEL, messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }], temperature: 0.2, max_tokens: maxTokens, stream: false }),
      signal: ctrl.signal,
    });
    if (!r.ok) return { ok: false, err: `hermes http ${r.status}` };
    const j = await r.json();
    const content = j?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) return { ok: false, err: "hermes empty content" };
    return { ok: true, content, model: j?.model || HERMES_MODEL, via: "hermes" };
  } catch (e) {
    return { ok: false, err: `hermes ${e.name === "AbortError" ? "timeout" : e.message}` };
  } finally { clearTimeout(t); }
}

async function callOllama(userPrompt, maxTokens, timeoutMs = 120000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }], stream: false, options: { temperature: 0.2, num_predict: maxTokens } }),
      signal: ctrl.signal,
    });
    if (!r.ok) return { ok: false, err: `ollama http ${r.status}` };
    const j = await r.json();
    const content = j?.message?.content;
    if (typeof content !== "string" || content.length === 0) return { ok: false, err: "ollama empty content" };
    return { ok: true, content, model: OLLAMA_MODEL, via: "ollama" };
  } catch (e) {
    return { ok: false, err: `ollama ${e.name === "AbortError" ? "timeout" : e.message}` };
  } finally { clearTimeout(t); }
}

async function main() {
  const args = process.argv.slice(2);
  const limArg = args.indexOf("--limit");
  const limit = limArg >= 0 ? Number(args[limArg + 1]) : Infinity;
  const maxCharsArg = args.indexOf("--max-chars");
  const maxChars = maxCharsArg >= 0 ? Number(args[maxCharsArg + 1]) : 8000;
  const maxTokArg = args.indexOf("--max-tokens");
  const maxTokens = maxTokArg >= 0 ? Number(args[maxTokArg + 1]) : 600;
  const ollamaOnly = args.includes("--ollama-only");
  const concArg = args.indexOf("--concurrency");
  const concurrency = Math.max(1, Math.min(16, concArg >= 0 ? Number(args[concArg + 1]) : 4));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const files = listNodeFiles();
  const done = loadDoneSet();
  let attempted = 0, wrote = 0, skippedDone = 0, skippedThin = 0, failed = 0, totalTips = 0;
  const t0 = Date.now();

  // CONCURRENCY: an N-worker pool over a shared file index. Single-threaded JS so
  // the shared idx/counters never race; appendFileSync is atomic per call. The
  // Blackwell GPU handles ~8 concurrent Ollama calls -> turns the 30h serial run
  // into ~1-2h. Each worker pulls the next file, extracts, appends. Resumable.
  let idx = 0;
  async function processOne(file) {
    let node;
    try { node = JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return { skip: "parse" }; }
    const sha8 = node && node.sha8 ? node.sha8 : path.basename(file, ".json");
    if (done.has(sha8)) return { skip: "done" };
    if (!worthExtracting(node)) return { skip: "thin" };
    const userPrompt = buildUserPrompt(node, maxChars);
    let res = ollamaOnly ? { ok: false } : await callHermes(userPrompt, maxTokens);
    if (!res.ok) res = await callOllama(userPrompt, maxTokens);
    if (!res.ok) return { fail: res.err, sha8 };
    const tips = parseTips(res.content);
    if (tips.length === 0) return { skip: "notips" };
    return { row: { sha8, domain: node.domain || null, software: node.software || null, title: node.title || node.relPath || null, source: node.relPath || node.source || null, tipCount: tips.length, tips, model: res.model, via: res.via, generatedAt: new Date().toISOString() } };
  }
  async function worker() {
    while (wrote < limit) {
      const file = files[idx++];
      if (file === undefined) return;
      const r = await processOne(file);
      if (r.skip === "done") { skippedDone++; continue; }
      if (r.skip === "thin") { skippedThin++; continue; }
      if (r.skip === "parse") continue;
      attempted++;
      if (r.skip === "notips") continue;
      if (r.fail) { failed++; if (failed <= 5) process.stderr.write(`[fail ${r.sha8}] ${r.fail}\n`); continue; }
      fs.appendFileSync(OUT_JSONL, JSON.stringify(r.row) + "\n", "utf-8");
      wrote++; totalTips += r.row.tipCount;
      if (wrote % 50 === 0) process.stderr.write(`[progress] wrote=${wrote} tips=${totalTips} failed=${failed} (${Math.round((Date.now() - t0) / 1000)}s)\n`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  console.log(JSON.stringify({ ok: true, nodeFiles: files.length, attempted, wrote, totalTips, skippedDone, skippedThin, failed, outJsonl: OUT_JSONL.replace(ROOT + path.sep, "") }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(String(e && e.message ? e.message : e)); process.exit(1); });
}
