/**
 * PRISM MCP Server - Hook Registry
 * Manages 162+ hooks for workflow integration and cognitive patterns
 * 
 * Hook Categories:
 * - System Hooks (15): Lifecycle, errors, state changes
 * - Cognitive Hooks (15): AI/ML patterns, reasoning, learning
 * - Law Hooks (8): Safety, validation, compliance
 * - Process Hooks (40): Workflow steps, checkpoints
 * - Data Hooks (30): CRUD operations, transformations
 * - Agent Hooks (24): Agent lifecycle, communication
 * - External Hooks (30): API calls, file operations, integrations
 */

import * as path from "path";
import { BaseRegistry } from "./base.js";
import { PATHS } from "../constants.js";
import { log } from "../utils/Logger.js";
import { fileExists, readJsonFile, listDirectory } from "../utils/files.js";

// ============================================================================
// TYPES
// ============================================================================

export type HookPriority = "critical" | "high" | "normal" | "low";
export type HookTiming = "before" | "after" | "around" | "on";
export type HookCategory = 
  | "system" 
  | "cognitive" 
  | "law" 
  | "process" 
  | "data" 
  | "agent" 
  | "external"
  | "validation"
  | "optimization";

export interface HookHandler {
  handler_id: string;
  type: "function" | "agent" | "webhook" | "script";
  target: string;  // Function name, agent ID, URL, or script path
  config?: Record<string, unknown>;
  enabled: boolean;
}

export interface HookCondition {
  field: string;
  operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "contains" | "matches";
  value: unknown;
}

export interface Hook {
  hook_id: string;
  name: string;
  category: HookCategory;
  description: string;
  
  // Timing and priority
  timing: HookTiming;
  priority: HookPriority;
  order: number;  // Execution order within same priority
  
  // Event specification
  event: string;  // Event name this hook responds to
  event_pattern?: string;  // Regex pattern for event matching
  
  // Conditions
  conditions?: HookCondition[];
  
  // Handlers
  handlers: HookHandler[];
  
  // Configuration
  async: boolean;  // Run asynchronously?
  timeout_ms?: number;
  retry_count?: number;
  fail_silent?: boolean;  // Continue on handler failure?
  
  // Status
  enabled: boolean;
  status: "active" | "inactive" | "deprecated";
  
  // Metrics
  metrics?: {
    total_invocations: number;
    avg_duration_ms: number;
    success_rate: number;
    last_invoked?: string;
  };
  
  // Metadata
  version: string;
  created: string;
  updated: string;
  tags?: string[];
}

// ============================================================================
// HOOK REGISTRY
// ============================================================================

export class HookRegistry extends BaseRegistry<Hook> {
  private indexByCategory: Map<HookCategory, Set<string>> = new Map();
  private indexByEvent: Map<string, Set<string>> = new Map();
  private indexByPriority: Map<HookPriority, Set<string>> = new Map();
  private indexByTiming: Map<HookTiming, Set<string>> = new Map();
  
  // Built-in hooks (always available)
  private builtInHooks: Map<string, Hook> = new Map();

  constructor() {
    super("hooks");
    this.initializeBuiltInHooks();
  }

