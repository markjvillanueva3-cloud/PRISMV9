/**
 * subagent-model-enforce.mjs -- pure: decide whether a subagent dispatch's MODEL is policy-correct
 * (U-SUBAGENT-MODEL-ENFORCE, slot:india 2026-06-11). The TRUE-enforcement core (operator: "if we
 * need hooks for true enforcement, build them").
 *
 * WHY THIS IS REAL ENFORCEMENT (vs the advisory main-loop nudge): the main-loop model is NOT
 * hook-forceable, but a PreToolUse hook on the Agent/Task tool CAN deny a dispatch -- and subagent
 * fan-out (workflows spawn many agents) is a major token sink. The anti-leak doctrine
 * ([[feedback_ollama_fallback_sonnet_agents]]: "mine/read/summarize agents = model:'sonnet', NEVER
 * silently promote mechanical work to Opus") becomes ENFORCEABLE here: a MECHANICAL task explicitly
 * dispatched to opus/fable is the unambiguous leak -> deny with the exact cheaper model to use.
 *
 * NARROW BY DESIGN (R12, avoid false-blocks): only the clear leak is denied --
 *   dispatched model is opus/fable  AND  routeClaudeTier says the task is mechanical (sonnet/haiku).
 * Everything else allows: no model (inherits), a cheap model (never over-spend), or a genuine
 * think/build/safety task where opus/fable is justified. Pure -> hermetically testable.
 */

import { routeClaudeTier } from "./claude-tier-router.mjs";

/** True if a model string names an expensive top tier (opus or fable). */
export function isExpensiveModel(model) {
  const m = String(model == null ? "" : model).toLowerCase();
  return m.includes("opus") || m.includes("fable");
}

/**
 * Decide on a subagent dispatch.
 * @param {{ prompt: string, model?: string }} a  - the agent's task text + its `model` param
 * @returns {{ action: "allow"|"deny", recommend?: string, taskClass?: string, reason: string }}
 */
export function decideSubagentModel({ prompt, model }) {
  if (!model) return { action: "allow", reason: "no model specified -> inherits parent (not our concern)" };
  if (!isExpensiveModel(model)) return { action: "allow", reason: `model "${model}" is cheap-ward -> never over-spend` };
  // model IS opus/fable -> justified ONLY for a genuine think/build/safety task.
  const rec = routeClaudeTier({ task: typeof prompt === "string" ? prompt : "" });
  if (isExpensiveModel(rec.tier)) {
    return { action: "allow", taskClass: rec.taskClass, reason: `task warrants the top tier (recommended ${rec.tier}) -> ${model} OK` };
  }
  // LEAK: an expensive model on a mechanical task.
  return {
    action: "deny",
    recommend: rec.tier,
    taskClass: rec.taskClass,
    reason: `mechanical task (class "${rec.taskClass}") dispatched to "${model}" -- the anti-leak policy routes this to "${rec.tier}". Re-dispatch with model: "${rec.tier}" (or offload to Ollama if matrix-proven). Bypass: PRISM_SUBAGENT_MODEL_ENFORCE=off.`,
  };
}
