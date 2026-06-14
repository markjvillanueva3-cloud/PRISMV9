// scripts/lib/octopus-route-policy.mjs
//
// U-HOC03 — invocation policy: decides whether to fire octopus vs single-claude
// vs ollama-only vs skip-ai for a given prompt. Pure-core; opts.rerank +
// opts.historicalRuns injected (the latter from U-HOC02 ledger).
//
// The policy is a learned classifier: given a prompt's similarity to past
// octopus-success / octopus-overkill cases, pick a route. Falls back to a
// keyword-heuristic when historical data thin.

export const ROUTES = Object.freeze(["route:octopus", "route:single-claude", "route:ollama-only", "route:skip-ai"]);
export const DEFAULT_MIN_INVOKE_RATE = 0.1;  // keep ≥10% of eligible prompts hitting octopus to prevent atrophy
export const KEYWORD_OCTOPUS_TRIGGERS = ["consensus", "dissent", "contested", "high-stakes", "5-voice", "octopus"];
export const KEYWORD_OLLAMA_TRIGGERS = ["summarize", "explain", "docstring", "lint", "classify"];

// Inputs:
//   prompt: string
//   historicalRuns: array of octopus-record entries (from readOctopusLedger)
//     — each carries .prompt, .consensus, .outcome (operator feedback if available)
//   rerank: (query, candidates[], topK) → [{candidate, score}]
//   opts.minInvokeRate: float — guaranteed minimum octopus invocation rate
//   opts.coinFlip: () => float — injectable random for deterministic tests
//
// Returns: { route, reason, similarityScore? }
export function octopusRouteDecision({ prompt, historicalRuns, rerank, minInvokeRate = DEFAULT_MIN_INVOKE_RATE, coinFlip = Math.random }) {
  if (typeof prompt !== "string" || prompt.length === 0) {
    return { route: "route:skip-ai", reason: "empty-prompt" };
  }
  const lower = prompt.toLowerCase();
  // Keyword fast-path for explicitly-octopus-shaped prompts.
  for (const kw of KEYWORD_OCTOPUS_TRIGGERS) {
    if (lower.includes(kw)) {
      return { route: "route:octopus", reason: `keyword-trigger:${kw}` };
    }
  }
  // Keyword fast-path for ollama-eligible prompts.
  for (const kw of KEYWORD_OLLAMA_TRIGGERS) {
    if (lower.includes(kw)) {
      return { route: "route:ollama-only", reason: `keyword-trigger:${kw}` };
    }
  }
  // Historical-similarity path — only if we have a learning signal.
  if (Array.isArray(historicalRuns) && historicalRuns.length > 0 && typeof rerank === "function") {
    const candidates = historicalRuns.map((r) => r.prompt || r.semanticSummary || "").filter(Boolean);
    if (candidates.length > 0) {
      let results;
      try { results = rerank(prompt, candidates, 5); } catch { results = null; }
      if (Array.isArray(results) && results.length > 0) {
        // Of the top-5 similar runs, count octopus-success vs octopus-overkill outcomes.
        let octopusSuccess = 0;
        let octopusOverkill = 0;
        let topScore = 0;
        for (const r of results) {
          const score = Number(r?.score);
          if (!Number.isFinite(score) || score < 0.3) continue;
          if (score > topScore) topScore = score;
          const text = typeof r?.candidate === "string" ? r.candidate : "";
          const idx = candidates.indexOf(text);
          if (idx < 0) continue;
          const run = historicalRuns[idx];
          // Heuristic: outcome=correct AND consensus had dissent → octopus was right call
          if (run?.outcome === "correct" && Array.isArray(run?.consensus?.dissent_items) && run.consensus.dissent_items.length > 0) {
            octopusSuccess++;
          }
          // Heuristic: outcome=correct AND consensus was unanimous (no dissent) → could have been single-claude
          if (run?.outcome === "correct" && (!run?.consensus?.dissent_items || run.consensus.dissent_items.length === 0)) {
            octopusOverkill++;
          }
        }
        if (octopusSuccess > octopusOverkill && topScore >= 0.5) {
          return { route: "route:octopus", reason: `similar-prior-success:${octopusSuccess}vs${octopusOverkill}`, similarityScore: topScore };
        }
        if (octopusOverkill > octopusSuccess && topScore >= 0.5) {
          // BUT: enforce minInvokeRate — randomly send N% to octopus anyway to keep training signal alive.
          const r = coinFlip();
          if (r < minInvokeRate) {
            return { route: "route:octopus", reason: `min-invoke-rate-boost:${r.toFixed(2)}<${minInvokeRate}`, similarityScore: topScore };
          }
          return { route: "route:single-claude", reason: `similar-prior-overkill:${octopusOverkill}vs${octopusSuccess}`, similarityScore: topScore };
        }
      }
    }
  }
  // Default: send to single-claude. Conservative — octopus is the expensive route.
  return { route: "route:single-claude", reason: "default-no-learning-signal" };
}
