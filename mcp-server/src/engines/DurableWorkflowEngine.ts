/**
 * DurableWorkflowEngine — U-HAGI01 durable workflow primitive (Voxyz L9).
 *
 * Pure-core state machine for crash-resumable workflows in the Temporal /
 * Inngest / Restate class.  A workflow is a deterministic sequence of steps;
 * each step's result is captured in the workflow's append-only log so that
 * a replay (after crash or operator pause/resume) skips already-completed
 * steps and replays only the unfinished tail.
 *
 * The engine is I/O-free; callers wire persistence (load/save) and step
 * execution.  Determinism contract: step ids must be stable across replays;
 * step results must be JSON-serializable; the caller is responsible for
 * making the step's *side-effect* idempotent if the step writes to an
 * external system.
 *
 * @module engines/DurableWorkflowEngine
 */

import { z } from "zod";

export const StepRecordSchema = z.object({
  step_id: z.string().min(1).max(120),
  status: z.enum(["pending", "running", "completed", "failed"]),
  attempt: z.number().int().min(0).max(50),
  output: z.unknown().optional(),
  error: z.string().max(2000).optional(),
  started_at: z.string().optional(),
  finished_at: z.string().optional(),
});
export type StepRecord = z.infer<typeof StepRecordSchema>;

export const WorkflowStateSchema = z.object({
  workflow_id: z.string().min(1).max(120),
  kind: z.string().min(1).max(120),
  status: z.enum(["pending", "running", "completed", "failed", "paused", "cancelled"]),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
  steps: z.array(StepRecordSchema),
  result: z.unknown().optional(),
  failure: z.string().max(2000).optional(),
});
export type WorkflowState = z.infer<typeof WorkflowStateSchema>;

export interface StepSpec<I, O> {
  step_id: string;
  /** Pure-deterministic-ish step: a successful re-run with the same input
   *  must produce a logically-equivalent output (idempotent side effect). */
  run: (input: I) => Promise<O> | O;
  /** Max attempts (incl. the first). Default 3. */
  maxAttempts?: number;
}

export interface WorkflowSpec<I, R> {
  workflow_id: string;
  kind: string;
  input: I;
  steps: ReadonlyArray<StepSpec<unknown, unknown>>;
  /** Synthesizer maps the full ordered step-outputs list into the workflow's
   *  final result.  Receives outputs[] aligned to steps[].  */
  synthesize: (outputs: unknown[]) => R | Promise<R>;
}

const HARD_STEP_CEILING = 100;

export class DurableWorkflowEngine {
  static validateState(s: unknown): WorkflowState { return WorkflowStateSchema.parse(s); }
  static validateStep(s: unknown): StepRecord { return StepRecordSchema.parse(s); }

  /** Build the initial state for a brand-new workflow (no steps run yet). */
  static initial<I, R>(
    spec: WorkflowSpec<I, R>,
    at: string = new Date().toISOString(),
  ): WorkflowState {
    if (!Array.isArray(spec.steps) || spec.steps.length === 0) {
      throw new Error("DurableWorkflow.initial: at least one step required");
    }
    if (spec.steps.length > HARD_STEP_CEILING) {
      throw new Error(`DurableWorkflow.initial: step count ${spec.steps.length} exceeds ceiling ${HARD_STEP_CEILING}`);
    }
    const seenIds = new Set<string>();
    for (const s of spec.steps) {
      if (!s.step_id) throw new Error("DurableWorkflow.initial: step_id required");
      if (seenIds.has(s.step_id)) throw new Error(`DurableWorkflow.initial: duplicate step_id ${s.step_id}`);
      seenIds.add(s.step_id);
    }
    const state: WorkflowState = {
      workflow_id: spec.workflow_id,
      kind: spec.kind,
      status: "pending",
      created_at: at,
      updated_at: at,
      steps: spec.steps.map((s) => ({
        step_id: s.step_id,
        status: "pending",
        attempt: 0,
      })),
    };
    return WorkflowStateSchema.parse(state);
  }

