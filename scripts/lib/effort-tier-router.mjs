/**
 * effort-tier-router.mjs -- pure: decide the EFFORT TIER (xhigh / high / low) a prompt should run
 * at, the missing axis above the model router (U-EFFORT-TIER-ROUTE, slot:golf 2026-06-15).
 *
 * WHY (operator 2026-06-15, "API server limiting requests with only 9 chats open"): a fleet-wide
 * settings.json `effortLevel: "xhigh"` makes EVERY chat auto-fan-out a Workflow/subagents per task.
 * 9 chats x N fan-out agents all draw the same Anthropic org rate-limit bucket -> 429s. The root
 * diagnosis is [[reference_fleet_rate_limit_diagnosis_2026_05_29]]: effortLevel:xhigh (ultracode) is
 * the request multiplier. The operator's fix: a HYBRID -- baseline `high` (no auto fan-out) + a
 * per-task router that escalates to `xhigh` only for genuinely exhaustive/orchestration work and
 * drops to `low`+sonnet for mechanical. This module is the per-task brain for that hybrid.
 *
 * WHAT ALREADY EXISTS (reused, NOT re-derived -- R7/R8):
 *   - model-routing-policy.routePrompt(prompt, matrix) -> {engine, model, tier, taskClass, reason}.
 *     That picks the MODEL (ollama/fable/opus/sonnet/haiku/openrouter). This module adds the
 *     ORTHOGONAL effortLevel decision on top of that verdict -- it does not re-classify.
 *
 * MECHANISM HONESTY (R12): effortLevel is a session/global setting; the harness gives no API to
 * change it per-task mid-session. So "xhigh" here is an ADVISORY to ESCALATE ON DEMAND (invoke the
 * Workflow tool explicitly for that one heavy task) -- NOT an automatic settings flip. The 429 fix
 * is the BASELINE moving xhigh->high in settings.json so fan-out stops being the default; this
 * router tells each chat the few tasks that are still worth escalating.
 *
 * Pure -> the verdict is injected; hermetically testable.
 */

import { routePrompt as defaultRoutePrompt } from "./model-routing-policy.mjs";
import { BUILD_CLASSES } from "./claude-tier-router.mjs";

export const EFFORT_TIERS = Object.freeze(["low", "high", "xhigh"]);

// Two escalation classes (split to avoid both over-firing AND under-serving):
//
// STRONG_SCOPE = an explicit orchestration / multi-target / cover-everything intent. HIGH-confidence
// "this is heavy + wants fan-out". Strong enough to OVERRIDE a cheap Claude lane (sonnet/haiku) up to
// opus + xhigh -- if the user literally says "fan out" / "across all galaxies" / "every dispatcher",
// honoring a sonnet route would under-serve them. (Does NOT override Ollama: a matrix-PROVEN bulk-
// mechanical task like "classify across all engines" is still cheap+free locally.)
//
// WEAK_ADJECTIVE = "comprehensive / exhaustive / thorough". Only meaningful when the lane is ALREADY
// heavy (fable/opus); a bare adjective on a cheap lane ("summarize the comprehensive report") must
// NOT escalate. Keeping these separate prevents re-creating the 429 storm from incidental adjectives
// while still catching genuine orchestration intent (the fleet-work-digest "don't over-fire" lesson).
const STRONG_SCOPE = [
  /\bultracode\b/i,
  // "every/each/all [of] [the/our] [single] <domain-noun>" -- cover-all-instances intent.
  /\b(every|each|all)\s+(?:of\s+)?(?:the\s+|our\s+)?(?:single\s+)?(galax\w*|slots?|chats?|engines?|files?|records?|dispatchers?|modules?|components?|hooks?|skills?|tests?|functions?|tools?)\b/i,
  /\bacross\s+(all|the\s+fleet|every|the\s+codebase|galaxies)\b/i,
  /\b(fan[\s-]?out|orchestrat(e|ion)|spawn\s+(agents|subagents|a\s+swarm)|workflow\s+(over|across|of))\b/i,
  /\b(deep\s+audit|audit\s+(?:of\s+)?(the\s+)?(whole|entire|all|every|each)|multi[\s-]?(step|agent|file)\s+(build|migration|refactor|audit))\b/i,
];
const WEAK_ADJECTIVE = [/\b(comprehensive(ly)?|exhaustive(ly)?|thorough(ly)?)\b/i];

// Operator 2026-06-18: coding now routes to the SONNET tier but at MAX effort ("newest Sonnet and
// max settings") -- so a coding verdict on Sonnet must NOT collapse to the mechanical "low" effort.
// It gets HIGH (deep-solo max; xhigh stays reserved for orchestration fan-out per the 429 fix).
// Mechanical sonnet/haiku stays low. BUILD_CLASSES is the SINGLE source (claude-tier-router) so
// "is this coding" can't drift across the routers + the fanout gate.

