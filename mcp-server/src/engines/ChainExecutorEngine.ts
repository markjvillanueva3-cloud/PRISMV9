/**
 * ChainExecutorEngine — KAR-MS5 U-KAR54
 *
 * Extends BuildGuardChainEngine patterns for PUOA multi-step workflow execution.
 * Manages complex chains with:
 *   - Step dependencies and execution ordering
 *   - Parallel execution where possible
 *   - Failure handling and recovery
 *   - Result aggregation with authority resolution
 *   - Checkpoint and resume capability
 *
 * Chain Types:
 *   - Sequential: Steps execute in order
 *   - Parallel: Independent steps execute simultaneously
 *   - DAG: Steps with dependencies form a directed acyclic graph
 *   - Pipeline: Data flows through stages
 *
 * @version 1.0.0
 * @date 2026-04-14
 */

import { type AuthoritySource, AUTHORITY_RANK } from "./PRISMUnifiedOrchestratorEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type ChainType = "sequential" | "parallel" | "dag" | "pipeline";

export type StepStatus =
  | "pending"
  | "ready"      // Dependencies satisfied
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "cancelled";

export interface ChainStep {
  step_id: string;
  name: string;
  action: string;
  input: unknown;
  output?: unknown;
  status: StepStatus;
  depends_on: string[];
  duration_ms?: number;
  error?: string;
  retries?: number;
  authority_source?: AuthoritySource;
  metadata?: Record<string, unknown>;
}

export interface ChainDefinition {
  chain_id: string;
  name: string;
  description: string;
  type: ChainType;
  steps: ChainStep[];
  timeout_ms?: number;
  max_retries?: number;
  on_failure?: "stop" | "skip" | "continue";
  checkpoint_enabled?: boolean;
}

export interface ChainCheckpoint {
  chain_id: string;
  timestamp: string;
  completed_steps: string[];
  step_outputs: Record<string, unknown>;
  current_step?: string;
}

export interface ChainExecutionResult {
  chain_id: string;
  name: string;
  type: ChainType;
  status: "completed" | "partial" | "failed" | "cancelled";
  started_at: string;
  completed_at: string;
  duration_ms: number;
  steps: ChainStep[];
  aggregated_output: unknown;
  authority_resolution: {
    winning_source: AuthoritySource;
    sources_used: AuthoritySource[];
    conflicts: number;
  };
  checkpoint?: ChainCheckpoint;
  errors: string[];
  metrics: ChainMetrics;
}

export interface ChainMetrics {
  total_steps: number;
  completed_steps: number;
  failed_steps: number;
  skipped_steps: number;
  parallel_waves: number;
  avg_step_duration_ms: number;
  max_step_duration_ms: number;
}

export interface StepExecutor {
  (step: ChainStep, context: ExecutionContext): Promise<unknown>;
}

