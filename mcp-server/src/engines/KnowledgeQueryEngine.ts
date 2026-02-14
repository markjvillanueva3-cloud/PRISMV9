/**
 * PRISM MCP Server - Knowledge Query Engine
 * Session 5.3: Unified Knowledge Access
 * 
 * Features:
 * - Cross-registry unified search
 * - Formula lookup with parameter matching
 * - Knowledge graph relationships
 * - Semantic similarity scoring
 * - Query planning and optimization
 * - Cached results with TTL
 * 
 * @version 1.0.0
 * @author PRISM Development Team
 */

import { log } from "../utils/Logger.js";
import { registryManager } from "../registries/index.js";
import { formulaRegistry, Formula, FormulaCategory } from "../registries/FormulaRegistry.js";
import { materialRegistry, Material } from "../registries/MaterialRegistry.js";
import { machineRegistry, Machine } from "../registries/MachineRegistry.js";
import { toolRegistry, CuttingTool } from "../registries/ToolRegistry.js";
import { alarmRegistry, Alarm } from "../registries/AlarmRegistry.js";
import { skillRegistry, Skill } from "../registries/SkillRegistry.js";
import { scriptRegistry, Script } from "../registries/ScriptRegistry.js";
import { agentRegistry, Agent } from "../registries/AgentRegistry.js";
import { hookRegistry, Hook } from "../registries/HookRegistry.js";
import { eventBus } from "./EventBus.js";

// ============================================================================
// TYPES
// ============================================================================

export type RegistryType = 
  | "materials" | "machines" | "tools" | "alarms" 
  | "formulas" | "skills" | "scripts" | "agents" | "hooks";

export interface UnifiedSearchResult {
  registry: RegistryType;
  id: string;
  name: string;
  relevance_score: number;
  match_type: "exact" | "partial" | "semantic";
  match_field: string;
  summary: string;
  data: unknown;
}

export interface CrossRegistryQuery {
  task: string;
  required_registries?: RegistryType[];
  context?: {
    material_id?: string;
    machine_id?: string;
    operation?: string;
  };
}

export interface CrossRegistryResult {
  task: string;
  results: {
    materials?: Material[];
    machines?: Machine[];
    tools?: CuttingTool[];
    formulas?: Formula[];
    skills?: Skill[];
    scripts?: Script[];
    agents?: Agent[];
    alarms?: Alarm[];
  };
  relationships: KnowledgeRelation[];
  suggested_workflow: string[];
}

export interface FormulaQueryResult {
  formula: Formula;
  match_score: number;
  match_reasons: string[];
  required_inputs: string[];
  related_formulas: string[];
  applicable_materials?: string[];
}

export interface KnowledgeRelation {
  source_registry: RegistryType;
  source_id: string;
  target_registry: RegistryType;
  target_id: string;
  relation_type: "uses" | "requires" | "produces" | "related" | "depends_on";
  strength: number;  // 0-1
}

export interface QueryPlan {
  steps: QueryStep[];
  estimated_results: number;
  registries_involved: RegistryType[];
}

export interface QueryStep {
  registry: RegistryType;
  operation: "search" | "filter" | "join" | "rank";
  params: Record<string, unknown>;
}