  /**
   * Initialize built-in hooks
   */
  private initializeBuiltInHooks(): void {
    const builtIns: Hook[] = [
      // =======================================================================
      // SYSTEM HOOKS
      // =======================================================================
      {
        hook_id: "SYS-INIT-001",
        name: "System Initialization",
        category: "system",
        description: "Fires when system initializes",
        timing: "on",
        priority: "critical",
        order: 1,
        event: "system.init",
        handlers: [
          { handler_id: "h1", type: "function", target: "initializeRegistries", enabled: true },
          { handler_id: "h2", type: "function", target: "loadConfiguration", enabled: true }
        ],
        async: false,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["system", "lifecycle", "core"]
      },
      {
        hook_id: "SYS-ERROR-001",
        name: "Error Handler",
        category: "system",
        description: "Fires on system errors",
        timing: "on",
        priority: "critical",
        order: 1,
        event: "system.error",
        handlers: [
          { handler_id: "h1", type: "function", target: "logError", enabled: true },
          { handler_id: "h2", type: "function", target: "notifyAdmin", enabled: true }
        ],
        async: true,
        fail_silent: true,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["system", "error", "core"]
      },
      {
        hook_id: "SYS-STATE-001",
        name: "State Change Handler",
        category: "system",
        description: "Fires on session state changes",
        timing: "after",
        priority: "high",
        order: 1,
        event: "state.change",
        handlers: [
          { handler_id: "h1", type: "function", target: "persistState", enabled: true },
          { handler_id: "h2", type: "function", target: "notifyStateChange", enabled: true }
        ],
        async: true,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["system", "state", "core"]
      },

      // =======================================================================
      // COGNITIVE HOOKS (Bayesian, Optimization, Multi-Objective, etc.)
      // =======================================================================
      {
        hook_id: "BAYES-001",
        name: "Bayesian Prior Initialization",
        category: "cognitive",
        description: "Initialize Bayesian priors at session start",
        timing: "on",
        priority: "high",
        order: 1,
        event: "session.start",
        handlers: [
          { handler_id: "h1", type: "agent", target: "AGT-COG-REASONING", enabled: true, config: { action: "init_priors" } }
        ],
        async: false,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["cognitive", "bayesian", "core"]
      },
      {
        hook_id: "BAYES-002",
        name: "Bayesian Change Detection",
        category: "cognitive",
        description: "Detect significant changes using Bayesian analysis",
        timing: "after",
        priority: "normal",
        order: 2,
        event: "data.change",
        handlers: [
          { handler_id: "h1", type: "function", target: "detectBayesianChange", enabled: true }
        ],
        async: true,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["cognitive", "bayesian", "change_detection"]
      },
      {
        hook_id: "BAYES-003",
        name: "Bayesian Hypothesis Testing",
        category: "cognitive",
        description: "Test hypotheses with Bayesian inference",
        timing: "on",
        priority: "normal",
        order: 3,
        event: "hypothesis.test",
        handlers: [
          { handler_id: "h1", type: "agent", target: "AGT-COG-REASONING", enabled: true, config: { action: "test_hypothesis" } }
        ],
        async: false,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["cognitive", "bayesian", "hypothesis"]
      },
      {
        hook_id: "OPT-001",
        name: "Solution Optimization",
        category: "optimization",
        description: "Optimize solution parameters",
        timing: "after",
        priority: "normal",
        order: 1,
        event: "solution.generate",
        handlers: [
          { handler_id: "h1", type: "function", target: "optimizeSolution", enabled: true }
        ],
        async: true,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["cognitive", "optimization"]
      },
      {
        hook_id: "OPT-002",
        name: "Multi-Objective Optimization",
        category: "optimization",
        description: "Balance multiple competing objectives",
        timing: "on",
        priority: "normal",
        order: 2,
        event: "optimize.multi",
        handlers: [
          { handler_id: "h1", type: "function", target: "multiObjectiveOptimize", enabled: true }
        ],
        async: false,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["cognitive", "optimization", "multi_objective"]
      },
      {
        hook_id: "MULTI-001",
        name: "Pareto Front Calculation",
        category: "cognitive",
        description: "Calculate Pareto-optimal solutions",
        timing: "on",
        priority: "normal",
        order: 1,
        event: "pareto.calculate",
        handlers: [
          { handler_id: "h1", type: "function", target: "calculateParetoFront", enabled: true }
        ],
        async: false,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["cognitive", "pareto", "multi_objective"]
      },
      {
        hook_id: "GRAD-001",
        name: "Gradient Descent Step",
        category: "cognitive",
        description: "Execute gradient descent optimization step",
        timing: "on",
        priority: "normal",
        order: 1,
        event: "gradient.step",
        handlers: [
          { handler_id: "h1", type: "function", target: "gradientDescentStep", enabled: true }
        ],
        async: false,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["cognitive", "gradient", "optimization"]
      },
      {
        hook_id: "RL-001",
        name: "Reinforcement Learning Update",
        category: "cognitive",
        description: "Update RL model based on reward",
        timing: "after",
        priority: "normal",
        order: 1,
        event: "task.complete",
        handlers: [
          { handler_id: "h1", type: "agent", target: "AGT-COG-LEARNING", enabled: true, config: { action: "rl_update" } }
        ],
        async: true,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["cognitive", "reinforcement_learning"]
      },
      {
        hook_id: "RL-002",
        name: "Experience Replay",
        category: "cognitive",
        description: "Replay past experiences for learning",
        timing: "on",
        priority: "low",
        order: 2,
        event: "session.idle",
        handlers: [
          { handler_id: "h1", type: "agent", target: "AGT-COG-LEARNING", enabled: true, config: { action: "experience_replay" } }
        ],
        async: true,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["cognitive", "reinforcement_learning", "replay"]
      },

      // =======================================================================
      // LAW HOOKS (Safety, Validation, Compliance)
      // =======================================================================
      {
        hook_id: "SYS-LAW1",
        name: "Life Safety Check",
        category: "law",
        description: "Verify S(x) >= 0.70 safety constraint",
        timing: "before",
        priority: "critical",
        order: 1,
        event: "output.generate",
        handlers: [
          { handler_id: "h1", type: "function", target: "checkSafetyScore", enabled: true }
        ],
        async: false,
        fail_silent: false,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["law", "safety", "critical"]
      },
      {
        hook_id: "SYS-LAW2",
        name: "Microsession Compliance",
        category: "law",
        description: "Enforce microsession boundaries",
        timing: "before",
        priority: "high",
        order: 2,
        event: "task.start",
        handlers: [
          { handler_id: "h1", type: "function", target: "checkMicrosessionLimits", enabled: true }
        ],
        async: false,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["law", "microsession"]
      },
      {
        hook_id: "SYS-LAW3",
        name: "Completeness Verification",
        category: "law",
        description: "Verify 100% completeness - no placeholders",
        timing: "before",
        priority: "high",
        order: 3,
        event: "output.finalize",
        handlers: [
          { handler_id: "h1", type: "function", target: "checkCompleteness", enabled: true }
        ],
        async: false,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["law", "completeness"]
      },
      {
        hook_id: "SYS-LAW4",
        name: "Anti-Regression Guard",
        category: "law",
        description: "Verify new >= old before replacement",
        timing: "before",
        priority: "critical",
        order: 4,
        event: "data.replace",
        handlers: [
          { handler_id: "h1", type: "function", target: "antiRegressionCheck", enabled: true }
        ],
        async: false,
        fail_silent: false,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["law", "anti_regression", "critical"]
      },
      {
        hook_id: "SYS-LAW5",
        name: "Predictive Failure Check",
        category: "law",
        description: "Require 3 failure modes before action",
        timing: "before",
        priority: "high",
        order: 5,
        event: "action.execute",
        handlers: [
          { handler_id: "h1", type: "function", target: "checkFailureModes", enabled: true }
        ],
        async: false,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["law", "predictive"]
      },

      // =======================================================================
      // PROCESS HOOKS
      // =======================================================================
      {
        hook_id: "PROC-CHECKPOINT-001",
        name: "Progress Checkpoint",
        category: "process",
        description: "Create checkpoint every 5-8 items",
        timing: "after",
        priority: "high",
        order: 1,
        event: "item.complete",
        conditions: [
          { field: "items_since_checkpoint", operator: "gte", value: 5 }
        ],
        handlers: [
          { handler_id: "h1", type: "function", target: "createCheckpoint", enabled: true }
        ],
        async: true,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["process", "checkpoint"]
      },
      {
        hook_id: "PROC-BUFFER-001",
        name: "Buffer Zone Monitor",
        category: "process",
        description: "Monitor tool call buffer zones",
        timing: "after",
        priority: "high",
        order: 1,
        event: "tool.call",
        handlers: [
          { handler_id: "h1", type: "function", target: "checkBufferZone", enabled: true }
        ],
        async: false,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["process", "buffer"]
      },

      // =======================================================================
      // DATA HOOKS
      // =======================================================================
      {
        hook_id: "DATA-VALIDATE-001",
        name: "Data Validation",
        category: "data",
        description: "Validate data before persistence",
        timing: "before",
        priority: "high",
        order: 1,
        event: "data.save",
        handlers: [
          { handler_id: "h1", type: "function", target: "validateData", enabled: true }
        ],
        async: false,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["data", "validation"]
      },
      {
        hook_id: "DATA-TRANSFORM-001",
        name: "Data Transformation",
        category: "data",
        description: "Transform data between formats",
        timing: "before",
        priority: "normal",
        order: 2,
        event: "data.export",
        handlers: [
          { handler_id: "h1", type: "function", target: "transformData", enabled: true }
        ],
        async: false,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["data", "transformation"]
      },

      // =======================================================================
      // AGENT HOOKS
      // =======================================================================
      {
        hook_id: "AGT-INVOKE-001",
        name: "Agent Invocation",
        category: "agent",
        description: "Fires before agent invocation",
        timing: "before",
        priority: "high",
        order: 1,
        event: "agent.invoke",
        handlers: [
          { handler_id: "h1", type: "function", target: "logAgentInvocation", enabled: true },
          { handler_id: "h2", type: "function", target: "checkAgentAvailability", enabled: true }
        ],
        async: false,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["agent", "invocation"]
      },
      {
        hook_id: "AGT-COMPLETE-001",
        name: "Agent Completion",
        category: "agent",
        description: "Fires after agent completes",
        timing: "after",
        priority: "high",
        order: 1,
        event: "agent.complete",
        handlers: [
          { handler_id: "h1", type: "function", target: "validateAgentOutput", enabled: true },
          { handler_id: "h2", type: "function", target: "updateAgentMetrics", enabled: true }
        ],
        async: true,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["agent", "completion"]
      },

      // =======================================================================
      // VALIDATION HOOKS
      // =======================================================================
      {
        hook_id: "VAL-SCHEMA-001",
        name: "Schema Validation",
        category: "validation",
        description: "Validate against JSON schema",
        timing: "before",
        priority: "high",
        order: 1,
        event: "data.create",
        handlers: [
          { handler_id: "h1", type: "function", target: "validateSchema", enabled: true }
        ],
        async: false,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["validation", "schema"]
      },
      {
        hook_id: "VAL-QUALITY-001",
        name: "Quality Score Validation",
        category: "validation",
        description: "Validate Ω(x) >= 0.70",
        timing: "before",
        priority: "high",
        order: 2,
        event: "output.publish",
        handlers: [
          { handler_id: "h1", type: "function", target: "validateQualityScore", enabled: true }
        ],
        async: false,
        enabled: true,
        status: "active",
        version: "1.0.0",
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["validation", "quality"]
      }
    ];

    for (const hook of builtIns) {
      this.builtInHooks.set(hook.hook_id, hook);
    }
    
    log.debug(`Initialized ${this.builtInHooks.size} built-in hooks`);
  }

