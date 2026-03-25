/**
 * PRISM Agent SDK Configuration
 *
 * Defines the agent architecture for wrapping PRISM as an autonomous
 * manufacturing intelligence agent using Claude Agent SDK.
 *
 * Architecture:
 *   Coordinator Agent (Opus) — orchestrates specialist subagents
 *   ├── SF Specialist (Haiku) — speed/feed calculations
 *   ├── Feasibility Agent (Sonnet) — 7-engine feasibility analysis
 *   ├── Simulation Agent (Sonnet) — CNC simulation + physics
 *   ├── CAM Agent (Sonnet) — toolpath strategy + cross-CAM
 *   └── Quote Agent (Haiku) — cost estimation + ROI
 *
 * Usage with Claude Agent SDK (Python):
 *   from claude_agent_sdk import query, ClaudeAgentOptions
 *   options = ClaudeAgentOptions(**PRISM_AGENT_CONFIG)
 *   async for msg in query(prompt="...", options=options):
 *       print(msg)
 *
 * Usage with Claude Agent SDK (TypeScript):
 *   import { query } from '@anthropic-ai/claude-agent-sdk';
 *   for await (const msg of query({
 *     prompt: "...",
 *     options: PRISM_AGENT_CONFIG
 *   })) { console.log(msg); }
 *
 * @see https://docs.anthropic.com/en/docs/agent-sdk
 */

/**
 * Subagent definitions for PRISM specialist agents.
 * Each agent has focused instructions, restricted tools, and
 * an appropriate model tier for its workload.
 */
export const PRISM_SUBAGENTS = {
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
    model: "haiku",
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
    model: "sonnet",
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
    model: "sonnet",
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
    model: "sonnet",
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
    model: "haiku",
  },
};

/**
 * Full PRISM agent configuration for Claude Agent SDK.
 * Includes MCP server connection, subagents, hooks, and budget.
 */
export const PRISM_AGENT_CONFIG = {
  model: "claude-opus-4-6",
  systemPrompt: [
    "You are PRISM, an autonomous manufacturing intelligence agent.",
    "You have access to 67 dispatchers with 2474+ manufacturing ",
    "actions covering speed/feed, CNC simulation, feasibility, ",
    "CAM strategy, quoting, and more.",
    "",
    "DELEGATION RULES:",
    "- Speed/feed questions → delegate to speed-feed-expert",
    "- Feasibility/DfM → delegate to feasibility-checker",
    "- G-code simulation → delegate to cnc-simulator",
    "- CAM strategy → delegate to cam-strategist",
    "- Quoting/costing → delegate to quote-estimator",
    "- Multi-domain questions → coordinate multiple specialists",
    "",
    "SAFETY:",
    "- Never exceed machine power/torque limits",
    "- Always validate speed/feed against stability lobes",
    "- Flag any potential collision or crash risk",
    "- Include confidence intervals on predictions",
  ].join("\n"),

  mcpServers: {
    prism: {
      command: "node",
      args: ["dist/index.js"],
      cwd: process.env.PRISM_MCP_PATH
        ?? process.cwd(),
      env: {
        TRANSPORT: "stdio",
        LOG_LEVEL: "warn",
      },
    },
  },

  agents: PRISM_SUBAGENTS,

  allowedTools: [
    "mcp__prism__*",
    "Read",
    "Grep",
    "Agent",
  ],

  maxTurns: 50,
  maxBudgetUsd: 5.0,
  effort: "high" as const,

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
        model: "haiku",
      }],
    }],
  },
};

/**
 * Lightweight config for quick calculations (no subagents).
 */
export const PRISM_QUICK_CONFIG = {
  model: "claude-haiku-4-5",
  systemPrompt:
    "You are PRISM quick-calc mode. Use prism_calc for fast " +
    "manufacturing calculations. Be concise.",
  mcpServers: {
    prism: PRISM_AGENT_CONFIG.mcpServers.prism,
  },
  allowedTools: [
    "mcp__prism__prism_calc",
    "mcp__prism__prism_data",
  ],
  maxTurns: 10,
  maxBudgetUsd: 0.50,
  effort: "low" as const,
};

/**
 * Config for batch processing (headless, structured output).
 */
export const PRISM_BATCH_CONFIG = {
  model: "claude-sonnet-4-6",
  systemPrompt:
    "You are PRISM batch processor. Execute manufacturing " +
    "calculations and return structured JSON results. " +
    "No explanations needed — data only.",
  mcpServers: {
    prism: PRISM_AGENT_CONFIG.mcpServers.prism,
  },
  allowedTools: ["mcp__prism__*"],
  maxTurns: 30,
  maxBudgetUsd: 2.0,
  effort: "medium" as const,
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
