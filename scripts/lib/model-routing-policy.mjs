/**
 * model-routing-policy.mjs -- pure: the SINGLE per-prompt model-routing verdict that fuses the
 * Claude-tier decision with the MEASURED Ollama capability matrix (U-MODEL-ROUTE-POLICY, slot:india
 * 2026-06-11). This is the brain the advisor hook calls.
 *
 * OPERATOR POLICY (2026-06-11, "fable demolished session limits") -> one verdict per prompt:
 *   - ollama  : mechanical task whose CLASS the capability matrix PROVES ~100% (free, $0)
 *   - fable   : heavy planning / brainstorming / gap-filling / deep reasoning / deep logic (THINK)
 *   - opus    : lighter reasoning; ESCALATION-only for deep/novel/architecture coding (via cost-router)
 *   - sonnet  : coding/build DEFAULT @ max (operator 2026-06-18) + capable mid-tier (explain/summarize/document)
 *   - haiku   : trivial mechanical kept on Claude (when Ollama is not matrix-proven for it)
 *
 * Composes (does NOT duplicate): classifyTaskClass (local-llm-task-router) + routeClaudeTier
 * (claude-tier-router) + the matrix produced by ollama-capability-probe.mjs. Pure -> the matrix +
 * classifier are injected; hermetically testable.
 */

import { classifyTaskClass, isSafetyCritical } from "./local-llm-task-router.mjs";
import { routeClaudeTier } from "./claude-tier-router.mjs";
import { DEFAULT_MODEL_SLUG } from "./openrouter-client.mjs";

// ---------------------------------------------------------------------------
// CLOUD-OVERFLOW-MS0 (slot:alpha 2026-06-15, operator "wire cloud version"):
// the cloud long-context tier. OpenRouter Nemotron-3 (1M ctx, $0 free tier) for
// deep-research / huge-document / explicit-cloud work. It fires CONSERVATIVELY so it
// never steals quality work: building/codegen stays on Opus; safety stays frontier
// Claude; proven-mechanical stays free-LOCAL Ollama. See routePrompt for the order.
// ---------------------------------------------------------------------------

/** Operator explicitly asked for the cloud tier -- honored for any non-safety task. */
// A DIRECTIVE verb is required (use/via/route to/run on/ask/switch to) so an incidental TOPIC
// mention ("fix the bug in the cloud tier handler", "the openrouter model pricing", "deploy to
// the cloud tier") does NOT route to the cloud (3-of-3 arm-A P1 fix 2026-06-15 -- the bare
// "cloud (model|llm|tier)" + "<name> ... model" mention rules were over-broad).
const CLOUD_EXPLICIT = [
  /\b(use|via|route\s+to|run\s+(on|via)|ask)\s+(the\s+)?(nemotron|openrouter)\b/i,
  /\b(use|via|route\s+to|run\s+(on|via)|switch\s+to)\s+(the\s+)?cloud\s+(model|llm|tier)\b/i,
];
// Implicit long-context signal -- deliberately NARROW (arm-C FAIL fix 2026-06-15): only
// UNAMBIGUOUS deep-research / huge-scope / explicit-context-size phrases trigger the cloud.
// The earlier generic "(analyze|read|review|summarize) ... (entire|whole|all) <noun>" pattern
// was a fleet-wide quality regression -- it stole routine "review the whole module" /
// "summarize the whole document" work from sonnet/fable. The bare "research all" was also
// dropped (3-of-3 P2 -- caught shallow "research all the records"); "research across/the
// entire/the whole" stays. When in doubt, Claude quality wins; the operator names it explicitly.
const CLOUD_LONGCTX = [
  /\bdeep\s+research\b/i,
  /\bresearch\s+(across|the\s+entire|the\s+whole)\b/i,
  /\b(1\s?m\s+(context|token)|one\s+million|million[\s-]token|long[\s-]context)\b/i,
];
// Veto -- when the task is BUILD or DEEP-THINK, a Claude tier owns it (quality), never the
// implicit cloud route. Build verbs mirror local-llm-task-router's codegen surface
// (create|rewrite|generate|add included); think verbs (design/architect/plan/brainstorm)
// keep deep-reasoning on fable. The EXPLICIT "use nemotron" path is checked BEFORE this veto,
// so an operator can still force the cloud for a build/design if they name it.
const CLOUD_VETO = [
  /\b(build|implement|create|rewrite|wire\s+(up|the|in)|scaffold|refactor|generate|write\s+the\s+(code|engine|test|hook|dispatcher)|add\s+(the|a)\s+(engine|test|hook|dispatcher|action))\b/i,
  /\b(design|architect|brainstorm|plan\s+(the|a|out)\b|strateg(y|ize))\b/i,
];

/**
 * Decide whether a (non-safety) prompt should route to the cloud long-context tier.
 * Returns the verdict { engine, model, tier, taskClass, reason, explicit } or null.
 * `explicit` is true when the operator NAMED the cloud/nemotron -- routePrompt honors
 * that ABOVE the Ollama offload; an implicit long-context signal is honored only AFTER
 * Ollama (free-local beats free-cloud for proven-mechanical work). Pure.
 */
