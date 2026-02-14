/**
 * PRISM MCP Server - Skill Executor Engine
 * Session 5.1: Skill Integration Engine
 * 
 * Features:
 * - Skill loading with validation and caching
 * - Intelligent skill recommendation based on task analysis
 * - Dependency resolution and skill chains
 * - Usage tracking and performance metrics
 * - Skill content extraction and formatting
 * 
 * @version 1.0.0
 * @author PRISM Development Team
 */

import * as fs from "fs/promises";
import * as path from "path";
import { log } from "../utils/Logger.js";
import { skillRegistry, Skill, SkillCategory, SkillDependency } from "../registries/SkillRegistry.js";
import { hookEngine } from "./HookEngine.js";
import { eventBus } from "./EventBus.js";

// ============================================================================
// TYPES
// ============================================================================

export interface SkillLoadResult {
  success: boolean;
  skill_id: string;
  content?: string;
  lines?: number;
  cached: boolean;
  load_time_ms: number;
  error?: string;
}

export interface SkillRecommendation {
  skill_id: string;
  name: string;
  category: SkillCategory;
  relevance_score: number;
  match_reasons: string[];
  priority: number;
  dependencies: string[];
  estimated_value: "HIGH" | "MEDIUM" | "LOW";
}

export interface SkillChain {
  chain_id: string;
  skills: string[];
  purpose: string;
  total_lines: number;
  execution_order: string[];
  dependency_satisfied: boolean;
}

export interface SkillUsageRecord {
  skill_id: string;
  load_count: number;
  last_loaded: string;
  avg_load_time_ms: number;
  success_rate: number;
  contexts: string[];
}

export interface TaskAnalysis {
  task: string;
  detected_domains: string[];
  detected_actions: string[];
  complexity: "LOW" | "MEDIUM" | "HIGH";
  requires_physics: boolean;
  requires_safety: boolean;
  requires_code: boolean;
  suggested_approach: string;
}

