/**
 * PRISM AutoPilot V2 MCP Tools
 * Registry-aware orchestration with task classification
 * 
 * Session 21: Optimized for actual working MCP tools
 * Session 24: Fixed to use Zod schemas (matching gsdTools pattern)
 */

import { z } from "zod";
import { AutoPilotV2, runAutoPilotV2, getWorkingTools } from "../orchestration/AutoPilotV2.js";
import { log } from "../utils/Logger.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registryManager } from "../registries/index.js";

// ============================================================================
// REGISTRATION (Zod Schema Pattern - matches gsdTools.ts)
// ============================================================================

export function registerAutoPilotToolsV2(server: McpServer): void {
  log.info("Registering AutoPilot V2 tools...");

  /**
   * prism_autopilot_v2 - Registry-aware task execution
   */
  server.tool(
    "prism_autopilot_v2",
    `🚀 AutoPilot V2 - Registry-aware task execution.

FEATURES:
- Task classification (calculation/data/code/analysis/orchestration)
- Automatic tool selection based on task type
- Registry-aware execution (uses actual data counts)
- Token-efficient compact output

WORKING TOOLS IT SELECTS:
- Calculations: calc_cutting_force/tool_life/mrr/power/etc
- Data: alarm_search (10,033), skill_list (158), agent_list (75)
- Session: gsd_core, sp_brainstorm, cognitive_check
- Documents: doc_list/read/write, roadmap_status, action_tracker
- Dev Workflow: build, code_search, file_read/write

Returns: Execution plan + metrics Ω(x)`,
    {
      task: z.string().describe("Task to execute"),
      format: z.enum(["compact", "detailed"]).default("compact").describe("Output format")
    },
    async ({ task, format }) => {
      try {
        // DEBUG: Log received parameters
        log.debug(`prism_autopilot_v2 called with: task="${task}" (type: ${typeof task}), format="${format}"`);
        
        // Validate task
        if (!task || task.trim() === '') {
          return {
            content: [{
              type: "text" as const,
              text: `❌ [V2-BUILD-2026-02-04-02:02] Error: Task parameter is required and must be a non-empty string.\n\nReceived: task="${task}" (type: ${typeof task}), format="${format}"\n\nUsage: prism_autopilot_v2 { "task": "your task description" }`
            }]
          };
        }

        const result = await runAutoPilotV2(task);
        
        const output = format === "compact" 
          ? AutoPilotV2.formatCompact(result)
          : AutoPilotV2.formatDetailed(result);

        return {
          content: [{ type: "text" as const, text: output }]
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log.error(`AutoPilot V2 error: ${errorMsg}`);
        return {
          content: [{ type: "text" as const, text: `Error: ${errorMsg}` }],
          isError: true
        };
      }
    }
  );

  /**
   * prism_registry_status - Get current registry status
   */
  server.tool(
    "prism_registry_status",
    `📊 Get current registry status.

Shows actual loaded counts:
- Alarms: 10,033+ 
- Materials: 2,805
- Agents: 75
- Skills: 158
- Hooks: 25
- Formulas: 515
- Scripts: 326

Use to verify MCP server is working.`,
    {},
    async () => {
      try {
        await registryManager.initialize();
        
        const registries = registryManager.listRegistries();
        
        let output = `## 📊 Registry Status\n\n`;
        output += `| Registry | Count | Loaded | Category |\n`;
        output += `|----------|-------|--------|----------|\n`;
        
        for (const r of registries) {
          const status = r.loaded ? "✅" : "❌";
          output += `| ${r.name} | ${r.size} | ${status} | ${r.category} |\n`;
        }
        
        output += `\n**Total Entries:** ${registryManager.getTotalEntries()}\n`;
        output += `**Initialized:** ${registryManager.isInitialized() ? "✅ Yes" : "❌ No"}\n`;
        
        return {
          content: [{ type: "text" as const, text: output }]
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Error: ${errorMsg}` }],
          isError: true
        };
      }
    }
  );

  /**
   * prism_working_tools - List all working MCP tools by category
   */
  server.tool(
    "prism_working_tools",
    `🔧 List all working MCP tools by category.

Categories:
- calculations: 8 physics tools (Kienzle, Taylor, etc)
- data: alarm/material/agent/skill/hook access
- session: gsd, todo, cognitive, resume, session_boot
- orchestration: autopilot, brainstorm, ralph
- safety: collision, spindle, breakage, coolant
- documents: doc_list/read/write/append, roadmap_status, action_tracker
- dev_workflow: build, code_template, code_search, file_read/write`,
    {
      category: z.enum(["all", "calculations", "data", "session", "orchestration", "safety", "documents", "hooks", "knowledge", "validation", "toolpath", "context", "knowledge_engine"])
        .default("all")
        .describe("Filter by category")
    },
    async ({ category }) => {
      const tools = getWorkingTools();
      
      let output = `## 🔧 Working MCP Tools\n\n`;
      
      const categories = category === "all" 
        ? Object.keys(tools) 
        : [category];
      
      for (const cat of categories) {
        const catTools = (tools as any)[cat];
        if (catTools) {
          output += `### ${cat.charAt(0).toUpperCase() + cat.slice(1)}\n`;
          for (const tool of catTools) {
            output += `- \`${tool}\`\n`;
          }
          output += `\n`;
        }
      }
      
      return {
        content: [{ type: "text" as const, text: output }]
      };
    }
  );

  log.info("Registered 3 AutoPilot V2 tools");
}

// Legacy exports for compatibility
export const autoPilotV2ToolDefinitions = [
  { name: "prism_autopilot_v2" },
  { name: "prism_registry_status" },
  { name: "prism_working_tools" }
];

export async function handleAutoPilotV2Tools(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  // Legacy handler - not used with new Zod registration
  return `Tool ${toolName} should use direct registration`;
}
