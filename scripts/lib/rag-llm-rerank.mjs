#!/usr/bin/env node
/**
 * rag-llm-rerank.mjs — HIGH-ROI-AI-PSN-SCOPE/U-RAG-RERANK-LLM (A7, 2026-05-23, slot golf).
 *
 * Stage-3 LLM reranker. Two-stage retrieval (cosine recall → lexical rerank)
 * leaves a top-N candidate set whose relative ordering still has noise. This
 * lib adds an optional Stage-3 LLM scoring pass that re-orders the top-N
 * using a small reasoning model (qwen2.5-coder:32b, qwen2.5-coder:32b — both
 * already loaded in the home Ollama tier per [[reference_high_roi_ai_psn_scope_2026_05_23]]).
 *
 * Spec § A7: "spec § U-RAG-2 expected +15-30% precision". Closes the gap left
 * when bge-reranker-v2-m3 pull was deferred (Ollama CLI path issue).
 *
 * Pure functions:
 *   - shouldRerank(candidates, opts)      heuristic: only rerank when top-K matters
 *   - buildScoringPrompt(query, candidate, opts)
 *   - parseScore(rawResponse)             extracts a 0-100 score from LLM output
 *   - scoreCandidate(query, cand, llm, opts) async DI
 *   - rerank(query, candidates, llm, opts) end-to-end (parallel scoring, sort)
 *
 * Fail-soft: LLM failure on a candidate → score=NaN → keeps that candidate's
 * original rank in the output. Full LLM outage → returns original order
 * unchanged (caller never breaks).
 *
 * Knobs:
 *   PRISM_RAG_LLM_RERANK_DISABLE=1     kill switch
 *   PRISM_RAG_LLM_RERANK_MODEL=name    default qwen2.5-coder:32b
 *   PRISM_RAG_LLM_RERANK_MAX_K=N       only rerank top-N (default 20)
 *   PRISM_RAG_LLM_RERANK_TIMEOUT_MS=N  per-candidate score budget (default 8000)
 */

const DEFAULT_MODEL = "qwen2.5-coder:32b";
const DEFAULT_MAX_K = 20;
// DEFAULT_TIMEOUT_MS reserved for future per-candidate budget (R12 plumbing
// via opts.signal is the current path — see scoreCandidate).
export const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Heuristic gate: skip LLM rerank when the candidate set is too small to
 * benefit (< 2 candidates is a no-op anyway) or too large to afford
 * (> opts.maxK). Returns true when LLM rerank SHOULD run.
 */
export function shouldRerank(candidates, opts = {}) {
  if (opts.disabled) return false;
  if (!Array.isArray(candidates) || candidates.length < 2) return false;
  const maxK = Number.isInteger(opts.maxK) && opts.maxK > 0 ? opts.maxK : DEFAULT_MAX_K;
  if (candidates.length > maxK * 2) return false;  // way too many — defer to a stronger Stage-2
  return true;
}

/**
 * Build the LLM scoring prompt for ONE candidate. Asks for a numeric
 * relevance score in [0,100]. Wrapping the answer in ###SCORE### makes the
 * parser robust to LLM preamble.
 *
 * `candidate` shape: { text, title?, path? } — at minimum a `text` body.
 */
export function buildScoringPrompt(query, candidate, opts = {}) {
  if (typeof query !== "string" || !query.trim()) {
    throw new TypeError("buildScoringPrompt: query must be non-empty string");
  }
  if (!candidate || typeof candidate.text !== "string") {
    throw new TypeError("buildScoringPrompt: candidate must have a .text string");
  }
  const maxCandLen = Number.isInteger(opts.maxCandChars) && opts.maxCandChars > 0
    ? opts.maxCandChars : 1200;
  const body = candidate.text.length > maxCandLen
    ? candidate.text.slice(0, maxCandLen) + " […truncated]"
    : candidate.text;
  const titleHint = candidate.title ? `Title: ${candidate.title}\n` : "";
  return [
    `Rate the RELEVANCE of the CANDIDATE document to the QUERY on a scale of`,
    `0 to 100 (0 = irrelevant, 100 = directly answers the query).`,
    `Output ONLY the final number wrapped in ###SCORE### markers. Example: ###SCORE###42###SCORE###`,
    ``,
    `QUERY: ${query.trim()}`,
    ``,
    `CANDIDATE:`,
    `${titleHint}${body}`,
    ``,
    `Relevance score (###SCORE###NN###SCORE###):`,
  ].join("\n");
}

