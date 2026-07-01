/**
 * PeckDrillingEngine — Unit Tests
 * @milestone FORGE-ENGINES-B13
 */
import { describe, it, expect } from "vitest";
import { peckDrillingEngine } from "../engines/PeckDrillingEngine.js";

describe("PeckDrillingEngine", () => {
  it("calculates basic peck drilling for steel", () => {
    const r = peckDrillingEngine.calculate({
      drill_diameter_mm: 10,
      hole_depth_mm: 40,
    });
    expect(r.ld_ratio.value).toBe(4);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.feed_rate.value).toBeGreaterThan(0);
    expect(r.total_pecks.value).toBeGreaterThan(1);
    expect(r.peck_schedule.length).toBeGreaterThan(1);
  });

  it("uses G83 full retract for L/D > 3", () => {
    const r = peckDrillingEngine.calculate({
      drill_diameter_mm: 8,
      hole_depth_mm: 40,
    });
    expect(r.ld_ratio.value).toBe(5);
    expect(r.cycle_type.unit).toBe("G83");
  });

  it("uses G73 chip break for shallow holes", () => {
    const r = peckDrillingEngine.calculate({
      drill_diameter_mm: 10,
      hole_depth_mm: 20,
      coolant: "flood",
    });
    expect(r.ld_ratio.value).toBe(2);
    expect(r.cycle_type.unit).toBe("G73");
  });

  it("decreasing peck depths in schedule", () => {
    const r = peckDrillingEngine.calculate({
      drill_diameter_mm: 10,
      hole_depth_mm: 80,
    });
    const schedule = r.peck_schedule;
    // First peck should be largest
    expect(schedule[0].peck_depth).toBeGreaterThanOrEqual(
      schedule[Math.floor(schedule.length / 2)].peck_depth
    );
    // Last depth should reach hole depth
    const last = schedule[schedule.length - 1];
    expect(last.depth_from_surface).toBeCloseTo(80, 0);
  });

  it("warns when L/D exceeds drill type limit", () => {
    const r = peckDrillingEngine.calculate({
      drill_diameter_mm: 6,
      hole_depth_mm: 50,
      drill_type: "twist",
    });
    // L/D = 8.3, twist limit = 5
    expect(
      r.warnings.some(w => w.includes("exceeds"))
    ).toBe(true);
  });

  it("gun drill handles high L/D", () => {
    const r = peckDrillingEngine.calculate({
      drill_diameter_mm: 10,
      hole_depth_mm: 300,
      drill_type: "gun",
    });
    expect(r.ld_ratio.value).toBe(30);
    expect(
      r.warnings.every(w => !w.includes("exceeds"))
    ).toBe(true);
  });

  it("through-tool coolant increases peck depth", () => {
    const flood = peckDrillingEngine.calculate({
      drill_diameter_mm: 10,
      hole_depth_mm: 50,
      coolant: "flood",
    });
    const thru = peckDrillingEngine.calculate({
      drill_diameter_mm: 10,
      hole_depth_mm: 50,
      coolant: "through_tool",
    });
    expect(thru.initial_peck_depth.value).toBeGreaterThan(
      flood.initial_peck_depth.value
    );
  });

  it("breakthrough feed is 70% of normal", () => {
    const r = peckDrillingEngine.calculate({
      drill_diameter_mm: 10,
      hole_depth_mm: 30,
    });
    expect(r.breakthrough_feed.value).toBeCloseTo(
      r.feed_rate.value * 0.7, 0
    );
  });

  it("warns titanium deep drilling without through-tool", () => {
    const r = peckDrillingEngine.calculate({
      drill_diameter_mm: 8,
      hole_depth_mm: 40,
      material_type: "titanium",
      coolant: "flood",
    });
    expect(
      r.warnings.some(w => w.includes("through-tool"))
    ).toBe(true);
  });

  it("warns small drill at high L/D", () => {
    const r = peckDrillingEngine.calculate({
      drill_diameter_mm: 2,
      hole_depth_mm: 15,
    });
    expect(
      r.warnings.some(w => w.includes("breakage"))
    ).toBe(true);
  });

  it("calculates cycle time > 0", () => {
    const r = peckDrillingEngine.calculate({
      drill_diameter_mm: 10,
      hole_depth_mm: 50,
    });
    expect(r.cycle_time.value).toBeGreaterThan(0);
  });
});
