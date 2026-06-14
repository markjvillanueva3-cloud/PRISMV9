#!/usr/bin/env node
// scripts/lib/xgalaxy-inject.mjs — GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-XGALAXY-INJECT (alpha, 2026-05-31).
//
// SELECTIVE cross-galaxy context-card inject — Phase C of the federation.
//
// U-GCF-CARD built per-galaxy ≤1 KB context-cards; U-GCF-CAG-CARDS bundled them into ONE
// cold-anchorable artifact (ALL-CARDS.md, ~35 KB) so the prompt cache can hold the whole catalog
// ("available if needed"). This unit adds the WARM, per-prompt SELECTIVE surface: given the active
// slot's galaxy + the user's query, inject ONLY the top-K OTHER galaxy cards most relevant to THIS
// task — NEVER all 34. A flat 34-card dump every prompt is exactly the token waste this milestone
// fights; the cold bundle already covers breadth, this covers attention-direction. Mirrors
// master-index-precheck-inject's "top-5 ranked hits" pattern, but over galaxy cards not graph nodes.
//
// DESIGN (mirrors galaxy-context-card.mjs + master-index-search-lib.mjs for R11 consistency):
//   • pure-core scorers + injected fs deps + fail-soft — an OPTIMIZATION, never a correctness gate.
//   • REUSE, don't re-derive (R8): tokenize() from master-index-search-lib; utf8Truncate()/
//     DEFAULT_ROOTS from galaxy-context-card; galaxyForSlot() from slot-galaxy-map (single source).
//   • NEVER broadcast — empty/no-signal query → [] (no inject); self ALWAYS excluded; hard byte cap.
//
// Knobs:
//   PRISM_GCF_XGALAXY_DISABLE=1     → maybeInjectCrossGalaxy is a no-op
//   PRISM_GCF_XGALAXY_K=N           → top-K cards (default 3)
//   PRISM_GCF_XGALAXY_THRESHOLD=F   → min query-token-overlap similarity 0..1 (default 0.15)
//   PRISM_GCF_XGALAXY_MAX_BYTES=N   → total inject byte budget (default 3584)

import fs from "node:fs";
import { tokenize } from "./master-index-search-lib.mjs";
import { utf8Truncate, DEFAULT_ROOTS } from "./galaxy-context-card.mjs";
import { galaxyForSlot } from "./slot-galaxy-map.mjs";

export const DEFAULT_K = 3;
export const DEFAULT_THRESHOLD = 0.15;
export const DEFAULT_MAX_BYTES = 3584; // ~3.5 KB — comfortably fits 3 ≤1 KB cards + the header
export const DEFAULT_INDEX_PATH = `${DEFAULT_ROOTS.cardsDir}/INDEX.json`;
const ROLE_BOOST = 2;       // a query token that hits the card's ROLE line outweighs a body hit
const QUERY_MAX_TOKENS = 24; // tokenize's own default (8) is too few for relevance ranking
const CARD_MAX_TOKENS = 400; // a card has ~12 facts; capture them all, not just the first 8

// ── env helpers (call-time read so per-call env overrides take effect) ────────
function envInt(name, dflt) {
  const v = process.env[name];
  if (v == null || v === "") return dflt;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dflt;
}
function envFloat(name, dflt) {
  const v = process.env[name];
  if (v == null || v === "") return dflt;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : dflt;
}

// ── pure scorers ──────────────────────────────────────────────────────────────

