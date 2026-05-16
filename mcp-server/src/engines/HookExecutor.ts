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
  // calculation / dispatch lifecycle
  | "pre-calculation"
  | "post-calculation"
  | "pre-dispatch"
  | "post-dispatch"
  // file I/O
  | "pre-file-write"
  | "post-file-write"
  | "pre-file-read"
  | "post-file-read"
  | "pre-file-delete"
  // toolpath / physics
  | "pre-toolpath"
  | "post-toolpath"
  | "pre-kienzle"
  | "post-kienzle"
  | "pre-taylor"
  | "post-taylor"
  | "pre-johnson-cook"
  // material / machine / alarm registries
  | "pre-material-add"
  | "post-material-add"
  | "pre-material-update"
  | "post-material-update"
  | "pre-machine-add"
  | "post-machine-add"
  | "pre-machine-update"
  | "pre-alarm-add"
  | "post-alarm-add"
  | "post-alarm-batch"
  // batch / schema / page
  | "pre-batch-import"
  | "post-batch-import"
  | "pre-page-create"
  // output / code generation
  | "pre-output"
  | "post-output"
  | "pre-code-generate"
  // tool-call / commit lifecycle (used by MCP tool hooks)
  | "pre-tool"
  | "post-tool"
  | "pre-commit"
  | "on-tool-call"
  // agents / swarms / orchestration
  | "pre-agent-execute"
  | "post-agent-execute"
  | "on-agent-timeout"
  | "pre-swarm-execute"
  | "post-swarm-complete"
  | "on-swarm-consensus"
  // session lifecycle
  | "on-session-start"
  | "on-session-end"
  | "on-session-checkpoint"
  | "on-session-resume"
  | "on-context-pressure"
  | "on-compaction"
  | "session-start"
  // quality / safety event streams
  | "on-quality-drop"
  | "on-force-limit"
  | "on-thermal-limit"
  | "on-tool-life-warning"
  | "on-machine-limit"
  // observability / cognition
  | "on-error"
  | "on-audit"
  | "on-decision"
  | "on-anomaly"
  | "on-outcome"
  | "on-pattern-match"
  | "on-learning-update"
  // legacy short forms retained for backward compatibility
  | "error"
  | "cadence";

/** Hook execution modes */
export type HookMode = "blocking" | "warning" | "logging" | "silent";

/** Hook priority levels. "background" runs after "low" and is intended for
 * fire-and-forget observability/telemetry hooks that must never block. */
export type HookPriority = "critical" | "high" | "normal" | "low" | "background";

/** Hook categories for organization */
export type HookCategory =
  | "enforcement"
  | "lifecycle"
  | "manufacturing"
  | "cognitive"
  | "observability"
  | "automation"
  | "safety"
  | "security"
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
    /** Dispatcher action when ctx.target is a dispatcher invocation. */
    action?: string;
    /** Dispatcher namespace, e.g. "prism_calc". */
    dispatcher?: string;
    /** Input params for pre-dispatch hooks. */
    input?: Record<string, unknown>;
    /** Output payload for post-dispatch hooks. */
    output?: Record<string, unknown>;
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
  /**
   * Rich session snapshot passed in by lifecycle hooks — optional so older
   * call sites that only know sessionId keep type-checking.
   */
  session?: {
    id?: string;
    toolCalls?: unknown;
    checkpoints?: unknown;
    bufferZone?: unknown;
    [key: string]: unknown;
  };
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
  /** Optional quality metrics snapshot from Omega quality model — populated
   *  by orchestrators that have just scored Ω(x); observability hooks read it
   *  to track quality-trend percentiles. All sub-fields optional so partial
   *  scoring (e.g. only S(x)) still type-checks. */
  quality?: {
    omega?: number;
    safety?: number;
    reasoning?: number;
    code?: number;
    process?: number;
    learning?: number;
  };
  /** Results from prior hooks in the same chain. Populated by hook-orchestrator
   *  call sites that fan out a sequence of hooks for one event — downstream
   *  hooks (notifier, recorder, summarizer) read this to react to upstream
   *  blocks/warnings. Optional so single-shot invocations still type-check. */
  previousResults?: HookResult[];
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
  /** Optional event name for HookRegistry's index-by-event lookup. Cadence
   *  hooks set this to a dotted event path (e.g. "phase.post-safety-check")
   *  so registry consumers can fan-out by event independent of `phase`.
   *  Not consumed by HookExecutor itself — advisory metadata for the
   *  HookRegistry side of the registration pipeline (see HookRegistry.ts:821). */
  event?: string;
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
    [key: string]: unknown;
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
    [key: string]: unknown;
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
    [key: string]: unknown;
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
  background: 4,
};

/**
 * Central hook execution engine
 */
class HookExecutorEngine {
  private hooks: Map<HookPhase, HookDefinition[]> = new Map();
  private allHooks: Map<string, HookDefinition> = new Map();

  /**
   * Initialize the hook executor (no-op, hooks are registered on demand)
   */
  async initialize(): Promise<void> {
    // Hooks are registered dynamically, no initialization needed
  }

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
    /** Alias for blockingHook — 14+ dispatchers read `result.blockedBy`. */
    blockedBy?: string;
    /** Alias for message — dispatchers render `result.summary` in error payloads. */
    summary?: string;
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
            blockedBy: hook.id,
            message: result.message,
            summary: result.message,
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