export interface SkillExecutorConfig {
  cache_enabled: boolean;
  cache_ttl_ms: number;
  max_cache_entries: number;
  max_recommendation_count: number;
  min_relevance_threshold: number;
  enable_usage_tracking: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: SkillExecutorConfig = {
  cache_enabled: true,
  cache_ttl_ms: 5 * 60 * 1000, // 5 minutes
  max_cache_entries: 50,
  max_recommendation_count: 10,
  min_relevance_threshold: 0.3,
  enable_usage_tracking: true
};

// Task analysis patterns
const DOMAIN_PATTERNS: Record<string, RegExp[]> = {
  materials: [
    /material/i, /alloy/i, /steel/i, /aluminum/i, /titanium/i,
    /inconel/i, /hastelloy/i, /copper/i, /brass/i, /bronze/i,
    /kienzle/i, /johnson.cook/i, /127.param/i, /kc1\.1/i
  ],
  machines: [
    /machine/i, /cnc/i, /mill/i, /lathe/i, /turn/i,
    /dmg/i, /mazak/i, /haas/i, /okuma/i, /fanuc/i,
    /spindle/i, /axis/i, /travel/i, /envelope/i
  ],
  tools: [
    /tool/i, /cutter/i, /insert/i, /end.?mill/i, /drill/i,
    /tap/i, /holder/i, /collet/i, /geometry/i, /coating/i
  ],
  alarms: [
    /alarm/i, /error/i, /fault/i, /diagnostic/i, /trouble/i,
    /code/i, /warning/i, /severity/i
  ],
  calculations: [
    /calculat/i, /speed/i, /feed/i, /force/i, /power/i,
    /mrr/i, /surface.?finish/i, /tool.?life/i, /taylor/i
  ],
  programming: [
    /g.?code/i, /m.?code/i, /program/i, /nc/i, /post/i,
    /fanuc/i, /siemens/i, /heidenhain/i, /macro/i
  ],
  session: [
    /session/i, /state/i, /checkpoint/i, /resume/i, /continue/i,
    /compaction/i, /buffer/i
  ],
  quality: [
    /quality/i, /valid/i, /verify/i, /omega/i, /safety/i,
    /s\(x\)/i, /r\(x\)/i, /c\(x\)/i, /p\(x\)/i
  ],
  code: [
    /code/i, /typescript/i, /interface/i, /schema/i, /api/i,
    /pattern/i, /solid/i, /dry/i
  ],
  ai: [
    /ai/i, /ml/i, /algorithm/i, /optimization/i, /neural/i,
    /bayesian/i, /genetic/i, /pso/i
  ]
};

const ACTION_PATTERNS: Record<string, RegExp[]> = {
  add: [/add/i, /create/i, /new/i, /insert/i, /generate/i],
  enhance: [/enhance/i, /improve/i, /update/i, /complete/i, /fill/i],
  validate: [/valid/i, /verify/i, /check/i, /test/i, /audit/i],
  search: [/find/i, /search/i, /lookup/i, /query/i, /get/i],
  calculate: [/calculat/i, /compute/i, /determin/i, /estimate/i],
  extract: [/extract/i, /pull/i, /isolate/i, /migrate/i],
  debug: [/debug/i, /fix/i, /troubleshoot/i, /resolve/i],
  plan: [/plan/i, /design/i, /brainstorm/i, /architect/i],
  execute: [/execute/i, /run/i, /perform/i, /implement/i],
  review: [/review/i, /assess/i, /evaluate/i, /analyze/i]
};

// Skill recommendation mappings
const DOMAIN_TO_SKILLS: Record<string, string[]> = {
  materials: [
    "prism-material-schema", "prism-material-physics", "prism-material-lookup",
    "prism-material-validator", "prism-material-enhancer"
  ],
  machines: [
    "prism-manufacturing-tables"
  ],
  alarms: [
    "prism-error-catalog", "prism-fanuc-programming", "prism-siemens-programming"
  ],
  calculations: [
    "prism-universal-formulas", "prism-material-physics"
  ],
  programming: [
    "prism-fanuc-programming", "prism-siemens-programming", 
    "prism-heidenhain-programming", "prism-gcode-reference"
  ],
  session: [
    "prism-session-master", "prism-quick-start", "prism-state-manager",
    "prism-session-buffer", "prism-task-continuity"
  ],
  quality: [
    "prism-validator", "prism-quality-master", "prism-safety-framework",
    "prism-reasoning-engine", "prism-code-perfection", "prism-process-optimizer",
    "prism-master-equation", "prism-cognitive-core"
  ],
  code: [
    "prism-code-master", "prism-coding-patterns", "prism-api-contracts",
    "prism-tdd"
  ],
  ai: [
    "prism-ai-ml-master", "prism-algorithm-selector", "prism-cognitive-core"
  ]
};

const ACTION_TO_SKILLS: Record<string, string[]> = {
  add: ["prism-sp-planning", "prism-sp-execution"],
  enhance: ["prism-material-enhancer", "prism-sp-execution"],
  validate: ["prism-validator", "prism-safety-framework", "prism-sp-verification"],
  search: ["prism-material-lookup", "prism-monolith-navigator"],
  calculate: ["prism-universal-formulas", "prism-material-physics"],
  extract: ["prism-monolith-extractor", "prism-extraction-orchestrator"],
  debug: ["prism-debugging", "prism-sp-debugging", "prism-error-recovery"],
  plan: ["prism-sp-brainstorm", "prism-sp-planning"],
  execute: ["prism-sp-execution", "prism-skill-orchestrator"],
  review: ["prism-sp-review-quality", "prism-sp-review-spec", "prism-sp-verification"]
};

// ============================================================================
// SKILL EXECUTOR ENGINE
// ============================================================================

export class SkillExecutor {
  private config: SkillExecutorConfig;
  private cache: Map<string, { content: string; timestamp: number; lines: number }>;
  private usageStats: Map<string, SkillUsageRecord>;
  private initialized: boolean = false;

  constructor(config: Partial<SkillExecutorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new Map();
    this.usageStats = new Map();
  }

