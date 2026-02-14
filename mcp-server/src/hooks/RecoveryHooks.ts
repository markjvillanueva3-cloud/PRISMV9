/**
 * PRISM MCP Server - Recovery & Resilience Hooks
 * Session 6.2 Enhancement: Error Recovery and Circuit Breakers
 * 
 * Hooks for automatic error recovery and system resilience:
 * - Retry logic for transient failures
 * - Circuit breaker pattern
 * - Fallback behaviors
 * - Graceful degradation
 * - State recovery
 * - Transaction rollback
 * 
 * @version 1.0.0
 * @author PRISM Development Team
 */

import {
  HookDefinition,
  HookContext,
  HookResult,
  hookSuccess,
  hookBlock,
  hookWarning
} from "../engines/HookExecutor.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// CIRCUIT BREAKER STATE
// ============================================================================

interface CircuitState {
  name: string;
  state: "closed" | "open" | "half-open";
  failures: number;
  successes: number;
  lastFailure: string | null;
  lastSuccess: string | null;
  openedAt: string | null;
  halfOpenAt: string | null;
}

// Circuit breaker configuration
const CIRCUIT_CONFIG = {
  failureThreshold: 5,      // Failures before opening
  successThreshold: 3,      // Successes in half-open before closing
  openDuration: 30000,      // 30 seconds before half-open
  halfOpenDuration: 60000   // 60 seconds in half-open max
};

// Circuit states for different operations
const circuitStates = new Map<string, CircuitState>();

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  exponentialBase: 2
};

// Recovery state
const recoveryState = {
  retryQueue: [] as Array<{
    id: string;
    operation: string;
    context: Record<string, unknown>;
    attempts: number;
    lastAttempt: string;
    nextAttempt: string;
  }>,
  rollbackStack: [] as Array<{
    id: string;
    operation: string;
    rollbackData: unknown;
    timestamp: string;
  }>,
  degradedFeatures: new Set<string>()
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getCircuitState(name: string): CircuitState {
  if (!circuitStates.has(name)) {
    circuitStates.set(name, {
      name,
      state: "closed",
      failures: 0,
      successes: 0,
      lastFailure: null,
      lastSuccess: null,
      openedAt: null,
      halfOpenAt: null
    });
  }
  return circuitStates.get(name)!;
}

function calculateRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.exponentialBase, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
}

// ============================================================================
// CIRCUIT BREAKER HOOKS
// ============================================================================

/**
 * Check circuit breaker before operation
 */
const preCircuitBreakerCheck: HookDefinition = {
  id: "pre-circuit-breaker-check",
  name: "Circuit Breaker Check",
  description: "Checks circuit breaker state before allowing operation.",
  
  phase: "pre-calculation",
  category: "recovery",
  mode: "blocking",
  priority: "high",
  enabled: true,
  
  tags: ["circuit-breaker", "resilience", "protection"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preCircuitBreakerCheck;
    
    const operationType = context.operation || "default";
    const circuit = getCircuitState(operationType);
    const now = new Date();
    
    // Check if circuit should transition from open to half-open
    if (circuit.state === "open" && circuit.openedAt) {
      const openTime = new Date(circuit.openedAt).getTime();
      if (now.getTime() - openTime > CIRCUIT_CONFIG.openDuration) {
        circuit.state = "half-open";
        circuit.halfOpenAt = now.toISOString();
        log.info(`[CircuitBreaker] ${operationType}: open → half-open`);
      }
    }
    
    // Check if half-open has timed out
    if (circuit.state === "half-open" && circuit.halfOpenAt) {
      const halfOpenTime = new Date(circuit.halfOpenAt).getTime();
      if (now.getTime() - halfOpenTime > CIRCUIT_CONFIG.halfOpenDuration) {
        // Reset to closed (give it another try)
        circuit.state = "closed";
        circuit.failures = 0;
        circuit.successes = 0;
        log.info(`[CircuitBreaker] ${operationType}: half-open timeout → closed`);
      }
    }
    
    // Block if circuit is open
    if (circuit.state === "open") {
      const openedAt = circuit.openedAt ? new Date(circuit.openedAt) : now;
      const remainingMs = CIRCUIT_CONFIG.openDuration - (now.getTime() - openedAt.getTime());
      
      return hookBlock(hook,
        `⛔ Circuit breaker OPEN for ${operationType}`,
        {
          issues: [
            `Too many failures (${circuit.failures}) - circuit opened at ${circuit.openedAt}`,
            `Will attempt again in ${Math.round(remainingMs / 1000)} seconds`,
            "System is protecting against cascade failures"
          ],
          data: { circuit, remainingMs }
        }
      );
    }
    
    // Warn if half-open (limited operations allowed)
    if (circuit.state === "half-open") {
      return hookWarning(hook,
        `⚠️ Circuit breaker HALF-OPEN for ${operationType}`,
        {
          warnings: [
            "System is testing if operation is healthy",
            `Need ${CIRCUIT_CONFIG.successThreshold - circuit.successes} more successes to close circuit`
          ],
          data: { circuit }
        }
      );
    }
    
    return hookSuccess(hook, `Circuit closed for ${operationType}`, {
      data: { state: circuit.state, failures: circuit.failures }
    });
  }
};

