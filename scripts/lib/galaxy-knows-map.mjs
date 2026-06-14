#!/usr/bin/env node
// scripts/lib/galaxy-knows-map.mjs — GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-KNOWS-MAP (alpha, 2026-05-31).
//
// Phase B FEED-UP: the master WHO-KNOWS-WHAT index.
//
// Answers "which galaxy's brain holds context on topic X?" in ONE lookup. Built TF-IDF-lite over the 34
// per-galaxy context-cards: each galaxy is a "document", its distinctive capability tokens are weighted by
// inverse galaxy-frequency (a token only quoting+post-processor carry routes strongly; a token every galaxy
// carries self-suppresses). This is the GALAXY-BRAIN-level routing layer — coarser + complementary to the
// node-level master-index (which indexes engines/graph nodes); KNOWS-MAP indexes the 34 Obsidian brains.
// It feeds cross-galaxy routing (U-GCF-XGALAXY-INJECT can consume whoKnows() instead of re-scoring per prompt).
//
// RECALL BOUND (R12 — honest about the limitation): the index can only route on tokens that appear in the
// ≤1 KB card distillations, NOT the full brains. So a MULTI-token query discriminates well (e.g. "cutting
// force speed feed" → speed-feed decisively), but a BARE ambiguous single token may tie or route weakly
// (e.g. "cutting" alone is carried by several cards and ties; "threading"/"chamfer" may be absent from the
// distillations entirely). For exhaustive sub-domain recall, fall back to the node-level master-index. Sharper
// galaxy routing on sub-domain terms is a CARD-CONTENT lever (raise the U-GCF-CARD distillation budget), not a
// KNOWS-MAP code change.
//
// DESIGN (mirrors xgalaxy-inject.mjs / galaxy-rollup.mjs for R11 consistency):
//   • pure-core (index build + scoring) + injected fs deps + fail-soft.
//   • REUSE (R8): tokenize() from master-index-search-lib (same tokenization as the master-index — consistent
//     routing); parseCardRole()/loadCardsFromIndex() from xgalaxy-inject; DEFAULT_ROOTS from galaxy-context-card.
//   • SINGLE-WRITER-PER-FILE: writes ONLY its own KNOWS-MAP.json sidecar — never INDEX.json (multi-writer class).
//
// Knob: PRISM_GCF_KNOWS_DISABLE=1 → build() is a no-op (pure fns still work).

import fs from "node:fs";
import { tokenize } from "./master-index-search-lib.mjs";
import { DEFAULT_ROOTS } from "./galaxy-context-card.mjs";
import { parseCardRole, loadCardsFromIndex } from "./xgalaxy-inject.mjs";

export const DEFAULT_KNOWS_PATH = `${DEFAULT_ROOTS.cardsDir}/KNOWS-MAP.json`;
export const ROLE_BOOST = 2;        // a token in a galaxy's ROLE line is a stronger capability signal than a body hit
export const DEFAULT_TOP_TOPICS = 15; // distinctive topics kept per galaxy in the forward map
export const DEFAULT_WHO_K = 5;     // whoKnows default: top-K galaxies
const CARD_MAX_TOKENS = 400;        // a card has ~12 facts — capture them all (tokenize default 8 is too few)
const QUERY_MAX_TOKENS = 24;

const defaultRead = (f) => { try { return fs.readFileSync(f, "utf8"); } catch { return null; } };

// ── pure index build ────────────────────────────────────────────────────────────

// Smoothed inverse galaxy-frequency. log(1 + N/df): always > 0 (no zero-collapse at df===N for small N),
// monotonic-decreasing in df — a token in 1 of 34 galaxies scores ~3.56, a token in all 34 scores ~0.69. Pure.
export function idf(totalGalaxies, docFreq) {
  const n = Number.isFinite(totalGalaxies) && totalGalaxies > 0 ? totalGalaxies : 0;
  const df = Number.isFinite(docFreq) && docFreq > 0 ? docFreq : 0;
  if (n === 0 || df === 0) return 0;
  return Math.log(1 + n / df);
}

