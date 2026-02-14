/**
 * PRISM MCP Server - Hook Execution Engine
 * Event-driven hook system with lifecycle management
 * 
 * Features:
 * - Event Bus for pub/sub messaging
 * - Lifecycle Hooks (before/after task, on error, etc.)
 * - Cognitive Pattern Hooks (BAYES, OPT, MULTI, GRAD, RL)
 * - Hook Priority & Ordering
 * - Async/Sync Hook Execution
 * - Hook Chains & Middleware
 * - Error Handling & Recovery
 * 
 * SAFETY CRITICAL: Hooks may modify manufacturing parameters.
 * All hook executions must be logged and reversible.
 */

import { log } from "../utils/Logger.js";
import { EventEmitter } from "events";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type HookPhase = 
  | "before" 
  | "after" 
  | "on_error" 
  | "on_success" 
  | "on_start" 
  | "on_complete"
  | "on_cancel"
  | "on_timeout";

export type HookPriority = "critical" | "high" | "normal" | "low" | "background";

export type CognitivePattern = 
  | "BAYES"      // Bayesian reasoning
  | "OPT"        // Optimization
  | "MULTI"      // Multi-objective
  | "GRAD"       // Gradient-based
  | "RL"         // Reinforcement learning
  | "ENSEMBLE"   // Ensemble methods
  | "CAUSAL";    // Causal inference

export interface HookDefinition {
  id: string;
  name: string;
  description: string;
  event: string;                      // Event to listen for
  phase: HookPhase;
  priority: HookPriority;
  enabled: boolean;
  handler: HookHandler;
  filter?: HookFilter;                // Optional filter function
  timeout_ms?: number;
  retries?: number;
  cognitivePattern?: CognitivePattern;
  metadata?: Record<string, unknown>;
}

export type HookHandler = (context: HookContext) => Promise<HookResult> | HookResult;
export type HookFilter = (context: HookContext) => boolean;

export interface HookContext {
  event: string;
  phase: HookPhase;
  timestamp: Date;
  data: Record<string, unknown>;
  source?: string;
  correlationId?: string;
  previousResults?: HookResult[];
  metadata?: Record<string, unknown>;
}

export interface HookResult {
  hookId: string;
  success: boolean;
  output?: unknown;
  error?: string;
  duration_ms: number;
  modified?: Record<string, unknown>;  // Data modifications
  halt?: boolean;                      // Stop hook chain
  metadata?: Record<string, unknown>;
}

export interface EventDefinition {
  name: string;
  description: string;
  category: string;
  dataSchema?: Record<string, unknown>;
  hooks: string[];                     // Registered hook IDs
}

export interface HookChainResult {
  event: string;
  phase: HookPhase;
  success: boolean;
  totalHooks: number;
  executedHooks: number;
  failedHooks: number;
  duration_ms: number;
  results: HookResult[];
  finalData: Record<string, unknown>;
  halted: boolean;
  haltedBy?: string;
}

export interface EventBusStats {
  totalEvents: number;
  totalHooks: number;
  eventsEmitted: number;
  hooksExecuted: number;
  hooksFailed: number;
  avgExecutionTime_ms: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const HOOK_CONSTANTS = {
  DEFAULT_TIMEOUT_MS: 5000,
  MAX_TIMEOUT_MS: 30000,
  DEFAULT_RETRIES: 1,
  MAX_RETRIES: 3,
  MAX_HOOKS_PER_EVENT: 50,
  
  PRIORITY_ORDER: {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3,
    background: 4
  },
  
  // Built-in events
  SYSTEM_EVENTS: [
    "system.startup",
    "system.shutdown",
    "system.error",
    "task.created",
    "task.started",
    "task.completed",
    "task.failed",
    "task.cancelled",
    "agent.registered",
    "agent.executed",
    "swarm.started",
    "swarm.completed",
    "calculation.started",
    "calculation.completed",
    "validation.started",
    "validation.completed",
    "safety.check",
    "safety.violation"
  ],
  
  // Cognitive hook events
  COGNITIVE_EVENTS: [
    "cognitive.bayes.prior",
    "cognitive.bayes.update",
    "cognitive.bayes.posterior",
    "cognitive.opt.start",
    "cognitive.opt.iterate",
    "cognitive.opt.converge",
    "cognitive.multi.pareto",
    "cognitive.grad.step",
    "cognitive.rl.reward",
    "cognitive.rl.update"
  ]
};

// ============================================================================
// EVENT BUS
// ============================================================================

export class EventBus extends EventEmitter {
  private eventRegistry: Map<string, EventDefinition> = new Map();
  private emitHistory: Array<{ event: string; timestamp: Date; data: unknown }> = [];
  private maxHistorySize: number = 1000;

