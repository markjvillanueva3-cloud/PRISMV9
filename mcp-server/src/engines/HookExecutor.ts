/**
 * PRISM MCP Server - Hook Executor Engine
 * Session 6.2A: Core Hook Infrastructure
 * 
 * The Ultimate Enforcement System - Hooks run as CODE, not prompts.
 * 100% reliability, 0 tokens, impossible to bypass.
 * 
 * Features:
 * - Hook registration by phase/category/priority
 * - Synchronous and asynchronous execution
 * - Blocking vs warning vs logging modes
 * - Hook chaining with data flow
 * - Context-rich execution
 * - Execution metrics and audit trail
 * - Dynamic enable/disable
 * - Timeout handling
 * - Error recovery
 * 
 * @version 2.0.0 (Complete rewrite for enforcement)
 * @author PRISM Development Team
 */

import { log } from "../utils/Logger.js";
import { eventBus, EventTypes } from "./EventBus.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Hook execution phases - when hooks run
 */
export type HookPhase = 
  // File operations
  | "pre-file-read" | "post-file-read"
  | "pre-file-write" | "post-file-write"
  | "pre-file-delete" | "post-file-delete"
  // Material operations
  | "pre-material-add" | "post-material-add"
  | "pre-material-update" | "post-material-update"
  | "pre-material-delete" | "post-material-delete"
  // Machine operations
  | "pre-machine-add" | "post-machine-add"
  | "pre-machine-update" | "post-machine-update"
  // Alarm operations
  | "pre-alarm-add" | "post-alarm-add"
  | "pre-alarm-batch" | "post-alarm-batch"
  // Calculation operations
  | "pre-calculation" | "post-calculation"
  | "pre-kienzle" | "post-kienzle"
  | "pre-taylor" | "post-taylor"
  | "pre-johnson-cook" | "post-johnson-cook"
  // Session operations
  | "on-session-start" | "on-session-end"
  | "on-session-checkpoint" | "on-session-resume"
  | "on-context-pressure" | "on-compaction"
  // Quality operations
  | "pre-output" | "post-output"
  | "on-quality-drop" | "on-quality-improve"
  // Code operations
  | "pre-code-generate" | "post-code-generate"
  | "pre-code-commit" | "post-code-commit"
  // Agent operations
  | "pre-agent-execute" | "post-agent-execute"
  | "on-agent-error" | "on-agent-timeout"
  // Swarm operations
  | "pre-swarm-execute" | "post-swarm-complete"
  | "on-swarm-consensus" | "on-swarm-timeout"
  // Cognitive operations
  | "on-decision" | "on-outcome"
  // Error & observability
  | "on-error" | "on-audit" | "on-tool-call"
  | "on-pattern-match" | "on-anomaly" | "on-learning-update"
  // Batch import operations
  | "pre-batch-import" | "post-batch-import"
  // Manufacturing safety events
  | "on-force-limit" | "on-thermal-limit"
  | "on-tool-life-warning" | "on-machine-limit"
  | "on-pattern-match" | "on-anomaly"
  | "on-learning-update"
  // Manufacturing operations
  | "pre-toolpath" | "post-toolpath"
  | "on-force-limit" | "on-thermal-limit"
  | "on-tool-life-warning" | "on-machine-limit";

/**
 * Hook categories for organization
 */
export type HookCategory = 
  | "enforcement"    // BLOCK on failure
  | "validation"     // WARN on failure
  | "lifecycle"      // Session management
  | "observability"  // Metrics/logging
  | "automation"     // Trigger actions
  | "cognitive"      // AI-enhanced
  | "manufacturing"  // Manufacturing operations
  | "controller"     // Controller-specific validation
  | "recovery"       // Error recovery & resilience
  | "schema"         // Schema validation & evolution
  | string;          // Allow domain-specific categories (e.g. controller alarm families) // Domain-specific

/**
 * Hook execution mode
 */
export type HookMode = 
  | "blocking"   // Stops execution if fails
  | "warning"    // Logs warning, continues
  | "logging"    // Just logs, never blocks
  | "silent";    // No output

/**
 * Hook priority (lower = earlier)
 */
export type HookPriority = "critical" | "high" | "normal" | "low" | "background";

const PRIORITY_VALUES: Record<HookPriority, number> = {
  critical: 0,
  high: 25,
  normal: 50,
  low: 75,
  background: 100
};

