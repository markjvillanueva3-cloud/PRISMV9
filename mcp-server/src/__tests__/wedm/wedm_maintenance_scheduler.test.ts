/**
 * WEDMMaintenanceSchedulerEngine tests — WEDM AGI Phase 4 / P4-MS3 / U-P4-09.
 *
 * Covers:
 *  - planFromRUL(): band → priority mapping (imminent=P1, soon=P2, planned=P3)
 *  - planFromRUL(): healthy components emit NO task
 *  - planFromRUL(): action catalog maps each component to the right ServiceAction
 *  - planFromRUL(): tasks sorted priority-first then RUL-ascending
 *  - assignWindows(): greedy packing in window start-time order
 *  - assignWindows(): tasks that don't fit land in overflow
 *  - assignWindows(): P1 always places ahead of P2/P3 within a window
 *  - assignWindows(): minutesRemaining / minutesUsed accounting is correct
 *  - plan(): convenience wrapper returns tasks + schedule
 *  - actionFor(): returns defensive copy of catalog entry
 */
import { describe, it, expect } from "vitest";
import {
  WEDMMaintenanceSchedulerEngine,
  wedmMaintenanceSchedulerEngine,
  type ServiceWindow,
} from "../../engines/WEDMMaintenanceSchedulerEngine.js";
import {
  WEDMRULEngine,
} from "../../engines/WEDMRULEngine.js";
import {
  WEDMDegradationModelEngine,
  type DegradationSnapshot,
} from "../../engines/WEDMDegradationModelEngine.js";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function snapshotWith(
  overrides: Partial<Record<string, { state: number; capacity: number }>>,
): DegradationSnapshot {
  const e = new WEDMDegradationModelEngine();
  for (const [k, v] of Object.entries(overrides)) {
    if (!v) continue;
    e.load({ [k]: { state: v.state, capacity: v.capacity } });
  }
  return e.snapshot();
}

const rul = new WEDMRULEngine();

// ----------------------------------------------------------------------------
// planFromRUL() — band → priority mapping
// ----------------------------------------------------------------------------

describe("WEDMMaintenanceSchedulerEngine — planFromRUL band→priority", () => {
  const e = new WEDMMaintenanceSchedulerEngine();

  it("imminent band → priority 1", () => {
    const snap = snapshotWith({ guide_wear: { state: 0.45, capacity: 0.5 } });
    const report = rul.estimateFromRates(snap, { guide_wear: 0.1 }); // 0.5 hr
    const tasks = e.planFromRUL(report);
    const t = tasks.find((x) => x.component === "guide_wear");
    expect(t).toBeDefined();
    expect(t!.priority).toBe(1);
    expect(t!.band).toBe("imminent");
  });

  it("soon band → priority 2", () => {
    const snap = snapshotWith({ guide_wear: { state: 0.3, capacity: 0.5 } });
    const report = rul.estimateFromRates(snap, { guide_wear: 0.01 }); // 20 hr
    const tasks = e.planFromRUL(report);
    const t = tasks.find((x) => x.component === "guide_wear");
    expect(t!.priority).toBe(2);
    expect(t!.band).toBe("soon");
  });

  it("planned band → priority 3", () => {
    const snap = snapshotWith({ guide_wear: { state: 0, capacity: 0.5 } });
    const report = rul.estimateFromRates(snap, { guide_wear: 0.005 }); // 100 hr
    const tasks = e.planFromRUL(report);
    const t = tasks.find((x) => x.component === "guide_wear");
    expect(t!.priority).toBe(3);
    expect(t!.band).toBe("planned");
  });

  it("healthy band → no task emitted", () => {
    const snap = snapshotWith({});
    const report = rul.estimateFromRates(snap, {});
    const tasks = e.planFromRUL(report);
    expect(tasks.length).toBe(0);
  });

  it("mixed bands → only unhealthy components emit tasks", () => {
    const snap = snapshotWith({
      guide_wear: { state: 0.45, capacity: 0.5 }, // imminent
      wire_erosion: { state: 0, capacity: 100 }, // healthy (no rate)
    });
    const report = rul.estimateFromRates(snap, { guide_wear: 0.1 });
    const tasks = e.planFromRUL(report);
    expect(tasks.length).toBe(1);
    expect(tasks[0]!.component).toBe("guide_wear");
  });
});

