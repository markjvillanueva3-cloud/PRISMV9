/**
 * MillingPhysicsKernel Stability/Chatter Wiring — MS-WIRE-1/U-WIRE-05
 *
 * Tests 9 stability engines wired through MillingPhysicsKernelEngine facade.
 */

import { describe, it, expect } from "vitest";
import { millingPhysicsKernelEngine } from "../engines/MillingPhysicsKernelEngine.js";

describe("MillingPhysicsKernel: Stability wiring (MS-WIRE-1/U-WIRE-05)", () => {
  // ─── predictRegenerativeChatter / generateRegenerativeLobes ───────────────

  describe("regenerativeChatterPredictor wiring", () => {
    it("predictRegenerativeChatter returns chatter analysis", () => {
      const result = millingPhysicsKernelEngine.predictRegenerativeChatter({
        spindle_rpm: 6000,
        depth_of_cut_mm: 2.0,
        kc_N_mm2: 2000,
        a_e_mm: 5,
        tool_diameter_mm: 10,
        flutes: 4,
        natural_freq_Hz: 800,
        damping_ratio: 0.03,
        stiffness_N_per_m: 1e7,
      } as any);
      expect(result).toBeDefined();
    });

    it("generateRegenerativeLobes returns SLD points over RPM range", () => {
      const lobes = millingPhysicsKernelEngine.generateRegenerativeLobes(
        {
          kc_N_mm2: 2000,
          a_e_mm: 5,
          tool_diameter_mm: 10,
          flutes: 4,
          natural_freq_Hz: 800,
          damping_ratio: 0.03,
          stiffness_N_per_m: 1e7,
        } as any,
        [3000, 10000],
      );
      expect(Array.isArray(lobes)).toBe(true);
    });
  });

  // ─── calculateStochasticChatter ──────────────────────────────────────────

  describe("stochasticChatterEngine wiring", () => {
    it("computes stochastic chatter with FRF uncertainty", () => {
      const result = millingPhysicsKernelEngine.calculateStochasticChatter({
        material: "steel",
        speed_range_rpm: [3000, 10000],
        speed_points: 10,
        depth_range_mm: [0.5, 5.0],
        depth_points: 5,
        flute_count: 4,
        tool_diameter_mm: 10,
        natural_freq_hz: 800,
        damping_ratio: 0.03,
        stiffness_nm: 1e7,
        n_trials: 100,
      });
      expect(result).toBeDefined();
    });
  });

  // ─── analyzeMDOFStability ─────────────────────────────────────────────────

  describe("mdofStabilityEngine wiring", () => {
    it("routes analyticalModes method", () => {
      const result = millingPhysicsKernelEngine.analyzeMDOFStability("analyticalModes", {
        length_mm: 50,
        diameter_mm: 10,
        E_GPa: 200,
        rho_kg_per_m3: 7850,
      });
      expect(result).toBeDefined();
    });
  });

  // ─── rewriteStableRPM ─────────────────────────────────────────────────────

  describe("stabilityRPMRewriter wiring", () => {
    it("rewrites G-code to avoid chatter zones", () => {
      const gcode = "N10 S6000 M03\nN20 G1 X10 F100\nN30 S8000\nN40 G1 X20";
      const lobes = [
        { rpm: 4000, stableDoc_mm: 1.5 },
        { rpm: 6000, stableDoc_mm: 0.8 },
        { rpm: 8000, stableDoc_mm: 2.0 },
        { rpm: 10000, stableDoc_mm: 3.0 },
      ];
      const result = millingPhysicsKernelEngine.rewriteStableRPM(gcode, {
        lobes,
        toolFlutes: 4,
        currentDoc_mm: 1.2,
      });
      expect(result).toBeDefined();
    });

    it("analyzes chatter risk in G-code without rewriting", () => {
      const gcode = "N10 S6000 M03\nN20 G1 X10 F100";
      const lobes = [
        { rpm: 4000, stableDoc_mm: 1.5 },
        { rpm: 6000, stableDoc_mm: 0.8 },
      ];
      const result = millingPhysicsKernelEngine.analyzeChatterRiskInGCode(gcode, {
        lobes,
        toolFlutes: 4,
        currentDoc_mm: 1.2,
      });
      expect(result).toBeDefined();
    });

    it("generates analytical SLD diagram", () => {
      const sld = millingPhysicsKernelEngine.generateAnalyticalSLD({
        naturalFreq_Hz: 800,
        dampingRatio: 0.03,
        stiffness_N_per_m: 1e7,
        kc_N_per_mm2: 2000,
        toolFlutes: 4,
        rpmMin: 3000,
        rpmMax: 12000,
      } as any);
      expect(sld).toBeDefined();
    });
  });

  // ─── analyzeVibration ─────────────────────────────────────────────────────

  describe("vibrationAnalysisEngine wiring", () => {
    it("computes SDOF natural frequency", () => {
      const result = millingPhysicsKernelEngine.analyzeVibration("sdofNatural", {
        mass: 1.0,
        stiffness: 1e6,
        damping: 10,
      });
      expect(result).toBeDefined();
    });

    it("generates FRF over frequency range", () => {
      const result = millingPhysicsKernelEngine.analyzeVibration("frf", {
        system: { mass: 1.0, stiffness: 1e6, damping: 10 },
        freq_range: { start: 10, end: 2000, points: 50 },
      });
      expect(result).toBeDefined();
    });

    it("performs modal analysis on 2x2 system", () => {
      const result = millingPhysicsKernelEngine.analyzeVibration("modal", {
        M: [[1, 0], [0, 1]],
        K: [[2e6, -1e6], [-1e6, 2e6]],
      });
      expect(result).toBeDefined();
    });
  });

  // ─── optimizeDamping ──────────────────────────────────────────────────────

  describe("dampingOptimizationEngine wiring", () => {
    it("optimize returns damping comparison", () => {
      const result = millingPhysicsKernelEngine.optimizeDamping({
        natural_freq_Hz: 800,
        damping_ratio_baseline: 0.03,
        flutes: 4,
        tool_diameter_mm: 10,
      } as any);
      expect(result).toBeDefined();
    });
  });

  // ─── analyzeMachineVibration ──────────────────────────────────────────────

  describe("machineVibrationEngine wiring", () => {
    it("analyzes machine structural vibration", () => {
      const result = millingPhysicsKernelEngine.analyzeMachineVibration({
        spindle_rpm: 8000,
        excitation_freq_Hz: 133,
        machine_mass_kg: 2500,
        foundation_stiffness_N_per_m: 1e9,
      } as any);
      expect(result).toBeDefined();
    });
  });

  // ─── analyzeThinFeatureVibration ──────────────────────────────────────────

  describe("thinFloorVibrationEngine wiring", () => {
    it("routes analyze method for thin floor", () => {
      const result = millingPhysicsKernelEngine.analyzeThinFeatureVibration("analyze", {
        length_mm: 100,
        width_mm: 50,
        thickness_mm: 2.0,
        material: "aluminum",
        cutting_force_N: 200,
      } as any);
      expect(result).toBeDefined();
    });
  });

  // ─── Registry updates ────────────────────────────────────────────────────

  describe("wiring registry", () => {
    it("getWiredEngines includes all 9 stability engines", () => {
      const wired = millingPhysicsKernelEngine.getWiredEngines();
      const names = wired.join(" ");
      expect(names).toContain("ChatterPredictionEngine");
      expect(names).toContain("RegenerativeChatterPredictor");
      expect(names).toContain("StochasticChatterEngine");
      expect(names).toContain("MDOFStabilityEngine");
      expect(names).toContain("StabilityRPMRewriterEngine");
      expect(names).toContain("VibrationAnalysisEngine");
      expect(names).toContain("DampingOptimizationEngine");
      expect(names).toContain("MachineVibrationEngine");
      expect(names).toContain("ThinFloorVibrationEngine");
    });

    it("getWiringStats reports stability count >= 10", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.stability).toBeGreaterThanOrEqual(10);
    });

    it("total_engines reflects combined wiring", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.total_engines).toBeGreaterThanOrEqual(34);
    });
  });
});