  /**
   * Initialize the skill executor
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    log.info("Initializing SkillExecutor...");

    // Ensure skill registry is loaded
    await skillRegistry.load();

    this.initialized = true;
    log.info(`SkillExecutor initialized with ${skillRegistry.size} skills available`);

    // Emit initialization event
    await eventBus.publish("skill_executor.initialized", { skills_available: skillRegistry.size }, { source: "SkillExecutor" });
  }

  // ==========================================================================
  // SKILL LOADING
  // ==========================================================================

  /**
   * Load a skill by ID with caching
   */
  async loadSkill(skillId: string): Promise<SkillLoadResult> {
    const startTime = Date.now();

    try {
      // Check cache first
      if (this.config.cache_enabled) {
        const cached = this.cache.get(skillId);
        if (cached && (Date.now() - cached.timestamp) < this.config.cache_ttl_ms) {
          this.trackUsage(skillId, Date.now() - startTime, true, "cache_hit");
          return {
            success: true,
            skill_id: skillId,
            content: cached.content,
            lines: cached.lines,
            cached: true,
            load_time_ms: Date.now() - startTime
          };
        }
      }

      // Get skill from registry
      const skill = skillRegistry.getSkill(skillId);
      if (!skill) {
        return {
          success: false,
          skill_id: skillId,
          cached: false,
          load_time_ms: Date.now() - startTime,
          error: `Skill not found: ${skillId}`
        };
      }

      // Load content from filesystem
      const content = await skillRegistry.getContent(skillId);
      if (!content) {
        return {
          success: false,
          skill_id: skillId,
          cached: false,
          load_time_ms: Date.now() - startTime,
          error: `Failed to load skill content: ${skillId}`
        };
      }

      const lines = content.split("\n").length;

      // Cache the content
      if (this.config.cache_enabled) {
        this.addToCache(skillId, content, lines);
      }

      this.trackUsage(skillId, Date.now() - startTime, true, "loaded");

      return {
        success: true,
        skill_id: skillId,
        content,
        lines,
        cached: false,
        load_time_ms: Date.now() - startTime
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.trackUsage(skillId, Date.now() - startTime, false, "error");
      return {
        success: false,
        skill_id: skillId,
        cached: false,
        load_time_ms: Date.now() - startTime,
        error
      };
    }
  }

  /**
   * Load multiple skills
   */
  async loadSkills(skillIds: string[]): Promise<SkillLoadResult[]> {
    const results: SkillLoadResult[] = [];
    
    for (const skillId of skillIds) {
      const result = await this.loadSkill(skillId);
      results.push(result);
    }

    return results;
  }

  /**
   * Add content to cache with LRU eviction
   */
  private addToCache(skillId: string, content: string, lines: number): void {
    // Evict oldest entries if at capacity
    while (this.cache.size >= this.config.max_cache_entries) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      
      for (const [key, value] of this.cache) {
        if (value.timestamp < oldestTime) {
          oldestTime = value.timestamp;
          oldestKey = key;
        }
      }
      
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(skillId, { content, timestamp: Date.now(), lines });
  }

  // ==========================================================================
  // TASK ANALYSIS
  // ==========================================================================

  /**
   * Analyze a task description to understand requirements
   */
  analyzeTask(taskDescription: string): TaskAnalysis {
    const task = taskDescription.toLowerCase();
    
    // Detect domains
    const detected_domains: string[] = [];
    for (const [domain, patterns] of Object.entries(DOMAIN_PATTERNS)) {
      if (patterns.some(p => p.test(task))) {
        detected_domains.push(domain);
      }
    }

    // Detect actions
    const detected_actions: string[] = [];
    for (const [action, patterns] of Object.entries(ACTION_PATTERNS)) {
      if (patterns.some(p => p.test(task))) {
        detected_actions.push(action);
      }
    }

    // Determine complexity
    let complexity: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    if (detected_domains.length >= 3 || detected_actions.length >= 3) {
      complexity = "HIGH";
    } else if (detected_domains.length >= 2 || detected_actions.length >= 2) {
      complexity = "MEDIUM";
    }

    // Check for specific requirements
    const requires_physics = 
      /kienzle|johnson|taylor|force|thermal|stability/i.test(task) ||
      detected_domains.includes("calculations");
    
    const requires_safety = 
      /safety|s\(x\)|critical|validate|verify/i.test(task) ||
      detected_domains.includes("quality");
    
    const requires_code = 
      /typescript|code|interface|schema|implement/i.test(task) ||
      detected_domains.includes("code");

    // Generate approach suggestion
    let suggested_approach = "Direct execution";
    if (requires_physics && requires_safety) {
      suggested_approach = "Use Multi-Agent Orchestrator (Research→Physics→Code→Safety)";
    } else if (complexity === "HIGH") {
      suggested_approach = "Break into sub-tasks with skill chain";
    } else if (detected_actions.includes("plan")) {
      suggested_approach = "Start with brainstorm, then plan execution";
    }

    return {
      task: taskDescription,
      detected_domains,
      detected_actions,
      complexity,
      requires_physics,
      requires_safety,
      requires_code,
      suggested_approach
    };
  }

  // ==========================================================================
  // SKILL RECOMMENDATION
  // ==========================================================================

  /**
   * Get skill recommendations for a task
   */
  async recommendSkills(taskDescription: string): Promise<SkillRecommendation[]> {
    await this.initialize();

    const analysis = this.analyzeTask(taskDescription);
    const recommendations: Map<string, SkillRecommendation> = new Map();

    // Add skills based on detected domains
    for (const domain of analysis.detected_domains) {
      const skillIds = DOMAIN_TO_SKILLS[domain] || [];
      for (const skillId of skillIds) {
        this.addRecommendation(recommendations, skillId, `Matches domain: ${domain}`, 0.4);
      }
    }

    // Add skills based on detected actions
    for (const action of analysis.detected_actions) {
      const skillIds = ACTION_TO_SKILLS[action] || [];
      for (const skillId of skillIds) {
        this.addRecommendation(recommendations, skillId, `Matches action: ${action}`, 0.3);
      }
    }

    // Add core skills for complex tasks
    if (analysis.complexity === "HIGH") {
      this.addRecommendation(recommendations, "prism-skill-orchestrator", "High complexity task", 0.5);
      this.addRecommendation(recommendations, "prism-cognitive-core", "High complexity task", 0.3);
    }

    // Add safety skills if needed
    if (analysis.requires_safety) {
      this.addRecommendation(recommendations, "prism-safety-framework", "Safety validation required", 0.5);
      this.addRecommendation(recommendations, "prism-master-equation", "Quality scoring required", 0.4);
    }

    // Add physics skills if needed
    if (analysis.requires_physics) {
      this.addRecommendation(recommendations, "prism-material-physics", "Physics calculations required", 0.5);
      this.addRecommendation(recommendations, "prism-universal-formulas", "Formulas required", 0.4);
    }

    // Use registry's findForTask for additional matches
    const registryMatches = skillRegistry.findForTask(taskDescription);
    for (const skill of registryMatches) {
      this.addRecommendation(recommendations, skill.skill_id, "Registry pattern match", 0.35);
    }

    // Convert to array and enrich with skill data
    const results: SkillRecommendation[] = [];
    for (const [skillId, rec] of recommendations) {
      const skill = skillRegistry.getSkill(skillId);
      if (skill && rec.relevance_score >= this.config.min_relevance_threshold) {
        results.push({
          ...rec,
          name: skill.name,
          category: skill.category,
          priority: skill.priority,
          dependencies: skill.dependencies.map(d => d.skill_id),
          estimated_value: rec.relevance_score >= 0.7 ? "HIGH" : 
                          rec.relevance_score >= 0.5 ? "MEDIUM" : "LOW"
        });
      }
    }

    // Sort by relevance score descending
    results.sort((a, b) => b.relevance_score - a.relevance_score);

    // Limit results
    return results.slice(0, this.config.max_recommendation_count);
  }

  /**
   * Add or update a recommendation
   */
  private addRecommendation(
    map: Map<string, SkillRecommendation>,
    skillId: string,
    reason: string,
    scoreBoost: number
  ): void {
    const existing = map.get(skillId);
    if (existing) {
      existing.relevance_score = Math.min(1.0, existing.relevance_score + scoreBoost);
      if (!existing.match_reasons.includes(reason)) {
        existing.match_reasons.push(reason);
      }
    } else {
      map.set(skillId, {
        skill_id: skillId,
        name: "",
        category: "core_development",
        relevance_score: scoreBoost,
        match_reasons: [reason],
        priority: 5,
        dependencies: [],
        estimated_value: "LOW"
      });
    }
  }

  // ==========================================================================
  // SKILL CHAINS
  // ==========================================================================

  // Predefined chain templates for common manufacturing workflows
  private static readonly PREDEFINED_CHAINS: Record<string, { skills: string[]; purpose: string; description: string }> = {
    "speed-feed-full": {
      skills: ["prism-speed-feed-engine", "prism-cutting-mechanics", "prism-material-physics", "prism-cutting-tools", "prism-safety-framework"],
      purpose: "Complete speed/feed calculation with physics validation and safety checks",
      description: "Material→Physics→Cutting mechanics→Speed/feed→Tool selection→Safety validation"
    },
    "toolpath-optimize": {
      skills: ["prism-cam-strategies", "prism-cutting-mechanics", "prism-speed-feed-engine", "prism-process-optimizer", "prism-safety-framework"],
      purpose: "Toolpath strategy selection with cutting parameter optimization",
      description: "CAM strategy→Cutting mechanics→Speed/feed→Process optimization→Safety"
    },
    "material-complete": {
      skills: ["prism-material-lookup", "prism-material-physics", "prism-material-enhancer", "prism-cutting-mechanics", "prism-universal-formulas"],
      purpose: "Full material analysis with physics properties and machinability assessment",
      description: "Material lookup→Physics properties→Gap filling→Cutting mechanics→Formula validation"
    },
    "alarm-diagnose": {
      skills: ["prism-controller-quick-ref", "prism-fanuc-programming", "prism-heidenhain-programming", "prism-siemens-programming", "prism-error-recovery"],
      purpose: "Cross-controller alarm diagnosis with fix procedures",
      description: "Controller reference→Controller-specific docs→Error recovery procedures"
    },
    "quality-release": {
      skills: ["prism-quality-gates", "prism-anti-regression", "prism-ralph-validation", "prism-master-equation", "prism-safety-framework"],
      purpose: "Full quality validation pipeline for release readiness",
      description: "Quality gates→Anti-regression→Ralph validation→Ω(x) scoring→Safety"
    },
    "session-recovery": {
      skills: ["prism-state-manager", "prism-session-handoff", "prism-task-continuity", "prism-context-engineering", "prism-context-pressure"],
      purpose: "Session recovery and context reconstruction after compaction",
      description: "State load→Session handoff→Task continuity→Context engineering→Pressure management"
    }
  };

  /**
   * Get a predefined chain template by name
   */
  getPredefinedChain(name: string): { skills: string[]; purpose: string; description: string } | undefined {
    return SkillExecutor.PREDEFINED_CHAINS[name];
  }

  /**
   * List all predefined chain templates
   */
  listPredefinedChains(): Array<{ name: string; purpose: string; description: string; skill_count: number }> {
    return Object.entries(SkillExecutor.PREDEFINED_CHAINS).map(([name, chain]) => ({
      name, purpose: chain.purpose, description: chain.description, skill_count: chain.skills.length
    }));
  }

  /**
   * Build a skill chain with dependency resolution
   */
  async buildSkillChain(skillIds: string[], purpose: string): Promise<SkillChain> {
    await this.initialize();

    const chainId = `chain_${Date.now()}`;
    const allSkills = new Set<string>(skillIds);
    const executionOrder: string[] = [];

    // Resolve dependencies
    for (const skillId of skillIds) {
      const skill = skillRegistry.getSkill(skillId);
      if (skill) {
        for (const dep of skill.dependencies) {
          if (!dep.optional) {
            allSkills.add(dep.skill_id);
          }
        }
      }
    }

    // Topological sort for execution order
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (skillId: string): void => {
      if (visited.has(skillId)) return;
      if (visiting.has(skillId)) {
        log.warn(`Circular dependency detected: ${skillId}`);
        return;
      }

      visiting.add(skillId);

      const skill = skillRegistry.getSkill(skillId);
      if (skill) {
        for (const dep of skill.dependencies) {
          if (!dep.optional && allSkills.has(dep.skill_id)) {
            visit(dep.skill_id);
          }
        }
      }

      visiting.delete(skillId);
      visited.add(skillId);
      executionOrder.push(skillId);
    };

    for (const skillId of allSkills) {
      visit(skillId);
    }

    // Calculate total lines
    let totalLines = 0;
    for (const skillId of allSkills) {
      const skill = skillRegistry.getSkill(skillId);
      if (skill) {
        totalLines += skill.lines || 0;
      }
    }

    // Check if all dependencies are satisfied
    let dependencySatisfied = true;
    for (const skillId of allSkills) {
      const skill = skillRegistry.getSkill(skillId);
      if (skill) {
        for (const dep of skill.dependencies) {
          if (!dep.optional && !allSkills.has(dep.skill_id)) {
            dependencySatisfied = false;
            break;
          }
        }
      }
    }

    return {
      chain_id: chainId,
      skills: Array.from(allSkills),
      purpose,
      total_lines: totalLines,
      execution_order: executionOrder,
      dependency_satisfied: dependencySatisfied
    };
  }

  /**
   * Execute a skill chain (load all skills in order)
   */
  async executeSkillChain(chain: SkillChain): Promise<{
    success: boolean;
    loaded: SkillLoadResult[];
    combined_content: string;
    total_lines: number;
    execution_time_ms: number;
  }> {
    const startTime = Date.now();
    const loaded: SkillLoadResult[] = [];
    const contents: string[] = [];

    for (const skillId of chain.execution_order) {
      const result = await this.loadSkill(skillId);
      loaded.push(result);
      
      if (result.success && result.content) {
        contents.push(`\n\n${"=".repeat(80)}\n# SKILL: ${skillId}\n${"=".repeat(80)}\n\n${result.content}`);
      }
    }

    const success = loaded.every(r => r.success);
    const totalLines = loaded.reduce((sum, r) => sum + (r.lines || 0), 0);

    return {
      success,
      loaded,
      combined_content: contents.join(""),
      total_lines: totalLines,
      execution_time_ms: Date.now() - startTime
    };
  }

  // ==========================================================================
  // USAGE TRACKING
  // ==========================================================================

  /**
   * Track skill usage
   */
  private trackUsage(skillId: string, loadTimeMs: number, success: boolean, context: string): void {
    if (!this.config.enable_usage_tracking) return;

    const existing = this.usageStats.get(skillId);
    
    if (existing) {
      existing.load_count++;
      existing.last_loaded = new Date().toISOString();
      existing.avg_load_time_ms = (existing.avg_load_time_ms * (existing.load_count - 1) + loadTimeMs) / existing.load_count;
      existing.success_rate = (existing.success_rate * (existing.load_count - 1) + (success ? 1 : 0)) / existing.load_count;
      if (!existing.contexts.includes(context)) {
        existing.contexts.push(context);
      }
    } else {
      this.usageStats.set(skillId, {
        skill_id: skillId,
        load_count: 1,
        last_loaded: new Date().toISOString(),
        avg_load_time_ms: loadTimeMs,
        success_rate: success ? 1 : 0,
        contexts: [context]
      });
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): SkillUsageRecord[] {
    return Array.from(this.usageStats.values())
      .sort((a, b) => b.load_count - a.load_count);
  }

  /**
   * Get most used skills
   */
  getMostUsed(limit: number = 10): SkillUsageRecord[] {
    return this.getUsageStats().slice(0, limit);
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Clear the skill cache
   */
  clearCache(): void {
    this.cache.clear();
    log.info("Skill cache cleared");
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    entries: number;
    total_lines: number;
    oldest_entry_age_ms: number;
  } {
    let totalLines = 0;
    let oldestTime = Date.now();

    for (const entry of this.cache.values()) {
      totalLines += entry.lines;
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
      }
    }

    return {
      entries: this.cache.size,
      total_lines: totalLines,
      oldest_entry_age_ms: this.cache.size > 0 ? Date.now() - oldestTime : 0
    };
  }

  /**
   * Get all available skill categories
   */
  getCategories(): SkillCategory[] {
    const categories = new Set<SkillCategory>();
    for (const skill of skillRegistry.all()) {
      categories.add(skill.category);
    }
    return Array.from(categories);
  }

  /**
   * Get skills by category
   */
  getByCategory(category: SkillCategory): Skill[] {
    return skillRegistry.getByCategory(category);
  }

  /**
   * Search skills
   */
  searchSkills(query: string, options?: { category?: SkillCategory; limit?: number }): Skill[] {
    const result = skillRegistry.search({
      query,
      category: options?.category,
      limit: options?.limit || 20
    });
    return result.skills;
  }

  /**
   * Get executor statistics
   */
  getStats(): {
    skills_available: number;
    cache: { entries: number; total_lines: number; oldest_entry_age_ms: number };
    usage: { total_loads: number; unique_skills_used: number; avg_load_time_ms: number };
    registry: ReturnType<typeof skillRegistry.getStats>;
  } {
    const cacheStats = this.getCacheStats();
    const usageRecords = this.getUsageStats();
    
    const totalLoads = usageRecords.reduce((sum, r) => sum + r.load_count, 0);
    const avgLoadTime = usageRecords.length > 0 
      ? usageRecords.reduce((sum, r) => sum + r.avg_load_time_ms, 0) / usageRecords.length 
      : 0;

    return {
      skills_available: skillRegistry.size,
      cache: cacheStats,
      usage: {
        total_loads: totalLoads,
        unique_skills_used: usageRecords.length,
        avg_load_time_ms: Math.round(avgLoadTime * 100) / 100
      },
      registry: skillRegistry.getStats()
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const skillExecutor = new SkillExecutor();

// Export types for MCP tools
export type {
  SkillLoadResult,
  SkillRecommendation,
  SkillChain,
  SkillUsageRecord,
  TaskAnalysis
};