export interface ExecutionContext {
  chain_id: string;
  step_outputs: Record<string, unknown>;
  authority_overrides?: Partial<Record<AuthoritySource, number>>;
  timeout_ms?: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class ChainExecutorEngine {
  private checkpoints: Map<string, ChainCheckpoint> = new Map();
  private defaultExecutor: StepExecutor;

  constructor() {
    this.defaultExecutor = this.createDefaultExecutor();
  }

  // ── Chain Execution ────────────────────────────────────────────

  /**
   * Execute a chain definition.
   *
   * @param chain Chain definition
   * @param executor Optional custom step executor
   * @param checkpoint Optional checkpoint to resume from
   * @returns Chain execution result
   */
  async execute(
    chain: ChainDefinition,
    executor?: StepExecutor,
    checkpoint?: ChainCheckpoint
  ): Promise<ChainExecutionResult> {
    const startTime = Date.now();
    const stepExecutor = executor || this.defaultExecutor;
    const errors: string[] = [];

    // Initialize context
    const context: ExecutionContext = {
      chain_id: chain.chain_id,
      step_outputs: checkpoint?.step_outputs || {},
      timeout_ms: chain.timeout_ms,
    };

    // Mark completed steps from checkpoint
    const completedSteps = new Set(checkpoint?.completed_steps || []);
    for (const step of chain.steps) {
      if (completedSteps.has(step.step_id)) {
        step.status = "completed";
        step.output = context.step_outputs[step.step_id];
      }
    }

    // Execute based on chain type
    switch (chain.type) {
      case "sequential":
        await this.executeSequential(chain, stepExecutor, context, errors);
        break;
      case "parallel":
        await this.executeParallel(chain, stepExecutor, context, errors);
        break;
      case "dag":
        await this.executeDAG(chain, stepExecutor, context, errors);
        break;
      case "pipeline":
        await this.executePipeline(chain, stepExecutor, context, errors);
        break;
    }

    // Build result
    const endTime = Date.now();
    const completedCount = chain.steps.filter(s => s.status === "completed").length;
    const failedCount = chain.steps.filter(s => s.status === "failed").length;
    const skippedCount = chain.steps.filter(s => s.status === "skipped").length;

    const status: ChainExecutionResult["status"] =
      failedCount === 0 && completedCount === chain.steps.length ? "completed" :
      completedCount > 0 ? "partial" : "failed";

    // Save checkpoint if enabled
    let finalCheckpoint: ChainCheckpoint | undefined;
    if (chain.checkpoint_enabled && status !== "completed") {
      finalCheckpoint = this.createCheckpoint(chain, context);
      this.checkpoints.set(chain.chain_id, finalCheckpoint);
    }

    return {
      chain_id: chain.chain_id,
      name: chain.name,
      type: chain.type,
      status,
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date(endTime).toISOString(),
      duration_ms: endTime - startTime,
      steps: chain.steps,
      aggregated_output: this.aggregateOutputs(chain.steps, context),
      authority_resolution: this.resolveAuthority(chain.steps),
      checkpoint: finalCheckpoint,
      errors,
      metrics: this.calculateMetrics(chain.steps),
    };
  }

  // ── Sequential Execution ───────────────────────────────────────

  /**
   * Execute steps in sequence.
   */
  private async executeSequential(
    chain: ChainDefinition,
    executor: StepExecutor,
    context: ExecutionContext,
    errors: string[]
  ): Promise<void> {
    for (const step of chain.steps) {
      if (step.status === "completed") continue;

      const result = await this.executeStep(step, executor, context, chain);

      if (!result.success) {
        errors.push(result.error || `Step ${step.step_id} failed`);

        if (chain.on_failure === "stop") {
          // Mark remaining steps as cancelled
          for (const remaining of chain.steps) {
            if (remaining.status === "pending") {
              remaining.status = "cancelled";
            }
          }
          break;
        }
      }
    }
  }

  // ── Parallel Execution ─────────────────────────────────────────

  /**
   * Execute all independent steps in parallel.
   */
  private async executeParallel(
    chain: ChainDefinition,
    executor: StepExecutor,
    context: ExecutionContext,
    errors: string[]
  ): Promise<void> {
    const pendingSteps = chain.steps.filter(s => s.status !== "completed");

    const results = await Promise.allSettled(
      pendingSteps.map(step => this.executeStep(step, executor, context, chain))
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "rejected" || (result.status === "fulfilled" && !result.value.success)) {
        const errorMsg = result.status === "rejected"
          ? String(result.reason)
          : result.value.error || `Step ${pendingSteps[i].step_id} failed`;
        errors.push(errorMsg);
      }
    }
  }

  // ── DAG Execution ──────────────────────────────────────────────

  /**
   * Execute steps respecting dependency graph.
   * Uses wave-based execution for maximum parallelism.
   */
  private async executeDAG(
    chain: ChainDefinition,
    executor: StepExecutor,
    context: ExecutionContext,
    errors: string[]
  ): Promise<void> {
    const completed = new Set<string>();
    const stepMap = new Map(chain.steps.map(s => [s.step_id, s]));

    // Mark already completed steps
    for (const step of chain.steps) {
      if (step.status === "completed") {
        completed.add(step.step_id);
      }
    }

    while (completed.size < chain.steps.length) {
      // Find ready steps (dependencies satisfied)
      const readySteps = chain.steps.filter(step => {
        if (step.status === "completed" || step.status === "failed" ||
            step.status === "skipped" || step.status === "cancelled") {
          return false;
        }
        return step.depends_on.every(dep => completed.has(dep));
      });

      if (readySteps.length === 0) {
        // No ready steps — check for cycles or blocked steps
        const remaining = chain.steps.filter(s =>
          s.status !== "completed" && s.status !== "failed" &&
          s.status !== "skipped" && s.status !== "cancelled"
        );

        if (remaining.length > 0) {
          // Blocked by failed dependencies
          for (const blocked of remaining) {
            blocked.status = "skipped";
            errors.push(`Step ${blocked.step_id} skipped: dependency failed`);
          }
        }
        break;
      }

      // Execute wave in parallel
      const results = await Promise.allSettled(
        readySteps.map(step => this.executeStep(step, executor, context, chain))
      );

      // Process results
      for (let i = 0; i < results.length; i++) {
        const step = readySteps[i];
        const result = results[i];

        if (result.status === "fulfilled" && result.value.success) {
          completed.add(step.step_id);
        } else {
          const errorMsg = result.status === "rejected"
            ? String(result.reason)
            : result.value.error || `Step ${step.step_id} failed`;
          errors.push(errorMsg);

          if (chain.on_failure === "stop") {
            // Cancel remaining
            for (const remaining of chain.steps) {
              if (remaining.status === "pending" || remaining.status === "ready") {
                remaining.status = "cancelled";
              }
            }
            return;
          }
        }
      }
    }
  }

