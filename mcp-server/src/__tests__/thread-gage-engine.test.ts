/**
 * ThreadGageEngine — Unit Tests
 * @milestone FORGE-ENGINES-B44
 */
import { describe, it, expect } from "vitest";
import { threadGageEngine } from "../engines/ThreadGageEngine.js";

describe("ThreadGageEngine", () => {
  it("basic pitch diameter > 0", () => {
    const r = threadGageEngine.calculate({});
    expect(r.basic_pitch_diameter.value).toBeGreaterThan(0);
  });

  it("PD < nominal diameter", () => {
    const r = threadGageEngine.calculate({ nominal_diameter_mm: 10 });
    expect(r.basic_pitch_diameter.value).toBeLessThan(10);
  });

  it("GO and NOGO differ by tolerance", () => {
    const r = threadGageEngine.calculate({});
    expect(Math.abs(r.go_gage_pd.value - r.nogo_gage_pd.value)).toBeCloseTo(
      r.pd_tolerance.value, 2
    );
  });

  it("class 3 has tighter tolerance than class 1", () => {
    const c1 = threadGageEngine.calculate({ class: "1" });
    const c3 = threadGageEngine.calculate({ class: "3" });
    expect(c3.pd_tolerance.value).toBeLessThan(c1.pd_tolerance.value);
  });

  it("best wire size proportional to pitch", () => {
    const fine = threadGageEngine.calculate({ pitch_mm: 1.0 });
    const coarse = threadGageEngine.calculate({ pitch_mm: 2.0 });
    expect(coarse.best_wire_size.value).toBeGreaterThan(
      fine.best_wire_size.value
    );
  });

  it("measurement over wires > pitch diameter", () => {
    const r = threadGageEngine.calculate({});
    expect(r.measurement_over_wires.value).toBeGreaterThan(
      r.basic_pitch_diameter.value
    );
  });

  it("thread depth > 0", () => {
    const r = threadGageEngine.calculate({});
    expect(r.thread_depth.value).toBeGreaterThan(0);
  });

  it("gage wear limit > 0", () => {
    const r = threadGageEngine.calculate({});
    expect(r.gage_wear_limit.value).toBeGreaterThan(0);
  });

  it("external GO is at max material (basic PD)", () => {
    const r = threadGageEngine.calculate({ type: "external" });
    expect(r.go_gage_pd.value).toBeCloseTo(
      r.basic_pitch_diameter.value, 2
    );
  });

  it("internal NOGO > GO", () => {
    const r = threadGageEngine.calculate({ type: "internal" });
    expect(r.nogo_gage_pd.value).toBeGreaterThan(r.go_gage_pd.value);
  });
});
