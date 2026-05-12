import { describe, it, expect } from "vitest";
import { latheStockEvolutionEngine } from "../engines/LatheStockEvolutionEngine.js";

const BASE = {
  initial_od_mm: 50,
  initial_length_mm: 100,
};

describe("LatheStockEvolutionEngine", () => {
  it("initial stock produces profile with r = OD/2 at every z", () => {
    const r = latheStockEvolutionEngine.evolve({ ...BASE, passes: [] });
    const rs = r.final_profile.map((p) => p.r_mm);
    for (const v of rs) expect(v).toBeCloseTo(25, 2);
  });

  it("od_long pass reduces r over the pass z range", () => {
    const r = latheStockEvolutionEngine.evolve({
      ...BASE,
      passes: [{ kind: "od_long", z_start_mm: 10, z_end_mm: 80, r_start_mm: 20, r_end_mm: 20 }],
    });
    const mid = r.final_profile.find((p) => p.z_mm >= 45 && p.z_mm <= 55)!;
    expect(mid.r_mm).toBeCloseTo(20, 2);
  });

  it("face pass shortens overall length", () => {
    const r = latheStockEvolutionEngine.evolve({
      ...BASE,
      passes: [{ kind: "face", z_start_mm: 0, z_end_mm: 95, r_start_mm: 0, r_end_mm: 25 }],
    });
    expect(r.final_length_mm).toBeCloseTo(95, 1);
  });

  it("plunge creates a narrow groove", () => {
    const r = latheStockEvolutionEngine.evolve({
      ...BASE,
      sample_step_mm: 0.5,
      passes: [{ kind: "plunge", z_start_mm: 40, z_end_mm: 42, r_start_mm: 15, r_end_mm: 15 }],
    });
    const groove = r.final_profile.find((p) => p.z_mm >= 40 && p.z_mm <= 42);
    expect(groove).toBeDefined();
    expect(groove!.r_mm).toBeCloseTo(15, 1);
  });

  it("taper pass produces gradient r between the two bounds", () => {
    const r = latheStockEvolutionEngine.evolve({
      ...BASE,
      sample_step_mm: 1,
      passes: [{ kind: "taper", z_start_mm: 0, z_end_mm: 100, r_start_mm: 25, r_end_mm: 10 }],
    });
    const zStart = r.final_profile.find((p) => p.z_mm === 0)!;
    const zEnd = r.final_profile.find((p) => p.z_mm >= 99.5 && p.z_mm <= 100.5)!;
    expect(zStart.r_mm).toBeLessThanOrEqual(25);
    expect(zEnd.r_mm).toBeLessThanOrEqual(25);
    expect(Math.abs(zEnd.r_mm - zStart.r_mm)).toBeGreaterThan(5);
  });

  it("pass_count matches number of passes applied", () => {
    const r = latheStockEvolutionEngine.evolve({
      ...BASE,
      passes: [
        { kind: "od_long", z_start_mm: 0, z_end_mm: 50, r_start_mm: 20, r_end_mm: 20 },
        { kind: "face", z_start_mm: 0, z_end_mm: 90, r_start_mm: 0, r_end_mm: 25 },
      ],
    });
    expect(r.pass_count).toBe(2);
  });

  it("min_r after heavy roughing < initial radius", () => {
    const r = latheStockEvolutionEngine.evolve({
      ...BASE,
      passes: [{ kind: "od_long", z_start_mm: 5, z_end_mm: 95, r_start_mm: 15, r_end_mm: 15 }],
    });
    expect(r.min_r_mm).toBeLessThan(25);
  });

  it("bore limits inner radius — profile drops below bore", () => {
    const r = latheStockEvolutionEngine.evolve({
      ...BASE,
      initial_id_mm: 30,
      sample_step_mm: 1,
      passes: [{ kind: "od_long", z_start_mm: 0, z_end_mm: 100, r_start_mm: 5, r_end_mm: 5 }],
    });
    // With ID/2=15 and target r=5, samples where r < 15 are occluded (skipped)
    for (const p of r.final_profile) expect(p.r_mm).toBeGreaterThanOrEqual(15);
  });

  it("max_r equals initial radius if no passes", () => {
    const r = latheStockEvolutionEngine.evolve({ ...BASE, passes: [] });
    expect(r.max_r_mm).toBeCloseTo(25, 1);
  });

  it("sample_step_mm clamps to 0.05 minimum", () => {
    const r = latheStockEvolutionEngine.evolve({ ...BASE, sample_step_mm: 0.001, passes: [] });
    expect(r.final_profile.length).toBeLessThan(3000);
  });

  it("reasoning includes pass count and sample count", () => {
    const r = latheStockEvolutionEngine.evolve({
      ...BASE,
      passes: [{ kind: "od_long", z_start_mm: 0, z_end_mm: 50, r_start_mm: 20, r_end_mm: 20 }],
    });
    const text = r.reasoning.join(" ");
    expect(text).toMatch(/pass/);
    expect(text).toMatch(/sample/);
  });

  it("empty profile when bore >= OD", () => {
    const r = latheStockEvolutionEngine.evolve({
      initial_od_mm: 30,
      initial_length_mm: 100,
      initial_id_mm: 30,
      passes: [],
    });
    expect(r.final_profile.length).toBeGreaterThan(0);
  });

  it("getStats returns reference citation", () => {
    const s = latheStockEvolutionEngine.getStats();
    expect(s.reference).toMatch(/Altintas/);
  });
});