// ----------------------------------------------------------------------------
// planFromRUL() — action catalog
// ----------------------------------------------------------------------------

describe("WEDMMaintenanceSchedulerEngine — action catalog", () => {
  const e = new WEDMMaintenanceSchedulerEngine();

  it("guide_wear → replace_wire_guides (45 min)", () => {
    const snap = snapshotWith({ guide_wear: { state: 0.45, capacity: 0.5 } });
    const r = rul.estimateFromRates(snap, { guide_wear: 0.1 });
    const t = e.planFromRUL(r)[0]!;
    expect(t.action).toBe("replace_wire_guides");
    expect(t.estMinutes).toBe(45);
  });

  it("wire_erosion → respool_wire (20 min)", () => {
    const snap = snapshotWith({ wire_erosion: { state: 90, capacity: 100 } });
    const r = rul.estimateFromRates(snap, { wire_erosion: 5 });
    const t = e.planFromRUL(r)[0]!;
    expect(t.action).toBe("respool_wire");
    expect(t.estMinutes).toBe(20);
  });

  it("filter_capacity → regenerate_resin (60 min)", () => {
    const snap = snapshotWith({
      filter_capacity: { state: 100, capacity: 200 },
    });
    const r = rul.estimateFromRates(snap, { filter_capacity: 50 });
    const t = e.planFromRUL(r)[0]!;
    expect(t.action).toBe("regenerate_resin");
    expect(t.estMinutes).toBe(60);
  });

  it("filter_clogging → swap_particulate_filter (15 min)", () => {
    const snap = snapshotWith({
      filter_clogging: { state: 4000, capacity: 5000 },
    });
    const r = rul.estimateFromRates(snap, { filter_clogging: 1000 });
    const t = e.planFromRUL(r)[0]!;
    expect(t.action).toBe("swap_particulate_filter");
    expect(t.estMinutes).toBe(15);
  });

  it("wire_fatigue → preventive_respool (25 min)", () => {
    const snap = snapshotWith({
      wire_fatigue: { state: 900_000, capacity: 1_000_000 },
    });
    const r = rul.estimateFromRates(snap, { wire_fatigue: 50_000 });
    const t = e.planFromRUL(r)[0]!;
    expect(t.action).toBe("preventive_respool");
    expect(t.estMinutes).toBe(25);
  });

  it("reason string references component label", () => {
    const snap = snapshotWith({ guide_wear: { state: 0.45, capacity: 0.5 } });
    const r = rul.estimateFromRates(snap, { guide_wear: 0.1 });
    const t = e.planFromRUL(r)[0]!;
    expect(t.reason).toMatch(/wire guides/);
    expect(t.reason).toMatch(/imminent/);
  });
});

// ----------------------------------------------------------------------------
// planFromRUL() — sort order
// ----------------------------------------------------------------------------

describe("WEDMMaintenanceSchedulerEngine — task sort order", () => {
  const e = new WEDMMaintenanceSchedulerEngine();

  it("priority ascending, then RUL ascending within a priority", () => {
    const snap = snapshotWith({
      guide_wear: { state: 0.3, capacity: 0.5 }, // 20 hr — soon (P2)
      wire_erosion: { state: 95, capacity: 100 }, // 5 hr — imminent (P1)
      filter_clogging: { state: 0, capacity: 5000 }, // 100 hr — planned (P3)
      wire_fatigue: { state: 0, capacity: 100 }, // 50 hr — planned (P3)
    });
    const r = rul.estimateFromRates(snap, {
      guide_wear: 0.01,
      wire_erosion: 1,
      filter_clogging: 50,
      wire_fatigue: 2,
    });
    const tasks = e.planFromRUL(r);
    // Expect: wire_erosion (P1), guide_wear (P2), wire_fatigue (P3, 50 hr), filter_clogging (P3, 100 hr)
    expect(tasks.map((t) => t.component)).toEqual([
      "wire_erosion",
      "guide_wear",
      "wire_fatigue",
      "filter_clogging",
    ]);
  });
});