// Per-galaxy token weight map from one card: token → raw weight (role hit = ROLE_BOOST, else 1). Pure.
// Uses tokenize's deduped SET as binary presence (cards are ≤1 KB — TF variance is negligible).
export function galaxyTokenWeights(cardText, opts = {}) {
  const roleBoost = Number.isFinite(opts.roleBoost) ? opts.roleBoost : ROLE_BOOST;
  const body = tokenize(cardText, { maxLen: 8000, maxTokens: CARD_MAX_TOKENS });
  const role = new Set(tokenize(parseCardRole(cardText), { maxLen: 1000, maxTokens: 64 }));
  const w = new Map();
  for (const t of body) w.set(t, role.has(t) ? roleBoost : 1);
  return w; // Map<token, weight>
}

// Build the who-knows-what index from galaxy cards. Pure given `cards` ([{galaxy,text}]).
// Returns { totalGalaxies, forward:{galaxy:[{topic,score}]}, inverted:{token:[{galaxy,score}]}, tokenCount }.
//   score = rawWeight × idf(N, docFreq) — distinctive-capability strength.
export function buildKnowsMap(cards, opts = {}) {
  const topTopics = Number.isFinite(opts.topTopics) ? opts.topTopics : DEFAULT_TOP_TOPICS;
  const list = Array.isArray(cards) ? cards.filter((c) => c && typeof c.galaxy === "string" && typeof c.text === "string") : [];
  const N = list.length;
  // pass 1: per-galaxy raw weights + global doc-frequency
  const perGalaxy = []; // [{galaxy, weights:Map}]
  const docFreq = new Map();
  for (const c of list) {
    const w = galaxyTokenWeights(c.text, opts);
    perGalaxy.push({ galaxy: c.galaxy, weights: w });
    for (const t of w.keys()) docFreq.set(t, (docFreq.get(t) || 0) + 1);
  }
  // pass 2: tf-idf score → forward + inverted
  const forward = {};
  const inverted = {};
  for (const { galaxy, weights } of perGalaxy) {
    const scored = [];
    for (const [t, rawW] of weights) {
      const s = rawW * idf(N, docFreq.get(t) || 0);
      // Defensive drop of the impossible non-positive case only (idf clamps df=0/N=0 → 0). A ubiquitous
      // token does NOT hit 0 — smoothed idf(N,N)=log(2)≈0.69, so it is KEPT but ranks lowest (weak signal,
      // not dropped). This preserves the documented "self-suppresses" invariant without silently losing it.
      if (s <= 0) continue;
      scored.push({ topic: t, score: +s.toFixed(4) });
      (inverted[t] || (inverted[t] = [])).push({ galaxy, score: +s.toFixed(4) });
    }
    scored.sort((a, b) => (b.score - a.score) || a.topic.localeCompare(b.topic));
    forward[galaxy] = scored.slice(0, Math.max(0, topTopics));
  }
  // rank each inverted posting list by score desc (the authority ordering) — tie-break galaxy name
  for (const t of Object.keys(inverted)) {
    inverted[t].sort((a, b) => (b.score - a.score) || a.galaxy.localeCompare(b.galaxy));
  }
  return { totalGalaxies: N, tokenCount: Object.keys(inverted).length, forward, inverted };
}

// ── the 1-lookup routing API (pure) ─────────────────────────────────────────────

