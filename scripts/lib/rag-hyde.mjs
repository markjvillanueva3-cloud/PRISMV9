#!/usr/bin/env node
/**
 * rag-hyde.mjs — HIGH-ROI-AI-PSN-SCOPE/U-RAG-HYDE (A8, 2026-05-23, slot golf).
 *
 * Hypothetical Document Embeddings (HyDE — Gao et al., 2022 — "Precise
 * Zero-Shot Dense Retrieval without Relevance Labels"). For a terse query Q,
 * generate a HYPOTHETICAL answer A* via a small LLM, embed A* instead of Q,
 * then retrieve as normal. The hypothetical lives in the same "domain
 * grammar" as the corpus entries, so its embedding lands closer to the real
 * answer in vector space — big recall win on operator's terse shop-floor
 * queries like "kc1.1 SS304" or "M3 tap feed".
 *
 * Pure functions (LLM call is a DI hook so tests use a deterministic stub):
 *   - shouldHyDE(query, opts)        → bool — heuristic gate (too-long queries skip)
 *   - buildPrompt(query, domain)     → string — Ollama prompt with domain context
 *   - generateHypothetical(query, opts) → Promise<string|null>
 *   - hydeQuery(query, embedder, llm, opts) → Promise<{vector, usedHyDE, hypothetical}>
 *
 * Fail-soft: any LLM failure → fall back to embedding the original query
 * (paper's own honest fallback path; never blocks retrieval).
 *
 * Wired by: tribal-by-domain-inject.mjs, master-index-precheck-inject.mjs,
 * memory-relevance-inject.mjs (each may opt in via env knob).
 *
 * Knobs:
 *   PRISM_RAG_HYDE_DISABLE=1          kill switch (legacy path)
 *   PRISM_RAG_HYDE_MIN_TOKENS=N       skip HyDE when query >= N tokens (default 8)
 *   PRISM_RAG_HYDE_MAX_TOKENS=N       cap hypothetical at N tokens (default 120)
 *   PRISM_RAG_HYDE_MODEL=name         Ollama model for hypothetical (default qwen2.5-coder:32b)
 */

/** Token-count via whitespace split — fast, no tokenizer dep. */
function tokenCount(s) {
  if (typeof s !== "string") return 0;
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

/**
 * Heuristic gate: HyDE helps short queries (recall lift outweighs LLM cost)
 * but adds noise on long queries (which already have enough context). Default
 * threshold is 8 tokens — matches the paper's measured break-even.
 *
 * Returns true when HyDE SHOULD be invoked.
 */
export function shouldHyDE(query, opts = {}) {
  if (opts.disabled) return false;
  if (typeof query !== "string" || !query.trim()) return false;
  const minTokens = Number.isInteger(opts.minTokens) && opts.minTokens > 0
    ? opts.minTokens : 8;
  return tokenCount(query) < minTokens;
}

/**
 * Build the Ollama prompt for the hypothetical generation. `domain` is an
 * optional grammar hint ("machining" / "code" / "physics") so the LLM
 * produces an answer in the corpus's idiom.
 */
export function buildPrompt(query, domain) {
  const dom = typeof domain === "string" && domain ? domain : "PRISM manufacturing intelligence";
  return [
    `You are answering a terse ${dom} query. Write ONE paragraph (2-4 sentences)`,
    `that an authoritative answer would look like — be SPECIFIC, use domain`,
    `vocabulary, include relevant numbers/units. Do NOT hedge. Do NOT preface.`,
    `Output ONLY the paragraph.`,
    ``,
    `Query: ${query.trim()}`,
    ``,
    `Hypothetical answer:`,
  ].join("\n");
}

/**
 * Strip common LLM artifacts: leading "Hypothetical answer:" echo, surrounding
 * quotes, markdown code-fences, multi-line indent.
 */
export function cleanHypothetical(raw) {
  if (typeof raw !== "string") return null;
  let s = raw.trim();
  if (!s) return null;
  // Strip leading echo of the closing prompt line.
  s = s.replace(/^(hypothetical answer:?|answer:?)/i, "").trim();
  // Unwrap matching quotes if the whole response is quoted.
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  // Strip simple code fences.
  s = s.replace(/^```[a-z0-9]*\n?/i, "").replace(/```\s*$/, "").trim();
  // Collapse internal whitespace.
  s = s.replace(/\s+/g, " ");
  return s || null;
}

/**
 * Cap the hypothetical at maxTokens by whitespace truncation. Preserves a
 * trailing period when the cut lands inside a sentence; this keeps the
 * embedding stable (BERT-family encoders are sensitive to trailing punctuation).
 */
export function capTokens(s, maxTokens) {
  if (typeof s !== "string") return s;
  const max = Number.isInteger(maxTokens) && maxTokens > 0 ? maxTokens : 120;
  const parts = s.trim().split(/\s+/);
  if (parts.length <= max) return s.trim();
  const cut = parts.slice(0, max).join(" ");
  return /[.!?]$/.test(cut) ? cut : cut + ".";
}

/**
 * Generate a hypothetical answer via an injected LLM callable. The callable
 * must be `async (prompt, {model, signal}) → string|null`. Returns the cleaned
 * + token-capped hypothetical, or null on LLM error / empty response.
 *
 * Fail-soft — any thrown error from `llm` is caught and returns null. Caller
 * uses null as the "fall back to original query" signal.
 */
export async function generateHypothetical(query, llm, opts = {}) {
  if (typeof query !== "string" || !query.trim()) return null;
  if (typeof llm !== "function") return null;
  const prompt = buildPrompt(query, opts.domain);
  const model = (typeof opts.model === "string" && opts.model) || "qwen2.5-coder:32b";
  let raw;
  try {
    raw = await llm(prompt, { model, signal: opts.signal });
  } catch (e) {
    if (opts.onError) try { opts.onError(e); } catch { /* swallow */ }
    return null;
  }
  const cleaned = cleanHypothetical(raw);
  if (!cleaned) return null;
  return capTokens(cleaned, opts.maxTokens);
}

/**
 * End-to-end: given a query, embedder, and LLM callable, return the embedding
 * vector for retrieval. Uses HyDE when `shouldHyDE` says so + the LLM
 * succeeds; otherwise falls back to embedding the original query.
 *
 * Always returns { vector, usedHyDE, hypothetical } — `usedHyDE=false` +
 * `hypothetical=null` indicates the fall-through path took over.
 *
 * embedder: async (text) → number[]   (the same nomic-embed-text path the
 *                                       4 inject hooks use today)
 */
export async function hydeQuery(query, embedder, llm, opts = {}) {
  if (typeof embedder !== "function") {
    throw new TypeError("rag-hyde: embedder must be an async function");
  }
  const disabled = opts.disabled || process.env.PRISM_RAG_HYDE_DISABLE === "1";
  if (!shouldHyDE(query, { ...opts, disabled })) {
    const vec = await embedder(query);
    return { vector: vec, usedHyDE: false, hypothetical: null };
  }
  const hypo = await generateHypothetical(query, llm, opts);
  if (!hypo) {
    const vec = await embedder(query);
    return { vector: vec, usedHyDE: false, hypothetical: null };
  }
  const vec = await embedder(hypo);
  return { vector: vec, usedHyDE: true, hypothetical: hypo };
}
