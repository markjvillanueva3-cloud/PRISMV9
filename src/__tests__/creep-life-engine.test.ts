/**
 * CreepLifeEngine — Unit Tests
 * @milestone FORGE-ENGINES-B37
 */
import { describe, it, expect } from "vitest";
import { creepLifeEngine } from "../engines/CreepLifeEngine.js";

describe("CreepLifeEngine", () => {
  it("rupture life > 0 with defaults", () => {
    const r = creepLifeEngine.calculate({});
    expect(r.rupture_life_hours.value).toBeGreaterThan(0);
  });

  it("higher temperature reduces rupture life", () => {
    const cool = creepLifeEngine.calculate({ temperature_c: 450 });
    const hot = creepLifeEngine.calculate({ temperature_c: 600 });
    expect(hot.rupture_life_hours.value).toBeLessThan(
      cool.rupture_life_hours.value
    );
  });

  it("higher stress reduces rupture life", () => {
    const low = creepLifeEngine.calculate({ stress_mpa: 40 });
    const high = creepLifeEngine.calculate({ stress_mpa: 120 });
    expect(high.rupture_life_hours.value).toBeLessThan(
      low.rupture_life_hours.value
    );
  });

  it("Inconel has more temperature margin than carbon steel", () => {
    const cs = creepLifeEngine.calculate({
      material: "carbon_steel",
      temperature_c: 400,
    });
    const inc = creepLifeEngine.calculate({
      material: "inconel_625",
      temperature_c: 400,
    });
    expect(inc.temperature_margin.value).toBeGreaterThan(
      cs.temperature_margin.value
    );
  });

  it("life fraction increases with service hours", () => {
    const fresh = creepLifeEngine.calculate({
      temperature_c: 600, stress_mpa: 80, service_hours: 1000,
    });
    const aged = creepLifeEngine.calculate({
      temperature_c: 600, stress_mpa: 80, service_hours: 50000,
    });
    expect(aged.life_fraction_used.value).toBeGreaterThan(
      fresh.life_fraction_used.value
    );
  });

  it("remaining life decreases with service hours", () => {
    const fresh = creepLifeEngine.calculate({
      temperature_c: 600, stress_mpa: 80, service_hours: 0,
    });
    const aged = creepLifeEngine.calculate({
      temperature_c: 600, stress_mpa: 80, service_hours: 50000,
    });
    expect(aged.remaining_life.value).toBeLessThan(
      fresh.remaining_life.value
    );
  });

  it("LMP > 0", () => {
    const r = creepLifeEngine.calculate({});
    expect(r.larson_miller_param.value).toBeGreaterThan(0);
  });

  it("time to 1% creep < rupture life", () => {
    const r = creepLifeEngine.calculate({});
    expect(r.time_to_1pct_creep.value).toBeLessThan(
      r.rupture_life_hours.value
    );
  });

  it("warns when temperature exceeds max", () => {
    const r = creepLifeEngine.calculate({
      material: "carbon_steel",
      temperature_c: 500,
    });
    expect(r.warnings.some(w => w.includes("exceeds max"))).toBe(true);
  });

  it("allowable stress > 0", () => {
    const r = creepLifeEngine.calculate({});
    expect(r.allowable_stress.value).toBeGreaterThan(0);
  });
});
