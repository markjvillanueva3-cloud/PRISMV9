/**
 * ChainFailureRecoveryEngine — ACP-MS2B
 *
 * Handles chain step failures with structured strategies:
 *   1. Retry with exponential backoff (configurable max retries)
 *   2. Graceful degradation (skip non-required steps, use fallbacks)
 *   3. User notification generation (structured failure reports)
 *   4. Recovery plan computation (what to do when a chain is broken)
 *
 * Each chain step has a fail_behavior from AutomationChainEngine:
 *   - fail_closed: abort entire chain, report error
 *   - degrade_silent: skip step, continue silently
 *   - degrade_warn: skip step, continue with warning
 *   - ask_user: pause chain, generate question for user
 *
 * Sources:
 *   - ACP-MS2B: Chain Failure Recovery
 *   - AutomationChainEngine chain/step definitions
 *   - BuildGuardChainEngine step execution model
 */

import type { FailBehavior, ChainStep } from "./AutomationChainEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type RecoveryStrategy =
  | "retry"           // Retry the step with backoff
  | "skip"            // Skip and continue chain
  | "fallback"        // Use alternative implementation
  | "abort"           // Abort the entire chain
  | "ask_user";       // Pause and ask user for guidance

export type FailureSeverity = "transient" | "recoverable" | "permanent";

export interface StepFailure {
  chain_id: string;
  step_id: string;
  step_action: string;
  error_message: string;
  error_code?: string;
  timestamp: string;
  attempt: number;
  max_attempts: number;
  duration_ms: number;
}

export interface RetryConfig {
  max_retries: number;
  initial_delay_ms: number;
  backoff_multiplier: number;
  max_delay_ms: number;
  jitter: boolean;
}

export interface RecoveryPlan {
  strategy: RecoveryStrategy;
  severity: FailureSeverity;
  reason: string;
  retry_config?: RetryConfig;
  fallback_action?: string;
  user_message?: string;
  remaining_steps: string[];
  skipped_steps: string[];
}

export interface ChainRecoveryResult {
  chain_id: string;
  original_failure: StepFailure;
  recovery_plan: RecoveryPlan;
  recovery_executed: boolean;
  recovery_success: boolean;
  total_attempts: number;
  total_recovery_time_ms: number;
  user_notification?: UserNotification;
}

export interface UserNotification {
  severity: "info" | "warning" | "error" | "critical";
  title: string;
  body: string;
  actions: Array<{ label: string; action: string }>;
  timestamp: string;
}

export interface ChainHealthSummary {
  chain_id: string;
  total_executions: number;
  total_failures: number;
  failure_rate: number;
  most_failing_step: string | null;
  recovery_success_rate: number;
  mean_recovery_time_ms: number;
}

// ============================================================================
// DEFAULT RETRY CONFIGS
// ============================================================================

const DEFAULT_RETRY_CONFIGS: Record<string, RetryConfig> = {
  typecheck: { max_retries: 2, initial_delay_ms: 500, backoff_multiplier: 2, max_delay_ms: 5000, jitter: false },
  test_execution: { max_retries: 1, initial_delay_ms: 1000, backoff_multiplier: 2, max_delay_ms: 10000, jitter: false },
  load_bundles: { max_retries: 3, initial_delay_ms: 200, backoff_multiplier: 2, max_delay_ms: 2000, jitter: true },
  run_tsc: { max_retries: 2, initial_delay_ms: 500, backoff_multiplier: 2, max_delay_ms: 5000, jitter: false },
  classify_task: { max_retries: 1, initial_delay_ms: 100, backoff_multiplier: 1, max_delay_ms: 500, jitter: false },
  safety_check: { max_retries: 0, initial_delay_ms: 0, backoff_multiplier: 1, max_delay_ms: 0, jitter: false },
  default: { max_retries: 1, initial_delay_ms: 300, backoff_multiplier: 2, max_delay_ms: 3000, jitter: true },
};

/** Error patterns that indicate transient failures */
const TRANSIENT_PATTERNS = [
  /ENOENT/i,
  /EBUSY/i,
  /EAGAIN/i,
  /timed?\s*out/i,
  /network/i,
  /connection refused/i,
  /ECONNRESET/i,
  /lock/i,
];

/** Error patterns that indicate permanent failures */
const PERMANENT_PATTERNS = [
  /cannot find module/i,
  /syntax\s*error/i,
  /type error.*not assignable/i,
  /maximum call stack/i,
  /out of memory/i,
  /permission denied/i,
];

// ============================================================================
// ENGINE
// ============================================================================

export class ChainFailureRecoveryEngine {

  private history: StepFailure[] = [];

  // ── Failure Classification ─────────────────────────────────

