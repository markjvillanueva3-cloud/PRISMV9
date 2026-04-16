/**
 * PipelineOptimizationEngine — Centralized Pipeline Infrastructure
 *
 * Provides shared infrastructure for ALL 35 pipeline engines:
 *   - Distributed locking for concurrent pipeline execution
 *   - Dead-letter queue integration via DurableJobQueueEngine
 *   - Schema validation at pipeline stage boundaries
 *   - Telemetry/metrics collection per stage
 *   - Checkpoint/recovery integration
 *   - Stage parallelization decisions
 *   - Resource allocation across pipelines
 *
 * Usage:
 *   const wrapper = pipelineOptimizationEngine.wrapPipeline("PrintToProgram");
 *   const result = await wrapper.executeWithInfra(input, stages);
 *
 * @module engines/PipelineOptimizationEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { PipelineCheckpointManager } from "../utils/pipelineCheckpoint.js";
import { distributedLockService, type LockResult } from "../services/DistributedLockService.js";
import { durableJobQueueEngine, type JobRecord } from "./DurableJobQueueEngine.js";
import { z } from "zod";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/** Pipeline stage definition */
export interface PipelineStageDefinition {
  name: string;
  index: number;
  /** Optional Zod schema for input validation */
  inputSchema?: z.ZodType<unknown>;
  /** Optional Zod schema for output validation */
  outputSchema?: z.ZodType<unknown>;
  /** Whether this stage can run in parallel with others */
  parallelizable?: boolean;
  /** Resource requirements for allocation decisions */
  resources?: {
    memoryMB?: number;
    cpuIntensive?: boolean;
    gpuRequired?: boolean;
  };
  /** Maximum duration before timeout (ms) */
  timeoutMs?: number;
  /** Number of retries on transient failure */
  maxRetries?: number;
}

/** Stage execution result */
export interface StageExecutionResult<T = unknown> {
  stage: string;
  success: boolean;
  data?: T;
  durationMs: number;
  retryCount: number;
  validationErrors?: string[];
  warnings: string[];
}

/** Pipeline execution metrics */
export interface PipelineMetrics {
  pipelineId: string;
  pipelineName: string;
  startTime: number;
  endTime?: number;
  totalDurationMs?: number;
  stageMetrics: StageMetrics[];
  lockAcquireTime?: number;
  lockHeld: boolean;
  checkpointsCreated: number;
  validationErrors: number;
  warnings: number;
  status: "running" | "completed" | "failed" | "dead_lettered";
}

/** Per-stage metrics */
export interface StageMetrics {
  stageName: string;
  stageIndex: number;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  inputSize?: number;
  outputSize?: number;
  validationPassed: boolean;
  retries: number;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
}

/** Pipeline execution options */
export interface PipelineExecutionOptions {
  /** Unique run ID (auto-generated if not provided) */
  runId?: string;
  /** Whether to acquire distributed lock */
  useLock?: boolean;
  /** Lock resource identifier (defaults to pipeline name) */
  lockResource?: string;
  /** Lock TTL in milliseconds */
  lockTtlMs?: number;
  /** Whether to use checkpointing */
  useCheckpoints?: boolean;
  /** Resume from this stage if checkpoints exist */
  resumeFromStage?: number;
  /** Whether to enqueue failed jobs to DLQ */
  useDeadLetterQueue?: boolean;
  /** Collect telemetry metrics */
  collectMetrics?: boolean;
  /** Validate schemas at stage boundaries */
  validateSchemas?: boolean;
  /** Maximum concurrent parallel stages */
  maxParallelStages?: number;
  /** Additional metadata for telemetry */
  metadata?: Record<string, unknown>;
}