/**
 * Rich context passed to hooks
 */
export interface HookContext {
  // Operation details
  operation: string;
  phase: HookPhase;
  timestamp: Date;
  
  // Target details
  target?: {
    type: "file" | "material" | "machine" | "alarm" | "calculation" | "code" | "agent" | "swarm";
    id?: string;
    path?: string;
    data?: unknown;
  };
  
  // Content (for file operations)
  content?: {
    old?: string | unknown;
    new?: string | unknown;
  };
  
  // Session context
  session?: {
    id: string;
    startTime: Date;
    toolCalls: number;
    checkpoints: number;
  };
  
  // Quality context
  quality?: {
    omega?: number;
    safety?: number;
    code?: number;
    reasoning?: number;
    process?: number;
  };
  
  // Previous hook results in chain
  previousResults?: HookResult[];
  
  // Custom metadata
  metadata?: Record<string, unknown>;
}

/**
 * Hook execution result
 */
export interface HookResult {
  hookId: string;
  hookName: string;
  phase: HookPhase;
  category: HookCategory;
  mode: HookMode;
  
  // Outcome
  success: boolean;
  blocked: boolean;
  
  // Details
  message: string;
  issues?: string[];
  warnings?: string[];
  
  // Metrics
  score?: number;       // 0-1 for validation hooks
  threshold?: number;   // Required threshold
  
  // Timing
  startTime: Date;
  endTime: Date;
  durationMs: number;
  
  // Data for chaining
  data?: unknown;
  
  // Actions taken
  actions?: string[];
}

/**
 * Hook chain result (multiple hooks)
 */
export interface HookChainResult {
  phase: HookPhase;
  totalHooks: number;
  executedHooks: number;
  blockedBy?: string;
  
  success: boolean;
  blocked: boolean;
  
  results: HookResult[];
  
  totalDurationMs: number;
  
  summary: string;
}

/**
 * Hook definition
 */
export interface HookDefinition {
  id: string;
  name: string;
  description: string;

  phase: HookPhase;
  category: HookCategory;
  mode: HookMode;
  priority: HookPriority;

  enabled: boolean;

  // MS2: EventBus event name for phase-based hook triggering via HookEngine
  event?: string;

  // Execution
  handler: (context: HookContext) => Promise<HookResult> | HookResult;

  // Conditions
  condition?: (context: HookContext) => boolean;

  // Timeout
  timeoutMs?: number;

  // Tags for filtering
  tags?: string[];

  // Statistics
  stats?: {
    executions: number;
    successes: number;
    failures: number;
    blocks: number;
    avgDurationMs: number;
  };
}

/**
 * Hook executor configuration
 */
export interface HookExecutorConfig {
  defaultTimeoutMs: number;
  maxConcurrentHooks: number;
  enableMetrics: boolean;
  enableAuditLog: boolean;
  auditLogMaxSize: number;
  continueOnError: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: HookExecutorConfig = {
  defaultTimeoutMs: 5000,
  maxConcurrentHooks: 10,
  enableMetrics: true,
  enableAuditLog: true,
  auditLogMaxSize: 1000,
  continueOnError: false
};

// ============================================================================
// HOOK EXECUTOR ENGINE
// ============================================================================

export class HookExecutor {
  private hooks: Map<string, HookDefinition> = new Map();
  private phaseHooks: Map<HookPhase, Set<string>> = new Map();
  private categoryHooks: Map<HookCategory, Set<string>> = new Map();
  private config: HookExecutorConfig;
  private auditLog: HookResult[] = [];
  private initialized: boolean = false;

  constructor(config: Partial<HookExecutorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the hook executor
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    log.info("Initializing HookExecutor...");
    this.initialized = true;
    
    await eventBus.publish("hook_executor.initialized", { hooks: this.hooks.size }, { source: "HookExecutor" });
  }

  // ==========================================================================
  // REGISTRATION
  // ==========================================================================

