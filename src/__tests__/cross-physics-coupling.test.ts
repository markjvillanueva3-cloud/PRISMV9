/**
 * Tests for CrossPhysicsCouplingEngine — 8 novel cross-domain formulas
 */
import { describe, it, expect } from "vitest";
import { CrossPhysicsCouplingEngine } from "../engines/CrossPhysicsCouplingEngine.js";

const engine = new CrossPhysicsCouplingEngine();

describe("CrossPhysicsCouplingEngine", () => {
  // ── 1. Unified Process Quality Index ───────────────────────────────
  describe("unifiedProcessQualityIndex()", () => {
    it("should degrade Cpk when errors are present", () => {
      const r = engine.unifiedProcessQualityIndex({
        force_N: 500, toolLength_mm: 80, toolDiameter_mm: 12,
        elasticModulus_GPa: 600, tolerance_mm: 0.05,
        thermalExpCoeff: 12e-6, tempRise_C: 15, workpieceLength_mm: 200,
        flankWear_mm: 0.15, leadAngle_deg: 90, nominalCpk: 1.67,
        processStdDev_mm: 0.008,
      });
      expect(r.upqi).toBeLessThan(r.cpkNominal);
      expect(r.upqi).toBeGreaterThan(0);
      expect(r.deflectionError_mm).toBeGreaterThan(0);
      expect(r.thermalError_mm).toBeGreaterThan(0);
      expect(r.wearError_mm).toBeGreaterThan(0);
      expect(r.dominantErrorSource).toBeDefined();
    });

    it("should equal nominal Cpk when all errors are zero", () => {
      const r = engine.unifiedProcessQualityIndex({
        force_N: 0, toolLength_mm: 50, toolDiameter_mm: 10,
        elasticModulus_GPa: 600, tolerance_mm: 0.1,
        thermalExpCoeff: 0, tempRise_C: 0, workpieceLength_mm: 100,
        flankWear_mm: 0, leadAngle_deg: 90, nominalCpk: 1.5,
        processStdDev_mm: 0.01,
      });
      expect(r.upqi).toBeCloseTo(r.cpkNominal, 1);
    });
  });

  // ── 2. Coupled Tool Life ───────────────────────────────────────────
  describe("coupledToolLife()", () => {
    it("should reduce life below Taylor prediction", () => {
      const r = engine.coupledToolLife({
        speed_mpm: 200, taylorC: 300, taylorN: 0.25,
        bueVelocity_mpm: 50, toolTemp_C: 450, softeningTemp_C: 600,
        depthOfCut_mm: 3, criticalDepth_mm: 5,
      });
      expect(r.effectiveLife_min).toBeLessThanOrEqual(r.taylorLife_min);
      expect(r.effectiveLife_min).toBeGreaterThan(0);
      expect(r.lifeReductionPercent).toBeGreaterThanOrEqual(0);
      expect(r.dominantDegradation).toBeDefined();
    });

    it("should show BUE effect at low speed", () => {
      const r = engine.coupledToolLife({
        speed_mpm: 50, taylorC: 300, taylorN: 0.25,
        bueVelocity_mpm: 50, toolTemp_C: 200, softeningTemp_C: 600,
        depthOfCut_mm: 1, criticalDepth_mm: 5,
      });
      expect(r.bueFactor).toBeGreaterThan(0);
    });

    it("should show chatter effect when ap > ap_lim", () => {
      const r = engine.coupledToolLife({
        speed_mpm: 200, taylorC: 300, taylorN: 0.25,
        bueVelocity_mpm: 30, toolTemp_C: 300, softeningTemp_C: 600,
        depthOfCut_mm: 6, criticalDepth_mm: 4,
      });
      expect(r.chatterFactor).toBeGreaterThan(0);
      expect(r.effectiveLife_min).toBeLessThan(r.taylorLife_min);
    });
  });

  // ── 3. Multi-Source Surface Finish ─────────────────────────────────
  describe("multiSourceSurfaceFinish()", () => {
    it("should compute RSS of all Ra sources", () => {
      const r = engine.multiSourceSurfaceFinish({
        feed_mmrev: 0.2, noseRadius_mm: 0.8,
        chatterAmplitude_um: 2, bueHeight_um: 5,
        workpieceTemp_C: 80, ambientTemp_C: 20, thermalExpCoeff: 12e-6,
        radialForce_N: 100, elasticModulus_GPa: 200,
        contactLength_mm: 2,
      });
      expect(r.raTotalUM).toBeGreaterThan(r.raGeometric);
      expect(r.contributions.length).toBeGreaterThanOrEqual(2);
      expect(r.dominantSource).toBeDefined();
      // RSS: total >= max individual
      const maxSingle = Math.max(r.raGeometric, r.raVibration, r.raBUE);
      expect(r.raTotalUM).toBeGreaterThanOrEqual(maxSingle - 0.01);
    });

    it("should give pure geometric Ra when no other sources", () => {
      const r = engine.multiSourceSurfaceFinish({
        feed_mmrev: 0.15, noseRadius_mm: 0.4,
        chatterAmplitude_um: 0, bueHeight_um: 0,
        workpieceTemp_C: 20, ambientTemp_C: 20, thermalExpCoeff: 0,
        radialForce_N: 0, elasticModulus_GPa: 200, contactLength_mm: 1,
      });
      const expectedGeo = (0.15 ** 2) / (32 * 0.4) * 1000; // convert to μm
      expect(r.raGeometric).toBeCloseTo(expectedGeo, 0);
    });
  });

  // ── 4. Process Stability Margin ────────────────────────────────────
  describe("processStabilityMargin()", () => {
    it("should return PSM between 0 and 1 for stable process", () => {
      const r = engine.processStabilityMargin({
        depthOfCut_mm: 2, criticalDepth_mm: 5,
        toolTemp_C: 300, maxToolTemp_C: 600, ambientTemp_C: 20,
        flankWear_mm: 0.1, maxFlankWear_mm: 0.3,
        cuttingForce_N: 500, machineForceLimit_N: 2000,
      });
      expect(r.psm).toBeGreaterThan(0);
      expect(r.psm).toBeLessThanOrEqual(1);
      expect(r.limitingFactor).toBeDefined();
      expect(r.recommendation).toBeDefined();
    });

    it("should flag near-limit process", () => {
      const r = engine.processStabilityMargin({
        depthOfCut_mm: 4.5, criticalDepth_mm: 5,
        toolTemp_C: 550, maxToolTemp_C: 600, ambientTemp_C: 20,
        flankWear_mm: 0.25, maxFlankWear_mm: 0.3,
        cuttingForce_N: 1800, machineForceLimit_N: 2000,
      });
      expect(r.psm).toBeLessThan(0.2);
    });
  });

  // ── 5. Optimal Tool Change Point ───────────────────────────────────
  describe("optimalToolChangePoint()", () => {
    it("should find optimal wear less than max wear", () => {
      const r = engine.optimalToolChangePoint({
        machiningCostPerMin: 2.0, toolChangeCost_min: 3,
        toolCostPerEdge: 8, cycleTime_min: 5,
        wearRate_mmPerMin: 0.005, tolerance_mm: 0.05,
        nominalDimStdDev_mm: 0.008, leadAngle_deg: 90,
      });
      expect(r.optimalWear_mm).toBeGreaterThan(0);
      expect(r.optimalWear_mm).toBeLessThanOrEqual(0.3);
      expect(r.costPerGoodPart).toBeGreaterThan(0);
      expect(r.scrapProbAtChange).toBeGreaterThanOrEqual(0);
      expect(r.scrapProbAtChange).toBeLessThanOrEqual(1);
      expect(r.wearVsCostCurve.length).toBeGreaterThan(0);
    });
  });

  // ── 6. Thermal-Geometric Error Budget ──────────────────────────────
  describe("thermalGeometricErrorBudget()", () => {
    it("should compute RSS of thermal error sources", () => {
      const r = engine.thermalGeometricErrorBudget({
        sources: [
          { name: "spindle", alpha: 12e-6, deltaT_C: 8, length_mm: 150 },
          { name: "column", alpha: 11e-6, deltaT_C: 3, length_mm: 800 },
          { name: "workpiece", alpha: 12e-6, deltaT_C: 15, length_mm: 200 },
        ],
        tolerance_mm: 0.05,
      });
      expect(r.totalError_mm).toBeGreaterThan(0);
      expect(r.errorBudget).toHaveLength(3);
      expect(r.dominantSource).toBeDefined();
      expect(typeof r.withinTolerance).toBe("boolean");
    });
  });

  // ── 7. Cutting Energy Efficiency ───────────────────────────────────
  describe("cuttingEnergyEfficiency()", () => {
    it("should compute efficiency between 0 and 1", () => {
      const r = engine.cuttingEnergyEfficiency({
        spindlePower_W: 5000, mrr_mm3permin: 20000,
        shearStress_MPa: 400, shearStrain: 2.5,
        frictionCoeff: 0.4, normalForce_N: 300, chipVelocity_mpm: 150,
        ploughingForce_N: 50, cuttingSpeed_mpm: 200,
      });
      expect(r.efficiency).toBeGreaterThan(0);
      expect(r.efficiency).toBeLessThanOrEqual(1);
      expect(r.specificEnergy_Jmm3).toBeGreaterThan(0);
      expect(r.energyBreakdown.length).toBe(3);
    });
  });

  // ── 8. Dynamic Process Stiffness ───────────────────────────────────
  describe("dynamicProcessStiffness()", () => {
    it("should compute series stiffness less than any component", () => {
      const r = engine.dynamicProcessStiffness({
        machineStiffness_Npmm: 50000,
        toolDiameter_mm: 12, toolLength_mm: 80,
        toolElasticModulus_GPa: 600,
        workpieceStiffness_Npmm: 30000,
        fixtureStiffness_Npmm: 80000,
      });
      expect(r.staticStiffness_Npmm).toBeLessThan(30000); // less than weakest
      expect(r.staticStiffness_Npmm).toBeGreaterThan(0);
      expect(r.weakestLink).toBeDefined();
      expect(r.components.length).toBeGreaterThanOrEqual(3);
    });

    it("should compute dynamic stiffness with frequency", () => {
      const r = engine.dynamicProcessStiffness({
        machineStiffness_Npmm: 50000,
        toolDiameter_mm: 16, toolLength_mm: 60,
        toolElasticModulus_GPa: 600,
        dampingRatio: 0.03, excitationFreq_Hz: 500, naturalFreq_Hz: 800,
      });
      expect(r.dynamicStiffness_Npmm).toBeDefined();
      expect(r.dynamicStiffness_Npmm!).toBeGreaterThan(0);
    });
  });

  // ── Stats ──────────────────────────────────────────────────────────
  describe("stats()", () => {
    it("should report 8 formulas", () => {
      const s = engine.stats();
      expect(s.formulas).toHaveLength(8);
    });
  });
});
