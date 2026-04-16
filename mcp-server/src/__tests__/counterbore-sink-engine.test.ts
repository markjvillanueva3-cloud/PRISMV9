/**
 * Tests for CounterboreSinkEngine
 */
import { describe, it, expect } from "vitest";
import { CounterboreSinkEngine } from "../engines/CounterboreSinkEngine.js";

describe("CounterboreSinkEngine", () => {
  const engine = new CounterboreSinkEngine();

  // ── Counterbore ─────────────────────────────────────────────

  it("calculates M6 SHCS counterbore", () => {
    const r = engine.counterbore({
      fastener_size_mm: 6,
      fastener_type: "shcs",
      material_iso_group: "P",
    });
    expect(r.counterbore_diameter.value).toBe(10);
    expect(r.counterbore_depth.value).toBe(6);
    expect(r.through_hole_diameter.value).toBe(6.6);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.feed_rate.value).toBeGreaterThan(0);
    expect(r.cycle_time.value).toBeGreaterThan(0);
    expect(r.fastener_info).toContain("SHCS");
  });

  it("calculates M8 BHCS counterbore", () => {
    const r = engine.counterbore({
      fastener_size_mm: 8,
      fastener_type: "bhcs",
    });
    expect(r.counterbore_diameter.value).toBe(14);
    expect(r.counterbore_depth.value).toBe(4.4);
    expect(r.through_hole_diameter.value).toBe(9);
  });

  it("allows custom counterbore dimensions", () => {
    const r = engine.counterbore({
      fastener_type: "custom",
      counterbore_diameter_mm: 15,
      counterbore_depth_mm: 8,
      through_hole_diameter_mm: 10,
    });
    expect(r.counterbore_diameter.value).toBe(15);
    expect(r.counterbore_depth.value).toBe(8);
    expect(r.through_hole_diameter.value).toBe(10);
  });

  it("warns on invalid cbore < through hole", () => {
    const r = engine.counterbore({
      fastener_type: "custom",
      counterbore_diameter_mm: 5,
      through_hole_diameter_mm: 10,
    });
    expect(
      r.warnings.some(w => w.includes("invalid"))
    ).toBe(true);
  });

  it("warns on missing fastener size", () => {
    const r = engine.counterbore({
      fastener_size_mm: 7,
      fastener_type: "shcs",
    });
    expect(
      r.warnings.some(w => w.includes("not in"))
    ).toBe(true);
  });

  // ── Countersink ─────────────────────────────────────────────

  it("calculates countersink for 6mm hole", () => {
    const r = engine.countersink({
      hole_diameter_mm: 6,
      countersink_angle_deg: 90,
    });
    expect(r.countersink_diameter.value).toBeGreaterThan(6);
    expect(r.countersink_depth.value).toBeGreaterThan(0);
    expect(r.countersink_angle.value).toBe(90);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
  });

  it("uses FHCS head diameter from table", () => {
    const r = engine.countersink({
      hole_diameter_mm: 6,
    });
    // M6 FHCS head dia = 13.44
    expect(r.countersink_diameter.value).toBe(13.44);
  });

  it("uses custom head diameter", () => {
    const r = engine.countersink({
      hole_diameter_mm: 10,
      head_diameter_mm: 18,
    });
    expect(r.countersink_diameter.value).toBe(18);
  });

  it("warns on non-standard angle", () => {
    const r = engine.countersink({
      hole_diameter_mm: 8,
      countersink_angle_deg: 45,
    });
    expect(
      r.warnings.some(w => w.includes("Non-standard"))
    ).toBe(true);
  });

  // ── Fastener Hole ───────────────────────────────────────────

  it("returns M10 SHCS hole spec", () => {
    const r = engine.fastenerHole({
      fastener_size_mm: 10,
      fastener_type: "shcs",
    });
    expect(r.through_hole.value).toBe(11);
    expect(r.counterbore_or_countersink.value).toBe(16);
    expect(r.depth_or_angle.value).toBe(10);
    expect(r.standard).toContain("ANSI");
  });

  it("returns FHCS hole spec with angle", () => {
    const r = engine.fastenerHole({
      fastener_size_mm: 8,
      fastener_type: "fhcs",
    });
    expect(r.depth_or_angle.value).toBe(90);
    expect(r.depth_or_angle.unit).toBe("deg");
  });

  // ── AtomicValue Format ──────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.counterbore({ fastener_size_mm: 6 });
    for (const key of [
      "counterbore_diameter", "counterbore_depth",
      "through_hole_diameter", "spindle_rpm",
      "feed_rate", "cycle_time",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { counterboreSinkEngine } = await import(
      "../engines/CounterboreSinkEngine.js"
    );
    expect(counterboreSinkEngine).toBeInstanceOf(
      CounterboreSinkEngine
    );
  });
});
