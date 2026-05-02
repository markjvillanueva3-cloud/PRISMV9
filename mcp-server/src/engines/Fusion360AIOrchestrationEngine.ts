/**
 * Fusion360AIOrchestrationEngine — AI request routing for Fusion 360 work
 *
 * Routes AI-augmented requests (strategy suggestion, parameter optimization,
 * tool selection, post-failure diagnosis) to the appropriate engine layer
 * (PRISM's strategy/safety/material engines OR external Ollama/Claude).
 *
 * Sister engine: MastercamAIOrchestrationEngine (same shape, Mastercam-specific).
 *
 * @module engines/Fusion360AIOrchestrationEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM-FUSION-AI-01
 */

import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const AITaskKindSchema = z.enum([
  "strategy_suggest",
  "parameter_optimize",
  "tool_select",
  "post_failure_diagnose",
  "safety_explain",
  "material_recommend",
  "kinematic_validate",
  "scenario_summarize",
]);
export type AITaskKind = z.infer<typeof AITaskKindSchema>;

export const RouteTargetSchema = z.enum([
  "prism_strategy",
  "prism_safety",
  "prism_material",
  "prism_multiaxis",
  "prism_probing",
  "prism_millturn",
  "prism_cycle_catalog",
  "prism_controller_catalog",
  "prism_tool_export",
  "ollama_local",
  "claude_remote",
]);
export type RouteTarget = z.infer<typeof RouteTargetSchema>;

export const AIRequestSchema = z.object({
  task: AITaskKindSchema,
  payload: z.record(z.string(), z.unknown()),
  prefer_local: z.boolean().optional(),
  max_latency_ms: z.number().int().positive().optional(),
});
export type AIRequest = z.infer<typeof AIRequestSchema>;

export const AIRouteSchema = z.object({
  task: AITaskKindSchema,
  primary_target: RouteTargetSchema,
  fallback_targets: z.array(RouteTargetSchema),
  rationale: z.string().min(1),
});
export type AIRoute = z.infer<typeof AIRouteSchema>;

// ── Routing table ───────────────────────────────────────────────────────────

interface RouteRule {
  primary: RouteTarget;
  fallbacks: RouteTarget[];
  rationale: string;
}

const ROUTING_TABLE: Readonly<Record<AITaskKind, RouteRule>> = Object.freeze({
  strategy_suggest: {
    primary: "prism_strategy",
    fallbacks: ["ollama_local", "claude_remote"],
    rationale: "Strategy selection is deterministic — Fusion360StrategyEngine + cycle catalog cover the 9-slot matrix. Fall back to Ollama for novel feature combinations.",
  },
  parameter_optimize: {
    primary: "prism_strategy",
    fallbacks: ["prism_material", "ollama_local"],
    rationale: "Cutting-parameter math (Vc → RPM, fz → feed) is closed-form via Fusion360StrategyEngine. Material lookup composes via MaterialBridge.",
  },
  tool_select: {
    primary: "prism_tool_export",
    fallbacks: ["prism_strategy", "ollama_local"],
    rationale: "Tool library lookup is a deterministic catalog query. Fall back to strategy engine for tool-class recommendations when no exact match.",
  },
  post_failure_diagnose: {
    primary: "ollama_local",
    fallbacks: ["claude_remote", "prism_safety"],
    rationale: "Post-processor failures are unstructured text + G-code — local LLM is the right primary, with safety hooks as a deterministic cross-check.",
  },
  safety_explain: {
    primary: "prism_safety",
    fallbacks: ["ollama_local", "claude_remote"],
    rationale: "Safety hooks have deterministic findings — primary is the rule engine. LLM only adds plain-English explanation if requested.",
  },
  material_recommend: {
    primary: "prism_material",
    fallbacks: ["claude_remote"],
    rationale: "Material catalog is bounded — direct lookup is faster than any LLM. Fall back to Claude only for materials not in the 24-entry catalog.",
  },
  kinematic_validate: {
    primary: "prism_multiaxis",
    fallbacks: ["ollama_local"],
    rationale: "Kinematic envelope check is pure math — Fusion360MultiAxisEngine.validateOrientation. LLM only for novel kinematic configurations.",
  },
  scenario_summarize: {
    primary: "ollama_local",
    fallbacks: ["claude_remote"],
    rationale: "Summarizing scenario results is a natural-language task — local LLM handles structured-to-prose conversion well.",
  },
});

// ── Engine ───────────────────────────────────────────────────────────────────

export class Fusion360AIOrchestrationEngine {
  static readonly ROUTING_TABLE = ROUTING_TABLE;

  /**
   * Pick the route for a given AI task. When prefer_local=true is set, swaps
   * any claude_remote primary to ollama_local (with the original primary as
   * the first fallback).
   */
  static route(request: AIRequest): AIRoute {
    const req = AIRequestSchema.parse(request);
    const rule = ROUTING_TABLE[req.task];
    let primary = rule.primary;
    let fallbacks = [...rule.fallbacks];

    if (req.prefer_local === true && primary === "claude_remote") {
      // Promote ollama_local if present in fallbacks; else just demote claude_remote.
      const ollamaIdx = fallbacks.indexOf("ollama_local");
      if (ollamaIdx >= 0) {
        primary = "ollama_local";
        fallbacks.splice(ollamaIdx, 1);
        fallbacks.unshift("claude_remote");
      }
    }

    return AIRouteSchema.parse({
      task: req.task,
      primary_target: primary,
      fallback_targets: fallbacks,
      rationale: rule.rationale,
    });
  }

  /** Returns the full routing table as a frozen snapshot. */
  static routes(): Record<AITaskKind, AIRoute> {
    const out = {} as Record<string, AIRoute>;
    for (const task of AITaskKindSchema.options) {
      out[task] = Fusion360AIOrchestrationEngine.route({ task, payload: {} });
    }
    return out as Record<AITaskKind, AIRoute>;
  }

  /** Reverse lookup — which tasks route to a given target as primary. */
  static tasksRoutedTo(target: RouteTarget): AITaskKind[] {
    const out: AITaskKind[] = [];
    for (const task of AITaskKindSchema.options) {
      if (ROUTING_TABLE[task].primary === target) out.push(task);
    }
    return out;
  }

  static auditRouting(): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    // Every task must have a routing rule.
    for (const task of AITaskKindSchema.options) {
      if (ROUTING_TABLE[task] === undefined) errors.push(`task ${task} has no routing rule`);
    }
    // Every primary + fallback target must be a known RouteTarget.
    for (const [task, rule] of Object.entries(ROUTING_TABLE)) {
      try { RouteTargetSchema.parse(rule.primary); }
      catch { errors.push(`task ${task}: invalid primary ${rule.primary}`); }
      for (const f of rule.fallbacks) {
        try { RouteTargetSchema.parse(f); }
        catch { errors.push(`task ${task}: invalid fallback ${f}`); }
      }
    }
    // Every PRISM target referenced should have ≥1 task routed to it.
    const prismTargets = ["prism_strategy", "prism_safety", "prism_material", "prism_multiaxis"];
    for (const target of prismTargets) {
      const count = Fusion360AIOrchestrationEngine.tasksRoutedTo(target as RouteTarget).length;
      if (count === 0) errors.push(`PRISM target ${target} has no tasks routed to it`);
    }
    return { ok: errors.length === 0, errors };
  }
}

export const fusion360AIOrchestrationEngine = Fusion360AIOrchestrationEngine;
