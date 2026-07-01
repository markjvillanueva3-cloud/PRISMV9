/**
 * MCP Sampling with Tools for PRISM
 *
 * Enables server-side autonomous manufacturing workflows by
 * requesting LLM completions from the client with PRISM tools
 * available. The server orchestrates multi-step analysis:
 *
 * Example flow:
 * 1. Client calls prism_calc sf_orchestrate
 * 2. Server detects ambiguous material → requests sampling
 * 3. LLM reasons about material selection using PRISM tools
 * 4. Server receives LLM's tool calls, executes them
 * 5. Returns final result
 *
 * Use cases:
 * - Autonomous CNC program generation (tool→material→strategy→post)
 * - Multi-step feasibility with automatic constraint resolution
 * - Self-correcting speed/feed with iterative validation
 *
 * @see MCP spec 2025-11-25 sampling/createMessage with tools
 */

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { log } from "../utils/Logger.js";

let serverInstance: Server | null = null;

/**
 * Initialize sampling with the low-level Server instance.
 */
export function initSampling(server: Server): void {
  serverInstance = server;
}

/**
 * Tool definition for sampling requests.
 * Only expose a focused subset of PRISM tools to the LLM
 * during sampling to avoid overwhelming it.
 */
export interface SamplingTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * Pre-built tool sets for common sampling scenarios.
 */
export const SAMPLING_TOOL_SETS = {
  /** Material identification tools */
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

  /** Speed/feed validation tools */
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

  /** Machine selection tools */
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

/**
 * Request an LLM completion from the client with PRISM tools.
 *
 * The client's LLM will reason about the problem and may call
 * the provided tools. Tool results are returned to the LLM
 * for further reasoning until it reaches a conclusion.
 *
 * @param systemPrompt - Instructions for the LLM
 * @param userMessage - The question/task for the LLM
 * @param tools - PRISM tools available to the LLM
 * @param options - Max tokens, model preferences
 * @returns LLM's final response text
 */
export async function requestSampling(
  systemPrompt: string,
  userMessage: string,
  tools: SamplingTool[],
  options?: {
    maxTokens?: number;
    modelHint?: string;
    costPriority?: number;
    speedPriority?: number;
    intelligencePriority?: number;
  }
): Promise<{
  text: string;
  model: string;
  toolCalls: number;
}> {
  if (!serverInstance) {
    return {
      text: "Sampling not available — server not initialized",
      model: "none",
      toolCalls: 0,
    };
  }

  try {
    const result = await serverInstance.createMessage({
      messages: [
        {
          role: "user",
          content: { type: "text", text: userMessage },
        },
      ],
      systemPrompt,
      maxTokens: options?.maxTokens ?? 1024,
      modelPreferences: {
        hints: options?.modelHint
          ? [{ name: options.modelHint }]
          : undefined,
        costPriority: options?.costPriority ?? 0.3,
        speedPriority: options?.speedPriority ?? 0.5,
        intelligencePriority:
          options?.intelligencePriority ?? 0.7,
      },
      // SDK boundary: tool schemas are user-defined JSON objects
      // that match the SDK's Tool shape at runtime
      tools: tools.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })) as Parameters<typeof serverInstance.createMessage>[0]["tools"],
    });

    // Extract text from result
    let text = "";
    const r = result as Record<string, unknown> | null;
    if (r) {
      const content = r.content as
        | { type: string; text: string }
        | string
        | undefined;
      if (content && typeof content === "object" && content.type === "text") {
        text = content.text;
      } else if (typeof content === "string") {
        text = content;
      } else if (typeof r.text === "string") {
        text = r.text;
      }
    }

    return {
      text,
      model: (r as Record<string, unknown> | null)?.model as string ?? "unknown",
      toolCalls: 0, // Tool calls handled by client
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn(
      `[Sampling] Request failed: ${message}`
    );
    return {
      text: `Sampling failed: ${message}`,
      model: "none",
      toolCalls: 0,
    };
  }
}

/**
 * High-level: Ask the LLM to resolve an ambiguous material.
 * Uses material search tools during sampling.
 */
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
    { maxTokens: 512, speedPriority: 0.8 }
  );

  return {
    resolved: result.text,
    confidence: "medium",
    reasoning: result.text,
  };
}

/**
 * High-level: Ask the LLM to select the best machine
 * for a given operation.
 */
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
    { maxTokens: 1024, intelligencePriority: 0.9 }
  );

  return {
    recommendation: result.text,
    reasoning: result.text,
  };
}
