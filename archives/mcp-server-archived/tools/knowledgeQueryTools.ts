/**
 * PRISM MCP Server - Knowledge Query Tools
 * Session 5.3: Unified Knowledge Access Tools
 * 
 * MCP Tools for knowledge queries:
 * - knowledge_search: Unified search across all 9 registries
 * - knowledge_cross_query: Cross-registry manufacturing task query
 * - knowledge_formula: Formula lookup with parameter matching
 * - knowledge_relations: Get knowledge relationships
 * - knowledge_stats: Knowledge base statistics
 * 
 * @version 1.0.0
 */

import { z } from "zod";
import { 
  knowledgeEngine,
  RegistryType,
  UnifiedSearchResult,
  CrossRegistryResult,
  FormulaQueryResult
} from "../engines/KnowledgeQueryEngine.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// SCHEMAS
// ============================================================================

const REGISTRY_TYPES = [
  "materials", "machines", "tools", "alarms", 
  "formulas", "skills", "scripts", "agents", "hooks"
] as const;

const KnowledgeSearchSchema = z.object({
  query: z.string().describe("Search query - searches across all or specified registries"),
  registries: z.array(z.enum(REGISTRY_TYPES)).optional()
    .describe("Specific registries to search. If omitted, auto-detects relevant registries from query."),
  limit: z.number().optional().default(20).describe("Maximum results to return"),
  min_score: z.number().optional().default(0.2).describe("Minimum relevance score (0-1)")
});

const KnowledgeCrossQuerySchema = z.object({
  task: z.string().describe("Manufacturing task description (e.g., 'machine Inconel 718 on DMG MORI')"),
  required_registries: z.array(z.enum(REGISTRY_TYPES)).optional()
    .describe("Specific registries to include in cross-query"),
  context: z.object({
    material_id: z.string().optional(),
    machine_id: z.string().optional(),
    operation: z.string().optional()
  }).optional().describe("Additional context to refine results")
});

const KnowledgeFormulaSchema = z.object({
  need: z.string().describe("What you need to calculate (e.g., 'cutting force', 'tool life', 'surface finish')"),
  category: z.string().optional()
    .describe("Formula category: cutting_force, cutting_speed, tool_life, surface_finish, thermal_analysis, etc."),
  material_id: z.string().optional().describe("Material ID for material-specific formulas"),
  include_related: z.boolean().optional().default(true).describe("Include related formulas")
});

const KnowledgeRelationsSchema = z.object({
  source_registry: z.enum(REGISTRY_TYPES).describe("Source registry type"),
  source_id: z.string().describe("Source item ID"),
  relation_types: z.array(z.enum(["uses", "requires", "produces", "related", "depends_on"])).optional()
    .describe("Filter by relation types")
});

