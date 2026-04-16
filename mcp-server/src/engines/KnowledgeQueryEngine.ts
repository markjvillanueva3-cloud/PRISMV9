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
import { formulaRegistry, Formula } from "../registries/FormulaRegistry.js";
import { materialRegistry } from "../registries/MaterialRegistry.js";
import { machineRegistry } from "../registries/MachineRegistry.js";
import { toolRegistry } from "../registries/ToolRegistry.js";
import { materialService } from "../services/MaterialService.js";
import { machineService } from "../services/MachineService.js";
import { toolService } from "../services/ToolService.js";
import type { Material } from "../types.js";
import type { Machine } from "../registries/MachineRegistry.js";
import type { CuttingTool } from "../registries/ToolRegistry.js";

/** Local alias -- FormulaCategory is just the string `category` field on Formula. */
type FormulaCategory = string;
// ARCH-MS2 U-DISP04: Migrated materialRegistry→materialService, machineRegistry→machineService,
// toolRegistry→toolService. Remaining registries (formula, alarm, skill, script, agent, hook)
// don't have service wrappers yet — tracked for ARCH-MS3.
import { alarmRegistry, Alarm } from "../registries/AlarmRegistry.js";
import { skillRegistry, Skill } from "../registries/SkillRegistry.js";
import { scriptRegistry, Script } from "../registries/ScriptRegistry.js";
import { agentRegistry, Agent } from "../registries/AgentRegistry.js";
import { hookRegistry, Hook } from "../registries/HookRegistry.js";
import { eventBus } from "./EventBus.js";

// ============================================================================
// TYPES
// ============================================================================

/** Registry Type type definition.
 */
export type RegistryType = 
  | "materials" | "machines" | "tools" | "alarms" 
  | "formulas" | "skills" | "scripts" | "agents" | "hooks";

/** Unified Search Result configuration/data structure.
 */
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

/** Cross Registry Query configuration/data structure.
 */
export interface CrossRegistryQuery {
  task: string;
  required_registries?: RegistryType[];
  context?: {
    material_id?: string;
    machine_id?: string;
    operation?: string;
  };
}

/** Cross Registry Result configuration/data structure.
 */
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

/** Formula Query Result configuration/data structure.
 */
export interface FormulaQueryResult {
  formula: Formula;
  match_score: number;
  match_reasons: string[];
  required_inputs: string[];
  related_formulas: string[];
  applicable_materials?: string[];
}

/** Knowledge Relation configuration/data structure.
 */
export interface KnowledgeRelation {
  source_registry: RegistryType;
  source_id: string;
  target_registry: RegistryType;
  target_id: string;
  relation_type: "uses" | "requires" | "produces" | "related" | "depends_on";
  strength: number;  // 0-1
}

/** Query Plan configuration/data structure.
 */
export interface QueryPlan {
  steps: QueryStep[];
  estimated_results: number;
  registries_involved: RegistryType[];
}

/** Query Step configuration/data structure.
 */
export interface QueryStep {
  registry: RegistryType;
  operation: "search" | "filter" | "join" | "rank";
  params: Record<string, unknown>;
}

/** Knowledge Engine Config configuration/data structure.
 */
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

// M-021: Stop words excluded from TF-IDF tokenization (common English + manufacturing filler)
const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "shall",
  "should", "may", "might", "must", "can", "could", "of", "in", "to",
  "for", "with", "on", "at", "from", "by", "as", "or", "and", "but",
  "if", "not", "no", "so", "it", "its", "this", "that", "these", "those",
  "all", "any", "each", "every", "both", "few", "more", "most", "other",
  "some", "such", "than", "too", "very", "just", "also", "only", "then",
  "about", "up", "out", "into", "over", "after", "before", "between",
]);

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
// EXTRACTED SOURCE FILE CATALOG — MEDIUM-priority knowledge-base modules
// Wired 2026-02-23 from MASTER_EXTRACTION_INDEX_V2 (27-file batch)
// Same 12 knowledge_bases files shared with KnowledgeGraphEngine; each engine
// owns its own copy so there are no cross-engine import dependencies.
// ============================================================================