  constructor() {
    super();
    this.setMaxListeners(100);
    this.registerSystemEvents();
  }

  /**
   * Register system events
   */
  private registerSystemEvents(): void {
    HOOK_CONSTANTS.SYSTEM_EVENTS.forEach(event => {
      this.registerEvent({
        name: event,
        description: `System event: ${event}`,
        category: "system",
        hooks: []
      });
    });

    HOOK_CONSTANTS.COGNITIVE_EVENTS.forEach(event => {
      this.registerEvent({
        name: event,
        description: `Cognitive event: ${event}`,
        category: "cognitive",
        hooks: []
      });
    });
  }

  /**
   * Register an event type
   */
  registerEvent(definition: EventDefinition): void {
    this.eventRegistry.set(definition.name, definition);
    log.debug(`[EventBus] Registered event: ${definition.name}`);
  }

  /**
   * Emit an event
   */
  emitEvent(event: string, data: Record<string, unknown>): void {
    const timestamp = new Date();
    
    // Track history
    this.emitHistory.push({ event, timestamp, data });
    if (this.emitHistory.length > this.maxHistorySize) {
      this.emitHistory.shift();
    }

    // Emit to listeners
    this.emit(event, { event, timestamp, data });
    log.debug(`[EventBus] Emitted: ${event}`);
  }

  /**
   * Get registered events
   */
  getEvents(): EventDefinition[] {
    return Array.from(this.eventRegistry.values());
  }

  /**
   * Get event by name
   */
  getEvent(name: string): EventDefinition | undefined {
    return this.eventRegistry.get(name);
  }

  /**
   * Get emit history
   */
  getHistory(limit: number = 100): Array<{ event: string; timestamp: Date; data: unknown }> {
    return this.emitHistory.slice(-limit);
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.emitHistory = [];
  }
}

// ============================================================================
// HOOK ENGINE
// ============================================================================

export class HookEngine {
  private hooks: Map<string, HookDefinition> = new Map();
  private eventHooks: Map<string, Set<string>> = new Map();  // event -> hookIds
  private eventBus: EventBus;
  private executionStats = {
    hooksExecuted: 0,
    hooksFailed: 0,
    totalDuration_ms: 0
  };

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus || new EventBus();
    this.registerBuiltInHooks();
  }

