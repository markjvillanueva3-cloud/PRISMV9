/**
 * ollama-search-rerank.mjs -- SESSION-CONTINUITY-AGENTIC / OLLAMA-VERIFIED-OFFLOAD
 *   consumer #6: verified ollama RE-RANK of search candidates.
 *
 * The standing-goal headline: "enforce ollama for reads/searches/navigation."
 * Lexical search (ask-ollama `viz`, system-viz-query `find`) returns candidates
 * by keyword score. This offloads the RE-RANK to a local model -- the model
 * proposes a better ordering, and CODE verifies it before we trust it, so the
 * model can only REORDER real candidates, never hallucinate or drop one.
 *
 * VERIFIED-OFFLOAD contract (scripts/lib/ollama-verified-offload.mjs):
 *   run()      -> raw model text (an ordered id list, possibly with prose).
 *   verify(raw)-> parse the ids; ACCEPT only if every parsed id is a MEMBER of
 *                 the candidate set (anti-hallucination) AND -- when an optional
 *                 `resolves` predicate is injected -- each id also resolves.
 *                 The verified value is the candidates reordered by the model's
 *                 sequence, with any candidates the model omitted appended in
 *                 their original order (nothing is ever dropped).
 *   fallback() -> the original (lexical) candidate order. ALWAYS valid.
 *
 * WHY MEMBERSHIP IS THE RESOLVABILITY GUARANTEE (R12 honesty): the candidates
 * are real nodes drawn from the loaded graph / find-cache, so "id is a member of
 * the candidate set" already proves the id is a real, resolvable node. A separate
 * node-card-offset existence check is offered as an INJECTABLE `resolves`
 * predicate for a future find-cache wire where candidate ids could be stale
 * relative to the card index -- but it is NOT defaulted here, because graph nodes
 * are not all present in the 301K node-card index, so defaulting it would cause
 * false fallbacks (valid node -> "unresolvable" -> always lexical). Use it only
 * where the candidate source can drift from the card index.
 *
 * Pure + dep-injected: `run` and `resolves` are injected by the caller (ask-ollama
 * passes a closure over its model caller), so this module never imports the Ollama
 * client and stays fully unit-testable. Never throws: any failure -> lexical fallback.
 */

import { verifiedOffload } from "./ollama-verified-offload.mjs";

/** Build the re-rank prompt: the query + a numbered candidate list, ids exposed. */
export function buildRerankPrompt(query, candidates) {
  const lines = candidates.map((c, i) => {
    const meta = [c.layer, c.status, c.domain].filter(Boolean).join(", ");
    const info = c.info ? ` -- ${String(c.info).slice(0, 160)}` : "";
    return `${i + 1}. [${c.id}] ${c.label || ""}${meta ? ` (${meta})` : ""}${info}`;
  });
  return [
    "You are a code-search relevance ranker for the PRISM platform.",
    "Re-rank the CANDIDATES below by how well each answers the QUERY, MOST relevant first.",
    "Output ONLY the candidate ids in your ranked order, one per line, each in [brackets].",
    "Use ONLY ids that appear below -- do not invent ids. You may omit clearly-irrelevant ones.",
    "",
    `QUERY: ${query}`,
    "",
    "CANDIDATES:",
    ...lines,
    "",
    "RANKED IDS (best first, one [id] per line):",
  ].join("\n");
}

/**
 * Extract candidate ids from the model's raw text, in order of first appearance,
 * keeping ONLY ids that are members of `validIdSet` (anti-hallucination) and
 * de-duplicated. Matches bracketed `[id]` first; falls back to bare whitespace/
 * comma-separated tokens so a model that drops the brackets still parses. Pure.
 */
export function parseRerankIds(rawText, validIdSet) {
  const text = String(rawText == null ? "" : rawText);
  const ordered = [];
  const seen = new Set();
  const push = (id) => {
    if (validIdSet.has(id) && !seen.has(id)) { seen.add(id); ordered.push(id); }
  };
  // Primary: bracketed [id] tokens (what the prompt asks for).
  const bracket = /\[([^\]\n]+)\]/g;
  let m;
  let sawBracket = false;
  while ((m = bracket.exec(text)) !== null) { sawBracket = true; push(m[1].trim()); }
  // Fallback: if NO bracket form was seen, scan bare tokens split on whitespace/commas.
  if (!sawBracket) {
    for (const tok of text.split(/[\s,]+/)) {
      const t = tok.trim().replace(/^[.\d)]+/, ""); // strip leading list numbering like "1." / "2)"
      if (t) push(t);
    }
  }
  return ordered;
}

/**
 * PURE verifier for verifiedOffload. `idSet` is the candidate id Set; `resolves`
 * is an optional (id)=>bool extra check. Returns {ok:false} -> fallback, or
 * {ok:true, value:<reordered candidates>}. The value reorders `candidates` by the
 * model's id sequence, then APPENDS any candidate the model omitted in its
 * original order, so the fallback set is never lost -- only re-prioritized.
 */
export function verifyRerank(rawText, candidates, idSet, resolves) {
  const ids = parseRerankIds(rawText, idSet);
  if (!ids.length) return { ok: false };
  if (typeof resolves === "function") {
    for (const id of ids) {
      let ok = false;
      try { ok = !!resolves(id); } catch { ok = false; }
      if (!ok) return { ok: false };
    }
  }
  const byId = new Map(candidates.map((c) => [String(c.id), c]));
  const picked = ids.map((id) => byId.get(id)).filter(Boolean);
  const pickedSet = new Set(ids);
  const rest = candidates.filter((c) => !pickedSet.has(String(c.id)));
  return { ok: true, value: [...picked, ...rest] };
}

/**
 * Re-rank `candidates` via a verified ollama offload. `run` is the injected async
 * model caller returning raw text; `resolves` is an optional id-existence check;
 * `topK` (>0) caps the candidate set first. Returns
 *   { ranked, source:'ollama'|'fallback', verified, fellBack, reason }
 * `ranked` is ALWAYS a usable list (the lexical order on any fallback). Never throws.
 */
export async function rerankCandidates({ query, candidates, run, resolves, topK = 0, label = "search-rerank", onResult } = {}) {
  const cands = Array.isArray(candidates) ? candidates.filter((c) => c && c.id != null) : [];
  const capped = topK > 0 ? cands.slice(0, topK) : cands;
  const fallback = async () => capped;

  // Nothing to offload (no model injected, or <2 candidates -> order is trivial)
  // -> the trusted lexical path, no model call.
  if (typeof run !== "function" || capped.length < 2) {
    const ranked = await fallback();
    return {
      ranked, source: "fallback", verified: false, fellBack: true,
      reason: capped.length < 2 ? "too-few-candidates" : "no-run",
    };
  }

  const idSet = new Set(capped.map((c) => String(c.id)));
  const res = await verifiedOffload({
    run,
    verify: (raw) => verifyRerank(raw, capped, idSet, resolves),
    fallback,
    label,
    onResult,
  });
  return {
    ranked: res.value,
    source: res.source,
    verified: !!res.verified,
    fellBack: !!res.fellBack,
    reason: res.reason,
  };
}