export interface KnowledgeEngineConfig {
  max_results_per_registry: number;
  min_relevance_score: number;
  enable_cache: boolean;
  cache_ttl_ms: number;
  max_cache_entries: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: KnowledgeEngineConfig = {
  max_results_per_registry: 20,
  min_relevance_score: 0.2,
  enable_cache: true,
  cache_ttl_ms: 300000,  // 5 minutes
  max_cache_entries: 100
};

// Registry search patterns
const REGISTRY_PATTERNS: Record<RegistryType, RegExp[]> = {
  materials: [/material/i, /steel/i, /aluminum/i, /alloy/i, /titanium/i, /inconel/i, /hardness/i],
  machines: [/machine/i, /cnc/i, /mill/i, /lathe/i, /dmg/i, /mazak/i, /haas/i, /spindle/i],
  tools: [/tool/i, /insert/i, /end\s*mill/i, /drill/i, /cutter/i, /carbide/i, /coating/i],
  alarms: [/alarm/i, /error/i, /fault/i, /warning/i, /code/i, /troubleshoot/i],
  formulas: [/formula/i, /calculate/i, /equation/i, /kienzle/i, /taylor/i, /force/i, /speed/i, /feed/i],
  skills: [/skill/i, /knowledge/i, /how\s*to/i, /guide/i, /process/i, /workflow/i],
  scripts: [/script/i, /automate/i, /execute/i, /run/i, /batch/i, /sync/i],
  agents: [/agent/i, /ai/i, /analyze/i, /expert/i, /advisor/i],
  hooks: [/hook/i, /event/i, /trigger/i, /callback/i, /lifecycle/i]
};

// Cross-registry relationships
const REGISTRY_RELATIONSHIPS: Record<RegistryType, RegistryType[]> = {
  materials: ["formulas", "tools", "machines", "alarms"],
  machines: ["materials", "tools", "alarms", "formulas"],
  tools: ["materials", "machines", "formulas"],
  alarms: ["machines", "materials"],
  formulas: ["materials", "machines", "tools", "skills"],
  skills: ["formulas", "scripts", "agents"],
  scripts: ["skills", "agents"],
  agents: ["skills", "scripts", "hooks"],
  hooks: ["agents", "skills"]
};

// Formula domain mapping
const FORMULA_DOMAINS: Record<string, FormulaCategory[]> = {
  cutting: ["cutting_force", "cutting_speed", "tool_life"],
  thermal: ["thermal_analysis"],
  surface: ["surface_finish"],
  stability: ["stability_analysis", "deflection"],
  optimization: ["optimization", "efficiency"],
  cost: ["cost_analysis"]
};

// ============================================================================
// KNOWLEDGE QUERY ENGINE
// ============================================================================

export class KnowledgeQueryEngine {
  private config: KnowledgeEngineConfig;
  private cache: Map<string, { result: unknown; timestamp: number }>;
  private initialized: boolean = false;

  constructor(config: Partial<KnowledgeEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new Map();
  }

  /**
   * Initialize the knowledge engine
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    log.info("Initializing KnowledgeQueryEngine...");

    // Initialize all registries
    await registryManager.initialize();

    this.initialized = true;
    log.info("KnowledgeQueryEngine initialized");

    await eventBus.publish("knowledge_engine.initialized", { registries: 9 }, { source: "KnowledgeQueryEngine" });
  }

  // ==========================================================================
  // UNIFIED SEARCH
  // ==========================================================================

  /**
   * Search across all registries with unified results
   */
  async unifiedSearch(
    query: string,
    options?: {
      registries?: RegistryType[];
      limit?: number;
      min_score?: number;
    }
  ): Promise<UnifiedSearchResult[]> {
    await this.initialize();

    const cacheKey = `unified:${query}:${JSON.stringify(options)}`;
    const cached = this.getFromCache<UnifiedSearchResult[]>(cacheKey);
    if (cached) return cached;

    const registries = options?.registries || this.detectRelevantRegistries(query);
    const limit = options?.limit || this.config.max_results_per_registry;
    const minScore = options?.min_score || this.config.min_relevance_score;

    const results: UnifiedSearchResult[] = [];

    for (const registry of registries) {
      const registryResults = await this.searchRegistry(registry, query, limit);
      results.push(...registryResults);
    }

    // Sort by relevance and filter
    const filtered = results
      .filter(r => r.relevance_score >= minScore)
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit * 2);  // Allow 2x for cross-registry

    this.setCache(cacheKey, filtered);
    return filtered;
  }

