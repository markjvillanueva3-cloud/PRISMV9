/**
 * PRISM MCP Server - Registry Manager v4
 * Coordinates loading and lifecycle of all data registries
 *
 * Data Registries (10):
 * - MaterialRegistry: 6,346+ materials × 127 parameters (Kienzle-enriched)
 * - MachineRegistry: 2,107+ machines × 43 manufacturers (spindle-enriched)
 * - ToolRegistry: 15,912+ cutting tools × 85 parameters (geometry-enriched)
 * - AlarmRegistry: 2,500+ alarms × 12 controller families
 * - FormulaRegistry: 109 formulas × 20 domains
 * - AlgorithmRegistry: 52+ algorithms × 14 types (P-MS1)
 * - PostProcessorRegistry: 8+ post processors × 13 controller families (P-MS1) ⚠️ SAFETY CRITICAL
 * - KnowledgeBaseRegistry: 12+ knowledge bases (P-MS1)
 * - CoolantRegistry: 22 coolants × 7 categories with SFC factors (S1-P3)
 * - CoatingRegistry: 20 coatings × 5 categories with SFC factors (S1-P3)
 *
 * Orchestration Registries (2):
 * - AgentRegistry: 64+ agents × 8 categories
 * - HookRegistry: 162+ hooks × 9 categories
 *
 * Knowledge Registries (2):
 * - SkillRegistry: 135+ skills × 14 categories
 * - ScriptRegistry: 163+ scripts × 10 categories
 */

import { materialRegistry, MaterialRegistry } from "./MaterialRegistry.js";
import { machineRegistry, MachineRegistry } from "./MachineRegistry.js";
import { toolRegistry, ToolRegistry } from "./ToolRegistry.js";
import { alarmRegistry, AlarmRegistry } from "./AlarmRegistry.js";
import { formulaRegistry, FormulaRegistry } from "./FormulaRegistry.js";
import { algorithmRegistry, AlgorithmRegistry } from "./AlgorithmRegistry.js";
import { postProcessorRegistry, PostProcessorRegistry } from "./PostProcessorRegistry.js";
import { knowledgeBaseRegistry, KnowledgeBaseRegistry } from "./KnowledgeBaseRegistry.js";
import { coolantRegistry, CoolantRegistry } from "./CoolantRegistry.js";
import { coatingRegistry, CoatingRegistry } from "./CoatingRegistry.js";
import { agentRegistry, AgentRegistry } from "./AgentRegistry.js";
import { hookRegistry, HookRegistry } from "./HookRegistry.js";
import { skillRegistry, SkillRegistry } from "./SkillRegistry.js";
import { scriptRegistry, ScriptRegistry } from "./ScriptRegistry.js";
import { databaseRegistry, DatabaseRegistry } from "./DatabaseRegistry.js";
import { DSL_ABBREVIATIONS, DSL_ENTRY_COUNT } from "../config/dslAbbreviations.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// REGISTRY MANAGER
// ============================================================================

export class RegistryManager {
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  
  // Data registries
  readonly materials: MaterialRegistry;
  readonly machines: MachineRegistry;
  readonly tools: ToolRegistry;
  readonly alarms: AlarmRegistry;
  readonly formulas: FormulaRegistry;
  readonly algorithms: AlgorithmRegistry;
  readonly postProcessors: PostProcessorRegistry;
  readonly knowledgeBases: KnowledgeBaseRegistry;
  readonly coolants: CoolantRegistry;
  readonly coatings: CoatingRegistry;

  // Orchestration registries
  readonly agents: AgentRegistry;
  readonly hooks: HookRegistry;

  // Knowledge registries
  readonly skills: SkillRegistry;
  readonly scripts: ScriptRegistry;

  // Database registries (L0-P2-MS1)
  readonly databases: DatabaseRegistry;

  constructor() {
    this.materials = materialRegistry;
    this.machines = machineRegistry;
    this.tools = toolRegistry;
    this.alarms = alarmRegistry;
    this.formulas = formulaRegistry;
    this.algorithms = algorithmRegistry;
    this.postProcessors = postProcessorRegistry;
    this.knowledgeBases = knowledgeBaseRegistry;
    this.coolants = coolantRegistry;
    this.coatings = coatingRegistry;
    this.agents = agentRegistry;
    this.hooks = hookRegistry;
    this.skills = skillRegistry;
    this.scripts = scriptRegistry;
    this.databases = databaseRegistry;
  }