  /**
   * Load hooks from files and merge with built-ins
   */
  async load(): Promise<void> {
    if (this.loaded) return;
    
    log.info("Loading HookRegistry...");
    
    // Start with built-in hooks
    for (const [id, hook] of this.builtInHooks) {
      this.set(id, hook);
    }
    
    // Load from hook definition files
    await this.loadFromPath(PATHS.HOOKS);
    
    this.buildIndexes();
    
    this.loaded = true;
    log.info(`HookRegistry loaded: ${this.entries.size} hooks`);
  }

  /**
   * Load hooks from a directory
   */
  private async loadFromPath(basePath: string): Promise<void> {
    try {
      if (!await fileExists(basePath)) {
        log.debug(`Hooks path does not exist: ${basePath}`);
        return;
      }
      
      const files = await listDirectory(basePath);
      const jsonFiles = files.filter(f => f.name.endsWith(".json"));
      
      for (const file of jsonFiles) {
        try {
          const filePath = file.path;
          const data = await readJsonFile<Hook | Hook[]>(filePath);
          
          const hooks = Array.isArray(data) ? data : [data];
          
          for (const hook of hooks) {
            if (hook.hook_id) {
              // Merge with built-in if exists
              const existing = this.builtInHooks.get(hook.hook_id);
              if (existing) {
                this.set(hook.hook_id, { ...existing, ...hook });
              } else {
                this.set(hook.hook_id, hook);
              }
            }
          }
        } catch (err) {
          log.warn(`Failed to load hook file ${file}: ${err}`);
        }
      }
    } catch (err) {
      log.warn(`Failed to load hooks: ${err}`);
    }
  }

