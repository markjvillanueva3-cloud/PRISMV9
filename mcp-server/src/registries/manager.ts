/**
 * PRISM MCP Server - Registry Manager v4
 * Coordinates loading and lifecycle of all data registries
 *
 * Data Registries (8):
 * - MaterialRegistry: 1,047+ materials × 127 parameters
 * - MachineRegistry: 824+ machines × 43 manufacturers
 * - ToolRegistry: 500+ cutting tools × 85 parameters
 * - AlarmRegistry: 2,500+ alarms × 12 controller families
 * - FormulaRegistry: 109 formulas × 20 domains
 * - AlgorithmRegistry: 52+ algorithms × 14 types (P-MS1)
 * - PostProcessorRegistry: 8+ post processors × 13 controller families (P-MS1) ⚠️ SAFETY CRITICAL
 * - KnowledgeBaseRegistry: 12+ knowledge bases (P-MS1)
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
import { agentRegistry, AgentRegistry } from "./AgentRegistry.js";
import { hookRegistry, HookRegistry } from "./HookRegistry.js";
import { skillRegistry, SkillRegistry } from "./SkillRegistry.js";
import { scriptRegistry, ScriptRegistry } from "./ScriptRegistry.js";
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

  // Orchestration registries
  readonly agents: AgentRegistry;
  readonly hooks: HookRegistry;

  // Knowledge registries
  readonly skills: SkillRegistry;
  readonly scripts: ScriptRegistry;

  constructor() {
    this.materials = materialRegistry;
    this.machines = machineRegistry;
    this.tools = toolRegistry;
    this.alarms = alarmRegistry;
    this.formulas = formulaRegistry;
    this.algorithms = algorithmRegistry;
    this.postProcessors = postProcessorRegistry;
    this.knowledgeBases = knowledgeBaseRegistry;
    this.agents = agentRegistry;
    this.hooks = hookRegistry;
    this.skills = skillRegistry;
    this.scripts = scriptRegistry;
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
    log.info(`  Agents:          ${this.agents.size} entries`);
    log.info(`  Hooks:           ${this.hooks.size} entries`);
    log.info(`  Skills:          ${this.skills.size} entries`);
    log.info(`  Scripts:         ${this.scripts.size} entries`);
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
      this.agents.size +
      this.hooks.size +
      this.skills.size +
      this.scripts.size
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
      agents: this.agents.getStats(),
      hooks: this.hooks.getStats(),
      skills: this.skills.getStats(),
      scripts: this.scripts.getStats(),
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
    this.agents.clear();
    this.hooks.clear();
    this.skills.clear();
    this.scripts.clear();
    
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
      // Orchestration registries
      { name: "agents", size: this.agents.size, loaded: this.agents.isLoaded(), category: "orchestration" },
      { name: "hooks", size: this.hooks.size, loaded: this.hooks.isLoaded(), category: "orchestration" },
      // Knowledge registries
      { name: "skills", size: this.skills.size, loaded: this.skills.isLoaded(), category: "knowledge" },
      { name: "scripts", size: this.scripts.size, loaded: this.scripts.isLoaded(), category: "knowledge" }
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
    agents: any[];
    hooks: any[];
    skills: any[];
    scripts: any[];
  }> {
    await this.initialize();
    
    const registries = options?.registries || ["materials", "machines", "tools", "alarms", "formulas", "agents", "hooks", "skills", "scripts"];
    const limit = options?.limit || 5;
    
    const results = {
      materials: [] as any[],
      machines: [] as any[],
      tools: [] as any[],
      alarms: [] as any[],
      formulas: [] as any[],
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
}

// Export singleton instance
export const registryManager = new RegistryManager();