  /**
   * Register a hook
   */
  register(hook: HookDefinition): void {
    // Initialize stats
    hook.stats = hook.stats || {
      executions: 0,
      successes: 0,
      failures: 0,
      blocks: 0,
      avgDurationMs: 0
    };

    this.hooks.set(hook.id, hook);

    // Index by phase
    if (!this.phaseHooks.has(hook.phase)) {
      this.phaseHooks.set(hook.phase, new Set());
    }
    this.phaseHooks.get(hook.phase)!.add(hook.id);

    // Index by category
    if (!this.categoryHooks.has(hook.category)) {
      this.categoryHooks.set(hook.category, new Set());
    }
    this.categoryHooks.get(hook.category)!.add(hook.id);

    log.debug(`Registered hook: ${hook.id} (${hook.phase}, ${hook.category}, ${hook.mode})`);
  }

  /**
   * Register multiple hooks
   */
  registerMany(hooks: HookDefinition[]): void {
    for (const hook of hooks) {
      this.register(hook);
    }
    log.info(`Registered ${hooks.length} hooks`);
  }

  /**
   * Unregister a hook
   */
  unregister(hookId: string): boolean {
    const hook = this.hooks.get(hookId);
    if (!hook) return false;

    this.hooks.delete(hookId);
    this.phaseHooks.get(hook.phase)?.delete(hookId);
    this.categoryHooks.get(hook.category)?.delete(hookId);

    return true;
  }

  /**
   * Enable/disable a hook
   */
  setEnabled(hookId: string, enabled: boolean): boolean {
    const hook = this.hooks.get(hookId);
    if (!hook) return false;
    hook.enabled = enabled;
    return true;
  }

  /**
   * Enable/disable all hooks in a category
   */
  setCategoryEnabled(category: HookCategory, enabled: boolean): number {
    const hookIds = this.categoryHooks.get(category);
    if (!hookIds) return 0;

    let count = 0;
    for (const id of hookIds) {
      if (this.setEnabled(id, enabled)) count++;
    }
    return count;
  }

  // ==========================================================================
  // EXECUTION
  // ==========================================================================

