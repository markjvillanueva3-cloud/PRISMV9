/**
 * PRISM Manufacturing Intelligence - Toolpath Strategy MCP Tools
 * 
 * Tools for intelligent toolpath strategy selection, parameter optimization,
 * and CAM integration.
 * 
 * @version 1.0.0
 * @module ToolpathTools
 */

import { 
  toolpathRegistry, 
  ToolpathStrategy, 
  StrategySelectionResult,
  StrategyParams,
  StrategyCategory
} from '../registries/ToolpathStrategyRegistry.js';

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

/**
 * Tool: toolpath_strategy_select
 * Select optimal toolpath strategy for a feature
 */
export async function toolpath_strategy_select(params: {
  feature_type: string;
  material: string;
  operation: 'roughing' | 'finishing';
  priority?: 'time' | 'quality' | 'tool_life' | 'balanced';
  cam_software?: string;
  axes?: '2D' | '2.5D' | '3D' | '4D' | '5D';
}): Promise<{
  strategy: ToolpathStrategy;
  confidence: number;
  reasoning: string;
  alternatives: ToolpathStrategy[];
  parameters_hint: string;
}> {
  const result = toolpathRegistry.getBestStrategy(
    params.feature_type,
    params.material,
    params.operation,
    {
      camSoftware: params.cam_software,
      priority: params.priority || 'balanced',
      axes: params.axes
    }
  );
  
  return {
    strategy: result.strategy,
    confidence: result.confidence,
    reasoning: result.reasoning,
    alternatives: result.alternatives,
    parameters_hint: `Use toolpath_params_calculate with strategy_id='${result.strategy.id}' to get cutting parameters`
  };
}

/**
 * Tool: toolpath_params_calculate
 * Calculate cutting parameters for a strategy
 */
export async function toolpath_params_calculate(params: {
  strategy_id: string;
  tool_diameter: number;
  material: string;
  operation?: 'roughing' | 'finishing';
}): Promise<{
  stepover: number;
  stepover_percent: number;
  stepdown: number;
  stepdown_percent: number;
  engagement: number;
  engagement_degrees: number;
  direction: 'climb' | 'conventional' | 'mixed';
  pattern?: string;
  recommendations: string[];
}> {
  const calcParams = toolpathRegistry.getStrategyParams(
    params.strategy_id,
    params.tool_diameter,
    params.material
  );
  
  const recommendations: string[] = [];
  
  // Add material-specific recommendations
  const mat = params.material.toLowerCase();
  if (mat.includes('titanium')) {
    recommendations.push('Use flood coolant with high pressure');
    recommendations.push('Consider climb milling only');
    recommendations.push('Monitor temperature - keep below 400°C');
  } else if (mat.includes('inconel') || mat.includes('hastelloy')) {
    recommendations.push('Use ceramic or CBN inserts for higher speeds');
    recommendations.push('Maintain constant chip load');
    recommendations.push('Avoid dwelling - causes work hardening');
  } else if (mat.includes('aluminum')) {
    recommendations.push('High spindle speeds recommended (10,000+ RPM)');
    recommendations.push('Single flute or polished multi-flute for best finish');
    recommendations.push('Mist coolant or MQL often sufficient');
  } else if (mat.includes('stainless')) {
    recommendations.push('Use positive rake geometry');
    recommendations.push('Maintain feed - light cuts cause work hardening');
    recommendations.push('Flood coolant recommended');
  }
  
  return {
    stepover: calcParams.stepover,
    stepover_percent: (calcParams.stepover / params.tool_diameter) * 100,
    stepdown: calcParams.stepdown,
    stepdown_percent: (calcParams.stepdown / params.tool_diameter) * 100,
    engagement: calcParams.engagement,
    engagement_degrees: calcParams.engagement * 360,
    direction: calcParams.direction,
    pattern: calcParams.pattern,
    recommendations
  };
}

/**
 * Tool: toolpath_strategy_search
 * Search strategies by keyword
 */
export async function toolpath_strategy_search(params: {
  keyword: string;
  category?: StrategyCategory;
  material?: string;
  limit?: number;
}): Promise<{
  count: number;
  strategies: ToolpathStrategy[];
}> {
  let results = toolpathRegistry.searchStrategies(params.keyword);
  
  // Filter by category if specified
  if (params.category) {
    results = results.filter(s => s.category === params.category);
  }
  
  // Filter by material if specified
  if (params.material) {
    const mat = params.material.toLowerCase();
    results = results.filter(s => 
      s.materials?.includes('all') ||
      s.materials?.some(m => mat.includes(m) || m.includes(mat))
    );
  }
  
  // Apply limit
  const limit = params.limit || 20;
  const limitedResults = results.slice(0, limit);
  
  return {
    count: results.length,
    strategies: limitedResults
  };
}