const KnowledgeStatsSchema = z.object({
  include_details: z.boolean().optional().default(false)
    .describe("Include detailed breakdown by registry")
});

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const knowledgeQueryTools = {
  // ==========================================================================
  // knowledge_search
  // ==========================================================================
  knowledge_search: {
    name: "knowledge_search",
    description: `Unified search across all 9 PRISM registries.

Searches: Materials, Machines, Tools, Alarms, Formulas, Skills, Scripts, Agents, Hooks

Auto-detects relevant registries from query keywords:
- "steel", "aluminum", "inconel" → Materials
- "cnc", "mill", "dmg", "mazak" → Machines  
- "end mill", "insert", "drill" → Tools
- "alarm", "error", "fault" → Alarms
- "calculate", "kienzle", "taylor" → Formulas
- "skill", "workflow", "process" → Skills
- "script", "automate", "sync" → Scripts
- "agent", "analyzer", "expert" → Agents

Returns unified results with relevance scores and match types.`,
    
    schema: KnowledgeSearchSchema,
    
    handler: async (params: z.infer<typeof KnowledgeSearchSchema>): Promise<{
      success: boolean;
      results?: UnifiedSearchResult[];
      total?: number;
      registries_searched?: RegistryType[];
      error?: string;
    }> => {
      try {
        log.info(`knowledge_search: "${params.query.slice(0, 50)}..."`);
        
        const results = await knowledgeEngine.unifiedSearch(params.query, {
          registries: params.registries as RegistryType[] | undefined,
          limit: params.limit,
          min_score: params.min_score
        });

        // Get unique registries in results
        const registriesSearched = [...new Set(results.map(r => r.registry))];

        return {
          success: true,
          results,
          total: results.length,
          registries_searched: registriesSearched
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`knowledge_search error: ${error}`);
        return { success: false, error };
      }
    }
  },

  // ==========================================================================
  // knowledge_cross_query
  // ==========================================================================
  knowledge_cross_query: {
    name: "knowledge_cross_query",
    description: `Cross-registry query for manufacturing tasks.

Finds related items across multiple registries and builds relationships.
Returns:
- Matching materials, machines, tools, formulas, skills, scripts, agents
- Relationships between items (uses, requires, produces, related)
- Suggested workflow for the task

Example tasks:
- "Machine Ti-6Al-4V on 5-axis mill"
- "Calculate cutting parameters for hardened steel"
- "Troubleshoot FANUC spindle alarm"
- "Set up new material in system"`,
    
    schema: KnowledgeCrossQuerySchema,
    
    handler: async (params: z.infer<typeof KnowledgeCrossQuerySchema>): Promise<{
      success: boolean;
      result?: CrossRegistryResult;
      summary?: {
        materials_found: number;
        machines_found: number;
        tools_found: number;
        formulas_found: number;
        skills_found: number;
        relationships_count: number;
        workflow_steps: number;
      };
      error?: string;
    }> => {
      try {
        log.info(`knowledge_cross_query: "${params.task.slice(0, 50)}..."`);
        
        const result = await knowledgeEngine.crossRegistryQuery({
          task: params.task,
          required_registries: params.required_registries as RegistryType[] | undefined,
          context: params.context
        });

        const summary = {
          materials_found: result.results.materials?.length || 0,
          machines_found: result.results.machines?.length || 0,
          tools_found: result.results.tools?.length || 0,
          formulas_found: result.results.formulas?.length || 0,
          skills_found: result.results.skills?.length || 0,
          relationships_count: result.relationships.length,
          workflow_steps: result.suggested_workflow.length
        };

        return {
          success: true,
          result,
          summary
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`knowledge_cross_query error: ${error}`);
        return { success: false, error };
      }
    }
  },

  // ==========================================================================
  // knowledge_formula
  // ==========================================================================
  knowledge_formula: {
    name: "knowledge_formula",
    description: `Find formulas for specific calculation needs.

Formula categories:
- cutting_force: Kienzle, Merchant cutting force models
- cutting_speed: Speed/feed calculations
- tool_life: Taylor tool life equation
- surface_finish: Roughness calculations
- thermal_analysis: Heat generation models
- stability_analysis: Chatter prediction
- deflection: Tool/workpiece deflection
- optimization: Parameter optimization
- cost_analysis: Machining cost calculations

Returns formulas with:
- Match score and reasons
- Required input parameters
- Related formulas for chained calculations`,
    
    schema: KnowledgeFormulaSchema,
    
    handler: async (params: z.infer<typeof KnowledgeFormulaSchema>): Promise<{
      success: boolean;
      formulas?: FormulaQueryResult[];
      total?: number;
      top_formula?: {
        id: string;
        name: string;
        latex: string;
        inputs: string[];
      };
      error?: string;
    }> => {
      try {
        log.info(`knowledge_formula: "${params.need}"`);
        
        const formulas = await knowledgeEngine.findFormulas(params.need, {
          category: params.category as any,
          material_id: params.material_id,
          include_related: params.include_related
        });

        let topFormula;
        if (formulas.length > 0) {
          const f = formulas[0].formula;
          topFormula = {
            id: f.formula_id,
            name: f.name,
            latex: f.latex_formula,
            inputs: f.inputs.filter(i => i.required).map(i => `${i.name} (${i.unit})`)
          };
        }

        return {
          success: true,
          formulas,
          total: formulas.length,
          top_formula: topFormula
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`knowledge_formula error: ${error}`);
        return { success: false, error };
      }
    }
  },

  // ==========================================================================
  // knowledge_relations
  // ==========================================================================
  knowledge_relations: {
    name: "knowledge_relations",
    description: `Get relationships for a knowledge item.

Finds connections between registry items:
- Materials → Formulas, Tools, Machines
- Machines → Alarms, Materials, Tools
- Skills → Scripts, Agents
- Formulas → Materials, Skills

Relation types:
- uses: Source actively uses target
- requires: Source depends on target
- produces: Source generates target
- related: General association
- depends_on: Dependency relationship`,
    
    schema: KnowledgeRelationsSchema,
    
    handler: async (params: z.infer<typeof KnowledgeRelationsSchema>): Promise<{
      success: boolean;
      relations?: Array<{
        target_registry: RegistryType;
        target_id: string;
        relation_type: string;
        strength: number;
      }>;
      related_registries?: RegistryType[];
      error?: string;
    }> => {
      try {
        log.info(`knowledge_relations: ${params.source_registry}/${params.source_id}`);
        
        // Get cross-registry results to find relationships
        const crossResult = await knowledgeEngine.crossRegistryQuery({
          task: `${params.source_registry} ${params.source_id}`,
          required_registries: [params.source_registry]
        });

        // Filter relationships by source
        let relations = crossResult.relationships.filter(
          r => r.source_registry === params.source_registry && r.source_id === params.source_id
        );

        // Apply relation type filter
        if (params.relation_types?.length) {
          relations = relations.filter(r => params.relation_types!.includes(r.relation_type as any));
        }

        const relatedRegistries = [...new Set(relations.map(r => r.target_registry))];

        return {
          success: true,
          relations: relations.map(r => ({
            target_registry: r.target_registry,
            target_id: r.target_id,
            relation_type: r.relation_type,
            strength: r.strength
          })),
          related_registries: relatedRegistries
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`knowledge_relations error: ${error}`);
        return { success: false, error };
      }
    }
  },

  // ==========================================================================
  // knowledge_stats
  // ==========================================================================
  knowledge_stats: {
    name: "knowledge_stats",
    description: `Get knowledge base statistics.

Returns counts for all 9 registries:
- Materials (1,047 target)
- Machines (824 across 43 manufacturers)
- Tools (cutting tools database)
- Alarms (9,200 target across 12 controller families)
- Formulas (109+ manufacturing formulas)
- Skills (135 PRISM skills)
- Scripts (163+ automation scripts)
- Agents (64 AI agents)
- Hooks (147+ lifecycle hooks)

Also includes cache status and total entry count.`,
    
    schema: KnowledgeStatsSchema,
    
    handler: async (params: z.infer<typeof KnowledgeStatsSchema>): Promise<{
      success: boolean;
      stats?: {
        registries: Record<string, number>;
        total_entries: number;
        cache_size: number;
      };
      summary?: string;
      error?: string;
    }> => {
      try {
        log.info(`knowledge_stats`);
        
        const stats = await knowledgeEngine.getStats();

        let summary = `Knowledge Base: ${stats.total_entries.toLocaleString()} total entries across 9 registries`;
        
        if (params.include_details) {
          summary += "\n\nBreakdown:";
          for (const [registry, count] of Object.entries(stats.registries)) {
            summary += `\n- ${registry}: ${count}`;
          }
        }

        return {
          success: true,
          stats: {
            registries: stats.registries,
            total_entries: stats.total_entries,
            cache_size: stats.cache_size
          },
          summary
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`knowledge_stats error: ${error}`);
        return { success: false, error };
      }
    }
  }
};

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export function getKnowledgeQueryTools(): Array<{
  name: string;
  description: string;
  inputSchema: z.ZodObject<any>;
  handler: (params: any) => Promise<any>;
}> {
  return [
    {
      name: knowledgeQueryTools.knowledge_search.name,
      description: knowledgeQueryTools.knowledge_search.description,
      inputSchema: KnowledgeSearchSchema,
      handler: knowledgeQueryTools.knowledge_search.handler
    },
    {
      name: knowledgeQueryTools.knowledge_cross_query.name,
      description: knowledgeQueryTools.knowledge_cross_query.description,
      inputSchema: KnowledgeCrossQuerySchema,
      handler: knowledgeQueryTools.knowledge_cross_query.handler
    },
    {
      name: knowledgeQueryTools.knowledge_formula.name,
      description: knowledgeQueryTools.knowledge_formula.description,
      inputSchema: KnowledgeFormulaSchema,
      handler: knowledgeQueryTools.knowledge_formula.handler
    },
    {
      name: knowledgeQueryTools.knowledge_relations.name,
      description: knowledgeQueryTools.knowledge_relations.description,
      inputSchema: KnowledgeRelationsSchema,
      handler: knowledgeQueryTools.knowledge_relations.handler
    },
    {
      name: knowledgeQueryTools.knowledge_stats.name,
      description: knowledgeQueryTools.knowledge_stats.description,
      inputSchema: KnowledgeStatsSchema,
      handler: knowledgeQueryTools.knowledge_stats.handler
    }
  ];
}

// Export schemas
export {
  KnowledgeSearchSchema,
  KnowledgeCrossQuerySchema,
  KnowledgeFormulaSchema,
  KnowledgeRelationsSchema,
  KnowledgeStatsSchema
};

/**
 * Register all knowledge query tools with the MCP server
 */
export function registerKnowledgeQueryTools(server: any): void {
  const tools = getKnowledgeQueryTools();
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
  console.log("Registered: Knowledge Query tools (5 tools)");
}
