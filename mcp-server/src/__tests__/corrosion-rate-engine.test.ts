/**
 * CorrosionRateEngine — Unit Tests
 * @milestone FORGE-ENGINES-B37
 */
import { describe, it, expect } from "vitest";
import { corrosionRateEngine } from "../engines/CorrosionRateEngine.js";

describe("CorrosionRateEngine", () => {
  it("corrosion rate > 0 with defaults", () => {
    const r = corrosionRateEngine.calculate({});
    expect(r.corrosion_rate_mmyr.value).toBeGreaterThan(0);
  });

  it("seawater corrodes faster than atmospheric", () => {
    const atm = corrosionRateEngine.calculate({ environment: "atmospheric" });
    const sea = corrosionRateEngine.calculate({ environment: "seawater" });
    expect(sea.corrosion_rate_mmyr.value).toBeGreaterThan(
      atm.corrosion_rate_mmyr.value
    );
  });

  it("316ss corrodes slower than carbon steel", () => {
    const cs = corrosionRateEngine.calculate({ material: "carbon_steel" });
    const ss = corrosionRateEngine.calculate({ material: "316ss" });
    expect(ss.corrosion_rate_mmyr.value).toBeLessThan(
      cs.corrosion_rate_mmyr.value
    );
  });

  it("higher temperature increases corrosion rate", () => {
    const cold = corrosionRateEngine.calculate({ temperature_c: 20 });
    const hot = corrosionRateEngine.calculate({ temperature_c: 80 });
    expect(hot.corrosion_rate_mmyr.value).toBeGreaterThan(
      cold.corrosion_rate_mmyr.value
    );
  });

  it("lower pH increases corrosion rate", () => {
    const neutral = corrosionRateEngine.calculate({ ph: 7 });
    const acidic = corrosionRateEngine.calculate({ ph: 3 });
    expect(acidic.corrosion_rate_mmyr.value).toBeGreaterThan(
      neutral.corrosion_rate_mmyr.value
    );
  });

  it("316ss has higher PREN than 304ss", () => {
    const ss304 = corrosionRateEngine.calculate({ material: "304ss" });
    const ss316 = corrosionRateEngine.calculate({ material: "316ss" });
    expect(ss316.pren.value).toBeGreaterThan(ss304.pren.value);
  });

  it("remaining life decreases with higher corrosion", () => {
    const mild = corrosionRateEngine.calculate({ environment: "atmospheric" });
    const harsh = corrosionRateEngine.calculate({ environment: "acid" });
    expect(harsh.remaining_life_years.value).toBeLessThan(
      mild.remaining_life_years.value
    );
  });

  it("warns H2S with carbon steel", () => {
    const r = corrosionRateEngine.calculate({
      material: "carbon_steel",
      environment: "h2s",
    });
    expect(r.warnings.some(w => w.includes("H₂S"))).toBe(true);
  });

  it("mpy = mmyr × 39.37 approximately", () => {
    const r = corrosionRateEngine.calculate({});
    const ratio = r.corrosion_rate_mpy.value / r.corrosion_rate_mmyr.value;
    expect(ratio).toBeCloseTo(39.37, 0);
  });

  it("titanium rated suitable in seawater", () => {
    const r = corrosionRateEngine.calculate({
      material: "titanium",
      environment: "seawater",
    });
    expect(r.material_suitability.unit).toBe("SUITABLE");
  });
});
