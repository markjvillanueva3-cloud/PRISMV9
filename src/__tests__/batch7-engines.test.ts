/**
 * Batch 7 Engine — Unit Tests
 * CuttingMechanicsEngine (consolidated from 3 archive physics engines)
 * @milestone AUDIT-FT-B7
 */
import { describe, it, expect } from "vitest";
import { cuttingMechanicsEngine } from "../engines/CuttingMechanicsEngine.js";

describe("CuttingMechanicsEngine", () => {
  describe("merchantAnalysis", () => {
    it("computes Merchant's orthogonal cutting forces", () => {
      const r = cuttingMechanicsEngine.merchantAnalysis({
        chipThickness: 0.1,
        width: 2,
        rakeAngle: 10 * Math.PI / 180,
        shearStrength: 400,
        frictionCoeff: 0.5,
      });
      expect(r.shearAngle_deg).toBeGreaterThan(0);
      expect(r.shearAngle_deg).toBeLessThan(90);
      expect(r.forces.cutting_N).toBeGreaterThan(0);
      expect(r.forces.thrust_N).toBeGreaterThan(0);
      expect(r.forces.resultant_N).toBeGreaterThan(r.forces.cutting_N);
      expect(r.specificCuttingEnergy_MPa).toBeGreaterThan(0);
    });

    it("cutting force increases with chip thickness", () => {
      const thin = cuttingMechanicsEngine.merchantAnalysis({
        chipThickness: 0.05, width: 2,
        rakeAngle: 0.17, shearStrength: 400,
      });
      const thick = cuttingMechanicsEngine.merchantAnalysis({
        chipThickness: 0.2, width: 2,
        rakeAngle: 0.17, shearStrength: 400,
      });
      expect(thick.forces.cutting_N).toBeGreaterThan(thin.forces.cutting_N);
    });

    it("computes Lee-Shaffer angle", () => {
      const r = cuttingMechanicsEngine.merchantAnalysis({
        chipThickness: 0.1, width: 2,
        rakeAngle: 0, shearStrength: 400, frictionCoeff: 0.3,
      });
      expect(r.leeShaffer_phi_deg).toBeGreaterThan(0);
    });

    it("chip compression ratio is inverse of chip ratio", () => {
      const r = cuttingMechanicsEngine.merchantAnalysis({
        chipThickness: 0.1, width: 2,
        rakeAngle: 0.1, shearStrength: 300,
      });
      expect(r.chipCompressionRatio).toBeCloseTo(1 / r.chipRatio, 3);
    });
  });

  describe("millingForces", () => {
    it("computes milling force profile", () => {
      const r = cuttingMechanicsEngine.millingForces(
        { diameter: 20, teeth: 4 },
        {
          rpm: 5000, feed: 0.1, axialDepth: 3,
          radialDepth: 10, Ktc: 2000,
        },
      );
      expect(r.maxForces.Fx).toBeGreaterThan(0);
      expect(r.maxForces.Fy).toBeGreaterThan(0);
      expect(r.power_kW).toBeGreaterThan(0);
      expect(r.torque_Nm).toBeGreaterThan(0);
      expect(r.profileLength).toBe(360);
    });

    it("forces increase with depth of cut", () => {
      const shallow = cuttingMechanicsEngine.millingForces(
        { diameter: 20, teeth: 4 },
        { rpm: 5000, feed: 0.1, axialDepth: 1, radialDepth: 10, Ktc: 2000 },
      );
      const deep = cuttingMechanicsEngine.millingForces(
        { diameter: 20, teeth: 4 },
        { rpm: 5000, feed: 0.1, axialDepth: 5, radialDepth: 10, Ktc: 2000 },
      );
      expect(deep.maxForces.Fx).toBeGreaterThan(shallow.maxForces.Fx);
    });

    it("engagement angles are valid", () => {
      const r = cuttingMechanicsEngine.millingForces(
        { diameter: 20, teeth: 4 },
        { rpm: 5000, feed: 0.1, axialDepth: 3, radialDepth: 10, Ktc: 2000 },
      );
      expect(r.engagementAngles.entry_deg).toBeGreaterThan(0);
      expect(r.engagementAngles.exit_deg).toBe(180);
    });
  });

  describe("cuttingTemperature", () => {
    it("computes temperature distribution", () => {
      const r = cuttingMechanicsEngine.cuttingTemperature({
        speed_mpm: 200, feed_mm: 0.2,
      });
      expect(r.chipTemperature_C).toBeGreaterThan(25);
      expect(r.toolTemperature_C).toBeGreaterThan(25);
      expect(r.toolTemperature_C).toBeLessThan(r.chipTemperature_C);
      expect(r.workpieceTemperature_C).toBeLessThan(r.toolTemperature_C);
      expect(r.heatPartition.chip_percent).toBe(70);
    });

    it("higher speed increases temperature", () => {
      const slow = cuttingMechanicsEngine.cuttingTemperature({
        speed_mpm: 50,
      });
      const fast = cuttingMechanicsEngine.cuttingTemperature({
        speed_mpm: 300,
      });
      expect(fast.chipTemperature_C).toBeGreaterThan(slow.chipTemperature_C);
    });

    it("uses defaults when no params", () => {
      const r = cuttingMechanicsEngine.cuttingTemperature();
      expect(r.temperatureRise_C).toBeGreaterThan(0);
    });
  });

  describe("craterWear", () => {
    it("computes Usui crater wear", () => {
      const r = cuttingMechanicsEngine.craterWear({
        cuttingSpeed: 200, interfaceTemp: 600,
        contactPressure: 500, cuttingTime: 30,
      });
      expect(r.craterDepth_mm).toBeGreaterThan(0);
      expect(r.wearRate_mm_per_min).toBeGreaterThan(0);
      expect(r.wearMechanism).toBe("abrasion");
      expect(r.criticalDepth_mm).toBe(0.1);
    });

    it("diffusion at high temperature", () => {
      const r = cuttingMechanicsEngine.craterWear({
        cuttingSpeed: 200, interfaceTemp: 900,
        contactPressure: 500, cuttingTime: 10,
      });
      expect(r.wearMechanism).toBe("diffusion");
    });

    it("wear increases with time", () => {
      const short = cuttingMechanicsEngine.craterWear({
        cuttingSpeed: 200, interfaceTemp: 600,
        contactPressure: 500, cuttingTime: 5,
      });
      const long = cuttingMechanicsEngine.craterWear({
        cuttingSpeed: 200, interfaceTemp: 600,
        contactPressure: 500, cuttingTime: 60,
      });
      expect(long.craterDepth_mm).toBeGreaterThan(short.craterDepth_mm);
    });
  });

  describe("getMaterialCuttingData", () => {
    it("returns data for known material", () => {
      const d = cuttingMechanicsEngine.getMaterialCuttingData("steel_4140");
      expect(d.Kc1_1).toBe(2500);
      expect(d.mc).toBe(0.27);
      expect(d.tau_s).toBe(520);
    });

    it("normalizes material name", () => {
      const d = cuttingMechanicsEngine.getMaterialCuttingData("Steel 4140");
      expect(d.Kc1_1).toBe(2500);
    });

    it("returns defaults for unknown material", () => {
      const d = cuttingMechanicsEngine.getMaterialCuttingData("unobtanium");
      expect(d.Kc1_1).toBe(2000);
    });

    it("listMaterials returns all", () => {
      const list = cuttingMechanicsEngine.listMaterials();
      expect(list.length).toBe(13);
      expect(list).toContain("titanium_ti6al4v");
    });
  });
});
