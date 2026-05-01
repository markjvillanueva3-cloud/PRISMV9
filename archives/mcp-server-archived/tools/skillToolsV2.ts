/**
 * PRISM MCP Server - Skill Tools V2
 * Session 5.1: Skill Integration Tools
 * 
 * MCP Tools for skill management:
 * - skill_load: Load skill content by ID
 * - skill_recommend: Get skill recommendations for a task
 * - skill_analyze: Analyze task requirements
 * - skill_chain: Build and execute skill chains
 * - skill_search: Search skills with filters
 * - skill_stats: Get skill usage statistics
 * 
 * @version 2.0.0
 */

import { z } from "zod";
import { 
  skillExecutor, 
  SkillLoadResult, 
  SkillRecommendation, 
  SkillChain,
  TaskAnalysis 
} from "../engines/SkillExecutor.js";
import { skillRegistry, SkillCategory, Skill } from "../registries/SkillRegistry.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// SCHEMAS
// ============================================================================

const SkillLoadSchema = z.object({
  skill_id: z.string().describe("Skill ID to load (e.g., 'prism-material-physics')"),
  include_content: z.boolean().optional().default(true).describe("Whether to include full skill content")
});

const SkillRecommendSchema = z.object({
  task: z.string().describe("Task description to get recommendations for"),
  max_results: z.number().optional().default(10).describe("Maximum recommendations to return"),
  min_relevance: z.number().optional().default(0.3).describe("Minimum relevance score (0-1)")
});

const SkillAnalyzeSchema = z.object({
  task: z.string().describe("Task description to analyze")
});

const SkillChainSchema = z.object({
  skill_ids: z.array(z.string()).describe("Skill IDs to include in chain"),
  purpose: z.string().describe("Purpose of the skill chain"),
  execute: z.boolean().optional().default(false).describe("Whether to load and execute the chain")
});

const SkillSearchSchema = z.object({
  query: z.string().optional().describe("Search query"),
  category: z.string().optional().describe("Filter by category"),
  tag: z.string().optional().describe("Filter by tag"),
  enabled_only: z.boolean().optional().default(true).describe("Only return enabled skills"),
  limit: z.number().optional().default(20).describe("Maximum results"),
  offset: z.number().optional().default(0).describe("Offset for pagination")
});