  /**
   * Advance the workflow from its current state, executing each unfinished
   * step in order.  If a step fails up to maxAttempts, the workflow status
   * flips to "failed" and execution stops.  Resumable: a re-call with a
   * partially-completed state skips completed steps.
   */
  static async advance<I, R>(
    spec: WorkflowSpec<I, R>,
    prior: WorkflowState,
    at: () => string = () => new Date().toISOString(),
  ): Promise<WorkflowState> {
    WorkflowStateSchema.parse(prior);
    if (prior.workflow_id !== spec.workflow_id) {
      throw new Error(`DurableWorkflow.advance: workflow_id mismatch ${prior.workflow_id} vs ${spec.workflow_id}`);
    }
    if (prior.steps.length !== spec.steps.length) {
      throw new Error("DurableWorkflow.advance: step count drift between spec and state");
    }
    if (prior.status === "completed" || prior.status === "failed" || prior.status === "cancelled") {
      return prior; // terminal — no-op
    }
    if (prior.status === "paused") {
      return prior; // paused workflows must be resumed explicitly via resume()
    }

    // Copy steps to mutate.
    const steps: StepRecord[] = prior.steps.map((s) => ({ ...s }));
    let cursor = steps.findIndex((s) => s.status !== "completed");
    if (cursor === -1) {
      // All steps already completed; synthesize result.
      return await DurableWorkflowEngine.finalize(spec, steps, at());
    }

    for (; cursor < steps.length; cursor += 1) {
      const stepSpec = spec.steps[cursor];
      const rec = steps[cursor];
      if (rec.status === "completed") continue;
      const maxAttempts = stepSpec.maxAttempts ?? 3;
      const startedAt = at();
      rec.status = "running";
      rec.attempt += 1;
      rec.started_at = startedAt;
      try {
        // Pure-core step contract: caller supplies a function that produces an
        // output deterministically given the workflow's prior outputs.
        const priorOutputs = steps.slice(0, cursor).map((s) => s.output);
        const out = await Promise.resolve(stepSpec.run({
          workflowInput: spec.input,
          priorOutputs,
        } as never));
        rec.status = "completed";
        rec.output = out;
        rec.finished_at = at();
        rec.error = undefined;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        rec.error = msg;
        rec.finished_at = at();
        if (rec.attempt >= maxAttempts) {
          rec.status = "failed";
          return WorkflowStateSchema.parse({
            ...prior,
            status: "failed",
            steps,
            failure: `step ${rec.step_id} failed after ${rec.attempt} attempts: ${msg}`,
            updated_at: at(),
          });
        }
        // Retry policy: re-mark as pending so next advance() retries.
        rec.status = "pending";
        return WorkflowStateSchema.parse({
          ...prior,
          status: "running",
          steps,
          updated_at: at(),
        });
      }
    }

    // All steps now completed.
    return await DurableWorkflowEngine.finalize(spec, steps, at());
  }

  /** Pause a running workflow.  Operator can resume later via resume(). */
  static pause(state: WorkflowState, at: string = new Date().toISOString()): WorkflowState {
    if (state.status === "completed" || state.status === "failed" || state.status === "cancelled") {
      throw new Error(`DurableWorkflow.pause: cannot pause from ${state.status}`);
    }
    return WorkflowStateSchema.parse({ ...state, status: "paused", updated_at: at });
  }

  /** Resume a paused workflow back to running so advance() picks it up. */
  static resume(state: WorkflowState, at: string = new Date().toISOString()): WorkflowState {
    if (state.status !== "paused") {
      throw new Error(`DurableWorkflow.resume: workflow not paused (status=${state.status})`);
    }
    return WorkflowStateSchema.parse({ ...state, status: "running", updated_at: at });
  }

  /** Cancel a workflow (terminal).  Cannot be resumed. */
  static cancel(state: WorkflowState, reason: string, at: string = new Date().toISOString()): WorkflowState {
    if (state.status === "completed" || state.status === "failed" || state.status === "cancelled") {
      throw new Error(`DurableWorkflow.cancel: cannot cancel from ${state.status}`);
    }
    return WorkflowStateSchema.parse({
      ...state, status: "cancelled", failure: `cancelled: ${reason}`, updated_at: at,
    });
  }

  private static async finalize<I, R>(
    spec: WorkflowSpec<I, R>,
    steps: StepRecord[],
    at: string,
  ): Promise<WorkflowState> {
    const outputs = steps.map((s) => s.output);
    const result = await Promise.resolve(spec.synthesize(outputs));
    return WorkflowStateSchema.parse({
      workflow_id: spec.workflow_id,
      kind: spec.kind,
      status: "completed",
      created_at: steps[0]?.started_at ?? at,
      updated_at: at,
      steps,
      result,
    });
  }

  /** Render a workflow state as an operator audit summary. */
  static renderState(s: WorkflowState): string {
    const lines = s.steps.map((step) => {
      const status = step.status.padEnd(9);
      const attempt = `(attempt ${step.attempt})`;
      const tail = step.error ? ` — ${step.error}` : "";
      return `  ${status} ${step.step_id} ${attempt}${tail}`;
    });
    return [
      `[${s.status.toUpperCase()}] workflow=${s.workflow_id} kind=${s.kind} updated=${s.updated_at}`,
      ...lines,
      s.failure ? `failure: ${s.failure}` : "",
    ].filter(Boolean).join("\n");
  }
}

export const durableWorkflowEngine = DurableWorkflowEngine;
