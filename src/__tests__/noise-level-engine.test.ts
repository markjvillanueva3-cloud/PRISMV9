/**
 * NoiseLevelEngine — Unit Tests
 * @milestone FORGE-ENGINES-B38
 */
import { describe, it, expect } from "vitest";
import { noiseLevelEngine } from "../engines/NoiseLevelEngine.js";

describe("NoiseLevelEngine", () => {
  it("combined level > 0 with defaults", () => {
    const r = noiseLevelEngine.calculate({});
    expect(r.combined_level.value).toBeGreaterThan(0);
  });

  it("level decreases with distance", () => {
    const near = noiseLevelEngine.calculate({ receiver_distance_m: 1 });
    const far = noiseLevelEngine.calculate({ receiver_distance_m: 10 });
    expect(far.level_at_receiver.value).toBeLessThan(
      near.level_at_receiver.value
    );
  });

  it("multiple sources louder than single", () => {
    const one = noiseLevelEngine.calculate({ source_levels_dba: [85] });
    const three = noiseLevelEngine.calculate({
      source_levels_dba: [85, 85, 85],
    });
    expect(three.combined_level.value).toBeGreaterThan(
      one.combined_level.value
    );
  });

  it("grinder louder than lathe", () => {
    const lathe = noiseLevelEngine.calculate({ machine_type: "lathe" });
    const grinder = noiseLevelEngine.calculate({ machine_type: "grinder" });
    expect(grinder.combined_level.value).toBeGreaterThan(
      lathe.combined_level.value
    );
  });

  it("barrier reduces level", () => {
    const noBrr = noiseLevelEngine.calculate({ barrier_height_m: 0 });
    const brr = noiseLevelEngine.calculate({ barrier_height_m: 3 });
    expect(brr.level_at_receiver.value).toBeLessThan(
      noBrr.level_at_receiver.value
    );
  });

  it("hearing protection reduces protected level", () => {
    const none = noiseLevelEngine.calculate({ hearing_protection_nrr: 0 });
    const hpp = noiseLevelEngine.calculate({ hearing_protection_nrr: 29 });
    expect(hpp.protected_level.value).toBeLessThan(
      none.protected_level.value
    );
  });

  it("longer exposure increases dose", () => {
    const short = noiseLevelEngine.calculate({ exposure_hours: 2 });
    const long = noiseLevelEngine.calculate({ exposure_hours: 8 });
    expect(long.noise_dose_pct.value).toBeGreaterThan(
      short.noise_dose_pct.value
    );
  });

  it("warns TWA exceeds action level for loud machine", () => {
    const r = noiseLevelEngine.calculate({
      machine_type: "press",
      receiver_distance_m: 1,
    });
    expect(r.warnings.some(w => w.includes("action level") || w.includes("PEL"))).toBe(true);
  });

  it("max exposure hours > 0", () => {
    const r = noiseLevelEngine.calculate({});
    expect(r.max_exposure_hours.value).toBeGreaterThan(0);
  });

  it("distance for 85dBA > 0", () => {
    const r = noiseLevelEngine.calculate({});
    expect(r.distance_for_85dba.value).toBeGreaterThan(0);
  });
});
