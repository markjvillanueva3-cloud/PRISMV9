#!/usr/bin/env node
// PSN-ENHANCE-MS0/U-PSN-OBSERVABILITY-LEG (2026-05-24) — formalize a 13th PSN
// leg "Observability" wrapping the 5 scattered surfaces (scrutiny-ledger +
// error-pattern-promote + token-economy + route-savings + ollama-offload-stats)
// plus 2 new signals (hallucination detector + RAGAS-style retrieval-eval).
// Closes Brij "AI Infrastructure Master Tree" layer 07. Pure-Node, fail-soft.

import { readFileSync, existsSync } from "node:fs";

const DEFAULT_ROOTS = {
  scrutiny: "H:/prism/mcp-server/data/state/SCRUTINY_LEDGER.json",
  errorPattern: "H:/prism/mcp-server/data/state/ERROR_PATTERN_LEDGER.json",
  tokenEconomy: "H:/prism/state/shared/.token-economy-stats.json",
  routeSavings: "H:/prism/state/shared/route-savings-stats.json",
  ollamaOffload: "H:/prism/mcp-server/data/state/ollama-offload-stats.json",
};

function readJsonSafe(path, readImpl = readFileSync, existsImpl = existsSync) {
  if (!existsImpl(path)) return null;
  try { return JSON.parse(readImpl(path, "utf8")); }
  catch { return null; }
}

export function loadObservabilityState({ roots = DEFAULT_ROOTS, readImpl, existsImpl } = {}) {
  return {
    scrutiny: readJsonSafe(roots.scrutiny, readImpl, existsImpl),
    errorPattern: readJsonSafe(roots.errorPattern, readImpl, existsImpl),
    tokenEconomy: readJsonSafe(roots.tokenEconomy, readImpl, existsImpl),
    routeSavings: readJsonSafe(roots.routeSavings, readImpl, existsImpl),
    ollamaOffload: readJsonSafe(roots.ollamaOffload, readImpl, existsImpl),
  };
}

export function summarizeObservability(state) {
  if (!state || typeof state !== "object") return null;
  const safe = (obj, key, def = 0) => (obj && typeof obj[key] === "number" ? obj[key] : def);
  const scrutinyEntries = state.scrutiny && typeof state.scrutiny === "object" ? Object.keys(state.scrutiny).length : 0;
  const errorPatterns = state.errorPattern && Array.isArray(state.errorPattern.patterns) ? state.errorPattern.patterns.length : 0;
  const offloadRate = state.ollamaOffload
    ? (() => {
        const off = safe(state.ollamaOffload, "offloaded", 0);
        const kept = safe(state.ollamaOffload, "keptOnClaude", 0);
        const total = off + kept;
        return total > 0 ? off / total : 0;
      })()
    : 0;
  return {
    surfacesPresent: Object.entries(state).filter(([, v]) => v !== null).length,
    scrutinyEntries,
    errorPatterns,
    offloadRate,
    tokenEconomy: state.tokenEconomy || null,
    routeSavings: state.routeSavings || null,
  };
}

const HALLUCINATION_SIGNALS = [
  { id: "no-citation", regex: /\b(per|according to|cite[ds]?|source:|ref:|\[\d+\])\b/i, weight: 0.4, invert: true },
  { id: "absolute-claim", regex: /\b(always|never|every|impossible|guaranteed|100%)\b/i, weight: 0.2 },
  { id: "fabricated-version", regex: /\bv?\d+\.\d+\.\d+\b(?!.*github|.*npm|.*pypi)/i, weight: 0.1 },
  { id: "vague-attribution", regex: /\b(some say|it is known|experts agree|studies show)\b/i, weight: 0.3 },
];

export function detectHallucination(text, opts = {}) {
  if (typeof text !== "string" || text.length === 0) return { score: 0, signals: [] };
  const signals = [];
  let score = 0;
  for (const sig of HALLUCINATION_SIGNALS) {
    const matched = sig.regex.test(text);
    const triggered = sig.invert ? !matched : matched;
    if (triggered) {
      signals.push({ id: sig.id, weight: sig.weight });
      score += sig.weight;
    }
  }
  return { score: Math.min(1, score), signals };
}

export function evaluateRetrieval(queries, hits, opts = {}) {
  if (!Array.isArray(queries) || !Array.isArray(hits)) return { precisionAtK: 0, recallAtK: 0, mrr: 0, n: 0 };
  const k = opts.k ?? 5;
  let totalPrecision = 0;
  let totalRecall = 0;
  let totalReciprocalRank = 0;
  let n = 0;
  for (const q of queries) {
    if (!q || !q.id) continue;
    const expected = new Set(Array.isArray(q.expected) ? q.expected : []);
    if (expected.size === 0) continue;
    const got = (hits.find((h) => h.queryId === q.id)?.results || []).slice(0, k);
    let hitCount = 0;
    let firstHitRank = 0;
    got.forEach((r, idx) => {
      if (expected.has(r)) {
        hitCount++;
        if (firstHitRank === 0) firstHitRank = idx + 1;
      }
    });
    totalPrecision += got.length > 0 ? hitCount / got.length : 0;
    totalRecall += hitCount / expected.size;
    totalReciprocalRank += firstHitRank > 0 ? 1 / firstHitRank : 0;
    n++;
  }
  return n === 0
    ? { precisionAtK: 0, recallAtK: 0, mrr: 0, n: 0 }
    : { precisionAtK: totalPrecision / n, recallAtK: totalRecall / n, mrr: totalReciprocalRank / n, n };
}

export const __test_constants = { DEFAULT_ROOTS, HALLUCINATION_SIGNALS };
