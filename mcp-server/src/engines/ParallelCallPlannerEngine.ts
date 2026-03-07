/**
 * ParallelCallPlannerEngine — Plans parallel tool call batches
 *
 * Analyzes a set of pending tool calls and identifies which can
 * run in parallel vs which have dependencies requiring sequential
 * execution. Reduces round trips by maximizing parallelism.
 *
 * Token savings: Each parallel batch saves ~100 tokens of round-trip
 * overhead. 3 independent calls batched = 200 tokens saved.
 *
 * @version 1.0.0
 */

export interface PlannedCall {
  id: string;
  tool: string;
  params: Record<string, unknown>;
  dependsOn?: string[]; // IDs of calls this depends on
}

export interface CallBatch {
  batch: number;
  calls: PlannedCall[];
  canParallel: boolean;
}

export interface ExecutionPlan {
  batches: CallBatch[];
  totalCalls: number;
  totalBatches: number;
  parallelizable: number;
  savedRoundTrips: number;
}

export class ParallelCallPlannerEngine {

  /**
   * Plan execution order for a set of tool calls.
   */
  plan(calls: PlannedCall[]): ExecutionPlan {
    if (calls.length === 0) {
      return { batches: [], totalCalls: 0, totalBatches: 0, parallelizable: 0, savedRoundTrips: 0 };
    }

    const resolved = new Set<string>();
    const remaining = [...calls];
    const batches: CallBatch[] = [];
    let batchNum = 0;

    while (remaining.length > 0) {
      // Find all calls whose dependencies are resolved
      const ready = remaining.filter(c =>
        !c.dependsOn || c.dependsOn.length === 0 || c.dependsOn.every(d => resolved.has(d))
      );

      if (ready.length === 0) {
        // Circular dependency or missing dependency — force first remaining
        ready.push(remaining[0]);
      }

      batches.push({
        batch: batchNum++,
        calls: ready,
        canParallel: ready.length > 1,
      });

      for (const call of ready) {
        resolved.add(call.id);
        const idx = remaining.indexOf(call);
        if (idx >= 0) remaining.splice(idx, 1);
      }
    }

    const parallelizable = batches.filter(b => b.canParallel).reduce((s, b) => s + b.calls.length, 0);
    const savedRoundTrips = calls.length - batches.length;

    return { batches, totalCalls: calls.length, totalBatches: batches.length, parallelizable, savedRoundTrips };
  }

  /**
   * Auto-detect dependencies between common tool patterns.
   */
  inferDependencies(calls: Array<{ tool: string; params: Record<string, unknown> }>): PlannedCall[] {
    const planned: PlannedCall[] = calls.map((c, i) => ({
      id: `call-${i}`,
      tool: c.tool,
      params: c.params,
      dependsOn: [],
    }));

    // Read depends on Glob that finds the file
    // Edit depends on Read of the same file
    // Write depends on Read of the same file
    for (let i = 0; i < planned.length; i++) {
      const current = planned[i];
      const filePath = (current.params.file_path || current.params.path || "") as string;

      for (let j = 0; j < i; j++) {
        const prior = planned[j];
        const priorPath = (prior.params.file_path || prior.params.path || "") as string;

        // Edit/Write depends on Read of same file
        if ((current.tool === "Edit" || current.tool === "Write") && prior.tool === "Read" && filePath === priorPath) {
          current.dependsOn!.push(prior.id);
        }

        // Sequential Bash commands (same working directory effects)
        if (current.tool === "Bash" && prior.tool === "Bash") {
          const priorCmd = (prior.params.command || "") as string;
          const currentCmd = (current.params.command || "") as string;
          // If prior changes directory or creates files that current needs
          if (priorCmd.includes("cd ") || priorCmd.includes("mkdir") ||
              (priorCmd.includes("git") && currentCmd.includes("git"))) {
            current.dependsOn!.push(prior.id);
          }
        }
      }
    }

    return planned;
  }

  /**
   * Quick check: can these calls run in parallel?
   */
  canParallel(calls: Array<{ tool: string; params: Record<string, unknown> }>): boolean {
    // All reads/greps/globs with different targets can parallel
    const readOnlyTools = new Set(["Read", "Grep", "Glob", "WebSearch", "WebFetch"]);
    if (calls.every(c => readOnlyTools.has(c.tool))) {
      const paths = calls.map(c => (c.params.file_path || c.params.path || c.params.pattern || "") as string);
      return new Set(paths).size === paths.length; // all different targets
    }
    return false;
  }

  /**
   * One-liner summary.
   */
  oneLiner(plan: ExecutionPlan): string {
    return `${plan.totalCalls} calls → ${plan.totalBatches} batches (${plan.savedRoundTrips} round trips saved, ${plan.parallelizable} parallelized)`;
  }
}

export const parallelCallPlannerEngine = new ParallelCallPlannerEngine();
