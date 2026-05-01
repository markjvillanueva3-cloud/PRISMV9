/**
 * Tests for DimensionlessNumbersEngine — 8 novel dimensionless numbers
 */
import { describe, it, expect } from "vitest";
import { DimensionlessNumbersEngine } from "../engines/DimensionlessNumbersEngine.js";

const engine = new DimensionlessNumbersEngine();

describe("DimensionlessNumbersEngine", () => {
  describe("cuttingNumber()", () => {
    it("should return Π≈1 when force matches Kienzle", () => {
      // kc = kc1.1 * h^(-mc) = 1800 * 0.1^(-0.25) ≈ 3201. F = kc*b*h = 3201*3*0.1 = 960
      const r = engine.cuttingNumber({
        measuredForce_N: 960, kc11_MPa: 1800, mc: 0.25,
        chipThickness_mm: 0.1, chipWidth_mm: 3,
        depthOfCut_mm: 3, stepover_mm: 1,
      });
      expect(r.pi).toBeCloseTo(1, 0);
      expect(r.interpretation).toBeDefined();
    });

    it("should flag high Π when extra forces present", () => {
      const r = engine.cuttingNumber({
        measuredForce_N: 1500, kc11_MPa: 1800, mc: 0.25,
        chipThickness_mm: 0.1, chipWidth_mm: 3,
        depthOfCut_mm: 3, stepover_mm: 1,
      });
      expect(r.pi).toBeGreaterThan(1);
      expect(r.likelyCause).toBeDefined();
    });
  });

  describe("thermalPeclet()", () => {
    it("should classify high-speed as chip-dominated", () => {
      const r = engine.thermalPeclet({
        cuttingSpeed_mpm: 300, contactLength_mm: 1.5,
        thermalDiffusivity_m2ps: 1.4e-5,
      });
      expect(r.pe).toBeGreaterThan(5);
      expect(r.heatPartition.chip).toBeGreaterThan(0.5);
    });

    it("should classify low-speed as workpiece-dominated", () => {
      const r = engine.thermalPeclet({
        cuttingSpeed_mpm: 10, contactLength_mm: 0.5,
        thermalDiffusivity_m2ps: 1.4e-5,
      });
      expect(r.pe).toBeLessThan(5);
    });
  });

  describe("chipFormationNumber()", () => {
    it("should predict chip type", () => {
      const r = engine.chipFormationNumber({
        shearStress_MPa: 400, chipThickness_mm: 0.15, kc_MPa: 2000,
        cuttingSpeed_mpm: 200, density_kgm3: 7800,
        specificHeat_JkgK: 500, shearZoneTemp_C: 400,
      });
      expect(r.pi).toBeGreaterThan(0);
      expect(["continuous", "transitional", "segmented", "discontinuous"]).toContain(r.chipType);
    });
  });

  describe("stabilityNumber()", () => {
    it("should flag stable process when Π>1", () => {
      const r = engine.stabilityNumber({
        systemStiffness_Npmm: 50000, criticalDepth_mm: 5, maxForce_N: 1000,
      });
      expect(r.pi).toBeGreaterThan(1);
      expect(r.stable).toBe(true);
      expect(r.margin_dB).toBeGreaterThan(0);
    });

    it("should flag unstable when force exceeds stiffness capacity", () => {
      const r = engine.stabilityNumber({
        systemStiffness_Npmm: 5000, criticalDepth_mm: 1, maxForce_N: 10000,
      });
      expect(r.pi).toBeLessThan(1);
      expect(r.stable).toBe(false);
    });
  });

  describe("wearIntensity()", () => {
    it("should compute dimensionless wear", () => {
      const r = engine.wearIntensity({
        flankWear_mm: 0.15, cuttingSpeed_mpm: 200,
        cuttingTime_min: 20, kc_MPa: 1800, chipThickness_mm: 0.1,
      });
      expect(r.pi).toBeGreaterThan(0);
      expect(["running-in", "steady", "accelerated"]).toContain(r.wearRegime);
    });
  });

  describe("processCapabilityNumber()", () => {
    it("should combine capability with physics errors", () => {
      const r = engine.processCapabilityNumber({
        cpk: 1.67, processStdDev_mm: 0.008, tolerance_mm: 0.05,
        force_N: 500, stiffness_Npmm: 30000,
        thermalExpCoeff: 12e-6, tempRise_C: 10, length_mm: 200,
      });
      expect(r.pi).toBeGreaterThan(0);
      expect(r.dominantVarianceSource).toBeDefined();
    });
  });

  describe("machinabilityIndex()", () => {
    it("should return MI≈1 for reference material", () => {
      const r = engine.machinabilityIndex({
        v30Speed_mpm: 100, surfaceFinish_um: 3.2, cuttingForce_N: 1000,
      });
      expect(r.mi).toBeCloseTo(1, 0);
      expect(r.rating).toBeDefined();
    });

    it("should rate difficult material lower", () => {
      const r = engine.machinabilityIndex({
        v30Speed_mpm: 30, surfaceFinish_um: 6.0, cuttingForce_N: 2500,
      });
      expect(r.mi).toBeLessThan(0.5);
    });
  });

  describe("thermalDamageNumber()", () => {
    it("should flag high TDN as damage risk", () => {
      const r = engine.thermalDamageNumber({
        heatFlux_Wm2: 5e7, contactLength_mm: 2,
        thermalConductivity_WmK: 50, criticalTemp_C: 723, ambientTemp_C: 20,
      });
      expect(r.tdn).toBeGreaterThan(0);
      expect(["safe", "caution", "likely", "certain"]).toContain(r.damageRisk);
    });
  });

  describe("allNumbers()", () => {
    it("should compute multiple numbers from comprehensive input", () => {
      const r = engine.allNumbers({
        measuredForce_N: 960, kc11_MPa: 1800, mc: 0.25,
        chipThickness_mm: 0.1, chipWidth_mm: 3,
        depthOfCut_mm: 3, stepover_mm: 1,
        cuttingSpeed_mpm: 200, contactLength_mm: 1.5,
        thermalDiffusivity_m2ps: 1.4e-5,
        systemStiffness_Npmm: 50000, criticalDepth_mm: 5,
      });
      expect(r.cuttingNumber).toBeDefined();
      expect(r.thermalPeclet).toBeDefined();
      expect(r.computed).toBeDefined();
    });
  });

  describe("stats()", () => {
    it("should report 8 numbers + 2 utilities", () => {
      const s = engine.stats();
      expect(s.numbers.length).toBeGreaterThanOrEqual(8);
    });
  });
});
