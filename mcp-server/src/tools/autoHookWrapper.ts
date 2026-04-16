/**
 * autoHookWrapper — Universal Hook Execution Layer
 * ==================================================
 * Wraps MCP tools with automatic hook execution (pre/post hooks).
 * Integrates with HookExecutor for physics validation, safety checks,
 * and telemetry capture.
 *
 * Features:
 *   - Pre-dispatch hooks: physics_sanity, material_guard, machine_limit_guard
 *   - Post-dispatch hooks: result_validator, telemetry_capture
 *   - Dispatch counting for diagnostics
 *   - Hook execution history (last 1000 executions)
 *   - Cadence-based background hooks
 *   - First-dispatch reconnaissance
 *
 * @module tools/autoHookWrapper
 */

import { log } from "../utils/Logger.js";
import { hookExecutor, type HookContext, type HookPhase } from "../engines/HookExecutor.js";

// ============================================================================
// TYPES
// ============================================================================

/** Hook execution record */
export interface HookRecord {
  hook_id: string;
  timestamp: number;
  trigger: string;
  result: "pass" | "fail" | "skip" | "error";
  duration_ms: number;
  message?: string;
  context?: Record<string, unknown>;
}

/** Auto hook configuration */
export interface AutoHookConfig {
  enabled: boolean;
  pre_hooks: string[];
  post_hooks: string[];
  cadence_ms: number;
  max_history: number;
  fail_fast: boolean;
  log_level: "debug" | "info" | "warn" | "error";
}

/** Dispatch metadata */
export interface DispatchMeta {
  tool_name: string;
  dispatch_id: number;
  start_time: number;
  pre_hook_results: HookRecord[];
  post_hook_results: HookRecord[];
}

// ============================================================================
// STATE
// ============================================================================

let dispatchCount = 0;
const hookHistory: HookRecord[] = [];
let reconComplete = false;
let lastCadenceRun = 0;
const activeDispatches = new Map<number, DispatchMeta>();

/** Default auto hook configuration */
export const AUTO_HOOK_CONFIG: AutoHookConfig = {
  enabled: true,
  pre_hooks: [
    "physics_sanity",      // Validate physics calculations have reasonable outputs
    "material_guard",      // Check material properties are valid
    "machine_limit_guard", // Ensure parameters within machine limits
  ],
  post_hooks: [
    "result_validator",    // Validate return structure
    "telemetry_capture",   // Record timing/usage metrics
  ],
  cadence_ms: 60000,       // Run cadence hooks every 60s
  max_history: 1000,       // Keep last 1000 hook executions
  fail_fast: false,        // Continue even if pre-hooks fail (log warning)
  log_level: "debug",
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Wrap a tool function with automatic pre/post hooks.
 * Supports both sync and async functions.
 */
export function wrapToolWithAutoHooks<T extends (...args: unknown[]) => unknown>(
  toolName: string,
  toolFn: T,
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    const dispatchId = ++dispatchCount;
    const startTime = Date.now();

    log.debug(`autoHookWrapper: ${toolName} dispatch #${dispatchId}`);

    // Track this dispatch
    const meta: DispatchMeta = {
      tool_name: toolName,
      dispatch_id: dispatchId,
      start_time: startTime,
      pre_hook_results: [],
      post_hook_results: [],
    };
    activeDispatches.set(dispatchId, meta);

    // First dispatch triggers reconnaissance
    if (dispatchId === 1 && !reconComplete) {
      runReconnaissance();
    }

    // Execute pre-hooks
    if (AUTO_HOOK_CONFIG.enabled) {
      for (const hookId of AUTO_HOOK_CONFIG.pre_hooks) {
        const record = executeHook(hookId, "pre", toolName, args);
        meta.pre_hook_results.push(record);
        recordHook(record);

        if (record.result === "fail" && AUTO_HOOK_CONFIG.fail_fast) {
          throw new Error(`Pre-hook ${hookId} failed: ${record.message}`);
        }
      }
    }

    // Execute the tool
    const result = toolFn(...args);

    // Handle async results
    if (result instanceof Promise) {
      return result.then((asyncResult) => {
        finishDispatch(meta, asyncResult);
        return asyncResult;
      }).catch((err) => {
        finishDispatch(meta, undefined, err);
        throw err;
      }) as ReturnType<T>;
    }

    // Sync result
    finishDispatch(meta, result);
    return result as ReturnType<T>;
  }) as T;
}

/**
 * Finish dispatch: run post-hooks and cleanup.
 */
function finishDispatch(meta: DispatchMeta, result?: unknown, error?: Error): void {
  // Execute post-hooks
  if (AUTO_HOOK_CONFIG.enabled) {
    for (const hookId of AUTO_HOOK_CONFIG.post_hooks) {
      const record = executeHook(hookId, "post", meta.tool_name, [result], error);
      meta.post_hook_results.push(record);
      recordHook(record);
    }
  }

  // Log dispatch completion
  const duration = Date.now() - meta.start_time;
  log.debug(`autoHookWrapper: ${meta.tool_name} #${meta.dispatch_id} completed in ${duration}ms`);

  // Check cadence
  checkCadence();

  // Cleanup
  activeDispatches.delete(meta.dispatch_id);
}

/**
 * Execute a single hook and return the record.
 */