const SkillStatsSchema = z.object({
  include_usage: z.boolean().optional().default(true).describe("Include usage statistics"),
  include_cache: z.boolean().optional().default(true).describe("Include cache statistics"),
  top_n: z.number().optional().default(10).describe("Number of top used skills to show")
});

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const skillToolsV2 = {
  // ==========================================================================
  // skill_load
  // ==========================================================================
  skill_load: {
    name: "skill_load",
    description: `Load a PRISM skill by ID. Returns skill metadata and optionally full content.

Use this to:
- Load skill content for reference during task execution
- Get skill details including triggers, use cases, dependencies
- Check if a skill exists and is enabled

Examples:
- Load material physics skill: skill_id="prism-material-physics"
- Load safety framework: skill_id="prism-safety-framework"
- Load without content: skill_id="prism-validator", include_content=false`,
    
    schema: SkillLoadSchema,
    
    handler: async (params: z.infer<typeof SkillLoadSchema>): Promise<{
      success: boolean;
      skill?: Skill;
      content?: string;
      load_result?: SkillLoadResult;
      error?: string;
    }> => {
      try {
        log.info(`skill_load: Loading ${params.skill_id}`);
        
        // Get skill metadata
        await skillExecutor.initialize();
        const skill = skillRegistry.getSkill(params.skill_id);
        
        if (!skill) {
          return {
            success: false,
            error: `Skill not found: ${params.skill_id}`
          };
        }

        // Load content if requested
        let content: string | undefined;
        let loadResult: SkillLoadResult | undefined;
        
        if (params.include_content) {
          loadResult = await skillExecutor.loadSkill(params.skill_id);
          if (loadResult.success) {
            content = loadResult.content;
          }
        }

        return {
          success: true,
          skill,
          content,
          load_result: loadResult
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`skill_load error: ${error}`);
        return { success: false, error };
      }
    }
  },

  // ==========================================================================
  // skill_recommend
  // ==========================================================================
  skill_recommend: {
    name: "skill_recommend",
    description: `Get intelligent skill recommendations for a task.

Analyzes task description to:
- Detect relevant domains (materials, machines, calculations, etc.)
- Identify required actions (add, validate, calculate, etc.)
- Match skills based on triggers and use cases
- Score relevance and suggest best skills

Examples:
- "Add Inconel 718 with full 127-parameter coverage"
- "Calculate cutting forces for Ti-6Al-4V"
- "Debug FANUC alarm 1001"`,
    
    schema: SkillRecommendSchema,
    
    handler: async (params: z.infer<typeof SkillRecommendSchema>): Promise<{
      success: boolean;
      task_analysis?: TaskAnalysis;
      recommendations?: SkillRecommendation[];
      suggested_chain?: string[];
      error?: string;
    }> => {
      try {
        log.info(`skill_recommend: Analyzing "${params.task.slice(0, 50)}..."`);
        
        // Analyze the task
        const analysis = skillExecutor.analyzeTask(params.task);
        
        // Get recommendations
        const recommendations = await skillExecutor.recommendSkills(params.task);
        
        // Filter by minimum relevance
        const filtered = recommendations.filter(r => r.relevance_score >= params.min_relevance);
        
        // Limit results
        const limited = filtered.slice(0, params.max_results);
        
        // Suggest a skill chain from high-value recommendations
        const suggestedChain = limited
          .filter(r => r.estimated_value === "HIGH" || r.estimated_value === "MEDIUM")
          .map(r => r.skill_id)
          .slice(0, 5);

        return {
          success: true,
          task_analysis: analysis,
          recommendations: limited,
          suggested_chain: suggestedChain.length > 0 ? suggestedChain : undefined
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`skill_recommend error: ${error}`);
        return { success: false, error };
      }
    }
  },

  // ==========================================================================
  // skill_analyze
  // ==========================================================================
  skill_analyze: {
    name: "skill_analyze",
    description: `Analyze a task to understand requirements and complexity.

Returns:
- Detected domains (materials, machines, calculations, etc.)
- Detected actions (add, validate, debug, etc.)
- Complexity level (LOW, MEDIUM, HIGH)
- Whether physics/safety/code is required
- Suggested approach

Use before starting a task to understand the best approach.`,
    
    schema: SkillAnalyzeSchema,
    
    handler: async (params: z.infer<typeof SkillAnalyzeSchema>): Promise<{
      success: boolean;
      analysis?: TaskAnalysis;
      error?: string;
    }> => {
      try {
        log.info(`skill_analyze: Analyzing task`);
        
        const analysis = skillExecutor.analyzeTask(params.task);
        
        return {
          success: true,
          analysis
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`skill_analyze error: ${error}`);
        return { success: false, error };
      }
    }
  },

  // ==========================================================================
  // skill_chain
  // ==========================================================================
  skill_chain: {
    name: "skill_chain",
    description: `Build or execute a skill chain with dependency resolution.

A skill chain:
- Resolves dependencies automatically
- Orders skills by dependency graph
- Can execute (load) all skills in order
- Returns combined content for context

Use for complex tasks requiring multiple skills.`,
    
    schema: SkillChainSchema,
    
    handler: async (params: z.infer<typeof SkillChainSchema>): Promise<{
      success: boolean;
      chain?: SkillChain;
      execution_result?: {
        success: boolean;
        loaded: SkillLoadResult[];
        combined_content: string;
        total_lines: number;
        execution_time_ms: number;
      };
      error?: string;
    }> => {
      try {
        log.info(`skill_chain: Building chain for ${params.skill_ids.length} skills`);
        
        // Build the chain
        const chain = await skillExecutor.buildSkillChain(params.skill_ids, params.purpose);
        
        // Execute if requested
        let executionResult;
        if (params.execute) {
          executionResult = await skillExecutor.executeSkillChain(chain);
        }

        return {
          success: true,
          chain,
          execution_result: executionResult
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`skill_chain error: ${error}`);
        return { success: false, error };
      }
    }
  },

  // ==========================================================================
  // skill_search
  // ==========================================================================
  skill_search: {
    name: "skill_search_v2",
    description: `Search skills with filters.

Search by:
- Query: text search in name, ID, description
- Category: filter by skill category
- Tag: filter by skill tags
- Enabled status

Categories: core_development, materials, session_management, 
quality_validation, controller_programming, ai_ml, etc.`,
    
    schema: SkillSearchSchema,
    
    handler: async (params: z.infer<typeof SkillSearchSchema>): Promise<{
      success: boolean;
      skills?: Skill[];
      total?: number;
      has_more?: boolean;
      categories?: string[];
      error?: string;
    }> => {
      try {
        log.info(`skill_search: Searching skills`);
        
        await skillExecutor.initialize();
        
        const result = skillRegistry.search({
          query: params.query,
          category: params.category as SkillCategory | undefined,
          tag: params.tag,
          enabled: params.enabled_only ? true : undefined,
          limit: params.limit,
          offset: params.offset
        });

        // Get available categories
        const categories = skillExecutor.getCategories();

        return {
          success: true,
          skills: result.skills,
          total: result.total,
          has_more: result.hasMore,
          categories
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`skill_search error: ${error}`);
        return { success: false, error };
      }
    }
  },

  // ==========================================================================
  // skill_stats
  // ==========================================================================
  skill_stats_v2: {
    name: "skill_stats_v2",
    description: `Get skill usage and cache statistics.

Returns:
- Total skills available
- Skills by category
- Cache statistics (entries, lines, age)
- Usage statistics (loads, unique skills, avg time)
- Top N most used skills`,
    
    schema: SkillStatsSchema,
    
    handler: async (params: z.infer<typeof SkillStatsSchema>): Promise<{
      success: boolean;
      stats?: {
        skills_available: number;
        by_category: Record<string, number>;
        total_lines: number;
        total_size_kb: number;
        active_enabled: number;
        cache?: { entries: number; total_lines: number; oldest_entry_age_ms: number };
        usage?: { total_loads: number; unique_skills_used: number; avg_load_time_ms: number };
        top_used?: { skill_id: string; load_count: number; avg_load_time_ms: number }[];
      };
      error?: string;
    }> => {
      try {
        log.info(`skill_stats: Getting statistics`);
        
        await skillExecutor.initialize();
        const executorStats = skillExecutor.getStats();
        const registryStats = executorStats.registry;

        const stats: any = {
          skills_available: executorStats.skills_available,
          by_category: registryStats.byCategory,
          total_lines: registryStats.totalLines,
          total_size_kb: registryStats.totalSizeKB,
          active_enabled: registryStats.activeEnabled
        };

        if (params.include_cache) {
          stats.cache = executorStats.cache;
        }

        if (params.include_usage) {
          stats.usage = executorStats.usage;
          
          const topUsed = skillExecutor.getMostUsed(params.top_n);
          stats.top_used = topUsed.map(u => ({
            skill_id: u.skill_id,
            load_count: u.load_count,
            avg_load_time_ms: Math.round(u.avg_load_time_ms * 100) / 100
          }));
        }

        return {
          success: true,
          stats
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`skill_stats error: ${error}`);
        return { success: false, error };
      }
    }
  }
};

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export function getSkillToolsV2(): Array<{
  name: string;
  description: string;
  inputSchema: z.ZodObject<any>;
  handler: (params: any) => Promise<any>;
}> {
  return [
    {
      name: skillToolsV2.skill_load.name,
      description: skillToolsV2.skill_load.description,
      inputSchema: SkillLoadSchema,
      handler: skillToolsV2.skill_load.handler
    },
    {
      name: skillToolsV2.skill_recommend.name,
      description: skillToolsV2.skill_recommend.description,
      inputSchema: SkillRecommendSchema,
      handler: skillToolsV2.skill_recommend.handler
    },
    {
      name: skillToolsV2.skill_analyze.name,
      description: skillToolsV2.skill_analyze.description,
      inputSchema: SkillAnalyzeSchema,
      handler: skillToolsV2.skill_analyze.handler
    },
    {
      name: skillToolsV2.skill_chain.name,
      description: skillToolsV2.skill_chain.description,
      inputSchema: SkillChainSchema,
      handler: skillToolsV2.skill_chain.handler
    },
    {
      name: skillToolsV2.skill_search.name,
      description: skillToolsV2.skill_search.description,
      inputSchema: SkillSearchSchema,
      handler: skillToolsV2.skill_search.handler
    },
    {
      name: skillToolsV2.skill_stats_v2.name,
      description: skillToolsV2.skill_stats_v2.description,
      inputSchema: SkillStatsSchema,
      handler: skillToolsV2.skill_stats_v2.handler
    }
  ];
}

// Export schemas for external use
export {
  SkillLoadSchema,
  SkillRecommendSchema,
  SkillAnalyzeSchema,
  SkillChainSchema,
  SkillSearchSchema,
  SkillStatsSchema
};

/**
 * Register all skill tools V2 with the MCP server
 */
export function registerSkillToolsV2(server: any): void {
  const tools = getSkillToolsV2();
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
  console.log("Registered: Skill tools V2 (6 tools)");
}
