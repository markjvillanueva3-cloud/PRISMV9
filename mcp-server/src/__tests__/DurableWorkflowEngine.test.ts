/**
 * DurableWorkflowEngine tests — U-HAGI01.  Asserts crash-resumable semantics:
 * skip-completed-on-replay, retry-up-to-maxAttempts, terminal-states are
 * sticky, pause/resume round-trips, deterministic synthesizer output.
 */
import { describe, it, expect } from "vitest";
import {
  DurableWorkflowEngine,
  type WorkflowSpec,
  type WorkflowState,
} from "../engines/DurableWorkflowEngine.js";

const ISO = "2026-05-24T13:00:00.000Z";

const trivialSpec = (): WorkflowSpec<number, number> => ({
  workflow_id: "wf_1", kind: "demo", input: 10,
  steps: [
    { step_id: "double", run: ({ workflowInput }: any) => workflowInput * 2 },
    { step_id: "plus3",  run: ({ priorOutputs }: any) => priorOutputs[0] + 3 },
    { step_id: "neg",    run: ({ priorOutputs }: any) => -priorOutputs[1] },
  ],
  synthesize: (outs) => outs[outs.length - 1] as number,
});

describe("DurableWorkflowEngine.initial", () => {
  it("creates a pending state with one step record per spec step", () => {
    const s = DurableWorkflowEngine.initial(trivialSpec(), ISO);
    expect(s.status).toBe("pending");
    expect(s.steps).toHaveLength(3);
    expect(s.steps.every((step) => step.status === "pending")).toBe(true);
    expect(s.steps.every((step) => step.attempt === 0)).toBe(true);
    expect(s.workflow_id).toBe("wf_1");
  });

  it("throws on empty steps (failure mode)", () => {
    expect(() => DurableWorkflowEngine.initial({
      ...trivialSpec(), steps: [],
    } as never, ISO)).toThrow();
  });

  it("throws on duplicate step_id (adversarial)", () => {
    expect(() => DurableWorkflowEngine.initial({
      ...trivialSpec(),
      steps: [
        { step_id: "x", run: () => 1 },
        { step_id: "x", run: () => 2 },
      ],
    } as never, ISO)).toThrow(/duplicate/);
  });

  it("throws when step count exceeds ceiling 100 (boundary)", () => {
    const big = Array.from({ length: 101 }, (_, i) => ({ step_id: `s${i}`, run: () => i }));
    expect(() => DurableWorkflowEngine.initial({
      ...trivialSpec(), steps: big,
    } as never, ISO)).toThrow(/100/);
  });
});

describe("DurableWorkflowEngine.advance — happy path", () => {
  it("runs all 3 steps in order; final result = synthesize(outputs)", async () => {
    const spec = trivialSpec();
    const s0 = DurableWorkflowEngine.initial(spec, ISO);
    const s1 = await DurableWorkflowEngine.advance(spec, s0);
    // double(10)=20 → plus3(20)=23 → neg(23)=-23 → result = -23
    expect(s1.status).toBe("completed");
    expect(s1.result).toBe(-23);
    expect(s1.steps[0].output).toBe(20);
    expect(s1.steps[1].output).toBe(23);
    expect(s1.steps[2].output).toBe(-23);
    expect(s1.steps.every((step) => step.status === "completed")).toBe(true);
  });

  it("captures attempt counts per step (each attempted exactly once)", async () => {
    const spec = trivialSpec();
    const s0 = DurableWorkflowEngine.initial(spec, ISO);
    const s1 = await DurableWorkflowEngine.advance(spec, s0);
    expect(s1.steps.every((step) => step.attempt === 1)).toBe(true);
  });
});

describe("DurableWorkflowEngine.advance — replay / resume", () => {
  it("skips already-completed steps on replay (no double-execution)", async () => {
    let doubleCount = 0;
    const spec: WorkflowSpec<number, number> = {
      workflow_id: "wf_replay", kind: "demo", input: 5,
      steps: [
        { step_id: "double", run: ({ workflowInput }: any) => { doubleCount += 1; return workflowInput * 2; } },
        { step_id: "plus1",  run: ({ priorOutputs }: any) => priorOutputs[0] + 1 },
      ],
      synthesize: (outs) => outs[outs.length - 1] as number,
    };
    const s0 = DurableWorkflowEngine.initial(spec, ISO);
    const s1 = await DurableWorkflowEngine.advance(spec, s0);
    expect(s1.status).toBe("completed");
    expect(doubleCount).toBe(1);
    // Replay from the completed state should NOT re-run step "double".
    const s2 = await DurableWorkflowEngine.advance(spec, s1);
    expect(doubleCount).toBe(1); // unchanged
    expect(s2.status).toBe("completed");
  });

  it("resumes from a partially-completed mid-state", async () => {
    let plus1Count = 0;
    const spec: WorkflowSpec<number, number> = {
      workflow_id: "wf_mid", kind: "demo", input: 7,
      steps: [
        { step_id: "double", run: ({ workflowInput }: any) => workflowInput * 2 },
        { step_id: "plus1",  run: ({ priorOutputs }: any) => { plus1Count += 1; return priorOutputs[0] + 1; } },
      ],
      synthesize: (outs) => outs[outs.length - 1] as number,
    };
    // Synthesize a state where step 0 completed but step 1 is pending.
    const partial: WorkflowState = {
      workflow_id: "wf_mid", kind: "demo", status: "running",
      created_at: ISO, updated_at: ISO,
      steps: [
        { step_id: "double", status: "completed", attempt: 1, output: 14 },
        { step_id: "plus1",  status: "pending",   attempt: 0 },
      ],
    };
    const s1 = await DurableWorkflowEngine.advance(spec, partial);
    expect(s1.status).toBe("completed");
    expect(s1.result).toBe(15); // 14 + 1
    expect(plus1Count).toBe(1);
  });
});

