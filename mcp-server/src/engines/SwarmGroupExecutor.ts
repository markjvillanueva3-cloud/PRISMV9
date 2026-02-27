/**
 * SwarmGroupExecutor.ts — Multi-group swarm orchestration engine
 *
 * Executes multiple TaskGroups in two passes:
 *   1. Independent groups via Promise.allSettled (parallel)
 *   2. Dependent groups sequentially, with dependency outputs injected
 *
 * Reuses SwarmExecutor.execute() internally — each group IS a swarm.
 */
import { executeSwarm, type SwarmPattern } from "./SwarmExecutor.js";
import type { SwarmResult } from "./SwarmExecutor.js";
import { hookEngine } from "../orchestration/HookEngine.js";

// ── Batch Hook Helpers ────────────────────────────────────────────────
// Fire registered BATCH-* hooks from HookEngine. Non-fatal — swarm
// execution continues normally if any hook fails.

function fireBatchHook(hookId: string, data: Record<string, unknown>): void {
  try {
    // Fire-and-forget — don't await to avoid blocking swarm execution
    hookEngine.executeHook(hookId, data).catch(() => {});
  } catch { /* batch hooks are non-fatal */ }
}

// ── Types ──────────────────────────────────────────────────────────────

export interface TaskGroup {
  groupId: string;
  name: string;
  pattern: SwarmPattern;
  agents: string[];
  input: Record<string, unknown>;
  timeout_ms?: number;
  /** groupIds this group depends on (outputs injected before execution) */
  dependsOn?: string[];
  /** Wave number for ordering (0 = independent, 1+ = sequential waves) */
  wave?: number;
}

export interface GroupResult {
  groupId: string;
  name: string;
  status: "completed" | "partial" | "failed" | "timedOut";
  duration_ms: number;
  successCount: number;
  failCount: number;
  /** Slim synthesis of swarm output */
  keyFindings: string[];
  /** Full swarm result (internal use only) */
  swarmResult?: SwarmResult;
  error?: string;
}

