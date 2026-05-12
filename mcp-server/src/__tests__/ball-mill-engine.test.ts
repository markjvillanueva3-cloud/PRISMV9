/**
 * BallMillEngine — Unit Tests
 * @milestone FORGE-ENGINES-B50
 */
import { describe, it, expect } from "vitest";
import { ballMillEngine } from "../engines/BallMillEngine.js";

describe("BallMillEngine", () => {
  it("critical speed > 0", () => {
    const r = ballMillEngine.calculate({});
    expect(r.critical_speed.value).toBeGreaterThan(0);
  });

  it("operating speed < critical speed", () => {
    const r = ballMillEngine.calculate({});
    expect(r.operating_speed.value).toBeLessThan(
      r.critical_speed.value
    );
  });

  it("larger mill has lower critical speed", () => {
    const small = ballMillEngine.calculate({ mill_diameter_m: 2 });
    const large = ballMillEngine.calculate({ mill_diameter_m: 5 });
    expect(large.critical_speed.value).toBeLessThan(
      small.critical_speed.value
    );
  });

  it("power > 0", () => {
    const r = ballMillEngine.calculate({});
    expect(r.power_required.value).toBeGreaterThan(0);
  });

  it("finer product requires more power", () => {
    const coarse = ballMillEngine.calculate({ product_size_um: 200 });
    const fine = ballMillEngine.calculate({ product_size_um: 30 });
    expect(fine.power_required.value).toBeGreaterThan(
      coarse.power_required.value
    );
  });

  it("ball charge weight > 0", () => {
    const r = ballMillEngine.calculate({});
    expect(r.ball_charge_weight.value).toBeGreaterThan(0);
  });

  it("reduction ratio > 1", () => {
    const r = ballMillEngine.calculate({});
    expect(r.reduction_ratio.value).toBeGreaterThan(1);
  });

  it("specific energy > 0", () => {
    const r = ballMillEngine.calculate({});
    expect(r.specific_energy.value).toBeGreaterThan(0);
  });

  it("mill volume > 0", () => {
    const r = ballMillEngine.calculate({});
    expect(r.mill_volume.value).toBeGreaterThan(0);
  });

  it("warns high reduction ratio", () => {
    const r = ballMillEngine.calculate({
      feed_size_um: 20000, product_size_um: 50,
    });
    expect(r.warnings.some(w =>
      w.includes("eduction") || w.includes("two-stage")
    )).toBe(true);
  });
});