  /**
   * Build search indexes
   */
  private buildIndexes(): void {
    this.indexByCategory.clear();
    this.indexByEvent.clear();
    this.indexByPriority.clear();
    this.indexByTiming.clear();
    
    for (const [id, entry] of this.entries) {
      const hook = entry.data;
      
      // Index by category
      if (!this.indexByCategory.has(hook.category)) {
        this.indexByCategory.set(hook.category, new Set());
      }
      this.indexByCategory.get(hook.category)?.add(id);
      
      // Index by event
      if (!this.indexByEvent.has(hook.event)) {
        this.indexByEvent.set(hook.event, new Set());
      }
      this.indexByEvent.get(hook.event)?.add(id);
      
      // Index by priority
      if (!this.indexByPriority.has(hook.priority)) {
        this.indexByPriority.set(hook.priority, new Set());
      }
      this.indexByPriority.get(hook.priority)?.add(id);
      
      // Index by timing
      if (!this.indexByTiming.has(hook.timing)) {
        this.indexByTiming.set(hook.timing, new Set());
      }
      this.indexByTiming.get(hook.timing)?.add(id);
    }
  }

  /**
   * Get hook by ID
   */
  getHook(id: string): Hook | undefined {
    return this.get(id);
  }

  /**
   * Get hooks for a specific event
   */
  getForEvent(event: string, timing?: HookTiming): Hook[] {
    const ids = this.indexByEvent.get(event) || new Set();
    let hooks = Array.from(ids)
      .map(id => this.get(id)!)
      .filter(h => h && h.enabled && h.status === "active");
    
    if (timing) {
      hooks = hooks.filter(h => h.timing === timing);
    }
    
    // Sort by priority and order
    const priorityOrder: Record<HookPriority, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3
    };
    
