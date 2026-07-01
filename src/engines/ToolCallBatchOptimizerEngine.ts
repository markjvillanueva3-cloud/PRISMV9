/**
 * ToolCallBatchOptimizerEngine - Optimizes tool call sequences
 *
 * Analyzes planned or historical tool call sequences to find parallelization
 * opportunities, redundant calls, and optimal ordering. Reduces round trips
 * and total token cost.
 *
 * @version 1.0.0
 */

export interface ToolCall {
  tool: string;
  params: Record<string, unknown>;
  dependsOn?: number[];
}

export interface BatchPlan {
  batches: ToolCall[][];
  totalRounds: number;
  savedRounds: number;
  parallelizable: number;
  sequential: number;
}

export interface SequenceAnalysis {
  totalCalls: number;
  redundant: number;
  parallelizable: number;
  suggestions: string[];
  estimatedSavings: number;
}

const TOOL_COSTS: Record<string, number> = {
  Read: 500,
  Grep: 200,
  Glob: 100,
  Edit: 300,
  Write: 300,
  Bash: 400,
  WebFetch: 1000,
  WebSearch: 800,
  Agent: 2000,
};

const READ_TOOLS = new Set(["Read", "Grep", "Glob"]);
const WRITE_TOOLS = new Set(["Edit", "Write"]);

export class ToolCallBatchOptimizerEngine {
  /**
   * Create an optimal batch plan from a list of tool calls.
   */
  plan(calls: ToolCall[]): BatchPlan {
    if (calls.length === 0) {
      return { batches: [], totalRounds: 0, savedRounds: 0, parallelizable: 0, sequential: 0 };
    }

    // Build dependency graph
    const batches: ToolCall[][] = [];
    const scheduled = new Set<number>();

    while (scheduled.size < calls.length) {
      const batch: ToolCall[] = [];
      const batchIndices: number[] = [];

      for (let i = 0; i < calls.length; i++) {
        if (scheduled.has(i)) continue;
        const deps = calls[i].dependsOn ?? [];
        if (deps.every((d) => scheduled.has(d))) {
          // Check for write conflicts within batch
          if (!this.hasWriteConflict(batch, calls[i])) {
            batch.push(calls[i]);
            batchIndices.push(i);
          }
        }
      }

      if (batch.length === 0) break; // Prevent infinite loop on circular deps
      for (const idx of batchIndices) scheduled.add(idx);
      batches.push(batch);
    }

    const parallelizable = calls.length - batches.length;
    const sequential = batches.length;

    return {
      batches,
      totalRounds: batches.length,
      savedRounds: calls.length - batches.length,
      parallelizable,
      sequential,
    };
  }

  /**
   * Analyze a sequence of tool calls for optimization opportunities.
   */
  analyze(calls: ToolCall[]): SequenceAnalysis {
    const suggestions: string[] = [];
    let redundant = 0;
    let parallelizable = 0;

    // Detect duplicate reads
    const readPaths = new Map<string, number>();
    for (let i = 0; i < calls.length; i++) {
      const c = calls[i];
      if (READ_TOOLS.has(c.tool)) {
        const key = c.tool + ":" + JSON.stringify(c.params);
        if (readPaths.has(key)) {
          redundant++;
          suggestions.push(
            "Duplicate " + c.tool + " at index " + i + " (same as " + readPaths.get(key) + ")",
          );
        } else {
          readPaths.set(key, i);
        }
      }
    }

    // Detect parallelizable reads
    for (let i = 0; i < calls.length - 1; i++) {
      if (
        READ_TOOLS.has(calls[i].tool) &&
        READ_TOOLS.has(calls[i + 1].tool) &&
        !calls[i + 1].dependsOn?.includes(i)
      ) {
        parallelizable++;
      }
    }

    if (parallelizable > 0) {
      suggestions.push(
        parallelizable + " consecutive reads can be parallelized",
      );
    }

    // Detect read-after-write that could be eliminated
    const writtenFiles = new Set<string>();
    for (const c of calls) {
      if (WRITE_TOOLS.has(c.tool) && c.params.file_path) {
        writtenFiles.add(String(c.params.file_path));
      }
      if (c.tool === "Read" && c.params.file_path && writtenFiles.has(String(c.params.file_path))) {
        suggestions.push(
          "Read after write on " + c.params.file_path + " - content already known",
        );
      }
    }

    // Estimate token savings
    const estimatedSavings =
      redundant * 500 + parallelizable * 100;

    return {
      totalCalls: calls.length,
      redundant,
      parallelizable,
      suggestions,
      estimatedSavings,
    };
  }

  /**
   * Estimate total token cost of a call sequence.
   */
  estimateCost(calls: ToolCall[]): number {
    return calls.reduce((sum, c) => sum + (TOOL_COSTS[c.tool] ?? 300), 0);
  }

  /**
   * Get a compact summary of optimization opportunities.
   */
  summary(calls: ToolCall[]): string {
    const analysis = this.analyze(calls);
    const plan = this.plan(calls);
    const parts = [
      calls.length + " calls",
      plan.totalRounds + " rounds",
    ];
    if (analysis.redundant > 0) parts.push(analysis.redundant + " redundant");
    if (plan.savedRounds > 0) parts.push(plan.savedRounds + " rounds saved");
    if (analysis.estimatedSavings > 0)
      parts.push("~" + analysis.estimatedSavings + " tokens saveable");
    return parts.join(" | ");
  }

  private hasWriteConflict(batch: ToolCall[], call: ToolCall): boolean {
    if (!WRITE_TOOLS.has(call.tool)) return false;
    const filePath = String(call.params.file_path ?? "");
    if (!filePath) return false;

    return batch.some(
      (b) =>
        (WRITE_TOOLS.has(b.tool) || b.tool === "Read") &&
        String(b.params.file_path ?? "") === filePath,
    );
  }
}

export const toolCallBatchOptimizerEngine = new ToolCallBatchOptimizerEngine();