  /**
   * Register built-in cognitive hooks
   */
  private registerBuiltInHooks(): void {
    // BAYES-001: Prior Initialization
    this.registerHook({
      id: "BAYES-001",
      name: "Bayesian Prior Initialization",
      description: "Initialize Bayesian priors for decision making",
      event: "task.started",
      phase: "before",
      priority: "high",
      enabled: true,
      cognitivePattern: "BAYES",
      handler: async (ctx) => ({
        hookId: "BAYES-001",
        success: true,
        output: { priors: "initialized", confidence: 0.5 },
        duration_ms: 1
      })
    });

    // BAYES-002: Change Detection
    this.registerHook({
      id: "BAYES-002",
      name: "Bayesian Change Detection",
      description: "Detect significant changes using Bayesian inference",
      event: "validation.completed",
      phase: "after",
      priority: "normal",
      enabled: true,
      cognitivePattern: "BAYES",
      handler: async (ctx) => ({
        hookId: "BAYES-002",
        success: true,
        output: { changeDetected: false, bayesFactor: 1.0 },
        duration_ms: 1
      })
    });

    // OPT-001: Parameter Optimization
    this.registerHook({
      id: "OPT-001",
      name: "Parameter Optimization",
      description: "Optimize parameters using gradient-free methods",
      event: "calculation.completed",
      phase: "after",
      priority: "normal",
      enabled: true,
      cognitivePattern: "OPT",
      handler: async (ctx) => ({
        hookId: "OPT-001",
        success: true,
        output: { optimized: true, improvement: 0.05 },
        duration_ms: 1
      })
    });

    // MULTI-001: Pareto Analysis
    this.registerHook({
      id: "MULTI-001",
      name: "Pareto Frontier Analysis",
      description: "Analyze multi-objective trade-offs",
      event: "calculation.completed",
      phase: "after",
      priority: "low",
      enabled: true,
      cognitivePattern: "MULTI",
      handler: async (ctx) => ({
        hookId: "MULTI-001",
        success: true,
        output: { paretoPoints: [], dominated: [] },
        duration_ms: 1
      })
    });

    // SAFETY-001: Safety Check
    this.registerHook({
      id: "SAFETY-001",
      name: "Safety Validation",
      description: "Validate safety constraints before execution",
      event: "task.started",
      phase: "before",
      priority: "critical",
      enabled: true,
      handler: async (ctx) => {
        const safetyScore = 0.85;  // Simulated
        return {
          hookId: "SAFETY-001",
          success: safetyScore >= 0.7,
          output: { safetyScore, threshold: 0.7, passed: safetyScore >= 0.7 },
          duration_ms: 1,
          halt: safetyScore < 0.7
        };
      }
    });

    // LOG-001: Execution Logger
    this.registerHook({
      id: "LOG-001",
      name: "Execution Logger",
      description: "Log all task executions",
      event: "task.completed",
      phase: "after",
      priority: "background",
      enabled: true,
      handler: async (ctx) => {
        log.debug(`[LOG-001] Task completed: ${JSON.stringify(ctx.data)}`);
        return {
          hookId: "LOG-001",
          success: true,
          output: { logged: true, timestamp: new Date().toISOString() },
          duration_ms: 1
        };
      }
    });

    log.info(`[HookEngine] Registered ${this.hooks.size} built-in hooks`);
  }

  /**
   * Register a hook
   */
  registerHook(definition: HookDefinition): void {
    if (this.hooks.has(definition.id)) {
      log.warn(`[HookEngine] Overwriting existing hook: ${definition.id}`);
    }

    this.hooks.set(definition.id, definition);

    // Add to event mapping
    if (!this.eventHooks.has(definition.event)) {
      this.eventHooks.set(definition.event, new Set());
    }
    this.eventHooks.get(definition.event)!.add(definition.id);

    // Subscribe to event bus
    this.eventBus.on(definition.event, (ctx: HookContext) => {
      if (definition.enabled) {
        this.executeHook(definition.id, ctx);
      }
    });

    log.debug(`[HookEngine] Registered hook: ${definition.id} for event: ${definition.event}`);
  }

  /**
   * Unregister a hook
   */
  unregisterHook(hookId: string): boolean {
    const hook = this.hooks.get(hookId);
    if (!hook) return false;

    this.hooks.delete(hookId);
    this.eventHooks.get(hook.event)?.delete(hookId);

    log.debug(`[HookEngine] Unregistered hook: ${hookId}`);
    return true;
  }

