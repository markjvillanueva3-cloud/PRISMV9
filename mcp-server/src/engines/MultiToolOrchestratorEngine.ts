/**
 * MultiToolOrchestratorEngine — Parallel Tool Execution
 *
 * AGENT ROADMAP: U-AGT15 (MS4)
 *
 * Orchestrates multiple tool calls:
 * - Parallel execution for independent operations
 * - Sequential execution for dependent operations
 * - Dependency analysis and graph resolution
 * - Partial failure handling
 * - Progress reporting for long operations
 *
 * @module engines/MultiToolOrchestratorEngine
 */

import {
  ToolExecutionEngine,
  ToolExecutionRequest,
  ToolExecutionResult,
} from "./ToolExecutionEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Tool call with dependencies */
export interface OrchestratedToolCall {
  id: string;
  request: ToolExecutionRequest;
  dependsOn?: string[];
  onSuccess?: (result: ToolExecutionResult) => void;
  onFailure?: (result: ToolExecutionResult) => void;
}

/** Orchestration configuration */
export interface OrchestrationConfig {
  maxParallel?: number;
  continueOnFailure?: boolean;
  timeout?: number;
  progressCallback?: (progress: OrchestrationProgress) => void;
}

/** Orchestration progress */
export interface OrchestrationProgress {
  total: number;
  completed: number;
  pending: number;
  running: number;
  failed: number;
  currentPhase: string;
  elapsedMs: number;
}

/** Orchestration result */
export interface OrchestrationResult {
  success: boolean;
  totalCalls: number;
  successCount: number;
  failureCount: number;
  results: Map<string, ToolExecutionResult>;
  executionOrder: string[];
  metrics: OrchestrationMetrics;
  errors: OrchestrationError[];
}

/** Orchestration metrics */
export interface OrchestrationMetrics {
  totalDurationMs: number;
  parallelBatches: number;
  avgBatchDurationMs: number;
  maxBatchDurationMs: number;
  parallelEfficiency: number;
}

/** Orchestration error */
export interface OrchestrationError {
  toolId: string;
  error: string;
  phase: string;
  recoverable: boolean;
}

/** Dependency node for DAG */
interface DependencyNode {
  id: string;
  call: OrchestratedToolCall;
  inDegree: number;
  dependents: string[];
}

/** Execution phase */
type ExecutionPhase = "pending" | "ready" | "running" | "completed" | "failed" | "skipped";

// ============================================================================
// ENGINE
// ============================================================================

export class MultiToolOrchestratorEngine {
  private readonly toolEngine: ToolExecutionEngine;

  private readonly defaultConfig: Required<OrchestrationConfig> = {
    maxParallel: 5,
    continueOnFailure: true,
    timeout: 60000,
    progressCallback: () => {}
  };

  constructor(toolEngine?: ToolExecutionEngine) {
    this.toolEngine = toolEngine ?? new ToolExecutionEngine();
  }

