/**
 * galaxy-context-retrieval.mjs -- PURE sparse RAG retrieval for the galaxy reasoning
 * bridge (AI-SYNERGY-AUDIT-MS0/U-AISYN-RAG, slot:charlie).
 *
 * Upgrades the bridge from a FIXED 1800-char synthesis dump to per-question retrieval:
 * given a galaxy's candidate docs + a question, return the top-K most relevant markdown
 * SECTIONS (heading-bounded chunks), ranked by relevance and diversified per source.
 *
 * R8/dedup: the lexical RELEVANCE SCORER is NOT re-implemented here -- it reuses the
 * fleet's verified `scripts/lib/lexical-rerank.mjs` (tokenize + scoreCandidate, pure +
 * reference-tested; features coverage/phrase/labelHit/stage1/density, where the section
 * heading maps to the candidate `label` so a heading-term match boosts the section).
 * This module owns only what lexical-rerank does NOT: section-aware markdown CHUNKING
 * and per-source DIVERSITY + a relevance FLOOR. Everything is PURE (no fs/clock/random):
 * same (chunks, query) in => byte-identical ranking out, so it is reference-value
 * testable (R9). The bounded fail-soft I/O (gathering each galaxy's docs) lives in the
 * bridge, not here. A dense/embedding rerank arm can layer on via the same chunk shape.
 */

import { tokenize, scoreCandidate } from "./lexical-rerank.mjs";

// A chunk must clear this score to be retrieved (an off-topic question then yields fewer
// or zero chunks rather than forcing irrelevant context into the prompt).
const RELEVANCE_FLOOR = 0.0001;

/**
 * Split a markdown doc into heading-bounded section chunks. Each chunk carries its
 * nearest heading (the relevance `label`) and a source label. A chunk longer than
 * maxChars is hard-split on blank-line boundaries so one giant section cannot dominate.
 * PURE.
 * @returns {Array<{source, heading, text}>}
 */
export function chunkMarkdown(text, source, opts = {}) {
  const maxChars = opts.maxChars || 1200;
  if (typeof text !== "string" || !text.trim()) return [];
  let body = text;
  const fm = body.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  if (fm) body = body.slice(fm[0].length);

  const lines = body.split(/\r?\n/);
  const sections = [];
  let heading = "";
  let buf = [];
  const flush = () => {
    const t = buf.join("\n").trim();
    if (t) sections.push({ source, heading, text: t });
    buf = [];
  };
  for (const line of lines) {
    const h = line.match(/^#{1,6}\s+(.*)$/);
    if (h) {
      flush();
      heading = h[1].trim();
    } else {
      buf.push(line);
    }
  }
  flush();

  // Hard-split oversized sections on blank-line boundaries.
  const out = [];
  for (const s of sections) {
    if (s.text.length <= maxChars) {
      out.push(s);
      continue;
    }
    const paras = s.text.split(/\n\s*\n/);
    let acc = "";
    for (const p of paras) {
      if ((acc + "\n\n" + p).length > maxChars && acc) {
        out.push({ source: s.source, heading: s.heading, text: acc.trim() });
        acc = p;
      } else {
        acc = acc ? acc + "\n\n" + p : p;
      }
    }
    if (acc.trim()) out.push({ source: s.source, heading: s.heading, text: acc.trim() });
  }
  return out;
}

/**
 * Rank chunks against a query using the shared lexical-rerank scorer. PURE.
 * Maps each chunk to a lexical-rerank candidate ({text, label:heading, score:prior}) and
 * scores it; a chunk may carry an optional numeric `prior` (0..1) that feeds the scorer's
 * stage1 feature (e.g. a synthesis-spine prior). Returns chunks with a `score`, desc.
 * @returns {Array<{source, heading, text, score}>}
 */
export function scoreChunks(chunks, query) {
  const arr = Array.isArray(chunks) ? chunks.filter((c) => c && typeof c.text === "string") : [];
  const qTokens = tokenize(typeof query === "string" ? query : "");
  if (!arr.length || !qTokens.length) return [];
  const queryLower = String(query).toLowerCase().trim();
  const scored = arr.map((c) => ({
    source: c.source,
    heading: c.heading,
    text: c.text,
    score:
      Math.round(
        scoreCandidate(qTokens, queryLower, { text: c.text, label: c.heading || "", score: c.prior }) * 1000
      ) / 1000,
  }));
  // score desc, then source+heading asc for deterministic ties.
  scored.sort((a, b) => b.score - a.score || (a.source + a.heading).localeCompare(b.source + b.heading));
  return scored;
}

/**
 * Retrieve the top-K relevant chunks for a query with per-source diversity + a relevance
 * floor. PURE. At most `perSourceCap` chunks from any one source so a single doc cannot
 * monopolize; only chunks scoring strictly above `floor` are returned.
 * @returns {Array<{source, heading, text, score}>}
 */
export function retrieveTopK(chunks, query, opts = {}) {
  const k = opts.k || 5;
  const floor = opts.floor != null ? opts.floor : RELEVANCE_FLOOR;
  const perSourceCap = opts.perSourceCap || 3;
  const ranked = scoreChunks(chunks, query);
  const out = [];
  const perSource = new Map();
  for (const c of ranked) {
    if (c.score <= floor) break; // ranked desc -> nothing below floor remains
    const used = perSource.get(c.source) || 0;
    if (used >= perSourceCap) continue;
    out.push(c);
    perSource.set(c.source, used + 1);
    if (out.length >= k) break;
  }
  return out;
}