export interface SwarmGroupResult {
  totalGroups: number;
  completedGroups: number;
  failedGroups: number;
  timedOut: boolean;
  duration_ms: number;
  groups: GroupResult[];
  /** Top 3 synthesized findings across all groups */
  synthesis: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Extract up to `max` key findings from a SwarmResult, each capped at `maxLen` chars.
 */
function extractKeyFindings(result: SwarmResult, max = 3, maxLen = 150): string[] {
  const findings: string[] = [];

  // Try aggregatedOutput first
  if (result.aggregatedOutput) {
    const agg = result.aggregatedOutput;
    if (typeof agg === "string") {
      findings.push(agg.slice(0, maxLen));
    } else if (Array.isArray(agg)) {
      for (const item of agg.slice(0, max)) {
        findings.push(String(item).slice(0, maxLen));
      }
    } else if (typeof agg === "object" && agg !== null) {
      // Pull summary/result/output fields
      for (const key of ["summary", "result", "output", "finding", "recommendation"]) {
        if ((agg as any)[key]) {
          findings.push(String((agg as any)[key]).slice(0, maxLen));
          if (findings.length >= max) break;
        }
      }
    }
  }

  // Fall back to individual agent results if aggregation was empty
  if (findings.length === 0 && result.agentResults) {
    const entries = result.agentResults instanceof Map
      ? Array.from(result.agentResults.values())
      : Object.values(result.agentResults);
    for (const agentResult of entries.slice(0, max)) {
      const out = (agentResult as any)?.output ?? (agentResult as any)?.result;
      if (out) findings.push(String(out).slice(0, maxLen));
    }
  }

  // Consensus result
  if (findings.length === 0 && result.consensus?.consensusValue) {
    findings.push(`Consensus: ${String(result.consensus.consensusValue).slice(0, maxLen)}`);
  }

  return findings.slice(0, max);
}

// ── Core Executor ──────────────────────────────────────────────────────

/**
 * Execute multiple TaskGroups with dependency resolution.
 *
 * @param groups  - Array of TaskGroup definitions
 * @param timeout_ms - Overall timeout for ALL groups (default 45s)
 * @returns SwarmGroupResult with per-group results and cross-group synthesis
 */
export async function executeSwarmGroups(
  groups: TaskGroup[],
  timeout_ms = 45000
): Promise<SwarmGroupResult> {
  const start = Date.now();
  const results: GroupResult[] = [];
  let timedOut = false;
  const totalItems = groups.length;

  // BATCH-BEFORE-START: Validate and announce batch operation
  fireBatchHook("BATCH-BEFORE-START-001", {
    event: "batch_start",
    total_groups: totalItems,
    total_agents: groups.reduce((n, g) => n + g.agents.length, 0),
    group_ids: groups.map(g => g.groupId),
    timeout_ms,
  });

  // Partition into independent (no deps) and dependent groups
  const independent = groups.filter(g => !g.dependsOn || g.dependsOn.length === 0);
  const dependent = groups.filter(g => g.dependsOn && g.dependsOn.length > 0);

  // Sort dependent groups by wave (lower waves first)
  dependent.sort((a, b) => (a.wave ?? 1) - (b.wave ?? 1));

  // Map groupId → GroupResult for dependency output injection
  const resultMap = new Map<string, GroupResult>();

  // ── Pass 1: Independent groups in parallel ──
  const independentPromises = independent.map(group =>
    executeOneGroup(group, resultMap, timeout_ms - (Date.now() - start))
  );

  const settled = await Promise.allSettled(independentPromises);
  for (const s of settled) {
    if (s.status === "fulfilled") {
      results.push(s.value);
      resultMap.set(s.value.groupId, s.value);
      // BATCH-ITEM-COMPLETE: Track per-group completion
      fireBatchHook("BATCH-ITEM-COMPLETE-001", {
        event: "item_complete",
        group_id: s.value.groupId,
        group_name: s.value.name,
        status: s.value.status,
        duration_ms: s.value.duration_ms,
        success_count: s.value.successCount,
        fail_count: s.value.failCount,
        progress: `${results.length}/${totalItems}`,
      });
    } else {
      // Should not happen (executeOneGroup catches), but safety net
      const failResult: GroupResult = {
        groupId: "unknown",
        name: "unknown",
        status: "failed",
        duration_ms: 0,
        successCount: 0,
        failCount: 1,
        keyFindings: [],
        error: String(s.reason).slice(0, 200),
      };
      results.push(failResult);
      // BATCH-ERROR-HANDLER: Report unexpected group failure
      fireBatchHook("BATCH-ERROR-HANDLER-001", {
        event: "batch_item_error",
        group_id: "unknown",
        error: failResult.error,
        progress: `${results.length}/${totalItems}`,
        recoverable: false,
      });
    }
  }

  // BATCH-PROGRESS-UPDATE: Mid-batch progress after parallel pass
  if (dependent.length > 0) {
    fireBatchHook("BATCH-PROGRESS-UPDATE-001", {
      event: "progress_update",
      phase: "parallel_complete",
      completed: results.length,
      remaining: dependent.length,
      total: totalItems,
      elapsed_ms: Date.now() - start,
      failed_so_far: results.filter(r => r.status === "failed").length,
    });
  }

  // ── Pass 2: Dependent groups sequentially ──
  for (const group of dependent) {
    const elapsed = Date.now() - start;
    if (elapsed >= timeout_ms) {
      timedOut = true;
      const timedOutResult: GroupResult = {
        groupId: group.groupId,
        name: group.name,
        status: "timedOut",
        duration_ms: 0,
        successCount: 0,
        failCount: 0,
        keyFindings: [],
        error: "Overall timeout reached before group could start",
      };
      results.push(timedOutResult);
      // BATCH-ERROR-HANDLER: Timeout
      fireBatchHook("BATCH-ERROR-HANDLER-001", {
        event: "batch_item_timeout",
        group_id: group.groupId,
        group_name: group.name,
        elapsed_ms: elapsed,
        timeout_ms,
      });
      continue;
    }

    const groupResult = await executeOneGroup(group, resultMap, timeout_ms - elapsed);
    results.push(groupResult);
    resultMap.set(groupResult.groupId, groupResult);

    // BATCH-ITEM-COMPLETE: Track dependent group completion
    fireBatchHook("BATCH-ITEM-COMPLETE-001", {
      event: "item_complete",
      group_id: groupResult.groupId,
      group_name: groupResult.name,
      status: groupResult.status,
      duration_ms: groupResult.duration_ms,
      progress: `${results.length}/${totalItems}`,
    });

    // BATCH-CHECKPOINT: Checkpoint after each sequential group (resumable state)
    fireBatchHook("BATCH-CHECKPOINT-001", {
      event: "batch_checkpoint",
      completed_groups: results.filter(r => r.status === "completed" || r.status === "partial").map(r => r.groupId),
      pending_groups: dependent.filter(g => !resultMap.has(g.groupId)).map(g => g.groupId),
      elapsed_ms: Date.now() - start,
    });
  }

  // ── Synthesis: top findings across all groups ──
  const allFindings: string[] = [];
  for (const r of results) {
    allFindings.push(...r.keyFindings);
  }
  const synthesis = allFindings.slice(0, 3);

  const duration_ms = Date.now() - start;
  const completedGroups = results.filter(r => r.status === "completed" || r.status === "partial").length;
  const failedGroups = results.filter(r => r.status === "failed").length;

  // BATCH-AFTER-COMPLETE: Final batch summary
  fireBatchHook("BATCH-AFTER-COMPLETE-001", {
    event: "batch_complete",
    total_groups: totalItems,
    completed_groups: completedGroups,
    failed_groups: failedGroups,
    timed_out: timedOut || duration_ms >= timeout_ms,
    duration_ms,
    synthesis,
  });

  return {
    totalGroups: groups.length,
    completedGroups,
    failedGroups,
    timedOut: timedOut || duration_ms >= timeout_ms,
    duration_ms,
    groups: results,
    synthesis,
  };
}

// ── Single Group Executor ──────────────────────────────────────────────

async function executeOneGroup(
  group: TaskGroup,
  resultMap: Map<string, GroupResult>,
  remainingMs: number
): Promise<GroupResult> {
  const groupStart = Date.now();
  try {
    // Inject dependency outputs into input
    const enrichedInput: Record<string, unknown> = { ...group.input };
    if (group.dependsOn) {
      for (const depId of group.dependsOn) {
        const depResult = resultMap.get(depId);
        if (depResult) {
          enrichedInput[`dep_${depId}`] = {
            status: depResult.status,
            findings: depResult.keyFindings,
          };
        }
      }
    }

    const effectiveTimeout = Math.min(
      group.timeout_ms ?? 30000,
      Math.max(remainingMs - 500, 5000) // leave 500ms buffer
    );

    // Execute as a swarm via SwarmExecutor
    const swarmResult = await Promise.race([
      executeSwarm({
        name: group.name,
        pattern: group.pattern,
        agents: group.agents,
        input: enrichedInput,
        timeout_ms: effectiveTimeout,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("group_timeout")), effectiveTimeout + 1000)
      ),
    ]);

    const keyFindings = extractKeyFindings(swarmResult);

    return {
      groupId: group.groupId,
      name: group.name,
      status: swarmResult.status,
      duration_ms: Date.now() - groupStart,
      successCount: swarmResult.successCount,
      failCount: swarmResult.failCount,
      keyFindings,
      swarmResult,
    };
  } catch (err: any) {
    const isTimeout = err?.message?.includes("timeout");
    return {
      groupId: group.groupId,
      name: group.name,
      status: isTimeout ? "timedOut" : "failed",
      duration_ms: Date.now() - groupStart,
      successCount: 0,
      failCount: group.agents.length,
      keyFindings: [],
      error: String(err?.message ?? err).slice(0, 200),
    };
  }
}
