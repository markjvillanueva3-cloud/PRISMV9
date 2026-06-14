import { describe, it, expect } from "vitest";
import {
  spindleWarmupCycleEngine as eng,
  SpindleWarmupCycleEngine,
  type SpindleWarmupCycleInput,
} from "../engines/SpindleWarmupCycleEngine.js";

describe("SpindleWarmupCycleEngine", () => {
  it("exports a singleton with generate() method", () => {
    expect(eng).toBeInstanceOf(SpindleWarmupCycleEngine);
    expect(typeof eng.generate).toBe("function");
  });

  it("throws on missing controller or invalid max_rpm", () => {
    expect(() => eng.generate({} as SpindleWarmupCycleInput)).toThrow(/controller \+ positive max_rpm/);
    expect(() => eng.generate({ controller: "fanuc", max_rpm: 0 })).toThrow(/positive max_rpm/);
    expect(() => eng.generate({ controller: "fanuc", max_rpm: -100 })).toThrow(/positive max_rpm/);
  });

  it("default 4-stage cycle = 26 min (300+480+480+300 s)", () => {
    const r = eng.generate({ controller: "fanuc", max_rpm: 12000 });
    expect(r.stages_count).toBe(4);
    expect(r.total_duration_s.value).toBe(1560);
    expect(r.skipped).toBe(false);
  });

  it("RPM per stage = 25/50/75/100 % of max_rpm", () => {
    const r = eng.generate({ controller: "fanuc", max_rpm: 20000 });
    expect(r.stages[0].rpm).toBe(5000);
    expect(r.stages[1].rpm).toBe(10000);
    expect(r.stages[2].rpm).toBe(15000);
    expect(r.stages[3].rpm).toBe(20000);
  });

  it("2-stage cycle truncates to first 2 RPM steps", () => {
    const r = eng.generate({ controller: "fanuc", max_rpm: 10000, stages: 2 });
    expect(r.stages_count).toBe(2);
    expect(r.stages).toHaveLength(2);
    expect(r.stages[0].rpm).toBe(2500);
    expect(r.stages[1].rpm).toBe(5000);
  });

  it("3-stage cycle has 3 stages summing 300+480+480=1260s", () => {
    const r = eng.generate({ controller: "fanuc", max_rpm: 12000, stages: 3 });
    expect(r.stages_count).toBe(3);
    expect(r.total_duration_s.value).toBe(1260);
  });

  it("SKIPS when recent_run_min ≥ threshold (default 60min)", () => {
    const r = eng.generate({ controller: "fanuc", max_rpm: 10000, recent_run_min: 90 });
    expect(r.skipped).toBe(true);
    expect(r.skip_reason).toMatch(/90min/);
    expect(r.total_duration_s.value).toBe(0);
    expect(r.gcode).toMatch(/SKIPPED/);
  });

  it("does NOT skip when recent_run_min < threshold", () => {
    const r = eng.generate({ controller: "fanuc", max_rpm: 10000, recent_run_min: 30 });
    expect(r.skipped).toBe(false);
    expect(r.stages_count).toBe(4);
  });

  it("custom recent_run_threshold_min is honored", () => {
    const r = eng.generate({
      controller: "fanuc", max_rpm: 10000,
      recent_run_min: 45,
      recent_run_threshold_min: 30,
    });
    expect(r.skipped).toBe(true);
  });

  it("custom stage_duration_s overrides defaults", () => {
    const r = eng.generate({
      controller: "fanuc", max_rpm: 10000,
      stages: 2,
      stage_duration_s: [60, 120],
    });
    expect(r.stages[0].duration_s).toBe(60);
    expect(r.stages[1].duration_s).toBe(120);
    expect(r.total_duration_s.value).toBe(180);
  });

  it("G-code contains M3 + S<rpm> + G04 dwell + M5 spindle stop", () => {
    const r = eng.generate({ controller: "fanuc", max_rpm: 12000 });
    expect(r.gcode).toMatch(/M3 S3000/);
    expect(r.gcode).toMatch(/G04 P300/);
    expect(r.gcode).toMatch(/M5/);
  });

  it("G-code header cites ISO 230-3 + Sandvik Spindle Care", () => {
    const r = eng.generate({ controller: "fanuc", max_rpm: 10000 });
    expect(r.gcode).toMatch(/ISO 230-3/);
    expect(r.gcode).toMatch(/Sandvik/);
  });

  it("source cites ISO 230-3 + Sandvik + DMG MORI", () => {
    const r = eng.generate({ controller: "fanuc", max_rpm: 10000 });
    expect(r.source).toMatch(/ISO 230-3|Sandvik|DMG MORI/);
  });

  it("controllers fanuc/okuma_osp/haas/heidenhain_tnc all accepted", () => {
    for (const ctrl of ["fanuc", "okuma_osp", "haas", "heidenhain_tnc"] as const) {
      const r = eng.generate({ controller: ctrl, max_rpm: 10000 });
      expect(r.controller).toBe(ctrl);
      expect(r.stages_count).toBe(4);
    }
  });
});