/**
 * Map a model-routing verdict + raw prompt -> the effort tier.
 * @param {{ prompt: string, verdict: { engine?: string, tier?: string, model?: string, taskClass?: string } }} a
 * @returns {{ effortLevel: "low"|"high"|"xhigh", model: string, escalate: boolean, fanOut: boolean, modelOverride: boolean, reason: string }}
 */
export function routeEffort({ prompt, verdict }) {
  const text = typeof prompt === "string" ? prompt : "";
  const v = verdict && typeof verdict === "object" ? verdict : {};
  const engine = v.engine || "claude";
  const tier = v.tier || "opus";
  const strong = STRONG_SCOPE.some((re) => re.test(text));
  const weak = WEAK_ADJECTIVE.some((re) => re.test(text));

  // Mechanical proven-local -> lowest effort, no Claude, no fan-out (stays free even with scope words).
  if (engine === "ollama") {
    return {
      effortLevel: "low", model: v.model || tier, escalate: false, fanOut: false, modelOverride: false,
      reason: `mechanical (${v.taskClass || "?"}) -> Ollama local, low effort, no fan-out`,
    };
  }
  // Cloud long-context research -> deep but single-shot, no fan-out.
  if (engine === "openrouter") {
    return {
      effortLevel: "high", model: v.model || tier, escalate: false, fanOut: false, modelOverride: false,
      reason: "long-context research -> cloud, high effort single-shot, no fan-out",
    };
  }
  // Cheap-Claude lane (the operator's "sonnet" tier). An EXPLICIT strong orchestration/scope signal
  // OVERRIDES it to opus + xhigh (honor a literal fan-out / all-galaxies request); a bare adjective does not.
  if (tier === "sonnet" || tier === "haiku") {
    if (strong) {
      return {
        effortLevel: "xhigh", model: "opus", escalate: true, fanOut: true, modelOverride: true,
        reason: "explicit orchestration/scope on a cheap lane -> override to opus + xhigh (escalate)",
      };
    }
    // Coding on Sonnet -> MAX (high) effort, deep solo (operator 2026-06-18: "Sonnet @ max" for
    // coding). NOT the mechanical "low". xhigh stays reserved for orchestration scope (handled above).
    if (tier === "sonnet" && BUILD_CLASSES.has(v.taskClass)) {
      return {
        effortLevel: "high", model: tier, escalate: false, fanOut: false, modelOverride: false,
        reason: `coding (${v.taskClass}) on Sonnet -> HIGH effort (operator 2026-06-18: Sonnet @ max for coding; deep solo, no auto fan-out)`,
      };
    }
    return {
      effortLevel: "low", model: tier, escalate: false, fanOut: false, modelOverride: false,
      reason: `cheap-Claude (${tier}) mechanical/mid -> low effort, no fan-out`,
    };
  }
  // Heavy reasoning/build (fable/opus): escalate on a strong scope OR a heavy-lane adjective.
  if (strong || weak) {
    return {
      effortLevel: "xhigh", model: tier, escalate: true, fanOut: true, modelOverride: false,
      reason: "exhaustive/multi-target/orchestration -> xhigh (escalate: invoke Workflow on-demand for THIS task)",
    };
  }
  // DEFAULT (the 429 fix): high -- deep solo reasoning/build, NO automatic fan-out.
  return {
    effortLevel: "high", model: tier, escalate: false, fanOut: false, modelOverride: false,
    reason: `${tier} reasoning/build -> high (deep solo, NO auto fan-out)`,
  };
}

/**
 * Fused convenience: model-routing verdict + effort tier in one call.
 * routePrompt is injectable (defaults to the canonical policy brain) so this stays hermetically
 * testable without the matrix file.
 * @returns {{ engine, model, tier, taskClass, reason, effortLevel, escalate, fanOut, effortReason }}
 */
export function routePromptWithEffort({ prompt, matrix = null, threshold = 1.0, routePrompt = defaultRoutePrompt }) {
  const verdict = routePrompt({ prompt, matrix, threshold });
  const eff = routeEffort({ prompt, verdict });
  return {
    ...verdict,
    effortLevel: eff.effortLevel,
    escalate: eff.escalate,
    fanOut: eff.fanOut,
    modelOverride: eff.modelOverride,
    model: eff.model || verdict.model,
    // keep tier consistent with the model when a cheap lane was overridden up to opus.
    tier: eff.modelOverride ? eff.model : verdict.tier,
    effortReason: eff.reason,
  };
}
