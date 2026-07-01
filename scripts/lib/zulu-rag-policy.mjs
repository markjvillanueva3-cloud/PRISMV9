// scripts/lib/zebra-rag-policy.mjs
//
// U-HRP04 — RAG-as-policy for zebra-orchestrator-sweep.mjs decision step.
// Pure-core: opts.rerank + opts.historicalDecisions injected.
//
// Given a slot's current awareness fingerprint, rerank it against historical
// fingerprints whose outcome is known. Pick the action most-similar prior
// fingerprints took. This is RAG-as-policy — the orchestrator's decision
// routes through the prior-decision substrate (PSN leg #10 NN/GNN scoring
// backbone), not a hard-coded threshold.
//
// Back-compat: when rerank/historical absent, returns null → caller uses
// the existing planSlotAction path unchanged.

export const DEFAULT_TOP_K = 3;
export const DEFAULT_MIN_SCORE = 0.4;
export const POLICY_ACTIONS = Object.freeze(["clear", "compact", "noop"]);

// fingerprint: string serialization of slot's awareness signal (caller's choice).
// historicalDecisions: [{ fingerprint, action, outcome?: 'success'|'failure'|'pending' }]
// rerank: (query, candidates[], topK) → [{candidate, score}]
//
// Returns { action, reason, evidence:[{score, fingerprint, action, outcome}] }
// or null when policy can't be inferred.
export function ragPolicyDecision({ fingerprint, historicalDecisions, rerank, topK = DEFAULT_TOP_K, minScore = DEFAULT_MIN_SCORE }) {
  if (typeof fingerprint !== "string" || fingerprint.length === 0) return null;
  if (!Array.isArray(historicalDecisions) || historicalDecisions.length === 0) return null;
  if (typeof rerank !== "function") return null;
  const candidates = historicalDecisions.map((d) => d.fingerprint || "");
  let results;
  try {
    results = rerank(fingerprint, candidates, topK);
  } catch {
    return null;
  }
  if (!Array.isArray(results)) return null;
  const tally = new Map();
  const evidence = [];
  for (const r of results) {
    const score = Number(r?.score);
    if (!Number.isFinite(score) || score < minScore) continue;
    const text = typeof r?.candidate === "string" ? r.candidate : "";
    const idx = candidates.indexOf(text);
    if (idx < 0) continue;
    const dec = historicalDecisions[idx];
    if (!dec || !POLICY_ACTIONS.includes(dec.action)) continue;
    // Skip historical decisions known to have failed (don't repeat mistakes).
    if (dec.outcome === "failure") continue;
    // Weight by score; success-outcome doubles weight.
    const weight = score * (dec.outcome === "success" ? 2 : 1);
    tally.set(dec.action, (tally.get(dec.action) || 0) + weight);
    evidence.push({ score, fingerprint: text, action: dec.action, outcome: dec.outcome ?? "pending" });
  }
  if (tally.size === 0) return null;
  let bestAction = null;
  let bestWeight = -Infinity;
  for (const [action, weight] of tally) {
    if (weight > bestWeight) { bestAction = action; bestWeight = weight; }
  }
  return {
    action: bestAction,
    reason: `rag-policy:tally-weight=${bestWeight.toFixed(2)},evidence-count=${evidence.length}`,
    evidence,
  };
}
