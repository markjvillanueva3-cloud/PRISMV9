/**
 * ScheduleProjectedCapacityEngine.test.ts — real-value coverage. Expected per-week loads + scores are
 * hand-computed: capacity 80h/wk, horizon 4, asOf 2026-01-01; job A 40h due 2026-01-05 (week 0),
 * job B 100h due 2026-01-12 (week 1, oversold).
 */

import { describe, it, expect } from "vitest";
import { ScheduleProjectedCapacityEngine, type ProjectCapacityInput } from "../engines/ScheduleProjectedCapacityEngine.js";

const BASE: ProjectCapacityInput = {
  supplierId: "criterion-precision-machining",
  asOfISO: "2026-01-01",
  capacityHoursPerWeek: 80,
  horizonWeeks: 4,
  committed: [
    { hoursRequired: 40, dueDateISO: "2026-01-05" }, // week 0
    { hoursRequired: 100, dueDateISO: "2026-01-12" }, // week 1 (oversold: 100 > 80)
  ],
};

describe("ScheduleProjectedCapacityEngine.project", () => {
  it("buckets committed hours into the right weeks with correct utilization + status", () => {
    const p = ScheduleProjectedCapacityEngine.project(BASE);
    expect(p.weeks).toHaveLength(4);
    expect(p.weeks[0]).toMatchObject({ committedHours: 40, availableHours: 40, utilization: 0.5, status: "open" });
    expect(p.weeks[1]).toMatchObject({ committedHours: 100, availableHours: 0, utilization: 1.25, status: "overcommitted" });
    expect(p.weeks[2]).toMatchObject({ committedHours: 0, availableHours: 80, status: "open" });
  });

  it("totals + score: cap 320, committed 140, free 200 → avgUtil 0.44, capacityScore 0.63", () => {
    const p = ScheduleProjectedCapacityEngine.project(BASE);
    expect(p.totalCapacityHours).toBe(320);
    expect(p.totalCommittedHours).toBe(140);
    expect(p.totalAvailableHours).toBe(200);
    expect(p.avgUtilization).toBe(0.44); // round2(140/320=0.4375)
    expect(p.overcommittedWeeks).toBe(1);
    expect(p.capacityScore).toBe(0.63); // round2(200/320=0.625)
  });

  it("an empty backlog is fully open (score 1.0)", () => {
    const p = ScheduleProjectedCapacityEngine.project({ ...BASE, committed: [] });
    expect(p.totalCommittedHours).toBe(0);
    expect(p.capacityScore).toBe(1);
    expect(p.weeks.every((w) => w.status === "open")).toBe(true);
  });

  it("clamps a job due beyond the horizon into the last week", () => {
    const p = ScheduleProjectedCapacityEngine.project({
      ...BASE,
      committed: [{ hoursRequired: 30, dueDateISO: "2027-01-01" }], // way past 4-week horizon
    });
    expect(p.weeks[3].committedHours).toBe(30); // clamped into last week
  });
});

describe("ScheduleProjectedCapacityEngine.earliestSlot", () => {
  it("finds the earliest week cumulative free capacity covers the job (60h → week 2)", () => {
    // free per week: 40, 0, 80, 80 → cumulative 40, 40, 120 ≥ 60 at week 2
    const s = ScheduleProjectedCapacityEngine.earliestSlot({ ...BASE, jobHours: 60 });
    expect(s.fits).toBe(true);
    expect(s.earliestCompletionWeek).toBe(2);
    expect(s.hoursStillNeeded).toBe(0);
  });

  it("reports does-not-fit when the job exceeds total free capacity in the horizon", () => {
    // total free = 200; a 250h job cannot fit
    const s = ScheduleProjectedCapacityEngine.earliestSlot({ ...BASE, jobHours: 250 });
    expect(s.fits).toBe(false);
    expect(s.earliestCompletionWeek).toBeNull();
    expect(s.hoursStillNeeded).toBe(50);
  });

  it("a wide-open shop fits a job in week 0", () => {
    const s = ScheduleProjectedCapacityEngine.earliestSlot({ ...BASE, committed: [], jobHours: 70 });
    expect(s.earliestCompletionWeek).toBe(0);
  });
});

describe("ScheduleProjectedCapacityEngine — fail-loud", () => {
  it("throws on a negative jobHours", () => {
    expect(() => ScheduleProjectedCapacityEngine.earliestSlot({ ...BASE, jobHours: -1 })).toThrow(/jobHours must be a finite >= 0/);
  });
  it("throws on an unparseable due date", () => {
    expect(() =>
      ScheduleProjectedCapacityEngine.project({ ...BASE, committed: [{ hoursRequired: 10, dueDateISO: "not-a-date" }] }),
    ).toThrow(/unparseable dueDateISO/);
  });
  it("throws on non-positive capacity (schema)", () => {
    expect(() => ScheduleProjectedCapacityEngine.project({ ...BASE, capacityHoursPerWeek: 0 })).toThrow(/capacityHoursPerWeek must be > 0/);
  });
});
