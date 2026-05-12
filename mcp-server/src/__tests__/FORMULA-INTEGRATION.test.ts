/**
 * FORMULA-INTEGRATION.test.ts
 *
 * Tests for CrossDisciplinaryFormulaIntegrationEngine.
 * Verifies all 4 public methods across all 8 domains with real physics assertions.
 *
 * Sources under test:
 *   PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js (158 KB)
 *   PRISM_ADVANCED_CROSS_DOMAIN_v1.js (33 KB)
 *   PRISM_UNIVERSITY_COURSE_REFERENCE_v1.js (128 KB)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  CrossDisciplinaryFormulaIntegrationEngine,
  crossDisciplinaryFormulaIntegrationEngine,
  CROSS_DISCIPLINARY_FORMULA_ENTRIES,
  STEFAN_BOLTZMANN,
  BOLTZMANN_CONSTANT,
  AVOGADRO_NUMBER,
  GAS_CONSTANT_R,
  SPEED_OF_SOUND_AIR,
  type CrossDisciplinaryDomain,
  type FormulaApplicationResult,
  type FormulaValidationResult,
  type FormulaExplanation,
  type CrossDisciplinaryRegistryEntry,
} from "../engines/CrossDisciplinaryFormulaIntegrationEngine.js";

// ============================================================================
// INSTANTIATION
// ============================================================================

describe("CrossDisciplinaryFormulaIntegrationEngine", () => {
  describe("instantiation", () => {
    it("should export a singleton instance", () => {
      expect(crossDisciplinaryFormulaIntegrationEngine).toBeInstanceOf(
        CrossDisciplinaryFormulaIntegrationEngine
      );
    });

    it("should construct a fresh instance via constructor", () => {
      const engine = new CrossDisciplinaryFormulaIntegrationEngine();
      expect(engine).toBeInstanceOf(CrossDisciplinaryFormulaIntegrationEngine);
    });

    it("should load at least 30 formulas across 8 domains", () => {
      const stats = crossDisciplinaryFormulaIntegrationEngine.getStats();
      expect(stats.totalFormulas).toBeGreaterThanOrEqual(30);
      expect(Object.keys(stats.byDomain).length).toBeGreaterThanOrEqual(8);
    });

    it("should expose canonical physics constants at correct NIST values", () => {
      expect(STEFAN_BOLTZMANN).toBeCloseTo(5.670374419e-8, 14);
      expect(BOLTZMANN_CONSTANT).toBeCloseTo(1.380649e-23, 28);
      expect(AVOGADRO_NUMBER).toBeCloseTo(6.02214076e23, 16);
      expect(GAS_CONSTANT_R).toBeCloseTo(8.314462618, 6);
      expect(SPEED_OF_SOUND_AIR).toBe(343.0);
    });

    it("should wire CANONICAL_KIENZLE groups into stats", () => {
      const stats = crossDisciplinaryFormulaIntegrationEngine.getStats();
      expect(stats.kienzleGroups).toContain("P");
      expect(stats.kienzleGroups).toContain("M");
      expect(stats.kienzleGroups).toContain("H");
    });
  });

  // ============================================================================
  // applyFormula — Physics domain
  // ============================================================================

  describe("applyFormula — physics domain", () => {
    it("should compute cutting heat generation correctly", () => {
      // Q = Fc × Vc × η / 60 = 1000 × 100 × 0.9 / 60 = 1500 W
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "physics",
        "cutting_heat_generation",
        { Fc: 1000, Vc: 100, eta_heat: 0.9 }
      );
      expect(result.output).toBeCloseTo(1500, 3);
      expect(result.domain).toBe("physics");
      expect(result.unit).toBe("W");
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it("should inject default eta_heat when omitted", () => {
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "physics",
        "cutting_heat_generation",
        { Fc: 600, Vc: 60 }
      );
      // 600 × 60 × 0.9 / 60 = 540 W
      expect(result.output).toBeCloseTo(540, 3);
    });

    it("should compute Carnot efficiency between 800°C and 25°C", () => {
      // η = 1 − 298/1073 = 0.7224
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "physics",
        "carnot_cooling_efficiency",
        { T_hot: 1073, T_cold: 298 }
      );
      expect(result.output).toBeCloseTo(0.7224, 3);
    });

    it("should compute Stefan-Boltzmann radiation using canonical σ constant", () => {
      // P = 0.3 × 5.67e-8 × 0.0001 × (1073^4 − 298^4)
      const sigma = STEFAN_BOLTZMANN;
      const expected = 0.3 * sigma * 0.0001 * (Math.pow(1073, 4) - Math.pow(298, 4));
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "physics",
        "stefan_boltzmann_radiation",
        { T_surface: 1073, T_ambient: 298, area: 0.0001, emissivity: 0.3 }
      );
      expect(result.output).toBeCloseTo(expected, 5);
    });

    it("should compute entropy generation rate correctly", () => {
      // S_gen = 1000/298 − 1000/1073 = 3.356 − 0.932 = 2.424 W/K
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "physics",
        "entropy_generation",
        { Q: 1000, T_cold: 298, T_hot: 1073 }
      );
      expect(result.output).toBeCloseTo(2.424, 2);
      expect(result.unit).toBe("W/K");
    });

    it("should compute Gibbs free energy for chemical wear", () => {
      // ΔG = −50 − 1000×20/1000 = −50 − 20 = −70 kJ/mol
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "physics",
        "gibbs_free_energy_wear",
        { deltaH: -50, T: 1000, deltaS: 20 }
      );
      expect(result.output).toBeCloseTo(-70, 5);
    });

    it("should compute Reynolds number correctly", () => {
      // Re = 1000×5×0.003/0.001 = 15000
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "physics",
        "reynolds_number",
        { density: 1000, velocity: 5, diameter: 0.003, viscosity: 0.001 }
      );
      expect(result.output).toBeCloseTo(15000, 1);
    });

    it("should compute chip evacuation drag force", () => {
      // F = 0.5 × 1000 × 9 × 1.28 × 0.00001 = 0.0576 N
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "physics",
        "chip_evacuation_force",
        { fluid_density: 1000, flow_velocity: 3, drag_coeff: 1.28, chip_area: 0.00001 }
      );
      expect(result.output).toBeCloseTo(0.0576, 5);
    });

    it("should compute Darcy-Weisbach pressure loss", () => {
      // ΔP = 0.02 × (5/0.01) × (1000×9/2) = 0.02 × 500 × 4500 = 45000 Pa
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "physics",
        "coolant_line_loss",
        { friction_factor: 0.02, length: 5, diameter: 0.01, density: 1000, velocity: 3 }
      );
      expect(result.output).toBeCloseTo(45000, 1);
    });

    it("should compute Bernoulli pressure", () => {
      // P2 = 200000 + 0.5×1000×(1−25) = 200000 − 12000 = 188000 Pa
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "physics",
        "bernoulli_pressure",
        { P1: 200000, v1: 1, v2: 5, density: 1000 }
      );
      expect(result.output).toBeCloseTo(188000, 1);
    });
  });

  // ============================================================================
  // applyFormula — Biology domain
  // ============================================================================

  describe("applyFormula — biology domain", () => {
    it("should compute pheromone update for ACO", () => {
      // τ_new = (1−0.1)×5 + 2 = 4.5 + 2 = 6.5
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "biology",
        "pheromone_update",
        { evaporation_rate: 0.1, tau_old: 5, delta_tau: 2 }
      );
      expect(result.output).toBeCloseTo(6.5, 5);
    });

    it("should compute genetic fitness correctly", () => {
      // fitness = 1 / (12 + 0 + 0 + 0.001) = 0.08332
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "biology",
        "genetic_fitness",
        { cycle_time: 12 }
      );
      expect(result.output as number).toBeCloseTo(1 / 12.001, 5);
    });

    it("should compute Wright's learning curve for 8th unit at 80% rate", () => {
      // b = log(0.8)/log(2) ≈ −0.3219
      // Y_8 = 100 × 8^(−0.3219) ≈ 51.2
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "biology",
        "wrights_learning_curve",
        { first_unit_time: 100, unit_number: 8, learning_rate: 0.8 }
      );
      expect(result.output as number).toBeCloseTo(51.2, 0);
    });
  });

  // ============================================================================
  // applyFormula — Economics domain
  // ============================================================================

  describe("applyFormula — economics domain", () => {
    it("should compute VaR at 95% confidence", () => {
      // VaR = 1000 − 1.65×100 = 835
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "economics",
        "value_at_risk",
        { mean: 1000, std_dev: 100, confidence_level: 0.95 }
      );
      expect(result.output).toBeCloseTo(835, 1);
    });

    it("should compute Kelly criterion fraction", () => {
      // f* = (0.7×2 − 0.3)/2 = (1.4−0.3)/2 = 0.55
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "economics",
        "kelly_criterion",
        { win_probability: 0.7, payoff_ratio: 2 }
      );
      expect(result.output).toBeCloseTo(0.55, 5);
    });

    it("should compute dynamic pricing at high utilization", () => {
      // utilization=0.9 > 0.8 → premium = (0.9−0.8)/0.2 = 0.5
      // price = 100×(1 + (2−1)×0.5) = 100×1.5 = 150
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "economics",
        "dynamic_pricing",
        { base_price: 100, utilization: 0.9, min_multiplier: 0.8, max_multiplier: 2.0 }
      );
      expect(result.output).toBeCloseTo(150, 5);
    });

    it("should compute portfolio expected return", () => {
      // E[R] = 0.6×0.15 + 0.4×0.08 = 0.09 + 0.032 = 0.122
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "economics",
        "portfolio_return",
        { w0: 0.6, r0: 0.15, w1: 0.4, r1: 0.08 }
      );
      expect(result.output).toBeCloseTo(0.122, 5);
    });
  });

  // ============================================================================
  // applyFormula — Information Theory domain
  // ============================================================================

  describe("applyFormula — information_theory domain", () => {
    it("should compute maximum entropy for uniform binary distribution", () => {
      // H = −(0.5×log2(0.5) + 0.5×log2(0.5)) = 1 bit
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "information_theory",
        "shannon_entropy",
        { p0: 0.5, p1: 0.5 }
      );
      expect(result.output).toBeCloseTo(1.0, 5);
    });

    it("should return zero entropy for deterministic distribution", () => {
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "information_theory",
        "shannon_entropy",
        { p0: 1.0 }
      );
      expect(result.output).toBeCloseTo(0.0, 5);
    });

    it("should compute Shannon-Hartley channel capacity", () => {
      // C = 1e6 × log2(1 + 100) = 1e6 × 6.658 ≈ 6.66 Mbps
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "information_theory",
        "shannon_hartley_capacity",
        { bandwidth: 1e6, signal_power: 100, noise_power: 1 }
      );
      expect(result.output as number).toBeCloseTo(1e6 * Math.log2(101), 0);
    });

    it("should compute information gain", () => {
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "information_theory",
        "information_gain",
        { entropy_before: 1.0, conditional_entropy: 0.4 }
      );
      expect(result.output).toBeCloseTo(0.6, 5);
    });
  });

  // ============================================================================
  // applyFormula — Statistics domain
  // ============================================================================

  describe("applyFormula — statistics domain", () => {
    it("should compute Bayesian posterior correctly", () => {
      // P(H|E) = (0.85×0.2)/0.35 = 0.4857
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "statistics",
        "bayesian_posterior",
        { likelihood: 0.85, prior: 0.2, marginal: 0.35 }
      );
      expect(result.output).toBeCloseTo(0.4857, 3);
    });

    it("should compute Gaussian likelihood at the mean (peak value)", () => {
      // L = 1/(0.5√2π) ≈ 0.7979
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "statistics",
        "gaussian_likelihood",
        { observation: 1.0, mean: 1.0, std_dev: 0.5 }
      );
      expect(result.output).toBeCloseTo(1 / (0.5 * Math.sqrt(2 * Math.PI)), 4);
    });

    it("should return a Monte Carlo result object with mean near base_time", () => {
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "statistics",
        "monte_carlo_cycle_time",
        { base_time: 10, std_dev_pct: 0.1, num_samples: 500 }
      );
      const output = result.output as Record<string, number>;
      expect(output.mean).toBeCloseTo(10, 0); // within 1 minute
      expect(output.stdDev).toBeGreaterThan(0);
      expect(output.p5).toBeLessThan(output.p95);
    });
  });

  // ============================================================================
  // applyFormula — Chemistry domain
  // ============================================================================

  describe("applyFormula — chemistry domain", () => {
    it("should compute Arrhenius rate constant using canonical GAS_CONSTANT_R", () => {
      // k = 1e10 × exp(−50000 / (8.314×1000)) = 1e10 × exp(−6.011)
      const expected = 1e10 * Math.exp(-50000 / (GAS_CONSTANT_R * 1000));
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "chemistry",
        "arrhenius_rate_constant",
        { A: 1e10, Ea: 50000, T: 1000 }
      );
      expect(result.output).toBeCloseTo(expected, -3);
    });

    it("should compute coolant degradation (first-order decay)", () => {
      // C = 1.0 × exp(−0.005×200) = exp(−1) ≈ 0.3679
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "chemistry",
        "coolant_degradation",
        { C0: 1.0, k: 0.005, t: 200 }
      );
      expect(result.output).toBeCloseTo(Math.exp(-1), 5);
    });

    it("should compute Arrhenius wear ratio (temperature increase amplifies wear)", () => {
      // ratio = exp(−80000/8.314 × (1/900 − 1/700))
      const expected = Math.exp((-80000 / GAS_CONSTANT_R) * (1 / 900 - 1 / 700));
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "chemistry",
        "arrhenius_wear_ratio",
        { Ea: 80000, T1: 700, T2: 900 }
      );
      expect(result.output).toBeCloseTo(expected, 4);
      expect(result.output as number).toBeGreaterThan(1); // wear increases at higher T
    });
  });

  // ============================================================================
  // applyFormula — Operations Research domain
  // ============================================================================

  describe("applyFormula — operations_research domain", () => {
    it("should compute M/M/1 utilization", () => {
      // ρ = 8/10 = 0.8
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "operations_research",
        "mm1_utilization",
        { arrival_rate: 8, service_rate: 10 }
      );
      expect(result.output).toBeCloseTo(0.8, 5);
    });

    it("should compute M/M/1 average queue length (Pollaczek-Khinchine formula)", () => {
      // Lq = ρ²/(1−ρ) = 0.64/0.2 = 3.2
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "operations_research",
        "mm1_queue_length",
        { arrival_rate: 8, service_rate: 10 }
      );
      expect(result.output).toBeCloseTo(3.2, 5);
    });

    it("should compute M/M/1 average time in system (Little's Law)", () => {
      // W = 1/(10−8) = 0.5 h
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "operations_research",
        "mm1_time_in_system",
        { arrival_rate: 8, service_rate: 10 }
      );
      expect(result.output).toBeCloseTo(0.5, 5);
    });

    it("should compute Economic Order Quantity", () => {
      // Q* = √(2×1200×50/5) = √24000 ≈ 154.9
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "operations_research",
        "economic_order_quantity",
        { annual_demand: 1200, order_cost: 50, holding_cost: 5 }
      );
      expect(result.output).toBeCloseTo(Math.sqrt((2 * 1200 * 50) / 5), 3);
    });

    it("should compute safety stock with 95% service level", () => {
      // σ_L = √(7×4 + 25×1) = √(28+25) = √53 ≈ 7.28
      // SS = 1.65 × 7.28 ≈ 12.0
      const sigma_L = Math.sqrt(7 * 4 + 25 * 1);
      const expected = 1.65 * sigma_L;
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "operations_research",
        "safety_stock",
        { avg_demand: 5, demand_std_dev: 2, avg_lead_time: 7, lead_time_std_dev: 1, service_level: 0.95 }
      );
      expect(result.output).toBeCloseTo(expected, 3);
    });
  });

  // ============================================================================
  // applyFormula — Finance domain
  // ============================================================================

  describe("applyFormula — finance domain", () => {
    it("should compute Black-Scholes call value and return a positive number", () => {
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "finance",
        "black_scholes_call",
        { S: 1000000, K: 800000, r: 0.05, sigma: 0.3, T: 1 }
      );
      expect(result.output as number).toBeGreaterThan(0);
      // Deep in the money: call value > intrinsic value (S - K×e^{-rT})
      const intrinsic = 1000000 - 800000 * Math.exp(-0.05);
      expect(result.output as number).toBeGreaterThanOrEqual(intrinsic * 0.9);
    });

    it("should compute Sharpe ratio", () => {
      // SR = (0.15 − 0.03) / 0.08 = 1.5
      const result = crossDisciplinaryFormulaIntegrationEngine.applyFormula(
        "finance",
        "sharpe_ratio",
        { avg_return: 0.15, risk_free_rate: 0.03, std_dev: 0.08 }
      );
      expect(result.output).toBeCloseTo(1.5, 5);
    });
  });

  // ============================================================================
  // applyFormula — Error Cases
  // ============================================================================

  describe("applyFormula — error handling", () => {
    it("should throw for unknown formula name", () => {
      expect(() =>
        crossDisciplinaryFormulaIntegrationEngine.applyFormula("physics", "nonexistent_formula", {})
      ).toThrow(/Unknown formula/);
    });

    it("should throw when domain does not match formula", () => {
      expect(() =>
        crossDisciplinaryFormulaIntegrationEngine.applyFormula(
          "biology",
          "reynolds_number",
          { density: 1000, velocity: 5, diameter: 0.003, viscosity: 0.001 }
        )
      ).toThrow(/domain/);
    });

    it("should throw when required parameter is missing after validation", () => {
      expect(() =>
        crossDisciplinaryFormulaIntegrationEngine.applyFormula(
          "physics",
          "reynolds_number",
          { density: 1000 } // missing velocity, diameter, viscosity
        )
      ).toThrow(/Validation failed/);
    });
  });

  // ============================================================================
  // findRelevantFormulas
  // ============================================================================

  describe("findRelevantFormulas", () => {
    it("should return results for thermal/heat query", () => {
      const results = crossDisciplinaryFormulaIntegrationEngine.findRelevantFormulas(
        "cutting heat thermal temperature management"
      );
      expect(results.length).toBeGreaterThan(0);
      const names = results.map((r) => r.formulaName);
      expect(names).toContain("cutting_heat_generation");
    });

    it("should return results for coolant flow query", () => {
      const results = crossDisciplinaryFormulaIntegrationEngine.findRelevantFormulas(
        "coolant flow pressure nozzle"
      );
      expect(results.length).toBeGreaterThan(0);
      const names = results.map((r) => r.formulaName);
      expect(names.some((n) => n.includes("coolant") || n.includes("reynolds") || n.includes("bernoulli"))).toBe(true);
    });

    it("should return results sorted by descending relevance score", () => {
      const results = crossDisciplinaryFormulaIntegrationEngine.findRelevantFormulas(
        "queue scheduling lead time inventory order"
      );
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].relevanceScore).toBeGreaterThanOrEqual(results[i].relevanceScore);
      }
    });

    it("should respect maxResults limit", () => {
      const results = crossDisciplinaryFormulaIntegrationEngine.findRelevantFormulas(
        "temperature heat energy cost",
        3
      );
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("should return empty array for completely irrelevant query", () => {
      const results = crossDisciplinaryFormulaIntegrationEngine.findRelevantFormulas(
        "xyzzy quux frobnicator irrelevant12345"
      );
      expect(results.length).toBe(0);
    });

    it("should find Bayesian formula for probabilistic query", () => {
      const results = crossDisciplinaryFormulaIntegrationEngine.findRelevantFormulas(
        "bayesian probability inference posterior"
      );
      const names = results.map((r) => r.formulaName);
      expect(names.some((n) => n.includes("bayesian") || n.includes("gaussian"))).toBe(true);
    });

    it("each result should have formulaName, domain, relevanceScore, description", () => {
      const results = crossDisciplinaryFormulaIntegrationEngine.findRelevantFormulas("wear chemical");
      for (const r of results) {
        expect(r.formulaName).toBeTruthy();
        expect(r.domain).toBeTruthy();
        expect(r.relevanceScore).toBeGreaterThan(0);
        expect(r.description).toBeTruthy();
        expect(r.manufacturingApplication).toBeTruthy();
      }
    });
  });

  // ============================================================================
  // validateFormula
  // ============================================================================

  describe("validateFormula", () => {
    it("should pass valid Reynolds number inputs", () => {
      const result = crossDisciplinaryFormulaIntegrationEngine.validateFormula(
        "reynolds_number",
        { density: 1000, velocity: 5, diameter: 0.003, viscosity: 0.001 }
      );
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should fail for unknown formula", () => {
      const result = crossDisciplinaryFormulaIntegrationEngine.validateFormula(
        "nonexistent_formula",
        {}
      );
      expect(result.valid).toBe(false);
      expect(result.issues[0]).toMatch(/Unknown formula/);
    });

    it("should fail when required parameter is missing", () => {
      const result = crossDisciplinaryFormulaIntegrationEngine.validateFormula(
        "reynolds_number",
        { density: 1000 }
      );
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("velocity"))).toBe(true);
    });

    it("should fail for temperature of zero Kelvin", () => {
      const result = crossDisciplinaryFormulaIntegrationEngine.validateFormula(
        "carnot_cooling_efficiency",
        { T_hot: 0, T_cold: 298 }
      );
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("T_hot"))).toBe(true);
    });

    it("should fail when Carnot T_cold >= T_hot", () => {
      const result = crossDisciplinaryFormulaIntegrationEngine.validateFormula(
        "carnot_cooling_efficiency",
        { T_hot: 300, T_cold: 500 }
      );
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("Carnot"))).toBe(true);
    });

    it("should fail when M/M/1 arrival rate >= service rate", () => {
      const result = crossDisciplinaryFormulaIntegrationEngine.validateFormula(
        "mm1_queue_length",
        { arrival_rate: 15, service_rate: 10 }
      );
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("stability"))).toBe(true);
    });

    it("should warn but not fail when M/M/1 utilization is high (>0.9)", () => {
      const result = crossDisciplinaryFormulaIntegrationEngine.validateFormula(
        "mm1_utilization",
        { arrival_rate: 9.5, service_rate: 10 }
      );
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes("saturation"))).toBe(true);
    });

    it("should fail for invalid probability value", () => {
      const result = crossDisciplinaryFormulaIntegrationEngine.validateFormula(
        "bayesian_posterior",
        { likelihood: 1.5, prior: 0.2, marginal: 0.35 }
      );
      expect(result.valid).toBe(false);
    });

    it("should fail for non-finite input", () => {
      const result = crossDisciplinaryFormulaIntegrationEngine.validateFormula(
        "reynolds_number",
        { density: Infinity, velocity: 5, diameter: 0.003, viscosity: 0.001 }
      );
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("non-finite"))).toBe(true);
    });
  });

  // ============================================================================
  // generateFormulaExplanation
  // ============================================================================

  describe("generateFormulaExplanation", () => {
    it("should return explanation with all required fields for a known formula", () => {
      const explanation = crossDisciplinaryFormulaIntegrationEngine.generateFormulaExplanation(
        "stefan_boltzmann_radiation"
      );
      expect(explanation).not.toBeNull();
      const ex = explanation as FormulaExplanation;
      expect(ex.formulaName).toBe("stefan_boltzmann_radiation");
      expect(ex.domain).toBe("physics");
      expect(ex.laypersonSummary).toBeTruthy();
      expect(ex.mathematicalDefinition).toContain("ε");
      expect(ex.variables.length).toBeGreaterThan(0);
      expect(ex.workedExample.inputs).toBeDefined();
      expect(ex.workedExample.narrative).toBeTruthy();
      expect(ex.manufacturingContext).toBeTruthy();
      expect(ex.references.length).toBeGreaterThan(0);
    });

    it("should return null for unknown formula", () => {
      const explanation = crossDisciplinaryFormulaIntegrationEngine.generateFormulaExplanation(
        "nonexistent_formula"
      );
      expect(explanation).toBeNull();
    });

    it("should include domain label in layperson summary for physics formula", () => {
      const explanation = crossDisciplinaryFormulaIntegrationEngine.generateFormulaExplanation(
        "reynolds_number"
      );
      expect(explanation?.laypersonSummary).toContain("Physics");
    });

    it("should include manufacturing context in layperson summary", () => {
      const explanation = crossDisciplinaryFormulaIntegrationEngine.generateFormulaExplanation(
        "economic_order_quantity"
      );
      expect(explanation?.laypersonSummary).toContain("manufacturing");
    });

    it("should list related formulas for thermodynamics entries", () => {
      const explanation = crossDisciplinaryFormulaIntegrationEngine.generateFormulaExplanation(
        "cutting_heat_generation"
      );
      expect(explanation?.relatedFormulas.length).toBeGreaterThan(0);
      expect(explanation?.relatedFormulas).toContain("carnot_cooling_efficiency");
    });

    it("should produce worked example with matching output from implementation", () => {
      const explanation = crossDisciplinaryFormulaIntegrationEngine.generateFormulaExplanation(
        "carnot_cooling_efficiency"
      );
      const ex = explanation?.workedExample;
      // Verify the worked example inputs produce correct output
      const computed = 1 - ex!.inputs.T_cold / ex!.inputs.T_hot;
      expect(ex!.output).toBeCloseTo(computed, 3);
    });
  });

  // ============================================================================
  // FormulaRegistry integration
  // ============================================================================

  describe("FormulaRegistry integration — exportRegistryEntries()", () => {
    it("should export at least 30 registry entries", () => {
      expect(CROSS_DISCIPLINARY_FORMULA_ENTRIES.length).toBeGreaterThanOrEqual(30);
    });

    it("each entry should have required FormulaRegistry fields", () => {
      for (const entry of CROSS_DISCIPLINARY_FORMULA_ENTRIES) {
        expect(entry.formula_id).toBeTruthy();
        expect(entry.formula_id).toMatch(/^XD-/);
        expect(entry.name).toBeTruthy();
        expect(entry.domain).toBeTruthy();
        expect(entry.category).toBeTruthy();
        expect(entry.equation).toBeTruthy();
        expect(entry.description).toBeTruthy();
        expect(Array.isArray(entry.parameters)).toBe(true);
        expect(Array.isArray(entry.consumers)).toBe(true);
      }
    });

    it("should include the CrossDisciplinaryFormulaIntegrationEngine as a consumer", () => {
      for (const entry of CROSS_DISCIPLINARY_FORMULA_ENTRIES) {
        expect(entry.consumers).toContain("CrossDisciplinaryFormulaIntegrationEngine");
      }
    });

    it("should generate unique formula IDs", () => {
      const ids = CROSS_DISCIPLINARY_FORMULA_ENTRIES.map((e) => e.formula_id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it("should list parameters with required_inputs validation", () => {
      const physicsEntry = CROSS_DISCIPLINARY_FORMULA_ENTRIES.find(
        (e) => e.formula_id === "XD-REYNOLDS-NUMBER"
      );
      expect(physicsEntry).toBeDefined();
      expect(physicsEntry!.validation.required_inputs).toContain("density");
    });
  });

  // ============================================================================
  // getStats and listFormulaNames
  // ============================================================================

  describe("getStats and listFormulaNames", () => {
    it("should list physics formulas", () => {
      const names = crossDisciplinaryFormulaIntegrationEngine.listFormulaNames("physics");
      expect(names.length).toBeGreaterThan(5);
      expect(names).toContain("reynolds_number");
      expect(names).toContain("stefan_boltzmann_radiation");
    });

    it("should list all formulas when no domain specified", () => {
      const all = crossDisciplinaryFormulaIntegrationEngine.listFormulaNames();
      const byDomain = crossDisciplinaryFormulaIntegrationEngine.getStats().byDomain;
      const totalByDomain = Object.values(byDomain).reduce((s, v) => s + v, 0);
      expect(all.length).toBe(totalByDomain);
    });

    it("should return empty array for domain with no formulas (graceful)", () => {
      // Force-cast an unknown domain to test guard
      const names = crossDisciplinaryFormulaIntegrationEngine.listFormulaNames(
        "unknown_domain" as CrossDisciplinaryDomain
      );
      expect(names).toEqual([]);
    });

    it("stats byDomain should count correct formulas per domain", () => {
      const stats = crossDisciplinaryFormulaIntegrationEngine.getStats();
      expect(stats.byDomain["physics"]).toBeGreaterThanOrEqual(8); // 10 physics formulas
      expect(stats.byDomain["operations_research"]).toBeGreaterThanOrEqual(4);
      expect(stats.byDomain["chemistry"]).toBeGreaterThanOrEqual(3);
    });
  });
});