// whoKnows(query, knowsMap): which galaxies hold context on the query topics. Pure.
// Tokenize query → sum each matching token's posting-list scores per galaxy → rank. Empty/no-signal → [].
// Returns [{ galaxy, score, matchedTopics:[token] }] (≤ k). Multi-token queries discriminate sharply; a bare
// ambiguous single token may tie (see the RECALL BOUND note at the top) — prefer 2+ topic words for routing.
export function whoKnows(query, knowsMap, opts = {}) {
  const k = Number.isFinite(opts.k) ? opts.k : DEFAULT_WHO_K;
  const inverted = knowsMap && knowsMap.inverted && typeof knowsMap.inverted === "object" ? knowsMap.inverted : null;
  if (!inverted) return [];
  const qTokens = Array.isArray(opts.queryTokens) ? opts.queryTokens : tokenize(query || "", { maxLen: 4000, maxTokens: QUERY_MAX_TOKENS });
  if (!qTokens.length) return [];
  const acc = new Map(); // galaxy → { score, matched:Set }
  for (const qt of qTokens) {
    const postings = inverted[qt];
    if (!Array.isArray(postings)) continue;
    for (const p of postings) {
      if (!p || typeof p.galaxy !== "string") continue;
      const cur = acc.get(p.galaxy) || { score: 0, matched: new Set() };
      cur.score += Number.isFinite(p.score) ? p.score : 0;
      cur.matched.add(qt);
      acc.set(p.galaxy, cur);
    }
  }
  const ranked = [...acc.entries()]
    .map(([galaxy, v]) => ({ galaxy, score: +v.score.toFixed(4), matchedTopics: [...v.matched].sort() }))
    .sort((a, b) => (b.score - a.score) || (b.matchedTopics.length - a.matchedTopics.length) || a.galaxy.localeCompare(b.galaxy));
  return ranked.slice(0, Math.max(0, k));
}

// ── orchestrator (injected deps; fail-soft; NEVER throws) ───────────────────────
// reasons: disabled · no-cards · written · write-error · error
export function build(opts = {}) {
  if (!opts || typeof opts !== "object") opts = {};
  try {
    if (process.env.PRISM_GCF_KNOWS_DISABLE === "1") {
      return { ok: false, disabled: true, written: false, reason: "disabled", totalGalaxies: 0 };
    }
    const roots = { ...DEFAULT_ROOTS, ...(opts.roots || {}) };
    const knowsPath = opts.knowsPath || `${roots.cardsDir}/KNOWS-MAP.json`;
    const writeImpl = opts.writeImpl || ((f, d) => fs.writeFileSync(f, d));
    const now = typeof opts.now === "function" ? opts.now : () => Date.now();
    const cards = Array.isArray(opts.cards)
      ? opts.cards
      : loadCardsFromIndex({ indexPath: opts.indexPath, readImpl: opts.readImpl });
    if (!cards.length) return { ok: true, written: false, reason: "no-cards", totalGalaxies: 0 };
    const map = buildKnowsMap(cards, opts);
    const json = {
      schemaVersion: "1.0.0",
      generatedAt: new Date(now()).toISOString(),
      totalGalaxies: map.totalGalaxies,
      tokenCount: map.tokenCount,
      topTopics: Number.isFinite(opts.topTopics) ? opts.topTopics : DEFAULT_TOP_TOPICS,
      forward: map.forward,
      inverted: map.inverted,
    };
    try {
      writeImpl(knowsPath, JSON.stringify(json, null, 2));
    } catch (e) {
      return { ok: false, written: false, reason: "write-error", error: String((e && e.message) || e), totalGalaxies: map.totalGalaxies };
    }
    return {
      ok: true,
      written: true,
      reason: "written",
      totalGalaxies: map.totalGalaxies,
      tokenCount: map.tokenCount,
      knowsPath,
    };
  } catch (e) {
    return { ok: false, written: false, reason: "error", error: String((e && e.message) || e), totalGalaxies: 0 };
  }
}

// Load a previously-built KNOWS-MAP.json. Fail-soft → null. (For whoKnows() consumers like the CLI / a hook.)
export function loadKnowsMap(opts = {}) {
  const readImpl = opts.readImpl || defaultRead;
  try {
    const raw = readImpl(opts.knowsPath || DEFAULT_KNOWS_PATH);
    if (raw == null) return null;
    const j = JSON.parse(raw);
    return j && typeof j === "object" && j.inverted ? j : null;
  } catch { return null; }
}
