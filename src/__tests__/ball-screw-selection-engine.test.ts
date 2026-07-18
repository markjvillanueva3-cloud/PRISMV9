/**
 * BallScrewSelectionEngine — Unit Tests
 * @milestone FORGE-ENGINES-B26
 */
import { describe, it, expect } from "vitest";
import {
  ballScrewSelectionEngine,
} from "../engines/BallScrewSelectionEngine.js";

describe("BallScrewSelectionEngine", () => {
  it("selects standard shaft diameter", () => {
    const r = ballScrewSelectionEngine.calculate({
      axis_travel_mm: 500,
    });
    const std = [16, 20, 25, 32, 40, 50, 63, 80];
    expect(std).toContain(r.min_shaft_diameter.value);
  });

  it("longer travel needs larger diameter", () => {
    const short = ballScrewSelectionEngine.calculate({
      axis_travel_mm: 300,
    });
    const long = ballScrewSelectionEngine.calculate({
      axis_travel_mm: 1500,
    });
    expect(long.min_shaft_diameter.value).toBeGreaterThanOrEqual(
      short.min_shaft_diameter.value
    );
  });

  it("critical speed > max RPM", () => {
    const r = ballScrewSelectionEngine.calculate({
      axis_travel_mm: 500,
    });
    expect(r.critical_speed.value).toBeGreaterThan(
      r.max_rpm.value
    );
  });

  it("buckling load > thrust requirement", () => {
    const r = ballScrewSelectionEngine.calculate({
      axis_travel_mm: 500,
      max_thrust_n: 5000,
    });
    expect(r.buckling_load.value).toBeGreaterThan(5000);
  });

  it("fixed-fixed has higher critical speed", () => {
    const ff = ballScrewSelectionEngine.calculate({
      axis_travel_mm: 800,
      end_fixity: "fixed_fixed",
    });
    const fs = ballScrewSelectionEngine.calculate({
      axis_travel_mm: 800,
      end_fixity: "fixed_supported",
    });
    expect(ff.critical_speed.value).toBeGreaterThan(
      fs.critical_speed.value
    );
  });

  it("motor torque increases with thrust", () => {
    const low = ballScrewSelectionEngine.calculate({
      axis_travel_mm: 500,
      max_thrust_n: 1000,
    });
    const high = ballScrewSelectionEngine.calculate({
      axis_travel_mm: 500,
      max_thrust_n: 10000,
    });
    expect(high.required_motor_torque.value).toBeGreaterThan(
      low.required_motor_torque.value
    );
  });

  it("accuracy class affects positioning", () => {
    const c3 = ballScrewSelectionEngine.calculate({
      axis_travel_mm: 500,
      accuracy_class: "C3",
    });
    const c7 = ballScrewSelectionEngine.calculate({
      axis_travel_mm: 500,
      accuracy_class: "C7",
    });
    expect(c7.positioning_accuracy.value).toBeGreaterThan(
      c3.positioning_accuracy.value
    );
  });

  it("warns low accuracy class", () => {
    const r = ballScrewSelectionEngine.calculate({
      axis_travel_mm: 500,
      accuracy_class: "C7",
    });
    expect(
      r.warnings.some(w => w.includes("C7"))
    ).toBe(true);
  });

  it("preload affects drag torque", () => {
    const light = ballScrewSelectionEngine.calculate({
      axis_travel_mm: 500,
      preload_type: "light",
    });
    const heavy = ballScrewSelectionEngine.calculate({
      axis_travel_mm: 500,
      preload_type: "heavy",
    });
    expect(heavy.drag_torque.value).toBeGreaterThan(
      light.drag_torque.value
    );
  });

  it("L10 life > 0", () => {
    const r = ballScrewSelectionEngine.calculate({
      axis_travel_mm: 500,
    });
    expect(r.l10_life_hours.value).toBeGreaterThan(0);
  });
});
