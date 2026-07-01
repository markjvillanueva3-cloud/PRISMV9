/**
 * MCP Tool Registration Wrapper with Output Schema Support
 *
 * Provides a drop-in helper that existing dispatchers can adopt incrementally
 * to add `outputSchema` to their tool registrations. Uses the new
 * `server.registerTool()` API which supports outputSchema natively.
 *
 * Migration path for dispatchers:
 * 1. Import `registerToolWithOutput` or `wrapWithOutputSchema`
 * 2. Replace `server.tool(name, desc, schema, handler)` with the helper
 * 3. The helper auto-injects outputSchema and wraps returns
 *
 * @module mcp/registerToolWithOutput
 */

import { z } from "zod";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getOutputSchema, hasOutputSchema } from "./outputSchemas.js";
import { DISPATCHER_ANNOTATIONS } from "./toolAnnotations.js";

/** Shape accepted by server.registerTool inputSchema */
type ZodRawShape = Record<string, z.ZodTypeAny>;

/** Minimal MCP tool handler signature */
type ToolHandler = (args: Record<string, unknown>, extra: Record<string, unknown>) => Promise<unknown>;

/** MCP server interface supporting both legacy tool() and newer registerTool() */
interface McpServerLike {
  tool?(name: string, description: string, inputSchema: ZodRawShape, handler: ToolHandler): void;
  registerTool?(name: string, config: Record<string, unknown>, handler: ToolHandler): void;
}

/** MCP tool result shape */
interface ToolResult {
  content?: Array<{ type: string; text: string }>;
  structuredContent?: Record<string, unknown>;
}

/**
 * Registers a dispatcher tool using registerTool() with outputSchema.
 *
 * This is the recommended way to register new dispatchers or migrate
 * existing ones. It:
 * - Uses `server.registerTool()` (non-deprecated API)
 * - Injects per-action outputSchema via the action param
 * - Preserves existing annotations from toolAnnotations.ts
 * - Falls back gracefully when no output schema is registered
 *
 * @param server - MCP Server instance
 * @param toolName - Tool name (e.g., "prism_calc")
 * @param description - Tool description
 * @param inputSchema - Zod raw shape for input params
 * @param handler - Async handler function
 * @param options - Additional registration options
 */
export function registerToolWithOutput(
  server: McpServerLike,
  toolName: string,
  description: string,
  inputSchema: ZodRawShape,
  handler: ToolHandler,
  options?: {
    annotations?: ToolAnnotations;
    title?: string;
    outputSchemaAction?: string;
  },
): void {
  const annotations = options?.annotations
    ?? DISPATCHER_ANNOTATIONS[toolName] as ToolAnnotations | undefined;

  // Build config for registerTool
  const config: Record<string, unknown> = {
    description,
    inputSchema,
  };

  if (annotations) {
    config.annotations = annotations;
  }

  if (options?.title) {
    config.title = options.title;
  }

  // If a specific action is known at registration time, add its output schema.
  // For dispatchers with dynamic actions, use getDispatcherOutputSchema() at
  // the dispatcher level instead.
  if (options?.outputSchemaAction
    && hasOutputSchema(options.outputSchemaAction)) {
    const jsonSchema = getOutputSchema(options.outputSchemaAction);
    config.outputSchema = jsonSchema;
  }

  // Use registerTool if available, fall back to tool() for older SDK versions
  if (server.registerTool) {
    server.registerTool(toolName, config, handler);
  } else if (server.tool) {
    // Fallback: use deprecated server.tool() which ignores outputSchema
    server.tool(toolName, description, inputSchema, handler);
  }
}

/**
 * Wraps a dispatcher handler to include structuredContent when outputSchema
 * is defined for the action. This enables incremental adoption: existing
 * dispatchers can wrap their handler without changing return logic.
 *
 * The wrapper:
 * 1. Calls the original handler
 * 2. If the action has an output schema, adds `structuredContent` alongside
 *    the existing `content` array (backwards compatible)
 * 3. Returns the result unchanged if no output schema exists
 *
 * @param handler - Original dispatcher handler
 * @returns Wrapped handler that injects structuredContent
 */
export function wrapWithOutputSchema(
  handler: ToolHandler,
): ToolHandler {
  return async (args, extra) => {
    const result = await handler(args, extra) as ToolResult | undefined;

    // Extract action name from args
    const action = args?.action as string | undefined;
    if (!action || !hasOutputSchema(action)) {
      return result;
    }

    // If the result already has structuredContent, don't override
    if (result?.structuredContent) {
      return result;
    }

    // Extract the JSON data from the content text response
    if (result?.content?.[0]?.type === "text") {
      try {
        const parsed = JSON.parse(result.content[0].text) as Record<string, unknown>;
        return {
          ...result,
          structuredContent: parsed,
        };
      } catch {
        // If JSON parse fails, return original result
        return result;
      }
    }

    return result;
  };
}

/**
 * Returns the JSON Schema for a dispatcher's combined output.
 *
 * Since PRISM dispatchers are action-multiplexed (one tool, many actions),
 * this returns a union-compatible schema that covers the superset of all
 * action outputs for that dispatcher. For per-action schemas, use
 * `getOutputSchema(actionName)` directly.
 *
 * @param dispatcherName - e.g., "prism_calc"
 * @returns JSON Schema object or undefined if no schemas exist
 */
export function getDispatcherOutputSchema(
  dispatcherName: string,
): Record<string, unknown> | undefined {
  // For multiplexed dispatchers, we use a permissive object schema
  // since different actions return different shapes. The per-action
  // schemas are available via getOutputSchema() for clients that
  // want action-specific validation.
  const dispatcherActionMap: Record<string, string[]> = {
    prism_calc: [
      "speed_feed", "cutting_force", "tool_life",
      "surface_finish", "power",
    ],
    prism_cam: [
      "toolpath_generate", "cam_strategy_recommend", "post_process",
    ],
    prism_safety: ["safety_check", "gcode_safety"],
    prism_business: ["quote_estimate", "costing_job_cost"],
    prism_quality: ["spc_analyze", "gage_rr"],
  };

  const actions = dispatcherActionMap[dispatcherName];
  if (!actions || actions.length === 0) return undefined;

  // Return a permissive object schema with description listing
  // the specific action schemas available
  return {
    type: "object",
    description:
      `Output from ${dispatcherName}. Shape varies by action. `
      + `Specific schemas available for: ${actions.join(", ")}. `
      + `Use getOutputSchema(actionName) for per-action validation.`,
    additionalProperties: true,
  };
}
