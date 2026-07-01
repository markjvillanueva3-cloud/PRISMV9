#!/usr/bin/env node
// scripts/lib/galaxy-push.mjs — GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-PUSH (alpha, 2026-05-31).
//
// Phase C REDISTRIBUTE-DOWN: selective cross-galaxy learning fan-out.
//
// When a galaxy ships a high-impact learning, push a ONE-LINE pointer to the (few) OTHER galaxies whose
// domain the learning is actually relevant to — NEVER a broadcast (broadcast is the token-waste failure mode
// this whole milestone fights). The "high-impact learning" per galaxy is its MASTER-DIGEST headline delta
// (ranked[].topFact — the highest recency+impact fact U-GCF-SALIENCE/ROLLUP surfaced). The "whose domain
// matches" is answered by U-GCF-KNOWS-MAP's whoKnows() (TF-IDF over the cards). So PUSH is a pure transform
// over TWO already-shipped federation artifacts (MASTER-DIGEST.json + KNOWS-MAP.json) — no new data source.
// Precedent: the working-path cross-galaxy transfer ([[working-path-capture]]).
//
// DESIGN (mirrors galaxy-knows-map.mjs / xgalaxy-inject.mjs for R11 consistency):
//   • pure-core (match + render) + injected fs deps + fail-soft.
//   • REUSE (R8): whoKnows()/loadKnowsMap() from galaxy-knows-map; tokenize() from master-index-search-lib;
//     DEFAULT_ROOTS from galaxy-context-card. The source learnings + the matcher are both READ, not recomputed.
//   • SELECTIVE: threshold + top-K per source, exclude-self. NEVER broadcast.
//   • SINGLE-WRITER-PER-FILE: writes ONLY its own PUSH-QUEUE.json — never INDEX.json / a galaxy MEMORY.md.
//   • ADVISORY: emits a push QUEUE + per-target INBOX; delivery into a galaxy's brain is an operator/golf step
//     (never auto-writes a peer-locked MEMORY.md).
//
// Knob: PRISM_GCF_PUSH_DISABLE=1 → pushBuild() is a no-op (pure fns still work).

import fs from "node:fs";
import { tokenize } from "./master-index-search-lib.mjs";
import { whoKnows, loadKnowsMap } from "./galaxy-knows-map.mjs";
import { DEFAULT_ROOTS } from "./galaxy-context-card.mjs";

export const DEFAULT_DIGEST_JSON_PATH = `${DEFAULT_ROOTS.cardsDir}/MASTER-DIGEST.json`;
export const DEFAULT_KNOWS_PATH = `${DEFAULT_ROOTS.cardsDir}/KNOWS-MAP.json`;
export const DEFAULT_QUEUE_PATH = `${DEFAULT_ROOTS.cardsDir}/PUSH-QUEUE.json`;
export const DEFAULT_PUSH_K = 3;          // ≤3 targets per source — selective fan-out, NEVER a broadcast
export const DEFAULT_PUSH_THRESHOLD = 1.5; // min whoKnows idf-sum: requires a genuinely distinctive match
export const POINTER_FACT_MAX = 100;       // one-line learning summary cap (chars)
const LEARNING_MAX_TOKENS = 24;            // tokens considered from a learning's topFact

const defaultRead = (f) => { try { return fs.readFileSync(f, "utf8"); } catch { return null; } };

// ── pure match + render ─────────────────────────────────────────────────────────

// Compact a learning to a one-line summary: collapse whitespace, strip markdown bold, cap length. Pure.
export function compactLearning(fact, maxLen = POINTER_FACT_MAX) {
  if (typeof fact !== "string" || !fact.trim()) return "";
  let s = fact.replace(/\s+/g, " ").replace(/\*\*/g, "").trim();
  if (s.length > maxLen) s = s.slice(0, Math.max(0, maxLen - 1)).replace(/\s+\S*$/, "").trim() + "…";
  return s;
}