  /**
   * Execute multiple tools with dependency resolution
   */
  async orchestrate(
    calls: OrchestratedToolCall[],
    config?: OrchestrationConfig
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const cfg = { ...this.defaultConfig, ...config };

    // Validate and build dependency graph
    const validation = this.validateDependencies(calls);
    if (!validation.valid) {
      return this.createErrorResult(
        calls,
        `Invalid dependency graph: ${validation.error}`,
        startTime
      );
    }

    // Build execution graph
    const graph = this.buildDependencyGraph(calls);
    const results = new Map<string, ToolExecutionResult>();
    const executionOrder: string[] = [];
    const errors: OrchestrationError[] = [];
    const phases: Map<string, ExecutionPhase> = new Map();

    // Initialize phases
    for (const call of calls) {
      phases.set(call.id, "pending");
    }

    let batchCount = 0;
    let totalBatchDuration = 0;
    let maxBatchDuration = 0;

    // Execute in topological order with parallelism
    while (this.hasPendingCalls(phases)) {
      // Find ready calls (all dependencies satisfied)
      const readyCalls = this.getReadyCalls(graph, phases, results, cfg.continueOnFailure);

      if (readyCalls.length === 0) {
        // Check for deadlock
        const pending = [...phases.entries()].filter(([, p]) => p === "pending");
        if (pending.length > 0) {
          const deadlockIds = pending.map(([id]) => id).join(", ");
          errors.push({
            toolId: "orchestrator",
            error: `Deadlock detected. Stuck calls: ${deadlockIds}`,
            phase: "dependency_resolution",
            recoverable: false
          });
          break;
        }
        break;
      }

      // Mark as running
      for (const call of readyCalls) {
        phases.set(call.id, "running");
      }

      // Report progress
      cfg.progressCallback({
        total: calls.length,
        completed: [...phases.values()].filter(p => p === "completed").length,
        pending: [...phases.values()].filter(p => p === "pending").length,
        running: readyCalls.length,
        failed: [...phases.values()].filter(p => p === "failed").length,
        currentPhase: `Executing batch ${batchCount + 1}`,
        elapsedMs: Date.now() - startTime
      });

      // Execute batch in parallel (up to maxParallel)
      const batchStart = Date.now();
      const batches = this.chunkArray(readyCalls, cfg.maxParallel);

      for (const batch of batches) {
        const batchResults = await Promise.all(
          batch.map(call => this.executeWithCallbacks(call))
        );

        // Process results
        for (let i = 0; i < batch.length; i++) {
          const call = batch[i];
          const result = batchResults[i];

          results.set(call.id, result);
          executionOrder.push(call.id);

          if (result.success) {
            phases.set(call.id, "completed");
          } else {
            phases.set(call.id, "failed");
            errors.push({
              toolId: call.id,
              error: result.error?.message || "Unknown error",
              phase: "execution",
              recoverable: result.error?.retryable ?? false
            });

            // Skip dependents if not continuing on failure
            if (!cfg.continueOnFailure) {
              this.skipDependents(call.id, graph, phases);
            }
          }
        }
      }

      const batchDuration = Date.now() - batchStart;
      totalBatchDuration += batchDuration;
      maxBatchDuration = Math.max(maxBatchDuration, batchDuration);
      batchCount++;
    }

    // Final progress report
    const successCount = [...phases.values()].filter(p => p === "completed").length;
    const failureCount = [...phases.values()].filter(p => p === "failed" || p === "skipped").length;

    cfg.progressCallback({
      total: calls.length,
      completed: successCount,
      pending: 0,
      running: 0,
      failed: failureCount,
      currentPhase: "Complete",
      elapsedMs: Date.now() - startTime
    });

    // Calculate parallel efficiency
    const sequentialTime = executionOrder.reduce((sum, id) => {
      const result = results.get(id);
      return sum + (result?.metrics.durationMs ?? 0);
    }, 0);
    const actualTime = Date.now() - startTime;
    const parallelEfficiency = sequentialTime > 0 ? sequentialTime / actualTime : 1;

    return {
      success: failureCount === 0,
      totalCalls: calls.length,
      successCount,
      failureCount,
      results,
      executionOrder,
      metrics: {
        totalDurationMs: Date.now() - startTime,
        parallelBatches: batchCount,
        avgBatchDurationMs: batchCount > 0 ? totalBatchDuration / batchCount : 0,
        maxBatchDurationMs: maxBatchDuration,
        parallelEfficiency
      },
      errors
    };
  }

  /**
   * Execute independent tools in parallel
   */
  async parallel(
    requests: ToolExecutionRequest[],
    config?: Partial<OrchestrationConfig>
  ): Promise<OrchestrationResult> {
    const calls: OrchestratedToolCall[] = requests.map((request, index) => ({
      id: `parallel_${index}_${Date.now()}`,
      request,
      dependsOn: []
    }));

    return this.orchestrate(calls, config);
  }

  /**
   * Execute tools in sequence
   */
  async sequence(
    requests: ToolExecutionRequest[],
    config?: Partial<OrchestrationConfig>
  ): Promise<OrchestrationResult> {
    const calls: OrchestratedToolCall[] = [];

    for (let i = 0; i < requests.length; i++) {
      calls.push({
        id: `seq_${i}_${Date.now()}`,
        request: requests[i],
        dependsOn: i > 0 ? [calls[i - 1].id] : []
      });
    }

    return this.orchestrate(calls, config);
  }