// ----------------------------------------------------------------------------
// assignWindows()
// ----------------------------------------------------------------------------

describe("WEDMMaintenanceSchedulerEngine — assignWindows()", () => {
  const e = new WEDMMaintenanceSchedulerEngine();

  it("packs tasks into the first window with room", () => {
    const snap = snapshotWith({
      guide_wear: { state: 0.45, capacity: 0.5 },
    });
    const r = rul.estimateFromRates(snap, { guide_wear: 0.1 });
    const tasks = e.planFromRUL(r);
    const windows: ServiceWindow[] = [
      { id: "w1", startAt: 0, durationMinutes: 60 },
    ];
    const result = e.assignWindows(tasks, windows);
    expect(result.assignments[0]!.tasks.length).toBe(1);
    expect(result.assignments[0]!.minutesUsed).toBe(45);
    expect(result.assignments[0]!.minutesRemaining).toBe(15);
    expect(result.overflow.length).toBe(0);
  });

  it("sorts windows by startAt before packing", () => {
    const snap = snapshotWith({
      guide_wear: { state: 0.45, capacity: 0.5 },
    });
    const r = rul.estimateFromRates(snap, { guide_wear: 0.1 });
    const tasks = e.planFromRUL(r);
    const windows: ServiceWindow[] = [
      { id: "late", startAt: 1000, durationMinutes: 60 },
      { id: "early", startAt: 10, durationMinutes: 60 },
    ];
    const result = e.assignWindows(tasks, windows);
    expect(result.assignments[0]!.window.id).toBe("early");
    expect(result.assignments[0]!.tasks.length).toBe(1);
    expect(result.assignments[1]!.tasks.length).toBe(0);
  });

  it("overflow holds tasks that don't fit anywhere", () => {
    const snap = snapshotWith({
      guide_wear: { state: 0.45, capacity: 0.5 }, // 45 min
      filter_capacity: { state: 100, capacity: 200 }, // 60 min
    });
    const r = rul.estimateFromRates(snap, {
      guide_wear: 0.1,
      filter_capacity: 50,
    });
    const tasks = e.planFromRUL(r);
    const windows: ServiceWindow[] = [
      { id: "tight", startAt: 0, durationMinutes: 50 }, // fits only guide (45)
    ];
    const result = e.assignWindows(tasks, windows);
    expect(result.assignments[0]!.tasks.length).toBe(1);
    expect(result.overflow.length).toBe(1);
    expect(result.overflow[0]!.component).toBe("filter_capacity");
  });

  it("P1 tasks place first even when P3 fits comfortably", () => {
    const snap = snapshotWith({
      guide_wear: { state: 0.45, capacity: 0.5 }, // imminent (P1, 45 min)
      filter_clogging: { state: 0, capacity: 5000 }, // planned (P3, 15 min)
    });
    const r = rul.estimateFromRates(snap, {
      guide_wear: 0.1,
      filter_clogging: 50,
    });
    const tasks = e.planFromRUL(r);
    const windows: ServiceWindow[] = [
      { id: "w1", startAt: 0, durationMinutes: 90 },
    ];
    const result = e.assignWindows(tasks, windows);
    expect(result.assignments[0]!.tasks[0]!.priority).toBe(1);
    expect(result.assignments[0]!.tasks[1]!.priority).toBe(3);
  });

  it("empty windows → every task overflows", () => {
    const snap = snapshotWith({ guide_wear: { state: 0.45, capacity: 0.5 } });
    const r = rul.estimateFromRates(snap, { guide_wear: 0.1 });
    const tasks = e.planFromRUL(r);
    const result = e.assignWindows(tasks, []);
    expect(result.assignments.length).toBe(0);
    expect(result.overflow.length).toBe(1);
  });

  it("empty tasks → no assignments, no overflow", () => {
    const windows: ServiceWindow[] = [
      { id: "w1", startAt: 0, durationMinutes: 60 },
    ];
    const result = e.assignWindows([], windows);
    expect(result.overflow.length).toBe(0);
    expect(result.assignments[0]!.tasks.length).toBe(0);
    expect(result.assignments[0]!.minutesRemaining).toBe(60);
  });

  it("minutesUsed + minutesRemaining = durationMinutes", () => {
    const snap = snapshotWith({
      guide_wear: { state: 0.45, capacity: 0.5 },
      filter_clogging: { state: 4000, capacity: 5000 },
    });
    const r = rul.estimateFromRates(snap, {
      guide_wear: 0.1,
      filter_clogging: 1000,
    });
    const tasks = e.planFromRUL(r);
    const windows: ServiceWindow[] = [
      { id: "w1", startAt: 0, durationMinutes: 90 },
    ];
    const result = e.assignWindows(tasks, windows);
    const a = result.assignments[0]!;
    expect(a.minutesUsed + a.minutesRemaining).toBe(a.window.durationMinutes);
  });
});

