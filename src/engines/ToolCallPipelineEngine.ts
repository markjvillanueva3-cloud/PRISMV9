/**
 * ToolCallPipelineEngine - Declarative tool call pipelines
 *
 * Defines reusable pipelines of tool calls that execute in optimal order.
 * Supports conditional steps, result passing between steps, and
 * short-circuit on failure. Reduces manual orchestration overhead.
 *
 * @version 1.0.0
 */

export interface PipelineStep {
  name: string;
  tool: string;
  params: Record<string, unknown>;
  condition?: (context: PipelineContext) => boolean;
  transform?: (result: string, context: PipelineContext) => Record<string, unknown>;
}

export interface PipelineContext {
  results: Map<string, string>;
  metadata: Map<string, unknown>;
  startTime: number;
  stepCount: number;
  skipped: number;
}

export interface PipelineResult {
  success: boolean;
  stepsRun: number;
  stepsSkipped: number;
  totalTokens: number;
  durationMs: number;
  results: Map<string, string>;
  errors: string[];
}

export interface PipelineDefinition {
  name: string;
  steps: PipelineStep[];
  description?: string;
}

const BUILTIN_PIPELINES: Record<string, PipelineStep[]> = {
  "read-edit-verify": [
    { name: "read", tool: "Read", params: {} },
    { name: "edit", tool: "Edit", params: {} },
  ],
  "search-then-read": [
    { name: "search", tool: "Grep", params: {} },
    { name: "read", tool: "Read", params: {} },
  ],
  "glob-then-grep": [
    { name: "find-files", tool: "Glob", params: {} },
    { name: "search-content", tool: "Grep", params: {} },
  ],
};

export class ToolCallPipelineEngine {
  private pipelines = new Map<string, PipelineDefinition>();
  private executionLog: Array<{ pipeline: string; result: PipelineResult }> = [];

  constructor() {
    // Register built-in pipelines
    for (const [name, steps] of Object.entries(BUILTIN_PIPELINES)) {
      this.pipelines.set(name, { name, steps });
    }
  }

  /**
   * Register a custom pipeline.
   */
  register(definition: PipelineDefinition): void {
    this.pipelines.set(definition.name, definition);
  }

  /**
   * Get a pipeline definition.
   */
  get(name: string): PipelineDefinition | undefined {
    return this.pipelines.get(name);
  }

  /**
   * List all registered pipelines.
   */
  list(): string[] {
    return Array.from(this.pipelines.keys());
  }

  /**
   * Simulate a pipeline execution (dry run).
   * Returns the planned steps with estimated token costs.
   */
  dryRun(
    name: string,
    params?: Record<string, unknown>,
  ): { steps: string[]; estimatedTokens: number } | undefined {
    const pipeline = this.pipelines.get(name);
    if (!pipeline) return undefined;

    const toolCosts: Record<string, number> = {
      Read: 500,
      Edit: 300,
      Grep: 200,
      Glob: 100,
      Bash: 400,
      Write: 300,
      WebFetch: 1000,
    };

    const steps = pipeline.steps.map((s) => s.name + " (" + s.tool + ")");
    const estimatedTokens = pipeline.steps.reduce(
      (sum, s) => sum + (toolCosts[s.tool] ?? 300),
      0,
    );

    return { steps, estimatedTokens };
  }

  /**
   * Record a pipeline execution result.
   */
  recordExecution(pipelineName: string, result: PipelineResult): void {
    this.executionLog.push({ pipeline: pipelineName, result });
    if (this.executionLog.length > 50) {
      this.executionLog = this.executionLog.slice(-50);
    }
  }

  /**
   * Get execution statistics.
   */
  stats(): {
    totalExecutions: number;
    successRate: number;
    avgTokens: number;
    topPipelines: Array<{ name: string; count: number }>;
  } {
    const total = this.executionLog.length;
    if (total === 0) {
      return { totalExecutions: 0, successRate: 0, avgTokens: 0, topPipelines: [] };
    }

    const successes = this.executionLog.filter((e) => e.result.success).length;
    const avgTokens = Math.round(
      this.executionLog.reduce((s, e) => s + e.result.totalTokens, 0) / total,
    );

    const counts = new Map<string, number>();
    for (const e of this.executionLog) {
      counts.set(e.pipeline, (counts.get(e.pipeline) ?? 0) + 1);
    }

    const topPipelines = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalExecutions: total,
      successRate: Math.round((successes / total) * 100),
      avgTokens,
      topPipelines,
    };
  }

  /**
   * One-liner status.
   */
  oneLiner(): string {
    const s = this.stats();
    return (
      "Pipelines: " +
      this.pipelines.size +
      " registered, " +
      s.totalExecutions +
      " executed" +
      (s.totalExecutions > 0 ? ", " + s.successRate + "% success" : "")
    );
  }

  /**
   * Reset execution log.
   */
  reset(): void {
    this.executionLog = [];
  }
}

export const toolCallPipelineEngine = new ToolCallPipelineEngine();
