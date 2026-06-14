/**
 * BatchDeliverableEngine — U-HAGI05 multi-customer batch deliverable production.
 *
 * Wraps CoordinatorSwarmEngine (U-HAGI03) with a batch-deliverable contract
 * suited to PrismApp-scale: a single operator request enumerates N customers
 * (or N parts, N quotes, N program-generations) and the engine fans out to
 * a per-deliverable runner, then synthesizes a roll-up: per-deliverable
 * verdict + aggregate totals + failure punch-list.
 *
 * Pure-core: caller supplies the runner (e.g. quote estimator, post
 * processor, audit runner).  Engine wires concurrency, fail-soft, and the
 * roll-up shape used by the operator UI.
 *
 * @module engines/BatchDeliverableEngine
 */

import { z } from "zod";
import { CoordinatorSwarmEngine, type SwarmSubResult, type SwarmTask } from "./CoordinatorSwarmEngine.js";

export const BatchDeliverableSchema = z.object({
  deliverable_id: z.string().min(1).max(120),
  customer_id: z.string().min(1).max(120),
  kind: z.enum(["quote", "program", "audit", "report", "custom"]),
  payload: z.unknown(),
});
export type BatchDeliverable = z.infer<typeof BatchDeliverableSchema>;

export const BatchRequestSchema = z.object({
  batch_id: z.string().min(1).max(120),
  requested_by: z.string().min(1).max(100),
  deliverables: z.array(BatchDeliverableSchema).min(1).max(300),
  max_concurrency: z.number().int().min(1).max(50).default(10),
  requested_at: z.string().min(1),
});
export type BatchRequest = z.infer<typeof BatchRequestSchema>;

export interface BatchDeliverableOutcome<O> {
  deliverable_id: string;
  customer_id: string;
  kind: BatchDeliverable["kind"];
  ok: boolean;
  output?: O;
  error?: string;
  durationMs: number;
}

export interface BatchRollup<O> {
  batch_id: string;
  requested_by: string;
  requested_at: string;
  completed_at: string;
  totalDurationMs: number;
  total: number;
  succeeded: number;
  failed: number;
  byKind: Record<string, { total: number; succeeded: number; failed: number }>;
  byCustomer: Record<string, { total: number; succeeded: number; failed: number }>;
  outcomes: BatchDeliverableOutcome<O>[];
  failures: BatchDeliverableOutcome<O>[];
}

export type BatchRunner<O> = (deliverable: BatchDeliverable) => Promise<O> | O;

export class BatchDeliverableEngine {
  static validateDeliverable(d: unknown): BatchDeliverable { return BatchDeliverableSchema.parse(d); }
  static validateRequest(r: unknown): BatchRequest { return BatchRequestSchema.parse(r); }

  /**
   * Run a batch request through the swarm coordinator and synthesize a
   * roll-up keyed by deliverable kind + customer id.  Never throws on a
   * single-deliverable failure — failures land in the failures[] punch list.
   */
  static async run<O>(
    request: BatchRequest,
    runner: BatchRunner<O>,
    completed_at: string = new Date().toISOString(),
  ): Promise<BatchRollup<O>> {
    BatchRequestSchema.parse(request);
    if (typeof runner !== "function") {
      throw new Error("BatchDeliverable.run: runner must be a function");
    }
    // Index deliverables by id for O(1) reattach after swarm.
    const byId = new Map<string, BatchDeliverable>();
    for (const d of request.deliverables) byId.set(d.deliverable_id, d);
    if (byId.size !== request.deliverables.length) {
      throw new Error("BatchDeliverable.run: duplicate deliverable_id in batch");
    }

    const swarmTasks: SwarmTask[] = request.deliverables.map((d) => ({
      id: d.deliverable_id,
      payload: d.payload,
    }));

    const swarmResult = await CoordinatorSwarmEngine.run<O>(
      swarmTasks,
      async (task) => {
        const deliv = byId.get(task.id);
        if (!deliv) throw new Error(`unknown deliverable_id ${task.id}`);
        return await Promise.resolve(runner(deliv));
      },
      { maxConcurrency: request.max_concurrency },
    );

    const outcomes: BatchDeliverableOutcome<O>[] = swarmResult.subResults.map((sub: SwarmSubResult<O>) => {
      const deliv = byId.get(sub.id);
      if (!deliv) throw new Error(`internal: sub-result id ${sub.id} not in batch`);
      return {
        deliverable_id: sub.id,
        customer_id: deliv.customer_id,
        kind: deliv.kind,
        ok: sub.ok,
        output: sub.output,
        error: sub.error,
        durationMs: sub.durationMs,
      };
    });

    const byKind: BatchRollup<O>["byKind"] = {};
    const byCustomer: BatchRollup<O>["byCustomer"] = {};
    for (const o of outcomes) {
      if (!byKind[o.kind]) byKind[o.kind] = { total: 0, succeeded: 0, failed: 0 };
      if (!byCustomer[o.customer_id]) byCustomer[o.customer_id] = { total: 0, succeeded: 0, failed: 0 };
      byKind[o.kind].total += 1;
      byCustomer[o.customer_id].total += 1;
      if (o.ok) {
        byKind[o.kind].succeeded += 1;
        byCustomer[o.customer_id].succeeded += 1;
      } else {
        byKind[o.kind].failed += 1;
        byCustomer[o.customer_id].failed += 1;
      }
    }

    return {
      batch_id: request.batch_id,
      requested_by: request.requested_by,
      requested_at: request.requested_at,
      completed_at,
      totalDurationMs: swarmResult.summary.totalDurationMs,
      total: outcomes.length,
      succeeded: swarmResult.summary.succeeded,
      failed: swarmResult.summary.failed,
      byKind,
      byCustomer,
      outcomes,
      failures: outcomes.filter((o) => !o.ok),
    };
  }

  /** Render a batch roll-up as an operator-friendly audit summary. */
  static renderRollup<O>(rollup: BatchRollup<O>): string {
    const kindLines = Object.entries(rollup.byKind)
      .map(([k, v]) => `  ${k}: ${v.succeeded}/${v.total} ok (${v.failed} failed)`)
      .join("\n");
    const custLines = Object.entries(rollup.byCustomer)
      .map(([c, v]) => `  ${c}: ${v.succeeded}/${v.total} ok (${v.failed} failed)`)
      .join("\n");
    const failLines = rollup.failures.length === 0
      ? "  (no failures)"
      : rollup.failures.map((f) => `  ${f.deliverable_id} (${f.customer_id}, ${f.kind}): ${f.error ?? "?"}`).join("\n");
    return [
      `[BATCH ${rollup.batch_id}] requested_by=${rollup.requested_by} at=${rollup.requested_at}`,
      `  total=${rollup.total} ok=${rollup.succeeded} failed=${rollup.failed} elapsed=${rollup.totalDurationMs}ms`,
      `by kind:`,
      kindLines,
      `by customer:`,
      custLines,
      `failures:`,
      failLines,
    ].join("\n");
  }
}

export const batchDeliverableEngine = BatchDeliverableEngine;
