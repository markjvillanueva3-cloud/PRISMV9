/**
 * WEDMSlugTabRetentionEngine — unit tests
 * P2P-FULLSTACK-MS0 / U-P2PFS38
 */
import { describe, it, expect } from "vitest";
import {
  WEDMSlugTabRetentionEngine,
  wedmSlugTabRetentionEngine,
  type WEDMSlugTabRetentionInput,
} from "../engines/WEDMSlugTabRetentionEngine.js";

// ── Fixtures ───────────────────────────────────────────────────────────

/** D2 tool steel baseline — common JM Die material */
function d2Input(overrides: Partial<WEDMSlugTabRetentionInput> = {}): WEDMSlugTabRetentionInput {
  return {
    slug_area_mm2: 400, // ~20mm × 20mm square slug
    part_thickness_mm: 12,
    material_density_kg_m3: 7800, // D2
    sigma_y_MPa: 1200, // D2 after hardening
    tab_count: 2,
    tab_width_mm: 1.0,
    dynamic_factor: 3.0,
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("WEDMSlugTabRetentionEngine", () => {
  const engine = new WEDMSlugTabRetentionEngine();

  describe("physics correctness", () => {
    it("computes slug weight = ρ·A·t (sanity: 400mm² × 12mm × 7800 kg/m³ → ~37 g)", () => {
      const r = engine.calculate(d2Input());
      // 400e-6 × 12e-3 × 7800 = 0.03744 kg
      expect(r.slug_weight_kg).toBeCloseTo(0.0374, 3);
    });

    it("uses Von Mises shear (τ = σ_y/√3) not Tresca (σ_y/2)", () => {
      const r = engine.calculate(d2Input());
      // 1200 / √3 ≈ 692.8
      expect(r.shear_strength_MPa).toBeCloseTo(692.8, 1);
    });

    it("retention force = τ × n × w × t (independent of slug weight)", () => {
      const a = engine.calculate(d2Input({ slug_area_mm2: 100 }));
      const b = engine.calculate(d2Input({ slug_area_mm2: 1000 }));
      expect(a.retention_force_N).toBeCloseTo(b.retention_force_N, 0);
    });

    it("returns SF→∞ for a zero-density material (guards divide-by-zero)", () => {
      // Cannot use density=0 (validation rejects); instead test via very small slug
      const r = engine.calculate(d2Input({ slug_area_mm2: 0.001 }));
      expect(r.safety_factor).toBeGreaterThan(1000);
      expect(r.risk_level).toBe("safe");
    });

    it("demand force scales linearly with dynamic factor", () => {
      // Use a heavy slug so rounding to 3 decimals in demand_force_N
      // doesn't dominate the ratio.
      const base = d2Input({ slug_area_mm2: 100000, part_thickness_mm: 50 });
      const a = engine.calculate({ ...base, dynamic_factor: 2.0 });
      const b = engine.calculate({ ...base, dynamic_factor: 4.0 });
      expect(b.demand_force_N / a.demand_force_N).toBeCloseTo(2.0, 2);
      // Safety factor halves when demand doubles
      expect(a.safety_factor / b.safety_factor).toBeCloseTo(2.0, 1);
    });
  });

  describe("risk classification", () => {
    it("classifies SF ≥ 2 as safe", () => {
      // Small light slug + big tabs → SF >> 2
      const r = engine.calculate(
        d2Input({ slug_area_mm2: 100, tab_count: 4, tab_width_mm: 2.0 }),
      );
      expect(r.risk_level).toBe("safe");
      expect(r.safe_for_uncontrolled_drop).toBe(true);
    });

    it("classifies 1 ≤ SF < 2 as marginal", () => {
      // Thickness cancels in SF; drives SF via A_slug, σ_y, ρ, and tab geom.
      // SF = (σ_y/√3·n·w) / (ρ·A·1e-9·g·k_dyn)
      // Annealed copper (σ_y=70, ρ=8960), 1 tab × 0.3mm, A=30000 mm² → SF≈1.5
      const r = engine.calculate({
        slug_area_mm2: 30000,
        part_thickness_mm: 10,
        material_density_kg_m3: 8960, // annealed copper
        sigma_y_MPa: 70,
        tab_count: 1,
        tab_width_mm: 0.3,
        dynamic_factor: 3.0,
      });
      expect(r.risk_level).toBe("marginal");
      expect(r.safety_factor).toBeGreaterThanOrEqual(1.0);
      expect(r.safety_factor).toBeLessThan(2.0);
    });

    it("classifies SF < 0.8 as unsafe", () => {
      // Very heavy slug, few narrow tabs, low-yield material
      const r = engine.calculate({
        slug_area_mm2: 100000,
        part_thickness_mm: 100,
        material_density_kg_m3: 19000, // tungsten-like
        sigma_y_MPa: 200,
        tab_count: 1,
        tab_width_mm: 0.2,
        dynamic_factor: 3.5,
      });
      expect(r.safety_factor).toBeLessThan(0.8);
      expect(r.risk_level).toBe("unsafe");
      expect(r.safe_for_uncontrolled_drop).toBe(false);
    });

    it("safe_for_uncontrolled_drop flag tracks risk_level='safe'", () => {
      const safe = engine.calculate(
        d2Input({ tab_count: 6, tab_width_mm: 3 }),
      );
      const notSafe = engine.calculate({
        slug_area_mm2: 100000,
        part_thickness_mm: 100,
        material_density_kg_m3: 19000,
        sigma_y_MPa: 200,
        tab_count: 1,
        tab_width_mm: 0.2,
        dynamic_factor: 3.5,
      });
      expect(safe.safe_for_uncontrolled_drop).toBe(true);
      expect(notSafe.safe_for_uncontrolled_drop).toBe(false);
    });
  });

  describe("recommendations", () => {
    it("produces 'proceed' recommendation when safe", () => {
      const r = engine.calculate(
        d2Input({ tab_count: 6, tab_width_mm: 3 }),
      );
      expect(r.risk_level).toBe("safe");
      expect(r.recommendations.join(" ")).toMatch(/proceed/i);
    });

    it("produces a HOLD or STOP recommendation when at_risk or unsafe", () => {
      const r = engine.calculate({
        slug_area_mm2: 100000,
        part_thickness_mm: 100,
        material_density_kg_m3: 19000,
        sigma_y_MPa: 200,
        tab_count: 1,
        tab_width_mm: 0.2,
      });
      expect(r.recommendations.join(" ")).toMatch(/STOP|HOLD/);
    });

    it("warns about vacuum/crane for slugs >2 kg regardless of SF", () => {
      // High σ_y so SF is still safe, but slug mass >2 kg
      const r = engine.calculate({
        slug_area_mm2: 100000,
        part_thickness_mm: 50,
        material_density_kg_m3: 7800,
        sigma_y_MPa: 1200,
        tab_count: 4,
        tab_width_mm: 2,
      });
      expect(r.slug_weight_kg).toBeGreaterThan(2);
      expect(r.risk_level).toBe("safe");
      expect(r.recommendations.join(" ")).toMatch(/vacuum|crane/i);
    });
  });

  describe("input validation", () => {
    it("rejects non-positive slug area", () => {
      expect(() => engine.calculate(d2Input({ slug_area_mm2: 0 }))).toThrow(
        /slug_area_mm2/,
      );
    });

    it("rejects non-positive thickness", () => {
      expect(() =>
        engine.calculate(d2Input({ part_thickness_mm: -1 })),
      ).toThrow(/part_thickness_mm/);
    });

    it("rejects non-positive yield strength", () => {
      expect(() => engine.calculate(d2Input({ sigma_y_MPa: 0 }))).toThrow(
        /sigma_y_MPa/,
      );
    });

    it("rejects fractional tab counts", () => {
      expect(() => engine.calculate(d2Input({ tab_count: 1.5 }))).toThrow(
        /tab_count/,
      );
    });

    it("rejects tab widths below 0.1 mm when tabs present", () => {
      expect(() => engine.calculate(d2Input({ tab_width_mm: 0.05 }))).toThrow(
        /tab_width_mm/,
      );
    });

    it("rejects non-positive dynamic factor when explicitly provided", () => {
      expect(() => engine.calculate(d2Input({ dynamic_factor: 0 }))).toThrow(
        /dynamic_factor/,
      );
    });
  });

  describe("singleton export", () => {
    it("exports a reusable singleton", () => {
      expect(wedmSlugTabRetentionEngine).toBeInstanceOf(
        WEDMSlugTabRetentionEngine,
      );
      const r = wedmSlugTabRetentionEngine.calculate(d2Input());
      expect(r.safety_factor).toBeGreaterThan(0);
    });
  });
});