  /**
   * Execute tools in a pipeline (each depends on previous)
   */
  async pipeline(
    requests: ToolExecutionRequest[],
    transform?: (result: ToolExecutionResult, index: number) => ToolExecutionRequest,
    config?: Partial<OrchestrationConfig>
  ): Promise<OrchestrationResult> {
    // For pipeline, we execute sequentially with optional transformation
    if (!transform) {
      return this.sequence(requests, config);
    }

    const startTime = Date.now();
    const results = new Map<string, ToolExecutionResult>();
    const executionOrder: string[] = [];
    const errors: OrchestrationError[] = [];

    let currentRequest = requests[0];
    let successCount = 0;

    for (let i = 0; i < requests.length; i++) {
      const id = `pipeline_${i}_${Date.now()}`;

      const result = await this.toolEngine.execute(currentRequest);
      results.set(id, result);
      executionOrder.push(id);

      if (!result.success) {
        errors.push({
          toolId: id,
          error: result.error?.message || "Unknown error",
          phase: "pipeline_execution",
          recoverable: result.error?.retryable ?? false
        });
        break;
      }

      successCount++;

      // Transform for next step
      if (i < requests.length - 1) {
        currentRequest = transform(result, i);
      }
    }

    return {
      success: errors.length === 0,
      totalCalls: requests.length,
      successCount,
      failureCount: requests.length - successCount,
      results,
      executionOrder,
      metrics: {
        totalDurationMs: Date.now() - startTime,
        parallelBatches: successCount,
        avgBatchDurationMs: (Date.now() - startTime) / Math.max(1, successCount),
        maxBatchDurationMs: Date.now() - startTime,
        parallelEfficiency: 1 // Sequential execution
      },
      errors
    };
  }

