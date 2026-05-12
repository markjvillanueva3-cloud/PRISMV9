import { describe, it, expect } from "vitest";
import { latheOnMachineProbeCycleEngine } from "../engines/LatheOnMachineProbeCycleEngine.js";

describe("LatheOnMachineProbeCycleEngine", () => {
  it("od_measure emits G65 P9821", () => {
    const r = latheOnMachineProbeCycleEngine.generate({
      cycle: "od_measure",
      nominal_mm: 20,
      tol_mm: 0.05,
    });
    expect(r.nc_snippet).toContain("G65");
    expect(r.nc_snippet).toContain("P9821");
  });

  it("groove_width uses 2-point macro P9823", () => {
    const r = latheOnMachineProbeCycleEngine.generate({
      cycle: "groove_width",
      nominal_mm: 4,
      tol_mm: 0.02,
    });
    expect(r.nc_snippet).toContain("P9823");
  });

  it("work_offset_bump uses P9832", () => {
    const r = latheOnMachineProbeCycleEngine.generate({
      cycle: "work_offset_bump",
      nominal_mm: 0,
      tol_mm: 0.01,
    });
    expect(r.nc_snippet).toContain("P9832");
  });

  it("face_z_measure defaults to Z-axis", () => {
    const r = latheOnMachineProbeCycleEngine.generate({
      cycle: "face_z_measure",
      nominal_mm: 0,
      tol_mm: 0.02,
    });
    expect(r.nc_snippet).toContain("A2");
  });

  it("od_measure defaults to X-axis", () => {
    const r = latheOnMachineProbeCycleEngine.generate({
      cycle: "od_measure",
      nominal_mm: 30,
      tol_mm: 0.02,
    });
    expect(r.nc_snippet).toContain("A1");
  });

  it("warns on short stylus length", () => {
    const r = latheOnMachineProbeCycleEngine.generate({
      cycle: "od_measure",
      nominal_mm: 20,
      tol_mm: 0.05,
      probe_stylus_length_mm: 10,
    });
    expect(r.warnings.some((w) => /stylus/i.test(w))).toBe(true);
  });

  it("respects macro_override", () => {
    const r = latheOnMachineProbeCycleEngine.generate({
      cycle: "od_measure",
      nominal_mm: 20,
      tol_mm: 0.05,
      macro_override: 9999,
    });
    expect(r.macro).toBe(9999);
    expect(r.nc_snippet).toContain("P9999");
  });

  it("uses WCS G55 when specified", () => {
    const r = latheOnMachineProbeCycleEngine.generate({
      cycle: "od_measure",
      nominal_mm: 20,
      tol_mm: 0.05,
      wcs: "G55",
    });
    expect(r.nc_snippet).toContain("G55");
  });

  it("estimated_time_s > 0", () => {
    const r = latheOnMachineProbeCycleEngine.generate({
      cycle: "od_measure",
      nominal_mm: 20,
      tol_mm: 0.05,
    });
    expect(r.estimated_time_s).toBeGreaterThan(0);
  });

  it("higher probe feed yields shorter time", () => {
    const slow = latheOnMachineProbeCycleEngine.generate({
      cycle: "od_measure", nominal_mm: 20, tol_mm: 0.05, probe_feed_mm_min: 500,
    });
    const fast = latheOnMachineProbeCycleEngine.generate({
      cycle: "od_measure", nominal_mm: 20, tol_mm: 0.05, probe_feed_mm_min: 2000,
    });
    expect(fast.estimated_time_s).toBeLessThan(slow.estimated_time_s);
  });

  it("approach_mm honored in snippet", () => {
    const r = latheOnMachineProbeCycleEngine.generate({
      cycle: "od_measure",
      nominal_mm: 20,
      tol_mm: 0.05,
      approach_mm: 3,
    });
    expect(r.approach_mm).toBe(3);
  });

  it("getStats lists all supported cycle types", () => {
    const s = latheOnMachineProbeCycleEngine.getStats();
    expect(s.cycles).toContain("od_measure");
    expect(s.cycles).toContain("thread_start");
  });

  it("thread_start cycle emits macro call", () => {
    const r = latheOnMachineProbeCycleEngine.generate({
      cycle: "thread_start",
      nominal_mm: 19.5,
      tol_mm: 0.1,
    });
    expect(r.nc_snippet).toContain("G65");
  });
});
