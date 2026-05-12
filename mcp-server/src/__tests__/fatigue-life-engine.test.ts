/**
 * FatigueLifeEngine — Unit Tests
 * @milestone FORGE-ENGINES-B31
 */
import { describe, it, expect } from "vitest";
import { fatigueLifeEngine } from "../engines/FatigueLifeEngine.js";

describe("FatigueLifeEngine", () => {
  it("endurance limit ≈ 0.5 × Sut for steel ≤ 1400 MPa", () => {
    const r = fatigueLifeEngine.calculate({
      ultimate_strength_mpa: 600,
      surface_finish: "mirror",
      kt_geometric: 1.0,
    });
    // Se' = 300, with mirror finish ka ≈ 1, Se ≈ 300 × kb × kc × kd
    expect(r.endurance_limit.value).toBeGreaterThan(150);
    expect(r.endurance_limit.value).toBeLessThan(350);
  });

  it("machined surface worse than ground", () => {
    const ground = fatigueLifeEngine.calculate({ surface_finish: "ground" });
    const machined = fatigueLifeEngine.calculate({ surface_finish: "machined" });
    expect(machined.ka_surface.value).toBeLessThan(ground.ka_surface.value);
  });

  it("larger part has lower kb", () => {
    const small = fatigueLifeEngine.calculate({ part_diameter_mm: 10 });
    const big = fatigueLifeEngine.calculate({ part_diameter_mm: 100 });
    expect(big.kb_size.value).toBeLessThan(small.kb_size.value);
  });

  it("higher reliability lowers kc", () => {
    const r50 = fatigueLifeEngine.calculate({ reliability_pct: 50 });
    const r99 = fatigueLifeEngine.calculate({ reliability_pct: 99 });
    expect(r99.kc_reliability.value).toBeLessThan(r50.kc_reliability.value);
  });

  it("stress concentration increases Kf", () => {
    const smooth = fatigueLifeEngine.calculate({ kt_geometric: 1.0 });
    const notch = fatigueLifeEngine.calculate({
      kt_geometric: 3.0,
      notch_radius_mm: 1,
    });
    expect(notch.kf_fatigue_conc.value).toBeGreaterThan(
      smooth.kf_fatigue_conc.value
    );
  });

  it("infinite life when stress < endurance limit", () => {
    const r = fatigueLifeEngine.calculate({
      ultimate_strength_mpa: 800,
      stress_amplitude_mpa: 50,
      mean_stress_mpa: 0,
    });
    expect(r.infinite_life.unit).toBe("YES");
  });

  it("finite life when stress > endurance limit", () => {
    const r = fatigueLifeEngine.calculate({
      ultimate_strength_mpa: 600,
      stress_amplitude_mpa: 400,
      mean_stress_mpa: 0,
    });
    expect(r.infinite_life.unit).toBe("NO");
    expect(r.cycles_to_failure.value).toBeGreaterThan(0);
    expect(r.cycles_to_failure.value).toBeLessThan(1e9);
  });

  it("mean stress reduces safety factor (Goodman)", () => {
    const zero = fatigueLifeEngine.calculate({
      stress_amplitude_mpa: 100,
      mean_stress_mpa: 0,
    });
    const tensile = fatigueLifeEngine.calculate({
      stress_amplitude_mpa: 100,
      mean_stress_mpa: 200,
    });
    expect(tensile.safety_factor.value).toBeLessThan(
      zero.safety_factor.value
    );
  });

  it("Miner damage from load blocks", () => {
    const r = fatigueLifeEngine.calculate({
      ultimate_strength_mpa: 600,
      load_blocks: [
        { stress_amplitude: 400, cycles: 50000 },
        { stress_amplitude: 300, cycles: 100000 },
      ],
    });
    expect(r.miner_damage.value).toBeGreaterThan(0);
  });

  it("high temp derates kd", () => {
    const cold = fatigueLifeEngine.calculate({ operating_temp_c: 20 });
    const hot = fatigueLifeEngine.calculate({ operating_temp_c: 400 });
    expect(hot.kd_temperature.value).toBeLessThan(cold.kd_temperature.value);
  });
});
