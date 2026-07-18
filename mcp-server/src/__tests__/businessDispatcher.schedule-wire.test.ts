/**
 * businessDispatcher.schedule-wire.test.ts -- HOTEL-ERP-WIRING/U-ERP-SCHEDULE-ROUTES
 *
 * Wiring guard for the Kienzle Scheduling page feeds (ShiftScheduleOptimizerEngine + MilestoneTracking),
 * which existed as prism_business actions with NO routes. Round-trips each through the REAL dispatcher and
 * asserts it RESOLVES (not "Unknown business action").
 *
 * Also regression-locks two crash fixes: schedule_optimize crashed on `machines.map` and schedule_what_if
 * on `current_schedule.makespan_hours` when called with empty input ({}); both now return a graceful empty
 * result. The tests call each with {} and assert a real empty result, NOT the crash-error envelope.
 */
import { describe, it, expect } from "vitest";
import { registerBusinessDispatcher } from "../tools/dispatchers/businessDispatcher.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function getHandler(): Handler {
  let captured: Handler | undefined;
  registerBusinessDispatcher({
    tool(_name: string, _desc: string, _schema: unknown, fn: Handler) {
      captured = fn;
    },
  });
  if (!captured) throw new Error("registerBusinessDispatcher did not register a handler");
  return captured;
}

function unwrap(res: any): any {
  if (res == null) return res;
  if (res.type === "text" && typeof res.text === "string") {
    try { return JSON.parse(res.text); } catch { return res.text; }
  }
  const arrText = res?.content?.[0]?.text;
  if (typeof arrText === "string") {
    try { return JSON.parse(arrText); } catch { return arrText; }
  }
  return res;
}

const isUnknownAction = (out: any) => typeof out?.error === "string" && /unknown business action/i.test(out.error);

describe("businessDispatcher -- Kienzle Scheduling page feeds are wired", () => {
  const handler = getHandler();

  it("milestone_list_jobs resolves to MilestoneTrackingEngine.listTrackedJobs() (array)", async () => {
    const out = unwrap(await handler({ action: "milestone_list_jobs", params: {} }));
    expect(isUnknownAction(out)).toBe(false);
    expect(Array.isArray(out)).toBe(true);
  });

  it("milestone_get_timeline (the /schedule-job-status read) resolves; needs job_id, not Unknown-action", async () => {
    // The route uses milestone_get_timeline (a READ), not the milestone_on_job_status mutator.
    const out = unwrap(await handler({ action: "milestone_get_timeline", params: {} }));
    expect(isUnknownAction(out)).toBe(false);
    expect(/job_id|invalid|required/i.test(JSON.stringify(out))).toBe(true);
    // with a (nonexistent) job id it resolves to a real read result (null), not an error:
    const got = unwrap(await handler({ action: "milestone_get_timeline", params: { job_id: "JOB-NONE" } }));
    expect(isUnknownAction(got)).toBe(false);
  });

  it("schedule_balance resolves to ShiftScheduleOptimizerEngine.balanceLoad() with a real rollup", async () => {
    const out = unwrap(await handler({ action: "schedule_balance", params: {} }));
    expect(isUnknownAction(out)).toBe(false);
    expect(Array.isArray(out.assignments)).toBe(true);
    expect(typeof out.load_balance_score).toBe("number");
  });

  it("schedule_optimize does NOT crash on empty input -> graceful empty schedule (crash-fix lock)", async () => {
    // Was: "Cannot read properties of undefined (reading 'map')" on machines.map with no machines.
    const out = unwrap(await handler({ action: "schedule_optimize", params: {} }));
    expect(isUnknownAction(out)).toBe(false);
    expect(JSON.stringify(out)).not.toMatch(/reading 'map'/i);
    expect(out.makespan_hours).toBe(0);
    expect(Array.isArray(out.schedule)).toBe(true);
  });

  it("schedule_what_if does NOT crash on empty input -> graceful zero-delta (crash-fix lock)", async () => {
    // Was: "Cannot read properties of undefined (reading 'makespan_hours')" on a missing baseline.
    const out = unwrap(await handler({ action: "schedule_what_if", params: {} }));
    expect(isUnknownAction(out)).toBe(false);
    expect(JSON.stringify(out)).not.toMatch(/makespan_hours'\)/i);
    expect(out.new_makespan_hours).toBe(0);
    expect(out.makespan_improvement_pct).toBe(0);
  });

  it("an unknown schedule action DOES error (proves the resolution markers are load-bearing)", async () => {
    const out = unwrap(await handler({ action: "schedule_optimize_DOES_NOT_EXIST" as any, params: {} }));
    expect(isUnknownAction(out)).toBe(true);
  });
});