function executeHook(
  hookId: string,
  phase: "pre" | "post",
  toolName: string,
  args: unknown[],
  error?: Error,
): HookRecord {
  const startTime = Date.now();
  let result: HookRecord["result"] = "pass";
  let message: string | undefined;

  try {
    // Build hook context
    const context: HookContext = {
      phase: phase as HookPhase,
      tool: toolName,
      args,
      timestamp: startTime,
      dispatch_id: dispatchCount,
    };

    // Try to execute via HookExecutor
    const hookResult = hookExecutor.executeHook(hookId, context);

    if (hookResult && typeof hookResult === "object") {
      if ("blocked" in hookResult && hookResult.blocked) {
        result = "fail";
        message = hookResult.reason || "Hook blocked execution";
      } else if ("skipped" in hookResult && hookResult.skipped) {
        result = "skip";
        message = hookResult.reason || "Hook skipped";
      }
    }
  } catch (err) {
    // Hook execution failed - log but don't block
    result = "error";
    message = err instanceof Error ? err.message : String(err);
    log.warn(`autoHookWrapper: Hook ${hookId} error: ${message}`);
  }

  return {
    hook_id: hookId,
    timestamp: startTime,
    trigger: `${phase}:${toolName}`,
    result,
    duration_ms: Date.now() - startTime,
    message,
  };
}

/**
 * Record hook execution in history.
 */
function recordHook(record: HookRecord): void {
  hookHistory.push(record);

  // Trim history
  while (hookHistory.length > AUTO_HOOK_CONFIG.max_history) {
    hookHistory.shift();
  }
}

/**
 * Check if cadence hooks should run.
 */
function checkCadence(): void {
  const now = Date.now();
  if (now - lastCadenceRun >= AUTO_HOOK_CONFIG.cadence_ms) {
    lastCadenceRun = now;
    runCadenceHooks();
  }
}

/**
 * Run cadence-based background hooks.
 */
function runCadenceHooks(): void {
  log.debug("autoHookWrapper: Running cadence hooks");

  // Emit session metrics
  const metrics = {
    dispatch_count: dispatchCount,
    hook_history_size: hookHistory.length,
    active_dispatches: activeDispatches.size,
    uptime_ms: Date.now() - (hookHistory[0]?.timestamp || Date.now()),
  };

  recordHook({
    hook_id: "cadence_metrics",
    timestamp: Date.now(),
    trigger: "cadence",
    result: "pass",
    duration_ms: 0,
    context: metrics,
  });
}

/**
 * Run first-dispatch reconnaissance.
 */
function runReconnaissance(): void {
  log.info("autoHookWrapper: First dispatch - running reconnaissance");

  try {
    // Record system state at first dispatch
    recordHook({
      hook_id: "recon_first_dispatch",
      timestamp: Date.now(),
      trigger: "recon",
      result: "pass",
      duration_ms: 0,
      message: "Session initialized",
      context: {
        node_version: process.version,
        platform: process.platform,
        cwd: process.cwd(),
      },
    });

    reconComplete = true;
  } catch (err) {
    log.warn("autoHookWrapper: Reconnaissance failed", { error: err });
  }
}

/**
 * Wrap with universal hooks (applied to all dispatchers).
 * Alias for wrapToolWithAutoHooks with dispatcher-specific config.
 */
export function wrapWithUniversalHooks<T extends (...args: unknown[]) => unknown>(
  dispatcherName: string,
  dispatchFn: T,
): T {
  return wrapToolWithAutoHooks(`dispatcher:${dispatcherName}`, dispatchFn);
}

/**
 * Get current dispatch count.
 */
export function getDispatchCount(): number {
  return dispatchCount;
}

/**
 * Get hook execution history.
 * @param limit - Maximum records to return (default: all)
 * @param filter - Optional filter by hook_id prefix
 */
export function getHookHistory(limit?: number, filter?: string): HookRecord[] {
  let records = [...hookHistory];

  if (filter) {
    records = records.filter(r => r.hook_id.startsWith(filter) || r.trigger.includes(filter));
  }

  if (limit && limit > 0) {
    records = records.slice(-limit);
  }

  return records;
}

/**
 * Get hook execution statistics.
 */
export function getHookStats(): {
  total_executions: number;
  by_result: Record<string, number>;
  by_hook: Record<string, number>;
  avg_duration_ms: number;
} {
  const by_result: Record<string, number> = { pass: 0, fail: 0, skip: 0, error: 0 };
  const by_hook: Record<string, number> = {};
  let totalDuration = 0;

  for (const record of hookHistory) {
    by_result[record.result] = (by_result[record.result] || 0) + 1;
    by_hook[record.hook_id] = (by_hook[record.hook_id] || 0) + 1;
    totalDuration += record.duration_ms;
  }

  return {
    total_executions: hookHistory.length,
    by_result,
    by_hook,
    avg_duration_ms: hookHistory.length > 0 ? totalDuration / hookHistory.length : 0,
  };
}

/**
 * Reset the recon flag (for dev/testing).
 */
export function resetReconFlag(): void {
  reconComplete = false;
  log.info("autoHookWrapper: recon flag reset");
}

/**
 * Check if initial reconnaissance is complete.
 */
export function isReconComplete(): boolean {
  return reconComplete;
}

/**
 * Mark recon as complete.
 */
export function markReconComplete(): void {
  reconComplete = true;
}

/**
 * Clear hook history (for testing).
 */
export function clearHookHistory(): void {
  hookHistory.length = 0;
  log.debug("autoHookWrapper: hook history cleared");
}

/**
 * Update auto hook configuration.
 */
export function updateConfig(updates: Partial<AutoHookConfig>): void {
  Object.assign(AUTO_HOOK_CONFIG, updates);
  log.info("autoHookWrapper: config updated", { updates });
}

/**
 * Register auto hook tools with the MCP server.
 */
export function registerAutoHookTools(server: unknown): void {
  log.info("autoHookWrapper: registering auto hook tools");

  // This could register diagnostic tools like:
  // - autohook_status: Get hook stats and config
  // - autohook_history: Get recent hook history
  // - autohook_config: Update hook configuration

  // For now, registration is handled by the caller in index.ts
}