  /**
   * Search a specific registry
   */
  private async searchRegistry(
    registry: RegistryType,
    query: string,
    limit: number
  ): Promise<UnifiedSearchResult[]> {
    const results: UnifiedSearchResult[] = [];
    const queryLower = query.toLowerCase();

    switch (registry) {
      case "materials": {
        const materials = await materialRegistry.search({ query, limit });
        for (const m of materials.materials) {
          const extraContext = [m.material_type, m.iso_group, m.material_id, m.category].filter(Boolean).join(" ");
          results.push({
            registry: "materials",
            id: m.material_id,
            name: m.name,
            relevance_score: this.calculateRelevance(query, m.name, extraContext),
            match_type: this.getMatchType(queryLower, m.name.toLowerCase()),
            match_field: "name",
            summary: `${m.iso_group} | ${m.category} | Hardness: ${m.hardness_min}-${m.hardness_max} HB`,
            data: m
          });
        }
        break;
      }

      case "machines": {
        const machineResult = machineRegistry.search({ query, limit });
        for (const m of machineResult.machines) {
          const extraContext = [m.manufacturer, m.model, m.type, m.machine_id].filter(Boolean).map(String).join(" ");
          results.push({
            registry: "machines",
            id: m.machine_id,
            name: m.name,
            relevance_score: this.calculateRelevance(query, m.name || "", extraContext),
            match_type: this.getMatchType(queryLower, (m.name || "").toLowerCase()),
            match_field: "name",
            summary: `${m.manufacturer || "?"} | ${m.type || "?"} | ${m.controller || "?"}`,
            data: m
          });
        }
        break;
      }

      case "tools": {
        const toolResult = toolRegistry.search({ query, limit });
        for (const t of toolResult.tools) {
          const extraContext = [t.type, t.manufacturer, t.substrate, t.catalog_number, t.tool_id].filter(Boolean).map(String).join(" ");
          results.push({
            registry: "tools",
            id: t.tool_id,
            name: t.name,
            relevance_score: this.calculateRelevance(query, t.name || "", extraContext),
            match_type: this.getMatchType(queryLower, (t.name || "").toLowerCase()),
            match_field: "name",
            summary: `${t.type || "?"} | ${t.material || "?"} | D${t.diameter || "?"}mm`,
            data: t
          });
        }
        break;
      }

      case "alarms": {
        const alarms = await alarmRegistry.search({ query, limit });
        for (const a of alarms.alarms) {
          results.push({
            registry: "alarms",
            id: a.alarm_id,
            name: a.name,
            relevance_score: this.calculateRelevance(query, a.name, [a.description, a.code, a.controller_family, a.severity].filter(Boolean).join(" ")),
            match_type: this.getMatchType(queryLower, a.code.toLowerCase()),
            match_field: a.code.toLowerCase().includes(queryLower) ? "code" : "name",
            summary: `${a.controller_family} | ${a.code} | ${a.severity}`,
            data: a
          });
        }
        break;
      }

      case "formulas": {
        const queryLC = query.toLowerCase();
        const formulaResults = formulaRegistry.search((f: any) => 
          f.name?.toLowerCase().includes(queryLC) ||
          f.formula_id?.toLowerCase().includes(queryLC) ||
          f.category?.toLowerCase().includes(queryLC) ||
          f.description?.toLowerCase().includes(queryLC) ||
          f.domain?.toLowerCase().includes(queryLC)
        );
        const formulas = { formulas: formulaResults.slice(0, limit) };
        for (const f of formulas.formulas) {
          results.push({
            registry: "formulas",
            id: f.formula_id,
            name: f.name,
            relevance_score: this.calculateRelevance(query, f.name, f.description),
            match_type: this.getMatchType(queryLower, f.name.toLowerCase()),
            match_field: "name",
            summary: `${f.category} | ${(f.equation || f.latex_formula || "").slice(0, 50)}...`,
            data: f
          });
        }
        break;
      }

      case "skills": {
        const skills = await skillRegistry.search({ query, limit });
        for (const s of skills.skills) {
          results.push({
            registry: "skills",
            id: s.skill_id,
            name: s.name,
            relevance_score: this.calculateRelevance(query, s.name, s.description),
            match_type: this.getMatchType(queryLower, s.name.toLowerCase()),
            match_field: "name",
            summary: `${s.category} | ${s.lines} lines | Priority ${s.priority}`,
            data: s
          });
        }
        break;
      }

      case "scripts": {
        const scripts = await scriptRegistry.search({ query, limit });
        for (const s of scripts.scripts) {
          results.push({
            registry: "scripts",
            id: s.script_id,
            name: s.name,
            relevance_score: this.calculateRelevance(query, s.name, s.description),
            match_type: this.getMatchType(queryLower, s.name.toLowerCase()),
            match_field: "name",
            summary: `${s.category} | ${s.language} | ${s.lines} lines`,
            data: s
          });
        }
        break;
      }

      case "agents": {
        const agents = await agentRegistry.search({ query, limit });
        for (const a of agents.agents) {
          results.push({
            registry: "agents",
            id: a.agent_id,
            name: a.name,
            relevance_score: this.calculateRelevance(query, a.name, a.description),
            match_type: this.getMatchType(queryLower, a.name.toLowerCase()),
            match_field: "name",
            summary: `${a.category} | ${a.type} | ${a.capabilities?.length || 0} capabilities`,
            data: a
          });
        }
        break;
      }

      case "hooks": {
        const hooks = await hookRegistry.search({ query, limit });
        for (const h of hooks.hooks) {
          results.push({
            registry: "hooks",
            id: h.hook_id,
            name: h.name,
            relevance_score: this.calculateRelevance(query, h.name, h.description),
            match_type: this.getMatchType(queryLower, h.name.toLowerCase()),
            match_field: "name",
            summary: `${h.phase} | ${h.priority} priority`,
            data: h
          });
        }
        break;
      }
    }

    return results;
  }

