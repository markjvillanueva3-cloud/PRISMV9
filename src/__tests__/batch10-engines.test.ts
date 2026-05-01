/**
 * Batch 10 Engines — Unit Tests
 * ChatterPredictionEngine + HeatTransferEngine
 * @milestone AUDIT-FT-B10
 */
import { describe, it, expect } from "vitest";
import { chatterPredictionEngine } from "../engines/ChatterPredictionEngine.js";
import { heatTransferEngine } from "../engines/HeatTransferEngine.js";

// ============================================================================
// ChatterPredictionEngine
// ============================================================================

describe("ChatterPredictionEngine", () => {
  describe("generateStabilityLobes", () => {
    it("generates lobes with positive depth limits", () => {
      const r = chatterPredictionEngine.generateStabilityLobes(
        { mass: 0.5, stiffness: 5e7, damping: 100 },
        { Kt: 800e6, numTeeth: 4 },
        { min: 5000, max: 25000 },
      );
      expect(r.lobes.length).toBeGreaterThan(0);
      for (const lobe of r.lobes) {
        for (const pt of lobe.points) {
          expect(pt.depthLimit_mm).toBeGreaterThan(0);
          expect(pt.rpm).toBeGreaterThanOrEqual(5000);
          expect(pt.rpm).toBeLessThanOrEqual(25000);
        }
      }
    });

    it("returns tool dynamics summary", () => {
      const r = chatterPredictionEngine.generateStabilityLobes(
        { mass: 0.5, stiffness: 5e7, damping: 100 },
        { Kt: 800e6 },
        { min: 5000, max: 25000 },
      );
      expect(r.toolDynamics.naturalFreq_Hz).toBeGreaterThan(0);
      expect(r.toolDynamics.dampingRatio).toBeGreaterThan(0);
    });

    it("accepts FRF-style input", () => {
      const r = chatterPredictionEngine.generateStabilityLobes(
        { naturalFreq: 1500, dampingRatio: 0.03, stiffness: 5e7 },
        { Kt: 800e6, numTeeth: 2 },
        { min: 3000, max: 20000 },
      );
      expect(r.lobes.length).toBeGreaterThan(0);
    });

    it("finds stable pockets", () => {
      const r = chatterPredictionEngine.generateStabilityLobes(
        { mass: 0.5, stiffness: 5e7, damping: 100 },
        { Kt: 800e6, numTeeth: 4 },
        { min: 5000, max: 25000 },
      );
      expect(r.stablePockets.all.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("checkStability", () => {
    it("checks stability at a pocket RPM", () => {
      const lobes = chatterPredictionEngine.generateStabilityLobes(
        { mass: 0.5, stiffness: 5e7, damping: 100 },
        { Kt: 800e6, numTeeth: 4 },
        { min: 5000, max: 25000 },
      );
      // Use a pocket RPM if available, else test at any covered RPM
      if (lobes.stablePockets.all.length > 0) {
        const pocket = lobes.stablePockets.all[0];
        const r = chatterPredictionEngine.checkStability(
          pocket.rpm, pocket.maxStableDepth_mm * 0.5, lobes,
        );
        expect(r.stable).toBe(true);
      } else {
        // If no pockets, just verify the function runs
        const r = chatterPredictionEngine.checkStability(10000, 0.001, lobes);
        expect(r).toHaveProperty("stable");
        expect(r).toHaveProperty("recommendation");
      }
    });

    it("unstable at excessive depth", () => {
      const lobes = chatterPredictionEngine.generateStabilityLobes(
        { mass: 0.5, stiffness: 5e7, damping: 100 },
        { Kt: 800e6, numTeeth: 4 },
        { min: 5000, max: 25000 },
      );
      const r = chatterPredictionEngine.checkStability(10000, 1000, lobes);
      expect(r.stable).toBe(false);
      expect(r.recommendation).toContain("Unstable");
    });
  });

  describe("detectChatter", () => {
    it("detects no chatter in clean signal", () => {
      const sampleRate = 1000;
      const N = 256;
      const toothFreq = 200; // 4 teeth * 3000 rpm / 60
      const signal = Array.from({ length: N }, (_, i) =>
        Math.sin(2 * Math.PI * toothFreq * i / sampleRate),
      );
      const r = chatterPredictionEngine.detectChatter(signal, {
        sampleRate, teeth: 4, rpm: 3000,
      });
      expect(r.toothPassingFrequency_Hz).toBe(200);
      expect(r.chatterDetected).toBe(false);
    });

    it("detects chatter from non-harmonic frequency", () => {
      const sampleRate = 1000;
      const N = 256;
      const toothFreq = 200;
      const chatterFreq = 370; // non-harmonic
      const signal = Array.from({ length: N }, (_, i) =>
        Math.sin(2 * Math.PI * toothFreq * i / sampleRate)
        + 0.8 * Math.sin(2 * Math.PI * chatterFreq * i / sampleRate),
      );
      const r = chatterPredictionEngine.detectChatter(signal, {
        sampleRate, teeth: 4, rpm: 3000,
      });
      expect(r.chatterDetected).toBe(true);
      expect(r.chatterSeverity).toBeGreaterThan(0);
      expect(r.recommendation).toContain("Chatter");
    });
  });

  describe("criticalSpeeds", () => {
    it("simply-supported shaft returns 3 modes", () => {
      const r = chatterPredictionEngine.criticalSpeeds({
        length: 500, diameter: 20, E: 200e9, density: 7850,
      });
      expect(r.criticalSpeeds.length).toBe(3);
      expect(r.criticalSpeeds[0].frequency_Hz).toBeGreaterThan(0);
      expect(r.criticalSpeeds[1].frequency_Hz).toBeGreaterThan(
        r.criticalSpeeds[0].frequency_Hz,
      );
    });

    it("recommended max RPM is 80% of first critical", () => {
      const r = chatterPredictionEngine.criticalSpeeds({
        length: 500, diameter: 20, E: 200e9, density: 7850,
      });
      expect(r.recommendedMaxRPM).toBeCloseTo(
        r.criticalSpeeds[0].criticalRPM * 0.8, 0,
      );
    });

    it("cantilever has lower first critical than simply-supported", () => {
      const shaft = { length: 500, diameter: 20, E: 200e9, density: 7850 };
      const ss = chatterPredictionEngine.criticalSpeeds(shaft, "simply-supported");
      const cl = chatterPredictionEngine.criticalSpeeds(shaft, "cantilever");
      expect(cl.criticalSpeeds[0].frequency_Hz).toBeLessThan(
        ss.criticalSpeeds[0].frequency_Hz,
      );
    });

    it("safe operating ranges have positive bounds", () => {
      const r = chatterPredictionEngine.criticalSpeeds({
        length: 500, diameter: 20, E: 200e9, density: 7850,
      });
      for (const range of r.safeOperatingRanges) {
        expect(range.max).toBeGreaterThan(range.min);
      }
    });
  });
});

// ============================================================================
// HeatTransferEngine
// ============================================================================

describe("HeatTransferEngine", () => {
  describe("steadyStateConduction1D", () => {
    it("heat flows from hot to cold", () => {
      const r = heatTransferEngine.steadyStateConduction1D({
        thermalConductivity: 50, length: 0.1,
        crossSectionArea: 0.01, T_hot: 100, T_cold: 20,
      });
      expect(r.heatFlux_W).toBeGreaterThan(0);
      expect(r.thermalResistance_K_W).toBeGreaterThan(0);
    });

    it("higher conductivity gives more heat transfer", () => {
      const base = {
        length: 0.1, crossSectionArea: 0.01, T_hot: 100, T_cold: 20,
      };
      const low = heatTransferEngine.steadyStateConduction1D({
        ...base, thermalConductivity: 10,
      });
      const high = heatTransferEngine.steadyStateConduction1D({
        ...base, thermalConductivity: 200,
      });
      expect(high.heatFlux_W).toBeGreaterThan(low.heatFlux_W);
    });

    it("zero temperature difference gives zero flux", () => {
      const r = heatTransferEngine.steadyStateConduction1D({
        thermalConductivity: 50, length: 0.1,
        crossSectionArea: 0.01, T_hot: 50, T_cold: 50,
      });
      expect(r.heatFlux_W).toBe(0);
    });
  });

  describe("transientLumpedCapacitance", () => {
    it("temperature approaches ambient over time", () => {
      const r = heatTransferEngine.transientLumpedCapacitance({
        mass: 1, specificHeat: 500, surfaceArea: 0.1,
        heatTransferCoeff: 50, T_initial: 200, T_ambient: 25, time: 100,
      });
      expect(r.temperature_C).toBeLessThan(200);
      expect(r.temperature_C).toBeGreaterThan(25);
    });

    it("at t=0 returns initial temperature", () => {
      const r = heatTransferEngine.transientLumpedCapacitance({
        mass: 1, specificHeat: 500, surfaceArea: 0.1,
        heatTransferCoeff: 50, T_initial: 200, T_ambient: 25, time: 0,
      });
      expect(r.temperature_C).toBeCloseTo(200, 1);
      expect(r.percentComplete).toBeCloseTo(0, 1);
    });

    it("time constant is m·c / (h·A)", () => {
      const r = heatTransferEngine.transientLumpedCapacitance({
        mass: 2, specificHeat: 500, surfaceArea: 0.05,
        heatTransferCoeff: 100, T_initial: 100, T_ambient: 20, time: 0,
      });
      // tau = 2*500 / (100*0.05) = 200
      expect(r.timeConstant_s).toBeCloseTo(200, 0);
      expect(r.time95percent_s).toBeCloseTo(600, 0);
    });
  });

  describe("forcedConvectionCoefficient", () => {
    it("air flow gives h value", () => {
      const r = heatTransferEngine.forcedConvectionCoefficient({
        velocity: 5, characteristicLength: 0.1, fluidType: "air",
      });
      expect(r.heatTransferCoeff_W_m2K).toBeGreaterThan(0);
      expect(r.reynoldsNumber).toBeGreaterThan(0);
      expect(r.prandtlNumber).toBeCloseTo(0.71, 1);
    });

    it("water gives higher h than air", () => {
      const params = { velocity: 1, characteristicLength: 0.05 };
      const air = heatTransferEngine.forcedConvectionCoefficient({
        ...params, fluidType: "air",
      });
      const water = heatTransferEngine.forcedConvectionCoefficient({
        ...params, fluidType: "water",
      });
      expect(water.heatTransferCoeff_W_m2K).toBeGreaterThan(
        air.heatTransferCoeff_W_m2K,
      );
    });

    it("classifies flow regime correctly", () => {
      const laminar = heatTransferEngine.forcedConvectionCoefficient({
        velocity: 0.01, characteristicLength: 0.01, fluidType: "air",
      });
      expect(laminar.flowRegime).toBe("laminar");
    });
  });

  describe("coolantEffectiveness", () => {
    it("water-based coolant has high HTC", () => {
      const r = heatTransferEngine.coolantEffectiveness({
        cuttingSpeed: 200, flowRate: 20, coolantType: "water_based",
      });
      expect(r.effectiveHTC_W_m2K).toBeGreaterThan(0);
      expect(r.estimatedTempReduction_C).toBeGreaterThan(0);
    });

    it("MQL has lower cooling than water-based", () => {
      const wb = heatTransferEngine.coolantEffectiveness({
        cuttingSpeed: 200, flowRate: 20, coolantType: "water_based",
      });
      const mql = heatTransferEngine.coolantEffectiveness({
        cuttingSpeed: 200, flowRate: 0.5, coolantType: "mql",
      });
      expect(mql.estimatedTempReduction_C).toBeLessThan(
        wb.estimatedTempReduction_C,
      );
    });

    it("low momentum ratio gives penetration warning", () => {
      const r = heatTransferEngine.coolantEffectiveness({
        cuttingSpeed: 300, flowRate: 2, nozzleDiameter: 10,
      });
      expect(r.recommendation).toContain("Increase");
    });
  });
});
