/**
 * PRISM Agent SDK Configuration
 *
 * Defines a shared PRISM agent topology that can be attached to
 * Claude-first or Codex/GPT-class reasoning runtimes without
 * forking the manufacturing logic, deep-learning stack, or CLI.
 */

import {
  getDefaultPrismRuntimeProfileId,
  getPrismRuntimeProfile,
  listPrismRuntimeProfiles,
  type PrismRuntimeProfile,
  type PrismRuntimeProfileId,
} from "../config/reasoningProfiles.js";
import type { ReasoningTier } from "../config/api-config.js";

type SubagentBlueprint = {
  description: string;
  prompt: string;
  tools: string[];
  reasoningTier: ReasoningTier;
};

export const PRISM_REASONING_STACK = [
  "PRISMUnifiedOrchestratorEngine",
  "ScientificReasoningEngine",
  "ManufacturingReasoningEngine",
  "MultiPathReasoningEngine",
  "DecisionReasoningEngine",
  "ChainOfThoughtEngine",
  "ExtendedThinkingBridgeEngine",
  "AgentMemoryFabricEngine",
  "LearningLoopEngine",
  "SpeedFeedDeepLearningEngine",
  "FiveAxisDeepLearningEngine",
  "PostProcessorDeepLearningEngine",
] as const;

const SUBAGENT_BLUEPRINTS: Record<string, SubagentBlueprint> = {
  "speed-feed-expert": {
    description:
      "Calculate optimal spindle RPM and feed rate using " +
      "Kienzle/Taylor physics with 67-point analysis. Use for " +
      "any speed, feed, RPM, or cutting parameter question.",
    prompt: [
      "You are a manufacturing speed/feed specialist with deep ",
      "knowledge of Kienzle cutting force (Fc = kc1.1 * ap * ",
      "fz^(1-mc)) and Taylor tool life (T = (C/Vc)^(1/n)).",
      "",
      "When asked to calculate speed/feed:",
      "1. Use prism_calc with action 'sf_orchestrate'",
      "2. Include all 67 analysis points",
      "3. Report: RPM, feed rate, Fc, tool life, Cpk, MRR",
      "4. Flag any safety concerns or chatter risk",
      "5. Include playbook tips from prism_data",
      "",
      "Always provide units (mm, mm/min, N, minutes).",
      "Never exceed machine power/torque limits.",
    ].join("\n"),
    tools: [
      "mcp__prism__prism_calc",
      "mcp__prism__prism_data",
    ],
    reasoningTier: "haiku",
  },
  "feasibility-checker": {
    description:
      "Check if a part can be machined: tool reach, fixture " +
      "viability, rigidity, sequence feasibility. Use for any " +
      "'can this be machined?' or DfM question.",
    prompt: [
      "You are a manufacturing feasibility analyst. You check ",
      "whether parts can be machined using PRISM's 7 feasibility ",
      "engines: WorkpieceState, Accessibility, Workholding, ",
      "Rigidity, Sequence, SetupTransition, Orchestrator.",
      "",
      "Use prism_feasibility with action 'full_analysis' for ",
      "comprehensive checks, or 'quick_check' for rapid screening.",
      "",
      "Report: pass/fail per engine, blockers, suggestions.",
    ].join("\n"),
    tools: [
      "mcp__prism__prism_feasibility",
      "mcp__prism__prism_data",
      "mcp__prism__prism_calc",
    ],
    reasoningTier: "sonnet",
  },
  "cnc-simulator": {
    description:
      "Run CNC simulation with per-block physics analysis. " +
      "Use for G-code verification, collision detection, " +
      "force/thermal/deflection prediction.",
    prompt: [
      "You are a CNC simulation specialist. You analyze G-code ",
      "programs using PRISM's 8-layer simulation stack:",
      "SweptVolume, ToolAssembly, Pipeline, Report, PhysicsAware, ",
      "Predictive. Use prism_cnc_ops for simulation actions.",
      "",
      "Report: per-block forces, thermal load, deflection, ",
      "surface finish (Ra/Rz), collisions, safety violations.",
      "Flag any blocks exceeding safety thresholds.",
    ].join("\n"),
    tools: [
      "mcp__prism__prism_cnc_ops",
      "mcp__prism__prism_calc",
      "mcp__prism__prism_data",
    ],
    reasoningTier: "sonnet",
  },
  "cam-strategist": {
    description:
      "Recommend CAM toolpath strategies and cross-CAM system " +
      "analysis. Use for toolpath selection, strategy comparison, " +
      "or CAM system recommendations.",
    prompt: [
      "You are a CAM strategy expert with knowledge of 433 ",
      "toolpath strategies across 20 CAM systems. You use PRISM's ",
      "CrossCamRecommender, NovelToolpath (24 algorithms), and ",
      "ToolpathStrategyRegistry.",
      "",
      "Use prism_cam for: cross_cam_recommend, cross_cam_synthesize, ",
      "novel_compute, strategy_select.",
      "Use prism_toolpath for: novel_list, extended_list.",
      "",
      "Always compare at least 3 strategies with trade-offs.",
    ].join("\n"),
    tools: [
      "mcp__prism__prism_cam",
      "mcp__prism__prism_toolpath",
      "mcp__prism__prism_data",
    ],
    reasoningTier: "sonnet",
  },
  "quote-estimator": {
    description:
      "Generate manufacturing quotes with physics-backed cost " +
      "estimation. Use for pricing, cycle time, ROI analysis.",
    prompt: [
      "You are a manufacturing cost estimator. You use PRISM's ",
      "QuoteEstimator and ROIAdvisor engines for physics-backed ",
      "costing: cycle time, tooling cost, material cost, setup ",
      "time, price breaks, and DfM feedback.",
      "",
      "Use prism_business for: quote_estimate, roi_analyze.",
      "Cross-reference with prism_calc for cycle time accuracy.",
      "",
      "Always provide: unit cost, batch cost, price breaks at ",
      "1/10/100/1000 qty, setup cost, tooling amortization.",
    ].join("\n"),
    tools: [
      "mcp__prism__prism_business",
      "mcp__prism__prism_calc",
      "mcp__prism__prism_data",
    ],
    reasoningTier: "haiku",
  },
};

