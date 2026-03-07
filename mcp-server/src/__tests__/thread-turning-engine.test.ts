/**
 * Tests for ThreadTurningEngine
 */
import { describe, it, expect } from "vitest";
import { ThreadTurningEngine } from "../engines/ThreadTurningEngine.js";

describe("ThreadTurningEngine", () => {
  const engine = new ThreadTurningEngine();

  // ── Basic Thread Calculation ────────────────────────────────

  it("calculates M10×1.5 external metric thread", () => {
    const r = engine.calculate({
      pitch_mm: 1.5,
      major_diameter_mm: 10,
      material_iso_group: "P",
    });
    expect(r.thread_depth.value).toBeGreaterThan(0);
    expect(r.number_of_passes.value).toBeGreaterThan(2);
    expect(r.pass_schedule.length).toBe(
      r.number_of_passes.value
    );
    expect(r.cutting_speed.value).toBeGreaterThan(0);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.thread_height.value).toBeGreaterThan(0);
    expect(r.minor_diameter.value).toBeLessThan(10);
    expect(r.spring_passes.value).toBe(2);
  });

  it("pass schedule has decreasing cuts", () => {
    const r = engine.calculate({
      pitch_mm: 2,
      major_diameter_mm: 20,
    });
    const sched = r.pass_schedule;
    // First pass should be larger than last
    expect(sched[0].depth_mm).toBeGreaterThan(
      sched[sched.length - 1].depth_mm
    );
    // Cumulative should increase monotonically
    for (let i = 1; i < sched.length; i++) {
      expect(sched[i].cumulative_mm).toBeGreaterThan(
        sched[i - 1].cumulative_mm
      );
    }
  });

  it("last pass cumulative equals total depth", () => {
    const r = engine.calculate({
      pitch_mm: 1.5,
      major_diameter_mm: 10,
    });
    const lastCum = r.pass_schedule[
      r.pass_schedule.length - 1
    ].cumulative_mm;
    expect(lastCum).toBeCloseTo(r.thread_depth.value, 2);
  });

  // ── Infeed Methods ──────────────────────────────────────────

  it("selects radial infeed for fine pitch", () => {
    const r = engine.calculate({
      pitch_mm: 1.0,
      major_diameter_mm: 10,
    });
    expect(r.infeed_method).toBe("radial");
    expect(r.infeed_angle.value).toBe(0);
  });

  it("selects flank infeed for medium pitch", () => {
    const r = engine.calculate({
      pitch_mm: 2.0,
      major_diameter_mm: 20,
    });
    expect(r.infeed_method).toBe("flank");
    expect(r.infeed_angle.value).toBe(30);
  });

  it("selects modified flank for coarse pitch", () => {
    const r = engine.calculate({
      pitch_mm: 4.0,
      major_diameter_mm: 30,
    });
    expect(r.infeed_method).toBe("modified_flank");
    expect(r.infeed_angle.value).toBe(29.5);
  });

  it("allows explicit infeed method", () => {
    const r = engine.calculate({
      pitch_mm: 1.0,
      major_diameter_mm: 10,
      infeed_method: "alternating",
    });
    expect(r.infeed_method).toBe("alternating");
  });

  // ── Thread Forms ────────────────────────────────────────────

  it("calculates BSP 55° thread", () => {
    const r = engine.calculate({
      pitch_mm: 1.814, // 14 TPI
      major_diameter_mm: 20,
      thread_form: "bsp_55",
    });
    // BSP has height factor 0.6403 vs metric 0.6134
    expect(r.thread_height.value).toBeGreaterThan(
      1.814 * 0.6 // rough check
    );
  });

  it("calculates ACME 29° thread", () => {
    const r = engine.calculate({
      pitch_mm: 5.08, // 5 TPI
      major_diameter_mm: 25,
      thread_form: "acme_29",
    });
    expect(r.thread_height.value).toBeCloseTo(
      5.08 * 0.5, 1
    );
  });

  // ── Internal Thread ─────────────────────────────────────────

  it("calculates internal thread (larger minor dia)", () => {
    const r = engine.calculate({
      pitch_mm: 1.5,
      major_diameter_mm: 10,
      is_external: false,
    });
    expect(r.minor_diameter.value).toBeGreaterThan(10);
  });

  // ── Speed Adjustment ────────────────────────────────────────

  it("reduces speed for coarse pitch", () => {
    const fine = engine.calculate({
      pitch_mm: 1.0,
      major_diameter_mm: 20,
      material_iso_group: "P",
    });
    const coarse = engine.calculate({
      pitch_mm: 4.0,
      major_diameter_mm: 20,
      material_iso_group: "P",
    });
    expect(coarse.cutting_speed.value).toBeLessThan(
      fine.cutting_speed.value
    );
  });

  // ── Warnings ────────────────────────────────────────────────

  it("warns on very coarse pitch", () => {
    const r = engine.calculate({
      pitch_mm: 8,
      major_diameter_mm: 50,
    });
    expect(
      r.warnings.some(w => w.includes("coarse"))
    ).toBe(true);
  });

  it("warns on large nose radius", () => {
    const r = engine.calculate({
      pitch_mm: 1.0,
      major_diameter_mm: 10,
      insert_nose_radius_mm: 0.8,
    });
    expect(
      r.warnings.some(w => w.includes("nose radius"))
    ).toBe(true);
  });

  it("warns radial infeed for coarse pitch", () => {
    const r = engine.calculate({
      pitch_mm: 3,
      major_diameter_mm: 30,
      infeed_method: "radial",
    });
    expect(
      r.warnings.some(w => w.includes("Radial infeed"))
    ).toBe(true);
  });

  // ── AtomicValue Format ──────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.calculate({
      pitch_mm: 1.5,
      major_diameter_mm: 10,
    });
    for (const key of [
      "thread_depth", "cutting_speed", "spindle_rpm",
      "infeed_angle", "spring_passes",
      "thread_height", "minor_diameter",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { threadTurningEngine } = await import(
      "../engines/ThreadTurningEngine.js"
    );
    expect(threadTurningEngine).toBeInstanceOf(
      ThreadTurningEngine
    );
  });
});
