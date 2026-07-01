/**
 * ChainDriveEngine — Unit Tests
 * @milestone FORGE-ENGINES-B39
 */
import { describe, it, expect } from "vitest";
import { chainDriveEngine } from "../engines/ChainDriveEngine.js";

describe("ChainDriveEngine", () => {
  it("speed ratio matches RPM inputs", () => {
    const r = chainDriveEngine.calculate({ driver_rpm: 1000, driven_rpm: 500 });
    expect(r.speed_ratio.value).toBeCloseTo(2.0, 1);
  });

  it("driven teeth > driver teeth for speed reduction", () => {
    const r = chainDriveEngine.calculate({ driver_rpm: 1500, driven_rpm: 500 });
    expect(r.driven_teeth.value).toBeGreaterThan(r.driver_teeth.value);
  });

  it("higher power selects larger pitch", () => {
    const low = chainDriveEngine.calculate({ power_kw: 1 });
    const high = chainDriveEngine.calculate({ power_kw: 20 });
    expect(high.recommended_pitch.value).toBeGreaterThanOrEqual(
      low.recommended_pitch.value
    );
  });

  it("chain speed > 0", () => {
    const r = chainDriveEngine.calculate({});
    expect(r.chain_speed.value).toBeGreaterThan(0);
  });

  it("chain tension > 0", () => {
    const r = chainDriveEngine.calculate({});
    expect(r.chain_tension.value).toBeGreaterThan(0);
  });

  it("chain length in even pitches", () => {
    const r = chainDriveEngine.calculate({});
    expect(r.chain_length_pitches.value % 2).toBe(0);
  });

  it("design power includes service factor", () => {
    const r = chainDriveEngine.calculate({
      power_kw: 5,
      application: "heavy_shock",
    });
    expect(r.design_power.value).toBeGreaterThan(5);
  });

  it("forced lubrication extends life", () => {
    const drip = chainDriveEngine.calculate({ lubrication: "drip" });
    const forced = chainDriveEngine.calculate({ lubrication: "forced" });
    expect(forced.estimated_life.value).toBeGreaterThan(
      drip.estimated_life.value
    );
  });

  it("estimated life > 0", () => {
    const r = chainDriveEngine.calculate({});
    expect(r.estimated_life.value).toBeGreaterThan(0);
  });

  it("chain length mm > 0", () => {
    const r = chainDriveEngine.calculate({});
    expect(r.chain_length_mm.value).toBeGreaterThan(0);
  });
});
