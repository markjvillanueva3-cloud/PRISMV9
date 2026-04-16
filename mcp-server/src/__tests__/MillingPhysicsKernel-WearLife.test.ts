/**
 * MillingPhysicsKernel Wear/Life Wiring — MS-WIRE-1/U-WIRE-03
 *
 * Tests 9 wear/life engines wired through MillingPhysicsKernelEngine facade.
 */

import { describe, it, expect } from "vitest";
import { millingPhysicsKernelEngine } from "../engines/MillingPhysicsKernelEngine.js";

describe("MillingPhysicsKernel: Wear/Life wiring (MS-WIRE-1/U-WIRE-03)", () => {
  // ─── calculateWearRate (ToolWearRateEngine) ───────────────────────────────

  describe("calculateWearRate", () => {
    it("returns result for standard steel milling params", () => {
      const result = millingPhysicsKernelEngine.calculateWearRate({
        cutting_speed_mpm: 200,
        feed_mm: 0.1,
        depth_of_cut_mm: 2.0,
        tool_material: "carbide",
        workpiece: "steel",
      });
      expect(result).toBeDefined();
    });

    it("returns result for high-speed aluminum", () => {
      const result = millingPhysicsKernelEngine.calculateWearRate({
        cutting_speed_mpm: 800,
        feed_mm: 0.2,
        tool_material: "carbide",
        workpiece: "aluminum",
      });
      expect(result).toBeDefined();
    });

    it("returns result for titanium (harder wear)", () => {
      const result = millingPhysicsKernelEngine.calculateWearRate({
        cutting_speed_mpm: 80,
        feed_mm: 0.08,
        tool_material: "carbide",
        workpiece: "titanium",
      });
      expect(result).toBeDefined();
    });
  });

  // ─── calculateWearProgression (ToolWearProgressionEngine) ─────────────────

  describe("calculateWearProgression", () => {
    it("returns three-stage wear curve for steel", () => {
      const result = millingPhysicsKernelEngine.calculateWearProgression({
        cutting_speed_m_min: 200,
        feed_mm_rev: 0.1,
        depth_of_cut_mm: 2.0,
        tool_grade: "CARBIDE",
        workpiece_hardness_hrc: 30,
        cutting_time_min: 15,
      });
      expect(result).toBeDefined();
    });
  });

  // ─── calculateAdvancedWear (AdvancedWearPhysicsEngine) ────────────────────

  describe("calculateAdvancedWear", () => {
    it("routes to kannateyAsibuStochastic mechanism", () => {
      const result = millingPhysicsKernelEngine.calculateAdvancedWear("kannateyAsibu", {
        cutting_speed_mean: 200,
        cutting_speed_std: 10,
        feed_mean: 0.1,
        feed_std: 0.01,
        wearCoefficient_mean: 1e-6,
        wearCoefficient_std: 1e-7,
        samples: 100,
      });
      expect(result).toBeDefined();
    });

    it("routes to flankWearODE mechanism", () => {
      const result = millingPhysicsKernelEngine.calculateAdvancedWear("flankWearODE", {
        cutting_speed_m_min: 200,
        feed_mm_rev: 0.1,
        time_steps_min: [0, 5, 10, 15, 20, 25, 30],
        initial_VB_mm: 0.0,
        VB_threshold_mm: 0.3,
        breakin_constant: 0.002,
        steady_rate: 0.005,
        accel_constants: [0.01, 1.5],
      });
      expect(result).toBeDefined();
    });

    it("routes to combined mechanism", () => {
      const result = millingPhysicsKernelEngine.calculateAdvancedWear("combined", {
        cutting_speed_mpm: 200,
        feed_mm: 0.1,
        depth_mm: 2.0,
        time_min: 30,
        workpiece_hardness_HRC: 30,
        tool_material: "carbide",
      });
      expect(result).toBeDefined();
    });
  });

  // ─── calculateArchardWear (ArchardAdhesiveWearEngine) ─────────────────────

  describe("calculateArchardWear", () => {
    it("computes Archard adhesive wear volume", () => {
      const result = millingPhysicsKernelEngine.calculateArchardWear({
        tool_material: "carbide",
        workpiece_material: "steel",
        normal_force_N: 500,
        sliding_distance_m: 100,
      } as any);
      expect(result).toBeDefined();
    });
  });

  // ─── calculateStochasticWear (StochasticToolWearEngine) ──────────────────

  describe("calculateStochasticWear", () => {
    it("taylor life computes basic Taylor T=(C/V)^(1/n)", () => {
      const result = millingPhysicsKernelEngine.calculateStochasticWear("taylor", {
        V: 200, n: 0.25, C: 500,
      });
      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThan(0);
    });

    it("extendedTaylor computes with f and d exponents", () => {
      const result = millingPhysicsKernelEngine.calculateStochasticWear("extendedTaylor", {
        V: 200, f: 0.1, d: 2.0,
        n: 0.25, C: 500, a: 0.3, b: 0.15,
      });
      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThan(0);
    });

    it("usui wear rate computes flank wear rate", () => {
      const result = millingPhysicsKernelEngine.calculateStochasticWear("usui", {
        F_n: 100, V: 3.33, T: 600, A: 1e-5, B: 5000,
      });
      expect(typeof result).toBe("number");
    });
  });

  // ─── calculateStochasticToolLife (StochasticToolLifeEngine) ──────────────

  describe("calculateStochasticToolLife", () => {
    it("computes Weibull Monte Carlo tool life", () => {
      const result = millingPhysicsKernelEngine.calculateStochasticToolLife({
        material: "steel",
        cutting_speed_mpm: 200,
        feed_mm: 0.1,
        depth_mm: 2.0,
        tool_material: "carbide",
        coating: "TiAlN",
        n_trials: 500,
        method: "weibull",
      });
      expect(result).toBeDefined();
      expect(result.value).toBeDefined();
    });
  });

  // ─── createBayesianToolLifePredictor (BayesianToolLifeEngine) ────────────

  describe("createBayesianToolLifePredictor", () => {
    it("creates a Gaussian Process predictor", () => {
      const predictor = millingPhysicsKernelEngine.createBayesianToolLifePredictor({
        priorMeanLife: 60,
      });
      expect(predictor).toBeDefined();
    });

    it("creates predictor with default config", () => {
      const predictor = millingPhysicsKernelEngine.createBayesianToolLifePredictor();
      expect(predictor).toBeDefined();
    });
  });

  // ─── predictAdaptiveToolLife (ToolLifeAdaptiveEngine) ────────────────────

  describe("predictAdaptiveToolLife", () => {
    it("predicts Weibull-based replacement time", () => {
      const result = millingPhysicsKernelEngine.predictAdaptiveToolLife({
        wear_observations: [
          { time_min: 10, vb_mm: 0.05 },
          { time_min: 20, vb_mm: 0.10 },
          { time_min: 30, vb_mm: 0.15 },
          { time_min: 40, vb_mm: 0.22 },
          { time_min: 50, vb_mm: 0.28 },
        ],
        vb_limit_mm: 0.3,
        confidence_level: 0.95,
      });
      expect(result).toBeDefined();
    });
  });

  // ─── analyzeAdvancedCuttingPhenomena (AdvancedCuttingPhenomenaEngine) ────

  describe("analyzeAdvancedCuttingPhenomena", () => {
    it("returns engine for direct method access when no phenomenon specified", () => {
      const engine = millingPhysicsKernelEngine.analyzeAdvancedCuttingPhenomena({});
      expect(engine).toBeDefined();
    });
  });

  // ─── Registry updates ────────────────────────────────────────────────────

  describe("wiring registry", () => {
    it("getWiredEngines includes all 9 wear/life engines", () => {
      const wired = millingPhysicsKernelEngine.getWiredEngines();
      const wearEntries = wired.filter(e =>
        e.includes("Wear") || e.includes("Life") || e.includes("CuttingPhenomena")
      );
      expect(wearEntries.length).toBeGreaterThanOrEqual(9);
    });

    it("getWiringStats reports wear_life count of 9", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.wear_life).toBe(9);
    });

    it("total_engines increased to reflect wear wiring", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.total_engines).toBeGreaterThanOrEqual(25);
    });

    it("registry lists specific wear engines by name", () => {
      const wired = millingPhysicsKernelEngine.getWiredEngines();
      const names = wired.join(" ");
      expect(names).toContain("ToolWearRateEngine");
      expect(names).toContain("ToolWearProgressionEngine");
      expect(names).toContain("AdvancedWearPhysicsEngine");
      expect(names).toContain("ArchardAdhesiveWearEngine");
      expect(names).toContain("StochasticToolWearEngine");
      expect(names).toContain("StochasticToolLifeEngine");
      expect(names).toContain("BayesianToolLifeEngine");
      expect(names).toContain("ToolLifeAdaptiveEngine");
      expect(names).toContain("AdvancedCuttingPhenomenaEngine");
    });
  });
});