/**
 * Update circuit breaker on success
 */
const postCircuitBreakerSuccess: HookDefinition = {
  id: "post-circuit-breaker-success",
  name: "Circuit Breaker Success",
  description: "Updates circuit breaker state on successful operation.",
  
  phase: "on-outcome",
  category: "recovery",
  mode: "silent",
  priority: "normal",
  enabled: true,
  
  tags: ["circuit-breaker", "success"],
  
  condition: (context: HookContext): boolean => {
    return context.metadata?.success === true;
  },
  
  handler: (context: HookContext): HookResult => {
    const hook = postCircuitBreakerSuccess;
    
    const operationType = context.operation || "default";
    const circuit = getCircuitState(operationType);
    
    circuit.lastSuccess = new Date().toISOString();
    circuit.successes++;
    
    if (circuit.state === "half-open") {
      if (circuit.successes >= CIRCUIT_CONFIG.successThreshold) {
        circuit.state = "closed";
        circuit.failures = 0;
        circuit.successes = 0;
        circuit.openedAt = null;
        circuit.halfOpenAt = null;
        log.info(`[CircuitBreaker] ${operationType}: half-open → closed (recovered)`);
      }
    } else if (circuit.state === "closed") {
      // Reset failure count on success
      if (circuit.failures > 0) {
        circuit.failures = Math.max(0, circuit.failures - 1);
      }
    }
    
    return hookSuccess(hook, `Circuit success recorded for ${operationType}`);
  }
};

/**
 * Update circuit breaker on failure
 */
const postCircuitBreakerFailure: HookDefinition = {
  id: "post-circuit-breaker-failure",
  name: "Circuit Breaker Failure",
  description: "Updates circuit breaker state on failed operation.",
  
  phase: "on-error",
  category: "recovery",
  mode: "logging",
  priority: "high",
  enabled: true,
  
  tags: ["circuit-breaker", "failure"],
  
  handler: (context: HookContext): HookResult => {
    const hook = postCircuitBreakerFailure;
    
    const operationType = context.operation || "default";
    const circuit = getCircuitState(operationType);
    const now = new Date().toISOString();
    
    circuit.lastFailure = now;
    circuit.failures++;
    
    if (circuit.state === "half-open") {
      // Any failure in half-open immediately opens circuit
      circuit.state = "open";
      circuit.openedAt = now;
      circuit.successes = 0;
      log.warn(`[CircuitBreaker] ${operationType}: half-open → open (failure during test)`);
    } else if (circuit.state === "closed") {
      if (circuit.failures >= CIRCUIT_CONFIG.failureThreshold) {
        circuit.state = "open";
        circuit.openedAt = now;
        log.warn(`[CircuitBreaker] ${operationType}: closed → open (threshold reached)`);
      }
    }
    
    return hookWarning(hook,
      `Circuit failure recorded for ${operationType}`,
      {
        warnings: [
          `Failures: ${circuit.failures}/${CIRCUIT_CONFIG.failureThreshold}`,
          circuit.state === "open" ? "CIRCUIT NOW OPEN" : ""
        ].filter(Boolean),
        data: { circuit }
      }
    );
  }
};

