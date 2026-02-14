/**
 * PRISM MCP Server - Script Tools V2
 * Session 5.2: Script Execution Tools
 * 
 * MCP Tools for script management:
 * - script_execute: Execute a script with parameters
 * - script_queue: Queue scripts for batch execution
 * - script_recommend: Get script recommendations for a task
 * - script_search: Search scripts with filters
 * - script_history: Get execution history and statistics
 * 
 * @version 2.0.0
 */

import { z } from "zod";
import { 
  scriptExecutor, 
  ExecutionResult, 
  QueuedExecution,
  ScriptRecommendation,
  ExecutionParams
} from "../engines/ScriptExecutor.js";
import { scriptRegistry, ScriptCategory, ScriptLanguage, Script } from "../registries/ScriptRegistry.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// SCHEMAS
// ============================================================================

const ScriptExecuteSchema = z.object({
  script_id: z.string().describe("Script ID to execute (e.g., 'gsd_startup', 'session_memory_manager')"),
  params: z.record(z.union([z.string(), z.number(), z.boolean()])).optional()
    .describe("Parameters to pass to the script. Use parameter names as keys."),
  timeout_ms: z.number().optional().default(60000).describe("Execution timeout in milliseconds"),
  working_dir: z.string().optional().describe("Working directory for script execution"),
  bypass_safe_mode: z.boolean().optional().default(false)
    .describe("Bypass safe mode for destructive scripts (requires explicit approval)")
});

const ScriptQueueSchema = z.object({
  scripts: z.array(z.object({
    script_id: z.string(),
    params: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
    priority: z.number().optional().default(5)
  })).describe("Scripts to queue for execution"),
  process_immediately: z.boolean().optional().default(false)
    .describe("Whether to start processing the queue immediately")
});

const ScriptRecommendSchema = z.object({
  task: z.string().describe("Task description to get script recommendations for"),
  max_results: z.number().optional().default(10).describe("Maximum recommendations to return")
});

const ScriptSearchSchema = z.object({
  query: z.string().optional().describe("Search query"),
  category: z.string().optional().describe("Filter by category (session_management, skill_management, analysis, etc.)"),
  language: z.string().optional().describe("Filter by language (python, powershell, bash, etc.)"),
  tag: z.string().optional().describe("Filter by tag"),
  enabled_only: z.boolean().optional().default(true).describe("Only return enabled scripts"),
  limit: z.number().optional().default(20).describe("Maximum results"),
  offset: z.number().optional().default(0).describe("Offset for pagination")
});