function buildSystemPrompt(profile: PrismRuntimeProfile) {
  return [
    "You are PRISM, an autonomous manufacturing intelligence agent.",
    `Reasoning runtime: ${profile.label} (${profile.executionProvider}, ${profile.coordinatorModel}).`,
    "You have access to 67 dispatchers with 2474+ manufacturing ",
    "actions covering speed/feed, CNC simulation, feasibility, ",
    "CAM strategy, quoting, and more.",
    "",
    "DEEP REASONING STACK:",
    ...PRISM_REASONING_STACK.map((engine) => `- ${engine}`),
    "",
    "DELEGATION RULES:",
    "- Speed/feed questions -> delegate to speed-feed-expert",
    "- Feasibility/DfM -> delegate to feasibility-checker",
    "- G-code simulation -> delegate to cnc-simulator",
    "- CAM strategy -> delegate to cam-strategist",
    "- Quoting/costing -> delegate to quote-estimator",
    "- Multi-domain questions -> coordinate multiple specialists",
    "",
    "DEEP LEARNING / DEEP LOGIC EXPECTATIONS:",
    "- Use multi-hypothesis reasoning before final recommendations",
    "- Keep calculations grounded in PRISM's manufacturing physics and learned priors",
    "- Reconcile tool outputs against safety, uncertainty, and downstream execution impact",
    "- Preserve chain-of-thought internally but return concise operator-facing conclusions",
    "",
    "SAFETY:",
    "- Never exceed machine power/torque limits",
    "- Always validate speed/feed against stability lobes",
    "- Flag any potential collision or crash risk",
    "- Include confidence intervals on predictions",
  ].join("\n");
}

function buildSubagents(profile: PrismRuntimeProfile) {
  return Object.fromEntries(
    Object.entries(SUBAGENT_BLUEPRINTS).map(([id, blueprint]) => [
      id,
      {
        description: blueprint.description,
        prompt: blueprint.prompt,
        tools: blueprint.tools,
        reasoningTier: blueprint.reasoningTier,
        model: profile.tierModels[blueprint.reasoningTier],
        resolvedModel: profile.tierModels[blueprint.reasoningTier],
      },
    ]),
  );
}

const PRISM_MCP_SERVER = {
  prism: {
    command: "node",
    args: ["dist/index.js"],
    cwd: process.env.PRISM_MCP_PATH ?? process.cwd(),
    env: {
      TRANSPORT: "stdio",
      LOG_LEVEL: "warn",
    },
  },
};

