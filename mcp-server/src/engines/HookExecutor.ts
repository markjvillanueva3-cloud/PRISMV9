/**
 * HookExecutor — Central hook execution engine
 *
 * Provides the execution infrastructure for PRISM's 220+ domain hooks.
 * Hooks are event-driven plugins that intercept dispatcher actions for:
 * - Validation (pre-execution guards)
 * - Enrichment (context injection)
 * - Observation (telemetry, logging)
 * - Safety enforcement (hard blocks on dangerous operations)
 *
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Phases at which hooks can execute */
export type HookPhase =
  | "pre-calculation"
  | "post-calculation"
  | "pre-file-write"
  | "post-file-write"
  | "pre-file-read"
  | "post-file-read"
  | "pre-dispatch"
  | "post-dispatch"
  | "pre-toolpath"
  | "post-toolpath"
  | "pre-material-add"
  | "post-material-add"
  | "pre-output"
  | "post-output"
  | "pre-kienzle"
  | "pre-taylor"
  | "pre-johnson-cook"
  | "error"
  | "cadence";

/** Hook execution modes */
export type HookMode = "blocking" | "warning" | "silent";

/** Hook priority levels */
export type HookPriority = "critical" | "high" | "normal" | "low";

/** Hook categories for organization */
export type HookCategory =
  | "enforcement"
  | "lifecycle"
  | "manufacturing"
  | "cognitive"
  | "observability"
  | "automation"
  | "safety"
  | "validation"
  | "recovery"
  | "agent"
  | "orchestration"
  | "schema"
  | "controller"
  | "cadence";

/** Context passed to hook handlers */
export interface HookContext {
  /** Operation being performed */
  operation: string;
  /** Target of the operation */
  target?: {
    type: "calculation" | "file" | "material" | "machine" | "tool" | "output" | "dispatch" | string;
    id?: string;
    path?: string;
    data?: Record<string, unknown>;
  };
  /** Content for file operations */
  content?: {
    old?: unknown;
    new?: unknown;
  };
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Session ID if available */
  sessionId?: string;
  /** Timestamp */
  timestamp?: string;
  /** User ID if available */
  userId?: string;
  /** Machine ID if available */
  machineId?: string;
  /** Material being processed */
  material?: string;
  /** Tool being used */
  tool?: string;
}

/** Result returned from hook execution */
export interface HookResult {
  /** Hook ID */
  hookId: string;
  /** Hook name */
  hookName: string;
  /** Whether hook succeeded */
  success: boolean;
  /** Whether hook blocked the operation */
  blocked: boolean;
  /** Result message */
  message: string;
  /** Data to pass forward */
  data?: Record<string, unknown>;
  /** Issues found (for blocks/warnings) */
  issues?: string[];
  /** Actions taken or recommended */
  actions?: string[];
  /** Warnings (non-blocking) */
  warnings?: string[];
}

/** Hook definition */
export interface HookDefinition {
  /** Unique hook ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what the hook does */
  description: string;
  /** Phase at which hook executes */
  phase: HookPhase;
  /** Category for organization */
  category: HookCategory;
  /** Execution mode */
  mode: HookMode;
  /** Priority level */
  priority: HookPriority;
  /** Whether hook is enabled */
  enabled: boolean;
  /** Tags for filtering */
  tags?: string[];
  /** The handler function */
  handler: (context: HookContext) => HookResult | Promise<HookResult>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a success result
 */
export function hookSuccess(
  hook: HookDefinition | { id: string; name: string },
  message: string,
  options?: {
    data?: Record<string, unknown>;
    actions?: string[];
  }
): HookResult {
  return {
    hookId: hook.id,
    hookName: hook.name,
    success: true,
    blocked: false,
    message,
    data: options?.data,
    actions: options?.actions,
  };
}

/**
 * Create a blocking result
 */
export function hookBlock(
  hook: HookDefinition | { id: string; name: string },
  message: string,
  options?: {
    issues?: string[];
    data?: Record<string, unknown>;
  }
): HookResult {
  return {
    hookId: hook.id,
    hookName: hook.name,
    success: false,
    blocked: true,
    message,
    issues: options?.issues,
    data: options?.data,
  };
}

/**
 * Create a warning result (non-blocking)
 */
export function hookWarning(
  hook: HookDefinition | { id: string; name: string },
  message: string,
  options?: {
    warnings?: string[];
    data?: Record<string, unknown>;
  }
): HookResult {
  return {
    hookId: hook.id,
    hookName: hook.name,
    success: true,
    blocked: false,
    message,
    warnings: options?.warnings,
    data: options?.data,
  };
}

// ============================================================================
// HOOK EXECUTOR ENGINE
// ============================================================================

/**
 * Priority values for sorting
 */
const PRIORITY_ORDER: Record<HookPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/**
 * Central hook execution engine
 */
class HookExecutorEngine {
  private hooks: Map<HookPhase, HookDefinition[]> = new Map();
  private allHooks: Map<string, HookDefinition> = new Map();