/** Pipeline wrapper for a specific pipeline type */
export interface PipelineWrapper {
  pipelineName: string;
  executeWithInfra<TInput, TOutput>(
    input: TInput,
    stages: Array<{
      definition: PipelineStageDefinition;
      execute: (stageInput: unknown) => Promise<unknown>;
    }>,
    options?: PipelineExecutionOptions
  ): Promise<{
    success: boolean;
    output?: TOutput;
    metrics: PipelineMetrics;
    errors: string[];
    warnings: string[];
  }>;
}

/** Dead letter entry */
export interface DeadLetterEntry {
  pipelineId: string;
  pipelineName: string;
  failedStage: string;
  error: string;
  input: unknown;
  partialOutput: unknown;
  timestamp: string;
  retryCount: number;
  metadata?: Record<string, unknown>;
}

/** Resource allocation result */
export interface ResourceAllocation {
  maxConcurrentPipelines: number;
  suggestedBatchSize: number;
  memoryAvailableMB: number;
  cpuUtilization: number;
  queueDepth: number;
}

// ============================================================================
// PIPELINE TELEMETRY STORE
// ============================================================================

/** In-memory metrics store with ring buffer per pipeline type */
class PipelineTelemetryStore {
  private metricsBuffer: Map<string, PipelineMetrics[]> = new Map();
  private readonly bufferSize = 1000;

  record(metrics: PipelineMetrics): void {
    const key = metrics.pipelineName;
    let buffer = this.metricsBuffer.get(key);
    if (!buffer) {
      buffer = [];
      this.metricsBuffer.set(key, buffer);
    }
    buffer.push(metrics);
    // Ring buffer: drop oldest when full
    if (buffer.length > this.bufferSize) {
      buffer.shift();
    }
  }

  getMetrics(pipelineName: string, since?: number): PipelineMetrics[] {
    const buffer = this.metricsBuffer.get(pipelineName) ?? [];
    if (!since) return [...buffer];
    return buffer.filter(m => m.startTime >= since);
  }

  getAggregatedStats(pipelineName: string, windowMs: number = 3600000): {
    totalRuns: number;
    successRate: number;
    avgDurationMs: number;
    p95DurationMs: number;
    deadLetterCount: number;
    stageBreakdown: Record<string, { avgMs: number; failureRate: number }>;
  } {
    const since = Date.now() - windowMs;
    const metrics = this.getMetrics(pipelineName, since);

    if (metrics.length === 0) {
      return {
        totalRuns: 0,
        successRate: 0,
        avgDurationMs: 0,
        p95DurationMs: 0,
        deadLetterCount: 0,
        stageBreakdown: {},
      };
    }

    const completed = metrics.filter(m => m.status === "completed");
    const failed = metrics.filter(m => m.status === "failed" || m.status === "dead_lettered");
    const durations = completed
      .map(m => m.totalDurationMs)
      .filter((d): d is number => d != null)
      .sort((a, b) => a - b);

    // Stage breakdown aggregation
    const stageAgg: Record<string, { totalMs: number; count: number; failures: number }> = {};
    for (const m of metrics) {
      for (const sm of m.stageMetrics) {
        if (!stageAgg[sm.stageName]) {
          stageAgg[sm.stageName] = { totalMs: 0, count: 0, failures: 0 };
        }
        const s = stageAgg[sm.stageName];
        s.count++;
        if (sm.durationMs) s.totalMs += sm.durationMs;
        if (sm.status === "failed") s.failures++;
      }
    }

    const stageBreakdown: Record<string, { avgMs: number; failureRate: number }> = {};
    for (const [name, data] of Object.entries(stageAgg)) {
      stageBreakdown[name] = {
        avgMs: data.count > 0 ? Math.round(data.totalMs / data.count) : 0,
        failureRate: data.count > 0 ? data.failures / data.count : 0,
      };
    }

    return {
      totalRuns: metrics.length,
      successRate: completed.length / metrics.length,
      avgDurationMs: durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0,
      p95DurationMs: durations.length > 0
        ? durations[Math.floor(durations.length * 0.95)] ?? durations[durations.length - 1]
        : 0,
      deadLetterCount: metrics.filter(m => m.status === "dead_lettered").length,
      stageBreakdown,
    };
  }