/** K N O W L E D G E_ Q U E R Y_ S O U R C E_ F I L E_ C A T A L O G constant.
 */
export const KNOWLEDGE_QUERY_SOURCE_FILE_CATALOG: Record<string, {
  filename: string;
  source_dir: string;
  category: string;
  lines: number;
  safety_class: "MEDIUM";
  description: string;
}> = {
  PRISM_220_COURSES_MASTER: {
    filename: "PRISM_220_COURSES_MASTER.js",
    source_dir: "extracted/knowledge_bases",
    category: "knowledge_bases",
    lines: 321,
    safety_class: "MEDIUM",
    description: "220-course manufacturing curriculum master index — topic trees, prerequisite graphs, and learning-path metadata for CNC/CAM training.",
  },
  PRISM_AI_STRUCTURES_KB: {
    filename: "PRISM_AI_STRUCTURES_KB.js",
    source_dir: "extracted/knowledge_bases",
    category: "knowledge_bases",
    lines: 13,
    safety_class: "MEDIUM",
    description: "AI data structures knowledge base — compact reference of neural-network, tree, and graph structures used by PRISM inference modules.",
  },
  PRISM_ALGORITHMS_KB: {
    filename: "PRISM_ALGORITHMS_KB.js",
    source_dir: "extracted/knowledge_bases",
    category: "knowledge_bases",
    lines: 2292,
    safety_class: "MEDIUM",
    description: "Algorithms knowledge base — comprehensive library of sorting, searching, optimization, and graph algorithms with manufacturing-specific applications.",
  },
  PRISM_DATA_STRUCTURES_KB: {
    filename: "PRISM_DATA_STRUCTURES_KB.js",
    source_dir: "extracted/knowledge_bases",
    category: "knowledge_bases",
    lines: 47,
    safety_class: "MEDIUM",
    description: "Data structures knowledge base — reference implementations of queues, heaps, hash maps, and spatial indexes for shop-floor data management.",
  },
  PRISM_KNOWLEDGE_AI_CONNECTOR: {
    filename: "PRISM_KNOWLEDGE_AI_CONNECTOR.js",
    source_dir: "extracted/knowledge_bases",
    category: "knowledge_bases",
    lines: 101,
    safety_class: "MEDIUM",
    description: "Knowledge-AI connector — bridge module linking the knowledge graph to AI inference pipelines for context-aware query enrichment.",
  },
  PRISM_KNOWLEDGE_BASE: {
    filename: "PRISM_KNOWLEDGE_BASE.js",
    source_dir: "extracted/knowledge_bases",
    category: "knowledge_bases",
    lines: 620,
    safety_class: "MEDIUM",
    description: "Core knowledge base — foundational manufacturing facts, process rules, and constraint tables consumed by all PRISM engines.",
  },
  PRISM_KNOWLEDGE_FUSION: {
    filename: "PRISM_KNOWLEDGE_FUSION.js",
    source_dir: "extracted/knowledge_bases",
    category: "knowledge_bases",
    lines: 143,
    safety_class: "MEDIUM",
    description: "Knowledge fusion engine — merges overlapping facts from multiple KB sources, resolves conflicts, and produces a unified truth set.",
  },
  PRISM_KNOWLEDGE_GRAPH: {
    filename: "PRISM_KNOWLEDGE_GRAPH.js",
    source_dir: "extracted/knowledge_bases",
    category: "knowledge_bases",
    lines: 268,
    safety_class: "MEDIUM",
    description: "Knowledge graph builder — constructs typed node/edge relationships between materials, tools, machines, and process parameters.",
  },
  PRISM_KNOWLEDGE_INTEGRATION_ROUTES: {
    filename: "PRISM_KNOWLEDGE_INTEGRATION_ROUTES.js",
    source_dir: "extracted/knowledge_bases",
    category: "knowledge_bases",
    lines: 138,
    safety_class: "MEDIUM",
    description: "Knowledge integration routes — API endpoint definitions for querying, updating, and synchronizing the distributed knowledge graph.",
  },
  PRISM_MFG_STRUCTURES_KB: {
    filename: "PRISM_MFG_STRUCTURES_KB.js",
    source_dir: "extracted/knowledge_bases",
    category: "knowledge_bases",
    lines: 21,
    safety_class: "MEDIUM",
    description: "Manufacturing structures knowledge base — BOM hierarchies, assembly relationships, and fixture/tooling dependency graphs.",
  },
  PRISM_SYSTEMS_KB: {
    filename: "PRISM_SYSTEMS_KB.js",
    source_dir: "extracted/knowledge_bases",
    category: "knowledge_bases",
    lines: 26,
    safety_class: "MEDIUM",
    description: "Systems knowledge base — machine-tool system architectures, CNC controller taxonomies, and servo-loop parameter references.",
  },
  PRISM_UNIVERSITY_ALGORITHMS: {
    filename: "PRISM_UNIVERSITY_ALGORITHMS.js",
    source_dir: "extracted/knowledge_bases",
    category: "knowledge_bases",
    lines: 4935,
    safety_class: "MEDIUM",
    description: "University algorithms compendium — MIT/Stanford/Georgia Tech sourced algorithms for optimization, scheduling, and manufacturing process modeling.",
  },
};

