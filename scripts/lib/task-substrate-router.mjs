// RGS-PLANNING-LOOP-BRIDGE-MS0/U2 (2026-06-11, slot:tango)
// Per-task substrate-routing matrix: given a task + phase + context, decide the
// PRIMARY executor and emit the 5-substrate plan (Ollama / Obsidian / Hermes /
// Master-graph / PSN) with when/how/max-out for each. The "max out their
// capabilities" answer (U-SPEC-V2 section 4), made deterministic + testable.
//
// DEDUP: imports the single-owner phase->lane taxonomy from forge-route.mjs
// (FORGE_PHASE_CATEGORY via routeForgePhase) instead of re-deriving it, and the
// Hermes gate from hermes-workflow-planner.mjs (shouldUseWorkflow). It NEVER
// re-implements either -- per the dedup law and U-SPEC-V2 fix-P2.
//
// ctx CONTRACT (U-SPEC-V2 fix-P2): the Hermes lane only appears when ctx carries
// the scale hints shouldUseWorkflow needs ({itemCount, openEnded, needsVerification}),
// and the concurrency cap only reports correctly when ctx.cores is passed (else it
// floors to 6 instead of 16 on a 32-thread host). U7 populates ctx from loop-state.

import { routeForgePhase, forgeConcurrencyCap } from "./forge-route.mjs";
import { shouldUseWorkflow } from "./hermes-workflow-planner.mjs";

/**
 * Route a task to its optimal substrates.
 * @param {string} taskType  e.g. "backend-dev" | "design" | "audit" | a unit title
 * @param {string} phase     a forge phase name (scout/summarize/design/verify_gate/...)
 * @param {object} [ctx]
 * @param {string} [ctx.slot]            owning slot (label only)
 * @param {string} [ctx.domain]          galaxy/domain (label only)
 * @param {string[]} [ctx.available]     locally-available executors (ollama/vllm) -- passthrough to routeForgePhase
 * @param {string} [ctx.hardware]        e.g. "home_blackwell" -- passthrough
 * @param {number} [ctx.itemCount]       work-item count (gates Hermes fan-out)
 * @param {boolean} [ctx.openEnded]      open-ended/unbounded scope (gates Hermes)
 * @param {boolean} [ctx.needsVerification] adversarial verification wanted (gates Hermes)
 * @param {number} [ctx.cores]           CPU thread count (sizes the concurrency cap)
 * @param {number} [ctx.budgetTotal]     token budget (sizes the concurrency cap)
 * @returns {{taskType:string, phase:string, primary:object, hermesGated:boolean,
 *            concurrencyCap:number, substrates:Array<{name,when,how,maxOut}>}}
 */
export function routeTask(taskType, phase, ctx = {}) {
  const {
    available, hardware, itemCount, openEnded, needsVerification, cores, budgetTotal,
  } = ctx || {};

  // PRIMARY executor: reuse the single-owner phase->lane decision.
  const route = routeForgePhase(phase, { available, hardware });
  const primary = route.mechanical
    ? { executor: route.lane, model: route.model, why: `mechanical phase '${route.phase}' -> ${route.lane}` }
    : { executor: "claude", model: route.claudeModel, why: `reasoning phase '${route.phase}' -> Claude ${route.claudeModel}` };

  // HERMES gate: build a task shape for shouldUseWorkflow from the ctx scale hints.
  // Without these hints the gate returns false and the Hermes row is omitted (the
  // documented 5->4 degradation), so U7 MUST populate them from loop-state.
  const hermesTask = {
    text: [
      String(taskType || ""),
      openEnded ? "open-ended unbounded scope" : "",
      needsVerification ? "needs adversarial verification and ranking" : "",
    ].filter(Boolean).join(" "),
    ...(Number.isFinite(itemCount) ? { itemCount } : {}),
  };
  const wf = shouldUseWorkflow(hermesTask);
  const cap = forgeConcurrencyCap({
    cores: Number.isFinite(Number(cores)) ? Number(cores) : undefined,
    budgetTotal: Number.isFinite(Number(budgetTotal)) ? Number(budgetTotal) : undefined,
  });

  const substrates = [
    {
      name: "ollama",
      when: "mechanical text/code: explain/summarize/classify/lint/docstring/diff/triage/graph-search (NOT safety-critical G-code)",
      how: `node scripts/ask-ollama.mjs <mode> <input> [--synth --json]; lane via routeForgePhase('${route.phase}') = ${route.lane}. Need a STRONGER managed-OAuth model (xai grok / nous) but still outside Claude ctx? node scripts/ask-hermes.mjs <mode> <input> [--json] (Hermes proxy :8645, auto-falls-back to ollama)`,
      maxOut: "OLLAMA_KEEP_ALIVE=30m, model warm; route ALL mechanical off Claude -> >=30% offload",
    },
    {
      name: "obsidian",
      when: "prior-art recall BEFORE build; persist outcome AFTER (each-pass-feeds-next)",
      how: "READ: prism_memory semantic_search OR `node scripts/system-viz-query.mjs find <q> --brain-only --json` (MCP-down). WRITE: reference_<slug>.md to the memory dir",
      maxOut: "read every task-start; write every outcome at Stop (auto-fed to Obsidian vault)",
    },
    ...(wf.useWorkflow ? [{
      name: "hermes",
      when: `parallel/adversarial/tournament/open-ended work (gate: ${wf.reason})`,
      how: "Agent-tool fan-out; parallel(items.map(agent({model:'haiku',isolation:'worktree'}))) [barrier] -> agent(merge,{model:'opus'}). OR direct managed-provider inference (no fan-out): node scripts/ask-hermes.mjs <ask|summarize|explain|triage|classify> <input> [--json] (proxy :8645, OAuth-managed xai/nous, ollama fallback)",
      maxOut: `forgeConcurrencyCap = ${cap}; never serialize what can fan out; verifier is ALWAYS a separate agent`,
    }] : []),
    {
      name: "master-graph",
      when: "BEFORE every grep/glob/agent: where is X / is it built / wired / blast-radius / how-to-approach (connected neighborhood)",
      how: "MCP UP: prism_session master_index_query. MCP DOWN: `node scripts/system-viz-query.mjs find <q> --json` | `subgraph <q>` (connected neighborhood = how a task's assets relate: engine->dispatcher->wiki->test) | `node-card <id>` | `blast-radius <id>`",
      maxOut: "query-first always; blast-radius before any multi-file change (dedup + impact)",
    },
    {
      name: "psn",
      when: "cross-substrate synthesis; feed-up/feed-down each iteration (11-leg network)",
      how: "feed-down (read before build): master-graph + wiki + tribal (auto-injected). feed-up (write after): reference_*.md at Stop -> Obsidian + master-index",
      maxOut: "every loop iter reads vault+master-graph and writes the outcome back; next iter starts warmer; never leave a leg idle",
    },
  ];

  return {
    taskType: String(taskType ?? ""),
    phase: route.phase,
    primary,
    hermesGated: wf.useWorkflow,
    concurrencyCap: cap,
    substrates,
  };
}