/**
 * Tool: toolpath_strategy_list
 * List all strategies in a category
 */
export async function toolpath_strategy_list(params: {
  category: StrategyCategory;
  subcategory?: string;
}): Promise<{
  category: string;
  count: number;
  strategies: Array<{
    id: string;
    name: string;
    subcategory: string;
    description: string;
  }>;
}> {
  let strategies = toolpathRegistry.getStrategiesByCategory(params.category);
  
  // Filter by subcategory if specified
  if (params.subcategory) {
    strategies = strategies.filter(s => s.subcategory === params.subcategory);
  }
  
  return {
    category: params.category,
    count: strategies.length,
    strategies: strategies.map(s => ({
      id: s.id,
      name: s.name,
      subcategory: s.subcategory,
      description: s.description
    }))
  };
}

/**
 * Tool: toolpath_strategy_info
 * Get detailed information about a specific strategy
 */
export async function toolpath_strategy_info(params: {
  strategy_id: string;
}): Promise<{
  found: boolean;
  strategy?: ToolpathStrategy;
  usage_examples?: string[];
  related_strategies?: Array<{ id: string; name: string }>;
}> {
  const strategy = toolpathRegistry.getStrategyById(params.strategy_id);
  
  if (!strategy) {
    return { found: false };
  }
  
  // Generate usage examples
  const examples: string[] = [];
  if (strategy.bestFor && strategy.bestFor.length > 0) {
    examples.push(`Best for: ${strategy.bestFor.join(', ')}`);
  }
  if (strategy.materials && strategy.materials.length > 0) {
    examples.push(`Materials: ${strategy.materials.join(', ')}`);
  }
  if (strategy.camSupport && strategy.camSupport.length > 0) {
    examples.push(`CAM support: ${strategy.camSupport.join(', ')}`);
  }
  
  // Find related strategies in same subcategory
  const related = toolpathRegistry.getStrategiesByCategory(strategy.category)
    .filter(s => s.subcategory === strategy.subcategory && s.id !== strategy.id)
    .slice(0, 5)
    .map(s => ({ id: s.id, name: s.name }));
  
  return {
    found: true,
    strategy,
    usage_examples: examples,
    related_strategies: related
  };
}

/**
 * Tool: toolpath_stats
 * Get registry statistics
 */
export async function toolpath_stats(): Promise<{
  total_strategies: number;
  by_category: Record<string, number>;
  prism_novel_count: number;
  categories: string[];
}> {
  const stats = toolpathRegistry.getStats();
  const prismNovel = toolpathRegistry.getPrismNovelStrategies();
  
  return {
    total_strategies: stats.total,
    by_category: stats,
    prism_novel_count: prismNovel.length,
    categories: [
      'milling_roughing',
      'milling_finishing', 
      'hole_making',
      'turning',
      'multiaxis',
      'prism_novel'
    ]
  };
}

/**
 * Tool: toolpath_material_strategies
 * Get all strategies suitable for a material
 */
export async function toolpath_material_strategies(params: {
  material: string;
  operation?: 'roughing' | 'finishing' | 'both';
}): Promise<{
  material: string;
  count: number;
  roughing: ToolpathStrategy[];
  finishing: ToolpathStrategy[];
  specialized: ToolpathStrategy[];
}> {
  const strategies = toolpathRegistry.getStrategiesForMaterial(params.material);
  
  const roughing = strategies.filter(s => 
    s.subcategory?.includes('rough') || s.category === 'milling_roughing'
  );
  
  const finishing = strategies.filter(s => 
    s.subcategory?.includes('finish') || s.category === 'milling_finishing'
  );
  
  const specialized = strategies.filter(s => 
    s.subcategory === 'specialized' || s.prismNovel
  );
  
  return {
    material: params.material,
    count: strategies.length,
    roughing: params.operation === 'finishing' ? [] : roughing.slice(0, 10),
    finishing: params.operation === 'roughing' ? [] : finishing.slice(0, 10),
    specialized: specialized.slice(0, 5)
  };
}

/**
 * Tool: toolpath_prism_novel
 * Get PRISM invented/novel strategies
 */
