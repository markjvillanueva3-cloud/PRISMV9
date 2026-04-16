import { describe, it, expect } from "vitest";
import {
  coolantOptimizationPhysicsEngine,
  CoolantOptimizationPhysicsEngine,
} from "../../engines/CoolantOptimizationPhysicsEngine.js";

describe("CoolantOptimizationPhysicsEngine", () => {
  const engine = coolantOptimizationPhysicsEngine;

  it("exports a singleton instance", () => {
    expect(engine).toBeInstanceOf(CoolantOptimizationPhysicsEngine);
  });

  // ── A. fluidDelivery() — formulas 1, 3, 10 ──────────────────────

  describe("fluidDelivery()", () => {
    const base = {
      pipe_diameter_mm: 12,
      pipe_length_mm: 2000,
      flow_rate_lpm: 10,
      nozzle_diameter_mm: 2,
      supply_pressure_bar: 30,
    };

    it("computes Darcy-Weisbach pressure drop (formula 1)", () => {
      const r = engine.fluidDelivery(base);
      expect(r.pressure_drop_bar).toBeGreaterThan(0);
      expect(r.friction_factor).toBeGreaterThan(0);
      expect(r.reynolds_number).toBeGreaterThan(0);
    });

    it("identifies turbulent flow regime at high flow", () => {
      const r = engine.fluidDelivery(base);
      // Re for 10 LPM through 12mm pipe should be turbulent
      expect(r.flow_regime).toBe("turbulent");
      expect(r.reynolds_number).toBeGreaterThan(4000);
    });

    it("identifies laminar flow at low flow rate", () => {
      const r = engine.fluidDelivery({
        ...base,
        flow_rate_lpm: 0.1,
        pipe_diameter_mm: 20,
      });
      expect(r.flow_regime).toBe("laminar");
      expect(r.reynolds_number).toBeLessThan(2300);
    });

    it("computes jet coherence length (formula 3)", () => {
      const r = engine.fluidDelivery(base);
      // Lc = K × D_noz × (P/P_atm)^0.25 should be positive
      expect(r.jet_coherence_length_mm).toBeGreaterThan(0);
      // For 2mm nozzle at ~30 bar, coherence ~50-100mm
      expect(r.jet_coherence_length_mm).toBeGreaterThan(10);
    });

    it("computes nozzle velocity v = Cv × sqrt(2ΔP/ρ) (formula 10)", () => {
      const r = engine.fluidDelivery(base);
      expect(r.nozzle_velocity_m_s).toBeGreaterThan(0);
      // At ~30 bar effective, v ≈ 0.85 × sqrt(2×30e5/1000) ≈ 66 m/s
      expect(r.nozzle_velocity_m_s).toBeGreaterThan(20);
    });

    it("warns when pressure drop exceeds 80% of supply", () => {
      const r = engine.fluidDelivery({
        ...base,
        pipe_diameter_mm: 3,
        pipe_length_mm: 10000,
        supply_pressure_bar: 5,
      });
      expect(r.warnings.some((w) => w.includes("80%"))).toBe(true);
    });
  });

  // ── B. mqlPhysics() — formulas 2, 4 ─────────────────────────────

  describe("mqlPhysics()", () => {
    it("computes MQL droplet size d = K×(σ/ρ)^0.5×v^(-1) (formula 2)", () => {
      const r = engine.mqlPhysics({ air_velocity_m_s: 100 });
      expect(r.droplet_diameter_um).toBeGreaterThan(0);
      // Higher velocity → smaller droplets
      const r2 = engine.mqlPhysics({ air_velocity_m_s: 200 });
      expect(r2.droplet_diameter_um).toBeLessThan(r.droplet_diameter_um);
    });

    it("computes penetration distance Lpen = v × τ_evap (formula 4)", () => {
      const r = engine.mqlPhysics({ air_velocity_m_s: 100 });
      expect(r.penetration_distance_mm).toBeGreaterThan(0);
      expect(r.evaporation_time_ms).toBeGreaterThan(0);
    });

    it("returns zero for non-positive air velocity", () => {
      const r = engine.mqlPhysics({ air_velocity_m_s: 0 });
      expect(r.droplet_diameter_um).toBe(0);
      expect(r.warnings.length).toBeGreaterThan(0);
    });

    it("warns on very large droplets", () => {
      // Very low velocity → large droplets
      const r = engine.mqlPhysics({ air_velocity_m_s: 5 });
      expect(r.droplet_diameter_um).toBeGreaterThan(100);
      expect(r.warnings.some((w) => w.includes("100"))).toBe(true);
    });
  });

  // ── C. hpcDesign() — formula 5 ──────────────────────────────────

  describe("hpcDesign()", () => {
    const base = {
      chip_thickness_mm: 0.15,
      chip_width_mm: 3,
      chip_curl_radius_mm: 5,
      yield_strength_MPa: 800,
      nozzle_diameter_mm: 1.5,
    };

    it("computes HPC pressure from chip-curl force (formula 5)", () => {
      const r = engine.hpcDesign(base);
      expect(r.required_pressure_bar).toBeGreaterThan(0);
      expect(r.chip_break_force_N).toBeGreaterThan(0);
      expect(r.chip_curl_moment_Nmm).toBeGreaterThan(0);
      expect(r.jet_velocity_m_s).toBeGreaterThan(0);
    });

    it("thicker chips require higher pressure", () => {
      const thin = engine.hpcDesign({ ...base, chip_thickness_mm: 0.1 });
      const thick = engine.hpcDesign({ ...base, chip_thickness_mm: 0.3 });
      expect(thick.required_pressure_bar).toBeGreaterThan(
        thin.required_pressure_bar
      );
    });

    it("multiple nozzles reduce required pressure", () => {
      const one = engine.hpcDesign({ ...base, num_nozzles: 1 });
      const two = engine.hpcDesign({ ...base, num_nozzles: 2 });
      expect(two.required_pressure_bar).toBeLessThan(
        one.required_pressure_bar
      );
    });
  });

  // ── D. coolantHealth() — formulas 6, 7, 8 ────────────────────────

  describe("coolantHealth()", () => {
    it("computes concentration from refractometer (formula 6)", () => {
      const r = engine.coolantHealth({
        refractometer_brix: 7,
        refractometer_factor: 1.0,
        target_concentration_pct: 7,
      });
      expect(r.concentration_pct).toBe(7);
      expect(r.concentration_deviation_pct).toBe(0);
    });

    it("warns on low concentration", () => {
      const r = engine.coolantHealth({ refractometer_brix: 2 });
      expect(r.concentration_pct).toBe(2);
      expect(r.warnings.some((w) => w.includes("corrosion"))).toBe(true);
    });

    it("predicts pH drift over time (formula 7)", () => {
      const r = engine.coolantHealth({
        initial_pH: 9.2,
        days_since_change: 30,
        pH_decay_rate: 0.01,
      });
      expect(r.predicted_pH).not.toBeNull();
      // pH should decay: 9.2 × exp(-0.01 × 30) ≈ 6.81
      expect(r.predicted_pH!).toBeLessThan(9.2);
      expect(r.predicted_pH!).toBeGreaterThan(4);
    });

    it("flags critical pH status", () => {
      const r = engine.coolantHealth({
        initial_pH: 9.0,
        days_since_change: 60,
        pH_decay_rate: 0.02,
      });
      // 9.0 × exp(-0.02×60) ≈ 2.72, clamped to 4.0
      expect(r.pH_status).toBe("critical");
    });

    it("estimates tramp oil percentage (formula 8)", () => {
      const r = engine.coolantHealth({
        days_since_skim: 10,
        tramp_oil_ingress_rate_pct_day: 0.3,
        skimmer_efficiency: 0.6,
      });
      expect(r.tramp_oil_pct).not.toBeNull();
      // 0.3 × 10 × (1-0.6) = 1.2%
      expect(r.tramp_oil_pct!).toBeCloseTo(1.2, 1);
      expect(r.tramp_oil_status).toBe("acceptable");
    });

    it("flags critical tramp oil level", () => {
      const r = engine.coolantHealth({
        days_since_skim: 30,
        tramp_oil_ingress_rate_pct_day: 0.5,
        skimmer_efficiency: 0.3,
      });
      // 0.5 × 30 × 0.7 = 10.5%
      expect(r.tramp_oil_pct!).toBeGreaterThan(5);
      expect(r.tramp_oil_status).toBe("critical");
    });
  });

  // ── E. optimization() — formulas 9, 11 ───────────────────────────

  describe("optimization()", () => {
    const base = {
      candidate_flows_lpm: [5, 10, 15, 20, 30, 50],
      T0_C: 200,
      temperature_coeff_A: 500,
      temperature_exponent_n: 0.5,
      budget_per_hr: 2.0,
    };

    it("finds optimal flow minimizing temperature (formula 9)", () => {
      const r = engine.optimization(base);
      expect(r.optimal_flow_lpm).not.toBeNull();
      expect(r.min_temperature_C).not.toBeNull();
      // Higher flow → lower temp, so optimal should be highest feasible
      expect(r.optimal_flow_lpm!).toBeGreaterThan(0);
    });

    it("respects budget constraint", () => {
      const r = engine.optimization({ ...base, budget_per_hr: 0.001 });
      // Very low budget may exclude all candidates
      const feasCount = r.candidates.filter((c) => c.feasible).length;
      if (feasCount === 0) {
        expect(r.optimal_flow_lpm).toBeNull();
        expect(r.warnings.some((w) => w.includes("budget"))).toBe(true);
      }
    });

    it("computes heat removal Q_heat = m_dot × Cp × ΔT (formula 11)", () => {
      const r = engine.optimization({
        ...base,
        mass_flow_rate_kg_s: 0.5,
        delta_T_C: 15,
        coolant_Cp_J_kgK: 4180,
      });
      expect(r.heat_removal_W).not.toBeNull();
      // 0.5 × 4180 × 15 = 31350 W
      expect(r.heat_removal_W!).toBeCloseTo(31350, 0);
    });

    it("evaluates all candidate flows", () => {
      const r = engine.optimization(base);
      expect(r.candidates.length).toBe(base.candidate_flows_lpm.length);
      // Temperature should decrease with higher flow
      for (let i = 1; i < r.candidates.length; i++) {
        expect(r.candidates[i].temperature_C).toBeLessThan(
          r.candidates[i - 1].temperature_C
        );
      }
    });
  });

  // ── calculate() dispatcher ────────────────────────────────────────

  describe("calculate()", () => {
    it("dispatches fluid_delivery action", () => {
      const r = engine.calculate({
        action: "fluid_delivery",
        params: {
          pipe_diameter_mm: 12,
          pipe_length_mm: 2000,
          flow_rate_lpm: 10,
          nozzle_diameter_mm: 2,
          supply_pressure_bar: 30,
        },
      });
      expect(r.action).toBe("fluid_delivery");
      expect((r.result as any).pressure_drop_bar).toBeGreaterThan(0);
    });

    it("throws on unknown action", () => {
      expect(() =>
        engine.calculate({ action: "unknown" as any, params: {} })
      ).toThrow("Unknown");
    });
  });
});
