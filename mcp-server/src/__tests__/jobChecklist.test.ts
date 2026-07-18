/**
 * JobChecklistEngine tests -- QUOTING-TRAVELER/U-JOBCHECKLIST.
 *
 * Verifies the stateful per-employee check-off layer: seed-from-traveler,
 * check/uncheck round-trip, step-complete roll-up + event, and the
 * segregation-of-duties guards. Real reference-value asserts + >=3 failure
 * modes + adversarial inputs (R9). Steps are seeded from the real orchestrator
 * (round-trip composition), not a fabricated shape.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { jobChecklistEngine as eng } from "../engines/JobChecklistEngine.js";
import { travelerGenerationOrchestratorEngine } from "../engines/TravelerGenerationOrchestratorEngine.js";
import { eventBus } from "../engines/EventBus.js";
import type { GeneratedTravelerStep } from "../engines/TravelerGenerationOrchestratorEngine.js";

function genSteps(): GeneratedTravelerStep[] {
  return travelerGenerationOrchestratorEngine.generate({
    job_id: "JOB-CL-1",
    part_number: "TEST-1",
    material_iso_group: "P",
    features: [
      { id: "p1", type: "pocket", dimensions: { width_mm: 40, length_mm: 40, depth_mm: 10 } },
      { id: "b1", type: "bore", dimensions: { diameter_mm: 20, depth_mm: 25 }, tolerance_mm: 0.008 },
    ],
    stock: { x_mm: 80, y_mm: 80, z_mm: 20 },
    batch_size: 25,
    quoted_finish: "anodize",
  }).steps;
}

const JOB = "JOB-CL-1";

beforeEach(() => {
  eng.reset();
});

describe("JobChecklistEngine -- attach + roll-up", () => {
  it("seeds a checklist for every generated step with all items unchecked", () => {
    const steps = genSteps();
    const jc = eng.attachChecklists(JOB, steps);
    expect(jc.steps.length).toBe(steps.length);
    expect(jc.total_required).toBeGreaterThan(0);
    expect(jc.total_required_checked).toBe(0);
    expect(jc.pct_complete).toBe(0);
    for (const s of jc.steps) {
      expect(s.items.every((i) => i.checked === false)).toBe(true);
    }
  });

  it("throws attaching with no steps", () => {
    expect(() => eng.attachChecklists(JOB, [])).toThrow(/at least one step/);
  });

  it("throws attaching with empty job_id", () => {
    expect(() => eng.attachChecklists("", genSteps())).toThrow(/job_id is required/);
  });
});

describe("JobChecklistEngine -- check / uncheck round-trip", () => {
  function machiningStepSeq(): number {
    const steps = genSteps();
    eng.attachChecklists(JOB, steps);
    return steps.find((s) => s.department === "machining")!.seq;
  }

  it("checks an item and reflects it in the step + job roll-up", () => {
    const seq = machiningStepSeq();
    const before = eng.getStepChecklist(JOB, seq);
    const firstReq = before.items.find((i) => i.required)!;
    // an operator in the machining dept may check a machining item
    const after = eng.checkItem({
      job_id: JOB, step_seq: seq, item_id: firstReq.id,
      employee_id: "EMP-1", employee_department: "machining", employee_role: "operator",
      note: "done",
    });
    const checked = after.items.find((i) => i.id === firstReq.id)!;
    expect(checked.checked).toBe(true);
    expect(checked.checked_by_employee_id).toBe("EMP-1");
    expect(checked.note).toBe("done");
    expect(after.required_checked).toBe(1);
    // job roll-up moved
    expect(eng.getJobChecklist(JOB).total_required_checked).toBe(1);
  });

  it("un-check reverts state; only the checker or a supervisor may un-check", () => {
    const seq = machiningStepSeq();
    const item = eng.getStepChecklist(JOB, seq).items.find((i) => i.required)!;
    eng.checkItem({ job_id: JOB, step_seq: seq, item_id: item.id, employee_id: "EMP-1", employee_department: "machining", employee_role: "operator" });
    // a different operator cannot un-check
    expect(() => eng.uncheckItem({ job_id: JOB, step_seq: seq, item_id: item.id, employee_id: "EMP-2", employee_department: "machining", employee_role: "operator" })).toThrow(/only EMP-1 or a supervisor/);
    // the checker can
    const reverted = eng.uncheckItem({ job_id: JOB, step_seq: seq, item_id: item.id, employee_id: "EMP-1", employee_department: "machining", employee_role: "operator" });
    expect(reverted.items.find((i) => i.id === item.id)!.checked).toBe(false);
    // a supervisor can un-check someone else's
    eng.checkItem({ job_id: JOB, step_seq: seq, item_id: item.id, employee_id: "EMP-1", employee_department: "machining", employee_role: "operator" });
    const supRevert = eng.uncheckItem({ job_id: JOB, step_seq: seq, item_id: item.id, employee_id: "BOSS", employee_role: "supervisor" });
    expect(supRevert.items.find((i) => i.id === item.id)!.checked).toBe(false);
  });

  it("double-check throws (already checked)", () => {
    const seq = machiningStepSeq();
    const item = eng.getStepChecklist(JOB, seq).items.find((i) => i.required)!;
    eng.checkItem({ job_id: JOB, step_seq: seq, item_id: item.id, employee_id: "EMP-1", employee_department: "machining", employee_role: "operator" });
    expect(() => eng.checkItem({ job_id: JOB, step_seq: seq, item_id: item.id, employee_id: "EMP-1", employee_department: "machining", employee_role: "operator" })).toThrow(/already checked/);
  });
});

describe("JobChecklistEngine -- segregation of duties", () => {
  it("rejects an out-of-department operator checking a step's item", () => {
    const steps = genSteps();
    eng.attachChecklists(JOB, steps);
    const machSeq = steps.find((s) => s.department === "machining")!.seq;
    const item = eng.getStepChecklist(JOB, machSeq).items.find((i) => i.required)!;
    // a shipping operator cannot check a machining item
    expect(() => eng.checkItem({
      job_id: JOB, step_seq: machSeq, item_id: item.id,
      employee_id: "SHIP-1", employee_department: "shipping", employee_role: "operator",
    })).toThrow(/cannot check items on a 'machining'/);
  });

  it("allows a supervisor to check ANY department's item", () => {
    const steps = genSteps();
    eng.attachChecklists(JOB, steps);
    const machSeq = steps.find((s) => s.department === "machining")!.seq;
    const item = eng.getStepChecklist(JOB, machSeq).items.find((i) => i.required)!;
    const after = eng.checkItem({
      job_id: JOB, step_seq: machSeq, item_id: item.id,
      employee_id: "LEAD-1", employee_department: "quality", employee_role: "supervisor",
    });
    expect(after.items.find((i) => i.id === item.id)!.checked).toBe(true);
  });

  it("FAIL-CLOSED: a non-supervisory actor with no resolvable department is rejected", () => {
    const steps = genSteps();
    eng.attachChecklists(JOB, steps);
    const machSeq = steps.find((s) => s.department === "machining")!.seq;
    const item = eng.getStepChecklist(JOB, machSeq).items.find((i) => i.required)!;
    // employee_id that resolves to no department (no override, not in EmployeeEngine)
    // + a non-supervisory role -> must be DENIED, not silently allowed.
    expect(() => eng.checkItem({
      job_id: JOB, step_seq: machSeq, item_id: item.id,
      employee_id: "GHOST-1", employee_role: "operator", // no employee_department
    })).toThrow(/no resolvable department/);
  });

  it("rejects a non-inspector signing off an inspection-gate item", () => {
    const steps = genSteps();
    eng.attachChecklists(JOB, steps);
    const gate = steps.find((s) => s.is_inspection_gate)!;
    const signoffItem = eng.getStepChecklist(JOB, gate.seq).items.find((i) => i.signoff)!;
    // an operator (even in quality dept) cannot sign off the gate
    expect(() => eng.checkItem({
      job_id: JOB, step_seq: gate.seq, item_id: signoffItem.id,
      employee_id: "OP-1", employee_department: "quality", employee_role: "operator",
    })).toThrow(/cannot sign off an inspection-gate item/);
    // an inspector can
    const ok = eng.checkItem({
      job_id: JOB, step_seq: gate.seq, item_id: signoffItem.id,
      employee_id: "INSP-1", employee_department: "quality", employee_role: "inspector",
    });
    expect(ok.items.find((i) => i.id === signoffItem.id)!.checked).toBe(true);
  });
});

describe("JobChecklistEngine -- step-complete event", () => {
  it("fires traveler.step.checklist_complete only when ALL required items checked", () => {
    const steps = genSteps();
    eng.attachChecklists(JOB, steps);
    // pick a non-gate machining step so an operator can check everything
    const machSeq = steps.find((s) => s.department === "machining")!.seq;
    const sc = eng.getStepChecklist(JOB, machSeq);
    const required = sc.items.filter((i) => i.required);
    expect(required.length).toBeGreaterThan(1);

    const events: unknown[] = [];
    const unsub = eventBus.subscribe("traveler.step.checklist_complete", (e: unknown) => events.push(e));

    // check all but the last required item -> not complete, no event
    for (let i = 0; i < required.length - 1; i++) {
      eng.checkItem({ job_id: JOB, step_seq: machSeq, item_id: required[i].id, employee_id: "EMP-1", employee_department: "machining", employee_role: "operator" });
    }
    expect(eng.stepComplete(JOB, machSeq)).toBe(false);
    expect(events.length).toBe(0);

    // check the last -> complete + event fires exactly once
    eng.checkItem({ job_id: JOB, step_seq: machSeq, item_id: required[required.length - 1].id, employee_id: "EMP-1", employee_department: "machining", employee_role: "operator" });
    expect(eng.stepComplete(JOB, machSeq)).toBe(true);
    expect(events.length).toBe(1);

    if (typeof unsub === "function") (unsub as () => void)();
  });
});

describe("JobChecklistEngine -- adversarial / unknown", () => {
  it("throws checking an item on an unknown job", () => {
    expect(() => eng.checkItem({ job_id: "NOPE", step_seq: 1, item_id: "x", employee_id: "E", employee_role: "operator" })).toThrow(/no checklist for job 'NOPE'/);
  });

  it("throws checking an unknown step", () => {
    eng.attachChecklists(JOB, genSteps());
    expect(() => eng.checkItem({ job_id: JOB, step_seq: 9999, item_id: "x", employee_id: "E", employee_role: "operator" })).toThrow(/step 9999 not found/);
  });

  it("throws checking an unknown item id", () => {
    const steps = genSteps();
    eng.attachChecklists(JOB, steps);
    expect(() => eng.checkItem({ job_id: JOB, step_seq: steps[0].seq, item_id: "bogus", employee_id: "E", employee_department: "programming", employee_role: "programmer" })).toThrow(/item 'bogus' not found/);
  });

  it("throws checking with an empty employee_id", () => {
    const steps = genSteps();
    eng.attachChecklists(JOB, steps);
    const item = eng.getStepChecklist(JOB, steps[0].seq).items[0];
    expect(() => eng.checkItem({ job_id: JOB, step_seq: steps[0].seq, item_id: item.id, employee_id: "  " })).toThrow(/employee_id is required/);
  });
});