  // ── Pipeline Execution ─────────────────────────────────────────

  /**
   * Execute steps as a pipeline where output flows to next input.
   */
  private async executePipeline(
    chain: ChainDefinition,
    executor: StepExecutor,
    context: ExecutionContext,
    errors: string[]
  ): Promise<void> {
    let pipelineData: unknown = undefined;

    for (const step of chain.steps) {
      if (step.status === "completed") {
        pipelineData = step.output;
        continue;
      }

      // Inject pipeline data as input
      if (pipelineData !== undefined) {
        step.input = {
          ...(typeof step.input === "object" ? step.input : {}),
          _pipeline_input: pipelineData,
        };
      }

      const result = await this.executeStep(step, executor, context, chain);

      if (!result.success) {
        errors.push(result.error || `Pipeline step ${step.step_id} failed`);

        if (chain.on_failure === "stop") {
          for (const remaining of chain.steps) {
            if (remaining.status === "pending") {
              remaining.status = "cancelled";
            }
          }
          break;
        }
      } else {
        pipelineData = step.output;
      }
    }
  }

  // ── Step Execution ─────────────────────────────────────────────

  /**
   * Execute a single step with retry support.
   */
  private async executeStep(
    step: ChainStep,
    executor: StepExecutor,
    context: ExecutionContext,
    chain: ChainDefinition
  ): Promise<{ success: boolean; error?: string }> {
    step.status = "running";
    const startTime = Date.now();
    const maxRetries = chain.max_retries || 0;
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        step.retries = attempt;
        const output = await executor(step, context);

        step.output = output;
        step.status = "completed";
        step.duration_ms = Date.now() - startTime;
        context.step_outputs[step.step_id] = output;

        return { success: true };
      } catch (error) {
        lastError = String(error);

        if (attempt < maxRetries) {
          // Exponential backoff
          await this.delay(Math.pow(2, attempt) * 100);
        }
      }
    }

    step.status = "failed";
    step.error = lastError;
    step.duration_ms = Date.now() - startTime;

    return { success: false, error: lastError };
  }

  // ── Checkpointing ──────────────────────────────────────────────

  /**
   * Create a checkpoint for resume capability.
   */
  createCheckpoint(chain: ChainDefinition, context: ExecutionContext): ChainCheckpoint {
    const completedSteps = chain.steps
      .filter(s => s.status === "completed")
      .map(s => s.step_id);

    const currentStep = chain.steps.find(s => s.status === "running")?.step_id;

    return {
      chain_id: chain.chain_id,
      timestamp: new Date().toISOString(),
      completed_steps: completedSteps,
      step_outputs: { ...context.step_outputs },
      current_step: currentStep,
    };
  }

  /**
   * Get saved checkpoint for a chain.
   */
  getCheckpoint(chainId: string): ChainCheckpoint | undefined {
    return this.checkpoints.get(chainId);
  }

  /**
   * Clear checkpoint for a chain.
   */
  clearCheckpoint(chainId: string): boolean {
    return this.checkpoints.delete(chainId);
  }

  // ── Authority Resolution ───────────────────────────────────────

  /**
   * Resolve authority across all step results.
   */
  private resolveAuthority(steps: ChainStep[]): ChainExecutionResult["authority_resolution"] {
    const sourcesUsed: Set<AuthoritySource> = new Set();
    let winningSource: AuthoritySource = "registry";
    let maxRank = 0;
    let conflicts = 0;

    for (const step of steps) {
      if (step.status === "completed" && step.authority_source) {
        sourcesUsed.add(step.authority_source);
        const rank = AUTHORITY_RANK[step.authority_source] || 0;

        if (rank > maxRank) {
          maxRank = rank;
          winningSource = step.authority_source;
        } else if (rank === maxRank && step.authority_source !== winningSource) {
          conflicts++;
        }
      }
    }

    return {
      winning_source: winningSource,
      sources_used: Array.from(sourcesUsed),
      conflicts,
    };
  }

  // ── Output Aggregation ─────────────────────────────────────────

  /**
   * Aggregate outputs from all completed steps.
   */
  private aggregateOutputs(steps: ChainStep[], context: ExecutionContext): unknown {
    const aggregated: Record<string, unknown> = {};

    for (const step of steps) {
      if (step.status === "completed" && step.output !== undefined) {
        aggregated[step.step_id] = step.output;
      }
    }

    return {
      by_step: aggregated,
      final: steps[steps.length - 1]?.output,
    };
  }

  // ── Metrics ────────────────────────────────────────────────────

  /**
   * Calculate chain execution metrics.
   */
  private calculateMetrics(steps: ChainStep[]): ChainMetrics {
    const durations = steps
      .filter(s => s.duration_ms !== undefined)
      .map(s => s.duration_ms!);

    const completedSteps = steps.filter(s => s.status === "completed").length;
    const failedSteps = steps.filter(s => s.status === "failed").length;
    const skippedSteps = steps.filter(s => s.status === "skipped" || s.status === "cancelled").length;

    // Count parallel waves (simplified)
    const waves = this.countWaves(steps);

    return {
      total_steps: steps.length,
      completed_steps: completedSteps,
      failed_steps: failedSteps,
      skipped_steps: skippedSteps,
      parallel_waves: waves,
      avg_step_duration_ms: durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0,
      max_step_duration_ms: durations.length > 0
        ? Math.max(...durations)
        : 0,
    };
  }

  /**
   * Count parallel execution waves in a DAG.
   */
  private countWaves(steps: ChainStep[]): number {
    const levels = new Map<string, number>();

    for (const step of steps) {
      if (step.depends_on.length === 0) {
        levels.set(step.step_id, 0);
      }
    }

    let changed = true;
    while (changed) {
      changed = false;
      for (const step of steps) {
        if (levels.has(step.step_id)) continue;

        const depLevels = step.depends_on
          .map(d => levels.get(d))
          .filter(l => l !== undefined) as number[];

        if (depLevels.length === step.depends_on.length) {
          levels.set(step.step_id, Math.max(...depLevels) + 1);
          changed = true;
        }
      }
    }

    return levels.size > 0 ? Math.max(...Array.from(levels.values())) + 1 : 1;
  }

  // ── Default Executor ───────────────────────────────────────────

  /**
   * Create default step executor (placeholder implementation).
   */
  private createDefaultExecutor(): StepExecutor {
    return async (step: ChainStep, context: ExecutionContext): Promise<unknown> => {
      // Default implementation — returns step info
      return {
        step_id: step.step_id,
        action: step.action,
        input: step.input,
        executed_at: new Date().toISOString(),
        chain_id: context.chain_id,
      };
    };
  }

  // ── Chain Building ─────────────────────────────────────────────

  /**
   * Create a new chain definition.
   */
  createChain(
    id: string,
    name: string,
    type: ChainType,
    options?: Partial<ChainDefinition>
  ): ChainDefinition {
    return {
      chain_id: id,
      name,
      description: options?.description || "",
      type,
      steps: [],
      timeout_ms: options?.timeout_ms,
      max_retries: options?.max_retries,
      on_failure: options?.on_failure || "stop",
      checkpoint_enabled: options?.checkpoint_enabled,
    };
  }

  /**
   * Add a step to a chain.
   */
  addStep(
    chain: ChainDefinition,
    stepId: string,
    name: string,
    action: string,
    input: unknown,
    dependsOn: string[] = []
  ): ChainStep {
    const step: ChainStep = {
      step_id: stepId,
      name,
      action,
      input,
      status: "pending",
      depends_on: dependsOn,
    };

    chain.steps.push(step);
    return step;
  }

  // ── Utility ────────────────────────────────────────────────────

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate chain for cycles and missing dependencies.
   */
  validateChain(chain: ChainDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const stepIds = new Set(chain.steps.map(s => s.step_id));

    // Check for missing dependencies
    for (const step of chain.steps) {
      for (const dep of step.depends_on) {
        if (!stepIds.has(dep)) {
          errors.push(`Step ${step.step_id} depends on missing step: ${dep}`);
        }
      }
    }

    // Check for cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (stepId: string): boolean => {
      visited.add(stepId);
      recursionStack.add(stepId);

      const step = chain.steps.find(s => s.step_id === stepId);
      if (step) {
        for (const dep of step.depends_on) {
          if (!visited.has(dep)) {
            if (hasCycle(dep)) return true;
          } else if (recursionStack.has(dep)) {
            return true;
          }
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of chain.steps) {
      if (!visited.has(step.step_id)) {
        if (hasCycle(step.step_id)) {
          errors.push(`Cycle detected involving step: ${step.step_id}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

export const chainExecutorEngine = new ChainExecutorEngine();
