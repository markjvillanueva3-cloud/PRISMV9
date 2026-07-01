// FORGE-PIPELINE-ROUTING-MS0/U-FORGE-ROUTE (2026-06-11, slot:tango)
// Makes the whole forge slash-command family token-optimal BY CONSTRUCTION.
//
// Every forge pipeline is a sequence of PHASES. Most phases are MECHANICAL
// (scout / enumerate / dedup / docstring / summarize / lint / html-emit) and
// must NOT run on the session's Opus/Fable model -- they route to the local
// Ollama lane (free) or, on an Ollama miss, the cheap-Claude tier (sonnet/
// haiku). Only the genuinely-reasoning phases (design / plan-review / the
// verification GATE decision / cross-file refactor / physics+safety judgment)
// stay on Opus. This wires the forge family to the canonical claudeModel
// fallback ladder shipped in U-FLOR-CLAUDE-TIER (resolveExecutor) -- the same
// single source of truth the offload hooks + /smart already consume (R15:
// wire to every natural consumer).
//
// PURE -- no IO. The forge skill injects `available` (Ollama /api/tags) +
// `hardware` (host-class) the same way the offload hooks do.

import {
  resolveExecutor,
  claudeFallbackModel,
} from "../../.claude/hooks/lib/ollama-cost-router.mjs";

// Forge pipeline PHASE -> task CATEGORY (the key resolveExecutor routes on).
// MECHANICAL phases map to offloadable categories (ollama -> sonnet/haiku).
// REASONING/JUDGMENT phases map to CLAUDE_LANE categories (opus, reserved).
// A phase absent here defaults to "summary" (balanced mechanical) -- the
// conservative token-saving default, never Opus-by-accident.
export const FORGE_PHASE_CATEGORY = Object.freeze({
  // ---- mechanical / offloadable (ollama-first, cheap-Claude fallback) ----
  scout:          "search_synthesis", // file/graph discovery -> ask-ollama viz ($0)
  enumerate:      "prism_inventory",  // list engines/hooks/skills/actions
  introspect:     "prism_introspect", // what-actions-does-X-have
  dedup_check:    "classification",   // is-this-a-duplicate (cheap)
  classify:       "classification",
  docstring:      "documentation",    // JSDoc / header generation
  summarize:      "summary",          // phase recaps, digests
  explain:        "explanation",
  test_scaffold:  "documentation",    // boilerplate test structure
  lint:           "classification",
  diff_summary:   "git_summary",
  triage:         "classification",   // error/finding triage
  html_emit:      "format_convert",   // md -> html (deterministic, $0)
  audit_scan:     "prism_audit",      // inventory/orphan/wiring scans
  // ---- reasoning / judgment / safety (Opus reserved) ----
  design:         "architecture",     // the actual asset design
  plan_review:    "deep_reasoning",   // Boris peer-review of the plan
  verify_gate:    "deep_reasoning",   // the HARD verification-gate decision
  refactor:       "multi_file_refactor",
  novel_codegen:  "novel_codegen",
  physics_check:  "physics_judgment",
  safety_gate:    "safety",
  orchestrate:    "orchestration",
});

// Deterministic, non-mechanical lanes that resolveExecutor itself answers
// without a model (prism_calc) -- listed for completeness/telemetry.
export const FORGE_DETERMINISTIC_PHASES = Object.freeze(new Set([
  "physics_calc", "sx_gate", "unit_convert",
]));

/**
 * Route one forge phase to its cheapest-correct executor.
 * @param {string} phase  a FORGE_PHASE_CATEGORY key (or any string).
 * @param {object} [opts] passthrough to resolveExecutor:
 *   { available?: string[], hardware?: string, vllmEnabled?, vllmAvailable?,
 *     ollamaAvailable? }
 * @returns {{ phase, category, lane, model, claudeModel, tier, reason,
 *             mechanical: boolean }}
 */
export function routeForgePhase(phase, opts = {}) {
  const category = (typeof phase === "string" && FORGE_PHASE_CATEGORY[phase]) || "summary";
  const r = resolveExecutor({ category, ...opts });
  // A phase is "mechanical" iff it did NOT route to the Opus reasoning tier.
  const mechanical = r.claudeModel !== "opus";
  return { phase: String(phase), category, mechanical, ...r };
}

/**
 * Budget-aware concurrency cap for a forge fan-out (kills the fork-storm class).
 * concurrency = min(16, cores-2, floor(budget/100k)). Conservative defaults
 * when inputs are unknown (cores -> 6, budget -> unbounded).
 * @param {{ cores?: number, budgetTotal?: number, hardCap?: number }} [args]
 * @returns {number} a concurrency >= 1
 */
export function forgeConcurrencyCap({ cores, budgetTotal, hardCap = 16 } = {}) {
  const byCores = Number.isFinite(cores) && cores > 0 ? Math.max(1, Math.floor(cores) - 2) : 6;
  const byBudget = Number.isFinite(budgetTotal) && budgetTotal > 0
    ? Math.max(1, Math.floor(budgetTotal / 100000))
    : Infinity;
  return Math.max(1, Math.min(hardCap, byCores, byBudget));
}

/**
 * Render a human-readable routing plan for a whole forge run -- the table the
 * forge skill prints so the operator can see every phase's lane at a glance.
 * @param {string[]} phases  ordered forge phases.
 * @param {object} [opts]    passthrough to routeForgePhase.
 * @returns {{ rows: object[], opusPhases: string[], localPhases: string[],
 *             summary: string }}
 */
export function planForgeRouting(phases, opts = {}) {
  const rows = (Array.isArray(phases) ? phases : []).map((p) => routeForgePhase(p, opts));
  const opusPhases = rows.filter((r) => r.claudeModel === "opus").map((r) => r.phase);
  const localPhases = rows.filter((r) => r.lane === "ollama" || r.lane === "vllm").map((r) => r.phase);
  const cheapClaude = rows.filter((r) => r.claudeModel === "sonnet" || r.claudeModel === "haiku").map((r) => r.phase);
  const summary =
    `${rows.length} phases: ${localPhases.length} local(ollama/vllm), ` +
    `${cheapClaude.length} cheap-Claude(sonnet/haiku), ${opusPhases.length} Opus(reserved)`;
  return { rows, opusPhases, localPhases, cheapClaude, summary };
}

// Re-export the fallback helper so forge consumers have a single import surface.
export { claudeFallbackModel };
