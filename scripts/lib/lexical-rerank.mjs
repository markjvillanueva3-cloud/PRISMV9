/**
 * lexical-rerank.mjs — RAG-UPGRADE-MS0 / U-RAG-2 (2026-05-22, slot golf).
 *
 * Stage-2 reranker for PRISM's retrieval inject hooks. The 2026 RAG research
 * prescribes two-stage retrieval — a fast recall-oriented first stage
 * (BM25-lite, here) then a more careful reranker that lifts answer quality
 * 15-30%.
 *
 * A neural cross-encoder is the textbook stage 2 — but PRISM's rerank point
 * is INSIDE latency-sensitive UserPromptSubmit inject hooks, which fire on
 * every prompt. A per-prompt model/network call there is architecturally
 * wrong. This is therefore a PURE LEXICAL reranker: zero model, zero
 * network, deterministic, sub-millisecond. It re-scores stage-1 candidates
 * with features BM25-lite alone underweights — exact-phrase hit, full
 * query-term coverage, label/title match, term density — and is honest
 * about being lexical, not semantic (a semantic stage-2 belongs on the
 * dispatcher path `prism_dev:rag_eval_run`, not in an inject hook).
 *
 * Pairs with edge-order.mjs (U-RAG-4): rerank → take top-K → edgeOrder.
 * The weights are tunable and measurable via the U-RAG-5 eval harness
 * (`prism_dev:rag_eval_run`) — that is why the eval harness shipped first.
 */

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "is", "it", "for", "on",
  "with", "as", "at", "by", "be", "this", "that", "are", "was", "from",
]);

/** Lowercase, split on non-alphanumeric, drop stopwords + 1-char tokens. */
export function tokenize(s) {
  if (typeof s !== "string") return [];
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

/**
 * Feature weights for the combined rerank score. Sum ≈ 1.0. Tunable — the
 * U-RAG-5 eval harness exists to measure the lift and retune these.
 */
export const DEFAULT_WEIGHTS = Object.freeze({
  coverage: 0.35, // fraction of distinct query tokens present
  phrase: 0.25,   // verbatim multi-word query occurrence
  labelHit: 0.15, // a query token appears in the candidate's label/title
  stage1: 0.15,   // carried-through first-stage score
  density: 0.10,  // query-token concentration in the candidate body
});

/**
 * Score one stage-1 candidate against the query. Pure. Returns a combined
 * relevance score (higher = better; roughly 0..1 with default weights).
 *
 * @param {string[]} queryTokens - tokenized query
 * @param {string} queryLower - lowercased trimmed raw query (for phrase test)
 * @param {{text?:string,label?:string,score?:number}} cand
 * @param {typeof DEFAULT_WEIGHTS} weights
 */
export function scoreCandidate(queryTokens, queryLower, cand, weights = DEFAULT_WEIGHTS) {
  const text = typeof cand?.text === "string" ? cand.text : "";
  const label = typeof cand?.label === "string" ? cand.label : "";
  const textLower = text.toLowerCase();
  const candTokens = tokenize(text);
  const candSet = new Set(candTokens);
  const qset = new Set(queryTokens);

  // coverage — distinct query tokens present in the candidate body OR label.
  const labelLower = label.toLowerCase();
  let present = 0;
  for (const qt of qset) {
    if (candSet.has(qt) || labelLower.includes(qt)) present++;
  }
  const coverage = qset.size ? present / qset.size : 0;

  // phrase — the full (multi-word) query appears verbatim in the body.
  const phrase =
    queryTokens.length >= 2 && queryLower.length >= 4 && textLower.includes(queryLower)
      ? 1
      : 0;

  // labelHit — any query token occurs in the label/title.
  let labelHit = 0;
  for (const qt of qset) {
    if (labelLower.includes(qt)) { labelHit = 1; break; }
  }

  // density — query-token occurrences / candidate length, scaled + capped.
  let occ = 0;
  for (const ct of candTokens) if (qset.has(ct)) occ++;
  const density = candTokens.length ? Math.min(1, (occ / candTokens.length) * 4) : 0;

  // stage1 — carry-through of the first-stage score, clamped to 0..1.
  const s1 = Number(cand?.score);
  const stage1 = Number.isFinite(s1) ? Math.max(0, Math.min(1, s1)) : 0;

  return (
    weights.coverage * coverage +
    weights.phrase * phrase +
    weights.labelHit * labelHit +
    weights.stage1 * stage1 +
    weights.density * density
  );
}

/**
 * Two-stage rerank: re-score stage-1 candidates with lexical features and
 * return them sorted best→worst. Returns a NEW array — the input is never
 * mutated. A blank/untokenizable query, or non-array candidates, returns
 * the input unchanged (degrade gracefully — never throw inside a hook).
 *
 * @param {string} query
 * @param {Array<{id?:string,text?:string,label?:string,score?:number}>} candidates
 * @param {{topK?:number, weights?:Partial<typeof DEFAULT_WEIGHTS>}} [opts]
 * @returns {Array} reranked candidates (length ≤ topK if given)
 */
export function rerank(query, candidates, opts = {}) {
  if (!Array.isArray(candidates)) return [];
  if (typeof query !== "string" || query.trim().length === 0) return candidates.slice();
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return candidates.slice();
  const queryLower = query.toLowerCase().trim();
  const weights = { ...DEFAULT_WEIGHTS, ...(opts.weights || {}) };

  const scored = candidates.map((cand, i) => ({
    cand,
    i, // stable tie-break — preserve stage-1 order on equal rerank score
    rs: scoreCandidate(queryTokens, queryLower, cand, weights),
  }));
  scored.sort((a, b) => (b.rs - a.rs) || (a.i - b.i));

  const topK =
    Number.isFinite(opts.topK) && opts.topK > 0 ? Math.floor(opts.topK) : scored.length;
  return scored.slice(0, topK).map((s) => s.cand);
}