// ============================================================================
// KNOWLEDGE QUERY ENGINE
// ============================================================================

/** Knowledge Query Engine engine/manager.
 */
export class KnowledgeQueryEngine {
  private config: KnowledgeEngineConfig;
  private cache: Map<string, { result: unknown; timestamp: number }>;
  private initialized: boolean = false;

  /** M-021: TF-IDF inverse document frequency cache — maps term → log(N/df) */
  private idfCache: Map<string, number> = new Map();
  private idfCorpusSize: number = 0;
  private idfBuiltAt: number = 0;
  private static readonly IDF_TTL_MS = 600000; // 10 min

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

    // Initialize core registries (ARCH-MS2: direct registry imports replace registryManager)
    await Promise.all([
      materialRegistry.load().catch(() => {}),
      machineRegistry.load().catch(() => {}),
      toolRegistry.load().catch(() => {}),
      formulaRegistry.load().catch(() => {}),
    ]);

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
    await this.ensureIdfIndex();  // M-021: lazy-build TF-IDF corpus

    const cacheKey = `unified:${query}:${JSON.stringify(options)}`;
    const cached = this.getFromCache<UnifiedSearchResult[]>(cacheKey);
    if (cached) return cached;

    const registries = options?.registries || this.detectRelevantRegistries(query);
    const limit = options?.limit || this.config.max_results_per_registry;
    const minScore = options?.min_score || this.config.min_relevance_score;

    const results: UnifiedSearchResult[] = [];

    /** For.
     * @param const - const
     * @returns void
     */
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

