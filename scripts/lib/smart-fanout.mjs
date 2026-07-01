/**
 * smart-fanout.mjs -- AUTO-route a batch of fan-out tasks: mechanical -> local Ollama ($0, no
 * Anthropic rate limit), judgment/safety -> Claude (U-SMART-FANOUT, slot:india 2026-06-12).
 *
 * WHY (operator 2026-06-12, "find a better way to auto invoke ollama since you didn't use it when
 * you should have"): the `ollamaFanout` primitive (bravo, 2026-06-09) already exists -- but nothing
 * AUTO-invokes it. When I fanned out 34 mechanical coverage agents I used Claude `agent()` and tripped
 * Anthropic's server-side rate limit (5.8M tokens wasted), when those greps/summaries should have run
 * LOCAL. This is the missing AUTO layer: hand it a batch, it CLASSIFIES each task and routes the
 * mechanical ones to Ollama automatically -- the caller never has to remember.
 *
 * THE ROUTING (R5 -- a deterministic decision, code not a model):
 *   - safety-critical (isSafetyCritical)         -> CLAUDE (never local; manufacturing safety)
 *   - judgment classes (reason/synthesize/codegen/audit) -> CLAUDE  (deep judgment)
 *   - mechanical classes (summarize/explain/extract/classify/format/document/git_summary/unknown)
 *                                                -> OLLAMA  (local, $0)  <-- the auto-invocation
 * Per-task `lane` override wins ('ollama' | 'claude') so a caller that KNOWS its batch is mechanical
 * (e.g. a coverage inventory) forces local without relying on the classifier.
 *
 * RETURN: the Ollama lane is EXECUTED here (via ollamaFanout); the Claude lane is RETURNED as
 * `claudeTasks` for the orchestrator to run with `agent()` (a lib cannot spawn harness agents). So a
 * workflow does: `const {ollamaResults, claudeTasks} = await smartFanout(tasks); ...agent the rest`.
 * Pure routing + the local execution; Ollama caller injectable for hermetic tests.
 */

import { classifyTaskClass, isSafetyCritical } from "./local-llm-task-router.mjs";
import { ollamaFanout as defaultOllamaFanout, ollamaFanoutWithFallback } from "./ollama-fanout.mjs";

// Mechanical task-classes that are safe + cost-effective to run on a local model. Everything NOT in
// this set (reason/synthesize/codegen/audit) is judgment -> stays on Claude. Mirrors the model-
// routing policy's mechanical lane.
export const MECHANICAL_CLASSES = Object.freeze(new Set([
  "summarize", "explain", "extract", "classify", "format", "document", "git_summary", "unknown",
]));

/**
 * Decide the lane for one task. Pure. Returns "ollama" | "claude".
 * @param {{ prompt?: string, lane?: string }} task
 */
export function laneFor(task) {
  const text = task && typeof task.prompt === "string" ? task.prompt : "";
  // SAFETY-NEVER-LOCAL (load-bearing invariant): safety-critical work goes to Claude even if a caller
  // force-set lane:"ollama" on the batch. An explicit "claude" override is honored below -- escalating
  // to Claude is never unsafe; the only thing the safety gate forbids is silently sending machine-
  // motion / S(x) work to a local model. (reviewer-C N1, 2026-06-12.)
  if (isSafetyCritical(text)) return "claude";
  const lane = task && typeof task.lane === "string" ? task.lane.toLowerCase() : "";
  if (lane === "ollama" || lane === "claude") return lane; // explicit override wins (non-safety only)
  const { taskClass } = classifyTaskClass(text);
  return MECHANICAL_CLASSES.has(taskClass) ? "ollama" : "claude";
}

/**
 * Partition a task list into {ollamaTasks, claudeTasks} by lane. Pure. Each task keeps its id.
 */
export function partitionTasks(tasks) {
  const list = Array.isArray(tasks) ? tasks : [];
  const ollamaTasks = [], claudeTasks = [];
  for (let i = 0; i < list.length; i++) {
    const raw = list[i];
    const t = raw && typeof raw === "object" ? { id: raw.id ?? i, prompt: String(raw.prompt ?? ""), lane: raw.lane } : { id: i, prompt: String(raw ?? "") };
    (laneFor(t) === "ollama" ? ollamaTasks : claudeTasks).push(t);
  }
  return { ollamaTasks, claudeTasks };
}

/**
 * AUTO-route + execute the mechanical lane on local Ollama; return the Claude lane for the caller.
 * @param {Array} tasks  - [{id, prompt, lane?}] or bare strings
 * @param {object} [opts]
 *   opts.ollamaModel        - model for the local lane (default ollama-fanout's gpt-oss:120b)
 *   opts.concurrency        - local fan-out concurrency (default 3)
 *   opts.withFallback       - true => use ollamaFanoutWithFallback (Sonnet-fallback signal if down)
 *   opts.fanoutImpl         - injected ollamaFanout (tests)
 * @returns {Promise<{ ollamaResults, claudeTasks, routing, fallback }>}
 *   routing = { total, ollama, claude } ; ollamaResults = ollamaFanout result ; claudeTasks = [{id,prompt}]
 */
export async function smartFanout(tasks, opts = {}) {
  const { ollamaTasks, claudeTasks } = partitionTasks(tasks);
  const fanout = typeof opts.fanoutImpl === "function"
    ? opts.fanoutImpl
    : (opts.withFallback ? ollamaFanoutWithFallback : defaultOllamaFanout);
  let ollamaResults = { results: [], peakConcurrency: 0, total: 0, okCount: 0 };
  let fallback = { needed: false, lane: null, tasks: [] };
  if (ollamaTasks.length > 0) {
    const r = await fanout(ollamaTasks, {
      model: opts.ollamaModel,
      concurrency: opts.concurrency,
      timeoutMs: opts.timeoutMs,
    });
    ollamaResults = r;
    if (r && r.fallback) fallback = r.fallback;
  }
  return {
    ollamaResults,
    claudeTasks,
    routing: { total: ollamaTasks.length + claudeTasks.length, ollama: ollamaTasks.length, claude: claudeTasks.length },
    fallback,
  };
}