export const PRISM_AGENT_RUNTIME_PROFILES = listPrismRuntimeProfiles();

export function createPrismAgentConfig(
  profileId: PrismRuntimeProfileId = getDefaultPrismRuntimeProfileId(),
) {
  const profile = getPrismRuntimeProfile(profileId);

  return {
    model: profile.coordinatorModel,
    systemPrompt: buildSystemPrompt(profile),
    mcpServers: PRISM_MCP_SERVER,
    agents: buildSubagents(profile),
    allowedTools: [
      "mcp__prism__*",
      "Read",
      "Grep",
      "Agent",
    ],
    maxTurns: profile.reasoningDepth === "agentic" ? 64 : 50,
    maxBudgetUsd: profile.executionProvider === "openai" ? 7.5 : 5.0,
    effort: profile.reasoningDepth === "agentic" ? "high" as const : "medium" as const,
    prismRuntime: {
      id: profile.id,
      label: profile.label,
      provider: profile.provider,
      executionProvider: profile.executionProvider,
      coordinatorModel: profile.coordinatorModel,
      executionState: profile.executionState,
      capabilities: profile.capabilities,
    },
    hooks: {
      PreToolUse: [{
        matcher: "mcp__prism__prism_safety",
        hooks: [{
          type: "prompt" as const,
          prompt:
            "This is a safety-critical operation. Verify the " +
            "parameters are within safe limits before proceeding. " +
            "Return {\"ok\": true} if safe, {\"ok\": false, " +
            "\"reason\": \"...\"} if unsafe.",
          model: profile.tierModels.haiku,
        }],
      }],
    },
  };
}

export const PRISM_SUBAGENTS = buildSubagents(
  getPrismRuntimeProfile(getDefaultPrismRuntimeProfileId()),
);

export const PRISM_AGENT_CONFIG = createPrismAgentConfig();
export const PRISM_CLAUDE_AGENT_CONFIG = createPrismAgentConfig("claude-opus");
export const PRISM_CODEX_AGENT_CONFIG = createPrismAgentConfig("codex-gpt54");
export const PRISM_HYBRID_AGENT_CONFIG = createPrismAgentConfig("hybrid-auto");

export const PRISM_QUICK_CONFIG = (() => {
  const profile = getPrismRuntimeProfile();
  return {
    model: profile.tierModels.haiku,
    systemPrompt:
      "You are PRISM quick-calc mode. Use prism_calc for fast " +
      "manufacturing calculations. Be concise, but keep the result " +
      "grounded in deep-learning-backed manufacturing priors.",
    mcpServers: PRISM_MCP_SERVER,
    allowedTools: [
      "mcp__prism__prism_calc",
      "mcp__prism__prism_data",
    ],
    maxTurns: 10,
    maxBudgetUsd: 0.5,
    effort: "low" as const,
    prismRuntime: {
      id: profile.id,
      provider: profile.provider,
      executionProvider: profile.executionProvider,
    },
  };
})();

export const PRISM_BATCH_CONFIG = (() => {
  const profile = getPrismRuntimeProfile();
  return {
    model: profile.tierModels.sonnet,
    systemPrompt:
      "You are PRISM batch processor. Execute manufacturing " +
      "calculations and return structured JSON results. " +
      "No explanations needed - data only, but keep deep-reasoning " +
      "consistency across the batch.",
    mcpServers: PRISM_MCP_SERVER,
    allowedTools: ["mcp__prism__*"],
    maxTurns: 30,
    maxBudgetUsd: 2.0,
    effort: "medium" as const,
    prismRuntime: {
      id: profile.id,
      provider: profile.provider,
      executionProvider: profile.executionProvider,
    },
    outputFormat: {
      type: "json_schema" as const,
      schema: {
        type: "object" as const,
        properties: {
          results: {
            type: "array" as const,
            items: {
              type: "object" as const,
              properties: {
                operation: { type: "string" as const },
                status: { type: "string" as const },
                data: { type: "object" as const },
              },
            },
          },
          summary: { type: "string" as const },
          errors: {
            type: "array" as const,
            items: { type: "string" as const },
          },
        },
        required: ["results", "summary"],
      },
    },
  };
})();
