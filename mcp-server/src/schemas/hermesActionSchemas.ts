/**
 * hermesActionSchemas -- Zod per-action param schemas for the prism_hermes
 * dispatcher (HermesAutomationBridge, Bridge A of the CC <-> Hermes integration).
 * Mirrors cimcoActionSchemas: one schema per action, validated by
 * validateActionParams(action, params, HERMES_ACTION_SCHEMAS).
 *
 * @module schemas/hermesActionSchemas
 */
import { z } from "zod";

// Read-only inspection actions take no params.
const hermes_status = z.object({}).passthrough();
const hermes_probe = z.object({}).passthrough();
const hermes_auth_status = z.object({}).passthrough();
const hermes_cron_list = z.object({}).passthrough();

const hermes_skill_list = z.object({
  profile: z.string().describe("Hermes profile to list skills for (default: active profile)").optional(),
});

// Emit-only: assembles source-verified `hermes cron create` automations. No spawn, no params required.
const hermes_routine_plan = z.object({
  deliver: z
    .string()
    .describe("delivery target for emitted routines (telegram|discord|slack|sms|email|github|webhook|local; default telegram)")
    .optional(),
  prismRoot: z.string().describe("PRISM repo root for resolving script paths (default env PRISM_ROOT or H:/prism)").optional(),
});

// Live actions. `noMock` is one half of the dual-key (env PRISM_HERMES_MOCK=0 is the other);
// without BOTH, the bridge stays in mock mode and never spawns the CLI.
const hermes_model_list = z.object({
  noMock: z.boolean().describe("request a LIVE run (also needs env PRISM_HERMES_MOCK=0); else mock list").optional(),
});

const hermes_run = z.object({
  args: z.array(z.string()).min(1).max(64).describe("exact Hermes CLI args, e.g. ['model','list'] (array form, no shell)"),
  noMock: z.boolean().describe("request a LIVE spawn (also needs env PRISM_HERMES_MOCK=0 and sandbox tier)").optional(),
});

// U-ALPHA-HERMES-GRAPH-IMPROVE: size a parallel opus-fast-max agent fan-out against a budget.
const hermes_opus_agent_spec = z.object({
  budget_tokens: z.number().int().min(0).max(20_000_000).describe("remaining token budget the fan-out must fit inside"),
  desired_agents: z.number().int().min(1).max(20).describe("parallel agents wanted (the 'drastically increase' lever)"),
  tier: z.enum(["haiku", "sonnet", "opus"]).describe("model tier per agent (default opus)").optional(),
  size_hint: z.enum(["short", "medium", "large"]).describe("per-agent size band (default medium)").optional(),
  effort: z.enum(["low", "medium", "high", "xhigh", "max"]).describe("reasoning effort per agent (default max)").optional(),
  fast_mode: z.boolean().describe("fast mode per agent (default true)").optional(),
});

// U-ALPHA-HERMES-GRAPH-IMPROVE: plan a parallel opus fan-out to improve the system-viz graph.
const hermes_graph_improve_plan = z.object({
  queue: z
    .array(
      z
        .object({
          domain: z.string().min(1).max(120).describe("graph-domain bucket label"),
          unwired: z.number().describe("count of unwired engines (missing engine->dispatcher edges) in this bucket"),
          leverageScore: z.number().describe("leverage rank for prioritization").optional(),
          coverage_pct: z.number().describe("current dispatcher coverage percentage").optional(),
        })
        .passthrough(),
    )
    .max(200)
    .describe("leverage wiring-queue entries (each entry = a domain bucket of unwired engines)"),
  budget_tokens: z.number().int().min(0).max(20_000_000).describe("remaining token budget (default 1,500,000)").optional(),
  desired_agents: z.number().int().min(1).max(20).describe("parallel agents wanted (default 12)").optional(),
  max_subtasks: z.number().int().min(1).max(20).describe("cap on subtasks pulled from the queue (default 12)").optional(),
});

// U-CAD-HERMES-CAD-BUILDER: plan a parallel opus-fast-max build fan-out over the autonomous-
// buildable PENDING CAD-completion units (one builder+physics/test/code-reviewer cell per unit).
const hermes_cad_build_plan = z.object({
  units: z
    .array(
      z
        .object({
          id: z.string().min(1).max(120).describe("CAD-completion unit id (e.g. U-CAD-PRINTGEN-E2E)"),
          phase: z.string().max(8).describe("roadmap phase (A|B|C|D|PA)").optional(),
          gate: z.string().max(8).nullable().describe("terminal gate (T1|T2|T3) or null").optional(),
          op: z.boolean().describe("operator-gated unit (excluded from the autonomous fan-out)").optional(),
          state: z.string().max(24).describe("PENDING | SHIPPED").optional(),
          title: z.string().max(240).describe("unit title").optional(),
        })
        .passthrough(),
    )
    .max(200)
    .describe("CAD-COMPLETION-STATUS results entries (the planner picks the autonomous-buildable PENDING ones)"),
  budget_tokens: z.number().int().min(0).max(20_000_000).describe("token budget for the whole fan-out (default 1,500,000)").optional(),
  max_cells: z.number().int().min(1).max(20).describe("cap on concurrent build cells (default 8)").optional(),
});

// HERMES-WORK-LOOP-MS0/U1: grade a Hermes substrate liveness PROBE into a pass/fail receipt.
// Pure, read-only, no spawn -- a live chat or the `hermes-substrate-health.mjs` cron runner
// gathers the probe (proxy /health + a real ask-hermes round-trip + scheduled-task states),
// this action grades it via HermesSubstrateHealthEngine. The `probe` is permissive (passthrough)
// because its sub-shapes (ProxyProbe/RoundTripProbe/ScheduledTaskProbe) are validated + defended
// inside the engine; a malformed probe is graded UNKNOWN/DOWN, never silently OK.
const hermes_substrate_health = z.object({
  probe: z
    .object({
      proxy: z.object({}).passthrough().describe("proxy /health probe { url, ok, status, authenticated, upstream, error }").optional(),
      roundTrip: z.object({}).passthrough().describe("live ask-hermes round-trip { ran, source, reachedHermes, ms, error }").optional(),
      usage: z.object({}).passthrough().describe("lifetime ask-hermes counters { fired, bySource }").optional(),
      tasks: z.array(z.object({}).passthrough()).max(64).describe("registered scheduled-task states [{ name, state, lastRunTime, lastResult }]").optional(),
      expectedTasks: z.array(z.string()).max(64).describe("task names that SHOULD be registered (a missing one is flagged)").optional(),
    })
    .passthrough()
    .describe("the live SubstrateProbe gathered by hermes-substrate-health.mjs"),
});

export const HERMES_ACTION_SCHEMAS = {
  hermes_status,
  hermes_probe,
  hermes_auth_status,
  hermes_cron_list,
  hermes_skill_list,
  hermes_routine_plan,
  hermes_model_list,
  hermes_run,
  hermes_opus_agent_spec,
  hermes_graph_improve_plan,
  hermes_cad_build_plan,
  hermes_substrate_health,
} as const;

export type HermesActionName = keyof typeof HERMES_ACTION_SCHEMAS;