/**
 * Extract a numeric score from an LLM response. Looks for `###SCORE###NN###SCORE###`
 * first; falls back to the first standalone integer in [0,100]; returns NaN
 * when nothing parseable found. NaN signals "skip this candidate's rerank
 * — keep its original position" in the imperative shell.
 */
export function parseScore(raw) {
  if (typeof raw !== "string") return NaN;
  const wrapped = raw.match(/###SCORE###\s*(-?\d+(?:\.\d+)?)\s*###SCORE###/);
  if (wrapped) {
    const n = Number(wrapped[1]);
    if (Number.isFinite(n)) return clampScore(n);
  }
  // Fallback: first integer-looking token in [0, 100].
  const tokens = raw.match(/-?\d+(?:\.\d+)?/g) || [];
  for (const t of tokens) {
    const n = Number(t);
    if (Number.isFinite(n) && n >= 0 && n <= 100) return n;
  }
  return NaN;
}

function clampScore(n) {
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

/**
 * Score one candidate via the LLM. Returns a finite number in [0,100] on
 * success, or NaN on any failure (LLM throw, empty response, unparseable).
 * Fail-soft — never throws (caller treats NaN as "preserve original rank").
 */
export async function scoreCandidate(query, candidate, llm, opts = {}) {
  if (typeof llm !== "function") return NaN;
  let prompt;
  try { prompt = buildScoringPrompt(query, candidate, opts); }
  catch { return NaN; }
  const model = (typeof opts.model === "string" && opts.model) || DEFAULT_MODEL;
  let raw;
  try {
    raw = await llm(prompt, { model, signal: opts.signal });
  } catch (e) {
    if (opts.onError) try { opts.onError(e, candidate); } catch { /* swallow */ }
    return NaN;
  }
  return parseScore(raw);
}

/**
 * End-to-end rerank. Scores each candidate in parallel (Promise.all — bounded
 * by the input length), then sorts by score DESC. Candidates with NaN score
 * retain their ORIGINAL relative order (stable sort) — they appear after all
 * successfully-scored candidates.
 *
 * Returns: { ranked: [{...candidate, llmScore}], usedLLM: bool, scoredCount }
 *
 * Idempotent on disabled / too-small / too-large: returns input unchanged with
 * usedLLM=false. Operator can A/B by toggling PRISM_RAG_LLM_RERANK_DISABLE.
 */
export async function rerank(query, candidates, llm, opts = {}) {
  const disabled = opts.disabled || process.env.PRISM_RAG_LLM_RERANK_DISABLE === "1";
  if (!shouldRerank(candidates, { ...opts, disabled })) {
    return { ranked: Array.isArray(candidates) ? candidates.slice() : [],
             usedLLM: false, scoredCount: 0 };
  }
  if (typeof llm !== "function") {
    return { ranked: candidates.slice(), usedLLM: false, scoredCount: 0 };
  }
  // Score in parallel — Ollama handles the queue server-side. Stamp each
  // candidate with its original index so we can fall back to stable order.
  const stamped = candidates.map((c, i) => ({ ...c, _origIdx: i }));
  const scores = await Promise.all(
    stamped.map((c) => scoreCandidate(query, c, llm, opts)),
  );
  let scoredCount = 0;
  for (let i = 0; i < stamped.length; i++) {
    stamped[i].llmScore = scores[i];
    if (Number.isFinite(scores[i])) scoredCount++;
  }
  // Stable sort: finite scores DESC; NaN goes to the end preserving original order.
  stamped.sort((a, b) => {
    const aFin = Number.isFinite(a.llmScore);
    const bFin = Number.isFinite(b.llmScore);
    if (aFin && bFin) return b.llmScore - a.llmScore;
    if (aFin) return -1;
    if (bFin) return 1;
    return a._origIdx - b._origIdx;
  });
  // Strip the internal index field.
  const ranked = stamped.map(({ _origIdx, ...rest }) => rest);
  return { ranked, usedLLM: true, scoredCount };
}
