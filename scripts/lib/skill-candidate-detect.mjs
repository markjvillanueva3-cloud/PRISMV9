// HERMES-MS0 / U-HERMES03 — pure observation lib for the closed learning loop.
//
// Hermes pattern (per Shann³ 2026-05-12 article, on-disk hermes-shann-article.md):
//   "do not try to write your own skills on day one. run real work, let the agent
//    watch, and let the harness write the skills. you build a custom skill library
//    faster by working than by writing prompts."
//
// This lib is the FIRST stage of the closed loop — observation only. It does NOT
// emit skill stubs and does NOT mutate the skill library. It tags whether a
// session window represents a "successful workflow" suitable for later clustering.
//
// Pure functions; injected I/O via opts. Designed to be called from the Stop hook
// .claude/hooks/skill-candidate-observe.mjs with the session's recent tool-call
// envelope as input.
//
// Subsequent units in the loop:
//   U-HERMES04 — pattern clusterer (cosine sim over tool-call sequences, N=5)
//   U-HERMES05 — skill stub emitter (auto-create SKILL-CANDIDATE-<id>.md)
//   U-HERMES06 — reviewer-agent gate (PASS/FAIL via subagent reviewer)
//   U-HERMES07 — ship layer (PASS → .claude/commands/<id>.md draft)

export const MIN_TOOL_CALLS = 3;        // floor — single Edit isn't a workflow
export const MAX_TOOL_CALLS = 50;       // ceiling — runaway loop isn't a learnable skill either
export const SUCCESSFUL_OUTCOMES = Object.freeze(["committed", "tests-pass", "build-pass"]);
export const SCHEMA_VERSION = "1.0.0";

// Pure: classify a session window. Returns { eligible, reason, signature?, kind? }.
// Inputs:
//   window = { toolCalls: Array<{tool, ms, ok?}>, outcome?: string, regressionAlert?: boolean }
//   opts   = { now? (epoch ms, for stamping) }
export function classifyWindow(window, opts = {}) {
  if (!window || typeof window !== "object") {
    return { eligible: false, reason: "no-window" };
  }
  const calls = Array.isArray(window.toolCalls) ? window.toolCalls : [];
  if (calls.length < MIN_TOOL_CALLS) {
    return { eligible: false, reason: `too-few-calls:${calls.length}<${MIN_TOOL_CALLS}` };
  }
  if (calls.length > MAX_TOOL_CALLS) {
    return { eligible: false, reason: `too-many-calls:${calls.length}>${MAX_TOOL_CALLS}` };
  }
  if (window.regressionAlert === true) {
    return { eligible: false, reason: "regression-alert-set" };
  }
  const outcome = typeof window.outcome === "string" ? window.outcome : "";
  if (!SUCCESSFUL_OUTCOMES.includes(outcome)) {
    return { eligible: false, reason: `outcome-not-success:${outcome || "missing"}` };
  }
  // Eligible — synthesize a deterministic signature so clustering can deduplicate.
  const signature = buildSignature(calls);
  return {
    eligible: true,
    reason: "successful-workflow",
    kind: classifyKind(calls),
    signature,
    callCount: calls.length,
    outcome,
  };
}

// Pure: compact a tool-call sequence into a hashable signature.
// Format: "<tool1>|<tool2>|...|<toolN>" — preserves order, drops args (clustering
// happens at the shape level; argument similarity is a later refinement).
export function buildSignature(calls) {
  if (!Array.isArray(calls)) return "";
  return calls
    .map(c => (c && typeof c.tool === "string" ? c.tool : "?"))
    .join("|");
}

// Pure: classify the workflow shape (kind) for filtering at cluster time.
// Returns one of: "edit-heavy" | "search-heavy" | "build-heavy" | "mixed".
export function classifyKind(calls) {
  if (!Array.isArray(calls) || calls.length === 0) return "mixed";
  let edits = 0, searches = 0, builds = 0;
  for (const c of calls) {
    const t = c?.tool || "";
    if (t === "Edit" || t === "Write" || t === "MultiEdit") edits++;
    else if (t === "Grep" || t === "Glob" || t === "Read") searches++;
    else if (t === "Bash") builds++;
  }
  const total = edits + searches + builds;
  if (total === 0) return "mixed";
  const editRatio = edits / total;
  const searchRatio = searches / total;
  const buildRatio = builds / total;
  if (editRatio >= 0.5) return "edit-heavy";
  if (searchRatio >= 0.5) return "search-heavy";
  if (buildRatio >= 0.5) return "build-heavy";
  return "mixed";
}

// Pure: format a candidate ledger entry (one JSONL line). Caller appends.
export function formatCandidateEntry(classification, ctx = {}, now = Date.now()) {
  return {
    schemaVersion: SCHEMA_VERSION,
    at: new Date(now).toISOString(),
    slot: typeof ctx.slot === "string" ? ctx.slot : null,
    chatId: typeof ctx.chatId === "string" ? ctx.chatId : null,
    eligible: classification.eligible === true,
    reason: classification.reason || "unknown",
    kind: classification.kind || null,
    signature: classification.signature || null,
    callCount: classification.callCount || 0,
    outcome: classification.outcome || null,
  };
}