// ============================================================================
// RETRY HOOKS
// ============================================================================

/**
 * Queue operation for retry
 */
const onRetryQueue: HookDefinition = {
  id: "on-retry-queue",
  name: "Retry Queue",
  description: "Queues failed operations for automatic retry.",
  
  phase: "on-error",
  category: "recovery",
  mode: "logging",
  priority: "normal",
  enabled: true,
  
  tags: ["retry", "queue", "recovery"],
  
  condition: (context: HookContext): boolean => {
    // Only retry transient errors
    const error = context.metadata?.error as { transient?: boolean } | undefined;
    return error?.transient === true;
  },
  
  handler: (context: HookContext): HookResult => {
    const hook = onRetryQueue;
    
    const operationId = context.metadata?.operationId as string || `op-${Date.now()}`;
    const existingRetry = recoveryState.retryQueue.find(r => r.id === operationId);
    
    if (existingRetry) {
      if (existingRetry.attempts >= RETRY_CONFIG.maxRetries) {
        return hookWarning(hook,
          `Max retries (${RETRY_CONFIG.maxRetries}) reached for ${operationId}`,
          {
            warnings: ["Operation will not be retried further"],
            data: { attempts: existingRetry.attempts }
          }
        );
      }
      
      existingRetry.attempts++;
      existingRetry.lastAttempt = new Date().toISOString();
      const delay = calculateRetryDelay(existingRetry.attempts);
      existingRetry.nextAttempt = new Date(Date.now() + delay).toISOString();
      
      return hookSuccess(hook,
        `Retry ${existingRetry.attempts}/${RETRY_CONFIG.maxRetries} queued for ${operationId}`,
        {
          data: { nextAttempt: existingRetry.nextAttempt, delay }
        }
      );
    }
    
    // New retry entry
    const delay = calculateRetryDelay(1);
    recoveryState.retryQueue.push({
      id: operationId,
      operation: context.operation || "unknown",
      context: context.metadata || {},
      attempts: 1,
      lastAttempt: new Date().toISOString(),
      nextAttempt: new Date(Date.now() + delay).toISOString()
    });
    
    return hookSuccess(hook,
      `Operation ${operationId} queued for retry`,
      {
        data: { delay, maxRetries: RETRY_CONFIG.maxRetries }
      }
    );
  }
};

// ============================================================================
// ROLLBACK HOOKS
// ============================================================================

/**
 * Save rollback data before operation
 */
const preRollbackSave: HookDefinition = {
  id: "pre-rollback-save",
  name: "Rollback Data Save",
  description: "Saves data needed for rollback before modifying operation.",
  
  phase: "pre-file-write",
  category: "recovery",
  mode: "silent",
  priority: "high",
  enabled: true,
  
  tags: ["rollback", "backup", "recovery"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preRollbackSave;
    
    const operationId = context.metadata?.operationId as string || `op-${Date.now()}`;
    const oldContent = context.content?.old;
    
    if (!oldContent) {
      return hookSuccess(hook, "No existing data to save for rollback");
    }
    
    recoveryState.rollbackStack.push({
      id: operationId,
      operation: context.operation || "file_write",
      rollbackData: oldContent,
      timestamp: new Date().toISOString()
    });
    
    // Keep last 50 rollback entries
    while (recoveryState.rollbackStack.length > 50) {
      recoveryState.rollbackStack.shift();
    }
    
    return hookSuccess(hook, `Rollback data saved for ${operationId}`);
  }
};

