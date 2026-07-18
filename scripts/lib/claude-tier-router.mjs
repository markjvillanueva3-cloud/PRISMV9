/**
 * claude-tier-router.mjs -- pure: decide WHICH CLAUDE TIER (fable/opus/sonnet/haiku) a Claude-bound
 * task uses (U-CLAUDE-TIER-ROUTE, slot:india 2026-06-11). The MISSING LAYER above the canonical
 * executor contract.
 *
 * WHAT ALREADY EXISTS (reused here, NOT re-derived -- R7/R8):
 *   - [[local-llm-task-router]] classifyTaskClass(task) -> {taskClass, category} + isSafetyCritical.
 *   - .claude/hooks/lib/ollama-cost-router.mjs resolveExecutor + claudeFallbackModel(category)
 *     -> the cheap-Claude split (mechanical-on-Claude -> "haiku"|"sonnet", NEVER opus). U-FLOR-CLAUDE-TIER
 *     (tango, 2026-06-11) shipped that anti-leak ladder. CLAUDE_REASONING_MODEL = the top reserved tier.
 *
 * THE GAP THIS CLOSES (operator 2026-06-11, "fable demolished session limits"): the canonical router
 * collapses the TOP tier into a single "opus" placeholder (CLAUDE_REASONING_MODEL) -- it does NOT
 * distinguish FABLE from OPUS. The operator's directive is more granular:
 *   - FABLE = heavy planning, brainstorming, gap-filling, deep reasoning, deep logic   (THINK)
 *   - OPUS  = lighter reasoning AND heavy building/coding                              (BUILD)
 * So this router adds EXACTLY ONE new decision: split the top reserved tier fable-vs-opus on the
 * THINK-vs-BUILD axis. Cheap tiers (sonnet/haiku) are delegated UNCHANGED to claudeFallbackModel.
 *
 * OPERATOR OVERRIDE (2026-06-18, "coding on Sonnet"): the DEFAULT coding/build tier moved off
 * Opus -> newest Sonnet @ max (paired with a local coder ensemble). routeClaudeTier's coding
 * branch now returns "sonnet". Opus stays the ESCALATION tier for deep/novel/architecture coding
 * -- routed there by the cost-router CLAUDE_LANE_CATEGORIES (novel_codegen/multi_file_refactor/
 * architecture), NOT this coarse default. THINK still -> fable; safety still -> opus (frontier).
 * R7: more-recent operator directive supersedes the 2026-06-11 build->opus split.
 * Pure -> hermetically testable.
 */

import { claudeFallbackModel, CLAUDE_REASONING_MODEL } from "../../.claude/hooks/lib/ollama-cost-router.mjs";
import { classifyTaskClass, isSafetyCritical } from "./local-llm-task-router.mjs";

export const CLAUDE_TIERS = Object.freeze(["haiku", "sonnet", "opus", "fable"]);

// task-classes (from classifyTaskClass) that are inherently THINK vs BUILD at the top tier.
const THINK_CLASSES = Object.freeze(new Set(["reason", "synthesize"]));
// Coding task-classes (from classifyTaskClass). EXPORTED as the single source for "is this a
// coding/build task" -- consumed by effort-tier-router (coding-on-Sonnet -> max effort) and
// agent-fanout-pressure-gate (a coding agent is judgment/build, NOT mechanical read-fanout).
// Single-sourced here so the operator's coding->Sonnet retier can't drift across consumers.
export const BUILD_CLASSES = Object.freeze(new Set(["codegen", "audit"]));

