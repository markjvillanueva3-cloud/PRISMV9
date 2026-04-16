/**
 * Batch 9 Engines — Unit Tests
 * VibrationAnalysisEngine + ThermalModelingEngine
 * @milestone AUDIT-FT-B9
 */
import { describe, it, expect } from "vitest";
import { vibrationAnalysisEngine } from "../engines/VibrationAnalysisEngine.js";
import { thermalModelingEngine } from "../engines/ThermalModelingEngine.js";

// ============================================================================
// VibrationAnalysisEngine
// ============================================================================

describe("VibrationAnalysisEngine", () => {
  const system = { mass: 10, stiffness: 40000, damping: 50 };

  describe("sdofNaturalFrequency", () => {
    it("computes undamped natural frequency", () => {
      const r = vibrationAnalysisEngine.sdofNaturalFrequency({ mass: 10, stiffness: 40000 });
      // f_n = sqrt(40000/10) / (2π) ≈ 10.07 Hz
      expect(r.undampedNaturalFreq_Hz).toBeCloseTo(10.07, 1);
      expect(r.dampingRatio).toBe(0);
      expect(r.qualityFactor).toBe(Infinity);
      expect(r.systemType).toBe("underdamped");
    });

    it("underdamped system with damping", () => {
      const r = vibrationAnalysisEngine.sdofNaturalFrequency(system);
      expect(r.dampingRatio).toBeGreaterThan(0);
      expect(r.dampingRatio).toBeLessThan(1);
      expect(r.dampedNaturalFreq_Hz).toBeLessThan(r.undampedNaturalFreq_Hz);
      expect(r.logarithmicDecrement).not.toBeNull();
      expect(r.systemType).toBe("underdamped");
    });

    it("critically damped system", () => {
      const c_crit = 2 * Math.sqrt(40000 * 10);
      const r = vibrationAnalysisEngine.sdofNaturalFrequency({
        mass: 10, stiffness: 40000, damping: c_crit,
      });
      expect(r.dampingRatio).toBeCloseTo(1, 4);
      expect(r.systemType).toBe("critically_damped");
    });

    it("overdamped system", () => {
      const r = vibrationAnalysisEngine.sdofNaturalFrequency({
        mass: 10, stiffness: 40000, damping: 2000,
      });
      expect(r.dampingRatio).toBeGreaterThan(1);
      expect(r.systemType).toBe("overdamped");
    });
  });

  describe("sdofFreeResponse", () => {
    it("undamped oscillation conserves energy (t=0 returns initial)", () => {
      const r = vibrationAnalysisEngine.sdofFreeResponse(
        { mass: 10, stiffness: 40000 },
        { x0: 1, v0: 0 }, 0,
      );
      expect(r.position).toBeCloseTo(1, 6);
      expect(r.velocity).toBeCloseTo(0, 6);
    });

    it("damped response decays over time", () => {
      const r0 = vibrationAnalysisEngine.sdofFreeResponse(system, { x0: 1, v0: 0 }, 0);
      const r1 = vibrationAnalysisEngine.sdofFreeResponse(system, { x0: 1, v0: 0 }, 0.5);
      expect(Math.abs(r1.position)).toBeLessThan(Math.abs(r0.position));
    });
  });

  describe("sdofForcedResponse", () => {
    it("resonance when frequency ratio ≈ 1", () => {
      const omega_n = Math.sqrt(40000 / 10);
      const r = vibrationAnalysisEngine.sdofForcedResponse(
        system, { amplitude: 100, frequency: omega_n },
      );
      expect(r.isResonant).toBe(true);
      expect(r.magnificationFactor).toBeGreaterThan(1);
      expect(r.frequencyRatio).toBeCloseTo(1, 1);
    });

    it("low frequency ratio gives MF ≈ 1", () => {
      const r = vibrationAnalysisEngine.sdofForcedResponse(
        system, { amplitude: 100, frequency: 1 },
      );
      expect(r.magnificationFactor).toBeCloseTo(1, 1);
      expect(r.isResonant).toBe(false);
    });

    it("power dissipated is non-negative", () => {
      const omega_n = Math.sqrt(40000 / 10);
      const r = vibrationAnalysisEngine.sdofForcedResponse(
        system, { amplitude: 100, frequency: omega_n * 0.5 },
      );
      expect(r.powerDissipated).toBeGreaterThanOrEqual(0);
    });
  });

  describe("generateFRF", () => {
    it("produces correct number of points", () => {
      const r = vibrationAnalysisEngine.generateFRF(
        system, { start: 1, end: 30, points: 200 },
      );
      expect(r.data.length).toBe(200);
    });

    it("peak near natural frequency", () => {
      const r = vibrationAnalysisEngine.generateFRF(
        system, { start: 1, end: 30, points: 500 },
      );
      expect(r.resonanceFreq).toBeCloseTo(10, 0);
      expect(r.peakMagnitude).toBeGreaterThan(0);
    });

    it("half-power bandwidth is positive", () => {
      const r = vibrationAnalysisEngine.generateFRF(
        system, { start: 1, end: 30, points: 500 },
      );
      expect(r.halfPowerBandwidth).not.toBeNull();
      expect(r.halfPowerBandwidth!).toBeGreaterThan(0);
    });
  });

  describe("modalAnalysis", () => {
    it("2-DOF system returns 2 modes", () => {
      const M = [[1, 0], [0, 1]];
      const K = [[2000, -1000], [-1000, 2000]];
      const r = vibrationAnalysisEngine.modalAnalysis(M, K);
      expect(r.numberOfModes).toBe(2);
      expect(r.modes[0].frequency_Hz).toBeGreaterThan(0);
      expect(r.modes[1].frequency_Hz).toBeGreaterThanOrEqual(r.modes[0].frequency_Hz);
    });

    it("mode shapes are normalized", () => {
      const M = [[1, 0], [0, 1]];
      const K = [[3000, -1000], [-1000, 3000]];
      const r = vibrationAnalysisEngine.modalAnalysis(M, K);
      for (const mode of r.modes) {
        const norm = Math.sqrt(mode.modeShape.reduce((s, v) => s + v * v, 0));
        expect(norm).toBeCloseTo(1, 1);
      }
    });
  });
});