const ScriptHistorySchema = z.object({
  script_id: z.string().optional().describe("Filter history by script ID"),
  success_only: z.boolean().optional().describe("Filter by success status"),
  limit: z.number().optional().default(20).describe("Maximum results"),
  include_stats: z.boolean().optional().default(true).describe("Include overall statistics")
});

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const scriptToolsV2 = {
  // ==========================================================================
  // script_execute
  // ==========================================================================
  script_execute: {
    name: "script_execute_v2",
    description: `Execute a PRISM script by ID with parameters.

Key scripts available:
- gsd_startup: Session initialization (task description optional)
- session_memory_manager: Checkpoint/resume/end (action required)
- intelligent_skill_selector: Select skills for task
- comprehensive_audit: Full resource audit
- master_sync: Data pipeline synchronization

Parameters are passed as key-value pairs. Use the parameter name as key.

Example params:
- gsd_startup: { "task": "debug material physics" }
- session_memory_manager: { "action": "checkpoint", "--completed": 25, "--next": "item 26" }

NOTE: Some scripts are marked as destructive and require bypass_safe_mode=true.`,
    
    schema: ScriptExecuteSchema,
    
    handler: async (params: z.infer<typeof ScriptExecuteSchema>): Promise<{
      success: boolean;
      result?: ExecutionResult;
      script?: Script;
      command?: string;
      is_destructive?: boolean;
      error?: string;
    }> => {
      try {
        log.info(`script_execute: Executing ${params.script_id}`);
        
        await scriptExecutor.initialize();

        // Get script info
        const script = scriptExecutor.getScript(params.script_id);
        if (!script) {
          return {
            success: false,
            error: `Script not found: ${params.script_id}`
          };
        }

        const isDestructive = scriptExecutor.isDestructive(params.script_id);
        const command = scriptExecutor.getCommand(params.script_id, params.params as ExecutionParams);

        // Check safe mode
        if (isDestructive && !params.bypass_safe_mode) {
          return {
            success: false,
            script,
            command,
            is_destructive: true,
            error: `Script ${params.script_id} is marked as potentially destructive. Set bypass_safe_mode=true to execute.`
          };
        }

        // Execute
        const result = await scriptExecutor.executeScript(
          params.script_id,
          params.params as ExecutionParams || {},
          {
            timeout_ms: params.timeout_ms,
            working_dir: params.working_dir
          }
        );

        return {
          success: result.success,
          result,
          script,
          command,
          is_destructive: isDestructive
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`script_execute error: ${error}`);
        return { success: false, error };
      }
    }
  },

  // ==========================================================================
  // script_queue
  // ==========================================================================
  script_queue: {
    name: "script_queue",
    description: `Queue multiple scripts for batch execution.

Scripts are executed in priority order (higher priority first).
Use process_immediately=true to start execution right away.

Example:
{
  "scripts": [
    { "script_id": "comprehensive_audit", "priority": 10 },
    { "script_id": "mcp_resource_audit", "priority": 8 }
  ],
  "process_immediately": true
}`,
    
    schema: ScriptQueueSchema,
    
    handler: async (params: z.infer<typeof ScriptQueueSchema>): Promise<{
      success: boolean;
      queued?: QueuedExecution[];
      results?: ExecutionResult[];
      queue_status?: { total: number; pending: number; running: number; completed: number; failed: number };
      error?: string;
    }> => {
      try {
        log.info(`script_queue: Queueing ${params.scripts.length} scripts`);
        
        await scriptExecutor.initialize();

        // Queue all scripts
        const queued: QueuedExecution[] = [];
        for (const script of params.scripts) {
          const execution = scriptExecutor.queueScript(
            script.script_id,
            script.params as ExecutionParams || {},
            {},
            script.priority
          );
          queued.push(execution);
        }

        // Process if requested
        let results: ExecutionResult[] | undefined;
        if (params.process_immediately) {
          results = await scriptExecutor.processQueue();
        }

        const queueStatus = scriptExecutor.getQueueStatus();

        return {
          success: true,
          queued,
          results,
          queue_status: queueStatus
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`script_queue error: ${error}`);
        return { success: false, error };
      }
    }
  },

  // ==========================================================================
  // script_recommend
  // ==========================================================================
  script_recommend: {
    name: "script_recommend",
    description: `Get script recommendations for a task.

Analyzes task description to find relevant scripts.
Returns scripts sorted by relevance with usage examples.

Examples:
- "start new session" → gsd_startup, session_memory_manager
- "audit all resources" → comprehensive_audit, mcp_resource_audit
- "sync data pipeline" → master_sync
- "select skills for task" → intelligent_skill_selector`,
    
    schema: ScriptRecommendSchema,
    
    handler: async (params: z.infer<typeof ScriptRecommendSchema>): Promise<{
      success: boolean;
      recommendations?: ScriptRecommendation[];
      error?: string;
    }> => {
      try {
        log.info(`script_recommend: Finding scripts for "${params.task.slice(0, 50)}..."`);
        
        const recommendations = await scriptExecutor.recommendScripts(params.task);
        const limited = recommendations.slice(0, params.max_results);

        return {
          success: true,
          recommendations: limited
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`script_recommend error: ${error}`);
        return { success: false, error };
      }
    }
  },

  // ==========================================================================
  // script_search
  // ==========================================================================
  script_search: {
    name: "script_search_v2",
    description: `Search scripts with filters.

Search by:
- query: Text search in name, ID, description
- category: session_management, skill_management, data_processing, 
           analysis, api_integration, extraction, validation, utilities, testing
- language: python, powershell, bash, javascript, typescript
- tag: Filter by script tags

Returns script metadata including parameters and usage examples.`,
    
    schema: ScriptSearchSchema,
    
    handler: async (params: z.infer<typeof ScriptSearchSchema>): Promise<{
      success: boolean;
      scripts?: Script[];
      total?: number;
      has_more?: boolean;
      categories?: ScriptCategory[];
      languages?: ScriptLanguage[];
      error?: string;
    }> => {
      try {
        log.info(`script_search: Searching scripts`);
        
        await scriptExecutor.initialize();
        
        const result = scriptRegistry.search({
          query: params.query,
          category: params.category as ScriptCategory | undefined,
          language: params.language as ScriptLanguage | undefined,
          tag: params.tag,
          enabled: params.enabled_only ? true : undefined,
          limit: params.limit,
          offset: params.offset
        });

        // Get available categories and languages
        const categories = scriptExecutor.getCategories();
        const languages: ScriptLanguage[] = ["python", "powershell", "bash", "javascript", "typescript"];

        return {
          success: true,
          scripts: result.scripts,
          total: result.total,
          has_more: result.hasMore,
          categories,
          languages
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`script_search error: ${error}`);
        return { success: false, error };
      }
    }
  },

  // ==========================================================================
  // script_history
  // ==========================================================================
  script_history: {
    name: "script_history",
    description: `Get script execution history and statistics.

Returns:
- Recent execution results (stdout, stderr, exit code, duration)
- Success/failure counts
- Most executed scripts
- Average execution times

Use to monitor script performance and troubleshoot failures.`,
    
    schema: ScriptHistorySchema,
    
    handler: async (params: z.infer<typeof ScriptHistorySchema>): Promise<{
      success: boolean;
      history?: ExecutionResult[];
      stats?: {
        scripts_available: number;
        queue: { total: number; pending: number; running: number; completed: number; failed: number };
        history: { total: number; success_count: number; failure_count: number; avg_duration_ms: number };
        most_executed: { script_id: string; count: number }[];
      };
      error?: string;
    }> => {
      try {
        log.info(`script_history: Getting execution history`);
        
        await scriptExecutor.initialize();

        // Get history
        const history = scriptExecutor.getHistory({
          script_id: params.script_id,
          success: params.success_only,
          limit: params.limit
        });

        // Get stats if requested
        let stats;
        if (params.include_stats) {
          stats = scriptExecutor.getStats();
        }

        return {
          success: true,
          history,
          stats
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`script_history error: ${error}`);
        return { success: false, error };
      }
    }
  }
};

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export function getScriptToolsV2(): Array<{
  name: string;
  description: string;
  inputSchema: z.ZodObject<any>;
  handler: (params: any) => Promise<any>;
}> {
  return [
    {
      name: scriptToolsV2.script_execute.name,
      description: scriptToolsV2.script_execute.description,
      inputSchema: ScriptExecuteSchema,
      handler: scriptToolsV2.script_execute.handler
    },
    {
      name: scriptToolsV2.script_queue.name,
      description: scriptToolsV2.script_queue.description,
      inputSchema: ScriptQueueSchema,
      handler: scriptToolsV2.script_queue.handler
    },
    {
      name: scriptToolsV2.script_recommend.name,
      description: scriptToolsV2.script_recommend.description,
      inputSchema: ScriptRecommendSchema,
      handler: scriptToolsV2.script_recommend.handler
    },
    {
      name: scriptToolsV2.script_search.name,
      description: scriptToolsV2.script_search.description,
      inputSchema: ScriptSearchSchema,
      handler: scriptToolsV2.script_search.handler
    },
    {
      name: scriptToolsV2.script_history.name,
      description: scriptToolsV2.script_history.description,
      inputSchema: ScriptHistorySchema,
      handler: scriptToolsV2.script_history.handler
    }
  ];
}

// Export schemas for external use
export {
  ScriptExecuteSchema,
  ScriptQueueSchema,
  ScriptRecommendSchema,
  ScriptSearchSchema,
  ScriptHistorySchema
};

/**
 * Register all script tools V2 with the MCP server
 */
export function registerScriptToolsV2(server: any): void {
  const tools = getScriptToolsV2();
  for (const tool of tools) {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema.shape,
      async (params: any) => {
        const result = await tool.handler(params);
        return {
          content: [{ type: "text", text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }],
          metadata: result
        };
      }
    );
  }
  console.log("Registered: Script tools V2 (5 tools)");
}
