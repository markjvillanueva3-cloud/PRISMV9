#!/usr/bin/env node
// wiki-domain-bias.mjs
// SYSTEM-VIZ-BRAIN-MS0/U-P1-WIKI-PRELOAD-BY-DOMAIN
//
// Surgical helper for wiki-precheck-inject.mjs — biases the BM25 score of wiki
// candidates toward the *active milestone domain* so a chat working on
// SYSTEM-VIZ-BRAIN-MS0 sees system-viz wiki entries ranked higher than
// generically-matching ones.
//
// Domain tokens are derived from:
//   1. chat-slots.json — active slot's `topic` + `branch` (most specific)
//   2. state/CURRENT_POSITION.md — first H1 (milestone heading)
//
// Boost is ADDITIVE to the BM25 score (entry.toks ∩ domainTokens × per-hit
// constant). Default-on; knob PRISM_WIKI_DOMAIN_BIAS_DISABLE=1 to disable.
//
// Pure-function design — no in-process caching, no side effects. Callable from
// any hook/script that already has the chat's session id.

import { readFileSync, existsSync } from "node:fs";

const SLOTS_FILE = process.env.PRISM_CHAT_SLOTS_FILE || "H:/prism/state/shared/chat-slots.json";
const POSITION_FILE = process.env.PRISM_CURRENT_POSITION || "H:/prism/state/CURRENT_POSITION.md";

// Stopwords we never want as domain tokens — too common to discriminate.
const DOMAIN_STOP = new Set([
  "ms0", "ms1", "ms2", "ms3", "ms4", "ms5", "ms6", "ms7", "ms8", "ms9",
  "the", "and", "for", "work", "main", "prism", "live", "fix", "new",
  "src", "data", "node", "all", "any", "one", "two", "three", "via",
]);

function tokenize(s) {
  if (!s) return [];
  // Split camelCase first (`MillKienzle` → `Mill Kienzle`), then on any
  // non-alphanumeric (path slashes, hyphens, dots, underscores) so a topic
  // like "system-viz-brain-ms0" yields ["system","viz","brain"] (ms0 stopped)
  // rather than one monolithic token.
  const decamel = String(s).replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return decamel
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !DOMAIN_STOP.has(t));
}

// Resolve the active slot from chat-slots.json. Strategy:
//   1. If chatId provided AND a slot matches it → return that slot.
//   2. If chatId provided AND no slot matches → return null (do NOT fall back
//      to "freshest peer" — that would leak another chat's domain into THIS
//      chat's wiki ranking, which is worse than no bias at all).
//   3. If chatId not provided → return the slot with the freshest non-null topic.
function resolveActiveSlot(chatId) {
  try {
    if (!existsSync(SLOTS_FILE)) return null;
    const j = JSON.parse(readFileSync(SLOTS_FILE, "utf8"));
    const slots = j.slots || {};
    if (chatId) {
      for (const s of Object.values(slots)) {
        if (s && s.chatId === chatId) return s;
      }
      return null;
    }
    let best = null;
    let bestTs = 0;
    for (const s of Object.values(slots)) {
      if (!s || !s.topic) continue;
      const t = s.lastHeartbeat ? Date.parse(s.lastHeartbeat) : 0;
      if (t > bestTs) { bestTs = t; best = s; }
    }
    return best;
  } catch { return null; }
}

// Strip common branch-prefix decorations so "work/cad-fusion-live-ms0" yields
// useful tokens ("cad", "fusion", "live") instead of "work".
function stripBranchPrefix(branch) {
  return String(branch || "").replace(/^(?:work|feat|fix|refs|chore|docs)\/+/, "");
}

export function getDomainTokens({ chatId } = {}) {
  if (process.env.PRISM_WIKI_DOMAIN_BIAS_DISABLE === "1") return [];
  const tokens = new Set();

  const active = resolveActiveSlot(chatId);
  if (active) {
    for (const t of tokenize(active.topic)) tokens.add(t);
    for (const t of tokenize(stripBranchPrefix(active.branch))) tokens.add(t);
  }

  try {
    if (existsSync(POSITION_FILE)) {
      const text = readFileSync(POSITION_FILE, "utf8");
      const m = text.match(/^#\s+(.+)$/m);
      if (m) for (const t of tokenize(m[1])) tokens.add(t);
    }
  } catch { /* missing CURRENT_POSITION is fine */ }

  return [...tokens];
}

// Resolve the active slot's NAME (the chat-slots.json key, e.g. "oscar") for a
// chatId. The slot object carries no name field — the name IS the key. chatId-gated
// (no freshest-peer fallback — leaking a peer's identity would mis-domain THIS chat's
// tribal routing). Used by tribal-by-domain-inject to map a slot to its canonical
// galaxy domain, resolving the slot-token hijack (U-TRIBAL-SLOT-DOMAIN-WIRE 2026-06-01).
export function activeSlotName(chatId) {
  if (!chatId) return null;
  try {
    if (!existsSync(SLOTS_FILE)) return null;
    const j = JSON.parse(readFileSync(SLOTS_FILE, "utf8"));
    const slots = j.slots || {};
    for (const [name, s] of Object.entries(slots)) {
      if (s && s.chatId === chatId) return name;
    }
    return null;
  } catch { return null; }
}

// Score boost a candidate entry should receive given its domain overlap.
// Returns 0 when no domain context. Each unique domain-token hit on entry.toks
// adds BOOST_PER_HIT; a match on source-path / category counts at half weight
// (they're a hint, not an exact concept match).
//
// Hard-capped at MAX_DOMAIN_BOOST to keep the domain bias BELOW the curated
// boost_keywords tier already in wiki-precheck-inject (BOOST_BASE_SCORE=12,
// BOOST_PER_KEYWORD=3). A deliberate hand-curation must always beat a
// coincidental domain-token overlap. With the cap at 4.5, the strongest
// possible domain effect equals one curated keyword's per-keyword bonus
// (+3 from BOOST_PER_KEYWORD) plus a small margin — never the curated base.
const BOOST_PER_HIT = 1.5;
const BOOST_PATH_WEIGHT = 0.5;
const MAX_DOMAIN_BOOST = 4.5;

export function domainBoostFor(entry, domainTokens) {
  if (!entry || !Array.isArray(domainTokens) || !domainTokens.length) return 0;
  const ts = new Set(entry.toks || []);
  let strongHits = 0;
  for (const dt of domainTokens) if (ts.has(dt)) strongHits++;

  let pathHits = 0;
  if (entry.source) {
    const sourceTokens = new Set(tokenize(entry.source));
    for (const dt of domainTokens) if (sourceTokens.has(dt) && !ts.has(dt)) pathHits++;
  }
  if (entry.category) {
    const cat = String(entry.category).toLowerCase();
    for (const dt of domainTokens) if (cat === dt && !ts.has(dt)) pathHits++;
  }
  const raw = strongHits * BOOST_PER_HIT + pathHits * BOOST_PER_HIT * BOOST_PATH_WEIGHT;
  return Math.min(raw, MAX_DOMAIN_BOOST);
}

// Convenience: derive chatId from a UserPromptSubmit input shape (session_id).
// claude-<8hex> is the canonical PRISM stable-id format.
export function chatIdFromInput(input) {
  const sid = input && (input.session_id || input.sessionId);
  if (!sid) return null;
  const s = String(sid).slice(0, 8);
  return /^[0-9a-f]{8}$/i.test(s) ? `claude-${s.toLowerCase()}` : null;
}