  /**
   * Classify an error as transient, recoverable, or permanent.
   *
   * @param errorMessage The error message from the failed step
   * @param errorCode Optional TS/system error code
   * @returns Failure severity classification
   */
  classifyFailure(errorMessage: string, errorCode?: string): FailureSeverity {
    const msg = errorMessage.toLowerCase();

    // Check transient patterns first
    if (TRANSIENT_PATTERNS.some(p => p.test(msg))) {
      return "transient";
    }

    // Check permanent patterns
    if (PERMANENT_PATTERNS.some(p => p.test(msg))) {
      return "permanent";
    }

    // TS errors with known trivial codes are recoverable
    if (errorCode && ["TS6133", "TS6196", "TS1005", "TS2552"].includes(errorCode)) {
      return "recoverable";
    }

    // Default: recoverable (optimistic)
    return "recoverable";
  }

  // ── Recovery Plan Computation ──────────────────────────────

  /**
   * Compute a recovery plan for a failed chain step.
   *
   * @param failure The step failure details
   * @param failBehavior The chain's configured fail behavior
   * @param stepRequired Whether the step is marked as required
   * @param remainingStepIds IDs of steps not yet executed
   * @returns Recovery plan with strategy and user guidance
   */
  computeRecoveryPlan(
    failure: StepFailure,
    failBehavior: FailBehavior,
    stepRequired: boolean,
    remainingStepIds: string[],
  ): RecoveryPlan {
    const severity = this.classifyFailure(failure.error_message, failure.error_code);

    // Rule 1: fail_closed always aborts
    if (failBehavior === "fail_closed") {
      return {
        strategy: "abort",
        severity,
        reason: `Chain is fail_closed — step '${failure.step_id}' failure aborts entire chain`,
        user_message: `Chain aborted: ${failure.step_action} failed — ${failure.error_message}`,
        remaining_steps: [],
        skipped_steps: remainingStepIds,
      };
    }

    // Rule 2: ask_user pauses
    if (failBehavior === "ask_user") {
      return {
        strategy: "ask_user",
        severity,
        reason: `Chain configured to ask user on failure`,
        user_message: `Step '${failure.step_action}' failed: ${failure.error_message}. How should we proceed?`,
        remaining_steps: remainingStepIds,
        skipped_steps: [],
      };
    }

    // Rule 3: Transient failures → retry
    if (severity === "transient" && failure.attempt < failure.max_attempts) {
      const retryConfig = DEFAULT_RETRY_CONFIGS[failure.step_action] || DEFAULT_RETRY_CONFIGS.default;
      return {
        strategy: "retry",
        severity,
        reason: `Transient failure detected — retry with backoff (attempt ${failure.attempt + 1}/${failure.max_attempts})`,
        retry_config: retryConfig,
        remaining_steps: remainingStepIds,
        skipped_steps: [],
      };
    }

    // Rule 4: Recoverable + not required → skip
    if (!stepRequired && (failBehavior === "degrade_silent" || failBehavior === "degrade_warn")) {
      return {
        strategy: "skip",
        severity,
        reason: `Non-required step — ${failBehavior === "degrade_warn" ? "skipping with warning" : "skipping silently"}`,
        user_message: failBehavior === "degrade_warn"
          ? `Warning: skipped '${failure.step_action}' — ${failure.error_message}`
          : undefined,
        remaining_steps: remainingStepIds,
        skipped_steps: [failure.step_id],
      };
    }

    // Rule 5: Required step with retries remaining → retry
    if (stepRequired && failure.attempt < failure.max_attempts) {
      const retryConfig = DEFAULT_RETRY_CONFIGS[failure.step_action] || DEFAULT_RETRY_CONFIGS.default;
      return {
        strategy: "retry",
        severity,
        reason: `Required step failed — retrying (attempt ${failure.attempt + 1}/${failure.max_attempts})`,
        retry_config: retryConfig,
        remaining_steps: remainingStepIds,
        skipped_steps: [],
      };
    }

    // Rule 6: Required step, max retries exhausted → abort
    return {
      strategy: "abort",
      severity,
      reason: `Required step '${failure.step_id}' failed after ${failure.attempt} attempt(s) — aborting chain`,
      user_message: `Chain failed: ${failure.step_action} could not be completed — ${failure.error_message}`,
      remaining_steps: [],
      skipped_steps: remainingStepIds,
    };
  }

  // ── Retry Delay Computation ────────────────────────────────

  /**
   * Compute the delay before the next retry attempt.
   *
   * @param attempt Current attempt number (0-based)
   * @param config Retry configuration
   * @returns Delay in milliseconds
   */
  computeRetryDelay(attempt: number, config: RetryConfig): number {
    const baseDelay = config.initial_delay_ms * Math.pow(config.backoff_multiplier, attempt);
    const capped = Math.min(baseDelay, config.max_delay_ms);

    if (config.jitter) {
      // Add ±25% jitter to prevent thundering herd
      const jitterRange = capped * 0.25;
      return capped + (Math.random() * 2 - 1) * jitterRange;
    }

    return capped;
  }

