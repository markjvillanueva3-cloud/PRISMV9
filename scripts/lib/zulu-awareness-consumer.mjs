// ZULU-AWARENESS-MS1/U-AW01 — shared consumer library for the awareness pipeline.
//
// Purpose: ONE place that loads `state/shared/zulu-awareness-index.json` and
// the tuned weights, then exposes thin pure helpers that downstream consumers
// (zulu-orchestrator-sweep.mjs, AISystemRouterEngine.ts, PRISMSelfAwarenessEngine.ts)
// all use without each one re-implementing fingerprint lookup + ranking.
//
// Design invariants:
//   1. Fail-soft — every helper returns a stable empty shape when the index
//      is missing/corrupt; never throws. R12: every empty result names a `reason`.
//   2. Pure — readers are injected; the default `defaultReader` uses fs but tests
//      can pass a synthetic reader.
//   3. Single-load cache — the index is read once per process and memoized.
//      Callers that need fresh data call `invalidateAwarenessCache()`.
//   4. Refuse-list HARD VETO is preserved end-to-end — `rankSlots()` filters
//      refused slots out (consistent with `rankSlotsForTask()` in the pipeline lib).
//
// Knobs (env):
//   PRISM_ZULU_AWARENESS_INDEX  — override default index path (tests/alt installs)
//   PRISM_ZULU_AWARENESS_WEIGHTS — override default weights path
//   PRISM_ZULU_AWARENESS_DISABLE=1 — every reader returns the empty envelope

import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_WEIGHTS,
  rankSlotsForTask,
  scoreSlotForTask,
  summarizeRanking,
} from "./zulu-awareness-pipeline.mjs";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const DEFAULT_INDEX = process.env.PRISM_ZULU_AWARENESS_INDEX
  || path.join(PRISM, "state/shared/zulu-awareness-index.json");
const DEFAULT_WEIGHTS_FILE = process.env.PRISM_ZULU_AWARENESS_WEIGHTS
  || path.join(PRISM, "state/shared/zulu-awareness-weights.json");

const EMPTY_ENVELOPE = Object.freeze({
  ok: false,
  reason: "not-loaded",
  fingerprints: [],
  weights: DEFAULT_WEIGHTS,
  source: null,
  generatedAt: null,
});

let _cache = null;

export function defaultReader(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Load + memoize. Returns an envelope with normalized fields, always.
// Injectable reader makes the lib hermetic-test-friendly.
export function loadAwareness(opts = {}) {
  if (process.env.PRISM_ZULU_AWARENESS_DISABLE === "1") {
    return { ...EMPTY_ENVELOPE, reason: "disabled-env" };
  }
  if (_cache) return _cache;
  const reader = typeof opts.reader === "function" ? opts.reader : defaultReader;
  const indexPath = opts.indexPath || DEFAULT_INDEX;
  const weightsPath = opts.weightsPath || DEFAULT_WEIGHTS_FILE;
  const indexDoc = reader(indexPath);
  if (!indexDoc || typeof indexDoc !== "object" || !Array.isArray(indexDoc.fingerprints)) {
    _cache = { ...EMPTY_ENVELOPE, reason: "no-index", source: indexPath };
    return _cache;
  }
  const weightsDoc = reader(weightsPath);
  const weights = (weightsDoc && typeof weightsDoc === "object" && weightsDoc.weights)
    ? weightsDoc.weights
    : DEFAULT_WEIGHTS;
  _cache = {
    ok: true,
    reason: null,
    fingerprints: indexDoc.fingerprints,
    weights,
    source: indexPath,
    generatedAt: indexDoc.generatedAt || null,
  };
  return _cache;
}

export function invalidateAwarenessCache() {
  _cache = null;
}

// Lookup a single slot's fingerprint. Returns null if absent.
export function lookupSlot(slot, opts = {}) {
  if (typeof slot !== "string" || !slot) return null;
  const env = loadAwareness(opts);
  if (!env.ok) return null;
  return env.fingerprints.find(fp => fp && fp.slot === slot) || null;
}

// Rank slots for a candidate task. Returns the same shape as
// `rankSlotsForTask` from the pipeline lib, plus a `summary` string and
// the env's `reason` when empty.
//   taskDescriptor: { text, domain?, kind? }
//   opts.maxResults: cap (default 5)
export function rankSlots(taskDescriptor, opts = {}) {
  const env = loadAwareness(opts);
  if (!env.ok) {
    return { ok: false, reason: env.reason, ranking: [], summary: "(no awareness index)" };
  }
  if (!taskDescriptor || typeof taskDescriptor !== "object") {
    return { ok: false, reason: "no-task", ranking: [], summary: "(no task descriptor)" };
  }
  const ranking = rankSlotsForTask(taskDescriptor, env.fingerprints, env.weights);
  const top = typeof opts.maxResults === "number" ? ranking.slice(0, opts.maxResults) : ranking;
  return {
    ok: true,
    reason: null,
    ranking: top,
    summary: summarizeRanking(top, 3),
    source: env.source,
    generatedAt: env.generatedAt,
  };
}

// Score a single slot against a task descriptor. Convenience for consumers that
// want a slot's awareness-relevance number for a candidate task.
export function scoreSlot(slot, taskDescriptor, opts = {}) {
  const fp = lookupSlot(slot, opts);
  if (!fp) return { ok: false, reason: "no-fingerprint", score: -Infinity, evidence: [] };
  const env = loadAwareness(opts);
  const { score, evidence } = scoreSlotForTask(fp, taskDescriptor || {}, env.weights);
  return { ok: true, reason: null, score, evidence, fingerprint: fp };
}

// Enrich an array of slot picks (orchestrator-sweep summaries) with
// awareness fingerprint info for observability. Pure — does not mutate input.
// Each pick gets `awareness: { fingerprint, hermesRole, primaryDomain, queueLength }`
// when its fingerprint is present, else `null`.
export function enrichSlotPicks(picks, opts = {}) {
  if (!Array.isArray(picks)) return [];
  return picks.map(p => {
    if (!p || typeof p !== "object") return p;
    const slot = p.slot;
    const fp = lookupSlot(slot, opts);
    const awareness = fp ? {
      hermesRole: fp.hermesRole || "specialist",
      primaryDomain: Array.isArray(fp.domains) && fp.domains.length > 0 ? fp.domains[0] : null,
      queueLength: typeof fp.queueLength === "number" ? fp.queueLength : 0,
      vizNodeCount: typeof fp.vizNodeCount === "number" ? fp.vizNodeCount : 0,
    } : null;
    return { ...p, awareness };
  });
}

// Recommend slots for a domain hint — used by PRISMSelfAwarenessEngine to
// surface per-slot capability matches alongside engine matches.
// Returns [{slot, hermesRole, domains, score, evidence}] for slots whose
// fingerprint's `domains` intersect the hint OR scoring > 0 for the hint as text.
export function recommendSlotsForDomain(domainHint, opts = {}) {
  const env = loadAwareness(opts);
  if (!env.ok) return [];
  if (typeof domainHint !== "string" || !domainHint) return [];
  const hint = domainHint.toLowerCase().trim();
  const descriptor = { domain: hint, text: hint };
  const ranking = rankSlotsForTask(descriptor, env.fingerprints, env.weights);
  return ranking
    .filter(r => r.score > 0)
    .map(r => ({
      slot: r.slot,
      hermesRole: r.fingerprint?.hermesRole || "specialist",
      domains: Array.isArray(r.fingerprint?.domains) ? r.fingerprint.domains : [],
      score: r.score,
      evidence: r.evidence,
    }));
}