// Find the OTHER galaxies whose domain the learning is relevant to. Pure given knowsMap. Selective:
// excludes source, keeps score >= threshold, caps at k. NEVER returns the source; [] when no strong match.
export function matchTargets(learning, opts = {}) {
  const knowsMap = opts.knowsMap;
  const source = typeof (learning && learning.galaxy) === "string" ? learning.galaxy : "";
  const topFact = learning && typeof learning.topFact === "string" ? learning.topFact : "";
  if (!knowsMap || !topFact.trim()) return [];
  const k = Number.isFinite(opts.k) ? opts.k : DEFAULT_PUSH_K;
  const threshold = Number.isFinite(opts.threshold) ? opts.threshold : DEFAULT_PUSH_THRESHOLD;
  // Restrict the match to the SOURCE's DISTINCTIVE capability tokens — the KNOWS-MAP forward-map topics
  // (tf-idf-ranked) that actually appear in THIS learning. This strips generic prose tokens ("reference",
  // "per", "scope", "filename") that would otherwise drive spurious cross-galaxy pushes (they have low idf
  // so they aren't in a galaxy's distinctive forward topics). Fail-soft: no forward map, or no distinctive
  // token present in the learning → fall back to the full topFact (whoKnows tokenizes it itself).
  let queryTokens;
  const fwd = knowsMap.forward && knowsMap.forward[source];
  if (Array.isArray(fwd) && fwd.length) {
    const distinct = new Set(fwd.map((x) => x && x.topic).filter(Boolean));
    const filtered = tokenize(topFact, { maxLen: 4000, maxTokens: LEARNING_MAX_TOKENS }).filter((t) => distinct.has(t));
    if (filtered.length) queryTokens = filtered;
  }
  // ask whoKnows for a few extra so removing self still leaves k candidates
  const ranked = whoKnows(topFact, knowsMap, { queryTokens, k: k + 4 });
  return ranked
    .filter((r) => r.galaxy !== source && Number.isFinite(r.score) && r.score >= threshold)
    .slice(0, Math.max(0, k));
}

// Render the one-line push pointer a target galaxy receives. Pure.
export function renderPushPointer(source, learning, target) {
  const summary = compactLearning(learning && learning.topFact);
  const topics = target && Array.isArray(target.matchedTopics) ? target.matchedTopics : [];
  // "advisory" + topic count is honest: a single-topic match is a WEAK heuristic signal (recall is bounded by
  // the card distillations — generic words can match); a multi-topic match is stronger. The reviewer reads + judges.
  const strength = topics.length >= 2 ? "" : " [weak: 1 topic]";
  return `[push ← ${source}] ${summary} — advisory match${strength} (topics: ${topics.join(", ")}). See galaxy-cards/${source}.card.md`;
}

// Build the push queue + per-target inbox from source learnings + the knows-map. Pure.
//   learnings: [{ galaxy, topFact, salience? }] (from MASTER-DIGEST.ranked)
// Returns { sourceCount, totalPushes, pushes:[{source,learning,salience,targets:[{galaxy,score,matchedTopics,pointer}]}],
//           inbox:{galaxy:[{from,pointer,score}]} }.
export function buildPushQueue(opts = {}) {
  const learnings = Array.isArray(opts.learnings) ? opts.learnings : [];
  const knowsMap = opts.knowsMap;
  const k = opts.k, threshold = opts.threshold;
  const pushes = [];
  const inbox = {};
  for (const L of learnings) {
    if (!L || typeof L.galaxy !== "string" || typeof L.topFact !== "string" || !L.topFact.trim()) continue;
    const targets = matchTargets(L, { knowsMap, k, threshold });
    if (!targets.length) continue; // no strong cross-galaxy match → no push (selective, never broadcast)
    const enriched = targets.map((t) => {
      const pointer = renderPushPointer(L.galaxy, L, t);
      (inbox[t.galaxy] || (inbox[t.galaxy] = [])).push({ from: L.galaxy, pointer, score: t.score });
      return { galaxy: t.galaxy, score: t.score, matchedTopics: t.matchedTopics, pointer };
    });
    pushes.push({ source: L.galaxy, learning: compactLearning(L.topFact), salience: Number.isFinite(L.salience) ? L.salience : null, targets: enriched });
  }
  // sort each inbox by score desc (most-relevant incoming first)
  for (const g of Object.keys(inbox)) inbox[g].sort((a, b) => (b.score - a.score) || a.from.localeCompare(b.from));
  const totalPushes = pushes.reduce((s, p) => s + p.targets.length, 0);
  return { sourceCount: pushes.length, totalPushes, pushes, inbox };
}

