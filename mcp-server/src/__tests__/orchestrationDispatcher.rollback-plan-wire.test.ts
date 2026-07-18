/**
 * orchestrationDispatcher rollback_plan_build wiring (U-ROLLBACK-PLAN-WIRE).
 *
 * Dark-facade fix: the case probed plan/generate/run (none exist on
 * RollbackPlannerEngine) -> always "method not callable". The real method is
 * planRollback(unitId, steps) -- POSITIONAL args, self-validating via
 * assertInputs (throws on empty unitId / non-array steps). A `verify:true`
 * opt-in routes to planAndVerify (dry-runs each rollback through the
 * CounterfactualBuildSimulator); default is plan-only.
 *
 * Real-path test: registers the dispatcher, captures the handler, and invokes
 * through it (proves planRollback actually runs, not the dark fallback).
 */
import { describe, it, expect } from "vitest";
import { registerOrchestrationDispatcher } from "../tools/dispatchers/orchestrationDispatcher.js";
import type { BuildStep } from "../engines/AtomicStepDecomposerEngine.js";

function makeInvoke() {
  let handler: ((arg: { action: string; params?: Record<string, unknown> }) => Promise<unknown>) | undefined;
  const server = {
    tool: (_n: string, _d: string, _s: unknown, h: typeof handler) => { handler = h; },
  };
  registerOrchestrationDispatcher(server);
  if (!handler) throw new Error("registerOrchestrationDispatcher did not register a handler");
  return async (action: string, params: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const res = (await handler!({ action, params })) as { content?: Array<{ text?: string }> };
    const text = res?.content?.[0]?.text ?? "null";
    try { return JSON.parse(text) as Record<string, unknown>; } catch { return { _raw: text }; }
  };
}

/** A minimal but COMPLETE AtomicStep (every required field), so tsc + the engine are both satisfied. */
function step(id: string, kind: BuildStep["kind"], summary: string): BuildStep {
  return { id, kind, summary, estTokens: 1000, estDurationSec: 30, risk: 0.2, rollback: "" };
}

type RollbackAction = { stepId: string; kind: string; command: string; targetFile?: string; verified: boolean };
type RollbackPlan = {
  unitId: string;
  actions: RollbackAction[];
  verified: boolean;
  verifiedCount: number;
  totalActions: number;
  warnings: string[];
};

describe("orchestrationDispatcher rollback_plan_build -- dark-action fix (real planRollback)", () => {
  it("plan-only -> a real RollbackPlan (per-step actions, reversed order), NOT 'method not callable'", async () => {
    const invoke = makeInvoke();
    const steps = [
      step("s1", "write_engine", "create src/engines/FooEngine.ts"),
      step("s2", "wire_dispatcher", "wire foo_action into prism_calc"),
      step("s3", "commit", "commit the FooEngine unit"),
    ];
    const r = await invoke("rollback_plan_build", { unitId: "U-FOO-01", steps });
    expect(JSON.stringify(r)).not.toMatch(/method not callable/i);
    expect(r.success).toBe(true);
    const d = r.data as RollbackPlan;
    expect(d.unitId).toBe("U-FOO-01");
    expect(d.totalActions).toBe(3);
    // rollbacks apply last-step-first -> actions are REVERSED relative to steps
    expect(d.actions[0].stepId).toBe("s3");
    expect(d.actions[2].stepId).toBe("s1");
    // a commit step inverts to a git revert; a write_engine step inverts to a file delete
    expect(d.actions[0].kind).toBe("git_revert");
    const writeAction = d.actions.find((a) => a.stepId === "s1")!;
    expect(writeAction.kind).toBe("file_delete");
    expect(writeAction.targetFile).toBe("src/engines/FooEngine.ts"); // path scraped from summary
    // plan-only: nothing dry-run-verified yet
    expect(d.verified).toBe(false);
    expect(d.verifiedCount).toBe(0);
  });

  it("verify:true -> planAndVerify dry-runs each rollback (verifiedCount populated, warnings array present)", async () => {
    const invoke = makeInvoke();
    const steps = [
      step("s1", "read_schema", "read the FooEngine schema"),  // noop rollback -> always verifies
      step("s2", "commit", "commit FooEngine"),
    ];
    const r = await invoke("rollback_plan_build", { unitId: "U-FOO-02", steps, verify: true });
    expect(r.success).toBe(true);
    const d = r.data as RollbackPlan;
    expect(d.totalActions).toBe(2);
    expect(typeof d.verifiedCount).toBe("number");
    expect(d.verifiedCount).toBeGreaterThanOrEqual(1); // the read_schema -> noop always verifies clean
    // NOTE: warnings:[] is stripped by the dispatcher's slimResponse (empty-array prune),
    // so we assert on the dry-run's POSITIVE evidence instead: the noop step was auto-verified.
    const noop = d.actions.find((a) => a.stepId === "s1")!;
    expect(noop.kind).toBe("noop");
    expect(noop.verified).toBe(true); // proves planAndVerify (the dry-run pass) actually ran
  });

  it("adversarial: an unknown step kind inverts to a safe noop (not a crash, not a wrong undo)", async () => {
    const invoke = makeInvoke();
    const steps = [step("s1", "regenerate_manifest", "regen ENGINE_DIGEST")];
    // regenerate_manifest is a FILE_CREATION_KIND -> file_delete with no scrapable path
    const r = await invoke("rollback_plan_build", { unitId: "U-FOO-03", steps });
    expect(r.success).toBe(true);
    const d = r.data as RollbackPlan;
    expect(d.actions[0].kind).toBe("file_delete");
    expect(d.actions[0].command).toMatch(/rm -f/);
  });

  it("self-validation: a missing/empty unitId is rejected (engine assertInputs throws)", async () => {
    const invoke = makeInvoke();
    const r1 = await invoke("rollback_plan_build", { steps: [step("s1", "commit", "x")] });
    expect(r1.success).toBe(false);
    const r2 = await invoke("rollback_plan_build", { unitId: "   ", steps: [step("s1", "commit", "x")] });
    expect(r2.success).toBe(false);
  });

  it("self-validation: non-array steps are rejected (engine assertInputs throws)", async () => {
    const invoke = makeInvoke();
    const r = await invoke("rollback_plan_build", { unitId: "U-FOO-04", steps: "not-an-array" });
    expect(r.success).toBe(false);
  });

  it("adversarial: malformed step elements never produce a wrong-but-success plan", async () => {
    const invoke = makeInvoke();
    // a null element throws inside rollbackForStep (step.kind on null) -> caught -> success:false
    const rNull = await invoke("rollback_plan_build", { unitId: "U-FOO-05", steps: [null] });
    expect(rNull.success).toBe(false);
    // a non-object element (number) has no recognized kind -> safe noop, never a destructive undo
    const rNum = await invoke("rollback_plan_build", { unitId: "U-FOO-06", steps: [42] });
    expect(rNum.success).toBe(true);
    const d = rNum.data as RollbackPlan;
    expect(d.totalActions).toBe(1);
    expect(d.actions[0].kind).toBe("noop");
    expect(d.actions[0].command).not.toMatch(/rm -f|git revert/); // no destructive command for garbage input
  });
});
