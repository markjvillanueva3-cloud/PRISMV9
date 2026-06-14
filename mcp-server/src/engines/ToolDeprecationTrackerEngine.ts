/**
 * ToolDeprecationTrackerEngine — HMPI06 tool/action deprecation lifecycle.
 *
 * Pure-core state machine: each tool has a deprecation state (active /
 * deprecated / sunset) + scheduled sunset_at.  The engine computes per-tool
 * verdict (allow / warn / block) against current date, and emits an
 * operator dashboard of deprecation health.
 *
 * @module engines/ToolDeprecationTrackerEngine
 */

import { z } from "zod";

export const DeprecationStateSchema = z.enum(["active", "deprecated", "sunset"]);
export type DeprecationState = z.infer<typeof DeprecationStateSchema>;

export const ToolLifecycleSchema = z.object({
  tool_id: z.string().min(1).max(120),
  state: DeprecationStateSchema,
  deprecated_at: z.string().optional(),
  sunset_at: z.string().optional(),
  replacement_tool_id: z.string().max(120).optional(),
  reason: z.string().max(500).optional(),
});
export type ToolLifecycle = z.infer<typeof ToolLifecycleSchema>;

export interface UseVerdict {
  tool_id: string;
  verdict: "allow" | "warn" | "block";
  message: string;
  replacement_tool_id?: string;
}

export class ToolDeprecationTrackerEngine {
  static validate(t: unknown): ToolLifecycle { return ToolLifecycleSchema.parse(t); }

  /** Decide whether a tool call is allowed at `now_at`. */
  static decide(tool: ToolLifecycle, now_at: string): UseVerdict {
    ToolLifecycleSchema.parse(tool);
    if (tool.state === "active") {
      return { tool_id: tool.tool_id, verdict: "allow", message: "active" };
    }
    if (tool.state === "sunset") {
      return {
        tool_id: tool.tool_id, verdict: "block",
        message: `sunset: ${tool.reason ?? "no longer supported"}`,
        replacement_tool_id: tool.replacement_tool_id,
      };
    }
    // deprecated: warn if sunset_at in future, block if in past.
    if (tool.sunset_at) {
      const nowMs = Date.parse(now_at);
      const sunsetMs = Date.parse(tool.sunset_at);
      if (sunsetMs <= nowMs) {
        return {
          tool_id: tool.tool_id, verdict: "block",
          message: `deprecated past sunset (${tool.sunset_at})`,
          replacement_tool_id: tool.replacement_tool_id,
        };
      }
    }
    return {
      tool_id: tool.tool_id, verdict: "warn",
      message: `deprecated${tool.sunset_at ? ` until ${tool.sunset_at}` : ""}${tool.replacement_tool_id ? `, use ${tool.replacement_tool_id}` : ""}`,
      replacement_tool_id: tool.replacement_tool_id,
    };
  }

  /** Aggregate a fleet of tools for the operator dashboard. */
  static aggregate(tools: readonly ToolLifecycle[]): {
    active_count: number;
    deprecated_count: number;
    sunset_count: number;
    sunsetting_soon: ToolLifecycle[];
  } {
    return {
      active_count: tools.filter((t) => t.state === "active").length,
      deprecated_count: tools.filter((t) => t.state === "deprecated").length,
      sunset_count: tools.filter((t) => t.state === "sunset").length,
      sunsetting_soon: tools.filter((t) => t.state === "deprecated" && t.sunset_at !== undefined),
    };
  }

  static renderVerdict(v: UseVerdict): string {
    return `[TOOL ${v.verdict.toUpperCase()}] ${v.tool_id}: ${v.message}${v.replacement_tool_id ? ` (→ ${v.replacement_tool_id})` : ""}`;
  }
}

export const toolDeprecationTrackerEngine = ToolDeprecationTrackerEngine;
