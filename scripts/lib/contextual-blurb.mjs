#!/usr/bin/env node
/**
 * contextual-blurb.mjs — Anthropic Contextual-Retrieval blurb generator.
 *
 * RAG-UPGRADE-MS0 / U-RAG-3 (2026-05-22).
 *
 * Generates a 1-2 sentence context blurb for a piece of content via Ollama's
 * /api/generate endpoint (small instruction-following model — qwen2.5-coder
 * by default). The blurb is intended to be PREPENDED to the chunk text
 * before embedding so the resulting embedding carries document-level context
 * (Anthropic reports −35-49% failed retrieval rate vs raw-chunk embeddings).
 *
 * Pure module: no side effects on import. Fail-soft: every error returns
 * null so the caller can fall back to raw-chunk embedding. The Ollama
 * fetch is injectable for hermetic tests.
 *
 * Sister of `scripts/lib/lexical-rerank.mjs` (the U-RAG-2 reranker) — same
 * pure-pure-pure design, same never-throws contract.
 */

import fs from "node:fs";
import path from "node:path";

export const DEFAULT_OLLAMA_URL = process.env.PRISM_OLLAMA_URL || "http://127.0.0.1:11434";
export const DEFAULT_MODEL = "qwen2.5-coder:32b";
export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_CONTENT_CHARS = 8000;
export const BLURB_VERSION = "v1";

/**
 * Build the prompt — the standard Anthropic Contextual-Retrieval template,
 * scoped to PRISM's mostly-technical corpus (wiki, code, memos).
 */
export function buildBlurbPrompt(content, opts = {}) {
  const maxChars = Number.isFinite(opts.maxContentChars) ? opts.maxContentChars : DEFAULT_MAX_CONTENT_CHARS;
  const safe = String(content == null ? "" : content).slice(0, maxChars);
  return [
    "<content>",
    safe,
    "</content>",
    "",
    "Provide a SHORT (1-2 sentences, ≤200 characters) blurb that names the document type and the most-discriminating topic-keywords of this content. The blurb will be prepended to the content before embedding for retrieval. Do not paraphrase — name what it IS so a future query can find it.",
    "",
    "Output ONLY the blurb. No preamble, no quotes, no commentary.",
  ].join("\n");
}

/**
 * Pure: post-process whatever Ollama returns — strip leading/trailing
 * whitespace + surrounding quotes + leading "Blurb:" / "Summary:" headers,
 * collapse internal whitespace, cap at 200 chars. Empty/non-string → "".
 */
export function sanitizeBlurb(raw) {
  if (typeof raw !== "string") return "";
  let s = raw.trim();
  // Remove a leading label like `Blurb:` or `Summary:` if the model emitted one.
  s = s.replace(/^(?:blurb|summary|context|answer)\s*[:\-—]\s*/i, "");
  // Strip surrounding quotes (single, double, smart).
  s = s.replace(/^["'“‘](.*)["'”’]$/s, "$1").trim();
  s = s.replace(/\s+/g, " ");
  if (s.length > 200) s = s.slice(0, 197).replace(/\s+\S*$/, "") + "…";
  return s;
}

/**
 * Generate a context blurb for `content` via Ollama. Returns the sanitized
 * blurb string on success, or `null` on any failure (Ollama down, timeout,
 * non-200, malformed payload, empty response). Caller decides fallback.
 *
 * @param {string} content
 * @param {{ollamaUrl?:string, model?:string, timeoutMs?:number, maxContentChars?:number, fetchImpl?:Function}} [opts]
 * @returns {Promise<string|null>}
 */
export async function generateBlurb(content, opts = {}) {
  if (typeof content !== "string" || !content.trim()) return null;
  const url = (opts.ollamaUrl || DEFAULT_OLLAMA_URL).replace(/\/$/, "") + "/api/generate";
  const model = opts.model || DEFAULT_MODEL;
  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : DEFAULT_TIMEOUT_MS;
  const fetchImpl = opts.fetchImpl || (typeof fetch === "function" ? fetch : null);
  if (!fetchImpl) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: buildBlurbPrompt(content, opts),
        stream: false,
        options: { num_predict: 80, temperature: 0.2 },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const j = await res.json();
    const out = sanitizeBlurb(j && (j.response || j.text || ""));
    return out || null;
  } catch { return null; }
  finally { clearTimeout(t); }
}

/**
 * Prepend a blurb to text in the canonical "[<blurb>]\n\n<text>" shape. The
 * blurb is bracketed so a retrieval-time consumer can detect + strip it
 * deterministically if needed.
 */
export function prependBlurb(blurb, text) {
  const b = typeof blurb === "string" ? blurb.trim() : "";
  const t = typeof text === "string" ? text : "";
  if (!b) return t;
  return `[${b}]\n\n${t}`;
}

/** Load the on-disk blurb cache (sidecar JSON). Missing → empty cache. */
export function loadBlurbCache(cachePath) {
  if (typeof cachePath !== "string" || !cachePath) return { schemaVersion: "1.0.0", entries: {} };
  try {
    const raw = fs.readFileSync(cachePath, "utf8");
    const j = JSON.parse(raw);
    if (j && typeof j === "object" && j.entries && typeof j.entries === "object") return j;
  } catch { /* missing or corrupt — fall through */ }
  return { schemaVersion: "1.0.0", entries: {} };
}

/** Atomic write of the blurb cache. */
export function saveBlurbCache(cachePath, cache) {
  if (typeof cachePath !== "string" || !cachePath) return false;
  try {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    const tmp = cachePath + ".tmp-" + process.pid;
    fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
    fs.renameSync(tmp, cachePath);
    return true;
  } catch { return false; }
}

/**
 * Read a cache hit if `key` was generated for `mtimeMs`. The mtime is the
 * cache invalidation signal — a wiki file edit increments mtime, so the
 * cached blurb is stale and we re-generate.
 */
export function readCacheHit(cache, key, mtimeMs) {
  if (!cache || !cache.entries) return null;
  const e = cache.entries[key];
  if (!e || typeof e.blurb !== "string") return null;
  if (Number.isFinite(mtimeMs) && Number.isFinite(e.mtimeMs) && e.mtimeMs !== mtimeMs) return null;
  return e.blurb;
}

/** Write a cache entry. Mutates `cache.entries` in place. */
export function writeCacheHit(cache, key, blurb, mtimeMs) {
  if (!cache || !cache.entries || typeof key !== "string" || typeof blurb !== "string") return;
  cache.entries[key] = { blurb, mtimeMs: Number.isFinite(mtimeMs) ? mtimeMs : 0, ts: new Date().toISOString() };
}