  /**
   * Detect which registries are relevant for a query
   */
  private detectRelevantRegistries(query: string): RegistryType[] {
    const relevant: Set<RegistryType> = new Set();

    for (const [registry, patterns] of Object.entries(REGISTRY_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(query)) {
          relevant.add(registry as RegistryType);
          break;
        }
      }
    }

    // If no specific match, search all
    if (relevant.size === 0) {
      return Object.keys(REGISTRY_PATTERNS) as RegistryType[];
    }

    // Add related registries
    for (const reg of [...relevant]) {
      const related = REGISTRY_RELATIONSHIPS[reg] || [];
      related.forEach(r => relevant.add(r));
    }

    return Array.from(relevant);
  }

  // ==========================================================================
  // CROSS-REGISTRY QUERIES
  // ==========================================================================

  /**
   * Execute a cross-registry query for a manufacturing task
   */
  async crossRegistryQuery(query: CrossRegistryQuery): Promise<CrossRegistryResult> {
    await this.initialize();

    const result: CrossRegistryResult = {
      task: query.task,
      results: {},
      relationships: [],
      suggested_workflow: []
    };

    const taskLower = query.task.toLowerCase();

    // Determine registries to search
    const registries = query.required_registries || this.detectRelevantRegistries(query.task);

    // Search each registry
    for (const registry of registries) {
      const searchResults = await this.searchRegistry(registry, query.task, 5);
      
      if (searchResults.length > 0) {
        switch (registry) {
          case "materials":
            result.results.materials = searchResults.map(r => r.data as Material);
            break;
          case "machines":
            result.results.machines = searchResults.map(r => r.data as Machine);
            break;
          case "tools":
            result.results.tools = searchResults.map(r => r.data as CuttingTool);
            break;
          case "formulas":
            result.results.formulas = searchResults.map(r => r.data as Formula);
            break;
          case "skills":
            result.results.skills = searchResults.map(r => r.data as Skill);
            break;
          case "scripts":
            result.results.scripts = searchResults.map(r => r.data as Script);
            break;
          case "agents":
            result.results.agents = searchResults.map(r => r.data as Agent);
            break;
          case "alarms":
            result.results.alarms = searchResults.map(r => r.data as Alarm);
            break;
        }
      }
    }

    // Build relationships
    result.relationships = this.buildRelationships(result.results);

    // Generate suggested workflow
    result.suggested_workflow = this.generateWorkflow(query.task, result.results);

    return result;
  }

  /**
   * Build relationships between cross-registry results
   */
  private buildRelationships(results: CrossRegistryResult["results"]): KnowledgeRelation[] {
    const relations: KnowledgeRelation[] = [];

    // Materials → Formulas
    if (results.materials && results.formulas) {
      for (const m of results.materials) {
        for (const f of results.formulas) {
          if (f.category === "cutting_force" || f.category === "tool_life") {
            relations.push({
              source_registry: "materials",
              source_id: m.material_id,
              target_registry: "formulas",
              target_id: f.formula_id,
              relation_type: "uses",
              strength: 0.8
            });
          }
        }
      }
    }

    // Machines → Alarms
    if (results.machines && results.alarms) {
      for (const m of results.machines) {
        for (const a of results.alarms) {
          if (a.controller_family?.toLowerCase().includes(m.controller?.toLowerCase() || "")) {
            relations.push({
              source_registry: "machines",
              source_id: m.machine_id,
              target_registry: "alarms",
              target_id: a.alarm_id,
              relation_type: "related",
              strength: 0.7
            });
          }
        }
      }
    }

    // Skills → Scripts
    if (results.skills && results.scripts) {
      for (const sk of results.skills) {
        for (const sc of results.scripts) {
          const commonTags = sk.tags?.filter(t => sc.tags?.includes(t)) || [];
          if (commonTags.length > 0) {
            relations.push({
              source_registry: "skills",
              source_id: sk.skill_id,
              target_registry: "scripts",
              target_id: sc.script_id,
              relation_type: "related",
              strength: Math.min(0.9, 0.3 + commonTags.length * 0.2)
            });
          }
        }
      }
    }

    return relations;
  }

  /**
   * Generate a suggested workflow based on results
   */
  private generateWorkflow(task: string, results: CrossRegistryResult["results"]): string[] {
    const workflow: string[] = [];

    // Material selection first
    if (results.materials?.length) {
      workflow.push(`1. Select material: ${results.materials[0].name} (${results.materials[0].material_id})`);
    }

    // Then machine
    if (results.machines?.length) {
      workflow.push(`2. Configure machine: ${results.machines[0].name}`);
    }

    // Tool selection
    if (results.tools?.length) {
      workflow.push(`3. Select tooling: ${results.tools[0].name}`);
    }

    // Apply formulas
    if (results.formulas?.length) {
      workflow.push(`4. Calculate parameters using: ${results.formulas.map(f => f.name).join(", ")}`);
    }

    // Load relevant skills
    if (results.skills?.length) {
      workflow.push(`5. Load skill guidance: ${results.skills.map(s => s.skill_id).join(", ")}`);
    }

    // Run automation
    if (results.scripts?.length) {
      workflow.push(`6. Execute automation: ${results.scripts[0].script_id}`);
    }

    return workflow;
  }

  // ==========================================================================
  // FORMULA QUERIES
  // ==========================================================================

  /**
   * Find formulas for a specific calculation need
   */
  async findFormulas(
    need: string,
    options?: {
      category?: FormulaCategory;
      material_id?: string;
      include_related?: boolean;
    }
  ): Promise<FormulaQueryResult[]> {
    await this.initialize();

    const results: FormulaQueryResult[] = [];
    const needLower = need.toLowerCase();

    // Search formulas
    let formulas = formulaRegistry.search({ 
      query: need, 
      category: options?.category,
      limit: 20 
    }).formulas;

    // Also search by domain if detectable
    for (const [domain, categories] of Object.entries(FORMULA_DOMAINS)) {
      if (needLower.includes(domain)) {
        for (const cat of categories) {
          const catFormulas = formulaRegistry.getByCategory(cat);
          formulas.push(...catFormulas);
        }
      }
    }

    // Dedupe
    const seen = new Set<string>();
    formulas = formulas.filter(f => {
      if (seen.has(f.formula_id)) return false;
      seen.add(f.formula_id);
      return true;
    });

    for (const formula of formulas) {
      const matchReasons: string[] = [];
      let matchScore = 0;

      // Check name match
      if (formula.name.toLowerCase().includes(needLower)) {
        matchScore += 0.4;
        matchReasons.push("Name match");
      }

      // Check description match
      if (formula.description.toLowerCase().includes(needLower)) {
        matchScore += 0.3;
        matchReasons.push("Description match");
      }

      // Check category relevance
      if (options?.category && formula.category === options.category) {
        matchScore += 0.2;
        matchReasons.push("Category match");
      }

      // Check input parameters
      const requiredInputs = formula.inputs.filter(i => i.required).map(i => i.name);

      // Find related formulas
      let relatedFormulas: string[] = [];
      if (options?.include_related) {
        relatedFormulas = this.findRelatedFormulas(formula);
      }

      if (matchScore > 0 || matchReasons.length > 0) {
        results.push({
          formula,
          match_score: matchScore,
          match_reasons: matchReasons.length > 0 ? matchReasons : ["General relevance"],
          required_inputs: requiredInputs,
          related_formulas: relatedFormulas
        });
      }
    }

    return results.sort((a, b) => b.match_score - a.match_score);
  }

  /**
   * Find formulas related to a given formula
   */
  private findRelatedFormulas(formula: Formula): string[] {
    const related: string[] = [];

    // Find formulas in same category
    const sameCategory = formulaRegistry.getByCategory(formula.category);
    for (const f of sameCategory) {
      if (f.formula_id !== formula.formula_id) {
        related.push(f.formula_id);
      }
    }

    // Find formulas that use similar inputs
    const allFormulas = formulaRegistry.all();
    const inputNames = new Set(formula.inputs.map(i => i.name.toLowerCase()));
    
    for (const f of allFormulas) {
      if (f.formula_id === formula.formula_id) continue;
      const fInputs = new Set(f.inputs.map(i => i.name.toLowerCase()));
      const overlap = [...inputNames].filter(i => fInputs.has(i)).length;
      if (overlap >= 2 && !related.includes(f.formula_id)) {
        related.push(f.formula_id);
      }
    }

    return related.slice(0, 5);
  }

  /**
   * Get formula by ID with full details
   */
  getFormula(formulaId: string): Formula | undefined {
    return formulaRegistry.getFormula(formulaId);
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Calculate relevance score
   */
  private calculateRelevance(query: string, name: string, description: string): number {
    const queryLower = query.toLowerCase();
    const nameLower = name.toLowerCase();
    const descLower = description.toLowerCase();

    let score = 0;

    // Exact name match
    if (nameLower === queryLower) {
      score = 1.0;
    }
    // Name starts with query
    else if (nameLower.startsWith(queryLower)) {
      score = 0.9;
    }
    // Name contains query
    else if (nameLower.includes(queryLower)) {
      score = 0.7;
    }
    // Description contains query
    else if (descLower.includes(queryLower)) {
      score = 0.5;
    }
    // Partial word match
    else {
      const queryWords = queryLower.split(/\s+/);
      const matchedWords = queryWords.filter(w => 
        nameLower.includes(w) || descLower.includes(w)
      );
      // Use max of ratio-based and count-based scoring
      // At least 1 word match = minimum 0.3
      const ratioScore = matchedWords.length / queryWords.length * 0.6;
      const countBonus = matchedWords.length > 0 ? 0.3 : 0;
      score = Math.max(ratioScore, countBonus);
    }

    return Math.round(score * 100) / 100;
  }

  /**
   * Get match type
   */
  private getMatchType(query: string, target: string): "exact" | "partial" | "semantic" {
    if (target === query) return "exact";
    if (target.includes(query) || query.includes(target)) return "partial";
    return "semantic";
  }

  /**
   * Get from cache
   */
  private getFromCache<T>(key: string): T | null {
    if (!this.config.enable_cache) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.config.cache_ttl_ms) {
      this.cache.delete(key);
      return null;
    }

    return entry.result as T;
  }

  /**
   * Set cache entry
   */
  private setCache(key: string, value: unknown): void {
    if (!this.config.enable_cache) return;

    // Evict if at max
    if (this.cache.size >= this.config.max_cache_entries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, { result: value, timestamp: Date.now() });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    log.info("Knowledge cache cleared");
  }

  /**
   * Get registry statistics
   */
  async getStats(): Promise<{
    registries: Record<RegistryType, number>;
    total_entries: number;
    cache_size: number;
    cache_hit_rate: number;
  }> {
    await this.initialize();

    const stats: Record<RegistryType, number> = {
      materials: materialRegistry.size,
      machines: machineRegistry.size,
      tools: toolRegistry.size,
      alarms: alarmRegistry.size,
      formulas: formulaRegistry.size,
      skills: skillRegistry.size,
      scripts: scriptRegistry.size,
      agents: agentRegistry.size,
      hooks: hookRegistry.size
    };

    const total = Object.values(stats).reduce((sum, n) => sum + n, 0);

    return {
      registries: stats,
      total_entries: total,
      cache_size: this.cache.size,
      cache_hit_rate: 0  // Would need hit tracking to calculate
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const knowledgeEngine = new KnowledgeQueryEngine();