  /**
   * Execute all hooks for a phase
   */
  async execute(phase: HookPhase, context: Partial<HookContext>): Promise<HookChainResult> {
    await this.initialize();

    const fullContext: HookContext = {
      operation: context.operation || phase,
      phase,
      timestamp: new Date(),
      ...context,
      previousResults: []
    };

    const hookIds = this.phaseHooks.get(phase);
    if (!hookIds || hookIds.size === 0) {
      return {
        phase,
        totalHooks: 0,
        executedHooks: 0,
        success: true,
        blocked: false,
        results: [],
        totalDurationMs: 0,
        summary: `No hooks registered for phase: ${phase}`
      };
    }

    // Emit HOOK_TRIGGERED lifecycle event
    try { await eventBus.publish(EventTypes.HOOK_TRIGGERED, { phase, hook_count: hookIds.size }, { source: "HookExecutor" }); } catch { /* best-effort */ }

    // Get and sort hooks by priority
    const hooks: HookDefinition[] = [];
    for (const id of hookIds) {
      const hook = this.hooks.get(id);
      if (hook && hook.enabled) {
        hooks.push(hook);
      }
    }
    hooks.sort((a, b) => PRIORITY_VALUES[a.priority] - PRIORITY_VALUES[b.priority]);

    const results: HookResult[] = [];
    const startTime = Date.now();
    let blocked = false;
    let blockedBy: string | undefined;

    // Execute hooks in order
    for (const hook of hooks) {
      // Check condition
      if (hook.condition && !hook.condition(fullContext)) {
        continue;
      }

      try {
        const result = await this.executeHook(hook, fullContext);
        results.push(result);
        fullContext.previousResults!.push(result);

        // Update stats
        this.updateStats(hook, result);

        // Add to audit log
        if (this.config.enableAuditLog) {
          this.addToAuditLog(result);
        }

        // Check for blocking
        if (result.blocked) {
          blocked = true;
          blockedBy = hook.id;
          
          // Emit block event
          await eventBus.publish("hook.blocked", { hookId: hook.id, phase, message: result.message }, { source: "HookExecutor" });

          // Stop chain if blocking hook failed
          if (!this.config.continueOnError) {
            break;
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log.error(`Hook ${hook.id} threw exception: ${error}`);

        const errorResult: HookResult = {
          hookId: hook.id,
          hookName: hook.name,
          phase: hook.phase,
          category: hook.category,
          mode: hook.mode,
          success: false,
          blocked: hook.mode === "blocking",
          message: `Hook exception: ${error}`,
          issues: [error],
          startTime: new Date(),
          endTime: new Date(),
          durationMs: 0
        };

        results.push(errorResult);

        if (hook.mode === "blocking" && !this.config.continueOnError) {
          blocked = true;
          blockedBy = hook.id;
          break;
        }
      }
    }

    const totalDurationMs = Date.now() - startTime;

    // Build summary
    const successCount = results.filter(r => r.success).length;
    const blockCount = results.filter(r => r.blocked).length;
    let summary: string;

    if (blocked) {
      summary = `🚫 BLOCKED by ${blockedBy}: ${results.find(r => r.hookId === blockedBy)?.message}`;
    } else if (blockCount > 0) {
      summary = `⚠️ ${successCount}/${results.length} passed with ${blockCount} warnings`;
    } else {
      summary = `✅ All ${results.length} hooks passed (${totalDurationMs}ms)`;
    }

    // Emit HOOK_COMPLETED lifecycle event
    try { await eventBus.publish(EventTypes.HOOK_COMPLETED, { phase, executed: results.length, blocked, duration_ms: totalDurationMs }, { source: "HookExecutor" }); } catch { /* best-effort */ }

    return {
      phase,
      totalHooks: hooks.length,
      executedHooks: results.length,
      blockedBy,
      success: !blocked,
      blocked,
      results,
      totalDurationMs,
      summary
    };
  }

  /**
   * Execute a single hook
   */
  private async executeHook(hook: HookDefinition, context: HookContext): Promise<HookResult> {
    const startTime = new Date();
    const timeoutMs = hook.timeoutMs || this.config.defaultTimeoutMs;

    try {
      // Execute with timeout
      const resultPromise = Promise.resolve(hook.handler(context));
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Hook timeout after ${timeoutMs}ms`)), timeoutMs);
      });

      const result = await Promise.race([resultPromise, timeoutPromise]);
      
      result.startTime = startTime;
      result.endTime = new Date();
      result.durationMs = result.endTime.getTime() - startTime.getTime();

      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return {
        hookId: hook.id,
        hookName: hook.name,
        phase: hook.phase,
        category: hook.category,
        mode: hook.mode,
        success: false,
        blocked: hook.mode === "blocking",
        message: error,
        issues: [error],
        startTime,
        endTime: new Date(),
        durationMs: Date.now() - startTime.getTime()
      };
    }
  }

  /**
   * Update hook statistics
   */
  private updateStats(hook: HookDefinition, result: HookResult): void {
    if (!hook.stats) return;

    hook.stats.executions++;
    if (result.success) {
      hook.stats.successes++;
    } else {
      hook.stats.failures++;
    }
    if (result.blocked) {
      hook.stats.blocks++;
    }

    // Rolling average duration
    const n = hook.stats.executions;
    hook.stats.avgDurationMs = ((n - 1) * hook.stats.avgDurationMs + result.durationMs) / n;
  }

  /**
   * Add result to audit log
   */
  private addToAuditLog(result: HookResult): void {
    this.auditLog.push(result);
    
    // Trim if over max size
    if (this.auditLog.length > this.config.auditLogMaxSize) {
      this.auditLog = this.auditLog.slice(-this.config.auditLogMaxSize);
    }
  }

  // ==========================================================================
  // QUERIES
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
  getAllHooks(): HookDefinition[] {
    return Array.from(this.hooks.values());
  }

  /**
   * Get hooks by phase
   */
  getHooksByPhase(phase: HookPhase): HookDefinition[] {
    const hookIds = this.phaseHooks.get(phase);
    if (!hookIds) return [];
    return Array.from(hookIds).map(id => this.hooks.get(id)!).filter(Boolean);
  }

  /**
   * Get hooks by category
   */
  getHooksByCategory(category: HookCategory): HookDefinition[] {
    const hookIds = this.categoryHooks.get(category);
    if (!hookIds) return [];
    return Array.from(hookIds).map(id => this.hooks.get(id)!).filter(Boolean);
  }

  /**
   * Get audit log
   */
  getAuditLog(options?: {
    hookId?: string;
    phase?: HookPhase;
    category?: HookCategory;
    blocked?: boolean;
    limit?: number;
  }): HookResult[] {
    let results = [...this.auditLog];

    if (options?.hookId) {
      results = results.filter(r => r.hookId === options.hookId);
    }
    if (options?.phase) {
      results = results.filter(r => r.phase === options.phase);
    }
    if (options?.category) {
      results = results.filter(r => r.category === options.category);
    }
    if (options?.blocked !== undefined) {
      results = results.filter(r => r.blocked === options.blocked);
    }

    // Most recent first
    results.reverse();

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalHooks: number;
    enabledHooks: number;
    byCategory: Record<string, number>;
    byPhase: Record<string, number>;
    byMode: Record<string, number>;
    totalExecutions: number;
    totalBlocks: number;
    auditLogSize: number;
  } {
    const hooks = this.getAllHooks();
    
    const byCategory: Record<string, number> = {};
    const byPhase: Record<string, number> = {};
    const byMode: Record<string, number> = {};
    let totalExecutions = 0;
    let totalBlocks = 0;

    for (const hook of hooks) {
      byCategory[hook.category] = (byCategory[hook.category] || 0) + 1;
      byPhase[hook.phase] = (byPhase[hook.phase] || 0) + 1;
      byMode[hook.mode] = (byMode[hook.mode] || 0) + 1;
      
      if (hook.stats) {
        totalExecutions += hook.stats.executions;
        totalBlocks += hook.stats.blocks;
      }
    }

    return {
      totalHooks: hooks.length,
      enabledHooks: hooks.filter(h => h.enabled).length,
      byCategory,
      byPhase,
      byMode,
      totalExecutions,
      totalBlocks,
      auditLogSize: this.auditLog.length
    };
  }

  /**
   * Clear audit log
   */
  clearAuditLog(): void {
    this.auditLog = [];
    log.info("Audit log cleared");
  }

  /**
   * Reset all hook statistics
   */
  resetStats(): void {
    for (const hook of this.hooks.values()) {
      hook.stats = {
        executions: 0,
        successes: 0,
        failures: 0,
        blocks: 0,
        avgDurationMs: 0
      };
    }
    log.info("Hook statistics reset");
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a standard hook result (success)
 */
export function hookSuccess(
  hook: { id: string; name: string; phase: HookPhase; category: HookCategory; mode: HookMode },
  message: string,
  options?: { score?: number; threshold?: number; data?: unknown; actions?: string[]; [key: string]: unknown }
): HookResult {
  return {
    hookId: hook.id,
    hookName: hook.name,
    phase: hook.phase,
    category: hook.category,
    mode: hook.mode,
    success: true,
    blocked: false,
    message,
    score: options?.score,
    threshold: options?.threshold,
    data: options?.data,
    actions: options?.actions,
    startTime: new Date(),
    endTime: new Date(),
    durationMs: 0
  };
}

/**
 * Create a standard hook result (failure/block)
 */
export function hookBlock(
  hook: { id: string; name: string; phase: HookPhase; category: HookCategory; mode: HookMode },
  message: string,
  options?: { score?: number; threshold?: number; issues?: string[]; warnings?: string[]; data?: unknown; [key: string]: unknown }
): HookResult {
  return {
    hookId: hook.id,
    hookName: hook.name,
    phase: hook.phase,
    category: hook.category,
    mode: hook.mode,
    success: false,
    blocked: hook.mode === "blocking",
    message,
    score: options?.score,
    threshold: options?.threshold,
    issues: options?.issues,
    warnings: options?.warnings,
    data: options?.data,
    startTime: new Date(),
    endTime: new Date(),
    durationMs: 0
  };
}

/**
 * Create a standard hook result (warning)
 */
export function hookWarning(
  hook: { id: string; name: string; phase: HookPhase; category: HookCategory; mode: HookMode },
  message: string,
  options?: { score?: number; threshold?: number; warnings?: string[]; data?: unknown; actions?: string[]; [key: string]: unknown }
): HookResult {
  return {
    hookId: hook.id,
    hookName: hook.name,
    phase: hook.phase,
    category: hook.category,
    mode: hook.mode,
    success: true,
    blocked: false,
    message,
    score: options?.score,
    threshold: options?.threshold,
    warnings: options?.warnings,
    data: options?.data,
    actions: options?.actions,
    startTime: new Date(),
    endTime: new Date(),
    durationMs: 0
  };
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const hookExecutor = new HookExecutor();
