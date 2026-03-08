/**
 * PipeStressEngine — Unit Tests
 * @milestone FORGE-ENGINES-B49
 */
import { describe, it, expect } from "vitest";
import { pipeStressEngine } from "../engines/PipeStressEngine.js";

describe("PipeStressEngine", () => {
  it("hoop stress > 0", () => {
    const r = pipeStressEngine.calculate({});
    expect(r.hoop_stress.value).toBeGreaterThan(0);
  });

  it("higher pressure increases hoop stress", () => {
    const lo = pipeStressEngine.calculate({ internal_pressure_mpa: 1 });
    const hi = pipeStressEngine.calculate({ internal_pressure_mpa: 10 });
    expect(hi.hoop_stress.value).toBeGreaterThan(lo.hoop_stress.value);
  });

  it("min wall thickness > 0", () => {
    const r = pipeStressEngine.calculate({});
    expect(r.min_wall_thickness.value).toBeGreaterThan(0);
  });

  it("thicker schedule gives more wall margin", () => {
    const s40 = pipeStressEngine.calculate({ schedule: "40" });
    const s80 = pipeStressEngine.calculate({ schedule: "80" });
    expect(s80.wall_margin.value).toBeGreaterThan(s40.wall_margin.value);
  });

  it("thermal expansion stress > 0", () => {
    const r = pipeStressEngine.calculate({ thermal_delta_c: 150 });
    expect(r.thermal_expansion_stress.value).toBeGreaterThan(0);
  });

  it("stainless has higher thermal stress than carbon", () => {
    const cs = pipeStressEngine.calculate({
      material: "A106B", thermal_delta_c: 200,
    });
    const ss = pipeStressEngine.calculate({
      material: "A312_304", thermal_delta_c: 200,
    });
    expect(ss.thermal_expansion_stress.value).toBeGreaterThan(
      cs.thermal_expansion_stress.value
    );
  });

  it("pipe weight > 0", () => {
    const r = pipeStressEngine.calculate({});
    expect(r.pipe_weight.value).toBeGreaterThan(0);
  });

  it("max span > 0", () => {
    const r = pipeStressEngine.calculate({});
    expect(r.max_span.value).toBeGreaterThan(0);
  });

  it("sustained ratio > 0", () => {
    const r = pipeStressEngine.calculate({});
    expect(r.sustained_ratio.value).toBeGreaterThan(0);
  });

  it("warns over-span", () => {
    const r = pipeStressEngine.calculate({ span_m: 30 });
    expect(r.warnings.some(w => w.includes("pan") || w.includes("support"))).toBe(true);
  });
});