// ── I/O (injected deps; fail-soft) ───────────────────────────────────────────────

// Read MASTER-DIGEST.json → source learnings [{galaxy, topFact, salience}]. Fail-soft → [].
export function loadLearnings(opts = {}) {
  const readImpl = opts.readImpl || defaultRead;
  try {
    const raw = readImpl(opts.digestJsonPath || DEFAULT_DIGEST_JSON_PATH);
    if (raw == null) return [];
    const j = JSON.parse(raw);
    const ranked = j && Array.isArray(j.ranked) ? j.ranked : [];
    return ranked
      .filter((r) => r && typeof r.galaxy === "string" && typeof r.topFact === "string" && r.topFact)
      .map((r) => ({ galaxy: r.galaxy, topFact: r.topFact, salience: Number.isFinite(r.salience) ? r.salience : null }));
  } catch { return []; }
}

// ── orchestrator (injected deps; fail-soft; NEVER throws) ───────────────────────
// reasons: disabled · no-learnings · no-knows-map · written · write-error · error
export function pushBuild(opts = {}) {
  if (!opts || typeof opts !== "object") opts = {};
  try {
    if (process.env.PRISM_GCF_PUSH_DISABLE === "1") {
      return { ok: false, disabled: true, written: false, reason: "disabled", totalPushes: 0 };
    }
    const roots = { ...DEFAULT_ROOTS, ...(opts.roots || {}) };
    const queuePath = opts.queuePath || `${roots.cardsDir}/PUSH-QUEUE.json`;
    const readImpl = opts.readImpl || defaultRead;
    const writeImpl = opts.writeImpl || ((f, d) => fs.writeFileSync(f, d));
    const now = typeof opts.now === "function" ? opts.now : () => Date.now();

    const learnings = Array.isArray(opts.learnings) ? opts.learnings : loadLearnings({ readImpl, digestJsonPath: opts.digestJsonPath });
    if (!learnings.length) return { ok: true, written: false, reason: "no-learnings", totalPushes: 0 };
    const knowsMap = opts.knowsMap || loadKnowsMap({ readImpl, knowsPath: opts.knowsPath || `${roots.cardsDir}/KNOWS-MAP.json` });
    if (!knowsMap) return { ok: true, written: false, reason: "no-knows-map", totalPushes: 0 };

    const q = buildPushQueue({ learnings, knowsMap, k: opts.k, threshold: opts.threshold });
    const json = {
      schemaVersion: "1.0.0",
      generatedAt: new Date(now()).toISOString(),
      k: Number.isFinite(opts.k) ? opts.k : DEFAULT_PUSH_K,
      threshold: Number.isFinite(opts.threshold) ? opts.threshold : DEFAULT_PUSH_THRESHOLD,
      sourceCount: q.sourceCount,
      totalPushes: q.totalPushes,
      pushes: q.pushes,
      inbox: q.inbox,
    };
    try {
      writeImpl(queuePath, JSON.stringify(json, null, 2));
    } catch (e) {
      return { ok: false, written: false, reason: "write-error", error: String((e && e.message) || e), totalPushes: q.totalPushes };
    }
    return {
      ok: true,
      written: true,
      reason: "written",
      sourceCount: q.sourceCount,
      totalPushes: q.totalPushes,
      inboxGalaxies: Object.keys(q.inbox).length,
      queuePath,
    };
  } catch (e) {
    return { ok: false, written: false, reason: "error", error: String((e && e.message) || e), totalPushes: 0 };
  }
}
