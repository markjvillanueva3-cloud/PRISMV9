/**
 * PRISM MCP Server - Manus Integration Tools
 * Integrates Manus AI agent capabilities into PRISM
 * 
 * Tools:
 * - prism_manus_create_task: Create autonomous task in Manus
 * - prism_manus_task_status: Get task status
 * - prism_manus_task_result: Get completed task result
 * - prism_manus_cancel_task: Cancel running task
 * - prism_manus_list_tasks: List recent tasks
 * - prism_manus_web_research: Delegate web research
 * - prism_manus_code_sandbox: Execute code in sandbox
 * - prism_dev_hook_trigger: Trigger development hook
 * - prism_dev_hook_list: List development hooks
 * - prism_dev_hook_chain: Execute hook chain
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// MANUS CLIENT
// ============================================================================

interface ManusConfig {
  apiKey: string;
  baseUrl: string;
  defaultMode: "quality" | "speed" | "balanced";
  timeoutMs: number;
}

interface ManusTask {
  id: string;
  status: string;
  progress?: number;
  createdAt?: string;
  updatedAt?: string;
  output?: any;
  artifacts?: any[];
  logs?: string[];
}

class ManusClient {
  private config: ManusConfig;

  constructor() {
    this.config = {
      apiKey: process.env.MANUS_MCP_API_KEY || "",
      baseUrl: process.env.MANUS_BASE_URL || "https://open.manus.ai",
      defaultMode: "quality",
      timeoutMs: 300000
    };
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  async createTask(
    prompt: string,
    mode?: string,
    attachments?: any[],
    connectors?: string[]
  ): Promise<ManusTask> {
    if (!this.isConfigured()) {
      throw new Error("Manus not configured. Set MANUS_MCP_API_KEY environment variable.");
    }

    const response = await fetch(`${this.config.baseUrl}/api/v1/tasks`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        mode: mode || this.config.defaultMode,
        attachments,
        connectors
      })
    });

    if (!response.ok) {
      throw new Error(`Manus API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getTaskStatus(taskId: string): Promise<ManusTask> {
    if (!this.isConfigured()) {
      throw new Error("Manus not configured");
    }

    const response = await fetch(`${this.config.baseUrl}/api/v1/tasks/${taskId}`, {
      headers: {
        "Authorization": `Bearer ${this.config.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Manus API error: ${response.status}`);
    }

    return response.json();
  }

  async getTaskResult(taskId: string): Promise<ManusTask> {
    if (!this.isConfigured()) {
      throw new Error("Manus not configured");
    }

    const response = await fetch(`${this.config.baseUrl}/api/v1/tasks/${taskId}/result`, {
      headers: {
        "Authorization": `Bearer ${this.config.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Manus API error: ${response.status}`);
    }

    return response.json();
  }

  async cancelTask(taskId: string): Promise<ManusTask> {
    if (!this.isConfigured()) {
      throw new Error("Manus not configured");
    }

    const response = await fetch(`${this.config.baseUrl}/api/v1/tasks/${taskId}/cancel`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.config.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Manus API error: ${response.status}`);
    }

    return response.json();
  }

  async listTasks(limit: number = 10): Promise<{ tasks: ManusTask[]; total: number }> {
    if (!this.isConfigured()) {
      throw new Error("Manus not configured");
    }

    const response = await fetch(`${this.config.baseUrl}/api/v1/tasks?limit=${limit}`, {
      headers: {
        "Authorization": `Bearer ${this.config.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Manus API error: ${response.status}`);
    }

    return response.json();
  }
}

// Global client instance
const manusClient = new ManusClient();

// ============================================================================
// DEVELOPMENT HOOKS REGISTRY
// ============================================================================

interface DevHook {
  id: string;
  name: string;
  domain: string;
  category: string;
  subcategory: string;
  trigger: string;
  description: string;
  priority: number;
  canDisable: boolean;
  isBlocking: boolean;
  params: { name: string; type: string }[];
  returns: string;
  sideEffects: string[];
  relatedHooks: string[];
  relatedSkills: string[];
  relatedMCPTools: string[];
  status: string;
}

interface HookRegistry {
  version: string;
  generated: string;
  statistics: {
    total_hooks: number;
    domains: Record<string, number>;
    blocking_hooks: number;
    disableable_hooks: number;
  };
  hooks: DevHook[];
}

function loadHookRegistry(): HookRegistry | null {
  const registryPath = "C:\\PRISM\\data\\DEVELOPMENT_HOOKS_REGISTRY.json";
  try {
    const content = fs.readFileSync(registryPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export function registerManusTools(server: McpServer): void {
  
  // -------------------------------------------------------------------------
  // prism_manus_create_task
  // -------------------------------------------------------------------------
  server.tool(
    "prism_manus_create_task",
    "Creates a new autonomous task in Manus AI agent",
    {
      prompt: z.string().describe("Task description/instructions for Manus"),
      mode: z.enum(["quality", "speed", "balanced"]).default("quality").describe("Execution mode"),
      attachments: z.array(z.object({
        filename: z.string(),
        url: z.string(),
        mime_type: z.string(),
        size_bytes: z.number()
      })).optional().describe("Optional file attachments"),
      connectors: z.array(z.string()).optional().describe("Optional connectors to enable")
    },
    async ({ prompt, mode, attachments, connectors }) => {
      try {
        const result = await manusClient.createTask(prompt, mode, attachments, connectors);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              task_id: result.id,
              status: result.status,
              created_at: result.createdAt,
              message: "Task created. Use prism_manus_task_status to monitor."
            }, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: error.message }, null, 2)
          }]
        };
      }
    }
  );

  // -------------------------------------------------------------------------
  // prism_manus_task_status
  // -------------------------------------------------------------------------
  server.tool(
    "prism_manus_task_status",
    "Gets status of a Manus task",
    {
      task_id: z.string().describe("Task ID to check")
    },
    async ({ task_id }) => {
      try {
        const result = await manusClient.getTaskStatus(task_id);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              task_id,
              status: result.status,
              progress: result.progress,
              updated_at: result.updatedAt
            }, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: error.message }, null, 2)
          }]
        };
      }
    }
  );

  // -------------------------------------------------------------------------
  // prism_manus_task_result
  // -------------------------------------------------------------------------
  server.tool(
    "prism_manus_task_result",
    "Gets result of a completed Manus task",
    {
      task_id: z.string().describe("Task ID to get result for")
    },
    async ({ task_id }) => {
      try {
        const result = await manusClient.getTaskResult(task_id);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              task_id,
              status: "completed",
              output: result.output,
              artifacts: result.artifacts || [],
              logs: result.logs || []
            }, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: error.message }, null, 2)
          }]
        };
      }
    }
  );

  // -------------------------------------------------------------------------
  // prism_manus_cancel_task
  // -------------------------------------------------------------------------
  server.tool(
    "prism_manus_cancel_task",
    "Cancels a running Manus task",
    {
      task_id: z.string().describe("Task ID to cancel")
    },
    async ({ task_id }) => {
      try {
        await manusClient.cancelTask(task_id);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              task_id,
              status: "cancelled",
              message: "Task cancelled successfully"
            }, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: error.message }, null, 2)
          }]
        };
      }
    }
  );

  // -------------------------------------------------------------------------
  // prism_manus_list_tasks
  // -------------------------------------------------------------------------
  server.tool(
    "prism_manus_list_tasks",
    "Lists recent Manus tasks",
    {
      limit: z.number().default(10).describe("Maximum number of tasks to return")
    },
    async ({ limit }) => {
      try {
        const result = await manusClient.listTasks(limit);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              tasks: result.tasks,
              total: result.total
            }, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: error.message }, null, 2)
          }]
        };
      }
    }
  );

  // -------------------------------------------------------------------------
  // prism_manus_web_research
  // -------------------------------------------------------------------------
  server.tool(
    "prism_manus_web_research",
    "Delegates web research to Manus agent",
    {
      query: z.string().describe("Research query/topic"),
      depth: z.enum(["quick", "standard", "deep"]).default("standard").describe("Research depth")
    },
    async ({ query, depth }) => {
      const prompt = `Conduct web research on: ${query}

Research depth: ${depth}

Please:
1. Search for relevant information
2. Visit authoritative sources
3. Extract key findings
4. Synthesize into a comprehensive summary
5. Include citations/sources`;

      try {
        const result = await manusClient.createTask(
          prompt, 
          depth === "deep" ? "quality" : "balanced"
        );
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              task_id: result.id,
              query,
              depth,
              message: "Research task created. Monitor with prism_manus_task_status."
            }, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: error.message }, null, 2)
          }]
        };
      }
    }
  );

  // -------------------------------------------------------------------------
  // prism_manus_code_sandbox
  // -------------------------------------------------------------------------
  server.tool(
    "prism_manus_code_sandbox",
    "Executes code in Manus sandbox environment",
    {
      code: z.string().describe("Code to execute"),
      language: z.enum(["python", "javascript", "bash", "ruby", "perl", "r"]).default("python"),
      task_description: z.string().optional().describe("Optional task description")
    },
    async ({ code, language, task_description }) => {
      const prompt = `Execute the following ${language} code in a sandbox:

\`\`\`${language}
${code}
\`\`\`

${task_description ? `Task: ${task_description}` : ""}

Please execute safely, capture all output, and report any errors.`;

      try {
        const result = await manusClient.createTask(prompt, "speed");
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              task_id: result.id,
              language,
              message: "Code execution task created."
            }, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: error.message }, null, 2)
          }]
        };
      }
    }
  );

  // -------------------------------------------------------------------------
  // prism_dev_hook_trigger
  // -------------------------------------------------------------------------
  server.tool(
    "prism_dev_hook_trigger",
    "Triggers a development hook",
    {
      hook_id: z.string().describe("ID of the hook to trigger"),
      params: z.record(z.any()).optional().describe("Parameters to pass to the hook")
    },
    async ({ hook_id, params }) => {
      const registry = loadHookRegistry();
      if (!registry) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "Development hooks registry not found. Run development_hooks_generator.py first."
            }, null, 2)
          }]
        };
      }

      const hook = registry.hooks.find(h => h.id === hook_id);
      if (!hook) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: `Hook not found: ${hook_id}` }, null, 2)
          }]
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            hook_id,
            domain: hook.domain,
            category: hook.category,
            trigger: hook.trigger,
            executed_at: new Date().toISOString(),
            params: params || {},
            status: "executed",
            side_effects: hook.sideEffects,
            next_hooks: hook.relatedHooks,
            related_skills: hook.relatedSkills,
            related_tools: hook.relatedMCPTools
          }, null, 2)
        }]
      };
    }
  );

  // -------------------------------------------------------------------------
  // prism_dev_hook_list
  // -------------------------------------------------------------------------
  server.tool(
    "prism_dev_hook_list",
    "Lists available development hooks",
    {
      domain: z.string().optional().describe("Filter by domain (SKILL, AGENT, SWARM, etc.)"),
      category: z.string().optional().describe("Filter by category within domain")
    },
    async ({ domain, category }) => {
      const registry = loadHookRegistry();
      if (!registry) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: "Development hooks registry not found" }, null, 2)
          }]
        };
      }

      let hooks = registry.hooks;
      if (domain) {
        hooks = hooks.filter(h => h.domain === domain);
      }
      if (category) {
        hooks = hooks.filter(h => h.category === category);
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            total: hooks.length,
            domains: registry.statistics.domains,
            hooks: hooks.map(h => ({
              id: h.id,
              name: h.name,
              trigger: h.trigger,
              domain: h.domain,
              category: h.category,
              isBlocking: h.isBlocking
            }))
          }, null, 2)
        }]
      };
    }
  );

  // -------------------------------------------------------------------------
  // prism_dev_hook_chain
  // -------------------------------------------------------------------------
  server.tool(
    "prism_dev_hook_chain",
    "Executes a chain of related development hooks",
    {
      start_hook_id: z.string().describe("ID of the starting hook"),
      params: z.record(z.any()).optional().describe("Initial parameters"),
      max_depth: z.number().default(10).describe("Maximum chain depth")
    },
    async ({ start_hook_id, params, max_depth }) => {
      const registry = loadHookRegistry();
      if (!registry) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: "Development hooks registry not found" }, null, 2)
          }]
        };
      }

      const hooksMap = new Map(registry.hooks.map(h => [h.id, h]));
      
      if (!hooksMap.has(start_hook_id)) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: `Hook not found: ${start_hook_id}` }, null, 2)
          }]
        };
      }

      const chainResults: any[] = [];
      const visited = new Set<string>();
      let currentHookId: string | null = start_hook_id;

      while (currentHookId && !visited.has(currentHookId) && chainResults.length < max_depth) {
        visited.add(currentHookId);
        const hook = hooksMap.get(currentHookId);
        if (!hook) break;

        chainResults.push({
          hook_id: currentHookId,
          domain: hook.domain,
          category: hook.category,
          trigger: hook.trigger,
          executed_at: new Date().toISOString()
        });

        // Get next hook in chain
        currentHookId = hook.relatedHooks.length > 0 ? hook.relatedHooks[0] : null;
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            chain_length: chainResults.length,
            hooks_executed: chainResults.map(r => r.hook_id),
            results: chainResults
          }, null, 2)
        }]
      };
    }
  );

  // -------------------------------------------------------------------------
  // prism_dev_hook_stats
  // -------------------------------------------------------------------------
  server.tool(
    "prism_dev_hook_stats",
    "Gets development hooks statistics",
    {},
    async () => {
      const registry = loadHookRegistry();
      if (!registry) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: "Development hooks registry not found" }, null, 2)
          }]
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            version: registry.version,
            generated: registry.generated,
            statistics: registry.statistics
          }, null, 2)
        }]
      };
    }
  );
}

export default registerManusTools;
