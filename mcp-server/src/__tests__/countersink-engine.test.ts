/**
 * CountersinkEngine — Unit Tests
 * @milestone FORGE-ENGINES-B14
 */
import { describe, it, expect } from "vitest";
import { countersinkEngine } from "../engines/CountersinkEngine.js";

describe("CountersinkEngine", () => {
  it("calculates M5 countersink from screw size", () => {
    const r = countersinkEngine.calculate({
      screw_size: "M5",
    });
    // M5 head = 9.2mm → csk = 9.4mm
    expect(r.countersink_diameter.value).toBeCloseTo(9.4, 1);
    expect(r.countersink_depth.value).toBeGreaterThan(0);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
  });

  it("calculates from explicit head diameter", () => {
    const r = countersinkEngine.calculate({
      screw_head_diameter_mm: 12,
      hole_diameter_mm: 6.6,
      countersink_angle_deg: 82,
    });
    expect(r.countersink_diameter.value).toBeCloseTo(12.2, 1);
    expect(r.countersink_depth.value).toBeGreaterThan(0);
  });

  it("sub-flush is deeper than flush", () => {
    const flush = countersinkEngine.calculate({
      screw_size: "M6",
      flush_type: "flush",
    });
    const sub = countersinkEngine.calculate({
      screw_size: "M6",
      flush_type: "sub_flush",
    });
    expect(sub.countersink_depth.value).toBeGreaterThan(
      flush.countersink_depth.value
    );
  });

  it("proud is shallower than flush", () => {
    const flush = countersinkEngine.calculate({
      screw_size: "M6",
      flush_type: "flush",
    });
    const proud = countersinkEngine.calculate({
      screw_size: "M6",
      flush_type: "proud",
    });
    expect(proud.countersink_depth.value).toBeLessThan(
      flush.countersink_depth.value
    );
  });

  it("handles imperial screw sizes", () => {
    const r = countersinkEngine.calculate({
      screw_size: "1/4",
    });
    expect(r.countersink_diameter.value).toBeCloseTo(12.9, 1);
  });

  it("warns on non-standard angle", () => {
    const r = countersinkEngine.calculate({
      screw_head_diameter_mm: 10,
      countersink_angle_deg: 75,
    });
    expect(
      r.warnings.some(w => w.includes("Non-standard"))
    ).toBe(true);
  });

  it("warns composite delamination risk", () => {
    const r = countersinkEngine.calculate({
      screw_size: "M4",
      material_type: "composite",
    });
    expect(
      r.warnings.some(w => w.includes("delamination"))
    ).toBe(true);
  });

  it("carbide runs faster than HSS", () => {
    const hss = countersinkEngine.calculate({
      screw_size: "M6",
      tool_type: "hss",
    });
    const carb = countersinkEngine.calculate({
      screw_size: "M6",
      tool_type: "carbide",
    });
    expect(carb.spindle_rpm.value).toBeGreaterThan(
      hss.spindle_rpm.value
    );
  });

  it("recommends more flutes for large diameters", () => {
    const small = countersinkEngine.calculate({
      screw_size: "M3",
    });
    const large = countersinkEngine.calculate({
      screw_size: "M12",
    });
    expect(large.recommended_flutes.value).toBeGreaterThanOrEqual(
      small.recommended_flutes.value
    );
  });

  it("cycle time is positive", () => {
    const r = countersinkEngine.calculate({
      screw_size: "M8",
    });
    expect(r.cycle_time_per_hole.value).toBeGreaterThan(0);
  });

  it("warns no screw size given", () => {
    const r = countersinkEngine.calculate({});
    expect(
      r.warnings.some(w => w.includes("No screw size"))
    ).toBe(true);
  });
});