/**
 * Trigger rollback on failure
 */
const onRollbackTrigger: HookDefinition = {
  id: "on-rollback-trigger",
  name: "Rollback Trigger",
  description: "Triggers rollback when operation fails critically.",
  
  phase: "on-error",
  category: "recovery",
  mode: "logging",
  priority: "critical",
  enabled: true,
  
  tags: ["rollback", "recovery", "critical"],
  
  condition: (context: HookContext): boolean => {
    const error = context.metadata?.error as { critical?: boolean } | undefined;
    return error?.critical === true;
  },
  
  handler: (context: HookContext): HookResult => {
    const hook = onRollbackTrigger;
    
    const operationId = context.metadata?.operationId as string;
    const rollbackEntry = operationId ? 
      recoveryState.rollbackStack.find(r => r.id === operationId) :
      recoveryState.rollbackStack[recoveryState.rollbackStack.length - 1];
    
    if (!rollbackEntry) {
      return hookWarning(hook,
        "Rollback triggered but no rollback data available",
        { warnings: ["Manual intervention may be required"] }
      );
    }
    
    return hookWarning(hook,
      `🔄 ROLLBACK TRIGGERED for ${rollbackEntry.operation}`,
      {
        warnings: [
          "Critical failure detected - rollback initiated",
          `Original data from ${rollbackEntry.timestamp} will be restored`,
          "Review logs for failure cause"
        ],
        data: { rollbackEntry },
        actions: ["rollback_initiated"]
      }
    );
  }
};

// ============================================================================
// GRACEFUL DEGRADATION HOOKS
// ============================================================================

/**
 * Enable graceful degradation
 */
const onGracefulDegradation: HookDefinition = {
  id: "on-graceful-degradation",
  name: "Graceful Degradation",
  description: "Enables graceful degradation when features fail repeatedly.",
  
  phase: "on-error",
  category: "recovery",
  mode: "logging",
  priority: "normal",
  enabled: true,
  
  tags: ["degradation", "fallback", "resilience"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onGracefulDegradation;
    
    const feature = context.metadata?.feature as string || context.operation || "unknown";
    const circuit = getCircuitState(feature);
    
    // If circuit opens, mark feature as degraded
    if (circuit.state === "open" && !recoveryState.degradedFeatures.has(feature)) {
      recoveryState.degradedFeatures.add(feature);
      
      return hookWarning(hook,
        `⚠️ Feature degraded: ${feature}`,
        {
          warnings: [
            `${feature} is operating in degraded mode`,
            "Reduced functionality available",
            "System will attempt recovery automatically"
          ],
          data: { degradedFeatures: Array.from(recoveryState.degradedFeatures) }
        }
      );
    }
    
    // If circuit closes, remove from degraded
    if (circuit.state === "closed" && recoveryState.degradedFeatures.has(feature)) {
      recoveryState.degradedFeatures.delete(feature);
      
      return hookSuccess(hook,
        `Feature restored: ${feature}`,
        {
          data: { degradedFeatures: Array.from(recoveryState.degradedFeatures) }
        }
      );
    }
    
    return hookSuccess(hook, "Degradation state unchanged");
  }
};

/**
 * Check for degraded features
 */
const preFeatureDegradationCheck: HookDefinition = {
  id: "pre-feature-degradation-check",
  name: "Feature Degradation Check",
  description: "Checks if requested feature is in degraded mode.",
  
  phase: "pre-calculation",
  category: "recovery",
  mode: "warning",
  priority: "normal",
  enabled: true,
  
  tags: ["degradation", "check", "resilience"],
  
  handler: (context: HookContext): HookResult => {
    const hook = preFeatureDegradationCheck;
    
    const feature = context.metadata?.feature as string || context.operation || "unknown";
    
    if (recoveryState.degradedFeatures.has(feature)) {
      return hookWarning(hook,
        `⚠️ Feature ${feature} is in degraded mode`,
        {
          warnings: [
            "Some functionality may be limited",
            "Results may use fallback algorithms",
            "Accuracy may be reduced"
          ]
        }
      );
    }
    
    return hookSuccess(hook, `Feature ${feature} operating normally`);
  }
};