export async function toolpath_prism_novel(params: {
  subcategory?: 'ai' | 'hybrid' | 'physics' | 'optimization' | 'specialized';
}): Promise<{
  count: number;
  strategies: ToolpathStrategy[];
  description: string;
}> {
  let strategies = toolpathRegistry.getPrismNovelStrategies();
  
  if (params.subcategory) {
    strategies = strategies.filter(s => s.subcategory === params.subcategory);
  }
  
  const descriptions: Record<string, string> = {
    ai: 'AI/ML-driven strategies using neural networks, reinforcement learning, and predictive models',
    hybrid: 'Hybrid strategies combining multiple manufacturing processes',
    physics: 'Physics-based strategies using cutting force, thermal, and vibration models',
    optimization: 'Advanced optimization using PSO, GA, and multi-objective algorithms',
    specialized: 'Specialized strategies for specific materials or applications'
  };
  
  return {
    count: strategies.length,
    strategies,
    description: params.subcategory 
      ? descriptions[params.subcategory] 
      : 'PRISM-invented strategies not found in commercial CAM systems'
  };
}

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export const TOOLPATH_TOOLS = {
  toolpath_strategy_select: {
    name: 'toolpath_strategy_select',
    description: 'Select optimal toolpath strategy for a machining feature',
    parameters: {
      type: 'object',
      properties: {
        feature_type: { type: 'string', description: 'Feature type (pocket, hole, slot, contour, face, thread, boss, chamfer, groove, profile, bore, blade, impeller)' },
        material: { type: 'string', description: 'Material being machined' },
        operation: { type: 'string', enum: ['roughing', 'finishing'], description: 'Operation type' },
        priority: { type: 'string', enum: ['time', 'quality', 'tool_life', 'balanced'], description: 'Optimization priority' },
        cam_software: { type: 'string', description: 'CAM software for compatibility (fusion360, mastercam, solidcam, etc.)' },
        axes: { type: 'string', enum: ['2D', '2.5D', '3D', '4D', '5D'], description: 'Available machine axes' }
      },
      required: ['feature_type', 'material', 'operation']
    },
    handler: toolpath_strategy_select
  },
  
  toolpath_params_calculate: {
    name: 'toolpath_params_calculate',
    description: 'Calculate cutting parameters for a toolpath strategy',
    parameters: {
      type: 'object',
      properties: {
        strategy_id: { type: 'string', description: 'Strategy ID from selection' },
        tool_diameter: { type: 'number', description: 'Tool diameter in inches' },
        material: { type: 'string', description: 'Material being machined' },
        operation: { type: 'string', enum: ['roughing', 'finishing'], description: 'Operation type' }
      },
      required: ['strategy_id', 'tool_diameter', 'material']
    },
    handler: toolpath_params_calculate
  },
  
  toolpath_strategy_search: {
    name: 'toolpath_strategy_search',
    description: 'Search toolpath strategies by keyword',
    parameters: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: 'Search keyword' },
        category: { type: 'string', description: 'Filter by category' },
        material: { type: 'string', description: 'Filter by material compatibility' },
        limit: { type: 'number', description: 'Maximum results to return' }
      },
      required: ['keyword']
    },
    handler: toolpath_strategy_search
  },
  
  toolpath_strategy_list: {
    name: 'toolpath_strategy_list',
    description: 'List all strategies in a category',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['milling_roughing', 'milling_finishing', 'hole_making', 'turning', 'multiaxis', 'prism_novel'], description: 'Strategy category' },
        subcategory: { type: 'string', description: 'Optional subcategory filter' }
      },
      required: ['category']
    },
    handler: toolpath_strategy_list
  },
  
  toolpath_strategy_info: {
    name: 'toolpath_strategy_info',
    description: 'Get detailed information about a specific strategy',
    parameters: {
      type: 'object',
      properties: {
        strategy_id: { type: 'string', description: 'Strategy ID' }
      },
      required: ['strategy_id']
    },
    handler: toolpath_strategy_info
  },
  
  toolpath_stats: {
    name: 'toolpath_stats',
    description: 'Get toolpath strategy registry statistics',
    parameters: { type: 'object', properties: {} },
    handler: toolpath_stats
  },
  
  toolpath_material_strategies: {
    name: 'toolpath_material_strategies',
    description: 'Get strategies suitable for a specific material',
    parameters: {
      type: 'object',
      properties: {
        material: { type: 'string', description: 'Material name' },
        operation: { type: 'string', enum: ['roughing', 'finishing', 'both'], description: 'Filter by operation type' }
      },
      required: ['material']
    },
    handler: toolpath_material_strategies
  },
  
  toolpath_prism_novel: {
    name: 'toolpath_prism_novel',
    description: 'Get PRISM-invented novel strategies',
    parameters: {
      type: 'object',
      properties: {
        subcategory: { type: 'string', enum: ['ai', 'hybrid', 'physics', 'optimization', 'specialized'], description: 'Filter by subcategory' }
      }
    },
    handler: toolpath_prism_novel
  }
};

export default TOOLPATH_TOOLS;

/**
 * Register all toolpath strategy tools with the MCP server
 */
export function registerToolpathTools(server: any): void {
  const tools = Object.values(TOOLPATH_TOOLS);
  for (const tool of tools) {
    server.tool(
      tool.name,
      tool.description,
      tool.parameters,
      async (params: any) => {
        const result = await tool.handler(params);
        return {
          content: [{ type: "text", text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }],
          metadata: result
        };
      }
    );
  }
  console.log("Registered: Toolpath Strategy tools (8 tools)");
}
