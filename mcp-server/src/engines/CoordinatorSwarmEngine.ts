/**
 * CoordinatorSwarmEngine — U-HAGI03 fan-out + synthesize swarm coordinator.
 *
 * Pure-core orchestrator implementing the Kimi-300-agent pattern: spawn N
 * parallel sub-task runners, collect their outputs, synthesize.  Caller
 * supplies (a) the list of sub-task specs, (b) an async `runner(spec)`
 * callback, and (c) optionally a `synthesizer(results)` callback that
 * reduces N partial results into one coherent deliverable.
 *
 * Concurrency-bounded via `maxConcurrency` (default 10).  R12 fail-soft on
 * sub-task error — partial results merge through.  Deterministic
 * Promise.all batching, no globals.
 *
 * @module engines/CoordinatorSwarmEngine
 */

import { z } from "zod";

export const SwarmTaskSchema = z.object({
  id: z.string().min(1).max(120),
  payload: z.unknown(),
});
export type SwarmTask = z.infer<typeof SwarmTaskSchema>;

export interface SwarmSubResult<O> {
  id: string;
  ok: boolean;
  output?: O;
  error?: string;
  durationMs: number;
}

export interface SwarmRunResult<O, S> {
  subResults: SwarmSubResult<O>[];
  synthesized?: S;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    totalDurationMs: number;
    avgDurationMs: number;
  };
}

export type SwarmRunner<O> = (task: SwarmTask) => Promise<O> | O;
export type SwarmSynthesizer<O, S> = (subResults: readonly SwarmSubResult<O>[]) => S | Promise<S>;

const DEFAULT_MAX_CONCURRENCY = 10;
const HARD_TASK_CEILING = 300; // Kimi documented limit.

export class CoordinatorSwarmEngine {
  static validateTask(t: unknown): SwarmTask { return SwarmTaskSchema.parse(t); }

  /**
   * Run N sub-tasks via the supplied runner with bounded concurrency.  If a
   * synthesizer is provided, call it on the full sub-result set after all
   * runners settle (success + failure both feed in).  Each sub-task failure
   * is caught + recorded; never aborts the swarm.
   */
  static async run<O, S = undefined>(
    tasks: readonly SwarmTask[],
    runner: SwarmRunner<O>,
    opts: { maxConcurrency?: number; synthesizer?: SwarmSynthesizer<O, S> } = {},
  ): Promise<SwarmRunResult<O, S>> {
    if (!Array.isArray(tasks)) throw new Error("CoordinatorSwarm.run: tasks must be an array");
    if (typeof runner !== "function") throw new Error("CoordinatorSwarm.run: runner must be a function");
    if (tasks.length > HARD_TASK_CEILING) {
      throw new Error(`CoordinatorSwarm.run: tasks length ${tasks.length} exceeds hard ceiling ${HARD_TASK_CEILING}`);
    }
    for (const t of tasks) SwarmTaskSchema.parse(t);
    const maxC = opts.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY;
    if (!Number.isFinite(maxC) || maxC < 1) {
      throw new Error("CoordinatorSwarm.run: maxConcurrency must be a positive finite integer");
    }

    const t0 = Date.now();
    const subResults: SwarmSubResult<O>[] = new Array(tasks.length);

    // Bounded-concurrency runner: simple chunked Promise.all (deterministic).
    for (let chunkStart = 0; chunkStart < tasks.length; chunkStart += maxC) {
      const chunk = tasks.slice(chunkStart, chunkStart + maxC);
      const settled = await Promise.all(chunk.map(async (task, i) => {
        const idx = chunkStart + i;
        const start = Date.now();
        try {
          const output = await Promise.resolve(runner(task));
          return { idx, sub: { id: task.id, ok: true, output, durationMs: Date.now() - start } satisfies SwarmSubResult<O> };
        } catch (e) {
          return { idx, sub: {
            id: task.id, ok: false,
            error: e instanceof Error ? e.message : String(e),
            durationMs: Date.now() - start,
          } satisfies SwarmSubResult<O> };
        }
      }));
      for (const { idx, sub } of settled) subResults[idx] = sub;
    }

    const totalDurationMs = Date.now() - t0;
    const succeeded = subResults.filter((r) => r.ok).length;
    const failed = subResults.length - succeeded;

    let synthesized: S | undefined;
    if (opts.synthesizer) {
      synthesized = await Promise.resolve(opts.synthesizer(subResults));
    }

    return {
      subResults,
      synthesized,
      summary: {
        total: subResults.length,
        succeeded,
        failed,
        totalDurationMs,
        avgDurationMs: subResults.length === 0 ? 0 : totalDurationMs / subResults.length,
      },
    };
  }

  /** Filter to only successful sub-results. */
  static successes<O>(result: SwarmRunResult<O, unknown>): SwarmSubResult<O>[] {
    return result.subResults.filter((r) => r.ok);
  }

  /** Filter to only failed sub-results. */
  static failures<O>(result: SwarmRunResult<O, unknown>): SwarmSubResult<O>[] {
    return result.subResults.filter((r) => !r.ok);
  }
}

export const coordinatorSwarmEngine = CoordinatorSwarmEngine;