// ============================================================================
// ThermalModelingEngine
// ============================================================================

describe("ThermalModelingEngine", () => {
  describe("loewenShawTemperature", () => {
    const baseParams = {
      cuttingSpeed: 200, feed: 0.2, depthOfCut: 2,
      specificCuttingForce: 2500, materialDensity: 7850,
      specificHeat: 500, thermalConductivity: 50,
    };

    it("temperature rise is positive", () => {
      const r = thermalModelingEngine.loewenShawTemperature(baseParams);
      expect(r.temperatureRise_C).toBeGreaterThan(0);
      expect(r.shearZoneTemp_C).toBeGreaterThan(20);
    });

    it("interface temp > max tool temp > ambient", () => {
      const r = thermalModelingEngine.loewenShawTemperature(baseParams);
      expect(r.interfaceTemp_C).toBeGreaterThan(r.maxToolTemp_C);
      expect(r.maxToolTemp_C).toBeGreaterThan(20);
    });

    it("higher speed increases temperature", () => {
      const slow = thermalModelingEngine.loewenShawTemperature({
        ...baseParams, cuttingSpeed: 50,
      });
      const fast = thermalModelingEngine.loewenShawTemperature({
        ...baseParams, cuttingSpeed: 300,
      });
      expect(fast.temperatureRise_C).toBeGreaterThan(slow.temperatureRise_C);
    });

    it("heat partition sums to 1", () => {
      const r = thermalModelingEngine.loewenShawTemperature(baseParams);
      const sum = r.heatPartition.chip + r.heatPartition.tool + r.heatPartition.workpiece;
      expect(sum).toBeCloseTo(1, 6);
    });

    it("Peclet number is positive", () => {
      const r = thermalModelingEngine.loewenShawTemperature(baseParams);
      expect(r.pecletNumber).toBeGreaterThan(0);
    });
  });

  describe("triggerTemperature", () => {
    it("computes temperature estimate", () => {
      const r = thermalModelingEngine.triggerTemperature({
        specificEnergy: 3.5, cuttingSpeed: 200, thermalNumber: 0.5,
      });
      expect(r.temperature_C).toBeGreaterThan(0);
      expect(r.criticalTemp_C).toBe(800);
    });

    it("safety margin decreases with higher energy", () => {
      const low = thermalModelingEngine.triggerTemperature({
        specificEnergy: 1.0, cuttingSpeed: 100, thermalNumber: 0.5,
      });
      const high = thermalModelingEngine.triggerTemperature({
        specificEnergy: 5.0, cuttingSpeed: 300, thermalNumber: 0.8,
      });
      expect(high.safetyMargin_pct).toBeLessThan(low.safetyMargin_pct);
    });
  });

  describe("fourierConduction1D", () => {
    it("steady state with equal BCs converges toward BC temp", () => {
      // dx = 1/4 = 0.25, Fo = 10 * 0.001 / 0.0625 = 0.16 (stable)
      const r = thermalModelingEngine.fourierConduction1D({
        length: 1, nodes: 5, timeSteps: 500, dt: 0.001,
        thermalDiffusivity: 10, initialTemp: 100,
        leftBC: { type: "dirichlet", value: 50 },
        rightBC: { type: "dirichlet", value: 50 },
      });
      const mid = r.finalTemperature[2];
      expect(mid).toBeLessThan(100);
      expect(mid).toBeCloseTo(50, 0);
    });

    it("respects Fourier stability criterion", () => {
      const r = thermalModelingEngine.fourierConduction1D({
        length: 10, nodes: 10, timeSteps: 10, dt: 0.001,
        thermalDiffusivity: 0.1, initialTemp: 25,
        leftBC: { type: "dirichlet", value: 100 },
        rightBC: { type: "dirichlet", value: 25 },
      });
      expect(r.stable).toBe(true);
      expect(r.fourierNumber).toBeLessThanOrEqual(0.5);
    });

    it("unstable when Fo > 0.5", () => {
      const r = thermalModelingEngine.fourierConduction1D({
        length: 10, nodes: 10, timeSteps: 10, dt: 1.0,
        thermalDiffusivity: 1.0, initialTemp: 25,
        leftBC: { type: "dirichlet", value: 100 },
        rightBC: { type: "dirichlet", value: 25 },
      });
      expect(r.stable).toBe(false);
    });

    it("history records snapshots every 10 steps", () => {
      const r = thermalModelingEngine.fourierConduction1D({
        length: 10, nodes: 10, timeSteps: 50, dt: 0.01,
        thermalDiffusivity: 0.1, initialTemp: 25,
        leftBC: { type: "dirichlet", value: 100 },
        rightBC: { type: "dirichlet", value: 25 },
      });
      // t=0 + 5 snapshots (at steps 10,20,30,40,50)
      expect(r.history.length).toBe(6);
    });

    it("heat source raises local temperature", () => {
      const noSource = thermalModelingEngine.fourierConduction1D({
        length: 10, nodes: 20, timeSteps: 100, dt: 0.01,
        thermalDiffusivity: 0.1, initialTemp: 25,
        leftBC: { type: "dirichlet", value: 25 },
        rightBC: { type: "dirichlet", value: 25 },
      });
      const withSource = thermalModelingEngine.fourierConduction1D({
        length: 10, nodes: 20, timeSteps: 100, dt: 0.01,
        thermalDiffusivity: 0.1, initialTemp: 25,
        leftBC: { type: "dirichlet", value: 25 },
        rightBC: { type: "dirichlet", value: 25 },
        heatSource: { position: 5, magnitude: 100 },
      });
      expect(withSource.maxTemp).toBeGreaterThan(noSource.maxTemp);
    });
  });

  describe("thermalExpansion", () => {
    it("steel bar expansion at 12e-6/°C", () => {
      const r = thermalModelingEngine.thermalExpansion({
        length: 500, temperatureChange: 20, expansionCoefficient: 12e-6,
      });
      // 500 * 12e-6 * 20 = 0.12 mm
      expect(r.expansion_mm).toBeCloseTo(0.12, 4);
      expect(r.expansion_um).toBeCloseTo(120, 1);
      expect(r.compensation_mm).toBeCloseTo(-0.12, 4);
    });

    it("zero temperature change gives zero expansion", () => {
      const r = thermalModelingEngine.thermalExpansion({
        length: 1000, temperatureChange: 0, expansionCoefficient: 12e-6,
      });
      expect(r.expansion_mm).toBeCloseTo(0, 10);
      expect(r.compensation_mm).toBeCloseTo(0, 10);
    });

    it("strain percent is correct", () => {
      const r = thermalModelingEngine.thermalExpansion({
        length: 100, temperatureChange: 50, expansionCoefficient: 12e-6,
      });
      // strain = 12e-6 * 50 * 100 = 0.06%
      expect(r.strainPercent).toBeCloseTo(0.06, 4);
    });
  });
});
