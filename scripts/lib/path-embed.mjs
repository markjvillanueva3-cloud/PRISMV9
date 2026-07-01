#!/usr/bin/env node
// scripts/lib/path-embed.mjs — WORKING-PATH-CAPTURE-MS0 / U-WPC-ACCEL-KNN (alpha, 2026-05-31).
//
// Acceleration Lever 1 (the biggest): kNN path-MEMOIZATION. Embeds a goal query + candidate
// working-paths' goals into a vector space and ranks by cosine, so a new goal that matches a PROVEN
// path within a threshold REPLAYS it instead of re-planning. Compounds as the ledger grows.
// See state/shared/specs/PATHING-ACCELERATION-PLAN-2026-05-31.md.
//
// Kept SEPARATE from path-ledger.mjs on purpose (R8/SOLID): path-ledger is a PURE ledger with NO
// network; this module owns the Ollama embedder. path-ledger.findWorkingPaths already exposes an
// injectable `embed` fn — callers inject embedText from here when they want kNN acceleration.
//
// REUSE: embeds via india's nomic-embed-text (the warm offload model; keep it resident with
// keep_alive so retrieval is sub-second — accel Lever 4). Uses curl SUBPROCESS, not node fetch/http:
// localhost Ollama probes under parallel contention flake on fetch/http (the lesson baked into
// scripts/ollama-docker-health.mjs); curl is the reliable path on this host.
//
// FAIL-SOFT: embedText returns null on any failure (Ollama down/slow/bad-json). pickBestPath then
// degrades to score-ranking with replay:false — never throws, never blocks the work loop. This is
// the same discipline as path-ledger: acceleration is an optimization, never a correctness gate.
//
// Knobs: PRISM_PATH_EMBED_DISABLE=1 (embedText→null) · PRISM_PATH_EMBED_MODEL (default nomic-embed-text)
//        PRISM_PATH_EMBED_URL (default http://127.0.0.1:11434) · PRISM_PATH_EMBED_TIMEOUT_MS (default 5000)
//        PRISM_PATH_EMBED_REPLAY_THRESHOLD (default 0.86 cosine — replay iff top match ≥ this)

import { execFileSync } from "node:child_process";

const DEFAULT_MODEL = () => process.env.PRISM_PATH_EMBED_MODEL || "nomic-embed-text";
const DEFAULT_URL = () => process.env.PRISM_PATH_EMBED_URL || "http://127.0.0.1:11434";
const DEFAULT_TIMEOUT_MS = () => Number(process.env.PRISM_PATH_EMBED_TIMEOUT_MS || "5000");
export const DEFAULT_REPLAY_THRESHOLD = 0.86; // cosine; replay a proven path iff top match ≥ this.

/**
 * Embed `text` → number[] via Ollama /api/embeddings (nomic-embed-text). Fail-soft → null.
 * @param {object} [opts] { model, url, timeoutMs, runImpl } (runImpl injectable for hermetic tests)
 */
export function embedText(text, opts = {}) {
  if (process.env.PRISM_PATH_EMBED_DISABLE === "1") return null;
  if (typeof text !== "string" || !text.trim()) return null;
  const model = opts.model || DEFAULT_MODEL();
  const url = opts.url || DEFAULT_URL();
  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : DEFAULT_TIMEOUT_MS();
  const run = opts.runImpl || defaultRun;
  let raw;
  try {
    raw = run({ url, model, text, timeoutMs });
  } catch { return null; }
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    // /api/embeddings → {embedding:[...]}; /api/embed → {embeddings:[[...]]}
    const v = Array.isArray(j.embedding) ? j.embedding
      : (Array.isArray(j.embeddings) && Array.isArray(j.embeddings[0]) ? j.embeddings[0] : null);
    if (!Array.isArray(v) || !v.length || !v.every((n) => Number.isFinite(n))) return null;
    return v;
  } catch { return null; }
}

function defaultRun({ url, model, text, timeoutMs }) {
  // curl subprocess — reliable under localhost contention (vs node fetch/http).
  const sec = Math.max(1, Math.ceil(timeoutMs / 1000));
  return execFileSync(
    "curl",
    ["-s", "--max-time", String(sec), `${url}/api/embeddings`, "-d", JSON.stringify({ model, prompt: text })],
    { encoding: "utf8", timeout: timeoutMs + 1000, stdio: ["ignore", "pipe", "ignore"] },
  );
}

export function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || !a.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Rank candidate working-paths against a goal query by cosine over goal-embeddings, and decide
 * whether to REPLAY the top match. Embeds the query ONCE + each candidate's goal once (small N —
 * callers pass the already-domain/goalType-filtered set from findWorkingPaths).
 *
 * @param {string} query  the new goal description
 * @param {Array} candidates  working-path rows (each has .goal / .goalType)
 * @param {object} [opts] { embed?, threshold?, topK?, goalKey? }
 *   embed: (text)=>number[]|null  default = embedText (Ollama). Inject a toy embed for tests.
 * @returns {{replay:boolean, topSimilarity:number, ranked:Array, reason:string}}
 *   FAIL-SOFT: query un-embeddable (Ollama down) → {replay:false, ranked:candidates-by-score, reason:"no-query-embedding"}.
 */
export function pickBestPath(query, candidates, opts = {}) {
  const embed = typeof opts.embed === "function" ? opts.embed : (t) => embedText(t, opts);
  const threshold = Number.isFinite(opts.threshold) ? opts.threshold
    : Number(process.env.PRISM_PATH_EMBED_REPLAY_THRESHOLD) || DEFAULT_REPLAY_THRESHOLD;
  const goalKey = opts.goalKey || "goal";
  const list = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  if (!list.length) return { replay: false, topSimilarity: 0, ranked: [], reason: "no-candidates" };
  const qv = embed(query);
  if (!Array.isArray(qv)) {
    // embedder unavailable → degrade to score order, never replay-on-blind
    const ranked = list.slice().sort((a, b) => (b.score || 0) - (a.score || 0));
    return { replay: false, topSimilarity: 0, ranked, reason: "no-query-embedding" };
  }
  const scored = list.map((c) => {
    let sim = 0;
    const cv = embed(String(c[goalKey] || c.goalType || ""));
    if (Array.isArray(cv)) sim = cosine(qv, cv);
    return { ...c, similarity: sim };
  }).sort((a, b) => (b.similarity - a.similarity) || ((b.score || 0) - (a.score || 0)));
  const top = scored[0];
  const topK = opts.topK || 5;
  return {
    replay: top.similarity >= threshold,
    topSimilarity: top.similarity,
    ranked: scored.slice(0, topK),
    reason: top.similarity >= threshold ? "match-above-threshold" : "below-threshold",
  };
}