// Extract the role from a card's "## <galaxy> — <role>" header. "" if absent. Pure.
// Splits on the FIRST space-dash-space (em/en/hyphen) so a hyphenated galaxy name
// (database-expansion, token-optimization, post-processor) is NOT mistaken for the role —
// mirrors deriveRole() in galaxy-context-card.mjs (R11 convention consistency). The producer
// side (galaxy-context-card.mjs renderCard) emits the header with a literal " — " (space + em-dash
// + space); keep these two in lock-step — a separator change there silently disables role-boost here.
export function parseCardRole(cardText) {
  const m = String(cardText || "").match(/^##\s+(.+)$/m);
  if (!m) return "";
  const parts = m[1].trim().split(/\s[—–-]\s/);
  return parts.length > 1 ? parts.slice(1).join(" — ").trim() : "";
}

// Score one card's text against PRE-TOKENIZED query tokens. Pure, deterministic.
//   similarity = (# distinct query tokens present in card) / (# query tokens)  ∈ [0,1]
//   score      = matched-token weight (role-line hits count ROLE_BOOST×) — for ranking; similarity gates.
// tokenize() already dedupes, so each query token is counted at most once.
export function scoreCard(queryTokens, cardText, opts = {}) {
  const roleBoost = Number.isFinite(opts.roleBoost) ? opts.roleBoost : ROLE_BOOST;
  const qn = Array.isArray(queryTokens) ? queryTokens.length : 0;
  if (qn === 0) return { score: 0, matched: 0, similarity: 0 };
  const bodyTokens = new Set(tokenize(cardText, { maxLen: 8000, maxTokens: CARD_MAX_TOKENS }));
  const roleTokens = new Set(tokenize(parseCardRole(cardText), { maxLen: 1000, maxTokens: 64 }));
  let matched = 0;
  let score = 0;
  for (const qt of queryTokens) {
    if (roleTokens.has(qt)) { matched++; score += roleBoost; }
    else if (bodyTokens.has(qt)) { matched++; score += 1; }
  }
  return { score, matched, similarity: matched / qn };
}

// Select the top-K most-relevant OTHER galaxy cards for a query. Pure given `cards`.
//   cards: [{ galaxy, text }]. Excludes selfGalaxy. Keeps cards with matched>0 AND similarity>=threshold.
//   Returns ranked [{ galaxy, text, score, matched, similarity }] (≤ k). Empty query / no signal → [].
export function selectCrossGalaxyCards(args = {}) {
  const { query, queryTokens, selfGalaxy, cards, roleBoost } = args;
  const k = Number.isFinite(args.k) ? args.k : DEFAULT_K;
  const threshold = Number.isFinite(args.threshold) ? args.threshold : DEFAULT_THRESHOLD;
  const qTokens = Array.isArray(queryTokens)
    ? queryTokens
    : tokenize(query || "", { maxLen: 4000, maxTokens: QUERY_MAX_TOKENS });
  if (!qTokens.length) return [];               // no signal → NEVER broadcast
  if (!Array.isArray(cards) || !cards.length) return [];
  const self = typeof selfGalaxy === "string" ? selfGalaxy : "";
  const scored = [];
  for (const c of cards) {
    if (!c || typeof c.galaxy !== "string" || typeof c.text !== "string") continue;
    if (self && c.galaxy === self) continue;     // exclude self (no-op when self unknown)
    const { score, matched, similarity } = scoreCard(qTokens, c.text, { roleBoost });
    if (matched > 0 && similarity >= threshold) {
      scored.push({ galaxy: c.galaxy, text: c.text, score, matched, similarity });
    }
  }
  scored.sort((a, b) =>
    (b.score - a.score) || (b.similarity - a.similarity) || a.galaxy.localeCompare(b.galaxy));
  return scored.slice(0, Math.max(0, k));
}

// Render selected cards into ONE inject block, hard-capped to maxBytes. Pure.
// Returns { text, bytes, count, truncated }. count<selected.length ⇒ some cards didn't fit (honest).
export function renderXGalaxyInject(selected, opts = {}) {
  const maxBytes = Number.isFinite(opts.maxBytes) ? opts.maxBytes : DEFAULT_MAX_BYTES;
  if (!Array.isArray(selected) || !selected.length) {
    return { text: "", bytes: 0, count: 0, truncated: false };
  }
  const header = `## 🌌 Cross-galaxy context — top ${selected.length} relevant to your task\n`
    + `_Selected by query↔card similarity (NOT a broadcast). Full 34-card catalog is the cold-anchored `
    + `ALL-CARDS.md. Disable: PRISM_GCF_XGALAXY_DISABLE=1._`;
  const parts = [header];
  let included = 0;
  for (const s of selected) {
    const candidate = parts.concat(s.text).join("\n\n");
    if (Buffer.byteLength(candidate, "utf8") > maxBytes) break; // hard cap — stop adding cards
    parts.push(s.text);
    included++;
  }
  if (included === 0) {
    // even header+first card overflow the budget — emit an honestly-truncated single card
    const { text, truncated } = utf8Truncate(`${header}\n\n${selected[0].text}`, maxBytes);
    return { text, bytes: Buffer.byteLength(text, "utf8"), count: 1, truncated };
  }
  const text = parts.join("\n\n");
  return { text, bytes: Buffer.byteLength(text, "utf8"), count: included, truncated: included < selected.length };
}

// ── I/O (injected deps; fail-soft) ────────────────────────────────────────────

// Load all built cards listed in INDEX.json. Fail-soft: unreadable/garbage index → []; an unreadable
// single card is skipped (never fatal). Returns [{ galaxy, text }].
export function loadCardsFromIndex(opts = {}) {
  const indexPath = opts.indexPath || DEFAULT_INDEX_PATH;
  const readImpl = opts.readImpl || ((f) => { try { return fs.readFileSync(f, "utf8"); } catch { return null; } });
  let parsed;
  try {
    const raw = readImpl(indexPath);
    if (raw == null) return [];
    parsed = JSON.parse(raw);
  } catch { return []; }
  const entries = parsed && Array.isArray(parsed.cards) ? parsed.cards : [];
  const out = [];
  for (const e of entries) {
    if (!e || typeof e.galaxy !== "string" || typeof e.path !== "string") continue;
    const text = readImpl(e.path);
    if (text == null || !String(text).trim()) continue;
    out.push({ galaxy: e.galaxy, text: String(text) });
  }
  return out;
}

// ── orchestrator (the hook/CLI entry point) ───────────────────────────────────

// FAIL-SOFT — NEVER throws. Returns { ok, injected, count, text, reason, galaxy, selected? }.
// reasons: disabled · empty-query · no-cards · no-match · injected · error
export function maybeInjectCrossGalaxy(opts = {}) {
  if (!opts || typeof opts !== "object") opts = {}; // a null/garbage call is empty-query, not an error
  try {
    if (process.env.PRISM_GCF_XGALAXY_DISABLE === "1") {
      return { ok: false, injected: false, count: 0, text: "", reason: "disabled" };
    }
    const query = typeof opts.query === "string" ? opts.query : "";
    if (!query.trim()) return { ok: true, injected: false, count: 0, text: "", reason: "empty-query" };

    let galaxy = (typeof opts.galaxy === "string" && opts.galaxy) ? opts.galaxy : null;
    if (!galaxy && typeof opts.slot === "string" && opts.slot) galaxy = galaxyForSlot(opts.slot); // may be null

    const k = Number.isFinite(opts.k) ? opts.k : envInt("PRISM_GCF_XGALAXY_K", DEFAULT_K);
    const threshold = Number.isFinite(opts.threshold) ? opts.threshold : envFloat("PRISM_GCF_XGALAXY_THRESHOLD", DEFAULT_THRESHOLD);
    const maxBytes = Number.isFinite(opts.maxBytes) ? opts.maxBytes : envInt("PRISM_GCF_XGALAXY_MAX_BYTES", DEFAULT_MAX_BYTES);

    const cards = Array.isArray(opts.cards)
      ? opts.cards
      : loadCardsFromIndex({ indexPath: opts.indexPath, readImpl: opts.readImpl });
    if (!cards.length) return { ok: true, injected: false, count: 0, text: "", reason: "no-cards", galaxy };

    const selected = selectCrossGalaxyCards({ query, selfGalaxy: galaxy || "", cards, k, threshold, roleBoost: opts.roleBoost });
    if (!selected.length) return { ok: true, injected: false, count: 0, text: "", reason: "no-match", galaxy };

    const rendered = renderXGalaxyInject(selected, { maxBytes });
    return {
      ok: true,
      injected: rendered.count > 0,
      count: rendered.count,
      text: rendered.text,
      reason: "injected",
      galaxy,
      selected: selected.map((s) => ({ galaxy: s.galaxy, similarity: Number(s.similarity.toFixed(4)), score: s.score })),
    };
  } catch (e) {
    return { ok: false, injected: false, count: 0, text: "", reason: "error", error: String((e && e.message) || e) };
  }
}