  /**
   * Analyze dependencies and return execution plan
   */
  analyzeDependencies(calls: OrchestratedToolCall[]): {
    valid: boolean;
    levels: string[][];
    parallelizable: number;
    sequential: number;
    error?: string;
  } {
    const validation = this.validateDependencies(calls);
    if (!validation.valid) {
      return {
        valid: false,
        levels: [],
        parallelizable: 0,
        sequential: 0,
        error: validation.error
      };
    }

    const graph = this.buildDependencyGraph(calls);
    const levels: string[][] = [];
    const assigned = new Set<string>();

    while (assigned.size < calls.length) {
      const level: string[] = [];

      for (const [id, node] of graph) {
        if (assigned.has(id)) continue;

        // Check if all dependencies are assigned
        const deps = node.call.dependsOn || [];
        if (deps.every(d => assigned.has(d))) {
          level.push(id);
        }
      }

      if (level.length === 0) {
        return {
          valid: false,
          levels,
          parallelizable: 0,
          sequential: 0,
          error: "Could not resolve all dependencies"
        };
      }

      levels.push(level);
      level.forEach(id => assigned.add(id));
    }

    // Count parallelizable vs sequential
    const parallelizable = levels.reduce((sum, level) => sum + Math.max(0, level.length - 1), 0);
    const sequential = levels.length;

    return {
      valid: true,
      levels,
      parallelizable,
      sequential
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Validate dependency graph (no cycles, valid references)
   */
  private validateDependencies(calls: OrchestratedToolCall[]): { valid: boolean; error?: string } {
    const ids = new Set(calls.map(c => c.id));

    // Check for duplicate IDs
    if (ids.size !== calls.length) {
      return { valid: false, error: "Duplicate tool call IDs" };
    }

    // Check for invalid dependency references
    for (const call of calls) {
      for (const dep of call.dependsOn || []) {
        if (!ids.has(dep)) {
          return { valid: false, error: `Invalid dependency reference: ${dep}` };
        }
        if (dep === call.id) {
          return { valid: false, error: `Self-dependency detected: ${call.id}` };
        }
      }
    }

    // Check for cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (id: string): boolean => {
      visited.add(id);
      recursionStack.add(id);

      const call = calls.find(c => c.id === id);
      for (const dep of call?.dependsOn || []) {
        if (!visited.has(dep)) {
          if (hasCycle(dep)) return true;
        } else if (recursionStack.has(dep)) {
          return true;
        }
      }

      recursionStack.delete(id);
      return false;
    };

    for (const call of calls) {
      if (!visited.has(call.id)) {
        if (hasCycle(call.id)) {
          return { valid: false, error: "Circular dependency detected" };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Build dependency graph
   */
  private buildDependencyGraph(calls: OrchestratedToolCall[]): Map<string, DependencyNode> {
    const graph = new Map<string, DependencyNode>();

    // Initialize nodes
    for (const call of calls) {
      graph.set(call.id, {
        id: call.id,
        call,
        inDegree: call.dependsOn?.length || 0,
        dependents: []
      });
    }

    // Build dependent lists
    for (const call of calls) {
      for (const dep of call.dependsOn || []) {
        const node = graph.get(dep);
        if (node) {
          node.dependents.push(call.id);
        }
      }
    }

    return graph;
  }

  /**
   * Get calls that are ready to execute
   */
  private getReadyCalls(
    graph: Map<string, DependencyNode>,
    phases: Map<string, ExecutionPhase>,
    results: Map<string, ToolExecutionResult>,
    continueOnFailure: boolean
  ): OrchestratedToolCall[] {
    const ready: OrchestratedToolCall[] = [];

    for (const [id, node] of graph) {
      const phase = phases.get(id);
      if (phase !== "pending") continue;

      // Check if all dependencies are satisfied
      const deps = node.call.dependsOn || [];
      let allSatisfied = true;

      for (const dep of deps) {
        const depPhase = phases.get(dep);
        if (depPhase === "completed") {
          continue;
        } else if (depPhase === "failed" || depPhase === "skipped") {
          if (!continueOnFailure) {
            allSatisfied = false;
            break;
          }
          // Continue if configured to do so
        } else {
          // Dependency not yet complete
          allSatisfied = false;
          break;
        }
      }

      if (allSatisfied) {
        ready.push(node.call);
      }
    }

    return ready;
  }

  /**
   * Check if there are pending calls
   */
  private hasPendingCalls(phases: Map<string, ExecutionPhase>): boolean {
    for (const phase of phases.values()) {
      if (phase === "pending" || phase === "running") {
        return true;
      }
    }
    return false;
  }

  /**
   * Skip all dependents of a failed call
   */
  private skipDependents(
    failedId: string,
    graph: Map<string, DependencyNode>,
    phases: Map<string, ExecutionPhase>
  ): void {
    const node = graph.get(failedId);
    if (!node) return;

    for (const depId of node.dependents) {
      const depPhase = phases.get(depId);
      if (depPhase === "pending") {
        phases.set(depId, "skipped");
        this.skipDependents(depId, graph, phases);
      }
    }
  }

  /**
   * Execute call with success/failure callbacks
   */
  private async executeWithCallbacks(call: OrchestratedToolCall): Promise<ToolExecutionResult> {
    const result = await this.toolEngine.execute(call.request);

    if (result.success && call.onSuccess) {
      call.onSuccess(result);
    } else if (!result.success && call.onFailure) {
      call.onFailure(result);
    }

    return result;
  }

  /**
   * Chunk array into batches
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Create error result
   */
  private createErrorResult(
    calls: OrchestratedToolCall[],
    error: string,
    startTime: number
  ): OrchestrationResult {
    return {
      success: false,
      totalCalls: calls.length,
      successCount: 0,
      failureCount: calls.length,
      results: new Map(),
      executionOrder: [],
      metrics: {
        totalDurationMs: Date.now() - startTime,
        parallelBatches: 0,
        avgBatchDurationMs: 0,
        maxBatchDurationMs: 0,
        parallelEfficiency: 0
      },
      errors: [{
        toolId: "orchestrator",
        error,
        phase: "validation",
        recoverable: false
      }]
    };
  }
}

// Export singleton
export const multiToolOrchestratorEngine = new MultiToolOrchestratorEngine();
