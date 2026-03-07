/**
 * LeafSpringEngine — Unit Tests
 * @milestone FORGE-ENGINES-B46
 */
import { describe, it, expect } from "vitest";
import { leafSpringEngine } from "../engines/LeafSpringEngine.js";

describe("LeafSpringEngine", () => {
  it("bending stress > 0", () => {
    const r = leafSpringEngine.calculate({});
    expect(r.bending_stress.value).toBeGreaterThan(0);
  });

  it("deflection > 0", () => {
    const r = leafSpringEngine.calculate({});
    expect(r.deflection.value).toBeGreaterThan(0);
  });

  it("spring rate > 0", () => {
    const r = leafSpringEngine.calculate({});
    expect(r.spring_rate.value).toBeGreaterThan(0);
  });

  it("more leaves reduces stress", () => {
    const few = leafSpringEngine.calculate({ num_full_leaves: 2, num_graduated_leaves: 2 });
    const many = leafSpringEngine.calculate({ num_full_leaves: 4, num_graduated_leaves: 8 });
    expect(many.bending_stress.value).toBeLessThan(
      few.bending_stress.value
    );
  });

  it("thicker leaves reduces deflection", () => {
    const thin = leafSpringEngine.calculate({ leaf_thickness_mm: 6 });
    const thick = leafSpringEngine.calculate({ leaf_thickness_mm: 12 });
    expect(thick.deflection.value).toBeLessThan(
      thin.deflection.value
    );
  });

  it("effective leaves between nf and total", () => {
    const r = leafSpringEngine.calculate({
      num_full_leaves: 2,
      num_graduated_leaves: 6,
    });
    expect(r.effective_leaves.value).toBeGreaterThan(2);
    expect(r.effective_leaves.value).toBeLessThanOrEqual(8);
  });

  it("energy stored > 0", () => {
    const r = leafSpringEngine.calculate({});
    expect(r.energy_stored.value).toBeGreaterThan(0);
  });

  it("fatigue safety > 0", () => {
    const r = leafSpringEngine.calculate({});
    expect(r.fatigue_safety.value).toBeGreaterThan(0);
  });

  it("nip load > 0", () => {
    const r = leafSpringEngine.calculate({});
    expect(r.nip_load.value).toBeGreaterThan(0);
  });

  it("warns high stress ratio", () => {
    const r = leafSpringEngine.calculate({
      applied_load_n: 50000,
      num_full_leaves: 1,
      num_graduated_leaves: 1,
      leaf_thickness_mm: 5,
    });
    expect(r.warnings.some(w => w.includes("tress") || w.includes("atigue"))).toBe(true);
  });
});
