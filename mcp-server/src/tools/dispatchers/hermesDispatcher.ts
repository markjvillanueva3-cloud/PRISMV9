/**
 * hermesDispatcher -- prism_hermes MCP tool. Bridge A of the bidirectional
 * Claude Code <-> Hermes integration: lets Claude Code drive the locally
 * installed Hermes Agent CLI (Nous Research) in a sandboxed, mock-by-default
 * way via HermesAutomationBridge.
 *
 * Carved out as its own dispatcher (prism_hermes) following the cimcoDispatcher
 * precedent. Actions are `hermes_*` prefixed for cross-dispatcher uniqueness.
 *
 * Read-only actions (status/probe/auth_status/cron_list/skill_list) read Hermes'
 * own files and never spawn. Live actions (model_list/run) require DUAL-KEY
 * (noMock param AND env PRISM_HERMES_MOCK=0) plus the sandbox tier; otherwise
 * they stay in mock mode.
 *
 * @module tools/dispatchers/hermesDispatcher
 */
import { z } from "zod";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { HERMES_ACTION_SCHEMAS } from "../../schemas/hermesActionSchemas.js";

const ACTIONS = [
  "hermes_status",
  "hermes_probe",
  "hermes_auth_status",
  "hermes_cron_list",
  "hermes_skill_list",
  "hermes_routine_plan",
  "hermes_model_list",
  "hermes_run",
  "hermes_opus_agent_spec",
  "hermes_graph_improve_plan",
  "hermes_cad_build_plan",
  "hermes_substrate_health",
] as const;

export type HermesAction = (typeof ACTIONS)[number];