  /**
   * Initialize all registries
   * Thread-safe: multiple calls return same promise
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  /**
   * Perform actual initialization
   */
  private async doInitialize(): Promise<void> {
    log.info("Initializing all registries...");
    const startTime = Date.now();
    
    try {
      // Load all registries in parallel for speed
      await Promise.all([
        this.materials.load().catch(err => {
          log.error(`Failed to load materials: ${err}`);
        }),
        this.machines.load().catch(err => {
          log.error(`Failed to load machines: ${err}`);
        }),
        this.tools.load().catch(err => {
          log.error(`Failed to load tools: ${err}`);
        }),
        this.alarms.load().catch(err => {
          log.error(`Failed to load alarms: ${err}`);
        }),
        this.formulas.load().catch(err => {
          log.error(`Failed to load formulas: ${err}`);
        }),
        this.algorithms.load().catch(err => {
          log.error(`Failed to load algorithms: ${err}`);
        }),
        this.postProcessors.load().catch(err => {
          log.error(`Failed to load post processors: ${err}`);
        }),
        this.knowledgeBases.load().catch(err => {
          log.error(`Failed to load knowledge bases: ${err}`);
        }),
        this.coolants.load().catch(err => {
          log.error(`Failed to load coolants: ${err}`);
        }),
        this.coatings.load().catch(err => {
          log.error(`Failed to load coatings: ${err}`);
        }),
        this.agents.load().catch(err => {
          log.error(`Failed to load agents: ${err}`);
        }),
        this.hooks.load().catch(err => {
          log.error(`Failed to load hooks: ${err}`);
        }),
        this.skills.load().catch(err => {
          log.error(`Failed to load skills: ${err}`);
        }),
        this.scripts.load().catch(err => {
          log.error(`Failed to load scripts: ${err}`);
        }),
        this.databases.load().catch(err => {
          log.error(`Failed to load databases: ${err}`);
        })
      ]);
      
      // W5: Only mark initialized if core registries loaded successfully
      // If materials has data files but loaded 0, allow re-init
      const materialsLoaded = this.materials.size > 0;
      this.initialized = materialsLoaded;
      if (!materialsLoaded) {
        this.initPromise = null; // Allow retry
        log.warn("RegistryManager: materials registry loaded 0 entries — will retry on next call");
      }
      
      const elapsed = Date.now() - startTime;
      log.info(`All registries initialized in ${elapsed}ms`);
      
      // Log summary
      this.logSummary();
      
    } catch (error) {
      log.error(`Registry initialization failed: ${error}`);
      throw error;
    }
  }

  /**
   * Log summary of loaded data
   */
  private logSummary(): void {
    log.info("Registry Summary:");
    log.info(`  Materials:       ${this.materials.size} entries`);
    log.info(`  Machines:        ${this.machines.size} entries`);
    log.info(`  Tools:           ${this.tools.size} entries`);
    log.info(`  Alarms:          ${this.alarms.size} entries`);
    log.info(`  Formulas:        ${this.formulas.size} entries`);
    log.info(`  Algorithms:      ${this.algorithms.size} entries`);
    log.info(`  PostProcessors:  ${this.postProcessors.size} entries`);
    log.info(`  KnowledgeBases:  ${this.knowledgeBases.size} entries`);
    log.info(`  Coolants:        ${this.coolants.size} entries`);
    log.info(`  Coatings:        ${this.coatings.size} entries`);
    log.info(`  Agents:          ${this.agents.size} entries`);
    log.info(`  Hooks:           ${this.hooks.size} entries`);
    log.info(`  Skills:          ${this.skills.size} entries`);
    log.info(`  Scripts:         ${this.scripts.size} entries`);
    log.info(`  Databases:       ${this.databases.size} entries`);
    log.info(`  DSL Abbrs:       ${DSL_ENTRY_COUNT} entries`);
    log.info(`  Total:           ${this.getTotalEntries()} entries`);
  }

