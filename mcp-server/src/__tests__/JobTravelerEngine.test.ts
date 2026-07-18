/**
 * JobTravelerEngine.test.ts -- CLOSE-THE-LOOPS-MS0 (slot:india)
 *
 * Covers the traveler lifecycle (create -> start -> complete) AND the new
 * CLOSE-THE-LOOPS outcome emit on completeStep. R9: the emit-fires + emit-never-
 * throws assertions prove the learning-loop wiring is live and that a down bus
 * can never break shop-floor traveler progress.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { jobTravelerEngine } from "../engines/JobTravelerEngine.js";
import { outcomeTraceEngine } from "../engines/OutcomeTraceEngine.js";

afterEach(() => vi.restoreAllMocks());

function newTraveler(jobId: string, steps = 1) {
  const stepDefs = [];
  for (let i = 1; i <= steps; i++) {
    stepDefs.push({ step_number: i, operation: `op${i}`, machine_id: "VMC-02", workcenter: "wc1", description: `d${i}` });
  }
  return jobTravelerEngine.createTraveler({ job_id: jobId, steps: stepDefs as any });
}
const okRecord = { ok: true, experience_id: "x", reward_total: 0, edges_created: [], warnings: [] };

describe("JobTravelerEngine lifecycle", () => {
  it("createTraveler creates pending steps in order", () => {
    const steps = newTraveler("jt-create-1", 2);
    expect(steps.length).toBe(2);
    expect(steps[0].status).toBe("pending");
    expect(steps[0].step_number).toBe(1);
  });

  it("createTraveler throws on an empty step list", () => {
    expect(() => jobTravelerEngine.createTraveler({ job_id: "jt-empty", steps: [] as any })).toThrow(/routing step/i);
  });

  it("createTraveler throws on duplicate step numbers", () => {
    expect(() => jobTravelerEngine.createTraveler({
      job_id: "jt-dup",
      steps: [{ step_number: 1, operation: "a" }, { step_number: 1, operation: "b" }] as any,
    })).toThrow(/duplicate/i);
  });

  it("createTraveler throws when a traveler already exists for the job", () => {
    newTraveler("jt-twice", 1);
    expect(() => newTraveler("jt-twice", 1)).toThrow(/already exists/i);
  });

  it("startSetup transitions the step to 'setup'", () => {
    newTraveler("jt-setup", 1);
    const { step } = jobTravelerEngine.startSetup({ job_id: "jt-setup", step_number: 1, operator_id: "op-1" });
    expect(step.status).toBe("setup");
  });

  it("completeStep after a started step marks it 'complete'", () => {
    newTraveler("jt-complete", 1);
    jobTravelerEngine.startSetup({ job_id: "jt-complete", step_number: 1, operator_id: "op-1" });
    const { step } = jobTravelerEngine.completeStep({ job_id: "jt-complete", step_number: 1 } as any);
    expect(step.status).toBe("complete");
  });

  it("completeStep throws when the step was never started (pending)", () => {
    newTraveler("jt-pending", 1);
    expect(() => jobTravelerEngine.completeStep({ job_id: "jt-pending", step_number: 1 } as any)).toThrow(/setup|running|must be/i);
  });

  it("completeStep with skip marks the step 'skipped'", () => {
    newTraveler("jt-skip", 1);
    const { step } = jobTravelerEngine.completeStep({ job_id: "jt-skip", step_number: 1, skip: true } as any);
    expect(step.status).toBe("skipped");
  });

  it("completeStep records parts_complete and parts_scrapped", () => {
    newTraveler("jt-parts", 1);
    jobTravelerEngine.startSetup({ job_id: "jt-parts", step_number: 1, operator_id: "op-1" });
    const { step } = jobTravelerEngine.completeStep({ job_id: "jt-parts", step_number: 1, parts_complete: 4, parts_scrapped: 1 } as any);
    expect(step.parts_complete).toBe(4);
    expect(step.parts_scrapped).toBe(1);
  });

  it("getTraveler returns a summary for the job", () => {
    newTraveler("jt-summary", 2);
    const s = jobTravelerEngine.getTraveler("jt-summary");
    expect(s.job_id).toBe("jt-summary");
    expect(s.total_steps).toBe(2);
  });
});

describe("JobTravelerEngine CLOSE-THE-LOOPS outcome emit", () => {
  it("completeStep emits a 'traveler' DATA outcome record", () => {
    const spy = vi.spyOn(outcomeTraceEngine, "record").mockReturnValue(okRecord);
    newTraveler("jt-emit", 1);
    jobTravelerEngine.startSetup({ job_id: "jt-emit", step_number: 1, operator_id: "op-1" });
    jobTravelerEngine.completeStep({ job_id: "jt-emit", step_number: 1, parts_complete: 3 } as any);
    // calls[0] = createTraveler emit (traveler_create), calls[1] = completeStep emit (traveler_step_complete)
    expect(spy).toHaveBeenCalledTimes(2);
    const arg = spy.mock.calls[1][0] as any;
    expect(arg.domain).toBe("traveler");
    expect(arg.outcome_event_id).toBe("traveler_step_complete");
    expect(arg.action_record.engine_name).toBe("JobTravelerEngine");
    expect(arg.prediction_id).toBe("jt-emit-step-1");
  });

  it("a thrown emit never breaks traveler progress (fire-and-forget)", () => {
    vi.spyOn(outcomeTraceEngine, "record").mockImplementation(() => { throw new Error("bus down"); });
    newTraveler("jt-emit-fail", 1);
    jobTravelerEngine.startSetup({ job_id: "jt-emit-fail", step_number: 1, operator_id: "op-1" });
    let status = "";
    expect(() => { status = jobTravelerEngine.completeStep({ job_id: "jt-emit-fail", step_number: 1 } as any).step.status; }).not.toThrow();
    expect(status).toBe("complete");
  });

  // U-INDIA-OUTCOME-EMISSION-4-PIPELINES: createTraveler also emits (traveler_create)
  it("createTraveler emits a 'traveler' DATA outcome record with domain=traveler and event=traveler_create", () => {
    const spy = vi.spyOn(outcomeTraceEngine, "record").mockReturnValue(okRecord);
    newTraveler("jt-create-emit", 2);
    expect(spy).toHaveBeenCalled();
    const arg = spy.mock.calls[0][0] as any;
    expect(arg.domain).toBe("traveler");
    expect(arg.outcome_event_id).toBe("traveler_create");
    expect(arg.action_record.engine_name).toBe("JobTravelerEngine");
    // prediction_id encodes the job_id so outcomes can be paired by job
    expect(arg.prediction_id).toBe("jt-create-emit-create");
  });

  it("createTraveler emit payload carries step_count as an adapted numeric feature", () => {
    const spy = vi.spyOn(outcomeTraceEngine, "record").mockReturnValue(okRecord);
    newTraveler("jt-create-adapted", 3);
    const arg = spy.mock.calls[0][0] as any;
    // adapted must be numeric only (schema constraint); step_count is the signal value
    expect(arg.action_record.adapted.step_count).toBe(3);
  });

  it("a thrown emit on createTraveler never breaks traveler creation (fire-and-forget)", () => {
    vi.spyOn(outcomeTraceEngine, "record").mockImplementation(() => { throw new Error("bus down"); });
    // must not throw despite bus failure; returned steps must be valid
    let steps: unknown[] = [];
    expect(() => { steps = newTraveler("jt-create-emit-fail", 2); }).not.toThrow();
    expect(steps).toHaveLength(2);
  });
});