// ----------------------------------------------------------------------------
// plan() convenience
// ----------------------------------------------------------------------------

describe("WEDMMaintenanceSchedulerEngine — plan() convenience", () => {
  const e = new WEDMMaintenanceSchedulerEngine();

  it("returns both tasks and schedule", () => {
    const snap = snapshotWith({ guide_wear: { state: 0.45, capacity: 0.5 } });
    const r = rul.estimateFromRates(snap, { guide_wear: 0.1 });
    const windows: ServiceWindow[] = [
      { id: "w1", startAt: 0, durationMinutes: 60 },
    ];
    const out = e.plan(r, windows);
    expect(out.tasks.length).toBe(1);
    expect(out.schedule.assignments.length).toBe(1);
    expect(out.schedule.overflow.length).toBe(0);
  });

  it("default windows = [] → all tasks overflow", () => {
    const snap = snapshotWith({ guide_wear: { state: 0.45, capacity: 0.5 } });
    const r = rul.estimateFromRates(snap, { guide_wear: 0.1 });
    const out = e.plan(r);
    expect(out.schedule.overflow.length).toBe(1);
  });
});

// ----------------------------------------------------------------------------
// actionFor()
// ----------------------------------------------------------------------------

describe("WEDMMaintenanceSchedulerEngine — actionFor()", () => {
  const e = new WEDMMaintenanceSchedulerEngine();

  it("returns catalog entry for each component", () => {
    expect(e.actionFor("guide_wear").action).toBe("replace_wire_guides");
    expect(e.actionFor("wire_erosion").action).toBe("respool_wire");
    expect(e.actionFor("filter_capacity").action).toBe("regenerate_resin");
    expect(e.actionFor("filter_clogging").action).toBe(
      "swap_particulate_filter",
    );
    expect(e.actionFor("wire_fatigue").action).toBe("preventive_respool");
  });

  it("returns a defensive copy (mutation does not leak)", () => {
    const a = e.actionFor("guide_wear");
    a.defaultMinutes = 9999;
    const b = e.actionFor("guide_wear");
    expect(b.defaultMinutes).toBe(45);
  });
});

// ----------------------------------------------------------------------------
// Singleton
// ----------------------------------------------------------------------------

describe("WEDMMaintenanceSchedulerEngine — singleton", () => {
  it("wedmMaintenanceSchedulerEngine emits consistent plans", () => {
    const snap = snapshotWith({ guide_wear: { state: 0.45, capacity: 0.5 } });
    const r = rul.estimateFromRates(snap, { guide_wear: 0.1 });
    const tasks = wedmMaintenanceSchedulerEngine.planFromRUL(r);
    expect(tasks.length).toBe(1);
    expect(tasks[0]!.priority).toBe(1);
  });
});