  /**
   * Get total entries across all registries
   */
  getTotalEntries(): number {
    return (
      this.materials.size +
      this.machines.size +
      this.tools.size +
      this.alarms.size +
      this.formulas.size +
      this.algorithms.size +
      this.postProcessors.size +
      this.knowledgeBases.size +
      this.coolants.size +
      this.coatings.size +
      this.agents.size +
      this.hooks.size +
      this.skills.size +
      this.scripts.size +
      this.databases.size +
      DSL_ENTRY_COUNT
    );
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get combined statistics
   */
  async getStats(): Promise<{
    initialized: boolean;
    materials: any;
    machines: any;
    tools: any;
    alarms: any;
    formulas: any;
    algorithms: any;
    postProcessors: any;
    knowledgeBases: any;
    coolants: any;
    coatings: any;
    agents: any;
    hooks: any;
    skills: any;
    scripts: any;
    totalEntries: number;
  }> {
    await this.initialize();

    return {
      initialized: this.initialized,
      materials: await this.materials.getStats(),
      machines: this.machines.getStats(),
      tools: this.tools.getStats(),
      alarms: await this.alarms.getStats(),
      formulas: await this.formulas.getStats(),
      algorithms: await this.algorithms.getStats(),
      postProcessors: await this.postProcessors.getStats(),
      knowledgeBases: await this.knowledgeBases.getStats(),
      coolants: this.coolants.getStats(),
      coatings: this.coatings.getStats(),
      agents: this.agents.getStats(),
      hooks: this.hooks.getStats(),
      skills: this.skills.getStats(),
      scripts: this.scripts.getStats(),
      databases: this.databases.getStats(),
      dsl: { total: DSL_ENTRY_COUNT },
      totalEntries: this.getTotalEntries()
    };
  }

  /**
   * Reload all registries
   */
  async reload(): Promise<void> {
    log.info("Reloading all registries...");
    
    // Reset state
    this.initialized = false;
    this.initPromise = null;
    
    // Clear each registry
    this.materials.clear();
    this.machines.clear();
    this.tools.clear();
    this.alarms.clear();
    this.formulas.clear();
    this.algorithms.clear();
    this.postProcessors.clear();
    this.knowledgeBases.clear();
    this.coolants.clear();
    this.coatings.clear();
    this.agents.clear();
    this.hooks.clear();
    this.skills.clear();
    this.scripts.clear();
    this.databases.clear();

    // Reinitialize
    await this.initialize();
  }

  /**
   * Get registry by name
   */
  getRegistry(name: string): any {
    switch (name.toLowerCase()) {
      case "materials":
      case "material":
        return this.materials;
      case "machines":
      case "machine":
        return this.machines;
      case "tools":
      case "tool":
        return this.tools;
      case "alarms":
      case "alarm":
        return this.alarms;
      case "formulas":
      case "formula":
        return this.formulas;
      case "algorithms":
      case "algorithm":
        return this.algorithms;
      case "postprocessors":
      case "postprocessor":
      case "post_processors":
      case "post_processor":
        return this.postProcessors;
      case "knowledgebases":
      case "knowledgebase":
      case "knowledge_bases":
      case "knowledge_base":
      case "kb":
        return this.knowledgeBases;
      case "coolants":
      case "coolant":
        return this.coolants;
      case "coatings":
      case "coating":
        return this.coatings;
      case "agents":
      case "agent":
        return this.agents;
      case "hooks":
      case "hook":
        return this.hooks;
      case "skills":
      case "skill":
        return this.skills;
      case "scripts":
      case "script":
        return this.scripts;
      case "databases":
      case "database":
      case "db":
        return this.databases;
      default:
        return undefined;
    }
  }

  /**
   * List available registries
   */
  listRegistries(): { name: string; size: number; loaded: boolean; category: string }[] {
    return [
      // Data registries
      { name: "materials", size: this.materials.size, loaded: this.materials.isLoaded(), category: "data" },
      { name: "machines", size: this.machines.size, loaded: this.machines.isLoaded(), category: "data" },
      { name: "tools", size: this.tools.size, loaded: this.tools.isLoaded(), category: "data" },
      { name: "alarms", size: this.alarms.size, loaded: this.alarms.isLoaded(), category: "data" },
      { name: "formulas", size: this.formulas.size, loaded: this.formulas.isLoaded(), category: "data" },
      { name: "algorithms", size: this.algorithms.size, loaded: this.algorithms.isLoaded(), category: "data" },
      { name: "postProcessors", size: this.postProcessors.size, loaded: this.postProcessors.isLoaded(), category: "data" },
      { name: "knowledgeBases", size: this.knowledgeBases.size, loaded: this.knowledgeBases.isLoaded(), category: "data" },
      { name: "coolants", size: this.coolants.size, loaded: this.coolants.isLoaded(), category: "data" },
      { name: "coatings", size: this.coatings.size, loaded: this.coatings.isLoaded(), category: "data" },
      // Orchestration registries
      { name: "agents", size: this.agents.size, loaded: this.agents.isLoaded(), category: "orchestration" },
      { name: "hooks", size: this.hooks.size, loaded: this.hooks.isLoaded(), category: "orchestration" },
      // Knowledge registries
      { name: "skills", size: this.skills.size, loaded: this.skills.isLoaded(), category: "knowledge" },
      { name: "scripts", size: this.scripts.size, loaded: this.scripts.isLoaded(), category: "knowledge" },
      // Database & DSL registries (L0-P2-MS1)
      { name: "databases", size: this.databases.size, loaded: this.databases.isLoaded(), category: "database" },
      { name: "dsl", size: DSL_ENTRY_COUNT, loaded: true, category: "config" }
    ];
  }

  /**
   * Search across all registries
   */
  async globalSearch(query: string, options?: {
    registries?: string[];
    limit?: number;
  }): Promise<{
    materials: any[];
    machines: any[];
    tools: any[];
    alarms: any[];
    formulas: any[];
    coolants: any[];
    coatings: any[];
    agents: any[];
    hooks: any[];
    skills: any[];
    scripts: any[];
  }> {
    await this.initialize();

    const registries = options?.registries || ["materials", "machines", "tools", "alarms", "formulas", "coolants", "coatings", "agents", "hooks", "skills", "scripts"];
    const limit = options?.limit || 5;
    
    const results = {
      materials: [] as any[],
      machines: [] as any[],
      tools: [] as any[],
      alarms: [] as any[],
      formulas: [] as any[],
      coolants: [] as any[],
      coatings: [] as any[],
      agents: [] as any[],
      hooks: [] as any[],
      skills: [] as any[],
      scripts: [] as any[]
    };
    
    if (registries.includes("materials")) {
      const materialResults = await this.materials.search({ query, limit });
      results.materials = materialResults.materials;
    }
    
    if (registries.includes("machines")) {
      const machineResults = this.machines.search({ query, limit });
      results.machines = machineResults.machines;
    }
    
    if (registries.includes("tools")) {
      const toolResults = this.tools.search({ query, limit });
      results.tools = toolResults.tools;
    }
    
    if (registries.includes("alarms")) {
      const alarmResults = await this.alarms.search({ query, limit });
      results.alarms = alarmResults.alarms;
    }
    
    if (registries.includes("formulas")) {
      const formulaResults = await this.formulas.list({ limit });
      results.formulas = formulaResults.formulas.filter(f =>
        f.name.toLowerCase().includes(query.toLowerCase()) ||
        f.formula_id.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (registries.includes("coolants")) {
      const coolantResults = this.coolants.searchCoolants({ query, limit });
      results.coolants = coolantResults.coolants;
    }

    if (registries.includes("coatings")) {
      const coatingResults = this.coatings.searchCoatings({ query, limit });
      results.coatings = coatingResults.coatings;
    }

    if (registries.includes("agents")) {
      const agentResults = this.agents.search({ query, limit });
      results.agents = agentResults.agents;
    }
    
    if (registries.includes("hooks")) {
      const hookResults = this.hooks.search({ query, limit });
      results.hooks = hookResults.hooks;
    }
    
    if (registries.includes("skills")) {
      const skillResults = this.skills.search({ query, limit });
      results.skills = skillResults.skills;
    }
    
    if (registries.includes("scripts")) {
      const scriptResults = this.scripts.search({ query, limit });
      results.scripts = scriptResults.scripts;
    }

    if (registries.includes("databases")) {
      (results as any).databases = this.databases.search(query, limit);
    }

    if (registries.includes("dsl")) {
      const q = query.toLowerCase();
      const dslMatches: { term: string; abbreviation: string }[] = [];
      for (const [term, abbr] of Object.entries(DSL_ABBREVIATIONS)) {
        if (term.toLowerCase().includes(q) || abbr.toLowerCase().includes(q)) {
          dslMatches.push({ term, abbreviation: abbr });
          if (dslMatches.length >= limit) break;
        }
      }
      (results as any).dsl = dslMatches;
    }

    return results;
  }

  /**
   * Find agent for a specific task
   */
  findAgentForTask(taskType: string): any {
    return this.agents.findAgentForTask(taskType);
  }

  /**
   * Fire hooks for an event
   */
  async fireEvent(
    event: string,
    timing: "before" | "after" | "around" | "on",
    context: Record<string, unknown>
  ): Promise<{ results: unknown[]; errors: Error[] }> {
    return this.hooks.fireEvent(event, timing, context);
  }

  /**
   * Get cognitive hooks
   */
  getCognitiveHooks(): any[] {
    return this.hooks.getCognitiveHooks();
  }

  /**
   * Get law hooks
   */
  getLawHooks(): any[] {
    return this.hooks.getLawHooks();
  }

  /**
   * Find skills for a task
   */
  findSkillsForTask(taskDescription: string): any[] {
    return this.skills.findForTask(taskDescription);
  }

  /**
   * Get skill content
   */
  async getSkillContent(skillId: string): Promise<string | undefined> {
    return this.skills.getContent(skillId);
  }

  /**
   * Get script execution command
   */
  getScriptCommand(scriptId: string, args?: Record<string, unknown>): string | undefined {
    return this.scripts.getExecutionCommand(scriptId, args);
  }

  /**
   * Cross-Registry Lookup (L0-P2-MS1)
   * Maps relationships between registries:
   * - material → compatible tools, coatings, coolants
   * - machine → compatible alarms, controllers
   * - iso_group → materials in that group
   */
  async crossLookup(params: {
    from: string;     // source registry
    id: string;       // source entry ID or query
    to: string;       // target registry
    limit?: number;
  }): Promise<{ source: string; target: string; matches: any[]; count: number }> {
    await this.initialize();
    const limit = params.limit || 10;
    const from = params.from.toLowerCase();
    const to = params.to.toLowerCase();
    const id = params.id;

    // Material → Tools: find tools suitable for this material's ISO group
    if (from === "material" && to === "tools") {
      const material = (await this.materials.search({ query: id, limit: 1 }))?.materials?.[0];
      if (material?.iso_group) {
        const toolResults = this.tools.search({ query: material.iso_group, limit });
        return { source: `material:${id}`, target: "tools", matches: toolResults.tools || [], count: toolResults.tools?.length || 0 };
      }
    }

    // Material → Coatings: find coatings suitable for this material category
    if (from === "material" && to === "coatings") {
      const material = (await this.materials.search({ query: id, limit: 1 }))?.materials?.[0];
      if (material) {
        const coatingResults = this.coatings.searchCoatings({ query: material.iso_group || material.category || id, limit });
        return { source: `material:${id}`, target: "coatings", matches: coatingResults.coatings || [], count: coatingResults.coatings?.length || 0 };
      }
    }

    // Material → Coolants: find coolants for this material
    if (from === "material" && to === "coolants") {
      const coolantResults = this.coolants.searchCoolants({ query: id, limit });
      return { source: `material:${id}`, target: "coolants", matches: coolantResults.coolants || [], count: coolantResults.coolants?.length || 0 };
    }

    // Machine → Alarms: find alarms for this machine's controller
    if (from === "machine" && to === "alarms") {
      const machine = this.machines.search({ query: id, limit: 1 })?.machines?.[0];
      if (machine?.controller_family || machine?.controller) {
        const controller = machine.controller_family || machine.controller;
        const alarmResults = await this.alarms.search({ query: controller, limit });
        return { source: `machine:${id}`, target: "alarms", matches: alarmResults.alarms || [], count: alarmResults.alarms?.length || 0 };
      }
    }

    // Machine → PostProcessors: find post processors for this machine's controller
    if (from === "machine" && to === "postprocessors") {
      const machine = this.machines.search({ query: id, limit: 1 })?.machines?.[0];
      if (machine) {
        const ppResults = await this.postProcessors.search({ query: machine.controller_family || machine.controller || id, limit });
        return { source: `machine:${id}`, target: "postprocessors", matches: ppResults || [], count: (ppResults as any)?.length || 0 };
      }
    }

    // Generic fallback: text search in target registry
    const targetReg = this.getRegistry(to);
    if (targetReg && typeof targetReg.search === "function") {
      const results = await targetReg.search({ query: id, limit });
      const matchArray = results?.materials || results?.machines || results?.tools || results?.alarms ||
        results?.formulas || results?.coolants || results?.coatings || results?.agents ||
        results?.hooks || results?.skills || results?.scripts || results || [];
      return { source: `${from}:${id}`, target: to, matches: Array.isArray(matchArray) ? matchArray.slice(0, limit) : [], count: Array.isArray(matchArray) ? matchArray.length : 0 };
    }

    return { source: `${from}:${id}`, target: to, matches: [], count: 0 };
  }

  /**
   * DSL Lookup (L0-P2-MS1)
   * Search DSL abbreviations by term or abbreviation
   */
  dslLookup(query: string): { term: string; abbreviation: string }[] {
    const q = query.toLowerCase();
    const results: { term: string; abbreviation: string }[] = [];
    for (const [term, abbr] of Object.entries(DSL_ABBREVIATIONS)) {
      if (term.toLowerCase().includes(q) || abbr.toLowerCase().includes(q)) {
        results.push({ term, abbreviation: abbr });
      }
    }
    return results;
  }
}

// Export singleton instance
export const registryManager = new RegistryManager();
