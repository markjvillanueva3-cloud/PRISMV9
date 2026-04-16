/**
 * MCP Sampling with Tools for PRISM
 *
 * Extends MCP sampling with shared PRISM runtime profiles so the
 * same deep-learning / deep-reasoning manufacturing stack can
 * bias toward Claude-side or Codex/GPT-class reasoning clients.
 */

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  resolvePrismRuntimeProfile,
  type PrismReasoningDepth,
  type PrismRuntimeProfileId,
} from "../config/reasoningProfiles.js";
import { log } from "../utils/Logger.js";

let serverInstance: Server | null = null;

export interface SamplingTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type SamplingProviderPreference = "auto" | "anthropic" | "openai";

export const SAMPLING_TOOL_SETS = {
  materialResolve: [
    {
      name: "material_search",
      description:
        "Search materials by name, ISO group, or properties. " +
        "Returns matching materials with Kienzle/Taylor params.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search term",
          },
          iso_group: {
            type: "string",
            description: "ISO material group (P/M/K/N/S/H)",
          },
        },
        required: ["query"],
      },
    },
  ],
  speedFeedValidate: [
    {
      name: "sf_quick",
      description:
        "Quick speed/feed calculation for validation. " +
        "Returns RPM, feed, force, tool life.",
      inputSchema: {
        type: "object",
        properties: {
          material: { type: "string" },
          tool_diameter_mm: { type: "number" },
          operation: { type: "string" },
        },
        required: ["material", "tool_diameter_mm"],
      },
    },
    {
      name: "playbook_query",
      description:
        "Query machining playbook for best practices. " +
        "Returns rules with physics-backed thresholds.",
      inputSchema: {
        type: "object",
        properties: {
          operation: { type: "string" },
          material: { type: "string" },
        },
        required: ["operation"],
      },
    },
  ],
  machineSelect: [
    {
      name: "machine_search",
      description:
        "Search machines by manufacturer, type, or capabilities.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          manufacturer: { type: "string" },
          type: { type: "string" },
        },
        required: ["query"],
      },
    },
    {
      name: "machine_capabilities",
      description:
        "Get machine capabilities (axes, power, rpm range).",
      inputSchema: {
        type: "object",
        properties: {
          machine_id: { type: "string" },
        },
        required: ["machine_id"],
      },
    },
  ],
} as const;

export function initSampling(server: Server): void {
  serverInstance = server;
}

function buildReasoningPromptSuffix(
  profileLabel: string,
  reasoningDepth: PrismReasoningDepth,
) {
  const depthInstruction =
    reasoningDepth === "agentic"
      ? "Use multi-hypothesis reasoning, reconcile competing tool outputs, and synthesize one operator-safe conclusion."
      : reasoningDepth === "deep"
        ? "Use deliberate step-by-step reasoning and keep the decision grounded in manufacturing constraints."
        : reasoningDepth === "balanced"
          ? "Balance speed and rigor while preserving manufacturing correctness."
          : "Keep the response fast and tightly scoped.";

  return [
    "",
    `Runtime posture: ${profileLabel}.`,
    "PRISM expectation:",
    "- Stay grounded in PRISM manufacturing tools and deep-learning priors.",
    "- Prefer explicit trade-offs over vague summaries.",
    `- ${depthInstruction}`,
  ].join("\n");
}

function getPriorityPreset(reasoningDepth: PrismReasoningDepth) {
  switch (reasoningDepth) {
    case "quick":
      return { costPriority: 0.55, speedPriority: 0.85, intelligencePriority: 0.45 };
    case "balanced":
      return { costPriority: 0.3, speedPriority: 0.55, intelligencePriority: 0.75 };
    case "deep":
      return { costPriority: 0.2, speedPriority: 0.25, intelligencePriority: 0.95 };
    case "agentic":
      return { costPriority: 0.15, speedPriority: 0.2, intelligencePriority: 0.99 };
    default:
      return { costPriority: 0.3, speedPriority: 0.5, intelligencePriority: 0.7 };
  }
}

