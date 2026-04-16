/**
 * MachineWarmupEngine — Unit Tests
 * @milestone FORGE-ENGINES-B24
 */
import { describe, it, expect } from "vitest";
import { machineWarmupEngine } from "../engines/MachineWarmupEngine.js";

describe("MachineWarmupEngine", () => {
  it("calculates total warmup time", () => {
    const r = machineWarmupEngine.calculate({
      max_spindle_rpm: 10000,
    });
    expect(r.total_warmup_time.value).toBeGreaterThan(0);
  });

  it("longer idle needs more warmup", () => {
    const short = machineWarmupEngine.calculate({
      idle_hours: 2,
    });
    const long = machineWarmupEngine.calculate({
      idle_hours: 48,
    });
    expect(long.total_warmup_time.value).toBeGreaterThan(
      short.total_warmup_time.value
    );
  });

  it("tighter accuracy needs longer warmup", () => {
    const loose = machineWarmupEngine.calculate({
      required_accuracy_mm: 0.040,
    });
    const tight = machineWarmupEngine.calculate({
      required_accuracy_mm: 0.005,
    });
    expect(tight.total_warmup_time.value).toBeGreaterThan(
      loose.total_warmup_time.value
    );
  });

  it("spindle chiller reduces warmup time", () => {
    const noChiller = machineWarmupEngine.calculate({
      has_spindle_chiller: false,
      idle_hours: 12,
    });
    const withChiller = machineWarmupEngine.calculate({
      has_spindle_chiller: true,
      idle_hours: 12,
    });
    expect(withChiller.spindle_warmup_time.value).toBeLessThan(
      noChiller.spindle_warmup_time.value
    );
  });

  it("first part risk increases with idle time", () => {
    const short = machineWarmupEngine.calculate({
      idle_hours: 1,
      required_accuracy_mm: 0.050,
    });
    const long = machineWarmupEngine.calculate({
      idle_hours: 48,
      required_accuracy_mm: 0.010,
    });
    expect(long.first_part_risk.value).toBeGreaterThanOrEqual(
      short.first_part_risk.value
    );
  });

  it("warns long idle time", () => {
    const r = machineWarmupEngine.calculate({
      idle_hours: 72,
    });
    expect(
      r.warnings.some(w => w.includes("idle"))
    ).toBe(true);
  });

  it("warns bad ambient temperature", () => {
    const r = machineWarmupEngine.calculate({
      ambient_temp_c: 35,
    });
    expect(
      r.warnings.some(w => w.includes("Ambient") ||
        w.includes("ambient"))
    ).toBe(true);
  });

  it("high-speed spindle gets more warmup steps", () => {
    const low = machineWarmupEngine.calculate({
      max_spindle_rpm: 6000,
    });
    const high = machineWarmupEngine.calculate({
      max_spindle_rpm: 20000,
    });
    expect(high.spindle_steps.value).toBeGreaterThan(
      low.spindle_steps.value
    );
  });

  it("thermal stability approaches 100% with warmup", () => {
    const r = machineWarmupEngine.calculate({
      idle_hours: 12,
      required_accuracy_mm: 0.010,
    });
    expect(r.thermal_stability_pct.value).toBeGreaterThan(50);
  });

  it("skip_ok when short idle and loose tolerance", () => {
    const r = machineWarmupEngine.calculate({
      idle_hours: 1,
      required_accuracy_mm: 0.050,
    });
    expect(r.skip_ok.value).toBe(1);
  });
});