// ============================================================================
// STATE RECOVERY HOOKS
// ============================================================================

/**
 * Attempt state recovery on startup
 */
const onStateRecovery: HookDefinition = {
  id: "on-state-recovery",
  name: "State Recovery",
  description: "Attempts to recover state after crash or unexpected shutdown.",
  
  phase: "on-session-start",
  category: "recovery",
  mode: "logging",
  priority: "critical",
  enabled: true,
  
  tags: ["recovery", "state", "startup"],
  
  handler: (context: HookContext): HookResult => {
    const hook = onStateRecovery;
    
    const crashes = context.metadata?.previousCrash as boolean;
    const lastState = context.metadata?.lastKnownState as Record<string, unknown> | undefined;
    
    if (!crashes) {
      return hookSuccess(hook, "Clean startup - no recovery needed");
    }
    
    const warnings: string[] = [];
    
    warnings.push("Previous session ended unexpectedly");
    
    if (lastState) {
      warnings.push("Attempting to recover from last known state");
      warnings.push(`Last checkpoint: ${lastState.lastCheckpoint || "unknown"}`);
      
      return hookWarning(hook,
        "🔄 STATE RECOVERY INITIATED",
        {
          warnings,
          data: { lastState },
          actions: ["state_recovery_started"]
        }
      );
    }
    
    return hookWarning(hook,
      "⚠️ Previous crash detected but no recovery state available",
      {
        warnings: [
          "Manual state verification recommended",
          "Check for partially completed operations"
        ]
      }
    );
  }
};

// ============================================================================
// RECOVERY STATE ACCESS
// ============================================================================

/**
 * Get recovery system status
 */
export function getRecoveryStatus() {
  return {
    circuitBreakers: Array.from(circuitStates.values()),
    retryQueueSize: recoveryState.retryQueue.length,
    rollbackStackSize: recoveryState.rollbackStack.length,
    degradedFeatures: Array.from(recoveryState.degradedFeatures),
    config: { CIRCUIT_CONFIG, RETRY_CONFIG }
  };
}

/**
 * Reset circuit breaker
 */
export function resetCircuitBreaker(name: string): boolean {
  const circuit = circuitStates.get(name);
  if (circuit) {
    circuit.state = "closed";
    circuit.failures = 0;
    circuit.successes = 0;
    circuit.openedAt = null;
    circuit.halfOpenAt = null;
    return true;
  }
  return false;
}

/**
 * Clear degraded features
 */
export function clearDegradedFeatures(): void {
  recoveryState.degradedFeatures.clear();
}

// ============================================================================
// EXPORT ALL RECOVERY HOOKS
// ============================================================================

export const recoveryHooks: HookDefinition[] = [
  // Circuit breaker
  preCircuitBreakerCheck,
  postCircuitBreakerSuccess,
  postCircuitBreakerFailure,
  
  // Retry
  onRetryQueue,
  
  // Rollback
  preRollbackSave,
  onRollbackTrigger,
  
  // Graceful degradation
  onGracefulDegradation,
  preFeatureDegradationCheck,
  
  // State recovery
  onStateRecovery
];

export {
  preCircuitBreakerCheck,
  postCircuitBreakerSuccess,
  postCircuitBreakerFailure,
  onRetryQueue,
  preRollbackSave,
  onRollbackTrigger,
  onGracefulDegradation,
  preFeatureDegradationCheck,
  onStateRecovery,
  CIRCUIT_CONFIG,
  RETRY_CONFIG
};