function _str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export async function dispatchHermes(
  action: HermesAction,
  rawParams: Record<string, unknown> = {},
): Promise<unknown> {
  // snake_case <-> camelCase normalization (match cimco/cam dispatchers).
  let params: Record<string, unknown> = rawParams;
  try {
    const { normalizeParams } = await import("../../utils/paramNormalizer.js");
    params = normalizeParams(rawParams) as Record<string, unknown>;
  } catch {
    /* normalizer not available -- proceed with raw params */
  }

  const validation = validateActionParams(action, params, HERMES_ACTION_SCHEMAS);
  if (!validation.valid) {
    return dispatcherError(`Invalid params for '${action}': ${validation.errorMessage}`, action, "prism_hermes");
  }

  const { HermesAutomationBridge } = await import("../../engines/HermesAutomationBridge.js");
  const noMock = params.noMock === true || params["no_mock"] === true;

  switch (action) {
    case "hermes_status":
      return new HermesAutomationBridge().status();
    case "hermes_probe":
      return new HermesAutomationBridge().probe();
    case "hermes_auth_status":
      return new HermesAutomationBridge().authStatus();
    case "hermes_cron_list":
      return new HermesAutomationBridge().cronList();
    case "hermes_skill_list":
      return new HermesAutomationBridge().skillList(_str(params.profile));
    case "hermes_routine_plan":
      // Emit-only: assembles source-verified `hermes cron create` automations. Never spawns.
      return new HermesAutomationBridge().routinePlan({ deliver: _str(params.deliver), prismRoot: _str(params.prismRoot) });
    case "hermes_model_list":
      return new HermesAutomationBridge({ noMock }).modelList();
    case "hermes_run":
      return new HermesAutomationBridge({ noMock }).run((params.args as string[]) ?? []);
    case "hermes_opus_agent_spec": {
      // Pure: size a parallel opus-fast-max fan-out against a token budget. No spawn.
      const { OpusFastMaxAgentSpecEngine } = await import("../../engines/OpusFastMaxAgentSpecEngine.js");
      return OpusFastMaxAgentSpecEngine.planParallelism({
        remaining_budget_tokens: Number(params.budget_tokens ?? params.budgetTokens ?? 0),
        desired_agents: Number(params.desired_agents ?? params.desiredAgents ?? 1),
        tier: params.tier as "haiku" | "sonnet" | "opus" | undefined,
        size_hint: (params.size_hint ?? params.sizeHint) as "short" | "medium" | "large" | undefined,
        effort: params.effort as "low" | "medium" | "high" | "xhigh" | "max" | undefined,
        fast_mode: (params.fast_mode ?? params.fastMode) as boolean | undefined,
      } as Parameters<typeof OpusFastMaxAgentSpecEngine.planParallelism>[0]);
    }
    case "hermes_graph_improve_plan": {
      // Pure: plan a parallel opus fan-out to add missing engine->dispatcher edges. No spawn.
      const { GraphImprovementFanoutEngine } = await import("../../engines/GraphImprovementFanoutEngine.js");
      const maxSub = params.max_subtasks ?? params.maxSubtasks;
      return GraphImprovementFanoutEngine.plan({
        queue: (params.queue as unknown[] | undefined) ?? [],
        budgetTokens: Number(params.budget_tokens ?? params.budgetTokens ?? 1_500_000),
        desiredAgents: Number(params.desired_agents ?? params.desiredAgents ?? 12),
        ...(maxSub != null ? { maxSubtasks: Number(maxSub) } : {}),
      } as Parameters<typeof GraphImprovementFanoutEngine.plan>[0]);
    }
    case "hermes_cad_build_plan": {
      // Pure: plan a parallel opus-fast-max build fan-out over the autonomous-buildable PENDING
      // CAD units (PA3-HERMES-CAD-BUILDER). Composes OpusFastMaxAgentSpecEngine (cost table +
      // opus-fast-max spec). No spawn -- a live chat / Workflow consumes the plan and fires the batch.
      const { CADBuilderFanoutEngine } = await import("../../engines/CADBuilderFanoutEngine.js");
      const { OpusFastMaxAgentSpecEngine } = await import("../../engines/OpusFastMaxAgentSpecEngine.js");
      return CADBuilderFanoutEngine.plan({
        units: ((params.units as unknown[] | undefined) ?? []) as Parameters<typeof CADBuilderFanoutEngine.plan>[0]["units"],
        costTable: OpusFastMaxAgentSpecEngine.costTableFor("opus"),
        // Spread the AgentSpec into a plain object literal -- assignable to the Record<string,unknown>
        // param (an interface type is not implicitly assignable to Record; the spread literal is).
        builderSpec: { ...OpusFastMaxAgentSpecEngine.opusFastMaxSpec() },
        budgetTokens: Number(params.budget_tokens ?? params.budgetTokens ?? 1_500_000),
        maxCells: Number(params.max_cells ?? params.maxCells ?? 8),
      });
    }
    case "hermes_substrate_health": {
      // Pure read-only grader: a live chat / the hermes-substrate-health.mjs cron runner gathers
      // the live SubstrateProbe (proxy /health + a real ask-hermes round-trip + scheduled-task
      // states); this grades it into a pass/fail receipt. No spawn. HARDEN-FIRST liveness proof
      // for the Hermes parallel work-loop (HERMES-WORK-LOOP-MS0/U1).
      const { HermesSubstrateHealthEngine } = await import("../../engines/HermesSubstrateHealthEngine.js");
      return HermesSubstrateHealthEngine.grade(
        (params.probe ?? {}) as Parameters<typeof HermesSubstrateHealthEngine.grade>[0],
      );
    }
    default:
      return dispatcherError(`Unknown action: ${String(action)}`, action, "prism_hermes");
  }
}

export function registerHermesDispatcher(server: any): void {
  server.tool(
    "prism_hermes",
    `Hermes Agent (Nous Research) bridge -- drive the locally installed Hermes CLI
sandboxed + mock-by-default (Bridge A of the Claude-Code <-> Hermes integration).
Read-only: hermes_status, hermes_probe, hermes_auth_status (subscription OAuth-pool
health), hermes_cron_list, hermes_skill_list, hermes_routine_plan (emit ready-to-run
hermes-cron-create automations that push PRISM manufacturing intel to telegram/etc;
never deployed automatically). Live (dual-key noMock + env PRISM_HERMES_MOCK=0, sandbox
tier): hermes_model_list, hermes_run (exact CLI args). Planning (pure, no spawn):
hermes_opus_agent_spec (size a parallel opus-fast-max agent fan-out against a token
budget), hermes_graph_improve_plan (plan a parallel opus fan-out to add missing
engine->dispatcher edges to the system-viz graph), hermes_cad_build_plan (plan a
parallel opus-fast-max build fan-out over the autonomous-buildable PENDING CAD-completion
units -- one builder+physics/test/code-reviewer cell per unit; pass units in params).`,
    {
      action: z.enum(ACTIONS),
      params: z.record(z.string(), z.any()).optional(),
    },
    async ({ action, params: rawParams }: { action: HermesAction; params?: Record<string, unknown> }) => {
      let result: unknown;
      try {
        result = await dispatchHermes(action, rawParams ?? {});
      } catch (error) {
        return dispatcherError(error, action, "prism_hermes");
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }],
      };
    },
  );
}