// Keyword overrides on the raw task text -- the THINK-vs-BUILD intent the coarse class can miss.
// fable wins ties (a deep-think task mis-routed to opus is the costlier error to make cheap).
const FABLE_PATTERNS = [
  /\b(plan|planning|brainstorm|strategy|strategize|architect(ure)?|design\s+(the|a|an)\b)/i,
  /\b(deep\s+(reason|logic|think)|root[\s-]cause|prove\b|proof|theorem|derive|trade[\s-]?off|cover\s+all\s+angles)\b/i,
  /\b(gap[\s-]?fill|fill\s+the\s+gap|reason\s+through|think\s+through|figure\s+out\s+why|weigh\s+the\s+options)\b/i,
];
// CODING intent (operator 2026-06-18: coding DEFAULTS to newest Sonnet @ max, NOT Opus).
// Renamed from OPUS_PATTERNS -- the name was a lie once the coding default moved off Opus.
// In routeClaudeTier these route to SONNET (the coding default); deep/novel/architecture
// coding still escalates to Opus, but via the cost-router CLAUDE_LANE_CATEGORIES
// (novel_codegen/multi_file_refactor/architecture), NOT this coarse pattern. In the
// (prod-unused) refineTopTier top-tier splitter these still mean "the top-tier work is
// build-flavored -> opus" (the escalation context), so the name stays generic.
const CODING_PATTERNS = [
  /\b(build|implement|wire\s+(up|the|in)|scaffold|refactor|fix\s+the|write\s+the\s+(code|engine|test|function|hook|dispatcher)|add\s+(the|a)\s+(engine|test|hook|dispatcher|action))\b/i,
  /\b(heavy\s+(build|coding)|code\s+up|port\s+the|migrate\s+the)\b/i,
];

// safety-critical Claude work -> the build-grade frontier (opus), never a cheap tier.
const SAFETY_TIER = "opus";

/**
 * Split the TOP reserved tier (CLAUDE_REASONING_MODEL, "opus") into fable (THINK) vs opus (BUILD).
 * A non-top tier (already "sonnet"/"haiku" from claudeFallbackModel) is returned UNCHANGED -- this
 * only refines the top. Use this when you already hold a resolveExecutor verdict's `claudeModel`.
 * @param {{ claudeModel: string, task?: string, taskClass?: string }} a
 * @returns {string} the refined tier
 */
export function refineTopTier({ claudeModel, task = "", taskClass = "" }) {
  if (claudeModel !== CLAUDE_REASONING_MODEL) return claudeModel; // sonnet/haiku unchanged
  const text = typeof task === "string" ? task : "";
  if (FABLE_PATTERNS.some((re) => re.test(text))) return "fable";
  // refineTopTier only fires for work a caller ALREADY resolved to the TOP tier, so a
  // build-flavored top-tier task is heavy/novel coding -> opus (the escalation context).
  // (Ordinary coding routes to Sonnet via routeClaudeTier, never reaching here.)
  if (CODING_PATTERNS.some((re) => re.test(text))) return "opus";
  if (THINK_CLASSES.has(taskClass)) return "fable";
  if (BUILD_CLASSES.has(taskClass)) return "opus";
  return "fable"; // at the top tier with no build signal, deep-think is the safer assumption
}

/**
 * Primary router: given a RAW task/prompt string, return the Claude tier it should run on.
 * Composes classifyTaskClass + the THINK/BUILD split + claudeFallbackModel (reused for the cheap lane).
 * @param {{ task: string }} a
 * @returns {{ tier: string, reason: string, taskClass: string }}
 */
export function routeClaudeTier({ task }) {
  const text = typeof task === "string" ? task : "";
  if (isSafetyCritical(text)) return { tier: SAFETY_TIER, reason: "safety-critical -> frontier (opus)", taskClass: "safety_critical" };
  const { taskClass, category } = classifyTaskClass(text);
  // THINK -> fable (keyword or inherently-think class).
  if (FABLE_PATTERNS.some((re) => re.test(text)) || THINK_CLASSES.has(taskClass)) {
    return { tier: "fable", reason: "think/plan/deep-reason -> fable", taskClass };
  }
  // CODING -> Sonnet (operator 2026-06-18: coding DEFAULTS to newest Sonnet @ max, paired
  // with the local coder ensemble; Opus is ESCALATION-ONLY for deep/novel/architecture
  // coding, which the cost-router routes via CLAUDE_LANE_CATEGORIES novel_codegen/
  // multi_file_refactor/architecture -- NOT this coarse default path). Reverses the
  // 2026-06-11 build->opus decision (R7: more-recent operator directive wins).
  if (CODING_PATTERNS.some((re) => re.test(text)) || BUILD_CLASSES.has(taskClass)) {
    return { tier: "sonnet", reason: "coding/build -> Sonnet @ max (operator 2026-06-18); Opus is escalation-only for deep/novel/architecture", taskClass };
  }
  // Mechanical-on-Claude -> the cheap split (REUSED, not re-derived): haiku for cheap, sonnet else.
  const tier = claudeFallbackModel(category);
  return { tier, reason: `mechanical class "${taskClass}" -> cheap Claude (${tier})`, taskClass };
}