    return hooks.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return a.order - b.order;
    });
  }

  /**
   * Get hooks by category
   */
  getByCategory(category: HookCategory): Hook[] {
    const ids = this.indexByCategory.get(category) || new Set();
    return Array.from(ids).map(id => this.get(id)!).filter(Boolean);
  }

  /**
   * Get hooks by priority
   */
  getByPriority(priority: HookPriority): Hook[] {
    const ids = this.indexByPriority.get(priority) || new Set();
    return Array.from(ids).map(id => this.get(id)!).filter(Boolean);
  }

  /**
   * Search hooks with filters
   */
  search(options: {
    query?: string;
    category?: HookCategory;
    event?: string;
    priority?: HookPriority;
    timing?: HookTiming;
    enabled?: boolean;
    limit?: number;
    offset?: number;
  }): { hooks: Hook[]; total: number; hasMore: boolean } {
    let results: Hook[] = [];
    
    // Start with most selective filter
    if (options.event) {
      results = this.getForEvent(options.event);
    } else if (options.category) {
      results = this.getByCategory(options.category);
    } else if (options.priority) {
      results = this.getByPriority(options.priority);
    } else {
      results = this.all();
    }
    
    // Apply additional filters
    if (options.query) {
      const query = options.query.toLowerCase();
      results = results.filter(h =>
        h.name.toLowerCase().includes(query) ||
        h.hook_id.toLowerCase().includes(query) ||
        h.description.toLowerCase().includes(query)
      );
    }
    
    if (options.timing) {
      results = results.filter(h => h.timing === options.timing);
    }
    
    if (options.enabled !== undefined) {
      results = results.filter(h => h.enabled === options.enabled);
    }
    
    // Pagination
    const total = results.length;
    const offset = options.offset || 0;
    const limit = options.limit || 20;
    const paged = results.slice(offset, offset + limit);
    
    return {
      hooks: paged,
      total,
      hasMore: offset + paged.length < total
    };
  }

  /**
   * Get cognitive hooks (AI/ML patterns)
   */
  getCognitiveHooks(): Hook[] {
    return [
      ...this.getByCategory("cognitive"),
      ...this.getByCategory("optimization")
    ].filter(h => h.enabled && h.status === "active");
  }

  /**
   * Get law hooks (safety, compliance)
   */
  getLawHooks(): Hook[] {
    return this.getByCategory("law")
      .filter(h => h.enabled && h.status === "active")
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Get statistics about hooks
   */
  getStats(): {
    total: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    byTiming: Record<string, number>;
    activeEnabled: number;
    totalHandlers: number;
  } {
    const stats = {
      total: this.entries.size,
      byCategory: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      byTiming: {} as Record<string, number>,
      activeEnabled: 0,
      totalHandlers: 0
    };
    
    for (const [category, ids] of this.indexByCategory) {
      stats.byCategory[category] = ids.size;
    }
    
    for (const [priority, ids] of this.indexByPriority) {
      stats.byPriority[priority] = ids.size;
    }
    
    for (const [timing, ids] of this.indexByTiming) {
      stats.byTiming[timing] = ids.size;
    }
    
    for (const entry of this.entries.values()) {
      const h = entry.data;
      if (h.status === "active" && h.enabled) stats.activeEnabled++;
      stats.totalHandlers += h.handlers?.length || 0;
    }
    
    return stats;
  }

  /**
   * Fire hooks for an event
   */
  async fireEvent(
    event: string,
    timing: HookTiming,
    context: Record<string, unknown>
  ): Promise<{ results: unknown[]; errors: Error[] }> {
    const hooks = this.getForEvent(event, timing);
    const results: unknown[] = [];
    const errors: Error[] = [];
    
    for (const hook of hooks) {
      // Check conditions
      if (hook.conditions && !this.checkConditions(hook.conditions, context)) {
        continue;
      }
      
      for (const handler of hook.handlers) {
        if (!handler.enabled) continue;
        
        try {
          // For now, just log - actual execution would call the handler
          log.debug(`Would fire hook ${hook.hook_id} handler ${handler.handler_id}`);
          results.push({ hook_id: hook.hook_id, handler_id: handler.handler_id, status: "fired" });
        } catch (err) {
          if (!hook.fail_silent) {
            errors.push(err as Error);
          }
        }
      }
    }
    
    return { results, errors };
  }

  /**
   * Check hook conditions
   */
  private checkConditions(conditions: HookCondition[], context: Record<string, unknown>): boolean {
    for (const cond of conditions) {
      const value = context[cond.field];
      
      switch (cond.operator) {
        case "eq": if (value !== cond.value) return false; break;
        case "ne": if (value === cond.value) return false; break;
        case "gt": if ((value as number) <= (cond.value as number)) return false; break;
        case "gte": if ((value as number) < (cond.value as number)) return false; break;
        case "lt": if ((value as number) >= (cond.value as number)) return false; break;
        case "lte": if ((value as number) > (cond.value as number)) return false; break;
        case "contains": 
          if (!(value as string).includes(cond.value as string)) return false; 
          break;
        case "matches":
          if (!new RegExp(cond.value as string).test(value as string)) return false;
          break;
      }
    }
    
    return true;
  }
}

// Export singleton instance
export const hookRegistry = new HookRegistry();