  // ── User Notification Generation ─────���─────────────────────

  /**
   * Generate a structured user notification for a chain failure.
   *
   * @param failure Step failure details
   * @param plan Recovery plan
   * @returns Formatted notification with actionable suggestions
   */
  generateNotification(failure: StepFailure, plan: RecoveryPlan): UserNotification {
    const severityMap: Record<RecoveryStrategy, UserNotification["severity"]> = {
      retry: "info",
      skip: "warning",
      fallback: "warning",
      abort: "error",
      ask_user: "critical",
    };

    const actions: UserNotification["actions"] = [];

    if (plan.strategy === "abort") {
      actions.push(
        { label: "Retry chain", action: "retry_chain" },
        { label: "Skip this step", action: "skip_step" },
        { label: "View error details", action: "show_error" },
      );
    } else if (plan.strategy === "ask_user") {
      actions.push(
        { label: "Retry", action: "retry_step" },
        { label: "Skip", action: "skip_step" },
        { label: "Abort chain", action: "abort_chain" },
      );
    } else if (plan.strategy === "skip") {
      actions.push(
        { label: "Acknowledged", action: "dismiss" },
        { label: "View details", action: "show_error" },
      );
    }

    return {
      severity: severityMap[plan.strategy],
      title: `${plan.strategy === "abort" ? "Chain Failed" : "Chain Warning"}: ${failure.step_action}`,
      body: plan.user_message || plan.reason,
      actions,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Full Recovery Execution ────────────────────────────────

  /**
   * Execute recovery for a failed step.
   * This is the main entry point for chain failure handling.
   *
   * @param failure Step failure
   * @param failBehavior Chain's fail behavior config
   * @param stepRequired Whether step is required
   * @param remainingSteps Remaining steps in the chain
   * @returns Recovery result with plan, notification, and outcome
   */
  recover(
    failure: StepFailure,
    failBehavior: FailBehavior,
    stepRequired: boolean,
    remainingSteps: string[],
  ): ChainRecoveryResult {
    const start = Date.now();

    // Record in history
    this.history.push(failure);

    // Compute plan
    const plan = this.computeRecoveryPlan(failure, failBehavior, stepRequired, remainingSteps);

    // Generate notification only for user-visible strategies
    const notification = (plan.strategy === "abort" || plan.strategy === "ask_user" ||
      (plan.strategy === "skip" && plan.user_message))
      ? this.generateNotification(failure, plan)
      : undefined;

    // Determine if recovery was "successful" (chain can continue)
    const canContinue = plan.strategy === "retry" || plan.strategy === "skip" || plan.strategy === "fallback";

    return {
      chain_id: failure.chain_id,
      original_failure: failure,
      recovery_plan: plan,
      recovery_executed: true,
      recovery_success: canContinue,
      total_attempts: failure.attempt,
      total_recovery_time_ms: Date.now() - start,
      user_notification: notification,
    };
  }

  // ── Health Summary ─────────────────────────────────────────

  /**
   * Compute health summary from recorded failure history.
   *
   * @param chainId Filter to specific chain (optional)
   * @returns Health metrics for the chain
   */
  getHealthSummary(chainId?: string): ChainHealthSummary {
    const relevant = chainId
      ? this.history.filter(f => f.chain_id === chainId)
      : this.history;

    if (relevant.length === 0) {
      return {
        chain_id: chainId || "all",
        total_executions: 0,
        total_failures: 0,
        failure_rate: 0,
        most_failing_step: null,
        recovery_success_rate: 1,
        mean_recovery_time_ms: 0,
      };
    }

    // Count failures per step
    const stepCounts = new Map<string, number>();
    for (const f of relevant) {
      stepCounts.set(f.step_id, (stepCounts.get(f.step_id) || 0) + 1);
    }

    let mostFailingStep: string | null = null;
    let maxCount = 0;
    for (const [step, count] of stepCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostFailingStep = step;
      }
    }

    const totalTime = relevant.reduce((sum, f) => sum + f.duration_ms, 0);

    return {
      chain_id: chainId || "all",
      total_executions: relevant.length,
      total_failures: relevant.length,
      failure_rate: 1.0, // All entries are failures
      most_failing_step: mostFailingStep,
      recovery_success_rate: 0, // Would need recovery outcomes to compute
      mean_recovery_time_ms: totalTime / relevant.length,
    };
  }

  /**
   * Get the retry configuration for a given step action.
   */
  getRetryConfig(stepAction: string): RetryConfig {
    return DEFAULT_RETRY_CONFIGS[stepAction] || DEFAULT_RETRY_CONFIGS.default;
  }

  /**
   * Clear failure history (useful for testing/session reset).
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Get raw failure history.
   */
  getHistory(): StepFailure[] {
    return [...this.history];
  }
}

export const chainFailureRecoveryEngine = new ChainFailureRecoveryEngine();