describe("DurableWorkflowEngine.advance — retry / failure", () => {
  it("retries up to maxAttempts then transitions workflow to failed", async () => {
    let attempts = 0;
    const spec: WorkflowSpec<number, number> = {
      workflow_id: "wf_fail", kind: "demo", input: 1,
      steps: [
        { step_id: "always_fail", maxAttempts: 2, run: () => { attempts += 1; throw new Error("boom"); } },
      ],
      synthesize: (outs) => outs[0] as number,
    };
    let state = DurableWorkflowEngine.initial(spec, ISO);
    state = await DurableWorkflowEngine.advance(spec, state); // attempt 1 → pending (retry)
    expect(state.status).toBe("running");
    state = await DurableWorkflowEngine.advance(spec, state); // attempt 2 → fail (terminal)
    expect(state.status).toBe("failed");
    expect(attempts).toBe(2);
    expect(state.failure).toContain("boom");
  });

  it("successful retry after one failure produces completed", async () => {
    let i = 0;
    const spec: WorkflowSpec<number, number> = {
      workflow_id: "wf_retry_ok", kind: "demo", input: 1,
      steps: [
        { step_id: "flaky", maxAttempts: 3, run: () => {
          i += 1;
          if (i < 2) throw new Error("transient");
          return 42;
        } },
      ],
      synthesize: (outs) => outs[0] as number,
    };
    let state = DurableWorkflowEngine.initial(spec, ISO);
    state = await DurableWorkflowEngine.advance(spec, state); // attempt 1 fails → retry
    state = await DurableWorkflowEngine.advance(spec, state); // attempt 2 succeeds
    expect(state.status).toBe("completed");
    expect(state.result).toBe(42);
  });
});

describe("DurableWorkflowEngine — pause / resume / cancel", () => {
  it("pause → status:paused; advance() is a no-op on paused", async () => {
    const spec = trivialSpec();
    const s0 = DurableWorkflowEngine.initial(spec, ISO);
    const paused = DurableWorkflowEngine.pause(s0, ISO);
    expect(paused.status).toBe("paused");
    const stillPaused = await DurableWorkflowEngine.advance(spec, paused);
    expect(stillPaused.status).toBe("paused"); // no progress
  });

  it("resume → status:running; subsequent advance executes the workflow", async () => {
    const spec = trivialSpec();
    const s0 = DurableWorkflowEngine.initial(spec, ISO);
    const paused = DurableWorkflowEngine.pause(s0, ISO);
    const resumed = DurableWorkflowEngine.resume(paused, ISO);
    expect(resumed.status).toBe("running");
    const done = await DurableWorkflowEngine.advance(spec, resumed);
    expect(done.status).toBe("completed");
  });

  it("cancel → terminal; cannot be resumed", () => {
    const spec = trivialSpec();
    const s0 = DurableWorkflowEngine.initial(spec, ISO);
    const cancelled = DurableWorkflowEngine.cancel(s0, "operator decision", ISO);
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.failure).toContain("operator decision");
    expect(() => DurableWorkflowEngine.resume(cancelled, ISO)).toThrow();
    expect(() => DurableWorkflowEngine.cancel(cancelled, "again", ISO)).toThrow();
  });

  it("cannot pause a completed workflow", async () => {
    const spec = trivialSpec();
    const s0 = DurableWorkflowEngine.initial(spec, ISO);
    const done = await DurableWorkflowEngine.advance(spec, s0);
    expect(() => DurableWorkflowEngine.pause(done, ISO)).toThrow();
  });
});

describe("DurableWorkflowEngine — guards", () => {
  it("advance rejects mismatched workflow_id (corruption guard)", async () => {
    const spec = trivialSpec();
    const s0 = DurableWorkflowEngine.initial(spec, ISO);
    const bad: WorkflowState = { ...s0, workflow_id: "different_id" };
    await expect(DurableWorkflowEngine.advance(spec, bad)).rejects.toThrow(/mismatch/);
  });

  it("advance rejects step-count drift between spec and state", async () => {
    const spec = trivialSpec();
    const s0 = DurableWorkflowEngine.initial(spec, ISO);
    const bad: WorkflowState = { ...s0, steps: s0.steps.slice(0, 1) };
    await expect(DurableWorkflowEngine.advance(spec, bad)).rejects.toThrow(/drift/);
  });

  it("renderState includes status + per-step status lines", async () => {
    const spec = trivialSpec();
    const s0 = DurableWorkflowEngine.initial(spec, ISO);
    const md = DurableWorkflowEngine.renderState(s0);
    expect(md).toContain("PENDING");
    expect(md).toContain("wf_1");
    expect(md).toContain("double");
    expect(md).toContain("plus3");
    expect(md).toContain("neg");
  });
});