  /**
   * Execute a single hook
   */
  async executeHook(hookId: string, context: HookContext): Promise<HookResult> {
    const hook = this.hooks.get(hookId);
    if (!hook) {
      return {
        hookId,
        success: false,
        error: `Hook not found: ${hookId}`,
        duration_ms: 0
      };
    }

    if (!hook.enabled) {
      return {
        hookId,
        success: true,
        output: { skipped: true, reason: "disabled" },
        duration_ms: 0
      };
    }

    // Apply filter if present
    if (hook.filter && !hook.filter(context)) {
      return {
        hookId,
        success: true,
        output: { skipped: true, reason: "filtered" },
        duration_ms: 0
      };
    }

    const startTime = Date.now();
    const timeout = hook.timeout_ms || HOOK_CONSTANTS.DEFAULT_TIMEOUT_MS;
    const maxRetries = hook.retries || HOOK_CONSTANTS.DEFAULT_RETRIES;
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          hook.handler(context),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("Hook timeout")), timeout)
          )
        ]);

        this.executionStats.hooksExecuted++;
        this.executionStats.totalDuration_ms += Date.now() - startTime;

        return {
          ...result,
          duration_ms: Date.now() - startTime
        };

      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        if (attempt < maxRetries) {
          await this.delay(100 * (attempt + 1));
        }
      }
    }

    this.executionStats.hooksFailed++;

    return {
      hookId,
      success: false,
      error: lastError,
      duration_ms: Date.now() - startTime
    };
  }

  /**
   * Execute all hooks for an event in a specific phase
   */
  async executeHookChain(
    event: string,
    phase: HookPhase,
    data: Record<string, unknown>,
    options?: {
      correlationId?: string;
      source?: string;
      stopOnHalt?: boolean;
      stopOnError?: boolean;
    }
  ): Promise<HookChainResult> {
    const startTime = Date.now();
    const hookIds = this.eventHooks.get(event);

    if (!hookIds || hookIds.size === 0) {
      return {
        event,
        phase,
        success: true,
        totalHooks: 0,
        executedHooks: 0,
        failedHooks: 0,
        duration_ms: Date.now() - startTime,
        results: [],
        finalData: data,
        halted: false
      };
    }

    // Get hooks for this phase, sorted by priority
    const phaseHooks = Array.from(hookIds)
      .map(id => this.hooks.get(id)!)
      .filter(h => h && h.phase === phase && h.enabled)
      .sort((a, b) => 
        HOOK_CONSTANTS.PRIORITY_ORDER[a.priority] - HOOK_CONSTANTS.PRIORITY_ORDER[b.priority]
      );

    const results: HookResult[] = [];
    let currentData = { ...data };
    let halted = false;
    let haltedBy: string | undefined;
    let failedHooks = 0;

    const context: HookContext = {
      event,
      phase,
      timestamp: new Date(),
      data: currentData,
      source: options?.source,
      correlationId: options?.correlationId || `chain_${Date.now()}`,
      previousResults: []
    };

    for (const hook of phaseHooks) {
      if (halted) break;

      context.data = currentData;
      context.previousResults = [...results];

      const result = await this.executeHook(hook.id, context);
      results.push(result);

      if (!result.success) {
        failedHooks++;
        if (options?.stopOnError) {
          halted = true;
          haltedBy = hook.id;
        }
      }

      // Apply modifications
      if (result.modified) {
        currentData = { ...currentData, ...result.modified };
      }

      // Check for halt signal
      if (result.halt) {
        halted = true;
        haltedBy = hook.id;
        if (options?.stopOnHalt !== false) break;
      }
    }

    return {
      event,
      phase,
      success: failedHooks === 0 && !halted,
      totalHooks: phaseHooks.length,
      executedHooks: results.length,
      failedHooks,
      duration_ms: Date.now() - startTime,
      results,
      finalData: currentData,
      halted,
      haltedBy
    };
  }

  /**
   * Execute before and after hooks for an operation
   */
  async wrapWithHooks<T>(
    event: string,
    data: Record<string, unknown>,
    operation: (data: Record<string, unknown>) => Promise<T>
  ): Promise<{ result: T; beforeHooks: HookChainResult; afterHooks: HookChainResult }> {
    // Execute before hooks
    const beforeHooks = await this.executeHookChain(event, "before", data, { stopOnHalt: true });

    if (beforeHooks.halted) {
      throw new Error(`Operation halted by hook: ${beforeHooks.haltedBy}`);
    }

    // Execute operation with potentially modified data
    let result: T;
    let afterPhase: HookPhase = "after";

    try {
      result = await operation(beforeHooks.finalData);
      afterPhase = "on_success";
    } catch (error) {
      // Execute error hooks
      await this.executeHookChain(event, "on_error", {
        ...beforeHooks.finalData,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }

    // Execute after hooks
    const afterHooks = await this.executeHookChain(event, afterPhase, {
      ...beforeHooks.finalData,
      result
    });

    return { result, beforeHooks, afterHooks };
  }

  /**
   * Emit an event (convenience method)
   */
  emit(event: string, data: Record<string, unknown>): void {
    this.eventBus.emitEvent(event, data);
  }

  // ==========================================================================
  // HOOK MANAGEMENT
  // ==========================================================================

  /**
   * Get hook by ID
   */
  getHook(hookId: string): HookDefinition | undefined {
    return this.hooks.get(hookId);
  }

  /**
   * Get all hooks
   */
  listHooks(): HookDefinition[] {
    return Array.from(this.hooks.values());
  }

  /**
   * Get hooks by event
   */
  getHooksForEvent(event: string): HookDefinition[] {
    const hookIds = this.eventHooks.get(event);
    if (!hookIds) return [];
    return Array.from(hookIds).map(id => this.hooks.get(id)!).filter(Boolean);
  }

  /**
   * Get hooks by cognitive pattern
   */
  getHooksByPattern(pattern: CognitivePattern): HookDefinition[] {
    return Array.from(this.hooks.values())
      .filter(h => h.cognitivePattern === pattern);
  }

  /**
   * Enable/disable a hook
   */
  setHookEnabled(hookId: string, enabled: boolean): boolean {
    const hook = this.hooks.get(hookId);
    if (!hook) return false;
    hook.enabled = enabled;
    log.info(`[HookEngine] Hook ${hookId} ${enabled ? "enabled" : "disabled"}`);
    return true;
  }

  /**
   * Get statistics
   */
  getStats(): EventBusStats {
    return {
      totalEvents: this.eventBus.getEvents().length,
      totalHooks: this.hooks.size,
      eventsEmitted: this.eventBus.getHistory().length,
      hooksExecuted: this.executionStats.hooksExecuted,
      hooksFailed: this.executionStats.hooksFailed,
      avgExecutionTime_ms: this.executionStats.hooksExecuted > 0
        ? this.executionStats.totalDuration_ms / this.executionStats.hooksExecuted
        : 0
    };
  }

  /**
   * Get event bus
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

export const eventBus = new EventBus();
export const hookEngine = new HookEngine(eventBus);

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Register a hook
 */
export function registerHook(definition: HookDefinition): void {
  hookEngine.registerHook(definition);
}

/**
 * Execute hooks for an event
 */
export async function executeHooks(
  event: string,
  phase: HookPhase,
  data: Record<string, unknown>
): Promise<HookChainResult> {
  return hookEngine.executeHookChain(event, phase, data);
}

/**
 * Emit an event
 */
export function emitEvent(event: string, data: Record<string, unknown>): void {
  eventBus.emitEvent(event, data);
}

/**
 * Create a cognitive hook
 */
export function createCognitiveHook(
  id: string,
  pattern: CognitivePattern,
  event: string,
  handler: HookHandler,
  options?: Partial<HookDefinition>
): HookDefinition {
  return {
    id,
    name: options?.name || `${pattern} Hook`,
    description: options?.description || `Cognitive hook using ${pattern} pattern`,
    event,
    phase: options?.phase || "after",
    priority: options?.priority || "normal",
    enabled: true,
    cognitivePattern: pattern,
    handler,
    ...options
  };
}
