/**
 * AI Dispatcher -- DEPRECATED / DEAD CODE. Do NOT re-wire (boot-crash foot-gun).
 *
 * This stub registers the MCP tool name "prism_ai" with 3 placeholder actions
 * (route_task / classify_complexity / should_escalate, all inline non-engine logic).
 * It is SUPERSEDED by registerAIReasoningDispatcher (aiReasoningDispatcher.ts) -- the
 * canonical owner of "prism_ai" with ~977 real, engine-backed actions.
 *
 * registerAIDispatcher() has ZERO call sites: it was removed from the boot path on
 * 2026-06-13 (MCP-BOOT-FIX, index.ts:102-103 + :714-715) because registering "prism_ai"
 * twice HARD-THROWS "Tool prism_ai is already registered" under the stricter MCP SDK and
 * crashed boot fleet-wide. See memory reference_mcp_boot_crash_duplicate_prism_ai_2026_06_13.
 *
 * Kept disabled-not-deleted (asset-preservation). NEVER call registerAIDispatcher() -- it
 * would re-introduce the duplicate-registration boot crash. For model routing, use the live
 * AISystemRouterEngine.route(); for pre-action reasoning, prism_ai:reason_before_action.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerAIDispatcher(server: McpServer): void {
  (server as any).tool(
    "prism_ai",
    "AI model routing and task delegation. Actions: route_task, classify_complexity, should_escalate",
    {
      action: z.enum(["route_task", "classify_complexity", "should_escalate"]),
      prompt: z.string().optional(),
      token_estimate: z.number().optional(),
      hardware_profile: z.string().optional(),
      local_confidence: z.number().optional(),
      task_complexity: z.string().optional()
    },
    async ({ action, prompt, token_estimate = 0, hardware_profile = "workstation-max", local_confidence = 0.7, task_complexity = "moderate" }: {
      action: "route_task" | "classify_complexity" | "should_escalate";
      prompt?: string;
      token_estimate?: number;
      hardware_profile?: string;
      local_confidence?: number;
      task_complexity?: string;
    }) => {
      
      if (action === "route_task") {
        // This would normally import and call the Python ModelRouterEngine
        // For now, return a structured decision
        const isComplex = (prompt?.length || 0) > 3000 || token_estimate > 12000 || 
                         ["architectural", "safety_critical"].includes(task_complexity);
        
        if (isComplex) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                recommended_tier: "claude",
                model: "claude-fable-5",
                reason: "Task complexity requires high reliability",
                confidence: 0.9,
                fallback: "local_heavy"
              })
            }]
          };
        }
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              recommended_tier: hardware_profile === "workstation-max" ? "local_heavy" : "local_medium",
              model: hardware_profile === "workstation-max" ? "gpt-oss:120b" : "qwen3-coder:32b",
              reason: "Local model sufficient for task complexity",
              confidence: 0.8,
              fallback: "claude"
            })
          }]
        };
      }
      
      if (action === "classify_complexity") {
        return {
          content: [{
            type: "text",
            text: task_complexity
          }]
        };
      }
      
      if (action === "should_escalate") {
        const shouldEscalate = task_complexity === "safety_critical" || 
                              task_complexity === "architectural" || 
                              local_confidence < 0.6;
        return {
          content: [{
            type: "text",
            text: shouldEscalate.toString()
          }]
        };
      }
      
      return {
        content: [{
          type: "text",
          text: "Unknown action"
        }]
      };
    }
  );
}