  /**
   * Register a hook
   */
  register(hook: HookDefinition): void {
    if (this.allHooks.has(hook.id)) {
      log.warn(`[HookExecutor] Hook ${hook.id} already registered, skipping`);
      return;
    }

    this.allHooks.set(hook.id, hook);

    const phaseHooks = this.hooks.get(hook.phase) || [];
    phaseHooks.push(hook);
    // Sort by priority (critical first)
    phaseHooks.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    this.hooks.set(hook.phase, phaseHooks);

    log.debug(`[HookExecutor] Registered hook ${hook.id} for phase ${hook.phase}`);
  }

  /**
   * Unregister a hook
   */
  unregister(hookId: string): boolean {
    const hook = this.allHooks.get(hookId);
    if (!hook) return false;

    this.allHooks.delete(hookId);

    const phaseHooks = this.hooks.get(hook.phase);
    if (phaseHooks) {
      const idx = phaseHooks.findIndex(h => h.id === hookId);
      if (idx >= 0) phaseHooks.splice(idx, 1);
    }

    return true;
  }

  /**
   * Execute hooks for a phase
   * @returns Combined result - blocked if any hook blocks
   */
  async execute(phase: HookPhase, context: Partial<HookContext>): Promise<{
    blocked: boolean;
    results: HookResult[];
    blockingHook?: string;
    message?: string;
  }> {
    const phaseHooks = this.hooks.get(phase) || [];
    const enabledHooks = phaseHooks.filter(h => h.enabled);

    if (enabledHooks.length === 0) {
      return { blocked: false, results: [] };
    }

    const fullContext: HookContext = {
      operation: context.operation || "unknown",
      target: context.target,
      content: context.content,
      metadata: context.metadata || {},
      sessionId: context.sessionId,
      timestamp: context.timestamp || new Date().toISOString(),
      userId: context.userId,
      machineId: context.machineId,
      material: context.material,
      tool: context.tool,
    };

    const results: HookResult[] = [];

    for (const hook of enabledHooks) {
      try {
        const result = await Promise.resolve(hook.handler(fullContext));
        results.push(result);

        // If blocking hook blocks, stop execution
        if (hook.mode === "blocking" && result.blocked) {
          log.warn(`[HookExecutor] Hook ${hook.id} BLOCKED operation: ${result.message}`);
          return {
            blocked: true,
            results,
            blockingHook: hook.id,
            message: result.message,
          };
        }

        // Log warnings
        if (result.warnings && result.warnings.length > 0) {
          log.warn(`[HookExecutor] Hook ${hook.id} warnings: ${result.warnings.join(", ")}`);
        }
      } catch (error: any) {
        log.error(`[HookExecutor] Hook ${hook.id} threw error: ${error.message}`);
        results.push({
          hookId: hook.id,
          hookName: hook.name,
          success: false,
          blocked: false,
          message: `Hook error: ${error.message}`,
          issues: [error.message],
        });
      }
    }

    return { blocked: false, results };
  }

  /**
   * Get all registered hooks
   */
  getAll(): HookDefinition[] {
    return Array.from(this.allHooks.values());
  }

  /**
   * Get hooks for a phase
   */
  getForPhase(phase: HookPhase): HookDefinition[] {
    return this.hooks.get(phase) || [];
  }

  /**
   * Get hook by ID
   */
  get(id: string): HookDefinition | undefined {
    return this.allHooks.get(id);
  }

  /**
   * Get hook count
   */
  get count(): number {
    return this.allHooks.size;
  }

  /**
   * Enable/disable a hook
   */
  setEnabled(hookId: string, enabled: boolean): boolean {
    const hook = this.allHooks.get(hookId);
    if (!hook) return false;
    hook.enabled = enabled;
    return true;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const hookExecutor = new HookExecutorEngine();