function dedupeHints(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export async function requestSampling(
  systemPrompt: string,
  userMessage: string,
  tools: SamplingTool[],
  options?: {
    maxTokens?: number;
    modelHint?: string;
    runtimeProfileId?: PrismRuntimeProfileId;
    providerPreference?: SamplingProviderPreference;
    reasoningDepth?: PrismReasoningDepth;
    costPriority?: number;
    speedPriority?: number;
    intelligencePriority?: number;
  }
): Promise<{
  text: string;
  model: string;
  toolCalls: number;
  runtimeProfileId: PrismRuntimeProfileId;
  provider: string;
  reasoningDepth: PrismReasoningDepth;
}> {
  if (!serverInstance) {
    return {
      text: "Sampling not available - server not initialized",
      model: "none",
      toolCalls: 0,
      runtimeProfileId: options?.runtimeProfileId ?? "hybrid-auto",
      provider: options?.providerPreference ?? "auto",
      reasoningDepth: options?.reasoningDepth ?? "balanced",
    };
  }

  const profile = resolvePrismRuntimeProfile({
    profileId: options?.runtimeProfileId,
    providerPreference:
      options?.providerPreference === "auto"
        ? undefined
        : options?.providerPreference,
  });
  const reasoningDepth = options?.reasoningDepth ?? profile.reasoningDepth;
  const priorities = getPriorityPreset(reasoningDepth);
  const modelHints = dedupeHints([
    options?.modelHint,
    ...profile.samplingHints,
  ]);

  try {
    const result = await serverInstance.createMessage({
      messages: [
        {
          role: "user",
          content: { type: "text", text: userMessage },
        },
      ],
      systemPrompt:
        `${systemPrompt}${buildReasoningPromptSuffix(profile.label, reasoningDepth)}`,
      maxTokens: options?.maxTokens ?? 1024,
      modelPreferences: {
        hints: modelHints.length > 0
          ? modelHints.map((name) => ({ name }))
          : undefined,
        costPriority: options?.costPriority ?? priorities.costPriority,
        speedPriority: options?.speedPriority ?? priorities.speedPriority,
        intelligencePriority:
          options?.intelligencePriority ?? priorities.intelligencePriority,
      },
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })) as Parameters<typeof serverInstance.createMessage>[0]["tools"],
    });

    let text = "";
    const payload = result as Record<string, unknown> | null;
    if (payload) {
      const content = payload.content as
        | { type: string; text: string }
        | string
        | undefined;
      if (content && typeof content === "object" && content.type === "text") {
        text = content.text;
      } else if (typeof content === "string") {
        text = content;
      } else if (typeof payload.text === "string") {
        text = payload.text;
      }
    }

    return {
      text,
      model: (payload as Record<string, unknown> | null)?.model as string ?? "unknown",
      toolCalls: 0,
      runtimeProfileId: profile.id,
      provider: profile.executionProvider,
      reasoningDepth,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn(`[Sampling] Request failed: ${message}`);
    return {
      text: `Sampling failed: ${message}`,
      model: "none",
      toolCalls: 0,
      runtimeProfileId: profile.id,
      provider: profile.executionProvider,
      reasoningDepth,
    };
  }
}

export async function resolveMaterial(
  ambiguousName: string
): Promise<{
  resolved: string;
  confidence: string;
  reasoning: string;
}> {
  const result = await requestSampling(
    "You are a materials expert. Identify the exact " +
    "material specification from an ambiguous name. " +
    "Use the material_search tool to find candidates. " +
    "Return the best match with confidence level.",
    `Resolve this material: "${ambiguousName}"`,
    [...SAMPLING_TOOL_SETS.materialResolve],
    {
      maxTokens: 512,
      runtimeProfileId: "hybrid-auto",
      reasoningDepth: "deep",
    },
  );

  return {
    resolved: result.text,
    confidence: result.reasoningDepth === "deep" ? "high" : "medium",
    reasoning: result.text,
  };
}

export async function selectMachine(
  operation: string,
  material: string,
  requirements: string
): Promise<{
  recommendation: string;
  reasoning: string;
}> {
  const result = await requestSampling(
    "You are a CNC machine selection expert. Given an " +
    "operation, material, and requirements, use the " +
    "machine tools to find and recommend the best machine. " +
    "Consider power, rigidity, axes, and work envelope.",
    `Select machine for: ${operation} on ${material}. ` +
    `Requirements: ${requirements}`,
    [...SAMPLING_TOOL_SETS.machineSelect],
    {
      maxTokens: 1024,
      runtimeProfileId: "hybrid-auto",
      reasoningDepth: "agentic",
    },
  );

  return {
    recommendation: result.text,
    reasoning: result.text,
  };
}