    /** Switch.
     * @param registry - registry
     * @returns void
     */
    switch (registry) {
      case "materials": {
        const materials = await materialService.search({ query, limit });
        /** For.
         * @param const - const
         * @returns void
         */
        for (const m of materials) {
          const mRec = m as unknown as Record<string, unknown>;
          const extraContext = [mRec.material_type, m.iso_group, (mRec.material_id as string) ?? m.id, m.category].filter(Boolean).join(" ");
          results.push({
            registry: "materials",
            id: (mRec.material_id as string) ?? m.id,
            name: m.name,
            relevance_score: this.calculateRelevance(query, m.name, extraContext),
            match_type: this.getMatchType(queryLower, m.name.toLowerCase()),
            match_field: "name",
            summary: `${m.iso_group} | ${m.category} | Hardness: ${(mRec.hardness_min as number) ?? "?"}-${(mRec.hardness_max as number) ?? "?"} HB`,
            data: m
          });
        }
        break;
      }

      case "machines": {
        const machineResults = machineService.search({ query, limit });
        /** For.
         * @param const - const
         * @returns void
         */
        for (const m of machineResults) {
          const mMachRec = m as unknown as Record<string, unknown>;
          const extraContext = [m.manufacturer, m.model, m.type, (mMachRec.machine_id as string) ?? m.id].filter(Boolean).map(String).join(" ");
          results.push({
            registry: "machines",
            id: (mMachRec.machine_id as string) ?? m.id,
            name: m.name ?? `${m.manufacturer} ${m.model}`,
            relevance_score: this.calculateRelevance(query, m.name || `${m.manufacturer} ${m.model}`, extraContext),
            match_type: this.getMatchType(queryLower, (m.name || `${m.manufacturer} ${m.model}`).toLowerCase()),
            match_field: "name",
            summary: `${m.manufacturer || "?"} | ${m.type || "?"} | ${m.controller || "?"}`,
            data: m
          });
        }
        break;
      }

      case "tools": {
        const toolResults = toolService.search({ query, limit });
        /** For.
         * @param const - const
         * @returns void
         */
        for (const t of toolResults) {
          const tRec = t as unknown as Record<string, unknown>;
          const extraContext = [t.type, t.manufacturer, t.substrate, t.catalog_number, (tRec.tool_id as string) ?? t.id].filter(Boolean).map(String).join(" ");
          results.push({
            registry: "tools",
            id: (tRec.tool_id as string) ?? t.id,
            name: t.name,
            relevance_score: this.calculateRelevance(query, t.name || "", extraContext),
            match_type: this.getMatchType(queryLower, (t.name || "").toLowerCase()),
            match_field: "name",
            summary: `${t.type || "?"} | ${(tRec.material as string) ?? t.substrate ?? "?"} | D${(tRec.diameter as number) ?? t.geometry?.diameter ?? "?"}mm`,
            data: t
          });
        }
        break;
      }

      case "alarms": {
        const alarms = await alarmRegistry.search({ query, limit });
        /** For.
         * @param const - const
         * @returns void
         */
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
        const allFormulas = await formulaRegistry.list({ limit: 200 });
        const formulaResults = allFormulas.formulas.filter((f: any) => 
          f.name?.toLowerCase().includes(queryLC) ||
          f.formula_id?.toLowerCase().includes(queryLC) ||
          f.category?.toLowerCase().includes(queryLC) ||
          f.description?.toLowerCase().includes(queryLC) ||
          f.domain?.toLowerCase().includes(queryLC)
        );
        const formulas = { formulas: formulaResults.slice(0, limit) };
        /** For.
         * @param const - const
         * @returns void
         */
        for (const f of formulas.formulas) {
          results.push({
            registry: "formulas",
            id: f.formula_id,
            name: f.name,
            relevance_score: this.calculateRelevance(query, f.name, f.description),
            match_type: this.getMatchType(queryLower, f.name.toLowerCase()),
            match_field: "name",
            summary: `${f.category} | ${(f.equation || ((f as unknown as Record<string, unknown>).latex_formula as string) || "").slice(0, 50)}...`,
            data: f
          });
        }
        break;
      }

      case "skills": {
        const skills = await skillRegistry.search({ query, limit });
        /** For.
         * @param const - const
         * @returns void
         */
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
        /** For.
         * @param const - const
         * @returns void
         */
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
        /** For.
         * @param const - const
         * @returns void
         */
        for (const a of agents.agents) {
          results.push({
            registry: "agents",
            id: a.agent_id,
            name: a.name,
            relevance_score: this.calculateRelevance(query, a.name, a.description),
            match_type: this.getMatchType(queryLower, a.name.toLowerCase()),
            match_field: "name",
            summary: `${a.category} | ${((a as unknown as Record<string, unknown>).type as string) ?? a.category} | ${a.capabilities?.length || 0} capabilities`,
            data: a
          });
        }
        break;
      }

      case "hooks": {
        const hooks = await hookRegistry.search({ query, limit });
        /** For.
         * @param const - const
         * @returns void
         */
        for (const h of hooks.hooks) {
          results.push({
            registry: "hooks",
            id: h.hook_id,
            name: h.name,
            relevance_score: this.calculateRelevance(query, h.name, h.description),
            match_type: this.getMatchType(queryLower, h.name.toLowerCase()),
            match_field: "name",
            summary: `${((h as unknown as Record<string, unknown>).phase as string) ?? h.timing} | ${h.priority} priority`,
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
      /** For.
       * @param const - const
       * @returns void
       */
      for (const pattern of patterns) {
        if (pattern.test(query)) {
          relevant.add(registry as RegistryType);
          break;
        }
      }
    }

    // If no specific match, search all
    /** If.
     * @param relevant.size - relevant.size
     * @returns void
     */
    if (relevant.size === 0) {
      return Object.keys(REGISTRY_PATTERNS) as RegistryType[];
    }

    // Add related registries
    /** For.
     * @param const - const
     * @returns void
     */
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
    await this.ensureIdfIndex();  // M-021: TF-IDF corpus

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
    /** For.
     * @param const - const
     * @returns void
     */
    for (const registry of registries) {
      const searchResults = await this.searchRegistry(registry, query.task, 5);
      
      /** If.
       * @param searchResults.length - search results.length
       * @returns void
       */
      if (searchResults.length > 0) {
        /** Switch.
         * @param registry - registry
         * @returns void
         */
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
    /** If.
     * @param results.materials - results.materials
     * @returns void
     */
    if (results.materials && results.formulas) {
      /** For.
       * @param const - const
       * @returns void
       */
      for (const m of results.materials) {
        /** For.
         * @param const - const
         * @returns void
         */
        for (const f of results.formulas) {
          /** If.
           * @param f.category - f.category
           * @returns void
           */
          if (f.category === "cutting_force" || f.category === "tool_life") {
            relations.push({
              source_registry: "materials",
              source_id: m.material_id ?? m.id,
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
    /** If.
     * @param results.machines - results.machines
     * @returns void
     */
    if (results.machines && results.alarms) {
      /** For.
       * @param const - const
       * @returns void
       */
      for (const m of results.machines) {
        /** For.
         * @param const - const
         * @returns void
         */
        for (const a of results.alarms) {
          if (a.controller_family?.toLowerCase().includes(String(m.controller || "").toLowerCase())) {
            relations.push({
              source_registry: "machines",
              source_id: ((m as unknown as Record<string, unknown>).machine_id as string) ?? m.id,
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
    /** If.
     * @param results.skills - results.skills
     * @returns void
     */
    if (results.skills && results.scripts) {
      /** For.
       * @param const - const
       * @returns void
       */
      for (const sk of results.skills) {
        /** For.
         * @param const - const
         * @returns void
         */
        for (const sc of results.scripts) {
          const commonTags = sk.tags?.filter(t => sc.tags?.includes(t)) || [];
          /** If.
           * @param commonTags.length - common tags.length
           * @returns void
           */
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
    /** If.
     * @param results.materials?.length - results.materials?.length
     * @returns void
     */
    if (results.materials?.length) {
      workflow.push(`1. Select material: ${results.materials[0].name} (${results.materials[0].material_id})`);
    }

    // Then machine
    /** If.
     * @param results.machines?.length - results.machines?.length
     * @returns void
     */
    if (results.machines?.length) {
      workflow.push(`2. Configure machine: ${results.machines[0].name}`);
    }

    // Tool selection
    /** If.
     * @param results.tools?.length - results.tools?.length
     * @returns void
     */
    if (results.tools?.length) {
      workflow.push(`3. Select tooling: ${results.tools[0].name}`);
    }

    // Apply formulas
    /** If.
     * @param results.formulas?.length - results.formulas?.length
     * @returns void
     */
    if (results.formulas?.length) {
      workflow.push(`4. Calculate parameters using: ${results.formulas.map(f => f.name).join(", ")}`);
    }

    // Load relevant skills
    /** If.
     * @param results.skills?.length - results.skills?.length
     * @returns void
     */
    if (results.skills?.length) {
      workflow.push(`5. Load skill guidance: ${results.skills.map(s => s.skill_id).join(", ")}`);
    }

    // Run automation
    /** If.
     * @param results.scripts?.length - results.scripts?.length
     * @returns void
     */
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

    // Search formulas via list (registry has list, not search)
    let formulaResult = await formulaRegistry.list({ 
      category: options?.category,
      limit: 50 
    });
    let formulas = formulaResult.formulas;

    // Also search by domain if detectable
    for (const [domain, categories] of Object.entries(FORMULA_DOMAINS)) {
      if (needLower.includes(domain)) {
        /** For.
         * @param const - const
         * @returns void
         */
        for (const cat of categories) {
          const catFormulas = await formulaRegistry.getByCategory(cat);
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

    /** For.
     * @param const - const
     * @returns void
     */
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
      /** If.
       * @param options?.category - options?.category
       * @returns void
       */
      if (options?.category && formula.category === options.category) {
        matchScore += 0.2;
        matchReasons.push("Category match");
      }

      // Check input parameters
      const rec = formula as unknown as Record<string, unknown>;
      const requiredInputs = (((formula as any).inputs as Array<Record<string, unknown>>) ?? formula.parameters ?? []).filter((i: Record<string, unknown>) => i.required ?? i.type === "input").map((i: Record<string, unknown>) => i.name as string);

      // Find related formulas
      let relatedFormulas: string[] = [];
      /** If.
       * @param options?.include_related - options?.include_related
       * @returns void
       */
      if (options?.include_related) {
        relatedFormulas = await this.findRelatedFormulas(formula);
      }

      /** If.
       * @param matchScore - match score
       * @returns void
       */
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
  private async findRelatedFormulas(formula: Formula): Promise<string[]> {
    const related: string[] = [];

    // Find formulas in same category
    const sameCategory = await formulaRegistry.getByCategory(formula.category);
    /** For.
     * @param const - const
     * @returns void
     */
    for (const f of sameCategory) {
      /** If.
       * @param f.formula_id - f.formula_id
       * @returns void
       */
      if (f.formula_id !== formula.formula_id) {
        related.push(f.formula_id);
      }
    }

    // Find formulas that use similar inputs
    const allFormulas = formulaRegistry.all();
    const inputNames = new Set((((formula as any).inputs as Array<Record<string, unknown>>) ?? formula.parameters ?? []).map((i: Record<string, unknown>) => (i.name as string).toLowerCase()));

    /** For.
     * @param const - const
     * @returns void
     */
    for (const f of allFormulas) {
      if (f.formula_id === formula.formula_id) continue;
      const fInputs = new Set((((f as unknown as Record<string, unknown>).inputs as Array<Record<string, unknown>>) ?? f.parameters ?? []).map((i: Record<string, unknown>) => (i.name as string).toLowerCase()));
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
  async getFormula(formulaId: string): Promise<Formula | undefined> {
    return formulaRegistry.getFormula(formulaId);
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Calculate relevance score
   */
  /**
   * M-021: TF-IDF relevance scoring with exact-match boosters.
   * Combines cosine-like TF-IDF similarity with positional bonuses
   * (exact name match, prefix match, containment) for robust ranking.
   */
  private calculateRelevance(query: string, name: string, description: string): number {
    const queryLower = query.toLowerCase();
    const nameLower = name.toLowerCase();
    const descLower = description.toLowerCase();

    // --- Positional bonus (0–0.4) for exact/prefix/substring matches ---
    let positionalBonus = 0;
    /** If.
     * @param nameLower - name lower
     * @returns void
     */
    if (nameLower === queryLower) {
      positionalBonus = 0.4;
    } else if (nameLower.startsWith(queryLower)) {
      positionalBonus = 0.3;
    } else if (nameLower.includes(queryLower)) {
      positionalBonus = 0.2;
    } else if (descLower.includes(queryLower)) {
      positionalBonus = 0.1;
    }

    // --- TF-IDF cosine similarity (0–0.6 range) ---
    const queryTokens = this.tokenize(queryLower);
    if (queryTokens.length === 0) return positionalBonus;

    // Document = name (weighted 2x) + description
    const docTokens = this.tokenize(nameLower + " " + nameLower + " " + descLower);
    if (docTokens.length === 0) return positionalBonus;

    // Build doc term frequency map
    const docTf = new Map<string, number>();
    /** For.
     * @param const - const
     * @returns void
     */
    for (const t of docTokens) {
      docTf.set(t, (docTf.get(t) || 0) + 1);
    }
    const docLen = docTokens.length;

    // Compute TF-IDF dot product (query · doc) and magnitudes
    let dotProduct = 0;
    let queryMag = 0;
    let docMag = 0;

    // Unique query terms with their TF
    const queryTf = new Map<string, number>();
    /** For.
     * @param const - const
     * @returns void
     */
    for (const t of queryTokens) {
      queryTf.set(t, (queryTf.get(t) || 0) + 1);
    }
    const queryLen = queryTokens.length;

    /** For.
     * @param const - const
     * @param qCount] - q count]
     * @returns void
     */
    for (const [term, qCount] of queryTf) {
      const idf = this.getIdf(term);
      const qTfIdf = (qCount / queryLen) * idf;
      const dTfIdf = ((docTf.get(term) || 0) / docLen) * idf;

      dotProduct += qTfIdf * dTfIdf;
      queryMag += qTfIdf * qTfIdf;
      docMag += dTfIdf * dTfIdf;
    }

    // Add remaining doc terms to docMag for proper normalization
    /** For.
     * @param const - const
     * @param dCount] - d count]
     * @returns void
     */
    for (const [term, dCount] of docTf) {
      if (!queryTf.has(term)) {
        const idf = this.getIdf(term);
        const dTfIdf = (dCount / docLen) * idf;
        docMag += dTfIdf * dTfIdf;
      }
    }

    const magnitude = Math.sqrt(queryMag) * Math.sqrt(docMag);
    const cosineSim = magnitude > 0 ? dotProduct / magnitude : 0;

    // Scale cosine similarity to 0–0.6 range
    const tfidfScore = cosineSim * 0.6;

    const total = Math.min(1.0, tfidfScore + positionalBonus);
    return Math.round(total * 100) / 100;
  }

  /** Tokenize text into lowercase word stems (simple whitespace + punctuation split) */
  private tokenize(text: string): string[] {
    return text
      .split(/[\s\-_/\\.,;:!?()[\]{}'"]+/)
      .filter(t => t.length > 1)  // Drop single chars
      .filter(t => !STOP_WORDS.has(t));
  }

  /** Get IDF for a term. Uses pre-built corpus cache. */
  private getIdf(term: string): number {
    const cached = this.idfCache.get(term);
    if (cached !== undefined) return cached;
    // Unknown term = max IDF (very rare = very discriminating)
    return Math.log(this.idfCorpusSize + 1);
  }

  /** Ensure IDF index is built and fresh. Called from async search entry points. */
  private async ensureIdfIndex(): Promise<void> {
    if (this.idfCorpusSize > 0 && Date.now() - this.idfBuiltAt < KnowledgeQueryEngine.IDF_TTL_MS) {
      return; // Cache is fresh
    }
    await this.buildIdfIndex();
  }

  /** Build IDF index from all registry entries */
  private async buildIdfIndex(): Promise<void> {
    const docFreq = new Map<string, number>();
    let totalDocs = 0;

    // Collect documents from each registry
    const collectDoc = (text: string) => {
      const tokens = new Set(this.tokenize(text.toLowerCase()));
      /** For.
       * @param const - const
       * @returns void
       */
      for (const t of tokens) {
        docFreq.set(t, (docFreq.get(t) || 0) + 1);
      }
      totalDocs++;
    };

    // Materials (via service)
    try {
      const mats = await materialService.search({ query: "", limit: 200 });
      for (const m of mats) collectDoc(`${m.name || ""} ${m.category || ""} ${m.iso_group || ""}`);
    } catch { /* service may not be initialized */ }

    // Machines (via service)
    try {
      const machines = machineService.search({ query: "", limit: 200 });
      for (const m of machines) collectDoc(`${m.name || ""} ${m.manufacturer || ""} ${m.type || ""}`);
    } catch { /* */ }

    // Tools (via service)
    try {
      const tools = toolService.search({ query: "", limit: 200 });
      for (const t of tools) collectDoc(`${t.name || ""} ${t.type || ""} ${t.substrate || ""}`);
    } catch { /* */ }

    // Alarms
    try {
      const alarms = await alarmRegistry.list();
      for (const a of alarms) collectDoc(`${a.name || ""} ${a.code || ""} ${a.description || ""}`);
    } catch { /* */ }

    // Formulas (list() returns { formulas, total })
    try {
      const fResult = await formulaRegistry.list();
      const formulas = Array.isArray(fResult) ? fResult : ((fResult as unknown as Record<string, unknown>).formulas as Formula[]) || [];
      for (const f of formulas) collectDoc(`${f.name || ""} ${f.category || ""} ${f.description || ""}`);
    } catch { /* */ }

    // Skills
    try {
      const skills = await skillRegistry.list();
      for (const s of skills) collectDoc(`${s.name || ""} ${s.category || ""} ${s.description || ""}`);
    } catch { /* */ }

    // Scripts
    try {
      const scripts = await scriptRegistry.list();
      for (const s of scripts) collectDoc(`${s.name || ""} ${s.category || ""} ${s.description || ""}`);
    } catch { /* */ }

    // Agents
    try {
      const agents = await agentRegistry.list();
      for (const a of agents) collectDoc(`${a.name || ""} ${a.category || ""} ${a.description || ""}`);
    } catch { /* */ }

    // Hooks
    try {
      const hooks = await hookRegistry.list();
      for (const h of hooks) collectDoc(`${h.name || ""} ${((h as unknown as Record<string, unknown>).phase as string) || ""} ${h.description || ""}`);
    } catch { /* */ }

    // Fallback: if no registries loaded, set reasonable defaults
    if (totalDocs === 0) totalDocs = 1;

    // Compute IDF: log(N / df) for each term
    this.idfCache.clear();
    /** For.
     * @param const - const
     * @param df] - df]
     * @returns void
     */
    for (const [term, df] of docFreq) {
      this.idfCache.set(term, Math.log(totalDocs / df));
    }
    this.idfCorpusSize = totalDocs;
    this.idfBuiltAt = Date.now();

    log.debug(`KnowledgeQueryEngine: IDF index built — ${totalDocs} docs, ${docFreq.size} terms`);
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
    /** If.
     * @param this.cache.size - this.cache.size
     * @returns void
     */
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
      materials: await materialService.getCount(),
      machines: machineService.getCount(),
      tools: toolService.getCount(),
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

  // ==========================================================================
  // SOURCE FILE CATALOG ACCESSORS
  // ==========================================================================

  /**
   * Return the full extracted-source-file catalog for knowledge-base modules.
   */
  static getSourceFileCatalog(): typeof KNOWLEDGE_QUERY_SOURCE_FILE_CATALOG {
    return KNOWLEDGE_QUERY_SOURCE_FILE_CATALOG;
  }

  /**
   * Enumerate catalog entries with aggregate stats.
   */
  catalogSourceFiles(): {
    totalFiles: number;
    totalLines: number;
    byCategory: Record<string, string[]>;
    entries: typeof KNOWLEDGE_QUERY_SOURCE_FILE_CATALOG;
  } {
    const entries = KNOWLEDGE_QUERY_SOURCE_FILE_CATALOG;
    const keys = Object.keys(entries);

    const byCategory: Record<string, string[]> = {};
    let totalLines = 0;

    /** For.
     * @param const - const
     * @returns void
     */
    for (const key of keys) {
      const entry = entries[key as keyof typeof entries];
      totalLines += entry.lines;
      /** If.
       * @param !byCategory[entry.category] - !by category[entry.category]
       * @returns void
       */
      if (!byCategory[entry.category]) {
        byCategory[entry.category] = [];
      }
      byCategory[entry.category].push(entry.filename);
    }

    return { totalFiles: keys.length, totalLines, byCategory, entries };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Knowledge Engine constant.
 */
export const knowledgeEngine = new KnowledgeQueryEngine();