  getAllPipelineNames(): string[] {
    return Array.from(this.metricsBuffer.keys());
  }
}

// ============================================================================
// PIPELINE OPTIMIZATION ENGINE
// ============================================================================

export class PipelineOptimizationEngine {
  readonly name = "PipelineOptimizationEngine";
  readonly version = "1.0.0";

  private telemetryStore = new PipelineTelemetryStore();
  private activePipelines = new Map<string, PipelineMetrics>();
  private deadLetterStore: DeadLetterEntry[] = [];
  private readonly maxDeadLetterSize = 500;

  /**
   * Create a pipeline wrapper with infrastructure integration.
   * @param pipelineName - Name of the pipeline (e.g., "PrintToProgram", "PostProcessor")
   */
  wrapPipeline(pipelineName: string): PipelineWrapper {
    return {
      pipelineName,
      executeWithInfra: async <TInput, TOutput>(
        input: TInput,
        stages: Array<{
          definition: PipelineStageDefinition;
          execute: (stageInput: unknown) => Promise<unknown>;
        }>,
        options: PipelineExecutionOptions = {}
      ) => {
        return this.executePipeline<TInput, TOutput>(pipelineName, input, stages, options);
      },
    };
  }

  /**
   * Execute a pipeline with full infrastructure integration.
   */
  private async executePipeline<TInput, TOutput>(
    pipelineName: string,
    input: TInput,
    stages: Array<{
      definition: PipelineStageDefinition;
      execute: (stageInput: unknown) => Promise<unknown>;
    }>,
    options: PipelineExecutionOptions
  ): Promise<{
    success: boolean;
    output?: TOutput;
    metrics: PipelineMetrics;
    errors: string[];
    warnings: string[];
  }> {
    const runId = options.runId ?? `${pipelineName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Initialize metrics
    const metrics: PipelineMetrics = {
      pipelineId: runId,
      pipelineName,
      startTime: Date.now(),
      stageMetrics: stages.map((s, i) => ({
        stageName: s.definition.name,
        stageIndex: i,
        startTime: 0,
        validationPassed: true,
        retries: 0,
        status: "pending" as const,
      })),
      lockHeld: false,
      checkpointsCreated: 0,
      validationErrors: 0,
      warnings: 0,
      status: "running",
    };

    this.activePipelines.set(runId, metrics);

    // Initialize checkpoint manager if needed
    const checkpointMgr = options.useCheckpoints
      ? new PipelineCheckpointManager(pipelineName, runId)
      : null;

    // Acquire distributed lock if needed
    let lockHandle: LockResult | null = null;
    if (options.useLock !== false) {
      const lockResource = options.lockResource ?? `pipeline:${pipelineName}:${runId}`;
      const lockStart = Date.now();
      try {
        lockHandle = await distributedLockService.acquireLock(
          lockResource,
          options.lockTtlMs ?? 30 * 60 * 1000, // 30 min default
          "pipeline"
        );
        metrics.lockAcquireTime = Date.now() - lockStart;
        metrics.lockHeld = lockHandle.acquired;

        if (!lockHandle.acquired) {
          warnings.push(`Could not acquire lock for ${lockResource}: ${lockHandle.error}`);
        }
      } catch (err) {
        warnings.push(`Lock acquisition failed: ${err}`);
      }
    }

    let currentOutput: unknown = input;
    let resumeStageIndex = 0;

    // Check for checkpoint resume
    if (checkpointMgr && options.resumeFromStage != null) {
      const checkpoint = checkpointMgr.resumeFrom(options.resumeFromStage);
      if (checkpoint) {
        currentOutput = checkpoint.data;
        resumeStageIndex = options.resumeFromStage;
        log.info(`[PipelineOpt] Resuming ${pipelineName} from stage ${resumeStageIndex}`);
      }
    }

    try {
      // Execute stages sequentially (parallel execution would go here for parallelizable stages)
      for (let i = resumeStageIndex; i < stages.length; i++) {
        const stage = stages[i];
        const stageMetrics = metrics.stageMetrics[i];
        stageMetrics.startTime = Date.now();
        stageMetrics.status = "running";

        // Input validation
        if (options.validateSchemas !== false && stage.definition.inputSchema) {
          const validation = stage.definition.inputSchema.safeParse(currentOutput);
          if (!validation.success) {
            const validationErrors = validation.error.issues.map(e => `${e.path.join(".")}: ${e.message}`);
            stageMetrics.validationPassed = false;
            metrics.validationErrors += validationErrors.length;
            errors.push(...validationErrors.map(e => `[${stage.definition.name}] Input validation: ${e}`));

            // Fail the stage
            stageMetrics.status = "failed";
            stageMetrics.endTime = Date.now();
            stageMetrics.durationMs = stageMetrics.endTime - stageMetrics.startTime;
            throw new Error(`Stage ${stage.definition.name} input validation failed`);
          }
        }

        // Execute with retry logic
        const maxRetries = stage.definition.maxRetries ?? 0;
        let lastError: Error | null = null;
        let stageOutput: unknown = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          stageMetrics.retries = attempt;
          try {
            // Set timeout if specified
            if (stage.definition.timeoutMs) {
              stageOutput = await Promise.race([
                stage.execute(currentOutput),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error(`Stage ${stage.definition.name} timed out after ${stage.definition.timeoutMs}ms`)),
                  stage.definition.timeoutMs)
                ),
              ]);
            } else {
              stageOutput = await stage.execute(currentOutput);
            }
            lastError = null;
            break;
          } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (attempt < maxRetries) {
              // Exponential backoff
              const delay = Math.pow(2, attempt) * 100;
              await new Promise(resolve => setTimeout(resolve, delay));
              warnings.push(`[${stage.definition.name}] Retry ${attempt + 1}/${maxRetries}: ${lastError.message}`);
            }
          }
        }

        if (lastError) {
          stageMetrics.status = "failed";
          stageMetrics.endTime = Date.now();
          stageMetrics.durationMs = stageMetrics.endTime - stageMetrics.startTime;
          throw lastError;
        }

        // Output validation
        if (options.validateSchemas !== false && stage.definition.outputSchema) {
          const validation = stage.definition.outputSchema.safeParse(stageOutput);
          if (!validation.success) {
            const validationErrors = validation.error.issues.map(e => `${e.path.join(".")}: ${e.message}`);
            stageMetrics.validationPassed = false;
            metrics.validationErrors += validationErrors.length;
            errors.push(...validationErrors.map(e => `[${stage.definition.name}] Output validation: ${e}`));

            stageMetrics.status = "failed";
            stageMetrics.endTime = Date.now();
            stageMetrics.durationMs = stageMetrics.endTime - stageMetrics.startTime;
            throw new Error(`Stage ${stage.definition.name} output validation failed`);
          }
        }

        // Stage completed successfully
        stageMetrics.status = "completed";
        stageMetrics.endTime = Date.now();
        stageMetrics.durationMs = stageMetrics.endTime - stageMetrics.startTime;
        stageMetrics.outputSize = JSON.stringify(stageOutput ?? {}).length;

        // Checkpoint after successful stage
        if (checkpointMgr) {
          checkpointMgr.checkpoint(stage.definition.name, i, stageOutput, stageMetrics.durationMs);
          metrics.checkpointsCreated++;
        }

        currentOutput = stageOutput;
      }

      // Pipeline completed successfully
      metrics.status = "completed";
      metrics.endTime = Date.now();
      metrics.totalDurationMs = metrics.endTime - metrics.startTime;
      metrics.warnings = warnings.length;

      // Cleanup checkpoints on success
      if (checkpointMgr) {
        checkpointMgr.cleanup();
      }

      // Record telemetry
      if (options.collectMetrics !== false) {
        this.telemetryStore.record(metrics);
      }

      // Release lock
      if (lockHandle?.acquired && lockHandle.handle) {
        await distributedLockService.releaseLock(lockHandle.handle.resource);
        metrics.lockHeld = false;
      }

      this.activePipelines.delete(runId);

      return {
        success: true,
        output: currentOutput as TOutput,
        metrics,
        errors,
        warnings,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      errors.push(errorMessage);

      // Update metrics
      metrics.status = options.useDeadLetterQueue ? "dead_lettered" : "failed";
      metrics.endTime = Date.now();
      metrics.totalDurationMs = metrics.endTime - metrics.startTime;
      metrics.warnings = warnings.length;

      // Send to dead letter queue if enabled
      if (options.useDeadLetterQueue) {
        const failedStageIndex = metrics.stageMetrics.findIndex(s => s.status === "failed");
        const failedStageName = failedStageIndex >= 0
          ? stages[failedStageIndex].definition.name
          : "unknown";

        this.addToDeadLetter({
          pipelineId: runId,
          pipelineName,
          failedStage: failedStageName,
          error: errorMessage,
          input,
          partialOutput: currentOutput,
          timestamp: new Date().toISOString(),
          retryCount: 0,
          metadata: options.metadata,
        });

        // Also enqueue to DurableJobQueue for background retry
        try {
          await durableJobQueueEngine.enqueue(`pipeline:${pipelineName}:dlq`, {
            pipelineId: runId,
            input,
            failedStage: failedStageName,
            error: errorMessage,
          }, {
            idempotency_key: runId,
            max_retries: 3,
            priority: -1, // Lower priority for retries
          });
        } catch (dlqErr) {
          log.warn(`[PipelineOpt] Failed to enqueue to DLQ: ${dlqErr}`);
        }
      }

      // Record telemetry
      if (options.collectMetrics !== false) {
        this.telemetryStore.record(metrics);
      }

      // Release lock
      if (lockHandle?.acquired && lockHandle.handle) {
        await distributedLockService.releaseLock(lockHandle.handle.resource);
        metrics.lockHeld = false;
      }

      this.activePipelines.delete(runId);

      return {
        success: false,
        output: undefined,
        metrics,
        errors,
        warnings,
      };
    }
  }

  /**
   * Add entry to dead letter store.
   */
  private addToDeadLetter(entry: DeadLetterEntry): void {
    this.deadLetterStore.push(entry);
    if (this.deadLetterStore.length > this.maxDeadLetterSize) {
      this.deadLetterStore.shift();
    }
    log.warn(`[PipelineOpt] Dead-lettered: ${entry.pipelineName}/${entry.pipelineId} at stage ${entry.failedStage}`);
  }

  /**
   * Get dead letter queue contents.
   */
  getDeadLetterQueue(pipelineName?: string): DeadLetterEntry[] {
    if (!pipelineName) return [...this.deadLetterStore];
    return this.deadLetterStore.filter(e => e.pipelineName === pipelineName);
  }

  /**
   * Retry a dead-lettered pipeline.
   */
  async retryDeadLetter(pipelineId: string): Promise<{ ok: boolean; error?: string }> {
    const entry = this.deadLetterStore.find(e => e.pipelineId === pipelineId);
    if (!entry) {
      return { ok: false, error: "Dead letter entry not found" };
    }

    // Remove from dead letter store
    const index = this.deadLetterStore.indexOf(entry);
    if (index >= 0) {
      this.deadLetterStore.splice(index, 1);
    }

    // Re-enqueue with incremented retry count
    entry.retryCount++;
    try {
      await durableJobQueueEngine.enqueue(`pipeline:${entry.pipelineName}:retry`, {
        ...entry,
        retryCount: entry.retryCount,
      }, {
        idempotency_key: `${pipelineId}-retry-${entry.retryCount}`,
        max_retries: 3,
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  /**
   * Get telemetry stats for a pipeline.
   */
  getTelemetryStats(pipelineName: string, windowMs?: number): ReturnType<typeof PipelineTelemetryStore.prototype.getAggregatedStats> {
    return this.telemetryStore.getAggregatedStats(pipelineName, windowMs);
  }

  /**
   * Get all pipeline metrics.
   */
  getAllTelemetryStats(windowMs?: number): Record<string, ReturnType<typeof PipelineTelemetryStore.prototype.getAggregatedStats>> {
    const result: Record<string, ReturnType<typeof PipelineTelemetryStore.prototype.getAggregatedStats>> = {};
    for (const name of this.telemetryStore.getAllPipelineNames()) {
      result[name] = this.telemetryStore.getAggregatedStats(name, windowMs);
    }
    return result;
  }

  /**
   * Get currently active pipelines.
   */
  getActivePipelines(): PipelineMetrics[] {
    return Array.from(this.activePipelines.values());
  }

  /**
   * Get resource allocation recommendations.
   */
  getResourceAllocation(): ResourceAllocation {
    const active = this.activePipelines.size;
    const dlqDepth = this.deadLetterStore.length;

    // Simple heuristics - could be extended with actual system metrics
    const memUsed = process.memoryUsage();
    const memAvailableMB = Math.round((memUsed.heapTotal - memUsed.heapUsed) / 1024 / 1024);

    return {
      maxConcurrentPipelines: Math.max(1, Math.min(8, Math.floor(memAvailableMB / 256))),
      suggestedBatchSize: active > 4 ? 10 : 25,
      memoryAvailableMB: memAvailableMB,
      cpuUtilization: active / 8, // Simplified
      queueDepth: dlqDepth,
    };
  }

  /**
   * Determine if stages can be parallelized.
   */
  analyzeStageParallelization(stages: PipelineStageDefinition[]): {
    parallelGroups: number[][];
    sequentialStages: number[];
    recommendations: string[];
  } {
    const parallelGroups: number[][] = [];
    const sequentialStages: number[] = [];
    const recommendations: string[] = [];

    let currentGroup: number[] = [];

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      if (stage.parallelizable) {
        currentGroup.push(i);
      } else {
        if (currentGroup.length > 0) {
          parallelGroups.push([...currentGroup]);
          currentGroup = [];
        }
        sequentialStages.push(i);
      }
    }

    if (currentGroup.length > 0) {
      parallelGroups.push(currentGroup);
    }

    // Generate recommendations
    if (parallelGroups.length === 0) {
      recommendations.push("No parallelizable stages found - pipeline is fully sequential");
    } else {
      const parallelCount = parallelGroups.reduce((sum, g) => sum + g.length, 0);
      recommendations.push(`${parallelCount} stages can be parallelized in ${parallelGroups.length} groups`);
    }

    const cpuIntensive = stages.filter(s => s.resources?.cpuIntensive).length;
    if (cpuIntensive > 3) {
      recommendations.push(`${cpuIntensive} CPU-intensive stages may benefit from worker pools`);
    }

    return { parallelGroups, sequentialStages, recommendations };
  }

  /**
   * Clean up old telemetry and dead letter entries.
   */
  cleanup(maxAgeHours: number = 24): { telemetryCleared: number; dlqCleared: number } {
    const cutoff = Date.now() - maxAgeHours * 3600 * 1000;

    // Cleanup checkpoints
    PipelineCheckpointManager.cleanupOld(maxAgeHours);

    // Cleanup old DLQ entries
    const initialDlq = this.deadLetterStore.length;
    this.deadLetterStore = this.deadLetterStore.filter(e =>
      new Date(e.timestamp).getTime() > cutoff
    );
    const dlqCleared = initialDlq - this.deadLetterStore.length;

    return { telemetryCleared: 0, dlqCleared };
  }
}

// Singleton export
export const pipelineOptimizationEngine = new PipelineOptimizationEngine();
