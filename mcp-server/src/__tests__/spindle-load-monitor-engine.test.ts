/**
 * SpindleLoadMonitorEngine — Unit Tests
 * @milestone FORGE-ENGINES-B25
 */
import { describe, it, expect } from "vitest";
import {
  spindleLoadMonitorEngine,
} from "../engines/SpindleLoadMonitorEngine.js";

describe("SpindleLoadMonitorEngine", () => {
  it("calculates nominal load from power", () => {
    const r = spindleLoadMonitorEngine.calculate({
      cutting_power_kw: 11,
      rated_power_kw: 22,
    });
    expect(r.nominal_load.value).toBeCloseTo(50, 0);
  });

  it("warning < feed_hold < retract thresholds", () => {
    const r = spindleLoadMonitorEngine.calculate({
      nominal_load_pct: 40,
    });
    expect(r.warning_threshold.value).toBeLessThan(
      r.feed_hold_threshold.value
    );
    expect(r.feed_hold_threshold.value).toBeLessThan(
      r.retract_threshold.value
    );
  });

  it("tapping has tighter thresholds", () => {
    const rough = spindleLoadMonitorEngine.calculate({
      nominal_load_pct: 40,
      operation: "roughing",
    });
    const tap = spindleLoadMonitorEngine.calculate({
      nominal_load_pct: 40,
      operation: "tapping",
    });
    expect(tap.retract_threshold.value).toBeLessThan(
      rough.retract_threshold.value
    );
  });

  it("normal status for moderate load", () => {
    const r = spindleLoadMonitorEngine.calculate({
      nominal_load_pct: 40,
      current_load_pct: 40,
    });
    expect(r.load_status.unit).toBe("NORMAL");
  });

  it("alarm status for high load", () => {
    const r = spindleLoadMonitorEngine.calculate({
      nominal_load_pct: 40,
      current_load_pct: 80,
    });
    expect(
      r.load_status.unit === "ALARM" ||
      r.load_status.unit === "CRITICAL"
    ).toBe(true);
  });

  it("air cut detected for very low load", () => {
    const r = spindleLoadMonitorEngine.calculate({
      nominal_load_pct: 40,
      current_load_pct: 2,
    });
    expect(r.load_status.unit).toBe("AIR_CUT");
  });

  it("wear trend from increasing history", () => {
    const r = spindleLoadMonitorEngine.calculate({
      nominal_load_pct: 40,
      load_history: [38, 39, 40, 41, 42, 43, 44],
    });
    expect(r.wear_trend.value).toBeGreaterThan(0);
  });

  it("breakage spike > nominal", () => {
    const r = spindleLoadMonitorEngine.calculate({
      nominal_load_pct: 40,
    });
    expect(r.breakage_spike_limit.value).toBeGreaterThan(40);
    expect(r.breakage_drop_limit.value).toBeLessThan(40);
  });

  it("warns worn tool with elevated load", () => {
    const r = spindleLoadMonitorEngine.calculate({
      nominal_load_pct: 40,
      current_load_pct: 50,
      tool_condition: "worn",
    });
    expect(
      r.warnings.some(w => w.includes("Worn") || w.includes("worn"))
    ).toBe(true);
  });

  it("hardness variation widens thresholds", () => {
    const low = spindleLoadMonitorEngine.calculate({
      nominal_load_pct: 40,
      material_hardness_variation_pct: 2,
    });
    const high = spindleLoadMonitorEngine.calculate({
      nominal_load_pct: 40,
      material_hardness_variation_pct: 15,
    });
    expect(high.warning_threshold.value).toBeGreaterThan(
      low.warning_threshold.value
    );
  });
});