export function routeCloudLongContext(text) {
  const s = typeof text === "string" ? text : "";
  if (!s.trim()) return null;
  const mk = (reason, explicit) => ({
    engine: "openrouter", model: DEFAULT_MODEL_SLUG, tier: "cloud-long-context",
    taskClass: "deep_research", reason, explicit,
  });
  if (CLOUD_EXPLICIT.some((re) => re.test(s))) {
    return mk("explicit cloud/nemotron request -> OpenRouter (1M ctx, $0 free tier)", true);
  }
  if (CLOUD_VETO.some((re) => re.test(s))) return null;   // building -> Opus owns it
  if (CLOUD_LONGCTX.some((re) => re.test(s))) {
    return mk("long-context deep-research -> OpenRouter nemotron (1M ctx, $0)", false);
  }
  return null;
}

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
 * Cost rank of an Ollama model tag = its parameter count in billions, parsed from the tag's
 * size suffix (`qwen2.5-coder:1.5b` -> 1.5, `gpt-oss:120b` -> 120, `deepseek-r1:32b` -> 32).
 * Parameter count is the canonical $0-local cost proxy: fewer params -> less VRAM -> more models
 * co-resident -> higher offload concurrency (exactly the "max potential" the roster-sync exists to
 * unlock; the 96GB box's binding constraint is the resident 32b's ~55GB KV+weights footprint).
 *
 * Parses the segment AFTER the last colon so a decimal in the MODEL NAME (`qwen2.5-coder`) is never
 * mistaken for a size. An `NxMb` MoE multiplier is honored (`mixtral:8x7b` -> 8*7 = 56, never 7) so a
 * large mixture model is not mis-ranked "cheapest" by its per-expert size. Unparseable (no `<num>b`
 * suffix, e.g. `:latest`) -> Infinity, so a model with a known small size always beats an unknown one,
 * and an all-unknown set falls back to first-seen order (the prior behavior -- never a regression).
 * CAVEAT (R12): for a FLAT MoE tag (gpt-oss:20b, no `Nx`) the param count over-states active VRAM, so
 * the rank stays a ROUGH cross-architecture proxy; it is exact within the dense coder ladder
 * (1.5b<7b<14b<32b) -- the classes that dominate mechanical offload.
 */
export function modelCostRank(modelTag) {
  if (typeof modelTag !== "string" || !modelTag) return Infinity;
  const tagPart = modelTag.includes(":") ? modelTag.slice(modelTag.lastIndexOf(":") + 1) : modelTag;
  const m = tagPart.match(/(?:(\d+)x)?(\d+(?:\.\d+)?)\s*b/i);
  if (!m) return Infinity;
  const mult = m[1] ? parseInt(m[1], 10) : 1; // NxMb MoE multiplier (8x7b -> 56)
  return mult * parseFloat(m[2]);
}

/**
 * From a capability matrix, derive { class -> bestModel } for every class whose representative
 * battery task reached `threshold` (default 1.0 = 100%) on at least one model. Returns a Map.
 * A class proven by MULTIPLE battery tasks requires ALL of them to clear the bar (conservative:
 * a class is "ollama-safe" only if every facet we measured is safe).
 *
 * Among the qualifying (all-tasks-proven) models the CHEAPEST is chosen by modelCostRank -- NOT the
 * first in roster/matrix order (the prior `best = best || model` silently routed mechanical work to
 * a needlessly-large model whenever the roster was not pre-sorted smallest-first; U-ALPHA-OLLAMA-
 * CHEAPEST-MODEL-SELECT 2026-06-25). A cheaper proven model is strictly better: same matrix-verified
 * 100% quality, less VRAM, more concurrency. Stable tie-break: the first-seen model wins among equal
 * ranks, so the prior first-in-order behavior is preserved exactly when ALL candidate ranks are equal
 * or unparseable (a mixed parseable/unparseable set now correctly prefers the known-size model).
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
    // de-duped model list in first-seen order (stable tie-break for equal/unknown cost ranks)
    const models = [];
    const seen = new Set();
    for (const tid of taskIds) for (const m of Object.keys(matrix.matrix[tid].models || {})) {
      if (!seen.has(m)) { seen.add(m); models.push(m); }
    }
    // a model qualifies iff it clears the bar on EVERY measured task of the class; pick the CHEAPEST.
    let best = null;
    let bestRank = Infinity;
    for (const model of models) {
      const clearsAll = taskIds.every((tid) => {
        const s = matrix.matrix[tid].models[model];
        return s && s.total > 0 && s.rate >= threshold;
      });
      if (!clearsAll) continue;
      const rank = modelCostRank(model);
      if (best === null || rank < bestRank) { best = model; bestRank = rank; } // strict < => stable first-seen tie-break
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
  // Cloud long-context tier (computed once). An EXPLICIT "use nemotron/openrouter"
  // request beats the Ollama offload (the operator named it) -- but never safety, which
  // already returned above. An IMPLICIT long-context signal is honored only AFTER the
  // Ollama check (free-LOCAL beats free-CLOUD for proven-mechanical work).
  const cloud = routeCloudLongContext(text);
  if (cloud && cloud.explicit) {
    return { engine: cloud.engine, model: cloud.model, tier: cloud.tier, taskClass: cloud.taskClass, reason: cloud.reason };
  }
  const { taskClass } = classifyTaskClass(text);
  const safeClasses = ollamaSafeClassModels(matrix, threshold);
  if (safeClasses.has(taskClass)) {
    const model = safeClasses.get(taskClass);
    return { engine: "ollama", model, tier: "local", taskClass, reason: `class "${taskClass}" matrix-proven ${threshold * 100}% on ${model} -> offload ($0)` };
  }
  if (cloud) {
    return { engine: cloud.engine, model: cloud.model, tier: cloud.tier, taskClass: cloud.taskClass, reason: cloud.reason };
  }
  // Claude branch: tier per the THINK-vs-BUILD policy.
  const ct = routeClaudeTier({ task: text });
  return { engine: "claude", model: ct.tier, tier: ct.tier, taskClass: ct.taskClass, reason: ct.reason };
}
