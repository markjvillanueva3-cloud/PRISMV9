/**
 * ProfilingEngine — Unit Tests
 * @milestone FORGE-ENGINES-B15
 */
import { describe, it, expect } from "vitest";
import { profilingEngine } from "../engines/ProfilingEngine.js";

describe("ProfilingEngine", () => {
  it("calculates basic profile milling parameters", () => {
    const r = profilingEngine.calculate({
      wall_height_mm: 20,
      tool_diameter_mm: 10,
    });
    expect(r.radial_depth.value).toBeGreaterThan(0);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.feed_rate.value).toBeGreaterThan(0);
    expect(r.milling_direction.unit).toBe("climb");
  });

  it("uses smaller ae for finishing", () => {
    const rough = profilingEngine.calculate({
      wall_height_mm: 20,
      tool_diameter_mm: 10,
      finishing: false,
    });
    const finish = profilingEngine.calculate({
      wall_height_mm: 20,
      tool_diameter_mm: 10,
      finishing: true,
    });
    expect(finish.radial_depth.value).toBeLessThan(
      rough.radial_depth.value
    );
  });

  it("calculates multiple stepdowns for tall walls", () => {
    const r = profilingEngine.calculate({
      wall_height_mm: 50,
      tool_diameter_mm: 10,
    });
    expect(r.number_of_stepdowns.value).toBeGreaterThan(1);
  });

  it("warns sharp corners need feed reduction", () => {
    const r = profilingEngine.calculate({
      wall_height_mm: 15,
      tool_diameter_mm: 10,
      min_corner_radius_mm: 3,
    });
    expect(
      r.warnings.some(w => w.includes("feed reduction"))
    ).toBe(true);
    expect(r.corner_feed_reduction.value).toBeLessThan(100);
  });

  it("estimates wall deflection for thin walls", () => {
    const r = profilingEngine.calculate({
      wall_height_mm: 30,
      wall_thickness_mm: 1.5,
      tool_diameter_mm: 10,
    });
    expect(r.wall_deflection.value).toBeGreaterThan(0);
  });

  it("recommends multiple finish passes for deflection", () => {
    const r = profilingEngine.calculate({
      wall_height_mm: 40,
      wall_thickness_mm: 1.0,
      tool_diameter_mm: 10,
      finishing: true,
    });
    expect(r.finish_passes.value).toBeGreaterThanOrEqual(2);
    expect(
      r.warnings.some(w => w.includes("deflection"))
    ).toBe(true);
  });

  it("warns very thin walls", () => {
    const r = profilingEngine.calculate({
      wall_height_mm: 20,
      wall_thickness_mm: 0.8,
      tool_diameter_mm: 6,
    });
    expect(
      r.warnings.some(w => w.includes("Thin wall"))
    ).toBe(true);
  });

  it("cutter comp equals tool radius", () => {
    const r = profilingEngine.calculate({
      wall_height_mm: 10,
      tool_diameter_mm: 12,
    });
    expect(r.cutter_comp.value).toBe(6);
  });

  it("calculates cycle time", () => {
    const r = profilingEngine.calculate({
      wall_height_mm: 20,
      tool_diameter_mm: 10,
      profile_length_mm: 200,
    });
    expect(r.cycle_time.value).toBeGreaterThan(0);
  });

  it("aluminum uses higher cutting speed", () => {
    const steel = profilingEngine.calculate({
      wall_height_mm: 15,
      tool_diameter_mm: 10,
      material_type: "steel",
    });
    const alum = profilingEngine.calculate({
      wall_height_mm: 15,
      tool_diameter_mm: 10,
      material_type: "aluminum",
    });
    expect(alum.spindle_rpm.value).toBeGreaterThan(
      steel.spindle_rpm.value
    );
  });
});
