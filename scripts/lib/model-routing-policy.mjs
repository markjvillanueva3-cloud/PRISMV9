/**
 * model-routing-policy.mjs -- pure: the SINGLE per-prompt model-routing verdict that fuses the
 * Claude-tier decision with the MEASURED Ollama capability matrix (U-MODEL-ROUTE-POLICY, slot:india
 * 2026-06-11). This is the brain the advisor hook calls.
 *
 * OPERATOR POLICY (2026-06-11, "fable demolished session limits") -> one verdict per prompt:
 *   - ollama  : mechanical task whose CLASS the capability matrix PROVES ~100% (free, $0)
 *   - fable   : heavy planning / brainstorming / gap-filling / deep reasoning / deep logic (THINK)
 *   - opus    : lighter reasoning + heavy building/coding (BUILD)
 *   - sonnet  : capable mid-tier (explain/summarize/document)
 *   - haiku   : trivial mechanical kept on Claude (when Ollama is not matrix-proven for it)
 *
 * Composes (does NOT duplicate): classifyTaskClass (local-llm-task-router) + routeClaudeTier
 * (claude-tier-router) + the matrix produced by ollama-capability-probe.mjs. Pure -> the matrix +
 * classifier are injected; hermetically testable.
 */

import { classifyTaskClass, isSafetyCritical } from "./local-llm-task-router.mjs";
import { routeClaudeTier } from "./claude-tier-router.mjs";

// Map a capability-battery task-id -> the classifyTaskClass class it represents. The matrix scores
// battery tasks; the prompt classifier emits classes -- this bridges the two so a class is "proven"
// only when its representative battery task hit 100% on some model.
export const BATTERY_TO_CLASS = Object.freeze({
  "classify-enum": "classify",
  "boolean-judgment": "classify",
  "extract-number": "extract",
  "json-extract": "extract",
  "unit-convert": "format",     // a deterministic value transform
  // NOTE: keyword-extract is DELIBERATELY unmapped. It is a fuzzy "list 3 keywords" diagnostic, NOT
  // the deterministic "extract the values/dims/fields" class the prompt classifier emits. It scores
  // ~0% (correctly -- fuzzy listing has no single right answer), so mapping it to "extract" would
  // poison the class and block offloading proven numeric/JSON extraction. It stays probe-only.
});

/**
 * From a capability matrix, derive { class -> bestModel } for every class whose representative
 * battery task reached `threshold` (default 1.0 = 100%) on at least one model. Returns a Map.
 * A class proven by MULTIPLE battery tasks requires ALL of them to clear the bar (conservative:
 * a class is "ollama-safe" only if every facet we measured is safe).
 */
export function ollamaSafeClassModels(matrix, threshold = 1.0) {
  const out = new Map();
  if (!matrix || typeof matrix !== "object" || !matrix.matrix) return out;
  // group battery tasks by the class they map to
  const classToTasks = new Map();
  for (const [taskId, cls] of Object.entries(BATTERY_TO_CLASS)) {
    if (!matrix.matrix[taskId]) continue;
    (classToTasks.get(cls) || classToTasks.set(cls, []).get(cls)).push(taskId);
  }
  for (const [cls, taskIds] of classToTasks.entries()) {
    // a model qualifies for the class iff it clears the bar on EVERY measured task of that class
    let best = null;
    const models = new Set();
    for (const tid of taskIds) for (const m of Object.keys(matrix.matrix[tid].models || {})) models.add(m);
    for (const model of models) {
      const clearsAll = taskIds.every((tid) => {
        const s = matrix.matrix[tid].models[model];
        return s && s.total > 0 && s.rate >= threshold;
      });
      if (clearsAll) { best = best || model; } // first-qualifying (matrix order); prefer smaller if sorted upstream
    }
    if (best) out.set(cls, best);
  }
  return out;
}

/**
 * The per-prompt routing verdict.
 * @param {{ prompt: string, matrix?: object|null, threshold?: number }} a
 * @returns {{ engine: "ollama"|"claude", model: string, tier: string, taskClass: string, reason: string }}
 */
export function routePrompt({ prompt, matrix = null, threshold = 1.0 }) {
  const text = typeof prompt === "string" ? prompt : "";
  // Safety NEVER goes local + always frontier.
  if (isSafetyCritical(text)) {
    const ct = routeClaudeTier({ task: text });
    return { engine: "claude", model: ct.tier, tier: ct.tier, taskClass: "safety_critical", reason: "safety-critical -> frontier Claude" };
  }
  const { taskClass } = classifyTaskClass(text);
  const safeClasses = ollamaSafeClassModels(matrix, threshold);
  if (safeClasses.has(taskClass)) {
    const model = safeClasses.get(taskClass);
    return { engine: "ollama", model, tier: "local", taskClass, reason: `class "${taskClass}" matrix-proven ${threshold * 100}% on ${model} -> offload ($0)` };
  }
  // Claude branch: tier per the THINK-vs-BUILD policy.
  const ct = routeClaudeTier({ task: text });
  return { engine: "claude", model: ct.tier, tier: ct.tier, taskClass: ct.taskClass, reason: ct.reason };
}
